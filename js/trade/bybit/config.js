/**
 * Bybit trade config — только Bybit, без BingX.
 */

function normalizeSymbol(symbol) {
  return String(symbol || "")
    .replace(/\.P$/i, "")
    .trim()
    .toUpperCase();
}

function positionMapKey(row) {
  return normalizeSymbol(row?.symbol);
}

function keysMatchSymbol(key, symbol) {
  return key === normalizeSymbol(symbol);
}

const BYBIT_TRADE = {
  id: "bybit",
  positionsSyncIntervalMs: 5000,
  autoStopDelayMs: 200,
  setStopMaxAttempts: 1,
  pauseBeforeTpMs: 0,
  reconcileOnOpenDelayMs: 450,
  attachStopsInMainProcess: false,
  passAutoStopUsdOnOpen: false,
  skipSyncPositionAfterClose: false,
  skipSyncPositionAfterStopCancel: false,
  skipSyncPositionAfterStopAmend: false,
  mergePositionStopsFromPrev: true,
  recentlyClosedMs: 5000,
  verifyEmptyPositionViaList: false,
  streamMissClearsCache: false,
  softKeepCachedOnEmptyGetPosition: true,
  filterRecentlyClosedInBookRefresh: false,
  restPositionsForceRefresh: false,
  restOrdersForceRefresh: false,
  emptyCredentialsHint: "Подключите Bybit в шапке",
  fetchClosedPnlTradeDetails: true,
  closedPnlForceRefresh: false,
  closedPnlEnrichOnFetch: false,
  positionMapKey,
  keysMatchSymbol
};

export function getTradeConfig() {
  return BYBIT_TRADE;
}

export default BYBIT_TRADE;
