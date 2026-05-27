import {
initAlertMonitor
} from "./alert-monitor.js?v=64";

import {
ensureCloudReady
} from "./auth-ui.js?v=24";

import {
isAlertsPage
} from "./cloud-sync-throttle.js?v=2";

import {
initAlertsCloudSync,
scheduleRegistryCloudSync
} from "./alerts-cloud-sync.js?v=80";

import {
stripAlertFlagsNotInRegistry
} from "./alerts.js?v=80";

import {
isCloudLoggedIn,
isCloudLoggedInEffective,
isCloudSyncEnabled,
getCloudUserEmail,
pullDeviceStateFromCloud,
onCloudSyncChange
} from "./cloud-sync.js?v=25";

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

async function startSiteBoot(){

const onCoins =
/\/coins(\.html)?\/?$/i.test(
location.pathname ||
""
);

if(
onCoins &&
!window.__coinsAppReady
){
await new Promise(
resolve=>{
if(
window.__coinsAppReady
){
resolve();
return;
}
window.addEventListener(
"coins-app-ready",
()=>{
resolve();
},
{ once: true }
);
setTimeout(
resolve,
30000
);
}
);
}

initBybitNetworkUi();
preloadBybitProxyConfig();
warmBybitWorkerProxy();
initMobileRecovery();

}

void startSiteBoot();

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

onCloudSyncChange(
()=>{

if(
isCloudLoggedInEffective() &&
!isAlertsPage()
){
void pullDeviceStateFromCloud();
}

window.dispatchEvent(
new CustomEvent(
"draw-tools-access-changed"
)
);

}
);

import("./drawings-cloud-sync.js?v=19").then(
({ initDrawingsCloudSync })=>{
initDrawingsCloudSync();
}
);

import("./favorites-cloud-sync.js?v=2").then(
({ initFavoritesCloudSync })=>{
initFavoritesCloudSync();
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
isCloudLoggedInEffective() &&
!isAlertsPage()
){
scheduleRegistryCloudSync();
void pullDeviceStateFromCloud();
}

})
.catch(err=>{
console.warn("cloud init failed:", err);
});
