import {
alertEntryKey,
commitAlertTriggeredLocally,
formatTfLabel,
getActiveAlerts,
markAlertTriggered
} from "./alerts.js?v=30";

import { formatPrice } from "./chart.js";

/* Базовая цена отдельно для каждого алерта (symbol + shapeId) */
const lastPriceByAlert =
new Map();

const recentlyTriggered =
new Map();

const TRIGGER_COOLDOWN_MS = 60000;

let audioCtx = null;

function displaySymbol(symbol){

if(!symbol){
return "—";
}

if(symbol.endsWith("USDT")){
return `${symbol.replace(/USDT$/, "")}/USDT`;
}

return symbol;

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

function ensureAudioContext(){

if(audioCtx){
return audioCtx;
}

const Ctx =
window.AudioContext ||
window.webkitAudioContext;

if(!Ctx){
return null;
}

audioCtx = new Ctx();
return audioCtx;

}

function playTone(
ctx,
t0,
freq,
duration,
peakGain
){

const osc =
ctx.createOscillator();

const gain =
ctx.createGain();

osc.type = "square";
osc.frequency.setValueAtTime(freq, t0);

gain.gain.setValueAtTime(0.0001, t0);
gain.gain.exponentialRampToValueAtTime(
peakGain,
t0 + 0.03
);
gain.gain.exponentialRampToValueAtTime(
0.0001,
t0 + duration
);

osc.connect(gain);
gain.connect(ctx.destination);

osc.start(t0);
osc.stop(t0 + duration + 0.05);

}

function playAlertSound(){

try{

const ctx =
ensureAudioContext();

if(!ctx){
return;
}

if(ctx.state === "suspended"){
ctx.resume();
}

const t0 =
ctx.currentTime;

playTone(ctx, t0, 880, 0.38, 0.55);
playTone(ctx, t0 + 0.42, 1175, 0.42, 0.5);
playTone(ctx, t0 + 0.88, 880, 0.38, 0.45);

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

function notifyAlertTriggered(alert){

const sym =
displaySymbol(alert.symbol);

const tf =
formatTfLabel(alert.tf);

const price =
formatPrice(alert.price);

const title =
`${sym} · ${tf}`;

const body =
`Цена пересекла уровень ${price}`;

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

const level =
Number(alert.price);

const key =
alertEntryKey(
alert.symbol,
alert.shapeId
);

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

void markAlertTriggered(
alert.symbol,
alert.shapeId
).then(cloudOk=>{

if(!cloudOk){
console.warn(
"alert: не удалось отметить в Supabase",
alert.symbol,
alert.shapeId
);
}

});

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

const active =
getActiveAlerts().filter(
a=>a.symbol === symbol
);

if(!active.length){
return;
}

evaluateAlerts(
symbol,
candle,
active,
chartTf
);

}

export function initAlertMonitor(){

maybeRequestNotificationPermission();

window.addEventListener(
"alerts-changed",
()=>{
pruneAlertWatchState();
maybeRequestNotificationPermission();
}
);

}
