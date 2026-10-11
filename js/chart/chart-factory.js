import {
CHART_SCALE_TEXT_COLOR,
CHART_SCALE_FONT_FAMILY,
CHART_TIME_SCALE_HEIGHT,
effectiveChartPriceScaleWidth,
effectiveChartScaleFontSize,
mainChartCrosshairOptions,
fullCrosshairOptions,
hiddenCrosshairOptions,
formatPrice,
formatChartPrice,
isTabletChartViewport,
bindFinePointerMedia,
syncTabletFinePointerClass,
getChartLayoutBgColor
} from "./chart-options.js?v=f4be0094";

import {
lwPriceScaleModeId
} from "./price-scale-mode.js?v=7deaefee";

import {
liveBarPeriodSec
} from "./live-bar-roll.js?v=6ff2b718";

import {
withChartLocalTime
} from "./chart-local-time.js?v=027bb0cc";

import {
attachChartWheelDeadband
} from "./chart-wheel-deadband.js?v=0988dd58";

import {
ensureDomChartCrosshair,
resolveCrosshairPlotTime,
updateCrosshairAxisLabels,
clearCrosshairAxisLabels,
hideTabletProbeCrosshair,
hideDomChartCrosshair,
hideDomChartCrosshairHorz,
hideDomChartCrosshairVert,
positionDomChartCrosshairHorz,
positionTabletProbeHorizInStack,
hideTabletProbeHorizInStack
} from "./chart-dom-crosshair.js?v=da851dcb";

const chartHostElements =
new WeakMap();

function rememberChartHost(
chart,
container
){

if(
chart &&
container
){
chartHostElements.set(
chart,
container
);
}

}

function hostElementForChart(
chart
){

return chartHostElements.get(
chart
) ||
null;

}

export function mountChartRangeFreeze(
chart
){

let frozen =
null;

let sub =
null;

let active =
false;

let rafId =
null;

function enforceFrozenRange(){

if(
!active ||
!frozen ||
!chart
){
return;
}

const range =
chart.timeScale().getVisibleLogicalRange();

if(
range &&
(
range.from !==
frozen.from ||
range.to !==
frozen.to
)
){

chart.timeScale().setVisibleLogicalRange(
frozen
);

}

rafId =
requestAnimationFrame(
enforceFrozenRange
);

}

function freeze(){

if(
!chart
){
return;
}

frozen =
chart.timeScale().getVisibleLogicalRange();

if(
!frozen
){
return;
}

active = true;

if(
rafId
){
cancelAnimationFrame(
rafId
);
}

rafId =
requestAnimationFrame(
enforceFrozenRange
);

sub =
chart.timeScale().subscribeVisibleLogicalRangeChange(
range=>{

if(
!active ||
!frozen ||
!range
){
return;
}

if(
range.from !==
frozen.from ||
range.to !==
frozen.to
){

chart.timeScale().setVisibleLogicalRange(
frozen
);

}

}
);

}

function unfreeze(){

active = false;
frozen = null;

if(
rafId
){
cancelAnimationFrame(
rafId
);

rafId = null;

}

if(
sub
){

chart.timeScale().unsubscribeVisibleLogicalRangeChange(
sub
);

sub = null;

}

}

return {
freeze,
unfreeze
};

}

export function createCandlestickChart(
container,
chartOpts
){

const chartBg =
getChartLayoutBgColor();

const chart =
LightweightCharts.createChart(
container,
withChartLocalTime(
{

layout:{
background:{ color:chartBg },
textColor:CHART_SCALE_TEXT_COLOR,
fontSize:effectiveChartScaleFontSize(),
fontFamily:CHART_SCALE_FONT_FAMILY
},

grid:{
vertLines:{ color:"#161b26" },
horzLines:{ color:"#161b26" }
},

rightPriceScale:{

borderColor:"#1f2937",

/* LW: Normal=0 Log=1. Дефолт log; Terminal может переключить на Regular. */

mode:
lwPriceScaleModeId(
chartOpts?.priceScaleMode
),

autoScale:true,
minimumWidth:effectiveChartPriceScaleWidth(),
scaleMargins:{
top:0.12,
bottom:0.12
}

},

timeScale:{
borderColor:"#1f2937",
visible:false,
rightOffset:12,
fixRightEdge:false
},

crosshair:mainChartCrosshairOptions(),

handleScroll:{
mouseWheel:true,
pressedMouseMove:true,
horzTouchDrag:true,
vertTouchDrag:false
},

handleScale:{
axisPressedMouseMove:{
time:true,
price:true
},
axisDoubleClickReset:{
time:true,
price:true
},
mouseWheel:true,
pinch:true
}

}
)
);

chart.applyOptions({
crosshair:mainChartCrosshairOptions()
});

const series =
chart.addCandlestickSeries({

upColor:"#459782",
downColor:"#ef4444",
borderVisible:false,
wickUpColor:"#459782",
wickDownColor:"#ef4444",

priceLineVisible:true,
lastValueVisible:false

});

attachChartWheelDeadband(
container
);

return {

chart,
series

};

}

