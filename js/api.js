import {
fetchBybit
} from "./bybit-fetch.js?v=10";

const TWELVE_KEY =
"d6b45dcb1abf4b3ebe020038e41864fb";

/* =========================================================
   BYBIT HISTORY
========================================================= */

let historyLoadQueue = Promise.resolve();

function sleep(ms){
return new Promise(resolve=>setTimeout(resolve, ms));
}

async function fetchBybitKlineBatch(
symbol,
tf,
end,
retries = 3
){

const path =
`/v5/market/kline?category=linear&symbol=${encodeURIComponent(symbol)}&interval=${encodeURIComponent(tf)}&limit=1000&end=${end}`;

try{

const { json } =
await fetchBybit(
path,
{
sequential: true,
retries,
timeoutMs: 10000
}
);

if(
json.retCode === 0 &&
json.result?.list?.length
){
return json.result.list;
}

}catch{
/* fetchBybit уже показал баннер при полном отказе */
}

return null;

}

async function loadBybitHistoryImpl(
symbol,
tf,
requests = 6,
batchGapMs = 80
){

let all = [];
let end = Date.now();
let failedBatches = 0;

for(let i = 0; i < requests; i++){

const batch =
await fetchBybitKlineBatch(
symbol,
tf,
end
);

if(!batch?.length){

failedBatches++;

if(
failedBatches >= 2 &&
!all.length
){
break;
}

if(
!all.length
){
break;
}

break;

}

failedBatches = 0;

all.push(...batch);

const oldest =
Math.min(...batch.map(k=>Number(k[0])));

end = oldest - 1;

if(
i <
requests -
1 &&
batchGapMs >
0
){
await sleep(
batchGapMs
);
}

}

const unique =
new Map();

all.forEach(k=>{

unique.set(k[0],{

time:Number(k[0])/1000,
open:Number(k[1]),
high:Number(k[2]),
low:Number(k[3]),
close:Number(k[4])

});

});

return Array
.from(unique.values())
.sort((a,b)=>a.time-b.time);

}

export async function loadBybitHistory(
symbol,
tf,
requests = 6,
options = {}
){

const gap =
typeof options.batchGapMs ===
"number"
? options.batchGapMs
: options.parallel === true
? 0
: 120;

const runner =
()=>
loadBybitHistoryImpl(
symbol,
tf,
requests,
gap
);

if(options.parallel){

return runner();

}

const result =
historyLoadQueue.then(
runner,
runner
);

historyLoadQueue =
result.then(
()=>{},
()=>{}
);

return result;

}

/* =========================================================
   BYBIT SYMBOLS
========================================================= */

const SYMBOLS_CACHE_KEY =
"bybit_linear_symbols_v1";

const SYMBOLS_CACHE_TTL_MS =
60 * 60 * 1000;

const SYMBOLS_STALE_MAX_MS =
7 *
24 *
60 *
60 *
1000;

function readSymbolsCacheRaw(){

try{

const raw =
localStorage.getItem(SYMBOLS_CACHE_KEY);

if(!raw){
return null;
}

const parsed =
JSON.parse(raw);

if(
!Array.isArray(parsed?.symbols) ||
!parsed.symbols.length
){
return null;
}

if(
Date.now() - Number(parsed.at || 0) >
SYMBOLS_STALE_MAX_MS
){
return null;
}

return parsed;

}catch{

return null;

}

}

/** Список из localStorage даже если TTL истёк (до 7 суток) — мгновенный UI. */
export function peekBybitSymbolsCache(){

const parsed =
readSymbolsCacheRaw();

return parsed?.symbols || null;

}

function readSymbolsCache(){

const parsed =
readSymbolsCacheRaw();

if(
!parsed
){
return null;
}

if(
Date.now() - Number(parsed.at || 0) >
SYMBOLS_CACHE_TTL_MS
){
return null;
}

return parsed.symbols;

}

function writeSymbolsCache(symbols){

try{

localStorage.setItem(
SYMBOLS_CACHE_KEY,
JSON.stringify({
at: Date.now(),
symbols
})
);

}catch{
/* ignore */
}

}

async function loadBybitSymbolsFromNetwork(){

const all = [];
let cursor = null;
let pageFailures = 0;

do{

const cursorParam =
cursor
? `&cursor=${encodeURIComponent(cursor)}`
: "";

const path =
`/v5/market/instruments-info?category=linear&limit=1000${cursorParam}`;

try{

const { json } =
await fetchBybit(
path,
{
timeoutMs: 10000,
retries: 1
}
);

if(
!json.result ||
!json.result.list?.length
){
pageFailures++;

if(
pageFailures >= 2
){
break;
}

await sleep(600);
continue;
}

pageFailures = 0;

all.push(...json.result.list);

cursor =
json.result.nextPageCursor ||
null;

}catch(err){

pageFailures++;

if(
pageFailures >= 2 &&
!all.length
){
throw err;
}

if(
pageFailures >= 3
){
break;
}

await sleep(500);

}

}while(cursor);

const filtered =
all.filter(isUsdtLinearSymbol);

if(
!filtered.length
){
throw new Error(
"Пустой список инструментов Bybit"
);
}

writeSymbolsCache(filtered);

return filtered;

}

export function isUsdtLinearSymbol(item){

if(
!item ||
item.status !== "Trading"
){
return false;
}

const sym =
String(item.symbol || "").toUpperCase();

if(!sym.endsWith("USDT")){
return false;
}

if(sym.endsWith("PERP")){
return false;
}

if(
item.quoteCoin &&
item.quoteCoin !== "USDT"
){
return false;
}

return true;

}

export async function loadBybitSymbols(
options = {}
){

const cached =
readSymbolsCache();

if(
cached?.length &&
!options.forceNetwork
){

void loadBybitSymbolsFromNetwork()
.then(symbols=>{

window.dispatchEvent(
new CustomEvent(
"bybit-symbols-updated",
{
detail: { symbols }
}
)
);

})
.catch(err=>{
console.warn(
"Bybit symbols refresh:",
err?.message || err
);
});

return cached;

}

const stale =
options.forceNetwork
? null
: peekBybitSymbolsCache();

if(
stale?.length
){

void loadBybitSymbolsFromNetwork()
.then(symbols=>{

window.dispatchEvent(
new CustomEvent(
"bybit-symbols-updated",
{
detail: { symbols }
}
)
);

})
.catch(err=>{
console.warn(
"Bybit symbols refresh:",
err?.message || err
);
});

return stale;

}

return loadBybitSymbolsFromNetwork();

}

/* =========================================================
   TWELVEDATA
========================================================= */

export async function loadTwelveData(symbol, tf){

let interval = "1h";

if(tf === "1"){
interval = "1min";
}

if(tf === "5"){
interval = "5min";
}

if(tf === "15"){
interval = "15min";
}

if(tf === "60"){
interval = "1h";
}

if(tf === "240"){
interval = "4h";
}

if(tf === "D"){
interval = "1day";
}

const url =
`https://api.twelvedata.com/time_series?symbol=${encodeURIComponent(symbol)}&interval=${interval}&outputsize=2500&apikey=${TWELVE_KEY}`;

const res = await fetch(url);

const json = await res.json();

if(!json.values){
return [];
}

return json.values.reverse().map(v=>({

time:
Math.floor(new Date(v.datetime).getTime()/1000),

open:Number(v.open),
high:Number(v.high),
low:Number(v.low),
close:Number(v.close)

}));

}
