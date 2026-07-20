/**
 * Стратегия 2/3: закрытие 3 равными частями.
 * span "x" → высота |pt4−pt3|; span "y" → |pt2−pt1|.
 * СЛ как в стратегии 1; после частичных тейков СЛ бьёт только остаток.
 */
import {
clampRiskUsd,
clampSlPctOfX,
computeAlgoStopLoss,
DEFAULT_RISK_USD,
DEFAULT_SL_PCT_OF_X
} from "./pattern-entry-positions.js?v=5";

export const DEFAULT_PARTIAL_TP1_X =
1;

export const DEFAULT_PARTIAL_TP2_X =
1.25;

export const DEFAULT_PARTIAL_TP3_X =
1.44;

const PART =
1 /
3;
const EPS =
1e-9;

/**
 * @param {unknown} raw
 * @param {number} fallback
 * @returns {number}
 */
export function clampPartialTpX(
raw,
fallback
){

const n =
Number(
raw
);

if(
!Number.isFinite(
n
) ||
n <=
0
){
return fallback;
}

return Math.min(
50,
Math.max(
0.01,
Math.round(
n *
1000
) /
1000
)
);

}

/**
 * @param {"long"|"short"} side
 * @param {number} entry
 * @param {number} x
 * @param {number} mult
 * @returns {number}
 */
export function computePartialTpPrice(
side,
entry,
x,
mult
){

const offset =
Math.abs(
x
) *
Math.abs(
mult
);

return side ===
"short"
? entry -
offset
: entry +
offset;

}

/**
 * @param {Array} candles
 * @param {{
 *   type: string,
 *   side: "long"|"short",
 *   bar: number,
 *   price: number,
 *   pt1?: number,
 *   pt2?: number,
 *   pt3?: number,
 *   pt4?: number
 * }} event
 * @param {{
 *   span?: "x"|"y",
 *   slPctOfX?: number,
 *   riskUsd?: number,
 *   tp1X?: number,
 *   tp2X?: number,
 *   tp3X?: number,
 *   tp1Y?: number,
 *   tp2Y?: number,
 *   tp3Y?: number
 * }} [opts]
 * @returns {{
 *   status: "open"|"closed",
 *   tpsHit: number,
 *   profitUsd: number,
 *   lossUsd: number,
 *   netUsd: number
 * }|null}
 */
export function resolvePartialTpTrade(
candles,
event,
opts =
{}
){

if(
event?.type !==
"entry"
){
return null;
}

const side =
event.side ===
"short"
? "short"
: "long";
const entryBar =
Number(
event.bar
);
const entry =
Number(
event.price
);
const p1 =
Number(
event.pt1
);
const p2 =
Number(
event.pt2
);
const p3 =
Number(
event.pt3
);
const p4 =
Number(
event.pt4 ??
entry
);

if(
!Array.isArray(
candles
) ||
!Number.isFinite(
entryBar
) ||
entryBar <
0 ||
entryBar >=
candles.length ||
!Number.isFinite(
entry
)
){
return null;
}

const slPctOfX =
clampSlPctOfX(
opts.slPctOfX ??
DEFAULT_SL_PCT_OF_X
);
const riskUsd =
clampRiskUsd(
opts.riskUsd ??
DEFAULT_RISK_USD
);
const slPrice =
computeAlgoStopLoss(
side,
p3,
p4,
slPctOfX
);
const spanMode =
opts.span ===
"y"
? "y"
: "x";
const span =
spanMode ===
"y"
? Math.abs(
p2 -
p1
)
: Math.abs(
p4 -
p3
);
const riskDist =
Math.abs(
entry -
slPrice
);

if(
!Number.isFinite(
slPrice
) ||
!(
span >
0
) ||
!(
riskDist >
0
)
){
return null;
}

const m1 =
clampPartialTpX(
spanMode ===
"y"
? opts.tp1Y
: opts.tp1X,
DEFAULT_PARTIAL_TP1_X
);
const m2 =
clampPartialTpX(
spanMode ===
"y"
? opts.tp2Y
: opts.tp2X,
DEFAULT_PARTIAL_TP2_X
);
const m3 =
clampPartialTpX(
spanMode ===
"y"
? opts.tp3Y
: opts.tp3X,
DEFAULT_PARTIAL_TP3_X
);

const tpLevels =
[
computePartialTpPrice(
side,
entry,
span,
m1
),
computePartialTpPrice(
side,
entry,
span,
m2
),
computePartialTpPrice(
side,
entry,
span,
m3
)
];

let remaining =
1;
let nextTp =
0;
let profitUsd =
0;
let lossUsd =
0;

for(
let i =
entryBar;
i <
candles.length;
i++
){

const candle =
candles[
i
];

if(
!candle
){
continue;
}

while(
nextTp <
3 &&
remaining >
EPS &&
tpReached(
side,
candle,
tpLevels[
nextTp
]
)
){

const frac =
nextTp <
2
? PART
: remaining;
const rewardDist =
Math.abs(
tpLevels[
nextTp
] -
entry
);

profitUsd +=
frac *
riskUsd *
(
rewardDist /
riskDist
);
remaining =
Math.max(
0,
remaining -
frac
);
nextTp +=
1;

}

if(
remaining <=
EPS
){
return {
status:
"closed",
tpsHit:
nextTp,
profitUsd,
lossUsd,
netUsd:
profitUsd -
lossUsd
};
}

if(
slReached(
side,
candle,
slPrice
)
){
lossUsd +=
remaining *
riskUsd;
remaining =
0;

return {
status:
"closed",
tpsHit:
nextTp,
profitUsd,
lossUsd,
netUsd:
profitUsd -
lossUsd
};
}

}

return {
status:
"open",
tpsHit:
nextTp,
profitUsd,
lossUsd,
netUsd:
profitUsd -
lossUsd
};

}

