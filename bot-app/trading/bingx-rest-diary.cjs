/**
 * BingX diary / closed-PnL / fills resolve (REST).
 * Bound from bingx-rest.cjs after signedRequest helpers exist.
 * Do not import bybit-* modules.
 */
"use strict";

const {
  PRIORITY
} = require("./bingx-request-scheduler.cjs");

let signedRequest = null;
let stripSymbolSuffix = null;
let toBingxSymbol = null;
let toCanonicalSymbol = null;
let peekRateLimitBlock = null;
let extractBingxList = null;

function bindBingxDiaryDeps(deps = {}) {
  signedRequest =
    typeof deps.signedRequest === "function" ? deps.signedRequest : null;
  stripSymbolSuffix =
    typeof deps.stripSymbolSuffix === "function"
      ? deps.stripSymbolSuffix
      : (s) => String(s || "");
  toBingxSymbol =
    typeof deps.toBingxSymbol === "function"
      ? deps.toBingxSymbol
      : (s) => String(s || "");
  toCanonicalSymbol =
    typeof deps.toCanonicalSymbol === "function"
      ? deps.toCanonicalSymbol
      : (s) => String(s || "");
  peekRateLimitBlock =
    typeof deps.peekRateLimitBlock === "function"
      ? deps.peekRateLimitBlock
      : () => null;
  extractBingxList =
    typeof deps.extractBingxList === "function"
      ? deps.extractBingxList
      : () => [];
}

function requireDiaryDeps(fnName) {
  if (typeof signedRequest !== "function") {
    throw new Error(
      `BingX diary: bindBingxDiaryDeps() missing before ${fnName}`
    );
  }
}

const CLOSED_PNL_CACHE_MS = 5 * 60 * 1000;
const closedPnlCacheByKey = new Map();

async function fetchBingxIncomeRows(options = {}) {
  const params = {
    limit: String(Math.min(1000, Number(options.limit) || 1000))
  };
  if (Number.isFinite(options.startTime)) {
    params.startTime = String(Math.floor(options.startTime));
  }
  if (Number.isFinite(options.endTime)) {
    params.endTime = String(Math.floor(options.endTime));
  }
  if (options.incomeType) {
    params.incomeType = String(options.incomeType);
  }
  if (options.symbol) {
    params.symbol = toBingxSymbol(options.symbol);
  }

  const reqOpts = {
    ...(options.priority != null ? { priority: options.priority } : {}),
    ...(options.cancelable === false ? { cancelable: false } : {}),
    ...(options.cancelable === true ? { cancelable: true } : {})
  };
  const result = await signedRequest(
    "GET",
    "/openApi/swap/v2/user/income",
    params,
    reqOpts
  );
  if (!result.ok) {
    return result;
  }
  return {
    ok: true,
    rows: extractBingxList(result.data, ["list", "income", "data"])
  };
}

/** BingX positionHistory allows ≤3 months per request. */
const POSITION_HISTORY_MAX_SPAN_MS = 90 * 24 * 60 * 60 * 1000;

async function fetchBingxPositionHistoryPages(
  symbol,
  startTs,
  endTs,
  options = {}
) {
  const sym = toBingxSymbol(symbol);
  if (!sym) {
    return { ok: false, message: "Symbol required" };
  }
  const rows = [];
  let windowStart = Math.floor(startTs);
  const rangeEnd = Math.floor(endTs);
  const priority =
    options.priority != null ? options.priority : PRIORITY.background;
  const cancelable = options.cancelable;

  while (windowStart <= rangeEnd) {
    const windowEnd = Math.min(
      rangeEnd,
      windowStart + POSITION_HISTORY_MAX_SPAN_MS
    );
    for (let page = 1; page <= 20; page++) {
      const result = await signedRequest(
        "GET",
        "/openApi/swap/v1/trade/positionHistory",
        {
          symbol: sym,
          startTs: String(windowStart),
          endTs: String(windowEnd),
          pageIndex: String(page),
          pageSize: "100"
        },
        {
          priority,
          ...(cancelable === false ? { cancelable: false } : {}),
          ...(cancelable === true ? { cancelable: true } : {})
        }
      );
      if (!result.ok) {
        return result;
      }
      const chunk = extractBingxList(result.data, [
        "positionHistory",
        "list",
        "data"
      ]);
      rows.push(...chunk);
      if (chunk.length < 100) {
        break;
      }
    }
    if (windowEnd >= rangeEnd) {
      break;
    }
    windowStart = windowEnd + 1;
  }

  return { ok: true, rows };
}

function parseBingxTimeMs(value) {
  if (value == null || value === "") {
    return NaN;
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value) || value <= 0) {
      return NaN;
    }
    /* Seconds vs milliseconds */
    return value < 1e12 ? Math.floor(value * 1000) : Math.floor(value);
  }
  const raw = String(value).trim();
  if (!raw) {
    return NaN;
  }
  if (/^\d+$/.test(raw)) {
    const n = Number(raw);
    if (!Number.isFinite(n) || n <= 0) {
      return NaN;
    }
    return n < 1e12 ? Math.floor(n * 1000) : Math.floor(n);
  }
  const parsed = Date.parse(raw);
  return Number.isFinite(parsed) ? parsed : NaN;
}

function pickBingxNumber(row, keys) {
  if (!row || typeof row !== "object") {
    return 0;
  }
  for (const key of keys) {
    const n = Number(row[key]);
    if (Number.isFinite(n) && n > 0) {
      return n;
    }
  }
  return 0;
}

