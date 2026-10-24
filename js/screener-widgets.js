import {
loadMarketHistory,
getActiveExchangeId
} from "./market-api.js?v=145e2e28";

import {
peekHistoryCache,
putHistoryCache,
mergeCandleRows,
logicalIndexShift
} from "./market-history-cache.js?v=dedca4e1";

import {
createScreenerChart,
createRSIChart,
applyChartPriceFormat,
applyScreenerZoom,
restoreScreenerViewport,
linkPairedChartTimeScales,
syncLinkedChartTimescales,
equalizeLinkedPanePriceScales,
SCREENER_PAGE_VISIBLE_BARS,
SCREENER_PAGE_MAX_BARS,
SCREENER_PAGE_HISTORY_REQUESTS
} from "./chart-import.js?v=613e412b";

import {
isIpadWebViewport
} from "./ipad-web-viewport.js?v=68cc93ec";

import {
subscribeKline,
bindLiveCandleCatchup
} from "./market-ws.js?v=d0679bf8";

import {
ensureOhlcRollover,
ingestLiveOhlcKline,
lastOhlcBar,
liveBarPeriodSec,
paintCatchupLiveSeries,
paintLiveOhlcSeries
} from "./chart/live-bar-roll.js?v=6ff2b718";

import {
SCREENER_WIDGET_OSCILLATOR_AO,
SCREENER_WIDGET_OSCILLATOR_MACD,
createScreenerAoChart,
createScreenerMacdChart,
isScreenerHistogramOscillator
} from "./screener-widget-oscillator.js?v=6510734e";

let deps = null;

export function bindScreenerWidgets(next){
deps = next;
}

function paintScreenerWidgetLive(
widget,
{
isNewBar,
kind,
shifted
} = {}
){

const {
chart,
series,
chartEl
} =
widget;
const last =
lastOhlcBar(
widget.candles
);

paintLiveOhlcSeries(
series,
widget.candles,
{
kind,
shifted
}
);

if(
last
){
applyChartPriceFormat(
series,
last.close
);
}

if(
widget.rsiSeries &&
(
isNewBar ||
kind ===
"hist" ||
isScreenerHistogramOscillator(
widget.oscKind
)
)
){
deps.updateWidgetRsiData(
widget
);
}

if(
!widget.userAdjustedZoom &&
isNewBar
){

const total =
widget.candles.length;
const visible =
Math.min(
SCREENER_PAGE_VISIBLE_BARS,
total
);

restoreScreenerViewport(
chart,
chartEl.clientWidth,
visible,
total
);

}

}

export function destroyWidgets(){

deps.activeWidgets.forEach(w=>{

w.disposed =
true;

unobserveWidgetKlineVisibility(
w
);

w.unsubKline?.();

try{
w.unlinkTimeScales?.();
}catch{
/* ignore */
}

w.unlinkTimeScales =
null;

if(w.resizeObserver){
w.resizeObserver.disconnect();
}

if(w.chart){

try{
w.chart.remove();
}catch{
/* ignore */
}

}

if(w.rsiChart){

try{
w.rsiChart.remove();
}catch{
/* ignore */
}

}

w.root?.remove();

});

deps.activeWidgets = [];
deps.gridEl.innerHTML = "";

}

export function updateWidgetMeta(symbol, root){

const tick =
deps.tickerMap.get(symbol);

const volEl =
root.querySelector(".screener-volume");

const chEl =
root.querySelector(".screener-change");

if(!tick){
return;
}

if(volEl){
const valueEl =
volEl.querySelector(
".screener-volume-value"
);
const compact =
deps.formatVolume(
tick.volume24
);

if(
valueEl
){
valueEl.textContent =
compact;
}else{
volEl.innerHTML =
`Объём 24ч <span class="screener-volume-value">${compact}</span>`;
}
}

if(chEl){

const ch =
tick.change24 ?? 0;

chEl.textContent =
`${ch >= 0 ? "+" : ""}${ch.toFixed(2)}%`;

chEl.className =
`screener-change ${ch >= 0 ? "positive" : "negative"}`;

}

}

function openTerminal(symbol, e){

if(e){
e.stopPropagation();
}

window.location.href =
`terminal.html?symbol=${encodeURIComponent(symbol)}&tf=${encodeURIComponent(deps.currentTF)}`;

}

