/**
 * LAN / IPC payload for the RSI Touch Flip book.
 * Isolated from Pattern 1-2 ticker-book `{ tickers: { SYMBOL: row } }`.
 */

function parseRsiTouchFlipBookPayload(body) {
  const src = body && typeof body === "object" ? body : {};
  const nested = src.book && typeof src.book === "object" ? src.book : null;
  const strategyId = String(
    src.strategyId || nested?.strategyId || ""
  )
    .trim()
    .toLowerCase();
  const fromRows = Array.isArray(src.rows) ? src.rows : null;
  const fromBookRows = Array.isArray(nested?.rows) ? nested.rows : null;
  const fromBookArray = Array.isArray(src.book) ? src.book : null;
  const rows = fromRows || fromBookRows || fromBookArray || [];
  const balancePctRaw = src.balancePct ?? nested?.balancePct;
  return {
    strategyId,
    isRsiTouchFlip: strategyId === "rsi-touch-flip",
    rows,
    balancePct: balancePctRaw
  };
}

module.exports = {
  parseRsiTouchFlipBookPayload
};
