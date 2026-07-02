import {
fetchBingx
} from "./fetch.js?v=3";

import {
buildBingxMarketLists
} from "./markets.js?v=1";

import {
toBingxSymbol,
toCanonicalSymbol,
isUsdtMarginedSymbol
} from "../symbol.js?v=1";

import {
tfToBingxInterval
} from "./intervals.js?v=1";

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

const json =
await fetchBingx(
`/openApi/swap/v2/quote/klines?${params}`
);

const rows =
Array.isArray(
json?.data
)
? json.data
: [];

return rows;

}

export async function loadBingxHistory(
symbol,
tf,
requests =
6
){

let all =
[];
let end =
Date.now();

for(
let i =
0;
i <
requests;
i++
){

const batch =
await fetchKlineBatch(
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

const unique =
new Map();

all.forEach(
row=>{

const ts =
Number(
row.time ||
row.openTime ||
row.t ||
0
);

if(
!ts
){
return;
}

const sec =
ts >
1e12
? Math.floor(
ts /
1000
)
: ts;

unique.set(
sec,
{
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
}
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

if(
!isUsdtMarginedSymbol(
symbol
)
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
!sym ||
!isUsdtMarginedSymbol(
sym
)
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
requests
){

return loadBingxHistory(
symbol,
tf,
requests
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
"./fetch.js?v=1"
);

return pingBingxPublic();

},

async fetchDailyCandles(
symbol,
limit = 375
){

const bingxSym =
toBingxSymbol(
symbol
);

const params =
new URLSearchParams({
symbol:
bingxSym,
interval:
"1d",
limit:
String(
Math.min(
1000,
Math.max(
1,
Number(
limit
) ||
375
)
)
)
});

const json =
await fetchBingx(
`/openApi/swap/v2/quote/klines?${params}`
);

const rows =
Array.isArray(
json?.data
)
? json.data
: [];

if(
!rows.length
){
return null;
}

return rows
.map(
row=>{

const ts =
Number(
row.time ||
row.openTime ||
row.t ||
0
);
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
open:Number(
row.open
),
close:Number(
row.close
)
};

}
)
.filter(
row=>
Number.isFinite(
row.time
) &&
row.time >
0
)
.sort(
(
a,
b
)=>
a.time -
b.time
);

}

};

export async function loadBingxOrderbook(
symbol,
depth =
50
){

const bingxSym =
toBingxSymbol(
symbol
);

const json =
await fetchBingx(
`/openApi/swap/v2/quote/depth?symbol=${encodeURIComponent(
bingxSym
)}&limit=${encodeURIComponent(
String(
depth
)
)}`
);

const data =
json?.data ||
{};

return {
bids:(
data.bids ||
[]
).map(
pair=>[
Number(
pair[
0
]
),
Number(
pair[
1
]
)
]
),
asks:(
data.asks ||
[]
).map(
pair=>[
Number(
pair[
0
]
),
Number(
pair[
1
]
)
]
)
};

}

export {
tfToBingxInterval
} from "./intervals.js?v=1";
