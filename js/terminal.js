/**
 * Coins page (/coins.html) — main chart app implementation.
 *
 * Entry: terminal-entry.js (canonical). This file keeps the legacy name `terminal.js`.
 * Dashboard widgets page (/terminal.html) is `watchlist.js` — not this module.
 */
import {
loadMarketHistory,
loadMarketSymbols,
buildMarketLists,
peekMarketSymbolsCache,
isActiveRealtimeMarketDataset,
formatExchangeDisplayLabel,
getActiveCoinsMarkets,
getActiveExchangeMarkets,
getActiveExchangeId,
EXCHANGE_CHANGED_EVENT
} from "./market-api.js?v=1";

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
flagSortRank,
canSetBlueFlag
} from "./favorites.js?v=4";

import {
ensureCloudReady
} from "./auth-ui.js?v=40";

import {
persistFavoritesToCloud,
onFavoritesRemoteUpdate
} from "./cloud-sync.js?v=42";

import {
createCandlestickChart,
createRSIChart,
applyRsiFixedPriceScale,
applyChartPriceFormat,
mountChartPriceHud,
syncLinkedChartTimescales,
linkPairedChartTimeScales,
linkChartsCrosshair,
updateRsiBandLayout,
updateRsiLevelLinesLayout,
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
pulsePriceScaleAutoscale,
computeChartFutureMarginBars,
appendFutureWhitespaceBars,
coinsTfVisibleBars,
applyCoinsChartViewport,
refreshCoinsChartBarSpacing,
tfPeriodSec
} from "./chart-import.js?v=43";

import {
mountCoinsTabletController
} from "./terminal-tablet-controller.js?v=6";

import {
disconnectKlineStream
} from "./market-ws.js?v=1";

import {
syncBackgroundAlertStreams
} from "./alert-monitor.js?v=67";

import {
createSharedDrawUndoStack
} from "./drawings/draw-undo.js?v=2";

import {
initWidgetDrawings
} from "./chart-widget-host.js?v=15";

import {
mountDrawToolbar,
mountDrawToolIcons
} from "./draw-ui-shared.js?v=30";

import {
initChartIndicators
} from "./chart-indicators.js?v=37";

import {
mountCoinsLayoutResize
} from "./terminal-layout-resize.js?v=7";

import {
mountQwertyKeyInput
} from "./qwerty-key-input.js?v=1";

import {
setChartLayoutReady
} from "./chart-layout-gate.js?v=2";

import {
registerCoinsState,
coinsState,
marketMap,
coinElements,
COINS_TF_VALUES,
COINS_TF_HOTKEYS,
COINS_MARKETS,
isTerminalPage,
isTradePage
} from "./terminal/terminal-state.js?v=9";

import {
stopTickerStream
} from "./tickers.js?v=23";

import {
mountCoinsListRefreshControls,
applyCoinsListRefreshInterval
} from "./terminal-list-refresh.js?v=1";

import {
readCoinsPrefs,
writeCoinsPrefs,
persistCoinsPrefs,
bootstrapCoinsPageState,
resolveInitialSymbolAndTf,
applyCoinsPrefs,
applySortForCurrentMarket,
readUrlParams
} from "./terminal/terminal-prefs.js?v=11";

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
} from "./terminal/terminal-table.js?v=18";

import {
createCoinsChartSwitchVeil
} from "./terminal/terminal-chart-switch-veil.js?v=7";

import {
registerCoinsChartLayoutContext,
buildChartDisplayCandles,
applyChartDimensions,
settleCoinsChartViewport,
resizeCharts,
scheduleResizeCharts,
applyDefaultZoom
} from "./terminal/terminal-chart-layout.js?v=7";

import {
initTerminalMultiChart,
syncPrimaryTfToLayout,
isTerminalMultiChartLayout
} from "./terminal-multi-chart.js?v=11";

import {
mountTerminalLayoutPicker
} from "./terminal-layout-picker.js?v=11";

import {
mountScriptTerminalStatus
} from "./script-terminal-status.js?v=5";

import {
resumeScriptScanBackgroundJob
} from "./script-scan-background.js?v=8";

