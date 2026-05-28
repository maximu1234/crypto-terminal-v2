import {
loadBybitHistory,
loadBybitSymbols,
loadTwelveData
} from "./api.js?v=20";

import {
filterRecentListings
} from "./bybit-listings.js?v=1";

import {
calculateRSI,
alignRsiWithCandleTimes,
RSI_PERIOD
} from "./indicators.js?v=3";

import {
loadFavoritesGroups,
saveFavoritesGroups,
getFavoriteGroup,
setFavoriteGroup,
flagSortRank
} from "./favorites.js?v=1";

import {
ensureCloudReady
} from "./auth-ui.js?v=24";

import {
persistFavoritesToCloud,
onFavoritesRemoteUpdate
} from "./cloud-sync.js?v=26";

import {
createCandlestickChart,
createRSIChart,
applyChartPriceFormat,
mountChartPriceHud,
syncLinkedChartTimescales,
linkPairedChartTimeScales,
linkChartsCrosshair,
updateRsiBandLayout,
applyTabletRsiChartOptions,
applyTabletMainChartScroll,
markTabletChartBody,
mountTabletPriceScaleTouch,
mountTabletChartGestures,
mountChartRangeFreeze,
positionTabletProbeCrosshair,
hideTabletProbeCrosshair,
ensureTabletProbeHorizLine,
tabletProbeCrosshairOptions,
hiddenCrosshairOptions,
normalCrosshairOptions,
mountAxisDoubleTapReset,
TABLET_USE_CUSTOM_TOUCH_PAN,
isTabletChartViewport,
isUserCrosshairEvent
} from "./chart.js?v=63";

import {
connectKlineStream,
disconnectKlineStream
} from "./ws.js?v=14";

import {
connectTickerStream,
fetchTickersInto
} from "./tickers.js?v=21";

import {
processAlertCandle,
syncBackgroundAlertStreams
} from "./alert-monitor.js?v=64";

import {
initDrawings
} from "./drawings.js?v=156";

import {
initCoinsMobileUi,
wireCoinsMobileDrawToolsMenu,
isCoinsMobile,
syncCoinsTfLabel
} from "./coins-mobile.js?v=4";

let currentDataset = "crypto";
let currentTF = "60";
let currentSymbol = "BTCUSDT";
const isCoinsPage =
window.location.pathname.includes("/coins");
let isCoinsChartInverted =
false;

/** То, что показано в #current-symbol (не сбрасывается на BTC при переключении). */
let displaySymbol =
"";

let candles = [];
let symbolLoadSeq = 0;
let marketData = [];

const marketMap =
new Map();

let innerSortMode = "symbol";
let sortAsc = true;
let flagSortActive = false;
let flagSortAsc = true;

let searchQuery = "";
let hasUrlSymbol = false;

const COINS_PREFS_KEY =
"coins_page_prefs_v1";

const COINS_MARKETS = [
"crypto",
"new",
"stocks",
"commodities",
"forex"
];

const COINS_SORT_MODES =
new Set([
"favorites",
"symbol",
"24h",
"1h"
]);

const COINS_TF_VALUES =
new Set([
"1",
"5",
"15",
"60",
"240",
"D"
]);

function defaultSortEntry(){

return {
mode:"symbol",
asc:true,
byFlag:false,
flagAsc:true
};

}

function defaultLastViewEntry(){

return {
symbol:null,
tf:"60"
};

}

function normalizeLastViewEntry(entry){

const tf =
typeof entry?.tf === "string" &&
COINS_TF_VALUES.has(entry.tf)
? entry.tf
: "60";

const symbol =
typeof entry?.symbol === "string" &&
entry.symbol.trim()
? entry.symbol.trim().toUpperCase()
: null;

return {
symbol,
tf
};

}

function defaultCoinsPrefs(){

const sortByMarket =
{};

const lastViewByMarket =
{};

for(const m of COINS_MARKETS){
sortByMarket[m] = defaultSortEntry();
lastViewByMarket[m] = defaultLastViewEntry();
}

return {
market:"crypto",
sortByMarket,
lastViewByMarket,
invertChart:false
};

}

function normalizeSortEntry(entry){

if(!entry || typeof entry !== "object"){
return defaultSortEntry();
}

let mode =
typeof entry.mode === "string" &&
COINS_SORT_MODES.has(entry.mode)
? entry.mode
: "symbol";

const asc =
typeof entry.asc === "boolean"
? entry.asc
: true;

let byFlag =
typeof entry.byFlag === "boolean"
? entry.byFlag
: false;

let flagAsc =
typeof entry.flagAsc === "boolean"
? entry.flagAsc
: true;

if(mode === "favorites"){
byFlag = true;
flagAsc = asc;
mode = "symbol";
}

return {
mode,
asc,
byFlag,
flagAsc
};

}

function mergeLegacySortIntoPrefs(
prefs,
legacySort
){

if(!legacySort || typeof legacySort !== "object"){
return false;
}

let changed =
false;

if(
legacySort.sortByMarket &&
typeof legacySort.sortByMarket === "object"
){

for(const m of COINS_MARKETS){

if(legacySort.sortByMarket[m]){

prefs.sortByMarket[m] =
normalizeSortEntry(
legacySort.sortByMarket[m]
);

changed = true;

}

}

}else if(
typeof legacySort.mode === "string"
){

const entry =
normalizeSortEntry(legacySort);

for(const m of COINS_MARKETS){
prefs.sortByMarket[m] = { ...entry };
}

changed = true;

}else{

for(const m of COINS_MARKETS){

if(
legacySort[m] &&
typeof legacySort[m] === "object"
){

prefs.sortByMarket[m] =
normalizeSortEntry(
legacySort[m]
);

changed = true;

}

}

}

return changed;

}

function mergeLegacyCoinsStorage(prefs){

let changed =
false;

const legacyMarket =
localStorage.getItem("coins_market_dataset");

if(
legacyMarket &&
COINS_MARKETS.includes(legacyMarket)
){

prefs.market = legacyMarket;
changed = true;

}

const legacySortRaw =
localStorage.getItem("coins_sort_state");

if(legacySortRaw){

try{

const legacySort =
JSON.parse(legacySortRaw);

if(
mergeLegacySortIntoPrefs(
prefs,
legacySort
)
){
changed = true;
}

}catch(err){

console.warn("legacy coins sort:", err);

}

}

if(changed){

writeCoinsPrefs(prefs);

try{

localStorage.removeItem("coins_market_dataset");
localStorage.removeItem("coins_sort_state");

}catch{}

}

return prefs;

}

