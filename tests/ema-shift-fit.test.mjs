import test from "node:test";
import assert from "node:assert/strict";
import {
findPivotHighs,
findPivotLows,
fitEmaShiftToLowerExtremes,
fitEmaShiftToUpperExtremes,
normalizeEmaShiftFitLookback
} from "../js/indicators/ema-shift-fit.js";

test("normalizeEmaShiftFitLookback accepts only 500/1000/2000", () => {
  assert.equal(normalizeEmaShiftFitLookback(500), 500);
  assert.equal(normalizeEmaShiftFitLookback(1000), 1000);
  assert.equal(normalizeEmaShiftFitLookback(2000), 2000);
  assert.equal(normalizeEmaShiftFitLookback(777), 1000);
});

test("findPivotLows marks local minima", () => {
  const candles = [
    { time: 1, low: 10 },
    { time: 2, low: 9 },
    { time: 3, low: 8 },
    { time: 4, low: 7 },
    { time: 5, low: 8 },
    { time: 6, low: 9 },
    { time: 7, low: 10 },
    { time: 8, low: 9 },
    { time: 9, low: 8 },
    { time: 10, low: 6 },
    { time: 11, low: 8 },
    { time: 12, low: 9 },
    { time: 13, low: 10 }
  ];
  const pivots = findPivotLows(candles);
  const lows = pivots.map((p) => p.low);
  assert.ok(lows.includes(7));
  assert.ok(lows.includes(6));
});

test("findPivotHighs marks local maxima", () => {
  const candles = [
    { time: 1, high: 10 },
    { time: 2, high: 11 },
    { time: 3, high: 12 },
    { time: 4, high: 14 },
    { time: 5, high: 12 },
    { time: 6, high: 11 },
    { time: 7, high: 10 },
    { time: 8, high: 11 },
    { time: 9, high: 13 },
    { time: 10, high: 16 },
    { time: 11, high: 13 },
    { time: 12, high: 11 },
    { time: 13, high: 10 }
  ];
  const pivots = findPivotHighs(candles);
  const highs = pivots.map((p) => p.high);
  assert.ok(highs.includes(14));
  assert.ok(highs.includes(16));
});

function makeWaveCandles() {
  const candles = [];
  const price = 100;
  for (let i = 0; i < 400; i++) {
    const wave = Math.sin(i / 18) * 4;
    const drift = i * 0.02;
    const close = price + drift + wave;
    candles.push({
      time: 1_700_000_000 + i * 3600,
      open: close,
      high: close + 1.5 + Math.max(0, wave),
      low: close - 1.2 - Math.max(0, -wave),
      close
    });
  }
  return candles;
}

test("fitEmaShiftToLowerExtremes returns length and support shift", () => {
  const candles = makeWaveCandles();
  const fitted = fitEmaShiftToLowerExtremes({
    chartCandles: candles,
    sourceCandles: candles,
    lookback: 500,
    minLength: 14,
    maxLength: 80
  });

  assert.ok(fitted);
  assert.ok(fitted.length >= 14 && fitted.length <= 80);
  assert.equal(typeof fitted.shift, "number");
  assert.ok(fitted.pivotsUsed >= 2);
});

test("fitEmaShiftToUpperExtremes returns length and resistance shift", () => {
  const candles = makeWaveCandles();
  const fitted = fitEmaShiftToUpperExtremes({
    chartCandles: candles,
    sourceCandles: candles,
    lookback: 500,
    minLength: 14,
    maxLength: 80
  });

  assert.ok(fitted);
  assert.ok(fitted.length >= 14 && fitted.length <= 80);
  assert.equal(typeof fitted.shift, "number");
  assert.ok(fitted.pivotsUsed >= 2);
  assert.equal(fitted.side, "upper");
});
