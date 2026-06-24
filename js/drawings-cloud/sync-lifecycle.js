import {
waitForCloudAuth,
isCloudLoggedIn,
isCloudLoggedInEffective,
isCloudSyncEnabled,
isCloudApiUsable,
onCloudSyncChange,
notifyDrawings as notifyDrawingsListeners,
ensureCloudLoginResolved
} from "../cloud-sync.js?v=39";

import {
normalizeAlertWorkerBaseUrl
} from "../alert-worker-url.js?v=1";

import {
collectAllLocalDrawings,
pruneDuplicateShapeIdsAcrossSymbols,
applyDrawingsMapToLocal,
loadLocalTombstones,
saveLocalTombstones,
recordDrawingTombstone,
clearDrawingTombstone,
mergeDrawingsPayload,
mergeShapeLists,
applyTombstonesToShapeList,
getShapeRevisionTime,
unpackCloudDrawings,
packCloudDrawings,
purgeAllLocalDrawingsStorage,
DRAWINGS_TOMBSTONES_KEY,
DRAWINGS_GLOBAL_CLEAR_KEY
} from "../drawings-storage.js?v=7";

import {
withTimeout
} from "../async-timeout.js?v=1";

import {
createPullCoalescer,
isAlertsPage,
isDrawingsUiPage
} from "../cloud-sync-throttle.js?v=3";

import {
isSupabaseRealtimeDisabled,
isDrawingsCloudDisabled,
scaleSupabasePollMs
} from "../supabase-usage-prefs.js?v=2";

import {
readAlertTokenSync
} from "../alert-auth-cache.js?v=7";

import {
getSupabase
} from "../supabase-client.js?v=7";

import {
pushUnsyncedDrawingsImpl,
deleteDrawingFromCloud
} from "./worker-client.js?v=8";

import {
reconcileLocalDrawingsWithCloud,
pullDrawingsFromCloudNow,
migrateLegacyBlobOnce
} from "./pull-reconcile.js?v=10";


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

const DRAWINGS_ROW_SYNC_META_KEY =
"drawings_row_sync_v1";

const REGISTRY_SYNC_DEBOUNCE_MS =
200;

/** После push: не считать фигуру удалённой, пока REST/realtime не покажет строку. */
const PUSH_PENDING_GRACE_MS =
10000;

const RECONCILE_AFTER_PUSH_MS =
3000;

const FAST_POLL_MS =
IS_YANDEX
? 5000
: 2500;

const FAST_POLL_HIDDEN_MS =
IS_YANDEX
? 15000
: 8000;

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

let fastPollIntervalId =
0;

let lastDrawingsPullMs =
0;

let lastCloudDrawingsFingerprint =
"";

let cloudOpChain =
Promise.resolve();

let drawingsRestStressUntil =
0;

let drawingsSyncPausedUntil =
0;

let drawingsPushTimer =
null;

const REMOTE_SYNC_MS =
400;

const DRAWINGS_SYNC_DEBUG =
false;

const dirtyDrawingSymbols =
new Set();

const drawingsListeners =
new Set();

/** Прямой вызов графика (надёжнее window events в Safari). */
const chartRefreshHandlers =
new Set();


function drawingsDebugLog(
...args
){

if(
DRAWINGS_SYNC_DEBUG
){
console.log(...args);
}

}


function normalizeSymbolKey(
symbol
){

return String(
symbol ||
""
).trim().toUpperCase();

}


function markDrawingSymbolDirty(
symbol
){

const sym =
normalizeSymbolKey(symbol);

if(sym){
dirtyDrawingSymbols.add(sym);
}

}


function markDrawingSymbolsDirty(
symbols
){

for(
const sym of symbols ||
[]
){
markDrawingSymbolDirty(sym);
}

}


function getActiveChartSymbol(){

try{
const sym =
new URLSearchParams(
location.search || ""
).get("symbol");

return normalizeSymbolKey(sym);
}catch{
return "";
}

}


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


