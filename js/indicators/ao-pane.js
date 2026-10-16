/**
 * Awesome Oscillator — гистограмма на отдельной панели (как Volume).
 */
import {
createVolumeChart,
syncLinkedChartTimescales,
linkPairedChartTimeScales,
appendFutureWhitespaceBars,
computeChartFutureMarginBars,
coinsTfVisibleBars
} from "../chart-import.js?v=613e412b";

import {
calculateAwesomeOscillator,
aoBarColor,
formatAoLegendValue,
formatAoNumber
} from "./ao-math.js?v=601925a0";

import {
isChartLayoutReady
} from "../chart-layout-gate.js?v=4a8798af";

import {
captureHealthyVisibleLogicalRange,
pinVisibleLogicalRangeBriefly
} from "../chart-visible-range.js?v=d523062b";

import {
isCoinsPaneHeightDrag
} from "../terminal-layout-resize.js?v=671925b0";

import {
isBottomIndicatorPane
} from "./indicator-pane-order.js?v=b9987606";

import {
syncPaneViewportAfterData
} from "./indicator-pane-viewport.js?v=a8633490";

export const AO_PANE_ID =
"ao";

function aoPriceFormat(
reference
){

const abs =
Math.abs(
Number(
reference
)
);
const minMove =
!Number.isFinite(
abs
) ||
abs >=
10
? 1
: abs >=
1
? 0.01
: abs >=
0.01
? 0.001
: 0.0001;

return {
type:
"custom",
minMove,
formatter:
formatAoNumber
};

}

function buildAoDisplayPoints(
candles,
tf,
visibleBarsCap
){

if(
!candles?.length
){
return [];
}

const aoPoints =
calculateAwesomeOscillator(
candles
);

if(
!aoPoints.length
){
return [];
}

const cap =
typeof visibleBarsCap ===
"number"
? visibleBarsCap
: null;
const visibleBars =
typeof cap ===
"number" &&
cap >
0
? Math.min(
cap,
candles.length
)
: coinsTfVisibleBars(
tf,
candles.length
);

const futureMargin =
computeChartFutureMarginBars(
visibleBars
);

const byTime =
new Map(
aoPoints.map(
p=>[
p.time,
p.value
]
)
);

const merged =
candles.map(
bar=>({
time:
bar.time,
value:
byTime.get(
bar.time
) ??
null
})
);

return appendFutureWhitespaceBars(
merged,
futureMargin,
tf
);

}

