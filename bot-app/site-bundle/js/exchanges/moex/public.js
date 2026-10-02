import {
fetchMoex,
issBlockToRows,
pingMoexPublic
} from "./fetch.js?v=1";

import {
MOEX_BOARD_SPECS,
moexBoardSecuritiesPath,
moexCandlesPath,
normalizeMoexInstrument,
buildMoexMarketLists
} from "./listings.js?v=1";

import {
tfToMoexInterval,
moexIntervalMs
} from "./intervals.js?v=1";

import {
toMoexSymbol
} from "../symbol.js?v=2";

const SYMBOLS_CACHE_KEY =
"moex_symbols_v2";

const SYMBOLS_CACHE_TTL_MS =
30 *
60 *
1000;

const MARKETDATA_REFRESH_MIN_MS =
8000;

let lastMarketdataRefreshAt =
0;

/** @type {Map<string, { engine: string, market: string, board: string }>} */
const locationBySymbol =
new Map();

function readSymbolsCache(){

try{

const raw =
localStorage.getItem(
SYMBOLS_CACHE_KEY
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
SYMBOLS_CACHE_KEY,
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

function rememberLocations(
instruments
){

locationBySymbol.clear();

for(
const item of
instruments
){

const sym =
toMoexSymbol(
item?.symbol ||
""
);

if(
!sym ||
!item?.engine ||
!item?.market ||
!item?.board
){
continue;
}

locationBySymbol.set(
sym,
{
engine:
item.engine,
market:
item.market,
board:
item.board
}
);

}

}

function dispatchMoexSymbolsUpdated(
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
detail:{
exchangeId:
"moex",
symbols:
instruments
}
}
)
);

}

/**
 * @param {import("./listings.js").MoexBoardSpec} spec
 */
async function loadBoardInstruments(
spec
){

const basePath =
moexBoardSecuritiesPath(
spec.engine,
spec.market,
spec.board
);
const maxPages =
Number(
spec.maxPages
) > 0
? Number(
spec.maxPages
)
: 5;

const mdBySecid =
new Map();
const securities =
[];

for(
let page =
0;
page <
maxPages;
page++
){

const json =
await fetchMoex(
`${basePath}?iss.meta=off&start=${page * 100}`,
{
timeoutMs:
12000,
retries:
1
}
);

const secRows =
issBlockToRows(
json?.securities
);
const mdRows =
issBlockToRows(
json?.marketdata
);

for(
const row of
mdRows
){

const id =
toMoexSymbol(
row?.SECID ||
""
);

if(
id
){
mdBySecid.set(
id,
row
);
}

}

if(
!secRows.length
){
break;
}

securities.push(
...secRows
);

if(
secRows.length <
100
){
break;
}

}

const out =
[];
const seen =
new Set();

for(
const sec of
securities
){

const item =
normalizeMoexInstrument(
sec,
mdBySecid.get(
toMoexSymbol(
sec?.SECID ||
""
)
) ||
null,
spec
);

if(
!item ||
seen.has(
item.symbol
)
){
continue;
}

seen.add(
item.symbol
);
out.push(
item
);

}

return out;

}

function mergeInstrumentLists(
...batches
){

const merged =
[];
const seen =
new Set();

for(
const batch of
batches
){

for(
const item of
batch ||
[]
){

if(
!item?.symbol ||
seen.has(
item.symbol
)
){
continue;
}

seen.add(
item.symbol
);
merged.push(
item
);

}

}

return merged;

}

let symbolsInflight =
null;

async function loadAllInstrumentsFromNetwork(
{
onPartial
} = {}
){

const primary =
MOEX_BOARD_SPECS[
0
];
const rest =
MOEX_BOARD_SPECS.slice(
1
);

/* Page 0 TQBR → сразу в UI (~0.5–2с), остальное догружаем. */
const primaryFirst =
await loadBoardInstruments({
...primary,
maxPages:
1
}).catch(
()=>
[]
);

if(
typeof onPartial ===
"function" &&
primaryFirst.length
){
onPartial(
primaryFirst
);
}

const [
primaryRest,
...more
] =
await Promise.all(
[
loadBoardInstruments(
primary
).catch(
()=>
[]
),
...rest.map(
spec=>
loadBoardInstruments(
spec
).catch(
()=>
[]
)
)
]
);

return mergeInstrumentLists(
primaryFirst,
primaryRest,
...more
);

}

export async function loadMoexSymbols(
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
rememberLocations(
cached
);
return cached;
}

}

if(
symbolsInflight
){
return symbolsInflight;
}

