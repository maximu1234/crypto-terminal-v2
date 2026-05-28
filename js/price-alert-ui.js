import {
createPriceAlert,
getActiveAlerts,
removeAlert,
finalizeAlertPriceDrag,
setAlertDragLivePrice,
clearAlertDragLivePrice
} from "./alerts.js?v=95";

import {
isCloudLoggedInEffective
} from "./cloud-sync.js?v=26";

import {
getTelegramChatId
} from "./alerts-cloud-sync.js?v=97";

import {
formatPrice,
hideDomChartCrosshair,
positionDomChartCrosshair
} from "./chart-import.js?v=8";

const PLUS_ICON_W =
22;

const PLUS_HIT_PAD =
14;

const IS_COARSE_TOUCH =
window.matchMedia?.("(pointer: coarse)")?.matches ||
("ontouchstart" in window);

const TOUCH_PLUS_OFFSET_PX =
28;

const PLUS_SCALE_GAP_PX =
4;

function probeHorizTopPx(
y
){

return `${Math.round(y) + 0.5}px`;

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
`<span class="price-alert-scale-plus-circle" aria-hidden="true">+</span>`;

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
"price-alert-delete-bar hidden";

deleteBar.innerHTML =
`<button type="button" class="price-alert-delete-btn" title="Удалить алерт" aria-label="Удалить алерт">
<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="1.5" d="M9 3h6l1 2h4v2H4V5h4l1-2zM7 9v11h10V9"/></svg>
</button>`;

wrapEl.appendChild(
deleteBar
);

const deleteBtn =
deleteBar.querySelector(
".price-alert-delete-btn"
);

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
plusPriceHint.classList.add(
"hidden"
);
touchGuideLine.classList.add(
"hidden"
);
hideDomChartCrosshair(
wrapEl
);

try{
if(
opts.release !== false
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

function positionDeleteBarFromPrice(
price
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

deleteBar.style.left =
"8px";
deleteBar.style.top =
`${y - 11}px`;
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

if(
IS_COARSE_TOUCH &&
e?.pointerType !== "mouse"
){
return;
}

if(dragAlertId){
return;
}

if(
suppressPlusForScaleDrag &&
e.pointerType === "mouse"
){
return;
}

syncPlusFromClient(
e.clientX,
e.clientY
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
(
x < pw - PLUS_HIT_PAD ||
x > pw + scaleW + PLUS_HIT_PAD
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

if(
showTouchStyle ||
opts.forceShowFromProbe
){

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

}else{
touchGuideLine.classList.add(
"hidden"
);
}

if(
!opts.forceShowFromProbe
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
10
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

plusBtn.remove();
plusPriceHint.remove();
deleteBar.remove();

};

}
