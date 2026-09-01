/**
 * /trade — линии и плашки лимитных / стоп-ордеров на графике.
 */
import {
isExchangeTradingEnabled
} from "../../market-api.js?v=6";

import {
maskTradeDisplay
} from "../../trade-pnl-privacy.js?v=1";

import {
registerChartScaleLabelProvider
} from "../../chart/scale-label-providers.js?v=3";

const BADGE_LEFT =
12;

function tradingApi(){

return window.cryptoTerminalDesktop?.trading;

}

function normalizeOverlaySymbol(
symbol
){

return String(
symbol ||
""
).replace(
/\.P$/i,
""
).trim().toUpperCase();

}

function formatVolume(
value
){

const num =
Number(
value
);

if(
!Number.isFinite(
num
)
){
return "0";
}

return num.toLocaleString(
"ru-RU",
{
minimumFractionDigits:
2,
maximumFractionDigits:
2
}
);

}

function displayVolume(
value
){

return maskTradeDisplay(
formatVolume(
value
)
);

}

function getPlotWidth(
host
){

try{
const w =
host.chart?.timeScale?.()?.width?.();

if(
Number.isFinite(
w
) &&
w >
0
){
return w;
}
}catch{
/* ignore */
}

return Math.max(
1,
(
host.wrapEl?.clientWidth ||
0
) -
56
);

}

function getMarkPrice(
host
){

const data =
host?.series?.data?.();
const last =
data?.[
data.length -
1
];
const close =
Number(
last?.close
);

return Number.isFinite(
close
) &&
close >
0
? close
: 0;

}

function drawLineWithBadgeGap(
ctx,
y,
plotW,
color,
opacity,
dash,
gapLeft,
gapWidth
){

if(
y ==
null ||
!Number.isFinite(
y
)
){
return;
}

ctx.save();
ctx.globalAlpha =
opacity;
ctx.strokeStyle =
color;
ctx.lineWidth =
1;
ctx.setLineDash(
dash
);

const gapStart =
Math.max(
0,
gapLeft
);
const gapEnd =
gapLeft +
Math.max(
0,
gapWidth
);

if(
gapStart >
0
){
ctx.beginPath();
ctx.moveTo(
0,
y
);
ctx.lineTo(
Math.min(
gapStart,
plotW
),
y
);
ctx.stroke();
}

if(
gapEnd <
plotW
){
ctx.beginPath();
ctx.moveTo(
Math.max(
gapEnd,
0
),
y
);
ctx.lineTo(
plotW,
y
);
ctx.stroke();
}

ctx.restore();

}

