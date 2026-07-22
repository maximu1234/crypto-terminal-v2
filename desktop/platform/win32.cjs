/**
 * Windows-only desktop shell. Mac-фиксы сюда не писать.
 */

const path =
require(
"path"
);

const {
AUTH_PROTOCOL
} =
require(
"./shared.cjs"
);
const {
setWin32LoginAgentEnabled
} =
require(
"./win32-login-agent.cjs"
);

const id =
"win32";

function applyPlatformCommandLineSwitches(
/* app */
){

/* Windows-specific Chromium switches — сюда. */

}

function ensureAppVisible(
/* app */
){

/* noop */

}

function registerAuthProtocol(
ctx
){

const {
app
} =
ctx;

/*
  Deep link / email auth на Windows — правки только в этом файле.
  Сейчас зеркало macOS-логики; при отличиях меняем win32, darwin не трогаем.
*/
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

function registerPlatformHandlers(
/* ctx */
){

/*
  Доп. Windows lifecycle (custom protocol, installer hooks) — сюда.
  second-instance — в shared.cjs (registerSingleInstance).
*/

}

function registerActivateHandler(
/* ctx */
){

/* Windows не использует app.activate как macOS. */

}

function attachMainWindowCloseHandler(
mainWindow,
ctx
){

const {
getIsQuitting,
dismissTrayPopup,
shouldEnterAgentOnClose,
enterAgentMode,
isAgentClosing
} =
ctx;

mainWindow.on(
"close",
event=>{

if(
getIsQuitting() ||
isAgentClosing?.()
){
return;
}

if(
!shouldEnterAgentOnClose?.()
){
/* Tray off: стандартный close → window-all-closed → quit. */
return;
}

event.preventDefault();
dismissTrayPopup?.();
enterAgentMode?.();

}
);

}

function isTrayEnabledInPrefs(){

try{
return require(
"../menu-bar-tray-prefs-store.cjs"
).readPrefs().trayEnabled !==
false;
}catch{
return false;
}

}

function shouldQuitWhenAllWindowsClosed(){

/* С tray: agent держит процесс. Без tray: крестик = выход. */
return !isTrayEnabledInPrefs();

}

function supportsTrayAgent(){

return process.platform ===
"win32";

}

function setLoginAgentEnabled(
enabled
){

return setWin32LoginAgentEnabled(
!!enabled
);

}

module.exports = {
id,
applyPlatformCommandLineSwitches,
ensureAppVisible,
registerAuthProtocol,
registerPlatformHandlers,
registerActivateHandler,
attachMainWindowCloseHandler,
shouldQuitWhenAllWindowsClosed,
supportsTrayAgent,
setLoginAgentEnabled
};
