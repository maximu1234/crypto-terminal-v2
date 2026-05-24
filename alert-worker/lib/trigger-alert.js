import { didCrossLine } from "./cross.js";
import {
  formatAlertMessage,
  sendTelegramMessage
} from "./telegram.js";
import { markAlertTriggered } from "./alerts-db.js";

/** alert key -> last price for cross detection */
const lastPriceByAlert = new Map();

export function alertKey(row) {
  return `${row.user_id}::${row.symbol}::${row.shape_id}`;
}

export function pruneWatchState(activeAlerts) {

  for (const key of lastPriceByAlert.keys()) {
    if (!activeAlerts.has(key)) {
      lastPriceByAlert.delete(key);
    }
  }

}

export async function evaluateAlertsForPrice(
  activeAlerts,
  symbol,
  tf,
  price
) {

  const tfNorm = String(tf || "60");

  for (const [key, alert] of activeAlerts) {

    if (alert.symbol !== symbol) {
      continue;
    }

    if (String(alert.tf || "60") !== tfNorm) {
      continue;
    }

    const level = Number(alert.price);

    if (!Number.isFinite(level) || !Number.isFinite(price)) {
      continue;
    }

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
    const marked = await markAlertTriggered(alert.id);

    activeAlerts.delete(key);
    lastPriceByAlert.delete(key);

    if (!marked) {
      console.warn(
        "mark triggered failed",
        alert.symbol,
        alert.id
      );
    }

    const ok = await sendTelegramMessage(
      alert.telegram_chat_id,
      text
    );

    if (ok) {
      console.log(
        "triggered",
        alert.symbol,
        tfNorm,
        level,
        "→",
        alert.telegram_chat_id
      );
    } else {
      console.warn(
        "telegram failed",
        alert.symbol,
        alert.telegram_chat_id
      );
    }

  }

}
