/**
 * BingX public depth WS (plugin-local).
 * dataType: {SYMBOL}@depth100 on swap-market (gzip + Ping/Pong).
 */
import {
toBingxSymbol
} from "../exchanges/symbol.js?v=1";

const DEFAULT_BINGX_WS_URL =
"wss://open-api-swap.bingx.com/swap-market";

const DEPTH =
100;

const RECONNECT_MS =
1500;

function dataTypeFor(
symbol
){

return `${toBingxSymbol(symbol)}@depth${DEPTH}`;

}

function makeId(){

return (
crypto.randomUUID?.() ||
String(
Date.now()
)
);

}

async function parseMessage(
data
){

if(
typeof data ===
"string"
){
const text =
data.trim();

if(
text ===
"Ping"
){
return {
ping:
true
};
}

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

if(
text.trim() ===
"Ping"
){
return {
ping:
true
};
}

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

function normalizeDepthPayload(
msg
){

const raw =
msg?.data ??
msg;

const bids =
raw?.bids ||
raw?.b ||
raw?.Bids;
const asks =
raw?.asks ||
raw?.a ||
raw?.Asks;

if(
!bids &&
!asks
){
return null;
}

return {
bids,
asks
};

}

/**
 * @param {{
 *   onBook: (data: { bids?: unknown, asks?: unknown }) => void,
 *   onStatus?: (text: string) => void,
 *   onOpen?: () => void,
 *   onClose?: () => void,
 *   getWsUrl?: () => string
 * }} handlers
 */
export function createBingxDepthWs(
handlers
){

let socket =
null;
let symbol =
"";
let dataType =
"";
let intentionalClose =
false;
let reconnectTimer =
null;

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

function sendSub(
type,
reqType
){

if(
!socket ||
socket.readyState !==
WebSocket.OPEN ||
!type
){
return;
}

socket.send(
JSON.stringify(
{
id:
makeId(),
reqType,
dataType:
type
}
)
);

}

function scheduleReconnect(){

clearReconnect();

if(
intentionalClose
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
RECONNECT_MS
);

}

async function onRawMessage(
raw
){

let msg;

try{
msg =
await parseMessage(
raw
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
try{
socket?.send(
"Pong"
);
}catch{
/* ignore */
}
return;
}

if(
msg?.ping !=
null &&
msg?.dataType ==
null
){
try{
socket?.send(
JSON.stringify(
{
pong:
msg.ping
}
)
);
}catch{
/* ignore */
}
return;
}

const wireType =
String(
msg?.dataType ||
""
);

if(
wireType &&
dataType &&
wireType !==
dataType &&
!wireType.startsWith(
dataType
)
){
return;
}

const book =
normalizeDepthPayload(
msg
);

if(
book
){
handlers.onBook?.(
book
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

try{
socket?.close();
}catch{
/* ignore */
}

socket =
null;

let ws;

try{
ws =
new WebSocket(
String(
handlers.getWsUrl?.() ||
DEFAULT_BINGX_WS_URL
).trim() ||
DEFAULT_BINGX_WS_URL
);
}catch{
handlers.onStatus?.(
"WS BingX: нет соединения"
);
scheduleReconnect();
return;
}

socket =
ws;
ws.binaryType =
"arraybuffer";

ws.onopen =
()=>{
handlers.onStatus?.(
""
);
handlers.onOpen?.();
sendSub(
dataType,
"sub"
);
};

ws.onmessage =
e=>{
void onRawMessage(
e.data
);
};

ws.onerror =
()=>{
handlers.onStatus?.(
"WS BingX: ошибка"
);
};

ws.onclose =
()=>{
handlers.onClose?.();

if(
!intentionalClose
){
scheduleReconnect();
}

};

}

function setSymbol(
nextSymbol
){

const sym =
String(
nextSymbol ||
""
).trim().toUpperCase().replace(
/\.P$/i,
""
);

if(
!sym
){
return;
}

const nextType =
dataTypeFor(
sym
);

if(
sym ===
symbol &&
socket?.readyState ===
WebSocket.OPEN
){
return;
}

const prev =
dataType;
symbol =
sym;
dataType =
nextType;

if(
socket?.readyState ===
WebSocket.OPEN
){
sendSub(
prev,
"unsub"
);
sendSub(
dataType,
"sub"
);
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
sendSub(
dataType,
"unsub"
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
dataType =
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