export function createScreenerChart(container){

const chartBg =
getChartLayoutBgColor();

const width =
Math.max(container.clientWidth, 120);

const height =
Math.max(container.clientHeight, 80);

const chart =
LightweightCharts.createChart(
container,
withChartLocalTime(
{

width,
height,

layout:{
background:{ color:chartBg },
textColor:"#9ca3af"
},

grid:{
vertLines:{ color:"#161b26" },
horzLines:{ color:"#161b26" }
},

rightPriceScale:{
borderColor:"#1f2937",
mode:1,
autoScale:true,
scaleMargins:{
top:0.1,
bottom:0.1
}
},

timeScale:{
borderColor:"#1f2937",
timeVisible:true,
secondsVisible:false,
rightOffset:4,
fixRightEdge:false,
minBarSpacing:0.01,
lockVisibleTimeRangeOnResize:false
},

crosshair:{
mode:LightweightCharts.CrosshairMode?.Hidden ?? 2
},

handleScroll:{
mouseWheel:true,
pressedMouseMove:true,
horzTouchDrag:true,
vertTouchDrag:false
},

handleScale:{
axisPressedMouseMove:true,
mouseWheel:true,
pinch:true
}

}
)
);

const series =
chart.addCandlestickSeries({

upColor:"#459782",
downColor:"#ef4444",
borderVisible:false,
wickUpColor:"#459782",
wickDownColor:"#ef4444",
priceLineVisible:true,
lastValueVisible:true

});

attachChartWheelDeadband(
container
);

return {
chart,
series
};

}

export {
SCREENER_VISIBLE_BARS,
SCREENER_MAX_BARS,
SCREENER_LOAD_BARS,
applyDashboardZoom,
computeChartFutureMarginBars,
appendFutureWhitespaceBars,
coinsTfVisibleBars,
computeCoinsChartViewportPlan,
applyCoinsChartViewport,
refreshCoinsChartBarSpacing,
restoreScreenerViewport,
applyScreenerZoom,
tfPeriodSec,
rsiPlotTimeOffsetSec
} from "./chart-viewport.js?v=67560962";

import {
tfPeriodSec
} from "./chart-viewport.js?v=67560962";



export const RSI_FIXED_PRICE_RANGE =
Object.freeze({
min:0,
max:100
});

export function applyRsiFixedPriceScale(
chart,
series
){

if(
!chart ||
!series
){
return;
}

try{

series.applyOptions({
autoscaleInfoProvider:()=>(
{
priceRange:{
minValue:
RSI_FIXED_PRICE_RANGE.min,
maxValue:
RSI_FIXED_PRICE_RANGE.max
}
}
)
});

}catch{
/* ignore */
}

try{

chart.priceScale(
"right"
).applyOptions({
autoScale:
true,
scaleMargins:{
top:0,
bottom:0
}
});

}catch{
/* ignore */
}

}