function mapBingxPositionHistoryRow(row) {
  if (!row || typeof row !== "object") {
    return null;
  }
  const closeTimeMs = parseBingxTimeMs(
    row.updateTime ??
      row.closeTime ??
      row.time ??
      row.update_time ??
      row.close_time
  );
  if (!Number.isFinite(closeTimeMs) || closeTimeMs <= 0) {
    return null;
  }
  const openTimeMs = parseBingxTimeMs(row.openTime ?? row.open_time);
  const openMs =
    Number.isFinite(openTimeMs) && openTimeMs > 0 && openTimeMs <= closeTimeMs
      ? openTimeMs
      : closeTimeMs;
  const pnl = Number(
    row.netProfit ??
      row.net_profit ??
      row.realisedProfit ??
      row.realised_profit ??
      row.realizedPnl ??
      row.profit ??
      row.pnl
  );
  if (!Number.isFinite(pnl)) {
    return null;
  }
  const qty = Math.abs(
    Number(
      row.closePositionAmt ??
        row.close_position_amt ??
        row.positionAmt ??
        row.position_amt ??
        row.qty
    ) || 0
  );
  const avgEntryPrice = pickBingxNumber(row, [
    "avgPrice",
    "avg_price",
    "openAvgPrice",
    "avgOpenPrice",
    "entryPrice",
    "openPrice"
  ]);
  const avgExitPrice = pickBingxNumber(row, [
    "avgClosePrice",
    "avg_close_price",
    "closeAvgPrice",
    "avgExitPrice",
    "closePrice",
    "exitPrice"
  ]);
  const entryValue =
    avgEntryPrice > 0 && qty > 0 ? avgEntryPrice * qty : 0;
  const commissionUsd = Math.abs(
    Number(row.positionCommission ?? row.position_commission) || 0
  );
  const sideRaw = String(
    row.positionSide || row.position_side || row.side || ""
  ).toUpperCase();
  /* Diary + chart markers expect long|short (Bybit closed-PnL shape). */
  let side =
    sideRaw === "SHORT" || sideRaw === "SELL" ? "short" : "long";
  /* One-way mode often reports BOTH — infer from entry/exit vs PnL. */
  if (
    (sideRaw === "BOTH" || !sideRaw) &&
    avgEntryPrice > 0 &&
    avgExitPrice > 0 &&
    Number.isFinite(pnl)
  ) {
    const priceUp = avgExitPrice >= avgEntryPrice;
    if (pnl >= 0) {
      side = priceUp ? "long" : "short";
    } else {
      side = priceUp ? "short" : "long";
    }
  }
  const positionId = String(row.positionId || row.position_id || "");

  return {
    symbol: toCanonicalSymbol(row.symbol),
    closeTimeMs,
    openTimeMs: openMs,
    durationMs: Math.max(0, closeTimeMs - openMs),
    pnlUsd: pnl,
    pnlPct: entryValue > 0 ? (pnl / entryValue) * 100 : 0,
    commissionUsd,
    side,
    qty,
    avgEntryPrice,
    avgExitPrice,
    leverage: Math.max(1, Math.round(Number(row.leverage) || 1)),
    positionId,
    orderId: positionId || String(row.orderId || "")
  };
}

function mapBingxIncomeToSparseTrade(row) {
  if (!row || typeof row !== "object") {
    return null;
  }
  const type = String(row.incomeType || "").toUpperCase();
  if (type && type !== "REALIZED_PNL") {
    return null;
  }
  const pnl = Number(row.income);
  const closeTimeMs = parseBingxTimeMs(row.time);
  if (!Number.isFinite(pnl) || !Number.isFinite(closeTimeMs)) {
    return null;
  }
  const symbol = toCanonicalSymbol(row.symbol);
  if (!symbol) {
    return null;
  }
  return {
    symbol,
    closeTimeMs,
    openTimeMs: closeTimeMs,
    listCloseTimeMs: closeTimeMs,
    durationMs: 0,
    pnlUsd: pnl,
    pnlPct: 0,
    commissionUsd: 0,
    /* Unknown until positionHistory enrich — do not default to long. */
    side: "",
    qty: 0,
    avgEntryPrice: 0,
    avgExitPrice: 0,
    leverage: 1,
    orderId: String(row.tranId || row.tradeId || closeTimeMs),
    sparse: true
  };
}

function mapBingxFillExecution(row) {
  if (!row || typeof row !== "object") {
    return null;
  }
  const execTimeMs = parseBingxTimeMs(
    row.time ??
      row.filledTime ??
      row.filledTm ??
      row.tradeTime ??
      row.fillTime ??
      row.transactTime
  );
  const execPrice = pickBingxNumber(row, [
    "price",
    "filledPrice",
    "fillsPrice",
    "avgPrice",
    "tradePrice"
  ]);
  const execQty = Math.abs(
    Number(
      row.qty ??
        row.volume ??
        row.filledQty ??
        row.fillQty ??
        row.quantity
    ) || 0
  );
  if (
    !Number.isFinite(execTimeMs) ||
    !Number.isFinite(execPrice) ||
    execPrice <= 0 ||
    execQty <= 0
  ) {
    return null;
  }
  const sideRaw = String(row.side || row.orderSide || "").toUpperCase();
  if (
    sideRaw !== "BUY" &&
    sideRaw !== "SELL" &&
    sideRaw !== "ASK" &&
    sideRaw !== "BID"
  ) {
    return null;
  }
  const side =
    sideRaw === "SELL" || sideRaw === "ASK" ? "Sell" : "Buy";
  const positionSideRaw = String(
    row.positionSide || row.position_side || row.ps || ""
  ).toUpperCase();
  const positionSide =
    positionSideRaw === "LONG" || positionSideRaw === "SHORT"
      ? positionSideRaw
      : "";
  const execFee = Math.abs(Number(row.fee ?? row.commission) || 0);
  const execValue = execPrice * execQty;
  return {
    symbol: toCanonicalSymbol(row.symbol),
    execTimeMs,
    side,
    positionSide,
    execPrice,
    execQty,
    execFee,
    execValue,
    feeRate: execValue > 0 ? (execFee / execValue) * 100 : 0,
    orderId: String(row.orderId || ""),
    execId: String(row.tradeId || row.fillId || "")
  };
}

function synthesizeBingxTradeExecutions(options = {}) {
  const sideNorm = String(options.side || "").toLowerCase();
  if (sideNorm !== "long" && sideNorm !== "short") {
    return [];
  }
  const isLong = sideNorm === "long";
  const openMs = Number(options.openTimeMs);
  const closeMs = Number(options.closeTimeMs);
  const entry = Number(options.avgEntryPrice);
  const exit = Number(options.avgExitPrice);
  const qty = Math.abs(Number(options.qty) || 0);
  const out = [];

  if (Number.isFinite(openMs) && openMs > 0 && entry > 0) {
    out.push({
      execTimeMs: openMs,
      side: isLong ? "Buy" : "Sell",
      execPrice: entry,
      execQty: qty,
      execFee: 0,
      execValue: entry * qty,
      feeRate: 0,
      orderId: String(options.orderId || options.positionId || ""),
      execId: `synth-entry-${openMs}`,
      synthetic: true
    });
  }

  if (Number.isFinite(closeMs) && closeMs > 0 && exit > 0) {
    out.push({
      execTimeMs: closeMs,
      side: isLong ? "Sell" : "Buy",
      execPrice: exit,
      execQty: qty,
      execFee: 0,
      execValue: exit * qty,
      feeRate: 0,
      orderId: String(options.orderId || options.positionId || ""),
      execId: `synth-exit-${closeMs}`,
      synthetic: true
    });
  }

  return out;
}

