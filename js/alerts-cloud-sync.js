import {
getSupabase,
isSupabaseConfigured
} from "./supabase-client.js?v=4";

import {
waitForCloudAuth
} from "./cloud-sync.js?v=12";

import {
isCloudLoggedIn,
onCloudSyncChange
} from "./cloud-sync.js?v=12";

let cloudOpChain =
Promise.resolve();

export function runCloudOp(fn){

const job =
cloudOpChain.then(()=>fn());

cloudOpChain =
job.catch(()=>{});

return job;

}

async function getAuthed() {

return waitForCloudAuth(12000);

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
5000,
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
console.warn(
"auth refresh:",
err?.message || err
);
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

const ctx =
await getAuthed();

if(!ctx){
return null;
}

const { data: { session } } =
await ctx.sb.auth.getSession();

const token =
session?.access_token;

if(!token){
return null;
}

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

const { data: { session } } =
await ctx.sb.auth.getSession();

const token =
session?.access_token;

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
console.warn(
"alert REST push:",
res.status,
text.slice(0, 320)
);
return false;
}

console.log(
"alert cloud push ok (REST):",
symbol,
shapeId
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

async function markAlertTriggeredOnCloudImpl(
symbol,
shapeId
){

const ctx = await getAuthed();

if(!ctx){
console.warn(
"alert cloud trigger: нет сессии"
);
return false;
}

const sym =
String(symbol || "").trim().toUpperCase();
const sid =
String(shapeId || "").trim();

if(!sym || !sid){
return false;
}

const { error: deleteErr } =
await ctx.sb
.from("price_alerts")
.delete()
.eq("user_id", ctx.user.id)
.eq("symbol", sym)
.eq("shape_id", sid);

if(!deleteErr){
console.log(
"alert cloud removed (triggered):",
sym,
sid
);
return true;
}

const triggeredAt =
new Date().toISOString();

const { error: updateErr } =
await ctx.sb
.from("price_alerts")
.update({ triggered_at: triggeredAt })
.eq("user_id", ctx.user.id)
.eq("symbol", sym)
.eq("shape_id", sid);

if(!updateErr){
console.log(
"alert cloud triggered:",
sym,
sid
);
return true;
}

console.warn(
"alert cloud trigger:",
deleteErr.message,
updateErr?.message
);
return false;

}

export function markAlertTriggeredOnCloudImmediate(
symbol,
shapeId
){

return markAlertTriggeredOnCloudImpl(
symbol,
shapeId
);

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
 * Срабатывание из браузера: Telegram + удаление строки через Railway (service role).
 */
export async function triggerAlertViaWorker(
symbol,
shapeId
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

const auth =
await getWorkerRequestAuth();

if(!auth){
return {
ok: false,
reason: "no_auth"
};
}

const sym =
String(symbol || "").trim().toUpperCase();
const sid =
String(shapeId || "").trim();

let res;

try{
res =
await fetchWithTimeout(
`${base}/trigger`,
{
method: "POST",
headers: {
"Content-Type": "application/json",
Authorization: `Bearer ${auth.token}`
},
body: JSON.stringify({
symbol: sym,
shape_id: sid
})
},
15000
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

let body = {};

try{
body =
text
? JSON.parse(text)
: {};
}catch{
body = { raw: text };
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
body
};
}

return body;

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
console.warn(
"worker /push-alert:",
res.status,
text.slice(0, 240)
);
return false;
}

console.log(
"alert cloud push ok (worker):",
symbol,
shapeId
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
await import("./alerts.js?v=34");

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

async function pushOneAlertRow(
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

const { markAlertCloudSynced } =
await import("./alerts.js?v=34");

const ctx =
await getAuthed();

for(
let attempt = 0;
attempt < retries;
attempt++
){

if(
ctx &&
await pushAlertViaRest(
row,
ctx
)
){
markAlertCloudSynced(
row.symbol,
row.shapeId
);
return true;
}

if(await pushAlertViaWorker(row)){
markAlertCloudSynced(
row.symbol,
row.shapeId
);
return true;
}

if(await pushAlertToCloudImpl(row)){
markAlertCloudSynced(
row.symbol,
row.shapeId
);
return true;
}

console.warn(
"[alerts] push attempt failed",
attempt + 1,
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
}

}

return false;

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
await import("./alerts.js?v=34");

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

let ensureAlertsChain =
Promise.resolve();

/**
 * Повторяет push, пока сессия не готова (график coins часто раньше, чем initCloudSync).
 */
export async function ensureAlertsPushedToCloud(
options = {}
){

const maxMs =
Number(options.maxMs) ||
50000;

const deadline =
Date.now() + maxMs;

while(
Date.now() < deadline
){

const { getActiveAlerts } =
await import("./alerts.js?v=34");

const list =
getActiveAlerts();

console.log(
"[alerts] ensure cloud:",
list.length,
"в localStorage"
);

if(!list.length){
return true;
}

try{

const { ensureCloudReady } =
await import("./auth-ui.js?v=10");

await ensureCloudReady();

const ctx =
await waitForCloudAuth(5000);

if(!ctx){
await new Promise(r=>{
setTimeout(r, 1000);
});
continue;
}

const pushed =
await syncAllLocalAlertsToCloudImmediate();

if(pushed >= list.length){
console.log(
"Облако: активные алерты в Supabase (",
pushed,
"/",
list.length,
")"
);
return true;
}

if(pushed > 0){
console.log(
"Облако: частичный push, повтор…",
pushed,
"/",
list.length
);
}

}catch(err){
console.warn(
"alert cloud push retry:",
err?.message || err
);
}

await new Promise(r=>{
setTimeout(r, 1200);
});

}

console.warn(
"Облако: не удалось отправить все алерты в Supabase — войдите (шестерёнка) или откройте /alerts/"
);

return false;

}

const debouncedPushTimers =
new Map();

const ALERT_PUSH_DEBOUNCE_MS =
500;

/**
 * При перетаскивении линии — не спамить Supabase на каждый пиксель.
 */
export function scheduleDebouncedAlertPush(
entry
){

const row =
normalizeAlertEntry(entry);

if(
!row.symbol ||
!row.shapeId ||
!Number.isFinite(row.price)
){
return;
}

const key =
`${row.symbol}::${row.shapeId}`;

const prev =
debouncedPushTimers.get(key);

if(prev){
clearTimeout(prev);
}

debouncedPushTimers.set(
key,
setTimeout(()=>{
debouncedPushTimers.delete(key);
void pushSingleAlertToCloud(row);
}, ALERT_PUSH_DEBOUNCE_MS)
);

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

const key =
`${row.symbol}::${row.shapeId}`;

const prev =
debouncedPushTimers.get(key);

if(prev){
clearTimeout(prev);
debouncedPushTimers.delete(key);
}

return pushSingleAlertToCloud(row);

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

export function scheduleEnsureAlertsInCloud(){

ensureAlertsChain =
ensureAlertsChain
.catch(()=>{})
.then(()=>
ensureAlertsPushedToCloud({
maxMs: 12000
})
)
.catch(err=>{
console.warn(
"alert cloud ensure:",
err?.message || err
);
return false;
});

return ensureAlertsChain;

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
await import("./alerts.js?v=34");

const cloudKeys =
new Set(
(data || []).map(row=>
alertEntryKey(
String(row.symbol || "").trim().toUpperCase(),
String(row.shape_id || "").trim()
)
)
);

const local =
loadAlerts();

const next =
local.filter(a=>{

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

if(next.length !== local.length){
saveAlertsFromCloudMerge(next);
}

return next.length;

}

export async function pullRegistryFromCloud(){

return runCloudOp(async()=>{

const n =
await reconcileLocalRegistryWithCloud();

const { stripAlertFlagsNotInRegistry } =
await import("./alerts.js?v=34");

stripAlertFlagsNotInRegistry();

return n;

});

}

async function hydrateAlertsAfterAuth(){

const { stripAlertFlagsNotInRegistry } =
await import("./alerts.js?v=34");

console.log(
"[alerts] hydrate after login…"
);

await syncAllLocalAlertsToCloudImpl();
await reconcileLocalRegistryWithCloud();
stripAlertFlagsNotInRegistry();

}

export async function syncAlertsWithCloud(){

return syncAllLocalAlertsToCloud();

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
scheduleEnsureAlertsInCloud();
}
);

onCloudSyncChange(()=>{

if(isCloudLoggedIn()){
runCloudOp(()=>
hydrateAlertsAfterAuth()
).catch(err=>{
console.warn(
"alert cloud hydrate:",
err?.message || err
);
});
}

});

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

}
