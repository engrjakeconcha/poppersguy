"use strict";

const baseHandler = require("./poppersguy-ops");

module.exports = baseHandler.createHandler({
  allowedActions: [
    "get_catalog",
    "get_product",
    "track_order",
    "track_latest_order",
    "create_support_ticket",
    "create_bulk_order_ticket",
    "submit_affiliate_enrollment",
    "get_rewards_info",
    "send_telegram",
  ],
});