function readCoinsPrefs(){

try{

let prefs =
defaultCoinsPrefs();

const raw =
localStorage.getItem(COINS_PREFS_KEY);

if(raw){

const parsed =
JSON.parse(raw);

prefs.market =
COINS_MARKETS.includes(parsed?.market)
? parsed.market
: "crypto";

for(const m of COINS_MARKETS){
prefs.sortByMarket[m] =
normalizeSortEntry(
parsed?.sortByMarket?.[m]
);

prefs.lastViewByMarket[m] =
normalizeLastViewEntry(
parsed?.lastViewByMarket?.[m]
);

}

prefs.invertChart =
!!parsed?.invertChart;

try{

localStorage.removeItem(
"coins_market_dataset"
);
localStorage.removeItem(
"coins_sort_state"
);

}catch(_){
}

return prefs;

}

writeCoinsPrefs(prefs);

if(
localStorage.getItem("coins_market_dataset") ||
localStorage.getItem("coins_sort_state")
){

prefs =
mergeLegacyCoinsStorage(prefs);

}

return prefs;

}catch(err){

console.warn("coins prefs read:", err);
return defaultCoinsPrefs();

}

}

function writeCoinsPrefs(prefs){

try{

const out =
defaultCoinsPrefs();

out.market =
COINS_MARKETS.includes(prefs?.market)
? prefs.market
: "crypto";

for(const m of COINS_MARKETS){
out.sortByMarket[m] =
normalizeSortEntry(
prefs?.sortByMarket?.[m]
);

out.lastViewByMarket[m] =
normalizeLastViewEntry(
prefs?.lastViewByMarket?.[m]
);
}

out.invertChart =
!!prefs?.invertChart;

localStorage.setItem(
COINS_PREFS_KEY,
JSON.stringify(out)
);

}catch(err){

console.warn("coins prefs write:", err);

}

}

function persistCoinsPrefs(){

const prefs =
readCoinsPrefs();

prefs.market = currentDataset;
prefs.sortByMarket[currentDataset] = {
mode:innerSortMode,
asc:sortAsc,
byFlag:flagSortActive,
flagAsc:flagSortAsc
};

if(!prefs.lastViewByMarket){
prefs.lastViewByMarket = {};
}

prefs.lastViewByMarket[currentDataset] = {
symbol:currentSymbol,
tf:currentTF
};

if(
isCoinsPage
){
prefs.invertChart =
isCoinsChartInverted;
}

writeCoinsPrefs(prefs);

}

function readLastViewFromPrefs(){

const prefs =
readCoinsPrefs();

return normalizeLastViewEntry(
prefs.lastViewByMarket?.[currentDataset]
);

}

function bootstrapCoinsPageState(){

readUrlParams();
applyCoinsPrefs();

if(hasUrlSymbol){
return;
}

const last =
readLastViewFromPrefs();

if(
last.tf &&
COINS_TF_VALUES.has(last.tf)
){
currentTF = last.tf;
}

if(last.symbol){
currentSymbol = last.symbol;
}

}

function resolveInitialSymbolAndTf(){

const last =
readLastViewFromPrefs();

if(
last.tf &&
COINS_TF_VALUES.has(last.tf)
){
currentTF = last.tf;
}

const symbols =
getCurrentSymbols();

if(last.symbol){

if(
symbols.length === 0 ||
symbols.includes(last.symbol)
){
currentSymbol = last.symbol;
return;
}

}

currentSymbol =
getFirstVisibleSymbol() ||
symbols[0] ||
"BTCUSDT";

}

function applySortForCurrentMarket(){

const prefs =
readCoinsPrefs();

const sort =
prefs.sortByMarket[currentDataset] ||
defaultSortEntry();

innerSortMode = sort.mode;
sortAsc = sort.asc;
flagSortActive = sort.byFlag;
flagSortAsc = sort.flagAsc;

}

function applyCoinsPrefs(){

const prefs =
readCoinsPrefs();

if(!hasUrlSymbol){

currentDataset = prefs.market;

}

applySortForCurrentMarket();

}

let favorites =
loadFavoritesGroups();

let allBybitSymbols = [];
let newListings = [];

const coinElements =
new Map();

/* =========================================================
   SYMBOLS
========================================================= */

const stockSymbols = [
"AAPL","TSLA","NVDA","MSFT","AMZN",
"META","GOOGL","NFLX","AMD","COIN","PLTR"
];

const commoditySymbols = [
"XAU/USD",
"XAG/USD",
"BRENT"
];

const forexSymbols = [
"EUR/USD",
"GBP/USD",
"USD/JPY",
"AUD/USD"
];

/* =========================================================
   CHARTS
========================================================= */

const mainChart =
createCandlestickChart(
document.getElementById("chart")
);

const chart =
mainChart.chart;

const candleSeries =
mainChart.series;

const chartWrapEl =
document.getElementById(
"chart-wrap"
);

const chartEl =
document.getElementById(
"chart"
);

const chartTouchLayerEl =
document.getElementById(
"tablet-probe-touch-layer"
);

function applyCoinsChartInversion(
inverted
){

isCoinsChartInverted =
!!inverted;

try{
chart.priceScale(
"right"
).applyOptions({
invertScale:
isCoinsChartInverted
});
}catch{
/* ignore */
}

}

function persistCoinsChartInversion(){

if(
!isCoinsPage
){
return;
}

const prefs =
readCoinsPrefs();

prefs.invertChart =
isCoinsChartInverted;

writeCoinsPrefs(prefs);

}

function toggleCoinsChartInversion(){

if(
!isCoinsPage
){
return;
}

applyCoinsChartInversion(
!isCoinsChartInverted
);
persistCoinsChartInversion();

}

