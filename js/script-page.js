/**
 * Страница Скрипт — сканер паттерна 1-2, результаты виджетами (как Скринер).
 */
import {
createScriptWidgetGrid
} from "./script-page-widgets.js?v=6";

import {
getSharedPatternScanner,
getScriptScanJobState,
getScriptScanNextRunAt,
scheduleScriptScanRun,
triggerScriptScanNow,
stopScriptScanBackground,
stopActivePatternScan,
startFullPatternScan,
isScriptScanBackgroundRunning,
SCRIPT_SCAN_BG_EVENT
} from "./script-scan-background.js?v=14";

import {
PATTERN_SCAN_TF_LABELS,
PATTERN_SCAN_DEPTH_OPTIONS,
normalizePatternScanSideFilter,
matchesPatternScanSideFilter
} from "./pattern-12-scanner.js?v=17";

import {
loadScriptPageState,
saveScriptPageState,
SCRIPT_AUTO_PERIODS,
periodMsById
} from "./script-page-storage.js?v=14";

import {
parseTradingViewSymbolList,
scriptFavoritesFileName
} from "./script-favorites-list.js?v=2";

import {
COINS_TF_HOTKEYS,
COINS_TF_VALUES
} from "./terminal/terminal-state.js?v=11";

import {
EXCHANGE_CHANGED_EVENT,
getActiveExchangeId,
getExchangeDefinition
} from "./market-api.js?v=2";

const SCRIPT_LAYOUT_HOTKEYS =
Object.freeze({

Digit1:
4,
Digit2:
6,
Digit3:
9

});

const els =
{};

let state =
null;
let widgetGrid =
null;
let autoCountdownTimerId =
null;
let scanMode =
null;

function scanStatusPrefix(
mode =
scanMode
){

return mode ===
"auto"
? "Авто: "
: "";

}

function activeExchangeLabel(){

return getExchangeDefinition(
getActiveExchangeId()
)?.name ||
getActiveExchangeId() ||
"";

}

function reloadForActiveExchange(){

state =
loadScriptPageState();
state.favoritesOnly =
false;
scanMode =
null;
updateActionButtons();
updateAutoStatus();
applyFavoritesUi();
void refreshFavoritesMetaFromDisk();
refreshGrid();

const name =
activeExchangeLabel();

if(
name
){
setFloatingScanStatus(
`Биржа: ${name}`
);
}

}

function favoritesExchangeLabel(){

const id =
String(
getActiveExchangeId() ||
""
).toLowerCase();

return id ===
"bingx"
? "BingX"
: "Bybit";

}

function formatFavoritesSideCount(
count
){

const n =
Math.max(
0,
Number(
count
) ||
0
);

return n >
0
? String(
n
)
: "—";

}

function updateFavoritesStatus(){

if(
!els.favoritesStatus
){
return;
}

const longCount =
Math.max(
0,
Number(
state.favoritesLongCount
) ||
0
);
const shortCount =
Math.max(
0,
Number(
state.favoritesShortCount
) ||
0
);

els.favoritesStatus.textContent =
`${favoritesExchangeLabel()} Long: ${formatFavoritesSideCount(
longCount
)} · Short: ${formatFavoritesSideCount(
shortCount
)}`;
els.favoritesStatus.title =
[
state.favoritesLongFileName,
state.favoritesShortFileName
].filter(
Boolean
).join(
" · "
);
els.favoritesStatus.classList.toggle(
"is-ready",
longCount >
0 ||
shortCount >
0
);

}

function applyFavoritesUi(){

/* Toolbar favorites/file UI removed — keep helpers for disk counts if needed. */
updateFavoritesStatus();

}

async function refreshFavoritesSideFromDisk(
side
){

const api =
window.cryptoTerminalDesktop;

if(
!api?.loadScriptFavorites
){
return;
}

const exchangeId =
getActiveExchangeId();
const result =
await api.loadScriptFavorites(
exchangeId,
side
);
const countKey =
side ===
"short"
? "favoritesShortCount"
: "favoritesLongCount";
const fileKey =
side ===
"short"
? "favoritesShortFileName"
: "favoritesLongFileName";

if(
!result?.ok ||
!result.exists ||
!String(
result.text ||
""
).trim()
){
state[
countKey
] =
0;
state[
fileKey
] =
"";
return;
}

const parsed =
parseTradingViewSymbolList(
result.text,
{
exchangeId
}
);

state[
countKey
] =
parsed.symbols.length;
state[
fileKey
] =
result.fileName ||
scriptFavoritesFileName(
exchangeId,
side
);

}

