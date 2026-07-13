/**
 * Доп. график на Терминале — bootstrap виджета Скринера (свечи + RSI).
 */
import {
createScreenerChart,
createRSIChart,
applyChartPriceFormat,
applyScreenerZoom,
restoreScreenerViewport,
linkPairedChartTimeScales,
updateRsiBandLayout,
updateRsiLevelLinesLayout,
applyRsiFixedPriceScale,
CHART_TIME_SCALE_HEIGHT,
SCREENER_MAX_BARS,
SCREENER_VISIBLE_BARS,
applyCoinsChartViewport,
appendFutureWhitespaceBars,
computeChartFutureMarginBars,
coinsTfVisibleBars,
linkChartsCrosshair
} from "./chart-import.js?v=43";

import {
readCoinsPrefs
} from "./terminal/terminal-prefs.js?v=15";

import {
calculateRSI,
alignRsiWithCandleTimes
} from "./indicators.js?v=3";

import {
loadMarketHistory
} from "./market-api.js?v=1";

import {
subscribeKline
} from "./market-ws.js?v=1";

import {
mountWidgetDomCrosshair
} from "./chart-widget-host.js?v=15";

function mergeLiveCandle(
candles,
candle,
maxLen
){

if(
!candles.length
){
return false;
}

const last =
candles[
candles.length -
1
];

if(
candle.time ===
last.time
){

candles[
candles.length -
1
] =
candle;

return true;

}

if(
candle.time >
last.time
){

candles.push(
candle
);

if(
maxLen &&
candles.length >
maxLen
){
candles.shift();
}

return true;

}

return false;

}

function buildBodyHtml(
showRsi
){

if(
!showRsi
){
return `<div class="screener-chart"></div>`;
}

return `
<div class="screener-chart"></div>
<div class="screener-rsi-wrap">
<div class="screener-rsi-band"></div>
<div class="screener-rsi-hud" aria-hidden="true">
<span class="rsi-hud-title">RSI <span class="screener-rsi-hud-period">14</span></span><span class="rsi-hud-muted">close</span><span class="screener-rsi-hud-value">—</span>
</div>
<div class="rsi-level-line hidden" data-rsi-level="70" aria-hidden="true"></div>
<div class="rsi-level-line hidden" data-rsi-level="50" aria-hidden="true"></div>
<div class="rsi-level-line hidden" data-rsi-level="30" aria-hidden="true"></div>
<div class="screener-rsi-chart"></div>
</div>`;

}

