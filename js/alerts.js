const STORAGE_KEY = "price_alerts_v1";

const HISTORY_KEY = "price_alerts_history_v1";

const MAX_ALERT_HISTORY = 30;

function queueAlertsCloud(fn){

import("./alerts-cloud-sync.js?v=7")
.then(m=>fn(m))
.catch(err=>{
console.warn("alerts cloud:", err);
});

}

function normalizeAlertTf(tf){

if(
tf == null ||
tf === ""
){
return "60";
}

return String(tf);

}

async function pushAlertRowToCloud(row){

const delays = [
0,
1500,
4000
];

for(let i = 0; i < delays.length; i++){

if(delays[i] > 0){
await new Promise(r=>{
setTimeout(r, delays[i]);
});
}

try{

const m =
await import("./alerts-cloud-sync.js?v=7");

const ok =
await m.pushAlertToCloud(row);

if(ok){
return;
}

}catch(err){
console.warn(
"alerts cloud push:",
err?.message || err
);
}

}

try{

const m =
await import("./alerts-cloud-sync.js?v=7");

await m.syncAlertsWithCloud();

}catch(err){
console.warn(
"alerts cloud full sync:",
err?.message || err
);
}

}

export const ALERT_LINE_COLOR = "#facc15";

export const ALERT_LINE_DASH = [8, 6];

export const TF_LABELS = {
"1":"1m",
"5":"5m",
"15":"15m",
"60":"1h",
"240":"4h",
"D":"1D"
};

export function formatTfLabel(tf){

if(!tf){
return "—";
}

return TF_LABELS[tf] || tf;

}

export function alertEntryKey(symbol, shapeId){

return `${symbol}::${shapeId}`;

}

function isValidAlertShape(symbol, shape){

return (
shape?.type === "hray" &&
shape.isAlert === true &&
shape.alertCreatedAt &&
shape.alertSymbol === symbol
);

}

export function loadDrawingsForSymbol(symbol){

try{

const raw =
localStorage.getItem(
`drawings_${symbol}`
);

if(!raw){
return [];
}

const list =
JSON.parse(raw);

return Array.isArray(list)
? list
: [];

}catch{

return [];

}

}

function normalizeAlertRow(alert){

if(
!alert ||
typeof alert !== "object"
){
return null;
}

const shapeId =
alert.shapeId ||
alert.id;

if(!shapeId){
return null;
}

let symbol =
alert.symbol;

let price =
Number(alert.price);

let tf =
alert.tf;

let createdAt =
alert.createdAt;

const triggeredAt =
alert.triggeredAt;

if(
!symbol ||
!Number.isFinite(price)
){

for(const { symbol:sym } of listDrawingStorageEntries()){

const drawings =
loadDrawingsForSymbol(sym);

const shape =
drawings.find(
d=>
d.id === shapeId &&
d.type === "hray" &&
d.isAlert === true &&
d.alertCreatedAt
);

if(!shape){
continue;
}

symbol = sym;
price = Number(shape.price);
tf = shape.alertTf || tf;
createdAt =
Number(shape.alertCreatedAt) ||
createdAt;

break;

}

}

if(
!symbol ||
!Number.isFinite(price)
){
return null;
}

const row = {
id: shapeId,
shapeId,
symbol,
price,
tf: tf || "60",
createdAt:
Number(createdAt) ||
Date.now()
};

if(triggeredAt){
row.triggeredAt = triggeredAt;
}

return row;

}

export function getActiveAlerts(){

return loadAlerts().filter(
a=>!a.triggeredAt
);

}

function isStoredAlertRow(alert){

if(
!alert ||
typeof alert !== "object"
){
return false;
}

const shapeId =
alert.shapeId ||
alert.id;

const symbol =
alert.symbol;

const price =
Number(alert.price);

return !!(
symbol &&
shapeId &&
Number.isFinite(price)
);

}

export function loadAlerts(){

try{

const raw =
localStorage.getItem(STORAGE_KEY);

if(!raw){
return [];
}

const list =
JSON.parse(raw);

if(!Array.isArray(list)){
return [];
}

return list
.filter(isStoredAlertRow)
.filter(a=>!a.triggeredAt);

}catch{

return [];

}

}

export function saveAlerts(list){

const cleaned =
(Array.isArray(list)
? list
: [])
.filter(isStoredAlertRow);

localStorage.setItem(
STORAGE_KEY,
JSON.stringify(cleaned)
);

window.dispatchEvent(
new CustomEvent(
"alerts-changed"
)
);

}

export function getAlertsSorted(){

return loadAlerts().sort(
(a, b)=>
(b.createdAt || 0) - (a.createdAt || 0)
);

}

