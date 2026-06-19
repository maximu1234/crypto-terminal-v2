/**
 * Chart-level input: coarse touch guard, fine pointer placement, pan redraw loop.
 * Phase 8 split from drawings/init.js.
 */
import {
isCoarseTouchViewport,
isTabletChartViewport,
hasAnyFinePointer
} from "../chart-import.js?v=40";

export function createDrawChartInput(
deps
){

const {
tabletCustomPanHooked,
getAlive,
isActive,
getTool,
getDragState,
getSelected,
setBlockChartClick,
wrapEl,
desktopEdit,
pointerFromEvent,
handleToolClick,
hitTest,
hitTestHandle,
hitTestShapeBody,
syncChartTouchPan,
getDragHandle,
getChartPanActive,
setChartPanActive,
getChartPanRedrawRaf,
setChartPanRedrawRaf,
getChartPanWheelTimer,
setChartPanWheelTimer,
redraw
} =
deps;

function setupFinePointerChartClicks(){

if(
!tabletCustomPanHooked
){
return ()=>{};
}

const onFinePointerDown = e=>{

if(
!getAlive() ||
!isActive()
){
return;
}

if(
e.pointerType !==
"mouse"
){
return;
}

if(
!isTabletChartViewport() ||
!hasAnyFinePointer()
){
return;
}

if(
getTool() ===
"cursor" ||
desktopEdit.isDrawChromePointerEvent(
e
)
){
return;
}

if(
e.button !==
0 ||
!e.isPrimary
){
return;
}

const { x, y } =
pointerFromEvent(
e
);

const placed =
handleToolClick(
{
point:{
x,
y
},
metaKey: e.metaKey
}
);

if(
!placed
){
return;
}

setBlockChartClick(true);

e.preventDefault();

};

wrapEl.addEventListener(
"pointerdown",
onFinePointerDown,
true
);

return ()=>{
wrapEl.removeEventListener(
"pointerdown",
onFinePointerDown,
true
);
};

}

function setupCoarseTouchChartGuard(){

if(
!isCoarseTouchViewport()
){
return ()=>{};
}

const cap = {
capture:true,
passive:false
};

function touchLocal(
e
){

const t =
e.touches?.[
0
];

if(
!t
){
return null;
}

const rect =
wrapEl.getBoundingClientRect();

return {
x: t.clientX - rect.left,
y: t.clientY - rect.top
};

}

function shouldBlockChartTouch(
e
){

if(
!getAlive() ||
!isActive()
){
return false;
}

if(
getDragState()
){
return true;
}

/* placement: точки ставятся pointerdown/up на wrapEl — touchstart не блокируем */

if(
getTool() !==
"cursor"
){
return false;
}

const p =
touchLocal(
e
);

if(
!p
){
return false;
}

if(
hitTest(
p.x,
p.y
)
){
return true;
}

const sel =
getSelected();

if(
!sel
){
return false;
}

return (
!!hitTestHandle(
p.x,
p.y,
sel
) ||
hitTestShapeBody(
p.x,
p.y,
sel
)
);

}

const onTouchStart = e=>{

if(
e.touches.length >
1
){
return;
}

if(
!shouldBlockChartTouch(
e
)
){
return;
}

e.preventDefault();

syncChartTouchPan();

};

const onTouchMove = e=>{

if(
!getDragState()
){
return;
}

e.preventDefault();

};

wrapEl.addEventListener(
"touchstart",
onTouchStart,
cap
);

wrapEl.addEventListener(
"touchmove",
onTouchMove,
cap
);

return ()=>{
wrapEl.removeEventListener(
"touchstart",
onTouchStart,
cap
);
wrapEl.removeEventListener(
"touchmove",
onTouchMove,
cap
);
};

}

function stopChartPanRedraw(){

setChartPanActive(false);

if(getChartPanRedrawRaf()){
cancelAnimationFrame(getChartPanRedrawRaf());
setChartPanRedrawRaf(0);
}

if(getChartPanWheelTimer()){
clearTimeout(getChartPanWheelTimer());
setChartPanWheelTimer(null);
}

redraw();

}

function chartPanRedrawLoop(){

if(
!getAlive() ||
!getChartPanActive()
){
setChartPanRedrawRaf(0);
return;
}

redraw();
setChartPanRedrawRaf(
requestAnimationFrame(chartPanRedrawLoop)
);

}

function startChartPanRedraw(){

setChartPanActive(true);

if(!getChartPanRedrawRaf()){
setChartPanRedrawRaf(
requestAnimationFrame(chartPanRedrawLoop)
);
}

}

function setupChartPanRedraw(){

const onPanDown = e=>{

if(
!getAlive() ||
!isActive()
){
return;
}

if(
e.button !== 0 &&
e.button !== 1
){
return;
}

if(getDragState()){
return;
}

if(
getDragHandle() &&
getDragHandle().contains(e.target)
){
return;
}

if(
desktopEdit.isDrawChromePointerEvent(
e
)
){
return;
}

startChartPanRedraw();

};

const onPanWheel = ()=>{

if(!getAlive() || !isActive()){
return;
}

startChartPanRedraw();

if(getChartPanWheelTimer()){
clearTimeout(getChartPanWheelTimer());
}

setChartPanWheelTimer(
setTimeout(
stopChartPanRedraw,
150
)
);

};

wrapEl.addEventListener(
"mousedown",
onPanDown
);

wrapEl.addEventListener(
"wheel",
onPanWheel,
{ passive: true }
);

window.addEventListener(
"mouseup",
stopChartPanRedraw
);

window.addEventListener(
"blur",
stopChartPanRedraw
);

return ()=>{

wrapEl.removeEventListener(
"mousedown",
onPanDown
);

wrapEl.removeEventListener(
"wheel",
onPanWheel
);

window.removeEventListener(
"mouseup",
stopChartPanRedraw
);

window.removeEventListener(
"blur",
stopChartPanRedraw
);

stopChartPanRedraw();

};

}

return {
setupFinePointerChartClicks,
setupCoarseTouchChartGuard,
setupChartPanRedraw,
startChartPanRedraw,
stopChartPanRedraw
};

}

