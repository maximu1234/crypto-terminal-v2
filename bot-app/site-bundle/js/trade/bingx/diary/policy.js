/**
 * BingX diary policy — sparse income rows need sanitize; past day-cache
 * must persist after first successful load (only today is polled again).
 */

export function diarySanitizeTrade(trade) {
  if (!trade) {
    return trade;
  }

  if (
    trade.resolved === true &&
    Number(trade.closeTimeMs) > Number(trade.openTimeMs) &&
    Number(trade.durationMs) > 0 &&
    (trade.side === "long" || trade.side === "short")
  ) {
    return {
      ...trade,
      sparse: false
    };
  }

  const openMs = Number(trade.openTimeMs);
  const closeMs = Number(trade.closeTimeMs);
  const sparse =
    trade.sparse === true ||
    !(closeMs > openMs) ||
    !Number(trade.durationMs);

  if (!sparse) {
    return trade;
  }

  return {
    ...trade,
    sparse: true,
    side: "",
    avgEntryPrice: 0,
    avgExitPrice: 0,
    durationMs: 0,
    openTimeMs: Number.isFinite(closeMs) ? closeMs : openMs,
    closeTimeMs: Number.isFinite(closeMs) ? closeMs : openMs,
    listCloseTimeMs: trade.listCloseTimeMs ?? closeMs
  };
}

export function isCompleteDiaryListTrade(trade) {
  return (
    !!trade &&
    !trade.sparse &&
    Number(trade.durationMs) > 0 &&
    Number(trade.closeTimeMs) > Number(trade.openTimeMs) &&
    (trade.side === "long" || trade.side === "short")
  );
}

/**
 * null = never fetched. [] / any stored rows = reuse past day.
 * Incomplete rows are sanitized on paint; do not reject the whole day or
 * every visit re-downloads the month.
 */
export function diaryAcceptDayCache(hit) {
  return hit !== null;
}
