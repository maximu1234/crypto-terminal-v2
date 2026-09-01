/**
 * Bybit public linear WebSocket (kline + tickers) in the desktop main
 * process. Chromium session.setProxy cannot send SOCKS5 auth; the local
 * relay agent used here can. Keep this hub independent of the algo kline module.
 */
"use strict";

const https =
require(
"https"
);
const {
URL
} =
require(
"url"
);
const log =
require(
"electron-log"
);
const {
getRelayHttpsAgent,
setRelayAgentCreatedHandler
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

let WsConstructor =
null;

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

const WS_URL_BYBIT =
"wss://stream.bybit.com/v5/public/linear";
const WS_URL_BYTICK =
"wss://stream.bytick.com/v5/public/linear";
const PING_MS =
20000;
const SUBSCRIBE_CHUNK =
10;
const HANDSHAKE_TIMEOUT_MS =
8000;
const PROBE_TIMEOUT_MS =
20000;
const SILENCE_MS =
90_000;
const KLINE_SILENCE_MS =
45_000;
const SILENCE_CHECK_MS =
15_000;

let wsUrlIndex =
0;
let socket =
null;
let reconnectTimer =
null;
let pingTimer =
null;
let silenceTimer =
null;
let intentionalClose =
false;
let lastDataAt =
0;
let lastKlineAt =
0;
let wsConnectFailures =
0;
let socketUsedAgent =
false;
/** @type {import("electron").WebContents | null} */
let targetWebContents =
null;
const wanted =
new Set();

function sanitizeBybitPublicTopic(
raw
){

const t =
String(
raw ||
""
).trim();
const kline =
/^kline\.([0-9]{1,4}|[DWM])\.([A-Za-z0-9]{2,20})$/i.exec(
t
);

if(
kline
){
const tfRaw =
kline[
1
];
const tf =
/^[DWM]$/i.test(
tfRaw
)
? tfRaw.toUpperCase()
: tfRaw;
return `kline.${tf}.${kline[2].toUpperCase()}`;
}

const tick =
/^tickers\.([A-Za-z0-9]{2,20})$/i.exec(
t
);

if(
tick
){
return `tickers.${tick[1].toUpperCase()}`;
}

return "";

}

function publicWsUrlList(){

if(
getRelayHttpsAgent()
){
return [
WS_URL_BYTICK,
WS_URL_BYBIT
];
}

return [
WS_URL_BYBIT,
WS_URL_BYTICK
];

}

function currentWsUrl(){

const urls =
publicWsUrlList();

return urls[
wsUrlIndex %
urls.length
];

}

function rotateWsUrl(){

const urls =
publicWsUrlList();

wsUrlIndex =
(
wsUrlIndex +
1
) %
urls.length;

}

function wsClientOptions(){

const agent =
getRelayHttpsAgent();
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

return opts;

}

function chunkArgs(
args,
size
){

const list =
Array.isArray(
args
)
? args
: [];
const out =
[];

for(
let i =
0;
i <
list.length;
i +=
size
){
out.push(
list.slice(
i,
i +
size
)
);
}

return out;

}

function isSocketOpen(){

const Ws =
getWs();
return !!(
socket &&
socket.readyState ===
Ws.OPEN
);

}

function isSocketBusy(){

const Ws =
getWs();
return !!(
socket &&
(
socket.readyState ===
Ws.OPEN ||
socket.readyState ===
Ws.CONNECTING
)
);

}

function sendJson(
payload
){

if(
!isSocketOpen()
){
return;
}

try{
socket.send(
JSON.stringify(
payload
)
);
}catch(
err
){
log.warn(
"bybit public ws send:",
err?.message ||
err
);
}

}

function subscribeTopics(
topicList
){

for(
const chunk of chunkArgs(
topicList,
SUBSCRIBE_CHUNK
)
){
sendJson({
op:
"subscribe",
args:
chunk
});
}

}

function unsubscribeTopics(
topicList
){

for(
const chunk of chunkArgs(
topicList,
SUBSCRIBE_CHUNK
)
){
sendJson({
op:
"unsubscribe",
args:
chunk
});
}

}

function clearPing(){

if(
pingTimer
){
clearInterval(
pingTimer
);
pingTimer =
null;
}

}

function clearSilenceWatch(){

if(
silenceTimer
){
clearInterval(
silenceTimer
);
silenceTimer =
null;
}

}

function startPing(){

clearPing();
pingTimer =
setInterval(
()=>{

if(
!isSocketOpen()
){
return;
}

sendJson({
op:
"ping"
});

},
PING_MS
);

if(
typeof pingTimer.unref ===
"function"
){
pingTimer.unref();
}

}

function startSilenceWatch(){

clearSilenceWatch();
silenceTimer =
setInterval(
()=>{

if(
intentionalClose ||
!wanted.size ||
!isSocketOpen() ||
!lastDataAt
){
return;
}

const silentMs =
Date.now() -
lastDataAt;

if(
silentMs >=
SILENCE_MS
){
forceReconnect(
`silence ${Math.round(silentMs / 1000)}s`
);
return;
}

const hasKline =
[
...wanted
].some(
topic=>
topic.startsWith(
"kline."
)
);

if(
!hasKline ||
!lastKlineAt
){
return;
}

const klineSilentMs =
Date.now() -
lastKlineAt;

if(
klineSilentMs <
KLINE_SILENCE_MS
){
return;
}

forceReconnect(
`kline silence ${Math.round(klineSilentMs / 1000)}s`
);

},
SILENCE_CHECK_MS
);

if(
typeof silenceTimer.unref ===
"function"
){
silenceTimer.unref();
}

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
"bybitPublic:push",
payload
);
}catch(
err
){
log.warn(
"bybit public ws push:",
err?.message ||
err
);
}

}

