/**
 * /trade — линии и плашки лимитных / стоп-ордеров на графике.
 */
const POLL_MS =
5000;

const BADGE_LEFT =
12;

function tradingApi(){

return window.cryptoTerminalDesktop?.trading;

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

export function initTradeChartOrders(){

if(
!document.body.classList.contains(
"trade-page"
)
){
return null;
}

let host =
null;
let root =
null;
let badgesEl =
null;
let orders =
[];
let pollTimer =
null;
let rafId =
0;
let fetching =
false;
let afterDrawingsRedraw =
null;
let bindDrawingSyncTimer =
0;
let badgeLayoutCache =
null;
let dragOrder =
null;
let pendingAmend =
null;

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

function clientYToPrice(
clientY
){

if(
!host?.wrapEl ||
!host?.series
){
return null;
}

const rect =
host.wrapEl.getBoundingClientRect();
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
const order of orders
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
className:
sideClass,
html:
`
<span class="seg seg-vol">${formatVolume(order.volumeUsdt)}</span>
<span class="seg seg-type">${order.label}</span>
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

function getOrdersLayoutKey(){

return orders.map(
o=>
`${o.orderId}:${getEffectiveOrderPrice(o)}:${o.label}`
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
!orders.length
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
!orders.length
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

const order =
orders.find(
o=>
o.orderId ===
dragOrder.orderId
);

if(
!order
){
return;
}

const y =
priceToY(
dragOrder.previewPrice
);
const el =
badgeLayoutCache?.elementsById?.get(
dragOrder.orderId
);

if(
el &&
y !=
null &&
Number.isFinite(
y
)
){
el.style.top =
`${y}px`;
}

host?.getDrawingTools?.()?.scheduleRedraw?.();

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
pendingAmend =
null;
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

const onMove =
ev=>{

if(
!dragOrder ||
ev.pointerId !==
dragOrder.pointerId
){
return;
}

const price =
clientYToPrice(
ev.clientY
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
dragOrder.startPrice >
0.00001
){
dragOrder.moved =
true;
}

dragOrder.previewPrice =
price;
refreshDragPreview();

};

const onUp =
ev=>{

if(
!dragOrder ||
ev.pointerId !==
dragOrder.pointerId
){
return;
}

badge.classList.remove(
"is-dragging"
);

try{
badge.releasePointerCapture(
ev.pointerId
);
}catch{
/* ignore */
}

badge.removeEventListener(
"pointermove",
onMove
);
badge.removeEventListener(
"pointerup",
onUp
);
badge.removeEventListener(
"pointercancel",
onUp
);

void commitOrderDrag();

};

badge.addEventListener(
"pointermove",
onMove
);
badge.addEventListener(
"pointerup",
onUp
);
badge.addEventListener(
"pointercancel",
onUp
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
"trade-book-refresh"
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
root.id =
"trade-chart-orders-overlay";
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
host.getSymbol?.();

if(
!symbol
){
orders =
[];
scheduleDraw();
return;
}

const result =
await api.getOpenOrders();

if(
!result?.ok
){
orders =
[];
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
host.chart.subscribeCrosshairMove(
scheduleDraw
);
}catch{
/* ignore */
}

}

function startPoll(){

stopPoll();
pollTimer =
window.setInterval(
()=>{
void syncOrders();
},
POLL_MS
);

}

function stopPoll(){

if(
pollTimer !=
null
){
window.clearInterval(
pollTimer
);
pollTimer =
null;
}

}

function mount(
nextHost
){

host =
nextHost;

if(
!ensureDom()
){
return;
}

bindChart();
ensureDrawingSync();

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
startPoll();

window.addEventListener(
"trade-book-refresh",
()=>{
void syncOrders(
true
);
}
);

window.addEventListener(
"trade-orders-refresh",
()=>{
void syncOrders(
true
);
}
);

const symEl =
document.getElementById(
"current-symbol"
);

if(
symEl
){
const symObserver =
new MutationObserver(
()=>{
void syncOrders(
true
);
}
);

symObserver.observe(
symEl,
{
childList:
true,
characterData:
true,
subtree:
true
}
);

}

document.addEventListener(
"visibilitychange",
()=>{

if(
document.hidden
){
stopPoll();
}else{
void syncOrders(
true
);
startPoll();
}

}
);

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

return {
refresh:()=>
syncOrders(
true
)
};

}
