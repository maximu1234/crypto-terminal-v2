/**
 * Сетка MACD Flip Touch: только Быстрая / Медленная / Сигнал.
 * Остальные prefs (ТФ графика, ТФ MACD, стек, сторона, бюджет…) — из полей панели.
 * best — максимум чистой на всём графике (Обзор), даже если Test красный.
 * bestTradable — максимум Обзора среди наборов с зелёным Test: это в бота.
 */
import {
  runMacdFlipTouch
} from "./macd-flip-touch-engine.js?v=8";
import {
  computeMacdLineSignalArrays
} from "./macd-flip-touch-macd.js?v=1";
import {
  normalizeMacdFlipTouchPrefs
} from "./macd-flip-touch-prefs.js?v=9";
import {
  macdFlipTouchMinTestTrades,
  macdFlipTouchTestVerdict,
  macdFlipTouchTrainTestSplit
} from "./macd-flip-touch-walkforward.js?v=13";

export function macdFlipTouchIntRange(from, to) {
  const start = Math.round(Number(from));
  const end = Math.round(Number(to));
  const out = [];
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) {
    return out;
  }
  for (let i = start; i <= end; i++) {
    out.push(i);
  }
  return out;
}

/** Сетка только fast / slow / signal. */
export const MACD_FLIP_TOUCH_FAST_GRID = macdFlipTouchIntRange(5, 32);
export const MACD_FLIP_TOUCH_SLOW_GRID = macdFlipTouchIntRange(20, 55);
export const MACD_FLIP_TOUCH_SIGNAL_GRID = macdFlipTouchIntRange(5, 26);

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * @returns {Array<{ fastLength: number, slowLength: number, signalLength: number }>}
 */
export function listMacdFlipTouchOptimizeCombos() {
  const out = [];
  for (const fastLength of MACD_FLIP_TOUCH_FAST_GRID) {
    for (const slowLength of MACD_FLIP_TOUCH_SLOW_GRID) {
      if (slowLength <= fastLength) continue;
      for (const signalLength of MACD_FLIP_TOUCH_SIGNAL_GRID) {
        out.push({ fastLength, slowLength, signalLength });
      }
    }
  }
  return out;
}

/**
 * Ранг ячейки сетки: только чистая прибыль (netProfit = сумма pnl сделок
 * после комиссии). Валовая (grossProfit), профит-фактор и число сделок
 * не перебивают чистую.
 * @param {object|null|undefined} overview
 * @returns {number}
 */
export function scoreMacdFlipTouchNetOverview(overview) {
  const closed = Number(overview?.closedTrades);
  if (!Number.isFinite(closed) || closed <= 0) {
    return -Infinity;
  }
  const net = Number(overview?.netProfit);
  if (!Number.isFinite(net)) {
    return -Infinity;
  }
  const dd = Number(overview?.maxDrawdownPct);
  const ddPart = Number.isFinite(dd) ? dd : 100;
  return net * 1e9 - ddPart;
}

/**
 * @param {object|null|undefined} overview
 * @returns {number}
 */
export function scoreMacdFlipTouchTrainOverview(overview) {
  return scoreMacdFlipTouchNetOverview(overview);
}

/**
 * @param {object|null|undefined} a
 * @param {object|null|undefined} b
 * @returns {boolean}
 */
export function isBetterMacdFlipTouchTrain(a, b) {
  if (!a) {
    return false;
  }
  const closed = Number(a.closedTrades);
  if (!Number.isFinite(closed) || closed <= 0) {
    return false;
  }
  if (!b) {
    return true;
  }
  return scoreMacdFlipTouchTrainOverview(a) > scoreMacdFlipTouchTrainOverview(b);
}

/**
 * @param {object|null|undefined} overview
 * @returns {number}
 */
export function scoreMacdFlipTouchTestOverview(overview) {
  return scoreMacdFlipTouchNetOverview(overview);
}

/**
 * Лучший набор сетки: максимум чистой на всём графике (Обзор).
 * Test не участвует в ранге — он только для «включать ли тикер в бота».
 * @param {object|null|undefined} a
 * @param {object|null|undefined} b
 * @returns {boolean}
 */
export function isBetterMacdFlipTouchLaunch(a, b) {
  if (!a?.overview) {
    return false;
  }
  const closed = Number(a.overview.closedTrades);
  if (!Number.isFinite(closed) || closed <= 0) {
    return false;
  }
  if (!b?.overview) {
    return true;
  }
  return scoreMacdFlipTouchNetOverview(a.overview) >
    scoreMacdFlipTouchNetOverview(b.overview);
}

/**
 * Для бота: только зелёный Test, среди них — максимум чистой на Обзоре.
 * @param {object|null|undefined} a
 * @param {object|null|undefined} b
 * @returns {boolean}
 */
export function isBetterMacdFlipTouchTradable(a, b) {
  if (!a?.verdict?.ok) {
    return false;
  }
  if (!b?.verdict?.ok) {
    return true;
  }
  return isBetterMacdFlipTouchLaunch(a, b);
}

function pickOverview(overview) {
  if (!overview || typeof overview !== "object") {
    return null;
  }
  return {
    netProfit: overview.netProfit,
    netProfitPct: overview.netProfitPct,
    longProfit: overview.longProfit,
    longProfitPct: overview.longProfitPct,
    shortProfit: overview.shortProfit,
    shortProfitPct: overview.shortProfitPct,
    closedTrades: overview.closedTrades,
    percentProfitable: overview.percentProfitable,
    profitFactor: overview.profitFactor,
    maxDrawdown: overview.maxDrawdown,
    maxDrawdownPct: overview.maxDrawdownPct,
    avgTrade: overview.avgTrade,
    avgBars: overview.avgBars,
    chartDays: overview.chartDays
  };
}

