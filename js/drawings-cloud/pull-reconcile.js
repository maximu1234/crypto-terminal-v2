import {
collectAllLocalDrawings,
pruneDuplicateShapeIdsAcrossSymbols,
applyDrawingsMapToLocal,
loadLocalTombstones,
recordDrawingTombstone,
clearDrawingTombstone,
mergeShapeLists,
applyTombstonesToShapeList,
getShapeRevisionTime,
unpackCloudDrawings,
mergeDrawingsPayload,
purgeAllLocalDrawingsStorage,
BLOB_MIGRATED_KEY,
DRAWINGS_GLOBAL_CLEAR_KEY
} from "../drawings-storage.js?v=7";

import {
withTimeout
} from "../async-timeout.js?v=1";

import {
getSupabase
} from "../supabase-client.js?v=7";

import {
waitForCloudAuth
} from "../cloud-sync.js?v=36";

import {
createPullCoalescer,
isDrawingsUiPage
} from "../cloud-sync-throttle.js?v=3";

import {
isDeletedAtColumnError,
upsertDrawingRow,
resolveDrawingsRestAuth,
fetchWithTimeout
} from "./worker-client.js?v=7";

import {
getAuthed,
isDrawingsCloudSyncPaused,
invokeDrawingsChartRefresh,
notifyDrawings,
markShapeSynced,
shapeWasSynced,
shapeNeedsPush,
shapePushPending,
clearShapePushPending,
drawingsDebugLog,
runCloudOp,
getDrawingsRestStressUntil,
setDrawingsRestStressUntil,
getLastCloudDrawingsFingerprint,
setLastCloudDrawingsFingerprint,
markDrawingSymbolDirty,
scheduleDrawingsCloudPush
} from "./sync-lifecycle.js?v=7";

const IS_YANDEX =
/YaBrowser|Yandex/i.test(
navigator.userAgent ||
""
);

const coalesceDrawingsPull =
createPullCoalescer({
minIntervalMs: IS_YANDEX
? 4000
: 2000,
errorBackoffMs: IS_YANDEX
? 15000
: 8000
});

let lastEmptyCloudPendingWarnMs =
0;

const EMPTY_CLOUD_PENDING_WARN_MS =
30000;

async function fetchCloudDrawingsViaRest(
auth
){

let env;

try{
env =
await import("../supabase-env.js?v=5");
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
const headers = {
apikey: anon,
Authorization: `Bearer ${auth.token}`,
Accept: "application/json",
"Cache-Control": "no-cache, no-store",
Pragma: "no-cache"
};

const paths = [
`user_drawings?user_id=eq.${uid}&select=symbol,shape_id,shape,updated_at&deleted_at=is.null`,
`user_drawings?user_id=eq.${uid}&select=symbol,shape_id,shape,updated_at`
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
headers,
cache: "no-store"
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
const msg =
err?.message || err;

if(
/INSUFFICIENT_RESOURCES/i.test(
String(
msg
)
)
){
setDrawingsRestStressUntil(
Date.now() +
(
IS_YANDEX
? 20000
: 10000
)
);
}else{
console.warn(
"[drawings] fetch REST:",
msg
);
}

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


export async function migrateLegacyBlobOnce(
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
drawingsDebugLog(
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

if(
Date.now() <
getDrawingsRestStressUntil()
){
return 0;
}

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

clearShapePushPending(
sym,
sid
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

const cloudFetchHasRows =
(
data ||
[]
).length >
0;

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
cloudFetchHasRows &&
shapeWasSynced(
sym,
id
)
){

if(
shapePushPending(
sym,
id
)
){
return true;
}

recordDrawingTombstone(
sym,
id
);
return false;
}

return true;

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

invokeDrawingsChartRefresh(
null
);

for(
const sym of changed
){

const list =
applyMap[
sym
] ||
[];

for(
const shape of list
){

if(
shape?.id
){
markShapeSynced(
sym,
shape.id,
getShapeRevisionTime(
shape
)
);
}

}

}

setLastCloudDrawingsFingerprint(
buildCloudDrawingsFingerprint(
data
)
);

notifyDrawings(
changed
);

drawingsDebugLog(
"[drawings] reconcile: обновлено символов",
changed.length
);

}else{

const fp =
buildCloudDrawingsFingerprint(
data
);

if(
fp !==
getLastCloudDrawingsFingerprint() &&
cloudFetchHasRows
){

setLastCloudDrawingsFingerprint(
fp
);

const refreshSyms =
Array.from(
symbols
);

if(
refreshSyms.length
){
invokeDrawingsChartRefresh(
refreshSyms
);

for(
const sym of refreshSyms
){
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

drawingsDebugLog(
"[drawings] Supabase пусто — локальные рисунки сняты с графиков"
);
}

}else if(
total >
0 &&
pending >
0
){

const now =
Date.now();

if(
now -
lastEmptyCloudPendingWarnMs >=
EMPTY_CLOUD_PENDING_WARN_MS
){
lastEmptyCloudPendingWarnMs =
now;
console.warn(
"[drawings] на графике есть рисунки, в Supabase 0 строк — отправка в облако…"
);
}

for(
const sym of Object.keys(
local
)
){
markDrawingSymbolDirty(
sym
);
}

scheduleDrawingsCloudPush();

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

const n =
await coalesceDrawingsPull(
()=>reconcileLocalDrawingsWithCloud()
);

if(
n >
0 ||
isDrawingsUiPage()
){
invokeDrawingsChartRefresh(
null
);
}

return n;

}
