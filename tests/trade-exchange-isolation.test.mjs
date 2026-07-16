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
