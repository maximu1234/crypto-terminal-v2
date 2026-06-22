import {
getSupabase,
isSupabaseConfigured
} from "./supabase-client.js?v=7";

import {
SUPABASE_AUTH_STORAGE_KEY,
authNetworkTimeoutMs,
isExplicitAuthSignOut,
isSafariBrowser,
isFatalAuthRefreshError,
clearPersistedRefreshToken,
markExplicitAuthSignOut,
restoreAuthSessionFromBackup,
restoreDesktopAuthSession,
isAuthRefreshBlocked,
blockAuthRefreshUntil,
clearAuthRefreshBlock,
getAuthRefreshBlockedUntil
} from "./auth-storage.js?v=4";

import {
loadFavoritesGroups,
saveFavoritesGroups,
favoritesToCloudList,
favoritesFromCloudList,
favoritesGroupsEqual,
favoritesSignature as favoritesGroupsSignature
} from "./favorites.js?v=2";

import {
collectAllLocalDrawings,
applyDrawingsMapToLocal,
loadLocalTombstones,
saveLocalTombstones,
mergeTombstoneMaps,
mergeDrawingsPayload,
packCloudDrawings,
unpackCloudDrawings
} from "./drawings-storage.js?v=7";

import {
withTimeout
} from "./async-timeout.js?v=1";

import {
readAlertTokenSync,
readPersistedAuthSession
} from "./alert-auth-cache.js?v=7";

import {
createNotifyDebouncer,
isAlertsPage
} from "./cloud-sync-throttle.js?v=3";

import {
isSupabaseRealtimeDisabled,
isDrawingsCloudDisabled,
isFavoritesCloudDisabled,
isAlertsCloudDisabled,
isAutoDevicePullDisabled,
scaleSupabasePollMs
} from "./supabase-usage-prefs.js?v=2";

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
let lastAppliedSessionKey = "__init__";
const authListeners = new Set();

let lastSilentRefreshMs =
0;
let authRefreshBlockedUntil =
getAuthRefreshBlockedUntil();
let lastAuthWarnKey =
"";
let lastAuthWarnMs =
0;

const SILENT_REFRESH_MIN_MS =
45000;

function warnAuthOnce(
key,
msg
){

const now =
Date.now();

if(
lastAuthWarnKey ===
key &&
now -
lastAuthWarnMs <
120000
){
return;
}

lastAuthWarnKey =
key;
lastAuthWarnMs =
now;

console.warn(
msg
);

}

function blockAuthRefreshRetries(
reason
){

authRefreshBlockedUntil =
blockAuthRefreshUntil();

const persisted =
readPersistedAuthSession();

const accessStillOk =
!!(
persisted?.access_token &&
!isAccessTokenExpired(
persisted
)
);

if(
!isCloudAuthTokenUsable()
){
syncCloudLoginFromStorage();

if(
!accessStillOk
){
warnAuthOnce(
"auth-degraded",
`[auth] ${reason} — войдите снова через шестерёнку`
);
}

}

}

function isAuthRefreshBlockedNow(){

return (
Date.now() <
authRefreshBlockedUntil ||
isAuthRefreshBlocked()
);

}

/** Сразу из localStorage — без getSession() (в Safari он часто зависает 12+ с). */
function bootstrapAuthFromLocalStorage(){

const snap =
readPersistedAuthSession() ||
readAlertTokenSync();

const user =
snap?.user;

if(
!user?.id
){
return;
}

if(
!isCloudAuthTokenUsable()
){
return;
}

loggedIn = true;
userEmail =
user.email ||
"";

}

async function tryRecoverSignedOutSession(
sb
){

if(
isExplicitAuthSignOut()
){
return null;
}

if(
isAuthRefreshBlockedNow()
){
syncCloudLoginFromStorage();
return null;
}

const persistedEarly =
readPersistedAuthSession();

if(
persistedEarly?.expires_at &&
isAccessTokenExpired(
persistedEarly
) &&
!String(
persistedEarly.refresh_token ||
""
).trim()
){
syncCloudLoginFromStorage();
return null;
}

restoreAuthSessionFromBackup();

let restored =
await restoreSessionFromPersisted(
sb
);

if(
restored
){
return restored;
}

const persisted =
readPersistedAuthSession();

if(
!persisted?.access_token ||
!persisted?.user
){
return null;
}

if(
sb
){
restored =
await restoreSessionFromPersisted(
sb
);
}

return restored ||
(
isAccessTokenExpired(
persisted
)
? null
: persisted
);

}

function bindSafariAuthKeepalive(){

if(
!isSafariBrowser()
){
return;
}

const KEEPALIVE_MS =
45 *
60 *
1000;

window.setInterval(
()=>{

if(
document.visibilityState !==
"visible"
){
return;
}

if(
!isCloudLoggedInEffective()
){
return;
}

void refreshAuthSessionSilent();

},
KEEPALIVE_MS
);

}

