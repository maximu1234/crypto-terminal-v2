import {
getSupabase,
isSupabaseConfigured
} from "../supabase-client.js?v=7";

import {
isCloudLoggedIn,
isCloudLoggedInEffective,
onCloudSyncChange,
ensureCloudLoginResolved
} from "../cloud-sync.js?v=35";

import {
clearAlertAuthCache,
readAlertTokenSync
} from "../alert-auth-cache.js?v=7";

import {
normalizeAlertWorkerBaseUrl
} from "../alert-worker-url.js?v=1";

import {
isAlertsPage,
isDrawingsUiPage
} from "../cloud-sync-throttle.js?v=3";

import {
IS_YANDEX,
alertsDebugLog,
alertsRestStressUntil,
alertsRealtimeChannel,
alertsRealtimeUserId,
isAlertsPullInBackoff,
broadcastAlertsRegistrySync
} from "./debug.js?v=2";

import {
getAuthed,
runCloudOp
} from "./worker-client.js?v=3";

import {
pullRegistryFromCloudNow,
pushUnsyncedAlerts,
scheduleRegistryCloudSync,
isRegistryCloudSyncPaused,
syncAllLocalAlertsToCloud
} from "./registry-sync.js?v=3";

const IS_IOS_SAFARI =
/iP(hone|ad|od)/i.test(
navigator.userAgent || ""
) &&
/Safari/i.test(
navigator.userAgent || ""
) &&
!/CriOS|FxiOS|EdgiOS|YaBrowser|Yowser|OPiOS/i.test(
navigator.userAgent || ""
);

let refreshAlertModeTimer =
null;

let remoteRegistrySyncTimer = null;

const REMOTE_REGISTRY_SYNC_MS = 80;

let alertsFastPollTimer =
null;

let alertsFastPollStopped =
true;

let alertsFastPollIntervalId =
0;

let lastAlertsPullMs =
0;

const FAST_POLL_MS =
IS_YANDEX
? 5000
: 2500;

const FAST_POLL_HIDDEN_MS =
IS_YANDEX
? 15000
: 8000;

const IOS_SAFARI_VISIBLE_PULL_MS =
3500;

const VISIBLE_PULL_FALLBACK_MS =
2000;

let iosSafariPullTimer =
null;

let iosSafariPullInFlight =
false;

let visiblePullFallbackTimer =
null;

let visiblePullFallbackInFlight =
false;

let hydrateAlertsInflight = null;

let lastHydrateAlertsMs =
0;

let lastRemoteAlertMode = null;

async function updateBrowserCrossMode(){

const loggedIn =
isCloudLoggedIn();

let worker = "";

try{
const env =
await import("../supabase-env.js?v=5");
worker =
normalizeAlertWorkerBaseUrl(
env.ALERT_WORKER_URL || ""
);
}catch{
/* ignore */
}

const configured =
await isSupabaseConfigured();

const remote =
loggedIn &&
configured &&
!!worker;

/* Браузер всегда ловит пересечение (UI + /trigger). Worker — запас, если вкладка закрыта. */
if(lastRemoteAlertMode !== remote){
lastRemoteAlertMode = remote;

if(remote){
alertsDebugLog(
"[alerts] облако: UI в браузере + Telegram (браузер /trigger и worker)"
);
}else{
alertsDebugLog(
"[alerts] локально: только браузер (без Telegram)"
);
}
}

return remote;

}

async function teardownAlertsRealtime(){

if(alertsRealtimeChannel){
try{
const sb =
await getSupabase();

if(sb){
await sb.removeChannel(alertsRealtimeChannel);
}
}catch{
/* ignore */
}

alertsRealtimeChannel = null;
alertsRealtimeUserId = null;
}

}

export function scheduleRemoteRegistrySync(){

if(isRegistryCloudSyncPaused()){
return;
}

if(remoteRegistrySyncTimer){
clearTimeout(remoteRegistrySyncTimer);
}

remoteRegistrySyncTimer = setTimeout(()=>{

remoteRegistrySyncTimer = null;

if(
!isCloudLoggedInEffective()
){
return;
}

void pullRegistryFromCloudNow({
immediate: true
})
.then(
async n=>{

const { stripAlertFlagsNotInRegistry } =
await import("../alerts.js?v=97");

stripAlertFlagsNotInRegistry({
emitDrawingsEvents: false
});

if(
n >
0
){
window.dispatchEvent(
new CustomEvent(
"alerts-registry-pulled"
)
);
}

}
)
.catch(
err=>{
console.warn(
"[alerts] remote registry sync:",
err?.message || err
);
}
);

},
REMOTE_REGISTRY_SYNC_MS);

}