export function createRSIChart(container){

const normalMode =
LightweightCharts.PriceScaleMode !== undefined
? LightweightCharts.PriceScaleMode.Normal
: 0;

const chart =
LightweightCharts.createChart(
container,
withChartLocalTime(
{

layout:{
/* Прозрачный: зона 30–70 рисуется DOM (#rsi-band) под канвой */
background:{ color:"transparent" },
textColor:CHART_SCALE_TEXT_COLOR,
fontSize:effectiveChartScaleFontSize(),
fontFamily:CHART_SCALE_FONT_FAMILY
},

grid:{
vertLines:{
color:"transparent",
visible:false
},
horzLines:{
visible:false
}
},

rightPriceScale:{
borderColor:"#2a2e39",
mode:
normalMode,
autoScale:true,
minimumWidth:effectiveChartPriceScaleWidth(),
ticksVisible:true,
scaleMargins:{
top:0,
bottom:0
}
},

timeScale:{
visible:true,
timeVisible:true,
ticksVisible:true,
borderColor:"#1f2937",
secondsVisible:false,
rightOffset:24,
fixRightEdge:false
},

crosshair:hiddenCrosshairOptions(),

handleScroll:{
mouseWheel:true,
pressedMouseMove:true,
horzTouchDrag:true,
vertTouchDrag:false
},

handleScale:{
mouseWheel:true,
pinch:true,
axisPressedMouseMove:{
time:true,
price:false
},
axisDoubleClickReset:{
time:true,
price:false
}
}

}
)
);

chart.applyOptions({
crosshair:hiddenCrosshairOptions()
});

const series =
chart.addLineSeries({

color:"#b2b5be",

lineWidth:1,

lastValueVisible:true,

priceLineVisible:false,

crosshairMarkerVisible:false,

autoscaleInfoProvider:()=>(
{

priceRange:{

minValue:0,

maxValue:100

}

}
),

priceFormat:{

type:"price",

precision:2,

minMove:0.01

}

});

applyRsiFixedPriceScale(
chart,
series
);

rememberChartHost(
chart,
container
);

attachChartWheelDeadband(
container
);

return {

chart,
series

};

}

export function createVolumeChart(
container
){

const chart =
LightweightCharts.createChart(
container,
withChartLocalTime(
{

layout:{
background:{ color:"transparent" },
textColor:CHART_SCALE_TEXT_COLOR,
fontSize:effectiveChartScaleFontSize(),
fontFamily:CHART_SCALE_FONT_FAMILY
},

grid:{
vertLines:{
color:"transparent",
visible:false
},
horzLines:{
visible:false
}
},

rightPriceScale:{
borderColor:"#2a2e39",
autoScale:true,
minimumWidth:effectiveChartPriceScaleWidth(),
scaleMargins:{
top:0.08,
bottom:0
}
},

timeScale:{
visible:false,
timeVisible:false,
ticksVisible:false,
borderColor:"#1f2937",
secondsVisible:false,
rightOffset:24,
fixRightEdge:false
},

crosshair:hiddenCrosshairOptions(),

handleScroll:{
mouseWheel:true,
pressedMouseMove:true,
horzTouchDrag:true,
vertTouchDrag:false
},

handleScale:{
mouseWheel:true,
pinch:true,
axisPressedMouseMove:{
time:true,
price:false
},
axisDoubleClickReset:{
time:true,
price:false
}
}

}
)
);

chart.applyOptions({
crosshair:hiddenCrosshairOptions()
});

const series =
chart.addHistogramSeries({

priceFormat:{
type:"volume"
},

priceScaleId:"right"

});

rememberChartHost(
chart,
container
);

attachChartWheelDeadband(
container
);

return {

chart,
series

};

}

export function applyChartScaleWidthCss(
mainChart
){

if(
!mainChart ||
typeof document ===
"undefined"
){
return;
}

const w =
mainChart.priceScale("right").width() ||
effectiveChartPriceScaleWidth();

const px =
`${w}px`;

const wrapEl =
document.getElementById(
"chart-wrap"
);

wrapEl?.style.setProperty(
"--chart-scale-width",
px
);

wrapEl?.style.setProperty(
"--chart-time-scale-height",
`${CHART_TIME_SCALE_HEIGHT}px`
);

document
.getElementById("rsi-wrap")
?.style
.setProperty("--chart-scale-width", px);

document
.getElementById("volume-wrap")
?.style
.setProperty("--chart-scale-width", px);

document
.getElementById("ao-wrap")
?.style
.setProperty("--chart-scale-width", px);

document
.getElementById("macd-wrap")
?.style
.setProperty("--chart-scale-width", px);

document
.getElementById("rsi-wrap")
?.style
.setProperty(
"--chart-time-scale-height",
`${CHART_TIME_SCALE_HEIGHT}px`
);

}

export function syncLinkedChartPriceScales(
mainChart,
linkedChart
){

if(
!mainChart ||
!linkedChart
){
return effectiveChartPriceScaleWidth();
}

return equalizeLinkedPanePriceScales(
mainChart,
[
linkedChart
]
);

}

