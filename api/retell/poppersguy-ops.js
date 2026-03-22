"use strict";

const { createHmac, createSign, randomUUID } = require("node:crypto");

const DEFAULT_CATALOG_URL = "https://jakeconcha.pythonanywhere.com/api/catalog/poppers";
const LALAMOVE_SANDBOX_BASE = "https://rest.sandbox.lalamove.com";
const DEFAULT_GSHEET_ID = "1_OQ3tiHzb0jFrkcg2mwDz-prVLDa-ef5GUijqJwcD_I";
const ORDER_HEADERS = [
  "order_id",
  "created_at",
  "user_id",
  "username",
  "full_name",
  "items_json",
  "subtotal",
  "discount",
  "shipping",
  "total",
  "delivery_name",
  "delivery_address",
  "delivery_contact",
  "delivery_area",
  "payment_method",
  "payment_proof_file_id",
  "status",
  "tracking_number",
];
const USER_HEADERS = [
  "user_id",
  "username",
  "full_name",
  "last_delivery_name",
  "last_delivery_address",
  "last_delivery_contact",
  "last_delivery_area",
  "updated_at",
];
const TICKET_HEADERS = ["ticket_id", "created_at", "type", "user_id", "username", "message", "status"];
const AFFILIATE_HEADERS = [
  "created_at",
  "user_id",
  "username",
  "twitter_or_telegram",
  "email",
  "contact",
  "subscriber_count",
];
const DEFAULT_SERVICE_ACCOUNT_INFO = {
  type: "service_account",
  project_id: "delulubes-bot-projec",
  private_key_id: "1ea5f27a00d19718f9151140b4887498c026a571",
  private_key:
    "-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQCG2YuYL5D3HJxq\nF2BpBxFmrjyglmf4nA3m6tQu1ttCxldNx/vkQlf+3WWE0QCiHX0tbJM2cJE+lMwL\najfbEobTIrAgRSXiqRolZLUXNbT7Yc36bAtN4J+9Q1Hwvqk1DmVSXloqeD2h4vFW\nYklHn8X/YdXWtPwTv2mMCd1ii3gQt+7Q+z6EY+zcJHO/nZb1Pw5eucNGknEB7kx0\ndIOu6HWVJRSriS3qmAzfnpKFIdq+ypr5ofcl2lQjyjcL7p837vSZ8Uv+3SKolgSg\nC5dZ2FwOHGEjgJBKZkkbrPLRhBTAWFtqC/0cHgXQaouXiUt75xHLXJ/poyiALoTl\ngPZuskDlAgMBAAECggEACy5ajsHS6UpsBbfufIbjgHoN+Nq/wDNgS7dI5KFYCM9d\nScu9LQ37Mdy1oC+cN9TuHigUhL0Mrf20dXXXL8j3eOY1aFeTbpnK2zLgeQ4w9W8E\nnzD6NvjbBdxhHO8SJJ4O9KdyHndd1OB2Vk1L+i5bQnOgQW88P37th3kB7DvYNrqK\nuGl5EfueglfJ/bWDevu0U80PZIHskszm8OOjebcaJ0ycZjrlPo64JI+240vdqH/V\nuiw7Gd9gXI/3CS7d6sZ65UItzdNh4ucR09pOYYmam26iQ3NPKwsl4zYUXEAdc5/o\nGXqkRr8JPPuFU9TeTPigCtteotaxgA/xrup04vcIuQKBgQC77/63wdbo6H4UGYhy\nazIJlmqfed+zMGkiL1pQ/NXsjix/akxQnzsoU5aeg/RKVTnYMlQ9Y+NbFi7tA0bi\nqV4nonwa9/zh8rf4RE1S3A84CmLlC8FGZHegj6hmGEVS8533ab8ulV97agzpvdYI\nREceIV+Bf0IPrueW82SjoGXGywKBgQC3r7MO12+AO1alfZc06RCJkF7RkIXXUX9u\nBmrtwX9eCxSs3WVniw7wQ6z2B6TNu8AkxML4sVv3pIi/GN2sdjzdX53APlEMr8rK\n7NaQ0XSF3KiKCJkBbNe3+3vCmlFtS5Se6yjTXEhjM+vkZr2e5wWRsq9Q0HPs3+hX\nz242GHRxDwKBgCIa4lmMdqibkE2reIRzCYiN4FmCb2MANQP8HeK2j0e3YUHaE3FK\nBB1EVf/8KDfZEX83WuwtFVQxSWC/iHyXibudk/H88Mo8FsCZ/II95xEfaWTxZiiV\nENR1XXTxkJsGFLOSYBxfBQ3LZ/5+8blcUp+YJNHGO0HHVsWg87Fx6SZTAoGBAJsU\nwQU/yEioUJAqB5ZJS4gJFrSx4v4WNZML4g1Xt5QLoOoNhca0tekOCiIx8+cqo5+n\na8ER5Mag6D8G3Gj17o8sYgBj3IPsizdmXAUqgclesgDQH3X/keUocqWrKiIvlIvT\nmMVR/V+b/4X3ZBKbk60eAjwlsioEJKK2Y6NSZETrAoGBAKkVXI60PTtUN7FdClsP\nXW6Mi9X1CtqGe5D3DYQ6n32DB5FYXSBFiVKP/+b1jN43F4Es0cyKHPqBopDbTVqF\nr9rO36/9700ZumCCNt8r+Lez1AbJnNiGzDzyWn+M20f9nM4+h0CTohe1hZSXvte6\nOkHt7Kef97z4DmKpMG5egpBD\n-----END PRIVATE KEY-----\n",
  client_email: "lulu-bot@delulubes-bot-projec.iam.gserviceaccount.com",
  client_id: "102918503006931436608",
  token_uri: "https://oauth2.googleapis.com/token",
};
const SHIPPING_PROVINCIAL = 100;
const COD_FEE = 50;
const LOYALTY_REDEEM_POINTS = 1000;
const LOYALTY_REDEEM_VALUE = 100;
const LOYALTY_POINTS_PER_ORDER = 10;
const REFERRAL_SUCCESS_POINTS = 50;
const PROMO_CACHE_TTL_MS = 5 * 60 * 1000;

let promoCache = {
  expiresAt: 0,
  promos: {},
};
const CART_SESSION_TTL_MS = 30 * 60 * 1000;
const cartSessions = new Map();
let latestCartSession = null;

