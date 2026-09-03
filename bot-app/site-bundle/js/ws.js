import {
getBybitWsUrl,
rotateBybitWsEndpoint
} from "./bybit-fetch.js?v=18";

let socket = null;

let reconnectTimer = null;

let intentionalClose = false;

const topicCallbacks = new Map();

const activeTopics = new Set();

let terminalUnsub = null;

let wsConnectFailures = 0;

/** Слияние тиков в один callback на топик (~8/s вместо сотен). */
const KLINE_FLUSH_MS =
120;

const pendingCandleByTopic =
new Map();

let klineFlushTimer =
null;

function scheduleKlineFlush(){

if(klineFlushTimer){
return;
}

klineFlushTimer =
setTimeout(
flushPendingKlines,
KLINE_FLUSH_MS
);

}

function flushPendingKlines(){

klineFlushTimer = null;

if(!pendingCandleByTopic.size){
return;
}

pendingCandleByTopic.forEach(
(
candle,
topic
)=>{

const callbacks =
topicCallbacks.get(topic);

if(!callbacks?.size){
return;
}

callbacks.forEach(fn=>{
fn(candle);
});

}
);

pendingCandleByTopic.clear();

}

const lastTickerRawByTopic =
new Map();

let desktopPushUnsub =
null;

let desktopTopicsTimer =
null;

