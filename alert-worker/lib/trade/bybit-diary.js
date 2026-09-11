/**
 * Web Bybit diary: closed-PnL list + execution detail.
 * Isolated from desktop bybit-rest.cjs.
 */
import { signedGet } from "./bybit-ops.js";

const QUERY_MAX_MS = 7 * 24 * 60 * 60 * 1000;
const EXEC_LOOKBACK_MS = 180 * 24 * 60 * 60 * 1000;
const PAGE_LIMIT = 40;
const CHUNK_CONCURRENCY = 4;

function stripSymbol(symbol) {
  return String(symbol || "")
    .replace(/\.P$/i, "")
    .trim()
    .toUpperCase();
}

function parseBybitTimeMs(raw) {
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) {
    return null;
  }
  if (n < 1e12) {
    return Math.round(n * 1000);
  }
  return Math.round(n);
}

function closedPnlPositionSide(closeSide) {
  return String(closeSide || "").toLowerCase() === "sell" ? "long" : "short";
}

export function mapClosedPnlRow(row) {
  if (!row) {
    return null;
  }
  const closedPnl = Number(row.closedPnl);
  if (!Number.isFinite(closedPnl)) {
    return null;
  }
  const closeTimeMs = parseBybitTimeMs(row.updatedTime);
  if (!closeTimeMs) {
    return null;
  }
  const recordCreated = parseBybitTimeMs(row.createdTime);
  const openTimeMs =
    recordCreated && recordCreated < closeTimeMs ? recordCreated : closeTimeMs;
  const cumEntryValue = Number(row.cumEntryValue) || 0;
  const avgEntryPrice = Number(row.avgEntryPrice) || 0;
  const qty =
    Number(row.closedSize) ||
    Number(row.qty) ||
    (avgEntryPrice > 0 && cumEntryValue > 0
      ? cumEntryValue / avgEntryPrice
      : 0);
  return {
    symbol: stripSymbol(row.symbol),
    closeTimeMs,
    openTimeMs,
    durationMs: Math.max(0, closeTimeMs - openTimeMs),
    pnlUsd: closedPnl,
    pnlPct: cumEntryValue > 0 ? (closedPnl / cumEntryValue) * 100 : 0,
    commissionUsd: (Number(row.openFee) || 0) + (Number(row.closeFee) || 0),
    side: closedPnlPositionSide(row.side),
    qty,
    avgEntryPrice,
    avgExitPrice: Number(row.avgExitPrice) || 0,
    leverage: Math.max(
      1,
      Math.min(200, Math.round(Number(row.leverage) || 0) || 1)
    ),
    orderId: String(row.orderId || "")
  };
}

function chunkTimeRange(startMs, endMs) {
  const chunks = [];
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs < startMs) {
    return chunks;
  }
  let cursor = startMs;
  while (cursor <= endMs) {
    const chunkEnd = Math.min(cursor + QUERY_MAX_MS - 1, endMs);
    chunks.push({ startMs: cursor, endMs: chunkEnd });
    cursor = chunkEnd + 1;
  }
  return chunks;
}

function tradeKey(trade) {
  return `${trade.symbol}-${trade.closeTimeMs}-${trade.orderId}`;
}

function mapExecutionRow(row) {
  if (!row) {
    return null;
  }
  const execTimeMs = parseBybitTimeMs(row.execTime);
  if (!execTimeMs) {
    return null;
  }
  return {
    symbol: stripSymbol(row.symbol),
    execTimeMs,
    side: String(row.side || ""),
    execQty: Number(row.execQty) || 0,
    execPrice: Number(row.execPrice) || 0,
    execFee: Number(row.execFee) || 0,
    execValue: Number(row.execValue) || 0,
    orderId: String(row.orderId || ""),
    feeRate: Number(row.feeRate) || 0,
    execId: String(row.execId || "")
  };
}

function executionKey(ex) {
  return (
    ex.execId ||
    [ex.execTimeMs, ex.side, ex.execQty, ex.execPrice, ex.orderId].join("|")
  );
}

function sumExecQty(fills) {
  return (fills || []).reduce(
    (sum, fill) => sum + (Number(fill.execQty) || 0),
    0
  );
}

function weightedAvgPrice(fills) {
  let pq = 0;
  let q = 0;
  for (const fill of fills || []) {
    const qty = Number(fill.execQty) || 0;
    const price = Number(fill.execPrice) || 0;
    if (qty > 0 && price > 0) {
      pq += price * qty;
      q += qty;
    }
  }
  return q > 0 ? pq / q : 0;
}

