/**
 * Facade → линии ордеров активной биржи.
 */
import {
  getLoadedTradeExchangeModules
} from "./trade/module-router.js?v=1e9001a6";

function mod() {
  return getLoadedTradeExchangeModules();
}

export function createTradeChartOrders(...args) {
  return mod()?.createTradeChartOrders?.(...args) || null;
}

export function initTradeChartOrders(...args) {
  return mod()?.initTradeChartOrders?.(...args) || null;
}
