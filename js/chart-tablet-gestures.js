/**
 * iPad: единственный модуль touch/pan/probe-жестов на графике.
 * На десктопе не монтируется (terminal.js + isTabletChartViewport).
 * Старые mountTabletCrosshairLongPress / mountTabletCustomTouchPan удалены из chart.js.
 */
import {
isPriceScalePlusChromeTarget
} from "./tablet-gesture-policy.js?v=4";

const HOLD_MS =
500;

const PAN_START_PX =
6;

const PAN_HORIZ_BIAS =
1.25;

/**
 * After a price-scale zoom, plot drag must pan (time and/or locked price),
 * not wait for a strictly horizontal swipe. Desktop LW does the same
 * once autoScale is off.
 */
export function shouldStartTabletPlotPan(
dx,
dy,
canShiftPrice = false
){

const absDx =
Math.abs(
dx
);

const absDy =
Math.abs(
dy
);

if(
canShiftPrice
){
return (
absDx >=
PAN_START_PX ||
absDy >=
PAN_START_PX
);
}

return (
absDx >=
PAN_START_PX &&
absDx >
absDy *
PAN_HORIZ_BIAS
);

}

const CROSSHAIR_TAP_TOGGLE_PX =
8;

const WHEEL_ZOOM_MIN_SPAN =
2;

const WHEEL_HORIZ_PAN_BIAS =
1.25;

/**
 * Mouse wheel / trackpad pinch (ctrlKey) → scale factor for visible range.
 * deltaY > 0 (scroll down) zooms out (factor > 1).
 */
export function wheelZoomFactor(
e
){

const dy =
Number(
e?.deltaY
) ||
0;

if(
dy ===
0 &&
!e?.ctrlKey
){
return 1;
}

let pixels =
dy;

if(
e?.deltaMode ===
1
){
pixels =
dy *
16;
}else if(
e?.deltaMode ===
2
){
pixels =
dy *
400;
}

const scale =
e?.ctrlKey ?
0.01 :
0.0015;
const factor =
Math.exp(
pixels *
scale
);

return Math.min(
1.35,
Math.max(
0.74,
factor
)
);

}

export function rangeZoomAroundAnchor(
from,
to,
anchorFrac,
factor,
minSpan =
WHEEL_ZOOM_MIN_SPAN
){

const span =
to -
from;

if(
!Number.isFinite(
span
) ||
span ===
0 ||
!Number.isFinite(
factor
) ||
factor ===
1
){
return {
from,
to
};
}

const frac =
Math.min(
1,
Math.max(
0,
anchorFrac
)
);
const newSpan =
Math.max(
minSpan,
span *
factor
);
const anchor =
from +
span *
frac;

return {
from: anchor -
newSpan *
frac,
to: anchor -
newSpan *
frac +
newSpan
};

}

/**
 * Overlay sits on top of LW canvas on iPad, so wheel never reaches the chart.
 * Apply desktop-like zoom / horizontal pan from the overlay event.
 * @returns {boolean} true if the chart range changed
 */
