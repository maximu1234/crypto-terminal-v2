import test from "node:test";
import assert from "node:assert/strict";

import {
  alignRsiWithCandleTimes,
  calculateRSI
} from "../js/indicators.js";

import {
  expandPriceScale,
  priceToY,
  zoomPriceScale
} from "../js/canvas-bench/price-scale.js";

import {
  rollRsi,
  rsiReplaceLast
} from "../js/canvas-bench/rsi.js";

import {
  candleX,
  clampPan,
  liveUpdateKind,
  panForAnchor,
  scaleFromCandles
} from "../js/canvas-bench/live-plan.js";

const scale = { min: 90, max: 110 };

test("identical candle is not a paint", () => {
  const candle = {
    time: 10,
    open: 100,
    high: 101,
    low: 99,
    close: 100.5
  };
  assert.equal(liveUpdateKind(candle, { ...candle }, scale), "skip");
});

test("same bar inside the scale repaints only the live candle", () => {
  const prev = {
    time: 10,
    open: 100,
    high: 101,
    low: 99,
    close: 100
  };
  const next = { ...prev, close: 100.4, high: 101.2 };
  assert.equal(liveUpdateKind(prev, next, scale), "live");
});

test("a wick through the scale rebuilds history", () => {
  const prev = {
    time: 10,
    open: 100,
    high: 101,
    low: 99,
    close: 100
  };
  assert.equal(
    liveUpdateKind(prev, { ...prev, high: 110.1 }, scale),
    "rebuild"
  );
  assert.equal(
    liveUpdateKind(prev, { ...prev, low: 89.9 }, scale),
    "rebuild"
  );
});

test("a new bar rebuilds, an older bar is ignored", () => {
  const prev = {
    time: 10,
    open: 100,
    high: 101,
    low: 99,
    close: 100
  };
  assert.equal(
    liveUpdateKind(prev, { ...prev, time: 70 }, scale),
    "rebuild"
  );
  assert.equal(
    liveUpdateKind(prev, { ...prev, time: 9, close: 1 }, scale),
    "skip"
  );
});

test("an off-screen update does not touch the bitmap", () => {
  const prev = {
    time: 10,
    open: 100,
    high: 101,
    low: 99,
    close: 100
  };
  assert.equal(
    liveUpdateKind(prev, { ...prev, close: 100.2 }, scale, false),
    "store"
  );
});

test("zoom keeps the candle under the cursor", () => {
  const last = 100;
  const plotRight = 800;
  const rightGap = 12;
  const spacing = 8;
  const pan = 20;
  const index = 80;
  const x = candleX(index, last, plotRight, rightGap, spacing, pan);
  const nextSpacing = 14;
  const nextPan = panForAnchor(
    index,
    x,
    last,
    plotRight,
    rightGap,
    nextSpacing
  );
  assert.equal(
    candleX(index, last, plotRight, rightGap, nextSpacing, nextPan),
    x
  );
});

test("pan stops before the last candle leaves the plot", () => {
  const pan = clampPan(-10_000, 500, 0, 900, 12, 8);
  const xLast = candleX(499, 499, 900, 12, 8, pan);
  assert.ok(xLast >= 0);
  assert.ok(xLast <= 900);
});

test("a pinned scale does not rebuild when price leaves the window", () => {
  const prev = {
    time: 10,
    open: 100,
    high: 101,
    low: 99,
    close: 100
  };
  assert.equal(
    liveUpdateKind(prev, { ...prev, high: 200 }, scale, true, false),
    "live"
  );
});

test("log scale keeps the candle range inset by 12 percent", () => {
  const padded = expandPriceScale(100, 110, "logarithmic");
  const yHigh = priceToY(110, padded, 0, 100, "logarithmic");
  const yLow = priceToY(100, padded, 0, 100, "logarithmic");
  assert.ok(Math.abs(yHigh - 12) < 0.2);
  assert.ok(Math.abs(yLow - 88) < 0.2);
});

test("price-axis zoom keeps the grabbed price in place", () => {
  const padded = expandPriceScale(100, 110, "logarithmic");
  const ratio = 0.4;
  const price = 104;
  const next = zoomPriceScale(padded, price, ratio, 2, "logarithmic");
  const y = priceToY(price, next, 0, 100, "logarithmic");
  assert.ok(Math.abs(y - 40) < 0.001);
});

test("live RSI matches the terminal formula and only the last point changes", () => {
  const candles = [];
  let price = 100;
  for (let i = 0; i < 40; i++) {
    price += (i % 5) - 2;
    candles.push({
      time: i * 60,
      close: price
    });
  }
  const state = rollRsi(candles, 14);
  const expected = alignRsiWithCandleTimes(
    candles,
    calculateRSI(candles, 14),
    14
  );
  assert.deepEqual(
    state.points.map(point => point.value),
    expected.map(point => point.value)
  );
  const before = state.points[38].value;
  candles[39] = { ...candles[39], close: candles[39].close + 3 };
  rsiReplaceLast(state, candles);
  const again = rollRsi(candles, 14);
  assert.equal(state.points[38].value, before);
  assert.equal(state.points[39].value, again.points[39].value);
});

test("a non-positive wick does not pull the price scale through zero", () => {
  const candles = [
    { low: 120, high: 180 },
    { low: 0, high: 1600 },
    { low: 90, high: 140 },
    { low: -5, high: 200 }
  ];
  const range = scaleFromCandles(candles, 0, 3, 0);
  assert.equal(range.min, 90);
  assert.equal(range.max, 1600);
});

test("price padding keeps a one-tick move on the live path", () => {
  const candles = [
    { low: 100, high: 110 },
    { low: 101, high: 109 }
  ];
  const padded = scaleFromCandles(candles, 0, 1, 0.08);
  const prev = {
    time: 1,
    open: 104,
    high: 110,
    low: 100,
    close: 108
  };
  const next = { ...prev, close: 108.1, high: 110.2 };
  assert.equal(liveUpdateKind(prev, next, padded), "live");
  assert.ok(next.high < padded.max);
});
