/**
 * Фоновый пересчёт статистики: продолжается при переходе на другие страницы сайта
 * (site-boot вызывает resumeStatsBackgroundJob на каждой загрузке).
 */
import {
fetchTickersInto
} from "./tickers.js?v=23";

import {
fetchBybitBulk
} from "./bybit-fetch.js?v=17";

export const STATS_JOB_UPDATE_EVENT =
"stats-job-update";

export const PERIOD_DAYS = {
"1d":1,
"1w":7,
"1m":30,
"1y":365
};

export const PERIOD_LABELS = {
"1d":"1 день",
"1w":"1 неделю",
"1m":"1 месяц",
"1y":"1 год"
};

const MIN_KLINE_SAMPLES =
3;

/** Параллельных kline-запросов (Bybit linear, один path на монету). */
const STATS_KLINE_CONCURRENCY =
8;

/** Пауза после retCode 10006 — общая для всех воркеров. */
const STATS_RATE_LIMIT_BASE_MS =
1500;

const STATS_PARTIAL_CACHE_EVERY =
40;

const CACHE_KEY_PREFIX =
"stats_movers_";

const JOB_STORAGE_KEY =
"stats_bg_job_v2";

/** Единый job: 1d из тикеров + 1w/1m/1y из одного kline-запроса на монету. */
export const STATS_JOB_PERIOD_ALL =
"all";

export const STATS_KLINE_PERIODS =
Object.freeze([
"1w",
"1m",
"1y"
]);

const STATS_KLINE_FETCH_DAYS =
PERIOD_DAYS[
"1y"
];

let localRunnerGen =
0;

let localRunnerActive =
false;

let bulkRateLimitUntil =
0;

async function waitForBulkRateLimit(){

const wait =
bulkRateLimitUntil -
Date.now();

if(
wait >
0
){
await sleep(
wait
);
}

}

function noteBulkRateLimit(
delayMs = STATS_RATE_LIMIT_BASE_MS
){

bulkRateLimitUntil =
Math.max(
bulkRateLimitUntil,
Date.now() +
delayMs
);

}

async function runSymbolPool(
items,
worker,
concurrency
){

let cursor =
0;

const runners =
Array.from(
{
length: Math.min(
concurrency,
Math.max(
1,
items.length
)
)
},
async ()=>{

while(
true
){

const i =
cursor++;

if(
i >=
items.length
){
return;
}

await worker(
items[
i
]
);

}

}
);

await Promise.all(
runners
);

}

function sleep(
ms
){

return new Promise(
resolve=>
setTimeout(
resolve,
ms
)
);

}

function isBybitRateLimit(
json
){

const code =
Number(
json?.retCode
);

const msg =
String(
json?.retMsg ||
""
).toLowerCase();

return (
code ===
10006 ||
msg.includes(
"too many"
) ||
msg.includes(
"too frequent"
) ||
msg.includes(
"access too frequent"
)
);

}

export function cacheStorageKey(
period
){

return `${CACHE_KEY_PREFIX}${period}`;

}

export function readCacheEntry(
period
){

const key =
cacheStorageKey(
period
);

try{

let raw =
localStorage.getItem(
key
);

if(
!raw
){
raw =
sessionStorage.getItem(
key
);

if(
raw
){
try{
localStorage.setItem(
key,
raw
);
sessionStorage.removeItem(
key
);
}catch{
/* ignore */
}

}

}

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
!Array.isArray(
parsed?.rows
) ||
!parsed.rows.length
){
return null;
}

return {
rows:parsed.rows,
at:Number(
parsed?.at ||
0
)
};

}catch{
return null;
}

}

export function writeCache(
period,
rows
){

try{

localStorage.setItem(
cacheStorageKey(
period
),
JSON.stringify({
at:Date.now(),
rows
})
);

}catch{
/* ignore */
}

}

function readJobState(){

try{

const raw =
sessionStorage.getItem(
JOB_STORAGE_KEY
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
!parsed ||
typeof parsed !==
"object"
){
return null;
}

return parsed;

}catch{
return null;
}

}

