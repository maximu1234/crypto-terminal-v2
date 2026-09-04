/**
 * BingX public WebSocket (USDT-M swap-market).
 */
import {
getBingxWsUrl
} from "./fetch.js?v=5";

import {
toBingxSymbol
} from "../symbol.js?v=1";

import {
tfToBingxInterval
} from "./intervals.js?v=1";

import {
queueKlineByTime,
takeQueuedKlinesSorted
} from "../../chart/live-bar-roll.js?v=2";

let socket =
null;

let reconnectTimer =
null;

let intentionalClose =
false;

/** @type {Map<string, Set<Function>>} */
const topicCallbacks =
new Map();

/** @type {Set<string>} */
const activeTopics =
new Set();

const KLINE_FLUSH_MS =
120;

const pendingCandleByTopic =
new Map();

let klineFlushTimer =
null;

function scheduleKlineFlush(){

if(
klineFlushTimer
){
return;
}

klineFlushTimer =
setTimeout(
flushPendingKlines,
KLINE_FLUSH_MS
);

}

function flushPendingKlines(){

klineFlushTimer =
null;

if(
!pendingCandleByTopic.size
){
return;
}

const batches =
takeQueuedKlinesSorted(
pendingCandleByTopic
);

for(
const {
topic,
candles
} of
batches
){

const callbacks =
topicCallbacks.get(
topic
);

if(
!callbacks?.size
){
continue;
}

for(
const candle of
candles
){
callbacks.forEach(
fn=>{
try{
fn(
candle
);
}catch(
err
){
console.warn(
"bingx kline listener:",
err
);
}
}
);
}

}

}

function klineTopic(
symbol,
tf
){

return `kline:${toBingxSymbol(
symbol
)}:${tfToBingxInterval(
tf
)}`;

}

function tickerTopic(
symbol
){

return `ticker:${toBingxSymbol(
symbol
)}`;

}

export function extractKlineRow(
msg
){

const raw =
msg?.data;

if(
Array.isArray(
raw
)
){
return raw[
0
] ||
null;
}

return (
raw?.kline ||
raw ||
msg?.k ||
null
);

}

export function extractKlineRows(
msg
){

const raw =
msg?.data;

if(
Array.isArray(
raw
)
){
return raw.filter(
Boolean
);
}

const row =
extractKlineRow(
msg
);

return row
? [
row
]
: [];

}

export function extractKlineTimestamp(
row
){

return Number(
row?.t ||
row?.T ||
row?.time ||
row?.openTime ||
0
);

}

function candleFromBingxRow(
row
){

if(
!row
){
return null;
}

const ts =
extractKlineTimestamp(
row
);
const sec =
ts >
1e12
? Math.floor(
ts /
1000
)
: ts;

return {
time:
sec,
open:
Number(
row.o ||
row.open
),
high:
Number(
row.h ||
row.high
),
low:
Number(
row.l ||
row.low
),
close:
Number(
row.c ||
row.close
),
volume:
Number(
row.v ||
row.volume ||
0
) ||
0
};

}

function handleSocketPing(
raw
){

const text =
typeof raw ===
"string"
? raw.trim()
: "";

if(
text ===
"Ping"
){
socket?.send(
"Pong"
);
return true;
}

return false;

}

async function parseMessage(
data
){

if(
typeof data ===
"string" &&
handleSocketPing(
data
)
){
return null;
}

if(
typeof data ===
"string"
){
return JSON.parse(
data
);
}

if(
data instanceof ArrayBuffer
){
const bytes =
new Uint8Array(
data
);

if(
bytes[
0
] ===
0x1f &&
bytes[
1
] ===
0x8b
){
const stream =
new Blob([
data
]).stream().pipeThrough(
new DecompressionStream(
"gzip"
)
);
const text =
await new Response(
stream
).text();
return JSON.parse(
text
);
}

return JSON.parse(
new TextDecoder().decode(
data
)
);

}

return null;

}

function subscribeTopic(
dataType
){

if(
!socket ||
socket.readyState !==
WebSocket.OPEN
){
return;
}

socket.send(
JSON.stringify({
id:
crypto.randomUUID?.() ||
String(
Date.now()
),
reqType:
"sub",
dataType
})
);

}

function addTopic(
topic,
dataType
){

activeTopics.add(
topic
);

if(
dataType
){
subscribeTopic(
dataType
);
}

}

function removeTopic(
topic
){

activeTopics.delete(
topic
);

}

