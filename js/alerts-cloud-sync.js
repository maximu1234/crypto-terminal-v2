import {
getSupabase,
isSupabaseConfigured
} from "./supabase-client.js?v=4";

import {
isCloudLoggedIn,
onCloudSyncChange
} from "./cloud-sync.js?v=8";

import {
getActiveAlerts,
loadAlerts
} from "./alerts.js";

async function getAuthed() {

if(!(await isSupabaseConfigured())){
return null;
}

const sb = await getSupabase();

if(!sb){
return null;
}

const { data: { session }, error } =
await sb.auth.getSession();

if(
error ||
!session?.user
){
return null;
}

return {
sb,
user: session.user
};

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

export async function pushAlertToCloud(entry){

const ctx = await getAuthed();

if(!ctx){
console.warn(
"alert cloud push: нет сессии — войдите через шестерёнку"
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

const { error } =
await ctx.sb
.from("price_alerts")
.upsert(
row,
{
onConflict: "user_id,symbol,shape_id",
ignoreDuplicates: false
}
);

if(error){
console.warn(
"alert cloud push:",
error.message,
error.code,
error.details
);
return false;
}

console.log(
"alert cloud push ok:",
symbol,
shapeId,
row.tf
);
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

const { error } =
await ctx.sb
.from("price_alerts")
.delete()
.eq("user_id", ctx.user.id)
.eq("symbol", symbol)
.eq("shape_id", shapeId);

if(error){
console.warn("alert cloud delete:", error.message);
}

}

export async function markAlertTriggeredOnCloud(
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

const { error: deleteErr } =
await ctx.sb
.from("price_alerts")
.delete()
.eq("user_id", ctx.user.id)
.eq("symbol", sym)
.eq("shape_id", sid);

if(deleteErr){
console.warn(
"alert cloud trigger:",
updateErr.message,
deleteErr.message
);
return false;
}

console.log(
"alert cloud removed:",
sym,
sid
);
return true;

}

export async function syncAllLocalAlertsToCloud(){

const ctx = await getAuthed();

if(!ctx){
return 0;
}

const list =
getActiveAlerts();

let ok = 0;

for(const row of list){
if(await pushAlertToCloud(row)){
ok += 1;
}
}

if(list.length){
console.log(
`alert cloud sync: ${ok}/${list.length}`
);
}

return ok;

}

let alertsCloudSyncReady = false;

export function initAlertsCloudSync(){

if(alertsCloudSyncReady){
return;
}

alertsCloudSyncReady = true;

onCloudSyncChange(()=>{

if(isCloudLoggedIn()){
syncAllLocalAlertsToCloud().catch(()=>{
/* ignore */
});
}

});

if(isCloudLoggedIn()){
syncAllLocalAlertsToCloud().catch(()=>{
/* ignore */
});
}

}
