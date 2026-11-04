/**
 * Facade → плечо активной биржи.
 */
import {
  getLoadedTradeExchangeModules
} from "./trade/module-router.js?v=bfc448df";

function mod() {
  return getLoadedTradeExchangeModules();
}

export function mountTradeLeverageControl(...args) {
  return mod()?.mountTradeLeverageControl?.(...args) || null;
}

export function initTradeLeverageSettings(...args) {
  return mod()?.initTradeLeverageSettings?.(...args) || null;
}
