/**
 * Realtime trading stream — Bybit private WS + REST seed, push to renderer.
 */
const log =
require(
"electron-log"
);

const {
getStatus
} =
require(
"./credentials.cjs"
);

const {
getPositions,
getOpenOrders,
mapPositionRow,
mapOrderRow,
fetchPositionListRaw
} =
require(
"./bybit-rest.cjs"
);

const {
connectBybitPrivateWs
} =
require(
"./bybit-private-ws.cjs"
);

/** @type {import('electron').WebContents | null} */
let targetWebContents =
null;

let socketCtl =
null;
let reconnectTimer =
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
clearTimeout(
delayedReconcileTimer
);
}

delayedReconcileTimer =
setTimeout(
()=>{
delayedReconcileTimer =
null;
void seedFromRest();
},
RECONCILE_DELAYED_MS
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

reconcileTimer =
setTimeout(
()=>{
reconcileTimer =
null;
void seedFromRest();
},
RECONCILE_DEBOUNCE_MS
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
symbol
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
merged?.size
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
!getStatus().configured
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
const [
posResult,
ordResult
] =
await Promise.all([
fetchPositionListRaw(),
getOpenOrders()
]);

if(
posResult?.ok
){

positionsBySymbol.clear();
rawPositionBySymbol.clear();

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
removePosition(
sym
);
continue;
}

rawPositionBySymbol.set(
sym,
row
);

const mapped =
mapPositionRow(
row
);

if(
mapped
){
positionsBySymbol.set(
sym,
mapped
);
}

}

emitPositions();

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

function startTradingStream(){

stopSocket();

if(
!getStatus().configured
){
return;
}

void seedFromRest();

socketCtl =
connectBybitPrivateWs({

onReady(){

reconnectDelayMs =
1000;
log.info(
"trading stream: subscribed position+order"
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
"trading stream: disconnected, reconnecting…"
);
stopSocket();
scheduleReconnect();

}

});

}

module.exports =
{
setTradingStreamTarget,
startTradingStream,
stopTradingStream,
seedFromRest,
replayTradingStream,
removeStreamOrder,
removeStreamPosition
};
