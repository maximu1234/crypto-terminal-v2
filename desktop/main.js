const {
app,
BrowserWindow,
ipcMain,
Menu,
shell,
session,
powerSaveBlocker
} =
require(
"electron"
);
const log =
require(
"electron-log"
);
const fs =
require(
"fs"
);
const path =
require(
"path"
);
const {
registerAppScheme,
resolveBundleRoot
} =
require(
"./site-protocol.cjs"
);
const {
startLocalSiteServer
} =
require(
"./local-site-server.cjs"
);
const {
startDesktopHandoffServer
} =
require(
"./desktop-handoff-server.cjs"
);
const {
warmStaticCache
} =
require(
"./warm-cache.cjs"
);
const {
chromeLikeUserAgent
} =
require(
"./chrome-user-agent.cjs"
);
const {
registerTradingIpc,
setTradingStreamTarget,
startTradingStream,
stopTradingStream
} =
require(
"./trading/register-ipc.cjs"
);
const {
registerChartSnapshotIpc
} =
require(
"./chart-snapshot.cjs"
);
const {
registerChartSnapshotLogoIpc
} =
require(
"./chart-snapshot-logo.cjs"
);
const {
applyDesktopProxy,
registerAppProxyIpc,
registerAppProxyLogin
} =
require(
"./app-proxy.cjs"
);
const {
APP_SESSION_PARTITION
} =
require(
"./app-session.cjs"
);

function loadAlgoTradingIpc(){

try{
return require(
"./trading/algo-trading-ipc.cjs"
);
}catch(
err
){
log.warn(
"algo-trading-ipc optional:",
err?.message ||
err
);
return {};
}

}

const algoTradingIpc =
loadAlgoTradingIpc();

function algoIpcFn(
name,
asyncFn =
false
){

const fn =
algoTradingIpc[
name
];

if(
typeof fn ===
"function"
){
return fn.bind(
algoTradingIpc
);
}

return asyncFn
? async()=>{}
: ()=>{};

}

const registerAlgoTradingIpc =
algoIpcFn(
"registerAlgoTradingIpc"
);
const bootAlgoTradingRuntimeIfEnabled =
algoIpcFn(
"bootAlgoTradingRuntimeIfEnabled"
);
const bootAlgoBotIfWasRunning =
algoIpcFn(
"bootAlgoBotIfWasRunning",
true
);
const setAlgoTradingStreamTarget =
algoIpcFn(
"setAlgoTradingStreamTarget"
);
const stopAlgoTradingStream =
algoIpcFn(
"stopAlgoTradingStream"
);
const {
handleTrustedDesktopUi
} =
require(
"./trading/desktop-ui-gate.cjs"
);
const {
getAuthSession,
saveAuthSession,
clearAuthSession
} =
require(
"./auth-session.cjs"
);
const {
initMenuBarTray,
updateMenuBarTray,
setMenuBarTrayVisible,
setMenuBarTrayPnlHidden,
setFeatureNavPrefs,
isMenuBarTrayActive,
configureMenuBarTray,
dismissTrayPopup,
destroyMenuBarTray
} =
require(
"./menu-bar-tray.cjs"
);
const trayPrefsStore =
require(
"./menu-bar-tray-prefs-store.cjs"
);
const scriptFavoritesStore =
require(
"./script-favorites-store.cjs"
);
const {
hasAgentArg
} =
require(
"./platform/agent-argv.cjs"
);
const platform =
require(
"./platform/index.cjs"
);
const {
getAlgoDesktopEdition
} =
require(
"./trading/algo-trading-edition.cjs"
);

registerAppScheme();
registerAppProxyLogin(
app
);

log.info(
"desktop platform:",
platform.platform
);

const REMOTE_API_ORIGIN =
process.env.DESKTOP_API_ORIGIN ||
"https://crypto-terminal-v2.vercel.app";

const REMOTE_APP_URL =
process.env.CRYPTO_TERMINAL_URL ||
REMOTE_API_ORIGIN;

const BUNDLE_ROOT =
path.join(
__dirname,
"site-bundle"
);

let resolvedBundleRoot =
null;

