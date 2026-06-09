/**
 * Фоновый пересчёт статистики: продолжается при переходе на другие страницы сайта
 * (site-boot вызывает resumeStatsBackgroundJob на каждой загрузке).
 */
import {
fetchTickersInto
} from "./tickers.js?v=21";

import {
fetchBybit
} from "./bybit-fetch.js?v=13";

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

const SYMBOL_DELAY_MS =
220;

const MIN_KLINE_SAMPLES =
3;

const CACHE_KEY_PREFIX =
"stats_movers_";

const JOB_STORAGE_KEY =
"stats_bg_job_v1";

let localRunnerGen =
0;

let localRunnerActive =
false;

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

let nextKlineSlot =
0;

async function acquireKlineSlot(){

const now =
Date.now();

const slot =
Math.max(
now,
nextKlineSlot
);

nextKlineSlot =
slot +
SYMBOL_DELAY_MS;

const wait =
slot -
now;

if(
wait >
0
){
await sleep(
wait
);
}

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
"1d",
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
symbol,
periodDays
){

const limit =
Math.min(
1000,
periodDays +
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

await acquireKlineSlot();

try{

const { json } =
await fetchBybit(
path,
{
timeoutMs:15000,
retries:0,
sequential:true
}
);

if(
isBybitRateLimit(
json
)
){
await sleep(
2000 *
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
1500 *
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
!job.resume.symbols.length ||
nextIndex <=
0
){
return null;
}

return {
...job.resume,
nextIndex
};

}

async function loadMoversForPeriod(
period,
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

if(
savedResume
){

symbols =
savedResume.symbols;
tickersMap =
tickersFromPlain(
savedResume.tickers
);

const resumedDone =
savedResume.nextIndex;

patchJobState({
total:symbols.length,
done:resumedDone
});

onProgress?.(
resumedDone,
symbols.length
);

}else{

const tickers =
new Map();

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

if(
period !==
"1d"
){

patchJobState({
total:symbols.length,
done:0,
resume:{
symbols,
tickers:tickersToPlain(
tickersMap
),
rows:[],
nextIndex:0
}
});

}

}

if(
period ===
"1d"
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
period,
top
);

patchJobState({
done:symbols.length,
total:symbols.length,
resume:null
});

return top;

}

const days =
PERIOD_DAYS[
period
] ||
1;

const resume =
savedResume ||
readJobState()?.resume;

let rows =
Array.isArray(
resume?.rows
)
? [
...resume.rows
]
: [];

let startIndex =
Math.max(
0,
Number(
resume?.nextIndex ||
0
)
);

const symbolList =
symbols.length
? symbols
: (
Array.isArray(
resume?.symbols
)
? resume.symbols
: []
);

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
rows,
nextIndex:done
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
symbol,
days
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

const change =
periodChangeFromDaily(
candles,
days,
currentPrice
);

if(
change &&
change.pct >
0
){
rows.push({
symbol,
...change
});
successCount++;
}else{
successCount++;
}

}

done++;
patchJobState({
done,
resume:{
symbols:symbolList,
tickers:tickersToPlain(
tickersMap
),
rows,
nextIndex:done
}
});
onProgress?.(
done,
symbolList.length
);

};

for(
let i =
startIndex;
i <
symbolList.length;
i++
){

await processSymbol(
symbolList[
i
]
);

if(
isJobCancelled(
gen
)
){
return null;
}

}

if(
isJobCancelled(
gen
)
){
return null;
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

if(
top.length
){
writeCache(
period,
top
);
}else if(
failCount >
symbolList.length *
0.5 ||
successCount ===
0
){
throw new Error(
"Bybit временно ограничил запросы. Подождите 2–3 минуты и выберите период снова."
);
}

patchJobState({
resume:null
});

return top;

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
state.period;

await loadMoversForPeriod(
period,
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

export function startStatsBackgroundRefresh(
period
){

const gen =
Date.now();

writeJobState({
period,
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