function isAccessTokenExpired(
session
){

const exp =
Number(
session?.expires_at
) ||
0;

return (
exp >
0 &&
exp *
1000 <
Date.now() -
5000
);

}

let cloudApiPausedUntil =
0;
let cloudAuthRecoveryAt =
0;

export function isCloudAuthError(
...parts
){

const blob =
parts
.filter(
Boolean
)
.map(
String
)
.join(
" "
);

return (
/JWT expired|PGRST301|PGRST303|invalid jwt|Auth session missing|AuthSessionMissing/i.test(
blob
)
);

}

export function isCloudAuthTokenUsable(){

const persisted =
readPersistedAuthSession();
const snap =
readAlertTokenSync();

const hasUser =
!!(
snap?.user?.id ||
persisted?.user?.id
);
const hasToken =
!!(
snap?.token ||
persisted?.access_token
);

if(
!hasUser ||
!hasToken
){
return false;
}

if(
persisted?.expires_at &&
isAccessTokenExpired(
persisted
)
){
return false;
}

return true;

}

export function isCloudApiUsable(){

return (
isCloudAuthTokenUsable() &&
Date.now() >=
cloudApiPausedUntil
);

}

function syncCloudLoginFromStorage(){

const persisted =
readPersistedAuthSession();
const usable =
isCloudAuthTokenUsable();

if(
usable &&
persisted?.user?.id
){

if(
!loggedIn
){
loggedIn = true;
userEmail =
persisted.user.email ||
userEmail ||
"";
notifyAuth();
}

return true;

}

if(
loggedIn
){
loggedIn = false;
userEmail =
persisted?.user?.email ||
userEmail ||
"";
stopCloudSyncHelpers();
notifyAuth();
}

return false;

}

export function pauseCloudApi(
ms =
10 *
60 *
1000
){

cloudApiPausedUntil =
Math.max(
cloudApiPausedUntil,
Date.now() +
ms
);

}

export function resumeCloudApi(){

cloudApiPausedUntil =
0;
cloudAuthRecoveryAt =
0;

}

export async function tryCloudAuthRecovery(){

const now =
Date.now();

if(
now <
cloudAuthRecoveryAt
){
return false;
}

cloudAuthRecoveryAt =
now +
90000;

const ok =
await refreshAuthSessionSilent();

if(
ok
){
resumeCloudApi();
authRefreshBlockedUntil =
getAuthRefreshBlockedUntil();
return true;
}

return false;

}

export function reportCloudAuthFailure(
source,
detail
){

const blob =
`${source} ${detail ?? ""}`;

if(
!isCloudAuthError(
blob
) &&
detail !==
401
){
return false;
}

pauseCloudApi(
15 *
60 *
1000
);

if(
!isCloudAuthTokenUsable()
){
blockAuthRefreshRetries(
String(
source
)
);
}else{
warnAuthOnce(
"cloud-auth-degraded",
`[cloud] ${source} — синхронизация приостановлена`
);
}

void tryCloudAuthRecovery();

void import("./drawings-cloud-sync.js?v=42").then(
m=>{
m.pauseDrawingsCloudSync?.(
15 *
60 *
1000
);
}
).catch(
()=>{}
);

return true;

}

/**
 * Восстановить сессию из localStorage (refresh после истечения access — типично на iPad).
 */
async function restoreSessionFromPersisted(
sb
){

if(
isAuthRefreshBlockedNow()
){
return null;
}

const persisted =
readPersistedAuthSession();

if(
!persisted?.access_token ||
!persisted?.user
){
return null;
}

const refresh =
String(
persisted.refresh_token ||
""
).trim();

if(
isAccessTokenExpired(
persisted
) &&
!refresh
){
return null;
}

if(
!sb
){
return persisted;
}

if(
!isAccessTokenExpired(
persisted
)
){

try{
const { data, error } =
await withTimeout(
sb.auth.setSession({
access_token: persisted.access_token,
refresh_token: refresh
}),
authNetworkTimeoutMs(
"setSession restore"
),
"setSession restore"
);

if(
error
){

if(
isFatalAuthRefreshError(
error
)
){
blockAuthRefreshRetries(
"restore setSession"
);
return null;
}

warnAuthOnce(
"auth-degraded",
`[auth] restore setSession: ${error.message}`
);
}else if(
data?.session
){
return data.session;
}
}catch(
err
){

if(
isFatalAuthRefreshError(
err
)
){
blockAuthRefreshRetries(
"restore setSession"
);
return null;
}

if(
/timeouts?/i.test(
String(
err?.message ||
err
)
)
){
blockAuthRefreshRetries(
"restore setSession"
);
return null;
}

warnAuthOnce(
"auth-degraded",
`[auth] restore setSession: ${err?.message || err}`
);

}

return persisted;

}

if(
refresh
){
try{
const { data, error } =
await withTimeout(
sb.auth.refreshSession(),
authNetworkTimeoutMs(
"refreshSession restore"
),
"refreshSession restore"
);

if(
error
){

if(
isFatalAuthRefreshError(
error
)
){
blockAuthRefreshRetries(
"refreshSession"
);
return null;
}

warnAuthOnce(
"auth-degraded",
`[auth] refreshSession: ${error.message}`
);
return null;
}

return data?.session ?? null;
}catch(
err
){

if(
isFatalAuthRefreshError(
err
)
){
blockAuthRefreshRetries(
"refreshSession"
);
return null;
}

if(
/timeouts?/i.test(
String(
err?.message ||
err
)
)
){
blockAuthRefreshRetries(
"refreshSession"
);
return null;
}

warnAuthOnce(
"auth-degraded",
`[auth] refreshSession: ${err?.message || err}`
);
return null;

}
}

return isAccessTokenExpired(
persisted
)
? null
: persisted;

}