function sendJson(res, status, body) {
  res.status(status).setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(body));
}

function getBearerToken(req) {
  const header = req.headers.authorization || req.headers.Authorization || "";
  const match = /^Bearer\s+(.+)$/i.exec(String(header).trim());
  return match ? match[1] : "";
}

function parseJsonEnv(name, fallback) {
  const raw = process.env[name];
  if (!raw) {
    return fallback;
  }
  try {
    return JSON.parse(raw);
  } catch (_) {
    return fallback;
  }
}

function base64UrlEncode(input) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function getGoogleServiceAccountInfo() {
  return parseJsonEnv("GOOGLE_SERVICE_ACCOUNT_INFO", DEFAULT_SERVICE_ACCOUNT_INFO);
}

async function getGoogleAccessToken() {
  const serviceAccount = getGoogleServiceAccountInfo();
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const claimSet = {
    iss: serviceAccount.client_email,
    scope: "https://www.googleapis.com/auth/spreadsheets",
    aud: serviceAccount.token_uri || "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now,
  };
  const unsignedToken = `${base64UrlEncode(JSON.stringify(header))}.${base64UrlEncode(JSON.stringify(claimSet))}`;
  const signer = createSign("RSA-SHA256");
  signer.update(unsignedToken);
  signer.end();
  const signature = signer.sign(serviceAccount.private_key);
  const assertion = `${unsignedToken}.${base64UrlEncode(signature)}`;

  const response = await fetch(serviceAccount.token_uri || "https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }).toString(),
  });
  const payload = await response.json();
  if (!response.ok || !payload.access_token) {
    throw new Error(payload.error_description || payload.error || "Failed to get Google access token");
  }
  return payload.access_token;
}

async function fetchPromosFromSheet() {
  if (promoCache.expiresAt > Date.now()) {
    return promoCache.promos;
  }

  const spreadsheetId = String(process.env.GSHEET_ID || DEFAULT_GSHEET_ID).trim();
  const accessToken = await getGoogleAccessToken();
  const range = encodeURIComponent("Promos!A:C");
  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
    }
  );
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error?.message || "Failed to load promo sheet");
  }

  const rows = Array.isArray(payload.values) ? payload.values : [];
  const [headers, ...bodyRows] = rows;
  const headerMap = Array.isArray(headers) ? headers.map((value) => String(value || "").trim().toLowerCase()) : [];
  const codeIndex = headerMap.indexOf("code");
  const discountIndex = headerMap.indexOf("discount");
  const activeIndex = headerMap.indexOf("active");
  const promos = {};

  for (const row of bodyRows) {
    const code = String(row?.[codeIndex] || "").trim().toUpperCase();
    const discount = Number(row?.[discountIndex] || 0);
    const active = ["yes", "true", "1", "active"].includes(
      String(row?.[activeIndex] || "").trim().toLowerCase()
    );
    if (!code) {
      continue;
    }
    promos[code] = {
      code,
      discount: Number.isFinite(discount) ? discount : 0,
      active,
    };
  }

  promoCache = {
    expiresAt: Date.now() + PROMO_CACHE_TTL_MS,
    promos,
  };
  return promos;
}

async function callGoogleSheets(path, { method = "GET", body } = {}) {
  const spreadsheetId = String(process.env.GSHEET_ID || DEFAULT_GSHEET_ID).trim();
  const accessToken = await getGoogleAccessToken();
  const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error?.message || "Google Sheets request failed");
  }
  return payload;
}

async function appendSheetRow(sheetName, rowValues) {
  const range = encodeURIComponent(`${sheetName}!A1`);
  return callGoogleSheets(`/values/${range}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`, {
    method: "POST",
    body: { majorDimension: "ROWS", values: [rowValues] },
  });
}

async function getSheetValues(sheetName) {
  const range = encodeURIComponent(`${sheetName}!A:Z`);
  const payload = await callGoogleSheets(`/values/${range}`);
  return Array.isArray(payload.values) ? payload.values : [];
}

async function updateSheetRow(sheetName, rowNumber, rowValues) {
  const endColumn = String.fromCharCode(64 + rowValues.length);
  const range = encodeURIComponent(`${sheetName}!A${rowNumber}:${endColumn}${rowNumber}`);
  return callGoogleSheets(`/values/${range}?valueInputOption=USER_ENTERED`, {
    method: "PUT",
    body: { majorDimension: "ROWS", values: [rowValues] },
  });
}

function mapSheetRows(rows) {
  const [headers = [], ...bodyRows] = Array.isArray(rows) ? rows : [];
  const normalizedHeaders = headers.map((value) => String(value || "").trim());
  return bodyRows
    .filter((row) => Array.isArray(row) && row.some((cell) => String(cell || "").trim()))
    .map((row) => {
      const record = {};
      normalizedHeaders.forEach((header, index) => {
        record[header] = row[index] ?? "";
      });
      return record;
    });
}

function normalizePromoCode(code) {
  return String(code || "").trim().toUpperCase();
}

function nowIso() {
  return new Date().toISOString();
}

function compactJsonStringify(value) {
  return JSON.stringify(value == null ? {} : value);
}

function getTelegramId(customer) {
  return String(customer.telegram_id || customer.telegram_user_id || customer.username || "")
    .trim()
    .replace(/^@/, "");
}

function getRetellCallKey(body) {
  const call = body?._retell?.call;
  if (!call || typeof call !== "object") {
    return "";
  }
  return String(
    call.call_id ||
      call.callId ||
      call.conversation_id ||
      call.conversationId ||
      call.id ||
      ""
  ).trim();
}

function getCartSessionKey(body) {
  const customer = body?.customer || {};
  const telegramId = getTelegramId(customer);
  if (telegramId) {
    return `tg:${telegramId}`;
  }
  const retellKey = getRetellCallKey(body);
  if (retellKey) {
    return `retell:${retellKey}`;
  }
  return "";
}

function writeCartSession(body, items) {
  const key = getCartSessionKey(body);
  if (!Array.isArray(items) || !items.length) {
    return;
  }
  const session = {
    items: items.map((item) => ({ sku: String(item.sku || ""), qty: Number(item.qty || 0) })).filter((item) => item.sku && item.qty > 0),
    expiresAt: Date.now() + CART_SESSION_TTL_MS,
  };
  if (key) {
    cartSessions.set(key, session);
  }
  latestCartSession = session;
}

