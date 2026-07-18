/** Bybit trade diary page. */
import {
isDesktopTradeDiaryContext
} from "../../../trade-diary-access.js?v=3";

import {
diaryDayKeyLocal,
formatDiaryDayLabel,
formatDiaryDuration,
formatDiaryPct,
formatDiaryTime,
formatDiaryUsd,
formatDiaryWeekRange,
pnlToneClass,
sideLabel,
sideToneClass
} from "../../../trade-diary-format.js?v=6";

import {
closeTradeDetail,
openTradeDetail
} from "../../../trade-diary-detail.js?v=17";

import {
mountTradeDiaryPeriodPicker
} from "./period.js?v=1";

import {
resolveInitialDiaryPeriod,
saveDiaryPeriod
} from "../../../trade-diary-storage.js?v=4";

import {
EXCHANGE_CHANGED_EVENT
} from "../../../market-api.js?v=2";

import {
initTradeDiaryNav
} from "../../../trade-diary-nav.js?v=11";

import {
openPnlShareDiaryModal,
PNL_SHARE_CONTROL_HTML
} from "../pnl-share-modal.js?v=1";

import {
getLoadedTradeExchangeModules,
loadTradeExchangeModules,
resetTradeExchangeModules
} from "../../module-router.js?v=14";

const EXCHANGE_ID =
"bybit";

function diaryMod() {
  return getLoadedTradeExchangeModules();
}

function diarySanitizeTrade(trade) {
  const fn = diaryMod()?.diarySanitizeTrade;
  return typeof fn === "function" ? fn(trade) : trade;
}

const deniedDesktopEl =
document.getElementById(
"trade-diary-denied-desktop"
);

const panelEl =
document.getElementById(
"trade-diary-panel"
);

const statusEl =
document.getElementById(
"trade-diary-status"
);

const contentEl =
document.getElementById(
"trade-diary-content"
);

const refreshBtn =
document.getElementById(
"trade-diary-refresh"
);

const periodBtn =
document.getElementById(
"trade-diary-period-btn"
);

let weekTrades =
[];
let openTradeKey =
null;
let activePeriod =
resolveInitialDiaryPeriod(
EXCHANGE_ID
);
let periodPicker =
null;
let diaryLoadingTimer =
null;
let diaryLoadingStartedAt =
0;
let diaryLoadingCachedCount =
0;
let diaryLoadingRunId =
0;
const collapsedDayKeys =
new Set();

function tradeKey(
trade
){

/* Stable across enrich: keep income listCloseTimeMs, not rewritten close. */
const closeMs =
trade?.listCloseTimeMs ??
trade?.closeTimeMs;

return `${trade.symbol}-${closeMs}-${trade.orderId ||
""}`;

}

function tradeIdentityKey(
trade
){

const sym =
String(
trade?.symbol ||
""
).toUpperCase();
const oid =
String(
trade?.orderId ||
""
).trim();

if(
sym &&
oid
){
return `id:${sym}:${oid}`;
}

return `t:${tradeKey(
trade
)}`;

}

function showOnly(
el
){

[
deniedDesktopEl,
panelEl
].forEach(
node=>{

if(
!node
){
return;
}

node.classList.toggle(
"hidden",
node !==
el
);

}
);

}

function setStatus(
text,
{
error = false,
loading = false
} = {}
){

if(
!statusEl
){
return;
}

statusEl.textContent =
text ||
"";
statusEl.classList.toggle(
"is-error",
!!error
);
statusEl.classList.toggle(
"is-loading",
!!loading &&
!error
);

panelEl?.setAttribute(
"aria-busy",
loading &&
!error
? "true"
: "false"
);

}

function stopDiaryLoadingStatus(
expectedRunId =
null
){

if(
expectedRunId !==
null &&
expectedRunId !==
diaryLoadingRunId
){
return;
}

if(
diaryLoadingTimer
){
clearInterval(
diaryLoadingTimer
);
diaryLoadingTimer =
null;
}

}

function updateDiaryLoadingStatus(){

const elapsedSec =
Math.max(
0,
Math.floor(
(
Date.now() -
diaryLoadingStartedAt
) /
1000
)
);
const cachedPrefix =
diaryLoadingCachedCount >
0
? `Показано из кэша: ${diaryLoadingCachedCount} · `
: "";
let phase =
"Загружаем сделки";

if(
elapsedSec >=
5
){
phase =
"Загружаем исполнения и направления";
}

if(
elapsedSec >=
12
){
phase =
"Обрабатываем данные биржи";
}

setStatus(
`${cachedPrefix}${phase} · ${elapsedSec} сек. · Дневник работает`,
{
loading:
true
}
);

}

