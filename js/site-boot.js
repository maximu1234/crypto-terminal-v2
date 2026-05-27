import {
initAlertMonitor
} from "./alert-monitor.js?v=64";

import {
ensureCloudReady
} from "./auth-ui.js?v=23";

import {
initAlertsCloudSync,
scheduleRegistryCloudSync
} from "./alerts-cloud-sync.js?v=69";

import {
stripAlertFlagsNotInRegistry
} from "./alerts.js?v=60";

import {
isCloudLoggedIn,
isCloudSyncEnabled,
getCloudUserEmail
} from "./cloud-sync.js?v=19";

import {
isSupabaseConfigured
} from "./supabase-client.js?v=5";

import {
initBybitNetworkUi
} from "./bybit-network-ui.js?v=2";

import {
resetBybitEndpoints,
preloadBybitProxyConfig,
warmBybitWorkerProxy
} from "./bybit-fetch.js?v=10";

import {
initMobileRecovery
} from "./mobile-recovery.js?v=1";

import {
bindSiteMobileNav
} from "./site-mobile-nav.js?v=3";

import {
ensureDrawToolsVisible
} from "./draw-tools-visible.js?v=1";

initBybitNetworkUi();
preloadBybitProxyConfig();
warmBybitWorkerProxy();
initMobileRecovery();

if(
document.body.classList.contains(
"site-nav-page"
)
){
bindSiteMobileNav();
}

window.addEventListener(
"bybit-network-retry",
()=>{
resetBybitEndpoints();
}
);

initAlertMonitor();
initAlertsCloudSync();
ensureDrawToolsVisible();

import("./drawings-cloud-sync.js?v=9").then(
({ initDrawingsCloudSync })=>{
initDrawingsCloudSync();
}
);
void ensureCloudReady()
.then(async()=>{

window.dispatchEvent(
new CustomEvent(
"draw-tools-access-changed"
)
);

stripAlertFlagsNotInRegistry();

const configured =
await isSupabaseConfigured();

let workerUrl = "";

try{
const env =
await import("./supabase-env.js?v=5");
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
console.info(
"[Multichart] Develop → Empty Caches не удаляет рисунки в браузере. Полный сброс: страница Алерты → «Удалить»."
);
}

if(
configured &&
loggedIn
){
scheduleRegistryCloudSync();
}

})
.catch(err=>{
console.warn("cloud init failed:", err);
});
