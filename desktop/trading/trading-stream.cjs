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

module.exports = {
  setTradingStreamTarget,
  startTradingStream,
  stopTradingStream,
  seedFromRest,
  replayTradingStream,
  removeStreamOrder,
  removeStreamPosition,
  upsertStreamPosition
};
