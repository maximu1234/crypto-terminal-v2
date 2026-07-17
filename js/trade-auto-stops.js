/**
 * Facade → активный auto-stops Bybit или BingX.
 */
import {
  getLoadedTradeExchangeModules
} from "./trade/module-router.js?v=11";

function mod() {
  return getLoadedTradeExchangeModules();
}

export function getAutoStopSettings(...args) {
  return mod()?.getAutoStopSettings?.(...args) || {
    slEnabled: false,
    slUsd: 0,
    tpEnabled: false,
    tpUsd: 0
  };
}

export function positionStopIdentity(...args) {
  return mod()?.positionStopIdentity?.(...args) || "";
}

export function markStopDismissed(...args) {
  return mod()?.markStopDismissed?.(...args);
}

export function clearDismissedStops(...args) {
  return mod()?.clearDismissedStops?.(...args);
}

export function isStopDismissed(...args) {
  return !!mod()?.isStopDismissed?.(...args);
}

export function saveAutoStopSettings(...args) {
  return mod()?.saveAutoStopSettings?.(...args);
}

export function calcStopPriceFromUsd(...args) {
  return mod()?.calcStopPriceFromUsd?.(...args) || 0;
}

export async function applyAutoStopsAfterEntry(...args) {
  const fn = mod()?.applyAutoStopsAfterEntry;
  if (typeof fn !== "function") {
    return;
  }
  return fn(...args);
}

export function maybeApplyAutoStopsForNewPosition(...args) {
  return mod()?.maybeApplyAutoStopsForNewPosition?.(...args);
}

export function wireAutoStopSettings(...args) {
  return mod()?.wireAutoStopSettings?.(...args);
}
