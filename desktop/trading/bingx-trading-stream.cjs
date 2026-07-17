/**
 * BingX private trading stream — REST seed + WS position/order, push to renderer.
 * This module is BingX-only (no exchange forks).
 */
const log =
require(
"electron-log"
);

const {
getStreamModules,
getActiveExchange
} =
require(
"./trading-router.cjs"
);

let streamModules =
getStreamModules(
getActiveExchange()
);

function refreshStreamModules(){

streamModules =
getStreamModules(
getActiveExchange()
);

}

function getStreamStatus(){

return streamModules.getStatus();

}

function mapPositionRow(
row
){

return streamModules.mapPositionRow(
row
);

}

function mapOrderRow(
row
){

return streamModules.mapOrderRow(
row
);

}

async function fetchPositionListRaw(){

return streamModules.fetchPositionListRaw();

}

async function getOpenOrders(
options
){

return streamModules.getOpenOrders(
options
);

}

/** @type {import('electron').WebContents | null} */
let targetWebContents =
null;

let socketCtl =
null;
let reconnectTimer =
null;
let streamActiveExchangeId =
null;
let seedInflight =
null;
let seedRetryTimer =
null;
let bingxRestSeedDone =
false;
let emptySeedSoftSkipCount =
0;

const MAX_EMPTY_SEED_SOFT_SKIPS =
4;

const OPTIMISTIC_PROTECT_MS =
2000;

function hasFreshOptimisticPositions(){

const now =
Date.now();

for(
const row of positionsBySymbol.values()
){

if(
!row?._optimistic
){
continue;
}

if(
now -
Number(
row._optimisticAt ||
0
) <
OPTIMISTIC_PROTECT_MS
){
return true;
}

}

return false;

}

function resetBingxRestSeedState(){

bingxRestSeedDone =
false;
emptySeedSoftSkipCount =
0;

}

let wsConnected =
false;
let lastWsEventAt =
0;
let streamHealth =
"idle";

function markWsEvent(){

lastWsEventAt =
Date.now();
wsConnected =
true;
streamHealth =
"live";

}

let reconnectDelayMs =
1000;

/** Map key: SYMBOL:LONG|SHORT|BOTH — values are normal position objects. */
const positionsBySymbol =
new Map();

const rawPositionBySymbol =
new Map();

const ordersById =
new Map();

const rawOpenOrderRowsById =
new Map();

let suppressAccountSeedOnce =
false;

let reconcileTimer =
null;

let delayedReconcileTimer =
null;

/** Coalesce REST reconcile after WS events — keep UI instant via WS first. */
const RECONCILE_DEBOUNCE_MS =
350;

/** After WS close, ignore stale REST rows that still show an open position. */
const RECENTLY_CLOSED_MS =
3500;

const recentlyClosedUntilByKey =
new Map();

function markRecentlyClosedKey(
key
){

const k =
String(
key ||
""
).trim();

if(
!k
){
return;
}

recentlyClosedUntilByKey.set(
k,
Date.now() +
RECENTLY_CLOSED_MS
);

}

function markRecentlyClosedSymbol(
sym
){

const n =
normalizeSymbol(
sym
);

if(
!n
){
return;
}

markRecentlyClosedKey(
n
);

for(
const key of recentlyClosedUntilByKey.keys()
){
if(
key ===
n ||
key.startsWith(
`${n}:`
)
){
markRecentlyClosedKey(
key
);
}

}

for(
const key of positionsBySymbol.keys()
){

if(
key ===
n ||
key.startsWith(
`${n}:`
)
){
markRecentlyClosedKey(
key
);
}

}

}

function isRecentlyClosedKey(
key
){

const k =
String(
key ||
""
).trim();

if(
!k
){
return false;
}

const until =
recentlyClosedUntilByKey.get(
k
);

if(
!until
){
return false;
}

if(
Date.now() >
until
){
recentlyClosedUntilByKey.delete(
k
);
return false;
}

return true;

}

