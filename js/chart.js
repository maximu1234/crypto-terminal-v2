function trimTrailingZeros(value){

if(!value.includes(".")){
return value;
}

return value
.replace(/(\.\d*?)0+$/, "$1")
.replace(/\.$/, "");

}

function addThousandsSeparators(value){

const parts =
value.split(".");

parts[0] =
parts[0].replace(
/\B(?=(\d{3})+(?!\d))/g,
","
);

return parts.length > 1
? parts.join(".")
: parts[0];

}

export function formatPrice(price){

if(!Number.isFinite(price)){
return "";
}

const negative =
price < 0;

const abs =
Math.abs(price);

let formatted;

if(abs >= 1000){
formatted = abs.toFixed(2);
}else if(abs >= 1){
formatted = trimTrailingZeros(abs.toFixed(4));
}else if(abs >= 0.01){
formatted = trimTrailingZeros(abs.toFixed(6));
}else{
formatted = trimTrailingZeros(abs.toFixed(8));
}

const withCommas =
addThousandsSeparators(formatted);

return negative
? `-${withCommas}`
: withCommas;

}

export function priceFormatForValue(referencePrice){

const abs =
Math.abs(referencePrice) || 1;

let minMove;

if(abs >= 1000){
minMove = 0.01;
}else if(abs >= 1){
minMove = 0.0001;
}else if(abs >= 0.01){
minMove = 0.000001;
}else{
minMove = 0.00000001;
}

return {

type:"custom",
formatter:formatPrice,
minMove

};

}

export function applyChartPriceFormat(series, referencePrice){

series.applyOptions({

priceFormat:
priceFormatForValue(referencePrice)

});

}

export const CHART_PRICE_SCALE_WIDTH = 56;

export const CHART_SCALE_TEXT_COLOR = "#d1d5db";

/** Текст на светлой плашке ценовой шкалы (линии, алерты, светлые цвета). */
export const CHART_SCALE_TEXT_ON_LIGHT_BG =
"#1e293b";

export const CHART_SCALE_FONT_SIZE = 12;

export const CHART_SCALE_FONT_FAMILY =
"-apple-system, BlinkMacSystemFont, 'Trebuchet MS', Roboto, Ubuntu, sans-serif";

const CHART_SCALE_TICK_LENGTH = 5;

const CHART_SCALE_PADDING_INNER =
CHART_SCALE_FONT_SIZE / 12 * CHART_SCALE_TICK_LENGTH;

export const CHART_SCALE_LABEL_PAD_LEFT =
CHART_SCALE_TICK_LENGTH + CHART_SCALE_PADDING_INNER;

export const CHART_SCALE_LABEL_LINE_HEIGHT =
CHART_SCALE_FONT_SIZE + 4;

export function chartScaleFont(){

return `${CHART_SCALE_FONT_SIZE}px ${CHART_SCALE_FONT_FAMILY}`;

}

function parseColorToRgb(
color
){

const raw =
String(color || "").trim();

if(!raw){
return null;
}

if(
raw.startsWith("#")
){

let hex =
raw.slice(1);

if(
hex.length === 3
){
hex =
hex
.split("")
.map(ch=>ch + ch)
.join("");
}

if(
hex.length < 6
){
return null;
}

const r =
parseInt(
hex.slice(0, 2),
16
);
const g =
parseInt(
hex.slice(2, 4),
16
);
const b =
parseInt(
hex.slice(4, 6),
16
);

if(
[r, g, b].some(n=>Number.isNaN(n))
){
return null;
}

return { r, g, b };

}

const rgbMatch =
raw.match(
/^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)/
);

if(rgbMatch){

return {
r: Number(rgbMatch[1]),
g: Number(rgbMatch[2]),
b: Number(rgbMatch[3])
};

}

return null;

}

function relativeLuminance(
rgb
){

const channel =
c=>{

const v =
c / 255;

return v <= 0.03928
? v / 12.92
: Math.pow(
(v + 0.055) / 1.055,
2.4
);

};

return (
0.2126 * channel(rgb.r) +
0.7152 * channel(rgb.g) +
0.0722 * channel(rgb.b)
);

}

/**
 * Светлый фон плашки → тёмные цифры; тёмный фон → светлые (как шкала).
 */
export function scaleLabelTextColorForBackground(
bgColor
){

const rgb =
parseColorToRgb(bgColor);

if(!rgb){
return CHART_SCALE_TEXT_COLOR;
}

return relativeLuminance(rgb) > 0.45
? CHART_SCALE_TEXT_ON_LIGHT_BG
: CHART_SCALE_TEXT_COLOR;

}

export function chartScaleTextLeftPx(){

return CHART_SCALE_LABEL_PAD_LEFT;

}

const TV_CROSSHAIR_COLOR =
"#758696";

const TV_CROSSHAIR_LABEL_BG =
"#363A45";

function crosshairLineOptions(
labelVisible = true
){

const Dashed =
LightweightCharts.LineStyle?.Dashed ?? 2;

return {
color:TV_CROSSHAIR_COLOR,
width:1,
style:Dashed,
labelVisible,
labelBackgroundColor:TV_CROSSHAIR_LABEL_BG
};

}

function rsiCrosshairOptions(){

const Hidden =
LightweightCharts.CrosshairMode?.Hidden ?? 2;

return {
mode:Hidden
};

}

export function hiddenCrosshairOptions(){

return rsiCrosshairOptions();

}

export function normalCrosshairOptions(){

const Normal =
LightweightCharts.CrosshairMode?.Normal ?? 0;

/* Вертикаль — только DOM #linked-crosshair-vert (иначе двойная линия при смене свечи). */
return {
mode:Normal,
vertLine:{
visible:false,
labelVisible:false
},
horzLine:crosshairLineOptions(true)
};

}

/** Виджеты / touch: обе линии LW (нет отдельного DOM-оверлея в #charts-stack). */
export function fullCrosshairOptions(){

const Normal =
LightweightCharts.CrosshairMode?.Normal ?? 0;

return {
mode:Normal,
vertLine:crosshairLineOptions(
true
),
horzLine:crosshairLineOptions(
true
)
};

}

