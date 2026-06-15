import {
createPriceAlert,
getActiveAlerts,
removeAlert,
finalizeAlertPriceDrag,
setAlertDragLivePrice,
clearAlertDragLivePrice
} from "./alerts.js?v=97";

import {
isCloudLoggedInEffective
} from "./cloud-sync.js?v=34";

import {
getTelegramChatId
} from "./alerts-cloud-sync.js?v=108";

import {
formatPrice,
hideDomChartCrosshair,
hideDomChartCrosshairHorz,
hideDomChartCrosshairVert,
positionDomChartCrosshair
} from "./chart-import.js?v=36";

import {
mountDrawToolIcons
} from "./draw-ui-shared.js?v=21";

const PLUS_ICON_W =
22;

const PLUS_HIT_PAD =
14;

const IS_COARSE_TOUCH =
window.matchMedia?.("(pointer: coarse)")?.matches ||
("ontouchstart" in window);

const TOUCH_PLUS_OFFSET_PX =
28;

const PLUS_NEAR_RADIUS =
18;

const PLUS_SCALE_GAP_PX =
4;

const TOUCH_LINE_HIT_PX =
22;

const LINE_HIT_PX =
10;

function probeHorizTopPx(
y
){

return `${Math.round(y) + 0.5}px`;

}

function isNearPlusButton(
plotX,
plotY,
plusLeft,
crosshairY
){

const cx =
plusLeft +
PLUS_ICON_W /
2;

return (
Math.abs(
plotX -
cx
) <=
PLUS_NEAR_RADIUS &&
Math.abs(
plotY -
crosshairY
) <=
PLUS_NEAR_RADIUS
);

}

function touchGuideEndPx(
plusRightEdge,
plotW
){

if(
Number.isFinite(
plusRightEdge
) &&
plusRightEdge >
0
){
return Math.max(
1,
Math.round(
plusRightEdge
)
);
}

return Math.max(
1,
Math.round(
plotW - PLUS_ICON_W - PLUS_SCALE_GAP_PX
)
);

}

function positionTouchGuideLine(
lineEl,
y,
plotW,
plusRightEdge
){

const end =
touchGuideEndPx(
plusRightEdge,
plotW
);

lineEl.style.top =
probeHorizTopPx(
y
);
lineEl.style.left =
"0px";
lineEl.style.width =
`${end}px`;
lineEl.classList.remove(
"hidden"
);

}

