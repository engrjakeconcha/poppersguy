"use strict";

const ops = require("../retell/poppersguy-ops.js");

const {
  ORDER_HEADERS,
  TICKET_HEADERS,
  PROMO_HEADERS,
  PRODUCT_HEADERS,
  ADMIN_USER_HEADERS,
  SURVEY_HEADERS,
  appendRecordRow,
  getRecordRows,
  updateRecordRow,
  mapSheetRows,
  telegramSendMessage,
  parseMoney,
  nowIso,
  getCheckoutLalamoveQuote,
  placeCheckoutLalamoveOrder,
  getLalamoveTrackingLink,
  parsePhotoFileIds,
  telegramSendPhoto,
  settleCompletedOrderRewards,
  LOYALTY_POINTS_PER_ORDER,
  REFERRAL_SUCCESS_POINTS,
  LOYALTY_REDEEM_POINTS,
  LOYALTY_REDEEM_VALUE,
} = ops.helpers;

const DEFAULT_ADMIN_USERS = [
  {
    username: "Jay",
    passcode: "529266",
    telegram_id: "",
    telegram_username: "",
    active: "true",
    created_by: "system",
  },
  {
    username: "Josh",
    passcode: "143444",
    telegram_id: "",
    telegram_username: "",
    active: "true",
    created_by: "system",
  },
];
const MINIAPP_USER_HEADERS = [
  "user_id",
  "username",
  "full_name",
  "last_delivery_name",
  "last_delivery_address",
  "last_delivery_contact",
  "last_delivery_area",
  "updated_at",
];

const TRACKING_BASE_URL = "https://poppers.jcit.digital/poppers/track";
const ADMIN_PORTAL_URL = "https://poppers.jcit.digital/admin";
const FINAL_STATUSES = new Set(["Delivered", "Cancelled", "Completed"]);
const DEFAULT_LIMIT = 40;
const KNOWN_STATUSES = new Set([
  "Pending",
  "Pending Confirmation",
  "Awaiting Payment Verification",
  "Confirmed",
  "Preparing",
  "Out for Delivery",
  "Delivered",
  "Cancelled",
  "Completed",
]);
const KNOWN_DELIVERY_METHODS = new Set(["Standard", "Lalamove"]);

function sendJson(res, status, body) {
  res.status(status).setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(body));
}

async function notifyAdminChat(text) {
  const textWithLink = [String(text || "").trim(), "", `Admin Portal: ${ADMIN_PORTAL_URL}`]
    .filter(Boolean)
    .join("\n");
  const adminGroup = String(process.env.TELEGRAM_ADMIN_GROUP_ID || "").trim();
  const adminIds = String(process.env.TELEGRAM_ADMIN_IDS || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  if (adminGroup) {
    await telegramSendMessage(adminGroup, textWithLink, { parse_mode: null });
    return;
  }
  if (!adminIds.length) {
    throw new Error("No Telegram admin target is configured");
  }
  for (const adminId of adminIds) {
    await telegramSendMessage(adminId, textWithLink, { parse_mode: null });
  }
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (chunk) => {
      raw += chunk;
    });
    req.on("end", () => {
      if (!raw.trim()) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(raw));
      } catch (error) {
        reject(error);
      }
    });
    req.on("error", reject);
  });
}

function normalizeAdminUsername(value) {
  return String(value || "").trim();
}

function normalizeAdminTelegramUsername(value) {
  return String(value || "").trim().replace(/^@/, "");
}

function normalizeActiveFlag(value) {
  return ["true", "1", "yes", "active"].includes(String(value || "").trim().toLowerCase());
}

function buildAdminUserRow(user, actor = "system") {
  return [
    normalizeAdminUsername(user.username),
    String(user.passcode || "").trim(),
    String(user.telegram_id || "").trim(),
    normalizeAdminTelegramUsername(user.telegram_username),
    normalizeActiveFlag(user.active) ? "true" : "false",
    nowIso(),
    String(user.created_by || actor || "system").trim(),
  ];
}

async function upsertMiniAppUser(telegramId, telegramUsername, fullName = "") {
  const normalizedTelegramId = String(telegramId || "").trim();
  if (!/^-?\d+$/.test(normalizedTelegramId)) {
    return false;
  }
  const rows = await getRecordRows("Users").catch(() => [MINIAPP_USER_HEADERS]);
  const records = mapSheetRows(rows);
  const existingIndex = records.findIndex(
    (record) => String(record.user_id || "").trim() === normalizedTelegramId
  );
  const existing = existingIndex >= 0 ? records[existingIndex] : {};
  const rowValues = [
    normalizedTelegramId,
    normalizeAdminTelegramUsername(telegramUsername || existing.username || ""),
    String(fullName || existing.full_name || telegramUsername || normalizedTelegramId).trim(),
    String(existing.last_delivery_name || "").trim(),
    String(existing.last_delivery_address || "").trim(),
    String(existing.last_delivery_contact || "").trim(),
    String(existing.last_delivery_area || "").trim(),
    nowIso(),
  ];
  if (existingIndex >= 0) {
    await updateRecordRow("Users", existingIndex + 2, rowValues);
  } else {
    await appendRecordRow("Users", rowValues);
  }
  return true;
}

async function telegramCall(method, payload) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    throw new Error("TELEGRAM_BOT_TOKEN is not configured");
  }
  const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload || {}),
  });
  const result = await response.json();
  if (!response.ok || !result.ok) {
    throw new Error(result.description || `Telegram ${method} failed.`);
  }
  return result.result;
}

async function inviteAdminToGroup(telegramId, username) {
  const targetGroupId = String(process.env.TELEGRAM_ADMIN_GROUP_ID || "").trim();
  const normalizedTelegramId = String(telegramId || "").trim();
  if (!targetGroupId || !/^-?\d+$/.test(normalizedTelegramId)) {
    return { invited: false, reason: "missing_target" };
  }
  const invite = await telegramCall("createChatInviteLink", {
    chat_id: targetGroupId,
    member_limit: 1,
    creates_join_request: false,
  });
  const joinUrl = invite.invite_link;
  await telegramSendMessage(
    normalizedTelegramId,
    [
      "You have been added as an admin user for the Mini App.",
      username ? `Username: ${username}` : "",
      "",
      "Join the admin group here:",
      joinUrl,
    ]
      .filter(Boolean)
      .join("\n")
  );
  return { invited: true, invite_link: joinUrl };
}

