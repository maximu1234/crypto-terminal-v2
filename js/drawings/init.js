import {
parseDrawColor,
formatDrawColor
} from "../draw-color-palette.js?v=6";

import {
TRASH_ICON_SVG,
DRAW_TOOLS_GUEST_MSG
} from "../draw-ui-shared.js?v=29";

import {
closeAllWidgetDrawToolsMenus
} from "../watchlist-draw-ui.js?v=15";

import {
calcPositionSizing,
formatMoneyUsd,
formatVolumeUsd,
parseMoneyInput
} from "../position-sizing.js?v=1";

import {
bumpDrawingsLocalRevision,
isCloudLoggedIn,
isCloudLoggedInEffective,
isCloudSyncEnabled,
ensureCloudLoginResolved,
onCloudSyncChange
} from "../cloud-sync.js?v=40";

import {
ensureDrawToolsVisible
} from "../draw-tools-visible.js?v=1";

import {
deleteDrawingFromCloud,
flushDrawingsCloudPush,
registerDrawingsChartRefresh,
scheduleDrawingsCloudPush
} from "../drawings-cloud-sync.js?v=46";

import {
touchShapeRevision,
recordDrawingTombstone
} from "../drawings-storage.js?v=7";

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
} from "../chart-import.js?v=43";

import {
STROKE,
HANDLE_FILL,
HANDLE_STROKE,
WIDTH_OPTIONS,
USER_PREFS_KEY,
GLOBAL_STYLE_KEY,
POSITION_ENTRY_COLOR,
POSITION_TP_FILL,
POSITION_SL_FILL,
POSITION_DEFAULT_TP_PCT,
POSITION_DEFAULT_SL_PCT,
POSITION_DEFAULT_ZONE_HEIGHT_MULT,
POSITION_DEFAULT_TP_ZONE_PX,
POSITION_DEFAULT_SL_ZONE_PX,
POSITION_DEFAULT_WIDTH_BARS,
POSITION_RR_LABEL_SAMPLE,
RECT_DEFAULT_FILL_COLOR,
RECT_DEFAULT_FILL_OPACITY
} from "./constants.js?v=8";

import {
getRectangleHandleScreens,
moveRectangleHandle,
normalizeRectangleShape
} from "./arrow-rect.js?v=2";

import {
uid,
distToSegment,
distToRect
} from "./math.js?v=1";

import {
normalizeFibLineStyle,
normalizeFibLevelColor,
normalizeFibLevelWidth,
cloneDefaultFibRows,
buildDefaultFibToolStorage,
migrateFibToolDefaults,
finalizeFibLevels,
ensureFibLevelsVisible,
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
positionEntryPrice
} from "./position.js?v=1";

import {
pickUi
} from "./utils.js?v=1";

import {
createDrawHitTester
} from "./draw-hit.js?v=9";

import {
createDrawRenderer
} from "./draw-render.js?v=13";

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
} from "../drawings-tablet-input.js?v=3";

import {
cloneDrawingsForUndo,
createDrawUndoStack
} from "./draw-undo.js?v=2";

import {
createDrawDesktopSelection
} from "./draw-edit-desktop.js?v=8";

import {
createDrawingsPersist
} from "./drawings-persist.js?v=7";

import {
createDrawStyleBar
} from "./draw-style-bar.js?v=16";

import {
createDrawAlertsChart
} from "./draw-alerts-chart.js?v=3";

import {
createDrawPlacement
} from "./draw-placement.js?v=8";

import {
createBrushPlacement
} from "./brush-placement.js?v=2";

import {
createDrawEditInteraction
} from "./draw-edit-interaction.js?v=12";

import {
createDrawChartInput
} from "./draw-chart-input.js?v=1";

import {
createDrawPriceScale
} from "./draw-price-scale.js?v=6";

import {
createDrawRedrawLoop
} from "./draw-redraw-loop.js?v=7";

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
cloudSync = true,
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
sharedDrawUndo =
null,
deferKeyboardUndo =
false

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

let toolDefaults = {};
let clickHandler = null;
let crosshairHandler = null;
let rangeHandler = null;
let rangeHandlerChartSub =
null;
let rangeHandlerCoordSub =
null;

