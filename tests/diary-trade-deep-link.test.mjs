import assert from "node:assert/strict";
import test from "node:test";

import {
  buildDiaryTradeTerminalUrl,
  parseDiaryTradeDeepLink,
  resolveDiaryTradeFocusTimes
} from "../js/trade-diary-terminal-deep-link.js";

import {
  buildMarkersForCandles,
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

test("focused markers keep same size but brighter color", () => {
  const normal = markerForExecutionSide("Buy", 100);
  const focused = markerForExecutionSide("Buy", 100, { focused: true });
  assert.equal(normal.size, 2);
  assert.equal(focused.size, 2);
  assert.notEqual(normal.color, focused.color);
});

test("buildMarkersForCandles marks focus window executions", () => {
  const candles = [
    { time: 100 },
    { time: 160 },
    { time: 220 },
    { time: 280 }
  ];
  const executions = [
    { side: "Buy", execTimeMs: 100_000 },
    { side: "Sell", execTimeMs: 220_000 },
    { side: "Buy", execTimeMs: 280_000 }
  ];
  const markers = buildMarkersForCandles(executions, "1", candles, {
    fromMs: 200_000,
    toMs: 230_000
  });
  assert.ok(markers.length >= 2);
  const focused = markers.filter((m) => m.color === "#f87171" || m.color === "#4ade80");
  assert.equal(focused.length, 1);
  assert.equal(focused[0].shape, "arrowDown");
  assert.equal(focused[0].size, 2);
});
