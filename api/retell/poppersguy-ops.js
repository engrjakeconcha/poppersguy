"use strict";

const { createHmac, createSign, randomUUID } = require("node:crypto");
const net = require("node:net");
const tls = require("node:tls");

const DEFAULT_POPPERS_CATALOG_URL = "https://jakeconcha.pythonanywhere.com/api/catalog/poppers";
const DEFAULT_DELU_CATALOG_URL = "https://jakeconcha.pythonanywhere.com/api/catalog/delu";
const DEFAULT_CART_SESSION_API_URL = "";
const DEFAULT_REDIS_URL = "";
const LALAMOVE_SANDBOX_BASE = "https://rest.sandbox.lalamove.com";
const DEFAULT_GSHEET_ID = "1_OQ3tiHzb0jFrkcg2mwDz-prVLDa-ef5GUijqJwcD_I";
const DEFAULT_DELU_GSHEET_ID = "1sgzv8LTnqkxi5e1_VM1Zb_XxPDk6vhBv4s5pCj9LSxM";
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
  "delivery_method",
  "referral_code",
  "payment_proof_file_id",
  "status",
  "tracking_number",
  "order_photo_file_ids",
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
const PROMO_HEADERS = ["code", "discount", "active"];
const PRODUCT_HEADERS = ["sku", "category", "name", "description", "price", "image_url", "active", "stock"];
const ADMIN_USER_HEADERS = [
  "username",
  "passcode",
  "telegram_id",
  "telegram_username",
  "active",
  "updated_at",
  "created_by",
];
const REWARD_HEADERS = [
  "event_id",
  "created_at",
  "user_id",
  "username",
  "order_id",
  "type",
  "points_delta",
  "message",
  "meta_json",
];
const SURVEY_HEADERS = [
  "survey_id",
  "created_at",
  "order_id",
  "user_id",
  "username",
  "rating",
  "comment",
  "source",
];
const AFFILIATE_HEADERS = [
  "created_at",
  "user_id",
  "username",
  "twitter_or_telegram",
  "email",
  "contact",
  "subscriber_count",
];
const CART_SESSION_HEADERS = ["session_key", "items_json", "updated_at"];
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
const REWARD_COMPLETION_STATUSES = new Set(["Delivered", "Completed", "Received"]);
const PROMO_CACHE_TTL_MS = 5 * 60 * 1000;
const STORE_CONFIGS = {
  poppers: {
    slug: "poppers",
    catalogUrlEnv: "POPPERS_CATALOG_URL",
    defaultCatalogUrl: DEFAULT_POPPERS_CATALOG_URL,
    publicBaseUrl: process.env.POPPERS_PUBLIC_BASE_URL || "https://poppers.jcit.digital",
    adminPortalUrl: process.env.POPPERS_ADMIN_PORTAL_URL || "https://poppers.jcit.digital/admin",
    defaultPromoCode: "LOYAL30",
    referralPrefixes: ["PGPH"],
    sheetIdEnv: "POPPERS_GSHEET_ID",
    defaultSheetId: DEFAULT_GSHEET_ID,
  },
  delu: {
    slug: "delu",
    catalogUrlEnv: "DELU_CATALOG_URL",
    defaultCatalogUrl: DEFAULT_DELU_CATALOG_URL,
    publicBaseUrl: process.env.DELU_PUBLIC_BASE_URL || "https://delu.jcit.digital",
    adminPortalUrl: process.env.DELU_ADMIN_PORTAL_URL || "https://delu.jcit.digital/admin",
    defaultPromoCode: "LOYAL20",
    referralPrefixes: ["DELU", "PGPH"],
    sheetIdEnv: "DELU_GSHEET_ID",
    defaultSheetId: DEFAULT_DELU_GSHEET_ID,
  },
};
const DEFAULT_LALAMOVE_SERVICE_TYPE = "MOTORCYCLE";
const DEFAULT_LALAMOVE_PICKUP_ADDRESS = "Santol St 1372, 1448 Valenzuela, Philippines";
const DEFAULT_LALAMOVE_PICKUP_LAT = "14.7060176";
const DEFAULT_LALAMOVE_PICKUP_LNG = "120.9630606";
const DEFAULT_LALAMOVE_PICKUP_NAME = "Jay Concha";
const DEFAULT_LALAMOVE_PICKUP_PHONE = "09696104046";
const LALAMOVE_PICKUP_POINTS = {
  jay: {
    id: "jay",
    label: "Jay Concha",
    address: DEFAULT_LALAMOVE_PICKUP_ADDRESS,
    lat: DEFAULT_LALAMOVE_PICKUP_LAT,
    lng: DEFAULT_LALAMOVE_PICKUP_LNG,
    name: DEFAULT_LALAMOVE_PICKUP_NAME,
    phone: DEFAULT_LALAMOVE_PICKUP_PHONE,
  },
  josh: {
    id: "josh",
    label: "Josh",
    address: "Vine Residences, Quezon City, Philippines",
    lat: "",
    lng: "",
    name: "Josh",
    phone: DEFAULT_LALAMOVE_PICKUP_PHONE,
  },
};

let promoCache = {
  expiresAt: 0,
  promos: {},
};
const SHEET_CACHE_TTL_MS = 15 * 1000;
const sheetRowsCache = new Map();
const sheetRowsInFlight = new Map();
const CART_SESSION_TTL_MS = 30 * 60 * 1000;
const PAYMENT_PROOF_TTL_MS = 60 * 60 * 1000;
const cartSessions = new Map();
const paymentProofCache = new Map();
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

function normalizeActiveFlag(value) {
  const normalized = String(value == null ? "" : value).trim().toLowerCase();
  if (!normalized) return true;
  return !["0", "false", "no", "inactive", "disabled"].includes(normalized);
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

function getRedisUrl() {
  return String(process.env.POPPERS_CART_REDIS_URL || process.env.REDIS_URL || DEFAULT_REDIS_URL).trim();
}

function encodeRedisCommand(parts) {
  return (
    `*${parts.length}\r\n` +
    parts
      .map((part) => {
        const value = String(part ?? "");
        return `$${Buffer.byteLength(value)}\r\n${value}\r\n`;
      })
      .join("")
  );
}

async function readRedisResponse(socket) {
  return new Promise((resolve, reject) => {
    let buffer = "";
    function cleanup() {
      socket.off("data", onData);
      socket.off("error", onError);
      socket.off("close", onClose);
    }
    function onError(error) {
      cleanup();
      reject(error);
    }
    function onClose() {
      cleanup();
      reject(new Error("Redis socket closed unexpectedly"));
    }
    function onData(chunk) {
      buffer += chunk.toString("utf8");
      if (!buffer.includes("\r\n")) {
        return;
      }
      const type = buffer[0];
      const lineEnd = buffer.indexOf("\r\n");
      const line = buffer.slice(1, lineEnd);
      if (type === "+" || type === "-" || type === ":" || type === "_") {
        cleanup();
        if (type === "-") {
          reject(new Error(line));
          return;
        }
        resolve(type === ":" ? Number(line) : line);
        return;
      }
      if (type === "$") {
        const length = Number(line);
        if (length === -1) {
          cleanup();
          resolve(null);
          return;
        }
        const totalLength = lineEnd + 2 + length + 2;
        if (buffer.length < totalLength) {
          return;
        }
        const payload = buffer.slice(lineEnd + 2, lineEnd + 2 + length);
        cleanup();
        resolve(payload);
      }
    }
    socket.on("data", onData);
    socket.on("error", onError);
    socket.on("close", onClose);
  });
}

async function withRedisConnection(callback) {
  const redisUrl = getRedisUrl();
  if (!redisUrl) {
    return null;
  }
  const parsed = new URL(redisUrl);
  const isTls = parsed.protocol === "rediss:";
  const port = Number(parsed.port || (isTls ? 6380 : 6379));
  const host = parsed.hostname;
  const username = decodeURIComponent(parsed.username || "default");
  const password = decodeURIComponent(parsed.password || "");

  const socket = await new Promise((resolve, reject) => {
    const client = isTls
      ? tls.connect({ host, port, servername: host })
      : net.createConnection({ host, port });
    const onError = (error) => {
      client.destroy();
      reject(error);
    };
    client.once("error", onError);
    client.once("connect", () => {
      client.off("error", onError);
      resolve(client);
    });
  });

  async function command(parts) {
    socket.write(encodeRedisCommand(parts));
    return readRedisResponse(socket);
  }

  try {
    if (password) {
      await command(["AUTH", username, password]);
    }
    const result = await callback(command);
    socket.end();
    return result;
  } catch (error) {
    socket.destroy();
    throw error;
  }
}

async function persistCartSessionToRedis(sessionKey, items) {
  if (!sessionKey || !getRedisUrl()) {
    return false;
  }
  const payload = JSON.stringify(items || []);
  const ttlSeconds = Math.floor(CART_SESSION_TTL_MS / 1000);
  await withRedisConnection((command) => command(["SETEX", sessionKey, String(ttlSeconds), payload]));
  return true;
}

async function readCartSessionFromRedis(sessionKey) {
  if (!sessionKey || !getRedisUrl()) {
    return [];
  }
  const payload = await withRedisConnection((command) => command(["GET", sessionKey]));
  if (!payload) {
    return [];
  }
  try {
    const items = JSON.parse(String(payload || "[]"));
    return Array.isArray(items) ? items : [];
  } catch (_) {
    return [];
  }
}

async function persistPaymentProofToken(token, dataUrl) {
  if (!token || !dataUrl) {
    return false;
  }
  if (getRedisUrl()) {
    const ttlSeconds = Math.floor(PAYMENT_PROOF_TTL_MS / 1000);
    await withRedisConnection((command) => command(["SETEX", `paymentproof:${token}`, String(ttlSeconds), dataUrl]));
    return true;
  }
  paymentProofCache.set(token, { dataUrl, expiresAt: Date.now() + PAYMENT_PROOF_TTL_MS });
  return true;
}

async function readPaymentProofToken(token) {
  if (!token) {
    return "";
  }
  if (getRedisUrl()) {
    const payload = await withRedisConnection((command) => command(["GET", `paymentproof:${token}`]));
    return payload ? String(payload || "") : "";
  }
  const cached = paymentProofCache.get(token);
  if (!cached) {
    return "";
  }
  if (cached.expiresAt < Date.now()) {
    paymentProofCache.delete(token);
    return "";
  }
  return String(cached.dataUrl || "");
}

async function deletePaymentProofToken(token) {
  if (!token) {
    return false;
  }
  if (getRedisUrl()) {
    await withRedisConnection((command) => command(["DEL", `paymentproof:${token}`]));
    return true;
  }
  paymentProofCache.delete(token);
  return true;
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

async function ensureSheetExists(sheetName, headers) {
  try {
    await callGoogleSheets("", { method: "GET" });
  } catch (_) {
    return;
  }

  const spreadsheetId = String(process.env.GSHEET_ID || DEFAULT_GSHEET_ID).trim();
  const accessToken = await getGoogleAccessToken();
  const metaResponse = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  });
  const metaPayload = await metaResponse.json();
  if (!metaResponse.ok) {
    throw new Error(metaPayload.error?.message || "Failed to inspect spreadsheet");
  }
  const exists = Array.isArray(metaPayload.sheets)
    ? metaPayload.sheets.some((sheet) => String(sheet.properties?.title || "").trim() === sheetName)
    : false;
  if (exists) {
    return;
  }

  const addResponse = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      requests: [{ addSheet: { properties: { title: sheetName } } }],
    }),
  });
  const addPayload = await addResponse.json();
  if (!addResponse.ok) {
    throw new Error(addPayload.error?.message || `Failed to create sheet ${sheetName}`);
  }

  if (Array.isArray(headers) && headers.length) {
    const range = encodeURIComponent(`${sheetName}!A1`);
    await callGoogleSheets(`/values/${range}?valueInputOption=USER_ENTERED`, {
      method: "PUT",
      body: { majorDimension: "ROWS", values: [headers] },
    });
  }
}

