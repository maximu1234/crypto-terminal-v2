let interval = null;

let subscribers = [];

export function connectTickerStream(onTick){

subscribers.push(onTick);

if(interval){
return;
}

loadTickers();

interval =
setInterval(
loadTickers,
3000
);

}

async function loadTickers(){

try{

const res = await fetch(
"https://api.bybit.com/v5/market/tickers?category=linear"
);

const json = await res.json();

if(
!json.result ||
!json.result.list
){
return;
}

json.result.list.forEach(ticker=>{

const lastPrice =
Number(
ticker.lastPrice || 0
);

const change24 =
Number(
ticker.price24hPcnt || 0
) * 100;

/* =========================================================
   1H CHANGE (APPROX)
========================================================= */

let change1h = 0;

const highPrice24h =
Number(
ticker.highPrice24h || 0
);

const lowPrice24h =
Number(
ticker.lowPrice24h || 0
);

if(
highPrice24h > 0 &&
lowPrice24h > 0
){

const avgMove =
change24 / 24;

change1h = avgMove;

}

const payload = {

symbol:ticker.symbol,

price:lastPrice,

change24,

change1h

};

subscribers.forEach(fn=>fn(payload));

});

}catch(err){

console.log(err);

}

}

export function disconnectTickerStream(){

if(interval){

clearInterval(interval);

interval = null;

}

subscribers = [];

}
