/**
 * BingX trade config — только BingX, без Bybit.
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

const BINGX_TRADE = {
  id: "bingx",
  /* Renderer uses main stream snapshot — no periodic REST poll. */
  positionsSyncIntervalMs: 0,
  restPositionsForceRefresh: false,
  restOrdersForceRefresh: false,
  autoStopDelayMs: 2500,
  setStopMaxAttempts: 4,
  pauseBeforeTpMs: 400,
  reconcileOnOpenDelayMs: 1200,
  attachStopsInMainProcess: false,
  passAutoStopUsdOnOpen: true,
  skipSyncPositionAfterClose: true,
  skipSyncPositionAfterStopCancel: true,
  skipSyncPositionAfterStopAmend: true,
  mergePositionStopsFromPrev: false,
  recentlyClosedMs: 2500,
  verifyEmptyPositionViaList: true,
  streamMissClearsCache: true,
  softKeepCachedOnEmptyGetPosition: false,
  filterRecentlyClosedInBookRefresh: true,
  emptyCredentialsHint: "Подключите BingX в шапке",
  rateLimitedMessage:
    "Превышен лимит запросов BingX. Подождите немного.",
  /* Terminal markers: closed PnL already carries open/close + side. */
  fetchClosedPnlTradeDetails: false,
  closedPnlForceRefresh: true,
  closedPnlEnrichOnFetch: true,
  positionMapKey,
  keysMatchSymbol
};

export function getTradeConfig() {
  return BINGX_TRADE;
}

export default BINGX_TRADE;