function getBundleRoot(){

if(
!resolvedBundleRoot
){
resolvedBundleRoot =
resolveBundleRoot(
BUNDLE_ROOT
);
log.info(
"site-bundle:",
resolvedBundleRoot,
"terminal.html:",
fs.existsSync(
path.join(
resolvedBundleRoot,
"terminal.html"
)
)
);
}

return resolvedBundleRoot;

}

function shouldUseBundle(){

if(
process.env.DESKTOP_REMOTE_UI ===
"1"
){
return false;
}

if(
app.isPackaged
){
return true;
}

return fs.existsSync(
path.join(
BUNDLE_ROOT,
"terminal.html"
)
);

}

const USE_BUNDLE =
shouldUseBundle();

/** @type {string | null} */
let localSiteOrigin =
null;

/** @type {(() => Promise<void>) | null} */
let closeLocalSiteServer =
null;

function getAppOrigin(){

if(
USE_BUNDLE &&
localSiteOrigin
){
return localSiteOrigin;
}

return REMOTE_APP_URL.replace(
/\/$/,
""
);

}

function getStartUrl(){

return (
process.env.DESKTOP_START_URL ||
`${getAppOrigin()}/terminal.html`
);

}

function isBundledUiUrl(
url
){

const value =
String(
url ||
""
);

if(
localSiteOrigin &&
value.startsWith(
localSiteOrigin
)
){
return true;
}

return value.startsWith(
"multichart://"
);

}

const PARTITION =
APP_SESSION_PARTITION;

/** @type {string | null} */
let pendingAuthCallbackUrl =
null;

/** @type {{ symbol: string, tf?: string, exchange?: string } | null} */
let pendingDesktopOpenPayload =
null;

/** @type {string | null} */
let pendingDesktopOpenUrl =
null;

/** @type {(() => Promise<void>) | null} */
let closeHandoffServer =
null;

/** @type {BrowserWindow | null} */
let mainWindow =
null;

/** @type {number | null} */
let powerBlockerId =
null;

let mainWindowShown =
false;

let bundleLoadFallback =
false;
let isQuitting =
false;
let agentClosing =
false;

platform.applyCommonCommandLineSwitches(
app
);
platform.impl.applyPlatformCommandLineSwitches(
app
);

function stopPowerBlockerForQuit(){

if(
powerBlockerId ==
null
){
return;
}

if(
powerSaveBlocker.isStarted(
powerBlockerId
)
){
powerSaveBlocker.stop(
powerBlockerId
);
}

powerBlockerId =
null;

}

function startPowerSaveBlocker(){

if(
powerBlockerId !=
null &&
powerSaveBlocker.isStarted(
powerBlockerId
)
){
return;
}

try{
powerBlockerId =
powerSaveBlocker.start(
"prevent-app-suspension"
);
}catch(
err
){
log.warn(
"powerSaveBlocker.start failed:",
err
);
powerBlockerId =
null;
}

}

function ensureAppVisible(){

platform.impl.ensureAppVisible(
app
);

}

function showDockIcon(){

if(
process.platform ===
"darwin" &&
app.dock
){
app.dock.show();
}

}

function hideDockIcon(){

if(
process.platform ===
"darwin" &&
app.dock
){
app.dock.hide();
}

}

function revealMainWindow(){

if(
!mainWindow ||
mainWindow.isDestroyed()
){
return;
}

showDockIcon();

if(
!mainWindow.isVisible()
){
mainWindow.show();
}

ensureAppVisible();

if(
!mainWindowShown
){
mainWindowShown =
true;
mainWindow.maximize();
}

mainWindow.focus();

}

function openMultichart(){

ensureAppVisible();
showDockIcon();

if(
mainWindow &&
!mainWindow.isDestroyed()
){
revealMainWindow();
startPowerSaveBlocker();
return;
}

createWindow();
startPowerSaveBlocker();

}

