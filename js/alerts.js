import {
getActiveExchangeId
} from "./exchanges/context.js?v=1";

import {
readAlertTokenSync
} from "./alert-auth-cache.js?v=7";

import {
withTimeout
} from "./async-timeout.js?v=2";

import {
pauseRegistryCloudSync,
scheduleRemoteRegistrySync
} from "./alerts-cloud-sync.js?v=113";

import {
drawingsStorageKey as exchangeDrawingsStorageKey,
isDrawingsStorageKey,
symbolFromDrawingsKey,
parseDrawingsStorageKey,
exchangeFromDrawingsKey,
migrateLegacyDrawingsStorage
} from "./drawings-exchange-key.js?v=1";

export {
isDrawingsStorageKey,
symbolFromDrawingsKey
} from "./drawings-exchange-key.js?v=1";

const STORAGE_KEY = "price_alerts_v1";

const HISTORY_KEY = "price_alerts_history_v1";

const DELETED_ALERTS_LS =
"price_alerts_deleted_keys_v1";

/** Пока тянут линию — цена для отрисовки (реестр читается из localStorage заново). */
const alertDragLivePrice =
new Map();

export function setAlertDragLivePrice(
shapeId,
price
){

const sid =
String(
shapeId ||
""
).trim();

if(
!sid
){
return;
}

if(
price ==
null ||
!Number.isFinite(
price
)
){
alertDragLivePrice.delete(
sid
);
return;
}

alertDragLivePrice.set(
sid,
price
);

}

export function clearAlertDragLivePrice(
shapeId
){

setAlertDragLivePrice(
shapeId,
null
);

}

export function alertPriceForDisplay(
alert
){

const sid =
String(
alert?.shapeId ||
alert?.id ||
""
).trim();

if(
sid &&
alertDragLivePrice.has(
sid
)
){
return alertDragLivePrice.get(
sid
);
}

return Number(
alert?.price
);

}

const MAX_ALERT_HISTORY = 30;

/** Сериализация read-modify-write в localStorage (иначе 4 алерта → 2 строки). */
let registryWriteChain =
Promise.resolve();

function enqueueRegistryWrite(
fn
){

const job =
registryWriteChain.then(()=>fn());

registryWriteChain =
job.catch(err=>{
console.warn(
"alerts registry write:",
err?.message || err
);
});

return job;

}

function queueAlertsCloud(fn){

import("./alerts-cloud-sync.js?v=113")
.then(m=>fn(m))
.catch(err=>{
console.warn("alerts cloud:", err);
});

}

export function normalizeAlertTf(tf){

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
"D":"1D",
"W":"1W"
};

export function formatTfLabel(tf){

if(!tf){
return "—";
}

return TF_LABELS[tf] || tf;

}

/**
 * Тикер для алертов: спот UB/USDT, линейные фьючи UBUSDT.P (как на графике).
 */
export function formatAlertTicker(
symbol
){

const raw =
String(symbol || "").trim().toUpperCase();

if(!raw){
return "—";
}

if(raw.includes("/")){
return raw;
}

if(raw.endsWith(".P")){
return raw;
}

if(raw.endsWith("USDT")){
return `${raw}.P`;
}

return raw;

}

/** Цена в Telegram / тосте — ровно 4 знака после точки. */
export function formatAlertTelegramPrice(
price
){

const n =
Number(price);

if(!Number.isFinite(n)){
return "—";
}

return n.toFixed(4);

}

/** Три строки: тикер - TF; текст; цена. */
export function formatAlertTelegramText(
alert
){

const sym =
formatAlertTicker(
alert?.symbol
);
const tf =
formatTfLabel(
alert?.tf
);
const price =
formatAlertTelegramPrice(
alert?.price
);

return (
`${sym} - ${tf}\n` +
"Цена пересекла уровень\n" +
price
);

}

export function alertEntryKey(symbol, shapeId){

return `${symbol}::${shapeId}`;

}

/** Пока DELETE в Supabase не завершён — reconcile не возвращает строку обратно. */
const pendingAlertDeletes =
new Map();