/**
 * Equalize right price-scale width across main + all indicator panes at once.
 * Resets minimumWidth first so a wide AO label does not permanently ratchet
 * the gutter after the pane is disabled or a shorter-labeled pane remains.
 */
export function equalizeLinkedPanePriceScales(
mainChart,
linkedCharts =
[]
){

if(
!mainChart
){
return effectiveChartPriceScaleWidth();
}

const scale =
"right";
const base =
effectiveChartPriceScaleWidth();

const charts =
[
mainChart,
...(
Array.isArray(
linkedCharts
)
? linkedCharts
: []
)
].filter(
Boolean
);

for(
const chart of
charts
){

try{
chart.priceScale(
scale
).applyOptions({
minimumWidth:
base
});
}catch{
/* ignore */
}

}

let w =
base;

for(
const chart of
charts
){

try{
w =
Math.max(
w,
chart.priceScale(
scale
).width() ||
0
);
}catch{
/* ignore */
}

}

for(
const chart of
charts
){

try{
chart.priceScale(
scale
).applyOptions({
minimumWidth:
w
});
}catch{
/* ignore */
}

}

let w2 =
w;

for(
const chart of
charts
){

try{
w2 =
Math.max(
w2,
chart.priceScale(
scale
).width() ||
0
);
}catch{
/* ignore */
}

}

if(
w2 >
w
){

w =
w2;

for(
const chart of
charts
){

try{
chart.priceScale(
scale
).applyOptions({
minimumWidth:
w
});
}catch{
/* ignore */
}

}

}

applyChartScaleWidthCss(
mainChart
);

return w;

}

export function syncLinkedChartTimescales(
mainChart,
linkedChart
){

if(
!mainChart ||
!linkedChart
){
return;
}

const range =
mainChart.timeScale().getVisibleLogicalRange();

if(
!range
){
return;
}

/*
 * Time-scale copy only. Price-scale width must be equalized across
 * ALL panes in one pass (equalizeLinkedPanePriceScales) — pairwise
 * sync from AO then RSI then Volume fought over minimumWidth and
 * left short charts flush to the right scale.
 */
linkedChart.timeScale().applyOptions(
getTimeScaleSyncOptions(
mainChart.timeScale()
)
);

linkedChart.timeScale().setVisibleLogicalRange(
range
);

applyChartScaleWidthCss(
mainChart
);

}

export function linkPairedChartTimeScales(
mainChart,
linkedChart,
afterSync,
options = {}
){

if(
!mainChart ||
!linkedChart
){
return ()=>{};
}

const isLocked =
options.isLocked ??
(()=>false);

/** false — setData на панели не двигает main; жест (pan/wheel) всё равно синхронизирует. */
const linkedDrivesMain =
options.linkedDrivesMain !==
false;

const gestureRoot =
options.linkedEl ||
hostElementForChart(
linkedChart
);

let lock =
false;
let linkedPointerDown =
false;
let linkedGestureUntil =
0;

function markLinkedGesture(){

linkedGestureUntil =
(
typeof performance !==
"undefined"
? performance.now()
: Date.now()
) +
250;

}

function linkedGestureActive(){

if(
linkedPointerDown
){
return true;
}

const now =
typeof performance !==
"undefined"
? performance.now()
: Date.now();

return now <
linkedGestureUntil;

}

function fromMain(){

if(
lock ||
isLocked()
){
return;
}

lock = true;

syncLinkedChartTimescales(
mainChart,
linkedChart
);

afterSync?.();

lock = false;

}

function fromLinked(){

if(
lock ||
isLocked()
){
return;
}

if(
!linkedDrivesMain &&
!linkedGestureActive()
){
return;
}

const range =
linkedChart.timeScale().getVisibleLogicalRange();

if(
!range
){
return;
}

lock = true;

mainChart.timeScale().applyOptions(
getTimeScaleSyncOptions(
linkedChart.timeScale()
)
);

mainChart.timeScale().setVisibleLogicalRange(
range
);

afterSync?.();

lock = false;

}

const subMain =
mainChart.timeScale().subscribeVisibleLogicalRangeChange(
range=>{
if(range){
fromMain();
}
}
);

const subLinked =
linkedChart.timeScale().subscribeVisibleLogicalRangeChange(
range=>{
if(range){
fromLinked();
}
}
);

const gestureAbort =
typeof AbortController ===
"function"
? new AbortController()
: null;

if(
!linkedDrivesMain &&
gestureRoot &&
gestureAbort
){

const listenerOpts =
{
signal:
gestureAbort.signal,
passive:
true
};

gestureRoot.addEventListener(
"pointerdown",
e=>{

if(
e.button !==
0 &&
e.button !==
1
){
return;
}

if(
isTabletEventOnPriceScale(
gestureRoot,
e,
linkedChart
)
){
return;
}

linkedPointerDown = true;
markLinkedGesture();

},
listenerOpts
);

gestureRoot.addEventListener(
"wheel",
()=>{
markLinkedGesture();
},
listenerOpts
);

const win =
typeof window !==
"undefined"
? window
: null;

win?.addEventListener(
"pointerup",
()=>{
linkedPointerDown = false;
markLinkedGesture();
},
listenerOpts
);

win?.addEventListener(
"pointercancel",
()=>{
linkedPointerDown = false;
markLinkedGesture();
},
listenerOpts
);

}

return ()=>{

gestureAbort?.abort();

if(
subMain
){
mainChart.timeScale().unsubscribeVisibleLogicalRangeChange(
subMain
);
}

if(
subLinked
){
linkedChart.timeScale().unsubscribeVisibleLogicalRangeChange(
subLinked
);
}

};

}

