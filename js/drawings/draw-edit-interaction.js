/**
 * Edit/drag interaction: handle hit-test, body move, pointer handlers.
 * Phase 7 split from drawings/init.js.
 */
import {
isCoarseTouchViewport
} from "../chart-import.js?v=61";

import {
uid
} from "./math.js?v=2";

import {
constrainPointerToAxis
} from "./draw-axis-lock.js?v=1";

import {
DRAW_HANDLE_HIT_THRESHOLD_DESKTOP,
DRAW_HANDLE_HIT_THRESHOLD_DESKTOP_POSITION,
DRAW_BODY_HIT_THRESHOLD_TOUCH,
isHorizPriceTool
} from "./constants.js?v=13";

import {
getRectangleHandleScreens,
moveRectangleHandle
} from "./arrow-rect.js?v=2";

import {
getFvpHandleScreens,
moveFvpHandle,
isFvpType
} from "./fixed-volume-profile.js?v=3";

import {
isPositionType,
positionEntryPrice
} from "./position.js?v=11";

import {
ensureFibAnchorMinSpan,
isFibType,
isFibExtType
} from "./fib-spec.js?v=17";

import {
touchShapeRevision
} from "../drawings-storage.js?v=7";

import {
stripAlertFromShape
} from "./drawings-persist.js?v=18";

import {
moveBrushHandle,
applyBrushScreenMove,
brushChartPointsForMove,
brushBodyDist
} from "./brush.js?v=2";

import {
isTextTool,
hitTestTextBody
} from "./text.js?v=3";

import {
isElliottType,
getElliottPoints,
setElliottPoints,
elliottHandleIndex
} from "./elliott-spec.js?v=17";

/**
 * Handle hit circles are larger than the vertex. Drag already uses grab
 * offset so the object does not jump; the chart crosshair must use that
 * same plot point (handle center), not the raw click on the ring.
 */
export function handleDragCrosshairPlotXY(
drag,
pointerX,
pointerY
){

if(
!drag ||
drag.mode !==
"handle"
){
return {
x: pointerX,
y: pointerY
};
}

return {
x: pointerX - (
Number(
drag.grabOffsetX
) ||
0
),
y: pointerY - (
Number(
drag.grabOffsetY
) ||
0
)
};

}

export function handleVertexPlotXY(
screens,
handleId
){

if(
!handleId ||
!Array.isArray(
screens
)
){
return null;
}

for(
const handle of
screens
){

if(
handle?.id !==
handleId
){
continue;
}

const x =
Number(
handle.x
);
const y =
Number(
handle.y
);

if(
Number.isFinite(
x
) &&
Number.isFinite(
y
)
){
return {
x,
y
};
}

}

return null;

}

export function listHandleScreenPoints(
shape,
adapters =
{}
){

if(
!shape
){
return [];
}

const toXY =
adapters.toXY;
const getPositionHandleScreens =
adapters.getPositionHandleScreens;
const listHandles =
adapters.listHandles;
const getCandles =
typeof adapters.getCandles ===
"function"
? adapters.getCandles
: ()=>
[];

if(
typeof toXY !==
"function"
){
return [];
}

if(
isPositionType(
shape.type
) &&
typeof getPositionHandleScreens ===
"function"
){
return getPositionHandleScreens(
shape
) ||
[];
}

if(
shape.type ===
"rectangle"
){
return getRectangleHandleScreens(
shape,
toXY
) ||
[];
}

if(
isFvpType(
shape.type
)
){
return getFvpHandleScreens(
shape,
toXY,
getCandles()
) ||
[];
}

if(
typeof listHandles !==
"function"
){
return [];
}

const out =
[];

for(
const handle of
listHandles(
shape
)
){

const xy =
toXY(
handle.point
);

if(
xy
){
out.push({
id: handle.id,
x: xy.x,
y: xy.y
});
}

}

return out;

}

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
getSelectedIds = ()=>{
const id =
getSelectedId();
return id
? [
id
]
: [];
},
toggleSelectedId = null,
setSelectedIds = null,
isIdSelected = id=>
id ===
getSelectedId(),
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
hitTestElliottBody,
hitTestRectangleBody,
hitTestFvpBody,
hitTestHrayLine,
channelP4Point,
drawBodyHitThreshold: drawBodyHitThresholdDep,
drawingsIntersectingRect = null,
getCandles = ()=>
[]
} =
deps;