export function upsertAlert(entry){

const shapeId =
entry?.shapeId ||
entry?.id;

const symbol =
String(entry?.symbol || "").trim().toUpperCase();

const price =
Number(entry?.price);

if(
!symbol ||
!shapeId ||
!Number.isFinite(price)
){
return;
}

const row = {
id: shapeId,
shapeId,
symbol,
price,
tf: normalizeAlertTf(entry.tf),
createdAt:
Number(entry.createdAt) ||
Date.now()
};

const list =
loadAlerts().filter(
a=>!
(
a.symbol === row.symbol &&
a.shapeId === row.shapeId
)
);

list.push(row);

saveAlerts(list);

void pushAlertRowToCloud(row);

}

export function patchAlertPrice(
symbol,
shapeId,
price
){

if(
!symbol ||
!shapeId ||
!Number.isFinite(price)
){
return;
}

const list =
loadAlerts();

let changed =
false;

const next =
list.map(a=>{

if(
a.symbol === symbol &&
a.shapeId === shapeId
){

changed = true;

return {
...a,
price: Number(price)
};

}

return a;

});

if(changed){
saveAlerts(next);

const row =
next.find(
a=>
a.symbol === symbol &&
a.shapeId === shapeId
);

if(row){
void pushAlertRowToCloud(row);
}

}

}

export function removeAlert(symbol, shapeId){

if(
!symbol ||
!shapeId
){
return;
}

const list =
loadAlerts().filter(
a=>!
(
a.symbol === symbol &&
a.shapeId === shapeId
)
);

saveAlerts(list);

queueAlertsCloud(async m=>{
await m.removeAlertFromCloud(
symbol,
shapeId
);
await m.pruneOrphanCloudAlerts();
});

}

export function removeDrawingShape(symbol, shapeId){

const key =
`drawings_${symbol}`;

const raw =
localStorage.getItem(key);

if(!raw){
return false;
}

try{

const drawings =
JSON.parse(raw);

if(!Array.isArray(drawings)){
return false;
}

const next =
drawings.filter(
d=>d.id !== shapeId
);

if(next.length === drawings.length){
return false;
}

localStorage.setItem(
key,
JSON.stringify(next)
);

window.dispatchEvent(
new CustomEvent(
"drawings-updated",
{ detail:{ symbol } }
)
);

return true;

}catch{

return false;

}

}

function dispatchAlertsHistoryChanged(){

window.dispatchEvent(
new CustomEvent(
"alerts-history-changed"
)
);

}

function normalizeHistoryRow(entry){

if(
!entry ||
typeof entry !== "object"
){
return null;
}

const shapeId =
entry.shapeId ||
entry.id;

const symbol =
entry.symbol;

const price =
Number(entry.price);

const triggeredAt =
Number(entry.triggeredAt);

if(
!symbol ||
!shapeId ||
!Number.isFinite(price) ||
!Number.isFinite(triggeredAt)
){
return null;
}

return {
id: shapeId,
shapeId,
symbol,
price,
tf: entry.tf || "60",
createdAt:
Number(entry.createdAt) ||
triggeredAt,
triggeredAt
};

}

export function loadAlertsHistory(){

try{

const raw =
localStorage.getItem(HISTORY_KEY);

if(!raw){
return [];
}

const list =
JSON.parse(raw);

if(!Array.isArray(list)){
return [];
}

return list
.map(normalizeHistoryRow)
.filter(Boolean);

}catch{

return [];

}

}

function saveAlertsHistory(list){

const cleaned =
(Array.isArray(list)
? list
: [])
.map(normalizeHistoryRow)
.filter(Boolean)
.slice(
0,
MAX_ALERT_HISTORY
);

localStorage.setItem(
HISTORY_KEY,
JSON.stringify(cleaned)
);

dispatchAlertsHistoryChanged();

}

export function getAlertsHistorySorted(){

return loadAlertsHistory().sort(
(a, b)=>
(b.triggeredAt || 0) - (a.triggeredAt || 0)
);

}

export function appendAlertToHistory(alert){

const row =
normalizeHistoryRow({
...alert,
triggeredAt:
Number(alert.triggeredAt) ||
Date.now()
});

if(!row){
return;
}

const list =
loadAlertsHistory().filter(
h=>!
(
h.symbol === row.symbol &&
h.shapeId === row.shapeId &&
h.triggeredAt === row.triggeredAt
)
);

list.unshift(row);

saveAlertsHistory(
list.slice(
0,
MAX_ALERT_HISTORY
)
);

}

export function clearAlertsHistory(){

localStorage.removeItem(HISTORY_KEY);
dispatchAlertsHistoryChanged();

}

export function markAlertTriggered(symbol, shapeId){

if(
!symbol ||
!shapeId
){
return;
}

const existing =
loadAlerts().find(
a=>
a.symbol === symbol &&
a.shapeId === shapeId
);

if(existing){
appendAlertToHistory(existing);
}

removeDrawingShape(
symbol,
shapeId
);

const list =
loadAlerts().filter(
a=>!
(
a.symbol === symbol &&
a.shapeId === shapeId
)
);

saveAlerts(list);

void queueAlertsCloud(async m=>{
const ok =
await m.markAlertTriggeredOnCloud(
symbol,
shapeId
);

if(!ok){
setTimeout(()=>{
m.markAlertTriggeredOnCloud(
symbol,
shapeId
);
}, 2500);
}

});

}

