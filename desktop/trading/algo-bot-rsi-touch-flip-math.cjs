/**
 * RSI Touch Flip — live math (Wilder RSI, OS/OB, stack notional, MTF map).
 * Same formulas as js/algo-trading/rsi-touch-flip-engine.js (analysis copy).
 */

const SIZE_EQUAL = "equal";
const SIZE_AVERAGE = "average";
const SIDE_BOTH = "BOTH";
const SIDE_LONG = "LONG";
const SIDE_SHORT = "SHORT";

function rsiFromAvg(avgGain, avgLoss) {
  if (avgLoss === 0) {
    return 100;
  }
  if (avgGain === 0) {
    return 0;
  }
  return 100 - 100 / (1 + avgGain / avgLoss);
}

/**
 * @param {Array<{close:number}>} candles
 * @param {number} period
 * @returns {number[]}
 */
function computeWilderRsiValues(candles, period) {
  const rows = Array.isArray(candles) ? candles : [];
  const len = Math.max(2, Math.round(Number(period) || 14));
  const out = new Array(rows.length).fill(NaN);

  if (rows.length < len + 1) {
    return out;
  }

  let gainSum = 0;
  let lossSum = 0;

  for (let i = 1; i <= len; i++) {
    const diff = Number(rows[i]?.close) - Number(rows[i - 1]?.close);
    if (!Number.isFinite(diff)) {
      return out;
    }
    if (diff >= 0) {
      gainSum += diff;
    } else {
      lossSum -= diff;
    }
  }

  let avgGain = gainSum / len;
  let avgLoss = lossSum / len;
  out[len] = rsiFromAvg(avgGain, avgLoss);

  for (let i = len + 1; i < rows.length; i++) {
    const diff = Number(rows[i]?.close) - Number(rows[i - 1]?.close);
    if (!Number.isFinite(diff)) {
      out[i] = NaN;
      continue;
    }
    const gain = diff > 0 ? diff : 0;
    const loss = diff < 0 ? -diff : 0;
    avgGain = (avgGain * (len - 1) + gain) / len;
    avgLoss = (avgLoss * (len - 1) + loss) / len;
    out[i] = rsiFromAvg(avgGain, avgLoss);
  }

  return out;
}

/**
 * @param {number} level
 * @param {object} settings
 * @returns {number}
 */
function notionalAt(level, settings) {
  const n = Math.max(1, Math.round(Number(settings?.maxStack) || 1));
  const budget = Math.max(0, Number(settings?.budget) || 0);
  const slice = budget / n;

  if (
    settings?.sizeMode === SIZE_EQUAL ||
    Number(settings?.sizeMult) <= 1.000000000001
  ) {
    return slice;
  }

  const m = Number(settings.sizeMult);
  const tot = (Math.pow(m, n) - 1) / (m - 1);
  if (!(tot > 0)) {
    return 0;
  }

  return (budget * Math.pow(m, Math.max(0, level))) / tot;
}

/**
 * @param {unknown} raw
 * @returns {number}
 */
function normalizeBalancePct(raw) {
  return clampNumber(raw, 1, 100, 100);
}

/**
 * @param {unknown} available
 * @param {unknown} pct
 * @returns {number}
 */
function allocatedBalanceUsdt(available, pct) {
  const wallet = Number(available);
  if (!Number.isFinite(wallet) || wallet < 0) {
    return NaN;
  }
  return wallet * (normalizeBalancePct(pct) / 100);
}

/**
 * @param {unknown} allocated
 * @param {unknown} tickerCount
 * @returns {number}
 */
function equalShareBudget(allocated, tickerCount) {
  const n = Math.max(0, Math.round(Number(tickerCount) || 0));
  const a = Number(allocated);
  if (n < 1 || !Number.isFinite(a) || a <= 0) {
    return 0;
  }
  return a / n;
}

/**
 * @param {unknown} raw
 * @returns {number}
 */
function tfPeriodSec(raw) {
  const t = String(raw || "").trim();
  if (t === "D") {
    return 86400;
  }
  if (t === "W") {
    return 604800;
  }
  const n = Number(t);
  return Number.isFinite(n) && n > 0 ? n * 60 : 0;
}

