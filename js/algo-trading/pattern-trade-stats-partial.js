/**
 * Стратегия 2/3: закрытие 3 равными частями (лог-шкала уровней).
 * span "x" (St2) → ход pt3↔pt4, ТП = logExt(entry, pt3↔pt4, k)
 * span "y" (St3) → ход pt1↔pt2, ТП = logExt(pt2, pt1↔pt2, k)
 * СЛ / трейлинг — интерполяция в лог-пространстве по X.
 * $ PnL — линейный, как биржа / плашка позиции (risk × |Δ|/|SL0|).
 */
import {
clampRiskUsd,
clampSlPctOfX,
computeAlgoStopLoss,
computeLogExtensionPrice,
interpolateLogPrice,
linearUsdFromRisk,
DEFAULT_RISK_USD,
DEFAULT_SL_PCT_OF_X
} from "./pattern-entry-positions.js?v=14";

export const DEFAULT_PARTIAL_TP1_X =
0.5;

export const DEFAULT_PARTIAL_TP2_X =
1;

export const DEFAULT_PARTIAL_TP3_X =
1.44;

export const DEFAULT_TRAIL_SL_PCT =
25;

export const DEFAULT_TRAIL_SL_ENABLED =
true;

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
 * % от X между pt4 и pt3 для трейлинг-СЛ после ТП1 (0 = pt4, 100 = pt3).
 * @param {unknown} raw
 * @returns {number}
 */
export function clampTrailSlPct(
raw
){

const n =
Number(
raw
);

if(
!Number.isFinite(
n
)
){
return DEFAULT_TRAIL_SL_PCT;
}

return Math.min(
100,
Math.max(
0,
Math.round(
n *
10
) /
10
)
);

}

/**
 * @param {unknown} raw
 * @returns {boolean}
 */
export function normalizeTrailSlEnabled(
raw
){

return raw ===
undefined
? DEFAULT_TRAIL_SL_ENABLED
: !!raw;

}

/**
 * Трейлинг-СЛ после ТП1: N% лог-высоты X от pt4 к pt3.
 * @param {"long"|"short"} side
 * @param {number} pt3
 * @param {number} pt4
 * @param {number} trailPct
 * @returns {number|null}
 */
export function computeTrailStopLoss(
side,
pt3,
pt4,
trailPct
){

void side;

return interpolateLogPrice(
pt4,
pt3,
clampTrailSlPct(
trailPct
) /
100
);

}

/**
 * @param {"long"|"short"} side
 * @param {number} basePrice  St2: pt4; St3: pt2
 * @param {number} spanA
 * @param {number} spanB
 * @param {number} mult
 * @returns {number|null}
 */
