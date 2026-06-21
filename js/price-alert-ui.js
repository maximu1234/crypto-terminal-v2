import {
createPriceAlert,
getActiveAlerts,
removeAlert,
finalizeAlertPriceDrag,
setAlertDragLivePrice,
clearAlertDragLivePrice,
alertPriceForDisplay
} from "./alerts.js?v=97";

import {
isCloudLoggedInEffective
} from "./cloud-sync.js?v=38";

import {
getTelegramChatId
} from "./alerts-cloud-sync.js?v=110";

import {
formatPrice,
hideDomChartCrosshair,
hideDomChartCrosshairHorz,
hideDomChartCrosshairVert,
positionDomChartCrosshair
} from "./chart-import.js?v=42";

import {
isChartLayoutReady,
shouldDeferAlertBadgeSync
} from "./chart-layout-gate.js?v=2";

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
getDrawingTools =
null,
scheduleRedraw,
onCrosshairSuppress,
onCrosshairRelease,
onPlusActivate =
null
}){

if(
!chart ||
!series ||
!wrapEl
){
return ()=>{};
}

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
typeof onPlusActivate ===
"function"
? "Ордер или алерт по цене"
: "Добавить алерт по цене"
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

const alertBadgesRoot =
document.createElement(
"div"
);
alertBadgesRoot.className =
"price-alert-badges-root";
wrapEl.appendChild(
alertBadgesRoot
);

const badgeByShapeId =
new Map();

let badgesRaf1 =
0;
let badgesRaf2 =
0;

function scheduleBadgeSync(){

if(
badgesRaf1
){
return;
}

badgesRaf1 =
requestAnimationFrame(
()=>{
badgesRaf2 =
requestAnimationFrame(
()=>{
badgesRaf1 =
0;
badgesRaf2 =
0;
syncAlertBadges();
}
);
}
);

}

function cancelBadgeSync(){

if(
badgesRaf1
){
cancelAnimationFrame(
badgesRaf1
);
badgesRaf1 =
0;
}

if(
badgesRaf2
){
cancelAnimationFrame(
badgesRaf2
);
badgesRaf2 =
0;
}

}

const syncBadgesAfterDrawRedraw =
()=>{
syncAlertBadges();
};

function bindBadgesToDrawRedraw(){

const dt =
getDrawingTools?.();

if(
!dt?.addAfterRedrawListener
){
return false;
}

dt.addAfterRedrawListener(
syncBadgesAfterDrawRedraw
);
return true;

}

let drawRedrawBound =
bindBadgesToDrawRedraw();

function hideAllAlertBadges(){

for(
const badge of
badgeByShapeId.values()
){
badge.el.classList.add(
"hidden"
);
}

}

function onChartSwitchStart(){

cancelBadgeSync();
hideAllAlertBadges();

}

function onChartCandlesLoaded(
e
){

const eventSym =
String(
e.detail?.symbol ||
""
).trim().toUpperCase();
const current =
sym();

if(
eventSym &&
current &&
eventSym !==
current
){
return;
}

scheduleBadgeSync();

}

window.addEventListener(
"chart-switch-start",
onChartSwitchStart
);

window.addEventListener(
"chart-candles-loaded",
onChartCandlesLoaded
);

function deleteAlertByShapeId(
shapeId
){

if(
!shapeId
){
return;
}

removeAlert(
sym(),
shapeId
);
dispatchAlertsChanged();
scheduleRedraw?.();
scheduleBadgeSync();

}

function bindAlertBadge(
shapeId,
el
){

const bodyBtn =
el.querySelector(
".price-alert-badge-body"
);
const deleteBtn =
el.querySelector(
".price-alert-badge-delete"
);

deleteBtn?.addEventListener(
"click",
e=>{

e.preventDefault();
e.stopPropagation();
deleteAlertByShapeId(
shapeId
);

}
);

deleteBtn?.addEventListener(
"touchend",
e=>{

e.preventDefault();
e.stopPropagation();
deleteAlertByShapeId(
shapeId
);

},
{
passive:false
}
);

bodyBtn?.addEventListener(
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

const row =
alertAt(
shapeId
);

if(
!row
){
return;
}

dragAlertId =
shapeId;
setAlertDragLivePrice(
dragAlertId,
row.price
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
bodyBtn.setPointerCapture(
e.pointerId
);
}catch{
/* ignore */
}

}
);

}

