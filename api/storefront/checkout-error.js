"use strict";

const ops = require("../retell/poppersguy-ops");

const { notifyAdmins, getStoreConfig } = ops.helpers;

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ ok: false, message: "Method not allowed." });
    return;
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
    const storeConfig = getStoreConfig(body);
    const customer = body.customer && typeof body.customer === "object" ? body.customer : {};
    const checkout = body.checkout && typeof body.checkout === "object" ? body.checkout : {};
    const cart = body.cart && typeof body.cart === "object" ? body.cart : {};
    const lines = [
      "Checkout error alert",
      `Store: ${storeConfig.slug}`,
      `Action: ${String(body.action || "checkout_error").trim() || "checkout_error"}`,
      `Message: ${String(body.message || "Unknown checkout error.").trim()}`,
      body.page ? `Page: ${String(body.page).trim()}` : "",
      body.path ? `Path: ${String(body.path).trim()}` : "",
      body.host ? `Host: ${String(body.host).trim()}` : "",
      customer.telegram_id ? `Telegram ID: ${String(customer.telegram_id).trim()}` : "",
      customer.telegram_user_id ? `Telegram User ID: ${String(customer.telegram_user_id).trim()}` : "",
      customer.username ? `Username: @${String(customer.username).trim().replace(/^@/, "")}` : "",
      checkout.payment_method ? `Payment: ${String(checkout.payment_method).trim()}` : "",
      checkout.delivery_method ? `Delivery Method: ${String(checkout.delivery_method).trim()}` : "",
      checkout.delivery_area ? `Area: ${String(checkout.delivery_area).trim()}` : "",
      checkout.delivery_address ? `Address: ${String(checkout.delivery_address).trim().slice(0, 180)}` : "",
      Number.isFinite(Number(cart.items_count)) ? `Cart Items: ${Number(cart.items_count)}` : "",
      body.order_id ? `Order: ${String(body.order_id).trim()}` : "",
    ].filter(Boolean);

    await notifyAdmins(lines.join("\n"), storeConfig);
    res.status(200).json({ ok: true, message: "Admins notified." });
  } catch (error) {
    res.status(500).json({ ok: false, message: error instanceof Error ? error.message : "Could not notify admins." });
  }
};
