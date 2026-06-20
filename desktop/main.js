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
const {
autoUpdater
} =
require(
"electron-updater"
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
setupSiteProtocol,
bundledOrigin
} =
require(
"./site-protocol.cjs"
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

const USE_BUNDLE =
process.env.DESKTOP_REMOTE_UI !==
"1" &&
(
app.isPackaged ||
fs.existsSync(
path.join(
BUNDLE_ROOT,
"coins.html"
)
)
);

const APP_ORIGIN =
USE_BUNDLE
? bundledOrigin()
: REMOTE_APP_URL.replace(
/\/$/,
""
);

const START_URL =
process.env.DESKTOP_START_URL ||
`${APP_ORIGIN}/coins.html`;

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

/** idle | checking | available | downloading | ready | installing */
let updateLifecycle =
"idle";

let userInitiatedUpdate =
false;

let mainWindowShown =
false;

function canCheckForUpdates(){

return (
updateLifecycle !==
"downloading" &&
updateLifecycle !==
"ready" &&
updateLifecycle !==
"installing"
);
}

autoUpdater.autoInstallOnAppQuit =
true;

let updateInstallWatchdog =
null;

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

function teardownWindowsForUpdate(){

app.removeAllListeners(
"window-all-closed"
);

for(
const win of
BrowserWindow.getAllWindows()
){
win.removeAllListeners(
"close"
);

if(
!win.isDestroyed()
){
win.destroy();
}

}

mainWindow =
null;

}

function scheduleInstall(){

if(
updateLifecycle ===
"installing"
){
return;
}

updateLifecycle =
"installing";

broadcastUpdate({
phase:
"installing",
message:
"Устанавливаем и перезапускаем…"
});

if(
updateInstallWatchdog
){
clearTimeout(
updateInstallWatchdog
);
}

updateInstallWatchdog =
setTimeout(
()=>{

log.warn(
"Auto-update: quitAndInstall timeout — forcing app.quit()"
);

updateInstallWatchdog =
null;

broadcastUpdate({
phase:
"installing",
message:
"Завершаем установку…"
});

teardownWindowsForUpdate();
stopPowerBlockerForQuit();
app.quit();

},
12000
);

setImmediate(
()=>{

teardownWindowsForUpdate();
stopPowerBlockerForQuit();

log.info(
"Auto-update: quitAndInstall"
);

try{
autoUpdater.quitAndInstall(
false,
true
);
}catch(
err
){
log.error(
"quitAndInstall failed:",
err
);
app.quit();
}

}
);

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

autoUpdater.logger =
log;
autoUpdater.autoDownload =
false;
autoUpdater.autoInstallOnAppQuit =
true;

function sendUpdateStatus(
payload
){

mainWindow?.webContents?.send(
"desktop:update-status",
payload
);
}

function broadcastUpdate(
patch
){

sendUpdateStatus(
{
type:
"status",
...patch
}
);
}

function setupAutoUpdater(){

autoUpdater.on(
"before-quit-for-update",
()=>{
log.info(
"Auto-update: before-quit-for-update"
);

if(
updateInstallWatchdog
){
clearTimeout(
updateInstallWatchdog
);
updateInstallWatchdog =
null;
}

stopPowerBlockerForQuit();
}
);

autoUpdater.on(
"checking-for-update",
()=>{
if(
!canCheckForUpdates()
){
return;
}
updateLifecycle =
"checking";
broadcastUpdate({
phase:
"checking",
message:
"Проверяем обновления…"
});
}
);

autoUpdater.on(
"update-available",
info=>{
if(
updateLifecycle ===
"ready" ||
updateLifecycle ===
"installing" ||
updateLifecycle ===
"downloading"
){
return;
}
updateLifecycle =
"available";
broadcastUpdate({
phase:
"available",
message:
`Доступна версия ${info.version}`,
version:
info.version
});
}
);

autoUpdater.on(
"update-not-available",
()=>{
if(
updateLifecycle !==
"checking"
){
return;
}
updateLifecycle =
"idle";
broadcastUpdate({
phase:
"idle",
message:
"Установлена последняя версия"
});
}
);

autoUpdater.on(
"error",
err=>{
log.error(
"Auto-update error:",
err
);
if(
updateLifecycle ===
"installing"
){
return;
}
updateLifecycle =
"idle";
broadcastUpdate({
phase:
"error",
message:
String(
err?.message ||
err
)
});
}
);

autoUpdater.on(
"download-progress",
progress=>{
updateLifecycle =
"downloading";
broadcastUpdate({
phase:
"downloading",
message:
`Загрузка ${Math.round(progress.percent || 0)}%`,
percent:
progress.percent || 0
});
}
);

autoUpdater.on(
"update-downloaded",
info=>{
updateLifecycle =
"ready";
log.info(
"Auto-update downloaded:",
info.version
);
const menuItem =
Menu.getApplicationMenu()?.getMenuItemById(
"install-update"
);
if(
menuItem
){
menuItem.enabled =
true;
}
broadcastUpdate({
phase:
"ready",
message:
`Версия ${info.version} загружена`,
version:
info.version
});
if(
userInitiatedUpdate
){
userInitiatedUpdate =
false;
scheduleInstall();
}
}
);

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

function isAuthCallbackUrl(
url
){

return (
typeof url ===
"string" &&
(
url.startsWith(
`${AUTH_PROTOCOL}://`
) ||
url.includes(
"access_token="
) ||
url.includes(
"code="
)
)
);

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
"Auth callback URL received"
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
desc
)=>{
log.error(
`Window load failed: ${code} ${desc}`
);
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

mainWindow.loadURL(
START_URL
);

mainWindow.webContents.once(
"did-finish-load",
()=>{

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
!app.isPackaged
){
return;
}

setTimeout(
()=>{
if(
canCheckForUpdates()
){
void autoUpdater.checkForUpdates();
}
},
12000
);

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
"multichart:" &&
target.hostname ===
"local"
){
return true;
}

const base =
new URL(
USE_BUNDLE
? bundledOrigin()
: REMOTE_APP_URL
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
{
label:
"Проверить обновления…",
click:()=>{
if(
canCheckForUpdates()
){
void autoUpdater.checkForUpdates();
}
}
},
{
label:
"Перезапустить для обновления",
enabled:
false,
id:
"install-update",
click:()=>{
scheduleInstall();
}
},
{ type:
"separator"
},
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
APP_ORIGIN,
startUrl:
START_URL,
bundledUi:
USE_BUNDLE,
apiOrigin:
REMOTE_API_ORIGIN
})
);

ipcMain.handle(
"app:checkForUpdates",
async()=>{
if(
!app.isPackaged
){
broadcastUpdate({
phase:
"dev",
message:
"Обновления доступны только в установленной .app"
});
return {
ok:
false,
reason:
"dev"
};
}
if(
!canCheckForUpdates()
){
return {
ok:
false,
reason:
"busy"
};
}
try{
const result =
await autoUpdater.checkForUpdates();
return {
ok:
true,
updateInfo:
result?.updateInfo ||
null
};
}catch(
err
){
log.error(
"checkForUpdates failed:",
err
);
updateLifecycle =
"idle";
broadcastUpdate({
phase:
"error",
message:
String(
err?.message ||
err
)
});
return {
ok:
false,
reason:
"error"
};
}
}
);

ipcMain.handle(
"app:performUpdate",
async()=>{
if(
!app.isPackaged
){
broadcastUpdate({
phase:
"dev",
message:
"Обновления доступны только в установленной .app"
});
return {
ok:
false,
reason:
"dev"
};
}
if(
updateLifecycle ===
"downloading" ||
updateLifecycle ===
"installing"
){
return {
ok:
false,
reason:
"busy"
};
}
if(
updateLifecycle ===
"ready"
){
scheduleInstall();
return {
ok:
true,
action:
"install"
};
}
try{
userInitiatedUpdate =
true;
updateLifecycle =
"checking";
broadcastUpdate({
phase:
"checking",
message:
"Проверяем обновления…"
});
const result =
await autoUpdater.checkForUpdates();
const latest =
result?.updateInfo?.version;
if(
!latest ||
latest ===
app.getVersion()
){
updateLifecycle =
"idle";
broadcastUpdate({
phase:
"idle",
message:
"Установлена последняя версия"
});
return {
ok:
true,
upToDate:
true
};
}
updateLifecycle =
"downloading";
broadcastUpdate({
phase:
"downloading",
message:
"Загружаем обновление…"
});
await autoUpdater.downloadUpdate();
return {
ok:
true,
action:
"downloaded"
};
}catch(
err
){
log.error(
"performUpdate failed:",
err
);
userInitiatedUpdate =
false;
updateLifecycle =
"idle";
broadcastUpdate({
phase:
"error",
message:
String(
err?.message ||
err
)
});
return {
ok:
false
};
}
}
);

ipcMain.handle(
"app:downloadUpdate",
async()=>{
if(
!app.isPackaged
){
return {
ok:
false
};
}
if(
updateLifecycle ===
"downloading" ||
updateLifecycle ===
"ready" ||
updateLifecycle ===
"installing"
){
return {
ok:
false,
reason:
"busy"
};
}
try{
userInitiatedUpdate =
true;
updateLifecycle =
"downloading";
broadcastUpdate({
phase:
"downloading",
message:
"Загружаем обновление…"
});
await autoUpdater.downloadUpdate();
return {
ok:
true
};
}catch(
err
){
log.error(
"downloadUpdate failed:",
err
);
userInitiatedUpdate =
false;
updateLifecycle =
"idle";
broadcastUpdate({
phase:
"error",
message:
String(
err?.message ||
err
)
});
return {
ok:
false
};
}
}
);

ipcMain.handle(
"app:installUpdate",
()=>{
if(
!app.isPackaged
){
return {
ok:
false
};
}
scheduleInstall();
return {
ok:
true
};
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
arg.startsWith(
`${AUTH_PROTOCOL}://`
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
arg.startsWith(
`${AUTH_PROTOCOL}://`
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
setupSiteProtocol({
bundleRoot:
BUNDLE_ROOT,
remoteApiOrigin:
REMOTE_API_ORIGIN
});
log.info(
"desktop UI: bundled site from",
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

setupAutoUpdater();
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
