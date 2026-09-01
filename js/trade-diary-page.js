/**
 * Facade → boot дневника активной биржи.
 * Desktop-only: без desktop-контекста редирект на скринер.
 */
import {
  isDesktopTradeDiaryContext
} from "./trade-diary-access.js?v=3";

import {
  getLoadedTradeExchangeModules,
  loadTradeExchangeModules
} from "./trade/module-router.js?v=16";

if (!isDesktopTradeDiaryContext()) {
  location.replace("/screener.html");
} else {
  await loadTradeExchangeModules();

  const boot = getLoadedTradeExchangeModules()?.bootTradeDiaryPage;

  if (typeof boot === "function") {
    await boot();
  }
}
