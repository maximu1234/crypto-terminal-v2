/**
 * Web Terminal trade layer — Railway Bybit only. Desktop boot is untouched.
 */
import {
  cssUrl
} from "../asset-manifest.js?v=9";
import {
  isTerminalPageOnly
} from "../page-routes.js?v=5";
import {
  initTradeExchangeSettings
} from "../trade-exchange-settings.js?v=24";
import {
  initTradeVolumePresets
} from "../trade-volume-presets.js?v=11";
import {
  initTradeLeverageSettings
} from "../trade-leverage-settings.js?v=4";
import {
  initTradeMarketEntry
} from "../trade-market-entry.js?v=35";
import {
  initTradeBookPanel
} from "../trade-book-panel.js?v=60";
import {
  loadTradeExchangeModules
} from "../trade/module-router.js?v=23";
import {
  setActiveExchangeId
} from "../market-api.js?v=6";
import {
  installWebTradingShell
} from "./client.js?v=1";

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

export function isWebTerminalTradeMode() {
  return (
    !window.cryptoTerminalDesktop?.isDesktop &&
    !!window.cryptoTerminalDesktop?.webTrading &&
    isTerminalPageOnly()
  );
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

export async function initTradeWebBeforeChart() {
  if (window.cryptoTerminalDesktop?.isDesktop) {
    return;
  }
  installWebTradingShell();
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
    "../exchange-trading-gate.js?v=4"
  );
  await initExchangeTradingGate();
  const { initTradePositionSounds } = await import(
    "../trade-position-sounds.js?v=3"
  );
  initTradePositionSounds();
  const { initTradePositionsLive } = await import(
    "../trade-positions-live.js?v=1"
  );
  initTradePositionsLive();
  const { initTradeOpenPositions } = await import(
    "../trade-open-positions.js?v=4"
  );
  initTradeOpenPositions();
}

export async function initTradeWebAfterChart() {
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
    "../trade-chart-overlay.js?v=64"
  );
  initTradeChartOverlay();
  const { initTradeChartOrders } = await import(
    "../trade-chart-orders.js?v=32"
  );
  initTradeChartOrders();
  const { initTradeChartExecutionMarkers } = await import(
    "../trade-chart-execution-markers.js?v=10"
  );
  initTradeChartExecutionMarkers();
  initTradeBookPanel();
  window.__tradeAppReady = true;
  window.dispatchEvent(new CustomEvent("trade-app-ready"));
}
