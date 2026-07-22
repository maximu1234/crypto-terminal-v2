import {
isCloudLoggedInEffective,
ensureCloudLoginResolved
} from "../cloud-sync.js?v=45";

import {
resolveAlertAuthFast,
readAlertTokenSync,
readPersistedAuthSession,
setAlertAuthCache
} from "../alert-auth-cache.js?v=7";

import {
createPullCoalescer,
isAlertsPage,
isDrawingsUiPage
} from "../cloud-sync-throttle.js?v=3";

import {
IS_YANDEX,
alertsDebugLog,
alertsRestStressUntil,
lastSeenCloudAlerts,
markAlertsPullFailure,
markAlertsPullSuccess,
warnAlertsPullThrottled,
isAlertsPullInBackoff,
broadcastAlertsRegistrySync
} from "./debug.js?v=4";

import {
runCloudOp,
enqueueAlertPush,
withTimeout,
getAuthed,
verifyAlertActiveInCloud,
normalizeAlertTf,
purgeAlertViaRest,
purgeAlertRowByCloudId,
pushAlertViaWorker,
clearAllAlertsFromCloud,
fetchWithTimeout,
softDeleteAlertViaRest,
hintWorkerReloadAlerts
} from "./worker-client.js?v=6";

import {
isAlertsCloudDisabled
} from "../supabase-usage-prefs.js?v=5";

function resolveAlertExchangeId(
entry
){

return String(
entry?.exchangeId ||
entry?.exchange_id ||
"bybit"
).trim().toLowerCase();

}

const coalesceRegistryPull =
createPullCoalescer({
minIntervalMs: IS_YANDEX
? 4000
: 2000,
errorBackoffMs: IS_YANDEX
? 15000
: 8000
});

const UNSYNCED_LOCAL_KEEP_MS =
30000;

const purgeRetryInFlight =
new Set();

/** Блокирует merge/push/reconcile после «удалить все», пока облако не очищено. */
let registrySyncPausedUntil = 0;

let registrySyncTimer = null;

const REGISTRY_SYNC_DEBOUNCE_MS = 200;

export function pauseRegistryCloudSync(
ms = 0
){

if(
!ms ||
ms < 1
){
registrySyncPausedUntil = 0;
return;
}

registrySyncPausedUntil =
Date.now() + ms;

}

export function isRegistryCloudSyncPaused(){

return Date.now() < registrySyncPausedUntil;

}

async function markRowSyncedAfterVerify(
ctx,
symbol,
shapeId,
cloudId
){

const { markAlertCloudSynced, markAlertCloudId } =
await import("../alerts.js?v=105");

const ok =
await verifyAlertActiveInCloud(
ctx,
symbol,
shapeId
);

if(!ok){
return false;
}

markAlertCloudSynced(
symbol,
shapeId
);

if(cloudId){
markAlertCloudId(
symbol,
shapeId,
cloudId
);
}

return true;

}

function isJwtExpiredError(err){

const msg =
String(
err?.message ||
err ||
""
);

return (
/JWT expired/i.test(msg) ||
/PGRST303/i.test(msg) ||
/invalid jwt/i.test(msg)
);

}

function isJwtExpiredText(text){

const msg =
String(text || "");

return (
/JWT expired/i.test(msg) ||
/PGRST303/i.test(msg) ||
/invalid jwt/i.test(msg)
);

}

function isMissingColumnError(
text,
column
){

const msg =
String(text || "");

return (
new RegExp(column, "i").test(msg) &&
(
/PGRST204|42703|column|does not exist|schema cache/i.test(msg)
)
);

}

/**
 * Прямой REST upsert с JWT пользователя (обходит зависания supabase-js).
 */
