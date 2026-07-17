/**
 * Facade → активный market-entry Bybit или BingX.
 */
import {
  getLoadedTradeExchangeModules
} from "./trade/module-router.js?v=4";

function mod() {
  return getLoadedTradeExchangeModules();
}

export function initTradeMarketEntry(...args) {
  return mod()?.initTradeMarketEntry?.(...args) || null;
}
