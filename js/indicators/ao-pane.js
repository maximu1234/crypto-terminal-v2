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
} from "../chart-import.js?v=43";

import {
calculateAwesomeOscillator,
aoBarColor,
formatAoLegendValue
} from "./ao-math.js?v=1";

import {
isChartLayoutReady
} from "../chart-layout-gate.js?v=2";

import {
isBottomIndicatorPane
} from "./indicator-pane-order.js?v=1";

import {
syncPaneViewportAfterData
} from "./indicator-pane-viewport.js?v=3";

export const AO_PANE_ID =
"ao";

function buildAoDisplayPoints(
candles,
tf
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
getHost?.()?.getVisibleBarsCap?.();
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
!isChartLayoutReady()
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
priceFormat:{
type:
"price",
precision:
4,
minMove:
0.0001
}
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

function refreshData(){

if(
!enabled ||
!series
){
return;
}

ensurePaneChartSized();

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
tf
);

let prev =
null;
lastAoValue =
null;

const data =
points.map(
bar=>{

if(
bar.value ==
null ||
!Number.isFinite(
bar.value
)
){
return {
time:
bar.time,
value:
0,
color:
"rgba(120,123,134,0.2)"
};
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

return {
time:
bar.time,
value:
bar.value,
color
};

}
);

series.setData(
data
);
syncAoAfterData();
updateHud();

}

function enable(){

if(
enabled
){
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

}

function disable(){

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
updateHud();
applyVisibility();

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

ctx.applyCoinsChartViewport?.(
ctx.mainChart,
chart,
ctx.candles,
ctx.tf,
ctx.chartWidth,
ctx.realCandleCount,
ctx.visibleBarsCap
);
updateTimeScaleVisibility();

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