async function pushAlertViaRest(
entry,
ctx
){

let token =
getCachedAlertAuth()?.token ||
readAlertTokenSync()?.token ||
null;

if(
!token
){
const persisted =
readPersistedAuthSession();

if(
persisted?.access_token
){
token =
persisted.access_token;
}
}

if(
!token &&
ctx
){
try{
const { data } =
await withTimeout(
ctx.sb.auth.getSession(),
5000,
"getSession push"
);
token =
data?.session?.access_token || null;
if(token){
setAlertAuthCache(
ctx,
token
);
}
}catch(err){
console.warn(
"alert REST push getSession:",
err?.message || err
);
}
}

if(!token){
console.warn(
"alert REST push: нет access_token"
);
return false;
}

const env =
await import("../supabase-env.js?v=5");

const base =
String(env.SUPABASE_URL || "")
.replace(/\/$/, "");

const anon =
env.SUPABASE_ANON_KEY;

if(
!base ||
!anon
){
console.warn(
"alert REST push: нет SUPABASE_URL/ANON_KEY"
);
return false;
}

const shapeId =
String(
entry?.shapeId ||
entry?.id ||
""
).trim();

const symbol =
String(entry?.symbol || "").trim().toUpperCase();

const price =
Number(entry?.price);

if(
!symbol ||
!shapeId ||
!Number.isFinite(price)
){
return false;
}

const row = {
user_id: ctx.user.id,
symbol,
shape_id: shapeId,
price,
tf: normalizeAlertTf(entry.tf),
exchange_id:
resolveAlertExchangeId(
entry
),
triggered_at: null,
deleted_at: null,
...(
String(
entry?.source ||
""
).trim()
? {
source:
String(
entry.source
).trim()
}
: {}
)
};

const controller =
new AbortController();

const timer =
setTimeout(()=>{
controller.abort();
}, 15000);

try{

const res =
await fetch(
`${base}/rest/v1/price_alerts?on_conflict=user_id,symbol,shape_id`,
{
method: "POST",
signal: controller.signal,
headers: {
apikey: anon,
Authorization: `Bearer ${token}`,
"Content-Type": "application/json",
Prefer: "resolution=merge-duplicates,return=representation"
},
body: JSON.stringify(row)
}
);

const text =
await res.text();

if(!res.ok){
console.error(
"[alerts] REST push ОТКЛОНЁН:",
res.status,
symbol,
shapeId,
text.slice(0, 400)
);
return false;
}

let cloudId =
null;

try{
const parsed =
JSON.parse(text);

const row =
Array.isArray(parsed)
? parsed[0]
: parsed;

cloudId =
row?.id ||
null;
}catch{
/* ignore */
}

if(cloudId){
const { markAlertCloudId } =
await import("../alerts.js?v=105");

markAlertCloudId(
symbol,
shapeId,
cloudId
);
}

alertsDebugLog(
"alert cloud push ok (REST):",
symbol,
shapeId,
cloudId || ""
);

void hintWorkerReloadAlerts().catch(()=>{});

return true;

}catch(err){

console.warn(
"alert REST push:",
err?.message || err
);
return false;

}finally{

clearTimeout(timer);

}

}

