import {
getBybitWsUrl,
rotateBybitWsEndpoint
} from "./bybit-fetch.js?v=10";

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

function convertTf(tf){

if(tf === "D"){
return "D";
}

return tf;

}

function topicFor(symbol, tf){

return `kline.${convertTf(tf)}.${symbol}`;

}

function parseCandle(raw){

return {

time:Number(raw.start) / 1000,

open:Number(raw.open),

high:Number(raw.high),

low:Number(raw.low),

close:Number(raw.close)

};

}

function resubscribeAll(){

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

if(
!msg.topic ||
!msg.data?.[0]
){
return;
}

const callbacks =
topicCallbacks.get(msg.topic);

if(!callbacks?.size){
return;
}

const candle =
parseCandle(msg.data[0]);

pendingCandleByTopic.set(
msg.topic,
candle
);

scheduleKlineFlush();

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

pendingCandleByTopic.clear();

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
