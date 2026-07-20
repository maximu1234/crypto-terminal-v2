import test from "node:test";
import assert from "node:assert/strict";

import {
resolvePartialTpTrade,
computePartialTpTradeStats
} from "../js/algo-trading/pattern-trade-stats-partial.js";

function c(
time,
o,
h,
l,
close
){

return {
time,
open:
o,
high:
h,
low:
l,
close
};

}

test(
"partial: TP1 then SL reduces remaining risk",
()=>{

// entry 110, pt3 100 → X=10, SL 50% → 105, riskDist=5
// TP1 = 110+10*1 = 120 → reward/risk = 2
// Close 1/3 at TP1: +1/3 * 1 * 2 = +0.666...
// Remaining 2/3 hits SL: -2/3
// net ≈ 0
const candles =
[
c(
1,
100,
100,
100,
100
),
c(
2,
110,
110,
109,
110
),
c(
3,
110,
121,
109,
120
),
c(
4,
110,
111,
104,
105
)
];

const trade =
resolvePartialTpTrade(
candles,
{
type:
"entry",
side:
"long",
bar:
1,
price:
110,
pt3:
100,
pt4:
110
},
{
slPctOfX:
50,
riskUsd:
1,
tp1X:
1,
tp2X:
1.25,
tp3X:
1.44
}
);

assert.equal(
trade.status,
"closed"
);
assert.equal(
trade.tpsHit,
1
);
assert.ok(
Math.abs(
trade.profitUsd -
2 /
3
) <
1e-9
);
assert.ok(
Math.abs(
trade.lossUsd -
2 /
3
) <
1e-9
);
assert.ok(
Math.abs(
trade.netUsd
) <
1e-9
);

}
);

test(
"partial: all three TPs = full profit",
()=>{

const candles =
[
c(
1,
100,
100,
100,
100
),
c(
2,
110,
110,
109,
110
),
c(
3,
110,
125,
109,
124
)
];

const trade =
resolvePartialTpTrade(
candles,
{
type:
"entry",
side:
"long",
bar:
1,
price:
110,
pt3:
100,
pt4:
110
},
{
slPctOfX:
50,
riskUsd:
1,
tp1X:
1,
tp2X:
1.25,
tp3X:
1.44
}
);

assert.equal(
trade.status,
"closed"
);
assert.equal(
trade.tpsHit,
3
);
assert.equal(
trade.lossUsd,
0
);
assert.ok(
trade.profitUsd >
0
);
assert.ok(
trade.netUsd >
0
);

}
);

test(
"partial stats aggregate",
()=>{

const stats =
computePartialTpTradeStats(
[],
[],
{
riskUsd:
1
}
);

assert.equal(
stats.wins,
0
);
assert.equal(
stats.netUsd,
0
);

}
);


test(
"partial Y: span uses |pt1-pt2| not X",
()=>{

// Y = |100-80| = 20; X would be |110-100| = 10
// entry 110, SL 50% of X → 105, riskDist=5
// TP1 = 110 + 20*1 = 130
// candle high 131 → hit TP1 only (not enough for TP2=135)
const candles =
[
c(
1,
100,
100,
100,
100
),
c(
2,
110,
110,
109,
110
),
c(
3,
110,
131,
109,
130
)
];

const tradeY =
resolvePartialTpTrade(
candles,
{
type:
"entry",
side:
"long",
bar:
1,
price:
110,
pt1:
80,
pt2:
100,
pt3:
100,
pt4:
110
},
{
span:
"y",
slPctOfX:
50,
riskUsd:
1,
tp1Y:
1,
tp2Y:
1.25,
tp3Y:
1.44
}
);

const tradeX =
resolvePartialTpTrade(
candles,
{
type:
"entry",
side:
"long",
bar:
1,
price:
110,
pt1:
80,
pt2:
100,
pt3:
100,
pt4:
110
},
{
span:
"x",
slPctOfX:
50,
riskUsd:
1,
tp1X:
1,
tp2X:
1.25,
tp3X:
1.44
}
);

assert.equal(
tradeY.status,
"open"
);
assert.equal(
tradeY.tpsHit,
1
);
assert.ok(
Math.abs(
tradeY.profitUsd -
(
1 /
3
) *
(
20 /
5
)
) <
1e-9
);

// X TP1 = 110+10 = 120 → same candle also hits TP1 (and TP2=122.5, TP3=124.4)
assert.equal(
tradeX.tpsHit,
3
);
assert.equal(
tradeX.status,
"closed"
);

}
);
