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
/* mainWindow, ctx */
){

/* Стандартное закрытие → quit через window-all-closed. */

}

function shouldQuitWhenAllWindowsClosed(){

return true;

}

module.exports = {
id,
applyPlatformCommandLineSwitches,
ensureAppVisible,
registerAuthProtocol,
registerPlatformHandlers,
registerActivateHandler,
attachMainWindowCloseHandler,
shouldQuitWhenAllWindowsClosed
};
