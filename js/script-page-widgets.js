/**
 * Страница Скрипт — сетка виджетов (как Скринер), по одному на сетап сканера.
 */
import {
createScreenerChart,
createRSIChart,
applyChartPriceFormat,
applyScreenerZoom,
restoreScreenerViewport,
updateRsiBandLayout,
updateRsiLevelLinesLayout,
linkPairedChartTimeScales,
SCREENER_MAX_BARS,
SCREENER_VISIBLE_BARS
} from "./chart-import.js?v=43";

import {
loadMarketHistory,
getActiveExchangeId,
getExchangeDefinition
} from "./market-api.js?v=2";

import {
calculateRSI,
alignRsiWithCandleTimes
} from "./indicators.js?v=3";

import {
subscribeKline
} from "./market-ws.js?v=1";

import {
isScreenerWidgetCurrent as isWidgetCurrentGuard
} from "./screener-widget-guard.js?v=1";

import {
mountScreenerWidgetZoom,
refreshZoomFavoriteUi
} from "./screener-widget-zoom.js?v=12";

import {
getWidgetFlagHtml,
wireWidgetFlagUi,
updateWidgetFlagUi,
bindWidgetFlagGlobalListeners
} from "./widget-favorite-flag.js?v=6";

import {
PATTERN_SCAN_TF_LABELS,
PATTERN_SCAN_SIDE_LABELS
} from "./pattern-12-scanner.js?v=17";

let patternOverlayApi =
null;

async function ensurePatternOverlayApi(){

if(
!patternOverlayApi
){
patternOverlayApi =
await import(
"./screener-pattern-overlay.js?v=4"
);
}

return patternOverlayApi;

}

function mergeLiveCandle(
candles,
candle,
maxLen
){

if(
!candles.length
){
candles.push(
candle
);
return true;
}

const last =
candles[
candles.length -
1
];

if(
candle.time <
last.time
){
return false;
}

if(
candle.time ===
last.time
){
candles[
candles.length -
1
] =
candle;
return true;
}

candles.push(
candle
);

if(
candles.length >
maxLen
){
candles.shift();
}

return true;

}

function buildWidgetBodyHtml(
showRsi
){

if(
!showRsi
){
return `<div class="screener-chart"></div>`;
}

return `
<div class="screener-widget-body">
<div class="screener-chart"></div>
<div class="screener-rsi-wrap">
<div class="screener-rsi-band"></div>
<div class="rsi-level-line hidden" data-rsi-level="70" aria-hidden="true"></div>
<div class="rsi-level-line hidden" data-rsi-level="50" aria-hidden="true"></div>
<div class="rsi-level-line hidden" data-rsi-level="30" aria-hidden="true"></div>
<div class="screener-rsi-chart"></div>
</div>
</div>`;

}

function displaySymbol(
symbol
){

return String(
symbol ||
""
).replace(
/\.P$/i,
""
);

}

function activeExchangeLabel(){

return getExchangeDefinition(
getActiveExchangeId()
)?.name ||
"";

}

function widgetShowsRsi(
layout
){

return layout ===
4 ||
layout ===
6;

}

function isWidgetCurrent(
widget,
renderToken,
activeWidgets
){

return isWidgetCurrentGuard(
widget,
renderToken,
activeWidgets
);

}

function layoutWidgetRsi(
widget
){

if(
!widget?.rsiSeries ||
!widget?.rsiWrapEl
){
return;
}

updateRsiBandLayout(
widget.rsiSeries,
widget.rsiWrapEl.querySelector(
".screener-rsi-band"
)
);

updateRsiLevelLinesLayout(
widget.rsiSeries,
widget.rsiWrapEl
);

}

function updateWidgetRsiData(
widget,
renderToken,
activeWidgets
){

if(
!isWidgetCurrent(
widget,
renderToken,
activeWidgets
) ||
!widget?.rsiSeries ||
!widget.candles?.length
){
return;
}

try{

const raw =
calculateRSI(
widget.candles
);

const points =
alignRsiWithCandleTimes(
widget.candles,
raw
);

widget.rsiSeries.setData(
points
);

layoutWidgetRsi(
widget
);

}catch{
/* chart disposed */
}

}

async function mountWidgetPattern(
widget,
renderToken,
activeWidgets
){

if(
!isWidgetCurrent(
widget,
renderToken,
activeWidgets
)
){
return;
}

const api =
await ensurePatternOverlayApi();

if(
!isWidgetCurrent(
widget,
renderToken,
activeWidgets
)
){
return;
}

api.mountScreenerPatternOverlay(
widget
);

}

