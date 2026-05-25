import { getWorkerConfig } from "./config.js";
import { restUpsertPriceAlert } from "./supabase-rest.js";
import { handleClientTrigger } from "./client-trigger.js";
import { handleClientNotifyTelegram } from "./client-notify-telegram.js";
import {
  readJsonBody,
  setCors,
  verifyUserFromRequest
} from "./client-http.js";

function normalizeTf(tf) {

  if (
    tf == null ||
    tf === ""
  ) {
    return "60";
  }

  return String(tf);

}

/**
 * POST /push-alert — запись алерта в Supabase (service role, обходит сбой браузерного upsert).
 */
async function handleClientPushAlert(
  req,
  res
) {

  const path =
    (req.url || "").split("?")[0];

  if (path !== "/push-alert") {
    return false;
  }

  setCors(res, req);

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return true;
  }

  if (req.method !== "POST") {
    res.writeHead(405);
    res.end("Method not allowed");
    return true;
  }

  const user =
    await verifyUserFromRequest(req);

  if (!user) {
    res.writeHead(401, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: false, error: "invalid_token" }));
    return true;
  }

  let body;

  try{
    body = await readJsonBody(req);
  }catch(err){
    res.writeHead(400, { "Content-Type": "application/json" });
    res.end(JSON.stringify({
      ok: false,
      error: err.message
    }));
    return true;
  }

  const sym =
    String(body.symbol || "").trim().toUpperCase();
  const sid =
    String(body.shape_id || body.shapeId || "").trim();
  const price =
    Number(body.price);

  if (
    !sym ||
    !sid ||
    !Number.isFinite(price)
  ) {
    res.writeHead(400, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: false, error: "bad_body" }));
    return true;
  }

  const cfg = getWorkerConfig();

  if (!cfg.ready) {
    res.writeHead(503, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: false, error: "worker_not_ready" }));
    return true;
  }

  try{
    const saved = await restUpsertPriceAlert({
      user_id: user.id,
      symbol: sym,
      shape_id: sid,
      price,
      tf: normalizeTf(body.tf),
      triggered_at: null
    });

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({
      ok: true,
      id: saved?.id || null
    }));
  }catch(err){
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({
      ok: false,
      error: err.message
    }));
  }

  return true;

}

export async function handleClientApi(
  req,
  res
) {

  if (await handleClientPushAlert(req, res)) {
    return true;
  }

  if (await handleClientTrigger(req, res)) {
    return true;
  }

  if (await handleClientNotifyTelegram(req, res)) {
    return true;
  }

  return false;

}
