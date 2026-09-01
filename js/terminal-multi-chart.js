/**
 * Несколько графиков одной монеты на Терминале (разные ТФ).
 * Слот 0 — существующий #chart-wrap (только меньше в сетке; код не трогаем).
 * Слоты 1–3 — тот же bootstrap, что у виджета Скринера.
 */
import {
createTerminalScreenerChartPane
} from "./terminal-screener-chart-pane.js?v=16";

const STORAGE_LAYOUT =
"terminal_chart_layout_count_v1";

const STORAGE_TFS =
"terminal_chart_layout_tfs_v1";

const DEFAULT_TFS =
[
"60",
"15",
"240",
"5"
];

const TF_OPTIONS =
[
[
"1",
"1m"
],
[
"5",
"5m"
],
[
"15",
"15m"
],
[
"60",
"1h"
],
[
"240",
"4h"
],
[
"D",
"1D"
],
[
"W",
"W"
]
];

let layoutCount =
1;
let paneTfs =
[
...DEFAULT_TFS
];
let deps =
null;
let gridEl =
null;
let pickerUi =
null;
/** @type {Map<number, object>} */
const extraPanes =
new Map();

let visibilityObserver =
null;
let primaryRsiHome =
null;

function readLayout(){

const n =
Number(
localStorage.getItem(
STORAGE_LAYOUT
)
);

return [
1,
2,
3,
4
].includes(
n
)
? n
: 1;

}

export function getStoredTerminalLayoutCount(){

return readLayout();

}

export function isTerminalMultiChartLayout(){

return readLayout() >
1;

}

function saveLayout(
count
){

localStorage.setItem(
STORAGE_LAYOUT,
String(
count
)
);

}

function readTfs(){

try{
const raw =
JSON.parse(
localStorage.getItem(
STORAGE_TFS
) ||
"null"
);

if(
!Array.isArray(
raw
)
){
return [
...DEFAULT_TFS
];
}

return DEFAULT_TFS.map(
(
tf,
i
)=>
String(
raw[
i
] ||
tf
)
);
}catch{
return [
...DEFAULT_TFS
];
}

}

function saveTfs(){

localStorage.setItem(
STORAGE_TFS,
JSON.stringify(
paneTfs
)
);

}

function tfSelectHtml(
slot,
value
){

const options =
TF_OPTIONS.map(
([
v,
label
])=>
`<option value="${v}" ${v === value ? "selected" : ""}>${label}</option>`
).join(
""
);

return `<select class="coins-chart-slot-tf" data-slot="${slot}" aria-label="Таймфрейм графика ${slot + 1}">${options}</select>`;

}

function ensureGridDom(){

if(
gridEl
){
return;
}

const stack =
document.getElementById(
"charts-stack-panes"
);
const chartWrap =
document.getElementById(
"chart-wrap"
);

if(
!stack ||
!chartWrap
){
return;
}

gridEl =
document.createElement(
"div"
);
gridEl.id =
"coins-multi-chart-grid";
gridEl.className =
"coins-multi-chart-grid coins-multi-chart-grid--1";

const slot0 =
document.createElement(
"div"
);
slot0.className =
"coins-chart-slot coins-chart-slot--0";
slot0.dataset.slot =
"0";

const bar0 =
document.createElement(
"div"
);
bar0.className =
"coins-chart-slot-bar";
bar0.innerHTML =
tfSelectHtml(
0,
paneTfs[
0
]
);

stack.insertBefore(
gridEl,
chartWrap
);
gridEl.appendChild(
slot0
);
slot0.appendChild(
bar0
);
slot0.appendChild(
chartWrap
);

bar0.querySelector(
".coins-chart-slot-tf"
)?.addEventListener(
"change",
e=>{
const tf =
e.target.value;
if(
!tf ||
tf ===
paneTfs[
0
]
){
return;
}
paneTfs[
0
] =
tf;
saveTfs();
deps?.setPrimaryTf?.(
tf
);
}
);

}

