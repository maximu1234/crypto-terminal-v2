import {
waitForCloudAuth,
ensureCloudLoginResolved
} from "../cloud-sync.js?v=29";

import {
setAlertAuthCache,
resolveAlertAuthFast,
readAlertTokenSync
} from "../alert-auth-cache.js?v=7";

import {
fetchWithTimeout,
withTimeout,
getAccessTokenForUser
} from "./worker-client.js?v=1";

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

async function refreshTelegramRestAuth(){

try{
await ensureCloudLoginResolved(10000);
}catch{
/* ignore */
}

return resolveUserRestAuth();

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

async function getSupabaseHttpConfig(){

const env =
await import("../supabase-env.js?v=5");

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

let auth =
await resolveUserRestAuth();

if(!auth){
return null;
}

for(let attempt = 0; attempt < 2; attempt++){
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
if(
attempt === 0 &&
isJwtExpiredError(err)
){
const nextAuth =
await refreshTelegramRestAuth();

if(nextAuth){
auth = nextAuth;
continue;
}
}

console.warn(
"telegram chat load:",
err?.message || err
);
return null;

}
}

return null;

}

export async function saveTelegramChatId(chatId){

let auth =
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

let saved =
false;

for(let attempt = 0; attempt < 2; attempt++){
try{
await withTimeout(
saveTelegramChatIdViaRest(
auth,
parsed
),
15000,
"telegram save"
);
saved = true;
break;
}catch(err){
if(
attempt === 0 &&
isJwtExpiredError(err)
){
const nextAuth =
await refreshTelegramRestAuth();

if(nextAuth){
auth = nextAuth;
continue;
}
}
throw err;
}
}

if(!saved){
throw new Error(
"Не удалось сохранить Chat ID"
);
}

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