async function refreshFavoritesMetaFromDisk(){

const api =
window.cryptoTerminalDesktop;

if(
!api?.loadScriptFavorites
){
return;
}

await refreshFavoritesSideFromDisk(
"long"
);
await refreshFavoritesSideFromDisk(
"short"
);
persist();
updateFavoritesStatus();

}

async function importFavoritesFile(
side
){

const api =
window.cryptoTerminalDesktop;
const sideNorm =
side ===
"short"
? "short"
: "long";
const sideLabel =
sideNorm ===
"short"
? "Short"
: "Long";

if(
!api?.importScriptFavorites
){
setFloatingScanStatus(
"Добавление файла только в desktop"
);
return;
}

const exchangeId =
getActiveExchangeId();
const result =
await api.importScriptFavorites(
exchangeId,
sideNorm
);

if(
result?.canceled
){
return;
}

if(
!result?.ok
){
setFloatingScanStatus(
result?.message ||
`Не удалось загрузить файл ${sideLabel}`
);
return;
}

const parsed =
parseTradingViewSymbolList(
result.text,
{
exchangeId
}
);

if(
!parsed.symbols.length
){
setFloatingScanStatus(
parsed.skippedForeign
? "В файле нет монет текущей биржи"
: "В файле нет подходящих монет"
);
return;
}

const fileName =
result.fileName ||
scriptFavoritesFileName(
exchangeId,
sideNorm
);

if(
sideNorm ===
"short"
){
state.favoritesShortCount =
parsed.symbols.length;
state.favoritesShortFileName =
fileName;
}else{
state.favoritesLongCount =
parsed.symbols.length;
state.favoritesLongFileName =
fileName;
}

persist();
updateFavoritesStatus();

let msg =
`${sideLabel}: ${parsed.symbols.length} · ${fileName}`;

if(
parsed.skippedForeign
){
msg +=
` · чужих: ${parsed.skippedForeign}`;
}

setFloatingScanStatus(
msg
);

}

function favoritesReadyForUi(
sideFilter
){

if(
!state.favoritesOnly
){
return true;
}

const mode =
String(
sideFilter ||
state.searchSide ||
"both"
).trim().toLowerCase();
const longCount =
Math.max(
0,
Number(
state.favoritesLongCount
) ||
0
);
const shortCount =
Math.max(
0,
Number(
state.favoritesShortCount
) ||
0
);

if(
mode ===
"long"
){
return longCount >
0;
}

if(
mode ===
"short"
){
return shortCount >
0;
}

return longCount >
0 ||
shortCount >
0;

}

function favoritesMissingUiMessage(
sideFilter
){

const mode =
String(
sideFilter ||
state.searchSide ||
"both"
).trim().toLowerCase();

if(
mode ===
"long"
){
return "Сначала добавьте файл Long";
}

if(
mode ===
"short"
){
return "Сначала добавьте файл Short";
}

return "Сначала добавьте файл Long или Short";

}

function syncScanJobUi(){

const job =
getScriptScanJobState();

if(
job?.status !==
"running"
){
return false;
}

scanMode =
job.mode ||
"auto";

if(
job.phase ===
"symbols"
){
setScanStatus(
`${scanStatusPrefix()}Загрузка списка монет…`,
true
);
}else{
setScanStatus(
`${scanStatusPrefix()}${formatProgress(
{
done:
job.done,
total:
job.total,
running:
true,
symbol:
job.symbol,
tf:
job.tf
}
)}`,
true
);
}

updateActionButtons();
return true;

}

function persist(){

/*
 * nextRunAt / lastScanAt пишет фон (scheduleScriptScanRun).
 * UI-state часто устаревший (finished приходит до schedule) —
 * не затираем таймер при layout/filter/visited persist.
 */
const stored =
loadScriptPageState();

state.auto.nextRunAt =
Number(
stored.auto?.nextRunAt
) ||
0;
state.auto.lastScanAt =
Number(
stored.auto?.lastScanAt
) ||
0;

saveScriptPageState(
state
);

}

function markPageVisited(){

state.lastVisitedAt =
Date.now();
persist();

}