/** BingX fillHistory / allFillOrders — keep windows ≤ ~30 days. */
const FILL_HISTORY_MAX_SPAN_MS = 30 * 24 * 60 * 60 * 1000;

/** Diary fill lookbacks around income time — expand only on miss. */
const DIARY_FILL_LOOKBACK_MS = [
  3 * 24 * 60 * 60 * 1000,
  7 * 24 * 60 * 60 * 1000,
  14 * 24 * 60 * 60 * 1000
];
const DIARY_FILL_LOOKFORWARD_MS = 60 * 60 * 1000;
const ALL_FILL_ORDERS_PAGE_SIZE = 100;
const ALL_FILL_ORDERS_MAX_PAGES = 20;

function bingxFillRequestOpts({ priority, cancelable } = {}) {
  return {
    ...(priority != null ? { priority } : {}),
    ...(cancelable === false ? { cancelable: false } : {}),
    ...(cancelable === true ? { cancelable: true } : {})
  };
}

function extractBingxFillList(data) {
  return extractBingxList(data, [
    "fill_history_orders",
    "fill_orders",
    "fillOrders",
    "list",
    "orders",
    "data"
  ]);
}

function bingxFillRowFingerprint(row) {
  return [
    row?.tradeId || row?.fillId || "",
    row?.orderId || "",
    row?.filledTm || row?.filledTime || row?.time || "",
    row?.price || "",
    row?.volume || row?.qty || ""
  ].join("|");
}

/**
 * Paginated allFillOrders for one time window. fillHistory is fallback only.
 */
async function fetchBingxAllFillOrdersPaged({
  symbol,
  startTs,
  endTs,
  orderId,
  priority,
  cancelable,
  maxPages
}) {
  const bingxSym = toBingxSymbol(symbol);
  const reqOpts = bingxFillRequestOpts({ priority, cancelable });
  const pageLimit = Math.max(
    1,
    Math.min(
      ALL_FILL_ORDERS_MAX_PAGES,
      Number(maxPages) || ALL_FILL_ORDERS_MAX_PAGES
    )
  );
  const baseParams = {
    startTs: String(Math.floor(startTs)),
    endTs: String(Math.floor(endTs)),
    tradingUnit: "COIN"
  };
  if (orderId != null && String(orderId).trim() !== "") {
    baseParams.orderId = String(orderId).trim();
  }
  if (bingxSym) {
    baseParams.symbol = bingxSym;
  }

  const rows = [];
  const seen = new Set();
  let lastRateLimited = null;
  let lastError = null;

  for (let pageIndex = 1; pageIndex <= pageLimit; pageIndex++) {
    const pageResult = await signedRequest(
      "GET",
      "/openApi/swap/v2/trade/allFillOrders",
      {
        ...baseParams,
        pageIndex: String(pageIndex),
        pageSize: String(ALL_FILL_ORDERS_PAGE_SIZE)
      },
      reqOpts
    );
    if (!pageResult.ok) {
      lastError = pageResult;
      if (pageResult.rateLimited) {
        lastRateLimited = pageResult;
      }
      break;
    }
    const pageRows = extractBingxFillList(pageResult.data);
    if (!pageRows.length) {
      break;
    }
    let added = 0;
    for (const row of pageRows) {
      const fp = bingxFillRowFingerprint(row);
      if (seen.has(fp)) {
        continue;
      }
      seen.add(fp);
      rows.push(row);
      added += 1;
    }
    /* No new rows → API ignored pageIndex or we hit the end. */
    if (added === 0 || pageRows.length < ALL_FILL_ORDERS_PAGE_SIZE) {
      break;
    }
  }

  if (rows.length) {
    return { ok: true, rows, source: "allFillOrders" };
  }
  if (lastRateLimited) {
    return lastRateLimited;
  }

  if (!bingxSym) {
    return lastError || { ok: true, rows: [], source: "allFillOrders" };
  }

  const histRows = [];
  const histSeen = new Set();
  for (let pageIndex = 1; pageIndex <= pageLimit; pageIndex++) {
    const hist = await signedRequest(
      "GET",
      "/openApi/swap/v2/trade/fillHistory",
      {
        startTs: String(Math.floor(startTs)),
        endTs: String(Math.floor(endTs)),
        symbol: bingxSym,
        pageIndex: String(pageIndex),
        pageSize: String(ALL_FILL_ORDERS_PAGE_SIZE),
        ...(orderId != null && String(orderId).trim() !== ""
          ? { orderId: String(orderId).trim() }
          : {})
      },
      reqOpts
    );
    if (!hist.ok) {
      if (hist.rateLimited) {
        return hist;
      }
      break;
    }
    const pageRows = extractBingxFillList(hist.data);
    if (!pageRows.length) {
      break;
    }
    let added = 0;
    for (const row of pageRows) {
      const fp = bingxFillRowFingerprint(row);
      if (histSeen.has(fp)) {
        continue;
      }
      histSeen.add(fp);
      histRows.push(row);
      added += 1;
    }
    if (added === 0 || pageRows.length < ALL_FILL_ORDERS_PAGE_SIZE) {
      break;
    }
  }

  return {
    ok: true,
    rows: histRows,
    source: histRows.length ? "fillHistory" : "allFillOrders"
  };
}

/**
 * Account-wide fills for an initial diary list load. Windows are chunked at
 * the BingX limit, then combined before cycles are built so a trade may span
 * a window boundary. This is one batched source for all collapsed rows.
 */
async function fetchBingxAllFillRowsForRange(
  startTs,
  endTs,
  options = {}
) {
  const rows = [];
  const seen = new Set();
  let windowStart = Math.floor(startTs);
  const rangeEnd = Math.floor(endTs);

  while (windowStart <= rangeEnd) {
    const windowEnd = Math.min(
      rangeEnd,
      windowStart + FILL_HISTORY_MAX_SPAN_MS
    );
    const chunk = await fetchBingxAllFillOrdersPaged({
      startTs: windowStart,
      endTs: windowEnd,
      priority:
        options.priority != null ? options.priority : PRIORITY.normal,
      cancelable: options.cancelable === true
    });
    if (!chunk.ok) {
      return chunk;
    }
    for (const row of chunk.rows || []) {
      const fp = bingxFillRowFingerprint(row);
      if (seen.has(fp)) {
        continue;
      }
      seen.add(fp);
      rows.push(row);
    }
    if (windowEnd >= rangeEnd) {
      break;
    }
    windowStart = windowEnd + 1;
  }

  return { ok: true, rows, source: "allFillOrders-bulk" };
}

