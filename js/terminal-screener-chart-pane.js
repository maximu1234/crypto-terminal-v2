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
SCREENER_VISIBLE_BARS
} from "./chart-import.js?v=43";

import {
readCoinsPrefs
} from "./terminal/terminal-prefs.js?v=9";

import {
calculateRSI,
alignRsiWithCandleTimes
} from "./indicators.js?v=3";

import {
loadBybitHistory
} from "./api.js?v=29";

import {
subscribeKline
} from "./ws.js?v=17";

import {
mountWidgetDomCrosshair
} from "./chart-widget-host.js?v=14";

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
true
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
points
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

if(
!disposeCrosshair
){
disposeCrosshair =
mountWidgetDomCrosshair({
chart,
series,
wrapEl: chartContainer,
chartContainer
});
}

ensureRsiChart();

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
candles
);
updateRsiData();

}else{

series.update(
candle
);

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
await loadBybitHistory(
symbol,
tf,
2,
{
parallel:
true
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
candles
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
chart,
series,
load,
destroy,
syncChartSize,
setStreamPaused
};

}
