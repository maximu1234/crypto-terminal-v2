import {
ensureCloudLoginResolved
} from "../cloud-sync.js?v=32";

import {
normalizeAlertWorkerBaseUrl
} from "../alert-worker-url.js?v=1";

import {
collectAllLocalDrawings,
pruneDuplicateShapeIdsAcrossSymbols,
loadLocalTombstones,
getShapeRevisionTime,
packCloudDrawings,
DRAWINGS_GLOBAL_CLEAR_KEY
} from "../drawings-storage.js?v=6";

import {
withTimeout
} from "../async-timeout.js?v=1";

import {
readAlertTokenSync
} from "../alert-auth-cache.js?v=7";

import {
isCloudLoggedInEffective,
isCloudSyncEnabled
} from "../cloud-sync.js?v=32";

import {
markShapeSynced,
loadSyncMeta,
saveSyncMeta,
syncMetaKey,
shapeNeedsPush,
broadcastDrawingsSync,
drawingsDebugLog,
getActiveChartSymbol,
isDrawingsCloudSyncPaused,
markDrawingSymbolDirty,
getDirtyDrawingSymbols
} from "./sync-lifecycle.js?v=1";


let cachedDrawingsWorkerBaseUrl =
null;

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


export function resolveDrawingsRestAuth(){

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

async function getDrawingsWorkerBaseUrl(){

if(
cachedDrawingsWorkerBaseUrl !==
null
){
return cachedDrawingsWorkerBaseUrl;
}

try{
const env =
await import("../supabase-env.js?v=5");
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

drawingsDebugLog(
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

try{
await ensureCloudLoginResolved(8000);
}catch{
/* ignore */
}

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
await import("../supabase-env.js?v=5");
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

if(
/JWT expired|PGRST303|invalid jwt/i.test(
String(text)
)
){
try{
await ensureCloudLoginResolved(10000);
}catch{
/* ignore */
}

let fullCtx =
ctx;

if(
!fullCtx?.sb
){
try{
fullCtx =
await withTimeout(
getAuthed(),
8000,
"getAuthed purge refresh"
);
}catch{
fullCtx = ctx;
}
}

const refreshed =
(
fullCtx?.sb
? await getAccessTokenForUser(fullCtx)
: null
) ||
resolveDrawingsRestAuth()?.token ||
null;

if(
refreshed &&
refreshed !== token
){
const retry =
await fetchWithTimeout(
`${base}/rest/v1/${path}`,
{
method: "DELETE",
headers: {
apikey: anon,
Authorization: `Bearer ${refreshed}`,
Prefer: "return=minimal"
}
},
15000
);

if(retry.ok){
drawingsDebugLog(
"[drawings] purge REST ok (retry):",
all
? "all"
: `${sym} ${sid}`
);
return true;
}
}
}

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

drawingsDebugLog(
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

/** Прямой вызов графика (надёжнее window events в Safari). */
const chartRefreshHandlers =
new Set();


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
await import("../supabase-env.js?v=5");
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
await import("../supabase-env.js?v=5");
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

const ok =
await purgeDrawingsViaRest({
symbol: sym,
shapeId: sid,
ctx:
auth?.user
? {
user: auth.user
}
: null,
token:
auth?.token || null
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


export async function pushUnsyncedDrawingsImpl(){

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
const activeSymbol =
getActiveChartSymbol();
const symbolsToProcess =
new Set([
...getDirtyDrawingSymbols()
]);

if(activeSymbol){
symbolsToProcess.add(activeSymbol);
}

if(
symbolsToProcess.size ===
0
){
return 0;
}
const symbolFailed =
new Set();
const symbolProcessed =
new Set();
const symbolFoundAnyLocalData =
new Set();

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

if(
list.length >
0
){
symbolFoundAnyLocalData.add(sym);
}

if(
!symbolsToProcess.has(sym)
){
continue;
}

symbolProcessed.add(sym);

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
}else{
symbolFailed.add(sym);
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
!symbolsToProcess.has(sym)
){
continue;
}

symbolFoundAnyLocalData.add(sym);
symbolProcessed.add(sym);

if(
await deleteDrawingFromCloud(
sym,
id
)
){
pushed += 1;
}else{
symbolFailed.add(sym);
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

if(
!symbolsToProcess.has(sym)
){
continue;
}

if(
Object.keys(tombs).length >
0
){
symbolFoundAnyLocalData.add(sym);
}

symbolProcessed.add(sym);

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
}else{
symbolFailed.add(sym);
}

}

}

for(
const sym of symbolProcessed
){
if(
!symbolFailed.has(sym)
){
getDirtyDrawingSymbols().delete(sym);
}
}

for(
const sym of symbolsToProcess
){
if(
!symbolFoundAnyLocalData.has(sym)
){
getDirtyDrawingSymbols().delete(sym);
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
drawingsDebugLog(
"[drawings] Supabase: сохранено фигур —",
pushed
);
}

}

return pushed;

}
