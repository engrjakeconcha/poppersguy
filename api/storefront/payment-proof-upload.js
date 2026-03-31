"use strict";

const { randomUUID } = require("node:crypto");
const ops = require("../retell/poppersguy-ops");

const { persistPaymentProofToken, getStoreConfig } = ops.helpers;

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ ok: false, message: "Method not allowed." });
    return;
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
    const dataUrl = String(body.data_url || "").trim();
    const store = String(body.store || body.slug || "poppers").trim().toLowerCase();
    getStoreConfig({ store });
    if (!dataUrl.startsWith("data:image/")) {
      res.status(400).json({ ok: false, message: "A valid payment screenshot is required." });
      return;
    }
    if (dataUrl.length > 2_500_000) {
      res.status(413).json({ ok: false, message: "Payment screenshot is too large. Please use a smaller image." });
      return;
    }
    const token = randomUUID();
    await persistPaymentProofToken(token, dataUrl);
    res.status(200).json({ ok: true, message: "Payment screenshot uploaded.", data: { token } });
  } catch (error) {
    res.status(500).json({ ok: false, message: error instanceof Error ? error.message : "Could not upload payment screenshot." });
  }
};

module.exports.config = {
  api: {
    bodyParser: {
      sizeLimit: "6mb",
    },
  },
};
