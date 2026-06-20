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
} from "./chart-options.js?v=7";

import {
ensureDomChartCrosshair,
updateCrosshairAxisLabels,
clearCrosshairAxisLabels,
hideTabletProbeCrosshair,
hideDomChartCrosshair,
hideDomChartCrosshairHorz,
hideDomChartCrosshairVert,
positionDomChartCrosshairHorz
} from "./chart-dom-crosshair.js?v=14";

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

export function createCandlestickChart(container){

const chartBg =
getChartLayoutBgColor();

const chart =
LightweightCharts.createChart(
container,
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

/* LW: Normal=0 Log=1… Дефолт log — см. расчёт фибоначчи в drawings.js */

mode:1,

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

});

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

});

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

return {
chart,
series
};

}

/** Свечей в видимой области (плотный обзор). */
export const SCREENER_VISIBLE_BARS = 1500;

/** Максимум в серии: 2 запроса × 1000 к Bybit. */
export const SCREENER_MAX_BARS = 2000;

export const SCREENER_LOAD_BARS = SCREENER_MAX_BARS;

export function applyDashboardZoom(chart, candles, tf){

if(!candles.length){
return;
}

let visibleBars = 900;

if(tf === "1"){
visibleBars = 300;
}

if(tf === "5"){
visibleBars = 500;
}

if(tf === "15"){
visibleBars = 900;
}

if(tf === "60"){
visibleBars = 700;
}

if(tf === "240"){
visibleBars = 500;
}

if(tf === "D"){
visibleBars = 300;
}

visibleBars =
Math.min(visibleBars, candles.length);

chart.timeScale().setVisibleLogicalRange({

from: candles.length - visibleBars,

to: candles.length + 25

});

}

/**
 * Пустое место справа на шкале времени (подписи «в будущее»).
 * ~15% видимого окна, как у TradingView (без жёсткого потолка в 80 баров).
 */
export function computeChartFutureMarginBars(
visibleBars
){

const visible =
Math.max(
1,
Math.floor(
Number(
visibleBars
) ||
1
)
);

return Math.max(
12,
Math.round(
visible *
0.15
)
);

}

/** Пустые точки справа — LW рисует подписи шкалы времени «в будущее». */
export function appendFutureWhitespaceBars(
candles,
barCount,
tf
){

if(
!Array.isArray(
candles
) ||
!candles.length ||
barCount <
1
){
return candles;
}

const period =
tfPeriodSec(
tf
);

const lastTime =
candles[
candles.length -
1
].time;

const out =
candles.slice();

for(
let i =
1;
i <=
barCount;
i++
){

out.push({
time:
lastTime +
period *
i
});

}

return out;

}

export function coinsTfVisibleBars(
tf,
candleCount
){

let visibleBars =
Math.max(
1,
Number(
candleCount
) ||
1
);

if(
tf ===
"1"
){
visibleBars =
Math.min(
visibleBars,
1500
);
}

if(
tf ===
"5"
){
visibleBars =
Math.min(
visibleBars,
2000
);
}

if(
tf ===
"15"
){
visibleBars =
Math.min(
visibleBars,
2500
);
}

if(
tf ===
"60"
){
visibleBars =
Math.min(
visibleBars,
3000
);
}

if(
tf ===
"240"
){
visibleBars =
Math.min(
visibleBars,
2000
);
}

if(
tf ===
"D"
){
visibleBars =
Math.min(
visibleBars,
1000
);
}

return visibleBars;

}

/**
 * Монеты: шкала времени с «хвостом» в будущее (как TradingView).
 * Явный barSpacing + rightOffset — иначе LW жмёт последнюю свечу к правому краю.
 */