function handleMessage(
raw
){

let msg;

try{
msg =
JSON.parse(
String(
raw
)
);
}catch{
return;
}

if(
msg.op ===
"ping"
){
sendJson({
op:
"pong"
});
return;
}

if(
msg.op ===
"pong" ||
msg.ret_msg ===
"pong"
){
return;
}

if(
msg.op ===
"subscribe" ||
msg.op ===
"unsubscribe"
){
if(
msg.success ===
false
){
log.warn(
"bybit public ws subscribe fail:",
msg.ret_msg ||
msg
);
}
return;
}

const topic =
sanitizeBybitPublicTopic(
msg.topic
);

if(
!topic
){
return;
}

lastDataAt =
Date.now();
if(
topic.startsWith(
"kline."
)
){
lastKlineAt =
Date.now();
}
pushToRenderer({
topic,
data:
msg.data,
type:
msg.type ||
""
});

}

function scheduleReconnect(
delayMs
){

if(
reconnectTimer ||
intentionalClose ||
!wanted.size
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

function closeSocket(){

intentionalClose =
true;
clearPing();
clearSilenceWatch();

if(
reconnectTimer
){
clearTimeout(
reconnectTimer
);
reconnectTimer =
null;
}

if(
socket
){
try{
socket.terminate();
}catch{
try{
socket.close();
}catch{
/* ignore */
}
}
socket =
null;
}

intentionalClose =
false;

}

function forceReconnect(
reason
){

if(
intentionalClose ||
!socket
){
return;
}

log.warn(
"bybit public ws force reconnect:",
reason
);

try{
socket.terminate();
}catch(
err
){
log.warn(
"bybit public ws terminate:",
err?.message ||
err
);
}

}

function connect(){

const Ws =
getWs();

if(
intentionalClose ||
!wanted.size
){
return;
}

if(
isSocketBusy()
){
return;
}

const agent =
getRelayHttpsAgent();
socketUsedAgent =
!!agent;
intentionalClose =
false;
const openedAt =
Date.now();
const url =
currentWsUrl();

socket =
new Ws(
url,
wsClientOptions()
);
const thisSocket =
socket;

socket.on(
"open",
()=>{
if(
socket !==
thisSocket
){
return;
}
wsConnectFailures =
0;
lastDataAt =
Date.now();
lastKlineAt =
Date.now();
startPing();
startSilenceWatch();
subscribeTopics(
[
...wanted
]
);
log.info(
"bybit public ws connected",
{
viaProxy:
!!agent,
topics:
wanted.size
}
);
}
);

socket.on(
"message",
handleMessage
);

socket.on(
"close",
()=>{
if(
socket !==
thisSocket
){
return;
}
clearPing();
clearSilenceWatch();
socket =
null;

if(
intentionalClose
){
return;
}

const livedMs =
Date.now() -
openedAt;

if(
livedMs <
8000
){
wsConnectFailures++;
if(
wsConnectFailures >=
2
){
rotateWsUrl();
wsConnectFailures =
0;
}
}

scheduleReconnect(
livedMs <
3000
? 3500
: 2000
);

}
);

socket.on(
"error",
err=>{
if(
socket !==
thisSocket
){
return;
}
log.warn(
"bybit public ws error:",
err?.message ||
err
);
try{
thisSocket.close();
}catch{
/* ignore */
}
}
);

}

function applyTopics(
topicList,
opts =
{}
){

const next =
new Set();

for(
const raw of Array.isArray(
topicList
)
? topicList
: []
){
const topic =
sanitizeBybitPublicTopic(
raw
);
if(
topic
){
next.add(
topic
);
}
}

const added =
[
...next
].filter(
t=>
!wanted.has(
t
)
);
const removed =
[
...wanted
].filter(
t=>
!next.has(
t
)
);

wanted.clear();
for(
const topic of next
){
wanted.add(
topic
);
}

if(
!wanted.size
){
closeSocket();
return {
ok:
true,
topics:
[]
};
}

const agentNow =
!!getRelayHttpsAgent();
const reset =
!!opts.reset;

if(
reset ||
(
isSocketOpen() &&
socketUsedAgent !==
agentNow
)
){
closeSocket();
connect();
return {
ok:
true,
topics:[
...wanted
]
};
}

if(
!isSocketBusy()
){
connect();
return {
ok:
true,
topics:[
...wanted
]
};
}

if(
isSocketOpen()
){
if(
removed.length
){
unsubscribeTopics(
removed
);
}
if(
added.length
){
subscribeTopics(
[
...wanted
]
);
}
}

return {
ok:
true,
topics:[
...wanted
]
};

}

function setBybitPublicWsTarget(
webContents
){

targetWebContents =
webContents ||
null;

if(
!targetWebContents
){
closeSocket();
}

}

function probeOpenMessage(){

return socketUsedAgent
? "Прокси до тиков Bybit живой. Свечи идут напрямую."
: "WebSocket Bybit открылся напрямую.";

}

function waitForHubOpen(
timeoutMs
){

return new Promise(
resolve=>{

const started =
Date.now();

if(
isSocketOpen()
){
resolve({
ok:
true,
ms:
0
});
return;
}

const timer =
setTimeout(
()=>{
clearInterval(
poll
);
resolve({
ok:
false,
ms:
Date.now() -
started,
message:
getRelayHttpsAgent()
? "Таймаут WebSocket Bybit через прокси."
: "Таймаут WebSocket Bybit (прокси выключен)."
});
},
timeoutMs
);
const poll =
setInterval(
()=>{

if(
!isSocketOpen()
){
return;
}

clearTimeout(
timer
);
clearInterval(
poll
);
resolve({
ok:
true,
ms:
Date.now() -
started
});

},
100
);

if(
typeof poll.unref ===
"function"
){
poll.unref();
}

if(
typeof timer.unref ===
"function"
){
timer.unref();
}

}
);

}

async function probePublicWs(){

if(
isSocketOpen()
){
return {
ok:
true,
message:
probeOpenMessage(),
viaProxy:
!!socketUsedAgent,
ms:
0
};
}

if(
!wanted.size
){
applyTopics(
[
"tickers.BTCUSDT"
]
);
}else if(
!isSocketBusy()
){
connect();
}

const result =
await waitForHubOpen(
PROBE_TIMEOUT_MS
);

if(
result.ok
){
return {
ok:
true,
message:
probeOpenMessage(),
viaProxy:
!!socketUsedAgent,
ms:
result.ms
};
}

return {
ok:
false,
message:
result.message ||
"Проверка WebSocket Bybit не удалась.",
viaProxy:
!!getRelayHttpsAgent(),
ms:
result.ms ||
0
};

}

setRelayAgentCreatedHandler(
()=>{

if(
!wanted.size
){
return;
}

closeSocket();
connect();

}
);

let tickersInflight =
null;

function httpsGetJson(
url,
timeoutMs
){

return new Promise(
(
resolve,
reject
)=>{

const parsed =
new URL(
url
);
const agent =
getRelayHttpsAgent();
const req =
https.request(
{
protocol:
"https:",
hostname:
parsed.hostname,
port:
parsed.port ||
443,
path:
parsed.pathname +
parsed.search,
method:
"GET",
agent:
agent ||
undefined,
headers:{
Accept:
"application/json"
}
},
res=>{

const chunks =
[];

res.on(
"data",
chunk=>{
chunks.push(
chunk
);
}
);

res.on(
"end",
()=>{

try{
resolve(
JSON.parse(
Buffer.concat(
chunks
).toString(
"utf8"
)
)
);
}catch(
err
){
reject(
err
);
}

}
);

}
);

req.setTimeout(
timeoutMs,
()=>{
req.destroy(
new Error(
"timeout"
)
);
}
);

req.on(
"error",
reject
);
req.end();

}
);

}

async function getLinearTickersNow(){

const agent =
getRelayHttpsAgent();
const bases =
agent
? [
"https://api.bytick.com",
"https://api.bybit.com"
]
: [
"https://api.bybit.com",
"https://api.bytick.com"
];
let lastErr =
null;

for(
const base of bases
){

try{
const json =
await httpsGetJson(
`${base}/v5/market/tickers?category=linear`,
12000
);

if(
json?.retCode ===
0 &&
Array.isArray(
json.result?.list
)
){
return {
ok:
true,
list:
json.result.list
};
}

lastErr =
new Error(
json?.retMsg ||
"tickers"
);
}catch(
err
){
lastErr =
err;
}

}

return {
ok:
false,
message:
lastErr?.message ||
"tickers failed",
list:
[]
};

}

function getLinearTickers(){

if(
tickersInflight
){
return tickersInflight;
}

tickersInflight =
getLinearTickersNow().finally(
()=>{
tickersInflight =
null;
}
);

return tickersInflight;

}

function registerBybitPublicWsIpc(
ipcMain
){

handleTrustedDesktopUi(
ipcMain,
"bybitPublic:setTopics",
(
_event,
payload
)=>
applyTopics(
payload?.topics,
{
reset:
!!payload?.reset
}
)
);

handleTrustedDesktopUi(
ipcMain,
"bybitPublic:probe",
()=>
probePublicWs()
);

handleTrustedDesktopUi(
ipcMain,
"bybitPublic:getTickers",
()=>
getLinearTickers()
);

}

module.exports =
{
sanitizeBybitPublicTopic,
registerBybitPublicWsIpc,
setBybitPublicWsTarget
};
