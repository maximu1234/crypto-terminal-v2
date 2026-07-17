import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  ".."
);

function read(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), "utf8");
}

function listJs(relativeDir) {
  return fs
    .readdirSync(path.join(ROOT, relativeDir))
    .filter((name) => name.endsWith(".js"))
    .map((name) => `${relativeDir}/${name}`);
}

test("renderer exchange modules do not import each other", () => {
  for (const file of listJs("js/trade/bybit")) {
    const source = read(file).toLowerCase();
    assert.doesNotMatch(source, /trade\/bingx|\/bingx\//, file);
  }

  for (const file of listJs("js/trade/bingx")) {
    const source = read(file).toLowerCase();
    assert.doesNotMatch(source, /trade\/bybit|\/bybit\//, file);
  }
});

test("main-process exchange adapters do not import each other", () => {
  for (const file of [
    "desktop/trading/bybit-rest.cjs",
    "desktop/trading/bybit-private-ws.cjs",
    "desktop/trading/bybit-trading-stream.cjs"
  ]) {
    assert.doesNotMatch(read(file), /require\([^)]*bingx/i, file);
  }

  for (const file of [
    "desktop/trading/bingx-rest.cjs",
    "desktop/trading/bingx-private-ws.cjs",
    "desktop/trading/bingx-trading-stream.cjs"
  ]) {
    assert.doesNotMatch(read(file), /require\([^)]*bybit/i, file);
  }
});

test("shared renderer trade entrypoints are thin facades", () => {
  const facades = [
    "js/trade-positions-cache.js",
    "js/trade-stream-bridge.js",
    "js/trade-chart-overlay.js",
    "js/trade-auto-stops.js",
    "js/trade-market-entry.js",
    "js/trade-book-panel.js"
  ];

  for (const file of facades) {
    const source = read(file);
    assert.match(source, /trade\/module-router\.js/, file);
    assert.doesNotMatch(
      source,
      /getActiveExchangeId|recentlyClosedMs|streamMissClearsCache|forceRefresh/,
      file
    );
    assert.doesNotMatch(source, /throw new Error/, `${file} should soft-fail`);
    assert.ok(source.split("\n").length < 140, `${file} is not a thin facade`);
  }
});

test("exchange switch stops old module before router reset", () => {
  const source = read("js/exchange-trading-gate.js");
  const restart = source.slice(source.indexOf("async function restartExchangeTrading"));
  const stopAt = restart.indexOf("await suspendExchangeTrading");
  const resetAt = restart.indexOf("resetTradeExchangeModules");

  assert.ok(stopAt >= 0, "old exchange is stopped");
  assert.ok(resetAt > stopAt, "router reset happens after stopping old exchange");
});

test("desktop extraResources destinations are unique", () => {
  const pkg = JSON.parse(read("desktop/package.json"));
  const destinations = (pkg.build?.extraResources || []).map((row) => row.to);
  assert.equal(
    new Set(destinations).size,
    destinations.length,
    "duplicate extraResources destination"
  );
});

test("BingX request scheduler stays BingX-only", () => {
  const scheduler = read("desktop/trading/bingx-request-scheduler.cjs");
  assert.doesNotMatch(scheduler, /require\([^)]*bybit/i);
  assert.match(scheduler, /createBingxRequestScheduler/);

  for (const file of [
    "desktop/trading/bybit-rest.cjs",
    "desktop/trading/bybit-trading-stream.cjs",
    "desktop/trading/bybit-private-ws.cjs"
  ]) {
    assert.doesNotMatch(
      read(file),
      /bingx-request-scheduler|enqueueBingxRequest/i,
      file
    );
  }

  assert.match(
    read("desktop/trading/bingx-rest.cjs"),
    /bingx-request-scheduler/
  );
});

test("BingX renderer stream bridge has no periodic REST poll", () => {
  const source = read("js/trade/bingx/stream-bridge.js");
  assert.doesNotMatch(source, /setInterval/);
  assert.doesNotMatch(source, /syncTradeStreamFromRest/);
  assert.match(source, /getStreamSnapshot/);
});

test("BingX diary list is income-first without boot history fan-out", () => {
  const source = read("desktop/trading/bingx-rest.cjs");
  const fnStart = source.indexOf("async function getClosedPnlHistory");
  assert.ok(fnStart >= 0);
  const nextFn = source.indexOf("\nasync function ", fnStart + 1);
  const body = source.slice(fnStart, nextFn > fnStart ? nextFn : undefined);
  assert.match(body, /income-first|REALIZED_PNL/);
  assert.doesNotMatch(
    body,
    /for \(let i = 0; i < symbols\.length/,
    "must not loop all symbols for positionHistory on list load"
  );
  assert.match(body, /if \(symbolFilter\)/);
  assert.match(
    body,
    /position-side-fills-v6|markerSchema:\s*6/,
    "single-symbol Terminal history must use explicit position-side schema"
  );
  assert.match(body, /fetchBingxPositionHistoryPages/);
  assert.match(body, /buildBingxRoundTripsFromPositionFills/);
  assert.match(body, /executionsFromBingxClosedTrades/);
  assert.doesNotMatch(
    body,
    /paired-fills-v[0-9]|enrichBingxTradeFromFills|pairChronologicalRoundTrip|pairBingxRoundTripFromFills/,
    "Terminal markers must not invent side/open from fill chronology"
  );
});

test("shared closed-PnL trade fetch uses trade config policy not exchange ifs", () => {
  const source = read("js/trade-markers-sandbox/trade-fetch.js");
  assert.match(source, /getActiveTradeConfig/);
  assert.match(source, /fetchClosedPnlTradeDetails/);
  assert.doesNotMatch(
    source,
    /getActiveExchangeId\(\)\s*===\s*["']bingx["']/
  );
  assert.doesNotMatch(
    source,
    /getActiveExchangeId\(\)\s*!==\s*["']bingx["']/
  );
});

test("diary chart markers use detail open/close and side", () => {
  const source = read("js/trade-diary-chart.js");
  assert.match(source, /DIARY_CHART_BARS_EACH_SIDE\s*=\s*200/);
  assert.match(source, /candleAlignSec\(\s*entryMs/);
  assert.match(source, /candleAlignSec\(\s*exitMs/);
  assert.match(source, /markerTimesFromDetail/);
  assert.doesNotMatch(
    source,
    /markerTimesFromDetailFills|buys\[0\]\.execTimeMs\s*<=\s*sells/
  );
  assert.match(source, /detail\?\.side|trade\?\.side/);
  assert.match(source, /detail\?\.openTimeMs/);
});