export function computePartialTpPrice(
side,
basePrice,
spanA,
spanB,
mult
){

return computeLogExtensionPrice(
side,
basePrice,
spanA,
spanB,
mult
);

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
 *   tp3Y?: number,
 *   trailSl?: boolean,
 *   trailSlPct?: number
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
const trailEnabled =
normalizeTrailSlEnabled(
opts.trailSl
);
const trailSlPct =
clampTrailSlPct(
opts.trailSlPct
);
let slPrice =
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
const spanA =
spanMode ===
"y"
? p1
: p3;
const spanB =
spanMode ===
"y"
? p2
: p4;
const spanLo =
Math.min(
Number(
spanA
),
Number(
spanB
)
);
const spanHi =
Math.max(
Number(
spanA
),
Number(
spanB
)
);
const spanOk =
Number.isFinite(
spanLo
) &&
Number.isFinite(
spanHi
) &&
spanHi >
spanLo &&
spanLo >
0;
const riskDist =
Math.abs(
entry -
slPrice
);
const initialSl =
slPrice;

if(
!Number.isFinite(
slPrice
) ||
!spanOk ||
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

const tpBase =
spanMode ===
"y"
? p2
: entry;

if(
!Number.isFinite(
tpBase
) ||
!(
tpBase >
0
)
){
return null;
}

const tpLevels =
[
computePartialTpPrice(
side,
tpBase,
spanA,
spanB,
m1
),
computePartialTpPrice(
side,
tpBase,
spanA,
spanB,
m2
),
computePartialTpPrice(
side,
tpBase,
spanA,
spanB,
m3
)
];

if(
!tpLevels.every(
p=>
Number.isFinite(
p
)
)
){
return null;
}

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
const partUsd =
linearUsdFromRisk(
entry,
tpLevels[
nextTp
],
initialSl,
riskUsd,
frac
);

if(
Number.isFinite(
partUsd
)
){
profitUsd +=
partUsd;
}
remaining =
Math.max(
0,
remaining -
frac
);
nextTp +=
1;

if(
trailEnabled
){

if(
nextTp ===
1
){

const trailed =
computeTrailStopLoss(
side,
p3,
p4,
trailSlPct
);

if(
Number.isFinite(
trailed
)
){
slPrice =
trailed;
}

}else if(
nextTp ===
2
){

slPrice =
Number.isFinite(
p4
)
? p4
: entry;

}

}

}

if(
remaining <=
EPS
){
return {
status:
"closed",
exitBar:
i,
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

const partLoss =
linearUsdFromRisk(
entry,
slPrice,
initialSl,
riskUsd,
remaining
);

if(
Number.isFinite(
partLoss
)
){
lossUsd +=
partLoss;
}else{
lossUsd +=
remaining *
riskUsd;
}
remaining =
0;

return {
status:
"closed",
exitBar:
i,
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
exitBar:
null,
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
 * @param {{ slPctOfX?: number, tpRr?: number, statsMode?: "direct"|"real" }} [opts]
 * @returns {Array}
 */
export function filterSequentialPartialEntryEvents(
candles,
events,
opts =
{}
){

const list =
(
Array.isArray(
events
)
? events
: []
).filter(
event=>
event?.type ===
"entry"
).slice().sort(
(
a,
b
)=>
Number(
a.bar
) -
Number(
b.bar
) ||
String(
a.side
).localeCompare(
String(
b.side
)
)
);

const kept =
[];
let busyUntil =
-1;

for(
const event of list
){

const entryBar =
Number(
event.bar
);

if(
Number.isFinite(
entryBar
) &&
entryBar <=
busyUntil
){
continue;
}

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

kept.push(
event
);

if(
trade.status ===
"open"
){
busyUntil =
Array.isArray(
candles
)
? candles.length
: Number.POSITIVE_INFINITY;
}else if(
Number.isFinite(
trade.exitBar
)
){
busyUntil =
trade.exitBar;
}

}

return kept;

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

const statsMode =
opts.statsMode ===
"real"
? "real"
: "direct";
const list =
statsMode ===
"real"
? filterSequentialPartialEntryEvents(
candles,
events,
opts
)
: (
Array.isArray(
events
)
? events
: []
);

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

const side =
event.side ===
"short"
? "short"
: "long";

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
profitUsd +=
trade.netUsd;
if(
side ===
"short"
){
shortWins +=
1;
shortWinUsd +=
trade.netUsd;
shortNetUsd +=
trade.netUsd;
}else{
longWins +=
1;
longWinUsd +=
trade.netUsd;
longNetUsd +=
trade.netUsd;
}
}else if(
trade.netUsd <
-EPS
){
const lossAbs =
Math.abs(
trade.netUsd
);
lossUsd +=
lossAbs;
if(
side ===
"short"
){
shortLosses +=
1;
shortLossUsd +=
lossAbs;
shortNetUsd +=
trade.netUsd;
}else{
longLosses +=
1;
longLossUsd +=
lossAbs;
longNetUsd +=
trade.netUsd;
}
}
// |net| ≈ 0 (тейк + СЛ в ноль) — не в успех/убыток и не в суммы $

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
