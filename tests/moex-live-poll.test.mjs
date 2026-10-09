import test from "node:test";
import assert from "node:assert/strict";
import {
moexLastPriceBySymbol,
moexLiveCandle
} from "../js/moex-live-poll.js";

test("moex poll keeps the last price by SECID", () => {
  const prices = moexLastPriceBySymbol([
    { symbol: "sber", last: 320.5 },
    { symbol: "GAZP", last: 0 },
    { symbol: "", last: 10 }
  ]);
  assert.equal(prices.get("SBER"), 320.5);
  assert.equal(prices.has("GAZP"), false);
  assert.equal(prices.size, 1);
});

test("moex live candle asks the chart to merge the last bar", () => {
  const candle = moexLiveCandle(320.5, "1", 60_000);
  assert.equal(candle.time, 60);
  assert.equal(candle.close, 320.5);
  assert.equal(candle.mergeLast, true);
});
