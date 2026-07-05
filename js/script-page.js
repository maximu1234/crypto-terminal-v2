/**
 * Страница Скрипт — сканер паттерна 1-2, фильтр по ТФ, авто-обновление.
 */
import {
createScriptPageChart
} from "./script-page-chart.js?v=4";

import {
getSharedPatternScanner,
getScriptScanNextRunAt,
scheduleScriptScanRun,
triggerScriptScanNow,
stopScriptScanBackground,
isScriptScanBackgroundRunning,
SCRIPT_SCAN_BG_EVENT
} from "./script-scan-background.js?v=2";

import {
PATTERN_SCAN_ALL_TFS,
PATTERN_SCAN_TF_LABELS,
PATTERN_SCAN_SIDE_LABELS
} from "./pattern-12-scanner.js?v=9";

import {
loadScriptPageState,
saveScriptPageState,
SCRIPT_AUTO_PERIODS,
periodMsById
} from "./script-page-storage.js?v=7";

import {
COINS_TF_VALUES,
COINS_TF_HOTKEYS
} from "./terminal/terminal-state.js?v=8";

const els =
{};

let state =
null;

function scanner(){

return getSharedPatternScanner();

}

let scriptChart =
null;
let chartSymbol =
"";
let chartTf =
"60";
let selectedRowKey =
"";
let autoCountdownTimerId =
null;
let scanMode =
null;

function rowKey(
row
){

return `${row.symbol}:${row.tf}`;

}

function displaySymbol(
symbol
){

return String(
symbol ||
""
).replace(
/\.P$/i,
""
);

}

function persist(){

saveScriptPageState(
state
);

}

function persistSelection(
symbol,
tf
){

state.selection =
{
symbol:
String(
symbol ||
""
),
tf:
String(
tf ||
chartTf
),
rowKey:
selectedRowKey ||
rowKey(
{
symbol,
tf
}
)
};
persist();

}

function markPageVisited(){

state.lastVisitedAt =
Date.now();
persist();

}

function shouldOpenAfterBgScan(){

return (
state.auto.active &&
state.auto.lastScanAt >
(
state.lastVisitedAt ||
0
)
);

}

function openFirstFilteredRow(){

const rows =
filteredRows();

if(
!rows.length
){
return false;
}

const row =
rows[
0
];
selectScriptRow(
row
);
return true;

}

function restoreInitialChart(){

if(
!state.rows.length
){
return;
}

if(
shouldOpenAfterBgScan()
){
setFilterTf(
state.auto.tf
);
openFirstFilteredRow();
return;
}

const sel =
state.selection;

if(
sel?.symbol &&
sel?.tf
){
selectedRowKey =
sel.rowKey ||
rowKey(
sel
);
renderTable();
void openChart(
sel.symbol,
sel.tf
);
return;
}

if(
state.auto.active
){
setFilterTf(
state.auto.tf
);
openFirstFilteredRow();
}

}

function filteredRows(){

const all =
state.rows
.slice()
.sort(
(
a,
b
)=>
displaySymbol(
a.symbol
).localeCompare(
displaySymbol(
b.symbol
)
)
);

if(
state.filterTf ===
"all"
){
return all;
}

return all.filter(
row=>
row.tf ===
state.filterTf
);

}

function setFilterTf(
tf
){

state.filterTf =
tf;
persist();

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

renderTable();
}

