import test from "node:test";
import assert from "node:assert/strict";

import {
countPattern12Setups
} from "../js/algo-trading/pattern-stats.js";

test("countPattern12Setups returns zeros for empty candles", () => {
  assert.deepEqual(countPattern12Setups([]), {
    long: 0,
    short: 0,
    total: 0
  });
});

test("countPattern12Setups returns zeros for short series", () => {
  const candles = [
    { time: 1, open: 1, high: 2, low: 0.5, close: 1.5 },
    { time: 2, open: 1.5, high: 2.5, low: 1, close: 2 }
  ];
  assert.deepEqual(countPattern12Setups(candles), {
    long: 0,
    short: 0,
    total: 0
  });
});
