import {
alertEntryKey,
commitAlertTriggeredLocally,
formatAlertTelegramText,
getActiveAlerts
} from "./alerts.js?v=60";

import {
subscribeKline
} from "./ws.js?v=1";

/* Базовая цена отдельно для каждого алерта (symbol + shapeId) */
const lastPriceByAlert =
new Map();

/** Фоновые WS на TF алертов, когда график на другом TF. */
const backgroundAlertUnsubs =
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

function didCrossWithCandle(prev, candle, level){

if(
!Number.isFinite(prev) ||
!Number.isFinite(level) ||
!candle
){
return false;
}

const close =
Number(candle.close);

if(didCrossLine(prev, close, level)){
return true;
}

const high =
Number(candle.high);
const low =
Number(candle.low);

if(
Number.isFinite(high) &&
prev < level &&
high >= level
){
return true;
}

if(
Number.isFinite(low) &&
prev > level &&
low <= level
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
recentlyTriggered.delete(key);
}

}

}

function ensureAlertSound(){

if(alertSound){
return alertSound;
}

const audio =
new Audio(ALERT_SOUND_URL);

audio.preload = "auto";

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
Number(alert.price);

let prev =
lastPriceByAlert.get(key);

if(prev === undefined){

/* Новый алерт: запомнить текущую цену, не проверять пересечение сразу */
lastPriceByAlert.set(
key,
close
);
continue;

}

if(
!didCrossWithCandle(
prev,
candle,
level
)
){
lastPriceByAlert.set(
key,
close
);
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

notifyAlertTriggered(alert);

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
subscribeKline(
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

}

export function initAlertMonitor(){

ensureAlertSound();

maybeRequestNotificationPermission();

window.addEventListener(
"alerts-changed",
()=>{
pruneAlertWatchState();
maybeRequestNotificationPermission();
window.dispatchEvent(
new CustomEvent(
"alert-streams-sync"
)
);
}
);

}
