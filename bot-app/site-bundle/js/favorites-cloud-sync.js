/**
 * Синхронизация флагов: user_favorites (REST + realtime), per exchange_id.
 */
import {
isCloudLoggedInEffective,
notifyFavoritesListeners,
isCloudApiUsable,
isCloudAuthError,
reportCloudAuthFailure,
tryCloudAuthRecovery
} from "./cloud-sync.js?v=68";

import {
isFavoritesCloudDisabled,
isFavoritesAutoCloudDisabled
} from "./supabase-usage-prefs.js?v=5";

import {
getActiveExchangeId
} from "./exchanges/context.js?v=1";

import {
loadFavoritesGroups,
saveFavoritesGroups,
favoritesToCloudList,
favoritesFromCloudList,
favoritesGroupsToRows,
favoritesRowsToGroups,
favoritesGroupsEqual,
favoritesSignature,
setFavoriteGroup,
loadFavoritesCloudUpdatedAt,
saveFavoritesCloudUpdatedAt,
saveFavoritesCloudSyncedSignature,
hasUnsyncedFavoritesCloud,
markFavoritesCloudDirty
} from "./favorites.js?v=5";

import {
readAlertTokenSync,
resolveAlertAuthFast
} from "./alert-auth-cache.js?v=7";

import {
createPullCoalescer
} from "./cloud-sync-throttle.js?v=3";

const coalesceFavoritesPull =
createPullCoalescer({
minIntervalMs: 1500,
errorBackoffMs: 6000
});

let ready =
false;

let pushInFlight =
null;

function resolveFavoritesExchangeId(
exchangeId
){

return String(
exchangeId ||
getActiveExchangeId()
).trim().toLowerCase();

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

function maxUpdatedAt(
rows
){

let max =
"";

for(
const row of rows ||
[]
){

const ts =
row?.updated_at ||
"";

if(
ts &&
(
!max ||
isTsNewer(
ts,
max
)
)
){
max =
ts;
}

}

return max;

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

function isMissingTableError(
text
){

const msg =
String(
text ||
"");

return (
/PGRST205|42P01|relation.*does not exist|schema cache/i.test(
msg
)
);

}

/** Вызвать сразу при клике по флагу — до push в облако. */
export function markFavoritesDirty(
exchangeId
){

markFavoritesCloudDirty(
resolveFavoritesExchangeId(
exchangeId
)
);

}

function applyCloudFavorites(
groups,
updatedAt,
exchangeId
){

const id =
resolveFavoritesExchangeId(
exchangeId
);

saveFavoritesGroups(
groups,
id
);

if(
updatedAt
){
saveFavoritesCloudUpdatedAt(
updatedAt,
id
);
}

saveFavoritesCloudSyncedSignature(
loadFavoritesGroups(
id
),
id
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

async function fetchLegacyFavoritesViaRest(
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
rows: [],
updatedAt: "",
legacy: true
};

}

return {
rows: favoritesGroupsToRows(
favoritesFromCloudList(
normalizeFavoritesList(
row.favorites
)
),
"bybit"
),
updatedAt: row.updated_at ||
"",
legacy: true
};

}catch{
return null;
}

}

async function fetchFavoritesViaRest(
auth,
exchangeId
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
const ex =
encodeURIComponent(
resolveFavoritesExchangeId(
exchangeId
)
);

try{
const res =
await fetchWithTimeout(
`${http.base}/rest/v1/user_favorites?user_id=eq.${uid}` +
`&exchange_id=eq.${ex}` +
`&deleted_at=is.null` +
`&select=symbol,flag_group,updated_at`,
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

if(
isMissingTableError(
text
)
){
return fetchLegacyFavoritesViaRest(
auth
);
}

console.warn(
"[favorites] fetch REST:",
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

const list =
Array.isArray(
rows
)
? rows
: [];

return {
rows: list,
updatedAt: maxUpdatedAt(
list
),
legacy: false
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

async function upsertFavoriteRowViaRest(
auth,
row
){

const http =
await getSupabaseHttpConfig();

if(
!http ||
!auth?.token ||
!auth?.userId
){
return false;
}

const payload =
{
user_id: auth.userId,
exchange_id:
resolveFavoritesExchangeId(
row.exchange_id
),
symbol:
String(
row.symbol ||
""
).trim().toUpperCase(),
flag_group:
String(
row.flag_group ||
"red"
).trim().toLowerCase(),
deleted_at: null
};

try{
const res =
await fetchWithTimeout(
`${http.base}/rest/v1/user_favorites?on_conflict=user_id,exchange_id,symbol`,
{
method: "POST",
headers: {
apikey: http.anon,
Authorization: `Bearer ${auth.token}`,
Accept: "application/json",
"Content-Type": "application/json",
Prefer: "resolution=merge-duplicates,return=representation"
},
body: JSON.stringify(
payload
)
},
15000
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
"favorites upsert",
text
);
return false;
}

console.warn(
"[favorites] upsert REST:",
res.status,
text.slice(
0,
120
)
);
return false;
}

return true;

}catch(
err
){
console.warn(
"[favorites] upsert REST:",
err?.message || err
);
return false;

}

}

async function softDeleteFavoriteRowViaRest(
auth,
exchangeId,
symbol
){

const http =
await getSupabaseHttpConfig();

if(
!http ||
!auth?.token ||
!auth?.userId
){
return false;
}

const uid =
encodeURIComponent(
auth.userId
);
const ex =
encodeURIComponent(
resolveFavoritesExchangeId(
exchangeId
)
);
const sym =
encodeURIComponent(
String(
symbol ||
""
).trim().toUpperCase()
);
const deletedAt =
new Date().toISOString();

try{
const res =
await fetchWithTimeout(
`${http.base}/rest/v1/user_favorites?user_id=eq.${uid}` +
`&exchange_id=eq.${ex}` +
`&symbol=eq.${sym}`,
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
deleted_at: deletedAt
})
},
15000
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
"favorites delete",
text
);
return false;
}

console.warn(
"[favorites] delete REST:",
res.status,
text.slice(
0,
120
)
);
return false;
}

return true;

}catch(
err
){
console.warn(
"[favorites] delete REST:",
err?.message || err
);
return false;

}

}