function enterAgentMode(){

if(
!platform.impl.supportsTrayAgent?.()
){
return;
}

dismissTrayPopup();
stopPowerBlockerForQuit();
hideDockIcon();

if(
mainWindow &&
!mainWindow.isDestroyed()
){
agentClosing =
true;

try{
mainWindow.destroy();
}finally{
agentClosing =
false;
}

}

setTradingStreamTarget(
null
);
startTradingStream();

try{
bootAlgoTradingRuntimeIfEnabled();
}catch(
err
){
log.warn(
"algo-runtime agent:",
err?.message ||
err
);
}

if(
!isMenuBarTrayActive()
){
setMenuBarTrayVisible(
true
);
}

}

function shouldEnterAgentOnClose(){

return (
!!platform.impl.supportsTrayAgent?.() &&
isMenuBarTrayActive()
);

}

function shouldStartAsLoginAgent(){

if(
!platform.impl.supportsTrayAgent?.()
){
return false;
}

if(
hasAgentArg(
process.argv
)
){
return true;
}

try{
const login =
app.getLoginItemSettings();

if(
login?.wasOpenedAsHidden
){
return true;
}

if(
login?.wasOpenedAtLogin &&
trayPrefsStore.readPrefs().launchAgentAtLogin
){
return true;
}
}catch{
/* ignore */
}

return false;

}

function applyLaunchAgentPreference(
enabled
){

if(
!platform.impl.supportsTrayAgent?.()
){
return {
ok:
false,
message:
"tray agent unsupported"
};
}

const prefs =
trayPrefsStore.setLaunchAgentAtLogin(
enabled
);

try{
platform.impl.setLoginAgentEnabled?.(
prefs.launchAgentAtLogin
);
}catch(
err
){
log.warn(
"launch agent:",
err?.message ||
err
);
return {
ok:
false,
message:
err?.message ||
String(
err
),
prefs
};
}

return {
ok:
true,
prefs
};

}

function buildDesktopAlertOpenUrl(
payload
){

const params =
new URLSearchParams({
symbol:
String(
payload?.symbol ||
""
).trim(),
tf:
String(
payload?.tf ||
"60"
).trim() ||
"60"
});

const exchange =
String(
payload?.exchange ||
""
).trim().toLowerCase();

if(
exchange ===
"bybit" ||
exchange ===
"bingx"
){
params.set(
"exchange",
exchange
);
}

params.set(
"_o",
String(
Date.now()
)
);

return `${getAppOrigin()}/terminal.html?${params}`;

}

function normalizeDesktopOpenPayload(
payload
){

const symbol =
String(
payload?.symbol ||
""
).trim().toUpperCase().replace(
/\.P$/i,
""
);

if(
!symbol
){
return null;
}

const out =
{
symbol,
tf:
String(
payload?.tf ||
"60"
).trim() ||
"60"
};

const exchange =
String(
payload?.exchange ||
""
).trim().toLowerCase();

if(
exchange ===
"bybit" ||
exchange ===
"bingx"
){
out.exchange =
exchange;
}

return out;

}

function canNavigateDesktopUi(){

if(
!mainWindow ||
mainWindow.isDestroyed()
){
return false;
}

if(
USE_BUNDLE &&
!localSiteOrigin
){
return false;
}

return true;

}

function isMainWindowOnTerminal(){

if(
!mainWindow ||
mainWindow.isDestroyed()
){
return false;
}

try{
const current =
String(
mainWindow.webContents.getURL() ||
""
);
const origin =
getAppOrigin();

if(
!current.startsWith(
origin
)
){
return false;
}

return /\/(?:terminal|coins)(?:\.html)?(?:\?|$)/i.test(
current
);
}catch{
return false;
}

}

function deliverDesktopAlertOpen(
payload
){

const normalized =
normalizeDesktopOpenPayload(
payload
);

if(
!normalized
){
return;
}

if(
!canNavigateDesktopUi()
){
pendingDesktopOpenPayload =
normalized;
pendingDesktopOpenUrl =
null;
return;
}

pendingDesktopOpenPayload =
null;
pendingDesktopOpenUrl =
null;

if(
isMainWindowOnTerminal()
){
mainWindow.webContents.send(
"desktop:open-chart",
normalized
);
revealMainWindow();
return;
}

void mainWindow.loadURL(
buildDesktopAlertOpenUrl(
normalized
)
);
revealMainWindow();

}

