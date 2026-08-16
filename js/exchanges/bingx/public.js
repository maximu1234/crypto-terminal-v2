import {
fetchBingx,
isBingxNonRetryableSymbolError,
isBingxRateLimitError
} from "./fetch.js?v=5";

import {
buildBingxMarketLists,
classifyBingxContract
} from "./markets.js?v=3";

import {
toBingxSymbol,
toCanonicalSymbol
} from "../symbol.js?v=1";

import {
tfToBingxInterval
} from "./intervals.js?v=1";

import {
klineHistoryPageEnds,
shouldFetchKlinePagesInParallel
} from "../../kline-history-pages.js?v=2";

const SYMBOLS_CACHE_PREFIX =
"bingx_swap_symbols_v4";

const SYMBOLS_CACHE_TTL_MS =
60 *
60 *
1000;

function symbolsCacheKey(){

return SYMBOLS_CACHE_PREFIX;

}

function readSymbolsCache(){

try{

const raw =
localStorage.getItem(
symbolsCacheKey()
);

if(
!raw
){
return null;
}

const parsed =
JSON.parse(
raw
);

if(
!parsed?.instruments?.length
){
return null;
}

if(
Date.now() -
Number(
parsed.savedAt ||
0
) >
SYMBOLS_CACHE_TTL_MS
){
return null;
}

return parsed.instruments;

}catch{
return null;
}

}

function writeSymbolsCache(
instruments
){

try{
localStorage.setItem(
symbolsCacheKey(),
JSON.stringify({
savedAt:
Date.now(),
instruments
})
);
}catch{
/* ignore */
}

}

function dispatchBingxSymbolsUpdated(
instruments
){

if(
typeof window ===
"undefined"
){
return;
}

window.dispatchEvent(
new CustomEvent(
"market-symbols-updated",
{
detail: {
exchangeId:
"bingx",
symbols:
instruments
}
}
)
);

}

async function fetchKlineBatch(
symbol,
tf,
endTime
){

const bingxSym =
toBingxSymbol(
symbol
);
const interval =
tfToBingxInterval(
tf
);

const params =
new URLSearchParams({
symbol:
bingxSym,
interval,
limit:
"1000"
});

if(
Number.isFinite(
endTime
) &&
endTime >
0
){
params.set(
"endTime",
String(
endTime
)
);
}

try{

const json =
await fetchBingx(
`/openApi/swap/v3/quote/klines?${params}`
);

const rows =
Array.isArray(
json?.data
)
? json.data
: [];

return rows;

}catch(
err
){

if(
isBingxRateLimitError(
err
)
){
throw err;
}

/* pause / invalid symbol — как Bybit: пустая партия, без throw */
return [];

}

}

function normalizeBingxKlineRows(
rows
){

if(
!Array.isArray(
rows
) ||
!rows.length
){
return [];
}

return rows
.map(
row=>{

if(
Array.isArray(
row
)
){
const ts =
Number(
row[
0
]
);

if(
!ts
){
return null;
}

const sec =
ts >
1e12
? Math.floor(
ts /
1000
)
: ts;

return {
time:
sec,
open:
Number(
row[
1
]
),
high:
Number(
row[
2
]
),
low:
Number(
row[
3
]
),
close:
Number(
row[
4
]
),
volume:
Number(
row[
5
]
) ||
0
};
}

const ts =
Number(
row?.time ||
row?.openTime ||
row?.t ||
0
);

if(
!ts
){
return null;
}

const sec =
ts >
1e12
? Math.floor(
ts /
1000
)
: ts;

return {
time:
sec,
open:
Number(
row.open
),
high:
Number(
row.high
),
low:
Number(
row.low
),
close:
Number(
row.close
),
volume:
Number(
row.volume ||
row.vol ||
0
) ||
0
};

}
)
.filter(
Boolean
);

}

async function fetchBingxKlineBatchWithRetry(
symbol,
tf,
end
){

let batch =
null;

for(
let attempt =
0;
attempt <
3;
attempt++
){

try{
batch =
await fetchKlineBatch(
symbol,
tf,
end
);
break;
}catch(
err
){

if(
!isBingxRateLimitError(
err
) ||
attempt >=
2
){
throw err;
}

const unlock =
Number(
err?.bingxUnlockMs
) ||
0;
const waitMs =
unlock >
Date.now()
? Math.min(
unlock -
Date.now() +
250,
30_000
)
: 1500 *
(
attempt +
1
);

await new Promise(
resolve=>
setTimeout(
resolve,
waitMs
)
);

}

}

return batch;

}

