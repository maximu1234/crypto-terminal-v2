/**
 * Terminal «История сделок» — только BingX.
 *
 * BingX closed-PnL resolver enriches income rows in its own main adapter.
 * It does not use the Bybit execution-history matcher.
 */
import {
  closedPnlTradesToExecutions,
  normalizeSymbol
} from "../../../trade-markers-sandbox/marker-math.js?v=10";

const CHART_START_BUFFER_MS = 2 * 60 * 60 * 1000;

function tradingApi() {
  return window.cryptoTerminalDesktop?.trading;
}

function usableTrades(trades, symbol) {
  return (Array.isArray(trades) ? trades : []).filter((trade) => {
    const openMs = Number(trade?.openTimeMs);
    const closeMs = Number(trade?.closeTimeMs);
    return (
      normalizeSymbol(trade?.symbol) === symbol &&
      !trade?.sparse &&
      Number.isFinite(openMs) &&
      Number.isFinite(closeMs) &&
      openMs > 0 &&
      closeMs > 0 &&
      openMs !== closeMs
    );
  });
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
      /* BingX resolves income rows through its own fills path. */
      skipExecutions: true,
      parallelChunks: true,
      forceRefresh: true,
      enrich: true,
      exchangeId: "bingx"
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

  const trades = usableTrades(result.trades, want);
  const directExecutions = (Array.isArray(result.executions)
    ? result.executions
    : []
  ).filter((execution) => (
    Number.isFinite(Number(execution?.execTimeMs)) &&
    Number(execution.execTimeMs) > 0
  ));
  const derivedExecutions = closedPnlTradesToExecutions(trades, want);

  return {
    ok: true,
    trades,
    executions: derivedExecutions.length
      ? derivedExecutions
      : directExecutions,
    message: result.source ? String(result.source) : ""
  };
}