function isClosedPositionRow(
row
){

if(
!row ||
typeof row !==
"object"
){
return false;
}

if(
"size" in
row
){

const size =
Number(
row.size
);

if(
Number.isFinite(
size
) &&
size ===
0
){
return true;
}

}

if(
"positionAmt" in
row
){

const amt =
Number(
row.positionAmt
);

if(
Number.isFinite(
amt
) &&
amt ===
0
){
return true;
}

}

if(
"pa" in
row
){

const amt =
Number(
row.pa
);

if(
Number.isFinite(
amt
) &&
amt ===
0
){
return true;
}

}

if(
"side" in
row &&
String(
row.side
).trim() ===
""
){
return true;
}

return false;

}

function normalizeSymbol(
symbol
){

return String(
symbol ||
""
).replace(
/\.P$/i,
""
).trim().toUpperCase();

}

function normalizePositionSide(
row
){

const raw =
String(
row?.positionSide ||
""
).trim().toUpperCase();

if(
raw ===
"LONG" ||
raw ===
"SHORT" ||
raw ===
"BOTH"
){
return raw;
}

const side =
String(
row?.side ||
""
).trim();
const sideU =
side.toUpperCase();

if(
sideU ===
"BUY" ||
side ===
"Buy"
){
return "LONG";
}

if(
sideU ===
"SELL" ||
side ===
"Sell"
){
return "SHORT";
}

return "BOTH";

}

function positionMapKey(
symbol,
positionSide
){

return normalizeSymbol(
symbol
) +
":" +
positionSide;

}

function positionKeyFromRow(
row
){

const sym =
normalizeSymbol(
row?.symbol
);

if(
!sym
){
return "";
}

return positionMapKey(
sym,
normalizePositionSide(
row
)
);

}

function removePositionByKey(
key
){

if(
!key
){
return false;
}

const had =
positionsBySymbol.has(
key
) ||
rawPositionBySymbol.has(
key
);

positionsBySymbol.delete(
key
);
rawPositionBySymbol.delete(
key
);

return had;

}

function removePositionsForSymbol(
sym
){

const normalized =
normalizeSymbol(
sym
);

if(
!normalized
){
return false;
}

const prefix =
normalized +
":";
let had =
false;

for(
const key of [
...positionsBySymbol.keys()
]
){

if(
key.startsWith(
prefix
)
){
positionsBySymbol.delete(
key
);
had =
true;
}

}

for(
const key of [
...rawPositionBySymbol.keys()
]
){

if(
key.startsWith(
prefix
)
){
rawPositionBySymbol.delete(
key
);
had =
true;
}

}

return had;

}

function isTerminalOrderStatus(
status
){

const s =
String(
status ||
""
).trim().toUpperCase();

return [
"FILLED",
"CANCELLED",
"CANCELED",
"DEACTIVATED",
"REJECTED",
"EXPIRED",
"SUCCESS",
"COMPLETED",
"EXECUTED"
].includes(
s
);

}

function isFullyFilledOrderStatus(
status
){

const s =
String(
status ||
""
).trim().toUpperCase();

return (
s ===
"FILLED" ||
s ===
"SUCCESS" ||
s ===
"COMPLETED" ||
s ===
"EXECUTED"
);

}

function isFilledOrderStatus(
status
){

const s =
String(
status ||
""
).trim().toUpperCase();

return (
isFullyFilledOrderStatus(
s
) ||
s ===
"PARTIALLY_FILLED" ||
s ===
"TRADE"
);

}

function isTradeExecType(
row
){

const x =
String(
row?.execType ||
row?.x ||
""
).trim().toUpperCase();

return (
x ===
"TRADE" ||
x ===
"CALCULATED"
);

}

function isReduceOnlyOrder(
row
){

return (
row?.reduceOnly ===
true ||
row?.reduceOnly ===
"true" ||
row?.reduceOnly ===
"TRUE" ||
row?.R ===
true ||
row?.R ===
"true" ||
row?.cp ===
true ||
row?.cp ===
"true" ||
row?.closePosition ===
true ||
row?.closePosition ===
"true"
);

}

function hasOpenPositionForSymbol(
sym
){

const normalized =
normalizeSymbol(
sym
);

if(
!normalized
){
return false;
}

const prefix =
normalized +
":";

for(
const key of positionsBySymbol.keys()
){

if(
key ===
normalized ||
key.startsWith(
prefix
)
){
return true;
}

}

return false;

}

/**
 * Hedge: SELL+LONG / BUY+SHORT reduce; opposite opens.
 * One-way BOTH: compare order side vs open position side.
 */
