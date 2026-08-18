/**
 * Стратегия 2/3: закрытие 3 частями по долям ТП (лог-шкала уровней).
 * span "x" (St2) → ход pt3↔pt4, ТП = logExt(entry, pt3↔pt4, k)
 * span "y" (St3) → ход pt1↔pt2, ТП = logExt(pt2, pt1↔pt2, k)
 * СЛ / трейлинг — интерполяция в лог-пространстве по X.
 * $ PnL — от fill (стоп-проскальзывание) минус тейкер 0.08% вход+выход.
 */
import {
clampRiskUsd,
clampSlPctOfX,
computeAlgoStopLoss,
computeLogExtensionPrice,
computeStopFillPrice,
linearUsdFromFill,
DEFAULT_RISK_USD,
DEFAULT_SL_PCT_OF_X
} from "./pattern-entry-positions.js?v=16";

export const DEFAULT_PARTIAL_TP1_X =
0.5;

export const DEFAULT_PARTIAL_TP2_X =
1;

export const DEFAULT_PARTIAL_TP3_X =
1.44;

export const DEFAULT_TRAIL_SL_X1 =
-0.25;

export const DEFAULT_TRAIL_SL_X2 =
0;

export const MIN_TRAIL_SL_X =
-1;

export const MAX_TRAIL_SL_X =
1;

export const DEFAULT_TRAIL_SL_ENABLED =
true;

export const DEFAULT_TP_SHARES =
[
25,
25,
50
];

export const MIN_TP_SHARE =
1;

export const MAX_TP_SHARE =
98;

export const TP_SHARES_TOTAL =
100;

const EPS =
1e-9;

/**
 * @param {unknown} raw
 * @param {number} fallback
 * @returns {number}
 */
function clampTpShare(
raw,
fallback
){

const n =
Math.round(
Number(
raw
)
);

return Number.isFinite(
n
)
? Math.min(
MAX_TP_SHARE,
Math.max(
MIN_TP_SHARE,
n
)
)
: fallback;

}

/**
 * Добираем недостачу/излишек до 100% по порядку индексов, не выходя за границы.
 * @param {number[]} shares
 * @param {number[]} order
 * @returns {number[]}
 */
function fillTpSharesResidual(
shares,
order
){

const out =
[
...shares
];
let residual =
TP_SHARES_TOTAL -
(
out[
0
] +
out[
1
] +
out[
2
]
);

for(
const i of order
){

if(
!residual
){
break;
}

const next =
Math.min(
MAX_TP_SHARE,
Math.max(
MIN_TP_SHARE,
out[
i
] +
residual
)
);

residual -=
next -
out[
i
];
out[
i
] =
next;

}

return out;

}

/**
 * Доли ТП в % от позиции; сумма всегда 100. Пропорционально масштабируем
 * то, что пришло из prefs (в т.ч. старые сохранения без долей).
 * @param {unknown} raw1
 * @param {unknown} raw2
 * @param {unknown} raw3
 * @returns {number[]}
 */
export function normalizeTpShares(
raw1,
raw2,
raw3
){

const clamped =
[
raw1,
raw2,
raw3
].map(
(
raw,
i
)=>
clampTpShare(
raw,
DEFAULT_TP_SHARES[
i
]
)
);
const sum =
clamped[
0
] +
clamped[
1
] +
clamped[
2
];

if(
sum ===
TP_SHARES_TOTAL
){
return clamped;
}

const scaled =
clamped.map(
(
value,
i
)=>
clampTpShare(
(
value *
TP_SHARES_TOTAL
) /
sum,
DEFAULT_TP_SHARES[
i
]
)
);

return fillTpSharesResidual(
scaled,
[
2,
1,
0
]
);

}

/**
 * Пользователь изменил одну долю — её значение сохраняем, остальные
 * подгоняем до 100% (сначала ТП3, затем ТП2, затем ТП1).
 * @param {unknown} raw1
 * @param {unknown} raw2
 * @param {unknown} raw3
 * @param {number} editedIndex
 * @returns {number[]}
 */
