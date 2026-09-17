/**
 * Facade → boot дневника активной биржи.
 * Desktop IPC or web Railway; without either, redirect to screener.
 */
import {
  isDesktopTradeDiaryContext
} from "./trade-diary-access.js?v=4";

import {
  getLoadedTradeExchangeModules,
  loadTradeExchangeModules
} from "./trade/module-router.js?v=23";

import {
  installWebTradingShell
} from "./trade-web/client.js?v=6";

import {
  setActiveExchangeId
} from "./market-api.js?v=6";

if (!window.cryptoTerminalDesktop?.isDesktop) {
  installWebTradingShell();
  setActiveExchangeId("bybit");
}

if (!isDesktopTradeDiaryContext()) {
  location.replace("/screener.html");
} else {
  await loadTradeExchangeModules();

  const boot = getLoadedTradeExchangeModules()?.bootTradeDiaryPage;

  if (typeof boot === "function") {
    await boot();
  }
}
