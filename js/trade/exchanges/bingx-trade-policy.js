/**
 * BingX trade UI policy — edit here without touching Bybit.
 */

function normalizeSymbol(symbol) {
  return String(symbol || "")
    .replace(/\.P$/i, "")
    .trim()
    .toUpperCase();
}

function positionMapKey(row) {
  const sym = normalizeSymbol(row?.symbol);
  if (!sym) {
    return "";
  }
  const raw = String(row?.positionSide || row?.side || "")
    .trim()
    .toUpperCase();
  if (raw === "LONG" || raw === "BUY") {
    return `${sym}:LONG`;
  }
  if (raw === "SHORT" || raw === "SELL") {
    return `${sym}:SHORT`;
  }
  return `${sym}:BOTH`;
}

function keysMatchSymbol(key, symbol) {
  const sym = normalizeSymbol(symbol);
  if (!sym || !key) {
    return false;
  }
  return key === sym || key.startsWith(`${sym}:`);
}

export default {
  id: "bingx",
  positionsSyncIntervalMs: 2500,
  restPositionsForceRefresh: true,
  restOrdersForceRefresh: true,
  autoStopDelayMs: 2500,
  setStopMaxAttempts: 4,
  pauseBeforeTpMs: 400,
  reconcileOnOpenDelayMs: 0,
  attachStopsInMainProcess: false,
  passAutoStopUsdOnOpen: true,
  skipSyncPositionAfterClose: true,
  skipSyncPositionAfterStopCancel: true,
  skipSyncPositionAfterStopAmend: true,
  mergePositionStopsFromPrev: false,
  recentlyClosedMs: 2500,
  verifyEmptyPositionViaList: true,
  filterRecentlyClosedInBookRefresh: true,
  emptyCredentialsHint: "Подключите BingX в шапке",
  rateLimitedMessage:
    "Превышен лимит запросов BingX. Подождите немного.",
  positionMapKey,
  keysMatchSymbol
};
