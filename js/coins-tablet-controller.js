/**
 * iPad /coins: единый контроллер probe + crosshair + «+» (sandbox v2).
 * Desktop не затрагивается — монтируется только при isTabletChartViewport().
 *
 * Включить v2: ?coins-tablet-v2=1 (сохраняется в localStorage)
 * Выключить: ?coins-tablet-v2=0
 */
import {
applyTabletMainChartScroll,
applyTabletRsiChartOptions,
ensureTabletProbeHorizLine,
hasAnyFinePointer,
hiddenCrosshairOptions,
hideTabletProbeCrosshair,
isTabletChartViewport,
mountChartRangeFreeze,
normalCrosshairOptions,
positionTabletProbeCrosshair,
tabletProbeCrosshairOptions,
TABLET_USE_CUSTOM_TOUCH_PAN
} from "./chart-import.js?v=13";

import {
createTabletGesturePolicy
} from "./tablet-gesture-policy.js?v=1";

export const COINS_TABLET_V2_STORAGE_KEY =
"coins-tablet-v2";

/**
 * @returns {boolean}
 */
export function isCoinsTabletV2Enabled(){

if(
!isTabletChartViewport()
){
return false;
}

try{

const params =
new URLSearchParams(
window.location.search
);

const q =
params.get(
"coins-tablet-v2"
);

if(
q ===
"1"
){

localStorage.setItem(
COINS_TABLET_V2_STORAGE_KEY,
"1"
);

return true;

}

if(
q ===
"0"
){

localStorage.removeItem(
COINS_TABLET_V2_STORAGE_KEY
);

return false;

}

}catch{
/* ignore */
}

try{

return (
localStorage.getItem(
COINS_TABLET_V2_STORAGE_KEY
) ===
"1"
);

}catch{

return false;

}

}

function emitChartProbeCrosshair(
active,
clientX = null,
clientY = null,
extra = {}
){

window.dispatchEvent(
new CustomEvent(
"chart-probe-crosshair",
{
detail:{
active: !!active,
clientX,
clientY,
...extra
}
}
)
);

}

/**
 * @param {object} ctx
 * @returns {Promise<object>}
 */