async function handleAlertsRealtimeDelete(
oldRow
){

const rawTriggered =
oldRow?.triggered_at;
const triggered =
rawTriggered !== null &&
rawTriggered !== undefined &&
String(rawTriggered).trim() !== "" &&
String(rawTriggered).trim().toLowerCase() !== "null";

if(triggered){

const { applyRemoteAlertFired } =
await import("../alerts.js?v=97");

applyRemoteAlertFired(oldRow);
return;

}

const sym =
String(
oldRow?.symbol || ""
).trim().toUpperCase();
const sid =
String(
oldRow?.shape_id ||
oldRow?.shapeId ||
""
).trim();

if(
sym &&
sid
){

const { applyRemoteAlertRemoved } =
await import("../alerts.js?v=97");

applyRemoteAlertRemoved(oldRow);

}else{
console.warn(
"[alerts] realtime DELETE без symbol/shape_id — включите replica identity full на price_alerts"
);
}

scheduleRemoteRegistrySync();

}

function handleAlertsRealtimeUpsert(
payload
){

const row =
payload?.new;

if(
row?.deleted_at &&
row.symbol &&
row.shape_id
){
void import("../alerts.js?v=97").then(
({ applyRemoteAlertRemoved })=>{
applyRemoteAlertRemoved(row);
}
).catch(()=>{});
scheduleRemoteRegistrySync();
return;
}

if(
row &&
!row.triggered_at &&
!row.deleted_at &&
row.symbol &&
row.shape_id
){

void import("../alerts.js?v=97").then(
({ applyRemoteAlertUpsert })=>{

if(
applyRemoteAlertUpsert(
row
)
){
return;
}

scheduleRemoteRegistrySync();

}
).catch(
err=>{
console.warn(
"[alerts] realtime upsert apply:",
err?.message || err
);
scheduleRemoteRegistrySync();
}
);

return;

}

scheduleRemoteRegistrySync();

}

function handleAlertsRealtimeHistoryInsert(
payload
){

const row =
payload?.new;

if(
!row?.symbol ||
!row?.shape_id
){
return;
}

void import("../alerts.js?v=97").then(
({ applyRemoteAlertHistoryFromCloud })=>{
applyRemoteAlertHistoryFromCloud(
row
);
}
).catch(
err=>{
console.warn(
"[alerts] realtime history:",
err?.message || err
);
}
);

}

async function setupAlertsRealtime(
userId
){

await teardownAlertsRealtime();

if(!userId){
return;
}

const sb =
await getSupabase();

if(!sb){
return;
}

alertsRealtimeUserId = userId;

alertsRealtimeChannel =
sb
.channel(
`price_alerts:${userId}`,
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
event: "INSERT",
schema: "public",
table: "price_alerts",
filter: `user_id=eq.${userId}`
},
payload=>{
handleAlertsRealtimeUpsert(
payload
);
}
)
.on(
"postgres_changes",
{
event: "UPDATE",
schema: "public",
table: "price_alerts",
filter: `user_id=eq.${userId}`
},
payload=>{
handleAlertsRealtimeUpsert(
payload
);
}
)
.on(
"postgres_changes",
{
event: "DELETE",
schema: "public",
table: "price_alerts",
filter: `user_id=eq.${userId}`
},
payload=>{
void handleAlertsRealtimeDelete(
payload.old
);
}
)
.on(
"postgres_changes",
{
event: "INSERT",
schema: "public",
table: "price_alert_events",
filter: `user_id=eq.${userId}`
},
payload=>{
handleAlertsRealtimeHistoryInsert(
payload
);
}
)
.on(
"broadcast",
{
event: "alerts-registry-sync"
},
()=>{
void pullRegistryFromCloudNow({
immediate: true
}).then(
n=>{
if(
n >
0
){
broadcastAlertsRegistrySync();
}
}
);
}
)
.subscribe(status=>{

if(
status === "SUBSCRIBED"
){
alertsDebugLog(
"[alerts] realtime: price_alerts"
);
return;
}

if(
status === "CHANNEL_ERROR" ||
status === "TIMED_OUT"
){
console.warn(
"[alerts] realtime:",
status
);
}

});

}

function alertsFastPollTick(){

if(
alertsFastPollStopped
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
isRegistryCloudSyncPaused() ||
Date.now() <
alertsRestStressUntil ||
isAlertsPullInBackoff()
){
return;
}

const now =
Date.now();

if(
now -
lastAlertsPullMs <
FAST_POLL_MS
){
return;
}

lastAlertsPullMs =
now;

void pullRegistryFromCloudNow({
immediate: true
}).catch(
()=>{}
);

}

