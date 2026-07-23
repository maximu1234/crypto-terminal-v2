import test from "node:test";
import assert from "node:assert/strict";

import {
resolvePartialTpTrade,
computePartialTpTradeStats,
computePartialTpPrice
} from "../js/algo-trading/pattern-trade-stats-partial.js";

import {
computeAlgoStopLoss,
computeAlgoTakeProfit,
computeLogExtensionPrice,
interpolateLogPrice
} from "../js/algo-trading/pattern-entry-positions.js";

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
"log helpers: SL mid and St2/St3 extensions",
()=>{

assert.ok(
Math.abs(
interpolateLogPrice(
110,
100,
0.5
) -
Math.sqrt(
110 *
100
)
) <
1e-9
);

assert.ok(
Math.abs(
computeAlgoStopLoss(
"long",
100,
110,
50
) -
Math.sqrt(
110 *
100
)
) <
1e-9
);

// St2: pt4 * (pt4/pt3)^1
assert.ok(
Math.abs(
computePartialTpPrice(
"long",
110,
100,
110,
1
) -
110 *
(
110 /
100
)
) <
1e-9
);

// St3: pt2 * (pt2/pt1)^1
assert.ok(
Math.abs(
computeLogExtensionPrice(
"long",
100,
80,
100,
1
) -
100 *
(
100 /
80
)
) <
1e-9
);

const slMid =
Math.sqrt(
110 *
100
);
assert.ok(
Math.abs(
computeAlgoTakeProfit(
"long",
110,
slMid,
2
) -
(
110 +
2 *
(
110 -
slMid
)
)
) <
1e-6
);

}
);

test(
"partial: TP1 then SL reduces remaining risk (log levels)",
()=>{

const sl =
Math.sqrt(
110 *
100
);
const tp1 =
110 *
(
110 /
100
);
// tp1 ≈ 121

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
tp1 +
0.5,
109,
tp1
),
c(
4,
110,
111,
sl -
0.5,
sl
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
1.44,
trailSl:
false
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
trade.netUsd <
0.05
);

}
);

test(
"partial: all three TPs = full profit (log)",
()=>{

const tp3 =
110 *
Math.pow(
110 /
100,
1.44
);

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
tp3 +
1,
109,
tp3
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
1.44,
trailSl:
false
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
assert.ok(
trade.profitUsd >
0
);
assert.equal(
trade.lossUsd,
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
[]
);

assert.equal(
stats.closed,
0
);
assert.equal(
stats.netUsd,
0
);

}
);

test(
"partial Y: TPs from pt2 in log scale",
()=>{

const tp1 =
100 *
(
100 /
80
);
// 125

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
tp1 +
0.5,
109,
tp1
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
1.44,
trailSl:
false
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
tradeY.profitUsd >
0
);

}
);

test(
"partial stats: open and near-flat closed do not fill profit/loss totals",
()=>{

const entry =
110;
const pt3 =
100;
const pt4 =
110;
const sl =
Math.sqrt(
pt4 *
pt3
);
const tp1 =
entry *
(
pt4 /
pt3
);

const event =
{
type:
"entry",
side:
"long",
bar:
1,
price:
entry,
pt3,
pt4
};

const opts =
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
1.44,
trailSl:
false
};

/* TP1 then SL: log-RR давал net≈0; linear — ненулевой net, попадает в win/loss. */
const beCandles =
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
entry,
entry,
entry -
0.1,
entry
),
c(
3,
entry,
tp1 +
1,
sl -
0.5,
sl
)
];

const openCandles =
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
entry,
entry,
entry -
0.1,
entry
),
c(
3,
entry,
tp1 +
1,
entry -
0.1,
tp1
)
];

const beTrade =
resolvePartialTpTrade(
beCandles,
event,
opts
);
assert.equal(
beTrade.status,
"closed"
);
const expectedNet =
(
1 /
3
) *
1 *
Math.abs(
tp1 -
entry
) /
Math.abs(
entry -
sl
) -
(
2 /
3
) *
1;
assert.ok(
Math.abs(
beTrade.netUsd -
expectedNet
) <
1e-9
);

const beStats =
computePartialTpTradeStats(
beCandles,
[
event
],
opts
);
assert.equal(
beStats.longOpen,
0
);
assert.ok(
beStats.profitUsd +
beStats.lossUsd >
0
);
assert.ok(
Math.abs(
beStats.netUsd -
expectedNet
) <
1e-9
);

const openStats =
computePartialTpTradeStats(
openCandles,
[
event
],
opts
);
assert.equal(
openStats.longOpen,
1
);
assert.equal(
openStats.longWins,
0
);
assert.equal(
openStats.profitUsd,
0
);
assert.equal(
openStats.lossUsd,
0
);

}
);

test(
"partial USD uses linear RR vs initial SL (like exchange plaque)",
()=>{

const entry =
110;
const pt3 =
100;
const pt4 =
110;
const sl =
Math.sqrt(
pt4 *
pt3
);
const tp =
entry *
(
pt4 /
pt3
);
const expectedFull =
1 *
Math.abs(
tp -
entry
) /
Math.abs(
entry -
sl
);

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
entry,
entry,
entry -
0.1,
entry
),
c(
3,
entry,
tp +
1,
entry -
0.1,
tp
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
entry,
pt3,
pt4
},
{
slPctOfX:
50,
riskUsd:
1,
tp1X:
1,
tp2X:
1,
tp3X:
1,
trailSl:
false
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
assert.ok(
Math.abs(
trade.profitUsd -
expectedFull
) <
1e-9
);
assert.equal(
trade.lossUsd,
0
);

}
);
