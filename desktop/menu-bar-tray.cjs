/**
 * macOS menu bar: иконка + суммарный PnL + кастомный popup (баланс, позиции).
 */
const {
Tray,
BrowserWindow,
ipcMain,
nativeImage,
app,
screen
} =
require(
"electron"
);
const path =
require(
"path"
);
const log =
require(
"electron-log"
);
const {
startTrayFeed,
stopTrayFeed,
refreshTrayFeedNow
} =
require(
"./menu-bar-tray-feed.cjs"
);
const trayPrefsStore =
require(
"./menu-bar-tray-prefs-store.cjs"
);

/** @type {import("electron").Tray | null} */
let tray =
null;

/** @type {import("electron").BrowserWindow | null} */
let popup =
null;

/** @type {(() => void) | null} */
let revealMainWindow =
null;

/** @type {Record<string, unknown>} */
let lastTrayState =
{};

let trayPopupIpcReady =
false;

let ignoreTrayPopupBlur =
false;

/** Экранные x,y popup — фиксируем при открытии, пока меню видимо. */
let popupScreenPosition =
null;

let stopPopupDismissHooks =
null;

const POPUP_WIDTH =
280;

function trayIconPath(){

const name =
"menu-bar-tray.png";

if(
app.isPackaged
){
return path.join(
process.resourcesPath,
name
);
}

return path.join(
__dirname,
"build",
name
);

}

function trayPopupPath(
name
){

return path.join(
__dirname,
name
);

}

function formatTrayPnlTitle(
totalPnl,
pnlHidden
){

if(
pnlHidden
){
return "***";
}

if(
totalPnl ==
null
){
return "";
}

const num =
Number(
totalPnl
);

if(
!Number.isFinite(
num
)
){
return "";
}

return num.toLocaleString(
"ru-RU",
{
maximumFractionDigits:
2,
signDisplay:
"exceptZero"
}
);

}

function ensureTrayPopupIpc(){

if(
trayPopupIpcReady
){
return;
}

trayPopupIpcReady =
true;

ipcMain.on(
"tray-popup:resize",
(
event,
height
)=>{

const win =
BrowserWindow.fromWebContents(
event.sender
);

if(
!win ||
win.isDestroyed()
){
return;
}

const nextHeight =
Math.max(
120,
Math.min(
trayPopupMaxHeight(),
Number(
height
) ||
120
)
);

win.setSize(
POPUP_WIDTH,
nextHeight,
false
);

positionTrayPopup();

});

function trayPopupMaxHeight(){

try{
const workArea =
screen.getPrimaryDisplay()?.workAreaSize;

if(
workArea?.height
){
return Math.max(
220,
workArea.height -
24
);
}
}catch{
/* ignore */
}

return 720;

}

ipcMain.on(
"tray-popup:open-app",
()=>{

hideTrayPopup();
ensureMacDockVisible();
revealMainWindow?.();

});

ipcMain.on(
"tray-popup:quit",
()=>{

hideTrayPopup();
app.quit();

});

ipcMain.on(
"tray-popup:toggle-pnl-hidden",
()=>{

const current =
!!trayPrefsStore.readPrefs().pnlHidden;
setMenuBarTrayPnlHidden(
!current,
{
broadcast:
true
}
);

});

}

function isMenuBarTrayActive(){

return (
process.platform ===
"darwin" &&
!!tray
);

}

function ensureTrayFeedRunning(){

if(
!isMenuBarTrayActive()
){
stopTrayFeed();
return;
}

startTrayFeed(
updateMenuBarTray
);

}