function clientXYFromChartPlot(
plotX,
plotY
){

const el =
wrapEl?.querySelector?.(
".chart"
) ||
wrapEl?.querySelector?.(
"#chart"
) ||
wrapEl;

const r =
el?.getBoundingClientRect?.();

if(
!r
){
return null;
}

return {
clientX: r.left + plotX,
clientY: r.top + plotY
};

}

function listHandleScreens(
shape
){

return listHandleScreenPoints(
shape,
{
toXY,
getPositionHandleScreens,
listHandles,
getCandles
}
);

}

function plotToEditDragCrosshairArgs(
e,
plotX,
plotY,
pointerX,
pointerY
){

const client =
clientXYFromChartPlot(
plotX,
plotY
);

if(
client
){
return {
event:{
clientX: client.clientX,
clientY: client.clientY,
pointerType: e?.pointerType
},
x: plotX,
y: plotY
};
}

return {
event: e,
x: pointerX,
y: pointerY
};

}

function editDragCrosshairArgs(
e,
pointerX,
pointerY
){

const drag =
getDragState();

if(
drag?.mode ===
"handle"
){

const plot =
handleDragCrosshairPlotXY(
drag,
pointerX,
pointerY
);

return plotToEditDragCrosshairArgs(
e,
plot.x,
plot.y,
pointerX,
pointerY
);

}

return {
event: e,
x: pointerX,
y: pointerY
};

}

function handleEditDragCrosshairArgs(
e,
shape,
handleId,
pointerX,
pointerY
){

const vertex =
handleVertexPlotXY(
listHandleScreens(
shape
),
handleId
);

if(
vertex
){
return plotToEditDragCrosshairArgs(
e,
vertex.x,
vertex.y,
pointerX,
pointerY
);
}

return editDragCrosshairArgs(
e,
pointerX,
pointerY
);

}

function beginHandleEditDragCrosshair(
e,
shape,
handleId,
pointerX,
pointerY
){

const a =
handleEditDragCrosshairArgs(
e,
shape,
handleId,
pointerX,
pointerY
);

beginEditDragCrosshair(
a.event,
a.x,
a.y
);

}

function syncHandleEditDragCrosshair(
e,
shape,
handleId,
pointerX,
pointerY
){

const a =
handleEditDragCrosshairArgs(
e,
shape,
handleId,
pointerX,
pointerY
);

syncEditDragCrosshair(
a.event,
a.x,
a.y
);

}

function beginSnappedEditDragCrosshair(
e,
pointerX,
pointerY
){

const a =
editDragCrosshairArgs(
e,
pointerX,
pointerY
);

beginEditDragCrosshair(
a.event,
a.x,
a.y
);

}

function syncSnappedEditDragCrosshair(
e,
pointerX,
pointerY
){

const a =
editDragCrosshairArgs(
e,
pointerX,
pointerY
);

syncEditDragCrosshair(
a.event,
a.x,
a.y
);

}

function beginActiveEditDragCrosshair(
e,
pointerX,
pointerY
){

const drag =
getDragState();

if(
drag?.mode ===
"handle"
){

const shape =
getDrawings().find(
d=>
d.id ===
drag.shapeId
);

beginHandleEditDragCrosshair(
e,
shape,
drag.handleId,
pointerX,
pointerY
);
return;

}

beginSnappedEditDragCrosshair(
e,
pointerX,
pointerY
);

}

let drawBodyHitThreshold =
drawBodyHitThresholdDep ??
(()=>DRAW_BODY_HIT_THRESHOLD_TOUCH);
let pendingModSelect =
null;

const MULTI_DRAG_PX =
4;

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

for(
const handle of
listHandleScreens(
shape
)
){

const threshold =
handle.square
? handleThreshold *
0.95
: handleThreshold;

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
isFibExtType(
shape.type
)
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
isFvpType(
shape.type
)
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
isHorizPriceTool(
shape.type
) &&
handleId ===
"anchor"
){
return {
time: shape.time,
price: shape.price
};
}

