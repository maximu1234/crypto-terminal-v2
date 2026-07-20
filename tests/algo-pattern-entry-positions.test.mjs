import test from "node:test";
import assert from "node:assert/strict";

import {
buildAlgoEntryPositionShape,
computeAlgoStopLoss,
computeAlgoTakeProfit,
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

test(
"computeAlgoStopLoss long 50% is midpoint",
()=>{

assert.equal(
computeAlgoStopLoss(
"long",
100,
110,
50
),
105
);

}
);

test(
"computeAlgoStopLoss short 50% is midpoint",
()=>{

assert.equal(
computeAlgoStopLoss(
"short",
110,
100,
50
),
105
);

}
);

test(
"computeAlgoStopLoss 100% lands on pt3",
()=>{

assert.equal(
computeAlgoStopLoss(
"long",
100,
110,
100
),
100
);
assert.equal(
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
"computeAlgoTakeProfit long 1:2 doubles risk",
()=>{

assert.equal(
computeAlgoTakeProfit(
"long",
110,
105,
2
),
120
);

}
);

test(
"computeAlgoTakeProfit short 1:2 doubles risk",
()=>{

assert.equal(
computeAlgoTakeProfit(
"short",
100,
105,
2
),
90
);

}
);

test(
"buildAlgoEntryPositionShape uses SL from pt3-pt4 and TP from RR",
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

assert.equal(
shape.slPrice,
105
);
assert.equal(
shape.tpPrice,
120
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