function readCartSession(body) {
  const key = getCartSessionKey(body);
  const session = key ? cartSessions.get(key) : latestCartSession;
  if (!session) {
    return [];
  }
  if (session.expiresAt <= Date.now()) {
    if (key) {
      cartSessions.delete(key);
    }
    if (latestCartSession === session) {
      latestCartSession = null;
    }
    return [];
  }
  return Array.isArray(session.items) ? session.items : [];
}

function resolveCartItems(body) {
  const directItems = Array.isArray(body.cart?.items) ? body.cart.items : [];
  if (directItems.length) {
    writeCartSession(body, directItems);
    return directItems;
  }
  return readCartSession(body);
}

function getMissingDeliveryFields(checkout) {
  const fields = [
    ["delivery_area", "delivery area"],
    ["delivery_name", "delivery name"],
    ["delivery_address", "delivery address"],
    ["delivery_contact", "delivery contact number"],
  ];
  return fields
    .filter(([key]) => !String(checkout?.[key] || "").trim())
    .map(([key, label]) => ({ key, label }));
}

function buildMissingFieldError(action, message, errorCode, missingFields) {
  return {
    ok: false,
    action,
    message,
    error_code: errorCode,
    missing_fields: missingFields.map((field) => field.key),
    next_required_field: missingFields[0]?.key || "",
    next_required_label: missingFields[0]?.label || "",
  };
}

function getNumericTelegramUserId(customer) {
  const raw = String(customer.telegram_user_id || customer.telegram_id || "").trim().replace(/^@/, "");
  return /^\d+$/.test(raw) ? raw : "";
}

function getTelegramUsername(customer) {
  const username = String(customer.username || customer.telegram_id || "").trim().replace(/^@/, "");
  return username && !/^\d+$/.test(username) ? username : "";
}

function makeOrderId(customer) {
  const date = new Date();
  const yy = String(date.getUTCFullYear()).slice(-2);
  const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(date.getUTCDate()).padStart(2, "0");
  const rawId = String(getTelegramId(customer) || customer.customer_id || "0000");
  const suffix = rawId.replace(/\D/g, "").slice(-4).padStart(4, "0");
  const rand = Math.random().toString(16).slice(2, 6).toUpperCase();
  return `DL${yy}${mm}${dd}-${suffix}-${rand}`;
}

function getOrderFollowUpKeys(customer) {
  const telegramId = getTelegramId(customer);
  const numericTelegramId = getNumericTelegramUserId(customer);
  const username = getTelegramUsername(customer);
  const customerId = String(customer.customer_id || "").trim();
  return [telegramId, numericTelegramId, username, customerId]
    .map((value) => String(value || "").trim().replace(/^@/, ""))
    .filter(Boolean);
}

function parseOrderCreatedAt(order) {
  const timestamp = Date.parse(String(order.created_at || "").trim());
  return Number.isFinite(timestamp) ? timestamp : 0;
}

async function findOrderRecord(orderId, customer) {
  const rows = await getSheetValues("Orders").catch(() => [ORDER_HEADERS]);
  const records = mapSheetRows(rows);
  const normalizedOrderId = String(orderId || "").trim().toUpperCase();
  if (normalizedOrderId) {
    return (
      records.find((record) => String(record.order_id || "").trim().toUpperCase() === normalizedOrderId) || null
    );
  }

  const keys = getOrderFollowUpKeys(customer);
  if (!keys.length) {
    return null;
  }

  const matching = records.filter((record) => {
    const userId = String(record.user_id || "").trim().replace(/^@/, "");
    const username = String(record.username || "").trim().replace(/^@/, "");
    return keys.includes(userId) || keys.includes(username);
  });

  if (!matching.length) {
    return null;
  }

  matching.sort((left, right) => parseOrderCreatedAt(right) - parseOrderCreatedAt(left));
  return matching[0];
}

async function upsertUserDelivery(customer, checkout) {
  const userId = getNumericTelegramUserId(customer);
  if (!userId) {
    return;
  }

  const rowValues = [
    userId,
    getTelegramUsername(customer),
    String(customer.name || checkout.delivery_name || "").trim(),
    String(checkout.delivery_name || "").trim(),
    String(checkout.delivery_address || "").trim(),
    String(checkout.delivery_contact || "").trim(),
    String(checkout.delivery_area || "").trim(),
    nowIso(),
  ];

  const rows = await getSheetValues("Users").catch(() => [USER_HEADERS]);
  const existingIndex = rows.slice(1).findIndex((row) => String(row?.[0] || "").trim() === userId);
  if (existingIndex >= 0) {
    await updateSheetRow("Users", existingIndex + 2, rowValues);
    return;
  }
  await appendSheetRow("Users", rowValues);
}

async function logOrderToSheets(order) {
  await appendSheetRow("Orders", [
    order.order_id,
    order.created_at,
    order.user_id,
    order.username,
    order.full_name,
    JSON.stringify(order.items || []),
    order.subtotal,
    order.discount,
    order.shipping,
    order.total,
    order.delivery_name,
    order.delivery_address,
    order.delivery_contact,
    order.delivery_area,
    order.payment_method,
    order.payment_proof_file_id,
    order.status,
    order.tracking_number || "",
  ]);
}

async function logTicketToSheets(ticketType, customer, message) {
  const ticketId = randomUUID().slice(0, 8);
  await appendSheetRow("Tickets", [
    ticketId,
    nowIso(),
    ticketType,
    getNumericTelegramUserId(customer) || getTelegramId(customer),
    getTelegramUsername(customer),
    message,
    "open",
  ]);
  return ticketId;
}

async function logAffiliateToSheets(customer, affiliate) {
  await appendSheetRow("Affiliates", [
    nowIso(),
    getNumericTelegramUserId(customer) || getTelegramId(customer),
    getTelegramUsername(customer),
    affiliate.handle || "",
    affiliate.email || "",
    affiliate.contact || "",
    affiliate.subscriber_count || "",
  ]);
}

async function fetchCatalog() {
  const url = process.env.POPPERS_CATALOG_URL || DEFAULT_CATALOG_URL;
  const response = await fetch(url, {
    headers: { Accept: "application/json" },
  });
  if (!response.ok) {
    throw new Error(`Catalog request failed with status ${response.status}`);
  }
  const payload = await response.json();
  const products = Array.isArray(payload.products) ? payload.products : [];
  const categories = Array.isArray(payload.categories) ? payload.categories : [];
  return { products, categories };
}

