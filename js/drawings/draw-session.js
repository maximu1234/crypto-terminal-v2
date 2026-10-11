/**
 * Closure slice. `host` is the surrounding function's bindings.
 */
export function notifyTabletChartGestureAbort(host){

try{
host.abortTabletChartGesture?.();
}catch{
/* ignore */
}

}

export function selectedIdsList(host){

return [
...host.selectedIds
];

}

export function isIdSelected(host, 
id
){

return !!id &&
host.selectedIds.has(
id
);

}

export function applyPrimarySelectedId(host, 
id
){

host.selectedId =
id ||
null;
host.selectedIds.clear();

if(
host.selectedId
){
host.selectedIds.add(
host.selectedId
);
}

}

export function applySelectedIds(host, 
ids,
primaryId
){

host.selectedIds.clear();

for(
const id of ids ||
[]
){

if(
id
){
host.selectedIds.add(
id
);
}

}

if(
primaryId &&
host.selectedIds.has(
primaryId
)
){
host.selectedId =
primaryId;
}else if(
!(
host.selectedId &&
host.selectedIds.has(
host.selectedId
)
)
){
host.selectedId =
host.selectedIds.size
? [
...host.selectedIds
][
host.selectedIds.size -
1
]
: null;
}

}

export function toggleIdInSelection(host, 
id
){

if(
!id
){
return;
}

if(
host.selectedIds.has(
id
)
){

host.selectedIds.delete(
id
);

if(
host.selectedId ===
id
){
host.selectedId =
host.selectedIds.size
? [
...host.selectedIds
][
host.selectedIds.size -
1
]
: null;
}

}else{

host.selectedIds.add(
id
);
host.selectedId =
id;

}

}

export function refreshDrawToolsAccessUi(host){

host.ensureDrawToolsVisible();

getDrawToolsContainers(host).forEach(el=>{
el.classList.remove(
"hidden",
"draw-tools--locked"
);
el.setAttribute(
"aria-disabled",
"false"
);
});

host.tools.querySelectorAll(
"[data-draw-tool], .draw-tool-clear-all"
).forEach(btn=>{
btn.classList.remove(
"hidden",
"draw-tools-btn--locked"
);
btn.disabled = false;
});

}

