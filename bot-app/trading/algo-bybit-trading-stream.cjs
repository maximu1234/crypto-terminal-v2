/**
 * Algo realtime trading stream — private WS + REST seed (algo credentials only).
 * Isolated from Terminal trading-stream / trading-router.
 */
const log =
require(
"electron-log"
);

const algoRest =
require(
"./algo-bybit-rest.cjs"
);
const {
connectBybitPrivateWs
} =
require(
"./algo-bybit-private-ws.cjs"
);
const {
getAlgoCredentialsStatus
} =
require(
"./algo-exchange-credentials.cjs"
);

function getStreamStatus(){

return getAlgoCredentialsStatus(
"bybit"
);

}

function mapPositionRow(
row
){

return algoRest.mapPositionRow(
row
);

}

function mapOrderRow(
row
){

return algoRest.mapOrderRow(
row
);

}

async function fetchPositionListRaw(){

return algoRest.fetchPositionListRaw();

}

async function getOpenOrders(
options
){

return algoRest.getOpenOrders(
options
);

}

function refreshStreamModules(){
/* algo stream is Bybit-only; no router swap */
}

function getActiveExchange(){

return "bybit";

}

const streamModules =
{
connectPrivateWs:
connectBybitPrivateWs,
getStatus:
getStreamStatus,
mapPositionRow,
mapOrderRow,
fetchPositionListRaw,
getOpenOrders
};

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
let reconnectDelayMs =
1000;

const positionsBySymbol =
new Map();

const rawPositionBySymbol =
new Map();

const ordersById =
new Map();

let reconcileTimer =
null;

let delayedReconcileTimer =
null;

const RECONCILE_DEBOUNCE_MS =
250;

const RECONCILE_DELAYED_MS =
450;

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

function removePosition(
sym
){

const had =
positionsBySymbol.has(
sym
) ||
rawPositionBySymbol.has(
sym
);

positionsBySymbol.delete(
sym
);
rawPositionBySymbol.delete(
sym
);

return had;

}

function schedulePositionReconcileDelayed(){

if(
delayedReconcileTimer
){
return;
}

const delayMs =
RECONCILE_DELAYED_MS;

delayedReconcileTimer =
setTimeout(
()=>{
delayedReconcileTimer =
null;
void seedFromRest();
},
delayMs
);

}

function getOpenPositionSize(
sym
){

const raw =
rawPositionBySymbol.get(
sym
);
const mapped =
positionsBySymbol.get(
sym
);
const size =
Number(
raw?.size ??
mapped?.size ??
0
);

return Number.isFinite(
size
)
? size
: 0;

}

function tryRemoveClosedPositionFromExecution(
row
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

const closedSize =
Number(
row?.closedSize ??
0
);

if(
!Number.isFinite(
closedSize
) ||
closedSize <=
0
){
return false;
}

const openSize =
getOpenPositionSize(
sym
);

if(
openSize <=
0 ||
closedSize >=
openSize -
1e-12
){
return removePosition(
sym
);
}

return false;

}

function schedulePositionReconcile(
immediate =
false
){

if(
immediate
){

if(
reconcileTimer
){
clearTimeout(
reconcileTimer
);
reconcileTimer =
null;
}

void seedFromRest();
return;

}

if(
reconcileTimer
){
return;
}

const debounceMs =
RECONCILE_DEBOUNCE_MS;

reconcileTimer =
setTimeout(
()=>{
reconcileTimer =
null;
void seedFromRest();
},
debounceMs
);

}

