import http from "http";
import { createBybitKlineHub } from "./lib/bybit-kline.js";
import { getConfigStatus, getWorkerConfig } from "./lib/config.js";
import {
  fetchTelegramAlerts,
  fetchAlertDiagnostics
} from "./lib/alerts-db.js";
import {
  telegramConfigured
} from "./lib/telegram.js";
import {
  alertKey,
  pruneWatchState,
  evaluateAlertsForCandle
} from "./lib/trigger-alert.js";

const PORT = Number(process.env.PORT) || 8080;
const RELOAD_MS = Number(process.env.ALERTS_RELOAD_MS) || 8000;

/** alert key -> row */
let activeAlerts = new Map();

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

async function reloadAlerts(klineHub) {

  logConfigOnce();

  const cfg = getWorkerConfig();

  if (!cfg.ready) {
    return;
  }

  const rows = await fetchTelegramAlerts();
  const next = new Map();

  for (const row of rows) {
    const key = alertKey(row);
    next.set(key, row);
    klineHub.ensureKline(row.symbol, row.tf || "60");
  }

  activeAlerts = next;
  pruneWatchState(activeAlerts);

  console.log(`alerts loaded: ${next.size} active (telegram)`);

}

async function main() {

  const klineHub = createBybitKlineHub();

  klineHub.onKline((symbol, tf, candle) => {
    evaluateAlertsForCandle(
      activeAlerts,
      symbol,
      tf,
      candle
    ).catch(err => {
      console.warn("evaluate:", err.message);
    });
  });

  const server = http.createServer(async (req, res) => {

    if (req.url === "/health" || req.url === "/") {
      const st = getConfigStatus();
      const diag = await fetchAlertDiagnostics().catch(() => null);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({
        ok: st.ready,
        alerts: activeAlerts.size,
        telegram: telegramConfigured(),
        config: st,
        diag
      }));
      return;
    }

    res.writeHead(404);
    res.end();

  });

  server.listen(PORT, () => {
    console.log(`alert-worker listening :${PORT}`);
    reloadAlerts(klineHub).catch(err => {
      console.warn("reloadAlerts:", err.message);
    });
  });

  setInterval(() => {
    reloadAlerts(klineHub).catch(err => {
      console.warn("reloadAlerts:", err.message);
    });
  }, RELOAD_MS);

}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
