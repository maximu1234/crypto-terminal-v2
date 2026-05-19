let tickerSocket = null;

let reconnectTimer = null;

let subscribers = [];

export function connectTickerStream(onTick){

subscribers.push(onTick);

if(tickerSocket){
return;
}

tickerSocket =
new WebSocket(
"wss://stream.bybit.com/v5/public/linear"
);

tickerSocket.onopen = ()=>{

tickerSocket.send(JSON.stringify({

op:"subscribe",

args:[
"tickers.*"
]

}));

};

tickerSocket.onmessage = event=>{

const msg =
JSON.parse(event.data);

if(
!msg.topic ||
!msg.topic.startsWith("tickers.")
){
return;
}

if(!msg.data){
return;
}

const ticker = msg.data;

const payload = {

symbol:ticker.symbol,

price:Number(
ticker.lastPrice || 0
),

change24:Number(
ticker.price24hPcnt || 0
)*100

};

subscribers.forEach(fn=>fn(payload));

};

tickerSocket.onclose = ()=>{

tickerSocket = null;

reconnectTimer =
setTimeout(()=>{

connectTickerStream(()=>{});

},2000);

};

tickerSocket.onerror = ()=>{

tickerSocket.close();

};

}

export function disconnectTickerStream(){

if(reconnectTimer){

clearTimeout(reconnectTimer);

reconnectTimer = null;

}

if(tickerSocket){

tickerSocket.close();

tickerSocket = null;

}

subscribers = [];

}