function flushPendingDesktopOpen(){

const payload =
pendingDesktopOpenPayload;

if(
!payload ||
!canNavigateDesktopUi()
){
return false;
}

pendingDesktopOpenPayload =
null;
pendingDesktopOpenUrl =
null;
deliverDesktopAlertOpen(
payload
);
return true;

}

function deliverChartOpenUrl(
url
){

const payload =
platform.parseChartOpenUrl(
url,
platform.AUTH_PROTOCOL
);

if(
!payload
){
return false;
}

log.info(
"Chart open URL received:",
url
);
deliverDesktopAlertOpen(
payload
);
return true;

}

const deliverAuthCallbackUrl =
platform.createDeliverAuthCallback({
log,
authProtocol:
platform.AUTH_PROTOCOL,
getMainWindow:()=>mainWindow,
getPendingAuthUrl:()=>pendingAuthCallbackUrl,
setPendingAuthUrl:(
url
)=>{
pendingAuthCallbackUrl =
url;
},
revealMainWindow:
openMultichart
});

const platformCtx = {
app,
path,
log,
BrowserWindow,
createWindow:()=>{
createWindow();
},
revealMainWindow:
openMultichart,
deliverAuthCallbackUrl,
deliverChartOpenUrl,
isAuthCallbackUrl:(
url
)=>
platform.isAuthCallbackUrl(
url,
platform.AUTH_PROTOCOL
),
authProtocol:
platform.AUTH_PROTOCOL,
getMainWindow:()=>mainWindow,
getIsQuitting:()=>isQuitting,
isAgentClosing:()=>agentClosing,
shouldEnterAgentOnClose,
enterAgentMode,
dismissTrayPopup
};

function tuneDesktopSession(
ses
){

const ua =
chromeLikeUserAgent(
ses.getUserAgent()
);


ses.setUserAgent(
ua
);

if(
typeof ses.preconnect ===
"function"
){

try{
ses.preconnect({
url:
new URL(
REMOTE_API_ORIGIN
).origin,
numSockets:
4
});
ses.preconnect({
url:
"https://api.bybit.com",
numSockets:
4
});
ses.preconnect({
url:
"https://api.bytick.com",
numSockets:
2
});
ses.preconnect({
url:
"https://ehygysphfsnluegeycjx.supabase.co",
numSockets:
4
});
}catch{
/* ignore */
}

}

}

function beginSessionWarmCache(
ses
){

if(
process.env.DESKTOP_SKIP_WARM_CACHE ===
"1"
){
return Promise.resolve(
null
);
}

return warmStaticCache(
ses,
REMOTE_APP_URL
).then(
result=>{
log.info(
`desktop warm-cache: phase1=${result.phase1}, phase2=${result.phase2} queued`
);
void result.phase2Promise?.then(
done=>{
log.info(
`desktop warm-cache: phase2 done (${done} assets)`
);
}
);
return result;
}
).catch(
err=>{
log.warn(
"desktop warm-cache failed:",
err
);
return null;
}
);

}

function createWindow(){

mainWindowShown =
false;

mainWindow =
new BrowserWindow({
width:
1440,
height:
900,
minWidth:
960,
minHeight:
640,
show:
true,
title:
"Multichart",
backgroundColor:
"#131722",
webPreferences:{
preload:
path.join(
__dirname,
"preload.js"
),
contextIsolation:
true,
nodeIntegration:
false,
sandbox:
true,
additionalArguments:[
`--algo-desktop-edition=${getAlgoDesktopEdition()}`
],
partition:
PARTITION,
spellcheck:
false,
backgroundThrottling:
false,
v8CacheOptions:
"code"
}
});

mainWindow.webContents.setUserAgent(
chromeLikeUserAgent(
mainWindow.webContents.getUserAgent()
)
);

mainWindow.once(
"ready-to-show",
()=>{
revealMainWindow();
}
);

setTimeout(
()=>{
revealMainWindow();
},
4000
);

mainWindow.webContents.on(
"did-fail-load",
(
_event,
code,
desc,
failedUrl
)=>{
log.error(
`Window load failed: ${code} ${desc} ${failedUrl || ""}`
);

if(
USE_BUNDLE &&
!bundleLoadFallback &&
isBundledUiUrl(
failedUrl
)
){
fallbackToRemoteUi(
`load failed ${code} ${desc}`
);
return;
}

revealMainWindow();
}
);

mainWindow.webContents.setWindowOpenHandler(
({
url
})=>{
if(
/^https?:\/\//i.test(
url
)
){
shell.openExternal(
url
);
}
return {
action:
"deny"
};
}
);