async function refreshAuthSessionSilent(){

if(
isAuthRefreshBlockedNow()
){
return false;
}

const now =
Date.now();

if(
now <
authRefreshBlockedUntil
){
return false;
}

if(
now -
lastSilentRefreshMs <
SILENT_REFRESH_MIN_MS
){
return false;
}

if(
!isCloudLoggedInEffective()
){

const persistedLogin =
readPersistedAuthSession();

if(
!persistedLogin?.user?.id
){
return false;
}

if(
persistedLogin?.access_token &&
!isAccessTokenExpired(
persistedLogin
)
){
return false;
}

if(
!String(
persistedLogin.refresh_token ||
""
).trim()
){
syncCloudLoginFromStorage();
return false;
}

}

const persisted =
readPersistedAuthSession();

if(
persisted?.access_token &&
!isAccessTokenExpired(
persisted
)
){
return false;
}

lastSilentRefreshMs =
now;

const sb =
await getSupabase();

if(
!sb
){
return false;
}

try{
const { data, error } =
await withTimeout(
sb.auth.refreshSession(),
authNetworkTimeoutMs(
"refreshSession silent"
),
"refreshSession silent"
);

if(
error
){

if(
isFatalAuthRefreshError(
error
)
){
blockAuthRefreshRetries(
"silent refresh"
);
return false;
}

warnAuthOnce(
"auth-degraded",
`[auth] silent refresh: ${error.message}`
);
return false;
}

if(
!data?.session
){
return false;
}

await applySession(
data.session
);
syncCloudLoginFromStorage();
return true;
}catch(
err
){

const msg =
String(
err?.message ||
err
);

if(
isFatalAuthRefreshError(
err
) ||
/timeouts?/i.test(
msg
)
){
blockAuthRefreshRetries(
"silent refresh"
);
return false;
}

warnAuthOnce(
"auth-degraded",
`[auth] silent refresh: ${msg}`
);
return false;

}

}

const favoritesListeners = new Set();
const drawingsListeners = new Set();

let settingsChannel = null;
let realtimeUserId = null;
let syncPollTimer = null;
let realtimeReconnectTimer = null;
let drawingsPushTimer = null;
let pendingDrawingsCloudPush = false;

const SYNC_POLL_MS = 5000;
const DRAWINGS_PUSH_DEBOUNCE_MS = 250;

const flushAuthListeners =
createNotifyDebouncer(
400
);