export function createAoPaneIndicator(
getHost
){

let enabled =
false;
let chart =
null;
let series =
null;
let unbindTimeSync =
null;
let lastAoValue =
null;
let lastAoDrawCandles =
[];
let lastAoSeriesData =
[];
let lastAoMinMove =
null;

function wrapEl(){

return document.getElementById(
"ao-wrap"
);

}

function chartEl(){

return document.getElementById(
"ao-chart"
);

}

function hudValueEl(){

return document.getElementById(
"ao-hud-value"
);

}

function updateHud(){

const el =
hudValueEl();

if(
!el
){
return;
}

el.textContent =
formatAoLegendValue(
lastAoValue
);

}

function updateTimeScaleVisibility(){

if(
!chart
){
return;
}

const showTimeScale =
isBottomIndicatorPane(
AO_PANE_ID
);

chart.timeScale().applyOptions(
{
visible:
showTimeScale,
timeVisible:
showTimeScale,
ticksVisible:
showTimeScale
}
);

}

function bindTimeSync(){

unbindTimeSync?.();
unbindTimeSync =
null;

const mainChart =
getHost?.()?.chart;

if(
!mainChart ||
!chart
){
return;
}

unbindTimeSync =
linkPairedChartTimeScales(
mainChart,
chart,
updateTimeScaleVisibility,
{
linkedDrivesMain:
false,
isLocked:()=>
!isChartLayoutReady() ||
isCoinsPaneHeightDrag()
}
);

syncLinkedChartTimescales(
mainChart,
chart
);
updateTimeScaleVisibility();

}

function ensureChart(){

if(
chart
){
return true;
}

const el =
chartEl();

if(
!el
){
return false;
}

const created =
createVolumeChart(
el
);

chart =
created.chart;
series =
created.series;

series.applyOptions(
{
base:
0,
lastValueVisible:
true,
priceLineVisible:
false,
priceFormat:
aoPriceFormat(
null
)
}
);

return true;

}

function destroyChart(){

unbindTimeSync?.();
unbindTimeSync =
null;

if(
chart
){
try{
chart.remove();
}catch{
/* ignore */
}
}

chart =
null;
series =
null;
lastAoValue =
null;
lastAoDrawCandles =
[];
lastAoSeriesData =
[];
lastAoMinMove =
null;

}

function applyVisibility(){

wrapEl()?.classList.toggle(
"indicator-pane-hidden",
!enabled
);

}

function ensurePaneChartSized(){

if(
!enabled ||
!chart
){
return;
}

const host =
getHost?.();

const w =
host?.getChartWrapWidth?.() ||
0;

if(
w >
0
){
onResize(
w
);
}

}

function pulseAoAutoscale(){

if(
!chart
){
return;
}

try{
const ps =
chart.priceScale(
"right"
);

ps.applyOptions({
autoScale:
false
});

ps.applyOptions({
autoScale:
true,
scaleMargins:{
top:
0.1,
bottom:
0.1
}
});
}catch{
/* ignore */
}

}

function syncAoAfterData(){

syncPaneViewportAfterData(
getHost,
chart,
{
pulseAutoscale:
pulseAoAutoscale,
updateTimeScaleVisibility
}
);

}

function aoPointEqual(
a,
b
){

return a?.time ===
b?.time &&
a?.value ===
b?.value &&
a?.color ===
b?.color;

}

function aoSeriesUnchanged(
next
){

if(
lastAoSeriesData.length !==
next.length
){
return false;
}

for(
let i =
0;
i <
next.length;
i++
){

if(
!aoPointEqual(
lastAoSeriesData[i],
next[i]
)
){
return false;
}

}

return true;

}

function aoTimesMatch(
next
){

if(
lastAoSeriesData.length !==
next.length
){
return false;
}

for(
let i =
0;
i <
next.length;
i++
){

if(
lastAoSeriesData[i]?.time !==
next[i]?.time
){
return false;
}

}

return true;

}

function refreshData(){

if(
!enabled ||
!series
){
return;
}

const host =
getHost?.();

const raw =
host?.getCandles?.() ||
[];

const tf =
host?.getTf?.() ||
"D";

const points =
buildAoDisplayPoints(
raw,
tf,
host?.getVisibleBarsCap?.()
);

const paintedValue =
lastAoValue;

let prev =
null;
lastAoValue =
null;

const data =
[];

for(
const bar of points
){

if(
bar.value ==
null ||
!Number.isFinite(
bar.value
)
){
data.push({
time:
bar.time
});
continue;
}

const color =
aoBarColor(
bar.value,
prev
);

prev =
bar.value;
lastAoValue =
bar.value;

data.push({
time:
bar.time,
value:
bar.value,
color
});

}

/*
 * Повторный refresh после догрузки хвоста приходит с теми же барами.
 * setData на гистограмме гасит её на кадр — AO мигает уже после
 * того, как график и RSI стоят.
 */
if(
aoSeriesUnchanged(
data
) ||
aoTimesMatch(
data
)
){
lastAoValue =
paintedValue;
return;
}

ensurePaneChartSized();

const fmt =
aoPriceFormat(
lastAoValue
);
lastAoMinMove =
fmt.minMove;
series.applyOptions({
priceFormat:
fmt
});

series.setData(
data
);
lastAoSeriesData =
data;
lastAoDrawCandles =
points.filter(
bar=>
Number.isFinite(
bar?.value
)
).map(
bar=>({
time:
bar.time,
open:
bar.value,
high:
bar.value,
low:
bar.value,
close:
bar.value
})
);
syncAoAfterData();
updateHud();
getHost?.()?.onIndicatorDataReady?.(
"ao"
);

}

function enable(){

const mainChart =
getHost?.()?.chart;
const pinned =
captureHealthyVisibleLogicalRange(
mainChart
);

if(
enabled
){
refreshData();
pinVisibleLogicalRangeBriefly(
mainChart,
pinned,
{
suppressMs:
8000,
afterResizeMs:
120
}
);
return;
}

if(
!ensureChart()
){
return;
}

enabled =
true;
applyVisibility();
ensurePaneChartSized();
refreshData();
bindTimeSync();
/* Показ панели AO жмёт main chart → from≈0; guard как у Volume. */
pinVisibleLogicalRangeBriefly(
mainChart,
pinned,
{
suppressMs:
8000,
afterResizeMs:
120
}
);

}

function disable(){

const mainChart =
getHost?.()?.chart;
const pinned =
captureHealthyVisibleLogicalRange(
mainChart
);

if(
!enabled
){
return;
}

enabled =
false;
unbindTimeSync?.();
unbindTimeSync =
null;

if(
series
){
series.setData(
[]
);
}

lastAoValue =
null;
lastAoDrawCandles =
[];
lastAoSeriesData =
[];
lastAoMinMove =
null;
updateHud();
applyVisibility();
pinVisibleLogicalRangeBriefly(
mainChart,
pinned,
{
suppressMs:
5000,
afterResizeMs:
80
}
);

}

function onSymbolChange(){

if(
!enabled
){
return;
}

refreshData();

}

function onCandlesUpdate(){

refreshData();

}

function syncViewport(
ctx
){

if(
!enabled ||
!chart ||
!ctx?.mainChart
){
return;
}

/* Copy main viewport — do not recompute barSpacing from this pane's width. */
syncPaneViewportAfterData(
getHost,
chart,
{
updateTimeScaleVisibility,
pulseAutoscale:
pulseAoAutoscale
}
);

}

function onLayoutChange(){

updateTimeScaleVisibility();

if(
enabled &&
chart
){
syncLinkedChartTimescales(
getHost?.()?.chart,
chart
);
}

}

function onResize(
width
){

if(
!enabled ||
!chart
){
return;
}

const paneHeight =
wrapEl()?.getBoundingClientRect().height ||
0;

if(
paneHeight <
2
){
return;
}

chart.applyOptions(
{
width,
height:
paneHeight
}
);

pulseAoAutoscale();

}

return {
id:
AO_PANE_ID,
label:
"AO",
legendLabel:
"AO",
exemptFromLimit:
false,
defaultEnabled:
false,
enable,
disable,
isEnabled:()=>
enabled,
getChart:()=>
enabled
? chart
: null,
getAoSeries:()=>
enabled
? series
: null,
getAoDrawCandles:()=>
lastAoDrawCandles,
getLegendLabel:()=>
lastAoValue !=
null
? `AO ${formatAoLegendValue(lastAoValue)}`
: "AO",
onSymbolChange,
onCandlesUpdate,
syncViewport,
onLayoutChange,
onResize,
destroy:()=>{
disable();
destroyChart();
}
};

}
