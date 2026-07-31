import test from "node:test";
import assert from "node:assert/strict";

import {
filterEntryEventsByEma,
buildAlgoEmaByBar,
clampAlgoEmaPeriod,
clampAlgoEmaShift,
normalizeAlgoEmaTf,
collectActiveAlgoEmaLines,
isAlgoEmaEntryValid,
DEFAULT_ALGO_EMA_PERIOD,
DEFAULT_ALGO_EMA_PERIOD_2,
DEFAULT_ALGO_EMA_SHIFT,
MAX_ALGO_EMA_PERIOD
} from "../js/algo-trading/pattern-ema-filter.js";

import {
aggregateCandlesToTf
} from "../js/indicators/htf-loader.js";

const PERIOD =
200;

const PERIOD_2 =
50;

function flatCandles(
count,
level =
100,
stepSec =
60
){

const rows =
[];

for(
let i =
0;
i <
count;
i++
){
rows.push(
{
time:
(i + 1) *
stepSec,
open:
level,
high:
level +
1,
low:
level -
1,
close:
level
}
);
}

return rows;

}

function steppedCandles(){

const rows =
flatCandles(
400,
100
);

for(
let i =
340;
i <
400;
i++
){
rows[
i
].open =
110;
rows[
i
].high =
111;
rows[
i
].low =
109;
rows[
i
].close =
110;
}

return rows;

}

function entry(
side,
bar,
price
){

return {
type:
"entry",
side,
bar,
price,
setupBar:
bar -
2,
pt3:
90,
pt4:
price
};

}

test(
"filter off: events pass through untouched",
()=>{

const out =
filterEntryEventsByEma(
flatCandles(
250
),
[
entry(
"long",
240,
99
)
],
{
emaFilter:
false
}
);

assert.equal(
out.length,
1
);

}
);

test(
"long: kept above EMA, dropped below",
()=>{

const rows =
flatCandles(
250
);
const out =
filterEntryEventsByEma(
rows,
[
entry(
"long",
240,
101
),
entry(
"long",
241,
99
)
],
{
emaFilter:
true,
emaPeriod:
PERIOD,
emaShift:
0
}
);

assert.equal(
out.length,
1
);
assert.equal(
out[
0
].bar,
240
);

}
);

test(
"short: kept below EMA, dropped above",
()=>{

const rows =
flatCandles(
250
);
const out =
filterEntryEventsByEma(
rows,
[
entry(
"short",
240,
99
),
entry(
"short",
241,
101
)
],
{
emaFilter:
true,
emaPeriod:
PERIOD,
emaShift:
0
}
);

assert.equal(
out.length,
1
);
assert.equal(
out[
0
].bar,
240
);

}
);

test(
"positive shift raises the line — long needs higher entry",
()=>{

const rows =
flatCandles(
250
);
const events =
[
entry(
"long",
240,
105
)
];

const plain =
filterEntryEventsByEma(
rows,
events,
{
emaFilter:
true,
emaPeriod:
PERIOD,
emaShift:
0
}
);
const shifted =
filterEntryEventsByEma(
rows,
events,
{
emaFilter:
true,
emaPeriod:
PERIOD,
emaShift:
10
}
);

assert.equal(
plain.length,
1
);
assert.equal(
shifted.length,
0
);

}
);

test(
"negative shift lowers the line — long at 95 becomes valid",
()=>{

const rows =
flatCandles(
250
);
const events =
[
entry(
"long",
240,
95
)
];

const plain =
filterEntryEventsByEma(
rows,
events,
{
emaFilter:
true,
emaPeriod:
PERIOD,
emaShift:
0
}
);
const shifted =
filterEntryEventsByEma(
rows,
events,
{
emaFilter:
true,
emaPeriod:
PERIOD,
emaShift:
-10
}
);

assert.equal(
plain.length,
0
);
assert.equal(
shifted.length,
1
);

}
);

test(
"price exactly at EMA is invalid for both sides",
()=>{

assert.equal(
isAlgoEmaEntryValid(
"long",
100,
100
),
false
);
assert.equal(
isAlgoEmaEntryValid(
"short",
100,
100
),
false
);

}
);

test(
"cancel events are never filtered",
()=>{

const out =
filterEntryEventsByEma(
flatCandles(
250
),
[
{
type:
"cancel",
side:
"long",
bar:
240,
price:
90,
reason:
"below_pt3"
},
entry(
"long",
241,
99
)
],
{
emaFilter:
true,
emaPeriod:
PERIOD
}
);

assert.equal(
out.length,
1
);
assert.equal(
out[
0
].type,
"cancel"
);

}
);