function normalizeSeries(series) {
  if (!series || typeof series !== "object") {
    return null;
  }
  const macd = Array.isArray(series.macd)
    ? series.macd
    : Array.isArray(series.macdValues)
      ? series.macdValues
      : null;
  const signal = Array.isArray(series.signal)
    ? series.signal
    : Array.isArray(series.signalValues)
      ? series.signalValues
      : null;
  if (!macd || !signal) {
    return null;
  }
  return { macd, signal };
}

function runWindow(window, prefs, series, excludeFormingBar = false) {
  const macdValues = series.macd.slice(window.from, window.to);
  const signalValues = series.signal.slice(window.from, window.to);
  const result = runMacdFlipTouch(window.candles, prefs, {
    macdValues,
    signalValues,
    excludeFormingBar
  });
  return {
    ...pickOverview(result.overview),
    chartDays: window.days
  };
}

function runFullChart(candles, prefs, series, chartDays) {
  const result = runMacdFlipTouch(candles, prefs, {
    macdValues: series.macd,
    signalValues: series.signal,
    excludeFormingBar: true
  });
  return {
    ...pickOverview(result.overview),
    chartDays
  };
}

/**
 * @param {{
 *   candles: Array,
 *   basePrefs: object,
 *   chartTf: string,
 *   trainPct?: number,
 *   signal?: { cancelled?: boolean }|null,
 *   onProgress?: (p: { done: number, total: number }) => void,
 *   combos?: Array<{ fastLength: number, slowLength: number, signalLength: number }>,
 *   resolveSeries?: (prefs: object) => Promise<{macd?:number[], signal?:number[], macdValues?:number[], signalValues?:number[]}>| {macd?:number[], signal?:number[], macdValues?:number[], signalValues?:number[]},
 *   yieldEvery?: number
 * }} opts
 */
export async function optimizeMacdFlipTouchParams(opts = {}) {
  const candles = Array.isArray(opts.candles) ? opts.candles : [];
  const basePrefs = normalizeMacdFlipTouchPrefs(opts.basePrefs);
  const chartTf = String(opts.chartTf || "").trim();
  const trainPct = opts.trainPct;
  const signal = opts.signal || null;
  const onProgress =
    typeof opts.onProgress === "function" ? opts.onProgress : null;
  const yieldEveryRaw = Number(opts.yieldEvery);
  const yieldEvery =
    Number.isFinite(yieldEveryRaw) && yieldEveryRaw >= 0
      ? Math.floor(yieldEveryRaw)
      : 32;
  const resolveSeries =
    typeof opts.resolveSeries === "function"
      ? opts.resolveSeries
      : (prefs) => computeMacdLineSignalArrays(candles, prefs);
  const combos =
    Array.isArray(opts.combos) && opts.combos.length
      ? opts.combos
      : listMacdFlipTouchOptimizeCombos();
  const split = macdFlipTouchTrainTestSplit(
    candles,
    undefined,
    chartTf,
    trainPct
  );

  if (!split) {
    return {
      cancelled: false,
      best: null,
      bestTrain: null,
      bestTradable: null,
      tried: 0,
      total: combos.length,
      split: null
    };
  }

  const minTrainTrades = 8;
  let bestLaunch = null;
  let bestTrain = null;
  let bestTradable = null;
  let tried = 0;

  for (const combo of combos) {
    if (signal?.cancelled) {
      return {
        cancelled: true,
        best: bestLaunch,
        bestTrain,
        bestTradable,
        tried,
        total: combos.length,
        split
      };
    }

    const prefs = normalizeMacdFlipTouchPrefs({
      ...basePrefs,
      ...combo
    });
    let series;
    try {
      series = normalizeSeries(await resolveSeries(prefs));
    } catch {
      series = null;
    }
    if (
      !series ||
      series.macd.length !== candles.length ||
      series.signal.length !== candles.length
    ) {
      tried += 1;
      if (onProgress) {
        onProgress({ done: tried, total: combos.length });
      }
      if (yieldEvery > 0 && tried % yieldEvery === 0) {
        await sleep(0);
      }
      continue;
    }

    const trainOverview = runWindow(split.train, prefs, series, false);
    tried += 1;

    if (Number(trainOverview.closedTrades) < minTrainTrades) {
      if (onProgress) {
        onProgress({ done: tried, total: combos.length });
      }
      if (yieldEvery > 0 && tried % yieldEvery === 0) {
        await sleep(0);
      }
      continue;
    }

    const testOverview = runWindow(split.test, prefs, series, true);
    const verdict = macdFlipTouchTestVerdict(testOverview, {
      minTrades: macdFlipTouchMinTestTrades(split.test.bars)
    });
    const overview = runFullChart(
      candles,
      prefs,
      series,
      (Number(split.train.days) || 0) + (Number(split.test.days) || 0)
    );
    const row = {
      combo,
      prefs,
      train: trainOverview,
      test: testOverview,
      overview,
      verdict
    };

    if (isBetterMacdFlipTouchTrain(trainOverview, bestTrain?.train)) {
      bestTrain = row;
    }
    if (isBetterMacdFlipTouchLaunch(row, bestLaunch)) {
      bestLaunch = row;
    }
    if (isBetterMacdFlipTouchTradable(row, bestTradable)) {
      bestTradable = row;
    }

    if (onProgress) {
      onProgress({ done: tried, total: combos.length });
    }
    if (yieldEvery > 0 && tried % yieldEvery === 0) {
      await sleep(0);
    }
  }

  return {
    cancelled: false,
    best: bestLaunch,
    bestTrain,
    bestTradable,
    tried,
    total: combos.length,
    split
  };
}