async function pushAlertToCloudImpl(entry){

const ctx =
await getAuthed();

if(!ctx){
console.warn(
"alert cloud push: нет сессии — войдите через шестерёнку и обновите страницу"
);
return false;
}

const shapeId =
String(
entry?.shapeId ||
entry?.id ||
""
).trim();

const symbol =
String(entry?.symbol || "").trim().toUpperCase();

const price =
Number(entry?.price);

if(
!symbol ||
!shapeId ||
!Number.isFinite(price)
){
console.warn(
"alert cloud push: неполные данные",
{ symbol, shapeId, price }
);
return false;
}

const { data: existing } =
await ctx.sb
.from("price_alerts")
.select("triggered_at")
.eq("user_id", ctx.user.id)
.eq("symbol", symbol)
.eq("shape_id", shapeId)
.maybeSingle();

if(existing?.triggered_at){
const { error: staleErr } =
await ctx.sb
.from("price_alerts")
.delete()
.eq("user_id", ctx.user.id)
.eq("symbol", symbol)
.eq("shape_id", shapeId);

if(staleErr){
console.warn(
"alert cloud stale delete:",
staleErr.message
);
}
}

const row = {
user_id: ctx.user.id,
symbol,
shape_id: shapeId,
price,
tf: normalizeAlertTf(entry.tf),
exchange_id:
resolveAlertExchangeId(
entry
),
triggered_at: null,
...(
String(
entry?.source ||
""
).trim()
? {
source:
String(
entry.source
).trim()
}
: {}
)
};

const { error: upsertErr } =
await withTimeout(
ctx.sb
.from("price_alerts")
.upsert(
row,
{ onConflict: "user_id,symbol,shape_id" }
),
15000,
"alert upsert"
);

if(!upsertErr){
const verified =
await verifyAlertActiveInCloud(
ctx,
symbol,
shapeId
);

alertsDebugLog(
"alert cloud push ok:",
symbol,
shapeId,
row.tf
);

if(!verified){
console.warn(
"alert cloud push: upsert ok, проверка строки не сразу",
symbol,
shapeId
);
}

return true;
}

console.warn(
"alert cloud upsert:",
upsertErr.message,
upsertErr.code
);

const { error: insertErr } =
await ctx.sb
.from("price_alerts")
.insert(row);

if(insertErr){
console.warn(
"alert cloud insert:",
insertErr.message,
insertErr.code,
insertErr.details
);
return false;
}

const verified =
await verifyAlertActiveInCloud(
ctx,
symbol,
shapeId
);

alertsDebugLog(
"alert cloud push ok (insert):",
symbol,
shapeId,
row.tf
);

if(!verified){
console.warn(
"alert cloud push: insert ok, проверка строки не сразу",
symbol,
shapeId
);
}

return true;

}

export async function removeAllAlertsEverywhere(
opts = {}
){

pauseRegistryCloudSync(
60000
);

if(registrySyncTimer){
clearTimeout(registrySyncTimer);
registrySyncTimer = null;
}

const { stripAlertFlagsNotInRegistry } =
await import("../alerts.js?v=105");

const ok =
await clearAllAlertsFromCloud();

if(
!opts.skipReconcile
){
await reconcileLocalRegistryWithCloud();
}

stripAlertFlagsNotInRegistry({
emitDrawingsEvents: false
});

pauseRegistryCloudSync(0);

return ok;

}

function localAlertKey(row){

return `${String(row.symbol).toUpperCase()}::${String(row.shapeId)}`;

}

export async function pruneOrphanCloudAlerts(){

const ctx = await getAuthed();

if(!ctx){
return 0;
}

const { getActiveAlerts } =
await import("../alerts.js?v=105");

const localKeys =
new Set(
getActiveAlerts().map(localAlertKey)
);

const { data: cloudRows, error } =
await ctx.sb
.from("price_alerts")
.select("id, symbol, shape_id")
.eq("user_id", ctx.user.id)
.is("triggered_at", null)
.is("deleted_at", null);

if(error){
console.warn(
"alert cloud prune list:",
error.message
);
return 0;
}

if(!cloudRows?.length){
return 0;
}

let removed = 0;

for(const row of cloudRows){

const key =
`${String(row.symbol).toUpperCase()}::${String(row.shape_id)}`;

if(localKeys.has(key)){
continue;
}

const pruned =
await purgeAlertRowByCloudId(row.id);

if(pruned){
removed += 1;
alertsDebugLog(
"alert cloud prune:",
row.symbol,
row.shape_id
);
}

}

if(removed){
alertsDebugLog(
`alert cloud prune: removed ${removed} orphan(s)`
);
}

return removed;

}

