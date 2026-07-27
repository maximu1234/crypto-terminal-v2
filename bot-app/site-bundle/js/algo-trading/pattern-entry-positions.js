/**
 * Позиции Long/Short в точках входа паттерна (АлгоТрейдинг).
 * СЛ — в лог-шкале по X (pt3↔pt4).
 * ТП St1 — линейный RR в $: «1 к 2» = риск$ × 2 прибыли.
 */
import {
STROKE,
POSITION_DEFAULT_WIDTH_BARS
} from "../drawings/constants.js?v=11";

import {
initialPositionTpSlPercent
} from "../drawings/position.js?v=9";

export const ALGO_PATTERN_ENTRY_FLAG =
"algoPatternEntry";

export const DEFAULT_SL_PCT_OF_X =
99;

export const DEFAULT_TP_RR =
2.39;

export const DEFAULT_RISK_USD =
1;

/**
 * Линейная интерполяция в лог-пространстве: t=0 → from, t=1 → to.
 * @param {number} from
 * @param {number} to
 * @param {number} t01
 * @returns {number|null}
 */
export function interpolateLogPrice(
from,
to,
t01
){

const a =
Number(
from
);
const b =
Number(
to
);
const t =
Math.min(
1,
Math.max(
0,
Number(
t01
)
)
);

if(
!(
a >
0
) ||
!(
b >
0
) ||
!Number.isFinite(
t
)
){
return null;
}

if(
a ===
b
){
return a;
}

return Math.exp(
Math.log(
a
) *
(
1 -
t
) +
Math.log(
b
) *
t
);

}

/**
 * Расширение хода spanA→spanB на `mult` лог-высот от base (лог-фиба).
 * long: base × (hi/lo)^mult; short: base ÷ (hi/lo)^mult.
 * @param {"long"|"short"} side
 * @param {number} base
 * @param {number} spanA
 * @param {number} spanB
 * @param {number} mult
 * @returns {number|null}
 */
export function computeLogExtensionPrice(
side,
base,
spanA,
spanB,
mult
){

const baseN =
Number(
base
);
const a =
Number(
spanA
);
const b =
Number(
spanB
);
const m =
Math.abs(
Number(
mult
)
);

if(
!(
baseN >
0
) ||
!(
a >
0
) ||
!(
b >
0
) ||
!Number.isFinite(
m
)
){
return null;
}

const lo =
Math.min(
a,
b
);
const hi =
Math.max(
a,
b
);

if(
!(
hi >
lo
)
){
return null;
}

const factor =
Math.pow(
hi /
lo,
m
);

return side ===
"short"
? baseN /
factor
: baseN *
factor;

}

/**
 * СЛ на `slPctOfX`% лог-высоты X между pt3 и pt4 (от pt4 к pt3).
 * 50% → геометрическая середина; 100% → уровень pt3.
 *
 * @param {"long"|"short"} side
 * @param {number} pt3
 * @param {number} pt4
 * @param {number} [slPctOfX]
 * @returns {number|null}
 */
export function computeAlgoStopLoss(
side,
pt3,
pt4,
slPctOfX =
DEFAULT_SL_PCT_OF_X
){

void side;

const pct =
clampSlPctOfX(
slPctOfX
);

return interpolateLogPrice(
pt4,
pt3,
pct /
100
);

}

/**
 * @param {unknown} raw
 * @returns {number}
 */
export function clampSlPctOfX(
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
return DEFAULT_SL_PCT_OF_X;
}

return Math.min(
100,
Math.max(
1,
Math.round(
n *
10
) /
10
)
);

}

/**
 * ТП по RR в $ (линейно): |TP−entry| = tpRr × |entry−SL|.
 * «1 к 2» → при риске 1$ прибыль 2$ (как на бирже / плашке).
 *
 * @param {"long"|"short"} side
 * @param {number} entry
 * @param {number} slPrice
 * @param {number} [tpRr]
 * @returns {number|null}
 */