const SCREENER_KLINE_VISIBILITY_MARGIN =
"200px 0px";

let screenerKlineVisibilityObserver =
null;

function ensureScreenerKlineVisibilityObserver(){

if(
screenerKlineVisibilityObserver ||
typeof IntersectionObserver ===
"undefined"
){
return;
}

screenerKlineVisibilityObserver =
new IntersectionObserver(
entries=>{

entries.forEach(
entry=>{

const widget =
deps.activeWidgets.find(
w=>
w.root ===
entry.target
);

if(
!widget
){
return;
}

if(
entry.isIntersecting ||
isScreenerWidgetInView(
widget.root
)
){
resumeWidgetSurface(
widget
);
}else{
parkWidgetSurface(
widget
);
}

}
);

},
{
rootMargin:
SCREENER_KLINE_VISIBILITY_MARGIN,
threshold:
0.01
}
);

}

export function observeWidgetKlineVisibility(
widget
){

ensureScreenerKlineVisibilityObserver();
screenerKlineVisibilityObserver?.observe(
widget.root
);

}

function unobserveWidgetKlineVisibility(
widget
){

screenerKlineVisibilityObserver?.unobserve(
widget.root
);

}

function parkWidgetSurface(
widget
){

if(
!widget ||
widget.disposed ||
widget.chartParked
){
return;
}

widget.unsubKline?.();
widget.unsubKline =
null;

try{
widget.unlinkTimeScales?.();
}catch{
/* ignore */
}

widget.unlinkTimeScales =
null;

try{
widget.chart?.remove();
}catch{
/* ignore */
}

try{
widget.rsiChart?.remove();
}catch{
/* ignore */
}

widget.chart =
null;
widget.series =
null;
widget.rsiChart =
null;
widget.rsiSeries =
null;
widget.macdHistSeries =
null;
widget.macdSignalSeries =
null;
widget.chartParked =
true;
widget._rsiPlaced =
false;
widget._lastRsiSizeKey =
"";
widget._lastChartSizeKey =
"";
widget._lastZoomCandleLen =
0;

}

function resumeWidgetSurface(
widget
){

if(
!widget ||
widget.disposed ||
!deps.isScreenerWidgetCurrent(
widget
)
){
return;
}

if(
widget.chartParked ||
!widget.chart
){
widget.mountCharts?.();
widget.chartParked =
false;
widget._rsiPlaced =
false;
widget._lastRsiSizeKey =
"";
widget._lastChartSizeKey =
"";
widget._lastZoomCandleLen =
0;

if(
widget.candles?.length
){
widget.syncChartSize?.();
}

widget.chartEl?.classList.remove(
"loading"
);
widget.rsiWrapEl?.classList.remove(
"screener-rsi-pending"
);
widget.root?.classList.remove(
"screener-osc-settling"
);
}

if(
widget.candles?.length &&
!widget.unsubKline
){
attachWidgetKlineStream(
widget
);
}

}

export function listInViewWidgetSymbols(){

return deps.activeWidgets
.filter(
widget=>
widget?.root &&
!widget.disposed &&
isScreenerWidgetInView(
widget.root
)
)
.map(
widget=>
widget.symbol
);

}

function isScreenerWidgetInView(
root
){

if(
typeof IntersectionObserver ===
"undefined"
){
return true;
}

const rect =
root.getBoundingClientRect();
const margin =
200;

return (
rect.bottom >=
-margin &&
rect.top <=
window.innerHeight +
margin
);

}