function loadPersistedDeletedAlertKeys(){

try{
const raw =
localStorage.getItem(
DELETED_ALERTS_LS
);
const arr =
JSON.parse(
raw ||
"[]"
);

return new Set(
Array.isArray(
arr
)
? arr
: []
);

}catch{
return new Set();
}

}

function savePersistedDeletedAlertKeys(
keys
){

const arr = [
...keys
].slice(
-500
);

try{
localStorage.setItem(
DELETED_ALERTS_LS,
JSON.stringify(
arr
)
);
}catch{
/* ignore */
}

}

export function markAlertPendingDelete(
symbol,
shapeId,
ms = 120000
){

const sym =
String(
symbol ||
""
).trim().toUpperCase();
const sid =
String(
shapeId ||
""
).trim();

if(
!sym ||
!sid
){
return;
}

pendingAlertDeletes.set(
alertEntryKey(
sym,
sid
),
Date.now() + Math.max(
ms,
5000
)
);

}

export function rememberAlertDeleted(
symbol,
shapeId
){

const sym =
String(
symbol ||
""
).trim().toUpperCase();
const sid =
String(
shapeId ||
""
).trim();

if(
!sym ||
!sid
){
return;
}

markAlertPendingDelete(
sym,
sid,
7 *
24 *
3600 *
1000
);

const keys =
loadPersistedDeletedAlertKeys();

keys.add(
alertEntryKey(
sym,
sid
)
);

savePersistedDeletedAlertKeys(
keys
);

}

export function clearAlertPendingDelete(
symbol,
shapeId
){

forgetAlertDeleted(
symbol,
shapeId
);

}

export function forgetAlertDeleted(
symbol,
shapeId
){

const sym =
String(
symbol ||
""
).trim().toUpperCase();
const sid =
String(
shapeId ||
""
).trim();

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

pendingAlertDeletes.delete(
key
);

const keys =
loadPersistedDeletedAlertKeys();

keys.delete(
key
);

savePersistedDeletedAlertKeys(
keys
);

}

export function isAlertPendingDelete(
symbol,
shapeId
){

return isAlertDeleted(
symbol,
shapeId
);
}

export function isAlertDeleted(
symbol,
shapeId
){

const sym =
String(
symbol ||
""
).trim().toUpperCase();
const sid =
String(
shapeId ||
""
).trim();

if(
!sym ||
!sid
){
return false;
}

const key =
alertEntryKey(
sym,
sid
);

const exp =
pendingAlertDeletes.get(
key
);

if(
exp
){

if(
Date.now() >
exp
){
pendingAlertDeletes.delete(
key
);
}else{
return true;
}

}

return loadPersistedDeletedAlertKeys().has(
key
);

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
loadAllAlerts();

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
exchangeDrawingsStorageKey(
sym
)
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
exchangeId:
alertExchangeId(
alert
),
createdAt:
Number(createdAt) ||
Date.now()
};

if(triggeredAt){
row.triggeredAt = triggeredAt;
}

return row;

}

function alertExchangeId(
alert
){

return String(
alert?.exchangeId ||
alert?.exchange_id ||
"bybit"
).trim().toLowerCase();

}

export {
alertExchangeId
};

function filterAlertsForActiveExchange(
list
){

const ex =
getActiveExchangeId();

return (
Array.isArray(
list
)
? list
: []
).filter(
alert=>
alertExchangeId(
alert
) ===
ex
);

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

export function loadAllAlerts(){

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

export function loadAlerts(){

return filterAlertsForActiveExchange(
loadAllAlerts()
);

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

export function markAlertCloudId(
symbol,
shapeId,
cloudId
){

const sym =
String(symbol || "").trim().toUpperCase();
const sid =
String(shapeId || "").trim();
const id =
String(cloudId || "").trim();

if(
!sym ||
!sid ||
!id
){
return;
}

const list =
loadAllAlerts();

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
cloudId: id,
cloudSynced: true
};

}

return a;

});

