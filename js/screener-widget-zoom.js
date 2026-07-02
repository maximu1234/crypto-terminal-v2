/**
 * Главная (/): ПКМ на виджет — увеличенный график ~80% экрана; повторный ПКМ — закрыть.
 */
import {
createScreenerChart,
createRSIChart,
applyChartPriceFormat,
applyScreenerZoom,
updateRsiBandLayout,
updateRsiLevelLinesLayout,
linkPairedChartTimeScales,
SCREENER_MAX_BARS
} from "./chart-import.js?v=43";

import {
loadMarketHistory
} from "./market-api.js?v=1";

import {
calculateRSI,
alignRsiWithCandleTimes
} from "./indicators.js?v=3";

import {
subscribeKline
} from "./market-ws.js?v=1";

const ZOOM_TF_LABELS =
{
"1":
"1m",
"5":
"5m",
"15":
"15m",
"60":
"1h",
"240":
"4h",
"D":
"1D",
"W":
"W"
};

const ZOOM_TF_VALUES =
[
"1",
"5",
"15",
"60",
"240",
"D",
"W"
];

let zoomState =
null;

let zoomMountOptions =
null;

function applyZoomInversion(
state,
inverted
){

const flag =
!!inverted;

for(
const chart of [
state?.chart,
state?.rsiChart
]
){

if(
!chart
){
continue;
}

try{
chart.priceScale(
"right"
).applyOptions({
invertScale:
flag
});
}catch{
/* ignore */
}

}

}

export function refreshZoomFavoriteUi(
symbol
){

if(
!zoomState ||
zoomState.symbol !==
symbol ||
!zoomMountOptions?.updateFlagUi
){
return;
}

zoomMountOptions.updateFlagUi(
zoomState.panel,
symbol
);

}

export function syncWidgetZoomInversion(
inverted
){

if(
!zoomState
){
return;
}

applyZoomInversion(
zoomState,
inverted
);

}

function closeWidgetZoom(){

if(
!zoomState
){
return;
}

try{
zoomState.unsubKline?.();
}catch{
/* ignore */
}

zoomState.resizeObserver?.disconnect?.();

try{
zoomState.rsiChart?.remove?.();
zoomState.chart?.remove?.();
}catch{
/* ignore */
}

zoomState.backdrop?.remove?.();
zoomState =
null;

}

function layoutZoomRsi(
state
){

if(
!state?.rsiSeries ||
!state?.rsiWrapEl
){
return;
}

updateRsiBandLayout(
state.rsiSeries,
state.rsiWrapEl.querySelector(
".screener-rsi-band"
)
);

updateRsiLevelLinesLayout(
state.rsiSeries,
state.rsiWrapEl
);

}

function updateZoomRsiData(
state
){

if(
!state?.rsiSeries ||
!state.candles?.length
){
return;
}

const raw =
calculateRSI(
state.candles
);

const points =
alignRsiWithCandleTimes(
state.candles,
raw
);

state.rsiSeries.setData(
points
);

layoutZoomRsi(
state
);

}

function buildTfButtonsHtml(
activeTf
){

return ZOOM_TF_VALUES.map(
tf=>
`<button type="button" class="screener-widget-zoom-tf-btn${tf === activeTf ? " active" : ""}" data-tf="${tf}">${ZOOM_TF_LABELS[tf] || tf}</button>`
).join(
""
);

}

