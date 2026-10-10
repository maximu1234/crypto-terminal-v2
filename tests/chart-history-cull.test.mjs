import test from "node:test";
import assert from "node:assert/strict";

import {
packCandles,
unpackCandles
} from "../js/candle-columns.js";

import {
putHistoryCache,
peekHistoryCache,
mergeCandleRows,
logicalIndexShift,
historyCacheKey
} from "../js/market-history-cache.js";

import {
shapeMissesViewport
} from "../js/drawings/draw-viewport-cull.js";

test("packCandles round-trips OHLC", ()=>{

const rows = [
{ time: 10, open: 1, high: 2, low: 0.5, close: 1.5, volume: 8 },
{ time: 20, open: 1.5, high: 3, low: 1, close: 2, volume: 0 }
];
const packed = packCandles(rows);
const back = unpackCandles(packed, rows.length);

assert.deepEqual(back, rows);

});

test("history cache returns a later put and merges the live tail", ()=>{

const key = historyCacheKey("bybit", "btcusdt", "15");
assert.equal(key, "bybit|BTCUSDT|15");

putHistoryCache("bybit", "BTCUSDT", "15", [
{ time: 1, open: 1, high: 1, low: 1, close: 1, volume: 1 },
{ time: 2, open: 2, high: 2, low: 2, close: 2, volume: 1 }
], { coversVisible: true });

const hit = peekHistoryCache("Bybit", "btcusdt", "15");
assert.equal(hit.coversVisible, true);
assert.equal(hit.candles.length, 2);

const merged = mergeCandleRows(hit.candles, [
{ time: 2, open: 2, high: 4, low: 2, close: 3, volume: 5 },
{ time: 3, open: 3, high: 3, low: 3, close: 3, volume: 1 }
], { preferIncoming: true, limit: 3 });

assert.equal(merged.at(-1).time, 3);
assert.equal(merged[1].close, 3);
assert.equal(logicalIndexShift(hit.candles, merged), 0);

const older = mergeCandleRows(merged, [
{ time: 0, open: 1, high: 1, low: 1, close: 1, volume: 1 }
]);
assert.equal(logicalIndexShift(merged, older), 1);

const trimmed = mergeCandleRows(older, [
{ time: 4, open: 1, high: 1, low: 1, close: 1, volume: 1 }
], { preferIncoming: true, limit: older.length });
assert.equal(trimmed[0].time, 1);
assert.equal(logicalIndexShift(older, trimmed), -1);

});

test("drawings outside the visible window are skipped", ()=>{

const view = {
timeFrom: 100,
timeTo: 200,
priceFrom: 10,
priceTo: 20
};

assert.equal(shapeMissesViewport({
type: "trendline",
p1: { time: 10, price: 12 },
p2: { time: 20, price: 14 }
}, view), true);

assert.equal(shapeMissesViewport({
type: "trendline",
p1: { time: 90, price: 12 },
p2: { time: 150, price: 18 }
}, view), false);

assert.equal(shapeMissesViewport({
type: "hline",
time: 1,
price: 15
}, view), false);

assert.equal(shapeMissesViewport({
type: "hline",
time: 150,
price: 80
}, view), true);

assert.equal(shapeMissesViewport({
type: "hray",
time: 250,
price: 15
}, view), true);

assert.equal(shapeMissesViewport({
type: "hray",
time: 50,
price: 15
}, view), false);

assert.equal(shapeMissesViewport({
type: "mystery"
}, view), false);

});
