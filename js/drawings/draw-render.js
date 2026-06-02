import {
fibLevelDash,
normalizeFibLevelWidth,
ensureFibLevelsVisible,
formatFibLabel,
fibPriceAtRatio,
getFibDrawRows,
isSeriesLogarithmic,
fibLevelXSpan
} from "./fib-spec.js?v=8";

import {
isPositionType
} from "./position.js?v=1";

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
getPlacement,
getPreviewPoint,
getPreviewXY,
getSelectedId
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
plotW,
fibPlacementPreview =
false
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
labelX,
collapsed
} =
fibLevelXSpan(
a,
b,
plotW,
!fibPlacementPreview
);

const useLog =
isSeriesLogarithmic(
series
);

if(
!collapsed
){

getFibDrawRows(
shape
).forEach(row=>{

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

}

if(
shape.fibShowTrendLine === true
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
drawFib(ctx, shape, color, width, w, fibPlacementPreview);
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

function drawPlacementPreview(ctx, w, h){

const placement =
getPlacement();
const previewPoint =
getPreviewPoint();
const previewXY =
getPreviewXY();

if(!placement){
return;
}

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
let p2 =
defaultPositionP2(p1);

if(previewPoint){
p2 = {
time: previewPoint.time,
price: p1.price
};
}

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

if(!previewPoint){
return;
}

const previewXYPoint =
previewPointToXY(
previewPoint
);

if(
pts.length ===
0 &&
previewXYPoint &&
(
placement.type ===
"trendline" ||
placement.type ===
"fib"
)
){

drawAnchorCircle(
ctx,
previewXYPoint.x,
previewXYPoint.y
);

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

drawAnchorCircle(
ctx,
a.x,
a.y
);

return;

}

const previewAnchor =
previewPoint &&
Number.isFinite(previewPoint.time) &&
Number.isFinite(previewPoint.price)
? previewPoint
: pointFromXY(
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

if(placement.type === "hray" && previewPts.length >= 1){
drawShape(ctx, previewShape, w, h);
}

if(placement.type === "fib" && previewPts.length >= 2){
drawShape(ctx, previewShape, w, h, true);
}

}

return {
drawShape,
drawFib,
drawPlacementPreview,
fibLevelXSpan
};

}
