let socket = null;

let currentTopic = null;

let reconnectTimer = null;

export function connectKlineStream({

symbol,
tf,
onCandle

}){

disconnectKlineStream();

const interval =
convertTf(tf);

currentTopic =
`kline.${interval}.${symbol}`;

socket =
new WebSocket(
"wss://stream.bybit.com/v5/public/linear"
);

socket.onopen = ()=>{

socket.send(JSON.stringify({

op:"subscribe",
args:[currentTopic]

}));

};

socket.onmessage = event=>{

const msg =
JSON.parse(event.data);

if(
msg.topic !== currentTopic
){
return;
}

if(!msg.data){
return;
}

const candle =
msg.data[0];

if(!candle){
return;
}

onCandle({

time:Number(candle.start)/1000,
open:Number(candle.open),
high:Number(candle.high),
low:Number(candle.low),
close:Number(candle.close)

});

};

socket.onclose = ()=>{

reconnectTimer =
setTimeout(()=>{

connectKlineStream({

symbol,
tf,
onCandle

});

},2000);

};

socket.onerror = ()=>{

socket.close();

};

}

export function disconnectKlineStream(){

if(reconnectTimer){

clearTimeout(reconnectTimer);

reconnectTimer = null;

}

if(socket){

socket.close();

socket = null;

}

}

function convertTf(tf){

if(tf === "D"){
return "D";
}

return tf;

}
