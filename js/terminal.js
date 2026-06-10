import {
loadBybitHistory,
loadBybitSymbols,
peekBybitSymbolsCache
} from "./api.js?v=27";

import {
buildCoinsMarketLists,
isBybitCoinsDataset
} from "./bybit-listings.js?v=5";

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
} from "./auth-ui.js?v=27";

import {
persistFavoritesToCloud,
onFavoritesRemoteUpdate
} from "./cloud-sync.js?v=34";

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
getVisibleCandlesPriceRange,
positionTabletProbeCrosshair,
hideTabletProbeCrosshair,
mountAxisDoubleTapReset,
TABLET_USE_CUSTOM_TOUCH_PAN,
isTabletChartViewport,
isUserCrosshairEvent,
resetChartPriceAutoScale,
computeChartFutureMarginBars,
appendFutureWhitespaceBars,
coinsTfVisibleBars,
applyCoinsChartViewport,
refreshCoinsChartBarSpacing,
tfPeriodSec
} from "./chart-import.js?v=25";

import {
mountCoinsTabletController
} from "./coins-tablet-controller.js?v=5";

import {
disconnectKlineStream
} from "./ws.js?v=15";

import {
syncBackgroundAlertStreams
} from "./alert-monitor.js?v=64";

import {
initWidgetDrawings
} from "./chart-widget-host.js?v=3";

import {
mountDrawToolbar,
mountDrawToolIcons
} from "./draw-ui-shared.js?v=12";

import {
initCoinsMobileUi,
wireCoinsMobileDrawToolsMenu,
isCoinsMobile,
syncCoinsTfLabel
} from "./coins-mobile.js?v=5";

import {
registerCoinsState,
coinsState,
marketMap,
coinElements,
COINS_TF_VALUES,
COINS_MARKETS,
isCoinsPage
} from "./terminal/coins-state.js?v=5";

import {
readCoinsPrefs,
writeCoinsPrefs,
persistCoinsPrefs,
bootstrapCoinsPageState,
resolveInitialSymbolAndTf,
applyCoinsPrefs,
applySortForCurrentMarket,
readUrlParams
} from "./terminal/coins-prefs.js?v=6";

import {
getCurrentSymbols,
generateMarketData,
scheduleResortPriceColumns,
primeTickerSnapshots,
startTickerStream,
startRealtime,
renderList,
highlightActiveSymbol,
getVisibleSymbolList,
setCoinsTableHooks,
syncCoinListFreezeFromFlagMenus
} from "./terminal/coins-table.js?v=7";

let currentDataset = "all";
let currentTF = "60";
let currentSymbol = "BTCUSDT";
let isCoinsChartInverted =
false;
let isCoinsRsiInverted =
false;
let drawingTools =
null;

/** То, что показано в #current-symbol (не сбрасывается на BTC при переключении). */
let displaySymbol =
"";

let candles = [];
let symbolLoadSeq = 0;
let marketData = [];


let innerSortMode = "symbol";
let sortAsc = true;
let flagSortActive = false;
let flagSortAsc = true;

let searchQuery = "";
let hasUrlSymbol = false;

let favorites =
loadFavoritesGroups();

let allListings = [];
let allBybitSymbols = [];
let newListings = [];
let innovationListings = [];
let stockListings = [];
let commodityListings = [];
let forexListings = [];

let chart = null;
let candleSeries = null;
let rsiChart = null;

