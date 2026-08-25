import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { notionalAt } from "../js/algo-trading/rsi-touch-flip-engine.js";
import { normalizeRsiTouchFlipPrefs } from "../js/algo-trading/rsi-touch-flip-prefs.js";

const require = createRequire(import.meta.url);
const math = require("../desktop/trading/algo-bot-rsi-touch-flip-math.cjs");

test("live math notional matches analysis engine", () => {
  const settings = normalizeRsiTouchFlipPrefs({
    maxStack: 3,
    budget: 90,
    sizeMode: "equal"
  });
  assert.equal(math.notionalAt(0, settings), notionalAt(0, settings));
  assert.equal(math.notionalAt(2, settings), notionalAt(2, settings));

  const avg = normalizeRsiTouchFlipPrefs({
    maxStack: 3,
    budget: 90,
    sizeMode: "average",
    sizeMult: 2
  });
  assert.equal(math.notionalAt(0, avg), notionalAt(0, avg));
  assert.equal(math.notionalAt(1, avg), notionalAt(1, avg));
});

test("OS while short closes then opens long at level 0", () => {
  const d = math.decideRsiTouchFlipBar({
    prevRsi: 31,
    rsi: 29,
    osLevel: 30,
    obLevel: 70,
    stack: 2,
    position: "short",
    maxStack: 3,
    allowLong: true,
    allowShort: true
  });
  assert.equal(d.touchOS, true);
  assert.equal(d.closeShort, true);
  assert.equal(d.openLong, true);
  assert.equal(d.longLevel, 0);
  assert.equal(d.openShort, false);
});

test("OS while long below max stack adds at current level", () => {
  const d = math.decideRsiTouchFlipBar({
    prevRsi: 31,
    rsi: 29,
    osLevel: 30,
    obLevel: 70,
    stack: 1,
    position: "long",
    maxStack: 3,
    allowLong: true,
    allowShort: true
  });
  assert.equal(d.openLong, true);
  assert.equal(d.longLevel, 1);
  assert.equal(d.closeLong, false);
});

test("LONG-only ignores OB open but still closes longs", () => {
  const d = math.decideRsiTouchFlipBar({
    prevRsi: 69,
    rsi: 71,
    osLevel: 30,
    obLevel: 70,
    stack: 2,
    position: "long",
    maxStack: 3,
    allowLong: true,
    allowShort: false
  });
  assert.equal(d.closeLong, true);
  assert.equal(d.openShort, false);
});

test("1m RSI on 5m chart maps last closed 1m inside the 5m", () => {
  const chart = [
    { time: 0, close: 1 },
    { time: 300, close: 1 }
  ];
  const source = [];
  const rsi = [];
  for (let t = 0; t <= 540; t += 60) {
    source.push({ time: t, close: 1 });
    rsi.push(t / 60);
  }
  const out = math.projectClosedSourceRsiOntoChart(
    chart,
    "5",
    source,
    "1",
    rsi
  );
  assert.equal(out[0], 4);
  assert.equal(out[1], 9);
});
