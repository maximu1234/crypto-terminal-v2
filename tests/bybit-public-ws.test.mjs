import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  ".."
);

function read(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), "utf8");
}

const require = createRequire(import.meta.url);

const { sanitizeBybitPublicTopic } = (() => {
  const Module = require("module");
  const originalLoad = Module._load;
  Module._load = function (request, parent, isMain) {
    if (request === "electron-log") {
      return {
        info() {},
        warn() {},
        error() {},
        debug() {}
      };
    }
    if (request === "ws") {
      return function WsStub() {};
    }
    return originalLoad.apply(this, arguments);
  };
  try {
    return require("../desktop/trading/bybit-public-ws.cjs");
  } finally {
    Module._load = originalLoad;
  }
})();

test("public Bybit WS in main uses SOCKS relay and gated IPC", () => {
  const source = read("desktop/trading/bybit-public-ws.cjs");
  assert.match(source, /getRelayHttpsAgent/);
  assert.match(source, /new Ws\(\s*\nurl,\s*\nwsClientOptions\(\)/);
  assert.match(source, /opts\.agent/);
  assert.match(source, /wss:\/\/stream\.bybit\.com\/v5\/public\/linear/);
  assert.match(source, /handleTrustedDesktopUi/);
  assert.match(source, /bybitPublic:setTopics/);
  assert.match(source, /bybitPublic:getTickers/);
  assert.doesNotMatch(source, /bingx/i);
  assert.doesNotMatch(source, /require\([^)]*algo-bybit-kline/);
});

test("desktop preload and main wire public Bybit WS outside trading APIs", () => {
  const preload = read("desktop/preload.js");
  assert.match(preload, /bybitPublicWs:/);
  assert.match(preload, /bybitPublic:setTopics/);
  assert.match(preload, /bybitPublic:getTickers/);
  assert.doesNotMatch(
    preload.slice(preload.indexOf("trading:{"), preload.indexOf("bybitPublicWs:")),
    /bybitPublic/
  );

  const main = read("desktop/main.js");
  assert.match(main, /registerBybitPublicWsIpc/);
  assert.match(main, /setBybitPublicWsTarget/);
});

test("renderer Bybit ws uses desktop public hub and strips .P", () => {
  const source = read("js/ws.js");
  assert.match(source, /cryptoTerminalDesktop\?\.bybitPublicWs/);
  assert.match(source, /canonicalWsSymbol/);
  assert.match(source, /replace\(\s*\n\/\\.P\$\/i/);
  assert.match(source, /lastTickerRawByTopic/);
  assert.match(source, /hasDesktopPublicWs/);
});

test("desktop tickers use main-process SOCKS instead of Chromium REST", () => {
  const tickers = read("js/tickers.js");
  assert.match(tickers, /bybitPublicWs\?\.getTickers/);
  assert.match(tickers, /tickersInflight/);
  const table = read("js/terminal/terminal-table.js");
  const gen = table.slice(table.indexOf("export function generateMarketData"));
  assert.match(gen, /previous\.get/);
  assert.match(gen, /prev\?\.volume24/);
});

test("public WS probe reuses the hub and does not open a second SOCKS socket", () => {
  const source = read("desktop/trading/bybit-public-ws.cjs");
  const probe = source.slice(source.indexOf("function probePublicWs"));
  assert.match(probe, /waitForHubOpen/);
  assert.match(probe, /applyTopics/);
  assert.doesNotMatch(probe, /probeSocket/);
  assert.match(source, /handshakeTimeout/);
  assert.match(source, /WS_URL_BYTICK/);
  assert.match(
    source.slice(source.indexOf("function publicWsUrlList")),
    /getRelayHttpsAgent\(\)[\s\S]*?WS_URL_BYTICK/
  );
});

test("topic changes resubscribe the full wanted set, not only added", () => {
  const source = read("desktop/trading/bybit-public-ws.cjs");
  const apply = source.slice(source.indexOf("function applyTopics"));
  assert.match(
    apply,
    /if\(\s*\nadded\.length\s*\n\)\{\s*\nsubscribeTopics\(\s*\n\[\s*\n\.\.\.wanted\s*\n\]/
  );
  assert.match(source, /KLINE_SILENCE_MS/);
  assert.match(source, /lastKlineAt/);
  assert.match(source, /kline silence/);
});

test("terminal live ticker updates the last candle without waiting for kline", () => {
  const table = read("js/terminal/terminal-table.js");
  const start = table.slice(table.indexOf("export function startRealtime"));
  const ticker = start.slice(
    start.indexOf("subscribeTicker"),
    start.indexOf("connectKlineStream")
  );
  assert.match(ticker, /applyLivePriceToLastCandle/);
  assert.doesNotMatch(ticker, /lastPublicKlineAt/);
  assert.match(start, /lastPublicKlineAt =\s*\n0/);
});

test("REST ticker poll also drives the last chart candle", () => {
  const table = read("js/terminal/terminal-table.js");
  const stream = table.slice(table.indexOf("export function startTickerStream"));
  assert.match(stream, /applyLivePriceToLastCandle/);
  assert.match(stream, /market-last-price/);
});

test("extra terminal chart panes also subscribe public tickers", () => {
  const pane = read("js/terminal-screener-chart-pane.js");
  assert.match(pane, /subscribeTicker/);
  assert.match(pane, /applyPaneLivePrice/);
  assert.match(pane, /market-last-price/);
});

test("sanitizeBybitPublicTopic allows kline and tickers only", () => {
  assert.equal(
    sanitizeBybitPublicTopic("kline.5.BTCUSDT.P"),
    ""
  );
  assert.equal(
    sanitizeBybitPublicTopic("kline.5.BTCUSDT"),
    "kline.5.BTCUSDT"
  );
  assert.equal(
    sanitizeBybitPublicTopic("kline.D.ethusdt"),
    "kline.D.ETHUSDT"
  );
  assert.equal(
    sanitizeBybitPublicTopic("tickers.btcusdt"),
    "tickers.BTCUSDT"
  );
  assert.equal(
    sanitizeBybitPublicTopic("orderbook.BTCUSDT"),
    ""
  );
});
