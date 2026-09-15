/**
 * Модель кривой доходности RSI Touch Flip (без Lightweight Charts).
 * Значения — % от бюджета, как колонка «Обзор».
 */
import {
  rsiTouchFlipSplitIndex
} from "./rsi-touch-flip-walkforward.js?v=13";

export const RSI_TOUCH_FLIP_EQUITY_TRAIN_COLOR =
"#2dd4bf";
export const RSI_TOUCH_FLIP_EQUITY_TEST_COLOR =
"#38bdf8";
export const RSI_TOUCH_FLIP_EQUITY_POS_COLOR =
"#22c55e";
export const RSI_TOUCH_FLIP_EQUITY_NEG_COLOR =
"#ef4444";
export const RSI_TOUCH_FLIP_TRADE_WIN_COLOR =
"#26a69a";
export const RSI_TOUCH_FLIP_TRADE_LOSS_COLOR =
"#ef5350";

/**
 * @param {unknown} value
 * @returns {number|null}
 */
export function rsiTouchFlipUnixTime(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) {
    return null;
  }
  return n > 1e12 ? Math.floor(n / 1000) : Math.floor(n);
}

/**
 * @param {Array<{time?:number, value?:number}>} curve
 * @returns {Array<{time:number, value:number}>}
 */
export function normalizeRsiTouchFlipEquityCurve(curve) {
  const out = [];
  let lastTime = null;
  const rows = Array.isArray(curve) ? curve : [];
  for (const row of rows) {
    const time = rsiTouchFlipUnixTime(row?.time);
    const value = Number(row?.value);
    if (time == null || !Number.isFinite(value)) {
      continue;
    }
    if (lastTime != null && time <= lastTime) {
      out[out.length - 1] = { time, value };
      lastTime = time;
      continue;
    }
    out.push({ time, value });
    lastTime = time;
  }
  return out;
}

/**
 * Сумма PnL закрытых сделок на баре выхода, в % от бюджета.
 * @param {Array<{exitIndex?:number, pnl?:number}>} closedTrades
 * @param {Array<{time?:number}>} candles
 * @param {number} capital
 * @returns {Array<{time:number, value:number, color:string}>}
 */
export function buildRsiTouchFlipTradeHistogram(
  closedTrades,
  candles,
  capital
) {
  const rows = Array.isArray(candles) ? candles : [];
  const trades = Array.isArray(closedTrades) ? closedTrades : [];
  const byTime = new Map();
  const cap = Number(capital);
  for (const trade of trades) {
    const idx = Math.floor(Number(trade?.exitIndex));
    const time = rsiTouchFlipUnixTime(rows[idx]?.time);
    const pnl = Number(trade?.pnl);
    if (time == null || !Number.isFinite(pnl)) {
      continue;
    }
    const pct = cap > 0 ? pnl / cap * 100 : pnl;
    byTime.set(time, (byTime.get(time) || 0) + pct);
  }
  return [...byTime.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([time, value]) => ({
      time,
      value,
      color:
        value >= 0
          ? RSI_TOUCH_FLIP_TRADE_WIN_COLOR
          : RSI_TOUCH_FLIP_TRADE_LOSS_COLOR
    }));
}

/**
 * @param {{
 *   equityCurve?: Array,
 *   closedTrades?: Array,
 *   candles?: Array,
 *   capital?: number,
 *   trainPct?: unknown
 * }} input
 */
export function buildRsiTouchFlipEquityModel(input) {
  const candles = Array.isArray(input?.candles) ? input.candles : [];
  const capital = Number(input?.capital);
  const curve = normalizeRsiTouchFlipEquityCurve(input?.equityCurve);
  const histogram = buildRsiTouchFlipTradeHistogram(
    input?.closedTrades,
    candles,
    capital
  );
  const splitIndex = rsiTouchFlipSplitIndex(candles.length, input?.trainPct);
  const splitTime =
    splitIndex > 0
      ? rsiTouchFlipUnixTime(candles[splitIndex]?.time)
      : null;

  const train = [];
  const test = [];
  if (splitTime == null) {
    train.push(...curve);
  } else {
    for (const pt of curve) {
      if (pt.time < splitTime) {
        train.push(pt);
      } else {
        test.push(pt);
      }
    }
    if (train.length && test.length) {
      const bridge = train[train.length - 1];
      if (test[0].time !== bridge.time) {
        test.unshift(bridge);
      }
    } else if (!test.length && train.length) {
      /* split after last point — keep as train */
    }
  }

  const last = curve.length ? curve[curve.length - 1] : null;
  const first = curve.length ? curve[0] : null;

  return {
    line: curve,
    train,
    test,
    histogram,
    splitTime,
    fromTime: first ? first.time : null,
    toTime: last ? last.time : null,
    lastValue: last ? last.value : null,
    lastTime: last ? last.time : null,
    hasSplit: splitTime != null && train.length > 0 && test.length > 0
  };
}
