import test from "node:test";
import assert from "node:assert/strict";

import {
computeAlgoTradeStats,
resolveAlgoTradeOutcome
} from "../js/algo-trading/pattern-trade-stats.js";

import {
computeAlgoStopLoss,
computeAlgoTakeProfit,
computeStopFillPrice,
linearUsdFromFill
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
"long win: TP before SL",
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
121,
109,
120
)
];

assert.equal(
resolveAlgoTradeOutcome(
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
tpRr:
2
}
),
"win"
);

}
);

test(
"long loss: SL before TP",
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
111,
104,
105
)
];

assert.equal(
resolveAlgoTradeOutcome(
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
tpRr:
2
}
),
"loss"
);

}
);

test(
"open if neither level hit",
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
112,
108,
111
)
];

assert.equal(
resolveAlgoTradeOutcome(
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
tpRr:
2
}
),
"open"
);

}
);

test(
"dollar pnl: win/loss use fill slip + 0.08% taker, qty from p4",
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
121,
109,
120
),
c(
4,
110,
110,
109,
110
),
c(
5,
110,
111,
104,
105
)
];

const eventWin =
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
};
const eventLoss =
{
type:
"entry",
side:
"long",
bar:
3,
price:
110,
pt3:
100,
pt4:
110
};
const opts =
{
slPctOfX:
50,
tpRr:
2,
riskUsd:
1
};
const sl =
computeAlgoStopLoss(
"long",
100,
110,
50
);
const tp =
computeAlgoTakeProfit(
"long",
110,
sl,
2
);
const fillWin =
computeStopFillPrice(
"long",
110,
candles[
1
]
);
const fillLoss =
computeStopFillPrice(
"long",
110,
candles[
3
]
);
const expectedWin =
linearUsdFromFill(
"long",
110,
fillWin,
tp,
sl,
1
);
const expectedLoss =
linearUsdFromFill(
"long",
110,
fillLoss,
sl,
sl,
1
);

const stats =
computeAlgoTradeStats(
candles,
[
eventWin,
eventLoss
],
opts
);

assert.equal(
stats.wins,
1
);
assert.equal(
stats.losses,
1
);
assert.ok(
expectedWin <
2
);
assert.ok(
-expectedLoss >
1
);
assert.ok(
Math.abs(
stats.profitUsd -
expectedWin
) <
1e-9
);
assert.ok(
Math.abs(
stats.lossUsd +
expectedLoss
) <
1e-9
);
assert.ok(
Math.abs(
stats.netUsd -
(
expectedWin +
expectedLoss
)
) <
1e-9
);

}
);


test(
"stats split net by side",
()=>{

const candles =
[
c(1, 100, 100, 100, 100),
c(2, 110, 110, 109, 110),
c(3, 110, 121, 109, 120),
c(4, 110, 111, 104, 105),
c(5, 90, 91, 89, 90),
c(6, 90, 91, 79, 80)
];

const stats =
computeAlgoTradeStats(
candles,
[
{
type: "entry",
side: "long",
bar: 1,
price: 110,
pt3: 100,
pt4: 110
},
{
type: "entry",
side: "short",
bar: 4,
price: 90,
pt3: 100,
pt4: 90
}
],
{
slPctOfX: 50,
tpRr: 2,
riskUsd: 1
}
);

assert.equal(stats.wins, 2);
assert.equal(stats.longWins, 1);
assert.equal(stats.shortWins, 1);
const longSl = computeAlgoStopLoss("long", 100, 110, 50);
const longTp = computeAlgoTakeProfit("long", 110, longSl, 2);
const longFill = computeStopFillPrice("long", 110, candles[1]);
const longNet = linearUsdFromFill("long", 110, longFill, longTp, longSl, 1);
const shortSl = computeAlgoStopLoss("short", 100, 90, 50);
const shortTp = computeAlgoTakeProfit("short", 90, shortSl, 2);
const shortFill = computeStopFillPrice("short", 90, candles[4]);
const shortNet = linearUsdFromFill("short", 90, shortFill, shortTp, shortSl, 1);
assert.ok(Math.abs(stats.longWinUsd - longNet) < 1e-9);
assert.ok(Math.abs(stats.shortWinUsd - shortNet) < 1e-9);
assert.ok(Math.abs(stats.longNetUsd - longNet) < 1e-9);
assert.ok(Math.abs(stats.shortNetUsd - shortNet) < 1e-9);
assert.ok(Math.abs(stats.netUsd - (longNet + shortNet)) < 1e-9);

}
);

test(
"real stats mode skips nested entries while position open",
()=>{

const candles =
[
c(1, 100, 100, 100, 100),
c(2, 110, 110, 109, 110),
c(3, 110, 115, 109, 114),
c(4, 110, 121, 109, 120),
c(5, 90, 91, 89, 90),
c(6, 90, 91, 79, 80)
];

const events =
[
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
type:
"entry",
side:
"long",
bar:
2,
price:
110,
pt3:
100,
pt4:
110
},
{
type:
"entry",
side:
"short",
bar:
5,
price:
90,
pt3:
100,
pt4:
90
}
];

const direct =
computeAlgoTradeStats(
candles,
events,
{
slPctOfX:
50,
tpRr:
2,
riskUsd:
1
}
);
const real =
computeAlgoTradeStats(
candles,
events,
{
slPctOfX:
50,
tpRr:
2,
riskUsd:
1,
statsMode:
"real"
}
);

assert.equal(
direct.longWins,
2
);
assert.equal(
direct.shortWins,
1
);
assert.equal(
real.longWins,
1
);
assert.equal(
real.shortWins,
1
);
assert.equal(
real.wins,
2
);
assert.ok(
direct.closed >
real.closed
);

}
);
