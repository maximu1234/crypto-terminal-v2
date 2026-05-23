import {
getSupabase,
isSupabaseConfigured
} from "./supabase-client.js?v=2";

import {
loadFavorites,
saveFavorites
} from "./storage.js?v=11";

const FAVORITES_LOCAL_TS_KEY =
"favorites_local_updated_at";

let configured = false;
let loggedIn = false;
let userEmail = "";
const authListeners = new Set();
const favoritesListeners = new Set();

let favoritesChannel = null;
let realtimeUserId = null;
let syncPollTimer = null;
let realtimeReconnectTimer = null;

const SYNC_POLL_MS = 10000;

function notifyAuth(){

authListeners.forEach(fn=>{

try{
fn();
}catch{
/* ignore */
}

});

}

function notifyFavorites(){

favoritesListeners.forEach(fn=>{

try{
fn();
}catch{
/* ignore */
}

});

}

export function onCloudSyncChange(fn){

authListeners.add(fn);

return ()=>{
authListeners.delete(fn);
};

}

export function onFavoritesRemoteUpdate(fn){

favoritesListeners.add(fn);

return ()=>{
favoritesListeners.delete(fn);
};

}

export function isCloudSyncEnabled(){

return configured;

}

export function isCloudLoggedIn(){

return configured && loggedIn;

}

export function getCloudUserEmail(){

return userEmail;

}

function loadLocalFavoritesUpdatedAt(){

return localStorage.getItem(
FAVORITES_LOCAL_TS_KEY
) || "";

}

function saveLocalFavoritesUpdatedAt(iso){

if(!iso){
localStorage.removeItem(
FAVORITES_LOCAL_TS_KEY
);
return;
}

localStorage.setItem(
FAVORITES_LOCAL_TS_KEY,
iso
);

}

function normalizeFavoritesList(list){

if(!Array.isArray(list)){
return [];
}

return list.filter(s=>typeof s === "string");

}

function tsMs(iso){

if(!iso){
return 0;
}

const n =
Date.parse(iso);

return Number.isFinite(n) ? n : 0;

}

function isTsNewer(a, b){

return tsMs(a) > tsMs(b);

}

function favoritesSignature(list){

return [...list].sort().join("|");

}

function favoritesListsEqual(a, b){

return favoritesSignature(a) ===
favoritesSignature(b);

}

async function fetchCloudSettings(sb, userId){

const { data, error } =
await sb
.from("user_settings")
.select("favorites, updated_at")
.eq("user_id", userId)
.maybeSingle();

if(error){
console.warn(
"cloud favorites load:",
error.message
);
return null;
}

if(!data){
return null;
}

return {
favorites: normalizeFavoritesList(
data.favorites
),
updatedAt: data.updated_at || ""
};

}

async function pushCloudFavorites(
sb,
userId,
favorites
){

const { data, error } =
await sb
.from("user_settings")
.upsert({
user_id: userId,
favorites,
updated_at: new Date().toISOString()
})
.select("updated_at")
.single();

if(error){
console.warn(
"cloud favorites save:",
error.message
);
return null;
}

return data?.updated_at || null;

}

async function getAuthedClient(){

const sb =
await getSupabase();

if(
!sb ||
!loggedIn
){
return null;
}

const { data: { user } } =
await sb.auth.getUser();

if(!user){
return null;
}

return { sb, user };

}

function applyFavoritesLocally(
favorites,
updatedAt
){

saveFavorites(favorites);

if(updatedAt){
saveLocalFavoritesUpdatedAt(updatedAt);
}

notifyFavorites();

}

function stopSyncPoll(){

if(!syncPollTimer){
return;
}

clearInterval(syncPollTimer);
syncPollTimer = null;

}

function startSyncPoll(){

stopSyncPoll();

syncPollTimer = setInterval(()=>{

if(
!loggedIn ||
document.visibilityState !==
"visible"
){
return;
}

pullFavoritesIfCloudNewer();

},
SYNC_POLL_MS);

}

function teardownFavoritesRealtime(){

if(!favoritesChannel){
return;
}

const ch =
favoritesChannel;

favoritesChannel = null;

ch.unsubscribe();

}

function stopCloudSyncHelpers(){

stopSyncPoll();

if(realtimeReconnectTimer){
clearTimeout(realtimeReconnectTimer);
realtimeReconnectTimer = null;
}

teardownFavoritesRealtime();
realtimeUserId = null;

}

function scheduleRealtimeReconnect(){

if(realtimeReconnectTimer){
return;
}

realtimeReconnectTimer = setTimeout(async()=>{

realtimeReconnectTimer = null;

if(
!loggedIn ||
document.visibilityState !==
"visible" ||
!realtimeUserId
){
return;
}

await setupFavoritesRealtime(
realtimeUserId
);

},
2000);

}

async function refreshCloudConnection(){

if(!loggedIn){
return;
}

await pullFavoritesIfCloudNewer();

if(realtimeUserId){
await setupFavoritesRealtime(
realtimeUserId
);
}

}

function handleRealtimeFavoritesRow(row){

if(!row){
return;
}

const cloudFavorites =
normalizeFavoritesList(row.favorites);
const localFavorites =
loadFavorites();
const cloudTs =
row.updated_at || "";

if(
favoritesListsEqual(
cloudFavorites,
localFavorites
)
){

if(cloudTs){
saveLocalFavoritesUpdatedAt(cloudTs);
}

return;
}

applyFavoritesLocally(
cloudFavorites,
cloudTs
);

}