export function createTerminalScreenerChartPane({
mountEl,
showRsi =
true,
historyRequests =
2,
viewportMode =
"screener",
linkedCrosshairVertEl =
null
}){

const target =
mountEl;

mountEl.classList.add(
"screener-widget-body"
);

if(
showRsi
){
mountEl.classList.add(
"has-rsi"
);
}

mountEl.innerHTML =
buildBodyHtml(
showRsi
);

const chartContainer =
mountEl.querySelector(
".screener-chart"
);

let chart =
null;
let series =
null;
let rsiChart =
null;
let rsiSeries =
null;
let rsiWrapEl =
null;
let rsiChartEl =
null;
let rsiHudValueEl =
null;
let unlinkTimeScales =
null;
let alive =
true;
let loadSeq =
0;
let unsubKline =
null;
let streamPaused =
false;
let candles =
[];
let userAdjustedZoom =
false;
let symbol =
"";
let tf =
"15";
let disposeCrosshair =
null;

function layoutRsi(){

if(
!rsiSeries ||
!rsiWrapEl
){
return;
}

updateRsiBandLayout(
rsiSeries,
rsiWrapEl.querySelector(
".screener-rsi-band"
)
);

updateRsiLevelLinesLayout(
rsiSeries,
rsiWrapEl
);

}

function setRsiHudValue(
value
){

if(
!rsiHudValueEl
){
return;
}

if(
value ===
null ||
value ===
undefined ||
!Number.isFinite(
value
)
){

rsiHudValueEl.textContent =
"—";
return;

}

rsiHudValueEl.textContent =
value.toFixed(
2
);

}

function resetRsiHudToLast(){

if(
!candles.length
){
setRsiHudValue(
null
);
return;
}

try{

const raw =
calculateRSI(
candles
);
const points =
alignRsiWithCandleTimes(
candles,
raw
);
const last =
points[
points.length -
1
];

setRsiHudValue(
last?.value ??
null
);

}catch{
setRsiHudValue(
null
);
}

}

function ensureCrosshair(){

if(
disposeCrosshair ||
!chart ||
!series ||
!chartContainer
){
return;
}

if(
showRsi &&
linkedCrosshairVertEl &&
rsiChart &&
rsiSeries
){

const link =
linkChartsCrosshair(
{
mainChart:
chart,
linkedChart:
rsiChart,
mainSeries:
series,
linkedSeries:
rsiSeries,
linkedVertOverlayEl:
linkedCrosshairVertEl,
chartWrapEl:
chartContainer,
chartEl:
chartContainer,
linkedWrapEl:
rsiWrapEl,
linkedChartEl:
rsiChartEl,
onLinkedCrosshairRsiValue:
setRsiHudValue,
onLinkedCrosshairClear:
resetRsiHudToLast
}
);

disposeCrosshair =
()=>{
link.detachPointerCrosshair?.();
link.clearLinked?.();
};

return;

}

disposeCrosshair =
mountWidgetDomCrosshair(
{
chart,
series,
wrapEl:
chartContainer,
chartContainer
}
);

}

function syncRsiPaneSize(){

if(
!alive ||
!rsiChart ||
!rsiWrapEl ||
!chart
){
return;
}

let scaleW =
56;

try{
scaleW =
chart.priceScale(
"right"
).width() ||
scaleW;
}catch{
/* ignore */
}

rsiWrapEl.style.setProperty(
"--chart-scale-width",
`${scaleW}px`
);

rsiWrapEl.style.setProperty(
"--chart-time-scale-height",
`${CHART_TIME_SCALE_HEIGHT}px`
);

const wrapRect =
rsiWrapEl.getBoundingClientRect();
const w =
Math.round(
wrapRect.width
) ||
chartContainer.clientWidth;
const h =
Math.round(
wrapRect.height
);

if(
w <
2 ||
h <
2
){
return;
}

rsiChart.applyOptions({
width:
w,
height:
h
});

applyRsiFixedPriceScale(
rsiChart,
rsiSeries
);

layoutRsi();

}

function scheduleRsiLayoutRetries(){

const run =
()=>{

if(
!alive
){
return;
}

syncRsiPaneSize();
layoutRsi();

};

run();
requestAnimationFrame(
run
);
requestAnimationFrame(
()=>{
requestAnimationFrame(
run
);
}
);

for(
const ms of [
50,
200,
500,
1200
]
){

setTimeout(
run,
ms
);

}

}

function bindRsiChartOptions(){

if(
!chart ||
!rsiChart
){
return;
}

chart.applyOptions({
timeScale:{
visible:
false,
borderVisible:
false,
timeVisible:
false,
ticksVisible:
false
}
});

rsiChart.applyOptions({
timeScale:{
visible:
true,
timeVisible:
true,
ticksVisible:
true,
borderColor:
"#1f2937",
borderVisible:
true,
secondsVisible:
false
},
rightPriceScale:{
borderVisible:
false
}
});

try{

rsiChart.priceScale(
"right"
).applyOptions({
invertScale:
readCoinsPrefs().invertRsiChart ===
true
});

}catch{
/* ignore */
}

unlinkTimeScales?.();
unlinkTimeScales =
linkPairedChartTimeScales(
chart,
rsiChart,
()=>{
if(
alive
){
layoutRsi();
}
}
);

}

function ensureRsiChart(){

if(
!showRsi ||
rsiChart ||
!rsiChartEl ||
!rsiWrapEl ||
!chart
){
return !!rsiChart;
}

const wrapRect =
rsiWrapEl.getBoundingClientRect();

if(
wrapRect.height <
2 ||
wrapRect.width <
2
){
return false;
}

const rsiPair =
createRSIChart(
rsiChartEl
);

rsiChart =
rsiPair.chart;
rsiSeries =
rsiPair.series;

bindRsiChartOptions();
syncRsiPaneSize();
ensureCrosshair();

return true;

}

function updateRsiData(){

if(
!alive ||
!rsiSeries ||
!candles.length
){
return;
}

try{

const raw =
calculateRSI(
candles
);

const points =
alignRsiWithCandleTimes(
candles,
raw
);

rsiSeries.setData(
buildRsiDisplayPoints(
points
)
);

const last =
points[
points.length -
1
];

setRsiHudValue(
last?.value ??
null
);

scheduleRsiLayoutRetries();

}catch{
/* chart disposed */
}

}

function getFutureMarginBars(){

if(
viewportMode !==
"coins" ||
!candles.length
){
return 0;
}

const visibleBars =
coinsTfVisibleBars(
tf,
candles.length
);

return computeChartFutureMarginBars(
visibleBars
);

}

function buildDisplayCandles(){

if(
viewportMode !==
"coins" ||
!candles.length
){
return candles;
}

const futureMargin =
getFutureMarginBars();

if(
futureMargin <
1
){
return candles;
}

return appendFutureWhitespaceBars(
candles,
futureMargin,
tf
);

}

function buildRsiDisplayPoints(
points
){

if(
viewportMode !==
"coins" ||
!points?.length
){
return points;
}

const futureMargin =
getFutureMarginBars();

if(
futureMargin <
1
){
return points;
}

return appendFutureWhitespaceBars(
points,
futureMargin,
tf
);

}

function ensureChart(){

if(
chart
){
ensureRsiChart();
return true;
}

const w =
chartContainer.clientWidth;
const h =
chartContainer.clientHeight;

if(
w <
2 ||
h <
2
){
return false;
}

const pair =
createScreenerChart(
chartContainer
);

chart =
pair.chart;
series =
pair.series;

ensureRsiChart();

if(
!showRsi
){
ensureCrosshair();
}

const markUserZoom =
()=>{
userAdjustedZoom =
true;
};

chartContainer.addEventListener(
"wheel",
markUserZoom,
{
passive:
true
}
);
chartContainer.addEventListener(
"mousedown",
markUserZoom
);
chartContainer.addEventListener(
"touchstart",
markUserZoom,
{
passive:
true
}
);

return true;

}

async function waitForChartReady(){

for(
let i =
0;
i <
12;
i++
){

if(
ensureChart()
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

return ensureChart();

}

function applyViewportZoom(){

if(
!chart ||
!candles.length
){
return 0;
}

const w =
chartContainer.clientWidth;
const h =
chartContainer.clientHeight;

if(
w <
2 ||
h <
2
){
return 0;
}

if(
viewportMode ===
"coins"
){

return applyCoinsChartViewport(
chart,
rsiChart,
buildDisplayCandles(),
tf,
w,
candles.length
);

}

return applyScreenerZoom(
chart,
series,
candles,
w,
h,
{
shouldContinue:()=>
alive
}
);

}

function syncChartSize(){

if(
!alive ||
!chart ||
!series
){
return 0;
}

try{

const w =
chartContainer.clientWidth;
const h =
chartContainer.clientHeight;

if(
w <
2 ||
h <
2
){
return 0;
}

chart.applyOptions({
width:
w,
height:
h
});

ensureRsiChart();
syncRsiPaneSize();

if(
!candles.length
){
return 0;
}

if(
userAdjustedZoom
){

const range =
chart.timeScale().getVisibleLogicalRange();

if(
!range
){
return 0;
}

return Math.max(
0,
Math.round(
range.to -
range.from
)
);

}

return applyViewportZoom();

}catch{
return 0;
}

}

const resizeObserver =
new ResizeObserver(
()=>{
syncChartSize();
}
);

resizeObserver.observe(
target
);

rsiWrapEl =
mountEl.querySelector(
".screener-rsi-wrap"
);
rsiChartEl =
mountEl.querySelector(
".screener-rsi-chart"
);
rsiHudValueEl =
mountEl.querySelector(
".screener-rsi-hud-value"
);

let rsiResizeObserver =
null;

if(
rsiWrapEl
){

rsiResizeObserver =
new ResizeObserver(
()=>{
if(
alive
){
ensureRsiChart();
syncRsiPaneSize();
}
}
);

rsiResizeObserver.observe(
rsiWrapEl
);

}

function detachKline(){

unsubKline?.();
unsubKline =
null;

}

function attachKline(){

detachKline();

if(
streamPaused ||
!symbol ||
!candles.length ||
!series
){
return;
}

unsubKline =
subscribeKline(
symbol,
tf,
candle=>{

if(
!alive ||
streamPaused
){
return;
}

try{

const prevLast =
candles[
candles.length -
1
];

const isNewBar =
prevLast &&
candle.time >
prevLast.time;

if(
!mergeLiveCandle(
candles,
candle,
SCREENER_MAX_BARS
)
){
return;
}

if(
isNewBar &&
candles.length >
SCREENER_MAX_BARS &&
!userAdjustedZoom
){

candles =
candles.slice(
-SCREENER_MAX_BARS
);

series.setData(
buildDisplayCandles()
);
updateRsiData();

}else{

if(
viewportMode ===
"coins"
){
series.update(
candle
);
}else{
series.update(
candle
);
}

if(
isNewBar &&
rsiSeries
){
updateRsiData();
}

}

applyChartPriceFormat(
series,
candle.close
);

if(
!userAdjustedZoom &&
isNewBar
){

if(
viewportMode ===
"coins"
){
applyViewportZoom();
}else{

const total =
candles.length;
const visible =
Math.min(
SCREENER_VISIBLE_BARS,
total
);

restoreScreenerViewport(
chart,
chartContainer.clientWidth,
visible,
total
);

}

}

}catch{
/* chart disposed */
}

}
);

}

function scheduleZoomRetries(
seq
){

const runZoom =
()=>{

if(
!alive ||
seq !==
loadSeq
){
return;
}

syncChartSize();
layoutRsi();

};

runZoom();
scheduleRsiLayoutRetries();

}

async function load(
nextSymbol,
nextTf
){

symbol =
String(
nextSymbol ||
""
).trim();
tf =
String(
nextTf ||
"15"
);

loadSeq++;
const seq =
loadSeq;

userAdjustedZoom =
false;
detachKline();

if(
!symbol
){
return;
}

if(
!await waitForChartReady()
){
console.warn(
"Terminal screener chart pane: no layout size"
);
return;
}

try{

const raw =
await loadMarketHistory(
symbol,
tf,
historyRequests,
{
parallel:
true,
batchGapMs:
viewportMode ===
"coins"
? 0
: undefined
}
);

if(
!alive ||
seq !==
loadSeq
){
return;
}

const loaded =
Array.isArray(
raw
)
? raw
: [];

candles =
loaded.length >
SCREENER_MAX_BARS
? loaded.slice(
-SCREENER_MAX_BARS
)
: loaded;

if(
!candles.length
){
return;
}

series.setData(
buildDisplayCandles()
);
updateRsiData();

applyChartPriceFormat(
series,
candles[
candles.length -
1
].close
);

scheduleZoomRetries(
seq
);
attachKline();

}catch(
err
){

console.warn(
"Terminal screener chart pane:",
err
);

}

}

function setStreamPaused(
paused
){

const next =
!!paused;

if(
streamPaused ===
next
){
return;
}

streamPaused =
next;

if(
streamPaused
){
detachKline();
}else{
attachKline();
}

}

function destroy(){

alive =
false;
detachKline();
disposeCrosshair?.();
disposeCrosshair =
null;
resizeObserver.disconnect();
rsiResizeObserver?.disconnect?.();
rsiResizeObserver =
null;
unlinkTimeScales?.();
unlinkTimeScales =
null;

try{
chart?.remove?.();
}catch{
/* ignore */
}

try{
rsiChart?.remove?.();
}catch{
/* ignore */
}

chart =
null;
series =
null;
rsiChart =
null;
rsiSeries =
null;

}

return {
get chart(){
return chart;
},
get series(){
return series;
},
getCandles:()=>
candles.slice(),
getSymbol:()=>
symbol,
getTf:()=>
tf,
getChartEl:()=>
chartContainer,
load,
destroy,
syncChartSize,
setStreamPaused
};

}
