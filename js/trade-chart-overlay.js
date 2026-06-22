/**
 * /trade — линии и плашки открытой позиции, SL/TP на графике.
 */
import {
getCachedPosition,
syncTradePositionsCache
} from "./trade-positions-cache.js?v=3";

import {
formatTradePnl,
formatTradeUsdt
} from "./trade-format.js?v=1";

const BADGE_LEFT =
12;

const LINE_OPACITY_SLTP =
0.60;

function tradingApi(){

return window.cryptoTerminalDesktop?.trading;

}

function formatVolume(
value
){

return formatTradeUsdt(
value
);

}

function formatPnl(
value
){

const text =
formatTradePnl(
value
);

if(
text ===
"—"
){
return "0 USDT";
}

return `${text} USDT`;

}

function formatStopUsd(
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
return "—";
}

return num.toLocaleString(
"ru-RU",
{
maximumFractionDigits:
2,
signDisplay:
"exceptZero"
}
);

}

function pnlAtPrice(
side,
entry,
price,
size
){

const e =
Number(
entry
);
const p =
Number(
price
);
const s =
Number(
size
);

if(
!Number.isFinite(
e
) ||
!Number.isFinite(
p
) ||
!Number.isFinite(
s
) ||
s ===
0
){
return 0;
}

return side ===
"Buy"
? (
p -
e
) *
s
: (
e -
p
) *
s;

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

function drawLine(
ctx,
y,
plotW,
color,
opacity,
dash =
[]
){

drawLineWithBadgeGap(
ctx,
y,
plotW,
color,
opacity,
dash,
0,
0
);

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

export function createTradeChartOverlay(
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
let position =
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
let dragStop =
null;
let pendingStopPrice =
null;
let entryZoneEl =
null;
let handlesEl =
null;
let slHandleEl =
null;
let tpHandleEl =
null;
let entryHover =
false;
let stopDragListeners =
null;
let mountAbort =
null;

function getMarkPrice(){

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

if(
Number.isFinite(
close
) &&
close >
0
){
return close;
}

const mark =
Number(
position?.markPrice
);

if(
Number.isFinite(
mark
) &&
mark >
0
){
return mark;
}

return Number(
position?.avgPrice
) ||
0;

}

function validateStopPrice(
kind,
side,
stopPrice,
markPrice
){

const price =
Number(
stopPrice
);
const mark =
Number(
markPrice
);

if(
!Number.isFinite(
price
) ||
price <=
0 ||
!Number.isFinite(
mark
) ||
mark <=
0
){
return null;
}

const isLong =
side ===
"Buy";

if(
kind ===
"tp"
){

if(
isLong &&
price <=
mark
){
return "триггерный тейк-профит должен быть выше текущей цены";
}

if(
!isLong &&
price >=
mark
){
return "триггерный тейк-профит должен быть ниже текущей цены";
}

return null;

}

if(
isLong &&
price >=
mark
){
return "Триггерный стоп-лосс должен быть ниже текущей цены";
}

if(
!isLong &&
price <=
mark
){
return "Триггерный стоп-лосс должен быть выше текущей цены";
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

function getCommittedStopPrice(
kind
){

return Number(
kind ===
"sl"
? position?.stopLoss
: position?.takeProfit
) ||
0;

}

function getEffectiveStopPrice(
kind
){

if(
dragStop?.kind ===
kind &&
Number.isFinite(
dragStop.previewPrice
) &&
dragStop.previewPrice >
0
){
return dragStop.previewPrice;
}

if(
pendingStopPrice?.kind ===
kind &&
Number.isFinite(
pendingStopPrice.price
) &&
pendingStopPrice.price >
0
){
return pendingStopPrice.price;
}

return Number(
kind ===
"sl"
? position?.stopLoss
: position?.takeProfit
) ||
0;

}

function scheduleStopDragRedraw(){

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

function refreshDragPreview(){

if(
!dragStop
){
return;
}

scheduleStopDragRedraw();

}

function detachStopDragListeners(){

if(
!stopDragListeners
){
return;
}

document.removeEventListener(
"pointermove",
stopDragListeners.move
);
document.removeEventListener(
"pointerup",
stopDragListeners.up
);
document.removeEventListener(
"pointercancel",
stopDragListeners.up
);
stopDragListeners =
null;

}

function attachStopDragListeners(){

detachStopDragListeners();

const move =
onStopPointerMove;
const up =
e=>{

if(
!dragStop ||
e.pointerId !==
dragStop.pointerId
){
return;
}

detachStopDragListeners();
void commitStopDrag();

};

stopDragListeners =
{
move,
up
};
document.addEventListener(
"pointermove",
move
);
document.addEventListener(
"pointerup",
up
);
document.addEventListener(
"pointercancel",
up
);

}

function beginStopDrag(
e,
kind,
startPrice
){

if(
startPrice <=
0
){
startPrice =
Number(
position.avgPrice
) ||
0;
}

dragStop =
{
kind,
pointerId:
e.pointerId,
startPrice,
previewPrice:
clientYToPrice(
e.clientY
) ??
startPrice,
moved:
false
};

entryHover =
false;

if(
handlesEl
){
handlesEl.hidden =
true;
}

invalidateBadgeLayoutCache();
draw();
attachStopDragListeners();
badgeLayoutCache?.elementsByKind?.get(
kind
)?.classList.add(
"is-dragging"
);
refreshDragPreview();

}

async function commitStopDrag(){

if(
!dragStop ||
!position
){
return;
}

const {
kind,
previewPrice,
startPrice
} =
dragStop;
const prevStop =
kind ===
"sl"
? (
Number(
position.stopLoss
) ||
0
)
: (
Number(
position.takeProfit
) ||
0
);
const badgeEl =
badgeLayoutCache?.elementsByKind?.get(
kind
);

const ref =
Math.max(
Math.abs(
startPrice
),
1e-8
);
const unchanged =
Math.abs(
previewPrice -
startPrice
) /
ref <
1e-5;

dragStop =
null;
detachStopDragListeners();
badgeEl?.classList.remove(
"is-dragging",
"is-invalid"
);

if(
unchanged
){
scheduleDraw();
refreshEntryHoverFromPointer();
return;
}

const validationErr =
validateStopPrice(
kind,
position.side,
previewPrice,
getMarkPrice()
);

if(
validationErr
){
alert(
validationErr
);
scheduleDraw();
refreshEntryHoverFromPointer();
return;
}

pendingStopPrice =
{
kind,
price:
previewPrice
};

if(
kind ===
"sl"
){
position.stopLoss =
previewPrice;
}else{
position.takeProfit =
previewPrice;
}

scheduleDraw();

const api =
tradingApi();

if(
!api?.setPositionStop
){
pendingStopPrice =
null;
if(
kind ===
"sl"
){
position.stopLoss =
prevStop;
}else{
position.takeProfit =
prevStop;
}
scheduleDraw();
return;
}

const result =
await api.setPositionStop(
position.symbol,
kind,
previewPrice
);

if(
result?.ok ===
false
){
pendingStopPrice =
null;

if(
kind ===
"sl"
){
position.stopLoss =
prevStop;
}else{
position.takeProfit =
prevStop;
}

alert(
result.message ||
"Не удалось обновить"
);
scheduleDraw();
return;
}

await syncPosition(
true
);
pendingStopPrice =
null;
window.dispatchEvent(
new CustomEvent(
"trade-book-refresh"
)
);
scheduleDraw();
refreshEntryHoverFromPointer();

}

function onStopPointerMove(
e
){

if(
!dragStop ||
e.pointerId !==
dragStop.pointerId
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

dragStop.previewPrice =
price;
dragStop.moved =
true;
refreshDragPreview();

}

function onStopPointerUp(
e
){

if(
!dragStop ||
e.pointerId !==
dragStop.pointerId
){
return;
}

detachStopDragListeners();
void commitStopDrag();

}

function refreshEntryHoverFromPointer(){

if(
!position ||
dragStop
){
return;
}

const entryBadge =
badgeLayoutCache?.elementsByKind?.get(
"entry"
);
const hovered =
!!(
entryZoneEl?.matches?.(
":hover"
) ||
handlesEl?.matches?.(
":hover"
) ||
entryBadge?.matches?.(
":hover"
)
);

if(
hovered !==
entryHover
){
entryHover =
hovered;
syncEntryHoverUI();

if(
hovered
){
host?.getDrawingTools?.()?.scheduleRedraw?.();
}

}

}

function onEntryHoverIn(){

if(
!position ||
dragStop
){
return;
}

entryHover =
true;
syncEntryHoverUI();
host?.getDrawingTools?.()?.scheduleRedraw?.();

}

function onEntryHoverOut(){

if(
dragStop
){
return;
}

entryHover =
false;
syncEntryHoverUI();
host?.getDrawingTools?.()?.scheduleRedraw?.();

}

function syncEntryHoverUI(){

if(
!entryZoneEl ||
!handlesEl ||
!position
){
return;
}

const entry =
Number(
position.avgPrice
);
const entryY =
priceToY(
entry
);

if(
entryY ==
null ||
!Number.isFinite(
entryY
)
){
entryZoneEl.hidden =
true;
handlesEl.hidden =
true;
return;
}

entryZoneEl.hidden =
false;
entryZoneEl.style.top =
`${entryY}px`;

const showHandles =
entryHover &&
!dragStop;
const needSl =
getCommittedStopPrice(
"sl"
) <=
0;
const needTp =
getCommittedStopPrice(
"tp"
) <=
0;

handlesEl.hidden =
!showHandles ||
(
!needSl &&
!needTp
);

if(
handlesEl.hidden
){
return;
}

slHandleEl.hidden =
!needSl;
tpHandleEl.hidden =
!needTp;

const entryGap =
badgeLayoutCache?.gapByKind?.get(
"entry"
) ||
0;

handlesEl.style.top =
`${entryY}px`;
handlesEl.style.left =
`${BADGE_LEFT + entryGap + 4}px`;

}

function onHandlePointerDown(
e,
kind
){

if(
!position ||
!e.isPrimary
){
return;
}

e.preventDefault();
e.stopPropagation();

beginStopDrag(
e,
kind,
getCommittedStopPrice(
kind
)
);

}

function onBadgePointerDown(
e
){

if(
!position ||
!e.isPrimary
){
return;
}

const badge =
e.target.closest(
".trade-pos-badge"
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

const kind =
badge.dataset.kind;

if(
kind !==
"sl" &&
kind !==
"tp"
){
return;
}

const startPrice =
getEffectiveStopPrice(
kind
);

if(
startPrice <=
0
){
return;
}

e.preventDefault();
e.stopPropagation();

beginStopDrag(
e,
kind,
startPrice
);

}

function getPositionLayoutKey(
pos
){

if(
!pos
){
return "";
}

return [
pos.symbol,
pos.side,
pos.avgPrice,
Number(
pos.stopLoss
) ||
0,
Number(
pos.takeProfit
) ||
0,
pos.volumeUsdt,
pos.leverage,
dragStop
? `${dragStop.kind}-drag`
: ""
].join(
"|"
);

}

function invalidateBadgeLayoutCache(){

badgeLayoutCache =
null;

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

return host?.series?.priceToCoordinate?.(
price
) ??
null;

}

function buildBadgeSpecs(){

if(
!position
){
return [];
}

const entry =
Number(
position.avgPrice
);
const entryY =
priceToY(
entry
);
const isLong =
position.side ===
"Buy";
const entryColor =
isLong
? "#22c55e"
: "#ef4444";
const sl =
getEffectiveStopPrice(
"sl"
);
const tp =
getEffectiveStopPrice(
"tp"
);
const pnlClass =
position.pnl >=
0
? "is-pos"
: "is-neg";
const lev =
position.leverage
? `${position.leverage}x`
: "—";
const badgeSpecs =
[];

if(
entryY !=
null &&
Number.isFinite(
entryY
)
){
badgeSpecs.push(
{
kind:
"entry",
y:
entryY,
className:
isLong
? "trade-pos-badge--long"
: "trade-pos-badge--short",
html:
`
<span class="seg seg-vol">${formatVolume(position.volumeUsdt)}</span>
<span class="seg seg-lev">${lev}</span>
<span class="seg seg-pnl ${pnlClass}">${formatPnl(position.pnl)}</span>
<button type="button" class="seg seg-close" data-action="close" title="Закрыть по рынку" aria-label="Закрыть позицию">×</button>
`,
line:{
y:
entryY,
color:
entryColor,
opacity:
1,
dash:
[]
}
}
);
}

if(
sl >
0
){
const slY =
priceToY(
sl
);

if(
slY !=
null &&
Number.isFinite(
slY
)
){
const slUsd =
pnlAtPrice(
position.side,
entry,
sl,
position.size
);

badgeSpecs.push(
{
kind:
"sl",
y:
slY,
className:
"trade-pos-badge--sl",
html:
`
<span class="seg seg-tag">SL</span>
<span class="seg seg-amt">${formatStopUsd(slUsd)} USDT</span>
<button type="button" class="seg seg-close" data-action="cancel-sl" title="Убрать стоп-лосс" aria-label="Убрать SL">×</button>
`,
line:{
y:
slY,
color:
"#ef4444",
opacity:
LINE_OPACITY_SLTP,
dash:
[]
}
}
);
}

}

if(
tp >
0
){
const tpY =
priceToY(
tp
);

if(
tpY !=
null &&
Number.isFinite(
tpY
)
){
const tpUsd =
pnlAtPrice(
position.side,
entry,
tp,
position.size
);

badgeSpecs.push(
{
kind:
"tp",
y:
tpY,
className:
"trade-pos-badge--tp",
html:
`
<span class="seg seg-tag">TP</span>
<span class="seg seg-amt">${formatStopUsd(tpUsd)} USDT</span>
<button type="button" class="seg seg-close" data-action="cancel-tp" title="Убрать тейк-профит" aria-label="Убрать TP">×</button>
`,
line:{
y:
tpY,
color:
"#22c55e",
opacity:
LINE_OPACITY_SLTP,
dash:
[]
}
}
);
}

}

return badgeSpecs;

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
badgeLayoutCache.elementsByKind.get(
spec.kind
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

if(
spec.kind ===
"entry"
){
const pnlEl =
el.querySelector(
".seg-pnl"
);

if(
pnlEl &&
position
){
const pnlClass =
position.pnl >=
0
? "is-pos"
: "is-neg";
pnlEl.className =
`seg seg-pnl ${pnlClass}`;
pnlEl.textContent =
formatPnl(
position.pnl
);
}

}

if(
spec.kind ===
"sl" ||
spec.kind ===
"tp"
){
const amtEl =
el.querySelector(
".seg-amt"
);

if(
amtEl
){
const entry =
Number(
position.avgPrice
);
const stop =
getEffectiveStopPrice(
spec.kind
);
const usd =
pnlAtPrice(
position.side,
entry,
stop,
position.size
);
amtEl.textContent =
`${formatStopUsd(usd)} USDT`;
}

if(
dragStop?.kind ===
spec.kind
){
const invalid =
validateStopPrice(
spec.kind,
position.side,
dragStop.previewPrice,
getMarkPrice()
);

el.classList.toggle(
"is-invalid",
!!invalid
);
}

}

}

}

return badgeLayoutCache.gapByKind;

}

badgesEl.innerHTML =
"";

const gapByKind =
new Map();
const elementsByKind =
new Map();

for(
const spec of badgeSpecs
){
const el =
document.createElement(
"div"
);

el.className =
`trade-pos-badge ${spec.className}`;
el.dataset.kind =
spec.kind;
el.style.left =
`${BADGE_LEFT}px`;
el.style.top =
`${spec.y}px`;
el.innerHTML =
spec.html;
badgesEl.appendChild(
el
);

elementsByKind.set(
spec.kind,
el
);

gapByKind.set(
spec.kind,
el.getBoundingClientRect().width ||
0
);
}

badgeLayoutCache =
{
key:
layoutKey,
gapByKind,
elementsByKind
};

return gapByKind;

}

function paintOnDrawingsCtx(
ctx,
plotW
){

if(
!ensureDom()
){
return;
}

if(
!ctx ||
!position ||
!Number.isFinite(
plotW
)
){
return;
}

const badgeSpecs =
buildBadgeSpecs();
const layoutKey =
getPositionLayoutKey(
position
);
const gapByKind =
syncBadgeDom(
badgeSpecs,
layoutKey
);

refreshEntryHoverFromPointer();
syncEntryHoverUI();

const entryExtraGap =
entryHover &&
handlesEl &&
!handlesEl.hidden
? (
handlesEl.offsetWidth +
4
)
: 0;

paintBadgeLines(
ctx,
plotW,
badgeSpecs,
gapByKind,
entryExtraGap
);

}

function onAfterDrawingsRedraw(
ctx,
plotW
){

if(
!position
){
return;
}

root.hidden =
false;
paintOnDrawingsCtx(
ctx,
plotW ??
getPlotWidth(
host
)
);

}

function onPriceScaleDragEnd(){

scheduleDraw();

}

if(
!widgetInstance
){
window.__tradeChartOverlay =
{
onPriceScaleDragEnd
};
}

function destroy(){

mountAbort?.abort();
mountAbort =
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

stopDragListeners?.();
stopDragListeners =
null;
dragStop =
null;
pendingStopPrice =
null;
position =
null;
badgeLayoutCache =
null;

root?.remove();
root =
null;
badgesEl =
null;
entryZoneEl =
null;
handlesEl =
null;
slHandleEl =
null;
tpHandleEl =
null;
host =
null;

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
"trade-chart-overlay";

entryZoneEl =
document.createElement(
"div"
);
entryZoneEl.className =
"trade-pos-entry-zone";
entryZoneEl.hidden =
true;

handlesEl =
document.createElement(
"div"
);
handlesEl.className =
"trade-pos-handles";
handlesEl.hidden =
true;

slHandleEl =
document.createElement(
"button"
);
slHandleEl.type =
"button";
slHandleEl.className =
"trade-pos-handle trade-pos-handle--sl";
slHandleEl.textContent =
"СЛ";
slHandleEl.title =
"Поставить стоп-лосс";
slHandleEl.setAttribute(
"aria-label",
"Стоп-лосс"
);

tpHandleEl =
document.createElement(
"button"
);
tpHandleEl.type =
"button";
tpHandleEl.className =
"trade-pos-handle trade-pos-handle--tp";
tpHandleEl.textContent =
"ТП";
tpHandleEl.title =
"Поставить тейк-профит";
tpHandleEl.setAttribute(
"aria-label",
"Тейк-профит"
);

handlesEl.append(
slHandleEl,
tpHandleEl
);

badgesEl =
document.createElement(
"div"
);
badgesEl.className =
"trade-chart-overlay-badges";

root.append(
entryZoneEl,
badgesEl,
handlesEl
);
host.wrapEl.appendChild(
root
);

entryZoneEl.addEventListener(
"mouseenter",
onEntryHoverIn
);
entryZoneEl.addEventListener(
"mouseleave",
onEntryHoverOut
);
handlesEl.addEventListener(
"mouseenter",
onEntryHoverIn
);
handlesEl.addEventListener(
"mouseleave",
onEntryHoverOut
);

slHandleEl.addEventListener(
"pointerdown",
e=>
onHandlePointerDown(
e,
"sl"
)
);
tpHandleEl.addEventListener(
"pointerdown",
e=>
onHandlePointerDown(
e,
"tp"
)
);

badgesEl.addEventListener(
"pointerdown",
onBadgePointerDown
);

badgesEl.addEventListener(
"mouseover",
e=>{

if(
e.target.closest(
'.trade-pos-badge[data-kind="entry"]'
)
){
onEntryHoverIn();
}

}
);

badgesEl.addEventListener(
"mouseout",
e=>{

const entryBadge =
e.target.closest(
'.trade-pos-badge[data-kind="entry"]'
);

if(
!entryBadge
){
return;
}

const related =
e.relatedTarget;

if(
related &&
(
entryBadge.contains(
related
) ||
handlesEl?.contains(
related
) ||
entryZoneEl?.contains(
related
)
)
){
return;
}

onEntryHoverOut();

}
);

badgesEl.addEventListener(
"click",
event=>{

const btn =
event.target.closest(
"[data-action]"
);

if(
!btn ||
!position
){
return;
}

event.preventDefault();
event.stopPropagation();

const action =
btn.dataset.action;

if(
action ===
"close"
){
if(
!confirm(
`Закрыть ${position.ticker} по рынку?`
)
){
return;
}

void (
async()=>{

const result =
await tradingApi()?.closePosition?.(
position.symbol
);

if(
result?.ok ===
false
){
alert(
result.message ||
"Не удалось закрыть"
);
return;
}

await syncPosition(
true
);
window.dispatchEvent(
new CustomEvent(
"trade-book-refresh"
)
);

}
)();
return;
}

if(
action ===
"cancel-sl"
){
void cancelStop(
"sl"
);
return;
}

if(
action ===
"cancel-tp"
){
void cancelStop(
"tp"
);
}

}
);

return true;

}

async function cancelStop(
target
){

const result =
await tradingApi()?.cancelPositionStop?.(
position.symbol,
target
);

if(
result?.ok ===
false
){
alert(
result.message ||
"Не удалось отменить"
);
return;
}

await syncPosition(
true
);
window.dispatchEvent(
new CustomEvent(
"trade-book-refresh"
)
);

}

function draw(){

if(
!ensureDom()
){
return;
}

if(
!position
){
badgesEl.innerHTML =
"";
invalidateBadgeLayoutCache();
entryHover =
false;

if(
entryZoneEl
){
entryZoneEl.hidden =
true;
}

if(
handlesEl
){
handlesEl.hidden =
true;
}

root.hidden =
true;
host?.getDrawingTools?.()?.scheduleRedraw?.();
return;
}

root.hidden =
false;

if(
dragStop
){
scheduleStopDragRedraw();
return;
}

const badgeSpecs =
buildBadgeSpecs();
const layoutKey =
getPositionLayoutKey(
position
);

syncBadgeDom(
badgeSpecs,
layoutKey
);
refreshEntryHoverFromPointer();
syncEntryHoverUI();
host?.getDrawingTools?.()?.scheduleRedraw?.();

}

function paintBadgeLines(
ctx,
plotW,
badgeSpecs,
gapByKind,
entryExtraGap =
0
){

for(
const spec of badgeSpecs
){
if(
!spec.line
){
continue;
}

let gapW =
(
gapByKind.get(
spec.kind
) ||
0
) +
2;

if(
spec.kind ===
"entry"
){
gapW +=
entryExtraGap;
}

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

function scheduleDraw(
immediate =
false
){

if(
immediate
){

if(
rafId
){
cancelAnimationFrame(
rafId
);
rafId =
0;
}

draw();
return;

}

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

function applyPositionUpdate(
nextPos,
symbol
){

if(
!host
){
return;
}

const current =
normalizeOverlaySymbol(
host.getSymbol?.()
);
const target =
normalizeOverlaySymbol(
symbol
);

if(
!target ||
current !==
target
){
return;
}

if(
!nextPos
){
position =
null;
invalidateBadgeLayoutCache();
scheduleDraw(
true
);
return;
}

position =
nextPos;
invalidateBadgeLayoutCache();
scheduleDraw(
true
);

}

async function syncPosition(
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
!api?.getPosition
){
position =
null;
scheduleDraw(
true
);
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
position =
null;
scheduleDraw(
true
);
return;
}

const cached =
getCachedPosition(
symbol
);

if(
cached
){
position =
cached;
invalidateBadgeLayoutCache();
scheduleDraw(
true
);
}else{
await syncTradePositionsCache();

const bulk =
getCachedPosition(
symbol
);

if(
bulk
){
position =
bulk;
invalidateBadgeLayoutCache();
scheduleDraw(
true
);
return;
}
}

const result =
await api.getPosition(
symbol
);

if(
normalizeOverlaySymbol(
host.getSymbol?.()
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
position =
null;
scheduleDraw(
true
);
return;
}

position =
result.position ||
null;
invalidateBadgeLayoutCache();
scheduleDraw(
true
);
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
String(
event?.detail?.symbol ||
""
).trim().toUpperCase();
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
()=>{
/* Бейджи и линии гаснут вместе через veil на #chart-wrap — не чистим DOM заранее. */
};

const onCandlesLoaded =
e=>{

if(
!host
){
return;
}

if(
!chartEventSymbolMatches(
e,
host.getSymbol?.()
)
){
return;
}

void syncPosition(
true
);
scheduleDraw(
true
);

};

window.addEventListener(
"chart-switch-start",
onSwitchStart,
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

const ro =
new ResizeObserver(
scheduleDraw
);

ro.observe(
host.wrapEl
);

void syncPosition(
true
);

const sym =
normalizeOverlaySymbol(
host.getSymbol?.()
);
const cached =
getCachedPosition(
sym
);

if(
cached
){
position =
cached;
invalidateBadgeLayoutCache();
scheduleDraw(
true
);
}

window.addEventListener(
"trade-book-refresh",
()=>{
void syncPosition(
true
);
},
{
signal
}
);

window.addEventListener(
"trade-position-updated",
event=>{

applyPositionUpdate(
event.detail?.position,
event.detail?.symbol
);

},
{
signal
}
);

}

const controller =
{
refresh:()=>
syncPosition(
true
),
drawNow:()=>
scheduleDraw(
true
),
destroy,
onPriceScaleDragEnd
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

export function initTradeChartOverlay(){

return createTradeChartOverlay();

}
