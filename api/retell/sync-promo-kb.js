"use strict";

const { createSign } = require("node:crypto");

const DEFAULT_GSHEET_ID = "1_OQ3tiHzb0jFrkcg2mwDz-prVLDa-ef5GUijqJwcD_I";
const DEFAULT_RETELL_LLM_ID = "llm_8fd416e61e807947cde596c6ed3b";
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
    scope: "https://www.googleapis.com/auth/spreadsheets.readonly",
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

async function retellRequest(path, { method = "GET", body, formBody } = {}) {
  const apiKey = String(process.env.RETELL_API_KEY || "").trim();
  if (!apiKey) {
    throw new Error("RETELL_API_KEY is not configured");
  }
  const response = await fetch(`https://api.retellai.com${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(formBody ? { "Content-Type": "application/x-www-form-urlencoded" } : {}),
    },
    body: body ? JSON.stringify(body) : formBody ? new URLSearchParams(formBody).toString() : undefined,
  });
  const text = await response.text();
  let payload;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch (_) {
    payload = { raw: text };
  }
  if (!response.ok) {
    throw new Error(
      payload?.message ||
        payload?.error ||
        payload?.raw ||
        `Retell request failed with status ${response.status}`
    );
  }
  return payload;
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return sendJson(res, 405, {
      ok: false,
      message: "Method not allowed. Use POST.",
    });
  }

  const expectedToken = String(process.env.RETELL_FUNCTION_AUTH_TOKEN || "").trim();
  const providedToken = getBearerToken(req);
  if (expectedToken && providedToken !== expectedToken) {
    return sendJson(res, 401, {
      ok: false,
      message: "Unauthorized.",
    });
  }

  try {
    const kbName = process.env.RETELL_PROMO_KB_NAME || "Poppers Promos";
    const llmId = process.env.RETELL_LLM_ID || DEFAULT_RETELL_LLM_ID;

    const [llm, allKbs] = await Promise.all([
      retellRequest(`/get-retell-llm/${llmId}`),
      retellRequest("/list-knowledge-bases"),
    ]);

    const promoKbs = (allKbs || [])
      .filter((kb) => {
        const name = String(kb.knowledge_base_name || "").trim();
        return name === kbName || /promo/i.test(name);
      });
    const promoKbIds = promoKbs
      .map((kb) => kb.knowledge_base_id)
      .filter(Boolean);

    const existingIds = Array.isArray(llm.knowledge_base_ids) ? llm.knowledge_base_ids : [];
    const preservedIds = existingIds.filter((id) => !promoKbIds.includes(id));

    const updatedLlm = await retellRequest(`/update-retell-llm/${llmId}`, {
      method: "PATCH",
      body: {
        general_prompt: llm.general_prompt,
        general_tools: llm.general_tools,
        begin_message: llm.begin_message || "",
        model: llm.model,
        tool_call_strict_mode: llm.tool_call_strict_mode,
        start_speaker: llm.start_speaker,
        kb_config: llm.kb_config,
        knowledge_base_ids: preservedIds,
      },
    });

    const deleteResults = await Promise.all(
      promoKbIds.map(async (knowledgeBaseId) => {
        try {
          await retellRequest(`/delete-knowledge-base/${knowledgeBaseId}`, {
            method: "DELETE",
          });
          return { knowledge_base_id: knowledgeBaseId, deleted: true };
        } catch (error) {
          return {
            knowledge_base_id: knowledgeBaseId,
            deleted: false,
            message: error instanceof Error ? error.message : "Delete failed.",
          };
        }
      })
    );

    return sendJson(res, 200, {
      ok: true,
      message: "Promo knowledge bases removed successfully.",
      data: {
        llm_id: updatedLlm.llm_id,
        removed_knowledge_base_ids: promoKbIds,
        knowledge_base_ids: updatedLlm.knowledge_base_ids || preservedIds,
        delete_results: deleteResults,
      },
    });
  } catch (error) {
    return sendJson(res, 500, {
      ok: false,
      message: error instanceof Error ? error.message : "Promo KB removal failed.",
    });
  }
};
