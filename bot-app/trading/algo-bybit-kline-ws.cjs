/**
 * Bybit public kline WebSocket for algo bot (linear).
 */
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

const WS_URL =
"wss://stream.bybit.com/v5/public/linear";
const PING_MS =
20000;
const SUBSCRIBE_CHUNK =
10;
/*
 * Cafe/VPN half-open sockets often stay OPEN and answer ping/pong while
 * kline frames stop. Watch last *kline* (not pong) and force reconnect.
 */
const SILENCE_MS =
90_000;
const SILENCE_CHECK_MS =
15_000;

function normalizeSymbol(
symbol
){

return String(
symbol ||
""
).replace(
/\.P$/i,
""
).trim().toUpperCase();

}

function normalizeTf(
tf
){

if(
tf ==
null ||
tf ===
""
){
return "60";
}

const s =
String(
tf
).trim();
const aliases =
{
"1m":
"1",
"5m":
"5",
"15m":
"15",
"1h":
"60",
"4h":
"240",
"1d":
"D",
"1w":
"W"
};

return aliases[
s.toLowerCase()
] ||
s;

}

function topicFor(
symbol,
tf
){

return `kline.${normalizeTf(
tf
)}.${normalizeSymbol(
symbol
)}`;

}

function parseCandle(
raw
){

return {
time:
Number(
raw.start
) /
1000,
open:
Number(
raw.open
),
high:
Number(
raw.high
),
low:
Number(
raw.low
),
close:
Number(
raw.close
),
confirm:
raw.confirm ===
true
};

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

function createAlgoBybitKlineHub(){

/** @type {import('ws')|null} */
let socket =
null;
let reconnectTimer =
null;
let pingTimer =
null;
let intentionalClose =
false;
let everConnected =
false;
/** @type {(() => void)|null} */
let onReconnect =
null;
/** Last inbound kline frame (ms). Pong alone must not reset this. */
let lastKlineAt =
0;
let silenceTimer =
null;
const wanted =
new Set();
const listeners =
new Set();

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

function noteKline(){

lastKlineAt =
Date.now();

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
"algo bybit kline ws force reconnect:",
reason,
{
topics:
wanted.size,
silentMs:
lastKlineAt
? Date.now() -
lastKlineAt
: null
}
);

try{
socket.terminate();
}catch(
err
){
log.warn(
"algo bybit kline terminate:",
err?.message ||
err
);
}

}

function startSilenceWatch(){

clearSilenceWatch();
silenceTimer =
setInterval(
()=>{

if(
intentionalClose ||
!wanted.size
){
return;
}

if(
!socket ||
socket.readyState !==
getWs().OPEN
){
return;
}

if(
!lastKlineAt
){
return;
}

const silentMs =
Date.now() -
lastKlineAt;

if(
silentMs <
SILENCE_MS
){
return;
}

forceReconnect(
`silence ${Math.round(
silentMs /
1000
)}s`
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

function startPing(){

clearPing();

pingTimer =
setInterval(
()=>{

if(
!socket ||
socket.readyState !==
getWs().OPEN
){
return;
}

try{
socket.send(
JSON.stringify({
op:
"ping"
})
);
}catch(
err
){
log.warn(
"algo bybit kline ping:",
err?.message ||
err
);
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

}

function emit(
symbol,
tf,
candle
){

for(
const fn of listeners
){
try{
fn(
symbol,
tf,
candle
);
}catch(
err
){
log.warn(
"algo kline listener:",
err?.message ||
err
);
}
}

}

function subscribeTopics(
topicList
){

if(
!socket ||
socket.readyState !==
getWs().OPEN
){
return;
}

const list =
(
Array.isArray(
topicList
)
? topicList
: []
).filter(
Boolean
);

if(
!list.length
){
return;
}

const chunks =
chunkArgs(
list,
SUBSCRIBE_CHUNK
);

for(
const args of chunks
){
socket.send(
JSON.stringify(
{
op:
"subscribe",
args
}
)
);
}

}

function subscribeOnWire(){

if(
!wanted.size
){
return;
}

subscribeTopics(
[
...wanted
]
);

}

function connect(){

const Ws =
getWs();

if(
intentionalClose
){
return;
}

if(
socket &&
(
socket.readyState ===
Ws.OPEN ||
socket.readyState ===
Ws.CONNECTING
)
){
return;
}

const agent =
getRelayHttpsAgent();

socket =
agent
? new Ws(
WS_URL,
{
agent
}
)
: new Ws(
WS_URL
);

socket.on(
"open",
()=>{
log.info(
"algo bybit kline ws connected"
);
lastKlineAt =
Date.now();
startPing();
startSilenceWatch();
subscribeOnWire();

if(
everConnected &&
typeof onReconnect ===
"function"
){
try{
onReconnect();
}catch(
err
){
log.warn(
"algo bybit kline onReconnect:",
err?.message ||
err
);
}
}

everConnected =
true;
}
);

socket.on(
"message",
raw=>{

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
socket?.send?.(
JSON.stringify({
op:
"pong"
})
);
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
"algo bybit kline subscribe fail:",
msg.ret_msg ||
msg
);
}
return;
}

const topic =
msg.topic ||
"";

if(
!topic.startsWith(
"kline."
)
){
return;
}

const parts =
topic.split(
"."
);
const tf =
parts[
1
];
const symbol =
normalizeSymbol(
parts[
2
]
);
const row =
Array.isArray(
msg.data
)
? msg.data[
0
]
: msg.data;

if(
!symbol ||
!row
){
return;
}

noteKline();
emit(
symbol,
tf,
parseCandle(
row
)
);

}
);

socket.on(
"close",
()=>{
clearPing();
clearSilenceWatch();
socket =
null;

if(
intentionalClose
){
return;
}

log.warn(
"algo bybit kline ws closed, reconnect in 3s"
);

if(
reconnectTimer
){
clearTimeout(
reconnectTimer
);
}

reconnectTimer =
setTimeout(
connect,
3000
);

}
);

socket.on(
"error",
err=>{
log.warn(
"algo bybit kline ws error:",
err?.message ||
err
);
}
);

}

return {

onKline(
fn
){
listeners.add(
fn
);
return ()=>{
listeners.delete(
fn
);
};
},

setOnReconnect(
fn
){
onReconnect =
typeof fn ===
"function"
? fn
: null;
},

ensureKline(
symbol,
tf
){

const sym =
normalizeSymbol(
symbol
);

if(
!sym
){
return;
}

const topic =
topicFor(
sym,
tf
);

if(
wanted.has(
topic
)
){
return;
}

wanted.add(
topic
);
intentionalClose =
false;
const wasOpen =
!!(
socket &&
socket.readyState ===
getWs().OPEN
);
connect();

if(
wasOpen
){
subscribeTopics(
[
topic
]
);
}

},

releaseKline(
symbol,
tf
){

const topic =
topicFor(
symbol,
tf
);

wanted.delete(
topic
);

if(
socket &&
socket.readyState ===
getWs().OPEN &&
topic
){
socket.send(
JSON.stringify(
{
op:
"unsubscribe",
args:[
topic
]
}
)
);
}

},

syncTopics(
symbols,
tf
){

const next =
new Set();

for(
const raw of Array.isArray(
symbols
)
? symbols
: []
){

const sym =
normalizeSymbol(
raw
);

if(
!sym
){
continue;
}

next.add(
topicFor(
sym,
tf
)
);

}

const added =
[];

for(
const topic of next
){
if(
!wanted.has(
topic
)
){
added.push(
topic
);
}
wanted.add(
topic
);
}

for(
const topic of [
...wanted
]
){
if(
!next.has(
topic
)
){
wanted.delete(
topic
);
}
}

if(
wanted.size
){
intentionalClose =
false;
const wasOpen =
!!(
socket &&
socket.readyState ===
getWs().OPEN
);
connect();

if(
wasOpen &&
added.length
){
subscribeTopics(
added
);
}
}else if(
socket
){
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

socket.close();
socket =
null;
}

},

close(){

intentionalClose =
true;
everConnected =
false;
lastKlineAt =
0;
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

socket?.close();
socket =
null;
wanted.clear();
onReconnect =
null;

}

};

}

module.exports =
{
createAlgoBybitKlineHub,
normalizeSymbol,
normalizeTf
};
