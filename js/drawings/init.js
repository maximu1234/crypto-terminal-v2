import {
parseDrawColor,
formatDrawColor
} from "../draw-color-palette.js?v=e2a8aa69";

import {
TRASH_ICON_SVG
} from "../draw-ui-shared.js?v=a01caf04";

import {
closeAllWidgetDrawToolsMenus
} from "../watchlist-draw-ui.js?v=7adb537b";

import {
ensureDrawToolsVisible
} from "../draw-tools-visible.js?v=fc8f1d0d";

import {
touchShapeRevision,
recordDrawingTombstone
} from "../drawings-storage.js?v=c2e9af64";

import {
EXCHANGE_CHANGED_EVENT,
loadMarketHistory
} from "../market-api.js?v=7b3e6b3c";

import {
registerDrawingsStoragePoller,
touchDrawingsStorageSnap
} from "../drawings-storage-poller.js?v=0da51745";

import {
layoutScaleLabelYs,
CHART_PRICE_HUD_FALLBACK_HEIGHT
} from "./scale-label-layout.js?v=03c98903";

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
} from "../chart-import.js?v=45dccc88";

import {
STROKE,
HANDLE_FILL,
HANDLE_STROKE,
WIDTH_OPTIONS,
isHorizPriceTool,
horizPriceLineX1
} from "./constants.js?v=c47ce407";

import {
getRectangleHandleScreens,
moveRectangleHandle
} from "./arrow-rect.js?v=8d4294c4";

import {
bindFvpDataSource,
clearFvpLtfCache,
isFvpType,
fvpBodyDist
} from "./fixed-volume-profile.js?v=bb03b4a7";

import {
distToSegment
} from "./math.js?v=2731b0ed";

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
isSeriesLogarithmic,
isFibType,
isFibExtType
} from "./fib-spec.js?v=5f577f26";

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
} from "./fib-portals.js?v=2d6d15fb";

import {
isPositionType,
positionEntryPrice,
positionXBounds as resolvePositionXBounds,
positionBodyDist as resolvePositionBodyDist,
getPositionHandleScreens as resolvePositionHandleScreens
} from "./position.js?v=152e419c";

import {
createDrawPrefs
} from "./draw-prefs.js?v=f4d23141";

import {
createPositionDraw
} from "./position-draw.js?v=e7f5f3e4";

import {
pickUi
} from "./utils.js?v=dff73c52";

import {
createDrawHitTester
} from "./draw-hit.js?v=f9862978";

import {
createDrawRenderer
} from "./draw-render.js?v=e287d58f";

import {
snapPlotToCandleWick
} from "./draw-magnet.js?v=df326ca8";

import {
computeChartRulerMetrics,
containingBarOpenTime,
drawChartRuler,
ensureChartRulerLabelEl,
hideChartRulerLabelEl,
isChartRulerGoingDown,
updateChartRulerLabelEl
} from "./chart-ruler.js?v=45402471";

import {
mountTabletDrawInput
} from "../drawings-tablet-input.js?v=26d41da8";

import {
cloneDrawingsForUndo,
createDrawUndoStack
} from "./draw-undo.js?v=4725fe9d";

import {
createDrawDesktopSelection
} from "./draw-edit-desktop.js?v=49e6d71d";

import {
createDrawingsPersist
} from "./drawings-persist.js?v=ccf2d710";

import {
createDrawStyleBar
} from "./draw-style-bar.js?v=133e7862";

import {
createDrawAlertsChart
} from "./draw-alerts-chart.js?v=7354751d";

import {
createDrawPlacement
} from "./draw-placement.js?v=b8c6f03e";

import {
createDrawTextEditor,
isTextTool,
hitTestTextBody
} from "./text.js?v=441520b6";

import {
isElliottType,
listElliottHandles
} from "./elliott-spec.js?v=3fb92981";

import {
closeElliottFlyout,
syncElliottGroupActive
} from "./elliott-toolbar.js?v=cd94d014";

import {
closeFibFlyout,
syncFibGroupActive
} from "./fib-toolbar.js?v=dd31e8c1";

import {
createBrushPlacement
} from "./brush-placement.js?v=971f7b05";

import {
createDrawEditInteraction
} from "./draw-edit-interaction.js?v=b9a97c4f";

import {
createDrawChartInput
} from "./draw-chart-input.js?v=50b3308a";

import {
createDrawPriceScale
} from "./draw-price-scale.js?v=1a917499";

import {
createDrawRedrawLoop
} from "./draw-redraw-loop.js?v=03c020ca";

import {
isAlgoReducedCloudClient
} from "../page-routes.js?v=4dc7f350";