function destroyWidgetPattern(
widget
){

widget?.patternOverlayDestroy?.();

}

function updateWidgetPatternData(
widget,
renderToken,
activeWidgets
){

if(
!isWidgetCurrent(
widget,
renderToken,
activeWidgets
)
){
return;
}

try{
widget?.patternOverlayRecompute?.();
}catch{
/* chart disposed */
}

}

function attachWidgetKlineStream(
widget,
renderToken,
activeWidgets
){

const {
symbol,
tf,
chart,
series
} =
widget;

if(
!widget.candles.length
){
return;
}

widget.unsubKline?.();

widget.unsubKline =
subscribeKline(
symbol,
tf,
candle=>{

if(
!isWidgetCurrent(
widget,
renderToken,
activeWidgets
)
){
return;
}

try{

const prevLast =
widget.candles[
widget.candles.length -
1
];

const isNewBar =
prevLast &&
candle.time >
prevLast.time;

if(
!mergeLiveCandle(
widget.candles,
candle,
SCREENER_MAX_BARS
)
){
return;
}

if(
isNewBar &&
widget.candles.length >
SCREENER_MAX_BARS &&
!widget.userAdjustedZoom
){

widget.candles =
widget.candles.slice(
-SCREENER_MAX_BARS
);

series.setData(
widget.candles
);

updateWidgetRsiData(
widget,
renderToken,
activeWidgets
);
updateWidgetPatternData(
widget,
renderToken,
activeWidgets
);

}else{

series.update(
candle
);

if(
widget.rsiSeries &&
isNewBar
){
updateWidgetRsiData(
widget,
renderToken,
activeWidgets
);
}

if(
isNewBar
){
updateWidgetPatternData(
widget,
renderToken,
activeWidgets
);
}

}

applyChartPriceFormat(
series,
candle.close
);

if(
!widget.userAdjustedZoom &&
isNewBar
){

const total =
widget.candles.length;
const visible =
Math.min(
SCREENER_VISIBLE_BARS,
total
);

restoreScreenerViewport(
chart,
widget.chartEl.clientWidth,
visible,
total
);

}

}catch{
/* chart disposed */
}

}
);

}

export function createScriptWidgetGrid(
{
gridEl,
paginationEl,
statusEl,
onPersist
}
){

let layout =
9;
let currentPage =
1;
let activeWidgets =
[];
let renderToken =
0;
let unmountZoom =
null;

function pageSize(){

return layout;

}

function totalPages(
rowCount
){

const size =
pageSize();

if(
!rowCount ||
!size
){
return 1;
}

return Math.max(
1,
Math.ceil(
rowCount /
size
)
);

}

function clampPage(
rowCount
){

const total =
totalPages(
rowCount
);

if(
currentPage >
total
){
currentPage =
total;
}

if(
currentPage <
1
){
currentPage =
1;
}

}

function rowsForPage(
rows
){

const size =
pageSize();
const start =
(
currentPage -
1
) *
size;

return rows.slice(
start,
start +
size
);

}

function gridClass(){

return `grid-${layout}`;

}

function setStatus(
text,
loading
){

if(
!statusEl
){
return;
}

if(
!text
){
statusEl.classList.add(
"hidden"
);
statusEl.textContent =
"";
return;
}

statusEl.textContent =
text;
statusEl.classList.toggle(
"hidden",
false
);
statusEl.classList.toggle(
"loading",
!!loading
);

}

function syncChartSize(
widget,
renderTokenRef,
activeWidgetsRef
){

if(
!isWidgetCurrent(
widget,
renderTokenRef,
activeWidgetsRef
)
){
return 0;
}

try{

const root =
widget.root;
const chart =
widget.chart;
const chartEl =
widget.chartEl;
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
return 0;
}

chart.applyOptions({
width:
w,
height:
h
});

if(
widget.rsiChart &&
widget.rsiChartEl
){

const body =
root.querySelector(
".screener-widget-body"
);
const rsiH =
widget.rsiChartEl.clientHeight;

widget.rsiChart.applyOptions({
width:
w,
height:
Math.max(
rsiH,
40
)
});

layoutWidgetRsi(
widget
);

}

if(
widget.userAdjustedZoom
){

const range =
chart.timeScale().getVisibleLogicalRange();

if(
!range
){
return 0;
}

return Math.max(
0,
Math.round(
range.to -
range.from
)
);

}

return applyScreenerZoom(
chart,
widget.series,
widget.candles,
w,
h
);

}catch{
return 0;
}finally{
widget.patternOverlayRedraw?.();
}

}