registerCoinsState({

get currentDataset(){
return currentDataset;
},
set currentDataset(v){
currentDataset = v;
},

get currentTF(){
return currentTF;
},
set currentTF(v){
currentTF = v;
},

get currentSymbol(){
return currentSymbol;
},
set currentSymbol(v){
currentSymbol = v;
},

get isCoinsChartInverted(){
return isCoinsChartInverted;
},
set isCoinsChartInverted(v){
isCoinsChartInverted = v;
},

get isCoinsRsiInverted(){
return isCoinsRsiInverted;
},
set isCoinsRsiInverted(v){
isCoinsRsiInverted = v;
},

get displaySymbol(){
return displaySymbol;
},
set displaySymbol(v){
displaySymbol = v;
},

get candles(){
return candles;
},
set candles(v){
candles = v;
},

get symbolLoadSeq(){
return symbolLoadSeq;
},
set symbolLoadSeq(v){
symbolLoadSeq = v;
},

get marketData(){
return marketData;
},
set marketData(v){
marketData = v;
},

get innerSortMode(){
return innerSortMode;
},
set innerSortMode(v){
innerSortMode = v;
},

get sortAsc(){
return sortAsc;
},
set sortAsc(v){
sortAsc = v;
},

get flagSortActive(){
return flagSortActive;
},
set flagSortActive(v){
flagSortActive = v;
},

get flagSortAsc(){
return flagSortAsc;
},
set flagSortAsc(v){
flagSortAsc = v;
},

get searchQuery(){
return searchQuery;
},
set searchQuery(v){
searchQuery = v;
},

get hasUrlSymbol(){
return hasUrlSymbol;
},
set hasUrlSymbol(v){
hasUrlSymbol = v;
},

get favorites(){
return favorites;
},
set favorites(v){
favorites = v;
},

get allListings(){
return allListings;
},
set allListings(v){
allListings = v;
},

get allBybitSymbols(){
return allBybitSymbols;
},
set allBybitSymbols(v){
allBybitSymbols = v;
},

get newListings(){
return newListings;
},
set newListings(v){
newListings = v;
},

get innovationListings(){
return innovationListings;
},
set innovationListings(v){
innovationListings = v;
},

get stockListings(){
return stockListings;
},
set stockListings(v){
stockListings = v;
},

get commodityListings(){
return commodityListings;
},
set commodityListings(v){
commodityListings = v;
},

get forexListings(){
return forexListings;
},
set forexListings(v){
forexListings = v;
},

get candleSeries(){
return candleSeries;
},
set candleSeries(v){
candleSeries = v;
},

get chart(){
return chart;
},
set chart(v){
chart = v;
},

get rsiChart(){
return rsiChart;
},
set rsiChart(v){
rsiChart = v;
},

get drawingTools(){
return drawingTools;
},
set drawingTools(v){
drawingTools = v;
}

});




/* =========================================================
   SYMBOLS
========================================================= */


/* =========================================================
   CHARTS
========================================================= */

const mainChart =
createCandlestickChart(
document.getElementById("chart")
);

chart =
mainChart.chart;

candleSeries =
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

drawingTools?.scheduleRedraw?.();

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

function applyCoinsRsiInversion(
inverted
){

isCoinsRsiInverted =
!!inverted;

try{
rsiChart?.priceScale?.(
"right"
)?.applyOptions?.({
invertScale:
isCoinsRsiInverted
});
}catch{
/* ignore */
}

}

function persistCoinsRsiInversion(){

if(
!isCoinsPage
){
return;
}

const prefs =
readCoinsPrefs();

prefs.invertRsiChart =
isCoinsRsiInverted;

writeCoinsPrefs(prefs);

}

function toggleCoinsRsiInversion(){

if(
!isCoinsPage
){
return;
}

applyCoinsRsiInversion(
!isCoinsRsiInverted
);
persistCoinsRsiInversion();

}