/**
 * @param {unknown} raw
 * @returns {number}
 */
function unixSec(raw) {
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) {
    return NaN;
  }
  return n > 1e12 ? Math.floor(n / 1000) : n;
}

/**
 * Last already-closed source RSI at chart bar close (lookahead_off).
 * @returns {number[]}
 */
function projectClosedSourceRsiOntoChart(
  chartCandles,
  chartTf,
  sourceCandles,
  sourceTf,
  sourceRsi
) {
  const chart = Array.isArray(chartCandles) ? chartCandles : [];
  const source = Array.isArray(sourceCandles) ? sourceCandles : [];
  const rsi = Array.isArray(sourceRsi) ? sourceRsi : [];
  const out = new Array(chart.length).fill(NaN);
  const chartSec = tfPeriodSec(chartTf);
  const srcSec = tfPeriodSec(sourceTf);

  if (!(chartSec > 0) || !(srcSec > 0) || !source.length) {
    return out;
  }

  let j = 0;
  for (let i = 0; i < chart.length; i++) {
    const open = unixSec(chart[i]?.time);
    if (!Number.isFinite(open)) {
      continue;
    }
    const cutoff = open + chartSec - srcSec;
    while (
      j + 1 < source.length &&
      unixSec(source[j + 1].time) <= cutoff
    ) {
      j++;
    }
    const srcOpen = unixSec(source[j]?.time);
    const value = Number(rsi[j]);
    if (
      Number.isFinite(srcOpen) &&
      srcOpen <= cutoff &&
      Number.isFinite(value)
    ) {
      out[i] = value;
    }
  }

  return out;
}

/**
 * @param {object} bar
 * @returns {object}
 */
function decideRsiTouchFlipBar(bar = {}) {
  const rsi = Number(bar.rsi);
  const prevRsi = Number(bar.prevRsi);
  const osLevel = Number(bar.osLevel);
  const obLevel = Number(bar.obLevel);
  const maxStack = Math.max(1, Math.round(Number(bar.maxStack) || 1));
  const nOpen = Math.max(0, Math.round(Number(bar.stack) || 0));
  const allowLong = bar.allowLong !== false;
  const allowShort = bar.allowShort !== false;
  const position = String(bar.position || "flat");
  const inLong = position === "long";
  const inShort = position === "short";
  const isFlat = !inLong && !inShort;
  const ready = Number.isFinite(rsi) && Number.isFinite(prevRsi);
  const touchOS = ready && prevRsi > osLevel && rsi <= osLevel;
  const touchOB = ready && prevRsi < obLevel && rsi >= obLevel;
  const closeShort = touchOS && inShort;
  const addLong = touchOS && inLong && nOpen < maxStack;
  const openLong = touchOS && allowLong && (inShort || isFlat);
  const closeLong = touchOB && inLong;
  const addShort = touchOB && inShort && nOpen < maxStack;
  const openShort = touchOB && allowShort && (inLong || isFlat);

  return {
    touchOS,
    touchOB,
    closeShort,
    closeLong,
    openLong: !!(openLong || addLong) && allowLong,
    openShort: !!(openShort || addShort) && allowShort,
    longLevel: closeShort ? 0 : nOpen,
    shortLevel: closeLong ? 0 : nOpen
  };
}

function clampNumber(raw, min, max, fallback) {
  const n = Number(raw);
  if (!Number.isFinite(n)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, n));
}

function clampInt(raw, min, max, fallback) {
  return Math.round(clampNumber(raw, min, max, fallback));
}

function normalizeSizeMode(raw) {
  const mode = String(raw || "").trim().toLowerCase();
  if (mode === SIZE_AVERAGE || mode === "усреднение" || mode === "avg") {
    return SIZE_AVERAGE;
  }
  return SIZE_EQUAL;
}

function normalizeSide(raw) {
  const side = String(raw || "").trim().toUpperCase();
  if (side === SIDE_LONG || side === SIDE_SHORT) {
    return side;
  }
  return SIDE_BOTH;
}

/**
 * Frozen live snapshot (no analysis capital / marks).
 * @param {unknown} raw
 * @returns {object}
 */
