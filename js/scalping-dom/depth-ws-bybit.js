/**
 * Bybit public orderbook WS (plugin-local).
 * Topic: orderbook.1000.{SYMBOL} — full L2 for compressed densities (cScalp / Vataga).
 * Snapshot/deltas stay in the depth worker; the UI paints only the visible slice.
 * URL comes from the host (main thread) so this module can run in a Worker.
 */
export const BYBIT_DOM_DEPTH =
1000;

const DEPTH =
BYBIT_DOM_DEPTH;

const RECONNECT_MS =
2000;

const RECONNECT_MAX_MS =
15000;

function topicFor(
symbol
){

return `orderbook.${DEPTH}.${symbol}`;

}

/**
 * @param {{
 *   onSnapshot: (data: object) => void,
 *   onDelta: (data: object) => void,
 *   onStatus?: (text: string) => void,
 *   onOpen?: () => void,
 *   onClose?: () => void,
 *   getWsUrl?: () => string,
 *   onRotateEndpoint?: () => void
 * }} handlers
 */
export function createBybitDepthWs(
handlers
){

let socket =
null;
let symbol =
"";
let topic =
"";
let intentionalClose =
false;
let reconnectTimer =
null;
let shortFails =
0;

function clearReconnect(){

if(
reconnectTimer !=
null
){
clearTimeout(
reconnectTimer
);
reconnectTimer =
null;
}

}

function sendSubscribe(){

if(
!socket ||
socket.readyState !==
WebSocket.OPEN ||
!topic
){
return;
}

socket.send(
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

}

function sendUnsubscribe(
prevTopic
){

if(
!socket ||
socket.readyState !==
WebSocket.OPEN ||
!prevTopic
){
return;
}

try{
socket.send(
JSON.stringify(
{
op:
"unsubscribe",
args:[
prevTopic
]
}
)
);
}catch{
/* ignore */
}

}

function scheduleReconnect(
delayMs
){

clearReconnect();

if(
intentionalClose
){
return;
}

const delay =
Math.max(
RECONNECT_MS,
Math.min(
RECONNECT_MAX_MS,
Number(
delayMs
) ||
RECONNECT_MS
)
);

reconnectTimer =
setTimeout(
()=>{
reconnectTimer =
null;
connect();
},
delay
);

}

function handleMessage(
raw
){

if(
typeof Blob !==
"undefined" &&
raw instanceof
Blob
){
raw.text().then(
handleMessage
).catch(
()=>{}
);
return;
}

if(
raw instanceof
ArrayBuffer
){
handleMessage(
new TextDecoder().decode(
raw
)
);
return;
}

if(
typeof raw !==
"string"
){
return;
}

let msg;

try{
msg =
JSON.parse(
raw
);
}catch{
return;
}

if(
msg?.op ===
"ping"
){
try{
socket?.send(
JSON.stringify(
{
op:
"pong"
}
)
);
}catch{
/* ignore */
}
return;
}

if(
msg?.op ===
"pong" ||
msg?.success ===
true
){
return;
}

const msgTopic =
String(
msg?.topic ||
""
);

if(
!msgTopic ||
msgTopic !==
topic
){
return;
}

const data =
msg?.data;

if(
!data
){
return;
}

const type =
String(
msg?.type ||
""
).toLowerCase();

if(
type ===
"snapshot"
){
handlers.onSnapshot?.(
data
);
return;
}

if(
type ===
"delta"
){
handlers.onDelta?.(
data
);
}

}

function connect(){

clearReconnect();

if(
!symbol
){
return;
}

intentionalClose =
false;

const prev =
socket;

socket =
null;

if(
prev
){
prev.onopen =
null;
prev.onmessage =
null;
prev.onerror =
null;
prev.onclose =
null;

try{
prev.close();
}catch{
/* ignore */
}

}

const url =
String(
handlers.getWsUrl?.() ||
""
).trim();

if(
!url
){
handlers.onStatus?.(
"WS Bybit: нет URL"
);
scheduleReconnect();
return;
}

let ws;

try{
ws =
new WebSocket(
url
);
}catch(
err
){
handlers.onStatus?.(
"WS Bybit: нет соединения"
);
scheduleReconnect();
return;
}

socket =
ws;
ws.binaryType =
"arraybuffer";
const openedAt =
Date.now();

ws.onopen =
()=>{
shortFails =
0;
handlers.onStatus?.(
""
);
handlers.onOpen?.();
sendSubscribe();
};

ws.onmessage =
e=>{
handleMessage(
e.data
);
};

ws.onerror =
()=>{
handlers.onStatus?.(
"WS Bybit: ошибка"
);
};

ws.onclose =
()=>{
handlers.onClose?.();

if(
intentionalClose
){
return;
}

const lived =
Date.now() -
openedAt;
let delay =
RECONNECT_MS;

if(
lived <
3000
){
shortFails +=
1;
delay =
Math.min(
RECONNECT_MAX_MS,
RECONNECT_MS *
(
2 **
Math.min(
shortFails -
1,
3
)
)
);

if(
shortFails >=
2
){
handlers.onRotateEndpoint?.();
shortFails =
0;
}

}

scheduleReconnect(
delay
);
};

}

function setSymbol(
nextSymbol
){

const sym =
String(
nextSymbol ||
""
).trim().toUpperCase();

if(
!sym
){
return;
}

if(
sym ===
symbol &&
socket?.readyState ===
WebSocket.OPEN
){
return;
}

const prev =
topic;
symbol =
sym;
topic =
topicFor(
sym
);

if(
socket?.readyState ===
WebSocket.OPEN
){
sendUnsubscribe(
prev
);
sendSubscribe();
return;
}

connect();

}

function start(
nextSymbol
){

intentionalClose =
false;
setSymbol(
nextSymbol
);

if(
!socket ||
socket.readyState ===
WebSocket.CLOSED
){
connect();
}

}

function stop(){

intentionalClose =
true;
clearReconnect();
sendUnsubscribe(
topic
);

try{
socket?.close();
}catch{
/* ignore */
}

socket =
null;
symbol =
"";
topic =
"";

}

return {
start,
setSymbol,
stop,
isOpen:()=>
socket?.readyState ===
WebSocket.OPEN
};

}