function pickFillsByQty(candidatesNewestFirst, targetQty) {
  let need = targetQty;
  const selected = [];
  if (!(need > 0)) {
    return selected;
  }
  for (const fill of candidatesNewestFirst) {
    if (need <= 1e-8) {
      break;
    }
    if (!(fill.execQty > 0)) {
      continue;
    }
    selected.push(fill);
    need -= fill.execQty;
  }
  selected.reverse();
  return selected;
}

export function matchTradeExecutions(trade, allExecutions) {
  const symbol = String(trade.symbol || "").toUpperCase();
  const qty = Number(trade.qty) || 0;
  const closeSide = trade.side === "long" ? "Sell" : "Buy";
  const openSide = trade.side === "long" ? "Buy" : "Sell";
  const closeMs = Number(trade.closeTimeMs);
  const closeOrderId = String(trade.orderId || "");
  const pool = (allExecutions || [])
    .filter(
      (ex) =>
        ex.symbol === symbol &&
        ex.execTimeMs <= closeMs + 120000 &&
        ex.execTimeMs >= closeMs - EXEC_LOOKBACK_MS
    )
    .sort((a, b) => a.execTimeMs - b.execTimeMs);

  let exits = [];
  if (closeOrderId) {
    exits = pool.filter(
      (ex) => ex.side === closeSide && ex.orderId === closeOrderId
    );
  }
  if (!exits.length) {
    const candidates = pool
      .filter((ex) => ex.side === closeSide && ex.execTimeMs <= closeMs + 5000)
      .sort((a, b) => b.execTimeMs - a.execTimeMs);
    exits = pickFillsByQty(candidates, qty);
  }

  const exitKeys = new Set(exits.map(executionKey));
  const targetQty = Math.max(qty, sumExecQty(exits));
  const entryCandidates = pool
    .filter(
      (ex) =>
        ex.side === openSide &&
        !exitKeys.has(executionKey(ex)) &&
        ex.execTimeMs <= closeMs + 2000
    )
    .sort((a, b) => b.execTimeMs - a.execTimeMs);
  const entries = pickFillsByQty(entryCandidates, targetQty);
  const executions = [...entries, ...exits].sort(
    (a, b) => a.execTimeMs - b.execTimeMs
  );
  return {
    entries,
    exits,
    executions,
    avgEntryPrice: weightedAvgPrice(entries) || Number(trade.avgEntryPrice) || 0,
    avgExitPrice: weightedAvgPrice(exits) || Number(trade.avgExitPrice) || 0
  };
}

async function fetchClosedPnlPaged(startTime, endTime, symbolFilter) {
  const trades = [];
  let cursor = "";
  for (let page = 0; page < PAGE_LIMIT; page += 1) {
    const query = {
      category: "linear",
      limit: "100"
    };
    if (startTime != null) {
      query.startTime = String(startTime);
    }
    if (endTime != null) {
      query.endTime = String(endTime);
    }
    if (cursor) {
      query.cursor = cursor;
    }
    if (symbolFilter) {
      query.symbol = symbolFilter;
    }
    const result = await signedGet("/v5/position/closed-pnl", query);
    if (!result.ok) {
      if (trades.length) {
        return { ok: true, trades };
      }
      return result;
    }
    const list = result.data?.result?.list;
    if (Array.isArray(list)) {
      for (const row of list) {
        const mapped = mapClosedPnlRow(row);
        if (mapped) {
          trades.push(mapped);
        }
      }
    }
    const next = result.data?.result?.nextPageCursor;
    if (!next || next === cursor) {
      break;
    }
    cursor = next;
  }
  return { ok: true, trades };
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
  const n = Math.min(concurrency, Math.max(1, items.length));
  await Promise.all(Array.from({ length: n }, () => worker()));
  return out;
}

export async function getClosedPnlHistory(options = {}) {
  const startTime = options.startTime != null ? Number(options.startTime) : null;
  const endTime = options.endTime != null ? Number(options.endTime) : null;
  const symbolFilter = stripSymbol(options.symbol) || "";
  const paged = (from, to) =>
    fetchClosedPnlPaged(from, to, symbolFilter || null);

  if (
    startTime == null ||
    endTime == null ||
    endTime - startTime <= QUERY_MAX_MS
  ) {
    return paged(startTime, endTime);
  }

  const chunks = chunkTimeRange(startTime, endTime);
  const results = await mapPool(chunks, CHUNK_CONCURRENCY, (chunk) =>
    paged(chunk.startMs, chunk.endMs)
  );
  const merged = [];
  const seen = new Set();
  let lastError = null;
  for (const result of results) {
    if (!result?.ok) {
      lastError = result;
      continue;
    }
    for (const trade of result.trades || []) {
      const key = tradeKey(trade);
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      merged.push(trade);
    }
  }
  if (!merged.length && lastError) {
    return lastError;
  }
  merged.sort((a, b) => b.closeTimeMs - a.closeTimeMs);
  return { ok: true, trades: merged };
}