function shouldIgnoreScriptListKeyNav(
e
){

const target =
e.target;

if(
!target
){
return false;
}

const tag =
target.tagName?.toLowerCase();

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

function scrollActiveScriptRowIntoView(){

requestAnimationFrame(
()=>{

const active =
els.tableBody?.querySelector(
".script-table-row.active"
);

active?.scrollIntoView(
{
block:
"nearest"
}
);

}
);

}

function selectScriptRow(
row
){

if(
!row
){
return;
}

selectedRowKey =
rowKey(
row
);
renderTable();
void openChart(
row.symbol,
row.tf
);
scrollActiveScriptRowIntoView();

}

function navigateScriptList(
direction
){

const rows =
filteredRows();

if(
!rows.length
){
return;
}

const goDown =
direction >
0;

let index =
rows.findIndex(
row=>
rowKey(
row
) ===
selectedRowKey
);

if(
index <
0
){
index =
goDown ?
-1 :
0;
}

if(
goDown
){
index =
(
index +
1
) %
rows.length;
}else{
index =
(
index -
1 +
rows.length
) %
rows.length;
}

selectScriptRow(
rows[
index
]
);

}

function bindScriptTfHotkeys(){

window.addEventListener(
"keydown",
e=>{

if(
e.defaultPrevented
){
return;
}

if(
e.metaKey ||
e.ctrlKey ||
e.altKey ||
e.shiftKey
){
return;
}

if(
shouldIgnoreScriptListKeyNav(
e
)
){
return;
}

const tf =
COINS_TF_HOTKEYS[
e.key
];

if(
!tf ||
!COINS_TF_VALUES.has(
tf
)
){
return;
}

e.preventDefault();
setChartTfUi(
tf
);

if(
chartSymbol
){
void openChart(
chartSymbol,
tf
);
}

}
);

}

function mergeRowsForTf(
tf,
incoming
){

const kept =
state.rows.filter(
row=>
row.tf !==
tf
);
state.rows =
[
...kept,
...incoming
];
persist();
renderTable();
}

function replaceAllRows(
rows
){

state.rows =
rows.slice();
persist();
renderTable();
}

function renderTable(){

if(
!els.tableBody
){
return;
}

const rows =
filteredRows();

if(
!rows.length
){

const filterLabel =
state.filterTf ===
"all"
? "всех ТФ"
: (
PATTERN_SCAN_TF_LABELS[
state.filterTf
] ||
state.filterTf
);

els.tableBody.innerHTML =
`<div class="script-table-empty">Нет сетапов (${filterLabel})</div>`;
return;

}

els.tableBody.innerHTML =
rows
.map(
row=>{
const key =
rowKey(
row
);
const sideClass =
row.side ===
"long"
? "script-side-long"
: "script-side-short";
const tfLabel =
PATTERN_SCAN_TF_LABELS[
row.tf
] ||
row.tf;
return `<button type="button" class="script-table-row${key === selectedRowKey ? " active" : ""}" data-row-key="${key}" data-symbol="${row.symbol}" data-tf="${row.tf}">
<span class="script-col-ticker">${displaySymbol(row.symbol)}</span>
<span class="script-col-tf">${tfLabel}</span>
<span class="script-col-side ${sideClass}">${PATTERN_SCAN_SIDE_LABELS[row.side] || row.side}</span>
</button>`;
}
)
.join(
""
);

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
displaySymbol(
progress.symbol
);

return `${pct}% · ${sym} ${tfLabel}`.trim();

}

function setScanStatus(
text
){

if(
els.scanStatus
){
els.scanStatus.textContent =
text;
}

}

function updateActionButtons(){

const running =
scanner().isRunning() ||
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

if(
scanner().isRunning() &&
scanMode ===
"auto"
){
els.autoStatus.textContent =
`Сканирование ${tfLabel}…`;
return;
}

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
"Запуск полного сканирования…"
);

if(
state.auto.active
){
stopAuto();
}

if(
scanner().isRunning()
){
scanner().stop();
await new Promise(
resolve=>{
setTimeout(
resolve,
120
);
}
);
}

if(
scanner().isRunning()
){
scanner().reset();
}

scanMode =
"full";
updateActionButtons();

try{

const rows =
await scanner().run(
{
tfs:
PATTERN_SCAN_ALL_TFS,
onHit(
_hit,
allRows
){
replaceAllRows(
allRows
);
},
onProgress(
progress
){

if(
progress.phase ===
"symbols"
){
setScanStatus(
"Загрузка списка монет…"
);
return;
}

if(
progress.running
){
setScanStatus(
formatProgress(
progress
)
);
}else{
setScanStatus(
progress.stopped
? "Сканирование остановлено"
: `Готово · найдено ${state.rows.length}`
);
}

updateActionButtons();

}
}
);

if(
rows ===
null
){
setScanStatus(
"Не удалось запустить сканирование"
);
}else if(
Array.isArray(
rows
)
){
replaceAllRows(
rows
);
}

}catch(
err
){
console.error(
"[script scan]",
err
);
setScanStatus(
`Ошибка: ${err?.message || err}`
);
}finally{

scanMode =
null;
updateActionButtons();

}

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
setScanStatus(
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
startAutoCountdown();
updateAutoStatus();
return;
}

if(
type ===
"started"
){
scanMode =
"auto";
updateActionButtons();
const tfLabel =
PATTERN_SCAN_TF_LABELS[
detail.tf
] ||
detail.tf;
setScanStatus(
`Авто: сканирование ${tfLabel}…`
);
return;
}

if(
type ===
"progress"
){
const {
progress,
tf
} =
detail;

if(
progress?.running
){
setScanStatus(
`Авто: ${formatProgress(progress)}`
);
}else if(
progress &&
!progress.stopped
){
const tfLabel =
PATTERN_SCAN_TF_LABELS[
tf
] ||
tf;
setScanStatus(
`Авто: готово · ${filteredRows().length} на ${tfLabel}`
);
}
updateActionButtons();
return;
}

if(
type ===
"hit" ||
type ===
"finished"
){
state =
loadScriptPageState();
renderTable();
scanMode =
null;
updateActionButtons();
startAutoCountdown();
}

if(
type ===
"stopped"
){
scanMode =
null;
updateActionButtons();
}

}