function mountCoinsScaleInvertMenu(){

if(
!isCoinsPage ||
!chartWrapEl ||
!chartEl
){
return ()=>{};
}

const scaleStripEl =
document.getElementById(
"price-scale-touch-strip"
);

const menu =
document.createElement("div");
menu.className =
"chart-scale-context-menu hidden";

const item =
document.createElement("button");
item.type = "button";
item.className =
"chart-scale-context-menu-item";
item.textContent =
"Инвертировать график";
menu.appendChild(item);
document.body.appendChild(menu);

let touchHoldTimer =
null;
let touchStartX = 0;
let touchStartY = 0;

function hideMenu(){
menu.classList.add("hidden");
}

function showMenuAt(
clientX,
clientY
){

const margin = 8;
menu.classList.remove("hidden");
menu.style.left = "0px";
menu.style.top = "0px";

const rect =
menu.getBoundingClientRect();

let left =
Math.round(clientX);
let top =
Math.round(clientY);

if(
left + rect.width >
window.innerWidth - margin
){
left =
window.innerWidth - margin - rect.width;
}

if(
top + rect.height >
window.innerHeight - margin
){
top =
window.innerHeight - margin - rect.height;
}

left = Math.max(
margin,
left
);
top = Math.max(
margin,
top
);

menu.style.left =
`${left}px`;
menu.style.top =
`${top}px`;

}

function isInPriceScale(
clientX,
clientY
){

const rect =
chartEl.getBoundingClientRect();
const localX =
clientX - rect.left;
const localY =
clientY - rect.top;
const scaleW =
chart.priceScale(
"right"
)?.width?.() || 56;

return (
localY >= 0 &&
localY <= rect.height &&
localX >= rect.width - scaleW &&
localX <= rect.width
);

}

const onDesktopContextMenu =
e=>{

if(
!isInPriceScale(
e.clientX,
e.clientY
)
){
hideMenu();
return;
}

e.preventDefault();
e.stopPropagation();
showMenuAt(
e.clientX,
e.clientY
);

};

const onTouchStart =
e=>{

if(
!e.touches ||
e.touches.length !== 1
){
return;
}

const t = e.touches[0];

if(
!isInPriceScale(
t.clientX,
t.clientY
)
){
return;
}

touchStartX = t.clientX;
touchStartY = t.clientY;

clearTimeout(
touchHoldTimer
);

touchHoldTimer =
setTimeout(
()=>{
showMenuAt(
touchStartX,
touchStartY
);
},
420
);

};

const onTouchMove =
e=>{

if(
!touchHoldTimer ||
!e.touches ||
e.touches.length !== 1
){
return;
}

const t = e.touches[0];
const dx =
t.clientX - touchStartX;
const dy =
t.clientY - touchStartY;

if(
dx * dx + dy * dy >
64
){
clearTimeout(
touchHoldTimer
);
touchHoldTimer =
null;
}

};

const onTouchEnd = ()=>{
clearTimeout(
touchHoldTimer
);
touchHoldTimer =
null;
};

const onAnyTouchEnd = ()=>{
clearTimeout(
touchHoldTimer
);
touchHoldTimer =
null;
};

const onDocPointerDown =
e=>{

if(
menu.contains(e.target)
){
return;
}

hideMenu();

};

item.addEventListener(
"click",
e=>{
e.preventDefault();
e.stopPropagation();
toggleCoinsChartInversion();
hideMenu();
}
);

chartWrapEl.addEventListener(
"contextmenu",
onDesktopContextMenu,
true
);

if(scaleStripEl){
scaleStripEl.addEventListener(
"touchstart",
onTouchStart,
{ capture:true, passive:true }
);
scaleStripEl.addEventListener(
"touchmove",
onTouchMove,
{ capture:true, passive:true }
);
scaleStripEl.addEventListener(
"touchend",
onTouchEnd,
{ capture:true, passive:true }
);
scaleStripEl.addEventListener(
"touchcancel",
onTouchEnd,
{ capture:true, passive:true }
);
}

document.addEventListener(
"pointerdown",
onDocPointerDown,
true
);
window.addEventListener(
"blur",
hideMenu
);
window.addEventListener(
"resize",
hideMenu
);
window.addEventListener(
"scroll",
hideMenu,
true
);

window.addEventListener(
"touchend",
onAnyTouchEnd,
true
);

window.addEventListener(
"touchcancel",
onAnyTouchEnd,
true
);

return ()=>{
hideMenu();
clearTimeout(touchHoldTimer);
chartWrapEl.removeEventListener(
"contextmenu",
onDesktopContextMenu,
true
);
if(scaleStripEl){
scaleStripEl.removeEventListener(
"touchstart",
onTouchStart,
true
);
scaleStripEl.removeEventListener(
"touchmove",
onTouchMove,
true
);
scaleStripEl.removeEventListener(
"touchend",
onTouchEnd,
true
);
scaleStripEl.removeEventListener(
"touchcancel",
onTouchEnd,
true
);
}
document.removeEventListener(
"pointerdown",
onDocPointerDown,
true
);
window.removeEventListener(
"blur",
hideMenu
);
window.removeEventListener(
"resize",
hideMenu
);
window.removeEventListener(
"scroll",
hideMenu,
true
);

window.removeEventListener(
"touchend",
onAnyTouchEnd,
true
);

window.removeEventListener(
"touchcancel",
onAnyTouchEnd,
true
);
menu.remove();
};

}

markTabletChartBody();

if(
isCoinsPage
){
applyCoinsChartInversion(
readCoinsPrefs().invertChart === true
);
}

mountCoinsScaleInvertMenu();

let priceHudCtrl = {
stop(){},
refresh(){}
};

let unmountTabletGestures =
()=>{};

let unmountTabletCrosshair =
()=>{};

/** iPad: true пока удержание активировало перекрестие (блокирует pan) */
let tabletCrosshairProbe =
false;

let abortTabletPan =
()=>{};

let cancelTabletPanGesture =
()=>{};

function emitChartProbeCrosshair(
active,
clientX = null,
clientY = null
){

window.dispatchEvent(
new CustomEvent(
"chart-probe-crosshair",
{
detail:{
active: !!active,
clientX,
clientY
}
}
)
);

}

function tabletPanAllowed(){

const wrap =
document.getElementById(
"chart-wrap"
);

if(
wrap?.classList.contains(
"chart-touch-locked"
)
){
return false;
}

if(
tabletCrosshairProbe
){
return false;
}

if(
drawingTools?.blocksTabletChartPan?.()
){
return false;
}

return true;

}

mountTabletPriceScaleTouch(
chart,
document.getElementById(
"price-scale-touch-strip"
),
chartEl,
()=>{
priceHudCtrl.refresh?.();
}
);

applyTabletMainChartScroll(
chart
);

const rsi =
createRSIChart(
document.getElementById("rsi-chart")
);

const rsiChart =
rsi.chart;

const rsiSeries =
rsi.series;

applyTabletRsiChartOptions(
rsiChart
);

/*
  Кеш точек RSI: пересборка только при данных свечей;
  худ обновляется от курсора (как в TradingView).
*/
let rsiPointsCache =
[];

const rsiHudValue =
document.getElementById(
"rsi-hud-value"
);

const rsiHudPeriodEl =
document.getElementById(
"rsi-hud-period"
);

if(
rsiHudPeriodEl
){

rsiHudPeriodEl.textContent =
String(RSI_PERIOD);

}

function rsiCrosshairUnix(t){

if(
t === null ||
t === undefined
){
return null;
}

if(
typeof t === "number"
){
return t;

}

if(
typeof t === "object" &&
t !== null
){

if(
typeof t.timestamp ===
"number"
){
return t.timestamp;

}

}

return null;

}

function formatRsiHud(v){

if(
v === null ||
v === undefined ||
Number.isNaN(v)
){

return "—";

}

return v.toFixed(2);

}

function rsiLookupAtOrBefore(ts){

for(
let i =
rsiPointsCache.length -
1;
i >=
0;
i--
){

if(
rsiPointsCache[i].time <=
ts
){

const v =
rsiPointsCache[i].value;

if(
v !== undefined &&
Number.isFinite(v)
){

return v;

}

}

}

return null;

}

function setRsiHudValue(v){

if(
rsiHudValue
){

rsiHudValue.textContent =
formatRsiHud(v);

}

}

function rebuildRsiFromCandles(){

const raw =
calculateRSI(
candles
);

rsiPointsCache =
alignRsiWithCandleTimes(
candles,
raw
);

rsiSeries.setData(
rsiPointsCache
);

syncLinkedChartTimescales(
chart,
rsiChart
);

layoutRsiBand();

const last =
rsiPointsCache[
rsiPointsCache.length -
1
];

setRsiHudValue(
last?.value ??
null

);

}

