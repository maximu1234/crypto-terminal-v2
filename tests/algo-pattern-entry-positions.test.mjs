import test from "node:test";
import assert from "node:assert/strict";

import {
buildAlgoEntryPositionShape,
computeAlgoStopLoss,
computeAlgoTakeProfit,
interpolateLogPrice,
ALGO_PATTERN_ENTRY_FLAG
} from "../js/algo-trading/pattern-entry-positions.js";

function c(
time,
close =
100
){

return {
time,
open:
close,
high:
close +
1,
low:
close -
1,
close
};

}

function approx(
actual,
expected,
eps =
1e-9
){

assert.ok(
Number.isFinite(
actual
),
`expected finite, got ${actual}`
);
assert.ok(
Math.abs(
actual -
expected
) <=
eps,
`expected ~${expected}, got ${actual}`
);

}

test(
"computeAlgoStopLoss long 50% is log midpoint",
()=>{

approx(
computeAlgoStopLoss(
"long",
100,
110,
50
),
interpolateLogPrice(
110,
100,
0.5
)
);

}
);

test(
"computeAlgoStopLoss short 50% is log midpoint",
()=>{

approx(
computeAlgoStopLoss(
"short",
110,
100,
50
),
interpolateLogPrice(
100,
110,
0.5
)
);

}
);

test(
"computeAlgoStopLoss 100% lands on pt3",
()=>{

approx(
computeAlgoStopLoss(
"long",
100,
110,
100
),
100
);
approx(
computeAlgoStopLoss(
"short",
110,
100,
100
),
110
);

}
);

test(
"computeAlgoTakeProfit long 1:2 is log RR from entry/SL",
()=>{

const entry =
110;
const sl =
105;
const rr =
2;
const expected =
entry *
Math.pow(
entry /
sl,
rr
);

approx(
computeAlgoTakeProfit(
"long",
entry,
sl,
rr
),
expected
);

}
);

test(
"computeAlgoTakeProfit short 1:2 is log RR from entry/SL",
()=>{

const entry =
100;
const sl =
105;
const rr =
2;
const expected =
entry /
Math.pow(
sl /
entry,
rr
);

approx(
computeAlgoTakeProfit(
"short",
entry,
sl,
rr
),
expected
);

}
);

test(
"buildAlgoEntryPositionShape uses log SL and log RR TP",
()=>{

const candles =
Array.from(
{
length:
20
},
(
_,
i
)=>
c(
1_000 +
i *
60,
100
)
);

const shape =
buildAlgoEntryPositionShape(
{
type:
"entry",
side:
"long",
bar:
5,
price:
110,
setupBar:
3,
pt3:
100,
pt4:
110
},
candles,
{
slPctOfX:
50,
tpRr:
2
}
);

const sl =
interpolateLogPrice(
110,
100,
0.5
);
const tp =
110 *
Math.pow(
110 /
sl,
2
);

approx(
shape.slPrice,
sl
);
approx(
shape.tpPrice,
tp
);
assert.equal(
shape.p1.price,
110
);
assert.equal(
shape[
ALGO_PATTERN_ENTRY_FLAG
],
true
);

}
);

test(
"buildAlgoEntryPositionShape skips cancel events",
()=>{

assert.equal(
buildAlgoEntryPositionShape(
{
type:
"cancel",
side:
"long",
bar:
5,
price:
107
},
[
c(
1
)
]
),
null
);

}
);