function startDiaryLoadingStatus(
cachedCount =
0
){

stopDiaryLoadingStatus();
const runId =
++diaryLoadingRunId;
diaryLoadingStartedAt =
Date.now();
diaryLoadingCachedCount =
Math.max(
0,
Number(
cachedCount
) ||
0
);
updateDiaryLoadingStatus();
diaryLoadingTimer =
setInterval(
()=>{
if(
runId ===
diaryLoadingRunId
){
updateDiaryLoadingStatus();
}
},
1000
);
return runId;

}

function escapeHtml(
raw
){

return String(
raw ||
""
).replace(
/&/g,
"&amp;"
).replace(
/</g,
"&lt;"
).replace(
/>/g,
"&gt;"
).replace(
/"/g,
"&quot;"
);

}

function sumField(
rows,
key
){

return rows.reduce(
(
acc,
row
)=>
acc +
(
Number(
row[
key
]
) ||
0
),
0
);

}

function groupTradesByDay(
trades
){

const map =
new Map();

for(
const trade of
trades
){

const key =
diaryDayKeyLocal(
trade.closeTimeMs
);

if(
!map.has(
key
)
){
map.set(
key,
[]
);
}

map.get(
key
).push(
trade
);

}

return [
...map.entries()
].sort(
(
a,
b
)=>
b[
0
].localeCompare(
a[
0
]
)
);

}

function renderColHead(){

return `
<div class="trade-diary-colhead trade-diary-grid" aria-hidden="true">
<span></span>
<span>Тикер</span>
<span></span>
<span>Время</span>
<span class="trade-diary-num">PnL $</span>
<span class="trade-diary-share-col" aria-hidden="true"></span>
<span class="trade-diary-num">PnL %</span>
<span class="trade-diary-num">Com. $</span>
<span class="trade-diary-num">Long/Short</span>
</div>`;

}

function renderTradeRow(
trade
){

const key =
tradeKey(
trade
);
const isOpen =
openTradeKey ===
key;

return `
<div class="trade-diary-trade" data-trade-key="${escapeHtml(
key
)}">
<button type="button" class="trade-diary-row trade-diary-grid${isOpen
? " is-open"
: ""}" data-action="toggle-detail" aria-expanded="${isOpen
? "true"
: "false"}">
<span class="trade-diary-time">
<svg class="trade-diary-time-icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M12 7v5l3 2" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
${escapeHtml(
formatDiaryTime(
trade.closeTimeMs
)
)}
</span>
<span class="trade-diary-symbol">${escapeHtml(
trade.symbol
)}</span>
<span class="trade-diary-chart-link" data-action="open-terminal" data-symbol="${escapeHtml(
trade.symbol
)}" title="Открыть в Терминале" role="link" tabindex="-1">↗</span>
<span class="trade-diary-duration">${escapeHtml(
formatDiaryDuration(
trade.durationMs
)
)}</span>
<span class="trade-diary-pnl-wrap trade-diary-num ${pnlToneClass(
trade.pnlUsd
)}">
<span class="trade-diary-pnl-value">${escapeHtml(
formatDiaryUsd(
trade.pnlUsd
)
)}</span>
${PNL_SHARE_CONTROL_HTML}
</span>
<span class="trade-diary-share-col">${PNL_SHARE_CONTROL_HTML}</span>
<span class="trade-diary-num ${pnlToneClass(
trade.pnlPct
)}">${escapeHtml(
formatDiaryPct(
trade.pnlPct
)
)}</span>
<span class="trade-diary-num trade-diary-muted">${escapeHtml(
formatDiaryUsd(
trade.commissionUsd
)
)}</span>
<span class="trade-diary-side ${sideToneClass(
trade.side
)}">${escapeHtml(
sideLabel(
trade.side
)
)}</span>
</button>
<div class="trade-diary-detail${isOpen
? ""
: " hidden"}" data-detail-panel></div>
</div>`;

}