function isClosingFillOrder(
row
){

if(
isReduceOnlyOrder(
row
)
){
return true;
}

if(
!isEntryFillOrderType(
row
)
){
return true;
}

const ps =
normalizePositionSide(
row
);
const sideU =
String(
row?.side ||
""
).trim().toUpperCase();
const isBuy =
sideU ===
"BUY";

if(
ps ===
"LONG"
){
return !isBuy;
}

if(
ps ===
"SHORT"
){
return isBuy;
}

if(
ps ===
"BOTH"
){
const sym =
normalizeSymbol(
row?.symbol
);

if(
!sym
){
return false;
}

const prefix =
sym +
":";

for(
const [
key,
pos
] of positionsBySymbol
){

if(
key !==
sym &&
!key.startsWith(
prefix
)
){
continue;
}

const pSide =
String(
pos?.side ||
""
).trim().toUpperCase();

if(
pSide ===
"BUY" &&
sideU ===
"SELL"
){
return true;
}

if(
pSide ===
"SELL" &&
sideU ===
"BUY"
){
return true;
}

}

}

return false;

}

function hasOrderTradeActivity(
row,
status
){

return (
isTradeExecType(
row
) ||
isFilledOrderStatus(
status
) ||
Number(
row?.lastFilledQty ??
row?.l ??
row?.executedQty ??
row?.z ??
0
) >
0
);

}

/**
 * Instant UI from ORDER_TRADE_UPDATE — do not wait for REST RTT (1–3s).
 * BingX: `z` = cumulative filled, `l` = last fill qty.
 */
function applyOptimisticFillFromOrder(
row
){

const status =
row?.orderStatus ||
row?.status;
const filled =
isFilledOrderStatus(
status
) ||
(
isTradeExecType(
row
) &&
Number(
row.executedQty ??
row.z ??
row.lastFilledQty ??
row.l ??
0
) >
0
);

if(
!filled
){
return false;
}

const sym =
normalizeSymbol(
row?.symbol
);

if(
!sym
){
return false;
}

const positionSide =
normalizePositionSide(
row
);
const key =
positionMapKey(
sym,
positionSide
);
const cumQty =
Math.abs(
Number(
row.executedQty ??
row.z ??
0
)
);
const lastQty =
Math.abs(
Number(
row.lastFilledQty ??
row.l ??
0
)
);
const origQty =
Math.abs(
Number(
row.quantity ??
row.qty ??
row.origQty ??
0
)
);
const avg =
Number(
row.avgPrice ??
row.ap ??
row.price ??
0
);
const orderId =
String(
row.orderId ??
row.i ??
""
).trim();

const prev =
positionsBySymbol.get(
key
);
const prevSize =
Number(
prev?.size
) ||
0;
const prevCum =
Number(
prev?._fillCum
) ||
0;
const sameOrder =
orderId &&
String(
prev?._optimisticOrderId ||
""
) ===
orderId;

let fillDelta =
0;

if(
lastQty >
0
){
fillDelta =
lastQty;
}else if(
cumQty >
0
){
fillDelta =
sameOrder
? Math.max(
0,
cumQty -
prevCum
)
: cumQty;
}else{
fillDelta =
origQty;
}

if(
!(
fillDelta >
0 ||
cumQty >
0
)
){
return false;
}

const side =
positionSide ===
"SHORT"
? "Sell"
: positionSide ===
"LONG"
? "Buy"
: String(
row.side ||
""
).toLowerCase() ===
"sell"
? "Sell"
: "Buy";

function writeOptimistic(
nextSize,
fillCum
){

if(
!(
nextSize >
0
)
){

if(
removePositionByKey(
key
)
){
markRecentlyClosedKey(
key
);
return true;
}

if(
removePositionsForSymbol(
sym
)
){
markRecentlyClosedSymbol(
sym
);
return true;
}

return false;

}

const signedAmt =
side ===
"Sell"
? -nextSize
: nextSize;
const entry =
avg >
0
? avg
: Number(
prev?.avgPrice
) ||
0;

const mapped =
mapPositionRow(
{
symbol:
sym,
positionSide,
positionAmt:
signedAmt,
avgPrice:
entry,
markPrice:
entry,
leverage:
prev?.leverage ||
0,
unrealizedProfit:
prev?.unrealisedPnl ||
0
}
) ||
{
symbol:
sym,
side,
positionSide,
size:
nextSize,
availableSize:
nextSize,
avgPrice:
entry,
markPrice:
entry,
unrealisedPnl:
Number(
prev?.unrealisedPnl
) ||
0,
volumeUsdt:
nextSize *
(
entry ||
0
),
liqPrice:
prev?.liqPrice ||
0,
leverage:
prev?.leverage ||
0,
stopLoss:
prev?.stopLoss ||
0,
takeProfit:
prev?.takeProfit ||
0,
exchangeId:
"bingx"
};

if(
!mapped
){
return false;
}

mapped._optimistic =
true;
mapped._optimisticAt =
Date.now();
mapped._fillCum =
fillCum;
mapped._optimisticOrderId =
orderId ||
prev?._optimisticOrderId ||
"";

positionsBySymbol.set(
key,
mapped
);
rawPositionBySymbol.set(
key,
{
symbol:
sym,
positionSide,
positionAmt:
signedAmt,
avgPrice:
entry,
...mapped
}
);

return true;

}

if(
isClosingFillOrder(
row
)
){
const sym =
normalizeSymbol(
row?.symbol
);

if(
prevSize <=
0 &&
sym &&
hasOpenPositionForSymbol(
sym
)
){
if(
removePositionsForSymbol(
sym
)
){
markRecentlyClosedSymbol(
sym
);
return true;
}

}

const reduceBy =
fillDelta >
0
? fillDelta
: cumQty >
0
? cumQty
: origQty;
let nextSize =
Math.max(
0,
prevSize -
reduceBy
);

if(
isFullyFilledOrderStatus(
status
) &&
(
!prev ||
reduceBy >=
prevSize -
1e-12 ||
(
origQty >
0 &&
origQty >=
prevSize -
1e-12
)
)
){
nextSize =
0;
}

return writeOptimistic(
nextSize,
cumQty >
0
? cumQty
: (
Number(
prev?._fillCum
) ||
0
) +
reduceBy
);
}

let nextSize;

if(
sameOrder &&
cumQty >
0
){
/* Absolute cumulative fill for this order on an optimistic row. */
nextSize =
prev &&
!prev._optimistic
? prevSize -
prevCum +
cumQty
: cumQty;
}else if(
prevSize >
0
){
nextSize =
prevSize +
(
fillDelta ||
cumQty ||
origQty
);
}else{
nextSize =
cumQty >
0
? cumQty
: (
fillDelta ||
origQty
);
}

return writeOptimistic(
nextSize,
cumQty >
0
? cumQty
: (
Number(
prev?._fillCum
) ||
0
) +
(
fillDelta ||
0
)
);

}