function createWidget(
row,
loadId,
chartTf
){

const showRsi =
widgetShowsRsi(
layout
);
const tfLabel =
PATTERN_SCAN_TF_LABELS[
chartTf
] ||
chartTf;
const sideLabel =
PATTERN_SCAN_SIDE_LABELS[
row.side
] ||
row.side;
const sideClass =
row.side ===
"long"
? "script-side-long"
: "script-side-short";

const root =
document.createElement(
"article"
);

root.className =
showRsi
? "screener-widget has-rsi script-widget"
: "screener-widget script-widget";
root.dataset.symbol =
row.symbol;
root.dataset.tf =
chartTf;
root.dataset.scanTf =
row.tf;

const exchangeLabel =
activeExchangeLabel();
const metaParts =
[
tfLabel
];

if(
exchangeLabel
){
metaParts.push(
exchangeLabel
);
}

root.innerHTML =
`
<div class="screener-widget-header">
<div class="screener-header-left">
${getWidgetFlagHtml()}
<div class="screener-symbol">${displaySymbol(row.symbol)}</div>
<span class="script-widget-meta">${metaParts.join(" · ")}</span>
<span class="script-widget-side ${sideClass}">${sideLabel}</span>
</div>
<div class="screener-header-right">
<button class="screener-open" type="button" title="Открыть в Терминале">↗</button>
</div>
</div>
${buildWidgetBodyHtml(showRsi)}
`;

wireWidgetFlagUi(
root,
()=>
row.symbol,
()=>{
refreshAllWidgetFlags();
}
);

updateWidgetFlagUi(
root,
row.symbol
);

root.querySelector(
".screener-open"
).onclick =
event=>{
event.stopPropagation();
const exchangeId =
encodeURIComponent(
getActiveExchangeId() ||
""
);
window.location.href =
`/terminal.html?symbol=${encodeURIComponent(row.symbol)}&tf=${encodeURIComponent(chartTf)}${exchangeId ? `&exchange=${exchangeId}` : ""}`;
};

const chartEl =
root.querySelector(
".screener-chart"
);

const {
chart,
series
} =
createScreenerChart(
chartEl
);

const widget =
{
symbol:
row.symbol,
tf:
chartTf,
scanTf:
row.tf,
side:
row.side,
root,
chart,
series,
chartEl,
loadId,
disposed:
false,
unlinkTimeScales:
null,
candles: [],
userAdjustedZoom:
false,
rsiChart:
null,
rsiSeries:
null,
rsiChartEl:
null,
rsiWrapEl:
null
};

if(
showRsi
){

const rsiWrapEl =
root.querySelector(
".screener-rsi-wrap"
);
const rsiChartEl =
root.querySelector(
".screener-rsi-chart"
);
const rsiPair =
createRSIChart(
rsiChartEl
);

widget.rsiWrapEl =
rsiWrapEl;
widget.rsiChartEl =
rsiChartEl;
widget.rsiChart =
rsiPair.chart;
widget.rsiSeries =
rsiPair.series;

chart.applyOptions({
timeScale:{
visible:
false,
borderVisible:
false
}
});

widget.rsiChart.applyOptions({
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
});

widget.unlinkTimeScales =
linkPairedChartTimeScales(
chart,
widget.rsiChart,
()=>{

if(
isWidgetCurrent(
widget,
renderToken,
activeWidgets
)
){
layoutWidgetRsi(
widget
);
}

}
);

}

function markUserZoom(){

widget.userAdjustedZoom =
true;

}

chartEl.addEventListener(
"wheel",
markUserZoom,
{
passive:
true
}
);
chartEl.addEventListener(
"mousedown",
markUserZoom
);
chartEl.addEventListener(
"touchstart",
markUserZoom,
{
passive:
true
}
);

const syncSize =
()=>{
syncChartSize(
widget,
renderToken,
activeWidgets
);
};

const resizeTarget =
root.querySelector(
".screener-widget-body"
) ||
chartEl;
const resizeObserver =
new ResizeObserver(
syncSize
);

resizeObserver.observe(
resizeTarget
);
widget.resizeObserver =
resizeObserver;
widget.syncChartSize =
syncSize;

requestAnimationFrame(
syncSize
);

return widget;

}

