/**
 * Bybit diary list/fetch/cache — exchange-local business logic.
 */
import {
  clearDiaryDayTrades,
  endOfDayMs,
  listDiaryDayKeysInRange,
  msFromDayKey,
  readDiaryDayTrades,
  resolveDiaryIncrementalFetchStartMs,
  startOfDayMs,
  todayDiaryDayKey,
  writeDiaryDayTrades
} from "../../../trade-diary-storage.js?v=4";

import {
  diaryDayKeyLocal
} from "../../../trade-diary-format.js?v=6";

import {
  diaryAcceptDayCache
} from "./policy.js?v=1";

const EXCHANGE_ID = "bybit";

function tradingApi() {
  return window.cryptoTerminalDesktop?.trading;
}

function tradeKey(trade) {
  const closeMs = trade?.listCloseTimeMs ?? trade?.closeTimeMs;
  return `${trade?.symbol || ""}-${closeMs || 0}-${trade?.orderId || ""}`;
}

function tradeIdentityKey(trade) {
  const symbol = String(trade?.symbol || "").toUpperCase();
  const orderId = String(trade?.orderId || "").trim();
  return symbol && orderId
    ? `id:${symbol}:${orderId}`
    : `t:${tradeKey(trade)}`;
}

function dedupeDiaryTrades(trades) {
  const seen = new Set();
  const out = [];
  for (const trade of trades || []) {
    const key = tradeKey(trade);
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    out.push(trade);
  }
  out.sort((a, b) => Number(b.closeTimeMs) - Number(a.closeTimeMs));
  return out;
}

function groupTradesByDay(trades) {
  const map = new Map();
  for (const trade of trades || []) {
    const key = diaryDayKeyLocal(trade.closeTimeMs);
    if (!map.has(key)) {
      map.set(key, []);
    }
    map.get(key).push(trade);
  }
  return map;
}

function inPeriod(trade, period) {
  const time = Number(trade?.closeTimeMs);
  return time >= period.startMs && time <= period.endMs;
}

function staleCacheResult(cachedPast, cachedToday, period, result) {
  const trades = dedupeDiaryTrades([
    ...cachedPast,
    ...cachedToday
  ].filter((trade) => inPeriod(trade, period)));
  if (!trades.length) {
    return result;
  }
  return {
    ok: true,
    trades,
    fromCache: true,
    stale: true,
    partial: true,
    message: result?.message
  };
}

function cachePastDaysFromFetch(fetchStartMs, fetchEndMs, fetchedTrades, todayKey) {
  const yesterdayEnd = startOfDayMs(Date.now()) - 1;
  if (yesterdayEnd < fetchStartMs) {
    return;
  }
  const cacheEndMs = Math.min(fetchEndMs, yesterdayEnd);
  const byDay = groupTradesByDay(fetchedTrades);
  for (const dayKey of listDiaryDayKeysInRange(fetchStartMs, cacheEndMs)) {
    if (dayKey >= todayKey) {
      continue;
    }
    writeDiaryDayTrades(EXCHANGE_ID, dayKey, byDay.get(dayKey) || []);
  }
}

export function diaryCollectCachedTrades(period) {
  const cached = [];
  for (const dayKey of listDiaryDayKeysInRange(period.startMs, period.endMs)) {
    const hit = readDiaryDayTrades(EXCHANGE_ID, dayKey);
    if (diaryAcceptDayCache(hit)) {
      cached.push(...hit);
    }
  }
  return dedupeDiaryTrades(cached.filter((trade) => inPeriod(trade, period)));
}