function writeJobState(
state
){

try{

if(
!state
){
sessionStorage.removeItem(
JOB_STORAGE_KEY
);
}else{
sessionStorage.setItem(
JOB_STORAGE_KEY,
JSON.stringify(
state
)
);
}

}catch{
/* ignore */
}

dispatchJobUpdate();

}

function dispatchJobUpdate(){

if(
typeof window ===
"undefined"
){
return;
}

window.dispatchEvent(
new CustomEvent(
STATS_JOB_UPDATE_EVENT,
{
detail:getStatsJobState()
}
)
);

}

export function getStatsJobState(){

const state =
readJobState();

if(
!state
){
return null;
}

const resumeDone =
Number(
state.resume?.nextIndex ||
0
);

const done =
Math.max(
Number(
state.done ||
0
),
resumeDone
);

return {
period:state.period ||
STATS_JOB_PERIOD_ALL,
phase:state.phase ||
null,
status:state.status ||
"idle",
gen:Number(
state.gen ||
0
),
done,
total:Number(
state.total ||
0
) ||
Number(
state.resume?.symbols?.length ||
0
),
startedAt:Number(
state.startedAt ||
0
),
finishedAt:
state.finishedAt !=
null
? Number(
state.finishedAt
)
: null,
error:
state.error ??
null
};

}

function patchJobState(
patch
){

const prev =
readJobState() ||
{};

writeJobState({
...prev,
...patch
});

}

function isJobCancelled(
gen
){

const cur =
readJobState();

return (
!cur ||
cur.gen !==
gen ||
cur.status !==
"running"
);

}

function tickersToPlain(
tickers
){

const out =
{};

for(
const [
symbol,
tick
] of
tickers
){

out[
symbol
] = {
price:Number(
tick?.price
),
change24:Number(
tick?.change24
)
};

}

return out;

}

function tickersFromPlain(
plain
){

const map =
new Map();

if(
!plain ||
typeof plain !==
"object"
){
return map;
}

for(
const [
symbol,
tick
] of
Object.entries(
plain
)
){

map.set(
symbol,
{
price:Number(
tick?.price
),
change24:Number(
tick?.change24
)
}
);

}

return map;

}

function periodChangeFromTicker(
tick
){

const endPrice =
Number(
tick?.price
);

const pct =
Number(
tick?.change24
);

if(
!Number.isFinite(
endPrice
) ||
endPrice <=
0 ||
!Number.isFinite(
pct
)
){
return null;
}

const startPrice =
endPrice /
(
1 +
pct /
100
);

if(
!Number.isFinite(
startPrice
) ||
startPrice <=
0
){
return null;
}

return {
startPrice,
endPrice,
pct
};

}

async function fetchDailyCandles(
symbol
){

const limit =
Math.min(
1000,
STATS_KLINE_FETCH_DAYS +
10
);

const path =
`/v5/market/kline?category=linear&symbol=${encodeURIComponent(symbol)}&interval=D&limit=${limit}`;

for(
let attempt =
0;
attempt <
3;
attempt++
){

await waitForBulkRateLimit();

try{

const { json } =
await fetchBybitBulk(
path,
{
timeoutMs:12000
}
);

if(
isBybitRateLimit(
json
)
){

noteBulkRateLimit(
STATS_RATE_LIMIT_BASE_MS *
(
attempt +
1
)
);
continue;
}

if(
json.retCode !==
0 ||
!json.result?.list?.length
){
return null;
}

return json.result.list
.map(
k=>({
time:Number(
k[0]
) /
1000,
open:Number(
k[1]
),
close:Number(
k[4]
)
})
)
.sort(
(
a,
b
)=>
a.time -
b.time
);

}catch{

if(
attempt <
2
){
await sleep(
600 *
(
attempt +
1
)
);
}

}

}

return null;

}

function periodChangeFromDaily(
candles,
periodDays,
currentPrice
){

if(
!Array.isArray(
candles
) ||
!candles.length ||
!Number.isFinite(
currentPrice
) ||
currentPrice <=
0
){
return null;
}

const lookback =
Math.min(
periodDays,
candles.length -
1
);

if(
lookback <
1
){
return null;
}

const startIdx =
candles.length -
1 -
lookback;

const startCandle =
candles[
startIdx
];

const startPrice =
Number(
startCandle?.open ??
startCandle?.close
);

if(
!Number.isFinite(
startPrice
) ||
startPrice <=
0
){
return null;
}

const pct =
(
(
currentPrice -
startPrice
) /
startPrice
) *
100;

return {
startPrice,
endPrice:currentPrice,
pct
};

}

