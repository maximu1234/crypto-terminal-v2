import WebSocket from "ws";
import zlib from "zlib";

import {
normalizeAlertSymbol,
toBingxWireSymbol
} from "./exchange-symbol.js";

const WS_URL =
"wss://open-api-swap.bingx.com/swap-market";

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

export function createBingxTickerHub() {

let socket = null;
let reconnectTimer = null;
const wanted = new Set();
const lastPrice = new Map();
const listeners = new Set();
let lastTickAt = 0;
let tickCount = 0;

function emit(
symbol,
price
) {

const prev =
lastPrice.get(
symbol
);

if (
prev === price
) {
return;
}

lastPrice.set(
symbol,
price
);
lastTickAt = Date.now();
tickCount += 1;

for (
const fn of listeners
) {
try {
fn(
symbol,
price,
prev
);
} catch (
err
) {
console.warn(
"bingx ticker listener:",
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
const sym of wanted
) {
socket.send(
JSON.stringify({
id:
`t-${sym}`,
reqType:
"sub",
dataType:
`${sym}@ticker`
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
"bingx ticker ws connected"
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
!dataType.endsWith(
"@ticker"
)
) {
return;
}

const bingxSym =
dataType.replace(
"@ticker",
""
);
const row =
msg?.data ||
msg;
const price =
Number(
row?.lastPrice ||
row?.c ||
row?.close ||
0
);

if (
!Number.isFinite(
price
) ||
price <=
0
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
price
);

}
);

socket.on(
"close",
() => {
console.warn(
"bingx ticker ws closed, reconnect in 3s"
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
"bingx ticker ws error:",
err.message
);
}
);

}

return {

onTick(
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

ensureSymbol(
symbol
) {

const sym =
toBingxWireSymbol(
symbol
);

if (
!sym ||
wanted.has(
sym
)
) {
return;
}

wanted.add(
sym
);
connect();
subscribeOnWire();

},

getLastPrice(
symbol
) {
return lastPrice.get(
normalizeAlertSymbol(
symbol
)
);
},

getStats() {
return {
symbols:
wanted.size,
lastTickAt:
lastTickAt || null,
tickCount
};
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