function normalizeAlertEntry(entry){

return {
shapeId:
entry?.shapeId ||
entry?.id,
symbol:
String(entry?.symbol || "").trim().toUpperCase(),
price:
Number(entry?.price),
tf:
normalizeAlertTf(entry?.tf)
};

}

async function pushOneAlertRowImpl(
row,
options = {}
){

const retries =
Number(options.retries) ||
1;

if(
!row.symbol ||
!row.shapeId ||
!Number.isFinite(row.price)
){
console.warn(
"[alerts] push skip: неполная строка",
row
);
return false;
}

const { ensureCloudReady } =
await import("../auth-ui.js?v=40");

await ensureCloudReady();

let auth =
await resolveAlertAuthFast();

let ctx =
auth?.ctx || null;

if(!ctx){
ctx =
await getAuthed();
}

if(!ctx){
console.warn(
"[alerts] push: нет сессии — войдите через шестерёнку"
);
return false;
}

for(
let attempt = 0;
attempt < retries;
attempt++
){

if(await pushAlertViaWorker(row)){

const { markAlertCloudSynced } =
await import("../alerts.js?v=105");

/* Worker пишет service role — не ждём SELECT по JWT пользователя */
markAlertCloudSynced(
row.symbol,
row.shapeId
);

alertsDebugLog(
"[alerts] ✓ Supabase (worker):",
row.symbol,
row.shapeId
);

broadcastAlertsRegistrySync();

return true;

}

if(
attempt ===
retries - 1 &&
ctx &&
await pushAlertViaRest(
row,
ctx
)
){

const { markAlertCloudSynced } =
await import("../alerts.js?v=105");

if(
await markRowSyncedAfterVerify(
ctx,
row.symbol,
row.shapeId,
null
)
){
markAlertCloudSynced(
row.symbol,
row.shapeId
);

alertsDebugLog(
"[alerts] ✓ Supabase (REST fallback):",
row.symbol,
row.shapeId
);

broadcastAlertsRegistrySync();

return true;

}

}

console.warn(
"[alerts] запись в Supabase не удалась, попытка",
attempt + 1,
"/",
retries,
row.symbol,
row.shapeId
);

if(attempt < retries - 1){
await new Promise(r=>{
setTimeout(
r,
400 * (attempt + 1)
);
});
ctx =
await getAuthed();
}

}

console.error(
"[alerts] НЕ ЗАПИСАН в Supabase:",
row.symbol,
row.shapeId,
"— проверьте вход (шестерёнка) и вкладку сети"
);

return false;

}

export function pushOneAlertRow(
row,
options = {}
){

return enqueueAlertPush(()=>
pushOneAlertRowImpl(
row,
options
)
);

}

/** Все локальные алерты без cloudSynced — повторить push (после возврата на вкладку и т.п.). */
export async function pushUnsyncedAlerts(
options = {}
){

const forceAll =
options.forceAll === true;

if(
isAlertsCloudDisabled()
){
return 0;
}

if(
!isCloudLoggedInEffective() ||
isRegistryCloudSyncPaused()
){
return 0;
}

const { getActiveAlerts, countAlertsOnChart } =
await import("../alerts.js?v=105");

const onChart =
countAlertsOnChart();

const pending =
getActiveAlerts().filter(a=>{
if(a.cloudSynced){
return false;
}

if(forceAll){
return true;
}

const localTs =
Number(a.priceUpdatedAt) ||
Number(a.createdAt) ||
0;

return (
Date.now() - localTs <=
UNSYNCED_LOCAL_KEEP_MS
);
});

if(!pending.length){

if(onChart > 0){
console.warn(
"[alerts] на графике",
onChart,
", но несинхронизированные строки отсутствуют или устарели"
);
}

return 0;

}

alertsDebugLog(
"[alerts] дозапись в Supabase:",
pending.length,
"(на графике:",
onChart,
")"
);

let ok =
0;

for(const entry of pending){
const row =
normalizeAlertEntry(entry);

alertsDebugLog(
"[alerts] дозапись попытка:",
row.symbol,
row.shapeId
);

if(
await pushOneAlertRow(
row,
{ retries: 6 }
)
){
ok += 1;
}else{
console.error(
"[alerts] дозапись не удалась:",
row.symbol,
row.shapeId
);
}
}

alertsDebugLog(
"[alerts] дозапись готова:",
ok,
"/",
pending.length
);

return ok;

}