function renderDayBlock(
dayKey,
rows
){

const dayMs =
new Date(
`${dayKey}T12:00:00`
).getTime();
const dayPnl =
sumField(
rows,
"pnlUsd"
);
const dayCom =
sumField(
rows,
"commissionUsd"
);

const sorted =
[
...rows
].sort(
(
a,
b
)=>
b.closeTimeMs -
a.closeTimeMs
);
const isCollapsed =
collapsedDayKeys.has(
dayKey
);

return `
<section class="trade-diary-day${isCollapsed
? " is-collapsed"
: ""}" data-day-key="${escapeHtml(
dayKey
)}">
<button type="button" class="trade-diary-day-head trade-diary-grid" data-action="toggle-day" aria-expanded="${isCollapsed
? "false"
: "true"}">
<span class="trade-diary-day-label">
<svg class="trade-diary-day-chevron" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"/></svg>
${escapeHtml(
formatDiaryDayLabel(
dayMs
)
)}
</span>
<span class="trade-diary-day-pnl ${pnlToneClass(
dayPnl
)}">${escapeHtml(
formatDiaryUsd(
dayPnl
)
)}</span>
<span class="trade-diary-day-com trade-diary-muted">${escapeHtml(
formatDiaryUsd(
dayCom
)
)}</span>
</button>
<div class="trade-diary-day-trades">
<div class="trade-diary-day-trades-inner">
${sorted.map(
renderTradeRow
).join(
""
)}
</div>
</div>
</section>`;

}

function renderWeek(
trades,
rangeStartMs,
rangeEndMs
){

const weekPnl =
sumField(
trades,
"pnlUsd"
);
const weekCom =
sumField(
trades,
"commissionUsd"
);
const days =
groupTradesByDay(
trades
);

return `
<section class="trade-diary-week">
<div class="trade-diary-week-head trade-diary-grid">
<span class="trade-diary-week-range">${escapeHtml(
formatDiaryWeekRange(
rangeStartMs,
rangeEndMs
)
)}</span>
<span class="trade-diary-week-pnl ${pnlToneClass(
weekPnl
)}">${escapeHtml(
formatDiaryUsd(
weekPnl
)
)}</span>
<span class="trade-diary-week-com trade-diary-muted">${escapeHtml(
formatDiaryUsd(
weekCom
)
)}</span>
</div>
${renderColHead()}
${
days.length
? days.map(
([
dayKey,
rows
])=>
renderDayBlock(
dayKey,
rows
)
).join(
""
)
: `<div class="trade-diary-empty">За выбранный период закрытых сделок нет.</div>`
}
</section>`;

}

function findTradeByKey(
key
){

return weekTrades.find(
trade=>
tradeKey(
trade
) ===
key
);

}

function renderDiaryContent(
trades,
rangeStartMs,
rangeEndMs
){

if(
!contentEl
){
return;
}

contentEl.innerHTML =
renderWeek(
trades,
rangeStartMs,
rangeEndMs
);

if(
openTradeKey
){

const trade =
findTradeByKey(
openTradeKey
);

if(
trade
){

const wrap =
contentEl.querySelector(
`[data-trade-key="${CSS.escape(
openTradeKey
)}"]`
);
const panel =
wrap?.querySelector(
"[data-detail-panel]"
);

if(
panel
){
void openTradeDetail(
panel,
trade
);
}

}else{
openTradeKey =
null;
}

}

}

async function toggleTradeDetail(
key
){

if(
!contentEl
){
return;
}

if(
openTradeKey ===
key
){
const openWrap =
contentEl.querySelector(
`[data-trade-key="${CSS.escape(
key
)}"]`
);
const panel =
openWrap?.querySelector(
"[data-detail-panel]"
);

closeTradeDetail(
panel
);
openTradeKey =
null;

const row =
openWrap?.querySelector(
".trade-diary-row"
);

row?.classList.remove(
"is-open"
);
row?.setAttribute(
"aria-expanded",
"false"
);
return;
}

if(
openTradeKey
){

const prevWrap =
contentEl.querySelector(
`[data-trade-key="${CSS.escape(
openTradeKey
)}"]`
);
const prevPanel =
prevWrap?.querySelector(
"[data-detail-panel]"
);

closeTradeDetail(
prevPanel
);
prevWrap?.querySelector(
".trade-diary-row"
)?.classList.remove(
"is-open"
);
}

openTradeKey =
key;

const wrap =
contentEl.querySelector(
`[data-trade-key="${CSS.escape(
key
)}"]`
);
const panel =
wrap?.querySelector(
"[data-detail-panel]"
);
const row =
wrap?.querySelector(
".trade-diary-row"
);
const trade =
findTradeByKey(
key
);

row?.classList.add(
"is-open"
);
row?.setAttribute(
"aria-expanded",
"true"
);

if(
trade &&
panel
){
await openTradeDetail(
panel,
trade
);
}

}