async function getExecutionHistory(options = {}) {
  const executions = [];
  let cursor = "";
  for (let page = 0; page < PAGE_LIMIT; page += 1) {
    const query = {
      category: "linear",
      limit: "100"
    };
    if (options.startTime != null) {
      query.startTime = String(options.startTime);
    }
    if (options.endTime != null) {
      query.endTime = String(options.endTime);
    }
    const symbol = stripSymbol(options.symbol);
    if (symbol) {
      query.symbol = symbol;
    }
    if (cursor) {
      query.cursor = cursor;
    }
    const result = await signedGet("/v5/execution/list", query);
    if (!result.ok) {
      if (executions.length) {
        return { ok: true, executions };
      }
      return result;
    }
    const list = result.data?.result?.list;
    if (Array.isArray(list)) {
      for (const row of list) {
        const mapped = mapExecutionRow(row);
        if (mapped) {
          executions.push(mapped);
        }
      }
    }
    const next = result.data?.result?.nextPageCursor;
    if (!next || next === cursor) {
      break;
    }
    cursor = next;
  }
  return { ok: true, executions };
}

async function fetchExecutionHistoryRange(startMs, endMs, symbol) {
  if (startMs == null || endMs == null) {
    return getExecutionHistory({
      startTime: startMs,
      endTime: endMs,
      symbol
    });
  }
  const merged = [];
  const seen = new Set();
  const chunks = chunkTimeRange(startMs, endMs);
  const results = await mapPool(chunks, CHUNK_CONCURRENCY, (chunk) =>
    getExecutionHistory({
      startTime: chunk.startMs,
      endTime: chunk.endMs,
      symbol
    })
  );
  let lastError = null;
  for (const result of results) {
    if (!result?.ok) {
      lastError = result;
      continue;
    }
    for (const ex of result.executions || []) {
      const key = executionKey(ex);
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      merged.push(ex);
    }
  }
  if (!merged.length && lastError) {
    return lastError;
  }
  return { ok: true, executions: merged };
}

export async function getTradeDiaryDetail(options = {}) {
  const symbol = String(options.symbol || "").toUpperCase();
  const openTimeMs = Number(options.openTimeMs);
  const closeTimeMs = Number(options.closeTimeMs);
  if (
    !symbol ||
    !Number.isFinite(openTimeMs) ||
    !Number.isFinite(closeTimeMs)
  ) {
    return { ok: false, message: "Некорректные параметры сделки" };
  }

  const shortStart = Math.max(0, Math.min(openTimeMs, closeTimeMs) - 60 * 1000);
  let execResult = await fetchExecutionHistoryRange(
    shortStart,
    closeTimeMs + 60 * 1000,
    symbol
  );
  if (!execResult.ok) {
    return execResult;
  }

  const trade = {
    symbol,
    openTimeMs,
    closeTimeMs,
    side: options.side,
    qty: options.qty,
    orderId: options.orderId,
    avgEntryPrice: options.avgEntryPrice,
    avgExitPrice: options.avgExitPrice
  };
  let matched = matchTradeExecutions(trade, execResult.executions || []);
  if (!matched.entries.length) {
    execResult = await fetchExecutionHistoryRange(
      Math.max(0, closeTimeMs - EXEC_LOOKBACK_MS),
      closeTimeMs + 60 * 1000,
      symbol
    );
    if (execResult.ok) {
      matched = matchTradeExecutions(trade, execResult.executions || []);
    }
  }

  const entryOpenMs = matched.entries?.length
    ? Number(matched.entries[0].execTimeMs)
    : openTimeMs;
  const resolvedOpenMs =
    Number.isFinite(entryOpenMs) &&
    entryOpenMs > 0 &&
    entryOpenMs < closeTimeMs
      ? entryOpenMs
      : openTimeMs;

  return {
    ok: true,
    ...matched,
    openTimeMs: resolvedOpenMs,
    closeTimeMs,
    durationMs: Math.max(0, closeTimeMs - resolvedOpenMs),
    side: options.side
  };
}
