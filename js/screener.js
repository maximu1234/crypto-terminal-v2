import {
symbolListSignature
} from "./api.js?v=32";

import {
loadMarketHistory,
loadMarketSymbols,
peekMarketSymbolsCache,
getActiveExchangeDefinition,
getActiveExchangeId,
EXCHANGE_CHANGED_EVENT
} from "./market-api.js?v=6";

import {
isScreenerWidgetCurrent as isScreenerWidgetCurrentGuard
} from "./screener-widget-guard.js?v=1";

import {
createScreenerChart,
createRSIChart,
applyChartPriceFormat,
applyScreenerZoom,
restoreScreenerViewport,
updateRsiBandLayout,
updateRsiLevelLinesLayout,
linkPairedChartTimeScales,
SCREENER_VISIBLE_BARS,
SCREENER_MAX_BARS
} from "./chart-import.js?v=48";

import {
isIpadWebViewport
} from "./ipad-web-viewport.js?v=2";

import {
calculateRSI,
alignRsiWithCandleTimes
} from "./indicators.js?v=3";

import {
subscribeKline
} from "./market-ws.js?v=1";

import {
connectTickerStream,
fetchTickersInto
} from "./tickers.js?v=27";

import {
createTickerUiBatcher
} from "./ticker-update-batch.js?v=1";

import {
mountReleaseMarker
} from "./release-marker.js?v=93";

import {
saveScreenerState,
loadScreenerState
} from "./storage.js?v=13";

import {
loadFavoritesGroups,
saveFavoritesGroups,
getFavoriteGroup,
setFavoriteGroup,
canSetBlueFlag,
FAVORITES_BY_EXCHANGE_KEY
} from "./favorites.js?v=5";

import {
ensureCloudReady
} from "./auth-ui.js?v=58";

import {
ensureSettled,
withTimeout
} from "./async-timeout.js?v=2";

import {
persistFavoritesToCloud,
onFavoritesRemoteUpdate
} from "./cloud-sync.js?v=66";

import {
attachSymbolAutocomplete,
preloadTradingSymbols
} from "./symbol-autocomplete.js?v=3";

import {
mountQwertyKeyInput
} from "./qwerty-key-input.js?v=1";

import {
mapWithConcurrency
} from "./load-concurrency.js?v=2";

import {
perfMark,
perfMeasure
} from "./perf-marks.js?v=2";

import {
SCREENER_WIDGET_OSCILLATOR_CHANGED,
SCREENER_WIDGET_OSCILLATOR_MACD,
createScreenerMacdChart,
getScreenerWidgetOscillator,
setScreenerMacdData
} from "./screener-widget-oscillator.js?v=1";

const SCREENER_MAX_CONCURRENT_CHART_LOADS =
4;

let refreshZoomFavoriteUi =
()=>{};
let syncWidgetZoomInversion =
()=>{};
let openScreenerWidgetZoomApi =
null;
let screenerZoomMountPromise =
null;
let screenerZoomMountOpts =
null;

/**
 * Lazy-load zoom module on first need (init / contextmenu / iPad expand).
 * @param {Parameters<typeof import("./screener-widget-zoom.js").mountScreenerWidgetZoom>[0]} opts
 */
async function mountScreenerWidgetZoomLazy(
opts
){

screenerZoomMountOpts =
opts;

if(
!screenerZoomMountPromise
){
screenerZoomMountPromise =
import(
"./screener-widget-zoom.js?v=28"
).then(
mod=>{
refreshZoomFavoriteUi =
mod.refreshZoomFavoriteUi;
syncWidgetZoomInversion =
mod.syncWidgetZoomInversion;
openScreenerWidgetZoomApi =
mod.openScreenerWidgetZoom;
return mod.mountScreenerWidgetZoom(
opts
);
}
);
}else{
await screenerZoomMountPromise;
}

return screenerZoomMountPromise;

}

async function openScreenerZoomFromWidget(
widget
){

if(
!widget
){
return;
}

await mountScreenerWidgetZoomLazy(
screenerZoomMountOpts
);

await openScreenerWidgetZoomApi?.(
widget
);

}

const gridEl =
document.getElementById("screener-grid");

const paginationEl =
document.getElementById("pagination");

const statusEl =
document.getElementById("screener-status");

const SORT_LABELS = {
change24: "24ч %",
volume24: "Объём 24ч",
symbol: "А–Я"
};

function normalizeSortMode(
value
){

if(
value ===
"symbol" ||
value ===
"volume24"
){
return value;
}

return "change24";

}

const LAYOUT_LABELS = {
4: "4",
6: "6",
9: "9"
};

const SCREENER_TF_HOTKEYS =
Object.freeze({

"1":
"1",
"2":
"5",
"3":
"15",
"4":
"60",
"5":
"240",
"6":
"D",
"7":
"W"

});

const SCREENER_LAYOUT_HOTKEYS =
Object.freeze({

Digit1:
4,
Digit2:
6,
Digit3:
9

});