import {
timeFromX as timeFromXMoved,
manualPriceToCoordinate as manualPriceToCoordinateMoved,
plotCoordinateToPrice as plotCoordinateToPriceMoved,
resolvePointFromPlotXY as resolvePointFromPlotXYMoved,
hitTest as hitTestMoved
} from "./draw-plot-hit.js?v=39e2ce10";
import {
setupTabletNativeSelectionBlock as setupTabletNativeSelectionBlockMoved,
drawBrushPlacementPreview as drawBrushPlacementPreviewMoved,
drawChartRulerOverlay as drawChartRulerOverlayMoved,
setTool as setToolMoved,
pickDrawTool as pickDrawToolMoved,
deleteSelected as deleteSelectedMoved,
handleChartRulerClick as handleChartRulerClickMoved,
clearAllDrawingsOnChart as clearAllDrawingsOnChartMoved,
bindClearAllToolbarButtons as bindClearAllToolbarButtonsMoved,
setDrawingsHidden as setDrawingsHiddenMoved,
handleToolbarToolPick as handleToolbarToolPickMoved
} from "./draw-tool-actions.js?v=c37a8c1c";
import {
notifyTabletChartGestureAbort as notifyTabletChartGestureAbortMoved,
selectedIdsList as selectedIdsListMoved,
isIdSelected as isIdSelectedMoved,
applyPrimarySelectedId as applyPrimarySelectedIdMoved,
applySelectedIds as applySelectedIdsMoved,
toggleIdInSelection as toggleIdInSelectionMoved,
refreshDrawToolsAccessUi as refreshDrawToolsAccessUiMoved,
getDrawToolsContainers as getDrawToolsContainersMoved,
isDrawingInteractionLocked as isDrawingInteractionLockedMoved,
shouldSuppressNativeSelection as shouldSuppressNativeSelectionMoved,
blocksDrawPaneSwitch as blocksDrawPaneSwitchMoved,
shouldDeferExternalDrawingsSync as shouldDeferExternalDrawingsSyncMoved,
flushDeferredFibSettingsSync as flushDeferredFibSettingsSyncMoved,
notifyAfterRedraw as notifyAfterRedrawMoved,
normalizeTime as normalizeTimeMoved,
candleSeries as candleSeriesMoved,
segmentX as segmentXMoved,
xFromTime as xFromTimeMoved,
resetDrawUndoHistory as resetDrawUndoHistoryMoved,
syncDrawUndoBaseline as syncDrawUndoBaselineMoved,
applyDrawingsUndoSnapshot as applyDrawingsUndoSnapshotMoved,
undoLastDrawingChange as undoLastDrawingChangeMoved,
getSelected as getSelectedMoved,
chartScrollWhenUnlocked as chartScrollWhenUnlockedMoved,
syncChartTouchPan as syncChartTouchPanMoved,
isTouchDrawTablet as isTouchDrawTabletMoved,
isTouchDrawPlacement as isTouchDrawPlacementMoved,
beginTouchPlacementSession as beginTouchPlacementSessionMoved,
useChartProbeCrosshair as useChartProbeCrosshairMoved,
initTouchDrawCrosshair as initTouchDrawCrosshairMoved,
syncTouchDrawCrosshairPreview as syncTouchDrawCrosshairPreviewMoved,
showStandardChartCrosshair as showStandardChartCrosshairMoved,
hideStandardChartCrosshair as hideStandardChartCrosshairMoved,
suppressChartCrosshairForDrag as suppressChartCrosshairForDragMoved,
syncEditDragCrosshair as syncEditDragCrosshairMoved,
beginEditDragCrosshair as beginEditDragCrosshairMoved,
clearEditDragCrosshair as clearEditDragCrosshairMoved,
placementPointsNeeded as placementPointsNeededMoved,
clearTouchDrawState as clearTouchDrawStateMoved,
getTouchDrawCrosshair as getTouchDrawCrosshairMoved,
getTouchPlaceTrack as getTouchPlaceTrackMoved,
pointFromParam as pointFromParamMoved,
clearChartRuler as clearChartRulerMoved,
syncChartRulerLayerClass as syncChartRulerLayerClassMoved,
scheduleChartRulerRedraw as scheduleChartRulerRedrawMoved,
isChartRulerShiftActive as isChartRulerShiftActiveMoved,
syncChartRulerShiftFromEvent as syncChartRulerShiftFromEventMoved,
syncChartRulerEndFromPlot as syncChartRulerEndFromPlotMoved,
readChartScaleMargins as readChartScaleMarginsMoved,
isPriceScaleInverted as isPriceScaleInvertedMoved,
pointFromXY as pointFromXYMoved,
plotPriceToCoordinate as plotPriceToCoordinateMoved,
toXY as toXYMoved,
isEphemeralDrawingShape as isEphemeralDrawingShapeMoved,
reapplyEphemeralDrawings as reapplyEphemeralDrawingsMoved,
setEphemeralDrawings as setEphemeralDrawingsMoved,
clearEphemeralDrawings as clearEphemeralDrawingsMoved,
chartSize as chartSizeMoved,
resizeCanvas as resizeCanvasMoved,
shapeStyle as shapeStyleMoved,
anchorCircleRadius as anchorCircleRadiusMoved,
anchorSquareHalfSize as anchorSquareHalfSizeMoved,
drawAnchorCircle as drawAnchorCircleMoved,
drawAnchorSquare as drawAnchorSquareMoved,
listHandles as listHandlesMoved,
pointerFromEvent as pointerFromEventMoved,
chartCanvasEl as chartCanvasElMoved,
onTextDblClick as onTextDblClickMoved,
syncDrawingsHiddenButton as syncDrawingsHiddenButtonMoved,
bindHideDrawingsToolbarButtons as bindHideDrawingsToolbarButtonsMoved,
touchStorageSnap as touchStorageSnapMoved,
syncDrawingsFromStorageIfChanged as syncDrawingsFromStorageIfChangedMoved,
startCoordRetryBurst as startCoordRetryBurstMoved,
applyRemoteDrawingsToChart as applyRemoteDrawingsToChartMoved,
syncDrawingsFromStorageNow as syncDrawingsFromStorageNowMoved,
defaultHrayAnchorTime as defaultHrayAnchorTimeMoved
} from "./draw-session.js?v=69c5893b";
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
alertSource =
"",
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