function canResumeJob(
gen
){

const job =
readJobState();

if(
!job ||
job.gen !==
gen ||
!job.resume
){
return null;
}

const nextIndex =
Math.max(
0,
Number(
job.resume.nextIndex ||
0
)
);

if(
!Array.isArray(
job.resume.symbols
) ||
!job.resume.symbols.length
){
return null;
}

const day1Done =
!!job.resume.day1Done;

if(
nextIndex <=
0 &&
!day1Done
){
return null;
}

return {
...job.resume,
nextIndex
};

}

function emptyRowsByPeriod(){

return {
"1w":[],
"1m":[],
"1y":[]
};

}

function cloneRowsByPeriod(
source
){

const out =
emptyRowsByPeriod();

for(
const period of
STATS_KLINE_PERIODS
){

out[
period
] = Array.isArray(
source?.[
period
]
)
? [
...source[
period
]
]
: [];

}

return out;

}

function topMoversFromRows(
rows
){

return [
...rows
].sort(
(
a,
b
)=>
b.pct -
a.pct
).slice(
0,
100
);

}

function writeKlinePeriodCaches(
rowsByPeriod
){

for(
const period of
STATS_KLINE_PERIODS
){

const top =
topMoversFromRows(
rowsByPeriod[
period
] ||
[]
);

if(
top.length
){
writeCache(
period,
top
);
}

}

}

function loadMovers1dFromTickers(
symbols,
tickersMap
){

const rows =
[];

for(
const symbol of
symbols
){

const tick =
tickersMap.get(
symbol
);

const change =
periodChangeFromTicker(
tick
);

if(
!change ||
change.pct <=
0
){
continue;
}

rows.push({
symbol,
...change
});

}

rows.sort(
(
a,
b
)=>
b.pct -
a.pct
);

const top =
rows.slice(
0,
100
);

writeCache(
"1d",
top
);

return top;

}

