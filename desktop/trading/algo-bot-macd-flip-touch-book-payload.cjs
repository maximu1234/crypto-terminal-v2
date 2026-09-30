/**
 * LAN / IPC payload for the MACD Flip Touch book.
 */

function parseMacdFlipTouchBookPayload(body) {
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
  const marginModeRaw = src.marginMode ?? nested?.marginMode;
  return {
    strategyId,
    isMacdFlipTouch: strategyId === "macd-flip-touch",
    rows,
    balancePct: balancePctRaw,
    marginMode: marginModeRaw
  };
}

module.exports = {
  parseMacdFlipTouchBookPayload
};