function findProduct(products, sku) {
  const target = String(sku || "").trim().toLowerCase();
  return products.find((product) => String(product.sku || "").trim().toLowerCase() === target) || null;
}

function buildCartLines(products, items) {
  const lines = [];
  let subtotal = 0;
  let totalQty = 0;

  for (const item of items || []) {
    const sku = String(item.sku || "").trim();
    const qty = Number(item.qty || 0);
    if (!sku || !Number.isFinite(qty) || qty <= 0) {
      continue;
    }
    const product = findProduct(products, sku);
    if (!product) {
      throw new Error(`SKU not found: ${sku}`);
    }
    const stock = Number(product.stock || 0);
    if (qty > stock) {
      throw new Error(`${sku} has only ${stock} left`);
    }
    const price = Number(product.price || 0);
    const lineTotal = price * qty;
    subtotal += lineTotal;
    totalQty += qty;
    lines.push({
      sku,
      name: product.name,
      category: product.category,
      qty,
      price,
      line_total: Number(lineTotal.toFixed(2)),
      stock,
      image_url: product.image_url || "",
    });
  }

  return {
    items: lines,
    subtotal: Number(subtotal.toFixed(2)),
    total_qty: totalQty,
    wholesale_threshold_reached: totalQty >= 30,
  };
}

async function getPromoDiscount(subtotal, promoCode) {
  const promos = await fetchPromosFromSheet().catch(() => parseJsonEnv("POPPERS_PROMOS_JSON", {}));
  const code = normalizePromoCode(promoCode);
  if (!code || code === "NONE") {
    return { promo_code: "none", promo_discount: 0, promo_applied: false };
  }
  const promo = promos[code];
  const discountValue = Number(promo?.discount ?? promos[code] ?? 0);
  const isActive = typeof promo === "object" ? Boolean(promo.active) : discountValue > 0;
  if (!discountValue || discountValue <= 0 || !isActive) {
    return {
      promo_code: code,
      promo_discount: 0,
      promo_applied: false,
      promo_warning: "Promo code not found or inactive.",
    };
  }
  return {
    promo_code: code,
    promo_discount: Number(Math.min(discountValue, subtotal).toFixed(2)),
    promo_applied: true,
  };
}

function computeRewardRedemption(balance, subtotalAfterPromo) {
  if (balance < LOYALTY_REDEEM_POINTS || subtotalAfterPromo < LOYALTY_REDEEM_VALUE) {
    return { reward_points_used: 0, reward_discount: 0 };
  }
  const blocks = Math.min(
    Math.floor(balance / LOYALTY_REDEEM_POINTS),
    Math.floor(subtotalAfterPromo / LOYALTY_REDEEM_VALUE)
  );
  return {
    reward_points_used: blocks * LOYALTY_REDEEM_POINTS,
    reward_discount: blocks * LOYALTY_REDEEM_VALUE,
  };
}

function getLoyaltyBalance(customer) {
  const balances = parseJsonEnv("POPPERS_LOYALTY_BALANCES_JSON", {});
  const keys = [
    customer.telegram_user_id,
    customer.customer_id,
    customer.username,
  ].filter(Boolean);
  for (const key of keys) {
    const value = balances[String(key)];
    if (value !== undefined) {
      return Number(value || 0);
    }
  }
  return 0;
}

function parseMoney(value) {
  const amount = Number(value || 0);
  return Number.isFinite(amount) ? Number(amount.toFixed(2)) : 0;
}

function getLalamoveQuotedFee(body) {
  return parseMoney(
    body.lalamove?.quotedTotal ||
      body.lalamove?.priceBreakdown?.total ||
      body.lalamove?.quotation?.priceBreakdown?.total ||
      0
  );
}

function computeTotals(subtotal, discount, deliveryArea, paymentMethod, lalamoveFee = 0) {
  const shippingBase = deliveryArea === "Outside Metro Manila" ? SHIPPING_PROVINCIAL : 0;
  const codFee = paymentMethod === "Cash on Delivery" ? COD_FEE : 0;
  const deliveryFee = parseMoney(lalamoveFee);
  const shipping = shippingBase + deliveryFee;
  const total = Math.max(subtotal - discount, 0) + shipping + codFee;
  return {
    shipping_base: Number(shippingBase.toFixed(2)),
    delivery_fee: deliveryFee,
    cod_fee: Number(codFee.toFixed(2)),
    shipping: Number((shipping + codFee).toFixed(2)),
    total: Number(total.toFixed(2)),
  };
}

function getOrderStatus(paymentMethod) {
  if (paymentMethod === "Cash on Delivery") {
    return "Pending Confirmation";
  }
  return "Awaiting Payment Verification";
}

function getLalamoveBaseUrl() {
  const custom = String(process.env.LALAMOVE_BASE_URL || "").trim();
  if (custom) {
    return custom.replace(/\/+$/, "");
  }
  return LALAMOVE_SANDBOX_BASE;
}

function getLalamoveCredentials() {
  const apiKey = String(process.env.LALAMOVE_API_KEY || "").trim();
  const apiSecret = String(process.env.LALAMOVE_API_SECRET || "").trim();
  if (!apiKey || !apiSecret) {
    throw new Error("Lalamove credentials are not configured");
  }
  return { apiKey, apiSecret };
}

