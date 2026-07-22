/**
 * Drawing placement: preview, magnet, finish/cancel, tool clicks.
 * Phase 6 split from drawings/init.js.
 */
import {
hideDomChartCrosshair,
positionTabletProbeHorizInStack
} from "../chart-import.js?v=43";

import {
ensureFibLevelsVisible,
cloneDefaultFibRows,
ensureFibAnchorMinSpan
} from "./fib-spec.js?v=13";

import {
isPositionType
} from "./position.js?v=5";

import {
uid
} from "./math.js?v=1";

import {
snapPlotToCandleWick
} from "./draw-magnet.js?v=1";

import {
touchShapeRevision
} from "../drawings-storage.js?v=7";

export function createDrawPlacement(
deps
){

const {
getAlive,
isActive,
getTool,
setTool,
getPlacement,
setPlacement,
getPreviewPoint,
setPreviewPoint,
getPreviewXY,
setPreviewXY,
getPlacementPointerXY,
setPlacementPointerXY,
getDrawMagnetKeyDown,
setDrawMagnetKeyDown,
enableMagnet =
true,
getLastCrosshairPlotXY,
setLastCrosshairPlotXY,
getDrawings,
setDrawings,
getSelectedId,
setSelectedId,
getBlockChartClick,
setBlockChartClick,
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
getChartRulerStart,
showStandardChartCrosshair,
hideStandardChartCrosshair,
syncChartTouchPan
} =
deps;

let placementPreviewRaf = 0;
let placementPreviewPending = null;
let placementCrosshairVert = null;
let placementCrosshairHorz = null;
let cachedLastCandleRightX = NaN;
let placementSkipNextPointerUp =
false;
let placementStrokeDown =
false;

const DESKTOP_STROKE_PLACEMENT_TOOLS =
new Set([
"rectangle",
"trendline",
"fib",
"channel",
"arrow"
]);

function usesDesktopStrokePlacement(
type
){

return DESKTOP_STROKE_PLACEMENT_TOOLS.has(
type
);

}

function resetDesktopStrokePlacementState(){

placementSkipNextPointerUp =
false;
placementStrokeDown =
false;

}

function invalidateLastCandleRightXCache(){

cachedLastCandleRightX = NaN;

}

function getLastCandleRightX(){

if(
Number.isFinite(
cachedLastCandleRightX
)
){
return cachedLastCandleRightX;
}

const candles =
candleSeries();

if(
!candles.length
){
return null;
}

const x =
xFromTime(
candles[
candles.length -
1
].time
);

if(
x == null ||
!Number.isFinite(
x
)
){
return null;
}

cachedLastCandleRightX = x;
return x;

}

function isPlotXBeyondLastCandle(
plotX
){

const right =
getLastCandleRightX();

if(
right == null
){
return false;
}

return plotX > right + 0.5;

}

function resetPlacementCrosshairCache(){

placementCrosshairVert = null;
placementCrosshairHorz = null;

}

function cancelPlacementPreviewRaf(){

if(
placementPreviewRaf
){
cancelAnimationFrame(
placementPreviewRaf
);
placementPreviewRaf = 0;
}

placementPreviewPending = null;

}

function ensurePlacementCrosshairEls(){

if(
!placementCrosshairVert
){
placementCrosshairVert =
wrapEl.querySelector(
".chart-dom-crosshair-vert"
);
}

if(
!placementCrosshairHorz
){
placementCrosshairHorz =
wrapEl.querySelector(
".chart-dom-crosshair-horz"
);

}

}

/** Только DOM-линии по локальным координатам (без getBoundingClientRect). */
function updatePlacementCrosshairFast(
localX,
localY
){

ensurePlacementCrosshairEls();

const { w, h } =
chartSize();
const plotW =
getPlotWidth();

const x =
Math.max(
0,
Math.min(
plotW,
localX
)
);

const y =
Math.max(
0,
Math.min(
h,
localY
)
);

if(
placementCrosshairVert
){

placementCrosshairVert.style.left =
`${Math.round(x)}px`;

placementCrosshairVert.classList.remove(
"hidden"
);

}

if(
placementCrosshairHorz
){

if(
useChartProbeCrosshair()
){

const stackEl =
document.getElementById(
"charts-stack"
);

const probeHorizEl =
document.getElementById(
"tablet-probe-crosshair-h"
);

const wrapR =
wrapEl.getBoundingClientRect();

positionTabletProbeHorizInStack({
horizLineEl: probeHorizEl,
chartsStackEl: stackEl,
chartEl: chartCanvasEl(),
chart,
clientY: wrapR.top + y
});

}else{

placementCrosshairHorz.style.top =
`${Math.round(y)}px`;

placementCrosshairHorz.style.width =
`${Math.round(plotW)}px`;

placementCrosshairHorz.classList.remove(
"hidden"
);

}

}

}

function flushPlacementPreviewRedraw(){

const pending =
placementPreviewPending;

if(
!getPlacement() ||
!pending
){
return;
}

setPreviewXY({
x: pending.x,
y: pending.y
});

const fromXY =
pointFromXY(
pending.x,
pending.y
);

if(
fromXY
){

const prev =
getPreviewPoint();

if(
prev
){
prev.time =
fromXY.time;
lockPositionPreviewPrice(
prev
);
}else{
setPreviewPoint(
lockPositionPreviewPrice(
fromXY
)
);
}

}

redraw();

}

function schedulePlacementPreviewRedraw(){

if(
placementPreviewRaf
){
return;
}

placementPreviewRaf =
requestAnimationFrame(()=>{

placementPreviewRaf = 0;
flushPlacementPreviewRedraw();

});

}

function setupPlacementPointerPreview(){

const onPlacementPointerMove = e=>{

if(
!getAlive() ||
!isActive()
){
return;
}

syncChartRulerShiftFromEvent(
e
);

if(
getTool() ===
"cursor" &&
getChartRulerStart()
){

if(
!e.isPrimary
){
return;
}

const { x, y } =
pointerFromEvent(
e
);

syncChartRulerEndFromPlot(
x,
y
);

return;

}

if(
!getPlacement() ||
isTouchDrawPlacement()
){
return;
}

if(!e.isPrimary){
return;
}

const { x, y } =
pointerFromEvent(e);

syncDesktopDrawPlacementPreview(
x,
y,
e
);

};

wrapEl.addEventListener(
"pointermove",
onPlacementPointerMove,
true
);

const onPlacementPointerDown =
e=>{

syncChartRulerShiftFromEvent(
e
);

if(
!getAlive() ||
!isActive() ||
isTouchDrawPlacement()
){
return;
}

if(
!e.isPrimary ||
e.button !==
0
){
return;
}

if(
desktopEdit?.isDrawChromePointerEvent?.(
e
)
){
return;
}

const placement =
getPlacement();

if(
!placement ||
!usesDesktopStrokePlacement(
placement.type
)
){
return;
}

const needed =
placementPointsNeeded(
placement.type
);
const { x, y } =
pointerFromEvent(
e
);

if(
placement.points.length >=
1 &&
placement.points.length <
needed
){
placementStrokeDown =
true;
syncDrawMagnetModifierFromEvent(
e
);
syncDesktopDrawPlacementPreview(
x,
y,
e
);
return;
}

if(
placement.points.length !==
0
){
return;
}

syncDrawMagnetModifierFromEvent(
e
);

const resolved =
resolvePlacementPlotXY(
x,
y,
e
);
const point =
pointFromResolvedPlacementPlot(
resolved
);

if(
!point
){
return;
}

placement.points.push(
point
);
placementSkipNextPointerUp =
true;
setBlockChartClick(
true
);
syncDesktopDrawPlacementPreview(
x,
y,
e
);
syncChartTouchPan?.();
redraw();

e.preventDefault();
e.stopPropagation();

};

wrapEl.addEventListener(
"pointerdown",
onPlacementPointerDown,
true
);

const onPlacementPointerUp =
e=>{

if(
!getAlive() ||
!isActive() ||
isTouchDrawPlacement()
){
return;
}

if(
!e.isPrimary ||
e.button !==
0
){
return;
}

const placement =
getPlacement();

if(
!placement ||
!usesDesktopStrokePlacement(
placement.type
)
){
return;
}

const needed =
placementPointsNeeded(
placement.type
);

if(
placement.points.length ===
0 ||
placement.points.length >=
needed
){
return;
}

if(
placementSkipNextPointerUp
){
placementSkipNextPointerUp =
false;
return;
}

if(
!placementStrokeDown
){
return;
}

placementStrokeDown =
false;

const { x, y } =
pointerFromEvent(
e
);

syncDrawMagnetModifierFromEvent(
e
);

const resolved =
resolvePlacementPlotXY(
x,
y,
e
);
const point =
pointFromResolvedPlacementPlot(
resolved
);

if(
!point
){
return;
}

placement.points.push(
point
);

if(
placement.points.length >=
needed
){
finishPlacement();
}else{
syncChartTouchPan?.();
redraw();
}

e.preventDefault();
e.stopPropagation();

};

window.addEventListener(
"pointerup",
onPlacementPointerUp,
true
);

const onPlacementContextMenu = e=>{

if(
!getAlive() ||
!isActive()
){
return;
}

if(
getPlacement() ||
getTool() !==
"cursor"
){

e.preventDefault();
e.stopPropagation();
setTool(
"cursor"
);

}

};

wrapEl.addEventListener(
"contextmenu",
onPlacementContextMenu,
true
);

return ()=>{
wrapEl.removeEventListener(
"pointermove",
onPlacementPointerMove,
true
);
wrapEl.removeEventListener(
"pointerdown",
onPlacementPointerDown,
true
);
window.removeEventListener(
"pointerup",
onPlacementPointerUp,
true
);
wrapEl.removeEventListener(
"contextmenu",
onPlacementContextMenu,
true
);
};

}
function isDrawMagnetActive(
optEvent
){

if(
getTool() ===
"cursor" ||
isTouchDrawPlacement() ||
!getPlacement()
){
return false;
}

return !!(
enableMagnet &&
(
getDrawMagnetKeyDown() ||
optEvent?.metaKey ===
true
)
);

}

function syncDrawMagnetModifierFromEvent(
optEvent
){

if(
optEvent?.metaKey ===
true
){
setDrawMagnetKeyDown(true);
}

}

function syncDesktopDrawPlacementPreview(
rawX,
rawY,
optEvent
){

if(
!getPlacement() ||
isTouchDrawPlacement()
){
return null;
}

if(
!Number.isFinite(
rawX
) ||
!Number.isFinite(
rawY
)
){
return null;
}

syncDrawMagnetModifierFromEvent(
optEvent
);

const { w, h } =
chartSize();
const plotW =
getPlotWidth();

const x =
Math.max(0, Math.min(plotW, rawX));
const y =
Math.max(0, Math.min(h, rawY));

setPlacementPointerXY({
x,
y
});

setLastCrosshairPlotXY({
x,
y
});

const resolved =
resolvePlacementPlotXY(
x,
y,
optEvent
);

applyPlacementPreviewPoint(
resolved
);

const lx =
resolved.x;
const ly =
resolved.y;

if(
isPlotXBeyondLastCandle(
x
)
){

updatePlacementCrosshairFast(
lx,
ly
);

if(
chart
){

try{
chart.clearCrosshairPosition();
}catch{
/* ignore */
}

}

}else{

hideDomChartCrosshair(
wrapEl
);

showStandardChartCrosshair(
null,
lx,
ly
);

}

redraw();

return resolved;

}

function resolvePlacementPlotXY(
rawX,
rawY,
optEvent
){

if(
!Number.isFinite(
rawX
) ||
!Number.isFinite(
rawY
)
){
return {
x: rawX,
y: rawY,
snapped: false
};
}

if(
!isDrawMagnetActive(
optEvent
)
){
return {
x: rawX,
y: rawY,
snapped: false
};
}

const snap =
snapPlotToCandleWick({
plotX: rawX,
plotY: rawY,
candles: candleSeries(),
timeFromX,
xFromTime,
priceToPlotY: plotPriceToCoordinate
});

if(
!snap
){
return {
x: rawX,
y: rawY,
snapped: false
};
}

return {
x: snap.x,
y: snap.y,
snapped: true,
point: {
time: snap.time,
price: snap.price
}
};

}

function pointFromResolvedPlacementPlot(
resolved
){

if(
resolved?.point
){
return {
time: resolved.point.time,
price: resolved.point.price
};
}

return pointFromXY(
resolved.x,
resolved.y
);

}

function lockPositionPreviewPrice(
point
){

if(
!point ||
!isPositionType(
getPlacement()?.type
) ||
getPlacement().points.length <
1
){
return point;
}

point.price =
getPlacement().points[
0
].price;

return point;

}

function commitPlacementPreviewPlot(
resolved
){

setPreviewXY({
x: resolved.x,
y: resolved.y
});

const next =
pointFromResolvedPlacementPlot(
resolved
);

if(
next
){
setPreviewPoint(
lockPositionPreviewPrice(
next
)
);
return;
}

const fromXY =
resolvePointFromPlotXY(
resolved.x,
resolved.y,
getPreviewPoint()
);

if(
!fromXY
){
return;
}

const prev =
getPreviewPoint();

if(
prev
){
prev.time =
fromXY.time;
lockPositionPreviewPrice(
prev
);
return;
}

setPreviewPoint(
lockPositionPreviewPrice(
fromXY
)
);

}

function applyPlacementPreviewPoint(
resolved
){

commitPlacementPreviewPlot(
resolved
);

}

function refreshPlacementPreviewFromPointer(
optEvent
){

if(
!getPlacement() ||
isTouchDrawPlacement()
){
return null;
}

const raw =
getPlacementPointerXY() ||
getLastCrosshairPlotXY();

if(
!raw
){
return null;
}

return syncDesktopDrawPlacementPreview(
raw.x,
raw.y,
optEvent
);

}
function makeShape(type, data){

const style = baseDefaultStyle(type);

return normalizeDrawingShape({
id: uid(),
createdAt: Date.now(),
type,
color: style.color,
lineWidth: style.lineWidth,
fibLevels:type === "fib"
? JSON.parse(
JSON.stringify(
ensureFibLevelsVisible(
style.fibLevels ||
cloneDefaultFibRows()
)
)
)
:undefined,
fibShowTrendLine:type === "fib"
? (
typeof style.fibShowTrendLine ===
"boolean"
? style.fibShowTrendLine
: false
)
:undefined,
...data
});

}

function finishPlacement(){

if(!getPlacement()){
return;
}

const pts = getPlacement().points;
let created = null;

if(getPlacement().type === "trendline" && pts.length >= 2){
created = makeShape("trendline", { p1: pts[0], p2: pts[1] });
}

if(getPlacement().type === "arrow" && pts.length >= 2){
created = makeShape("arrow", { p1: pts[0], p2: pts[1] });
}

if(getPlacement().type === "rectangle" && pts.length >= 2){
const rectStyle =
baseDefaultStyle("rectangle");
created = makeShape("rectangle", {
p1: pts[0],
p2: pts[1],
lineStyle: rectStyle.lineStyle,
showFill: rectStyle.showFill,
fillColor: rectStyle.fillColor,
fillOpacity: rectStyle.fillOpacity,
showMedian: rectStyle.showMedian,
medianColor: rectStyle.medianColor,
medianLineWidth: rectStyle.medianLineWidth,
medianLineStyle: rectStyle.medianLineStyle
});
}

if(getPlacement().type === "hray" && pts.length >= 1){
created = makeShape("hray", {
time: pts[0].time,
price: pts[0].price
});
}

if(getPlacement().type === "fib" && pts.length >= 2){
created = makeShape("fib", { p1: pts[0], p2: pts[1] });
ensureFibAnchorMinSpan(
created,
"p2",
{
toXY(
pt
){
const x =
xFromTime(
pt.time
);
const y =
plotPriceToCoordinate(
pt.price
);

if(
x ==
null ||
y ==
null
){
return null;
}

return {
x,
y
};

},
pointFromXY
}
);
}

if(getPlacement().type === "channel" && pts.length >= 3){
created = makeShape("channel", {
p1: pts[0],
p2: pts[1],
p3: pts[2]
});
}

if(
isPositionType(getPlacement().type) &&
pts.length >= 1
){

const p1 =
pts[0];
const p2 =
defaultPositionP2(p1);
const levels =
initialPositionTpSl(
getPlacement().type,
p1.price
);

const posStyle =
baseDefaultStyle(getPlacement().type);

created = makeShape(getPlacement().type, {
p1,
p2,
tpPrice: levels.tpPrice,
slPrice: levels.slPrice,
riskUsd: posStyle.riskUsd
});

}

if(created){
touchShapeRevision(
created
);
getDrawings().push(created);
setSelectedId(created.id);
}

setPlacement(null);
setPreviewPoint(null);
setPreviewXY(null);
setPlacementPointerXY(null);
setDrawMagnetKeyDown(false);
setLastCrosshairPlotXY(null);
resetDesktopStrokePlacementState();
cancelPlacementPreviewRaf();
resetPlacementCrosshairCache();
hideStandardChartCrosshair();
saveDrawings();
setTool("cursor");
updateStyleBar();
syncChartTouchPan?.();
redraw();

}

function startPlacement(type){

setPlacement({ type, points: [] });
setPreviewPoint(null);
setPreviewXY(null);
setPlacementPointerXY(null);
cancelPlacementPreviewRaf();
resetPlacementCrosshairCache();
invalidateLastCandleRightXCache();

if(isTouchDrawPlacement()){
initTouchDrawCrosshair();
}

}

function cancelPlacement(){

setPlacement(null);
setPreviewPoint(null);
setPreviewXY(null);
setPlacementPointerXY(null);
setDrawMagnetKeyDown(false);
setLastCrosshairPlotXY(null);
resetDesktopStrokePlacementState();
clearTouchDrawState();
setBlockChartClick(false);
cancelPlacementPreviewRaf();
resetPlacementCrosshairCache();
hideStandardChartCrosshair();
syncChartTouchPan?.();
redraw();

}

function handleToolClick(param){

if(
getTool() ===
"brush"
){
return false;
}

if(
getTool() !== "cursor" &&
isTouchDrawPlacement() &&
getPlacement()
){
return false;
}

const rawClickX =
getPlacementPointerXY()?.x ??
param.point?.x;
const rawClickY =
getPlacementPointerXY()?.y ??
param.point?.y;

const point =
isTouchDrawPlacement() &&
getTouchDrawCrosshair()
? pointFromXY(
getTouchDrawCrosshair().x,
getTouchDrawCrosshair().y
)
: rawClickX !=
null &&
rawClickY !=
null
? pointFromResolvedPlacementPlot(
resolvePlacementPlotXY(
rawClickX,
rawClickY,
param
)
)
: pointFromParam(param);

if(!point){
return false;
}

if(
handleChartRulerClick(
point,
param
)
){
return true;
}

if(getTool() === "cursor"){

const hitId =
hitTest(
param.point.x,
param.point.y
);

desktopEdit?.handleChartClickCursorSelection(
hitId
);
return true;

}

if(!getPlacement()){
startPlacement(getTool());
}

if(
usesDesktopStrokePlacement(
getPlacement().type
) &&
getPlacement().points.length ===
0
){
return true;
}

if(
usesDesktopStrokePlacement(
getPlacement().type
) &&
getPlacement().points.length >=
1
){
return true;
}

getPlacement().points.push(point);

if(
getPlacement().points.length >=
placementPointsNeeded(getPlacement().type)
){
finishPlacement();
}else{
redraw();
}

return true;

}



return {
invalidateLastCandleRightXCache,
setupPlacementPointerPreview,
syncDesktopDrawPlacementPreview,
refreshPlacementPreviewFromPointer,
startPlacement,
finishPlacement,
cancelPlacement,
handleToolClick,
makeShape
};

}

