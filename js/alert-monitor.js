import {
alertEntryKey,
commitAlertTriggeredLocally,
formatAlertTelegramText,
getActiveAlerts
} from "./alerts.js?v=97";

import {
subscribeKline
} from "./ws.js?v=16";

/* Базовая цена отдельно для каждого алерта (symbol + shapeId) */
const lastPriceByAlert =
new Map();

/** Время свечи, на которой зафиксирован baseline (для same-bar wick guard). */
const lastCandleTimeByAlert =
new Map();

/** Фоновые WS на TF алертов, когда график на другом TF. */
const backgroundAlertUnsubs =
new Map();

/** WS по всем символам/TF активных алертов (вкладка в фоне, другая монета на графике). */
const globalAlertUnsubs =
new Map();

const recentlyTriggered =
new Map();

const TRIGGER_COOLDOWN_MS = 60000;

/** После отпускания линии — не считать ложное пересечение (перетаскивали к цене). */
const POST_DRAG_QUIET_MS = 3000;
const postDragQuietUntil =
new Map();

/** shapeId → symbol пока тянут линию алерта (не проверять пересечение). */
const dragPausedAlerts =
new Map();

const ALERT_SOUND_URL =
"/sounds/cute_msg_alert.mp3";

const MOBILE_ALERT_MQ =
window.matchMedia(
"(max-width: 640px)"
);

let alertSound =
null;

export function setAlertDragPaused(
symbol,
shapeId,
paused
){

const sym =
String(symbol || "").trim().toUpperCase();
const sid =
String(shapeId || "").trim();

if(
!sym ||
!sid
){
return;
}

const key =
alertEntryKey(
sym,
sid
);

if(paused){
dragPausedAlerts.set(
key,
sym
);
}else{
dragPausedAlerts.delete(key);
}

}

/** После отпускания линии — не считать пересечение сразу. */
export function armAlertQuietAfterDrag(
symbol,
shapeId
){

const sym =
String(symbol || "").trim().toUpperCase();
const sid =
String(shapeId || "").trim();

if(
!sym ||
!sid
){
return;
}

postDragQuietUntil.set(
alertEntryKey(
sym,
sid
),
Date.now() + POST_DRAG_QUIET_MS
);

}

export function resetAlertWatchBaseline(
symbol,
shapeId,
price
){

const sym =
String(symbol || "").trim().toUpperCase();
const sid =
String(shapeId || "").trim();

if(
!sym ||
!sid
){
return;
}

const key =
alertEntryKey(
sym,
sid
);

const baseline =
Number.isFinite(Number(price))
? Number(price)
: undefined;

if(baseline !== undefined){
lastPriceByAlert.set(
key,
baseline
);
}else{
lastPriceByAlert.delete(key);
}

lastCandleTimeByAlert.delete(key);

recentlyTriggered.delete(key);

}

function didCrossLine(prev, curr, level){

if(
!Number.isFinite(prev) ||
!Number.isFinite(curr) ||
!Number.isFinite(level)
){
return false;
}

if(prev === curr){
return false;
}

return (
prev - level
) * (
curr - level
) <= 0;

}

function didCrossWithCandle(
prev,
candle,
level,
{
sameBar =
false
} = {}
){

if(
!Number.isFinite(
prev
) ||
!Number.isFinite(
level
) ||
!candle
){
return false;
}

const close =
Number(
candle.close
);

if(
didCrossLine(
prev,
close,
level
)
){
return true;
}

if(
sameBar
){
return false;
}

const high =
Number(
candle.high
);
const low =
Number(
candle.low
);

if(
Number.isFinite(
high
) &&
prev <
level &&
high >=
level
){
return true;
}

if(
Number.isFinite(
low
) &&
prev >
level &&
low <=
level
){
return true;
}

return false;

}

function pruneAlertWatchState(){

const active =
getActiveAlerts();

const activeKeys =
new Set(
active.map(a=>
alertEntryKey(
a.symbol,
a.shapeId
)
)
);

for(const key of [
...lastPriceByAlert.keys()
]){

if(!activeKeys.has(key)){
lastPriceByAlert.delete(key);
lastCandleTimeByAlert.delete(key);
recentlyTriggered.delete(key);
}

}

}

function isMobileAlertViewport(){

return MOBILE_ALERT_MQ.matches;

}

function releaseAlertMediaSession(){

try{

const audio =
alertSound;

if(audio){
audio.pause();
audio.currentTime = 0;
}

if(
typeof navigator !== "undefined" &&
navigator.mediaSession
){
navigator.mediaSession.playbackState = "none";
navigator.mediaSession.metadata = null;
}

}catch{}

}

function ensureAlertSound(){

if(alertSound){
return alertSound;
}

const audio =
new Audio(ALERT_SOUND_URL);

audio.preload =
isMobileAlertViewport()
? "none"
: "auto";

audio.addEventListener(
"ended",
()=>{
releaseAlertMediaSession();
},
{ passive: true }
);

alertSound = audio;
return audio;

}

