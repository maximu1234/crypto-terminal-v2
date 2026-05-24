import http from "http";
import { createBybitTickerHub } from "./lib/bybit.js";
import { getConfigStatus, getWorkerConfig } from "./lib/config.js";
import { didCrossLine } from "./lib/cross.js";
import {
  fetchTelegramAlerts,
  fetchAlertDiagnostics,
  markAlertTriggered
} from "./lib/alerts-db.js";
import {
  formatAlertMessage,
  sendTelegramMessage,
  telegramConfigured
} from "./lib/telegram.js";

const PORT = Number(process.env.PORT) || 8080;
const RELOAD_MS = Number(process.env.ALERTS_RELOAD_MS) || 8000;

/** alert key -> last seen price */
const lastPriceByAlert = new Map();

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
  console.error(
    "Railway: Variables на этом сервисе → заполните значения → Deployments → Redeploy"
  );

}

function alertKey(row) {
  return `${row.user_id}::${row.symbol}::${row.shape_id}`;
}

async function reloadAlerts(hub) {

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
    hub.ensureSymbol(row.symbol);
  }

  activeAlerts = next;

  for (const key of lastPriceByAlert.keys()) {
    if (!next.has(key)) {
      lastPriceByAlert.delete(key);
    }
  }

  console.log(`alerts loaded: ${next.size} active (telegram)`);

}

async function onPriceTick(hub, symbol, price) {

  if (!getWorkerConfig().ready) {
    return;
  }

  for (const [key, alert] of activeAlerts) {

    if (alert.symbol !== symbol) {
      continue;
    }

    const level = Number(alert.price);
    let prev = lastPriceByAlert.get(key);

    if (prev === undefined) {
      lastPriceByAlert.set(key, price);
      continue;
    }

    if (!didCrossLine(prev, price, level)) {
      lastPriceByAlert.set(key, price);
      continue;
    }

    const text = formatAlertMessage(alert);
    const ok = await sendTelegramMessage(
      alert.telegram_chat_id,
      text
    );

    if (ok) {
      await markAlertTriggered(alert.id);
      activeAlerts.delete(key);
      lastPriceByAlert.delete(key);
      console.log("triggered", alert.symbol, level, "→", alert.telegram_chat_id);
    }

    lastPriceByAlert.set(key, price);

  }

}

async function main() {

  const hub = createBybitTickerHub();

  hub.onTick((symbol, price) => {
    onPriceTick(hub, symbol, price).catch(err => {
      console.warn("onPriceTick:", err);
    });
  });

  const server = http.createServer((req, res) => {

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
    reloadAlerts(hub).catch(err => {
      console.warn("reloadAlerts:", err.message);
    });
  });

  setInterval(() => {
    reloadAlerts(hub).catch(err => {
      console.warn("reloadAlerts:", err.message);
    });
  }, RELOAD_MS);

}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
