import {
getSupabase,
isSupabaseConfigured,
SUPABASE_AUTH_STORAGE_KEY
} from "./supabase-client.js?v=5";

import {
waitForCloudAuth,
isCloudLoggedIn,
isCloudLoggedInEffective,
onCloudSyncChange
} from "./cloud-sync.js?v=23";

import {
setBrowserCrossCheckEnabled
} from "./alerts-mode.js";

import {
getCachedAlertAuth,
setAlertAuthCache,
clearAlertAuthCache,
resolveAlertAuthFast,
readAlertTokenSync,
readPersistedAuthSession
} from "./alert-auth-cache.js?v=6";

import {
normalizeAlertWorkerBaseUrl
} from "./alert-worker-url.js?v=1";

import {
createPullCoalescer,
isAlertsPage
} from "./cloud-sync-throttle.js?v=2";

const IS_YANDEX =
/YaBrowser|Yandex/i.test(
navigator.userAgent ||
""
);

const coalesceRegistryPull =
createPullCoalescer({
minIntervalMs: IS_YANDEX
? 4000
: 2000,
errorBackoffMs: IS_YANDEX
? 15000
: 8000
});

let alertsRestStressUntil =
0;

let refreshAlertModeTimer =
null;

let alertsRealtimeChannel = null;

let alertsRealtimeUserId = null;

let reconcileTimer = null;

let registrySyncTimer = null;

const REGISTRY_SYNC_DEBOUNCE_MS = 200;

const RECONCILE_INTERVAL_MS = 4000;

const ALERTS_BG_SYNC_MS =
isAlertsPage()
? (
IS_YANDEX
? 10000
: 8000
)
: (
IS_YANDEX
? 6000
: 5000
);

let lastRemoteAlertMode = null;

/** Снимок активных строк облака — ловим срабатывание, если realtime DELETE без payload (iPad). */
const lastSeenCloudAlerts =
new Map();

const purgeRetryInFlight =
new Set();

let remoteRegistrySyncTimer = null;

const REMOTE_REGISTRY_SYNC_MS = 80;

let alertsBgSyncTimer = null;

let hydrateAlertsInflight = null;

let lastHydrateAlertsMs =
0;

/** Блокирует merge/push/reconcile после «удалить все», пока облако не очищено. */
let registrySyncPausedUntil = 0;

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

function isRegistryCloudSyncPaused(){

return Date.now() < registrySyncPausedUntil;

}

async function updateBrowserCrossMode(){

const loggedIn =
isCloudLoggedIn();

let worker = "";

try{
const env =
await import("./supabase-env.js?v=5");
worker =
normalizeAlertWorkerBaseUrl(
env.ALERT_WORKER_URL || ""
);
}catch{
/* ignore */
}

const configured =
await isSupabaseConfigured();

const remote =
loggedIn &&
configured &&
!!worker;

/* Браузер всегда ловит пересечение (UI + /trigger). Worker — запас, если вкладка закрыта. */
setBrowserCrossCheckEnabled(true);

if(lastRemoteAlertMode !== remote){
lastRemoteAlertMode = remote;

if(remote){
console.log(
"[alerts] облако: UI в браузере + Telegram (браузер /trigger и worker)"
);
}else{
console.log(
"[alerts] локально: только браузер (без Telegram)"
);
}
}

return remote;

}

async function teardownAlertsRealtime(){

if(alertsRealtimeChannel){
try{
const sb =
await getSupabase();

if(sb){
await sb.removeChannel(alertsRealtimeChannel);
}
}catch{
/* ignore */
}

alertsRealtimeChannel = null;
alertsRealtimeUserId = null;
}

}

export function scheduleRemoteRegistrySync(){

if(isRegistryCloudSyncPaused()){
return;
}

if(remoteRegistrySyncTimer){
clearTimeout(remoteRegistrySyncTimer);
}

remoteRegistrySyncTimer = setTimeout(()=>{

remoteRegistrySyncTimer = null;

if(!isCloudLoggedIn()){
return;
}

void pullRegistryFromCloudNow({
immediate: true
})
.then(
async n=>{

const { stripAlertFlagsNotInRegistry } =
await import("./alerts.js?v=79");

stripAlertFlagsNotInRegistry();

if(
n >
0
){
window.dispatchEvent(
new CustomEvent(
"alerts-registry-pulled"
)
);
}

}
)
.catch(
err=>{
console.warn(
"[alerts] remote registry sync:",
err?.message || err
);
}
);

},
REMOTE_REGISTRY_SYNC_MS);

}

async function handleAlertsRealtimeDelete(
oldRow
){

const triggered =
oldRow?.triggered_at;

if(triggered){

const { applyRemoteAlertFired } =
await import("./alerts.js?v=79");

applyRemoteAlertFired(oldRow);
return;

}

const sym =
String(
oldRow?.symbol || ""
).trim().toUpperCase();
const sid =
String(
oldRow?.shape_id ||
oldRow?.shapeId ||
""
).trim();

if(
sym &&
sid
){

const { applyRemoteAlertRemoved } =
await import("./alerts.js?v=79");

applyRemoteAlertRemoved(oldRow);

}else{
console.warn(
"[alerts] realtime DELETE без symbol/shape_id — включите replica identity full на price_alerts"
);
}

scheduleRemoteRegistrySync();

}

function broadcastAlertsRegistrySync(){

if(
!alertsRealtimeChannel
){
return;
}

try{

alertsRealtimeChannel.send({
type: "broadcast",
event: "alerts-registry-sync",
payload: {
at: Date.now()
}
});

}catch{
/* ignore */
}

}

function handleAlertsRealtimeUpsert(
payload
){

const row =
payload?.new;

if(
row &&
!row.triggered_at &&
row.symbol &&
row.shape_id
){

void import("./alerts.js?v=79").then(
({ applyRemoteAlertUpsert })=>{

if(
applyRemoteAlertUpsert(
row
)
){
return;
}

scheduleRemoteRegistrySync();

}
).catch(
err=>{
console.warn(
"[alerts] realtime upsert apply:",
err?.message || err
);
scheduleRemoteRegistrySync();
}
);

return;

}

scheduleRemoteRegistrySync();

}

