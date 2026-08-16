import {
getSupabase,
isSupabaseConfigured
} from "../supabase-client.js?v=9";

import {
isCloudLoggedIn,
isCloudLoggedInEffective,
onCloudSyncChange,
ensureCloudLoginResolved
} from "../cloud-sync.js?v=66";

import {
clearAlertAuthCache,
readAlertTokenSync
} from "../alert-auth-cache.js?v=7";

import {
normalizeAlertWorkerBaseUrl
} from "../alert-worker-url.js?v=2";

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
broadcastAlertsRegistrySync,
setAlertsRealtimeChannel,
setAlertsRealtimeUserId
} from "./debug.js?v=4";

import {
getAuthed,
runCloudOp
} from "./worker-client.js?v=6";

import {
pullRegistryFromCloudNow,
pushUnsyncedAlerts,
scheduleRegistryCloudSync,
isRegistryCloudSyncPaused,
syncAllLocalAlertsToCloud
} from "./registry-sync.js?v=14";

import {
isAlertsCloudDisabled,
syncAlertsCloudPauseToServer
} from "../supabase-usage-prefs.js?v=5";

import {
isAlgoReducedCloudClient
} from "../page-routes.js?v=5";

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

const ALERTS_FALLBACK_PULL_MS =
30 *
60 *
1000;

const FAST_POLL_MS =
ALERTS_FALLBACK_PULL_MS;

const FAST_POLL_HIDDEN_MS =
ALERTS_FALLBACK_PULL_MS;

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

setAlertsRealtimeChannel(
null
);
setAlertsRealtimeUserId(
null
);
}

}

export function scheduleRemoteRegistrySync(){

if(
isAlertsCloudDisabled()
){
return;
}

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
await import("../alerts.js?v=106");

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
await import("../alerts.js?v=106");

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
await import("../alerts.js?v=106");

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
void import("../alerts.js?v=106").then(
({ applyRemoteAlertRemoved })=>{
applyRemoteAlertRemoved(row);
}
).catch(()=>{});
scheduleRemoteRegistrySync();
return;
}

const rawTriggered =
row?.triggered_at;
const triggered =
rawTriggered !== null &&
rawTriggered !== undefined &&
String(rawTriggered).trim() !== "" &&
String(rawTriggered).trim().toLowerCase() !== "null";

if(
row?.symbol &&
row?.shape_id &&
triggered
){
void import("../alerts.js?v=106").then(
({ applyRemoteAlertFired })=>{
applyRemoteAlertFired(row);
}
).catch(()=>{});
return;
}

if(
row &&
!row.triggered_at &&
!row.deleted_at &&
row.symbol &&
row.shape_id
){

void import("../alerts.js?v=106").then(
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

void import("../alerts.js?v=106").then(
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

setAlertsRealtimeUserId(
userId
);

setAlertsRealtimeChannel(
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

}
)
);

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
isAlertsCloudDisabled() ||
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
isAlgoReducedCloudClient() ||
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
!isAlertsCloudDisabled() &&
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

/* FALLBACK-CUT: частый pull отключён, остаётся safety в startAlertsFastPoll(). */
stopIosSafariVisiblePull();
return;

if(
isAlertsCloudDisabled()
){
stopIosSafariVisiblePull();
return;
}

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
isAlertsCloudDisabled() ||
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

/* FALLBACK-CUT: частый fallback отключён, остаётся safety в startAlertsFastPoll(). */
stopVisiblePullFallback();
return;

if(
isAlertsCloudDisabled()
){
stopVisiblePullFallback();
return;
}

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
isAlertsCloudDisabled() ||
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

if(
isAlertsCloudDisabled()
){
stopAlertsFastPoll();
await teardownAlertsRealtime();
return;
}

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
isAlertsCloudDisabled() ||
isAlgoReducedCloudClient()
){
return;
}

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
isAlertsCloudDisabled()
){
return 0;
}

if(
isAlgoReducedCloudClient()
){
return pushUnsyncedAlerts(
opts.force
? { forceAll: true }
: {}
);
}

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
await import("../alerts.js?v=106");

mergeRegistryFromChartDrawings({
stripFlags: stripOpts
});
}

await pushUnsyncedAlerts();
await pullRegistryFromCloudNow({
immediate: true
});

if(
isAlertsPage()
){
const { pullAlertHistoryFromCloud } =
await import("./registry-sync.js?v=14");

await pullAlertHistoryFromCloud({
force: !!opts.force
});
}

const { stripAlertFlagsNotInRegistry } =
await import("../alerts.js?v=106");

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

/* Algo Bot / Multichart Algo page: только push по событию; без hydrate/poll/realtime pull. */
if(
isAlgoReducedCloudClient()
){
window.addEventListener(
"alerts-changed",
()=>{
if(
isAlertsCloudDisabled()
){
return;
}

void pushUnsyncedAlerts().catch(
()=>{}
);
}
);

onCloudSyncChange(
()=>{
if(
!isCloudLoggedInEffective()
){
clearAlertAuthCache();
return;
}

void pushUnsyncedAlerts().catch(
()=>{}
);
}
);

return;
}

window.addEventListener(
"supabase-usage-prefs-changed",
e=>{

const disabled =
!!e.detail?.prefs?.disableAlertsCloud;

void syncAlertsCloudPauseToServer(
disabled
);

if(
disabled
){
stopAlertsFastPoll();
stopIosSafariVisiblePull();
stopVisiblePullFallback();
void teardownAlertsRealtime();
return;
}

if(
isCloudLoggedInEffective()
){
void refreshCloudAlertMode();
}

}
);

window.addEventListener(
"alerts-changed",
()=>{

if(
isAlertsCloudDisabled()
){
return;
}

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

if(
!isAlertsCloudDisabled()
){
startIosSafariVisiblePull();
startVisiblePullFallback();
}

}
);

void refreshCloudAlertMode();

if(
isAlertsCloudDisabled()
){
void syncAlertsCloudPauseToServer(
true
);
return;
}

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
isAlertsCloudDisabled() ||
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

window.addEventListener(
"pagehide",
()=>{

if(
isAlertsCloudDisabled() ||
!isCloudLoggedInEffective()
){
return;
}

void pushUnsyncedAlerts({
forceAll: true
}).catch(err=>{
console.warn(
"alert push on pagehide:",
err?.message || err
);
});

}
);

}
