/**
 * Desktop: Bybit private WS → renderer (positions/orders без polling).
 */
import {
applyTradePositionsStream,
syncTradePositionsCache
} from "./trade-positions-cache.js?v=6";

let unsubscribe =
null;
let visibilityHandler =
null;
let syncTimer =
null;

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
positions
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

export async function initTradeStreamBridge(){

if(
!document.body.classList.contains(
"trade-page"
)
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
unsubscribe?.();
unsubscribe =
null;

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

};

}