function createTrayPopup(){

if(
popup &&
!popup.isDestroyed()
){
return popup;
}

ensureTrayPopupIpc();

popup =
new BrowserWindow({
width:
POPUP_WIDTH,
height:
220,
show:
false,
frame:
false,
resizable:
false,
movable:
false,
fullscreenable:
false,
skipTaskbar:
true,
alwaysOnTop:
true,
transparent:
true,
hasShadow:
false,
focusable:
true,
acceptFirstMouse:
true,
vibrancy:
"popover",
visualEffectState:
"active",
webPreferences:{
preload:
trayPopupPath(
"tray-popup-preload.cjs"
),
contextIsolation:
true,
nodeIntegration:
false,
sandbox:
true
}
});

popup.setVisibleOnAllWorkspaces(
true,
{
visibleOnFullScreen:
true
}
);

void popup.loadFile(
trayPopupPath(
"tray-popup.html"
)
);

popup.on(
"blur",
()=>{

if(
ignoreTrayPopupBlur
){
return;
}

hideTrayPopup();

}
);

return popup;

}

function unlockTrayPopupPosition(){

popupScreenPosition =
null;

}

function lockTrayPopupPosition(){

if(
!popup ||
popup.isDestroyed()
){
return;
}

popupScreenPosition =
popup.getPosition();

}

function positionTrayPopup(){

if(
!tray ||
!popup ||
popup.isDestroyed()
){
return;
}

if(
popupScreenPosition
){
popup.setPosition(
popupScreenPosition[
0
],
popupScreenPosition[
1
]
);
return;
}

const trayBounds =
tray.getBounds();
const popupBounds =
popup.getBounds();
const x =
Math.round(
trayBounds.x +
trayBounds.width /
2 -
popupBounds.width /
2
);
const y =
Math.round(
trayBounds.y +
trayBounds.height +
4
);

popup.setPosition(
x,
y
);

}

function sendTrayPopupState(
state
){

if(
!popup ||
popup.isDestroyed()
){
return;
}

const push =
()=>{
if(
popup?.isDestroyed()
){
return;
}

popup.webContents.send(
"tray-popup:state",
state ||
{}
);
};

if(
popup.webContents.isLoading()
){
popup.webContents.once(
"did-finish-load",
push
);
}else{
push();
}

}

function startPopupDismissHooks(){

stopPopupDismissHooks?.();
stopPopupDismissHooks =
null;

const onWindowFocus =
(
_event,
window
)=>{

if(
!popup ||
popup.isDestroyed() ||
!popup.isVisible() ||
ignoreTrayPopupBlur
){
return;
}

if(
window ===
popup
){
return;
}

hideTrayPopup();

};

app.on(
"browser-window-focus",
onWindowFocus
);

stopPopupDismissHooks =
()=>{
app.removeListener(
"browser-window-focus",
onWindowFocus
);
stopPopupDismissHooks =
null;
};

}

function ensureMacDockVisible(){

if(
process.platform !==
"darwin" ||
!app.dock?.show
){
return;
}

try{
app.dock.show();
}catch{
/* ignore */
}

}

function toggleTrayPopup(){

if(
!tray
){
return;
}

const win =
createTrayPopup();

if(
win.isVisible()
){
hideTrayPopup();
return;
}

ensureMacDockVisible();

ignoreTrayPopupBlur =
true;

unlockTrayPopupPosition();
positionTrayPopup();
win.show();
win.focus();
sendTrayPopupState(
lastTrayState
);
positionTrayPopup();
lockTrayPopupPosition();
startPopupDismissHooks();

setTimeout(
()=>{
ignoreTrayPopupBlur =
false;
},
250
);

}

function hideTrayPopup(){

stopPopupDismissHooks?.();

if(
!popup ||
popup.isDestroyed() ||
!popup.isVisible()
){
unlockTrayPopupPosition();
return;
}

unlockTrayPopupPosition();
popup.hide();

}

function applyTrayState(
state
){

if(
!tray
){
return;
}

lastTrayState =
state ||
{};

const title =
formatTrayPnlTitle(
state?.totalPnl,
!!state?.pnlHidden
);

tray.setTitle(
title
);

if(
popup &&
!popup.isDestroyed() &&
popup.isVisible()
){
sendTrayPopupState(
lastTrayState
);
}

}

