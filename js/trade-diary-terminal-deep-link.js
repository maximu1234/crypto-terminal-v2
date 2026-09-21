/**
 * Deep-link: Дневник → Терминал (конкретная сделка + история маркеров).
 */

export const DIARY_TRADE_HISTORY_PARAM = "history";
export const DIARY_TRADE_OPEN_MS_PARAM = "openMs";
export const DIARY_TRADE_CLOSE_MS_PARAM = "closeMs";
export const DIARY_TRADE_ORDER_ID_PARAM = "orderId";

function normalizeSymbol(symbol) {
  return String(symbol || "")
    .replace(/\.P$/i, "")
    .trim()
    .toUpperCase();
}

function toFiniteMs(value) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.round(n) : 0;
}

/**
 * @param {{
 *   symbol: string,
 *   openMs?: number,
 *   closeMs?: number,
 *   orderId?: string|number,
 *   tf?: string,
 *   exchange?: string
 * }} opts
 * @returns {string}
 */
export function buildDiaryTradeTerminalUrl(opts = {}) {
  const symbol = normalizeSymbol(opts.symbol);
  const params = new URLSearchParams();

  if (symbol) {
    params.set("symbol", symbol);
  }

  params.set("tf", String(opts.tf || "60"));

  const openMs = toFiniteMs(opts.openMs);
  const closeMs = toFiniteMs(opts.closeMs);

  if (openMs) {
    params.set(DIARY_TRADE_OPEN_MS_PARAM, String(openMs));
  }
  if (closeMs) {
    params.set(DIARY_TRADE_CLOSE_MS_PARAM, String(closeMs));
  }

  const orderId = String(opts.orderId || "").trim();
  if (orderId) {
    params.set(DIARY_TRADE_ORDER_ID_PARAM, orderId);
  }

  params.set(DIARY_TRADE_HISTORY_PARAM, "1");

  const exchange = String(opts.exchange || "")
    .trim()
    .toLowerCase();
  if (exchange === "bybit" || exchange === "bingx") {
    params.set("exchange", exchange);
  }

  return `/terminal.html?${params.toString()}`;
}

/**
 * @param {URLSearchParams | { get?: Function } | Record<string, string>} params
 * @returns {{
 *   history: boolean,
 *   openMs: number,
 *   closeMs: number,
 *   orderId: string
 * } | null}
 */
export function parseDiaryTradeDeepLink(params) {
  const get =
    typeof params?.get === "function"
      ? (key) => params.get(key)
      : (key) => params?.[key];

  const historyRaw = String(get(DIARY_TRADE_HISTORY_PARAM) || "").trim();
  if (historyRaw !== "1" && historyRaw.toLowerCase() !== "true") {
    return null;
  }

  let openMs = toFiniteMs(get(DIARY_TRADE_OPEN_MS_PARAM));
  let closeMs = toFiniteMs(get(DIARY_TRADE_CLOSE_MS_PARAM));

  if (!openMs && !closeMs) {
    return null;
  }

  if (!openMs && closeMs) {
    openMs = closeMs - 2 * 60 * 60 * 1000;
  }
  if (!closeMs && openMs) {
    closeMs = openMs + 2 * 60 * 60 * 1000;
  }
  if (openMs === closeMs) {
    openMs = closeMs - 2 * 60 * 60 * 1000;
  }
  if (closeMs < openMs) {
    const tmp = openMs;
    openMs = closeMs;
    closeMs = tmp;
  }

  return {
    history: true,
    openMs,
    closeMs,
    orderId: String(get(DIARY_TRADE_ORDER_ID_PARAM) || "").trim()
  };
}

/** Remove diary deep-link query keys (keep symbol/tf). */
export function clearDiaryTradeDeepLinkParams() {
  try {
    const params = new URLSearchParams(window.location.search);
    params.delete(DIARY_TRADE_HISTORY_PARAM);
    params.delete(DIARY_TRADE_OPEN_MS_PARAM);
    params.delete(DIARY_TRADE_CLOSE_MS_PARAM);
    params.delete(DIARY_TRADE_ORDER_ID_PARAM);
    const qs = params.toString();
    const next = `${window.location.pathname || "/"}${qs ? `?${qs}` : ""}`;
    history.replaceState(null, "", next);
  } catch {
    /* ignore */
  }
}

/**
 * Resolve open/close ms from a diary trade row (handles BingX sparse).
 * @param {object} trade
 * @returns {{ openMs: number, closeMs: number, orderId: string }}
 */
export function resolveDiaryTradeFocusTimes(trade) {
  let openMs = toFiniteMs(trade?.openTimeMs);
  let closeMs = toFiniteMs(trade?.closeTimeMs || trade?.listCloseTimeMs);
  const durationMs = toFiniteMs(trade?.durationMs);
  const orderId = String(trade?.orderId || trade?.positionId || "").trim();

  if (!closeMs && openMs) {
    closeMs = openMs + (durationMs || 2 * 60 * 60 * 1000);
  }
  if (!openMs && closeMs) {
    openMs = durationMs
      ? closeMs - durationMs
      : closeMs - 2 * 60 * 60 * 1000;
  }
  if (openMs && closeMs && openMs === closeMs) {
    openMs = durationMs
      ? closeMs - durationMs
      : closeMs - 2 * 60 * 60 * 1000;
  }
  if (closeMs < openMs) {
    const tmp = openMs;
    openMs = closeMs;
    closeMs = tmp;
  }

  return { openMs, closeMs, orderId };
}
