import {
loadLightweightCharts
} from "./charts-lib-boot.js?v=04885614";

import {
applyChartPriceFormat,
CHART_SCALE_FONT_FAMILY,
CHART_SCALE_TEXT_COLOR,
effectiveChartPriceScaleWidth,
effectiveChartScaleFontSize
} from "./chart/chart-options.js?v=f4be0094";

import {
withChartLocalTime
} from "./chart/chart-local-time.js?v=027bb0cc";

import {
candleSeriesPaint,
registerCandleSeries
} from "./chart/candle-color-prefs.js?v=a9347502";

import {
candleAlignSec,
markerForExecutionSide
} from "./trade-markers-sandbox/marker-math.js?v=a5c98186";

import {
buildChartShell,
DEFAULT_DIARY_CHART_TF,
diaryChartTfLabel,
DIARY_CHART_TFS,
linearSymbol,
loadCandlesAroundTrade
} from "./trade-diary-chart-data.js?v=1";

export {
DEFAULT_DIARY_CHART_TF,
diaryChartTfLabel,
DIARY_CHART_TFS
};


const chartInstances =
new WeakMap();

function destroyChartRuntime(
container
){

const inst =
chartInstances.get(
container
);

if(
!inst
){
return;
}

try{
inst.ro?.disconnect?.();
inst.chart?.remove?.();
}catch{
/* ignore */
}

chartInstances.delete(
container
);

}

export function destroyDiaryTradeChart(
container
){

if(
!container
){
return;
}

destroyChartRuntime(
container
);
container.replaceChildren();

}

function setActiveTfButton(
container,
tf
){

container.querySelectorAll(
"[data-diary-tf]"
).forEach(
btn=>{
btn.classList.toggle(
"active",
btn.dataset.diaryTf ===
tf
);
}
);

}

function markerTimesFromDetail(
detail,
trade,
fallbackOpenMs,
fallbackCloseMs
){

const sideRaw =
String(
detail?.side ||
trade?.side ||
""
).toLowerCase();
const openMs =
Number(
detail?.openTimeMs
) >
0
? Number(
detail.openTimeMs
)
: fallbackOpenMs;
const closeMs =
Number(
detail?.closeTimeMs
) >
0
? Number(
detail.closeTimeMs
)
: fallbackCloseMs;

return {
entryMs:
openMs,
exitMs:
closeMs,
isLong:
sideRaw ===
"long",
sideKnown:
sideRaw ===
"long" ||
sideRaw ===
"short"
};

}

