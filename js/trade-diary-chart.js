import {
loadLightweightCharts
} from "./charts-lib-boot.js?v=3";

import {
applyChartPriceFormat,
CHART_SCALE_FONT_FAMILY,
CHART_SCALE_TEXT_COLOR,
effectiveChartPriceScaleWidth,
effectiveChartScaleFontSize
} from "./chart/chart-options.js?v=7";

import {
fetchBybit
} from "./bybit-fetch.js?v=17";

export const DIARY_CHART_TFS =
Object.freeze([
"1",
"5",
"15",
"60",
"240",
"D",
"W"
]);

export const DEFAULT_DIARY_CHART_TF =
"15";

const TF_MINUTES =
Object.freeze({
"1":
1,
"5":
5,
"15":
15,
"60":
60,
"240":
240,
"D":
24 *
60,
"W":
7 *
24 *
60
});

const TF_LABELS =
Object.freeze({
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
});

/** Целевое число свечей слева/справа от сделки (итого ~2× вокруг трейда). */
const DIARY_CHART_BARS_EACH_SIDE =
40;

const DIARY_CHART_MIN_BARS =
24;

export function diaryChartTfLabel(
tf
){

return TF_LABELS[
tf
] ||
tf;

}

function linearSymbol(
symbol
){

const raw =
String(
symbol ||
""
).toUpperCase();

return raw.endsWith(
"USDT"
)
? raw
: `${raw}USDT`;

}

function candleAlignSec(
ms,
tf
){

const tfMin =
TF_MINUTES[
tf
] ||
15;
const tfSec =
tfMin *
60;
const sec =
Math.floor(
ms /
1000
);

return Math.floor(
sec /
tfSec
) *
tfSec;

}

async function fetchKlineBatch(
symbol,
tf,
end
){

const path =
`/v5/market/kline?category=linear&symbol=${encodeURIComponent(
symbol
)}&interval=${encodeURIComponent(
tf
)}&limit=1000&end=${end}`;

try{

const {
json
} =
await fetchBybit(
path,
{
sequential:
true,
retries:
2,
timeoutMs:
10000
}
);

if(
json.retCode ===
0 &&
Array.isArray(
json.result?.list
)
){
return json.result.list;
}

}catch{
/* ignore */
}

return null;

}

async function loadCandlesAroundTrade(
symbol,
tf,
openTimeMs,
closeTimeMs
){

const tfMin =
TF_MINUTES[
tf
] ||
15;
const tfMs =
tfMin *
60 *
1000;
const tradeSpanMs =
Math.max(
tfMs,
closeTimeMs -
openTimeMs
);
const sideBars =
Math.max(
DIARY_CHART_MIN_BARS,
DIARY_CHART_BARS_EACH_SIDE
);
const startMs =
openTimeMs -
sideBars *
tfMs;
const endMs =
closeTimeMs +
sideBars *
tfMs;
const minWindowMs =
tradeSpanMs +
sideBars *
2 *
tfMs;
const centerMs =
openTimeMs +
tradeSpanMs /
2;
let windowStart =
Math.min(
startMs,
centerMs -
minWindowMs /
2
);
let windowEnd =
Math.max(
endMs,
centerMs +
minWindowMs /
2
);
let end =
windowEnd;
const unique =
new Map();
let guard =
0;

while(
guard <
8
){

guard++;
const batch =
await fetchKlineBatch(
symbol,
tf,
end
);

if(
!batch?.length
){
break;
}

for(
const row of
batch
){

const time =
Math.floor(
Number(
row[
0
]
) /
1000
);

unique.set(
time,
{
time,
open:
Number(
row[
1
]
),
high:
Number(
row[
2
]
),
low:
Number(
row[
3
]
),
close:
Number(
row[
4
]
),
volume:
Number(
row[
5
]
) ||
0
}
);

}

const oldest =
Math.min(
...batch.map(
k=>
Number(
k[
0
]
)
)
);

if(
oldest <=
windowStart
){
break;
}

end =
oldest -
1;

}

return [
...unique.values()
]
.filter(
c=>
c.time *
1000 >=
windowStart &&
c.time *
1000 <=
windowEnd
)
.sort(
(
a,
b
)=>
a.time -
b.time
);

}

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

function buildChartShell(
symbol
){

const shell =
document.createElement(
"div"
);
shell.className =
"trade-diary-detail-chart-shell";

const head =
document.createElement(
"div"
);
head.className =
"trade-diary-detail-chart-head";

const meta =
document.createElement(
"div"
);
meta.className =
"trade-diary-detail-chart-meta";
meta.textContent =
`LINEAR:${symbol} · Bybit`;

const tfBar =
document.createElement(
"div"
);
tfBar.className =
"trade-diary-tf-bar";

for(
const tf of
DIARY_CHART_TFS
){

const btn =
document.createElement(
"button"
);
btn.type =
"button";
btn.className =
"trade-diary-tf-btn";
btn.dataset.diaryTf =
tf;
btn.textContent =
diaryChartTfLabel(
tf
);
tfBar.append(
btn
);

}

head.append(
meta,
tfBar
);

const mount =
document.createElement(
"div"
);
mount.className =
"trade-diary-detail-chart-canvas";
mount.dataset.diaryCanvas =
"1";

shell.append(
head,
mount
);

return shell;

}

function markerForExecutionSide(
side,
execTimeMs,
tf
){

const isBuy =
String(
side ||
""
).toLowerCase() ===
"buy";

return {
time:
candleAlignSec(
execTimeMs,
tf
),
position:
isBuy
? "belowBar"
: "aboveBar",
color:
isBuy
? "#22c55e"
: "#ef4444",
shape:
isBuy
? "arrowUp"
: "arrowDown",
size:
2
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
const candles =
await loadCandlesAroundTrade(
symbol,
tf,
trade.openTimeMs,
trade.closeTimeMs
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
);

const series =
chart.addCandlestickSeries({
upColor:"#459782",
downColor:"#ef4444",
borderVisible:
false,
wickUpColor:"#459782",
wickDownColor:"#ef4444",
priceLineVisible:
false,
lastValueVisible:
false
});

series.setData(
candles
);

applyChartPriceFormat(
series,
referencePrice
);

const entryMs =
detail?.entries?.[
0
]?.execTimeMs ||
trade.openTimeMs;
const exitMs =
detail?.exits?.length
? detail.exits[
detail.exits.length -
1
].execTimeMs
: trade.closeTimeMs;
const isLong =
trade.side ===
"long";
const entrySide =
isLong
? "Buy"
: "Sell";
const exitSide =
isLong
? "Sell"
: "Buy";

const markers =
[];

if(
entryMs
){
markers.push(
markerForExecutionSide(
entrySide,
entryMs,
tf
)
);
}

if(
exitMs
){
markers.push(
markerForExecutionSide(
exitSide,
exitMs,
tf
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
Math.max(
12,
Math.floor(
40 *
60 /
(
TF_MINUTES[
tf
] ||
15
)
)
);
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