export async function mountCoinsTabletController(
ctx
){

const noop =
()=>{};

const noopCtrl = {
dispose:noop,
abortPan:noop,
cancelCurrentGesture:noop,
deactivateProbe:noop,
getProbeActive:()=>false,
isDocked:()=>false
};

if(
!TABLET_USE_CUSTOM_TOUCH_PAN ||
!isTabletChartViewport()
){
return noopCtrl;
}

const {
v2 = false,
chart,
chartEl,
chartTouchLayerEl,
chartWrapEl,
rsiChart,
candleSeries,
getDrawingTools,
updateRsiHudFromCrosshairTime,
getRsiHudFallbackValue,
setRsiHudValue
} =
ctx;

if(
!chart ||
!chartEl ||
!chartTouchLayerEl ||
!chartWrapEl
){
return noopCtrl;
}

if(
v2
){
document.body.classList.add(
"coins-tablet-v2"
);
}else{
document.body.classList.remove(
"coins-tablet-v2"
);
}

const chartsStackEl =
document.getElementById(
"charts-stack"
);

const probeHorizEl =
ensureTabletProbeHorizLine(
chartsStackEl
);

const linkedVertEl =
document.getElementById(
"linked-crosshair-vert"
);

const crosshairTimeLabelEl =
document.getElementById(
"crosshair-time-label"
);

const mainRangeFreeze =
mountChartRangeFreeze(
chart
);

const rsiRangeFreeze =
mountChartRangeFreeze(
rsiChart
);

/** true = удержание probe (блок pan); false после dock в v2 */
let probeSessionActive =
false;

/** crosshair закреплён после отпускания (v2) */
let probeDocked =
false;

let setTabletPanSuspended =
noop;

const tabletPolicy =
createTabletGesturePolicy({
chartWrap: chartWrapEl,
getDrawingTools,
getProbeActive:()=>probeSessionActive,
isInteractionAllowed:()=>true
});

function probeAt(
clientX,
clientY
){

positionTabletProbeCrosshair({
chart,
series: candleSeries,
chartEl,
chartWrapEl,
chartsStackEl,
linkedVertEl,
horizLineEl: probeHorizEl,
timeLabelEl: crosshairTimeLabelEl,
clientX,
clientY,
onTime: updateRsiHudFromCrosshairTime
});

emitChartProbeCrosshair(
true,
clientX,
clientY,
{
docked: probeDocked
}
);

}

function enterProbeSession(){

probeSessionActive =
true;

probeDocked =
false;

chartWrapEl.classList.add(
"chart-touch-locked"
);

mainRangeFreeze.freeze();
rsiRangeFreeze.freeze();

setTabletPanSuspended?.(
true
);

try{
chart.clearCrosshairPosition();
rsiChart.clearCrosshairPosition();
}catch{
/* ignore */
}

emitChartProbeCrosshair(
false
);

chart.applyOptions({
crosshair: tabletProbeCrosshairOptions(),
handleScroll:{
mouseWheel: false,
pressedMouseMove: false,
horzTouchDrag: false,
vertTouchDrag: false
},
handleScale:{
mouseWheel: false,
pinch: false,
axisPressedMouseMove:{
time: false,
price: false
}
}
});

rsiChart.applyOptions({
crosshair: hiddenCrosshairOptions(),
handleScroll:{
mouseWheel: false,
pressedMouseMove: false,
horzTouchDrag: false,
vertTouchDrag: false
},
handleScale:{
mouseWheel: false,
pinch: false,
axisPressedMouseMove:{
time: false,
price: false
}
}
});

}

function exitProbeSession(){

probeSessionActive =
false;

probeDocked =
false;

chartWrapEl.classList.remove(
"chart-touch-locked"
);

mainRangeFreeze.unfreeze();
rsiRangeFreeze.unfreeze();

setTabletPanSuspended?.(
false
);

try{
chart.clearCrosshairPosition();
}catch{
/* ignore */
}

hideTabletProbeCrosshair({
linkedVertEl,
horizLineEl: probeHorizEl,
timeLabelEl: crosshairTimeLabelEl,
chartWrapEl,
onClear(){

const fallback =
getRsiHudFallbackValue?.();

setRsiHudValue?.(
fallback ??
null
);

}
});

emitChartProbeCrosshair(
false
);

try{
chart.applyOptions({
crosshair: normalCrosshairOptions()
});
}catch{
/* ignore */
}

applyTabletMainChartScroll(
chart
);

applyTabletRsiChartOptions(
rsiChart
);

}

/** v2: после отпускания — crosshair и «+» остаются, pan снова доступен */
function enterDockedProbe(
clientX,
clientY
){

probeSessionActive =
false;

probeDocked =
true;

chartWrapEl.classList.remove(
"chart-touch-locked"
);

mainRangeFreeze.unfreeze();
rsiRangeFreeze.unfreeze();

setTabletPanSuspended?.(
false
);

applyTabletMainChartScroll(
chart
);

applyTabletRsiChartOptions(
rsiChart
);

if(
Number.isFinite(
clientX
) &&
Number.isFinite(
clientY
)
){
probeAt(
clientX,
clientY
);
}

}

const {
mountTabletChartGestures
} =
await import(
"./chart-tablet-gestures.js?v=17"
);

const tabletGestureCtrl =
mountTabletChartGestures(
chart,
chartEl,
chartTouchLayerEl,
{
allowMousePan:()=>
isTabletChartViewport() &&
hasAnyFinePointer(),
shouldBeginGesture:(
e
)=>
tabletPolicy.shouldBeginGesture(
e
),
shouldAllowPan:()=>
tabletPolicy.shouldAllowPan(),
shouldAllowPinch:()=>
tabletPolicy.shouldAllowPinch(),
blockChartScroll:()=>probeSessionActive,
onHoldStart: enterProbeSession,
onHoldEnd: exitProbeSession,
onProbeAt: probeAt,
onDocked:(
clientX,
clientY
)=>{

if(
!v2
){
return;
}

enterDockedProbe(
clientX,
clientY
);

}
}
);

setTabletPanSuspended =
tabletGestureCtrl.setPanSuspended;

function onClearRequest(){

tabletGestureCtrl.deactivateProbe?.();
emitChartProbeCrosshair(
false
);

}

window.addEventListener(
"chart-probe-crosshair-clear-request",
onClearRequest
);

return {
dispose(){

window.removeEventListener(
"chart-probe-crosshair-clear-request",
onClearRequest
);

document.body.classList.remove(
"coins-tablet-v2"
);

tabletGestureCtrl.dispose?.();

},
abortPan: tabletGestureCtrl.abortPan,
cancelCurrentGesture: tabletGestureCtrl.cancelCurrentGesture,
deactivateProbe: tabletGestureCtrl.deactivateProbe,
getProbeActive:()=>probeSessionActive,
isDocked:()=>probeDocked
};

}
