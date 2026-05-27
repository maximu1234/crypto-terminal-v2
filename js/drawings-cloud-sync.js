import {
waitForCloudAuth,
isCloudLoggedIn,
isCloudLoggedInEffective,
isCloudSyncEnabled,
onCloudSyncChange,
notifyDrawings as notifyDrawingsListeners
} from "./cloud-sync.js?v=20";

import {
normalizeAlertWorkerBaseUrl
} from "./alert-worker-url.js?v=1";

import {
collectAllLocalDrawings,
pruneDuplicateShapeIdsAcrossSymbols,
applyDrawingsMapToLocal,
loadLocalTombstones,
saveLocalTombstones,
recordDrawingTombstone,
mergeDrawingsPayload,
mergeShapeLists,
applyTombstonesToShapeList,
getShapeRevisionTime,
unpackCloudDrawings,
packCloudDrawings,
purgeAllLocalDrawingsStorage,
DRAWINGS_TOMBSTONES_KEY,
DRAWINGS_GLOBAL_CLEAR_KEY
} from "./drawings-storage.js?v=5";

import {
withTimeout
} from "./async-timeout.js?v=1";

import {
readAlertTokenSync
} from "./alert-auth-cache.js?v=4";

import {
getSupabase
} from "./supabase-client.js?v=5";

const DRAWINGS_ROW_SYNC_META_KEY =
"drawings_row_sync_v1";

const BLOB_MIGRATED_KEY =
"drawings_table_migrated_v1";

const REGISTRY_SYNC_DEBOUNCE_MS =
200;

const FAST_POLL_MS =
800;

const FAST_POLL_HIDDEN_MS =
4000;

let drawingsRealtimeChannel =
null;

let drawingsRealtimeUserId =
null;

let registrySyncTimer =
null;

let remoteSyncTimer =
null;

let fastPollTimer =
null;

let fastPollStopped =
true;

let lastCloudDrawingsFingerprint =
"";

let cloudOpChain =
Promise.resolve();

let drawingsSyncPausedUntil =
0;

const REMOTE_SYNC_MS =
50;

export function pauseDrawingsCloudSync(
ms
){

if(
ms <=
0
){
drawingsSyncPausedUntil =
0;
return;
}

drawingsSyncPausedUntil =
Date.now() +
ms;

if(
registrySyncTimer
){
clearTimeout(
registrySyncTimer
);
registrySyncTimer =
null;
}

}

function isDrawingsCloudSyncPaused(){

return (
Date.now() <
drawingsSyncPausedUntil
);

}