export function applyCoinsChartViewport(
mainChart,
linkedChart,
candles,
tf,
chartWidthPx,
realCandleCount
){

if(
!mainChart ||
!Array.isArray(
candles
) ||
!candles.length
){
return 0;
}

const totalBars =
candles.length;

const realTotal =
Math.max(
1,
Math.min(
realCandleCount ??
totalBars,
totalBars
)
);

const futureMargin =
Math.max(
0,
totalBars -
realTotal
);

const visibleBars =
Math.min(
coinsTfVisibleBars(
tf,
realTotal
),
realTotal
);

const lastRealIndex =
realTotal -
1;

const lastIndex =
totalBars -
1;

const from =
Math.max(
0,
lastRealIndex -
visibleBars +
1
);

const width =
Math.max(
chartWidthPx ||
0,
120
);

const plotWidth =
linkedChart?.timeScale().width() ||
mainChart.timeScale().width() ||
Math.max(
width -
effectiveChartPriceScaleWidth(),
40
);

const logicalSpan =
Math.max(
lastIndex -
from +
1,
visibleBars +
futureMargin,
1
);

const barSpacing =
Math.max(
0.01,
plotWidth /
logicalSpan
);

const range = {
from,
to:
lastIndex
};

const timeOpts = {
barSpacing,
rightOffset:
4,
fixRightEdge:
false,
fixLeftEdge:
false,
shiftVisibleRangeOnNewBar:
false,
lockVisibleTimeRangeOnResize:
false
};

mainChart.timeScale().applyOptions(
timeOpts
);

mainChart.timeScale().setVisibleLogicalRange(
range
);

if(
linkedChart
){

linkedChart.timeScale().applyOptions({
...timeOpts,
visible:
true,
timeVisible:
true,
ticksVisible:
true,
secondsVisible:
false
});

linkedChart.timeScale().setVisibleLogicalRange(
range
);

}

return futureMargin;

}

/** После resize — сохранить диапазон, пересчитать barSpacing (будущее не схлопывается). */
export function refreshCoinsChartBarSpacing(
mainChart,
linkedChart
){

if(
!mainChart
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

const plotWidth =
linkedChart?.timeScale().width() ||
mainChart.timeScale().width();

if(
!plotWidth ||
plotWidth <
2
){
return;
}

const span =
Math.max(
range.to -
range.from +
1,
1
);

const barSpacing =
Math.max(
0.01,
plotWidth /
span
);

mainChart.timeScale().applyOptions({
barSpacing
});

if(
linkedChart
){

linkedChart.timeScale().applyOptions({
barSpacing
});

const linkedRange =
mainChart.timeScale().getVisibleLogicalRange();

if(
linkedRange
){
linkedChart.timeScale().setVisibleLogicalRange(
linkedRange
);
}

}

}

function applyScreenerViewport(
chart,
chartWidth,
visibleBars,
totalBars
){

if(!chart || visibleBars < 1){
return;
}

const total =
Math.max(visibleBars, totalBars || visibleBars);

const lastIndex =
total - 1;

const from =
Math.max(0, total - visibleBars);

const rightMargin =
computeChartFutureMarginBars(
visibleBars
);

const width =
Math.max(chartWidth || 0, 120);

const plotWidth =
chart.timeScale().width() || Math.max(width - 52, 40);

const logicalSpan =
visibleBars + rightMargin;

const barSpacing =
Math.max(
0.01,
plotWidth / Math.max(logicalSpan, 1)
);

chart.timeScale().applyOptions({
barSpacing,
rightOffset:rightMargin
});

chart.timeScale().setVisibleLogicalRange({

from,

to:lastIndex + rightMargin

});

}

export function restoreScreenerViewport(
chart,
chartWidth,
visibleBars,
totalBars
){

applyScreenerViewport(
chart,
chartWidth,
visibleBars,
totalBars
);

}

export function applyScreenerZoom(chart, series, candles, chartWidth, chartHeight){

if(!chart || !series || !candles?.length){
return 0;
}

const width =
Math.max(chartWidth || 0, 120);

const height =
Math.max(chartHeight || 0, 80);

const totalBars =
candles.length;

const visibleBars =
Math.min(SCREENER_VISIBLE_BARS, totalBars);

chart.applyOptions({ width, height });

series.setData(candles);

chart.timeScale().applyOptions({
rightOffset:4,
fixRightEdge:false,
lockVisibleTimeRangeOnResize:false,
minBarSpacing:0.01
});

const fitViewport = ()=>{
applyScreenerViewport(
chart,
width,
visibleBars,
totalBars
);
};

fitViewport();

requestAnimationFrame(fitViewport);

setTimeout(fitViewport, 100);

setTimeout(fitViewport, 300);

const range =
chart.timeScale().getVisibleLogicalRange();

if(!range){
return visibleBars;
}

return Math.max(
0,
Math.round(range.to - range.from)
);

}

export function createRSIChart(container){

const normalMode =
LightweightCharts.PriceScaleMode !== undefined
? LightweightCharts.PriceScaleMode.Normal
: 0;

const chart =
LightweightCharts.createChart(
container,
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
mouseWheel:false,
pressedMouseMove:false,
horzTouchDrag:false,
vertTouchDrag:false
},

handleScale:{
mouseWheel:false,
pinch:false,
axisPressedMouseMove:{
time:false,
price:false
},
axisDoubleClickReset:{
time:true,
price:false
}
}

});

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