/** iPad: свой pan по pointer (document), без horzTouchDrag LW — обход залипания Safari */
export const TABLET_USE_CUSTOM_TOUCH_PAN =
true;

/**
 * iPad: ценовая шкала как на десктопе (LW axisPressedMouseMove / axisDoubleClickReset).
 * Полоса strip — только визуально (кнопка «+» позже).
 */
export const TABLET_LW_NATIVE_PRICE_SCALE =
false;

export function applyTabletRsiChartOptions(
rsiChart
){

if(
!rsiChart ||
!isTabletChartViewport()
){
return;
}

rsiChart.applyOptions({
handleScroll:{
mouseWheel:false,
pressedMouseMove:true,
horzTouchDrag:true,
vertTouchDrag:false
},
handleScale:{
axisPressedMouseMove:{
time:true,
price:false
},
axisDoubleClickReset:{
time:true,
price:false
},
mouseWheel:false,
pinch:true
}
});

}

export function applyTabletMainChartScroll(
mainChart
){

if(
!mainChart ||
!isTabletChartViewport()
){
return;
}

const lwTouchScroll =
!TABLET_USE_CUSTOM_TOUCH_PAN;

mainChart.applyOptions({
handleScroll:{
mouseWheel:true,
pressedMouseMove:false,
horzTouchDrag:lwTouchScroll,
vertTouchDrag:false
},
handleScale:{
axisPressedMouseMove:{
time:true,
price:true
},
axisDoubleClickReset:{
time:true,
price:true
},
mouseWheel:true,
pinch:true
}
});

}


export function markTabletChartBody(){

const tablet =
isTabletChartViewport();

document.body.classList.toggle(
"tablet-chart",
tablet
);

document.body.classList.toggle(
"tablet-custom-pan",
tablet &&
TABLET_USE_CUSTOM_TOUCH_PAN
);

document.body.classList.toggle(
"tablet-lw-price-scale",
tablet &&
TABLET_LW_NATIVE_PRICE_SCALE
);

bindFinePointerMedia();
syncTabletFinePointerClass();

}

function readChartScaleStripWidthPx(
chartEl
){

const wrap =
chartEl?.closest?.(
"#chart-wrap"
);

if(
wrap
){

const raw =
getComputedStyle(
wrap
).getPropertyValue(
"--chart-scale-width"
);

const n =
parseFloat(
raw
);

if(
Number.isFinite(
n
) &&
n >
0
){
return n;
}

}

return effectiveChartPriceScaleWidth();

}

export function chartPlotMetrics(
chartEl,
chart
){

const chartR =
chartEl.getBoundingClientRect();

let scaleW =
readChartScaleStripWidthPx(
chartEl
);

try{
scaleW =
chart?.priceScale?.(
"right"
)?.width?.() ||
scaleW;
}catch{
/* ignore */
}

scaleW =
Math.max(
40,
Math.min(
Math.round(
scaleW
),
Math.round(
chartR.width * 0.35
)
)
);

const plotW =
Math.max(
0,
chartR.width - scaleW
);

return {
chartR,
scaleW,
plotW
};

}

