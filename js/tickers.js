import {
fetchBybit
} from "./bybit-fetch.js?v=5";

let interval = null;

let subscribers = [];

function buildTickerPayload(ticker){

const change24 =
Number(
ticker.price24hPcnt || 0
) * 100;

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

change1h = change24 / 24;

}

return {

symbol:ticker.symbol,

price:Number(ticker.lastPrice || 0),

change24,

change1h,

volume24:Number(ticker.turnover24h || 0)

};

}

export async function fetchTickersInto(targetMap){

try{

const { json } =
await fetchBybit(
"/v5/market/tickers?category=linear",
{
timeoutMs: 12000,
retries: 1
}
);

if(
!json.result ||
!json.result.list
){
return 0;
}

json.result.list.forEach(ticker=>{

const payload =
buildTickerPayload(ticker);

targetMap.set(payload.symbol, payload);

});

return targetMap.size;

}catch{
return 0;
}

}

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

const { json } =
await fetchBybit(
"/v5/market/tickers?category=linear",
{
timeoutMs: 12000,
retries: 1
}
);

if(
!json.result ||
!json.result.list
){
return;
}

json.result.list.forEach(ticker=>{

const payload =
buildTickerPayload(ticker);

subscribers.forEach(fn=>fn(payload));

});

}catch{
/* тихо — следующий интервал или баннер уже от fetchBybit */
}

}

export function stopTickerStream(){

if(interval){
clearInterval(interval);
interval = null;
}

subscribers = [];

}
