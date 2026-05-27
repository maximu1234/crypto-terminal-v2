import {
ALERT_LINE_COLOR,
ALERT_LINE_DASH,
createPriceAlert,
getActiveAlerts,
removeAlert,
finalizeAlertPriceDrag
} from "./alerts.js?v=62";

import {
isCloudLoggedInEffective
} from "./cloud-sync.js?v=14";

const PLUS_HIT_W =
52;

const PLUS_HIT_H =
40;

export function mountPriceAlertUi({
chart,
series,
wrapEl,
getSymbol,
getTf,
scheduleRedraw
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
let dragStartY =
0;
let dragStartPrice =
0;

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
plusBtn.title =
"Алерт на этой цене";
plusBtn.textContent =
"+";

wrapEl.appendChild(
plusBtn
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

return Math.max(
0,
wrapEl.clientWidth -
(
chart.priceScale?.(
"right"
)?.width?.() ||
56
)
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

function hidePlus(){

plusBtn.classList.add(
"hidden"
);

}

function hideDeleteBar(){

deleteBar.classList.add(
"hidden"
);

}

function positionDeleteBar(
alertRow
){

const y =
series.priceToCoordinate(
alertRow.price
);

if(
y ==
null
){
hideDeleteBar();
return;
}

const rect =
wrapEl.getBoundingClientRect();

deleteBar.style.left =
"8px";
deleteBar.style.top =
`${y - 18}px`;
deleteBar.classList.remove(
"hidden"
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

function onPointerMove(
e
){

if(
dragAlertId
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
const pw =
plotWidth();
const scaleW =
rect.width -
pw;

if(
x <
pw ||
x >
pw +
scaleW +
PLUS_HIT_W
){
hidePlus();
return;
}

const price =
series.coordinateToPrice(
y
);

if(
price ==
null ||
!Number.isFinite(
price
)
){
hidePlus();
return;
}

plusBtn.style.left =
`${pw + 6}px`;
plusBtn.style.top =
`${y - PLUS_HIT_H / 2}px`;
plusBtn.dataset.pendingPrice =
String(
price
);
plusBtn.classList.remove(
"hidden"
);

}

plusBtn.addEventListener(
"click",
async e=>{

e.preventDefault();
e.stopPropagation();

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
}

}
);

plusBtn.addEventListener(
"pointerdown",
e=>{
e.stopPropagation();
}
);

deleteBtn?.addEventListener(
"click",
e=>{

e.preventDefault();
e.stopPropagation();

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
dragStartY =
y;
dragStartPrice =
hit.price;
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

const row =
alertAt(
dragAlertId
);

if(
row
){
row.price =
price;
positionDeleteBar(
row
);
scheduleRedraw?.();
}

}

function onWrapPointerUp(
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

dragAlertId =
null;
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

plusBtn.remove();
deleteBar.remove();

};

}