function attachWidgetKlineStream(
widget
){

if(
!deps.isScreenerWidgetCurrent(
widget
)
){
return;
}

const {
symbol
} =
widget;

if(
!widget.candles.length
){
return;
}

widget.unsubKline?.();

if(
!isScreenerWidgetInView(
widget.root
)
){
widget.unsubKline =
null;
return;
}

const unsub =
subscribeKline(
symbol,
deps.currentTF,
candle=>{

if(
!deps.isScreenerWidgetCurrent(
widget
)
){
return;
}

try{

const maxLen =
widget.userAdjustedZoom
? 0
: SCREENER_PAGE_MAX_BARS;
const {
rolled,
kind,
shifted
} =
ingestLiveOhlcKline(
widget.candles,
candle,
liveBarPeriodSec(
deps.currentTF
),
maxLen
);

if(
!kind &&
!rolled
){
return;
}

const isNewBar =
kind ===
"new" ||
rolled;

paintScreenerWidgetLive(
widget,
{
isNewBar,
kind,
shifted
}
);

}catch{
/* chart disposed during page change */
}

}
);
const timer =
setInterval(
()=>{

if(
!deps.isScreenerWidgetCurrent(
widget
) ||
!widget.candles.length
){
return;
}

if(
!ensureOhlcRollover(
widget.candles,
liveBarPeriodSec(
deps.currentTF
)
)
){
return;
}

try{
paintScreenerWidgetLive(
widget,
{
isNewBar:
true,
kind:
"new"
}
);
}catch{
/* chart disposed during page change */
}

},
1000
);

const unbindCatchup =
bindLiveCandleCatchup({
getSymbol:
()=>
widget.symbol,
getTf:
()=>
deps.currentTF,
getCandles:
()=>
widget.candles,
maxLen:
widget.userAdjustedZoom
? 0
: SCREENER_PAGE_MAX_BARS,
isAlive:
()=>
deps.isScreenerWidgetCurrent(
widget
),
paint:
(rows, info)=>{
paintCatchupLiveSeries(
widget.series,
rows,
widget.chart,
info?.appended,
info?.prevLen
);
paintScreenerWidgetLive(
widget,
{
isNewBar:
false,
kind:
"hist"
}
);
}
});

widget.unsubKline =
()=>{
unbindCatchup?.();
unsub?.();
clearInterval(
timer
);
};

}

async function refreshScreenerWidgetTail(
widget
){

if(
!widget?.candles?.length ||
!deps.isScreenerWidgetCurrent(
widget
)
){
return;
}

let latest;

try{
latest =
await loadMarketHistory(
widget.symbol,
deps.currentTF,
1,
{ parallel: true }
);
}catch{
return;
}

if(
widget.loadId !==
deps.renderToken ||
!deps.isScreenerWidgetCurrent(
widget
) ||
!latest?.length
){
return;
}

const previous =
widget.candles;
const merged =
mergeCandleRows(
previous,
latest,
{
preferIncoming:
true,
limit:
SCREENER_PAGE_MAX_BARS
}
);
const shift =
logicalIndexShift(
previous,
merged
);
if(
!widget.chart
){
widget.candles =
merged;
return;
}

const range =
widget.userAdjustedZoom
? widget.chart.timeScale().getVisibleLogicalRange()
: null;

widget.candles =
merged;
widget._lastZoomCandleLen =
0;

try{
deps.updateWidgetRsiData(
widget
);
}catch{
return;
}

if(
widget.userAdjustedZoom &&
range &&
shift
){
widget.chart.timeScale().setVisibleLogicalRange(
{
from:
range.from +
shift,
to:
range.to +
shift
}
);
}else if(
!widget.userAdjustedZoom
){
widget.syncChartSize?.();
}

putHistoryCache(
getActiveExchangeId(),
widget.symbol,
deps.currentTF,
merged,
{
coversVisible:
merged.length >=
SCREENER_PAGE_VISIBLE_BARS ||
merged.length <
500
}
);

}