export async function loadBingxHistory(
symbol,
tf,
requests =
6,
options =
{}
){

let all =
[];
let end =
typeof options?.endMs ===
"number" &&
Number.isFinite(
options.endMs
) &&
options.endMs >
0
? Math.floor(
options.endMs
)
: Date.now();

const gapForPages =
options.parallel === true ||
options.batchGapMs === 0
? 0
: 1;
const pageEnds =
shouldFetchKlinePagesInParallel(
requests,
gapForPages
)
? klineHistoryPageEnds(
end,
tf,
requests
)
: [];

if(
pageEnds.length >
1
){

const batches =
await Promise.all(
pageEnds.map(
async pageEnd=>{

try{
return await fetchBingxKlineBatchWithRetry(
symbol,
tf,
pageEnd
);
}catch{
return null;
}

}
)
);

for(
const batch of
batches
){
if(
batch?.length
){
all.push(
...batch
);
}
}

}else{

for(
let i =
0;
i <
requests;
i++
){

const batch =
await fetchBingxKlineBatchWithRetry(
symbol,
tf,
end
);

if(
!batch?.length
){
break;
}

all.push(
...batch
);

const oldest =
Math.min(
...batch.map(
row=>
Number(
row.time ||
row.openTime ||
row.t ||
(
Array.isArray(
row
)
? row[
0
]
: 0
) ||
0
)
)
);

if(
!Number.isFinite(
oldest
) ||
oldest <=
0
){
break;
}

end =
oldest -
1;

}

}

const unique =
new Map();

normalizeBingxKlineRows(
all
).forEach(
candle=>{

unique.set(
candle.time,
candle
);

}
);

return Array.from(
unique.values()
).sort(
(
a,
b
)=>
a.time -
b.time
);

}

/**
 * Дневные свечи для Статистики ({ time, open, close }).
 * Без этого fetchMarketDailyCandles → null на каждом символе BingX.
 */
async function fetchBingxDailyCandles(
symbol,
limit =
375
){

const bingxSym =
toBingxSymbol(
symbol
);
const capped =
Math.min(
Math.max(
1,
Number(
limit
) ||
375
),
1440
);
const params =
new URLSearchParams({
symbol:
bingxSym,
interval:
"1d",
limit:
String(
capped
)
});

for(
let attempt =
0;
attempt <
3;
attempt++
){

try{

const json =
await fetchBingx(
`/openApi/swap/v3/quote/klines?${params}`,
{
timeoutMs:
12000,
retries:
0
}
);

const rows =
normalizeBingxKlineRows(
Array.isArray(
json?.data
)
? json.data
: []
);

if(
!rows.length
){
return null;
}

return rows.map(
row=>({
time:
row.time,
open:
row.open,
close:
row.close
})
);

}catch(
err
){

if(
isBingxNonRetryableSymbolError(
err
)
){
return null;
}

if(
isBingxRateLimitError(
err
) &&
attempt <
2
){
const unlock =
Number(
err?.bingxUnlockMs
) ||
0;
const waitMs =
unlock >
Date.now()
? Math.min(
unlock -
Date.now() +
250,
30_000
)
: 1500 *
(
attempt +
1
);

await new Promise(
resolve=>
setTimeout(
resolve,
waitMs
)
);
continue;
}

if(
attempt <
2
){
await new Promise(
resolve=>
setTimeout(
resolve,
600 *
(
attempt +
1
)
)
);
continue;
}

}

}

return null;

}

function normalizeBingxInstrument(
item
){

if(
!item
){
return null;
}

if(
typeof item ===
"string"
){

const sym =
toCanonicalSymbol(
item
);

return sym
? {
symbol:
sym,
status:
"Trading",
launchTime:
null,
raw:
null
}
: null;

}

const raw =
item.raw &&
typeof item.raw ===
"object"
? item.raw
: null;

const symbol =
toCanonicalSymbol(
item.symbol ||
raw?.symbol ||
""
);

if(
!symbol
){
return null;
}

const category =
classifyBingxContract({
symbol:
item.symbol ||
raw?.symbol,
status:
raw?.status ??
item.status
});

if(
!category
){
return null;
}

const launchTime =
item.launchTime ??
raw?.launchTime ??
raw?.onboardDate ??
raw?.listingTime ??
null;

if(
raw
){

const rs =
raw.status;

if(
rs !==
1 &&
rs !==
"1"
){
return null;
}

}else{

const st =
item.status;

if(
st !=
null &&
st !==
"Trading" &&
st !==
1 &&
st !==
"1"
){
return null;
}

}

return {
...item,
symbol,
status:
"Trading",
launchTime,
bingxMarketCategory:
category,
raw:
raw ||
item.raw ||
null
};

}

