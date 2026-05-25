import {
getSupabase,
isSupabaseConfigured
} from "./supabase-client.js?v=5";

import {
waitForCloudAuth
} from "./cloud-sync.js?v=12";

import {
isCloudLoggedIn,
onCloudSyncChange
} from "./cloud-sync.js?v=12";

import {
setBrowserCrossCheckEnabled
} from "./alerts-mode.js";

import {
getCachedAlertAuth,
setAlertAuthCache,
clearAlertAuthCache,
resolveAlertAuthFast
} from "./alert-auth-cache.js";

let alertsRealtimeChannel = null;

let alertsRealtimeUserId = null;

let reconcileTimer = null;

let registrySyncTimer = null;

const REGISTRY_SYNC_DEBOUNCE_MS = 400;

const RECONCILE_INTERVAL_MS = 4000;

const RECONCILE_MIN_AGE_MS = 5000;

let lastRemoteAlertMode = null;

async function updateBrowserCrossMode(){

const loggedIn =
isCloudLoggedIn();

let worker = "";

try{
const env =
await import("./supabase-env.js?v=4");
worker =
String(env.ALERT_WORKER_URL || "").trim();
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

async function handleAlertsRealtimeDelete(
oldRow
){

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

const {
applyRemoteAlertFired,
stripAlertFlagsNotInRegistry
} =
await import("./alerts.js?v=55");

if(
sym &&
sid &&
applyRemoteAlertFired(oldRow)
){
return;
}

await reconcileLocalRegistryWithCloud();
stripAlertFlagsNotInRegistry();

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
.channel(`price_alerts:${userId}`)
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

if(reconcileTimer){
clearInterval(reconcileTimer);
reconcileTimer = null;
}

}

function startReconcileTimer(){

stopReconcileTimer();

reconcileTimer = setInterval(()=>{

if(
!isCloudLoggedIn() ||
document.visibilityState !== "visible"
){
return;
}

reconcileLocalRegistryWithCloud().catch(err=>{
console.warn(
"alert reconcile:",
err?.message || err
);
});

},
RECONCILE_INTERVAL_MS);

}

async function refreshCloudAlertMode(){

const remote =
await updateBrowserCrossMode();

const ctx =
await getAuthed();

if(
remote &&
ctx?.user?.id
){
await setupAlertsRealtime(ctx.user.id);
startReconcileTimer();
}else{
await teardownAlertsRealtime();
stopReconcileTimer();
}

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

async function confirmRowActiveInCloud(
ctx,
symbol,
shapeId
){

if(
!ctx ||
!symbol ||
!shapeId
){
return false;
}

return verifyAlertActiveInCloud(
ctx,
symbol,
shapeId
);

}

async function markRowSyncedAfterVerify(
ctx,
symbol,
shapeId,
cloudId
){

const { markAlertCloudSynced, markAlertCloudId } =
await import("./alerts.js?v=55");

const ok =
await confirmRowActiveInCloud(
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

const hit =
getCachedAlertAuth();

if(hit?.ctx){
return hit.ctx;
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

async function getAuthedFresh(){

const ctx =
await waitForCloudAuth(12000);

if(!ctx){
return null;
}

try{
const { data, error } =
await withTimeout(
ctx.sb.auth.refreshSession(),
15000,
"auth refresh"
);

if(
!error &&
data?.session?.user
){
return {
sb: ctx.sb,
user: data.session.user
};
}

}catch(err){
/* push использует getAuthed() без refresh — таймаут refresh не блокирует запись */
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

const ctx =
await getAuthed();

if(!ctx){
return null;
}

const token =
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

export async function getTelegramChatId(){

const ctx = await getAuthed();

if(!ctx){
return null;
}

const { data, error } =
await ctx.sb
.from("user_settings")
.select("telegram_chat_id")
.eq("user_id", ctx.user.id)
.maybeSingle();

if(error){
console.warn("telegram chat load:", error.message);
return null;
}

const id = data?.telegram_chat_id;

return id != null ? Number(id) : null;

}

export async function saveTelegramChatId(chatId){

const ctx = await getAuthed();

if(!ctx){
throw new Error("Войдите в аккаунт для привязки Telegram");

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

const { data: row, error: readErr } =
await ctx.sb
.from("user_settings")
.select("user_id")
.eq("user_id", ctx.user.id)
.maybeSingle();

if(readErr){
throw new Error(readErr.message);
}

if(row){

const { error } =
await ctx.sb
.from("user_settings")
.update({ telegram_chat_id: parsed })
.eq("user_id", ctx.user.id);

if(error){
throw new Error(error.message);
}

}else{

const { error } =
await ctx.sb
.from("user_settings")
.insert({
user_id: ctx.user.id,
telegram_chat_id: parsed,
favorites: [],
drawings: {}
});

if(error){
throw new Error(error.message);
}

}

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
null;

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
await import("./alerts.js?v=55");

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

export async function clearAllAlertsFromCloud(){

const ctx = await getAuthed();

if(!ctx){
return;
}

const { error } =
await ctx.sb
.from("price_alerts")
.delete()
.eq("user_id", ctx.user.id);

if(error){
console.warn("alert cloud clear all:", error.message);
}

}

export async function removeAlertFromCloud(
symbol,
shapeId
){

const ctx = await getAuthed();

if(!ctx){
return;
}

const sym =
String(symbol || "").trim().toUpperCase();
const sid =
String(shapeId || "").trim();

if(!sym || !sid){
return;
}

const { error } =
await ctx.sb
.from("price_alerts")
.delete()
.eq("user_id", ctx.user.id)
.eq("symbol", sym)
.eq("shape_id", sid);

if(error){
console.warn("alert cloud delete:", error.message);
}

}

async function getAlertWorkerBaseUrl(){

try{
const env =
await import("./supabase-env.js?v=4");

const url =
String(
env.ALERT_WORKER_URL || ""
).trim();

return url.replace(/\/$/, "");

}catch{
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

if(!ctx){
return null;
}

try{
const { data } =
await withTimeout(
ctx.sb.auth.getSession(),
5000,
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

if(!ctx){
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
}

if(!ctx){
console.warn(
"[alerts] purge: нет сессии"
);
return false;
}

if(!token){
token =
await getAccessTokenForUser(ctx);
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

if(id){
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
id || `${sym} ${sid}`
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

let auth =
await resolveAlertAuthFast();

if(!auth?.token){
auth =
await resolveAlertAuthFast();
}

let ctx =
auth?.ctx || null;
let token =
auth?.token || null;

if(!token){
console.warn(
"[alerts] trigger: нет JWT — шестерёнка → войти заново",
sym,
sid
);
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

if(
ctx &&
token
){
try{
stillInCloud =
await withTimeout(
isAlertRowInCloud(
sym,
sid
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
}else if(!stillInCloud){
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

export async function isAlertRowActiveInCloud(
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
.select("id")
.eq("user_id", ctx.user.id)
.eq("symbol", sym)
.eq("shape_id", sid)
.is("triggered_at", null)
.maybeSingle();

if(error){
return false;
}

return !!data?.id;

}

/** Любая строка (в т.ч. «зависшая» с triggered_at). */
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

export async function purgeAlertRowFromCloud(
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
return false;
}

return purgeAlertViaRest({
symbol: sym,
shapeId: sid
});

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
await import("./alerts.js?v=55");

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

/** Пока false — не ловить пересечение (иначе Telegram не уйдёт). */
export function isCloudAlertGateEnabled(){

return isCloudLoggedIn();

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
await import("./alerts.js?v=55");

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

const { error: delErr } =
await ctx.sb
.from("price_alerts")
.delete()
.eq("id", row.id);

if(!delErr){
removed += 1;
console.log(
"alert cloud prune:",
row.symbol,
row.shape_id
);
}else{
console.warn(
"alert cloud prune:",
delErr.message
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
await import("./auth-ui.js?v=10");

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
await import("./alerts.js?v=55");

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
await import("./alerts.js?v=55");

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
await import("./alerts.js?v=55");

markAlertCloudSynced(
row.symbol,
row.shapeId
);

console.log(
"[alerts] ✓ Supabase (sdk):",
row.symbol,
row.shapeId
);

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

export function pushOneAlertRowQueued(
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

if(!isCloudLoggedIn()){
return 0;
}

const { mergeRegistryFromChartDrawings, getActiveAlerts } =
await import("./alerts.js?v=55");

const merged =
mergeRegistryFromChartDrawings();

if(merged > 0){
console.log(
"[alerts] реестр с графика:",
merged,
"алерт(ов)"
);
}

const pending =
getActiveAlerts().filter(a=>!a.cloudSynced);

if(!pending.length){
return 0;
}

console.log(
"[alerts] дозапись в Supabase:",
pending.length
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
await pushOneAlertRowImpl(
row,
{ retries: 4 }
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
await import("./auth-ui.js?v=10");

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
await import("./alerts.js?v=55");

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

export async function pushSingleAlertToCloud(
entry
){

try{

const { ensureCloudReady } =
await import("./auth-ui.js?v=10");

await ensureCloudReady();

const row =
normalizeAlertEntry(entry);

const ok =
await pushOneAlertRow(
row,
{ retries: 4 }
);

if(ok){
console.log(
"Облако: алерт в Supabase",
row.symbol,
row.shapeId
);
return true;
}

console.warn(
"Облако: не удалось записать алерт в Supabase",
row.symbol,
row.shapeId
);

return false;

}catch(err){
console.warn(
"pushSingleAlert:",
err?.message || err
);
return false;

}

}

/** Убирает из реестра только уже синхронизированные алерты, сработавшие в облаке. */
export async function reconcileLocalRegistryWithCloud(){

const ctx =
await getAuthed();

if(!ctx){
return 0;
}

const { data, error } =
await ctx.sb
.from("price_alerts")
.select("symbol, shape_id")
.eq("user_id", ctx.user.id)
.is("triggered_at", null);

if(error){
console.warn(
"alert cloud reconcile:",
error.message
);
return 0;
}

const {
saveAlertsFromCloudMerge,
alertEntryKey,
loadAlerts
} =
await import("./alerts.js?v=55");

const cloudKeys =
new Set(
(data || []).map(row=>
alertEntryKey(
String(row.symbol || "").trim().toUpperCase(),
String(row.shape_id || "").trim()
)
)
);

const {
applyRemoteAlertFired
} =
await import("./alerts.js?v=55");

const local =
loadAlerts();

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
alertEntryKey(sym, sid);

if(cloudKeys.has(key)){
continue;
}

const age =
Date.now() - (
Number(a.createdAt) || 0
);

if(
!a.cloudSynced &&
age < RECONCILE_MIN_AGE_MS
){
continue;
}

applyRemoteAlertFired({
symbol: sym,
shape_id: sid,
price: a.price,
tf: a.tf
});

}

const after =
loadAlerts();

const next =
after.filter(a=>{

const sym =
String(a.symbol || "").trim().toUpperCase();
const sid =
String(a.shapeId || a.id || "").trim();

if(
!sym ||
!sid
){
return false;
}

if(!a.cloudSynced){
return true;
}

return cloudKeys.has(
alertEntryKey(sym, sid)
);

});

if(next.length !== after.length){
saveAlertsFromCloudMerge(next);
}

return next.length;

}

export async function pullRegistryFromCloud(){

return runCloudOp(async()=>{

const n =
await reconcileLocalRegistryWithCloud();

const { stripAlertFlagsNotInRegistry } =
await import("./alerts.js?v=55");

stripAlertFlagsNotInRegistry();

return n;

});

}

async function hydrateAlertsAfterAuth(){

const { stripAlertFlagsNotInRegistry } =
await import("./alerts.js?v=55");

console.log(
"[alerts] hydrate after login…"
);

const { mergeRegistryFromChartDrawings } =
await import("./alerts.js?v=55");

const merged =
mergeRegistryFromChartDrawings();

if(merged > 0){
console.log(
"[alerts] hydrate: с графика +",
merged
);
}

await syncAllLocalAlertsToCloudImpl();
await reconcileLocalRegistryWithCloud();
stripAlertFlagsNotInRegistry();
await refreshCloudAlertMode();

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

if(!isCloudLoggedIn()){
return;
}

void import("./alerts.js?v=55").then(m=>{
m.mergeRegistryFromChartDrawings();
}).catch(()=>{});

void pushUnsyncedAlerts().catch(err=>{
console.warn(
"alert push unsynced:",
err?.message || err
);
});

void syncAllLocalAlertsToCloudImpl().catch(err=>{
console.warn(
"alert registry sync:",
err?.message || err
);
});

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
}
);

onCloudSyncChange(()=>{

void refreshCloudAlertMode();

if(isCloudLoggedIn()){
runCloudOp(()=>
hydrateAlertsAfterAuth()
).catch(err=>{
console.warn(
"alert cloud hydrate:",
err?.message || err
);
});
}else{
clearAlertAuthCache();
void teardownAlertsRealtime();
stopReconcileTimer();
}

});

void refreshCloudAlertMode();

if(isCloudLoggedIn()){
runCloudOp(()=>
hydrateAlertsAfterAuth()
).catch(err=>{
console.warn(
"alert cloud hydrate init:",
err?.message || err
);
});
}

const pullWhenVisible = ()=>{

if(
document.visibilityState !== "visible" ||
!isCloudLoggedIn()
){
return;
}

pullRegistryFromCloud().catch(err=>{
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

document.addEventListener(
"visibilitychange",
pullWhenVisible
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