function playAlertSound(){

try{

const audio =
ensureAlertSound();

if(!audio){
return;
}

audio.currentTime = 0;

if(!alertAudioUnlocked){
unlockAlertAudioOnGesture();
}

const play =
audio.play();

if(
play &&
typeof play.catch === "function"
){
play.catch(()=>{});
}

}catch{}

}

function ensureToastHost(){

let host =
document.getElementById("alert-toast-host");

if(host){
return host;
}

host = document.createElement("div");
host.id = "alert-toast-host";
host.setAttribute("aria-live", "polite");
document.body.appendChild(host);
return host;

}

function showToast(title, body){

const host =
ensureToastHost();

while(host.children.length > 4){
host.firstElementChild?.remove();
}

const el =
document.createElement("div");

el.className = "alert-toast";

el.innerHTML = `
<div class="alert-toast-title">${title}</div>
<div class="alert-toast-body">${body}</div>
`;

host.appendChild(el);

setTimeout(()=>{
el.classList.add("alert-toast--out");
}, 5000);

setTimeout(()=>{
el.remove();
if(!host.children.length){
host.remove();
}
}, 5350);

}

function showSystemNotification(title, body){

if(
typeof Notification === "undefined" ||
Notification.permission !== "granted"
){
return;
}

try{

const n =
new Notification(title, {
body,
tag: `alert-${Date.now()}`,
requireInteraction: false
});

setTimeout(()=>n.close(), 8000);

}catch{}

}

export function notifyAlertTriggered(alert){

const text =
formatAlertTelegramText(alert);
const lines =
text.split("\n");

const title =
lines[0] || "Алерт";

const body =
lines.slice(1).join("\n") ||
"";

playAlertSound();
showToast(title, body);
showSystemNotification(title, body);

}

function maybeRequestNotificationPermission(){

if(
typeof Notification === "undefined" ||
Notification.permission !== "default"
){
return;
}

if(!getActiveAlerts().length){
return;
}

Notification.requestPermission().catch(()=>{});

}

function evaluateAlerts(
symbol,
candle,
active,
chartTf
){

const close =
Number(candle?.close);

if(
!Number.isFinite(close) ||
!active.length
){
return;
}

const tfNorm =
String(chartTf || "60");

for(const alert of active){

if(String(alert.tf || "60") !== tfNorm){
continue;
}

const key =
alertEntryKey(
alert.symbol,
alert.shapeId
);

if(dragPausedAlerts.has(key)){
continue;
}

if(
(postDragQuietUntil.get(key) || 0) >
Date.now()
){
continue;
}

const level =
Number(
alert.price
);

const candleTime =
candle?.time;

let prev =
lastPriceByAlert.get(
key
);

if(
prev ===
undefined
){

/* Новый алерт: запомнить текущую цену, не проверять пересечение сразу */
lastPriceByAlert.set(
key,
close
);

if(
candleTime !=
null
){
lastCandleTimeByAlert.set(
key,
candleTime
);
}

continue;

}

const sameBar =
candleTime !=
null &&
lastCandleTimeByAlert.get(
key
) ===
candleTime;

if(
!didCrossWithCandle(
prev,
candle,
level,
{
sameBar
}
)
){
lastPriceByAlert.set(
key,
close
);

if(
candleTime !=
null
){
lastCandleTimeByAlert.set(
key,
candleTime
);
}

continue;

}

const lastFire =
recentlyTriggered.get(key);

if(
lastFire &&
Date.now() - lastFire < TRIGGER_COOLDOWN_MS
){
continue;
}

recentlyTriggered.set(
key,
Date.now()
);
lastPriceByAlert.delete(key);

commitAlertTriggeredLocally(
alert.symbol,
alert.shapeId
);

}

}

function backgroundStreamKey(
symbol,
tf
){

return `${symbol}::${String(tf || "60")}`;

}

/**
 * Подписки на свечи TF алертов, отличных от TF графика (алерт 1m при просмотре 1h).
 */
function subscribeAlertTopic(
symbol,
tf,
onCandle
){

return subscribeKline(
symbol,
tf,
onCandle
);

}

/**
 * Подписки на все пары symbol+tf из реестра алертов (не зависит от открытой монеты).
 */