function destroyExtraPane(
slot
){

const pane =
extraPanes.get(
slot
);

if(
!pane
){
return;
}

if(
pane?.slotEl
){
visibilityObserver?.unobserve?.(
pane.slotEl
);
}

pane.api?.destroy?.();
pane.slotEl?.remove();
extraPanes.delete(
slot
);

}

function createExtraPane(
slot
){

destroyExtraPane(
slot
);

const slotEl =
document.createElement(
"div"
);
slotEl.className =
`coins-chart-slot coins-chart-slot--${slot}`;
slotEl.dataset.slot =
String(
slot
);

const bar =
document.createElement(
"div"
);
bar.className =
"coins-chart-slot-bar";
bar.innerHTML =
tfSelectHtml(
slot,
paneTfs[
slot
] ||
DEFAULT_TFS[
slot
] ||
"15"
);

const body =
document.createElement(
"div"
);
body.className =
"coins-chart-slot-body";

slotEl.appendChild(
bar
);
slotEl.appendChild(
body
);
gridEl.appendChild(
slotEl
);

const api =
createTerminalScreenerChartPane({
mountEl:
body,
showRsi:
true
});

const pane =
{
slot,
slotEl,
tf:
paneTfs[
slot
] ||
DEFAULT_TFS[
slot
] ||
"15",
api
};

bar.querySelector(
".coins-chart-slot-tf"
)?.addEventListener(
"change",
e=>{
const tf =
e.target.value;

if(
!tf ||
tf ===
pane.tf
){
return;
}

pane.tf =
tf;
paneTfs[
slot
] =
tf;
saveTfs();
void loadExtraPane(
pane
);
}
);

extraPanes.set(
slot,
pane
);

observeExtraPaneVisibility(
pane
);

}

function syncTfBars(){

gridEl?.querySelectorAll(
".coins-chart-slot-tf"
).forEach(
select=>{
const slot =
Number(
select.dataset.slot
);
if(
Number.isFinite(
slot
) &&
paneTfs[
slot
]
){
select.value =
paneTfs[
slot
];
}
}
);

}

function syncPrimaryRsiDom(){

const rsiWrap =
document.getElementById(
"rsi-wrap"
);
const stack =
document.getElementById(
"charts-stack-panes"
);
const slot0 =
gridEl?.querySelector(
".coins-chart-slot--0"
);

if(
!rsiWrap ||
!stack
){
return;
}

if(
!primaryRsiHome
){
primaryRsiHome =
{
parent:
rsiWrap.parentElement,
next:
rsiWrap.nextElementSibling
};
}

if(
layoutCount >
1 &&
slot0
){

if(
rsiWrap.parentElement !==
slot0
){
slot0.appendChild(
rsiWrap
);
}

deps?.setRsiPaneActive?.(
true
);
return;

}

const home =
primaryRsiHome;

if(
home?.parent &&
rsiWrap.parentElement !==
home.parent
){

if(
home.next &&
home.next.parentElement ===
home.parent
){
home.parent.insertBefore(
rsiWrap,
home.next
);
}else{
home.parent.appendChild(
rsiWrap
);
}

}

const showRsi =
!rsiWrap.classList.contains(
"indicator-pane-hidden"
);

deps?.setRsiPaneActive?.(
showRsi
);

}

function applyLayoutClass(){

if(
!gridEl
){
return;
}

gridEl.className =
`coins-multi-chart-grid coins-multi-chart-grid--${layoutCount}`;
document.body.classList.toggle(
"coins-multi-chart-on",
layoutCount >
1
);

document.body.classList.toggle(
"coins-drawings-ui-off",
layoutCount >
1
);

if(
layoutCount >
1
){
deps?.onMultiChartLayout?.();
}else{
deps?.onSingleChartLayout?.();
}

document.querySelector(
".coins-tf-desktop"
)?.classList.toggle(
"hidden",
layoutCount >
1
);

syncPrimaryRsiDom();

}

