import {
fibLevelDash,
normalizeFibLevelWidth,
ensureFibLevelsVisible,
formatFibLabel,
fibPriceAtRatio,
fibShapePriceAtRatio,
getFibDrawRows,
getFibFillPairs,
isSeriesLogarithmic,
fibLevelXSpan,
fibShapeLevelXSpan,
isFibType,
isFibExtType,
resolveFibTrendLineColor
} from "./fib-spec.js?v=17";

import {
isPositionType
} from "./position.js?v=11";

import {
drawFilledArrow,
drawRectangleShape
} from "./arrow-rect.js?v=2";

import {
drawFvpShape
} from "./fixed-volume-profile-draw.js?v=2";

import {
isFvpType,
copyFvpStyleToShape
} from "./fixed-volume-profile.js?v=3";

import {
drawBrushPath
} from "./brush.js?v=2";

import {
FIB_LINE_DASH,
isHorizPriceTool,
horizPriceLineX1
} from "./constants.js?v=13";

import {
channelLevelSegment,
ensureChannelLevelsVisible
} from "./channel-spec.js?v=2";

import {
isTextTool,
drawTextShape,
TEXT_DEFAULT_CONTENT
} from "./text.js?v=3";

import {
isElliottType,
isPattern12Draw,
elliottPointCount,
elliottScreenPoints,
elliottLabelAnchor,
elliottVertexLabel,
elliottNecklineScreen,
normalizePattern12TpFlags,
normalizePatternDashOpacity,
pattern12DashScreen,
pattern12TpTickLayout
} from "./elliott-spec.js?v=17";

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
getIsIdSelected = id=>
id ===
getSelectedId(),
getEditingTextId = ()=>
null,
parseDrawColor,
formatDrawColor,
getCandles = ()=>
[]
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

function drawFibTrendConnector(
ctx,
from,
to,
style,
width
){

if(
!from ||
!to
){
return;
}

drawLine(
ctx,
from.x,
from.y,
to.x,
to.y,
resolveFibTrendLineColor(
style?.fibTrendLineColor
),
Math.max(
1,
width ||
1
),
fibLevelDash(
"dashed"
)
);

}

function drawPattern12TpTicks(
ctx,
shape,
screens,
color,
width
){

const ticks =
pattern12TpTickLayout(
shape,
screens,
plotPriceToCoordinate,
isSeriesLogarithmic(
series
)
);

if(
!ticks.length
){
return;
}

const lineWidth =
Math.max(
1,
width ||
1
);
const opacityPct =
normalizePatternDashOpacity(
shape.patternDashOpacity
);

ctx.save();
ctx.globalAlpha =
opacityPct /
100;
ctx.strokeStyle =
color;
ctx.fillStyle =
color;
ctx.lineWidth =
lineWidth;
ctx.lineCap =
"round";
ctx.lineJoin =
"round";
ctx.setLineDash(
FIB_LINE_DASH.dotted
);
ctx.font =
"11px Arial";
ctx.textAlign =
"left";
ctx.textBaseline =
"middle";

for(
const tick of ticks
){

ctx.beginPath();
ctx.moveTo(
tick.x1,
tick.y
);
ctx.lineTo(
tick.x2,
tick.y
);
ctx.stroke();
ctx.fillText(
tick.label,
tick.x2 +
6,
tick.y
);

}

ctx.restore();

}

function drawElliottLabel(
ctx,
x,
y,
text,
color,
circled,
fontPx
){

const px =
Number.isFinite(
fontPx
) &&
fontPx >
0
? fontPx
: 13;

ctx.save();
ctx.font =
`600 ${px}px Arial, sans-serif`;
ctx.textAlign =
"center";
ctx.textBaseline =
"middle";

const metrics =
ctx.measureText(
text
);
const tw =
metrics.width ||
text.length *
px *
0.55;

if(
circled
){

const r =
Math.max(
px *
0.72,
tw /
2 +
px *
0.28
);

ctx.beginPath();
ctx.arc(
x,
y,
r,
0,
Math.PI *
2
);
ctx.strokeStyle =
color;
ctx.lineWidth =
Math.max(
1,
px /
10
);
ctx.stroke();

}

ctx.fillStyle =
color;
ctx.fillText(
text,
x,
y
);
ctx.restore();

}

function strokePatternSegment(
ctx,
a,
b,
color,
width,
dash,
opacityPct
){

if(
!a ||
!b
){
return;
}

ctx.save();
ctx.strokeStyle =
color;
ctx.lineWidth =
width ||
1;
ctx.lineJoin =
"round";
ctx.lineCap =
"round";

if(
opacityPct !=
null
){
ctx.globalAlpha =
normalizePatternDashOpacity(
opacityPct
) /
100;
}

ctx.setLineDash(
dash ||
[]
);
ctx.beginPath();
ctx.moveTo(
a.x,
a.y
);
ctx.lineTo(
b.x,
b.y
);
ctx.stroke();
ctx.restore();

}