function tryInstantCloseFromOrder(
row
){

const status =
String(
row?.orderStatus ||
row?.status ||
""
);

if(
!isClosingFillOrder(
row
) ||
!hasOrderTradeActivity(
row,
status
)
){
return false;
}

if(
applyOptimisticFillFromOrder(
row
)
){
markRecentlyClosedSymbol(
row?.symbol
);
return true;
}

const sym =
normalizeSymbol(
row?.symbol
);

if(
sym &&
removePositionsForSymbol(
sym
)
){
markRecentlyClosedSymbol(
sym
);
return true;
}

const key =
positionKeyFromRow(
row
);

if(
key &&
removePositionByKey(
key
)
){
markRecentlyClosedKey(
key
);
return true;
}

return false;

}

function isEntryFillOrderType(
row
){

const typeRaw =
String(
row?.type ||
row?.orderType ||
""
).toUpperCase();
const stopOrderType =
String(
row?.stopOrderType ||
""
).trim();

if(
stopOrderType ===
"StopLoss" ||
stopOrderType ===
"TakeProfit" ||
stopOrderType ===
"TrailingStop"
){
return false;
}

if(
typeRaw ===
"STOP_MARKET" ||
typeRaw ===
"STOP" ||
typeRaw ===
"TAKE_PROFIT_MARKET" ||
typeRaw ===
"TAKE_PROFIT" ||
typeRaw ===
"TRAILING_STOP_MARKET" ||
typeRaw ===
"TRAILING_TP_SL"
){
return false;
}

return (
typeRaw.includes(
"TRIGGER"
) ||
typeRaw ===
"LIMIT" ||
typeRaw ===
"MARKET" ||
typeRaw ===
""
);

}

