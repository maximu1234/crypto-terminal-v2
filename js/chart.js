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

function normalCrosshairOptions(){

const Normal =
LightweightCharts.CrosshairMode?.Normal ?? 0;

return {
mode:Normal,
vertLine:crosshairLineOptions(true),
horzLine:crosshairLineOptions(true)
};

}

function rsiCrosshairOptions(){

const Hidden =
LightweightCharts.CrosshairMode?.Hidden ?? 2;

return {
mode:Hidden
};

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
timeLabelEl
}){

const x =
param.point?.x;

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

crosshair:normalCrosshairOptions(),

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
mouseWheel:true,
pinch:true
}

});

chart.applyOptions({
crosshair:normalCrosshairOptions()
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
axisDoubleClickReset:false
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
afterSync
){

if(
!mainChart ||
!linkedChart
){
return ()=>{};
}

let lock =
false;

function fromMain(){

if(lock){
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

if(lock){
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

function showLinkedVert(
param
){

if(
!linkedVertOverlayEl
){
return false;
}

const x =
param.point?.x;

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

updateCrosshairAxisLabels({
param,
timeLabelEl:crosshairTimeLabelEl
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
!param?.time ||
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
export function mountTabletCustomTouchPan(
chart,
chartEl
){

if(
!TABLET_USE_CUSTOM_TOUCH_PAN ||
!chart ||
!chartEl ||
!isTabletChartViewport()
){
return ()=>{};
}

const PAN_START_PX =
5;

let pan =
null;

let pendingPan =
null;

let activePointers =
new Set();

let onDocMove =
null;

let onDocEnd =
null;

function abortPan(){

pendingPan = null;
pan = null;
detachDocListeners();

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

function scrollByDx(
dx
){

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
activePointers.size >
1
){
abortPan();
return;
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

pan = {
id:pendingPan.id,
x:moveEvent.clientX
};

pendingPan = null;

}

if(
!pan
){
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

pendingPan = {
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
top:0.12,
bottom:0.12
};

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

stripEl.addEventListener(
"pointerdown",
onPointerDown,
stripOpts
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

stripEl.removeEventListener(
"pointerdown",
onPointerDown,
stripOpts
);

chartEl.removeEventListener(
"pointerdown",
onChartPointerDown,
{ passive:true }
);

abortDrag();

};

}
