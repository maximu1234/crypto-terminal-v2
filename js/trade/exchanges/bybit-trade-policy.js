/**
 * Bybit trade UI policy — edit here without touching BingX.
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

export default {
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
  filterRecentlyClosedInBookRefresh: false,
  emptyCredentialsHint: "Подключите Bybit в шапке",
  positionMapKey,
  keysMatchSymbol
};