export function applyPointerWheelOnChart(
chart,
chartEl,
e
){

if(
!chart ||
!e
){
return false;
}

const dy =
Number(
e.deltaY
) ||
0;
const dx =
Number(
e.deltaX
) ||
0;

if(
dy ===
0 &&
dx ===
0
){
return false;
}

const ts =
chart.timeScale?.();

if(
!ts
){
return false;
}

const range =
ts.getVisibleLogicalRange?.();

if(
!range ||
!Number.isFinite(
range.from
) ||
!Number.isFinite(
range.to
)
){
return false;
}

const rect =
chartEl?.getBoundingClientRect?.();
const width =
Math.max(
1,
rect?.width ||
1
);
const height =
Math.max(
1,
rect?.height ||
1
);
const anchorFrac =
rect ?
Math.min(
1,
Math.max(
0,
(
(
e.clientX ??
0
) -
rect.left
) /
width
)
) :
0.5;
const priceFrac =
rect ?
Math.min(
1,
Math.max(
0,
(
(
e.clientY ??
0
) -
rect.top
) /
height
)
) :
0.5;

if(
!e.ctrlKey &&
Math.abs(
dx
) >
Math.abs(
dy
) *
WHEEL_HORIZ_PAN_BIAS &&
Math.abs(
dx
) >
0.5
){

const spacing =
ts.options?.()?.barSpacing ??
6;
const shift =
dx /
Math.max(
1,
spacing
);

ts.setVisibleLogicalRange({
from: range.from +
shift,
to: range.to +
shift
});

return true;

}

const factor =
wheelZoomFactor(
e
);

if(
factor ===
1
){
return false;
}

const next =
rangeZoomAroundAnchor(
range.from,
range.to,
anchorFrac,
factor
);

ts.setVisibleLogicalRange(
next
);

try{

const ps =
chart.priceScale?.(
"right"
);
const pr =
ps?.getVisibleRange?.();

if(
pr &&
Number.isFinite(
pr.from
) &&
Number.isFinite(
pr.to
) &&
pr.to !==
pr.from
){

const zoomed =
rangeZoomAroundAnchor(
pr.from,
pr.to,
1 -
priceFrac,
factor,
Number.EPSILON
);

ps.setVisibleRange(
zoomed
);

}

}catch{
/* auto-scale / missing scale */
}

return true;

}

