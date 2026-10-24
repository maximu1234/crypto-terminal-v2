/**
 * История свечей для Algo Bot lite (без графика).
 * Renderer fetchBybit часто идёт через SOCKS; на VPS тот же путь,
 * что и список тикеров: Node IPC public kline.
 * Страницы идут по одной и с endMs, чтобы минутный RSI покрывал
 * тот же ряд, что панель «Данные» на АлгоТрейдинг.
 */
import {
  loadMarketHistory,
  getActiveExchangeId
} from "../market-api.js?v=145e2e28";
import {
  klineGapFillEnds
} from "../kline-history-pages.js?v=f9dac656";

const PAGE_BARS = 1000;
const PAGE_ATTEMPTS = 3;

function candleFromKlineRow(raw) {
  if (Array.isArray(raw)) {
    const timeMs = Number(raw[0]);
    const close = Number(raw[4]);
    if (!Number.isFinite(timeMs) || !Number.isFinite(close)) {
      return null;
    }
    return {
      time: timeMs > 1e12 ? timeMs / 1000 : timeMs,
      open: Number(raw[1]),
      high: Number(raw[2]),
      low: Number(raw[3]),
      close,
      volume: Number(raw[5]) || 0
    };
  }
  const timeRaw = Number(raw?.time);
  const close = Number(raw?.close);
  if (!Number.isFinite(timeRaw) || !Number.isFinite(close)) {
    return null;
  }
  return {
    time: timeRaw > 1e12 ? timeRaw / 1000 : timeRaw,
    open: Number(raw.open),
    high: Number(raw.high),
    low: Number(raw.low),
    close,
    volume: Number(raw.volume) || 0
  };
}

async function fetchIpcPage(api, symbol, tf, endMs, limit) {
  let last = null;
  for (let attempt = 0; attempt < PAGE_ATTEMPTS; attempt += 1) {
    try {
      last = await api.fetchKlinePage({
        symbol,
        tf,
        endMs,
        limit
      });
    } catch (err) {
      last = {
        ok: false,
        rows: [],
        message: err?.message || "сбой загрузки свечей"
      };
    }
    if (last?.ok) {
      return last;
    }
  }
  return last || { ok: false, rows: [], message: "сбой загрузки свечей" };
}

/**
 * @param {unknown} symbol
 * @param {unknown} tf
 * @param {number} [requests]
 * @param {{ parallel?: boolean, batchGapMs?: number, endMs?: number, pageLimit?: number }} [options]
 * @returns {Promise<Array>}
 */
export async function loadAlgoBotLiteHistory(
  symbol,
  tf,
  requests,
  options = {}
) {
  const api = globalThis.window?.cryptoTerminalDesktop?.algoTrading;
  const exchangeId = String(getActiveExchangeId() || "bybit").toLowerCase();
  const pages = Math.max(1, Math.floor(Number(requests) || 1));
  const limit = Math.min(
    PAGE_BARS,
    Math.max(1, Math.floor(Number(options.pageLimit) || PAGE_BARS))
  );

  if (exchangeId === "bybit" && typeof api?.fetchKlinePage === "function") {
    const byTime = new Map();
    let endMs = Number.isFinite(options.endMs)
      ? Math.floor(options.endMs)
      : Date.now();
    let failed = false;
    let failedMessage = "";

    for (let i = 0; i < pages; i += 1) {
      const page = await fetchIpcPage(api, symbol, tf, endMs, limit);
      if (!page?.ok) {
        failed = true;
        failedMessage = page?.message || "сбой загрузки свечей";
        break;
      }
      const rows = Array.isArray(page.rows) ? page.rows : [];
      if (!rows.length) {
        break;
      }
      let oldest = Infinity;
      for (const raw of rows) {
        const candle = candleFromKlineRow(raw);
        if (!candle) {
          continue;
        }
        byTime.set(candle.time, candle);
        const ms = candle.time * 1000;
        if (ms < oldest) {
          oldest = ms;
        }
      }
      if (!Number.isFinite(oldest)) {
        failed = true;
        failedMessage = "страница свечей без времени";
        break;
      }
      if (rows.length < limit) {
        break;
      }
      endMs = oldest - 1;
    }

    const candles = [...byTime.values()].sort((a, b) => a.time - b.time);
    if (failed && !candles.length) {
      console.warn("[algo-trading] lite kline ipc:", failedMessage);
    } else if (failed) {
      throw new Error(
        failedMessage || `свечи ${tf} загружены не целиком`
      );
    } else if (klineGapFillEnds(candles, tf, limit).length) {
      throw new Error(`свечи ${tf} загружены не целиком`);
    } else if (candles.length) {
      return candles;
    }
  }

  const skipIpc = Number.isFinite(options.endMs);
  if (
    !skipIpc &&
    exchangeId === "bybit" &&
    typeof api?.fetchKlineHistoryDeep === "function"
  ) {
    try {
      const result = await api.fetchKlineHistoryDeep({
        symbol,
        tf,
        requests,
        batchGapMs: options.batchGapMs ?? 0
      });
      if (result?.ok && Array.isArray(result.candles) && result.candles.length) {
        return result.candles;
      }
      console.warn(
        "[algo-trading] lite kline ipc:",
        result?.message || "empty"
      );
    } catch (err) {
      console.warn("[algo-trading] lite kline ipc:", err?.message || err);
    }
  }
  return loadMarketHistory(symbol, tf, requests, options);
}
