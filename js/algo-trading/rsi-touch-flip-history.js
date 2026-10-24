/**
 * Полная история для подбора RSI Touch Flip.
 * 10 страниц × 1000 = 10 000 свечей. Короткий хвост без ошибки биржи —
 * молодой тикер. Обрыв страницы или дыра в ряде — сбой, частичный ряд не отдаём.
 */
import {
  ALGO_TICKER_SCAN_HISTORY_REQUESTS
} from "./ticker-scanner.js?v=05523b26";
import {
  rsiTouchFlipTfPeriodSec
} from "./rsi-touch-flip-mtf.js?v=450e7571";

export const RSI_TOUCH_FLIP_HISTORY_PAGE_BARS = 1000;

export const RSI_TOUCH_FLIP_HISTORY_PAGES =
  ALGO_TICKER_SCAN_HISTORY_REQUESTS;

export const RSI_TOUCH_FLIP_EXPECTED_BARS =
  RSI_TOUCH_FLIP_HISTORY_PAGES * RSI_TOUCH_FLIP_HISTORY_PAGE_BARS;

function fail(message, expectedBars) {
  return {
    ok: false,
    young: false,
    candles: [],
    expectedBars,
    bars: 0,
    message
  };
}

function candleFromRow(raw) {
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
      close
    };
  }
  if (!raw || typeof raw !== "object") {
    return null;
  }
  const timeRaw = Number(raw.time);
  const close = Number(raw.close);
  if (!Number.isFinite(timeRaw) || !Number.isFinite(close)) {
    return null;
  }
  return {
    time: timeRaw > 1e12 ? timeRaw / 1000 : timeRaw,
    open: Number(raw.open),
    high: Number(raw.high),
    low: Number(raw.low),
    close
  };
}

/**
 * @param {Array<{ time: number }>} candles
 * @param {number} tfSec
 * @returns {string}
 */
export function rsiTouchFlipHistoryGap(candles, tfSec) {
  if (!(tfSec > 0) || candles.length < 2) {
    return "";
  }
  for (let i = 1; i < candles.length; i += 1) {
    const delta = Number(candles[i].time) - Number(candles[i - 1].time);
    if (delta !== tfSec) {
      return `${candles[i - 1].time}→${candles[i].time}`;
    }
  }
  return "";
}

/**
 * @param {{
 *   symbol: string,
 *   tf: string,
 *   fetchPage: (q: { symbol: string, tf: string, endMs: number, limit: number }) => Promise<{ ok?: boolean, rows?: Array, message?: string }>,
 *   pages?: number,
 *   pageBars?: number
 * }} opts
 */
export async function loadRsiTouchFlipFitCandles(opts) {
  const pages = Math.max(
    1,
    Math.floor(Number(opts.pages) || RSI_TOUCH_FLIP_HISTORY_PAGES)
  );
  const limit = Math.max(
    1,
    Math.floor(Number(opts.pageBars) || RSI_TOUCH_FLIP_HISTORY_PAGE_BARS)
  );
  const expectedBars = pages * limit;
  const symbol = String(opts.symbol || "")
    .replace(/\.P$/i, "")
    .trim()
    .toUpperCase();
  const tf = String(opts.tf || "").trim();
  const tfSec = rsiTouchFlipTfPeriodSec(tf);
  if (!symbol || !(tfSec > 0)) {
    return fail("Некорректный тикер или таймфрейм", expectedBars);
  }
  if (typeof opts.fetchPage !== "function") {
    return fail("Нет загрузчика свечей", expectedBars);
  }

  const byTime = new Map();
  let endMs = Date.now();
  let young = false;

  for (let i = 0; i < pages; i += 1) {
    let page;
    try {
      page = await opts.fetchPage({ symbol, tf, endMs, limit });
    } catch (err) {
      return fail(
        `Сбой загрузки свечей: ${err?.message || err}`,
        expectedBars
      );
    }
    if (!page?.ok) {
      return fail(
        page?.message || "Биржа не отдала страницу свечей",
        expectedBars
      );
    }
    const rows = Array.isArray(page.rows) ? page.rows : [];
    if (!rows.length) {
      if (byTime.size === 0) {
        return fail("Биржа не вернула свечи", expectedBars);
      }
      young = true;
      break;
    }
    let oldest = Infinity;
    for (const raw of rows) {
      const candle = candleFromRow(raw);
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
      return fail("Страница свечей без времени", expectedBars);
    }
    if (rows.length < limit) {
      young = true;
      break;
    }
    endMs = oldest - 1;
  }

  const candles = [...byTime.values()].sort((a, b) => a.time - b.time);
  const gap = rsiTouchFlipHistoryGap(candles, tfSec);
  if (gap) {
    return fail(
      `В истории разрыв (${gap}). Подбор по неполному ряду не считается.`,
      expectedBars
    );
  }
  if (!young && candles.length !== expectedBars) {
    return fail(
      `Загружено ${candles.length} свечей из ${expectedBars}. Подбор остановлен.`,
      expectedBars
    );
  }
  if (!candles.length) {
    return fail("Нет свечей для подбора", expectedBars);
  }
  return {
    ok: true,
    young,
    candles,
    expectedBars,
    bars: candles.length,
    message: young
      ? `У тикера ${candles.length} свечей из ${expectedBars} — история с листинга.`
      : ""
  };
}
