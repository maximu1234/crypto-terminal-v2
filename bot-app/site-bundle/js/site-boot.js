import {
initAlertMonitor
} from "./alert-monitor.js?v=73";

import {
ensureCloudReady
} from "./auth-ui.js?v=60";

import {
isAlertsPage
} from "./cloud-sync-throttle.js?v=3";

import {
isAlgoReducedCloudClient,
isAlgoBotLiteShell,
isAlgoTradingPage,
isScriptPage
} from "./page-routes.js?v=5";

import {
initAlertsCloudSync,
scheduleRegistryCloudSync
} from "./alerts-cloud-sync.js?v=113";

import {
stripAlertFlagsNotInRegistry
} from "./alerts.js?v=109";

import {
isCloudLoggedIn,
isCloudLoggedInEffective,
isCloudSyncEnabled,
onCloudSyncChange
} from "./cloud-sync.js?v=67";

import {
isSupabaseConfigured
} from "./supabase-client.js?v=9";

import {
initExchangeContext
} from "./market-api.js?v=6";

import {
initBybitNetworkUi
} from "./bybit-network-ui.js?v=4";

import {
resetBybitEndpoints,
preloadBybitProxyConfig,
warmBybitWorkerProxy
} from "./bybit-fetch.js?v=17";

import {
ensureDrawToolsVisible
} from "./draw-tools-visible.js?v=2";

import {
initSuppressNativeContextMenu
} from "./suppress-native-context-menu.js?v=4";

import {
initFocusBlurAfterPick
} from "./focus-blur-after-pick.js?v=3";

import {
initDesktopAppUi
} from "./desktop-app-ui.js?v=6";

import {
initSiteHeader,
enforceSiteHeaderAfterBoot
} from "./site-header.js?v=5";

import {
FEATURE_NAV_PREF_EVENT,
shouldRunAlgoBackgroundJobs,
shouldRunScriptBackgroundJobs
} from "./desktop-feature-nav-prefs.js?v=4";

initSuppressNativeContextMenu();
initFocusBlurAfterPick();
initDesktopAppUi();
initSiteHeader();
enforceSiteHeaderAfterBoot();

function isStatsBackgroundJobRunning(){

try{
const raw =
localStorage.getItem(
"stats_bg_job_v3"
);

if(
!raw
){
return false;
}

const parsed =
JSON.parse(
raw
);

return parsed?.status ===
"running";
}catch{
return false;
}

}

function resumeStatsBackground(){

if(
!isStatsBackgroundJobRunning()
){
return;
}

void import(
"./statistics-background.js?v=10"
).then(
m=>
m.resumeStatsBackgroundJob?.()
).catch(
err=>{
console.warn(
"[site-boot] stats background:",
err
);
}
);

}

function bootScriptScanBackground(){

if(
!shouldRunScriptBackgroundJobs()
){
return;
}

void import(
"./script-scan-background.js?v=17"
).then(
m=>
m.resumeScriptScanBackgroundJob?.()
).catch(
err=>{
console.warn(
"[site-boot] script scan background:",
err
);
}
);

}

function stopScriptScanBackgroundFromBoot(){

if(
!window.cryptoTerminalDesktop?.isDesktop
){
return Promise.resolve();
}

return import(
"./script-scan-background.js?v=17"
).then(
m=>
m.stopScriptScanBackground?.()
).catch(
err=>{
console.warn(
"[site-boot] stop script scan background:",
err
);
}
);

}

function bootAlgoDesktopBackgroundJobs(){

if(
!shouldRunAlgoBackgroundJobs()
){
return;
}

void import(
"./algo-trading/desktop-site-boot.js?v=7"
).then(
m=>
m.bootAlgoDesktopBackgroundJobs?.()
).catch(
err=>{
console.warn(
"[site-boot] algo desktop background:",
err
);
}
);

}

function stopAlgoDesktopBackgroundJobsFromBoot(){

if(
!window.cryptoTerminalDesktop?.isDesktop
){
return Promise.resolve();
}

return import(
"./algo-trading/desktop-site-boot.js?v=7"
).then(
m=>
m.stopAlgoDesktopBackgroundJobs?.()
).catch(
err=>{
console.warn(
"[site-boot] stop algo desktop background:",
err
);
}
);

}

function leaveHiddenFeaturePage(
feature
){

if(
feature ===
"script" &&
isScriptPage()
){
location.replace(
"/screener.html"
);
return;
}

if(
feature ===
"algo-trading" &&
isAlgoTradingPage() &&
!isAlgoBotLiteShell()
){
location.replace(
"/screener.html"
);
}

}

function onFeatureNavPrefChanged(
event
){

const feature =
event?.detail?.feature;
const enabled =
!!event?.detail?.enabled;

if(
feature ===
"script"
){
if(
enabled
){
bootScriptScanBackground();
}else{
void Promise.resolve(
stopScriptScanBackgroundFromBoot()
).finally(
()=>
leaveHiddenFeaturePage(
feature
)
);
}
return;
}

if(
feature ===
"algo-trading"
){
if(
enabled
){
bootAlgoDesktopBackgroundJobs();
}else{
void Promise.resolve(
stopAlgoDesktopBackgroundJobsFromBoot()
).finally(
()=>
leaveHiddenFeaturePage(
feature
)
);
}
}

}

bootScriptScanBackground();
bootAlgoDesktopBackgroundJobs();
resumeStatsBackground();

if(
typeof window !==
"undefined"
){
window.addEventListener(
FEATURE_NAV_PREF_EVENT,
onFeatureNavPrefChanged
);
}

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
document.addEventListener(
"DOMContentLoaded",
bootAlgoDesktopBackgroundJobs,
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
bootScriptScanBackground();

}

void startSiteBoot();

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

window.dispatchEvent(
new CustomEvent(
"draw-tools-access-changed"
)
);

}
);

const algoCloudLite =
isAlgoReducedCloudClient();

if(
!algoCloudLite
){
import("./favorites-cloud-sync.js?v=7").then(
({ initFavoritesCloudSync })=>{
initFavoritesCloudSync();
}
);
}

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

const loggedIn =
isCloudLoggedIn();

if(
configured &&
!loggedIn &&
!algoCloudLite
){
console.warn(
"[Multichart] Чтобы алерты попадали в Supabase и Telegram: шестерёнка в шапке → email → ссылка из письма."
);
}

if(
configured &&
isCloudLoggedInEffective() &&
!isAlertsPage() &&
!algoCloudLite
){
scheduleRegistryCloudSync();
}

})
.catch(err=>{
console.warn("cloud init failed:", err);
});

}

deferTerminalNonCriticalBoot(
runCloudBoot
);