async function renderDiaryChart(
container,
trade,
detail,
tf
){

const mount =
container.querySelector(
"[data-diary-canvas]"
);

if(
!mount
){
return;
}

destroyChartRuntime(
container
);
setActiveTfButton(
container,
tf
);

const symbol =
linearSymbol(
trade.symbol
);
const openMs =
Number(
detail?.openTimeMs
) >
0
? Number(
detail.openTimeMs
)
: trade.openTimeMs;
const closeMs =
Number(
detail?.closeTimeMs
) >
0
? Number(
detail.closeTimeMs
)
: trade.closeTimeMs;

/* Markers follow positionHistory open/close + side from detail. */
const markerTimes =
markerTimesFromDetail(
detail,
trade,
openMs,
closeMs
);
const entryMs =
markerTimes.entryMs;
const exitMs =
markerTimes.exitMs;
const isLong =
markerTimes.isLong;
const sideKnown =
markerTimes.sideKnown;
const entrySide =
!sideKnown
? ""
: isLong
? "Buy"
: "Sell";
const exitSide =
!sideKnown
? ""
: isLong
? "Sell"
: "Buy";

const candles =
await loadCandlesAroundTrade(
symbol,
tf,
entryMs ||
openMs,
exitMs ||
closeMs
);

mount.replaceChildren();

if(
!candles.length
){
mount.textContent =
"Нет данных графика";
return;
}

await loadLightweightCharts();

const priceScaleMode =
LightweightCharts.PriceScaleMode?.Normal ??
0;
const referencePrice =
Number(
candles[
candles.length -
1
]?.close
) ||
Number(
candles[
0
]?.close
) ||
1;

const chart =
LightweightCharts.createChart(
mount,
withChartLocalTime(
{
layout:{
background:{
color:"#0f141a"
},
textColor:
CHART_SCALE_TEXT_COLOR,
fontSize:
effectiveChartScaleFontSize(),
fontFamily:
CHART_SCALE_FONT_FAMILY
},
grid:{
vertLines:{
color:"#161b26"
},
horzLines:{
color:"#161b26"
}
},
rightPriceScale:{
visible:
true,
borderColor:"#1f2937",
mode:
priceScaleMode,
autoScale:
true,
minimumWidth:
effectiveChartPriceScaleWidth(),
ticksVisible:
true,
scaleMargins:{
top:
0.12,
bottom:
0.12
}
},
timeScale:{
borderColor:"#1f2937",
timeVisible:
true,
ticksVisible:
true,
secondsVisible:
false,
rightOffset:
8,
fixRightEdge:
false
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
true,
horzTouchDrag:
true,
vertTouchDrag:
false
},
handleScale:{
axisPressedMouseMove:{
time:
true,
price:
true
},
mouseWheel:
true,
pinch:
true
}
}
)
);

const series =
chart.addCandlestickSeries({
...candleSeriesPaint(),
priceLineVisible:
false,
lastValueVisible:
false
});

registerCandleSeries(
series
);

series.setData(
candles
);

applyChartPriceFormat(
series,
referencePrice
);

const markers =
[];

if(
entryMs &&
entrySide
){
markers.push(
markerForExecutionSide(
entrySide,
candleAlignSec(
entryMs,
tf
)
)
);
}

if(
exitMs &&
exitSide
){
markers.push(
markerForExecutionSide(
exitSide,
candleAlignSec(
exitMs,
tf
)
)
);
}

if(
markers.length
){
series.setMarkers(
markers
);
}

const fromIdx =
candles.findIndex(
c=>
c.time >=
candleAlignSec(
entryMs,
tf
)
);
const toIdx =
candles.findIndex(
c=>
c.time >=
candleAlignSec(
exitMs,
tf
)
);
const pad =
DIARY_CHART_BARS_EACH_SIDE;
const from =
Math.max(
0,
(
fromIdx >=
0
? fromIdx
: 0
) -
pad
);
const to =
Math.min(
candles.length -
1,
(
toIdx >=
0
? toIdx
: candles.length -
1
) +
pad
);

chart.timeScale().setVisibleLogicalRange({
from,
to:
to +
1
});

chart.priceScale(
"right"
).applyOptions({
autoScale:
true,
mode:
priceScaleMode
});

function syncDiaryChartSize(){

const w =
mount.clientWidth;
const h =
mount.clientHeight;

if(
w >
0 &&
h >
0
){
chart.applyOptions({
width:
w,
height:
h
});
chart.priceScale(
"right"
).applyOptions({
autoScale:
true
});
}

}

const ro =
new ResizeObserver(
()=>{
syncDiaryChartSize();
}
);

ro.observe(
mount
);
requestAnimationFrame(
()=>{
requestAnimationFrame(
syncDiaryChartSize
);
}
);
syncDiaryChartSize();

chartInstances.set(
container,
{
chart,
ro,
trade,
detail,
tf
}
);

}

export async function mountDiaryTradeChart(
container,
trade,
detail,
options =
{}
){

if(
!container
){
return;
}

const symbol =
linearSymbol(
trade.symbol
);
const initialTf =
options.tf ||
DEFAULT_DIARY_CHART_TF;

container.replaceChildren();
container.append(
buildChartShell(
symbol
)
);

container.addEventListener(
"click",
event=>{

const btn =
event.target.closest(
"[data-diary-tf]"
);

if(
!btn ||
!container.contains(
btn
)
){
return;
}

const nextTf =
btn.dataset.diaryTf;
const inst =
chartInstances.get(
container
);

if(
!nextTf ||
inst?.tf ===
nextTf
){
return;
}

void renderDiaryChart(
container,
trade,
detail,
nextTf
);

}
);

await renderDiaryChart(
container,
trade,
detail,
initialTf
);

}
