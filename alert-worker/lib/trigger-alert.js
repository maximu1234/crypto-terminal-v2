import { didCrossWithCandle } from "./cross.js";
import { executeAlertTrigger } from "./execute-trigger.js";

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

export async function evaluateAlertsForCandle(
  activeAlerts,
  symbol,
  tf,
  candle
) {

  const tfNorm = String(tf || "60");
  const close = Number(candle?.close);

  if (!Number.isFinite(close)) {
    return;
  }

  for (const [key, alert] of activeAlerts) {

    if (alert.symbol !== symbol) {
      continue;
    }

    if (String(alert.tf || "60") !== tfNorm) {
      continue;
    }

    const level = Number(alert.price);

    if (!Number.isFinite(level)) {
      continue;
    }

    let prev = lastPriceByAlert.get(key);

    if (prev === undefined) {
      lastPriceByAlert.set(key, close);
      continue;
    }

    if (!didCrossWithCandle(prev, candle, level)) {
      lastPriceByAlert.set(key, close);
      continue;
    }

    const result =
      await executeAlertTrigger(alert.id);

    activeAlerts.delete(key);
    lastPriceByAlert.delete(key);

    if (!result.ok) {
      continue;
    }

    if (result.telegram) {
      console.log(
        "triggered",
        alert.symbol,
        tfNorm,
        level,
        "→",
        alert.telegram_chat_id
      );
    } else if (alert.telegram_chat_id != null) {
      console.warn(
        "telegram failed",
        alert.symbol,
        alert.telegram_chat_id
      );
    } else {
      console.log(
        "triggered (no telegram chat)",
        alert.symbol,
        tfNorm,
        level
      );
    }

  }

}