async function readAdminUsersWithRows() {
  const rows = await getRecordRows("AdminUsers").catch(() => [ADMIN_USER_HEADERS]);
  const records = mapSheetRows(rows);
  const byUsername = new Map();
  records.forEach((record, index) => {
    const username = normalizeAdminUsername(record.username);
    if (!username) {
      return;
    }
    byUsername.set(username, {
      rowNumber: index + 2,
      record,
      view: {
        username,
        telegram_id: String(record.telegram_id || "").trim(),
        telegram_username: normalizeAdminTelegramUsername(record.telegram_username),
        active: normalizeActiveFlag(record.active),
        updated_at: String(record.updated_at || "").trim(),
        created_by: String(record.created_by || "").trim(),
      },
    });
  });

  for (const seed of DEFAULT_ADMIN_USERS) {
    const username = normalizeAdminUsername(seed.username);
    if (byUsername.has(username)) {
      continue;
    }
    byUsername.set(username, {
      rowNumber: null,
      record: { ...seed },
      view: {
        username,
        telegram_id: String(seed.telegram_id || "").trim(),
        telegram_username: normalizeAdminTelegramUsername(seed.telegram_username),
        active: normalizeActiveFlag(seed.active),
        updated_at: "",
        created_by: String(seed.created_by || "system").trim(),
      },
    });
  }

  return Array.from(byUsername.values()).sort((left, right) => left.view.username.localeCompare(right.view.username));
}

async function authenticateAdmin(username, code) {
  const normalizedUsername = normalizeAdminUsername(username);
  const normalizedCode = String(code || "").trim();
  if (!normalizedUsername || !normalizedCode) {
    return null;
  }
  const users = await readAdminUsersWithRows();
  const match = users.find((entry) => entry.view.username === normalizedUsername && normalizeActiveFlag(entry.record.active));
  if (!match || String(match.record.passcode || "").trim() !== normalizedCode) {
    return null;
  }
  return {
    username: match.view.username,
    telegram_id: match.view.telegram_id,
    telegram_username: match.view.telegram_username,
  };
}

async function requireAdminAuth(req) {
  const username = String(req.headers["x-admin-user"] || "").trim();
  const code = String(req.headers["x-admin-code"] || "").trim();
  return authenticateAdmin(username, code);
}

function normalizeStatus(value) {
  return String(value || "").trim();
}

function normalizeUsername(value) {
  return String(value || "").trim().replace(/^@/, "");
}

function normalizePhone(value) {
  return String(value || "").replace(/[^\d+]/g, "");
}

function isTelegramChatId(value) {
  return /^-?\d+$/.test(String(value || "").trim());
}

function buildRewardsSummaryLines(summary) {
  if (!summary) {
    return [];
  }
  return [
    "Rewards Summary",
    `Completed order points: ${Number(summary.completed_order_points_awarded || 0)}`,
    `Referral points: ${Number(summary.referral_points_awarded || 0)}`,
    `Points redeemed on this order: ${Number(summary.points_used_on_order || 0)}`,
    `Discount redeemed on this order: PHP ${parseMoney(summary.discount_used_on_order || 0)}`,
    `Balance after order: ${Number(summary.balance_after || 0)} points`,
    `Rewards rule: PHP ${LOYALTY_REDEEM_VALUE} off for every ${LOYALTY_REDEEM_POINTS} points`,
  ];
}