async function pushFavoritesViaRest(
auth,
groups,
exchangeId
){

const id =
resolveFavoritesExchangeId(
exchangeId
);
const localRows =
favoritesGroupsToRows(
groups,
id
);
const localSymbols =
new Set(
localRows.map(
row=>row.symbol
)
);

if(
localRows.length ===
0 &&
!hasUnsyncedFavoritesCloud(
id
)
){
return loadFavoritesCloudUpdatedAt(
id
) ||
new Date().toISOString();
}

const cloud =
await fetchFavoritesViaRest(
auth,
id
);

if(
cloud?.legacy
){
const legacyList =
favoritesToCloudList(
groups
);

return pushLegacyFavoritesViaRest(
auth,
legacyList
);

}

let ok =
true;

for(
const row of localRows
){

if(
!await upsertFavoriteRowViaRest(
auth,
row
)
){
ok =
false;
}

}

for(
const row of cloud?.rows ||
[]
){

const sym =
String(
row.symbol ||
""
).trim().toUpperCase();

if(
!sym ||
localSymbols.has(
sym
)
){
continue;
}

if(
!await softDeleteFavoriteRowViaRest(
auth,
id,
sym
)
){
ok =
false;
}

}

if(
!ok
){
return null;
}

return new Date().toISOString();

}

async function pushLegacyFavoritesViaRest(
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

}catch{
return null;
}

}

/**
 * Побеждает более новый updated_at. hasUnsynced не перетирает более свежее облако.
 */
export async function reconcileLocalFavoritesWithCloud(
options =
{}
){

const exchangeId =
resolveFavoritesExchangeId(
options.exchangeId
);

if(
!options.onDemand &&
(
isFavoritesCloudDisabled() ||
isFavoritesAutoCloudDisabled()
)
){
return favoritesToCloudList(
loadFavoritesGroups(
exchangeId
)
);
}

if(
!isCloudLoggedInEffective()
){
return favoritesToCloudList(
loadFavoritesGroups(
exchangeId
)
);

}

if(
!isCloudApiUsable()
){
void tryCloudAuthRecovery();
return favoritesToCloudList(
loadFavoritesGroups(
exchangeId
)
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
loadFavoritesGroups(
exchangeId
)
);

}

const localGroups =
loadFavoritesGroups(
exchangeId
);
const localList =
favoritesToCloudList(
localGroups
);
const localTs =
loadFavoritesCloudUpdatedAt(
exchangeId
);

const cloud =
await fetchFavoritesViaRest(
auth,
exchangeId
);

if(
!cloud
){
return localList;
}

const cloudGroups =
favoritesRowsToGroups(
cloud.rows
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
saveFavoritesCloudUpdatedAt(
cloud.updatedAt,
exchangeId
);
}

saveFavoritesCloudSyncedSignature(
localGroups,
exchangeId
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
cloudGroups,
cloud.updatedAt,
exchangeId
);

return favoritesToCloudList(
cloudGroups
);

}

