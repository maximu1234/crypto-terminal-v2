import {
getSupabase,
isSupabaseConfigured
} from "./supabase-client.js?v=4";

import {
loadFavoritesGroups,
saveFavoritesGroups,
favoritesToCloudList,
favoritesFromCloudList,
favoritesGroupsEqual,
favoritesSignature as favoritesGroupsSignature
} from "./favorites.js?v=1";

import {
collectAllLocalDrawings,
applyDrawingsMapToLocal
} from "./drawings-storage.js?v=1";

const FAVORITES_LOCAL_TS_KEY =
"favorites_local_updated_at";

const DRAWINGS_LOCAL_TS_KEY =
"drawings_local_updated_at";

const FAVORITES_SYNCED_SIG_KEY =
"favorites_synced_signature";

const DRAWINGS_SYNCED_SIG_KEY =
"drawings_synced_signature";

let configured = false;
let loggedIn = false;
let userEmail = "";
const authListeners = new Set();
const favoritesListeners = new Set();
const drawingsListeners = new Set();

let settingsChannel = null;
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

export function onDrawingsRemoteUpdate(fn){

drawingsListeners.add(fn);

return ()=>{
drawingsListeners.delete(fn);
};

}

function notifyDrawings(symbols){

drawingsListeners.forEach(fn=>{

try{
fn(symbols);
}catch{
/* ignore */
}

});

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

function loadLocalDrawingsUpdatedAt(){

return localStorage.getItem(
DRAWINGS_LOCAL_TS_KEY
) || "";

}

function saveLocalDrawingsUpdatedAt(iso){

if(!iso){
localStorage.removeItem(
DRAWINGS_LOCAL_TS_KEY
);
return;
}

localStorage.setItem(
DRAWINGS_LOCAL_TS_KEY,
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

function saveFavoritesSyncedSignature(groups){

localStorage.setItem(
FAVORITES_SYNCED_SIG_KEY,
favoritesGroupsSignature(groups)
);

}

function hasUnsyncedFavorites(){

return favoritesGroupsSignature(
loadFavoritesGroups()
) !== (
localStorage.getItem(
FAVORITES_SYNCED_SIG_KEY
) || ""
);

}

function saveDrawingsSyncedSignature(map){

localStorage.setItem(
DRAWINGS_SYNCED_SIG_KEY,
drawingsSignature(map)
);

}

function hasUnsyncedDrawings(){

return drawingsSignature(
collectAllLocalDrawings()
) !== (
localStorage.getItem(
DRAWINGS_SYNCED_SIG_KEY
) || ""
);

}

function normalizeDrawingsMap(raw){

if(
!raw ||
typeof raw !== "object" ||
Array.isArray(raw)
){
return {};
}

const out = {};

for(const [sym, list] of Object.entries(raw)){

if(
typeof sym !== "string" ||
!sym ||
!Array.isArray(list)
){
continue;
}

out[sym] = list;

}

return out;

}

function drawingsSignature(map){

return Object.keys(map)
.sort()
.map(sym=>`${sym}:${JSON.stringify(map[sym])}`)
.join("\n");

}

function drawingsMapsEqual(a, b){

return drawingsSignature(a) ===
drawingsSignature(b);

}

async function fetchUserSettings(sb, userId){

const { data, error } =
await sb
.from("user_settings")
.select(
"favorites, updated_at, drawings, drawings_updated_at"
)
.eq("user_id", userId)
.maybeSingle();

if(error){
console.warn(
"cloud settings load:",
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
updatedAt: data.updated_at || "",
drawings: normalizeDrawingsMap(
data.drawings
),
drawingsUpdatedAt:
data.drawings_updated_at || ""
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

async function pushCloudDrawings(
sb,
userId,
drawings
){

const { data, error } =
await sb
.from("user_settings")
.upsert({
user_id: userId,
drawings,
drawings_updated_at: new Date().toISOString()
})
.select("drawings_updated_at")
.single();

if(error){
console.warn(
"cloud drawings save:",
error.message
);
return null;
}

return data?.drawings_updated_at || null;

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

const { data: { session } } =
await sb.auth.getSession();

if(!session?.user){
return null;
}

return { sb, user: session.user };

}

function applyFavoritesLocally(
favoritesList,
updatedAt
){

saveFavoritesGroups(
favoritesFromCloudList(favoritesList)
);

if(updatedAt){
saveLocalFavoritesUpdatedAt(updatedAt);
}

saveFavoritesSyncedSignature(
loadFavoritesGroups()
);

notifyFavorites();

}

async function applyAlertFlagsToDrawingsMap(map){

if(
!map ||
typeof map !== "object"
){
return map;
}

const out =
JSON.parse(JSON.stringify(map));

const { getActiveAlerts } =
await import("./alerts.js");

for(const alert of getActiveAlerts()){

const sym =
String(alert.symbol || "").toUpperCase();

const sid =
String(alert.shapeId || "");

if(
!sym ||
!sid
){
continue;
}

const list =
out[sym];

if(!Array.isArray(list)){
continue;
}

const shape =
list.find(
s=>
s?.id === sid &&
s?.type === "hray"
);

if(!shape){
continue;
}

shape.isAlert = true;
shape.lineWidth = 1;
shape.alertTf =
alert.tf ||
shape.alertTf ||
"60";
shape.alertSymbol = sym;
shape.alertCreatedAt =
shape.alertCreatedAt ||
alert.createdAt ||
Date.now();

if(!shape.savedColor){
shape.savedColor = shape.color;
}

}

return out;

}

async function applyDrawingsLocally(
drawings,
updatedAt
){

const before =
collectAllLocalDrawings();

const merged =
await applyAlertFlagsToDrawingsMap(drawings);

applyDrawingsMapToLocal(merged);

const changed =
new Set([
...Object.keys(before),
...Object.keys(drawings)
]);

if(updatedAt){
saveLocalDrawingsUpdatedAt(updatedAt);
}

saveDrawingsSyncedSignature(
collectAllLocalDrawings()
);

notifyDrawings(
Array.from(changed)
);

return merged;

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

pullRemoteSettingsIfNewer();

},
SYNC_POLL_MS);

}

function teardownSettingsRealtime(){

if(!settingsChannel){
return;
}

const ch =
settingsChannel;

settingsChannel = null;

ch.unsubscribe();

}

function stopCloudSyncHelpers(){

stopSyncPoll();

if(realtimeReconnectTimer){
clearTimeout(realtimeReconnectTimer);
realtimeReconnectTimer = null;
}

teardownSettingsRealtime();
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

await setupSettingsRealtime(
realtimeUserId
);

},
2000);

}

async function refreshCloudConnection(){

if(!loggedIn){
return;
}

await pullRemoteSettingsIfNewer();

if(realtimeUserId){
await setupSettingsRealtime(
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
const localGroups =
loadFavoritesGroups();
const cloudGroups =
favoritesFromCloudList(cloudFavorites);
const cloudTs =
row.updated_at || "";

if(
favoritesGroupsEqual(
localGroups,
cloudGroups
)
){

if(cloudTs){
saveLocalFavoritesUpdatedAt(cloudTs);
}

saveFavoritesSyncedSignature(
localGroups
);

return;
}

applyFavoritesLocally(
cloudFavorites,
cloudTs
);

}

function handleRealtimeDrawingsRow(row){

if(!row){
return;
}

const cloudDrawings =
normalizeDrawingsMap(row.drawings);
const localDrawings =
collectAllLocalDrawings();
const cloudTs =
row.drawings_updated_at || "";

if(
drawingsMapsEqual(
cloudDrawings,
localDrawings
)
){

if(cloudTs){
saveLocalDrawingsUpdatedAt(cloudTs);
}

saveDrawingsSyncedSignature(
localDrawings
);

return;
}

void applyDrawingsLocally(
cloudDrawings,
cloudTs
);

}

function handleRealtimeSettingsRow(row){

handleRealtimeFavoritesRow(row);
handleRealtimeDrawingsRow(row);

}

async function setupSettingsRealtime(userId){

const sb =
await getSupabase();

if(
!sb ||
!userId
){
return;
}

realtimeUserId = userId;

teardownSettingsRealtime();

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
handleRealtimeSettingsRow(
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
handleRealtimeSettingsRow(
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
"settings realtime:",
status
);
scheduleRealtimeReconnect();
}

});

settingsChannel = channel;

}

/** Слияние по updated_at — побеждает последнее изменение (в т.ч. пустой список). */
export async function mergeFavoritesWithCloud(){

const authed =
await getAuthedClient();

if(!authed){
return favoritesToCloudList(
loadFavoritesGroups()
);
}

const { sb, user } =
authed;

const localGroups =
loadFavoritesGroups();
const localList =
favoritesToCloudList(localGroups);
const localTs =
loadLocalFavoritesUpdatedAt();
const cloud =
await fetchUserSettings(
sb,
user.id
);

if(!cloud){

if(localList.length > 0){

const ts =
await pushCloudFavorites(
sb,
user.id,
localList
);

if(ts){
saveLocalFavoritesUpdatedAt(ts);
saveFavoritesSyncedSignature(localGroups);
}

}

return localList;

}

if(
favoritesGroupsEqual(
localGroups,
favoritesFromCloudList(cloud.favorites)
)
){

if(cloud.updatedAt){
saveLocalFavoritesUpdatedAt(
cloud.updatedAt
);
}

saveFavoritesSyncedSignature(localGroups);
return localList;

}

if(
hasUnsyncedFavorites() ||
!localTs ||
!isTsNewer(
cloud.updatedAt,
localTs
)
){

const ts =
await pushCloudFavorites(
sb,
user.id,
localList
);

if(ts){
saveLocalFavoritesUpdatedAt(ts);
saveFavoritesSyncedSignature(localGroups);
}

return localList;

}

applyFavoritesLocally(
cloud.favorites,
cloud.updatedAt
);

return cloud.favorites;

}

/** Подтянуть с другого устройства (вкладка / refresh). */
export async function pullFavoritesIfCloudNewer(){

const authed =
await getAuthedClient();

if(!authed){
return favoritesToCloudList(
loadFavoritesGroups()
);
}

const { sb, user } =
authed;

const localGroups =
loadFavoritesGroups();
const localList =
favoritesToCloudList(localGroups);
const localTs =
loadLocalFavoritesUpdatedAt();
const cloud =
await fetchUserSettings(
sb,
user.id
);

if(
!cloud
){
return localList;
}

if(
favoritesGroupsEqual(
localGroups,
favoritesFromCloudList(cloud.favorites)
)
){

if(cloud.updatedAt){
saveLocalFavoritesUpdatedAt(
cloud.updatedAt
);
}

saveFavoritesSyncedSignature(localGroups);
return localList;

}

if(hasUnsyncedFavorites()){
return localList;
}

if(
!cloud.updatedAt ||
(
localTs &&
!isTsNewer(
cloud.updatedAt,
localTs
)
)
){
return localList;
}

applyFavoritesLocally(
cloud.favorites,
cloud.updatedAt
);

return cloud.favorites;

}

export async function mergeDrawingsWithCloud(){

const authed =
await getAuthedClient();

if(!authed){
return collectAllLocalDrawings();
}

const { sb, user } =
authed;

const local =
collectAllLocalDrawings();
const localTs =
loadLocalDrawingsUpdatedAt();
const cloud =
await fetchUserSettings(
sb,
user.id
);

if(!cloud){

if(Object.keys(local).length > 0){

const ts =
await pushCloudDrawings(
sb,
user.id,
local
);

if(ts){
saveLocalDrawingsUpdatedAt(ts);
saveDrawingsSyncedSignature(local);
}

}

return local;

}

if(
drawingsMapsEqual(
local,
cloud.drawings
)
){

if(cloud.drawingsUpdatedAt){
saveLocalDrawingsUpdatedAt(
cloud.drawingsUpdatedAt
);
}

saveDrawingsSyncedSignature(local);
return local;

}

if(
hasUnsyncedDrawings() ||
!localTs ||
!isTsNewer(
cloud.drawingsUpdatedAt,
localTs
)
){

const ts =
await pushCloudDrawings(
sb,
user.id,
local
);

if(ts){
saveLocalDrawingsUpdatedAt(ts);
saveDrawingsSyncedSignature(local);
}

return local;

}

await applyDrawingsLocally(
cloud.drawings,
cloud.drawingsUpdatedAt
);

return cloud.drawings;

}

export async function pullDrawingsIfCloudNewer(){

const authed =
await getAuthedClient();

if(!authed){
return collectAllLocalDrawings();
}

const { sb, user } =
authed;

const local =
collectAllLocalDrawings();
const localTs =
loadLocalDrawingsUpdatedAt();
const cloud =
await fetchUserSettings(
sb,
user.id
);

if(!cloud){
return local;
}

if(
drawingsMapsEqual(
local,
cloud.drawings
)
){

if(cloud.drawingsUpdatedAt){
saveLocalDrawingsUpdatedAt(
cloud.drawingsUpdatedAt
);
}

saveDrawingsSyncedSignature(local);
return local;

}

if(hasUnsyncedDrawings()){
return local;
}

if(
!cloud.drawingsUpdatedAt ||
(
localTs &&
!isTsNewer(
cloud.drawingsUpdatedAt,
localTs
)
)
){
return local;
}

await applyDrawingsLocally(
cloud.drawings,
cloud.drawingsUpdatedAt
);

return cloud.drawings;

}

async function syncFavoritesWithCloud(){

if(hasUnsyncedFavorites()){

await persistFavoritesToCloud(
loadFavoritesGroups()
);
return;
}

await pullFavoritesIfCloudNewer();

}

async function syncDrawingsWithCloud(){

if(hasUnsyncedDrawings()){

await persistAllDrawingsToCloud();
return;
}

await pullDrawingsIfCloudNewer();

}

export async function pullRemoteSettingsIfNewer(){

await syncFavoritesWithCloud();
await syncDrawingsWithCloud();

}

export async function persistAllDrawingsToCloud(){

const drawings =
collectAllLocalDrawings();

const authed =
await getAuthedClient();

if(!authed){
return;
}

const { sb, user } =
authed;

const ts =
await pushCloudDrawings(
sb,
user.id,
drawings
);

if(ts){
saveLocalDrawingsUpdatedAt(ts);
saveDrawingsSyncedSignature(drawings);
}

}

export async function persistFavoritesToCloud(favorites){

const list =
Array.isArray(favorites)
? favorites
: favoritesToCloudList(favorites);

const groups =
favoritesFromCloudList(list);

saveFavoritesGroups(groups);

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
list
);

if(ts){
saveLocalFavoritesUpdatedAt(ts);
saveFavoritesSyncedSignature(groups);
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
await mergeDrawingsWithCloud();
await setupSettingsRealtime(
session.user.id
);
startSyncPoll();

import("./alerts-cloud-sync.js?v=10")
.then(m=>{
m.syncAllLocalAlertsToCloud();
})
.catch(err=>{
console.warn("alerts cloud sync on login:", err);
});

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

export async function waitForCloudAuth(maxWaitMs = 12000){

if(!(await isSupabaseConfigured())){
return null;
}

const sb =
await getSupabase();

if(!sb){
return null;
}

const deadline =
Date.now() + maxWaitMs;

while(Date.now() < deadline){

const { data: { session }, error } =
await sb.auth.getSession();

if(
!error &&
session?.user
){
return {
sb,
user: session.user
};
}

await new Promise(r=>{
setTimeout(r, 250);
});

}

return null;

}

export async function initCloudSync(){

const hasEnv =
await isSupabaseConfigured();

if(!hasEnv){
configured = false;
notifyAuth();
return;
}

configured = true;
notifyAuth();

let sb;

try{
sb =
await getSupabase();
}catch(err){
console.warn("supabase client:", err);
notifyAuth();
return;
}

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