export function rebalanceTpShares(
raw1,
raw2,
raw3,
editedIndex
){

const clamped =
[
raw1,
raw2,
raw3
].map(
(
raw,
i
)=>
clampTpShare(
raw,
DEFAULT_TP_SHARES[
i
]
)
);
const order =
[
2,
1,
0
].filter(
i=>
i !==
editedIndex
);

return fillTpSharesResidual(
fillTpSharesResidual(
clamped,
order
),
[
editedIndex
]
);

}

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
 * Трейлинг-СЛ в X от pt4: минус — в сторону pt3 (-1 = pt3), плюс — в профит.
 * @param {unknown} raw
 * @returns {number}
 */
export function clampTrailSlX1(
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
return DEFAULT_TRAIL_SL_X1;
}

return Math.min(
MAX_TRAIL_SL_X,
Math.max(
MIN_TRAIL_SL_X,
Math.round(
n *
100
) /
100
)
);

}

/**
 * Верхняя граница трейлинга после ТП2 — максимальный из трёх ТП.
 * @param {Array<unknown>} tpMults
 * @returns {number}
 */
export function maxTpMultiplier(
tpMults
){

const list =
(Array.isArray(
tpMults
)
? tpMults
: []).map(
Number
).filter(
n=>
Number.isFinite(
n
)
);

return list.length
? Math.max(
...list
)
: DEFAULT_PARTIAL_TP3_X;

}

/**
 * Трейлинг-СЛ после ТП2: не ниже трейлинга после ТП1 и не выше максимального ТП.
 * @param {unknown} raw
 * @param {number} trailX1
 * @param {Array<unknown>} tpMults
 * @returns {number}
 */
export function clampTrailSlX2(
raw,
trailX1,
tpMults
){

const lo =
clampTrailSlX1(
trailX1
);
const hi =
Math.max(
lo,
maxTpMultiplier(
tpMults
)
);
const n =
Number(
raw
);
const value =
Number.isFinite(
n
)
? Math.round(
n *
100
) /
100
: Math.max(
lo,
DEFAULT_TRAIL_SL_X2
);

return Math.min(
hi,
Math.max(
lo,
value
)
);

}

/**
 * Миграция старой настройки «трейлинг СЛ, % от X» в X со знаком: 25 → -0.25.
 * @param {unknown} rawX
 * @param {unknown} legacyPct
 * @returns {number}
 */