function mountCoinsScaleInvertMenu(){

if(
!isCoinsPage ||
!chartWrapEl ||
!chartEl
){
return ()=>{};
}

const rsiWrapEl =
document.getElementById(
"rsi-wrap"
);

const rsiChartEl =
document.getElementById(
"rsi-chart"
);

const scaleStripEl =
document.getElementById(
"price-scale-touch-strip"
);

const rsiScaleStripEl =
document.getElementById(
"rsi-scale-touch-strip"
);

/** Длиннее окна double-tap по шкале (~320–500 ms), короче случайного long-press при pan */
const HOLD_MS =
520;

const menu =
document.createElement("div");
menu.className =
"chart-scale-context-menu hidden";

const item =
document.createElement("button");
item.type = "button";
item.className =
"chart-scale-context-menu-item";
menu.appendChild(item);
document.body.appendChild(menu);

let menuTarget =
"price";

function syncMenuLabel(){

const inverted =
menuTarget ===
"rsi"
? isCoinsRsiInverted
: isCoinsChartInverted;

item.textContent =
inverted
? "Вернуть обычную шкалу"
: "Перевернуть график";

item.setAttribute(
"aria-pressed",
inverted
? "true"
: "false"
);

}

syncMenuLabel();

let touchHoldTimer =
null;
let touchStartX = 0;
let touchStartY = 0;

function hideMenu(){
menu.classList.add("hidden");
}

function showMenuAt(
clientX,
clientY,
target =
menuTarget
){

menuTarget =
target ===
"rsi"
? "rsi"
: "price";

syncMenuLabel();

const margin = 8;
menu.classList.remove("hidden");
menu.style.left = "0px";
menu.style.top = "0px";

const menuRect =
menu.getBoundingClientRect();
const anchorEl =
menuTarget ===
"rsi"
? rsiChartEl
: chartEl;

if(
!anchorEl
){
hideMenu();
return;
}

const chartRect =
anchorEl.getBoundingClientRect();
const scaleChart =
menuTarget ===
"rsi"
? rsiChart
: chart;

const scaleW =
scaleChart?.priceScale?.(
"right"
)?.width?.() ||
56;

const scaleLeft =
chartRect.right - scaleW;

let left =
Math.round(
scaleLeft - menuRect.width
);
let top =
Math.round(
clientY - menuRect.height / 2
);

const chartLeft =
chartRect.left + margin;

if(
left <
chartLeft
){
left =
Math.round(
chartLeft
);
}

left = Math.max(
margin,
left
);

if(
top + menuRect.height >
window.innerHeight - margin
){
top =
window.innerHeight - margin - menuRect.height;
}

if(
top <
margin
){
top =
margin;
}

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

function isInRsiScale(
clientX,
clientY
){

if(
!rsiChartEl
){
return false;
}

const rect =
rsiChartEl.getBoundingClientRect();
const localX =
clientX - rect.left;
const localY =
clientY - rect.top;
const scaleW =
rsiChart?.priceScale?.(
"right"
)?.width?.() || 56;

return (
localY >= 0 &&
localY <= rect.height &&
localX >= rect.width - scaleW &&
localX <= rect.width
);

}

function resolveTouchTarget(
stripEl,
wrapEl
){

if(
stripEl &&
getComputedStyle(
stripEl
).display !==
"none"
){
return stripEl;
}

return wrapEl;

}

const touchTargetEl =
resolveTouchTarget(
scaleStripEl,
chartWrapEl
);

const rsiTouchTargetEl =
rsiWrapEl
? resolveTouchTarget(
rsiScaleStripEl,
rsiWrapEl
)
: null;

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
e.clientY,
"price"
);

};

const onRsiDesktopContextMenu =
e=>{

if(
!isInRsiScale(
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
e.clientY,
"rsi"
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

function bindTouchHold(
targetEl,
hitScale,
scaleTarget
){

if(
!targetEl
){
return ()=>{};
}

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
targetEl === chartWrapEl &&
!hitScale(
t.clientX,
t.clientY
)
){
return;
}

if(
targetEl === rsiWrapEl &&
!hitScale(
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
touchStartY,
scaleTarget
);
},
HOLD_MS
);

};

const cap =
{ capture:true, passive:true };

targetEl.addEventListener(
"touchstart",
onTouchStart,
cap
);
targetEl.addEventListener(
"touchmove",
onTouchMove,
cap
);
targetEl.addEventListener(
"touchend",
onTouchEnd,
cap
);
targetEl.addEventListener(
"touchcancel",
onTouchEnd,
cap
);

return ()=>{
targetEl.removeEventListener(
"touchstart",
onTouchStart,
true
);
targetEl.removeEventListener(
"touchmove",
onTouchMove,
true
);
targetEl.removeEventListener(
"touchend",
onTouchEnd,
true
);
targetEl.removeEventListener(
"touchcancel",
onTouchEnd,
true
);
};

}

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