if(changed){
saveAlertsQuiet(next);
}

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
loadAllAlerts();

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

function alertRegistryKey(
sym,
sid
){

return `${sym}::${sid}`;

}

/** Сколько жёлтых лучей (isAlert) на всех графиках. */
export function countAlertsOnChart(){

let n =
0;

for(
let i = 0;
i < localStorage.length;
i++
){

const key =
localStorage.key(i);

if(
!isDrawingsStorageKey(
key
)
){
continue;
}

if(
exchangeFromDrawingsKey(
key
) !==
getActiveExchangeId()
){
continue;
}

if(
parseDrawingsStorageKey(
key
)?.tfSuffix
){
continue;
}

let drawings;

try{
drawings =
JSON.parse(
localStorage.getItem(key) || "[]"
);
}catch{
continue;
}

if(!Array.isArray(drawings)){
continue;
}

for(const shape of drawings){

if(
shape?.isAlert &&
shape.type === "hray"
){
n += 1;
}

}

}

return n;

}

export function dispatchPriceAlertsChanged(
symbol
){

window.dispatchEvent(
new CustomEvent(
"price-alerts-changed",
{
detail:{
symbol:
String(
symbol ||
""
).trim().toUpperCase()
}
}
)
);

}

const LEGACY_ALERTS_MIGRATED_KEY =
"price_alerts_legacy_migrated_v2";

export function migrateLegacyDrawingAlertsFromShapes(){

if(
localStorage.getItem(
LEGACY_ALERTS_MIGRATED_KEY
)
){
return;
}

const byKey =
new Map();

for(
const row of loadAllAlerts()
){
byKey.set(
alertRegistryKey(
String(
row.symbol
).toUpperCase(),
String(
row.shapeId
)
),
row
);
}

for(
let i = 0;
i <
localStorage.length;
i++
){

const key =
localStorage.key(
i
);

if(
!key?.startsWith(
"drawings_"
)
){
continue;
}

const sym =
key.slice(
"drawings_".length
).trim().toUpperCase();

if(
!sym
){
continue;
}

let drawings;

try{
drawings =
JSON.parse(
localStorage.getItem(
key
) ||
"[]"
);
}catch{
continue;
}

if(
!Array.isArray(
drawings
)
){
continue;
}

for(
const shape of drawings
){

if(
!shape?.isAlert ||
shape.type !==
"hray"
){
continue;
}

const sid =
String(
shape.id ||
""
).trim();
const price =
alertPriceFromShape(
shape
);

if(
!sid ||
!Number.isFinite(
price
)
){
continue;
}

const mapKey =
alertRegistryKey(
sym,
sid
);

if(
!byKey.has(
mapKey
)
){
byKey.set(
mapKey,
{
id: sid,
shapeId: sid,
symbol: sym,
price,
tf: normalizeAlertTf(
shape.alertTf
),
exchangeId:
getActiveExchangeId(),
createdAt:
Number(
shape.alertCreatedAt
) ||
Date.now(),
cloudSynced: false
}
);

}

}

}

saveAlerts(
[
...byKey.values()
]
);

localStorage.setItem(
LEGACY_ALERTS_MIGRATED_KEY,
"1"
);

}

/**
 * Реестр алертов — источник истины; рисунки hray больше не используются как алерты.
 */
export function mergeRegistryFromChartDrawings(
opts = {}
){

const skipHeavy =
opts.skipHeavy ===
true;

if(
!skipHeavy
){
migrateLegacyDrawingAlertsFromShapes();

stripAlertFlagsNotInRegistry(
opts.stripFlags ||
{}
);
}

const list =
loadAllAlerts();

return list.length;

}

