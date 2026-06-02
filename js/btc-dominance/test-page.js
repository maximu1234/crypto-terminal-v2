import {
loadLightweightCharts
} from "../charts-lib-boot.js?v=3";

import {
fetchBtcDominanceHistory,
rangeLabelToDays
} from "./fetch.js?v=1";

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

let chart =
null;
let lineSeries =
null;
let loadSeq =
0;
let activeRange =
"3M";

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

function destroyChart(){

if(
chart
){
chart.remove();
chart =
null;
lineSeries =
null;
}

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
textColor: "#94a3b8"
},
grid: {
vertLines: {
color: "#1e293b"
},
horzLines: {
color: "#1e293b"
}
},
rightPriceScale: {
borderColor: "#334155"
},
timeScale: {
borderColor: "#334155",
timeVisible: true,
secondsVisible: false
},
crosshair: {
mode: LightweightCharts.CrosshairMode.Normal
},
autoSize: true
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
crosshairMarkerRadius: 4
});

const ro =
new ResizeObserver(()=>{
if(
chart
){
chart.applyOptions({
width: chartEl.clientWidth,
height: chartEl.clientHeight
});
}
});

ro.observe(
chartEl
);

}

async function loadRange(
label
){

const seq = ++loadSeq;
activeRange =
label;

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
`Загрузка ${label} (CoinGecko)…`
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

lineSeries.setData(
points
);

if(
points.length
){
chart.timeScale().fitContent();
}

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
`${data.pointCount || points.length} точек · ${data.days} · ${data.method || "—"}${staleTag}`;
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

async function boot(){

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

void boot();
