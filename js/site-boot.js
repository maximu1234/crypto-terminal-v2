import {
initAlertMonitor
} from "./alert-monitor.js?v=35";

import {
ensureCloudReady
} from "./auth-ui.js?v=10";

import {
initAlertsCloudSync,
scheduleEnsureAlertsInCloud
} from "./alerts-cloud-sync.js?v=35";

import {
stripAlertFlagsNotInRegistry
} from "./alerts.js?v=35";

import {
isCloudLoggedIn,
isCloudSyncEnabled,
getCloudUserEmail
} from "./cloud-sync.js?v=12";

import {
isSupabaseConfigured
} from "./supabase-client.js?v=4";

initAlertMonitor();
initAlertsCloudSync();
void ensureCloudReady()
.then(async()=>{

stripAlertFlagsNotInRegistry();

const configured =
await isSupabaseConfigured();

let workerUrl = "";

try{
const env =
await import("./supabase-env.js?v=4");
workerUrl =
String(env.ALERT_WORKER_URL || "").trim();
}catch{
/* ignore */
}

const loggedIn =
isCloudLoggedIn();
const email =
getCloudUserEmail();

console.log(
"[Multichart] Supabase:",
configured
? "ключи есть"
: "НЕТ ключей — заполните js/supabase-env.js",
"| Вход:",
loggedIn
? (email || "да")
: "нет",
"| Worker:",
workerUrl || "нет URL"
);

if(
configured &&
!loggedIn
){
console.warn(
"[Multichart] Чтобы алерты попадали в Supabase и Telegram: шестерёнка в шапке → email → ссылка из письма."
);
}

if(
configured &&
loggedIn
){
scheduleEnsureAlertsInCloud();
}

})
.catch(err=>{
console.warn("cloud init failed:", err);
});
