import WebSocket from "ws";
import zlib from "zlib";

import {
normalizeAlertSymbol,
toBingxWireSymbol
} from "./exchange-symbol.js";

import {
tfToBingxInterval,
bingxIntervalToTf
} from "./bingx-intervals.js";

import {
normalizeWorkerTf
} from "./tf-normalize.js";

const WS_URL =
"wss://open-api-swap.bingx.com/swap-market";

function topicFor(
symbol,
tf
){

const interval =
tfToBingxInterval(
normalizeWorkerTf(
tf
)
);
const sym =
toBingxWireSymbol(
symbol
);

return `${sym}@kline_${interval}`;

}

function parseMessage(
raw
){

if(
Buffer.isBuffer(
raw
)
){
const buf =
raw;

if(
buf[
0
] ===
0x1f &&
buf[
1
] ===
0x8b
){
raw =
zlib.gunzipSync(
buf
);
}else{
raw =
buf.toString(
"utf8"
);
}

}else if(
raw instanceof ArrayBuffer
){
const buf =
Buffer.from(
raw
);

if(
buf[
0
] ===
0x1f &&
buf[
1
] ===
0x8b
){
raw =
zlib.gunzipSync(
buf
);
}else{
raw =
buf.toString(
"utf8"
);
}

}

return JSON.parse(
String(
raw
)
);

}

function parseCandle(
row
){

const ts =
Number(
row?.t ||
row?.T ||
row?.time ||
row?.openTime ||
0
);

if(
!ts
){
return null;
}

const sec =
ts >
1e12
? Math.floor(
ts /
1000
)
: ts;

const close =
Number(
row?.c ||
row?.close
);

if(
!Number.isFinite(
close
)
){
return null;
}

return {
time:
sec,
open:
Number(
row?.o ||
row?.open
),
high:
Number(
row?.h ||
row?.high
),
low:
Number(
row?.l ||
row?.low
),
close
};

}

export function createBingxKlineHub() {

let socket = null;
let reconnectTimer = null;
const wanted = new Set();
const listeners = new Set();

function emit(
symbol,
tf,
candle
){

for (
const fn of listeners
) {
try {
fn(
symbol,
tf,
candle
);
} catch (
err
) {
console.warn(
"bingx kline listener:",
err
);
}
}

}

function subscribeOnWire() {

if (
!socket ||
socket.readyState !== WebSocket.OPEN ||
!wanted.size
) {
return;
}

for (
const topic of wanted
) {
socket.send(
JSON.stringify({
id:
`k-${topic}`,
reqType:
"sub",
dataType:
topic
})
);
}

}

function connect() {

if (
socket &&
(
socket.readyState === WebSocket.OPEN ||
socket.readyState === WebSocket.CONNECTING
)
) {
return;
}

socket = new WebSocket(
WS_URL
);

socket.binaryType =
"nodebuffer";

socket.on(
"open",
() => {
console.log(
"bingx kline ws connected"
);
subscribeOnWire();
}
);

socket.on(
"message",
raw => {

let msg;

try {
msg =
parseMessage(
raw
);
} catch {
return;
}

if (
typeof raw ===
"string" &&
raw.trim() ===
"Ping"
) {
socket?.send(
"Pong"
);
return;
}

if (
msg?.ping
) {
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
msg?.dataType ||
""
);

if (
!dataType.includes(
"@kline_"
)
) {
return;
}

const [
bingxSym,
rest
] =
dataType.split(
"@kline_"
);
const tfLabel =
rest ||
"";
const row =
msg?.data?.kline ||
(
Array.isArray(
msg?.data
)
? msg.data[
0
]
: msg?.data
) ||
msg?.k;
const candle =
parseCandle(
row
);

if (
!candle
) {
return;
}

const symbol =
normalizeAlertSymbol(
bingxSym.replace(
/-/g,
""
)
);

emit(
symbol,
bingxIntervalToTf(
tfLabel
),
candle
);

}
);

socket.on(
"close",
() => {
console.warn(
"bingx kline ws closed, reconnect in 3s"
);
socket = null;

if (
reconnectTimer
) {
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
err => {
console.warn(
"bingx kline ws error:",
err.message
);
}
);

}

return {

onKline(
fn
) {
listeners.add(
fn
);
return () =>
listeners.delete(
fn
);
},

ensureKline(
symbol,
tf
) {

const topic =
topicFor(
symbol,
tf
);

if (
!topic ||
wanted.has(
topic
)
) {
return;
}

wanted.add(
topic
);
connect();
subscribeOnWire();

},

close() {

if (
reconnectTimer
) {
clearTimeout(
reconnectTimer
);
}

socket?.close();
socket = null;

}

};

}
