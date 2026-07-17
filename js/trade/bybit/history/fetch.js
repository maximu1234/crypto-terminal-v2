/**
 * Terminal «История сделок» — только Bybit.
 *
 * List closed-PnL alone is not enough for long holds: bulk execution lookback
 * across the whole chart window often misses the real open fill. Diary detail
 * already resolves open via closeTime − 180d + avgEntryPrice — reuse that.
 */
import {
  closedPnlTradesToExecutions,
  normalizeSymbol
} from "../../../trade-markers-sandbox/marker-math.js?v=10";

const CHART_START_BUFFER_MS = 2 * 60 * 60 * 1000;
const DETAIL_CONCURRENCY = 4;

function tradingApi() {
  return window.cryptoTerminalDesktop?.trading;
}

function isUsableTrade(trade, symbol) {
  const closeMs = Number(trade?.closeTimeMs);
  return (
    normalizeSymbol(trade?.symbol) === symbol &&
    !trade?.sparse &&
    Number.isFinite(closeMs) &&
    closeMs > 0 &&
    (trade?.side === "long" || trade?.side === "short")
  );
}

function sideIsLong(side) {
  return ["long", "buy"].includes(String(side || "").toLowerCase());
}

async function mapPool(items, concurrency, mapper) {
  const out = new Array(items.length);
  let next = 0;

  async function worker() {
    while (next < items.length) {
      const index = next;
      next += 1;
      out[index] = await mapper(items[index], index);
    }
  }

  const workers = Array.from(
    { length: Math.min(concurrency, Math.max(1, items.length)) },
    () => worker()
  );
  await Promise.all(workers);
  return out;
}

function executionsFromResolvedTrade(trade, chartStartMs) {
  const openMs = Number(trade.openTimeMs);
  const closeMs = Number(trade.closeTimeMs);
  if (
    !Number.isFinite(openMs) ||
    !Number.isFinite(closeMs) ||
    openMs <= 0 ||
    closeMs <= 0 ||
    openMs === closeMs
  ) {
    return { trade: null, executions: [] };
  }

  const isLong = sideIsLong(trade.side);
  const executions = [];

  if (openMs >= chartStartMs) {
    executions.push({
      execTimeMs: openMs,
      side: isLong ? "Buy" : "Sell"
    });
  }

  if (closeMs >= chartStartMs) {
    executions.push({
      execTimeMs: closeMs,
      side: isLong ? "Sell" : "Buy"
    });
  }

  return {
    trade,
    executions
  };
}

async function resolveTradeOpenClose(api, trade) {
  if (typeof api.getTradeDiaryDetail !== "function") {
    return trade;
  }

  const openHint = Number(trade.openTimeMs);
  const closeMs = Number(trade.closeTimeMs);
  const detail = await api.getTradeDiaryDetail({
    symbol: trade.symbol,
    openTimeMs: Number.isFinite(openHint) && openHint > 0
      ? openHint
      : closeMs,
    closeTimeMs: closeMs,
    side: trade.side,
    qty: trade.qty,
    orderId: trade.orderId,
    avgEntryPrice: trade.avgEntryPrice,
    avgExitPrice: trade.avgExitPrice
  }).catch(() => null);

  if (!detail?.ok) {
    return trade;
  }

  const entryMs = Number(
    detail.openTimeMs ||
    detail.entries?.[0]?.execTimeMs ||
    trade.openTimeMs
  );
  const exitMs = Number(
    detail.closeTimeMs ||
    (
      detail.exits?.length
        ? detail.exits[detail.exits.length - 1].execTimeMs
        : trade.closeTimeMs
    )
  );

  if (
    !Number.isFinite(entryMs) ||
    !Number.isFinite(exitMs) ||
    entryMs <= 0 ||
    exitMs <= 0 ||
    entryMs === exitMs
  ) {
    return trade;
  }

  return {
    ...trade,
    openTimeMs: entryMs,
    closeTimeMs: exitMs,
    durationMs: Math.max(0, exitMs - entryMs),
    avgEntryPrice: Number(detail.avgEntryPrice) > 0
      ? detail.avgEntryPrice
      : trade.avgEntryPrice,
    avgExitPrice: Number(detail.avgExitPrice) > 0
      ? detail.avgExitPrice
      : trade.avgExitPrice
  };
}

export async function fetchTradeHistoryForSymbol(symbol, chartStartSec) {
  const want = normalizeSymbol(symbol);
  const api = tradingApi();

  if (!api?.getClosedPnl) {
    return {
      ok: false,
      trades: [],
      executions: [],
      message: "trading API недоступен"
    };
  }

  if (!want) {
    return {
      ok: false,
      trades: [],
      executions: [],
      message: "символ не задан"
    };
  }

  const endTime = Date.now();
  const chartStartMs = Number.isFinite(chartStartSec)
    ? chartStartSec * 1000
    : endTime - 90 * 24 * 60 * 60 * 1000;
  const startTime = Math.max(0, chartStartMs - CHART_START_BUFFER_MS);

  let result;
  try {
    result = await api.getClosedPnl({
      symbol: want,
      startTime,
      endTime,
      /*
       * List open times are untrusted for Terminal markers. Detail resolves
       * each close with the same 180d + avgEntryPrice matcher as Diary.
       */
      skipExecutions: true,
      parallelChunks: true,
      forceRefresh: false,
      exchangeId: "bybit"
    });
  } catch (err) {
    return {
      ok: false,
      trades: [],
      executions: [],
      message: err?.message || String(err)
    };
  }

  if (!result?.ok) {
    return {
      ok: false,
      trades: [],
      executions: [],
      message: result?.message || "closed PnL error"
    };
  }

  const closedTrades = (Array.isArray(result.trades) ? result.trades : [])
    .filter((trade) => isUsableTrade(trade, want));

  if (!closedTrades.length) {
    return {
      ok: true,
      trades: [],
      executions: [],
      message: "сделок нет"
    };
  }

  const resolvedTrades = await mapPool(
    closedTrades,
    DETAIL_CONCURRENCY,
    (trade) => resolveTradeOpenClose(api, trade)
  );

  const trades = [];
  const executions = [];

  for (const trade of resolvedTrades) {
    const packed = executionsFromResolvedTrade(trade, chartStartMs);
    if (!packed.trade) {
      continue;
    }
    trades.push(packed.trade);
    executions.push(...packed.executions);
  }

  if (!trades.length && closedTrades.length) {
    const fallback = closedPnlTradesToExecutions(closedTrades, want)
      .filter((execution) => Number(execution.execTimeMs) >= chartStartMs);
    return {
      ok: true,
      trades: closedTrades,
      executions: fallback,
      message: "без детализации входа"
    };
  }

  return {
    ok: true,
    trades,
    executions,
    message: result.source ? String(result.source) : ""
  };
}