/**
 * Fills for diary/markers. allFillOrders.positionSide is authoritative;
 * fillHistory is fallback only (it often lacks usable positionSide / open legs).
 */
async function fetchBingxFillRows({
  symbol,
  startTs,
  endTs,
  orderId,
  priority,
  cancelable,
  maxPages
}) {
  return fetchBingxAllFillOrdersPaged({
    symbol,
    startTs,
    endTs,
    orderId,
    priority,
    cancelable,
    maxPages
  });
}

async function fetchBingxFillRowsPaged(
  symbol,
  startTs,
  endTs,
  options = {}
) {
  const sym = stripSymbolSuffix(symbol);
  if (!sym) {
    return { ok: false, message: "Symbol required" };
  }
  const rows = [];
  let windowStart = Math.floor(startTs);
  const rangeEnd = Math.floor(endTs);
  const priority =
    options.priority != null ? options.priority : PRIORITY.background;
  const cancelable = options.cancelable;
  const maxPages = options.maxPages;

  while (windowStart <= rangeEnd) {
    const windowEnd = Math.min(
      rangeEnd,
      windowStart + FILL_HISTORY_MAX_SPAN_MS
    );
    const chunk = await fetchBingxFillRows({
      symbol: sym,
      startTs: windowStart,
      endTs: windowEnd,
      priority,
      cancelable,
      maxPages
    });
    if (!chunk.ok) {
      return chunk;
    }
    rows.push(...(chunk.rows || []));
    if (windowEnd >= rangeEnd) {
      break;
    }
    windowStart = windowEnd + 1;
  }

  return { ok: true, rows };
}

/**
 * Adaptive allFillOrders-first fetch around an income/close anchor.
 * Starts at 3d lookback, expands to 7d then 14d until a qty-balanced cycle matches.
 */
async function fetchBingxDiaryFillsForAnchor({
  symbol,
  anchorTimeMs,
  priority = PRIORITY.normal,
  cancelable = false
}) {
  const sym = stripSymbolSuffix(symbol);
  const anchorMs = Number(anchorTimeMs);
  if (!sym || !Number.isFinite(anchorMs)) {
    return { ok: false, message: "Некорректные параметры fills" };
  }

  let lastResult = { ok: true, rows: [] };
  for (const lookbackMs of DIARY_FILL_LOOKBACK_MS) {
    const startTs = Math.max(0, anchorMs - lookbackMs);
    const endTs = anchorMs + DIARY_FILL_LOOKFORWARD_MS;
    const chunk = await fetchBingxAllFillOrdersPaged({
      symbol: sym,
      startTs,
      endTs,
      priority,
      cancelable
    });
    if (!chunk.ok) {
      return chunk;
    }
    lastResult = chunk;
    const want = toCanonicalSymbol(sym);
    const executions = (chunk.rows || [])
      .map(mapBingxFillExecution)
      .filter(Boolean)
      .filter((ex) => !ex.symbol || ex.symbol === want);
    const cycles = buildBingxRoundTripsFromPositionFills(executions);
    const match = matchBingxRoundTripByAnchor(cycles, anchorMs);
    if (match && match.closeTimeMs > match.openTimeMs) {
      return {
        ok: true,
        rows: chunk.rows || [],
        executions,
        cycles,
        match,
        source: chunk.source,
        lookbackMs
      };
    }
  }

  const want = toCanonicalSymbol(sym);
  const executions = (lastResult.rows || [])
    .map(mapBingxFillExecution)
    .filter(Boolean)
    .filter((ex) => !ex.symbol || ex.symbol === want);
  return {
    ok: true,
    rows: lastResult.rows || [],
    executions,
    cycles: buildBingxRoundTripsFromPositionFills(executions),
    match: null,
    source: lastResult.source,
    lookbackMs: DIARY_FILL_LOOKBACK_MS[DIARY_FILL_LOOKBACK_MS.length - 1]
  };
}

/**
 * Single source of truth for BingX closed-trade diary / detail / enrich.
 * Side comes only from positionHistory or allFillOrders.positionSide — never guessed.
 */
async function resolveBingxClosedTrade(options = {}) {
  requireDiaryDeps("resolveBingxClosedTrade");
  const symbol = stripSymbolSuffix(options.symbol);
  const anchorTimeMs = Number(
    options.anchorTimeMs ?? options.closeTimeMs ?? options.openTimeMs
  );
  if (!symbol || !Number.isFinite(anchorTimeMs)) {
    return {
      ok: false,
      resolved: false,
      message: "Некорректные параметры сделки"
    };
  }

  const want = toCanonicalSymbol(symbol);
  const priority =
    options.priority != null ? options.priority : PRIORITY.normal;
  const cancelable = options.cancelable === true;
  const diaryReq = { priority, cancelable: cancelable ? true : false };

  /* 1) positionHistory when BingX returns rows for this account */
  const hist = await fetchBingxPositionHistoryPages(
    symbol,
    Math.max(0, anchorTimeMs - 14 * 24 * 60 * 60 * 1000),
    anchorTimeMs + DIARY_FILL_LOOKFORWARD_MS,
    diaryReq
  );
  if (hist.ok) {
    const mapped = (hist.rows || [])
      .map(mapBingxPositionHistoryRow)
      .filter(Boolean)
      .filter((t) => t.symbol === want);
    const match = matchBingxRoundTripByAnchor(mapped, anchorTimeMs);
    if (
      match &&
      match.closeTimeMs > match.openTimeMs &&
      (match.side === "short" || match.side === "long")
    ) {
      const side = match.side;
      const isShort = side === "short";
      let executions = Array.isArray(match.executions)
        ? match.executions.slice()
        : [];
      let entries = Array.isArray(match.entries) ? match.entries.slice() : [];
      let exits = Array.isArray(match.exits) ? match.exits.slice() : [];
      if (!executions.length) {
        executions = synthesizeBingxTradeExecutions({
          side,
          openTimeMs: match.openTimeMs,
          closeTimeMs: match.closeTimeMs,
          avgEntryPrice: match.avgEntryPrice,
          avgExitPrice: match.avgExitPrice,
          qty: match.qty,
          positionId: match.positionId,
          orderId: options.orderId
        });
        entries = executions.filter((ex) =>
          isShort ? ex.side === "Sell" : ex.side === "Buy"
        );
        exits = executions.filter((ex) =>
          isShort ? ex.side === "Buy" : ex.side === "Sell"
        );
      }
      return {
        ok: true,
        resolved: true,
        side,
        openTimeMs: match.openTimeMs,
        closeTimeMs: match.closeTimeMs,
        durationMs: match.closeTimeMs - match.openTimeMs,
        avgEntryPrice: match.avgEntryPrice || 0,
        avgExitPrice: match.avgExitPrice || 0,
        qty: match.qty || 0,
        positionId: match.positionId || "",
        executions,
        entries,
        exits,
        cycles: mapped,
        source: "positionHistory"
      };
    }
  } else if (hist.rateLimited) {
    return {
      ok: false,
      resolved: false,
      rateLimited: true,
      message: hist.message || "BingX rate limit — подождите"
    };
  }

  /* 2) allFillOrders.positionSide cycles (authoritative when PH is empty) */
  const fillResult = await fetchBingxDiaryFillsForAnchor({
    symbol,
    anchorTimeMs,
    ...diaryReq
  });
  if (!fillResult.ok) {
    return {
      ok: false,
      resolved: false,
      rateLimited: !!fillResult.rateLimited,
      cycles: [],
      message:
        fillResult.message || "Не удалось загрузить исполнения BingX"
    };
  }

  const match = fillResult.match;
  const cycles = Array.isArray(fillResult.cycles) ? fillResult.cycles : [];
  if (!match || !(match.closeTimeMs > match.openTimeMs) || !match.side) {
    return {
      ok: false,
      resolved: false,
      cycles,
      message: "Не удалось определить закрытую сделку по fills"
    };
  }

  return {
    ok: true,
    resolved: true,
    side: match.side,
    openTimeMs: match.openTimeMs,
    closeTimeMs: match.closeTimeMs,
    durationMs: match.durationMs || match.closeTimeMs - match.openTimeMs,
    avgEntryPrice: match.avgEntryPrice || 0,
    avgExitPrice: match.avgExitPrice || 0,
    qty: match.qty || 0,
    positionId: match.positionId || "",
    executions: (match.executions || []).slice(),
    entries: (match.entries || []).slice(),
    exits: (match.exits || []).slice(),
    cycles,
    source: fillResult.source || "position-side-fills",
    lookbackMs: fillResult.lookbackMs
  };
}

