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
function splitQtyByShares(
qty,
rules =
{},
tpShares
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
0
){
return null;
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
const partByShare =
share=>
Number(
(
Math.floor(
(
(
total *
share
) /
100
) /
step +
1e-9
) *
step
).toFixed(
decimals
)
);
const first =
partByShare(
shares[
0
]
);
const second =
partByShare(
shares[
1
]
);
const third =
Number(
(
Math.round(

(
total -
first -
second
) /
step
) *
step
).toFixed(
decimals
)
);

if(
first <=
0 ||
second <=
0 ||
third <=
0
){
return null;
}

return [
first,
second,
third
];

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

function tpOrderLinkId(
meta,
symbol,
index
){

const key =
String(
meta?.fingerprint ||
symbol ||
""
).replace(
/[^A-Za-z0-9_-]/g,
""
) ||
"bot";
/*
 * Include placedAt so a later session after cancel does not reuse the
 * same Bybit orderLinkId (duplicate rejection).
 */
const nonce =
String(
meta?.placedAt ||
meta?.tpLinkNonce ||
Date.now()
).replace(
/[^A-Za-z0-9_-]/g,
""
);

return `algo-tp-${key}-${index}-${nonce}`.slice(
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

function positionMissingStops(
position,
partial =
false
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
(
!partial &&
!(
Number.isFinite(
tp
) &&
tp >
0
)
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
const tpPrice =
isPartial
? NaN
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

const cancelResult =
await algoRest.cancelTradeOrder(
order.symbol,
order.orderId
);

if(
cancelResult?.ok ===
false
){
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
cancelled +=
1;
pendingTriggers.delete(
normalizeSymbol(
order.symbol
)
);
continue;
}

errors.push(
`${order.symbol}: ${cancelResult?.message ||
"cancel failed"}`
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
return {
ok:
errors.length ===
0,
cancelled,
total:
stops.length,
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
Number.isFinite(
Number(
meta.tpPrice
)
) &&
Number(
meta.tpPrice
) >
0
? Number(
meta.tpPrice
)
: computeAlgoTakeProfit(
meta.side,
pt4,
slPrice,
meta.tpRr
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
(
!isPartial &&
!Number.isFinite(
tpPrice
)
)
){
return {
ok:
false,
message:
"pt4/SL/TP invalid"
};
}

const stopsResult =
isPartial
? await algoRest.setPositionStop(
sym,
"sl",
slPrice
)
: await attachStops(
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

if(
isPartial &&
stopsResult?.ok !==
false
){
const prices =
Array.isArray(
meta.tpPrices
)
? meta.tpPrices
: [];
const closeKind =
meta.side ===
"short"
? "buy-limit"
: "sell-limit";
const livePosition =
position?.size
? position
: (
await algoRest.getPosition(
sym
)
)?.position;
const entryQty =
Math.abs(
Number(
livePosition?.size ||
meta.entryQty
)
);
const rules =
await algoRest.getInstrumentRules(
sym
);
const parts =
splitQtyByShares(
entryQty,
rules,
meta.shares
);

if(
!parts
){
return {
ok:
false,
message:
"Position quantity too small for three TPs"
};
}

meta.entryQty =
entryQty;
meta.initialQty =
entryQty;
meta.tpOrderIds =
tpOrderIds;
pendingTriggers.set(
sym,
meta
);
persistPendingState();

const openOrders =
await algoRest.getOpenOrders(
{
symbol:
sym
}
);
const openTpByLinkId =
new Map(
(
openOrders?.orders ||
[]
).map(
order=>[
String(
order?.orderLinkId ||
""
),
String(
order?.orderId ||
""
)
]
)
);

for(
let i =
0;
i <
prices.length;
i++
){
const linkId =
tpOrderLinkId(
meta,
sym,
i
);

if(
tpOrderIds[
i
]
){
continue;
}

if(
openTpByLinkId.has(
linkId
)
){
tpOrderIds[
i
]=
openTpByLinkId.get(
linkId
);
meta.tpOrderIds =
tpOrderIds;
persistPendingState();
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
i
],
qty:
algoRest.formatQtyValue(
parts[
i
],
String(
rules?.qtyStep ||
""
).split(
"."
)[
1
]?.length ||
0
),
forceReduceOnly:
true,
orderLinkId:
linkId
}
);

if(
placed?.ok ===
false
){
meta.tpOrderIds =
tpOrderIds;
pendingTriggers.set(
sym,
meta
);
persistPendingState();
return {
ok:
false,
message:
`TP${i +
1} order failed: ${placed?.message ||
"error"}`
};
}

tpOrderIds[
i
]=
extractOrderId(
placed
)
;
meta.tpOrderIds =
tpOrderIds;
pendingTriggers.set(
sym,
meta
);
persistPendingState();
}
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
false,
stopsMessage:
stopsResult?.message,
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
const goneOrders =
(
meta.tpOrderIds ||
[]
).filter(
id=>
id &&
!openOrderIds.has(
String(
id
)
)
).length;
const sizeHits =
Number.isFinite(
initialQty
) &&
initialQty >
0
? Math.max(
0,
Math.min(
3,
Math.floor(
(
1 -
liveQty /
initialQty
) *
3 +
0.05
)
)
)
: 0;
const tpsHit =
Math.max(
Number(
meta.tpsHit
) ||
0,
goneOrders,
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
meta.slPrice =
nextSl;
}
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
pos,
meta?.exitKind ===
"partial-x" ||
meta?.exitKind ===
"partial-y"
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
const moved =
(
Number.isFinite(
plannedSl
) &&
Number.isFinite(
liveSl
) &&
Math.abs(
liveSl -
plannedSl
) /
Math.max(
Math.abs(
plannedSl
),
1e-9
) >
0.0005
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
pos,
meta?.exitKind ===
"partial-x" ||
meta?.exitKind ===
"partial-y"
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
Number.isFinite(
Number(
meta.tpPrice
)
) &&
Number(
meta.tpPrice
) >
0
? Number(
meta.tpPrice
)
: computeAlgoTakeProfit(
meta.side ===
"short"
? "short"
: "long",
pt4,
slPrice,
meta.tpRr
);

if(
meta?.exitKind ===
"partial-x" ||
meta?.exitKind ===
"partial-y"
){
const slResult =
await algoRest.setPositionStop(
sym,
"sl",
slPrice
);
reports.push(
{
symbol:
sym,
action:
"attach-stops",
ok:
slResult?.ok !==
false,
message:
slResult?.message,
slPrice
}
);
continue;
}

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
isAlgoBotOrderLinkId,
hydratePendingFromDisk,
persistPendingState
};
