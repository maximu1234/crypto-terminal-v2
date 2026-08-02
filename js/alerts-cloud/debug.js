import {
getSupabase,
isSupabaseConfigured,
SUPABASE_AUTH_STORAGE_KEY
} from "../supabase-client.js?v=7";

import {
waitForCloudAuth,
isCloudLoggedIn,
isCloudLoggedInEffective,
onCloudSyncChange,
ensureCloudLoginResolved
} from "../cloud-sync.js?v=54";

import {
getCachedAlertAuth,
setAlertAuthCache,
clearAlertAuthCache,
resolveAlertAuthFast,
readAlertTokenSync,
readPersistedAuthSession
} from "../alert-auth-cache.js?v=7";

import {
normalizeAlertWorkerBaseUrl
} from "../alert-worker-url.js?v=2";

import {
createPullCoalescer,
isAlertsPage,
isDrawingsUiPage
} from "../cloud-sync-throttle.js?v=3";


const IS_YANDEX =
/YaBrowser|Yandex/i.test(
navigator.userAgent ||
""
);

function isAlertsSyncDebugEnabled(){

try{
if(
localStorage.getItem(
"ct_debug_alerts"
) === "1"
){
return true;
}
}catch{
/* ignore */
}

return /(?:\?|&)debug=alerts(?:&|$)/i.test(
location.search || ""
);

}

function alertsDebugLog(
...args
){

if(
isAlertsSyncDebugEnabled()
){
console.log(...args);
}

}

let alertsRestStressUntil =
0;

let alertsPullFailureStreak =
0;

let alertsPullBackoffUntil =
0;

let lastAlertsPullWarnAt =
0;

/** @type {import("@supabase/supabase-js").RealtimeChannel | null} */
export let alertsRealtimeChannel =
null;

export let alertsRealtimeUserId =
null;

function warnAlertsPullThrottled(
...args
){

const now =
Date.now();

if(
now - lastAlertsPullWarnAt <
6000
){
return;
}

lastAlertsPullWarnAt =
now;
console.warn(...args);

}

function markAlertsPullFailure(
reason
){

alertsPullFailureStreak += 1;

const baseMs =
IS_YANDEX
? 2500
: 1800;

const delayMs =
Math.min(
30000,
baseMs *
(
2 **
Math.max(
0,
alertsPullFailureStreak - 1
)
)
);

alertsPullBackoffUntil =
Date.now() + delayMs;

warnAlertsPullThrottled(
"alert cloud pull backoff:",
delayMs,
"ms",
reason || ""
);

}

function markAlertsPullSuccess(){

alertsPullFailureStreak =
0;
alertsPullBackoffUntil =
0;

}

function isAlertsPullInBackoff(){

return (
Date.now() <
alertsPullBackoffUntil
);

}

/** Снимок активных строк облака — ловим срабатывание, если realtime DELETE без payload (iPad). */
export const lastSeenCloudAlerts =
new Map();

function broadcastAlertsRegistrySync(){

if(
!alertsRealtimeChannel
){
return;
}

try{

alertsRealtimeChannel.send({
type: "broadcast",
event: "alerts-registry-sync",
payload: {
at: Date.now()
}
});

}catch{
/* ignore */
}

}

export function setAlertsRealtimeChannel(
channel
){

alertsRealtimeChannel =
channel;

}

export function setAlertsRealtimeUserId(
userId
){

alertsRealtimeUserId =
userId;

}

export {
IS_YANDEX,
isAlertsSyncDebugEnabled,
alertsDebugLog,
warnAlertsPullThrottled,
markAlertsPullFailure,
markAlertsPullSuccess,
isAlertsPullInBackoff,
broadcastAlertsRegistrySync,
alertsRestStressUntil
};
