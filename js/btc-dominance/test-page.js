import {
loadLightweightCharts
} from "../charts-lib-boot.js?v=3";

import {
fetchBtcDominanceHistory,
rangeLabelToDays
} from "./fetch.js?v=1";

const chartWrapEl =
document.getElementById(
"btc-d-chart-wrap"
);
const chartEl =
document.getElementById(
"btc-d-chart"
);
const statusEl =
document.getElementById(
"btc-d-status"
);
const valueEl =
document.getElementById(
"btc-d-value"
);
const metaEl =
document.getElementById(
"btc-d-meta"
);
const rangeBar =
document.getElementById(
"btc-d-ranges"
);
const sourceTabsEl =
document.getElementById(
"btc-d-source-tabs"
);
const mcControlsEl =
document.getElementById(
"btc-d-mc-controls"
);
const tvHintEl =
document.getElementById(
"btc-d-tv-hint"
);
const paneTvEl =
document.getElementById(
"btc-d-pane-tv"
);
const paneMcEl =
document.getElementById(
"btc-d-pane-mc"
);

let activeSource =
"tv";
let mcBooted =
false;

const VISIBLE_BARS =
Object.freeze({
"1D": Infinity,
"1W": Infinity,
"1M": 420,
"3M": 520,
"1Y": 720,
ALL: 960
});

let chart =
null;
let lineSeries =
null;
let loadSeq =
0;
let activeRange =
"3M";
let currentPoints =
[];
let userAdjustedZoom =
false;
let resizeObserver =
null;

function setStatus(
text,
isError = false
){

if(
statusEl
){
statusEl.textContent =
text;
statusEl.classList.toggle(
"error",
isError
);
}

}

function formatPct(
value
){

if(
value ==
null ||
!Number.isFinite(
value
)
){
return "—";
}

return `${value.toFixed(2)}%`;

}

function markUserZoom(){

userAdjustedZoom =
true;

}

function applyDefaultZoom(
points,
rangeLabel
){

if(
!chart ||
!points?.length
){
return;
}

const maxVisible =
VISIBLE_BARS[
rangeLabel
] ??
520;

if(
!Number.isFinite(
maxVisible
) ||
maxVisible >=
points.length
){

chart.timeScale().fitContent();
return;

}

const lastIndex =
points.length -
1;
const visible =
Math.min(
maxVisible,
points.length
);
const rightMargin =
Math.max(
12,
Math.round(
visible *
0.08
)
);

chart.timeScale().applyOptions({
rightOffset: 12,
fixRightEdge: false
});

chart.timeScale().setVisibleLogicalRange({

from: Math.max(
0,
lastIndex -
visible +
1
),

to: lastIndex +
rightMargin

});

}

function syncChartSize(){

if(
!chart ||
!chartEl
){
return;
}

const w =
chartEl.clientWidth;
const h =
chartEl.clientHeight;

if(
w <
2 ||
h <
2
){
return;
}

chart.applyOptions({
width: w,
height: h
});

if(
!userAdjustedZoom &&
currentPoints.length
){
applyDefaultZoom(
currentPoints,
activeRange
);
}

}

function destroyChart(){

if(
resizeObserver
){
resizeObserver.disconnect();
resizeObserver =
null;
}

if(
chart
){
chart.remove();
chart =
null;
lineSeries =
null;
}

userAdjustedZoom =
false;
currentPoints =
[];

}

function ensureChart(){

if(
chart
){
return;
}

if(
!chartEl
){
return;
}

chart =
LightweightCharts.createChart(
chartEl,
{
layout: {
background: {
color: "#0b1220"
},
textColor: "#9ca3af"
},
grid: {
vertLines: {
color: "#161b26"
},
horzLines: {
color: "#161b26"
}
},
rightPriceScale: {
borderColor: "#1f2937",
autoScale: true,
scaleMargins: {
top: 0.12,
bottom: 0.12
}
},
timeScale: {
borderColor: "#1f2937",
timeVisible: true,
secondsVisible: false,
rightOffset: 12,
fixRightEdge: false
},
crosshair: {
mode: LightweightCharts.CrosshairMode.Normal
},
handleScroll: {
mouseWheel: true,
pressedMouseMove: true,
horzTouchDrag: true,
vertTouchDrag: false
},
handleScale: {
axisPressedMouseMove: {
time: true,
price: true
},
axisDoubleClickReset: {
time: true,
price: true
},
mouseWheel: true,
pinch: true
}
}
);

lineSeries =
chart.addLineSeries({
color: "#f59e0b",
lineWidth: 2,
priceFormat: {
type: "custom",
formatter: v=>
`${Number(v).toFixed(2)}%`
},
crosshairMarkerRadius: 4,
lastValueVisible: true,
priceLineVisible: true
});

chartEl.addEventListener(
"wheel",
markUserZoom,
{ passive: true }
);
chartEl.addEventListener(
"mousedown",
markUserZoom
);
chartEl.addEventListener(
"touchstart",
markUserZoom,
{ passive: true }
);

resizeObserver =
new ResizeObserver(
syncChartSize
);
resizeObserver.observe(
chartWrapEl ||
chartEl
);

requestAnimationFrame(
syncChartSize
);

}