function drawSessionHost(){
if(!drawSessionHost.current){
drawSessionHost.current = {
get CHART_SCROLL_DEFAULT(){ return CHART_SCROLL_DEFAULT; },
get CHART_SCROLL_DRAW_TOOL(){ return CHART_SCROLL_DRAW_TOOL; },
get CHART_SCROLL_LOCKED(){ return CHART_SCROLL_LOCKED; },
get CHART_SCROLL_TABLET_CUSTOM_PAN(){ return CHART_SCROLL_TABLET_CUSTOM_PAN; },
get EPHEMERAL_DRAWING_FLAGS(){ return EPHEMERAL_DRAWING_FLAGS; },
get HANDLE_FILL(){ return HANDLE_FILL; },
get HANDLE_STROKE(){ return HANDLE_STROKE; },
get STROKE(){ return STROKE; },
get TABLET_USE_CUSTOM_TOUCH_PAN(){ return TABLET_USE_CUSTOM_TOUCH_PAN; },
get abortTabletChartGesture(){ return abortTabletChartGesture; },
get afterRedrawListeners(){ return afterRedrawListeners; },
get alive(){ return alive; },
get brushPlacementCtl(){ return brushPlacementCtl; },
get canvas(){ return canvas; },
get channelP4Point(){ return channelP4Point; },
get chart(){ return chart; },
get chartPanActive(){ return chartPanActive; },
get chartRulerEndPlot(){ return chartRulerEndPlot; },
set chartRulerEndPlot(value){ chartRulerEndPlot = value; },
get chartRulerLabelEl(){ return chartRulerLabelEl; },
get chartRulerRedrawRaf(){ return chartRulerRedrawRaf; },
set chartRulerRedrawRaf(value){ chartRulerRedrawRaf = value; },
get chartRulerShiftDown(){ return chartRulerShiftDown; },
set chartRulerShiftDown(value){ chartRulerShiftDown = value; },
get chartRulerStart(){ return chartRulerStart; },
set chartRulerStart(value){ chartRulerStart = value; },
get cloneDrawingsForUndo(){ return cloneDrawingsForUndo; },
get containingBarOpenTime(){ return containingBarOpenTime; },
get coordChart(){ return coordChart; },
get deferKeyboardUndo(){ return deferKeyboardUndo; },
get dragState(){ return dragState; },
get drawUndo(){ return drawUndo; },
get drawings(){ return drawings; },
set drawings(value){ drawings = value; },
get drawingsHidden(){ return drawingsHidden; },
get ensureDrawToolsVisible(){ return ensureDrawToolsVisible; },
get ephemeralDrawingsByFlag(){ return ephemeralDrawingsByFlag; },
get fibSettingsSyncDeferred(){ return fibSettingsSyncDeferred; },
set fibSettingsSyncDeferred(value){ fibSettingsSyncDeferred = value; },
get getCandles(){ return getCandles; },
get getSymbol(){ return getSymbol; },
get hasAnyFinePointer(){ return hasAnyFinePointer; },
get hideChartRulerLabelEl(){ return hideChartRulerLabelEl; },
get hitTest(){ return hitTest; },
get isActive(){ return isActive; },
get isCoarseTouchViewport(){ return isCoarseTouchViewport; },
get isElliottType(){ return isElliottType; },
get isFibExtType(){ return isFibExtType; },
get isFvpType(){ return isFvpType; },
get isHorizPriceTool(){ return isHorizPriceTool; },
get isPositionType(){ return isPositionType; },
get isTabletChartViewport(){ return isTabletChartViewport; },
get isTextTool(){ return isTextTool; },
get listElliottHandles(){ return listElliottHandles; },
get loadDrawings(){ return loadDrawings; },
get manualPriceScaleDrag(){ return manualPriceScaleDrag; },
get manualPriceToCoordinate(){ return manualPriceToCoordinate; },
get normalizeDrawingShape(){ return normalizeDrawingShape; },
get placement(){ return placement; },
get plotCoordinateToPrice(){ return plotCoordinateToPrice; },
get positionEntryPrice(){ return positionEntryPrice; },
get priceScaleDragActive(){ return priceScaleDragActive; },
get redraw(){ return redraw; },
get removePriceGutterOverlay(){ return removePriceGutterOverlay; },
get saveDrawings(){ return saveDrawings; },
get scheduleRedraw(){ return scheduleRedraw; },
get selectedId(){ return selectedId; },
set selectedId(value){ selectedId = value; },
get selectedIds(){ return selectedIds; },
get series(){ return series; },
get setDrawingsHidden(){ return setDrawingsHidden; },
get shapeCoordsReady(){ return shapeCoordsReady; },
get sharedDrawUndo(){ return sharedDrawUndo; },
get storageKey(){ return storageKey; },
get stripOrphanAlertDrawings(){ return stripOrphanAlertDrawings; },
get styleBarCtl(){ return styleBarCtl; },
get tabletCustomPanHooked(){ return tabletCustomPanHooked; },
get tabletDrawInput(){ return tabletDrawInput; },
get textEditor(){ return textEditor; },
get timeFromX(){ return timeFromX; },
get tool(){ return tool; },
get tools(){ return tools; },
get touchDrawingsStorageSnap(){ return touchDrawingsStorageSnap; },
get updateStyleBar(){ return updateStyleBar; },
get wrapEl(){ return wrapEl; }
};
}
return drawSessionHost.current;
}