async function loadAllMovers(
gen,
onProgress
){

const savedResume =
canResumeJob(
gen
);

let symbols =
[];

let tickersMap =
new Map();

let rowsByPeriod =
emptyRowsByPeriod();

let startIndex =
0;

let day1Done =
false;

if(
savedResume
){

symbols =
savedResume.symbols;
tickersMap =
tickersFromPlain(
savedResume.tickers
);
rowsByPeriod =
cloneRowsByPeriod(
savedResume.rowsByPeriod
);
startIndex =
Math.max(
0,
Number(
savedResume.nextIndex ||
0
)
);
day1Done =
!!savedResume.day1Done;

const resumedDone =
day1Done
? startIndex
: 0;

patchJobState({
total:symbols.length,
done:resumedDone,
phase:day1Done
? "kline"
: "1d"
});

onProgress?.(
resumedDone,
symbols.length
);

}else{

const tickers =
new Map();

patchJobState({
phase:"tickers"
});

await fetchTickersInto(
tickers
);

if(
isJobCancelled(
gen
)
){
return null;
}

symbols =
[
...tickers.keys()
].filter(
symbol=>
symbol.endsWith(
"USDT"
)
);

tickersMap =
tickers;

patchJobState({
total:symbols.length,
done:0,
phase:"1d",
resume:{
symbols,
tickers:tickersToPlain(
tickersMap
),
rowsByPeriod:emptyRowsByPeriod(),
nextIndex:0,
day1Done:false
}
});

}

if(
!day1Done
){

loadMovers1dFromTickers(
symbols,
tickersMap
);

if(
isJobCancelled(
gen
)
){
return null;
}

day1Done =
true;
startIndex =
0;
rowsByPeriod =
emptyRowsByPeriod();

patchJobState({
done:0,
phase:"kline",
resume:{
symbols,
tickers:tickersToPlain(
tickersMap
),
rowsByPeriod,
nextIndex:0,
day1Done:true
}
});

onProgress?.(
0,
symbols.length
);

}

const symbolList =
symbols.length
? symbols
: [];

let done =
startIndex;

let successCount =
0;

let failCount =
0;

const processSymbol =
async symbol=>{

if(
isJobCancelled(
gen
)
){
return;
}

const tick =
tickersMap.get(
symbol
);

const currentPrice =
Number(
tick?.price
);

if(
!Number.isFinite(
currentPrice
) ||
currentPrice <=
0
){

done++;

patchJobState({
done,
resume:{
symbols:symbolList,
tickers:tickersToPlain(
tickersMap
),
rowsByPeriod,
nextIndex:done,
day1Done:true
}
});

onProgress?.(
done,
symbolList.length
);

return;

}

const candles =
await fetchDailyCandles(
symbol
);

if(
isJobCancelled(
gen
)
){
return;
}

if(
!candles ||
candles.length <
MIN_KLINE_SAMPLES
){
failCount++;
}else{

for(
const period of
STATS_KLINE_PERIODS
){

const change =
periodChangeFromDaily(
candles,
PERIOD_DAYS[
period
],
currentPrice
);

if(
change &&
change.pct >
0
){
rowsByPeriod[
period
].push({
symbol,
...change
});
}

}

successCount++;

}

done++;

patchJobState({
done,
resume:{
symbols:symbolList,
tickers:tickersToPlain(
tickersMap
),
rowsByPeriod,
nextIndex:done,
day1Done:true
}
});

onProgress?.(
done,
symbolList.length
);

if(
done %
STATS_PARTIAL_CACHE_EVERY ===
0
){
writeKlinePeriodCaches(
rowsByPeriod
);
}

};

await runSymbolPool(
symbolList.slice(
startIndex
),
processSymbol,
STATS_KLINE_CONCURRENCY
);

if(
isJobCancelled(
gen
)
){
return null;
}

writeKlinePeriodCaches(
rowsByPeriod
);

const hasAnyRows =
STATS_KLINE_PERIODS.some(
period=>
rowsByPeriod[
period
]?.length >
0
);

if(
!hasAnyRows &&
failCount >
symbolList.length *
0.85 &&
successCount <
Math.max(
10,
symbolList.length *
0.1
)
){
throw new Error(
`Bybit: не удалось загрузить данные (${failCount} из ${symbolList.length}). Подождите 2–3 минуты и попробуйте снова.`
);
}

patchJobState({
resume:null,
phase:null
});

return rowsByPeriod;

}

async function executeJob(
gen
){

if(
localRunnerActive &&
localRunnerGen ===
gen
){
return;
}

localRunnerGen =
gen;
localRunnerActive =
true;

try{

const state =
readJobState();

if(
!state ||
state.gen !==
gen ||
state.status !==
"running"
){
return;
}

const period =
state.period ||
STATS_JOB_PERIOD_ALL;

await loadAllMovers(
gen,
(
done,
total
)=>{
patchJobState({
done,
total
});
}
);

if(
isJobCancelled(
gen
)
){
return;
}

patchJobState({
status:"done",
finishedAt:Date.now(),
error:null
});

}catch(
err
){

console.error(
"stats background:",
err
);

if(
isJobCancelled(
gen
)
){
return;
}

patchJobState({
status:"error",
finishedAt:Date.now(),
error:
err?.message ||
"Не удалось загрузить данные Bybit"
});

}finally{

if(
localRunnerGen ===
gen
){
localRunnerActive =
false;
}

}

}

export function startStatsBackgroundRefresh(){

const gen =
Date.now();

writeJobState({
period:STATS_JOB_PERIOD_ALL,
phase:"tickers",
status:"running",
gen,
done:0,
total:0,
startedAt:gen,
finishedAt:null,
error:null,
resume:null
});

void executeJob(
gen
);

}

export function resumeStatsBackgroundJob(){

const state =
readJobState();

if(
!state ||
state.status !==
"running"
){
return;
}

void executeJob(
state.gen
);

}

export function clearStatsJobState(){

writeJobState(
null
);

}
