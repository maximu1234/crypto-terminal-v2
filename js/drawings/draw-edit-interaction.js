/**
 * Edit/drag interaction: handle hit-test, body move, pointer handlers.
 * Phase 7 split from drawings/init.js.
 */
import {
isCoarseTouchViewport
} from "../chart-import.js?v=43";

import {
DRAW_HANDLE_HIT_THRESHOLD_DESKTOP,
DRAW_HANDLE_HIT_THRESHOLD_DESKTOP_POSITION,
DRAW_BODY_HIT_THRESHOLD_TOUCH
} from "./constants.js?v=10";

import {
getRectangleHandleScreens,
moveRectangleHandle
} from "./arrow-rect.js?v=2";

import {
isPositionType,
positionEntryPrice
} from "./position.js?v=4";

import {
ensureFibAnchorMinSpan
} from "./fib-spec.js?v=13";

import {
touchShapeRevision
} from "../drawings-storage.js?v=7";

import {
moveBrushHandle,
applyBrushScreenMove,
brushChartPointsForMove,
brushBodyDist
} from "./brush.js?v=2";

export function createDrawEditInteraction(
deps
){

const {
getAlive,
getTool,
getPlacement,
getDragState,
setDragState,
getSelectedId,
setSelectedId,
getSelected,
getDrawings,
setBlockChartClick,
getChartPanActive,
getDragRedrawRaf,
setDragRedrawRaf,
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
drawBodyHitThreshold: drawBodyHitThresholdDep
} =
deps;

let drawBodyHitThreshold =
drawBodyHitThresholdDep ??
(()=>DRAW_BODY_HIT_THRESHOLD_TOUCH);

function handleHitThreshold(
shape
){

if(
!isCoarseTouchViewport()
){
return isPositionType(
shape.type
)
? DRAW_HANDLE_HIT_THRESHOLD_DESKTOP_POSITION
: DRAW_HANDLE_HIT_THRESHOLD_DESKTOP;
}

const circleR =
isCoarseTouchViewport()
? 10
: 5;
const squareH =
isCoarseTouchViewport()
? 8
: 4;
const touchHit =
Math.max(
circleR *
2,
squareH *
Math.SQRT2
);

return isPositionType(
shape.type
)
? Math.max(
touchHit,
16
)
: touchHit;

}

function hitTestHandle(px, py, shape){

const handleThreshold =
handleHitThreshold(
shape
);

if(isPositionType(shape.type)){

for(const handle of getPositionHandleScreens(shape)){

if(
Math.hypot(px - handle.x, py - handle.y) <=
handleThreshold
){
return handle.id;
}

}

return null;

}

if(
shape.type ===
"rectangle"
){

for(
const handle of
getRectangleHandleScreens(
shape,
toXY
)
){

const threshold =
handle.square
? handleHitThreshold(
shape
) *
0.95
: handleHitThreshold(
shape
);

if(
Math.hypot(
px - handle.x,
py - handle.y
) <=
threshold
){
return handle.id;
}

}

return null;

}

for(const handle of listHandles(shape)){

const xy =
toXY(handle.point);

if(!xy){
continue;
}

if(Math.hypot(px - xy.x, py - xy.y) <= handleThreshold){
return handle.id;
}

}

return null;

}

function handleDataPoint(
shape,
handleId
){

if(
shape.type === "trendline" ||
shape.type === "fib" ||
shape.type === "arrow" ||
shape.type ===
"brush"
){

if(
handleId ===
"p1"
){
return shape.p1;
}

if(
handleId ===
"p2"
){
return shape.p2;
}

}

if(
shape.type ===
"rectangle"
){

if(
handleId ===
"p1"
){
return shape.p1;
}

if(
handleId ===
"p2"
){
return shape.p2;
}

}

if(
shape.type ===
"hray" &&
handleId ===
"anchor"
){
return {
time: shape.time,
price: shape.price
};
}

if(
shape.type ===
"channel"
){

if(
handleId ===
"p1"
){
return shape.p1;
}

if(
handleId ===
"p2"
){
return shape.p2;
}

if(
handleId ===
"p3"
){
return shape.p3;
}

if(
handleId ===
"p4"
){
return channelP4Point(
shape
);
}

}

if(
isPositionType(
shape.type
)
){

if(
handleId ===
"entryL"
){
return shape.p1;
}

if(
handleId ===
"entryR"
){
return shape.p2;
}

if(
handleId ===
"tp"
){
return {
time: shape.p1.time,
price: shape.tpPrice
};
}

if(
handleId ===
"sl"
){
return {
time: shape.p1.time,
price: shape.slPrice
};
}

}

return null;

}

function handleScreenPoint(
shape,
handleId
){

if(
isPositionType(
shape.type
)
){

for(
const handle of
getPositionHandleScreens(
shape
)
){

if(
handle.id ===
handleId
){
return {
x: handle.x,
y: handle.y
};
}

}

return null;

}

if(
shape.type ===
"rectangle"
){

for(
const handle of
getRectangleHandleScreens(
shape,
toXY
)
){

if(
handle.id ===
handleId
){
return {
x: handle.x,
y: handle.y
};
}

}

return null;

}

for(
const handle of
listHandles(
shape
)
){

if(
handle.id !==
handleId
){
continue;
}

const xy =
toXY(
handle.point
);

if(
xy
){
return xy;
}

}

return null;

}

function beginHandleDragState(
shape,
handleId,
x,
y
){

const screen =
handleScreenPoint(
shape,
handleId
);
const dataPoint =
handleDataPoint(
shape,
handleId
);

setDragState({
shapeId: shape.id,
mode: "handle",
handleId,
grabOffsetX:
screen
? x - screen.x
: 0,
grabOffsetY:
screen
? y - screen.y
: 0,
lastPoint:
dataPoint
? {
time: dataPoint.time,
price: dataPoint.price
}
: null,
lastPlotX: x,
lastPlotY: y
});

}

function applyHandleDragAtPlot(
shape,
x,
y,
optEvent = null
){

const drag =
getDragState();

if(
!drag ||
drag.mode !==
"handle"
){
return false;
}

const ox =
drag.grabOffsetX ||
0;
const oy =
drag.grabOffsetY ||
0;
const plotX =
x - ox;
const plotY =
y - oy;

const point =
resolvePointFromPlotXY(
plotX,
plotY,
drag.lastPoint,
optEvent
);

if(
!point
){
return false;
}

drag.lastPoint = {
time: point.time,
price: point.price
};
drag.lastPlotX = x;
drag.lastPlotY = y;

moveHandle(
shape,
drag.handleId,
point
);

return true;

}

function reapplyActiveDragCoords(){

const drag =
getDragState();

if(
!drag
){
return false;
}

const shape =
getDrawings().find(d=>d.id === drag.shapeId);

if(
!shape
){
return false;
}

const x =
drag.lastPlotX;
const y =
drag.lastPlotY;

if(
x ==
null ||
y ==
null
){
return false;
}

if(
drag.mode ===
"handle"
){

return applyHandleDragAtPlot(
shape,
x,
y
);

}

if(
drag.mode ===
"screen-move"
){

return applyScreenMoveToShape(
shape,
drag.pointOffsets,
x,
y
);

}

if(
drag.mode ===
"position-move"
){

return applyPositionBodyMove(
shape,
drag.startX,
drag.startY,
x,
y,
drag.snapshot
);

}

return false;

}

function reapplyActiveDragFromPlot(){

if(
!reapplyActiveDragCoords()
){
redraw();
return;
}

scheduleDragRedraw();

}

function moveHandle(shape, handleId, point){

if(shape.type === "trendline" || shape.type === "fib" || shape.type === "arrow"){

if(handleId === "p1"){
shape.p1 = { ...point };
}

if(handleId === "p2"){
shape.p2 = { ...point };
}

}

if(
shape.type ===
"brush"
){

moveBrushHandle(
shape,
handleId,
point
);
return;

}

if(
shape.type ===
"rectangle"
){

const xy =
toXY(
point
);

if(
xy
){
moveRectangleHandle(
shape,
handleId,
xy.x,
xy.y,
pointFromXY,
toXY
);
}

return;

}

if(shape.type === "hray" && handleId === "anchor"){

shape.time = point.time;
shape.price = point.price;

}

if(shape.type === "channel"){

if(handleId === "p1"){
shape.p1 = { ...point };
}

if(handleId === "p2"){
shape.p2 = { ...point };
}

if(handleId === "p3"){
shape.p3 = { ...point };
}

if(handleId === "p4"){

const a =
toXY(shape.p1);
const b =
toXY(shape.p2);
const p4xy =
toXY(point);

if(
!a ||
!b ||
!p4xy
){
return;
}

const np3 =
pointFromXY(
p4xy.x - (b.x - a.x),
p4xy.y - (b.y - a.y)
);

if(np3){
shape.p3 = np3;
}

}

}

if(isPositionType(shape.type)){

const entry =
positionEntryPrice(shape);

if(handleId === "entryL"){

shape.p1 = {
time: point.time,
price: point.price
};

shape.p2 = {
time: shape.p2.time,
price: point.price
};

clampPositionPrices(
shape,
{ handleId }
);

return;

}

if(handleId === "entryR"){

shape.p2 = {
time: point.time,
price: entry
};

clampPositionPrices(
shape,
{ handleId }
);

return;

}

if(handleId === "tp"){

const entryNow =
positionEntryPrice(
shape
);

shape.tpPrice =
shape.type ===
"long"
? Math.max(
point.price,
entryNow *
1.0000001
)
: Math.min(
point.price,
entryNow *
0.9999999
);

clampPositionPrices(
shape,
{ handleId }
);

return;

}

if(handleId === "sl"){

const entryNow =
positionEntryPrice(
shape
);

shape.slPrice =
shape.type ===
"long"
? Math.min(
point.price,
entryNow *
0.9999999
)
: Math.max(
point.price,
entryNow *
1.0000001
);

clampPositionPrices(
shape,
{ handleId }
);

return;

}

}

}

function screenDragOffsetsForPoints(
points,
grabX,
grabY
){

const offsets = [];

for(const pt of points){

const xy =
toXY(pt);

if(!xy){
return null;
}

offsets.push({
x: xy.x - grabX,
y: xy.y - grabY
});

}

return offsets;

}

function pointsFromScreenDrag(
offsets,
grabX,
grabY
){

const out = [];

for(const off of offsets){

const p =
pointFromXY(
grabX + off.x,
grabY + off.y
);

if(!p){
return null;
}

out.push(p);

}

return out;

}

function chartPointsForScreenMove(shape){

if(
shape.type === "trendline" ||
shape.type === "fib" ||
shape.type === "arrow"
){
return [shape.p1, shape.p2];
}

if(
shape.type ===
"brush"
){
return brushChartPointsForMove(
shape
);
}

if(
shape.type ===
"rectangle"
){
return [shape.p1, shape.p2];
}

if(shape.type === "channel"){
return [shape.p1, shape.p2, shape.p3];
}

if(shape.type === "hray"){
return [{
time: shape.time,
price: shape.price
}];
}

if(isPositionType(shape.type)){

return [
shape.p1,
shape.p2,
{ time: shape.p1.time, price: shape.tpPrice },
{ time: shape.p1.time, price: shape.slPrice }
];

}

return null;

}

function shiftPriceByPixels(
price,
dyPx
){

const y =
series.priceToCoordinate(price);

if(
y == null ||
!Number.isFinite(price)
){
return price;
}

const next =
series.coordinateToPrice(y + dyPx);

if(
next == null ||
!Number.isFinite(next)
){
return price;
}

return next;

}

function constrainBodyDragPointer(
dragState,
x,
y,
shiftKey
){

const startX =
dragState.startX;
const startY =
dragState.startY;

if(
startX == null ||
startY == null ||
!shiftKey
){
dragState.shiftAxisLock = null;
return {
x,
y
};
}

if(
!dragState.shiftAxisLock
){

const adx =
Math.abs(
x - startX
);
const ady =
Math.abs(
y - startY
);

dragState.shiftAxisLock =
adx >=
ady
? "x"
: "y";

}

if(
dragState.shiftAxisLock ===
"x"
){
return {
x,
y: startY
};
}

return {
x: startX,
y
};

}

function applyPositionBodyMove(
shape,
startX,
startY,
x,
y,
snapshot
){

const dy =
y - startY;

const tStart =
timeFromX(startX);
const tNow =
timeFromX(x);

if(
tStart == null ||
tNow == null
){
return false;
}

const dTime =
tNow - tStart;
const entry =
shiftPriceByPixels(
snapshot.entry,
dy
);

shape.p1 = {
time: snapshot.p1.time + dTime,
price: entry
};

shape.p2 = {
time: snapshot.p2.time + dTime,
price: entry
};

shape.tpPrice =
shiftPriceByPixels(
snapshot.tpPrice,
dy
);

shape.slPrice =
shiftPriceByPixels(
snapshot.slPrice,
dy
);

clampPositionPrices(
shape,
{ preserveTpSl: true }
);

return true;

}

function hitTestShapeBody(px, py, shape, threshold){

const bodyThreshold =
threshold ??
drawBodyHitThreshold();

if(
shape.type === "trendline" ||
shape.type === "arrow"
){
return hitTestTrendlineBody(px, py, shape, bodyThreshold);
}

if(
shape.type ===
"brush"
){
return (
brushBodyDist(
px,
py,
shape,
toXY
) <=
bodyThreshold
);
}

if(shape.type === "fib"){
return hitTestFibBody(px, py, shape, bodyThreshold);
}

if(shape.type === "channel"){
return hitTestChannelBody(px, py, shape, bodyThreshold);
}

if(shape.type === "rectangle"){
return hitTestRectangleBody(px, py, shape, bodyThreshold);
}

if(shape.type === "hray"){
return hitTestHrayLine(px, py, shape, bodyThreshold);
}

if(isPositionType(shape.type)){
return positionBodyDist(px, py, shape) <= bodyThreshold;
}

return false;

}

function applyScreenMoveToShape(
shape,
offsets,
grabX,
grabY
){

const pts =
pointsFromScreenDrag(
offsets,
grabX,
grabY
);

if(!pts){
return false;
}

if(
shape.type === "trendline" ||
shape.type === "fib" ||
shape.type === "arrow"
){

shape.p1 = pts[0];
shape.p2 = pts[1];
return true;

}

if(
shape.type ===
"brush"
){

return applyBrushScreenMove(
shape,
offsets,
grabX,
grabY,
pointFromXY
);

}

if(
shape.type ===
"rectangle"
){

shape.p1 = pts[0];
shape.p2 = pts[1];
return true;

}

if(shape.type === "channel"){

shape.p1 = pts[0];
shape.p2 = pts[1];
shape.p3 = pts[2];
return true;

}

if(shape.type === "hray"){

shape.time = pts[0].time;
shape.price = pts[0].price;
return true;

}

if(isPositionType(shape.type)){

shape.p1 = pts[0];
shape.p2 = pts[1];
shape.tpPrice = pts[2].price;
shape.slPrice = pts[3].price;
clampPositionPrices(
shape,
{ preserveTpSl: true }
);
return true;

}

return false;

}

function setupEditInteraction(){

const {
onEditHover,
onEditLeave,
onDesktopSelectClick
} =
desktopEdit.createEditHoverHandlers(
wrapEl
);

const onEditDown = e=>{

if(getTool() !== "cursor" || getPlacement()){
return;
}

/*
  Панель стиля / «+» у шкалы / меню ордеров внутри chart-wrap:
  горизонтальные уровни (фиба, позиция) ловят pointerdown по всей ширине,
  из-за чего клики перехватывались как перетаскивание объекта.
*/
if(
desktopEdit.isDrawChromePointerEvent(
e
)
){
return;
}

if(
e.pointerType === "mouse" &&
e.button !== 0
){
return;
}

if(!e.isPrimary){
return;
}

const { x, y } =
pointerFromEvent(e);

if(
e.pointerType === "mouse" &&
isPointerInPriceGutter(
x
)
){
return;
}

/*
  Touch (iPad / phone): тап в пустоту снимает выделение; drag только с выбранного объекта.
*/
if(
isCoarseTouchViewport()
){

const hitId =
hitTest(
x,
y
);

if(
!hitId
){

if(
getSelectedId()
){
setSelectedId(null);
updateStyleBar();
redraw();
}

return;

}

if(
hitId !==
getSelectedId()
){

setSelectedId(hitId);

const picked =
getSelected();

if(
picked?.type ===
"fib"
){
styleBarCtl?.setFibSettingsShapeId?.(picked.id);
}

desktopEdit?.pinDrawingSelection?.(
hitId
);

updateStyleBar();
redraw();
setBlockChartClick(
true
);
return;

}

const sel =
getSelected();

if(
!sel
){
return;
}

const handleId =
hitTestHandle(
x,
y,
sel
);

const onBody =
hitTestShapeBody(
x,
y,
sel
);

if(
!handleId &&
!onBody
){

setSelectedId(null);
updateStyleBar();
redraw();
return;

}

if(
handleId
){

beginHandleDragState(
sel,
handleId,
x,
y
);

}else if(
onBody
){

if(isPositionType(sel.type)){

setDragState({
shapeId: sel.id,
mode: "position-move",
startX: x,
startY: y,
lastPlotX: x,
lastPlotY: y,
snapshot: {
p1: { ...sel.p1 },
p2: { ...sel.p2 },
tpPrice: sel.tpPrice,
slPrice: sel.slPrice,
entry: positionEntryPrice(sel)
}
});

}else{

const movePoints =
chartPointsForScreenMove(sel);

const offsets =
movePoints
? screenDragOffsetsForPoints(
movePoints,
x,
y
)
: null;

if(!offsets){
return;
}

setDragState({
shapeId: sel.id,
mode: "screen-move",
startX: x,
startY: y,
lastPlotX: x,
lastPlotY: y,
pointOffsets: offsets
});

}

}else{
return;
}

notifyTabletChartGestureAbort();

setBlockChartClick(true);
e.preventDefault();
e.stopPropagation();

beginEditDragCrosshair(
e,
x,
y
);

syncChartTouchPan();

try{
wrapEl.setPointerCapture(e.pointerId);
}catch{
/* ignore */
}

return;

}

const hitId =
hitTest(
x,
y
);

const hoverSelect =
desktopEdit.isDesktopDrawHoverSelect() &&
e.pointerType ===
"mouse";

if(
!hitId
){

desktopEdit.clearDrawingSelection();
updateStyleBar();
redraw();

return;

}

if(
hoverSelect
){

desktopEdit.onPointerDownHoverHit(
hitId
);

}else if(
hitId !==
getSelectedId()
){

setSelectedId(hitId);

const picked =
getSelected();

if(
picked?.type ===
"fib"
){
styleBarCtl?.setFibSettingsShapeId?.(
picked.id
);
}

if(
isCoarseTouchViewport()
){
desktopEdit?.pinDrawingSelection?.(
hitId
);
setBlockChartClick(
true
);
}

updateStyleBar();
redraw();

return;

}

const sel =
getSelected();

if(
!sel
){
return;
}

const handleId =
hitTestHandle(
x,
y,
sel
);

const onBody =
hitTestShapeBody(
x,
y,
sel
);

function blockDesktopChartClick(){

setBlockChartClick(true);

e.preventDefault();
e.stopPropagation();

}

if(
!handleId &&
!onBody
){

if(
hoverSelect
){
blockDesktopChartClick();
}

return;

}

if(
handleId
){

beginHandleDragState(
sel,
handleId,
x,
y
);

}else if(
onBody
){

if(
isPositionType(
sel.type
)
){

setDragState({
shapeId: sel.id,
mode: "position-move",
startX: x,
startY: y,
lastPlotX: x,
lastPlotY: y,
snapshot: {
p1: { ...sel.p1 },
p2: { ...sel.p2 },
tpPrice: sel.tpPrice,
slPrice: sel.slPrice,
entry: positionEntryPrice(
sel
)
}
});

}else{

const movePoints =
chartPointsForScreenMove(
sel
);

const offsets =
movePoints
? screenDragOffsetsForPoints(
movePoints,
x,
y
)
: null;

if(
!offsets
){

if(
hoverSelect
){
blockDesktopChartClick();
}

return;

}

setDragState({
shapeId: sel.id,
mode: "screen-move",
startX: x,
startY: y,
lastPlotX: x,
lastPlotY: y,
pointOffsets: offsets
});

}

}

notifyTabletChartGestureAbort();

blockDesktopChartClick();

beginEditDragCrosshair(
e,
x,
y
);

syncChartTouchPan();

try{
wrapEl.setPointerCapture(e.pointerId);
}catch{
/* ignore */
}

};

wrapEl.addEventListener(
"pointerdown",
onEditDown,
true
);

wrapEl.addEventListener(
"click",
onDesktopSelectClick,
true
);

wrapEl.addEventListener(
"pointermove",
onEditHover,
true
);

wrapEl.addEventListener(
"pointerleave",
onEditLeave
);

const onEditMove = e=>{

if(!getAlive() || !getDragState()){
return;
}

if(!e.isPrimary){
return;
}

e.preventDefault();

const { x, y } = pointerFromEvent(e);

const shape =
getDrawings().find(d=>d.id === getDragState().shapeId);

if(!shape){
return;
}

syncEditDragCrosshair(
e,
x,
y
);

if(getDragState().mode === "position-move"){

const locked =
constrainBodyDragPointer(
getDragState(),
x,
y,
e.shiftKey
);

if(
!applyPositionBodyMove(
shape,
getDragState().startX,
getDragState().startY,
locked.x,
locked.y,
getDragState().snapshot
)
){
return;
}

getDragState().lastPlotX =
locked.x;
getDragState().lastPlotY =
locked.y;

}else if(getDragState().mode === "screen-move"){

const locked =
constrainBodyDragPointer(
getDragState(),
x,
y,
e.shiftKey
);

if(
!applyScreenMoveToShape(
shape,
getDragState().pointOffsets,
locked.x,
locked.y
)
){
return;
}

getDragState().lastPlotX =
locked.x;
getDragState().lastPlotY =
locked.y;

}else{

if(
!applyHandleDragAtPlot(
shape,
x,
y,
e
)
){
return;
}

}

scheduleDragRedraw();

};

const onEditUp = e=>{

desktopEdit.finishDesktopPointerSelect(
e
);

if(
!getAlive() ||
!getDragState()
){
return;
}

if(
getDragRedrawRaf()
){
cancelAnimationFrame(
getDragRedrawRaf()
);
setDragRedrawRaf(0);
}

const draggedShape =
getDrawings().find(d=>d.id === getDragState().shapeId);

if(
draggedShape
){

if(
isPositionType(
draggedShape.type
)
){

const preserveTpSl =
getDragState().mode ===
"position-move" ||
getDragState().mode ===
"screen-move";

clampPositionPrices(
draggedShape,
{
handleId:
getDragState().mode ===
"handle"
? getDragState().handleId
: null,
preserveTpSl
}
);

}else if(
draggedShape.type ===
"fib" &&
getDragState().mode ===
"handle"
){

ensureFibAnchorMinSpan(
draggedShape,
getDragState().handleId,
{
toXY,
pointFromXY
}
);

}

touchShapeRevision(
draggedShape
);
saveDrawings();

}

setDragState(null);
clearEditDragCrosshair();
flushDeferredFibSettingsSync?.();
syncChartTouchPan();
redraw();
setBlockChartClick(true);

};

window.addEventListener(
"pointermove",
onEditMove
);
window.addEventListener(
"pointerup",
onEditUp
);
window.addEventListener(
"pointercancel",
onEditUp
);

return ()=>{
wrapEl.removeEventListener(
"pointerdown",
onEditDown,
true
);
wrapEl.removeEventListener(
"click",
onDesktopSelectClick,
true
);
wrapEl.removeEventListener(
"pointermove",
onEditHover,
true
);
wrapEl.removeEventListener(
"pointerleave",
onEditLeave
);
window.removeEventListener("pointermove", onEditMove);
window.removeEventListener("pointerup", onEditUp);
window.removeEventListener("pointercancel", onEditUp);
};

}

function scheduleDragRedraw(){

if(
getChartPanActive()
){
return;
}

if(
getDragRedrawRaf()
){
return;
}

setDragRedrawRaf(
requestAnimationFrame(()=>{

setDragRedrawRaf(0);
redraw();

}));

}

return {
setupEditInteraction,
hitTestHandle,
hitTestShapeBody,
scheduleDragRedraw,
reapplyActiveDragCoords,
reapplyActiveDragFromPlot
};

}