export function runCloudOp(
fn,
ms = 45000,
label = "drawings cloud op"
){

const job =
cloudOpChain
.catch(
()=>{}
)
.then(
()=>
withTimeout(
Promise.resolve().then(
fn
),
ms,
label
)
)
;

cloudOpChain =
job.catch(
()=>{}
);

return job;

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

function resolveDrawingsRestAuth(){

const snap =
readAlertTokenSync();

if(
!snap?.token ||
!snap?.user?.id
){
return null;
}

return {
user: snap.user,
token: snap.token
};

}

let cachedDrawingsWorkerBaseUrl =
null;

async function getDrawingsWorkerBaseUrl(){

if(
cachedDrawingsWorkerBaseUrl !==
null
){
return cachedDrawingsWorkerBaseUrl;
}

try{
const env =
await import("./supabase-env.js?v=5");
cachedDrawingsWorkerBaseUrl =
normalizeAlertWorkerBaseUrl(
env.ALERT_WORKER_URL || ""
);
}catch{
cachedDrawingsWorkerBaseUrl =
"";
}

return cachedDrawingsWorkerBaseUrl;

}

/**
 * Запись рисунка через Railway (service role) — надёжнее прямого REST с iPad.
 */
async function pushDrawingViaWorker(
symbol,
shape,
opts = {}
){

const base =
await getDrawingsWorkerBaseUrl();

if(
!base
){
return false;
}

const token =
opts.token ||
readAlertTokenSync()?.token ||
null;

if(
!token
){
return false;
}

const sym =
String(
symbol ||
""
).trim().toUpperCase();
const shapeId =
String(
shape?.id ||
""
).trim();

if(
!sym ||
!shapeId ||
!shape
){
return false;
}

const rev =
getShapeRevisionTime(
shape
);

let res;

try{
res =
await fetchWithTimeout(
`${base}/push-drawing`,
{
method: "POST",
headers: {
"Content-Type": "application/json",
Authorization: `Bearer ${token}`
},
body: JSON.stringify({
symbol: sym,
shape_id: shapeId,
shape,
updated_at: new Date(
rev
).toISOString(),
updated_at_ms: rev,
deleted_at: null
})
},
12000
);
}catch(
err
){
console.warn(
"[drawings] worker /push-drawing:",
err?.message || err
);
return false;
}

const text =
await res.text();

let body =
{};

try{
body =
text
? JSON.parse(
text
)
: {};
}catch{
body = {
raw: text
};
}

if(
!res.ok ||
!body.ok
){
console.warn(
"[drawings] worker /push-drawing отклонён:",
res.status,
sym,
shapeId,
text.slice(
0,
300
)
);
return false;
}

console.log(
"[drawings] ✓ Supabase (worker):",
sym,
shapeId
);

broadcastDrawingsSync();
return true;

}

async function pushShapeToCloud(
ctx,
symbol,
shape,
opts = {}
){

if(
await pushDrawingViaWorker(
symbol,
shape,
opts
)
){
return true;
}

return upsertDrawingRowViaRest(
ctx,
symbol,
shape,
opts
);

}

async function getAccessTokenForUser(
ctx
){

const cached =
readAlertTokenSync()?.token;

if(
cached
){
return cached;
}

if(
!ctx?.sb
){
return null;
}

try{
const { data } =
await withTimeout(
ctx.sb.auth.getSession(),
4000,
"getSession"
);

return data?.session?.access_token || null;

}catch(err){
console.warn(
"[drawings] getSession:",
err?.message || err
);
return null;

}

}

/**
 * DELETE через PostgREST (sb.from().delete() в Safari часто зависает).
 */
async function purgeDrawingsViaRest(
opts
){

const all =
!!opts?.all;
const sym =
String(
opts?.symbol ||
""
).trim().toUpperCase();
const sid =
String(
opts?.shapeId ||
""
).trim();
let ctx =
opts?.ctx || null;
let token =
opts?.token || null;

if(
!ctx?.user?.id
){
try{
ctx =
await withTimeout(
getAuthed(),
8000,
"getAuthed purge"
);
}catch{
ctx = null;
}
}

if(
!ctx?.user?.id
){
console.warn(
"[drawings] purge: нет сессии"
);
return false;
}

if(
!token
){
token =
await getAccessTokenForUser(
ctx
);
}

if(
!token
){
console.warn(
"[drawings] purge: нет токена"
);
return false;
}

let env;

try{
env =
await import("./supabase-env.js?v=4");
}catch{
return false;
}

const base =
String(
env.SUPABASE_URL || ""
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
return false;
}

let path =
"";

if(
all
){
path =
`user_drawings?user_id=eq.${encodeURIComponent(ctx.user.id)}`;
}else if(
sym &&
sid
){
path =
`user_drawings?user_id=eq.${encodeURIComponent(ctx.user.id)}` +
`&symbol=eq.${encodeURIComponent(sym)}` +
`&shape_id=eq.${encodeURIComponent(sid)}`;
}else{
return false;
}

try{
const res =
await fetchWithTimeout(
`${base}/rest/v1/${path}`,
{
method: "DELETE",
headers: {
apikey: anon,
Authorization: `Bearer ${token}`,
Prefer: "return=minimal"
}
},
15000
);

if(
!res.ok
){
const text =
await res.text();
console.warn(
"[drawings] purge REST:",
res.status,
text.slice(
0,
200
)
);
return false;
}

console.log(
"[drawings] purge REST ok:",
all
? "all"
: `${sym} ${sid}`
);
return true;

}catch(err){
console.warn(
"[drawings] purge REST:",
err?.message || err
);
return false;

}

}

const drawingsListeners =
new Set();

export function onDrawingsRemoteUpdate(
fn
){

drawingsListeners.add(
fn
);

return ()=>{
drawingsListeners.delete(
fn
);
};

}

function notifyDrawings(
symbols,
opts = {}
){

const list =
Array.isArray(
symbols
)
? symbols
: [];

notifyDrawingsListeners(
list
);

drawingsListeners.forEach(
fn=>{
try{
fn(
list
);
}catch{
/* ignore */
}
}
);

if(
list.length
){
window.dispatchEvent(
new CustomEvent(
"drawings-cloud-changed",
{
detail:{
symbols: list
}
}
)
);
}

if(
opts.skipWindowEvent
){
return;
}

for(
const symbol of list
){

const sym =
String(
symbol ||
""
).trim().toUpperCase();

if(
!sym
){
continue;
}

window.dispatchEvent(
new CustomEvent(
"drawings-updated",
{
detail:{
symbol: sym,
remote: true
}
}
)
);

}

}

function loadSyncMeta(){

try{
return JSON.parse(
localStorage.getItem(
DRAWINGS_ROW_SYNC_META_KEY
) ||
"{}"
);
}catch{
return {};
}

}

function saveSyncMeta(
meta
){

localStorage.setItem(
DRAWINGS_ROW_SYNC_META_KEY,
JSON.stringify(
meta ||
{}
)
);

}

function syncMetaKey(
symbol,
shapeId
){

return `${String(symbol).trim().toUpperCase()}:${String(shapeId)}`;

}

function markShapeSynced(
symbol,
shapeId,
revisionMs
){

const meta =
loadSyncMeta();

meta[
syncMetaKey(
symbol,
shapeId
)
] =
Number(
revisionMs
) ||
Date.now();

saveSyncMeta(
meta
);

}

function shapeNeedsPush(
symbol,
shape
){

const rev =
getShapeRevisionTime(
shape
);
const key =
syncMetaKey(
symbol,
shape.id
);
const synced =
Number(
loadSyncMeta()[
key
]
) ||
0;

return rev >
synced +
1;

}

function shapeWasSynced(
symbol,
shapeId
){

const key =
syncMetaKey(
symbol,
shapeId
);
return (
Number(
loadSyncMeta()[
key
]
) ||
0
) >
0;

}

async function getAuthed(){

const snap =
readAlertTokenSync();

if(
snap?.token &&
snap?.user
){

let sb =
snap.ctx?.sb ||
null;

if(
!sb
){
try{
sb =
await withTimeout(
getSupabase(),
3000,
"getSupabase"
);
}catch{
sb = null;
}
}

return {
sb,
user: snap.user,
token: snap.token
};

}

return waitForCloudAuth(
8000
);

}

/**
 * Чтение user_drawings через REST (на iPad getSupabase/select часто зависают).
 */
async function fetchCloudDrawingsViaRest(
auth
){

let env;

try{
env =
await import("./supabase-env.js?v=4");
}catch{
return null;
}

const base =
String(
env.SUPABASE_URL || ""
).replace(
/\/$/,
""
);
const anon =
env.SUPABASE_ANON_KEY;

if(
!base ||
!anon ||
!auth?.token ||
!auth?.user?.id
){
return null;
}

const uid =
encodeURIComponent(
auth.user.id
);
const cacheBust =
Date.now();
const headers = {
apikey: anon,
Authorization: `Bearer ${auth.token}`,
Accept: "application/json",
"Cache-Control": "no-cache, no-store",
Pragma: "no-cache"
};

const paths = [
`user_drawings?user_id=eq.${uid}&select=symbol,shape_id,shape,updated_at&deleted_at=is.null&_=${cacheBust}`,
`user_drawings?user_id=eq.${uid}&select=symbol,shape_id,shape,updated_at&_=${cacheBust}`
];

for(
const path of paths
){

try{
const res =
await fetchWithTimeout(
`${base}/rest/v1/${path}`,
{
method: "GET",
headers
},
15000,
"user_drawings fetch"
);

if(
!res.ok
){
const text =
await res.text();

if(
/deleted_at|PGRST204|42703/i.test(
text
)
){
continue;
}

console.warn(
"[drawings] fetch REST:",
res.status,
text.slice(
0,
160
)
);
return null;
}

const rows =
await res.json();

return Array.isArray(
rows
)
? rows
: [];

}catch(
err
){
console.warn(
"[drawings] fetch REST:",
err?.message || err
);
return null;

}

}

return null;

}

function countLocalDrawingStats(){

const local =
collectAllLocalDrawings();
let total =
0;
let pending =
0;

for(
const [
sym,
list
] of Object.entries(
local
)
){

if(
!Array.isArray(
list
)
){
continue;
}

for(
const shape of list
){

total += 1;

if(
shapeNeedsPush(
sym,
shape
)
){
pending += 1;
}

}

}

return {
total,
pending
};

}

function scheduleRemoteDrawingsSync(){

if(
isDrawingsCloudSyncPaused()
){
return;
}

if(
remoteSyncTimer
){
clearTimeout(
remoteSyncTimer
);
}

remoteSyncTimer =
setTimeout(
()=>{

remoteSyncTimer =
null;

if(
!isCloudLoggedInEffective()
){
return;
}

void reconcileLocalDrawingsWithCloud();

},
REMOTE_SYNC_MS
);

}

function broadcastDrawingsSync(){

if(
!drawingsRealtimeChannel
){
return;
}

try{

drawingsRealtimeChannel.send({
type: "broadcast",
event: "drawings-rows-sync",
payload: {
at: Date.now()
}
});

}catch{
/* ignore */
}

}

function isDeletedAtColumnError(
err
){

const msg =
String(
err?.message ||
err?.details ||
""
);

return (
/PGRST204|42703|deleted_at|column/i.test(
msg
)
);

}

async function upsertDrawingRowViaRest(
ctx,
symbol,
shape,
opts = {}
){

const sym =
String(
symbol ||
""
).trim().toUpperCase();
const shapeId =
String(
shape?.id ||
""
).trim();

if(
!sym ||
!shapeId
){
return false;
}

let token =
opts.token || null;

if(
!token
){
token =
await getAccessTokenForUser(
ctx
);
}

if(
!token
){
return false;
}

let env;

try{
env =
await import("./supabase-env.js?v=4");
}catch{
return false;
}

const base =
String(
env.SUPABASE_URL || ""
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
return false;
}

const rev =
getShapeRevisionTime(
shape
);

const row =
{
user_id: ctx.user.id,
symbol: sym,
shape_id: shapeId,
shape,
updated_at: new Date(
rev
).toISOString()
};

if(
opts.includeDeletedAt !==
false
){
row.deleted_at = null;
}

try{
const res =
await fetchWithTimeout(
`${base}/rest/v1/user_drawings?on_conflict=user_id,symbol,shape_id`,
{
method: "POST",
headers: {
apikey: anon,
Authorization: `Bearer ${token}`,
"Content-Type": "application/json",
Prefer: "resolution=merge-duplicates,return=minimal"
},
body: JSON.stringify(
row
)
},
15000
);

if(
res.ok
){
broadcastDrawingsSync();
return true;
}

const text =
await res.text();

if(
opts.includeDeletedAt !==
false &&
/deleted_at|PGRST204|42703/i.test(
text
)
){
return upsertDrawingRowViaRest(
ctx,
symbol,
shape,
{
...opts,
includeDeletedAt: false,
token
}
);
}

console.warn(
"[drawings] upsert REST:",
res.status,
text.slice(
0,
200
)
);
return false;

}catch(err){
console.warn(
"[drawings] upsert REST:",
err?.message || err
);
return false;

}

}

async function upsertDrawingRow(
ctx,
symbol,
shape
){

const sym =
String(
symbol ||
""
).trim().toUpperCase();
const shapeId =
String(
shape?.id ||
""
).trim();

if(
!sym ||
!shapeId
){
return false;
}

const rev =
getShapeRevisionTime(
shape
);

const auth =
resolveDrawingsRestAuth();
const token =
auth?.token ||
null;
const user =
auth?.user ||
ctx?.user ||
null;

if(
token &&
user
){

if(
await pushShapeToCloud(
{
user
},
symbol,
shape,
{
token
}
)
){
markShapeSynced(
sym,
shapeId,
rev
);
return true;
}

}

if(
!ctx?.sb
){
console.warn(
"[drawings] upsert: нет REST и нет SDK — перелогиньтесь"
);
return false;
}

const baseRow =
{
user_id: ctx.user.id,
symbol: sym,
shape_id: shapeId,
shape,
updated_at: new Date(
rev
).toISOString()
};

let result =
await withTimeout(
ctx.sb
.from(
"user_drawings"
)
.upsert(
{
...baseRow,
deleted_at: null
},
{
onConflict: "user_id,symbol,shape_id"
}
),
12000,
"user_drawings upsert"
);

if(
result.error &&
isDeletedAtColumnError(
result.error
)
){
result =
await withTimeout(
ctx.sb
.from(
"user_drawings"
)
.upsert(
baseRow,
{
onConflict: "user_id,symbol,shape_id"
}
),
12000,
"user_drawings upsert (no deleted_at)"
);
}

if(
result.error
){
console.warn(
"[drawings] upsert:",
result.error.message
);
return false;
}

markShapeSynced(
sym,
shapeId,
rev
);

return true;

}

/**
 * Удалить все рисунки пользователя из user_drawings (страница «Алерты»).
 * @returns {Promise<boolean|null>} true/false или null если входа нет (только локально)
 */
export async function clearAllDrawingsFromCloud(){

const auth =
resolveDrawingsRestAuth();

if(
!auth
){
console.warn(
"[drawings] delete all: нет входа — очищено только в браузере"
);
return null;
}

try{
return await withTimeout(
(async()=>{

const ok =
await purgeDrawingsViaRest({
all: true,
ctx: {
user: auth.user
},
token: auth.token
});

if(
!ok
){
return false;
}

saveSyncMeta(
{}
);
saveLocalTombstones(
{}
);

void clearLegacyDrawingsBlobViaRest(
auth
).catch(
err=>{
console.warn(
"[drawings] очистка JSON в user_settings:",
err?.message || err
);
}
);

localStorage.setItem(
BLOB_MIGRATED_KEY,
"1"
);

broadcastDrawingsSync();

return true;

})(),
18000,
"user_drawings delete all"
);

}catch(
err
){
console.warn(
"[drawings] delete all:",
err?.message || err
);
return false;

}

}

async function clearLegacyDrawingsBlobViaRest(
auth
){

let env;

try{
env =
await import("./supabase-env.js?v=4");
}catch{
return;
}

const base =
String(
env.SUPABASE_URL || ""
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
return;
}

const emptyBlob =
packCloudDrawings(
{},
{}
);
const uidQ =
encodeURIComponent(
auth.user.id
);
const headers = {
apikey: anon,
Authorization: `Bearer ${auth.token}`,
"Content-Type": "application/json",
Prefer: "return=minimal"
};

const checkRes =
await fetchWithTimeout(
`${base}/rest/v1/user_settings?user_id=eq.${uidQ}&select=user_id`,
{
method: "GET",
headers: {
apikey: anon,
Authorization: `Bearer ${auth.token}`,
Accept: "application/json"
}
},
8000
);

let hasRow =
false;

if(
checkRes.ok
){
const rows =
await checkRes.json();
hasRow =
Array.isArray(
rows
) &&
rows.length >
0;
}

const patchBody =
{
drawings: emptyBlob,
drawings_updated_at: new Date().toISOString()
};

let res;

if(
hasRow
){

res =
await fetchWithTimeout(
`${base}/rest/v1/user_settings?user_id=eq.${uidQ}`,
{
method: "PATCH",
headers,
body: JSON.stringify(
patchBody
)
},
8000
);

}else{

res =
await fetchWithTimeout(
`${base}/rest/v1/user_settings`,
{
method: "POST",
headers,
body: JSON.stringify({
user_id: auth.user.id,
favorites: [],
drawings: emptyBlob,
drawings_updated_at: patchBody.drawings_updated_at
})
},
8000
);

}

if(
!res.ok
){
const text =
await res.text().catch(
()=>""
);
throw new Error(
text.slice(
0,
120
) ||
`HTTP ${res.status}`
);
}

}

async function clearLegacyDrawingsBlob(
ctx
){

const auth =
resolveDrawingsRestAuth();

if(
auth?.token
){
await clearLegacyDrawingsBlobViaRest(
auth
);
return;
}

if(
!ctx?.sb ||
!ctx?.user?.id
){
return;
}

const emptyBlob =
packCloudDrawings(
{},
{}
);

const { error } =
await withTimeout(
ctx.sb
.from(
"user_settings"
)
.upsert(
{
user_id: ctx.user.id,
drawings: emptyBlob,
drawings_updated_at: new Date().toISOString()
},
{
onConflict: "user_id"
}
),
8000,
"user_settings drawings clear"
);

if(
error
){
console.warn(
"[drawings] очистка JSON в user_settings:",
error.message
);
}

}

export async function deleteDrawingFromCloudNow(
symbol,
shapeId
){

const sym =
String(
symbol ||
""
).trim().toUpperCase();
const sid =
String(
shapeId ||
""
).trim();

if(
!sym ||
!sid
){
return false;
}

const auth =
resolveDrawingsRestAuth();

if(
!auth?.token
){
console.warn(
"[drawings] delete: нет токена"
);
return false;
}

const ok =
await purgeDrawingsViaRest({
symbol: sym,
shapeId: sid,
ctx: {
user: auth.user
},
token: auth.token
});

if(
!ok
){
console.warn(
"[drawings] delete REST failed",
sym,
sid
);
return false;
}

const meta =
loadSyncMeta();

delete meta[
syncMetaKey(
sym,
sid
)
];

saveSyncMeta(
meta
);

broadcastDrawingsSync();

return true;

}

export async function deleteDrawingFromCloud(
symbol,
shapeId
){

return deleteDrawingFromCloudNow(
symbol,
shapeId
);

}

async function pushUnsyncedDrawingsImpl(){

if(
isDrawingsCloudSyncPaused()
){
return 0;
}

const auth =
resolveDrawingsRestAuth();

if(
!auth?.token ||
!auth?.user?.id
){

if(
isCloudLoggedInEffective()
){
console.warn(
"[drawings] в Supabase не отправлено: нет JWT. Шестерёнка → войти снова (часто на iPad)."
);
}else if(
isCloudSyncEnabled()
){
console.warn(
"[drawings] только в браузере — войдите: шестерёнка → email → ссылка из письма."
);
}

return 0;
}

const ctx =
{
user: auth.user
};

const dupRemoved =
pruneDuplicateShapeIdsAcrossSymbols();

const local =
collectAllLocalDrawings();
const tombstones =
loadLocalTombstones();

let localShapeCount =
0;

for(
const list of Object.values(
local
)
){
if(
Array.isArray(
list
)
){
localShapeCount +=
list.length;
}
}

let pushed =
0;

for(
const [
symbol,
list
] of Object.entries(
local
)
){

const sym =
String(
symbol
).trim().toUpperCase();

if(
!sym ||
!Array.isArray(
list
)
){
continue;
}

for(
const shape of list
){

if(
!shape?.id
){
continue;
}

if(
!shapeNeedsPush(
sym,
shape
)
){
continue;
}

if(
await pushShapeToCloud(
ctx,
sym,
shape,
{
token: auth.token
}
)
){
markShapeSynced(
sym,
shape.id,
getShapeRevisionTime(
shape
)
);
pushed += 1;
}

}

}

for(
const {
sym,
id
} of dupRemoved
){

if(
await deleteDrawingFromCloud(
sym,
id
)
){
pushed += 1;
}

}

for(
const [
sym,
tombs
] of Object.entries(
tombstones
)
){

if(
!tombs ||
typeof tombs !==
"object"
){
continue;
}

for(
const shapeId of Object.keys(
tombs
)
){

if(
await deleteDrawingFromCloud(
sym,
shapeId
)
){
pushed += 1;
}

}

}

if(
pushed >
0
){
broadcastDrawingsSync();

if(
localShapeCount >
0 &&
pushed >=
localShapeCount *
0.5
){
console.warn(
"[drawings] из браузера (localStorage) отправлено в Supabase:",
pushed,
"фигур. Empty Caches кэш не очищает — для полного сброса: Алерты → «Удалить»."
);
}else{
console.log(
"[drawings] Supabase: сохранено фигур —",
pushed
);
}

}

return pushed;

}

async function fetchLegacyBlobDrawings(
ctx
){

const { data, error } =
await ctx.sb
.from(
"user_settings"
)
.select(
"drawings"
)
.eq(
"user_id",
ctx.user.id
)
.maybeSingle();

if(
error ||
!data?.drawings
){
return {
shapes: {},
tombstones: {}
};
}

return unpackCloudDrawings(
data.drawings
);

}

async function migrateLegacyBlobOnce(
ctx
){

if(
localStorage.getItem(
BLOB_MIGRATED_KEY
)
){
return;
}

if(
localStorage.getItem(
DRAWINGS_GLOBAL_CLEAR_KEY
)
){
localStorage.setItem(
BLOB_MIGRATED_KEY,
"1"
);
return;
}

const legacy =
await fetchLegacyBlobDrawings(
ctx
);

const legacyCount =
Object.values(
legacy.shapes ||
{}
).reduce(
(sum, list)=>
sum +
(
Array.isArray(
list
)
? list.length
: 0
),
0
);

if(
legacyCount ===
0
){
localStorage.setItem(
BLOB_MIGRATED_KEY,
"1"
);
return;
}

const local =
collectAllLocalDrawings();

const merged =
mergeDrawingsPayload(
local,
legacy.shapes,
loadLocalTombstones(),
legacy.tombstones
);

let count =
0;

for(
const [
symbol,
list
] of Object.entries(
merged.shapes
)
){

for(
const shape of list ||
[]
){

if(
await upsertDrawingRow(
ctx,
symbol,
shape
)
){
count += 1;
}

}

}

localStorage.setItem(
BLOB_MIGRATED_KEY,
"1"
);

if(
count >
0
){
console.log(
"[drawings] миграция из JSON:",
count,
"фигур"
);
}

}

function buildCloudDrawingsFingerprint(
rows
){

return (
rows ||
[]
)
.map(
row=>{
const sym =
String(
row?.symbol ||
""
).trim().toUpperCase();
const sid =
String(
row?.shape_id ||
""
).trim();
const ts =
String(
row?.updated_at ||
""
);
return `${sym}:${sid}:${ts}`;
}
)
.sort()
.join(
"|"
);

}

/**
 * Сверка с user_drawings — как price_alerts для алертов.
 */
export async function reconcileLocalDrawingsWithCloud(){

if(
isDrawingsCloudSyncPaused()
){
return 0;
}

const auth =
resolveDrawingsRestAuth();

if(
!auth?.token ||
!auth?.user?.id
){
return 0;
}

let data =
await fetchCloudDrawingsViaRest(
auth
);

if(
data ===
null
){

const ctx =
await getAuthed();

if(
!ctx?.sb
){
console.warn(
"[drawings] reconcile: не удалось прочитать облако (REST/SDK)"
);
return 0;
}

let query =
ctx.sb
.from(
"user_drawings"
)
.select(
"symbol, shape_id, shape, updated_at"
)
.eq(
"user_id",
ctx.user.id
)
.is(
"deleted_at",
null
);

let result =
await withTimeout(
query,
12000,
"user_drawings select"
);

if(
result.error &&
isDeletedAtColumnError(
result.error
)
){
result =
await withTimeout(
ctx.sb
.from(
"user_drawings"
)
.select(
"symbol, shape_id, shape, updated_at"
)
.eq(
"user_id",
ctx.user.id
),
12000,
"user_drawings select (no deleted_at)"
);
}

if(
result.error
){

if(
result.error.code ===
"42P01" ||
/PGRST205|does not exist/i.test(
String(
result.error.message ||
""
)
)
){
console.warn(
"[drawings] таблица user_drawings не найдена — выполните supabase/migration-user-drawings.sql"
);
return 0;
}

console.warn(
"[drawings] reconcile:",
result.error.message
);
return 0;

}

data =
result.data;

}

const cloudFp =
buildCloudDrawingsFingerprint(
data
);
const fpChanged =
cloudFp !==
lastCloudDrawingsFingerprint;

lastCloudDrawingsFingerprint =
cloudFp;

const cloudBySymbol =
{};

for(
const row of data ||
[]
){

const sym =
String(
row.symbol ||
""
).trim().toUpperCase();
const sid =
String(
row.shape_id ||
""
).trim();

if(
!sym ||
!sid ||
!row.shape
){
continue;
}

if(
!cloudBySymbol[
sym
]
){
cloudBySymbol[
sym
] =
[];
}

const shape =
{
...row.shape,
id: sid
};

const cloudRev =
Date.parse(
row.updated_at
) ||
0;

if(
cloudRev >
0
){
shape.updatedAt =
cloudRev;
}

cloudBySymbol[
sym
].push(
shape
);

markShapeSynced(
sym,
sid,
getShapeRevisionTime(
shape
)
);

}

void pruneDuplicateShapeIdsAcrossSymbols();

const local =
collectAllLocalDrawings();
const tombstones =
loadLocalTombstones();

const symbols =
new Set([
...Object.keys(
local
),
...Object.keys(
cloudBySymbol
)
]);

const applyMap =
{};

const changed =
[];

for(
const sym of symbols
){

const localList =
local[
sym
] ||
[];
const cloudList =
cloudBySymbol[
sym
] ||
[];

let mergedList =
applyTombstonesToShapeList(
mergeShapeLists(
localList,
cloudList
),
tombstones[
sym
]
);

const cloudIds =
new Set(
cloudList.map(
shape=>
String(
shape?.id ||
""
).trim()
).filter(
Boolean
)
);

mergedList =
mergedList.filter(
shape=>{

const id =
String(
shape?.id ||
""
).trim();

if(
!id
){
return false;
}

if(
cloudIds.has(
id
)
){
return true;
}

if(
shapeWasSynced(
sym,
id
)
){
return false;
}

return shapeNeedsPush(
sym,
shape
);

}
);

applyMap[
sym
] =
mergedList;

if(
JSON.stringify(
local[
sym
] ||
[]
) !==
JSON.stringify(
mergedList
)
){
changed.push(
sym
);
}

}

if(
changed.length
){
applyDrawingsMapToLocal(
applyMap,
{ merge: false }
);

notifyDrawings(
changed
);

console.log(
"[drawings] reconcile: обновлено символов",
changed.length
);

}else if(
fpChanged
){

const refreshSyms =
[
...symbols
].map(
sym=>
String(
sym
).trim().toUpperCase()
).filter(
Boolean
);

if(
refreshSyms.length
){
notifyDrawings(
refreshSyms
);

console.log(
"[drawings] reconcile: облако изменилось — обновление UI",
refreshSyms.length,
"симв."
);
}

}

const cloudTotal =
(
data ||
[]
).length;

if(
cloudTotal ===
0
){

const {
total,
pending
} =
countLocalDrawingStats();

if(
total >
0 &&
pending ===
0
){

const syms =
purgeAllLocalDrawingsStorage();

if(
syms.size >
0
){
notifyDrawings(
[
...syms
],
{
skipWindowEvent: true
}
);

for(
const symbol of syms
){
window.dispatchEvent(
new CustomEvent(
"drawings-updated",
{
detail:{
symbol,
cleared: true,
remote: true
}
}
)
);
}

console.log(
"[drawings] Supabase пусто — локальные рисунки сняты с графиков"
);
}

}else if(
total >
0 &&
pending >
0
){
console.warn(
"[drawings] на графике есть рисунки, в Supabase 0 строк — отправка в облако…"
);
}

}

return changed.length;

}

export async function pullDrawingsFromCloud(){

return runCloudOp(
()=>reconcileLocalDrawingsWithCloud()
);

}

/** Без очереди cloudOp — для второго устройства (iPad) сразу после входа. */
export async function pullDrawingsFromCloudNow(){

if(
isDrawingsCloudSyncPaused()
){
return 0;
}

return reconcileLocalDrawingsWithCloud();

}

let drawingsPushTimer =
null;

const PUSH_DEBOUNCE_MS =
250;

export function scheduleDrawingsCloudSync(){

if(
!isCloudLoggedInEffective() ||
isDrawingsCloudSyncPaused()
){
return;
}

if(
registrySyncTimer
){
clearTimeout(
registrySyncTimer
);
}

registrySyncTimer =
setTimeout(
()=>{

registrySyncTimer =
null;

void pushUnsyncedDrawingsImpl()
.then(
n=>{
if(
n >
0
){
broadcastDrawingsSync();
}
return reconcileLocalDrawingsWithCloud();
}
)
.catch(
err=>{
console.warn(
"[drawings] sync:",
err?.message ||
err
);
}
);

},
REGISTRY_SYNC_DEBOUNCE_MS
);

}

export function scheduleDrawingsCloudPush(){

scheduleDrawingsCloudSync();

}

export function flushDrawingsCloudPush(){

if(
drawingsPushTimer
){
clearTimeout(
drawingsPushTimer
);
drawingsPushTimer =
null;
}

return (async()=>{

await pushUnsyncedDrawingsImpl();
return reconcileLocalDrawingsWithCloud();

})();

}

async function setupDrawingsRealtime(
userId
){

await teardownDrawingsRealtime();

const ctx =
await getAuthed();

if(
!ctx?.sb ||
!userId
){
return;
}

drawingsRealtimeUserId =
userId;

drawingsRealtimeChannel =
ctx.sb
.channel(
`user_drawings:${userId}`,
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
event: "*",
schema: "public",
table: "user_drawings",
filter: `user_id=eq.${userId}`
},
()=>{
scheduleRemoteDrawingsSync();
}
)
.on(
"broadcast",
{
event: "drawings-rows-sync"
},
()=>{
void pullDrawingsFromCloudNow();
}
)
.subscribe(
status=>{

if(
status ===
"SUBSCRIBED"
){
console.log(
"[drawings] realtime: user_drawings"
);
}

if(
status ===
"CHANNEL_ERROR" ||
status ===
"TIMED_OUT"
){
console.warn(
"[drawings] realtime:",
status
);
}

}
);

}

