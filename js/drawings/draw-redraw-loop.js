/**
 * Canvas redraw loop + selection handles.
 * Phase 9 split from drawings/init.js.
 */
import {
isPositionType
} from "./position.js?v=1";

import {
getRectangleHandleScreens
} from "./arrow-rect.js?v=2";

import {
isChartLayoutReady
} from "../chart-layout-gate.js?v=2";

export function createDrawRedrawLoop(
deps
){

const {
canvas,
chartSize,
getPlotWidth,
getChartPanActive,
getDrawings,
getSelectedId,
getPlacement,
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
drawChartRulerOverlay,
drawRegistryPriceAlerts,
drawPriceScaleLabels,
onAfterRedraw
} =
deps;

let coordRetryCount = 0;
let redrawRaf1 = 0;
let redrawRaf2 = 0;

function drawSelectionHandles(ctx, shape){

if(shape.type === "trendline" || shape.type === "fib" || shape.type === "arrow"){

const a = toXY(shape.p1);
const b = toXY(shape.p2);

if(a){
drawAnchorCircle(ctx, a.x, a.y);
}

if(b){
drawAnchorCircle(ctx, b.x, b.y);
}

}

if(
shape.type ===
"rectangle"
){

getRectangleHandleScreens(
shape,
toXY
).forEach(
handle=>{

if(
handle.square
){
drawAnchorSquare(
ctx,
handle.x,
handle.y
);
}else{
drawAnchorCircle(
ctx,
handle.x,
handle.y
);
}

}
);

}

if(shape.type === "hray"){

const anchor = toXY({
time: shape.time,
price: shape.price
});

if(anchor){
drawAnchorCircle(ctx, anchor.x, anchor.y);
}

}

if(shape.type === "channel"){

const geom =
channelScreenGeometry(
shape
);

if(
!geom
){
return;
}

drawAnchorCircle(
ctx,
geom.p1.x,
geom.p1.y
);

drawAnchorCircle(
ctx,
geom.p2.x,
geom.p2.y
);

drawAnchorCircle(
ctx,
geom.p3.x,
geom.p3.y
);

drawAnchorCircle(
ctx,
geom.p4.x,
geom.p4.y
);

drawAnchorSquare(
ctx,
geom.edgeMidA.x,
geom.edgeMidA.y
);

drawAnchorSquare(
ctx,
geom.edgeMidB.x,
geom.edgeMidB.y
);

}

if(isPositionType(shape.type)){

getPositionHandleScreens(shape).forEach(handle=>{
drawPositionAnchor(ctx, handle.x, handle.y);
});

}

}

function shapeCoordsReady(shape){

if(shape.type === "trendline" || shape.type === "fib" || shape.type === "arrow"){

return !!(
toXY(shape.p1) &&
toXY(shape.p2)
);

}

if(
shape.type ===
"rectangle"
){

return !!(
toXY(shape.p1) &&
toXY(shape.p2)
);

}

if(shape.type === "hray"){

return !!toXY({
time: shape.time,
price: shape.price
});

}

if(shape.type === "channel"){

return !!(
toXY(shape.p1) &&
toXY(shape.p2) &&
toXY(shape.p3)
);

}

if(isPositionType(shape.type)){

return !!(
toXY(shape.p1) &&
toXY(shape.p2) &&
series.priceToCoordinate(shape.tpPrice) != null &&
series.priceToCoordinate(shape.slPrice) != null
);

}

return true;

}

function scheduleRedraw(){

if(
!isChartLayoutReady()
){
return;
}

if(getChartPanActive()){
return;
}

if(redrawRaf1){
cancelAnimationFrame(redrawRaf1);
}

if(redrawRaf2){
cancelAnimationFrame(redrawRaf2);
}

redrawRaf1 =
requestAnimationFrame(()=>{

redrawRaf2 =
requestAnimationFrame(()=>{

redrawRaf1 = 0;
redrawRaf2 = 0;
redraw();

});

});

}

function redraw(){

if(
!isChartLayoutReady()
){
return;
}

try{

const ctx = canvas.getContext("2d");
const dpr = window.devicePixelRatio || 1;
const { w, h } = chartSize();
const plotW =
getPlotWidth();

ctx.setTransform(1, 0, 0, 1, 0, 0);
ctx.clearRect(0, 0, canvas.width, canvas.height);
ctx.scale(dpr, dpr);

removePriceGutterOverlay();

ctx.save();
ctx.beginPath();
ctx.rect(0, 0, plotW, h);
ctx.clip();

getDrawings().forEach(d=>{

try{
drawShape(ctx, d, plotW, h);

if(d.id === getSelectedId()){
drawSelectionHandles(ctx, d);
}

}catch(err){
console.warn("draw shape", err);
}

});

if(getPlacement()){
drawPlacementPreview(ctx, plotW, h);
}

drawChartRulerOverlay(
ctx,
plotW,
h
);

ctx.restore();

drawRegistryPriceAlerts(
ctx,
plotW,
h
);

drawPriceScaleLabels(ctx);

if(
typeof onAfterRedraw ===
"function"
){
onAfterRedraw(
ctx,
plotW,
h
);
}

}catch(err){
console.warn("redraw", err);
}

if(
!getChartPanActive() &&
coordRetryCount < 8 &&
getDrawings().some(
d=>!shapeCoordsReady(d)
)
){

coordRetryCount++;
scheduleRedraw();

}else{

coordRetryCount = 0;

}

}

function cancelPendingRedraws(){

if(redrawRaf1){
cancelAnimationFrame(redrawRaf1);
redrawRaf1 = 0;
}

if(redrawRaf2){
cancelAnimationFrame(redrawRaf2);
redrawRaf2 = 0;
}

}

return {
scheduleRedraw,
redraw,
shapeCoordsReady,
cancelPendingRedraws
};

}

