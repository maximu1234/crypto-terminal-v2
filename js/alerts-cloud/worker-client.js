import {
SUPABASE_AUTH_STORAGE_KEY
} from "../supabase-client.js?v=7";

import {
waitForCloudAuth,
ensureCloudLoginResolved
} from "../cloud-sync.js?v=40";

import {
getCachedAlertAuth,
setAlertAuthCache,
resolveAlertAuthFast,
readAlertTokenSync,
readPersistedAuthSession
} from "../alert-auth-cache.js?v=7";

import {
normalizeAlertWorkerBaseUrl
} from "../alert-worker-url.js?v=1";

import {
alertsDebugLog,
broadcastAlertsRegistrySync,
lastSeenCloudAlerts
} from "./debug.js?v=4";

import {
isAlertsCloudDisabled
} from "../supabase-usage-prefs.js?v=4";

function alertsCloudBlocked(){

return isAlertsCloudDisabled();

}

let cloudOpChain =
Promise.resolve();

/** Отдельная очередь только для push алертов (не блокируется hydrate/sync). */
let alertPushChain =
Promise.resolve();

export function runCloudOp(fn){

if(
alertsCloudBlocked()
){
return Promise.resolve();
}

const job =
cloudOpChain.then(()=>fn());

cloudOpChain =
job.catch(()=>{});

return job;

}

export function enqueueAlertPush(fn){

if(
alertsCloudBlocked()
){
return Promise.resolve();
}

const job =
alertPushChain.then(()=>fn());

alertPushChain =
job.catch(()=>{});

return job;

}

let alertTriggerChain =
Promise.resolve();

export function enqueueAlertTrigger(fn){

if(
alertsCloudBlocked()
){
return Promise.resolve();
}

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

async function refreshRestAuthForUser(ctx){

try{
await ensureCloudLoginResolved(10000);
}catch{
/* ignore */
}

const tokenFromSync =
readAlertTokenSync()?.token;

if(tokenFromSync){
return tokenFromSync;
}

const persisted =
readPersistedAuthSession();

if(
persisted?.access_token
){
return persisted.access_token;
}

if(
ctx?.sb
){
return getAccessTokenForUser(ctx);
}

return null;

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

async function softDeleteAlertViaRest(
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

if(!token){
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
"getAuthed soft delete"
);
}catch{
ctx = null;
}
}

if(
!ctx?.user?.id
){
return false;
}

if(!token){
token =
await refreshRestAuthForUser(ctx);
}

if(!token){
return false;
}

let env;
try{
env =
await import("../supabase-env.js?v=5");
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
`price_alerts?user_id=eq.${encodeURIComponent(ctx.user.id)}&triggered_at=is.null&deleted_at=is.null`;
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
method: "PATCH",
headers: {
apikey: anon,
Authorization: `Bearer ${token}`,
"Content-Type": "application/json",
Prefer: "return=minimal"
},
body: JSON.stringify({
deleted_at: new Date().toISOString()
})
},
10000
);

if(!res.ok){
const text =
await res.text();

if(
isMissingColumnError(text, "deleted_at")
){
return purgeAlertViaRest(opts);
}

if(
isJwtExpiredText(text)
){
const refreshed =
await refreshRestAuthForUser(ctx);
if(
refreshed &&
refreshed !== token
){
const retry =
await fetchWithTimeout(
`${base}/rest/v1/${path}`,
{
method: "PATCH",
headers: {
apikey: anon,
Authorization: `Bearer ${refreshed}`,
"Content-Type": "application/json",
Prefer: "return=minimal"
},
body: JSON.stringify({
deleted_at: new Date().toISOString()
})
},
10000
);
return retry.ok;
}
}
return false;
}

return true;
}catch{
return false;
}

}

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
await import("../supabase-env.js?v=5");
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

if(
isJwtExpiredText(text)
){
const refreshedToken =
await refreshRestAuthForUser(ctx);

if(
refreshedToken &&
refreshedToken !== token
){
token = refreshedToken;

const retryRes =
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

if(retryRes.ok){
alertsDebugLog(
"[alerts] purge REST ok (retry):",
all
? "all active"
: (id || `${sym} ${sid}`)
);
return true;
}

const retryText =
await retryRes.text();
console.warn(
"[alerts] purge REST retry:",
retryRes.status,
retryText.slice(0, 200)
);
return false;
}
}

console.warn(
"[alerts] purge REST:",
res.status,
text.slice(0, 200)
);
return false;
}