export function getDrawToolsContainers(host){

const found =
new Set();

[
host.tools,
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

export function isDrawingInteractionLocked(host){

return !!(
host.dragState ||
host.placement ||
host.brushPlacementCtl?.getBrushStroke?.()
);

}

export function shouldSuppressNativeSelection(host){

if(
!host.alive ||
!host.isActive()
){
return false;
}

return (
host.tool !==
"cursor" ||
isDrawingInteractionLocked(host)
);

}

export function blocksDrawPaneSwitch(host){

return !!(
host.dragState ||
host.placement?.points?.length ||
host.brushPlacementCtl?.getBrushStroke?.()
);

}

export function shouldDeferExternalDrawingsSync(host){

return (
isDrawingInteractionLocked(host) ||
(
host.styleBarCtl?.shouldDeferExternalDrawingsSync?.() ??
false
)
);

}

export function flushDeferredFibSettingsSync(host){

if(
!host.fibSettingsSyncDeferred
){
return;
}

host.fibSettingsSyncDeferred = false;

applyRemoteDrawingsToChart(host, 
[
host.getSymbol()
]
);

}

export function notifyAfterRedraw(host, 
ctx,
plotW,
h
){

host.afterRedrawListeners.forEach(
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

export function normalizeTime(host, time){

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

export function candleSeries(host){

return host.getCandles?.() || [];

}

export function segmentX(host, ts, t0, t1){

const x0 = ts.timeToCoordinate(t0);
const x1 = ts.timeToCoordinate(t1);

if(x0 == null || x1 == null){
return null;
}

return { x0, x1, dt: t1 - t0 };

}

export function xFromTime(host, time){

const t = normalizeTime(host, time);

if(t == null){
return null;
}

const ts =
host.coordChart.timeScale();
const direct =
ts.timeToCoordinate(t);

if(direct != null){
return direct;
}

const candles = candleSeries(host);

if(!candles.length){
return null;
}

const first = candles[0];
const last = candles[candles.length - 1];

/* Past / future beyond series: keep linear extrapolate so rays can extend. */
if(candles.length >= 2 && t < first.time){

const second = candles[1];
const seg = segmentX(host, ts, first.time, second.time);

if(!seg || seg.dt <= 0){
return seg?.x0 ?? null;
}

return seg.x0 + (seg.x1 - seg.x0) * ((t - first.time) / seg.dt);

}

if(candles.length >= 2 && t > last.time){

const prev = candles[candles.length - 2];
const seg = segmentX(host, ts, prev.time, last.time);

if(!seg || seg.dt <= 0){
return seg?.x1 ?? null;
}

return seg.x1 + (seg.x1 - seg.x0) * ((t - last.time) / seg.dt);

}

/* Between bars (e.g. 1h open on Daily): stick to containing bar column. */
const barOpen =
host.containingBarOpenTime(
candles,
t
);

if(barOpen == null){
return null;
}

return ts.timeToCoordinate(barOpen);

}

export function resetDrawUndoHistory(host){

host.drawUndo.reset();

if(
host.sharedDrawUndo &&
host.deferKeyboardUndo
){
host.sharedDrawUndo.reset();
}

}

export function syncDrawUndoBaseline(host){

host.drawUndo.syncBaseline(
host.cloneDrawingsForUndo(
host.drawings,
host.normalizeDrawingShape
)
);

}

export function applyDrawingsUndoSnapshot(host, 
prev
){

if(
!prev
){
return false;
}

const keepIds =
selectedIdsList(host);

host.drawUndo.setReplay(
true
);

host.drawings =
prev.map(shape=>
host.normalizeDrawingShape(
shape
)
);

applySelectedIds(host, 
keepIds.filter(
id=>
host.drawings.some(d=>d.id === id)
)
);

syncDrawUndoBaseline(host);

host.saveDrawings({
skipUndoRecord:true
});

host.drawUndo.setReplay(
false
);

host.updateStyleBar();
host.redraw();

return true;

}

export function undoLastDrawingChange(host){

if(
!host.alive ||
host.placement ||
host.dragState
){
return false;
}

if(
host.sharedDrawUndo?.canUndo?.()
){
return host.sharedDrawUndo.undo();
}

if(
!host.isActive() ||
!host.drawUndo.canUndo()
){
return false;
}

return applyDrawingsUndoSnapshot(host, 
host.drawUndo.pop()
);

}

export function getSelected(host){

return host.drawings.find(d=>d.id === host.selectedId) || null;

}

export function chartScrollWhenUnlocked(host){

if(
host.tabletCustomPanHooked &&
host.isTabletChartViewport() &&
host.TABLET_USE_CUSTOM_TOUCH_PAN &&
!host.hasAnyFinePointer()
){
return host.CHART_SCROLL_TABLET_CUSTOM_PAN;
}

if(
host.isCoarseTouchViewport() &&
!host.tabletCustomPanHooked &&
host.tool !==
"cursor"
){
return host.CHART_SCROLL_DRAW_TOOL;
}

return host.CHART_SCROLL_DEFAULT;

}

export function syncChartTouchPan(host){

const desktopStrokePlacementDrag =
!!host.placement &&
!isTouchDrawPlacement(host) &&
(
host.placement.type ===
"rectangle" ||
host.placement.type ===
"trendline" ||
host.placement.type ===
"fib" ||
host.placement.type ===
"fib-ext" ||
host.placement.type ===
"channel" ||
host.placement.type ===
"arrow"
) &&
host.placement.points.length >=
1;

const lock =
host.alive &&
(
!!host.dragState ||
(
host.placement &&
isTouchDrawPlacement(host)
) ||
desktopStrokePlacementDrag
);

try{
host.chart.applyOptions({
handleScroll: lock
? host.CHART_SCROLL_LOCKED
: chartScrollWhenUnlocked(host)
});
}catch{
/* ignore */
}

host.wrapEl?.classList.toggle(
"chart-touch-locked",
!!lock
);

}

export function isTouchDrawTablet(host){

return host.tabletDrawInput?.isTouchDrawTablet() ??
false;

}

export function isTouchDrawPlacement(host){

return host.tabletDrawInput?.isTouchDrawPlacement() ??
false;

}

export function beginTouchPlacementSession(host, 
pointerType
){

host.tabletDrawInput?.beginPlacementSession?.(
pointerType
);

}

export function useChartProbeCrosshair(host){

return host.tabletDrawInput?.useChartProbeCrosshair() ??
false;

}

export function initTouchDrawCrosshair(host){

host.tabletDrawInput?.initTouchDrawCrosshair();

}

export function syncTouchDrawCrosshairPreview(host){

host.tabletDrawInput?.syncTouchDrawCrosshairPreview();

}

export function showStandardChartCrosshair(host, 
e,
localX,
localY
){

host.tabletDrawInput?.showStandardChartCrosshair(
e,
localX,
localY
);

}

export function hideStandardChartCrosshair(host){

host.tabletDrawInput?.hideStandardChartCrosshair();

}

export function suppressChartCrosshairForDrag(host){

host.tabletDrawInput?.suppressChartCrosshairForDrag();

}

export function syncEditDragCrosshair(host, 
e,
localX,
localY
){

host.tabletDrawInput?.syncEditDragCrosshair(
e,
localX,
localY
);

}

export function beginEditDragCrosshair(host, 
e,
localX,
localY
){

host.tabletDrawInput?.beginEditDragCrosshair(
e,
localX,
localY
);

}

export function clearEditDragCrosshair(host){

host.tabletDrawInput?.clearEditDragCrosshair();

}

export function placementPointsNeeded(host, 
type
){

return host.tabletDrawInput?.placementPointsNeeded(
type
) ??
2;

}

export function clearTouchDrawState(host){

host.tabletDrawInput?.clearTouchDrawState();

}

export function getTouchDrawCrosshair(host){

return host.tabletDrawInput?.getTouchDrawCrosshair() ??
null;

}

export function getTouchPlaceTrack(host){

return host.tabletDrawInput?.getTouchPlaceTrack() ??
null;

}

export function pointFromParam(host, param){

if(!param.point){
return null;
}

const price =
host.series.coordinateToPrice(param.point.y);

if(price == null || !Number.isFinite(price)){
return null;
}

let time = null;

if(
host.placement
){
time = host.timeFromX(param.point.x);
}

if(
time == null &&
param.time != null
){
time = normalizeTime(host, param.time);
}

if(time == null){
time = host.timeFromX(param.point.x);
}

if(time == null){
return null;
}

return { time, price };

}

export function clearChartRuler(host){

host.chartRulerStart = null;
host.chartRulerEndPlot = null;

host.hideChartRulerLabelEl(
host.chartRulerLabelEl
);

syncChartRulerLayerClass(host);

if(
host.chartRulerRedrawRaf
){
cancelAnimationFrame(
host.chartRulerRedrawRaf
);
host.chartRulerRedrawRaf = 0;
}

}

export function syncChartRulerLayerClass(host){

host.wrapEl?.classList.toggle(
"chart-ruler-active",
!!host.chartRulerStart
);

}

export function scheduleChartRulerRedraw(host){

if(
host.chartPanActive
){
return;
}

if(
host.chartRulerRedrawRaf
){
return;
}

host.chartRulerRedrawRaf =
requestAnimationFrame(()=>{

host.chartRulerRedrawRaf = 0;
host.redraw();

});

}

export function isChartRulerShiftActive(host, 
optEvent
){

return !!(
host.chartRulerShiftDown ||
optEvent?.shiftKey ===
true
);

}

export function syncChartRulerShiftFromEvent(host, 
optEvent
){

if(
optEvent?.shiftKey ===
true
){
host.chartRulerShiftDown = true;
}

}

export function syncChartRulerEndFromPlot(host, 
rawX,
rawY
){

if(
host.tool !==
"cursor" ||
!host.chartRulerStart
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

host.chartRulerEndPlot = {
x: rawX,
y: rawY
};

scheduleChartRulerRedraw(host);

return true;

}

export function readChartScaleMargins(host){

try{

const o =
host.chart.priceScale(
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

export function isPriceScaleInverted(host){

try{
return host.chart.priceScale(
"right"
).options().invertScale ===
true;
}catch{
return false;
}

}

export function pointFromXY(host, px, py){

const price =
host.plotCoordinateToPrice(
py
);

if(price == null || !Number.isFinite(price)){
return null;
}

const time = host.timeFromX(px);

if(time == null){
return null;
}

return { time, price };

}

export function plotPriceToCoordinate(host, 
price
){

if(
host.priceScaleDragActive
){

if(
host.manualPriceScaleDrag
){
const y =
host.manualPriceToCoordinate(
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

return host.series.priceToCoordinate(
price
);

}

export function toXY(host, point){

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

const x = xFromTime(host, point.time);
const y = plotPriceToCoordinate(host, point.price);

if(x == null || y == null){
return null;
}

return { x, y };

}

export function isEphemeralDrawingShape(host, 
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
const flag of host.EPHEMERAL_DRAWING_FLAGS
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
const flag of host.ephemeralDrawingsByFlag.keys()
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

export function reapplyEphemeralDrawings(host){

host.drawings =
host.drawings.filter(
shape=>
!isEphemeralDrawingShape(host, 
shape
)
);

for(
const shapes of host.ephemeralDrawingsByFlag.values()
){

if(
Array.isArray(
shapes
) &&
shapes.length
){
host.drawings.push(
...shapes
);
}

}

}

export function setEphemeralDrawings(host, 
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
host.ephemeralDrawingsByFlag.set(
key,
list
);
}else{
host.ephemeralDrawingsByFlag.delete(
key
);
}

reapplyEphemeralDrawings(host);
host.scheduleRedraw();

}

export function clearEphemeralDrawings(host){

host.ephemeralDrawingsByFlag.clear();
reapplyEphemeralDrawings(host);
host.scheduleRedraw();

}

export function chartSize(host){
return {
w: host.wrapEl.clientWidth,
h: host.wrapEl.clientHeight
};
}

export function resizeCanvas(host){

const dpr =
window.devicePixelRatio ||
1;
const {
w,
h
} =
chartSize(host);

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
host.canvas.width ===
nextW &&
host.canvas.height ===
nextH &&
host.canvas.style.width ===
cssW &&
host.canvas.style.height ===
cssH
){
return;
}

host.canvas.width =
nextW;
host.canvas.height =
nextH;
host.canvas.style.width =
cssW;
host.canvas.style.height =
cssH;

host.removePriceGutterOverlay();

/* bitmap clear — сразу redraw (resizeCharts уже обновил LW chart). */
host.redraw();

}

export function shapeStyle(host, shape){

return {
color: shape.color || host.STROKE,
width: shape.lineWidth || 1,
dash: null
};

}

export function anchorCircleRadius(host){

return host.isCoarseTouchViewport()
? 10
: 5;

}

export function anchorSquareHalfSize(host){

return host.isCoarseTouchViewport()
? 8
: 4;

}

export function drawAnchorCircle(host, ctx, x, y){

const r =
anchorCircleRadius(host);
const touch =
host.isCoarseTouchViewport() ||
host.isTabletChartViewport();

ctx.beginPath();
ctx.arc(x, y, r, 0, Math.PI * 2);

if(
!touch
){
ctx.fillStyle = host.HANDLE_FILL;
ctx.fill();
}

ctx.strokeStyle = host.HANDLE_STROKE;
ctx.lineWidth =
touch ? 2 : 1.5;
ctx.stroke();

}

export function drawAnchorSquare(host, ctx, x, y){

const h =
anchorSquareHalfSize(host);
const touch =
host.isCoarseTouchViewport() ||
host.isTabletChartViewport();

if(
!touch
){
ctx.fillStyle = host.HANDLE_FILL;
ctx.fillRect(x - h, y - h, h * 2, h * 2);
}

ctx.strokeStyle = host.HANDLE_STROKE;
ctx.lineWidth =
touch ? 2 : 1.5;
ctx.strokeRect(x - h - 0.5, y - h - 0.5, h * 2 + 1, h * 2 + 1);

}

export function listHandles(host, shape){

if(shape.type === "trendline" || shape.type === "fib" || shape.type === "arrow" || shape.type === "brush"){

return [
{ id: "p1", point: shape.p1 },
{ id: "p2", point: shape.p2 }
];

}

if(
host.isFibExtType(
shape.type
)
){

return [
{ id: "p1", point: shape.p1 },
{ id: "p2", point: shape.p2 },
{ id: "p3", point: shape.p3 }
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

if(
host.isFvpType(
shape.type
)
){
return [];
}

if(host.isHorizPriceTool(shape.type)){

return [{
id: "anchor",
point: { time: shape.time, price: shape.price }
}];

}

if(host.isTextTool(shape.type)){

return [{
id: "anchor",
point: { time: shape.time, price: shape.price }
}];

}

if(shape.type === "channel"){

const p4 =
host.channelP4Point(
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

if(
host.isElliottType(
shape.type
)
){
return host.listElliottHandles(
shape
);
}

if(host.isPositionType(shape.type)){

const entry =
host.positionEntryPrice(shape);

return [
{ id: "entryL", point: { time: shape.p1.time, price: entry } },
{ id: "entryR", point: { time: shape.p2.time, price: entry } },
{ id: "tp", point: { time: shape.p1.time, price: shape.tpPrice } },
{ id: "sl", point: { time: shape.p1.time, price: shape.slPrice } }
];

}

return [];

}

export function pointerFromEvent(host, e){

const rect = host.wrapEl.getBoundingClientRect();

return {
x: e.clientX - rect.left,
y: e.clientY - rect.top
};

}

export function chartCanvasEl(host){

return (
host.wrapEl?.querySelector(
".chart"
) ||
host.wrapEl?.querySelector(
"#chart"
)
);

}

export function onTextDblClick(host, 
e
){

if(
!host.alive ||
!host.isActive()
){
return;
}

if(
host.textEditor?.isEditing?.()
){
return;
}

const pt =
pointerFromEvent(host, 
e
);

if(
!pt
){
return;
}

const id =
host.hitTest(
pt.x,
pt.y
);
const shape =
host.drawings.find(
d=>
d.id ===
id
);

if(
!host.isTextTool(
shape?.type
)
){
return;
}

e.preventDefault();
applyPrimarySelectedId(host, 
id
);
host.updateStyleBar();
host.textEditor.begin(
shape
);

}

export function syncDrawingsHiddenButton(host){

host.tools.querySelectorAll(
".draw-tool-hide-drawings"
).forEach(btn=>{

btn.classList.toggle(
"is-drawings-hidden",
host.drawingsHidden
);
btn.classList.toggle(
"active",
host.drawingsHidden
);
btn.setAttribute(
"aria-pressed",
host.drawingsHidden
? "true"
: "false"
);

const label =
host.drawingsHidden
? "Показать рисунки"
: "Скрыть рисунки";

btn.title =
label;
btn.setAttribute(
"aria-label",
label
);

});

}

export function bindHideDrawingsToolbarButtons(host){

host.tools.querySelectorAll(
".draw-tool-hide-drawings"
).forEach(btn=>{

if(
btn.dataset.hideDrawingsBound ===
"1"
){
return;
}

btn.dataset.hideDrawingsBound =
"1";

btn.addEventListener(
"click",
e=>{

e.preventDefault();
e.stopPropagation();
host.setDrawingsHidden(
!host.drawingsHidden
);

}
);

});

}

export function touchStorageSnap(host){

host.touchDrawingsStorageSnap(
host.storageKey()
);

}

export function syncDrawingsFromStorageIfChanged(host){

if(
!host.alive
){
return;
}

if(
shouldDeferExternalDrawingsSync(host)
){
host.fibSettingsSyncDeferred = true;
return;
}

applyRemoteDrawingsToChart(host, 
[
host.getSymbol()
]
);

}

export function startCoordRetryBurst(host){

let tries =
0;

const tick =
()=>{

if(
!host.alive ||
tries >
48
){
return;
}

tries += 1;
host.redraw();

if(
host.drawings.some(
d=>!host.shapeCoordsReady(
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

export function applyRemoteDrawingsToChart(host, 
symbols,
options = {}
){

if(
!host.alive
){
return;
}

if(
shouldDeferExternalDrawingsSync(host)
){
host.fibSettingsSyncDeferred = true;
return;
}

const sym =
String(
host.getSymbol() ||
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

resizeCanvas(host);

if(
reload
){
host.loadDrawings();
host.stripOrphanAlertDrawings();
}

host.scheduleRedraw();
host.updateStyleBar();
touchStorageSnap(host);
startCoordRetryBurst(host);

}

export function syncDrawingsFromStorageNow(host){

applyRemoteDrawingsToChart(host, 
[
host.getSymbol()
]
);

}

export function defaultHrayAnchorTime(host){

const list =
host.getCandles?.();

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
