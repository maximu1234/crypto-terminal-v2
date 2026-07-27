/**
 * Общая desktop-логика (Mac + Windows). Платформенные фиксы — только darwin.cjs / win32.cjs.
 */

const AUTH_PROTOCOL =
"multichart";

function isAuthCallbackUrl(
url,
authProtocol = AUTH_PROTOCOL
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
`${authProtocol}:`
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

/**
 * multichart://open?symbol=BTCUSDT&tf=60&exchange=bybit
 * @param {unknown} url
 * @param {string} [authProtocol]
 * @returns {boolean}
 */
function isChartOpenUrl(
url,
authProtocol = AUTH_PROTOCOL
){

if(
typeof url !==
"string" ||
!url
){
return false;
}

try{
const parsed =
new URL(
url
);

if(
parsed.protocol !==
`${authProtocol}:`
){
return false;
}

const host =
String(
parsed.hostname ||
""
).toLowerCase();
const path =
String(
parsed.pathname ||
""
).replace(
/\/+$/,
""
).toLowerCase();

return host ===
"open" ||
path ===
"/open" ||
path.endsWith(
"/open"
);
}catch{
return false;
}

}

/**
 * @param {unknown} url
 * @param {string} [authProtocol]
 * @returns {{ symbol: string, tf: string, exchange?: string }|null}
 */
function parseChartOpenUrl(
url,
authProtocol = AUTH_PROTOCOL
){

if(
!isChartOpenUrl(
url,
authProtocol
)
){
return null;
}

try{
const parsed =
new URL(
url
);
const symbol =
String(
parsed.searchParams.get(
"symbol"
) ||
""
).trim().toUpperCase().replace(
/\.P$/i,
""
);
const tf =
String(
parsed.searchParams.get(
"tf"
) ||
"60"
).trim() ||
"60";
const exchange =
String(
parsed.searchParams.get(
"exchange"
) ||
""
).trim().toLowerCase();

if(
!symbol ||
!/^[A-Z0-9_-]{2,32}$/.test(
symbol
)
){
return null;
}

if(
!/^[0-9A-Za-z]{1,8}$/.test(
tf
)
){
return null;
}

const out =
{
symbol,
tf
};

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
}catch{
return null;
}

}

function findAuthCallbackUrl(
argv,
authProtocol = AUTH_PROTOCOL
){

if(
!Array.isArray(
argv
)
){
return null;
}

return (
argv.find(
arg=>
isAuthCallbackUrl(
arg,
authProtocol
)
) ||
null
);

}

function findChartOpenUrl(
argv,
authProtocol = AUTH_PROTOCOL
){

if(
!Array.isArray(
argv
)
){
return null;
}

return (
argv.find(
arg=>
isChartOpenUrl(
arg,
authProtocol
)
) ||
null
);

}

function applyCommonCommandLineSwitches(
app
){

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

}

function createDeliverAuthCallback(
ctx
){

const {
log,
getMainWindow,
getPendingAuthUrl,
setPendingAuthUrl,
revealMainWindow,
authProtocol = AUTH_PROTOCOL
} =
ctx;

return function deliverAuthCallbackUrl(
url
){

if(
!isAuthCallbackUrl(
url,
authProtocol
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

const mainWindow =
getMainWindow();

if(
!mainWindow ||
mainWindow.isDestroyed()
){
setPendingAuthUrl(
url
);
return;
}

setPendingAuthUrl(
null
);

mainWindow.webContents.send(
"desktop:auth-callback",
url
);
revealMainWindow();

};

const mainWindow =
getMainWindow();

if(
!mainWindow ||
mainWindow.isDestroyed()
){
setPendingAuthUrl(
url
);
return;
}

if(
mainWindow.webContents.isLoading()
){
setPendingAuthUrl(
url
);
mainWindow.webContents.once(
"did-finish-load",
send
);
return;
}

send();

};

}

function registerSingleInstance(
ctx
){

const {
app,
log,
isAuthCallbackUrl: isAuthUrl,
deliverAuthCallbackUrl,
deliverChartOpenUrl,
revealMainWindow,
authProtocol = AUTH_PROTOCOL
} =
ctx;

const gotSingleInstanceLock =
app.requestSingleInstanceLock();

if(
!gotSingleInstanceLock
){
app.quit();
return false;
}

app.on(
"second-instance",
(
_event,
argv
)=>{

const chartUrl =
findChartOpenUrl(
argv,
authProtocol
);

if(
chartUrl &&
typeof deliverChartOpenUrl ===
"function" &&
deliverChartOpenUrl(
chartUrl
)
){
return;
}

const url =
findAuthCallbackUrl(
argv,
authProtocol
);

if(
url
){
deliverAuthCallbackUrl(
url
);
return;
}

log.info(
"second-instance: focus main window"
);
revealMainWindow();

}
);

return true;

}

module.exports = {
AUTH_PROTOCOL,
isAuthCallbackUrl,
isChartOpenUrl,
parseChartOpenUrl,
findAuthCallbackUrl,
findChartOpenUrl,
applyCommonCommandLineSwitches,
createDeliverAuthCallback,
registerSingleInstance
};
