/**
 * BingX diary detail — hard-fail on resolved:false; persist resolved into day-cache.
 */
import {
  getActiveExchangeId
} from "../../../market-api.js?v=5";

import {
  dayKeyFromMs,
  readDiaryDayTrades,
  writeDiaryDayTrades
} from "../../../trade-diary-storage.js?v=4";

export function diaryBuildDetailRequest(trade) {
  return {
    symbol: trade.symbol,
    openTimeMs: trade.openTimeMs,
    closeTimeMs: trade.closeTimeMs,
    side: trade.sparse ? "" : trade.side,
    qty: trade.qty,
    orderId: trade.orderId,
    positionId: trade.positionId || trade.orderId,
    avgEntryPrice: trade.sparse ? 0 : trade.avgEntryPrice,
    avgExitPrice: trade.sparse ? 0 : trade.avgExitPrice,
    sparse:
      !!trade.sparse ||
      Number(trade.openTimeMs) === Number(trade.closeTimeMs),
    exchangeId: getActiveExchangeId()
  };
}

export function diaryInterpretDetailResult(result) {
  if (result?.ok === false || result?.resolved === false) {
    return {
      ok: false,
      failMessage:
        result?.message || "Не удалось определить закрытую сделку"
    };
  }
  if (result?.ok) {
    return { ok: true, detail: result };
  }
  return {
    ok: false,
    failMessage: "Не удалось определить закрытую сделку"
  };
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
    trade.sparse = false;
    trade.resolved = true;
  }

  /* Including "" clears poisoned Long from incomplete income rows. */
  trade.side = detail.side || "";

  if (Number(detail.avgEntryPrice) > 0) {
    trade.avgEntryPrice = detail.avgEntryPrice;
  }
  if (Number(detail.avgExitPrice) > 0) {
    trade.avgExitPrice = detail.avgExitPrice;
  }
}

export function diaryAfterDetailSuccess(trade) {
  try {
    const exchangeId = getActiveExchangeId() || "bingx";
    const dayKey = dayKeyFromMs(
      Number(trade.listCloseTimeMs) || Number(trade.closeTimeMs)
    );
    const existing = readDiaryDayTrades(exchangeId, dayKey) || [];
    const next = existing.map((row) => {
      const same =
        (String(row.orderId || "") &&
          String(row.orderId) === String(trade.orderId || "")) ||
        (Number(row.closeTimeMs) ===
          Number(trade.listCloseTimeMs || trade.closeTimeMs) &&
          String(row.symbol || "") === String(trade.symbol || ""));
      return same
        ? {
            ...row,
            ...trade,
            sparse: false,
            resolved: true
          }
        : row;
    });

    if (
      !next.some(
        (row) =>
          String(row.orderId || "") === String(trade.orderId || "") &&
          String(row.symbol || "") === String(trade.symbol || "")
      )
    ) {
      next.push({
        ...trade,
        sparse: false,
        resolved: true
      });
    }

    writeDiaryDayTrades(exchangeId, dayKey, next);
  } catch (_err) {
    /* day-cache persist is best-effort */
  }
}
