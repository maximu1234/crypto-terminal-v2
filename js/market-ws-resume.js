/**
 * iOS/iPad Safari freezes background tabs and often leaves a zombie
 * WebSocket that still looks OPEN. On return: force-reconnect public WS
 * and REST-merge only a contiguous suffix so the chart cannot draw a hole.
 */
import {
forceReconnectPublicSocket
} from "./ws.js?v=21";

import {
resetBingxWs
} from "./exchanges/bingx/ws.js?v=19";

import {
getActiveExchangeId,
loadMarketHistory
} from "./market-api.js?v=6";

import {
lastOhlcBar,
liveBarPeriodSec,
mergeCatchupOhlcBars,
paintCatchupLiveSeries
} from "./chart/live-bar-roll.js?v=4";

import {
catchupHistoryPages,
shouldCatchupFromBackground,
STALE_PERIODS
} from "./market-ws-resume-policy.js?v=1";

const FOREGROUND_EVENT =
"market-ws-foreground";

let installed =
false;

let bindId =
0;

/** @type {Map<number, object>} */
const binders =
new Map();

/** @type {Map<string, Promise<unknown[]>>} */
const inflightCatchup =
new Map();

let hiddenAt =
0;

let resumeTimer =
null;

let resumeInflight =
null;

let resumeQueued =
false;

function isDesktopShell(){

return !!globalThis.window?.cryptoTerminalDesktop?.isDesktop;

}

function isAppleMobileWeb(){

if(
isDesktopShell() ||
typeof navigator ===
"undefined"
){
return false;
}

const ua =
navigator.userAgent ||
"";

if(
/iPhone|iPod|iPad/i.test(
ua
)
){
return true;
}

const maxTouch =
Number(
navigator.maxTouchPoints
) ||
0;

if(
maxTouch <
2
){
return false;
}

return (
/Macintosh|Mac OS X/i.test(
ua
) ||
navigator.platform ===
"MacIntel"
);

}

export function bindLiveCandleCatchup(
opts
){

if(
!opts ||
typeof opts.getCandles !==
"function"
){
return ()=>{};
}

installMarketWsResume();

bindId += 1;
const id =
bindId;

binders.set(
id,
opts
);

return ()=>{
binders.delete(
id
);
};

}

async function mapPool(
items,
limit,
fn
){

if(
!items.length
){
return;
}

let cursor =
0;
const workers =
Math.min(
Math.max(
1,
limit
),
items.length
);

async function worker(){

while(
cursor <
items.length
){
const index =
cursor;
cursor += 1;
await fn(
items[index]
);
}

}

await Promise.all(
Array.from(
{
length:
workers
},
worker
)
);

}

function binderKey(
binder
){

const symbol =
String(
binder.getSymbol?.() ||
""
).toUpperCase();
const tf =
String(
binder.getTf?.() ||
""
);

if(
!symbol ||
!tf
){
return "";
}

return [
getActiveExchangeId() ||
"bybit",
symbol,
tf
].join(
"|"
);

}

async function loadCatchupBars(
symbol,
tf,
pages
){

const key =
[
getActiveExchangeId() ||
"bybit",
String(symbol || "").toUpperCase(),
String(tf || ""),
String(pages)
].join(
"|"
);

const existing =
inflightCatchup.get(
key
);

if(
existing
){
return existing;
}

const pending =
loadMarketHistory(
symbol,
tf,
pages
).finally(
()=>{
if(
inflightCatchup.get(
key
) ===
pending
){
inflightCatchup.delete(
key
);
}
}
);

inflightCatchup.set(
key,
pending
);

return pending;

}

