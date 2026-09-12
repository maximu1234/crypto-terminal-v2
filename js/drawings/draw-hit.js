import {
distToSegment,
normalizeScreenRect,
segmentIntersectsScreenRect,
screenRectsIntersect,
pointInScreenRect
} from "./math.js?v=2";

import {
brushBodyDist as brushStrokeBodyDist,
brushPathScreenPoints
} from "./brush.js?v=2";

import {
rectangleBodyDist,
rectangleScreenBox
} from "./arrow-rect.js?v=2";

import {
fvpBodyDist,
fvpScreenBox,
isFvpType
} from "./fixed-volume-profile.js?v=3";

import {
isPositionType,
positionXBounds
} from "./position.js?v=11";

import {
fibPriceAtRatio,
fibShapePriceAtRatio,
getFibRows,
isSeriesLogarithmic,
fibLevelXSpan,
fibShapeLevelXSpan,
isFibType,
isFibExtType
} from "./fib-spec.js?v=17";

import {
FIB_HIT_X_PAD_PX,
FIB_HIT_X_PAD_DESKTOP_PX,
DRAW_BODY_HIT_THRESHOLD_TOUCH,
DRAW_BODY_HIT_THRESHOLD_DESKTOP,
isHorizPriceTool,
horizPriceLineX1
} from "./constants.js?v=13";

import {
isCoarseTouchViewport
} from "../chart/chart-options.js?v=7";

import {
hitTestTextBody,
isTextTool,
measureTextBox
} from "./text.js?v=3";

import {
channelLevelSegment,
getChannelDrawRows
} from "./channel-spec.js?v=1";

import {
isElliottType,
elliottScreenPoints,
elliottLabelAnchor,
elliottVertexLabel,
elliottNecklineScreen,
pattern12DashScreen,
pattern12TpTickLayout,
isPattern12Draw
} from "./elliott-spec.js?v=12";

/**
 * @param {object} deps
 * @returns {object} hit-test helpers
 */
export function createDrawHitTester(deps){

const {
toXY,
getPlotWidth,
series,
pointFromXY,
getCandles = ()=>
[],
plotPriceToCoordinate
} = deps;

function fibHitXPadPx(){

return isCoarseTouchViewport()
? FIB_HIT_X_PAD_PX
: FIB_HIT_X_PAD_DESKTOP_PX;

}

function hrayLineDist(px, py, shape){

const anchor = toXY({
time: shape.time,
price: shape.price
});

if(!anchor){
return Infinity;
}

return distToSegment(
px,
py,
horizPriceLineX1(
shape.type,
anchor.x
),
anchor.y,
getPlotWidth(),
anchor.y
);

}

function hitTestHrayLine(px, py, shape, threshold = 8){

if(
!isHorizPriceTool(
shape?.type
)
){
return false;
}

return hrayLineDist(px, py, shape) <= threshold;

}

function trendlineBodyDist(px, py, shape){

if(
shape?.type !== "trendline" &&
shape?.type !== "arrow"
){
return Infinity;
}

const a =
toXY(shape.p1);
const b =
toXY(shape.p2);

if(!a || !b){
return Infinity;
}

return distToSegment(
px,
py,
a.x,
a.y,
b.x,
b.y
);

}

function hitTestTrendlineBody(px, py, shape, threshold = 8){

return (
(
shape?.type === "trendline" ||
shape?.type === "arrow"
) &&
trendlineBodyDist(px, py, shape) <= threshold
);

}

function brushBodyDist(px, py, shape){

if(
shape?.type !==
"brush"
){
return Infinity;
}

return brushStrokeBodyDist(
px,
py,
shape,
toXY
);

}

function hitTestBrushBody(px, py, shape, threshold = 8){

return (
shape?.type ===
"brush" &&
brushBodyDist(px, py, shape) <= threshold
);

}

function fibBodyDist(px, py, shape){

if(
!isFibType(
shape?.type
)
){
return Infinity;
}

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
!b ||
(
isFibExtType(
shape.type
) &&
!c
)
){
return Infinity;
}

let dist = Infinity;

const useLog =
isSeriesLogarithmic(series);

const plotW =
getPlotWidth();

const span =
fibShapeLevelXSpan(
shape,
toXY,
plotW
);

if(
!span
){
return Infinity;
}

const {
x1,
x2
} =
span;

getFibRows(shape).forEach(row=>{

if(!row.enabled){
return;
}

const price =
fibShapePriceAtRatio(
shape,
row.v,
useLog
);

if(!Number.isFinite(price)){
return;
}

const y =
series.priceToCoordinate(price);

if(
y != null &&
px >= x1 - fibHitXPadPx() &&
px <= x2 + fibHitXPadPx()
){
dist = Math.min(
dist,
Math.abs(py - y)
);
}

});

if(
shape.fibShowTrendLine === true
){

dist = Math.min(
dist,
distToSegment(
px,
py,
a.x,
a.y,
b.x,
b.y
)
);

if(
c
){
dist = Math.min(
dist,
distToSegment(
px,
py,
b.x,
b.y,
c.x,
c.y
)
);
}

}

return dist;

}

