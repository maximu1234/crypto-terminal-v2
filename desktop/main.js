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
const path =
require(
"path"
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

const APP_URL =
process.env.CRYPTO_TERMINAL_URL ||
"https://crypto-terminal-v2.vercel.app";

const PARTITION =
"persist:multichart-desktop";

/** @type {BrowserWindow | null} */
let mainWindow =
null;

/** @type {number | null} */
let powerBlockerId =
null;

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
"checking-for-update",
()=>{
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
broadcastUpdate({
phase:
"ready",
message:
`Версия ${info.version} готова к установке`,
version:
info.version
});
}
);

}

function startPowerSaveBlocker(){

if(
powerSaveBlocker.isStarted(
powerBlockerId
)
){
return;
}

powerBlockerId =
powerSaveBlocker.start(
"prevent-app-suspension"
);

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
APP_URL
).origin,
numSockets:
6
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
return;
}

void warmStaticCache(
ses,
APP_URL
).then(
count=>{
log.info(
`desktop warm-cache: ${count} assets`
);
}
).catch(
err=>{
log.warn(
"desktop warm-cache failed:",
err
);
}
);

}

function createWindow(){

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
false,
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
mainWindow?.maximize();
mainWindow?.show();
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
APP_URL
);

mainWindow.webContents.once(
"did-finish-load",
()=>{

if(
!app.isPackaged
){
return;
}

setTimeout(
()=>{
void autoUpdater.checkForUpdates();
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
const base =
new URL(
APP_URL
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
void autoUpdater.checkForUpdates();
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
autoUpdater.quitAndInstall(
false,
true
);
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

autoUpdater.on(
"update-downloaded",
()=>{
const item =
menu.getMenuItemById(
"install-update"
);
if(
item
){
item.enabled =
true;
}
}
);
}

function registerIpc(){

ipcMain.handle(
"app:getVersion",
()=>({
app:
app.getVersion(),
url:
APP_URL
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
try{
await autoUpdater.downloadUpdate();
return {
ok:
true
};
}catch(
err
){
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
autoUpdater.quitAndInstall(
false,
true
);
return {
ok:
true
};
}
);

}

app.whenReady().then(
()=>{

startPowerSaveBlocker();

const ses =
session.fromPartition(
PARTITION
);

tuneDesktopSession(
ses
);
beginSessionWarmCache(
ses
);

setupAutoUpdater();
registerIpc();
buildMenu();
createWindow();

app.on(
"activate",
()=>{
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

app.on(
"before-quit",
()=>{

if(
powerSaveBlocker.isStarted(
powerBlockerId
)
){
powerSaveBlocker.stop(
powerBlockerId
);
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