export function mountPriceAlertUi({
chart,
series,
wrapEl,
getSymbol,
getTf,
scheduleRedraw,
onCrosshairSuppress,
onCrosshairRelease
}){

if(
!chart ||
!series ||
!wrapEl
){
return ()=>{};
}

let selectedAlertId =
null;
let dragAlertId =
null;
let suppressPlusClickUntil =
0;
let suppressPlusForScaleDrag =
false;
let plusSubmitInFlight =
false;

const plusBtn =
document.createElement(
"button"
);

plusBtn.type = "button";
plusBtn.className =
"price-alert-scale-plus hidden";
plusBtn.setAttribute(
"aria-label",
"Добавить алерт по цене"
);
plusBtn.innerHTML =
`<span class="price-alert-scale-plus-icon" aria-hidden="true">+</span>`;

const plusPriceHint =
document.createElement(
"div"
);
plusPriceHint.className =
"price-alert-scale-price-hint hidden";
plusPriceHint.setAttribute(
"aria-hidden",
"true"
);

wrapEl.appendChild(
plusBtn
);
wrapEl.appendChild(
plusPriceHint
);

const touchGuideLine =
document.createElement("div");
touchGuideLine.className =
"price-alert-touch-guide hidden";
wrapEl.appendChild(
touchGuideLine
);

const deleteBar =
document.createElement(
"div"
);

deleteBar.className =
"draw-style-float price-alert-style-float hidden";

deleteBar.innerHTML =
`<button type="button" class="float-drag price-alert-style-drag" title="Перетащить панель" aria-label="Перетащить">
<span class="drag-dots"></span>
</button>
<button type="button" class="float-delete price-alert-delete-btn" title="Удалить алерт" aria-label="Удалить алерт">
<img class="draw-tool-icon" data-icon="trash" width="18" height="18" alt="" aria-hidden="true">
</button>`;

document.body.appendChild(
deleteBar
);

mountDrawToolIcons(
deleteBar
);

const deleteBtn =
deleteBar.querySelector(
".price-alert-delete-btn"
);

const deleteBarDragHandle =
deleteBar.querySelector(
".price-alert-style-drag"
);

let alertBarOffset = {
x: 12,
y: -16
};

let alertBarDragging =
false;

let alertBarDragStart = {
x: 0,
y: 0
};

let alertBarStart = {
x: 0,
y: 0
};

function sym(){

return String(
getSymbol?.() ||
""
).trim().toUpperCase();

}

function tf(){

return String(
getTf?.() ||
"60"
);

}

function plotWidth(){

const wrapW =
Math.max(
0,
wrapEl.clientWidth
);

const rawScaleW =
chart.priceScale?.(
"right"
)?.width?.() ||
56;

const safeScaleW =
Math.max(
40,
Math.min(
Math.round(
wrapW * 0.35
),
rawScaleW
)
);

return Math.max(
0,
wrapW - safeScaleW
);

}

function alertsForChart(){

return getActiveAlerts().filter(
row=>
String(
row.symbol
).toUpperCase() ===
sym()
);

}

function alertAt(
shapeId
){

return alertsForChart().find(
row=>
String(
row.shapeId
) ===
String(
shapeId
)
);

}

function hidePlus(
opts = {}
){

plusBtn.classList.add(
"hidden"
);
plusBtn.classList.remove(
"is-near"
);
plusPriceHint.classList.add(
"hidden"
);
plusPriceHint.classList.remove(
"is-near"
);
touchGuideLine.classList.add(
"hidden"
);

hideDomChartCrosshairVert(
wrapEl
);

if(
IS_COARSE_TOUCH ||
opts.release !==
false
){
hideDomChartCrosshairHorz(
wrapEl
);
}

try{
if(
opts.release !==
false
){
onCrosshairRelease?.();
}
}catch{
/* ignore */
}

}

function hideDeleteBar(){

deleteBar.classList.add(
"hidden"
);

}

function syncAlertDeleteBarLayout(
price
){

const wrap =
wrapEl.getBoundingClientRect();

const barW =
deleteBar.offsetWidth ||
72;

const barH =
deleteBar.offsetHeight ||
40;

let top =
wrap.top + alertBarOffset.y;

if(
price !=
null
){

const y =
series.priceToCoordinate(
price
);

if(
y ==
null
){
hideDeleteBar();
return;
}

top =
wrap.top + y + alertBarOffset.y - barH / 2;
}

top =
Math.max(
wrap.top,
Math.min(
wrap.bottom - barH,
top
)
);

const left =
Math.max(
wrap.left,
Math.min(
wrap.right - barW,
wrap.left + alertBarOffset.x
)
);

deleteBar.style.position =
"fixed";
deleteBar.style.left =
`${Math.round(left)}px`;
deleteBar.style.top =
`${Math.round(top)}px`;
deleteBar.style.zIndex =
"10050";

}

function positionDeleteBarFromPrice(
price
){

if(
price ==
null
){
hideDeleteBar();
return;
}

syncAlertDeleteBarLayout(
price
);
deleteBar.classList.remove(
"hidden"
);

}

function positionDeleteBar(
alertRow
){

positionDeleteBarFromPrice(
alertRow.price
);

}

function dispatchAlertsChanged(){

window.dispatchEvent(
new CustomEvent(
"price-alerts-changed",
{
detail:{
symbol: sym()
}
}
)
);

}

function isClientOnChartPlot(
clientX,
clientY
){

const rect =
wrapEl.getBoundingClientRect();
const x =
clientX - rect.left;
const y =
clientY - rect.top;
const pw =
plotWidth();

const rawTimeH =
getComputedStyle(
wrapEl
).getPropertyValue(
"--chart-time-scale-height"
);

const timeH =
Number.isFinite(
parseFloat(
rawTimeH
)
)
? parseFloat(
rawTimeH
)
: 28;

const plotBottom =
Math.max(
0,
rect.height - timeH
);

return (
x >=
0 &&
x <
pw - 0.5 &&
y >=
0 &&
y <=
plotBottom + 0.5
);

}

function isInPriceScaleArea(
clientX,
clientY
){

const rect =
wrapEl.getBoundingClientRect();
const x =
clientX - rect.left;
const y =
clientY - rect.top;
const pw =
plotWidth();

return (
y >= 0 &&
y <= rect.height &&
x >= pw - PLUS_HIT_PAD &&
x <= rect.width + PLUS_HIT_PAD
);

}

function onPointerMove(
e
){

if(dragAlertId){
return;
}

if(
suppressPlusForScaleDrag &&
e.pointerType === "mouse"
){
return;
}

if(
IS_COARSE_TOUCH &&
e.pointerType !== "mouse" &&
!isInPriceScaleArea(
e.clientX,
e.clientY
)
){
return;
}

if(
IS_COARSE_TOUCH &&
e.pointerType === "mouse"
){
return;
}

syncPlusFromClient(
e.clientX,
e.clientY,
{
fromTouch:
IS_COARSE_TOUCH &&
e.pointerType !== "mouse"
}
);

}

function syncPlusFromClient(
clientX,
clientY,
opts = {}
){

const rect =
wrapEl.getBoundingClientRect();
const x =
clientX - rect.left;
const y =
clientY - rect.top;
const pw =
plotWidth();
const scaleW =
rect.width - pw;

if(
!opts.forceShowFromProbe &&
!isClientOnChartPlot(
clientX,
clientY
)
){
hidePlus({
release: false
});
return;
}

const price =
series.coordinateToPrice(y);

if(
price == null ||
!Number.isFinite(price)
){
hidePlus({
release: false
});
return;
}

const showTouchStyle =
opts.fromTouch === true ||
IS_COARSE_TOUCH;
const plusLeft =
Math.round(
pw -
PLUS_ICON_W -
(
showTouchStyle
? TOUCH_PLUS_OFFSET_PX
: PLUS_SCALE_GAP_PX
)
);

plusBtn.style.left =
`${plusLeft}px`;
plusBtn.style.top =
`${y}px`;
plusBtn.style.transform =
"translateY(-50%)";
const plusRightEdge =
plusLeft + PLUS_ICON_W;

plusPriceHint.textContent =
formatPrice(price);
plusPriceHint.style.left =
`${Math.round(pw)}px`;
plusPriceHint.style.width =
`${Math.round(scaleW)}px`;
plusPriceHint.style.top =
`${y}px`;
plusPriceHint.style.transform =
"translateY(-50%)";

plusBtn.dataset.pendingPrice =
String(price);
plusBtn.classList.remove("hidden");
plusPriceHint.classList.remove("hidden");

const inScaleZone =
isInPriceScaleArea(
clientX,
clientY
);

const nearPlus =
inScaleZone ||
(
!IS_COARSE_TOUCH &&
isNearPlusButton(
x,
y,
plusLeft,
y
)
);

plusBtn.classList.toggle(
"is-near",
nearPlus
);
plusPriceHint.classList.toggle(
"is-near",
nearPlus
);

if(
showTouchStyle ||
opts.forceShowFromProbe
){

if(
IS_COARSE_TOUCH &&
opts.forceShowFromProbe
){
touchGuideLine.classList.add(
"hidden"
);
}else{

positionTouchGuideLine(
touchGuideLine,
y,
pw,
plusRightEdge
);

requestAnimationFrame(
()=>{
if(
plusBtn.classList.contains(
"hidden"
)
){
return;
}

positionTouchGuideLine(
touchGuideLine,
y,
pw,
plusRightEdge
);

}
);

}

}else{
touchGuideLine.classList.add(
"hidden"
);
}

if(
!opts.forceShowFromProbe &&
(
IS_COARSE_TOUCH ||
opts.fromTouch ===
true
)
){
positionDomChartCrosshair({
wrapEl,
chart,
series,
clientX,
clientY
});
}

}

async function submitAlertFromPlusTap(
e,
opts = {}
){

e.preventDefault();
e.stopPropagation();

if(
!opts.ignoreSuppressWindow &&
(
e.detail > 1 ||
Date.now() <
suppressPlusClickUntil
)
){
return;
}

if(
plusSubmitInFlight
){
return;
}

plusSubmitInFlight =
true;

try{

const price =
Number(
plusBtn.dataset.pendingPrice
);

hidePlus();

if(
!Number.isFinite(
price
)
){
return;
}

if(
!isCloudLoggedInEffective()
){
window.alert(
"Войдите в аккаунт, чтобы ставить алерты."
);
return;
}

const chatId =
await getTelegramChatId();

if(
chatId == null
){
window.alert(
"Для алертов сначала подключите Telegram Chat ID в настройках (шестерёнка)."
);
return;
}

const row =
await createPriceAlert(
sym(),
price,
tf()
);

if(
row
){
selectedAlertId =
row.shapeId;
positionDeleteBar(
row
);
dispatchAlertsChanged();
scheduleRedraw?.();
window.dispatchEvent(
new CustomEvent(
"chart-probe-crosshair-clear-request"
)
);
}

}finally{
plusSubmitInFlight =
false;
}

}

plusBtn.addEventListener(
"click",
submitAlertFromPlusTap
);

plusBtn.addEventListener(
"touchend",
e=>{
suppressPlusClickUntil =
Date.now() + 450;
void submitAlertFromPlusTap(
e,
{
ignoreSuppressWindow: true
}
);
}
);

plusBtn.addEventListener(
"pointerdown",
e=>{
e.stopPropagation();
}
);

plusBtn.addEventListener(
"pointermove",
e=>{

if(
!IS_COARSE_TOUCH
){
return;
}

positionDomChartCrosshair({
wrapEl,
chart,
series,
clientX: e.clientX,
clientY: e.clientY
});

}
);

const onWrapPointerLeave =
e=>{

if(
IS_COARSE_TOUCH ||
e?.pointerType === "touch"
){
return;
}

if(
dragAlertId
){
return;
}

hidePlus();

};

wrapEl.addEventListener(
"pointerleave",
onWrapPointerLeave
);

const onProbeCrosshair =
e=>{

if(
!IS_COARSE_TOUCH
){
return;
}

if(
!e?.detail?.active
){
hidePlus({
release: false
});
return;
}

const x =
Number(e.detail.clientX);
const y =
Number(e.detail.clientY);

if(
!Number.isFinite(x) ||
!Number.isFinite(y)
){
return;
}

syncPlusFromClient(
x,
y,
{
fromTouch: true,
forceShowFromProbe: true
}
);

};

window.addEventListener(
"chart-probe-crosshair",
onProbeCrosshair
);

const onWrapDoubleClick =
e=>{

if(
!isInPriceScaleArea(
e.clientX,
e.clientY
)
){
return;
}

suppressPlusClickUntil =
Date.now() + 500;
hidePlus();

};

wrapEl.addEventListener(
"dblclick",
onWrapDoubleClick,
true
);

function deleteSelectedAlert(){

if(
!selectedAlertId
){
return;
}

removeAlert(
sym(),
selectedAlertId
);
selectedAlertId =
null;
hideDeleteBar();
dispatchAlertsChanged();
scheduleRedraw?.();

}

deleteBtn?.addEventListener(
"click",
e=>{

e.preventDefault();
e.stopPropagation();
deleteSelectedAlert();

}
);

deleteBtn?.addEventListener(
"touchend",
e=>{

e.preventDefault();
e.stopPropagation();
deleteSelectedAlert();

},
{ passive: false }
);

deleteBarDragHandle?.addEventListener(
"pointerdown",
e=>{

if(
e.pointerType ===
"mouse" &&
e.button !==
0
){
return;
}

if(
!e.isPrimary
){
return;
}

e.preventDefault();
e.stopPropagation();

alertBarDragging =
true;
alertBarDragStart = {
x: e.clientX,
y: e.clientY
};

const barR =
deleteBar.getBoundingClientRect();

alertBarStart = {
x: barR.left,
y: barR.top
};

try{
deleteBarDragHandle.setPointerCapture(
e.pointerId
);
}catch{
/* ignore */
}

}
);

function onAlertBarDragMove(
e
){

if(
!alertBarDragging
){
return;
}

const wrap =
wrapEl.getBoundingClientRect();
const barW =
deleteBar.offsetWidth ||
72;
const barH =
deleteBar.offsetHeight ||
40;

const dx =
e.clientX - alertBarDragStart.x;
const dy =
e.clientY - alertBarDragStart.y;

let fx =
alertBarStart.x + dx;
let fy =
alertBarStart.y + dy;

fx =
Math.max(
wrap.left,
Math.min(
wrap.right - barW,
fx
)
);

fy =
Math.max(
wrap.top,
Math.min(
wrap.bottom - barH,
fy
)
);

deleteBar.style.left =
`${Math.round(fx)}px`;
deleteBar.style.top =
`${Math.round(fy)}px`;

}

function onAlertBarDragEnd(){

if(
!alertBarDragging
){
return;
}

alertBarDragging =
false;

const wrap =
wrapEl.getBoundingClientRect();
const barR =
deleteBar.getBoundingClientRect();
const row =
selectedAlertId
? alertAt(
selectedAlertId
)
: null;

alertBarOffset.x =
barR.left - wrap.left;

if(
row
){

const lineY =
series.priceToCoordinate(
row.price
);

const barH =
deleteBar.offsetHeight ||
40;

if(
lineY !=
null
){
alertBarOffset.y =
barR.top - (
wrap.top + lineY - barH / 2
);
}else{
alertBarOffset.y =
barR.top - wrap.top;
}

}else{
alertBarOffset.y =
barR.top - wrap.top;
}

}

window.addEventListener(
"pointermove",
onAlertBarDragMove
);

window.addEventListener(
"pointerup",
onAlertBarDragEnd
);

window.addEventListener(
"pointercancel",
onAlertBarDragEnd
);

window.addEventListener(
"resize",
()=>{
if(
selectedAlertId &&
!deleteBar.classList.contains(
"hidden"
)
){
const row =
alertAt(
selectedAlertId
);
if(
row
){
syncAlertDeleteBarLayout(
row.price
);
}
}
}
);

const scaleStripEl =
document.getElementById(
"price-scale-touch-strip"
);

function onScaleStripPointerDown(
e
){

if(
dragAlertId
){
return;
}

hidePlus({
release: false
});

}

if(
scaleStripEl
){
scaleStripEl.addEventListener(
"pointerdown",
onScaleStripPointerDown,
true
);
}

const onKeyDown =
e=>{

if(
e.key !==
"Delete" &&
e.key !==
"Backspace"
){
return;
}

const ae =
document.activeElement;
const tag =
ae?.tagName;

if(
tag ===
"INPUT" ||
tag ===
"TEXTAREA" ||
ae?.isContentEditable
){
return;
}

if(
!selectedAlertId
){
return;
}

e.preventDefault();
deleteSelectedAlert();

};

window.addEventListener(
"keydown",
onKeyDown
);

function hitTestAlert(
x,
y
){

const hitPx =
IS_COARSE_TOUCH
? TOUCH_LINE_HIT_PX
: LINE_HIT_PX;

const row =
alertsForChart().find(
alert=>{

const lineY =
series.priceToCoordinate(
alert.price
);

if(
lineY ==
null
){
return false;
}

return (
x >=
0 &&
x <=
plotWidth() &&
Math.abs(
y -
lineY
) <=
hitPx
);

});

return row ||
null;

}

function onWrapPointerDown(
e
){

if(
e.button !==
0
){
return;
}

const rect =
wrapEl.getBoundingClientRect();
const x =
e.clientX -
rect.left;
const y =
e.clientY -
rect.top;

if(
plusBtn.contains(
e.target
) ||
deleteBar.contains(
e.target
)
){
return;
}

if(
e.pointerType === "mouse" &&
isInPriceScaleArea(
e.clientX,
e.clientY
)
){
suppressPlusForScaleDrag =
true;
hidePlus({
release: false
});
return;
}

const hit =
hitTestAlert(
x,
y
);

if(
!hit
){
selectedAlertId =
null;
hideDeleteBar();
return;
}

selectedAlertId =
hit.shapeId;
positionDeleteBar(
hit
);
dragAlertId =
hit.shapeId;
setAlertDragLivePrice(
dragAlertId,
hit.price
);

try{
onCrosshairSuppress?.();
}catch{
/* ignore */
}

hideDomChartCrosshair(
wrapEl
);

try{
chart.clearCrosshairPosition();
}catch{
/* ignore */
}

try{
wrapEl.setPointerCapture(
e.pointerId
);
}catch{
/* ignore */
}

e.preventDefault();
e.stopPropagation();

}

function onWrapPointerMove(
e
){

if(
!dragAlertId
){
return;
}

const rect =
wrapEl.getBoundingClientRect();

const localY =
e.clientY -
rect.top;

const price =
series.coordinateToPrice(
localY
);

if(
price ==
null ||
!Number.isFinite(
price
)
){
return;
}

setAlertDragLivePrice(
dragAlertId,
price
);

positionDeleteBarFromPrice(
price
);

try{
chart.clearCrosshairPosition();
}catch{
/* ignore */
}

scheduleRedraw?.();

}

function onWrapPointerUp(
e
){

if(
suppressPlusForScaleDrag
){
suppressPlusForScaleDrag =
false;
}

if(
!dragAlertId
){
return;
}

const rect =
wrapEl.getBoundingClientRect();
const localY =
e.clientY -
rect.top;
const price =
series.coordinateToPrice(
localY
);

if(
Number.isFinite(
price
)
){
finalizeAlertPriceDrag(
sym(),
dragAlertId,
price,
tf()
);
dispatchAlertsChanged();
}

clearAlertDragLivePrice(
dragAlertId
);

try{
wrapEl.releasePointerCapture(
e.pointerId
);
}catch{
/* ignore */
}

try{
onCrosshairRelease?.();
}catch{
/* ignore */
}

dragAlertId =
null;
suppressPlusForScaleDrag =
false;
scheduleRedraw?.();

}

wrapEl.addEventListener(
"pointermove",
onPointerMove,
true
);

wrapEl.addEventListener(
"pointerdown",
onWrapPointerDown,
true
);

window.addEventListener(
"pointermove",
onWrapPointerMove
);

window.addEventListener(
"pointerup",
onWrapPointerUp
);

window.addEventListener(
"pointercancel",
onWrapPointerUp
);

window.addEventListener(
"price-alerts-changed",
()=>{
if(
selectedAlertId &&
!alertAt(
selectedAlertId
)
){
selectedAlertId =
null;
hideDeleteBar();
}
}
);

return ()=>{

wrapEl.removeEventListener(
"pointermove",
onPointerMove,
true
);

wrapEl.removeEventListener(
"pointerdown",
onWrapPointerDown,
true
);

wrapEl.removeEventListener(
"dblclick",
onWrapDoubleClick,
true
);

wrapEl.removeEventListener(
"pointerleave",
onWrapPointerLeave
);

window.removeEventListener(
"chart-probe-crosshair",
onProbeCrosshair
);

window.removeEventListener(
"pointermove",
onWrapPointerMove
);

window.removeEventListener(
"pointerup",
onWrapPointerUp
);

window.removeEventListener(
"pointercancel",
onWrapPointerUp
);

window.removeEventListener(
"keydown",
onKeyDown
);

window.removeEventListener(
"pointermove",
onAlertBarDragMove
);

window.removeEventListener(
"pointerup",
onAlertBarDragEnd
);

window.removeEventListener(
"pointercancel",
onAlertBarDragEnd
);

plusBtn.remove();
plusPriceHint.remove();
deleteBar.remove();
touchGuideLine.remove();

if(
scaleStripEl
){
scaleStripEl.removeEventListener(
"pointerdown",
onScaleStripPointer,
true
);
scaleStripEl.removeEventListener(
"pointermove",
onScaleStripPointer,
true
);
}

};

}