function scheduleReconnect(){

if(
reconnectTimer
){
return;
}

reconnectTimer =
setTimeout(
()=>{

reconnectTimer =
null;

if(
activeTopics.size
){
ensureSocket();
}

},
1500
);

}

function resubscribeAll(){

if(
!socket ||
socket.readyState !==
WebSocket.OPEN
){
return;
}

activeTopics.forEach(
topic=>{

const parts =
topic.split(
":"
);

if(
parts[
0
] ===
"kline" &&
parts.length >=
3
){
subscribeTopic(
`${parts[
1
]}@kline_${parts[
2
]}`
);
return;
}

if(
parts[
0
] ===
"ticker" &&
parts[
1
]
){
subscribeTopic(
`${parts[
1
]}@ticker`
);
}

}
);

}

function ensureSocket(){

if(
socket &&
(
socket.readyState ===
WebSocket.OPEN ||
socket.readyState ===
WebSocket.CONNECTING
)
){
return;
}

intentionalClose =
false;

socket =
new WebSocket(
getBingxWsUrl()
);

socket.binaryType =
"arraybuffer";

socket.onopen =
()=>{
resubscribeAll();
};

socket.onmessage =
async event=>{

if(
handleSocketPing(
event.data
)
){
return;
}

let msg =
null;

try{
msg =
await parseMessage(
event.data
);
}catch{
return;
}

if(
!msg
){
return;
}

if(
msg.ping
){
socket?.send(
JSON.stringify({
pong:
msg.ping
})
);
return;
}

const dataType =
String(
msg.dataType ||
""
);

if(
dataType.includes(
"@kline_"
)
){

const [
bingxSym,
rest
] =
dataType.split(
"@kline_"
);
const topic =
`kline:${bingxSym}:${rest}`;
const rows =
extractKlineRows(
msg
);

for(
const row of
rows
){
const candle =
candleFromBingxRow(
row
);

if(
!candle
){
continue;
}

queueKlineByTime(
pendingCandleByTopic,
topic,
candle
);
}

if(
rows.length
){
scheduleKlineFlush();
}

return;

}

if(
dataType.endsWith(
"@ticker"
)
){

const bingxSym =
dataType.replace(
"@ticker",
""
);
const topic =
`ticker:${bingxSym}`;
const row =
msg?.data ||
msg;
const price =
Number(
row.lastPrice ||
row.c ||
row.close ||
0
);

if(
!Number.isFinite(
price
) ||
price <=
0
){
return;
}

const callbacks =
topicCallbacks.get(
topic
);

if(
!callbacks?.size
){
return;
}

const tick =
{
markPrice:
price
};

callbacks.forEach(
fn=>{
fn(
tick
);
}
);

}

};

socket.onclose =
()=>{

socket =
null;

if(
intentionalClose
){
return;
}

scheduleReconnect();

};

socket.onerror =
()=>{

try{
socket?.close();
}catch{
/* ignore */
}

};

}

export function resetBingxWs(){

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
intentionalClose =
true;
socket.close();
socket =
null;
intentionalClose =
false;
}

if(
activeTopics.size
){
ensureSocket();
}

}

export function shutdownBingxWs(){

if(
reconnectTimer
){
clearTimeout(
reconnectTimer
);
reconnectTimer =
null;
}

topicCallbacks.clear();
activeTopics.clear();
pendingCandleByTopic.clear();

if(
socket
){
intentionalClose =
true;
socket.close();
socket =
null;
intentionalClose =
false;
}

}

export function subscribeBingxKline(
symbol,
tf,
onCandle
){

const topic =
klineTopic(
symbol,
tf
);
const dataType =
`${toBingxSymbol(
symbol
)}@kline_${tfToBingxInterval(
tf
)}`;

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
topic,
dataType
);
}

topicCallbacks.get(
topic
).add(
onCandle
);
ensureSocket();

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
onCandle
);

if(
!set.size
){
topicCallbacks.delete(
topic
);
removeTopic(
topic
);
}

};

}

export function subscribeBingxTicker(
symbol,
onTick
){

const topic =
tickerTopic(
symbol
);
const dataType =
`${toBingxSymbol(
symbol
)}@ticker`;

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
topic,
dataType
);
}

topicCallbacks.get(
topic
).add(
onTick
);
ensureSocket();

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
topicCallbacks.delete(
topic
);
removeTopic(
topic
);
}

};

}

export function connectBingxKlineStream({
symbol,
tf,
onCandle
}){

return subscribeBingxKline(
symbol,
tf,
onCandle
);

}

export function disconnectBingxKlineStream(){

shutdownBingxWs();

}
