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

async function pushAlertToCloudImpl(entry){

const ctx = await getAuthed();

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

const row = {
user_id: ctx.user.id,
symbol,
shape_id: shapeId,
price,
tf: normalizeAlertTf(entry.tf),
triggered_at: null
};

const { error: upsertErr } =
await ctx.sb
.from("price_alerts")
.upsert(
row,
{ onConflict: "user_id,symbol,shape_id" }
);

if(!upsertErr){
console.log(
"alert cloud push ok:",
symbol,
shapeId,
row.tf
);
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

console.log(
"alert cloud push ok (insert):",
symbol,
shapeId,
row.tf
);
return true;

}

export function pushAlertToCloud(entry){

return runCloudOp(()=>
pushAlertToCloudImpl(entry)
);

}

export function pushAlertToCloudImmediate(entry){

return pushAlertToCloudImpl(entry);

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

export function markAlertTriggeredOnCloud(
symbol,
shapeId
){

return runCloudOp(()=>
markAlertTriggeredOnCloudImpl(
symbol,
shapeId
)
);

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

export {
markAlertTriggeredOnCloudImpl,
syncAllLocalAlertsToCloudImpl
};

function localAlertKey(row){

return `${String(row.symbol).toUpperCase()}::${String(row.shapeId)}`;

}

export async function pruneOrphanCloudAlerts(){

const ctx = await getAuthed();

if(!ctx){
return 0;
}

const { getActiveAlerts } =
await import("./alerts.js?v=21");

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

async function syncAllLocalAlertsToCloudImpl(){

const ctx = await getAuthed();

if(!ctx){
console.warn(
"alert cloud sync: нет сессии"
);
return 0;
}

const { getActiveAlerts } =
await import("./alerts.js?v=21");

const list =
getActiveAlerts();

if(!list.length){
return 0;
}

let ok = 0;

for(const row of list){
if(await pushAlertToCloudImpl(row)){
ok += 1;
}
}

if(ok === list.length){
await pruneOrphanCloudAlerts();
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

export async function persistAlertsRegistryToCloud(){

return runCloudOp(async()=>{

const { getActiveAlerts } =
await import("./alerts.js?v=21");

const list =
getActiveAlerts();

if(!list.length){
return true;
}

const n =
await syncAllLocalAlertsToCloudImpl();

return n >= list.length;

});

}

export async function mergeCloudAlertsIntoLocal(){

const ctx = await getAuthed();

if(!ctx){
return 0;
}

const { data, error } =
await ctx.sb
.from("price_alerts")
.select(
"symbol, shape_id, price, tf, created_at"
)
.eq("user_id", ctx.user.id)
.is("triggered_at", null);

if(error){
console.warn(
"alert cloud pull:",
error.message
);
return 0;
}

const { saveAlerts, alertEntryKey, loadAlerts } =
await import("./alerts.js?v=21");

const byKey = new Map();
const now = Date.now();
const PENDING_PUSH_MS = 120000;

for(const row of data || []){

const sym =
String(row.symbol || "").trim().toUpperCase();
const sid =
String(row.shape_id || "").trim();
const price =
Number(row.price);

if(
!sym ||
!sid ||
!Number.isFinite(price)
){
continue;
}

const entry = {
id: sid,
shapeId: sid,
symbol: sym,
price,
tf: normalizeAlertTf(row.tf),
createdAt:
row.created_at
? Date.parse(row.created_at)
: Date.now()
};

byKey.set(
alertEntryKey(sym, sid),
entry
);

}

for(const local of loadAlerts()){

const sym =
String(local.symbol || "").trim().toUpperCase();
const sid =
String(local.shapeId || local.id || "").trim();
const key =
alertEntryKey(sym, sid);

if(
!sym ||
!sid ||
byKey.has(key)
){
continue;
}

const age =
now - (Number(local.createdAt) || 0);

if(age <= PENDING_PUSH_MS){
byKey.set(key, local);
}

}

saveAlerts([...byKey.values()]);

return byKey.size;

}

export async function pullRegistryFromCloud(){

return runCloudOp(async()=>{

const n =
await mergeCloudAlertsIntoLocal();

const { stripAlertFlagsNotInRegistry } =
await import("./alerts.js?v=21");

stripAlertFlagsNotInRegistry();

window.dispatchEvent(
new CustomEvent(
"alerts-registry-pulled"
)
);

return n;

});

}

async function hydrateAlertsAfterAuth(){

const { stripAlertFlagsNotInRegistry } =
await import("./alerts.js?v=21");

await syncAllLocalAlertsToCloudImpl();
await mergeCloudAlertsIntoLocal();
stripAlertFlagsNotInRegistry();

}

export async function syncAlertsWithCloud(){

return syncAllLocalAlertsToCloud();

}

let alertsCloudSyncReady = false;
let cloudSyncTimer = null;

function scheduleAlertCloudSync(reason){

clearTimeout(cloudSyncTimer);

cloudSyncTimer = setTimeout(()=>{
runCloudOp(()=>
syncAllLocalAlertsToCloudImpl()
).catch(err=>{
console.warn(
"alert cloud sync:",
reason,
err?.message || err
);
});
}, 600);

}

export function initAlertsCloudSync(){

if(alertsCloudSyncReady){
return;
}

alertsCloudSyncReady = true;

window.addEventListener(
"alerts-changed",
()=>{
scheduleAlertCloudSync("alerts-changed");
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

setInterval(
pullWhenVisible,
12000
);

}
