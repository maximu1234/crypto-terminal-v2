/**
 * Facade → активный book-panel Bybit или BingX.
 */
import {
  getLoadedTradeExchangeModules
} from "./trade/module-router.js?v=c3217e50";

function mod() {
  return getLoadedTradeExchangeModules();
}

export function initTradeBookPanel(...args) {
  return mod()?.initTradeBookPanel?.(...args) || null;
}
