/**
 * Desktop: Bybit private WS → renderer (positions/orders без polling).
 */
import {
applyTradePositionsStream,
syncTradePositionsCache
} from "./trade-positions-cache.js?v=6";

import {
isTradePositionSoundBaselineReady
} from "./trade-position-sounds.js?v=2";

import {
isExchangeTradingEnabled
} from "./market-api.js?v=1";

let unsubscribe =
null;
let visibilityHandler =
null;
let syncTimer =
null;
let initialStreamSyncDone =
false;
let bridgeStarted =
false;

const POSITIONS_SYNC_INTERVAL_MS =
5000;

async function syncTradeOrdersFromRest(){

const api =
window.cryptoTerminalDesktop?.trading;

if(
!api?.getOpenOrders
){
return;
}

const status =
await api.getStatus?.();

if(
!status?.configured
){
return;
}

try{
const result =
await api.getOpenOrders();

if(
!result?.ok
){
return;
}

const orders =
Array.isArray(
result.orders
)
? result.orders
: [];

dispatch(
"trade-stream-orders",
{
orders
}
);

window.dispatchEvent(
new CustomEvent(
"trade-orders-refresh",
{
detail:{
orders
}
}
)
);
}catch{
/* ignore */
}

}

async function syncTradeStreamFromRest(){

await Promise.all([
syncTradePositionsCache(),
syncTradeOrdersFromRest()
]);

initialStreamSyncDone =
true;

}

function dispatch(
name,
detail
){

window.dispatchEvent(
new CustomEvent(
name,
{
detail
}
)
);

}

function handleStreamPayload(
payload
){

if(
!payload ||
typeof payload !==
"object"
){
return;
}

if(
payload.type ===
"positions"
){

const positions =
Array.isArray(
payload.positions
)
? payload.positions
: [];

applyTradePositionsStream(
positions,
{
establishBaseline:
initialStreamSyncDone &&
!isTradePositionSoundBaselineReady()
}
);

dispatch(
"trade-stream-positions",
{
positions
}
);

window.dispatchEvent(
new CustomEvent(
"trade-open-positions-changed"
)
);

return;

}

if(
payload.type ===
"orders"
){

const orders =
Array.isArray(
payload.orders
)
? payload.orders
: [];

dispatch(
"trade-stream-orders",
{
orders
}
);

window.dispatchEvent(
new CustomEvent(
"trade-orders-refresh",
{
detail:{
orders
}
}
)
);

}

}

export function stopTradeStreamBridge(){

if(
unsubscribe
){
unsubscribe();
unsubscribe =
null;
}

if(
syncTimer
){
clearInterval(
syncTimer
);
syncTimer =
null;
}

if(
visibilityHandler
){
document.removeEventListener(
"visibilitychange",
visibilityHandler
);
visibilityHandler =
null;
}

bridgeStarted =
false;
initialStreamSyncDone =
false;

}

export async function startTradeStreamBridge(){

if(
bridgeStarted ||
!isExchangeTradingEnabled()
){
return;
}

bridgeStarted =
true;
await initTradeStreamBridge();

}

export async function initTradeStreamBridge(){

if(
!document.body.classList.contains(
"trade-page"
)
){
return ()=>{};
}

if(
!isExchangeTradingEnabled()
){
return ()=>{};
}

const api =
window.cryptoTerminalDesktop?.trading;

if(
!api?.onStream
){
return ()=>{};
}

if(
unsubscribe
){
return unsubscribe;
}

bridgeStarted =
true;

unsubscribe =
api.onStream(
handleStreamPayload
);

try{
await api.replayStream?.();
await syncTradeStreamFromRest();
}catch{
/* ignore */
}

visibilityHandler =
()=>{

if(
document.hidden
){
return;
}

void syncTradeStreamFromRest();

};

document.addEventListener(
"visibilitychange",
visibilityHandler
);

syncTimer =
setInterval(
()=>{

if(
document.hidden
){
return;
}

void syncTradeStreamFromRest();

},
POSITIONS_SYNC_INTERVAL_MS
);

return ()=>{
stopTradeStreamBridge();
};

}