function vwapFromExecutions(rows) {
  if (!rows?.length) {
    return 0;
  }
  let notional = 0;
  let qty = 0;
  for (const ex of rows) {
    const q = Math.abs(Number(ex.execQty) || 0);
    const p = Number(ex.execPrice) || 0;
    if (q > 0 && p > 0) {
      notional += p * q;
      qty += q;
    }
  }
  return qty > 0 ? notional / qty : 0;
}

/**
 * Build closed position cycles from fills using BingX positionSide.
 * LONG: Buy opens/adds, Sell closes. SHORT: Sell opens/adds, Buy closes.
 * The side is explicit exchange data — never inferred from chronology.
 */
function buildBingxRoundTripsFromPositionFills(fills) {
  const sorted = (fills || [])
    .filter(
      (ex) =>
        ex &&
        (ex.positionSide === "LONG" || ex.positionSide === "SHORT") &&
        Number(ex.execTimeMs) > 0 &&
        Number(ex.execQty) > 0
    )
    .sort((a, b) => a.execTimeMs - b.execTimeMs);
  const out = [];

  for (const positionSide of ["LONG", "SHORT"]) {
    const entrySide = positionSide === "LONG" ? "Buy" : "Sell";
    const exitSide = positionSide === "LONG" ? "Sell" : "Buy";
    let openQty = 0;
    let entries = [];
    let exits = [];

    for (const ex of sorted) {
      if (ex.positionSide !== positionSide) {
        continue;
      }
      const qty = Math.abs(Number(ex.execQty) || 0);
      if (!(qty > 0)) {
        continue;
      }
      if (ex.side === entrySide) {
        if (!(openQty > 1e-12)) {
          entries = [];
          exits = [];
        }
        entries.push(ex);
        openQty += qty;
        continue;
      }
      if (ex.side !== exitSide || !(openQty > 1e-12)) {
        continue;
      }

      exits.push(ex);
      openQty -= qty;
      if (openQty > 1e-9) {
        continue;
      }

      const openTimeMs = entries[0]?.execTimeMs;
      const closeTimeMs = exits[exits.length - 1]?.execTimeMs;
      if (closeTimeMs > openTimeMs) {
        const entryQty = entries.reduce(
          (sum, row) => sum + Number(row.execQty || 0),
          0
        );
        out.push({
          side: positionSide === "SHORT" ? "short" : "long",
          positionSide,
          openTimeMs,
          closeTimeMs,
          durationMs: closeTimeMs - openTimeMs,
          avgEntryPrice: vwapFromExecutions(entries),
          avgExitPrice: vwapFromExecutions(exits),
          qty: entryQty,
          entries: entries.slice(),
          exits: exits.slice(),
          executions: [...entries, ...exits].sort(
            (a, b) => a.execTimeMs - b.execTimeMs
          ),
          sparse: false
        });
      }
      openQty = 0;
      entries = [];
      exits = [];
    }
  }

  return out.sort((a, b) => a.closeTimeMs - b.closeTimeMs);
}

function matchBingxRoundTripByAnchor(roundTrips, anchorTimeMs) {
  const anchorMs = Number(anchorTimeMs);
  if (!Number.isFinite(anchorMs)) {
    return null;
  }
  const closeTolMs = 5 * 60 * 1000;
  const openTolMs = 5 * 60 * 1000;
  let best = null;
  let bestScore = Infinity;
  for (const trade of roundTrips || []) {
    const openMs = Number(trade.openTimeMs);
    const closeMs = Number(trade.closeTimeMs);
    if (!(closeMs > openMs)) {
      continue;
    }
    const closeDist = Math.abs(closeMs - anchorMs);
    const openDist = Math.abs(openMs - anchorMs);
    const contains = openMs <= anchorMs && anchorMs <= closeMs;
    let score = Infinity;
    if (closeDist <= closeTolMs) {
      score = closeDist;
    } else if (openDist <= openTolMs) {
      /* Income time often equals open fill, not close. */
      score = 1e12 + openDist;
    } else if (contains) {
      score = 2e12 + Math.min(closeDist, openDist);
    }
    if (score < bestScore) {
      bestScore = score;
      best = trade;
    }
  }
  return best;
}

/** @deprecated alias — prefer matchBingxRoundTripByAnchor */
function matchBingxRoundTripByClose(roundTrips, closeTimeMs) {
  return matchBingxRoundTripByAnchor(roundTrips, closeTimeMs);
}

