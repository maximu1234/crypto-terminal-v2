import test from "node:test";
import assert from "node:assert/strict";

import {
resolvePartialTpTrade,
computePartialTpTradeStats,
computePartialTpPrice,
computeTrailStopLoss,
clampTrailSlX1,
clampTrailSlX2,
resolveTrailSlX1,
normalizeTpShares,
rebalanceTpShares,
DEFAULT_TRAIL_SL_X1,
DEFAULT_TP_SHARES
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
/* Доли по умолчанию: ТП1 закрывает 25%, СЛ ловит остальные 75%. */
const expectedNet =
0.25 *
1 *
Math.abs(
tp1 -
entry
) /
Math.abs(
entry -
sl
) -
0.75 *
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

test(
"trail SL in X: sign, clamp and legacy percent migration",
()=>{

const pt4 =
110;
const pt3 =
100;

/* -0.25X = четверть лог-хода pt4→pt3 в убыток (старые 25%). */
assert.ok(
Math.abs(
computeTrailStopLoss(
"long",
pt3,
pt4,
-0.25
) -
interpolateLogPrice(
pt4,
pt3,
0.25
)
) <
1e-9
);

/* -1X = ровно pt3, 0 = БУ на pt4. */
assert.ok(
Math.abs(
computeTrailStopLoss(
"long",
pt3,
pt4,
-1
) -
pt3
) <
1e-9
);
assert.ok(
Math.abs(
computeTrailStopLoss(
"long",
pt3,
pt4,
0
) -
pt4
) <
1e-9
);

/* Плюс уводит СЛ в профит: лонг выше pt4, шорт ниже. */
assert.ok(
computeTrailStopLoss(
"long",
pt3,
pt4,
0.25
) >
pt4
);
assert.ok(
computeTrailStopLoss(
"short",
120,
pt4,
0.25
) <
pt4
);

/* Симметрия: +0.25 и -0.25 равноудалены от pt4 в лог-шкале. */
assert.ok(
Math.abs(
Math.log(
computeTrailStopLoss(
"long",
pt3,
pt4,
0.25
) /
pt4
) +
Math.log(
computeTrailStopLoss(
"long",
pt3,
pt4,
-0.25
) /
pt4
)
) <
1e-9
);

assert.equal(
clampTrailSlX1(
-5
),
-1
);
assert.equal(
clampTrailSlX1(
5
),
1
);
assert.equal(
clampTrailSlX1(
-0.2547
),
-0.25
);
assert.equal(
clampTrailSlX1(
"abc"
),
DEFAULT_TRAIL_SL_X1
);

/* Старая настройка в % от X переводится один раз: 25 → -0.25, 15 → -0.15. */
assert.equal(
resolveTrailSlX1(
undefined,
25
),
-0.25
);
assert.equal(
resolveTrailSlX1(
undefined,
15
),
-0.15
);
assert.equal(
resolveTrailSlX1(
0,
25
),
0
);
assert.equal(
resolveTrailSlX1(
0.5,
25
),
0.5
);

}
);

test(
"trail SL after TP2: own X value, bounded by TP1 trail and max TP",
()=>{

const tps =
[
1,
1.25,
1.44
];

/* Дефолт 0 = БУ на pt4, пока трейлинг после ТП1 в минусе. */
assert.equal(
clampTrailSlX2(
undefined,
-0.25,
tps
),
0
);
assert.equal(
clampTrailSlX2(
0.5,
-0.25,
tps
),
0.5
);

/* Не выше максимального ТП. */
assert.equal(
clampTrailSlX2(
3,
-0.25,
tps
),
1.44
);
assert.equal(
clampTrailSlX2(
3,
-0.25,
[
0.5,
0.8,
0.6
]
),
0.8
);

/* Не ниже трейлинга после ТП1 — ни введённое значение, ни дефолт. */
assert.equal(
clampTrailSlX2(
-0.5,
-0.25,
tps
),
-0.25
);
assert.equal(
clampTrailSlX2(
undefined,
0.3,
tps
),
0.3
);
assert.equal(
clampTrailSlX2(
0.1,
0.3,
tps
),
0.3
);

/* ТП мельче трейлинга после ТП1 — нижняя граница выигрывает. */
assert.equal(
clampTrailSlX2(
undefined,
0.9,
[
0.5,
0.5,
0.5
]
),
0.9
);

}
);

test(
"trail SL after TP2 moves the stop into profit when asked",
()=>{

const pt3 =
100;
const pt4 =
110;
const entry =
pt4;
const tp2 =
computePartialTpPrice(
"long",
entry,
pt3,
pt4,
1.25
);
const trailed =
computeTrailStopLoss(
"long",
pt3,
pt4,
0.5
);

assert.ok(
trailed >
pt4
);

/* ТП1 и ТП2 взяты, затем обвал: остаток закрыт по СЛ на +0.5X, в профите. */
const candles =
[
c(
1,
entry,
entry,
entry,
entry
),
c(
2,
entry,
entry,
entry,
entry
),
c(
3,
entry,
tp2 *
1.001,
entry,
tp2
),
c(
4,
tp2,
tp2,
pt3 *
0.5,
pt3 *
0.5
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
1.25,
tp3X:
1.44,
trailSl:
true,
trailSlX1:
-0.25,
trailSlX2:
0.5
}
);

assert.equal(
trade.status,
"closed"
);
assert.equal(
trade.tpsHit,
2
);
assert.equal(
trade.lossUsd,
0
);
assert.ok(
trade.netUsd >
0
);

}
);

test(
"TP shares: normalize keeps sum at 100 and falls back to 25/25/50",
()=>{

assert.deepEqual(
DEFAULT_TP_SHARES,
[
25,
25,
50
]
);
assert.deepEqual(
normalizeTpShares(
undefined,
undefined,
undefined
),
[
25,
25,
50
]
);
assert.deepEqual(
normalizeTpShares(
50,
25,
25
),
[
50,
25,
25
]
);
/* Мусор в поле → дефолт вместо него, затем пропорция до 100. */
const withGarbage =
normalizeTpShares(
"abc",
25,
25
);

assert.equal(
withGarbage[
0
] +
withGarbage[
1
] +
withGarbage[
2
],
100
);

const scaled =
normalizeTpShares(
10,
10,
20
);

assert.equal(
scaled[
0
] +
scaled[
1
] +
scaled[
2
],
100
);
assert.deepEqual(
scaled,
[
25,
25,
50
]
);

const clamped =
normalizeTpShares(
0,
500,
-5
);

assert.equal(
clamped[
0
] +
clamped[
1
] +
clamped[
2
],
100
);
assert.ok(
clamped.every(
value=>
value >=
1 &&
value <=
98
)
);

}
);

test(
"TP shares: editing one field keeps it and rebalances the rest",
()=>{

/* Правим ТП1 — остаток забирает ТП3. */
assert.deepEqual(
rebalanceTpShares(
40,
25,
50,
0
),
[
40,
25,
35
]
);
/* Правим ТП3 — подстраивается ТП2, затем ТП1. */
assert.deepEqual(
rebalanceTpShares(
25,
25,
70,
2
),
[
25,
5,
70
]
);
assert.deepEqual(
rebalanceTpShares(
25,
25,
90,
2
),
[
9,
1,
90
]
);
/* Доля больше 98 невозможна: сумма всё равно 100. */
const extreme =
rebalanceTpShares(
98,
25,
50,
0
);

assert.equal(
extreme[
0
] +
extreme[
1
] +
extreme[
2
],
100
);

}
);

test(
"TP shares drive the closed part: bigger TP1 share earns more before SL",
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
computePartialTpPrice(
"long",
entry,
pt3,
pt4,
1
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
tp1 +
1,
sl -
0.5,
sl
)
];
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
const rr =
Math.abs(
tp1 -
entry
) /
Math.abs(
entry -
sl
);

const small =
resolvePartialTpTrade(
candles,
event,
{
...opts,
share1:
25,
share2:
25,
share3:
50
}
);
const big =
resolvePartialTpTrade(
candles,
event,
{
...opts,
share1:
60,
share2:
20,
share3:
20
}
);

assert.ok(
Math.abs(
small.netUsd -
(
0.25 *
rr -
0.75
)
) <
1e-9
);
assert.ok(
Math.abs(
big.netUsd -
(
0.6 *
rr -
0.4
)
) <
1e-9
);
assert.ok(
big.netUsd >
small.netUsd
);

}
);

test(
"trail SL never moves back: plus X after TP1 survives the TP2 step",
()=>{

const pt3 =
100;
const pt4 =
110;
const entry =
pt4;
const tp2 =
computePartialTpPrice(
"long",
entry,
pt3,
pt4,
1.25
);

assert.ok(
computeTrailStopLoss(
"long",
pt3,
pt4,
0.25
) >
pt4
);

/* ТП1 и ТП2 взяты, затем обвал: стоп остался на +0.25X, а не откатился в БУ. */
const candles =
[
c(
1,
entry,
entry,
entry,
entry
),
c(
2,
entry,
entry,
entry,
entry
),
c(
3,
entry,
tp2 *
1.001,
entry,
tp2
),
c(
4,
tp2,
tp2,
pt3 *
0.5,
pt3 *
0.5
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
1.25,
tp3X:
1.44,
trailSl:
true,
trailSlX1:
0.25
}
);

assert.equal(
trade.status,
"closed"
);
assert.equal(
trade.tpsHit,
2
);
assert.equal(
trade.lossUsd,
0
);
assert.ok(
trade.netUsd >
0
);

}
);
