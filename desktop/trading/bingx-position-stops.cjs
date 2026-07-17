/**
 * BingX positions from REST/WS omit SL/TP (stops live on openOrders).
 * Pure merge / amend-gate helpers — no Electron / network deps.
 */

/**
 * @param {string|null|undefined} symbol
 * @returns {string}
 */
function normalizeStopSymbol(symbol) {
  return String(symbol || "")
    .trim()
    .toUpperCase()
    .replace(/-/g, "");
}

/**
 * @param {string|null|undefined} positionSide
 * @param {string|null|undefined} side
 * @returns {string}
 */
function normalizeStopPositionSide(positionSide, side) {
  const raw = String(positionSide || "").trim().toUpperCase();
  if (raw === "LONG" || raw === "SHORT" || raw === "BOTH") {
    return raw;
  }
  const s = String(side || "").trim().toLowerCase();
  if (s === "buy" || s === "long") {
    return "LONG";
  }
  if (s === "sell" || s === "short") {
    return "SHORT";
  }
  return "BOTH";
}

/**
 * @param {string} symbol
 * @param {string|null|undefined} positionSide
 * @param {"sl"|"tp"|string} target
 * @param {string|null|undefined} [side]
 * @returns {string}
 */
function stopAmendKey(symbol, positionSide, target, side) {
  const sym = normalizeStopSymbol(symbol);
  const posSide = normalizeStopPositionSide(positionSide, side);
  const tgt = String(target || "").toLowerCase() === "tp" ? "tp" : "sl";
  return `${sym}:${posSide}:${tgt}`;
}

/**
 * @param {number|string|null|undefined} a
 * @param {number|string|null|undefined} b
 * @returns {boolean}
 */
function stopPricesMatch(a, b) {
  const x = Number(a);
  const y = Number(b);
  if (!(x > 0) || !(y > 0) || !Number.isFinite(x) || !Number.isFinite(y)) {
    return false;
  }
  const ref = Math.max(Math.abs(x), Math.abs(y), 1e-8);
  return Math.abs(x - y) / ref < 1e-5;
}

/**
 * @param {object|null|undefined} revision
 * @returns {boolean}
 */
function isStopAmendActive(revision) {
  if (!revision) {
    return false;
  }
  const phase = String(revision.phase || "");
  return (
    phase === "requested" ||
    phase === "clearing" ||
    phase === "placed"
  );
}

/**
 * During an active amend, only accept incoming stop if it matches the
 * requested price or the new order id. Stale non-zero OLD prices are rejected.
 *
 * @param {"sl"|"tp"|string} target
 * @param {object|null|undefined} _prev
 * @param {object|null|undefined} next
 * @param {object|null|undefined} revision
 * @returns {{ accept: boolean, confirmed?: boolean }}
 */
function shouldAcceptIncomingStop(target, _prev, next, revision) {
  if (!isStopAmendActive(revision)) {
    return { accept: true };
  }

  const tgt = String(target || "").toLowerCase() === "tp" ? "tp" : "sl";
  const priceKey = tgt === "sl" ? "stopLoss" : "takeProfit";
  const idKey = tgt === "sl" ? "slOrderId" : "tpOrderId";
  const incomingPrice = Number(next?.[priceKey]) || 0;
  const incomingId = String(next?.[idKey] || "").trim();
  const newId = String(revision.newOrderId || "").trim();
  const wantPrice = Number(revision.price) || 0;

  if (newId && incomingId && incomingId === newId) {
    return { accept: true, confirmed: true };
  }

  if (incomingPrice > 0 && wantPrice > 0 && stopPricesMatch(incomingPrice, wantPrice)) {
    return {
      accept: true,
      confirmed: Boolean(newId) || revision.phase === "placed"
    };
  }

  return { accept: false };
}

/**
 * Overlay requested amend price onto a position while amend is active.
 *
 * @param {object|null|undefined} position
 * @param {object|null|undefined} revision
 * @returns {object|null|undefined}
 */
function applyStopAmendOverlay(position, revision) {
  if (!position || !isStopAmendActive(revision)) {
    return position;
  }
  const out = { ...position };
  const price = Number(revision.price) || 0;
  if (!(price > 0)) {
    return out;
  }
  if (revision.target === "tp") {
    out.takeProfit = price;
    if (revision.newOrderId) {
      out.tpOrderId = revision.newOrderId;
    }
  } else {
    out.stopLoss = price;
    if (revision.newOrderId) {
      out.slOrderId = revision.newOrderId;
    }
  }
  return out;
}

