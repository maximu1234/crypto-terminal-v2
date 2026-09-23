/**
 * One-shot SL/TP from Position Long/Short drawing («Применить + СЛ и ТП»).
 * In-memory only; one pending per symbol — multiple charts can arm at once.
 * Clears after next matching open for that symbol (or side mismatch).
 */
/** @type {Map<string, { symbol: string, side: string, slPrice: number, tpPrice: number, createdAt: number }>} */
const pendingBySymbol = new Map();
/** @type {Map<string, number>} symbol → suppress USD auto until ts */
const appliedUntilBySymbol = new Map();

const APPLIED_SUPPRESS_MS = 12_000;

function normalizeSymbol(symbol) {
  return String(symbol || "")
    .replace(/\.P$/i, "")
    .trim()
    .toUpperCase();
}

function markDrawingStopsApplied(symbol) {
  const sym = normalizeSymbol(symbol);
  if (!sym) {
    return;
  }
  appliedUntilBySymbol.set(sym, Date.now() + APPLIED_SUPPRESS_MS);
}

/** True briefly after drawing SL/TP were applied — skip USD auto-stops. */
export function wasDrawingStopsJustApplied(symbol) {
  const sym = normalizeSymbol(symbol);
  if (!sym) {
    return false;
  }
  const until = appliedUntilBySymbol.get(sym);
  if (!until) {
    return false;
  }
  if (Date.now() > until) {
    appliedUntilBySymbol.delete(sym);
    return false;
  }
  return true;
}

/** @returns {"Buy"|"Sell"|""} */
export function normalizeDrawingTradeSide(side) {
  const raw = String(side || "").trim().toLowerCase();
  if (raw === "long" || raw === "buy") {
    return "Buy";
  }
  if (raw === "short" || raw === "sell") {
    return "Sell";
  }
  return "";
}

/** @returns {"Buy"|"Sell"|""} */
export function resolvePositionTradeSide(position) {
  if (!position || typeof position !== "object") {
    return "";
  }
  const side = String(position.side || "").trim();
  if (side === "Buy" || side === "Sell") {
    return side;
  }
  const ps = String(position.positionSide || "").trim().toLowerCase();
  if (ps === "long") {
    return "Buy";
  }
  if (ps === "short") {
    return "Sell";
  }
  return normalizeDrawingTradeSide(side);
}

function emitDrawingStopsPendingChange(changedSymbol = "") {
  try {
    const symbols = [...pendingBySymbol.keys()];
    const primary = changedSymbol
      ? pendingBySymbol.get(normalizeSymbol(changedSymbol))
      : pendingBySymbol.values().next().value;
    const detail = {
      active: symbols.length > 0,
      symbols,
      symbol: primary?.symbol || "",
      side: primary?.side || ""
    };
    window.dispatchEvent(
      new CustomEvent("trade-drawing-stops-pending", { detail })
    );
  } catch {
    /* ignore */
  }
}

/**
 * Clear pending. With symbol — only that chart; without — all.
 * @param {string} [symbol]
 */
export function clearDrawingStopsPending(symbol) {
  if (symbol == null || symbol === "") {
    if (pendingBySymbol.size === 0) {
      return;
    }
    pendingBySymbol.clear();
    emitDrawingStopsPendingChange();
    return;
  }

  const sym = normalizeSymbol(symbol);
  if (!sym || !pendingBySymbol.has(sym)) {
    return;
  }
  pendingBySymbol.delete(sym);
  emitDrawingStopsPendingChange(sym);
}

/** True if a one-shot Apply+SL/TP is armed (optionally for symbol). */
export function hasDrawingStopsPending(symbol) {
  if (pendingBySymbol.size === 0) {
    return false;
  }
  if (symbol == null || symbol === "") {
    return true;
  }
  return pendingBySymbol.has(normalizeSymbol(symbol));
}

/**
 * @param {{ symbol: string, side: string, slPrice: number, tpPrice: number }} payload
 */
