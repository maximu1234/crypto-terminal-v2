import {
fetchTickersInto
} from "./tickers.js?v=21";

import {
fetchBybit
} from "./bybit-fetch.js?v=13";

const PERIOD_DAYS = {
"1d":1,
"1w":7,
"1m":30,
"1y":365
};

const PERIOD_LABELS = {
"1d":"1 день",
"1w":"1 неделю",
"1m":"1 месяц",
"1y":"1 год"
};

const POOL_SIZE =
2;

const SYMBOL_DELAY_MS =
220;

const MIN_KLINE_SAMPLES =
3;

const statusEl =
document.getElementById(
"statistics-status"
);

const rowsEl =
document.getElementById(
"statistics-rows"
);

const periodTabs =
document.querySelector(
".stats-period-tabs"
);

const refreshBtn =
document.getElementById(
"statistics-refresh"
);

let activePeriod =
"1d";

let loadToken =
0;

let isRefreshing =
false;

function setStatus(
text,
isError = false,
isLoading = false
){

if(
!statusEl
){
return;
}

statusEl.textContent = text;
statusEl.classList.toggle(
"is-error",
isError
);
statusEl.classList.toggle(
"is-loading",
!isError &&
isLoading
);

}

function baseAssetFromSymbol(
symbol
){

let base =
String(
symbol ||
""
).replace(
/USDT$/,
""
);

if(
base.startsWith(
"10000"
)
){
base =
base.slice(
5
);
}else if(
base.startsWith(
"1000"
)
){
base =
base.slice(
4
);
}else if(
base.startsWith(
"100"
)
){
base =
base.slice(
3
);
}

return base;

}

function coinIconUrl(
base
){

const key =
String(
base ||
""
).toLowerCase();

if(
!key
){
return "";
}

return `https://cdn.jsdelivr.net/gh/atomiclabs/cryptocurrency-icons@master/32/color/${key}.png`;

}

function trimTrailingZeros(
value
){

return String(
value
).replace(
/(\.\d*?)0+$/,
"$1"
).replace(
/\.$/,
""
);

}

function addThousandsSeparators(
value
){

const parts =
String(
value
).split(
"."
);

parts[0] =
parts[0].replace(
/\B(?=(\d{3})+(?!\d))/g,
","
);

return parts.length >
1
? parts.join(
"."
)
: parts[0];

}