if(
localList.length >
0 ||
hasUnsyncedFavoritesCloud(
exchangeId
) ||
!cloud.updatedAt
){

const ts =
await pushFavoritesViaRest(
auth,
localGroups,
exchangeId
);

if(
ts
){
saveFavoritesCloudUpdatedAt(
ts,
exchangeId
);
saveFavoritesCloudSyncedSignature(
localGroups,
exchangeId
);

}else{
console.warn(
"[favorites] push не удался (",
exchangeId,
")"
);
}

return localList;

}

applyCloudFavorites(
cloudGroups,
cloud.updatedAt,
exchangeId
);

return favoritesToCloudList(
cloudGroups
);

}

export async function pullFavoritesFromCloudNow(
options =
{}
){

if(
!options.onDemand &&
(
isFavoritesCloudDisabled() ||
isFavoritesAutoCloudDisabled()
)
){
return;
}

return coalesceFavoritesPull(
()=>reconcileLocalFavoritesWithCloud(
options
)
);

}

async function pushFavoritesImpl(
groups,
exchangeId
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

const id =
resolveFavoritesExchangeId(
exchangeId
);
const normalized =
favoritesRowsToGroups(
favoritesGroupsToRows(
groups,
id
)
);

saveFavoritesGroups(
normalized,
id
);

const ts =
await pushFavoritesViaRest(
auth,
normalized,
id
);

if(
ts
){
saveFavoritesCloudUpdatedAt(
ts,
id
);
saveFavoritesCloudSyncedSignature(
normalized,
id
);
return true;
}

return false;

}

export async function persistFavoritesToCloudNow(
favorites,
exchangeId
){

const id =
resolveFavoritesExchangeId(
exchangeId
);
const groups =
Array.isArray(
favorites
)
? favoritesFromCloudList(
favorites
)
: (
favorites ||
loadFavoritesGroups(
id
)
);

markFavoritesDirty(
id
);

const job =
pushFavoritesImpl(
groups,
id
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
favorites,
exchangeId
){

if(
isFavoritesAutoCloudDisabled()
){
return;
}

const id =
resolveFavoritesExchangeId(
exchangeId
);

markFavoritesDirty(
id
);

void persistFavoritesToCloudNow(
favorites,
id
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
favorites,
exchangeId
){

pushFavoritesAfterLocalEdit(
favorites,
exchangeId
);

}

export function applyFavoritesFromRealtimeRow(
row
){

if(
isFavoritesAutoCloudDisabled()
){
return;
}

if(
!row
){
return;
}

if(
row.symbol
){

const exchangeId =
resolveFavoritesExchangeId(
row.exchange_id
);
const sym =
String(
row.symbol ||
""
).trim().toUpperCase();

if(
!sym
){
return;
}

const groups =
loadFavoritesGroups(
exchangeId
);
const cloudTs =
row.updated_at ||
"";
const localTs =
loadFavoritesCloudUpdatedAt(
exchangeId
);

if(
localTs &&
cloudTs &&
isTsNewer(
localTs,
cloudTs
) &&
hasUnsyncedFavoritesCloud(
exchangeId
)
){
return;
}

let next =
groups;

if(
row.deleted_at
){
next =
setFavoriteGroup(
sym,
null,
groups
);
}else{
next =
setFavoriteGroup(
sym,
row.flag_group,
groups
);
}

applyCloudFavorites(
next,
cloudTs,
exchangeId
);
return;

}

const cloudFavorites =
normalizeFavoritesList(
row.favorites
);
const exchangeId =
"bybit";
const localGroups =
loadFavoritesGroups(
exchangeId
);
const cloudGroups =
favoritesFromCloudList(
cloudFavorites
);
const cloudTs =
row.updated_at ||
"";
const localTs =
loadFavoritesCloudUpdatedAt(
exchangeId
);

if(
favoritesGroupsEqual(
localGroups,
cloudGroups
)
){

if(
cloudTs
){
saveFavoritesCloudUpdatedAt(
cloudTs,
exchangeId
);
}

saveFavoritesCloudSyncedSignature(
localGroups,
exchangeId
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
hasUnsyncedFavoritesCloud(
exchangeId
)
){
return;
}

applyCloudFavorites(
cloudGroups,
cloudTs,
exchangeId
);

}

export async function syncFavoritesCloudOnDemand(
exchangeId
){

if(
!isCloudLoggedInEffective()
){
throw new Error(
"Войдите по email в меню шестерёнки"
);
}

await pullFavoritesFromCloudNow(
{
onDemand: true,
exchangeId
}
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

}
