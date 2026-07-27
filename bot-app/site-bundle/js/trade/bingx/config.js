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
  /* Post-fill: IPC upserts position first, then attachAutoStopsAfterOpen. */
  autoStopDelayMs: 500,
  setStopMaxAttempts: 5,
  pauseBeforeTpMs: 150,
  reconcileOnOpenDelayMs: 800,
  attachStopsInMainProcess: true,
  passAutoStopUsdOnOpen: true,
  skipSyncPositionAfterClose: true,
  skipSyncPositionAfterStopCancel: true,
  skipSyncPositionAfterStopAmend: true,
  /* Keep last SL/TP if a bare stream row omits them; authoritative clears
   * come from main after fresh openOrders (stopLoss/takeProfit explicitly 0). */
  mergePositionStopsFromPrev: true,
  recentlyClosedMs: 2500,
  verifyEmptyPositionViaList: true,
  /* Empty stream after real close must clear; open lag uses optimistic protect. */
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