async function syncAllLocalAlertsToCloudImpl(){

const { ensureCloudReady } =
await import("../auth-ui.js?v=40");

await ensureCloudReady();

const ctx =
await getAuthed();

if(!ctx){
console.warn(
"alert cloud sync: нет сессии"
);
return 0;
}

const { getActiveAlerts } =
await import("../alerts.js?v=105");

const list =
getActiveAlerts();

if(!list.length){
return 0;
}

let ok = 0;

for(const entry of list){
const row =
normalizeAlertEntry(entry);

if(
await pushOneAlertRow(
row,
{ retries: 2 }
)
){
ok += 1;
}
}

alertsDebugLog(
`alert cloud sync: pushed ${ok}/${list.length}`
);

return ok;

}

export function syncAllLocalAlertsToCloud(){

return runCloudOp(()=>
syncAllLocalAlertsToCloudImpl()
);

}

export function syncAllLocalAlertsToCloudImmediate(){

return syncAllLocalAlertsToCloudImpl();

}

/** Сразу записать в облако (отпустили линию алерта). */
export function flushAlertCloudPush(
entry
){

const row =
normalizeAlertEntry(entry);

if(
!row.symbol ||
!row.shapeId ||
!Number.isFinite(row.price)
){
return Promise.resolve(false);
}

return pushOneAlertRow(
row,
{ retries: 6 }
);

}

/**
 * Сверка с активными строками price_alerts (triggered_at IS NULL).
 * Импортирует все активные облачные алерты в localStorage (кросс-устройство).
 */
async function fetchActivePriceAlertsViaRest(
auth
){

let env;

try{
env =
await import("../supabase-env.js?v=5");
}catch{
return null;
}

const base =
String(
env.SUPABASE_URL || ""
).replace(
/\/$/,
""
);
const anon =
env.SUPABASE_ANON_KEY;
const uid =
auth?.userId ||
auth?.user?.id;

if(
!base ||
!anon ||
!auth?.token ||
!uid
){
return null;
}

const url =
`${base}/rest/v1/price_alerts?user_id=eq.${encodeURIComponent(uid)}` +
`&triggered_at=is.null` +
`&deleted_at=is.null` +
`&select=id,symbol,shape_id,price,tf,exchange_id,created_at,updated_at`;

const legacyUrl =
`${base}/rest/v1/price_alerts?user_id=eq.${encodeURIComponent(uid)}` +
`&triggered_at=is.null` +
`&select=id,symbol,shape_id,price,tf,exchange_id,created_at`;

try{
let token =
auth?.token;

if(
!token
){
return null;
}

for(let attempt = 0; attempt < 2; attempt++){
const res =
await fetchWithTimeout(
url,
{
method: "GET",
headers: {
apikey: anon,
Authorization: `Bearer ${token}`,
Accept: "application/json"
}
},
15000,
"price_alerts fetch"
);

if(
!res.ok
){
const errText =
await res.text();

if(
attempt === 0 &&
isJwtExpiredText(errText)
){
try{
await ensureCloudLoginResolved(10000);
}catch{
/* ignore */
}

const refreshed =
readAlertTokenSync()?.token ||
readPersistedAuthSession()?.access_token ||
null;

if(
refreshed &&
refreshed !== token
){
token = refreshed;
continue;
}
}

if(
attempt === 0 &&
(
isMissingColumnError(errText, "deleted_at") ||
isMissingColumnError(errText, "updated_at")
)
){
const legacyRes =
await fetchWithTimeout(
legacyUrl,
{
method: "GET",
headers: {
apikey: anon,
Authorization: `Bearer ${token}`,
Accept: "application/json"
}
},
15000,
"price_alerts fetch legacy"
);

if(legacyRes.ok){
const legacyRows =
await legacyRes.json();
return Array.isArray(legacyRows)
? legacyRows
: [];
}
}

console.warn(
"[alerts] fetch REST:",
res.status,
errText.slice(
0,
160
)
);
return null;
}

const rows =
await res.json();

return Array.isArray(
rows
)
? rows
: [];
}

return null;

}catch(
err
){
const msg =
err?.message || err;

if(
/INSUFFICIENT_RESOURCES/i.test(
String(
msg
)
)
){
alertsRestStressUntil =
Date.now() +
(
IS_YANDEX
? 20000
: 10000
);
}else{
console.warn(
"[alerts] fetch REST:",
msg
);
}

return null;

}

}

