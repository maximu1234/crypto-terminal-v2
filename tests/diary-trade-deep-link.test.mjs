import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  buildDiaryTradeTerminalUrl,
  parseDiaryTradeDeepLink,
  resolveDiaryTradeFocusTimes
} from "../js/trade-diary-terminal-deep-link.js";

import {
  buildMarkersForCandles,
  executionIsDiaryFocus,
  markerForExecutionSide
} from "../js/trade-markers-sandbox/marker-math.js";

test("build/parse diary terminal deep-link round-trip", () => {
  const url = buildDiaryTradeTerminalUrl({
    symbol: "BTCUSDT.P",
    tf: "60",
    openMs: 1_700_000_000_000,
    closeMs: 1_700_000_360_000,
    orderId: "abc-1",
    exchange: "bybit"
  });

  assert.match(url, /^\/terminal\.html\?/);
  const qs = url.split("?")[1];
  const parsed = parseDiaryTradeDeepLink(new URLSearchParams(qs));
  assert.ok(parsed);
  assert.equal(parsed.history, true);
  assert.equal(parsed.openMs, 1_700_000_000_000);
  assert.equal(parsed.closeMs, 1_700_000_360_000);
  assert.equal(parsed.orderId, "abc-1");
});

test("diary terminal url does not force a timeframe", () => {
  const url = buildDiaryTradeTerminalUrl({
    symbol: "ETHUSDT",
    openMs: 1_000,
    closeMs: 2_000,
    exchange: "bybit"
  });
  const params = new URLSearchParams(url.split("?")[1]);
  assert.equal(params.get("tf"), null);
  assert.equal(params.get("symbol"), "ETHUSDT");
  assert.equal(params.get("history"), "1");
});

test("diary open keeps terminal timeframe and does not zoom the trade", () => {
  const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
  const bybitPage = fs.readFileSync(
    path.join(root, "js/trade/bybit/diary/page.js"),
    "utf8"
  );
  const bingxPage = fs.readFileSync(
    path.join(root, "js/trade/bingx/diary/page.js"),
    "utf8"
  );
  const bybitMarkers = fs.readFileSync(
    path.join(root, "js/trade/bybit/chart-execution-markers.js"),
    "utf8"
  );
  const bingxMarkers = fs.readFileSync(
    path.join(root, "js/trade/bingx/chart-execution-markers.js"),
    "utf8"
  );
  const terminal = fs.readFileSync(path.join(root, "js/terminal.js"), "utf8");
  assert.doesNotMatch(bybitPage, /tf:\s*"60"/);
  assert.doesNotMatch(bingxPage, /tf:\s*"60"/);
  assert.doesNotMatch(bybitMarkers, /scrollChartToFocusWindow|setVisibleRange/);
  assert.doesNotMatch(bingxMarkers, /scrollChartToFocusWindow|setVisibleRange/);
  assert.match(terminal, /coinsState\(\)\.diaryTradeDeepLink\?\.history/);
  assert.match(terminal, /readLastViewForExchange/);
});

test("parseDiaryTradeDeepLink returns null without history=1", () => {
  assert.equal(
    parseDiaryTradeDeepLink(
      new URLSearchParams("symbol=BTCUSDT&openMs=1&closeMs=2")
    ),
    null
  );
});

test("resolveDiaryTradeFocusTimes expands sparse equal open/close", () => {
  const focus = resolveDiaryTradeFocusTimes({
    openTimeMs: 1_000,
    closeTimeMs: 1_000,
    durationMs: 0,
    orderId: "x"
  });
  assert.ok(focus.openMs < focus.closeMs);
  assert.equal(focus.closeMs, 1_000);
});

test("focused diary marker is gold and larger", () => {
  const normal = markerForExecutionSide("Buy", 100);
  const focused = markerForExecutionSide("Sell", 100, { focused: true });
  assert.equal(normal.color, "#22c55e");
  assert.equal(normal.size, 2);
  assert.equal(focused.color, "#fbbf24");
  assert.equal(focused.size, 3);
  assert.equal(focused.shape, "arrowDown");
});

test("buildMarkersForCandles highlights only the diary trade", () => {
  const candles = [
    { time: 100 },
    { time: 160 },
    { time: 220 },
    { time: 280 }
  ];
  const executions = [
    { side: "Buy", execTimeMs: 100_000, orderId: "other" },
    { side: "Sell", execTimeMs: 220_000, orderId: "abc" },
    { side: "Buy", execTimeMs: 160_000, orderId: "neighbor" },
    { side: "Buy", execTimeMs: 280_000, orderId: "abc" }
  ];
  const focus = {
    openMs: 220_000,
    closeMs: 280_000,
    orderId: "abc"
  };
  assert.equal(executionIsDiaryFocus(executions[1], focus), true);
  assert.equal(executionIsDiaryFocus(executions[2], focus), false);
  const markers = buildMarkersForCandles(executions, "1", candles, focus);
  const focused = markers.filter((m) => m.color === "#fbbf24");
  assert.equal(focused.length, 2);
  assert.ok(markers.some((m) => m.color === "#22c55e"));
});