export function removeAllAlerts(){

saveAlerts([]);

queueAlertsCloud(m=>{
m.clearAllAlertsFromCloud();
});

}

export function clearAlertOnDrawing(symbol, shapeId){

const key =
`drawings_${symbol}`;

const raw =
localStorage.getItem(key);

if(!raw){
return false;
}

try{

const drawings =
JSON.parse(raw);

const shape =
drawings.find(
d=>d.id === shapeId
);

if(!shape){
return false;
}

shape.isAlert = false;

delete shape.alertCreatedAt;
delete shape.alertTf;
delete shape.alertSymbol;

if(shape.savedColor){
shape.color = shape.savedColor;
delete shape.savedColor;
}

if(shape.savedLineWidth != null){
shape.lineWidth = shape.savedLineWidth;
delete shape.savedLineWidth;
}

localStorage.setItem(
key,
JSON.stringify(drawings)
);

window.dispatchEvent(
new CustomEvent(
"drawings-updated",
{ detail:{ symbol } }
)
);

return true;

}catch{

return false;

}

}

function isLegacyDrawingsKey(key){

const rest =
key?.slice("drawings_".length) || "";

return !!rest.match(
/^(.+)_(1|5|15|60|240|D)$/
);

}

function listDrawingStorageEntries(){

const entries = [];

for(let i = 0; i < localStorage.length; i++){

const key =
localStorage.key(i);

if(!isDrawingsStorageKey(key)){
continue;
}

entries.push({
key,
symbol: symbolFromDrawingsKey(key),
legacy: isLegacyDrawingsKey(key)
});

}

const canonical =
new Set(
entries
.filter(e=>!e.legacy)
.map(e=>e.symbol)
);

return entries.filter(
e=>!e.legacy || !canonical.has(e.symbol)
);

}

export function rebuildAlertRegistryFromStorage(){

const existing =
loadAlerts();

const existingByKey =
new Map(
existing.map(a=>[
alertEntryKey(a.symbol, a.shapeId),
a
])
);

const merged = [];
const seen =
new Set();

for(const { symbol } of listDrawingStorageEntries()){

const drawings =
loadDrawingsForSymbol(symbol);

drawings
.filter(d=>isValidAlertShape(symbol, d))
.forEach(d=>{

const key =
alertEntryKey(symbol, d.id);

if(seen.has(key)){
return;
}

seen.add(key);

const prev =
existingByKey.get(key);

const createdAt =
Number(d.alertCreatedAt) ||
Date.now();

const price =
Number(d.price);

if(
!Number.isFinite(price)
){
return;
}

merged.push({
id:d.id,
shapeId:d.id,
symbol,
price,
tf:
d.alertTf ||
prev?.tf ||
"60",
createdAt
});

});

}

saveAlerts(merged);

queueAlertsCloud(m=>{
m.syncAlertsWithCloud();
});

return merged.length;

}

export function isDrawingsStorageKey(key){

if(!key?.startsWith("drawings_")){
return false;
}

const rest =
key.slice("drawings_".length);

if(!rest){
return false;
}

const legacy =
rest.match(
/^(.+)_(1|5|15|60|240|D)$/
);

if(legacy){
return true;
}

if(!rest.includes("_")){
return true;
}

return false;

}

export function symbolFromDrawingsKey(key){

const rest =
key.slice("drawings_".length);

const legacy =
rest.match(
/^(.+)_(1|5|15|60|240|D)$/
);

if(legacy){
return legacy[1];
}

return rest;

}

export function countAllDrawings(){

let total = 0;

for(let i = 0; i < localStorage.length; i++){

const key =
localStorage.key(i);

if(!isDrawingsStorageKey(key)){
continue;
}

try{

const drawings =
JSON.parse(localStorage.getItem(key) || "[]");

if(Array.isArray(drawings)){
total += drawings.length;
}

}catch{}

}

return total;

}

export function clearAllDrawings(){

const symbols =
new Set();

const keys = [];

for(let i = 0; i < localStorage.length; i++){

const key =
localStorage.key(i);

if(!isDrawingsStorageKey(key)){
continue;
}

keys.push(key);
symbols.add(symbolFromDrawingsKey(key));

}

keys.forEach(key=>{
localStorage.removeItem(key);
});

removeAllAlerts();

symbols.forEach(symbol=>{

window.dispatchEvent(
new CustomEvent(
"drawings-updated",
{ detail:{ symbol } }
)
);

});

window.dispatchEvent(
new CustomEvent("drawings-cleared-all")
);

return keys.length;

}

export function formatAlertDate(ts){

if(!ts){
return "—";
}

const d =
new Date(ts);

const pad =
n=>String(n).padStart(2, "0");

return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;

}