/**
 * @param {object|null|undefined} prev
 * @param {object|null|undefined} mapped
 * @returns {object|null|undefined}
 */
function mergePositionStops(prev, mapped) {
  if (!prev || !mapped) {
    return mapped;
  }

  /* Explicit cancel / authoritative clear — do not resurrect stops. */
  if (mapped._stopsAuthoritative === true) {
    return mapped;
  }

  const out = { ...mapped };
  const nextSl = Number(out.stopLoss) || 0;
  const nextTp = Number(out.takeProfit) || 0;
  const prevSl = Number(prev.stopLoss) || 0;
  const prevTp = Number(prev.takeProfit) || 0;

  if (nextSl <= 0 && prevSl > 0) {
    out.stopLoss = prevSl;
    if (prev.slOrderId) {
      out.slOrderId = prev.slOrderId;
    }
  }

  if (nextTp <= 0 && prevTp > 0) {
    out.takeProfit = prevTp;
    if (prev.tpOrderId) {
      out.tpOrderId = prev.tpOrderId;
    }
  }

  return out;
}

/**
 * Merge then gate SL/TP against active amend revisions.
 *
 * @param {object|null|undefined} prev
 * @param {object|null|undefined} mapped
 * @param {{ sl?: object|null, tp?: object|null }} [revisions]
 * @returns {object|null|undefined}
 */
function mergePositionStopsWithRevisions(prev, mapped, revisions = {}) {
  if (!mapped) {
    return mapped;
  }

  let out = mergePositionStops(prev, mapped);
  if (!out) {
    return out;
  }

  const slRev = revisions.sl || null;
  const tpRev = revisions.tp || null;

  if (isStopAmendActive(slRev)) {
    const decision = shouldAcceptIncomingStop("sl", prev, out, slRev);
    if (!decision.accept) {
      out = applyStopAmendOverlay(
        {
          ...out,
          stopLoss: Number(prev?.stopLoss) || Number(slRev.price) || 0,
          slOrderId: prev?.slOrderId || out.slOrderId || null
        },
        slRev
      );
    } else {
      out = applyStopAmendOverlay(out, slRev);
    }
  }

  if (isStopAmendActive(tpRev)) {
    const decision = shouldAcceptIncomingStop("tp", prev, out, tpRev);
    if (!decision.accept) {
      out = applyStopAmendOverlay(
        {
          ...out,
          takeProfit: Number(prev?.takeProfit) || Number(tpRev.price) || 0,
          tpOrderId: prev?.tpOrderId || out.tpOrderId || null
        },
        tpRev
      );
    } else {
      out = applyStopAmendOverlay(out, tpRev);
    }
  }

  return out;
}

/**
 * Rebuild a positions map from REST rows without dropping known SL/TP.
 * Snapshot `prevByKey` BEFORE clearing the live map.
 *
 * @param {Map<string, object>} prevByKey
 * @param {Iterable<[string, object]>} nextEntries
 * @param {(key: string, mapped: object) => { sl?: object|null, tp?: object|null }} [getRevisions]
 * @returns {Map<string, object>}
 */
function rebuildPositionsKeepingStops(prevByKey, nextEntries, getRevisions) {
  const out = new Map();
  for (const [key, mapped] of nextEntries) {
    const prev = prevByKey.get(key);
    if (typeof getRevisions === "function") {
      out.set(
        key,
        mergePositionStopsWithRevisions(prev, mapped, getRevisions(key, mapped))
      );
    } else {
      out.set(key, mergePositionStops(prev, mapped));
    }
  }
  return out;
}

/**
 * @param {object|null|undefined} revision
 * @param {object|null|undefined} position
 * @returns {boolean}
 */
function isStopAmendConfirmedByPosition(revision, position) {
  if (!revision || !position) {
    return false;
  }
  const decision = shouldAcceptIncomingStop(
    revision.target,
    null,
    position,
    { ...revision, phase: "placed" }
  );
  return decision.accept === true && decision.confirmed === true;
}

module.exports = {
  normalizeStopSymbol,
  normalizeStopPositionSide,
  stopAmendKey,
  stopPricesMatch,
  isStopAmendActive,
  shouldAcceptIncomingStop,
  applyStopAmendOverlay,
  mergePositionStops,
  mergePositionStopsWithRevisions,
  rebuildPositionsKeepingStops,
  isStopAmendConfirmedByPosition
};
