/**
 * Bybit public kline WebSocket for algo bot (linear).
 */
const log =
require(
"electron-log"
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

function subscribeOnWire(){

if(
!socket ||
socket.readyState !==
getWs().OPEN ||
!wanted.size
){
return;
}

const chunks =
chunkArgs(
[
...wanted
],
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

socket =
new Ws(
WS_URL
);

socket.on(
"open",
()=>{
log.info(
"algo bybit kline ws connected"
);
startPing();
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
"pong" ||
msg.op ===
"subscribe" ||
msg.op ===
"unsubscribe"
){
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
connect();
subscribeOnWire();

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

for(
const topic of wanted
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

for(
const topic of next
){
wanted.add(
topic
);
}

if(
wanted.size
){
intentionalClose =
false;
connect();
subscribeOnWire();
}else if(
socket
){
intentionalClose =
true;
clearPing();

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
clearPing();

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