export function startAlertsFastPoll(){

if(
!isDrawingsUiPage() ||
isAlertsPage()
){
stopAlertsFastPoll();
return;
}

alertsFastPollStopped =
false;

if(
!alertsFastPollIntervalId
){
alertsFastPollIntervalId =
setInterval(
alertsFastPollTick,
FAST_POLL_MS
);
}

if(
alertsFastPollTimer
){
clearTimeout(
alertsFastPollTimer
);
alertsFastPollTimer =
null;
}

alertsFastPollTimer =
setTimeout(
function hiddenPoll(){

if(
alertsFastPollStopped
){
return;
}

if(
document.visibilityState ===
"hidden" &&
isCloudLoggedInEffective() &&
!isRegistryCloudSyncPaused()
){
const now =
Date.now();

if(
now -
lastAlertsPullMs >=
FAST_POLL_HIDDEN_MS
){
lastAlertsPullMs =
now;
void pullRegistryFromCloudNow({
immediate: true
}).catch(
()=>{}
);
}

}

alertsFastPollTimer =
setTimeout(
hiddenPoll,
FAST_POLL_HIDDEN_MS
);

},
FAST_POLL_HIDDEN_MS
);

}

export function stopAlertsFastPoll(){

alertsFastPollStopped =
true;

if(
alertsFastPollIntervalId
){
clearInterval(
alertsFastPollIntervalId
);
alertsFastPollIntervalId =
0;
}

if(
alertsFastPollTimer
){
clearTimeout(
alertsFastPollTimer
);
alertsFastPollTimer =
null;
}

}

function startIosSafariVisiblePull(){

if(
!IS_IOS_SAFARI ||
iosSafariPullTimer
){
return;
}

iosSafariPullTimer =
setInterval(
()=>{

if(
iosSafariPullInFlight ||
!isCloudLoggedInEffective() ||
document.visibilityState !== "visible" ||
isAlertsPage() ||
!isDrawingsUiPage() ||
isRegistryCloudSyncPaused() ||
Date.now() <
alertsRestStressUntil ||
isAlertsPullInBackoff()
){
return;
}

iosSafariPullInFlight =
true;

void ensureCloudLoginResolved(8000)
.catch(()=>null)
.then(()=>
pullRegistryFromCloudNow({
immediate: true
})
)
.catch(()=>{})
.finally(()=>{
iosSafariPullInFlight =
false;
});

},
IOS_SAFARI_VISIBLE_PULL_MS
);

}

function stopIosSafariVisiblePull(){

if(
!iosSafariPullTimer
){
return;
}

clearInterval(
iosSafariPullTimer
);
iosSafariPullTimer =
null;
iosSafariPullInFlight =
false;

}

function startVisiblePullFallback(){

if(
visiblePullFallbackTimer
){
return;
}

visiblePullFallbackTimer =
setInterval(
()=>{

if(
visiblePullFallbackInFlight ||
!isCloudLoggedInEffective() ||
document.visibilityState !== "visible" ||
isAlertsPage() ||
!isDrawingsUiPage() ||
isRegistryCloudSyncPaused() ||
Date.now() <
alertsRestStressUntil ||
isAlertsPullInBackoff()
){
return;
}

visiblePullFallbackInFlight =
true;

void ensureCloudLoginResolved(8000)
.catch(()=>null)
.then(()=>
pullRegistryFromCloudNow({
immediate: true
})
)
.catch(()=>{})
.finally(()=>{
visiblePullFallbackInFlight =
false;
});

},
VISIBLE_PULL_FALLBACK_MS
);

}

function stopVisiblePullFallback(){

if(
!visiblePullFallbackTimer
){
return;
}

clearInterval(
visiblePullFallbackTimer
);
visiblePullFallbackTimer =
null;
visiblePullFallbackInFlight =
false;

}

async function refreshCloudAlertModeImpl(){

await updateBrowserCrossMode();

const configured =
await isSupabaseConfigured();
const ctx =
await getAuthed();

if(
isCloudLoggedInEffective() &&
configured &&
ctx?.user?.id
){
await setupAlertsRealtime(
ctx.user.id
);

if(
isDrawingsUiPage() &&
!isAlertsPage()
){
startAlertsFastPoll();
}else{
stopAlertsFastPoll();
}

}else{
await teardownAlertsRealtime();
stopAlertsFastPoll();
}

}