async function setupAlertsRealtime(
userId
){

await teardownAlertsRealtime();

if(!userId){
return;
}

const sb =
await getSupabase();

if(!sb){
return;
}

alertsRealtimeUserId = userId;

alertsRealtimeChannel =
sb
.channel(
`price_alerts:${userId}`,
{
config:{
broadcast:{
self: false
}
}
}
)
.on(
"postgres_changes",
{
event: "INSERT",
schema: "public",
table: "price_alerts",
filter: `user_id=eq.${userId}`
},
payload=>{
handleAlertsRealtimeUpsert(
payload
);
}
)
.on(
"postgres_changes",
{
event: "UPDATE",
schema: "public",
table: "price_alerts",
filter: `user_id=eq.${userId}`
},
payload=>{
handleAlertsRealtimeUpsert(
payload
);
}
)
.on(
"postgres_changes",
{
event: "DELETE",
schema: "public",
table: "price_alerts",
filter: `user_id=eq.${userId}`
},
payload=>{
void handleAlertsRealtimeDelete(
payload.old
);
}
)
.on(
"broadcast",
{
event: "alerts-registry-sync"
},
()=>{
void pullRegistryFromCloudNow({
immediate: true
}).then(
n=>{
if(
n >
0
){
broadcastAlertsRegistrySync();
}
}
);
}
)
.subscribe(status=>{

if(
status === "SUBSCRIBED"
){
console.log(
"[alerts] realtime: price_alerts"
);
return;
}

if(
status === "CHANNEL_ERROR" ||
status === "TIMED_OUT"
){
console.warn(
"[alerts] realtime:",
status
);
}

});

}

function stopReconcileTimer(){

if(
reconcileTimer
){
clearInterval(
reconcileTimer
);
reconcileTimer =
null;
}

stopAlertsBackgroundSync();

}

function startAlertsBackgroundSync(){

stopAlertsBackgroundSync();

alertsBgSyncTimer =
setInterval(
()=>{

if(
!isCloudLoggedInEffective() ||
isRegistryCloudSyncPaused()
){
return;
}

void pullRegistryFromCloudNow().catch(
err=>{
console.warn(
"[alerts] background sync:",
err?.message || err
);
}
);

},
ALERTS_BG_SYNC_MS
);

}

function stopAlertsBackgroundSync(){

if(
alertsBgSyncTimer
){
clearInterval(
alertsBgSyncTimer
);
alertsBgSyncTimer =
null;
}

}

function startReconcileTimer(){

startAlertsBackgroundSync();

}

function stopAlertsFastPoll(){

stopAlertsBackgroundSync();

}

async function refreshCloudAlertModeImpl(){

const remote =
await updateBrowserCrossMode();

const ctx =
await getAuthed();

if(
remote &&
ctx?.user?.id
){
await setupAlertsRealtime(
ctx.user.id
);
startReconcileTimer();
}else{
await teardownAlertsRealtime();
stopReconcileTimer();
}

}

function refreshCloudAlertMode(){

if(
refreshAlertModeTimer
){
clearTimeout(
refreshAlertModeTimer
);
}

refreshAlertModeTimer =
setTimeout(
()=>{

refreshAlertModeTimer =
null;
void refreshCloudAlertModeImpl().catch(
err=>{
console.warn(
"[alerts] refresh mode:",
err?.message || err
);
}
);

},
IS_YANDEX
? 600
: 350
);

}

let cloudOpChain =
Promise.resolve();

/** Отдельная очередь только для push алертов (не блокируется hydrate/sync). */
let alertPushChain =
Promise.resolve();

export function runCloudOp(fn){

const job =
cloudOpChain.then(()=>fn());

cloudOpChain =
job.catch(()=>{});

return job;

}

export function enqueueAlertPush(fn){

const job =
alertPushChain.then(()=>fn());

alertPushChain =
job.catch(()=>{});

return job;

}

let alertTriggerChain =
Promise.resolve();

export function enqueueAlertTrigger(fn){

const job =
alertTriggerChain.then(()=>fn());

alertTriggerChain =
job.catch(err=>{
console.warn(
"[alerts] trigger chain:",
err?.message || err
);
});

return job;

}