export async function loadWidgetChart(widget){

const {
symbol,
chartEl,
loadId
} = widget;

chartEl.classList.add("loading");

try{

const cached =
peekHistoryCache(
getActiveExchangeId(),
symbol,
deps.currentTF
);
let fromCache =
false;
let candles;

if(
cached &&
(
cached.candles.length >=
SCREENER_PAGE_VISIBLE_BARS ||
cached.candles.length <
500
)
){
candles =
cached.candles.slice(
-SCREENER_PAGE_MAX_BARS
);
fromCache =
true;
}else{
candles =
await loadMarketHistory(
symbol,
deps.currentTF,
SCREENER_PAGE_HISTORY_REQUESTS,
{ parallel: true }
);
}

if(loadId !== deps.renderToken){
return;
}

if(
candles.length
){
putHistoryCache(
getActiveExchangeId(),
symbol,
deps.currentTF,
candles,
{
coversVisible:
candles.length >=
SCREENER_PAGE_VISIBLE_BARS ||
candles.length <
500
}
);
}

if(!candles.length){

if(loadId === deps.renderToken){
deps.setStatus(
`График ${deps.activeExchangeName()} не загрузился — «Повторить» внизу экрана`,
true
);
}

return;

}

const loaded =
candles.length > SCREENER_PAGE_MAX_BARS
? candles.slice(-SCREENER_PAGE_MAX_BARS)
: candles;

widget.candles = loaded;
widget.userAdjustedZoom = false;

if(
!deps.isScreenerWidgetCurrent(
widget
)
){
return;
}

if(
!widget.chart ||
!widget.series
){
chartEl.classList.remove(
"loading"
);
return;
}

try{

applyChartPriceFormat(
widget.series,
loaded[loaded.length - 1].close
);

}catch{
chartEl.classList.remove(
"loading"
);
widget.rsiWrapEl?.classList.remove(
"screener-rsi-pending"
);
widget.root?.classList.remove(
"screener-osc-settling"
);
return;
}

widget._lastZoomCandleLen =
0;
widget._stableScaleW =
0;
widget._rsiPlaced =
false;

const runZoom =
()=>{

if(
!deps.isScreenerWidgetCurrent(
widget
)
){
return;
}

try{
widget.syncChartSize?.();
}catch{
/* chart disposed during page change */
}

};

function revealWidgetCharts(){

if(
loadId !==
deps.renderToken
){
return;
}

chartEl.classList.remove(
"loading"
);
widget.rsiWrapEl?.classList.remove(
"screener-rsi-pending"
);
widget.root?.classList.remove(
"screener-osc-settling"
);

}

if(
!widget.rsiWrapEl
){

runZoom();
requestAnimationFrame(
()=>{
widget._lastZoomCandleLen =
0;
runZoom();
requestAnimationFrame(
()=>{
requestAnimationFrame(
revealWidgetCharts
);
}
);
}
);

}else{

/*
  RSI остаётся скрытым, пока ширина правой шкалы
  не совпадёт со свечами. Иначе первый кадр рисует
  линию в старом месте и она подскакивает.
*/
let settleTries =
0;

function settleWidgetRsi(){

if(
loadId !==
deps.renderToken ||
!deps.isScreenerWidgetCurrent(
widget
)
){
return;
}

runZoom();

if(
!widget._rsiPlaced &&
widget.candles.length &&
widget._lastZoomCandleLen
){

try{
deps.updateWidgetRsiData(
widget
);
widget._rsiPlaced =
true;
}catch{
revealWidgetCharts();
return;
}

runZoom();

}

let scaleW =
0;

try{
scaleW =
widget.chart.priceScale(
"right"
).width() ||
0;
}catch{
scaleW =
0;
}

settleTries +=
1;

const stable =
widget._stableScaleW >
0 &&
scaleW >
0 &&
Math.abs(
scaleW -
widget._stableScaleW
) <=
1 &&
widget._rsiPlaced;

widget._stableScaleW =
scaleW;

if(
stable ||
settleTries >=
5
){
widget._lastZoomCandleLen =
0;
runZoom();
requestAnimationFrame(
()=>{
requestAnimationFrame(
revealWidgetCharts
);
}
);
return;
}

requestAnimationFrame(
settleWidgetRsi
);

}

settleWidgetRsi();

}

attachWidgetKlineStream(
widget
);

if(
fromCache
){
void refreshScreenerWidgetTail(
widget
);
}

}catch(err){

console.error("Screener chart:", symbol, err);
chartEl.classList.remove(
"loading"
);
widget.rsiWrapEl?.classList.remove(
"screener-rsi-pending"
);
widget.root?.classList.remove(
"screener-osc-settling"
);

}finally{

if(
loadId ===
deps.renderToken &&
!widget.candles.length
){
chartEl.classList.remove(
"loading"
);
widget.rsiWrapEl?.classList.remove(
"screener-rsi-pending"
);
widget.root?.classList.remove(
"screener-osc-settling"
);
}

}

}