export async function createPriceAlert(
symbol,
price,
tf,
opts =
{}
){

const { isCloudLoggedIn } =
await import("./cloud-sync.js?v=54");

if(
!isCloudLoggedIn()
){
return null;
}

const { getTelegramChatId } =
await import("./alerts-cloud-sync.js?v=113");

if(
await getTelegramChatId() == null
){
return null;
}

return enqueueRegistryWrite(async()=>{

const sym =
String(
symbol ||
""
).trim().toUpperCase();

const level =
Number(
price
);

if(
!sym ||
!Number.isFinite(
level
)
){
return null;
}

const shapeId =
`pa_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

const source =
String(
opts?.source ||
""
).trim();

const row = {
id: shapeId,
shapeId,
symbol: sym,
price: level,
tf: normalizeAlertTf(
tf
),
exchangeId:
getActiveExchangeId(),
createdAt: Date.now(),
cloudSynced: false,
...(
source
? {
source
}
: {}
)
};

const list =
loadAllAlerts().filter(
a=>!
(
String(
a.symbol
).toUpperCase() ===
sym &&
String(
a.shapeId
) ===
shapeId
)
);

list.push(
row
);

saveAlerts(
list
);

dispatchPriceAlertsChanged(
sym
);

const { ensureCloudReady } =
await import("./auth-ui.js?v=55");

await ensureCloudReady();

const m =
await import("./alerts-cloud-sync.js?v=113");

const pushed =
await m.pushOneAlertRow(
row,
{ retries: 3 }
);

if(
!pushed
){
m.scheduleRegistryCloudSync();
}

return row;

});

}

export async function registerAlertFromDrawing(
shape,
symbolOverride
){

return enqueueRegistryWrite(async()=>{

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

forgetAlertDeleted(
sym,
shapeId
);

const row = {
id: shapeId,
shapeId,
symbol: sym,
price,
tf: normalizeAlertTf(
shape?.alertTf ||
shape?.tf
),
exchangeId:
getActiveExchangeId(),
createdAt:
Number(shape?.alertCreatedAt) ||
Number(shape?.createdAt) ||
Date.now(),
cloudSynced: false
};

const list =
loadAllAlerts().filter(
a=>!
(
String(a.symbol).toUpperCase() === sym &&
String(a.shapeId) === shapeId
)
);

list.push(row);

saveAlerts(list);

const { ensureCloudReady } =
await import("./auth-ui.js?v=55");

await ensureCloudReady();

mergeRegistryFromChartDrawings();

const m =
await import("./alerts-cloud-sync.js?v=113");

const pushed =
await m.pushOneAlertRow(
row,
{ retries: 3 }
);

if(!pushed){
console.error(
"Alert: НЕ записан в Supabase — откройте консоль (F12), строки [alerts] REST/worker ОТКЛОНЁН",
sym,
shapeId
);
m.scheduleRegistryCloudSync();
return false;
}

return true;

});

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
loadAllAlerts().filter(
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
loadAllAlerts().map(a=>{

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
cloudSynced: false,
priceUpdatedAt: Date.now()
};

return row;

}

return a;

});

if(!row){
return;
}

pauseRegistryCloudSync(
20000
);

saveAlerts(list);

dispatchPriceAlertsChanged(
sym
);

void import("./alerts-cloud-sync.js?v=113").then(async m=>{

const ok =
await m.flushAlertCloudPush(
row
);

if(
ok
){
scheduleRemoteRegistrySync();
pauseRegistryCloudSync(
4000
);
}else{
m.scheduleRegistryCloudSync();
pauseRegistryCloudSync(
8000
);
}

}).catch(err=>{
console.warn(
"[alerts] price drag cloud:",
err?.message || err
);
pauseRegistryCloudSync(
8000
);
});

void import("./alert-monitor.js?v=70").then(m=>{
m.armAlertQuietAfterDrag(
sym,
sid
);
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

rememberAlertDeleted(
sym,
sid
);

pauseRegistryCloudSync(
120000
);

const row =
loadAllAlerts().find(
a=>
String(a.symbol).toUpperCase() === sym &&
String(a.shapeId) === sid
);

const list =
loadAllAlerts().filter(
a=>!
(
String(a.symbol).toUpperCase() === sym &&
String(a.shapeId) === sid
)
);

saveAlerts(list);

removeDrawingShape(
sym,
sid
);

stripAlertFlagsNotInRegistry();

dispatchPriceAlertsChanged(
sym
);

queueAlertsCloud(async m=>{

let ok =
await m.removeAlertFromCloud(
sym,
sid,
row?.cloudId ||
null
);

if(
!ok
){
await m.pruneOrphanCloudAlerts();
}

if(
ok
){
scheduleRemoteRegistrySync();
pauseRegistryCloudSync(
8000
);
}else{
console.warn(
"[alerts] удаление в облаке не подтверждено —",
sym,
sid
);
pauseRegistryCloudSync(
120000
);
}

});

}

export function removeDrawingShape(symbol, shapeId){

const key =
exchangeDrawingsStorageKey(symbol);

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
exchangeId:
alertExchangeId(
entry
),
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

const ex =
getActiveExchangeId();

return loadAlertsHistory()
.filter(
alert=>
alertExchangeId(
alert
) ===
ex
)
.sort(
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

function historyRowFromCloudEvent(
cloudRow,
hintExchangeId
){

const sym =
String(
cloudRow?.symbol ||
""
).trim().toUpperCase();
const sid =
String(
cloudRow?.shape_id ||
cloudRow?.shapeId ||
""
).trim();
const price =
Number(
cloudRow?.price
);
const triggeredAt =
Date.parse(
cloudRow?.triggered_at ||
cloudRow?.triggeredAt
) ||
0;

if(
!sym ||
!sid ||
!Number.isFinite(
price
) ||
!Number.isFinite(
triggeredAt
) ||
triggeredAt < 1
){
return null;
}

return normalizeHistoryRow({
symbol: sym,
shapeId: sid,
price,
tf: normalizeAlertTf(
cloudRow?.tf
),
exchangeId:
hintExchangeId ||
cloudRow?.exchangeId ||
cloudRow?.exchange_id ||
undefined,
triggeredAt,
createdAt:
Date.parse(
cloudRow?.created_at ||
cloudRow?.createdAt
) ||
triggeredAt
});

}

/**
 * Backfill истории с price_alert_events — только localStorage history,
 * без disarm активных алертов.
 */
export function mergeAlertHistoryFromCloudEvents(
cloudRows,
opts = {}
){

if(
!Array.isArray(
cloudRows
) ||
!cloudRows.length
){
return 0;
}

const hintEx =
opts.exchangeId
? String(
opts.exchangeId
).trim().toLowerCase()
: "";

const list =
loadAlertsHistory();

const seen =
new Set(
list.map(
h=>
`${h.symbol}::${h.shapeId}::${h.triggeredAt}`
)
);

let added =
0;

for(const cloudRow of cloudRows){

const row =
historyRowFromCloudEvent(
cloudRow,
hintEx || undefined
);

if(!row){
continue;
}

const key =
`${row.symbol}::${row.shapeId}::${row.triggeredAt}`;

if(
seen.has(
key
)
){
continue;
}

seen.add(
key
);
list.unshift(
row
);
added +=
1;

}

if(
added > 0
){
saveAlertsHistory(
list.slice(
0,
MAX_ALERT_HISTORY
)
);
}

return added;

}

/** Realtime INSERT в price_alert_events (worker после trigger). */
export function applyRemoteAlertHistoryFromCloud(
cloudRow
){

const existing =
loadAllAlerts().find(
a=>{
const sym =
String(
cloudRow?.symbol ||
""
).trim().toUpperCase();
const sid =
String(
cloudRow?.shape_id ||
cloudRow?.shapeId ||
""
).trim();

return (
String(a.symbol).toUpperCase() === sym &&
String(a.shapeId) === sid
);
}
);

const row =
historyRowFromCloudEvent(
cloudRow,
existing
? alertExchangeId(
existing
)
: undefined
);

if(!row){
return false;
}

appendAlertToHistory(
row
);

const sym =
row.symbol;
const sid =
row.shapeId;

if(
existing
){
disarmAlertLocally(
sym,
sid
);
}else{
removeDrawingShape(
sym,
sid
);
clearAlertOnDrawing(
sym,
sid
);
stripAlertFlagsNotInRegistry();
}

dispatchPriceAlertsChanged(
sym
);

return true;

}

export function clearAlertsHistory(){

localStorage.removeItem(HISTORY_KEY);
dispatchAlertsHistoryChanged();

}

export function removeAlertHistoryEntry(
symbol,
shapeId,
triggeredAt
){

const sym =
String(
symbol ||
""
).trim().toUpperCase();
const sid =
String(
shapeId ||
""
).trim();
const ts =
Number(
triggeredAt
);

if(
!sym ||
!sid ||
!Number.isFinite(
ts
)
){
return;
}

const list =
loadAlertsHistory().filter(
h=>!
(
String(
h.symbol
).toUpperCase() ===
sym &&
String(
h.shapeId
) ===
sid &&
Number(
h.triggeredAt
) ===
ts
)
);

saveAlertsHistory(
list
);

}

const remoteFiredCooldown =
new Map();

const REMOTE_FIRE_COOLDOWN_MS = 60000;

/**
 * Worker удалил строку в Supabase — убрать линию и показать уведомление.
 * (Единственный путь срабатывания при входе в облако.)
 */
export function applyRemoteAlertFired(
row
){

const sym =
String(
row?.symbol || ""
).trim().toUpperCase();
const sid =
String(
row?.shape_id ||
row?.shapeId ||
""
).trim();

if(
!sym ||
!sid
){
return false;
}

const key =
alertEntryKey(
sym,
sid
);

const last =
remoteFiredCooldown.get(key);

if(
last &&
Date.now() - last < REMOTE_FIRE_COOLDOWN_MS
){
return false;
}

const existing =
loadAllAlerts().find(
a=>
String(a.symbol).toUpperCase() === sym &&
String(a.shapeId) === sid
);

const price =
Number(row?.price) ||
Number(existing?.price);
const tf =
normalizeAlertTf(
row?.tf ||
existing?.tf
);

if(
!Number.isFinite(price)
){
return false;
}

remoteFiredCooldown.set(
key,
Date.now()
);

if(existing){
appendAlertToHistory(existing);
disarmAlertLocally(
sym,
sid
);
}else{
removeDrawingShape(sym, sid);
clearAlertOnDrawing(sym, sid);
stripAlertFlagsNotInRegistry();
}

dispatchPriceAlertsChanged(
sym
);

if(existing){
void import("./alert-monitor.js?v=70").then(m=>{
m.notifyAlertTriggered({
symbol: sym,
shapeId: sid,
price,
tf
});
});
}

return true;

}

/**
 * Строку удалили в облаке вручную (не срабатывание) — убрать из реестра на этом устройстве.
 */
export function applyRemoteAlertRemoved(
row
){

const sym =
String(
row?.symbol || ""
).trim().toUpperCase();
const sid =
String(
row?.shape_id ||
row?.shapeId ||
""
).trim();

if(
!sym ||
!sid
){
return false;
}

const before =
loadAllAlerts();
const list =
before.filter(
a=>!
(
String(a.symbol).toUpperCase() === sym &&
String(a.shapeId) === sid
)
);

if(list.length === before.length){
return false;
}

saveAlertsFromCloudMerge(list);
clearAlertOnDrawing(
sym,
sid
);
stripAlertFlagsNotInRegistry();

dispatchPriceAlertsChanged(
sym
);

return true;

}

/**
 * Realtime INSERT/UPDATE — сразу обновить реестр (без отложенного pull).
 */
export function applyRemoteAlertUpsert(
cloudRow
){

const sym =
String(
cloudRow?.symbol ||
""
).trim().toUpperCase();
const sid =
String(
cloudRow?.shape_id ||
cloudRow?.shapeId ||
""
).trim();
const price =
Number(
cloudRow?.price
);

if(
!sym ||
!sid ||
!Number.isFinite(
price
)
){
return false;
}

if(
isAlertDeleted(
sym,
sid
)
){
return false;
}

const list =
loadAllAlerts();
const idx =
list.findIndex(
a=>
String(
a.symbol
).toUpperCase() ===
sym &&
String(
a.shapeId
) ===
sid
);

const prev =
idx >=
0
? list[
idx
]
: null;

const entry = {
id: sid,
shapeId: sid,
symbol: sym,
price,
tf: normalizeAlertTf(
cloudRow?.tf ||
prev?.tf
),
exchangeId:
alertExchangeId(
{
exchangeId:
cloudRow?.exchange_id,
exchange_id:
cloudRow?.exchange_id,
...prev
}
),
createdAt:
prev?.createdAt ||
Date.parse(
cloudRow?.created_at
) ||
Date.now(),
cloudId: String(
cloudRow?.id ||
prev?.cloudId ||
""
),
cloudSynced: true,
priceUpdatedAt:
Date.parse(
cloudRow?.updated_at
) ||
Date.now(),
...(
(()=>{
const src =
String(
cloudRow?.source ||
prev?.source ||
""
).trim();

return src
? {
source:
src
}
: {};
})()
)
};

let next;

if(
idx >=
0
){

next = [
...list
];
next[
idx
] = entry;

}else{

next = [
...list,
entry
];

}

saveAlertsFromCloudMerge(
next
);

dispatchPriceAlertsChanged(
sym
);

return true;

}

/** Сразу убрать линию; в облаке — ещё POST /trigger для Telegram. */
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
loadAllAlerts().find(
a=>
String(a.symbol).toUpperCase() === sym &&
a.shapeId === sid
);

const cloudId =
existing?.cloudId;

const tokenSnap =
readAlertTokenSync()?.token ||
null;

if(existing){
appendAlertToHistory(existing);
}

disarmAlertLocally(
sym,
sid
);

stripAlertFlagsNotInRegistry();

dispatchPriceAlertsChanged(
sym
);

void import("./alert-monitor.js?v=70").then(m=>{
m.notifyAlertTriggered({
symbol: sym,
shapeId: sid,
price: existing?.price,
tf: existing?.tf
});
});

void import("./alerts-cloud-sync.js?v=113").then(m=>{
m.fireAlertCloudTrigger(
sym,
sid,
cloudId,
{
price: existing?.price,
tf: existing?.tf,
authToken: tokenSnap
}
).catch(err=>{
console.error(
"[alerts] cloud trigger:",
err?.message || err
);
});
});

}

export function clearAllChartAlertFlags(){

for(
const { symbol } of listDrawingStorageEntries()
){

const sym =
String(symbol || "").trim().toUpperCase();

if(!sym){
continue;
}

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

dirty = true;
return stripShapeAlertFlags(shape);

});

if(!dirty){
continue;
}

localStorage.setItem(
exchangeDrawingsStorageKey(sym),
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

export function removeAllAlerts(){

const ex =
getActiveExchangeId();

const remaining =
loadAllAlerts().filter(
alert=>
alertExchangeId(
alert
) !==
ex
);

clearAllChartAlertFlags();
saveAlertsFromCloudMerge(
remaining
);
stripAlertFlagsNotInRegistry();

void import("./alerts-cloud-sync.js?v=113").then(m=>{
m.runCloudOp(()=>
m.removeAllAlertsEverywhere()
).then(ok=>{

if(!ok){
console.warn(
"[alerts] не удалось очистить алерты в облаке — проверьте вход и Supabase"
);
}

}).catch(err=>{
console.warn(
"[alerts] remove all:",
err?.message || err
);
});

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

/**
 * @param {{ registryOnlySymbols?: boolean, emitDrawingsEvents?: boolean }} [opts]
 * registryOnlySymbols — не сканировать весь localStorage (страница Алерты).
 * emitDrawingsEvents — false: не слать сотни drawings-updated (зависание браузера).
 */
export function stripAlertFlagsNotInRegistry(
opts = {}
){

const registryOnlySymbols =
opts.registryOnlySymbols ===
true;
const emitDrawingsEvents =
opts.emitDrawingsEvents !==
false;

const registry =
loadAllAlerts();

const bySymbol =
new Map();

for(
const row of registry
){

const sym =
String(
row.symbol ||
""
).trim().toUpperCase();

if(
!sym
){
continue;
}

if(
!bySymbol.has(
sym
)
){
bySymbol.set(
sym,
[]
);
}

bySymbol.get(
sym
).push(
row
);

}

const symbolsToScan =
registryOnlySymbols
? [
...bySymbol.keys()
].map(
symbol=>({
symbol
})
)
: listDrawingStorageEntries();

const changedSymbols =
[];

for(
const { symbol } of symbolsToScan
){

const sym =
String(
symbol ||
""
).trim().toUpperCase();
const alertsForSym =
bySymbol.get(
sym
) ||
[];
const registryIds =
new Set(
alertsForSym.map(
a=>a.shapeId
)
);

let list =
loadDrawingsForSymbol(
sym
);
let dirty =
false;

const next =
list.map(
shape=>{

if(
shape.type !==
"hray" ||
!shape.isAlert
){
return shape;
}

if(
registryIds.has(
shape.id
)
){
return shape;
}

dirty =
true;

return stripShapeAlertFlags(
shape
);

}
);

if(
!dirty
){
continue;
}

localStorage.setItem(
exchangeDrawingsStorageKey(
sym
),
JSON.stringify(
next
)
);

if(
emitDrawingsEvents
){
changedSymbols.push(
sym
);
}

}

if(
emitDrawingsEvents &&
changedSymbols.length
){
window.dispatchEvent(
new CustomEvent(
"drawings-batch-updated",
{
detail:{
symbols: changedSymbols
}
}
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
exchangeDrawingsStorageKey(sym);

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

function isLegacyDrawingsKey(
key
){

return !!parseDrawingsStorageKey(
key
)?.legacy;

}

function listDrawingStorageEntries(){

migrateLegacyDrawingsStorage();

const activeExchange =
getActiveExchangeId();
const entries =
[];

for(
let i =
0;
i <
localStorage.length;
i++
){

const key =
localStorage.key(
i
);

if(
!isDrawingsStorageKey(
key
)
){
continue;
}

if(
exchangeFromDrawingsKey(
key
) !==
activeExchange
){
continue;
}

const parsed =
parseDrawingsStorageKey(
key
);

if(
parsed?.tfSuffix
){
continue;
}

entries.push({
key,
symbol:
symbolFromDrawingsKey(
key
),
legacy:
!!parsed?.legacy
});

}

return entries;

}

export function countAllDrawings(){

migrateLegacyDrawingsStorage();

let total =
0;
const activeExchange =
getActiveExchangeId();

for(
let i =
0;
i <
localStorage.length;
i++
){

const key =
localStorage.key(
i
);

if(
!isDrawingsStorageKey(
key
)
){
continue;
}

if(
exchangeFromDrawingsKey(
key
) !==
activeExchange
){
continue;
}

try{

const drawings =
JSON.parse(
localStorage.getItem(
key
) ||
"[]"
);

if(
Array.isArray(
drawings
) &&
drawings.length >
0
){
total +=
drawings.length;
}else if(
Array.isArray(
drawings
)
){
localStorage.removeItem(
key
);
}

}catch{
/* ignore */
}

}

return total;

}

export async function clearAllDrawings(){

const {
purgeExchangeLocalDrawingsStorage
} =
await import("./drawings-storage.js?v=7");

const symbols =
purgeExchangeLocalDrawingsStorage(
getActiveExchangeId()
);

symbols.forEach(symbol=>{

window.dispatchEvent(
new CustomEvent(
"drawings-updated",
{
detail:{
symbol,
cleared: true
}
}
)
);

});

window.dispatchEvent(
new CustomEvent(
"drawings-cleared-all"
)
);

return {
symbols: symbols.size
};

}

export function formatAlertDate(ts){

if(!ts){
return "—";
}

const d =
new Date(ts);

const pad =
n=>String(n).padStart(2, "0");

return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${pad(d.getFullYear() % 100)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;

}
