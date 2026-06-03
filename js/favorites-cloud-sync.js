/**
 * Синхронизация флагов: user_settings.favorites (REST + realtime).
 */
import {
isCloudLoggedInEffective,
onCloudSyncChange,
notifyFavoritesListeners,
isCloudApiUsable,
isCloudAuthError,
reportCloudAuthFailure,
tryCloudAuthRecovery
} from "./cloud-sync.js?v=33";

import {
isFavoritesCloudDisabled
} from "./supabase-usage-prefs.js?v=1";

import {
loadFavoritesGroups,
saveFavoritesGroups,
favoritesToCloudList,
favoritesFromCloudList,
favoritesGroupsEqual,
favoritesSignature
} from "./favorites.js?v=1";

import {
readAlertTokenSync,
resolveAlertAuthFast
} from "./alert-auth-cache.js?v=7";

import {
createPullCoalescer
} from "./cloud-sync-throttle.js?v=3";

const FAVORITES_LOCAL_TS_KEY =
"favorites_local_updated_at";

const FAVORITES_SYNCED_SIG_KEY =
"favorites_synced_signature";

const coalesceFavoritesPull =
createPullCoalescer({
minIntervalMs: 1500,
errorBackoffMs: 6000
});

let ready =
false;

let pushInFlight =
null;

let authPullTimer =
null;

function loadLocalFavoritesUpdatedAt(){

return (
localStorage.getItem(
FAVORITES_LOCAL_TS_KEY
) ||
""
);

}

function saveLocalFavoritesUpdatedAt(
iso
){

if(
iso
){
localStorage.setItem(
FAVORITES_LOCAL_TS_KEY,
iso
);
}

}

function saveFavoritesSyncedSignature(
groups
){

localStorage.setItem(
FAVORITES_SYNCED_SIG_KEY,
favoritesSignature(
groups
)
);

}

function hasUnsyncedFavorites(){

return favoritesSignature(
loadFavoritesGroups()
) !== (
localStorage.getItem(
FAVORITES_SYNCED_SIG_KEY
) ||
""
);

}

function tsMs(
iso
){

if(
!iso
){
return 0;
}

const n =
Date.parse(
iso
);

return Number.isFinite(
n
)
? n
: 0;

}

function isTsNewer(
a,
b
){

return tsMs(
a
) >
tsMs(
b
);

}

function normalizeFavoritesList(
list
){

if(
!Array.isArray(
list
)
){
return [];
}

return list.filter(
s=>typeof s ===
"string"
);

}

/** Вызвать сразу при клике по флагу — до push в облако. */
export function markFavoritesDirty(){

saveLocalFavoritesUpdatedAt(
new Date().toISOString()
);

try{
localStorage.removeItem(
FAVORITES_SYNCED_SIG_KEY
);
}catch{
/* ignore */
}

}

function applyCloudFavorites(
list,
updatedAt
){

saveFavoritesGroups(
favoritesFromCloudList(
list
)
);

if(
updatedAt
){
saveLocalFavoritesUpdatedAt(
updatedAt
);
}

saveFavoritesSyncedSignature(
loadFavoritesGroups()
);

notifyFavoritesListeners();

}