function layoutRsiBand(){

updateRsiBandLayout(
rsiSeries,
document.getElementById(
"rsi-band"
)
);

}

function candleCloseAtOrBefore(ts){

for(
let i =
candles.length -
1;
i >=
0;
i--
){

if(
candles[i].time <=
ts
){

return candles[i].close;

}

}

return null;

}

function updateRsiHudFromCrosshairTime(
time
){

const ts =
rsiCrosshairUnix(
time
);

if(
ts === null
){

const tail =
rsiPointsCache[
rsiPointsCache.length -
1
];

setRsiHudValue(
tail
? tail.value
: null
);

return;

}

setRsiHudValue(
rsiLookupAtOrBefore(ts)
);

}

const chartCrosshairLink =
linkChartsCrosshair({
mainChart:chart,
linkedChart:rsiChart,
mainSeries:candleSeries,
linkedSeries:rsiSeries,
linkedVertOverlayEl:document.getElementById(
"linked-crosshair-vert"
),
crosshairTimeLabelEl:document.getElementById(
"crosshair-time-label"
),
onLinkedCrosshairTime:updateRsiHudFromCrosshairTime,
onLinkedCrosshairClear(){
const last =
rsiPointsCache[
rsiPointsCache.length -
1
];

setRsiHudValue(
last?.value ??
null
);
},
getLinkedValueAtTime(time){
const ts =
rsiCrosshairUnix(time);

if(
ts === null
){
return null;
}

return rsiLookupAtOrBefore(ts);
},
getMainValueAtTime(time){
const ts =
rsiCrosshairUnix(time);

if(
ts === null
){
return null;
}

return candleCloseAtOrBefore(ts);
}
});

chart.subscribeCrosshairMove(param=>{

if(
isUserCrosshairEvent(param)
){
return;
}

updateRsiHudFromCrosshairTime(param.time);

});

let drawingTools = null;

document.body.classList.remove(
"drawings-tablet-test-off"
);

try{

drawingTools = initDrawings({

chart,
series: candleSeries,
wrapEl: document.getElementById("chart-wrap"),
uiRoot: document.getElementById("chart-wrap"),
toolsRoot: document.getElementById("topbar"),
getSymbol: ()=> currentSymbol,
getTf: ()=> currentTF,
getCandles: ()=> candles,
isActive: ()=>true,
abortTabletChartGesture:()=>{
cancelTabletPanGesture?.();
},
onChartCrosshairSuppress:()=>{
chartCrosshairLink?.setSuppressed?.(
true
);
},
onChartCrosshairRelease:()=>{
chartCrosshairLink?.setSuppressed?.(
false
);
},
onChartCrosshairAt(
clientX,
clientY
){

if(
!isTabletChartViewport()
){
return;
}

positionTabletProbeCrosshair({
chart,
series: candleSeries,
chartEl,
chartsStackEl: document.getElementById(
"charts-stack"
),
linkedVertEl: document.getElementById(
"linked-crosshair-vert"
),
horizLineEl: document.getElementById(
"tablet-probe-crosshair-h"
),
timeLabelEl: document.getElementById(
"crosshair-time-label"
),
clientX,
clientY,
onTime: updateRsiHudFromCrosshairTime
});

},
onChartCrosshairClear(){

if(
!isTabletChartViewport()
){
return;
}

hideTabletProbeCrosshair({
linkedVertEl: document.getElementById(
"linked-crosshair-vert"
),
horizLineEl: document.getElementById(
"tablet-probe-crosshair-h"
),
timeLabelEl: document.getElementById(
"crosshair-time-label"
),
onClear(){

const last =
rsiPointsCache[
rsiPointsCache.length -
1
];

setRsiHudValue(
last?.value ??
null
);

}
});

try{
chart.clearCrosshairPosition();
}catch{
/* ignore */
}

}

});

}catch(err){

console.error("Drawings init failed:", err);

}

if(
drawingTools
){

void import("./price-alert-ui.js?v=17").then(({ mountPriceAlertUi })=>{
mountPriceAlertUi({
chart,
series: candleSeries,
wrapEl: chartWrapEl,
getSymbol: ()=> currentSymbol,
getTf: ()=> currentTF,
scheduleRedraw: ()=>
drawingTools?.scheduleDragRedraw?.() ||
drawingTools?.scheduleRedraw?.(),
onCrosshairSuppress:()=>{
chartCrosshairLink?.setSuppressed?.(
true
);
},
onCrosshairRelease:()=>{
chartCrosshairLink?.setSuppressed?.(
false
);
}
});
}).catch(err=>{
console.warn(
"price alert ui:",
err
);
});

}

if(
isTabletChartViewport()
){

try{
chart.clearCrosshairPosition();
}catch{
/* ignore */
}

}

if(
TABLET_USE_CUSTOM_TOUCH_PAN
){

function tabletHoldShouldBegin(
e
){

const wrap =
document.getElementById(
"chart-wrap"
);

if(
wrap?.classList.contains(
"chart-touch-locked"
)
){
return false;
}

if(
e.target?.closest?.(
".price-scale-touch-strip"
)
){
return false;
}

const rect =
chartEl.getBoundingClientRect();

const clientX =
e.clientX ??
e.touches?.[
0
]?.clientX;

const clientY =
e.clientY ??
e.touches?.[
0
]?.clientY;

if(
clientX ===
undefined ||
clientY ===
undefined
){
return false;
}

if(
drawingTools?.blocksTabletChartGestures?.(
clientX,
clientY
)
){
return false;
}

return true;

}

const chartsStackEl =
document.getElementById(
"charts-stack"
);

const probeHorizEl =
ensureTabletProbeHorizLine(
chartsStackEl
);

const linkedVertEl =
document.getElementById(
"linked-crosshair-vert"
);

const crosshairTimeLabelEl =
document.getElementById(
"crosshair-time-label"
);

const mainRangeFreeze =
mountChartRangeFreeze(
chart
);

const rsiRangeFreeze =
mountChartRangeFreeze(
rsiChart
);

const tabletGestureCtrl =
mountTabletChartGestures(
chart,
chartEl,
chartTouchLayerEl,
{
shouldBeginGesture:tabletHoldShouldBegin,
shouldAllowPan:tabletPanAllowed,
shouldAllowPinch:()=>{
if(
tabletCrosshairProbe
){
return false;
}
if(
drawingTools?.blocksTabletChartPan?.()
){
return false;
}
if(
drawingTools?.isPlacementActive?.()
){
return false;
}
const wrap =
document.getElementById(
"chart-wrap"
);
if(
wrap?.classList.contains(
"chart-touch-locked"
)
){
return false;
}
return true;
},
blockChartScroll:()=>tabletCrosshairProbe,
onHoldStart:()=>{
setTabletPanSuspended?.(
true
);
tabletCrosshairProbe = true;
document.getElementById(
"chart-wrap"
)?.classList.add(
"chart-touch-locked"
);
mainRangeFreeze.freeze();
rsiRangeFreeze.freeze();
try{
chart.clearCrosshairPosition();
rsiChart.clearCrosshairPosition();
}catch{
/* ignore */
}
emitChartProbeCrosshair(false);
chart.applyOptions({
crosshair:tabletProbeCrosshairOptions(),
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
}
}
});
rsiChart.applyOptions({
crosshair:hiddenCrosshairOptions(),
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
}
}
});
},
onHoldEnd:()=>{
setTabletPanSuspended?.(
false
);
tabletCrosshairProbe = false;
document.getElementById(
"chart-wrap"
)?.classList.remove(
"chart-touch-locked"
);
mainRangeFreeze.unfreeze();
rsiRangeFreeze.unfreeze();
try{
chart.clearCrosshairPosition();
}catch{
/* ignore */
}

hideTabletProbeCrosshair({
linkedVertEl,
horizLineEl:probeHorizEl,
timeLabelEl:crosshairTimeLabelEl,
onClear(){
const last =
rsiPointsCache[
rsiPointsCache.length -
1
];

setRsiHudValue(
last?.value ??
null
);
}
});
emitChartProbeCrosshair(false);
try{
chart.applyOptions({
crosshair:normalCrosshairOptions()
});
}catch{
/* ignore */
}
applyTabletMainChartScroll(
chart
);
applyTabletRsiChartOptions(
rsiChart
);
},
onProbeAt(
clientX,
clientY
){
positionTabletProbeCrosshair({
chart,
series:candleSeries,
chartEl,
chartsStackEl,
linkedVertEl,
horizLineEl:probeHorizEl,
timeLabelEl:crosshairTimeLabelEl,
clientX,
clientY,
onTime:updateRsiHudFromCrosshairTime
});
emitChartProbeCrosshair(
true,
clientX,
clientY
);
}
}
);