function applyCatchupToBinder(
binder,
incoming
){

if(
binder.isAlive &&
!binder.isAlive()
){
return;
}

const candles =
binder.getCandles?.();
const tf =
binder.getTf?.();
const period =
liveBarPeriodSec(
tf
);

if(
!Array.isArray(candles) ||
!candles.length ||
!period
){
return;
}

const prevLen =
candles.length;
const maxLen =
Number(binder.maxLen) ||
0;
const result =
mergeCatchupOhlcBars(
candles,
incoming,
maxLen,
period
);

if(
!result.changed
){
return;
}

try{
if(
typeof binder.paint ===
"function"
){
binder.paint(
candles,
{
appended:
result.appended,
patched:
result.patched,
prevLen
}
);
}else{
paintCatchupLiveSeries(
binder.getSeries?.(),
candles,
binder.getChart?.(),
result.appended,
prevLen
);
}
}catch{
/* chart disposed */
}

try{
binder.onMerged?.(
result
);
}catch{
/* ignore */
}

}

async function runCatchupBinders(){

if(
!binders.size
){
return;
}

const nowSec =
Date.now() / 1000;
const groups =
new Map();

binders.forEach(
binder=>{

if(
binder.isAlive &&
!binder.isAlive()
){
return;
}

const key =
binderKey(
binder
);
const candles =
binder.getCandles?.();
const last =
lastOhlcBar(
candles
);
const period =
liveBarPeriodSec(
binder.getTf?.()
);

if(
!key ||
!last ||
!period
){
return;
}

const lastTime =
Number(last.time);

if(
nowSec - lastTime <=
period * STALE_PERIODS
){
return;
}

const pages =
catchupHistoryPages(
lastTime,
period,
nowSec
);
let group =
groups.get(
key
);

if(
!group
){
group = {
symbol:
binder.getSymbol?.(),
tf:
binder.getTf?.(),
pages,
binders:
[]
};
groups.set(
key,
group
);
}

group.pages =
Math.max(
group.pages,
pages
);
group.binders.push(
binder
);

}
);

const jobs =
[...groups.values()];

await mapPool(
jobs,
3,
async group=>{

let incoming =
null;

try{
incoming =
await loadCatchupBars(
group.symbol,
group.tf,
group.pages
);
}catch{
return;
}

if(
!Array.isArray(incoming) ||
!incoming.length
){
return;
}

for(const binder of group.binders){
applyCatchupToBinder(
binder,
incoming
);
}

}
);

}

async function resumePublicMarket(){

if(
isDesktopShell()
){
return;
}

forceReconnectPublicSocket();
resetBingxWs();

if(
typeof window !==
"undefined"
){
window.dispatchEvent(
new Event(
FOREGROUND_EVENT
)
);
}

await runCatchupBinders();

}

function scheduleResume(){

if(
resumeTimer
){
clearTimeout(
resumeTimer
);
}

resumeTimer =
setTimeout(
()=>{

resumeTimer =
null;

if(
resumeInflight
){
resumeQueued =
true;
return resumeInflight;
}

resumeInflight =
resumePublicMarket().finally(
()=>{
resumeInflight =
null;

if(
resumeQueued
){
resumeQueued =
false;
scheduleResume();
}

}
);

},
250
);

}

function hiddenDurationMs(
persisted
){

if(
persisted
){
return 1e9;
}

if(
!hiddenAt
){
return 0;
}

return Date.now() - hiddenAt;

}

function maybeResume(
{
visible,
persisted = false
} = {}
){

if(
!shouldCatchupFromBackground({
isDesktop:
isDesktopShell(),
visible,
hiddenMs:
hiddenDurationMs(
persisted
),
appleMobile:
isAppleMobileWeb()
})
){
return;
}

hiddenAt =
0;
scheduleResume();

}

export function installMarketWsResume(){

if(
installed ||
typeof window ===
"undefined" ||
typeof document ===
"undefined"
){
return;
}

installed =
true;

document.addEventListener(
"visibilitychange",
()=>{

if(
document.visibilityState ===
"hidden"
){
hiddenAt =
Date.now();
return;
}

if(
document.visibilityState ===
"visible"
){
maybeResume({
visible:
true
});
}

}
);

window.addEventListener(
"pageshow",
event=>{

maybeResume({
visible:
document.visibilityState !==
"hidden",
persisted:
!!event.persisted
});

}
);

}