const DOM_CROSSHAIR_VERT =
"chart-dom-crosshair-vert";

const DOM_CROSSHAIR_HORZ =
"chart-dom-crosshair-horz";

function resolveChartCanvasEl(
wrapEl
){

if(
!wrapEl
){
return null;
}

return (
wrapEl.querySelector(
".chart"
) ||
wrapEl.querySelector(
"#chart"
)
);

}

/**
 * Вертикаль + горизонталь внутри wrap (виджеты, iPhone, рисование).
 */
export function ensureDomChartCrosshair(
wrapEl
){

if(
!wrapEl ||
wrapEl.querySelector(
`.${DOM_CROSSHAIR_VERT}`
)
){
return;
}

const vert =
document.createElement(
"div"
);

vert.className =
`${DOM_CROSSHAIR_VERT} hidden`;

vert.setAttribute(
"aria-hidden",
"true"
);

const horz =
document.createElement(
"div"
);

horz.className =
`${DOM_CROSSHAIR_HORZ} hidden`;

horz.setAttribute(
"aria-hidden",
"true"
);

wrapEl.appendChild(
vert
);

wrapEl.appendChild(
horz
);

}

export function positionDomChartCrosshair({
wrapEl,
chartEl,
chart,
series,
clientX,
clientY
}){

const el =
chartEl ||
resolveChartCanvasEl(
wrapEl
);

if(
!wrapEl ||
!el ||
!chart
){
return null;
}

const chartR =
el.getBoundingClientRect();

let x =
clientX - chartR.left;

let y =
clientY - chartR.top;

x =
Math.max(
0,
Math.min(
chartR.width,
x
)
);

y =
Math.max(
0,
Math.min(
chartR.height,
y
)
);

const vert =
wrapEl.querySelector(
`.${DOM_CROSSHAIR_VERT}`
);

const horz =
wrapEl.querySelector(
`.${DOM_CROSSHAIR_HORZ}`
);

if(
vert
){

vert.style.left =
`${Math.round(x)}px`;

vert.classList.remove(
"hidden"
);

}

let scaleW =
56;

try{
scaleW =
chart.priceScale(
"right"
).width() ||
56;
}catch{
/* ignore */
}

const plotW =
Math.max(
0,
chartR.width - scaleW
);

if(
horz
){

horz.style.top =
`${Math.round(y)}px`;

horz.style.left =
"0px";

horz.style.width =
`${Math.round(plotW)}px`;

horz.classList.remove(
"hidden"
);

}

try{
chart.clearCrosshairPosition();
}catch{
/* ignore */
}

const time =
chart.timeScale().coordinateToTime?.(
x
);

const price =
series?.coordinateToPrice?.(
y
);

return {
x,
y,
time,
price
};

}

export function hideDomChartCrosshair(
wrapEl
){

if(
!wrapEl
){
return;
}

wrapEl.querySelectorAll(
`.${DOM_CROSSHAIR_VERT}, .${DOM_CROSSHAIR_HORZ}`
).forEach(
node=>{
node.classList.add(
"hidden"
);
}
);

}

/** iPad probe: горизонталь LW, вертикаль — DOM (#linked-crosshair-vert). */
export function tabletProbeCrosshairOptions(){

const Normal =
LightweightCharts.CrosshairMode?.Normal ?? 0;

return {
mode:Normal,
vertLine:{
visible:false,
labelVisible:false
},
horzLine:crosshairLineOptions(
true
)
};

}

/**
 * Горизонталь probe в #charts-stack (если в HTML ещё внутри #chart-wrap — переносим).
 */
export function ensureTabletProbeHorizLine(
chartsStackEl
){

if(
!chartsStackEl
){
return null;
}

let el =
document.getElementById(
"tablet-probe-crosshair-h"
);

if(
!el
){

el =
document.createElement(
"div"
);

el.id =
"tablet-probe-crosshair-h";

el.className =
"tablet-probe-crosshair-h hidden";

el.setAttribute(
"aria-hidden",
"true"
);

}

if(
el.parentElement !==
chartsStackEl
){

chartsStackEl.appendChild(
el
);

}

return el;

}

/**
 * Пока активен probe-режим — откатываем любой сдвиг шкалы времени.
 */
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

/**
 * iPad probe: вертикаль DOM, горизонталь LW + резервный DOM в #charts-stack.
 */