function scheduleAccountReconcile(
delayMs
){

const waitMs =
Number.isFinite(
Number(
delayMs
)
)
? Math.max(
0,
Number(
delayMs
)
)
: RECONCILE_DEBOUNCE_MS;

if(
reconcileTimer
){
clearTimeout(
reconcileTimer
);
}

reconcileTimer =
setTimeout(
()=>{
reconcileTimer =
null;
void seedFromRest();
},
waitMs
);

}

function scheduleImmediatePositionRefresh(){

scheduleAccountReconcile(
RECONCILE_DEBOUNCE_MS
);

}

function patchStreamPositionStops(){

if(
typeof streamModules.enrichPositionsWithStopOrders !==
"function"
){
return false;
}

const positions =
[
...positionsBySymbol.values()
];
const rawRows =
[
...rawOpenOrderRowsById.values()
];
const enriched =
streamModules.enrichPositionsWithStopOrders(
positions,
rawRows
);
let changed =
false;

for(
const pos of enriched ||
[]
){

const key =
positionKeyFromRow(
pos
);

if(
!key
){
continue;
}

const prev =
positionsBySymbol.get(
key
);

positionsBySymbol.set(
key,
pos
);

if(
!prev ||
JSON.stringify(
prev
) !==
JSON.stringify(
pos
)
){
changed =
true;
}

}

return changed;

}

function trackRawOpenOrderRow(
row
){

const orderId =
String(
row?.orderId ??
row?.orderID ??
""
);

if(
!orderId
){
return;
}

const status =
String(
row?.status ??
row?.orderStatus ??
""
);

if(
isTerminalOrderStatus(
status
)
){
rawOpenOrderRowsById.delete(
orderId
);
return;
}

rawOpenOrderRowsById.set(
orderId,
row
);

}

function resetRawOpenOrderRows(
rows
){

rawOpenOrderRowsById.clear();

for(
const row of rows ||
[]
){
trackRawOpenOrderRow(
row
);
}

}

function schedulePositionReconcileDelayed(){

scheduleAccountReconcile(
RECONCILE_DEBOUNCE_MS
);

}

function schedulePositionReconcile(){

scheduleAccountReconcile(
RECONCILE_DEBOUNCE_MS
);

}

function broadcast(
payload
){

if(
!targetWebContents ||
targetWebContents.isDestroyed()
){
return;
}

try{
targetWebContents.send(
"trading:stream",
payload
);
}catch(
err
){
log.warn(
"trading stream broadcast:",
err.message
);
}

}

function emitPositions(){

broadcast({
type:
"positions",
positions:[
...positionsBySymbol.values()
]
});

}

function emitOrders(){

const orders =
[
...ordersById.values()
].sort(
(
a,
b
)=>
(
b.createdAt ||
0
) -
(
a.createdAt ||
0
)
);

broadcast({
type:
"orders",
orders
});

}

function removeStreamOrder(
orderId
){

const id =
String(
orderId ||
""
).trim();

if(
!id
){
return;
}

if(
ordersById.delete(
id
)
){
emitOrders();
}

}

function removeStreamPosition(
symbol,
options =
{}
){

const sym =
normalizeSymbol(
typeof symbol ===
"object"
? symbol?.symbol
: symbol
);
const opts =
typeof symbol ===
"object" &&
symbol &&
!(
options &&
(
options.positionSide ||
options.side ||
options.position
)
)
? symbol
: options ||
{};

if(
!sym
){
return;
}

const key =
positionKeyFromRow({
symbol:
sym,
positionSide:
opts.positionSide ||
opts.position?.positionSide,
side:
opts.side ||
opts.position?.side
});

let removed =
false;

if(
opts.positionSide ||
opts.side ||
opts.position
){
removed =
removePositionByKey(
key
);
}else{
removed =
removePositionsForSymbol(
sym
);
}

if(
removed
){
markRecentlyClosedSymbol(
sym
);
streamModules.invalidatePositionListCache?.();
streamModules.invalidateOpenOrderRowsCache?.();
emitPositions();
}

}

