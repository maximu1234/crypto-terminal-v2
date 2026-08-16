/**
 * Persist modal scan/optimize results across app restarts (localStorage).
 * Scoped by active exchange.
 */
import {
getActiveExchangeId
} from "../exchanges/context.js?v=1";

export const ALGO_UNIVERSE_SCAN_RESULTS_KEY =
"algo_trading_universe_scan_results_v1";

export const ALGO_OPTIMIZE_UNIVERSE_RESULTS_KEY =
"algo_trading_optimize_universe_results_v1";

/**
 * @returns {string}
 */
function exchangeScope(){
  return String(getActiveExchangeId?.() || "bybit").toLowerCase() || "bybit";
}

/**
 * @param {string} storageKey
 * @returns {Record<string, object>}
 */
function readRoot(storageKey){
  try{
    const raw = localStorage.getItem(storageKey);
    if(!raw){
      return {};
    }
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed
      : {};
  }catch{
    return {};
  }
}

/**
 * @param {string} storageKey
 * @param {Record<string, object>} root
 */
function writeRoot(storageKey, root){
  try{
    localStorage.setItem(storageKey, JSON.stringify(root));
  }catch(err){
    console.warn("[algo-trading] modal results persist", storageKey, err);
  }
}

/**
 * @param {string} slotKey e.g. "st1:top100"
 * @returns {object|null}
 */
export function loadUniverseScanResult(slotKey){
  const key = String(slotKey || "");
  if(!key){
    return null;
  }
  const root = readRoot(ALGO_UNIVERSE_SCAN_RESULTS_KEY);
  const byEx = root[exchangeScope()];
  const payload = byEx && typeof byEx === "object" ? byEx[key] : null;
  if(!payload || typeof payload !== "object"){
    return null;
  }
  return {
    agg: payload.agg && typeof payload.agg === "object" ? payload.agg : {},
    rows: Array.isArray(payload.rows) ? payload.rows : [],
    done: Number(payload.done) || 0,
    total: Number(payload.total) || 0,
    tf: String(payload.tf || ""),
    statsMode: String(payload.statsMode || ""),
    finishedAt: Number(payload.finishedAt) || 0
  };
}

/**
 * @param {string} slotKey
 * @param {{
 *   agg?: object,
 *   rows?: object[],
 *   done?: number,
 *   total?: number,
 *   tf?: string,
 *   statsMode?: string
 * }} payload
 */
export function saveUniverseScanResult(slotKey, payload){
  const key = String(slotKey || "");
  if(!key || !payload){
    return;
  }
  const root = readRoot(ALGO_UNIVERSE_SCAN_RESULTS_KEY);
  const ex = exchangeScope();
  const byEx = root[ex] && typeof root[ex] === "object" ? { ...root[ex] } : {};
  byEx[key] = {
    agg: payload.agg && typeof payload.agg === "object" ? payload.agg : {},
    rows: Array.isArray(payload.rows) ? payload.rows : [],
    done: Number(payload.done) || 0,
    total: Number(payload.total) || 0,
    tf: String(payload.tf || ""),
    statsMode: String(payload.statsMode || ""),
    finishedAt: Date.now()
  };
  root[ex] = byEx;
  writeRoot(ALGO_UNIVERSE_SCAN_RESULTS_KEY, root);
}

/**
 * Lean row for disk (drop heavy best/patch).
 * @param {object} row
 * @returns {object}
 */
function leanOptimizeRow(row){
  if(!row || typeof row !== "object"){
    return row;
  }
  return {
    rank: row.rank,
    symbol: row.symbol,
    turnover24h: row.turnover24h,
    skipped: !!row.skipped,
    error: row.error,
    /* Снятая галочка «в книгу бота» должна жить между открытиями окна. */
    include: row.include === false ? false : undefined,
    paramsBrief: row.paramsBrief,
    closed: row.closed,
    wins: row.wins,
    losses: row.losses,
    netUsd: row.netUsd,
    winRate: row.winRate,
    expectancyR: row.expectancyR,
    maxDrawdownUsd: row.maxDrawdownUsd,
    tf: row.tf,
    /* Нужен для «Применить к боту»; best не храним (тяжёлый). */
    patch:
      row.patch &&
      typeof row.patch ===
      "object"
        ? row.patch
        : undefined
  };
}

/**
 * @param {string} strategyId st1|st2|st3
 * @param {string} [expectedSettingsKey] invalidate rows from other indicator settings
 * @returns {object|null}
 */
export function loadOptimizeUniverseResult(strategyId, expectedSettingsKey = ""){
  const key = String(strategyId || "").toLowerCase();
  if(!key){
    return null;
  }
  const root = readRoot(ALGO_OPTIMIZE_UNIVERSE_RESULTS_KEY);
  const byEx = root[exchangeScope()];
  const payload = byEx && typeof byEx === "object" ? byEx[key] : null;
  if(!payload || typeof payload !== "object"){
    return null;
  }
  const settingsKey = String(payload.settingsKey || "");
  if(
    expectedSettingsKey &&
    settingsKey !== String(expectedSettingsKey)
  ){
    return null;
  }
  return {
    rows: Array.isArray(payload.rows) ? payload.rows : [],
    done: Number(payload.done) || 0,
    total: Number(payload.total) || 0,
    tf: String(payload.tf || ""),
    statsMode: String(payload.statsMode || ""),
    settingsKey,
    finishedAt: Number(payload.finishedAt) || 0,
    partial: payload.partial === true
  };
}

/**
 * @param {string} strategyId
 * @param {{
 *   rows?: object[],
 *   done?: number,
 *   total?: number,
 *   tf?: string,
 *   statsMode?: string,
 *   settingsKey?: string,
 *   partial?: boolean
 * }} payload
 */
export function saveOptimizeUniverseResult(strategyId, payload){
  const key = String(strategyId || "").toLowerCase();
  if(!key || !payload){
    return;
  }
  const root = readRoot(ALGO_OPTIMIZE_UNIVERSE_RESULTS_KEY);
  const ex = exchangeScope();
  const byEx = root[ex] && typeof root[ex] === "object" ? { ...root[ex] } : {};
  byEx[key] = {
    rows: Array.isArray(payload.rows)
      ? payload.rows.map(leanOptimizeRow)
      : [],
    done: Number(payload.done) || 0,
    total: Number(payload.total) || 0,
    tf: String(payload.tf || ""),
    statsMode: String(payload.statsMode || ""),
    settingsKey: String(payload.settingsKey || ""),
    finishedAt: Date.now(),
    partial: payload.partial === true
  };
  root[ex] = byEx;
  writeRoot(ALGO_OPTIMIZE_UNIVERSE_RESULTS_KEY, root);
}
