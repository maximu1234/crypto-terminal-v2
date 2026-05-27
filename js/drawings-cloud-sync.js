import {
waitForCloudAuth,
isCloudLoggedIn,
onCloudSyncChange,
notifyDrawings as notifyDrawingsListeners
} from "./cloud-sync.js?v=16";

import {
collectAllLocalDrawings,
applyDrawingsMapToLocal,
loadLocalTombstones,
saveLocalTombstones,
recordDrawingTombstone,
mergeDrawingsPayload,
mergeShapeLists,
applyTombstonesToShapeList,
getShapeRevisionTime,
unpackCloudDrawings,
DRAWINGS_TOMBSTONES_KEY
} from "./drawings-storage.js?v=3";

import {
withTimeout
} from "./async-timeout.js?v=1";

const DRAWINGS_ROW_SYNC_META_KEY =
"drawings_row_sync_v1";

const BLOB_MIGRATED_KEY =
"drawings_table_migrated_v1";

const REGISTRY_SYNC_DEBOUNCE_MS =
200;

const FAST_POLL_MS =
2500;

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

let cloudOpChain =
Promise.resolve();

const REMOTE_SYNC_MS =
50;

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
symbols
){

notifyDrawingsListeners(
symbols
);

drawingsListeners.forEach(
fn=>{
try{
fn(
symbols
);
}catch{
/* ignore */
}
}
);

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

async function getAuthed(){

return waitForCloudAuth(
12000
);

}

function runCloudOp(
fn
){

const job =
cloudOpChain.then(
()=>fn()
);

cloudOpChain =
job.catch(
()=>{}
);

return job;

}

function scheduleRemoteDrawingsSync(){

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
!isCloudLoggedIn()
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

const { error } =
await withTimeout(
ctx.sb
.from(
"user_drawings"
)
.upsert(
{
user_id: ctx.user.id,
symbol: sym,
shape_id: shapeId,
shape,
updated_at: new Date(
rev
).toISOString(),
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
error
){
console.warn(
"[drawings] upsert:",
error.message
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

export async function deleteDrawingFromCloud(
symbol,
shapeId
){

const ctx =
await getAuthed();

if(
!ctx
){
return false;
}

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

const { error } =
await ctx.sb
.from(
"user_drawings"
)
.delete()
.eq(
"user_id",
ctx.user.id
)
.eq(
"symbol",
sym
)
.eq(
"shape_id",
sid
);

if(
error
){
console.warn(
"[drawings] delete:",
error.message
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

async function pushUnsyncedDrawingsImpl(){

const ctx =
await getAuthed();

if(
!ctx
){
return 0;
}

const local =
collectAllLocalDrawings();
const tombstones =
loadLocalTombstones();

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
await upsertDrawingRow(
ctx,
sym,
shape
)
){
pushed += 1;
}

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

const legacy =
await fetchLegacyBlobDrawings(
ctx
);

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

/**
 * Сверка с user_drawings — как price_alerts для алертов.
 */
export async function reconcileLocalDrawingsWithCloud(){

const ctx =
await getAuthed();

if(
!ctx
){
return 0;
}

const { data, error } =
await ctx.sb
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

if(
error
){

if(
error.code ===
"42P01" ||
/PGRST205|does not exist/i.test(
String(
error.message ||
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
error.message
);
return 0;

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

markShapeSynced(
sym,
sid,
getShapeRevisionTime(
shape
)
);

}

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

const mergedList =
applyTombstonesToShapeList(
mergeShapeLists(
local[
sym
],
cloudBySymbol[
sym
]
),
tombstones[
sym
]
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
}

return changed.length;

}

export async function pullDrawingsFromCloud(){

return runCloudOp(
()=>reconcileLocalDrawingsWithCloud()
);

}

let drawingsPushTimer =
null;

const PUSH_DEBOUNCE_MS =
250;

export function scheduleDrawingsCloudSync(){

if(
!isCloudLoggedIn()
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
()=>reconcileLocalDrawingsWithCloud()
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

return runCloudOp(
async()=>{

await pushUnsyncedDrawingsImpl();
await reconcileLocalDrawingsWithCloud();

}
);

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
void pullDrawingsFromCloud();
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

function startDrawingsFastPoll(){

stopDrawingsFastPoll();

fastPollTimer =
setInterval(
()=>{

if(
!isCloudLoggedIn()
){
return;
}

void pullDrawingsFromCloud();

},
FAST_POLL_MS
);

}

export function stopDrawingsFastPoll(){

if(
fastPollTimer
){
clearInterval(
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
!isCloudLoggedIn()
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

void pullDrawingsFromCloud();

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