function normalizeBingxInstruments(
items
){

if(
!Array.isArray(
items
)
){
return [];
}

return items
.map(
normalizeBingxInstrument
)
.filter(
Boolean
);

}

async function loadContractsFromNetwork(){

const json =
await fetchBingx(
"/openApi/swap/v2/quote/contracts"
);

const rows =
Array.isArray(
json?.data
)
? json.data
: [];

return normalizeBingxInstruments(
rows.map(
row=>({
symbol:
toCanonicalSymbol(
row.symbol
),
status:
"Trading",
launchTime:
row.launchTime ||
row.onboardDate ||
row.listingTime ||
null,
raw:
row
})
)
);

}

export async function loadBingxSymbols(
options = {}
){

if(
options.skipCache !==
true &&
options.forceNetwork !==
true
){

const cached =
readSymbolsCache();

if(
cached?.length
){
return normalizeBingxInstruments(
cached
);
}

}

const instruments =
await loadContractsFromNetwork();

writeSymbolsCache(
instruments
);

dispatchBingxSymbolsUpdated(
instruments
);

return instruments;

}

export function buildBingxCoinsMarketLists(
instruments
){

return buildBingxMarketLists(
instruments.map(
item=>
item?.raw ||
item
)
);

}

export async function loadBingxTickers(){

const json =
await fetchBingx(
"/openApi/swap/v2/quote/ticker"
);

const rows =
Array.isArray(
json?.data
)
? json.data
: (
json?.data
? [
json.data
]
: []
);

const map =
new Map();

rows.forEach(
row=>{

const sym =
toCanonicalSymbol(
row.symbol
);

if(
!sym
){
return;
}

map.set(
sym,
row
);

}
);

return map;

}

export const bingxPublicAdapter =
{

id:
"bingx",

async loadHistory(
symbol,
tf,
requests,
options
){

return loadBingxHistory(
symbol,
tf,
requests,
options
);

},

async loadSymbols(
options
){

return loadBingxSymbols(
options
);

},

buildMarketLists(
instruments
){

return buildBingxCoinsMarketLists(
instruments
);

},

async loadOrderbook(
symbol,
depth
){

return loadBingxOrderbook(
symbol,
depth
);

},

async loadTickers(){

return loadBingxTickers();

},

async pingPublic(){

const {
pingBingxPublic
} =
await import(
"./fetch.js?v=5"
);

return pingBingxPublic();

},

async fetchDailyCandles(
symbol,
limit
){

return fetchBingxDailyCandles(
symbol,
limit
);

}

};

function clampBingxDepthLimit(
depth
){

const n =
Number(
depth
);

if(
!Number.isFinite(
n
) ||
n <=
5
){
return 5;
}

if(
n <=
10
){
return 10;
}

/* BingX swap depth accepts 5 / 10 / 20. */
return 20;

}

function mapBingxDepthSide(
rows
){

return (
Array.isArray(
rows
)
? rows
: []
).map(
row=>{

const price =
Number(
Array.isArray(
row
)
? row[
0
]
: row?.price
);
const size =
Number(
Array.isArray(
row
)
? row[
1
]
: row?.size ??
row?.qty
);

if(
!Number.isFinite(
price
) ||
!Number.isFinite(
size
) ||
price <=
0 ||
size <=
0
){
return null;
}

return {
price,
size,
notional:
price *
size
};

}
).filter(
Boolean
);

}

export async function loadBingxOrderbook(
symbol,
depth =
20
){

const bingxSym =
toBingxSymbol(
symbol
);

const capped =
clampBingxDepthLimit(
depth
);

const json =
await fetchBingx(
`/openApi/swap/v2/quote/depth?symbol=${encodeURIComponent(
bingxSym
)}&limit=${encodeURIComponent(
String(
capped
)
)}`
);

const data =
json?.data ||
{};

return {
bids:
mapBingxDepthSide(
data.bids
).sort(
(
a,
b
)=>
b.price -
a.price
),
asks:
mapBingxDepthSide(
data.asks
).sort(
(
a,
b
)=>
a.price -
b.price
)
};

}

export {
tfToBingxInterval
} from "./intervals.js?v=1";