/** Курсор над правой ценовой шкалой (не нижняя ось времени). */
export function isClientOnChartPriceScale(
chartEl,
chart,
clientX,
clientY
){

if(
!chartEl ||
clientX ==
null ||
clientY ==
null
){
return false;
}

const {
chartR,
scaleW
} =
chartPlotMetrics(
chartEl,
chart
);

const timeH =
readChartTimeScaleHeightPx(
chartEl
);

if(
clientY <
chartR.top ||
clientY >
chartR.bottom - timeH
){
return false;
}

return clientX >=
chartR.right - scaleW - 0.5 &&
clientX <=
chartR.right + 0.5;

}

export function isTabletEventOnPriceScale(
chartEl,
e,
chart = null
){

if(
!chartEl ||
!e
){
return false;
}

const x =
e.clientX ??
e.touches?.[
0
]?.clientX;

const y =
e.clientY ??
e.touches?.[
0
]?.clientY;

return isClientOnChartPriceScale(
chartEl,
chart,
x,
y
);

}

function readChartTimeScaleHeightPx(
chartEl
){

const wrap =
chartEl?.closest?.(
"#chart-wrap"
);

if(
wrap
){

const raw =
getComputedStyle(
wrap
).getPropertyValue(
"--chart-time-scale-height"
);

const n =
parseFloat(
raw
);

if(
Number.isFinite(
n
) &&
n >
0
){
return n;
}

}

return CHART_TIME_SCALE_HEIGHT;

}

export function clearTabletProbeCrosshairForChart(
chart
){

hideTabletProbeCrosshair({
linkedVertEl:document.getElementById(
"linked-crosshair-vert"
),
horizLineEl:document.getElementById(
"tablet-probe-crosshair-h"
),
timeLabelEl:document.getElementById(
"crosshair-time-label"
),
priceLabelEl:document.getElementById(
"crosshair-price-label"
)
});

try{
chart?.clearCrosshairPosition?.();
}catch{
/* ignore */
}

}

export function updateRsiBandLayout(
rsiSeries,
bandEl,
levels
){

if(
!rsiSeries ||
!bandEl
){
return;
}

const overbought =
Number(
levels?.overbought
);
const oversold =
Number(
levels?.oversold
);
const hi =
Number.isFinite(
overbought
)
? overbought
: 70;
const lo =
Number.isFinite(
oversold
)
? oversold
: 30;

const y70 =
rsiSeries.priceToCoordinate?.(
hi
);

const y30 =
rsiSeries.priceToCoordinate?.(
lo
);

if(
y70 === null ||
y70 === undefined ||
y30 === null ||
y30 === undefined ||
!Number.isFinite(y70) ||
!Number.isFinite(y30)
){
return;
}

const top =
Math.min(
y70,
y30
);

bandEl.style.top =
`${Math.round(top)}px`;

bandEl.style.height =
`${Math.round(Math.abs(y30 - y70))}px`;

}

function rsiLevelLinePlotMaxY(
wrapEl
){

const wrapH =
wrapEl?.clientHeight ||
0;

if(
wrapH <
2
){
return wrapH;
}

let timeScaleH =
28;

try{

const raw =
getComputedStyle(
wrapEl
).getPropertyValue(
"--chart-time-scale-height"
).trim();

if(
raw.endsWith(
"px"
)
){
timeScaleH =
parseFloat(
raw
) ||
timeScaleH;
}

}catch{
/* ignore */
}

return Math.max(
1,
wrapH -
timeScaleH -
1
);

}

function clampRsiLevelLineY(
y,
wrapEl
){

const plotMax =
rsiLevelLinePlotMaxY(
wrapEl
);

return Math.max(
0.5,
Math.min(
Math.round(
y
) +
0.5,
plotMax
)
);

}

