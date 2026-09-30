/**
 * MACD math for MACD Flip Touch (TV defaults: 12/26/9 EMA close).
 * Duplicated from js/indicators/macd-math.js — no indicator imports in bot path.
 */

export const MACD_FLIP_FAST_DEFAULT = 12;
export const MACD_FLIP_SLOW_DEFAULT = 26;
export const MACD_FLIP_SIGNAL_DEFAULT = 9;

const SOURCES = new Set(["close", "open", "high", "low", "hl2", "hlc3", "ohlc4"]);
const MA_TYPES = new Set(["ema", "sma"]);

function clampInt(value, min, max, fallback) {
  const n = Math.round(Number(value));
  if (!Number.isFinite(n)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, n));
}

/**
 * @param {object} prefs normalized MACD flip prefs
 */
export function macdSettingsFromFlipPrefs(prefs) {
  const p = prefs && typeof prefs === "object" ? prefs : {};
  const source = String(p.source || "").toLowerCase();
  const oscillatorMa = String(p.oscillatorMa || "").toLowerCase();
  const signalMa = String(p.signalMa || "").toLowerCase();
  return {
    fastLength: clampInt(p.fastLength, 2, 999, MACD_FLIP_FAST_DEFAULT),
    slowLength: clampInt(p.slowLength, 2, 999, MACD_FLIP_SLOW_DEFAULT),
    signalLength: clampInt(p.signalLength, 1, 999, MACD_FLIP_SIGNAL_DEFAULT),
    source: SOURCES.has(source) ? source : "close",
    oscillatorMa: MA_TYPES.has(oscillatorMa) ? oscillatorMa : "ema",
    signalMa: MA_TYPES.has(signalMa) ? signalMa : "ema"
  };
}

export function macdSourceValue(bar, source = "close") {
  const open = Number(bar?.open);
  const high = Number(bar?.high);
  const low = Number(bar?.low);
  const close = Number(bar?.close);
  switch (source) {
    case "open":
      return open;
    case "high":
      return high;
    case "low":
      return low;
    case "hl2":
      return (high + low) / 2;
    case "hlc3":
      return (high + low + close) / 3;
    case "ohlc4":
      return (open + high + low + close) / 4;
    default:
      return close;
  }
}

function smaAt(values, period, endIndex) {
  let sum = 0;
  for (let i = endIndex - period + 1; i <= endIndex; i++) {
    const v = values[i];
    if (v == null || !Number.isFinite(v)) {
      return null;
    }
    sum += v;
  }
  return sum / period;
}

function movingAverage(values, period, type) {
  const out = new Array(values.length).fill(null);
  if (!Array.isArray(values) || period < 1 || values.length < period) {
    return out;
  }
  let start = -1;
  for (let i = 0; i < values.length; i++) {
    if (Number.isFinite(values[i])) {
      start = i;
      break;
    }
  }
  if (start < 0 || start + period > values.length) {
    return out;
  }
  if (type === "sma") {
    for (let i = start + period - 1; i < values.length; i++) {
      out[i] = smaAt(values, period, i);
    }
    return out;
  }
  let sum = 0;
  for (let i = start; i < start + period; i++) {
    const v = values[i];
    if (!Number.isFinite(v)) {
      return out;
    }
    sum += v;
  }
  const k = 2 / (period + 1);
  let ema = sum / period;
  out[start + period - 1] = ema;
  for (let i = start + period; i < values.length; i++) {
    const v = values[i];
    if (!Number.isFinite(v)) {
      continue;
    }
    ema = (v - ema) * k + ema;
    out[i] = ema;
  }
  return out;
}

/**
 * @param {Array<{ time?: number, open?: number, high?: number, low?: number, close?: number }>} candles
 * @param {ReturnType<typeof macdSettingsFromFlipPrefs>} settings
 * @returns {{ macd: number[], signal: number[] }}
 */
export function computeMacdLineSignalArrays(candles, settings) {
  const rows = Array.isArray(candles) ? candles : [];
  const opts = macdSettingsFromFlipPrefs(settings);
  const macd = new Array(rows.length).fill(NaN);
  const signal = new Array(rows.length).fill(NaN);
  if (!rows.length) {
    return { macd, signal };
  }
  const src = rows.map((bar) => macdSourceValue(bar, opts.source));
  const fastMa = movingAverage(src, opts.fastLength, opts.oscillatorMa);
  const slowMa = movingAverage(src, opts.slowLength, opts.oscillatorMa);
  const macdRaw = src.map((_, i) => {
    const fast = fastMa[i];
    const slow = slowMa[i];
    if (!Number.isFinite(fast) || !Number.isFinite(slow)) {
      return null;
    }
    return fast - slow;
  });
  const signalMa = movingAverage(macdRaw, opts.signalLength, opts.signalMa);
  for (let i = 0; i < rows.length; i++) {
    const m = macdRaw[i];
    const s = signalMa[i];
    if (Number.isFinite(m)) {
      macd[i] = m;
    }
    if (Number.isFinite(s)) {
      signal[i] = s;
    }
  }
  return { macd, signal };
}
