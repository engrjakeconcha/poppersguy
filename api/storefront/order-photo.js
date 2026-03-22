"use strict";

const ops = require("../retell/poppersguy-ops");

const { ORDER_HEADERS, getRecordRows, mapSheetRows, parsePhotoFileIds } = ops.helpers;

module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    res.status(405).json({ ok: false, message: "Method not allowed." });
    return;
  }

  const orderId = String(req.query?.order_id || "").trim();
  const index = Math.max(0, Number(req.query?.index || 0) || 0);
  if (!orderId) {
    res.status(400).json({ ok: false, message: "Order ID is required." });
    return;
  }

  try {
    const rows = await getRecordRows("Orders").catch(() => [ORDER_HEADERS]);
    const records = mapSheetRows(rows);
    const order = records.find((record) => String(record.order_id || "").trim().toUpperCase() === orderId.toUpperCase());
    if (!order) {
      res.status(404).json({ ok: false, message: "Order not found." });
      return;
    }

    const fileIds = parsePhotoFileIds(order.order_photo_file_ids);
    const fileId = String(fileIds[index] || "").trim();
    if (!fileId) {
      res.status(404).json({ ok: false, message: "Order photo not found." });
      return;
    }

    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) {
      res.status(500).json({ ok: false, message: "Telegram bot token is not configured." });
      return;
    }

    const fileResponse = await fetch(`https://api.telegram.org/bot${token}/getFile?file_id=${encodeURIComponent(fileId)}`);
    const filePayload = await fileResponse.json();
    if (!fileResponse.ok || !filePayload.ok || !filePayload.result?.file_path) {
      res.status(502).json({ ok: false, message: "Could not resolve Telegram file." });
      return;
    }

    const telegramFileUrl = `https://api.telegram.org/file/bot${token}/${filePayload.result.file_path}`;
    const imageResponse = await fetch(telegramFileUrl);
    if (!imageResponse.ok) {
      res.status(502).json({ ok: false, message: "Could not fetch Telegram image." });
      return;
    }

    const contentType = imageResponse.headers.get("content-type") || "image/jpeg";
    res.status(200);
    res.setHeader("Content-Type", contentType);
    res.setHeader("Cache-Control", "private, max-age=300");
    const buffer = Buffer.from(await imageResponse.arrayBuffer());
    res.end(buffer);
  } catch (error) {
    res.status(500).json({
      ok: false,
      message: error instanceof Error ? error.message : "Could not load order photo.",
    });
  }
};
