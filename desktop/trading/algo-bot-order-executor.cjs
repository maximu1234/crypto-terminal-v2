/**
 * Algo bot order execution — market entry + SL/TP (Phase C).
 */
function getLog(){

return require(
"electron-log"
);

}

const algoRest =
require(
"./algo-bybit-rest.cjs"
);
const {
normalizeSymbol
} =
require(
"./algo-bybit-kline-ws.cjs"
);
const {
readPendingBotOrders,
writePendingBotOrders
} =
require(
"./algo-bot-store.cjs"
);

/** @type {Set<string>} */
const entryInflight =
new Set();

/** @type {Map<string, { side: string, openedAt: number, riskUsd: number, tpRr: number, slPrice?: number, tpPrice?: number, setup?: object }>} */
const pendingEntries =
new Map();

/** @type {Map<string, object>} */
const pendingTriggers =
new Map();

/** Opposite-mirror trigger (pt4 == parent pt3 ± 1 tick). At most one per symbol. */
/** @type {Map<string, object>} */
const pendingMirrorTriggers =
new Map();

function serializePendingMap(
map
){

return Object.fromEntries(
map.entries()
);

}

function persistPendingState(){

return writePendingBotOrders(
{
pendingTriggers:
serializePendingMap(
pendingTriggers
),
pendingMirrorTriggers:
serializePendingMap(
pendingMirrorTriggers
),
pendingEntries:
serializePendingMap(
pendingEntries
)
}
);

}

function hydratePendingFromDisk(){

const saved =
readPendingBotOrders();

pendingTriggers.clear();
pendingMirrorTriggers.clear();
pendingEntries.clear();

for(
const [
symbol,
meta
] of Object.entries(
saved.pendingTriggers ||
{}
)
){
const sym =
normalizeSymbol(
symbol
);

if(
sym &&
meta &&
typeof meta ===
"object"
){
pendingTriggers.set(
sym,
meta
);
}
}

for(
const [
symbol,
meta
] of Object.entries(
saved.pendingMirrorTriggers ||
{}
)
){
const sym =
normalizeSymbol(
symbol
);

if(
sym &&
meta &&
typeof meta ===
"object"
){
pendingMirrorTriggers.set(
sym,
meta
);
}
}

for(
const [
symbol,
meta
] of Object.entries(
saved.pendingEntries ||
{}
)
){
const sym =
normalizeSymbol(
symbol
);

if(
sym &&
meta &&
typeof meta ===
"object"
){
pendingEntries.set(
sym,
meta
);
}
}

return {
pendingTriggers:
pendingTriggers.size,
pendingMirrorTriggers:
pendingMirrorTriggers.size,
pendingEntries:
pendingEntries.size
};

}

/** Доли ТП в % от позиции; сумма всегда 100 (нет настройки → 25/25/50). */
function normalizeTpShares(
raw1,
raw2,
raw3
){

const defaults =
[
25,
25,
50
];
const clamp =
(
raw,
fallback
)=>{
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
98,
Math.max(
1,
n
)
)
: fallback;
};
const shares =
[
raw1,
raw2,
raw3
].map(
(
raw,
i
)=>
clamp(
raw,
defaults[
i
]
)
);
const sum =
shares[
0
] +
shares[
1
] +
shares[
2
];

if(
sum ===
100
){
return shares;
}

const scaled =
shares.map(
(
value,
i
)=>
clamp(
(
value *
100
) /
sum,
defaults[
i
]
)
);
let residual =
100 -
(
scaled[
0
] +
scaled[
1
] +
scaled[
2
]
);

for(
const i of [
2,
1,
0
]
){

if(
!residual
){
break;
}

const next =
Math.min(
98,
Math.max(
1,
scaled[
i
] +
residual
)
);

residual -=
next -
scaled[
i
];
scaled[
i
] =
next;

}

return scaled;

}

/**
 * Объём под три ТП по долям (%). Остаток отдаём третьему ТП, чтобы
 * сумма частей точно равнялась позиции.
 * @param {number} qty
 * @param {{ qtyStep?: number|string }|number|string} rules
 * @param {Array<unknown>} [tpShares]
 * @returns {number[]|null}
 */
/**
 * Split qty across N weights on the instrument step grid.
 * Every part but the last is floored; the last one absorbs the remainder so
 * the sum always equals the position size (final TP closes everything left).
 * @param {number} qty
 * @param {{qtyStep?: number|string}|number|string} rules
 * @param {number[]} weights
 * @returns {number[]|null}
 */
function allocateQtyByWeights(
qty,
rules =
{},
weights =
[]
){

const total =
Number(
qty
);
const step =
Number(
rules?.qtyStep ??
rules
);
const decimals =
Math.max(
0,
Math.min(
12,
(
String(
rules?.qtyStep ??
rules
).split(
"."
)[
1
] ||
""
).length
)
);
const list =
(
Array.isArray(
weights
)
? weights
: []
).map(
Number
).filter(
value=>
Number.isFinite(
value
) &&
value >
0
);

if(
!Number.isFinite(
total
) ||
total <=
0 ||
!Number.isFinite(
step
) ||
step <=
0 ||
!list.length
){
return null;
}

const weightSum =
list.reduce(
(
acc,
value
)=>
acc +
value,
0
);
const parts =
[];
let used =
0;

for(
let i =
0;
i <
list.length -
1;
i++
){
const part =
Number(
(
Math.floor(
(
(
total *
list[
i
]
) /
weightSum
) /
step +
1e-9
) *
step
).toFixed(
decimals
)
);
parts.push(
part
);
used +=
part;
}

parts.push(
Number(
(
Math.round(
(
total -
used
) /
step
) *
step
).toFixed(
decimals
)
)
);

if(
parts.some(
part=>
!(
part >
0
)
)
){
return null;
}

return parts;

}

/**
 * How many TPs are already taken, measured by the closed quantity.
 * Placed leg quantities are step-rounded, so they are matched first; shares are
 * only a fallback for setups stored before the bot remembered the quantities.
 * @param {number} initialQty
 * @param {number} liveQty
 * @param {number[]} [tpShares]
 * @param {number[]} [tpQtys] Quantity of each reduce-only leg as placed
 * @returns {number}
 */
function countTpsHitByClosedQty(
initialQty,
liveQty,
tpShares,
tpQtys
){

const total =
Number(
initialQty
);
const left =
Number(
liveQty
);

if(
!Number.isFinite(
total
) ||
total <=
0 ||
!Number.isFinite(
left
) ||
left <
0
){
return 0;
}

const legQtys =
(
Array.isArray(
tpQtys
)
? tpQtys
: []
).map(
Number
);

if(
legQtys.length &&
legQtys.every(
qty=>
Number.isFinite(
qty
) &&
qty >
0
)
){
const closedQty =
total -
left;
let legHits =
0;
let filled =
0;

for(
let i =
0;
i <
legQtys.length;
i++
){
filled +=
legQtys[
i
];

if(
closedQty >=
filled *
0.999
){
legHits =
i +
1;
}
}

return legHits;
}

const shares =
normalizeTpShares(
tpShares?.[
0
],
tpShares?.[
1
],
tpShares?.[
2
]
);
const closedPct =
(
1 -
left /
total
) *
100;
let hits =
0;
let cumulative =
0;

for(
let i =
0;
i <
shares.length;
i++
){
cumulative +=
shares[
i
];

if(
closedPct >=
cumulative -
2
){
hits =
i +
1;
}
}

return hits;

}