symbolsInflight =
(
async()=>{

const instruments =
await loadAllInstrumentsFromNetwork(
{
onPartial:(
partial
)=>{

rememberLocations(
partial
);
writeSymbolsCache(
partial
);
dispatchMoexSymbolsUpdated(
partial
);

}
}
);

writeSymbolsCache(
instruments
);
rememberLocations(
instruments
);
dispatchMoexSymbolsUpdated(
instruments
);

return instruments;

}
)().finally(
()=>{
symbolsInflight =
null;
}
);

return symbolsInflight;

}

function resolveInstrumentLocation(
symbol
){

const sym =
toMoexSymbol(
symbol
);

const fromMap =
locationBySymbol.get(
sym
);

if(
fromMap
){
return {
symbol:
sym,
...fromMap
};
}

const cached =
readSymbolsCache();

if(
cached?.length
){
rememberLocations(
cached
);
const again =
locationBySymbol.get(
sym
);

if(
again
){
return {
symbol:
sym,
...again
};
}
}

/* Fallback: акции TQBR — самый частый кейс. */
return {
symbol:
sym,
engine:
"stock",
market:
"shares",
board:
"TQBR"
};

}

function parseMoexBeginToSec(
begin
){

const s =
String(
begin ||
""
).trim();

if(
!s
){
return 0;
}

/* "2024-01-15 10:00:00" — Moscow local wall time without TZ.
   Парсим как UTC+3 приблизительно через Date с явным offset. */
const m =
s.match(
/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?/
);

if(
!m
){

const t =
Date.parse(
s
);

return Number.isFinite(
t
)
? Math.floor(
t /
1000
)
: 0;

}

const y =
Number(
m[
1
]
);
const mo =
Number(
m[
2
]
) -
1;
const d =
Number(
m[
3
]
);
const hh =
Number(
m[
4
] ||
0
);
const mm =
Number(
m[
5
] ||
0
);
const ss =
Number(
m[
6
] ||
0
);

/* ISS begin — московское время (MSK, UTC+3, без перехода на летнее). */
const utcMs =
Date.UTC(
y,
mo,
d,
hh,
mm,
ss
) -
3 *
60 *
60 *
1000;

return Math.floor(
utcMs /
1000
);

}

function normalizeMoexCandleRows(
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

const time =
parseMoexBeginToSec(
row?.begin ||
row?.BEGIN
);

if(
!time
){
return null;
}

return {
time,
open:
Number(
row.open ??
row.OPEN
),
high:
Number(
row.high ??
row.HIGH
),
low:
Number(
row.low ??
row.LOW
),
close:
Number(
row.close ??
row.CLOSE
),
volume:
Number(
row.volume ??
row.VOLUME ??
row.value ??
row.VALUE ??
0
) ||
0
};

}
)
.filter(
row=>
row &&
Number.isFinite(
row.open
) &&
Number.isFinite(
row.close
)
);

}

function formatMoexDateTime(
ms
){

const d =
new Date(
ms +
3 *
60 *
60 *
1000
);

const pad =
n=>
String(
n
).padStart(
2,
"0"
);

return `${d.getUTCFullYear()}-${pad(
d.getUTCMonth() +
1
)}-${pad(
d.getUTCDate()
)} ${pad(
d.getUTCHours()
)}:${pad(
d.getUTCMinutes()
)}:${pad(
d.getUTCSeconds()
)}`;

}

async function fetchMoexCandlePage(
loc,
interval,
tillMs,
start =
0
){

const till =
formatMoexDateTime(
tillMs
);
/* ISS обычно отдаёт до ~500 свечей за запрос. */
const fromMs =
tillMs -
moexIntervalMs(
interval
) *
500;
const path =
moexCandlesPath(
loc,
interval,
{
from:
formatMoexDateTime(
fromMs
),
till,
start
}
);

const json =
await fetchMoex(
path,
{
timeoutMs:
12000,
retries:
0
}
);

return normalizeMoexCandleRows(
issBlockToRows(
json?.candles
)
);

}