function executionsFromBingxClosedTrades(trades) {
  const out = [];
  for (const trade of trades || []) {
    const openMs = Number(trade?.openTimeMs);
    const closeMs = Number(trade?.closeTimeMs);
    if (
      !Number.isFinite(openMs) ||
      !Number.isFinite(closeMs) ||
      openMs <= 0 ||
      closeMs <= 0 ||
      openMs === closeMs
    ) {
      continue;
    }
    const side = String(trade?.side || "").toLowerCase();
    if (side !== "long" && side !== "short") {
      continue;
    }
    const isLong = side === "long";
    out.push({
      execTimeMs: openMs,
      side: isLong ? "Buy" : "Sell"
    });
    out.push({
      execTimeMs: closeMs,
      side: isLong ? "Sell" : "Buy"
    });
  }
  return out;
}

async function resolveBingxTradePrices(options = {}) {
  let avgEntryPrice = Number(options.avgEntryPrice) || 0;
  let avgExitPrice = Number(options.avgExitPrice) || 0;
  let qty = Math.abs(Number(options.qty) || 0);
  let side = options.side;

  const symbol = stripSymbolSuffix(options.symbol);
  const openTimeMs = Number(options.openTimeMs);
  const closeTimeMs = Number(options.closeTimeMs);
  const anchorTimeMs =
    Number.isFinite(closeTimeMs) && closeTimeMs > 0
      ? closeTimeMs
      : openTimeMs;

  if (!symbol || !Number.isFinite(anchorTimeMs)) {
    return { avgEntryPrice, avgExitPrice, qty, side };
  }

  const resolved = await resolveBingxClosedTrade({
    symbol,
    anchorTimeMs,
    orderId: options.orderId || options.positionId,
    priority: PRIORITY.normal,
    cancelable: false
  });
  if (!resolved.ok || !resolved.resolved) {
    return { avgEntryPrice, avgExitPrice, qty, side };
  }

  return {
    avgEntryPrice: resolved.avgEntryPrice || avgEntryPrice || 0,
    avgExitPrice: resolved.avgExitPrice || avgExitPrice || 0,
    qty: resolved.qty || qty || 0,
    side: resolved.side || side,
    openTimeMs: resolved.openTimeMs,
    closeTimeMs: resolved.closeTimeMs,
    positionId: resolved.positionId,
    entries: resolved.entries,
    exits: resolved.exits,
    executions: resolved.executions,
    source: resolved.source
  };
}

async function getTradeDiaryDetail(options = {}) {
  requireDiaryDeps("getTradeDiaryDetail");
  const symbol = stripSymbolSuffix(options.symbol);
  const anchorOpenMs = Number(options.openTimeMs);
  const anchorCloseMs = Number(options.closeTimeMs);
  const anchorTimeMs =
    Number.isFinite(anchorCloseMs) && anchorCloseMs > 0
      ? anchorCloseMs
      : anchorOpenMs;

  if (!symbol || !Number.isFinite(anchorTimeMs)) {
    return {
      ok: false,
      resolved: false,
      message: "Некорректные параметры сделки"
    };
  }

  const resolved = await resolveBingxClosedTrade({
    symbol,
    anchorTimeMs,
    orderId: options.orderId,
    positionId: options.positionId,
    priority: PRIORITY.normal,
    cancelable: false
  });

  if (!resolved.ok || !resolved.resolved) {
    return {
      ok: false,
      resolved: false,
      rateLimited: !!resolved.rateLimited,
      message:
        resolved.message ||
        "Не удалось определить закрытую сделку"
    };
  }

  return {
    ok: true,
    resolved: true,
    executions: resolved.executions || [],
    entries: resolved.entries || [],
    exits: resolved.exits || [],
    side: resolved.side,
    openTimeMs: resolved.openTimeMs,
    closeTimeMs: resolved.closeTimeMs,
    durationMs: resolved.durationMs,
    avgEntryPrice: resolved.avgEntryPrice || 0,
    avgExitPrice: resolved.avgExitPrice || 0,
    qty: resolved.qty || 0,
    positionId: resolved.positionId || "",
    fillsOk: true,
    fillsMessage: null,
    source: resolved.source
  };
}

function closedPnlCacheKey(startTime, endTime, symbol) {
  return `${Math.floor(startTime)}:${Math.floor(endTime)}:${symbol || "*"}`;
}

function readClosedPnlCache(key) {
  const hit = closedPnlCacheByKey.get(key);
  if (!hit) {
    return null;
  }
  if (Date.now() - hit.at > CLOSED_PNL_CACHE_MS) {
    closedPnlCacheByKey.delete(key);
    return null;
  }
  return {
    ...hit.result,
    trades: Array.isArray(hit.result.trades) ? [...hit.result.trades] : []
  };
}

function writeClosedPnlCache(key, result) {
  if (!result?.ok || !Array.isArray(result.trades)) {
    return;
  }
  closedPnlCacheByKey.set(key, {
    at: Date.now(),
    result: {
      ...result,
      trades: [...result.trades]
    }
  });
}

function serveClosedPnlCacheOrBlock(key, blocked) {
  const cached = readClosedPnlCache(key);
  const cacheIsComplete =
    cached &&
    Array.isArray(cached.trades) &&
    !cached.trades.some(
      (t) =>
        t?.sparse ||
        !Number(t?.durationMs) ||
        !(Number(t?.closeTimeMs) > Number(t?.openTimeMs)) ||
        (t?.side !== "long" && t?.side !== "short")
    );
  if (cacheIsComplete) {
    return {
      ...cached,
      ok: true,
      stale: true,
      fromCache: true
    };
  }
  return (
    blocked || {
      ok: false,
      rateLimited: true,
      message: "BingX rate limit — подождите"
    }
  );
}

/**
 * BingX diary list: income identities/PnL plus a batched allFillOrders resolve.
 * The response is not returned until collapsed-row side/duration are ready.
 *
 * Single-symbol requests (Terminal «История сделок»):
 * positionHistory + income + one paged fillHistory window → real open/close
 * and `executions` for chart markers (positionHistory alone is incomplete:
 * ~1 month / hedge-only / missing openTime).
 */
