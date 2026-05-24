import {
getSupabase,
isSupabaseConfigured
} from "./supabase-client.js?v=2";

import {
isCloudLoggedIn,
onCloudSyncChange
} from "./cloud-sync.js?v=7";

import {
getActiveAlerts,
loadAlerts
} from "./alerts.js";

async function getAuthed() {

if(
!isSupabaseConfigured() ||
!isCloudLoggedIn()
){
return null;
}

const sb = await getSupabase();

if(!sb){
return null;
}

const { data: { user } } =
await sb.auth.getUser();

if(!user){
return null;
}

return { sb, user };

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

export async function pushAlertToCloud(entry){

const ctx = await getAuthed();

if(!ctx){
return;
}

const shapeId =
entry?.shapeId ||
entry?.id;

const symbol =
entry?.symbol;

const price =
Number(entry?.price);

if(
!symbol ||
!shapeId ||
!Number.isFinite(price)
){
return;
}

const { error } =
await ctx.sb
.from("price_alerts")
.upsert(
{
user_id: ctx.user.id,
symbol,
shape_id: shapeId,
price,
tf: entry.tf || "60",
triggered_at: null
},
{ onConflict: "user_id,symbol,shape_id" }
);

if(error){
console.warn("alert cloud push:", error.message);
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
return;
}

const { error } =
await ctx.sb
.from("price_alerts")
.update({
triggered_at: new Date().toISOString()
})
.eq("user_id", ctx.user.id)
.eq("symbol", symbol)
.eq("shape_id", shapeId);

if(error){
console.warn("alert cloud trigger:", error.message);
}

}

export async function syncAllLocalAlertsToCloud(){

const ctx = await getAuthed();

if(!ctx){
return;
}

const list =
getActiveAlerts();

for(const row of list){
await pushAlertToCloud(row);
}

}

export function initAlertsCloudSync(){

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