function getSheetHeaders(sheetName) {
  if (sheetName === "Orders") {
    return ORDER_HEADERS;
  }
  if (sheetName === "Users") {
    return USER_HEADERS;
  }
  if (sheetName === "Tickets") {
    return TICKET_HEADERS;
  }
  if (sheetName === "Promos") {
    return PROMO_HEADERS;
  }
  if (sheetName === "Products") {
    return PRODUCT_HEADERS;
  }
  if (sheetName === "AdminUsers") {
    return ADMIN_USER_HEADERS;
  }
  if (sheetName === "Rewards") {
    return REWARD_HEADERS;
  }
  if (sheetName === "Surveys") {
    return SURVEY_HEADERS;
  }
  if (sheetName === "Affiliates") {
    return AFFILIATE_HEADERS;
  }
  if (sheetName === "CartSessions") {
    return CART_SESSION_HEADERS;
  }
  return null;
}

async function ensureSheetHeaders(sheetName) {
  const headers = getSheetHeaders(sheetName);
  if (!headers || !headers.length) {
    return;
  }
  await ensureSheetExists(sheetName, headers);
  const range = encodeURIComponent(`${sheetName}!A1:Z1`);
  const payload = await callGoogleSheets(`/values/${range}`).catch(() => ({ values: [] }));
  const current = Array.isArray(payload.values?.[0]) ? payload.values[0].map((value) => String(value || "").trim()) : [];
  const needsUpdate =
    headers.length !== current.length || headers.some((header, index) => String(current[index] || "").trim() !== header);
  if (!needsUpdate) {
    return;
  }
  const startRange = encodeURIComponent(`${sheetName}!A1`);
  await callGoogleSheets(`/values/${startRange}?valueInputOption=USER_ENTERED`, {
    method: "PUT",
    body: { majorDimension: "ROWS", values: [headers] },
  });
}

// Google Sheets helpers are only for durable business records and fallbacks.
async function appendRecordRow(sheetName, rowValues) {
  await ensureSheetHeaders(sheetName);
  const range = encodeURIComponent(`${sheetName}!A1`);
  const result = await callGoogleSheets(`/values/${range}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`, {
    method: "POST",
    body: { majorDimension: "ROWS", values: [rowValues] },
  });
  sheetRowsCache.delete(sheetName);
  return result;
}

async function getRecordRows(sheetName) {
  const cached = sheetRowsCache.get(sheetName);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.rows;
  }
  if (sheetRowsInFlight.has(sheetName)) {
    return sheetRowsInFlight.get(sheetName);
  }
  const request = (async () => {
    try {
      await ensureSheetHeaders(sheetName);
      const range = encodeURIComponent(`${sheetName}!A:Z`);
      let lastError = null;
      for (const delayMs of [0, 400, 1200]) {
        if (delayMs) {
          await new Promise((resolve) => setTimeout(resolve, delayMs));
        }
        try {
          const payload = await callGoogleSheets(`/values/${range}`);
          const rows = Array.isArray(payload.values) ? payload.values : [];
          sheetRowsCache.set(sheetName, {
            rows,
            expiresAt: Date.now() + SHEET_CACHE_TTL_MS,
          });
          return rows;
        } catch (error) {
          lastError = error;
          const message = String(error?.message || "");
          if (!/quota|rate|429/i.test(message)) {
            throw error;
          }
        }
      }
      if (cached?.rows?.length) {
        return cached.rows;
      }
      throw lastError || new Error("Failed to load sheet rows.");
    } finally {
      sheetRowsInFlight.delete(sheetName);
    }
  })();
  sheetRowsInFlight.set(sheetName, request);
  return request;
}