function upsertStreamPosition(
position
){

if(
!position?.symbol
){
return;
}

const key =
positionKeyFromRow(
position
);

if(
!key
){
return;
}

positionsBySymbol.set(
key,
position
);
rawPositionBySymbol.set(
key,
position
);
emitPositions();

}

function resetPositions(
list
){

positionsBySymbol.clear();
rawPositionBySymbol.clear();

for(
const row of list ||
[]
){

const key =
positionKeyFromRow(
row
);

if(
key
){
positionsBySymbol.set(
key,
row
);
}

}

emitPositions();

}

function resetOrders(
list
){

ordersById.clear();

for(
const row of list ||
[]
){

if(
row?.orderId
){
ordersById.set(
String(
row.orderId
),
row
);
}

}

emitOrders();

}

function applyPositionRows(
rows
){

/* Accept WS deltas even before first REST seed — reconnect otherwise
 * drops ACCOUNT_UPDATE opens until a laggy seed completes. */
let changed =
false;

for(
const row of rows ||
[]
){

const sym =
normalizeSymbol(
row?.symbol ||
row?.s
);

if(
!sym
){
continue;
}

const rawSide =
String(
row?.positionSide ||
row?.ps ||
""
).trim().toUpperCase();
const sideKnown =
rawSide ===
"LONG" ||
rawSide ===
"SHORT" ||
rawSide ===
"BOTH" ||
String(
row?.side ||
""
).trim() !==
"";

if(
isClosedPositionRow(
row
)
){

const removed =
sideKnown
? removePositionByKey(
positionKeyFromRow(
row
)
)
: removePositionsForSymbol(
sym
);

if(
removed
){
markRecentlyClosedSymbol(
sym
);
changed =
true;
}

continue;

}

const key =
positionKeyFromRow(
row
);

if(
isRecentlyClosedKey(
key
)
){
continue;
}

const merged =
{
...(
rawPositionBySymbol.get(
key
) ||
{}
),
...row
};

if(
isClosedPositionRow(
merged
)
){

if(
removePositionByKey(
key
)
){
markRecentlyClosedKey(
key
);
changed =
true;
}

continue;

}

const size =
Number(
merged?.size ??
merged?.positionAmt ??
merged?.availableAmt ??
merged?.pa
);

if(
!Number.isFinite(
size
) ||
size ===
0 ||
String(
merged?.side ||
""
).trim() ===
""
){

if(
removePositionByKey(
key
)
){
changed =
true;
}

continue;

}

rawPositionBySymbol.set(
key,
merged
);

const mapped =
mapPositionRow(
merged
);

if(
!mapped
){

if(
removePositionByKey(
key
)
){
changed =
true;
}

continue;

}

const prev =
positionsBySymbol.get(
key
);

positionsBySymbol.set(
key,
mapped
);

if(
!prev ||
JSON.stringify(
prev
) !==
JSON.stringify(
mapped
)
){
changed =
true;
}

}

if(
changed
){
streamModules.invalidatePositionListCache?.();
patchStreamPositionStops();
emitPositions();
}

}

function applyOrderRows(
rows
){

let changed =
false;
let reconcile =
false;
let closedFromWs =
false;

for(
const row of rows ||
[]
){

trackRawOpenOrderRow(
row
);

const status =
String(
row?.orderStatus ||
row?.status ||
""
);
const sym =
normalizeSymbol(
row?.symbol
);

if(
tryInstantCloseFromOrder(
row
)
){
changed =
true;
closedFromWs =
true;
suppressAccountSeedOnce =
true;
streamModules.invalidatePositionListCache?.();
emitPositions();
}else if(
isFilledOrderStatus(
status
)
){

if(
applyOptimisticFillFromOrder(
row
)
){
changed =
true;
streamModules.invalidatePositionListCache?.();
emitPositions();
}

}

if(
isTerminalOrderStatus(
status
)
){

if(
!closedFromWs
){
reconcile =
true;

if(
isFullyFilledOrderStatus(
status
)
){
scheduleImmediatePositionRefresh();
}

}

}

const orderId =
String(
row?.orderId ||
""
);

if(
!orderId
){
continue;
}

const mapped =
mapOrderRow(
row
);

if(
!mapped
){

if(
ordersById.delete(
orderId
)
){
changed =
true;
}

}else{

const prev =
ordersById.get(
orderId
);

ordersById.set(
orderId,
mapped
);

if(
!prev ||
JSON.stringify(
prev
) !==
JSON.stringify(
mapped
)
){
changed =
true;
}

}

}

if(
changed
){
emitOrders();
}

if(
patchStreamPositionStops()
){
emitPositions();
}

if(
reconcile &&
!closedFromWs
){
scheduleAccountReconcile(
RECONCILE_DEBOUNCE_MS
);
}

}