function toggleDayCollapse(
dayKey
){

if(
!contentEl ||
!dayKey
){
return;
}

const section =
contentEl.querySelector(
`[data-day-key="${CSS.escape(
dayKey
)}"]`
);

if(
!section
){
return;
}

const willCollapse =
!section.classList.contains(
"is-collapsed"
);

section.classList.toggle(
"is-collapsed",
willCollapse
);

if(
willCollapse
){
collapsedDayKeys.add(
dayKey
);
}else{
collapsedDayKeys.delete(
dayKey
);
}

const btn =
section.querySelector(
"[data-action='toggle-day']"
);

btn?.setAttribute(
"aria-expanded",
willCollapse
? "false"
: "true"
);

if(
willCollapse &&
openTradeKey
){

const trade =
findTradeByKey(
openTradeKey
);

if(
trade &&
diaryDayKeyLocal(
trade.closeTimeMs
) ===
dayKey
){
void toggleTradeDetail(
openTradeKey
);
}

}

}

function bindDiaryInteractions(){

if(
!contentEl ||
contentEl.dataset.bound ===
"1"
){
return;
}

contentEl.dataset.bound =
"1";

contentEl.addEventListener(
"click",
event=>{

const shareBtn =
event.target.closest(
"[data-action='share-pnl']"
);

if(
shareBtn
){

event.preventDefault();
event.stopPropagation();

const wrap =
shareBtn.closest(
"[data-trade-key]"
);
const trade =
findTradeByKey(
wrap?.dataset.tradeKey ||
""
);

if(
trade
){
void openPnlShareDiaryModal(
trade
);
}

return;

}

const chartLink =
event.target.closest(
"[data-action='open-terminal']"
);

if(
chartLink
){

event.preventDefault();
event.stopPropagation();

const symbol =
String(
chartLink.dataset.symbol ||
""
).trim();

if(
symbol
){
window.location.href =
`/terminal.html?symbol=${encodeURIComponent(
symbol
)}&tf=60`;
}

return;

}

const dayBtn =
event.target.closest(
"[data-action='toggle-day']"
);

if(
dayBtn
){

const section =
dayBtn.closest(
"[data-day-key]"
);
const dayKey =
section?.dataset.dayKey;

if(
dayKey
){
toggleDayCollapse(
dayKey
);
}

return;

}

const row =
event.target.closest(
"[data-action='toggle-detail']"
);

if(
!row
){
return;
}

const wrap =
row.closest(
"[data-trade-key]"
);
const key =
wrap?.dataset.tradeKey;

if(
!key
){
return;
}

void toggleTradeDetail(
key
);

}
);

}

async function loadTradesForPeriod(
period,
options
){

const fn =
diaryMod()?.diaryLoadPeriod;

if(
typeof fn !==
"function"
){
return {
ok:
false,
message:
"Модуль списка Дневника недоступен"
};
}

return fn(
period,
options
);

}

function collectCachedTradesForPeriod(
period
){

const fn =
diaryMod()?.diaryCollectCachedTrades;
return typeof fn ===
"function"
? fn(
period
)
: [];

}

function paintDiaryTrades(
trades,
statusText,
{
loading = false,
error = false
} = {}
){

weekTrades =
(trades ||
[]).map(
diarySanitizeTrade
);
openTradeKey =
null;
collapsedDayKeys.clear();

for(
const [
dayKey
] of groupTradesByDay(
trades
)
){
collapsedDayKeys.add(
dayKey
);
}

renderDiaryContent(
trades,
activePeriod.startMs,
activePeriod.endMs
);
setStatus(
statusText,
{
loading,
error
}
);

}

function patchDiaryTradeDurations(
enrichedTrades
){

const byIdentity =
new Map();

for(
const trade of enrichedTrades ||
[]
){
byIdentity.set(
tradeIdentityKey(
trade
),
trade
);
byIdentity.set(
tradeKey(
trade
),
trade
);
}

weekTrades =
weekTrades.map(
trade=>{

const enriched =
byIdentity.get(
tradeIdentityKey(
trade
)
) ||
byIdentity.get(
tradeKey(
trade
)
);

if(
!enriched ||
!(
Number(
enriched.durationMs
) >
0
) ||
Number(
enriched.openTimeMs
) ===
Number(
enriched.closeTimeMs
)
){
return trade;
}

const listCloseTimeMs =
Number(
trade.listCloseTimeMs
) ||
Number(
trade.closeTimeMs
);

return {
...trade,
listCloseTimeMs,
openTimeMs:
enriched.openTimeMs,
closeTimeMs:
enriched.closeTimeMs,
durationMs:
enriched.durationMs,
side:
enriched.side ||
trade.side,
avgEntryPrice:
enriched.avgEntryPrice ||
trade.avgEntryPrice,
avgExitPrice:
enriched.avgExitPrice ||
trade.avgExitPrice,
qty:
enriched.qty ||
trade.qty,
sparse:
false,
resolved:
true
};

}
);

if(
!contentEl
){
return;
}

for(
const trade of weekTrades
){

if(
!(
Number(
trade.durationMs
) >
0
)
){
continue;
}

const wrap =
contentEl.querySelector(
`[data-trade-key="${CSS.escape(
tradeKey(
trade
)
)}"]`
);
const durationEl =
wrap?.querySelector(
".trade-diary-duration"
);

if(
durationEl
){
durationEl.textContent =
formatDiaryDuration(
trade.durationMs
);
}

const sideEl =
wrap?.querySelector(
".trade-diary-side"
);

if(
sideEl
){
sideEl.textContent =
sideLabel(
trade.side
);
sideEl.className =
`trade-diary-side ${sideToneClass(
trade.side
)}`;
}

}

}