function destroyWidgets(){

activeWidgets.forEach(
widget=>{

widget.disposed =
true;
widget.unsubKline?.();
destroyWidgetPattern(
widget
);

try{
widget.unlinkTimeScales?.();
}catch{
/* ignore */
}

widget.unlinkTimeScales =
null;
widget.resizeObserver?.disconnect?.();

try{
widget.chart?.remove?.();
}catch{
/* ignore */
}

try{
widget.rsiChart?.remove?.();
}catch{
/* ignore */
}

widget.root?.remove?.();

}
);

activeWidgets =
[];

if(
gridEl
){
gridEl.innerHTML =
"";
}

}

async function loadWidgetChart(
widget,
renderTokenRef,
activeWidgetsRef
){

const {
symbol,
tf,
chart,
series,
chartEl,
loadId
} =
widget;

chartEl.classList.add(
"loading"
);

try{

const candles =
await loadMarketHistory(
symbol,
tf,
2,
{
parallel:
true
}
);

if(
loadId !==
renderTokenRef
){
return;
}

if(
!candles.length
){
return;
}

const loaded =
candles.length >
SCREENER_MAX_BARS
? candles.slice(
-SCREENER_MAX_BARS
)
: candles;

widget.candles =
loaded;
widget.userAdjustedZoom =
false;

if(
!isWidgetCurrent(
widget,
renderTokenRef,
activeWidgetsRef
)
){
return;
}

series.setData(
loaded
);

applyChartPriceFormat(
series,
loaded[
loaded.length -
1
].close
);

updateWidgetRsiData(
widget,
renderTokenRef,
activeWidgetsRef
);
updateWidgetPatternData(
widget,
renderTokenRef,
activeWidgetsRef
);

attachWidgetKlineStream(
widget,
renderTokenRef,
activeWidgetsRef
);

const runZoom =
()=>{

if(
!isWidgetCurrent(
widget,
renderTokenRef,
activeWidgetsRef
)
){
return;
}

try{
widget.syncChartSize?.();
}catch{
/* chart disposed */
}

};

runZoom();
requestAnimationFrame(
runZoom
);
setTimeout(
runZoom,
50
);
setTimeout(
runZoom,
200
);
setTimeout(
runZoom,
500
);
setTimeout(
runZoom,
1200
);

}catch(
err
){
console.error(
"Script widget chart:",
symbol,
tf,
err
);
}finally{

if(
loadId ===
renderTokenRef
){
chartEl.classList.remove(
"loading"
);
}

}

}

function renderPagination(
rowCount
){

if(
!paginationEl
){
return;
}

clampPage(
rowCount
);

const total =
totalPages(
rowCount
);

paginationEl.innerHTML =
"";

const prev =
document.createElement(
"button"
);
prev.className =
"page-btn page-nav-prev";
prev.setAttribute(
"aria-label",
"Предыдущая страница"
);
prev.textContent =
"‹";
prev.disabled =
currentPage <=
1;
prev.onclick =
()=>{
currentPage--;
onPersist?.({
layout,
page:
currentPage
});
void renderPage(
cachedRows,
cachedChartTfFilter
);
};

paginationEl.appendChild(
prev
);

const pagesWrap =
document.createElement(
"div"
);
pagesWrap.className =
"pagination-pages";
paginationEl.appendChild(
pagesWrap
);

for(
let p =
1;
p <=
total;
p++
){

const btn =
document.createElement(
"button"
);
btn.className =
`page-btn${p === currentPage ? " active" : ""}`;
btn.textContent =
String(
p
);
btn.onclick =
()=>{

if(
p ===
currentPage
){
return;
}

currentPage =
p;
onPersist?.({
layout,
page:
currentPage
});
void renderPage(
cachedRows,
cachedChartTfFilter
);

};
pagesWrap.appendChild(
btn
);

}

const next =
document.createElement(
"button"
);
next.className =
"page-btn page-nav-next";
next.setAttribute(
"aria-label",
"Следующая страница"
);
next.textContent =
"›";
next.disabled =
currentPage >=
total;
next.onclick =
()=>{
currentPage++;
onPersist?.({
layout,
page:
currentPage
});
void renderPage(
cachedRows,
cachedChartTfFilter
);
};

paginationEl.appendChild(
next
);

}

let cachedRows =
[];
let cachedChartTfFilter =
"all";