function setChartTfUi(
tf
){

chartTf =
tf;

els.chartTfDesktop?.querySelectorAll(
".tf-btn"
).forEach(
btn=>{
btn.classList.toggle(
"active",
btn.dataset.tf ===
tf
);
}
);

const tfLabel =
PATTERN_SCAN_TF_LABELS[
tf
] ||
tf;

if(
els.chartTfLabel
){
els.chartTfLabel.textContent =
tfLabel;
}

els.chartTfMenu?.querySelectorAll(
".screener-mobile-menu-item"
).forEach(
btn=>{
btn.classList.toggle(
"active",
btn.dataset.tf ===
tf
);
}
);

}

function initScriptChart(){

if(
scriptChart ||
!els.chartMount
){
return;
}

scriptChart =
createScriptPageChart(
els.chartMount
);

}

async function waitForChartMountSize(
el,
maxFrames =
60
){

for(
let i =
0;
i <
maxFrames;
i++
){

if(
el.clientWidth >=
2 &&
el.clientHeight >=
2
){
return true;
}

await new Promise(
resolve=>{
requestAnimationFrame(
resolve
);
}
);

}

return (
el.clientWidth >=
2 &&
el.clientHeight >=
2
);

}

async function openChart(
symbol,
tf
){

if(
tf
){
setChartTfUi(
tf
);
}

if(
!symbol
){
return;
}

initScriptChart();

if(
!scriptChart ||
!els.chartMount
){
return;
}

await waitForChartMountSize(
els.chartMount
);

chartSymbol =
symbol;

if(
els.currentSymbol
){
els.currentSymbol.textContent =
displaySymbol(
symbol
);
}

try{
await scriptChart.load(
symbol,
chartTf
);
persistSelection(
symbol,
chartTf
);
}catch(
err
){
console.error(
"[script chart]",
err
);
}

}

function openTerminalPage(
event
){

if(
event
){
event.stopPropagation();
}

const symbol =
scriptChart?.getSymbol?.() ||
chartSymbol;

const tf =
scriptChart?.getTf?.() ||
chartTf;

if(
!symbol
){
return;
}

window.location.href =
`/terminal.html?symbol=${encodeURIComponent(symbol)}&tf=${encodeURIComponent(tf)}`;

}