function notifyTabletChartGestureAbort(){
return notifyTabletChartGestureAbortMoved(
drawSessionHost(),
...arguments
);
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

const textSizeBtn =
pickUi(uiRoot, "draw-text-size-btn", ".draw-text-size-btn");

const textSizeLabel =
pickUi(uiRoot, "draw-text-size-label", ".draw-text-size-label");

const textSizePopover =
pickUi(uiRoot, "draw-text-size-popover", ".draw-text-size-popover");

const settingsPopover =
pickUi(uiRoot, "draw-settings-popover", ".draw-settings-popover");

const settingsBtn =
pickUi(uiRoot, "draw-settings-btn", ".draw-settings-btn");

const deleteOneBtn =
pickUi(uiRoot, "draw-delete-one", ".draw-delete-one-btn");

const lockBtn =
pickUi(uiRoot, "draw-lock-btn", ".draw-lock-btn");

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
const selectedIds =
new Set();

function selectedIdsList(){
return selectedIdsListMoved(
drawSessionHost(),
...arguments
);
}

function isIdSelected(id){
return isIdSelectedMoved(
drawSessionHost(),
...arguments
);
}

function applyPrimarySelectedId(id){
return applyPrimarySelectedIdMoved(
drawSessionHost(),
...arguments
);
}

function applySelectedIds(ids,
primaryId){
return applySelectedIdsMoved(
drawSessionHost(),
...arguments
);
}

function toggleIdInSelection(id){
return toggleIdInSelectionMoved(
drawSessionHost(),
...arguments
);
}

let textEditor =
null;
let drawingsHidden =
false;
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
return refreshDrawToolsAccessUiMoved(
drawSessionHost(),
...arguments
);
}

function getDrawToolsContainers(){
return getDrawToolsContainersMoved(
drawSessionHost(),
...arguments
);
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
return isDrawingInteractionLockedMoved(
drawSessionHost(),
...arguments
);
}

function shouldSuppressNativeSelection(){
return shouldSuppressNativeSelectionMoved(
drawSessionHost(),
...arguments
);
}

function blocksDrawPaneSwitch(){
return blocksDrawPaneSwitchMoved(
drawSessionHost(),
...arguments
);
}

function shouldDeferExternalDrawingsSync(){
return shouldDeferExternalDrawingsSyncMoved(
drawSessionHost(),
...arguments
);
}

