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

const size =
Number(
merged?.size
);

if(
!Number.isFinite(
size
) ||
size ===
0
){

if(
positionsBySymbol.delete(
sym
)
){
rawPositionBySymbol.delete(
sym
);
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
positionsBySymbol.delete(
sym
)
){
rawPositionBySymbol.delete(
sym
);
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

for(
const row of rows ||
[]
){

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
replayTradingStream
};