const SCREENER_TF_VALUES =
new Set([
"1",
"5",
"15",
"60",
"240",
"D",
"W"
]);

const TF_LABELS = {
"1": "1m",
"5": "5m",
"15": "15m",
"60": "1h",
"240": "4h",
"D": "1D",
"W": "W"
};

let favorites =
loadFavoritesGroups();

function activeExchangeName(){

return getActiveExchangeDefinition().name;

}

function applyMarketSymbolsUpdated(
symbols
){

if(
!Array.isArray(symbols) ||
!symbols.length
){
return;
}

const nextSymbols =
mapSymbolList(symbols);

if(
symbolListSignature(nextSymbols) ===
symbolListSignature(allSymbols) &&
activeWidgets.length > 0
){
allSymbols = nextSymbols;
return;
}

allSymbols = nextSymbols;

void renderPage();

}

function screenerGridClass(){

return `grid-${layout}`;

}

function isFavoriteSymbol(symbol){

return !!getFavoriteGroup(symbol, favorites);

}

function updateWidgetFavoriteUi(
root,
symbol
){

const group =
getFavoriteGroup(symbol, favorites);

const btn =
root?.querySelector(
"[data-screener-flag-trigger]"
);

if(!btn){
return;
}

btn.className = "flag screener-flag-btn";

if(group){
btn.classList.add(
"favorite",
`flag--${group}`
);
}

btn.title =
group
? "Снять флаг"
: "Выбрать флаг";

btn.setAttribute(
"aria-pressed",
group ? "true" : "false"
);

const blueBtn =
root?.querySelector(
'[data-flag-group="blue"]'
);

if(
blueBtn
){

const full =
!canSetBlueFlag(
symbol,
favorites
);

blueBtn.disabled =
full;
blueBtn.classList.toggle(
"flag-pick--disabled",
full
);
blueBtn.title =
full
? "Максимум 9 монет в Терминале"
: "Синий (Терминал)";

}

}

function closeAllScreenerFlagMenus(
exceptWrap = null
){

document.querySelectorAll(".screener-flag-wrap").forEach(wrap=>{

if(wrap === exceptWrap){
return;
}

wrap.querySelector(".screener-flag-menu")?.classList.add("hidden");

});

}

function applyFavoriteGroup(
symbol,
group
){

if(!symbol){
return;
}

const before =
JSON.stringify(
favorites
);

if(
group === "clear" ||
group === null
){
favorites =
setFavoriteGroup(symbol, null, favorites);
}else{
favorites =
setFavoriteGroup(symbol, group, favorites);
}

if(
JSON.stringify(
favorites
) ===
before
){
return;
}

saveFavoritesGroups(
favorites
);
persistFavoritesToCloud(
favorites
);
syncFavoriteFlagsForSymbol(symbol);

}

function syncFavoriteFlagsForSymbol(symbol){

activeWidgets.forEach(widget=>{

if(widget.symbol === symbol){
updateWidgetFavoriteUi(
widget.root,
symbol
);
}

});

refreshZoomFavoriteUi(
symbol
);

}

const SCREENER_FLAG_WRAP_HTML =
`
<div class="screener-flag-wrap">
<button type="button" class="flag screener-flag-btn" data-screener-flag-trigger title="Выбрать флаг" aria-haspopup="true" aria-expanded="false" aria-pressed="false"></button>
<div class="screener-flag-menu hidden" role="menu">
<button type="button" class="flag screener-flag-pick flag--red" data-flag-group="red" title="Красный" role="menuitem"></button>
<button type="button" class="flag screener-flag-pick flag--green" data-flag-group="green" title="Зелёный" role="menuitem"></button>
<button type="button" class="flag screener-flag-pick flag--gray" data-flag-group="gray" title="Серый" role="menuitem"></button>
<button type="button" class="flag screener-flag-pick flag--blue" data-flag-group="blue" title="Синий (Терминал)" role="menuitem"></button>
</div>
</div>
`;

export function wireScreenerFlagWrap(
root,
symbol
){

const flagWrap =
root?.querySelector(
".screener-flag-wrap"
);

if(
!flagWrap
){
return;
}

const flagTrigger =
flagWrap.querySelector(
"[data-screener-flag-trigger]"
);

const flagMenu =
flagWrap.querySelector(
".screener-flag-menu"
);

flagTrigger?.addEventListener(
"click",
e=>{

e.stopPropagation();

if(
flagTrigger.classList.contains(
"favorite"
)
){
closeAllScreenerFlagMenus(
flagWrap
);
flagMenu?.classList.add(
"hidden"
);
flagTrigger.setAttribute(
"aria-expanded",
"false"
);
applyFavoriteGroup(
symbol,
"clear"
);
return;
}

const open =
!flagMenu?.classList.contains(
"hidden"
);

closeAllScreenerFlagMenus(
flagWrap
);

if(
open
){
flagMenu?.classList.add(
"hidden"
);
flagTrigger.setAttribute(
"aria-expanded",
"false"
);
}else{
flagMenu?.classList.remove(
"hidden"
);
flagTrigger.setAttribute(
"aria-expanded",
"true"
);
}

}
);

flagMenu?.querySelectorAll(
"[data-flag-group]"
).forEach(
btn=>{

btn.addEventListener(
"click",
e=>{

e.stopPropagation();

applyFavoriteGroup(
symbol,
btn.dataset.flagGroup
);

flagMenu?.classList.add(
"hidden"
);
flagTrigger?.setAttribute(
"aria-expanded",
"false"
);

}
);

}
);

updateWidgetFavoriteUi(
root,
symbol
);

}


