import test from "node:test";
import assert from "node:assert/strict";

import {
computeAlgoTradeStats,
resolveAlgoTradeOutcome
} from "../js/algo-trading/pattern-trade-stats.js";

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
"dollar pnl: win=linear risk RR, loss=$risk",
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

const stats =
computeAlgoTradeStats(
candles,
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
3,
price:
110,
pt3:
100,
pt4:
110
}
],
{
slPctOfX:
50,
tpRr:
2,
riskUsd:
1
}
);

assert.equal(
stats.wins,
1
);
assert.equal(
stats.losses,
1
);
assert.equal(
stats.lossUsd,
1
);
/* entry 110, log-mid SL, linear TP RR=2 → profit ≈ $2 */
assert.ok(
Math.abs(
stats.profitUsd -
2
) <
1e-6
);
assert.ok(
Math.abs(
stats.netUsd -
1
) <
1e-6
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
assert.ok(Math.abs(stats.longWinUsd - 2) < 1e-6);
assert.ok(Math.abs(stats.shortWinUsd - 2) < 1e-6);
assert.ok(Math.abs(stats.longNetUsd - 2) < 1e-6);
assert.ok(Math.abs(stats.shortNetUsd - 2) < 1e-6);
assert.ok(Math.abs(stats.netUsd - 4) < 1e-6);

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
