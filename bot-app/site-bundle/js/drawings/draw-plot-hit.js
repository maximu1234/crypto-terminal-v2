/**
 * Closure slice. `host` is the surrounding function's bindings.
 */
export function timeFromX(host, x){

const ts =
host.coordChart.timeScale();
const candles =
host.candleSeries();

if(
candles.length >=
2
){

const first =
candles[
0
];
const second =
candles[
1
];
const prev =
candles[
candles.length - 2
];
const last =
candles[
candles.length - 1
];

const head =
host.segmentX(
ts,
first.time,
second.time
);

if(
head &&
head.dt >
0 &&
x <
Math.min(
head.x0,
head.x1
) -
0.5
){

const ratio =
(x - head.x0) /
(head.x1 - head.x0);

return (
first.time +
ratio *
head.dt
);

}

const tail =
host.segmentX(
ts,
prev.time,
last.time
);

if(
tail &&
tail.dt >
0 &&
x >
Math.max(
tail.x0,
tail.x1
) +
0.5
){

const ratio =
(x - tail.x1) /
(tail.x1 - tail.x0);

return (
last.time +
ratio *
tail.dt
);

}

}

let time =
host.normalizeTime(
ts.coordinateToTime(
x
)
);

if(
time !=
null
){

return time;

}

if(
candles.length <
2
){
return null;
}

for(
let i =
0;
i <
candles.length - 1;
i++
){

const seg =
host.segmentX(
ts,
candles[
i
].time,
candles[
i + 1
].time
);

if(
!seg ||
seg.dt <=
0
){
continue;
}

const minX =
Math.min(
seg.x0,
seg.x1
);
const maxX =
Math.max(
seg.x0,
seg.x1
);

if(
x >=
minX &&
x <=
maxX
){
const ratio =
(x - seg.x0) /
(seg.x1 - seg.x0);
return (
candles[
i
].time +
ratio *
seg.dt
);
}

}

return null;

}

export function manualPriceToCoordinate(host, 
price
){

const s =
host.manualPriceScaleDrag;

if(
!s ||
!Number.isFinite(
price
)
){
return null;
}

const {
minPrice,
maxPrice,
top,
bottom,
h
} =
s;

const plotTop =
h * top;

const plotHeight =
h * (
1 - top - bottom
);

if(
plotHeight <=
0
){
return null;
}

const inverted =
s.inverted;

if(
s.logarithmic &&
minPrice >
0 &&
maxPrice >
0 &&
price >
0
){

const logMin =
Math.log(
minPrice
);

const logMax =
Math.log(
maxPrice
);

const logSpan =
logMax - logMin;

if(
!Number.isFinite(logSpan) ||
logSpan ===
0
){
return null;
}

const logP =
Math.log(
price
);

const ratio =
inverted
? (
logP - logMin
) / logSpan
: (
logMax - logP
) / logSpan;

return plotTop + ratio * plotHeight;

}

const span =
maxPrice - minPrice;

if(
!Number.isFinite(span) ||
span ===
0
){
return null;
}

const ratio =
inverted
? (
price - minPrice
) / span
: (
maxPrice - price
) / span;

return plotTop + ratio * plotHeight;

}

export function plotCoordinateToPrice(host, 
py
){

if(
!Number.isFinite(
py
)
){
return null;
}

if(
host.priceScaleDragActive &&
host.manualPriceScaleDrag
){

const s =
host.manualPriceScaleDrag;

const {
minPrice,
maxPrice,
top,
bottom,
h,
inverted,
logarithmic
} =
s;

const plotTop =
h * top;

const plotHeight =
h * (
1 - top - bottom
);

if(
plotHeight <=
0
){
return null;
}

const ratio =
(py - plotTop) /
plotHeight;

if(
logarithmic &&
minPrice >
0 &&
maxPrice >
0
){

const logMin =
Math.log(
minPrice
);

const logMax =
Math.log(
maxPrice
);

const logSpan =
logMax - logMin;

if(
!Number.isFinite(
logSpan
) ||
logSpan ===
0
){
return null;
}

const logP =
inverted
? logMin +
ratio *
logSpan
: logMax -
ratio *
logSpan;

const price =
Math.exp(
logP
);

return Number.isFinite(
price
)
? price
: null;

}

const span =
maxPrice - minPrice;

if(
!Number.isFinite(
span
) ||
span ===
0
){
return null;
}

const price =
inverted
? minPrice +
ratio *
span
: maxPrice -
ratio *
span;

return Number.isFinite(
price
)
? price
: null;

}

return host.series.coordinateToPrice(
py
);

}

export function resolvePointFromPlotXY(host, 
px,
py,
prev = null,
optEvent = null
){

const magnetActive =
host.enableMagnet &&
(
host.drawMagnetKeyDown ||
optEvent?.metaKey ===
true
);

if(
magnetActive
){

const snap =
host.snapPlotToCandleWick({
plotX: px,
plotY: py,
candles: host.candleSeries(),
timeFromX: (...a)=>timeFromX(host, ...a),
xFromTime: host.xFromTime,
priceToPlotY: host.plotPriceToCoordinate
});

if(
snap
){
return {
time: snap.time,
price: snap.price
};
}

}

const price =
plotCoordinateToPrice(host, 
py
);
const time =
timeFromX(host, 
px
);

if(
price !=
null &&
Number.isFinite(
price
) &&
time !=
null
){
return {
time,
price
};
}

if(
!prev
){
return null;
}

const merged = {
time:
time ??
prev.time,
price:
price !=
null &&
Number.isFinite(
price
)
? price
: prev.price
};

if(
merged.time ==
null ||
merged.price ==
null ||
!Number.isFinite(
merged.price
)
){
return null;
}

return merged;

}

export function hitTest(host, px, py){

if(
host.drawingsHidden
){
return null;
}

const bodyThreshold =
host.drawBodyHitThreshold();

for(
let i =
host.drawings.length -
1;
i >=
0;
i--
){

const d =
host.drawings[
i
];

if(
host.hitTestHandle(
px,
py,
d
)
){
return d.id;
}

}

let best = null;
let bestDist = bodyThreshold;

host.drawings.forEach(d=>{

let dist = Infinity;

if(
d.type === "trendline" ||
d.type === "arrow"
){

dist = host.trendlineBodyDist(px, py, d);

}

if(
d.type ===
"rectangle"
){

dist = host.rectangleBodyDist(
px,
py,
d,
host.toXY
);

}

if(
host.isFvpType(
d.type
)
){

dist = host.fvpBodyDist(
px,
py,
d,
host.toXY,
host.getCandles?.() ||
[]
);

}

if(host.isHorizPriceTool(d.type)){

const anchor = host.toXY({
time: d.time,
price: d.price
});

if(anchor){
dist = host.distToSegment(
px,
py,
host.horizPriceLineX1(
d.type,
anchor.x
),
anchor.y,
host.getPlotWidth(),
anchor.y
);
}

}

if(
host.isFibType(
d.type
)
){

dist = host.fibBodyDist(px, py, d);

}
if(d.type === "channel"){

dist = host.channelBodyDist(px, py, d);

}

if(
host.isElliottType(
d.type
)
){

dist = host.elliottBodyDist(
px,
py,
d
);

}

if(d.type === "brush"){

dist = host.brushBodyDist(px, py, d);

}

if(host.isTextTool(d.type)){

dist =
host.hitTestTextBody(
px,
py,
d,
host.toXY
)
? 0
: Infinity;

}

if(host.isPositionType(d.type)){

dist = host.positionBodyDist(px, py, d);

}

if(dist < bestDist){
bestDist = dist;
best = d.id;
}

});

return best;

}
