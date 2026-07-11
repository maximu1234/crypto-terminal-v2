import http from "http";
import { createBybitKlineHub } from "./lib/bybit-kline.js";
import { createBybitTickerHub } from "./lib/bybit.js";
import { getConfigStatus, getWorkerConfig } from "./lib/config.js";
import {
  fetchTelegramAlerts,
  fetchAlertDiagnostics,
  resolveTelegramAlertsReload
} from "./lib/alerts-db.js";
import {
  telegramConfigured
} from "./lib/telegram.js";
import {
  alertKey,
  pruneWatchState,
  evaluateAlertsForCandle,
  evaluateAlertsForTicker,
  seedMissingAlertBaselines,
  seedTickerBaselines
} from "./lib/trigger-alert.js";
import { handleClientApi } from "./lib/client-api.js";
import { handleBybitProxy } from "./lib/bybit-proxy.js";
import { setPublicCors } from "./lib/client-http.js";
import {
  ensureTelegramWebhook,
  handleTelegramInfo,
  handleTelegramWebhook
} from "./lib/telegram-webhook.js";
import {
  getReloadIntervalMs,
  ensureReloadIntervalHydrated
} from "./lib/reload-interval.js";
import {
  setWorkerReloadRequestHandler
} from "./lib/reload-request.js";

const PORT = Number(process.env.PORT) || 8080;
const WORKER_BUILD = "2026-07-11-ticker";

/** alert key -> row */
let activeAlerts = new Map();
let lastReloadAt = 0;
let lastReloadOk = false;
let lastReloadError = "";
let lastReloadDurationMs = 0;
let reloadCycles = 0;

let configLogged = false;

function logConfigOnce() {

  if (configLogged) {
    return;
  }

  configLogged = true;

  const st = getConfigStatus();

  if (st.ready) {
    console.log("env ok: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, TELEGRAM_BOT_TOKEN");
    return;
  }

  console.error(
    "env missing:",
    st.missing.join(", ")
  );

}

async function reloadAlerts(
  klineHub,
  tickerHub,
  opts = {}
) {
  const startedAt = Date.now();
  const force =
    opts.force === true;

  logConfigOnce();

  const cfg = getWorkerConfig();

  if (!cfg.ready) {
    lastReloadAt = Date.now();
    lastReloadOk = false;
    lastReloadError = "worker_not_ready";
    lastReloadDurationMs = lastReloadAt - startedAt;
    reloadCycles += 1;
    return;
  }

  const { skipped, rows } =
    await resolveTelegramAlertsReload(
      force
        ? { force: true }
        : {}
    );

  if (
    skipped &&
    !force
  ) {
    lastReloadAt = Date.now();
    lastReloadOk = true;
    lastReloadError = "";
    lastReloadDurationMs = lastReloadAt - startedAt;
    reloadCycles += 1;
    return;
  }

  const next = new Map();

  for (const row of rows) {
    const key = alertKey(row);
    next.set(key, row);
    klineHub.ensureKline(row.symbol, row.tf || "60");
    tickerHub.ensureSymbol(row.symbol);
  }

  activeAlerts = next;
  pruneWatchState(activeAlerts);

  try {
    await seedMissingAlertBaselines(activeAlerts);
    await seedTickerBaselines(activeAlerts);
  } catch (err) {
    console.warn(
      "seed alert baselines:",
      err?.message || err
    );
  }

  lastReloadAt = Date.now();
  lastReloadOk = true;
  lastReloadError = "";
  lastReloadDurationMs = lastReloadAt - startedAt;
  reloadCycles += 1;

  console.log(`alerts loaded: ${next.size} active (telegram)`);

}

