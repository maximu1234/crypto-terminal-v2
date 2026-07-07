/**
 * Страница Скрипт — сканер паттерна 1-2, результаты виджетами (как Скринер).
 */
import {
createScriptWidgetGrid
} from "./script-page-widgets.js?v=5";

import {
getScriptScanJobState,
getScriptScanNextRunAt,
scheduleScriptScanRun,
triggerScriptScanNow,
stopScriptScanBackground,
stopActivePatternScan,
startFullPatternScan,
isScriptScanBackgroundRunning,
SCRIPT_SCAN_BG_EVENT
} from "./script-scan-background.js?v=8";

import {
PATTERN_SCAN_TF_LABELS,
PATTERN_SCAN_DEPTH_OPTIONS
} from "./pattern-12-scanner.js?v=11";

import {
loadScriptPageState,
saveScriptPageState,
SCRIPT_AUTO_PERIODS,
periodMsById
} from "./script-page-storage.js?v=9";

import {
COINS_TF_HOTKEYS,
COINS_TF_VALUES
} from "./terminal/terminal-state.js?v=8";

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

const latest =
loadScriptPageState();

if(
latest?.auto
){
state.auto.nextRunAt =
Number(
latest.auto.nextRunAt
) ||
0;
state.auto.lastScanAt =
Number(
latest.auto.lastScanAt
) ||
0;
}

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

return state.rows.slice();

}

function refreshGrid(){

void widgetGrid?.renderPage(
state.rows,
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
els.refreshAll
){
els.refreshAll.disabled =
running;
}

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
state.searchDepth
}
);

}

function startAuto(){

state.auto.tf =
els.autoTf?.value ||
"15";
state.auto.periodId =
els.autoPeriod?.value ||
"1h";
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
els.refreshAll =
document.getElementById(
"script-refresh-all"
);
els.searchDepth =
document.getElementById(
"script-search-depth"
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
".script-tf-btn, .script-auto-btn, .script-refresh-all-btn";

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

els.refreshAll?.addEventListener(
"click",
()=>{
void runFullScan();
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

setFilterTf(
state.auto.tf
);
state.page =
1;
persist();

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