function hitTestFibBody(px, py, shape, threshold = 8){

return (
isFibType(
shape?.type
) &&
fibBodyDist(px, py, shape) <= threshold
);

}

function channelP4XY(
p1,
p2,
p3
){

if(
!p1 ||
!p2 ||
!p3
){
return null;
}

return {
x: p3.x + (p2.x - p1.x),
y: p3.y + (p2.y - p1.y)
};

}

function channelScreenGeometry(
shape
){

const p1 =
toXY(
shape.p1
);
const p2 =
toXY(
shape.p2
);
const p3 =
toXY(
shape.p3
);

if(
!p1 ||
!p2 ||
!p3
){
return null;
}

const p4 =
channelP4XY(
p1,
p2,
p3
);

if(
!p4
){
return null;
}

return {
p1,
p2,
p3,
p4,
edgeMidA: {
x: (p1.x + p2.x) / 2,
y: (p1.y + p2.y) / 2
},
edgeMidB: {
x: (p3.x + p4.x) / 2,
y: (p3.y + p4.y) / 2
},
midStart: {
x: (p1.x + p3.x) / 2,
y: (p1.y + p3.y) / 2
},
midEnd: {
x: (p2.x + p4.x) / 2,
y: (p2.y + p4.y) / 2
}
};

}

function channelP4Point(
shape
){

const geom =
channelScreenGeometry(
shape
);

if(
!geom?.p4
){
return null;
}

return pointFromXY(
geom.p4.x,
geom.p4.y
);

}

function channelBodyDist(px, py, shape){

if(
shape?.type !==
"channel"
){
return Infinity;
}

const geom =
channelScreenGeometry(
shape
);

if(
!geom
){
return Infinity;
}

const rows =
getChannelDrawRows(
shape
);

let best =
Infinity;

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

best =
Math.min(
best,
distToSegment(
px,
py,
seg.start.x,
seg.start.y,
seg.end.x,
seg.end.y
)
);

}
);

if(
Number.isFinite(
best
)
){
return best;
}

return Math.min(
distToSegment(
px,
py,
geom.p1.x,
geom.p1.y,
geom.p2.x,
geom.p2.y
),
distToSegment(
px,
py,
geom.p3.x,
geom.p3.y,
geom.p4.x,
geom.p4.y
),
distToSegment(
px,
py,
geom.midStart.x,
geom.midStart.y,
geom.midEnd.x,
geom.midEnd.y
)
);

}

function hitTestChannelBody(px, py, shape, threshold = 8){

return (
shape?.type === "channel" &&
channelBodyDist(px, py, shape) <= threshold
);

}

function elliottBodyDist(px, py, shape){

if(
!isElliottType(
shape?.type
)
){
return Infinity;
}

const screens =
elliottScreenPoints(
shape,
toXY
);

if(
!screens.length
){
return Infinity;
}

let best =
Infinity;

if(
shape.showWave !==
false
){

for(
let i =
1;
i <
screens.length;
i++
){

const a =
screens[
i -
1
];
const b =
screens[
i
];

best =
Math.min(
best,
distToSegment(
px,
py,
a.x,
a.y,
b.x,
b.y
)
);

}

}

const neck =
elliottNecklineScreen(
shape.type,
screens
);

if(
neck &&
shape.showWave !==
false
){
best =
Math.min(
best,
distToSegment(
px,
py,
neck.a.x,
neck.a.y,
neck.b.x,
neck.b.y
)
);
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
best =
Math.min(
best,
distToSegment(
px,
py,
dash.a.x,
dash.a.y,
dash.b.x,
dash.b.y
)
);
}

}