export function mountTabletChartGestures(
chart,
chartEl,
touchLayerEl,
{
shouldBeginGesture = ()=>true,
shouldAllowPan = ()=>true,
shouldAllowPinch = ()=>true,
shouldSuppressNativeSelection = ()=>false,
blockChartScroll = ()=>false,
/** iPad + Bluetooth-мышь; на чистом десктопе LW сам ловит click/pan */
allowMousePan = ()=>false,
canShiftPrice = ()=>false,
shiftPriceByPointer = ()=>{},
onPricePanEnd = ()=>{},
onHoldStart = ()=>{},
onHoldEnd = ()=>{},
onProbeAt = ()=>{},
onDocked = ()=>{},
onPanStart = ()=>{}
} = {}
){

function fireProbeAt(
clientX,
clientY
){

lastProbeClientX =
clientX;

lastProbeClientY =
clientY;

onProbeAt(
clientX,
clientY
);

}

const noop =
()=>{};

if(
!chart ||
!chartEl ||
!touchLayerEl
){
return {
dispose:noop,
abortPan:noop,
cancelCurrentGesture:noop,
setPanSuspended:noop
};
}

const chartWrapEl =
chartEl.closest?.(
"#chart-wrap"
) ??
touchLayerEl.parentElement;

if(
!chartWrapEl
){
return {
dispose:noop,
abortPan:noop,
cancelCurrentGesture:noop,
setPanSuspended:noop
};
}

const moveCap = {
capture:true,
passive:false
};

/** @type {"idle"|"pending"|"pan"|"crosshair"|"crosshair-docked"|"pinch"} */
let mode =
"idle";

let pinchState =
null;

let pointerId =
null;

let startClientX =
0;

let startClientY =
0;

let lastPanClientX =
0;

let lastPanClientY =
0;

let holdTimer =
null;

let panSuspended =
false;

let crosshairMoved =
false;

/** iOS: и pointerup, и touchend — снимаем probe один раз */
let crosshairReleaseHandled =
false;

/** После dock игнорируем touchend того же касания (иначе сразу endCrosshair) */
let dockSuppressTouchEndUntil =
0;

let lastProbeClientX =
0;

let lastProbeClientY =
0;

/** Повторное касание по chart-wrap при уже закреплённом probe */
let crosshairFromDock =
false;

let onDocMove =
null;

let onDocTouchMove =
null;

let onDocUp =
null;

let onDocTouchEnd =
null;

let onWrapPointerMove =
null;

let onWrapTouchMove =
null;

function scrollByDx(
dx
){

if(
blockChartScroll() ||
!shouldAllowPan()
){
return;
}

const ts =
chart.timeScale();

const range =
ts.getVisibleLogicalRange();

if(
!range
){
return;
}

const spacing =
ts.options().barSpacing ??
6;

const shift =
dx / spacing;

ts.setVisibleLogicalRange({
from:range.from - shift,
to:range.to - shift
});

}

function applyPanPointerDelta(
clientX,
clientY
){

const dx =
clientX - lastPanClientX;

const dy =
clientY - lastPanClientY;

lastPanClientX =
clientX;

lastPanClientY =
clientY;

if(
Math.abs(
dx
) >=
1
){
scrollByDx(
dx
);
}

if(
Math.abs(
dy
) >=
1 &&
canShiftPrice()
){
shiftPriceByPointer(
clientY,
clientY - dy
);
}

}

function detachDocListeners(){

if(
onDocMove
){

document.removeEventListener(
"pointermove",
onDocMove
);

onDocMove = null;

}

if(
onDocTouchMove
){

document.removeEventListener(
"touchmove",
onDocTouchMove,
{ capture:true }
);

onDocTouchMove = null;

}

if(
onDocUp
){

document.removeEventListener(
"pointerup",
onDocUp
);

document.removeEventListener(
"pointercancel",
onDocUp
);

onDocUp = null;

}

if(
onDocTouchEnd
){

document.removeEventListener(
"touchend",
onDocTouchEnd,
{ capture:true }
);

document.removeEventListener(
"touchcancel",
onDocTouchEnd,
{ capture:true }
);

onDocTouchEnd = null;

}

if(
onWrapPointerMove
){

chartWrapEl.removeEventListener(
"pointermove",
onWrapPointerMove,
moveCap
);

onWrapPointerMove = null;

}

if(
onWrapTouchMove
){

chartWrapEl.removeEventListener(
"touchmove",
onWrapTouchMove,
moveCap
);

onWrapTouchMove = null;

}

}

function endCrosshair(){

if(
mode !==
"crosshair" &&
mode !==
"crosshair-docked"
){
return;
}

touchLayerEl.classList.remove(
"active"
);

mode =
"idle";

crosshairMoved =
false;
crosshairFromDock =
false;
pointerId = null;
detachDocListeners();

onHoldEnd();

}

function dockCrosshair(){

dockSuppressTouchEndUntil =
Date.now() +
450;

mode =
"crosshair-docked";

crosshairMoved =
false;
crosshairReleaseHandled =
false;
pointerId =
null;

detachDocListeners();

}

function finishCrosshairRelease(){

if(
mode !==
"crosshair"
){
return;
}

if(
crosshairReleaseHandled
){
return;
}

crosshairReleaseHandled =
true;

pointerId =
null;

if(
crosshairFromDock &&
!crosshairMoved
){
crosshairFromDock =
false;
endCrosshair();
return;
}

crosshairFromDock =
false;
dockCrosshair();

try{
onDocked(
lastProbeClientX,
lastProbeClientY
);
}catch{
/* ignore */
}

}

function touchSpan(
touches
){

const a =
touches[
0
];

const b =
touches[
1
];

if(
!a ||
!b
){
return 0;
}

return Math.hypot(
b.clientX - a.clientX,
b.clientY - a.clientY
);

}

function beginPinch(
e
){

const ts =
chart.timeScale();

const range =
ts.getVisibleLogicalRange();

if(
!range
){
return;
}

pinchState = {
startDist:touchSpan(
e.touches
),
range:{
from:range.from,
to:range.to
}
};

mode =
"pinch";

pointerId = null;

clearTimeout(
holdTimer
);

holdTimer = null;

detachDocListeners();

}

function applyPinch(
touches
){

if(
!pinchState ||
touches.length <
2
){
return;
}

const dist =
touchSpan(
touches
);

if(
dist <
1 ||
pinchState.startDist <
1
){
return;
}

const ratio =
dist / pinchState.startDist;

const center =
(
pinchState.range.from +
pinchState.range.to
) /
2;

const half =
(
pinchState.range.to -
pinchState.range.from
) /
2;

const newHalf =
half / ratio;

chart.timeScale().setVisibleLogicalRange({
from:center - newHalf,
to:center + newHalf
});

}

function resetGesture(){

const wasPan =
mode ===
"pan";

clearTimeout(
holdTimer
);

holdTimer = null;

pinchState = null;

if(
mode ===
"crosshair" ||
mode ===
"crosshair-docked"
){
endCrosshair();
}else{
mode =
"idle";
}

pointerId = null;
detachDocListeners();

if(
wasPan
){
onPricePanEnd();
}

}

function enterCrosshair(){

if(
mode !==
"pending"
){
return;
}

mode =
"crosshair";

crosshairMoved =
false;

crosshairReleaseHandled =
false;
crosshairFromDock =
false;

touchLayerEl.classList.add(
"active"
);

onHoldStart();

fireProbeAt(
startClientX,
startClientY
);

}

function attachDocListeners(){

if(
onDocMove
){
return;
}

onDocMove =(
e
)=>{

if(
pointerId ===
null ||
(
e.pointerId !==
undefined &&
e.pointerId !==
pointerId
)
){
return;
}

if(
mode ===
"pending"
){

if(
panSuspended ||
!shouldAllowPan()
){
return;
}

const dx =
e.clientX - startClientX;

const dy =
e.clientY - startClientY;

if(
shouldStartTabletPlotPan(
dx,
dy,
canShiftPrice()
)
){

clearTimeout(
holdTimer
);

holdTimer = null;

mode =
"pan";

lastPanClientX =
e.clientX;

lastPanClientY =
e.clientY;

onPanStart();

}

return;

}

if(
mode ===
"pan"
){

if(
panSuspended ||
!shouldAllowPan() ||
blockChartScroll()
){
resetGesture();
return;
}

e.preventDefault();
applyPanPointerDelta(
e.clientX,
e.clientY
);

return;

}

if(
mode ===
"crosshair"
){

const dx =
e.clientX - startClientX;
const dy =
e.clientY - startClientY;

if(
dx * dx + dy * dy >
CROSSHAIR_TAP_TOGGLE_PX *
CROSSHAIR_TAP_TOGGLE_PX
){
crosshairMoved = true;
}

e.preventDefault();
e.stopImmediatePropagation?.();
fireProbeAt(
e.clientX,
e.clientY
);

}

};

function handleCrosshairTouchMove(
e
){

if(
mode !==
"crosshair"
){
return;
}

if(
e.touches.length >
1
){
resetGesture();
return;
}

const t =
e.touches[
0
];

if(
!t
){
return;
}

e.preventDefault();
e.stopImmediatePropagation?.();
fireProbeAt(
t.clientX,
t.clientY
);

}

onDocTouchMove =(
e
)=>{

handleCrosshairTouchMove(
e
);

};

onWrapTouchMove =(
e
)=>{

handleCrosshairTouchMove(
e
);

};

onWrapPointerMove =
onDocMove;

onDocUp =(
e
)=>{

if(
mode ===
"crosshair"
){

if(
pointerId ===
null ||
(
e.pointerId !==
undefined &&
e.pointerId !==
pointerId
)
){
return;
}

finishCrosshairRelease();
return;

}

if(
pointerId ===
null ||
(
e.pointerId !==
undefined &&
e.pointerId !==
pointerId
)
){
return;
}

resetGesture();

};

onDocTouchEnd =(
e
)=>{

if(
e.touches.length >
0
){
return;
}

if(
mode ===
"crosshair"
){
finishCrosshairRelease();
return;
}

resetGesture();

};

document.addEventListener(
"pointermove",
onDocMove,
moveCap
);

document.addEventListener(
"touchmove",
onDocTouchMove,
moveCap
);

document.addEventListener(
"pointerup",
onDocUp
);

document.addEventListener(
"pointercancel",
onDocUp
);

document.addEventListener(
"touchend",
onDocTouchEnd,
{ capture:true }
);

document.addEventListener(
"touchcancel",
onDocTouchEnd,
{ capture:true }
);

chartWrapEl.addEventListener(
"pointermove",
onWrapPointerMove,
moveCap
);

chartWrapEl.addEventListener(
"touchmove",
onWrapTouchMove,
moveCap
);

}

function onWrapPointerDown(
e
){

if(
e.pointerType ===
"mouse"
){

if(
!allowMousePan()
){
return;
}

if(
e.button !==
0
){
return;
}

if(
!shouldBeginGesture(
e
)
){
return;
}

if(
panSuspended ||
!shouldAllowPan()
){
return;
}

resetGesture();

pointerId =
e.pointerId ??
0;

startClientX =
e.clientX;

startClientY =
e.clientY;

lastPanClientX =
e.clientX;

lastPanClientY =
e.clientY;

mode =
"pan";

onPanStart();

attachDocListeners();

e.preventDefault();

return;

}

if(
mode ===
"crosshair-docked"
){

if(
isPriceScalePlusChromeTarget(
e
)
){
return;
}

pointerId =
e.pointerId ??
0;

startClientX =
e.clientX;

startClientY =
e.clientY;

crosshairMoved =
false;
crosshairReleaseHandled =
false;
crosshairFromDock =
true;

mode =
"crosshair";

attachDocListeners();

e.preventDefault();
e.stopImmediatePropagation?.();
return;

}

if(
mode ===
"crosshair" ||
mode ===
"pinch"
){
if(
mode ===
"crosshair"
){
if(
!shouldBeginGesture(
e
)
){
return;
}

pointerId =
e.pointerId ??
0;
startClientX =
e.clientX;
startClientY =
e.clientY;
crosshairMoved =
false;
attachDocListeners();
e.preventDefault();
e.stopImmediatePropagation?.();
return;
}

return;
}

if(
!shouldBeginGesture(
e
)
){
if(
shouldSuppressNativeSelection()
){
e.preventDefault();
}

return;
}

resetGesture();

pointerId =
e.pointerId ??
0;

startClientX =
e.clientX;

startClientY =
e.clientY;

lastPanClientX =
e.clientX;

lastPanClientY =
e.clientY;

mode =
"pending";

holdTimer =
setTimeout(
()=>{

holdTimer = null;

if(
mode ===
"pending" &&
pointerId !==
null
){
enterCrosshair();
}

},
HOLD_MS
);

attachDocListeners();

}

function onWrapTouchMoveDrawBlock(
e
){

if(
!shouldSuppressNativeSelection()
){
return;
}

if(
e.touches?.length !==
1
){
return;
}

e.preventDefault();

}

function onWrapTouchStart(
e
){

if(
e.touches.length ===
1 &&
shouldSuppressNativeSelection()
){
e.preventDefault();
return;
}

if(
e.touches.length <
2
){
return;
}

if(
mode ===
"crosshair" ||
mode ===
"crosshair-docked"
){
resetGesture();
}

if(
!shouldAllowPinch()
){
resetGesture();
return;
}

beginPinch(
e
);

e.preventDefault();

}

function onWrapPinchMove(
e
){

if(
mode !==
"pinch" ||
e.touches.length <
2
){
return;
}

if(
!shouldAllowPinch()
){
resetGesture();
return;
}

e.preventDefault();
applyPinch(
e.touches
);

}

function onWrapPinchEnd(
e
){

if(
mode !==
"pinch"
){
return;
}

if(
e.touches.length >=
2
){
return;
}

pinchState = null;
mode =
"idle";

}

function onWrapTouchEndCapture(
e
){

onWrapPinchEnd(
e
);

if(
mode !==
"crosshair-docked" ||
e.touches.length >
0
){
return;
}

if(
Date.now() <
dockSuppressTouchEndUntil
){
return;
}

if(
isPriceScalePlusChromeTarget(
e
)
){
return;
}

e.preventDefault();
endCrosshair();

}

function onContextMenu(
e
){

if(
shouldSuppressNativeSelection() ||
mode ===
"pending" ||
mode ===
"crosshair" ||
mode ===
"crosshair-docked"
){
e.preventDefault();
}

}

function onSelectStart(
e
){

if(
shouldSuppressNativeSelection() ||
mode ===
"pending" ||
mode ===
"crosshair" ||
mode ===
"crosshair-docked" ||
mode ===
"pan"
){
e.preventDefault();
}

}

function onOverlayWheel(
e
){

if(
panSuspended ||
blockChartScroll()
){
return;
}

if(
mode ===
"pinch" ||
mode ===
"crosshair" ||
mode ===
"crosshair-docked"
){
return;
}

if(
e.target?.closest?.(
"input, textarea, select"
)
){
return;
}

const handled =
applyPointerWheelOnChart(
chart,
touchLayerEl,
e
);

if(
handled
){
e.preventDefault();
}

}

const capDown = {
capture:true,
passive:false
};

const capWheel = {
capture:true,
passive:false
};

touchLayerEl.addEventListener(
"wheel",
onOverlayWheel,
capWheel
);

chartWrapEl.addEventListener(
"pointerdown",
onWrapPointerDown,
capDown
);

chartWrapEl.addEventListener(
"touchmove",
onWrapTouchMoveDrawBlock,
{ capture:true, passive:false }
);

chartWrapEl.addEventListener(
"touchstart",
onWrapTouchStart,
{ capture:true, passive:false }
);

chartWrapEl.addEventListener(
"touchmove",
onWrapPinchMove,
{ capture:true, passive:false }
);

chartWrapEl.addEventListener(
"touchend",
onWrapTouchEndCapture,
{ capture:true, passive:false }
);

chartWrapEl.addEventListener(
"touchcancel",
onWrapTouchEndCapture,
{ capture:true, passive:false }
);

chartWrapEl.addEventListener(
"contextmenu",
onContextMenu,
capDown
);

chartWrapEl.addEventListener(
"selectstart",
onSelectStart,
capDown
);

function dispose(){

resetGesture();
touchLayerEl.classList.remove(
"active"
);

touchLayerEl.removeEventListener(
"wheel",
onOverlayWheel,
capWheel
);

chartWrapEl.removeEventListener(
"pointerdown",
onWrapPointerDown,
capDown
);

chartWrapEl.removeEventListener(
"touchmove",
onWrapTouchMoveDrawBlock,
{ capture:true, passive:false }
);

chartWrapEl.removeEventListener(
"touchstart",
onWrapTouchStart,
{ capture:true, passive:false }
);

chartWrapEl.removeEventListener(
"touchmove",
onWrapPinchMove,
{ capture:true, passive:false }
);

chartWrapEl.removeEventListener(
"touchend",
onWrapTouchEndCapture,
{ capture:true, passive:false }
);

chartWrapEl.removeEventListener(
"touchcancel",
onWrapTouchEndCapture,
{ capture:true, passive:false }
);

chartWrapEl.removeEventListener(
"contextmenu",
onContextMenu,
capDown
);

chartWrapEl.removeEventListener(
"selectstart",
onSelectStart,
capDown
);

}

function abortPan(){

if(
mode ===
"pan" ||
mode ===
"pending" ||
mode ===
"pinch"
){
resetGesture();
}

}

function cancelCurrentGesture(){

if(
mode ===
"crosshair"
){
finishCrosshairRelease();
return;
}

if(
mode ===
"crosshair-docked"
){
endCrosshair();
return;
}

if(
mode ===
"pan" ||
mode ===
"pending"
){
resetGesture();
}

}

function setPanSuspended(
value
){

panSuspended =
!!value;

if(
panSuspended &&
mode ===
"pan"
){
resetGesture();
}

}

function deactivateProbe(){

if(
mode ===
"crosshair" ||
mode ===
"crosshair-docked"
){
endCrosshair();
return;
}

if(
mode ===
"pending"
){
resetGesture();
}

}

return {
dispose,
abortPan,
cancelCurrentGesture,
setPanSuspended,
deactivateProbe
};

}