function resolveWidgetChartTf(
chartTfFilter,
row
){

if(
chartTfFilter ===
"all"
){
return row.tf;
}

return chartTfFilter;

}

function filteredRows(){

return state.rows.filter(
row=>
matchesPatternScanSideFilter(
row?.side,
state.searchSide
)
);

}

function refreshGrid(){

void widgetGrid?.renderPage(
filteredRows(),
state.filterTf
);

}

function replaceAllRows(
rows
){

state.rows =
rows.slice();
persist();
refreshGrid();
updateActionButtons();

}

function setFilterTf(
tf
){

state.filterTf =
tf;
state.page =
1;
persist();
widgetGrid?.restoreLayoutState(
state.layout,
1
);

els.tfFilter?.querySelectorAll(
".script-tf-btn"
).forEach(
btn=>{
btn.classList.toggle(
"active",
btn.dataset.tf ===
tf
);
}
);

refreshGrid();

}

function setSearchDepth(
depth
){

const n =
Number(
depth
);

if(
!PATTERN_SCAN_DEPTH_OPTIONS.includes(
n
)
){
return;
}

state.searchDepth =
n;
persist();

}

function setSearchSide(
side
){

const normalized =
normalizePatternScanSideFilter(
side
);

state.searchSide =
normalized;
persist();
refreshGrid();
updateActionButtons();

}

function syncSearchParamsFromUi(){

if(
els.searchDepth
){
setSearchDepth(
els.searchDepth.value
);
}

if(
els.searchSide
){
setSearchSide(
els.searchSide.value
);
}

if(
els.autoTf
){
state.auto.tf =
els.autoTf.value ||
state.auto.tf;
}

if(
els.autoPeriod
){
state.auto.periodId =
els.autoPeriod.value ||
state.auto.periodId;
}

/* UI «избранные / файлы» убран — всегда полный рынок. */
state.favoritesOnly =
false;

persist();

}

function formatProgress(
progress
){

if(
!progress
){
return "";
}

const pct =
progress.total
? Math.round(
progress.done /
progress.total *
100
)
: 0;

const tfLabel =
PATTERN_SCAN_TF_LABELS[
progress.tf
] ||
progress.tf ||
"";
const sym =
String(
progress.symbol ||
""
).replace(
/\.P$/i,
""
);

return `${pct}% · ${sym} ${tfLabel}`.trim();

}

function setScanToolbarProgress(
text
){

if(
!els.scanProgress
){
return;
}

if(
!text
){
els.scanProgress.textContent =
"";
els.scanProgress.classList.add(
"hidden"
);
return;
}

els.scanProgress.textContent =
text;
els.scanProgress.classList.remove(
"hidden"
);

}

function setFloatingScanStatus(
text,
loading =
false
){

if(
!els.status
){
return;
}

if(
!text
){
els.status.classList.add(
"hidden"
);
els.status.textContent =
"";
els.status.classList.remove(
"loading"
);
return;
}

els.status.textContent =
text;
els.status.classList.remove(
"hidden"
);
els.status.classList.toggle(
"loading",
loading
);

}

function setScanStatus(
text,
loading =
false
){

setScanToolbarProgress(
text
);
setFloatingScanStatus(
text,
loading
);

}

function updateActionButtons(){

const running =
isScriptScanBackgroundRunning();

if(
els.autoStart
){
els.autoStart.disabled =
running ||
state.auto.active;
}

if(
els.autoStop
){
els.autoStop.disabled =
!state.auto.active;
}

}

