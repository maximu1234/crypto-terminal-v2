/**
 * iPad: вертикальный зум и двойной тап по правой шкале.
 * LW на iOS не масштабирует price axis touch — autoscaleInfoProvider + touch на strip.
 */

const DBL_TAP_MS =
400;

const DBL_TAP_PX =
36;

const ZOOM_SENSITIVITY =
0.004;

function isLogScale(
chart
){

try{
return chart.priceScale(
"right"
).options().mode ===
1;
}catch{
return true;
}

}

function captureRangeFromChart(
chart,
series,
chartEl,
margins,
getFallbackPriceRange
){

const h =
Math.max(
1,
chartEl.clientHeight ||
0
);

const top =
margins?.top ??
0.12;

const bottom =
margins?.bottom ??
0.12;

const plotTop =
h * top;

const plotBottom =
h * (
1 - bottom
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
priceAtTop !=
null &&
priceAtBottom !=
null
){

return {
min:Math.min(
priceAtTop,
priceAtBottom
),
max:Math.max(
priceAtTop,
priceAtBottom
)
};

}

return getFallbackPriceRange?.() ||
null;

}

function zoomRange(
range,
dy,
logScale
){

const factor =
Math.exp(
dy * ZOOM_SENSITIVITY
);

if(
logScale &&
range.min >
0 &&
range.max >
0
){

const logMin =
Math.log(
range.min
);

const logMax =
Math.log(
range.max
);

const logMid =
(
logMin + logMax
) /
2;

const logHalf =
(
logMax - logMin
) /
2;

const newHalf =
logHalf / factor;

return {
min:Math.exp(
logMid - newHalf
),
max:Math.exp(
logMid + newHalf
)
};

}

const mid =
(
range.min + range.max
) /
2;

const half =
(
range.max - range.min
) /
2;

const newHalf =
half / factor;

return {
min:mid - newHalf,
max:mid + newHalf
};

}

/**
 * @param {object} opts
 */
