import test from "node:test";
import assert from "node:assert/strict";

import {
isBingxTickerOpen24Reliable,
parseBingxPercentField,
resolveBingxChange24Percent
} from "../js/tickers.js";

test(
"parseBingxPercentField strips percent sign",
()=>{
assert.equal(
parseBingxPercentField(
"-1.63%"
),
-1.63
);
assert.equal(
parseBingxPercentField(
"1.29"
),
1.29
);
}
);

test(
"isBingxTickerOpen24Reliable: short window is unreliable",
()=>{
const now =
Date.now();

assert.equal(
isBingxTickerOpen24Reliable({
openTime:
now -
5 *
60 *
1000,
closeTime:
now
}),
false
);
}
);

test(
"isBingxTickerOpen24Reliable: 24h window is reliable",
()=>{
const now =
Date.now();

assert.equal(
isBingxTickerOpen24Reliable({
openTime:
now -
24 *
60 *
60 *
1000,
closeTime:
now
}),
true
);
}
);

test(
"resolveBingxChange24Percent: prefers reliable swap over spot",
()=>{
const now =
Date.now();

assert.ok(
Math.abs(
resolveBingxChange24Percent(
{
openPrice:
"100",
lastPrice:
"110",
priceChangePercent:
"0.00",
openTime:
now -
24 *
60 *
60 *
1000,
closeTime:
now
},
-1.49
) -
10
) <
0.05
);
}
);

test(
"resolveBingxChange24Percent: spot fallback only when swap window broken",
()=>{
const now =
Date.now();

assert.equal(
resolveBingxChange24Percent(
{
openPrice:
"64025.2",
lastPrice:
"64025.2",
priceChangePercent:
"0.00",
openTime:
now -
3 *
60 *
1000,
closeTime:
now
},
-1.49
),
-1.49
);
}
);

test(
"resolveBingxChange24Percent: ignores short-window swap open without spot",
()=>{
const now =
Date.now();

assert.equal(
resolveBingxChange24Percent({
openPrice:
"64025.2",
lastPrice:
"64025.2",
priceChangePercent:
"0.00",
openTime:
now -
3 *
60 *
1000,
closeTime:
now
}),
0
);
}
);

test(
"resolveBingxChange24Percent: from open and last when swap window reliable",
()=>{
const now =
Date.now();

assert.ok(
Math.abs(
resolveBingxChange24Percent({
openPrice:
"408.59",
lastPrice:
"399.74",
openTime:
now -
24 *
60 *
60 *
1000,
closeTime:
now
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
"1399350000.00",
openTime:
Date.now() -
24 *
60 *
60 *
1000,
closeTime:
Date.now()
}),
0
);
}
);
