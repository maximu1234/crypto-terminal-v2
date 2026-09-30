/**
 * MACD Flip Touch — live math (MACD/signal, stack notional, MTF map).
 * Same formulas as js/algo-trading/macd-flip-touch-macd.js (analysis copy).
 */

const SIZE_EQUAL = "equal";
const SIZE_AVERAGE = "average";
const SIDE_BOTH = "BOTH";
const SIDE_LONG = "LONG";
const SIDE_SHORT = "SHORT";

const MACD_FAST_DEFAULT = 12;
const MACD_SLOW_DEFAULT = 26;
const MACD_SIGNAL_DEFAULT = 9;

function clampIntMacd(value, min, max, fallback) {
  const n = Math.round(Number(value));
  if (!Number.isFinite(n)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, n));
}

function macdSettingsFromFlipPrefs(prefs) {
  const p = prefs && typeof prefs === "object" ? prefs : {};
  const source = String(p.source || "close").toLowerCase();
  const oscillatorMa = String(p.oscillatorMa || "ema").toLowerCase();
  const signalMa = String(p.signalMa || "ema").toLowerCase();
  return {
    fastLength: clampIntMacd(p.fastLength, 2, 999, MACD_FAST_DEFAULT),
    slowLength: clampIntMacd(p.slowLength, 2, 999, MACD_SLOW_DEFAULT),
    signalLength: clampIntMacd(p.signalLength, 1, 999, MACD_SIGNAL_DEFAULT),
    source:
      source === "open" || source === "high" || source === "low"
        ? source
        : "close",
    oscillatorMa: oscillatorMa === "sma" ? "sma" : "ema",
    signalMa: signalMa === "sma" ? "sma" : "ema"
  };
}