export function positionTabletProbeCrosshair({
chart,
series,
chartEl,
chartsStackEl,
linkedVertEl,
horizLineEl,
timeLabelEl,
clientX,
clientY,
onTime
}){

if(
!chart ||
!chartEl
){
return null;
}

let probePrice =
null;

const chartR =
chartEl.getBoundingClientRect();

let x =
clientX - chartR.left;

let y =
clientY - chartR.top;

x =
Math.max(
0,
Math.min(
chartR.width,
x
)
);

y =
Math.max(
0,
Math.min(
chartR.height,
y
)
);

const scaleStrip =
document.getElementById(
"price-scale-touch-strip"
);

const scaleW =
scaleStrip?.offsetWidth ??
56;

if(
chartsStackEl &&
linkedVertEl
){

const stackR =
chartsStackEl.getBoundingClientRect();

const lineLeft =
chartR.left - stackR.left + x;

linkedVertEl.style.left =
`${Math.round(lineLeft)}px`;

linkedVertEl.classList.remove(
"hidden"
);

}

const time =
chart.timeScale().coordinateToTime?.(
x
);

const probeTime =
time ??
chart.timeScale().coordinateToTime?.(
Math.max(
0,
Math.min(
chartR.width - scaleW - 1,
x
)
)
);

if(
series
){

const price =
series.coordinateToPrice?.(
y
);

probePrice =
Number.isFinite(price)
? price
: null;

if(
probePrice != null &&
probeTime != null
){

try{
chart.setCrosshairPosition(
probePrice,
probeTime,
series
);
}catch{
/* ignore */
}

}

}

if(
horizLineEl &&
chartsStackEl
){

const stackR =
chartsStackEl.getBoundingClientRect();

const chartTopInStack =
chartR.top - stackR.top;

const chartBottomInStack =
chartTopInStack + chartR.height;

const topInStack =
clientY - stackR.top;

const clampedTop =
Math.max(
chartTopInStack,
Math.min(
chartBottomInStack,
topInStack
)
);

const plotLeft =
chartR.left - stackR.left;

const clampedScaleW =
Math.max(
0,
Math.min(
scaleW,
chartR.width - 1
)
);

const plotWidth =
Math.max(
1,
chartR.width - clampedScaleW
);

horizLineEl.style.top =
`${Math.round(clampedTop)}px`;

horizLineEl.style.left =
`${Math.round(plotLeft)}px`;

horizLineEl.style.width =
`${Math.round(plotWidth)}px`;

horizLineEl.style.removeProperty(
"right"
);

horizLineEl.style.display =
"block";

horizLineEl.classList.remove(
"hidden"
);

}

if(
chartsStackEl &&
probePrice != null
){

let priceLabelEl =
document.getElementById(
"tablet-probe-price-label"
);

if(
!priceLabelEl
){
priceLabelEl =
document.createElement("div");
priceLabelEl.id =
"tablet-probe-price-label";
priceLabelEl.className =
"crosshair-axis-label";
priceLabelEl.setAttribute(
"aria-hidden",
"true"
);
chartsStackEl.appendChild(
priceLabelEl
);
}

const stackR =
chartsStackEl.getBoundingClientRect();
const topInStack =
Math.max(
0,
Math.min(
chartR.height,
clientY - chartR.top
)
);

priceLabelEl.textContent =
formatPrice(probePrice);
priceLabelEl.style.top =
`${Math.round(chartR.top - stackR.top + topInStack - 10)}px`;
priceLabelEl.style.left =
`${Math.round(chartR.right - stackR.left - clampedScaleW + 3)}px`;
priceLabelEl.style.transform =
"translateY(-50%)";
priceLabelEl.classList.remove(
"hidden"
);

}else{

document.getElementById(
"tablet-probe-price-label"
)?.classList.add(
"hidden"
);

}

if(
probeTime == null
){

if(
timeLabelEl
){
timeLabelEl.classList.add(
"hidden"
);
}

return null;

}

updateCrosshairAxisLabels({
param:{
time: probeTime,
point:{
x
}
},
timeLabelEl
});

onTime?.(
probeTime
);

return {
time: probeTime,
x,
y,
price: probePrice
};

}

export function hideTabletProbeCrosshair({
linkedVertEl,
horizLineEl,
timeLabelEl,
onClear
}){

linkedVertEl?.classList.add(
"hidden"
);

linkedVertEl?.style.removeProperty(
"left"
);

const priceLabelEl =
document.getElementById(
"tablet-probe-price-label"
);

priceLabelEl?.classList.add(
"hidden"
);

horizLineEl?.classList.add(
"hidden"
);

horizLineEl?.style.removeProperty(
"top"
);

horizLineEl?.style.removeProperty(
"left"
);

horizLineEl?.style.removeProperty(
"width"
);

horizLineEl?.style.removeProperty(
"display"
);

clearCrosshairAxisLabels(
timeLabelEl
);

onClear?.();

}

function crosshairUnix(
time
){

if(
time === null ||
time === undefined
){
return null;
}

if(
typeof time === "number"
){
return time;
}

if(
typeof time === "object" &&
typeof time.timestamp === "number"
){
return time.timestamp;
}

return null;

}

export function formatCrosshairTimeLabel(
time
){

const ts =
crosshairUnix(time);

if(
ts === null
){
return "";
}

const d =
new Date(ts * 1000);

const weekdays =
[
"вс",
"пн",
"вт",
"ср",
"чт",
"пт",
"сб"
];

const months =
[
"янв.",
"февр.",
"мар.",
"апр.",
"май",
"июн.",
"июл.",
"авг.",
"сен.",
"окт.",
"нояб.",
"дек."
];

const wd =
weekdays[d.getDay()];

const day =
d.getDate();

const mon =
months[d.getMonth()];

const yr =
String(d.getFullYear()).slice(-2);

const hh =
String(d.getHours()).padStart(2, "0");

const mm =
String(d.getMinutes()).padStart(2, "0");

return `${wd} ${day} ${mon} '${yr} ${hh}:${mm}`;

}

function updateCrosshairAxisLabels({
param,
timeLabelEl,
snappedX
}){

const x =
Number.isFinite(snappedX)
? snappedX
: param.point?.x;

if(
timeLabelEl &&
Number.isFinite(x)
){

timeLabelEl.textContent =
formatCrosshairTimeLabel(param.time);

timeLabelEl.style.left =
`${Math.round(x)}px`;

timeLabelEl.classList.remove(
"hidden"
);

}else if(
timeLabelEl
){

timeLabelEl.classList.add(
"hidden"
);

timeLabelEl.style.removeProperty(
"left"
);

}

}

function clearCrosshairAxisLabels(
timeLabelEl
){

if(
timeLabelEl
){

timeLabelEl.classList.add(
"hidden"
);

timeLabelEl.style.removeProperty(
"left"
);

}

}

export function isUserCrosshairEvent(
param
){

return !!(
param &&
param.sourceEvent
);

}