function syncZoomTfUi(
panel,
tf
){

panel.querySelectorAll(
".screener-widget-zoom-tf-btn"
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

async function loadZoomCandles(
symbol,
tf
){

const loaded =
await loadMarketHistory(
symbol,
tf,
2,
{
parallel:
true
}
);

return loaded.length >
SCREENER_MAX_BARS
? loaded.slice(
-SCREENER_MAX_BARS
)
: loaded;

}

function syncZoomChartSize(
state
){

const chartEl =
state.chartEl;

if(
!chartEl ||
!state.chart ||
!state.series
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

state.chart.applyOptions(
{
width:
w,
height:
h
}
);

let scaleW =
56;

try{
scaleW =
state.chart.priceScale(
"right"
).width() ||
scaleW;
}catch{
/* ignore */
}

state.rsiWrapEl?.style.setProperty(
"--chart-scale-width",
`${scaleW}px`
);

if(
state.rsiChart &&
state.rsiChartEl
){

const rw =
state.rsiChartEl.clientWidth;
const rh =
state.rsiChartEl.clientHeight;

if(
rw >=
2 &&
rh >=
2
){
state.rsiChart.applyOptions(
{
width:
rw,
height:
rh
}
);
layoutZoomRsi(
state
);
}

}

if(
!state.candles.length
){
return;
}

applyScreenerZoom(
state.chart,
state.series,
state.candles,
w,
h
);

applyZoomInversion(
state,
zoomMountOptions?.getInvertCharts?.() === true
);

}

async function applyZoomTimeframe(
state,
tf
){

if(
!state ||
state.tf ===
tf
){
return;
}

state.tf =
tf;
syncZoomTfUi(
state.panel,
tf
);

state.chartEl.classList.add(
"loading"
);

try{
const candles =
await loadZoomCandles(
state.symbol,
tf
);

state.candles =
candles;

if(
candles.length
){
state.series.setData(
candles
);
applyChartPriceFormat(
state.series,
candles[
candles.length -
1
].close
);
updateZoomRsiData(
state
);
syncZoomChartSize(
state
);
}

state.unsubKline?.();
state.unsubKline =
subscribeKline(
state.symbol,
tf,
candle=>{

if(
!state.candles.length
){
return;
}

const prevLast =
state.candles[
state.candles.length -
1
];

if(
prevLast &&
candle.time <
prevLast.time
){
return;
}

if(
prevLast &&
candle.time ===
prevLast.time
){
state.candles[
state.candles.length -
1
] =
candle;
state.series.update(
candle
);
}else{
state.candles.push(
candle
);

if(
state.candles.length >
SCREENER_MAX_BARS
){
state.candles =
state.candles.slice(
-SCREENER_MAX_BARS
);
state.series.setData(
state.candles
);
updateZoomRsiData(
state
);
}else{
state.series.update(
candle
);
updateZoomRsiData(
state
);
}
}

applyChartPriceFormat(
state.series,
state.candles[
state.candles.length -
1
]?.close
);

}
);

}catch{
/* ignore */
}finally{
state.chartEl.classList.remove(
"loading"
);
}

}

async function openWidgetZoom(
widget,
getCurrentTF
){

closeWidgetZoom();

const symbol =
widget?.symbol;

if(
!symbol
){
return;
}

const tf =
getCurrentTF?.() ||
"15";

const backdrop =
document.createElement(
"div"
);
backdrop.className =
"screener-widget-zoom-backdrop";

const panel =
document.createElement(
"div"
);
panel.className =
"screener-widget-zoom-panel";
panel.innerHTML =
`
<div class="screener-widget-zoom-header">
<div class="screener-header-left screener-widget-zoom-title">
${zoomMountOptions?.flagWrapHtml || ""}
<div class="screener-symbol">${symbol}</div>
</div>
<div class="screener-widget-zoom-tf" role="group" aria-label="Таймфрейм">${buildTfButtonsHtml(tf)}</div>
<div class="screener-header-right screener-widget-zoom-header-right">
<span class="screener-widget-zoom-hint">ПКМ — закрыть</span>
<button type="button" class="screener-open screener-widget-zoom-open" title="Открыть в Монетах">↗</button>
</div>
</div>
<div class="screener-widget-zoom-body screener-widget-body">
<div class="screener-chart screener-widget-zoom-main-chart"></div>
<div class="screener-rsi-wrap">
<div class="screener-rsi-band"></div>
<div class="rsi-level-line hidden" data-rsi-level="70" aria-hidden="true"></div>
<div class="rsi-level-line hidden" data-rsi-level="50" aria-hidden="true"></div>
<div class="rsi-level-line hidden" data-rsi-level="30" aria-hidden="true"></div>
<div class="screener-rsi-chart"></div>
</div>
</div>
`;

backdrop.appendChild(
panel
);
document.body.appendChild(
backdrop
);

const chartEl =
panel.querySelector(
".screener-widget-zoom-main-chart"
);
const rsiWrapEl =
panel.querySelector(
".screener-rsi-wrap"
);
const rsiChartEl =
panel.querySelector(
".screener-rsi-chart"
);

const {
chart,
series
} =
createScreenerChart(
chartEl
);

const rsiPair =
createRSIChart(
rsiChartEl
);

chart.applyOptions(
{
timeScale:{
visible:
false,
borderVisible:
false
},
rightPriceScale:{
visible:
true,
borderVisible:
true
}
}
);

rsiPair.chart.applyOptions(
{
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
}
);

linkPairedChartTimeScales(
chart,
rsiPair.chart,
()=>
layoutZoomRsi(
state
)
);

const state =
{
widget,
backdrop,
panel,
symbol,
tf,
chart,
series,
chartEl,
rsiChart:
rsiPair.chart,
rsiSeries:
rsiPair.series,
rsiWrapEl,
rsiChartEl,
candles:
[],
unsubKline:
null,
resizeObserver:
null
};

zoomState =
state;

applyZoomInversion(
state,
zoomMountOptions?.getInvertCharts?.() === true
);

const titleLeft =
panel.querySelector(
".screener-widget-zoom-title"
);

zoomMountOptions?.wireFlagUi?.(
titleLeft,
symbol
);

panel.querySelector(
".screener-widget-zoom-open"
)?.addEventListener(
"click",
event=>{
event.stopPropagation();
window.location.href =
`terminal.html?symbol=${encodeURIComponent(symbol)}&tf=${encodeURIComponent(state.tf)}`;
}
);

panel.querySelectorAll(
".screener-widget-zoom-tf-btn"
).forEach(
btn=>{
btn.addEventListener(
"click",
event=>{
event.stopPropagation();
const nextTf =
btn.dataset.tf;

if(
!nextTf ||
nextTf ===
state.tf
){
return;
}

void applyZoomTimeframe(
state,
nextTf
);
}
);
}
);

const resizeTarget =
panel.querySelector(
".screener-widget-zoom-body"
);

const resizeObserver =
new ResizeObserver(
()=>{
syncZoomChartSize(
state
);
}
);

resizeObserver.observe(
resizeTarget
);
state.resizeObserver =
resizeObserver;

const runSize =
()=>{
syncZoomChartSize(
state
);
};

runSize();
requestAnimationFrame(
runSize
);
setTimeout(
runSize,
50
);
setTimeout(
runSize,
200
);

let candles =
Array.isArray(
widget.candles
) &&
widget.candles.length &&
state.tf ===
tf
? widget.candles.slice()
: [];

if(
!candles.length
){

try{
candles =
await loadZoomCandles(
symbol,
tf
);
}catch{
/* ignore */
}

}

state.candles =
candles;

if(
candles.length
){
series.setData(
candles
);
applyChartPriceFormat(
series,
candles[
candles.length -
1
].close
);
updateZoomRsiData(
state
);
runSize();
}

state.unsubKline =
subscribeKline(
symbol,
tf,
candle=>{

if(
!state.candles.length
){
return;
}

const prevLast =
state.candles[
state.candles.length -
1
];

if(
prevLast &&
candle.time <
prevLast.time
){
return;
}

if(
prevLast &&
candle.time ===
prevLast.time
){
state.candles[
state.candles.length -
1
] =
candle;
series.update(
candle
);
}else{
state.candles.push(
candle
);

if(
state.candles.length >
SCREENER_MAX_BARS
){
state.candles =
state.candles.slice(
-SCREENER_MAX_BARS
);
series.setData(
state.candles
);
updateZoomRsiData(
state
);
}else{
series.update(
candle
);
updateZoomRsiData(
state
);
}
}

applyChartPriceFormat(
series,
state.candles[
state.candles.length -
1
]?.close
);

}
);

backdrop.addEventListener(
"contextmenu",
event=>{
event.preventDefault();
event.stopPropagation();
closeWidgetZoom();
},
true
);

}

export function mountScreenerWidgetZoom(
{
resolveWidget,
getCurrentTF,
getInvertCharts = ()=>false,
isEnabled = ()=>true,
wireFlagUi,
updateFlagUi,
flagWrapHtml = ""
}
){

zoomMountOptions =
{
wireFlagUi,
updateFlagUi,
flagWrapHtml,
getInvertCharts
};

function onContextMenu(
event
){

if(
!isEnabled()
){
return;
}

const widgetRoot =
event.target?.closest?.(
".screener-widget"
);

if(
!widgetRoot
){
return;
}

const grid =
document.getElementById(
"screener-grid"
);

if(
!grid?.contains(
widgetRoot
)
){
return;
}

event.preventDefault();
event.stopPropagation();

const widget =
resolveWidget?.(
widgetRoot
);

if(
!widget
){
return;
}

if(
zoomState &&
zoomState.widget ===
widget
){
closeWidgetZoom();
return;
}

void openWidgetZoom(
widget,
getCurrentTF
);

}

document.addEventListener(
"contextmenu",
onContextMenu,
true
);

return ()=>{
document.removeEventListener(
"contextmenu",
onContextMenu,
true
);
closeWidgetZoom();
};

}