abortTabletPan =
tabletGestureCtrl.abortPan;

cancelTabletPanGesture =
tabletGestureCtrl.cancelCurrentGesture;

const setTabletPanSuspended =
tabletGestureCtrl.setPanSuspended;

window.addEventListener(
"chart-probe-crosshair-clear-request",
()=>{
tabletGestureCtrl.deactivateProbe?.();
emitChartProbeCrosshair(false);
}
);

unmountTabletGestures =
tabletGestureCtrl.dispose;

unmountTabletCrosshair =
unmountTabletGestures;

}

/* =========================================================
   SYMBOLS
========================================================= */

async function initSymbols(){

const list =
await loadBybitSymbols();

allBybitSymbols =
list.map(x => x.symbol);

newListings =
filterRecentListings(list).map(x => x.symbol);

}

let terminalBybitReloading = false;

async function reloadTerminalBybitData(){

if(
terminalBybitReloading
){
return;
}

terminalBybitReloading = true;

try{

await initSymbols();

await primeTickerSnapshots();

generateMarketData();

renderList();

resizeCharts();

await loadSymbol(
currentSymbol || "BTCUSDT"
);

}catch(err){

console.error(
"Terminal Bybit reload:",
err
);

}

terminalBybitReloading = false;

}

window.addEventListener(
"bybit-network-retry",
()=>{

if(
currentDataset === "crypto" ||
currentDataset === "new"
){
void reloadTerminalBybitData();
}

}
);

function getCurrentSymbols(){

if(currentDataset === "crypto"){
return allBybitSymbols;
}

if(currentDataset === "new"){
return newListings;
}

if(currentDataset === "stocks"){
return stockSymbols;
}

if(currentDataset === "commodities"){
return commoditySymbols;
}

return forexSymbols;

}

/* =========================================================
   MARKET DATA
========================================================= */

function generateMarketData(){

marketData = [];

marketMap.clear();

getCurrentSymbols().forEach(symbol=>{

const item = {

symbol,

price:0,

change24:0,

change1h:0

};

marketData.push(item);

marketMap.set(symbol,item);

});

}

/*
  После обновления % рынка список должен перестраиваться, иначе
  при сохранённой сортировке по 24h/1h все строки с нулём % после
  перезагрузки выглядят «несохранённой» сортировкой.
*/
let resortPriceColsTimer =
null;

function scheduleResortPriceColumns(){

if(
innerSortMode !== "24h" &&
innerSortMode !== "1h"
){
return;
}

if(resortPriceColsTimer){
return;
}

resortPriceColsTimer =
setTimeout(()=>{

resortPriceColsTimer = null;

renderList();

},200);

}

async function primeTickerSnapshots(){

if(
currentDataset !== "crypto" &&
currentDataset !== "new"
){
return;
}

try{

const snap =
new Map();

await fetchTickersInto(snap);

snap.forEach((payload,symbol)=>{

const item =
marketMap.get(symbol);

if(!item){
return;
}

item.price =
payload.price;

item.change24 =
payload.change24;

item.change1h =
payload.change1h;

});

}catch(err){

console.warn(
"prime tickers:",
err
);

}

}

/* =========================================================
   REALTIME TICKERS
========================================================= */

function startTickerStream(){

connectTickerStream(tick=>{

const item =
marketMap.get(tick.symbol);

if(!item){
return;
}

item.price =
tick.price;

item.change24 =
tick.change24;

item.change1h =
tick.change1h;

updateCoinRow(item);

scheduleResortPriceColumns();

});

}

/* =========================================================
   REALTIME
========================================================= */

function startRealtime(){

if(
currentDataset !== "crypto" &&
currentDataset !== "new"
){
return;
}

const streamSymbol =
currentSymbol;

connectKlineStream({

symbol:currentSymbol,
tf:currentTF,

onCandle:candle=>{

if(
streamSymbol !== currentSymbol
){
return;
}

if(!candles.length){
return;
}

const last =
candles[candles.length - 1];

if(candle.time === last.time){

candles[candles.length - 1] =
candle;

}else if(candle.time > last.time){

candles.push(candle);

if(candles.length > 4000){
candles.shift();
}

}

candleSeries.update(candle);

rebuildRsiFromCandles();

processAlertCandle(
streamSymbol,
candle,
currentTF
);

}

});

}

/* =========================================================
   DEFAULT ZOOM
========================================================= */

function applyDefaultZoom(){

if(!candles.length){
return;
}

chart.timeScale().resetTimeScale();

let visibleBars = candles.length;

/* =========================================================
   TF LIMITS
========================================================= */

if(currentTF === "1"){
visibleBars = Math.min(candles.length, 1500);
}

if(currentTF === "5"){
visibleBars = Math.min(candles.length, 2000);
}

if(currentTF === "15"){
visibleBars = Math.min(candles.length, 2500);
}

if(currentTF === "60"){
visibleBars = Math.min(candles.length, 3000);
}

if(currentTF === "240"){
visibleBars = Math.min(candles.length, 2000);
}

if(currentTF === "D"){
visibleBars = Math.min(candles.length, 1000);
}

const lastIndex =
candles.length - 1;

const rightMargin =
Math.max(
48,
Math.round(visibleBars * 0.1)
);

chart.timeScale().applyOptions({
rightOffset:12,
fixRightEdge:false
});

chart.timeScale().setVisibleLogicalRange({

from: Math.max(0, lastIndex - visibleBars + 1),

to: lastIndex + rightMargin

});

syncLinkedChartTimescales(
chart,
rsiChart
);

}

