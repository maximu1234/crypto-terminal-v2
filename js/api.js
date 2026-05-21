const TWELVE_KEY =
"d6b45dcb1abf4b3ebe020038e41864fb";

/* =========================================================
   BYBIT HISTORY
========================================================= */

let historyLoadQueue = Promise.resolve();

function sleep(ms){
return new Promise(resolve=>setTimeout(resolve, ms));
}

async function fetchBybitKlineBatch(url, retries = 3){

for(let attempt = 0; attempt < retries; attempt++){

const res = await fetch(url);
const json = await res.json();

if(json.retCode === 0 && json.result?.list?.length){
return json.result.list;
}

const retryable =
json.retCode === 10006 ||
json.retCode === 10016 ||
res.status === 429;

if(retryable && attempt < retries - 1){
await sleep(250 * (attempt + 1));
continue;
}

return null;

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

for(let i = 0; i < requests; i++){

const url =
`https://api.bybit.com/v5/market/kline?category=linear&symbol=${symbol}&interval=${tf}&limit=1000&end=${end}`;

const batch = await fetchBybitKlineBatch(url);

if(!batch?.length){
break;
}

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
/* При parallel вызовы обходят очередь; пауза между батчами лишняя (сотни мс впустую) */
? 0
: 80;

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

/* Дубликаты вроде PNUTPERP — оставляем только *USDT */
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

export async function loadBybitSymbols(){

const all = [];
let cursor = null;

do{

const cursorParam =
cursor ? `&cursor=${encodeURIComponent(cursor)}` : "";

const res = await fetch(
`https://api.bybit.com/v5/market/instruments-info?category=linear&limit=1000${cursorParam}`
);

const json = await res.json();

if(
!json.result ||
!json.result.list
){
break;
}

all.push(...json.result.list);

cursor = json.result.nextPageCursor || null;

}while(cursor);

return all.filter(isUsdtLinearSymbol);

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
