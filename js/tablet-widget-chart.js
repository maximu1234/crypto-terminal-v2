/**
 * iPad: touch overlay + pan/probe для одного chart widget (dashboard).
 * Desktop: noop. chart-tablet-gestures — lazy import только на tablet.
 */
import {
isTabletChartViewport,
hasAnyFinePointer,
TABLET_USE_CUSTOM_TOUCH_PAN,
applyTabletMainChartScroll,
mountChartRangeFreeze,
tabletProbeCrosshairOptions,
normalCrosshairOptions
} from "./chart-import.js?v=13";

import {
createTabletGesturePolicy
} from "./tablet-gesture-policy.js?v=1";

const noop =
()=>{};

const noopCtrl = {
dispose:noop,
abortPan:noop,
cancelCurrentGesture:noop
};

function ensureTouchLayer(
chartWrap
){

let el =
chartWrap.querySelector(
".tablet-probe-touch-layer"
);

if(
el
){
return el;
}

el =
document.createElement(
"div"
);

el.className =
"tablet-probe-touch-layer";
el.setAttribute(
"aria-hidden",
"true"
);

chartWrap.appendChild(
el
);

return el;

}

function probeCrosshairAt(
chart,
series,
chartEl,
clientX,
clientY
){

const rect =
chartEl.getBoundingClientRect();

const x =
clientX - rect.left;

const y =
clientY - rect.top;

const price =
series.coordinateToPrice(
y
);

const time =
chart.timeScale().coordinateToTime(
x
);

if(
price ==
null ||
time ==
null
){
return;
}

try{
chart.setCrosshairPosition(
price,
time,
series
);
}catch{
/* ignore */
}

}

/**
 * @param {{
 *   chart: object,
 *   series: object,
 *   chartEl: Element,
 *   chartWrap: Element,
 *   getDrawingTools: ()=>object|null,
 *   isWidgetActive?: ()=>boolean
 * }} opts
 * @returns {Promise<{ dispose: Function, abortPan: Function, cancelCurrentGesture: Function }>}
 */
export async function mountWidgetTabletChart(
opts
){

if(
!TABLET_USE_CUSTOM_TOUCH_PAN ||
!isTabletChartViewport()
){
return noopCtrl;
}

applyTabletMainChartScroll(
opts.chart
);

const touchLayer =
ensureTouchLayer(
opts.chartWrap
);

const {
mountTabletChartGestures
} =
await import(
"./chart-tablet-gestures.js?v=17"
);

let probeActive =
false;

const rangeFreeze =
mountChartRangeFreeze(
opts.chart
);

const isWidgetActive =
opts.isWidgetActive ??
(()=>true);

const policy =
createTabletGesturePolicy({
chartWrap: opts.chartWrap,
getDrawingTools: opts.getDrawingTools,
getProbeActive: ()=>probeActive,
isInteractionAllowed: isWidgetActive
});

const ctrl =
mountTabletChartGestures(
opts.chart,
opts.chartEl,
touchLayer,
{
allowMousePan:()=>
isTabletChartViewport() &&
hasAnyFinePointer(),
shouldBeginGesture:policy.shouldBeginGesture,
shouldAllowPan:policy.shouldAllowPan,
shouldAllowPinch:policy.shouldAllowPinch,
blockChartScroll:()=>probeActive,
onHoldStart:()=>{

probeActive =
true;

opts.chartWrap.classList.add(
"chart-touch-locked"
);

rangeFreeze.freeze();

try{
opts.chart.clearCrosshairPosition();
}catch{
/* ignore */
}

opts.chart.applyOptions({
crosshair:tabletProbeCrosshairOptions(),
handleScroll:{
mouseWheel:false,
pressedMouseMove:false,
horzTouchDrag:false,
vertTouchDrag:false
},
handleScale:{
mouseWheel:false,
pinch:false,
axisPressedMouseMove:{
time:false,
price:false
}
}
});

},
onHoldEnd:()=>{

probeActive =
false;

opts.chartWrap.classList.remove(
"chart-touch-locked"
);

rangeFreeze.unfreeze();

try{
opts.chart.clearCrosshairPosition();
}catch{
/* ignore */
}

try{
opts.chart.applyOptions({
crosshair:normalCrosshairOptions()
});
}catch{
/* ignore */
}

applyTabletMainChartScroll(
opts.chart
);

},
onProbeAt(
clientX,
clientY
){

probeCrosshairAt(
opts.chart,
opts.series,
opts.chartEl,
clientX,
clientY
);

}
}
);

return {
dispose:ctrl.dispose,
abortPan:ctrl.abortPan,
cancelCurrentGesture:ctrl.cancelCurrentGesture
};

}