export function stashDrawingStopsFromDrawing(payload) {
  const symbol = normalizeSymbol(payload?.symbol);
  const side = normalizeDrawingTradeSide(payload?.side);
  const slPrice = Number(payload?.slPrice);
  const tpPrice = Number(payload?.tpPrice);

  if (!symbol || !side) {
    return false;
  }

  if (!Number.isFinite(slPrice) || slPrice <= 0) {
    clearDrawingStopsPending(symbol);
    return false;
  }

  if (!Number.isFinite(tpPrice) || tpPrice <= 0) {
    clearDrawingStopsPending(symbol);
    return false;
  }

  pendingBySymbol.set(symbol, {
    symbol,
    side,
    slPrice,
    tpPrice,
    createdAt: Date.now()
  });
  emitDrawingStopsPendingChange(symbol);
  return true;
}

/**
 * Peek without clearing — for skipping USD auto-stops on open when side matches.
 * @param {string} symbol
 * @param {string} side Buy/Sell/long/short
 */
export function peekDrawingStopsPendingForSide(symbol, side) {
  const sym = normalizeSymbol(symbol);
  const pending = sym ? pendingBySymbol.get(sym) : null;
  if (!pending) {
    return null;
  }
  const want = normalizeDrawingTradeSide(side);
  if (!want || pending.side !== want) {
    return null;
  }
  return { ...pending };
}

/**
 * Consume pending for this open. Always clears when symbol matches.
 * Side mismatch → clear + null (caller may fall back to USD auto-stops).
 * @returns {{ symbol: string, side: string, slPrice: number, tpPrice: number } | null}
 */
export function consumeDrawingStopsPending(symbol, position) {
  const sym = normalizeSymbol(symbol);
  if (!sym) {
    return null;
  }

  const stashed = pendingBySymbol.get(sym);
  if (!stashed) {
    return null;
  }

  pendingBySymbol.delete(sym);
  emitDrawingStopsPendingChange(sym);

  const got = resolvePositionTradeSide(position);
  if (!got || stashed.side !== got) {
    return null;
  }

  return stashed;
}

function tradeStopIpcOptions(position) {
  if (!position) {
    return {};
  }
  return {
    positionSide: position.positionSide,
    side: position.side,
    position
  };
}

async function setStopOnce(api, symbol, target, price, options) {
  try {
    return await api.setPositionStop(symbol, target, price, options);
  } catch (err) {
    return {
      ok: false,
      message: err?.message || "setPositionStop failed"
    };
  }
}

/**
 * Apply stashed drawing SL/TP to the new position. Returns true if applied
 * (caller must skip USD auto-stops). False → no pending / mismatch / no API.
 */
export async function tryApplyDrawingStopsPending(symbol, position) {
  const stashed = consumeDrawingStopsPending(symbol, position);
  if (!stashed) {
    return false;
  }

  markDrawingStopsApplied(stashed.symbol);

  const api = window.cryptoTerminalDesktop?.trading;
  if (!api?.setPositionStop) {
    return true;
  }

  const options = tradeStopIpcOptions(position);
  const existingSl = Number(position?.stopLoss) || 0;
  const existingTp = Number(position?.takeProfit) || 0;

  if (existingSl <= 0 && stashed.slPrice > 0) {
    const slResult = await setStopOnce(
      api,
      stashed.symbol,
      "sl",
      stashed.slPrice,
      options
    );
    if (slResult?.ok === false) {
      console.warn(
        "[drawing-stops]",
        stashed.symbol,
        "sl",
        slResult.message || "failed"
      );
    }
  }

  if (existingTp <= 0 && stashed.tpPrice > 0) {
    const tpResult = await setStopOnce(
      api,
      stashed.symbol,
      "tp",
      stashed.tpPrice,
      options
    );
    if (tpResult?.ok === false) {
      console.warn(
        "[drawing-stops]",
        stashed.symbol,
        "tp",
        tpResult.message || "failed"
      );
    }
  }

  return true;
}

/** @internal tests — pass symbol, or omit when at most one pending expected */
export function __getDrawingStopsPendingForTests(symbol) {
  if (symbol != null && symbol !== "") {
    const pending = pendingBySymbol.get(normalizeSymbol(symbol));
    return pending ? { ...pending } : null;
  }
  if (pendingBySymbol.size === 0) {
    return null;
  }
  if (pendingBySymbol.size === 1) {
    return { ...pendingBySymbol.values().next().value };
  }
  return [...pendingBySymbol.values()].map((p) => ({ ...p }));
}

/** @internal tests */
export function __resetDrawingStopsForTests() {
  pendingBySymbol.clear();
  appliedUntilBySymbol.clear();
}