function toggleChartTfMenu(
open
){

const menu =
els.chartTfMenu;
const trigger =
els.chartTfTrigger;

if(
!menu ||
!trigger
){
return;
}

const show =
typeof open ===
"boolean"
? open
: menu.classList.contains(
"hidden"
);

menu.classList.toggle(
"hidden",
!show
);
trigger.setAttribute(
"aria-expanded",
show ?
"true"
: "false"
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
els.scanStatus =
document.getElementById(
"script-scan-status"
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
els.tableBody =
document.getElementById(
"script-table-body"
);
els.currentSymbol =
document.getElementById(
"current-symbol"
);
els.chartMount =
document.getElementById(
"script-chart-mount"
);
els.chartTfDesktop =
document.getElementById(
"script-chart-tf-desktop"
);
els.openTerminal =
document.getElementById(
"script-open-terminal"
);
els.chartTfTrigger =
document.getElementById(
"script-chart-tf-trigger"
);
els.chartTfMenu =
document.getElementById(
"script-chart-tf-menu"
);
els.chartTfLabel =
document.getElementById(
"script-chart-tf-label"
);

}

export function mountScriptPage(){

bindEls();
state =
loadScriptPageState();

wireEvents();
restoreUi();
initScriptChart();
bindScriptTfHotkeys();

window.__scriptPageReady =
true;

}

function restoreUi(){

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

renderTable();
updateActionButtons();
updateAutoStatus();

if(
state.rows.length
){
setScanStatus(
`В списке ${state.rows.length} сетапов`
);
}

if(
state.auto.active
){
startAutoCountdown();
}

requestAnimationFrame(
()=>{
requestAnimationFrame(
()=>{
void restoreInitialChart();
}
);
}
);

}

function wireEvents(){

window.addEventListener(
"pagehide",
markPageVisited
);

window.addEventListener(
SCRIPT_SCAN_BG_EVENT,
handleBackgroundScanEvent
);

els.chartTfDesktop?.addEventListener(
"click",
event=>{

const btn =
event.target?.closest?.(
".tf-btn"
);

if(
!btn?.dataset?.tf
){
return;
}

void openChart(
chartSymbol,
btn.dataset.tf
);

}
);

els.openTerminal?.addEventListener(
"click",
openTerminalPage
);

els.chartTfTrigger?.addEventListener(
"click",
event=>{
event.stopPropagation();
toggleChartTfMenu();
}
);

els.chartTfMenu?.addEventListener(
"click",
event=>{

const btn =
event.target?.closest?.(
".screener-mobile-menu-item"
);

if(
!btn?.dataset?.tf
){
return;
}

toggleChartTfMenu(
false
);
void openChart(
chartSymbol,
btn.dataset.tf
);

}
);

document.addEventListener(
"click",
event=>{

if(
!els.chartTfMenu ||
els.chartTfMenu.classList.contains(
"hidden"
)
){
return;
}

if(
event.target?.closest?.(
"#script-chart-tf-trigger, #script-chart-tf-menu"
)
){
return;
}

toggleChartTfMenu(
false
);

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

if(
!state.auto.active
){
return;
}

state.auto.tf =
els.autoTf.value;
persist();

}
);

els.autoPeriod?.addEventListener(
"change",
()=>{

if(
!state.auto.active
){
return;
}

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

els.tableBody?.addEventListener(
"click",
event=>{

const row =
event.target?.closest?.(
".script-table-row"
);

if(
!row
){
return;
}

selectedRowKey =
row.dataset.rowKey ||
"";
renderTable();
void openChart(
row.dataset.symbol,
row.dataset.tf
);
scrollActiveScriptRowIntoView();

}
);

document.addEventListener(
"keydown",
e=>{

if(
shouldIgnoreScriptListKeyNav(
e
)
){
return;
}

const goDown =
e.code ===
"ArrowDown" ||
e.code ===
"Space" ||
e.key ===
" ";

const goUp =
e.code ===
"ArrowUp";

if(
!goDown &&
!goUp
){
return;
}

e.preventDefault();
navigateScriptList(
goDown ?
1 :
-1
);

}
);

}
