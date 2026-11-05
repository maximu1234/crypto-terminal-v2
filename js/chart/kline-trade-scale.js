/**
 * Bybit sometimes keeps last-price klines on the pre-multiplier scale
 * after a contract rescale (SOXXUSDT: history ~146, trades and index ~438,
 * ratio 3.000). Painting the trade price onto that history draws one
 * candle across both scales. When the live price is an integer multiple
 * of the loaded closes, move the whole series onto the trade scale.
 * A real pump is not an exact integer, so it stays untouched.
 */

const scales = new WeakMap();

const MIN_FACTOR = 2;
const MAX_FACTOR = 10;
const FACTOR_TOLERANCE = 0.012;
const MIXED_RANGE = 2.2;

export function integerPriceScale(ratio) {
  if (!Number.isFinite(ratio) || ratio <= 0) {
    return 1;
  }

  const pick = (unit) => {
    const nearest = Math.round(unit);
    if (nearest < MIN_FACTOR || nearest > MAX_FACTOR) {
      return 0;
    }
    if (Math.abs(unit - nearest) / nearest > FACTOR_TOLERANCE) {
      return 0;
    }
    return nearest;
  };

  const up = pick(ratio);
  if (up) {
    return up;
  }

  const down = pick(1 / ratio);
  if (down) {
    return 1 / down;
  }

  return 1;
}

function lastOhlcClose(candles) {
  if (!Array.isArray(candles)) {
    return null;
  }

  for (let i = candles.length - 1; i >= 0; i--) {
    const close = Number(candles[i]?.close);
    if (Number.isFinite(close) && close > 0) {
      return close;
    }
  }

  return null;
}

function recentRangeRatio(candles) {
  let hi = -Infinity;
  let lo = Infinity;
  let n = 0;

  for (let i = candles.length - 1; i >= 0 && n < 48; i--) {
    const high = Number(candles[i]?.high);
    const low = Number(candles[i]?.low);
    if (!Number.isFinite(high) || !Number.isFinite(low) || low <= 0) {
      continue;
    }
    hi = Math.max(hi, high);
    lo = Math.min(lo, low);
    n += 1;
  }

  if (n < 3 || !(lo > 0)) {
    return Infinity;
  }

  return hi / lo;
}

function scaleOhlc(bar, factor) {
  const next = { ...bar };
  for (const key of ["open", "high", "low", "close"]) {
    const n = Number(bar?.[key]);
    if (Number.isFinite(n)) {
      next[key] = n * factor;
    }
  }
  return next;
}

function closerWhenScaled(close, last, factor) {
  const raw = Math.abs(Math.log(close / last));
  const scaled = Math.abs(Math.log((close * factor) / last));
  return scaled < raw;
}

/**
 * @returns {boolean} true when the series was moved onto the trade scale
 */
export function alignCandlesToTradePrice(candles, tradePrice) {
  const px = Number(tradePrice);
  const last = lastOhlcClose(candles);

  if (!Number.isFinite(px) || px <= 0 || !last) {
    return false;
  }

  const factor = integerPriceScale(px / last);
  if (factor === 1 || recentRangeRatio(candles) > MIXED_RANGE) {
    return false;
  }

  for (let i = 0; i < candles.length; i++) {
    const close = Number(candles[i]?.close);
    if (!Number.isFinite(close)) {
      continue;
    }
    candles[i] = scaleOhlc(candles[i], factor);
  }

  const stored = scales.get(candles) || 1;
  scales.set(candles, stored * factor);
  return true;
}

export function scaleIncomingKline(candles, bar) {
  const factor = scales.get(candles);
  if (!factor || factor === 1 || !bar) {
    return bar;
  }

  const close = Number(bar.close);
  const last = lastOhlcClose(candles);
  if (!Number.isFinite(close) || close <= 0 || !last) {
    return bar;
  }

  if (!closerWhenScaled(close, last, factor)) {
    return bar;
  }

  return scaleOhlc(bar, factor);
}

/**
 * Older history pages stay on the pre-multiplier scale. Rebase those
 * bars onto the same factor as the candles already on screen.
 */
export function rebaseMergedCandles(previous, merged) {
  const factor = scales.get(previous);
  if (!factor || factor === 1 || !Array.isArray(merged)) {
    return merged;
  }

  const last = lastOhlcClose(previous);
  if (!last) {
    scales.set(merged, factor);
    return merged;
  }

  const out = merged.map((bar) => {
    const close = Number(bar?.close);
    if (!Number.isFinite(close) || close <= 0) {
      return bar;
    }
    if (!closerWhenScaled(close, last, factor)) {
      return bar;
    }
    return scaleOhlc(bar, factor);
  });

  scales.set(out, factor);
  return out;
}