return {

chart,
series

};

}

export function applyChartScaleWidthCss(
mainChart
){

if(!mainChart){
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

const scale =
"right";

function measuredWidth(){

return Math.max(
mainChart.priceScale(scale).width() || 0,
linkedChart.priceScale(scale).width() || 0,
effectiveChartPriceScaleWidth()
);

}

let w =
measuredWidth();

mainChart.priceScale(scale).applyOptions({
minimumWidth:w
});

linkedChart.priceScale(scale).applyOptions({
minimumWidth:w
});

const w2 =
measuredWidth();

if(
w2 > w
){

w = w2;

mainChart.priceScale(scale).applyOptions({
minimumWidth:w
});

linkedChart.priceScale(scale).applyOptions({
minimumWidth:w
});

}

applyChartScaleWidthCss(mainChart);

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

syncLinkedChartPriceScales(
mainChart,
linkedChart
);

const range =
mainChart.timeScale().getVisibleLogicalRange();

if(!range){
return;
}

linkedChart.timeScale().applyOptions(
getTimeScaleSyncOptions(
mainChart.timeScale()
)
);

linkedChart.timeScale().setVisibleLogicalRange(range);

const barSpacing =
mainChart.timeScale().options().barSpacing;

if(
barSpacing !== undefined
){

linkedChart.timeScale().applyOptions({
barSpacing
});

}

applyChartScaleWidthCss(mainChart);

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

let lock =
false;

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

syncLinkedChartPriceScales(
mainChart,
linkedChart
);

afterSync?.();

lock = false;

}

mainChart.timeScale().subscribeVisibleLogicalRangeChange(
range=>{
if(range){
fromMain();
}
}
);

linkedChart.timeScale().subscribeVisibleLogicalRangeChange(
range=>{
if(range){
fromLinked();
}
}
);

return ()=>{};

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

function chartPlotMetrics(
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
clientY >
chartR.bottom - timeH
){
return false;
}

return clientX >=
chartR.right - scaleW - 0.5;

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
bandEl
){

if(
!rsiSeries ||
!bandEl
){
return;
}

const rsiData =
rsiSeries.data?.() ??
[];

if(
!rsiData.length
){
bandEl.style.height =
"0";
return;
}

const y70 =
rsiSeries.priceToCoordinate?.(
70
);

const y30 =
rsiSeries.priceToCoordinate?.(
30
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

const rsiData =
rsiSeries.data?.() ??
[];

const lineEls =
wrapEl.querySelectorAll(
".rsi-level-line[data-rsi-level]"
);

if(
!rsiData.length
){

lineEls.forEach(
lineEl=>{
lineEl.classList.add(
"hidden"
);
}
);

return;

}

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

export function linkChartsCrosshair({
mainChart,
linkedChart,
mainSeries,
linkedSeries,
linkedVertOverlayEl,
chartWrapEl = null,
chartEl = null,
linkedWrapEl = null,
linkedChartEl = null,
crosshairTimeLabelEl,
crosshairPriceLabelEl = null,
onLinkedCrosshairTime,
onLinkedCrosshairRsiValue = null,
onLinkedCrosshairClear,
getLinkedValueAtTime,
getMainValueAtTime
}){

let lock =
false;

let lastPointerClientX =
null;

let lastPointerClientY =
null;

const chartsStackEl =
linkedVertOverlayEl?.parentElement ||
chartWrapEl?.parentElement ||
linkedWrapEl?.parentElement ||
null;

if(
chartWrapEl
){
ensureDomChartCrosshair(
chartWrapEl
);
}

if(
linkedWrapEl
){
ensureDomChartCrosshair(
linkedWrapEl
);
}

function trackPointerClient(
clientX,
clientY
){

if(
clientX ==
null ||
clientY ==
null
){
return;
}

lastPointerClientX =
clientX;
lastPointerClientY =
clientY;

}

function plotYFromLastPointer(){

if(
lastPointerClientX ==
null ||
lastPointerClientY ==
null
){
return null;
}

const plot =
plotCoordsFromClient(
lastPointerClientX,
lastPointerClientY
);

return Number.isFinite(
plot?.y
)
? plot.y
: null;

}

function crosshairClientFromParam(
param
){

const src =
param?.sourceEvent;

const cx =
src?.clientX ??
lastPointerClientX;

const cy =
src?.clientY ??
lastPointerClientY;

return {
cx,
cy
};

}

function isCrosshairPointerOnPriceScale(
param
){

const {
cx,
cy
} =
crosshairClientFromParam(
param
);

if(
cx ==
null ||
cy ==
null
){
return false;
}

return isClientOnChartPriceScale(
chartEl,
mainChart,
cx,
cy
) ||
(
linkedChartEl &&
linkedChart &&
isClientOnChartPriceScale(
linkedChartEl,
linkedChart,
cx,
cy
)
);

}

function clearLinkedVert(){

if(
document.body.classList.contains(
"chart-probe-active"
)
){
return;
}

if(
linkedVertOverlayEl
){

linkedVertOverlayEl.classList.add(
"hidden"
);

linkedVertOverlayEl.style.removeProperty(
"left"
);

}

if(
chartWrapEl
){
hideDomChartCrosshairVert(
chartWrapEl
);
}

}

function clearLinkedHorz(){

if(
chartWrapEl
){
hideDomChartCrosshairHorz(
chartWrapEl
);
hideDomChartCrosshair(
chartWrapEl
);
}

if(
linkedWrapEl
){
hideDomChartCrosshairHorz(
linkedWrapEl
);
}

}

function clearLinked(){

clearLinkedVert();
clearLinkedHorz();

clearCrosshairAxisLabels(
crosshairTimeLabelEl,
crosshairPriceLabelEl
);

onLinkedCrosshairClear?.();

try{
linkedChart.clearCrosshairPosition();
}catch{
/* ignore */
}

}

function crosshairVertX(
param
){

if(
param?.time != null &&
mainChart?.timeScale
){

const snapped =
mainChart.timeScale().timeToCoordinate(
param.time
);

if(
Number.isFinite(snapped)
){
return snapped;
}

}

return param.point?.x;

}

/** DOM-линии следуют за курсором; привязка к свече — только для подписи времени / RSI. */
function crosshairOverlayPlotX(
param
){

const px =
param?.point?.x;

if(
Number.isFinite(
px
)
){
return px;
}

return crosshairVertX(
param
);

}

function linkedVertStackLeft(
plotX,
anchorEl
){

if(
!linkedVertOverlayEl ||
!Number.isFinite(
plotX
)
){
return;
}

const anchor =
anchorEl ||
chartEl;

const stackEl =
linkedVertOverlayEl.parentElement;

if(
!anchor ||
!stackEl
){

linkedVertOverlayEl.style.left =
`${Math.round(plotX)}px`;

}else{

const anchorR =
anchor.getBoundingClientRect();

const stackR =
stackEl.getBoundingClientRect();

linkedVertOverlayEl.style.left =
`${Math.round(
anchorR.left - stackR.left + plotX
)}px`;

}

linkedVertOverlayEl.classList.remove(
"hidden"
);

}

function applyMainCrosshairPlot(
x,
y
){

let plotY =
y;

if(
!Number.isFinite(
plotY
)
){
plotY =
plotYFromLastPointer();
}

if(
chartWrapEl
){
hideDomChartCrosshairVert(
chartWrapEl
);
}

if(
linkedWrapEl
){
hideDomChartCrosshairHorz(
linkedWrapEl
);
}

linkedVertStackLeft(
x,
chartEl
);

if(
chartWrapEl &&
chartEl &&
Number.isFinite(
plotY
)
){

positionDomChartCrosshairHorz({
wrapEl:chartWrapEl,
chartEl,
chart:mainChart,
plotY
});

}

}

function applyRsiCrosshairPlot(
x,
y
){

if(
chartWrapEl
){
hideDomChartCrosshairVert(
chartWrapEl
);
hideDomChartCrosshairHorz(
chartWrapEl
);
}

linkedVertStackLeft(
x,
linkedChartEl ||
chartEl
);

if(
linkedWrapEl &&
linkedChartEl &&
linkedChart &&
Number.isFinite(
y
)
){

positionDomChartCrosshairHorz({
wrapEl:linkedWrapEl,
chartEl:linkedChartEl,
chart:linkedChart,
plotY:y
});

}

}

function applyLinkedCrosshairPlot(
x,
y
){

applyMainCrosshairPlot(
x,
y
);

}

function plotCoordsFromRsiClient(
clientX,
clientY
){

if(
!linkedChartEl ||
!linkedChart
){
return null;
}

if(
isClientOnChartPriceScale(
linkedChartEl,
linkedChart,
clientX,
clientY
)
){
return null;
}

const {
chartR,
plotW
} =
chartPlotMetrics(
linkedChartEl,
linkedChart
);

let x =
clientX - chartR.left;
let y =
clientY - chartR.top;

if(
x < 0 ||
x > plotW ||
y < 0 ||
y > chartR.height
){
return null;
}

return {
x,
y
};

}

function isClientOnRsiPlot(
clientX,
clientY
){

return plotCoordsFromRsiClient(
clientX,
clientY
) !=
null;

}

function hideCrosshairOnAnyPriceScale(
clientX,
clientY
){

if(
hideCrosshairOnPriceScale(
clientX,
clientY
)
){
return true;
}

if(
linkedChartEl &&
linkedChart &&
isClientOnChartPriceScale(
linkedChartEl,
linkedChart,
clientX,
clientY
)
){
clearLinked();
clearMainCrosshair();
return true;
}

return false;

}

function showRsiCrosshairFromClient(
clientX,
clientY
){

if(
!linkedWrapEl ||
!linkedChartEl ||
!linkedChart
){
return;
}

if(
hideCrosshairOnAnyPriceScale(
clientX,
clientY
)
){
return;
}

const plot =
plotCoordsFromRsiClient(
clientX,
clientY
);

if(
!plot
){
return;
}

applyRsiCrosshairPlot(
plot.x,
plot.y
);

try{
mainChart.clearCrosshairPosition();
}catch{
/* ignore */
}

try{
linkedChart.clearCrosshairPosition();
}catch{
/* ignore */
}

let probeTime =
linkedChart.timeScale().coordinateToTime?.(
plot.x
);

if(
probeTime ==
null &&
mainChart?.timeScale
){

probeTime =
mainChart.timeScale().coordinateToTime?.(
plot.x
);

}

updateCrosshairAxisLabels({
param:{
time: probeTime,
point:{
x: plot.x,
y: plot.y
}
},
timeLabelEl:crosshairTimeLabelEl,
priceLabelEl:crosshairPriceLabelEl,
snappedX:plot.x,
plotY:null,
mainSeries:null,
mainChart:null
});

const rsiVal =
linkedSeries?.coordinateToPrice?.(
plot.y
);

if(
rsiVal !=
null &&
Number.isFinite(
rsiVal
)
){
onLinkedCrosshairRsiValue?.(
rsiVal
);
}else if(
probeTime !=
null
){
onLinkedCrosshairTime?.(
probeTime
);
}

}

function plotCoordsFromClient(
clientX,
clientY
){

if(
!chartEl
){
return null;
}

if(
isClientOnChartPriceScale(
chartEl,
mainChart,
clientX,
clientY
)
){
return null;
}

const {
chartR,
plotW
} =
chartPlotMetrics(
chartEl,
mainChart
);

let x =
clientX - chartR.left;
let y =
clientY - chartR.top;

if(
x < 0 ||
x > plotW ||
y < 0 ||
y > chartR.height
){
return null;
}

return {
x,
y
};

}

function isPlotCrosshairX(
x
){

if(
!chartEl ||
!Number.isFinite(
x
)
){
return false;
}

const {
plotW
} =
chartPlotMetrics(
chartEl,
mainChart
);

return x >= -0.5 && x <= plotW + 0.5;

}

function clearMainCrosshair(){

try{
mainChart.clearCrosshairPosition();
}catch{
/* ignore */
}

}

function hideCrosshairOnPriceScale(
clientX,
clientY
){

if(
!isClientOnChartPriceScale(
chartEl,
mainChart,
clientX,
clientY
)
){
return false;
}

clearLinked();
clearMainCrosshair();
return true;

}

function showLinkedVert(
param
){

if(
!linkedVertOverlayEl
){
return false;
}

if(
isCrosshairPointerOnPriceScale(
param
)
){
clearLinked();
clearMainCrosshair();
return true;
}

const x =
crosshairOverlayPlotX(
param
);

let py =
param?.point?.y;

if(
!Number.isFinite(
py
)
){
py =
plotYFromLastPointer();
}

if(
!Number.isFinite(
x
) ||
!isPlotCrosshairX(
x
)
){
clearLinked();
clearMainCrosshair();
return true;
}

applyMainCrosshairPlot(
x,
py
);

try{
linkedChart.clearCrosshairPosition();
}catch{
/* ignore */
}

const labelParam = {
...param,
point: param.point ?? { x }
};

const labelX =
crosshairVertX(
param
);

const snappedLabelX =
Number.isFinite(
labelX
)
? labelX
: x;

if(
labelParam.time ==
null &&
mainChart?.timeScale
){

const t =
mainChart.timeScale().coordinateToTime?.(
snappedLabelX
);

if(
t != null
){
labelParam.time = t;
}

}

updateCrosshairAxisLabels({
param: labelParam,
timeLabelEl:crosshairTimeLabelEl,
priceLabelEl:crosshairPriceLabelEl,
snappedX:snappedLabelX,
plotY:py,
mainSeries,
mainChart
});

if(
onLinkedCrosshairTime
){

onLinkedCrosshairTime(
param.time
);

}

return true;

}

function onChartWrapPointerMove(
e
){

if(
e.pointerType !==
"touch"
){
trackPointerClient(
e.clientX,
e.clientY
);
}

if(
lock
){
return;
}

if(
e.pointerType ===
"touch"
){
return;
}

if(
document.body.classList.contains(
"chart-probe-active"
)
){
return;
}

if(
hideCrosshairOnAnyPriceScale(
e.clientX,
e.clientY
)
){
return;
}

const plot =
plotCoordsFromClient(
e.clientX,
e.clientY
);

if(
!plot
){

if(
isClientOnRsiPlot(
e.clientX,
e.clientY
)
){
showRsiCrosshairFromClient(
e.clientX,
e.clientY
);
return;
}

clearLinked();
clearMainCrosshair();
return;
}

applyMainCrosshairPlot(
plot.x,
plot.y
);

}

function onRsiWrapPointerMove(
e
){

if(
e.pointerType !==
"touch"
){
trackPointerClient(
e.clientX,
e.clientY
);
}

if(
lock
){
return;
}

if(
e.pointerType ===
"touch"
){
return;
}

if(
document.body.classList.contains(
"chart-probe-active"
)
){
return;
}

if(
!linkedWrapEl
){
return;
}

if(
hideCrosshairOnAnyPriceScale(
e.clientX,
e.clientY
)
){
return;
}

const plot =
plotCoordsFromRsiClient(
e.clientX,
e.clientY
);

if(
!plot
){

if(
plotCoordsFromClient(
e.clientX,
e.clientY
)
){
return;
}

clearLinked();
clearMainCrosshair();
return;
}

showRsiCrosshairFromClient(
e.clientX,
e.clientY
);

}

function onStackPointerTrack(
e
){

if(
e.pointerType !==
"touch"
){
trackPointerClient(
e.clientX,
e.clientY
);
}

}

if(
chartsStackEl
){

chartsStackEl.addEventListener(
"pointermove",
onStackPointerTrack,
{
passive:true,
capture:true
}
);

}

if(
chartWrapEl
){

chartWrapEl.addEventListener(
"pointermove",
onChartWrapPointerMove,
{
passive:true
}
);

}

if(
linkedWrapEl
){

linkedWrapEl.addEventListener(
"pointermove",
onRsiWrapPointerMove,
{
passive:true
}
);

}

mainChart.subscribeCrosshairMove(param=>{

if(lock){
return;
}

if(
param.point === undefined
){

if(
isClientOnRsiPlot(
lastPointerClientX,
lastPointerClientY
)
){
showRsiCrosshairFromClient(
lastPointerClientX,
lastPointerClientY
);
return;
}

clearLinked();
return;
}

if(
isCrosshairPointerOnPriceScale(
param
)
){
clearLinked();
clearMainCrosshair();
return;
}

const overlayX =
crosshairOverlayPlotX(
param
);

if(
!isPlotCrosshairX(
overlayX
)
){
clearLinked();
clearMainCrosshair();
return;
}

if(
linkedVertOverlayEl
){

showLinkedVert(
param
);

}

});

function refreshPointerCrosshair(){

if(
lock
){
return;
}

if(
document.body.classList.contains(
"chart-probe-active"
)
){
return;
}

if(
lastPointerClientX ==
null ||
lastPointerClientY ==
null
){
return;
}

if(
hideCrosshairOnAnyPriceScale(
lastPointerClientX,
lastPointerClientY
)
){
return;
}

const plot =
plotCoordsFromClient(
lastPointerClientX,
lastPointerClientY
);

if(
plot
){

applyMainCrosshairPlot(
plot.x,
plot.y
);

return;

}

if(
isClientOnRsiPlot(
lastPointerClientX,
lastPointerClientY
)
){

showRsiCrosshairFromClient(
lastPointerClientX,
lastPointerClientY
);

}

}

return {
clearLinked,
refreshPointerCrosshair,
detachPointerCrosshair(){

if(
chartsStackEl
){
chartsStackEl.removeEventListener(
"pointermove",
onStackPointerTrack,
true
);
}

if(
chartWrapEl
){
chartWrapEl.removeEventListener(
"pointermove",
onChartWrapPointerMove
);
}

if(
linkedWrapEl
){
linkedWrapEl.removeEventListener(
"pointermove",
onRsiWrapPointerMove
);
}

},
setSuppressed(
suppressed
){

lock = !!suppressed;

if(
lock
){
clearLinked();
}

}
};

}

export function tfPeriodSec(tf){

const map = {
"1":60,
"5":300,
"15":900,
"60":3600,
"240":14400,
"D":86400
};

return map[tf] || 900;

}

export function rsiPlotTimeOffsetSec(tf){

return Math.floor(
tfPeriodSec(tf) / 2
);

}

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
getTf
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

const data =
series.data();

const last =
data?.[data.length - 1];

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