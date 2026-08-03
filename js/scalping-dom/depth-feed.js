/**
 * Scalping DOM depth feed — WebSocket primary, REST fallback.
 */
import {
loadMarketOrderbook
} from "../market-api.js?v=5";

import {
EXCHANGE_CHANGED_EVENT,
getActiveExchangeId
} from "../exchanges/context.js?v=1";

import {
buildLadderFromBook,
makeStickyPriceRange,
stickyHalfSpanForScale,
stickyRangeNeedsRecenter
} from "./depth-store.js?v=10";

import {
applyPositionOverlays,
applySlTpHighlights,
resolvePositionOverlays,
resolveSlTpPrices
} from "./position-overlay.js?v=5";

import {
applyAlertUnderlines,
resolveAlertPrices
} from "./alert-overlay.js?v=2";

import {
applyTriggerUnderlines,
hydrateOpenOrdersFromApi,
ingestOpenOrders,
resolveTriggerLevels
} from "./trigger-order-overlay.js?v=1";

import {
createLiveBook
} from "./live-book.js?v=1";

import {
createBybitDepthWs
} from "./depth-ws-bybit.js?v=3";

import {
createBingxDepthWs
} from "./depth-ws-bingx.js?v=4";

import {
getScalpingDomAutocenterPct,
getScalpingDomPriceScale
} from "./prefs.js?v=4";

const MAX_LEVELS =
50;

/** Cap ladder paint rate — WS can tick faster than the eye needs. */
const RENDER_MIN_MS =
80;

function stickySpan(
priceScale
){

return stickyHalfSpanForScale(
priceScale
);

}

const REST_FALLBACK_MS =
500;

const REST_RESYNC_MS =
20000;

function normalizeSymbol(
raw
){

return String(
raw ||
""
).trim().toUpperCase().replace(
/\.P$/i,
""
).replace(
/[^A-Z0-9]/g,
""
);

}

let lastChartSymbol =
"";

function readChartSymbol(){

if(
lastChartSymbol
){
return lastChartSymbol;
}

const label =
document.getElementById(
"current-symbol"
)?.textContent ||
"";

return normalizeSymbol(
label
);

}

/**
 * @param {{
 *   onLadder: (ladder: ReturnType<typeof buildLadderFromBook> | null) => void,
 *   onSymbol: (symbol: string) => void,
 *   onStatus: (text: string) => void
 * }} handlers
 */
