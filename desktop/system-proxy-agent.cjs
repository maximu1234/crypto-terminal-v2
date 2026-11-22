/**
 * When the gear proxy is off, follow the computer's VPN / system proxy.
 * Chromium session mode "system" covers the window. Node https and ws
 * do not, so public sockets take an agent resolved from that same session.
 */
"use strict";

function getLog(){

try{
return require(
"electron-log"
);
}catch{
return console;
}

}
const {
getRendererProxySession
} =
require(
"./app-session.cjs"
);
const {
parseSystemProxy
} =
require(
"./system-proxy-parse.cjs"
);

const REFRESH_MS =
5000;
const PROBE_URL =
"https://api.bybit.com/";

let followSystem =
false;
let cachedKey =
"";
let cachedAgent =
null;
let refreshGeneration =
0;
let refreshTimer =
null;
const listeners =
new Set();

function createAgent(
spec
){

if(
!spec ||
!spec.url
){
return null;
}

if(
spec.url.startsWith(
"socks"
)
){
const {
SocksProxyAgent
} =
require(
"socks-proxy-agent"
);

return new SocksProxyAgent(
spec.url
);
}

const {
HttpsProxyAgent
} =
require(
"https-proxy-agent"
);

return new HttpsProxyAgent(
spec.url
);

}

function destroyAgent(
agent
){

if(
agent &&
typeof agent.destroy ===
"function"
){
try{
agent.destroy();
}catch{
/* ignore */
}
}

}

function notifyListeners(){

for(
const fn of listeners
){

try{
fn();
}catch(
err
){
getLog().warn(
"system-proxy listener:",
err?.message ||
err
);
}

}

}

function stopRefreshTimer(){

if(
!refreshTimer
){
return;
}

clearInterval(
refreshTimer
);
refreshTimer =
null;

}

function startRefreshTimer(){

if(
refreshTimer
){
return;
}

refreshTimer =
setInterval(
()=>{
void refreshSystemProxyAgent();
},
REFRESH_MS
);

if(
typeof refreshTimer.unref ===
"function"
){
refreshTimer.unref();
}

}

function setFollowSystemProxy(
on
){

const next =
!!on;
refreshGeneration +=
1;

if(
!next
){
followSystem =
false;
stopRefreshTimer();

if(
cachedKey ||
cachedAgent
){
cachedKey =
"";
destroyAgent(
cachedAgent
);
cachedAgent =
null;
notifyListeners();
}

return;
}

followSystem =
true;
startRefreshTimer();

}

function getSystemProxyAgent(){

if(
!followSystem
){
return null;
}

return cachedAgent;

}

function onSystemProxyChanged(
fn
){

if(
typeof fn !==
"function"
){
return ()=>{};
}

listeners.add(
fn
);

return ()=>{
listeners.delete(
fn
);
};

}

async function refreshSystemProxyAgent(){

if(
!followSystem
){
return null;
}

const generation =
refreshGeneration;
const ses =
getRendererProxySession();
let raw =
"DIRECT";
let resolved =
false;

if(
ses &&
typeof ses.resolveProxy ===
"function"
){

try{
raw =
await ses.resolveProxy(
PROBE_URL
);
resolved =
true;
}catch(
err
){
getLog().warn(
"system-proxy resolve:",
err?.message ||
err
);
}

}

if(
!followSystem ||
generation !==
refreshGeneration
){
return getSystemProxyAgent();
}

if(
!resolved
){
return cachedAgent;
}

const spec =
parseSystemProxy(
raw
);
const key =
spec
? spec.url
: "";

if(
key ===
cachedKey
){
return cachedAgent;
}

let nextAgent =
null;

if(
spec
){

try{
nextAgent =
createAgent(
spec
);
}catch(
err
){
getLog().warn(
"system-proxy agent:",
err?.message ||
err
);
return cachedAgent;
}

}

const previous =
cachedAgent;
cachedKey =
key;
cachedAgent =
nextAgent;
destroyAgent(
previous
);
getLog().info(
"system-proxy:",
key ||
"direct"
);
notifyListeners();

return cachedAgent;

}

module.exports =
{
parseSystemProxy,
setFollowSystemProxy,
refreshSystemProxyAgent,
getSystemProxyAgent,
onSystemProxyChanged
};
