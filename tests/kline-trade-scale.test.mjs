import test from "node:test";
import assert from "node:assert/strict";
import {
  alignCandlesToTradePrice,
  applyLiveLastPriceToCandles,
  applyLiveOhlcBar,
  integerPriceScale,
  rebaseMergedCandles
} from "../js/chart/live-bar-roll.js";

function bar(time, close, high = close + 1, low = close - 1) {
  return { time, open: close, high, low, close, volume: 10 };
}

test("integer scale accepts a contract multiplier and rejects a real pump", () => {
  assert.equal(integerPriceScale(437.78 / 145.92), 3);
  assert.equal(integerPriceScale(2.79), 1);
  assert.equal(integerPriceScale(1.02), 1);
  assert.equal(integerPriceScale(1 / 3.001), 1 / 3);
});

test("SOXX history moves onto the trade scale instead of growing one wick", () => {
  const candles = [
    bar(1, 150, 160, 146),
    bar(2, 180, 198.83, 170),
    bar(3, 145.92, 148, 145.92)
  ];

  assert.equal(alignCandlesToTradePrice(candles, 437.78), true);
  assert.ok(Math.abs(candles[2].close - 145.92 * 3) < 1e-9);
  assert.ok(Math.abs(candles[1].high - 198.83 * 3) < 1e-9);
  assert.equal(candles[0].volume, 10);
  assert.equal(alignCandlesToTradePrice(candles, 437.78), false);

  const painted = applyLiveLastPriceToCandles(candles, 437.78, 14400, 3);
  assert.equal(painted.scaled, false);
  assert.ok(candles[2].high < 600);
  assert.ok(candles[2].low > 400);
});

test("a later kline still on the old scale is multiplied before it is merged", () => {
  const candles = [
    bar(1, 150),
    bar(2, 160),
    bar(3, 155),
    bar(4, 145.92)
  ];
  assert.equal(alignCandlesToTradePrice(candles, 437.78), true);

  const kind = applyLiveOhlcBar(candles, {
    time: 4,
    open: 145.92,
    high: 146,
    low: 145.9,
    close: 145.92,
    volume: 3
  });

  assert.equal(kind, "last");
  assert.ok(Math.abs(candles[3].close - 145.92 * 3) < 1e-6);
  assert.ok(Math.abs(candles[3].high - 146 * 3) < 1e-6);
  assert.equal(candles[3].volume, 3);
});

test("a kline that already matches the trade scale is left alone", () => {
  const candles = [
    bar(1, 150),
    bar(2, 160),
    bar(3, 155),
    bar(4, 145.92)
  ];
  alignCandlesToTradePrice(candles, 437.78);

  applyLiveOhlcBar(candles, {
    time: 4,
    open: 437.5,
    high: 438,
    low: 437,
    close: 437.78,
    volume: 1
  });

  assert.ok(Math.abs(candles[3].close - 437.78) < 1e-9);
  assert.ok(candles[3].high < 500);
});

test("older history pages pick up the same multiplier", () => {
  const current = [
    bar(3, 150),
    bar(4, 155),
    bar(5, 148),
    bar(6, 145.92)
  ];
  alignCandlesToTradePrice(current, 437.78);
  const older = [bar(1, 184), bar(2, 190)];
  const merged = rebaseMergedCandles(current, [...older, ...current]);

  assert.ok(Math.abs(merged[0].close - 184 * 3) < 1e-9);
  assert.ok(Math.abs(merged[5].close - 145.92 * 3) < 1e-6);
});

test("a series that already spans the jump is not rescaled", () => {
  const candles = [
    bar(1, 100, 110, 90),
    bar(2, 140, 150, 120),
    bar(3, 220, 260, 180),
    bar(4, 100, 120, 90)
  ];
  assert.equal(alignCandlesToTradePrice(candles, 300), false);
  assert.equal(candles[3].close, 100);
});
