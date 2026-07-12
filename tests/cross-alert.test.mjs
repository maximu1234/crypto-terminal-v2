import test from "node:test";
import assert from "node:assert/strict";
import {
  didCrossLine,
  didCrossWithCandle
} from "../alert-worker/lib/cross.js";
import { normalizeBybitSymbol } from "../alert-worker/lib/bybit-symbol.js";
import {
  alertCreatedOnBar,
  tfBarDurationSec
} from "../alert-worker/lib/tf-normalize.js";

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

test("didCrossWithCandle blocks wick cross on sameBar", () => {
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
    false
  );
});

test("alertCreatedOnBar detects creation within 4h bar", () => {
  const barTime =
    1704067200;
  const createdAt =
    (barTime + 3600) *
    1000;

  assert.equal(
    tfBarDurationSec("240"),
    14400
  );
  assert.equal(
    alertCreatedOnBar(
      createdAt,
      barTime,
      "240"
    ),
    true
  );
  assert.equal(
    alertCreatedOnBar(
      createdAt,
      barTime +
      14400,
      "240"
    ),
    false
  );
});

test("4h creation bar: wick in range but sameBar blocks false trigger", () => {
  const barTime =
    1704067200;
  const createdAt =
    (barTime + 7200) *
    1000;
  const candle = {
    time: barTime,
    open: 110,
    high: 112,
    low: 90,
    close: 105
  };
  const level =
    95;
  const baseline =
    105;
  const sameBar =
    alertCreatedOnBar(
      createdAt,
      candle.time,
      "240"
    );

  assert.equal(
    sameBar,
    true
  );
  assert.equal(
    didCrossWithCandle(
      baseline,
      candle,
      level,
      { sameBar }
    ),
    false
  );
});

test("TF switch back: rebaselined close blocks wick cross on creation bar", () => {
  const barTime =
    1704067200;
  const createdAt =
    (barTime + 7200) *
    1000;
  const candle = {
    time: barTime,
    open: 100,
    high: 125,
    low: 95,
    close: 105
  };
  const level =
    120;
  const baseline =
    105;
  const sameBar =
    alertCreatedOnBar(
      createdAt,
      candle.time,
      "240"
    );

  assert.equal(
    sameBar,
    true
  );
  assert.equal(
    didCrossWithCandle(
      baseline,
      candle,
      level,
      { sameBar }
    ),
    false
  );
  assert.equal(
    didCrossLine(
      baseline,
      candle.close,
      level
    ),
    false
  );
});

test("bar time floor avoids float mismatch for sameBar", () => {
  const barTime =
    1704067200;
  const stored =
    1704067200.0001;

  assert.equal(
    Math.floor(
      Number(
        stored
      )
    ),
    barTime
  );
  assert.notEqual(
    stored,
    barTime
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
