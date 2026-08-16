/**
 * Facade → активный модуль Bybit или BingX (js/trade/bybit|bingx).
 */
import {
  getLoadedTradeExchangeModules
} from "./trade/module-router.js?v=15";

function mod() {
  return getLoadedTradeExchangeModules();
}

export function markTradePositionRecentlyClosed(...args) {
  return mod()?.markTradePositionRecentlyClosed?.(...args);
}

export function isTradePositionRecentlyClosed(...args) {
  return !!mod()?.isTradePositionRecentlyClosed?.(...args);
}

export function clearTradePositionRecentlyClosed(...args) {
  return mod()?.clearTradePositionRecentlyClosed?.(...args);
}

export function getCachedPosition(...args) {
  return mod()?.getCachedPosition?.(...args) || null;
}

export function listCachedPositionsForSymbol(...args) {
  return mod()?.listCachedPositionsForSymbol?.(...args) || [];
}

export function getAllCachedPositions(...args) {
  return mod()?.getAllCachedPositions?.(...args) || [];
}

export function applyLiveMarkPrice(...args) {
  return mod()?.applyLiveMarkPrice?.(...args) || false;
}

export function removeTradePositionFromCache(...args) {
  return mod()?.removeTradePositionFromCache?.(...args) || false;
}

export function upsertTradePositionInCache(...args) {
  return mod()?.upsertTradePositionInCache?.(...args) || false;
}

export function applyTradePositionsStream(...args) {
  return mod()?.applyTradePositionsStream?.(...args);
}

export function clearTradePositionsCache(...args) {
  return mod()?.clearTradePositionsCache?.(...args);
}

export function getTradePositionsCacheSyncError(...args) {
  return mod()?.getTradePositionsCacheSyncError?.(...args) || null;
}

export async function syncTradePositionsCache(...args) {
  const fn = mod()?.syncTradePositionsCache;
  if (typeof fn !== "function") {
    return { ok: false };
  }
  return fn(...args);
}

export function initTradePositionsCache(...args) {
  return mod()?.initTradePositionsCache?.(...args);
}