export function computeAlgoTakeProfit(
side,
entry,
slPrice,
tpRr =
DEFAULT_TP_RR
){

const entryN =
Number(
entry
);
const sl =
Number(
slPrice
);
const rr =
clampTpRr(
tpRr
);

if(
!(
entryN >
0
) ||
!Number.isFinite(
sl
) ||
!Number.isFinite(
rr
)
){
return null;
}

const riskDist =
Math.abs(
entryN -
sl
);

if(
!(
riskDist >
0
)
){
return null;
}

const move =
riskDist *
rr;

return side ===
"short"
? entryN -
move
: entryN +
move;

}

/**
 * @param {unknown} raw
 * @returns {number}
 */
export function clampTpRr(
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
return DEFAULT_TP_RR;
}

return Math.min(
50,
Math.max(
0.1,
Math.round(
n *
100
) /
100
)
);

}

/**
 * @param {unknown} raw
 * @returns {number}
 */
export function clampRiskUsd(
raw
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
return DEFAULT_RISK_USD;
}

return Math.min(
1_000_000,
Math.round(
n *
100
) /
100
);
}

/**
 * $ PnL как на бирже / плашке позиции при объёме под riskUsd на СЛ0:
 * frac × riskUsd × |exit−entry| / |sl0−entry|.
 *
 * @param {number} entry
 * @param {number} exitPrice
 * @param {number} sl0
 * @param {number} riskUsd
 * @param {number} [frac]
 * @returns {number}
 */
export function linearUsdFromRisk(
entry,
exitPrice,
sl0,
riskUsd,
frac =
1
){

const e =
Number(
entry
);
const x =
Number(
exitPrice
);
const sl =
Number(
sl0
);
const risk =
Number(
riskUsd
);
const f =
Number(
frac
);

if(
!(
e >
0
) ||
!Number.isFinite(
x
) ||
!Number.isFinite(
sl
) ||
!Number.isFinite(
risk
) ||
risk <=
0 ||
!Number.isFinite(
f
) ||
f <=
0
){
return NaN;
}

const riskDist =
Math.abs(
e -
sl
);

if(
!(
riskDist >
0
)
){
return NaN;
}

return f *
risk *
Math.abs(
x -
e
) /
riskDist;

}

/**
 * @param {{
 *   type: "entry"|"cancel",
 *   side: "long"|"short",
 *   bar: number,
 *   price: number,
 *   setupBar?: number,
 *   pt1?: number,
 *   pt2?: number,
 *   pt3?: number,
 *   pt4?: number
 * }} event
 * @param {Array<{ time: number }>} candles
 * @param {{
 *   slPctOfX?: number,
 *   tpRr?: number,
 *   riskUsd?: number,
 *   strategy?: "fixed-tp"|"partial-tp"|"partial-tp-y",
 *   tp1X?: number,
 *   tp2X?: number,
 *   tp3X?: number,
 *   tp1Y?: number,
 *   tp2Y?: number,
 *   tp3Y?: number
 * }} [opts]
 * @returns {object|null}
 */
