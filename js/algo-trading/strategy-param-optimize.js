/**
 * Подбор параметров стратегии на открытом графике (brute-force по сетке).
 * Не трогает: СЛ$, timeout bars, max pt1–pt4 bars, таймфрейм графика.
 */
import {
defaultPattern12Settings
} from "./pattern-12-math.js?v=21";

import {
getOrComputeAlgoPattern12Scene
} from "./pattern-12-scene-cache.js?v=10";

import {
detectPatternEntryEventsFromSetups
} from "./pattern-entry-logic.js?v=14";

import {
computeAlgoTradeStats,
normalizeAlgoStatsMode
} from "./pattern-trade-stats.js?v=15";

import {
computePartialTpTradeStats,
normalizeTpShares,
clampPartialTpX,
clampTrailSlX1,
clampTrailSlX2
} from "./pattern-trade-stats-partial.js?v=22";

import {
clampSlPctOfX,
clampTpRr
} from "./pattern-entry-positions.js?v=16";

import {
filterEntryEventsBySupertrend,
clampAlgoSupertrendAtr,
clampAlgoSupertrendFactor,
normalizeAlgoSupertrendTf
} from "./pattern-supertrend-filter.js?v=5";

import {
clampPullbackBeforeArmPct,
normalizePullbackBeforeArmEnabled
} from "./temp-pullback-before-arm.js?v=4";

/**
 * @typedef {"st1"|"st2"|"st3"} AlgoOptimizeStrategyId
 */

/**
 * @param {unknown} raw
 * @returns {AlgoOptimizeStrategyId}
 */
export function normalizeAlgoOptimizeStrategyId(raw){
  const id = String(raw || "").toLowerCase();
  if(id === "st2" || id === "partial-tp"){
    return "st2";
  }
  if(id === "st3" || id === "partial-tp-y"){
    return "st3";
  }
  return "st1";
}

/**
 * @param {AlgoOptimizeStrategyId} id
 * @returns {string}
 */
export function algoOptimizeStrategyLabel(id){
  if(id === "st2"){
    return "Стратегия 2";
  }
  if(id === "st3"){
    return "Стратегия 3";
  }
  return "Стратегия 1";
}

/**
 * Краткая строка параметров для таблицы / попапа.
 * @param {string} strategyId
 * @param {object|null|undefined} combo
 * @returns {string}
 */
export function formatAlgoOptimizeParamsBrief(strategyId, combo){
  if(!combo || typeof combo !== "object"){
    return "—";
  }

  const id = normalizeAlgoOptimizeStrategyId(strategyId);
  const parts = [`СЛ${Number(combo.slPctOfX)}%`];

  if(id === "st1"){
    parts.push(`1к${Number(combo.tpRr)}`);
  }else{
    parts.push(`ТП${combo.tp1}/${combo.tp2}/${combo.tp3}`);
    if(combo.trailSl){
      parts.push(`tr${combo.trailSlX1}→${combo.trailSlX2}`);
    }else{
      parts.push("tr−");
    }
    parts.push(`д${combo.share1}/${combo.share2}/${combo.share3}`);
  }

  if(combo.supertrendOn){
    const tf = combo.supertrendTf ? String(combo.supertrendTf) : "cur";
    parts.push(`ST${combo.supertrendAtr}/${combo.supertrendFactor}/${tf}`);
  }else{
    parts.push("ST−");
  }

  if(combo.pullbackBeforeArm){
    parts.push(`отк${combo.pullbackBeforeArmPct}%`);
  }else{
    parts.push("отк−");
  }

  return parts.join(" · ");
}