const saved =
loadScreenerState();

let layout =
Number(saved.layout) || 9;

let sortMode =
normalizeSortMode(
saved.sort
);

let currentTF =
saved.tf || "15";

let currentPage =
Number(saved.page) || 1;

let invertCharts =
saved.invertCharts === true;

let allSymbols = [];
let screenerMarketLoadFailed = false;
const tickerMap = new Map();
let activeWidgets = [];
let renderToken = 0;
let highlightDismissListener = null;

function persistState(){

saveScreenerState({
layout,
sort:sortMode,
tf:currentTF,
page:currentPage,
invertCharts
});

}

function applyChartInvertScale(
chart,
inverted
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
invertScale:
!!inverted
});
}catch{
/* ignore */
}

}

function applyWidgetInversion(
widget,
inverted
){

if(
!widget
){
return;
}

applyChartInvertScale(
widget.chart,
inverted
);
applyChartInvertScale(
widget.rsiChart,
inverted
);

}

function applyAllWidgetsInversion(
inverted
){

activeWidgets.forEach(
widget=>{
applyWidgetInversion(
widget,
inverted
);
}
);

}

function syncInvertChartsCheckbox(){

const cb =
document.getElementById(
"screener-invert-charts"
);

if(
cb
){
cb.checked =
invertCharts;
}

}

function setInvertCharts(
next
){

invertCharts =
!!next;
syncInvertChartsCheckbox();
applyAllWidgetsInversion(
invertCharts
);
syncWidgetZoomInversion(
invertCharts
);
persistState();

}

function pageSize(){

return layout;

}

function screenerWidgetShowsOscillator(){

return (
layout ===
4 ||
layout ===
6
);

}

function screenerWidgetOscillatorKind(){

return getScreenerWidgetOscillator();

}

function isScreenerWidgetCurrent(
widget
){

return isScreenerWidgetCurrentGuard(
widget,
renderToken,
activeWidgets
);

}