export function mountTabletPriceScaleGesture({
chart,
series,
chartEl,
stripEl,
margins,
resetPriceAutoScale,
isTabletViewport,
getFallbackPriceRange,
callbacks = {}
}){

if(
!chart ||
!series ||
!chartEl ||
!stripEl ||
typeof isTabletViewport !==
"function" ||
!isTabletViewport()
){
return ()=>{};
}

const onInteraction =
callbacks.onInteraction ||
(()=>{});
const onDragStart =
callbacks.onDragStart ||
(()=>{});
const onDragEnd =
callbacks.onDragEnd ||
(()=>{});
const onScaleFrame =
callbacks.onScaleFrame ||
(()=>{});
const onReset =
callbacks.onReset ||
(()=>{});

let priceZoomRange =
null;

let providerInstalled =
false;

let activeTouchId =
null;

let lastClientY =
0;

let didDrag =
false;

let lastTapEnd =
null;

function payload(){

if(
!priceZoomRange
){
return null;
}

return {
min:priceZoomRange.min,
max:priceZoomRange.max
};

}

function notifyFrame(){

const p =
payload();

if(
p
){
onScaleFrame?.(
p
);
}

onInteraction?.();

}

function installProvider(){

if(
providerInstalled
){
return;
}

series.applyOptions({
autoscaleInfoProvider:()=>{

if(
!priceZoomRange
){
return null;
}

return {
priceRange:{
minValue:priceZoomRange.min,
maxValue:priceZoomRange.max
}
};

}
});

chart.priceScale(
"right"
).applyOptions({
autoScale:true,
scaleMargins:{
top:margins?.top ??
0.12,
bottom:margins?.bottom ??
0.12
}
});

providerInstalled =
true;

}

function applyChartRange(){

if(
!priceZoomRange
){
return;
}

installProvider();

try{
chart.priceScale(
"right"
).applyOptions({
autoScale:true
});
}catch{
/* ignore */
}

notifyFrame();

}

function resetScale(){

priceZoomRange =
null;
providerInstalled =
false;

resetPriceAutoScale?.();

stripEl.classList.remove(
"price-scale-touch-strip--active"
);

activeTouchId =
null;
didDrag =
false;
lastTapEnd =
null;

onReset?.();
onDragEnd?.();
onInteraction?.();

}

function tryDoubleTap(
clientX,
clientY
){

const now =
Date.now();

if(
lastTapEnd &&
now - lastTapEnd.t <=
DBL_TAP_MS
){

const dx =
clientX - lastTapEnd.x;

const dy =
clientY - lastTapEnd.y;

if(
dx * dx + dy * dy <=
DBL_TAP_PX * DBL_TAP_PX
){
lastTapEnd =
null;
resetScale();

return true;

}

}

lastTapEnd = {
t:now,
x:clientX,
y:clientY
};

return false;

}

function onStripTouchStart(
e
){

if(
e.touches.length !==
1
){
return;
}

const t =
e.touches[
0
];

e.preventDefault();
e.stopPropagation();

activeTouchId =
t.identifier;

lastClientY =
t.clientY;

didDrag =
false;

stripEl.classList.add(
"price-scale-touch-strip--active"
);

priceZoomRange =
captureRangeFromChart(
chart,
series,
chartEl,
margins,
getFallbackPriceRange
);

if(
!priceZoomRange
){
activeTouchId =
null;
stripEl.classList.remove(
"price-scale-touch-strip--active"
);

return;
}

applyChartRange();
onDragStart?.(
payload()
);

}

function onDocTouchMove(
e
){

if(
activeTouchId ==
null
){
return;
}

let t =
null;

for(
let i =
0;
i <
e.touches.length;
i++
){

if(
e.touches[
i
].identifier ===
activeTouchId
){
t =
e.touches[
i
];
break;
}

}

if(
!t
){
return;
}

e.preventDefault();

const dy =
t.clientY - lastClientY;

lastClientY =
t.clientY;

if(
Math.abs(dy) <
0.5
){
return;
}

didDrag =
true;

priceZoomRange =
zoomRange(
priceZoomRange,
dy,
isLogScale(
chart
)
);

applyChartRange();

}

function onDocTouchEnd(
e
){

for(
let i =
0;
i <
e.changedTouches.length;
i++
){

const t =
e.changedTouches[
i
];

if(
activeTouchId ==
null ||
t.identifier !==
activeTouchId
){
continue;
}

const stillActive =
Array.from(
e.touches
).some(
x=>
x.identifier ===
activeTouchId
);

if(
stillActive
){
continue;
}

const wasDrag =
didDrag;

const x =
t.clientX;

const y =
t.clientY;

activeTouchId =
null;

stripEl.classList.remove(
"price-scale-touch-strip--active"
);

didDrag =
false;

if(
wasDrag
){
onDragEnd?.();
}else{
tryDoubleTap(
x,
y
);
}

break;

}

}

const touchOpts = {
capture:true,
passive:false
};

stripEl.addEventListener(
"touchstart",
onStripTouchStart,
touchOpts
);

document.addEventListener(
"touchmove",
onDocTouchMove,
touchOpts
);

document.addEventListener(
"touchend",
onDocTouchEnd,
touchOpts
);

document.addEventListener(
"touchcancel",
onDocTouchEnd,
touchOpts
);

return ()=>{

stripEl.removeEventListener(
"touchstart",
onStripTouchStart,
touchOpts
);

document.removeEventListener(
"touchmove",
onDocTouchMove,
touchOpts
);

document.removeEventListener(
"touchend",
onDocTouchEnd,
touchOpts
);

document.removeEventListener(
"touchcancel",
onDocTouchEnd,
touchOpts
);

stripEl.classList.remove(
"price-scale-touch-strip--active"
);

activeTouchId =
null;

};

}