/** BingX private WS does not emit execution; stub for host compatibility. */
function applyExecutionRows(){

}

async function seedFromRest(){

if(
seedInflight
){
return seedInflight;
}

seedInflight =
(async()=>{

if(
!getStreamStatus().configured
){
resetPositions(
[]
);
resetOrders(
[]
);
return;
}

try{
let softSkippedEmpty =
false;

const posResult =
await fetchPositionListRaw({
forceRefresh:
false
});

if(
posResult?.rateLimited
){
const backoffMs =
Math.max(
60000,
streamModules.getRateLimitBackoffMs?.() ||
0
);
scheduleSeedRetry(
backoffMs
);
return;
}

if(
posResult?.ok
){

const nextPositions =
new Map();
const nextRaw =
new Map();

for(
const row of posResult.list ||
[]
){

const key =
positionKeyFromRow(
row
);

if(
!key
){
continue;
}

if(
isRecentlyClosedKey(
key
)
){
continue;
}

if(
isClosedPositionRow(
row
)
){
continue;
}

const mapped =
mapPositionRow(
row
);

if(
!mapped
){
continue;
}

nextRaw.set(
key,
row
);
nextPositions.set(
key,
mapped
);

}

/* Empty REST: soft-skip ONLY fresh optimistic opens (BingX lag after our
 * fill). Confirmed locals + empty = real close → clear immediately.
 * Never schedule retry mid-seed (seedInflight would swallow it). */
softSkippedEmpty =
false;

if(
nextPositions.size ===
0 &&
positionsBySymbol.size >
0
){

const now =
Date.now();
let keptOptimistic =
0;
let clearedConfirmed =
false;

for(
const [
key,
row
] of [
...positionsBySymbol.entries()
]
){

const freshOptimistic =
row?._optimistic &&
now -
Number(
row._optimisticAt ||
0
) <
OPTIMISTIC_PROTECT_MS;

if(
freshOptimistic
){
keptOptimistic +=
1;
continue;
}

positionsBySymbol.delete(
key
);
rawPositionBySymbol.delete(
key
);
clearedConfirmed =
true;

}

if(
keptOptimistic >
0 &&
emptySeedSoftSkipCount <
MAX_EMPTY_SEED_SOFT_SKIPS
){
emptySeedSoftSkipCount +=
1;
softSkippedEmpty =
true;
bingxRestSeedDone =
true;

if(
clearedConfirmed
){
emitPositions();
}

}else{
softSkippedEmpty =
false;
}

}

if(
!softSkippedEmpty
){
emptySeedSoftSkipCount =
0;

positionsBySymbol.clear();
rawPositionBySymbol.clear();

for(
const [
key,
row
] of nextRaw
){
rawPositionBySymbol.set(
key,
row
);
}

for(
const [
key,
mapped
] of nextPositions
){
positionsBySymbol.set(
key,
mapped
);
}

emitPositions();
bingxRestSeedDone =
true;
}

}

const ordResult =
await getOpenOrders();

if(
ordResult?.rateLimited
){
const backoffMs =
Math.max(
60000,
streamModules.getRateLimitBackoffMs?.() ||
0
);
scheduleSeedRetry(
backoffMs
);
return;
}

if(
ordResult?.ok
){
resetOrders(
ordResult.orders
);

const rawRows =
streamModules.getCachedOpenOrderRows?.() ||
[];

resetRawOpenOrderRows(
rawRows
);

if(
patchStreamPositionStops()
){
emitPositions();
}

emitOrders();

}

if(
softSkippedEmpty
){
scheduleSeedRetry(
1200
);
}
}catch(
err
){
log.warn(
"trading stream seed:",
err.message
);
}

})();

try{
return await seedInflight;
}finally{
seedInflight =
null;
}

}

