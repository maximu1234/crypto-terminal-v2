import { getWorkerConfig } from "./config.js";
import {
  restUpsertPriceAlert,
  restUpsertSystemSetting
} from "./supabase-rest.js";
import {
  invalidateTelegramAlertsReloadCache,
  fetchTelegramChatId
} from "./alerts-db.js";
import { handleClientTrigger } from "./client-trigger.js";
import { handleClientNotifyTelegram } from "./client-notify-telegram.js";
import { sendTelegramMessage } from "./telegram.js";
import { requestWorkerReload } from "./reload-request.js";
import {
  readJsonBody,
  setCors,
  verifyUserFromRequest
} from "./client-http.js";
import {
  getReloadIntervalMs,
  getReloadIntervalLimitsMs,
  ensureReloadIntervalHydrated,
  saveReloadIntervalSeconds
} from "./reload-interval.js";

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
      exchange_id:
        String(
          body.exchange_id ||
          body.exchangeId ||
          "bybit"
        ).trim().toLowerCase(),
      triggered_at: null
    });

    invalidateTelegramAlertsReloadCache();
    requestWorkerReload(
      "push-alert",
      { force: true }
    );

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

  const { restDeleteReturning, restPatchReturning } =
    await import("./supabase-rest.js");

  const userFilter =
    "user_id=eq." +
    encodeURIComponent(user.id);

  try{
    let deleted = 0;

    if (alertId) {
      const rows =
        await restDeleteReturning(
          "price_alerts?id=eq." +
          encodeURIComponent(alertId) +
          "&" +
          userFilter
        );
      deleted += rows.length;
    }

    if (
      deleted === 0 &&
      sym &&
      sid
    ) {
      const rows =
        await restDeleteReturning(
          "price_alerts?" +
          userFilter +
          "&symbol=eq." +
          encodeURIComponent(sym) +
          "&shape_id=eq." +
          encodeURIComponent(sid)
        );
      deleted += rows.length;
    }

    if (
      deleted === 0 &&
      sym &&
      sid
    ) {
      const rows =
        await restPatchReturning(
          "price_alerts?" +
          userFilter +
          "&symbol=eq." +
          encodeURIComponent(sym) +
          "&shape_id=eq." +
          encodeURIComponent(sid) +
          "&deleted_at=is.null",
          {
            deleted_at: new Date().toISOString()
          }
        );
      deleted += rows.length;
    }

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({
      ok: deleted > 0,
      deleted
    }));
    if (deleted > 0) {
      invalidateTelegramAlertsReloadCache();
      requestWorkerReload(
        "delete-alert",
        { force: true }
      );
    }
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
 * POST /admin/purge-alert-garbage — мусор price_alerts / price_alert_events для аккаунта админа.
 */