/* =========================================================
   LOAD SYMBOL
========================================================= */

function setCoinsChartStatus(
text,
visible
){

const el =
document.getElementById(
"coins-chart-status"
);

if(!el){
return;
}

el.textContent = text;

el.classList.toggle(
"hidden",
!visible
);

}

async function loadSymbol(symbol){

const loadSeq = ++symbolLoadSeq;

currentSymbol = symbol;
setCoinsChartSymbol(symbol);

persistCoinsPrefs();

setCoinsChartStatus(
`Загрузка ${formatCoinsSymbolLabel(symbol)}…`,
true
);

try{

let nextCandles = [];

if(
currentDataset === "crypto" ||
currentDataset === "new"
){

nextCandles =
await loadBybitHistory(
symbol,
currentTF,

5,

{
parallel:true,
batchGapMs:0
}

);

}else{

nextCandles =
await loadTwelveData(
symbol,
currentTF
);

}

if(loadSeq !== symbolLoadSeq){
return;
}

candles = nextCandles;

if(
!candles.length &&
(
currentDataset === "crypto" ||
currentDataset === "new"
)
){

void import("./bybit-network-ui.js?v=2").then(m=>{
m.showBybitNetworkIssue(
new Error(
"История свечей Bybit пуста"
)
);
});

return;

}

candleSeries.setData(candles);

const refPrice =
candles[candles.length - 1]?.close ?? 1;

applyChartPriceFormat(
candleSeries,
refPrice
);

rebuildRsiFromCandles();

/* =========================================================
   APPLY ZOOM
========================================================= */

applyDefaultZoom();

resizeCharts();
requestAnimationFrame(resizeCharts);
setTimeout(resizeCharts, 50);
setTimeout(resizeCharts, 300);

drawingTools?.onSymbolChange();
drawingTools?.resize();
drawingTools?.scheduleRedraw?.();

window.dispatchEvent(
new CustomEvent(
"chart-candles-loaded",
{
detail:{
symbol: String(
currentSymbol ||
""
).trim().toUpperCase()
}
}
)
);

highlightActiveSymbol();

scrollActiveCoinIntoView();

ensureCoinsMobileShowsChart();

startRealtime();
startPriceHud();

syncBackgroundAlertStreams(
currentSymbol,
currentTF
);

persistCoinsPrefs();

}finally{

if(loadSeq === symbolLoadSeq){
setCoinsChartStatus(
"",
false
);
}

}

}

/* =========================================================
   RESIZE
========================================================= */

function resizeCharts(){

const chartWrap =
document.getElementById("chart-wrap");
const rsiEl =
document.getElementById("rsi-chart");

if(
!chartWrap ||
!rsiEl
){
return;
}

const w =
Math.max(
chartWrap.clientWidth,
1
);

const chartH =
Math.max(
chartWrap.clientHeight,
1
);

const rsiH =
Math.max(
rsiEl.clientHeight,
1
);

if(
w < 2 ||
chartH < 2 ||
rsiH < 2
){
return;
}

chart.applyOptions({
width:w,
height:chartH
});

rsiChart.applyOptions({
width:w,
height:rsiH
});

syncLinkedChartTimescales(
chart,
rsiChart
);

drawingTools?.resize();
drawingTools?.scheduleRedraw?.();

requestAnimationFrame(()=>{
syncLinkedChartTimescales(
chart,
rsiChart
);
layoutRsiBand();
});

}

window.addEventListener(
"resize",
resizeCharts
);

const chartWrapForResize =
document.getElementById("chart-wrap");

if(
chartWrapForResize &&
typeof ResizeObserver !==
"undefined"
){

const chartResizeObserver =
new ResizeObserver(()=>{
resizeCharts();
});

chartResizeObserver.observe(chartWrapForResize);

const rsiWrapEl =
document.getElementById("rsi-wrap");

if(rsiWrapEl){
chartResizeObserver.observe(rsiWrapEl);
}

}

/* =========================================================
   SYNC
========================================================= */

linkPairedChartTimeScales(
chart,
rsiChart,
layoutRsiBand,
{
isLocked:()=>tabletCrosshairProbe
}
);

const rsiChartEl =
document.getElementById(
"rsi-chart"
);

let unmountRsiTimeAxisDoubleTap =
()=>{};

if(
rsiChartEl
){

unmountRsiTimeAxisDoubleTap =
mountAxisDoubleTapReset(
rsiChartEl,
()=>{
applyDefaultZoom();
layoutRsiBand();
drawingTools?.scheduleRedraw?.();
}
);

}

function startPriceHud(){

priceHudCtrl.stop?.();

priceHudCtrl =
mountChartPriceHud({
chart,
series: candleSeries,
wrapEl: chartWrapEl,
getTf: ()=> currentTF
});

}

/* =========================================================
   TF
========================================================= */

async function setCoinsTimeframe(
tf
){

if(
!tf ||
tf === currentTF
){
return;
}

currentTF = tf;

document
.querySelectorAll(".tf-btn")
.forEach(b=>{
b.classList.toggle(
"active",
b.dataset.tf === currentTF
);
});

syncCoinsTfLabel(currentTF);

await loadSymbol(currentSymbol);

persistCoinsPrefs();

}

document
.querySelectorAll(".tf-btn")
.forEach(btn=>{

btn.onclick = async ()=>{
await setCoinsTimeframe(btn.dataset.tf);
};

});

/* =========================================================
   FILTER
========================================================= */

document
.getElementById("market-filter")
.addEventListener("change", async e=>{

disconnectKlineStream();

currentDataset = e.target.value;

applySortForCurrentMarket();

persistCoinsPrefs();

searchQuery = "";

const searchInput =
document.getElementById("coin-search");

if(searchInput){
searchInput.value = "";
}

generateMarketData();

await primeTickerSnapshots();

renderList();

resolveInitialSymbolAndTf();

applyUrlTimeframe();
setCoinsChartSymbol(currentSymbol);

if(currentSymbol){
await loadSymbol(currentSymbol);
}

});

/* =========================================================
   TABLE
========================================================= */

function getFilteredMarketData(){

let data = [...marketData];

const query =
searchQuery.trim().toUpperCase();

if(query){

data = data.filter(item=>
item.symbol.includes(query)
);

}

return data;

}

function getVisibleSymbolList(){

const data =
getFilteredMarketData();

data.sort(sortData);

return data.map(item=>item.symbol);

}

function getFirstVisibleSymbol(){

const symbols =
getVisibleSymbolList();

return symbols[0] || null;

}

function renderList(){

const list =
document.getElementById(
"coins-body"
);

list.innerHTML = "";

coinElements.clear();

const data =
getFilteredMarketData();

data.sort(sortData);

data.forEach(item=>{

const div =
createCoinRow(item);

coinElements.set(
item.symbol,
div
);

list.appendChild(div);

});

highlightActiveSymbol();

}