export function createTradeChartOrders(
initialHost =
null
){

if(
!document.body.classList.contains(
"trade-page"
)
){
return null;
}

const widgetInstance =
!!initialHost;

let host =
initialHost ||
null;
let root =
null;
let badgesEl =
null;
let orders =
[];
let rafId =
0;
let fetching =
false;
let afterDrawingsRedraw =
null;
let unregisterScaleLabels =
null;
let bindDrawingSyncTimer =
0;
let badgeLayoutCache =
null;
let dragOrder =
null;
let pendingAmend =
null;
let mountAbort =
null;
let chartSwitchFrozen =
false;
let switchVeilVisible =
false;
let switchVeilOrders =
null;
let switchLoadSeq =
0;

function getDisplayOrders(){

if(
!isExchangeTradingEnabled()
){
return [];
}

if(
switchVeilVisible
){
return switchVeilOrders ??
[];
}

if(
chartSwitchFrozen
){
return [];
}

return orders;

}

function priceToY(
price
){

const dt =
host?.getDrawingTools?.();

if(
dt?.plotPriceToCoordinate
){
const y =
dt.plotPriceToCoordinate(
price
);

if(
y !=
null &&
Number.isFinite(
y
)
){
return y;
}
}

try{
const y =
host?.series?.priceToCoordinate?.(
price
);

if(
y !=
null &&
Number.isFinite(
y
)
){
return y;
}
}catch{
/* ignore */
}

return null;

}

let orderDragListeners =
null;
let dragBadgeEl =
null;

function getChartCoordEl(){

return (
host?.chartEl ||
host?.wrapEl?.querySelector?.(
".chart"
) ||
host?.wrapEl?.querySelector?.(
"#chart"
) ||
host?.wrapEl
);

}

function clientYToPrice(
clientY
){

if(
!host?.series
){
return null;
}

const el =
getChartCoordEl();

if(
!el
){
return null;
}

const rect =
el.getBoundingClientRect();
const y =
clientY -
rect.top;
const price =
host.series.coordinateToPrice(
y
);

if(
price ==
null ||
!Number.isFinite(
price
) ||
price <=
0
){
return null;
}

return price;

}

function getEffectiveOrderPrice(
order
){

if(
dragOrder?.orderId ===
order.orderId &&
Number.isFinite(
dragOrder.previewPrice
) &&
dragOrder.previewPrice >
0
){
return dragOrder.previewPrice;
}

if(
pendingAmend?.orderId ===
order.orderId &&
Number.isFinite(
pendingAmend.price
) &&
pendingAmend.price >
0
){
return pendingAmend.price;
}

return Number(
order.price
) ||
0;

}

function formatOrderBadgeLabel(
order
){

const base =
String(
order?.label ||
""
).trim();

if(
!base
){
return "";
}

if(
order?.reduceOnly
){
return `${base} (RO)`;
}

return base;

}

function orderLineColor(
order
){

return order.badgeSide ===
"long"
? "#22c55e"
: "#ef4444";

}

function buildBadgeSpecs(){

const specs =
[];

for(
const order of getDisplayOrders()
){
const price =
getEffectiveOrderPrice(
order
);

if(
price <=
0
){
continue;
}

const y =
priceToY(
price
);

if(
y ==
null ||
!Number.isFinite(
y
)
){
continue;
}

const sideClass =
order.badgeSide ===
"long"
? "trade-order-badge--long"
: "trade-order-badge--short";
const color =
orderLineColor(
order
);
const dash =
order.orderKind ===
"stop"
? [
4,
4
]
: [];

specs.push(
{
orderId:
order.orderId,
y,
price,
className:
sideClass,
html:
`
<span class="seg seg-vol">${displayVolume(order.volumeUsdt)}</span>
<span class="seg seg-type">${formatOrderBadgeLabel(order)}</span>
<button type="button" class="seg seg-close" data-action="cancel-order" title="Отменить ордер" aria-label="Отменить ордер">×</button>
`,
line:{
y,
color,
opacity:
1,
dash
}
}
);
}

return specs;

}

function collectScaleLabelEntries(){

return buildBadgeSpecs().filter(
spec=>
spec.line &&
Number.isFinite(
spec.price
) &&
spec.price >
0
).map(
spec=>
({
yIdeal:
spec.y,
price:
spec.price,
color:
spec.line.color
})
);

}

function invalidateBadgeLayoutCache(){

badgeLayoutCache =
null;

}

function getOrdersLayoutKey(){

return getDisplayOrders().map(
o=>{
const dragging =
dragOrder?.orderId ===
o.orderId;

return `${o.orderId}:${o.label}${o.reduceOnly ? ":ro" : ""}${dragging ? ":drag" : ""}`;
}
).join(
"|"
);

}

function syncBadgeDom(
badgeSpecs,
layoutKey
){

const canFast =
badgeLayoutCache &&
badgeLayoutCache.key ===
layoutKey;

if(
canFast
){

for(
const spec of badgeSpecs
){
const el =
badgeLayoutCache.elementsById.get(
spec.orderId
);

if(
el &&
spec.y !=
null &&
Number.isFinite(
spec.y
)
){
el.style.top =
`${spec.y}px`;

if(
spec.line
){
spec.line.y =
spec.y;
}

}

}

return badgeLayoutCache.gapById;

}

badgesEl.innerHTML =
"";

const gapById =
new Map();
const elementsById =
new Map();

for(
const spec of badgeSpecs
){
const el =
document.createElement(
"div"
);

el.className =
`trade-order-badge ${spec.className}`;
el.dataset.orderId =
spec.orderId;
el.style.left =
`${BADGE_LEFT}px`;
el.style.top =
`${spec.y}px`;
el.innerHTML =
spec.html;
badgesEl.appendChild(
el
);

elementsById.set(
spec.orderId,
el
);

gapById.set(
spec.orderId,
el.getBoundingClientRect().width ||
0
);
}

badgeLayoutCache =
{
key:
layoutKey,
gapById,
elementsById
};

return gapById;

}

function paintBadgeLines(
ctx,
plotW,
badgeSpecs,
gapById
){

for(
const spec of badgeSpecs
){
if(
!spec.line
){
continue;
}

const gapW =
(
gapById.get(
spec.orderId
) ||
0
) +
2;

drawLineWithBadgeGap(
ctx,
spec.line.y,
plotW,
spec.line.color,
spec.line.opacity,
spec.line.dash,
BADGE_LEFT,
gapW
);

}

}

function scheduleOrderDragRedraw(){

const dt =
host?.getDrawingTools?.();

if(
dt?.scheduleDragRedraw
){
dt.scheduleDragRedraw();
return;
}

dt?.scheduleRedraw?.();

}

function scheduleDraw(){

if(
rafId
){
return;
}

rafId =
requestAnimationFrame(
()=>{

rafId =
0;
draw();

}
);

}

function draw(){

if(
!ensureDom()
){
return;
}

if(
!getDisplayOrders().length
){
badgesEl.innerHTML =
"";
badgeLayoutCache =
null;
root.hidden =
true;
host?.getDrawingTools?.()?.scheduleRedraw?.();
return;
}

root.hidden =
false;

if(
dragOrder
){
scheduleOrderDragRedraw();
return;
}

const badgeSpecs =
buildBadgeSpecs();
const layoutKey =
getOrdersLayoutKey();

syncBadgeDom(
badgeSpecs,
layoutKey
);
host?.getDrawingTools?.()?.scheduleRedraw?.();

}

function onAfterDrawingsRedraw(
ctx,
plotW
){

if(
!getDisplayOrders().length
){
return;
}

root.hidden =
false;

const badgeSpecs =
buildBadgeSpecs();
const layoutKey =
getOrdersLayoutKey();
const gapById =
syncBadgeDom(
badgeSpecs,
layoutKey
);

paintBadgeLines(
ctx,
plotW ??
getPlotWidth(
host
),
badgeSpecs,
gapById
);

}

function refreshDragPreview(){

if(
!dragOrder
){
return;
}

scheduleOrderDragRedraw();

}

async function commitOrderDrag(){

if(
!dragOrder
){
return;
}

const order =
orders.find(
o=>
o.orderId ===
dragOrder.orderId
);

const saved =
{
...dragOrder
};

dragOrder =
null;

if(
!order ||
!saved.moved
){
scheduleDraw();
return;
}

const api =
tradingApi();

if(
!api?.amendOrder
){
scheduleDraw();
return;
}

pendingAmend =
{
orderId:
order.orderId,
price:
saved.previewPrice
};

scheduleDraw();

const result =
await api.amendOrder(
{
symbol:
order.symbol,
orderId:
order.orderId,
price:
saved.previewPrice,
orderKind:
order.orderKind,
qty:
order.qty,
quantity:
order.qty,
markPrice:
getMarkPrice(
host
)
}
);

if(
result?.ok ===
false
){
pendingAmend =
null;
alert(
result.message ||
"Не удалось изменить цену"
);
await syncOrders(
true
);
return;
}

order.price =
saved.previewPrice;
if(
result?.orderId
){
order.orderId =
String(
result.orderId
);
}
pendingAmend =
null;
await syncOrders(
true
);
window.dispatchEvent(
new CustomEvent(
"trade-book-refresh"
)
);

}

function onBadgePointerDown(
e
){

if(
!e.isPrimary
){
return;
}

const badge =
e.target.closest(
".trade-order-badge"
);

if(
!badge
){
return;
}

if(
e.target.closest(
".seg-close"
)
){
return;
}

const orderId =
badge.dataset.orderId;
const order =
orders.find(
o=>
o.orderId ===
orderId
);

if(
!order
){
return;
}

const startPrice =
getEffectiveOrderPrice(
order
);

if(
startPrice <=
0
){
return;
}

e.preventDefault();
e.stopPropagation();

dragOrder =
{
orderId,
pointerId:
e.pointerId,
startPrice,
previewPrice:
startPrice,
moved:
false
};

dragBadgeEl =
badge;

badge.classList.add(
"is-dragging"
);

try{
badge.setPointerCapture(
e.pointerId
);
}catch{
/* ignore */
}

attachOrderDragListeners();

}

function detachOrderDragListeners(){

if(
!orderDragListeners
){
return;
}

document.removeEventListener(
"pointermove",
orderDragListeners.move
);
document.removeEventListener(
"pointerup",
orderDragListeners.up
);
document.removeEventListener(
"pointercancel",
orderDragListeners.up
);
orderDragListeners =
null;

}

function onOrderPointerMove(
e
){

if(
!dragOrder ||
e.pointerId !==
dragOrder.pointerId
){
return;
}

e.preventDefault();

const price =
clientYToPrice(
e.clientY
);

if(
price ==
null
){
return;
}

if(
Math.abs(
price -
dragOrder.startPrice
) /
Math.max(
dragOrder.startPrice,
1e-8
) >
0.00001
){
dragOrder.moved =
true;
}

dragOrder.previewPrice =
price;

scheduleOrderDragRedraw();

}

function onOrderPointerUp(
e
){

if(
!dragOrder ||
e.pointerId !==
dragOrder.pointerId
){
return;
}

const badge =
dragBadgeEl;

detachOrderDragListeners();
badge?.classList.remove(
"is-dragging"
);

try{
badge?.releasePointerCapture?.(
e.pointerId
);
}catch{
/* ignore */
}

dragBadgeEl =
null;
void commitOrderDrag();

}

function attachOrderDragListeners(){

detachOrderDragListeners();

orderDragListeners =
{
move:
onOrderPointerMove,
up:
onOrderPointerUp
};

document.addEventListener(
"pointermove",
onOrderPointerMove
);
document.addEventListener(
"pointerup",
onOrderPointerUp
);
document.addEventListener(
"pointercancel",
onOrderPointerUp
);

}

async function cancelOrder(
order
){

const result =
await tradingApi()?.cancelOrder?.(
order.symbol,
order.orderId
);

if(
result?.ok ===
false
){
alert(
result.message ||
"Не удалось отменить ордер"
);
return;
}

orders =
orders.filter(
o=>
o.orderId !==
order.orderId
);
scheduleDraw();
window.dispatchEvent(
new CustomEvent(
"trade-book-refresh",
{
detail:{
skipChartOrdersSync:
true
}
}
)
);

}

function ensureDom(){

if(
!host?.wrapEl
){
return false;
}

if(
root
){
return true;
}

root =
document.createElement(
"div"
);
root.className =
"trade-chart-orders-overlay";

badgesEl =
document.createElement(
"div"
);
badgesEl.className =
"trade-chart-orders-badges";

root.append(
badgesEl
);
host.wrapEl.appendChild(
root
);

badgesEl.addEventListener(
"pointerdown",
onBadgePointerDown
);

badgesEl.addEventListener(
"click",
event=>{

const btn =
event.target.closest(
"[data-action='cancel-order']"
);

if(
!btn
){
return;
}

event.preventDefault();
event.stopPropagation();

const badge =
btn.closest(
".trade-order-badge"
);
const orderId =
badge?.dataset?.orderId;
const order =
orders.find(
o=>
o.orderId ===
orderId
);

if(
order
){
void cancelOrder(
order
);
}

}
);

return true;

}

function bindDrawingSync(){

const dt =
host?.getDrawingTools?.();

if(
!dt?.addAfterRedrawListener
){
return false;
}

if(
afterDrawingsRedraw
){
dt.removeAfterRedrawListener?.(
afterDrawingsRedraw
);
}

afterDrawingsRedraw =
onAfterDrawingsRedraw;
dt.addAfterRedrawListener(
afterDrawingsRedraw
);

return true;

}

function ensureDrawingSync(){

if(
bindDrawingSync()
){
return;
}

if(
bindDrawingSyncTimer
){
return;
}

let attempts =
0;

bindDrawingSyncTimer =
window.setInterval(
()=>{

attempts++;

if(
bindDrawingSync() ||
attempts >=
50
){
window.clearInterval(
bindDrawingSyncTimer
);
bindDrawingSyncTimer =
0;
}

},
100
);

}

async function syncOrders(
force =
false
){

if(
chartSwitchFrozen &&
!force
){
return;
}

if(
!host
){
return;
}

const api =
tradingApi();

if(
!api?.getOpenOrders
){
orders =
[];
scheduleDraw();
return;
}

const status =
await api.getStatus?.();

if(
!host
){
return;
}

if(
!status?.configured
){
orders =
[];
scheduleDraw();
return;
}

if(
fetching &&
!force
){
return;
}

fetching =
true;

try{
const symbol =
host?.getSymbol?.();

if(
!symbol
){
orders =
[];
scheduleDraw();
return;
}

const result =
await api.getOpenOrders(
force
? {
forceRefresh:
true
}
: undefined
);

if(
!host
){
return;
}

if(
normalizeOverlaySymbol(
host?.getSymbol?.()
) !==
normalizeOverlaySymbol(
symbol
)
){
return;
}

if(
!result?.ok
){
scheduleDraw();
return;
}

const symNorm =
symbol.toUpperCase();

orders =
(
result.orders ||
[]
).filter(
row=>
String(
row.symbol ||
""
).toUpperCase() ===
symNorm
);

badgeLayoutCache =
null;
scheduleDraw();
}finally{
fetching =
false;
}

}

function bindChart(){

if(
!host?.chart
){
return;
}

try{
host.chart.timeScale().subscribeVisibleLogicalRangeChange(
scheduleDraw
);
}catch{
/* ignore */
}

try{
host.chart.priceScale(
"right"
).subscribeVisibleLogicalRangeChange?.(
scheduleDraw
);
}catch{
/* ignore */
}

}

function chartEventSymbolMatches(
event,
expectedSymbol
){

const eventSym =
normalizeOverlaySymbol(
event?.detail?.symbol
);
const expected =
normalizeOverlaySymbol(
expectedSymbol
);

if(
!eventSym ||
!expected
){
return true;
}

return eventSym ===
expected;

}

function bindChartSwitchSync(
signal
){

const onSwitchStart =
e=>{

if(
!host
){
return;
}

switchLoadSeq =
Number(
e.detail?.loadSeq
) ||
0;
chartSwitchFrozen =
true;
switchVeilOrders =
orders.length
? orders.slice()
: null;
switchVeilVisible =
orders.length >
0;
orders =
[];
detachOrderDragListeners();
dragOrder =
null;
pendingAmend =
null;
scheduleDraw(
true
);
host?.getDrawingTools?.()?.scheduleRedraw?.();
};

const onCandlesApply =
e=>{

if(
!chartEventSymbolMatches(
e,
host?.getSymbol?.()
)
){
return;
}

const seq =
Number(
e.detail?.loadSeq
) ||
0;

if(
seq &&
seq !==
switchLoadSeq
){
return;
}

switchVeilVisible =
false;
switchVeilOrders =
null;
orders =
[];
badgeLayoutCache =
null;
scheduleDraw(
true
);
host?.getDrawingTools?.()?.scheduleRedraw?.();
};

const onCandlesLoaded =
async e=>{

if(
!host
){
return;
}

if(
!chartEventSymbolMatches(
e,
host?.getSymbol?.()
)
){
return;
}

switchVeilVisible =
false;
switchVeilOrders =
null;
orders =
[];
badgeLayoutCache =
null;
scheduleDraw(
true
);
host?.getDrawingTools?.()?.scheduleRedraw?.();

try{
await syncOrders(
true
);
}finally{

if(
!host
){
return;
}

if(
!chartEventSymbolMatches(
e,
host?.getSymbol?.()
)
){
return;
}

chartSwitchFrozen =
false;
scheduleDraw(
true
);
host?.getDrawingTools?.()?.scheduleRedraw?.();
}

};

window.addEventListener(
"chart-switch-start",
onSwitchStart,
{
signal
}
);

window.addEventListener(
"chart-switch-candles-apply",
onCandlesApply,
{
signal
}
);

window.addEventListener(
"chart-candles-loaded",
onCandlesLoaded,
{
signal
}
);

}

function applyStreamOrders(
allOrders
){

if(
chartSwitchFrozen
){
return;
}

if(
!host
){
return;
}

const symbol =
normalizeOverlaySymbol(
host?.getSymbol?.()
);

orders =
(
allOrders ||
[]
).filter(
order=>
normalizeOverlaySymbol(
order?.symbol
) ===
symbol
);

scheduleDraw(
true
);

}

function mount(
nextHost
){

mountAbort?.abort();
mountAbort =
new AbortController();
const signal =
mountAbort.signal;

host =
nextHost;

if(
!ensureDom()
){
return;
}

bindChart();
bindChartSwitchSync(
signal
);
ensureDrawingSync();

unregisterScaleLabels?.();
unregisterScaleLabels =
registerChartScaleLabelProvider(
collectScaleLabelEntries,
host?.chart
);

const ro =
new ResizeObserver(
scheduleDraw
);

ro.observe(
host.wrapEl
);

void syncOrders(
true
);

window.addEventListener(
"trade-stream-orders",
event=>{
applyStreamOrders(
event.detail?.orders
);
},
{
signal
}
);

window.addEventListener(
"exchange-trading-gate-changed",
()=>{
draw();
},
{
signal
}
);

window.addEventListener(
"trade-book-refresh",
event=>{

if(
event.detail?.skipChartOrdersSync
){
return;
}

void syncOrders(
true
);
},
{
signal
}
);

window.addEventListener(
"trade-orders-refresh",
event=>{

if(
Array.isArray(
event.detail?.orders
)
){
applyStreamOrders(
event.detail.orders
);
return;
}

void syncOrders(
true
);

},
{
signal
}
);

window.addEventListener(
"trade-total-pnl-visibility-changed",
()=>{
invalidateBadgeLayoutCache();
scheduleDraw(
true
);
},
{
signal
}
);

}

function destroy(){

mountAbort?.abort();
mountAbort =
null;

unregisterScaleLabels?.();
unregisterScaleLabels =
null;

if(
rafId
){
cancelAnimationFrame(
rafId
);
rafId =
0;
}

if(
bindDrawingSyncTimer
){
clearTimeout(
bindDrawingSyncTimer
);
bindDrawingSyncTimer =
0;
}

const dt =
host?.getDrawingTools?.();

if(
afterDrawingsRedraw
){
dt?.removeAfterRedrawListener?.(
afterDrawingsRedraw
);
afterDrawingsRedraw =
null;
}

dragOrder =
null;
pendingAmend =
null;
detachOrderDragListeners();
dragBadgeEl =
null;
orders =
[];
badgeLayoutCache =
null;
chartSwitchFrozen =
false;
switchVeilVisible =
false;
switchVeilOrders =
null;
switchLoadSeq =
0;

root?.remove();
root =
null;
badgesEl =
null;
host =
null;

}

const controller =
{
refresh:()=>
syncOrders(
true
),
destroy
};

if(
initialHost
){
mount(
initialHost
);
return controller;
}

function tryMount(){

const nextHost =
window.__tradeChartHost;

if(
!nextHost
){
return false;
}

mount(
nextHost
);
return true;

}

if(
!tryMount()
){
window.addEventListener(
"trade-chart-host-ready",
()=>{
tryMount();
},
{
once:
true
}
);
}

return controller;

}

export function initTradeChartOrders(){

return createTradeChartOrders();

}
