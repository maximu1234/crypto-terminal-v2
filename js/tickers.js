import {
getActiveExchangeId,
EXCHANGE_CHANGED_EVENT,
loadMarketTickers
} from "./market-api.js?v=1";

import {
fetchBybit
} from "./bybit-fetch.js?v=17";

import {
toCanonicalSymbol
} from "./exchanges/symbol.js?v=1";

const DEFAULT_POLL_INTERVAL_MS =
3000;

let pollIntervalMs =
DEFAULT_POLL_INTERVAL_MS;

let pollTimer =
null;

let subscribers =
[];

let boundExchangeListener =
false;

function ensureExchangeListener(){

if(
boundExchangeListener ||
typeof window ===
"undefined"
){
return;
}

boundExchangeListener =
true;

window.addEventListener(
EXCHANGE_CHANGED_EVENT,
()=>{
restartPolling();
}
);

}

function buildBybitTickerPayload(
ticker
){

const change24 =
Number(
ticker.price24hPcnt ||
0
) *
100;

let change1h =
0;

const highPrice24h =
Number(
ticker.highPrice24h ||
0
);

const lowPrice24h =
Number(
ticker.lowPrice24h ||
0
);

if(
highPrice24h >
0 &&
lowPrice24h >
0
){

change1h =
change24 /
24;

}

return {

symbol:
ticker.symbol,

price:
Number(
ticker.lastPrice ||
0
),

bid:
Number(
ticker.bid1Price ||
ticker.lastPrice ||
0
),

ask:
Number(
ticker.ask1Price ||
ticker.lastPrice ||
0
),

change24,

change1h,

volume24:
Number(
ticker.turnover24h ||
0
)

};

}

function buildBingxTickerPayload(
ticker
){

const sym =
toCanonicalSymbol(
ticker.symbol
);
const change24 =
Number(
ticker.priceChangePercent ||
ticker.change24h ||
0
);

return {

symbol:
sym,

price:
Number(
ticker.lastPrice ||
ticker.last ||
0
),

bid:
Number(
ticker.bidPrice ||
ticker.lastPrice ||
0
),

ask:
Number(
ticker.askPrice ||
ticker.lastPrice ||
0
),

change24,

change1h:
change24 /
24,

volume24:
Number(
ticker.quoteVolume ||
ticker.volume ||
0
)

};

}

async function fetchBybitTickersInto(
targetMap
){

const {
json
} =
await fetchBybit(
"/v5/market/tickers?category=linear",
{
timeoutMs:
10000,
retries:
1
}
);

if(
!json.result ||
!json.result.list
){
return 0;
}

json.result.list.forEach(
ticker=>{

const payload =
buildBybitTickerPayload(
ticker
);

targetMap.set(
payload.symbol,
payload
);

}
);

return targetMap.size;

}

async function fetchBingxTickersInto(
targetMap
){

const map =
await loadMarketTickers();

if(
!map
){
return 0;
}

map.forEach(
(
ticker,
sym
)=>{

const payload =
buildBingxTickerPayload({
...ticker,
symbol:
sym
});

targetMap.set(
payload.symbol,
payload
);

}
);

return targetMap.size;

}

export async function fetchTickersInto(
targetMap
){

ensureExchangeListener();

try{

if(
getActiveExchangeId() ===
"bingx"
){
return await fetchBingxTickersInto(
targetMap
);
}

return await fetchBybitTickersInto(
targetMap
);

}catch{
return 0;
}

}

export function setTickerPollInterval(
ms
){

const next =
Number(
ms
);

pollIntervalMs =
Number.isFinite(
next
) &&
next >=
0
? next
: DEFAULT_POLL_INTERVAL_MS;

restartPolling();

}

export function getTickerPollInterval(){

return pollIntervalMs;

}

function stopPolling(){

if(
pollTimer !=
null
){
clearInterval(
pollTimer
);
pollTimer =
null;
}

}

function restartPolling(){

stopPolling();

if(
pollIntervalMs <=
0 ||
subscribers.length ===
0
){
return;
}

void loadTickers();

pollTimer =
setInterval(
loadTickers,
pollIntervalMs
);

}

export function connectTickerStream(
onTick
){

ensureExchangeListener();

subscribers.push(
onTick
);
restartPolling();

}

async function loadTickers(){

ensureExchangeListener();

try{

if(
getActiveExchangeId() ===
"bingx"
){

const map =
await loadMarketTickers();

if(
!map
){
return;
}

map.forEach(
(
ticker,
sym
)=>{

const payload =
buildBingxTickerPayload({
...ticker,
symbol:
sym
});

subscribers.forEach(
fn=>
fn(
payload
)
);

}
);

return;

}

const {
json
} =
await fetchBybit(
"/v5/market/tickers?category=linear",
{
timeoutMs:
10000,
retries:
1
}
);

if(
!json.result ||
!json.result.list
){
return;
}

json.result.list.forEach(
ticker=>{

const payload =
buildBybitTickerPayload(
ticker
);

subscribers.forEach(
fn=>
fn(
payload
)
);

}
);

}catch{
/* тихо */
}

}

export function stopTickerStream(){

stopPolling();
subscribers =
[];

}