async function updateRecordRow(sheetName, rowNumber, rowValues) {
  await ensureSheetHeaders(sheetName);
  const endColumn = String.fromCharCode(64 + rowValues.length);
  const range = encodeURIComponent(`${sheetName}!A${rowNumber}:${endColumn}${rowNumber}`);
  const result = await callGoogleSheets(`/values/${range}?valueInputOption=USER_ENTERED`, {
    method: "PUT",
    body: { majorDimension: "ROWS", values: [rowValues] },
  });
  sheetRowsCache.delete(sheetName);
  return result;
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

const KNOWN_DELIVERY_METHODS = new Set(["Standard", "Lalamove", "Lalamove Self-Paid"]);
const KNOWN_ORDER_STATUSES = new Set([
  "Pending",
  "Pending Confirmation",
  "Awaiting Payment Verification",
  "Confirmed",
  "Preparing",
  "Out for Delivery",
  "Delivered",
  "Cancelled",
  "Completed",
  "Received",
  "Shipped",
]);

function looksLikeUrl(value) {
  return /^https?:\/\//i.test(String(value || "").trim());
}

function isLikelyTelegramFileId(value) {
  return /^(AgAC|CQAC|DQAC|BQAC|AAMCA)/.test(String(value || "").trim());
}

function normalizeLegacyOrderRecord(record) {
  const rawDeliveryMethod = String(record.delivery_method || "").trim();
  if (!rawDeliveryMethod || KNOWN_DELIVERY_METHODS.has(rawDeliveryMethod)) {
    return record;
  }
  return {
    ...record,
    delivery_method: "Standard",
    referral_code:
      !looksLikeUrl(rawDeliveryMethod) &&
      !KNOWN_ORDER_STATUSES.has(rawDeliveryMethod) &&
      !isLikelyTelegramFileId(rawDeliveryMethod)
        ? rawDeliveryMethod
        : "",
    payment_proof_file_id: String(record.referral_code || "").trim(),
    status: String(record.payment_proof_file_id || "").trim(),
    tracking_number: String(record.status || "").trim(),
  };
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

function firstNonEmptyString(...values) {
  for (const value of values) {
    const normalized = String(value || "").trim();
    if (normalized) {
      return normalized;
    }
  }
  return "";
}

function getNestedValue(source, path) {
  let current = source;
  for (const key of path) {
    if (!current || typeof current !== "object" || !(key in current)) {
      return "";
    }
    current = current[key];
  }
  return current;
}

function collectRetellDynamicContext(rawBody, body) {
  const candidates = [
    body?.dynamic,
    body?.metadata,
    body?.customer,
    rawBody?.dynamic,
    rawBody?.metadata,
    rawBody?.customer,
    rawBody?.args?.dynamic,
    rawBody?.args?.metadata,
    rawBody?.args?.customer,
    rawBody?.call?.metadata,
    rawBody?.call?.dynamic_variables,
    rawBody?.call?.retell_llm_dynamic_variables,
    rawBody?.call?.retell_llm_dynamic_variable_values,
    rawBody?.call?.variables,
    rawBody?._retell?.call?.metadata,
    rawBody?._retell?.call?.dynamic_variables,
    rawBody?._retell?.call?.retell_llm_dynamic_variables,
    rawBody?._retell?.call?.retell_llm_dynamic_variable_values,
  ].filter((value) => value && typeof value === "object");

  const merged = {};
  for (const candidate of candidates) {
    Object.assign(merged, candidate);
  }

  const nestedUserCandidates = [
    getNestedValue(rawBody, ["call", "metadata", "telegram_user"]),
    getNestedValue(rawBody, ["call", "metadata", "user"]),
    getNestedValue(rawBody, ["args", "metadata", "telegram_user"]),
    getNestedValue(rawBody, ["args", "metadata", "user"]),
    getNestedValue(rawBody, ["metadata", "telegram_user"]),
    getNestedValue(rawBody, ["metadata", "user"]),
    getNestedValue(body, ["metadata", "telegram_user"]),
    getNestedValue(body, ["metadata", "user"]),
  ].filter((value) => value && typeof value === "object");

  for (const candidate of nestedUserCandidates) {
    Object.assign(merged, candidate);
  }

  return merged;
}

function enrichBodyCustomer(rawBody, body) {
  const context = collectRetellDynamicContext(rawBody, body);
  const customer = body && typeof body.customer === "object" ? { ...body.customer } : {};
  const firstName = firstNonEmptyString(
    customer.first_name,
    customer.firstName,
    context.first_name,
    context.firstName
  );
  const lastName = firstNonEmptyString(
    customer.last_name,
    customer.lastName,
    context.last_name,
    context.lastName
  );
  const fullName = firstNonEmptyString(
    customer.name,
    customer.full_name,
    context.name,
    context.full_name,
    [firstName, lastName].filter(Boolean).join(" ").trim()
  );

  return {
    ...body,
    metadata: body && typeof body.metadata === "object" ? { ...context, ...body.metadata } : context,
    customer: {
      ...customer,
      telegram_user_id: firstNonEmptyString(
        customer.telegram_user_id,
        customer.telegram_id,
        context.telegram_user_id,
        context.telegram_id,
        context.user_id,
        context.id
      ),
      telegram_id: firstNonEmptyString(
        customer.telegram_id,
        customer.telegram_user_id,
        context.telegram_id,
        context.telegram_user_id,
        context.user_id,
        context.id
      ),
      username: firstNonEmptyString(
        customer.username,
        context.username,
        context.telegram_username
      ).replace(/^@/, ""),
      name: fullName,
      full_name: fullName,
      first_name: firstName,
      last_name: lastName,
      telegram_init_data: firstNonEmptyString(
        customer.telegram_init_data,
        context.telegram_init_data,
        context.initData
      ),
    },
  };
}

function getTelegramId(customer) {
  return String(customer.telegram_id || customer.telegram_user_id || customer.username || "")
    .trim()
    .replace(/^@/, "");
}

function resolveSupportContact(customer = {}, details = {}) {
  const requestedChannel = String(details.contact_channel || details.channel || "").trim().toLowerCase();
  const requestedValue = String(details.contact_value || details.contact_id || details.contact_number || "").trim();
  const inferredTelegram = getTelegramId(customer);

  if (requestedChannel === "telegram") {
    return {
      contact_channel: "telegram",
      contact_value: requestedValue || inferredTelegram,
    };
  }
  if (requestedChannel === "viber" || requestedChannel === "whatsapp") {
    return {
      contact_channel: requestedChannel,
      contact_value: requestedValue,
    };
  }
  if (requestedValue) {
    return {
      contact_channel: requestedChannel || "telegram",
      contact_value: requestedValue,
    };
  }
  if (inferredTelegram) {
    return {
      contact_channel: "telegram",
      contact_value: inferredTelegram,
    };
  }
  return {
    contact_channel: requestedChannel,
    contact_value: "",
  };
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

function getCartSessionKeys(body) {
  const customer = body?.customer || {};
  const telegramId = getTelegramId(customer);
  const retellKey = getRetellCallKey(body);
  const keys = [];
  if (retellKey) {
    keys.push(`retell:${retellKey}`);
  }
  if (telegramId) {
    keys.push(`tg:${telegramId}`);
  }
  return keys;
}

function getPrimaryCartSessionKey(body) {
  return getCartSessionKeys(body)[0] || "";
}

async function writeCartSession(body, items) {
  const keys = getCartSessionKeys(body);
  if (!Array.isArray(items) || !items.length) {
    return;
  }
  const session = {
    items: items.map((item) => ({ sku: String(item.sku || ""), qty: Number(item.qty || 0) })).filter((item) => item.sku && item.qty > 0),
    expiresAt: Date.now() + CART_SESSION_TTL_MS,
  };
  for (const key of keys) {
    cartSessions.set(key, session);
  }
  if (keys.length) {
    await persistCartSession(body, session.items, keys);
  }
}

async function readCartSession(body) {
  const keys = getCartSessionKeys(body);
  let session = null;
  for (const key of keys) {
    session = cartSessions.get(key);
    if (session) {
      break;
    }
  }
  if (!session && keys.length) {
    const persistedItems = await readPersistedCartSession(body, keys);
    if (persistedItems.length) {
      session = {
        items: persistedItems,
        expiresAt: Date.now() + CART_SESSION_TTL_MS,
      };
      for (const key of keys) {
        cartSessions.set(key, session);
      }
    }
  }
  if (!session) {
    return [];
  }
  if (session.expiresAt <= Date.now()) {
    for (const key of keys) {
      cartSessions.delete(key);
    }
    return [];
  }
  return Array.isArray(session.items) ? session.items : [];
}

async function resolveCartItems(body) {
  const directItems = Array.isArray(body.cart?.items) ? body.cart.items : [];
  if (directItems.length) {
    await writeCartSession(body, directItems);
    return directItems;
  }
  return readCartSession(body);
}

function getMissingQuoteFields(checkout) {
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

function getMissingSubmitFields(checkout) {
  const fields = [
    ["delivery_area", "delivery area"],
    ["delivery_name", "delivery name"],
    ["delivery_address", "delivery address"],
    ["delivery_contact", "delivery contact number"],
    ["payment_method", "payment method"],
  ];
  return fields
    .filter(([key]) => !String(checkout?.[key] || "").trim())
    .map(([key, label]) => ({ key, label }));
}

function normalizePaymentMethod(paymentMethod) {
  const raw = String(paymentMethod || "").trim().toLowerCase();
  if (!raw) {
    return "";
  }
  if (raw.includes("cash") || raw === "cod") {
    return "Cash on Delivery";
  }
  if (raw.includes("bank")) {
    return "Bank Transfer";
  }
  if (raw.includes("wallet") || raw.includes("gcash") || raw.includes("maya") || raw.includes("vybe")) {
    return "E-Wallet";
  }
  return String(paymentMethod || "").trim();
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

function normalizePhone(value) {
  return String(value || "").replace(/\D/g, "");
}

function normalizeLalamovePhone(value, market = "PH") {
  const raw = String(value || "").trim();
  if (!raw) {
    return "";
  }
  const normalizedMarket = String(market || "PH").trim().toUpperCase();
  if (/^\+[1-9]\d{1,14}$/.test(raw)) {
    return raw;
  }
  const digits = raw.replace(/\D/g, "");
  if (!digits) {
    return "";
  }
  if (normalizedMarket === "PH") {
    if (digits.startsWith("63") && digits.length >= 12) {
      return `+${digits}`;
    }
    if (digits.startsWith("0") && digits.length === 11) {
      return `+63${digits.slice(1)}`;
    }
    if (digits.startsWith("9") && digits.length === 10) {
      return `+63${digits}`;
    }
  }
  return digits.startsWith("+") ? digits : `+${digits}`;
}

function sanitizeLalamoveText(value, fallback, maxLength = 1500) {
  const normalized = String(value || fallback || "").replace(/\s+/g, " ").trim();
  if (!normalized) {
    return String(fallback || "").trim();
  }
  return normalized.slice(0, maxLength);
}

function parseEnvList(value) {
  return String(value || "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function buildLalamoveItemDetails(items = []) {
  const normalizedItems = Array.isArray(items) ? items : [];
  const quantity = normalizedItems.reduce((sum, item) => sum + Number(item?.qty || 0), 0) || 1;
  const categories = ["OTHERS"];
  const names = normalizedItems
    .map((item) => sanitizeLalamoveText(item?.name, "", 40))
    .filter(Boolean)
    .slice(0, 4);
  const handlingInstructions = parseEnvList(process.env.POPPERS_LALAMOVE_HANDLING_INSTRUCTIONS);
  return {
    quantity: String(quantity),
    weight: String(process.env.POPPERS_LALAMOVE_ITEM_WEIGHT || "LESS_THAN_3KG").trim(),
    categories,
    handlingInstructions,
    names,
  };
}

function extractLalamoveErrorMessage(payload, status) {
  if (!payload) {
    return `Lalamove request failed with status ${status}`;
  }
  const candidates = [
    payload.message,
    payload.error,
    payload.raw,
    payload.data?.message,
    payload.data?.error,
    payload.data?.reason,
    payload.data?.errorMessage,
    payload.data?.details,
  ];
  for (const candidate of candidates) {
    const text = String(candidate || "").trim();
    if (text) {
      return text;
    }
  }
  if (Array.isArray(payload.errors) && payload.errors.length) {
    return payload.errors
      .map((entry) => String(entry?.message || entry?.reason || entry?.code || "").trim())
      .filter(Boolean)
      .join("; ");
  }
  return `Lalamove request failed with status ${status}`;
}

function summarizeLalamoveErrorDetails(payload) {
  if (!payload || typeof payload !== "object") {
    return "";
  }
  const parts = [];
  const rootCode = String(payload.code || payload.errorCode || "").trim();
  const rootMessage = String(payload.message || payload.error || "").trim();
  if (rootCode) {
    parts.push(`code=${rootCode}`);
  }
  if (rootMessage) {
    parts.push(`message=${rootMessage}`);
  }
  if (Array.isArray(payload.errors) && payload.errors.length) {
    const errors = payload.errors
      .map((entry) =>
        [entry?.code, entry?.message, entry?.reason]
          .map((value) => String(value || "").trim())
          .filter(Boolean)
          .join(": ")
      )
      .filter(Boolean)
      .join(" | ");
    if (errors) {
      parts.push(`errors=${errors}`);
    }
  }
  if (payload.data && typeof payload.data === "object") {
    const dataCode = String(payload.data.code || payload.data.errorCode || "").trim();
    const dataMessage = String(
      payload.data.message || payload.data.error || payload.data.reason || payload.data.errorMessage || ""
    ).trim();
    if (dataCode) {
      parts.push(`data.code=${dataCode}`);
    }
    if (dataMessage) {
      parts.push(`data.message=${dataMessage}`);
    }
  }
  const summary = parts.join("; ");
  return summary.slice(0, 800);
}

function parseOrderCreatedAt(order) {
  const timestamp = Date.parse(String(order.created_at || "").trim());
  return Number.isFinite(timestamp) ? timestamp : 0;
}

async function hasRepeatBuyerHistory(customer = {}, checkout = {}) {
  const rows = await getRecordRows("Orders").catch(() => [ORDER_HEADERS]);
  const records = mapSheetRows(rows).map(normalizeLegacyOrderRecord);
  const keys = new Set(getOrderFollowUpKeys(customer));
  const phone = normalizePhone(checkout.delivery_contact || customer.delivery_contact);
  if (!keys.size && !phone) {
    return false;
  }
  return records.some((record) => {
    const userId = String(record.user_id || "").trim().replace(/^@/, "");
    const username = String(record.username || "").trim().replace(/^@/, "");
    const recordPhone = normalizePhone(record.delivery_contact || "");
    return keys.has(userId) || keys.has(username) || (phone && phone === recordPhone);
  });
}

async function findOrderRecord(orderId, customer, orderSearch = {}) {
  const rows = await getRecordRows("Orders").catch(() => [ORDER_HEADERS]);
  const records = mapSheetRows(rows).map(normalizeLegacyOrderRecord);
  const normalizedOrderId = String(orderId || "").trim().toUpperCase();
  if (normalizedOrderId) {
    return (
      records.find((record) => String(record.order_id || "").trim().toUpperCase() === normalizedOrderId) || null
    );
  }

  const keys = getOrderFollowUpKeys(customer);
  const searchUsername = String(
    orderSearch.telegram_username || orderSearch.username || customer.username || ""
  )
    .trim()
    .replace(/^@/, "");
  const searchPhone = normalizePhone(orderSearch.phone || orderSearch.delivery_contact || customer.delivery_contact);
  if (!keys.length && !searchUsername && !searchPhone) {
    return null;
  }

  const matching = records.filter((record) => {
    const userId = String(record.user_id || "").trim().replace(/^@/, "");
    const username = String(record.username || "").trim().replace(/^@/, "");
    const phone = normalizePhone(record.delivery_contact || "");
    return (
      keys.includes(userId) ||
      keys.includes(username) ||
      (searchUsername && username === searchUsername) ||
      (searchPhone && phone === searchPhone)
    );
  });

  if (!matching.length) {
    return null;
  }

  matching.sort((left, right) => parseOrderCreatedAt(right) - parseOrderCreatedAt(left));
  return matching[0];
}

async function upsertUserDeliveryRecord(customer, checkout) {
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

  const rows = await getRecordRows("Users").catch(() => [USER_HEADERS]);
  const existingIndex = rows.slice(1).findIndex((row) => String(row?.[0] || "").trim() === userId);
  if (existingIndex >= 0) {
    await updateRecordRow("Users", existingIndex + 2, rowValues);
    return;
  }
  await appendRecordRow("Users", rowValues);
}

async function findUserDeliveryRecord(customer = {}) {
  const rows = await getRecordRows("Users").catch(() => [USER_HEADERS]);
  const records = mapSheetRows(rows);
  const numericTelegramId = getNumericTelegramUserId(customer);
  const anyTelegramId = getTelegramId(customer);
  const username = getTelegramUsername(customer);

  let match = null;
  if (numericTelegramId) {
    match = records.find((record) => String(record.user_id || "").trim() === numericTelegramId);
  }
  if (!match && anyTelegramId) {
    match = records.find((record) => String(record.user_id || "").trim() === anyTelegramId);
  }
  if (!match && username) {
    match = records.find((record) => String(record.username || "").trim().replace(/^@/, "") === username);
  }
  return match || null;
}

async function handleGetSavedDelivery(body) {
  const customer = body.customer || {};
  const record = await findUserDeliveryRecord(customer);
  if (!record) {
    return {
      ok: false,
      action: "get_saved_delivery",
      error_code: "DELIVERY_RECORD_NOT_FOUND",
      message: "No saved delivery details were found for this Telegram account.",
    };
  }
  return {
    ok: true,
    action: "get_saved_delivery",
    message: "Saved delivery details loaded successfully.",
    data: {
      user_id: String(record.user_id || "").trim(),
      username: String(record.username || "").trim().replace(/^@/, ""),
      full_name: String(record.full_name || "").trim(),
      delivery_name: String(record.last_delivery_name || "").trim(),
      delivery_address: String(record.last_delivery_address || "").trim(),
      delivery_contact: String(record.last_delivery_contact || "").trim(),
      delivery_area: String(record.last_delivery_area || "").trim(),
      updated_at: String(record.updated_at || "").trim(),
    },
  };
}

async function logOrderRecord(order) {
  await appendRecordRow("Orders", [
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
    order.delivery_method || "Standard",
    order.referral_code || "",
    order.payment_proof_file_id,
    order.status,
    order.tracking_number || "",
    JSON.stringify(order.order_photo_file_ids || []),
  ]);
}

function parsePhotoFileIds(value) {
  try {
    const parsed = JSON.parse(String(value || "[]"));
    return Array.isArray(parsed) ? parsed.map((item) => String(item || "").trim()).filter(Boolean) : [];
  } catch (_) {
    return [];
  }
}

function extractLalamoveTrackingLink(payload) {
  const candidates = [
    payload?.data?.shareLink,
    payload?.data?.trackingUrl,
    payload?.data?.webLink,
    payload?.shareLink,
    payload?.trackingUrl,
    payload?.webLink,
  ];
  return candidates.map((value) => String(value || "").trim()).find((value) => /^https?:\/\//i.test(value)) || "";
}

async function getLalamoveTrackingLink(orderId) {
  if (!orderId) {
    return "";
  }
  const result = await handleLalamoveOrderDetails({
    lalamove: {
      market: "PH",
      orderId,
    },
  });
  if (!result?.ok) {
    return "";
  }
  return extractLalamoveTrackingLink(result.data);
}

async function logTicketRecord(ticketType, customer, message) {
  const ticketId = randomUUID().slice(0, 8);
  await appendRecordRow("Tickets", [
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

async function logAffiliateRecord(customer, affiliate) {
  await appendRecordRow("Affiliates", [
    nowIso(),
    getNumericTelegramUserId(customer) || getTelegramId(customer),
    getTelegramUsername(customer),
    affiliate.handle || "",
    affiliate.email || "",
    affiliate.contact || "",
    affiliate.subscriber_count || "",
  ]);
}

// Cart/session persistence uses Redis first, then optional API, then Sheets fallback.
async function persistCartSessionToSheetsFallback(sessionKey, items) {
  const rowValues = [sessionKey, JSON.stringify(items || []), nowIso()];
  const rows = await getRecordRows("CartSessions").catch(() => [CART_SESSION_HEADERS]);
  const records = mapSheetRows(rows);
  const existingIndex = records.findIndex((record) => String(record.session_key || "").trim() === sessionKey);
  if (existingIndex >= 0) {
    await updateRecordRow("CartSessions", existingIndex + 2, rowValues);
    return;
  }
  await appendRecordRow("CartSessions", rowValues);
}

async function readCartSessionFromSheetsFallback(sessionKey) {
  const rows = await getRecordRows("CartSessions").catch(() => [CART_SESSION_HEADERS]);
  const records = mapSheetRows(rows);
  const record = records.find((entry) => String(entry.session_key || "").trim() === sessionKey);
  if (!record) {
    return [];
  }
  try {
    const items = JSON.parse(String(record.items_json || "[]"));
    return Array.isArray(items) ? items : [];
  } catch (_) {
    return [];
  }
}

function getCartSessionApiConfig() {
  const url = String(process.env.POPPERS_CART_SESSION_API_URL || DEFAULT_CART_SESSION_API_URL).trim().replace(/\/$/, "");
  const token = String(process.env.POPPERS_CART_SESSION_API_TOKEN || "").trim();
  return { url, token };
}

async function persistCartSessionToApi(sessionKey, items) {
  const { url, token } = getCartSessionApiConfig();
  if (!url || !sessionKey) {
    return false;
  }
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({
      session_key: sessionKey,
      items: items || [],
      ttl_seconds: Math.floor(CART_SESSION_TTL_MS / 1000),
    }),
  });
  if (!response.ok) {
    throw new Error(`Cart session API write failed with status ${response.status}`);
  }
  return true;
}

async function readCartSessionFromApi(sessionKey) {
  const { url, token } = getCartSessionApiConfig();
  if (!url || !sessionKey) {
    return [];
  }
  const response = await fetch(`${url}/${encodeURIComponent(sessionKey)}`, {
    headers: {
      Accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (response.status === 404) {
    return [];
  }
  if (!response.ok) {
    throw new Error(`Cart session API read failed with status ${response.status}`);
  }
  const payload = await response.json();
  return Array.isArray(payload?.data?.items) ? payload.data.items : [];
}

async function persistCartSession(body, items, keys = getCartSessionKeys(body)) {
  for (const key of keys) {
    try {
      const written = await persistCartSessionToRedis(key, items);
      if (written) {
        continue;
      }
    } catch (_) {
      // Fall through to the other stores.
    }
    try {
      const written = await persistCartSessionToApi(key, items);
      if (written) {
        continue;
      }
    } catch (error) {
      // Fall through to the sheet-based fallback.
    }
    await upsertCartSessionToSheets(key, items);
  }
}

async function readPersistedCartSession(body, keys = getCartSessionKeys(body)) {
  for (const key of keys) {
    try {
      const redisItems = await readCartSessionFromRedis(key);
      if (redisItems.length) {
        return redisItems;
      }
    } catch (_) {
      // Fall through to other stores.
    }
    try {
      const apiItems = await readCartSessionFromApi(key);
      if (apiItems.length) {
        return apiItems;
      }
    } catch (_) {
      // Fall through to sheet-based lookup.
    }
    const sheetItems = await readCartSessionFromSheets(key);
    if (sheetItems.length) {
      return sheetItems;
    }
  }
  return [];
}

async function fetchCatalog(body = {}) {
  const storeConfig = getStoreConfig(body);
  const url = process.env[storeConfig.catalogUrlEnv] || storeConfig.defaultCatalogUrl;
  try {
    const response = await fetch(url, {
      headers: { Accept: "application/json" },
    });
    if (!response.ok) {
      throw new Error(`Catalog request failed with status ${response.status}`);
    }
    const payload = await response.json();
    const products = Array.isArray(payload.products) ? payload.products : [];
    const categories = Array.isArray(payload.categories) ? payload.categories : [];
    if (products.length) {
      return { products, categories };
    }
  } catch (_) {
    // Fall back to the store-specific Products sheet so checkout keeps working if the external catalog is down.
  }

  const spreadsheetId = getStoreSpreadsheetId(storeConfig);
  const accessToken = await getGoogleAccessToken();
  const range = encodeURIComponent("Products!A:Z");
  const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error?.message || `Failed to load ${storeConfig.slug} products sheet`);
  }
  const rows = Array.isArray(payload.values) ? payload.values : [];
  const records = mapSheetRows(rows);
  const products = records
    .map((record) => ({
      sku: String(record.sku || "").trim(),
      category: String(record.category || "").trim(),
      name: String(record.name || "").trim(),
      description: String(record.description || "").trim(),
      price: parseMoney(record.price),
      image_url: String(record.image_url || "").trim(),
      active: normalizeActiveFlag(record.active),
      stock: Number(record.stock || 0),
    }))
    .filter((product) => product.sku && product.active);
  const categories = Array.from(
    new Set(products.map((product) => String(product.category || "").trim()).filter(Boolean))
  );
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
  const rawPromo = String(promoCode || "").trim();
  if (/[,\s/+|&]/.test(rawPromo.replace(/^@/, "")) && rawPromo.trim().split(/[,\s/+|&]+/).filter(Boolean).length > 1) {
    return {
      promo_code: rawPromo,
      promo_discount: 0,
      promo_applied: false,
      promo_warning: "Only one promo code can be used per order.",
      promo_rejected_multiple: true,
    };
  }
  const code = normalizePromoCode(rawPromo);
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

function getRewardIdentityKeys(customer = {}) {
  return [
    String(customer.telegram_user_id || "").trim().replace(/^@/, ""),
    String(customer.telegram_id || "").trim().replace(/^@/, ""),
    String(customer.customer_id || "").trim().replace(/^@/, ""),
    String(customer.username || "").trim().replace(/^@/, ""),
  ].filter(Boolean);
}

function getStoreConfig(body = {}) {
  const requested = String(body?.store || body?.customer?.store || "").trim().toLowerCase();
  return STORE_CONFIGS[requested] || STORE_CONFIGS.poppers;
}

function buildStoreTrackingUrl(storeConfig, orderId = "") {
  const base = String(storeConfig?.publicBaseUrl || STORE_CONFIGS.poppers.publicBaseUrl).replace(/\/+$/, "");
  return `${base}/${storeConfig.slug}/track?order_id=${encodeURIComponent(String(orderId || "").trim())}`;
}

function getStoreSpreadsheetId(storeConfig = STORE_CONFIGS.poppers) {
  const envName = String(storeConfig?.sheetIdEnv || "GSHEET_ID").trim();
  const fallback = String(storeConfig?.defaultSheetId || DEFAULT_GSHEET_ID).trim();
  return String(process.env[envName] || process.env.GSHEET_ID || fallback).trim();
}

function makeReferralCodesForIdentity(userId = "", username = "", storeConfig = STORE_CONFIGS.poppers) {
  const codes = new Set();
  const normalizedUsername = String(username || "").trim().replace(/^@/, "");
  const normalizedUserId = String(userId || "").trim().replace(/^@/, "");
  const prefixes =
    Array.isArray(storeConfig?.referralPrefixes) && storeConfig.referralPrefixes.length
      ? storeConfig.referralPrefixes
      : ["PGPH"];
  if (normalizedUsername) {
    const sanitized = normalizedUsername.replace(/[^a-z0-9]/gi, "").toUpperCase().slice(0, 10);
    if (sanitized) {
      for (const prefix of prefixes) {
        codes.add(`${prefix}-${sanitized}`);
      }
    }
  }
  if (normalizedUserId) {
    for (const prefix of prefixes) {
      codes.add(`${prefix}-${normalizedUserId.replace(/\D/g, "").slice(-6)}`);
    }
  }
  return Array.from(codes).filter(Boolean);
}

async function getRewardEvents() {
  const rows = await getRecordRows("Rewards").catch(() => [REWARD_HEADERS]);
  return mapSheetRows(rows);
}

async function getLoyaltyBalance(customer) {
  const rewardEvents = await getRewardEvents().catch(() => []);
  const keys = new Set(getRewardIdentityKeys(customer));
  let balance = 0;
  for (const event of rewardEvents) {
    const eventUserId = String(event.user_id || "").trim().replace(/^@/, "");
    const eventUsername = String(event.username || "").trim().replace(/^@/, "");
    if (keys.has(eventUserId) || (eventUsername && keys.has(eventUsername))) {
      balance += Number(event.points_delta || 0);
    }
  }
  if (balance) {
    return balance;
  }
  const balances = parseJsonEnv("POPPERS_LOYALTY_BALANCES_JSON", {});
  for (const key of keys) {
    const value = balances[String(key)];
    if (value !== undefined) {
      return Number(value || 0);
    }
  }
  return 0;
}

async function appendRewardEvent({
  customer = {},
  orderId = "",
  type = "",
  pointsDelta = 0,
  message = "",
  meta = {},
}) {
  const eventId = `RW-${randomUUID().slice(0, 8).toUpperCase()}`;
  await appendRecordRow("Rewards", [
    eventId,
    nowIso(),
    String(customer.telegram_user_id || customer.telegram_id || customer.customer_id || "").trim().replace(/^@/, ""),
    String(customer.username || "").trim().replace(/^@/, ""),
    String(orderId || "").trim(),
    String(type || "").trim(),
    Number(pointsDelta || 0),
    String(message || "").trim(),
    compactJsonStringify(meta || {}),
  ]);
  return eventId;
}

async function findReferrerByReferralCode(referralCode) {
  const normalizedCode = normalizePromoCode(referralCode);
  if (!normalizedCode || normalizedCode === "NONE") {
    return null;
  }
  const rows = await getRecordRows("Users").catch(() => [USER_HEADERS]);
  const users = mapSheetRows(rows);
  for (const user of users) {
    const codes = makeReferralCodesForIdentity(user.user_id, user.username, STORE_CONFIGS.delu);
    if (codes.includes(normalizedCode)) {
      return {
        telegram_user_id: String(user.user_id || "").trim(),
        telegram_id: String(user.user_id || "").trim(),
        username: String(user.username || "").trim().replace(/^@/, ""),
        name: String(user.full_name || "").trim(),
      };
    }
  }
  return null;
}

async function settleCompletedOrderRewards(order) {
  const normalizedStatus = String(order.status || "").trim();
  if (!REWARD_COMPLETION_STATUSES.has(normalizedStatus)) {
    return null;
  }

  const rewardEvents = await getRewardEvents();
  const completionExists = rewardEvents.some(
    (event) =>
      String(event.order_id || "").trim().toUpperCase() === String(order.order_id || "").trim().toUpperCase() &&
      String(event.type || "").trim() === "completed_order"
  );

  const summary = {
    completed_order_points_awarded: 0,
    referral_points_awarded: 0,
    points_used_on_order: Number(order.reward_points_used || 0),
    discount_used_on_order: Number(order.reward_discount || 0),
    balance_after: 0,
    referral_code_used: String(order.referral_code || "").trim().toUpperCase(),
  };

  if (!completionExists) {
    const customerIdentity = {
      telegram_user_id: String(order.user_id || "").trim(),
      telegram_id: String(order.user_id || "").trim(),
      username: String(order.username || "").trim().replace(/^@/, ""),
      customer_id: String(order.customer_id || "").trim(),
    };
    await appendRewardEvent({
      customer: customerIdentity,
      orderId: order.order_id,
      type: "completed_order",
      pointsDelta: LOYALTY_POINTS_PER_ORDER,
      message: `Completed order points for ${order.order_id}`,
      meta: { status: normalizedStatus },
    });
    summary.completed_order_points_awarded = LOYALTY_POINTS_PER_ORDER;

    const referrer = await findReferrerByReferralCode(order.referral_code);
    const selfKeys = new Set(
      [customerIdentity.telegram_user_id, customerIdentity.username].map((value) => String(value || "").trim().replace(/^@/, "")).filter(Boolean)
    );
    const referrerKey = String(referrer?.telegram_user_id || referrer?.username || "").trim().replace(/^@/, "");
    const referralAlreadyAwarded = rewardEvents.some(
      (event) =>
        String(event.order_id || "").trim().toUpperCase() === String(order.order_id || "").trim().toUpperCase() &&
        String(event.type || "").trim() === "referral_success"
    );
    if (referrer && referrerKey && !selfKeys.has(referrerKey) && !referralAlreadyAwarded) {
      await appendRewardEvent({
        customer: referrer,
        orderId: order.order_id,
        type: "referral_success",
        pointsDelta: REFERRAL_SUCCESS_POINTS,
        message: `Referral points from ${order.order_id}`,
        meta: {
          referred_username: customerIdentity.username,
          referral_code: String(order.referral_code || "").trim().toUpperCase(),
        },
      });
      summary.referral_points_awarded = REFERRAL_SUCCESS_POINTS;
    }
  }

  const currentBalance = await getLoyaltyBalance({
    telegram_user_id: String(order.user_id || "").trim(),
    telegram_id: String(order.user_id || "").trim(),
    customer_id: String(order.customer_id || "").trim(),
    username: String(order.username || "").trim().replace(/^@/, ""),
  });
  summary.balance_after = currentBalance;
  return summary;
}

function parseMoney(value) {
  const amount = Number(value || 0);
  return Number.isFinite(amount) ? Number(amount.toFixed(2)) : 0;
}

function computeTotals(subtotal, discount, deliveryArea, paymentMethod) {
  const shippingBase = deliveryArea === "Outside Metro Manila" ? SHIPPING_PROVINCIAL : 0;
  const codFee = paymentMethod === "Cash on Delivery" ? COD_FEE : 0;
  const deliveryFee = 0;
  const shipping = shippingBase;
  const total = Math.max(subtotal - discount, 0) + shipping + codFee;
  return {
    shipping_base: Number(shippingBase.toFixed(2)),
    delivery_fee: deliveryFee,
    cod_fee: Number(codFee.toFixed(2)),
    shipping: Number((shipping + codFee).toFixed(2)),
    total: Number(total.toFixed(2)),
  };
}

function getCheckoutDeliveryMethod(checkout) {
  const method = String(checkout?.delivery_method || "").trim().toLowerCase();
  if (method === "lalamove self-paid" || method === "i will pay lalamove") {
    return "Lalamove Self-Paid";
  }
  if (method === "lalamove" || method === "same-day lalamove" || method === "pay lalamove with bill") {
    return "Lalamove";
  }
  return "Standard";
}

async function getLalamovePickupConfig(pickupPointId = "jay") {
  const selectedId = String(pickupPointId || "jay").trim().toLowerCase();
  const source = LALAMOVE_PICKUP_POINTS[selectedId] || LALAMOVE_PICKUP_POINTS.jay;
  const address =
    source.id === "jay"
      ? String(process.env.POPPERS_LALAMOVE_PICKUP_ADDRESS || source.address).trim()
      : String(source.address || "").trim();
  const name =
    source.id === "jay"
      ? String(process.env.POPPERS_LALAMOVE_PICKUP_NAME || source.name).trim()
      : String(source.name || "").trim();
  const phone =
    source.id === "jay"
      ? String(process.env.POPPERS_LALAMOVE_PICKUP_PHONE || source.phone).trim()
      : String(source.phone || "").trim();
  let lat =
    source.id === "jay"
      ? String(process.env.POPPERS_LALAMOVE_PICKUP_LAT || source.lat).trim()
      : String(source.lat || "").trim();
  let lng =
    source.id === "jay"
      ? String(process.env.POPPERS_LALAMOVE_PICKUP_LNG || source.lng).trim()
      : String(source.lng || "").trim();

  if (!address) {
    return null;
  }
  if (!lat || !lng) {
    const coords = await geocodeAddress(address);
    lat = coords.lat;
    lng = coords.lng;
  }
  return {
    id: source.id,
    label: source.label,
    address,
    coordinates: { lat, lng },
    name,
    phone,
  };
}

async function geocodeAddress(address) {
  const query = String(address || "").trim();
  if (!query) {
    throw new Error("Delivery address is required for Lalamove quoting.");
  }
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("limit", "1");
  url.searchParams.set("q", query);
  const response = await fetch(url.toString(), {
    headers: {
      Accept: "application/json",
      "User-Agent": "PoppersGuyPH/1.0 (checkout geocoding)",
    },
  });
  const data = await response.json();
  const first = Array.isArray(data) ? data[0] : null;
  if (!response.ok || !first?.lat || !first?.lon) {
    throw new Error("Could not geocode the delivery address for Lalamove.");
  }
  return {
    lat: String(first.lat),
    lng: String(first.lon),
  };
}

async function getCheckoutLalamoveQuote(checkout, cart, options = {}) {
  if (String(checkout?.delivery_area || "").trim().toLowerCase() !== "metro manila") {
    return null;
  }
  if (getCheckoutDeliveryMethod(checkout) !== "Lalamove") {
    return null;
  }
  try {
    const pickup = await getLalamovePickupConfig(options.pickup_point || checkout?.pickup_point || "jay");
    if (!pickup) {
      return {
        ok: false,
        warning: "Same-day delivery is not configured yet.",
      };
    }
    const recipientCoords = await geocodeAddress(checkout.delivery_address);
    const configuredServiceType = String(
      process.env.POPPERS_LALAMOVE_SERVICE_TYPE || DEFAULT_LALAMOVE_SERVICE_TYPE
    )
      .trim()
      .toUpperCase();
    const itemDetails = buildLalamoveItemDetails(cart.items || []);
    const specialRequests = parseEnvList(process.env.POPPERS_LALAMOVE_SPECIAL_REQUESTS);
    const buildBody = (serviceType) => ({
      lalamove: {
        market: "PH",
        serviceType,
        language: "en_PH",
        stops: [
          {
            coordinates: pickup.coordinates,
            address: pickup.address,
          },
          {
            coordinates: recipientCoords,
            address: checkout.delivery_address,
          },
        ],
        item: {
          quantity: itemDetails.quantity,
          weight: itemDetails.weight,
          categories: itemDetails.categories,
          ...(itemDetails.handlingInstructions.length
            ? { handlingInstructions: itemDetails.handlingInstructions }
            : {}),
        },
        ...(specialRequests.length ? { specialRequests } : {}),
        isRouteOptimized: false,
      },
    });
    let result = await handleLalamoveQuote(buildBody(configuredServiceType));
    if (
      !result.ok &&
      String(result.message || "").includes("ERR_INVALID_SERVICE_TYPE") &&
      configuredServiceType !== DEFAULT_LALAMOVE_SERVICE_TYPE
    ) {
      result = await handleLalamoveQuote(buildBody(DEFAULT_LALAMOVE_SERVICE_TYPE));
    }
    if (!result.ok) {
      return {
        ok: false,
        warning: result.message || "Same-day delivery quote failed.",
        error_code: result.error_code || "LALAMOVE_QUOTE_FAILED",
        data: result.data || null,
      };
    }
    return {
      ok: true,
      quotation_id: String(result.data?.data?.quotationId || result.data?.quotationId || "").trim(),
      quoted_total: parseMoney(result.data?.quoted_total || 0),
      currency:
        String(result.data?.data?.priceBreakdown?.currency || result.data?.priceBreakdown?.currency || "PHP").trim() ||
        "PHP",
      stops: result.data?.data?.stops || result.data?.stops || [],
      expires_at: String(result.data?.data?.expiresAt || result.data?.expiresAt || "").trim(),
      price_breakdown: result.data?.data?.priceBreakdown || result.data?.priceBreakdown || null,
      distance: result.data?.data?.distance || result.data?.distance || null,
      special_requests: result.data?.data?.specialRequests || specialRequests,
      service_type: String(result.data?.data?.serviceType || configuredServiceType).trim(),
      item: itemDetails,
      pickup,
    };
  } catch (error) {
    return {
      ok: false,
      warning: error instanceof Error ? error.message : "Same-day delivery quote failed.",
      error_code: "LALAMOVE_QUOTE_FAILED",
    };
  }
}

async function placeCheckoutLalamoveOrder(quote, checkout, orderId) {
  if (!quote?.lalamove?.quotation_id || !Array.isArray(quote.lalamove.stops) || quote.lalamove.stops.length < 2) {
    return {
      ok: false,
      message: "Lalamove quotation details are missing.",
      error_code: "LALAMOVE_QUOTE_MISSING",
    };
  }
  const senderStop = quote.lalamove.stops[0];
  const recipientStop = quote.lalamove.stops[1];
  const senderPhone = normalizeLalamovePhone(quote.lalamove.pickup?.phone || "09088960308", "PH");
  const recipientPhone = normalizeLalamovePhone(checkout.delivery_contact, "PH");
  const itemDetails = buildLalamoveItemDetails(quote.items || []);
  const itemSummary = itemDetails.names.length ? itemDetails.names.join(", ") : "store order";
  if (!senderPhone || !recipientPhone) {
    return {
      ok: false,
      message: "A valid pickup and delivery contact number is required for Lalamove.",
      error_code: "LALAMOVE_INVALID_PHONE",
    };
  }
  const result = await handleLalamovePlaceOrder({
    lalamove: {
      market: "PH",
      quotationId: quote.lalamove.quotation_id,
      sender: {
        stopId: senderStop.stopId,
        name: sanitizeLalamoveText(quote.lalamove.pickup?.name, "PoppersGuyPH", 100),
        phone: senderPhone,
      },
      recipients: [
        {
          stopId: recipientStop.stopId,
          name: sanitizeLalamoveText(checkout.delivery_name, "Customer", 100),
          phone: recipientPhone,
          remarks: sanitizeLalamoveText(
            [`Order ${orderId}`, itemSummary, checkout.delivery_address].filter(Boolean).join(" | "),
            `Order ${orderId}`,
            300
          ),
        },
      ],
      isPODEnabled: String(process.env.POPPERS_LALAMOVE_ENABLE_POD || "true").trim().toLowerCase() !== "false",
      ...(String(process.env.POPPERS_LALAMOVE_PARTNER || "").trim()
        ? { partner: String(process.env.POPPERS_LALAMOVE_PARTNER || "").trim() }
        : {}),
      metadata: {
        storefrontOrderId: String(orderId || "").trim(),
        deliveryAddress: sanitizeLalamoveText(checkout.delivery_address, "", 250),
        deliveryArea: sanitizeLalamoveText(checkout.delivery_area, "", 80),
        paymentMethod: sanitizeLalamoveText(checkout.payment_method, "", 60),
        items: itemSummary,
      },
    },
  });
  if (!result.ok) {
    return {
      ok: false,
      message: result.message || "Lalamove booking failed.",
      error_code: result.error_code || "LALAMOVE_BOOKING_FAILED",
      data: result.data,
      debug: summarizeLalamoveErrorDetails(result.data),
    };
  }
  return {
    ok: true,
    order_id: String(result.data?.data?.orderId || result.data?.orderId || "").trim(),
    quotation_id: String(result.data?.data?.quotationId || result.data?.quotationId || "").trim(),
    share_link: extractLalamoveTrackingLink(result.data),
    status: String(result.data?.data?.status || result.data?.status || "").trim(),
    driver_id: String(result.data?.data?.driverId || result.data?.driverId || "").trim(),
    price_breakdown: result.data?.data?.priceBreakdown || result.data?.priceBreakdown || null,
    distance: result.data?.data?.distance || result.data?.distance || null,
    raw: result.data,
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
  try {
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
      return {
        ok: false,
        status: response.status,
        message: extractLalamoveErrorMessage(payload, response.status),
        error_code: String(payload?.message || payload?.error || "").trim() || "LALAMOVE_API_ERROR",
        data: payload,
      };
    }

    return {
      ok: true,
      status: response.status,
      data: payload,
    };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      message: error instanceof Error ? error.message : "Lalamove request failed.",
      error_code: "LALAMOVE_REQUEST_ERROR",
      data: null,
    };
  }
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

async function telegramSendPhoto(chatId, photoSource, caption = "") {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    throw new Error("TELEGRAM_BOT_TOKEN is not configured");
  }
  const form = new FormData();
  form.append("chat_id", chatId);
  if (caption) {
    form.append("caption", caption);
    form.append("parse_mode", "Markdown");
  }

  if (typeof photoSource === "string" && photoSource.startsWith("data:")) {
    const match = /^data:(.*?);base64,(.*)$/.exec(photoSource);
    if (!match) {
      throw new Error("Invalid payment proof image data.");
    }
    const mimeType = match[1] || "image/jpeg";
    const bytes = Buffer.from(match[2], "base64");
    const extension = mimeType.includes("png") ? "png" : mimeType.includes("webp") ? "webp" : "jpg";
    form.append("photo", new Blob([bytes], { type: mimeType }), `payment-proof.${extension}`);
  } else {
    form.append("photo", String(photoSource || ""));
  }

  const response = await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, {
    method: "POST",
    body: form,
  });
  const payload = await response.json();
  if (!response.ok || !payload.ok) {
    throw new Error(payload.description || `Telegram photo send failed with status ${response.status}`);
  }
  return payload;
}

async function notifyAdmins(text, storeConfig = STORE_CONFIGS.poppers) {
  const textWithLink = [String(text || "").trim(), "", `Admin Portal: ${storeConfig.adminPortalUrl}`]
    .filter(Boolean)
    .join("\n");
  const adminGroup = process.env.TELEGRAM_ADMIN_GROUP_ID;
  const adminIds = String(process.env.TELEGRAM_ADMIN_IDS || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  const results = [];
  if (adminGroup) {
    results.push(await telegramSendMessage(adminGroup, textWithLink));
    return results;
  }
  for (const adminId of adminIds) {
    results.push(await telegramSendMessage(adminId, textWithLink));
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

function buildOrderSheetRow(order) {
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

function mapLalamoveStatusToOrderStatus(lalamoveStatus, currentStatus = "") {
  const normalized = String(lalamoveStatus || "").trim().toUpperCase();
  const current = String(currentStatus || "").trim();
  if (!normalized) {
    return current;
  }
  if (normalized === "COMPLETED") {
    return "Completed";
  }
  if (["CANCELED", "CANCELLED", "REJECTED", "EXPIRED"].includes(normalized)) {
    return "Cancelled";
  }
  if (["ASSIGNING_DRIVER", "ON_GOING", "PICKED_UP"].includes(normalized)) {
    if (["Delivered", "Completed", "Cancelled"].includes(current)) {
      return current;
    }
    return "Out for Delivery";
  }
  return current || "Confirmed";
}

function formatLalamoveStatus(status) {
  const normalized = String(status || "").trim().toUpperCase();
  return normalized ? normalized.replace(/_/g, " ") : "";
}

async function syncLalamoveOrderRecord(order, rowNumber, options = {}) {
  const storeConfig = options.storeConfig || STORE_CONFIGS.poppers;
  const current = order && typeof order === "object" ? { ...order } : null;
  if (!current || String(current.delivery_method || "").trim() !== "Lalamove") {
    return { ok: true, changed: false, order: current, lalamove: null };
  }
  const trackingNumber = String(current.tracking_number || "").trim();
  if (!trackingNumber) {
    return { ok: true, changed: false, order: current, lalamove: null };
  }

  const details = await handleLalamoveOrderDetails({
    lalamove: {
      market: "PH",
      orderId: trackingNumber,
    },
  });
  if (!details.ok) {
    return {
      ok: false,
      changed: false,
      order: current,
      message: details.message || "Could not load Lalamove order details.",
      error_code: details.error_code || "LALAMOVE_ORDER_DETAILS_FAILED",
    };
  }

  const payload = details.data?.data || details.data || {};
  const liveStatus = String(payload.status || "").trim().toUpperCase();
  const liveTrackingLink = extractLalamoveTrackingLink(details.data);
  const driverId = String(payload.driverId || "").trim();
  let driver = null;
  if (driverId) {
    const driverResult = await handleLalamoveDriverDetails({
      lalamove: {
        market: "PH",
        orderId: trackingNumber,
        driverId,
      },
    }).catch(() => null);
    const driverPayload = driverResult?.data?.data || driverResult?.data || null;
    if (driverPayload) {
      driver = {
        id: driverId,
        name: String(driverPayload.name || "").trim(),
        phone: String(driverPayload.phone || "").trim(),
        plate_number: String(driverPayload.plateNumber || "").trim(),
        photo: String(driverPayload.photo || "").trim(),
        coordinates:
          driverPayload.coordinates?.lat && driverPayload.coordinates?.lng
            ? {
                lat: String(driverPayload.coordinates.lat),
                lng: String(driverPayload.coordinates.lng),
                updated_at: String(driverPayload.coordinates.updatedAt || "").trim(),
              }
            : null,
      };
    }
  }
  const mappedStatus = mapLalamoveStatusToOrderStatus(liveStatus, current.status);
  const updated = {
    ...current,
    status: mappedStatus,
  };
  const changed = String(mappedStatus || "").trim() !== String(current.status || "").trim();
  const lalamove = {
    status: liveStatus,
    status_label: formatLalamoveStatus(liveStatus),
    tracking_link: liveTrackingLink,
    driver_id: driverId,
    share_link: liveTrackingLink,
    driver,
    pickup:
      payload.stops?.[0]?.coordinates?.lat && payload.stops?.[0]?.coordinates?.lng
        ? {
            coordinates: {
              lat: String(payload.stops[0].coordinates.lat),
              lng: String(payload.stops[0].coordinates.lng),
            },
            address: String(payload.stops?.[0]?.address || "").trim(),
          }
        : null,
    recipient:
      payload.stops?.[1]?.coordinates?.lat && payload.stops?.[1]?.coordinates?.lng
        ? {
            coordinates: {
              lat: String(payload.stops[1].coordinates.lat),
              lng: String(payload.stops[1].coordinates.lng),
            },
            address: String(payload.stops?.[1]?.address || "").trim(),
          }
        : null,
  };

  if (changed && rowNumber) {
    await updateRecordRow("Orders", rowNumber, buildOrderSheetRow(updated));
    if (options.notify !== false) {
      const adminLines = [
        "Lalamove order update",
        `Order: ${updated.order_id}`,
        `Status: ${updated.status}`,
        lalamove.status_label ? `Lalamove Status: ${lalamove.status_label}` : "",
        lalamove.driver?.name ? `Rider: ${lalamove.driver.name}` : "",
        lalamove.driver?.phone ? `Rider Phone: ${lalamove.driver.phone}` : "",
        lalamove.driver?.plate_number ? `Plate Number: ${lalamove.driver.plate_number}` : "",
        lalamove.tracking_link ? `Lalamove tracking: ${lalamove.tracking_link}` : "",
      ]
        .filter(Boolean)
        .join("\n");
      await notifyAdmins(adminLines, storeConfig).catch(() => null);

      const targetId = String(updated.user_id || "").trim();
      if (isTelegramChatId(targetId)) {
        const customerLines = [
          `Order ${updated.order_id} update`,
          `Status: ${updated.status}`,
          lalamove.status_label ? `Rider status: ${lalamove.status_label}` : "",
          lalamove.driver?.name ? `Rider: ${lalamove.driver.name}` : "",
          lalamove.driver?.phone ? `Rider phone: ${lalamove.driver.phone}` : "",
          lalamove.driver?.plate_number ? `Plate number: ${lalamove.driver.plate_number}` : "",
          lalamove.tracking_link ? `Live tracking: ${lalamove.tracking_link}` : "",
          `Track here: ${buildStoreTrackingUrl(storeConfig, updated.order_id)}`,
        ]
          .filter(Boolean)
          .join("\n");
        await telegramSendMessage(targetId, customerLines, { parse_mode: null }).catch(() => null);
      }
    }
  }

  return {
    ok: true,
    changed,
    order: updated,
    lalamove,
  };
}

async function handleGetCatalog(body) {
  const catalog = await fetchCatalog(body);
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
  const { products } = await fetchCatalog(body);
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
  const { products } = await fetchCatalog(body);
  const items = await resolveCartItems(body);
  const cart = buildCartLines(products, items);
  return {
    ok: true,
    action: body.action,
    message: "Cart calculated successfully.",
    data: cart,
  };
}

async function handleQuoteOrder(body) {
  const storeConfig = getStoreConfig(body);
  const { products } = await fetchCatalog(body);
  const items = await resolveCartItems(body);
  if (!items.length) {
    return {
      ok: false,
      action: "quote_order",
      message: "Cart is empty. Please add items to the cart before quoting.",
      error_code: "MISSING_CART_ITEMS",
    };
  }
  const checkout = body.checkout || {};
  checkout.payment_method = normalizePaymentMethod(checkout.payment_method);
  const missingDeliveryFields = getMissingQuoteFields(checkout);
  if (missingDeliveryFields.length) {
    return buildMissingFieldError(
      "quote_order",
      `Missing ${missingDeliveryFields[0].label}. Please collect delivery details before generating a quote.`,
      "MISSING_DELIVERY_FIELDS",
      missingDeliveryFields
    );
  }
  const cart = buildCartLines(products, items);
  let promoCode = String(checkout.promo_code || "").trim();
  let promoSource = "manual";
  if (!promoCode || promoCode.toLowerCase() === "none") {
    const repeatBuyer = await hasRepeatBuyerHistory(body.customer || {}, checkout);
    if (repeatBuyer) {
      promoCode = storeConfig.defaultPromoCode;
      promoSource = "auto_repeat_buyer";
    }
  }
  const promo = await getPromoDiscount(cart.subtotal, promoCode);
  const loyaltyBalance = await getLoyaltyBalance(body.customer || {});
  const rewardsBlockedByPromo =
    Boolean(promo.promo_applied) && Number(loyaltyBalance || 0) >= LOYALTY_REDEEM_POINTS;
  const reward = promo.promo_applied
    ? { reward_points_used: 0, reward_discount: 0 }
    : computeRewardRedemption(
        loyaltyBalance,
        Math.max(cart.subtotal - promo.promo_discount, 0)
      );
  const discount = Number((promo.promo_discount + reward.reward_discount).toFixed(2));
  const totals = computeTotals(
    cart.subtotal,
    discount,
    checkout.delivery_area || "Metro Manila",
    checkout.payment_method
  );
  const warnings = [promo.promo_warning].filter(Boolean);
  if (rewardsBlockedByPromo) {
    warnings.push("Promos and rewards cannot be combined in the same order.");
  }
  const shouldBillLalamove = getCheckoutDeliveryMethod(checkout) === "Lalamove";
  const lalamove = shouldBillLalamove ? await getCheckoutLalamoveQuote(checkout, cart) : null;
  if (lalamove?.ok) {
    totals.delivery_fee = parseMoney(lalamove.quoted_total);
    totals.shipping = parseMoney(totals.shipping + totals.delivery_fee);
    totals.total = parseMoney(totals.total + totals.delivery_fee);
  } else if (lalamove?.warning) {
    warnings.push(lalamove.warning);
  }

  return {
    ok: true,
    action: "quote_order",
    message: "Quote generated successfully.",
    data: {
      ...cart,
      promo_code: promo.promo_code,
      promo_applied: Boolean(promo.promo_applied),
      promo_source: promoSource,
      promo_auto_applied: promoSource === "auto_repeat_buyer" && Boolean(promo.promo_applied),
      promo_discount: promo.promo_discount,
      reward_points_used: reward.reward_points_used,
      reward_discount: reward.reward_discount,
      rewards_blocked_by_promo: rewardsBlockedByPromo,
      discount,
      loyalty_balance: loyaltyBalance,
      delivery_fee: totals.delivery_fee,
      cod_fee: totals.cod_fee,
      shipping_base: totals.shipping_base,
      shipping: totals.shipping,
      total: totals.total,
      payment_method: checkout.payment_method,
      delivery_method: getCheckoutDeliveryMethod(checkout),
      lalamove:
        lalamove?.ok
          ? {
              quotation_id: lalamove.quotation_id,
              quoted_total: lalamove.quoted_total,
              currency: lalamove.currency,
              stops: lalamove.stops,
              pickup: lalamove.pickup,
              expires_at: lalamove.expires_at,
              price_breakdown: lalamove.price_breakdown,
              distance: lalamove.distance,
              special_requests: lalamove.special_requests || [],
              service_type: lalamove.service_type || "",
              item: lalamove.item || null,
            }
          : null,
      warnings,
    },
  };
}

async function handleValidateDeliveryAddress(body) {
  const checkout = body.checkout || {};
  const address = String(checkout.delivery_address || "").trim();
  if (!address) {
    return {
      ok: false,
      action: "validate_delivery_address",
      message: "Delivery address is required.",
      error_code: "MISSING_DELIVERY_ADDRESS",
    };
  }

  try {
    const coordinates = await geocodeAddress(address);
    return {
      ok: true,
      action: "validate_delivery_address",
      message: "Delivery address verified successfully.",
      data: {
        address,
        delivery_area: String(checkout.delivery_area || "").trim(),
        delivery_method: getCheckoutDeliveryMethod(checkout),
        coordinates,
        verified: true,
      },
    };
  } catch (error) {
    return {
      ok: false,
      action: "validate_delivery_address",
      message: error instanceof Error ? error.message : "Could not verify the delivery address.",
      error_code: "DELIVERY_ADDRESS_NOT_VERIFIED",
      data: {
        address,
        delivery_area: String(checkout.delivery_area || "").trim(),
        delivery_method: getCheckoutDeliveryMethod(checkout),
        verified: false,
      },
    };
  }
}

async function handleSubmitOrder(body) {
  const storeConfig = getStoreConfig(body);
  const quote = await handleQuoteOrder(body);
  if (!quote.ok) {
    return quote;
  }

  const customer = body.customer || {};
  const telegramId = getTelegramId(customer);
  const checkout = body.checkout || {};
  checkout.payment_method = normalizePaymentMethod(checkout.payment_method);
  const missingDeliveryFields = getMissingSubmitFields(checkout);
  if (missingDeliveryFields.length) {
    return buildMissingFieldError(
      "submit_order",
      `Missing ${missingDeliveryFields[0].label}. Please collect delivery details before submitting the order.`,
      "MISSING_DELIVERY_FIELDS",
      missingDeliveryFields
    );
  }
  const orderId = makeOrderId(customer);
  const status = getOrderStatus(checkout.payment_method);
  const order = {
    order_id: orderId,
    created_at: nowIso(),
    customer_id: customer.customer_id || "",
    user_id: getNumericTelegramUserId(customer) || telegramId || String(customer.customer_id || "").trim(),
    telegram_user_id: telegramId,
    full_name: customer.name || checkout.delivery_name || "",
    username: String(customer.username || "").replace(/^@/, ""),
    status,
    items: quote.data.items,
    subtotal: quote.data.subtotal,
    promo_discount: quote.data.promo_discount,
    reward_discount: quote.data.reward_discount,
    reward_points_used: quote.data.reward_points_used,
    discount: quote.data.discount,
    delivery_fee: quote.data.delivery_fee || 0,
    cod_fee: quote.data.cod_fee || 0,
    shipping_base: quote.data.shipping_base || 0,
    shipping: quote.data.shipping,
    total: quote.data.total,
    delivery_name: checkout.delivery_name || "",
    delivery_address: checkout.delivery_address || "",
    delivery_contact: checkout.delivery_contact || "",
    delivery_area: checkout.delivery_area || "",
    payment_method: checkout.payment_method,
    delivery_method: getCheckoutDeliveryMethod(checkout),
    referral_code: String(checkout.referral_code || "").trim().toUpperCase(),
    payment_proof_url: checkout.payment_proof_url || "",
    payment_proof_file_id: checkout.payment_proof_file_id || "",
    tracking_number: "",
  };

  const adminText = [
    `New order *${order.order_id}*`,
    `Customer: ${order.full_name || "-"}${order.username ? ` (@${order.username})` : ""}`,
    `Telegram ID: ${order.user_id || telegramId || "-"}`,
    `Telegram Username: ${order.username ? `@${order.username}` : "-"}`,
    `Referral Code: ${order.referral_code || "-"}`,
    `Total: PHP ${order.total.toFixed(2)}`,
    `Payment: ${order.payment_method}`,
    `Delivery Method: ${order.delivery_method}`,
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
    ...(order.delivery_method === "Lalamove" && order.payment_method !== "Cash on Delivery"
      ? ["Same-day delivery is already included in your total. No need to pay the rider separately."]
      : []),
    ...(order.delivery_method === "Lalamove" && order.payment_method === "Cash on Delivery"
      ? ["For COD same-day delivery, payment will be collected upon delivery."]
      : []),
    "",
    "We will update you with confirmation and tracking soon.",
  ].join("\n");

  const notifications = {
    admin_notified: false,
    customer_notified: false,
  };

  notifications.sheet_logged = false;
  notifications.user_saved = false;

  try {
    await logOrderRecord(order);
    notifications.sheet_logged = true;
  } catch (error) {
    notifications.sheet_error = error instanceof Error ? error.message : "Failed to log order.";
  }

  try {
    await upsertUserDeliveryRecord(customer, checkout);
    notifications.user_saved = true;
  } catch (error) {
    notifications.user_save_error = error instanceof Error ? error.message : "Failed to save user delivery info.";
  }

  try {
    await notifyAdmins(adminText, storeConfig);
    notifications.admin_notified = true;
  } catch (error) {
    notifications.admin_error = error instanceof Error ? error.message : "Failed to notify admins.";
  }

  let resolvedPaymentProofUrl = String(checkout.payment_proof_url || "").trim();
  if (!resolvedPaymentProofUrl && checkout.payment_proof_token) {
    try {
      resolvedPaymentProofUrl = await readPaymentProofToken(String(checkout.payment_proof_token || "").trim());
      if (!resolvedPaymentProofUrl) {
        notifications.payment_proof_error = "Uploaded payment proof could not be found. Please upload it again.";
      }
    } catch (error) {
      notifications.payment_proof_error = error instanceof Error ? error.message : "Failed to load uploaded payment proof.";
    }
  }

  if (resolvedPaymentProofUrl) {
    try {
      const adminGroup = process.env.TELEGRAM_ADMIN_GROUP_ID;
      const adminIds = String(process.env.TELEGRAM_ADMIN_IDS || "")
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean);
      const targets = adminGroup ? [adminGroup] : adminIds;
      for (const target of targets) {
        const photoResult = await telegramSendPhoto(
          target,
          resolvedPaymentProofUrl,
          `Payment proof for *${order.order_id}*\nAdmin Portal: ${storeConfig.adminPortalUrl}`
        );
        const firstPhoto = photoResult?.result?.photo?.slice(-1)?.[0];
        if (firstPhoto?.file_id) {
          order.payment_proof_file_id = firstPhoto.file_id;
        }
      }
      notifications.payment_proof_forwarded = true;
      if (checkout.payment_proof_token) {
        await deletePaymentProofToken(String(checkout.payment_proof_token || "").trim()).catch(() => null);
      }
    } catch (error) {
      notifications.payment_proof_error =
        error instanceof Error ? error.message : "Failed to forward payment proof.";
    }
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
  const storeConfig = getStoreConfig(body);
  const customer = body.customer || {};
  const orderSearch = body.order || {};
  const requestedOrderId = useLatest ? "" : String(orderSearch.order_id || body.order_id || "").trim();
  const searchUsername = String(orderSearch.telegram_username || orderSearch.username || customer.username || "").trim();
  const searchPhone = normalizePhone(orderSearch.phone || orderSearch.delivery_contact || "");
  if (!useLatest && !requestedOrderId && !searchUsername && !searchPhone) {
    return {
      ok: false,
      action: "track_order",
      message: "Order number, Telegram username, or phone number is required for order follow-up.",
      error_code: "MISSING_TRACKING_LOOKUP",
    };
  }

  let order = await findOrderRecord(requestedOrderId, customer, orderSearch);
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

  let lalamove = null;
  if (String(order.delivery_method || "").trim() === "Lalamove" && String(order.tracking_number || "").trim()) {
    const rows = await getRecordRows("Orders").catch(() => [ORDER_HEADERS]);
    const records = mapSheetRows(rows).map(normalizeLegacyOrderRecord);
    const index = records.findIndex(
      (record) => String(record.order_id || "").trim().toUpperCase() === String(order.order_id || "").trim().toUpperCase()
    );
    const syncResult = await syncLalamoveOrderRecord(order, index >= 0 ? index + 2 : null, {
      notify: true,
      storeConfig,
    }).catch(() => null);
    if (syncResult?.order) {
      order = syncResult.order;
    }
    if (syncResult?.lalamove) {
      lalamove = syncResult.lalamove;
    }
  }

  const status = String(order.status || "").trim() || "Pending";
  const trackingNumber = String(order.tracking_number || "").trim();
  const photoFileIds = parsePhotoFileIds(order.order_photo_file_ids);
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
      lalamove,
      order_photo_count: photoFileIds.length,
      order_photos: photoFileIds.map((_, index) => ({
        index,
        url: `${String(storeConfig.publicBaseUrl || "").replace(/\/+$/, "")}/api/storefront/order-photo?order_id=${encodeURIComponent(
          String(order.order_id || "").trim()
        )}&index=${index}`,
      })),
    },
  };
}

async function handleCompleteOrder(body) {
  const storeConfig = getStoreConfig(body);
  const customer = body.customer || {};
  const requestedOrderId = String(body.order_id || body.order?.order_id || "").trim();
  const requestedStatus = String(body.status || "").trim();
  const normalizedStatus = ["Delivered", "Completed"].includes(requestedStatus) ? requestedStatus : "Completed";
  if (!requestedOrderId) {
    return {
      ok: false,
      action: "complete_order",
      message: "Order number is required.",
      error_code: "MISSING_ORDER_ID",
    };
  }

  const rows = await getRecordRows("Orders").catch(() => [ORDER_HEADERS]);
  const records = mapSheetRows(rows).map(normalizeLegacyOrderRecord);
  const index = records.findIndex(
    (record) => String(record.order_id || "").trim().toUpperCase() === requestedOrderId.toUpperCase()
  );
  if (index < 0) {
    return {
      ok: false,
      action: "complete_order",
      message: "Order not found.",
      error_code: "ORDER_NOT_FOUND",
    };
  }

  const order = records[index];
  const matched = await findOrderRecord(requestedOrderId, customer, body.order || {});
  if (!matched || String(matched.order_id || "").trim().toUpperCase() !== requestedOrderId.toUpperCase()) {
    return {
      ok: false,
      action: "complete_order",
      message: "This customer is not allowed to update that order.",
      error_code: "ORDER_ACCESS_DENIED",
    };
  }

  const updated = {
    ...order,
    status: normalizedStatus,
  };
  await updateRecordRow("Orders", index + 2, [
    updated.order_id,
    updated.created_at,
    updated.user_id,
    updated.username,
    updated.full_name,
    updated.items_json,
    updated.subtotal,
    updated.discount,
    updated.shipping,
    updated.total,
    updated.delivery_name,
    updated.delivery_address,
    updated.delivery_contact,
    updated.delivery_area,
    updated.payment_method,
    updated.delivery_method || "Standard",
    updated.referral_code || "",
    updated.payment_proof_file_id || "",
    updated.status,
    updated.tracking_number || "",
    updated.order_photo_file_ids || "[]",
  ]);

  const rewardsSummary = await settleCompletedOrderRewards({
    ...updated,
    reward_points_used: Number(body.reward_points_used || order.reward_points_used || 0),
    reward_discount: Number(body.reward_discount || order.reward_discount || 0),
    customer_id: String(customer.customer_id || "").trim(),
  }).catch(() => null);

  await notifyAdmins(
    [
      "Customer order status update",
      `Order: ${updated.order_id}`,
      `Status: ${updated.status}`,
      `Username: ${customer.username ? `@${customer.username}` : String(updated.username || "-").replace(/^@/, "")}`,
      `Telegram ID: ${customer.telegram_user_id || customer.telegram_id || updated.user_id || "-"}`,
      rewardsSummary ? `Rewards balance: ${rewardsSummary.balance_after} points` : "",
    ]
      .filter(Boolean)
      .join("\n"),
    storeConfig
  );

  return {
    ok: true,
    action: "complete_order",
    message: `Order marked as ${normalizedStatus}.`,
    data: {
      order_id: String(updated.order_id || "").trim(),
      status: normalizedStatus,
      rewards: rewardsSummary,
      tracking_link: buildStoreTrackingUrl(storeConfig, updated.order_id),
    },
  };
}

async function handleSubmitSurvey(body) {
  const customer = body.customer || {};
  const orderId = String(body.order_id || body.order?.order_id || "").trim();
  const rating = Number(body.survey?.rating || body.rating || 0);
  const comment = String(body.survey?.comment || body.comment || "").trim();
  const source = String(body.survey?.source || body.source || "tracking").trim();
  if (!orderId) {
    return {
      ok: false,
      action: "submit_survey",
      message: "Order number is required.",
      error_code: "MISSING_ORDER_ID",
    };
  }
  if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
    return {
      ok: false,
      action: "submit_survey",
      message: "A rating from 1 to 5 is required.",
      error_code: "INVALID_SURVEY_RATING",
    };
  }

  const matched = await findOrderRecord(orderId, customer, body.order || {});
  if (!matched || String(matched.order_id || "").trim().toUpperCase() !== orderId.toUpperCase()) {
    return {
      ok: false,
      action: "submit_survey",
      message: "This customer is not allowed to review that order.",
      error_code: "ORDER_ACCESS_DENIED",
    };
  }

  const rows = await getRecordRows("Surveys").catch(() => [SURVEY_HEADERS]);
  const records = mapSheetRows(rows);
  const existingIndex = records.findIndex(
    (record) => String(record.order_id || "").trim().toUpperCase() === orderId.toUpperCase()
  );
  const rowValues = [
    existingIndex >= 0 ? String(records[existingIndex].survey_id || "").trim() || `SV-${randomUUID().slice(0, 8).toUpperCase()}` : `SV-${randomUUID().slice(0, 8).toUpperCase()}`,
    nowIso(),
    orderId,
    String(customer.telegram_user_id || customer.telegram_id || matched.user_id || "").trim().replace(/^@/, ""),
    String(customer.username || matched.username || "").trim().replace(/^@/, ""),
    rating,
    comment,
    source,
  ];
  if (existingIndex >= 0) {
    await updateRecordRow("Surveys", existingIndex + 2, rowValues);
  } else {
    await appendRecordRow("Surveys", rowValues);
  }

  await notifyAdmins(
    [
      "New order survey",
      `Order: ${orderId}`,
      `Rating: ${rating}/5`,
      rowValues[4] ? `Username: @${rowValues[4]}` : "",
      comment ? `Comment: ${comment}` : "",
    ]
      .filter(Boolean)
      .join("\n")
  );

  return {
    ok: true,
    action: "submit_survey",
    message: "Survey submitted successfully.",
    data: {
      order_id: orderId,
      rating,
      comment,
      source,
    },
  };
}

async function handleSupportTicket(body) {
  const customer = body.customer || {};
  const message = String(body.support?.message || "").trim();
  const contact = resolveSupportContact(customer, body.support || {});
  if (!message) {
    return {
      ok: false,
      action: "create_support_ticket",
      message: "Support message is required.",
      error_code: "MISSING_SUPPORT_MESSAGE",
    };
  }
  if (!contact.contact_channel || !contact.contact_value) {
    return {
      ok: false,
      action: "create_support_ticket",
      message:
        "Before I submit the support ticket, how should support contact you: Telegram, Viber, or WhatsApp? Please also share the number or user ID.",
      error_code: "MISSING_SUPPORT_CONTACT",
    };
  }
  const ticketId = await logTicketRecord(
    "customer_service",
    customer,
    [
      `Contact Channel: ${contact.contact_channel}`,
      `Contact Value: ${contact.contact_value}`,
      `Message: ${message}`,
    ].join("\n")
  );
  const trackingNumber = ticketId;
  const text = [
    "Customer service ticket",
    `Tracking Number: ${trackingNumber}`,
    `Name: ${customer.name || "-"}`,
    `Username: ${customer.username ? `@${customer.username}` : "-"}`,
    `Contact Channel: ${contact.contact_channel}`,
    `Contact Value: ${contact.contact_value}`,
    `Message: ${message}`,
  ].join("\n");
  await notifyAdmins(text);
  return {
    ok: true,
    action: "create_support_ticket",
    message: "Support ticket sent successfully.",
    data: {
      notified: true,
      ticket_id: ticketId,
      tracking_number: trackingNumber,
      contact_channel: contact.contact_channel,
    },
  };
}

async function handleBulkOrder(body) {
  const customer = body.customer || {};
  const bulk = body.bulk_order || {};
  const contact = resolveSupportContact(customer, bulk);
  if (!contact.contact_channel || !contact.contact_value) {
    return {
      ok: false,
      action: "create_bulk_order_ticket",
      message:
        "Before I submit the bulk order request, how should we contact you: Telegram, Viber, or WhatsApp? Please also share the number or user ID.",
      error_code: "MISSING_BULK_ORDER_CONTACT",
    };
  }
  const ticketMessage = [
    `Requested Items: ${bulk.requested_items || "-"}`,
    `Target Date: ${bulk.target_date || "-"}`,
    `Contact Channel: ${contact.contact_channel}`,
    `Contact Value: ${contact.contact_value}`,
    `Message: ${bulk.message || "-"}`,
  ].join("\n");
  const ticketId = await logTicketRecord("bulk_order", customer, ticketMessage);
  const trackingNumber = ticketId;
  const text = [
    "Bulk order request",
    `Tracking Number: ${trackingNumber}`,
    `Name: ${customer.name || "-"}`,
    `Username: ${customer.username ? `@${customer.username}` : "-"}`,
    `Contact Channel: ${contact.contact_channel}`,
    `Contact Value: ${contact.contact_value}`,
    `Requested Items: ${bulk.requested_items || "-"}`,
    `Target Date: ${bulk.target_date || "-"}`,
    `Message: ${bulk.message || "-"}`,
  ].join("\n");
  await notifyAdmins(text);
  return {
    ok: true,
    action: "create_bulk_order_ticket",
    message: "Bulk order request sent successfully.",
    data: {
      notified: true,
      ticket_id: ticketId,
      tracking_number: trackingNumber,
      contact_channel: contact.contact_channel,
    },
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
  await logAffiliateRecord(customer, affiliate);
  await notifyAdmins(text);
  return {
    ok: true,
    action: "submit_affiliate_enrollment",
    message: "Affiliate enrollment sent successfully.",
    data: { notified: true },
  };
}

async function handleRewards(body) {
  const balance = await getLoyaltyBalance(body.customer || {});
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
      error_code: result.error_code || "LALAMOVE_API_ERROR",
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
      error_code: result.error_code || "LALAMOVE_API_ERROR",
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

async function handleLalamoveDriverDetails(body) {
  const market = String(body.lalamove?.market || "PH").trim().toUpperCase();
  const orderId = String(body.lalamove?.orderId || "").trim();
  const driverId = String(body.lalamove?.driverId || "").trim();
  if (!orderId || !driverId) {
    return {
      ok: false,
      action: "lalamove_driver_details",
      message: "Lalamove orderId and driverId are required.",
      error_code: "MISSING_LALAMOVE_DRIVER_CONTEXT",
    };
  }
  const result = await callLalamove({
    method: "GET",
    path: `/v3/orders/${encodeURIComponent(orderId)}/drivers/${encodeURIComponent(driverId)}`,
    market,
  });
  if (!result.ok) {
    return {
      ok: false,
      action: "lalamove_driver_details",
      message: result.message,
      error_code: result.error_code || "LALAMOVE_API_ERROR",
      data: result.data,
    };
  }
  return {
    ok: true,
    action: "lalamove_driver_details",
    message: "Lalamove driver details loaded successfully.",
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

function createHandler(options = {}) {
  const allowedActions = Array.isArray(options.allowedActions) ? new Set(options.allowedActions) : null;
  const requireAuth = options.requireAuth !== false;

  return async function handler(req, res) {
  if (req.method !== "POST") {
    return sendJson(res, 405, {
      ok: false,
      message: "Method not allowed. Use POST.",
    });
  }

  const expectedToken = process.env.RETELL_FUNCTION_AUTH_TOKEN;
  if (requireAuth && expectedToken) {
    const receivedToken = getBearerToken(req);
    if (!receivedToken || receivedToken !== expectedToken) {
      return sendJson(res, 401, {
        ok: false,
        message: "Unauthorized.",
      });
    }
  }

  const rawBody = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
  const baseBody =
    rawBody && typeof rawBody === "object" && rawBody.args && typeof rawBody.args === "object"
      ? { ...rawBody.args, _retell: { name: rawBody.name || "", call: rawBody.call || null } }
      : rawBody;
  const body = enrichBodyCustomer(rawBody, baseBody || {});
  const action = String(body.action || "").trim();

  if (!action) {
    return sendJson(res, 400, {
      ok: false,
      message: "Missing action.",
      error_code: "MISSING_ACTION",
    });
  }

  if (allowedActions && !allowedActions.has(action)) {
    return sendJson(res, 400, {
      ok: false,
      action,
      message: `Unsupported action for this function: ${action}`,
      error_code: "UNSUPPORTED_ACTION",
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
      case "validate_delivery_address":
        result = await handleValidateDeliveryAddress(body);
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
      case "lalamove_driver_details":
        result = await handleLalamoveDriverDetails(body);
        break;
      case "track_order":
        result = await handleTrackOrder(body, false);
        break;
      case "track_latest_order":
        result = await handleTrackOrder(body, true);
        break;
      case "complete_order":
        result = await handleCompleteOrder(body);
        break;
      case "submit_survey":
        result = await handleSubmitSurvey(body);
        break;
      case "get_saved_delivery":
        result = await handleGetSavedDelivery(body);
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
}

module.exports = createHandler();
module.exports.createHandler = createHandler;
module.exports.helpers = {
  ORDER_HEADERS,
  TICKET_HEADERS,
  PROMO_HEADERS,
  PRODUCT_HEADERS,
  ADMIN_USER_HEADERS,
  REWARD_HEADERS,
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
  handleLalamoveDriverDetails,
  syncLalamoveOrderRecord,
  parsePhotoFileIds,
  telegramSendPhoto,
  settleCompletedOrderRewards,
  getLoyaltyBalance,
  LOYALTY_POINTS_PER_ORDER,
  REFERRAL_SUCCESS_POINTS,
  LOYALTY_REDEEM_POINTS,
  LOYALTY_REDEEM_VALUE,
  getStoreConfig,
  notifyAdmins,
  persistPaymentProofToken,
  readPaymentProofToken,
  deletePaymentProofToken,
};