mainWindow.webContents.on(
"will-navigate",
(
event,
url
)=>{
if(
!isAllowedNavigation(
url
)
){
event.preventDefault();
shell.openExternal(
url
);
}
}
);

mainWindow.webContents.on(
"console-message",
(
_event,
_level,
message
)=>{
log.info(
`[renderer] ${message}`
);
}
);

mainWindow.loadURL(
getStartUrl()
);

function fallbackToRemoteUi(
reason
){

if(
!USE_BUNDLE ||
bundleLoadFallback ||
!mainWindow ||
mainWindow.isDestroyed()
){
return;
}

bundleLoadFallback =
true;

try{
const {
setTradingIpcLocked
} =
require(
"./trading/desktop-ui-gate.cjs"
);
setTradingIpcLocked(
true
);
}catch(
err
){
log.warn(
"fallback lock trading IPC:",
err?.message ||
err
);
}

log.warn(
`Bundled UI fallback (${reason}) → remote Vercel (trading/algo IPC locked)`
);
const remote =
`${REMOTE_APP_URL.replace(
/\/$/,
""
)}/terminal.html`;
void mainWindow.loadURL(
remote
);

}

mainWindow.webContents.once(
"did-finish-load",
async()=>{

log.info(
"Window loaded:",
mainWindow?.webContents.getURL()
);

if(
pendingAuthCallbackUrl &&
mainWindow &&
!mainWindow.isDestroyed()
){
const url =
pendingAuthCallbackUrl;
pendingAuthCallbackUrl =
null;
mainWindow.webContents.send(
"desktop:auth-callback",
url
);
revealMainWindow();
}

if(
pendingDesktopOpenPayload &&
mainWindow &&
!mainWindow.isDestroyed()
){
flushPendingDesktopOpen();
}else if(
pendingDesktopOpenUrl &&
mainWindow &&
!mainWindow.isDestroyed()
){
const openUrl =
pendingDesktopOpenUrl;
pendingDesktopOpenUrl =
null;
void mainWindow.loadURL(
openUrl
);
revealMainWindow();
}

if(
USE_BUNDLE &&
!bundleLoadFallback &&
mainWindow &&
!mainWindow.isDestroyed()
){

try{
const ok =
await mainWindow.webContents.executeJavaScript(
`(() => {
const app = document.getElementById("app");
if (!app) return false;
const vis = getComputedStyle(document.documentElement).visibility;
return vis !== "hidden";
})()`,
true
);

if(
!ok
){
fallbackToRemoteUi(
"empty DOM after load"
);
}

}catch(
err
){
log.warn(
"bundled UI DOM check failed:",
err
);
fallbackToRemoteUi(
"DOM check error"
);
}

}

if(
mainWindow &&
!mainWindow.isDestroyed()
){
setTradingStreamTarget(
mainWindow.webContents
);
startTradingStream();
setAlgoTradingStreamTarget(
mainWindow.webContents
);
}

}
);

platform.impl.attachMainWindowCloseHandler(
mainWindow,
platformCtx
);

mainWindow.on(
"closed",
()=>{
setTradingStreamTarget(
null
);
setAlgoTradingStreamTarget(
null
);
mainWindow =
null;
}
);
}

function isAllowedNavigation(
url
){

try{
const target =
new URL(
url
);

if(
USE_BUNDLE &&
target.protocol ===
"http:" &&
target.hostname ===
"127.0.0.1" &&
localSiteOrigin &&
target.origin ===
localSiteOrigin
){
return true;
}

const base =
new URL(
getAppOrigin()
);

return target.origin ===
base.origin;
}catch{
return false;
}

}