function refreshCloudAlertMode(){

if(
refreshAlertModeTimer
){
clearTimeout(
refreshAlertModeTimer
);
}

refreshAlertModeTimer =
setTimeout(
()=>{

refreshAlertModeTimer =
null;
void refreshCloudAlertModeImpl().catch(
err=>{
console.warn(
"[alerts] refresh mode:",
err?.message || err
);
}
);

},
IS_YANDEX
? 600
: 350
);

}

export async function setupAlertsRealtimeForUser(
userId
){

if(
userId
){
await setupAlertsRealtime(
userId
);
}

}

export async function hydrateAlertsAfterAuth(
opts = {}
){

if(
hydrateAlertsInflight
){
return hydrateAlertsInflight;
}

const now =
Date.now();

if(
!opts.force &&
now -
lastHydrateAlertsMs <
(
isAlertsPage()
? 8000
: 4000
)
){
return 0;
}

hydrateAlertsInflight =
runCloudOp(
async()=>{

alertsDebugLog(
"[alerts] hydrate after login…"
);

const stripOpts =
isAlertsPage()
? {
registryOnlySymbols: true,
emitDrawingsEvents: false
}
: {};

if(
!isAlertsPage()
){
const { mergeRegistryFromChartDrawings } =
await import("../alerts.js?v=97");

mergeRegistryFromChartDrawings({
stripFlags: stripOpts
});
}

await pushUnsyncedAlerts();
await pullRegistryFromCloudNow({
immediate: true
});
await pushUnsyncedAlerts();
await pullRegistryFromCloudNow({
immediate: true
});

const { stripAlertFlagsNotInRegistry } =
await import("../alerts.js?v=97");

stripAlertFlagsNotInRegistry(
stripOpts
);

lastHydrateAlertsMs =
Date.now();

}
).finally(
()=>{

hydrateAlertsInflight =
null;

}
);

return hydrateAlertsInflight;

}

export async function syncAlertsWithCloud(){

return syncAllLocalAlertsToCloud();

}

let alertsCloudSyncReady = false;
let lastAlertsAuthSyncSignature =
"";
let lastAlertsAuthSyncAt =
0;

export function initAlertsCloudSync(){

if(alertsCloudSyncReady){
return;
}

alertsCloudSyncReady = true;

window.addEventListener(
"alerts-changed",
()=>{
scheduleRegistryCloudSync();
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
lastAlertsAuthSyncSignature
){
return;
}

lastAlertsAuthSyncSignature =
signature;
lastAlertsAuthSyncAt =
Date.now();

if(
!isCloudLoggedInEffective()
){
stopAlertsFastPoll();
stopIosSafariVisiblePull();
stopVisiblePullFallback();
clearAlertAuthCache();
void teardownAlertsRealtime();
return;
}

void refreshCloudAlertMode();

if(
!isAlertsPage()
){
void hydrateAlertsAfterAuth().catch(
err=>{
console.warn(
"alert cloud hydrate:",
err?.message || err
);
}
);
}

startIosSafariVisiblePull();
startVisiblePullFallback();

}
);

void refreshCloudAlertMode();

if(
isCloudLoggedInEffective() &&
!isAlertsPage()
){
void hydrateAlertsAfterAuth().catch(
err=>{
console.warn(
"alert cloud hydrate init:",
err?.message || err
);
}
);

if(
isDrawingsUiPage()
){
startAlertsFastPoll();
}

startIosSafariVisiblePull();
startVisiblePullFallback();
}

const pullWhenVisible = ()=>{

if(
!isCloudLoggedInEffective()
){
return;
}

if(
document.visibilityState ===
"hidden"
){
void pushUnsyncedAlerts();
return;
}

void ensureCloudLoginResolved(8000)
.catch(()=>null)
.then(()=>
pullRegistryFromCloudNow({
immediate: true
})
)
.catch(err=>{
console.warn(
"alert cloud pull:",
err?.message || err
);
});

};

window.addEventListener(
"focus",
pullWhenVisible
);

document.addEventListener(
"visibilitychange",
pullWhenVisible
);

document.addEventListener(
"visibilitychange",
()=>{

if(
document.visibilityState !== "visible" ||
!isCloudLoggedInEffective()
){
return;
}

void refreshCloudAlertMode();

}
);

const retryPushWhenVisible = ()=>{

if(
document.visibilityState !== "visible" ||
!isCloudLoggedInEffective()
){
return;
}

void pushUnsyncedAlerts().catch(err=>{
console.warn(
"alert push on visible:",
err?.message || err
);
});

};

document.addEventListener(
"visibilitychange",
retryPushWhenVisible
);

window.addEventListener(
"focus",
retryPushWhenVisible
);

}
