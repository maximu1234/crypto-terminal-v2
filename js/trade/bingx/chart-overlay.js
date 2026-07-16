/**
 * /trade — линии и плашки открытой позиции, SL/TP на графике.
 */
import {
getCachedPosition,
removeTradePositionFromCache,
syncTradePositionsCache,
upsertTradePositionInCache,
markTradePositionRecentlyClosed,
isTradePositionRecentlyClosed
} from "./positions-cache.js?v=1";

import {
markStopDismissed,
clearDismissedStops
} from "./auto-stops.js?v=1";

import {
isExchangeTradingEnabled
} from "../../market-api.js?v=2";

import {
getTradeConfig
} from "./config.js?v=1";

import {
formatTradePnl,
formatTradeUsdt
} from "../../trade-format.js?v=1";

import {
maskTradeDisplay
} from "../../trade-pnl-privacy.js?v=1";

const BADGE_LEFT =
12;

const LINE_OPACITY_SLTP =
0.60;

function tradingApi(){

return window.cryptoTerminalDesktop?.trading;

}

function tradePositionIpcOptions(
position
){

return {
positionSide:
position?.positionSide,
side:
position?.side,
position
};

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

function displayVolume(
value
){

return maskTradeDisplay(
formatVolume(
value
)
);

}

function displayPnl(
value
){

return maskTradeDisplay(
formatPnl(
value
)
);

}

function displayStopAmount(
value
){

return maskTradeDisplay(
`${formatStopUsd(value)} USDT`
);

}

function displayLeverage(
lev
){

return maskTradeDisplay(
lev
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
let chartSwitchFrozen =
false;
let switchVeilVisible =
false;
let switchVeilPosition =
null;
let switchLoadSeq =
0;

const stopCancelInflight =
new Map();

function getStopCancelButton(
target
){

const action =
target ===
"sl"
? "cancel-sl"
: "cancel-tp";

return badgesEl?.querySelector(
`[data-action="${action}"]`
) ||
null;

}

function setStopCancelButtonDisabled(
target,
disabled
){

const btn =
getStopCancelButton(
target
);

if(
!btn
){
return;
}

btn.disabled =
!!disabled;
btn.setAttribute(
"aria-busy",
disabled
? "true"
: "false"
);

}

function getDisplayPosition(){

if(
!isExchangeTradingEnabled()
){
return null;
}

if(
switchVeilVisible
){
return switchVeilPosition;
}

if(
chartSwitchFrozen
){
return null;
}

return position;

}

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
? getDisplayPosition()?.stopLoss
: getDisplayPosition()?.takeProfit
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
? getDisplayPosition()?.stopLoss
: getDisplayPosition()?.takeProfit
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
previewPrice,
tradePositionIpcOptions(
position
)
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

clearDismissedStops(
position.symbol,
position
);

const patched =
result?.position
? {
...position,
...result.position,
stopLoss:
kind ===
"sl"
? previewPrice
: (
Number(
result.position.stopLoss
) ||
position.stopLoss
),
takeProfit:
kind ===
"tp"
? previewPrice
: (
Number(
result.position.takeProfit
) ||
position.takeProfit
)
}
: {
...position
};

upsertTradePositionInCache(
patched
);

if(
result?.position
){
position =
{
...position,
...patched
};
}

if(
!getTradeConfig().skipSyncPositionAfterStopAmend
){
await syncPosition(
true
);
}

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

function isDrawPlacementActive(){

const dt =
host?.getDrawingTools?.();

return !!dt?.isPlacementActive?.();

}

function isPointerNearEntryY(
clientY
){

if(
!host?.wrapEl ||
!position ||
!Number.isFinite(
clientY
)
){
return false;
}

const rect =
host.wrapEl.getBoundingClientRect();
const y =
clientY -
rect.top;
const entryY =
priceToY(
Number(
position.avgPrice
)
);

if(
entryY ==
null ||
!Number.isFinite(
entryY
)
){
return false;
}

return Math.abs(
y -
entryY
) <=
8;

}

function refreshEntryHoverFromPointer(
clientY
){

if(
!position ||
dragStop
){
return;
}

if(
isDrawPlacementActive()
){

if(
entryHover
){
entryHover =
false;
syncEntryHoverUI();
}

return;
}

const entryBadge =
badgeLayoutCache?.elementsByKind?.get(
"entry"
);
const hovered =
!!(
(
Number.isFinite(
clientY
) &&
isPointerNearEntryY(
clientY
)
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

function onWrapPointerMove(
e
){

refreshEntryHoverFromPointer(
e.clientY
);

}

function onWrapPointerLeave(){

if(
!entryHover
){
return;
}

entryHover =
false;
syncEntryHoverUI();
host?.getDrawingTools?.()?.scheduleRedraw?.();

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
pos.positionSide ||
pos.side,
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

const activePosition =
getDisplayPosition();

if(
!activePosition
){
return [];
}

const entry =
Number(
activePosition.avgPrice
);
const entryY =
priceToY(
entry
);
const isLong =
activePosition.side ===
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
activePosition.pnl >=
0
? "is-pos"
: "is-neg";
const lev =
activePosition.leverage
? `${activePosition.leverage}x`
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
<span class="seg seg-vol">${displayVolume(activePosition.volumeUsdt)}</span>
<span class="seg seg-lev">${displayLeverage(lev)}</span>
<span class="seg seg-pnl ${pnlClass}">${displayPnl(activePosition.pnl)}</span>
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
activePosition.side,
entry,
sl,
activePosition.size
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
<span class="seg seg-amt">${displayStopAmount(slUsd)}</span>
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
activePosition.side,
entry,
tp,
activePosition.size
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
<span class="seg seg-amt">${displayStopAmount(tpUsd)}</span>
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

const displayPosition =
getDisplayPosition();

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
displayPosition
){
const pnlClass =
displayPosition.pnl >=
0
? "is-pos"
: "is-neg";
pnlEl.className =
`seg seg-pnl ${pnlClass}`;
pnlEl.textContent =
displayPnl(
displayPosition.pnl
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
amtEl &&
displayPosition
){
const entry =
Number(
displayPosition.avgPrice
);
const stop =
getEffectiveStopPrice(
spec.kind
);
const usd =
pnlAtPrice(
displayPosition.side,
entry,
stop,
displayPosition.size
);
amtEl.textContent =
displayStopAmount(
usd
);
}

if(
dragStop?.kind ===
spec.kind &&
displayPosition
){
const invalid =
validateStopPrice(
spec.kind,
displayPosition.side,
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

if(
spec.kind ===
"sl"
){
wireBadgeCloseButton(
el,
"cancel-sl",
()=>{
void cancelStop(
"sl"
);
}
);
}else if(
spec.kind ===
"tp"
){
wireBadgeCloseButton(
el,
"cancel-tp",
()=>{
void cancelStop(
"tp"
);
}
);
}else if(
spec.kind ===
"entry"
){
wireBadgeCloseButton(
el,
"close",
()=>{

if(
!position
){
return;
}

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
position.symbol,
tradePositionIpcOptions(
position
)
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

const closedSymbol =
position?.symbol;
const closedOpts =
tradePositionIpcOptions(
position
);
position =
null;
pendingStopPrice =
null;
dragStop =
null;
detachStopDragListeners();
invalidateBadgeLayoutCache();
scheduleDraw(
true
);

if(
closedSymbol
){
removeTradePositionFromCache(
closedSymbol,
closedOpts
);
}

/* Some exchanges lag after close — syncPosition would revive a ghost. */
if(
!getTradeConfig().skipSyncPositionAfterClose
){
await syncPosition(
true
);
}
window.dispatchEvent(
new CustomEvent(
"trade-open-positions-changed"
)
);

}
)();

}
);
}

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
!getDisplayPosition() ||
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
getDisplayPosition()
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
!getDisplayPosition()
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
chartSwitchFrozen =
false;
switchVeilVisible =
false;
switchVeilPosition =
null;
switchLoadSeq =
0;

root?.remove();
root =
null;
badgesEl =
null;
host?.wrapEl?.removeEventListener(
"pointermove",
onWrapPointerMove
);
host?.wrapEl?.removeEventListener(
"pointerleave",
onWrapPointerLeave
);
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

host.wrapEl.addEventListener(
"pointermove",
onWrapPointerMove
);
host.wrapEl.addEventListener(
"pointerleave",
onWrapPointerLeave
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
position.symbol,
tradePositionIpcOptions(
position
)
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

const closedSymbol =
position?.symbol;
const closedOpts =
tradePositionIpcOptions(
position
);
position =
null;
pendingStopPrice =
null;
dragStop =
null;
detachStopDragListeners();
invalidateBadgeLayoutCache();
scheduleDraw(
true
);

if(
closedSymbol
){
removeTradePositionFromCache(
closedSymbol,
closedOpts
);
}

/* Some exchanges lag after close — syncPosition would revive a ghost. */
if(
!getTradeConfig().skipSyncPositionAfterClose
){
await syncPosition(
true
);
}
window.dispatchEvent(
new CustomEvent(
"trade-open-positions-changed"
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

if(
!position
){
return;
}

const sym =
position.symbol;
const inflightKey =
`${sym}:${target}`;
const existing =
stopCancelInflight.get(
inflightKey
);

if(
existing
){
return existing;
}

const promise =
(async()=>{

setStopCancelButtonDisabled(
target,
true
);

try{
const result =
await tradingApi()?.cancelPositionStop?.(
sym,
target,
tradePositionIpcOptions(
position
)
);

if(
result?.ok ===
false
){
alert(
result.message ||
"Не удалось отменить"
);

if(
!getTradeConfig().skipSyncPositionAfterStopCancel
){
await syncPosition(
true
);
}

return;
}

applyLocalStopCancel(
sym,
target
);

/* Some exchanges: do not syncPosition here — a false-empty getPosition
 * after cancel clears the whole chart while the exchange position remains. */
}finally{
stopCancelInflight.delete(
inflightKey
);
setStopCancelButtonDisabled(
target,
false
);
}

})();

stopCancelInflight.set(
inflightKey,
promise
);
return promise;

}

function applyLocalStopCancel(
sym,
target
){

if(
!position
){
return;
}

const prevPosition =
{
...position
};
const nextPosition =
{
...position
};

if(
target ===
"sl"
){
nextPosition.stopLoss =
0;
delete nextPosition.slOrderId;
}else if(
target ===
"tp"
){
nextPosition.takeProfit =
0;
delete nextPosition.tpOrderId;
}

position =
nextPosition;
markStopDismissed(
sym,
prevPosition,
target
);
upsertTradePositionInCache(
nextPosition
);
invalidateBadgeLayoutCache();
scheduleDraw(
true
);

window.dispatchEvent(
new CustomEvent(
"trade-position-updated",
{
detail:{
symbol:
sym,
position:
nextPosition
}
}
)
);
window.dispatchEvent(
new CustomEvent(
"trade-open-positions-changed"
)
);

}

function wireBadgeCloseButton(
el,
action,
handler
){

const btn =
el.querySelector(
`[data-action="${action}"]`
);

if(
!btn ||
btn.dataset.wired ===
"1"
){
return;
}

btn.dataset.wired =
"1";
btn.addEventListener(
"click",
event=>{
event.preventDefault();
event.stopPropagation();
handler();
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
!getDisplayPosition()
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
getDisplayPosition()
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

if(
chartSwitchFrozen
){
return;
}

const current =
normalizeOverlaySymbol(
host?.getSymbol?.()
);
const target =
normalizeOverlaySymbol(
symbol
);
const policy =
getTradeConfig();
const symbolMatches =
target &&
(
current ===
target ||
(
typeof policy.keysMatchSymbol ===
"function" &&
(
policy.keysMatchSymbol(
target,
current
) ||
policy.keysMatchSymbol(
current,
target
)
)
)
);

if(
!symbolMatches
){
return;
}

if(
!nextPos
){
position =
null;
pendingStopPrice =
null;
dragStop =
null;
detachStopDragListeners();
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
host?.getSymbol?.();

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

if(
!force
){

const posHint =
position;
const cached =
getCachedPosition(
symbol,
tradePositionIpcOptions(
posHint
)
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
return;
}

}

/* Optimistic open: cache is authoritative for a few seconds. */
const cachedOptimistic =
getCachedPosition(
symbol,
tradePositionIpcOptions(
position
)
);

if(
cachedOptimistic?._optimistic &&
Date.now() -
(
Number(
cachedOptimistic._optimisticAt
) ||
0
) <
8000
){
position =
cachedOptimistic;
invalidateBadgeLayoutCache();
scheduleDraw(
true
);
return;
}

await syncTradePositionsCache();

if(
!host
){
return;
}

const result =
await api.getPosition(
symbol,
tradePositionIpcOptions(
position
)
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
result?.ok
){
const next =
result.position ||
null;

if(
next &&
getTradeConfig().skipSyncPositionAfterClose &&
isTradePositionRecentlyClosed(
symbol,
tradePositionIpcOptions(
next
)
)
){
const dropOpts =
tradePositionIpcOptions(
next
);
position =
null;
removeTradePositionFromCache(
symbol,
dropOpts
);
invalidateBadgeLayoutCache();
scheduleDraw(
true
);
return;
}

if(
!next &&
getTradeConfig().verifyEmptyPositionViaList
){
const prev =
position ||
getCachedPosition(
symbol,
tradePositionIpcOptions(
position
)
);

if(
prev &&
Number(
prev.size
) >
0
){
const all =
await api.getPositions?.({
forceRefresh:
true
});

if(
all?.ok &&
!all.stale &&
!all.rateLimited &&
Array.isArray(
all.positions
)
){
const hintOpts =
tradePositionIpcOptions(
prev
);
const policy =
getTradeConfig();
const hintKey =
typeof policy.positionMapKey ===
"function"
? policy.positionMapKey({
symbol,
...hintOpts
})
: "";
const found =
all.positions.find(
item=>{
if(
normalizeOverlaySymbol(
item?.symbol
) !==
normalizeOverlaySymbol(
symbol
)
){
return false;
}

if(
!hintKey ||
typeof policy.positionMapKey !==
"function"
){
return true;
}

return policy.positionMapKey(
item
) ===
hintKey;
}
);

if(
!found
){
position =
null;
removeTradePositionFromCache(
symbol
);
invalidateBadgeLayoutCache();
scheduleDraw(
true
);
return;
}

position =
found;
invalidateBadgeLayoutCache();
scheduleDraw(
true
);
return;
}

/* Never soft-keep prev on failed/rate-limited list — that revives
 * a closed position as a 1–2s chart ghost. */
position =
null;
removeTradePositionFromCache(
symbol,
tradePositionIpcOptions(
prev
)
);
invalidateBadgeLayoutCache();
scheduleDraw(
true
);
return;
}

position =
null;
removeTradePositionFromCache(
symbol,
tradePositionIpcOptions(
prev
)
);
}else{
/* Bybit (metka-70): empty getPosition after open must not wipe cache/tombstone. */
if(
!next &&
getTradeConfig().softKeepCachedOnEmptyGetPosition
){
position =
getCachedPosition(
symbol,
tradePositionIpcOptions(
position
)
) ||
null;
}else{
position =
next;

if(
!position
){
removeTradePositionFromCache(
symbol,
tradePositionIpcOptions(
next
)
);
}
}
}
}else{
position =
getCachedPosition(
symbol,
tradePositionIpcOptions(
position
)
) ||
null;
}

invalidateBadgeLayoutCache();
scheduleDraw(
true
);
}finally{
fetching =
false;
}

}

function applyStreamPositions(
positions
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

const sym =
normalizeOverlaySymbol(
host?.getSymbol?.()
);
const list =
Array.isArray(
positions
)
? positions
: [];
const policy =
getTradeConfig();
const preferKey =
position &&
typeof policy.positionMapKey ===
"function"
? policy.positionMapKey(
position
)
: "";
const symbolMatches =
list.filter(
item=>
normalizeOverlaySymbol(
item?.symbol
) ===
sym
);
let resolvedRow =
null;

if(
preferKey &&
typeof policy.positionMapKey ===
"function"
){
resolvedRow =
symbolMatches.find(
item=>
policy.positionMapKey(
item
) ===
preferKey
) ||
null;
}else if(
symbolMatches.length ===
1
){
/* No side on overlay yet — only accept a unique symbol match. */
resolvedRow =
symbolMatches[
0
];
}

if(
resolvedRow
){
if(
isTradePositionRecentlyClosed(
sym,
tradePositionIpcOptions(
resolvedRow
)
)
){
position =
null;
}else{
position =
resolvedRow;
}
}else if(
list.length ===
0
){
if(
getTradeConfig().streamMissClearsCache
){
position =
null;
removeTradePositionFromCache(
sym,
tradePositionIpcOptions(
position
)
);
}else{
/* Bybit: empty snapshot after open is lag — keep cache, no tombstone. */
position =
getCachedPosition(
sym,
tradePositionIpcOptions(
position
)
) ||
null;
}

}else if(
!symbolMatches.length
){
/* Symbol missing from a non-empty snapshot → closed on exchange */
position =
null;
removeTradePositionFromCache(
sym,
{
...tradePositionIpcOptions(
position
),
markRecentlyClosed:
getTradeConfig().streamMissClearsCache !==
false
}
);
}

invalidateBadgeLayoutCache();
scheduleDraw(
true
);

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
switchVeilPosition =
position;
switchVeilVisible =
!!position;
position =
null;
stopDragListeners?.();
stopDragListeners =
null;
dragStop =
null;
pendingStopPrice =
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
switchVeilPosition =
null;
position =
null;
invalidateBadgeLayoutCache();
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
switchVeilPosition =
null;
position =
null;
invalidateBadgeLayoutCache();
scheduleDraw(
true
);
host?.getDrawingTools?.()?.scheduleRedraw?.();

try{
await syncPosition(
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

window.addEventListener(
"trade-book-refresh",
()=>{
void syncPosition(
false
);
},
{
signal
}
);

window.addEventListener(
"trade-stream-positions",
event=>{
applyStreamPositions(
event.detail?.positions
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

window.addEventListener(
"trade-open-positions-changed",
()=>{

if(
!host ||
chartSwitchFrozen
){
return;
}

const sym =
normalizeOverlaySymbol(
host?.getSymbol?.()
);

if(
!sym ||
!position
){
return;
}

const cached =
getCachedPosition(
sym,
tradePositionIpcOptions(
position
)
);

if(
!cached
){
position =
null;
pendingStopPrice =
null;
dragStop =
null;
detachStopDragListeners();
invalidateBadgeLayoutCache();
scheduleDraw(
true
);
}

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
