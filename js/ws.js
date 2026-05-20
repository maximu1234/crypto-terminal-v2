let socket = null;

let reconnectTimer = null;

let intentionalClose = false;

const topicCallbacks = new Map();

const activeTopics = new Set();

let terminalUnsub = null;

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

socket =
new WebSocket(
"wss://stream.bybit.com/v5/public/linear"
);

socket.onopen = ()=>{
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

callbacks.forEach(fn=>{
fn(candle);
});

};

socket.onclose = ()=>{

socket = null;

if(intentionalClose){
return;
}

reconnectTimer =
setTimeout(()=>{

reconnectTimer = null;

if(activeTopics.size){
ensureSocket();
}

}, 2000);

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

if(socket){

intentionalClose = true;

socket.close();

socket = null;

}

}

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

/*
  Сначала подписываемся на новый топик, потом снимаем старый —
  иначе временно 0 подписок → removeTopic закрывает сокет →
  каждое переключение монеты снова платит за TCP + WSS handshake (заметные спайки 0.5–2s).
*/
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