function createAlertBadge(
shapeId
){

const el =
document.createElement(
"div"
);
el.className =
"price-alert-badge";
el.dataset.shapeId =
shapeId;
el.innerHTML =
`<button type="button" class="price-alert-badge-body" aria-label="Перетащить алерт">
<span class="price-alert-badge-price"></span>
</button>
<span class="price-alert-badge-sep" aria-hidden="true"></span>
<button type="button" class="price-alert-badge-delete" aria-label="Удалить алерт">×</button>`;

bindAlertBadge(
shapeId,
el
);

return {
el,
priceEl: el.querySelector(
".price-alert-badge-price"
)
};

}

function syncAlertBadges(){

if(
shouldDeferAlertBadgeSync()
){
return;
}

const alive =
new Set();

for(
const alert of alertsForChart()
){

const shapeId =
String(
alert.shapeId
);
const level =
alertPriceForDisplay(
alert
);

if(
!Number.isFinite(
level
)
){
continue;
}

const y =
series.priceToCoordinate(
level
);

if(
y ==
null
){
continue;
}

alive.add(
shapeId
);

let badge =
badgeByShapeId.get(
shapeId
);

if(
!badge
){
badge =
createAlertBadge(
shapeId
);
badgeByShapeId.set(
shapeId,
badge
);
alertBadgesRoot.appendChild(
badge.el
);
}

badge.priceEl.textContent =
formatPrice(
level
);
badge.el.style.top =
`${Math.round(
y
)}px`;
badge.el.classList.remove(
"hidden"
);

}

for(
const [
shapeId,
badge
] of
badgeByShapeId
){

if(
!alive.has(
shapeId
)
){
badge.el.remove();
badgeByShapeId.delete(
shapeId
);

}

}

}

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

if(
!Number.isFinite(
price
)
){
return;
}

if(
typeof onPlusActivate ===
"function"
){
onPlusActivate(
price,
{
plusBtn,
plusPriceHint,
wrapEl,
hidePlus
}
);
return;
}

hidePlus();

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
dispatchAlertsChanged();
scheduleRedraw?.();
scheduleBadgeSync();
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

const badgeResizeObserver =
new ResizeObserver(
scheduleBadgeSync
);
badgeResizeObserver.observe(
wrapEl
);

try{
chart.timeScale().subscribeVisibleLogicalRangeChange(
scheduleBadgeSync
);
chart.priceScale(
"right"
).subscribeVisibleLogicalRangeChange?.(
scheduleBadgeSync
);
}catch{
/* ignore */
}

scheduleBadgeSync();

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

function onWrapPointerDown(
e
){

if(
e.button !==
0
){
return;
}

if(
alertBadgesRoot.contains(
e.target
)
){
return;
}

if(
plusBtn.contains(
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

scheduleBadgeSync();

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
scheduleBadgeSync();

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
scheduleBadgeSync
);

const dispose =
()=>{

cancelBadgeSync();

window.removeEventListener(
"chart-switch-start",
onChartSwitchStart
);

window.removeEventListener(
"chart-candles-loaded",
onChartCandlesLoaded
);

if(
drawRedrawBound
){
getDrawingTools?.()?.removeAfterRedrawListener?.(
syncBadgesAfterDrawRedraw
);
drawRedrawBound =
false;
}

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
"price-alerts-changed",
scheduleBadgeSync
);

badgeResizeObserver.disconnect();

try{
chart.timeScale().unsubscribeVisibleLogicalRangeChange(
scheduleBadgeSync
);
chart.priceScale(
"right"
).unsubscribeVisibleLogicalRangeChange?.(
scheduleBadgeSync
);
}catch{
/* ignore */
}

plusBtn.remove();
plusPriceHint.remove();
alertBadgesRoot.remove();
touchGuideLine.remove();

if(
scaleStripEl
){
scaleStripEl.removeEventListener(
"pointerdown",
onScaleStripPointerDown,
true
);
}

};

dispose.syncBadges =
syncAlertBadges;

return dispose;

}
