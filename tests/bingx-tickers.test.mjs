import test from "node:test";
import assert from "node:assert/strict";

import {
resolveBingxChange24Percent
} from "../js/tickers.js";

test(
"resolveBingxChange24Percent: from open and last",
()=>{
assert.ok(
Math.abs(
resolveBingxChange24Percent({
openPrice:
"408.59",
lastPrice:
"399.74"
}) +
2.17
) <
0.05
);
}
);

test(
"resolveBingxChange24Percent: ignores garbage pct when open is zero",
()=>{
assert.equal(
resolveBingxChange24Percent({
openPrice:
"0.00",
lastPrice:
"139.94",
priceChange:
"139.94",
priceChangePercent:
"1399350000.00"
}),
0
);
}
);

test(
"resolveBingxChange24Percent: uses sane API percent",
()=>{
assert.equal(
resolveBingxChange24Percent({
priceChangePercent:
"-2.17"
}),
-2.17
);
}
);

test(
"resolveBingxChange24Percent: derives from priceChange and last",
()=>{
assert.ok(
Math.abs(
resolveBingxChange24Percent({
lastPrice:
"399.74",
priceChange:
"-8.85"
}) +
2.17
) <
0.05
);
}
);
