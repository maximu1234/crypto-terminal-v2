import {
parseDrawColor,
formatDrawColor
} from "../draw-color-palette.js?v=6";

import {
TRASH_ICON_SVG
} from "../draw-ui-shared.js?v=35";

import {
closeAllWidgetDrawToolsMenus
} from "../watchlist-draw-ui.js?v=16";

import {
ensureDrawToolsVisible
} from "../draw-tools-visible.js?v=2";

import {
touchShapeRevision,
recordDrawingTombstone
} from "../drawings-storage.js?v=7";

import {
EXCHANGE_CHANGED_EVENT
} from "../market-api.js?v=2";

import {
registerDrawingsStoragePoller,
touchDrawingsStorageSnap
} from "../drawings-storage-poller.js?v=1";

import {
layoutScaleLabelYs,
CHART_PRICE_HUD_FALLBACK_HEIGHT
} from "./scale-label-layout.js?v=2";

import {
formatPrice,
formatChartPrice,
chartScaleFont,
CHART_SCALE_LABEL_PAD_LEFT,
CHART_SCALE_LABEL_LINE_HEIGHT,
scaleLabelTextColorForBackground,
isCoarseTouchViewport,
isTabletChartViewport,
hasAnyFinePointer,
TABLET_USE_CUSTOM_TOUCH_PAN,
ensureDomChartCrosshair,
hideDomChartCrosshair,
positionTabletProbeHorizInStack,
fullCrosshairOptions
} from "../chart-import.js?v=44";

import {
STROKE,
HANDLE_FILL,
HANDLE_STROKE,
WIDTH_OPTIONS,
isHorizPriceTool,
horizPriceLineX1
} from "./constants.js?v=11";

import {
getRectangleHandleScreens,
moveRectangleHandle
} from "./arrow-rect.js?v=2";

import {
distToSegment
} from "./math.js?v=1";

import {
normalizeFibLineStyle,
normalizeFibLevelColor,
normalizeFibLevelWidth,
cloneDefaultFibRows,
buildDefaultFibToolStorage,
finalizeFibLevels,
normalizeFibLevelsShape,
parseFibRatioField,
getFibRows,
isSeriesLogarithmic
} from "./fib-spec.js?v=13";

import {
setFibPanelCommitHook,
runFibPanelCommitHook,
ensureFibLineStyleMenuPortal,
closeAllFibLineStyleMenus,
openFibLineStyleMenu,
ensureFibLineWidthMenuPortal,
closeAllFibLineWidthMenus,
openFibLineWidthMenu,
isFibLineStyleMenuOpenForAnchor,
isFibLineWidthMenuOpenForAnchor,
fibPortalHitTest,
retainFibPortals,
releaseFibPortals
} from "./fib-portals.js?v=3";

import {
isPositionType,
positionEntryPrice,
positionXBounds as resolvePositionXBounds,
positionBodyDist as resolvePositionBodyDist,
getPositionHandleScreens as resolvePositionHandleScreens
} from "./position.js?v=9";

import {
createDrawPrefs
} from "./draw-prefs.js?v=2";

import {
createPositionDraw
} from "./position-draw.js?v=3";

import {
pickUi
} from "./utils.js?v=1";

import {
createDrawHitTester
} from "./draw-hit.js?v=10";

import {
createDrawRenderer
} from "./draw-render.js?v=14";

import {
snapPlotToCandleWick
} from "./draw-magnet.js?v=1";

import {
computeChartRulerMetrics,
drawChartRuler,
ensureChartRulerLabelEl,
hideChartRulerLabelEl,
isChartRulerGoingDown,
updateChartRulerLabelEl
} from "./chart-ruler.js?v=8";

import {
mountTabletDrawInput
} from "../drawings-tablet-input.js?v=4";

import {
cloneDrawingsForUndo,
createDrawUndoStack
} from "./draw-undo.js?v=2";

import {
createDrawDesktopSelection
} from "./draw-edit-desktop.js?v=9";

import {
createDrawingsPersist
} from "./drawings-persist.js?v=9";

import {
createDrawStyleBar
} from "./draw-style-bar.js?v=29";

import {
createDrawAlertsChart
} from "./draw-alerts-chart.js?v=4";

import {
createDrawPlacement
} from "./draw-placement.js?v=10";

import {
createBrushPlacement
} from "./brush-placement.js?v=3";

import {
createDrawEditInteraction
} from "./draw-edit-interaction.js?v=13";

import {
createDrawChartInput
} from "./draw-chart-input.js?v=1";

import {
createDrawPriceScale
} from "./draw-price-scale.js?v=11";

import {
createDrawRedrawLoop
} from "./draw-redraw-loop.js?v=8";

import {
isAlgoReducedCloudClient
} from "../page-routes.js?v=5";

