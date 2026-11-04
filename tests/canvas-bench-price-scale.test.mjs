import test from "node:test";
import assert from "node:assert/strict";

import {
PRICE_SCALE_LOG,
PRICE_SCALE_REGULAR,
shiftPriceScale
} from "../js/canvas-bench/price-scale.js";

test("pulling the plot down shifts a linear price window up", ()=>{

const next = shiftPriceScale(
{ min: 100, max: 200 },
50,
100,
PRICE_SCALE_REGULAR
);

assert.equal(next.min, 150);
assert.equal(next.max, 250);
assert.equal(next.max - next.min, 100);

});

test("pulling the plot down shifts a log price window without changing the ratio", ()=>{

const next = shiftPriceScale(
{ min: 100, max: 200 },
50,
100,
PRICE_SCALE_LOG
);

assert.ok(next.min > 100);
assert.ok(next.max > 200);
assert.ok(Math.abs(next.max / next.min - 2) < 1e-9);

});