export function createDepthFeed(
handlers
){

const book =
createLiveBook();

let stopped =
false;
let symbol =
"";
let ws =
null;
let wsLive =
false;
let restTimer =
null;
let resyncTimer =
null;
let restInflight =
false;
let renderRaf =
0;
let renderTimer =
0;
let dirty =
false;
let lastEmitAt =
0;
let overlayCache =
null;
let overlayCacheAt =
0;

const OVERLAY_CACHE_MS =
300;
/** @type {{ high: number, low: number, tick: number } | null} */
let stickyRange =
null;

function resetStickyRange(){

stickyRange =
null;

}

function emitLadder(){

if(
stopped
){
return;
}

if(
!book.isReady()
){
return;
}

const priceScale =
getScalpingDomPriceScale();
const raw =
book.toBook();
const baseOpts =
{
maxLevels:
MAX_LEVELS,
priceScale
};

let recentered =
false;
let ladder =
buildLadderFromBook(
raw,
stickyRange
? {
...baseOpts,
rangeHigh:
stickyRange.high,
rangeLow:
stickyRange.low
}
: baseOpts
);

if(
!stickyRange ||
stickyRange.tick !==
ladder.tick
){
stickyRange =
makeStickyPriceRange(
ladder.mid,
ladder.tick,
stickySpan(
priceScale
)
);
recentered =
true;

if(
stickyRange
){
ladder =
buildLadderFromBook(
raw,
{
...baseOpts,
rangeHigh:
stickyRange.high,
rangeLow:
stickyRange.low
}
);
}

}else if(
stickyRangeNeedsRecenter(
stickyRange,
ladder.mid,
getScalpingDomAutocenterPct()
)
){
stickyRange =
makeStickyPriceRange(
ladder.mid,
ladder.tick,
stickySpan(
priceScale
)
);
recentered =
true;

if(
stickyRange
){
ladder =
buildLadderFromBook(
raw,
{
...baseOpts,
rangeHigh:
stickyRange.high,
rangeLow:
stickyRange.low
}
);
}

}

ladder.recentered =
recentered;

const now =
performance.now();

if(
!overlayCache ||
overlayCache.symbol !==
symbol ||
now -
overlayCacheAt >=
OVERLAY_CACHE_MS
){
overlayCache =
{
symbol,
overlays:
resolvePositionOverlays(
symbol,
{
mid:
ladder.mid,
bestBid:
ladder.bestBid,
bestAsk:
ladder.bestAsk
}
),
alerts:
resolveAlertPrices(
symbol
),
triggers:
resolveTriggerLevels(
symbol
),
slTp:
resolveSlTpPrices(
symbol
)
};
overlayCacheAt =
now;
}

const withPos =
applyPositionOverlays(
ladder,
overlayCache.overlays
);

const withAlerts =
applyAlertUnderlines(
withPos,
overlayCache.alerts
);

const withTriggers =
applyTriggerUnderlines(
withAlerts,
overlayCache.triggers
);

handlers.onLadder?.(
applySlTpHighlights(
withTriggers,
overlayCache.slTp
)
);

}

function clearRenderSchedule(){

if(
renderRaf
){
cancelAnimationFrame(
renderRaf
);
renderRaf =
0;
}

if(
renderTimer
){
clearTimeout(
renderTimer
);
renderTimer =
0;
}

}

function flushEmit(){

renderRaf =
0;
renderTimer =
0;

if(
!dirty ||
stopped
){
return;
}

if(
typeof document !==
"undefined" &&
document.hidden
){
return;
}

dirty =
false;
lastEmitAt =
performance.now();
emitLadder();

}

function scheduleEmit(){

dirty =
true;

if(
stopped
){
return;
}

if(
typeof document !==
"undefined" &&
document.hidden
){
return;
}

if(
renderRaf ||
renderTimer
){
return;
}

const elapsed =
performance.now() -
lastEmitAt;
const wait =
Math.max(
0,
RENDER_MIN_MS -
elapsed
);

if(
wait <=
0
){
renderRaf =
requestAnimationFrame(
flushEmit
);
return;
}

renderTimer =
setTimeout(
()=>{
renderTimer =
0;
renderRaf =
requestAnimationFrame(
flushEmit
);
},
wait
);

}

function invalidateOverlayCache(){

overlayCache =
null;
overlayCacheAt =
0;

}

function stopRestFallback(){

if(
restTimer !=
null
){
clearInterval(
restTimer
);
restTimer =
null;
}

}

function stopResync(){

if(
resyncTimer !=
null
){
clearInterval(
resyncTimer
);
resyncTimer =
null;
}

}

async function restLoad(
reason
){

if(
stopped ||
!symbol ||
restInflight
){
return;
}

restInflight =
true;

try{
const depth =
getActiveExchangeId() ===
"bingx"
? 100
: 1000;
const snap =
await loadMarketOrderbook(
symbol,
depth
);

if(
stopped
){
return;
}

book.replaceBook(
{
bids:
snap?.bids,
asks:
snap?.asks
}
);
scheduleEmit();
handlers.onStatus?.(
""
);
}catch(
err
){
if(
!stopped &&
!book.isReady()
){
handlers.onStatus?.(
err?.message
? String(
err.message
)
: "Ошибка стакана"
);
}
}finally{
restInflight =
false;
}

}

function startRestFallback(){

if(
restTimer !=
null ||
stopped
){
return;
}

void restLoad(
"fallback"
);
restTimer =
setInterval(
()=>{
if(
wsLive
){
stopRestFallback();
return;
}
void restLoad(
"fallback"
);
},
REST_FALLBACK_MS
);

}

function startResync(){

stopResync();
resyncTimer =
setInterval(
()=>{
if(
stopped ||
!wsLive
){
return;
}
void restLoad(
"resync"
);
},
REST_RESYNC_MS
);

}

function destroyWs(){

try{
ws?.stop();
}catch{
/* ignore */
}

ws =
null;
wsLive =
false;

}

function onWsOpen(){

wsLive =
true;
stopRestFallback();
handlers.onStatus?.(
""
);
startResync();

}

function onWsClose(){

wsLive =
false;
stopResync();

if(
!stopped
){
startRestFallback();
}

}

function attachBybit(){

const client =
createBybitDepthWs(
{
onOpen:
onWsOpen,
onClose:
onWsClose,
onStatus:
text=>{
if(
text
){
handlers.onStatus?.(
text
);
}
},
onSnapshot:
data=>{
book.applySnapshot(
data
);
scheduleEmit();
},
onDelta:
data=>{
if(
!book.isReady()
){
return;
}

const result =
book.applyDelta(
data
);

if(
result ===
"resync"
){
void restLoad(
"resync"
);
return;
}

scheduleEmit();
}
}
);

return client;

}

function attachBingx(){

const client =
createBingxDepthWs(
{
onOpen:
onWsOpen,
onClose:
onWsClose,
onStatus:
text=>{
if(
text
){
handlers.onStatus?.(
text
);
}
},
onBook:
data=>{
book.replaceBook(
data
);
scheduleEmit();
}
}
);

return client;

}

function startWs(){

destroyWs();
book.clear();
resetStickyRange();

if(
!symbol
){
return;
}

ws =
getActiveExchangeId() ===
"bingx"
? attachBingx()
: attachBybit();

ws.start(
symbol
);

/* REST until first WS snapshot / if WS slow. */
startRestFallback();

}

function setActiveSymbol(
next
){

const sym =
normalizeSymbol(
next
);

if(
!sym
){
return;
}

if(
sym ===
symbol &&
ws
){
handlers.onSymbol?.(
symbol
);
return;
}

symbol =
sym;
handlers.onSymbol?.(
symbol
);
book.clear();
resetStickyRange();
invalidateOverlayCache();
handlers.onLadder?.(
null
);

if(
ws
){
ws.setSymbol(
symbol
);
book.clear();
startRestFallback();
}else{
startWs();
}

}

const onSymbolChanged =
e=>{

const next =
normalizeSymbol(
e?.detail?.symbol
);

if(
next
){
setActiveSymbol(
next
);
}

};

const onCandlesLoaded =
e=>{

const next =
normalizeSymbol(
e?.detail?.symbol
);

if(
next
){
setActiveSymbol(
next
);
}

};

const onExchangeChanged =
()=>{

if(
stopped
){
return;
}

startWs();
void hydrateOpenOrdersFromApi().then(
()=>
scheduleEmit()
);

};

const onAlertsChanged =
()=>{

if(
stopped
){
return;
}

invalidateOverlayCache();
scheduleEmit();

};

const onOrdersChanged =
(
event
)=>{

if(
stopped
){
return;
}

const list =
event?.detail?.orders;

if(
Array.isArray(
list
)
){
ingestOpenOrders(
list
);
}

invalidateOverlayCache();
scheduleEmit();

};

const onVisibility =
()=>{

if(
stopped ||
document.hidden
){
return;
}

scheduleEmit();

};

function start(){

if(
stopped
){
return;
}

symbol =
readChartSymbol();
handlers.onSymbol?.(
symbol
);

window.addEventListener(
"coins-chart-symbol-changed",
onSymbolChanged
);
window.addEventListener(
"chart-candles-loaded",
onCandlesLoaded
);
window.addEventListener(
EXCHANGE_CHANGED_EVENT,
onExchangeChanged
);
window.addEventListener(
"price-alerts-changed",
onAlertsChanged
);
window.addEventListener(
"alerts-changed",
onAlertsChanged
);
window.addEventListener(
"alerts-registry-pulled",
onAlertsChanged
);
window.addEventListener(
"trade-stream-orders",
onOrdersChanged
);
window.addEventListener(
"trade-orders-refresh",
onOrdersChanged
);
window.addEventListener(
"trade-book-refresh",
onOrdersChanged
);
window.addEventListener(
"trade-stream-positions",
onAlertsChanged
);
document.addEventListener(
"visibilitychange",
onVisibility
);

startWs();
void hydrateOpenOrdersFromApi().then(
()=>
scheduleEmit()
);

}

function stop(){

stopped =
true;
stopRestFallback();
stopResync();
destroyWs();
book.clear();
overlayCache =
null;
clearRenderSchedule();

document.removeEventListener(
"visibilitychange",
onVisibility
);

window.removeEventListener(
"coins-chart-symbol-changed",
onSymbolChanged
);
window.removeEventListener(
"chart-candles-loaded",
onCandlesLoaded
);
window.removeEventListener(
EXCHANGE_CHANGED_EVENT,
onExchangeChanged
);
window.removeEventListener(
"price-alerts-changed",
onAlertsChanged
);
window.removeEventListener(
"alerts-changed",
onAlertsChanged
);
window.removeEventListener(
"alerts-registry-pulled",
onAlertsChanged
);
window.removeEventListener(
"trade-stream-orders",
onOrdersChanged
);
window.removeEventListener(
"trade-orders-refresh",
onOrdersChanged
);
window.removeEventListener(
"trade-book-refresh",
onOrdersChanged
);
window.removeEventListener(
"trade-stream-positions",
onAlertsChanged
);

}

return {
start,
stop,
refresh:()=>
restLoad(
"resync"
),
rebuild:()=>
scheduleEmit()
};

}