/**
 * Round a quantity down to the instrument step.
 * @param {number} qty
 * @param {{qtyStep?: number|string}|number|string} rules
 * @returns {number}
 */
function floorQtyToStep(
qty,
rules =
{}
){

const value =
Number(
qty
);
const step =
Number(
rules?.qtyStep ??
rules
);
const decimals =
Math.max(
0,
Math.min(
12,
(
String(
rules?.qtyStep ??
rules
).split(
"."
)[
1
] ||
""
).length
)
);

if(
!Number.isFinite(
value
) ||
value <=
0 ||
!Number.isFinite(
step
) ||
step <=
0
){
return 0;
}

return Number(
(
Math.floor(
value /
step +
1e-9
) *
step
).toFixed(
decimals
)
);

}

/**
 * Quantity still resting in an order (partial fills leave less than qty).
 * @param {object} order
 * @returns {number}
 */
function restingOrderQty(
order
){

const leaves =
Number(
order?.leavesQty
);

return Number.isFinite(
leaves
) &&
leaves >
0
? leaves
: Math.abs(
Number(
order?.qty ||
0
)
);

}

/**
 * Bot-owned reduce-only limit order that closes a position (TP1/TP2 leg).
 * @param {object} order
 * @param {string} [closeSide] Buy for shorts, Sell for longs
 * @returns {boolean}
 */
function isAlgoTpLimitOrder(
order,
closeSide =
""
){

if(
order?.orderKind !==
"limit" ||
order?.reduceOnly !==
true ||
!order?.orderId ||
!order?.symbol ||
!(
Number(
order?.price
) >
0
) ||
!isAlgoBotOrderLinkId(
order?.orderLinkId
)
){
return false;
}

return closeSide
? String(
order?.side ||
""
) ===
closeSide
: true;

}

function splitQtyByShares(
qty,
rules =
{},
tpShares
){

return allocateQtyByWeights(
qty,
rules,
normalizeTpShares(
tpShares?.[
0
],
tpShares?.[
1
],
tpShares?.[
2
]
)
);

}

function isAlgoBotOrderLinkId(
id
){

const value =
String(
id ||
""
).trim();

/* Only explicit algo bot prefixes (not every id starting with "a"). */
return (
value.startsWith(
"algo"
) ||
value.startsWith(
"algo-"
)
);

}

let orderLinkSeq =
0;

/**
 * Bybit rejects reused orderLinkId even after cancel («OrderLinkedID is duplicate»).
 * Fingerprint alone is stable across Quit/restart — always append a unique suffix.
 * @param {string} seed
 * @returns {string}
 */
function makeAlgoOrderLinkId(
seed
){

orderLinkSeq =
(
orderLinkSeq +
1
) %
1e6;
const uniq =
`${Date.now().toString(
36
)}${orderLinkSeq.toString(
36
)}`;
const raw =
String(
seed ||
"algo"
).replace(
/[^a-zA-Z0-9_-]/g,
""
) ||
"algo";
const maxSeed =
Math.max(
4,
36 -
uniq.length -
1
);

return `${raw.slice(
0,
maxSeed
)}_${uniq}`.slice(
0,
36
);

}

/**
 * Deterministic short digest — fingerprints are far longer than the 36-char
 * Bybit orderLinkId limit, so they cannot be embedded verbatim.
 * @param {string} seed
 * @returns {string}
 */
function shortDigest(
seed
){

const text =
String(
seed ||
""
);
let h1 =
0x811c9dc5;
let h2 =
0x01000193;

for(
let i =
0;
i <
text.length;
i++
){
const code =
text.charCodeAt(
i
);
h1 =
(
(
h1 ^
code
) *
0x01000193
) >>>
0;
h2 =
(
(
h2 +
code *
(
i +
1
)
) *
0x85ebca6b
) >>>
0;
}

return `${h1.toString(
36
)}${h2.toString(
36
)}`.slice(
0,
12
);

}

/**
 * Unique per-TP orderLinkId that survives the 36-char cap.
 * Index and nonce must never be truncated: identical ids made Bybit reject
 * TP2/TP3 as duplicates, leaving the position with TP1 only.
 */
function tpOrderLinkId(
meta,
symbol,
index
){

const digest =
shortDigest(
String(
meta?.fingerprint ||
symbol ||
"bot"
)
);
/*
 * Include placedAt so a later session after cancel does not reuse the
 * same Bybit orderLinkId (duplicate rejection).
 */
const nonce =
Number(
meta?.placedAt ||
meta?.tpLinkNonce ||
0
);
const nonceKey =
(
Number.isFinite(
nonce
) &&
nonce >
0
? Math.floor(
nonce
)
: 0
).toString(
36
);

return `algo-tp${index}-${digest}-${nonceKey}`.slice(
0,
36
);

}

function sleep(
ms
){

return new Promise(
resolve=>{
setTimeout(
resolve,
ms
);
}
);

}

function clampSlPct(
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
return 50;
}

return Math.min(
100,
Math.max(
1,
n
)
);

}

function clampTpRr(
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
return 2;
}

return Math.min(
50,
Math.max(
0.1,
n
)
);

}

function clampPartialTp(
raw,
fallback
){

const n =
Number(
raw
);

return Number.isFinite(
n
) &&
n >
0
? Math.min(
50,
Math.max(
0.01,
n
)
)
: fallback;

}

/** Трейлинг СЛ в X от pt4; старую настройку в % от X переводим: 15 → -0.15. */
function clampTrailSlX1(
rawX,
legacyPct
){

const raw =
rawX ===
undefined ||
rawX ===
null ||
rawX ===
""
? -Number(
legacyPct
) /
100
: rawX;
const n =
Number(
raw
);

return Number.isFinite(
n
)
? Math.min(
1,
Math.max(
-1,
Math.round(
n *
100
) /
100
)
)
: -0.25;

}

/** Трейлинг СЛ после ТП2: не ниже трейлинга после ТП1 и не выше максимального ТП. */
function clampTrailSlX2(
raw,
trailX1,
tpMults
){

const tps =
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
const lo =
Number(
trailX1
);
const hi =
Math.max(
lo,
tps.length
? Math.max(
...tps
)
: 1.44
);
const n =
Number(
raw
);

return Math.min(
hi,
Math.max(
lo,
Number.isFinite(
n
)
? Math.round(
n *
100
) /
100
: 0
)
);

}