export function formatStatPrice(
price
){

if(
!Number.isFinite(
price
)
){
return "—";
}

const negative =
price <
0;

const abs =
Math.abs(
price
);

let formatted;

if(
abs >=
1000
){
formatted =
abs.toFixed(
0
);
}else if(
abs >=
1
){
formatted =
trimTrailingZeros(
abs.toFixed(
4
)
);
}else if(
abs >=
0.01
){
formatted =
trimTrailingZeros(
abs.toFixed(
6
)
);
}else{
formatted =
trimTrailingZeros(
abs.toFixed(
8
)
);
}

const withCommas =
addThousandsSeparators(
formatted
);

return negative
? `-$${withCommas}`
: `$${withCommas}`;

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

async function runPool(
items,
size,
worker
){

const results =
[];

let index =
0;

async function runner(){

while(
index <
items.length
){

const i =
index++;
results[
i
] =
await worker(
items[
i
],
i
);
}

}

const runners =
Array.from(
{
length:Math.min(
size,
items.length
)
},
()=>
runner()
);

await Promise.all(
runners
);

return results;

}

const CACHE_KEY_PREFIX =
"stats_movers_";

function cacheStorageKey(
period
){

return `${CACHE_KEY_PREFIX}${period}`;

}

function readCacheEntry(
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

function readCacheAny(
period
){

return readCacheEntry(
period
)?.rows ??
null;

}

function formatCacheTime(
at
){

if(
!Number.isFinite(
at
) ||
at <=
0
){
return "";
}

return new Date(
at
).toLocaleString(
"ru-RU",
{
day:"numeric",
month:"short",
hour:"2-digit",
minute:"2-digit"
}
);

}

function formatCacheStatus(
period,
entry
){

if(
!entry?.rows?.length
){
return "Нет сохранённых данных · нажмите «Обновить данные»";
}

const when =
formatCacheTime(
entry.at
);

const whenLabel =
when
? ` · обновлено ${when}`
: "";

return `Кэш · ${PERIOD_LABELS[period]} · ${entry.rows.length} ${entry.rows.length === 1 ? "монета" : entry.rows.length < 5 ? "монеты" : "монет"}${whenLabel}`;

}

function setRefreshBusy(
busy
){

isRefreshing = !!busy;

if(
refreshBtn
){
refreshBtn.disabled = busy;
}

}

function writeCache(
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

function formatReadyStatus(
period,
count
){

return `Bybit linear · ${PERIOD_LABELS[period]} · ${count} ${count === 1 ? "монета" : count < 5 ? "монеты" : "монет"}`;

}

async function loadMoversForPeriod(
period,
onProgress
){

const tickers =
new Map();

await fetchTickersInto(
tickers
);

const symbols =
[
...tickers.keys()
].filter(
symbol=>
symbol.endsWith(
"USDT"
)
);

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
tickers.get(
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

return top;

}

const days =
PERIOD_DAYS[
period
] ||
1;

const rows =
[];

let done =
0;

let successCount =
0;

let failCount =
0;

await runPool(
symbols,
POOL_SIZE,
async symbol=>{

const tick =
tickers.get(
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
onProgress?.(
done,
symbols.length
);
return;
}

const candles =
await fetchDailyCandles(
symbol,
days
);

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
onProgress?.(
done,
symbols.length
);

}
);

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
symbols.length *
0.5 ||
successCount ===
0
){
throw new Error(
"Bybit временно ограничил запросы. Подождите 2–3 минуты и выберите период снова."
);
}

return top;

}

function createCoinIcon(
base,
className
){

const url =
coinIconUrl(
base
);

const img =
document.createElement(
"img"
);

img.className = className;
img.alt = "";
img.loading = "lazy";
img.decoding = "async";

if(
url
){
img.src = url;
img.addEventListener(
"error",
()=>{
const fallback =
document.createElement(
"span"
);

fallback.className =
className.includes(
"move"
)
? "stats-coin-fallback stats-move-icon"
: "stats-coin-fallback";

fallback.textContent =
base.slice(
0,
2
).toUpperCase();

img.replaceWith(
fallback
);
},
{
once:true
}
);
}else{

const fallback =
document.createElement(
"span"
);

fallback.className = "stats-coin-fallback";
fallback.textContent =
base.slice(
0,
2
).toUpperCase();

return fallback;

}

return img;

}

function renderRows(
rows
){

if(
!rowsEl
){
return;
}

rowsEl.innerHTML = "";

if(
!rows.length
){

const empty =
document.createElement(
"div"
);

empty.className = "stats-empty";
empty.textContent =
"Нет сохранённых данных. Нажмите «Обновить данные».";

rowsEl.appendChild(
empty
);

return;

}

const maxPct =
Math.max(
...rows.map(
row=>
row.pct
),
1
);

for(
const row of
rows
){

const base =
baseAssetFromSymbol(
row.symbol
);

const rowEl =
document.createElement(
"div"
);

rowEl.className = "stats-row";

const symbolLink =
document.createElement(
"a"
);

symbolLink.className = "stats-symbol";
symbolLink.href =
`/coins.html?symbol=${encodeURIComponent(row.symbol)}`;
symbolLink.append(
createCoinIcon(
base,
"stats-coin-icon"
)
);

const name =
document.createElement(
"span"
);

name.className = "stats-symbol-name";
name.textContent = base;

symbolLink.appendChild(
name
);

const barCell =
document.createElement(
"div"
);

barCell.className = "stats-bar-cell";

const bar =
document.createElement(
"div"
);

bar.className = "stats-bar";

const barWidth =
Math.max(
8,
Math.round(
(
row.pct /
maxPct
) *
100
)
);

bar.style.width = `${barWidth}%`;

const pct =
document.createElement(
"span"
);

pct.className = "stats-pct";
pct.textContent = `${Math.round(row.pct)}%`;

bar.appendChild(
pct
);
barCell.appendChild(
bar
);

const move =
document.createElement(
"div"
);

move.className = "stats-move";

move.append(
createCoinIcon(
base,
"stats-move-icon"
)
);

const prices =
document.createElement(
"div"
);

prices.className = "stats-move-prices";

const startPrice =
document.createElement(
"span"
);

startPrice.className = "stats-move-start";
startPrice.textContent =
formatStatPrice(
row.startPrice
);

const arrow =
document.createElement(
"span"
);

arrow.className = "stats-arrow";
arrow.textContent = "→";

const endPrice =
document.createElement(
"span"
);

endPrice.className = "stats-move-end";
endPrice.textContent =
formatStatPrice(
row.endPrice
);

prices.append(
startPrice,
arrow,
endPrice
);

move.appendChild(
prices
);

rowEl.append(
symbolLink,
barCell,
move
);

rowsEl.appendChild(
rowEl
);

}

}

function showPeriodFromCache(
period
){

activePeriod = period;

const entry =
readCacheEntry(
period
);

if(
entry?.rows?.length
){

renderRows(
entry.rows
);

}else if(
rowsEl
){

rowsEl.innerHTML = "";
renderRows(
[]
);

}

setStatus(
formatCacheStatus(
period,
entry
)
);

}

async function refreshPeriod(
period = activePeriod
){

if(
isRefreshing
){
return;
}

const token =
++loadToken;

const entry =
readCacheEntry(
period
);

const hasCache =
!!(
entry?.rows?.length
);

setRefreshBusy(
true
);

if(
hasCache
){

setStatus(
period ===
"1d"
? "Обновляем…"
: "Считаем движение…",
false,
true
);

}else{

setStatus(
period ===
"1d"
? `Загрузка с Bybit за ${PERIOD_LABELS[period] || period}…`
: `Загрузка истории за ${PERIOD_LABELS[period] || period}… (1–2 мин)`,
false,
period !==
"1d"
);

if(
rowsEl
){
rowsEl.innerHTML = "";
}

}

try{

const rows =
await loadMoversForPeriod(
period,
(
done,
total
)=>{

if(
token !==
loadToken
){
return;
}

if(
period ===
"1d"
){
setStatus(
"Обновляем…",
false,
true
);
return;
}

setStatus(
`Считаем движение… ${done} / ${total}`,
false,
true
);

}
);

if(
token !==
loadToken
){
return;
}

renderRows(
rows
);

const fresh =
readCacheEntry(
period
);

setStatus(
fresh
? formatCacheStatus(
period,
fresh
)
: formatReadyStatus(
period,
rows.length
)
);

}catch(
err
){

console.error(
err
);

if(
token !==
loadToken
){
return;
}

setStatus(
err?.message ||
"Не удалось загрузить данные Bybit",
true
);

if(
!hasCache
){
showPeriodFromCache(
period
);
}

}finally{
setRefreshBusy(
false
);
}

}

function bindPeriodTabs(){

if(
!periodTabs
){
return;
}

periodTabs.addEventListener(
"click",
event=>{

const btn =
event.target.closest(
".stats-period-btn"
);

if(
!btn
){
return;
}

const period =
btn.dataset.period;

if(
!period ||
period ===
activePeriod
){
return;
}

periodTabs.querySelectorAll(
".stats-period-btn"
).forEach(
tab=>{
const active =
tab ===
btn;

tab.classList.toggle(
"active",
active
);
tab.setAttribute(
"aria-selected",
active
? "true"
: "false"
);
}
);

++loadToken;
setRefreshBusy(
false
);
showPeriodFromCache(
period
);

}
);

}

function bindRefreshButton(){

if(
!refreshBtn
){
return;
}

refreshBtn.addEventListener(
"click",
()=>{
refreshPeriod(
activePeriod
);
}
);

}

function init(){

bindPeriodTabs();
bindRefreshButton();
showPeriodFromCache(
"1d"
);

}

init();

function clearStatsCache(
period =
null
){

const removeKey =
key=>{
try{
localStorage.removeItem(
key
);
sessionStorage.removeItem(
key
);
}catch{
/* ignore */
}
};

if(
period
){
removeKey(
cacheStorageKey(
period
)
);
return;
}

for(
const p of
[
"1d",
"1w",
"1m",
"1y"
]
){
removeKey(
cacheStorageKey(
p
)
);
}

}

document.addEventListener(
"bybit-network-retry",
()=>{

if(
isRefreshing
){
return;
}

setStatus(
"Сеть восстановлена · нажмите «Обновить данные»"
);

}
);
