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

export function createCandlestickChart(container){

const chart =
LightweightCharts.createChart(
container,
{

layout:{
background:{ color:"#0b1220" },
textColor:"#d1d5db"
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

crosshair:{
mode:0
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

const chart =
LightweightCharts.createChart(
container,
{

layout:{
background:{ color:"transparent" },
textColor:"#797b85"
},

grid:{
vertLines:{ color:"#161b26" },
horzLines:{ color:"#161b26" }
},

rightPriceScale:{

borderColor:"#1f2937",

scaleMargins:{
top:0.2,
bottom:0.2
}

},

timeScale:{
visible:false
},

crosshair:{
mode:0
}

});

const series =
chart.addLineSeries({

color:"#a39cb9",
lineWidth:2

});

[30,50,70].forEach(level=>{

series.createPriceLine({

price:level,
color:"#797b85",
lineStyle:
LightweightCharts.LineStyle.Dashed,
lineWidth:1,
axisLabelVisible:true

});

});

return {

chart,
series

};

}
