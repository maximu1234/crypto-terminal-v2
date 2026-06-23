import { didCrossWithCandle } from "./cross.js";
import { executeAlertTrigger } from "./execute-trigger.js";

/** alert key -> last price for cross detection */
const lastPriceByAlert = new Map();

/** alert key -> candle time of last baseline */
const lastCandleTimeByAlert = new Map();

export function alertKey(row) {
  return `${row.user_id}::${row.symbol}::${row.shape_id}`;
}

export function pruneWatchState(activeAlerts) {

  for (const key of lastPriceByAlert.keys()) {
    if (!activeAlerts.has(key)) {
      lastPriceByAlert.delete(key);
      lastCandleTimeByAlert.delete(key);
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
    const candleTime = candle?.time;

    if (prev === undefined) {
      lastPriceByAlert.set(key, close);
      if (candleTime != null) {
        lastCandleTimeByAlert.set(key, candleTime);
      }
      continue;
    }

    const sameBar =
      candleTime != null &&
      lastCandleTimeByAlert.get(key) === candleTime;

    if (!didCrossWithCandle(prev, candle, level, { sameBar })) {
      lastPriceByAlert.set(key, close);
      if (candleTime != null) {
        lastCandleTimeByAlert.set(key, candleTime);
      }
      continue;
    }

    const result =
      await executeAlertTrigger(
        alert.id,
        {
          trigger_price: close
        }
      );

    activeAlerts.delete(key);
    lastPriceByAlert.delete(key);
    lastCandleTimeByAlert.delete(key);

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
