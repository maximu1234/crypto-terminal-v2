/**
 * Price scale labels, gutter, drag-sync redraw.
 * Phase 10 split from drawings/init.js.
 */
import {
chartScaleFont,
CHART_SCALE_LABEL_PAD_LEFT,
CHART_SCALE_LABEL_LINE_HEIGHT,
scaleLabelTextColorForBackground
} from "../chart-import.js?v=43";

import {
layoutScaleLabelYs,
CHART_PRICE_HUD_FALLBACK_HEIGHT
} from "./scale-label-layout.js?v=2";

import {
isSeriesLogarithmic
} from "./fib-spec.js?v=12";

export function createDrawPriceScale(
deps
){

const {
getAlive,
chart,
series,
wrapEl,
chartSize,
pointerFromEvent,
holdChartPanRedraw,
bumpChartPanRedraw,
getDrawings,
getSelectedId,
listHandles,
toXY,
shapeStyle,
formatScalePrice,
readChartScaleMargins,
isPriceScaleInverted,
manualPriceToCoordinate,
getPriceScaleDragActive,
setPriceScaleDragActive,
getManualPriceScaleDrag,
setManualPriceScaleDrag,
redraw
} =
deps;

let priceGutterEl = null;
let priceScaleSyncPending = false;
let priceScalePaintRaf = 0;
let seriesPriceToCoordinateOrig = null;

function getPriceGutterWidth(){

try{
return chart.priceScale("right").width() || 56;
}catch{
return 56;
}

}

function getPlotWidth(){

return Math.max(
0,
chartSize().w - getPriceGutterWidth()
);

}

function isPointerInPriceGutter(
px
){

return (
px >=
getPlotWidth() - 4
);

}

function removePriceGutterOverlay(){

if(priceGutterEl){
priceGutterEl.remove();
priceGutterEl = null;
}

}

function drawScalePriceBadge(
ctx,
y,
price,
color
){

if(
y == null ||
!Number.isFinite(y) ||
!Number.isFinite(Number(price))
){
return;
}

const text =
formatScalePrice(Number(price));

const chartW =
chartSize().w;
const scaleW =
getPriceGutterWidth();
const left =
chartW - scaleW;
const th =
CHART_SCALE_LABEL_LINE_HEIGHT;
const top =
y - th / 2;
const textX =
left + CHART_SCALE_LABEL_PAD_LEFT;

ctx.save();
ctx.font =
`normal ${chartScaleFont()}`;
ctx.textAlign = "left";
ctx.textBaseline = "middle";

const bg =
color || "rgba(30, 41, 59, 0.95)";

ctx.fillStyle = bg;
ctx.fillRect(left, top, scaleW, th);
ctx.fillStyle =
scaleLabelTextColorForBackground(bg);
ctx.fillText(text, textX, y);
ctx.restore();

}

function getCurrentPriceHudBand(){

const hud =
wrapEl.querySelector(
".chart-price-hud"
);

if(
!hud ||
hud.classList.contains(
"hidden"
)
){
return null;
}

let centerY =
parseFloat(
String(
hud.style.top ||
""
)
);

if(
!Number.isFinite(
centerY
)
){

const data =
series.data();
const last =
data?.[data.length - 1];

if(
!last ||
last.close == null
){
return null;
}

centerY =
series.priceToCoordinate(
last.close
);

if(
centerY == null ||
!Number.isFinite(
centerY
)
){
return null;
}

}

const height =
hud.offsetHeight ||
CHART_PRICE_HUD_FALLBACK_HEIGHT;

return {
centerY,
height
};

}

function drawPriceScaleLabels(ctx){

const entries = [];

getDrawings().forEach(shape=>{

if(shape.type !== "hray"){
return;
}

const y =
series.priceToCoordinate(shape.price);

if(y == null){
return;
}

const { color } =
shapeStyle(shape);

entries.push({
yIdeal: y,
price: shape.price,
color
});

});

if(getSelectedId()){

const sel =
getDrawings().find(d=>d.id === getSelectedId());

if(
sel &&
sel.type !== "hray"
){

listHandles(sel).forEach(handle=>{

const xy =
toXY(handle.point);

if(!xy){
return;
}

const { color } =
shapeStyle(sel);

entries.push({
yIdeal: xy.y,
price: handle.point.price,
color
});

});

}

}

if(!entries.length){
return;
}

const hudBand =
getCurrentPriceHudBand();

const yDraws =
layoutScaleLabelYs(
entries.map(e=>e.yIdeal),
CHART_SCALE_LABEL_LINE_HEIGHT,
chartSize().h,
{
fixedBands:
hudBand
? [hudBand]
: []
}
);

entries.forEach((entry, i)=>{

const yDraw =
yDraws[i];

if(
!Number.isFinite(yDraw)
){
return;
}

drawScalePriceBadge(
ctx,
yDraw,
entry.price,
entry.color
);

});

}

function schedulePriceScaleSyncedRedraw(){

if(
!getAlive()
){
return;
}

if(
priceScaleSyncPending
){
return;
}

priceScaleSyncPending =
true;

requestAnimationFrame(
()=>{
requestAnimationFrame(
()=>{
priceScaleSyncPending =
false;

if(
!getAlive()
){
return;
}

redraw();

}
);
}
);

}

function ensureSeriesPriceToCoordinatePatch(){

if(
seriesPriceToCoordinateOrig
){
return;
}

seriesPriceToCoordinateOrig =
series.priceToCoordinate.bind(
series
);

series.priceToCoordinate =
function(
price
){

if(
getPriceScaleDragActive()
){

if(
getManualPriceScaleDrag()
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

return seriesPriceToCoordinateOrig(
price
);

};

}

function restoreSeriesPriceToCoordinate(){

if(
!seriesPriceToCoordinateOrig
){
return;
}

series.priceToCoordinate =
seriesPriceToCoordinateOrig;
seriesPriceToCoordinateOrig =
null;

}

function captureVisiblePriceRangeFromSeries(){

const { h } =
chartSize();
const m =
readChartScaleMargins();
const plotTop =
h * m.top;
const plotBottom =
h * (
1 - m.bottom
);

let priceAtTop =
series.coordinateToPrice(
plotTop
);
let priceAtBottom =
series.coordinateToPrice(
plotBottom
);

if(
priceAtTop ==
null ||
priceAtBottom ==
null
){
return null;
}

const min =
Math.min(
priceAtTop,
priceAtBottom
);
const max =
Math.max(
priceAtTop,
priceAtBottom
);

if(
!Number.isFinite(
min
) ||
!Number.isFinite(
max
) ||
min ===
max
){
return null;
}

return {
min,
max
};

}

function refreshPriceScaleDragRangeFromSeries(){

const range =
captureVisiblePriceRangeFromSeries();

if(
!range
){
return false;
}

return applyLockedPriceRangeFromChart(
range
);

}

function applyLockedPriceRangeFromChart(
range
){

if(
!range ||
!Number.isFinite(
range.min
) ||
!Number.isFinite(
range.max
) ||
range.min ===
range.max
){
setManualPriceScaleDrag(null);

return false;
}

const m =
readChartScaleMargins();

setManualPriceScaleDrag({
minPrice:range.min,
maxPrice:range.max,
top:m.top,
bottom:m.bottom,
h:chartSize().h,
inverted:
isPriceScaleInverted(),
logarithmic:
isSeriesLogarithmic(
series
)
});

return true;

}

function priceScaleDragPaintLoop(){

if(
!getAlive() ||
!getPriceScaleDragActive()
){
priceScalePaintRaf = 0;
return;
}

refreshPriceScaleDragRangeFromSeries();
redraw();
priceScalePaintRaf =
requestAnimationFrame(
priceScaleDragPaintLoop
);

}

function startPriceScalePaintLoop(){

if(
priceScalePaintRaf
){
return;
}

priceScalePaintRaf =
requestAnimationFrame(
priceScaleDragPaintLoop
);

}

function stopPriceScalePaintLoop(){

if(
priceScalePaintRaf
){
cancelAnimationFrame(
priceScalePaintRaf
);
priceScalePaintRaf = 0;
}

}

function beginPriceScaleDragRedraw(
range
){

setPriceScaleDragActive(true);
ensureSeriesPriceToCoordinatePatch();
applyLockedPriceRangeFromChart(
range
);
redraw();
startPriceScalePaintLoop();

}

function applyPriceScaleFrame(
range
){

if(
!getPriceScaleDragActive()
){
return;
}

applyLockedPriceRangeFromChart(
range
);
redraw();

}

function redrawDuringPriceScaleDrag(
range
){

applyPriceScaleFrame(
range
);

}

function endPriceScaleDragRedraw(){

setManualPriceScaleDrag(null);
setPriceScaleDragActive(false);
stopPriceScalePaintLoop();
restoreSeriesPriceToCoordinate();
schedulePriceScaleSyncedRedraw();

}

function cancelPriceScalePaint(){

stopPriceScalePaintLoop();

if(
seriesPriceToCoordinateOrig
){
restoreSeriesPriceToCoordinate();
}

}

function setupDesktopPriceScaleDrag(){

if(
typeof pointerFromEvent !==
"function"
){
return ()=>{};
}

let dragPointerId =
null;

const onPointerDown = e=>{

if(
!getAlive() ||
e.pointerType !==
"mouse" ||
e.button !==
0 ||
!e.isPrimary
){
return;
}

const { x } =
pointerFromEvent(
e
);

if(
!isPointerInPriceGutter(
x
)
){
return;
}

const range =
captureVisiblePriceRangeFromSeries();

if(
!range
){
return;
}

dragPointerId =
e.pointerId ??
0;
holdChartPanRedraw?.();
beginPriceScaleDragRedraw(
range
);

};

const endDesktopPriceScaleDrag = e=>{

if(
dragPointerId ==
null
){
return;
}

if(
e?.pointerId !==
undefined &&
e.pointerId !==
dragPointerId
){
return;
}

dragPointerId =
null;
endPriceScaleDragRedraw();
bumpChartPanRedraw?.();

};

wrapEl.addEventListener(
"pointerdown",
onPointerDown,
true
);
window.addEventListener(
"pointerup",
endDesktopPriceScaleDrag
);
window.addEventListener(
"pointercancel",
endDesktopPriceScaleDrag
);
window.addEventListener(
"blur",
endDesktopPriceScaleDrag
);

return ()=>{
wrapEl.removeEventListener(
"pointerdown",
onPointerDown,
true
);
window.removeEventListener(
"pointerup",
endDesktopPriceScaleDrag
);
window.removeEventListener(
"pointercancel",
endDesktopPriceScaleDrag
);
window.removeEventListener(
"blur",
endDesktopPriceScaleDrag
);
if(
dragPointerId !=
null
){
dragPointerId =
null;
endPriceScaleDragRedraw();
bumpChartPanRedraw?.();
}
};

}

return {
getPriceGutterWidth,
getPlotWidth,
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
};

}

