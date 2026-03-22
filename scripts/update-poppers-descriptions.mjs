import { readFile } from "node:fs/promises";
import { createSign } from "node:crypto";

const ROOT = "/Users/mymacyou/Documents/delubots";
const OPS_FILE = `${ROOT}/storefront/api/retell/poppersguy-ops.js`;
const DESCRIPTIONS_FILE = `${ROOT}/poppersguyph/product_descriptions.json`;
const SPREADSHEET_ID = "1_OQ3tiHzb0jFrkcg2mwDz-prVLDa-ef5GUijqJwcD_I";

function base64UrlEncode(input) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

async function loadServiceAccount() {
  const source = await readFile(OPS_FILE, "utf8");
  const match = source.match(/const DEFAULT_SERVICE_ACCOUNT_INFO = (\{[\s\S]*?\n\});/);
  if (!match) {
    throw new Error("Could not locate DEFAULT_SERVICE_ACCOUNT_INFO.");
  }
  return Function(`"use strict"; return (${match[1]});`)();
}

async function getAccessToken(serviceAccount) {
  const issuedAt = Math.floor(Date.now() / 1000);
  const payload = {
    iss: serviceAccount.client_email,
    scope: "https://www.googleapis.com/auth/spreadsheets",
    aud: serviceAccount.token_uri,
    exp: issuedAt + 3600,
    iat: issuedAt,
  };
  const header = { alg: "RS256", typ: "JWT" };
  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signer = createSign("RSA-SHA256");
  signer.update(`${encodedHeader}.${encodedPayload}`);
  signer.end();
  const signature = signer.sign(serviceAccount.private_key);
  const assertion = `${encodedHeader}.${encodedPayload}.${base64UrlEncode(signature)}`;

  const response = await fetch(serviceAccount.token_uri, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }).toString(),
  });
  const payloadJson = await response.json();
  if (!response.ok || !payloadJson.access_token) {
    throw new Error(payloadJson.error_description || payloadJson.error || "Failed to get Google access token");
  }
  return payloadJson.access_token;
}

async function getSheetValues(accessToken, range) {
  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${encodeURIComponent(range)}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
    }
  );
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error?.message || `Failed to fetch range ${range}`);
  }
  return Array.isArray(payload.values) ? payload.values : [];
}

async function batchUpdate(accessToken, data) {
  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values:batchUpdate`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        valueInputOption: "USER_ENTERED",
        data,
      }),
    }
  );
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error?.message || "Failed to batch update descriptions");
  }
  return payload;
}

async function main() {
  const serviceAccount = await loadServiceAccount();
  const accessToken = await getAccessToken(serviceAccount);
  const descriptions = JSON.parse(await readFile(DESCRIPTIONS_FILE, "utf8"));
  const rows = await getSheetValues(accessToken, "Products!A:H");
  const updates = [];

  rows.slice(1).forEach((row, index) => {
    const sku = String(row?.[0] || "").trim();
    const description = descriptions[sku];
    if (!sku || !description) {
      return;
    }
    updates.push({
      range: `Products!D${index + 2}`,
      values: [[description]],
    });
  });

  if (!updates.length) {
    console.log(JSON.stringify({ updated: 0 }));
    return;
  }

  const result = await batchUpdate(accessToken, updates);
  console.log(JSON.stringify({ updated: updates.length, totalUpdatedCells: result.totalUpdatedCells || 0 }));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
