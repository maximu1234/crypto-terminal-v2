/**
 * Bybit orderbook.1000 в main-процессе.
 * Сокет окна идёт через Chromium SOCKS и на реле часто падает
 * (ERR_SOCKS_CONNECTION_FAILED). Свечи уже ходят этим релеем из main.
 */
"use strict";

const log =
require(
"electron-log"
);
const {
getRelayHttpsAgent
} =
require(
"../app-proxy-socks-relay.cjs"
);
const {
handleTrustedDesktopUi
} =
require(
"./desktop-ui-gate.cjs"
);
const {
createDepthBatcher
} =
require(
"./bybit-depth-batch.cjs"
);

const WS_URL_BYBIT =
"wss://stream.bybit.com/v5/public/linear";
const WS_URL_BYTICK =
"wss://stream.bytick.com/v5/public/linear";
const PING_MS =
20000;
const HANDSHAKE_TIMEOUT_MS =
8000;

let WsConstructor =
null;
let targetWebContents =
null;
let socket =
null;
let symbol =
"";
let urlIndex =
0;
let intentionalClose =
false;
let reconnectTimer =
null;
let pingTimer =
null;
let connectFailures =
0;

function getWs(){

if(
!WsConstructor
){
WsConstructor =
require(
"ws"
);
}

return WsConstructor;

}

function depthTopicFor(
raw
){

const sym =
String(
raw ||
""
).trim().toUpperCase().replace(
/\.P$/i,
""
).replace(
/[^A-Z0-9]/g,
""
);

if(
sym.length <
2 ||
sym.length >
20
){
return "";
}

return `orderbook.1000.${sym}`;

}

function symbolFromTopic(
topic
){

return depthTopicFor(
String(
topic ||
""
).split(
"."
)[
2
] ||
""
).split(
"."
)[
2
] ||
"";

}

function clearTimer(
timer
){

if(
timer
){
clearTimeout(
timer
);
clearInterval(
timer
);
}

return null;

}

const depthBatch =
createDepthBatcher(
messages=>{

if(
!symbol
){
return;
}

pushToRenderer({
topic:
depthTopicFor(
symbol
),
messages
});

}
);

function closeSocket(){

intentionalClose =
true;
depthBatch.stop();
reconnectTimer =
clearTimer(
reconnectTimer
);
pingTimer =
clearTimer(
pingTimer
);

if(
socket
){
try{
socket.close();
}catch{
/* ignore */
}
socket =
null;
}

intentionalClose =
false;

}

function pushToRenderer(
payload
){

if(
!targetWebContents ||
targetWebContents.isDestroyed()
){
return;
}

try{
targetWebContents.send(
"bybitDepth:push",
payload
);
}catch(
err
){
log.warn(
"bybit depth push:",
err?.message ||
err
);
}

}

function scheduleReconnect(
delayMs
){

if(
reconnectTimer ||
intentionalClose ||
!symbol
){
return;
}

reconnectTimer =
setTimeout(
()=>{
reconnectTimer =
null;
connect();
},
delayMs
);

if(
typeof reconnectTimer.unref ===
"function"
){
reconnectTimer.unref();
}

}

function connect(){

if(
intentionalClose ||
!symbol ||
socket
){
return;
}

const Ws =
getWs();
const agent =
getRelayHttpsAgent();
const urls =
agent
? [
WS_URL_BYTICK,
WS_URL_BYBIT
]
: [
WS_URL_BYBIT,
WS_URL_BYTICK
];
const url =
urls[
urlIndex %
urls.length
];
const opts =
{
handshakeTimeout:
HANDSHAKE_TIMEOUT_MS,
perMessageDeflate:
false
};

if(
agent
){
opts.agent =
agent;
}

const openedAt =
Date.now();
const ws =
new Ws(
url,
opts
);
const topic =
depthTopicFor(
symbol
);

socket =
ws;

ws.on(
"open",
()=>{
if(
socket !==
ws
){
return;
}

connectFailures =
0;
pingTimer =
setInterval(
()=>{
if(
socket !==
ws ||
ws.readyState !==
1
){
return;
}

try{
ws.send(
JSON.stringify(
{
op:
"ping"
}
)
);
}catch{
/* ignore */
}

},
PING_MS
);

if(
typeof pingTimer.unref ===
"function"
){
pingTimer.unref();
}

try{
ws.send(
JSON.stringify(
{
op:
"subscribe",
args:[
topic
]
}
)
);
}catch{
/* ignore */
}

}
);

ws.on(
"message",
raw=>{
if(
socket !==
ws
){
return;
}

let msg;

try{
msg =
JSON.parse(
raw.toString()
);
}catch{
return;
}

if(
!msg ||
msg.op ===
"pong" ||
msg.op ===
"ping" ||
msg.op ===
"subscribe" ||
msg.op ===
"unsubscribe"
){
return;
}

const nextTopic =
String(
msg.topic ||
""
);

if(
!nextTopic.startsWith(
"orderbook."
) ||
symbolFromTopic(
nextTopic
) !==
symbol
){
return;
}

depthBatch.push(
msg
);

}
);

ws.on(
"close",
()=>{
if(
socket !==
ws
){
return;
}

socket =
null;
pingTimer =
clearTimer(
pingTimer
);

if(
intentionalClose ||
!symbol
){
return;
}

const lived =
Date.now() -
openedAt;

if(
lived <
3000
){
connectFailures +=
1;

if(
connectFailures >=
2
){
urlIndex +=
1;
connectFailures =
0;
}

}

scheduleReconnect(
lived <
3000
? 4000
: 2000
);

}
);

ws.on(
"error",
err=>{
if(
socket !==
ws
){
return;
}

log.warn(
"bybit depth ws:",
err?.message ||
err
);

try{
ws.close();
}catch{
/* ignore */
}

}
);

}

function setDepthSymbol(
raw
){

const topic =
depthTopicFor(
raw
);
const next =
topic
? topic.split(
"."
)[
2
]
: "";

if(
next ===
symbol &&
socket &&
socket.readyState ===
1
){
return {
ok:
true,
symbol
};
}

symbol =
next;
closeSocket();

if(
symbol
){
connect();
}

return {
ok:
true,
symbol
};

}

function setBybitDepthWsTarget(
webContents
){

targetWebContents =
webContents ||
null;

if(
!targetWebContents
){
symbol =
"";
closeSocket();
}

}

function registerBybitDepthWsIpc(
ipcMain
){

handleTrustedDesktopUi(
ipcMain,
"bybitDepth:setSymbol",
(
_event,
payload
)=>
setDepthSymbol(
payload?.symbol
)
);

}

module.exports =
{
depthTopicFor,
registerBybitDepthWsIpc,
setBybitDepthWsTarget
};