async function markRowSyncedAfterVerify(
ctx,
symbol,
shapeId,
cloudId
){

const { markAlertCloudSynced, markAlertCloudId } =
await import("./alerts.js?v=79");

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

async function getAuthed() {

const auth =
await resolveAlertAuthFast();

if(auth?.ctx?.user){
return auth.ctx;
}

const ctx =
await waitForCloudAuth(12000);

if(ctx){
const token =
await getAccessTokenForUser(ctx);

if(token){
setAlertAuthCache(
ctx,
token
);
}
}

return ctx;

}

async function fetchWithTimeout(
url,
options,
ms = 12000
){

const controller =
new AbortController();

const timer =
setTimeout(()=>{
controller.abort();
}, ms);

try{
return await fetch(
url,
{
...options,
signal: controller.signal
}
);
}finally{
clearTimeout(timer);
}

}

async function getWorkerRequestAuth(){

const sync =
readAlertTokenSync();

if(
sync?.token &&
sync?.user
){
const ctx =
sync.ctx || {
sb: null,
user: sync.user
};

return {
token: sync.token,
ctx
};
}

const hit =
getCachedAlertAuth();

if(
hit?.ctx &&
hit?.token
){
return {
token: hit.token,
ctx: hit.ctx
};
}

const auth =
await resolveAlertAuthFast();

if(
auth?.token &&
auth?.ctx?.user
){
return {
token: auth.token,
ctx: auth.ctx
};
}

const ctx =
await getAuthed();

if(!ctx){
return null;
}

const token =
readAlertTokenSync()?.token ||
await getAccessTokenForUser(ctx);

if(!token){
return null;
}

setAlertAuthCache(
ctx,
token
);

return {
token,
ctx
};

}

async function verifyAlertActiveInCloud(
ctx,
symbol,
shapeId,
attempts = 4
){

const sym =
String(symbol || "").trim().toUpperCase();
const sid =
String(shapeId || "").trim();

for(
let i = 0;
i < attempts;
i++
){

const { data, error } =
await ctx.sb
.from("price_alerts")
.select("id")
.eq("user_id", ctx.user.id)
.eq("symbol", sym)
.eq("shape_id", sid)
.is("triggered_at", null)
.maybeSingle();

if(error){
console.warn(
"alert cloud verify:",
error.message
);
}else if(data?.id){
return true;
}

if(i < attempts - 1){
await new Promise(r=>{
setTimeout(r, 250);
});
}

}

return false;

}

const TELEGRAM_CHAT_CACHE_PREFIX =
"ct_telegram_chat_v1:";

export function readCachedTelegramChatId(
userId
){

if(!userId){
return undefined;
}

try{

const raw =
localStorage.getItem(
TELEGRAM_CHAT_CACHE_PREFIX +
String(userId)
);

if(raw === null){
return undefined;
}

if(raw === "none"){
return null;
}

const n =
Number(raw);

return Number.isFinite(n)
? n
: null;

}catch{
return undefined;
}

}

function writeCachedTelegramChatId(
userId,
chatId
){

if(!userId){
return;
}

try{

if(
chatId == null ||
chatId === ""
){
localStorage.setItem(
TELEGRAM_CHAT_CACHE_PREFIX +
String(userId),
"none"
);
return;
}

localStorage.setItem(
TELEGRAM_CHAT_CACHE_PREFIX +
String(userId),
String(chatId)
);

}catch{
/* ignore */
}

}

async function resolveUserRestAuth(){

const sync =
readAlertTokenSync();

if(
sync?.token &&
sync?.user?.id
){
return {
token: sync.token,
userId: sync.user.id
};
}

const auth =
await resolveAlertAuthFast();

if(
auth?.token &&
auth?.ctx?.user?.id
){
return {
token: auth.token,
userId: auth.ctx.user.id
};
}

try{

const ctx =
await withTimeout(
waitForCloudAuth(8000),
9000,
"waitForCloudAuth telegram"
);

if(!ctx?.user?.id){
return null;
}

const token =
readAlertTokenSync()?.token ||
await withTimeout(
getAccessTokenForUser(ctx),
6000,
"getSession telegram"
);

if(!token){
return null;
}

setAlertAuthCache(
ctx,
token
);

return {
token,
userId: ctx.user.id
};

}catch(err){
console.warn(
"[telegram] auth:",
err?.message || err
);
return null;

}

}

async function getSupabaseHttpConfig(){

const env =
await import("./supabase-env.js?v=4");

const base =
String(env.SUPABASE_URL || "").replace(/\/$/, "");

const anon =
env.SUPABASE_ANON_KEY;

if(
!base ||
!anon
){
return null;
}

return {
base,
anon
};

}

async function loadTelegramChatIdViaRest(
auth
){

const http =
await getSupabaseHttpConfig();

if(
!http ||
!auth
){
return undefined;
}

const url =
`${http.base}/rest/v1/user_settings` +
`?user_id=eq.${encodeURIComponent(auth.userId)}` +
`&select=telegram_chat_id`;

const res =
await fetchWithTimeout(
url,
{
method: "GET",
headers: {
apikey: http.anon,
Authorization: `Bearer ${auth.token}`,
Accept: "application/json"
}
},
10000
);

if(!res.ok){
const text =
await res.text().catch(()=>"");
throw new Error(
text.slice(0, 120) ||
`Ошибка загрузки (${res.status})`
);
}

const rows =
await res.json();

const id =
Array.isArray(rows)
? rows[0]?.telegram_chat_id
: null;

if(id == null){
return null;
}

const parsed =
Number(id);

return Number.isFinite(parsed)
? parsed
: null;

}

async function saveTelegramChatIdViaRest(
auth,
parsed
){

const http =
await getSupabaseHttpConfig();

if(
!http ||
!auth
){
throw new Error(
"Нет доступа к облаку"
);
}

const uidQ =
encodeURIComponent(auth.userId);

const checkUrl =
`${http.base}/rest/v1/user_settings` +
`?user_id=eq.${uidQ}&select=user_id`;

const checkRes =
await fetchWithTimeout(
checkUrl,
{
method: "GET",
headers: {
apikey: http.anon,
Authorization: `Bearer ${auth.token}`,
Accept: "application/json"
}
},
10000
);

if(!checkRes.ok){
const text =
await checkRes.text().catch(()=>"");
throw new Error(
text.slice(0, 120) ||
`Ошибка проверки (${checkRes.status})`
);
}

const existing =
await checkRes.json();

const hasRow =
Array.isArray(existing) &&
existing.length > 0;

const headers = {
apikey: http.anon,
Authorization: `Bearer ${auth.token}`,
"Content-Type": "application/json",
Prefer: "return=minimal"
};

let res;

if(hasRow){

res =
await fetchWithTimeout(
`${http.base}/rest/v1/user_settings?user_id=eq.${uidQ}`,
{
method: "PATCH",
headers,
body: JSON.stringify({
telegram_chat_id: parsed
})
},
10000
);

}else{

res =
await fetchWithTimeout(
`${http.base}/rest/v1/user_settings`,
{
method: "POST",
headers,
body: JSON.stringify({
user_id: auth.userId,
telegram_chat_id: parsed,
favorites: [],
drawings: {}
})
},
10000
);

}

if(!res.ok){
const text =
await res.text().catch(()=>"");
throw new Error(
text.slice(0, 160) ||
`Ошибка сохранения (${res.status})`
);
}

}

export async function getTelegramChatId(){

const auth =
await resolveUserRestAuth();

if(!auth){
return null;
}

try{

const parsed =
await withTimeout(
loadTelegramChatIdViaRest(auth),
12000,
"telegram load"
);

if(parsed === undefined){
return null;
}

writeCachedTelegramChatId(
auth.userId,
parsed
);

return parsed;

}catch(err){
console.warn(
"telegram chat load:",
err?.message || err
);
return null;

}

}

export async function saveTelegramChatId(chatId){

const auth =
await resolveUserRestAuth();

if(!auth){
throw new Error(
"Войдите в аккаунт для привязки Telegram"
);
}

const parsed =
chatId === "" || chatId == null
? null
: Number(chatId);

if(
parsed != null &&
(
!Number.isFinite(parsed) ||
!Number.isInteger(parsed)
)
){
throw new Error("Некорректный chat id");

}

await withTimeout(
saveTelegramChatIdViaRest(
auth,
parsed
),
15000,
"telegram save"
);

writeCachedTelegramChatId(
auth.userId,
parsed
);

return parsed;

}

/** Сброс chat id — пользователь больше не получает алерты в Telegram. */
export async function clearTelegramChatId(){

return saveTelegramChatId(null);

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

function withTimeout(
promise,
ms,
label
){

return Promise.race([
promise,
new Promise((_, reject)=>{
setTimeout(()=>{
reject(
new Error(
`${label} timeout (${ms}ms)`
)
);
}, ms);
})
]);

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
await import("./supabase-env.js?v=4");

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
triggered_at: null
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
await import("./alerts.js?v=79");

markAlertCloudId(
symbol,
shapeId,
cloudId
);
}

console.log(
"alert cloud push ok (REST):",
symbol,
shapeId,
cloudId || ""
);

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
triggered_at: null
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

console.log(
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

console.log(
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

async function deleteAllActiveAlertsFallback(
ctx,
token
){

if(
!ctx?.user?.id ||
!token
){
return false;
}

const { data, error } =
await ctx.sb
.from("price_alerts")
.select("id")
.eq("user_id", ctx.user.id)
.is("triggered_at", null);

if(error){
console.warn(
"[alerts] clear all list:",
error.message
);
return false;
}

const rows =
data || [];

if(!rows.length){
return true;
}

let ok =
true;

for(const row of rows){

const id =
String(row.id || "").trim();

if(!id){
continue;
}

const one =
await purgeAlertViaRest({
id,
ctx,
token
});

if(!one){
ok = false;
}

}

return ok;

}

export async function clearAllAlertsFromCloud(){

const snap =
readAlertTokenSync();

if(
!snap?.token ||
!snap?.user?.id
){
console.warn(
"[alerts] clear all: нет токена — только локально"
);
return null;
}

const ctx =
snap.ctx?.sb
? snap.ctx
: {
sb: null,
user: snap.user
};

let ok =
await purgeAlertViaRest({
all: true,
ctx,
token: snap.token
});

if(!ok){
console.warn(
"[alerts] clear all REST batch failed — по одной строке…"
);
ok =
await deleteAllActiveAlertsFallback(
ctx,
token
);
}

if(ok){
lastSeenCloudAlerts.clear();
console.log(
"[alerts] облако: удалены все активные алерты"
);
}

return ok;

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
await import("./alerts.js?v=79");

const ok =
await clearAllAlertsFromCloud();

if(
!opts.skipReconcile
){
await reconcileLocalRegistryWithCloud();
}

stripAlertFlagsNotInRegistry();

pauseRegistryCloudSync(0);

return ok;

}

export async function removeAlertFromCloud(
symbol,
shapeId,
cloudId = null
){

const sym =
String(symbol || "").trim().toUpperCase();
const sid =
String(shapeId || "").trim();
const cid =
String(
cloudId ||
""
).trim();

if(
!sym ||
!sid
){
return false;
}

let ok =
false;

if(
cid
){
ok =
await purgeAlertViaRest({
id: cid
});
}

if(
!ok
){
ok =
await purgeAlertViaRest({
symbol: sym,
shapeId: sid
});
}

if(!ok){
console.warn(
"alert cloud delete:",
sym,
sid,
cid || ""
);
return false;
}

broadcastAlertsRegistrySync();

return ok;

}

let cachedWorkerBaseUrl = null;
let workerUrlNormalizeWarned = false;

async function getAlertWorkerBaseUrl(){

if(
cachedWorkerBaseUrl !== null
){
return cachedWorkerBaseUrl;
}

try{
const env =
await import("./supabase-env.js?v=5");

const raw =
String(
env.ALERT_WORKER_URL || ""
).trim();

const base =
normalizeAlertWorkerBaseUrl(raw);

if(
raw &&
base &&
raw !== base &&
!workerUrlNormalizeWarned
){
workerUrlNormalizeWarned = true;
console.warn(
"[alerts] ALERT_WORKER_URL исправлен:",
raw,
"→",
base,
"(в Vercel задайте полный URL с https://, без /alerts)"
);
}

cachedWorkerBaseUrl = base;
return base;

}catch{
cachedWorkerBaseUrl = "";
return "";

}

}

/**
 * POST /trigger по uuid строки (надёжнее, чем symbol+shape_id).
 */
export async function triggerAlertViaWorkerById(
alertId,
payload = {},
authToken = null
){

const base =
await getAlertWorkerBaseUrl();

if(
!base ||
!alertId
){
return {
ok: false,
reason: "no_worker_or_id"
};
}

let token =
authToken;

if(!token){
const auth =
await getWorkerRequestAuth();

if(!auth){
return {
ok: false,
reason: "no_auth"
};
}

token = auth.token;

}

const sym =
String(payload.symbol || "").trim().toUpperCase();
const sid =
String(payload.shape_id || payload.shapeId || "").trim();
const price =
Number(payload.price);
const tf =
payload.tf != null
? String(payload.tf)
: undefined;

const reqBody = {
alert_id: String(alertId)
};

if(sym){
reqBody.symbol = sym;
}

if(sid){
reqBody.shape_id = sid;
}

if(Number.isFinite(price)){
reqBody.price = price;
}

if(tf != null){
reqBody.tf = tf;
}

let res;

try{
res =
await fetchWithTimeout(
`${base}/trigger`,
{
method: "POST",
headers: {
"Content-Type": "application/json",
Authorization: `Bearer ${token}`
},
body: JSON.stringify(reqBody)
},
12000
);
}catch(err){
console.warn(
"worker /trigger id:",
err?.message || err
);
return {
ok: false,
reason: "network_error"
};
}

const text =
await res.text();

let parsed = {};

try{
parsed =
text
? JSON.parse(text)
: {};
}catch{
parsed = { raw: text };
}

if(!res.ok){
console.warn(
"worker /trigger id:",
res.status,
text.slice(0, 240)
);
return {
ok: false,
reason: "http_error",
status: res.status,
body: parsed
};
}

return parsed;

}

async function resolveCloudAlertId(
sym,
sid,
cloudId,
ctxIn
){

const fromLocal =
String(cloudId || "").trim();

if(fromLocal){
return fromLocal;
}

const ctx =
ctxIn ||
await withTimeout(
getAuthed(),
8000,
"getAuthed resolve"
).catch(()=>null);

if(!ctx){
return "";
}

const { data, error } =
await ctx.sb
.from("price_alerts")
.select("id")
.eq("user_id", ctx.user.id)
.eq("symbol", sym)
.eq("shape_id", sid)
.maybeSingle();

if(error){
console.warn(
"[alerts] resolve cloud id:",
error.message
);
return "";
}

return data?.id
? String(data.id)
: "";

}

async function getAccessTokenForUser(
ctx
){

const cached =
readAlertTokenSync()?.token;

if(
cached
){
return cached;
}

if(
!ctx?.sb
){
return null;
}

try{
const { data } =
await withTimeout(
ctx.sb.auth.getSession(),
4000,
"getSession"
);

return data?.session?.access_token || null;

}catch(err){
console.warn(
"[alerts] getSession:",
err?.message || err
);
return null;

}

}

/**
 * DELETE через PostgREST (не зависает, в отличие от sb.from().delete()).
 */
async function purgeAlertViaRest(
opts
){

const all =
!!opts?.all;
const id =
String(opts?.id || "").trim();
const sym =
String(opts?.symbol || "").trim().toUpperCase();
const sid =
String(opts?.shapeId || "").trim();
let ctx =
opts?.ctx || null;
let token =
opts?.token || null;

if(!token){
const snap =
readAlertTokenSync();

token =
snap?.token || null;

if(
!ctx &&
snap?.user
){
ctx = {
sb: null,
user: snap.user
};
}

}

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

if(
!ctx?.user?.id &&
persisted?.user
){
ctx = {
sb: ctx?.sb || null,
user: persisted.user
};
}
}

}

if(
!ctx?.user?.id
){
try{
ctx =
await withTimeout(
getAuthed(),
8000,
"getAuthed purge"
);
}catch{
ctx = null;
}
}else if(
!ctx.sb
){
try{
const full =
await withTimeout(
getAuthed(),
8000,
"getAuthed purge sb"
);

if(full){
ctx = full;
}
}catch{
/* keep partial ctx */
}
}

if(
!ctx?.user?.id
){
console.warn(
"[alerts] purge: нет сессии"
);
return false;
}

if(!token){
token =
readAlertTokenSync()?.token ||
null;
}

if(
!token
){
try{
token =
await getAccessTokenForUser(ctx);
}catch{
token = null;
}
}

if(!token){
console.warn(
"[alerts] purge: нет токена"
);
return false;
}

let env;

try{
env =
await import("./supabase-env.js?v=4");
}catch{
return false;
}

const base =
String(env.SUPABASE_URL || "").replace(/\/$/, "");
const anon =
env.SUPABASE_ANON_KEY;

if(
!base ||
!anon
){
return false;
}

let path =
"";

if(all){
path =
`price_alerts?user_id=eq.${encodeURIComponent(ctx.user.id)}`;
}else if(id){
path =
`price_alerts?id=eq.${encodeURIComponent(id)}` +
`&user_id=eq.${encodeURIComponent(ctx.user.id)}`;
}else if(
sym &&
sid
){
path =
`price_alerts?user_id=eq.${encodeURIComponent(ctx.user.id)}` +
`&symbol=eq.${encodeURIComponent(sym)}` +
`&shape_id=eq.${encodeURIComponent(sid)}`;
}else{
return false;
}

try{
const res =
await fetchWithTimeout(
`${base}/rest/v1/${path}`,
{
method: "DELETE",
headers: {
apikey: anon,
Authorization: `Bearer ${token}`,
Prefer: "return=minimal"
}
},
10000
);

if(!res.ok){
const text =
await res.text();
console.warn(
"[alerts] purge REST:",
res.status,
text.slice(0, 200)
);
return false;
}

console.log(
"[alerts] purge REST ok:",
all
? "all active"
: (id || `${sym} ${sid}`)
);
return true;

}catch(err){
console.warn(
"[alerts] purge REST:",
err?.message || err
);
return false;

}

}

export async function purgeAlertRowByCloudId(
cloudId
){

const id =
String(cloudId || "").trim();

if(!id){
return false;
}

return purgeAlertViaRest({
id
});

}

/**
 * Срабатывание: очередь (2-й алерт не ломает auth 1-го) → worker (Telegram+delete) → purge fallback.
 */
export function fireAlertCloudTrigger(
symbol,
shapeId,
cloudId,
meta = {}
){

return enqueueAlertTrigger(()=>
fireAlertCloudTriggerImpl(
symbol,
shapeId,
cloudId,
meta
)
);

}

async function fireAlertCloudTriggerImpl(
symbol,
shapeId,
cloudId,
meta = {}
){

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

let token =
String(meta?.authToken || "").trim() ||
null;
let ctx =
null;

const syncAuth =
readAlertTokenSync();

if(!token && syncAuth?.token){
token = syncAuth.token;
ctx = syncAuth.ctx || null;
}

if(!token){
const auth =
await resolveAlertAuthFast();

token =
auth?.token || null;
ctx =
auth?.ctx || ctx;
}

if(
!token
){
const workerAuth =
await getWorkerRequestAuth();

token =
workerAuth?.token || null;
ctx =
workerAuth?.ctx || ctx;
}

if(!token){
const hasAuthStorage =
typeof localStorage !== "undefined" &&
!!localStorage.getItem(
SUPABASE_AUTH_STORAGE_KEY
);

console.warn(
"[alerts] trigger: нет JWT — шестерёнка → войти заново",
sym,
sid,
hasAuthStorage
? `(${SUPABASE_AUTH_STORAGE_KEY} есть, токен не прочитан)`
: `(нет ${SUPABASE_AUTH_STORAGE_KEY} — войдите)`
);
}else if(!getCachedAlertAuth()?.token){
const user =
ctx?.user ||
syncAuth?.user;

if(user){
setAlertAuthCache(
ctx || { sb: null, user },
token
);
}
}

const id =
await resolveCloudAlertId(
sym,
sid,
cloudId,
ctx
);

const price =
Number(meta?.price);
const tf =
meta?.tf != null
? normalizeAlertTf(meta.tf)
: undefined;

console.log(
"[alerts] cloud →",
sym,
sid,
id || "(по shape_id)"
);

const triggerPayload = {
symbol: sym,
shape_id: sid,
price: Number.isFinite(price)
? price
: undefined,
tf
};

let remote = {
ok: false,
reason: "no_auth"
};

if(token){
console.log(
"[alerts] → worker /trigger…",
sym,
sid
);

try{
if(id){
remote =
await withTimeout(
triggerAlertViaWorkerById(
id,
triggerPayload,
token
),
15000,
"worker /trigger"
);
}else{
remote =
await withTimeout(
triggerAlertViaWorker(
sym,
sid,
triggerPayload,
token
),
15000,
"worker /trigger"
);
}
}catch(err){
console.warn(
"[alerts] worker /trigger:",
err?.message || err
);
remote = {
ok: false,
reason: "timeout"
};
}
}

console.log(
"[alerts] worker:",
sym,
sid,
remote?.ok,
remote?.telegram,
remote?.reason ||
remote?.skipped ||
""
);

if(
token &&
Number.isFinite(price) &&
(
remote?.skipped === "already_handled" ||
(
remote?.ok &&
!remote?.telegram &&
remote?.reason !== "no_chat" &&
remote?.reason !== "no_auth"
)
)
){
const notify =
await triggerNotifyTelegramViaWorker(
sym,
sid,
{
price,
tf
},
token
);

if(
notify?.telegram
){
remote = {
...remote,
telegram: true
};
}

}

if(
remote?.ok &&
!remote?.telegram &&
remote?.reason !== "no_chat"
){
console.warn(
"[alerts] Telegram не ушёл — chat id на «Алерты» и TELEGRAM_BOT_TOKEN на Railway."
);
}

let stillInCloud =
false;

if(token){
try{
stillInCloud =
await withTimeout(
isAlertRowInCloudFast(
sym,
sid,
{
token,
userId:
ctx?.user?.id ||
syncAuth?.user?.id
}
),
4000,
"row check"
);
}catch{
stillInCloud = true;
}
}

if(
stillInCloud &&
token
){
console.log(
"[alerts] дочистка строки (браузер)…",
sym,
sid
);

const purged =
await purgeAlertViaRest({
ctx,
token,
id,
symbol: sym,
shapeId: sid
});

if(purged){
console.log(
"[alerts] ✓ Supabase удалено (браузер):",
sym,
sid
);
stillInCloud = false;
}else{
console.warn(
"[alerts] purge не удался:",
sym,
sid
);
}
}else if(
!stillInCloud &&
(
remote?.ok ||
remote?.telegram
)
){
console.log(
"[alerts] ✓ строка в Supabase снята",
sym,
sid
);
}

if(
stillInCloud &&
!remote?.ok
){
console.error(
"[alerts] строка осталась в Supabase:",
sym,
sid,
id || "",
remote?.reason || "no_auth"
);
}else if(
stillInCloud &&
!token
){
console.error(
"[alerts] строка осталась (нет JWT для purge):",
sym,
sid,
id || ""
);
}

return (
remote?.ok ||
!!remote?.telegram ||
!stillInCloud
);

}

/**
 * Срабатывание из браузера: Telegram + удаление строки через Railway (service role).
 */
export async function triggerAlertViaWorker(
symbol,
shapeId,
payload = {},
authToken = null
){

const base =
await getAlertWorkerBaseUrl();

if(!base){
console.warn(
"Telegram: задайте ALERT_WORKER_URL в js/supabase-env.js (URL Railway alert-worker) и обновите страницу."
);
return {
ok: false,
reason: "no_worker_url"
};
}

let token =
authToken;

if(!token){
const auth =
await getWorkerRequestAuth();

if(!auth){
return {
ok: false,
reason: "no_auth"
};
}

token = auth.token;

}

const sym =
String(symbol || "").trim().toUpperCase();
const sid =
String(shapeId || "").trim();
const price =
Number(payload.price);

const reqBody = {
symbol: sym,
shape_id: sid
};

if(Number.isFinite(price)){
reqBody.price = price;
}

if(payload.tf != null){
reqBody.tf = String(payload.tf);
}

let res;

try{
res =
await fetchWithTimeout(
`${base}/trigger`,
{
method: "POST",
headers: {
"Content-Type": "application/json",
Authorization: `Bearer ${token}`
},
body: JSON.stringify(reqBody)
},
12000
);
}catch(err){
console.warn(
"worker /trigger:",
err?.message || err
);
return {
ok: false,
reason: "network_error"
};
}

const text =
await res.text();

let parsed = {};

try{
parsed =
text
? JSON.parse(text)
: {};
}catch{
parsed = { raw: text };
}

if(!res.ok){
console.warn(
"worker /trigger:",
res.status,
text.slice(0, 240)
);
return {
ok: false,
reason: "http_error",
status: res.status,
body: parsed
};
}

return parsed;

}

/**
 * POST /notify-telegram — строка уже снята worker'ом, дослать сообщение.
 */
export async function triggerNotifyTelegramViaWorker(
symbol,
shapeId,
payload = {},
authToken = null
){

const base =
await getAlertWorkerBaseUrl();

if(!base){
return {
ok: false,
reason: "no_worker_url"
};
}

let token =
authToken;

if(!token){
const auth =
await getWorkerRequestAuth();

if(!auth){
return {
ok: false,
reason: "no_auth"
};
}

token = auth.token;

}

const sym =
String(symbol || "").trim().toUpperCase();
const sid =
String(shapeId || "").trim();
const price =
Number(payload.price);

if(
!sym ||
!sid ||
!Number.isFinite(price)
){
return {
ok: false,
reason: "bad_body"
};
}

const reqBody = {
symbol: sym,
shape_id: sid,
price
};

if(payload.tf != null){
reqBody.tf = String(payload.tf);
}

let res;

try{
res =
await fetchWithTimeout(
`${base}/notify-telegram`,
{
method: "POST",
headers: {
"Content-Type": "application/json",
Authorization: `Bearer ${token}`
},
body: JSON.stringify(reqBody)
},
12000
);
}catch(err){
console.warn(
"worker /notify-telegram:",
err?.message || err
);
return {
ok: false,
reason: "network_error"
};
}

const text =
await res.text();

let parsed = {};

try{
parsed =
text
? JSON.parse(text)
: {};
}catch{
parsed = { raw: text };
}

if(!res.ok){
console.warn(
"worker /notify-telegram:",
res.status,
text.slice(0, 240)
);
return {
ok: false,
reason: "http_error",
body: parsed
};
}

return parsed;

}

/** Проверка строки через REST (без getSession). */
async function isAlertRowInCloudFast(
symbol,
shapeId,
opts = {}
){

const sym =
String(symbol || "").trim().toUpperCase();
const sid =
String(shapeId || "").trim();
const token =
String(opts?.token || "").trim();
const userId =
String(opts?.userId || "").trim();

if(
token &&
userId
){

let env;

try{
env =
await import("./supabase-env.js?v=4");
}catch{
return false;
}

const base =
String(env.SUPABASE_URL || "").trim();

if(!base){
return false;
}

const url =
`${base}/rest/v1/price_alerts?` +
`user_id=eq.${encodeURIComponent(userId)}` +
`&symbol=eq.${encodeURIComponent(sym)}` +
`&shape_id=eq.${encodeURIComponent(sid)}` +
`&select=id&limit=1`;

try{
const res =
await fetchWithTimeout(
url,
{
method: "GET",
headers: {
apikey: env.SUPABASE_ANON_KEY,
Authorization: `Bearer ${token}`,
Accept: "application/json"
}
},
5000
);

if(!res.ok){
return false;
}

const rows =
await res.json();
return Array.isArray(rows) && rows.length > 0;

}catch{
return false;
}

}

return isAlertRowInCloud(
symbol,
shapeId
);

}

export async function isAlertRowInCloud(
symbol,
shapeId
){

const ctx =
await getAuthed();

if(!ctx){
return false;
}

const sym =
String(symbol || "").trim().toUpperCase();
const sid =
String(shapeId || "").trim();

const { data, error } =
await ctx.sb
.from("price_alerts")
.select("id, triggered_at")
.eq("user_id", ctx.user.id)
.eq("symbol", sym)
.eq("shape_id", sid)
.maybeSingle();

if(error){
return false;
}

return !!data?.id;

}

/**
 * Запись алерта через Railway (service role) — надёжнее браузерного upsert.
 */
export async function pushAlertViaWorker(
entry
){

const base =
await getAlertWorkerBaseUrl();

if(!base){
console.warn(
"worker /push-alert: нет ALERT_WORKER_URL в js/supabase-env.js"
);
return false;
}

const auth =
await getWorkerRequestAuth();

if(!auth){
console.warn(
"worker /push-alert: нет сессии — войдите через шестерёнку в шапке"
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

let res;

try{
res =
await fetchWithTimeout(
`${base}/push-alert`,
{
method: "POST",
headers: {
"Content-Type": "application/json",
Authorization: `Bearer ${auth.token}`
},
body: JSON.stringify({
symbol,
shape_id: shapeId,
price,
tf: normalizeAlertTf(entry?.tf)
})
},
12000
);
}catch(err){
console.warn(
"worker /push-alert:",
err?.message || err
);
return false;
}

const text =
await res.text();

let body = {};

try{
body =
text
? JSON.parse(text)
: {};
}catch{
body = { raw: text };
}

if(
!res.ok ||
!body.ok
){
console.error(
"[alerts] worker /push-alert ОТКЛОНЁН:",
res.status,
symbol,
shapeId,
text.slice(0, 400)
);
return false;
}

const cloudId =
body?.id ||
null;

if(cloudId){
const { markAlertCloudId } =
await import("./alerts.js?v=79");

markAlertCloudId(
symbol,
shapeId,
cloudId
);
}

console.log(
"alert cloud push ok (worker):",
symbol,
shapeId,
cloudId || ""
);

return true;

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
await import("./alerts.js?v=79");

const localKeys =
new Set(
getActiveAlerts().map(localAlertKey)
);

const { data: cloudRows, error } =
await ctx.sb
.from("price_alerts")
.select("id, symbol, shape_id")
.eq("user_id", ctx.user.id)
.is("triggered_at", null);

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
console.log(
"alert cloud prune:",
row.symbol,
row.shape_id
);
}

}

if(removed){
console.log(
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
await import("./auth-ui.js?v=23");

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
await import("./alerts.js?v=79");

/* Worker пишет service role — не ждём SELECT по JWT пользователя */
markAlertCloudSynced(
row.symbol,
row.shapeId
);

console.log(
"[alerts] ✓ Supabase (worker):",
row.symbol,
row.shapeId
);

broadcastAlertsRegistrySync();

return true;

}

if(
ctx &&
await pushAlertViaRest(
row,
ctx
)
){

const { loadAlerts, markAlertCloudSynced } =
await import("./alerts.js?v=79");

const hasId =
loadAlerts().some(
a=>
a.symbol === row.symbol &&
a.shapeId === row.shapeId &&
a.cloudId
);

if(
hasId ||
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

console.log(
"[alerts] ✓ Supabase (REST):",
row.symbol,
row.shapeId
);

broadcastAlertsRegistrySync();

return true;

}

console.warn(
"[alerts] REST ответил ok, но строка не видна — повтор…",
row.symbol,
row.shapeId
);

}

if(
await pushAlertToCloudImpl(row)
){

if(
ctx &&
await markRowSyncedAfterVerify(
ctx,
row.symbol,
row.shapeId,
null
)
){

const { markAlertCloudSynced } =
await import("./alerts.js?v=79");

markAlertCloudSynced(
row.symbol,
row.shapeId
);

console.log(
"[alerts] ✓ Supabase (sdk):",
row.symbol,
row.shapeId
);

broadcastAlertsRegistrySync();

return true;

}

}

console.warn(
"[alerts] ОШИБКА ЗАПИСИ в Supabase, попытка",
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
export async function pushUnsyncedAlerts(){

if(
!isCloudLoggedIn() ||
isRegistryCloudSyncPaused()
){
return 0;
}

const { getActiveAlerts, countAlertsOnChart } =
await import("./alerts.js?v=79");

const onChart =
countAlertsOnChart();

const pending =
getActiveAlerts().filter(a=>!a.cloudSynced);

if(!pending.length){

if(onChart > 0){
console.warn(
"[alerts] на графике",
onChart,
", но все помечены cloudSynced — снимите и снова поставьте алерт или обновите страницу"
);
}

return 0;

}

console.log(
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

console.log(
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

console.log(
"[alerts] дозапись готова:",
ok,
"/",
pending.length
);

return ok;

}

async function syncAllLocalAlertsToCloudImpl(){

const { ensureCloudReady } =
await import("./auth-ui.js?v=23");

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
await import("./alerts.js?v=79");

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

console.log(
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
await import("./supabase-env.js?v=4");
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
`&select=id,symbol,shape_id,price,tf,created_at`;

try{
const res =
await fetchWithTimeout(
url,
{
method: "GET",
headers: {
apikey: anon,
Authorization: `Bearer ${auth.token}`,
Accept: "application/json"
}
},
15000,
"price_alerts fetch"
);

if(
!res.ok
){
console.warn(
"[alerts] fetch REST:",
res.status,
(
await res.text()
).slice(
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

if(
Date.now() <
alertsRestStressUntil
){
return 0;
}

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
"price_alerts select"
);
}catch(
err
){
console.warn(
"alert cloud reconcile:",
err?.message || err
);
return 0;
}

if(
result.error
){
console.warn(
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
loadAlerts,
normalizeAlertTf,
isAlertDeleted,
forgetAlertDeleted
} =
await import("./alerts.js?v=79");

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

const { applyRemoteAlertFired } =
await import("./alerts.js?v=79");

for(const row of removedRows){

applyRemoteAlertFired(row);

}

}

const local =
loadAlerts();
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

next.push({
id: sid,
shapeId: sid,
symbol: sym,
price:
Number.isFinite(cloudPrice)
? cloudPrice
: prevPrice,
tf: normalizeAlertTf(
cloud.tf ||
prev?.tf
),
createdAt:
prev?.createdAt ||
(Date.parse(cloud.created_at) || Date.now()),
cloudId: String(cloud.id || ""),
cloudSynced: true,
priceUpdatedAt:
Date.parse(
cloud.created_at
) ||
prev?.priceUpdatedAt ||
Date.now()
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
next.push(a);
seen.add(key);
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
console.log(
"[alerts] reconcile: в облаке",
cloudByKey.size,
"| реестр",
next.length
);
}

return next.length;

}

export async function pullRegistryFromCloud(){

return runCloudOp(async()=>{

const n =
await reconcileLocalRegistryWithCloud();

const { stripAlertFlagsNotInRegistry } =
await import("./alerts.js?v=79");

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
isRegistryCloudSyncPaused()
){
return 0;
}

try{
const { ensureCloudLoginResolved } =
await import("./cloud-sync.js?v=25");

await ensureCloudLoginResolved(
8000
);
}catch{
/* ignore */
}

const immediate =
opts.immediate ===
true;

const n =
immediate
? await reconcileLocalRegistryWithCloud()
: await coalesceRegistryPull(
()=>reconcileLocalRegistryWithCloud()
);

if(
n >
0
){
window.dispatchEvent(
new CustomEvent(
"alerts-registry-pulled"
)
);
}

return n;

}

async function hydrateAlertsAfterAuth(){

if(
hydrateAlertsInflight
){
return hydrateAlertsInflight;
}

const now =
Date.now();

if(
now -
lastHydrateAlertsMs <
(
isAlertsPage()
? 8000
: 4000
)
){
return 0;
}

hydrateAlertsInflight =
runCloudOp(
async()=>{

console.log(
"[alerts] hydrate after login…"
);

const stripOpts =
isAlertsPage()
? {
registryOnlySymbols: true,
emitDrawingsEvents: false
}
: {};

if(
!isAlertsPage()
){
const { mergeRegistryFromChartDrawings } =
await import("./alerts.js?v=79");

mergeRegistryFromChartDrawings({
stripFlags: stripOpts
});
}

await pushUnsyncedAlerts();
await pullRegistryFromCloudNow();

const { stripAlertFlagsNotInRegistry } =
await import("./alerts.js?v=79");

stripAlertFlagsNotInRegistry(
stripOpts
);

if(
!isAlertsPage()
){
await refreshCloudAlertModeImpl();
}

lastHydrateAlertsMs =
Date.now();

}
).finally(
()=>{

hydrateAlertsInflight =
null;

}
);

return hydrateAlertsInflight;

}

export async function syncAlertsWithCloud(){

return syncAllLocalAlertsToCloud();

}

export function scheduleRegistryCloudSync(){

if(registrySyncTimer){
clearTimeout(registrySyncTimer);
}

registrySyncTimer = setTimeout(()=>{
registrySyncTimer = null;

if(
!isCloudLoggedIn() ||
isRegistryCloudSyncPaused()
){
return;
}

void pushUnsyncedAlerts()
.then(
()=>pullRegistryFromCloudNow()
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

let alertsCloudSyncReady = false;

export function initAlertsCloudSync(){

if(alertsCloudSyncReady){
return;
}

alertsCloudSyncReady = true;

window.addEventListener(
"alerts-changed",
()=>{
scheduleRegistryCloudSync();
scheduleRemoteRegistrySync();
}
);

window.addEventListener(
"price-alerts-changed",
()=>{
scheduleRegistryCloudSync();
scheduleRemoteRegistrySync();
}
);

onCloudSyncChange(
()=>{

void refreshCloudAlertMode();

if(
isCloudLoggedIn() &&
!isAlertsPage()
){
void hydrateAlertsAfterAuth().catch(
err=>{
console.warn(
"alert cloud hydrate:",
err?.message || err
);
}
);
}else if(
!isCloudLoggedIn()
){
clearAlertAuthCache();
void teardownAlertsRealtime();
stopReconcileTimer();
}

}
);

void refreshCloudAlertMode();

if(
isCloudLoggedIn() &&
!isAlertsPage()
){
void hydrateAlertsAfterAuth().catch(
err=>{
console.warn(
"alert cloud hydrate init:",
err?.message || err
);
}
);
}

const pullWhenVisible = ()=>{

if(
!isCloudLoggedInEffective()
){
return;
}

if(
document.visibilityState ===
"hidden"
){
void pushUnsyncedAlerts();
return;
}

pullRegistryFromCloudNow({
immediate: true
}).catch(err=>{
console.warn(
"alert cloud pull:",
err?.message || err
);
});

};

window.addEventListener(
"focus",
pullWhenVisible
);

const isMobileAlertsSync =
typeof navigator !==
"undefined" &&
/iPhone|iPad|iPod|Android/i.test(
navigator.userAgent ||
""
);

if(
isMobileAlertsSync
){

setInterval(
()=>{

if(
!isCloudLoggedInEffective() ||
document.visibilityState !==
"visible"
){
return;
}

void pullRegistryFromCloudNow({
immediate: true
}).catch(()=>{
/* ignore */
});

},
12000
);

}

document.addEventListener(
"visibilitychange",
pullWhenVisible
);

document.addEventListener(
"visibilitychange",
()=>{

if(
document.visibilityState !== "visible" ||
!isCloudLoggedIn()
){
return;
}

void refreshCloudAlertMode();

}
);

const retryPushWhenVisible = ()=>{

if(
document.visibilityState !== "visible" ||
!isCloudLoggedIn()
){
return;
}

void pushUnsyncedAlerts().catch(err=>{
console.warn(
"alert push on visible:",
err?.message || err
);
});

};

document.addEventListener(
"visibilitychange",
retryPushWhenVisible
);

window.addEventListener(
"focus",
retryPushWhenVisible
);

}
