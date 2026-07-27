/**
 * In-memory BingX SL/TP amend revisions (main process).
 * Shared by bingx-rest (mutations) and bingx-trading-stream (gates).
 */
const {
  stopAmendKey,
  isStopAmendActive
} = require("./bingx-position-stops.cjs");

/** @type {Map<string, object>} */
const pendingByKey = new Map();

let revisionSeq = 0;

/**
 * @param {object} input
 * @returns {object}
 */
function beginStopAmend(input) {
  const target = String(input?.target || "").toLowerCase() === "tp" ? "tp" : "sl";
  const key =
    input?.key ||
    stopAmendKey(
      input?.symbol,
      input?.positionSide,
      target,
      input?.side
    );
  const revision = {
    id: String(input?.id || `bingx-stop-${++revisionSeq}`),
    key,
    symbol: String(input?.symbol || "").trim(),
    positionSide: input?.positionSide || null,
    side: input?.side || null,
    target,
    price: Number(input?.price) || 0,
    oldOrderIds: Array.isArray(input?.oldOrderIds)
      ? input.oldOrderIds.map((id) => String(id).trim()).filter(Boolean)
      : [],
    newOrderId: input?.newOrderId ? String(input.newOrderId).trim() : null,
    phase: String(input?.phase || "requested"),
    at: Date.now()
  };
  pendingByKey.set(key, revision);
  return revision;
}

/**
 * @param {string} key
 * @param {object} patch
 * @returns {object|null}
 */
function updateStopAmend(key, patch = {}) {
  const prev = pendingByKey.get(key);
  if (!prev) {
    return null;
  }
  const next = {
    ...prev,
    ...patch,
    key,
    at: Date.now()
  };
  if (patch.newOrderId != null) {
    next.newOrderId = String(patch.newOrderId || "").trim() || null;
  }
  if (Array.isArray(patch.oldOrderIds)) {
    next.oldOrderIds = patch.oldOrderIds
      .map((id) => String(id).trim())
      .filter(Boolean);
  }
  pendingByKey.set(key, next);
  return next;
}

/**
 * @param {string} key
 * @returns {object|null}
 */
function getStopAmend(key) {
  return pendingByKey.get(key) || null;
}

/**
 * @param {object} position
 * @param {"sl"|"tp"|string} target
 * @returns {object|null}
 */
function getStopAmendForPosition(position, target) {
  if (!position?.symbol) {
    return null;
  }
  const key = stopAmendKey(
    position.symbol,
    position.positionSide,
    target,
    position.side
  );
  return getStopAmend(key);
}

/**
 * @param {object} position
 * @returns {{ sl: object|null, tp: object|null }}
 */
function getStopAmendsForPosition(position) {
  return {
    sl: getStopAmendForPosition(position, "sl"),
    tp: getStopAmendForPosition(position, "tp")
  };
}

/**
 * @param {string} key
 */
function clearStopAmend(key) {
  pendingByKey.delete(key);
}

/**
 * @param {object} position
 * @param {"sl"|"tp"|string} target
 */
function clearStopAmendForPosition(position, target) {
  if (!position?.symbol) {
    return;
  }
  clearStopAmend(
    stopAmendKey(
      position.symbol,
      position.positionSide,
      target,
      position.side
    )
  );
}

function clearAllStopAmends() {
  pendingByKey.clear();
}

/**
 * @returns {object[]}
 */
function listActiveStopAmends() {
  return [...pendingByKey.values()].filter(isStopAmendActive);
}

module.exports = {
  beginStopAmend,
  updateStopAmend,
  getStopAmend,
  getStopAmendForPosition,
  getStopAmendsForPosition,
  clearStopAmend,
  clearStopAmendForPosition,
  clearAllStopAmends,
  listActiveStopAmends,
  stopAmendKey
};