async function getClosedPnlHistory(options = {}) {
  requireDiaryDeps("getClosedPnlHistory");
  const endTime = Number.isFinite(Number(options.endTime))
    ? Number(options.endTime)
    : Date.now();
  const startTime = Number.isFinite(Number(options.startTime))
    ? Number(options.startTime)
    : endTime - 7 * 24 * 60 * 60 * 1000;

  if (endTime < startTime) {
    return { ok: false, message: "Invalid time range" };
  }

  const symbolFilter = stripSymbolSuffix(options.symbol);
  const cacheKey = closedPnlCacheKey(startTime, endTime, symbolFilter);
  const forceRefresh = options.forceRefresh === true;
  const skipEnrich = options.skipEnrich === true;

  if (!forceRefresh) {
    const blocked = peekRateLimitBlock();
    if (blocked) {
      return serveClosedPnlCacheOrBlock(cacheKey, blocked);
    }
    const cached = readClosedPnlCache(cacheKey);
    if (cached) {
      /* Invalidate caches created before positionSide-aware fill cycles. */
      if (
        symbolFilter &&
        cached.markerSchema !== 6
      ) {
        closedPnlCacheByKey.delete(cacheKey);
      } else if (
        Array.isArray(cached.trades) &&
        cached.trades.some(
          (t) =>
            t?.sparse ||
            !Number(t?.durationMs) ||
            !(Number(t?.closeTimeMs) > Number(t?.openTimeMs)) ||
            (t?.side !== "long" && t?.side !== "short")
        )
      ) {
        closedPnlCacheByKey.delete(cacheKey);
      } else {
        return {
          ...cached,
          fromCache: true,
          stale: false
        };
      }
    }
  } else {
    const blocked = peekRateLimitBlock();
    if (blocked) {
      return serveClosedPnlCacheOrBlock(cacheKey, blocked);
    }
    if (symbolFilter) {
      closedPnlCacheByKey.delete(cacheKey);
    }
  }

  /*
   * Terminal markers use explicit exchange position direction:
   * positionHistory when available; otherwise allFillOrders.positionSide.
   * Buy/Sell chronology never decides Long/Short.
   */
  /* Diary/history: never cancelable background — trading must not drop the list. */
  const diaryListReq = {
    priority: PRIORITY.normal,
    cancelable: false
  };

  if (symbolFilter) {
    const want = toCanonicalSymbol(symbolFilter);
    const hist = await fetchBingxPositionHistoryPages(
      symbolFilter,
      Math.max(0, startTime - 2 * 24 * 60 * 60 * 1000),
      endTime + 60 * 60 * 1000,
      diaryListReq
    );
    if (!hist.ok && hist.rateLimited) {
      return serveClosedPnlCacheOrBlock(cacheKey, hist);
    }

    let trades = (hist.ok ? hist.rows || [] : [])
      .map(mapBingxPositionHistoryRow)
      .filter(Boolean)
      .filter((t) => t.symbol === want)
      .filter(
        (t) =>
          t.openTimeMs > 0 &&
          t.closeTimeMs > t.openTimeMs &&
          t.closeTimeMs >= startTime &&
          t.closeTimeMs <= endTime
      )
      .map((t) => ({ ...t, sparse: false }));
    let source = "position-history-v6";
    let partial = false;

    if (!trades.length) {
      const fills = await fetchBingxFillRowsPaged(
        symbolFilter,
        Math.max(0, endTime - FILL_HISTORY_MAX_SPAN_MS),
        endTime + 15 * 60 * 1000,
        diaryListReq
      );
      if (!fills.ok && fills.rateLimited) {
        return serveClosedPnlCacheOrBlock(cacheKey, fills);
      }
      if (fills.ok) {
        trades = buildBingxRoundTripsFromPositionFills(
          (fills.rows || [])
            .map(mapBingxFillExecution)
            .filter(Boolean)
            .filter((ex) => !ex.symbol || ex.symbol === want)
        ).filter(
          (t) =>
            t.closeTimeMs >= startTime &&
            t.closeTimeMs <= endTime
        );
        source = "position-side-fills-v6";
      } else {
        partial = true;
      }
    }

    trades.sort((a, b) => b.closeTimeMs - a.closeTimeMs);
    const executions = executionsFromBingxClosedTrades(trades);

    const result = {
      ok: true,
      trades,
      executions,
      sparse: false,
      enriched: true,
      partial,
      historyFails: hist.ok ? 0 : 1,
      historyAttempted: 1,
      symbolsCapped: false,
      source,
      markerSchema: 6
    };
    writeClosedPnlCache(cacheKey, result);
    return result;
  }

  const incomeResult = await fetchBingxIncomeRows({
    startTime,
    endTime,
    incomeType: "REALIZED_PNL",
    ...diaryListReq
  });
  if (!incomeResult.ok) {
    if (incomeResult.rateLimited) {
      return serveClosedPnlCacheOrBlock(cacheKey, incomeResult);
    }
    return incomeResult;
  }

  const trades = [];
  const seenKeys = new Set();
  for (const row of incomeResult.rows || []) {
    const trade = mapBingxIncomeToSparseTrade(row);
    if (!trade) {
      continue;
    }
    if (trade.closeTimeMs < startTime || trade.closeTimeMs > endTime) {
      continue;
    }
    const key = `income:${trade.symbol}:${trade.orderId}`;
    if (seenKeys.has(key)) {
      continue;
    }
    seenKeys.add(key);
    trades.push(trade);
  }

  trades.sort((a, b) => b.closeTimeMs - a.closeTimeMs);

  if (skipEnrich) {
    return {
      ok: true,
      trades,
      sparse: true,
      enriched: false,
      partial: false,
      rateLimited: false,
      historyFails: 0,
      historyAttempted: 0,
      symbolsCapped: false,
      source: "income-fast"
    };
  }

  const enriched = trades.length
    ? await enrichClosedPnlTrades({
        trades,
        startTime,
        endTime
      })
    : {
        ok: true,
        trades: [],
        resolvedCount: 0,
        unresolvedCount: 0,
        partial: false,
        rateLimited: false
      };
  if (!enriched.ok) {
    /* Keep income rows visible instead of hanging/empty on enrich failure. */
    const fallback = {
      ok: true,
      trades,
      sparse: true,
      enriched: false,
      partial: true,
      historyFails: 1,
      historyAttempted: 1,
      symbolsCapped: false,
      source: "income",
      message: enriched.message || null
    };
    return fallback;
  }
  const resolvedTrades = Array.isArray(enriched.trades)
    ? enriched.trades
    : trades;
  const sparse = resolvedTrades.some(
    (t) =>
      t?.sparse ||
      !Number(t?.durationMs) ||
      !(Number(t?.closeTimeMs) > Number(t?.openTimeMs)) ||
      (t?.side !== "long" && t?.side !== "short")
  );
  const result = {
    ok: true,
    trades: resolvedTrades,
    sparse,
    enriched: !sparse,
    partial: !!enriched.partial,
    rateLimited: !!enriched.rateLimited,
    historyFails: 0,
    historyAttempted: 0,
    symbolsCapped: !!enriched.symbolsCapped,
    source: "income+closed-resolver"
  };
  /* Cache complete or mostly-complete lists; sparse day-cache is filtered in UI. */
  if (!sparse) {
    writeClosedPnlCache(cacheKey, result);
  }
  return result;
}

