import { didCrossWithCandle } from "./cross.js";
import { executeAlertTrigger } from "./execute-trigger.js";
import { normalizeBybitSymbol } from "./bybit-symbol.js";
import { fetchRecentKlines } from "./bybit-kline-fetch.js";

/** alert key -> last price for cross detection */
const lastPriceByAlert = new Map();

/** alert key -> candle time of last baseline */
const lastCandleTimeByAlert = new Map();

export function alertKey(row) {
  return `${row.user_id}::${normalizeBybitSymbol(row.symbol)}::${row.shape_id}`;
}

export function pruneWatchState(activeAlerts) {

  for (const key of lastPriceByAlert.keys()) {
    if (!activeAlerts.has(key)) {
      lastPriceByAlert.delete(key);
      lastCandleTimeByAlert.delete(key);
    }
  }

}

/**
 * REST backfill для новых алертов: prev = close предыдущей свечи.
 * Без этого первый WS-тик только ставит baseline и пропускает уже случившийся cross.
 */
export async function seedMissingAlertBaselines(
  activeAlerts
) {

  const topics = new Map();

  for (const [key, alert] of activeAlerts) {

    if (lastPriceByAlert.has(key)) {
      continue;
    }

    const sym =
      normalizeBybitSymbol(alert.symbol);
    const tf =
      String(alert.tf || "60");
    const topicKey =
      `${sym}::${tf}`;

    if (!topics.has(topicKey)) {
      topics.set(
        topicKey,
        { sym, tf, keys: [] }
      );
    }

    topics.get(topicKey).keys.push(key);

  }

  await Promise.all(
    [...topics.values()].map(async ({ sym, tf, keys }) => {

      const candles =
        await fetchRecentKlines(
          sym,
          tf,
          2
        );

      if (!candles.length) {
        return;
      }

      const prevBar =
        candles.length > 1
          ? candles[candles.length - 2]
          : null;
      const lastBar =
        candles[candles.length - 1];

      const prevClose =
        Number(prevBar?.close);
      const lastOpen =
        Number(lastBar?.open);

      const seed =
        Number.isFinite(prevClose)
          ? prevClose
          : (
            Number.isFinite(lastOpen)
              ? lastOpen
              : NaN
          );

      if (!Number.isFinite(seed)) {
        return;
      }

      for (const key of keys) {
        if (!lastPriceByAlert.has(key)) {
          lastPriceByAlert.set(key, seed);

          if (lastBar?.time != null) {
            lastCandleTimeByAlert.set(
              key,
              lastBar.time
            );
          }
        }
      }

    })
  );

}

export async function evaluateAlertsForCandle(
  activeAlerts,
  symbol,
  tf,
  candle
) {

  const sym =
    normalizeBybitSymbol(symbol);
  const tfNorm = String(tf || "60");
  const close = Number(candle?.close);

  if (!Number.isFinite(close)) {
    return;
  }

  for (const [key, alert] of activeAlerts) {

    if (normalizeBybitSymbol(alert.symbol) !== sym) {
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
      const open = Number(candle.open);
      prev = Number.isFinite(open) ? open : close;
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