function scrollActiveCoinIntoView(){

if(isCoinsMobile()){
return;
}

const el =
coinElements.get(currentSymbol);

if(!el){
return;
}

el.scrollIntoView({
block:"nearest",
behavior:"smooth"
});

}

function ensureCoinsMobileShowsChart(){

if(!isCoinsMobile()){
return;
}

if(window.scrollY > 0){
window.scrollTo({
top:0,
left:0,
behavior:"instant"
});
}

}

function closeAllCoinFlagMenus(
exceptWrap = null
){

document.querySelectorAll(".coin-flag-wrap").forEach(wrap=>{

if(wrap === exceptWrap){
return;
}

wrap.querySelector(".coin-flag-menu")?.classList.add("hidden");

wrap.querySelector("[data-coin-flag-trigger]")?.setAttribute(
"aria-expanded",
"false"
);

});

}

function applyCoinFavoriteGroup(
symbol,
group
){

if(!symbol){
return;
}

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

saveFavoritesGroups(favorites);
persistFavoritesToCloud(favorites);

const row =
coinElements.get(symbol);
const btn =
row?.querySelector("[data-coin-flag-trigger]");

if(btn){
updateCoinFlagButton(btn, symbol);
}

if(flagSortActive){
renderList();
}

}

function updateCoinFlagButton(btn, symbol){

const group =
getFavoriteGroup(symbol, favorites);

const titles = {
red:"Красный флаг",
green:"Зелёный флаг",
gray:"Серый флаг"
};

btn.className = "flag coin-flag-btn";

if(group){
btn.classList.add(
"favorite",
`flag--${group}`
);
}

btn.title =
group
? titles[group]
: "Выбрать флаг";

btn.setAttribute(
"aria-pressed",
group ? "true" : "false"
);

}

function createCoinRow(item){

const div =
document.createElement("div");

div.className = "coin";

div.innerHTML = `

<div class="col-flag">

<div class="coin-flag-wrap">
<button type="button" class="flag coin-flag-btn" data-coin-flag-trigger data-symbol="${item.symbol}" title="Выбрать флаг" aria-haspopup="true" aria-expanded="false" aria-pressed="false"></button>
<div class="coin-flag-menu hidden" role="menu">
<button type="button" class="flag coin-flag-pick flag--red" data-flag-group="red" title="Красный" role="menuitem"></button>
<button type="button" class="flag coin-flag-pick flag--green" data-flag-group="green" title="Зелёный" role="menuitem"></button>
<button type="button" class="flag coin-flag-pick flag--gray" data-flag-group="gray" title="Серый" role="menuitem"></button>
<button type="button" class="flag coin-flag-pick coin-flag-clear" data-flag-group="clear" title="Снять флаг" role="menuitem"></button>
</div>
</div>

</div>

<div class="coin-symbol">
${item.symbol}
</div>

<div class="coin-change24 col-change">
0.00%
</div>

<div class="coin-change1h col-change">
0.00%
</div>

`;

div.onclick = async e=>{

if(
e.target.closest(".coin-flag-wrap")
){
return;
}

setCoinsChartSymbol(item.symbol);
await loadSymbol(item.symbol);

};

const flagWrap =
div.querySelector(".coin-flag-wrap");

const flagTrigger =
flagWrap?.querySelector("[data-coin-flag-trigger]");

const flagMenu =
flagWrap?.querySelector(".coin-flag-menu");

if(flagTrigger){
updateCoinFlagButton(flagTrigger, item.symbol);
}

flagTrigger?.addEventListener("click", e=>{

e.stopPropagation();

const open =
!flagMenu?.classList.contains("hidden");

closeAllCoinFlagMenus(flagWrap);

if(open){
flagMenu?.classList.add("hidden");
flagTrigger.setAttribute("aria-expanded", "false");
}else{
flagMenu?.classList.remove("hidden");
flagTrigger.setAttribute("aria-expanded", "true");
}

});

flagMenu?.querySelectorAll("[data-flag-group]").forEach(btn=>{

btn.addEventListener("click", e=>{

e.stopPropagation();

applyCoinFavoriteGroup(
item.symbol,
btn.dataset.flagGroup
);

flagMenu?.classList.add("hidden");
flagTrigger?.setAttribute("aria-expanded", "false");

});

});

updateCoinRow(item, div);

return div;

}

function updateCoinRow(item, element=null){

const div =
element ||
coinElements.get(item.symbol);

if(!div){
return;
}

const change24El =
div.querySelector(".coin-change24");

const change1hEl =
div.querySelector(".coin-change1h");

if(!change24El || !change1hEl){
return;
}

if(item.change24 >= 0){

change24El.classList.add("green");
change24El.classList.remove("red");

}else{

change24El.classList.add("red");
change24El.classList.remove("green");

}

if(item.change1h >= 0){

change1hEl.classList.add("green");
change1hEl.classList.remove("red");

}else{

change1hEl.classList.add("red");
change1hEl.classList.remove("green");

}

change24El.innerText =
`${item.change24.toFixed(2)}%`;

change1hEl.innerText =
`${item.change1h.toFixed(2)}%`;

}

function syncFavoriteButtonsFromStorage(){

favorites =
loadFavoritesGroups();

coinElements.forEach((el, symbol)=>{

const group =
getFavoriteGroup(symbol, favorites);

const btn =
el.querySelector("[data-coin-flag-trigger]");

if(btn){
updateCoinFlagButton(btn, symbol);
}

});

}

onFavoritesRemoteUpdate(()=>{

syncFavoriteButtonsFromStorage();

if(flagSortActive){
renderList();
}

});

function highlightActiveSymbol(){

coinElements.forEach((el,symbol)=>{

if(symbol === currentSymbol){

el.classList.add("active");

}else{

el.classList.remove("active");

}

});

}

function compareInnerSort(a, b){

let result = 0;

if(innerSortMode === "symbol"){

result =
a.symbol.localeCompare(
b.symbol
);

}else if(innerSortMode === "24h"){

result =
a.change24 - b.change24;

}else if(innerSortMode === "1h"){

result =
a.change1h - b.change1h;

}

return sortAsc
? result
: -result;

}

function sortData(a,b){

if(flagSortActive){

const ar =
flagSortRank(
getFavoriteGroup(a.symbol, favorites),
flagSortAsc
);

const br =
flagSortRank(
getFavoriteGroup(b.symbol, favorites),
flagSortAsc
);

if(ar !== br){
return ar - br;
}

}

return compareInnerSort(a, b);

}

/* =========================================================
   SORT
========================================================= */

document
.getElementById("table-header")
?.addEventListener("click", e=>{

const el =
e.target.closest(".sortable");

if(!el){
return;
}

const mode =
el.dataset.sort;

if(!mode){
return;
}

if(mode === "favorites"){

if(!flagSortActive){

flagSortActive = true;
flagSortAsc = true;

}else{

flagSortAsc = !flagSortAsc;

}

}else{

flagSortActive = false;

if(innerSortMode === mode){

sortAsc = !sortAsc;

}else{

innerSortMode = mode;
sortAsc = false;

}

}

persistCoinsPrefs();

renderList();

});

