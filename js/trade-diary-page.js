/**
 * Facade → boot дневника активной биржи.
 * Desktop IPC or web Railway; without either, redirect to screener.
 */
import {
  isDesktopTradeDiaryContext
} from "./trade-diary-access.js?v=c3fda1b4";

import {
  getLoadedTradeExchangeModules,
  loadTradeExchangeModules
} from "./trade/module-router.js?v=f9d37714";

import {
  installWebTradingShell
} from "./trade-web/client.js?v=4050e4f8";

import {
  setActiveExchangeId
} from "./market-api.js?v=00f19708";

import {
  mountMoexUnavailableStub
} from "./exchanges/moex-readonly-stub.js?v=4606d3be";

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