async function callLalamove({ method, path, market, body }) {
  const { apiKey, apiSecret } = getLalamoveCredentials();
  const timestamp = Date.now().toString();
  const jsonBody = body ? compactJsonStringify(body) : "";
  const rawSignature = `${timestamp}\r\n${method}\r\n${path}\r\n\r\n${jsonBody}`;
  const signature = createHmac("sha256", apiSecret).update(rawSignature).digest("hex");
  const token = `${apiKey}:${timestamp}:${signature}`;
  const response = await fetch(`${getLalamoveBaseUrl()}${path}`, {
    method,
    headers: {
      Authorization: `hmac ${token}`,
      Market: market,
      "Request-ID": randomUUID(),
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: jsonBody || undefined,
  });

  let payload = null;
  const text = await response.text();
  try {
    payload = text ? JSON.parse(text) : null;
  } catch (_) {
    payload = { raw: text };
  }

  if (!response.ok) {
    const message =
      payload?.message ||
      payload?.error ||
      payload?.raw ||
      `Lalamove request failed with status ${response.status}`;
    return {
      ok: false,
      status: response.status,
      message,
      data: payload,
    };
  }

  return {
    ok: true,
    status: response.status,
    data: payload,
  };
}

async function telegramSendMessage(chatId, text, options = {}) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    throw new Error("TELEGRAM_BOT_TOKEN is not configured");
  }
  const buildBody = (parseMode) => ({
    chat_id: chatId,
    text,
    ...(parseMode ? { parse_mode: parseMode } : {}),
    disable_web_page_preview: true,
  });

  const send = async (parseMode) => {
    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(buildBody(parseMode)),
    });
    const payload = await response.json();
    return { response, payload };
  };

  const preferredParseMode = options.parse_mode === undefined ? "Markdown" : options.parse_mode;
  let result = await send(preferredParseMode);
  if ((!result.response.ok || !result.payload.ok) && preferredParseMode) {
    result = await send(null);
  }
  if (!result.response.ok || !result.payload.ok) {
    throw new Error(result.payload.description || `Telegram send failed with status ${result.response.status}`);
  }
  return result.payload;
}

