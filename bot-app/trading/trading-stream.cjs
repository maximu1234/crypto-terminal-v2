/**
 * Trading stream facade — delegates to exchange-specific stream modules.
 * Edit Bybit behavior in bybit-trading-stream.cjs only.
 * Edit BingX behavior in bingx-trading-stream.cjs only.
 */
const {
  getActiveExchange
} = require("./trading-router.cjs");

const bybitStream = require("./bybit-trading-stream.cjs");
const bingxStream = require("./bingx-trading-stream.cjs");

function getStreamImpl() {
  return getActiveExchange() === "bingx" ? bingxStream : bybitStream;
}

function setTradingStreamTarget(webContents) {
  bybitStream.setTradingStreamTarget(webContents);
  bingxStream.setTradingStreamTarget(webContents);
}

function startTradingStream() {
  const active = getActiveExchange();
  if (active === "bingx") {
    bybitStream.stopTradingStream();
    return bingxStream.startTradingStream();
  }
  bingxStream.stopTradingStream();
  return bybitStream.startTradingStream();
}

function stopTradingStream() {
  bybitStream.stopTradingStream();
  bingxStream.stopTradingStream();
}

function seedFromRest() {
  return getStreamImpl().seedFromRest();
}

function replayTradingStream() {
  return getStreamImpl().replayTradingStream();
}

function removeStreamOrder(orderId) {
  return getStreamImpl().removeStreamOrder(orderId);
}

function removeStreamPosition(symbol, options) {
  return getStreamImpl().removeStreamPosition(symbol, options);
}

function upsertStreamPosition(position) {
  return getStreamImpl().upsertStreamPosition(position);
}

function getTradingSnapshot() {
  const impl = getStreamImpl();
  if (typeof impl.getTradingSnapshot === "function") {
    return impl.getTradingSnapshot();
  }
  return {
    ok: false,
    unsupported: true,
    message: "Stream snapshot unsupported for active exchange"
  };
}

function requestStreamSeed() {
  const impl = getStreamImpl();
  if (typeof impl.requestStreamSeed === "function") {
    return impl.requestStreamSeed();
  }
  if (typeof impl.seedFromRest === "function") {
    void impl.seedFromRest();
    return { ok: true };
  }
  return { ok: false, unsupported: true };
}

module.exports = {
  setTradingStreamTarget,
  startTradingStream,
  stopTradingStream,
  seedFromRest,
  replayTradingStream,
  getTradingSnapshot,
  requestStreamSeed,
  removeStreamOrder,
  removeStreamPosition,
  upsertStreamPosition
};