function parseDateSafe(value) {
  const timestamp = Date.parse(String(value || "").trim());
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function parseItems(itemsJson) {
  try {
    const parsed = JSON.parse(String(itemsJson || "[]"));
    return Array.isArray(parsed) ? parsed : [];
  } catch (_) {
    return [];
  }
}

function looksLikeUrl(value) {
  return /^https?:\/\//i.test(String(value || "").trim());
}

function isLikelyTelegramFileId(value) {
  return /^(AgAC|CQAC|DQAC|BQAC|AAMCA)/.test(String(value || "").trim());
}

function normalizeReferralCode(value) {
  const normalized = String(value || "").trim();
  if (!normalized || looksLikeUrl(normalized) || KNOWN_STATUSES.has(normalized) || isLikelyTelegramFileId(normalized)) {
    return "";
  }
  return normalized;
}

function normalizeOrderId(value) {
  return String(value || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
}

function orderRecordToView(record) {
  const rawDeliveryMethod = String(record.delivery_method || "").trim();
  let normalizedRecord = { ...record };
  if (rawDeliveryMethod && !KNOWN_DELIVERY_METHODS.has(rawDeliveryMethod)) {
    normalizedRecord = {
      ...record,
      delivery_method: "Standard",
      referral_code: normalizeReferralCode(rawDeliveryMethod),
      payment_proof_file_id: String(record.referral_code || "").trim(),
      status: String(record.payment_proof_file_id || "").trim(),
      tracking_number: String(record.status || "").trim(),
    };
  }

  const items = parseItems(normalizedRecord.items_json);
  const rawStatus = normalizeStatus(normalizedRecord.status);
  const rawTracking = String(normalizedRecord.tracking_number || "").trim();
  const rawProof = String(normalizedRecord.payment_proof_file_id || "").trim();
  let status = rawStatus;
  let trackingNumber = rawTracking;

  if (!KNOWN_STATUSES.has(status) && KNOWN_STATUSES.has(rawProof)) {
    status = rawProof;
    if (!trackingNumber && rawStatus) {
      trackingNumber = rawStatus;
    }
  }
  if (!KNOWN_STATUSES.has(status)) {
    status = rawStatus || rawProof || "Pending";
  }
  if (looksLikeUrl(status)) {
    if (!trackingNumber) {
      trackingNumber = status;
    }
    status = KNOWN_STATUSES.has(rawProof) ? rawProof : "Pending";
  }

  const trackingLink = normalizedRecord.order_id ? `${TRACKING_BASE_URL}?order_id=${encodeURIComponent(normalizedRecord.order_id)}` : "";
  const username = normalizeUsername(normalizedRecord.username);
  const orderPhotoFileIds = parsePhotoFileIds(normalizedRecord.order_photo_file_ids);
  const telegram_contact_available = isTelegramChatId(normalizedRecord.user_id);
  return {
    order_id: String(normalizedRecord.order_id || "").trim(),
    created_at: String(normalizedRecord.created_at || "").trim(),
    user_id: String(normalizedRecord.user_id || "").trim(),
    username,
    full_name: String(normalizedRecord.full_name || "").trim(),
    items,
    items_count: items.reduce((sum, item) => sum + Number(item.qty || 0), 0),
    subtotal: parseMoney(normalizedRecord.subtotal),
    discount: parseMoney(normalizedRecord.discount),
    shipping: parseMoney(normalizedRecord.shipping),
    total: parseMoney(normalizedRecord.total),
    delivery_name: String(normalizedRecord.delivery_name || "").trim(),
    delivery_address: String(normalizedRecord.delivery_address || "").trim(),
    delivery_contact: String(normalizedRecord.delivery_contact || "").trim(),
    delivery_area: String(normalizedRecord.delivery_area || "").trim(),
    payment_method: String(normalizedRecord.payment_method || "").trim(),
    delivery_method: String(normalizedRecord.delivery_method || "").trim() || "Standard",
    referral_code: String(normalizedRecord.referral_code || "").trim(),
    payment_proof_file_id: rawProof,
    status,
    tracking_number: trackingNumber,
    tracking_link: trackingLink,
    order_photo_file_ids: orderPhotoFileIds,
    telegram_contact_available,
  };
}

async function readOrdersWithRows() {
  const rows = await getRecordRows("Orders").catch(() => [ORDER_HEADERS]);
  const records = mapSheetRows(rows);
  return records
    .map((record, index) => ({
      rowNumber: index + 2,
      record,
      view: orderRecordToView(record),
    }))
    .sort((left, right) => parseDateSafe(right.view.created_at) - parseDateSafe(left.view.created_at));
}

function findOrderEntry(entries, orderId) {
  const exactOrderId = String(orderId || "").trim().toUpperCase();
  const normalizedOrderId = normalizeOrderId(orderId);
  if (!exactOrderId && !normalizedOrderId) {
    return null;
  }
  return (
    entries.find((item) => String(item.view.order_id || "").trim().toUpperCase() === exactOrderId) ||
    entries.find((item) => normalizeOrderId(item.view.order_id) === normalizedOrderId) ||
    null
  );
}

function buildOrderRowFromView(order) {
  return [
    order.order_id,
    order.created_at,
    order.user_id,
    order.username,
    order.full_name,
    JSON.stringify(order.items || []),
    parseMoney(order.subtotal),
    parseMoney(order.discount),
    parseMoney(order.shipping),
    parseMoney(order.total),
    order.delivery_name,
    order.delivery_address,
    order.delivery_contact,
    order.delivery_area,
    order.payment_method,
    order.delivery_method || "Standard",
    order.referral_code || "",
    order.payment_proof_file_id || "",
    order.status,
    order.tracking_number || "",
    JSON.stringify(order.order_photo_file_ids || []),
  ];
}

function matchOrder(entry, search) {
  if (!search) {
    return true;
  }
  const haystack = [
    entry.view.order_id,
    entry.view.username,
    entry.view.full_name,
    entry.view.delivery_name,
    entry.view.delivery_contact,
    entry.view.status,
    entry.view.tracking_number,
  ]
    .join(" ")
    .toLowerCase();
  return haystack.includes(search.toLowerCase());
}

function summarizeOrders(entries) {
  const now = Date.now();
  const dayStart = new Date();
  dayStart.setHours(0, 0, 0, 0);
  const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
  const monthAgo = now - 30 * 24 * 60 * 60 * 1000;

  const totals = {
    total_orders: entries.length,
    pending_orders: 0,
    awaiting_payment: 0,
    total_sales: 0,
    today_sales: 0,
    week_sales: 0,
    month_sales: 0,
  };

  for (const entry of entries) {
    const createdAt = parseDateSafe(entry.view.created_at);
    const total = parseMoney(entry.view.total);
    totals.total_sales += total;
    if (!FINAL_STATUSES.has(entry.view.status)) {
      totals.pending_orders += 1;
    }
    if (entry.view.status === "Awaiting Payment Verification") {
      totals.awaiting_payment += 1;
    }
    if (createdAt >= dayStart.getTime()) {
      totals.today_sales += total;
    }
    if (createdAt >= weekAgo) {
      totals.week_sales += total;
    }
    if (createdAt >= monthAgo) {
      totals.month_sales += total;
    }
  }

  Object.keys(totals).forEach((key) => {
    if (key.endsWith("_sales")) {
      totals[key] = parseMoney(totals[key]);
    }
  });

  return totals;
}

async function handleGetDashboard(body) {
  const filter = String(body.filter || "pending").trim().toLowerCase();
  const limit = Math.max(1, Math.min(Number(body.limit || DEFAULT_LIMIT) || DEFAULT_LIMIT, 200));
  const search = String(body.search || "").trim();
  const entries = await readOrdersWithRows();
  const filtered = entries.filter((entry) => {
    if (!matchOrder(entry, search)) {
      return false;
    }
    if (filter === "all") {
      return true;
    }
    if (filter === "pending") {
      return !FINAL_STATUSES.has(entry.view.status);
    }
    if (filter === "awaiting-payment") {
      return entry.view.status === "Awaiting Payment Verification";
    }
    return true;
  });

  return {
    ok: true,
    action: "get_dashboard",
    summary: summarizeOrders(entries),
    orders: filtered.slice(0, limit).map((entry) => entry.view),
  };
}

async function handleSalesReport(body) {
  const period = String(body.period || "7d").trim().toLowerCase();
  const entries = await readOrdersWithRows();
  const now = Date.now();
  const windows = {
    "1d": 24 * 60 * 60 * 1000,
    "7d": 7 * 24 * 60 * 60 * 1000,
    "30d": 30 * 24 * 60 * 60 * 1000,
    all: Number.POSITIVE_INFINITY,
  };
  const windowMs = windows[period] || windows["7d"];
  const filtered = entries.filter((entry) => {
    if (!Number.isFinite(windowMs)) {
      return true;
    }
    return parseDateSafe(entry.view.created_at) >= now - windowMs;
  });

  const byStatus = {};
  let orderCount = 0;
  let grossSales = 0;
  let discountTotal = 0;
  let shippingTotal = 0;
  for (const entry of filtered) {
    orderCount += 1;
    grossSales += parseMoney(entry.view.total);
    discountTotal += parseMoney(entry.view.discount);
    shippingTotal += parseMoney(entry.view.shipping);
    byStatus[entry.view.status] = (byStatus[entry.view.status] || 0) + 1;
  }

  return {
    ok: true,
    action: "sales_report",
    period,
    report: {
      order_count: orderCount,
      gross_sales: parseMoney(grossSales),
      discount_total: parseMoney(discountTotal),
      shipping_total: parseMoney(shippingTotal),
      average_order_value: orderCount ? parseMoney(grossSales / orderCount) : 0,
      by_status: byStatus,
    },
  };
}

async function handleUpdateOrder(body, admin) {
  const orderId = String(body.order_id || "").trim();
  if (!orderId) {
    return { ok: false, action: "update_order", error_code: "MISSING_ORDER_ID", message: "Order ID is required." };
  }
  const entries = await readOrdersWithRows();
  const entry = findOrderEntry(entries, orderId);
  if (!entry) {
    return { ok: false, action: "update_order", error_code: "ORDER_NOT_FOUND", message: "Order not found." };
  }

  const updated = { ...entry.view };
  if (body.status !== undefined) {
    updated.status = normalizeStatus(body.status) || updated.status;
  }
  if (body.tracking_number !== undefined) {
    updated.tracking_number = String(body.tracking_number || "").trim();
  }

  await updateRecordRow("Orders", entry.rowNumber, buildOrderRowFromView(updated));
  const rewardsSummary =
    FINAL_STATUSES.has(updated.status) && !FINAL_STATUSES.has(entry.view.status)
      ? await settleCompletedOrderRewards(updated).catch(() => null)
      : null;

  const targetId = String(updated.user_id || "").trim();
  const shouldNotify = body.notify_customer !== false && isTelegramChatId(targetId);
  let customerNotifyError = "";
  if (shouldNotify) {
    const lines = [
      `Order ${updated.order_id} update`,
      `Status: ${updated.status}`,
    ];
    if (updated.tracking_number) {
      lines.push(`Tracking number: ${updated.tracking_number}`);
    }
    if (rewardsSummary) {
      lines.push("", ...buildRewardsSummaryLines(rewardsSummary));
    }
    lines.push(`Track here: ${updated.tracking_link}`);
    try {
      await telegramSendMessage(targetId, lines.join("\n"), { parse_mode: null });
    } catch (error) {
      customerNotifyError = error instanceof Error ? error.message : "Failed to notify customer.";
    }
  }
  await notifyAdminChat(
    [
      "Admin action: update_order",
      `Admin: ${admin.username}`,
      `Order: ${updated.order_id}`,
      `Status: ${updated.status}`,
      updated.tracking_number ? `Tracking: ${updated.tracking_number}` : "",
      rewardsSummary ? `Rewards balance: ${rewardsSummary.balance_after} points` : "",
      rewardsSummary ? `Completed points awarded: ${rewardsSummary.completed_order_points_awarded}` : "",
      rewardsSummary ? `Referral points awarded: ${rewardsSummary.referral_points_awarded}` : "",
      shouldNotify && !customerNotifyError
        ? "Customer notified: yes"
        : customerNotifyError
          ? `Customer notify error: ${customerNotifyError}`
          : "Customer notified: no",
    ]
      .filter(Boolean)
      .join("\n")
  );

  return {
    ok: true,
    action: "update_order",
    order: updated,
    rewards: rewardsSummary,
    customer_notified: shouldNotify && !customerNotifyError,
    warning: customerNotifyError || "",
    updated_by: admin.username,
    updated_at: nowIso(),
  };
}

async function handleVerifyPayment(body, admin) {
  const orderId = String(body.order_id || "").trim();
  if (!orderId) {
    return { ok: false, action: "verify_payment", error_code: "MISSING_ORDER_ID", message: "Order ID is required." };
  }

  const entries = await readOrdersWithRows();
  const entry = findOrderEntry(entries, orderId);
  if (!entry) {
    return { ok: false, action: "verify_payment", error_code: "ORDER_NOT_FOUND", message: "Order not found." };
  }

  const updated = { ...entry.view, status: "Confirmed" };
  const booking = {
    attempted: false,
    booked: false,
    tracking_link: "",
  };

  if (
    updated.delivery_method === "Lalamove" &&
    updated.payment_method !== "Cash on Delivery" &&
    !String(updated.tracking_number || "").trim()
  ) {
    booking.attempted = true;
    const checkout = {
      delivery_name: updated.delivery_name,
      delivery_address: updated.delivery_address,
      delivery_contact: updated.delivery_contact,
      delivery_area: updated.delivery_area,
      payment_method: updated.payment_method,
      delivery_method: updated.delivery_method,
    };
    const cart = { items: Array.isArray(updated.items) ? updated.items : [] };
    try {
      const quote = await getCheckoutLalamoveQuote(checkout, cart, {
        pickup_point: body.pickup_point || "jay",
      });
      if (quote?.ok) {
        const lalamoveOrder = await placeCheckoutLalamoveOrder({ lalamove: quote, items: cart.items }, checkout, updated.order_id);
        if (lalamoveOrder?.ok && lalamoveOrder.order_id) {
          updated.tracking_number = lalamoveOrder.order_id;
          booking.booked = true;
          booking.order_id = lalamoveOrder.order_id;
          booking.tracking_link = await getLalamoveTrackingLink(lalamoveOrder.order_id);
          booking.pickup = quote.pickup || null;
        } else {
          booking.error = lalamoveOrder?.message || "Lalamove booking failed.";
        }
      } else {
        booking.error = quote?.warning || "Lalamove quote failed.";
      }
    } catch (error) {
      booking.error = error instanceof Error ? error.message : "Lalamove booking failed.";
    }
  }

  await updateRecordRow("Orders", entry.rowNumber, buildOrderRowFromView(updated));

  const targetId = String(updated.user_id || "").trim();
  const notifications = {
    customer_notified: false,
  };
  if (isTelegramChatId(targetId)) {
    const lines = [
      `Order ${updated.order_id} update`,
      `Status: ${updated.status}`,
    ];
    if (updated.tracking_number) {
      lines.push(`Tracking number: ${updated.tracking_number}`);
    }
    if (booking.tracking_link) {
      lines.push(`Lalamove tracking: ${booking.tracking_link}`);
    }
    lines.push(`Track here: ${updated.tracking_link}`);
    try {
      await telegramSendMessage(targetId, lines.join("\n"), { parse_mode: null });
      notifications.customer_notified = true;
    } catch (error) {
      notifications.customer_error = error instanceof Error ? error.message : "Failed to notify customer.";
    }
  }
  await notifyAdminChat(
    [
      "Admin action: verify_payment",
      `Admin: ${admin.username}`,
      `Order: ${updated.order_id}`,
      `Status: ${updated.status}`,
      booking.booked ? "Lalamove booked: yes" : booking.attempted ? "Lalamove booked: no" : "Lalamove booked: skipped",
      booking.order_id ? `Lalamove order: ${booking.order_id}` : "",
      booking.error ? `Booking error: ${booking.error}` : "",
      notifications.customer_notified ? "Customer notified: yes" : notifications.customer_error ? `Customer notify error: ${notifications.customer_error}` : "Customer notified: no",
    ]
      .filter(Boolean)
      .join("\n")
  );

  return {
    ok: true,
    action: "verify_payment",
    order: updated,
    booking,
    notifications,
    updated_by: admin.username,
    updated_at: nowIso(),
  };
}

async function handleBookLalamove(body, admin) {
  const orderId = String(body.order_id || "").trim();
  if (!orderId) {
    return { ok: false, action: "book_lalamove", error_code: "MISSING_ORDER_ID", message: "Order ID is required." };
  }

  const entries = await readOrdersWithRows();
  const entry = findOrderEntry(entries, orderId);
  if (!entry) {
    return { ok: false, action: "book_lalamove", error_code: "ORDER_NOT_FOUND", message: "Order not found." };
  }

  const updated = { ...entry.view };
  if (updated.delivery_method !== "Lalamove") {
    return {
      ok: false,
      action: "book_lalamove",
      error_code: "DELIVERY_METHOD_NOT_LALAMOVE",
      message: "This order is not set to Lalamove delivery.",
    };
  }
  if (String(updated.tracking_number || "").trim()) {
    return {
      ok: false,
      action: "book_lalamove",
      error_code: "LALAMOVE_ALREADY_BOOKED",
      message: "This order already has a tracking number.",
    };
  }

  const checkout = {
    delivery_name: updated.delivery_name,
    delivery_address: updated.delivery_address,
    delivery_contact: updated.delivery_contact,
    delivery_area: updated.delivery_area,
    payment_method: updated.payment_method,
    delivery_method: updated.delivery_method,
  };
  const cart = { items: Array.isArray(updated.items) ? updated.items : [] };
  const booking = {
    attempted: true,
    booked: false,
    tracking_link: "",
    pickup_point: String(body.pickup_point || "jay").trim().toLowerCase(),
    delivery_address: updated.delivery_address,
    delivery_area: updated.delivery_area,
  };

  try {
    const quote = await getCheckoutLalamoveQuote(checkout, cart, {
      pickup_point: booking.pickup_point,
    });
    if (!quote?.ok) {
      return {
        ok: false,
        action: "book_lalamove",
        error_code: "LALAMOVE_QUOTE_FAILED",
        message: quote?.warning || "Lalamove quote failed.",
      };
    }
    const lalamoveOrder = await placeCheckoutLalamoveOrder({ lalamove: quote, items: cart.items }, checkout, updated.order_id);
    if (!lalamoveOrder?.ok || !lalamoveOrder.order_id) {
      return {
        ok: false,
        action: "book_lalamove",
        error_code: "LALAMOVE_BOOKING_FAILED",
        message: lalamoveOrder?.message || "Lalamove booking failed.",
        provider_error: lalamoveOrder?.debug || "",
        provider_response: lalamoveOrder?.data || null,
      };
    }
    updated.tracking_number = lalamoveOrder.order_id;
    booking.booked = true;
    booking.order_id = lalamoveOrder.order_id;
    booking.tracking_link = await getLalamoveTrackingLink(lalamoveOrder.order_id);
    booking.pickup = quote.pickup || null;
  } catch (error) {
    return {
      ok: false,
      action: "book_lalamove",
      error_code: "LALAMOVE_BOOKING_FAILED",
      message: error instanceof Error ? error.message : "Lalamove booking failed.",
      provider_error: "",
      provider_response: null,
    };
  }

  await updateRecordRow("Orders", entry.rowNumber, buildOrderRowFromView(updated));

  const targetId = String(updated.user_id || "").trim();
  const notifications = {
    customer_notified: false,
  };
  if (isTelegramChatId(targetId)) {
    const lines = [
      `Order ${updated.order_id} update`,
      `Lalamove booking confirmed.`,
      `Tracking number: ${updated.tracking_number}`,
      ...(booking.tracking_link ? [`Lalamove tracking: ${booking.tracking_link}`] : []),
      `Track here: ${updated.tracking_link}`,
    ];
    try {
      await telegramSendMessage(targetId, lines.join("\n"), { parse_mode: null });
      notifications.customer_notified = true;
    } catch (error) {
      notifications.customer_error = error instanceof Error ? error.message : "Failed to notify customer.";
    }
  }
  await notifyAdminChat(
    [
      "Admin action: book_lalamove",
      `Admin: ${admin.username}`,
      `Order: ${updated.order_id}`,
      `Pickup Point: ${booking.pickup_point}`,
      `Delivery Address: ${updated.delivery_address || "-"}`,
      updated.delivery_area ? `Delivery Area: ${updated.delivery_area}` : "",
      `Lalamove order: ${booking.order_id || "-"}`,
      booking.tracking_link ? `Tracking: ${booking.tracking_link}` : "",
      notifications.customer_notified ? "Customer notified: yes" : notifications.customer_error ? `Customer notify error: ${notifications.customer_error}` : "Customer notified: no",
    ]
      .filter(Boolean)
      .join("\n")
  );

  return {
    ok: true,
    action: "book_lalamove",
    order: updated,
    booking,
    notifications,
    updated_by: admin.username,
    updated_at: nowIso(),
  };
}

async function handleSendTrackingLink(body, admin) {
  const orderId = String(body.order_id || "").trim();
  if (!orderId) {
    return {
      ok: false,
      action: "send_tracking_link",
      error_code: "MISSING_ORDER_ID",
      message: "Order ID is required.",
    };
  }
  const entries = await readOrdersWithRows();
  const entry = findOrderEntry(entries, orderId);
  if (!entry) {
    return { ok: false, action: "send_tracking_link", error_code: "ORDER_NOT_FOUND", message: "Order not found." };
  }
  const order = entry.view;
  const targetId = String(order.user_id || "").trim();
  const canSendToTelegram = isTelegramChatId(targetId);

  const lines = [
    `Track your order ${order.order_id}`,
    `Status: ${order.status}`,
  ];
  if (order.tracking_number) {
    lines.push(`Tracking number: ${order.tracking_number}`);
  }
  let lalamoveTrackingLink = "";
  if (order.delivery_method === "Lalamove" && order.tracking_number) {
    try {
      lalamoveTrackingLink = await getLalamoveTrackingLink(order.tracking_number);
    } catch (_) {
      lalamoveTrackingLink = "";
    }
  }
  if (lalamoveTrackingLink) {
    lines.push(`Lalamove live tracking: ${lalamoveTrackingLink}`);
  }
  lines.push(order.tracking_link);
  let customerNotifyError = "";
  let sentTo = "";
  if (canSendToTelegram) {
    try {
      await telegramSendMessage(targetId, lines.join("\n"), { parse_mode: null });
      sentTo = targetId;
    } catch (error) {
      customerNotifyError = error instanceof Error ? error.message : "Failed to send tracking link.";
    }
  }
  await notifyAdminChat(
    [
      "Admin action: send_tracking_link",
      `Admin: ${admin.username}`,
      `Order: ${order.order_id}`,
      canSendToTelegram && !customerNotifyError
        ? `Sent to: ${targetId}`
        : "Sent to customer: no Telegram chat available",
      !canSendToTelegram ? `Fallback tracking page: ${order.tracking_link}` : "",
      lalamoveTrackingLink ? `Lalamove live tracking: ${lalamoveTrackingLink}` : "",
      customerNotifyError ? `Customer notify error: ${customerNotifyError}` : "",
      order.tracking_number ? `Tracking: ${order.tracking_number}` : "",
    ]
      .filter(Boolean)
      .join("\n")
  );

  return {
    ok: true,
    action: "send_tracking_link",
    order,
    sent_to: sentTo,
    customer_notified: Boolean(sentTo),
    tracking_link: lalamoveTrackingLink || order.tracking_link,
    contact_channel: canSendToTelegram ? "telegram" : "tracking_page_only",
    warning:
      !canSendToTelegram
        ? "Customer does not have a Telegram chat ID on this order. Use the tracking page link or saved phone contact."
        : customerNotifyError || "",
  };
}

async function handleContactCustomer(body, admin) {
  const orderId = String(body.order_id || "").trim();
  const message = String(body.message || "").trim();
  if (!orderId) {
    return {
      ok: false,
      action: "contact_customer",
      error_code: "MISSING_ORDER_ID",
      message: "Order ID is required.",
    };
  }
  if (!message) {
    return {
      ok: false,
      action: "contact_customer",
      error_code: "MISSING_MESSAGE",
      message: "Message is required.",
    };
  }
  const entries = await readOrdersWithRows();
  const entry = findOrderEntry(entries, orderId);
  if (!entry) {
    return { ok: false, action: "contact_customer", error_code: "ORDER_NOT_FOUND", message: "Order not found." };
  }
  const order = entry.view;
  const targetId = String(order.user_id || "").trim();
  if (!isTelegramChatId(targetId)) {
    return {
      ok: false,
      action: "contact_customer",
      error_code: "MISSING_TELEGRAM_ID",
      message: "This order does not have a Telegram chat ID. Contact Customer is only available for Telegram orders.",
    };
  }

  const text = [`Message from PoppersGuyPH support`, `Order: ${order.order_id}`, "", message].join("\n");
  await telegramSendMessage(targetId, text, { parse_mode: null });
  await notifyAdminChat(
    [
      "Admin action: contact_customer",
      `Admin: ${admin.username}`,
      `Order: ${order.order_id}`,
      `Sent to: ${targetId}`,
      `Message: ${message}`,
    ].join("\n")
  );

  return {
    ok: true,
    action: "contact_customer",
    order,
    sent_by: admin.username,
    sent_at: nowIso(),
  };
}

async function handleGetTickets(body) {
  const filter = String(body.filter || "open").trim().toLowerCase();
  const rows = await getRecordRows("Tickets").catch(() => [TICKET_HEADERS]);
  const tickets = mapSheetRows(rows)
    .map((record, index) => ({
      rowNumber: index + 2,
      ticket_id: String(record.ticket_id || "").trim(),
      created_at: String(record.created_at || "").trim(),
      type: String(record.type || "").trim(),
      user_id: String(record.user_id || "").trim(),
      username: normalizeUsername(record.username),
      message: String(record.message || "").trim(),
      status: String(record.status || "").trim() || "open",
    }))
    .sort((left, right) => parseDateSafe(right.created_at) - parseDateSafe(left.created_at));

  const filtered = tickets.filter((ticket) => (filter === "all" ? true : ticket.status.toLowerCase() === filter));
  return {
    ok: true,
    action: "get_tickets",
    tickets: filtered,
  };
}

async function handleUpdateTicket(body, admin) {
  const ticketId = String(body.ticket_id || "").trim();
  const status = String(body.status || "").trim().toLowerCase();
  if (!ticketId) {
    return { ok: false, action: "update_ticket", error_code: "MISSING_TICKET_ID", message: "Ticket ID is required." };
  }
  if (!status) {
    return { ok: false, action: "update_ticket", error_code: "MISSING_STATUS", message: "Ticket status is required." };
  }
  const rows = await getRecordRows("Tickets").catch(() => [TICKET_HEADERS]);
  const records = mapSheetRows(rows);
  const index = records.findIndex((record) => String(record.ticket_id || "").trim() === ticketId);
  if (index < 0) {
    return { ok: false, action: "update_ticket", error_code: "TICKET_NOT_FOUND", message: "Ticket not found." };
  }
  const record = records[index];
  const rowValues = [
    record.ticket_id,
    record.created_at,
    record.type,
    record.user_id,
    record.username,
    record.message,
    status,
  ];
  await updateRecordRow("Tickets", index + 2, rowValues);
  await notifyAdminChat(
    [
      "Admin action: update_ticket",
      `Admin: ${admin.username}`,
      `Ticket: ${record.ticket_id}`,
      `Type: ${record.type}`,
      `Status: ${status}`,
      record.username ? `Username: @${normalizeUsername(record.username)}` : "",
    ]
      .filter(Boolean)
      .join("\n")
  );
  return {
    ok: true,
    action: "update_ticket",
    ticket: {
      ticket_id: record.ticket_id,
      status,
    },
  };
}

async function handleGetPromos() {
  const rows = await getRecordRows("Promos").catch(() => [PROMO_HEADERS]);
  const promos = mapSheetRows(rows)
    .map((record, index) => ({
      rowNumber: index + 2,
      code: String(record.code || "").trim().toUpperCase(),
      discount: parseMoney(record.discount),
      active: ["yes", "true", "1", "active"].includes(String(record.active || "").trim().toLowerCase()),
    }))
    .filter((promo) => promo.code)
    .sort((left, right) => left.code.localeCompare(right.code));
  return {
    ok: true,
    action: "get_promos",
    promos,
  };
}

async function handleGetSurveys() {
  const rows = await getRecordRows("Surveys").catch(() => [SURVEY_HEADERS]);
  const surveys = mapSheetRows(rows)
    .map((record) => ({
      survey_id: String(record.survey_id || "").trim(),
      created_at: String(record.created_at || "").trim(),
      order_id: String(record.order_id || "").trim(),
      user_id: String(record.user_id || "").trim(),
      username: normalizeUsername(record.username),
      rating: Number(record.rating || 0),
      comment: String(record.comment || "").trim(),
      source: String(record.source || "").trim(),
    }))
    .filter((survey) => survey.order_id)
    .sort((left, right) => parseDateSafe(right.created_at) - parseDateSafe(left.created_at));

  const total = surveys.length;
  const average_rating = total
    ? Number((surveys.reduce((sum, survey) => sum + Number(survey.rating || 0), 0) / total).toFixed(2))
    : 0;

  return {
    ok: true,
    action: "get_surveys",
    surveys,
    summary: {
      total,
      average_rating,
      five_star: surveys.filter((survey) => Number(survey.rating || 0) === 5).length,
    },
  };
}

async function handleUpsertPromo(body, admin) {
  const code = String(body.code || "").trim().toUpperCase();
  const discount = parseMoney(body.discount);
  const active = body.active === false ? "false" : "true";
  if (!code) {
    return { ok: false, action: "upsert_promo", error_code: "MISSING_CODE", message: "Promo code is required." };
  }
  const rows = await getRecordRows("Promos").catch(() => [PROMO_HEADERS]);
  const records = mapSheetRows(rows);
  const index = records.findIndex((record) => String(record.code || "").trim().toUpperCase() === code);
  const rowValues = [code, discount, active];
  if (index >= 0) {
    await updateRecordRow("Promos", index + 2, rowValues);
  } else {
    await appendRecordRow("Promos", rowValues);
  }
  await notifyAdminChat(
    [
      "Admin action: upsert_promo",
      `Admin: ${admin.username}`,
      `Code: ${code}`,
      `Discount: ${discount}`,
      `Active: ${active === "true" ? "yes" : "no"}`,
      index >= 0 ? "Mode: updated" : "Mode: created",
    ].join("\n")
  );
  return {
    ok: true,
    action: "upsert_promo",
    promo: { code, discount, active: active === "true" },
  };
}

async function handleLogin(body) {
  const username = String(body.username || "").trim();
  const code = String(body.code || "").trim();
  const admin = await authenticateAdmin(username, code);
  if (!admin) {
    return { ok: false, action: "login", error_code: "INVALID_ADMIN_LOGIN", message: "Invalid admin login." };
  }
  const loginAtIso = nowIso();
  const loginAtManila = new Intl.DateTimeFormat("en-PH", {
    dateStyle: "full",
    timeStyle: "long",
    timeZone: "Asia/Manila",
  }).format(new Date(loginAtIso));
  await notifyAdminChat(
    [
      "Admin portal login",
      `Admin: ${admin.username}`,
      `Date/Time (Asia/Manila): ${loginAtManila}`,
      `Timestamp (UTC): ${loginAtIso}`,
    ].join("\n")
  );
  return {
    ok: true,
    action: "login",
    admin,
    login_at: loginAtIso,
    two_factor: {
      available: false,
      message: "Telegram-native 2FA is not available through the Bot API. A Telegram OTP step can be added next.",
    },
  };
}

async function handleGetInventory() {
  const rows = await getRecordRows("Products").catch(() => [PRODUCT_HEADERS]);
  const records = mapSheetRows(rows);
  const products = records
    .map((record, index) => ({
      rowNumber: index + 2,
      sku: String(record.sku || "").trim(),
      category: String(record.category || "").trim(),
      name: String(record.name || "").trim(),
      description: String(record.description || "").trim(),
      price: parseMoney(record.price),
      image_url: String(record.image_url || "").trim(),
      active: normalizeActiveFlag(record.active),
      stock: String(record.stock || "").trim() === "" ? "" : String(record.stock || "").trim(),
    }))
    .filter((product) => product.sku);
  return {
    ok: true,
    action: "get_inventory",
    inventory: products,
  };
}

async function handleUpdateInventoryItem(body, admin) {
  const sku = String(body.sku || "").trim();
  if (!sku) {
    return { ok: false, action: "update_inventory_item", error_code: "MISSING_SKU", message: "SKU is required." };
  }
  const rows = await getRecordRows("Products").catch(() => [PRODUCT_HEADERS]);
  const records = mapSheetRows(rows);
  const index = records.findIndex((record) => String(record.sku || "").trim() === sku);
  if (index < 0) {
    return { ok: false, action: "update_inventory_item", error_code: "SKU_NOT_FOUND", message: "Product not found." };
  }
  const record = records[index];
  const rowValues = [
    sku,
    String(body.category ?? record.category ?? "").trim(),
    String(body.name ?? record.name ?? "").trim(),
    String(body.description ?? record.description ?? "").trim(),
    parseMoney(body.price ?? record.price),
    String(body.image_url ?? record.image_url ?? "").trim(),
    normalizeActiveFlag(body.active ?? record.active) ? "true" : "false",
    String(body.stock ?? record.stock ?? "").trim(),
  ];
  await updateRecordRow("Products", index + 2, rowValues);
  await notifyAdminChat(
    [
      "Admin action: update_inventory_item",
      `Admin: ${admin.username}`,
      `SKU: ${rowValues[0]}`,
      `Name: ${rowValues[2]}`,
      `Price: ${parseMoney(rowValues[4])}`,
      `Active: ${rowValues[6] === "true" ? "yes" : "no"}`,
      `Stock: ${rowValues[7] || "-"}`,
    ].join("\n")
  );
  return {
    ok: true,
    action: "update_inventory_item",
    item: {
      sku: rowValues[0],
      category: rowValues[1],
      name: rowValues[2],
      description: rowValues[3],
      price: parseMoney(rowValues[4]),
      image_url: rowValues[5],
      active: rowValues[6] === "true",
      stock: rowValues[7],
      updated_by: admin.username,
    },
  };
}

async function handleGetAdminUsers() {
  const users = await readAdminUsersWithRows();
  return {
    ok: true,
    action: "get_admin_users",
    admin_users: users.map((entry) => entry.view),
    two_factor: {
      available: false,
      message: "Telegram-native 2FA is not available through the Bot API. A Telegram OTP step can be added next.",
    },
  };
}

async function handleAddAdminUser(body, admin) {
  const username = normalizeAdminUsername(body.username);
  const passcode = String(body.passcode || "").trim();
  if (!username || !passcode) {
    return {
      ok: false,
      action: "add_admin_user",
      error_code: "MISSING_ADMIN_FIELDS",
      message: "Username and passcode are required.",
    };
  }
  const users = await readAdminUsersWithRows();
  const existing = users.find((entry) => entry.view.username === username);
  const rowValues = buildAdminUserRow(
    {
      username,
      passcode,
      telegram_id: body.telegram_id,
      telegram_username: body.telegram_username,
      active: body.active !== false,
      created_by: admin.username,
    },
    admin.username
  );
  if (existing) {
    if (existing.rowNumber) {
      await updateRecordRow("AdminUsers", existing.rowNumber, rowValues);
    } else {
      await appendRecordRow("AdminUsers", rowValues);
    }
  } else {
    await appendRecordRow("AdminUsers", rowValues);
  }
  const telegramId = String(body.telegram_id || "").trim();
  const telegramUsername = normalizeAdminTelegramUsername(body.telegram_username);
  const fullName = String(body.full_name || username).trim();
  const miniappProvisioned = await upsertMiniAppUser(telegramId, telegramUsername, fullName).catch(() => false);
  let groupInvite = { invited: false, reason: "skipped" };
  if (telegramId) {
    try {
      groupInvite = await inviteAdminToGroup(telegramId, username);
    } catch (error) {
      groupInvite = {
        invited: false,
        reason: error instanceof Error ? error.message : "Failed to send invite link.",
      };
    }
  }
  await notifyAdminChat(
    [
      "Admin action: add_admin_user",
      `Admin: ${admin.username}`,
      `Username: ${username}`,
      telegramId ? `Telegram ID: ${telegramId}` : "",
      telegramUsername ? `Telegram Username: @${telegramUsername}` : "",
      `Active: ${rowValues[4] === "true" ? "yes" : "no"}`,
      miniappProvisioned ? "Mini app user provisioned: yes" : "Mini app user provisioned: no",
      groupInvite.invited ? "Group invite sent: yes" : `Group invite sent: no${groupInvite.reason ? ` (${groupInvite.reason})` : ""}`,
    ]
      .filter(Boolean)
      .join("\n")
  );
  return {
    ok: true,
    action: "add_admin_user",
    admin_user: {
      username,
      telegram_id: telegramId,
      telegram_username: telegramUsername,
      active: rowValues[4] === "true",
      updated_at: rowValues[5],
      created_by: admin.username,
    },
    miniapp_user: {
      provisioned: miniappProvisioned,
    },
    group_invite: groupInvite,
    message: telegramId
      ? "Admin user saved, Mini App user provisioned, and group invite sent."
      : "Admin user saved. Add a Telegram ID next time to provision Mini App access and send the group invite.",
  };
}

async function handleResetAdminPasscode(body, admin) {
  const username = normalizeAdminUsername(body.username);
  const passcode = String(body.passcode || "").trim();
  if (!username || !passcode) {
    return {
      ok: false,
      action: "reset_admin_passcode",
      error_code: "MISSING_ADMIN_FIELDS",
      message: "Username and new passcode are required.",
    };
  }
  const users = await readAdminUsersWithRows();
  const existing = users.find((entry) => entry.view.username === username);
  if (!existing) {
    return {
      ok: false,
      action: "reset_admin_passcode",
      error_code: "ADMIN_NOT_FOUND",
      message: "Admin user not found.",
    };
  }
  const rowValues = buildAdminUserRow(
    {
      ...existing.record,
      username,
      passcode,
      telegram_id: body.telegram_id ?? existing.record.telegram_id,
      telegram_username: body.telegram_username ?? existing.record.telegram_username,
      active: body.active ?? existing.record.active,
      created_by: admin.username,
    },
    admin.username
  );
  if (existing.rowNumber) {
    await updateRecordRow("AdminUsers", existing.rowNumber, rowValues);
  } else {
    await appendRecordRow("AdminUsers", rowValues);
  }
  await notifyAdminChat(
    [
      "Admin action: reset_admin_passcode",
      `Admin: ${admin.username}`,
      `Username: ${username}`,
      `Active: ${rowValues[4] === "true" ? "yes" : "no"}`,
    ].join("\n")
  );
  return {
    ok: true,
    action: "reset_admin_passcode",
    admin_user: {
      username,
      telegram_id: rowValues[2],
      telegram_username: rowValues[3],
      active: rowValues[4] === "true",
      updated_at: rowValues[5],
      created_by: admin.username,
    },
    message: "Admin password reset successfully.",
  };
}

async function handleUploadOrderPhotos(body, admin) {
  const orderId = String(body.order_id || "").trim();
  const photos = Array.isArray(body.photos) ? body.photos.filter(Boolean) : [];
  if (!orderId) {
    return { ok: false, action: "upload_order_photos", error_code: "MISSING_ORDER_ID", message: "Order ID is required." };
  }
  if (!photos.length) {
    return { ok: false, action: "upload_order_photos", error_code: "MISSING_PHOTOS", message: "At least one photo is required." };
  }

  const entries = await readOrdersWithRows();
  const entry = findOrderEntry(entries, orderId);
  if (!entry) {
    return { ok: false, action: "upload_order_photos", error_code: "ORDER_NOT_FOUND", message: "Order not found." };
  }

  const updated = { ...entry.view };
  const existing = Array.isArray(updated.order_photo_file_ids) ? [...updated.order_photo_file_ids] : [];
  const uploaded = [];
  const targetChatId = process.env.TELEGRAM_ADMIN_GROUP_ID || String(updated.user_id || "").trim();
  for (const photo of photos.slice(0, 8)) {
    const result = await telegramSendPhoto(
      targetChatId,
      photo,
      `Order photo upload\nOrder: ${updated.order_id}\nUploaded by: ${admin.username}`
    );
    const file = result?.result?.photo?.slice(-1)?.[0];
    const fileId = String(file?.file_id || "").trim();
    if (fileId) {
      existing.push(fileId);
      uploaded.push(fileId);
    }
  }
  updated.order_photo_file_ids = existing;
  await updateRecordRow("Orders", entry.rowNumber, buildOrderRowFromView(updated));
  await notifyAdminChat(
    [
      "Admin action: upload_order_photos",
      `Admin: ${admin.username}`,
      `Order: ${updated.order_id}`,
      `Uploaded count: ${uploaded.length}`,
      `Total photos on order: ${existing.length}`,
    ].join("\n")
  );
  return {
    ok: true,
    action: "upload_order_photos",
    order: updated,
    uploaded_count: uploaded.length,
  };
}

module.exports = async function handler(req, res) {
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  let body = {};
  try {
    body = req.method === "GET" ? req.query || {} : await parseBody(req);
  } catch (_) {
    sendJson(res, 400, { ok: false, message: "Invalid JSON body." });
    return;
  }

  const action = String(body.action || "").trim();
  if (action === "login") {
    try {
      const result = await handleLogin(body);
      sendJson(res, result.ok ? 200 : 401, result);
    } catch (error) {
      sendJson(res, 500, {
        ok: false,
        message: error instanceof Error ? error.message : "Admin login failed.",
        error_code: "ADMIN_LOGIN_FAILED",
      });
    }
    return;
  }

  const admin = await requireAdminAuth(req);
  if (!admin) {
    sendJson(res, 401, { ok: false, message: "Unauthorized admin request." });
    return;
  }

  try {
    let result;
    switch (action) {
      case "get_dashboard":
      case "get_orders":
        result = await handleGetDashboard(body);
        break;
      case "sales_report":
        result = await handleSalesReport(body);
        break;
      case "update_order":
        result = await handleUpdateOrder(body, admin);
        break;
      case "send_tracking_link":
        result = await handleSendTrackingLink(body, admin);
        break;
      case "contact_customer":
        result = await handleContactCustomer(body, admin);
        break;
      case "verify_payment":
        result = await handleVerifyPayment(body, admin);
        break;
      case "book_lalamove":
        result = await handleBookLalamove(body, admin);
        break;
      case "get_tickets":
        result = await handleGetTickets(body);
        break;
      case "update_ticket":
        result = await handleUpdateTicket(body, admin);
        break;
      case "get_promos":
        result = await handleGetPromos();
        break;
      case "get_surveys":
        result = await handleGetSurveys();
        break;
      case "upsert_promo":
        result = await handleUpsertPromo(body, admin);
        break;
      case "get_inventory":
        result = await handleGetInventory();
        break;
      case "update_inventory_item":
        result = await handleUpdateInventoryItem(body, admin);
        break;
      case "get_admin_users":
        result = await handleGetAdminUsers();
        break;
      case "add_admin_user":
        result = await handleAddAdminUser(body, admin);
        break;
      case "reset_admin_passcode":
        result = await handleResetAdminPasscode(body, admin);
        break;
      case "upload_order_photos":
        result = await handleUploadOrderPhotos(body, admin);
        break;
      default:
        result = { ok: false, message: "Unsupported admin action.", error_code: "UNSUPPORTED_ACTION" };
        break;
    }
    sendJson(res, result.ok ? 200 : 400, result);
  } catch (error) {
    sendJson(res, 500, {
      ok: false,
      message: error instanceof Error ? error.message : "Admin request failed.",
      error_code: "ADMIN_REQUEST_FAILED",
    });
  }
};