function macdSourceValue(bar, source = "close") {
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
 * @param {Array<{open?:number,high?:number,low?:number,close?:number}>} candles
 * @param {object} settings
 * @returns {{ macd: number[], signal: number[] }}
 */
function computeMacdLineSignalArrays(candles, settings) {
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
 * @param {unknown} raw
 * @returns {"cross"|"isolated"}
 */
function normalizeMarginMode(raw) {
  return String(raw || "").toLowerCase() === "isolated" ? "isolated" : "cross";
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
function projectClosedSourceSeriesOntoChart(
  chartCandles,
  chartTf,
  sourceCandles,
  sourceTf,
  sourceSeries
) {
  const chart = Array.isArray(chartCandles) ? chartCandles : [];
  const source = Array.isArray(sourceCandles) ? sourceCandles : [];
  const series = Array.isArray(sourceSeries) ? sourceSeries : [];
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
    const value = Number(series[j]);
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
function decideMacdFlipTouchBar(bar = {}) {
  const macd = Number(bar.macd);
  const prevMacd = Number(bar.prevMacd);
  const sig = Number(bar.signal);
  const prevSignal = Number(bar.prevSignal);
  const maxStack = Math.max(1, Math.round(Number(bar.maxStack) || 1));
  const nOpen = Math.max(0, Math.round(Number(bar.stack) || 0));
  const allowLong = bar.allowLong !== false;
  const allowShort = bar.allowShort !== false;
  const position = String(bar.position || "flat");
  const inLong = position === "long";
  const inShort = position === "short";
  const isFlat = !inLong && !inShort;
  const ready =
    Number.isFinite(macd) &&
    Number.isFinite(prevMacd) &&
    Number.isFinite(sig) &&
    Number.isFinite(prevSignal);
  const crossLong = ready && prevMacd < prevSignal && macd > sig;
  const crossShort = ready && prevMacd > prevSignal && macd < sig;
  const slBlockLong = bar.slBlockLong === true;
  const slBlockShort = bar.slBlockShort === true;

  const closeShort = crossLong && inShort;
  const addLong = crossLong && inLong && nOpen < maxStack;
  const openLong = crossLong && allowLong && (inShort || isFlat);
  const closeLong = crossShort && inLong;
  const addShort = crossShort && inShort && nOpen < maxStack;
  const openShort = crossShort && allowShort && (inLong || isFlat);

  return {
    crossLong,
    crossShort,
    closeShort,
    closeLong,
    openLong: !!(openLong || addLong) && allowLong && !slBlockLong,
    openShort: !!(openShort || addShort) && allowShort && !slBlockShort,
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
  let fastLength = clampInt(src.fastLength ?? src.rsiLen, 2, 999, 12);
  let slowLength = clampInt(src.slowLength, 2, 999, 26);
  if (slowLength <= fastLength) {
    slowLength = Math.min(999, fastLength + 1);
  }
  const tradeSide = normalizeSide(src.tradeSide);
  return {
    fastLength,
    slowLength,
    signalLength: clampInt(src.signalLength, 1, 999, 9),
    source: String(src.source || "close").toLowerCase(),
    oscillatorMa: String(src.oscillatorMa || "ema").toLowerCase() === "sma" ? "sma" : "ema",
    signalMa: String(src.signalMa || "ema").toLowerCase() === "sma" ? "sma" : "ema",
    macdTf: String(src.macdTf ?? src.rsiTf ?? "").trim(),
    tradeSide,
    maxStack: clampInt(src.maxStack, 1, 20, 3),
    budget: clampNumber(src.budget, 1, 1_000_000, 100),
    sizeMode: normalizeSizeMode(src.sizeMode),
    sizeMult: clampNumber(src.sizeMult, 1, 20, 1.5),
    allowLong: tradeSide !== SIDE_SHORT,
    allowShort: tradeSide !== SIDE_LONG,
    cycleSlEnabled: src.cycleSlEnabled === true,
    cycleSlPct: clampNumber(src.cycleSlPct, 1, 90, 30)
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
    fastLength: p.fastLength,
    slowLength: p.slowLength,
    signalLength: p.signalLength,
    macdTf: String(p.macdTf || "").trim(),
    tradeSide: p.tradeSide,
    maxStack: p.maxStack,
    sizeMode: p.sizeMode,
    sizeMult: p.sizeMult,
    cycleSlEnabled: p.cycleSlEnabled === true,
    cycleSlPct: p.cycleSlEnabled === true ? p.cycleSlPct : 0
  });
}

/**
 * Diff current live contours against a desired book.
 * `nextRows` should already be normalized (symbol/tf/prefs).
 * @param {Array<{ symbol: string, tf?: string, prefs?: object, fingerprint?: string }>} currentTickers
 * @param {Array<{ symbol: string, tf: string, prefs: object }>} nextRows
 * @returns {{ add: object[], update: object[], remove: string[] }}
 */
function planMacdFlipTouchBookSync(currentTickers, nextRows) {
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

function macdFlipTouchCycleSlHit(unrealizedPnl, budget, prefs) {
  if (prefs?.cycleSlEnabled !== true) {
    return false;
  }
  const pct = Number(prefs.cycleSlPct);
  const cap = Number(budget);
  const pnl = Number(unrealizedPnl);
  if (!(pct > 0) || !(cap > 0) || !Number.isFinite(pnl)) {
    return false;
  }
  return pnl <= -(cap * pct) / 100;
}

function macdFlipTouchLocalLooksOpen(state) {
  return Boolean(
    state &&
      (state.botOwnsPosition === true ||
        (state.position && state.position !== "flat"))
  );
}

function macdFlipTouchOpenLooksFilled(result) {
  if (!result || result.ok === false) {
    return false;
  }
  return Boolean(result.position);
}

function macdFlipTouchShouldFlattenGhost(state, posResult) {
  if (!macdFlipTouchLocalLooksOpen(state)) {
    return false;
  }
  if (state.mode != null && state.mode !== "trade") {
    return false;
  }
  if (!posResult || posResult.ok === false) {
    return false;
  }
  return !posResult.position;
}

/**
 * Open time (sec) of the last closed 1m bar used for a chart bar (lookahead_off).
 * @param {number} chartBarOpenSec
 * @param {string} chartTf
 * @param {string} sourceTf
 * @returns {number}
 */
function requiredSourceOpenSecForChartBar(chartBarOpenSec, chartTf, sourceTf) {
  const chartSec = tfPeriodSec(chartTf);
  const srcSec = tfPeriodSec(sourceTf);
  const open = unixSec(chartBarOpenSec);
  if (!(chartSec > 0) || !(srcSec > 0) || !Number.isFinite(open)) {
    return NaN;
  }
  if (chartSec === srcSec) {
    return open;
  }
  return open + chartSec - srcSec;
}

/**
 * Live MTF: wait until source TF bar is closed for chart bar (lookahead_off).
 */
function isChartBarSourceMacdReady(
  chartBarOpenSec,
  chartTf,
  sourceTf,
  macdSourceCandles,
  macdSourceForming
) {
  const need = requiredSourceOpenSecForChartBar(
    chartBarOpenSec,
    chartTf,
    sourceTf
  );
  if (!Number.isFinite(need)) {
    return true;
  }
  const list = Array.isArray(macdSourceCandles) ? macdSourceCandles : [];
  if (!list.length) {
    return false;
  }
  const lastClosed = unixSec(list[list.length - 1]?.time);
  if (!Number.isFinite(lastClosed) || lastClosed < need) {
    return false;
  }
  if (macdSourceForming && unixSec(macdSourceForming.time) === need) {
    return false;
  }
  return true;
}

module.exports = {
  SIZE_EQUAL,
  SIZE_AVERAGE,
  SIDE_BOTH,
  SIDE_LONG,
  SIDE_SHORT,
  computeMacdLineSignalArrays,
  notionalAt,
  tfPeriodSec,
  unixSec,
  projectClosedSourceSeriesOntoChart,
  decideMacdFlipTouchBar,
  normalizeLivePrefs,
  livePrefsFingerprint,
  planMacdFlipTouchBookSync,
  normalizeBalancePct,
  normalizeMarginMode,
  allocatedBalanceUsdt,
  equalShareBudget,
  macdFlipTouchCycleSlHit,
  macdFlipTouchLocalLooksOpen,
  macdFlipTouchOpenLooksFilled,
  macdFlipTouchShouldFlattenGhost,
  requiredSourceOpenSecForChartBar,
  isChartBarSourceMacdReady
};
