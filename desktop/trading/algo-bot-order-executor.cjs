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
pendingEntries:
pendingEntries.size
};

}

function splitQtyIntoThirds(
qty,
rules =
{}
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

const thirdSteps =
Math.floor(
(
total /
3
) /
step +
1e-9
);
const first =
Number(
(
thirdSteps *
step
).toFixed(
decimals
)
);
const second =
first;
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

return value.startsWith(
"algo"
) ||
/^a[A-Za-z0-9_-]+$/.test(
value
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

return `algo-tp-${key}-${index}`.slice(
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

function clampTrailSlPct(
raw
){

const n =
Number(
raw
);

return Number.isFinite(
n
)
? Math.min(
100,
Math.max(
0,
n
)
)
: 15;

}

function computePartialTpPrice(
side,
entry,
span,
mult
){

const offset =
Math.abs(
span
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

function computeTrailStopLoss(
side,
pt3,
pt4,
trailPct
){

const x =
Math.abs(
Number(
pt4
) -
Number(
pt3
)
);

if(
!(
x >
0
)
){
return NaN;
}

const offset =
x *
(
clampTrailSlPct(
trailPct
) /
100
);

return side ===
"short"
? Number(
pt4
) +
offset
: Number(
pt4
) -
offset;

}

return Math.min(
50,
Math.max(
0.1,
n
)
);

}

function computeAlgoStopLoss(
side,
pt3,
pt4,
slPct
){

const p3 =
Number(
pt3
);
const p4 =
Number(
pt4
);

if(
!Number.isFinite(
p3
) ||
!Number.isFinite(
p4
)
){
return NaN;
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
return NaN;
}

const offset =
x *
(
clampSlPct(
slPct
) /
100
);

return side ===
"short"
? p4 +
offset
: p4 -
offset;

}

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

if(
!Number.isFinite(
entryN
) ||
!Number.isFinite(
sl
)
){
return NaN;
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
return NaN;
}

const reward =
risk *
clampTpRr(
tpRr
);

return side ===
"short"
? entryN -
reward
: entryN +
reward;

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

if(
pendingTriggers.has(
sym
) ||
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
fingerprint
? `a${fingerprint}`.replace(
/[^a-zA-Z0-9_-]/g,
""
).slice(
0,
36
)
: `algo${Date.now()}`.slice(
0,
36
);

const orderResult =
await placeTriggerWithLeverageRetry(
{
symbol:
sym,
kind,
price:
pt4,
volumeUsdt,
orderLinkId,
markPrice:
Number.isFinite(
markPrice
) &&
markPrice >
0
? markPrice
: pt4
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
const span =
exitProfile.kind ===
"partial-y"
? Math.abs(
Number(
setup.p2
) -
Number(
setup.p1
)
)
: Math.abs(
pt4 -
pt3
);
const tpPrices =
isPartial
? [
computePartialTpPrice(
side,
pt4,
span,
clampPartialTp(
exitProfile.tp1,
1
)
),
computePartialTpPrice(
side,
pt4,
span,
clampPartialTp(
exitProfile.tp2,
1.25
)
),
computePartialTpPrice(
side,
pt4,
span,
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

pendingTriggers.set(
sym,
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
trailSlPct:
clampTrailSlPct(
exitProfile.trailSlPct
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
placedAt:
Date.now(),
stopsAttached:
false,
stopsManagedByUser:
false
}
);
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

async function cancelBotTrigger(
symbol
){

const sym =
normalizeSymbol(
symbol
);
const meta =
pendingTriggers.get(
sym
);

if(
!meta
){
return {
ok:
true,
alreadyGone:
true
};
}

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
pendingTriggers.delete(
sym
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

pendingTriggers.delete(
sym
);
persistPendingState();

return {
ok:
true,
orderId:
meta.orderId
};

}

async function cancelAllBotTriggers(){

const symbols =
[
...pendingTriggers.keys()
];
const results =
[];

for(
const sym of symbols
){
results.push(
await cancelBotTrigger(
sym
)
);
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
const meta =
pendingTriggers.get(
sym
) ||
pendingEntries.get(
sym
);

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
const thirds =
splitQtyIntoThirds(
entryQty,
rules
);

if(
!thirds
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
thirds[
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

pendingTriggers.delete(
sym
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
trailSlPct:
meta.trailSlPct,
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
stopsResult?.message
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

for(
const [
sym,
meta
] of [
...pendingTriggers
]
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
tpsHit >=
2
? Number(
meta.pt4
)
: computeTrailStopLoss(
meta.side,
meta.pt3,
meta.pt4,
meta.trailSlPct
);

if(
Number.isFinite(
nextSl
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

return pendingTriggers.has(
normalizeSymbol(
symbol
)
);

}

function getPendingTrigger(
symbol
){

return pendingTriggers.get(
normalizeSymbol(
symbol
)
) ||
null;

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
cancelAllBotTriggers,
cancelAllOpenTriggerOrders,
finalizeTriggerFill,
reconcileTriggersAndStops,
hasPendingTrigger,
getPendingTrigger,
hasEntryInflight,
getPendingEntries,
clearPendingEntries,
removePendingEntry,
calcVolumeFromRiskUsd,
splitQtyIntoThirds,
isAlgoBotOrderLinkId,
hydratePendingFromDisk,
persistPendingState
};
