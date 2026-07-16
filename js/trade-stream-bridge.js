/**
 * Desktop: Bybit private WS → renderer (positions/orders без polling).
 */
import {
applyTradePositionsStream,
syncTradePositionsCache
} from "./trade-positions-cache.js?v=32";

import {
isTradePositionSoundBaselineReady
} from "./trade-position-sounds.js?v=3";

import {
isExchangeTradingEnabled
} from "./market-api.js?v=2";

import {
getTradeExchangePolicy
} from "./trade/exchanges/index.js?v=12";

let unsubscribe =
null;
let visibilityHandler =
null;
let syncTimer =
null;
let restSyncDelayTimer =
null;
let initialStreamSyncDone =
false;
let bridgeStarted =
false;
let currentSyncIntervalMs =
5000;

const POSITIONS_SYNC_RATE_LIMIT_MS =
60000;

const REST_SYNC_DELAY_MS =
400;

function defaultPositionsSyncIntervalMs(){

return getTradeExchangePolicy().positionsSyncIntervalMs;

}

async function syncTradeOrdersFromRest(){

const api =
window.cryptoTerminalDesktop?.trading;

if(
!api?.getOpenOrders
){
return null;
}

const status =
await api.getStatus?.();

if(
!status?.configured
){
return null;
}

try{
const policy =
getTradeExchangePolicy();
const result =
await api.getOpenOrders(
policy.restOrdersForceRefresh
? {
forceRefresh:
true
}
: {}
);

if(
!result?.ok
){
return result;
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

return result;
}catch{
return null;
}

}

function scheduleSyncTimer(){

if(
syncTimer
){
clearInterval(
syncTimer
);
}

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
currentSyncIntervalMs
);

}

function applySyncIntervalFromResult(
result
){

if(
result?.rateLimited
){
currentSyncIntervalMs =
POSITIONS_SYNC_RATE_LIMIT_MS;
}else if(
result?.ok
){
currentSyncIntervalMs =
defaultPositionsSyncIntervalMs();
}

scheduleSyncTimer();

}

async function applySyncIntervalFromRateLimit(
result
){

if(
!result?.rateLimited
){
applySyncIntervalFromResult(
result
);
return;
}

let backoffMs =
POSITIONS_SYNC_RATE_LIMIT_MS;

try{
const api =
window.cryptoTerminalDesktop?.trading;

if(
api?.getRateLimitBackoffMs
){
const remoteMs =
Number(
await api.getRateLimitBackoffMs()
);

if(
Number.isFinite(
remoteMs
) &&
remoteMs >
0
){
backoffMs =
Math.max(
backoffMs,
remoteMs
);
}
}
}catch{
/* ignore */
}

currentSyncIntervalMs =
backoffMs;
scheduleSyncTimer();

}

async function syncTradeStreamFromRest(){

if(
document.hidden
){
return;
}

const posResult =
await syncTradePositionsCache();

await applySyncIntervalFromRateLimit(
posResult
);

if(
posResult?.rateLimited
){
initialStreamSyncDone =
true;
return;
}

await syncTradeOrdersFromRest();

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
restSyncDelayTimer
){
clearTimeout(
restSyncDelayTimer
);
restSyncDelayTimer =
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
currentSyncIntervalMs =
defaultPositionsSyncIntervalMs();

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
initialStreamSyncDone =
true;
restSyncDelayTimer =
setTimeout(
()=>{
restSyncDelayTimer =
null;
void syncTradeStreamFromRest();
},
REST_SYNC_DELAY_MS
);
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

scheduleSyncTimer();

return ()=>{
stopTradeStreamBridge();
};

}