if(
isPattern12Draw(
shape.type
)
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

for(
const tick of ticks
){

best =
Math.min(
best,
distToSegment(
px,
py,
tick.x1,
tick.y,
tick.x2 +
28,
tick.y
)
);

}

}

screens.forEach(
(
pt,
i
)=>{

best =
Math.min(
best,
Math.hypot(
px -
pt.x,
py -
pt.y
)
);

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

best =
Math.min(
best,
Math.hypot(
px -
anchor.x,
py -
anchor.y
)
);

}
);

return best;

}

function hitTestElliottBody(px, py, shape, threshold = 8){

return (
isElliottType(
shape?.type
) &&
elliottBodyDist(
px,
py,
shape
) <=
threshold
);

}

function hitTestRectangleBody(
px,
py,
shape,
threshold = 8
){

return (
shape?.type ===
"rectangle" &&
rectangleBodyDist(
px,
py,
shape,
toXY
) <=
threshold
);

}

function hitTestFvpBody(
px,
py,
shape,
threshold = 8
){

return (
isFvpType(
shape?.type
) &&
fvpBodyDist(
px,
py,
shape,
toXY,
getCandles()
) <=
threshold
);

}

function anySegmentHitsRect(
pts,
rect
){

for(
let i =
1;
i <
pts.length;
i++
){

const a =
pts[
i -
1
];
const b =
pts[
i
];

if(
!a ||
!b
){
continue;
}

if(
segmentIntersectsScreenRect(
a.x,
a.y,
b.x,
b.y,
rect
)
){
return true;
}

}

return false;

}

function boxHitsRect(
box,
rect
){

if(
!box
){
return false;
}

return screenRectsIntersect(
{
left: box.left,
right: box.right,
top: box.top,
bottom: box.bottom
},
rect
);

}

