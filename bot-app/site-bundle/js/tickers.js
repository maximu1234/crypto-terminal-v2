import {
getActiveExchangeId,
EXCHANGE_CHANGED_EVENT,
loadMarketTickers
} from "./market-api.js?v=2";

import {
fetchBybit
} from "./bybit-fetch.js?v=17";

import {
toCanonicalSymbol
} from "./exchanges/symbol.js?v=1";

import {
fetchBingx
} from "./exchanges/bingx/fetch.js?v=5";

const DEFAULT_POLL_INTERVAL_MS =
3000;

/** Swap ticker openTime/openPrice сейчас часто «минутные» — не 24h. */
const BINGX_OPEN24_MIN_WINDOW_MS =
12 *
60 *
60 *
1000;

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

export function parseBingxPercentField(
raw
){

if(
raw ==
null ||
raw ===
""
){
return NaN;
}

return Number(
String(
raw
).replace(
/%/g,
""
).trim()
);

}

export function isBingxTickerOpen24Reliable(
ticker
){

const openTime =
Number(
ticker?.openTime
);
const closeTime =
Number(
ticker?.closeTime
) ||
Date.now();

if(
!(
openTime >
0
)
){
return false;
}

return (
closeTime -
openTime
) >=
BINGX_OPEN24_MIN_WINDOW_MS;

}

/**
 * 24h % для BingX.
 *
 * Swap `/quote/ticker` по доке — 24h, но иногда open/openTime «минутные» (баг биржи).
 * Пока окно ненадёжное — fallback на spot `/ticker/24hr` (тот же символ).
 * Когда BingX починит swap — снова используем его, без новой правки кода.
 */
export function resolveBingxChange24Percent(
ticker,
spotChange24
){

const last =
Number(
ticker?.lastPrice ||
ticker?.last
);

if(
isBingxTickerOpen24Reliable(
ticker
)
){

if(
last >
0 &&
Number.isFinite(
last
)
){

const open =
Number(
ticker.openPrice
);

if(
open >
0 &&
Number.isFinite(
open
)
){

return (
(
last -
open
) /
open
) *
100;

}

}

const pct =
parseBingxPercentField(
ticker.priceChangePercent ??
ticker.change24h
);

if(
Number.isFinite(
pct
) &&
Math.abs(
pct
) <=
500
){
return pct;
}

const change =
Number(
ticker.priceChange
);

if(
Number.isFinite(
change
) &&
Number.isFinite(
last
) &&
last >
0
){

const base =
last -
change;

if(
base >
0
){

return (
change /
base
) *
100;

}

}

}

const spot =
Number(
spotChange24
);

if(
Number.isFinite(
spot
) &&
Math.abs(
spot
) <=
500
){
return spot;
}

return 0;

}

function buildBingxTickerPayload(
ticker,
spotChange24
){

const sym =
toCanonicalSymbol(
ticker.symbol
);
const change24 =
resolveBingxChange24Percent(
ticker,
spotChange24
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

/**
 * Один запрос на все spot-пары — корректный 24h % (как у Bybit price24hPcnt).
 * @returns {Promise<Map<string, number>>} canonical symbol → percent
 */
export async function loadBingxSpotChange24Map(){

try{

const json =
await fetchBingx(
"/openApi/spot/v1/ticker/24hr",
{
timeoutMs:
12000,
retries:
1
}
);

const rows =
Array.isArray(
json?.data
)
? json.data
: [];

const map =
new Map();

for(
const row of
rows
){

if(
!isBingxTickerOpen24Reliable(
row
)
){
continue;
}

const sym =
toCanonicalSymbol(
row.symbol
);

if(
!sym
){
continue;
}

const pct =
parseBingxPercentField(
row.priceChangePercent
);

if(
!Number.isFinite(
pct
) ||
Math.abs(
pct
) >
500
){
continue;
}

map.set(
sym,
pct
);

}

return map;

}catch{
return new Map();
}

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

const [
map,
spotPct
] =
await Promise.all(
[
loadMarketTickers(),
loadBingxSpotChange24Map()
]
);

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
buildBingxTickerPayload(
{
...ticker,
symbol:
sym
},
spotPct.get(
sym
)
);

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

const [
map,
spotPct
] =
await Promise.all(
[
loadMarketTickers(),
loadBingxSpotChange24Map()
]
);

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
buildBingxTickerPayload(
{
...ticker,
symbol:
sym
},
spotPct.get(
sym
)
);

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
