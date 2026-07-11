import { didCrossWithCandle, didCrossLine } from "./cross.js";
import { executeAlertTrigger } from "./execute-trigger.js";
import { normalizeBybitSymbol } from "./bybit-symbol.js";
import { normalizeWorkerTf } from "./tf-normalize.js";
import { fetchRecentKlines, fetchLastPrice } from "./bybit-kline-fetch.js";

/** alert key -> last price for kline cross detection */
const lastPriceByAlert = new Map();

/** alert key -> candle time of last baseline */
const lastCandleTimeByAlert = new Map();

/** alert key -> last ticker price */
const lastTickerPriceByAlert = new Map();

export function alertKey(row) {
  return `${row.user_id}::${normalizeBybitSymbol(row.symbol)}::${row.shape_id}`;
}

export function pruneWatchState(activeAlerts) {

  for (const key of lastPriceByAlert.keys()) {
    if (!activeAlerts.has(key)) {
      lastPriceByAlert.delete(key);
      lastCandleTimeByAlert.delete(key);
      lastTickerPriceByAlert.delete(key);
    }
  }

  for (const key of lastTickerPriceByAlert.keys()) {
    if (!activeAlerts.has(key)) {
      lastTickerPriceByAlert.delete(key);
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
      normalizeWorkerTf(alert.tf);
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

/**
 * REST lastPrice — baseline для ticker (каждый алерт свой prev).
 */
export async function seedTickerBaselines(
  activeAlerts
) {

  const bySymbol = new Map();

  for (const [key, alert] of activeAlerts) {

    if (lastTickerPriceByAlert.has(key)) {
      continue;
    }

    const sym =
      normalizeBybitSymbol(alert.symbol);

    if (!bySymbol.has(sym)) {
      bySymbol.set(sym, []);
    }

    bySymbol.get(sym).push(key);

  }

  await Promise.all(
    [...bySymbol.entries()].map(async ([sym, keys]) => {

      const price =
        await fetchLastPrice(sym);

      if (!Number.isFinite(price)) {
        return;
      }

      for (const key of keys) {
        if (!lastTickerPriceByAlert.has(key)) {
          lastTickerPriceByAlert.set(key, price);
        }
      }

    })
  );

}

async function claimAlertTrigger(
  activeAlerts,
  key,
  alert,
  triggerPrice,
  channel
) {

  const result =
    await executeAlertTrigger(
      alert.id,
      {
        trigger_price: triggerPrice
      }
    );

  activeAlerts.delete(key);
  lastPriceByAlert.delete(key);
  lastCandleTimeByAlert.delete(key);
  lastTickerPriceByAlert.delete(key);

  if (!result.ok) {
    return;
  }

  const tfNorm =
    normalizeWorkerTf(alert.tf);
  const level =
    Number(alert.price);

  if (result.telegram) {
    console.log(
      `triggered (${channel})`,
      alert.symbol,
      tfNorm,
      level,
      "→",
      alert.telegram_chat_id
    );
  } else if (alert.telegram_chat_id != null) {
    console.warn(
      `telegram failed (${channel})`,
      alert.symbol,
      alert.telegram_chat_id
    );
  } else {
    console.log(
      `triggered (${channel}, no telegram chat)`,
      alert.symbol,
      tfNorm,
      level
    );
  }

}

/**
 * Bybit tickers.{symbol} — основной триггер при закрытом приложении.
 */
export async function evaluateAlertsForTicker(
  activeAlerts,
  symbol,
  price,
  hubPrev
) {

  const sym =
    normalizeBybitSymbol(symbol);
  const curr =
    Number(price);

  if (!Number.isFinite(curr)) {
    return;
  }

  for (const [key, alert] of activeAlerts) {

    if (normalizeBybitSymbol(alert.symbol) !== sym) {
      continue;
    }

    const level =
      Number(alert.price);

    if (!Number.isFinite(level)) {
      continue;
    }

    let prev =
      lastTickerPriceByAlert.get(key);

    if (
      prev === undefined &&
      hubPrev != null &&
      Number.isFinite(Number(hubPrev))
    ) {
      prev = Number(hubPrev);
    }

    if (!Number.isFinite(prev)) {
      lastTickerPriceByAlert.set(key, curr);
      continue;
    }

    if (!didCrossLine(prev, curr, level)) {
      lastTickerPriceByAlert.set(key, curr);
      continue;
    }

    await claimAlertTrigger(
      activeAlerts,
      key,
      alert,
      curr,
      "ticker"
    );

  }

}

export async function evaluateAlertsForCandle(
  activeAlerts,
  symbol,
  tf,
  candle
) {

  const sym =
    normalizeBybitSymbol(symbol);
  const tfNorm =
    normalizeWorkerTf(tf);
  const close = Number(candle?.close);

  if (!Number.isFinite(close)) {
    return;
  }

  for (const [key, alert] of activeAlerts) {

    if (normalizeBybitSymbol(alert.symbol) !== sym) {
      continue;
    }

    if (normalizeWorkerTf(alert.tf) !== tfNorm) {
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

    await claimAlertTrigger(
      activeAlerts,
      key,
      alert,
      close,
      "kline"
    );

  }

}
