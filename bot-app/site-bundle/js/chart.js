export {
formatPrice,
formatChartPrice,
priceDecimalPlaces,
priceFormatForValue,
applyChartPriceFormat,
CHART_PRICE_SCALE_WIDTH,
CHART_PRICE_SCALE_WIDTH_TOUCH,
CHART_TIME_SCALE_HEIGHT,
CHART_SCALE_TEXT_COLOR,
CHART_SCALE_TEXT_ON_LIGHT_BG,
CHART_SCALE_FONT_SIZE,
CHART_SCALE_FONT_SIZE_TOUCH,
CHART_SCALE_FONT_FAMILY,
CHART_SCALE_LABEL_PAD_LEFT,
CHART_SCALE_LABEL_LINE_HEIGHT,
chartScaleFont,
scaleLabelTextColorForBackground,
chartScaleTextLeftPx,
hiddenCrosshairOptions,
normalCrosshairOptions,
mainChartCrosshairOptions,
fullCrosshairOptions,
tabletProbeCrosshairOptions,
hasAnyFinePointer,
syncTabletFinePointerClass,
isCoarseTouchViewport,
effectiveChartPriceScaleWidth,
effectiveChartScaleFontSize,
isTabletChartViewport
} from "./chart/chart-options.js?v=7";

export {
ensureDomChartCrosshair,
positionDomChartCrosshair,
positionDomChartCrosshairHorz,
hideDomChartCrosshair,
hideDomChartCrosshairHorz,
hideDomChartCrosshairVert,
ensureTabletProbeHorizLine,
positionTabletProbeCrosshair,
positionTabletProbeHorizInStack,
hideTabletProbeCrosshair,
formatCrosshairTimeLabel,
isUserCrosshairEvent
} from "./chart/chart-dom-crosshair.js?v=15";

import {
TABLET_LW_NATIVE_PRICE_SCALE,
clearTabletProbeCrosshairForChart
} from "./chart/chart-factory.js?v=47";

export {
createCandlestickChart,
createScreenerChart,
createRSIChart,
applyRsiFixedPriceScale,
RSI_FIXED_PRICE_RANGE,
createVolumeChart,
SCREENER_VISIBLE_BARS,
SCREENER_MAX_BARS,
SCREENER_LOAD_BARS,
applyDashboardZoom,
applyScreenerZoom,
restoreScreenerViewport,
mountChartRangeFreeze,
linkChartsCrosshair,
linkPairedChartTimeScales,
syncLinkedChartPriceScales,
syncLinkedChartTimescales,
TABLET_USE_CUSTOM_TOUCH_PAN,
TABLET_LW_NATIVE_PRICE_SCALE,
applyTabletRsiChartOptions,
applyTabletMainChartScroll,
markTabletChartBody,
isTabletEventOnPriceScale,
updateRsiBandLayout,
updateRsiLevelLinesLayout,
tfPeriodSec,
rsiPlotTimeOffsetSec,
mountChartPriceHud,
applyChartScaleWidthCss,
clearTabletProbeCrosshairForChart,
computeChartFutureMarginBars,
appendFutureWhitespaceBars,
coinsTfVisibleBars,
applyCoinsChartViewport,
refreshCoinsChartBarSpacing
} from "./chart/chart-factory.js?v=47";

/* Tablet gestures: import ./chart-tablet-gestures.js only from tablet paths
   (tablet-widget-chart / terminal-tablet-controller) — never re-export here. */

import {
effectiveChartPriceScaleWidth,
CHART_TIME_SCALE_HEIGHT,
isTabletChartViewport
} from "./chart/chart-options.js?v=7";


export const DEFAULT_PRICE_SCALE_MARGINS =
Object.freeze({
top:0.12,
bottom:0.12
});

