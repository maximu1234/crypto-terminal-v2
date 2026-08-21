/**
 * Desktop-only HTTP/SOCKS proxy for this .app (Chromium session).
 * Credentials stay in userData; never in git / web localStorage.
 */
"use strict";

const path =
require(
"path"
);
const {
app
} =
require(
"electron"
);
const log =
require(
"electron-log"
);
const {
readSecretText,
writeSecretText
} =
require(
"./user-store.cjs"
);
const {
getRendererProxySession
} =
require(
"./app-session.cjs"
);
const {
PROXY_BYPASS_RULES,
normalizeProxySettings,
isProxyConfigReady,
buildProxyRules
} =
require(
"./app-proxy-config.cjs"
);
const {
needsSocksAuthRelay,
startSocksAuthRelay,
stopSocksAuthRelay
} =
require(
"./app-proxy-socks-relay.cjs"
);

const STORE_FILE =
"app-proxy-settings.json";

const emptySettings =
()=>
normalizeProxySettings(
{}
);

function storePath(){

return path.join(
app.getPath(
"userData"
),
STORE_FILE
);

}

function loadProxySettings(){

try{
const raw =
readSecretText(
storePath()
);

if(
!raw
){
return emptySettings();
}

return normalizeProxySettings(
JSON.parse(
raw
)
);
}catch(
err
){
log.warn(
"app-proxy load:",
err?.message ||
err
);
return emptySettings();
}

}

function saveProxySettings(
raw
){

const settings =
normalizeProxySettings(
raw
);

writeSecretText(
storePath(),
JSON.stringify(
settings
)
);

return settings;

}

async function applyProxyToSession(
ses,
settings,
proxyRules
){

if(
!ses ||
typeof ses.setProxy !==
"function"
){
return;
}

const rules =
typeof proxyRules ===
"string"
? proxyRules
: buildProxyRules(
settings
);

if(
!rules
){
await ses.setProxy({
mode:
"direct"
});
}else{
await ses.setProxy({
proxyRules:
rules,
proxyBypassRules:
PROXY_BYPASS_RULES
});
}

if(
typeof ses.closeAllConnections ===
"function"
){
try{
ses.closeAllConnections();
}catch(
err
){
log.warn(
"app-proxy closeAllConnections:",
err?.message ||
err
);
}

}

}

async function applyDesktopProxy(
opts =
{}
){

const settings =
opts.settings ||
loadProxySettings();
const sessions =
Array.isArray(
opts.sessions
) &&
opts.sessions.length
? opts.sessions.filter(
Boolean
)
: [
getRendererProxySession()
];

await stopSocksAuthRelay();

let localSocksPort =
0;
let proxyRules =
buildProxyRules(
settings
);

if(
isProxyConfigReady(
settings
) &&
needsSocksAuthRelay(
settings
)
){
localSocksPort =
await startSocksAuthRelay(
settings
);

if(
!localSocksPort
){
throw new Error(
"не удалось открыть локальный SOCKS"
);
}

proxyRules =
"socks5://127.0.0.1:" +
localSocksPort;
log.info(
"app-proxy: socks-auth relay",
localSocksPort,
"→",
settings.host +
":" +
settings.port
);
}

for(
const ses of sessions
){
await applyProxyToSession(
ses,
settings,
proxyRules
);
}

if(
isProxyConfigReady(
settings
)
){
log.info(
"app-proxy: on",
settings.type,
settings.host +
":" +
settings.port
);
}else{
log.info(
"app-proxy: direct"
);
}

return settings;

}

function publicProxySettings(
settings
){

const cfg =
normalizeProxySettings(
settings
);

return {
enabled:
cfg.enabled,
type:
cfg.type,
host:
cfg.host,
port:
cfg.port ||
"",
username:
cfg.username,
password:
cfg.password,
ready:
isProxyConfigReady(
cfg
)
};

}

function registerAppProxyLogin(
electronApp
){

if(
!electronApp ||
typeof electronApp.on !==
"function"
){
return;
}

electronApp.on(
"login",
(
event,
_webContents,
_details,
authInfo,
callback
)=>{

if(
!authInfo ||
!authInfo.isProxy
){
return;
}

event.preventDefault();

const cfg =
loadProxySettings();

callback(
cfg.username ||
"",
cfg.password ||
""
);

}
);

}

function registerAppProxyIpc(
opts
){

const ipcMain =
opts?.ipcMain;
const handleTrustedDesktopUi =
opts?.handleTrustedDesktopUi;
const getSessions =
typeof opts?.getSessions ===
"function"
? opts.getSessions
: ()=>
[];
const reloadMainWindow =
typeof opts?.reloadMainWindow ===
"function"
? opts.reloadMainWindow
: ()=>{};

if(
!ipcMain ||
typeof handleTrustedDesktopUi !==
"function"
){
return;
}

handleTrustedDesktopUi(
ipcMain,
"desktop:getAppProxy",
()=>{

try{
return {
ok:
true,
settings:
publicProxySettings(
loadProxySettings()
)
};
}catch(
err
){
log.warn(
"desktop:getAppProxy:",
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
settings:
publicProxySettings(
{}
)
};
}

}
);

handleTrustedDesktopUi(
ipcMain,
"desktop:saveAppProxy",
async(
_event,
payload
)=>{

try{
const settings =
saveProxySettings(
payload
);

await applyDesktopProxy({
settings,
sessions:
getSessions()
});

const reload =
!!payload?.reload;

if(
reload
){
setImmediate(
()=>{
try{
reloadMainWindow();
}catch(
err
){
log.warn(
"app-proxy reload:",
err?.message ||
err
);
}
}
);
}

return {
ok:
true,
settings:
publicProxySettings(
settings
)
};
}catch(
err
){
log.warn(
"desktop:saveAppProxy:",
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

module.exports =
{
applyDesktopProxy,
getRendererProxySession,
loadProxySettings,
registerAppProxyIpc,
registerAppProxyLogin
};
