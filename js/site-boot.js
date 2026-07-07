import {
initAlertMonitor
} from "./alert-monitor.js?v=65";

import {
ensureCloudReady
} from "./auth-ui.js?v=35";

import {
isAlertsPage
} from "./cloud-sync-throttle.js?v=3";

import {
initAlertsCloudSync,
scheduleRegistryCloudSync
} from "./alerts-cloud-sync.js?v=111";

import {
stripAlertFlagsNotInRegistry
} from "./alerts.js?v=100";

import {
isCloudLoggedIn,
isCloudLoggedInEffective,
isCloudSyncEnabled,
getCloudUserEmail,
onCloudSyncChange
} from "./cloud-sync.js?v=40";

import {
isSupabaseConfigured
} from "./supabase-client.js?v=7";

import {
initExchangeContext
} from "./market-api.js?v=1";

import {
initBybitNetworkUi
} from "./bybit-network-ui.js?v=2";

import {
resetBybitEndpoints,
preloadBybitProxyConfig,
warmBybitWorkerProxy
} from "./bybit-fetch.js?v=17";

import {
initMobileRecovery
} from "./mobile-recovery.js?v=1";

import {
bindSiteMobileNav
} from "./site-mobile-nav.js?v=4";

import {
ensureDrawToolsVisible
} from "./draw-tools-visible.js?v=1";

import {
initSuppressNativeContextMenu
} from "./suppress-native-context-menu.js?v=2";

import {
initFocusBlurAfterPick
} from "./focus-blur-after-pick.js?v=2";

import {
initDesktopAppUi
} from "./desktop-app-ui.js?v=4";

import {
initDesktopTradeNav
} from "./desktop-trade-nav.js?v=1";

import {
initScriptDesktopNav
} from "./script-desktop-nav.js?v=1";

import {
resumeScriptScanBackgroundJob
} from "./script-scan-background.js?v=8";

import {
resumeStatsBackgroundJob
} from "./statistics-background.js?v=5";

initSuppressNativeContextMenu();
initFocusBlurAfterPick();
initDesktopAppUi();
initDesktopTradeNav();
initScriptDesktopNav();

void resumeStatsBackgroundJob();

function bootScriptScanBackground(){

if(
window.cryptoTerminalDesktop?.isDesktop
){
resumeScriptScanBackgroundJob();
}

}

bootScriptScanBackground();

if(
typeof document !==
"undefined"
){
document.addEventListener(
"DOMContentLoaded",
bootScriptScanBackground,
{
once:
true
}
);
}

async function startSiteBoot(){

const onTerminal =
/\/terminal(\.html)?\/?$/i.test(
location.pathname ||
""
) ||
/\/coins(\.html)?\/?$/i.test(
location.pathname ||
""
);

const onTrade =
/\/trade(\.html)?\/?$/i.test(
location.pathname ||
""
);

if(
onTerminal &&
!window.__terminalAppReady
){
await new Promise(
resolve=>{
if(
window.__terminalAppReady
){
resolve();
return;
}
window.addEventListener(
"terminal-app-ready",
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

if(
onTrade &&
!window.__tradeAppReady
){
await new Promise(
resolve=>{
if(
window.__tradeAppReady
){
resolve();
return;
}
window.addEventListener(
"trade-app-ready",
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

initExchangeContext();
initBybitNetworkUi();
preloadBybitProxyConfig();
warmBybitWorkerProxy();
initMobileRecovery();
bootScriptScanBackground();

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
ensureDrawToolsVisible();

function isTerminalPagePath(){

return (
/\/terminal(\.html)?\/?$/i.test(
location.pathname ||
""
) ||
/\/coins(\.html)?\/?$/i.test(
location.pathname ||
""
)
);

}

function deferTerminalNonCriticalBoot(
fn
){

if(
!isTerminalPagePath()
){
fn();
return;
}

if(
typeof requestIdleCallback ===
"function"
){
requestIdleCallback(
()=>{
fn();
},
{ timeout: 3000 }
);
}else{
setTimeout(
fn,
1
);
}

}

function runCloudBoot(){

initAlertsCloudSync();

onCloudSyncChange(
()=>{

/* BANDWIDTH-CUT: автозагрузка device state при логине */
/*
if(
isCloudLoggedInEffective() &&
!isAlertsPage() &&
!isAutoDevicePullDisabled()
){
scheduleDevicePull(
()=>
pullDeviceStateFromCloud()
);
}
*/

window.dispatchEvent(
new CustomEvent(
"draw-tools-access-changed"
)
);

}
);

/* BANDWIDTH-CUT: облако рисунков (Realtime + fast poll + push) */
/*
import("./drawings-cloud-sync.js?v=46").then(
({ initDrawingsCloudSync })=>{
initDrawingsCloudSync();
}
);
*/

import("./favorites-cloud-sync.js?v=5").then(
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
scheduleDevicePull(
()=>
pullDeviceStateFromCloud()
);
}

})
.catch(err=>{
console.warn("cloud init failed:", err);
});

}

deferTerminalNonCriticalBoot(
runCloudBoot
);