async function getSupabaseHttpConfig(){

const env =
await import("./supabase-env.js?v=5");

const base =
String(
env.SUPABASE_URL ||
""
).replace(
/\/$/,
""
);
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

async function resolveFavoritesRestAuth(){

const snap =
readAlertTokenSync();

if(
snap?.token &&
snap?.user?.id
){
return {
token: snap.token,
userId: snap.user.id
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

return null;

}

async function fetchWithTimeout(
url,
options,
ms = 12000
){

const controller =
new AbortController();

const timer =
setTimeout(
()=>{
controller.abort();
},
ms
);

try{
return await fetch(
url,
{
...options,
signal: controller.signal
}
);
}finally{
clearTimeout(
timer
);
}

}

async function fetchFavoritesViaRest(
auth
){

const http =
await getSupabaseHttpConfig();

if(
!http ||
!auth?.token ||
!auth?.userId
){
return null;
}

const uid =
encodeURIComponent(
auth.userId
);

try{
const res =
await fetchWithTimeout(
`${http.base}/rest/v1/user_settings?user_id=eq.${uid}&select=favorites,updated_at`,
{
method: "GET",
headers: {
apikey: http.anon,
Authorization: `Bearer ${auth.token}`,
Accept: "application/json",
"Cache-Control": "no-cache"
},
cache: "no-store"
},
12000
);

if(
!res.ok
){
const text =
await res.text();

if(
res.status ===
401 ||
isCloudAuthError(
text
)
){
reportCloudAuthFailure(
"favorites fetch",
text
);
return null;
}

console.warn(
"[favorites] fetch REST:",
res.status
);
return null;
}

const rows =
await res.json();

const row =
Array.isArray(
rows
)
? rows[0]
: null;

if(
!row
){
return {
favorites: [],
updatedAt: ""
};

}

return {
favorites: normalizeFavoritesList(
row.favorites
),
updatedAt: row.updated_at ||
""
};

}catch(
err
){
console.warn(
"[favorites] fetch REST:",
err?.message || err
);
return null;

}

}

async function pushFavoritesViaRest(
auth,
list
){

const http =
await getSupabaseHttpConfig();

if(
!http ||
!auth?.token ||
!auth?.userId
){
return null;
}

const uid =
encodeURIComponent(
auth.userId
);
const updatedAt =
new Date().toISOString();

try{
let res =
await fetchWithTimeout(
`${http.base}/rest/v1/user_settings?user_id=eq.${uid}`,
{
method: "PATCH",
headers: {
apikey: http.anon,
Authorization: `Bearer ${auth.token}`,
Accept: "application/json",
"Content-Type": "application/json",
Prefer: "return=representation"
},
body: JSON.stringify({
favorites: list,
updated_at: updatedAt
})
},
15000
);

if(
res.status ===
404 ||
res.status ===
406
){

res =
await fetchWithTimeout(
`${http.base}/rest/v1/user_settings`,
{
method: "POST",
headers: {
apikey: http.anon,
Authorization: `Bearer ${auth.token}`,
Accept: "application/json",
"Content-Type": "application/json",
Prefer: "return=representation"
},
body: JSON.stringify({
user_id: auth.userId,
favorites: list,
updated_at: updatedAt,
drawings: {},
drawings_updated_at: updatedAt
})
},
15000
);

}

if(
!res.ok
){
const text =
await res.text();

if(
res.status ===
401 ||
isCloudAuthError(
text
)
){
reportCloudAuthFailure(
"favorites push",
text
);
return null;
}

console.warn(
"[favorites] push REST:",
res.status,
text.slice(
0,
120
)
);
return null;
}

const rows =
await res.json();

const row =
Array.isArray(
rows
)
? rows[0]
: rows;

return (
row?.updated_at ||
updatedAt
);

}catch(
err
){
console.warn(
"[favorites] push REST:",
err?.message || err
);
return null;

}

}

/**
 * Побеждает более новый updated_at. hasUnsynced не перетирает более свежее облако.
 */
export async function reconcileLocalFavoritesWithCloud(){

if(
isFavoritesCloudDisabled()
){
return favoritesToCloudList(
loadFavoritesGroups()
);
}

if(
!isCloudLoggedInEffective()
){
return favoritesToCloudList(
loadFavoritesGroups()
);

}

if(
!isCloudApiUsable()
){
void tryCloudAuthRecovery();
return favoritesToCloudList(
loadFavoritesGroups()
);

}

if(
pushInFlight
){
try{
await pushInFlight;
}catch{
/* ignore */
}
}

const auth =
await resolveFavoritesRestAuth();

if(
!auth
){
return favoritesToCloudList(
loadFavoritesGroups()
);

}

const localGroups =
loadFavoritesGroups();
const localList =
favoritesToCloudList(
localGroups
);
const localTs =
loadLocalFavoritesUpdatedAt();

const cloud =
await fetchFavoritesViaRest(
auth
);

if(
!cloud
){
return localList;
}

const cloudGroups =
favoritesFromCloudList(
cloud.favorites
);

if(
favoritesGroupsEqual(
localGroups,
cloudGroups
)
){

if(
cloud.updatedAt
){
saveLocalFavoritesUpdatedAt(
cloud.updatedAt
);
}

saveFavoritesSyncedSignature(
localGroups
);
return localList;

}

const cloudNewer =
cloud.updatedAt &&
(
!localTs ||
isTsNewer(
cloud.updatedAt,
localTs
)
);
const localNewer =
localTs &&
cloud.updatedAt &&
isTsNewer(
localTs,
cloud.updatedAt
);

if(
cloudNewer &&
!localNewer
){

applyCloudFavorites(
cloud.favorites,
cloud.updatedAt
);

console.log(
"[favorites] с облака:",
cloud.favorites.length,
"флагов"
);

return cloud.favorites;

}

if(
localList.length >
0 ||
hasUnsyncedFavorites() ||
!cloud.updatedAt
){

const ts =
await pushFavoritesViaRest(
auth,
localList
);

if(
ts
){
saveLocalFavoritesUpdatedAt(
ts
);
saveFavoritesSyncedSignature(
localGroups
);

console.log(
"[favorites] в облако:",
localList.length,
"флагов"
);

}else{
console.warn(
"[favorites] push не удался"
);
}

return localList;

}

applyCloudFavorites(
cloud.favorites,
cloud.updatedAt
);

return cloud.favorites;

}

export async function pullFavoritesFromCloudNow(){

if(
isFavoritesCloudDisabled()
){
return;
}

return coalesceFavoritesPull(
()=>reconcileLocalFavoritesWithCloud()
);

}

async function pushFavoritesImpl(
list
){

if(
isFavoritesCloudDisabled()
){
return false;
}

if(
!isCloudApiUsable()
){
return false;
}

const auth =
await resolveFavoritesRestAuth();

if(
!auth
){
return false;
}

const normalized =
normalizeFavoritesList(
list
);
const groups =
favoritesFromCloudList(
normalized
);

saveFavoritesGroups(
groups
);

const ts =
await pushFavoritesViaRest(
auth,
normalized
);

if(
ts
){
saveLocalFavoritesUpdatedAt(
ts
);
saveFavoritesSyncedSignature(
groups
);
return true;
}

return false;

}

export async function persistFavoritesToCloudNow(
favorites
){

const list =
Array.isArray(
favorites
)
? favorites
: favoritesToCloudList(
favorites
);

markFavoritesDirty();

const job =
pushFavoritesImpl(
list
);

pushInFlight =
job.finally(
()=>{

if(
pushInFlight ===
job
){
pushInFlight =
null;
}

}
);

return job;

}

/** После клика по флагу: сразу push (не только debounce). */
export function pushFavoritesAfterLocalEdit(
favorites
){

markFavoritesDirty();

void persistFavoritesToCloudNow(
favorites
).catch(
err=>{
console.warn(
"[favorites] push after edit:",
err?.message || err
);
}
);

}

export function scheduleFavoritesCloudPush(
favorites
){

pushFavoritesAfterLocalEdit(
favorites
);

}

export function applyFavoritesFromRealtimeRow(
row
){

if(
!row
){
return;
}

const cloudFavorites =
normalizeFavoritesList(
row.favorites
);
const localGroups =
loadFavoritesGroups();
const cloudGroups =
favoritesFromCloudList(
cloudFavorites
);
const cloudTs =
row.updated_at ||
"";
const localTs =
loadLocalFavoritesUpdatedAt();

if(
favoritesGroupsEqual(
localGroups,
cloudGroups
)
){

if(
cloudTs
){
saveLocalFavoritesUpdatedAt(
cloudTs
);
}

saveFavoritesSyncedSignature(
localGroups
);
return;

}

if(
localTs &&
cloudTs &&
isTsNewer(
localTs,
cloudTs
) &&
hasUnsyncedFavorites()
){
return;
}

applyCloudFavorites(
cloudFavorites,
cloudTs
);

}

function scheduleAuthPull(){

if(
authPullTimer
){
clearTimeout(
authPullTimer
);
}

authPullTimer =
setTimeout(
()=>{

authPullTimer =
null;

void pullFavoritesFromCloudNow().catch(
()=>{}
);

},
900
);

}

export function initFavoritesCloudSync(){

if(
ready
){
return;
}

ready =
true;

onCloudSyncChange(
()=>{

if(
!isCloudLoggedInEffective()
){
return;
}

scheduleAuthPull();

}
);

const pullWhenVisible =
()=>{

if(
!isCloudLoggedInEffective()
){
return;
}

if(
document.visibilityState ===
"hidden"
){
return;
}

void pullFavoritesFromCloudNow().catch(
()=>{}
);

};

document.addEventListener(
"visibilitychange",
pullWhenVisible
);

window.addEventListener(
"focus",
pullWhenVisible
);

if(
isCloudLoggedInEffective()
){
scheduleAuthPull();
}

console.log(
"[favorites] sync: user_settings.favorites (ts wins)"
);

}
