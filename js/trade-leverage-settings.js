/**
 * Facade → плечо активной биржи.
 */
import {
  getLoadedTradeExchangeModules
} from "./trade/module-router.js?v=571221ae";

function mod() {
  return getLoadedTradeExchangeModules();
}

export function mountTradeLeverageControl(...args) {
  return mod()?.mountTradeLeverageControl?.(...args) || null;
}

export function initTradeLeverageSettings(...args) {
  return mod()?.initTradeLeverageSettings?.(...args) || null;
}