function shapeIntersectsMarquee(
shape,
rect
){

if(
!shape ||
!rect
){
return false;
}

if(
shape.type ===
"trendline" ||
shape.type ===
"arrow"
){

const a =
toXY(
shape.p1
);
const b =
toXY(
shape.p2
);

return !!(
a &&
b &&
segmentIntersectsScreenRect(
a.x,
a.y,
b.x,
b.y,
rect
)
);

}

if(
shape.type ===
"brush"
){

return anySegmentHitsRect(
brushPathScreenPoints(
shape,
toXY
),
rect
);

}

if(
isHorizPriceTool(
shape.type
)
){

const anchor =
toXY({
time: shape.time,
price: shape.price
});

if(
!anchor
){
return false;
}

return segmentIntersectsScreenRect(
horizPriceLineX1(
shape.type,
anchor.x
),
anchor.y,
getPlotWidth(),
anchor.y,
rect
);

}

if(
isFibType(
shape.type
)
){

const a =
toXY(
shape.p1
);
const b =
toXY(
shape.p2
);
const c =
isFibExtType(
shape.type
)
? toXY(
shape.p3
)
: null;

if(
!a ||
!b ||
(
isFibExtType(
shape.type
) &&
!c
)
){
return false;
}

if(
shape.fibShowTrendLine ===
true &&
(
segmentIntersectsScreenRect(
a.x,
a.y,
b.x,
b.y,
rect
) ||
(
c &&
segmentIntersectsScreenRect(
b.x,
b.y,
c.x,
c.y,
rect
)
)
)
){
return true;
}

const plotW =
getPlotWidth();
const span =
fibShapeLevelXSpan(
shape,
toXY,
plotW
);

if(
!span
){
return false;
}

const {
x1,
x2
} =
span;
const useLog =
isSeriesLogarithmic(
series
);

return getFibRows(
shape
).some(
row=>{

if(
!row.enabled
){
return false;
}

const price =
fibShapePriceAtRatio(
shape,
row.v,
useLog
);

if(
!Number.isFinite(
price
)
){
return false;
}

const y =
series.priceToCoordinate(
price
);

return (
y !=
null &&
segmentIntersectsScreenRect(
x1,
y,
x2,
y,
rect
)
);

}
);

}

if(
shape.type ===
"channel"
){

const geom =
channelScreenGeometry(
shape
);

if(
!geom
){
return false;
}

const rows =
getChannelDrawRows(
shape
);

for(
const row of rows
){

if(
!row.enabled
){
continue;
}

const seg =
channelLevelSegment(
geom,
row.v
);

if(
seg &&
segmentIntersectsScreenRect(
seg.start.x,
seg.start.y,
seg.end.x,
seg.end.y,
rect
)
){
return true;
}

}

return (
segmentIntersectsScreenRect(
geom.p1.x,
geom.p1.y,
geom.p2.x,
geom.p2.y,
rect
) ||
segmentIntersectsScreenRect(
geom.p3.x,
geom.p3.y,
geom.p4.x,
geom.p4.y,
rect
)
);

}

if(
isElliottType(
shape.type
)
){

const screens =
elliottScreenPoints(
shape,
toXY
);

if(
anySegmentHitsRect(
screens,
rect
)
){
return true;
}

return screens.some(
pt=>
pointInScreenRect(
pt.x,
pt.y,
rect
)
);

}

if(
shape.type ===
"rectangle"
){

return boxHitsRect(
rectangleScreenBox(
shape,
toXY
),
rect
);

}

if(
isFvpType(
shape.type
)
){

const box =
fvpScreenBox(
shape,
toXY,
getCandles()
);

if(
!box
){
return false;
}

return boxHitsRect(
{
left: box.left,
right: box.right,
top: box.top,
bottom: box.bottom
},
rect
);

}

if(
isTextTool(
shape.type
)
){

const anchor =
toXY({
time: shape.time,
price: shape.price
});
const box =
measureTextBox(
null,
shape,
anchor
);

if(
!box
){
return false;
}

return boxHitsRect(
{
left: box.x,
right: box.x + box.w,
top: box.y,
bottom: box.y + box.h
},
rect
);

}

if(
isPositionType(
shape.type
)
){

const box =
positionXBounds(
shape,
toXY
);

if(
!box
){
return false;
}

const yTp =
series.priceToCoordinate(
shape.tpPrice
);
const ySl =
series.priceToCoordinate(
shape.slPrice
);

if(
yTp ==
null ||
ySl ==
null
){
return false;
}

const top =
Math.min(
yTp,
ySl,
box.yEntry
);
const bottom =
Math.max(
yTp,
ySl,
box.yEntry
);

return boxHitsRect(
{
left: box.x1,
right: box.x2,
top,
bottom
},
rect
);

}

return false;

}

function drawingsIntersectingRect(
drawings,
x1,
y1,
x2,
y2
){

const rect =
normalizeScreenRect(
x1,
y1,
x2,
y2
);

if(
rect.right -
rect.left <
0.5 &&
rect.bottom -
rect.top <
0.5
){
return [];
}

const ids =
[];

for(
const shape of drawings ||
[]
){

if(
shapeIntersectsMarquee(
shape,
rect
)
){
ids.push(
shape.id
);
}

}

return ids;

}

return {
hrayLineDist,
hitTestHrayLine,
trendlineBodyDist,
hitTestTrendlineBody,
brushBodyDist,
hitTestBrushBody,
fibBodyDist,
hitTestFibBody,
channelP4XY,
channelScreenGeometry,
channelP4Point,
channelBodyDist,
hitTestChannelBody,
elliottBodyDist,
hitTestElliottBody,
rectangleBodyDist,
hitTestRectangleBody,
fvpBodyDist,
hitTestFvpBody,
hitTestTextBody,
shapeIntersectsMarquee,
drawingsIntersectingRect,
drawBodyHitThreshold(){
return isCoarseTouchViewport()
? DRAW_BODY_HIT_THRESHOLD_TOUCH
: DRAW_BODY_HIT_THRESHOLD_DESKTOP;
}
};

}