if(
menuTarget ===
"rsi"
){
toggleCoinsRsiInversion();
}else{
toggleCoinsChartInversion();
}

syncMenuLabel();
hideMenu();
}
);

chartWrapEl.addEventListener(
"contextmenu",
onDesktopContextMenu,
true
);

if(
rsiWrapEl
){
rsiWrapEl.addEventListener(
"contextmenu",
onRsiDesktopContextMenu,
true
);
}

const unbindPriceTouch =
bindTouchHold(
touchTargetEl,
isInPriceScale,
"price"
);

const unbindRsiTouch =
bindTouchHold(
rsiTouchTargetEl,
isInRsiScale,
"rsi"
);

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

return ()=>{
hideMenu();
clearTimeout(touchHoldTimer);
chartWrapEl.removeEventListener(
"contextmenu",
onDesktopContextMenu,
true
);
if(
rsiWrapEl
){
rsiWrapEl.removeEventListener(
"contextmenu",
onRsiDesktopContextMenu,
true
);
}
unbindPriceTouch();
unbindRsiTouch();
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
menu.remove();
};

}

markTabletChartBody();

let unmountCoinsScaleInvertMenu =
()=>{};

if(
isCoinsPage
){
applyCoinsChartInversion(
readCoinsPrefs().invertChart === true
);
unmountCoinsScaleInvertMenu =
mountCoinsScaleInvertMenu();
}

let priceHudCtrl = {
stop(){},
refresh(){}
};

let unmountTabletGestures =
()=>{};

let unmountTabletCrosshair =
()=>{};

/** iPad: true пока удержание probe (блокирует sync RSI pan) */
function isTabletCrosshairProbeLocked(){

return !!coinsTabletCtrl?.getProbeActive?.();

}

let abortTabletPan =
()=>{};

let cancelTabletPanGesture =
()=>{};

let coinsTabletCtrl =
null;

/* =========================================================
   CHART INIT (price scale, RSI)
========================================================= */

const priceScaleTouchHooks = {
getFallbackPriceRange(){
return getVisibleCandlesPriceRange(
chart,
candleSeries
);
},
onInteraction(){
priceHudCtrl.refresh?.();
},
onScaleFrame(){},
onDragStart(){},
onDragEnd(){},
onReset(){}
};

let tabletPriceScaleCtrl =
mountTabletPriceScaleTouch(
chart,
document.getElementById(
"price-scale-touch-strip"
),
chartEl,
candleSeries,
priceScaleTouchHooks
);

function resetTabletPriceScale(){

if(
tabletPriceScaleCtrl?.resetPriceAutoScale
){
tabletPriceScaleCtrl.resetPriceAutoScale();
return;
}

resetChartPriceAutoScale(
chart,
candleSeries
);
priceScaleTouchHooks.onReset?.();

}

applyTabletMainChartScroll(
chart
);

const rsi =
createRSIChart(
document.getElementById("rsi-chart")
);

rsiChart =
rsi.chart;

applyCoinsRsiInversion(
readCoinsPrefs().invertRsiChart === true
);

const rsiSeries =
rsi.series;

let coinsFutureTimeAnchorSeries =
rsiChart.addLineSeries({

color:
"rgba(0,0,0,0)",

lineWidth:
1,

lastValueVisible:
false,

priceLineVisible:
false,

crosshairMarkerVisible:
false,

autoscaleInfoProvider:
()=>({

priceRange:{

minValue:
0,

maxValue:
100

}

})

});

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

function syncCoinsFutureTimeAnchorSeries(){

if(
!coinsFutureTimeAnchorSeries ||
!candles.length
){
return;
}

const visibleBars =
coinsTfVisibleBars(
currentTF,
candles.length
);

const futureMargin =
computeChartFutureMarginBars(
visibleBars
);

if(
futureMargin <
1
){

coinsFutureTimeAnchorSeries.setData(
[]
);

return;

}

const period =
tfPeriodSec(
currentTF
);

const lastTime =
candles[
candles.length -
1
].time;

const anchor =
[];

for(
let i =
1;
i <=
futureMargin;
i++
){

anchor.push({
time:
lastTime +
period *
i
});

}

coinsFutureTimeAnchorSeries.setData(
anchor
);

}