function sleep(ms){
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * @returns {{ pullback: boolean, pullbackPct: number }[]}
 */
function pullbackGrid(){
  return [
    { pullback: false, pullbackPct: 38.2 },
    { pullback: true, pullbackPct: 38.2 },
    { pullback: true, pullbackPct: 50 },
    { pullback: true, pullbackPct: 61.8 }
  ];
}

/**
 * Общий ST для Long+Short (или выкл).
 * Компактная сетка: полный ATR×Factor×TF слишком тяжёлый для st2/st3.
 * @returns {Array<{
 *   on: boolean,
 *   atr: number,
 *   factor: number,
 *   tf: string
 * }>}
 */
function supertrendGrid(){
  return [
    { on: false, atr: 10, factor: 3, tf: "" },
    { on: true, atr: 10, factor: 3, tf: "" },
    { on: true, atr: 10, factor: 3, tf: "240" },
    { on: true, atr: 14, factor: 3, tf: "" },
    { on: true, atr: 14, factor: 2, tf: "240" },
    { on: true, atr: 10, factor: 2, tf: "60" },
    { on: true, atr: 14, factor: 3, tf: "D" }
  ];
}

/**
 * @returns {number[]}
 */
function slPctGrid(){
  return [38.2, 50, 61.8, 75, 99];
}

/**
 * @returns {number[]}
 */
function tpRrGrid(){
  return [1, 1.5, 2, 2.39, 3, 4];
}

/**
 * @returns {Array<[number, number, number]>}
 */
function partialTpTriplets(){
  return [
    [0.5, 1, 1.44],
    [0.5, 1, 2],
    [0.5, 1.25, 2],
    [0.618, 1, 1.44],
    [0.618, 1, 2],
    [0.618, 1.25, 2],
    [1, 1.25, 1.44],
    [1, 1.44, 2]
  ];
}

/**
 * @returns {Array<{ trailSl: boolean, x1: number, x2: number }>}
 */
function trailSlGrid(){
  return [
    { trailSl: false, x1: -0.25, x2: 0 },
    { trailSl: true, x1: -0.25, x2: 0 },
    { trailSl: true, x1: -0.5, x2: 0.5 }
  ];
}

/**
 * @returns {Array<[number, number, number]>}
 */
function shareGrid(){
  return [
    [25, 25, 50],
    [33, 33, 34],
    [20, 30, 50]
  ];
}

/**
 * @param {object|null|undefined} stats
 * @returns {number}
 */
function scoreStats(stats){
  const net = Number(stats?.netUsd);
  const exp = Number(stats?.expectancyR);
  const wr = Number(stats?.winRate);
  const closed = Number(stats?.closed);
  const netPart = Number.isFinite(net) ? net : -1e12;
  const expPart = Number.isFinite(exp) ? exp : -1e6;
  const wrPart = Number.isFinite(wr) ? wr : -1;
  const closedPart = Number.isFinite(closed) ? closed : 0;
  /* netUsd доминирует; дальше E[R], WR, число закрытых */
  return netPart * 1e9 + expPart * 1e4 + wrPart * 10 + closedPart;
}

/**
 * @param {object|null|undefined} a
 * @param {object|null|undefined} b
 * @returns {boolean}
 */
function isBetterStats(a, b){
  if(!a){
    return false;
  }
  /* Комбо без закрытых сделок не считаем «лучшими» — иначе первая ячейка сетки
     (СЛ38.2% · 1к1 · …) попадает в таблицу с нулями и выглядит как «подбор». */
  const closed = Number(a.closed);
  if(!Number.isFinite(closed) || closed <= 0){
    return false;
  }
  if(!b){
    return true;
  }
  return scoreStats(a) > scoreStats(b);
}

/**
 * @param {AlgoOptimizeStrategyId} strategyId
 * @param {object} fixedOpts
 * @param {object} combo
 * @param {Array} candles
 * @param {Array} events
 * @param {string} statsMode
 */
function evaluateCombo(strategyId, fixedOpts, combo, candles, events, statsMode){
  const base = {
    ...fixedOpts,
    slPctOfX: combo.slPctOfX,
    pullbackBeforeArm: combo.pullbackBeforeArm,
    pullbackBeforeArmPct: combo.pullbackBeforeArmPct,
    supertrendLongFilter: combo.supertrendOn,
    supertrendLongAtr: combo.supertrendAtr,
    supertrendLongFactor: combo.supertrendFactor,
    supertrendLongTf: combo.supertrendTf,
    supertrendShortFilter: combo.supertrendOn,
    supertrendShortAtr: combo.supertrendAtr,
    supertrendShortFactor: combo.supertrendFactor,
    supertrendShortTf: combo.supertrendTf
  };

  if(strategyId === "st1"){
    return computeAlgoTradeStats(candles, events, {
      ...base,
      tpRr: combo.tpRr,
      statsMode
    });
  }

  const span = strategyId === "st3" ? "y" : "x";
  const shares = normalizeTpShares(combo.share1, combo.share2, combo.share3);
  const tps = [
    clampPartialTpX(combo.tp1, 0.5),
    clampPartialTpX(combo.tp2, 1),
    clampPartialTpX(combo.tp3, 1.44)
  ];
  const x1 = clampTrailSlX1(combo.trailSlX1);
  const x2 = clampTrailSlX2(combo.trailSlX2, x1, tps);

  if(span === "y"){
    return computePartialTpTradeStats(candles, events, {
      ...base,
      span: "y",
      tp1Y: tps[0],
      tp2Y: tps[1],
      tp3Y: tps[2],
      trailSl: combo.trailSl,
      trailSlX1: x1,
      trailSlX2: x2,
      share1: shares[0],
      share2: shares[1],
      share3: shares[2],
      statsMode
    });
  }

  return computePartialTpTradeStats(candles, events, {
    ...base,
    span: "x",
    tp1X: tps[0],
    tp2X: tps[1],
    tp3X: tps[2],
    trailSl: combo.trailSl,
    trailSlX1: x1,
    trailSlX2: x2,
    share1: shares[0],
    share2: shares[1],
    share3: shares[2],
    statsMode
  });
}

/**
 * @param {AlgoOptimizeStrategyId} strategyId
 * @param {object} combo
 * @returns {object}
 */
export function comboToApplyPatch(strategyId, combo){
  const patch = {
    slPctOfX: clampSlPctOfX(combo.slPctOfX),
    pullbackBeforeArm: normalizePullbackBeforeArmEnabled(combo.pullbackBeforeArm),
    pullbackBeforeArmPct: clampPullbackBeforeArmPct(combo.pullbackBeforeArmPct),
    supertrendLongFilter: !!combo.supertrendOn,
    supertrendLongAtr: clampAlgoSupertrendAtr(combo.supertrendAtr),
    supertrendLongFactor: clampAlgoSupertrendFactor(combo.supertrendFactor),
    supertrendLongTf: normalizeAlgoSupertrendTf(combo.supertrendTf),
    supertrendShortFilter: !!combo.supertrendOn,
    supertrendShortAtr: clampAlgoSupertrendAtr(combo.supertrendAtr),
    supertrendShortFactor: clampAlgoSupertrendFactor(combo.supertrendFactor),
    supertrendShortTf: normalizeAlgoSupertrendTf(combo.supertrendTf)
  };

  if(strategyId === "st1"){
    patch.tpRr = clampTpRr(combo.tpRr);
    return patch;
  }

  const shares = normalizeTpShares(combo.share1, combo.share2, combo.share3);
  const tps = [
    clampPartialTpX(combo.tp1, 0.5),
    clampPartialTpX(combo.tp2, 1),
    clampPartialTpX(combo.tp3, 1.44)
  ];
  const x1 = clampTrailSlX1(combo.trailSlX1);
  const x2 = clampTrailSlX2(combo.trailSlX2, x1, tps);

  if(strategyId === "st3"){
    patch.tp1Y = tps[0];
    patch.tp2Y = tps[1];
    patch.tp3Y = tps[2];
    patch.trailSlSt3 = !!combo.trailSl;
    patch.trailSlX1St3 = x1;
    patch.trailSlX2St3 = x2;
    patch.share1Y = shares[0];
    patch.share2Y = shares[1];
    patch.share3Y = shares[2];
    return patch;
  }

  patch.tp1X = tps[0];
  patch.tp2X = tps[1];
  patch.tp3X = tps[2];
  patch.trailSlSt2 = !!combo.trailSl;
  patch.trailSlX1St2 = x1;
  patch.trailSlX2St2 = x2;
  patch.share1X = shares[0];
  patch.share2X = shares[1];
  patch.share3X = shares[2];
  return patch;
}

/**
 * @param {{
 *   candles: Array,
 *   strategyId?: string,
 *   fixedOpts?: object,
 *   statsMode?: string,
 *   signal?: { cancelled?: boolean }|null,
 *   onProgress?: (p: {
 *     done: number,
 *     total: number,
 *     best: object|null,
 *     bestStats: object|null
 *   }) => void
 *   yieldEvery?: number
 * }} opts
 */
export async function optimizeAlgoStrategyParams(opts = {}){
  const strategyId = normalizeAlgoOptimizeStrategyId(opts.strategyId);
  const candles = Array.isArray(opts.candles) ? opts.candles : [];
  const fixedOpts = opts.fixedOpts && typeof opts.fixedOpts === "object"
    ? { ...opts.fixedOpts }
    : {};
  const statsMode = normalizeAlgoStatsMode(opts.statsMode || "direct");
  const signal = opts.signal || null;
  const onProgress = typeof opts.onProgress === "function" ? opts.onProgress : null;
  const yieldEveryRaw = Number(opts.yieldEvery);
  const yieldEvery = Number.isFinite(yieldEveryRaw) && yieldEveryRaw >= 0
    ? Math.floor(yieldEveryRaw)
    : 40;

  if(candles.length < 3){
    return {
      strategyId,
      cancelled: false,
      best: null,
      bestStats: null,
      tried: 0,
      total: 0
    };
  }

  const scene = getOrComputeAlgoPattern12Scene(
    candles,
    fixedOpts.patternSettings || defaultPattern12Settings(),
    opts.symbol || fixedOpts.symbol || ""
  );
  const setups = scene?.setups;

  const pullbacks = pullbackGrid();
  const supertrends = supertrendGrid();
  const slPcts = slPctGrid();
  const supertrendSeriesCache = new Map();

  /** @type {object[]} */
  let innerCombos = [];
  if(strategyId === "st1"){
    for(const slPctOfX of slPcts){
      for(const tpRr of tpRrGrid()){
        innerCombos.push({ slPctOfX, tpRr });
      }
    }
  }else{
    const tps = partialTpTriplets();
    const trails = trailSlGrid();
    const shares = shareGrid();
    for(const slPctOfX of slPcts){
      for(const tp of tps){
        for(const trail of trails){
          for(const sh of shares){
            innerCombos.push({
              slPctOfX,
              tp1: tp[0],
              tp2: tp[1],
              tp3: tp[2],
              trailSl: trail.trailSl,
              trailSlX1: trail.x1,
              trailSlX2: trail.x2,
              share1: sh[0],
              share2: sh[1],
              share3: sh[2]
            });
          }
        }
      }
    }
  }

  const total = pullbacks.length * supertrends.length * innerCombos.length;
  let done = 0;
  let best = null;
  let bestStats = null;

  const report = () => {
    if(onProgress){
      onProgress({ done, total, best, bestStats });
    }
  };

  report();

  for(const pb of pullbacks){
    if(signal?.cancelled){
      return { strategyId, cancelled: true, best, bestStats, tried: done, total };
    }

    const baseEvents = detectPatternEntryEventsFromSetups(
      candles,
      setups,
      {
        timeoutBars: fixedOpts.timeoutBars,
        maxPt1Pt4Bars: fixedOpts.maxPt1Pt4Bars,
        pullbackBeforeArm: pb.pullback,
        pullbackBeforeArmPct: pb.pullbackPct,
        reverseLogic: !!fixedOpts.patternSettings?.reverseLogic
      }
    );

    for(const st of supertrends){
      if(signal?.cancelled){
        return { strategyId, cancelled: true, best, bestStats, tried: done, total };
      }

      const events = filterEntryEventsBySupertrend(
        candles,
        baseEvents,
        {
          chartTf: fixedOpts.chartTf,
          supertrendLongFilter: st.on,
          supertrendLongAtr: st.atr,
          supertrendLongFactor: st.factor,
          supertrendLongTf: st.tf,
          supertrendShortFilter: st.on,
          supertrendShortAtr: st.atr,
          supertrendShortFactor: st.factor,
          supertrendShortTf: st.tf,
          seriesCache: supertrendSeriesCache
        }
      );

      for(const inner of innerCombos){
        if(signal?.cancelled){
          return { strategyId, cancelled: true, best, bestStats, tried: done, total };
        }

        const combo = {
          ...inner,
          pullbackBeforeArm: pb.pullback,
          pullbackBeforeArmPct: pb.pullbackPct,
          supertrendOn: st.on,
          supertrendAtr: st.atr,
          supertrendFactor: st.factor,
          supertrendTf: st.tf
        };

        const stats = evaluateCombo(
          strategyId,
          fixedOpts,
          combo,
          candles,
          events,
          statsMode
        );

        if(isBetterStats(stats, bestStats)){
          bestStats = stats;
          best = combo;
        }

        done += 1;
        if(yieldEvery > 0 && done % yieldEvery === 0){
          report();
          await sleep(0);
        }
      }
    }
  }

  report();

  return {
    strategyId,
    cancelled: false,
    best,
    bestStats,
    tried: done,
    total,
    patch: best ? comboToApplyPatch(strategyId, best) : null
  };
}