async function handleClientAdminPurgeAlertGarbage(
  req,
  res
) {

  const path =
    (req.url || "").split("?")[0];

  if (path !== "/admin/purge-alert-garbage") {
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

  const { verifySystemAdminFromRequest } =
    await import("./admin-auth.js");

  const admin =
    await verifySystemAdminFromRequest(req);

  if (!admin) {
    res.writeHead(403, { "Content-Type": "application/json" });
    res.end(JSON.stringify({
      ok: false,
      error: "admin_required"
    }));
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

  if (
    body?.confirm !== "PURGE_ALERT_GARBAGE"
  ) {
    res.writeHead(400, { "Content-Type": "application/json" });
    res.end(JSON.stringify({
      ok: false,
      error: "confirm_required"
    }));
    return true;
  }

  const cfg = getWorkerConfig();

  if (!cfg.ready) {
    res.writeHead(503, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: false, error: "worker_not_ready" }));
    return true;
  }

  const { purgeAlertGarbageForUser } =
    await import("./admin-purge-alerts.js");

  try{
    const stats =
      await purgeAlertGarbageForUser(
        admin.id,
        Array.isArray(
          body?.keepActive
        )
          ? body.keepActive
          : []
      );

    console.warn(
      `[admin] purge-alert-garbage by ${admin.email}: ` +
      `zombies=${stats.deletedZombies}, ` +
      `soft=${stats.deletedSoft}, ` +
      `orphans=${stats.deletedOrphans}, ` +
      `events=${stats.deletedEvents}, ` +
      `kept=${stats.keptActive}`
    );

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({
      ok: true,
      by: admin.email,
      ...stats
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
 * GET/POST /admin/worker-reload-ms — период reload списка алертов.
 */
async function handleClientAdminWorkerReloadMs(
  req,
  res
) {

  const path =
    (req.url || "").split("?")[0];

  if (path !== "/admin/worker-reload-ms") {
    return false;
  }

  setCors(res, req);

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return true;
  }

  const { verifySystemAdminFromRequest } =
    await import("./admin-auth.js");

  const admin =
    await verifySystemAdminFromRequest(req);

  if (!admin) {
    res.writeHead(403, { "Content-Type": "application/json" });
    res.end(JSON.stringify({
      ok: false,
      error: "admin_required"
    }));
    return true;
  }

  if (req.method === "GET") {
    await ensureReloadIntervalHydrated();

    const limits =
      getReloadIntervalLimitsMs();
    const reloadMs =
      getReloadIntervalMs();

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({
      ok: true,
      reloadMs,
      reloadSec: Math.round(reloadMs / 1000),
      minMs: limits.min,
      maxMs: limits.max,
      minSec: Math.round(limits.min / 1000),
      maxSec: Math.round(limits.max / 1000)
    }));
    return true;
  }

  if (req.method !== "POST") {
    res.writeHead(405);
    res.end("Method not allowed");
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

  try{
    const appliedMs =
      await saveReloadIntervalSeconds(Number(body?.seconds));
    const limits =
      getReloadIntervalLimitsMs();

    console.warn(
      `[admin] worker-reload-ms by ${admin.email}: ${appliedMs}ms`
    );

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({
      ok: true,
      reloadMs: appliedMs,
      reloadSec: Math.round(appliedMs / 1000),
      minSec: Math.round(limits.min / 1000),
      maxSec: Math.round(limits.max / 1000),
      by: admin.email
    }));
  }catch(err){
    res.writeHead(400, { "Content-Type": "application/json" });
    res.end(JSON.stringify({
      ok: false,
      error: err?.message || "bad_reload_ms"
    }));
  }

  return true;

}

/**
 * POST /admin/worker-canary-alert — тестовый Telegram alert для админа.
 */
async function handleClientAdminWorkerCanaryAlert(
  req,
  res
) {

  const path =
    (req.url || "").split("?")[0];

  if (path !== "/admin/worker-canary-alert") {
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

  const { verifySystemAdminFromRequest } =
    await import("./admin-auth.js");

  const admin =
    await verifySystemAdminFromRequest(req);

  if (!admin) {
    res.writeHead(403, { "Content-Type": "application/json" });
    res.end(JSON.stringify({
      ok: false,
      error: "admin_required"
    }));
    return true;
  }

  try{
    const chatId =
      await fetchTelegramChatId(admin.id);

    if (chatId == null) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({
        ok: false,
        error: "telegram_chat_missing"
      }));
      return true;
    }

    const ts =
      new Date().toISOString();
    const sent =
      await sendTelegramMessage(
        chatId,
        `CONTROL ALERT\nWorker canary check\n${ts}`
      );

    if (!sent) {
      throw new Error("telegram_send_failed");
    }

    await restUpsertSystemSetting(
      "alerts_worker_canary",
      {
        sentAt: ts,
        by: admin.email
      }
    );

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({
      ok: true,
      sentAt: ts
    }));
  }catch(err){
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({
      ok: false,
      error: err?.message || "canary_failed"
    }));
  }

  return true;

}

/**
 * POST /reload-hint — браузер записал алерт через REST; перечитать Supabase сразу.
 */
async function handleClientReloadHint(
  req,
  res
) {

  const path =
    (req.url || "").split("?")[0];

  if (path !== "/reload-hint") {
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

  const cfg = getWorkerConfig();

  if (!cfg.ready) {
    res.writeHead(503, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: false, error: "worker_not_ready" }));
    return true;
  }

  invalidateTelegramAlertsReloadCache();
  requestWorkerReload(
    "client-hint",
    { force: true }
  );

  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ ok: true }));
  return true;

}

export async function handleClientApi(
  req,
  res
) {

  if (await handleClientPushAlert(req, res)) {
    return true;
  }

  if (await handleClientDeleteAlert(req, res)) {
    return true;
  }

  if (await handleClientAdminPurgeAlertGarbage(req, res)) {
    return true;
  }

  if (await handleClientAdminWorkerReloadMs(req, res)) {
    return true;
  }

  if (await handleClientAdminWorkerCanaryAlert(req, res)) {
    return true;
  }

  if (await handleClientTrigger(req, res)) {
    return true;
  }

  if (await handleClientNotifyTelegram(req, res)) {
    return true;
  }

  if (await handleClientReloadHint(req, res)) {
    return true;
  }

  return false;

}