let currentDataset = "all";
let currentTF = "60";
let currentSymbol = "BTCUSDT";
let isCoinsChartInverted =
false;
let isCoinsRsiInverted =
false;
let drawingTools =
null;
let rsiDrawingTools =
null;
let activeDrawPane =
"chart";
const sharedDrawUndo =
createSharedDrawUndoStack();
let terminalSharedDrawUndoMounted =
false;
let chartIndicators =
null;
let terminalMultiChartApi =
null;

/** То, что показано в #current-symbol (не сбрасывается на BTC при переключении). */
let displaySymbol =
"";

let candles = [];
let symbolLoadSeq = 0;
const viewportSettleRaf =
{ value: 0 };
let chartSwitchVeil =
null;
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

const chartStackPanesEl =
document.getElementById(
"charts-stack-panes"
);

chartSwitchVeil =
createCoinsChartSwitchVeil(
()=>
chartStackPanesEl,
()=>
symbolLoadSeq
);

const chartEl =
document.getElementById(
"chart"
);

const rsiChartEl =
document.getElementById(
"rsi-chart"
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
!isTerminalPage
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
!isTerminalPage
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
!isTerminalPage
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
!isTerminalPage
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
!isTerminalPage ||
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

item.title =
menuTarget ===
"rsi"
? ""
: inverted
? "Вернуть обычную шкалу (Alt+I)"
: "Перевернуть график (Alt+I)";

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

function onInvertChartHotkey(
e
){

if(
!isTerminalPage
){
return;
}

if(
shouldIgnoreListKeyNav(
e
)
){
return;
}

/*
  Option+I (Mac) и Alt+I (Windows/Linux) — в браузере оба дают altKey.
*/
if(
!e.altKey ||
e.ctrlKey ||
e.metaKey ||
e.code !==
"KeyI"
){
return;
}

e.preventDefault();
hideMenu();
toggleCoinsChartInversion();
syncMenuLabel();

}

document.addEventListener(
"keydown",
onInvertChartHotkey
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
document.removeEventListener(
"keydown",
onInvertChartHotkey
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
isTerminalPage
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

const rsiPriceScaleTouchHooks = {
fixedAutoscaleRange:{
min:0,
max:100
},
scaleMargins:{
top:0,
bottom:0
},
getFallbackPriceRange(){
return {
min:0,
max:100
};
},
onInteraction(){},
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

function resetCoinsChartPriceScale(){

if(
tabletPriceScaleCtrl?.resetPriceAutoScale
){
tabletPriceScaleCtrl.resetPriceAutoScale(
{
force:true
}
);
}else{
pulsePriceScaleAutoscale(
chart,
candleSeries
);
}

priceScaleTouchHooks.onReset?.();
drawingTools?.endPriceScaleDragRedraw?.();
rsiDrawingTools?.endPriceScaleDragRedraw?.();
window.__tradeChartOverlay?.onPriceScaleDragEnd?.();

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

if(
isTabletChartViewport()
){

mountTabletPriceScaleTouch(
rsiChart,
document.getElementById(
"rsi-scale-touch-strip"
),
rsiChartEl,
rsiSeries,
rsiPriceScaleTouchHooks
);

}

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
String(
RSI_PERIOD
);

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

let rsiPaneActive =
true;

function setRsiPaneActive(
active
){

rsiPaneActive =
!!active;

if(
rsiPaneActive
){
rebuildRsiFromCandles();
return;
}

rsiSeries?.setData(
[]
);
syncCoinsFutureTimeAnchorSeries();
layoutRsiBand();
setRsiHudValue(
null
);

}

function rebuildRsiFromCandles(){

if(
!rsiPaneActive
){
chartIndicators?.notifyCandlesUpdate?.();
return;
}

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

applyRsiFixedPriceScale(
rsiChart,
rsiSeries
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

chartIndicators?.notifyCandlesUpdate?.();

rsiDrawingTools?.scheduleRedraw?.();

}

function layoutRsiBand(){

updateRsiBandLayout(
rsiSeries,
document.getElementById(
"rsi-band"
)
);

updateRsiLevelLinesLayout(
rsiSeries,
document.getElementById(
"rsi-wrap"
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

if(
isTerminalMultiChartLayout()
){
document.body.classList.add(
"coins-multi-chart-on",
"coins-drawings-ui-off"
);
}

try{

mountDrawToolbar(
document.getElementById("draw-toolbar")
);
mountDrawToolIcons(
document
);

let mainSetDrawTool =
null;
let rsiSetDrawTool =
null;
const drawClearAllPeers =
{
call:
null
};

drawingTools =
initWidgetDrawings({

chart,
series: candleSeries,
wrapEl: document.getElementById("chart-wrap"),
uiRoot: document.getElementById("chart-wrap"),
toolsRoot: document.getElementById("charts-stack"),
clearAllPeers:
drawClearAllPeers,
getSymbol: ()=> currentSymbol,
getTf: ()=> currentTF,
getCandles: ()=> candles,
isActive: ()=>
activeDrawPane ===
"chart",
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

,
sharedDrawUndo,
deferKeyboardUndo:
true

});

const chartWrapEl =
document.getElementById(
"chart-wrap"
);
const rsiWrapEl =
document.getElementById(
"rsi-wrap"
);

function resolveCoinsDrawPaneFromPointer(
clientY
){

const rsiRect =
rsiWrapEl?.getBoundingClientRect?.();

if(
rsiRect &&
clientY >=
rsiRect.top &&
clientY <=
rsiRect.bottom
){
return "rsi";
}

const chartRect =
chartWrapEl?.getBoundingClientRect?.();

if(
chartRect &&
clientY >=
chartRect.top &&
clientY <=
chartRect.bottom
){
return "chart";
}

return null;

}

function mountTerminalSharedDrawUndoKeyboard(){

if(
terminalSharedDrawUndoMounted
){
return;
}

terminalSharedDrawUndoMounted =
true;

window.addEventListener(
"keydown",
e=>{

if(
!(
(
e.metaKey ||
e.ctrlKey
) &&
e.key ===
"z" &&
!e.shiftKey
)
){
return;
}

const ae =
document.activeElement;
const tag =
ae?.tagName;

if(
tag ===
"INPUT" ||
tag ===
"TEXTAREA" ||
ae?.isContentEditable
){
return;
}

if(
drawingTools?.hasActiveDrawInteraction?.() ||
rsiDrawingTools?.hasActiveDrawInteraction?.()
){
return;
}

if(
!sharedDrawUndo.canUndo()
){
return;
}

sharedDrawUndo.undo();
e.preventDefault();

},
true
);

}

function setActiveDrawPane(
pane
){

const next =
pane ===
"rsi"
? "rsi"
: "chart";

if(
next ===
activeDrawPane
){
return;
}

const prevTools =
activeDrawPane ===
"rsi"
? rsiDrawingTools
: drawingTools;

const prevTool =
prevTools?.getTool?.() ??
"cursor";

if(
prevTool !==
"cursor" &&
prevTools?.blocksDrawPaneSwitch?.()
){
return;
}

activeDrawPane =
next;

if(
prevTool ===
"cursor" ||
!mainSetDrawTool ||
!rsiSetDrawTool
){
return;
}

mainSetDrawTool(
"cursor"
);
rsiSetDrawTool(
"cursor"
);

if(
next ===
"rsi"
){
rsiSetDrawTool(
prevTool
);
}else{
mainSetDrawTool(
prevTool
);
}

}

const chartsStackEl =
document.getElementById(
"charts-stack"
);

chartsStackEl?.addEventListener(
"pointermove",
e=>{

const pane =
resolveCoinsDrawPaneFromPointer(
e.clientY
);

if(
pane
){
setActiveDrawPane(
pane
);
}

},
true
);

chartWrapEl?.addEventListener(
"pointerenter",
()=>
setActiveDrawPane(
"chart"
),
true
);

rsiWrapEl?.addEventListener(
"pointerenter",
()=>
setActiveDrawPane(
"rsi"
),
true
);

function getRsiCandlesForDraw(){

if(
!Array.isArray(
rsiPointsCache
)
){
return [];
}

return rsiPointsCache.map(
point=>({

time:
point.time,

open:
point.value,

high:
point.value,

low:
point.value,

close:
point.value

})
);

}

rsiDrawingTools =
initWidgetDrawings({

chart:
rsiChart,

timeChart:
chart,

series:
rsiSeries,

wrapEl:
rsiWrapEl,

uiRoot:
null,

toolsRoot:
document.getElementById(
"charts-stack"
),

bindToolbar:
false,

styleBar:
false,

mountStyleBar:
false,

storageKeySuffix:
"_rsi",

cloudSync:
false,

drawPriceAlerts:
false,

getSymbol: ()=>
currentSymbol,

getTf: ()=>
currentTF,

getCandles:
getRsiCandlesForDraw,

isActive: ()=>
activeDrawPane ===
"rsi" &&
rsiPaneActive,

barPosKey:
"draw_bar_pos_rsi",

abortTabletChartGesture:()=>{
cancelTabletPanGesture?.();
},

sharedDrawUndo,
deferKeyboardUndo:
true

});

if(
drawingTools &&
rsiDrawingTools
){

mountTerminalSharedDrawUndoKeyboard();

const mainSetTool =
drawingTools.setTool.bind(
drawingTools
);
const rsiSetTool =
rsiDrawingTools.setTool.bind(
rsiDrawingTools
);

mainSetDrawTool =
mainSetTool;
rsiSetDrawTool =
rsiSetTool;

drawingTools.setTool =
next=>{
mainSetTool(
next
);
rsiSetTool(
next
);
};

drawClearAllPeers.call =
()=>{
rsiDrawingTools?.clearAllDrawings?.();
};

}

if(
!drawingTools
){
console.warn(
"Drawings unavailable on coins page"
);
}

chartIndicators =
initChartIndicators(
{
root:
document.getElementById(
"chart-indicators-wrap"
),
getHost:()=>({
chart,
series:
candleSeries,
wrapEl:
document.getElementById(
"chart-wrap"
),
getDrawingTools:()=>
drawingTools,
getSymbol:()=>
currentSymbol,
getCandles:()=>
candles,
getDisplayCandles:()=>
buildChartDisplayCandles(),
getTf:()=>
currentTF,
loadIndicatorHistory:(
symbol,
tf
)=>
loadMarketHistory(
symbol,
tf,
5,
{
parallel:
true,
batchGapMs:
0
}
),
getChartWrapWidth:()=>
document.getElementById(
"chart-wrap"
)?.clientWidth ||
0,
getPaneHeight:()=>{

const wrap =
document.getElementById(
"volume-wrap"
);

if(
!wrap ||
wrap.classList.contains(
"indicator-pane-hidden"
)
){
return 0;
}

return wrap.getBoundingClientRect().height ||
0;

},
rsiChart,
setRsiPaneActive,
isRsiPaneVisible:()=>
rsiPaneActive,
layoutRsiBand,
settleChartViewport:
settleCoinsChartViewport,
onIndicatorToggle(
id,
on
){

if(
id ===
"volume" ||
id ===
"ao" ||
id ===
"rsi"
){
scheduleResizeCharts();

if(
candles.length
){
settleCoinsChartViewport();
}

chartIndicators?.notifyLayoutChange?.();

}

}
})
}
);

registerCoinsChartLayoutContext({
getCandles:()=>
candles,
chart,
chartEl,
getTf:()=>
currentTF,
getChartIndicators:()=>
chartIndicators,
getRsiChart:()=>
rsiChart,
rsiPaneActive:()=>
rsiPaneActive,
layoutRsiBand,
applyCoinsChartViewport,
refreshCoinsChartBarSpacing,
getDrawingTools:()=>
drawingTools,
getLinkedDrawingTools:()=>
rsiDrawingTools
? [
rsiDrawingTools
]
: [],
viewportSettleRaf
});

if(
isTradePage &&
chart &&
candleSeries
){
window.__tradeChartHost =
{
chart,
series:
candleSeries,
wrapEl:
document.getElementById(
"chart-wrap"
),
chartEl:
document.getElementById(
"chart"
),
getSymbol(){
return String(
currentSymbol ||
""
).replace(
/\.P$/i,
""
).trim().toUpperCase();
},
getDrawingTools:()=>
drawingTools
};

window.dispatchEvent(
new CustomEvent(
"trade-chart-host-ready"
)
);

}

}catch(err){

console.error("Drawings UI mount failed:", err);

}

if(
drawingTools ||
isTradePage
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
window.__tradeChartOverlay?.onPriceScaleDragEnd?.();
};

priceScaleTouchHooks.onReset =
()=>{
drawingTools?.endPriceScaleDragRedraw?.();
window.__tradeChartOverlay?.onPriceScaleDragEnd?.();
drawingTools?.scheduleRedraw?.();
};

}

if(
rsiDrawingTools
){

rsiPriceScaleTouchHooks.onScaleFrame =
range=>{
rsiDrawingTools?.applyPriceScaleFrame?.(
range
);
};

rsiPriceScaleTouchHooks.onDragStart =
range=>{
rsiDrawingTools?.beginPriceScaleDragRedraw?.(
range
);
};

rsiPriceScaleTouchHooks.onDragEnd =
()=>{
rsiDrawingTools?.endPriceScaleDragRedraw?.();
};

rsiPriceScaleTouchHooks.onReset =
()=>{
rsiDrawingTools?.endPriceScaleDragRedraw?.();
rsiDrawingTools?.scheduleRedraw?.();
};

}

if(
drawingTools ||
rsiDrawingTools
){

wireCoinsLinkedDrawPanRedraw();

}

if(
drawingTools
){

const mountAlertUi =
async()=>{

let tradePlusHandler =
null;

if(
isTradePage
){
try{
const {
createTradePlusMenuHandler
} =
await import(
"./trade-order-plus-ui.js?v=2"
);

tradePlusHandler =
createTradePlusMenuHandler(
{
getSymbol:()=>
currentSymbol,
getTf:()=>
currentTF,
scheduleRedraw:()=>
(
drawingTools?.scheduleDragRedraw?.() ||
drawingTools?.scheduleRedraw?.()
)
}
);
}catch(
err
){
console.warn(
"trade order plus ui:",
err
);
}
}

const {
mountPriceAlertUi
} =
await import(
"./price-alert-ui.js?v=45"
);

let disposeAlertUi =
mountPriceAlertUi(
{
chart,
series:
candleSeries,
wrapEl:
chartWrapEl,
getSymbol:()=>
currentSymbol,
getTf:()=>
currentTF,
getDrawingTools:()=>
drawingTools,
scheduleRedraw:()=>{
return (
drawingTools?.scheduleDragRedraw?.() ||
drawingTools?.scheduleRedraw?.()
);
},
onCrosshairSuppress:()=>{
chartCrosshairLink?.setSuppressed?.(
true
);
},
onCrosshairRelease:()=>{
chartCrosshairLink?.setSuppressed?.(
false
);
},
onPlusActivate:
tradePlusHandler
}
);

};

void mountAlertUi().catch(
err=>{
console.warn(
"price alert ui:",
err
);
}
);

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
await loadMarketSymbols(
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
buildMarketLists(
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
!getActiveCoinsMarkets().includes(
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
isActiveRealtimeMarketDataset(
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
peekMarketSymbolsCache();

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
isActiveRealtimeMarketDataset(
currentDataset
)
){
void reloadTerminalBybitData();
}

}
);

window.addEventListener(
"trade-book-open-symbol",
e=>{

const symbol =
String(
e.detail?.symbol ||
""
).trim().toUpperCase();
const tf =
String(
e.detail?.tf ||
""
).trim();

if(
!symbol
){
return;
}

void loadSymbol(
symbol
);

if(
tf &&
COINS_TF_VALUES.has(
tf
)
){
void setCoinsTimeframe(
tf
);
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


function normalizeChartEventSymbol(
symbol
){

return String(
symbol ||
""
).trim().toUpperCase();

}

function dispatchChartSwitchStart(
symbol,
loadSeq
){

setChartLayoutReady(
false
);

window.dispatchEvent(
new CustomEvent(
"chart-switch-start",
{
detail:{
symbol:
normalizeChartEventSymbol(
symbol
),
loadSeq:
Number(
loadSeq
) ||
0
}
}
)
);

}

function dispatchChartSwitchCandlesApply(
symbol,
loadSeq
){

window.dispatchEvent(
new CustomEvent(
"chart-switch-candles-apply",
{
detail:{
symbol:
normalizeChartEventSymbol(
symbol
),
loadSeq:
Number(
loadSeq
) ||
0
}
}
)
);

}

function dispatchChartCandlesLoaded(
symbol,
loadSeq
){

window.dispatchEvent(
new CustomEvent(
"chart-candles-loaded",
{
detail:{
symbol:
normalizeChartEventSymbol(
symbol
),
loadSeq:
Number(
loadSeq
) ||
0
}
}
)
);

}

function scheduleChartLayoutSettled(
callback
){

requestAnimationFrame(
()=>{
requestAnimationFrame(
callback
);
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
viewportSettleRaf.value
){

cancelAnimationFrame(
viewportSettleRaf.value
);

viewportSettleRaf.value =
0;

}

const loadSeq = ++symbolLoadSeq;

disconnectKlineStream();
chartSwitchVeil.startChartSwitchVeil();
setChartLayoutReady(
false
);
dispatchChartSwitchStart(
symbol,
loadSeq
);

chartCrosshairLink?.clearLinked?.();

try{
chart.clearCrosshairPosition();
}catch{
/* ignore */
}

try{
rsiChart?.clearCrosshairPosition();
}catch{
/* ignore */
}

currentSymbol = symbol;
setCoinsChartSymbol(symbol);

if(
isTradePage
){
void import(
"./trade-volume-presets.js?v=10"
).then(
({
switchTradeVolumeSymbol
})=>{
switchTradeVolumeSymbol(
symbol
);
}
).catch(
()=>{
/* ignore */
}
);
}

persistCoinsPrefs();

setCoinsChartStatus(
`Загрузка ${formatCoinsSymbolLabel(symbol)}…`,
true
);

try{

let nextCandles = [];

nextCandles =
await loadMarketHistory(
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
isActiveRealtimeMarketDataset(
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

setChartLayoutReady(
true
);
chartSwitchVeil.finishChartSwitchVeil(
loadSeq
);
return;

}

dispatchChartSwitchCandlesApply(
currentSymbol,
loadSeq
);

candleSeries.setData(
buildChartDisplayCandles()
);

const refPrice =
candles[candles.length - 1]?.close ?? 1;

applyChartPriceFormat(
candleSeries,
refPrice
);

resetCoinsChartPriceScale();

rebuildRsiFromCandles();

applyDefaultZoom({
scheduleDrawingRedraw:
false
});

chartIndicators?.notifyMainChartOverlaysSync?.();

drawingTools?.onSymbolChange?.({
skipRedraw:
true
});
rsiDrawingTools?.onSymbolChange?.({
skipRedraw:
true
});

scheduleChartLayoutSettled(
()=>{

if(
loadSeq !==
symbolLoadSeq
){
return;
}

setChartLayoutReady(
true
);

chartIndicators?.notifySymbolChange?.();
settleCoinsChartViewport();
chartIndicators?.flushIndicatorDataRefreshNow?.();
settleCoinsChartViewport();
chartIndicators?.notifyLayoutSettled?.();

drawingTools?.scheduleRedraw?.();
rsiDrawingTools?.scheduleRedraw?.();

dispatchChartCandlesLoaded(
currentSymbol,
loadSeq
);

highlightActiveSymbol();

scrollActiveCoinIntoView();

startRealtime();
startPriceHud();

void terminalMultiChartApi?.scheduleSecondaryReload?.();

syncBackgroundAlertStreams(
currentSymbol,
currentTF
);

persistCoinsPrefs();

chartSwitchVeil.finishChartSwitchVeil(
loadSeq
);

}
);

}finally{

if(loadSeq === symbolLoadSeq){
setCoinsChartStatus(
"",
false
);
}

}

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

const volumeWrapEl =
document.getElementById("volume-wrap");

if(volumeWrapEl){
chartResizeObserver.observe(volumeWrapEl);
}

}

if(
isTerminalPage
){

mountCoinsLayoutResize(
{
onLayoutChange:
scheduleResizeCharts
}
);

}

/* =========================================================
   SYNC
========================================================= */

function wireCoinsLinkedDrawPanRedraw(){

const stackEl =
document.getElementById(
"charts-stack"
);

if(
!stackEl
){
return;
}

const drawToolPeers =
()=>[
drawingTools,
rsiDrawingTools
].filter(
Boolean
);

const holdPeers =
()=>{
for(
const tools of
drawToolPeers()
){
tools.holdChartPanRedraw?.();
}
};

const bumpPeers =
()=>{
for(
const tools of
drawToolPeers()
){
tools.bumpChartPanRedraw?.();
}
};

const onLinkedPanDown =
e=>{

if(
e.button !==
0 &&
e.button !==
1
){
return;
}

if(
drawingTools?.blocksTabletChartPan?.() ||
rsiDrawingTools?.blocksTabletChartPan?.()
){
return;
}

holdPeers();

};

const onLinkedPanWheel =
()=>{
bumpPeers();
};

stackEl.addEventListener(
"mousedown",
onLinkedPanDown
);
stackEl.addEventListener(
"wheel",
onLinkedPanWheel,
{
passive:true
}
);
window.addEventListener(
"mouseup",
bumpPeers
);
window.addEventListener(
"blur",
bumpPeers
);

}

function syncLinkedChartsLayout(){

layoutRsiBand();

}

linkPairedChartTimeScales(
chart,
rsiChart,
syncLinkedChartsLayout,
{
isLocked:()=>
!rsiPaneActive ||
isTabletCrosshairProbeLocked()
}
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
rsiDrawingTools?.scheduleRedraw?.();
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
syncPrimaryTfToLayout(
currentTF
);

document
.querySelectorAll(".tf-btn")
.forEach(b=>{
b.classList.toggle(
"active",
b.dataset.tf === currentTF
);
});

await loadSymbol(currentSymbol);

persistCoinsPrefs();

}

const COINS_POSITION_DRAW_HOTKEYS =
new Map(
[
[
"KeyL",
"long"
],
[
"KeyS",
"short"
],
[
"KeyF",
"fib"
]
]
);

function bindCoinsTfHotkeys(){

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
e.altKey ||
e.shiftKey
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

const tf =
COINS_TF_HOTKEYS[
e.key
];

if(
!tf ||
!COINS_TF_VALUES.has(
tf
)
){
return;
}

e.preventDefault();
void setCoinsTimeframe(
tf
);

}
);

}

function bindCoinsPositionDrawHotkeys(){

window.addEventListener(
"keydown",
e=>{

if(
!isTerminalPage
){
return;
}

if(
e.defaultPrevented
){
return;
}

if(
e.metaKey ||
e.ctrlKey ||
e.altKey ||
e.shiftKey
){
return;
}

if(
shouldIgnoreListKeyNav(
e
)
){
return;
}

const tool =
COINS_POSITION_DRAW_HOTKEYS.get(
e.code
);

if(
!tool ||
!drawingTools?.pickDrawTool
){
return;
}

e.preventDefault();
drawingTools.pickDrawTool(
tool
);

}
);

}

document
.querySelectorAll(".tf-btn")
.forEach(btn=>{

btn.addEventListener(
"mousedown",
e=>{

if(
e.button ===
0
){
e.preventDefault();
}

}
);

btn.addEventListener(
"keydown",
e=>{

if(
e.code ===
"Space" ||
e.code ===
"Enter"
){
e.preventDefault();
}

}
);

btn.onclick = async ()=>{
await setCoinsTimeframe(btn.dataset.tf);
btn.blur();
};

});

bindCoinsTfHotkeys();
bindCoinsPositionDrawHotkeys();

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
e.target.blur();

}
);

/* =========================================================
   TABLE
========================================================= */


function scrollActiveCoinIntoView(){

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
? "Снять флаг"
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

const sym =
String(
currentSymbol ||
displaySymbol ||
""
).trim().toUpperCase();

if(
!sym
){
return;
}

if(
getFavoriteGroup(
sym,
favorites
)
){
closeAllCoinFlagMenus(
flagWrap
);
flagMenu.classList.add(
"hidden"
);
flagTrigger.setAttribute(
"aria-expanded",
"false"
);
applyCoinFavoriteGroup(
sym,
"clear"
);
syncCoinListFreezeFromFlagMenus();
return;
}

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

window.addEventListener(
"favorites-local-changed",
()=>{
syncFavoriteButtonsFromStorage();
if(flagSortActive){
renderList();
}
}
);


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

const coinSearchEl =
document.getElementById(
"coin-search"
);

if(
coinSearchEl
){

mountQwertyKeyInput(
coinSearchEl,
{
onInput(){
searchQuery =
coinSearchEl.value;
renderList();
}
}
);

}

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
tag === "select" ||
tag === "button"
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
isTerminalPage &&
isTabletChartViewport();

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

if(
!sym
){
return "—";
}

return formatExchangeDisplayLabel(
getActiveExchangeId(),
sym
);

}

function syncCoinsPageTitle(){

if(
!isTerminalPage
){
return;
}

const label =
formatCoinsSymbolLabel();

document.title =
label &&
label !==
"—"
? `${label} — Multichart`
:"Multichart";

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

window.dispatchEvent(
new CustomEvent(
"coins-chart-symbol-changed",
{
detail:{
symbol:
sym
}
}
)
);

updateCoinsChartHeaderFlag(
sym
);

syncCoinsPageTitle();

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

function syncCoinsMarketFilterOptions(){

const marketFilter =
document.getElementById(
"market-filter"
);

if(
!marketFilter
){
return;
}

const markets =
getActiveExchangeMarkets();
const prev =
marketFilter.value;

marketFilter.innerHTML =
markets.map(
m=>
`<option value="${m.id}">${m.label}</option>`
).join(
""
);

const allowed =
markets.map(
m=>
m.id
);

if(
allowed.includes(
prev
)
){
marketFilter.value =
prev;
}else if(
allowed.includes(
currentDataset
)
){
marketFilter.value =
currentDataset;
}else{
marketFilter.value =
"all";
currentDataset =
"all";
}

}

async function handleExchangeChanged(){

stopTickerStream();
disconnectKlineStream();

favorites =
loadFavoritesGroups();

syncCoinsMarketFilterOptions();

coinsState().allListings =
[];
coinsState().allBybitSymbols =
[];
coinsState().newListings =
[];
coinsState().innovationListings =
[];
coinsState().stockListings =
[];
coinsState().commodityListings =
[];
coinsState().forexListings =
[];

if(
!getActiveCoinsMarkets().includes(
currentDataset
)
){
currentDataset =
"all";
}

await refreshCoinsMarketUi().catch(
err=>{
console.warn(
"Terminal exchange switch:",
err
);
}
);

}

window.addEventListener(
EXCHANGE_CHANGED_EVENT,
()=>{
void handleExchangeChanged();
}
);

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
isActiveRealtimeMarketDataset(
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

stopTickerStream();
applyCoinsListRefreshInterval();
startTickerStream();

}

async function init(){

void ensureCloudReady().then(()=>{
void drawingTools?.refreshDrawToolsAccessUiAsync?.();
});

applyCoinsPrefs();

mountCoinsListRefreshControls();

mountCoinsChartHeaderFlag();

terminalMultiChartApi =
initTerminalMultiChart({
getSymbol:()=>
currentSymbol,
getPrimaryTf:()=>
currentTF,
setPrimaryTf:
setCoinsTimeframe,
scheduleResizeCharts,
setRsiPaneActive,
onMultiChartLayout:()=>{
scheduleResizeCharts();
},
onSingleChartLayout:()=>{
scheduleResizeCharts();
},
mountPicker:
mountTerminalLayoutPicker
});

mountScriptTerminalStatus();
resumeScriptScanBackgroundJob();

favorites =
loadFavoritesGroups();

const marketFilter =
document.getElementById("market-filter");

syncCoinsMarketFilterOptions();

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
rebuildRsiFromCandles,
applyChartLiveCandle(
bar
){
candleSeries.setData(
buildChartDisplayCandles()
);
applyChartPriceFormat(
candleSeries,
bar?.close ??
candles[
candles.length -
1
]?.close ??
1
);
chartIndicators?.notifyMainChartOverlaysSync?.();
}
});

setCoinsChartSymbol(
currentSymbol
);

applyUrlTimeframe();

init();