export function createWidget(symbol, loadId){

const showOscillator =
deps.screenerWidgetShowsOscillator();
const oscKind =
deps.screenerWidgetOscillatorKind();
const showMacd =
showOscillator &&
oscKind ===
SCREENER_WIDGET_OSCILLATOR_MACD;
const showAo =
showOscillator &&
oscKind ===
SCREENER_WIDGET_OSCILLATOR_AO;

const root =
document.createElement("article");

root.className =
showAo
? "screener-widget has-ao screener-osc-settling"
: showMacd
? "screener-widget has-macd screener-osc-settling"
: showOscillator
? "screener-widget has-rsi screener-osc-settling"
: "screener-widget screener-osc-settling";
root.dataset.symbol = symbol;

root.innerHTML = `

<div class="screener-widget-header">

<div class="screener-header-left">

${deps.SCREENER_FLAG_WRAP_HTML}

<div class="screener-symbol">${deps.escapeHtml(symbol)}</div>

</div>

<div class="screener-header-right">

<div class="screener-meta">

<span class="screener-change">—</span>

<span class="screener-volume">Объём 24ч <span class="screener-volume-value">—</span></span>

</div>

<button class="screener-open" type="button" title="Открыть в Монетах">↗</button>

</div>

</div>

${deps.buildWidgetBodyHtml(showOscillator, oscKind)}

`;

deps.wireScreenerFlagWrap(
root,
symbol
);

if(
isIpadWebViewport()
){

root.classList.add(
"screener-widget--ipad-web"
);

const expandBtn =
document.createElement(
"button"
);

expandBtn.type =
"button";
expandBtn.className =
"screener-widget-expand";
expandBtn.title =
"Увеличить график";
expandBtn.setAttribute(
"aria-label",
"Увеличить график"
);
expandBtn.textContent =
"увеличить";

root.querySelector(
".screener-header-left"
)?.after(
expandBtn
);

}

root.querySelector(".screener-open").onclick = e=>{
openTerminal(symbol, e);
};

const chartEl =
root.querySelector(".screener-chart");

const widget = {
symbol,
root,
chart: null,
series: null,
chartEl,
loadId,
disposed:
false,
chartParked:
false,
unlinkTimeScales:
null,
candles: [],
userAdjustedZoom:false,
oscKind:
showOscillator
? oscKind
: null,
rsiChart:null,
rsiSeries:null,
rsiChartEl:null,
rsiWrapEl:null,
macdHistSeries:null,
macdSignalSeries:null,
mountCharts: null,
syncChartSize: null
};

function mountWidgetCharts(){

if(
widget.disposed ||
widget.chart
){
return;
}

const {
chart,
series
} =
createScreenerChart(chartEl);

widget.chart =
chart;
widget.series =
series;

if(
showOscillator
){

const rsiWrapEl =
root.querySelector(
".screener-rsi-wrap"
);

const rsiChartEl =
root.querySelector(
".screener-rsi-chart"
);

widget.rsiWrapEl =
rsiWrapEl;
widget.rsiChartEl =
rsiChartEl;

if(
showMacd
){

const macdPair =
createScreenerMacdChart(
rsiChartEl
);

widget.rsiChart =
macdPair.chart;
widget.rsiSeries =
macdPair.macdSeries;
widget.macdHistSeries =
macdPair.histSeries;
widget.macdSignalSeries =
macdPair.signalSeries;

}else if(
showAo
){

const aoPair =
createScreenerAoChart(
rsiChartEl
);

widget.rsiChart =
aoPair.chart;
widget.rsiSeries =
aoPair.series;

}else{

const rsiPair =
createRSIChart(
rsiChartEl
);

widget.rsiChart =
rsiPair.chart;
widget.rsiSeries =
rsiPair.series;

}

chart.applyOptions({
timeScale:{
visible:false,
borderVisible:false
}
});

widget.rsiChart.applyOptions({
timeScale:{
visible:true,
timeVisible:true,
ticksVisible:true,
borderColor:"#1f2937",
borderVisible:true,
secondsVisible:false
},
rightPriceScale:{
borderVisible:false
}
});

widget.unlinkTimeScales =
linkPairedChartTimeScales(
chart,
widget.rsiChart,
()=>{

if(
deps.isScreenerWidgetCurrent(
widget
)
){
deps.layoutWidgetRsi(
widget
);
}

}
);

}

deps.applyWidgetInversion(
widget,
deps.invertCharts
);

}

widget.mountCharts =
mountWidgetCharts;
mountWidgetCharts();

function markUserZoom(){

widget.userAdjustedZoom = true;

}

chartEl.addEventListener("wheel", markUserZoom, { passive:true });
chartEl.addEventListener("mousedown", markUserZoom);
chartEl.addEventListener("touchstart", markUserZoom, { passive:true });

function alignWidgetPaneScales(widget){

if(!widget?.chart || !widget.rsiChart){
return;
}

equalizeLinkedPanePriceScales(
widget.chart,
[widget.rsiChart]
);

syncLinkedChartTimescales(
widget.chart,
widget.rsiChart
);

try{
const scaleW =
widget.chart.priceScale("right").width();

if(scaleW > 0){
widget.rsiWrapEl?.style.setProperty(
"--chart-scale-width",
`${scaleW}px`
);
}
}catch{
/* ignore */
}

}

function syncChartSize(){

const chart =
widget.chart;
const series =
widget.series;

if(
!chart ||
!series ||
!deps.isScreenerWidgetCurrent(
widget
)
){
return 0;
}

try{

const w =
chartEl.clientWidth;

const h =
chartEl.clientHeight;

if(w < 2 || h < 2){
return 0;
}

const sizeKey =
`${w}x${h}`;

const sizeUnchanged =
widget._lastChartSizeKey ===
sizeKey;

if(
!sizeUnchanged
){

widget._lastChartSizeKey =
sizeKey;

chart.applyOptions({ width: w, height: h });

}

if(
widget.rsiChart &&
widget.rsiChartEl
){

let scaleW =
56;

try{
scaleW =
chart.priceScale(
"right"
).width() ||
scaleW;
}catch{
/* ignore */
}

widget.rsiWrapEl?.style.setProperty(
"--chart-scale-width",
`${scaleW}px`
);

const rw =
widget.rsiChartEl.clientWidth;
const rh =
widget.rsiChartEl.clientHeight;

if(
rw >=
2 &&
rh >=
2
){

const rsiKey =
`${rw}x${rh}`;

if(
widget._lastRsiSizeKey !==
rsiKey
){
widget._lastRsiSizeKey =
rsiKey;
widget.rsiChart.applyOptions({
width: rw,
height: rh
});
}

deps.layoutWidgetRsi(
widget
);
}

}

if(
!widget._rsiPlaced &&
widget.candles.length &&
(
widget.rsiSeries ||
widget.macdHistSeries
)
){

try{
deps.updateWidgetRsiData(
widget
);
widget._rsiPlaced =
true;
}catch{
/* chart disposed during page change */
}

}

alignWidgetPaneScales(widget);

if(!widget.candles.length){
return 0;
}

if(widget.userAdjustedZoom){

const range =
chart.timeScale().getVisibleLogicalRange();

if(!range){
return 0;
}

const bars =
Math.max(
0,
Math.round(range.to - range.from)
);
widget._lastVisibleBars =
bars;
return bars;

}

if(
sizeUnchanged &&
widget._lastZoomCandleLen ===
widget.candles.length
){
return widget._lastVisibleBars ||
0;
}

const bars =
applyScreenerZoom(
chart,
series,
widget.candles,
w,
h,
{
visibleBars:
SCREENER_PAGE_VISIBLE_BARS,
shouldContinue:()=>
deps.isScreenerWidgetCurrent(
widget
)
}
);

widget._lastZoomCandleLen =
widget.candles.length;
widget._lastVisibleBars =
bars;
alignWidgetPaneScales(widget);
return bars;

}catch{
return 0;
}

}

const resizeTarget =
root.querySelector(
".screener-widget-body"
) ||
chartEl;

let screenerResizeRaf =
0;

function scheduleSyncChartSize(){

if(
screenerResizeRaf
){
cancelAnimationFrame(
screenerResizeRaf
);
}

screenerResizeRaf =
requestAnimationFrame(
()=>{
screenerResizeRaf =
0;
syncChartSize();
}
);

}

const resizeObserver =
new ResizeObserver(
scheduleSyncChartSize
);

resizeObserver.observe(resizeTarget);
widget.resizeObserver = resizeObserver;
widget.syncChartSize = syncChartSize;

requestAnimationFrame(syncChartSize);

updateWidgetMeta(symbol, root);

root.querySelector(
".screener-widget-expand"
)?.addEventListener(
"click",
event=>{
event.preventDefault();
event.stopPropagation();
void deps.openScreenerZoomFromWidget(
widget
);
}
);

return widget;

}
