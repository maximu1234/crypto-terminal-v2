/**
 * Mobile trade helpers — Bybit web shell only, no book/overlay/drawings.
 */
import {
  installWebTradingShell
} from "../trade-web/client.js?v=6";
import {
  setActiveExchangeId
} from "../market-api.js?v=6";
import {
  loadTradeExchangeModules
} from "../trade/module-router.js?v=24";
import {
  getAllCachedPositions,
  syncTradePositionsCache,
  initTradePositionsCache
} from "../trade-positions-cache.js?v=35";

function tradingApi() {
  return window.cryptoTerminalDesktop?.trading || null;
}

export async function initMobileTradeLite() {
  if (window.cryptoTerminalDesktop?.isDesktop) {
    return { ok: false, reason: "desktop" };
  }
  installWebTradingShell();
  setActiveExchangeId("bybit");
  await loadTradeExchangeModules("bybit");
  try {
    const { initExchangeTradingGate } = await import(
      "../exchange-trading-gate.js?v=4"
    );
    await initExchangeTradingGate();
  } catch (err) {
    console.warn("[mobile trade] gate", err);
  }
  try {
    const { initTradePositionsLive } = await import(
      "../trade-positions-live.js?v=1"
    );
    initTradePositionsLive();
  } catch {
    /* optional */
  }
  initTradePositionsCache();
  try {
    await syncTradePositionsCache();
  } catch (err) {
    console.warn("[mobile trade] sync positions", err);
  }
  window.__tradeAppReady = true;
  window.dispatchEvent(new CustomEvent("trade-app-ready"));
  return { ok: true };
}

export function listCachedPositions() {
  return getAllCachedPositions() || [];
}

export async function refreshPositions() {
  await syncTradePositionsCache();
  return listCachedPositions();
}

export async function fetchOpenOrders(symbol) {
  const api = tradingApi();
  if (!api?.getOpenOrders) {
    return [];
  }
  const sym = String(symbol || "").replace(/\.P$/i, "").trim().toUpperCase();
  const res = await api.getOpenOrders(sym || undefined);
  if (Array.isArray(res)) {
    return res;
  }
  if (Array.isArray(res?.orders)) {
    return res.orders;
  }
  if (Array.isArray(res?.list)) {
    return res.list;
  }
  return [];
}

export async function cancelOpenOrder(order) {
  const api = tradingApi();
  if (!api?.cancelOrder) {
    throw new Error("cancelOrder unavailable");
  }
  const symbol = String(order?.symbol || "").replace(/\.P$/i, "").toUpperCase();
  const orderId = order?.orderId || order?.id;
  return api.cancelOrder(symbol, orderId, order);
}

export async function openMarket(symbol, side, volumeUsdt) {
  const { openWidgetMarketPosition } = await import(
    "../trade-market-entry.js?v=35"
  );
  return openWidgetMarketPosition({
    symbol: String(symbol || "").replace(/\.P$/i, "").toUpperCase(),
    side,
    volumeUsdt: Number(volumeUsdt)
  });
}

export async function closeMarket(symbol) {
  const api = tradingApi();
  if (!api?.closePosition) {
    throw new Error("closePosition unavailable");
  }
  const sym = String(symbol || "").replace(/\.P$/i, "").toUpperCase();
  return api.closePosition(sym);
}

export function hasTradingKeys() {
  const st = window.cryptoTerminalDesktop?.trading;
  return !!(st && window.cryptoTerminalDesktop?.webTrading);
}