if(
isTextTool(
shape.type
) &&
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
isElliottType(
shape.type
)
){

const idx =
elliottHandleIndex(
handleId
);
const pts =
getElliottPoints(
shape
);

if(
idx >=
0 &&
pts[
idx
]
){
return pts[
idx
];
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

return handleVertexPlotXY(
listHandleScreens(
shape
),
handleId
);

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

if(
drag.mode ===
"group-move"
){

return applyGroupMove(
drag,
x,
y,
false
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
isFibExtType(
shape.type
)
){

if(handleId === "p1"){
shape.p1 = { ...point };
}

if(handleId === "p2"){
shape.p2 = { ...point };
}

if(handleId === "p3"){
shape.p3 = { ...point };
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

if(
isFvpType(
shape.type
)
){

moveFvpHandle(
shape,
handleId,
point
);
return;

}

if(isHorizPriceTool(shape.type) && handleId === "anchor"){

shape.time = point.time;
shape.price = point.price;

}

if(isTextTool(shape.type) && handleId === "anchor"){

shape.time = point.time;
shape.price = point.price;
shape.p1 = point;

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

if(
isElliottType(
shape.type
)
){

const idx =
elliottHandleIndex(
handleId
);
const pts =
getElliottPoints(
shape
);

if(
idx >=
0 &&
idx <
pts.length
){
pts[
idx
] = {
...point
};
setElliottPoints(
shape,
pts
);
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
isFibExtType(
shape.type
)
){
return [shape.p1, shape.p2, shape.p3];
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

/* FVP: TV Fixed Range VP — body selects, only handles move. */

if(shape.type === "channel"){
return [shape.p1, shape.p2, shape.p3];
}

if(
isElliottType(
shape.type
)
){
return getElliottPoints(
shape
);
}

if(isHorizPriceTool(shape.type)){
return [{
time: shape.time,
price: shape.price
}];
}

if(isTextTool(shape.type)){
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

return constrainPointerToAxis(
dragState,
x,
y,
shiftKey
);

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

if(
isFibType(
shape.type
)
){
return hitTestFibBody(px, py, shape, bodyThreshold);
}

if(shape.type === "channel"){
return hitTestChannelBody(px, py, shape, bodyThreshold);
}

if(
isElliottType(
shape.type
)
){
return hitTestElliottBody(
px,
py,
shape,
bodyThreshold
);
}

if(shape.type === "rectangle"){
return hitTestRectangleBody(px, py, shape, bodyThreshold);
}

if(
isFvpType(
shape.type
)
){
return hitTestFvpBody(px, py, shape, bodyThreshold);
}

if(isHorizPriceTool(shape.type)){
return hitTestHrayLine(px, py, shape, bodyThreshold);
}

if(isTextTool(shape.type)){
return hitTestTextBody(px, py, shape, toXY);
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
isFibExtType(
shape.type
)
){

shape.p1 = pts[0];
shape.p2 = pts[1];
shape.p3 = pts[2];
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

if(
isElliottType(
shape.type
)
){

setElliottPoints(
shape,
pts
);
return true;

}

if(isHorizPriceTool(shape.type)){

shape.time = pts[0].time;
shape.price = pts[0].price;
return true;

}

if(isTextTool(shape.type)){

shape.time = pts[0].time;
shape.price = pts[0].price;
shape.p1 = pts[0];
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

function cloneDrawingShape(
shape
){

const copy =
stripAlertFromShape(
JSON.parse(
JSON.stringify(
shape
)
)
);

copy.id =
uid();
return copy;

}

function selectedShapes(){

const ids =
new Set(
getSelectedIds()
);
const out =
[];

for(
const shape of getDrawings()
){

if(
ids.has(
shape.id
)
){
out.push(
shape
);
}

}

return out;

}

function groupMoveMembers(
shapes,
x,
y
){

const members =
[];

for(
const shape of shapes
){

if(
isFvpType(
shape.type
)
){
continue;
}

if(
isPositionType(
shape.type
)
){

members.push({
id: shape.id,
mode: "position-move",
snapshot: {
p1: { ...shape.p1 },
p2: { ...shape.p2 },
tpPrice: shape.tpPrice,
slPrice: shape.slPrice,
entry: positionEntryPrice(
shape
)
}
});
continue;

}

const movePoints =
chartPointsForScreenMove(
shape
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
continue;
}

members.push({
id: shape.id,
mode: "screen-move",
pointOffsets: offsets
});

}

return members;

}

function applyGroupMove(
drag,
x,
y,
shiftKey
){

const locked =
constrainBodyDragPointer(
drag,
x,
y,
shiftKey
);

for(
const member of drag.members ||
[]
){

const shape =
getDrawings().find(
d=>
d.id ===
member.id
);

if(
!shape
){
continue;
}

if(
member.mode ===
"position-move"
){

applyPositionBodyMove(
shape,
drag.startX,
drag.startY,
locked.x,
locked.y,
member.snapshot
);

}else if(
member.mode ===
"screen-move"
){

applyScreenMoveToShape(
shape,
member.pointOffsets,
locked.x,
locked.y
);

}

}

drag.lastPlotX =
locked.x;
drag.lastPlotY =
locked.y;
return true;

}

function beginGroupOrSingleMove(
shapes,
x,
y,
e
){

const members =
groupMoveMembers(
shapes,
x,
y
);

if(
!members.length
){
return false;
}

const primary =
shapes[
0
];

setDragState({
shapeId: primary?.id ||
members[
0
].id,
mode: "group-move",
startX: x,
startY: y,
lastPlotX: x,
lastPlotY: y,
members
});

notifyTabletChartGestureAbort();
setBlockChartClick(
true
);
e.preventDefault();
e.stopPropagation();
beginSnappedEditDragCrosshair(
e,
x,
y
);
syncChartTouchPan();

try{
wrapEl.setPointerCapture(
e.pointerId
);
}catch{
/* ignore */
}

return true;

}

function captureModPointer(
e,
x,
y
){

notifyTabletChartGestureAbort();
setBlockChartClick(
true
);
e.preventDefault();
e.stopPropagation();
syncChartTouchPan();

try{
wrapEl.setPointerCapture(
e.pointerId
);
}catch{
/* ignore */
}

}

function hitTestHandleOnSelected(
px,
py
){

const drawings =
getDrawings();
const primary =
getSelectedId();
const ordered =
[
primary,
...getSelectedIds().filter(
id=>
id !==
primary
)
];

for(
const id of ordered
){

const shape =
drawings.find(
d=>
d.id ===
id
);

if(
!shape
){
continue;
}

const handleId =
hitTestHandle(
px,
py,
shape
);

if(
handleId
){
return {
shape,
handleId
};
}

}

return null;

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
isFibType(
picked?.type
)
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

beginActiveEditDragCrosshair(
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
const multiMod =
hoverSelect &&
desktopEdit.isDrawMultiSelectModifier?.(
e
);

if(
multiMod
){

if(
!hitId
){

setDragState({
mode: "marquee",
startX: x,
startY: y,
lastPlotX: x,
lastPlotY: y,
shapeId: null
});
captureModPointer(
e,
x,
y
);
return;

}

pendingModSelect = {
hitId,
x,
y
};
captureModPointer(
e,
x,
y
);
return;

}

if(
!hitId
){

desktopEdit.clearDrawingSelection();
updateStyleBar();
redraw();

return;

}

if(
!isIdSelected(
hitId
)
){

setSelectedId(
hitId
);
desktopEdit.pinDrawingSelection?.(
hitId
);
updateStyleBar();
redraw();

}else if(
hoverSelect
){

desktopEdit.onPointerDownHoverHit(
hitId
);

}

const handleHit =
hitTestHandleOnSelected(
x,
y
);
const hitShape =
getDrawings().find(
d=>
d.id ===
hitId
);
const onBody =
!!hitShape &&
hitTestShapeBody(
x,
y,
hitShape
);

function blockDesktopChartClick(){

setBlockChartClick(true);

e.preventDefault();
e.stopPropagation();

}

if(
handleHit
){

beginHandleDragState(
handleHit.shape,
handleHit.handleId,
x,
y
);

}else if(
onBody
){

if(
getSelectedIds().length >
1 &&
isIdSelected(
hitId
)
){

if(
beginGroupOrSingleMove(
selectedShapes(),
x,
y,
e
)
){
return;
}

if(
hoverSelect
){
blockDesktopChartClick();
}

return;

}

const sel =
hitShape;

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

}else{

if(
hoverSelect
){
blockDesktopChartClick();
}

return;

}

notifyTabletChartGestureAbort();

blockDesktopChartClick();

beginActiveEditDragCrosshair(
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

if(
!getAlive()
){
return;
}

if(
!e.isPrimary
){
return;
}

if(
pendingModSelect &&
!getDragState()
){

const { x, y } =
pointerFromEvent(
e
);
const dx =
x - pendingModSelect.x;
const dy =
y - pendingModSelect.y;

if(
Math.hypot(
dx,
dy
) <
MULTI_DRAG_PX
){
return;
}

e.preventDefault();

const hitId =
pendingModSelect.hitId;
pendingModSelect =
null;

const hitSelected =
isIdSelected(
hitId
);

if(
!hitSelected
){
setSelectedId(
hitId
);
}

const sources =
selectedShapes();
const clones =
[];

for(
const src of sources
){

const copy =
cloneDrawingShape(
src
);
getDrawings().push(
copy
);
clones.push(
copy
);

}

if(
clones.length
){

setSelectedIds?.(
clones.map(
c=>
c.id
),
clones[
clones.length -
1
].id
);
desktopEdit.pinCurrentSelection?.();
beginGroupOrSingleMove(
clones,
x,
y,
e
);

}

updateStyleBar();
scheduleDragRedraw();
return;

}

if(
!getDragState()
){
return;
}

e.preventDefault();

const { x, y } = pointerFromEvent(e);

if(
getDragState().mode ===
"marquee"
){

getDragState().lastPlotX =
x;
getDragState().lastPlotY =
y;
scheduleDragRedraw();
return;

}

if(
getDragState().mode ===
"group-move"
){

syncSnappedEditDragCrosshair(
e,
x,
y
);
applyGroupMove(
getDragState(),
x,
y,
e.shiftKey
);
scheduleDragRedraw();
return;

}

const shape =
getDrawings().find(d=>d.id === getDragState().shapeId);

if(!shape){
return;
}

if(
getDragState().mode ===
"handle"
){

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

syncHandleEditDragCrosshair(
e,
shape,
getDragState().handleId,
x,
y
);
scheduleDragRedraw();
return;

}

syncSnappedEditDragCrosshair(
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

}

scheduleDragRedraw();

};

const onEditUp = e=>{

if(
pendingModSelect
){

const hitId =
pendingModSelect.hitId;
pendingModSelect =
null;
toggleSelectedId?.(
hitId
);
desktopEdit.pinCurrentSelection?.();
desktopEdit.suppressNextSelectClick?.();
updateStyleBar();
redraw();
setBlockChartClick(
true
);

}

const drag =
getDragState();

if(
drag?.mode ===
"marquee"
){

const spanX =
Math.abs(
drag.lastPlotX - drag.startX
);
const spanY =
Math.abs(
drag.lastPlotY - drag.startY
);

if(
spanX >=
MULTI_DRAG_PX ||
spanY >=
MULTI_DRAG_PX
){

const ids =
drawingsIntersectingRect?.(
getDrawings(),
drag.startX,
drag.startY,
drag.lastPlotX,
drag.lastPlotY
) ||
[];

setSelectedIds?.(
ids,
ids[
ids.length -
1
]
);
desktopEdit.pinCurrentSelection?.();

}

desktopEdit.suppressNextSelectClick?.();
setDragState(
null
);
clearEditDragCrosshair();
syncChartTouchPan();
updateStyleBar();
redraw();
setBlockChartClick(
true
);
return;

}

if(
drag?.mode ===
"group-move"
){

desktopEdit.suppressNextSelectClick?.();

for(
const member of drag.members ||
[]
){

const shape =
getDrawings().find(
d=>
d.id ===
member.id
);

if(
!shape
){
continue;
}

if(
isPositionType(
shape.type
)
){

clampPositionPrices(
shape,
{
preserveTpSl: true
}
);

}

touchShapeRevision(
shape
);

}

saveDrawings();
desktopEdit.finishDesktopPointerSelect(
e
);
setDragState(
null
);
clearEditDragCrosshair();
flushDeferredFibSettingsSync?.();
syncChartTouchPan();
redraw();
setBlockChartClick(
true
);
return;

}

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
isFibType(
draggedShape.type
) &&
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