function resolveWidgetChartTf(
chartTfFilter,
row
){

if(
chartTfFilter ===
"all"
){
return row.tf;
}

return chartTfFilter;

}

async function renderPage(
rows,
chartTfFilter =
cachedChartTfFilter
){

cachedRows =
rows;
cachedChartTfFilter =
chartTfFilter ||
"all";

const loadId =
++renderToken;

if(
gridEl
){
gridEl.className =
gridClass();
}

renderPagination(
rows.length
);

if(
!rows.length
){

destroyWidgets();
setStatus(
"Нет сетапов",
false
);
return;
}

const pageRows =
rowsForPage(
rows
);

if(
!pageRows.length
){

destroyWidgets();
setStatus(
"Нет сетапов на этой странице",
false
);
return;
}

setStatus(
`Загрузка графиков (${pageRows.length})…`,
true
);

const nextWidgets =
pageRows.map(
row=>
createWidget(
row,
loadId,
resolveWidgetChartTf(
cachedChartTfFilter,
row
)
)
);

destroyWidgets();

const fragment =
document.createDocumentFragment();

nextWidgets.forEach(
widget=>{
fragment.appendChild(
widget.root
);
}
);

gridEl.appendChild(
fragment
);
activeWidgets =
nextWidgets;

await Promise.all(
activeWidgets.map(
widget=>
mountWidgetPattern(
widget,
renderToken,
activeWidgets
)
)
);

await Promise.all(
activeWidgets.map(
widget=>
loadWidgetChart(
widget,
renderToken,
activeWidgets
)
)
);

if(
loadId ===
renderToken
){
setStatus(
"",
false
);
}

}

function setLayout(
next
){

const n =
Number(
next
);

if(
n !==
4 &&
n !==
6 &&
n !==
9
){
return;
}

layout =
n;
currentPage =
1;
onPersist?.({
layout,
page:
currentPage
});

}

function restoreLayoutState(
nextLayout,
nextPage
){

const n =
Number(
nextLayout
);

if(
n ===
4 ||
n ===
6 ||
n ===
9
){
layout =
n;
}

currentPage =
Math.max(
1,
Number(
nextPage
) ||
1
);

}

function refreshAllWidgetFlags(){

activeWidgets.forEach(
widget=>{
updateWidgetFlagUi(
widget.root,
widget.symbol
);
refreshZoomFavoriteUi(
widget.symbol
);
}
);

}

function mountZoom(){

if(
unmountZoom
){
return;
}

unmountZoom =
mountScreenerWidgetZoom(
{
gridElId:
"script-grid",
resolveWidget:
root=>
activeWidgets.find(
w=>
w.root ===
root
),
getCurrentTF:()=>
cachedChartTfFilter ===
"all"
? (
cachedRows[
0
]?.tf ||
"15"
)
: cachedChartTfFilter,
isPatternOverlayEnabled:()=>
true,
wireFlagUi:
(
root,
symbol
)=>
wireWidgetFlagUi(
root,
()=>
symbol,
()=>{
refreshAllWidgetFlags();
refreshZoomFavoriteUi(
symbol
);
}
),
updateFlagUi:
updateWidgetFlagUi,
flagWrapHtml:
getWidgetFlagHtml()
}
);

}

bindWidgetFlagGlobalListeners(
refreshAllWidgetFlags
);

function destroy(){

destroyWidgets();
unmountZoom?.();
unmountZoom =
null;
cachedRows =
[];

}

mountZoom();

return {
renderPage,
destroy,
setLayout,
restoreLayoutState,
getLayout:()=>
layout,
getPage:()=>
currentPage,
goToPage(
page,
rowCount =
cachedRows.length
){

const total =
totalPages(
rowCount
);
const next =
Math.max(
1,
Math.min(
total,
page
)
);

if(
next ===
currentPage
){
return;
}

currentPage =
next;
onPersist?.({
layout,
page:
currentPage
});
void renderPage(
cachedRows,
cachedChartTfFilter
);

},
syncLayoutLabel:(
labelEl
)=>{

if(
labelEl
){
labelEl.textContent =
String(
layout
);
}

},
syncLayoutMenu:(
menuEl
)=>{

menuEl?.querySelectorAll?.(
"button[data-layout]"
)?.forEach(
btn=>{
btn.classList.toggle(
"active",
Number(
btn.dataset.layout
) ===
layout
);
}
);

}
};

}
