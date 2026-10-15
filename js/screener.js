import {
symbolListSignature
} from "./api.js?v=071ede04";

import {
loadMarketHistory,
loadMarketSymbols,
peekMarketSymbolsCache,
getActiveExchangeDefinition,
getActiveExchangeId,
EXCHANGE_CHANGED_EVENT
} from "./market-api.js?v=00f19708";

import {
peekHistoryCache,
putHistoryCache,
mergeCandleRows,
logicalIndexShift
} from "./market-history-cache.js?v=dedca4e1";

import {
openChromeSurface
} from "./chrome-motion.js?v=bb1d8933";

import {
isScreenerWidgetCurrent as isScreenerWidgetCurrentGuard
} from "./screener-widget-guard.js?v=0a29711c";

import {
normalizeMinVolume,
filterSymbolsByMinVolume,
formatMinVolumeFilter,
mountMinVolumeFilterInput
} from "./screener-volume-filter.js?v=2018f0b9";

import {
renderScreenerPagination
} from "./screener-pagination.js?v=6470ffba";

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
} from "./chart-import.js?v=21aeb8d5";

import {
isIpadWebViewport
} from "./ipad-web-viewport.js?v=68cc93ec";

import {
calculateRSI,
alignRsiWithCandleTimes
} from "./indicators.js?v=85e28ecc";

import {
subscribeKline,
bindLiveCandleCatchup
} from "./market-ws.js?v=717ade46";

import {
ensureOhlcRollover,
ingestLiveOhlcKline,
lastOhlcBar,
liveBarPeriodSec,
paintCatchupLiveSeries,
paintLiveOhlcSeries
} from "./chart/live-bar-roll.js?v=6ff2b718";

import {
connectTickerStream,
fetchTickersInto
} from "./tickers.js?v=d4995cf9";

import {
createTickerUiBatcher
} from "./ticker-update-batch.js?v=cc523cbc";

import {
mountReleaseMarker
} from "./release-marker.js?v=d96016c0";

import {
saveScreenerState,
loadScreenerState,
seedWatchlistTfOnBlueFlag
} from "./storage.js?v=bc113be9";

import {
loadFavoritesGroups,
saveFavoritesGroups,
getFavoriteGroup,
setFavoriteGroup,
canSetBlueFlag,
FAVORITES_BY_EXCHANGE_KEY
} from "./favorites.js?v=d5f9b002";

import {
ensureCloudReady
} from "./auth-ui.js?v=86535de8";

import {
ensureSettled,
withTimeout
} from "./async-timeout.js?v=14be549c";

import {
persistFavoritesToCloud,
onFavoritesRemoteUpdate
} from "./cloud-sync.js?v=c4d00dfb";

import {
attachSymbolAutocomplete,
preloadTradingSymbols
} from "./symbol-autocomplete.js?v=caabe55a";

import {
mountQwertyKeyInput,
shouldIgnoreTypingHotkey
} from "./qwerty-key-input.js?v=7ac067d9";

import {
mapWithConcurrency
} from "./load-concurrency.js?v=8a9792d3";

import {
perfMark,
perfMeasure
} from "./perf-marks.js?v=6857dee5";

import {
SCREENER_WIDGET_OSCILLATOR_AO,
SCREENER_WIDGET_OSCILLATOR_CHANGED,
SCREENER_WIDGET_OSCILLATOR_MACD,
createScreenerMacdChart,
getScreenerWidgetOscillator,
isScreenerHistogramOscillator,
setScreenerAoData,
setScreenerMacdData
} from "./screener-widget-oscillator.js?v=8d32ca29";

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
"./screener-widget-zoom.js?v=6e9c08d3"
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

function escapeHtml(
value
){

return String(
value ??
""
).replace(
/&/g,
"&amp;"
).replace(
/</g,
"&lt;"
).replace(
/>/g,
"&gt;"
).replace(
/"/g,
"&quot;"
);

}

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

