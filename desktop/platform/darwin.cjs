/**
 * macOS-only desktop shell. Win-фиксы сюда не писать.
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
"darwin";

function applyPlatformCommandLineSwitches(
app
){

app.commandLine.appendSwitch(
"enable-features",
"Metal"
);

}

function ensureAppVisible(
app
){

if(
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

function registerAuthProtocol(
ctx
){

const {
app
} =
ctx;

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
ctx
){

const {
app,
deliverAuthCallbackUrl
} =
ctx;

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

function registerActivateHandler(
ctx
){

const {
app,
BrowserWindow,
createWindow,
revealMainWindow
} =
ctx;

app.on(
"activate",
()=>{

ensureAppVisible(
app
);

const mainWindow =
ctx.getMainWindow?.();

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

function attachMainWindowCloseHandler(
mainWindow,
ctx
){

const {
app,
getIsQuitting,
dismissTrayPopup
} =
ctx;

mainWindow.on(
"close",
event=>{

if(
!getIsQuitting()
){
event.preventDefault();
dismissTrayPopup?.();
mainWindow.hide();
ensureAppVisible(
app
);
}

}
);

}

function shouldQuitWhenAllWindowsClosed(){

return false;

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
