import test from "node:test";
import assert from "node:assert/strict";

import {
  PRICE_SCALE_LOG,
  PRICE_SCALE_REGULAR,
  nicePriceTicks
} from "../js/canvas-bench/price-scale.js";

function pixelGaps(ticks, min, max, height, log) {
  const y = (price) => log
    ? (Math.log(max) - Math.log(price)) / (Math.log(max) - Math.log(min)) * height
    : (max - price) / (max - min) * height;
  const gaps = [];
  for (let i = 1; i < ticks.length; i++) {
    gaps.push(y(ticks[i]) - y(ticks[i - 1]));
  }
  return gaps;
}

test("log scales share one pixel density across cheap and expensive tickers", () => {
  const ether = nicePriceTicks(0.2, 2, 600, PRICE_SCALE_LOG);
  const sqqq = nicePriceTicks(30, 54, 600, PRICE_SCALE_LOG);
  const btc = nicePriceTicks(62000, 96000, 640, PRICE_SCALE_LOG);

  for (const [name, ticks, min, max, height] of [
    ["ether", ether, 0.2, 2, 600],
    ["sqqq", sqqq, 30, 54, 600],
    ["btc", btc, 62000, 96000, 640]
  ]) {
    const gaps = pixelGaps(ticks, min, max, height, true);
    assert.ok(ticks.length >= 10, name);
    for (const gap of gaps) {
      assert.ok(gap >= 24 && gap <= 80, `${name} gap ${gap}`);
    }
  }

  const etherStep = ether[0] - ether[1];
  assert.ok(etherStep <= 0.25);
  assert.equal(sqqq[0] - sqqq[1], 2);
  assert.equal(btc[0] - btc[1], 2000);
  for (let i = 2; i < 10; i++) {
    assert.equal(btc[i - 1] - btc[i], 2000);
  }
});

test("a wide btc range does not jump to a 10000 step", () => {
  const ticks = nicePriceTicks(60000, 140000, 640, PRICE_SCALE_LOG);
  assert.ok(ticks.length >= 12);
  const gaps = pixelGaps(ticks, 60000, 140000, 640, true);
  for (const gap of gaps) {
    assert.ok(gap >= 24 && gap <= 80, `gap ${gap}`);
  }
});

test("linear scale keeps equal price steps", () => {
  const ticks = nicePriceTicks(100, 400, 400, PRICE_SCALE_REGULAR);
  assert.ok(ticks.length >= 3);
  const step = ticks[1] - ticks[0];
  for (let i = 2; i < ticks.length; i++) {
    assert.ok(Math.abs(ticks[i] - ticks[i - 1] - step) < 1e-6);
  }
});