async function setupFavoritesRealtime(userId){

const sb =
await getSupabase();

if(
!sb ||
!userId
){
return;
}

realtimeUserId = userId;

teardownFavoritesRealtime();

const channel =
sb
.channel(`user_settings:${userId}`)
.on(
"postgres_changes",
{
event: "UPDATE",
schema: "public",
table: "user_settings",
filter: `user_id=eq.${userId}`
},
payload=>{
handleRealtimeFavoritesRow(
payload.new
);
}
)
.on(
"postgres_changes",
{
event: "INSERT",
schema: "public",
table: "user_settings",
filter: `user_id=eq.${userId}`
},
payload=>{
handleRealtimeFavoritesRow(
payload.new
);
}
)
.subscribe(status=>{

if(status === "SUBSCRIBED"){
return;
}

if(
status === "CHANNEL_ERROR" ||
status === "TIMED_OUT" ||
status === "CLOSED"
){
console.warn(
"favorites realtime:",
status
);
scheduleRealtimeReconnect();
}

});

favoritesChannel = channel;

}

/** Слияние по updated_at — побеждает последнее изменение (в т.ч. пустой список). */
export async function mergeFavoritesWithCloud(){

const authed =
await getAuthedClient();

if(!authed){
return loadFavorites();
}

const { sb, user } =
authed;

const local =
loadFavorites();
const localTs =
loadLocalFavoritesUpdatedAt();
const cloud =
await fetchCloudSettings(
sb,
user.id
);

if(!cloud){

if(local.length > 0){

const ts =
await pushCloudFavorites(
sb,
user.id,
local
);

if(ts){
saveLocalFavoritesUpdatedAt(ts);
}

}

return local;

}

if(
!localTs ||
isTsNewer(
cloud.updatedAt,
localTs
)
){

applyFavoritesLocally(
cloud.favorites,
cloud.updatedAt
);
return cloud.favorites;

}

if(
localTs &&
(
!cloud.updatedAt ||
isTsNewer(
localTs,
cloud.updatedAt
)
)
){

const ts =
await pushCloudFavorites(
sb,
user.id,
local
);

if(ts){
saveLocalFavoritesUpdatedAt(ts);
}

return local;

}

return local;

}

/** Подтянуть с другого устройства (вкладка / refresh). */
export async function pullFavoritesIfCloudNewer(){

const authed =
await getAuthedClient();

if(!authed){
return loadFavorites();
}

const { sb, user } =
authed;

const localTs =
loadLocalFavoritesUpdatedAt();
const cloud =
await fetchCloudSettings(
sb,
user.id
);

if(
!cloud?.updatedAt ||
(
localTs &&
!isTsNewer(
cloud.updatedAt,
localTs
)
)
){
return loadFavorites();
}

applyFavoritesLocally(
cloud.favorites,
cloud.updatedAt
);

return cloud.favorites;

}

export async function persistFavoritesToCloud(favorites){

saveFavorites(favorites);

const authed =
await getAuthedClient();

if(!authed){
return;
}

const { sb, user } =
authed;

const ts =
await pushCloudFavorites(
sb,
user.id,
favorites
);

if(ts){
saveLocalFavoritesUpdatedAt(ts);
}

}

export async function signInWithEmailOtp(email){

const sb =
await getSupabase();

if(!sb){
throw new Error("Supabase не настроен");
}

const redirectTo =
`${window.location.origin}${window.location.pathname}`;

const { error } =
await sb.auth.signInWithOtp({
email,
options:{
emailRedirectTo: redirectTo,
shouldCreateUser: true
}
});

if(error){
throw error;
}

return redirectTo;

}

export async function signOutCloud(){

const sb =
await getSupabase();

if(sb){
await sb.auth.signOut();
}

loggedIn = false;
userEmail = "";
stopCloudSyncHelpers();
notifyAuth();

}

async function applySession(session){

loggedIn = !!session?.user;
userEmail = session?.user?.email || "";

if(loggedIn){
await mergeFavoritesWithCloud();
await setupFavoritesRealtime(
session.user.id
);
startSyncPoll();
notifyAuth();
return;
}

stopCloudSyncHelpers();
notifyAuth();

}

function bindRemotePullTriggers(){

const wake = ()=>{

if(
document.visibilityState !==
"visible"
){
return;
}

refreshCloudConnection().catch(()=>{
/* ignore */
});

};

document.addEventListener(
"visibilitychange",
wake
);

window.addEventListener(
"pageshow",
wake
);

window.addEventListener(
"focus",
wake
);

window.addEventListener(
"online",
wake
);

}

export async function initCloudSync(){

configured =
await isSupabaseConfigured();

if(!configured){
notifyAuth();
return;
}

const sb =
await getSupabase();

if(!sb){
notifyAuth();
return;
}

const { data: { session } } =
await sb.auth.getSession();

await applySession(session);

bindRemotePullTriggers();

sb.auth.onAuthStateChange(
async(event, session)=>{

if(
event === "SIGNED_IN" ||
event === "TOKEN_REFRESHED" ||
event === "INITIAL_SESSION"
){
await applySession(session);
return;
}

if(
event === "SIGNED_OUT"
){
loggedIn = false;
userEmail = "";
stopCloudSyncHelpers();
notifyAuth();
}

}
);

}
