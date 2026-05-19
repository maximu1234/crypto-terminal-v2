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

/* =========================================================
   VALIDATION
========================================================= */

if(
!msg.topic ||
!msg.topic.startsWith("tickers.")
){
return;
}

if(
!msg.data ||
!Array.isArray(msg.data)
){
return;
}

/* =========================================================
   MULTI TICKERS
========================================================= */

msg.data.forEach(ticker=>{

if(!ticker.symbol){
return;
}

const lastPrice =
Number(
ticker.lastPrice || 0
);

const change24 =
Number(
ticker.price24hPcnt || 0
) * 100;

/* =========================================================
   1H CHANGE
========================================================= */

let change1h = 0;

const prevPrice1h =
Number(
ticker.prevPrice1h || 0
);

if(prevPrice1h > 0){

change1h =
(
(lastPrice - prevPrice1h)
/
prevPrice1h
) * 100;

}

const payload = {

symbol:ticker.symbol,

price:lastPrice,

change24,

change1h

};

subscribers.forEach(fn=>fn(payload));

});

};

tickerSocket.onclose = ()=>{

tickerSocket = null;

reconnectTimer =
setTimeout(()=>{

connectTickerStream(()=>{});

},2000);

};

tickerSocket.onerror = ()=>{

socket?.close();

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
