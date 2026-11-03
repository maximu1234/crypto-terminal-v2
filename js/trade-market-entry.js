/**
 * Facade → активный market-entry Bybit или BingX.
 */
import {
  getLoadedTradeExchangeModules
} from "./trade/module-router.js?v=a955e70e";

function mod() {
  return getLoadedTradeExchangeModules();
}

export function initTradeMarketEntry(...args) {
  return mod()?.initTradeMarketEntry?.(...args) || null;
}

export function openWidgetMarketPosition(...args) {
  return mod()?.openWidgetMarketPosition?.(...args);
}
