/**
 * Per-ticker overlays for the Algo «Данные» panel (not the bot book).
 * «Применить ко всем» writes a patch per symbol; flipping tickers hydrates it.
 */

export const ALGO_TICKER_STRATEGY_OVERLAYS_KEY =
"algo_trading_ticker_strategy_overlays_v1";

const EXCHANGE_STORAGE_KEY =
"multichart_active_exchange_v1";

/**
 * @param {string} symbol
 * @returns {string}
 */
export function normalizeTickerOverlaySymbol(symbol){
  return String(symbol || "")
    .replace(/\.P$/i, "")
    .trim()
    .toUpperCase();
}

function normalizeStrategyId(raw){
  const id = String(raw || "").toLowerCase();
  return id === "st2" || id === "st3" ? id : "st1";
}

function exchangeScope(){
  try{
    const raw = String(localStorage.getItem(EXCHANGE_STORAGE_KEY) || "").toLowerCase();
    if(raw === "bingx" || raw === "bybit"){
      return raw;
    }
  }catch{
    /* ignore */
  }
  return "bybit";
}

function readRoot(){
  try{
    const raw = localStorage.getItem(ALGO_TICKER_STRATEGY_OVERLAYS_KEY);
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

function writeRoot(root){
  try{
    localStorage.setItem(
      ALGO_TICKER_STRATEGY_OVERLAYS_KEY,
      JSON.stringify(root)
    );
  }catch(err){
    console.warn("[algo-trading] ticker strategy overlays persist", err);
  }
}

function bucket(root, strategyId){
  const ex = exchangeScope();
  const id = normalizeStrategyId(strategyId);
  const byEx = root[ex] && typeof root[ex] === "object" ? root[ex] : {};
  const bySt = byEx[id] && typeof byEx[id] === "object" ? byEx[id] : {};
  return {
    ex,
    id,
    byEx,
    bySt
  };
}

/**
 * @param {string} strategyId
 * @param {string} symbol
 * @returns {object|null}
 */
export function getTickerStrategyOverlay(strategyId, symbol){
  const key = normalizeTickerOverlaySymbol(symbol);
  if(!key){
    return null;
  }
  const { bySt } = bucket(readRoot(), strategyId);
  const patch = bySt[key];
  return patch && typeof patch === "object" ? patch : null;
}

/**
 * @param {string} strategyId
 * @param {string} symbol
 * @returns {boolean}
 */
export function hasTickerStrategyOverlay(strategyId, symbol){
  return !!getTickerStrategyOverlay(strategyId, symbol);
}

/**
 * @param {string} strategyId
 * @param {string} symbol
 * @param {object} patch
 */
export function setTickerStrategyOverlay(strategyId, symbol, patch){
  const key = normalizeTickerOverlaySymbol(symbol);
  if(!key || !patch || typeof patch !== "object"){
    return;
  }
  const root = readRoot();
  const { ex, id, byEx, bySt } = bucket(root, strategyId);
  bySt[key] = patch;
  byEx[id] = bySt;
  root[ex] = byEx;
  writeRoot(root);
}

/**
 * Merge patches for many tickers of one strategy. Existing other symbols stay.
 * @param {string} strategyId
 * @param {{ symbol: string, patch: object }[]} entries
 * @returns {number} written count
 */
export function writeTickerStrategyOverlays(strategyId, entries){
  const list = Array.isArray(entries) ? entries : [];
  const root = readRoot();
  const { ex, id, byEx, bySt } = bucket(root, strategyId);
  let written = 0;
  for(const row of list){
    const key = normalizeTickerOverlaySymbol(row?.symbol);
    const patch = row?.patch;
    if(!key || !patch || typeof patch !== "object"){
      continue;
    }
    bySt[key] = patch;
    written += 1;
  }
  if(!written){
    return 0;
  }
  byEx[id] = bySt;
  root[ex] = byEx;
  writeRoot(root);
  return written;
}
