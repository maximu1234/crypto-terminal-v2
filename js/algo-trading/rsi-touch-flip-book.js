/**
 * Книга RSI Touch Flip: тикер + свой ТФ графика + launch-prefs.
 * Не смешивать с книгой Паттерн 1-2 (bot-ticker-book).
 */
import {
  pickRsiTouchFlipLaunchPrefs
} from "./rsi-touch-flip-prefs.js?v=2";

export const RSI_TOUCH_FLIP_BOOK_KEY =
  "algo_trading_rsi_touch_flip_book_v1";

export const RSI_TOUCH_FLIP_BOOK_CHANGE_EVENT =
  "algo-rsi-touch-flip-book-changed";

export const RSI_TOUCH_FLIP_LIST_MARKET =
  "algo-rsi-touch-flip";

export const RSI_TOUCH_FLIP_BOOK_OPEN_EVENT =
  "algo-rsi-touch-flip-book-open";

/**
 * @param {unknown} symbol
 * @returns {string}
 */
export function normalizeRsiTouchFlipBookSymbol(symbol) {
  return String(symbol || "")
    .replace(/\.P$/i, "")
    .trim()
    .toUpperCase();
}

/**
 * @param {unknown} tf
 * @returns {string}
 */
export function normalizeRsiTouchFlipBookTf(tf) {
  return String(tf || "").trim();
}

/**
 * @param {unknown} raw
 * @returns {number}
 */
export function parseWalletAvailableUsdt(raw) {
  if (raw && typeof raw === "object") {
    const available = Number(raw.available);
    const usdt = Number(raw.usdt);
    if (Number.isFinite(available) && available > 0) {
      return available;
    }
    if (Number.isFinite(usdt) && usdt > 0) {
      return usdt;
    }
    if (Number.isFinite(available) && available >= 0) {
      return available;
    }
    if (Number.isFinite(usdt)) {
      return usdt;
    }
    return NaN;
  }
  const n = Number(raw);
  return Number.isFinite(n) ? n : NaN;
}

/**
 * @param {unknown} raw
 * @returns {{ symbol: string, tf: string, prefs: object }|null}
 */
export function normalizeRsiTouchFlipBookRow(raw) {
  const src = raw && typeof raw === "object" ? raw : {};
  const symbol = normalizeRsiTouchFlipBookSymbol(src.symbol);
  const tf = normalizeRsiTouchFlipBookTf(src.tf);
  if (!symbol || !tf) {
    return null;
  }
  return {
    symbol,
    tf,
    prefs: pickRsiTouchFlipLaunchPrefs(src.prefs || src)
  };
}

/**
 * @param {unknown} rows
 * @returns {Array<{ symbol: string, tf: string, prefs: object }>}
 */
export function normalizeRsiTouchFlipBook(rows) {
  const list = Array.isArray(rows) ? rows : [];
  const bySymbol = new Map();
  for (const raw of list) {
    const row = normalizeRsiTouchFlipBookRow(raw);
    if (row) {
      bySymbol.set(row.symbol, row);
    }
  }
  return [...bySymbol.values()];
}

/**
 * @param {Array<{ prefs?: { budget?: number } }>} rows
 * @returns {number}
 */
export function sumRsiTouchFlipBookBudgets(rows) {
  return normalizeRsiTouchFlipBook(rows).reduce((sum, row) => {
    const budget = Number(row.prefs?.budget);
    return sum + (Number.isFinite(budget) ? budget : 0);
  }, 0);
}

/**
 * @param {{
 *   rows: unknown,
 *   available: unknown,
 *   incoming?: { symbol?: string, budget?: number }
 * }} opts
 * @returns {{ ok: boolean, sum: number, available: number, missing: number, message: string }}
 */