function buildMenu(){

const template =
[
{
label:
"Multichart",
submenu:[
{ role:
"reload"
},
{ role:
"toggleDevTools"
},
{ type:
"separator"
},
{ role:
"hide"
},
{ role:
"hideOthers"
},
{ role:
"unhide"
},
{ type:
"separator"
},
{ role:
"quit"
}
]
},
{
label:
"Правка",
submenu:[
{ role:
"undo"
},
{ role:
"redo"
},
{ type:
"separator"
},
{ role:
"cut"
},
{ role:
"copy"
},
{ role:
"paste"
},
{ role:
"selectAll"
}
]
},
{
label:
"Вид",
submenu:[
{ role:
"resetZoom"
},
{ role:
"zoomIn"
},
{ role:
"zoomOut"
},
{ type:
"separator"
},
{ role:
"togglefullscreen"
}
]
}
];

const menu =
Menu.buildFromTemplate(
template
);
Menu.setApplicationMenu(
menu
);
}

function registerIpc(){

try{
const {
configureDesktopUiGate,
setTradingIpcLocked
} =
require(
"./trading/desktop-ui-gate.cjs"
);
configureDesktopUiGate(
{
getLocalSiteOrigin:
()=>
localSiteOrigin,
getUseBundle:
()=>
USE_BUNDLE
}
);

if(
process.env.DESKTOP_REMOTE_UI ===
"1"
){
setTradingIpcLocked(
true
);
}
}catch(
err
){
log.warn(
"desktop-ui-gate configure:",
err?.message ||
err
);
}

ipcMain.handle(
"app:getVersion",
()=>({
app:
app.getVersion(),
url:
getAppOrigin(),
startUrl:
getStartUrl(),
bundledUi:
USE_BUNDLE,
apiOrigin:
REMOTE_API_ORIGIN,
platform:
platform.platform
})
);

registerTradingIpc();
registerChartSnapshotIpc();
registerChartSnapshotLogoIpc();
registerAppProxyIpc({
ipcMain,
handleTrustedDesktopUi,
getSessions:()=>
[
session.fromPartition(
PARTITION
)
],
reloadMainWindow:()=>{

if(
mainWindow &&
!mainWindow.isDestroyed()
){
mainWindow.webContents.reload();
}

}
});

handleTrustedDesktopUi(
ipcMain,
"desktop:loadAuthSession",
()=>{

try{
const raw =
getAuthSession();

return {
ok:
true,
raw:
raw ||
null
};
}catch(
err
){
log.warn(
"desktop:loadAuthSession:",
err.message
);
return {
ok:
false,
raw:
null
};
}

}
);

handleTrustedDesktopUi(
ipcMain,
"desktop:saveAuthSession",
(
_event,
raw
)=>{

try{
if(
typeof raw !==
"string" ||
!raw.trim()
){
clearAuthSession();
return {
ok:
true
};
}

saveAuthSession(
raw
);
return {
ok:
true
};
}catch(
err
){
log.warn(
"desktop:saveAuthSession:",
err.message
);
return {
ok:
false,
message:
err.message
};
}

}
);

handleTrustedDesktopUi(
ipcMain,
"desktop:clearAuthSession",
()=>{

try{
clearAuthSession();
return {
ok:
true
};
}catch(
err
){
log.warn(
"desktop:clearAuthSession:",
err.message
);
return {
ok:
false,
message:
err.message
};
}

}
);

ipcMain.handle(
"desktop:updateMenuBarTray",
(
_event,
state
)=>{

try{
updateMenuBarTray(
state ||
{}
);
return {
ok:
true
};
}catch(
err
){
log.warn(
"desktop:updateMenuBarTray:",
err.message
);
return {
ok:
false,
message:
err.message
};
}

}
);

ipcMain.handle(
"desktop:setMenuBarTrayVisible",
(
_event,
visible
)=>{

try{
const prefs =
trayPrefsStore.setTrayEnabled(
!!visible
);

if(
!prefs.trayEnabled
){
try{
platform.impl.setLoginAgentEnabled?.(
false
);
}catch(
err
){
log.warn(
"launch agent disable:",
err?.message ||
err
);
}
}

setMenuBarTrayVisible(
prefs.trayEnabled
);
return {
ok:
true,
prefs
};
}catch(
err
){
log.warn(
"desktop:setMenuBarTrayVisible:",
err.message
);
return {
ok:
false,
message:
err.message
};
}

}
);

ipcMain.handle(
"desktop:setMenuBarTrayPnlHidden",
(
_event,
hidden
)=>{

try{
return setMenuBarTrayPnlHidden(
!!hidden,
{
broadcast:
false
}
);
}catch(
err
){
log.warn(
"desktop:setMenuBarTrayPnlHidden:",
err.message
);
return {
ok:
false,
message:
err.message
};
}

}
);

ipcMain.handle(
"desktop:setFeatureNavPrefs",
(
_event,
patch
)=>{

try{
return setFeatureNavPrefs(
patch &&
typeof patch ===
"object"
? patch
: {}
);
}catch(
err
){
log.warn(
"desktop:setFeatureNavPrefs:",
err.message
);
return {
ok:
false,
message:
err.message
};
}

}
);

ipcMain.handle(
"desktop:getMenuBarAgentPrefs",
()=>{

try{
return {
ok:
true,
prefs:
trayPrefsStore.readPrefs()
};
}catch(
err
){
return {
ok:
false,
message:
err?.message ||
String(
err
),
prefs:
trayPrefsStore.readPrefs()
};
}

}
);

ipcMain.handle(
"desktop:setLaunchAgentAtLogin",
(
_event,
enabled
)=>{

try{
const result =
applyLaunchAgentPreference(
!!enabled
);

if(
result.prefs?.trayEnabled
){
setMenuBarTrayVisible(
true
);
}

return result;
}catch(
err
){
log.warn(
"desktop:setLaunchAgentAtLogin:",
err?.message ||
err
);
return {
ok:
false,
message:
err?.message ||
String(
err
)
};
}

}
);

ipcMain.handle(
"desktop:importScriptFavorites",
async(
_event,
payload
)=>{

try{
return await scriptFavoritesStore.importFromDialog(
payload?.exchangeId,
payload?.side
);
}catch(
err
){
log.warn(
"desktop:importScriptFavorites:",
err?.message ||
err
);
return {
ok:
false,
message:
err?.message ||
String(
err
)
};
}

}
);

ipcMain.handle(
"desktop:loadScriptFavorites",
(
_event,
payload
)=>{

try{
return scriptFavoritesStore.readText(
payload?.exchangeId,
payload?.side
);
}catch(
err
){
log.warn(
"desktop:loadScriptFavorites:",
err?.message ||
err
);
return {
ok:
false,
exists:
false,
text:
"",
message:
err?.message ||
String(
err
)
};
}

}
);

ipcMain.handle(
"desktop:clearScriptFavorites",
(
_event,
payload
)=>{

try{
return scriptFavoritesStore.clearText(
payload?.exchangeId,
payload?.side
);
}catch(
err
){
log.warn(
"desktop:clearScriptFavorites:",
err?.message ||
err
);
return {
ok:
false,
message:
err?.message ||
String(
err
)
};
}

}
);

}

