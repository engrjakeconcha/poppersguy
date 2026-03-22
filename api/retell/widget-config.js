"use strict";

function sendJson(res, status, body) {
  res.status(status).setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(body));
}

module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    return sendJson(res, 405, {
      ok: false,
      message: "Method not allowed. Use GET.",
    });
  }

  const publicKey = process.env.RETELL_WIDGET_PUBLIC_KEY || "";
  const agentId = process.env.RETELL_WIDGET_AGENT_ID || "agent_75c854665db40f81ec86c5ba82";
  if (!publicKey) {
    return sendJson(res, 200, {
      ok: true,
      enabled: false,
      message: "Retell widget public key is not configured.",
    });
  }

  return sendJson(res, 200, {
    ok: true,
    enabled: true,
    config: {
      publicKey,
      agentId,
      title: process.env.RETELL_WIDGET_TITLE || "Chat with PoppersGuyPH",
      logoUrl:
        process.env.RETELL_WIDGET_LOGO_URL ||
        "https://raw.githubusercontent.com/jcitservices-ai/delulubes/main/poppersguyph/assets/pgphlogo.png",
      color: process.env.RETELL_WIDGET_COLOR || "#ffd166",
      botName: process.env.RETELL_WIDGET_BOT_NAME || "PoppersGuyPH",
      popupMessage:
        process.env.RETELL_WIDGET_POPUP_MESSAGE || "Need help with an order? Chat with us here.",
      showAiPopup: process.env.RETELL_WIDGET_SHOW_AI_POPUP || "true",
      showAiPopupTime: process.env.RETELL_WIDGET_SHOW_AI_POPUP_TIME || "4",
      autoOpen: process.env.RETELL_WIDGET_AUTO_OPEN || "false",
    },
  });
};