function buildRsiDisplayPoints(){

if(
!rsiPointsCache?.length
){
return [];
}

const visibleBars =
coinsTfVisibleBars(
currentTF,
candles.length
);

const futureMargin =
computeChartFutureMarginBars(
visibleBars
);

return appendFutureWhitespaceBars(
rsiPointsCache,
futureMargin,
currentTF
);

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
buildRsiDisplayPoints()
);

syncCoinsFutureTimeAnchorSeries();

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
chartWrapEl,
chartEl,
linkedWrapEl:document.getElementById(
"rsi-wrap"
),
linkedChartEl:document.getElementById(
"rsi-chart"
),
crosshairTimeLabelEl:document.getElementById(
"crosshair-time-label"
),
crosshairPriceLabelEl:document.getElementById(
"crosshair-price-label"
),
onLinkedCrosshairTime:updateRsiHudFromCrosshairTime,
onLinkedCrosshairRsiValue:setRsiHudValue,
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

document.body.classList.remove(
"drawings-tablet-test-off"
);

try{

mountDrawToolbar(
document.getElementById("draw-toolbar")
);
mountDrawToolIcons(
document
);

drawingTools =
initWidgetDrawings({

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
chartWrapEl: document.getElementById(
"chart-wrap"
),
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
priceLabelEl: document.getElementById(
"crosshair-price-label"
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
priceLabelEl: document.getElementById(
"crosshair-price-label"
),
chartWrapEl: document.getElementById(
"chart-wrap"
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

if(
!drawingTools
){
console.warn(
"Drawings unavailable on coins page"
);
}

}catch(err){

console.error("Drawings UI mount failed:", err);

}

if(
drawingTools
){

priceScaleTouchHooks.onScaleFrame =
range=>{
priceHudCtrl.refresh?.();
drawingTools?.applyPriceScaleFrame?.(
range
);
};

priceScaleTouchHooks.onDragStart =
range=>{
drawingTools?.beginPriceScaleDragRedraw?.(
range
);
};

priceScaleTouchHooks.onDragEnd =
()=>{
drawingTools?.endPriceScaleDragRedraw?.();
};

priceScaleTouchHooks.onReset =
()=>{
drawingTools?.endPriceScaleDragRedraw?.();
drawingTools?.scheduleRedraw?.();
};

void import("./price-alert-ui.js?v=37").then(({ mountPriceAlertUi })=>{
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
TABLET_USE_CUSTOM_TOUCH_PAN &&
isTabletChartViewport()
){

void mountCoinsTabletController({
chart,
chartEl,
chartTouchLayerEl,
chartWrapEl,
rsiChart,
candleSeries,
getDrawingTools: ()=> drawingTools,
updateRsiHudFromCrosshairTime,
getRsiHudFallbackValue(){
const last =
rsiPointsCache[
rsiPointsCache.length -
1
];

return (
last?.value ??
null
);
},
setRsiHudValue
}).then(
ctrl=>{

coinsTabletCtrl =
ctrl;

abortTabletPan =
ctrl.abortPan;

cancelTabletPanGesture =
ctrl.cancelCurrentGesture;

unmountTabletGestures =
ctrl.dispose;

unmountTabletCrosshair =
ctrl.dispose;

}
).catch(
err=>{
console.warn(
"Coins tablet controller:",
err
);
}
);

}

/* =========================================================
   SYMBOLS
========================================================= */

async function initSymbols(
options = {}
){

const list =
await loadBybitSymbols(
options
);

applyInstrumentLists(
list
);

}

function applyInstrumentLists(
list
){

const lists =
buildCoinsMarketLists(
list
);

coinsState().allListings =
lists.all;

coinsState().allBybitSymbols =
lists.crypto;

coinsState().newListings =
lists.new;

coinsState().innovationListings =
lists.innovation;

coinsState().stockListings =
lists.stocks;

coinsState().commodityListings =
lists.commodities;

coinsState().forexListings =
lists.forex;

}

function coinsMarketHasSymbols(
market
){

const map = {
all:coinsState().allListings,
crypto:coinsState().allBybitSymbols,
new:coinsState().newListings,
innovation:coinsState().innovationListings,
stocks:coinsState().stockListings,
commodities:coinsState().commodityListings,
forex:coinsState().forexListings
};

return !!(
map[
market
]?.length
);

}

async function switchCoinsMarket(
nextMarket
){

if(
!COINS_MARKETS.includes(
nextMarket
)
){
return;
}

disconnectKlineStream();

coinsState().currentDataset =
nextMarket;

applySortForCurrentMarket();
persistCoinsPrefs();

coinsState().searchQuery =
"";
searchQuery =
"";

const searchInput =
document.getElementById(
"coin-search"
);

if(
searchInput
){
searchInput.value =
"";
}

if(
isBybitCoinsDataset(
nextMarket
) &&
!coinsMarketHasSymbols(
nextMarket
)
){

try{
await initSymbols({
forceNetwork:true
});
}catch(
err
){
console.warn(
"Terminal market symbols:",
err?.message ||
err
);
}

}

generateMarketData();

await primeTickerSnapshots();

renderList();

resolveInitialSymbolAndTf();

applyUrlTimeframe();
setCoinsChartSymbol(
currentSymbol
);

if(
currentSymbol
){
await loadSymbol(
currentSymbol
);
}

}

function restoreSymbolsFromStaleCache(){

if(
allListings.length ||
allBybitSymbols.length
){
return true;
}

const stale =
peekBybitSymbolsCache();

if(
!stale?.length
){
return false;
}

applyInstrumentLists(
stale
);

return (
allListings.length >
0 ||
allBybitSymbols.length >
0
);

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
isBybitCoinsDataset(
currentDataset
)
){
void reloadTerminalBybitData();
}

}
);

window.addEventListener(
"bybit-symbols-updated",
e=>{

const symbols =
e.detail?.symbols;

if(
!Array.isArray(symbols) ||
!symbols.length
){
return;
}

applyInstrumentLists(
symbols
);

generateMarketData();
renderList();

}
);


/* =========================================================
   DEFAULT ZOOM
========================================================= */

function buildChartDisplayCandles(){

if(
!candles.length
){
return [];
}

const visibleBars =
coinsTfVisibleBars(
currentTF,
candles.length
);

const futureMargin =
computeChartFutureMarginBars(
visibleBars
);

return appendFutureWhitespaceBars(
candles,
futureMargin,
currentTF
);

}

function applyChartDimensions(){

const chartWrap =
document.getElementById(
"chart-wrap"
);

const rsiEl =
document.getElementById(
"rsi-chart"
);

if(
!chartWrap ||
!rsiEl ||
!chart ||
!rsiChart
){
return false;
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
w <
2 ||
chartH <
2 ||
rsiH <
2
){
return false;
}

chart.applyOptions({
width:w,
height:chartH
});

rsiChart.applyOptions({
width:w,
height:rsiH
});

return true;

}

function settleCoinsChartViewport(){

if(
!candles.length ||
!chart ||
!rsiChart
){
return;
}

const chartWrap =
document.getElementById(
"chart-wrap"
);

const chartWidth =
Math.max(
chartWrap?.clientWidth ||
0,
chartEl?.clientWidth ||
0,
1
);

applyCoinsChartViewport(
chart,
rsiChart,
buildChartDisplayCandles(),
currentTF,
chartWidth,
candles.length
);

layoutRsiBand();

}

let coinsViewportSettleRaf =
0;

function applyDefaultZoom(){

if(
!candles.length
){
return;
}

const run =
()=>{
applyChartDimensions();
settleCoinsChartViewport();
drawingTools?.resize?.();
drawingTools?.scheduleRedraw?.();
};

run();

if(
coinsViewportSettleRaf
){
cancelAnimationFrame(
coinsViewportSettleRaf
);
}

coinsViewportSettleRaf =
requestAnimationFrame(
()=>{
coinsViewportSettleRaf =
0;
run();
}
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

if(
coinsViewportSettleRaf
){

cancelAnimationFrame(
coinsViewportSettleRaf
);

coinsViewportSettleRaf =
0;

}

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

if(loadSeq !== symbolLoadSeq){
return;
}

candles = nextCandles;

if(
!candles.length &&
isBybitCoinsDataset(
currentDataset
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

candleSeries.setData(
buildChartDisplayCandles()
);

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

let coinsResizeRaf =
0;

function resizeCharts(){

if(
!applyChartDimensions()
){
return;
}

if(
candles.length
){

refreshCoinsChartBarSpacing(
chart,
rsiChart
);

layoutRsiBand();

}

drawingTools?.resize?.();
drawingTools?.scheduleRedraw?.();

}

function scheduleResizeCharts(){

if(
coinsResizeRaf
){
cancelAnimationFrame(
coinsResizeRaf
);
}

coinsResizeRaf =
requestAnimationFrame(
()=>{
coinsResizeRaf =
0;
resizeCharts();
}
);

}

window.addEventListener(
"resize",
scheduleResizeCharts
);

const chartWrapForResize =
document.getElementById("chart-wrap");

if(
chartWrapForResize &&
typeof ResizeObserver !==
"undefined"
){

const chartResizeObserver =
new ResizeObserver(
scheduleResizeCharts
);

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
isLocked: isTabletCrosshairProbeLocked
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

const marketFilterEl =
document.getElementById(
"market-filter"
);

marketFilterEl?.addEventListener(
"change",
async e=>{

await switchCoinsMarket(
e.target.value
);

}
);

/* =========================================================
   TABLE
========================================================= */


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

syncCoinListFreezeFromFlagMenus();

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

if(
symbol === (
currentSymbol ||
displaySymbol
)
){
updateCoinsChartHeaderFlag(
symbol
);
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

btn.className =
"flag coin-flag-btn screener-flag-btn";

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

function getCoinsChartHeaderFlagBtn(){

return document.querySelector(
"[data-chart-header-flag]"
);

}

function updateCoinsChartHeaderFlag(
symbol
){

const sym =
String(
symbol ||
currentSymbol ||
displaySymbol ||
""
).trim().toUpperCase();

const btn =
getCoinsChartHeaderFlagBtn();

if(
!btn ||
!sym
){
return;
}

updateCoinFlagButton(
btn,
sym
);

}

function mountCoinsChartHeaderFlag(){

const flagWrap =
document.getElementById(
"coins-chart-flag-wrap"
);

const flagTrigger =
flagWrap?.querySelector(
"[data-coin-flag-trigger]"
);

const flagMenu =
flagWrap?.querySelector(
".coin-flag-menu"
);

if(
!flagWrap ||
!flagTrigger ||
!flagMenu
){
return;
}

flagTrigger.addEventListener(
"click",
e=>{

e.stopPropagation();

const open =
!flagMenu.classList.contains(
"hidden"
);

closeAllCoinFlagMenus(
flagWrap
);

if(
open
){
flagMenu.classList.add(
"hidden"
);
flagTrigger.setAttribute(
"aria-expanded",
"false"
);
}else{
flagMenu.classList.remove(
"hidden"
);
flagTrigger.setAttribute(
"aria-expanded",
"true"
);
}

syncCoinListFreezeFromFlagMenus();

}
);

flagMenu.querySelectorAll(
"[data-flag-group]"
).forEach(
btn=>{

btn.addEventListener(
"click",
e=>{

e.stopPropagation();

const sym =
currentSymbol ||
displaySymbol;

if(
!sym
){
return;
}

flagMenu.classList.add(
"hidden"
);
flagTrigger.setAttribute(
"aria-expanded",
"false"
);
syncCoinListFreezeFromFlagMenus();

applyCoinFavoriteGroup(
sym,
btn.dataset.flagGroup
);

}
);

}
);

updateCoinsChartHeaderFlag(
currentSymbol ||
displaySymbol
);

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

updateCoinsChartHeaderFlag(
currentSymbol ||
displaySymbol
);

}

onFavoritesRemoteUpdate(()=>{

syncFavoriteButtonsFromStorage();

if(flagSortActive){
renderList();
}

});


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

function syncCoinsTabletListNav(){

const show =
isCoinsPage &&
isTabletChartViewport() &&
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

window.addEventListener(
"resize",
syncCoinsTabletListNav,
{
passive:true
}
);

/* =========================================================
   URL PARAMS
========================================================= */


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
isBybitCoinsDataset(
currentDataset
)
){
return /\.P$/i.test(sym)
? sym
: sym + ".P";
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

updateCoinsChartHeaderFlag(
sym
);

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

}catch(
err
){

console.warn(
"Terminal symbols:",
err
);

restoreSymbolsFromStaleCache();

}

if(
isBybitCoinsDataset(
currentDataset
) &&
!coinsMarketHasSymbols(
currentDataset
)
){

try{

await initSymbols({
forceNetwork:true
});

}catch(
retryErr
){

console.warn(
"Terminal symbols retry:",
retryErr
);

restoreSymbolsFromStaleCache();

}

}

if(
hasUrlSymbol &&
currentSymbol &&
!getCurrentSymbols().includes(currentSymbol)
){
hasUrlSymbol = false;
}

generateMarketData();

renderList();

try{

await primeTickerSnapshots();

}catch(
err
){

console.warn(
"Terminal tickers:",
err
);

}

renderList();

resizeCharts();

startTickerStream();

}

async function init(){

void ensureCloudReady().then(()=>{
void drawingTools?.refreshDrawToolsAccessUiAsync?.();
});

applyCoinsPrefs();

mountCoinsChartHeaderFlag();

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

await refreshCoinsMarketUi().catch(
err=>{
console.warn(
"Terminal market ui:",
err
);
}
);

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

window.__coinsChartDebug =
function(){

const lastIdx =
Math.max(
0,
(candles?.length ||
1) -
1
);

const lastBarX =
chart?.timeScale?.()?.logicalToCoordinate?.(
lastIdx
);

const chartW =
chartEl?.clientWidth ||
0;

const plotW =
chart?.timeScale?.()?.width?.() ||
0;

const rsiPlotW =
rsiChart?.timeScale?.()?.width?.() ||
0;

const rsiLastBarX =
rsiChart?.timeScale?.()?.logicalToCoordinate?.(
lastIdx
);

return {
build:
"20260609-future-timescale-v10",
candles:
candles?.length ||
0,
mainRange:
chart?.timeScale?.()?.getVisibleLogicalRange?.(),
rsiRange:
rsiChart?.timeScale?.()?.getVisibleLogicalRange?.(),
mainRightOffset:
chart?.timeScale?.()?.options?.()?.rightOffset,
rsiRightOffset:
rsiChart?.timeScale?.()?.options?.()?.rightOffset,
mainBarSpacing:
chart?.timeScale?.()?.options?.()?.barSpacing,
lastBarX,
chartW,
plotW,
mainFutureGapPx:
Number.isFinite(
lastBarX
) &&
Number.isFinite(
plotW
) &&
plotW >
0
? plotW -
lastBarX
: (
Number.isFinite(
lastBarX
) &&
Number.isFinite(
chartW
)
? chartW -
lastBarX
: null
),
rsiFutureGapPx:
Number.isFinite(
rsiLastBarX
) &&
Number.isFinite(
rsiPlotW
)
? rsiPlotW -
rsiLastBarX
: null
};

};

setCoinsTableHooks({
setCoinsChartSymbol,
loadSymbol,
closeAllCoinFlagMenus,
applyCoinFavoriteGroup,
updateCoinFlagButton,
rebuildRsiFromCandles
});

setCoinsChartSymbol(
currentSymbol
);

applyUrlTimeframe();

init();