async function teardownDrawingsRealtime(){

if(
drawingsRealtimeChannel
){

try{
await drawingsRealtimeChannel.unsubscribe();
}catch{
/* ignore */
}

drawingsRealtimeChannel =
null;
}

drawingsRealtimeUserId =
null;

}

function scheduleDrawingsFastPollTick(){

if(
fastPollStopped
){
return;
}

const delay =
document.visibilityState ===
"hidden"
? FAST_POLL_HIDDEN_MS
: FAST_POLL_MS;

fastPollTimer =
setTimeout(
()=>{

fastPollTimer =
null;

if(
isCloudLoggedInEffective() &&
!isDrawingsCloudSyncPaused()
){
void pullDrawingsFromCloudNow().catch(
()=>{}
);
}

scheduleDrawingsFastPollTick();

},
delay
);

}

function startDrawingsFastPoll(){

fastPollStopped =
false;

if(
fastPollTimer
){
clearTimeout(
fastPollTimer
);
fastPollTimer =
null;
}

scheduleDrawingsFastPollTick();

}

export function stopDrawingsFastPoll(){

fastPollStopped =
true;

if(
fastPollTimer
){
clearTimeout(
fastPollTimer
);
fastPollTimer =
null;
}

}

export function stopDrawingsCloudSync(){

stopDrawingsFastPoll();
void teardownDrawingsRealtime();

}

