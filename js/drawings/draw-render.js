import {
fibLevelDash,
normalizeFibLevelWidth,
ensureFibLevelsVisible,
formatFibLabel,
fibPriceAtRatio,
getFibDrawRows,
getFibFillPairs,
isSeriesLogarithmic,
fibLevelXSpan
} from "./fib-spec.js?v=13";

import {
isPositionType
} from "./position.js?v=4";

import {
drawFilledArrow,
drawRectangleShape
} from "./arrow-rect.js?v=2";

import {
drawBrushPath
} from "./brush.js?v=2";

/**
 * @param {object} deps
 * @returns {{ drawShape, drawFib, drawPlacementPreview, fibLevelXSpan }}
 */
export function createDrawRenderer(deps){

const {
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
getPlacement,
getPreviewPoint,
getPreviewXY,
getSelectedId,
parseDrawColor,
formatDrawColor
} = deps;

function drawLine(ctx, x1, y1, x2, y2, color, width, dash){

ctx.strokeStyle = color;
ctx.lineWidth = width;
ctx.setLineDash(dash || []);

ctx.beginPath();
ctx.moveTo(x1, y1);
ctx.lineTo(x2, y2);
ctx.stroke();

ctx.setLineDash([]);

}

function drawFib(
ctx,
shape,
color,
width,
plotW
){

const a =
toXY(shape.p1);
const b =
toXY(shape.p2);

if(!a || !b){
return;
}

const {
x1,
x2,
labelX
} =
fibLevelXSpan(
a,
b,
plotW
);

const useLog =
isSeriesLogarithmic(
series
);

const drawRows =
getFibDrawRows(
shape
);

getFibFillPairs(
drawRows
).forEach(
pair=>{

const priceFrom =
fibPriceAtRatio(
shape.p1.price,
shape.p2.price,
pair.from.v,
useLog
);
const priceTo =
fibPriceAtRatio(
shape.p1.price,
shape.p2.price,
pair.to.v,
useLog
);

if(
!Number.isFinite(
priceFrom
) ||
!Number.isFinite(
priceTo
)
){
return;
}

const yFrom =
plotPriceToCoordinate(
priceFrom
);
const yTo =
plotPriceToCoordinate(
priceTo
);

if(
yFrom ==
null ||
yTo ==
null
){
return;
}

const top =
Math.min(
yFrom,
yTo
);
const bandH =
Math.abs(
yTo -
yFrom
);

if(
bandH <
1
){
return;
}

const fillColor =
pair.from.color ||
color;
const parsed =
parseDrawColor(
fillColor
);

ctx.save();
ctx.globalAlpha =
0.074;
ctx.fillStyle =
formatDrawColor(
parsed?.hex ||
fillColor,
100
);
ctx.fillRect(
x1,
top,
x2 -
x1,
bandH
);
ctx.restore();

}
);

drawRows.forEach(row=>{

if(!row.enabled){
return;
}

const price =
fibPriceAtRatio(
shape.p1.price,
shape.p2.price,
row.v,
useLog
);

if(
!Number.isFinite(price)
){
return;
}

const y =
plotPriceToCoordinate(price);

if(y == null){
return;
}

const lineColor =
row.color || color;

const dash =
fibLevelDash(row.lineStyle);

const lineWidth =
Math.max(
1,
normalizeFibLevelWidth(row.lineWidth) ||
width
);

drawLine(
ctx,
x1,
y,
x2,
y,
lineColor,
lineWidth,
dash
);

ctx.fillStyle = lineColor;
ctx.font = "11px Arial";
ctx.fillText(
formatFibLabel(row.v),
labelX,
y + 4
);

});

if(
shape.fibShowTrendLine ===
true
){

drawLine(
ctx,
a.x,
a.y,
b.x,
b.y,
color,
width,
[]
);

}

}

function drawChannelAtXY(ctx, p1, p2, p3, color, width){

if(!p1 || !p2 || !p3){
return;
}

const dx = p2.x - p1.x;
const dy = p2.y - p1.y;

const p4 = {
x: p3.x + dx,
y: p3.y + dy
};

drawLine(ctx, p1.x, p1.y, p2.x, p2.y, color, width);
drawLine(ctx, p3.x, p3.y, p4.x, p4.y, color, width);

ctx.globalAlpha = 0.55;
drawLine(
ctx,
(p1.x + p3.x) / 2,
(p1.y + p3.y) / 2,
(p2.x + p4.x) / 2,
(p2.y + p4.y) / 2,
color,
Math.max(1, width),
[5, 4]
);
ctx.globalAlpha = 1;

}

function drawChannel(ctx, shape, color, width){

const p1 = toXY(shape.p1);
const p2 = toXY(shape.p2);
const p3 = toXY(shape.p3);

drawChannelAtXY(ctx, p1, p2, p3, color, width);

}

function drawShape(ctx, shape, w, h, fibPlacementPreview = false){

const { color, width, dash } =
shapeStyle(shape);

if(shape.type === "trendline"){

const a = toXY(shape.p1);
const b = toXY(shape.p2);

if(a && b){
drawLine(ctx, a.x, a.y, b.x, b.y, color, width, dash);
}

}

if(shape.type === "brush"){

drawBrushPath(
ctx,
shape,
toXY,
color,
width,
dash
);

}

if(shape.type === "arrow"){

const a =
toXY(
shape.p1
);
const b =
toXY(
shape.p2
);

if(
a &&
b
){
drawFilledArrow(
ctx,
a.x,
a.y,
b.x,
b.y,
color
);
}

}

if(shape.type === "rectangle"){

drawRectangleShape(
ctx,
shape,
{
toXY,
shapeStyle,
parseDrawColor,
formatDrawColor
}
);

}

if(shape.type === "hray"){

const anchor = toXY({
time: shape.time,
price: shape.price
});

if(anchor){
drawLine(
ctx,
anchor.x,
anchor.y,
w,
anchor.y,
color,
width,
dash
);
}

}

if(shape.type === "fib"){
drawFib(ctx, shape, color, width, w);
}

if(shape.type === "channel"){
drawChannel(ctx, shape, color, width);
}

if(isPositionType(shape.type)){
drawPosition(
ctx,
shape,
shape.id === getSelectedId()
);
}

}

function previewPointToXY(point){

const xy = toXY(point);

if(xy){
return xy;
}

if(point?._xy){
return point._xy;
}

return null;

}

function resolvePreviewScreenXY(){

const previewPoint =
getPreviewPoint();
const previewXY =
getPreviewXY();
const fromPoint =
previewPoint
? previewPointToXY(
previewPoint
)
: null;

if(
fromPoint
){
return fromPoint;
}

if(
previewXY &&
Number.isFinite(
previewXY.x
) &&
Number.isFinite(
previewXY.y
)
){
return previewXY;
}

return null;

}

function resolvePreviewAnchorPoint(
p1ForPosition =
null
){

const previewXY =
getPreviewXY();
const previewPoint =
getPreviewPoint();

if(
previewXY
){
const fromXY =
pointFromXY(
previewXY.x,
previewXY.y
);

if(
fromXY
){

if(
p1ForPosition
){
return {
time: fromXY.time,
price: p1ForPosition.price
};
}

return fromXY;

}

}

if(
previewPoint &&
Number.isFinite(
previewPoint.time
)
){

if(
p1ForPosition
){
return {
time: previewPoint.time,
price: p1ForPosition.price
};
}

return previewPoint;

}

return null;

}

function placementPointsNeeded(
type
){

if(
type ===
"channel"
){
return 3;
}

if(
type ===
"hray" ||
isPositionType(
type
)
){
return 1;
}

return 2;

}

function drawPlacementAnchorPoints(
ctx,
placementType,
placedPts
){

const needed =
placementPointsNeeded(
placementType
);
const preview =
resolvePreviewScreenXY();
const showPreview =
!!preview &&
placedPts.length <
needed;

if(
isPositionType(
placementType
)
){

if(
placedPts.length <
1
){

if(
showPreview
){
drawAnchorCircle(
ctx,
preview.x,
preview.y
);
}

return;

}

const p1 =
placedPts[
0
];
const p2 =
resolvePreviewAnchorPoint(
p1
) ||
defaultPositionP2(
p1
);
const levels =
initialPositionTpSl(
placementType,
p1.price
);

getPositionHandleScreens(
{
type: placementType,
p1,
p2,
tpPrice: levels.tpPrice,
slPrice: levels.slPrice
}
).forEach(
handle=>{
drawPositionAnchor(
ctx,
handle.x,
handle.y
);
}
);

return;

}

placedPts.forEach(
pt=>{

const xy =
toXY(
pt
);

if(
xy
){
drawAnchorCircle(
ctx,
xy.x,
xy.y
);
}

}
);

if(
showPreview
){
drawAnchorCircle(
ctx,
preview.x,
preview.y
);
}

}

function drawPlacementPreviewBody(
ctx,
w,
h,
placement
){

const previewPoint =
getPreviewPoint();
const previewXY =
getPreviewXY();
const style = baseDefaultStyle(placement.type);
const pts = placement.points;

if(placement.type === "channel"){

if(pts.length === 1){

const a = toXY(pts[0]);
const b = previewPointToXY(
previewPoint || (previewXY ? { _xy: previewXY } : null)
);

if(a && b){
drawLine(ctx, a.x, a.y, b.x, b.y, style.color, style.lineWidth);
}

return;

}

if(pts.length >= 2){

const a = toXY(pts[0]);
const b = toXY(pts[1]);

if(a && b){
drawLine(ctx, a.x, a.y, b.x, b.y, style.color, style.lineWidth);
}

const c = previewPoint
? previewPointToXY(previewPoint)
: previewXY;

if(c){
drawChannelAtXY(ctx, a, b, c, style.color, style.lineWidth);
}

}

return;

}

if(isPositionType(placement.type)){

if(pts.length >= 1){

const p1 =
pts[0];
const p2 =
resolvePreviewAnchorPoint(
p1
) ||
defaultPositionP2(
p1
);

const levels =
initialPositionTpSl(
placement.type,
p1.price
);

drawPosition(
ctx,
{
type: placement.type,
p1,
p2,
tpPrice: levels.tpPrice,
slPrice: levels.slPrice
},
false
);

}

return;

}

const previewXYPoint =
resolvePreviewScreenXY();

if(
!previewXYPoint
){
return;
}

if(
pts.length ===
1 &&
previewXYPoint &&
placement.type ===
"trendline"
){

const a =
toXY(
pts[
0
]
);

if(
a
){
drawLine(
ctx,
a.x,
a.y,
previewXYPoint.x,
previewXYPoint.y,
style.color,
style.lineWidth
);
}

return;

}

if(
pts.length ===
1 &&
previewXYPoint &&
placement.type ===
"arrow"
){

const a =
toXY(
pts[
0
]
);

if(
a
){
drawFilledArrow(
ctx,
a.x,
a.y,
previewXYPoint.x,
previewXYPoint.y,
style.color
);
}

return;

}

if(
pts.length ===
1 &&
previewXYPoint &&
placement.type ===
"rectangle"
){

const a =
toXY(
pts[
0
]
);

if(
a
){
drawRectangleShape(
ctx,
{
type: "rectangle",
p1: pts[0],
p2:
pointFromXY(
previewXYPoint.x,
previewXYPoint.y
) ||
pts[0],
color: style.color,
lineWidth: style.lineWidth,
lineStyle: style.lineStyle,
showFill: style.showFill,
fillColor: style.fillColor,
fillOpacity: style.fillOpacity,
showMedian: style.showMedian,
medianColor: style.medianColor,
medianLineWidth: style.medianLineWidth,
medianLineStyle: style.medianLineStyle
},
{
toXY,
shapeStyle:(s)=>({
color: s.color || style.color,
width: s.lineWidth || style.lineWidth,
dash: null
}),
parseDrawColor,
formatDrawColor
}
);
}

return;

}

if(
pts.length ===
1 &&
previewXYPoint &&
placement.type ===
"fib"
){

const a =
toXY(
pts[
0
]
);

if(
!a
){
return;
}

const stretchPx =
Math.hypot(
previewXYPoint.x - a.x,
previewXYPoint.y - a.y
);

if(
stretchPx <
12
){
return;
}

const previewAnchor =
resolvePreviewAnchorPoint() ||
pointFromXY(
previewXYPoint.x,
previewXYPoint.y
);

if(
!previewAnchor
){
return;
}

const previewShape =
{
type: placement.type,
color: style.color,
lineWidth: style.lineWidth,
fibLevels:
ensureFibLevelsVisible(
style.fibLevels
),
fibShowTrendLine: style.fibShowTrendLine,
p1: pts[0],
p2: previewAnchor
};

drawShape(
ctx,
previewShape,
w,
h,
true
);

return;

}

const previewPts = [...pts, previewPoint];

const previewShape =
{
type: placement.type,
color: style.color,
lineWidth: style.lineWidth,
fibLevels:
placement.type === "fib"
? ensureFibLevelsVisible(style.fibLevels)
: style.fibLevels,
fibShowTrendLine: style.fibShowTrendLine,
p1: previewPts[0],
p2: previewPts[1],
p3: previewPts[2],
time: previewPts[0]?.time,
price: previewPts[0]?.price
};

if(placement.type === "trendline" && previewPts.length >= 2){
drawShape(ctx, previewShape, w, h);
}

if(placement.type === "arrow" && previewPts.length >= 2){
drawShape(ctx, previewShape, w, h);
}

if(placement.type === "rectangle" && previewPts.length >= 2){
drawShape(ctx, previewShape, w, h);
}

if(placement.type === "hray" && previewPts.length >= 1){
drawShape(ctx, previewShape, w, h);
}

if(placement.type === "fib" && previewPts.length >= 2){
drawShape(ctx, previewShape, w, h, true);
}

}

function drawPlacementPreview(ctx, w, h){

const placement =
getPlacement();

if(
!placement
){
return;
}

drawPlacementPreviewBody(
ctx,
w,
h,
placement
);

drawPlacementAnchorPoints(
ctx,
placement.type,
placement.points
);

}

return {
drawLine,
drawShape,
drawFib,
drawPlacementPreview,
fibLevelXSpan
};

}