/**
 * @param {Array} candles
 * @param {Array} events
 * @param {object} [opts]
 * @returns {import("./pattern-trade-stats.js").AlgoTradeStats}
 */
export function computePartialTpTradeStats(
candles,
events,
opts =
{}
){

let longWins =
0;
let longLosses =
0;
let longOpen =
0;
let longWinUsd =
0;
let longLossUsd =
0;
let shortWins =
0;
let shortLosses =
0;
let shortOpen =
0;
let shortWinUsd =
0;
let shortLossUsd =
0;
let profitUsd =
0;
let lossUsd =
0;
let longNetUsd =
0;
let shortNetUsd =
0;

const list =
Array.isArray(
events
)
? events
: [];

for(
const event of list
){

const trade =
resolvePartialTpTrade(
candles,
event,
opts
);

if(
!trade
){
continue;
}

profitUsd +=
trade.profitUsd;
lossUsd +=
trade.lossUsd;

const side =
event.side ===
"short"
? "short"
: "long";

if(
side ===
"short"
){
shortNetUsd +=
trade.netUsd;
}else{
longNetUsd +=
trade.netUsd;
}

if(
trade.status ===
"open"
){
if(
side ===
"short"
){
shortOpen +=
1;
}else{
longOpen +=
1;
}
continue;
}

if(
trade.netUsd >
EPS
){
if(
side ===
"short"
){
shortWins +=
1;
shortWinUsd +=
trade.netUsd;
}else{
longWins +=
1;
longWinUsd +=
trade.netUsd;
}
}else if(
trade.netUsd <
-EPS
){
if(
side ===
"short"
){
shortLosses +=
1;
shortLossUsd +=
Math.abs(
trade.netUsd
);
}else{
longLosses +=
1;
longLossUsd +=
Math.abs(
trade.netUsd
);
}
}

}

const wins =
longWins +
shortWins;
const losses =
longLosses +
shortLosses;
const open =
longOpen +
shortOpen;
const closed =
wins +
losses;
const longClosed =
longWins +
longLosses;
const shortClosed =
shortWins +
shortLosses;

return {
longWins,
longLosses,
longOpen,
longWinRate:
longClosed >
0
? (
longWins /
longClosed
) *
100
: null,
longWinUsd,
longLossRate:
longClosed >
0
? (
longLosses /
longClosed
) *
100
: null,
longLossUsd,
shortWins,
shortLosses,
shortOpen,
shortWinRate:
shortClosed >
0
? (
shortWins /
shortClosed
) *
100
: null,
shortWinUsd,
shortLossRate:
shortClosed >
0
? (
shortLosses /
shortClosed
) *
100
: null,
shortLossUsd,
wins,
losses,
open,
closed,
winRate:
closed >
0
? (
wins /
closed
) *
100
: null,
lossRate:
closed >
0
? (
losses /
closed
) *
100
: null,
profitUsd,
lossUsd,
netUsd:
profitUsd -
lossUsd,
longNetUsd,
shortNetUsd
};

}


function tpReached(
side,
candle,
tp
){

if(
side ===
"long"
){
return (
Number.isFinite(
candle.high
) &&
candle.high >=
tp
);
}

return (
Number.isFinite(
candle.low
) &&
candle.low <=
tp
);

}

function slReached(
side,
candle,
sl
){

if(
side ===
"long"
){
return (
Number.isFinite(
candle.low
) &&
candle.low <=
sl
);
}

return (
Number.isFinite(
candle.high
) &&
candle.high >=
sl
);

}