export async function hydrateDrawingsAfterAuth(){

return runCloudOp(
async()=>{

const ctx =
await getAuthed();

if(
!ctx
){
return;
}

await migrateLegacyBlobOnce(
ctx
);

await pushUnsyncedDrawingsImpl();
await reconcileLocalDrawingsWithCloud();
await pushUnsyncedDrawingsImpl();
await reconcileLocalDrawingsWithCloud();

}
);

}

let ready =
false;

export function initDrawingsCloudSync(){

if(
ready
){
return;
}

ready =
true;

window.addEventListener(
"drawings-updated",
()=>{
scheduleDrawingsCloudSync();
}
);

window.addEventListener(
"drawings-cleared-all",
()=>{

pauseDrawingsCloudSync(
60000
);

if(
registrySyncTimer
){
clearTimeout(
registrySyncTimer
);
registrySyncTimer =
null;
}

purgeAllLocalDrawingsStorage();

}
);

onCloudSyncChange(
()=>{

if(
isCloudLoggedIn()
){
void getAuthed().then(
ctx=>{

if(
ctx?.user?.id
){
void setupDrawingsRealtime(
ctx.user.id
);
}

}
);

void hydrateDrawingsAfterAuth();
startDrawingsFastPoll();
}else{
stopDrawingsCloudSync();
}

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
void pushUnsyncedDrawingsImpl();
return;
}

void pullDrawingsFromCloudNow();

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
isCloudLoggedIn()
){
void hydrateDrawingsAfterAuth();
void getAuthed().then(
ctx=>{
if(
ctx?.user?.id
){
void setupDrawingsRealtime(
ctx.user.id
);
}
}
);
startDrawingsFastPoll();
}

}

export async function setupDrawingsRealtimeForUser(
userId
){

if(
userId
){
await setupDrawingsRealtime(
userId
);
}

}
