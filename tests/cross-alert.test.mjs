import test from "node:test";
import assert from "node:assert/strict";
import {
  didCrossLine,
  didCrossWithCandle
} from "../alert-worker/lib/cross.js";
import { normalizeBybitSymbol } from "../alert-worker/lib/bybit-symbol.js";

test("didCrossLine detects sign change", () => {
  assert.equal(
    didCrossLine(100, 94, 95),
    true
  );
  assert.equal(
    didCrossLine(94, 93, 95),
    false
  );
  assert.equal(
    didCrossLine(95, 95, 95),
    false
  );
});

test("didCrossWithCandle wick cross when prev above level", () => {
  const candle = {
    open: 100,
    high: 101,
    low: 93,
    close: 99
  };

  assert.equal(
    didCrossWithCandle(
      100,
      candle,
      95,
      { sameBar: false }
    ),
    true
  );
});

test("didCrossWithCandle first tick open→close cross", () => {
  const candle = {
    open: 100,
    high: 100,
    low: 94,
    close: 94
  };

  assert.equal(
    didCrossWithCandle(
      100,
      candle,
      95,
      { sameBar: false }
    ),
    true
  );
});

test("didCrossWithCandle wick cross on sameBar", () => {
  const candle = {
    open: 100,
    high: 101,
    low: 93,
    close: 99
  };

  assert.equal(
    didCrossWithCandle(
      100,
      candle,
      95,
      { sameBar: true }
    ),
    true
  );
});

test("normalizeBybitSymbol strips .P suffix", () => {
  assert.equal(
    normalizeBybitSymbol("ethusdt.p"),
    "ETHUSDT"
  );
  assert.equal(
    normalizeBybitSymbol("BTCUSDT"),
    "BTCUSDT"
  );
});
