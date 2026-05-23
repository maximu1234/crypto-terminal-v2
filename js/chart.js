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

function normalCrosshairOptions(){

const Normal =
LightweightCharts.CrosshairMode?.Normal ?? 0;

const Dashed =
LightweightCharts.LineStyle?.Dashed ?? 2;

const Dotted =
LightweightCharts.LineStyle?.Dotted ?? 1;

return {
mode:Normal,
vertLine:{
color:"rgba(120,126,146,0.45)",
width:1,
style:Dashed,
labelVisible:true
},
horzLine:{
color:"rgba(120,126,146,0.35)",
width:1,
style:Dotted,
labelVisible:true
}
};

}

function isUserCrosshairEvent(
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
timeVisible:true,
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
ticksVisible:false,
scaleMargins:{
top:0,
bottom:0
}
},

timeScale:{
visible:false,
rightOffset:12,
fixRightEdge:false
},

crosshair:{
...normalCrosshairOptions(),
vertLine:{
...normalCrosshairOptions().vertLine,
labelVisible:false
},
horzLine:{
...normalCrosshairOptions().horzLine,
labelVisible:false
}
},

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
crosshair:{
...normalCrosshairOptions(),
vertLine:{
...normalCrosshairOptions().vertLine,
labelVisible:false
},
horzLine:{
...normalCrosshairOptions().horzLine,
labelVisible:false
}
}
});

const series =
chart.addLineSeries({

color:"#e6e8eb",

lineWidth:1,

lastValueVisible:false,

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
{ price:70, axisLabelVisible:true },

{ price:50, axisLabelVisible:false },

{ price:30, axisLabelVisible:true }

].forEach(({ price, axisLabelVisible })=>{

series.createPriceLine({

price,

color:"rgba(174,174,182,0.35)",

lineStyle:
lineStyleDot,

lineWidth:1,

axisLabelVisible,

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

const w =
Math.max(
mainChart.priceScale("right").width() || 0,
linkedChart.priceScale("right").width() || 0,
CHART_PRICE_SCALE_WIDTH
);

mainChart.priceScale("right").applyOptions({
minimumWidth:w
});

linkedChart.priceScale("right").applyOptions({
minimumWidth:w
});

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

applyChartScaleWidthCss(mainChart);

}

export function linkChartsCrosshair({
mainChart,
linkedChart,
mainSeries,
linkedSeries,
getLinkedValueAtTime,
getMainValueAtTime
}){

let lock =
false;

function clearLinked(){

try{
linkedChart.clearCrosshairPosition();
}catch{
/* ignore */
}

}

mainChart.subscribeCrosshairMove(param=>{

if(lock){
return;
}

if(
!isUserCrosshairEvent(param)
){

clearLinked();
return;
}

if(
!param?.time ||
param.point === undefined
){

clearLinked();
return;
}

const value =
getLinkedValueAtTime?.(
param.time
);

if(
value === null ||
value === undefined ||
!Number.isFinite(value)
){

clearLinked();
return;
}

lock = true;

try{
linkedChart.setCrosshairPosition(
value,
param.time,
linkedSeries
);
}catch{
/* ignore */
}finally{
lock = false;
}

});

linkedChart.subscribeCrosshairMove(param=>{

if(lock){
return;
}

if(
!isUserCrosshairEvent(param) ||
!getMainValueAtTime
){
return;
}

if(
!param?.time ||
param.point === undefined
){
return;
}

const value =
getMainValueAtTime(
param.time
);

if(
value === null ||
value === undefined ||
!Number.isFinite(value)
){

return;
}

lock = true;

try{
mainChart.setCrosshairPosition(
value,
param.time,
mainSeries
);
}catch{
/* ignore */
}finally{
lock = false;
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
let timer = 0;

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

update();

timer = window.setInterval(update, 1000);

const ro =
new ResizeObserver(()=>update());

ro.observe(wrapEl);

return ()=>{

clearInterval(timer);
ro.disconnect();
hud?.remove();

};

}