function interpolateLogPrice(
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
return NaN;
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

function computeLogExtensionPrice(
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
return NaN;
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
return NaN;
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

function computePartialTpPrice(
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
 * Трейлинг-СЛ: X от pt4, где 1X = ход pt4↔pt3.
 * Минус — в сторону pt3 (убыток), плюс — в профит.
 * Значение приходит уже зажатым (ТП1 и ТП2 имеют разные границы).
 */
function computeTrailStopLoss(
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

/** СЛ двигается только в защитную сторону — назад не откатываем. */
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

function computeAlgoStopLoss(
side,
pt3,
pt4,
slPct
){

void side;

return interpolateLogPrice(
pt4,
pt3,
clampSlPct(
slPct
) /
100
);

}

/**
 * ТП Ст1 — линейный $ RR, как чарт/аналитика:
 * «1 к 2» ⇒ |TP−entry| = 2 × |entry−SL|.
 */
function computeAlgoTakeProfit(
side,
entry,
slPrice,
tpRr
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
return NaN;
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
return NaN;
}

const move =
riskDist *
rr;
const tp =
side ===
"short"
? entryN -
move
: entryN +
move;

return tp >
0
? tp
: NaN;

}

function calcVolumeFromRiskUsd(
entry,
slPrice,
riskUsd
){

const entryN =
Number(
entry
);
const sl =
Number(
slPrice
);
const risk =
Number(
riskUsd
);

if(
!Number.isFinite(
entryN
) ||
entryN <=
0 ||
!Number.isFinite(
sl
) ||
!Number.isFinite(
risk
) ||
risk <=
0
){
return null;
}

const stopDist =
Math.abs(
entryN -
sl
);

if(
!(
stopDist >
0
)
){
return null;
}

const volumeUsdt =
(
risk *
entryN
) /
stopDist;

if(
!Number.isFinite(
volumeUsdt
) ||
volumeUsdt <=
0
){
return null;
}

return volumeUsdt;

}

function isLeverageError(
result
){

const msg =
String(
result?.message ||
result?.data?.retMsg ||
""
).toLowerCase();

return (
msg.includes(
"leverage"
) ||
msg.includes(
"lever"
) ||
String(
result?.data?.retCode ||
""
) ===
"110043"
);

}

async function openWithLeverageRetry(
symbol,
side,
volumeUsdt
){

let result =
await algoRest.openPositionAtMarket(
symbol,
side,
volumeUsdt
);

if(
result?.ok !==
false
){
return result;
}

if(
!isLeverageError(
result
)
){
return result;
}

const settings =
await algoRest.getSymbolPositionSettings(
symbol
);

if(
!settings?.ok
){
return result;
}

const applyResult =
await algoRest.applySymbolPositionSettings(
symbol,
{
leverage:
settings.maxLeverage,
marginMode:
settings.marginMode ||
"cross"
}
);

if(
applyResult?.ok ===
false
){
return {
ok:
false,
message:
applyResult.message ||
result.message ||
"Leverage fix failed"
};
}

return algoRest.openPositionAtMarket(
symbol,
side,
volumeUsdt
);

}

async function placeTriggerWithLeverageRetry(
payload
){

let result =
await algoRest.placeTradeOrder(
payload
);

if(
result?.ok !==
false
){
return result;
}

if(
!isLeverageError(
result
)
){
return result;
}

const settings =
await algoRest.getSymbolPositionSettings(
payload.symbol
);

if(
!settings?.ok
){
return result;
}

const applyResult =
await algoRest.applySymbolPositionSettings(
payload.symbol,
{
leverage:
settings.maxLeverage,
marginMode:
settings.marginMode ||
"cross"
}
);

if(
applyResult?.ok ===
false
){
return {
ok:
false,
message:
applyResult.message ||
result.message ||
"Leverage fix failed"
};
}

return algoRest.placeTradeOrder(
payload
);

}

async function attachStops(
symbol,
slPrice,
tpPrice
){

const slResult =
await algoRest.setPositionStop(
symbol,
"sl",
slPrice
);

if(
slResult?.ok ===
false
){
return slResult;
}

await sleep(
120
);

return algoRest.setPositionStop(
symbol,
"tp",
tpPrice
);

}

function extractOrderId(
result
){

return String(
result?.data?.result?.orderId ||
result?.orderId ||
""
).trim();

}

/**
 * Position TP is used by every strategy: RR target for St1, the final level
 * for partial exits. A missing SL or TP must be re-attached.
 */
function positionMissingStops(
position
){

const sl =
Number(
position?.stopLoss
);
const tp =
Number(
position?.takeProfit
);

return !(
Number.isFinite(
sl
) &&
sl >
0
) ||
!(
Number.isFinite(
tp
) &&
tp >
0
);

}

/**
 * Position TP price for a stored setup: partial exits close the remainder at
 * their last level, single-target setups use the RR take profit.
 * @param {object} meta
 * @param {number} pt4
 * @param {number} slPrice
 * @returns {number}
 */
function resolveMetaTpPrice(
meta,
pt4,
slPrice
){

const stored =
Number(
meta?.tpPrice
);

if(
Number.isFinite(
stored
) &&
stored >
0
){
return stored;
}

const isPartial =
meta?.exitKind ===
"partial-x" ||
meta?.exitKind ===
"partial-y";
const prices =
Array.isArray(
meta?.tpPrices
)
? meta.tpPrices
: [];

if(
isPartial &&
prices.length
){
const last =
Number(
prices[
prices.length -
1
]
);

if(
Number.isFinite(
last
) &&
last >
0
){
return last;
}
}

return computeAlgoTakeProfit(
meta?.side ===
"short"
? "short"
: "long",
pt4,
slPrice,
meta?.tpRr
);

}

/**
 * Armed → trigger market at pt4.
 * @param {{
 *   symbol: string,
 *   side: "long"|"short",
 *   setup: object,
 *   slPct: number,
 *   tpRr: number,
 *   riskUsd: number,
 *   fingerprint?: string
 * }} payload
 */
async function placeBotTriggerEntry(
payload
){

const sym =
normalizeSymbol(
payload?.symbol
);
const side =
payload?.side ===
"short"
? "short"
: "long";
const setup =
payload?.setup ||
{};
const slPct =
Number(
payload?.slPct
);
const tpRr =
Number(
payload?.tpRr
);
const exitProfile =
payload?.exitProfile &&
typeof payload.exitProfile ===
"object"
? payload.exitProfile
: {
kind:
"rr",
tpRr
};
const riskUsd =
Number(
payload?.riskUsd
);
const fingerprint =
String(
payload?.fingerprint ||
""
);

if(
!sym
){
return {
ok:
false,
message:
"symbol required"
};
}

const oppositeMirror =
payload?.oppositeMirror ===
true;
const existingPrimary =
pendingTriggers.get(
sym
);
const existingMirror =
pendingMirrorTriggers.get(
sym
);

if(
entryInflight.has(
sym
) ||
pendingEntries.has(
sym
)
){
return {
ok:
false,
message:
"trigger already pending"
};
}

if(
oppositeMirror
){
if(
!existingPrimary ||
existingMirror ||
existingPrimary.side ===
side
){
return {
ok:
false,
message:
"opposite mirror not allowed"
};
}
}else if(
existingPrimary ||
existingMirror
){
return {
ok:
false,
message:
"trigger already pending"
};
}

entryInflight.add(
sym
);

try{
const pt3 =
Number(
setup.p3
);
const pt4 =
Number(
setup.p4
);
const triggerPriceRaw =
Number(
payload?.triggerPrice
);
const orderPrice =
Number.isFinite(
triggerPriceRaw
) &&
triggerPriceRaw >
0
? triggerPriceRaw
: pt4;
const slPrice =
computeAlgoStopLoss(
side,
pt3,
pt4,
slPct
);

if(
!Number.isFinite(
slPrice
) ||
!Number.isFinite(
pt4
) ||
pt4 <=
0
){
return {
ok:
false,
message:
"SL/pt4 invalid"
};
}

const volumeUsdt =
calcVolumeFromRiskUsd(
pt4,
slPrice,
riskUsd
);

if(
!volumeUsdt
){
return {
ok:
false,
message:
"Volume too small"
};
}

const ticker =
await algoRest.getTickerPrices(
sym
);
const markPrice =
Number(
ticker?.mark ||
ticker?.last ||
pt4
);

const kind =
side ===
"short"
? "sell-stop"
: "buy-stop";
const orderLinkId =
makeAlgoOrderLinkId(
fingerprint
? `algo-${fingerprint}`
: `algo-${Date.now()}`
);

const orderResult =
await placeTriggerWithLeverageRetry(
{
symbol:
sym,
kind,
price:
orderPrice,
volumeUsdt,
orderLinkId,
markPrice:
Number.isFinite(
markPrice
) &&
markPrice >
0
? markPrice
: orderPrice
}
);

if(
orderResult?.ok ===
false
){
return orderResult;
}

const orderId =
extractOrderId(
orderResult
);

if(
!orderId
){
return {
ok:
false,
message:
"Trigger placed but orderId missing"
};
}

const isPartial =
exitProfile.kind ===
"partial-x" ||
exitProfile.kind ===
"partial-y";
const spanA =
exitProfile.kind ===
"partial-y"
? Number(
setup.p1
)
: pt3;
const spanB =
exitProfile.kind ===
"partial-y"
? Number(
setup.p2
)
: pt4;
const tpBase =
exitProfile.kind ===
"partial-y"
? Number(
setup.p2
)
: pt4;

if(
isPartial &&
(
!Number.isFinite(
tpBase
) ||
!(
tpBase >
0
) ||
!Number.isFinite(
spanA
) ||
!Number.isFinite(
spanB
)
)
){
return {
ok:
false,
message:
"TP base/span invalid"
};
}

const tpPrices =
isPartial
? [
computePartialTpPrice(
side,
tpBase,
spanA,
spanB,
clampPartialTp(
exitProfile.tp1,
1
)
),
computePartialTpPrice(
side,
tpBase,
spanA,
spanB,
clampPartialTp(
exitProfile.tp2,
1.25
)
),
computePartialTpPrice(
side,
tpBase,
spanA,
spanB,
clampPartialTp(
exitProfile.tp3,
1.44
)
)
]
: [];
/* Partial exits close the remainder with a position TP at the last level. */
const tpPrice =
isPartial
? tpPrices[
tpPrices.length -
1
]
: computeAlgoTakeProfit(
side,
pt4,
slPrice,
tpRr
);

if(
isPartial
? !tpPrices.every(
Number.isFinite
)
: !Number.isFinite(
tpPrice
)
){
return {
ok:
false,
message:
"TP invalid"
};
}

const meta =
{
orderId,
fingerprint,
side,
slPrice,
tpPrice,
tpRr:
clampTpRr(
tpRr
),
exitKind:
isPartial
? exitProfile.kind
: "rr",
tpPrices,
trailSl:
!!exitProfile.trailSl,
trailSlX1:
clampTrailSlX1(
exitProfile.trailSlX1,
exitProfile.trailSlPct
),
trailSlX2:
clampTrailSlX2(
exitProfile.trailSlX2,
clampTrailSlX1(
exitProfile.trailSlX1,
exitProfile.trailSlPct
),
[
exitProfile.tp1,
exitProfile.tp2,
exitProfile.tp3
]
),
shares:
normalizeTpShares(
exitProfile.share1,
exitProfile.share2,
exitProfile.share3
),
pt3,
slPct:
clampSlPct(
slPct
),
riskUsd,
setup,
volumeUsdt,
pt4,
triggerPrice:
orderPrice,
oppositeMirror:
!!oppositeMirror,
mirrorParentFingerprint:
String(
payload?.mirrorParentFingerprint ||
""
),
placedAt:
Date.now(),
stopsAttached:
false,
stopsManagedByUser:
false
};

if(
oppositeMirror
){
pendingMirrorTriggers.set(
sym,
meta
);
}else{
pendingTriggers.set(
sym,
meta
);
}

persistPendingState();

return {
ok:
true,
orderId,
symbol:
sym,
side,
slPrice,
volumeUsdt,
pt4
};
}finally{
entryInflight.delete(
sym
);
}

}

function findPendingMeta(
sym,
opts =
{}
){

const fingerprint =
String(
opts.fingerprint ||
""
).trim();
const primary =
pendingTriggers.get(
sym
);
const mirror =
pendingMirrorTriggers.get(
sym
);

if(
fingerprint
){
if(
primary &&
String(
primary.fingerprint ||
""
) ===
fingerprint
){
return {
meta:
primary,
slot:
"primary"
};
}

if(
mirror &&
String(
mirror.fingerprint ||
""
) ===
fingerprint
){
return {
meta:
mirror,
slot:
"mirror"
};
}

return null;
}

if(
opts.preferMirror
){
if(
mirror
){
return {
meta:
mirror,
slot:
"mirror"
};
}

if(
primary
){
return {
meta:
primary,
slot:
"primary"
};
}

return null;
}

if(
primary
){
return {
meta:
primary,
slot:
"primary"
};
}

if(
mirror
){
return {
meta:
mirror,
slot:
"mirror"
};
}

return null;

}

function deletePendingSlot(
sym,
slot
){

if(
slot ===
"mirror"
){
pendingMirrorTriggers.delete(
sym
);
}else{
pendingTriggers.delete(
sym
);
}

}

async function cancelBotTrigger(
symbol,
opts =
{}
){

const sym =
normalizeSymbol(
symbol
);
const found =
findPendingMeta(
sym,
opts
);

if(
!found?.meta
){
return {
ok:
true,
alreadyGone:
true
};
}

const meta =
found.meta;
const result =
await algoRest.cancelTradeOrder(
sym,
meta.orderId
);

if(
result?.ok ===
false
){
const msg =
String(
result?.message ||
""
).toLowerCase();

if(
msg.includes(
"not exist"
) ||
msg.includes(
"not found"
) ||
msg.includes(
"cancelled"
) ||
msg.includes(
"canceled"
)
){
deletePendingSlot(
sym,
found.slot
);
persistPendingState();
return {
ok:
true,
alreadyGone:
true
};
}

return result;
}

deletePendingSlot(
sym,
found.slot
);
persistPendingState();

return {
ok:
true,
orderId:
meta.orderId
};

}

async function cancelSiblingTriggers(
symbol,
keepFingerprint =
""
){

const sym =
normalizeSymbol(
symbol
);
const keep =
String(
keepFingerprint ||
""
).trim();
const results =
[];

for(
const slot of [
"primary",
"mirror"
]
){
const map =
slot ===
"mirror"
? pendingMirrorTriggers
: pendingTriggers;
const meta =
map.get(
sym
);

if(
!meta
){
continue;
}

if(
keep &&
String(
meta.fingerprint ||
""
) ===
keep
){
continue;
}

results.push(
await cancelBotTrigger(
sym,
{
fingerprint:
meta.fingerprint,
preferMirror:
slot ===
"mirror"
}
)
);
}

return results;

}

async function cancelAllBotTriggers(){

const symbols =
new Set(
[
...pendingTriggers.keys(),
...pendingMirrorTriggers.keys()
]
);
const results =
[];

for(
const sym of symbols
){
const primary =
pendingTriggers.get(
sym
);
const mirror =
pendingMirrorTriggers.get(
sym
);

if(
primary
){
results.push(
await cancelBotTrigger(
sym,
{
fingerprint:
primary.fingerprint
}
)
);
}

if(
mirror
){
results.push(
await cancelBotTrigger(
sym,
{
fingerprint:
mirror.fingerprint,
preferMirror:
true
}
)
);
}
}

return results;

}

/**
 * Cancel every conditional stop (Buy/Sell Stop) on the algo account.
 * Used on bot start so orphaned triggers after Quit do not linger.
 */
/**
 * Cancel one bot order, treating «already gone» answers as success.
 * @returns {Promise<{ok: boolean, message?: string}>}
 */
async function cancelBotOrderSoft(
symbol,
orderId
){

const cancelResult =
await algoRest.cancelTradeOrder(
symbol,
orderId
);

if(
cancelResult?.ok !==
false
){
return {
ok:
true
};
}

const msg =
String(
cancelResult?.message ||
""
).toLowerCase();

if(
msg.includes(
"not exist"
) ||
msg.includes(
"not found"
) ||
msg.includes(
"cancelled"
) ||
msg.includes(
"canceled"
)
){
return {
ok:
true
};
}

return {
ok:
false,
message:
cancelResult?.message ||
"cancel failed"
};

}

/**
 * Drop the reduce-only TP legs of one symbol — used once its position is gone,
 * otherwise unfilled TP1/TP2 would linger on the exchange.
 * @param {string} symbol
 * @returns {Promise<{ok: boolean, cancelled: number, total: number, message?: string}>}
 */
async function cancelPartialTpLimits(
symbol
){

const sym =
normalizeSymbol(
symbol
);

if(
!sym
){
return {
ok:
false,
cancelled:
0,
total:
0,
message:
"symbol required"
};
}

const result =
await algoRest.getOpenOrders(
{
symbol:
sym
}
);

if(
result?.ok ===
false
){
return {
ok:
false,
cancelled:
0,
total:
0,
message:
result?.message ||
"getOpenOrders failed"
};
}

const legs =
(
result?.orders ||
[]
).filter(
order=>
isAlgoTpLimitOrder(
order
)
);
const errors =
[];
let cancelled =
0;

for(
const order of legs
){
const dropped =
await cancelBotOrderSoft(
order.symbol,
order.orderId
);

if(
dropped.ok
){
cancelled +=
1;
continue;
}

errors.push(
`${order.symbol}: ${dropped.message}`
);
}

return {
ok:
errors.length ===
0,
cancelled,
total:
legs.length,
message:
errors.length
? errors.slice(
0,
3
).join(
"; "
)
: undefined
};

}

/**
 * Reduce-only TP legs whose position no longer exists. Legs of a live position
 * stay untouched — they are the active take profits.
 * @returns {Promise<{ok: boolean, cancelled: number, total: number, message?: string}>}
 */
async function cancelOrphanTpLimits(){

const [
ordersResult,
positionsResult
] =
await Promise.all(
[
algoRest.getOpenOrders(),
algoRest.getPositions()
]
);

if(
ordersResult?.ok ===
false
){
return {
ok:
false,
cancelled:
0,
total:
0,
message:
ordersResult?.message ||
"getOpenOrders failed"
};
}

if(
positionsResult?.ok ===
false
){
/* Without the position list we cannot tell active legs from orphans. */
return {
ok:
false,
cancelled:
0,
total:
0,
message:
positionsResult?.message ||
"getPositions failed"
};
}

const openSymbols =
new Set(
(
positionsResult?.positions ||
[]
).filter(
position=>
Math.abs(
Number(
position?.size ||
0
)
) >
0
).map(
position=>
normalizeSymbol(
position?.symbol
)
)
);
const orphans =
(
ordersResult?.orders ||
[]
).filter(
order=>
isAlgoTpLimitOrder(
order
) &&
!openSymbols.has(
normalizeSymbol(
order?.symbol
)
)
);
const errors =
[];
let cancelled =
0;

for(
const order of orphans
){
const dropped =
await cancelBotOrderSoft(
order.symbol,
order.orderId
);

if(
dropped.ok
){
cancelled +=
1;
continue;
}

errors.push(
`${order.symbol}: ${dropped.message}`
);
}

return {
ok:
errors.length ===
0,
cancelled,
total:
orphans.length,
message:
errors.length
? errors.slice(
0,
3
).join(
"; "
)
: undefined
};

}

async function cancelAllOpenTriggerOrders(){

const result =
await algoRest.getOpenOrders();

if(
result?.ok ===
false
){
return {
ok:
false,
message:
result?.message ||
"getOpenOrders failed",
cancelled:
0
};
}

const stops =
(
result?.orders ||
[]
).filter(
order=>
order?.orderKind ===
"stop" &&
order?.orderId &&
order?.symbol &&
isAlgoBotOrderLinkId(
order?.orderLinkId
)
);

let cancelled =
0;
const errors =
[];

for(
const order of stops
){

const dropped =
await cancelBotOrderSoft(
order.symbol,
order.orderId
);

if(
!dropped.ok
){
errors.push(
`${order.symbol}: ${dropped.message}`
);
continue;
}

cancelled +=
1;
pendingTriggers.delete(
normalizeSymbol(
order.symbol
)
);

}

persistPendingState();

/* TP legs without a position are orphans too (bot start / stop cleanup). */
const orphanLegs =
await cancelOrphanTpLimits();

if(
orphanLegs.message
){
errors.push(
orphanLegs.message
);
}

return {
ok:
errors.length ===
0,
cancelled:
cancelled +
orphanLegs.cancelled,
total:
stops.length +
orphanLegs.total,
message:
errors.length
? errors.slice(
0,
3
).join(
"; "
)
: undefined
};

}

/**
 * After trigger fill: attach SL/TP from pt3/pt4 plan (not fill slip).
 */
/**
 * Reduce-only limit legs of a partial exit (TP1/TP2).
 * The final TP is a position-level take profit in Full mode, so it is not an
 * order here — it closes whatever is left after these legs.
 * Adopts legs already on the exchange and places the missing ones.
 * @param {{symbol: string, meta: object, position?: object}} payload
 * @returns {Promise<{ok: boolean, placed: number, missing: number[], message?: string, tpOrderIds: string[], entryQty: number}>}
 */
async function ensurePartialTpLimits(
payload
){

const sym =
normalizeSymbol(
payload?.symbol
);
const meta =
payload?.meta ||
{};
const prices =
(
Array.isArray(
meta.tpPrices
)
? meta.tpPrices
: []
).map(
Number
);
const tpOrderIds =
Array.isArray(
meta.tpOrderIds
)
? [
...meta.tpOrderIds
]
: [];
const tpQtys =
Array.isArray(
meta.tpQtys
)
? [
...meta.tpQtys
]
: [];
/* Last price is served by the position TP — only earlier legs are orders. */
const legCount =
Math.max(
0,
prices.length -
1
);

if(
!sym ||
!legCount ||
!prices.every(
price=>
Number.isFinite(
price
) &&
price >
0
)
){
return {
ok:
false,
placed:
0,
missing:
[],
message:
"TP prices invalid",
tpOrderIds,
tpQtys,
entryQty:
0
};
}

const closeSide =
meta.side ===
"short"
? "Buy"
: "Sell";
const closeKind =
meta.side ===
"short"
? "buy-limit"
: "sell-limit";
const livePosition =
Number(
payload?.position?.size
)
? payload.position
: (
await algoRest.getPosition(
sym
)
)?.position;
const liveQty =
Math.abs(
Number(
livePosition?.size ||
0
)
);

if(
!(
liveQty >
0
)
){
return {
ok:
false,
placed:
0,
missing:
[],
message:
"position is closed",
tpOrderIds,
tpQtys,
entryQty:
0
};
}

const openOrders =
await algoRest.getOpenOrders(
{
symbol:
sym
}
);

if(
openOrders?.ok ===
false
){
return {
ok:
false,
placed:
0,
missing:
[],
message:
openOrders?.message ||
"getOpenOrders failed",
tpOrderIds,
tpQtys,
entryQty:
liveQty
};
}

const liveTpOrders =
(
openOrders?.orders ||
[]
).filter(
order=>
isAlgoTpLimitOrder(
order,
closeSide
)
);
const byLinkId =
new Map(
liveTpOrders.map(
order=>[
String(
order?.orderLinkId ||
""
),
order
]
)
);
const byOrderId =
new Map(
liveTpOrders.map(
order=>[
String(
order?.orderId ||
""
),
order
]
)
);
const claimed =
new Set();

/* Adopt live orders: exact linkId, remembered id, then nearest price. */
const adopted =
prices.slice(
0,
legCount
).map(
(
price,
index
)=>{
const linkId =
tpOrderLinkId(
meta,
sym,
index
);
const byLink =
byLinkId.get(
linkId
);

if(
byLink &&
!claimed.has(
String(
byLink.orderId
)
)
){
claimed.add(
String(
byLink.orderId
)
);
return byLink;
}

const remembered =
byOrderId.get(
String(
tpOrderIds[
index
] ||
""
)
);

if(
remembered &&
!claimed.has(
String(
remembered.orderId
)
)
){
claimed.add(
String(
remembered.orderId
)
);
return remembered;
}

let best =
null;
let bestDiff =
Infinity;

for(
const order of liveTpOrders
){

if(
claimed.has(
String(
order.orderId
)
)
){
continue;
}

const diff =
Math.abs(
Number(
order.price
) -
price
) /
Math.max(
price,
1e-9
);

if(
diff <
bestDiff
){
bestDiff =
diff;
best =
order;
}
}

if(
best &&
bestDiff <=
0.002
){
claimed.add(
String(
best.orderId
)
);
return best;
}

return null;
}
);

const tpsHit =
Math.max(
0,
Math.min(
prices.length,
Number(
meta.tpsHit
) ||
0
)
);
const pending =
[];
let reserved =
0;

for(
let i =
0;
i <
legCount;
i++
){

if(
adopted[
i
]
){
tpOrderIds[
i
]=
String(
adopted[
i
].orderId ||
""
);
tpQtys[
i
]=
Number(
tpQtys[
i
]
) >
0
? Number(
tpQtys[
i
]
)
: Math.abs(
Number(
adopted[
i
].qty ||
0
)
);
reserved +=
restingOrderQty(
adopted[
i
]
);
continue;
}

if(
i <
tpsHit
){
/* Already taken profit — nothing to restore. */
continue;
}

pending.push(
i
);
}

if(
!pending.length
){
return {
ok:
true,
placed:
0,
missing:
[],
tpOrderIds,
tpQtys,
entryQty:
liveQty
};
}

const rules =
await algoRest.getInstrumentRules(
sym
);
const shares =
normalizeTpShares(
meta.shares?.[
0
],
meta.shares?.[
1
],
meta.shares?.[
2
]
);
const baseQty =
Math.max(
Number(
meta.initialQty
) ||
0,
liveQty
);
const qtyDecimals =
String(
rules?.qtyStep ||
""
).split(
"."
)[
1
]?.length ||
0;
const errors =
[];
const missing =
[];
let placedCount =
0;
let freeQty =
Math.max(
0,
liveQty -
reserved
);

for(
const index of pending
){
const planned =
floorQtyToStep(
(
baseQty *
(
shares[
index
] ||
0
)
) /
100,
rules
);
const qty =
Math.min(
planned,
floorQtyToStep(
freeQty,
rules
)
);

if(
!(
qty >
0
) ||
!(
qty >=
Number(
rules?.minOrderQty ||
0
)
)
){
missing.push(
index
);
errors.push(
`TP${index +
1}: quantity below the exchange minimum`
);
continue;
}

const placed =
await placeTriggerWithLeverageRetry(
{
symbol:
sym,
kind:
closeKind,
price:
prices[
index
],
qty:
algoRest.formatQtyValue(
qty,
qtyDecimals
),
forceReduceOnly:
true,
orderLinkId:
tpOrderLinkId(
meta,
sym,
index
)
}
);

if(
placed?.ok ===
false
){
missing.push(
index
);
errors.push(
`TP${index +
1}: ${placed?.message ||
"error"}`
);
continue;
}

tpOrderIds[
index
]=
extractOrderId(
placed
);
tpQtys[
index
]=
qty;
freeQty =
Math.max(
0,
freeQty -
qty
);
placedCount +=
1;
}

return {
ok:
!missing.length,
placed:
placedCount,
missing,
message:
errors.length
? errors.join(
"; "
)
: undefined,
tpOrderIds,
tpQtys,
entryQty:
liveQty
};

}

async function finalizeTriggerFill(
symbol,
position
){

const sym =
normalizeSymbol(
symbol
);
const posSide =
String(
position?.side ||
""
).toLowerCase() ===
"sell"
? "short"
: String(
position?.side ||
""
).toLowerCase() ===
"buy"
? "long"
: "";
const primary =
pendingTriggers.get(
sym
);
const mirror =
pendingMirrorTriggers.get(
sym
);
let meta =
null;
let metaSlot =
"";

if(
posSide
){
if(
primary &&
primary.side ===
posSide
){
meta =
primary;
metaSlot =
"primary";
}else if(
mirror &&
mirror.side ===
posSide
){
meta =
mirror;
metaSlot =
"mirror";
}
}

if(
!meta
){
meta =
primary ||
mirror ||
pendingEntries.get(
sym
);
metaSlot =
primary
? "primary"
: mirror
? "mirror"
: "entry";
}

if(
!meta
){
return {
ok:
false,
message:
"no trigger meta"
};
}

const filledFingerprint =
String(
meta.fingerprint ||
""
);

const fillPrice =
Number(
position?.avgPrice ||
meta.pt4
);
const pt4 =
Number(
meta.pt4
);
const slPrice =
Number(
meta.slPrice
);
const isPartial =
meta.exitKind ===
"partial-x" ||
meta.exitKind ===
"partial-y";
const tpPrice =
resolveMetaTpPrice(
meta,
pt4,
slPrice
);

if(
!Number.isFinite(
pt4
) ||
pt4 <=
0 ||
!Number.isFinite(
slPrice
) ||
!Number.isFinite(
tpPrice
)
){
return {
ok:
false,
message:
"pt4/SL/TP invalid"
};
}

/* Partial exits get the same position TP — it closes the whole remainder. */
const stopsResult =
await attachStops(
sym,
slPrice,
tpPrice
);

const tpOrderIds =
Array.isArray(
meta.tpOrderIds
)
? [
...meta.tpOrderIds
]
: [];
let tpsOk =
true;
let tpsMessage;

if(
isPartial &&
stopsResult?.ok !==
false
){
meta.entryQty =
Math.abs(
Number(
position?.size ||
meta.entryQty
)
) ||
Number(
meta.entryQty
) ||
0;
meta.initialQty =
meta.entryQty;
meta.tpOrderIds =
tpOrderIds;
pendingTriggers.set(
sym,
meta
);
persistPendingState();

const tpResult =
await ensurePartialTpLimits(
{
symbol:
sym,
meta,
position
}
);

if(
Array.isArray(
tpResult.tpOrderIds
)
){
tpOrderIds.length =
0;
tpOrderIds.push(
...tpResult.tpOrderIds
);
}

if(
Array.isArray(
tpResult.tpQtys
)
){
meta.tpQtys =
tpResult.tpQtys;
}

if(
tpResult.entryQty >
0
){
meta.entryQty =
tpResult.entryQty;
meta.initialQty =
tpResult.entryQty;
}

meta.tpOrderIds =
tpOrderIds;
pendingTriggers.set(
sym,
meta
);
persistPendingState();

/*
 * Missing TP legs are not fatal: the position already carries SL and the
 * final position TP, so let reconcileTriggersAndStops place what is left.
 */
tpsOk =
tpResult.ok;
tpsMessage =
tpResult.message;
}

if(
metaSlot ===
"mirror"
){
pendingMirrorTriggers.delete(
sym
);
}else if(
metaSlot ===
"primary"
){
pendingTriggers.delete(
sym
);
}

await cancelSiblingTriggers(
sym,
filledFingerprint
);

pendingEntries.set(
sym,
{
side:
meta.side,
openedAt:
Date.now(),
riskUsd:
meta.riskUsd,
tpRr:
meta.tpRr,
slPrice,
tpPrice,
exitKind:
meta.exitKind ||
"rr",
tpPrices:
meta.tpPrices ||
[],
tpOrderIds,
tpsHit:
0,
trailSl:
!!meta.trailSl,
trailSlX1:
meta.trailSlX1,
trailSlX2:
meta.trailSlX2,
shares:
normalizeTpShares(
meta.shares?.[
0
],
meta.shares?.[
1
],
meta.shares?.[
2
]
),
pt3:
meta.pt3,
initialQty:
Number(
meta.entryQty ||
position?.size
) ||
0,
entryQty:
Number(
meta.entryQty ||
position?.size
) ||
0,
volumeUsdt:
meta.volumeUsdt,
pt4,
setup:
meta.setup,
fillPrice:
Number.isFinite(
fillPrice
) &&
fillPrice >
0
? fillPrice
: pt4,
stopsAttached:
stopsResult?.ok !==
false,
stopsManagedByUser:
false
}
);
persistPendingState();

return {
ok:
true,
symbol:
sym,
side:
meta.side,
entry:
pt4,
fillPrice,
slPrice,
tpPrice,
tpPrices:
meta.tpPrices ||
[],
stopsOk:
stopsResult?.ok !==
false &&
tpsOk,
stopsMessage:
stopsResult?.message ||
tpsMessage,
tpsOk,
tpsMessage,
fingerprint:
filledFingerprint
};

}

/**
 * Ensure SL/TP on open positions (after fill + periodic safety).
 * @param {Array} positions
 */
async function reconcileTriggersAndStops(
positions
){

const list =
Array.isArray(
positions
)
? positions
: [];
const openBySym =
new Map();

for(
const pos of list
){

const sym =
normalizeSymbol(
pos?.symbol
);

if(
!sym
){
continue;
}

openBySym.set(
sym,
pos
);

}

const reports =
[];
const openOrdersResult =
await algoRest.getOpenOrders();
const openOrderIds =
new Set(
(
openOrdersResult?.orders ||
[]
).map(
row=>String(
row?.orderId ||
""
)
)
);

const pendingSyms =
new Set(
[
...pendingTriggers.keys(),
...pendingMirrorTriggers.keys()
]
);

for(
const sym of pendingSyms
){

const pos =
openBySym.get(
sym
);

if(
!pos
){
continue;
}

const done =
await finalizeTriggerFill(
sym,
pos
);
reports.push(
{
symbol:
sym,
action:
"finalize-fill",
...done
}
);

}

for(
const [
sym,
pos
] of openBySym
){

let meta =
pendingEntries.get(
sym
);

if(
!meta?.slPrice
){
meta =
pendingTriggers.get(
sym
);
}

if(
meta?.exitKind ===
"partial-x" ||
meta?.exitKind ===
"partial-y"
){
const initialQty =
Number(
meta.initialQty
);
const liveQty =
Math.abs(
Number(
pos?.size
)
);
/*
 * Closed quantity is the only trustworthy fill signal: an order id that
 * disappeared may have been cancelled outside the bot, and counting it as a
 * take profit would block the restore below.
 */
const sizeHits =
countTpsHitByClosedQty(
initialQty,
liveQty,
meta.shares,
meta.tpQtys
);
const tpsHit =
Math.max(
Number(
meta.tpsHit
) ||
0,
sizeHits
);

if(
tpsHit >
(Number(
meta.tpsHit
) ||
0) &&
meta.trailSl
){
const nextSl =
pickProtectiveStopLoss(
meta.side,
Number(
meta.slPrice
),
computeTrailStopLoss(
meta.side,
meta.pt3,
meta.pt4,
tpsHit >=
2
? meta.trailSlX2
: meta.trailSlX1
)
);

if(
Number.isFinite(
nextSl
) &&
nextSl !==
Number(
meta.slPrice
)
){
const amend =
await algoRest.setPositionStop(
sym,
"sl",
nextSl
);

if(
amend?.ok !==
false
){
/*
 * Position snapshots of this cycle still carry the old SL, so remember it:
 * otherwise our own trail looks like a manual edit and the bot stops
 * managing the stops.
 */
meta.prevSlPrice =
Number(
meta.slPrice
);
meta.slPrice =
nextSl;
}
}
}

meta.tpsHit =
tpsHit;

/*
 * A TP leg that never made it to the exchange (or was cancelled outside the
 * bot) would otherwise leave part of the position without a take profit.
 * The last level is the position TP, so only earlier legs are orders.
 */
const expectedLegs =
Math.max(
0,
(
Array.isArray(
meta.tpPrices
)
? meta.tpPrices
: []
).length -
1
);
const liveTpIds =
(
meta.tpOrderIds ||
[]
).filter(
(
id,
index
)=>
index >=
tpsHit &&
index <
expectedLegs &&
id &&
openOrderIds.has(
String(
id
)
)
).length;

if(
liveQty >
0 &&
expectedLegs >
tpsHit &&
liveTpIds <
expectedLegs -
tpsHit
){
const restored =
await ensurePartialTpLimits(
{
symbol:
sym,
meta,
position:
pos
}
);

if(
Array.isArray(
restored.tpOrderIds
)
){
meta.tpOrderIds =
restored.tpOrderIds;
}

if(
Array.isArray(
restored.tpQtys
)
){
meta.tpQtys =
restored.tpQtys;
}

if(
restored.placed >
0 ||
restored.ok ===
false
){
reports.push(
{
symbol:
sym,
action:
"restore-tps",
ok:
restored.ok,
message:
restored.message ||
`restored ${restored.placed} TP order(s)`
}
);
}
}

pendingEntries.set(
sym,
{
...meta,
tpsHit
}
);
}

if(
meta &&
!positionMissingStops(
pos
)
){
const liveSl =
Number(
pos.stopLoss
);
const liveTp =
Number(
pos.takeProfit
);
const plannedSl =
Number(
meta.slPrice
);
const plannedTp =
Number(
meta.tpPrice
);
const prevSl =
Number(
meta.prevSlPrice
);
const matchesSl =
target=>
Number.isFinite(
target
) &&
Number.isFinite(
liveSl
) &&
Math.abs(
liveSl -
target
) /
Math.max(
Math.abs(
target
),
1e-9
) <=
0.0005;
const moved =
(
Number.isFinite(
plannedSl
) &&
Number.isFinite(
liveSl
) &&
!matchesSl(
plannedSl
) &&
!matchesSl(
prevSl
)
) ||
(
Number.isFinite(
plannedTp
) &&
Number.isFinite(
liveTp
) &&
Math.abs(
liveTp -
plannedTp
) /
Math.max(
Math.abs(
plannedTp
),
1e-9
) >
0.0005
);

pendingEntries.set(
sym,
{
...meta,
stopsAttached:
true,
/* Trail confirmed on the exchange — drop the tolerated old value. */
prevSlPrice:
matchesSl(
plannedSl
)
? undefined
: meta.prevSlPrice,
stopsManagedByUser:
!!(
meta.stopsManagedByUser ||
moved
)
}
);
pendingTriggers.delete(
sym
);
continue;
}

if(
!positionMissingStops(
pos
)
){
continue;
}

if(
meta?.stopsManagedByUser
){
reports.push(
{
symbol:
sym,
action:
"skip-stops",
ok:
true,
message:
"user/manual SL-TP — bot will not overwrite"
}
);
continue;
}

if(
!meta?.slPrice
){
reports.push(
{
symbol:
sym,
action:
"missing-stops",
ok:
false,
message:
"no bot meta for SL/TP"
}
);
continue;
}

const pt4 =
Number(
meta.pt4
);
const slPrice =
Number(
meta.slPrice
);
const tpPrice =
resolveMetaTpPrice(
meta,
pt4,
slPrice
);

if(
!Number.isFinite(
tpPrice
)
){
reports.push(
{
symbol:
sym,
action:
"missing-stops",
ok:
false,
message:
"cannot compute TP"
}
);
continue;
}

const stopsResult =
await attachStops(
sym,
slPrice,
tpPrice
);

if(
stopsResult?.ok !==
false
){
pendingEntries.set(
sym,
{
...meta,
slPrice,
tpPrice,
pt4:
Number.isFinite(
pt4
)
? pt4
: meta.pt4,
openedAt:
meta.openedAt ||
Date.now(),
stopsAttached:
true,
stopsManagedByUser:
false
}
);
pendingTriggers.delete(
sym
);
}

reports.push(
{
symbol:
sym,
action:
"attach-stops",
ok:
stopsResult?.ok !==
false,
message:
stopsResult?.message,
slPrice,
tpPrice
}
);

}

/*
 * TP legs of a position that is already closed (stop-out, manual close, meta
 * lost across restarts). Reuses the lists above — no extra REST calls.
 */
const liveSymbols =
new Set(
list.filter(
pos=>
Math.abs(
Number(
pos?.size ||
0
)
) >
0
).map(
pos=>
normalizeSymbol(
pos?.symbol
)
)
);

for(
const order of openOrdersResult?.orders ||
[]
){

if(
!isAlgoTpLimitOrder(
order
) ||
liveSymbols.has(
normalizeSymbol(
order?.symbol
)
)
){
continue;
}

const dropped =
await cancelBotOrderSoft(
order.symbol,
order.orderId
);
reports.push(
{
symbol:
normalizeSymbol(
order.symbol
),
action:
"cancel-orphan-tp",
ok:
dropped.ok,
message:
dropped.message
}
);

}

persistPendingState();
return reports;

}

function hasPendingTrigger(
symbol
){

const sym =
normalizeSymbol(
symbol
);

return pendingTriggers.has(
sym
) ||
pendingMirrorTriggers.has(
sym
);

}

function hasOppositeMirrorPending(
symbol
){

return pendingMirrorTriggers.has(
normalizeSymbol(
symbol
)
);

}

function getPendingTrigger(
symbol
){

const sym =
normalizeSymbol(
symbol
);

return pendingTriggers.get(
sym
) ||
pendingMirrorTriggers.get(
sym
) ||
null;

}

function canPlaceOppositeMirrorTrigger(
symbol,
side
){

const sym =
normalizeSymbol(
symbol
);
const primary =
pendingTriggers.get(
sym
);
const mirror =
pendingMirrorTriggers.get(
sym
);
const want =
side ===
"short"
? "short"
: "long";

return !!(
primary &&
!mirror &&
primary.side &&
primary.side !==
want
);

}

/**
 * Legacy market entry (kept for fallback / tests).
 * Prefer placeBotTriggerEntry + finalizeTriggerFill.
 */
async function executeBotEntry(
payload
){

const sym =
normalizeSymbol(
payload?.symbol
);
const side =
payload?.side ===
"short"
? "short"
: "long";
const setup =
payload?.setup ||
{};
const slPct =
Number(
payload?.slPct
);
const tpRr =
Number(
payload?.tpRr
);
const riskUsd =
Number(
payload?.riskUsd
);

if(
!sym
){
return {
ok:
false,
message:
"symbol required"
};
}

if(
entryInflight.has(
sym
)
){
return {
ok:
false,
message:
"entry inflight"
};
}

entryInflight.add(
sym
);

try{
const pt3 =
Number(
setup.p3
);
const pt4 =
Number(
setup.p4
);
const slPrice =
computeAlgoStopLoss(
side,
pt3,
pt4,
slPct
);

if(
!Number.isFinite(
slPrice
)
){
return {
ok:
false,
message:
"SL price invalid"
};
}

const volumeUsdt =
calcVolumeFromRiskUsd(
pt4,
slPrice,
riskUsd
);

if(
!volumeUsdt
){
return {
ok:
false,
message:
"Volume too small"
};
}

const orderSide =
side ===
"short"
? "Sell"
: "Buy";
const openResult =
await openWithLeverageRetry(
sym,
orderSide,
volumeUsdt
);

if(
openResult?.ok ===
false
){
return openResult;
}

const position =
openResult?.position;
const entry =
Number(
position?.avgPrice ||
pt4
);

if(
!position ||
!Number.isFinite(
entry
) ||
entry <=
0
){
return {
ok:
false,
message:
"Position not confirmed after market order"
};
}

const tpPrice =
computeAlgoTakeProfit(
side,
entry,
slPrice,
tpRr
);

if(
!Number.isFinite(
tpPrice
)
){
return {
ok:
false,
message:
"TP price invalid",
position
};
}

const stopsResult =
await attachStops(
sym,
slPrice,
tpPrice
);

if(
stopsResult?.ok ===
false
){
getLog().warn(
"algo bot stops attach:",
sym,
stopsResult.message
);
}

pendingEntries.set(
sym,
{
side,
openedAt:
Date.now(),
riskUsd,
tpRr,
slPrice,
tpPrice
}
);
persistPendingState();

return {
ok:
true,
symbol:
sym,
side,
entry,
slPrice,
tpPrice,
volumeUsdt,
position,
stopsOk:
stopsResult?.ok !==
false
};

}finally{
entryInflight.delete(
sym
);
}

}

function hasEntryInflight(
symbol
){

return entryInflight.has(
normalizeSymbol(
symbol
)
);

}

function getPendingEntries(){

return pendingEntries;

}

function clearPendingEntries(){

pendingEntries.clear();
entryInflight.clear();
pendingTriggers.clear();
pendingMirrorTriggers.clear();
persistPendingState();

}

function removePendingEntry(
symbol
){

pendingEntries.delete(
normalizeSymbol(
symbol
)
);
persistPendingState();

}

module.exports =
{
placeBotTriggerEntry,
cancelBotTrigger,
cancelSiblingTriggers,
cancelAllBotTriggers,
cancelAllOpenTriggerOrders,
finalizeTriggerFill,
reconcileTriggersAndStops,
hasPendingTrigger,
hasOppositeMirrorPending,
canPlaceOppositeMirrorTrigger,
getPendingTrigger,
hasEntryInflight,
getPendingEntries,
clearPendingEntries,
removePendingEntry,
calcVolumeFromRiskUsd,
computeAlgoTakeProfit,
splitQtyByShares,
allocateQtyByWeights,
countTpsHitByClosedQty,
ensurePartialTpLimits,
cancelPartialTpLimits,
cancelOrphanTpLimits,
tpOrderLinkId,
isAlgoTpLimitOrder,
positionMissingStops,
isAlgoBotOrderLinkId,
hydratePendingFromDisk,
persistPendingState
};
