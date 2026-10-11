/**
 * Facade → активный chart-overlay Bybit или BingX.
 */
import {
  getLoadedTradeExchangeModules
} from "./trade/module-router.js?v=4bd831ab";

function mod() {
  return getLoadedTradeExchangeModules();
}

export function createTradeChartOverlay(...args) {
  return mod()?.createTradeChartOverlay?.(...args) || null;
}

export function initTradeChartOverlay(...args) {
  return mod()?.initTradeChartOverlay?.(...args) || null;
}