export function initDrawings({

chart,
series,
wrapEl,
timeChart = null,
getSymbol,
getTf,
getCandles,
uiRoot = null,
toolsRoot = null,
isActive = ()=>true,
bindToolbar = true,
mountStyleBar = true,
storageKeySuffix = "",
barPosKey = "draw_bar_pos",
abortTabletChartGesture = null,
tabletCustomPanHooked =
typeof abortTabletChartGesture ===
"function",
onChartCrosshairAt = null,
onChartCrosshairClear = null,
onChartCrosshairSuppress = null,
onChartCrosshairRelease = null,
clearAllPeers = null,
drawPriceAlerts = true,
/** RSI pane uses synthetic OHLC — magnet wick snap would lie. */
enableMagnet =
true,
sharedDrawUndo =
null,
deferKeyboardUndo =
false,
getStyleDelegate = null,
sharedStyleBarSync = null,
clearPeerSelections = null

}){

const coordChart =
timeChart ||
chart;

const tools =
toolsRoot || document;

function notifyTabletChartGestureAbort(){

try{
abortTabletChartGesture?.();
}catch{
/* ignore */
}

}

let alive = true;

retainFibPortals();

wrapEl.style.position = "relative";

const canvas =
document.createElement("canvas");

canvas.className = "drawings-layer";
canvas.style.pointerEvents = "none";
wrapEl.insertBefore(
canvas,
wrapEl.firstChild
);

const styleBar =
pickUi(uiRoot, "draw-style-bar", ".draw-style-float");

const colorBtn =
pickUi(uiRoot, "draw-color-btn", ".draw-color-btn");

const colorStripe =
pickUi(uiRoot, "draw-color-stripe", ".draw-color-stripe");

const colorPopover =
pickUi(uiRoot, "draw-color-popover", ".draw-color-popover");

const widthBtn =
pickUi(uiRoot, "draw-width-btn", ".draw-width-btn");

const widthLabel =
pickUi(uiRoot, "draw-width-label", ".draw-width-label");

const widthPreview =
pickUi(uiRoot, "draw-width-preview", ".draw-width-preview");

const widthPopover =
pickUi(uiRoot, "draw-width-popover", ".draw-width-popover");

const settingsPopover =
pickUi(uiRoot, "draw-settings-popover", ".draw-settings-popover");

const settingsBtn =
pickUi(uiRoot, "draw-settings-btn", ".draw-settings-btn");

const deleteOneBtn =
pickUi(uiRoot, "draw-delete-one", ".draw-delete-one-btn");

const positionRiskWrap =
pickUi(uiRoot, "draw-position-risk-wrap", ".draw-position-risk");

const positionRiskInput =
pickUi(uiRoot, "draw-position-risk-usd", ".draw-position-risk-input");


const dragHandle =
pickUi(uiRoot, "style-bar-drag", ".draw-style-drag");

const templateBtn =
pickUi(uiRoot, "draw-template-btn", ".draw-template-btn");

const templateMenu =
pickUi(uiRoot, "draw-template-menu", ".draw-template-menu");


let tool = "cursor";
let drawings = [];
let lastLoadedSymbol = null;
/** Undo только для текущего графика в этой сессии (смена монеты / уход со страницы — сброс). */
const drawUndo =
createDrawUndoStack();
let selectedId = null;
/** @type {ReturnType<typeof createDrawDesktopSelection> | null} */
let desktopEdit =
null;
let placement = null;
/** Десктоп: сырой pointer внутри wrap (LW режет crosshair до последней свечи). */
let placementPointerXY = null;
/** Cmd/Meta зажат — перекрестье к хаю/лою свечи под вертикалью. */
let drawMagnetKeyDown = false;
/** Последняя позиция crosshair в plot (fallback для Cmd без pointermove). */
let lastCrosshairPlotXY = null;
/** Shift-линейка: начало { time, price } и текущий конец в plot px. */
let chartRulerStart = null;
let chartRulerEndPlot = null;
let chartRulerShiftDown = false;
let chartRulerRedrawRaf = 0;
let chartRulerLabelEl =
ensureChartRulerLabelEl(
wrapEl
);
let previewPoint = null;
let previewXY = null;
let tabletDrawInput = null;
let dragState = null;
let blockChartClick = false;

let clickHandler = null;
let crosshairHandler = null;
let rangeHandler = null;
let rangeHandlerChartSub =
null;
let rangeHandlerCoordSub =
null;

function refreshDrawToolsAccessUi(){

ensureDrawToolsVisible();

getDrawToolsContainers().forEach(el=>{
el.classList.remove(
"hidden",
"draw-tools--locked"
);
el.setAttribute(
"aria-disabled",
"false"
);
});

tools.querySelectorAll(
"[data-draw-tool], .draw-tool-clear-all"
).forEach(btn=>{
btn.classList.remove(
"hidden",
"draw-tools-btn--locked"
);
btn.disabled = false;
});

}

function getDrawToolsContainers(){

const found =
new Set();

[
tools,
document
].forEach(root=>{

if(
!root?.querySelectorAll
){
return;
}

root.querySelectorAll(
".widget-draw-tools, #draw-toolbar"
).forEach(el=>{
found.add(
el
);
});

});

return [
...found
];

}

let fibSettingsSyncDeferred = false;

/** @type {ReturnType<typeof createDrawStyleBar> | null} */
let styleBarCtl =
null;
let updateStyleBar =
sharedStyleBarSync
? ()=>{
sharedStyleBarSync();
}
: ()=>{};
let closePopovers =
()=>{};
let syncDrawChromeLayout =
()=>{};
let isFibSettingsOpen =
()=>false;
let isRectSettingsOpen =
()=>false;
let isPositionRiskInputFocused =
()=>false;
let isFibSettingsChromePointerEvent =
()=>false;

/** @type {ReturnType<typeof createDrawAlertsChart> | null} */
let alertsChart =
null;
let drawRegistryPriceAlerts =
()=>{};
let stripOrphanAlertDrawings =
()=>{};

/** @type {ReturnType<typeof createDrawPlacement> | null} */
let placementCtl =
null;
let startPlacement =
()=>{};
let finishPlacement =
()=>{};
let cancelPlacement =
()=>{};
let handleToolClick =
()=>false;
let setupPlacementPointerPreview =
()=>()=>{};
let syncDesktopDrawPlacementPreview =
()=>null;
let refreshPlacementPreviewFromPointer =
()=>null;
let invalidateLastCandleRightXCache =
()=>{};
let makeShape =
()=>null;

/** @type {ReturnType<typeof createDrawEditInteraction> | null} */
let editInteractionCtl =
null;
let hitTestHandle =
()=>null;
let hitTestShapeBody =
()=>false;
let scheduleDragRedraw =
()=>{};
let setupEditInteraction =
()=>()=>{};
/** @type {ReturnType<typeof createDrawChartInput> | null} */
let chartInputCtl =
null;
let setupFinePointerChartClicks =
()=>()=>{};
let setupCoarseTouchChartGuard =
()=>()=>{};
let setupChartPanRedraw =
()=>()=>{};
let startChartPanRedraw =
()=>{};
let stopChartPanRedraw =
()=>{};

/** @type {ReturnType<typeof createDrawPriceScale> | null} */
let priceScaleCtl =
null;
/** @type {ReturnType<typeof createDrawRedrawLoop> | null} */
let redrawLoopCtl =
null;
/** @type {ReturnType<typeof createBrushPlacement> | null} */
let brushPlacementCtl =
null;
let teardownBrushPlacement =
()=>{};
let teardownStyleBar =
()=>{};
let getPlotWidth =
()=>0;
let getPriceGutterWidth =
()=>56;
let isPointerInPriceGutter =
()=>false;
let removePriceGutterOverlay =
()=>{};
let drawPriceScaleLabels =
()=>{};
let scheduleRedraw =
()=>{};
let redraw =
()=>{};
let shapeCoordsReady =
()=>true;
let cancelPendingRedraws =
()=>{};
let schedulePriceScaleSyncedRedraw =
()=>{};
let beginPriceScaleDragRedraw =
()=>{};
let applyPriceScaleFrame =
()=>{};
let endPriceScaleDragRedraw =
()=>{};
let redrawDuringPriceScaleDrag =
()=>{};
let cancelPriceScalePaint =
()=>{};
let setupDesktopPriceScaleDrag =
()=>()=>{};
let holdChartPanRedraw =
()=>{};
let bumpChartPanRedraw =
()=>{
redraw();
};
let chartPanSettleTimer =
0;




function isDrawingInteractionLocked(){

return !!(
dragState ||
placement ||
brushPlacementCtl?.getBrushStroke?.()
);

}

function shouldSuppressNativeSelection(){

if(
!alive ||
!isActive()
){
return false;
}

return (
tool !==
"cursor" ||
isDrawingInteractionLocked()
);

}

function blocksDrawPaneSwitch(){

return !!(
dragState ||
placement?.points?.length ||
brushPlacementCtl?.getBrushStroke?.()
);

}

function shouldDeferExternalDrawingsSync(){

return (
isDrawingInteractionLocked() ||
(
styleBarCtl?.shouldDeferExternalDrawingsSync?.() ??
false
)
);

}

function flushDeferredFibSettingsSync(){

if(
!fibSettingsSyncDeferred
){
return;
}

fibSettingsSyncDeferred = false;

applyRemoteDrawingsToChart(
[
getSymbol()
]
);

}

let chartApplyPatchRestore = null;

let dragRedrawRaf = 0;
let chartPanRedrawRaf = 0;
let chartPanActive = false;
let chartPanWheelTimer = null;
let priceScaleDragActive = false;
let manualPriceScaleDrag = null;
/** @type {Set<() => void>} */
const afterRedrawListeners =
new Set();

function notifyAfterRedraw(
ctx,
plotW,
h
){

afterRedrawListeners.forEach(
listener=>{

try{
listener(
ctx,
plotW,
h
);
}catch(
err
){
console.warn(
"afterRedraw",
err
);
}

}
);

}

let priceScaleApplyPatchRestore = null;

const {
loadToolDefaults,
loadGlobalStyle,
saveGlobalStyle,
saveToolDefaults,
loadUserPrefs,
saveUserPrefs,
baseDefaultStyle,
getToolDefaults
} =
createDrawPrefs();

function normalizeTime(time){

if(typeof time === "number"){
return time;
}

if(typeof time === "string"){
return Math.floor(new Date(time).getTime() / 1000);
}

if(time && typeof time.timestamp === "number"){
return time.timestamp;
}

return null;

}

function candleSeries(){

return getCandles?.() || [];

}

function segmentX(ts, t0, t1){

const x0 = ts.timeToCoordinate(t0);
const x1 = ts.timeToCoordinate(t1);

if(x0 == null || x1 == null){
return null;
}

return { x0, x1, dt: t1 - t0 };

}

function xFromTime(time){

const t = normalizeTime(time);

if(t == null){
return null;
}

const ts =
coordChart.timeScale();
const direct =
ts.timeToCoordinate(t);

if(direct != null){
return direct;
}

const candles = candleSeries();

if(candles.length < 2){
return null;
}

const first = candles[0];
const second = candles[1];
const prev = candles[candles.length - 2];
const last = candles[candles.length - 1];

if(t <= first.time){

const seg = segmentX(ts, first.time, second.time);

if(!seg || seg.dt <= 0){
return seg?.x0 ?? null;
}

return seg.x0 + (seg.x1 - seg.x0) * ((t - first.time) / seg.dt);

}

if(t >= last.time){

const seg = segmentX(ts, prev.time, last.time);

if(!seg || seg.dt <= 0){
return seg?.x1 ?? null;
}

return seg.x1 + (seg.x1 - seg.x0) * ((t - last.time) / seg.dt);

}

let lo = 0;
let hi = candles.length - 1;

while(lo + 1 < hi){

const mid = (lo + hi) >> 1;

if(candles[mid].time <= t){
lo = mid;
}else{
hi = mid;
}

}

const seg = segmentX(
ts,
candles[lo].time,
candles[lo + 1].time
);

if(!seg || seg.dt <= 0){
return seg?.x0 ?? null;
}

return seg.x0 + (seg.x1 - seg.x0) * ((t - candles[lo].time) / seg.dt);

}

function timeFromX(x){

const ts =
coordChart.timeScale();
const candles =
candleSeries();

if(
candles.length >=
2
){

const first =
candles[
0
];
const second =
candles[
1
];
const prev =
candles[
candles.length - 2
];
const last =
candles[
candles.length - 1
];

const head =
segmentX(
ts,
first.time,
second.time
);

if(
head &&
head.dt >
0 &&
x <
Math.min(
head.x0,
head.x1
) -
0.5
){

const ratio =
(x - head.x0) /
(head.x1 - head.x0);

return (
first.time +
ratio *
head.dt
);

}

const tail =
segmentX(
ts,
prev.time,
last.time
);

if(
tail &&
tail.dt >
0 &&
x >
Math.max(
tail.x0,
tail.x1
) +
0.5
){

const ratio =
(x - tail.x1) /
(tail.x1 - tail.x0);

return (
last.time +
ratio *
tail.dt
);

}

}

let time =
normalizeTime(
ts.coordinateToTime(
x
)
);

if(
time !=
null
){

return time;

}

if(
candles.length <
2
){
return null;
}

for(
let i =
0;
i <
candles.length - 1;
i++
){

const seg =
segmentX(
ts,
candles[
i
].time,
candles[
i + 1
].time
);

if(
!seg ||
seg.dt <=
0
){
continue;
}

const minX =
Math.min(
seg.x0,
seg.x1
);
const maxX =
Math.max(
seg.x0,
seg.x1
);

if(
x >=
minX &&
x <=
maxX
){
const ratio =
(x - seg.x0) /
(seg.x1 - seg.x0);
return (
candles[
i
].time +
ratio *
seg.dt
);
}

}

return null;

}

let storageKey;
let normalizeDrawingShape;
let loadDrawings;
let saveDrawings;
let persistDrawingsForSymbol;

function resetDrawUndoHistory(){

drawUndo.reset();

if(
sharedDrawUndo &&
deferKeyboardUndo
){
sharedDrawUndo.reset();
}

}

function syncDrawUndoBaseline(){

drawUndo.syncBaseline(
cloneDrawingsForUndo(
drawings,
normalizeDrawingShape
)
);

}

function applyDrawingsUndoSnapshot(
prev
){

if(
!prev
){
return false;
}

const keepSelected =
selectedId;

drawUndo.setReplay(
true
);

drawings =
prev.map(shape=>
normalizeDrawingShape(
shape
)
);

selectedId =
keepSelected &&
drawings.some(d=>d.id === keepSelected)
? keepSelected
: null;

syncDrawUndoBaseline();

saveDrawings({
skipUndoRecord:true
});

drawUndo.setReplay(
false
);

updateStyleBar();
redraw();

return true;

}

function undoLastDrawingChange(){

if(
!alive ||
placement ||
dragState
){
return false;
}

if(
sharedDrawUndo?.canUndo?.()
){
return sharedDrawUndo.undo();
}

if(
!isActive() ||
!drawUndo.canUndo()
){
return false;
}

return applyDrawingsUndoSnapshot(
drawUndo.pop()
);

}

function getSelected(){

return drawings.find(d=>d.id === selectedId) || null;

}


const CHART_SCROLL_DEFAULT = {
mouseWheel:true,
pressedMouseMove:true,
horzTouchDrag:true,
vertTouchDrag:false
};

const CHART_SCROLL_LOCKED = {
mouseWheel:true,
pressedMouseMove:false,
horzTouchDrag:false,
vertTouchDrag:false
};

const CHART_SCROLL_TABLET_CUSTOM_PAN = {
mouseWheel:true,
pressedMouseMove:false,
horzTouchDrag:false,
vertTouchDrag:false
};

/** Смартфон / виджеты: инструмент рисования — тап ставит точку, не pan. */
const CHART_SCROLL_DRAW_TOOL = {
mouseWheel:true,
pressedMouseMove:false,
horzTouchDrag:false,
vertTouchDrag:false
};

function chartScrollWhenUnlocked(){

if(
tabletCustomPanHooked &&
isTabletChartViewport() &&
TABLET_USE_CUSTOM_TOUCH_PAN &&
!hasAnyFinePointer()
){
return CHART_SCROLL_TABLET_CUSTOM_PAN;
}

if(
isCoarseTouchViewport() &&
!tabletCustomPanHooked &&
tool !==
"cursor"
){
return CHART_SCROLL_DRAW_TOOL;
}

return CHART_SCROLL_DEFAULT;

}

function syncChartTouchPan(){

const desktopStrokePlacementDrag =
!!placement &&
!isTouchDrawPlacement() &&
(
placement.type ===
"rectangle" ||
placement.type ===
"trendline" ||
placement.type ===
"fib" ||
placement.type ===
"channel" ||
placement.type ===
"arrow"
) &&
placement.points.length >=
1;

const lock =
alive &&
(
!!dragState ||
(
placement &&
isTouchDrawPlacement()
) ||
desktopStrokePlacementDrag
);

try{
chart.applyOptions({
handleScroll: lock
? CHART_SCROLL_LOCKED
: chartScrollWhenUnlocked()
});
}catch{
/* ignore */
}

wrapEl?.classList.toggle(
"chart-touch-locked",
!!lock
);

}


function isTouchDrawTablet(){

return tabletDrawInput?.isTouchDrawTablet() ??
false;

}

function isTouchDrawPlacement(){

return tabletDrawInput?.isTouchDrawPlacement() ??
false;

}

function useChartProbeCrosshair(){

return tabletDrawInput?.useChartProbeCrosshair() ??
false;

}

function initTouchDrawCrosshair(){

tabletDrawInput?.initTouchDrawCrosshair();

}

function syncTouchDrawCrosshairPreview(){

tabletDrawInput?.syncTouchDrawCrosshairPreview();

}

function showStandardChartCrosshair(
e,
localX,
localY
){

tabletDrawInput?.showStandardChartCrosshair(
e,
localX,
localY
);

}

function hideStandardChartCrosshair(){

tabletDrawInput?.hideStandardChartCrosshair();

}

function suppressChartCrosshairForDrag(){

tabletDrawInput?.suppressChartCrosshairForDrag();

}

function syncEditDragCrosshair(
e,
localX,
localY
){

tabletDrawInput?.syncEditDragCrosshair(
e,
localX,
localY
);

}

function beginEditDragCrosshair(
e,
localX,
localY
){

tabletDrawInput?.beginEditDragCrosshair(
e,
localX,
localY
);

}

function clearEditDragCrosshair(){

tabletDrawInput?.clearEditDragCrosshair();

}

function placementPointsNeeded(
type
){

return tabletDrawInput?.placementPointsNeeded(
type
) ??
2;

}

function clearTouchDrawState(){

tabletDrawInput?.clearTouchDrawState();

}

function getTouchDrawCrosshair(){

return tabletDrawInput?.getTouchDrawCrosshair() ??
null;

}

function getTouchPlaceTrack(){

return tabletDrawInput?.getTouchPlaceTrack() ??
null;

}



function pointFromParam(param){

if(!param.point){
return null;
}

const price =
series.coordinateToPrice(param.point.y);

if(price == null || !Number.isFinite(price)){
return null;
}

let time = null;

if(
placement
){
time = timeFromX(param.point.x);
}

if(
time == null &&
param.time != null
){
time = normalizeTime(param.time);
}

if(time == null){
time = timeFromX(param.point.x);
}

if(time == null){
return null;
}

return { time, price };

}

function clearChartRuler(){

chartRulerStart = null;
chartRulerEndPlot = null;

hideChartRulerLabelEl(
chartRulerLabelEl
);

syncChartRulerLayerClass();

if(
chartRulerRedrawRaf
){
cancelAnimationFrame(
chartRulerRedrawRaf
);
chartRulerRedrawRaf = 0;
}

}

function syncChartRulerLayerClass(){

wrapEl?.classList.toggle(
"chart-ruler-active",
!!chartRulerStart
);

}

function scheduleChartRulerRedraw(){

if(
chartPanActive
){
return;
}

if(
chartRulerRedrawRaf
){
return;
}

chartRulerRedrawRaf =
requestAnimationFrame(()=>{

chartRulerRedrawRaf = 0;
redraw();

});

}

function isChartRulerShiftActive(
optEvent
){

return !!(
chartRulerShiftDown ||
optEvent?.shiftKey ===
true
);

}

function syncChartRulerShiftFromEvent(
optEvent
){

if(
optEvent?.shiftKey ===
true
){
chartRulerShiftDown = true;
}

}

function drawChartRulerOverlay(
ctx,
plotW,
plotH
){

if(
!chartRulerStart ||
!chartRulerEndPlot
){
return;
}

const startXY =
toXY(
chartRulerStart
);

if(
!startXY
){
return;
}

const endPoint =
pointFromXY(
chartRulerEndPlot.x,
chartRulerEndPlot.y
);

if(
!endPoint
){
return;
}

const metrics =
computeChartRulerMetrics(
chartRulerStart,
endPoint,
candleSeries()
);

const goesDown =
isChartRulerGoingDown(
startXY,
chartRulerEndPlot
);

drawChartRuler(
ctx,
startXY,
chartRulerEndPlot,
goesDown
);

try{

updateChartRulerLabelEl(
chartRulerLabelEl,
{
bx: chartRulerEndPlot.x,
by: chartRulerEndPlot.y,
goesDown,
metrics,
plotW,
plotH
}
);

}catch(
labelErr
){
console.warn(
"chart ruler label",
labelErr
);
}

}

function syncChartRulerEndFromPlot(
rawX,
rawY
){

if(
tool !==
"cursor" ||
!chartRulerStart
){
return false;
}

if(
!Number.isFinite(
rawX
) ||
!Number.isFinite(
rawY
)
){
return false;
}

chartRulerEndPlot = {
x: rawX,
y: rawY
};

scheduleChartRulerRedraw();

return true;

}

function handleChartRulerClick(
point,
param
){

if(
tool !==
"cursor" ||
!isChartRulerShiftActive(
param
) ||
!point
){
return false;
}

if(
chartRulerStart
){
clearChartRuler();
redraw();
return true;
}

chartRulerStart = {
time: point.time,
price: point.price
};

const startPlot =
toXY(
chartRulerStart
);

chartRulerEndPlot = {
x: param.point?.x ??
startPlot?.x ??
0,
y: param.point?.y ??
startPlot?.y ??
0
};

syncChartRulerLayerClass();
redraw();

return true;

}



function readChartScaleMargins(){

try{

const o =
chart.priceScale(
"right"
).options();

return {
top:
o.scaleMargins?.top ??
0.12,
bottom:
o.scaleMargins?.bottom ??
0.12
};

}catch{

return {
top:0.12,
bottom:0.12
};

}

}

function isPriceScaleInverted(){

try{
return chart.priceScale(
"right"
).options().invertScale ===
true;
}catch{
return false;
}

}

function manualPriceToCoordinate(
price
){

const s =
manualPriceScaleDrag;

if(
!s ||
!Number.isFinite(
price
)
){
return null;
}

const {
minPrice,
maxPrice,
top,
bottom,
h
} =
s;

const plotTop =
h * top;

const plotHeight =
h * (
1 - top - bottom
);

if(
plotHeight <=
0
){
return null;
}

const inverted =
s.inverted;

if(
s.logarithmic &&
minPrice >
0 &&
maxPrice >
0 &&
price >
0
){

const logMin =
Math.log(
minPrice
);

const logMax =
Math.log(
maxPrice
);

const logSpan =
logMax - logMin;

if(
!Number.isFinite(logSpan) ||
logSpan ===
0
){
return null;
}

const logP =
Math.log(
price
);

const ratio =
inverted
? (
logP - logMin
) / logSpan
: (
logMax - logP
) / logSpan;

return plotTop + ratio * plotHeight;

}

const span =
maxPrice - minPrice;

if(
!Number.isFinite(span) ||
span ===
0
){
return null;
}

const ratio =
inverted
? (
price - minPrice
) / span
: (
maxPrice - price
) / span;

return plotTop + ratio * plotHeight;

}

function plotCoordinateToPrice(
py
){

if(
!Number.isFinite(
py
)
){
return null;
}

if(
priceScaleDragActive &&
manualPriceScaleDrag
){

const s =
manualPriceScaleDrag;

const {
minPrice,
maxPrice,
top,
bottom,
h,
inverted,
logarithmic
} =
s;

const plotTop =
h * top;

const plotHeight =
h * (
1 - top - bottom
);

if(
plotHeight <=
0
){
return null;
}

const ratio =
(py - plotTop) /
plotHeight;

if(
logarithmic &&
minPrice >
0 &&
maxPrice >
0
){

const logMin =
Math.log(
minPrice
);

const logMax =
Math.log(
maxPrice
);

const logSpan =
logMax - logMin;

if(
!Number.isFinite(
logSpan
) ||
logSpan ===
0
){
return null;
}

const logP =
inverted
? logMin +
ratio *
logSpan
: logMax -
ratio *
logSpan;

const price =
Math.exp(
logP
);

return Number.isFinite(
price
)
? price
: null;

}

const span =
maxPrice - minPrice;

if(
!Number.isFinite(
span
) ||
span ===
0
){
return null;
}

const price =
inverted
? minPrice +
ratio *
span
: maxPrice -
ratio *
span;

return Number.isFinite(
price
)
? price
: null;

}

return series.coordinateToPrice(
py
);

}

function pointFromXY(px, py){

const price =
plotCoordinateToPrice(
py
);

if(price == null || !Number.isFinite(price)){
return null;
}

const time = timeFromX(px);

if(time == null){
return null;
}

return { time, price };

}

/** Не сбрасывать якорь при кратком сбое time/price (зум, скролл, redraw). */
function resolvePointFromPlotXY(
px,
py,
prev = null,
optEvent = null
){

const magnetActive =
enableMagnet &&
(
drawMagnetKeyDown ||
optEvent?.metaKey ===
true
);

if(
magnetActive
){

const snap =
snapPlotToCandleWick({
plotX: px,
plotY: py,
candles: candleSeries(),
timeFromX,
xFromTime,
priceToPlotY: plotPriceToCoordinate
});

if(
snap
){
return {
time: snap.time,
price: snap.price
};
}

}

const price =
plotCoordinateToPrice(
py
);
const time =
timeFromX(
px
);

if(
price !=
null &&
Number.isFinite(
price
) &&
time !=
null
){
return {
time,
price
};
}

if(
!prev
){
return null;
}

const merged = {
time:
time ??
prev.time,
price:
price !=
null &&
Number.isFinite(
price
)
? price
: prev.price
};

if(
merged.time ==
null ||
merged.price ==
null ||
!Number.isFinite(
merged.price
)
){
return null;
}

return merged;

}

function plotPriceToCoordinate(
price
){

if(
priceScaleDragActive
){

if(
manualPriceScaleDrag
){
const y =
manualPriceToCoordinate(
price
);

if(
y !=
null
){
return y;
}
}

return null;

}

return series.priceToCoordinate(
price
);

}

function toXY(point){

if(
!point ||
point.time ==
null ||
!Number.isFinite(
point.price
)
){
return null;
}

const x = xFromTime(point.time);
const y = plotPriceToCoordinate(point.price);

if(x == null || y == null){
return null;
}

return { x, y };

}

const positionXBounds =
shape =>
resolvePositionXBounds(
shape,
toXY
);

const positionBodyDist =
(px, py, shape) =>
resolvePositionBodyDist(
px,
py,
shape,
toXY,
plotPriceToCoordinate
);

const getPositionHandleScreens =
shape =>
resolvePositionHandleScreens(
shape,
toXY,
plotPriceToCoordinate
);

const {
defaultPositionP2,
initialPositionTpSl,
clampPositionPrices,
drawPosition,
drawPositionAnchor
} =
createPositionDraw({
canvas,
series,
toXY,
plotPriceToCoordinate,
candleSeries,
normalizeTime,
chartSize: () => ({
w: wrapEl.clientWidth,
h: wrapEl.clientHeight
})
});

({
storageKey,
normalizeDrawingShape,
loadDrawings,
saveDrawings,
persistDrawingsForSymbol
} =
createDrawingsPersist({
getSymbol,
getDrawings: ()=>drawings,
setDrawings: next=>{
drawings = next;
},
getSelectedId: ()=>selectedId,
setSelectedId: id=>{
selectedId = id;
},
syncDrawUndoBaseline,
drawUndo,
cloneDrawingsForUndo,
onDrawUndoPush:
sharedDrawUndo
? baseline=>{
sharedDrawUndo.push(
()=>{
applyDrawingsUndoSnapshot(
baseline
);
}
);
}
: null,
initialPositionTpSl,
touchStorageSnap,
storageKeySuffix
}));

/** Эфемерные фигуры (не в localStorage) — переживают reload poller'а. */
const ephemeralDrawingsByFlag =
new Map();

/**
 * Известные флаги оверлеев, которые никогда не пишем на диск.
 * (АлгоТрейдинг: позиции входов паттерна.)
 */
const EPHEMERAL_DRAWING_FLAGS =
[
"algoPatternEntry"
];

function isEphemeralDrawingShape(
shape
){

if(
!shape ||
typeof shape !==
"object"
){
return false;
}

for(
const flag of EPHEMERAL_DRAWING_FLAGS
){

if(
shape[
flag
]
){
return true;
}

}

for(
const flag of ephemeralDrawingsByFlag.keys()
){

if(
shape[
flag
]
){
return true;
}

}

const id =
String(
shape.id ||
""
);

return id.startsWith(
"algo-entry-"
);

}

const loadDrawingsFromStorage =
loadDrawings;

const saveDrawingsToStorage =
saveDrawings;

function reapplyEphemeralDrawings(){

drawings =
drawings.filter(
shape=>
!isEphemeralDrawingShape(
shape
)
);

for(
const shapes of ephemeralDrawingsByFlag.values()
){

if(
Array.isArray(
shapes
) &&
shapes.length
){
drawings.push(
...shapes
);
}

}

}

loadDrawings =
()=>{
loadDrawingsFromStorage();

const before =
drawings.length;

drawings =
drawings.filter(
shape=>
!isEphemeralDrawingShape(
shape
)
);

if(
drawings.length !==
before
){
/* Зачистка старых утечек алго-позиций в localStorage. */
saveDrawingsToStorage(
{
skipUndoRecord:
true
}
);
}

reapplyEphemeralDrawings();
};

saveDrawings =
opts=>{

const full =
drawings;

drawings =
full.filter(
shape=>
!isEphemeralDrawingShape(
shape
)
);

try{
saveDrawingsToStorage(
opts
);
}finally{
drawings =
full;
reapplyEphemeralDrawings();
}

};

function setEphemeralDrawings(
flag,
shapes
){

const key =
String(
flag ||
""
).trim();

if(
!key
){
return;
}

const list =
Array.isArray(
shapes
)
? shapes.filter(
Boolean
)
: [];

if(
list.length
){
ephemeralDrawingsByFlag.set(
key,
list
);
}else{
ephemeralDrawingsByFlag.delete(
key
);
}

reapplyEphemeralDrawings();
scheduleRedraw();

}

function clearEphemeralDrawings(){

ephemeralDrawingsByFlag.clear();
reapplyEphemeralDrawings();
scheduleRedraw();

}

function chartSize(){
return {
w: wrapEl.clientWidth,
h: wrapEl.clientHeight
};
}


function resizeCanvas(){

const dpr =
window.devicePixelRatio ||
1;
const {
w,
h
} =
chartSize();

const nextW =
Math.max(
1,
Math.floor(
w *
dpr
)
);
const nextH =
Math.max(
1,
Math.floor(
h *
dpr
)
);
const cssW =
`${w}px`;
const cssH =
`${h}px`;

if(
canvas.width ===
nextW &&
canvas.height ===
nextH &&
canvas.style.width ===
cssW &&
canvas.style.height ===
cssH
){
return;
}

canvas.width =
nextW;
canvas.height =
nextH;
canvas.style.width =
cssW;
canvas.style.height =
cssH;

removePriceGutterOverlay();

/* bitmap clear — сразу redraw (resizeCharts уже обновил LW chart). */
redraw();

}

function shapeStyle(shape){

return {
color: shape.color || STROKE,
width: shape.lineWidth || 1,
dash: null
};

}


function anchorCircleRadius(){

return isCoarseTouchViewport()
? 10
: 5;

}

function anchorSquareHalfSize(){

return isCoarseTouchViewport()
? 8
: 4;

}


function drawAnchorCircle(ctx, x, y){

const r =
anchorCircleRadius();
const touch =
isCoarseTouchViewport();

ctx.beginPath();
ctx.arc(x, y, r, 0, Math.PI * 2);

ctx.fillStyle = HANDLE_FILL;
ctx.fill();

ctx.strokeStyle = HANDLE_STROKE;
ctx.lineWidth =
touch ? 2 : 1.5;
ctx.stroke();

}

function drawAnchorSquare(ctx, x, y){

const h =
anchorSquareHalfSize();
const touch =
isCoarseTouchViewport();

ctx.fillStyle = HANDLE_FILL;
ctx.fillRect(x - h, y - h, h * 2, h * 2);

ctx.strokeStyle = HANDLE_STROKE;
ctx.lineWidth =
touch ? 2 : 1.5;
ctx.strokeRect(x - h - 0.5, y - h - 0.5, h * 2 + 1, h * 2 + 1);

}

function listHandles(shape){

if(shape.type === "trendline" || shape.type === "fib" || shape.type === "arrow" || shape.type === "brush"){

return [
{ id: "p1", point: shape.p1 },
{ id: "p2", point: shape.p2 }
];

}

if(
shape.type ===
"rectangle"
){

return [
{ id: "p1", point: shape.p1 },
{ id: "p2", point: shape.p2 }
];

}

if(isHorizPriceTool(shape.type)){

return [{
id: "anchor",
point: { time: shape.time, price: shape.price }
}];

}

if(shape.type === "channel"){

const p4 =
channelP4Point(
shape
);

if(
!p4
){
return [
{ id: "p1", point: shape.p1 },
{ id: "p2", point: shape.p2 },
{ id: "p3", point: shape.p3 }
];
}

return [
{ id: "p1", point: shape.p1 },
{ id: "p2", point: shape.p2 },
{ id: "p3", point: shape.p3 },
{ id: "p4", point: p4 }
];

}

if(isPositionType(shape.type)){

const entry =
positionEntryPrice(shape);

return [
{ id: "entryL", point: { time: shape.p1.time, price: entry } },
{ id: "entryR", point: { time: shape.p2.time, price: entry } },
{ id: "tp", point: { time: shape.p1.time, price: shape.tpPrice } },
{ id: "sl", point: { time: shape.p1.time, price: shape.slPrice } }
];

}

return [];

}



priceScaleCtl =
createDrawPriceScale({
getAlive:()=>alive,
chart,
series,
wrapEl,
chartSize,
pointerFromEvent,
holdChartPanRedraw:()=>
holdChartPanRedraw(),
bumpChartPanRedraw:()=>
bumpChartPanRedraw(),
getDrawings:()=>drawings,
getSelectedId:()=>selectedId,
listHandles,
toXY,
shapeStyle,
formatScalePrice:(
price
)=>{

const candles =
getCandles?.() ??
[];
const ref =
candles[
candles.length -
1
]?.close ??
price;

return formatChartPrice(
price,
ref
);

},
readChartScaleMargins,
isPriceScaleInverted,
manualPriceToCoordinate,
getPriceScaleDragActive:()=>priceScaleDragActive,
setPriceScaleDragActive:v=>{
priceScaleDragActive = v;
},
getManualPriceScaleDrag:()=>manualPriceScaleDrag,
setManualPriceScaleDrag:v=>{
manualPriceScaleDrag = v;
},
redraw:()=>
redrawLoopCtl?.redraw?.(),
includeExternalScaleLabels:
!!drawPriceAlerts
});

({
getPlotWidth,
getPriceGutterWidth,
isPointerInPriceGutter,
removePriceGutterOverlay,
drawPriceScaleLabels,
schedulePriceScaleSyncedRedraw,
beginPriceScaleDragRedraw,
applyPriceScaleFrame,
endPriceScaleDragRedraw,
redrawDuringPriceScaleDrag,
cancelPriceScalePaint,
setupDesktopPriceScaleDrag
} =
priceScaleCtl);



function pointerFromEvent(e){

const rect = wrapEl.getBoundingClientRect();

return {
x: e.clientX - rect.left,
y: e.clientY - rect.top
};

}

function chartCanvasEl(){

return (
wrapEl?.querySelector(
".chart"
) ||
wrapEl?.querySelector(
"#chart"
)
);

}

const {
hrayLineDist,
hitTestHrayLine,
trendlineBodyDist,
hitTestTrendlineBody,
brushBodyDist,
fibBodyDist,
hitTestFibBody,
channelP4Point,
channelScreenGeometry,
channelBodyDist,
hitTestChannelBody,
rectangleBodyDist,
hitTestRectangleBody,
drawBodyHitThreshold
} =
createDrawHitTester({
toXY,
getPlotWidth,
series,
pointFromXY
});

const {
drawLine,
drawShape,
drawPlacementPreview
} =
createDrawRenderer({
toXY,
plotPriceToCoordinate,
series,
shapeStyle,
drawPosition,
baseDefaultStyle,
defaultPositionP2,
initialPositionTpSl,
pointFromXY,
drawAnchorCircle,
drawPositionAnchor,
getPositionHandleScreens,
getPlacement:()=>placement,
getPreviewPoint:()=>previewPoint,
getPreviewXY:()=>previewXY,
getSelectedId:()=>selectedId,
parseDrawColor,
formatDrawColor
});


if(
drawPriceAlerts
){

alertsChart =
createDrawAlertsChart({
getSymbol,
getTf,
getDrawings:()=>drawings,
setDrawings:next=>{
drawings = next;
},
getDragState:()=>dragState,
series,
drawLine,
saveDrawings,
scheduleRedraw
});

({
drawRegistryPriceAlerts,
stripOrphanAlertDrawings
} =
alertsChart);

}


function drawBrushPlacementPreview(
ctx,
plotW,
h
){

const stroke =
brushPlacementCtl?.getBrushStroke?.();

if(
!stroke?.points?.length
){
return;
}

const pts =
stroke.points;

if(
pts.length <
1
){
return;
}

const style =
baseDefaultStyle(
"brush"
);

if(
pts.length >=
2
){

drawShape(
ctx,
{
type: "brush",
path: pts,
p1: pts[
0
],
p2: pts[
pts.length -
1
],
color: style.color,
lineWidth: style.lineWidth
},
plotW,
h
);

}

const start =
toXY(
pts[
0
]
);
const end =
toXY(
pts[
pts.length -
1
]
);

if(
start
){
drawAnchorCircle(
ctx,
start.x,
start.y
);
}

if(
end &&
pts.length >
1
){
drawAnchorCircle(
ctx,
end.x,
end.y
);
}

}


redrawLoopCtl =
createDrawRedrawLoop({
canvas,
chartSize,
getPlotWidth,
getChartPanActive:()=>chartPanActive,
getDrawings:()=>drawings,
getSelectedId:()=>selectedId,
getPlacement:()=>placement,
removePriceGutterOverlay,
toXY,
series,
channelScreenGeometry,
drawAnchorCircle,
drawAnchorSquare,
getPositionHandleScreens,
drawPositionAnchor,
drawShape,
drawPlacementPreview,
drawBrushPlacementPreview,
drawChartRulerOverlay,
drawRegistryPriceAlerts,
drawPriceScaleLabels,
onAfterRedraw:notifyAfterRedraw
});

let redrawCore;
/** @type {(() => boolean) | null} */
let reapplyActiveDragCoordsHook =
null;

({
scheduleRedraw,
redraw: redrawCore,
shapeCoordsReady,
cancelPendingRedraws
} =
redrawLoopCtl);

redraw =
function(){

if(
dragState &&
reapplyActiveDragCoordsHook
){
reapplyActiveDragCoordsHook();
}

redrawCore();

};


placementCtl =
createDrawPlacement({
getAlive:()=>alive,
isActive,
getTool:()=>tool,
setTool,
getPlacement:()=>placement,
setPlacement:v=>{
placement = v;
},
getPreviewPoint:()=>previewPoint,
setPreviewPoint:v=>{
previewPoint = v;
},
getPreviewXY:()=>previewXY,
setPreviewXY:v=>{
previewXY = v;
},
getPlacementPointerXY:()=>placementPointerXY,
setPlacementPointerXY:v=>{
placementPointerXY = v;
},
getDrawMagnetKeyDown:()=>drawMagnetKeyDown,
setDrawMagnetKeyDown:v=>{
drawMagnetKeyDown = v;
},
enableMagnet,
getLastCrosshairPlotXY:()=>lastCrosshairPlotXY,
setLastCrosshairPlotXY:v=>{
lastCrosshairPlotXY = v;
},
getDrawings:()=>drawings,
setDrawings:v=>{
drawings = v;
},
getSelectedId:()=>selectedId,
setSelectedId:id=>{
selectedId = id;
},
getBlockChartClick:()=>blockChartClick,
setBlockChartClick:v=>{
blockChartClick = v;
},
chart,
series,
wrapEl,
chartSize,
getPlotWidth,
candleSeries,
xFromTime,
timeFromX,
pointFromXY,
resolvePointFromPlotXY,
pointFromParam,
plotPriceToCoordinate,
hitTest,
desktopEdit,
redraw,
saveDrawings,
updateStyleBar,
normalizeDrawingShape,
baseDefaultStyle,
defaultPositionP2,
initialPositionTpSl,
isTouchDrawPlacement,
useChartProbeCrosshair,
initTouchDrawCrosshair,
clearTouchDrawState,
placementPointsNeeded,
getTouchDrawCrosshair,
pointerFromEvent,
chartCanvasEl,
handleChartRulerClick,
syncChartRulerShiftFromEvent,
syncChartRulerEndFromPlot,
getChartRulerStart:()=>chartRulerStart,
showStandardChartCrosshair,
hideStandardChartCrosshair,
syncChartTouchPan
});

({
invalidateLastCandleRightXCache,
setupPlacementPointerPreview,
syncDesktopDrawPlacementPreview,
refreshPlacementPreviewFromPointer,
startPlacement,
finishPlacement,
cancelPlacement,
handleToolClick,
makeShape
} =
placementCtl);



/**
 * Смартфон: touchstart до LW — иначе pan начинается до pointerdown.
 */



function hitTest(px, py){

const bodyThreshold =
drawBodyHitThreshold();

for(
let i =
drawings.length -
1;
i >=
0;
i--
){

const d =
drawings[
i
];

if(
hitTestHandle(
px,
py,
d
)
){
return d.id;
}

}

let best = null;
let bestDist = bodyThreshold;

drawings.forEach(d=>{

let dist = Infinity;

if(
d.type === "trendline" ||
d.type === "arrow"
){

dist = trendlineBodyDist(px, py, d);

}

if(
d.type ===
"rectangle"
){

dist = rectangleBodyDist(
px,
py,
d,
toXY
);

}

if(isHorizPriceTool(d.type)){

const anchor = toXY({
time: d.time,
price: d.price
});

if(anchor){
dist = distToSegment(
px,
py,
horizPriceLineX1(
d.type,
anchor.x
),
anchor.y,
getPlotWidth(),
anchor.y
);
}

}

if(d.type === "fib"){

dist = fibBodyDist(px, py, d);

}
if(d.type === "channel"){

dist = channelBodyDist(px, py, d);

}

if(d.type === "brush"){

dist = brushBodyDist(px, py, d);

}

if(isPositionType(d.type)){

dist = positionBodyDist(px, py, d);

}

if(dist < bestDist){
bestDist = dist;
best = d.id;
}

});

return best;

}

function setTool(next){

tool = next;
cancelPlacement();

wrapEl.classList.toggle(
"chart-draw-interaction",
next !==
"cursor"
);

if(
isCoarseTouchViewport() ||
isTabletChartViewport()
){
document.body.classList.toggle(
"tablet-chart-draw-mode",
next !==
"cursor"
);
}

if(
next !==
"cursor"
){
desktopEdit?.clearDrawingSelection?.();
}

if(
next !==
"cursor"
){
clearChartRuler();
notifyTabletChartGestureAbort();

if(
isActive() &&
next !==
"brush"
){
startPlacement(
next
);
}

}else{
notifyTabletChartGestureAbort();
}

tools.querySelectorAll("[data-draw-tool]").forEach(btn=>{
btn.classList.toggle(
"active",
btn.dataset.drawTool === tool
);
});

updateStyleBar();
redraw();

}

tabletDrawInput =
mountTabletDrawInput({
wrapEl,
chart,
series,
chartSize,
pointFromXY,
pointerFromEvent,
isDrawChromePointerEvent:
e=>
desktopEdit.isDrawChromePointerEvent(
e
),
getPlacement:()=>placement,
getTool:()=>tool,
finishPlacement,
redraw,
setBlockChartClick:v=>{
blockChartClick = v;
},
setPreviewPoint:v=>{
previewPoint = v;
},
setPreviewXY:v=>{
previewXY = v;
},
onChartCrosshairAt,
onChartCrosshairClear,
onChartCrosshairSuppress,
onChartCrosshairRelease,
tabletCustomPanHooked,
getDragState:()=>dragState
});

let lastToolPickStamp = {
name: "",
at: 0
};

function pickDrawTool(
next
){

if(
!next
){
return;
}

const now =
performance.now();

if(
lastToolPickStamp.name ===
next &&
now - lastToolPickStamp.at <
400
){
return;
}

lastToolPickStamp = {
name: next,
at: now
};

if(
next ===
"cursor"
){
setTool(
"cursor"
);
closeAllWidgetDrawToolsMenus();
return;
}

if(
tool ===
next
){
setTool(
"cursor"
);
closeAllWidgetDrawToolsMenus();
return;
}

setTool(
next
);

closeAllWidgetDrawToolsMenus();

}

function deleteSelected(){

if(!selectedId){
return;
}

const removed =
drawings.find(d=>d.id === selectedId);

const symDel =
String(
getSymbol() ||
""
).trim().toUpperCase();

if(
removed?.id &&
symDel
){
recordDrawingTombstone(
symDel,
removed.id
);
}

drawings = drawings.filter(d=>d.id !== selectedId);
desktopEdit.clearDrawingSelection();
saveDrawings();
updateStyleBar();
redraw();

}

function clearAllDrawingsOnChart(){

if(!alive){
return false;
}

const sym =
String(getSymbol() || "").trim().toUpperCase();

for(
const d of drawings
){
recordDrawingTombstone(
sym,
d.id
);
}

drawings = [];
selectedId = null;
cancelPlacement();
saveDrawings();

window.dispatchEvent(
new CustomEvent(
"drawings-updated",
{
detail:{
symbol: sym,
cleared: true
}
}
)
);

updateStyleBar();
scheduleRedraw();

if(
clearAllPeers?.call
){
try{
clearAllPeers.call();
}catch{
/* ignore */
}
}

return true;

}

function bindClearAllToolbarButtons(){

const buttons =
tools.querySelectorAll(
".draw-tool-clear-all"
);

buttons.forEach(btn=>{

if(
btn.dataset.clearAllBound ===
"1"
){
return;
}

btn.dataset.clearAllBound = "1";

const runClear = e=>{

e.preventDefault();
e.stopPropagation();
clearAllDrawingsOnChart();

};

btn.addEventListener(
"pointerdown",
runClear,
true
);

btn.addEventListener(
"click",
runClear
);

});

}

clickHandler = param=>{

if(
blockChartClick
){
blockChartClick = false;
return;
}

if(
!isActive()
){
return;
}

handleToolClick(param);

};

crosshairHandler = param=>{

if(
tool ===
"cursor" &&
chartRulerStart &&
param?.point
){

syncChartRulerEndFromPlot(
param.point.x,
param.point.y
);

return;

}

if(
placement &&
!isActive()
){
return;
}

if(
placement &&
param?.point
){

if(
!isTouchDrawPlacement()
){

const rawX =
placementPointerXY?.x ??
param.point.x;

const rawY =
placementPointerXY?.y ??
param.point.y;

syncDesktopDrawPlacementPreview(
rawX,
rawY,
param
);

return;

}

if(
getTouchDrawCrosshair()
){
syncTouchDrawCrosshairPreview();

if(
isPositionType(placement.type) &&
placement.points.length >= 1 &&
previewPoint
){
previewPoint.price = placement.points[0].price;
}

}else{

showStandardChartCrosshair(
null,
param.point.x,
param.point.y
);

previewPoint = pointFromParam(param);

if(
isPositionType(placement.type) &&
placement.points.length >= 1 &&
previewPoint
){
previewPoint.price = placement.points[0].price;
}

previewXY = param.point
? { x: param.point.x, y: param.point.y }
: null;

}

const channelPreview =
placement?.type === "channel" &&
placement.points.length > 0 &&
placement.points.length < 3;

const needsPreview =
placement ||
channelPreview;

if(!needsPreview){
return;
}

redraw();

}

};

rangeHandler =
()=>{
invalidateLastCandleRightXCache();

if(
placement
){
refreshPlacementPreviewFromPointer();
return;
}

if(
dragState
){
scheduleDragRedraw?.();
return;
}

bumpChartPanRedraw();

};

const origChartApplyOptions =
chart.applyOptions.bind(chart);

chartApplyPatchRestore =
()=>{
chart.applyOptions = origChartApplyOptions;
chartApplyPatchRestore = null;
};

chart.applyOptions =
function(opts){

origChartApplyOptions(opts);

if(
alive &&
opts &&
opts.rightPriceScale !==
undefined
){
holdChartPanRedraw();
redraw();
}

};

const priceScale =
chart.priceScale(
"right"
);
const origPriceScaleApplyOptions =
priceScale.applyOptions.bind(
priceScale
);

priceScaleApplyPatchRestore =
()=>{
priceScale.applyOptions =
origPriceScaleApplyOptions;
priceScaleApplyPatchRestore = null;
};

priceScale.applyOptions =
function(opts){

origPriceScaleApplyOptions(
opts
);

if(
!alive ||
priceScaleDragActive
){
return;
}

if(
dragState
){
scheduleDragRedraw?.();
return;
}

bumpChartPanRedraw();

};

chart.subscribeClick(clickHandler);
chart.subscribeCrosshairMove(crosshairHandler);
rangeHandlerChartSub =
chart.timeScale().subscribeVisibleLogicalRangeChange(
rangeHandler
);

if(
coordChart !==
chart
){
rangeHandlerCoordSub =
coordChart.timeScale().subscribeVisibleLogicalRangeChange(
rangeHandler
);
}

const onKeyDown = e=>{

if(!alive || !isActive()){
return;
}

if(e.key === "Escape"){

if(
chartRulerStart
){
clearChartRuler();
redraw();
return;

}

if(isFibSettingsOpen()){

closeAllFibLineStyleMenus();
closeAllFibLineWidthMenus();
closeFibColorMenu();
closePopovers();
return;

}

if(
placement ||
tool !==
"cursor"
){
setTool(
"cursor"
);
return;

}

}

if(
e.key ===
"Shift"
){

chartRulerShiftDown = true;
return;

}

if(
e.key ===
"Meta"
){

if(
!drawMagnetKeyDown
){
drawMagnetKeyDown = true;
refreshPlacementPreviewFromPointer(
e
);

if(
dragState &&
reapplyActiveDragCoordsHook
){
reapplyActiveDragCoordsHook();
scheduleDragRedraw();
}

}

return;

}

if(
(
e.metaKey ||
e.ctrlKey
) &&
e.key ===
"z" &&
!e.shiftKey
){

if(
!deferKeyboardUndo
){

const ae =
document.activeElement;
const tag =
ae?.tagName;

if(
tag !==
"INPUT" &&
tag !==
"TEXTAREA" &&
!ae?.isContentEditable
){

if(
undoLastDrawingChange()
){
e.preventDefault();
}

}

}

return;

}

if(
e.shiftKey &&
(
e.key ===
"Backspace" ||
e.code ===
"Backspace"
) &&
!e.metaKey &&
!e.ctrlKey &&
!e.altKey
){

const ae =
document.activeElement;
const tag =
ae?.tagName;

if(
tag !==
"INPUT" &&
tag !==
"TEXTAREA" &&
!ae?.isContentEditable
){

e.preventDefault();
clearAllDrawingsOnChart();

}

return;

}

if(e.key === "Delete" || e.key === "Backspace"){

const ae =
document.activeElement;
const tag =
ae?.tagName;

if(
tag !== "INPUT" &&
tag !== "TEXTAREA" &&
!ae?.isContentEditable
){

e.preventDefault();
const delegatedDelete =
getStyleDelegate?.()?.deleteSelected;

if(
typeof delegatedDelete ===
"function"
){
delegatedDelete();
}else{
deleteSelected();
}
}

}

};

window.addEventListener("keydown", onKeyDown, true);

const onKeyUp = e=>{

if(
!alive ||
!isActive()
){
return;
}

if(
e.key ===
"Shift"
){
chartRulerShiftDown = false;

if(
chartRulerStart
){
clearChartRuler();
redraw();
}

return;
}

if(
e.key !==
"Meta"
){
return;
}

if(
!drawMagnetKeyDown
){
return;
}

drawMagnetKeyDown = false;
refreshPlacementPreviewFromPointer(
e
);

if(
dragState &&
reapplyActiveDragCoordsHook
){
reapplyActiveDragCoordsHook();
scheduleDragRedraw();
}

};

window.addEventListener("keyup", onKeyUp, true);

const onWindowBlur = ()=>{

if(
drawMagnetKeyDown
){
drawMagnetKeyDown = false;

if(
placement &&
placementPointerXY
){
refreshPlacementPreviewFromPointer();
}

if(
dragState &&
reapplyActiveDragCoordsHook
){
reapplyActiveDragCoordsHook();
scheduleDragRedraw();
}

}

chartRulerShiftDown = false;

if(
chartRulerStart
){
clearChartRuler();
redraw();
}

};

window.addEventListener("blur", onWindowBlur);

function handleToolbarToolPick(
e
){

const btn =
e.target.closest?.(
"[data-draw-tool]"
);

if(
!btn ||
!tools.contains(
btn
)
){
return false;
}

if(
btn.closest(
".widget-draw-tools-menu"
) ||
btn.closest(
".widget-draw-tools-toggle"
)
){
return false;
}

e.preventDefault();
e.stopPropagation();
pickDrawTool(
btn.dataset.drawTool
);
return true;

}

const onToolsPointerDown =
e=>{

if(
e.target.closest?.(
".draw-tool-clear-all"
)
){
return;
}

handleToolbarToolPick(
e
);

};

const onToolsClick =
e=>{

const clearBtn =
e.target.closest?.(
".draw-tool-clear-all"
);

if(
clearBtn &&
tools.contains(
clearBtn
)
){
e.preventDefault();
e.stopPropagation();
clearAllDrawingsOnChart();
return;
}

handleToolbarToolPick(
e
);

};

if(
bindToolbar
){

tools.addEventListener(
"pointerdown",
onToolsPointerDown,
true
);

tools.addEventListener(
"click",
onToolsClick,
true
);

bindClearAllToolbarButtons();

}

if(
mountStyleBar
){

styleBarCtl =
createDrawStyleBar({
getAlive:()=>alive,
isActive,
getTool:()=>tool,
getSelectedId:()=>selectedId,
setSelectedId:id=>{
selectedId =
id;
},
getSelected,
getPlacement:()=>placement,
getDrawings:()=>drawings,
wrapEl,
barPosKey,
styleBar,
colorBtn,
colorStripe,
colorPopover,
widthBtn,
widthLabel,
widthPreview,
widthPopover,
settingsPopover,
settingsBtn,
deleteOneBtn,
positionRiskWrap,
positionRiskInput,
dragHandle,
templateBtn,
templateMenu,
syncChartTouchPan,
saveDrawings,
redraw,
saveToolDefaults,
saveGlobalStyle,
baseDefaultStyle,
loadUserPrefs,
saveUserPrefs,
getToolDefaults,
deleteSelected,
flushDeferredFibSettingsSync,
getDesktopEdit:()=>desktopEdit,
getSymbol,
getStyleDelegate
});

({
updateStyleBar,
closePopovers,
syncDrawChromeLayout,
isFibSettingsOpen,
isRectSettingsOpen,
isPositionRiskInputFocused,
isFibSettingsChromePointerEvent
} =
styleBarCtl);

styleBarCtl.portalDrawChrome();

teardownStyleBar =
styleBarCtl.mount();

}

desktopEdit =
createDrawDesktopSelection({
isTabletChartViewport,
getAlive:()=>alive,
isActive,
getTool:()=>tool,
getPlacement:()=>placement,
getDragState:()=>dragState,
getSelectedId:()=>selectedId,
setSelectedId:id=>{
selectedId =
id;
},
getSelected,
setFibSettingsShapeId:id=>{
styleBarCtl?.setFibSettingsShapeId?.(
id
);
},
hitTest,
pointerFromEvent,
updateStyleBar,
redraw,
getChromePortal:()=>
styleBarCtl?.getChromePortal?.() ??
null,
styleBar,
colorPopover,
widthPopover,
settingsPopover,
positionRiskWrap,
fibPortalHitTest,
setBlockChartClick:v=>{
blockChartClick =
v;
},
clearPeerSelections
});

brushPlacementCtl =
createBrushPlacement({
getAlive:()=>alive,
isActive,
getTool:()=>tool,
wrapEl,
toXY,
pointerFromEvent,
pointFromXY,
desktopEdit,
setBlockChartClick:v=>{
blockChartClick =
v;
},
makeShape,
getDrawings:()=>drawings,
setSelectedId:id=>{
selectedId =
id;
},
saveDrawings,
updateStyleBar,
redraw,
abortTabletChartGesture:notifyTabletChartGestureAbort
});

teardownBrushPlacement =
brushPlacementCtl.dispose;

if(
!useChartProbeCrosshair()
){
ensureDomChartCrosshair(
wrapEl
);
}


editInteractionCtl =
createDrawEditInteraction({
getAlive:()=>alive,
getTool:()=>tool,
getPlacement:()=>placement,
getDragState:()=>dragState,
setDragState:v=>{
dragState = v;
},
getSelectedId:()=>selectedId,
setSelectedId:id=>{
selectedId = id;
},
getSelected,
getDrawings:()=>drawings,
setBlockChartClick:v=>{
blockChartClick = v;
},
getChartPanActive:()=>chartPanActive,
getDragRedrawRaf:()=>dragRedrawRaf,
setDragRedrawRaf:v=>{
dragRedrawRaf = v;
},
wrapEl,
series,
toXY,
pointFromXY,
resolvePointFromPlotXY,
timeFromX,
listHandles,
getPositionHandleScreens,
positionBodyDist,
clampPositionPrices,
desktopEdit,
styleBarCtl,
pointerFromEvent,
isPointerInPriceGutter,
hitTest,
isTouchDrawTablet,
updateStyleBar,
redraw,
saveDrawings,
notifyTabletChartGestureAbort,
beginEditDragCrosshair,
clearEditDragCrosshair,
syncEditDragCrosshair,
flushDeferredFibSettingsSync,
syncChartTouchPan,
hitTestTrendlineBody,
hitTestFibBody,
hitTestChannelBody,
hitTestRectangleBody,
hitTestHrayLine,
channelP4Point,
drawBodyHitThreshold
});

({
setupEditInteraction,
hitTestHandle,
hitTestShapeBody,
scheduleDragRedraw
} =
editInteractionCtl);

reapplyActiveDragCoordsHook =
()=>
editInteractionCtl.reapplyActiveDragCoords();


chartInputCtl =
createDrawChartInput({
tabletCustomPanHooked,
getAlive:()=>alive,
isActive,
getTool:()=>tool,
getDragState:()=>dragState,
getSelected,
setBlockChartClick:v=>{
blockChartClick = v;
},
wrapEl,
desktopEdit,
pointerFromEvent,
handleToolClick,
hitTest,
hitTestHandle,
hitTestShapeBody,
syncChartTouchPan,
getDragHandle:()=>dragHandle,
getChartPanActive:()=>chartPanActive,
setChartPanActive:v=>{
chartPanActive = v;
},
getChartPanRedrawRaf:()=>chartPanRedrawRaf,
setChartPanRedrawRaf:v=>{
chartPanRedrawRaf = v;
},
getChartPanWheelTimer:()=>chartPanWheelTimer,
setChartPanWheelTimer:v=>{
chartPanWheelTimer = v;
},
redraw
});

({
setupFinePointerChartClicks,
setupCoarseTouchChartGuard,
setupChartPanRedraw,
startChartPanRedraw,
stopChartPanRedraw
} =
chartInputCtl);

holdChartPanRedraw =
()=>{

if(
chartPanSettleTimer
){
clearTimeout(
chartPanSettleTimer
);
chartPanSettleTimer =
0;
}

startChartPanRedraw();

};

bumpChartPanRedraw =
()=>{

holdChartPanRedraw();

chartPanSettleTimer =
setTimeout(
()=>{
chartPanSettleTimer =
0;
stopChartPanRedraw();
},
280
);

};


const teardownEditInteraction =
setupEditInteraction();

const teardownCoarseTouchGuard =
setupCoarseTouchChartGuard();

const teardownTouchDrawCrosshair =
()=>tabletDrawInput?.dispose?.();

const teardownFinePointerClicks =
setupFinePointerChartClicks();

const teardownPlacementPreview =
setupPlacementPointerPreview();

function setupTabletNativeSelectionBlock(){

if(
!isCoarseTouchViewport()
){
return ()=>{};
}

const cap = {
capture:true
};

const touchCap = {
capture:true,
passive:false
};

const chartsStack =
document.getElementById(
"charts-stack"
);

const targets =
[
wrapEl,
styleBar,
tools,
chartsStack
].filter(
Boolean
);

const onBlock =
e=>{

if(
!shouldSuppressNativeSelection()
){
return;
}

e.preventDefault();

};

const onTouchBlock =
e=>{

if(
!shouldSuppressNativeSelection()
){
return;
}

if(
e.touches?.length >
1
){
return;
}

e.preventDefault();

};

for(
const el of
targets
){
el.addEventListener(
"selectstart",
onBlock,
cap
);
el.addEventListener(
"contextmenu",
onBlock,
cap
);
el.addEventListener(
"touchstart",
onTouchBlock,
touchCap
);
el.addEventListener(
"touchmove",
onTouchBlock,
touchCap
);
}

return ()=>{

for(
const el of
targets
){
el.removeEventListener(
"selectstart",
onBlock,
cap
);
el.removeEventListener(
"contextmenu",
onBlock,
cap
);
el.removeEventListener(
"touchstart",
onTouchBlock,
touchCap
);
el.removeEventListener(
"touchmove",
onTouchBlock,
touchCap
);
}

document.body.classList.remove(
"tablet-chart-draw-mode"
);

};

}

const teardownTabletNativeSelectionBlock =
setupTabletNativeSelectionBlock();

const teardownChartPanRedraw =
setupChartPanRedraw();

const teardownDesktopPriceScaleDrag =
setupDesktopPriceScaleDrag();

const onDrawingsUpdated = e=>{

if(!alive){
return;
}

const symNorm =
String(getSymbol() || "").trim().toUpperCase();

const eventSym =
String(e.detail?.symbol || "").trim().toUpperCase();

if(
eventSym !== symNorm
){
return;
}

if(e.detail?.cleared){

drawings = [];
selectedId = null;
cancelPlacement();
loadDrawings();
updateStyleBar();
scheduleRedraw();
return;

}

if(
e.detail?.local
){
touchStorageSnap();
scheduleRedraw();
return;

}

if(
placement &&
!e.detail?.remote &&
!e.detail?.cleared
){
touchStorageSnap();
scheduleRedraw();
return;

}

if(
!isActive() &&
!e.detail?.remote
){
return;
}

if(
shouldDeferExternalDrawingsSync()
){
fibSettingsSyncDeferred = true;
return;
}

if(
!e.detail?.local
){
resetDrawUndoHistory();
}

loadDrawings();
stripOrphanAlertDrawings();
scheduleRedraw();
updateStyleBar();
touchStorageSnap();

};

function touchStorageSnap(){

touchDrawingsStorageSnap(
storageKey()
);

}

function syncDrawingsFromStorageIfChanged(){

if(
!alive
){
return;
}

if(
shouldDeferExternalDrawingsSync()
){
fibSettingsSyncDeferred = true;
return;
}

applyRemoteDrawingsToChart(
[
getSymbol()
]
);

}

function startCoordRetryBurst(){

let tries =
0;

const tick =
()=>{

if(
!alive ||
tries >
48
){
return;
}

tries += 1;
redraw();

if(
drawings.some(
d=>!shapeCoordsReady(
d
)
)
){
requestAnimationFrame(
tick
);
}

};

requestAnimationFrame(
tick
);

}

function applyRemoteDrawingsToChart(
symbols,
options = {}
){

if(
!alive
){
return;
}

if(
shouldDeferExternalDrawingsSync()
){
fibSettingsSyncDeferred = true;
return;
}

const sym =
String(
getSymbol() ||
""
).trim().toUpperCase();

if(
symbols !=
null &&
Array.isArray(
symbols
)
){

const list =
symbols.map(
s=>
String(
s ||
""
).trim().toUpperCase()
).filter(
Boolean
);

if(
list.length &&
!list.includes(
sym
)
){
return;
}

}

const reload =
options.reload !==
false;

resizeCanvas();

if(
reload
){
loadDrawings();
stripOrphanAlertDrawings();
}

scheduleRedraw();
updateStyleBar();
touchStorageSnap();
startCoordRetryBurst();

}

function syncDrawingsFromStorageNow(){

applyRemoteDrawingsToChart(
[
getSymbol()
]
);

}

const refreshDrawingsOnTabWake = ()=>{

if(
!alive
){
return;
}

syncDrawingsFromStorageNow();

};

const onVisibilityChange = ()=>{

if(
document.visibilityState ===
"visible"
){
refreshDrawingsOnTabWake();
}else{
onVisibilityHidden();
}

};

const onExchangeChanged = ()=>{

if(
!alive
){
return;
}

loadDrawings();
stripOrphanAlertDrawings();
scheduleRedraw();
updateStyleBar();
touchStorageSnap();

};

window.addEventListener(
EXCHANGE_CHANGED_EVENT,
onExchangeChanged
);

let chartAlertsPullTimer =
0;
let lastChartAlertsPullMs =
0;

/** PostgREST: не тянуть price_alerts на каждый chart-candles-loaded. */
const CHART_ALERTS_PULL_MIN_MS =
90 *
1000;

const scheduleChartAlertsPull = ()=>{

/* Multichart Algo / Bot lite: live на бирже — не тянуть price_alerts с графика. */
if(
isAlgoReducedCloudClient()
){
return;
}

if(
Date.now() -
lastChartAlertsPullMs <
CHART_ALERTS_PULL_MIN_MS
){
return;
}

if(
chartAlertsPullTimer
){
window.clearTimeout(
chartAlertsPullTimer
);
}

chartAlertsPullTimer =
window.setTimeout(
()=>{

chartAlertsPullTimer =
0;

if(
Date.now() -
lastChartAlertsPullMs <
CHART_ALERTS_PULL_MIN_MS
){
return;
}

lastChartAlertsPullMs =
Date.now();

void import(
"../alerts-cloud-sync.js?v=60"
).then(
({ pullRegistryFromCloudNow })=>
pullRegistryFromCloudNow({
immediate: true
})
).catch(
()=>{}
);

},
200
);

};

const onChartCandlesLoaded = e=>{

if(
!alive
){
return;
}

const sym =
String(
getSymbol() ||
""
).trim().toUpperCase();

const eventSym =
String(
e.detail?.symbol ||
""
).trim().toUpperCase();

if(
eventSym &&
eventSym !==
sym
){
return;
}

scheduleChartAlertsPull();

applyRemoteDrawingsToChart(
null,
{
reload:
false
}
);

};

window.addEventListener(
"chart-candles-loaded",
onChartCandlesLoaded
);

document.addEventListener(
"visibilitychange",
onVisibilityChange
);

window.addEventListener(
"focus",
refreshDrawingsOnTabWake
);

const unregisterStoragePoller =
registerDrawingsStoragePoller({
getKey: storageKey,
shouldRun: ()=>
alive &&
!isDrawingInteractionLocked(),
onChanged: syncDrawingsFromStorageIfChanged
});

const onPriceAlertsChanged =
e=>{

if(
!alive
){
return;
}

const symNorm =
String(
getSymbol() ||
""
).trim().toUpperCase();

const eventSym =
String(
e.detail?.symbol ||
""
).trim().toUpperCase();

if(
eventSym &&
eventSym !==
symNorm
){
return;
}

loadDrawings();
scheduleRedraw();

};

if(
drawPriceAlerts
){

window.addEventListener(
"price-alerts-changed",
onPriceAlertsChanged
);

}

function defaultHrayAnchorTime(){

const list =
getCandles?.();

if(
Array.isArray(list) &&
list.length
){

const last =
list[list.length - 1];

if(last?.time != null){
return last.time;
}

}

return Math.floor(
Date.now() / 1000
);

}


const onAlertsChanged = ()=>{

if(!alive){
return;
}

if(dragState){
return;
}

scheduleRedraw();

};

const onAlertsRegistryPulled = ()=>{

if(
!alive
){
return;
}

loadDrawings();
scheduleRedraw();

};

window.addEventListener(
"alerts-registry-pulled",
onAlertsRegistryPulled
);

touchStorageSnap();

const onDrawToolsAccessChanged = ()=>{
refreshDrawToolsAccessUi();
};

window.addEventListener(
"draw-tools-access-changed",
onDrawToolsAccessChanged
);

window.addEventListener(
"drawings-updated",
onDrawingsUpdated
);

window.addEventListener(
"alerts-changed",
onAlertsChanged
);

const onPageHide = ()=>{

if(!alive){
return;
}

resetDrawUndoHistory();

if(
drawings.length
){

try{
saveDrawings({
skipUndoRecord:
true
});
}catch{
/* ignore */
}

}

};

const onVisibilityHidden = ()=>{

if(
document.visibilityState !==
"hidden" ||
!alive
){
return;
}

touchStorageSnap();

if(
drawings.length
){

try{
saveDrawings({
skipUndoRecord:
true
});
}catch{
/* ignore */
}

}

};

window.addEventListener(
"pagehide",
onPageHide
);

loadToolDefaults();

try{
const legacyPrefs =
loadUserPrefs();

if(
legacyPrefs.fibLevels ||
legacyPrefs.levels ||
legacyPrefs.fibShowTrendLine != null
){

delete legacyPrefs.fibLevels;
delete legacyPrefs.levels;
delete legacyPrefs.fibShowTrendLine;

saveUserPrefs(legacyPrefs);

}

}catch{
/* ignore */
}

loadDrawings();
stripOrphanAlertDrawings();
lastLoadedSymbol = getSymbol();
refreshDrawToolsAccessUi();
resizeCanvas();
updateStyleBar();
scheduleRedraw();

return {

getTool: ()=> tool,
setTool,
pickDrawTool,
getStyleBarDelegate(){

return {
getTool: ()=> tool,
getSelectedId: ()=> selectedId,
getSelected,
getPlacement: ()=> placement,
getDrawings: ()=> drawings,
getDesktopEdit: ()=> desktopEdit,
saveDrawings,
redraw,
saveToolDefaults,
saveGlobalStyle,
baseDefaultStyle,
deleteSelected
};

},
setEphemeralDrawings,
clearEphemeralDrawings,
syncStyleBar: ()=>{
updateStyleBar();
},
clearDrawingSelection(){

desktopEdit?.clearDrawingSelection?.();
updateStyleBar();
scheduleRedraw();

},
hitTestAtClient(
clientX,
clientY
){

if(
!alive
){
return null;
}

const rect =
wrapEl.getBoundingClientRect();
const x =
clientX -
rect.left;
const y =
clientY -
rect.top;

if(
x <
0 ||
y <
0 ||
x >
rect.width ||
y >
rect.height
){
return null;
}

return hitTest(
x,
y
) ||
null;

},
isDrawChromePointerEvent(
e
){

return (
desktopEdit?.isDrawChromePointerEvent?.(
e
) ??
false
);

},
clearDrawingSelection(){

desktopEdit?.clearDrawingSelection?.();
updateStyleBar();
scheduleRedraw();

},
hitTestAtClient(
clientX,
clientY
){

if(
!alive
){
return null;
}

const rect =
wrapEl.getBoundingClientRect();
const x =
clientX -
rect.left;
const y =
clientY -
rect.top;

if(
x <
0 ||
y <
0 ||
x >
rect.width ||
y >
rect.height
){
return null;
}

return hitTest(
x,
y
) ||
null;

},
isDrawChromePointerEvent(
e
){

return (
desktopEdit?.isDrawChromePointerEvent?.(
e
) ??
false
);

},
refreshDrawToolsAccessUi,
clearAllDrawings:
clearAllDrawingsOnChart,

scheduleRedraw,
scheduleDragRedraw,
forceRedraw:()=>
redraw(),
isChartPanActive:()=>
chartPanActive,
startChartPanRedraw,
stopChartPanRedraw,
holdChartPanRedraw,
bumpChartPanRedraw,
schedulePriceScaleSyncedRedraw,
beginPriceScaleDragRedraw,
applyPriceScaleFrame,
endPriceScaleDragRedraw,
plotPriceToCoordinate,
isPriceScaleDragActive:()=>
priceScaleDragActive,
addAfterRedrawListener(
fn
){

if(
typeof fn ===
"function"
){
afterRedrawListeners.add(
fn
);
}

},
removeAfterRedrawListener(
fn
){

afterRedrawListeners.delete(
fn
);
},

hasActiveDrawInteraction: ()=>
isDrawingInteractionLocked(),

blocksDrawPaneSwitch: ()=>
blocksDrawPaneSwitch(),

blocksTabletChartPan(){

if(
!alive ||
!isActive()
){
return false;
}

return (
!!dragState ||
tool ===
"brush" ||
!!brushPlacementCtl?.getBrushStroke?.()
);

},

shouldSuppressNativeSelection,

blocksTabletChartGestures(
clientX,
clientY
){

if(
!alive ||
!isActive()
){
return false;
}

if(
dragState ||
getTouchPlaceTrack() ||
placement ||
tool !==
"cursor"
){
return true;
}

if(
!isTouchDrawTablet() &&
!(
hasAnyFinePointer() &&
isTabletChartViewport()
)
){
return false;
}

if(
clientX ===
undefined ||
clientY ===
undefined
){
return false;
}

const rect =
wrapEl.getBoundingClientRect();

const x =
clientX - rect.left;

const y =
clientY - rect.top;

const sel =
getSelected();

if(
sel &&
(
hitTestHandle(
x,
y,
sel
) ||
hitTestShapeBody(
x,
y,
sel
)
)
){
return true;
}

return !!hitTest(
x,
y
);

},

isPlacementActive(){

return (
!!placement ||
!!brushPlacementCtl?.getBrushStroke?.()
);

},

isOverDrawingAt(
x,
y
){

if(
!alive
){
return false;
}

return !!hitTest(
x,
y
);

},

onSymbolChange(
options = {}
){

const next =
getSymbol();

/*
  Не пишем текущий массив drawings в ключ старой монеты: пока грузятся свечи,
  getSymbol() уже новый, а в памяти могут быть фигуры новой монеты — так появлялся
  лишний BTCUSDT в Supabase с тем же shape_id, что и PHAROSUSDT.
  Каждая монета сохраняется через saveDrawings() в свой ключ при редактировании.
*/

lastLoadedSymbol = next;

clearEphemeralDrawings();
resetDrawUndoHistory();

scheduleChartAlertsPull();
loadDrawings();
stripOrphanAlertDrawings();
desktopEdit.clearDrawingSelection();
cancelPlacement();
clearChartRuler();

if(tool !== "cursor"){
const style =
baseDefaultStyle(tool);

updateColorStripe(style.color);
setActiveWidth(style.lineWidth);
}

updateStyleBar();

if(
!options.skipRedraw
){
scheduleRedraw();
}

},

resize: resizeCanvas,

destroy(){

if(
drawings.length
){

try{
saveDrawings({
skipUndoRecord:
true
});
}catch{
/* ignore */
}

}

alive = false;
resetDrawUndoHistory();
selectedId = null;
hideDomChartCrosshair(
wrapEl
);
syncChartTouchPan();
setFibPanelCommitHook(null);

teardownStyleBar?.();
teardownEditInteraction?.();
teardownCoarseTouchGuard?.();
teardownTouchDrawCrosshair?.();
teardownFinePointerClicks?.();
teardownPlacementPreview?.();
teardownTabletNativeSelectionBlock?.();
teardownBrushPlacement?.();

window.removeEventListener("keydown", onKeyDown, true);
window.removeEventListener("keyup", onKeyUp, true);
window.removeEventListener("blur", onWindowBlur);
tools.removeEventListener(
"pointerdown",
onToolsPointerDown,
true
);
tools.removeEventListener(
"click",
onToolsClick,
true
);
window.removeEventListener(
"drawings-updated",
onDrawingsUpdated
);

window.removeEventListener(
EXCHANGE_CHANGED_EVENT,
onExchangeChanged
);

document.removeEventListener(
"visibilitychange",
onVisibilityChange
);

window.removeEventListener(
"focus",
refreshDrawingsOnTabWake
);

unregisterStoragePoller?.();

window.removeEventListener(
"alerts-changed",
onAlertsChanged
);

window.removeEventListener(
"alerts-registry-pulled",
onAlertsRegistryPulled
);

window.removeEventListener(
"draw-tools-access-changed",
onDrawToolsAccessChanged
);

window.removeEventListener(
"pagehide",
onPageHide
);

window.removeEventListener(
"chart-candles-loaded",
onChartCandlesLoaded
);

if(
chartAlertsPullTimer
){
window.clearTimeout(
chartAlertsPullTimer
);
chartAlertsPullTimer =
0;
}

cancelPendingRedraws();

teardownChartPanRedraw?.();
teardownDesktopPriceScaleDrag?.();
stopChartPanRedraw();
endPriceScaleDragRedraw();
cancelPriceScalePaint();

if(
priceScaleApplyPatchRestore
){
priceScaleApplyPatchRestore();
}

chart.unsubscribeClick(clickHandler);
chart.unsubscribeCrosshairMove(crosshairHandler);

if(
rangeHandlerChartSub
){
chart.timeScale().unsubscribeVisibleLogicalRangeChange(
rangeHandlerChartSub
);
rangeHandlerChartSub =
null;
}

if(
rangeHandlerCoordSub
){
coordChart.timeScale().unsubscribeVisibleLogicalRangeChange(
rangeHandlerCoordSub
);
rangeHandlerCoordSub =
null;
}

if(chartApplyPatchRestore){

chartApplyPatchRestore();

}

releaseFibPortals();

if(
drawPriceAlerts
){

window.removeEventListener(
"price-alerts-changed",
onPriceAlertsChanged
);

}

canvas.remove();

chartRulerLabelEl?.remove();
chartRulerLabelEl = null;

}

};

}
