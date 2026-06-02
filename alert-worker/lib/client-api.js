import { getWorkerConfig } from "./config.js";
import {
  restUpsertPriceAlert,
  restUpsertUserDrawing
} from "./supabase-rest.js";
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

/**
 * POST /push-drawing — запись рисунка в user_drawings (service role, для iPad/Safari).
 */
async function handleClientPushDrawing(
  req,
  res
) {

  const path =
    (req.url || "").split("?")[0];

  if (path !== "/push-drawing") {
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
  const shape =
    body.shape;

  if (
    !sym ||
    !sid ||
    !shape ||
    typeof shape !== "object"
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

  const revMs =
    Number(body.updated_at_ms) ||
    Date.parse(body.updated_at || "") ||
    Date.now();

  const row = {
    user_id: user.id,
    symbol: sym,
    shape_id: sid,
    shape,
    updated_at: new Date(revMs).toISOString()
  };

  if (body.deleted_at === null) {
    row.deleted_at = null;
  }

  try{
    const saved = await restUpsertUserDrawing(row);

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({
      ok: true,
      id: saved?.id || null
    }));
  }catch(err){
    const msg =
      String(err?.message || err);

    if (/deleted_at|PGRST204|42703/i.test(msg)) {
      try{
        delete row.deleted_at;
        const saved = await restUpsertUserDrawing(row);
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({
          ok: true,
          id: saved?.id || null
        }));
        return true;
      }catch(err2){
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({
          ok: false,
          error: err2.message
        }));
        return true;
      }
    }

    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({
      ok: false,
      error: msg
    }));
  }

  return true;

}

/**
 * POST /delete-alert — удаление активного алерта (service role, hard DELETE).
 */
async function handleClientDeleteAlert(
  req,
  res
) {

  const path =
    (req.url || "").split("?")[0];

  if (path !== "/delete-alert") {
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

  const alertId =
    String(
      body.alert_id ||
      body.alertId ||
      body.id ||
      ""
    ).trim();
  const sym =
    String(body.symbol || "").trim().toUpperCase();
  const sid =
    String(body.shape_id || body.shapeId || "").trim();

  if (
    !alertId &&
    (
      !sym ||
      !sid
    )
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

  const { restDelete } =
    await import("./supabase-rest.js");

  let restPath =
    "";

  if (alertId) {
    restPath =
      "price_alerts?id=eq." +
      encodeURIComponent(alertId) +
      "&user_id=eq." +
      encodeURIComponent(user.id);
  } else {
    restPath =
      "price_alerts?user_id=eq." +
      encodeURIComponent(user.id) +
      "&symbol=eq." +
      encodeURIComponent(sym) +
      "&shape_id=eq." +
      encodeURIComponent(sid);
  }

  try{
    await restDelete(restPath);
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: true }));
  }catch(err){
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({
      ok: false,
      error: err.message
    }));
  }

  return true;

}

/**
 * POST /delete-drawing — удаление рисунка в user_drawings (service role).
 */
async function handleClientDeleteDrawing(
  req,
  res
) {

  const path =
    (req.url || "").split("?")[0];

  if (path !== "/delete-drawing") {
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

  if (
    !sym ||
    !sid
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

  const { restDeleteReturning } =
    await import("./supabase-rest.js");

  const restPath =
    "user_drawings?user_id=eq." +
    encodeURIComponent(user.id) +
    "&symbol=eq." +
    encodeURIComponent(sym) +
    "&shape_id=eq." +
    encodeURIComponent(sid);

  try{
    const deleted =
      await restDeleteReturning(restPath);

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({
      ok: true,
      deleted: deleted.length
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

  if (await handleClientPushDrawing(req, res)) {
    return true;
  }

  if (await handleClientDeleteAlert(req, res)) {
    return true;
  }

  if (await handleClientDeleteDrawing(req, res)) {
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