const shouldContinue =
platform.registerSingleInstance({
app,
log,
isAuthCallbackUrl:(
url
)=>
platform.isAuthCallbackUrl(
url,
platform.AUTH_PROTOCOL
),
deliverAuthCallbackUrl,
deliverChartOpenUrl,
revealMainWindow:
openMultichart,
authProtocol:
platform.AUTH_PROTOCOL
});

if(
shouldContinue
){

platform.impl.registerPlatformHandlers(
platformCtx
);

const startupChartUrl =
platform.findChartOpenUrl(
process.argv,
platform.AUTH_PROTOCOL
);

if(
startupChartUrl
){
const payload =
platform.parseChartOpenUrl(
startupChartUrl,
platform.AUTH_PROTOCOL
);

if(
payload
){
pendingDesktopOpenPayload =
normalizeDesktopOpenPayload(
payload
);
}
}

const startupAuthUrl =
platform.findAuthCallbackUrl(
process.argv,
platform.AUTH_PROTOCOL
);

if(
startupAuthUrl
){
pendingAuthCallbackUrl =
startupAuthUrl;
}

app.whenReady().then(
async()=>{

const startAsAgent =
shouldStartAsLoginAgent();

if(
!startAsAgent
){
ensureAppVisible();
}

platform.impl.registerAuthProtocol(
platformCtx
);

if(
USE_BUNDLE
){
const bundleRoot =
getBundleRoot();
const localSite =
await startLocalSiteServer({
bundleRoot,
remoteApiOrigin:
REMOTE_API_ORIGIN
});
localSiteOrigin =
localSite.origin;
closeLocalSiteServer =
localSite.close;
log.info(
"desktop UI: local HTTP",
localSiteOrigin,
"bundle",
bundleRoot
);
}else{
log.info(
"desktop UI: remote",
REMOTE_APP_URL
);
}

try{
const handoff =
await startDesktopHandoffServer({
log,
onOpen:
deliverDesktopAlertOpen
});
closeHandoffServer =
handoff.close;
}catch(
err
){
log.warn(
"desktop-handoff start:",
err?.message ||
err
);
}

const ses =
session.fromPartition(
PARTITION
);

tuneDesktopSession(
ses
);

try{
await applyDesktopProxy({
sessions:[
ses
]
});
}catch(
err
){
log.warn(
"app-proxy boot:",
err?.message ||
err
);
}

if(
!USE_BUNDLE &&
!startAsAgent
){

const warmTimeout =
new Promise(
resolve=>{
setTimeout(
resolve,
12000
);
}
);

await Promise.race([
beginSessionWarmCache(
ses
),
warmTimeout
]);

}

registerIpc();
registerAlgoTradingIpc(
{
getMainWebContents:()=>
mainWindow &&
!mainWindow.isDestroyed()
? mainWindow.webContents
: null
}
);
buildMenu();
configureMenuBarTray(
openMultichart
);

const trayPrefs =
trayPrefsStore.readPrefs();

if(
trayPrefs.trayEnabled ||
startAsAgent
){
setMenuBarTrayVisible(
true
);
}

try{
bootAlgoTradingRuntimeIfEnabled();
try{
require("./trading/algo-bot-session-log-server.cjs").bootFromPrefs();
}catch(err){
try{ require("electron-log").warn("session-log-server boot:", err?.message || err); }catch(_){ }
}

}catch(
err
){
log.warn(
"algo-runtime boot:",
err?.message ||
err
);
}

try{
void bootAlgoBotIfWasRunning().then(
result=>{

if(
result &&
!result.skipped &&
result.ok ===
false
){
log.warn(
"algo bot resume:",
result.message ||
"failed"
);
}else if(
result?.running ||
result?.alreadyRunning
){
log.info(
"algo bot resumed in background"
);
}

}
).catch(
err=>{
log.warn(
"algo bot resume:",
err?.message ||
err
);
}
);
}catch(
err
){
log.warn(
"algo bot resume:",
err?.message ||
err
);
}

if(
startAsAgent
){
log.info(
"desktop boot: login agent (tray only)"
);
hideDockIcon();
setTradingStreamTarget(
null
);
startTradingStream();
}else{
createWindow();
startPowerSaveBlocker();
}

platform.impl.registerActivateHandler(
platformCtx
);

}
);

}

app.on(
"before-quit",
()=>{

isQuitting =
true;

stopTradingStream();
stopAlgoTradingStream();
destroyMenuBarTray();

if(
closeLocalSiteServer
){
void closeLocalSiteServer();
closeLocalSiteServer =
null;
localSiteOrigin =
null;
}

if(
closeHandoffServer
){
void closeHandoffServer();
closeHandoffServer =
null;
}

stopPowerBlockerForQuit();

}
);

app.on(
"window-all-closed",
()=>{

if(
platform.impl.shouldQuitWhenAllWindowsClosed()
){
app.quit();
}

}
);