export function syncGlobalAlertStreams(){

const needed =
new Set();

for(
const alert of getActiveAlerts()
){

const sym =
String(
alert.symbol ||
""
).trim().toUpperCase();
const alertTf =
String(
alert.tf ||
"60"
);

if(
!sym
){
continue;
}

needed.add(
backgroundStreamKey(
sym,
alertTf
)
);

}

for(
const [key, unsub] of globalAlertUnsubs
){

if(
!needed.has(
key
)
){
unsub();
globalAlertUnsubs.delete(
key
);
}

}

for(
const key of needed
){

if(
globalAlertUnsubs.has(
key
)
){
continue;
}

const sep =
key.indexOf(
"::"
);

const sym =
key.slice(
0,
sep
);
const alertTf =
key.slice(
sep +
2
);

const unsub =
subscribeAlertTopic(
sym,
alertTf,
candle=>{

const active =
getActiveAlerts().filter(
a=>
String(
a.symbol ||
""
).toUpperCase() ===
sym
);

if(
!active.length
){
return;
}

evaluateAlerts(
sym,
candle,
active,
alertTf
);

}
);

globalAlertUnsubs.set(
key,
unsub
);

}

}

export function syncBackgroundAlertStreams(
symbol,
chartTf
){

const sym =
String(symbol || "").trim().toUpperCase();
const chartTfNorm =
String(chartTf || "60");

if(!sym){
return;
}

const needed =
new Set();

for(const alert of getActiveAlerts()){

if(
String(alert.symbol || "").toUpperCase() !== sym
){
continue;
}

const alertTf =
String(alert.tf || "60");

if(alertTf === chartTfNorm){
continue;
}

needed.add(
backgroundStreamKey(
sym,
alertTf
)
);

}

for(
const [key, unsub] of backgroundAlertUnsubs
){

if(
!key.startsWith(`${sym}::`) ||
needed.has(key)
){
continue;
}

unsub();
backgroundAlertUnsubs.delete(key);

}

for(const key of needed){

if(backgroundAlertUnsubs.has(key)){
continue;
}

const alertTf =
key.slice(sym.length + 2);

const unsub =
subscribeAlertTopic(
sym,
alertTf,
candle=>{

const active =
getActiveAlerts().filter(
a=>
String(a.symbol || "").toUpperCase() === sym
);

if(!active.length){
return;
}

evaluateAlerts(
sym,
candle,
active,
alertTf
);

}
);

backgroundAlertUnsubs.set(
key,
unsub
);

}

}

export function processAlertCandle(
symbol,
candle,
chartTf
){

if(
!symbol ||
!candle
){
return;
}

const sym =
String(symbol || "").trim().toUpperCase();

const active =
getActiveAlerts().filter(
a=>
String(a.symbol || "").toUpperCase() === sym
);

if(active.length){
evaluateAlerts(
sym,
candle,
active,
chartTf
);
}

syncBackgroundAlertStreams(
sym,
chartTf
);

syncGlobalAlertStreams();

}

let alertAudioUnlocked = false;
let alertUnlockListenersBound = false;

function unlockAlertAudioOnGesture(){

if(alertAudioUnlocked){
return;
}

try{

const Ctx =
window.AudioContext ||
window.webkitAudioContext;

if(Ctx){
const ctx =
new Ctx();

const done =
()=>{
alertAudioUnlocked = true;
ctx.close().catch(()=>{});
};

const resumed =
ctx.resume();

if(
resumed &&
typeof resumed.then === "function"
){
resumed.then(done).catch(()=>{
alertAudioUnlocked = true;
});
}else{
done();
}

return;
}

}catch{
/* ignore */
}

alertAudioUnlocked = true;

}

function bindAlertUnlockListeners(){

if(alertUnlockListenersBound){
return;
}

alertUnlockListenersBound = true;

for(const ev of [
"pointerdown",
"touchstart",
"keydown"
]){

document.addEventListener(
ev,
unlockAlertAudioOnGesture,
{
once: true,
passive: true
}
);

}

}

function syncAlertAudioLifecycle(){

if(
isMobileAlertViewport() &&
!getActiveAlerts().length
){
releaseAlertMediaSession();
return;
}

if(getActiveAlerts().length){
bindAlertUnlockListeners();
}

}

export function initAlertMonitor(){

if(
!isMobileAlertViewport() ||
getActiveAlerts().length
){
bindAlertUnlockListeners();
}

if(!isMobileAlertViewport()){
ensureAlertSound();
}

document.addEventListener(
"visibilitychange",
()=>{

if(
document.visibilityState === "hidden"
){
releaseAlertMediaSession();
}

}
);

maybeRequestNotificationPermission();

const resyncAlertStreams =
()=>{
pruneAlertWatchState();
syncGlobalAlertStreams();
syncAlertAudioLifecycle();
maybeRequestNotificationPermission();
window.dispatchEvent(
new CustomEvent(
"alert-streams-sync"
)
);
};

window.addEventListener(
"alerts-changed",
resyncAlertStreams
);

window.addEventListener(
"price-alerts-changed",
resyncAlertStreams
);

document.addEventListener(
"visibilitychange",
()=>{

if(
document.visibilityState ===
"visible"
){
syncGlobalAlertStreams();
}

}
);

syncAlertAudioLifecycle();
syncGlobalAlertStreams();

}