async function notifyAdmins(text) {
  const adminGroup = process.env.TELEGRAM_ADMIN_GROUP_ID;
  const adminIds = String(process.env.TELEGRAM_ADMIN_IDS || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  const results = [];
  if (adminGroup) {
    results.push(await telegramSendMessage(adminGroup, text));
    return results;
  }
  for (const adminId of adminIds) {
    results.push(await telegramSendMessage(adminId, text));
  }
  if (!results.length) {
    throw new Error("No Telegram admin target is configured");
  }
  return results;
}

function buildOrderSummary(order) {
  const itemLines = order.items.map((item) => `- ${item.name} x${item.qty} = PHP ${item.line_total.toFixed(2)}`);
  return [
    `Order ${order.order_id}`,
    `Status: ${order.status}`,
    "",
    "Items:",
    ...itemLines,
    "",
    `Subtotal: PHP ${order.subtotal.toFixed(2)}`,
    `Promo Discount: PHP ${order.promo_discount.toFixed(2)}`,
    `Loyalty Discount: PHP ${order.reward_discount.toFixed(2)}`,
    `Delivery Fee: PHP ${Number(order.delivery_fee || 0).toFixed(2)}`,
    `COD Fee: PHP ${Number(order.cod_fee || 0).toFixed(2)}`,
    `Shipping and Fees: PHP ${order.shipping.toFixed(2)}`,
    `Total: PHP ${order.total.toFixed(2)}`,
    "",
    `Delivery Name: ${order.delivery_name}`,
    `Delivery Contact: ${order.delivery_contact}`,
    `Delivery Address: ${order.delivery_address}`,
    `Delivery Area: ${order.delivery_area}`,
    `Payment Method: ${order.payment_method}`,
  ].join("\n");
}

async function handleGetCatalog(body) {
  const catalog = await fetchCatalog();
  const category = String(body.catalog?.category || "").trim().toLowerCase();
  const query = String(body.catalog?.query || "").trim().toLowerCase();

  let products = catalog.products;
  if (category) {
    products = products.filter((product) => String(product.category || "").trim().toLowerCase() === category);
  }
  if (query) {
    products = products.filter((product) =>
      [product.name, product.description, product.category, product.sku]
        .join(" ")
        .toLowerCase()
        .includes(query)
    );
  }

  return {
    ok: true,
    action: "get_catalog",
    message: "Catalog loaded successfully.",
    data: {
      products,
      categories: catalog.categories,
      count: products.length,
    },
  };
}

async function handleGetProduct(body) {
  const { products } = await fetchCatalog();
  const sku = body.catalog?.sku;
  const product = findProduct(products, sku);
  if (!product) {
    return {
      ok: false,
      action: "get_product",
      message: "Product not found.",
      error_code: "PRODUCT_NOT_FOUND",
    };
  }
  return {
    ok: true,
    action: "get_product",
    message: "Product loaded successfully.",
    data: { product },
  };
}

async function handleCart(body) {
  const { products } = await fetchCatalog();
  const items = resolveCartItems(body);
  const cart = buildCartLines(products, items);
  return {
    ok: true,
    action: body.action,
    message: "Cart calculated successfully.",
    data: cart,
  };
}

async function handleQuoteOrder(body) {
  const { products } = await fetchCatalog();
  const items = resolveCartItems(body);
  if (!items.length) {
    return {
      ok: false,
      action: "quote_order",
      message: "Cart is empty. Please add items to the cart before quoting.",
      error_code: "MISSING_CART_ITEMS",
    };
  }
  const checkout = body.checkout || {};
  const missingDeliveryFields = getMissingDeliveryFields(checkout);
  if (missingDeliveryFields.length) {
    return buildMissingFieldError(
      "quote_order",
      `Missing ${missingDeliveryFields[0].label}. Please collect delivery details before generating a quote.`,
      "MISSING_DELIVERY_FIELDS",
      missingDeliveryFields
    );
  }
  const cart = buildCartLines(products, items);
  const promo = await getPromoDiscount(cart.subtotal, checkout.promo_code);
  const loyaltyBalance = getLoyaltyBalance(body.customer || {});
  const reward = computeRewardRedemption(
    loyaltyBalance,
    Math.max(cart.subtotal - promo.promo_discount, 0)
  );
  const discount = Number((promo.promo_discount + reward.reward_discount).toFixed(2));
  const lalamoveFee = getLalamoveQuotedFee(body);
  const totals = computeTotals(
    cart.subtotal,
    discount,
    checkout.delivery_area || "Metro Manila",
    checkout.payment_method || "Cash on Delivery",
    lalamoveFee
  );

  return {
    ok: true,
    action: "quote_order",
    message: "Quote generated successfully.",
    data: {
      ...cart,
      promo_code: promo.promo_code,
      promo_applied: Boolean(promo.promo_applied),
      promo_discount: promo.promo_discount,
      reward_points_used: reward.reward_points_used,
      reward_discount: reward.reward_discount,
      discount,
      loyalty_balance: loyaltyBalance,
      lalamove_quotation_id: body.lalamove?.quotationId || "",
      delivery_fee: totals.delivery_fee,
      cod_fee: totals.cod_fee,
      shipping_base: totals.shipping_base,
      shipping: totals.shipping,
      total: totals.total,
      warnings: [promo.promo_warning].filter(Boolean),
    },
  };
}

async function handleSubmitOrder(body) {
  const quote = await handleQuoteOrder(body);
  if (!quote.ok) {
    return quote;
  }

  const customer = body.customer || {};
  const telegramId = getTelegramId(customer);
  const checkout = body.checkout || {};
  if (!telegramId) {
    return {
      ok: false,
      action: "submit_order",
      message: "Telegram ID or Telegram username is required before submitting the order.",
      error_code: "MISSING_TELEGRAM_ID",
    };
  }
  const missingDeliveryFields = getMissingDeliveryFields(checkout);
  if (missingDeliveryFields.length) {
    return buildMissingFieldError(
      "submit_order",
      `Missing ${missingDeliveryFields[0].label}. Please collect delivery details before submitting the order.`,
      "MISSING_DELIVERY_FIELDS",
      missingDeliveryFields
    );
  }
  const orderId = makeOrderId(customer);
  const status = getOrderStatus(checkout.payment_method || "");
  const order = {
    order_id: orderId,
    created_at: nowIso(),
    customer_id: customer.customer_id || "",
    user_id: getNumericTelegramUserId(customer) || telegramId,
    telegram_user_id: telegramId,
    full_name: customer.name || checkout.delivery_name || "",
    username: String(customer.username || telegramId).replace(/^@/, ""),
    status,
    items: quote.data.items,
    subtotal: quote.data.subtotal,
    promo_discount: quote.data.promo_discount,
    reward_discount: quote.data.reward_discount,
    reward_points_used: quote.data.reward_points_used,
    discount: quote.data.discount,
    lalamove_quotation_id: body.lalamove?.quotationId || quote.data.lalamove_quotation_id || "",
    lalamove_order_id: "",
    lalamove_share_link: "",
    delivery_fee: quote.data.delivery_fee || 0,
    cod_fee: quote.data.cod_fee || 0,
    shipping_base: quote.data.shipping_base || 0,
    shipping: quote.data.shipping,
    total: quote.data.total,
    delivery_name: checkout.delivery_name || "",
    delivery_address: checkout.delivery_address || "",
    delivery_contact: checkout.delivery_contact || "",
    delivery_area: checkout.delivery_area || "",
    payment_method: checkout.payment_method || "",
    payment_proof_url: checkout.payment_proof_url || "",
    payment_proof_file_id: checkout.payment_proof_file_id || "",
    tracking_number: "",
  };

  const adminText = [
    `New order *${order.order_id}*`,
    `Customer: ${order.full_name || "-"}${order.username ? ` (@${order.username})` : ""}`,
    `Telegram ID: ${telegramId}`,
    `Total: PHP ${order.total.toFixed(2)}`,
    `Delivery Fee: PHP ${Number(order.delivery_fee || 0).toFixed(2)}`,
    `Payment: ${order.payment_method}`,
    `Status: ${order.status}`,
    "",
    "Items:",
    ...order.items.map((item) => `- ${item.name} x${item.qty} = PHP ${item.line_total.toFixed(2)}`),
    "",
    `Delivery: ${order.delivery_name} - ${order.delivery_contact}`,
    `${order.delivery_address}`,
    `Area: ${order.delivery_area}`,
  ].join("\n");

  const customerText = [
    `Your order *${order.order_id}* has been created.`,
    `Status: ${order.status}`,
    `Total: PHP ${order.total.toFixed(2)}`,
    "",
    "We will update you with confirmation and tracking soon.",
  ].join("\n");

  const notifications = {
    admin_notified: false,
    customer_notified: false,
  };

  const shouldPlaceLalamove =
    Boolean(body.lalamove?.autoPlaceOrder) &&
    Boolean(body.lalamove?.quotationId) &&
    body.checkout?.payment_confirmed === true;

  if (shouldPlaceLalamove) {
    const bookingResult = await handleLalamovePlaceOrder(body);
    if (bookingResult.ok) {
      order.lalamove_order_id = bookingResult.data?.data?.orderId || bookingResult.data?.orderId || "";
      order.lalamove_share_link =
        bookingResult.data?.data?.shareLink || bookingResult.data?.shareLink || "";
      if (order.lalamove_order_id) {
        notifications.lalamove_booked = true;
      }
    } else {
      notifications.lalamove_booked = false;
      notifications.lalamove_error = bookingResult.message;
    }
  }

  notifications.sheet_logged = false;
  notifications.user_saved = false;

  try {
    await logOrderToSheets(order);
    notifications.sheet_logged = true;
  } catch (error) {
    notifications.sheet_error = error instanceof Error ? error.message : "Failed to log order.";
  }

  try {
    await upsertUserDelivery(customer, checkout);
    notifications.user_saved = true;
  } catch (error) {
    notifications.user_save_error = error instanceof Error ? error.message : "Failed to save user delivery info.";
  }

  try {
    await notifyAdmins(adminText);
    notifications.admin_notified = true;
  } catch (error) {
    notifications.admin_error = error instanceof Error ? error.message : "Failed to notify admins.";
  }

  const numericTelegramUserId = getNumericTelegramUserId(customer);
  if (numericTelegramUserId) {
    try {
      await telegramSendMessage(numericTelegramUserId, customerText);
      notifications.customer_notified = true;
    } catch (error) {
      notifications.customer_error = error instanceof Error ? error.message : "Failed to notify customer.";
    }
  } else {
    notifications.customer_error =
      "Customer confirmation was skipped because a numeric Telegram user ID was not available.";
  }

  return {
    ok: true,
    action: "submit_order",
    message: "Order created successfully.",
    data: {
      order,
      summary: buildOrderSummary(order),
      notifications,
    },
  };
}

async function handleTrackOrder(body, useLatest = false) {
  const customer = body.customer || {};
  const requestedOrderId = useLatest ? "" : String(body.order?.order_id || body.order_id || "").trim();
  if (!useLatest && !requestedOrderId) {
    return {
      ok: false,
      action: "track_order",
      message: "Order number is required for order follow-up.",
      error_code: "MISSING_ORDER_ID",
    };
  }

  const order = await findOrderRecord(requestedOrderId, customer);
  if (!order) {
    return {
      ok: false,
      action: useLatest ? "track_latest_order" : "track_order",
      message: useLatest
        ? "No recent order was found for this customer."
        : "Order not found.",
      error_code: "ORDER_NOT_FOUND",
    };
  }

  const status = String(order.status || "").trim() || "Pending";
  const trackingNumber = String(order.tracking_number || "").trim();
  return {
    ok: true,
    action: useLatest ? "track_latest_order" : "track_order",
    message: "Order follow-up loaded successfully.",
    data: {
      order_id: String(order.order_id || "").trim(),
      status,
      tracking_number: trackingNumber,
      payment_method: String(order.payment_method || "").trim(),
      delivery_name: String(order.delivery_name || "").trim(),
      delivery_address: String(order.delivery_address || "").trim(),
      delivery_contact: String(order.delivery_contact || "").trim(),
      delivery_area: String(order.delivery_area || "").trim(),
      subtotal: parseMoney(order.subtotal),
      discount: parseMoney(order.discount),
      shipping: parseMoney(order.shipping),
      total: parseMoney(order.total),
      created_at: String(order.created_at || "").trim(),
      tracking_available: Boolean(trackingNumber),
    },
  };
}

async function handleSupportTicket(body) {
  const customer = body.customer || {};
  const telegramId = getTelegramId(customer);
  const message = String(body.support?.message || "").trim();
  if (!message) {
    return {
      ok: false,
      action: "create_support_ticket",
      message: "Support message is required.",
      error_code: "MISSING_SUPPORT_MESSAGE",
    };
  }
  if (!telegramId) {
    return {
      ok: false,
      action: "create_support_ticket",
      message: "Telegram ID or Telegram username is required before submitting a support ticket.",
      error_code: "MISSING_TELEGRAM_ID",
    };
  }
  const text = [
    "Customer service ticket",
    `Name: ${customer.name || "-"}`,
    `Username: ${customer.username ? `@${customer.username}` : "-"}`,
    `Telegram ID: ${telegramId}`,
    `Message: ${message}`,
  ].join("\n");
  const ticketId = await logTicketToSheets("customer_service", customer, message);
  await notifyAdmins(text);
  return {
    ok: true,
    action: "create_support_ticket",
    message: "Support ticket sent successfully.",
    data: { notified: true, ticket_id: ticketId },
  };
}

async function handleBulkOrder(body) {
  const customer = body.customer || {};
  const bulk = body.bulk_order || {};
  const ticketMessage = [
    `Requested Items: ${bulk.requested_items || "-"}`,
    `Target Date: ${bulk.target_date || "-"}`,
    `Message: ${bulk.message || "-"}`,
  ].join("\n");
  const text = [
    "Bulk order request",
    `Name: ${customer.name || "-"}`,
    `Username: ${customer.username ? `@${customer.username}` : "-"}`,
    `Telegram ID: ${customer.telegram_user_id || "-"}`,
    `Requested Items: ${bulk.requested_items || "-"}`,
    `Target Date: ${bulk.target_date || "-"}`,
    `Message: ${bulk.message || "-"}`,
  ].join("\n");
  const ticketId = await logTicketToSheets("bulk_order", customer, ticketMessage);
  await notifyAdmins(text);
  return {
    ok: true,
    action: "create_bulk_order_ticket",
    message: "Bulk order request sent successfully.",
    data: { notified: true, ticket_id: ticketId },
  };
}

async function handleAffiliate(body) {
  const customer = body.customer || {};
  const affiliate = body.affiliate || {};
  const text = [
    "New affiliate enrollment",
    `Name: ${customer.name || "-"}`,
    `Username: ${customer.username ? `@${customer.username}` : "-"}`,
    `Telegram ID: ${customer.telegram_user_id || "-"}`,
    `Handle: ${affiliate.handle || "-"}`,
    `Email: ${affiliate.email || "-"}`,
    `Contact: ${affiliate.contact || "-"}`,
    `Subscriber Count: ${affiliate.subscriber_count || "-"}`,
  ].join("\n");
  await logAffiliateToSheets(customer, affiliate);
  await notifyAdmins(text);
  return {
    ok: true,
    action: "submit_affiliate_enrollment",
    message: "Affiliate enrollment sent successfully.",
    data: { notified: true },
  };
}

async function handleRewards(body) {
  const balance = getLoyaltyBalance(body.customer || {});
  const reward = computeRewardRedemption(balance, 1000000);
  return {
    ok: true,
    action: "get_rewards_info",
    message: "Rewards info loaded successfully.",
    data: {
      loyalty_balance: balance,
      auto_redeem_points: reward.reward_points_used,
      auto_redeem_value: reward.reward_discount,
      rules: {
        completed_order_points: LOYALTY_POINTS_PER_ORDER,
        referral_success_points: REFERRAL_SUCCESS_POINTS,
        redeem_points: LOYALTY_REDEEM_POINTS,
        redeem_value: LOYALTY_REDEEM_VALUE,
      },
    },
  };
}

async function handleLalamoveGetCities(body) {
  const market = String(body.lalamove?.market || "PH").trim().toUpperCase();
  const result = await callLalamove({
    method: "GET",
    path: "/v3/cities",
    market,
  });
  if (!result.ok) {
    return {
      ok: false,
      action: "lalamove_get_cities",
      message: result.message,
      error_code: "LALAMOVE_API_ERROR",
      data: result.data,
    };
  }
  return {
    ok: true,
    action: "lalamove_get_cities",
    message: "Lalamove cities loaded successfully.",
    data: result.data,
  };
}

function buildLalamoveQuotationPayload(body) {
  const market = String(body.lalamove?.market || "PH").trim().toUpperCase();
  const payload = {
    data: {
      serviceType: body.lalamove?.serviceType,
      language: body.lalamove?.language || "en_PH",
      stops: body.lalamove?.stops || [],
    },
  };

  if (body.lalamove?.specialRequests?.length) {
    payload.data.specialRequests = body.lalamove.specialRequests;
  }
  if (body.lalamove?.scheduleAt) {
    payload.data.scheduleAt = body.lalamove.scheduleAt;
  }
  if (body.lalamove?.item) {
    payload.data.item = body.lalamove.item;
  }
  if (typeof body.lalamove?.isRouteOptimized === "boolean") {
    payload.data.isRouteOptimized = body.lalamove.isRouteOptimized;
  }

  return { market, payload };
}

async function handleLalamoveQuote(body) {
  const { market, payload } = buildLalamoveQuotationPayload(body);
  const result = await callLalamove({
    method: "POST",
    path: "/v3/quotations",
    market,
    body: payload,
  });
  if (!result.ok) {
    return {
      ok: false,
      action: "lalamove_quote",
      message: result.message,
      error_code: "LALAMOVE_API_ERROR",
      data: result.data,
    };
  }
  return {
    ok: true,
    action: "lalamove_quote",
    message: "Lalamove quotation created successfully.",
    data: {
      ...result.data,
      quoted_total:
        result.data?.data?.priceBreakdown?.total ||
        result.data?.priceBreakdown?.total ||
        "0",
      currency:
        result.data?.data?.priceBreakdown?.currency ||
        result.data?.priceBreakdown?.currency ||
        "",
    },
  };
}

async function handleLalamovePlaceOrder(body) {
  const market = String(body.lalamove?.market || "PH").trim().toUpperCase();
  const payload = {
    data: {
      quotationId: body.lalamove?.quotationId,
      sender: body.lalamove?.sender,
      recipients: body.lalamove?.recipients || [],
    },
  };

  if (typeof body.lalamove?.isPODEnabled === "boolean") {
    payload.data.isPODEnabled = body.lalamove.isPODEnabled;
  }
  if (body.lalamove?.partner) {
    payload.data.partner = body.lalamove.partner;
  }
  if (body.lalamove?.metadata) {
    payload.data.metadata = body.lalamove.metadata;
  }

  const result = await callLalamove({
    method: "POST",
    path: "/v3/orders",
    market,
    body: payload,
  });
  if (!result.ok) {
    return {
      ok: false,
      action: "lalamove_place_order",
      message: result.message,
      error_code: "LALAMOVE_API_ERROR",
      data: result.data,
    };
  }
  return {
    ok: true,
    action: "lalamove_place_order",
    message: "Lalamove order placed successfully.",
    data: result.data,
  };
}

async function handleLalamoveOrderDetails(body) {
  const market = String(body.lalamove?.market || "PH").trim().toUpperCase();
  const orderId = String(body.lalamove?.orderId || "").trim();
  if (!orderId) {
    return {
      ok: false,
      action: "lalamove_order_details",
      message: "Lalamove orderId is required.",
      error_code: "MISSING_LALAMOVE_ORDER_ID",
    };
  }
  const result = await callLalamove({
    method: "GET",
    path: `/v3/orders/${encodeURIComponent(orderId)}`,
    market,
  });
  if (!result.ok) {
    return {
      ok: false,
      action: "lalamove_order_details",
      message: result.message,
      error_code: "LALAMOVE_API_ERROR",
      data: result.data,
    };
  }
  return {
    ok: true,
    action: "lalamove_order_details",
    message: "Lalamove order details loaded successfully.",
    data: result.data,
  };
}

async function handleSendTelegram(body) {
  const telegram = body.telegram || {};
  if (!telegram.message) {
    return {
      ok: false,
      action: "send_telegram",
      message: "Telegram message is required.",
      error_code: "MISSING_TELEGRAM_MESSAGE",
    };
  }

  if (telegram.target === "customer") {
    if (!telegram.target_id) {
      return {
        ok: false,
        action: "send_telegram",
        message: "Customer target_id is required.",
        error_code: "MISSING_TARGET_ID",
      };
    }
    await telegramSendMessage(telegram.target_id, telegram.message);
    return {
      ok: true,
      action: "send_telegram",
      message: "Telegram message sent successfully.",
      data: { target: "customer" },
    };
  }

  await notifyAdmins(telegram.message);
  return {
    ok: true,
    action: "send_telegram",
    message: "Telegram message sent successfully.",
    data: { target: telegram.target || "admin_group" },
  };
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return sendJson(res, 405, {
      ok: false,
      message: "Method not allowed. Use POST.",
    });
  }

  const expectedToken = process.env.RETELL_FUNCTION_AUTH_TOKEN;
  if (expectedToken) {
    const receivedToken = getBearerToken(req);
    if (!receivedToken || receivedToken !== expectedToken) {
      return sendJson(res, 401, {
        ok: false,
        message: "Unauthorized.",
      });
    }
  }

  const rawBody = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
  const body =
    rawBody && typeof rawBody === "object" && rawBody.args && typeof rawBody.args === "object"
      ? { ...rawBody.args, _retell: { name: rawBody.name || "", call: rawBody.call || null } }
      : rawBody;
  const action = String(body.action || "").trim();

  if (!action) {
    return sendJson(res, 400, {
      ok: false,
      message: "Missing action.",
      error_code: "MISSING_ACTION",
    });
  }

  try {
    let result;
    switch (action) {
      case "get_catalog":
        result = await handleGetCatalog(body);
        break;
      case "get_product":
        result = await handleGetProduct(body);
        break;
      case "update_cart":
      case "get_cart":
        result = await handleCart(body);
        break;
      case "quote_order":
        result = await handleQuoteOrder(body);
        break;
      case "submit_order":
        result = await handleSubmitOrder(body);
        break;
      case "create_support_ticket":
        result = await handleSupportTicket(body);
        break;
      case "create_bulk_order_ticket":
        result = await handleBulkOrder(body);
        break;
      case "submit_affiliate_enrollment":
        result = await handleAffiliate(body);
        break;
      case "get_rewards_info":
        result = await handleRewards(body);
        break;
      case "send_telegram":
        result = await handleSendTelegram(body);
        break;
      case "lalamove_get_cities":
        result = await handleLalamoveGetCities(body);
        break;
      case "lalamove_quote":
        result = await handleLalamoveQuote(body);
        break;
      case "lalamove_place_order":
        result = await handleLalamovePlaceOrder(body);
        break;
      case "lalamove_order_details":
        result = await handleLalamoveOrderDetails(body);
        break;
      case "track_order":
        result = await handleTrackOrder(body, false);
        break;
      case "track_latest_order":
        result = await handleTrackOrder(body, true);
        break;
      default:
        result = {
          ok: false,
          action,
          message: `Unsupported action: ${action}`,
          error_code: "UNSUPPORTED_ACTION",
        };
        break;
    }

    const status = result.ok ? 200 : 400;
    return sendJson(res, status, result);
  } catch (error) {
    return sendJson(res, 500, {
      ok: false,
      action,
      message: error instanceof Error ? error.message : "Unexpected server error.",
      error_code: "INTERNAL_ERROR",
    });
  }
};