export async function diaryLoadPeriod(period, { forceRefresh = false } = {}) {
  const api = tradingApi();
  if (!api?.getClosedPnl) {
    return { ok: false, message: "Торговый API недоступен" };
  }

  const todayKey = todayDiaryDayKey();
  const dayKeys = listDiaryDayKeysInRange(period.startMs, period.endMs);
  if (forceRefresh) {
    clearDiaryDayTrades(EXCHANGE_ID, dayKeys);
  }

  const cachedPast = [];
  const missingPastKeys = [];
  let cachedToday = [];
  const periodIncludesToday = dayKeys.includes(todayKey);

  for (const dayKey of dayKeys) {
    if (dayKey >= todayKey) {
      continue;
    }
    if (!forceRefresh) {
      const hit = readDiaryDayTrades(EXCHANGE_ID, dayKey);
      if (diaryAcceptDayCache(hit)) {
        cachedPast.push(...hit);
        continue;
      }
    }
    missingPastKeys.push(dayKey);
  }

  if (periodIncludesToday && !forceRefresh) {
    const hit = readDiaryDayTrades(EXCHANGE_ID, todayKey);
    if (diaryAcceptDayCache(hit)) {
      cachedToday = hit;
    }
  }

  const fetched = [];
  let networkMeta = {};
  let didTodayNetworkFetch = false;

  async function fetchClosedPnlRange(startTime, endTime) {
    return api.getClosedPnl({
      startTime,
      endTime,
      forceRefresh,
      exchangeId: EXCHANGE_ID,
      /* Keep diary list fast: heavy execution matching is loaded on row detail. */
      skipExecutions: true
    });
  }

  if (forceRefresh) {
    const result = await fetchClosedPnlRange(period.startMs, period.endMs);
    if (!result?.ok) {
      return staleCacheResult(cachedPast, cachedToday, period, result);
    }
    fetched.push(...(Array.isArray(result.trades) ? result.trades : []));
    networkMeta = { source: result.source, sparse: !!result.sparse };
    didTodayNetworkFetch = periodIncludesToday;
    cachePastDaysFromFetch(period.startMs, period.endMs, fetched, todayKey);
  } else {
    if (missingPastKeys.length) {
      missingPastKeys.sort();
      const pastFetchStart = startOfDayMs(msFromDayKey(missingPastKeys[0]));
      const pastFetchEnd = Math.min(period.endMs, startOfDayMs(Date.now()) - 1);
      if (pastFetchStart <= pastFetchEnd) {
        const result = await fetchClosedPnlRange(pastFetchStart, pastFetchEnd);
        if (!result?.ok) {
          return staleCacheResult(cachedPast, cachedToday, period, result);
        }
        const rows = Array.isArray(result.trades) ? result.trades : [];
        fetched.push(...rows);
        networkMeta = { source: result.source, sparse: !!result.sparse };
        cachePastDaysFromFetch(pastFetchStart, pastFetchEnd, rows, todayKey);
      }
    }

    if (periodIncludesToday) {
      const todayEnd = Math.min(
        period.endMs,
        endOfDayMs(startOfDayMs(Date.now()))
      );
      const todayFetchStart = resolveDiaryIncrementalFetchStartMs(
        EXCHANGE_ID,
        todayKey,
        cachedToday
      );
      if (todayFetchStart <= todayEnd) {
        const result = await fetchClosedPnlRange(todayFetchStart, todayEnd);
        if (!result?.ok) {
          return staleCacheResult(cachedPast, cachedToday, period, result);
        }
        fetched.push(...(Array.isArray(result.trades) ? result.trades : []));
        networkMeta = { source: result.source, sparse: !!result.sparse };
        didTodayNetworkFetch = true;
      }
    }

    if (!fetched.length) {
      networkMeta = { fromCache: true };
    }
  }

  const todayStart = startOfDayMs(msFromDayKey(todayKey));
  const todayEnd = endOfDayMs(todayStart);
  let mergedToday = cachedToday;

  if (periodIncludesToday && didTodayNetworkFetch) {
    const fetchedToday = fetched.filter((trade) => {
      const time = Number(trade.closeTimeMs);
      return time >= todayStart && time <= todayEnd;
    });
    mergedToday = dedupeDiaryTrades([...cachedToday, ...fetchedToday]);
    writeDiaryDayTrades(EXCHANGE_ID, todayKey, mergedToday);
  }

  const trades = dedupeDiaryTrades([
    ...cachedPast,
    ...(periodIncludesToday ? mergedToday : []),
    ...fetched.filter((trade) => {
      const time = Number(trade.closeTimeMs);
      if (periodIncludesToday && time >= todayStart && time <= todayEnd) {
        return false;
      }
      return inPeriod(trade, period);
    })
  ].filter((trade) => inPeriod(trade, period)));

  return {
    ok: true,
    trades,
    fromCache: (cachedPast.length > 0 || cachedToday.length > 0) && fetched.length === 0,
    partialCache: (cachedPast.length > 0 || cachedToday.length > 0) && fetched.length > 0,
    ...networkMeta
  };
}

export async function diaryAfterListPaint(_ctx) {
  /* Bybit closed-PnL rows are complete; no renderer enrich. */
}

