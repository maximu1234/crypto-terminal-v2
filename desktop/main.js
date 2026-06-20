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
registerTradingIpc
} =
require(
"./trading/register-ipc.cjs"
);
const {
getAuthSession,
saveAuthSession,
clearAuthSession
} =
require(
"./auth-session.cjs"
);

registerAppScheme();

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
"coins.html:",
fs.existsSync(
path.join(
resolvedBundleRoot,
"coins.html"
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
"coins.html"
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
`${getAppOrigin()}/coins.html`
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
"persist:multichart-desktop";

const AUTH_PROTOCOL =
"multichart";

/** @type {string | null} */
let pendingAuthCallbackUrl =
null;

/** @type {BrowserWindow | null} */
let mainWindow =
null;

/** @type {number | null} */
let powerBlockerId =
null;

let mainWindowShown =
false;

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

if(
process.platform ===
"darwin"
){
app.commandLine.appendSwitch(
"enable-features",
"Metal"
);
}

app.commandLine.appendSwitch(
"disable-renderer-backgrounding"
);
app.commandLine.appendSwitch(
"disable-background-timer-throttling"
);
app.commandLine.appendSwitch(
"disable-backgrounding-occluded-windows"
);
app.commandLine.appendSwitch(
"disk-cache-size",
"536870912"
);
app.commandLine.appendSwitch(
"js-flags",
"--max-old-space-size=4096"
);
app.commandLine.appendSwitch(
"enable-gpu-rasterization"
);
app.commandLine.appendSwitch(
"ignore-gpu-blocklist"
);

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

function isAuthCallbackUrl(
url
){

if(
typeof url !==
"string"
){
return false;
}

if(
url.includes(
"access_token="
) ||
url.includes(
"code="
)
){
return true;
}

try{
const parsed =
new URL(
url
);

if(
parsed.protocol !==
`${AUTH_PROTOCOL}:`
){
return false;
}

return (
parsed.hostname ===
"auth" ||
parsed.pathname.startsWith(
"/auth/"
)
);
}catch{
return false;
}

}

function deliverAuthCallbackUrl(
url
){

if(
!isAuthCallbackUrl(
url
)
){
return;
}

log.info(
"Auth callback URL received:",
url
);

const send =
()=>{

if(
!mainWindow ||
mainWindow.isDestroyed()
){
pendingAuthCallbackUrl =
url;
return;
}

pendingAuthCallbackUrl =
null;

mainWindow.webContents.send(
"desktop:auth-callback",
url
);
revealMainWindow();

};

if(
!mainWindow ||
mainWindow.isDestroyed()
){
pendingAuthCallbackUrl =
url;
return;
}

if(
mainWindow.webContents.isLoading()
){
pendingAuthCallbackUrl =
url;
mainWindow.webContents.once(
"did-finish-load",
send
);
return;
}

send();

}

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

function revealMainWindow(){

if(
!mainWindow ||
mainWindow.isDestroyed()
){
return;
}

if(
!mainWindow.isVisible()
){
mainWindow.show();
}

if(
!mainWindowShown
){
mainWindowShown =
true;
mainWindow.maximize();
}

mainWindow.focus();
}

let bundleLoadFallback =
false;

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
log.warn(
`Bundled UI fallback (${reason}) → remote Vercel`
);
const remote =
`${REMOTE_APP_URL.replace(
/\/$/,
""
)}/coins.html`;
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

}
);

mainWindow.on(
"closed",
()=>{
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
REMOTE_API_ORIGIN
})
);

registerTradingIpc();

ipcMain.handle(
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

ipcMain.handle(
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

ipcMain.handle(
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

}

function registerAuthProtocol(){

if(
process.defaultApp
){

if(
process.argv.length >=
2
){
app.setAsDefaultProtocolClient(
AUTH_PROTOCOL,
process.execPath,
[
path.resolve(
process.argv[
1
]
)
]
);
}

return;
}

if(
!app.isDefaultProtocolClient(
AUTH_PROTOCOL
)
){
app.setAsDefaultProtocolClient(
AUTH_PROTOCOL
);
}

}

const gotSingleInstanceLock =
app.requestSingleInstanceLock();

if(
!gotSingleInstanceLock
){

app.quit();

}else{

app.on(
"second-instance",
(
_event,
argv
)=>{

const url =
argv.find(
arg=>
isAuthCallbackUrl(
arg
)
);

if(
url
){
deliverAuthCallbackUrl(
url
);
return;
}

if(
mainWindow &&
!mainWindow.isDestroyed()
){
revealMainWindow();
}

}
);

if(
process.platform ===
"darwin"
){

app.on(
"open-url",
(
event,
url
)=>{
event.preventDefault();
deliverAuthCallbackUrl(
url
);
}
);

}

const startupAuthUrl =
process.argv.find(
arg=>
isAuthCallbackUrl(
arg
)
);

if(
startupAuthUrl
){
pendingAuthCallbackUrl =
startupAuthUrl;
}

app.whenReady().then(
async()=>{

registerAuthProtocol();

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

startPowerSaveBlocker();

const ses =
session.fromPartition(
PARTITION
);

tuneDesktopSession(
ses
);

if(
!USE_BUNDLE
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
buildMenu();
createWindow();

app.on(
"activate",
()=>{
if(
mainWindow &&
!mainWindow.isDestroyed()
){
revealMainWindow();
return;
}
if(
BrowserWindow.getAllWindows().length ===
0
){
createWindow();
}
}
);

}
);

}

app.on(
"before-quit",
()=>{

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
powerBlockerId =
null;
}

}
);

app.on(
"window-all-closed",
()=>{
if(
process.platform !==
"darwin"
){
app.quit();
}
}
);