export function rsiTouchFlipBookBudgetFits(opts) {
  const incoming = opts?.incoming;
  const incomingSymbol = normalizeRsiTouchFlipBookSymbol(incoming?.symbol);
  const rows = normalizeRsiTouchFlipBook(opts?.rows).filter(
    (row) => !incomingSymbol || row.symbol !== incomingSymbol
  );
  let sum = sumRsiTouchFlipBookBudgets(rows);
  if (incoming) {
    const budget = Number(
      incoming.budget ?? incoming.prefs?.budget
    );
    sum += Number.isFinite(budget) ? budget : 0;
  }
  const available = parseWalletAvailableUsdt(opts?.available);
  const missing = Number.isFinite(available) ? Math.max(0, sum - available) : NaN;
  if (!Number.isFinite(available)) {
    return {
      ok: false,
      sum,
      available: NaN,
      missing: NaN,
      message: "Не удалось прочитать доступный баланс алго-ключа"
    };
  }
  if (sum > available) {
    return {
      ok: false,
      sum,
      available,
      missing,
      message: `Сумма бюджетов ${sum.toFixed(2)} USDT > баланс ${available.toFixed(2)} USDT (не хватает ${missing.toFixed(2)})`
    };
  }
  return {
    ok: true,
    sum,
    available,
    missing: 0,
    message: ""
  };
}

function readStored() {
  try {
    const raw = localStorage.getItem(RSI_TOUCH_FLIP_BOOK_KEY);
    if (!raw) {
      return [];
    }
    return normalizeRsiTouchFlipBook(JSON.parse(raw));
  } catch {
    return [];
  }
}

function writeStored(rows) {
  const next = normalizeRsiTouchFlipBook(rows);
  try {
    localStorage.setItem(RSI_TOUCH_FLIP_BOOK_KEY, JSON.stringify(next));
  } catch (err) {
    console.warn("[algo-trading] rsi touch flip book persist", err);
  }
  try {
    window.dispatchEvent(
      new CustomEvent(RSI_TOUCH_FLIP_BOOK_CHANGE_EVENT, { detail: { rows: next } })
    );
  } catch {
    /* ignore */
  }
  return next;
}

/**
 * @returns {Array<{ symbol: string, tf: string, prefs: object }>}
 */
export function loadRsiTouchFlipBook() {
  return readStored();
}

/**
 * @param {string} symbol
 * @returns {{ symbol: string, tf: string, prefs: object }|null}
 */
export function getRsiTouchFlipBookRow(symbol) {
  const id = normalizeRsiTouchFlipBookSymbol(symbol);
  return loadRsiTouchFlipBook().find((row) => row.symbol === id) || null;
}

/**
 * @returns {string[]}
 */
export function listRsiTouchFlipBookSymbols() {
  return loadRsiTouchFlipBook().map((row) => row.symbol);
}

/**
 * @param {{ symbol: string, tf: string, prefs?: object }} row
 * @returns {Array<{ symbol: string, tf: string, prefs: object }>}
 */
export function upsertRsiTouchFlipBookRow(row) {
  const nextRow = normalizeRsiTouchFlipBookRow(row);
  if (!nextRow) {
    return loadRsiTouchFlipBook();
  }
  const rows = loadRsiTouchFlipBook().filter((item) => item.symbol !== nextRow.symbol);
  rows.push(nextRow);
  return writeStored(rows);
}

/**
 * @param {string} symbol
 * @returns {Array<{ symbol: string, tf: string, prefs: object }>}
 */
export function removeRsiTouchFlipBookRow(symbol) {
  const id = normalizeRsiTouchFlipBookSymbol(symbol);
  return writeStored(loadRsiTouchFlipBook().filter((row) => row.symbol !== id));
}

/**
 * Снимок на старт бота. Дальнейшие правки книги live не видит.
 * @returns {Array<{ symbol: string, tf: string, prefs: object }>}
 */
export function snapshotRsiTouchFlipBook() {
  return loadRsiTouchFlipBook().map((row) => ({
    symbol: row.symbol,
    tf: row.tf,
    prefs: { ...row.prefs }
  }));
}