/**
 * Complete collapsed diary rows before the list response is returned.
 * One allFillOrders window per symbol in the income set — never N×
 * resolveBingxClosedTrade (that hung the diary behind "Идет загрузка…").
 * Detail still uses resolveBingxClosedTrade for a single trade.
 */
async function enrichClosedPnlTrades(options = {}) {
  requireDiaryDeps("enrichClosedPnlTrades");
  const startTime = Number(options.startTime);
  const endTime = Number(options.endTime);
  const input = Array.isArray(options.trades) ? options.trades : [];
  if (
    !input.length ||
    !Number.isFinite(startTime) ||
    !Number.isFinite(endTime) ||
    endTime < startTime
  ) {
    return {
      ok: false,
      message: "Некорректные параметры обогащения"
    };
  }

  function needsEnrich(t) {
    return (
      !!t &&
      (t.sparse ||
        !String(t.side || "").trim() ||
        !Number.isFinite(Number(t.openTimeMs)) ||
        Number(t.openTimeMs) === Number(t.closeTimeMs) ||
        !Number(t.durationMs))
    );
  }

  function applyResolved(trade, match) {
    const listCloseTimeMs =
      Number(trade.listCloseTimeMs) ||
      Number(trade.closeTimeMs) ||
      Number(match.closeTimeMs);
    const pnlUsd = Number.isFinite(Number(match.pnlUsd))
      ? Number(match.pnlUsd)
      : Number(trade.pnlUsd) || 0;
    const avgEntryPrice =
      Number(match.avgEntryPrice) || Number(trade.avgEntryPrice) || 0;
    const qty = Number(match.qty) || Number(trade.qty) || 0;
    const entryValue =
      avgEntryPrice > 0 && qty > 0 ? avgEntryPrice * qty : 0;
    const executionFees = (match.executions || []).reduce(
      (sum, ex) => sum + Math.abs(Number(ex?.execFee) || 0),
      0
    );
    return {
      ...trade,
      listCloseTimeMs,
      openTimeMs: match.openTimeMs,
      closeTimeMs: match.closeTimeMs,
      durationMs: match.durationMs || match.closeTimeMs - match.openTimeMs,
      side: match.side,
      avgEntryPrice,
      avgExitPrice: match.avgExitPrice || trade.avgExitPrice || 0,
      qty,
      positionId: match.positionId || trade.positionId || "",
      pnlUsd,
      pnlPct: entryValue > 0 ? (pnlUsd / entryValue) * 100 : 0,
      commissionUsd:
        executionFees > 0
          ? executionFees
          : Math.abs(
              Number(match.commissionUsd ?? trade.commissionUsd) || 0
            ),
      sparse: false,
      resolved: true
    };
  }

  const working = input.map((t) => ({ ...t }));
  const pending = working.filter(needsEnrich);
  const diaryReq = {
    priority: PRIORITY.normal,
    cancelable: false,
    /* Cap pages so a busy symbol cannot stall the whole diary load. */
    maxPages: 8
  };
  let rateLimited = false;
  let resolvedCount = 0;
  let symbolsCapped = false;

  if (!pending.length) {
    return {
      ok: true,
      trades: working,
      resolvedCount: 0,
      rateLimited: false,
      partial: false,
      unresolvedCount: 0,
      symbolsCapped: false
    };
  }

  const symbols = [
    ...new Set(
      pending.map((t) => toCanonicalSymbol(t.symbol)).filter(Boolean)
    )
  ];
  /* Bound worst-case list latency under BingX ~1.5 req/s budget. */
  const MAX_LIST_SYMBOLS = 25;
  const symbolsToFetch = symbols.slice(0, MAX_LIST_SYMBOLS);
  symbolsCapped = symbols.length > symbolsToFetch.length;

  const cyclesBySymbol = new Map();
  for (const symbol of symbolsToFetch) {
    const anchors = pending
      .filter((t) => toCanonicalSymbol(t.symbol) === symbol)
      .map(
        (t) =>
          Number(t.listCloseTimeMs) ||
          Number(t.closeTimeMs) ||
          Number(t.openTimeMs)
      )
      .filter((ms) => Number.isFinite(ms));
    if (!anchors.length) {
      continue;
    }
    const minAnchor = Math.min(...anchors);
    const maxAnchor = Math.max(...anchors);
    const fills = await fetchBingxFillRowsPaged(
      symbol,
      Math.max(
        0,
        minAnchor - DIARY_FILL_LOOKBACK_MS[DIARY_FILL_LOOKBACK_MS.length - 1]
      ),
      maxAnchor + DIARY_FILL_LOOKFORWARD_MS,
      diaryReq
    );
    if (!fills.ok) {
      if (fills.rateLimited) {
        rateLimited = true;
        break;
      }
      continue;
    }
    cyclesBySymbol.set(
      symbol,
      buildBingxRoundTripsFromPositionFills(
        (fills.rows || [])
          .map(mapBingxFillExecution)
          .filter(Boolean)
          .filter((ex) => !ex.symbol || ex.symbol === symbol)
      )
    );
  }

  for (let i = 0; i < working.length; i++) {
    const trade = working[i];
    if (!needsEnrich(trade)) {
      continue;
    }
    const symbol = toCanonicalSymbol(trade.symbol);
    const anchorTimeMs =
      Number(trade.listCloseTimeMs) ||
      Number(trade.closeTimeMs) ||
      Number(trade.openTimeMs);
    const match = matchBingxRoundTripByAnchor(
      cyclesBySymbol.get(symbol) || [],
      anchorTimeMs
    );
    if (match && match.closeTimeMs > match.openTimeMs && match.side) {
      working[i] = applyResolved(trade, match);
      resolvedCount += 1;
    }
  }

  const unresolvedCount = working.filter(needsEnrich).length;
  return {
    ok: true,
    trades: working,
    resolvedCount,
    rateLimited,
    partial: rateLimited || unresolvedCount > 0 || symbolsCapped,
    unresolvedCount,
    symbolsCapped
  };
}


module.exports = {
  bindBingxDiaryDeps,
  resolveBingxClosedTrade,
  executionsFromBingxClosedTrades,
  getTradeDiaryDetail,
  getClosedPnlHistory,
  enrichClosedPnlTrades,
  mapBingxFillExecution,
  matchBingxRoundTripByAnchor,
  mapBingxPositionHistoryRow,
  buildBingxRoundTripsFromPositionFills
};