function executionClosesPosition(
row
){

if(
!row ||
typeof row !==
"object"
){
return false;
}

const closedSize =
Number(
row.closedSize ??
0
);

if(
Number.isFinite(
closedSize
) &&
closedSize >
0
){
return true;
}

const stopOrderType =
String(
row.stopOrderType ||
""
).trim();

if(
stopOrderType ===
"StopLoss" ||
stopOrderType ===
"TakeProfit" ||
stopOrderType ===
"TrailingStop" ||
stopOrderType ===
"Stop"
){
return true;
}

const execPnl =
row.execPnl;

if(
execPnl !=
null &&
String(
execPnl
).trim() !==
""
){
const closedSize =
Number(
row?.closedSize ??
0
);

if(
Number.isFinite(
closedSize
) &&
closedSize >
0
){
return true;
}

}

const reduceOnly =
row.reduceOnly ===
true ||
row.reduceOnly ===
"true" ||
row.reduceOnly ===
1;

const execType =
String(
row.execType ||
""
);

if(
reduceOnly &&
execType ===
"Trade"
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
"algoTrading:stream",
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
_options
){

const sym =
normalizeSymbol(
symbol
);

if(
!sym
){
return;
}

if(
removePosition(
sym
)
){
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

const sym =
normalizeSymbol(
position.symbol
);

if(
!sym
){
return;
}

positionsBySymbol.set(
sym,
position
);
rawPositionBySymbol.set(
sym,
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

if(
row?.symbol
){
const sym =
normalizeSymbol(
row.symbol
);
positionsBySymbol.set(
sym,
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

let changed =
false;

for(
const row of rows ||
[]
){

const sym =
normalizeSymbol(
row?.symbol
);

if(
!sym
){
continue;
}

if(
isClosedPositionRow(
row
)
){

if(
removePosition(
sym
)
){
changed =
true;
}

continue;

}

const merged =
{
...(
rawPositionBySymbol.get(
sym
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
removePosition(
sym
)
){
changed =
true;
}

continue;

}

const size =
Number(
merged?.size ??
merged?.positionAmt ??
merged?.availableAmt
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
removePosition(
sym
)
){
changed =
true;
}

continue;

}

rawPositionBySymbol.set(
sym,
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
removePosition(
sym
)
){
changed =
true;
}

continue;

}

const prev =
positionsBySymbol.get(
sym
);

positionsBySymbol.set(
sym,
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

for(
const row of rows ||
[]
){

const status =
String(
row?.orderStatus ||
""
);
const sym =
normalizeSymbol(
row?.symbol
);
const stopOrderType =
String(
row?.stopOrderType ||
""
).trim();

if(
sym &&
status ===
"Filled" &&
(
stopOrderType ===
"StopLoss" ||
stopOrderType ===
"TakeProfit" ||
stopOrderType ===
"TrailingStop"
)
){

if(
removePosition(
sym
)
){
changed =
true;
}

}

if(
[
"Filled",
"Cancelled",
"Deactivated",
"Rejected"
].includes(
status
)
){
reconcile =
true;
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
reconcile
){
schedulePositionReconcile(
true
);
schedulePositionReconcileDelayed();
}

}

function applyExecutionRows(
rows
){

if(
!Array.isArray(
rows
) ||
!rows.length
){
return;
}

let changed =
false;
let reconcileImmediate =
false;

for(
const row of rows
){

if(
tryRemoveClosedPositionFromExecution(
row
)
){
changed =
true;
continue;
}

if(
executionClosesPosition(
row
)
){
reconcileImmediate =
true;
}

}

if(
changed
){
emitPositions();
}

schedulePositionReconcile(
reconcileImmediate
);
schedulePositionReconcileDelayed();

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
const posResult =
await fetchPositionListRaw();

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

const sym =
normalizeSymbol(
row?.symbol
);

if(
!sym
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
sym,
row
);
nextPositions.set(
sym,
mapped
);

}

positionsBySymbol.clear();
rawPositionBySymbol.clear();

for(
const [
sym,
row
] of nextRaw
){
rawPositionBySymbol.set(
sym,
row
);
}

for(
const [
sym,
mapped
] of nextPositions
){
positionsBySymbol.set(
sym,
mapped
);
}

emitPositions();

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
"bybit",
updatedAt:
Date.now(),
positions:[
...positionsBySymbol.values()
],
orders
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

void seedFromRest();

socketCtl =
streamModules.connectPrivateWs({

onReady(){

reconnectDelayMs =
1000;
log.info(
"algo trading stream: subscribed position+order"
);

},

onTopic(
topic,
rows
){

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
"execution"
){
applyExecutionRows(
rows
);
}

},

onDisconnect(){

log.warn(
"algo trading stream: disconnected, reconnecting…"
);
stopSocket();
scheduleReconnect();

}

});

}

module.exports =
{
setTradingStreamTarget,
setAlgoTradingStreamTarget: setTradingStreamTarget,
startTradingStream,
startAlgoTradingStream: startTradingStream,
stopTradingStream,
stopAlgoTradingStream: stopTradingStream,
seedFromRest,
seedAlgoTradingStream: seedFromRest,
replayTradingStream,
replayAlgoTradingStream: replayTradingStream,
getTradingSnapshot,
getAlgoTradingSnapshot: getTradingSnapshot,
removeStreamOrder,
removeStreamPosition,
upsertStreamPosition,
requestStreamSeed: seedFromRest
};
