/**
 * iPad: один конечный автомат на жест — свайп = pan, удержание = probe-перекрестие.
 * v=11: после отпускания пальца probe остаётся (crosshair-docked), можно таскать и нажать «+».
 */
const HOLD_MS =
500;

const PAN_START_PX =
6;

const PAN_HORIZ_BIAS =
1.25;

const CROSSHAIR_TAP_TOGGLE_PX =
8;

export function mountTabletChartGestures(
chart,
chartEl,
touchLayerEl,
{
shouldBeginGesture = ()=>true,
shouldAllowPan = ()=>true,
shouldAllowPinch = ()=>true,
blockChartScroll = ()=>false,
onHoldStart = ()=>{},
onHoldEnd = ()=>{},
onProbeAt = ()=>{},
onPanStart = ()=>{}
} = {}
){

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

let holdTimer =
null;

let panSuspended =
false;

let crosshairMoved =
false;

let crosshairJustEntered =
false;

/** iOS: и pointerup, и touchend — снимаем probe один раз */
let crosshairReleaseHandled =
false;

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
crosshairJustEntered =
false;
crosshairFromDock =
false;
pointerId = null;
detachDocListeners();

onHoldEnd();

}

function dockCrosshair(){

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
crosshairJustEntered =
true;

crosshairReleaseHandled =
false;
crosshairFromDock =
false;

touchLayerEl.classList.add(
"active"
);

onHoldStart();

onProbeAt(
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
Math.abs(
dx
) >=
PAN_START_PX &&
Math.abs(
dx
) >
Math.abs(
dy
) *
PAN_HORIZ_BIAS
){

clearTimeout(
holdTimer
);

holdTimer = null;

mode =
"pan";

lastPanClientX =
e.clientX;

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

const dx =
e.clientX - lastPanClientX;

lastPanClientX =
e.clientX;

if(
Math.abs(
dx
) >=
1
){

e.preventDefault();
scrollByDx(
dx
);

}

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
onProbeAt(
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
onProbeAt(
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
return;
}

if(
mode ===
"crosshair-docked"
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
crosshairReleaseHandled =
false;
crosshairFromDock =
true;

mode =
"crosshair";

attachDocListeners();

onProbeAt(
e.clientX,
e.clientY
);

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

function onWrapTouchStart(
e
){

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

function onContextMenu(
e
){

if(
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

const capDown = {
capture:true,
passive:false
};

chartWrapEl.addEventListener(
"pointerdown",
onWrapPointerDown,
capDown
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
onWrapPinchEnd,
{ capture:true, passive:true }
);

chartWrapEl.addEventListener(
"touchcancel",
onWrapPinchEnd,
{ capture:true, passive:true }
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

chartWrapEl.removeEventListener(
"pointerdown",
onWrapPointerDown,
capDown
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
onWrapPinchEnd,
{ capture:true, passive:true }
);

chartWrapEl.removeEventListener(
"touchcancel",
onWrapPinchEnd,
{ capture:true, passive:true }
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