test(
"history shorter than period: entries dropped, cancels kept",
()=>{

const out =
filterEntryEventsByEma(
flatCandles(
100
),
[
entry(
"long",
90,
101
),
{
type:
"cancel",
side:
"short",
bar:
92,
price:
120,
reason:
"above_pt3"
}
],
{
emaFilter:
true,
emaPeriod:
PERIOD
}
);

assert.equal(
out.length,
1
);
assert.equal(
out[
0
].type,
"cancel"
);

}
);

test(
"both filters on: long must clear both EMAs",
()=>{

const rows =
steppedCandles();
const out =
filterEntryEventsByEma(
rows,
[
entry(
"long",
399,
112
),
entry(
"long",
399,
106
),
entry(
"long",
399,
101
)
],
{
emaFilter:
true,
emaPeriod:
PERIOD,
emaFilter2:
true,
emaPeriod2:
PERIOD_2
}
);

assert.equal(
out.length,
1
);
assert.equal(
out[
0
].price,
112
);

}
);

test(
"second filter alone works without the first",
()=>{

const rows =
steppedCandles();
const out =
filterEntryEventsByEma(
rows,
[
entry(
"long",
399,
112
),
entry(
"long",
399,
106
)
],
{
emaFilter:
false,
emaFilter2:
true,
emaPeriod2:
PERIOD_2
}
);

assert.equal(
out.length,
1
);
assert.equal(
out[
0
].price,
112
);

}
);

test(
"active lines: collected per checkbox, duplicates dropped",
()=>{

assert.deepEqual(
collectActiveAlgoEmaLines(
{}
),
[]
);
assert.deepEqual(
collectActiveAlgoEmaLines(
{
emaFilter:
true,
emaPeriod:
200,
emaShift:
-12,
emaTf:
"D"
}
),
[
{
period:
200,
shift:
-12,
tf:
"D"
}
]
);
assert.deepEqual(
collectActiveAlgoEmaLines(
{
emaFilter:
true,
emaPeriod:
200,
emaFilter2:
true,
emaPeriod2:
200,
emaShift:
0,
emaShift2:
0
}
),
[
{
period:
200,
shift:
0,
tf:
""
}
]
);

}
);

test(
"shift/tf/period clamps and defaults",
()=>{

assert.equal(
clampAlgoEmaPeriod(
"abc"
),
DEFAULT_ALGO_EMA_PERIOD
);
assert.equal(
clampAlgoEmaPeriod(
99999
),
MAX_ALGO_EMA_PERIOD
);
assert.equal(
clampAlgoEmaShift(
"x"
),
DEFAULT_ALGO_EMA_SHIFT
);
assert.equal(
clampAlgoEmaShift(
-200
),
-99
);
assert.equal(
normalizeAlgoEmaTf(
"D"
),
"D"
);
assert.equal(
normalizeAlgoEmaTf(
"weird"
),
""
);
assert.equal(
DEFAULT_ALGO_EMA_PERIOD_2,
50
);

}
);

test(
"aggregateCandlesToTf: 1m → 5m without network",
()=>{

const rows =
flatCandles(
20,
100,
60
);
const htf =
aggregateCandlesToTf(
rows,
"5",
"1"
);

assert.ok(
htf.length <
rows.length
);
assert.ok(
htf.length >=
3
);
assert.equal(
htf[
0
].close,
100
);

}
);

test(
"HTF source: Daily EMA from 1m chart candles",
()=>{

/* 300 days of 1h bars ≈ enough for EMA(50) on Daily after aggregate. */
const rows =
flatCandles(
300 *
24,
100,
3600
);
const ema =
buildAlgoEmaByBar(
rows,
{
period:
50,
shift:
0,
tf:
"D",
chartTf:
"60"
}
);

assert.equal(
ema.length,
rows.length
);
assert.equal(
Number.isNaN(
ema[
ema.length -
1
]
),
false
);
assert.ok(
Math.abs(
ema[
ema.length -
1
] -
100
) <
1e-6
);

}
);

test(
"non-finite inputs are invalid for both sides",
()=>{

assert.equal(
isAlgoEmaEntryValid(
"long",
Number.NaN,
100
),
false
);
assert.equal(
isAlgoEmaEntryValid(
"short",
100,
Number.NaN
),
false
);

}
);
