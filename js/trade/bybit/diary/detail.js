/**
 * Bybit diary detail — metka-69 contract.
 * Success is { ok:true, entries, exits, executions, avg* } without `resolved`.
 * Never wipe list side when detail omits side.
 */

export function diaryBuildDetailRequest(trade) {
  return {
    symbol: trade.symbol,
    openTimeMs: trade.openTimeMs,
    closeTimeMs: trade.closeTimeMs,
    side: trade.side,
    qty: trade.qty,
    orderId: trade.orderId,
    avgEntryPrice: trade.avgEntryPrice,
    avgExitPrice: trade.avgExitPrice
  };
}

export function diaryInterpretDetailResult(result) {
  if (result?.ok === false) {
    return {
      ok: false,
      failMessage: result?.message || "Не удалось загрузить исполнения"
    };
  }
  if (result?.ok) {
    return { ok: true, detail: result };
  }
  return { ok: true, detail: null };
}

export function diaryApplyDetailToTrade(trade, detail) {
  if (!trade || !detail) {
    return;
  }

  if (
    Number.isFinite(Number(detail.openTimeMs)) &&
    Number.isFinite(Number(detail.closeTimeMs)) &&
    Number(detail.closeTimeMs) > Number(detail.openTimeMs)
  ) {
    trade.openTimeMs = Number(detail.openTimeMs);
    trade.closeTimeMs = Number(detail.closeTimeMs);
    trade.durationMs = Number.isFinite(Number(detail.durationMs))
      ? Number(detail.durationMs)
      : trade.closeTimeMs - trade.openTimeMs;
  }

  /* Preserve list side unless detail returns an explicit long/short. */
  if (detail.side === "long" || detail.side === "short") {
    trade.side = detail.side;
  }

  if (Number(detail.avgEntryPrice) > 0) {
    trade.avgEntryPrice = detail.avgEntryPrice;
  }
  if (Number(detail.avgExitPrice) > 0) {
    trade.avgExitPrice = detail.avgExitPrice;
  }
}

export function diaryAfterDetailSuccess(_trade, _detail) {
  /* Bybit does not write day-cache from detail. */
}