export async function loadMoexHistory(
symbol,
tf,
requests =
6,
options =
{}
){

const loc =
resolveInstrumentLocation(
symbol
);
const interval =
tfToMoexInterval(
tf
);
const intervalMs =
moexIntervalMs(
interval
);
let tillMs =
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

const pages =
Math.min(
Math.max(
1,
Number(
requests
) ||
6
),
8
);

/*
  Параллельные окна по фактическому interval ISS
  (UI TF может мапиться, напр. 5m → 1m).
*/
const pageSpanMs =
intervalMs *
500;
const pageEnds =
[];

for(
let i =
0;
i <
pages;
i++
){
pageEnds.push(
tillMs -
i *
pageSpanMs
);
}

const batches =
await Promise.all(
pageEnds.map(
async pageEnd=>{

try{
return await fetchMoexCandlePage(
loc,
interval,
pageEnd,
0
);
}catch{
return [];
}

}
)
);

const all =
[];

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

const unique =
new Map();

all.forEach(
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

async function fetchMoexDailyCandles(
symbol,
limit =
375
){

const loc =
resolveInstrumentLocation(
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
500
);
const tillMs =
Date.now();
const fromMs =
tillMs -
capped *
24 *
60 *
60 *
1000;
const path =
moexCandlesPath(
loc,
24,
{
from:
formatMoexDateTime(
fromMs
),
till:
formatMoexDateTime(
tillMs
)
}
);

try{

const json =
await fetchMoex(
path,
{
timeoutMs:
20000,
retries:
1
}
);
const rows =
normalizeMoexCandleRows(
issBlockToRows(
json?.candles
)
);

if(
!rows.length
){
return null;
}

return rows
.slice(
-capped
)
.map(
row=>({
time:
row.time,
open:
row.open,
close:
row.close
})
);

}catch{
return null;
}

}

export async function loadMoexTickers(){

const instruments =
await loadMoexSymbols();
const map =
new Map();

for(
const item of
instruments
){

const sym =
toMoexSymbol(
item.symbol
);

if(
!sym
){
continue;
}

map.set(
sym,
{
symbol:
sym,
lastPrice:
item.last,
price24hPcnt:
(
Number(
item.changePct
) ||
0
) /
100,
turnover24h:
item.volume24,
highPrice24h:
0,
lowPrice24h:
0,
bid1Price:
item.last,
ask1Price:
item.last,
shortname:
item.shortname
}
);

}

return map;

}

/**
 * Лёгкий poll котировок — только первая страница каждого борда.
 */
export async function refreshMoexMarketdata(){

const instruments =
await loadMoexSymbols();

if(
!instruments.length
){
return instruments;
}

const byKey =
new Map(
instruments.map(
item=>
[
`${item.board}:${item.symbol}`,
item
]
)
);

await Promise.all(
MOEX_BOARD_SPECS.map(
async spec=>{

const basePath =
moexBoardSecuritiesPath(
spec.engine,
spec.market,
spec.board
);
const pages =
Math.min(
2,
Number(
spec.maxPages
) ||
2
);

for(
let page =
0;
page <
pages;
page++
){

try{

const json =
await fetchMoex(
`${basePath}?iss.meta=off&start=${page * 100}`,
{
timeoutMs:
10000,
retries:
0
}
);
const mdRows =
issBlockToRows(
json?.marketdata
);

if(
!mdRows.length
){
break;
}

for(
const md of
mdRows
){

const sym =
toMoexSymbol(
md?.SECID ||
""
);
const item =
byKey.get(
`${spec.board}:${sym}`
);

if(
!item
){
continue;
}

item.last =
Number(
md?.LAST ??
md?.CURRENTVALUE ??
item.last
) ||
item.last;
item.changePct =
Number(
md?.LASTCHANGEPRCNT ??
md?.LASTTOPREVPRICE ??
md?.CHANGE ??
item.changePct
) ||
item.changePct;
item.volume24 =
Number(
md?.VALTODAY_RUR ??
md?.VALTODAY ??
md?.VALUE ??
md?.VOLTODAY ??
item.volume24
) ||
item.volume24;

}

if(
mdRows.length <
100
){
break;
}

}catch{
break;
}

}

}
)
);

const next =
[
...byKey.values()
];

writeSymbolsCache(
next
);
rememberLocations(
next
);

return next;

}

export const moexPublicAdapter =
{

id:
"moex",

async loadHistory(
symbol,
tf,
requests,
options
){

return loadMoexHistory(
symbol,
tf,
requests,
options
);

},

async loadSymbols(
options
){

return loadMoexSymbols(
options
);

},

buildMarketLists(
instruments
){

return buildMoexMarketLists(
instruments
);

},

async loadOrderbook(){

return {
bids:[],
asks:[]
};

},

async loadTickers(){

const now =
Date.now();

if(
now -
lastMarketdataRefreshAt >=
MARKETDATA_REFRESH_MIN_MS
){
await refreshMoexMarketdata().catch(
()=>
null
);
lastMarketdataRefreshAt =
Date.now();
}

return loadMoexTickers();

},

async pingPublic(){

return pingMoexPublic();

},

async fetchDailyCandles(
symbol,
limit
){

return fetchMoexDailyCandles(
symbol,
limit
);

}

};

export {
tfToMoexInterval
} from "./intervals.js?v=1";