function flushDeferredFibSettingsSync(){
return flushDeferredFibSettingsSyncMoved(
drawSessionHost(),
...arguments
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

function notifyAfterRedraw(ctx,
plotW,
h){
return notifyAfterRedrawMoved(
drawSessionHost(),
...arguments
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
return normalizeTimeMoved(
drawSessionHost(),
...arguments
);
}

function candleSeries(){
return candleSeriesMoved(
drawSessionHost(),
...arguments
);
}

function segmentX(ts, t0, t1){
return segmentXMoved(
drawSessionHost(),
...arguments
);
}

function xFromTime(time){
return xFromTimeMoved(
drawSessionHost(),
...arguments
);
}

function plotHitHost(){
if(!plotHitHost.current){
plotHitHost.current = {
get brushBodyDist(){ return brushBodyDist; },
get candleSeries(){ return candleSeries; },
get channelBodyDist(){ return channelBodyDist; },
get coordChart(){ return coordChart; },
get distToSegment(){ return distToSegment; },
get drawBodyHitThreshold(){ return drawBodyHitThreshold; },
get drawMagnetKeyDown(){ return drawMagnetKeyDown; },
get drawings(){ return drawings; },
get drawingsHidden(){ return drawingsHidden; },
get elliottBodyDist(){ return elliottBodyDist; },
get enableMagnet(){ return enableMagnet; },
get fibBodyDist(){ return fibBodyDist; },
get fvpBodyDist(){ return fvpBodyDist; },
get getCandles(){ return getCandles; },
get getPlotWidth(){ return getPlotWidth; },
get hitTestHandle(){ return hitTestHandle; },
get hitTestTextBody(){ return hitTestTextBody; },
get horizPriceLineX1(){ return horizPriceLineX1; },
get isElliottType(){ return isElliottType; },
get isFibType(){ return isFibType; },
get isFvpType(){ return isFvpType; },
get isHorizPriceTool(){ return isHorizPriceTool; },
get isPositionType(){ return isPositionType; },
get isTextTool(){ return isTextTool; },
get manualPriceScaleDrag(){ return manualPriceScaleDrag; },
get normalizeTime(){ return normalizeTime; },
get plotPriceToCoordinate(){ return plotPriceToCoordinate; },
get positionBodyDist(){ return positionBodyDist; },
get priceScaleDragActive(){ return priceScaleDragActive; },
get rectangleBodyDist(){ return rectangleBodyDist; },
get segmentX(){ return segmentX; },
get series(){ return series; },
get snapPlotToCandleWick(){ return snapPlotToCandleWick; },
get toXY(){ return toXY; },
get trendlineBodyDist(){ return trendlineBodyDist; },
get xFromTime(){ return xFromTime; }
};
}
return plotHitHost.current;
}

function timeFromX(x){
return timeFromXMoved(
plotHitHost(),
...arguments
);
}

let storageKey;
let normalizeDrawingShape;
let loadDrawings;
let saveDrawings;
let persistDrawingsForSymbol;

function resetDrawUndoHistory(){
return resetDrawUndoHistoryMoved(
drawSessionHost(),
...arguments
);
}

function syncDrawUndoBaseline(){
return syncDrawUndoBaselineMoved(
drawSessionHost(),
...arguments
);
}

function applyDrawingsUndoSnapshot(prev){
return applyDrawingsUndoSnapshotMoved(
drawSessionHost(),
...arguments
);
}

function undoLastDrawingChange(){
return undoLastDrawingChangeMoved(
drawSessionHost(),
...arguments
);
}

function getSelected(){
return getSelectedMoved(
drawSessionHost(),
...arguments
);
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
return chartScrollWhenUnlockedMoved(
drawSessionHost(),
...arguments
);
}

function syncChartTouchPan(){
return syncChartTouchPanMoved(
drawSessionHost(),
...arguments
);
}


function isTouchDrawTablet(){
return isTouchDrawTabletMoved(
drawSessionHost(),
...arguments
);
}

function isTouchDrawPlacement(){
return isTouchDrawPlacementMoved(
drawSessionHost(),
...arguments
);
}

function beginTouchPlacementSession(pointerType){
return beginTouchPlacementSessionMoved(
drawSessionHost(),
...arguments
);
}

function useChartProbeCrosshair(){
return useChartProbeCrosshairMoved(
drawSessionHost(),
...arguments
);
}

function initTouchDrawCrosshair(){
return initTouchDrawCrosshairMoved(
drawSessionHost(),
...arguments
);
}

function syncTouchDrawCrosshairPreview(){
return syncTouchDrawCrosshairPreviewMoved(
drawSessionHost(),
...arguments
);
}

function showStandardChartCrosshair(e,
localX,
localY){
return showStandardChartCrosshairMoved(
drawSessionHost(),
...arguments
);
}

function hideStandardChartCrosshair(){
return hideStandardChartCrosshairMoved(
drawSessionHost(),
...arguments
);
}

function suppressChartCrosshairForDrag(){
return suppressChartCrosshairForDragMoved(
drawSessionHost(),
...arguments
);
}

function syncEditDragCrosshair(e,
localX,
localY){
return syncEditDragCrosshairMoved(
drawSessionHost(),
...arguments
);
}

function beginEditDragCrosshair(e,
localX,
localY){
return beginEditDragCrosshairMoved(
drawSessionHost(),
...arguments
);
}

function clearEditDragCrosshair(){
return clearEditDragCrosshairMoved(
drawSessionHost(),
...arguments
);
}

function placementPointsNeeded(type){
return placementPointsNeededMoved(
drawSessionHost(),
...arguments
);
}

function clearTouchDrawState(){
return clearTouchDrawStateMoved(
drawSessionHost(),
...arguments
);
}

function getTouchDrawCrosshair(){
return getTouchDrawCrosshairMoved(
drawSessionHost(),
...arguments
);
}

function getTouchPlaceTrack(){
return getTouchPlaceTrackMoved(
drawSessionHost(),
...arguments
);
}



function pointFromParam(param){
return pointFromParamMoved(
drawSessionHost(),
...arguments
);
}

function clearChartRuler(){
return clearChartRulerMoved(
drawSessionHost(),
...arguments
);
}

function syncChartRulerLayerClass(){
return syncChartRulerLayerClassMoved(
drawSessionHost(),
...arguments
);
}

function scheduleChartRulerRedraw(){
return scheduleChartRulerRedrawMoved(
drawSessionHost(),
...arguments
);
}

function isChartRulerShiftActive(optEvent){
return isChartRulerShiftActiveMoved(
drawSessionHost(),
...arguments
);
}

function syncChartRulerShiftFromEvent(optEvent){
return syncChartRulerShiftFromEventMoved(
drawSessionHost(),
...arguments
);
}

function drawToolHost(){
if(!drawToolHost.current){
drawToolHost.current = {
get alive(){ return alive; },
get applyPrimarySelectedId(){ return applyPrimarySelectedId; },
get baseDefaultStyle(){ return baseDefaultStyle; },
get brushPlacementCtl(){ return brushPlacementCtl; },
get cancelPlacement(){ return cancelPlacement; },
get candleSeries(){ return candleSeries; },
get chartRulerEndPlot(){ return chartRulerEndPlot; },
set chartRulerEndPlot(value){ chartRulerEndPlot = value; },
get chartRulerLabelEl(){ return chartRulerLabelEl; },
get chartRulerStart(){ return chartRulerStart; },
set chartRulerStart(value){ chartRulerStart = value; },
get clearAllPeers(){ return clearAllPeers; },
get clearChartRuler(){ return clearChartRuler; },
get closeAllWidgetDrawToolsMenus(){ return closeAllWidgetDrawToolsMenus; },
get closeElliottFlyout(){ return closeElliottFlyout; },
get closeFibFlyout(){ return closeFibFlyout; },
get computeChartRulerMetrics(){ return computeChartRulerMetrics; },
get desktopEdit(){ return desktopEdit; },
get drawAnchorCircle(){ return drawAnchorCircle; },
get drawChartRuler(){ return drawChartRuler; },
get drawShape(){ return drawShape; },
get drawings(){ return drawings; },
set drawings(value){ drawings = value; },
get drawingsHidden(){ return drawingsHidden; },
set drawingsHidden(value){ drawingsHidden = value; },
get getSymbol(){ return getSymbol; },
get isActive(){ return isActive; },
get isChartRulerGoingDown(){ return isChartRulerGoingDown; },
get isChartRulerShiftActive(){ return isChartRulerShiftActive; },
get isCoarseTouchViewport(){ return isCoarseTouchViewport; },
get isTabletChartViewport(){ return isTabletChartViewport; },
get lastToolPickStamp(){ return lastToolPickStamp; },
set lastToolPickStamp(value){ lastToolPickStamp = value; },
get notifyTabletChartGestureAbort(){ return notifyTabletChartGestureAbort; },
get pointFromXY(){ return pointFromXY; },
get recordDrawingTombstone(){ return recordDrawingTombstone; },
get redraw(){ return redraw; },
get saveDrawings(){ return saveDrawings; },
get scheduleRedraw(){ return scheduleRedraw; },
get selectedId(){ return selectedId; },
get selectedIds(){ return selectedIds; },
get selectedIdsList(){ return selectedIdsList; },
get shouldSuppressNativeSelection(){ return shouldSuppressNativeSelection; },
get startPlacement(){ return startPlacement; },
get styleBar(){ return styleBar; },
get syncChartRulerLayerClass(){ return syncChartRulerLayerClass; },
get syncDrawingsHiddenButton(){ return syncDrawingsHiddenButton; },
get syncElliottGroupActive(){ return syncElliottGroupActive; },
get syncFibGroupActive(){ return syncFibGroupActive; },
get textEditor(){ return textEditor; },
get toXY(){ return toXY; },
get tool(){ return tool; },
set tool(value){ tool = value; },
get tools(){ return tools; },
get updateChartRulerLabelEl(){ return updateChartRulerLabelEl; },
get updateStyleBar(){ return updateStyleBar; },
get wrapEl(){ return wrapEl; }
};
}
return drawToolHost.current;
}

function drawChartRulerOverlay(ctx,
plotW,
plotH){
return drawChartRulerOverlayMoved(
drawToolHost(),
...arguments
);
}

function syncChartRulerEndFromPlot(rawX,
rawY){
return syncChartRulerEndFromPlotMoved(
drawSessionHost(),
...arguments
);
}

function handleChartRulerClick(point,
param){
return handleChartRulerClickMoved(
drawToolHost(),
...arguments
);
}



function readChartScaleMargins(){
return readChartScaleMarginsMoved(
drawSessionHost(),
...arguments
);
}

function isPriceScaleInverted(){
return isPriceScaleInvertedMoved(
drawSessionHost(),
...arguments
);
}

function manualPriceToCoordinate(price){
return manualPriceToCoordinateMoved(
plotHitHost(),
...arguments
);
}

function plotCoordinateToPrice(py){
return plotCoordinateToPriceMoved(
plotHitHost(),
...arguments
);
}

function pointFromXY(px, py){
return pointFromXYMoved(
drawSessionHost(),
...arguments
);
}

/** Не сбрасывать якорь при кратком сбое time/price (зум, скролл, redraw). */
function resolvePointFromPlotXY(px,
py,
prev = null,
optEvent = null){
return resolvePointFromPlotXYMoved(
plotHitHost(),
...arguments
);
}

function plotPriceToCoordinate(price){
return plotPriceToCoordinateMoved(
drawSessionHost(),
...arguments
);
}

function toXY(point){
return toXYMoved(
drawSessionHost(),
...arguments
);
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
setSelectedId: applyPrimarySelectedId,
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

function isEphemeralDrawingShape(shape){
return isEphemeralDrawingShapeMoved(
drawSessionHost(),
...arguments
);
}

const loadDrawingsFromStorage =
loadDrawings;

const saveDrawingsToStorage =
saveDrawings;

function reapplyEphemeralDrawings(){
return reapplyEphemeralDrawingsMoved(
drawSessionHost(),
...arguments
);
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

void import("../drawings-kv.js?v=fc0e52d7").then(
(
m
)=>{

void m.ensureDrawingsKvReady().then(
()=>{

if(
typeof loadDrawings ===
"function"
){
loadDrawings();
scheduleRedraw();
}

}
);

try{

window.addEventListener(
"drawings-kv-ready",
()=>{

if(
typeof loadDrawings ===
"function"
){
loadDrawings();
scheduleRedraw();
}

}
);

}catch{
/* ignore */
}

}
);

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

function setEphemeralDrawings(flag,
shapes){
return setEphemeralDrawingsMoved(
drawSessionHost(),
...arguments
);
}

function clearEphemeralDrawings(){
return clearEphemeralDrawingsMoved(
drawSessionHost(),
...arguments
);
}

function chartSize(){
return chartSizeMoved(
drawSessionHost(),
...arguments
);
}


function resizeCanvas(){
return resizeCanvasMoved(
drawSessionHost(),
...arguments
);
}

function shapeStyle(shape){
return shapeStyleMoved(
drawSessionHost(),
...arguments
);
}


function anchorCircleRadius(){
return anchorCircleRadiusMoved(
drawSessionHost(),
...arguments
);
}

function anchorSquareHalfSize(){
return anchorSquareHalfSizeMoved(
drawSessionHost(),
...arguments
);
}


function drawAnchorCircle(ctx, x, y){
return drawAnchorCircleMoved(
drawSessionHost(),
...arguments
);
}

function drawAnchorSquare(ctx, x, y){
return drawAnchorSquareMoved(
drawSessionHost(),
...arguments
);
}

function listHandles(shape){
return listHandlesMoved(
drawSessionHost(),
...arguments
);
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
getDrawingsHidden:()=>
drawingsHidden,
getSelectedId:()=>selectedId,
getSelectedIds: selectedIdsList,
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
return pointerFromEventMoved(
drawSessionHost(),
...arguments
);
}

function chartCanvasEl(){
return chartCanvasElMoved(
drawSessionHost(),
...arguments
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
elliottBodyDist,
hitTestElliottBody,
rectangleBodyDist,
hitTestRectangleBody,
hitTestFvpBody,
drawBodyHitThreshold,
drawingsIntersectingRect
} =
createDrawHitTester({
toXY,
getPlotWidth,
series,
pointFromXY,
getCandles:()=>
getCandles?.() ||
[],
plotPriceToCoordinate
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
getIsIdSelected: isIdSelected,
getEditingTextId:()=>
textEditor?.editingId?.() ||
null,
parseDrawColor,
formatDrawColor,
getCandles:()=>
getCandles?.() ||
[]
});


if(
drawPriceAlerts
){

alertsChart =
createDrawAlertsChart({
chart,
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
scheduleRedraw,
matchAlert(
alert
){

const src =
String(
alert?.source ||
""
).trim().toLowerCase();

if(
alertSource ===
"rsi"
){
return src ===
"rsi";
}

if(
alertSource ===
"macd"
){
return src ===
"macd";
}

return src !==
"rsi" &&
src !==
"macd";

}
});

({
drawRegistryPriceAlerts,
stripOrphanAlertDrawings
} =
alertsChart);

}


function drawBrushPlacementPreview(ctx,
plotW,
h){
return drawBrushPlacementPreviewMoved(
drawToolHost(),
...arguments
);
}


redrawLoopCtl =
createDrawRedrawLoop({
canvas,
chartSize,
getPlotWidth,
getChartPanActive:()=>chartPanActive,
getDrawings:()=>drawings,
getDrawingsHidden:()=>
drawingsHidden,
getSelectedId:()=>selectedId,
getIsIdSelected: isIdSelected,
getDragState:()=>dragState,
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
onAfterRedraw:notifyAfterRedraw,
getCandles:()=>
getCandles?.() ||
[],
chart
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

bindFvpDataSource({
getSymbol,
getTf,
getCandles:()=>
getCandles?.() ||
[],
loadHistory: loadMarketHistory,
scheduleRedraw:()=>
scheduleRedraw?.()
});

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
getShiftKeyDown:()=>chartRulerShiftDown,
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
setSelectedId: applyPrimarySelectedId,
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
syncChartTouchPan,
onTextPlaced(
shape
){

desktopEdit?.pinDrawingSelection?.(
shape?.id
);
updateStyleBar();

requestAnimationFrame(
()=>{
textEditor?.begin?.(
shape
);
}
);

},
beginTouchPlacementSession
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
return hitTestMoved(
plotHitHost(),
...arguments
);
}

function setTool(next,
pointerType){
return setToolMoved(
drawToolHost(),
...arguments
);
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

function pickDrawTool(next,
pointerType){
return pickDrawToolMoved(
drawToolHost(),
...arguments
);
}

function deleteSelected(){
return deleteSelectedMoved(
drawToolHost(),
...arguments
);
}

textEditor =
createDrawTextEditor({
wrapEl,
toXY,
getDrawings:()=>
drawings,
saveDrawings,
redraw,
touchShapeRevision,
onEmptyDelete(
id
){
applyPrimarySelectedId(
id
);
deleteSelected();
}
});

function onTextDblClick(e){
return onTextDblClickMoved(
drawSessionHost(),
...arguments
);
}

wrapEl.addEventListener(
"dblclick",
onTextDblClick
);

function clearAllDrawingsOnChart(){
return clearAllDrawingsOnChartMoved(
drawToolHost(),
...arguments
);
}

function syncDrawingsHiddenButton(){
return syncDrawingsHiddenButtonMoved(
drawSessionHost(),
...arguments
);
}

function setDrawingsHidden(next){
return setDrawingsHiddenMoved(
drawToolHost(),
...arguments
);
}

function bindHideDrawingsToolbarButtons(){
return bindHideDrawingsToolbarButtonsMoved(
drawSessionHost(),
...arguments
);
}

function bindClearAllToolbarButtons(){
return bindClearAllToolbarButtonsMoved(
drawToolHost(),
...arguments
);
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

if(
tool !==
"cursor" &&
drawingsHidden
){
setDrawingsHidden(
false
);
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

closeElliottFlyout();
closeFibFlyout();

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
refreshPlacementPreviewFromPointer(
e
);
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
refreshPlacementPreviewFromPointer(
e
);

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
dragState &&
reapplyActiveDragCoordsHook
){
reapplyActiveDragCoordsHook();
scheduleDragRedraw();
}

}

chartRulerShiftDown = false;

if(
placement &&
placementPointerXY
){
refreshPlacementPreviewFromPointer();
}

if(
chartRulerStart
){
clearChartRuler();
redraw();
}

};

window.addEventListener("blur", onWindowBlur);

function handleToolbarToolPick(e){
return handleToolbarToolPickMoved(
drawToolHost(),
...arguments
);
}

const onToolsPointerDown =
e=>{

if(
e.target.closest?.(
".draw-tool-clear-all"
) ||
e.target.closest?.(
".draw-tool-hide-drawings"
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

const hideBtn =
e.target.closest?.(
".draw-tool-hide-drawings"
);

if(
hideBtn &&
tools.contains(
hideBtn
)
){
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

tools.addEventListener(
"draw-pick-tool",
e=>{

const next =
e.detail?.tool;

if(
next
){
pickDrawTool(
next,
e.detail?.pointerType
);
}

}
);

bindClearAllToolbarButtons();
bindHideDrawingsToolbarButtons();

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
setSelectedId: applyPrimarySelectedId,
getSelectedIds: selectedIdsList,
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
textSizeBtn,
textSizeLabel,
textSizePopover,
settingsPopover,
settingsBtn,
deleteOneBtn,
lockBtn,
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
getCandles:()=>
getCandles?.() ||
[],
getTf,
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
setSelectedId: applyPrimarySelectedId,
getSelectedIds: selectedIdsList,
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
textSizePopover,
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
setSelectedId: applyPrimarySelectedId,
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
setSelectedId: applyPrimarySelectedId,
getSelectedIds: selectedIdsList,
toggleSelectedId: toggleIdInSelection,
setSelectedIds: applySelectedIds,
isIdSelected,
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
hitTestElliottBody,
hitTestRectangleBody,
hitTestFvpBody,
hitTestHrayLine,
channelP4Point,
drawBodyHitThreshold,
drawingsIntersectingRect:(
list,
x1,
y1,
x2,
y2
)=>
drawingsHidden
? []
: drawingsIntersectingRect(
list,
x1,
y1,
x2,
y2
),
getCandles:()=>
getCandles?.() ||
[]
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
isTouchDrawPlacement,
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
return setupTabletNativeSelectionBlockMoved(
drawToolHost(),
...arguments
);
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
applyPrimarySelectedId(
null
);
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
return touchStorageSnapMoved(
drawSessionHost(),
...arguments
);
}

function syncDrawingsFromStorageIfChanged(){
return syncDrawingsFromStorageIfChangedMoved(
drawSessionHost(),
...arguments
);
}

function startCoordRetryBurst(){
return startCoordRetryBurstMoved(
drawSessionHost(),
...arguments
);
}

function applyRemoteDrawingsToChart(symbols,
options = {}){
return applyRemoteDrawingsToChartMoved(
drawSessionHost(),
...arguments
);
}

function syncDrawingsFromStorageNow(){
return syncDrawingsFromStorageNowMoved(
drawSessionHost(),
...arguments
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

clearFvpLtfCache();

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
"../alerts-cloud-sync.js?v=4d6df436"
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
return defaultHrayAnchorTimeMoved(
drawSessionHost(),
...arguments
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
getSelectedIds: selectedIdsList,
getSelected,
getPlacement: ()=> placement,
getDrawings: ()=> drawings,
getDesktopEdit: ()=> desktopEdit,
saveDrawings,
redraw,
saveToolDefaults,
saveGlobalStyle,
baseDefaultStyle,
deleteSelected,
getCandles: ()=>
getCandles?.() ||
[],
getTf

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

clearFvpLtfCache();

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
textEditor?.destroy?.();
textEditor =
null;
wrapEl.removeEventListener(
"dblclick",
onTextDblClick
);
resetDrawUndoHistory();
applyPrimarySelectedId(
null
);
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
alertsChart?.destroy?.();
alertsChart =
null;

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
