import {
readAlertTokenSync
} from "./alert-auth-cache.js?v=4";

import {
withTimeout
} from "./async-timeout.js?v=1";

const STORAGE_KEY = "price_alerts_v1";

const HISTORY_KEY = "price_alerts_history_v1";

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

import("./alerts-cloud-sync.js?v=69")
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
"D":"1D"
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
!key?.startsWith("drawings_")
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
const row of loadAlerts()
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
export function mergeRegistryFromChartDrawings(){

migrateLegacyDrawingAlertsFromShapes();

stripAlertFlagsNotInRegistry();

const list =
loadAlerts();

console.log(
"[alerts] реестр:",
list.length,
"| без облака:",
list.filter(
a=>!a.cloudSynced
).length
);

return list.length;

}

export async function createPriceAlert(
symbol,
price,
tf
){

const { isCloudLoggedIn } =
await import("./cloud-sync.js?v=19");

if(
!isCloudLoggedIn()
){
return null;
}

const { getTelegramChatId } =
await import("./alerts-cloud-sync.js?v=69");

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

const row = {
id: shapeId,
shapeId,
symbol: sym,
price: level,
tf: normalizeAlertTf(
tf
),
createdAt: Date.now(),
cloudSynced: false
};

const list =
loadAlerts().filter(
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
await import("./auth-ui.js?v=23");

await ensureCloudReady();

const m =
await import("./alerts-cloud-sync.js?v=69");

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

const { ensureCloudReady } =
await import("./auth-ui.js?v=23");

await ensureCloudReady();

mergeRegistryFromChartDrawings();

const m =
await import("./alerts-cloud-sync.js?v=69");

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

console.log(
"Alert: ✓ в Supabase",
sym,
shapeId
);

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

void import("./alerts-cloud-sync.js?v=69").then(m=>{
m.flushAlertCloudPush(row);
});

void import("./alert-monitor.js?v=64").then(m=>{
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

removeDrawingShape(
sym,
sid
);

stripAlertFlagsNotInRegistry();

dispatchPriceAlertsChanged(
sym
);

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
loadAlerts().find(
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

console.log(
"[alerts] сработал (облако):",
sym,
sid
);

if(existing){
void import("./alert-monitor.js?v=64").then(m=>{
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
loadAlerts();
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
loadAlerts().find(
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

console.log(
"[alerts] сработал:",
sym,
sid
);

void import("./alert-monitor.js?v=64").then(m=>{
m.notifyAlertTriggered({
symbol: sym,
shapeId: sid,
price: existing?.price,
tf: existing?.tf
});
});

void import("./alerts-cloud-sync.js?v=69").then(m=>{
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

let any =
false;

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
drawingsStorageKey(sym),
JSON.stringify(next)
);

any = true;

window.dispatchEvent(
new CustomEvent(
"drawings-updated",
{ detail:{ symbol: sym } }
)
);

}

if(any){
console.log(
"[alerts] сняты флаги алертов на всех графиках"
);
}

}

export function removeAllAlerts(){

clearAllChartAlertFlags();
saveAlertsFromCloudMerge([]);
stripAlertFlagsNotInRegistry();

void import("./alerts-cloud-sync.js?v=69").then(m=>{
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

if(
Array.isArray(drawings) &&
drawings.length >
0
){
total += drawings.length;
}else if(
Array.isArray(drawings)
){
localStorage.removeItem(
key
);
}

}catch{}

}

return total;

}

export async function clearAllDrawings(){

const { purgeAllLocalDrawingsStorage } =
await import("./drawings-storage.js?v=5");

const drawingsCloud =
await import("./drawings-cloud-sync.js?v=9");

const alertsCloud =
await import("./alerts-cloud-sync.js?v=69");

const hadLocalDrawings =
countAllDrawings() >
0;
const hadLocalAlerts =
getAlertsSorted().length >
0;
const alreadyEmpty =
!hadLocalDrawings &&
!hadLocalAlerts;

let symbols =
purgeAllLocalDrawingsStorage();

drawingsCloud.pauseDrawingsCloudSync(
120000
);
alertsCloud.pauseRegistryCloudSync(
120000
);

try{
clearAllChartAlertFlags();
saveAlertsFromCloudMerge(
[]
);

symbols =
purgeAllLocalDrawingsStorage();

let cloudDrawingsOk =
null;

if(
alreadyEmpty
){
void drawingsCloud.clearAllDrawingsFromCloud();
}else{
cloudDrawingsOk =
await drawingsCloud.clearAllDrawingsFromCloud();

if(
cloudDrawingsOk === false
){
throw new Error(
"Не удалось удалить рисунки в Supabase. Обновите страницу и войдите через шестерёнку."
);
}
}

symbols =
purgeAllLocalDrawingsStorage();

const alertsOk =
await withTimeout(
alertsCloud.removeAllAlertsEverywhere({
skipReconcile: true
}),
12000,
"clear all alerts"
).then(
()=>true
).catch(
err=>{
console.warn(
"[alerts] clear all:",
err?.message || err
);
return false;
}
);

if(
alertsOk === false &&
(
hadLocalAlerts ||
!alreadyEmpty
)
){
console.warn(
"[alerts] не удалось очистить алерты в облаке"
);
}

stripAlertFlagsNotInRegistry();

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
symbols: symbols.size,
cloudDrawingsOk,
alertsOk
};

}finally{

drawingsCloud.pauseDrawingsCloudSync(
0
);
alertsCloud.pauseRegistryCloudSync(
0
);

}

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
