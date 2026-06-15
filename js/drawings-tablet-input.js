import {
isCoarseTouchViewport,
isTabletChartViewport,
hasAnyFinePointer,
positionDomChartCrosshair,
hideDomChartCrosshair
} from "./chart-import.js?v=38";

import {
isPositionType
} from "./drawings/position.js?v=1";

/**
 * Touch/pointer placement for iPad and coarse-touch viewports.
 * @param {object} ctx
 * @returns {object}
 */
export function mountTabletDrawInput(ctx){

const {
wrapEl,
chart,
series,
chartSize,
pointFromXY,
pointerFromEvent,
isDrawChromePointerEvent,
getPlacement,
getTool,
finishPlacement,
redraw,
setBlockChartClick,
setPreviewPoint,
setPreviewXY,
onChartCrosshairAt,
onChartCrosshairClear,
onChartCrosshairSuppress,
onChartCrosshairRelease,
tabletCustomPanHooked
} = ctx;

let touchDrawCrosshair = null;
let touchPlaceTrack = null;

function prefersTouchDrawInput(){

if(
!isCoarseTouchViewport()
){
return false;
}

if(
isTabletChartViewport()
){
return true;
}

return !hasAnyFinePointer();

}

function isTouchDrawTablet(){

return prefersTouchDrawInput();

}

function isTouchDrawPlacement(){

return prefersTouchDrawInput();

}

function useChartProbeCrosshair(){

return (
typeof onChartCrosshairAt ===
"function" &&
tabletCustomPanHooked &&
isTabletChartViewport()
);

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

function clampTouchCrosshairXY(x, y){

const { w, h } =
chartSize();

return {
x: Math.max(0, Math.min(w, x)),
y: Math.max(0, Math.min(h, y))
};

}

function crosshairClientFromLocal(
localX,
localY
){

const rect =
wrapEl.getBoundingClientRect();

return {
clientX: rect.left + localX,
clientY: rect.top + localY
};

}

function showStandardChartCrosshair(
e,
localX,
localY
){

const xy =
clampTouchCrosshairXY(
localX,
localY
);

const clientX =
e?.clientX;

const clientY =
e?.clientY;

const client =
clientX != null &&
clientY != null
? { clientX, clientY }
: crosshairClientFromLocal(
xy.x,
xy.y
);

if(
!isTouchDrawTablet()
){

positionDomChartCrosshair({
wrapEl,
chartEl:chartCanvasEl(),
chart,
series,
clientX:client.clientX,
clientY:client.clientY
});

return;

}

if(
useChartProbeCrosshair()
){

try{
onChartCrosshairAt(
client.clientX,
client.clientY
);
}catch{
/* ignore */
}

return;

}

positionDomChartCrosshair({
wrapEl,
chartEl:chartCanvasEl(),
chart,
series,
clientX:client.clientX,
clientY:client.clientY
});

}

function hideStandardChartCrosshair(){

if(
isTouchDrawTablet()
){

if(
useChartProbeCrosshair()
){

try{
onChartCrosshairClear?.();
}catch{
/* ignore */
}

}else{

hideDomChartCrosshair(
wrapEl
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

}

return;

}

hideDomChartCrosshair(
wrapEl
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

}

function placementPointsNeeded(type){

if(type === "channel"){
return 3;
}

if(
type === "hray" ||
isPositionType(type)
){
return 1;
}

return 2;

}

function suppressChartCrosshairForDrag(){

try{
onChartCrosshairSuppress?.();
}catch{
/* ignore */
}

hideStandardChartCrosshair();

if(
!isTouchDrawTablet() &&
chart
){

try{
chart.clearCrosshairPosition();
}catch{
/* ignore */
}

}

}

function syncEditDragCrosshair(
e,
localX,
localY
){

if(
!ctx.getDragState?.()
){
return;
}

showStandardChartCrosshair(
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

suppressChartCrosshairForDrag();

syncEditDragCrosshair(
e,
localX,
localY
);

}

function clearEditDragCrosshair(){

hideStandardChartCrosshair();

try{
onChartCrosshairRelease?.();
}catch{
/* ignore */
}

}

function syncTouchDrawCrosshairPreview(){

if(
!touchDrawCrosshair
){
setPreviewPoint(null);
setPreviewXY(null);
return;
}

setPreviewXY({
x: touchDrawCrosshair.x,
y: touchDrawCrosshair.y
});

setPreviewPoint(
pointFromXY(
touchDrawCrosshair.x,
touchDrawCrosshair.y
)
);

if(
getPlacement() &&
isTouchDrawPlacement()
){
showStandardChartCrosshair(
null,
touchDrawCrosshair.x,
touchDrawCrosshair.y
);
}

}

function initTouchDrawCrosshair(){

const { w, h } =
chartSize();

touchDrawCrosshair = {
x: w / 2,
y: h / 2
};

syncTouchDrawCrosshairPreview();

}

function placeTouchCrosshairPoint(){

const placement =
getPlacement();

if(
!placement ||
!touchDrawCrosshair
){
return;
}

const point =
pointFromXY(
touchDrawCrosshair.x,
touchDrawCrosshair.y
);

if(!point){
return;
}

placement.points.push(point);
setBlockChartClick(true);

if(
placement.points.length >=
placementPointsNeeded(placement.type)
){
finishPlacement();
return;
}

syncTouchDrawCrosshairPreview();
redraw();

}

function clearTouchDrawState(){

touchDrawCrosshair = null;
touchPlaceTrack = null;

}

/** iPad: порог «тап», не «перетаскивание перекрестия» */
const TAP_MOVE_PX =
18;

const onTouchPlaceDown = e=>{

const placement =
getPlacement();

if(
!placement ||
getTool() === "cursor"
){
return;
}

if(!isTouchDrawPlacement()){
return;
}

if(
e.pointerType ===
"mouse"
){
return;
}

if(isDrawChromePointerEvent(e)){
return;
}

if(!e.isPrimary){
return;
}

if(
!touchDrawCrosshair
){
initTouchDrawCrosshair();
}

const { x, y } =
pointerFromEvent(e);

touchPlaceTrack = {
id: e.pointerId,
startX: x,
startY: y,
moved: false,
crosshairX: touchDrawCrosshair.x,
crosshairY: touchDrawCrosshair.y
};

e.preventDefault();

};

const onTouchPlaceMove = e=>{

const placement =
getPlacement();

if(
!placement ||
!touchPlaceTrack ||
e.pointerId !== touchPlaceTrack.id
){
return;
}

const { x, y } =
pointerFromEvent(e);
const dx =
x - touchPlaceTrack.startX;
const dy =
y - touchPlaceTrack.startY;

if(
!touchPlaceTrack.moved &&
dx * dx + dy * dy >
TAP_MOVE_PX * TAP_MOVE_PX
){
touchPlaceTrack.moved = true;
}

if(touchPlaceTrack.moved){

touchDrawCrosshair =
clampTouchCrosshairXY(
touchPlaceTrack.crosshairX + dx,
touchPlaceTrack.crosshairY + dy
);

syncTouchDrawCrosshairPreview();
e.preventDefault();
redraw();

}

};

const onTouchPlaceUp = e=>{

const placement =
getPlacement();

if(
!placement ||
!touchPlaceTrack ||
e.pointerId !== touchPlaceTrack.id
){
return;
}

if(!touchPlaceTrack.moved){
placeTouchCrosshairPoint();
e.preventDefault();
}

touchPlaceTrack = null;

};

wrapEl.addEventListener(
"pointerdown",
onTouchPlaceDown,
true
);

wrapEl.addEventListener(
"pointermove",
onTouchPlaceMove,
true
);

wrapEl.addEventListener(
"pointerup",
onTouchPlaceUp,
true
);

wrapEl.addEventListener(
"pointercancel",
onTouchPlaceUp,
true
);

function dispose(){

wrapEl.removeEventListener(
"pointerdown",
onTouchPlaceDown,
true
);
wrapEl.removeEventListener(
"pointermove",
onTouchPlaceMove,
true
);
wrapEl.removeEventListener(
"pointerup",
onTouchPlaceUp,
true
);
wrapEl.removeEventListener(
"pointercancel",
onTouchPlaceUp,
true
);

}

return {
dispose,
prefersTouchDrawInput,
isTouchDrawPlacement,
isTouchDrawTablet,
useChartProbeCrosshair,
placementPointsNeeded,
initTouchDrawCrosshair,
syncTouchDrawCrosshairPreview,
placeTouchCrosshairPoint,
showStandardChartCrosshair,
hideStandardChartCrosshair,
suppressChartCrosshairForDrag,
syncEditDragCrosshair,
beginEditDragCrosshair,
clearEditDragCrosshair,
clearTouchDrawState,
getTouchDrawCrosshair(){
return touchDrawCrosshair;
},
getTouchPlaceTrack(){
return touchPlaceTrack;
}
};

}