function canUseDrawings(){
return isCloudLoggedInEffective();
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
".widget-draw-tools, #coins-draw-tools-mount, #draw-toolbar"
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

function refreshDrawToolsAccessUi(){

ensureDrawToolsVisible();

const canUse =
canUseDrawings();

getDrawToolsContainers().forEach(el=>{
el.classList.remove(
"hidden"
);
el.classList.toggle(
"draw-tools--locked",
!canUse
);
el.setAttribute(
"aria-disabled",
canUse ? "false" : "true"
);
});

tools.querySelectorAll(
"[data-draw-tool], .draw-tool-clear-all"
).forEach(btn=>{
btn.classList.remove(
"hidden"
);
btn.disabled = false;
btn.classList.toggle(
"draw-tools-btn--locked",
!canUse
);
});

if(!canUse){
tool = "cursor";
selectedId = null;
cancelPlacement();
styleBar?.classList.add("hidden");
}

}

let fibSettingsSyncDeferred = false;

/** @type {ReturnType<typeof createDrawStyleBar> | null} */
let styleBarCtl =
null;
let updateStyleBar =
()=>{};
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

function defaultsStorageKey(name){

return `draw_defaults_${name}`;

}

function loadToolDefaults(){

["trendline", "brush", "hray", "fib", "channel", "arrow", "rectangle", "long", "short"].forEach(name=>{

try{

const raw =
localStorage.getItem(defaultsStorageKey(name));

toolDefaults[name] = raw
? JSON.parse(raw)
: null;

}catch{

toolDefaults[name] = null;

}

if(
name === "fib"
){

const migrated =
migrateFibToolDefaults(
toolDefaults.fib
);

toolDefaults.fib = migrated;

localStorage.setItem(
defaultsStorageKey("fib"),
JSON.stringify(migrated)
);

}

});

}

function loadGlobalStyle(){

try{

return JSON.parse(
localStorage.getItem(GLOBAL_STYLE_KEY) || "{}"
);

}catch{

return {};

}

}

function saveGlobalStyle(partial){

const next = {
...loadGlobalStyle(),
...partial
};

localStorage.setItem(
GLOBAL_STYLE_KEY,
JSON.stringify(next)
);

}

function saveToolDefaults(name, data){

const next = {
...(toolDefaults[name] || {}),
...data
};

toolDefaults[name] = next;
localStorage.setItem(
defaultsStorageKey(name),
JSON.stringify(next)
);

}

function loadUserPrefs(){

try{

return JSON.parse(
localStorage.getItem(USER_PREFS_KEY) || "{}"
);

}catch{

return {};

}

}

function saveUserPrefs(partial){

const next = {
...loadUserPrefs(),
...partial
};

localStorage.setItem(
USER_PREFS_KEY,
JSON.stringify(next)
);

}

function baseDefaultStyle(type){

const global =
loadGlobalStyle();

const saved =
toolDefaults[type] || {};

const out =
{
color: saved.color || global.color || STROKE,
lineWidth: saved.lineWidth ?? global.lineWidth ?? 1
};

if(isPositionType(type)){

const prefs =
loadUserPrefs();

const risk =
saved.riskUsd ??
prefs.positionRiskUsd;

if(
risk != null &&
Number(risk) > 0
){
out.riskUsd = Number(risk);
}

}

if(type === "fib"){

const fibStore =
migrateFibToolDefaults(
toolDefaults.fib ||
saved
);

out.fibLevels =
JSON.parse(
JSON.stringify(
ensureFibLevelsVisible(
fibStore.fibLevels
)
)
);

out.fibShowTrendLine =
typeof fibStore.fibShowTrendLine ===
"boolean"
? fibStore.fibShowTrendLine
: false;

if(
saved?.color
){
out.color = saved.color;
}

if(
saved?.lineWidth != null
){
out.lineWidth = saved.lineWidth;
}

}

if(
type ===
"rectangle"
){

const rectSaved =
toolDefaults.rectangle ||
saved;

normalizeRectangleShape(
out,
{
showFill:
rectSaved?.showFill !==
false,
fillColor:
rectSaved?.fillColor ||
RECT_DEFAULT_FILL_COLOR,
fillOpacity:
rectSaved?.fillOpacity ??
RECT_DEFAULT_FILL_OPACITY,
medianColor:
rectSaved?.medianColor ||
out.color,
medianLineWidth:
rectSaved?.medianLineWidth ||
1,
medianLineStyle:
rectSaved?.medianLineStyle ||
"dashed",
lineStyle:
rectSaved?.lineStyle ||
"solid",
showMedian:
!!rectSaved?.showMedian
}
);

if(
rectSaved?.color
){
out.color = rectSaved.color;
}

if(
rectSaved?.lineWidth != null
){
out.lineWidth = rectSaved.lineWidth;
}

}

return out;

}
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

const lock =
alive &&
(
!!dragState ||
(
placement &&
isTouchDrawPlacement()
)
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
drawMagnetKeyDown ||
optEvent?.metaKey ===
true;

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

function positionBadgeFont(){

return '600 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif';

}

function positionBadgeFontEntry(){

return '600 10px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif';

}

function positionBadgeFontVolume(){

return '800 14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif';

}

const POSITION_VOLUME_COLOR = "#FEF08C";

function resolvePositionBadgeFont(kind, variant){

if(kind === "volume"){
return positionBadgeFontVolume();
}

if(kind === "badge"){
return positionBadgeFont();
}

if(
kind === "tp" ||
kind === "sl" ||
kind === "long-center" ||
kind === "short-center"
){
return positionBadgeFont();
}

if(kind === "entry"){
return positionBadgeFontEntry();
}

if(variant === "entry"){
return positionBadgeFontEntry();
}

return positionBadgeFont();

}

function positionMinWidthPx(){

const ctx =
canvas.getContext("2d");

if(!ctx){
return 220;
}

ctx.save();
ctx.font = positionBadgeFont();

const w =
ctx.measureText(POSITION_RR_LABEL_SAMPLE).width + 28;

ctx.restore();
return Math.ceil(w);

}

function candleBarStepSec(){

const candles =
candleSeries();

if(
candles.length <
2
){
return 3600;
}

const last =
candles[
candles.length - 1
];
const prev =
candles[
candles.length - 2
];

return Math.max(
60,
last.time - prev.time
);

}

function ensurePositionP2MinWidth(p1, p2){

const entry =
p1.price;
const minW =
positionMinWidthPx();
const a =
toXY(p1);

if(!a){
return p2;
}

let t1 =
normalizeTime(p1.time);
let t2 =
normalizeTime(p2?.time ?? p1.time);

if(
t1 == null ||
t2 == null
){
return p2;
}

if(t2 < t1){
t2 = t1;
}

const candles =
candleSeries();

if(
candles.length >=
2
){

const last =
candles[
candles.length - 1
];
const dt =
candleBarStepSec();

if(
t1 >=
last.time
){

let b =
toXY({
time: t2,
price: entry
});

for(
let step =
0;
step <
320;
step++
){

if(
b &&
Math.abs(
b.x - a.x
) >=
minW
){
break;
}

t2 =
t1 +
dt *
Math.max(
step + 1,
POSITION_DEFAULT_WIDTH_BARS
);

b =
toXY({
time: t2,
price: entry
});

}

return {
time: t2,
price: entry
};

}

}

let b =
toXY({ time: t2, price: entry });

for(let step = 0; step < 320; step++){

if(
b &&
Math.abs(b.x - a.x) >= minW
){
break;
}

if(candles.length >= 2){

const idx =
candles.findIndex(c=>c.time >= t2);
let nextIdx =
idx < 0
? candles.length - 1
: Math.min(candles.length - 1, idx + 1);

if(
nextIdx <= idx ||
candles[nextIdx].time <= t2
){

const last =
candles[candles.length - 1];
const prev =
candles[candles.length - 2] || last;
const dt =
Math.max(60, last.time - prev.time);

t2 = last.time + dt * (step + 1);

}else{

t2 = candles[nextIdx].time;

}

}else{

t2 = t1 + 3600 * (step + POSITION_DEFAULT_WIDTH_BARS);

}

b = toXY({ time: t2, price: entry });

}

return {
time: t2,
price: entry
};

}

function defaultPositionP2(p1){

const candles =
candleSeries();

if(!candles.length){
return ensurePositionP2MinWidth(
p1,
{
time: p1.time,
price: p1.price
}
);
}

const t0 =
normalizeTime(p1.time);

let idx =
candles.findIndex(c=>c.time >= t0);

if(
idx <
0
){

const last =
candles[
candles.length - 1
];
const dt =
candleBarStepSec();
const barsFromLast =
Math.max(
1,
Math.ceil(
(t0 - last.time) /
dt
)
);

return ensurePositionP2MinWidth(
p1,
{
time:
last.time +
dt *
(
barsFromLast +
POSITION_DEFAULT_WIDTH_BARS
),
price: p1.price
}
);

}

const targetIdx =
Math.min(
candles.length - 1,
idx + POSITION_DEFAULT_WIDTH_BARS
);

return ensurePositionP2MinWidth(
p1,
{
time: candles[targetIdx].time,
price: p1.price
}
);

}

function initialPositionTpSlPercent(type, entryN){

if(type === "long"){
return {
tpPrice: entryN * (1 + POSITION_DEFAULT_TP_PCT),
slPrice: entryN * (1 - POSITION_DEFAULT_SL_PCT)
};
}

return {
tpPrice: entryN * (1 - POSITION_DEFAULT_TP_PCT),
slPrice: entryN * (1 + POSITION_DEFAULT_SL_PCT)
};

}

function initialPositionTpSl(type, entry){

const entryN =
Number(entry);

if(!Number.isFinite(entryN) || entryN <= 0){
return {
tpPrice: entryN,
slPrice: entryN
};
}

const yEntry =
series.priceToCoordinate(entryN);

if(yEntry == null){
return initialPositionTpSlPercent(
type,
entryN
);
}

const tpPx =
POSITION_DEFAULT_TP_ZONE_PX;
const slPx =
POSITION_DEFAULT_SL_ZONE_PX;

if(type === "long"){

const tpPrice =
series.coordinateToPrice(yEntry - tpPx);
const slPrice =
series.coordinateToPrice(yEntry + slPx);

return {
tpPrice:
Number.isFinite(tpPrice) && tpPrice > entryN
? tpPrice
: entryN * (1 + POSITION_DEFAULT_TP_PCT),
slPrice:
Number.isFinite(slPrice) && slPrice < entryN
? slPrice
: entryN * (1 - POSITION_DEFAULT_SL_PCT)
};

}

const slPrice =
series.coordinateToPrice(yEntry - slPx);
const tpPrice =
series.coordinateToPrice(yEntry + tpPx);

return {
tpPrice:
Number.isFinite(tpPrice) && tpPrice < entryN
? tpPrice
: entryN * (1 - POSITION_DEFAULT_TP_PCT),
slPrice:
Number.isFinite(slPrice) && slPrice > entryN
? slPrice
: entryN * (1 + POSITION_DEFAULT_SL_PCT)
};

}

({
storageKey,
normalizeDrawingShape,
loadDrawings,
saveDrawings,
persistDrawingsForSymbol
} =
createDrawingsPersist({
getSymbol,
canUseDrawings,
isCloudSyncEnabled,
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
bumpDrawingsLocalRevision,
scheduleDrawingsCloudPush,
touchStorageSnap,
storageKeySuffix,
cloudSync
}));

function clampPositionPrices(
shape,
opts = {}
){

const handleId =
opts.handleId ||
null;

const preserveTpSl =
!!opts.preserveTpSl ||
handleId ===
"entryL" ||
handleId ===
"entryR";

const entry =
positionEntryPrice(
shape
);

if(
!Number.isFinite(
entry
)
){
return;
}

shape.p1.price = entry;
shape.p2.price = entry;

if(
preserveTpSl
){
return;
}

const tp =
Number(
shape.tpPrice
);
const sl =
Number(
shape.slPrice
);
const eps =
Math.max(
Math.abs(
entry
) *
1e-9,
1e-12
);

if(
shape.type ===
"long"
){

if(
handleId ===
"tp"
){

shape.tpPrice =
Number.isFinite(
tp
)
? (
tp >
entry +
eps
? tp
: entry +
eps
)
: entry *
(
1 +
POSITION_DEFAULT_TP_PCT
);

}else if(
handleId ===
"sl"
){

shape.slPrice =
Number.isFinite(
sl
)
? (
sl <
entry -
eps
? sl
: entry -
eps
)
: entry *
(
1 -
POSITION_DEFAULT_SL_PCT
);

}else{

shape.tpPrice =
Number.isFinite(
tp
) &&
tp >
entry
? tp
: entry *
(
1 +
POSITION_DEFAULT_TP_PCT
);

shape.slPrice =
Number.isFinite(
sl
) &&
sl <
entry
? sl
: entry *
(
1 -
POSITION_DEFAULT_SL_PCT
);

}

return;

}

if(
handleId ===
"tp"
){

shape.tpPrice =
Number.isFinite(
tp
)
? (
tp <
entry -
eps
? tp
: entry -
eps
)
: entry *
(
1 -
POSITION_DEFAULT_TP_PCT
);

}else if(
handleId ===
"sl"
){

shape.slPrice =
Number.isFinite(
sl
)
? (
sl >
entry +
eps
? sl
: entry +
eps
)
: entry *
(
1 +
POSITION_DEFAULT_SL_PCT
);

}else{

shape.tpPrice =
Number.isFinite(
tp
) &&
tp <
entry
? tp
: entry *
(
1 -
POSITION_DEFAULT_TP_PCT
);

shape.slPrice =
Number.isFinite(
sl
) &&
sl >
entry
? sl
: entry *
(
1 +
POSITION_DEFAULT_SL_PCT
);

}

}

function positionXBounds(shape){

const a =
toXY(shape.p1);
const b =
toXY(shape.p2);

if(!a || !b){
return null;
}

return {
x1: Math.min(a.x, b.x),
x2: Math.max(a.x, b.x),
yEntry: a.y
};

}

function positionBodyDist(px, py, shape){

if(!isPositionType(shape.type)){
return Infinity;
}

const box =
positionXBounds(shape);

if(!box){
return Infinity;
}

const yTp =
plotPriceToCoordinate(
shape.tpPrice
);
const ySl =
plotPriceToCoordinate(
shape.slPrice
);

if(
yTp == null ||
ySl == null
){
return Infinity;
}

const { x1, x2, yEntry } = box;
const isLong =
shape.type === "long";

let dist = Infinity;

if(isLong){

dist = Math.min(
dist,
distToRect(px, py, x1, yTp, x2, yEntry),
distToRect(px, py, x1, yEntry, x2, ySl)
);

}else{

dist = Math.min(
dist,
distToRect(px, py, x1, yEntry, x2, ySl),
distToRect(px, py, x1, yTp, x2, yEntry)
);

}

dist = Math.min(
dist,
distToSegment(px, py, x1, yEntry, x2, yEntry)
);

return dist;

}

function positionMetrics(shape){

const entry =
positionEntryPrice(shape);

if(!Number.isFinite(entry) || entry === 0){
return {
tpPct: 0,
slPct: 0,
rr: "—"
};
}

const tpPct =
Math.abs(shape.tpPrice - entry) / entry * 100;
const slPct =
Math.abs(shape.slPrice - entry) / entry * 100;
const rr =
slPct > 0
? (tpPct / slPct).toFixed(2)
: "—";

return { tpPct, slPct, rr };

}

function positionSizingFromShape(shape){

const metrics =
positionMetrics(shape);

return calcPositionSizing(
shape.riskUsd,
metrics.tpPct,
metrics.slPct
);

}

/** TP/SL/центр — прямоугольные плашки (не pill). */
const POSITION_EDGE_BADGE_GAP =
4;

const POSITION_EDGE_BADGE_H =
18;

function fillPositionBadgeRect(
ctx,
left,
top,
bw,
bh,
fill,
stroke
){

ctx.fillStyle = fill;
ctx.fillRect(
left,
top,
bw,
bh
);

if(
stroke
){
ctx.strokeStyle = stroke;
ctx.lineWidth = 1;
ctx.strokeRect(
left + 0.5,
top + 0.5,
bw - 1,
bh - 1
);
}

}

function positionBadgeCyOutside(
edgeY,
side
){

const half =
POSITION_EDGE_BADGE_H /
2;

if(
side ===
"above"
){
return edgeY -
POSITION_EDGE_BADGE_GAP -
half;
}

return edgeY +
POSITION_EDGE_BADGE_GAP +
half;

}

function formatPositionPrice(price){

const n =
Number(price);

if(!Number.isFinite(n)){
return "—";
}

const abs =
Math.abs(n);

if(abs >= 1000){
return n.toFixed(1);
}

if(abs >= 1){
return n.toFixed(4);
}

return n.toFixed(6);

}

function drawPositionBadge(
ctx,
text,
cx,
cy,
variant
){

ctx.save();
ctx.textBaseline = "middle";

const padX = 8;
const padY = 6;
const lineGap = 2;
let fill =
"rgba(15, 23, 42, 0.92)";
let stroke =
"rgba(148, 163, 184, 0.35)";

if(variant === "tp"){
fill = "rgba(22, 101, 52, 0.95)";
stroke = "rgba(74, 222, 128, 0.45)";
}else if(variant === "sl"){
fill = "rgba(127, 29, 29, 0.95)";
stroke = "rgba(248, 113, 113, 0.45)";
}else if(variant === "long-center"){
fill = "rgba(22, 101, 52, 0.95)";
stroke = "rgba(74, 222, 128, 0.55)";
}else if(variant === "short-center"){
fill = "rgba(127, 29, 29, 0.95)";
stroke = "rgba(248, 113, 113, 0.55)";
}else if(variant === "rr"){
fill = "rgba(30, 41, 59, 0.95)";
stroke = "rgba(250, 204, 21, 0.4)";
}else if(variant === "entry"){
fill = "rgba(113, 63, 18, 0.95)";
stroke = "rgba(250, 204, 21, 0.45)";
}

function measureSegments(
segments
){

return segments.map(seg=>{

const font =
resolvePositionBadgeFont(
seg.font,
variant
);

ctx.font = font;

return {
text: seg.text,
font,
color: seg.color,
highlight: seg.highlight === true,
width: ctx.measureText(
seg.text
).width
};

});

}

function lineTextWidth(
measured
){

return measured.reduce(
(sum, seg)=>sum + seg.width,
0
);

}

function drawMeasuredLine(
measured,
lineCy
){

const textWidth =
lineTextWidth(
measured
);

let x =
cx - textWidth / 2;

measured.forEach(
seg=>{

ctx.font = seg.font;

if(
seg.highlight
){

const pad = 4;
const pillH = 18;
const pillTop =
lineCy - pillH / 2;

ctx.fillStyle = "rgba(0, 0, 0, 0.55)";
ctx.fillRect(
x - pad,
pillTop,
seg.width + pad * 2,
pillH
);

}

ctx.fillStyle =
seg.color ||
(
variant === "long-center" ||
variant === "short-center"
? "#ffffff"
: "#f8fafc"
);
ctx.fillText(
seg.text,
x,
lineCy
);
x += seg.width;

}
);

}

const multiline =
text &&
typeof text ===
"object" &&
!Array.isArray(
text
) &&
Array.isArray(
text.lines
);

if(
multiline
){

const measuredLines =
text.lines.map(
line=>
measureSegments(
line
)
);

const lineHeights =
text.lines.map(
line=>{

if(
line.some(
seg=>seg.font ===
"volume"
)
){
return 20;
}

if(
line.some(
seg=>seg.font ===
"badge" ||
seg.font ===
"tp" ||
seg.font ===
"sl"
)
){
return 18;
}

return 14;

}
);

const textWidth =
Math.max(
...measuredLines.map(
lineTextWidth
)
);

const bw =
textWidth + padX * 2;
const bh =
lineHeights.reduce(
(sum, h)=>sum + h,
0
) +
lineGap *
(
measuredLines.length -
1
) +
padY * 2;

const left =
cx - bw / 2;
const top =
cy - bh / 2;

fillPositionBadgeRect(
ctx,
left,
top,
bw,
bh,
fill,
stroke
);

ctx.textAlign = "left";

let y =
top + padY;

measuredLines.forEach(
(measured, idx)=>{

const lineH =
lineHeights[
idx
];
const lineCy =
y + lineH / 2;

drawMeasuredLine(
measured,
lineCy
);

y +=
lineH + lineGap;

}
);

ctx.restore();

return;

}

const segments =
Array.isArray(
text
)
? text
:[
{
text,
font: variant
}
];

const hasVolumeHighlight =
segments.some(
seg=>seg.font ===
"volume"
);

const measured =
measureSegments(
segments
);

const textWidth =
lineTextWidth(
measured
);
const bw =
textWidth + padX * 2;
const bh =
hasVolumeHighlight
? 22
: 18;
const left =
cx - bw / 2;
const top =
cy - bh / 2;

fillPositionBadgeRect(
ctx,
left,
top,
bw,
bh,
fill,
stroke
);

ctx.textAlign = "left";

drawMeasuredLine(
measured,
cy
);

ctx.restore();

}

function drawPositionPriceTags(
ctx,
shape,
chartW
){

const entry =
positionEntryPrice(shape);
const yEntry =
series.priceToCoordinate(entry);
const yTp =
plotPriceToCoordinate(
shape.tpPrice
);
const ySl =
plotPriceToCoordinate(
shape.slPrice
);

if(
yEntry == null ||
yTp == null ||
ySl == null
){
return;
}

const tagX =
chartW - 6;
const items = [
{ y: yTp, text: formatPositionPrice(shape.tpPrice), variant: "tp" },
{ y: yEntry, text: formatPositionPrice(entry), variant: "rr" },
{ y: ySl, text: formatPositionPrice(shape.slPrice), variant: "sl" }
];

items.forEach(item=>{

ctx.save();
ctx.font =
'600 10px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif';
ctx.textAlign = "right";
ctx.textBaseline = "middle";

const padX = 6;
const padY = 3;
const tw =
ctx.measureText(item.text).width + padX * 2;
const th = 16;
const left =
tagX - tw;
const top =
item.y - th / 2;

let fill =
"rgba(30, 41, 59, 0.95)";

if(item.variant === "tp"){
fill = "rgba(22, 101, 52, 0.95)";
}else if(item.variant === "sl"){
fill = "rgba(127, 29, 29, 0.95)";
}else{
fill = "rgba(113, 63, 18, 0.95)";
}

fillPositionBadgeRect(
ctx,
left,
top,
tw,
th,
fill,
null
);
ctx.fillStyle = "#f8fafc";
ctx.fillText(item.text, tagX - padX, item.y);
ctx.restore();

});

}

function drawPosition(ctx, shape, showLabels){

const box =
positionXBounds(shape);

if(!box){
return;
}

const yTp =
plotPriceToCoordinate(
shape.tpPrice
);
const ySl =
plotPriceToCoordinate(
shape.slPrice
);

if(
yTp == null ||
ySl == null
){
return;
}

const { x1, x2, yEntry } = box;
const w =
x2 - x1;
const isLong =
shape.type === "long";

ctx.save();

if(isLong){

ctx.fillStyle = POSITION_TP_FILL;
ctx.fillRect(
x1,
Math.min(yEntry, yTp),
w,
Math.abs(yEntry - yTp)
);

ctx.fillStyle = POSITION_SL_FILL;
ctx.fillRect(
x1,
Math.min(yEntry, ySl),
w,
Math.abs(yEntry - ySl)
);

}else{

ctx.fillStyle = POSITION_SL_FILL;
ctx.fillRect(
x1,
Math.min(yEntry, ySl),
w,
Math.abs(yEntry - ySl)
);

ctx.fillStyle = POSITION_TP_FILL;
ctx.fillRect(
x1,
Math.min(yEntry, yTp),
w,
Math.abs(yEntry - yTp)
);

}

ctx.strokeStyle = POSITION_ENTRY_COLOR;
ctx.lineWidth = 2;
ctx.setLineDash([]);
ctx.beginPath();
ctx.moveTo(x1, yEntry);
ctx.lineTo(x2, yEntry);
ctx.stroke();

ctx.restore();

if(!showLabels){
return;
}

const sizing =
positionSizingFromShape(shape);

const metrics =
positionMetrics(shape);
const cx =
(x1 + x2) / 2;
const topY =
Math.min(
yEntry,
yTp,
ySl
);
const botY =
Math.max(
yEntry,
yTp,
ySl
);

let tpText;
let slText;
let entryText;

if(
sizing
){

tpText =
`TP: ${sizing.tpPct.toFixed(2)}% (${formatMoneyUsd(sizing.profitUsd)})`;

slText =
`SL: ${sizing.slPct.toFixed(2)}% (${formatMoneyUsd(sizing.riskUsd)})`;

}else{

if(
isLong
){

tpText = `${metrics.tpPct.toFixed(3)}%`;
slText = `${metrics.slPct.toFixed(3)}%`;

}else{

slText = `${metrics.slPct.toFixed(3)}%`;
tpText = `${metrics.tpPct.toFixed(3)}%`;

}

entryText =
`RR: ${metrics.rr}`;

}

const centerVariant =
isLong
? "long-center"
: "short-center";

if(
isLong
){

drawPositionBadge(
ctx,
tpText,
cx,
positionBadgeCyOutside(
topY,
"above"
),
"tp"
);

drawPositionBadge(
ctx,
slText,
cx,
positionBadgeCyOutside(
botY,
"below"
),
"sl"
);

}else{

drawPositionBadge(
ctx,
slText,
cx,
positionBadgeCyOutside(
topY,
"above"
),
"sl"
);

drawPositionBadge(
ctx,
tpText,
cx,
positionBadgeCyOutside(
botY,
"below"
),
"tp"
);

}

if(
sizing
){

drawPositionBadge(
ctx,
{
lines: [
[
{ text:"Объем ", font:"entry" },
{
text: formatVolumeUsd(
sizing.volume
),
font: "volume",
color: POSITION_VOLUME_COLOR
},
{ text:" $", font:"entry" }
],
[
{
text:`RR: ${sizing.rrNum.toFixed(2)}`,
font:"tp"
}
]
]
},
cx,
yEntry,
centerVariant
);

}else{

drawPositionBadge(
ctx,
entryText,
cx,
yEntry,
centerVariant
);

}

drawPositionPriceTags(
ctx,
shape,
chartSize().w
);

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

function drawPositionAnchor(ctx, x, y){

ctx.save();
ctx.beginPath();
ctx.arc(x, y, 7, 0, Math.PI * 2);
ctx.strokeStyle = "#808080";
ctx.lineWidth = 2;
ctx.stroke();
ctx.restore();

}

function getPositionHandleScreens(shape){

const box =
positionXBounds(shape);

if(!box){
return [];
}

const yTp =
plotPriceToCoordinate(
shape.tpPrice
);
const ySl =
plotPriceToCoordinate(
shape.slPrice
);

if(
yTp == null ||
ySl == null
){
return [];
}

const leftX =
box.x1;

return [
{ id: "entryL", x: leftX, y: box.yEntry },
{ id: "entryR", x: box.x2, y: box.yEntry },
{ id: "tp", x: leftX, y: yTp },
{ id: "sl", x: leftX, y: ySl }
];

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

if(shape.type === "hray"){

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
redrawLoopCtl?.redraw?.()
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
hideStandardChartCrosshair
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

if(d.type === "hray"){

const anchor = toXY({
time: d.time,
price: d.price
});

if(anchor){
dist = distToSegment(
px,
py,
anchor.x,
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

if(
!canUseDrawings()
){
window.alert(
DRAW_TOOLS_GUEST_MSG
);
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

void deleteDrawingFromCloud(
symDel,
removed.id
);
}

drawings = drawings.filter(d=>d.id !== selectedId);
desktopEdit.clearDrawingSelection();
saveDrawings();
updateStyleBar();
redraw();

void flushDrawingsCloudPush().catch(err=>{
console.warn(
"delete drawing cloud:",
err?.message || err
);
});

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
void deleteDrawingFromCloud(
sym,
d.id
);
}

drawings = [];
selectedId = null;
cancelPlacement();
saveDrawings();

void flushDrawingsCloudPush().catch(err=>{
console.warn(
"clear drawings cloud:",
err?.message || err
);
});

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

holdChartPanRedraw();
redraw();

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
deleteSelected();
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
getToolDefaults:()=>toolDefaults,
deleteSelected,
flushDeferredFibSettingsSync,
getDesktopEdit:()=>desktopEdit,
getSymbol
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
}
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
isTouchDrawPlacement
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
!alive ||
!canUseDrawings()
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

void import(
"../drawings-cloud-sync.js?v=46"
).then(
m=>{
m.bumpDrawingsPullNow?.();
return m.pullDrawingsFromCloudNow();
}
).catch(
()=>{}
).finally(
()=>{
applyRemoteDrawingsToChart(
null
);
}
);

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

const onDrawingsCloudChanged = e=>{

if(
!alive
){
return;
}

applyRemoteDrawingsToChart(
e.detail?.symbols
);

};

window.addEventListener(
"drawings-cloud-changed",
onDrawingsCloudChanged
);

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
canUseDrawings() &&
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

if(!alive || !isActive()){
return;
}

scheduleRedraw();

};

window.addEventListener(
"alerts-registry-pulled",
onAlertsRegistryPulled
);

const unregisterDrawingsChartRefresh =
registerDrawingsChartRefresh(
applyRemoteDrawingsToChart
);

touchStorageSnap();

let drawAuthLossTimer =
0;

const onCloudAuthChange = ()=>{
void refreshDrawToolsAccessUiAsync();
};

async function refreshDrawToolsAccessUiAsync(){

try{
await ensureCloudLoginResolved(
8000
);
}catch{
/* ignore */
}

refreshDrawToolsAccessUi();

if(
canUseDrawings()
){

if(
drawAuthLossTimer
){
window.clearTimeout(
drawAuthLossTimer
);
drawAuthLossTimer =
0;
}

loadDrawings();
}else{

if(
drawAuthLossTimer
){
window.clearTimeout(
drawAuthLossTimer
);
}

drawAuthLossTimer =
window.setTimeout(
()=>{

drawAuthLossTimer =
0;

if(
!canUseDrawings()
){
drawings = [];
selectedId = null;
cancelPlacement();
updateStyleBar();
scheduleRedraw();
}

},
1500
);

}

updateStyleBar();
scheduleRedraw();

}

const unsubscribeCloudAuthChange =
onCloudSyncChange(onCloudAuthChange);

window.addEventListener(
"draw-tools-access-changed",
onCloudAuthChange
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

void flushDrawingsCloudPush();

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

void flushDrawingsCloudPush();

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
void refreshDrawToolsAccessUiAsync();
resizeCanvas();
updateStyleBar();
scheduleRedraw();

return {

getTool: ()=> tool,
setTool,
pickDrawTool,
refreshDrawToolsAccessUi,
refreshDrawToolsAccessUiAsync,
canUseDrawings,
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

return !!dragState;

},

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

return !!placement;

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

resetDrawUndoHistory();

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
"drawings-cloud-changed",
onDrawingsCloudChanged
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
onCloudAuthChange
);

window.removeEventListener(
"pagehide",
onPageHide
);

unsubscribeCloudAuthChange?.();

unregisterDrawingsChartRefresh?.();

window.removeEventListener(
"chart-candles-loaded",
onChartCandlesLoaded
);

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
