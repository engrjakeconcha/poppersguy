"use strict";

const baseHandler = require("../retell/poppersguy-ops");

module.exports = baseHandler.createHandler({
  requireAuth: false,
  allowedActions: ["get_catalog", "get_cart", "quote_order", "validate_delivery_address", "submit_order", "track_order", "track_latest_order", "get_saved_delivery", "complete_order", "submit_survey"],
});