async function loadRange(
label
){

const seq = ++loadSeq;
activeRange =
label;
userAdjustedZoom =
false;

if(
rangeBar
){
rangeBar.querySelectorAll(
"[data-range]"
).forEach(btn=>{
btn.classList.toggle(
"active",
btn.dataset.range ===
label
);
});
}

const days =
rangeLabelToDays(
label
);

setStatus(
`Загрузка ${label}…`
);

try{

const data =
await fetchBtcDominanceHistory({
days
});

if(
seq !==
loadSeq
){
return;
}

ensureChart();

const points =
(data.points ||
[]).map(p=>({
time: p.time,
value: p.value
}));

currentPoints =
points;

lineSeries.setData(
points
);

applyDefaultZoom(
points,
label
);

requestAnimationFrame(
syncChartSize
);

const current =
data.current ??
(
points.length
? points[
points.length -
1
].value
: null
);

if(
valueEl
){
valueEl.textContent =
formatPct(
current
);
}

if(
metaEl
){
const staleTag =
data.stale
? " · cache"
: "";
metaEl.textContent =
`${data.pointCount || points.length} · ${data.method || "—"}${staleTag}`;
}

setStatus(
"OK"
);

}catch(
err
){

if(
seq !==
loadSeq
){
return;
}

destroyChart();

if(
valueEl
){
valueEl.textContent =
"—";
}

if(
metaEl
){
metaEl.textContent =
"";
}

setStatus(
err?.message ||
String(
err
),
true
);

}

}

function bindRanges(){

if(
!rangeBar
){
return;
}

rangeBar.addEventListener(
"click",
evt=>{

const btn =
evt.target.closest(
"[data-range]"
);

if(
!btn
){
return;
}

void loadRange(
btn.dataset.range
);

});

}

function bindSourceTabs(){

if(
!sourceTabsEl
){
return;
}

sourceTabsEl.addEventListener(
"click",
evt=>{

const btn =
evt.target.closest(
"[data-source]"
);

if(
!btn
){
return;
}

void setActiveSource(
btn.dataset.source
);

});

}

function setPaneVisible(
pane,
visible
){

if(
!pane
){
return;
}

pane.classList.toggle(
"hidden",
!visible
);
pane.hidden =
!visible;

}

async function setActiveSource(
source
){

if(
source !==
"tv" &&
source !==
"mc"
){
return;
}

activeSource =
source;

sourceTabsEl?.querySelectorAll(
"[data-source]"
).forEach(btn=>{
const on =
btn.dataset.source ===
source;
btn.classList.toggle(
"active",
on
);
btn.setAttribute(
"aria-selected",
on ?
"true" :
"false"
);
});

mcControlsEl?.classList.toggle(
"hidden",
source !==
"mc"
);
tvHintEl?.classList.toggle(
"hidden",
source !==
"tv"
);

setPaneVisible(
paneTvEl,
source ===
"tv"
);
setPaneVisible(
paneMcEl,
source ===
"mc"
);

if(
source ===
"mc"
){
await bootMcChart();
requestAnimationFrame(
syncChartSize
);
}

}

async function bootMcChart(){

if(
mcBooted
){
return;
}

mcBooted =
true;

bindRanges();

try{
await loadLightweightCharts();
}catch(
err
){
setStatus(
`Chart lib: ${err?.message || err}`,
true
);
return;
}

await loadRange(
activeRange
);

}

async function boot(){

bindSourceTabs();

await setActiveSource(
"tv"
);

}

void boot();
