"use strict";

const baseHandler = require("./poppersguy-ops");

module.exports = baseHandler.createHandler({
  allowedActions: [
    "update_cart",
    "get_cart",
    "quote_order",
    "submit_order",
  ],
});