function drawStrokeArrowHead(
ctx,
from,
to,
color,
width
){

const dx =
to.x -
from.x;
const dy =
to.y -
from.y;
const len =
Math.hypot(
dx,
dy
);

if(
len <
6
){
return;
}

const ux =
dx /
len;
const uy =
dy /
len;
const wx =
-uy;
const wy =
ux;
const head =
11 +
(width || 1) *
1.5;
const hw =
head *
0.38;

ctx.save();
ctx.fillStyle =
color;
ctx.beginPath();
ctx.moveTo(
to.x,
to.y
);
ctx.lineTo(
to.x -
ux *
head +
wx *
hw,
to.y -
uy *
head +
wy *
hw
);
ctx.lineTo(
to.x -
ux *
head -
wx *
hw,
to.y -
uy *
head -
wy *
hw
);
ctx.closePath();
ctx.fill();
ctx.restore();

}

function drawElliottWave(
ctx,
shape,
color,
width
){

const screens =
elliottScreenPoints(
shape,
toXY
);

if(
!screens.length
){
return;
}

if(
shape.showWave !==
false &&
screens.length >
1
){

ctx.save();
ctx.strokeStyle =
color;
ctx.lineWidth =
width ||
1;
ctx.lineJoin =
"round";
ctx.lineCap =
"round";
ctx.setLineDash(
[]
);
ctx.beginPath();
ctx.moveTo(
screens[
0
].x,
screens[
0
].y
);

for(
let i =
1;
i <
screens.length;
i++
){
ctx.lineTo(
screens[
i
].x,
screens[
i
].y
);
}

ctx.stroke();
ctx.restore();

const neck =
elliottNecklineScreen(
shape.type,
screens
);

if(
neck
){
strokePatternSegment(
ctx,
neck.a,
neck.b,
color,
width
);
}

if(
isPattern12Draw(
shape.type
) &&
screens.length >=
6
){
drawStrokeArrowHead(
ctx,
screens[
screens.length -
2
],
screens[
screens.length -
1
],
color,
width
);
}

}

if(
isPattern12Draw(
shape.type
) &&
shape.showPatternDash !==
false
){

const dash =
pattern12DashScreen(
screens
);

if(
dash
){
strokePatternSegment(
ctx,
dash.a,
dash.b,
color,
Math.max(
1,
(width || 1) *
0.9
),
[
7,
5
],
shape.patternDashOpacity
);
}

}

if(
isPattern12Draw(
shape.type
)
){
drawPattern12TpTicks(
ctx,
shape,
screens,
color,
width
);
}

screens.forEach(
(
pt,
i
)=>{

const label =
elliottVertexLabel(
shape,
i
);

if(
!label.text
){
return;
}

const anchor =
elliottLabelAnchor(
screens,
i
) ||
pt;

drawElliottLabel(
ctx,
anchor.x,
anchor.y,
label.text,
color,
label.circled,
label.fontPx
);

}
);

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
const c =
isFibExtType(
shape.type
)
? toXY(shape.p3)
: null;

if(
!a ||
!b
){
return;
}

if(
isFibExtType(
shape.type
) &&
!c
){

if(
shape.fibShowTrendLine ===
true
){
drawFibTrendConnector(
ctx,
a,
b,
shape,
width
);
}

return;
}

const span =
fibShapeLevelXSpan(
shape,
toXY,
plotW
);

if(
!span
){
return;
}

const {
x1,
x2,
labelX
} =
span;

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
fibShapePriceAtRatio(
shape,
pair.from.v,
useLog
);
const priceTo =
fibShapePriceAtRatio(
shape,
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
fibShapePriceAtRatio(
shape,
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

drawFibTrendConnector(
ctx,
a,
b,
shape,
width
);

if(
c
){
drawFibTrendConnector(
ctx,
b,
c,
shape,
width
);
}

}

}

function drawChannelAtXY(ctx, p1, p2, p3, color, width, levels){

if(!p1 || !p2 || !p3){
return;
}

const dx = p2.x - p1.x;
const dy = p2.y - p1.y;

const geom = {
p1,
p2,
p3,
p4: {
x: p3.x + dx,
y: p3.y + dy
}
};

const rows =
ensureChannelLevelsVisible(
levels
);

rows.forEach(
row=>{

if(
!row.enabled
){
return;
}

const seg =
channelLevelSegment(
geom,
row.v
);

if(
!seg
){
return;
}

const lineColor =
row.color ||
color;

drawLine(
ctx,
seg.start.x,
seg.start.y,
seg.end.x,
seg.end.y,
lineColor,
width
);

}
);

}

function drawChannel(ctx, shape, color, width){

const p1 = toXY(shape.p1);
const p2 = toXY(shape.p2);
const p3 = toXY(shape.p3);

drawChannelAtXY(
ctx,
p1,
p2,
p3,
color,
width,
shape.channelLevels
);

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

if(
isFvpType(
shape.type
)
){

drawFvpShape(
ctx,
shape,
{
toXY,
candles: getCandles()
}
);

}

if(isHorizPriceTool(shape.type)){

const anchor = toXY({
time: shape.time,
price: shape.price
});

if(anchor){
drawLine(
ctx,
horizPriceLineX1(
shape.type,
anchor.x
),
anchor.y,
w,
anchor.y,
color,
width,
dash
);
}

}

if(isTextTool(shape.type)){

drawTextShape(
ctx,
shape,
toXY,
{
selected:
getIsIdSelected(
shape.id
),
hideGlyph:
shape.id &&
shape.id ===
getEditingTextId()
}
);

}

if(
isFibType(
shape.type
)
){
drawFib(ctx, shape, color, width, w);
}

if(shape.type === "channel"){
drawChannel(ctx, shape, color, width);
}

if(
isElliottType(
shape.type
)
){
drawElliottWave(
ctx,
shape,
color,
width
);
}

if(isPositionType(shape.type)){
drawPosition(
ctx,
shape,
getIsIdSelected(
shape.id
)
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
"channel" ||
isFibExtType(
type
)
){
return 3;
}

if(
isElliottType(
type
)
){
return elliottPointCount(
type
);
}

if(
isHorizPriceTool(
type
) ||
isPositionType(
type
) ||
isTextTool(
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
drawChannelAtXY(
ctx,
a,
b,
c,
style.color,
style.lineWidth,
style.channelLevels
);
}

}

return;

}

if(
isFibExtType(
placement.type
)
){

if(pts.length === 1){

const a = toXY(pts[0]);
const b = previewPointToXY(
previewPoint || (previewXY ? { _xy: previewXY } : null)
);

if(a && b){
drawFibTrendConnector(
ctx,
a,
b,
style,
style.lineWidth
);
}

return;

}

if(pts.length >= 2){

const previewAnchor =
resolvePreviewAnchorPoint() ||
(
previewXY
? pointFromXY(
previewXY.x,
previewXY.y
)
: null
);
const p3 =
pts[2] ||
previewAnchor;

if(
p3
){

drawShape(
ctx,
{
type: "fib-ext",
color: style.color,
lineWidth: style.lineWidth,
fibLevels: ensureFibLevelsVisible(
style.fibLevels,
"fib-ext"
),
fibShowTrendLine:
style.fibShowTrendLine !==
false,
fibTrendLineColor: style.fibTrendLineColor,
p1: pts[0],
p2: pts[1],
p3
},
w,
h,
true
);

}else{

const a =
toXY(
pts[0]
);
const b =
toXY(
pts[1]
);

drawFibTrendConnector(
ctx,
a,
b,
style,
style.lineWidth
);

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
isFvpType(
placement.type
)
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

const previewShape =
{
type: "fvp",
p1: pts[0],
p2:
pointFromXY(
previewXYPoint.x,
previewXYPoint.y
) ||
pts[0]
};

copyFvpStyleToShape(
previewShape,
style
);
drawFvpShape(
ctx,
previewShape,
{
toXY,
candles: getCandles()
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
fibTrendLineColor: style.fibTrendLineColor,
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
isFibType(
placement.type
)
? ensureFibLevelsVisible(
style.fibLevels,
placement.type
)
: style.fibLevels,
fibShowTrendLine: style.fibShowTrendLine,
fibTrendLineColor: style.fibTrendLineColor,
p1: previewPts[0],
p2: previewPts[1],
p3: previewPts[2],
time: previewPts[0]?.time,
price: previewPts[0]?.price,
text:
placement.type ===
"text"
? TEXT_DEFAULT_CONTENT
: undefined,
fontSize: style.fontSize
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

if(
isFvpType(
placement.type
) &&
previewPts.length >=
2
){
copyFvpStyleToShape(
previewShape,
style
);
drawShape(ctx, previewShape, w, h);
}

if(isHorizPriceTool(placement.type) && previewPts.length >= 1){
drawShape(ctx, previewShape, w, h);
}

if(isTextTool(placement.type) && previewPts.length >= 1){
drawShape(ctx, previewShape, w, h);
}

if(placement.type === "fib" && previewPts.length >= 2){
drawShape(ctx, previewShape, w, h, true);
}

if(
isFibExtType(
placement.type
) &&
previewPts.length >=
3
){
drawShape(ctx, previewShape, w, h, true);
}

if(
isElliottType(
placement.type
) &&
previewPts.length >=
1
){

const elliottPts =
previewPts.filter(
Boolean
);

drawShape(
ctx,
{
type: placement.type,
color: style.color,
lineWidth: style.lineWidth,
degree: style.degree,
degreeJunior: style.degreeJunior,
showWave: style.showWave !==
false,
showPatternDash: style.showPatternDash !==
false,
patternDashOpacity: style.patternDashOpacity,
...normalizePattern12TpFlags(
style.showTpSenior,
style.showTpJunior
),
tpLevels: style.tpLevels,
points: elliottPts,
p1: elliottPts[0],
p2: elliottPts[
elliottPts.length -
1
]
},
w,
h
);

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