function initMenuBarTray(
revealFn
){

if(
process.platform !==
"darwin"
){
return;
}

if(
revealFn
){
revealMainWindow =
revealFn;
}

if(
tray
){
return;
}

ensureTrayPopupIpc();

const iconPath =
trayIconPath();

let image =
nativeImage.createFromPath(
iconPath
);

if(
image.isEmpty()
){
log.warn(
"menu-bar-tray: icon missing at",
iconPath
);
image =
nativeImage.createEmpty();
}else{
image =
image.resize({
width:
18,
height:
18
});
}

tray =
new Tray(
image
);
tray.setToolTip(
"Multichart"
);

ensureMacDockVisible();

tray.on(
"click",
()=>{
toggleTrayPopup();
}
);

applyTrayState({
exchange:
"Bybit",
statusLabel:
"—",
balanceLabel:
"—",
totalPnl:
null,
pnlHidden:
!!trayPrefsStore.readPrefs().pnlHidden,
positions:[]
});

ensureTrayFeedRunning();

}

function broadcastPnlPrivacyToRenderers(
hidden
){

for(
const win of BrowserWindow.getAllWindows()
){

try{

if(
win.isDestroyed()
){
continue;
}

win.webContents.send(
"desktop:pnl-privacy-changed",
{
hidden:
!!hidden
}
);
}catch{
/* ignore */
}

}

}

function setMenuBarTrayPnlHidden(
hidden,
options =
{}
){

const prefs =
trayPrefsStore.setPnlHidden(
!!hidden
);
const nextHidden =
!!prefs.pnlHidden;

const prev =
lastTrayState &&
typeof lastTrayState ===
"object"
? lastTrayState
: {};
const positions =
Array.isArray(
prev.positions
)
? prev.positions.map(
row=>{

const pnl =
Number(
row?.pnl
);
const pnlLabel =
nextHidden
? "***"
: (
Number.isFinite(
pnl
)
? pnl.toLocaleString(
"ru-RU",
{
maximumFractionDigits:
2,
signDisplay:
"exceptZero"
}
)
: (
row?.pnlLabel ===
"***"
? "—"
: (
row?.pnlLabel ||
"—"
)
)
);

return {
...row,
pnlLabel
};

}
)
: [];

applyTrayState(
{
...prev,
pnlHidden:
nextHidden,
positions
}
);

refreshTrayFeedNow();

if(
options.broadcast !==
false
){
broadcastPnlPrivacyToRenderers(
nextHidden
);
}

return {
ok:
true,
pnlHidden:
nextHidden
};

}

function updateMenuBarTray(
state
){

if(
process.platform !==
"darwin"
){
return;
}

if(
!tray
){
initMenuBarTray(
revealMainWindow
);
}

applyTrayState(
state ||
{}
);

}

function destroyMenuBarTray(){

stopTrayFeed();
stopPopupDismissHooks?.();
hideMenuBarTray();
revealMainWindow =
null;
lastTrayState =
{};

}

function dismissTrayPopup(){

hideTrayPopup();

}

function hideMenuBarTray(){

hideTrayPopup();

if(
popup &&
!popup.isDestroyed()
){
popup.destroy();
popup =
null;
}

if(
tray
){
tray.destroy();
tray =
null;
}

}

function configureMenuBarTray(
revealFn
){

if(
process.platform !==
"darwin"
){
return;
}

revealMainWindow =
revealFn;

}

function setMenuBarTrayVisible(
visible
){

if(
process.platform !==
"darwin"
){
return;
}

if(
!visible
){
stopTrayFeed();
hideMenuBarTray();
return;
}

if(
!tray
){
initMenuBarTray(
revealMainWindow
);
}else{
ensureTrayFeedRunning();
}

}

module.exports =
{
configureMenuBarTray,
initMenuBarTray,
updateMenuBarTray,
setMenuBarTrayVisible,
setMenuBarTrayPnlHidden,
isMenuBarTrayActive,
dismissTrayPopup,
destroyMenuBarTray
};