export function buildAlgoEntryPositionShape(
event,
candles,
opts =
{}
){

if(
event?.type !==
"entry"
){
return null;
}

const bar =
Number(
event.bar
);
const entry =
Number(
event.price
);
const candle =
candles?.[
bar
];

if(
!candle ||
!Number.isFinite(
candle.time
) ||
!Number.isFinite(
entry
)
){
return null;
}

const type =
event.side ===
"short"
? "short"
: "long";
const slPctOfX =
clampSlPctOfX(
opts.slPctOfX
);
const tpRr =
clampTpRr(
opts.tpRr
);
const riskUsd =
clampRiskUsd(
opts.riskUsd
);
const defaults =
initialPositionTpSlPercent(
type,
entry
);
const slFromPattern =
computeAlgoStopLoss(
type,
event.pt3,
event.pt4 ??
entry,
slPctOfX
);
const slPrice =
Number.isFinite(
slFromPattern
)
? slFromPattern
: defaults.slPrice;

let tpPrice =
defaults.tpPrice;
let partialExitPrices;
const strategy =
opts.strategy ===
"partial-tp" ||
opts.strategy ===
"partial-tp-y"
? opts.strategy
: "fixed-tp";

if(
strategy ===
"fixed-tp"
){
const tpFromRr =
computeAlgoTakeProfit(
type,
entry,
slPrice,
tpRr
);

if(
Number.isFinite(
tpFromRr
)
){
tpPrice =
tpFromRr;
}
}else{
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
const isY =
strategy ===
"partial-tp-y";
const pickMult =
(
raw,
fallback
)=>{
const n =
Number(
raw
);

return Number.isFinite(
n
) &&
n >
0
? n
: fallback;
};
const m1 =
pickMult(
isY
? opts.tp1Y
: opts.tp1X,
0.5
);
const m2 =
pickMult(
isY
? opts.tp2Y
: opts.tp2X,
1
);
const m3 =
pickMult(
isY
? opts.tp3Y
: opts.tp3X,
1.44
);
const tpBase =
isY
? p2
: entry;
const spanA =
isY
? p1
: p3;
const spanB =
isY
? p2
: p4;
const sideKey =
type ===
"short"
? "short"
: "long";
const levels =
[
m1,
m2,
m3
].map(
mult=>
computeLogExtensionPrice(
sideKey,
tpBase,
spanA,
spanB,
mult
)
);
const validLevels =
levels.filter(
p=>
Number.isFinite(
p
)
);

if(
validLevels.length
){
const farTp =
type ===
"short"
? Math.min(
...validLevels
)
: Math.max(
...validLevels
);

tpPrice =
farTp;
}

if(
validLevels.length ===
3
){
partialExitPrices =
validLevels;
}
}

const p2Time =
resolvePositionEndTime(
candles,
bar,
candle.time
);

const shape =
{
id:
`algo-entry-${strategy}-${type}-${Number(event.setupBar) || bar}-${bar}`,
createdAt:
Date.now(),
type,
color:
STROKE,
lineWidth:
1,
p1:{
time:
candle.time,
price:
entry
},
p2:{
time:
p2Time,
price:
entry
},
tpPrice,
slPrice,
riskUsd,
[
ALGO_PATTERN_ENTRY_FLAG
]:
true
};

if(
partialExitPrices
){
shape.partialExitPrices =
partialExitPrices;
}

return shape;

}

/**
 * @param {object|null} tools
 * @param {Array} events
 * @param {Array} candles
 * @param {{ slPctOfX?: number, tpRr?: number, riskUsd?: number }} [opts]
 */
export function syncAlgoEntryPositions(
tools,
events,
candles,
opts =
{}
){

if(
!tools?.setEphemeralDrawings
){
console.warn(
"[algo-trading] setEphemeralDrawings missing — positions skipped"
);
return;
}

const list =
Array.isArray(
events
)
? events
: [];
const shapes =
[];

for(
const event of list
){

const shape =
buildAlgoEntryPositionShape(
event,
candles,
opts
);

if(
shape
){
shapes.push(
shape
);
}

}

tools.setEphemeralDrawings(
ALGO_PATTERN_ENTRY_FLAG,
shapes
);

}

/**
 * @param {object|null} tools
 */
export function clearAlgoEntryPositions(
tools
){

if(
tools?.setEphemeralDrawings
){
tools.setEphemeralDrawings(
ALGO_PATTERN_ENTRY_FLAG,
[]
);
return;
}

tools?.clearEphemeralDrawings?.();

}

function resolvePositionEndTime(
candles,
bar,
startTime
){

const endIdx =
Math.min(
candles.length -
1,
bar +
POSITION_DEFAULT_WIDTH_BARS
);

if(
endIdx >
bar &&
Number.isFinite(
candles[
endIdx
]?.time
)
){
return candles[
endIdx
].time;
}

const prev =
candles[
Math.max(
0,
bar -
1
)
];
const dt =
Number.isFinite(
prev?.time
)
? Math.max(
60,
startTime -
prev.time
)
: 60;

return startTime +
dt *
POSITION_DEFAULT_WIDTH_BARS;

}
