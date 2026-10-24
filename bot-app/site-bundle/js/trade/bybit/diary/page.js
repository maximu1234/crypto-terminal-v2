/** Bybit trade diary page. */
import {
isDesktopTradeDiaryContext
} from "../../../trade-diary-access.js?v=c3fda1b4";

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
} from "../../../trade-diary-format.js?v=e2a1aeff";

import {
closeTradeDetail,
openTradeDetail
} from "../../../trade-diary-detail.js?v=5820f0df";

import {
mountTradeDiaryPeriodPicker
} from "./period.js?v=b9217abf";

import {
resolveInitialDiaryPeriod,
saveDiaryPeriod
} from "../../../trade-diary-storage.js?v=1deb8f10";

import {
EXCHANGE_CHANGED_EVENT
} from "../../../market-api.js?v=00f19708";

import {
initTradeDiaryNav
} from "../../../trade-diary-nav.js?v=d304920d";

import {
openPnlShareDiaryModal,
PNL_SHARE_CONTROL_HTML
} from "../pnl-share-modal.js?v=ff25d8aa";

import {
renderDiaryPeriodAnalytics,
clearDiaryPeriodAnalytics
} from "../../../diary-period-analytics-ui.js?v=44d938ef";

import {
DIARY_COMMENT_MAX_LEN,
diaryTradeIdentityKey,
ensureDiaryJournalLoaded,
getDiaryJournalComment,
listDiaryJournalTradesInPeriod,
diaryJournalRowToTrade,
setDiaryJournalComment,
upsertDiaryJournalTrades
} from "../../../trade-diary-journal.js?v=7b94619e";

import {
mountDiaryJournalActions
} from "../../../trade-diary-journal-ui.js?v=4fbc6447";

import {
buildDiaryTradeTerminalUrl,
resolveDiaryTradeFocusTimes
} from "../../../trade-diary-terminal-deep-link.js?v=7e2fd114";

import {
getLoadedTradeExchangeModules,
loadTradeExchangeModules,
resetTradeExchangeModules
} from "../../module-router.js?v=f9d37714";

import {
escapeHtml,
findTradeByKey,
groupTradesByDay,
renderWeek,
tradeIdentityKey,
tradeKey
} from "./page-render.js?v=1";

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

const analyticsEl =
document.getElementById(
"trade-diary-analytics"
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
rangeEndMs,
{
openTradeKey,
exchangeId:
EXCHANGE_ID,
collapsedDayKeys
}
);

if(
openTradeKey
){

const trade =
findTradeByKey(
openTradeKey,
weekTrades
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
key,
weekTrades
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
openTradeKey,
weekTrades
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

const commentCell =
event.target.closest(
"[data-action='comment-cell']"
);

if(
commentCell
){
event.stopPropagation();
return;
}

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
"",
weekTrades
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

const wrap =
chartLink.closest(
"[data-trade-key]"
);
const trade =
findTradeByKey(
wrap?.dataset.tradeKey ||
"",
weekTrades
) ||
{
symbol:
chartLink.dataset.symbol,
openTimeMs:
chartLink.dataset.openMs,
closeTimeMs:
chartLink.dataset.closeMs,
orderId:
chartLink.dataset.orderId
};

const symbol =
String(
trade?.symbol ||
chartLink.dataset.symbol ||
""
).trim();

if(
!symbol
){
return;
}

const focus =
resolveDiaryTradeFocusTimes(
trade
);

window.location.href =
buildDiaryTradeTerminalUrl(
{
symbol,
openMs:
focus.openMs,
closeMs:
focus.closeMs,
orderId:
focus.orderId,
exchange:
EXCHANGE_ID
}
);

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

contentEl.addEventListener(
"input",
event=>{

const input =
event.target.closest?.(
".trade-diary-comment-input"
);

if(
!input
){
return;
}

const tradeId =
String(
input.dataset.tradeId ||
""
).trim();

if(
!tradeId
){
return;
}

void setDiaryJournalComment(
EXCHANGE_ID,
tradeId,
input.value
);

}
);

contentEl.addEventListener(
"keydown",
event=>{

if(
event.target.closest?.(
".trade-diary-comment-input"
)
){
event.stopPropagation();
return;
}

if(
event.key !==
"Enter" &&
event.key !==
" "
){
return;
}

const row =
event.target.closest?.(
"[data-action='toggle-detail']"
);

if(
!row ||
event.target !==
row
){
return;
}

event.preventDefault();

const wrap =
row.closest(
"[data-trade-key]"
);
const key =
wrap?.dataset.tradeKey;

if(
key
){
void toggleTradeDetail(
key
);
}

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
renderDiaryPeriodAnalytics(
analyticsEl,
weekTrades
);
setStatus(
statusText,
{
loading,
error
}
);

if(
!loading &&
weekTrades.length
){
void upsertDiaryJournalTrades(
EXCHANGE_ID,
weekTrades
);
}

}

function paintDiaryFromJournal(
statusText
){

const rows =
listDiaryJournalTradesInPeriod(
EXCHANGE_ID,
activePeriod.startMs,
activePeriod.endMs
);
const trades =
rows.map(
diaryJournalRowToTrade
);
paintDiaryTrades(
trades,
statusText ||
(
trades.length
? `Сделок за период: ${trades.length} · из файла`
: "Нет сделок в загруженном дневнике за период"
)
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

renderDiaryPeriodAnalytics(
analyticsEl,
weekTrades
);

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
clearDiaryPeriodAnalytics(
analyticsEl
);
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
clearDiaryPeriodAnalytics(
analyticsEl
);
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
clearDiaryPeriodAnalytics(
analyticsEl
);
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
clearDiaryPeriodAnalytics(
analyticsEl
);
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

mountDiaryJournalActions({
exchangeId:
EXCHANGE_ID,
setStatus,
onJournalReplaced:()=>{
paintDiaryFromJournal();
}
});

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
await ensureDiaryJournalLoaded(
EXCHANGE_ID
);
await refreshDiary();
})();
}
);

await loadTradeExchangeModules();
await ensureDiaryJournalLoaded(
EXCHANGE_ID
);
await refreshDiary();

}