export function updateRsiLevelLinesLayout(
rsiSeries,
wrapEl
){

if(
!rsiSeries ||
!wrapEl
){
return;
}

const lineEls =
wrapEl.querySelectorAll(
".rsi-level-line[data-rsi-level]"
);

lineEls.forEach(
lineEl=>{

const price =
Number(
lineEl.getAttribute(
"data-rsi-level"
)
);

if(
!Number.isFinite(
price
)
){
return;
}

const y =
rsiSeries.priceToCoordinate?.(
price
);

if(
y === null ||
y === undefined ||
!Number.isFinite(
y
)
){
lineEl.classList.add(
"hidden"
);
return;
}

lineEl.style.top =
`${clampRsiLevelLineY(
y,
wrapEl
)}px`;
lineEl.classList.remove(
"hidden"
);

}
);

}

export {
linkChartsCrosshair
} from "./chart-crosshair-link.js?v=21cde27d";



function getTimeScaleSyncOptions(
timeScale
){

const o =
timeScale.options();

const sync =
{};

for(
const key of [
"barSpacing",
"rightOffset",
"fixLeftEdge",
"fixRightEdge",
"leftOffset",
"minBarSpacing",
"maxBarSpacing"
]
){

if(
o[key] !== undefined
){
sync[key] = o[key];
}

}

return sync;

}

function candleCloseCountdownSec(
candleOpenSec,
periodSec
){

const period =
Math.max(1, periodSec);
const now =
Math.floor(Date.now() / 1000);

if(
candleOpenSec != null &&
Number.isFinite(candleOpenSec)
){
return Math.max(
0,
candleOpenSec + period - now
);
}

return Math.max(
0,
period - (now % period)
);

}

function formatCandleCountdown(sec){

const s =
Math.max(0, Math.floor(sec));

if(s >= 3600){

const h =
Math.floor(s / 3600);
const m =
Math.floor((s % 3600) / 60);
const r =
s % 60;

return `${h}:${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;

}

const m =
Math.floor(s / 60);
const r =
s % 60;

return `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;

}

export function mountChartPriceHud({
chart,
series,
wrapEl,
getTf,
getLastCandle
}){

if(
!chart ||
!series ||
!wrapEl
){
return ()=>{};
}

let hud =
wrapEl.querySelector(".chart-price-hud");

if(!hud){

hud =
document.createElement("div");
hud.className = "chart-price-hud";
hud.innerHTML = `
<span class="chart-price-hud-price"></span>
<span class="chart-price-hud-cd"></span>
`;
wrapEl.appendChild(hud);

}

const priceEl =
hud.querySelector(".chart-price-hud-price");
const cdEl =
hud.querySelector(".chart-price-hud-cd");

function update(){

try{

let last =
null;

if(
typeof getLastCandle ===
"function"
){
last =
getLastCandle();
}else{
const data =
series.data();
last =
data?.[
data.length -
1
];
}

if(
!last ||
last.close == null
){
hud.classList.add("hidden");
return;
}

const y =
series.priceToCoordinate(last.close);

if(
y == null ||
!Number.isFinite(y)
){
hud.classList.add("hidden");
return;
}

const gutter =
chart.priceScale("right").width() ||
effectiveChartPriceScaleWidth();
const up =
last.close >= last.open;

hud.classList.remove("hidden");
hud.classList.toggle(
"chart-price-hud--up",
up
);
hud.classList.toggle(
"chart-price-hud--down",
!up
);

priceEl.textContent =
formatChartPrice(
last.close,
last.close
);

const period =
tfPeriodSec(getTf?.() || "60");
const left =
candleCloseCountdownSec(
last.time,
period
);

cdEl.textContent =
formatCandleCountdown(left);

hud.style.right = "0";
hud.style.left = "auto";
hud.style.width = `${gutter}px`;
hud.style.top = `${y}px`;

}catch{
hud.classList.add("hidden");
}

}

let hudRaf =
0;

function scheduleUpdate(){

if(
hudRaf
){
return;
}

hudRaf =
requestAnimationFrame(()=>{
hudRaf = 0;
update();
});

}

update();

const timer =
window.setInterval(
update,
1000
);

const ro =
new ResizeObserver(
scheduleUpdate
);

ro.observe(
wrapEl
);

chart.timeScale().subscribeVisibleLogicalRangeChange(
scheduleUpdate
);

try{
chart.priceScale(
"right"
).subscribeVisibleLogicalRangeChange?.(
scheduleUpdate
);
}catch{
/* ignore */
}

return {

refresh:update,

stop(){

clearInterval(
timer
);

if(
hudRaf
){
cancelAnimationFrame(
hudRaf
);
}

ro.disconnect();
hud?.remove();

}

};

}