function layoutWidgetRsi(
widget
){

if(
widget?.oscKind ===
SCREENER_WIDGET_OSCILLATOR_MACD ||
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
widget
){

if(
!isScreenerWidgetCurrent(
widget
) ||
!widget.candles?.length
){
return;
}

if(
widget.oscKind ===
SCREENER_WIDGET_OSCILLATOR_MACD
){

if(
!widget.macdHistSeries
){
return;
}

try{
setScreenerMacdData(
{
histSeries:
widget.macdHistSeries,
macdSeries:
widget.rsiSeries,
signalSeries:
widget.macdSignalSeries
},
widget.candles
);
}catch{
/* chart disposed during page change */
}

return;

}

if(
!widget?.rsiSeries
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
/* chart disposed during page change */
}

}

function buildWidgetBodyHtml(
showOscillator,
oscKind
){

if(
!showOscillator
){
return `<div class="screener-chart"></div>`;
}

if(
oscKind ===
SCREENER_WIDGET_OSCILLATOR_MACD
){
return `
<div class="screener-widget-body">
<div class="screener-chart"></div>
<div class="screener-rsi-wrap">
<div class="screener-rsi-chart"></div>
</div>
</div>`;
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

function getSortedSymbols(){

const list = [...allSymbols];

if(sortMode === "symbol"){

list.sort((a, b)=>a.localeCompare(b));

}else{

const field =
sortMode ===
"volume24"
? "volume24"
: "change24";

list.sort((a, b)=>{

const ca =
tickerMap.get(a)?.[field];
const cb =
tickerMap.get(b)?.[field];
const ha =
Number.isFinite(ca);
const hb =
Number.isFinite(cb);

if(
!ha &&
!hb
){
return a.localeCompare(b);
}

if(
!ha
){
return 1;
}

if(
!hb
){
return -1;
}

return cb - ca;

});

}

return list;

}

function totalPages(){

const size =
pageSize();

if(!allSymbols.length || !size){
return 1;
}

return Math.max(
1,
Math.ceil(allSymbols.length / size)
);

}

function clampPage(){

const max =
totalPages();

if(currentPage > max){
currentPage = max;
}

if(currentPage < 1){
currentPage = 1;
}

}

function symbolsForPage(){

clampPage();

const sorted =
getSortedSymbols();

const start =
(currentPage - 1) * pageSize();

return sorted.slice(
start,
start + pageSize()
);

}

function findPageForSymbol(
symbol
){

const normalized =
String(
symbol ||
""
).trim().toUpperCase();

if(
!normalized
){
return null;
}

const sorted =
getSortedSymbols();

const index =
sorted.indexOf(
normalized
);

if(
index <
0
){
return null;
}

return Math.floor(
index /
pageSize()
) +
1;

}

function clearWidgetHighlight(){

document.querySelectorAll(
".screener-widget-highlight"
).forEach(
el=>{
el.classList.remove(
"screener-widget-highlight"
);
}
);

if(
highlightDismissListener
){

document.removeEventListener(
"click",
highlightDismissListener,
true
);

highlightDismissListener =
null;

}

}

function highlightWidget(
symbol
){

clearWidgetHighlight();

const widget =
activeWidgets.find(
w=>
w.symbol ===
symbol
);

if(
!widget?.root
){
return;
}

widget.root.classList.add(
"screener-widget-highlight"
);

widget.root.scrollIntoView({
behavior:"smooth",
block:"nearest",
inline:"nearest"
});

highlightDismissListener =
()=>{
clearWidgetHighlight();
};

document.addEventListener(
"click",
highlightDismissListener,
true
);

}

function syncSymbolSearchInputs(
symbol
){

const value =
String(
symbol ||
""
).trim().toUpperCase();

document.querySelectorAll(
".screener-symbol-search"
).forEach(
input=>{
input.value =
value;
}
);

}

async function jumpToSymbol(
symbol
){

const normalized =
String(
symbol ||
""
).trim().toUpperCase();

if(
!normalized
){
return;
}

if(
!allSymbols.length
){

setStatus(
"Список монет ещё загружается…",
true
);

return;

}

if(
!allSymbols.includes(
normalized
)
){

setStatus(
`Монета ${normalized} не найдена`,
true
);

setTimeout(
()=>{
setStatus(
"",
false
);
},
2800
);

return;

}

const page =
findPageForSymbol(
normalized
);

if(
!page
){
return;
}

setStatus(
"",
false
);

syncSymbolSearchInputs(
normalized
);

if(
page !==
currentPage
){

currentPage =
page;
persistState();
await renderPage();

}else{

renderPagination();

}

requestAnimationFrame(
()=>{
requestAnimationFrame(
()=>{
highlightWidget(
normalized
);
}
);
}
);

}

function formatVolume(value){

if(!Number.isFinite(value) || value <= 0){
return "—";
}

if(value >= 1e9){
return `${Number((value / 1e9).toFixed(2))}B`;
}

if(value >= 1e6){
return `${Number((value / 1e6).toFixed(2))}M`;
}

if(value >= 1e3){
return `${Number((value / 1e3).toFixed(2))}K`;
}

return String(Math.round(value));

}

function setStatus(text, visible){

if(!statusEl){
return;
}

statusEl.textContent = text;

statusEl.classList.toggle(
"hidden",
!visible
);

}

function mergeLiveCandle(candles, candle, maxLen){

if(!candles.length){
return false;
}

const last =
candles[candles.length - 1];

if(candle.time === last.time){

candles[candles.length - 1] = candle;

return true;

}

if(candle.time > last.time){

candles.push(candle);

if(
maxLen &&
candles.length > maxLen
){
candles.shift();
}

return true;

}

return false;

}

function destroyWidgets(){

activeWidgets.forEach(w=>{

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

activeWidgets = [];
gridEl.innerHTML = "";

}

function updateWidgetMeta(symbol, root){

const tick =
tickerMap.get(symbol);

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
formatVolume(
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
`terminal.html?symbol=${encodeURIComponent(symbol)}&tf=${encodeURIComponent(currentTF)}`;

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
activeWidgets.find(
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
entry.isIntersecting
){

if(
widget.candles.length &&
!widget.unsubKline &&
isScreenerWidgetCurrent(
widget
)
){
attachWidgetKlineStream(
widget
);
}

}else{

widget.unsubKline?.();
widget.unsubKline =
null;

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

function observeWidgetKlineVisibility(
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
!isScreenerWidgetCurrent(
widget
)
){
return;
}

const {
symbol,
chart,
series,
chartEl,
loadId
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

widget.unsubKline =
subscribeKline(
symbol,
currentTF,
candle=>{

if(
!isScreenerWidgetCurrent(
widget
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
widget
);


}else{

series.update(
candle
);

if(
widget.rsiSeries &&
(
isNewBar ||
widget.oscKind ===
SCREENER_WIDGET_OSCILLATOR_MACD
)
){
updateWidgetRsiData(
widget
);
}

if(
isNewBar
){
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
chartEl.clientWidth,
visible,
total
);

}

}catch{
/* chart disposed during page change */
}

}
);

}

async function loadWidgetChart(widget){

const {
symbol,
chart,
series,
chartEl,
loadId
} = widget;

chartEl.classList.add("loading");

try{

const candles =
await loadMarketHistory(
symbol,
currentTF,
2,
{ parallel: true }
);

if(loadId !== renderToken){
return;
}

if(!candles.length){

if(loadId === renderToken){
setStatus(
`График ${activeExchangeName()} не загрузился — «Повторить» внизу экрана`,
true
);
}

return;

}

const loaded =
candles.length > SCREENER_MAX_BARS
? candles.slice(-SCREENER_MAX_BARS)
: candles;

widget.candles = loaded;
widget.userAdjustedZoom = false;

if(
!isScreenerWidgetCurrent(
widget
)
){
return;
}

try{

/* iPad/Safari: сетка иногда отдаёт 0×0 до первого layout — zoom ждёт размер,
   но свечи должны попасть в series сразу */
series.setData(
loaded
);

applyChartPriceFormat(
series,
loaded[loaded.length - 1].close
);

updateWidgetRsiData(
widget
);


}catch{
return;
}

const runZoom =
()=>{

if(
!isScreenerWidgetCurrent(
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

attachWidgetKlineStream(
widget
);

}catch(err){

console.error("Screener chart:", symbol, err);

}finally{

if(loadId === renderToken){
chartEl.classList.remove("loading");
}

}

}

function createWidget(symbol, loadId){

const showOscillator =
screenerWidgetShowsOscillator();
const oscKind =
screenerWidgetOscillatorKind();
const showMacd =
showOscillator &&
oscKind ===
SCREENER_WIDGET_OSCILLATOR_MACD;

const root =
document.createElement("article");

root.className =
showMacd
? "screener-widget has-macd"
: showOscillator
? "screener-widget has-rsi"
: "screener-widget";
root.dataset.symbol = symbol;

root.innerHTML = `

<div class="screener-widget-header">

<div class="screener-header-left">

${SCREENER_FLAG_WRAP_HTML}

<div class="screener-symbol">${symbol}</div>

</div>

<div class="screener-header-right">

<div class="screener-meta">

<span class="screener-change">—</span>

<span class="screener-volume">Объём 24ч <span class="screener-volume-value">—</span></span>

</div>

<button class="screener-open" type="button" title="Открыть в Монетах">↗</button>

</div>

</div>

${buildWidgetBodyHtml(showOscillator, oscKind)}

`;

wireScreenerFlagWrap(
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

const {
chart,
series
} =
createScreenerChart(chartEl);

const widget = {
symbol,
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
macdSignalSeries:null
};

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
isScreenerWidgetCurrent(
widget
)
){
layoutWidgetRsi(
widget
);
}

}
);

}

applyWidgetInversion(
widget,
invertCharts
);

function markUserZoom(){

widget.userAdjustedZoom = true;

}

chartEl.addEventListener("wheel", markUserZoom, { passive:true });
chartEl.addEventListener("mousedown", markUserZoom);
chartEl.addEventListener("touchstart", markUserZoom, { passive:true });

function syncChartSize(){

if(
!isScreenerWidgetCurrent(
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

chart.applyOptions({ width: w, height: h });

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
widget.rsiChart.applyOptions({
width: rw,
height: rh
});
layoutWidgetRsi(
widget
);
}

}

if(!widget.candles.length){
return 0;
}

if(widget.userAdjustedZoom){

const range =
chart.timeScale().getVisibleLogicalRange();

if(!range){
return 0;
}

return Math.max(
0,
Math.round(range.to - range.from)
);

}

return applyScreenerZoom(
chart,
series,
widget.candles,
w,
h,
{
shouldContinue:()=>
isScreenerWidgetCurrent(
widget
)
}
);

}catch{
return 0;
}

}

const resizeTarget =
root.querySelector(
".screener-widget-body"
) ||
chartEl;

const resizeObserver =
new ResizeObserver(syncChartSize);

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
void openScreenerZoomFromWidget(
widget
);
}
);

return widget;

}

function renderPagination(){

clampPage();

const total =
totalPages();

paginationEl.innerHTML = "";

const prev =
document.createElement("button");

prev.className = "page-btn page-nav-prev";
prev.setAttribute(
"aria-label",
"Предыдущая страница"
);
prev.textContent = "‹";
prev.disabled = currentPage <= 1;
prev.onclick = ()=>{
currentPage--;
persistState();
renderPage();
};

paginationEl.appendChild(prev);

const pagesWrap =
document.createElement("div");

pagesWrap.className = "pagination-pages";
pagesWrap.setAttribute(
"aria-label",
"Номера страниц"
);

paginationEl.appendChild(pagesWrap);

const maxButtons =
11;
const half =
Math.floor(maxButtons / 2);
let start = Math.max(1, currentPage - half);
let end = Math.min(total, start + maxButtons - 1);

start = Math.max(1, end - maxButtons + 1);

if(start > 1){

addPageButton(1);

if(start > 2){
addEllipsis();
}

}

for(let p = start; p <= end; p++){
addPageButton(p);
}

if(end < total){

if(end < total - 1){
addEllipsis();
}

addPageButton(total);

}

const next =
document.createElement("button");

next.className = "page-btn page-nav-next";
next.setAttribute(
"aria-label",
"Следующая страница"
);
next.textContent = "›";
next.disabled = currentPage >= total;
next.onclick = ()=>{
currentPage++;
persistState();
renderPage();
};

paginationEl.appendChild(next);

function addPageButton(page){

const btn =
document.createElement("button");

btn.className =
`page-btn${page === currentPage ? " active" : ""}`;

btn.textContent = String(page);

btn.onclick = ()=>{

if(page === currentPage){
return;
}

currentPage = page;
persistState();
renderPage();

};

pagesWrap.appendChild(btn);

}

function addEllipsis(){

const span =
document.createElement("span");

span.className = "page-ellipsis";
span.textContent = "…";
pagesWrap.appendChild(span);

}

}

async function renderPage(){

const loadId = ++renderToken;

gridEl.className =
screenerGridClass();

const symbols =
symbolsForPage();

renderPagination();

if(!symbols.length){

destroyWidgets();
gridEl.innerHTML = "";

if(
screenerMarketLoadFailed
){
setStatus(
`Список монет ${activeExchangeName()} не загрузился — «Повторить» внизу экрана`,
true
);
}else{
setStatus(
"Нет монет для отображения",
true
);
}

return;

}

setStatus(
`Загрузка графиков (${symbols.length})…`,
true
);

const nextWidgets =
symbols.map(symbol=>
createWidget(
symbol,
loadId
)
);

destroyWidgets();

const fragment =
document.createDocumentFragment();

nextWidgets.forEach(widget=>{
fragment.appendChild(widget.root);
updateWidgetMeta(
widget.symbol,
widget.root
);
updateWidgetFavoriteUi(
widget.root,
widget.symbol
);
});

gridEl.appendChild(fragment);
activeWidgets = nextWidgets;

activeWidgets.forEach(
widget=>{
observeWidgetKlineVisibility(
widget
);
}
);

const chartLoads =
mapWithConcurrency(
activeWidgets.map(
w=>
()=>
ensureSettled(
loadWidgetChart(
w
),
28000,
`chart ${w.symbol}`
)
),
SCREENER_MAX_CONCURRENT_CHART_LOADS
);

/* Status stays until the full concurrent grid settles. */
void Promise.all(
chartLoads
).then(
()=>{
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
);

}

function setLayout(next){

layout = next;

currentPage = 1;

syncHeaderControlLabels();

persistState();
renderPage();

}

function setSort(next){

sortMode =
normalizeSortMode(
next
);

currentPage = 1;

syncHeaderControlLabels();

persistState();
renderPage();

}

function setTf(next){

currentTF = next;

syncHeaderControlLabels();

persistState();
renderPage();

}

function closeScreenerPickers(){

document.querySelectorAll(
".screener-header-pick-menu"
).forEach(menu=>{
menu.classList.add("hidden");
});

document.querySelectorAll(
".screener-header-pick"
).forEach(btn=>{
btn.setAttribute(
"aria-expanded",
"false"
);
});

}


function syncDesktopControlLabels(){

const layoutLabel =
document.getElementById(
"screener-desktop-layout-label"
);

if(layoutLabel){
layoutLabel.textContent =
LAYOUT_LABELS[layout] ||
String(layout);
}

const sortLabel =
document.getElementById(
"screener-desktop-sort-label"
);

if(sortLabel){
sortLabel.textContent =
SORT_LABELS[sortMode] ||
"24ч %";
}

const tfLabel =
document.getElementById(
"screener-desktop-tf-label"
);

if(tfLabel){
tfLabel.textContent =
TF_LABELS[currentTF] ||
currentTF;
}

document.querySelectorAll(
"#screener-desktop-layout-menu .screener-header-pick-item"
).forEach(btn=>{
btn.classList.toggle(
"active",
Number(btn.dataset.layout) === layout
);
});

document.querySelectorAll(
"#screener-desktop-sort-menu .screener-header-pick-item"
).forEach(btn=>{
btn.classList.toggle(
"active",
btn.dataset.sort === sortMode
);
});

document.querySelectorAll(
"#screener-desktop-tf-menu .screener-header-pick-item"
).forEach(btn=>{
btn.classList.toggle(
"active",
btn.dataset.tf === currentTF
);
});

}

function syncHeaderControlLabels(){

syncDesktopControlLabels();
syncInvertChartsCheckbox();

}


function bindDesktopHeaderPicks(){

const picks = [
{
triggerId:"screener-desktop-layout-trigger",
menuId:"screener-desktop-layout-menu",
onSelect:btn=>{
setLayout(
Number(btn.dataset.layout)
);
}
},
{
triggerId:"screener-desktop-sort-trigger",
menuId:"screener-desktop-sort-menu",
onSelect:btn=>{
setSort(
btn.dataset.sort
);
}
},
{
triggerId:"screener-desktop-tf-trigger",
menuId:"screener-desktop-tf-menu",
onSelect:btn=>{
setTf(
btn.dataset.tf
);
}
}
];

picks.forEach(
({
triggerId,
menuId,
onSelect
})=>{

const trigger =
document.getElementById(
triggerId
);
const menu =
document.getElementById(
menuId
);

if(
!trigger ||
!menu
){
return;
}

trigger.addEventListener(
"click",
e=>{
e.stopPropagation();

const open =
!menu.classList.contains(
"hidden"
);

closeScreenerPickers();

if(open){
return;
}

menu.classList.remove(
"hidden"
);
trigger.setAttribute(
"aria-expanded",
"true"
);

}
);

menu.querySelectorAll(
"button"
).forEach(
btn=>{

btn.addEventListener(
"click",
e=>{
e.stopPropagation();
onSelect(
btn
);
closeScreenerPickers();
}
);

}
);

}
);

document.addEventListener(
"click",
e=>{

if(
e.target.closest(
".screener-header-pick-wrap"
)
){
return;
}

closeScreenerPickers();

},
true
);

}

function bindScreenerLayoutHotkeys(){

window.addEventListener(
"keydown",
e=>{

if(
e.defaultPrevented
){
return;
}

if(
e.metaKey ||
e.ctrlKey ||
e.altKey
){
return;
}

const tag =
e.target?.tagName;

if(
tag ===
"INPUT" ||
tag ===
"TEXTAREA" ||
tag ===
"SELECT" ||
e.target?.isContentEditable
){
return;
}

const key =
e.key;

if(
e.shiftKey
){

const layoutNext =
SCREENER_LAYOUT_HOTKEYS[
e.code
];

if(
layoutNext
){
e.preventDefault();
setLayout(
layoutNext
);
}

return;

}

const tf =
SCREENER_TF_HOTKEYS[
key
];

if(
tf &&
SCREENER_TF_VALUES.has(
tf
)
){
e.preventDefault();
setTf(
tf
);
}

}
);

}

function bindInvertChartsCheckbox(){

const cb =
document.getElementById(
"screener-invert-charts"
);

if(
!cb
){
return;
}

cb.checked =
invertCharts;

cb.addEventListener(
"change",
()=>{
setInvertCharts(
cb.checked
);
}
);

}

function bindControls(){

bindDesktopHeaderPicks();
bindSymbolSearch();
bindInvertChartsCheckbox();
bindScreenerLayoutHotkeys();

}

function bindSymbolSearch(){

void preloadTradingSymbols();

document.querySelectorAll(
".screener-symbol-search"
).forEach(
input=>{

mountQwertyKeyInput(
input
);

attachSymbolAutocomplete(
input,
{
onCommit:(
sym
)=>{
void jumpToSymbol(
sym
);
}
}
);

}
);

}

function shouldIgnoreScreenerKeyNav(e){

const target =
e.target;

if(!target){
return false;
}

const tag =
target.tagName?.toLowerCase();

if(
tag === "input" ||
tag === "textarea" ||
tag === "select"
){
return true;
}

if(target.isContentEditable){
return true;
}

return false;

}

function goToPage(page){

const max =
totalPages();

const next =
Math.max(1, Math.min(max, page));

if(next === currentPage){
return;
}

currentPage = next;
persistState();
renderPage();

}

document.addEventListener(
"keydown",
e=>{

if(shouldIgnoreScreenerKeyNav(e)){
return;
}

/*
  Option+I (Mac) и Alt+I (Windows/Linux) — в браузере оба дают altKey.
  Совпадает с хоткеем «Перевернуть график» на странице Терминал.
*/
if(
e.altKey &&
!e.ctrlKey &&
!e.metaKey &&
e.code ===
"KeyI"
){
e.preventDefault();
setInvertCharts(
!invertCharts
);
return;
}

if(e.code === "ArrowRight"){

e.preventDefault();
goToPage(currentPage + 1);

return;

}

if(e.code === "ArrowLeft"){

e.preventDefault();
goToPage(currentPage - 1);

return;

}

if(
e.code === "Space" &&
!e.shiftKey
){

e.preventDefault();
goToPage(currentPage + 1);

return;

}

if(
e.code === "Space" &&
e.shiftKey
){

e.preventDefault();
goToPage(currentPage - 1);

}

});

function applySavedUi(){

syncHeaderControlLabels();

}

function syncScreenerFavoritesFromStorage(){

favorites =
loadFavoritesGroups();

activeWidgets.forEach(widget=>{
updateWidgetFavoriteUi(
widget.root,
widget.symbol
);
});

}

window.addEventListener(
"storage",
e=>{

if(
e.key !==
FAVORITES_BY_EXCHANGE_KEY &&
e.key !==
"favorites"
){
return;
}

syncScreenerFavoritesFromStorage();

}
);

window.addEventListener(
"favorites-local-changed",
syncScreenerFavoritesFromStorage
);

onFavoritesRemoteUpdate(()=>{

favorites =
loadFavoritesGroups();

activeWidgets.forEach(widget=>{

updateWidgetFavoriteUi(
widget.root,
widget.symbol
);

});

});

function mapSymbolList(list){

return list.map(x=>
typeof x === "string"
? x
: x.symbol
).filter(Boolean);

}

function refreshWidgetTickerMeta(){

activeWidgets.forEach(widget=>{
updateWidgetMeta(
widget.symbol,
widget.root
);
});

}

async function loadScreenerMarketData(){

setStatus(
"Загрузка…",
true
);

const instant =
peekMarketSymbolsCache();

if(
instant?.length
){
screenerMarketLoadFailed = false;
allSymbols =
mapSymbolList(instant);
}

const tickersPromise =
fetchTickersInto(tickerMap).then(()=>{
refreshWidgetTickerMeta();
});

const list =
await loadMarketSymbols();

screenerMarketLoadFailed = false;
allSymbols =
mapSymbolList(list);

await tickersPromise;

}

let screenerMarketReloading = false;

async function reloadScreenerMarketData(){

if(screenerMarketReloading){
return;
}

screenerMarketReloading = true;

try{

const list =
await loadMarketSymbols({
forceNetwork: true
});

screenerMarketLoadFailed = false;

allSymbols =
mapSymbolList(list);

await fetchTickersInto(tickerMap);
refreshWidgetTickerMeta();

await renderPage();

setStatus(
"",
false
);

}catch(err){

console.error(
`Screener ${activeExchangeName()} reload:`,
err
);

screenerMarketLoadFailed = true;

setStatus(
`Список монет ${activeExchangeName()} не загрузился — «Повторить» внизу экрана`,
true
);

void import("./bybit-network-ui.js?v=4").then(m=>{
m.showBybitNetworkIssue(err);
});

}

screenerMarketReloading = false;

}

window.addEventListener(
"bybit-network-retry",
()=>{
void reloadScreenerMarketData();
}
);

window.addEventListener(
EXCHANGE_CHANGED_EVENT,
()=>{
favorites =
loadFavoritesGroups();
void reloadScreenerMarketData();
}
);

window.addEventListener(
"bybit-symbols-updated",
e=>{

if(
getActiveExchangeId() !==
"bybit"
){
return;
}

applyMarketSymbolsUpdated(
e.detail?.symbols
);

}
);

window.addEventListener(
"market-symbols-updated",
e=>{

const exchangeId =
String(
e.detail?.exchangeId ||
""
).trim().toLowerCase();

if(
exchangeId &&
exchangeId !==
getActiveExchangeId()
){
return;
}

applyMarketSymbolsUpdated(
e.detail?.symbols
);

}
);

async function init(){

perfMark(
"screener-init-start"
);

const { waitForSiteCssReady } =
await import(
"./site-css-gate.js?v=1"
);

await waitForSiteCssReady();

mountReleaseMarker();

void mountScreenerWidgetZoomLazy(
{
resolveWidget:
widgetRoot=>
activeWidgets.find(
w=>
w.root ===
widgetRoot
),
getCurrentTF:()=>
currentTF,
getZoomWidgets:()=>
activeWidgets.slice(),
shiftZoomPage:
async dir=>{
const max =
totalPages();
const next =
Math.max(
1,
Math.min(
max,
currentPage +
dir
)
);

if(
next ===
currentPage
){
return false;
}

currentPage =
next;
persistState();
await renderPage();
return true;
},
getInvertCharts:()=>
invertCharts,
getOscillatorKind:
screenerWidgetOscillatorKind,
wireFlagUi:
wireScreenerFlagWrap,
updateFlagUi:
updateWidgetFavoriteUi,
flagWrapHtml:
SCREENER_FLAG_WRAP_HTML
}
);

window.addEventListener(
SCREENER_WIDGET_OSCILLATOR_CHANGED,
()=>{
void renderPage();
}
);

void ensureCloudReady();

bindControls();

document.addEventListener("click", e=>{

if(
e.target.closest(".screener-flag-wrap")
){
return;
}

closeAllScreenerFlagMenus();

});

applySavedUi();

favorites =
loadFavoritesGroups();

try{

await withTimeout(
loadScreenerMarketData(),
45000,
"screener market"
);

}catch(err){

console.error(
"Screener init:",
err
);

screenerMarketLoadFailed = true;
allSymbols = [];

void import("./bybit-network-ui.js?v=4").then(m=>{
m.showBybitNetworkIssue(err);
});

setTimeout(
()=>{
if(
screenerMarketLoadFailed
){
void reloadScreenerMarketData();
}
},
2500
);

}

const scheduleTickerUiFlush =
createTickerUiBatcher(
()=>{

activeWidgets.forEach(
w=>{
updateWidgetMeta(
w.symbol,
w.root
);
}
);

}
);

connectTickerStream(
tick=>{

tickerMap.set(
tick.symbol,
tick
);
scheduleTickerUiFlush();

});

try{

await withTimeout(
renderPage(),
60000,
"screener render"
);

}catch(err){

console.error(
"Screener render:",
err
);

setStatus(
"Графики не загрузились — обновите страницу",
true
);

}

perfMark(
"screener-init-ready"
);
perfMeasure(
"screener-init",
"screener-init-start",
"screener-init-ready"
);

const urlSymbol =
new URLSearchParams(
location.search
).get(
"symbol"
);

if(
urlSymbol?.trim()
){
void jumpToSymbol(
urlSymbol
);
}

}

init();