export function isChartPriceScaleLogarithmic(
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

/**
 * Log-шкала: min > 0. Иначе LW рисует отрицательные «цены».
 */
export function sanitizeAutoscalePriceRange(
chart,
min,
max
){

if(
!Number.isFinite(
min
) ||
!Number.isFinite(
max
)
){
return null;
}

let lo =
Math.min(
min,
max
);

let hi =
Math.max(
min,
max
);

if(
hi ===
lo
){
const bump =
Math.max(
Math.abs(
hi
) *
0.01,
1e-8
);

lo -= bump;
hi += bump;
}

if(
isChartPriceScaleLogarithmic(
chart
)
){

const floor =
Math.max(
hi *
1e-8,
1e-12
);

if(
lo <=
0
){
lo =
floor;
}

if(
hi <=
lo
){
hi =
lo *
1.02;
}

}

return {
min:lo,
max:hi
};

}

export function getVisibleCandlesPriceRange(
chart,
series
){

const data =
series?.data?.();

if(
!chart ||
!data?.length
){
return null;
}

const range =
chart.timeScale().getVisibleLogicalRange();

let from =
0;

let to =
data.length - 1;

if(
range
){

from =
Math.max(
0,
Math.floor(
range.from
)
);

to =
Math.min(
data.length - 1,
Math.ceil(
range.to
)
);

}

if(
from >
to
){
return null;
}

let min =
Infinity;

let max =
-Infinity;

for(
let i =
from;
i <=
to;
i++
){

const bar =
data[
i
];

const close =
bar?.close;

if(
close ==
null ||
!Number.isFinite(
close
)
){
continue;
}

if(
close <
min
){
min =
close;
}

if(
close >
max
){
max =
close;
}

}

if(
!Number.isFinite(
min
) ||
!Number.isFinite(
max
)
){
return null;
}

const span =
Math.max(
max - min,
max *
0.02,
1e-8
);

const wickLo =
min - span *
0.35;

const wickHi =
max + span *
0.35;

for(
let i =
from;
i <=
to;
i++
){

const bar =
data[
i
];

if(
!bar
){
continue;
}

if(
Number.isFinite(
bar.low
) &&
bar.low >=
wickLo &&
bar.low <
min
){
min =
bar.low;
}

if(
Number.isFinite(
bar.high
) &&
bar.high <=
wickHi &&
bar.high >
max
){
max =
bar.high;
}

}

const pad =
span *
0.08;

return sanitizeAutoscalePriceRange(
chart,
min - pad,
max + pad
);

}


export function resetChartPriceAutoScale(
chart,
series,
options =
{}
){

if(
!chart
){
return;
}

const margins =
options.scaleMargins ??
DEFAULT_PRICE_SCALE_MARGINS;

try{
chart.priceScale(
"right"
).applyOptions({
autoScale:true,
scaleMargins:{
top:margins.top,
bottom:margins.bottom
}
});
}catch{
/* ignore */
}

}

/** Сброс залипшего ручного диапазона — пересчёт autoscale LW (смена монеты). */
export function pulsePriceScaleAutoscale(
chart,
series,
options =
{}
){

resetChartPriceAutoScale(
chart,
series,
options
);

if(
!chart
){
return;
}

try{
const ps =
chart.priceScale(
"right"
);

ps.applyOptions({
autoScale:false
});

const margins =
options.scaleMargins ??
DEFAULT_PRICE_SCALE_MARGINS;

ps.applyOptions({
autoScale:true,
scaleMargins:{
top:margins.top,
bottom:margins.bottom
}
});
}catch{
/* ignore */
}

}

/**
 * Двойной тап / двойной клик по шкале → onReset (автомасштаб и т.п.)
 */
export function mountAxisDoubleTapReset(
targetEl,
onReset
){

if(
!targetEl ||
typeof onReset !==
"function"
){
return ()=>{};
}

const DBL_MS =
320;

const DBL_PX =
28;

let lastTap =
null;

let lastTapTimer =
0;

function clearLastTap(){

lastTap = null;

if(
lastTapTimer
){
clearTimeout(
lastTapTimer
);

lastTapTimer = 0;

}

}

function tryDoubleTap(
e
){

const now =
Date.now();

const x =
e.clientX;
const y =
e.clientY;

if(
lastTap &&
now - lastTap.t <=
DBL_MS
){

const dx =
x - lastTap.x;
const dy =
y - lastTap.y;

if(
dx * dx + dy * dy <=
DBL_PX * DBL_PX
){
clearLastTap();
e.preventDefault();
e.stopPropagation();
onReset(
e
);
return true;

}

}

if(
lastTapTimer
){
clearTimeout(
lastTapTimer
);

}

lastTap = {
t:now,
x,
y
};

lastTapTimer =
setTimeout(
clearLastTap,
DBL_MS + 80
);

return false;

}

function onPointerDown(
e
){

if(
e.pointerType ===
"mouse" &&
e.button !==
0
){
return;
}

tryDoubleTap(
e
);

}

function onDblClick(
e
){

clearLastTap();
e.preventDefault();
e.stopPropagation();
onReset(
e
);

}

targetEl.addEventListener(
"pointerdown",
onPointerDown,
{ passive:false }
);

targetEl.addEventListener(
"dblclick",
onDblClick
);

return ()=>{

targetEl.removeEventListener(
"pointerdown",
onPointerDown,
{ passive:false }
);

targetEl.removeEventListener(
"dblclick",
onDblClick
);

clearLastTap();

};

}


/**
 * iPad: вертикальный зум и двойной тап по полосе шкалы (восстановлено из рабочей версии).
 */
export function mountTabletPriceScaleTouch(
chart,
stripEl,
chartEl,
series,
callbacks
){

if(
!series ||
typeof series.coordinateToPrice !==
"function"
){
callbacks =
series ||
{};
series =
null;
}

if(
!chart ||
!stripEl ||
!chartEl ||
!series
){
return {
dispose:()=>{},
resetPriceAutoScale:()=>
resetChartPriceAutoScale(
chart,
series
)
};
}

const hooks =
typeof callbacks ===
"function"
? { onInteraction: callbacks }
: (
callbacks ||
{}
);

let drag =
null;

let margins =
{
top:DEFAULT_PRICE_SCALE_MARGINS.top,
bottom:DEFAULT_PRICE_SCALE_MARGINS.bottom
};

function effectiveScaleMargins(){

return {
top:
hooks.scaleMargins?.top ??
DEFAULT_PRICE_SCALE_MARGINS.top,
bottom:
hooks.scaleMargins?.bottom ??
DEFAULT_PRICE_SCALE_MARGINS.bottom
};

}

function fixedAutoscaleRange(){

const fixed =
hooks.fixedAutoscaleRange;

if(
!fixed ||
!Number.isFinite(
fixed.min
) ||
!Number.isFinite(
fixed.max
)
){
return null;
}

return {
minValue:
fixed.min,
maxValue:
fixed.max
};

}

const STRIP_DRAG_START_PX =
10;

/** iOS Safari: dblclick по canvas не приходит; LW тоже слушает dblclick */
const SCALE_DBL_TAP_MS =
550;

const SCALE_DBL_TAP_PX =
48;

const useLwNativeScale =
TABLET_LW_NATIVE_PRICE_SCALE &&
isTabletChartViewport();

const touchTargetEl =
stripEl;

let priceZoomRange =
null;

let scaleLastTap =
null;

let scaleTapTimer =
0;

let scaleResetAt =
0;

let scaleTouchEndAt =
0;

let suppressStripPointerUntil =
0;

function suppressStripPointerBriefly(){

suppressStripPointerUntil =
Date.now() +
450;

}

function clearScaleLastTap(){

scaleLastTap = null;

if(
scaleTapTimer
){
clearTimeout(
scaleTapTimer
);
scaleTapTimer = 0;
}

}

function isScaleZoneEvent(
clientX,
clientY,
sourceEvent
){

if(
isScaleStripTarget(
sourceEvent
)
){
return true;
}

return isTabletEventOnPriceScale(
chartEl,
{
clientX,
clientY,
touches:[
{
clientX,
clientY
}
]
},
chart
);

}

/**
 * Двойной тап по шкале — на touchend (надёжнее touchstart на iOS).
 * @returns {boolean} true если сработал сброс
 */
function tryScaleZoneDoubleTapAt(
clientX,
clientY,
sourceEvent
){

if(
clientX ==
null ||
clientY ==
null
){
return false;
}

if(
!isScaleZoneEvent(
clientX,
clientY,
sourceEvent
)
){
return false;
}

const now =
Date.now();

if(
scaleLastTap &&
now - scaleLastTap.t <=
SCALE_DBL_TAP_MS
){

const dx =
clientX - scaleLastTap.x;

const dy =
clientY - scaleLastTap.y;

if(
dx * dx + dy * dy <=
SCALE_DBL_TAP_PX * SCALE_DBL_TAP_PX
){
clearScaleLastTap();
resetStripPriceAutoScale({
force:true
});
return true;

}

}

if(
scaleTapTimer
){
clearTimeout(
scaleTapTimer
);
}

scaleLastTap = {
t:now,
x:clientX,
y:clientY
};

scaleTapTimer =
setTimeout(
clearScaleLastTap,
SCALE_DBL_TAP_MS + 60
);

return false;

}

function tryScaleZoneDoubleTap(
e
){

const pt =
e.changedTouches?.[
0
] ||
e;

return tryScaleZoneDoubleTapAt(
pt.clientX,
pt.clientY,
e
);

}

function resetStripPriceAutoScale(
options = {}
){

const force =
!!options.force;

const now =
Date.now();

if(
!force &&
now - scaleResetAt <
350
){
return;
}

scaleResetAt =
now;

didApplyZoomThisGesture =
false;

abortDrag();
stripPointerDown =
null;
stripDidDrag =
false;
detachDocListeners();
clearScaleLastTap();

margins =
effectiveScaleMargins();

priceZoomRange =
null;

pulsePriceScaleAutoscale(
chart,
series,
{
scaleMargins:
margins
}
);

clearTabletProbeCrosshairForChart(
chart
);

hooks.onReset?.();
hooks.onDragEnd?.();
hooks.onInteraction?.();

}

function captureVisiblePriceRange(){

const chartH =
Math.max(
1,
Math.floor(
chartEl.clientHeight ||
0
)
);

readMargins();

const plotTop =
chartH * margins.top;

const plotBottom =
chartH * (
1 - margins.bottom
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
priceAtTop ==
null ||
priceAtBottom ==
null
){

const fallback =
hooks.getFallbackPriceRange?.() ||
getVisibleCandlesPriceRange(
chart,
series
);

if(
fallback
){
return fallback;
}

return null;

}

const min =
Math.min(
priceAtTop,
priceAtBottom
);

const max =
Math.max(
priceAtTop,
priceAtBottom
);

if(
!Number.isFinite(min) ||
!Number.isFinite(max) ||
min ===
max
){
return null;
}

return {
min,
max
};

}

let tabletAutoscaleProviderInstalled =
false;

function installTabletAutoscaleInfoProvider(){

if(
tabletAutoscaleProviderInstalled
){
return;
}

try{
series.applyOptions({
autoscaleInfoProvider:(
original
)=>{

if(
!priceZoomRange
){

const fixed =
fixedAutoscaleRange();

if(
fixed
){
return {
priceRange:
fixed
};
}

return original();

}

const safe =
sanitizeAutoscalePriceRange(
chart,
priceZoomRange.min,
priceZoomRange.max
);

if(
!safe
){
return original();
}

return {
priceRange:{
minValue:safe.min,
maxValue:safe.max
}
};

}
});
tabletAutoscaleProviderInstalled =
true;
}catch{
/* ignore */
}

}

function notifyChartPriceRangeChanged(){

try{
chart.priceScale(
"right"
).applyOptions({
autoScale:true,
scaleMargins:{
top:margins.top,
bottom:margins.bottom
}
});
}catch{
/* ignore */
}

}

function scaleFramePayload(){

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

function notifyScaleFrame(){

const payload =
scaleFramePayload();

if(
payload
){
hooks.onScaleFrame?.(
payload
);
}

}

function zoomVisiblePriceRange(
dy
){

if(
!priceZoomRange
){
priceZoomRange =
captureVisiblePriceRange();

if(
!priceZoomRange
){
return;
}

}

const zoomFactor =
Math.exp(
dy * 0.003
);

const logScale =
isChartPriceScaleLogarithmic(
chart
);

if(
logScale &&
priceZoomRange.min >
0 &&
priceZoomRange.max >
0
){

const logMin =
Math.log(
priceZoomRange.min
);

const logMax =
Math.log(
priceZoomRange.max
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
logHalf / zoomFactor;

priceZoomRange.min =
Math.exp(
logMid - newHalf
);

priceZoomRange.max =
Math.exp(
logMid + newHalf
);

}else{

const mid =
(
priceZoomRange.min +
priceZoomRange.max
) /
2;

const half =
(
priceZoomRange.max -
priceZoomRange.min
) /
2;

const newHalf =
half / zoomFactor;

priceZoomRange.min =
mid - newHalf;

priceZoomRange.max =
mid + newHalf;

}

const safeZoom =
sanitizeAutoscalePriceRange(
chart,
priceZoomRange.min,
priceZoomRange.max
);

if(
safeZoom
){
priceZoomRange.min =
safeZoom.min;
priceZoomRange.max =
safeZoom.max;
}

notifyChartPriceRangeChanged();

}

function readMargins(){

try{

const o =
chart.priceScale(
"right"
).options();

margins.top =
o.scaleMargins?.top ??
0.12;

margins.bottom =
o.scaleMargins?.bottom ??
0.12;

}catch{
/* ignore */
}

}

let onDocMove =
null;

let onDocEnd =
null;

let onDocTouchMove =
null;

let onDocTouchEnd =
null;

const touchOpts = {
passive:false
};

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
onDocEnd
){

document.removeEventListener(
"pointerup",
onDocEnd
);

document.removeEventListener(
"pointercancel",
onDocEnd
);

onDocEnd = null;

}

if(
onDocTouchMove
){

document.removeEventListener(
"touchmove",
onDocTouchMove
);

onDocTouchMove = null;

}

if(
onDocTouchEnd
){

document.removeEventListener(
"touchend",
onDocTouchEnd
);

document.removeEventListener(
"touchcancel",
onDocTouchEnd
);

onDocTouchEnd = null;

}

}

function abortDrag(){

if(
!drag
){
return;
}

const hadZoom =
didApplyZoomThisGesture;

drag =
null;

if(
hadZoom
){
hooks.onDragEnd?.();
}

}

function endDrag(
e
){

if(
!drag
){
return;
}

if(
e?.pointerId !== undefined &&
e.pointerId !== drag.id
){
return;
}

abortDrag();

}

function ensureStripZoomActive(){

readMargins();

if(
!priceZoomRange
){
priceZoomRange =
captureVisiblePriceRange();
}

if(
!priceZoomRange
){
return;
}

notifyChartPriceRangeChanged();

hooks.onDragStart?.(
scaleFramePayload()
);

}

function applyVerticalScaleDrag(
dy
){

ensureStripZoomActive();

if(
!didApplyZoomThisGesture
){
didApplyZoomThisGesture =
true;
clearScaleLastTap();
}

zoomVisiblePriceRange(
dy
);

notifyChartPriceRangeChanged();

hooks.onInteraction?.();
notifyScaleFrame();

}

let stripPointerDown =
null;

let stripDidDrag =
false;

let didApplyZoomThisGesture =
false;

function isScaleStripTarget(
e
){

return !!(
stripEl &&
e?.target &&
stripEl.contains(
e.target
)
);

}

function canStartScaleDrag(
e
){

if(
isScaleStripTarget(
e
)
){
return true;
}

return isTabletEventOnPriceScale(
chartEl,
e,
chart
);

}

function beginScaleStripInteraction(
clientX,
clientY,
pointerId,
sourceEvent
){

if(
!canStartScaleDrag(
sourceEvent
)
){
return false;
}

clearTabletProbeCrosshairForChart(
chart
);

stripPointerDown = {
id:
pointerId ??
0,
x:clientX,
y:clientY
};

stripDidDrag =
false;

didApplyZoomThisGesture =
false;

attachScaleDragDocListeners();

return true;

}

function handleScaleDragMove(
clientY,
pointerId = 0
){

if(
!stripPointerDown
){
return;
}

if(
!drag
){

if(
Math.abs(
clientY -
stripPointerDown.y
) <
STRIP_DRAG_START_PX
){
return;
}

stripDidDrag =
true;

drag = {
id:
pointerId ??
0,
y:clientY
};

return;

}

if(
!drag
){
return;
}

const moveDy =
clientY - drag.y;

drag.y =
clientY;

if(
Math.abs(moveDy) <
0.5
){
return;
}

applyVerticalScaleDrag(
moveDy
);

}

function finishScaleStripInteraction(
endEvent
){

if(
!stripPointerDown ||
!(
endEvent?.pointerId ===
undefined ||
endEvent.pointerId ===
stripPointerDown.id ||
endEvent?.type ===
"touchend" ||
endEvent?.type ===
"touchcancel"
)
){
return;
}

const hadZoomThisGesture =
didApplyZoomThisGesture;

didApplyZoomThisGesture =
false;

if(
!hadZoomThisGesture
){

const pt =
endEvent.changedTouches?.[
0
] ||
endEvent;

if(
tryScaleZoneDoubleTapAt(
pt.clientX,
pt.clientY,
endEvent
)
){
abortDrag();
stripPointerDown =
null;
stripDidDrag =
false;
detachDocListeners();
suppressStripPointerBriefly();
return;
}

}

abortDrag();
stripPointerDown =
null;
stripDidDrag =
false;
detachDocListeners();

}

function attachScaleDragDocListeners(){

if(
onDocMove
){
return;
}

onDocMove =(
moveEvent
)=>{

if(
!stripPointerDown
){
return;
}

if(
moveEvent.pointerId !==
undefined &&
moveEvent.pointerId !==
stripPointerDown.id
){
return;
}

handleScaleDragMove(
moveEvent.clientY,
stripPointerDown.id
);

moveEvent.preventDefault?.();

};

onDocEnd =(
endEvent
)=>{

finishScaleStripInteraction(
endEvent
);

};

onDocTouchMove =(
moveEvent
)=>{

if(
!stripPointerDown ||
!moveEvent.touches ||
moveEvent.touches.length !==
1
){
return;
}

const t =
moveEvent.touches[0];

handleScaleDragMove(
t.clientY,
stripPointerDown.id
);

moveEvent.preventDefault();

};

onDocTouchEnd =(
endEvent
)=>{

finishScaleStripInteraction(
endEvent
);

};

document.addEventListener(
"pointermove",
onDocMove,
touchOpts
);

document.addEventListener(
"pointerup",
onDocEnd
);

document.addEventListener(
"pointercancel",
onDocEnd
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

}

function onPointerDown(
e
){

if(
e.pointerType ===
"mouse"
){
return;
}

if(
Date.now() <
suppressStripPointerUntil
){
return;
}

if(
stripPointerDown
){
return;
}

if(
beginScaleStripInteraction(
e.clientX,
e.clientY,
e.pointerId ??
0,
e
)
){
try{
e.preventDefault();
e.stopPropagation();
}catch{
/* ignore */
}
}

}

function onStripTouchStart(
e
){

if(
useLwNativeScale
){
return;
}

if(
!e.touches ||
e.touches.length !==
1
){
return;
}

const t =
e.touches[0];

if(
Date.now() <
suppressStripPointerUntil
){
return;
}

if(
beginScaleStripInteraction(
t.clientX,
t.clientY,
0,
{
...e,
target:e.target,
clientX:t.clientX,
clientY:t.clientY
}
)
){
try{
e.preventDefault();
e.stopImmediatePropagation?.();
}catch{
/* ignore */
}
}

}

function onStripTouchMove(
e
){

if(
useLwNativeScale ||
!stripPointerDown
){
return;
}

if(
!e.touches ||
e.touches.length !==
1
){
return;
}

const t =
e.touches[0];

handleScaleDragMove(
t.clientY,
stripPointerDown.id
);

try{
e.preventDefault();
}catch{
/* ignore */
}

}

function onScaleTouchEnd(
e
){

if(
useLwNativeScale
){
scaleTouchEndAt =
Date.now();

tryScaleZoneDoubleTap(
e
);
return;
}

finishScaleStripInteraction(
e
);

}

function onChartScaleDblClick(
e
){

if(
useLwNativeScale &&
!isTabletEventOnPriceScale(
chartEl,
e
)
){
return;
}

abortDrag();
resetStripPriceAutoScale({
force:true
});

}

function onChartScaleTouchEnd(
e
){

if(
!useLwNativeScale
){
return;
}

if(
!isTabletEventOnPriceScale(
chartEl,
e
)
){
return;
}

scaleTouchEndAt =
Date.now();

tryScaleZoneDoubleTap(
e
);

}

if(
useLwNativeScale
){
stripEl.setAttribute(
"aria-hidden",
"true"
);
}else{
stripEl.removeAttribute(
"aria-hidden"
);
}

installTabletAutoscaleInfoProvider();

const stripCap = {
capture:true,
passive:false
};

touchTargetEl.addEventListener(
"touchstart",
onStripTouchStart,
stripCap
);

touchTargetEl.addEventListener(
"touchmove",
onStripTouchMove,
stripCap
);

touchTargetEl.addEventListener(
"pointerdown",
onPointerDown,
stripCap
);

touchTargetEl.addEventListener(
"dblclick",
onChartScaleDblClick
);

touchTargetEl.addEventListener(
"touchend",
onScaleTouchEnd,
{
capture:true,
passive:false
}
);

chartEl.addEventListener(
"touchend",
onChartScaleTouchEnd,
{
capture:true,
passive:false
}
);

const dispose = ()=>{

clearScaleLastTap();

touchTargetEl.removeEventListener(
"touchstart",
onStripTouchStart,
stripCap
);

touchTargetEl.removeEventListener(
"touchmove",
onStripTouchMove,
stripCap
);

touchTargetEl.removeEventListener(
"pointerdown",
onPointerDown,
stripCap
);

touchTargetEl.removeEventListener(
"dblclick",
onChartScaleDblClick
);

touchTargetEl.removeEventListener(
"touchend",
onScaleTouchEnd,
{
capture:true,
passive:false
}
);

chartEl.removeEventListener(
"touchend",
onChartScaleTouchEnd,
{
capture:true,
passive:false
}
);

abortDrag();

};

return {
dispose,
resetPriceAutoScale:resetStripPriceAutoScale,
isScaleDragging:()=>!!drag
};

}