export function isDrawingsCloudSyncPaused(){

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


export function registerDrawingsChartRefresh(
handler
){

chartRefreshHandlers.add(
handler
);

return ()=>{
chartRefreshHandlers.delete(
handler
);
};

}


function invokeDrawingsChartRefresh(
symbols
){

chartRefreshHandlers.forEach(
handler=>{
try{
handler(
symbols
);
}catch{
/* ignore */
}
}
);

}


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


function pushPendingMetaKey(
symbol,
shapeId
){

return `${syncMetaKey(
symbol,
shapeId
)}:push_pending`;

}


function markShapePushPending(
symbol,
shapeId
){

const meta =
loadSyncMeta();

meta[
pushPendingMetaKey(
symbol,
shapeId
)
] =
Date.now();

saveSyncMeta(
meta
);

}


function clearShapePushPending(
symbol,
shapeId
){

const meta =
loadSyncMeta();

delete meta[
pushPendingMetaKey(
symbol,
shapeId
)
];

saveSyncMeta(
meta
);

}


function shapePushPending(
symbol,
shapeId
){

const pendingAt =
Number(
loadSyncMeta()[
pushPendingMetaKey(
symbol,
shapeId
)
]
) ||
0;

if(
pendingAt <=
0
){
return false;
}

return (
Date.now() -
pendingAt
) <
PUSH_PENDING_GRACE_MS;

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


function scheduleReconcileAfterPush(){

setTimeout(
()=>{

if(
isDrawingsCloudSyncPaused()
){
return;
}

void reconcileLocalDrawingsWithCloud();

},
RECONCILE_AFTER_PUSH_MS
);

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


function broadcastDrawingsSync(
deleted = null
){

if(
!drawingsRealtimeChannel
){
return;
}

const payload = {
at: Date.now()
};

if(
Array.isArray(
deleted
) &&
deleted.length >
0
){
payload.deleted =
deleted.map(
entry=>({
symbol: String(
entry?.symbol ||
""
).trim().toUpperCase(),
shapeId: String(
entry?.shapeId ||
entry?.shape_id ||
""
).trim()
})
).filter(
entry=>
entry.symbol &&
entry.shapeId
);
}

try{

drawingsRealtimeChannel.send({
type: "broadcast",
event: "drawings-rows-sync",
payload
});

}catch{
/* ignore */
}

}


function applyRemoteDrawingDeletes(
deleted
){

if(
!Array.isArray(
deleted
) ||
deleted.length ===
0
){
return false;
}

const local =
collectAllLocalDrawings();
const changed =
new Set();

for(
const entry of
deleted
){

const sym =
String(
entry?.symbol ||
""
).trim().toUpperCase();
const id =
String(
entry?.shapeId ||
entry?.shape_id ||
""
).trim();

if(
!sym ||
!id
){
continue;
}

recordDrawingTombstone(
sym,
id
);
clearShapePushPending(
sym,
id
);

const meta =
loadSyncMeta();

delete meta[
syncMetaKey(
sym,
id
)
];

saveSyncMeta(
meta
);

const list =
local[
sym
];

if(
!Array.isArray(
list
)
){
continue;
}

const next =
list.filter(
shape=>
String(
shape?.id ||
""
).trim() !==
id
);

if(
next.length !==
list.length
){
local[
sym
] =
next;
changed.add(
sym
);
}

}

if(
!changed.size
){
return false;
}

applyDrawingsMapToLocal(
local,
{ merge: false }
);

invokeDrawingsChartRefresh(
[
...changed
]
);

notifyDrawings(
[
...changed
]
);

return true;

}


export function scheduleDrawingsCloudSync(){

if(
isDrawingsCloudDisabled() ||
!isCloudLoggedInEffective() ||
isDrawingsCloudSyncPaused() ||
!isCloudApiUsable()
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
scheduleReconcileAfterPush();
return;
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

const pushed =
await pushUnsyncedDrawingsImpl();

if(
pushed >
0
){
await new Promise(
resolve=>{
setTimeout(
resolve,
RECONCILE_AFTER_PUSH_MS
);
}
);
}

return reconcileLocalDrawingsWithCloud();

})();

}


async function setupDrawingsRealtime(
userId
){

if(
isSupabaseRealtimeDisabled() ||
isDrawingsCloudDisabled()
){
return;
}

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
lastDrawingsPullMs =
0;
void pullDrawingsFromCloudNow();
}
)
.on(
"broadcast",
{
event: "drawings-rows-sync"
},
msg=>{

const deleted =
msg?.payload?.deleted;

if(
Array.isArray(
deleted
) &&
deleted.length >
0
){
applyRemoteDrawingDeletes(
deleted
);
}

lastDrawingsPullMs =
0;
void pullDrawingsFromCloudNow();

}
)
.subscribe(
status=>{

if(
status ===
"SUBSCRIBED"
){
drawingsDebugLog(
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


function drawingsFastPollTick(){

if(
fastPollStopped
){
return;
}

if(
isDrawingsCloudDisabled()
){
return;
}

if(
document.visibilityState !==
"visible"
){
return;
}

if(
!isCloudLoggedInEffective() ||
isDrawingsCloudSyncPaused()
){
return;
}

const now =
Date.now();

if(
now -
lastDrawingsPullMs <
scaleSupabasePollMs(
FAST_POLL_MS
)
){
return;
}

lastDrawingsPullMs =
now;

void pullDrawingsFromCloudNow().catch(
()=>{}
);

}


function startDrawingsFastPoll(){

if(
isDrawingsCloudDisabled() ||
!isDrawingsUiPage()
){
stopDrawingsFastPoll();
return;
}

fastPollStopped =
false;

if(
!fastPollIntervalId
){
fastPollIntervalId =
setInterval(
drawingsFastPollTick,
scaleSupabasePollMs(
FAST_POLL_MS
)
);
}

if(
fastPollTimer
){
clearTimeout(
fastPollTimer
);
fastPollTimer =
null;
}

fastPollTimer =
setTimeout(
function hiddenPoll(){

if(
fastPollStopped
){
return;
}

if(
document.visibilityState ===
"hidden" &&
isCloudLoggedInEffective() &&
!isDrawingsCloudSyncPaused()
){
const now =
Date.now();

if(
now -
lastDrawingsPullMs >=
scaleSupabasePollMs(
FAST_POLL_HIDDEN_MS
)
){
lastDrawingsPullMs =
now;
void pullDrawingsFromCloudNow().catch(
()=>{}
);
}

}

fastPollTimer =
setTimeout(
hiddenPoll,
scaleSupabasePollMs(
FAST_POLL_HIDDEN_MS
)
);

},
scaleSupabasePollMs(
FAST_POLL_HIDDEN_MS
)
);

}


export function stopDrawingsFastPoll(){

fastPollStopped =
true;

if(
fastPollIntervalId
){
clearInterval(
fastPollIntervalId
);
fastPollIntervalId =
0;
}

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

if(
isDrawingsCloudDisabled()
){
return;
}

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
let lastDrawingsAuthSyncSignature =
"";
let lastDrawingsAuthSyncAt =
0;


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
e=>{

if(
e?.detail?.remote
){
return;
}

if(
isAlertsPage()
){
return;
}

markDrawingSymbolDirty(
e?.detail?.symbol ||
getActiveChartSymbol()
);

scheduleDrawingsCloudSync();

}
);

window.addEventListener(
"drawings-batch-updated",
e=>{

if(
e?.detail?.remote
){
return;
}

if(
isAlertsPage()
){
return;
}

markDrawingSymbolsDirty(
e?.detail?.symbols
);

if(
!Array.isArray(
e?.detail?.symbols
) ||
e.detail.symbols.length ===
0
){
markDrawingSymbolDirty(
getActiveChartSymbol()
);
}

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

const signature =
`${isCloudLoggedInEffective() ? 1 : 0}:` +
`${readAlertTokenSync()?.user?.id || ""}:` +
`${isAlertsPage() ? 1 : 0}:` +
`${isDrawingsUiPage() ? 1 : 0}:` +
`${document.visibilityState}`;

if(
signature ===
lastDrawingsAuthSyncSignature
){
return;
}

lastDrawingsAuthSyncSignature =
signature;
lastDrawingsAuthSyncAt =
Date.now();

if(
!isCloudLoggedInEffective()
){
stopDrawingsCloudSync();
return;
}

if(
isAlertsPage()
){
stopDrawingsFastPoll();
return;
}

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

if(
isDrawingsUiPage()
){
startDrawingsFastPoll();
}else{
stopDrawingsFastPoll();
void coalesceDrawingsPull(
()=>reconcileLocalDrawingsWithCloud()
).catch(
()=>{}
);
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
isCloudLoggedInEffective() &&
!isAlertsPage()
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

if(
isDrawingsUiPage()
){
startDrawingsFastPoll();
}
}

}


export function bumpDrawingsPullNow(){

lastDrawingsPullMs =
0;

void pullDrawingsFromCloudNow().catch(
()=>{}
);

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

export {
pushUnsyncedDrawingsImpl,
deleteDrawingFromCloudNow,
deleteDrawingFromCloud,
clearAllDrawingsFromCloud,
resolveDrawingsRestAuth
} from "./worker-client.js?v=8";

export {
reconcileLocalDrawingsWithCloud,
pullDrawingsFromCloud,
pullDrawingsFromCloudNow
} from "./pull-reconcile.js?v=10";

export function getDirtyDrawingSymbols(){
return dirtyDrawingSymbols;
}

export function getDrawingsRestStressUntil(){
return drawingsRestStressUntil;
}

export function setDrawingsRestStressUntil(ms){
drawingsRestStressUntil = ms;
}

export function getLastCloudDrawingsFingerprint(){
return lastCloudDrawingsFingerprint;
}

export function setLastCloudDrawingsFingerprint(fp){
lastCloudDrawingsFingerprint = fp;
}

export {
markShapeSynced,
loadSyncMeta,
saveSyncMeta,
syncMetaKey,
markShapePushPending,
clearShapePushPending,
shapePushPending,
shapeNeedsPush,
shapeWasSynced,
broadcastDrawingsSync,
applyRemoteDrawingDeletes,
invokeDrawingsChartRefresh,
notifyDrawings,
drawingsDebugLog,
getActiveChartSymbol,
markDrawingSymbolDirty,
markDrawingSymbolsDirty,
getAuthed
};
