import {
PERIOD_LABELS,
STATS_JOB_UPDATE_EVENT,
readCacheEntry,
cacheStorageKey,
getStatsJobState,
startStatsBackgroundRefresh,
resumeStatsBackgroundJob
} from "./statistics-background.js?v=2";

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

function formatReadyStatus(
period,
count
){

return `Bybit linear · ${PERIOD_LABELS[period]} · ${count} ${count === 1 ? "монета" : count < 5 ? "монеты" : "монет"}`;

}

function isJobRunningForPeriod(
period
){

const job =
getStatsJobState();

return (
job?.status ===
"running" &&
job.period ===
period
);

}

function setRefreshBusy(
busy
){

if(
refreshBtn
){
refreshBtn.disabled = !!busy;
}

}

function jobProgressLabel(
job
){

if(
!job
){
return "";
}

if(
job.period ===
"1d"
){
return "Обновляем…";
}

const total =
Math.max(
job.total,
1
);

return `Считаем движение… ${job.done} / ${total}`;

}

function syncUiFromJob(){

const job =
getStatsJobState();

const runningHere =
isJobRunningForPeriod(
activePeriod
);

setRefreshBusy(
runningHere
);

if(
!job
){
return;
}

if(
job.period !==
activePeriod
){

if(
runningHere
){
return;
}

if(
job.status ===
"running"
){
setStatus(
`${jobProgressLabel(
job
)} · в фоне (${PERIOD_LABELS[job.period]}) · можно перейти на другую страницу`,
false,
true
);
}

return;

}

if(
job.status ===
"running"
){

const hasCache =
!!readCacheEntry(
activePeriod
)?.rows?.length;

setStatus(
`${jobProgressLabel(
job
)}${hasCache ? "" : ""} · можно перейти на другую страницу`,
false,
true
);

return;

}

if(
job.status ===
"error"
){

setStatus(
job.error ||
"Не удалось загрузить данные Bybit",
true
);

const entry =
readCacheEntry(
activePeriod
);

if(
entry?.rows?.length
){
renderRows(
entry.rows
);
}

return;

}

if(
job.status ===
"done"
){

const entry =
readCacheEntry(
activePeriod
);

if(
entry?.rows?.length
){

renderRows(
entry.rows
);

setStatus(
formatCacheStatus(
activePeriod,
entry
)
);

}else{

setStatus(
formatReadyStatus(
activePeriod,
0
)
);

}

}

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

const job =
getStatsJobState();

if(
job?.status ===
"running" &&
job.period ===
period
){

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

syncUiFromJob();

return;

}

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

function refreshPeriod(
period = activePeriod
){

if(
isJobRunningForPeriod(
period
)
){
return;
}

const entry =
readCacheEntry(
period
);

const hasCache =
!!(
entry?.rows?.length
);

if(
!hasCache &&
rowsEl
){
rowsEl.innerHTML = "";
}

if(
!hasCache
){

setStatus(
period ===
"1d"
? `Загрузка с Bybit за ${PERIOD_LABELS[period] || period}…`
: `Загрузка истории за ${PERIOD_LABELS[period] || period}… (1–2 мин)`,
false,
period !==
"1d"
);

}

startStatsBackgroundRefresh(
period
);
syncUiFromJob();

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

function onStatsJobUpdate(){

syncUiFromJob();
}

function init(){

bindPeriodTabs();
bindRefreshButton();

window.addEventListener(
STATS_JOB_UPDATE_EVENT,
onStatsJobUpdate
);

resumeStatsBackgroundJob();
showPeriodFromCache(
"1d"
);
syncUiFromJob();

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
getStatsJobState()?.status ===
"running"
){
return;
}

setStatus(
"Сеть восстановлена · нажмите «Обновить данные»"
);

}
);
