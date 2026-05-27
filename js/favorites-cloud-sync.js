/**
 * Синхронизация флагов избранного через user_settings.favorites (REST + realtime в cloud-sync).
 * Отдельная таблица не нужна — колонка уже есть в Supabase.
 */
import {
isCloudLoggedIn,
isCloudLoggedInEffective,
onCloudSyncChange,
notifyFavoritesListeners
} from "./cloud-sync.js?v=23";

import {
loadFavoritesGroups,
saveFavoritesGroups,
favoritesToCloudList,
favoritesFromCloudList,
favoritesGroupsEqual,
favoritesSignature
} from "./favorites.js?v=1";

import {
readAlertTokenSync
} from "./alert-auth-cache.js?v=4";

import {
createPullCoalescer,
isAlertsPage
} from "./cloud-sync-throttle.js?v=2";

const FAVORITES_LOCAL_TS_KEY =
"favorites_local_updated_at";

const FAVORITES_SYNCED_SIG_KEY =
"favorites_synced_signature";

const PUSH_DEBOUNCE_MS =
350;

const coalesceFavoritesPull =
createPullCoalescer({
minIntervalMs: 2000,
errorBackoffMs: 8000
});

let pushTimer =
null;

let ready =
false;

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

function resolveFavoritesRestAuth(){

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
Accept: "application/json"
},
cache: "no-store"
},
12000
);

if(
!res.ok
){
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
console.warn(
"[favorites] push REST:",
res.status,
(
await res.text()
).slice(
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
 * Сверка local ↔ user_settings.favorites (последний updated_at побеждает).
 */
export async function reconcileLocalFavoritesWithCloud(){

if(
!isCloudLoggedInEffective()
){
return favoritesToCloudList(
loadFavoritesGroups()
);

}

const auth =
resolveFavoritesRestAuth();

const localGroups =
loadFavoritesGroups();
const localList =
favoritesToCloudList(
localGroups
);
const localTs =
loadLocalFavoritesUpdatedAt();

let cloud =
null;

if(
auth
){
cloud =
await fetchFavoritesViaRest(
auth
);
}

if(
!cloud
){
return localList;
}

if(
favoritesGroupsEqual(
localGroups,
favoritesFromCloudList(
cloud.favorites
)
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

if(
hasUnsyncedFavorites() ||
!localTs ||
isTsNewer(
localTs,
cloud.updatedAt
)
){

if(
auth
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
}
}

return localList;

}

if(
cloud.updatedAt &&
(
!localTs ||
isTsNewer(
cloud.updatedAt,
localTs
)
)
){

applyCloudFavorites(
cloud.favorites,
cloud.updatedAt
);

}

return cloud.favorites;

}

export async function pullFavoritesFromCloudNow(){

return coalesceFavoritesPull(
()=>reconcileLocalFavoritesWithCloud()
);

}

async function pushFavoritesImpl(
list
){

const auth =
resolveFavoritesRestAuth();

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

export function scheduleFavoritesCloudPush(
favorites
){

if(
!isCloudLoggedInEffective()
){
return;
}

const list =
Array.isArray(
favorites
)
? favorites
: favoritesToCloudList(
favorites ||
loadFavoritesGroups()
);

if(
pushTimer
){
clearTimeout(
pushTimer
);
}

pushTimer =
setTimeout(
()=>{

pushTimer =
null;
void pushFavoritesImpl(
list
).catch(
err=>{
console.warn(
"[favorites] push:",
err?.message || err
);
}
);

},
PUSH_DEBOUNCE_MS
);

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

return pushFavoritesImpl(
list
);

}

/** Вызывается из cloud-sync при realtime UPDATE user_settings. */
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

applyCloudFavorites(
cloudFavorites,
cloudTs
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

void pullFavoritesFromCloudNow().catch(
()=>{}
);

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
void pullFavoritesFromCloudNow().catch(
()=>{}
);
}

console.log(
"[favorites] облачная синхронизация: user_settings.favorites"
);

}