function notifyAuth(){

flushAuthListeners(
()=>{

authListeners.forEach(
fn=>{

try{
fn();
}catch{
/* ignore */
}

}
);

}
);

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

export function notifyFavoritesListeners(){

notifyFavorites();

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

export function notifyDrawings(symbols){

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

/** Локальное изменение рисунков — чтобы sync не перезаписал облаком. */
export function bumpDrawingsLocalRevision(){

saveLocalDrawingsUpdatedAt(
new Date().toISOString()
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

function saveDrawingsSyncedSignature(
snap
){

localStorage.setItem(
DRAWINGS_SYNCED_SIG_KEY,
drawingsFullSignature(
snap
)
);

}

function drawingsSyncSnapshot(){

return {
shapes: collectAllLocalDrawings(),
tombstones: loadLocalTombstones()
};

}

function drawingsFullSignature(
snap
){

const s =
snap ||
drawingsSyncSnapshot();

return (
drawingsSignature(
s.shapes
) +
"\n@" +
JSON.stringify(
s.tombstones || {}
)
);

}

function hasUnsyncedDrawings(){

return drawingsFullSignature() !== (
localStorage.getItem(
DRAWINGS_SYNCED_SIG_KEY
) || ""
);

}

export function scheduleDrawingsCloudPush(){

if(
!loggedIn
){
pendingDrawingsCloudPush =
true;
return;
}

void import("./drawings-cloud-sync.js?v=42").then(
m=>{
m.scheduleDrawingsCloudPush();
}
);

}

export function flushDrawingsCloudPush(){

if(
!loggedIn
){
pendingDrawingsCloudPush =
true;
return Promise.resolve();
}

pendingDrawingsCloudPush =
false;

return import("./drawings-cloud-sync.js?v=42").then(
m=>
m.flushDrawingsCloudPush()
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

const unpacked =
unpackCloudDrawings(
data.drawings
);

return {
favorites: normalizeFavoritesList(
data.favorites
),
updatedAt: data.updated_at || "",
drawings: unpacked.shapes,
drawingsTombstones: unpacked.tombstones,
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

return map;

}

async function applyDrawingsLocally(
drawings,
tombstones,
updatedAt
){

const before =
collectAllLocalDrawings();

const shapes =
await applyAlertFlagsToDrawingsMap(
drawings
);

applyDrawingsMapToLocal(
shapes
);

saveLocalTombstones(
mergeTombstoneMaps(
loadLocalTombstones(),
tombstones ||
{}
)
);

const changed =
new Set([
...Object.keys(
before
),
...Object.keys(
shapes
)
]);

if(updatedAt){
saveLocalDrawingsUpdatedAt(updatedAt);
}

saveDrawingsSyncedSignature(
drawingsSyncSnapshot()
);

notifyDrawings(
Array.from(changed)
);

return shapes;

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
!loggedIn
){
return;
}

pullRemoteSettingsIfNewer();

},
scaleSupabasePollMs(
SYNC_POLL_MS
)
);

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

void import("./drawings-cloud-sync.js?v=42").then(
m=>{
m.stopDrawingsCloudSync();
}
);

if(realtimeReconnectTimer){
clearTimeout(realtimeReconnectTimer);
realtimeReconnectTimer = null;
}

teardownSettingsRealtime();
realtimeUserId = null;

}

function scheduleRealtimeReconnect(){

if(
realtimeReconnectTimer ||
!isCloudAuthTokenUsable() ||
Date.now() <
cloudApiPausedUntil
){
return;
}

realtimeReconnectTimer = setTimeout(async()=>{

realtimeReconnectTimer = null;

if(
!loggedIn ||
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

if(
!loggedIn
){
return;
}

if(
!isCloudAuthTokenUsable()
){
void tryCloudAuthRecovery();
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

if(
isFavoritesCloudDisabled()
){
return;
}

void import("./favorites-cloud-sync.js?v=3").then(
m=>{
m.applyFavoritesFromRealtimeRow(
row
);
}
).catch(
()=>{

if(
!row
){
return;
}

applyFavoritesLocally(
normalizeFavoritesList(
row.favorites
),
row.updated_at ||
""
);

}
);

}

function handleRealtimeSettingsRow(row){

handleRealtimeFavoritesRow(row);

if(
isDrawingsCloudDisabled()
){
return;
}

void import("./drawings-cloud-sync.js?v=42").then(
m=>
m.pullDrawingsFromCloud()
);

}

async function setupSettingsRealtime(userId){

if(
isSupabaseRealtimeDisabled()
){
return;
}

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
.channel(
`user_settings:${userId}`,
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
console.log(
"[cloud] realtime: user_settings"
);
return;
}

if(status === "CLOSED"){
return;
}

if(
status === "CHANNEL_ERROR" ||
status === "TIMED_OUT"
){

if(
!isCloudAuthTokenUsable()
){
reportCloudAuthFailure(
"realtime",
status
);
return;
}

warnAuthOnce(
"settings-realtime",
`settings realtime: ${status}`
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

const drawingsCloud =
await import("./drawings-cloud-sync.js?v=42");

await drawingsCloud.hydrateDrawingsAfterAuth();

return collectAllLocalDrawings();

}

export async function pullDrawingsIfCloudNewer(){

await import("./drawings-cloud-sync.js?v=42").then(
m=>
m.pullDrawingsFromCloud()
);

return collectAllLocalDrawings();

}

async function syncFavoritesWithCloud(){

const m =
await import("./favorites-cloud-sync.js?v=3");

await m.reconcileLocalFavoritesWithCloud();

}

async function syncDrawingsWithCloud(){

const m =
await import("./drawings-cloud-sync.js?v=42");

await m.flushDrawingsCloudPush();

}

export async function pullRemoteSettingsIfNewer(){

if(
!isFavoritesCloudDisabled()
){
await syncFavoritesWithCloud();
}

if(
!isAlertsPage() &&
!isDrawingsCloudDisabled()
){
await syncDrawingsWithCloud();
}

}

export async function persistAllDrawingsToCloud(){

return flushDrawingsCloudPush();

}

export async function persistFavoritesToCloud(
favorites
){

const m =
await import("./favorites-cloud-sync.js?v=3");

m.pushFavoritesAfterLocalEdit(
favorites
);

}

export function buildAuthRedirectUrl(){

const origin =
window.location.origin;
let path =
window.location.pathname || "/";

if(
path.endsWith("/screener.html")
){
path =
path.slice(
0,
-"/screener.html".length
) || "/";
}

return `${origin}${path}`;

}

const DESKTOP_AUTH_CALLBACK =
"multichart://auth/callback";

const DESKTOP_AUTH_DEEP_LINK_MIN =
"1.0.6";

function parseAppSemver(
version
){

const parts =
String(
version ||
"0"
).split(
"."
).map(
n=>
parseInt(
n,
10
) ||
0
);

return {
major:
parts[
0
] ||
0,
minor:
parts[
1
] ||
0,
patch:
parts[
2
] ||
0
};

}

function isAtLeastAppVersion(
version,
minVersion
){

const a =
parseAppSemver(
version
);
const b =
parseAppSemver(
minVersion
);

if(
a.major !==
b.major
){
return a.major >
b.major;
}

if(
a.minor !==
b.minor
){
return a.minor >
b.minor;
}

return a.patch >=
b.patch;

}

export async function buildAuthRedirectUrlAsync(){

const desktop =
window.cryptoTerminalDesktop;

if(
desktop?.isDesktop
){

try{
const info =
await desktop.getVersion();

if(
isAtLeastAppVersion(
info?.app,
DESKTOP_AUTH_DEEP_LINK_MIN
)
){
return DESKTOP_AUTH_CALLBACK;
}

if(
info?.bundledUi
){
return DESKTOP_AUTH_CALLBACK;
}

const origin =
info?.apiOrigin
? new URL(
info.apiOrigin
).origin
: info?.url && !String(
info.url
).startsWith(
"multichart:"
)
? new URL(
info.url
).origin
: "https://crypto-terminal-v2.vercel.app";

return `${origin}/`;

}catch{
return DESKTOP_AUTH_CALLBACK;
}

}

return buildAuthRedirectUrl();

}

function hasAuthCallbackInParts(
search,
hash
){

return (
(hash ||
"").includes(
"access_token="
) ||
(hash ||
"").includes(
"error="
) ||
(search ||
"").includes(
"code="
)
);

}

export function hasAuthCallbackInUrl(
rawUrl
){

if(
rawUrl
){

try{
const parsed =
new URL(
String(
rawUrl
).trim()
);
return hasAuthCallbackInParts(
parsed.search,
parsed.hash
);
}catch{
return false;
}

}

return hasAuthCallbackInParts(
window.location.search,
window.location.hash
);

}

function clearAuthCallbackFromUrl(){

if(
!hasAuthCallbackInUrl()
){
return;
}

const clean =
`${window.location.pathname || "/"}${window.location.search || ""}`;

history.replaceState(
null,
"",
clean
);

}

function readAuthHashParams(
hashFromUrl
){

const raw =
(
hashFromUrl !==
undefined
? hashFromUrl
: window.location.hash ||
""
).replace(
/^#/,
""
);

if(!raw){
return null;
}

const params =
new URLSearchParams(raw);

const access_token =
params.get("access_token");

if(!access_token){
return {
error:
params.get("error_description") ||
params.get("error") ||
""
};
}

return {
access_token,
refresh_token:
params.get("refresh_token") || "",
error: ""
};

}

async function recoverSessionFromAuthUrl(
sb,
rawUrl
){

let search =
"";
let hash =
"";

if(
rawUrl
){

try{
const parsed =
new URL(
String(
rawUrl
).trim()
);
search =
parsed.search ||
"";
hash =
parsed.hash ||
"";
}catch{
return null;
}

}else{
search =
window.location.search ||
"";
hash =
window.location.hash ||
"";
}

if(
!sb ||
!hasAuthCallbackInParts(
search,
hash
)
){
return null;
}

const fromExternal =
!!rawUrl;

const searchParams =
new URLSearchParams(
search
);
const code =
searchParams.get("code");

if(code){

const { data, error } =
await sb.auth.exchangeCodeForSession(code);

if(error){
console.warn(
"[auth] exchangeCodeForSession:",
error.message
);
return null;
}

if(
!fromExternal
){
clearAuthCallbackFromUrl();
}

return data.session || null;

}

const hashParams =
readAuthHashParams(
hash
);

if(
hashParams?.error
){
console.warn(
"[auth] magic link:",
hashParams.error
);
if(
!fromExternal
){
clearAuthCallbackFromUrl();
}
return null;
}

if(
!hashParams?.access_token
){
return null;
}

async function trySetSession(){

const { data, error } =
await sb.auth.setSession({
access_token: hashParams.access_token,
refresh_token: hashParams.refresh_token
});

if(error){
throw error;
}

return data.session || null;

}

try{

const session =
await trySetSession();

if(
session &&
!fromExternal
){
clearAuthCallbackFromUrl();
}

return session;

}catch(err){

console.warn(
"[auth] setSession from hash:",
err?.message || err
);

try{
localStorage.removeItem(
SUPABASE_AUTH_STORAGE_KEY
);
}catch{
/* ignore */
}

try{

const session =
await trySetSession();

if(
session &&
!fromExternal
){
clearAuthCallbackFromUrl();
}

return session;

}catch(retryErr){
console.warn(
"[auth] setSession retry:",
retryErr?.message || retryErr
);
return null;
}

}

}

export async function completeAuthFromCallbackUrl(
rawUrl
){

if(
!rawUrl ||
typeof rawUrl !==
"string"
){
return {
ok:
false,
message:
"Пустая ссылка"
};
}

const trimmed =
rawUrl.trim();

if(
!(await isSupabaseConfigured())
){
return {
ok:
false,
message:
"Supabase не настроен"
};
}

if(
!hasAuthCallbackInUrl(
trimmed
)
){
return {
ok:
false,
message:
"В ссылке нет данных для входа. Скопируйте URL после перехода по письму (с code= или access_token)."
};
}

const sb =
await getSupabase();

if(
!sb
){
return {
ok:
false,
message:
"Supabase недоступен"
};
}

const recovered =
await recoverSessionFromAuthUrl(
sb,
trimmed
);

if(
!recovered
){
return {
ok:
false,
message:
"Ссылка устарела или уже использована. Запросите новую."
};
}

await applySession(
recovered
);

return {
ok:
true
};

}

export async function recoverAuthSessionFromUrl(){

if(
!(await isSupabaseConfigured())
){
return false;
}

const sb =
await getSupabase();

if(!sb){
return false;
}

const recovered =
await recoverSessionFromAuthUrl(sb);

if(
!recovered
){
return false;
}

await applySession(recovered);
return true;

}

export async function signInWithEmailOtp(email){

const sb =
await getSupabase();

if(!sb){
throw new Error("Supabase не настроен");
}

const redirectTo =
await buildAuthRedirectUrlAsync();

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

markExplicitAuthSignOut();

loggedIn = false;
userEmail = "";

try{

const keys = [];

for(
let i = 0;
i < localStorage.length;
i++
){

const key =
localStorage.key(i);

if(
key?.startsWith("sb-") &&
key.endsWith("-auth-token")
){
keys.push(key);
}

}

keys.forEach(k=>{
localStorage.removeItem(k);
});

localStorage.removeItem(
SUPABASE_AUTH_STORAGE_KEY
);

const localKeys = [];

for(
let i = 0;
i < localStorage.length;
i++
){

const key =
localStorage.key(i);

if(
key?.startsWith("drawings_") ||
key === "price_alerts_v1" ||
key === "price_alerts_history_v1"
){
localKeys.push(key);
}

}

localKeys.forEach(k=>{
localStorage.removeItem(k);
});

}catch{
/* ignore */
}

const { clearAlertAuthCache } =
await import("./alert-auth-cache.js?v=7");

clearAlertAuthCache();

stopCloudSyncHelpers();
notifyAuth();

try{

const sb =
await withTimeout(
getSupabase(),
4000,
"getSupabase signOut"
);

if(
sb
){
await withTimeout(
sb.auth.signOut(),
4000,
"signOut"
);
}

}catch(err){
console.warn(
"signOut:",
err?.message || err
);
}

}

export function isCloudLoggedInEffective(){

return (
isCloudAuthTokenUsable() &&
(
isCloudLoggedIn() ||
!!readAlertTokenSync()?.user?.id
)
);

}

export function getEffectiveCloudUserEmail(){

return (
userEmail ||
readAlertTokenSync()?.user?.email ||
""
);

}

export async function ensureCloudLoginResolved(
maxWaitMs = 12000
){

if(
isCloudLoggedIn()
){
return true;
}

await waitForCloudAuth(
maxWaitMs
);

if(
isCloudLoggedIn()
){
return true;
}

const cached =
readPersistedAuthSession() ||
readAlertTokenSync();

if(
!cached?.access_token ||
!cached?.user
){
return false;
}

const sb =
await getSupabase();

let session =
cached;

if(
sb
){
session =
await restoreSessionFromPersisted(
sb
) ||
session;
}

await applySession(
session
);

return loggedIn;

}

async function applySession(session){

if(
session?.refresh_token
){
clearAuthRefreshBlock();
authRefreshBlockedUntil =
0;
resumeCloudApi();
}

if(
session?.access_token &&
session?.user &&
!session.refresh_token
){
const persisted =
readPersistedAuthSession();

if(
persisted?.refresh_token &&
persisted?.user?.id ===
session.user?.id &&
!isAuthRefreshBlockedNow()
){
session = {
...session,
refresh_token: persisted.refresh_token,
expires_at: persisted.expires_at
};
}
}

const sessionKey =
session?.user?.id &&
session?.access_token
? `${session.user.id}:${session.access_token}`
: "__signed_out__";

if(
sessionKey ===
lastAppliedSessionKey
){
return;
}

lastAppliedSessionKey =
sessionKey;

loggedIn = !!session?.user;
userEmail = session?.user?.email || "";

if(
!loggedIn
){
syncCloudLoginFromStorage();
notifyAuth();
stopCloudSyncHelpers();
return;
}

const sb =
await getSupabase();

if(
sb &&
session?.access_token
){

try{
await withTimeout(
sb.auth.setSession({
access_token: session.access_token,
refresh_token: session.refresh_token || ""
}),
5000,
"setSession apply"
);
}catch{
/* ignore */
}

const { warmAlertAuthCache } =
await import("./alert-auth-cache.js?v=7");

warmAlertAuthCache(
sb,
session
);
}

syncCloudLoginFromStorage();
notifyAuth();

if(
!loggedIn
){
stopCloudSyncHelpers();
return;
}

void applySessionCloudWork(
session
);

}

async function applySessionCloudWork(
session
){

if(
!session?.user?.id
){
return;
}

try{

const favoritesCloud =
await import("./favorites-cloud-sync.js?v=3");

if(
!isFavoritesCloudDisabled()
){
await favoritesCloud.reconcileLocalFavoritesWithCloud();
}

const drawingsCloud =
await import("./drawings-cloud-sync.js?v=42");

if(
!isAlertsPage() &&
!isDrawingsCloudDisabled()
){
await drawingsCloud.hydrateDrawingsAfterAuth();
if(
!isSupabaseRealtimeDisabled()
){
await drawingsCloud.setupDrawingsRealtimeForUser(
session.user.id
);
}
}else{
drawingsCloud.stopDrawingsFastPoll();
}

if(
!isSupabaseRealtimeDisabled()
){
await setupSettingsRealtime(
session.user.id
);
}

if(
!isAlertsPage()
){
startSyncPoll();
}

if(
pendingDrawingsCloudPush &&
!isDrawingsCloudDisabled()
){
pendingDrawingsCloudPush =
false;
void drawingsCloud.flushDrawingsCloudPush();
}

if(
!isAlertsPage() &&
!isAlertsCloudDisabled()
){
const alertsCloud =
await import("./alerts-cloud-sync.js?v=110");

await alertsCloud.hydrateAlertsAfterAuth({
force: true
});
if(
!isSupabaseRealtimeDisabled()
){
await alertsCloud.setupAlertsRealtimeForUser(
session.user.id
);
}
}

}catch(
err
){
console.warn(
"cloud session sync:",
err?.message || err
);

}

}

function bindRemotePullTriggers(){

const wake = ()=>{

if(
document.visibilityState ===
"hidden"
){

if(
loggedIn
){
void flushDrawingsCloudPush();
}

return;
}

if(
!isAlertsPage() &&
(
loggedIn ||
isCloudLoggedInEffective()
) &&
!isAutoDevicePullDisabled()
){
void pullDeviceStateFromCloud();
}

if(
!isAlertsPage()
){
refreshCloudConnection().catch(()=>{
/* ignore */
});
}

if(
document.visibilityState ===
"visible" &&
!isAuthRefreshBlockedNow()
){
restoreAuthSessionFromBackup();
void refreshAuthSessionSilent();
}

};

document.addEventListener(
"visibilitychange",
wake
);

window.addEventListener(
"pageshow",
e=>{

wake();

if(
e.persisted &&
hasAuthCallbackInUrl()
){
void recoverAuthSessionFromUrl();
}

}
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

let pullDeviceInflight =
null;

let lastPullDeviceMs =
0;

const PULL_DEVICE_MIN_MS =
2500;

/**
 * Загрузить рисунки и алерты из Supabase на это устройство (iPad после входа с Mac).
 */
export async function pullDeviceStateFromCloud(){

if(
isAutoDevicePullDisabled()
){
return {
ok: true,
skipped: true,
reason: "auto_pull_disabled"
};
}

if(
!isCloudLoggedInEffective()
){
console.warn(
"[Multichart] нет входа на этом устройстве — шестерёнка → email → ссылка из письма"
);
return {
ok: false,
reason: "no_auth"
};
}

const now =
Date.now();

if(
pullDeviceInflight
){
return pullDeviceInflight;
}

if(
now -
lastPullDeviceMs <
PULL_DEVICE_MIN_MS
){
return {
ok: true,
skipped: true
};
}

pullDeviceInflight =
pullDeviceStateFromCloudImpl().finally(
()=>{

pullDeviceInflight =
null;
lastPullDeviceMs =
Date.now();

}
);

return pullDeviceInflight;

}

async function pullDeviceStateFromCloudImpl(){

try{
await ensureCloudLoginResolved(
10000
);

const alertsCloud =
await import("./alerts-cloud-sync.js?v=110");
const favoritesCloud =
await import("./favorites-cloud-sync.js?v=3");
const { stripAlertFlagsNotInRegistry } =
await import("./alerts.js?v=97");

const stripOpts =
isAlertsPage()
? {
registryOnlySymbols: true,
emitDrawingsEvents: false
}
: {};

let drawSyms =
0;
let alertRows =
0;

const jobs =
[];

if(
!isAlertsPage() &&
!isDrawingsCloudDisabled()
){

jobs.push(
import("./drawings-cloud-sync.js?v=42").then(
m=>
m.pullDrawingsFromCloudNow()
)
);

}

if(
!isAlertsCloudDisabled()
){

jobs.push(
alertsCloud.hydrateAlertsAfterAuth({
force: true
})
);

}

if(
!isFavoritesCloudDisabled()
){

jobs.push(
favoritesCloud.pullFavoritesFromCloudNow()
);

}

if(
!jobs.length
){

return {
ok: true,
skipped: true
};

}

const results =
await withTimeout(
Promise.all(
jobs
),
25000,
"pull device from cloud"
);

let idx =
0;

if(
!isAlertsPage() &&
!isDrawingsCloudDisabled()
){

drawSyms =
results[
idx++
] ??
0;
}

if(
!isAlertsCloudDisabled()
){

alertRows =
results[
idx++
] ??
0;
}

stripAlertFlagsNotInRegistry(
stripOpts
);

window.dispatchEvent(
new CustomEvent(
"alerts-registry-pulled"
)
);
window.dispatchEvent(
new CustomEvent(
"alerts-changed"
)
);
window.dispatchEvent(
new CustomEvent(
"draw-tools-access-changed"
)
);

const favGroups =
loadFavoritesGroups();
const favTotal =
favGroups.red.length +
favGroups.green.length +
favGroups.gray.length;

console.log(
"[Multichart] загружено из облака: рисунки —",
drawSyms,
"| алерты —",
alertRows,
"| флаги —",
favTotal
);

return {
ok: true,
drawSyms,
alertRows,
favCount: favTotal
};

}catch(
err
){
console.warn(
"[Multichart] загрузка из облака:",
err?.message || err
);
return {
ok: false,
reason: "error"
};

}

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

if(
hasAuthCallbackInUrl()
){
const recovered =
await recoverSessionFromAuthUrl(sb);

if(
recovered?.user
){
return {
sb,
user: recovered.user
};
}

}

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

let cloudSyncInitPromise = null;

export async function initCloudSync(){

if(cloudSyncInitPromise){
return cloudSyncInitPromise;
}

cloudSyncInitPromise = initCloudSyncImpl();
return cloudSyncInitPromise;

}

async function initCloudSyncImpl(){

const hasEnv =
await isSupabaseConfigured();

if(!hasEnv){
configured = false;
notifyAuth();
return;
}

configured = true;
await restoreDesktopAuthSession();
bootstrapAuthFromLocalStorage();
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

let session =
(await recoverSessionFromAuthUrl(
sb
)) ||
null;

if(
!session &&
!isAuthRefreshBlockedNow()
){
restoreAuthSessionFromBackup();
session =
await restoreSessionFromPersisted(
sb
);
}

if(
!session &&
!isAuthRefreshBlockedNow()
){

try{

const { data } =
await withTimeout(
sb.auth.getSession(),
authNetworkTimeoutMs(
"getSession"
),
"getSession"
);

session = data?.session ?? null;

}catch(
err
){

warnAuthOnce(
"auth-degraded",
`[auth] getSession: ${err?.message || err}`
);
session = null;

}

}

if(
!session
){
const cached =
readPersistedAuthSession();

if(
cached?.access_token &&
cached?.user &&
!isAccessTokenExpired(
cached
)
){
session =
cached;
}
}

if(
!session &&
hasAuthCallbackInUrl()
){

await new Promise(r=>{
setTimeout(r, 150);
});

session =
(await recoverSessionFromAuthUrl(sb)) ||
(await sb.auth.getSession()).data.session;

}

await applySession(session);

bindRemotePullTriggers();

if(
hasAuthCallbackInUrl() &&
!loggedIn
){
window.setTimeout(()=>{
void recoverAuthSessionFromUrl().then(ok=>{
if(ok){
console.log(
"[auth] вход восстановлен из ссылки"
);
}
});
}, 400);
}

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
event ===
"SIGNED_OUT"
){

const restored =
await tryRecoverSignedOutSession(
sb
);

if(
restored
){
await applySession(
restored
);
return;
}

loggedIn = false;
userEmail = "";
stopCloudSyncHelpers();

const { clearAlertAuthCache } =
await import("./alert-auth-cache.js?v=7");

clearAlertAuthCache();

notifyAuth();
}

}
);

bindSafariAuthKeepalive();

}
