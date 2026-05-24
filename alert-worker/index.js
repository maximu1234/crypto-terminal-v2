import http from "http";
import { createBybitTickerHub } from "./lib/bybit.js";
import { didCrossLine } from "./lib/cross.js";
import {
  fetchTelegramAlerts,
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

function alertKey(row) {
  return `${row.user_id}::${row.symbol}::${row.shape_id}`;
}

async function reloadAlerts(hub) {

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

  if (!telegramConfigured()) {
    console.warn("TELEGRAM_BOT_TOKEN not set — messages disabled");
  }

  const hub = createBybitTickerHub();

  hub.onTick((symbol, price) => {
    onPriceTick(hub, symbol, price).catch(err => {
      console.warn("onPriceTick:", err);
    });
  });

  await reloadAlerts(hub);

  setInterval(() => {
    reloadAlerts(hub).catch(err => {
      console.warn("reloadAlerts:", err);
    });
  }, RELOAD_MS);

  const server = http.createServer((req, res) => {

    if (req.url === "/health" || req.url === "/") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({
        ok: true,
        alerts: activeAlerts.size,
        telegram: telegramConfigured()
      }));
      return;
    }

    res.writeHead(404);
    res.end();

  });

  server.listen(PORT, () => {
    console.log(`alert-worker listening :${PORT}`);
  });

}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
