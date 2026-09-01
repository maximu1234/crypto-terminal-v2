/**
 * Gate trading / algoTrading IPC to trusted local desktop UI only.
 * Remote Vercel / DESKTOP_REMOTE_UI / bundle→remote fallback must not place orders.
 */
const log =
require(
"electron-log"
);

/** @type {boolean} */
let tradingIpcLocked =
false;

/** @type {(() => string | null) | null} */
let getLocalSiteOrigin =
null;

/** @type {(() => boolean) | null} */
let getUseBundle =
null;

function configureDesktopUiGate(
opts =
{}
){

if(
typeof opts.getLocalSiteOrigin ===
"function"
){
getLocalSiteOrigin =
opts.getLocalSiteOrigin;
}

if(
typeof opts.getUseBundle ===
"function"
){
getUseBundle =
opts.getUseBundle;
}

}

function setTradingIpcLocked(
locked
){

tradingIpcLocked =
!!locked;

if(
tradingIpcLocked
){
log.warn(
"desktop-ui-gate: trading/algo IPC locked"
);
}

}

function isTradingIpcLocked(){

return tradingIpcLocked;

}

function parseHttpOrigin(
url
){

try{
return new URL(
String(
url ||
""
).trim()
).origin;
}catch{
return "";
}

}

function isLoopbackHttpOrigin(
origin
){

return /^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/i.test(
String(
origin ||
""
)
);

}

function isTrustedDesktopUiUrl(
url
){

const value =
String(
url ||
""
).trim();

if(
!value
){
return false;
}

if(
value.startsWith(
"multichart://"
)
){
return true;
}

const configured =
typeof getLocalSiteOrigin ===
"function"
? getLocalSiteOrigin()
: null;
const localOrigin =
configured
? parseHttpOrigin(
configured
)
: "";
const pageOrigin =
parseHttpOrigin(
value
);

if(
localOrigin &&
pageOrigin &&
pageOrigin ===
localOrigin
){
return true;
}

if(
!localOrigin &&
isLoopbackHttpOrigin(
pageOrigin
)
){
return true;
}

return false;

}

/**
 * @param {import("electron").IpcMainInvokeEvent | null | undefined} event
 * @returns {{ ok: true } | { ok: false, message: string }}
 */
function assertTrustedDesktopUi(
event
){

if(
process.env.DESKTOP_REMOTE_UI ===
"1"
){
return {
ok:
false,
message:
"Торговый IPC отключён (DESKTOP_REMOTE_UI)"
};
}

if(
tradingIpcLocked
){
return {
ok:
false,
message:
"Торговый IPC заблокирован (remote UI)"
};
}

const url =
String(
event?.sender?.getURL?.() ||
""
);

if(
!isTrustedDesktopUiUrl(
url
)
){
return {
ok:
false,
message:
"Торговый IPC только для локального UI"
};
}

return {
ok:
true
};

}

/**
 * @param {import("electron").IpcMain} ipcMain
 * @param {string} channel
 * @param {(...args: any[]) => any} handler
 */
function handleTrustedDesktopUi(
ipcMain,
channel,
handler
){

ipcMain.handle(
channel,
async(
event,
...args
)=>{

const gate =
assertTrustedDesktopUi(
event
);

if(
!gate.ok
){
return gate;
}

return handler(
event,
...args
);

}
);

}

module.exports =
{
configureDesktopUiGate,
setTradingIpcLocked,
isTradingIpcLocked,
assertTrustedDesktopUi,
isTrustedDesktopUiUrl,
handleTrustedDesktopUi
};