async function main() {

  await ensureReloadIntervalHydrated();

  const klineHub = createBybitKlineHub();
  const tickerHub = createBybitTickerHub();

  setWorkerReloadRequestHandler(async (_reason, opts = {}) => {
    await reloadAlerts(
      klineHub,
      tickerHub,
      {
        force:
          opts.force !== false
      }
    );
  });

  klineHub.onKline((symbol, tf, candle) => {
    evaluateAlertsForCandle(
      activeAlerts,
      symbol,
      tf,
      candle
    ).catch(err => {
      console.warn("evaluate kline:", err.message);
    });
  });

  tickerHub.onTick((symbol, price, prev) => {
    evaluateAlertsForTicker(
      activeAlerts,
      symbol,
      price,
      prev
    ).catch(err => {
      console.warn("evaluate ticker:", err.message);
    });
  });

  const server = http.createServer(async (req, res) => {

    try{

    if (await handleBybitProxy(req, res)) {
      return;
    }

    if (await handleClientApi(req, res)) {
      return;
    }

    if (await handleTelegramWebhook(req, res)) {
      return;
    }

    if (await handleTelegramInfo(req, res)) {
      return;
    }

    const pathOnly =
      (req.url || "").split("?")[0];

    if (pathOnly === "/health" || pathOnly === "/") {
      setPublicCors(res, req);
      if (req.method === "OPTIONS") {
        res.writeHead(204);
        res.end();
        return;
      }
      const st = getConfigStatus();
      const diag = await fetchAlertDiagnostics().catch(() => null);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({
        ok: st.ready,
        build: WORKER_BUILD,
        alerts: activeAlerts.size,
        telegram: telegramConfigured(),
        config: st,
        diag,
        reload: {
          intervalMs: getReloadIntervalMs(),
          cycles: reloadCycles,
          lastReloadAt: lastReloadAt || null,
          lastReloadOk,
          lastReloadError: lastReloadError || null,
          lastReloadDurationMs
        }
      }));
      return;
    }

    if (pathOnly === "/admin/worker-reload-now") {
      const { setCors } =
        await import("./lib/client-http.js");
      setCors(res, req);

      if (req.method === "OPTIONS") {
        res.writeHead(204);
        res.end();
        return;
      }

      if (req.method !== "POST") {
        res.writeHead(405);
        res.end("Method not allowed");
        return;
      }

      const { verifySystemAdminFromRequest } =
        await import("./lib/admin-auth.js");
      const admin =
        await verifySystemAdminFromRequest(req);

      if (!admin) {
        res.writeHead(403, { "Content-Type": "application/json" });
        res.end(JSON.stringify({
          ok: false,
          error: "admin_required"
        }));
        return;
      }

      try{
        await reloadAlerts(klineHub, tickerHub);
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({
          ok: true,
          alerts: activeAlerts.size,
          reload: {
            intervalMs: getReloadIntervalMs(),
            cycles: reloadCycles,
            lastReloadAt: lastReloadAt || null,
            lastReloadOk,
            lastReloadError: lastReloadError || null,
            lastReloadDurationMs
          }
        }));
      }catch(err){
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({
          ok: false,
          error: err?.message || "reload_failed"
        }));
      }
      return;
    }

    res.writeHead(404);
    res.end();

    }catch(err){
    console.error("http handler:", err);

    try{
    const { setCors } =
    await import("./lib/client-http.js");
    setCors(res, req);
    }catch{
    /* ignore */
    }

    if(!res.headersSent){
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({
      ok: false,
      error: err?.message || "internal_error"
    }));
    }

    }

  });

  server.listen(PORT, () => {
    console.log(`alert-worker listening :${PORT}`);
    ensureTelegramWebhook().catch(err => {
      console.warn("telegram webhook:", err.message);
    });
    reloadAlerts(klineHub, tickerHub).catch(err => {
      console.warn("reloadAlerts:", err.message);
    });
  });

  function scheduleReloadTick() {

    const waitMs =
      getReloadIntervalMs();

    setTimeout(() => {
      reloadAlerts(klineHub, tickerHub).catch(err => {
        console.warn("reloadAlerts:", err.message);
      }).finally(() => {
        scheduleReloadTick();
      });
    }, waitMs);

  }

  scheduleReloadTick();

}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
