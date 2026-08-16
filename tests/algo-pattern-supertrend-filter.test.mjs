import test from "node:test";
import assert from "node:assert/strict";

import {
  filterEntryEventsBySupertrend
} from "../js/algo-trading/pattern-supertrend-filter.js";

function risingCandles(count = 40){
  return Array.from({ length: count }, (_, index) => {
    const close = 100 + index;
    return {
      time: 1_700_000_000 + index * 60,
      open: close - 0.5,
      high: close + 1,
      low: close - 1,
      close,
      volume: 1
    };
  });
}

test("Supertrend book criteria allow long and reject short in an uptrend", () => {
  const candles = risingCandles();
  const bar = candles.length - 1;
  const events = [
    { type: "entry", side: "long", bar, price: candles[bar].close },
    { type: "entry", side: "short", bar, price: candles[bar].close }
  ];

  const filtered = filterEntryEventsBySupertrend(candles, events, {
    chartTf: "1",
    supertrendLongFilter: true,
    supertrendLongAtr: 3,
    supertrendLongFactor: 1,
    supertrendLongTf: "",
    supertrendShortFilter: true,
    supertrendShortAtr: 3,
    supertrendShortFactor: 1,
    supertrendShortTf: ""
  });

  assert.deepEqual(filtered.map(event => event.side), ["long"]);
});

test("disabled Supertrend criteria preserve entries", () => {
  const candles = risingCandles();
  const events = [
    { type: "entry", side: "long", bar: 39, price: 139 },
    { type: "entry", side: "short", bar: 39, price: 139 }
  ];

  assert.equal(
    filterEntryEventsBySupertrend(candles, events, {
      supertrendLongFilter: false,
      supertrendShortFilter: false
    }),
    events
  );
});
