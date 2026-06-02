import {
distToSegment
} from "./math.js?v=1";

import {
fibPriceAtRatio,
getFibRows,
isSeriesLogarithmic,
fibLevelXSpan
} from "./fib-spec.js?v=9";

import {
FIB_HIT_X_PAD_PX
} from "./constants.js?v=5";

/**
 * @param {object} deps
 * @returns {object} hit-test helpers
 */
export function createDrawHitTester(deps){

const {
toXY,
getPlotWidth,
series,
pointFromXY
} = deps;

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
anchor.x,
anchor.y,
getPlotWidth(),
anchor.y
);

}

function hitTestHrayLine(px, py, shape, threshold = 8){

if(
shape?.type !== "hray"
){
return false;
}

return hrayLineDist(px, py, shape) <= threshold;

}

function trendlineBodyDist(px, py, shape){

if(
shape?.type !== "trendline"
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
shape?.type === "trendline" &&
trendlineBodyDist(px, py, shape) <= threshold
);

}

function fibBodyDist(px, py, shape){

if(
shape?.type !== "fib"
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

let dist = Infinity;

const useLog =
isSeriesLogarithmic(series);

const plotW =
getPlotWidth();

const {
x1,
x2,
collapsed
} =
fibLevelXSpan(
a,
b,
plotW
);

if(
!collapsed
){

getFibRows(shape).forEach(row=>{

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

if(!Number.isFinite(price)){
return;
}

const y =
series.priceToCoordinate(price);

if(
y != null &&
px >= x1 - FIB_HIT_X_PAD_PX &&
px <= x2 + FIB_HIT_X_PAD_PX
){
dist = Math.min(
dist,
Math.abs(py - y)
);
}

});

}

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

}

return dist;

}

function hitTestFibBody(px, py, shape, threshold = 8){

return (
shape?.type === "fib" &&
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

return {
hrayLineDist,
hitTestHrayLine,
trendlineBodyDist,
hitTestTrendlineBody,
fibBodyDist,
hitTestFibBody,
channelP4XY,
channelScreenGeometry,
channelP4Point,
channelBodyDist,
hitTestChannelBody
};

}
