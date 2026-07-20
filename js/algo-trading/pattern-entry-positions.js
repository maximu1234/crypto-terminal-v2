/**
 * Позиции Long/Short в точках входа паттерна (АлгоТрейдинг).
 * СЛ = доля высоты X=|pt4−pt3| от входа (pt4) к pt3.
 * Эфемерный слой drawings (setEphemeralDrawings).
 */
import {
STROKE,
POSITION_DEFAULT_WIDTH_BARS
} from "../drawings/constants.js?v=10";

import {
initialPositionTpSlPercent
} from "../drawings/position.js?v=4";

export const ALGO_PATTERN_ENTRY_FLAG =
"algoPatternEntry";

export const DEFAULT_SL_PCT_OF_X =
50;

export const DEFAULT_TP_RR =
2;

export const DEFAULT_RISK_USD =
1;

/**
 * СЛ на `slPctOfX`% высоты X между pt3 и pt4 (от pt4 к pt3).
 * 50% → середина отрезка; 100% → уровень pt3.
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

const p3 =
Number(
pt3
);
const p4 =
Number(
pt4
);
const pct =
clampSlPctOfX(
slPctOfX
);

if(
!Number.isFinite(
p3
) ||
!Number.isFinite(
p4
)
){
return null;
}

const x =
Math.abs(
p4 -
p3
);

if(
!(
x >
0
)
){
return null;
}

const offset =
x *
(
pct /
100
);

if(
side ===
"short"
){
return p4 +
offset;
}

return p4 -
offset;

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
 * ТП по RR: расстояние от входа = tpRr × |entry − SL|.
 * «1 к 2» → tpRr = 2.
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
!Number.isFinite(
entryN
) ||
!Number.isFinite(
sl
)
){
return null;
}

const risk =
Math.abs(
entryN -
sl
);

if(
!(
risk >
0
)
){
return null;
}

const reward =
risk *
rr;

if(
side ===
"short"
){
return entryN -
reward;
}

return entryN +
reward;

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
 * @param {{
 *   type: "entry"|"cancel",
 *   side: "long"|"short",
 *   bar: number,
 *   price: number,
 *   setupBar?: number,
 *   pt3?: number,
 *   pt4?: number
 * }} event
 * @param {Array<{ time: number }>} candles
 * @param {{ slPctOfX?: number, tpRr?: number, riskUsd?: number }} [opts]
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
const tpFromRr =
computeAlgoTakeProfit(
type,
entry,
slPrice,
tpRr
);
const tpPrice =
Number.isFinite(
tpFromRr
)
? tpFromRr
: defaults.tpPrice;
const p2Time =
resolvePositionEndTime(
candles,
bar,
candle.time
);

return {
id:
`algo-entry-${type}-${Number(event.setupBar) || bar}-${bar}`,
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
