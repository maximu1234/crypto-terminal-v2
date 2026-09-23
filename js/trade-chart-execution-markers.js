/**
 * Facade → маркеры истории сделок активной биржи.
 */
import {
  getLoadedTradeExchangeModules
} from "./trade/module-router.js?v=24";

function mod() {
  return getLoadedTradeExchangeModules();
}

export function mountTradeChartMarkersToggle(...args) {
  return mod()?.mountTradeChartMarkersToggle?.(...args) || null;
}

export function initTradeChartExecutionMarkers(...args) {
  return mod()?.initTradeChartExecutionMarkers?.(...args) || null;
}

export function applyDiaryTradeDeepLink(...args) {
  return mod()?.applyDiaryTradeDeepLink?.(...args);
}
