const STORAGE_KEY = "price_alerts_v1";

const HISTORY_KEY = "price_alerts_history_v1";

const MAX_ALERT_HISTORY = 30;

function queueAlertsCloud(fn){

import("./alerts-cloud-sync.js?v=34")
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

export function alertPricesMatch(
a,
b
){

const pa =
Number(a);
const pb =
Number(b);

if(
!Number.isFinite(pa) ||
!Number.isFinite(pb)
){
return false;
}

const scale =
Math.max(
1,
Math.abs(pa),
Math.abs(pb)
);

return Math.abs(pa - pb) <=
scale * 1e-6;

}

export function remapAlertShapeId(
symbol,
oldShapeId,
newShapeId
){

const sym =
String(symbol || "").trim().toUpperCase();
const oldId =
String(oldShapeId || "").trim();
const newId =
String(newShapeId || "").trim();

if(
!sym ||
!oldId ||
!newId ||
oldId === newId
){
return false;
}

const list =
loadAlerts();

let changed =
false;

const next =
list.map(row=>{

if(
String(row.symbol).toUpperCase() !== sym ||
String(row.shapeId) !== oldId
){
return row;
}

changed = true;

return {
...row,
id: newId,
shapeId: newId
};

});

if(changed){
saveAlerts(next);
}

return changed;

}

export function alertPriceFromShape(shape){

const direct =
Number(shape?.price);

if(Number.isFinite(direct)){
return direct;
}

const fromP1 =
Number(shape?.p1?.price);

if(Number.isFinite(fromP1)){
return fromP1;
}

return NaN;

}

function isValidAlertShape(symbol, shape){

if(
shape?.type !== "hray" ||
shape.isAlert !== true ||
!shape.alertCreatedAt
){
return false;
}

const sym =
String(symbol || "").trim().toUpperCase();
const alertSym =
String(
shape.alertSymbol ||
sym
).trim().toUpperCase();

return alertSym === sym;

}

export function loadDrawingsForSymbol(symbol){

const sym =
String(symbol || "").trim().toUpperCase();

try{

const raw =
localStorage.getItem(
`drawings_${sym}`
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

function saveAlertsQuiet(list){

const cleaned =
(Array.isArray(list)
? list
: [])
.filter(isStoredAlertRow);

localStorage.setItem(
STORAGE_KEY,
JSON.stringify(cleaned)
);

}

export function saveAlerts(list){

saveAlertsQuiet(list);

window.dispatchEvent(
new CustomEvent(
"alerts-changed"
)
);

}

export function saveAlertsFromCloudMerge(list){

saveAlertsQuiet(list);

dispatchAlertsRegistryPulled();

}

export function markAlertCloudSynced(
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

const list =
loadAlerts();

let changed =
false;

const next =
list.map(a=>{

if(
String(a.symbol).toUpperCase() === sym &&
a.shapeId === sid
){
changed = true;

return {
...a,
cloudSynced: true
};

}

return a;

});

if(changed){
saveAlertsQuiet(next);
}

}

function dispatchAlertsRegistryPulled(){

window.dispatchEvent(
new CustomEvent(
"alerts-registry-pulled"
)
);

}

export function getAlertsSorted(){

return loadAlerts().sort(
(a, b)=>
(b.createdAt || 0) - (a.createdAt || 0)
);

}

function drawingsStorageKey(symbol){

return `drawings_${String(symbol || "").trim().toUpperCase()}`;

}

export async function registerAlertFromDrawing(
shape,
symbolOverride
){

const sym =
String(
symbolOverride ||
shape?.alertSymbol ||
shape?.symbol ||
""
).trim().toUpperCase();

const shapeId =
String(
shape?.shapeId ||
shape?.id ||
""
).trim();

const price =
Number.isFinite(Number(shape?.price))
? Number(shape.price)
: alertPriceFromShape(shape);

if(
!sym ||
!shapeId ||
!Number.isFinite(price)
){
return false;
}

const row = {
id: shapeId,
shapeId,
symbol: sym,
price,
tf: normalizeAlertTf(
shape?.alertTf ||
shape?.tf
),
createdAt:
Number(shape?.alertCreatedAt) ||
Number(shape?.createdAt) ||
Date.now(),
cloudSynced: false
};

const list =
loadAlerts().filter(
a=>!
(
String(a.symbol).toUpperCase() === sym &&
String(a.shapeId) === shapeId
)
);

list.push(row);

saveAlerts(list);

const m =
await import("./alerts-cloud-sync.js?v=34");

const pushed =
await m.flushAlertCloudPush(row);

if(!pushed){
const retry =
await m.pushSingleAlertToCloud(row);

if(!retry){
m.scheduleEnsureAlertsInCloud();
}

return !!retry;
}

return true;

}

export function disarmAlertLocally(symbol, shapeId){

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

const list =
loadAlerts().filter(
a=>!
(
String(a.symbol).toUpperCase() === sym &&
String(a.shapeId) === sid
)
);

saveAlerts(list);
removeDrawingShape(sym, sid);

}

export async function upsertAlert(entry){

return registerAlertFromDrawing(
{
id: entry?.shapeId || entry?.id,
shapeId: entry?.shapeId || entry?.id,
price: entry?.price,
alertTf: entry?.tf,
alertCreatedAt: entry?.createdAt,
alertSymbol: entry?.symbol,
symbol: entry?.symbol
},
entry?.symbol
);

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
saveAlertsQuiet(next);

const row =
next.find(
a=>
a.symbol === symbol &&
a.shapeId === shapeId
);

if(row){
void import("./alerts-cloud-sync.js?v=34").then(m=>{
m.scheduleDebouncedAlertPush(row);
});
}

}

}

/** После отпускания линии алерта — обновить цену в реестре и в Supabase. */
export function finalizeAlertPriceDrag(
symbol,
shapeId,
price,
tf
){

const sym =
String(symbol || "").trim().toUpperCase();
const sid =
String(shapeId || "").trim();

const level =
Number(price);

if(
!sym ||
!sid ||
!Number.isFinite(level)
){
return;
}

let row =
null;

const list =
loadAlerts().map(a=>{

if(
String(a.symbol).toUpperCase() === sym &&
String(a.shapeId) === sid
){

row = {
...a,
price: level,
tf:
normalizeAlertTf(
tf ||
a.tf
),
cloudSynced: false
};

return row;

}

return a;

});

if(!row){
return;
}

saveAlerts(list);

void import("./alerts-cloud-sync.js?v=34").then(m=>{
m.flushAlertCloudPush(row);
});

}

export function removeAlert(symbol, shapeId){

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

const row =
loadAlerts().find(
a=>
String(a.symbol).toUpperCase() === sym &&
String(a.shapeId) === sid
);

const list =
loadAlerts().filter(
a=>!
(
String(a.symbol).toUpperCase() === sym &&
String(a.shapeId) === sid
)
);

saveAlerts(list);

clearAlertOnDrawing(
sym,
sid
);

stripAlertFlagsNotInRegistry();

queueAlertsCloud(async m=>{
await m.removeAlertFromCloud(
sym,
sid
);
await m.pruneOrphanCloudAlerts();
});

}

export function removeDrawingShape(symbol, shapeId){

const key =
drawingsStorageKey(symbol);

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

/** Сразу убрать с графика и из реестра (до async в облако). */
export function commitAlertTriggeredLocally(
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

const existing =
loadAlerts().find(
a=>
String(a.symbol).toUpperCase() === sym &&
a.shapeId === sid
);

if(existing){
appendAlertToHistory(existing);
}

disarmAlertLocally(
sym,
sid
);

console.log(
"[alerts] сработал:",
sym,
sid
);

void markAlertTriggered(
sym,
sid
);

}

export async function markAlertTriggered(symbol, shapeId){

const sym =
String(symbol || "").trim().toUpperCase();
const sid =
String(shapeId || "").trim();

if(
!sym ||
!sid
){
return false;
}

let cloudOk =
false;

try{

const m =
await import("./alerts-cloud-sync.js?v=34");

const remote =
await m.triggerAlertViaWorker(
sym,
sid
);

const workerHandled =
remote?.ok === true;

if(workerHandled){

cloudOk = true;

const stillThere =
await m.isAlertRowActiveInCloud(
sym,
sid
);

if(stillThere){
console.warn(
"alert: worker ok, но строка в Supabase осталась — дочищаем",
sym,
sid
);
cloudOk =
await m.markAlertTriggeredOnCloudImmediate(
sym,
sid
);
if(!cloudOk){
await m.removeAlertFromCloud(
sym,
sid
);
}
}

if(
remote.telegram === false &&
!stillThere
){
console.warn(
"Telegram: не отправлено — проверьте chat id на странице Алерты и TELEGRAM_BOT_TOKEN на Railway."
);
}

if(
remote.telegram === false &&
stillThere
){
console.warn(
"Telegram: не отправлено (worker). Проверьте chat id и Railway."
);
}

}else if(
remote?.reason === "not_claimed"
){
console.warn(
"alert: worker not_claimed",
sym,
sid
);
}else{

if(
remote?.skipped === "not_found" ||
remote?.reason === "not_found"
){
console.warn(
"alert: в Supabase не было строки для",
sym,
sid,
"— удаляем локально"
);
}

cloudOk =
await m.markAlertTriggeredOnCloudImmediate(
sym,
sid
);

if(!cloudOk){
await new Promise(r=>{
setTimeout(r, 800);
});
cloudOk =
await m.markAlertTriggeredOnCloudImmediate(
sym,
sid
);
}

if(!cloudOk){
await m.removeAlertFromCloud(
sym,
sid
);
}

if(!cloudOk){
console.warn(
"Облако: не удалось удалить алерт из Supabase — проверьте ALERT_WORKER_URL и вход."
);
}

}

}catch(err){
console.warn(
"alert cloud trigger:",
err?.message || err
);
}

return cloudOk;

}

export function removeAllAlerts(){

saveAlerts([]);

stripAlertFlagsNotInRegistry();

queueAlertsCloud(m=>{
m.clearAllAlertsFromCloud();
});

}

function stripShapeAlertFlags(shape){

const cleaned = {
...shape,
isAlert: false
};

delete cleaned.alertCreatedAt;
delete cleaned.alertTf;
delete cleaned.alertSymbol;

if(cleaned.savedColor){
cleaned.color = cleaned.savedColor;
delete cleaned.savedColor;
}

if(cleaned.savedLineWidth != null){
cleaned.lineWidth = cleaned.savedLineWidth;
delete cleaned.savedLineWidth;
}

return cleaned;

}

export function stripAlertFlagsNotInRegistry(){

const registry =
loadAlerts();

const bySymbol =
new Map();

for(const row of registry){

const sym =
String(row.symbol || "").trim().toUpperCase();

if(!sym){
continue;
}

if(!bySymbol.has(sym)){
bySymbol.set(sym, []);
}

bySymbol.get(sym).push(row);

}

for(const { symbol } of listDrawingStorageEntries()){

const sym =
String(symbol || "").trim().toUpperCase();
const alertsForSym =
bySymbol.get(sym) || [];
const registryIds =
new Set(
alertsForSym.map(a=>a.shapeId)
);

let list =
loadDrawingsForSymbol(sym);
let dirty =
false;

const next =
list.map(shape=>{

if(
shape.type !== "hray" ||
!shape.isAlert
){
return shape;
}

if(registryIds.has(shape.id)){
return shape;
}

dirty = true;

return stripShapeAlertFlags(shape);

});

if(!dirty){
continue;
}

localStorage.setItem(
drawingsStorageKey(sym),
JSON.stringify(next)
);

window.dispatchEvent(
new CustomEvent(
"drawings-updated",
{ detail:{ symbol: sym } }
)
);

}

}

export function clearAlertOnDrawing(
symbol,
shapeId
){

const sym =
String(symbol || "").trim().toUpperCase();
const sid =
String(shapeId || "").trim();

const key =
drawingsStorageKey(sym);

const raw =
localStorage.getItem(key);

if(!raw){
return false;
}

try{

const drawings =
JSON.parse(raw);

let changed =
false;

const next =
drawings.map(shape=>{

if(
shape?.type !== "hray" ||
!shape.isAlert ||
shape.id !== sid
){
return shape;
}

changed = true;

return stripShapeAlertFlags(shape);

});

if(!changed){
return false;
}

localStorage.setItem(
key,
JSON.stringify(next)
);

window.dispatchEvent(
new CustomEvent(
"drawings-updated",
{ detail:{ symbol: sym } }
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

export function isDrawingsStorageKey(key){

if(!key?.startsWith("drawings_")){
return false;
}

const rest =
key.slice("drawings_".length);

return !!rest;

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