function canonicalWsSymbol(
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

function hasDesktopPublicWs(){

return typeof window !==
"undefined" &&
typeof window.cryptoTerminalDesktop?.bybitPublicWs?.setTopics ===
"function";

}

function handlePublicMessage(
msg
){

if(
!msg?.topic
){
return;
}

const callbacks =
topicCallbacks.get(
msg.topic
);

if(
!callbacks?.size
){
return;
}

if(
msg.topic.startsWith(
"kline."
)
){

const row =
Array.isArray(
msg.data
)
? msg.data[
0
]
: msg.data;

if(
!row
){
return;
}

const candle =
parseCandle(
row
);

pendingCandleByTopic.set(
msg.topic,
candle
);

scheduleKlineFlush();
return;

}

if(
msg.topic.startsWith(
"tickers."
)
){

const raw =
Array.isArray(
msg.data
)
? msg.data[
msg.data.length -
1
]
: msg.data;

const tick =
parseTicker(
mergeTickerRaw(
msg.topic,
raw
)
);

if(
!tick.markPrice
){
return;
}

callbacks.forEach(
fn=>{
fn(
tick
);
}
);

}

}

function mergeTickerRaw(
topic,
raw
){

if(
!raw ||
typeof raw !==
"object" ||
Array.isArray(
raw
)
){
return raw;
}

const prev =
lastTickerRawByTopic.get(
topic
);
const next =
prev &&
typeof prev ===
"object"
? {
...prev,
...raw
}
: {
...raw
};

lastTickerRawByTopic.set(
topic,
next
);
return next;

}

function bindDesktopPublicWs(){

if(
desktopPushUnsub ||
!hasDesktopPublicWs()
){
return;
}

const onPush =
window.cryptoTerminalDesktop.bybitPublicWs.onPush;

if(
typeof onPush !==
"function"
){
return;
}

desktopPushUnsub =
onPush(
payload=>{
handlePublicMessage(
payload
);
}
);

}

function syncDesktopTopics(
opts
){

if(
!hasDesktopPublicWs()
){
return;
}

bindDesktopPublicWs();

if(
desktopTopicsTimer
){
clearTimeout(
desktopTopicsTimer
);
}

desktopTopicsTimer =
setTimeout(
()=>{
desktopTopicsTimer =
null;
void window.cryptoTerminalDesktop.bybitPublicWs.setTopics(
[
...activeTopics
],
opts
).then(
result=>{
if(
result &&
result.ok ===
false
){
console.warn(
"bybit public ws:",
result.message ||
result
);
}
}
);
},
0
);

}

function convertTf(tf){

if(tf === "D"){
return "D";
}

if(tf === "W"){
return "W";
}

return tf;

}

function topicFor(symbol, tf){

return `kline.${convertTf(tf)}.${canonicalWsSymbol(symbol)}`;

}

function parseCandle(raw){

return {

time:Number(raw.start) / 1000,

open:Number(raw.open),

high:Number(raw.high),

low:Number(raw.low),

close:Number(raw.close),

volume:Number(raw.volume) || 0

};

}

function parseTicker(raw){

const mark =
Number(
raw?.markPrice
);
const last =
Number(
raw?.lastPrice
);

return {
markPrice:
Number.isFinite(
mark
) &&
mark >
0
? mark
: (
Number.isFinite(
last
) &&
last >
0
? last
: null
),
lastPrice:
Number.isFinite(
last
) &&
last >
0
? last
: (
Number.isFinite(
mark
) &&
mark >
0
? mark
: null
)
};

}

function tickerTopicFor(
symbol
){

return `tickers.${canonicalWsSymbol(
symbol
)}`;

}

function resubscribeAll(){

if(
hasDesktopPublicWs()
){
syncDesktopTopics();
return;
}

if(
!socket ||
socket.readyState !== WebSocket.OPEN ||
!activeTopics.size
){
return;
}

socket.send(JSON.stringify({

op:"subscribe",

args:[...activeTopics]

}));

}

function scheduleReconnect(delayMs){

if(reconnectTimer){
return;
}

reconnectTimer =
setTimeout(()=>{

reconnectTimer = null;

if(activeTopics.size){
ensureSocket();
}

},
delayMs
);

}

function ensureSocket(){

if(
hasDesktopPublicWs()
){
syncDesktopTopics();
return;
}

if(
socket &&
(
socket.readyState === WebSocket.OPEN ||
socket.readyState === WebSocket.CONNECTING
)
){
return;
}

intentionalClose = false;

const wsUrl =
getBybitWsUrl();
const openedAt =
Date.now();

socket =
new WebSocket(wsUrl);

socket.onopen = ()=>{

wsConnectFailures = 0;
resubscribeAll();

};

socket.onmessage = event=>{

const msg =
JSON.parse(event.data);

handlePublicMessage(
msg
);

};

socket.onclose = ()=>{

const livedMs =
Date.now() - openedAt;

socket = null;

if(intentionalClose){
return;
}

if(
livedMs < 8000
){
wsConnectFailures++;

if(
wsConnectFailures >= 2
){
rotateBybitWsEndpoint();
wsConnectFailures = 0;
}
}

scheduleReconnect(
livedMs < 3000
? 3500
: 2000
);

};

socket.onerror = ()=>{
socket?.close();
};

}

function addTopic(topic){

if(activeTopics.has(topic)){
return;
}

activeTopics.add(topic);

if(
hasDesktopPublicWs()
){
syncDesktopTopics();
return;
}

ensureSocket();

if(
socket &&
socket.readyState === WebSocket.OPEN
){
socket.send(JSON.stringify({

op:"subscribe",

args:[topic]

}));
}

}

function removeTopic(topic){

if(!activeTopics.has(topic)){
return;
}

activeTopics.delete(topic);
topicCallbacks.delete(topic);
lastTickerRawByTopic.delete(
topic
);

if(
hasDesktopPublicWs()
){
syncDesktopTopics();
return;
}

if(
socket &&
socket.readyState === WebSocket.OPEN
){
socket.send(JSON.stringify({

op:"unsubscribe",

args:[topic]

}));
}

if(!activeTopics.size){
disconnectSocket();
}

}

function disconnectSocket(){

if(reconnectTimer){

clearTimeout(reconnectTimer);

reconnectTimer = null;

}

if(klineFlushTimer){

clearTimeout(klineFlushTimer);

klineFlushTimer = null;

}

if(
desktopTopicsTimer
){
clearTimeout(
desktopTopicsTimer
);
desktopTopicsTimer =
null;
}

pendingCandleByTopic.clear();
lastTickerRawByTopic.clear();

if(
hasDesktopPublicWs()
){
void window.cryptoTerminalDesktop.bybitPublicWs.setTopics(
[]
);
return;
}

if(socket){

intentionalClose = true;

socket.close();

socket = null;

}

}

window.addEventListener(
"bybit-ws-reset",
()=>{

wsConnectFailures = 0;

if(reconnectTimer){
clearTimeout(reconnectTimer);
reconnectTimer = null;
}

if(
hasDesktopPublicWs()
){
syncDesktopTopics({
reset:
true
});
return;
}

if(socket){
intentionalClose = true;
socket.close();
socket = null;
intentionalClose = false;
}

if(activeTopics.size){
ensureSocket();
}

}
);

export function subscribeKline(symbol, tf, onCandle){

const topic =
topicFor(symbol, tf);

if(!topicCallbacks.has(topic)){

topicCallbacks.set(topic, new Set());
addTopic(topic);

}

topicCallbacks.get(topic).add(onCandle);

return ()=>{

const set =
topicCallbacks.get(topic);

if(!set){
return;
}

set.delete(onCandle);

if(!set.size){
removeTopic(topic);
}

};

}

export function subscribeTicker(
symbol,
onTick
){

const topic =
tickerTopicFor(
symbol
);

if(
!topicCallbacks.has(
topic
)
){

topicCallbacks.set(
topic,
new Set()
);
addTopic(
topic
);

}

topicCallbacks.get(
topic
).add(
onTick
);

return ()=>{

const set =
topicCallbacks.get(
topic
);

if(
!set
){
return;
}

set.delete(
onTick
);

if(
!set.size
){
removeTopic(
topic
);
}

};

}

export function connectKlineStream({

symbol,
tf,
onCandle

}){

const prevUnsub =
terminalUnsub;

terminalUnsub =
subscribeKline(symbol, tf, onCandle);

if(
prevUnsub
){

prevUnsub();

}

}

export function disconnectKlineStream(){

if(terminalUnsub){

terminalUnsub();

terminalUnsub = null;

}

}