function normalizeLivePrefs(raw) {
  const src = raw && typeof raw === "object" ? raw : {};
  const osLevel = clampNumber(src.osLevel, 1, 50, 30);
  let obLevel = clampNumber(src.obLevel, 50, 99, 70);
  if (obLevel <= osLevel) {
    obLevel = Math.min(99, osLevel + 1);
  }
  const tradeSide = normalizeSide(src.tradeSide);
  return {
    rsiLen: clampInt(src.rsiLen, 2, 999, 14),
    osLevel,
    obLevel,
    rsiTf: String(src.rsiTf || "").trim(),
    tradeSide,
    maxStack: clampInt(src.maxStack, 1, 20, 3),
    budget: clampNumber(src.budget, 1, 1_000_000, 100),
    sizeMode: normalizeSizeMode(src.sizeMode),
    sizeMult: clampNumber(src.sizeMult, 1, 20, 1.5),
    allowLong: tradeSide !== SIDE_SHORT,
    allowShort: tradeSide !== SIDE_LONG
  };
}

/**
 * Stable id of live-relevant fields. Chart TF + launch prefs, not analysis capital.
 * @param {unknown} tf
 * @param {unknown} prefs
 * @returns {string}
 */
function livePrefsFingerprint(tf, prefs) {
  const p = normalizeLivePrefs(prefs);
  return JSON.stringify({
    tf: String(tf || "").trim(),
    rsiLen: p.rsiLen,
    osLevel: p.osLevel,
    obLevel: p.obLevel,
    rsiTf: String(p.rsiTf || "").trim(),
    tradeSide: p.tradeSide,
    maxStack: p.maxStack,
    sizeMode: p.sizeMode,
    sizeMult: p.sizeMult
  });
}

/**
 * Diff current live contours against a desired book.
 * `nextRows` should already be normalized (symbol/tf/prefs).
 * @param {Array<{ symbol: string, tf?: string, prefs?: object, fingerprint?: string }>} currentTickers
 * @param {Array<{ symbol: string, tf: string, prefs: object }>} nextRows
 * @returns {{ add: object[], update: object[], remove: string[] }}
 */
function planRsiTouchFlipBookSync(currentTickers, nextRows) {
  const current = Array.isArray(currentTickers) ? currentTickers : [];
  const next = Array.isArray(nextRows) ? nextRows : [];
  const nextBy = new Map();
  for (const row of next) {
    const symbol = String(row?.symbol || "")
      .replace(/\.P$/i, "")
      .trim()
      .toUpperCase();
    if (!symbol) {
      continue;
    }
    nextBy.set(symbol, row);
  }
  const currentBy = new Map();
  for (const row of current) {
    const symbol = String(row?.symbol || "")
      .replace(/\.P$/i, "")
      .trim()
      .toUpperCase();
    if (symbol) {
      currentBy.set(symbol, row);
    }
  }
  const add = [];
  const update = [];
  const remove = [];
  for (const [symbol, row] of nextBy) {
    const cur = currentBy.get(symbol);
    if (!cur) {
      add.push(row);
      continue;
    }
    const nextFp = livePrefsFingerprint(row.tf, row.prefs || row);
    const curFp =
      cur.fingerprint || livePrefsFingerprint(cur.tf, cur.prefs);
    if (nextFp !== curFp) {
      update.push(row);
    }
  }
  for (const symbol of currentBy.keys()) {
    if (!nextBy.has(symbol)) {
      remove.push(symbol);
    }
  }
  return { add, update, remove };
}

module.exports = {
  SIZE_EQUAL,
  SIZE_AVERAGE,
  SIDE_BOTH,
  SIDE_LONG,
  SIDE_SHORT,
  computeWilderRsiValues,
  notionalAt,
  tfPeriodSec,
  unixSec,
  projectClosedSourceRsiOntoChart,
  decideRsiTouchFlipBar,
  normalizeLivePrefs,
  livePrefsFingerprint,
  planRsiTouchFlipBookSync,
  normalizeBalancePct,
  allocatedBalanceUsdt,
  equalShareBudget
};
