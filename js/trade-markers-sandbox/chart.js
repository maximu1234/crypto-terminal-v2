/**
 * Песочница: Lightweight Charts + маркеры (график сразу, сделки кэшируются).
 */
import {
loadLightweightCharts
} from "../charts-lib-boot.js?v=3";

import {
applyChartPriceFormat,
CHART_SCALE_FONT_FAMILY,
CHART_SCALE_TEXT_COLOR,
effectiveChartPriceScaleWidth,
effectiveChartScaleFontSize
} from "../chart/chart-options.js?v=7";

import {
buildMarkersForCandles,
SANDBOX_SYMBOL
} from "./marker-math.js?v=8";

import {
loadRecentCandles
} from "./klines.js?v=6";

import {
fetchSandboxTrades
} from "./trade-fetch.js?v=6";

export function createSandboxChart(
mountEl,
options =
{}
){

const onMarkersReady =
options.onMarkersReady;

let chart =
null;
let series =
null;
let resizeObserver =
null;
let currentTf =
"240";
let candles =
[];
let cachedMarkers =
[];
let cachedTradeData =
null;
let tradesFetchPromise =
null;
let showMarkers =
false;
let markersSeq =
0;

function applyMarkers(){

if(
!series
){
return;
}

const next =
showMarkers
? cachedMarkers
: [];

try{
series.setMarkers(
next
);
}catch{
/* ignore */
}

}

function resize(){

if(
!chart ||
!mountEl
){
return;
}

const rect =
mountEl.getBoundingClientRect();

chart.applyOptions(
{
width:
Math.max(
1,
Math.floor(
rect.width
)
),
height:
Math.max(
1,
Math.floor(
rect.height
)
)
}
);

}

async function ensureExecutions(
chartStartSec,
force =
false
){

if(
cachedTradeData?.ok &&
!force
){
return cachedTradeData;
}

if(
tradesFetchPromise &&
!force
){
return tradesFetchPromise;
}

tradesFetchPromise =
fetchSandboxTrades(
chartStartSec
).then(
result=>{

cachedTradeData =
result;
tradesFetchPromise =
null;
return result;

}
);

return tradesFetchPromise;

}

async function rebuildMarkers(
opts =
{}
){

const seq =
++markersSeq;

if(
!candles.length
){
cachedMarkers =
[];
applyMarkers();
const empty =
{
markerCount:
0,
tradeCount:
0,
candleCount:
0,
message:
"нет свечей"
};
onMarkersReady?.(
empty
);
return empty;
}

const tradeData =
cachedTradeData?.ok &&
!opts.forceTrades
? cachedTradeData
: await ensureExecutions(
candles[
0
].time,
!!opts.forceTrades
);

if(
seq !==
markersSeq
){
return null;
}

if(
!tradeData?.ok
){
cachedMarkers =
[];
applyMarkers();
const fail =
{
markerCount:
0,
tradeCount:
0,
candleCount:
candles.length,
message:
tradeData?.message ||
"ошибка сделок"
};
onMarkersReady?.(
fail
);
return fail;
}

cachedMarkers =
buildMarkersForCandles(
tradeData.executions ||
[],
currentTf,
candles
);

applyMarkers();

const info =
{
markerCount:
cachedMarkers.length,
tradeCount:
tradeData.trades?.length ||
0,
candleCount:
candles.length,
message:
`сделок ${tradeData.trades?.length || 0}, маркеров ${cachedMarkers.length}`
};

onMarkersReady?.(
info
);
return info;

}

async function loadTf(
tf
){

currentTf =
tf;
cachedTradeData =
null;
tradesFetchPromise =
null;
cachedMarkers =
[];

const loadedCandles =
await loadRecentCandles(
SANDBOX_SYMBOL,
tf
);

candles =
loadedCandles;

if(
!series
){
return {
ok:
false,
message:
"series missing"
};
}

series.setData(
candles
);

if(
candles.length
){
applyChartPriceFormat(
series,
candles[
candles.length -
1
].close
);
chart.timeScale().fitContent();
}

applyMarkers();

let markerInfo =
null;

if(
showMarkers
){
markerInfo =
await rebuildMarkers();
}

return {
ok:
candles.length >
0,
candleCount:
candles.length,
markerCount:
markerInfo?.markerCount ??
0,
tradeCount:
markerInfo?.tradeCount ??
0,
message:
showMarkers &&
markerInfo
? `${candles.length} свечей · ${markerInfo.message}`
: `${candles.length} свечей`
};

}

return {

async mount(){

await loadLightweightCharts();

mountEl.replaceChildren();

chart =
LightweightCharts.createChart(
mountEl,
{
layout:{
background:{
color:
"#0f1419"
},
textColor:
CHART_SCALE_TEXT_COLOR,
fontFamily:
CHART_SCALE_FONT_FAMILY,
fontSize:
effectiveChartScaleFontSize()
},
grid:{
vertLines:{
color:
"#1a2332"
},
horzLines:{
color:
"#1a2332"
}
},
rightPriceScale:{
borderColor:
"#1f2937",
autoScale:
true,
minimumWidth:
effectiveChartPriceScaleWidth(),
ticksVisible:
true,
scaleMargins:{
top:
0.1,
bottom:
0.1
}
},
timeScale:{
borderColor:
"#1f2937",
timeVisible:
true,
secondsVisible:
false,
rightOffset:
8
},
crosshair:{
mode:
LightweightCharts.CrosshairMode?.Normal ??
0
},
handleScroll:{
mouseWheel:
true,
pressedMouseMove:
true
},
handleScale:{
mouseWheel:
true,
pinch:
true
}
}
);

series =
chart.addCandlestickSeries(
{
upColor:
"#459782",
downColor:
"#ef4444",
borderVisible:
false,
wickUpColor:
"#459782",
wickDownColor:
"#ef4444",
priceLineVisible:
false,
lastValueVisible:
false
}
);

resizeObserver =
new ResizeObserver(
()=>{
resize();
}
);
resizeObserver.observe(
mountEl
);
resize();

return loadTf(
currentTf
);

},

loadTf,

async setShowMarkers(
enabled
){

showMarkers =
!!enabled;

if(
!showMarkers
){
applyMarkers();
return {
markerCount:
0,
tradeCount:
0,
candleCount:
candles.length,
message:
"маркеры скрыты"
};
}

const t0 =
performance.now();
const info =
await rebuildMarkers();
const elapsedMs =
Math.round(
performance.now() -
t0
);

return {
...info,
elapsedMs,
message:
`${info.message} · ${(
elapsedMs /
1000
).toFixed(
1
)}с`
};

},

async refreshMarkers(){

if(
!showMarkers
){
return {
markerCount:
0,
tradeCount:
0,
candleCount:
candles.length,
message:
"включите «Показать историю сделок»"
};
}

cachedTradeData =
null;
tradesFetchPromise =
null;

const t0 =
performance.now();
const info =
await rebuildMarkers(
{
forceTrades:
true
}
);
const elapsedMs =
Math.round(
performance.now() -
t0
);

return {
...info,
elapsedMs,
message:
`${info.message} · ${(
elapsedMs /
1000
).toFixed(
1
)}с`
};

},

destroy(){

markersSeq++;
resizeObserver?.disconnect();
resizeObserver =
null;

try{
chart?.remove();
}catch{
/* ignore */
}

chart =
null;
series =
null;
candles =
[];
cachedMarkers =
[];
cachedTradeData =
null;
tradesFetchPromise =
null;

}

};

}