alertsDebugLog(
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
await softDeleteAlertViaRest({
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
await softDeleteAlertViaRest({
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
alertsDebugLog(
"[alerts] облако: удалены все активные алерты"
);
}

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
await deleteAlertViaWorker(
sym,
sid,
cid
)
){
ok = true;
}

if(
!ok
){

if(
cid
){
ok =
await softDeleteAlertViaRest({
id: cid
});
}

if(
!ok
){
ok =
await softDeleteAlertViaRest({
symbol: sym,
shapeId: sid
});
}

}

if(
!ok
){
ok =
await purgeAlertViaRest({
symbol: sym,
shapeId: sid,
id: cid || undefined
});
}

if(
ok
){
const stillThere =
await resolveCloudAlertId(
sym,
sid,
null
);

if(
stillThere
){
console.warn(
"alert cloud delete verify failed:",
sym,
sid,
stillThere
);
ok = false;
}
}

if(
!ok
){
console.warn(
"alert cloud delete:",
sym,
sid,
cid || ""
);
return false;
}

const { forgetAlertDeleted } =
await import("../alerts.js?v=98");

forgetAlertDeleted(
sym,
sid
);

broadcastAlertsRegistrySync();

return true;

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
await import("../supabase-env.js?v=5");

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
.is("triggered_at", null)
.is("deleted_at", null)
.maybeSingle();

if(error){
if(
isMissingColumnError(
error.message,
"deleted_at"
)
){
const legacy =
await ctx.sb
.from("price_alerts")
.select("id")
.eq("user_id", ctx.user.id)
.eq("symbol", sym)
.eq("shape_id", sid)
.is("triggered_at", null)
.maybeSingle();

return legacy.data?.id
? String(legacy.data.id)
: "";
}

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
 * Срабатывание: очередь → POST /trigger (DELETE + Telegram + history на worker).
 * Браузер не делает purge в Supabase.
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

alertsDebugLog(
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
alertsDebugLog(
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

alertsDebugLog(
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
!remote?.ok
){
console.warn(
"[alerts] строка ещё в Supabase (ждём worker/realtime):",
sym,
sid,
id || "",
remote?.reason || "no_auth"
);
}else if(
!stillInCloud
){
alertsDebugLog(
"[alerts] ✓ строка снята в Supabase",
sym,
sid
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
await import("../supabase-env.js?v=5");
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
`&triggered_at=is.null` +
`&deleted_at=is.null` +
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
.is("deleted_at", null)
.maybeSingle();

if(error){
if(
isMissingColumnError(
error.message,
"deleted_at"
)
){
const legacy =
await ctx.sb
.from("price_alerts")
.select("id, triggered_at")
.eq("user_id", ctx.user.id)
.eq("symbol", sym)
.eq("shape_id", sid)
.maybeSingle();

return !!legacy.data?.id;
}

return false;
}

return !!data?.id;

}

/**
 * Запись алерта через Railway (service role) — надёжнее браузерного upsert.
 */
async function deleteAlertViaWorkerAttempt(
symbol,
shapeId,
cloudId = null
){

const base =
await getAlertWorkerBaseUrl();

if(!base){
return false;
}

const auth =
await getWorkerRequestAuth();

if(!auth){
return false;
}

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

const body =
cid
? { alert_id: cid, symbol: sym, shape_id: sid }
: { symbol: sym, shape_id: sid };

let res;

try{
res =
await fetchWithTimeout(
`${base}/delete-alert`,
{
method: "POST",
headers: {
"Content-Type": "application/json",
Authorization: `Bearer ${auth.token}`
},
body: JSON.stringify(body)
},
12000
);
}catch(err){
console.warn(
"worker /delete-alert:",
err?.message || err
);
return false;
}

const text =
await res.text();

let parsed =
{};

try{
parsed =
text
? JSON.parse(text)
: {};
}catch{
parsed = { raw: text };
}

if(
!res.ok ||
!parsed.ok ||
Number(
parsed.deleted
) <=
0
){
console.warn(
"[alerts] worker /delete-alert ОТКЛОНЁН:",
res.status,
sym,
sid,
text.slice(0, 300)
);
return false;
}

alertsDebugLog(
"[alerts] ✓ Supabase удалено (worker):",
sym,
sid,
"deleted=",
parsed.deleted
);

return true;

}

export async function deleteAlertViaWorker(
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

if(
cid &&
await deleteAlertViaWorkerAttempt(
sym,
sid,
cid
)
){
return true;
}

return deleteAlertViaWorkerAttempt(
sym,
sid,
null
);

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
await import("../alerts.js?v=98");

markAlertCloudId(
symbol,
shapeId,
cloudId
);
}

alertsDebugLog(
"alert cloud push ok (worker):",
symbol,
shapeId,
cloudId || ""
);

return true;

}

export {
fetchWithTimeout,
withTimeout,
getAuthed,
getAccessTokenForUser,
getWorkerRequestAuth,
verifyAlertActiveInCloud,
normalizeAlertTf,
purgeAlertViaRest,
softDeleteAlertViaRest
};