export async function reconcileLocalRegistryWithCloud(){

if(
isAlertsCloudDisabled()
){
return 0;
}

const snap =
readAlertTokenSync();

let token =
snap?.token ||
null;
let userId =
snap?.user?.id ||
null;

if(
!token ||
!userId
){
const persisted =
readPersistedAuthSession();

if(
persisted?.access_token &&
persisted?.user?.id
){
token =
persisted.access_token;
userId =
persisted.user.id;
}
}

let data =
null;

if(
token &&
userId
){
data =
await fetchActivePriceAlertsViaRest({
token,
userId
});
}

if(
data ===
null
){

const ctx =
await getAuthed();

if(
!ctx?.sb
){
return 0;
}

let result;

try{
result =
await withTimeout(
ctx.sb
.from(
"price_alerts"
)
.select(
"id, symbol, shape_id, price, tf, exchange_id, source, created_at, updated_at, deleted_at"
)
.eq(
"user_id",
ctx.user.id
)
.is(
"triggered_at",
null
)
.is(
"deleted_at",
null
),
12000,
"price_alerts select"
);
}catch(
err
){
markAlertsPullFailure(
err?.message || err
);
warnAlertsPullThrottled(
"alert cloud reconcile:",
err?.message || err
);
return 0;
}

if(
result.error
){
const maybeMissingDeleted =
isMissingColumnError(
result.error.message,
"deleted_at"
);
const maybeMissingUpdated =
isMissingColumnError(
result.error.message,
"updated_at"
);
const maybeMissingSource =
isMissingColumnError(
result.error.message,
"source"
);

if(
maybeMissingDeleted ||
maybeMissingUpdated ||
maybeMissingSource
){
result =
await withTimeout(
ctx.sb
.from(
"price_alerts"
)
.select(
"id, symbol, shape_id, price, tf, created_at"
)
.eq(
"user_id",
ctx.user.id
)
.is(
"triggered_at",
null
),
12000,
"price_alerts select legacy"
);
}
}

if(
result.error
){
markAlertsPullFailure(
result.error.message
);
warnAlertsPullThrottled(
"alert cloud reconcile:",
result.error.message
);
return 0;
}

data =
result.data;

}

const {
saveAlertsFromCloudMerge,
alertEntryKey,
loadAllAlerts,
normalizeAlertTf,
isAlertDeleted,
forgetAlertDeleted
} =
await import("../alerts.js?v=105");

const cloudByKey =
new Map();
const removedRows =
[];

for(const row of data || []){

const sym =
String(row.symbol || "").trim().toUpperCase();
const sid =
String(row.shape_id || "").trim();

if(
!sym ||
!sid
){
continue;
}

if(
isAlertDeleted(
sym,
sid
)
){

const purgeKey =
alertEntryKey(
sym,
sid
);

if(
!purgeRetryInFlight.has(
purgeKey
)
){
purgeRetryInFlight.add(
purgeKey
);

void purgeAlertViaRest({
symbol: sym,
shapeId: sid
}).then(
ok=>{
if(
ok
){
forgetAlertDeleted(
sym,
sid
);
}
}
).finally(()=>{
purgeRetryInFlight.delete(
purgeKey
);
});
}

continue;
}

const key =
alertEntryKey(
sym,
sid
);

cloudByKey.set(
key,
row
);

}

for(
const [key, meta] of lastSeenCloudAlerts
){

if(
!cloudByKey.has(key)
){
removedRows.push(meta);
}

}

lastSeenCloudAlerts.clear();

for(
const [key, row] of cloudByKey
){

const sym =
String(row.symbol || "").trim().toUpperCase();
const sid =
String(row.shape_id || "").trim();

lastSeenCloudAlerts.set(
key,
{
symbol: sym,
shape_id: sid,
price: Number(row.price),
tf: row.tf || "60"
}
);

}

if(removedRows.length){

const { applyRemoteAlertRemoved } =
await import("../alerts.js?v=105");

for(const row of removedRows){

applyRemoteAlertRemoved(row);

}

}

const local =
loadAllAlerts();
const localByKey =
new Map();

for(const a of local){

const sym =
String(a.symbol || "").trim().toUpperCase();
const sid =
String(a.shapeId || a.id || "").trim();

if(
!sym ||
!sid
){
continue;
}

localByKey.set(
alertEntryKey(
sym,
sid
),
a
);

}

const next =
[];
const seen =
new Set();
const localsNeedingPush =
[];

for(
const [key, cloud] of cloudByKey
){

const sym =
String(cloud.symbol || "").trim().toUpperCase();
const sid =
String(cloud.shape_id || "").trim();

if(
isAlertDeleted(
sym,
sid
)
){
continue;
}

const prev =
localByKey.get(key);

const cloudPrice =
Number(cloud.price);
const prevPrice =
Number(prev?.price);
const localTs =
Number(prev?.priceUpdatedAt) ||
Number(prev?.createdAt) ||
0;
const cloudTs =
Date.parse(
cloud.updated_at ||
cloud.created_at
) ||
0;
const pricesDiffer =
Number.isFinite(prevPrice) &&
Number.isFinite(cloudPrice) &&
Math.abs(prevPrice - cloudPrice) >
1e-12;
const localPriceNewer =
!!prev &&
pricesDiffer &&
localTs >
cloudTs +
500;

let mergedPrice =
Number.isFinite(cloudPrice)
? cloudPrice
: prevPrice;

if(
localPriceNewer
){
mergedPrice =
prevPrice;
localsNeedingPush.push(
prev
);
}

next.push({
id: sid,
shapeId: sid,
symbol: sym,
price: mergedPrice,
tf: normalizeAlertTf(
cloud.tf ||
prev?.tf
),
exchangeId:
resolveAlertExchangeId(
{
exchangeId:
cloud.exchange_id,
exchange_id:
cloud.exchange_id,
...prev
}
),
createdAt:
prev?.createdAt ||
(Date.parse(cloud.created_at) || Date.now()),
cloudId: String(cloud.id || prev?.cloudId || ""),
cloudSynced: true,
priceUpdatedAt:
localPriceNewer
? localTs
: Math.max(
localTs,
cloudTs ||
Date.now()
),
...(
(()=>{
const src =
String(
cloud.source ||
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
});

seen.add(key);

}

for(const a of local){

const sym =
String(a.symbol || "").trim().toUpperCase();
const sid =
String(a.shapeId || a.id || "").trim();

if(
!sym ||
!sid
){
continue;
}

const key =
alertEntryKey(
sym,
sid
);

if(seen.has(key)){
continue;
}

if(
!a.cloudSynced &&
!a.cloudId
){
if(
isAlertsCloudDisabled()
){
next.push(a);
seen.add(key);
continue;
}

const localTs =
Number(a.priceUpdatedAt) ||
Number(a.createdAt) ||
0;

if(
Date.now() - localTs <=
UNSYNCED_LOCAL_KEEP_MS
){
next.push(a);
seen.add(key);
}
}

}

const changed =
next.length !== local.length ||
next.some(row=>{

const sym =
String(row.symbol || "").trim().toUpperCase();
const sid =
String(row.shapeId || "").trim();
const key =
alertEntryKey(
sym,
sid
);
const prev =
localByKey.get(key);

if(!prev){
return true;
}

return (
Number(prev.price) !== Number(row.price) ||
normalizeAlertTf(prev.tf) !== normalizeAlertTf(row.tf) ||
!!prev.cloudSynced !== !!row.cloudSynced ||
String(prev.cloudId || "") !== String(row.cloudId || "")
);

});

if(changed){
saveAlertsFromCloudMerge(next);
alertsDebugLog(
"[alerts] reconcile: в облаке",
cloudByKey.size,
"| реестр",
next.length
);
}

for(const entry of localsNeedingPush){
const row =
normalizeAlertEntry(entry);

if(
row.symbol &&
row.shapeId &&
Number.isFinite(row.price)
){
void pushOneAlertRow(
row,
{ retries: 4 }
);
}
}

markAlertsPullSuccess();

return next.length;

}

export async function pullRegistryFromCloud(){

return runCloudOp(async()=>{

const n =
await reconcileLocalRegistryWithCloud();

const { stripAlertFlagsNotInRegistry } =
await import("../alerts.js?v=105");

stripAlertFlagsNotInRegistry(
isAlertsPage()
? {
registryOnlySymbols: true,
emitDrawingsEvents: false
}
: {}
);

return n;

});

}

/** Без очереди cloudOp — сразу подтянуть алерты с Mac/другого устройства. */
export async function pullRegistryFromCloudNow(
opts = {}
){

if(
isAlertsCloudDisabled()
){
return 0;
}

if(
isRegistryCloudSyncPaused()
){
return 0;
}

if(
Date.now() <
alertsRestStressUntil
){
return 0;
}

if(
isAlertsPullInBackoff() &&
!opts.bypassBackoff
){
return 0;
}

try{
const { ensureCloudLoginResolved } =
await import("../cloud-sync.js?v=45");

await ensureCloudLoginResolved(
8000
);
}catch{
/* ignore */
}

const immediate =
opts.immediate ===
true;

let n = 0;

try{
n =
immediate
? await reconcileLocalRegistryWithCloud()
: await coalesceRegistryPull(
()=>reconcileLocalRegistryWithCloud()
);
}catch(err){
markAlertsPullFailure(
err?.message || err
);
warnAlertsPullThrottled(
"alert cloud pull:",
err?.message || err
);
return 0;
}

const { stripAlertFlagsNotInRegistry } =
await import("../alerts.js?v=105");

stripAlertFlagsNotInRegistry(
isAlertsPage()
? {
registryOnlySymbols: true,
emitDrawingsEvents: false
}
: {
emitDrawingsEvents: false
}
);

if(
n >
0 ||
isDrawingsUiPage()
){
window.dispatchEvent(
new CustomEvent(
"alerts-registry-pulled"
)
);
}

return n;

}

export function scheduleRegistryCloudSync(){

if(
isAlertsCloudDisabled()
){
return;
}

if(registrySyncTimer){
clearTimeout(registrySyncTimer);
}

registrySyncTimer = setTimeout(()=>{
registrySyncTimer = null;

if(
!isCloudLoggedInEffective() ||
isRegistryCloudSyncPaused()
){
return;
}

void pushUnsyncedAlerts()
.then(
()=>pullRegistryFromCloudNow({
immediate: true
})
)
.catch(
err=>{
console.warn(
"alert registry sync:",
err?.message || err
);
}
);

},
REGISTRY_SYNC_DEBOUNCE_MS);

}