export function resolveTrailSlX1(
rawX,
legacyPct
){

if(
rawX !==
undefined &&
rawX !==
null &&
rawX !==
""
){
return clampTrailSlX1(
rawX
);
}

const pct =
Number(
legacyPct
);

if(
!Number.isFinite(
pct
)
){
return DEFAULT_TRAIL_SL_X1;
}

return clampTrailSlX1(
-pct /
100
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
 * Трейлинг-СЛ: X от pt4 в лог-шкале, где 1X = ход pt4↔pt3.
 * Минус — в сторону pt3 (убыток), плюс — в сторону профита.
 * Направление задаёт само отношение pt3/pt4, поэтому side не нужен.
 * Значение приходит уже зажатым (ТП1 и ТП2 имеют разные границы).
 * @param {"long"|"short"} side
 * @param {number} pt3
 * @param {number} pt4
 * @param {number} trailX
 * @returns {number|null}
 */
export function computeTrailStopLoss(
side,
pt3,
pt4,
trailX
){

void side;

const base =
Number(
pt4
);
const target =
Number(
pt3
);
const x =
Number(
trailX
);

if(
!(
base >
0
) ||
!(
target >
0
) ||
base ===
target ||
!Number.isFinite(
x
)
){
return null;
}

const price =
base *
Math.pow(
target /
base,
-x
);

return Number.isFinite(
price
) &&
price >
0
? price
: null;

}

/**
 * СЛ двигается только в защитную сторону — назад не откатываем.
 * @param {"long"|"short"} side
 * @param {number} current
 * @param {number} next
 * @returns {number}
 */
function pickProtectiveStopLoss(
side,
current,
next
){

if(
!Number.isFinite(
next
)
){
return current;
}

if(
!Number.isFinite(
current
)
){
return next;
}

return side ===
"short"
? Math.min(
current,
next
)
: Math.max(
current,
next
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
 *   trailSlX1?: number,
 *   trailSlX2?: number,
 *   trailSlPct?: number,
 *   share1?: number,
 *   share2?: number,
 *   share3?: number
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
const trailSlX1 =
resolveTrailSlX1(
opts.trailSlX1,
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
const fillPrice =
computeStopFillPrice(
side,
entry,
candles[
entryBar
]
);

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
const trailSlX2 =
clampTrailSlX2(
opts.trailSlX2,
trailSlX1,
[
m1,
m2,
m3
]
);
const shares =
normalizeTpShares(
opts.share1,
opts.share2,
opts.share3
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

/* Последний ТП забирает остаток — так доли не «теряются» на округлении. */
const frac =
nextTp <
2
? Math.min(
remaining,
shares[
nextTp
] /
TP_SHARES_TOTAL
)
: remaining;
const partUsd =
linearUsdFromFill(
side,
entry,
fillPrice,
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
if(
partUsd >=
0
){
profitUsd +=
partUsd;
}else{
lossUsd +=
-partUsd;
}
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

slPrice =
pickProtectiveStopLoss(
side,
slPrice,
computeTrailStopLoss(
side,
p3,
p4,
trailSlX1
)
);

}else if(
nextTp ===
2
){

slPrice =
pickProtectiveStopLoss(
side,
slPrice,
computeTrailStopLoss(
side,
p3,
p4,
trailSlX2
)
);

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
lossUsd,
exitReason:
"tp"
};
}

if(
slReached(
side,
candle,
slPrice
)
){

const partUsd =
linearUsdFromFill(
side,
entry,
fillPrice,
slPrice,
initialSl,
riskUsd,
remaining
);
/* Трейлинг с плюсовым X уводит стоп выше входа — это профит, не убыток. */
if(
!Number.isFinite(
partUsd
)
){
lossUsd +=
remaining *
riskUsd;
}else if(
partUsd >=
0
){
profitUsd +=
partUsd;
}else{
lossUsd +=
-partUsd;
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
lossUsd,
exitReason:
"sl"
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
lossUsd,
exitReason:
"open"
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
let bes =
0;
let sumR =
0;
let equityUsd =
0;
let equityPeakUsd =
0;
let maxDrawdownUsd =
0;

const riskUsd =
clampRiskUsd(
opts.riskUsd ??
DEFAULT_RISK_USD
);

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
const tradeR =
riskUsd >
0
? trade.netUsd /
riskUsd
: 0;
profitUsd +=
trade.netUsd;
sumR +=
tradeR;
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
const tradeR =
riskUsd >
0
? trade.netUsd /
riskUsd
: -1;
lossUsd +=
lossAbs;
sumR +=
tradeR;
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
}else{
/* |net| ≈ 0 (тейк + СЛ в ноль) — BE, R=0 */
bes +=
1;
}

equityUsd +=
Number.isFinite(
trade.netUsd
)
? trade.netUsd
: 0;
if(
equityUsd >
equityPeakUsd
){
equityPeakUsd =
equityUsd;
}
const dd =
equityPeakUsd -
equityUsd;
if(
dd >
maxDrawdownUsd
){
maxDrawdownUsd =
dd;
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
shortNetUsd,
bes,
sumR,
expectancyR:
(
wins +
losses +
bes
) >
0
? sumR /
(
wins +
losses +
bes
)
: null,
maxDrawdownUsd
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
