/**
 * Algo Bybit private WebSocket — algo credentials only.
 */
const crypto =
require(
"crypto"
);

const {
getAlgoCredentials
} =
require(
"./algo-exchange-credentials.cjs"
);
const {
getRelayHttpsAgent
} =
require(
"../app-proxy-socks-relay.cjs"
);

function getCredentials(){
return getAlgoCredentials("bybit");
}

let WsConstructor =
null;

function signPayload(
secret,
payload
){

return crypto
.createHmac(
"sha256",
secret
)
.update(
payload
)
.digest(
"hex"
);

}

try{
WsConstructor =
require(
"ws"
);
}catch{
/* global WebSocket in Electron main */
}

function wsUrl(
testnet
){

return testnet
? "wss://stream-testnet.bybit.com/v5/private"
: "wss://stream.bybit.com/v5/private";

}

function attachSocket(
ws,
handlers
){

const onOpen =
handlers.onOpen;
const onMessage =
handlers.onMessage;
const onClose =
handlers.onClose;
const onError =
handlers.onError;

if(
WsConstructor
){

ws.on(
"open",
()=>{
onOpen?.(
ws
);
}
);

ws.on(
"message",
data=>{
onMessage?.(
String(
data
)
);
}
);

ws.on(
"close",
(
code,
reason
)=>{
onClose?.(
code,
String(
reason ||
""
)
);
}
);

ws.on(
"error",
err=>{
onError?.(
err
);
}
);

return;

}

ws.addEventListener(
"open",
()=>{
onOpen?.(
ws
);
}
);

ws.addEventListener(
"message",
event=>{
onMessage?.(
String(
event.data
)
);
}
);

ws.addEventListener(
"close",
event=>{
onClose?.(
event.code,
""
);
}
);

ws.addEventListener(
"error",
event=>{
onError?.(
event.error ||
new Error(
"WebSocket error"
)
);
}
);

}

/**
 * @param {{
 *   onReady: ()=>void,
 *   onTopic: (topic: string, rows: object[])=>void,
 *   onDisconnect: (reason: string)=>void
 * }} handlers
 */
function getWsConstructor(){

if(
WsConstructor
){
return WsConstructor;
}

if(
typeof WebSocket !==
"undefined"
){
return WebSocket;
}

return null;

}

function connectBybitPrivateWs(
handlers
){

const creds =
getCredentials();

if(
!creds
){
return {
close:()=>{}
};
}

const Ws =
getWsConstructor();

if(
!Ws
){
handlers.onDisconnect?.(
"WebSocket module unavailable"
);
return {
close:()=>{}
};
}

let closed =
false;
let socket =
null;

function connect(){

if(
closed
){
return;
}

const url =
wsUrl(
creds.testnet
);
const agent =
getRelayHttpsAgent();

socket =
agent
? new Ws(
url,
{
agent
}
)
: new Ws(
url
);

attachSocket(
socket,
{

onOpen(
ws
){

const expires =
Date.now() +
10000;

const signature =
signPayload(
creds.apiSecret,
`GET/realtime${expires}`
);

ws.send(
JSON.stringify({
op:
"auth",
args:[
creds.apiKey,
String(
expires
),
signature
]
})
);

},

onMessage(
raw
){

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
"auth"
){

if(
msg.success
){

socket?.send?.(
JSON.stringify({
op:
"subscribe",
args:[
"position",
"order",
"execution"
]
})
);

handlers.onReady?.();

}else{

socket?.close?.();

}

return;

}

if(
msg.topic ===
"position" ||
msg.topic ===
"order" ||
msg.topic ===
"execution"
){

const rows =
Array.isArray(
msg.data
)
? msg.data
: [];

handlers.onTopic?.(
msg.topic,
rows
);

}

},

onClose(){

if(
closed
){
return;
}

handlers.onDisconnect?.(
"closed"
);
},

onError(){

/* close handler follows */
}

}
);

}

connect();

return {
close(){

closed =
true;

try{
socket?.close?.();
}catch{
/* ignore */
}

socket =
null;

}
};

}

module.exports =
{
connectBybitPrivateWs
};
