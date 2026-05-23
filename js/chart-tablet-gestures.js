/**
 * iPad: один конечный автомат на жест — свайп = pan, удержание = probe-перекрестие.
 */
const HOLD_MS =
500;

const PAN_START_PX =
6;

const PAN_HORIZ_BIAS =
1.25;

export function mountTabletChartGestures(
chart,
chartEl,
touchLayerEl,
{
shouldBeginGesture = ()=>true,
shouldAllowPan = ()=>true,
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

/** @type {"idle"|"pending"|"pan"|"crosshair"} */
let mode =
"idle";

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

let onDocMove =
null;

let onDocTouchMove =
null;

let onDocUp =
null;

let onDocTouchEnd =
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

}

function endCrosshair(){

if(
mode !==
"crosshair"
){
return;
}

touchLayerEl.classList.remove(
"active"
);

mode =
"idle";

onHoldEnd();

}

function resetGesture(){

clearTimeout(
holdTimer
);

holdTimer = null;

if(
mode ===
"crosshair"
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

e.preventDefault();
onProbeAt(
e.clientX,
e.clientY
);

}

};

onDocTouchMove =(
e
)=>{

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
onProbeAt(
t.clientX,
t.clientY
);

};

onDocUp =(
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

resetGesture();

};

const moveCap = {
capture:true,
passive:false
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
"crosshair"
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

function onTouchStart(
e
){

if(
e.touches.length >
1
){
resetGesture();
}

}

function onContextMenu(
e
){

if(
mode ===
"pending" ||
mode ===
"crosshair"
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
onTouchStart,
{ capture:true, passive:true }
);

chartWrapEl.addEventListener(
"contextmenu",
onContextMenu,
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
onTouchStart,
{ capture:true, passive:true }
);

chartWrapEl.removeEventListener(
"contextmenu",
onContextMenu,
capDown
);

}

function abortPan(){

if(
mode ===
"pan" ||
mode ===
"pending"
){
resetGesture();
}

}

function cancelCurrentGesture(){

resetGesture();
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

return {
dispose,
abortPan,
cancelCurrentGesture,
setPanSuspended
};

}
