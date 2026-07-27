/**
 * Algo private WS → renderer (positions/orders). Isolated from Terminal stream.
 */
import {
applyTradePositionsStream,
syncTradePositionsCache
} from "./positions-cache.js?v=3";

let unsubscribe =
null;
let visibilityHandler =
null;
let syncTimer =
null;
let bridgeStarted =
false;

function algoApi(){

return window.cryptoTerminalDesktop?.algoTrading ||
null;

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

async function syncOrdersFromRest(){

const api =
algoApi();

if(
!api?.getOpenOrders
){
return;
}

const keys =
await api.getKeysStatus?.();

if(
!keys?.configured
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
"algo-trade-stream-orders",
{
orders
}
);
dispatch(
"algo-trade-orders-refresh",
{
orders
}
);
}catch{
/* ignore */
}

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
applyTradePositionsStream(
payload.positions ||
[]
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
"algo-trade-stream-orders",
{
orders
}
);
dispatch(
"algo-trade-orders-refresh",
{
orders
}
);
}

}

async function syncFromRest(){

await syncTradePositionsCache();
await syncOrdersFromRest();

}

export function stopAlgoTradeStreamBridge(){

bridgeStarted =
false;

if(
unsubscribe
){
unsubscribe();
unsubscribe =
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

if(
syncTimer
){
clearInterval(
syncTimer
);
syncTimer =
null;
}

}

export async function startAlgoTradeStreamBridge(){

if(
bridgeStarted
){
return;
}

const api =
algoApi();

if(
!api?.onStream
){
return;
}

bridgeStarted =
true;

unsubscribe =
api.onStream(
handleStreamPayload
);

try{
await api.ensureStream?.();
await api.replayStream?.();
await api.requestStreamSeed?.();
}catch(
err
){
console.warn(
"[algo-trading] stream seed",
err
);
}

await syncFromRest();

visibilityHandler =
()=>{

if(
document.visibilityState ===
"visible"
){
void syncFromRest();
}

};

document.addEventListener(
"visibilitychange",
visibilityHandler
);

syncTimer =
setInterval(
()=>{
void syncFromRest();
},
8000
);

}

export function initAlgoTradeStreamBridge(){

if(
!document.body.classList.contains(
"algo-trading-page"
)
){
return;
}

void startAlgoTradeStreamBridge();

}