export function createCandlestickChart(container){

const chart =
LightweightCharts.createChart(
container,
{

layout:{
background:{ color:"#0b1220" },
textColor:CHART_SCALE_TEXT_COLOR,
fontSize:CHART_SCALE_FONT_SIZE,
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
minimumWidth:CHART_PRICE_SCALE_WIDTH,
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

crosshair:fullCrosshairOptions(),

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
crosshair:fullCrosshairOptions()
});

const series =
chart.addCandlestickSeries({

upColor:"#22c55e",
downColor:"#ef4444",
borderVisible:false,
wickUpColor:"#22c55e",
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
background:{ color:"#0b1220" },
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

upColor:"#22c55e",
downColor:"#ef4444",
borderVisible:false,
wickUpColor:"#22c55e",
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
Math.max(
8,
Math.round(visibleBars * 0.1)
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

const lineStyleDot =
LightweightCharts.LineStyle !== undefined
? LightweightCharts.LineStyle.Dotted
: 1;

const chart =
LightweightCharts.createChart(
container,
{

layout:{
/* Прозрачный: зона 30–70 рисуется DOM (#rsi-band) под канвой */
background:{ color:"transparent" },
textColor:CHART_SCALE_TEXT_COLOR,
fontSize:CHART_SCALE_FONT_SIZE,
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
minimumWidth:CHART_PRICE_SCALE_WIDTH,
ticksVisible:true,
scaleMargins:{
top:0,
bottom:0
}
},

timeScale:{
visible:true,
timeVisible:true,
borderColor:"#1f2937",
secondsVisible:false,
rightOffset:12,
fixRightEdge:false
},

crosshair:rsiCrosshairOptions(),

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
crosshair:rsiCrosshairOptions()
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

[
70,
50,
30
].forEach(price=>{

series.createPriceLine({

price,

color:"rgba(174,174,182,0.35)",

lineStyle:
lineStyleDot,

lineWidth:1,

axisLabelVisible:false,

title:""

});

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
CHART_PRICE_SCALE_WIDTH;

const px =
`${w}px`;

document
.getElementById("chart-wrap")
?.style
.setProperty("--chart-scale-width", px);

document
.getElementById("rsi-wrap")
?.style
.setProperty("--chart-scale-width", px);

}

export function syncLinkedChartPriceScales(
mainChart,
linkedChart
){

if(
!mainChart ||
!linkedChart
){
return CHART_PRICE_SCALE_WIDTH;
}

const scale =
"right";

function measuredWidth(){

return Math.max(
mainChart.priceScale(scale).width() || 0,
linkedChart.priceScale(scale).width() || 0,
CHART_PRICE_SCALE_WIDTH
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
time:false,
price:false
},
mouseWheel:true,
pinch:true
}
});

}

let tabletGestureGuardInstalled =
false;

let tabletChartTouchBlock =
0;

/**
 * iPad: блокируем touch/pointer до LW (#chart) пока ждём long-press или probe.
 * touchstart на canvas идёт раньше pointerdown — без этого LW успевает начать pan.
 */
export function installTabletChartGestureGuard(){

if(
tabletGestureGuardInstalled ||
!isTabletChartViewport()
){
return;
}

tabletGestureGuardInstalled = true;

const opts = {
capture:true,
passive:false
};

const isChartTarget =(
target
)=>{

return !!target?.closest?.(
"#chart"
);

};

const blockIfNeeded =(
e
)=>{

if(
tabletChartTouchBlock <=
0
){
return;
}

if(
!isChartTarget(
e.target
)
){
return;
}

try{
e.preventDefault();
}catch{
/* ignore */
}

e.stopImmediatePropagation();

};

window.addEventListener(
"touchstart",
blockIfNeeded,
opts
);

window.addEventListener(
"touchmove",
blockIfNeeded,
opts
);

window.addEventListener(
"pointerdown",
blockIfNeeded,
opts
);

window.addEventListener(
"pointermove",
blockIfNeeded,
opts
);

}

export function setTabletChartTouchBlock(
count
){

tabletChartTouchBlock =
Math.max(
0,
count
);

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

export function linkChartsCrosshair({
mainChart,
linkedChart,
mainSeries,
linkedSeries,
linkedVertOverlayEl,
crosshairTimeLabelEl,
onLinkedCrosshairTime,
onLinkedCrosshairClear,
getLinkedValueAtTime,
getMainValueAtTime
}){

let lock =
false;

function clearLinkedVert(){

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

}

function clearLinked(){

clearLinkedVert();

clearCrosshairAxisLabels(
crosshairTimeLabelEl
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

function showLinkedVert(
param
){

if(
!linkedVertOverlayEl
){
return false;
}

const x =
crosshairVertX(param);

if(
!Number.isFinite(x)
){
clearLinkedVert();
return true;
}

syncLinkedChartPriceScales(
mainChart,
linkedChart
);

linkedVertOverlayEl.style.left =
`${Math.round(x)}px`;

linkedVertOverlayEl.classList.remove(
"hidden"
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

if(
labelParam.time ==
null &&
mainChart?.timeScale
){

const t =
mainChart.timeScale().coordinateToTime?.(
x
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
snappedX:x
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

mainChart.subscribeCrosshairMove(param=>{

if(lock){
return;
}

if(
param.point === undefined
){

clearLinked();
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

return {
clearLinked,
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
CHART_PRICE_SCALE_WIDTH;
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
formatPrice(last.close);

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

export {
mountTabletChartGestures
} from "./chart-tablet-gestures.js?v=7";

/** Смартфон / планшет с touch — отдельно от isTabletChartViewport (≥768px). */
export function isCoarseTouchViewport(){

return (
window.matchMedia(
"(pointer: coarse)"
).matches &&
navigator.maxTouchPoints >=
1
);

}

export function isTabletChartViewport(){

if(
window.matchMedia(
"(pointer: coarse) and (min-width: 768px)"
).matches
){
return true;
}

if(
navigator.maxTouchPoints <
1
){
return false;
}

if(
!window.matchMedia(
"(min-width: 768px)"
).matches
){
return false;
}

const ua =
navigator.userAgent ||
"";

if(
/iPad/i.test(
ua
)
){
return true;
}

if(
navigator.platform ===
"MacIntel" &&
"ontouchend" in
document
){
return true;
}

return false;

}

/**
 * iPad: горизонтальный pan вне LW — pointer на document, как у полосы цены.
 * LW horzTouchDrag на Safari часто «залипает» в одной зоне экрана.
 */
const TABLET_CROSSHAIR_HOLD_MS =
500;

/** Отмена ожидания long-press только при явном горизонтальном свайпе */
const TABLET_HOLD_CANCEL_HORIZ_PX =
28;

/**
 * iPad: перекрестие только после удержания пальца (~450ms).
 * Короткий тап и свайп — pan графика (см. mountTabletCustomTouchPan).
 */
export function mountTabletCrosshairLongPress(
chart,
series,
chartEl,
touchLayerEl,
{
shouldBeginHold = ()=>true,
onHoldPendingStart = ()=>{},
onHoldPendingEnd = ()=>{},
onHoldStart = ()=>{},
onHoldEnd = ()=>{},
onProbeAt = ()=>{}
} = {}
){

if(
!chart ||
!series ||
!chartEl ||
!touchLayerEl ||
!isTabletChartViewport()
){
const noop =
()=>{};

return {
dispose:noop,
cancelHoldWait:noop,
isHoldWaiting:()=>false
};

}

const chartWrapEl =
chartEl.closest?.(
"#chart-wrap"
) ??
touchLayerEl.parentElement;

if(
!chartWrapEl
){
const noop =
()=>{};

return {
dispose:noop,
cancelHoldWait:noop,
isHoldWaiting:()=>false
};

}

function syncChartTouchBlock(){

setTabletChartTouchBlock(
crosshairTrack
? 1
: 0
);

}

let holdTimer =
null;

let holdPointer =
null;

/** touch.identifier (touchstart); ≠ pointerId на iOS */
let holdTouchId =
null;

let holdStartX =
0;

let holdStartY =
0;

let crosshairTrack =
null;

let onDocPointerMove =
null;

let onDocTouchMove =
null;

let onDocGestureEnd =
null;

function cancelHoldWait(){

if(
holdTimer
){
clearTimeout(
holdTimer
);

holdTimer = null;

}

holdPointer = null;
holdTouchId = null;

}

function clearHoldTimer(){

cancelHoldWait();

}

function scheduleHoldWait(
pointerId,
clientX,
clientY
){

cancelHoldWait();

holdPointer =
pointerId;

holdTouchId =
pointerId;

holdStartX =
clientX;

holdStartY =
clientY;

holdTimer =
setTimeout(
()=>{

holdTimer = null;

if(
holdPointer ===
null
){
return;
}

beginCrosshairTrack();

},
TABLET_CROSSHAIR_HOLD_MS
);

}

function detachDocGestureShield(){

const cap =
{ capture:true };

const moveCap =
{
capture:true,
passive:false
};

if(
onDocPointerMove
){

document.removeEventListener(
"pointermove",
onDocPointerMove,
moveCap
);

onDocPointerMove = null;

}

if(
onDocTouchMove
){

document.removeEventListener(
"touchmove",
onDocTouchMove,
moveCap
);

onDocTouchMove = null;

}

if(
onDocGestureEnd
){

document.removeEventListener(
"pointerup",
onDocGestureEnd,
cap
);

document.removeEventListener(
"pointercancel",
onDocGestureEnd,
cap
);

document.removeEventListener(
"touchend",
onDocGestureEnd,
cap
);

document.removeEventListener(
"touchcancel",
onDocGestureEnd,
cap
);

onDocGestureEnd = null;

}

}

function attachDocGestureShield(){

detachDocGestureShield();

onDocPointerMove =(
e
)=>{

if(
!crosshairTrack
){
return;
}

if(
e.pointerId !==
undefined &&
e.pointerId !==
crosshairTrack.id
){
return;
}

e.preventDefault();
e.stopImmediatePropagation();
onProbeAt(
e.clientX,
e.clientY
);

};

onDocTouchMove =(
e
)=>{

if(
!crosshairTrack
){
return;
}

if(
e.touches.length >
1
){
endProbeSession();
return;
}

const t =
e.touches[
0
];

if(
!t
){
return;
}

e.preventDefault();
e.stopImmediatePropagation();
onProbeAt(
t.clientX,
t.clientY
);

};

onDocGestureEnd =(
e
)=>{

if(
!crosshairTrack
){
return;
}

if(
e.type ===
"touchend" ||
e.type ===
"touchcancel"
){

if(
e.touches.length >
0
){
return;
}

endProbeSession();

return;

}

if(
e.pointerId !==
undefined &&
e.pointerId !==
crosshairTrack.id
){
return;
}

endProbeSession();

};

const cap =
{ capture:true };

const moveCap =
{
capture:true,
passive:false
};

document.addEventListener(
"pointermove",
onDocPointerMove,
moveCap
);

document.addEventListener(
"touchmove",
onDocTouchMove,
moveCap
);

document.addEventListener(
"pointerup",
onDocGestureEnd,
cap
);

document.addEventListener(
"pointercancel",
onDocGestureEnd,
cap
);

document.addEventListener(
"touchend",
onDocGestureEnd,
cap
);

document.addEventListener(
"touchcancel",
onDocGestureEnd,
cap
);

}

function endProbeSession(){

const wasProbe =
!!crosshairTrack;

detachDocGestureShield();
touchLayerEl.classList.remove(
"active"
);
crosshairTrack = null;
syncChartTouchBlock();

if(
wasProbe
){
onHoldEnd();
}

}

function beginCrosshairTrack(){

onHoldStart();

crosshairTrack = {
id:holdPointer
};

syncChartTouchBlock();

touchLayerEl.classList.add(
"active"
);

attachDocGestureShield();

onProbeAt(
holdStartX,
holdStartY
);

}

function onLayerPointerDown(
e
){

if(
e.pointerType ===
"mouse"
){
return;
}

if(
crosshairTrack
){
return;
}

if(
!shouldBeginHold(
e
)
){
return;
}

scheduleHoldWait(
e.pointerId ??
0,
e.clientX,
e.clientY
);

}

function onLayerPointerMove(
e
){

if(
crosshairTrack
){

if(
e.pointerId !==
undefined &&
e.pointerId !==
crosshairTrack.id
){
return;
}

e.preventDefault();
onProbeAt(
e.clientX,
e.clientY
);

return;

}

if(
!holdTimer
){
return;
}

if(
e.pointerId !==
undefined &&
e.pointerId !==
holdPointer
){
return;
}

const dx =
e.clientX - holdStartX;

const dy =
e.clientY - holdStartY;

if(
Math.abs(
dx
) >=
TABLET_HOLD_CANCEL_HORIZ_PX &&
Math.abs(
dx
) >
Math.abs(
dy
) *
1.25
){
cancelHoldWait();
}

}

function onLayerPointerUp(
e
){

if(
crosshairTrack
){

if(
e.pointerId !==
undefined &&
e.pointerId !==
crosshairTrack.id
){
return;
}

endProbeSession();

return;

}

if(
holdTimer &&
(
e.pointerId ===
undefined ||
e.pointerId ===
holdPointer
)
){
cancelHoldWait();
}

}

function onTouchStart(
e
){

if(
e.touches.length >
1
){
cancelHoldWait();

if(
crosshairTrack
){
endProbeSession();
}

}

}

function onLayerContextMenu(
e
){

if(
holdTimer ||
crosshairTrack
){
e.preventDefault();
}

}

const capDown = {
capture:true,
passive:false
};

const moveCap = {
capture:true,
passive:false
};

chartWrapEl.addEventListener(
"pointerdown",
onLayerPointerDown,
capDown
);

chartWrapEl.addEventListener(
"pointermove",
onLayerPointerMove,
moveCap
);

chartWrapEl.addEventListener(
"pointerup",
onLayerPointerUp,
capDown
);

chartWrapEl.addEventListener(
"pointercancel",
onLayerPointerUp,
capDown
);

chartWrapEl.addEventListener(
"touchstart",
onTouchStart,
{ capture:true, passive:true }
);

chartWrapEl.addEventListener(
"contextmenu",
onLayerContextMenu,
capDown
);

const dispose =()=>{

endProbeSession();
clearHoldTimer();
touchLayerEl.classList.remove(
"active"
);
setTabletChartTouchBlock(
0
);

chartWrapEl.removeEventListener(
"pointerdown",
onLayerPointerDown,
capDown
);

chartWrapEl.removeEventListener(
"pointermove",
onLayerPointerMove,
moveCap
);

chartWrapEl.removeEventListener(
"pointerup",
onLayerPointerUp,
capDown
);

chartWrapEl.removeEventListener(
"pointercancel",
onLayerPointerUp,
capDown
);

chartWrapEl.removeEventListener(
"touchstart",
onTouchStart,
{ capture:true, passive:true }
);

chartWrapEl.removeEventListener(
"contextmenu",
onLayerContextMenu,
capDown
);

};

function isHoldWaiting(){

return !!holdTimer;

}

return {
dispose,
cancelHoldWait,
isHoldWaiting
};

}

export function mountTabletCustomTouchPan(
chart,
chartEl,
options = {}
){

const shouldAllowPan =
options.shouldAllowPan ??
(()=>true);

const onPanStart =
options.onPanStart ??
(()=>{});

const onCancelHoldWait =
options.onCancelHoldWait ??
(()=>{});

const isHoldWaiting =
options.isHoldWaiting ??
(()=>false);

if(
!TABLET_USE_CUSTOM_TOUCH_PAN ||
!chart ||
!chartEl ||
!isTabletChartViewport()
){
const noop =
()=>{};

return {
dispose:noop,
abortPan:noop,
cancelCurrentGesture:noop,
setPanSuspended:noop
};

}

const PAN_START_PX =
5;

let pan =
null;

let pendingPan =
null;

let pressTrack =
null;

let activePointers =
new Set();

let onDocMove =
null;

let onDocEnd =
null;

let panSuspended =
false;

function abortPan(){

pressTrack = null;
pendingPan = null;
pan = null;
detachDocListeners();

}

function cancelCurrentGesture(){

pressTrack = null;
abortPan();

}

function detachDocListeners(){

if(
onDocMove
){

document.removeEventListener(
"pointermove",
onDocMove
);

onDocMove = null;

}

if(
onDocEnd
){

document.removeEventListener(
"pointerup",
onDocEnd
);

document.removeEventListener(
"pointercancel",
onDocEnd
);

onDocEnd = null;

}

}

function endPan(
e
){

if(
e?.pointerId !==
undefined &&
pan &&
e.pointerId !==
pan.id &&
pendingPan &&
e.pointerId !==
pendingPan.id
){
return;
}

if(
e?.pointerId !==
undefined &&
pendingPan &&
e.pointerId ===
pendingPan.id
){
pendingPan = null;
}

if(
!pan
){
if(
!pendingPan
){
detachDocListeners();
}
return;
}

if(
e?.pointerId !==
undefined &&
e.pointerId !==
pan.id
){
return;
}

pan = null;

if(
!pendingPan
){
detachDocListeners();
}

}

const blockChartScroll =
options.blockChartScroll ??
(()=>false);

function scrollByDx(
dx
){

if(
tabletChartTouchBlock >
0 ||
blockChartScroll()
){
return;
}

const ts =
chart.timeScale();

const range =
ts.getVisibleLogicalRange();

if(
!range
){
return;
}

const spacing =
ts.options().barSpacing ??
6;

const shift =
dx / spacing;

ts.setVisibleLogicalRange({
from:range.from - shift,
to:range.to - shift
});

}

function ensureDocListeners(){

if(
onDocMove
){
return;
}

onDocMove =(
moveEvent
)=>{

if(
isHoldWaiting()
){
return;
}

if(
tabletChartTouchBlock >
0
){
return;
}

if(
panSuspended
){
return;
}

if(
activePointers.size >
1
){
abortPan();
return;
}

if(
!shouldAllowPan()
){
abortPan();
return;
}

if(
pressTrack &&
!pendingPan &&
!pan
){

if(
moveEvent.pointerId !==
undefined &&
moveEvent.pointerId !==
pressTrack.id
){
return;
}

const dx0 =
moveEvent.clientX - pressTrack.x;

const dy0 =
moveEvent.clientY - pressTrack.y;

if(
Math.abs(dx0) <
PAN_START_PX
){
return;
}

if(
Math.abs(dx0) <
Math.abs(dy0) *
1.25
){
return;
}

if(
!shouldAllowPan()
){
pressTrack = null;
return;
}

pendingPan = {
id:pressTrack.id,
x:moveEvent.clientX,
y:moveEvent.clientY
};

pressTrack = null;
onCancelHoldWait();

}

if(
pendingPan &&
!pan
){

if(
moveEvent.pointerId !==
undefined &&
moveEvent.pointerId !==
pendingPan.id
){
return;
}

const dx0 =
moveEvent.clientX - pendingPan.x;

const dy0 =
moveEvent.clientY - pendingPan.y;

if(
Math.abs(dx0) <
PAN_START_PX
){
return;
}

if(
Math.abs(dx0) <
Math.abs(dy0) *
1.25
){
return;
}

if(
!shouldAllowPan()
){
pendingPan = null;
return;
}

pan = {
id:pendingPan.id,
x:moveEvent.clientX
};

pendingPan = null;
onPanStart();

}

if(
!pan
){
return;
}

if(
!shouldAllowPan()
){
abortPan();
return;
}

if(
moveEvent.pointerId !==
undefined &&
moveEvent.pointerId !==
pan.id
){
return;
}

const dx =
moveEvent.clientX - pan.x;

pan.x =
moveEvent.clientX;

if(
Math.abs(dx) <
1
){
return;
}

moveEvent.preventDefault();
scrollByDx(
dx
);

};

onDocEnd =(
endEvent
)=>{

activePointers.delete(
endEvent.pointerId ??
0
);

endPan(
endEvent
);

if(
activePointers.size ===
0
){
detachDocListeners();
}

};

document.addEventListener(
"pointermove",
onDocMove,
{ passive:false }
);

document.addEventListener(
"pointerup",
onDocEnd
);

document.addEventListener(
"pointercancel",
onDocEnd
);

}

function onPointerDown(
e
){

if(
e.pointerType ===
"mouse"
){
return;
}

if(
e.button !==
undefined &&
e.button !==
0
){
return;
}

if(
e.target?.closest?.(
".price-scale-touch-strip"
)
){
return;
}

const chartWrap =
chartEl.closest(
"#chart-wrap"
);

if(
chartWrap?.classList.contains(
"chart-touch-locked"
)
){
return;
}

if(
isHoldWaiting() ||
panSuspended ||
!shouldAllowPan()
){
return;
}

activePointers.add(
e.pointerId ??
0
);

if(
activePointers.size >
1
){
abortPan();
return;
}

pressTrack = {
id:
e.pointerId ??
0,
x:e.clientX,
y:e.clientY
};

ensureDocListeners();

}

function onPointerUp(
e
){

activePointers.delete(
e.pointerId ??
0
);

if(
pressTrack &&
e.pointerId ===
pressTrack.id
){
pressTrack = null;
}

endPan(
e
);

if(
activePointers.size ===
0
){
detachDocListeners();
}

}

function onTouchStart(
e
){

if(
e.touches.length >
1
){
abortPan();
}

}

chartEl.addEventListener(
"pointerdown",
onPointerDown,
{ capture:true, passive:true }
);

chartEl.addEventListener(
"pointerup",
onPointerUp,
{ capture:true, passive:true }
);

chartEl.addEventListener(
"pointercancel",
onPointerUp,
{ capture:true, passive:true }
);

chartEl.addEventListener(
"touchstart",
onTouchStart,
{ capture:true, passive:true }
);

return ()=>{

chartEl.removeEventListener(
"pointerdown",
onPointerDown,
{ capture:true, passive:true }
);

chartEl.removeEventListener(
"pointerup",
onPointerUp,
{ capture:true, passive:true }
);

chartEl.removeEventListener(
"pointercancel",
onPointerUp,
{ capture:true, passive:true }
);

chartEl.removeEventListener(
"touchstart",
onTouchStart,
{ capture:true, passive:true }
);

activePointers.clear();
abortPan();

};

function setPanSuspended(
value
){

panSuspended =
!!value;

if(
panSuspended
){
cancelCurrentGesture();
}

}

return {
dispose,
abortPan,
cancelCurrentGesture,
setPanSuspended
};

}

export const DEFAULT_PRICE_SCALE_MARGINS =
Object.freeze({
top:0.12,
bottom:0.12
});

export function resetChartPriceAutoScale(
chart
){

if(
!chart
){
return;
}

try{
chart.priceScale(
"right"
).applyOptions({
autoScale:true,
scaleMargins:{
top:DEFAULT_PRICE_SCALE_MARGINS.top,
bottom:DEFAULT_PRICE_SCALE_MARGINS.bottom
}
});
}catch{
/* ignore */
}

}

/**
 * Двойной тап / двойной клик по шкале → onReset (автомасштаб и т.п.)
 */
export function mountAxisDoubleTapReset(
targetEl,
onReset
){

if(
!targetEl ||
typeof onReset !==
"function"
){
return ()=>{};
}

const DBL_MS =
320;

const DBL_PX =
28;

let lastTap =
null;

let lastTapTimer =
0;

function clearLastTap(){

lastTap = null;

if(
lastTapTimer
){
clearTimeout(
lastTapTimer
);

lastTapTimer = 0;

}

}

function tryDoubleTap(
e
){

const now =
Date.now();

const x =
e.clientX;
const y =
e.clientY;

if(
lastTap &&
now - lastTap.t <=
DBL_MS
){

const dx =
x - lastTap.x;
const dy =
y - lastTap.y;

if(
dx * dx + dy * dy <=
DBL_PX * DBL_PX
){
clearLastTap();
e.preventDefault();
e.stopPropagation();
onReset(
e
);
return true;

}

}

if(
lastTapTimer
){
clearTimeout(
lastTapTimer
);

}

lastTap = {
t:now,
x,
y
};

lastTapTimer =
setTimeout(
clearLastTap,
DBL_MS + 80
);

return false;

}

function onPointerDown(
e
){

if(
e.pointerType ===
"mouse" &&
e.button !==
0
){
return;
}

tryDoubleTap(
e
);

}

function onDblClick(
e
){

clearLastTap();
e.preventDefault();
e.stopPropagation();
onReset(
e
);

}

targetEl.addEventListener(
"pointerdown",
onPointerDown,
{ passive:false }
);

targetEl.addEventListener(
"dblclick",
onDblClick
);

return ()=>{

targetEl.removeEventListener(
"pointerdown",
onPointerDown,
{ passive:false }
);

targetEl.removeEventListener(
"dblclick",
onDblClick
);

clearLastTap();

};

}

/**
 * iPad: вертикальный масштаб только на полосе #price-scale-touch-strip.
 * Область свечей не перехватывается — pan/pinch LW остаются отзывчивыми.
 */
export function mountTabletPriceScaleTouch(
chart,
stripEl,
chartEl,
onInteraction
){

if(
!chart ||
!stripEl ||
!chartEl ||
!isTabletChartViewport()
){
return ()=>{};
}

let drag =
null;

let margins =
{
top:DEFAULT_PRICE_SCALE_MARGINS.top,
bottom:DEFAULT_PRICE_SCALE_MARGINS.bottom
};

const STRIP_DBL_TAP_MS =
320;

const STRIP_DBL_TAP_PX =
28;

let stripLastTap =
null;

let stripTapTimer =
0;

function clearStripLastTap(){

stripLastTap = null;

if(
stripTapTimer
){
clearTimeout(
stripTapTimer
);

stripTapTimer = 0;

}

}

function resetStripPriceAutoScale(){

margins = {
top:DEFAULT_PRICE_SCALE_MARGINS.top,
bottom:DEFAULT_PRICE_SCALE_MARGINS.bottom
};

resetChartPriceAutoScale(
chart
);

onInteraction?.();

}

function stripTryDoubleTap(
e
){

const now =
Date.now();

const x =
e.clientX;

const y =
e.clientY;

if(
stripLastTap &&
now - stripLastTap.t <=
STRIP_DBL_TAP_MS
){

const dx =
x - stripLastTap.x;

const dy =
y - stripLastTap.y;

if(
dx * dx + dy * dy <=
STRIP_DBL_TAP_PX * STRIP_DBL_TAP_PX
){
clearStripLastTap();
abortDrag();
resetStripPriceAutoScale();
e.preventDefault();
e.stopPropagation();
return true;

}

}

if(
stripTapTimer
){
clearTimeout(
stripTapTimer
);

}

stripLastTap = {
t:now,
x,
y
};

stripTapTimer =
setTimeout(
clearStripLastTap,
STRIP_DBL_TAP_MS + 80
);

return false;

}

function readMargins(){

try{

const o =
chart.priceScale(
"right"
).options();

margins.top =
o.scaleMargins?.top ??
0.12;

margins.bottom =
o.scaleMargins?.bottom ??
0.12;

}catch{
/* ignore */
}

}

let onDocMove =
null;

let onDocEnd =
null;

function detachDocListeners(){

if(
onDocMove
){

document.removeEventListener(
"pointermove",
onDocMove
);

onDocMove = null;

}

if(
onDocEnd
){

document.removeEventListener(
"pointerup",
onDocEnd
);

document.removeEventListener(
"pointercancel",
onDocEnd
);

onDocEnd = null;

}

}

function abortDrag(){

if(
!drag
){
return;
}

drag = null;
detachDocListeners();

}

function endDrag(
e
){

if(
!drag
){
return;
}

if(
e?.pointerId !== undefined &&
e.pointerId !== drag.id
){
return;
}

abortDrag();

}

function applyVerticalScaleDrag(
dy
){

const delta =
dy * 0.003;

margins.top =
Math.max(
0.02,
Math.min(
0.48,
margins.top + delta
)
);

margins.bottom =
Math.max(
0.02,
Math.min(
0.48,
margins.bottom + delta
)
);

chart.priceScale(
"right"
).applyOptions({
autoScale:false,
scaleMargins:{
top:margins.top,
bottom:margins.bottom
}
});

onInteraction?.();

}

function onPointerDown(
e
){

if(
e.pointerType === "mouse"
){
return;
}

if(
stripTryDoubleTap(
e
)
){
return;
}

readMargins();

detachDocListeners();

drag = {
id:
e.pointerId ??
0,
y:e.clientY
};

try{
chart.priceScale(
"right"
).setAutoScale(
false
);
}catch{
/* ignore */
}

onDocMove =(
moveEvent
)=>{

if(
!drag ||
(
moveEvent.pointerId !==
undefined &&
moveEvent.pointerId !==
drag.id
)
){
return;
}

const dy =
moveEvent.clientY - drag.y;

drag.y =
moveEvent.clientY;

if(
Math.abs(dy) <
0.5
){
return;
}

applyVerticalScaleDrag(
dy
);

moveEvent.preventDefault();

};

onDocEnd = endDrag;

document.addEventListener(
"pointermove",
onDocMove,
{ passive:false }
);

document.addEventListener(
"pointerup",
onDocEnd
);

document.addEventListener(
"pointercancel",
onDocEnd
);

e.preventDefault();

}

const stripOpts = {
passive:false
};

function onStripDblClick(
e
){

e.preventDefault();
e.stopPropagation();
abortDrag();
resetStripPriceAutoScale();

}

stripEl.addEventListener(
"pointerdown",
onPointerDown,
stripOpts
);

stripEl.addEventListener(
"dblclick",
onStripDblClick
);

const onChartPointerDown =(
e
)=>{

if(
e.pointerType ===
"mouse"
){
return;
}

abortDrag();

};

chartEl.addEventListener(
"pointerdown",
onChartPointerDown,
{ passive:true }
);

return ()=>{

clearStripLastTap();

stripEl.removeEventListener(
"pointerdown",
onPointerDown,
stripOpts
);

stripEl.removeEventListener(
"dblclick",
onStripDblClick
);

chartEl.removeEventListener(
"pointerdown",
onChartPointerDown,
{ passive:true }
);

abortDrag();

};

}