function triggerSecondaryReload(){

if(
layoutCount <=
1
){
return;
}

void reloadSecondaryPanes();

}

function applyLayout(
count,
{
reloadPrimary =
true
} = {}
){

layoutCount =
count;
saveLayout(
count
);
ensureGridDom();
applyLayoutClass();

for(
const slot of [
...extraPanes.keys()
]
){

if(
slot >=
count
){
destroyExtraPane(
slot
);
}

}

for(
let slot =
1;
slot <
count;
slot++
){

if(
!extraPanes.has(
slot
)
){
createExtraPane(
slot
);
}

}

syncTfBars();
pickerUi?.syncIcon?.();

if(
layoutCount >
1 &&
reloadPrimary &&
paneTfs[
0
] &&
deps?.getPrimaryTf?.() !==
paneTfs[
0
]
){
deps.setPrimaryTf?.(
paneTfs[
0
]
);
return;
}

void triggerSecondaryReload();

requestAnimationFrame(
()=>{
deps?.scheduleResizeCharts?.();
}
);

}

function ensureVisibilityObserver(){

if(
visibilityObserver
){
return;
}

visibilityObserver =
new IntersectionObserver(
entries=>{
for(
const entry of
entries
){
const slot =
Number(
entry.target?.dataset?.slot
);
const pane =
extraPanes.get(
slot
);
if(
!pane
){
continue;
}
pane.api?.setStreamPaused?.(
!entry.isIntersecting
);
}
},
{
root:
null,
threshold:
0.08
}
);

}

function observeExtraPaneVisibility(
pane
){

ensureVisibilityObserver();

if(
pane?.slotEl
){
visibilityObserver?.observe?.(
pane.slotEl
);
}

}

async function loadExtraPane(
pane
){

const symbol =
deps?.getSymbol?.();

if(
!symbol ||
!pane?.api
){
return;
}

await pane.api.load(
symbol,
pane.tf
);

}

export async function reloadSecondaryPanes(){

if(
layoutCount <=
1
){
return;
}

const symbol =
deps?.getSymbol?.();

if(
!symbol
){
return;
}

await Promise.all(
[
...extraPanes.values()
].map(
pane=>
loadExtraPane(
pane
)
)
);

}

export function getTerminalLayoutCount(){

return layoutCount;

}

export function initTerminalMultiChart(
options
){

deps =
options;
layoutCount =
readLayout();
paneTfs =
readTfs();

if(
options.getPrimaryTf?.()
){
paneTfs[
0
] =
options.getPrimaryTf();
}

ensureGridDom();
applyLayoutClass();

for(
let slot =
1;
slot <
layoutCount;
slot++
){
createExtraPane(
slot
);
}

syncTfBars();

pickerUi =
options.mountPicker?.({
getCount:()=>
layoutCount,
onSelect:
count=>{
applyLayout(
count
);
}
});

pickerUi?.syncIcon?.();

if(
layoutCount >
1
){
if(
paneTfs[
0
] &&
options.getPrimaryTf?.() !==
paneTfs[
0
]
){
options.setPrimaryTf?.(
paneTfs[
0
]
);
}else{
triggerSecondaryReload();
}

requestAnimationFrame(
()=>{
options.scheduleResizeCharts?.();
}
);

}

return {
reloadSecondaryPanes,
scheduleSecondaryReload:
triggerSecondaryReload,
applyLayout,
getLayoutCount:()=>
layoutCount
};

}

export function syncPrimaryTfToLayout(
tf
){

if(
!tf
){
return;
}

paneTfs[
0
] =
tf;
saveTfs();

if(
gridEl
){
const select =
gridEl.querySelector(
'.coins-chart-slot-tf[data-slot="0"]'
);
if(
select
){
select.value =
tf;
}
}

}