if(
group ===
"blue"
){
seedWatchlistTfOnBlueFlag(
symbol,
currentTF
);
}

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
openChromeSurface(
flagMenu
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

let minVolumeFilter =
normalizeMinVolume(
saved.minVolume
);

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
invertCharts,
minVolume:minVolumeFilter
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
isScreenerHistogramOscillator(
widget?.oscKind
) ||
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
widget.oscKind ===
SCREENER_WIDGET_OSCILLATOR_AO
){

if(
!widget.rsiSeries
){
return;
}

try{
setScreenerAoData(
widget.rsiSeries,
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
isScreenerHistogramOscillator(
oscKind
)
){
return `
<div class="screener-widget-body">
<div class="screener-chart"></div>
<div class="screener-rsi-wrap screener-rsi-pending">
<div class="screener-rsi-chart"></div>
</div>
</div>`;
}

return `
<div class="screener-widget-body">
<div class="screener-chart"></div>
<div class="screener-rsi-wrap screener-rsi-pending">
<div class="screener-rsi-band"></div>
<div class="rsi-level-line hidden" data-rsi-level="70" aria-hidden="true"></div>
<div class="rsi-level-line hidden" data-rsi-level="50" aria-hidden="true"></div>
<div class="rsi-level-line hidden" data-rsi-level="30" aria-hidden="true"></div>
<div class="screener-rsi-chart"></div>
</div>
</div>`;

}

function getVisibleSymbols(){

return filterSymbolsByMinVolume(
allSymbols,
minVolumeFilter,
sym=>
tickerMap.get(
sym
)?.volume24
);

}

function getSortedSymbols(){

const list =
getVisibleSymbols();

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

const n =
getVisibleSymbols().length;

if(!n || !size){
return 1;
}

return Math.max(
1,
Math.ceil(n / size)
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

if(
minVolumeFilter >
0 &&
!getVisibleSymbols().includes(
normalized
)
){

setStatus(
`${normalized} скрыта фильтром объёма`,
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

import {
bindScreenerWidgets,
createWidget,
destroyWidgets,
loadWidgetChart,
observeWidgetKlineVisibility,
updateWidgetMeta
} from "./screener-widgets.js?v=13cd64c5";

bindScreenerWidgets({
get activeWidgets(){ return activeWidgets; },
set activeWidgets(value){ activeWidgets = value; },
get currentTF(){ return currentTF; },
get gridEl(){ return gridEl; },
get invertCharts(){ return invertCharts; },
get renderToken(){ return renderToken; },
get tickerMap(){ return tickerMap; },
get SCREENER_FLAG_WRAP_HTML(){ return SCREENER_FLAG_WRAP_HTML; },
activeExchangeName,
applyWidgetInversion,
buildWidgetBodyHtml,
escapeHtml,
formatVolume,
isScreenerWidgetCurrent,
layoutWidgetRsi,
openScreenerZoomFromWidget,
screenerWidgetOscillatorKind,
screenerWidgetShowsOscillator,
setStatus,
updateWidgetRsiData,
wireScreenerFlagWrap
});

function renderPagination(){

clampPage();

renderScreenerPagination({
paginationEl,
currentPage,
totalPages:
totalPages(),
selectPage(
page
){

if(
page ===
currentPage
){
return;
}

currentPage =
page;
persistState();
renderPage();

}
});

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
}else if(
minVolumeFilter >
0
){
setStatus(
"Нет монет с таким объёмом",
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

function setMinVolumeFilter(
next
){

const n =
normalizeMinVolume(
next
);

if(
n ===
minVolumeFilter
){
return;
}

minVolumeFilter =
n;
currentPage =
1;
persistState();
void renderPage();

}

function syncVolumeFilterInput(){

const input =
document.getElementById(
"screener-volume-filter"
);

if(
!input ||
document.activeElement ===
input
){
return;
}

input.value =
minVolumeFilter >
0
? formatMinVolumeFilter(
minVolumeFilter
)
: "";

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

if(
shouldIgnoreTypingHotkey(
e
)
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

function bindVolumeFilter(){

const input =
document.getElementById(
"screener-volume-filter"
);

if(
!input
){
return;
}

syncVolumeFilterInput();
mountMinVolumeFilterInput(
input,
{
onCommit:
setMinVolumeFilter
}
);

}

function bindControls(){

bindDesktopHeaderPicks();
bindSymbolSearch();
bindInvertChartsCheckbox();
bindVolumeFilter();
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
syncVolumeFilterInput();

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

void import("./bybit-network-ui.js?v=2d117b93").then(m=>{
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
"./site-css-gate.js?v=2f1bf426"
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

void import("./bybit-network-ui.js?v=2d117b93").then(m=>{
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