/* =========================================================
   KEYBOARD NAVIGATION
========================================================= */

document
.getElementById("coin-search")
?.addEventListener("input", e=>{

searchQuery = e.target.value;

renderList();

});

function shouldIgnoreListKeyNav(e){

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

async function navigateCoinsList(
direction
){

const symbols =
getVisibleSymbolList();

if(
!symbols.length
){
return;
}

const goDown =
direction >
0;

let index =
symbols.indexOf(
currentSymbol
);

if(
index <
0
){
index = goDown ? -1 : 0;
}

if(goDown){
index = (index + 1) % symbols.length;
}else{
index = (index - 1 + symbols.length) % symbols.length;
}

const next =
symbols[index];

if(
!next ||
next === currentSymbol
){
return;
}

setCoinsChartSymbol(
next
);
await loadSymbol(
next
);

}

document.addEventListener(
"keydown",
async e=>{

if(shouldIgnoreListKeyNav(e)){
return;
}

const goDown =
e.code === "ArrowDown" ||
e.code === "Space" ||
e.key === " ";

const goUp =
e.code === "ArrowUp";

if(!goDown && !goUp){
return;
}

e.preventDefault();
await navigateCoinsList(
goDown ? 1 : -1
);

});

const COINS_TABLET_LIST_NAV_MQ =
window.matchMedia(
"(pointer: coarse) and (min-width: 768px)"
);

function syncCoinsTabletListNav(){

const show =
COINS_TABLET_LIST_NAV_MQ.matches &&
!isCoinsMobile();

document.body.classList.toggle(
"coins-tablet-list-nav-on",
show
);

if(
!show
){
return;
}

const list =
document.getElementById(
"list"
);

if(
!list
){
return;
}

let nav =
document.getElementById(
"coins-list-tablet-nav"
);

if(
nav
){
return;
}

nav =
document.createElement(
"div"
);

nav.id = "coins-list-tablet-nav";
nav.className = "coins-list-tablet-nav";
nav.setAttribute(
"aria-label",
"Листание списка монет"
);

const up =
document.createElement(
"button"
);

up.type = "button";
up.className = "coins-list-scroll-btn coins-list-scroll-btn--up";
up.id = "coins-list-scroll-up";
up.textContent = "▲ Вверх по списку";

const down =
document.createElement(
"button"
);

down.type = "button";
down.className = "coins-list-scroll-btn coins-list-scroll-btn--down";
down.id = "coins-list-scroll-down";
down.textContent = "▼ Вниз по списку";

up.addEventListener(
"click",
()=>{
void navigateCoinsList(
-1
);
}
);

down.addEventListener(
"click",
()=>{
void navigateCoinsList(
1
);
}
);

nav.append(
up,
down
);
list.appendChild(
nav
);

}

COINS_TABLET_LIST_NAV_MQ.addEventListener(
"change",
syncCoinsTabletListNav
);

/* =========================================================
   URL PARAMS
========================================================= */

function readUrlParams(){

const params =
new URLSearchParams(window.location.search);

const symbol =
params.get("symbol");

const tf =
params.get("tf");

if(symbol){
currentSymbol = symbol.trim().toUpperCase();
currentDataset = "crypto";
hasUrlSymbol = true;
}

if(tf){
currentTF = tf;
}

}

function formatCoinsSymbolLabel(
symbol
){

const sym =
symbol ||
displaySymbol ||
currentSymbol;

if(!sym){
return "—";
}

if(
currentDataset === "crypto" ||
currentDataset === "new"
){
return sym + ".P";
}

return sym;

}

function setCoinsChartSymbol(
symbol
){

const sym =
symbol
? String(symbol).trim().toUpperCase()
: "";

if(!sym){
return;
}

displaySymbol = sym;

const el =
document.getElementById(
"current-symbol"
);

if(!el){
return;
}

el.textContent =
formatCoinsSymbolLabel(sym);

}

function syncCoinsSymbolLabel(){

setCoinsChartSymbol(
currentSymbol
);

}

function applyUrlTimeframe(){

document
.querySelectorAll(".tf-btn")
.forEach(btn=>{

btn.classList.toggle(
"active",
btn.dataset.tf === currentTF
);

});

syncCoinsTfLabel(currentTF);

}

/* =========================================================
   START
========================================================= */

document.addEventListener("click", e=>{

if(
e.target.closest(".coin-flag-wrap")
){
return;
}

closeAllCoinFlagMenus();

});

async function refreshCoinsMarketUi(){

try{

await initSymbols();

}catch(err){

console.error(
"Terminal symbols:",
err
);

allBybitSymbols = [];
newListings = [];

}

if(
hasUrlSymbol &&
currentSymbol &&
!getCurrentSymbols().includes(currentSymbol)
){
hasUrlSymbol = false;
}

generateMarketData();

await primeTickerSnapshots();

resizeCharts();

renderList();

startTickerStream();

}

async function init(){

void ensureCloudReady().then(()=>{
void drawingTools?.refreshDrawToolsAccessUiAsync?.();
});

applyCoinsPrefs();

favorites =
loadFavoritesGroups();

const marketFilter =
document.getElementById("market-filter");

if(marketFilter){
marketFilter.value = currentDataset;
}

if(!hasUrlSymbol){
resolveInitialSymbolAndTf();
}else if(
!COINS_TF_VALUES.has(currentTF)
){
currentTF = "60";
}

setCoinsChartSymbol(
currentSymbol || displaySymbol
);

applyUrlTimeframe();

await loadSymbol(
currentSymbol || displaySymbol || "BTCUSDT"
);

initCoinsMobileUi({
getTf: ()=> currentTF,
onTfChange: setCoinsTimeframe,
wireDrawToolsMenu:(
container
)=>{
if(
!container ||
!drawingTools
){
return;
}

wireCoinsMobileDrawToolsMenu(
container,
{
pickTool:(
name
)=>{
drawingTools.pickDrawTool(
name
);
},
onClearAll:()=>
drawingTools.clearAllDrawings?.() ??
false
}
);
}
});

void drawingTools?.refreshDrawToolsAccessUiAsync?.();

void refreshCoinsMarketUi();

syncCoinsTabletListNav();

}

function flushCoinsPrefs(){

persistCoinsPrefs();

}

window.addEventListener(
"alert-streams-sync",
()=>{
syncBackgroundAlertStreams(
currentSymbol,
currentTF
);
}
);

window.addEventListener(
"beforeunload",
flushCoinsPrefs
);

window.addEventListener(
"pagehide",
flushCoinsPrefs
);

document.addEventListener(
"visibilitychange",
()=>{

if(document.visibilityState === "hidden"){
flushCoinsPrefs();
}

}
);

bootstrapCoinsPageState();

setCoinsChartSymbol(
currentSymbol
);

applyUrlTimeframe();

init();
