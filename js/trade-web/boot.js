/**
 * Web trade layer — same UI as desktop, Railway Bybit instead of IPC.
 * Desktop boot (`trade-desktop-boot.js`) is untouched.
 */
import {
  cssUrl
} from "../asset-manifest.js?v=7786776c";
import {
  isTerminalPageOnly,
  isWatchlistPage
} from "../page-routes.js?v=4dc7f350";
import {
  initTradeExchangeSettings
} from "../trade-exchange-settings.js?v=b3d0addb";
import {
  initTradeVolumePresets
} from "../trade-volume-presets.js?v=adb9109d";
import {
  initTradeLeverageSettings
} from "../trade-leverage-settings.js?v=e651fab9";
import {
  initTradeMarketEntry
} from "../trade-market-entry.js?v=2aff60ba";
import {
  initTradeBookPanel
} from "../trade-book-panel.js?v=71c0b500";
import {
  loadTradeExchangeModules
} from "../trade/module-router.js?v=4bf93e4d";
import {
  getActiveExchangeId,
  setActiveExchangeId
} from "../market-api.js?v=00f19708";
import {
  installWebTradingShell
} from "./client.js?v=4050e4f8";

const TRADE_CSS = [
  "trade-exchange-settings.css",
  "trade-volume-presets.css",
  "trade-leverage-settings.css",
  "trade-market-entry.css",
  "trade-book-panel.css",
  "trade-pnl-share-modal.css",
  "trade-chart-overlay.css",
  "trade-order-plus-ui.css",
  "trade-widget-compact.css"
];

export function isWebTradeMode() {
  return (
    !window.cryptoTerminalDesktop?.isDesktop &&
    !!window.cryptoTerminalDesktop?.webTrading
  );
}

export function isWebTerminalTradeMode() {
  return isWebTradeMode() && isTerminalPageOnly();
}

export function isWatchlistTradeMode() {
  return isWebTradeMode() && isWatchlistPage();
}

/** Мосбиржа — только рынок; веб-торговля Bybit не должна сбрасывать active exchange. */
function isMoexReadOnlyMarket() {
  return getActiveExchangeId() === "moex";
}

function enableTradeCss() {
  for (const name of TRADE_CSS) {
    const href = cssUrl(name);
    if (!document.querySelector(`link[rel="stylesheet"][href^="/css/${name}"]`)) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = href;
      document.head.appendChild(link);
    }
  }
  document.body.classList.add("trade-page");
}

export async function initTradeWebBeforeChart(options = {}) {
  if (window.cryptoTerminalDesktop?.isDesktop) {
    return;
  }
  if (isMoexReadOnlyMarket()) {
    return;
  }
  installWebTradingShell();
  const mode = options.mode || "terminal";
  if (mode === "watchlist") {
    if (!isWatchlistPage()) {
      return;
    }
    setActiveExchangeId("bybit");
    enableTradeCss();
    initTradeExchangeSettings();
    await loadTradeExchangeModules("bybit");
    const { initExchangeTradingGate } = await import(
      "../exchange-trading-gate.js?v=660e17ec"
    );
    await initExchangeTradingGate();
    return;
  }
  if (!isWebTerminalTradeMode()) {
    return;
  }
  setActiveExchangeId("bybit");
  enableTradeCss();
  initTradeExchangeSettings();
  await loadTradeExchangeModules("bybit");
  initTradeVolumePresets();
  initTradeLeverageSettings();
  initTradeMarketEntry();
  const { initExchangeTradingGate } = await import(
    "../exchange-trading-gate.js?v=660e17ec"
  );
  await initExchangeTradingGate();
  const { initTradePositionSounds } = await import(
    "../trade-position-sounds.js?v=2db7043e"
  );
  initTradePositionSounds();
  const { initTradePositionsLive } = await import(
    "../trade-positions-live.js?v=2db0b33a"
  );
  initTradePositionsLive();
  const { initTradeOpenPositions } = await import(
    "../trade-open-positions.js?v=36b9ffae"
  );
  initTradeOpenPositions();
}

export async function initTradeWebAfterChart(options = {}) {
  if (!isWebTradeMode()) {
    return;
  }
  if (isMoexReadOnlyMarket()) {
    return;
  }
  const mode = options.mode || "terminal";
  if (mode === "watchlist") {
    if (!isWatchlistPage()) {
      return;
    }
    const { initTradePositionsCache } = await import(
      "../trade-positions-cache.js?v=25299240"
    );
    initTradePositionsCache();
    window.__tradeAppReady = true;
    window.dispatchEvent(new CustomEvent("trade-app-ready"));
    return;
  }
  if (!isWebTerminalTradeMode()) {
    return;
  }
  await new Promise((resolve) => {
    if (window.__tradeChartHost) {
      resolve();
      return;
    }
    const t = window.setTimeout(resolve, 8000);
    window.addEventListener(
      "trade-chart-host-ready",
      () => {
        window.clearTimeout(t);
        resolve();
      },
      { once: true }
    );
  });
  const { initTradeChartOverlay } = await import(
    "../trade-chart-overlay.js?v=cf69d5b7"
  );
  initTradeChartOverlay();
  const { initTradeChartOrders } = await import(
    "../trade-chart-orders.js?v=e8c5ae76"
  );
  initTradeChartOrders();
  const { initTradeChartExecutionMarkers } = await import(
    "../trade-chart-execution-markers.js?v=97d5060b"
  );
  initTradeChartExecutionMarkers();
  initTradeBookPanel();
  window.__tradeAppReady = true;
  window.dispatchEvent(new CustomEvent("trade-app-ready"));
}