function scheduleSeedRetry(
delayMs
){

if(
seedRetryTimer
){
clearTimeout(
seedRetryTimer
);
}

const waitMs =
Math.max(
0,
Number(
delayMs
) ||
0
);

seedRetryTimer =
setTimeout(
()=>{
seedRetryTimer =
null;
void seedFromRest();
},
waitMs
);

}

function clearReconnectTimer(){

if(
reconnectTimer
){
clearTimeout(
reconnectTimer
);
reconnectTimer =
null;
}

}

function scheduleReconnect(){

if(
reconnectTimer
){
return;
}

reconnectTimer =
setTimeout(
()=>{
reconnectTimer =
null;
reconnectDelayMs =
Math.min(
reconnectDelayMs *
2,
30000
);
startTradingStream();
},
reconnectDelayMs
);

}

function stopSocket(){

clearReconnectTimer();

if(
socketCtl
){
socketCtl.close();
socketCtl =
null;
}

resetBingxRestSeedState();

}

function setTradingStreamTarget(
webContents
){

targetWebContents =
webContents ||
null;

}

function stopTradingStream(){

stopSocket();

if(
reconcileTimer
){
clearTimeout(
reconcileTimer
);
reconcileTimer =
null;
}

if(
delayedReconcileTimer
){
clearTimeout(
delayedReconcileTimer
);
delayedReconcileTimer =
null;
}

if(
seedRetryTimer
){
clearTimeout(
seedRetryTimer
);
seedRetryTimer =
null;
}

streamActiveExchangeId =
null;
seedInflight =
null;

positionsBySymbol.clear();
rawPositionBySymbol.clear();
ordersById.clear();
rawOpenOrderRowsById.clear();
reconnectDelayMs =
1000;

}

function replayTradingStream(){

emitPositions();
emitOrders();

}

function getTradingSnapshot(){

const orders =
[
...ordersById.values()
].sort(
(
a,
b
)=>
(
b.createdAt ||
0
) -
(
a.createdAt ||
0
)
);

return {
ok:
true,
exchangeId:
"bingx",
seedDone:
bingxRestSeedDone,
wsConnected,
streamHealth,
lastWsEventAt,
updatedAt:
Date.now(),
positions:[
...positionsBySymbol.values()
],
orders
};

}

function requestStreamSeed(){

scheduleAccountReconcile(
0
);
return {
ok:
true
};

}

function startTradingStream(){

refreshStreamModules();

if(
!getStreamStatus().configured
){
stopSocket();
streamActiveExchangeId =
null;
streamHealth =
"idle";
return;
}

const exchangeId =
getActiveExchange();

if(
socketCtl &&
streamActiveExchangeId ===
exchangeId
){
return;
}

stopSocket();
streamActiveExchangeId =
exchangeId;
streamHealth =
"connecting";
wsConnected =
false;

socketCtl =
streamModules.connectPrivateWs({

onReady(){

reconnectDelayMs =
1000;
wsConnected =
true;
streamHealth =
"live";
markWsEvent();
log.info(
"trading stream: subscribed position+order"
);
/* One coalesced seed after WS is up — not before. */
void seedFromRest();

},

onTopic(
topic,
rows
){

markWsEvent();

if(
topic ===
"position"
){
applyPositionRows(
rows
);
}else if(
topic ===
"order"
){
applyOrderRows(
rows
);
}else if(
topic ===
"account"
){

if(
suppressAccountSeedOnce
){
suppressAccountSeedOnce =
false;
return;
}

/* WS already painted UI; coalesce one REST confirm. */
scheduleAccountReconcile(
RECONCILE_DEBOUNCE_MS
);

}else if(
topic ===
"execution"
){
applyExecutionRows();
}

},

onDisconnect(){

log.warn(
"trading stream: disconnected, reconnecting…"
);
wsConnected =
false;
streamHealth =
"reconnecting";
stopSocket();
scheduleReconnect();

}

});

/* Fallback seed if WS never becomes ready quickly. */
setTimeout(
()=>{
if(
!bingxRestSeedDone
){
void seedFromRest();
}
},
2500
);

}

module.exports =
{
setTradingStreamTarget,
startTradingStream,
stopTradingStream,
seedFromRest,
replayTradingStream,
getTradingSnapshot,
requestStreamSeed,
removeStreamOrder,
removeStreamPosition,
upsertStreamPosition
};
