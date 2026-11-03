import test from "node:test";
import assert from "node:assert/strict";

import {
  hitTradeLevel,
  sampleTradeLevels
} from "../js/canvas-bench/trade-levels.js";

test("sample levels include a position and both order sides", () => {
  const candles = [];
  for (let i = 0; i < 50; i++) {
    candles.push({
      time: i * 60,
      high: 110 + i * 0.1,
      low: 90 + i * 0.1,
      close: 100 + i * 0.1
    });
  }
  const kinds = sampleTradeLevels(candles).map(level => level.kind);
  const sides = sampleTradeLevels(candles).map(level => level.side);
  assert.deepEqual(kinds, ["entry", "tp", "sl", "order", "order"]);
  assert.ok(sides.includes("long"));
  assert.ok(sides.includes("short"));
});

test("a level stays on its price while the chart scrolls", () => {
  const yOf = price => 500 - price;
  const price = 100;
  assert.equal(yOf(price), yOf(price));
  assert.equal(
    hitTradeLevel({ price }, yOf(price), yOf(price) + 3, 6),
    true
  );
  assert.equal(
    hitTradeLevel({ price }, yOf(price), yOf(price) + 20, 6),
    false
  );
});