function formatCountdown(
ms
){

const totalSec =
Math.max(
0,
Math.ceil(
ms /
1000
)
);
const h =
Math.floor(
totalSec /
3600
);
const m =
Math.floor(
totalSec %
3600 /
60
);
const s =
totalSec %
60;

if(
h >
0
){
return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

return `${m}:${String(s).padStart(2, "0")}`;

}

function updateAutoStatus(){

if(
!els.autoStatus
){
return;
}

if(
!state.auto.active
){
els.autoStatus.textContent =
"Авто-сканирование выключено";
return;
}

const tfLabel =
PATTERN_SCAN_TF_LABELS[
state.auto.tf
] ||
state.auto.tf;
const periodLabel =
SCRIPT_AUTO_PERIODS.find(
p=>
p.id ===
state.auto.periodId
)?.label ||
"";

const left =
getScriptScanNextRunAt() -
Date.now();

els.autoStatus.textContent =
`Авто: ${tfLabel} · ${periodLabel} · следующий запуск через ${formatCountdown(left)}`;

}

function clearAutoCountdown(){

if(
autoCountdownTimerId
){
clearInterval(
autoCountdownTimerId
);
autoCountdownTimerId =
null;
}

}

function startAutoCountdown(){

clearAutoCountdown();
updateAutoStatus();
autoCountdownTimerId =
setInterval(
updateAutoStatus,
1000
);

}

async function runFullScan(){

syncSearchParamsFromUi();

setScanStatus(
"Запуск полного сканирования…",
true
);

if(
state.auto.active
){
stopAuto();
}

stopActivePatternScan();

scanMode =
"full";
updateActionButtons();

startFullPatternScan(
{
lookbackBars:
state.searchDepth,
sideFilter:
state.searchSide
}
);

}

function startAuto(){

syncSearchParamsFromUi();

if(
!favoritesReadyForUi(
state.searchSide
)
){
setFloatingScanStatus(
favoritesMissingUiMessage(
state.searchSide
)
);
return;
}

state.auto.active =
true;
persist();
updateActionButtons();
startAutoCountdown();
triggerScriptScanNow();
}

function stopAuto(){

state.auto.active =
false;
persist();
stopScriptScanBackground();
clearAutoCountdown();
updateActionButtons();
updateAutoStatus();
setScanToolbarProgress(
""
);
setFloatingScanStatus(
"Авто-сканирование остановлено"
);
}

function handleBackgroundScanEvent(
event
){

const detail =
event?.detail ||
{};
const {
type
} =
detail;

if(
type ===
"scheduled"
){
state =
loadScriptPageState();
startAutoCountdown();
updateAutoStatus();
return;
}

if(
type ===
"started"
){
state =
loadScriptPageState();
scanMode =
detail.mode ||
"auto";
updateActionButtons();
refreshGrid();
const tfLabel =
PATTERN_SCAN_TF_LABELS[
detail.tf
] ||
detail.tf;
setScanStatus(
`${scanStatusPrefix(
scanMode
)}сканирование ${tfLabel}…`
);
return;
}

if(
type ===
"progress"
){

const {
progress,
mode
} =
detail;

if(
progress?.running
){
setScanStatus(
`${scanStatusPrefix(
mode
)}${formatProgress(
progress
)}`,
true
);
}else if(
progress &&
!progress.stopped
){
const tfLabel =
PATTERN_SCAN_TF_LABELS[
detail.tf
] ||
detail.tf;
setScanStatus(
`${scanStatusPrefix(
mode
)}готово · ${filteredRows().length} на ${tfLabel}`
);
}
updateActionButtons();
return;
}

if(
type ===
"hit"
){
state =
loadScriptPageState();
refreshGrid();
updateActionButtons();
return;
}

if(
type ===
"finished"
){
state =
loadScriptPageState();
refreshGrid();
scanMode =
null;
updateActionButtons();
startAutoCountdown();
setScanStatus(
""
);
return;
}

if(
type ===
"error"
){
scanMode =
null;
setScanStatus(
`Ошибка: ${detail.message || "сканирование"}`
);
updateActionButtons();
return;
}

if(
type ===
"stopped"
){
scanMode =
null;
setScanToolbarProgress(
""
);
updateActionButtons();
updateAutoStatus();
return;
}

if(
type ===
"exchange-changed"
){
reloadForActiveExchange();
}

}

function closeLayoutPicker(){

const menu =
els.layoutMenu;
const trigger =
els.layoutTrigger;

if(
!menu ||
!trigger
){
return;
}

menu.classList.add(
"hidden"
);
trigger.setAttribute(
"aria-expanded",
"false"
);

}

function bindLayoutPicker(){

const trigger =
els.layoutTrigger;
const menu =
els.layoutMenu;

if(
!trigger ||
!menu
){
return;
}

trigger.addEventListener(
"click",
event=>{
event.stopPropagation();
const open =
!menu.classList.contains(
"hidden"
);
closeLayoutPicker();

if(
open
){
return;
}

menu.classList.remove(
"hidden"
);
trigger.setAttribute(
"aria-expanded",
"true"
);
}
);

menu.querySelectorAll(
"button[data-layout]"
).forEach(
btn=>{

btn.addEventListener(
"click",
event=>{
event.stopPropagation();
const next =
Number(
btn.dataset.layout
);
widgetGrid?.setLayout(
next
);
state.layout =
next;
state.page =
1;
persist();
widgetGrid?.syncLayoutLabel(
els.layoutLabel
);
widgetGrid?.syncLayoutMenu(
menu
);
closeLayoutPicker();
refreshGrid();
}
);

}
);

document.addEventListener(
"click",
()=>{
closeLayoutPicker();
}
);

}

function shouldIgnoreScriptKeyNav(
event
){

const target =
event.target;

if(
!target
){
return false;
}

const tag =
target.tagName?.toLowerCase?.();

if(
tag ===
"input" ||
tag ===
"textarea" ||
tag ===
"select"
){
return true;
}

if(
target.isContentEditable
){
return true;
}

return false;

}

function applyLayoutHotkey(
next
){

widgetGrid?.setLayout(
next
);
state.layout =
next;
state.page =
1;
persist();
widgetGrid?.syncLayoutLabel(
els.layoutLabel
);
widgetGrid?.syncLayoutMenu(
els.layoutMenu
);
refreshGrid();

}

function bindScriptHotkeys(){

window.addEventListener(
"keydown",
event=>{

if(
event.defaultPrevented
){
return;
}

if(
event.metaKey ||
event.ctrlKey ||
event.altKey
){
return;
}

if(
shouldIgnoreScriptKeyNav(
event
)
){
return;
}

if(
event.shiftKey
){

const layoutNext =
SCRIPT_LAYOUT_HOTKEYS[
event.code
];

if(
layoutNext
){
event.preventDefault();
applyLayoutHotkey(
layoutNext
);
}

return;

}

const tf =
COINS_TF_HOTKEYS[
event.key
];

if(
tf &&
COINS_TF_VALUES.has(
tf
)
){
event.preventDefault();
setFilterTf(
tf
);
}

}
);

}

function bindScriptPageNavHotkeys(){

document.addEventListener(
"keydown",
event=>{

if(
shouldIgnoreScriptKeyNav(
event
)
){
return;
}

if(
event.code ===
"ArrowRight"
){

event.preventDefault();
widgetGrid?.goToPage(
(
widgetGrid?.getPage?.() ||
1
) +
1,
filteredRows().length
);
return;

}

if(
event.code ===
"ArrowLeft"
){

event.preventDefault();
widgetGrid?.goToPage(
(
widgetGrid?.getPage?.() ||
1
) -
1,
filteredRows().length
);
return;

}

if(
event.code ===
"Space" &&
!event.shiftKey
){

event.preventDefault();
widgetGrid?.goToPage(
(
widgetGrid?.getPage?.() ||
1
) +
1,
filteredRows().length
);
return;

}

if(
event.code ===
"Space" &&
event.shiftKey
){

event.preventDefault();
widgetGrid?.goToPage(
(
widgetGrid?.getPage?.() ||
1
) -
1,
filteredRows().length
);

}

}
);

}

function bindEls(){

els.tfFilter =
document.getElementById(
"script-tf-filter"
);
els.searchDepth =
document.getElementById(
"script-search-depth"
);
els.searchSide =
document.getElementById(
"script-side-filter"
);
els.autoTf =
document.getElementById(
"script-auto-tf"
);
els.autoPeriod =
document.getElementById(
"script-auto-period"
);
els.autoStart =
document.getElementById(
"script-auto-start"
);
els.autoStop =
document.getElementById(
"script-auto-stop"
);
els.autoStatus =
document.getElementById(
"script-auto-status"
);
els.scanProgress =
document.getElementById(
"script-scan-progress"
);
els.grid =
document.getElementById(
"script-grid"
);
els.pagination =
document.getElementById(
"pagination"
);
els.status =
document.getElementById(
"script-status"
);
els.layoutTrigger =
document.getElementById(
"script-desktop-layout-trigger"
);
els.layoutMenu =
document.getElementById(
"script-desktop-layout-menu"
);
els.layoutLabel =
document.getElementById(
"script-desktop-layout-label"
);

}

const SCRIPT_TOOLBAR_NO_FOCUS_SELECTOR =
".script-tf-btn, .script-auto-btn";

function bindScriptToolbarNoFocus(
toolbarEl
){

if(
!toolbarEl ||
toolbarEl.__scriptToolbarNoFocus
){
return;
}

toolbarEl.__scriptToolbarNoFocus =
true;

toolbarEl.addEventListener(
"mousedown",
event=>{

const btn =
event.target?.closest?.(
SCRIPT_TOOLBAR_NO_FOCUS_SELECTOR
);

if(
btn &&
event.button ===
0
){
event.preventDefault();
}

},
true
);

toolbarEl.addEventListener(
"keydown",
event=>{

const btn =
event.target?.closest?.(
SCRIPT_TOOLBAR_NO_FOCUS_SELECTOR
);

if(
!btn
){
return;
}

if(
event.code ===
"Space" ||
event.code ===
"Enter"
){
event.preventDefault();
}

},
true
);

toolbarEl.addEventListener(
"click",
event=>{

const btn =
event.target?.closest?.(
SCRIPT_TOOLBAR_NO_FOCUS_SELECTOR
);

if(
!btn
){
return;
}

queueMicrotask(
()=>{
btn.blur();
}
);

},
true
);

}

function wireEvents(){

bindScriptToolbarNoFocus(
document.getElementById(
"script-toolbar"
)
);

window.addEventListener(
"pagehide",
()=>{
markPageVisited();
widgetGrid?.destroy?.();
}
);

window.addEventListener(
SCRIPT_SCAN_BG_EVENT,
handleBackgroundScanEvent
);

window.addEventListener(
EXCHANGE_CHANGED_EVENT,
()=>{
reloadForActiveExchange();
}
);

els.tfFilter?.addEventListener(
"click",
event=>{

const btn =
event.target?.closest?.(
".script-tf-btn"
);

if(
!btn?.dataset?.tf
){
return;
}

setFilterTf(
btn.dataset.tf
);

}
);

els.autoStart?.addEventListener(
"click",
startAuto
);

els.autoStop?.addEventListener(
"click",
stopAuto
);

els.autoTf?.addEventListener(
"change",
()=>{

state.auto.tf =
els.autoTf.value;
persist();

if(
state.auto.active
){
scheduleScriptScanRun(
periodMsById(
state.auto.periodId
)
);
startAutoCountdown();
}

}
);

els.autoPeriod?.addEventListener(
"change",
()=>{

state.auto.periodId =
els.autoPeriod.value;
persist();

if(
state.auto.active
){
scheduleScriptScanRun(
periodMsById(
state.auto.periodId
)
);
startAutoCountdown();
}

}
);

els.searchDepth?.addEventListener(
"change",
()=>{
setSearchDepth(
els.searchDepth.value
);
}
);

els.searchSide?.addEventListener(
"change",
()=>{
setSearchSide(
els.searchSide.value
);
}
);

}

function restoreAfterBgScan(){

if(
!state.auto.active
){
return;
}

if(
state.auto.lastScanAt <=
(
state.lastVisitedAt ||
0
)
){
return;
}

state.page =
1;
persist();
refreshGrid();

}

export function mountScriptPage(){

bindEls();
state =
loadScriptPageState();

widgetGrid =
createScriptWidgetGrid(
{
gridEl:
els.grid,
paginationEl:
els.pagination,
statusEl:
els.status,
onPersist(
{
layout,
page
}
){

if(
layout
){
state.layout =
layout;
}

if(
page
){
state.page =
page;
}

persist();

}
}
);

widgetGrid.restoreLayoutState(
state.layout,
state.page
);
widgetGrid.syncLayoutLabel(
els.layoutLabel
);
widgetGrid.syncLayoutMenu(
els.layoutMenu
);

wireEvents();
bindLayoutPicker();
bindScriptHotkeys();
bindScriptPageNavHotkeys();

setFilterTf(
state.filterTf
);

if(
els.autoTf
){
els.autoTf.value =
state.auto.tf;
}

if(
els.autoPeriod
){
els.autoPeriod.value =
state.auto.periodId;
}

if(
els.searchDepth
){
els.searchDepth.value =
String(
state.searchDepth
);
}

if(
els.searchSide
){
els.searchSide.value =
state.searchSide;
}

applyFavoritesUi();
void refreshFavoritesMetaFromDisk();

updateActionButtons();
updateAutoStatus();

if(
state.auto.active
){
startAutoCountdown();
}

restoreAfterBgScan();
syncScanJobUi();
refreshGrid();

}