async function maybeEnrichDiaryDurations(
trades,
period
){

const fn =
diaryMod()?.diaryAfterListPaint;

if(
typeof fn !==
"function"
){
return;
}

await fn({
trades,
period,
applyEnrichedTrades:
patchDiaryTradeDurations
});

}

async function refreshDiary(
{
forceRefresh =
false
} = {}
){

if(
!contentEl
){
return;
}

refreshBtn &&
(refreshBtn.disabled =
true);
saveDiaryPeriod(
activePeriod,
EXCHANGE_ID
);
let loadingCachedCount =
0;

if(
!forceRefresh
){
const preview =
collectCachedTradesForPeriod(
activePeriod
);

if(
preview.length
){
loadingCachedCount =
preview.length;
paintDiaryTrades(
preview,
`Сделок за период: ${preview.length} · кэш · обновляем…`,
{
loading:
true
}
);
}else{
setStatus(
"Идет загрузка сделок ...",
{
loading:
true
}
);
contentEl.innerHTML =
"";
openTradeKey =
null;
}
}else{
setStatus(
"Идет загрузка сделок ...",
{
loading:
true
}
);
contentEl.innerHTML =
"";
openTradeKey =
null;
}

const loadingRunId =
startDiaryLoadingStatus(
loadingCachedCount
);

try{

const result =
await loadTradesForPeriod(
activePeriod,
{
forceRefresh
}
);

if(
!result?.ok
){
setStatus(
result?.message ||
"Не удалось загрузить сделки",
{
error:
true
}
);

if(
!weekTrades.length
){
contentEl.innerHTML =
"";
}

return;
}

const trades =
Array.isArray(
result.trades
)
? result.trades
: [];

const statusSuffix =
result?.fromCache
? " · кэш"
: result?.partialCache
? " · кэш + сегодня"
: result?.sparse
? " · income"
: "";

paintDiaryTrades(
trades,
trades.length
? `Сделок за период: ${trades.length}${statusSuffix}`
: result?.fromCache
? "Нет сделок · кэш"
: ""
);

/* Bybit diaryAfterListPaint is no-op; BingX enriches residual sparse rows. */
void maybeEnrichDiaryDurations(
trades,
activePeriod
);

}catch(
err
){

setStatus(
err?.message ||
"Ошибка загрузки",
{
error:
true
}
);

if(
!weekTrades.length
){
contentEl.innerHTML =
"";
}

}finally{
stopDiaryLoadingStatus(
loadingRunId
);
refreshBtn &&
(refreshBtn.disabled =
false);
}

}

export async function bootTradeDiaryPage(){

if(
!isDesktopTradeDiaryContext()
){
location.replace(
"/screener.html"
);
return;
}

showOnly(
panelEl
);

void initTradeDiaryNav();

periodPicker =
mountTradeDiaryPeriodPicker(
periodBtn,
{
initialPeriod:
activePeriod,
onApply(
period
){
activePeriod =
period;
saveDiaryPeriod(
period,
EXCHANGE_ID
);
void refreshDiary({
forceRefresh:
true
});
}
}
);

bindDiaryInteractions();

refreshBtn?.addEventListener(
"click",
()=>{
void refreshDiary({
forceRefresh:
true
});
}
);

window.addEventListener(
EXCHANGE_CHANGED_EVENT,
()=>{
void (async ()=>{
resetTradeExchangeModules();
await loadTradeExchangeModules();
await refreshDiary();
})();
}
);

await loadTradeExchangeModules();
await refreshDiary();

}

