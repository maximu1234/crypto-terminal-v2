/**
 * Facade → boot дневника активной биржи.
 * Desktop IPC or web Railway; without either, redirect to screener.
 */
import {
  isDesktopTradeDiaryContext
} from "./trade-diary-access.js?v=5";

import {
  getLoadedTradeExchangeModules,
  loadTradeExchangeModules
} from "./trade/module-router.js?v=37";

import {
  installWebTradingShell
} from "./trade-web/client.js?v=6";

import {
  setActiveExchangeId
} from "./market-api.js?v=14";

import {
  mountMoexUnavailableStub
} from "./exchanges/moex-readonly-stub.js?v=1";

if (
  mountMoexUnavailableStub({
    title: "Дневник",
    host: document.getElementById("trade-diary-panel") || document.querySelector("main")
  })
) {
  const panel = document.getElementById("trade-diary-panel");
  if (panel) {
    panel.classList.remove("hidden");
  }
} else {
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
}
