/**
 * /trade — панель позиций и ордеров (низ списка монет).
 */
import {
formatTradePnl,
formatTradeUsdt
} from "../../trade-format.js?v=1";

import {
getAllCachedPositions,
isTradePositionRecentlyClosed,
removeTradePositionFromCache,
syncTradePositionsCache
} from "./positions-cache.js?v=1";

import {
getTradeConfig
} from "./config.js?v=3";

import {
applyPositionColumnLayout,
applyOrderColumnLayout,
applyAlertColumnLayout,
wirePositionColumnResize,
wireOrderColumnResize,
wireAlertColumnResize,
columnResizeHandle
} from "./book-columns.js?v=1";

import {
openPnlShareModal
} from "./pnl-share-modal.js?v=1";

import {
formatAlertDate,
formatAlertTicker,
getAlertsSorted,
getAlertsHistorySorted,
removeAlert,
removeAlertHistoryEntry
} from "../../alerts.js?v=105";

const SHARE_ICON_V =
2;

const SHARE_BUTTON_HTML =
`<button type="button" class="trade-book-share" data-action="share-pnl" aria-label="Поделиться PnL" title="Поделиться PnL">
<img class="trade-book-share-icon trade-book-share-icon--off" src="/assets/share_off.png?v=${SHARE_ICON_V}" width="14" height="14" alt="">
<img class="trade-book-share-icon trade-book-share-icon--on" src="/assets/share_on.png?v=${SHARE_ICON_V}" width="14" height="14" alt="">
</button>`;

const PANEL_HEIGHT_KEY =
"trade_book_panel_height_v1";

const PANEL_DEFAULT_H =
168;

/** Шапка + заголовки колонок + строка суммарного PnL — без строк позиций. */
const PANEL_MIN_H =
106;

const PANEL_MIN_COINS_BODY =
72;

const SPLIT_HANDLE_H =
10;

const SORT_STORAGE_KEY =
"trade_book_sort_v1";

const TOTAL_PNL_HIDDEN_KEY =
"trade_book_total_pnl_hidden_v1";

const EYE_OPEN_SVG =
`<svg class="trade-book-eye-svg trade-book-eye-svg--open" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`;

const EYE_CLOSED_SVG =
`<svg class="trade-book-eye-svg trade-book-eye-svg--closed" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><path d="M1 1l22 22"/></svg>`;

const DEFAULT_SORT =
{
positions:{
key:
"ticker",
asc:
true
},
orders:{
key:
"time",
asc:
false
}
};

function readTotalPnlHidden(){

try{
return localStorage.getItem(
TOTAL_PNL_HIDDEN_KEY
) ===
"1";
}catch{
return false;
}

}

function writeTotalPnlHidden(
hidden
){

try{

if(
hidden
){
localStorage.setItem(
TOTAL_PNL_HIDDEN_KEY,
"1"
);
}else{
localStorage.removeItem(
TOTAL_PNL_HIDDEN_KEY
);
}

window.dispatchEvent(
new CustomEvent(
"trade-total-pnl-visibility-changed"
)
);

}catch{
/* ignore */
}

}

function maskTradeValue(
hidden,
value
){

return hidden
? "***"
: value;

}

function readSortState(){

try{
const raw =
localStorage.getItem(
SORT_STORAGE_KEY
);

if(
!raw
){
return structuredClone(
DEFAULT_SORT
);
}

const parsed =
JSON.parse(
raw
);

return {
positions:{
key:
parsed?.positions?.key ||
DEFAULT_SORT.positions.key,
asc:
parsed?.positions?.asc ??
DEFAULT_SORT.positions.asc
},
orders:{
key:
parsed?.orders?.key ||
DEFAULT_SORT.orders.key,
asc:
parsed?.orders?.asc ??
DEFAULT_SORT.orders.asc
}
};

}catch{
return structuredClone(
DEFAULT_SORT
);
}

}

function writeSortState(
state
){

try{
localStorage.setItem(
SORT_STORAGE_KEY,
JSON.stringify(
state
)
);
}catch{
/* ignore */
}

}

function orderPanelTypeLabel(
row
){

return String(
row?.shortLabel ||
row?.label ||
""
).trim() ||
"—";

}

function compareBookText(
a,
b
){

return String(
a ||
""
).localeCompare(
String(
b ||
""
),
"ru",
{
sensitivity:
"base"
}
);

}

function sortPositionRows(
rows,
key,
asc
){

const sorted =
[
...rows
];

sorted.sort(
(
a,
b
)=>{

let cmp =
0;

if(
key ===
"ticker"
){
cmp =
compareBookText(
normalizeBookSymbol(
a.symbol
),
normalizeBookSymbol(
b.symbol
)
);
}else if(
key ===
"pnl"
){
cmp =
(
Number(
a.pnl
) ||
0
) -
(
Number(
b.pnl
) ||
0
);
}else if(
key ===
"volume"
){
cmp =
(
Number(
a.volumeUsdt
) ||
0
) -
(
Number(
b.volumeUsdt
) ||
0
);
}

return asc
? cmp
: -cmp;

}
);

return sorted;

}

function sortOrderRows(
rows,
key,
asc
){

const sorted =
[
...rows
];

sorted.sort(
(
a,
b
)=>{

let cmp =
0;

if(
key ===
"ticker"
){
cmp =
compareBookText(
normalizeBookSymbol(
a.symbol
),
normalizeBookSymbol(
b.symbol
)
);
}else if(
key ===
"type"
){
cmp =
compareBookText(
orderPanelTypeLabel(
a
),
orderPanelTypeLabel(
b
)
);
}else if(
key ===
"price"
){
cmp =
(
Number(
a.price
) ||
0
) -
(
Number(
b.price
) ||
0
);
}else if(
key ===
"time"
){
cmp =
(
Number(
a.createdAt
) ||
0
) -
(
Number(
b.createdAt
) ||
0
);
}

return asc
? cmp
: -cmp;

}
);

return sorted;

}

function defaultSortAsc(
mode,
key
){

if(
key ===
"ticker"
){
return true;
}

if(
mode ===
"orders" &&
key ===
"time"
){
return false;
}

return false;

}

function readPanelHeight(){

try{
const raw =
localStorage.getItem(
PANEL_HEIGHT_KEY
);
const num =
Number(
raw
);

if(
Number.isFinite(
num
)
){
return num;
}
}catch{
/* ignore */
}

return null;

}

function writePanelHeight(
height
){

try{
localStorage.setItem(
PANEL_HEIGHT_KEY,
String(
Math.round(
height
)
)
);
}catch{
/* ignore */
}

}

function measureCoinsListPaneMinHeight(
coinsListPane
){

const filter =
coinsListPane?.querySelector(
"#filter-wrap"
);
const refresh =
coinsListPane?.querySelector(
"#coins-list-refresh"
);
const header =
coinsListPane?.querySelector(
"#table-header"
);

return (
filter?.offsetHeight ||
0
) +
(
refresh?.offsetHeight ||
0
) +
(
header?.offsetHeight ||
0
) +
PANEL_MIN_COINS_BODY;

}

function measurePanelMaxHeight(
listEl,
coinsListPane
){

return Math.max(
PANEL_MIN_H,
listEl.clientHeight -
measureCoinsListPaneMinHeight(
coinsListPane
) -
SPLIT_HANDLE_H
);

}

function applyPanelHeight(
panel,
listEl,
coinsListPane,
height
){

const maxH =
measurePanelMaxHeight(
listEl,
coinsListPane
);
const h =
Math.min(
maxH,
Math.max(
PANEL_MIN_H,
height
)
);

panel.style.setProperty(
"--trade-book-panel-h",
`${h}px`
);

return h;

}

function wrapCoinsListPane(
listEl
){

const existing =
listEl.querySelector(
".coins-list-pane"
);

if(
existing
){
return existing;
}

const pane =
document.createElement(
"div"
);
pane.className =
"coins-list-pane";

while(
listEl.firstChild
){
pane.appendChild(
listEl.firstChild
);
}

listEl.appendChild(
pane
);

return pane;

}

function wrapCoinsTableScroll(
coinsListPane
){

if(
coinsListPane.querySelector(
".coins-table-scroll"
)
){
return;
}

const header =
coinsListPane.querySelector(
"#table-header"
);
const body =
coinsListPane.querySelector(
"#coins-body"
);

if(
!header ||
!body
){
return;
}

const scroll =
document.createElement(
"div"
);
scroll.id =
"coins-table-scroll";
scroll.className =
"coins-table-scroll";

header.parentNode.insertBefore(
scroll,
header
);
scroll.appendChild(
header
);
scroll.appendChild(
body
);

}

function wirePanelResize(
panel,
listEl,
splitHandle,
coinsListPane
){

let panelHeight =
readPanelHeight() ??
PANEL_DEFAULT_H;
let dragging =
false;
let dragStartY =
0;
let dragStartH =
0;

const handle =
splitHandle;

function syncHeight(
persist =
false
){

panelHeight =
applyPanelHeight(
panel,
listEl,
coinsListPane,
panelHeight
);

if(
persist
){
writePanelHeight(
panelHeight
);
}

}

function beginDrag(
clientY
){

dragging =
true;
dragStartY =
clientY;
dragStartH =
panelHeight;
document.body.classList.add(
"trade-book-panel-dragging"
);

}

function endDrag(){

if(
!dragging
){
return;
}

dragging =
false;
document.body.classList.remove(
"trade-book-panel-dragging"
);
syncHeight(
true
);

}

handle.addEventListener(
"pointerdown",
event=>{

if(
event.button !==
0
){
return;
}

event.preventDefault();
event.stopPropagation();
beginDrag(
event.clientY
);

try{
handle.setPointerCapture(
event.pointerId
);
}catch{
/* ignore */
}

}
);

handle.addEventListener(
"pointermove",
event=>{

if(
!dragging
){
return;
}

const delta =
dragStartY -
event.clientY;

panelHeight =
dragStartH +
delta;
syncHeight(
false
);

}
);

handle.addEventListener(
"pointerup",
endDrag
);
handle.addEventListener(
"pointercancel",
endDrag
);

handle.addEventListener(
"keydown",
event=>{

const step =
event.shiftKey
? 24
: 8;

if(
event.key ===
"ArrowUp"
){
event.preventDefault();
panelHeight +=
step;
syncHeight(
true
);
return;
}

if(
event.key ===
"ArrowDown"
){
event.preventDefault();
panelHeight -=
step;
syncHeight(
true
);
}

}
);

window.addEventListener(
"resize",
()=>{
syncHeight(
false
);
},
{
passive:
true
}
);

syncHeight(
false
);

}

function tradingApi(){

return window.cryptoTerminalDesktop?.trading;

}

function formatUsdt(
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
2
}
);

}

function formatPnl(
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

const text =
num.toLocaleString(
"ru-RU",
{
maximumFractionDigits:
2,
signDisplay:
"exceptZero"
}
);

return text;

}

function formatPrice(
value
){

const num =
Number(
value
);

if(
!Number.isFinite(
num
) ||
num ===
0
){
return "—";
}

return num.toLocaleString(
"ru-RU",
{
maximumFractionDigits:
8
}
);

}

function formatDateTime(
ms
){

const ts =
Number(
ms
);

if(
!Number.isFinite(
ts
) ||
ts <=
0
){
return "—";
}

return new Date(
ts
).toLocaleString(
"ru-RU",
{
day:
"2-digit",
month:
"2-digit",
hour:
"2-digit",
minute:
"2-digit"
}
);

}

function pnlClass(
value
){

const num =
Number(
value
);

if(
!Number.isFinite(
num
) ||
num ===
0
){
return "";
}

return num >
0
? "is-pos"
: "is-neg";

}

function isLongSide(
side
){

return side ===
"Buy" ||
String(
side ||
""
).toLowerCase() ===
"long";

}

function positionSideClass(
side
){

return isLongSide(
side
)
? "trade-book-side--long"
: "trade-book-side--short";

}

function normalizeBookSymbol(
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

export function initTradeBookPanel(){

if(
!document.body.classList.contains(
"trade-page"
)
){
return null;
}

const list =
document.getElementById(
"list"
);

if(
!list ||
document.getElementById(
"trade-book-panel"
)
){
return null;
}

const coinsListPane =
wrapCoinsListPane(
list
);
wrapCoinsTableScroll(
coinsListPane
);

const splitResize =
document.createElement(
"div"
);
splitResize.className =
"trade-book-split-resize";
splitResize.setAttribute(
"role",
"separator"
);
splitResize.setAttribute(
"aria-orientation",
"horizontal"
);
splitResize.setAttribute(
"aria-label",
"Высота панели позиций"
);
splitResize.tabIndex =
0;

const panel =
document.createElement(
"section"
);
panel.id =
"trade-book-panel";
panel.className =
"trade-book-panel";

panel.innerHTML =
`
<div class="trade-book-head">
<select class="trade-book-mode" aria-label="Позиции, ордера или алерты">
<option value="positions">Позиции</option>
<option value="orders">Ордера</option>
<option value="alerts-active">Активные алерты</option>
<option value="alerts-history">Исполненные алерты</option>
</select>
<button type="button" class="trade-book-close-all" title="Закрыть все позиции по рынку" aria-label="Закрыть все позиции по рынку" hidden>×</button>
</div>
<div class="trade-book-table-scroll" data-role="table-scroll">
<div class="trade-book-positions-table trade-book-positions-table--grid" data-role="positions-table">
<div class="trade-book-table-head" data-role="table-head"></div>
<div class="trade-book-rows" data-role="rows"></div>
</div>
</div>
<div class="trade-book-positions-total" data-role="positions-total" hidden>
<div class="trade-book-total-row trade-book-row--position">
<span class="col-ticker trade-book-total-leading">
<button type="button" class="trade-book-total-eye" data-role="positions-total-eye" aria-label="Скрыть суммарный PnL" aria-pressed="false" title="Скрыть суммарный PnL">
${EYE_OPEN_SVG}
${EYE_CLOSED_SVG}
</button>
</span>
<span class="col-pnl-wrap">
<span class="col-pnl" data-role="positions-total-pnl"></span>
</span>
<span class="col-volume trade-book-total-volume" aria-hidden="true"></span>
<span class="col-entry" aria-hidden="true"></span>
<span class="col-liq" aria-hidden="true"></span>
</div>
</div>
<p class="trade-book-status" data-role="status" aria-live="polite"></p>
`;

list.appendChild(
splitResize
);
list.appendChild(
panel
);

applyPositionColumnLayout(
panel
);
applyOrderColumnLayout(
panel
);
applyAlertColumnLayout(
panel
);

wirePanelResize(
panel,
list,
splitResize,
coinsListPane
);

const api =
tradingApi();
const modeSelect =
panel.querySelector(
".trade-book-mode"
);
const closeAllBtn =
panel.querySelector(
".trade-book-close-all"
);
const tableHead =
panel.querySelector(
'[data-role="table-head"]'
);
const positionsTableEl =
panel.querySelector(
'[data-role="positions-table"]'
);
const rowsEl =
panel.querySelector(
'[data-role="rows"]'
);
const positionsTotalEl =
panel.querySelector(
'[data-role="positions-total"]'
);
const positionsTotalPnlEl =
panel.querySelector(
'[data-role="positions-total-pnl"]'
);
const positionsTotalEyeBtn =
panel.querySelector(
'[data-role="positions-total-eye"]'
);
const statusEl =
panel.querySelector(
'[data-role="status"]'
);

let mode =
"positions";
let loading =
false;
let closingAll =
false;
let closingPosition =
false;
let activeChartSymbol =
"";
let lastPositionRows =
[];
let lastOrderRows =
[];

const sortState =
readSortState();

const positionRowNodes =
new Map();
const orderRowNodes =
new Map();

let totalPnlHidden =
readTotalPnlHidden();
let lastTotalPnl =
null;

function requestOpenSymbol(
symbol
){

if(
!symbol
){
return;
}

window.dispatchEvent(
new CustomEvent(
"trade-book-open-symbol",
{
detail:{
symbol
}
}
)
);

}

function showCloseAllConfirm(){

return new Promise(
resolve=>{

const overlay =
document.createElement(
"div"
);
overlay.className =
"trade-book-confirm-overlay";
overlay.innerHTML =
`
<div class="trade-book-confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="trade-book-close-all-title">
<p id="trade-book-close-all-title" class="trade-book-confirm-message">Вы действительно хотите закрыть все открытые позиции по рыночной цене?</p>
<div class="trade-book-confirm-actions">
<button type="button" class="trade-book-confirm-cancel" data-action="cancel">Отмена</button>
<button type="button" class="trade-book-confirm-yes" data-action="yes">Да</button>
</div>
</div>`;

document.body.appendChild(
overlay
);

const finish =
confirmed=>{

overlay.remove();
document.removeEventListener(
"keydown",
onKey
);
resolve(
confirmed
);

};

const onKey =
event=>{

if(
event.key ===
"Escape"
){
finish(
false
);
}

};

document.addEventListener(
"keydown",
onKey
);

overlay.addEventListener(
"click",
event=>{

const action =
event.target.closest(
"[data-action]"
)?.dataset.action;

if(
action ===
"yes"
){
finish(
true
);
return;
}

if(
action ===
"cancel" ||
event.target ===
overlay
){
finish(
false
);
}

}
);

const cancelBtn =
overlay.querySelector(
".trade-book-confirm-cancel"
);
cancelBtn?.focus();

}
);

}

function updateCloseAllBtnState(){

if(
!closeAllBtn
){
return;
}

const show =
mode ===
"positions" &&
!!api?.closePosition;

closeAllBtn.hidden =
!show;

if(
!show
){
return;
}

const hasPositions =
lastPositionRows.some(
row=>
String(
row?.symbol ||
""
).trim()
);

closeAllBtn.disabled =
loading ||
closingAll ||
closingPosition ||
!hasPositions;

}

function bookPositionRowKey(
row
){

const policy =
getTradeConfig();

if(
typeof policy.positionMapKey ===
"function"
){
return policy.positionMapKey(
row
);
}

return normalizeBookSymbol(
row?.symbol
);

}

function tradeCloseOptionsFromRow(
row
){

return {
positionSide:
row?.positionSide,
side:
row?.side,
position:
row
};

}

function requestClosePosition(
rowOrSymbol,
ticker
){

const row =
rowOrSymbol &&
typeof rowOrSymbol ===
"object"
? rowOrSymbol
: {
symbol:
rowOrSymbol,
ticker
};
const symbol =
String(
row?.symbol ||
""
).trim();

if(
!symbol
){
return;
}

const label =
ticker ||
row.ticker ||
symbol;

if(
!confirm(
`Закрыть ${label} по рынку?`
)
){
return;
}

void closePosition(
symbol,
tradeCloseOptionsFromRow(
row
)
);

}

async function requestCloseAllPositions(){

if(
!api?.closePosition ||
mode !==
"positions"
){
return;
}

const symbols =
lastPositionRows;

if(
!symbols.length
){
setStatus(
"Нет открытых позиций",
true
);
return;
}

const confirmed =
await showCloseAllConfirm();

if(
!confirmed
){
return;
}

void closeAllPositions(
symbols
);

}

function wirePositionRowOpen(
el,
symbol
){

const tickerEl =
el.querySelector(
".col-ticker"
);

if(
!tickerEl ||
tickerEl.dataset.openBound ===
"1"
){
return;
}

tickerEl.dataset.openBound =
"1";

tickerEl.addEventListener(
"pointerup",
event=>{

if(
event.button !==
0
){
return;
}

if(
mode !==
"positions"
){
return;
}

requestOpenSymbol(
symbol
);

}
);

}

function wireOrderRowOpen(
el,
symbol
){

el.addEventListener(
"pointerup",
event=>{

if(
event.button !==
0
){
return;
}

if(
mode !==
"orders"
){
return;
}

requestOpenSymbol(
symbol
);

}
);

}

function reorderBookRows(
container,
elements
){

const desired =
elements.filter(
Boolean
);

if(
!desired.length
){
return;
}

const current =
[
...container.children
].filter(
node=>
node.classList?.contains(
"trade-book-row"
)
);

if(
current.length !==
desired.length
){
for(
const el of desired
){
container.appendChild(
el
);
}
return;
}

for(
let i =
0;
i <
desired.length;
i++
){

if(
current[i] !==
desired[i]
){
for(
const el of desired
){
container.appendChild(
el
);
}
return;
}

}

}

function formatPositionPrice(
value
){

const num =
Number(
value
);

if(
!Number.isFinite(
num
) ||
num ===
0
){
return "—";
}

return num.toLocaleString(
"ru-RU",
{
maximumFractionDigits:
8
}
);

}

function wireShareButton(
el,
row
){

const btn =
el.querySelector(
".trade-book-share"
);

if(
!btn ||
btn.dataset.shareBound ===
"1"
){
return;
}

btn.dataset.shareBound =
"1";

btn.addEventListener(
"mousedown",
event=>{
event.stopPropagation();
}
);

btn.addEventListener(
"click",
event=>{
event.stopPropagation();
void openPnlShareModal(
row
);
}
);

}

function createPositionRow(
row
){

const el =
document.createElement(
"div"
);
const active =
normalizeBookSymbol(
row.symbol
) ===
normalizeBookSymbol(
activeChartSymbol
);

const rowKey =
bookPositionRowKey(
row
);

el.className =
`trade-book-row trade-book-row--position${active ? " is-active" : ""}`;
el.dataset.symbol =
row.symbol;
el.dataset.rowKey =
rowKey;
if(
row.positionSide
){
el.dataset.positionSide =
row.positionSide;
}

el.innerHTML =
`
<span class="col-ticker" title="${row.ticker}">
<span class="trade-book-side ${positionSideClass(row.side)}" aria-hidden="true"></span>
<span class="trade-book-ticker-text">${row.ticker}</span>
</span>
<span class="col-pnl-wrap">
<span class="col-pnl ${totalPnlHidden ? "is-masked" : pnlClass(row.pnl)}">${maskTradeValue(totalPnlHidden, formatTradePnl(row.pnl))}</span>
${SHARE_BUTTON_HTML}
<button type="button" class="trade-book-close" title="Закрыть по рынку" aria-label="Закрыть ${row.ticker}">×</button>
</span>
<span class="col-volume">${maskTradeValue(totalPnlHidden, formatTradeUsdt(row.volumeUsdt))}</span>
<span class="col-entry">${formatPositionPrice(row.avgPrice)}</span>
<span class="col-liq">${formatPositionPrice(row.liqPrice)}</span>
`;

el.querySelector(
".trade-book-close"
)?.addEventListener(
"mousedown",
event=>{
event.stopPropagation();
}
);

el.querySelector(
".trade-book-close"
)?.addEventListener(
"click",
event=>{
event.stopPropagation();
requestClosePosition(
row,
row.ticker ||
row.symbol
);
}
);

wirePositionRowOpen(
el,
row.symbol
);

wireShareButton(
el,
row
);

return el;

}

function createOrderRow(
row
){

const el =
document.createElement(
"div"
);
const active =
normalizeBookSymbol(
row.symbol
) ===
normalizeBookSymbol(
activeChartSymbol
);

el.className =
`trade-book-row trade-book-row--order${active ? " is-active" : ""}`;
el.dataset.symbol =
row.symbol;
el.dataset.orderId =
row.orderId;

el.innerHTML =
`
<span class="col-ticker" title="${row.ticker}">
<span class="trade-book-ticker-text">${row.ticker}</span>
</span>
<span class="col-order-type">${orderPanelTypeLabel(row)}</span>
<span class="col-price">${formatPrice(row.price)}</span>
<span class="col-time">${formatDateTime(row.createdAt)}</span>
`;

wireOrderRowOpen(
el,
row.symbol
);

return el;

}

function updateOrderRow(
el,
row
){

const active =
normalizeBookSymbol(
row.symbol
) ===
normalizeBookSymbol(
activeChartSymbol
);

el.classList.toggle(
"is-active",
active
);

const typeEl =
el.querySelector(
".col-order-type"
);

if(
typeEl
){
const nextType =
orderPanelTypeLabel(
row
);

if(
typeEl.textContent !==
nextType
){
typeEl.textContent =
nextType;
}

}

const priceEl =
el.querySelector(
".col-price"
);

if(
priceEl
){
const nextPrice =
formatPrice(
row.price
);

if(
priceEl.textContent !==
nextPrice
){
priceEl.textContent =
nextPrice;
}

}

const timeEl =
el.querySelector(
".col-time"
);

if(
timeEl
){
const nextTime =
formatDateTime(
row.createdAt
);

if(
timeEl.textContent !==
nextTime
){
timeEl.textContent =
nextTime;
}

}

}

function updatePositionRow(
el,
row
){

const active =
normalizeBookSymbol(
row.symbol
) ===
normalizeBookSymbol(
activeChartSymbol
);

el.classList.toggle(
"is-active",
active
);

const sideEl =
el.querySelector(
".trade-book-side"
);

if(
sideEl
){
const nextSideClass =
`trade-book-side ${positionSideClass(row.side)}`.trim();

if(
sideEl.className !==
nextSideClass
){
sideEl.className =
nextSideClass;
}

}

const pnlEl =
el.querySelector(
".col-pnl-wrap .col-pnl"
);

if(
pnlEl
){
const nextPnlRaw =
formatTradePnl(
row.pnl
);
const nextPnl =
maskTradeValue(
totalPnlHidden,
nextPnlRaw
);
const nextClass = totalPnlHidden
? "col-pnl is-masked"
: `col-pnl ${pnlClass(row.pnl)}`.trim();

if(
pnlEl.textContent !==
nextPnl
){
pnlEl.textContent =
nextPnl;
}

if(
pnlEl.className !==
nextClass
){
pnlEl.className =
nextClass;
}

}

const volEl =
el.querySelector(
".col-volume"
);

if(
volEl
){
const nextVolRaw =
formatTradeUsdt(
row.volumeUsdt
);
const nextVol =
maskTradeValue(
totalPnlHidden,
nextVolRaw
);

if(
volEl.textContent !==
nextVol
){
volEl.textContent =
nextVol;
}

}

const entryEl =
el.querySelector(
".col-entry"
);

if(
entryEl
){
const nextEntry =
formatPositionPrice(
row.avgPrice
);

if(
entryEl.textContent !==
nextEntry
){
entryEl.textContent =
nextEntry;
}

}

const liqEl =
el.querySelector(
".col-liq"
);

if(
liqEl
){
const nextLiq =
formatPositionPrice(
row.liqPrice
);

if(
liqEl.textContent !==
nextLiq
){
liqEl.textContent =
nextLiq;
}

}

}

function sortableHeadClass(
key
){

const state =
sortState[
mode
];
const active =
state.key ===
key;

return [
"sortable",
active
? "is-sorted"
: "",
active &&
state.asc
? "is-asc"
: ""
].filter(
Boolean
).join(
" "
);

}

function isAlertsMode(){

return mode ===
"alerts-active" ||
mode ===
"alerts-history";

}

function wireAlertRowOpen(
el,
symbol
){

el.addEventListener(
"pointerup",
event=>{

if(
event.button !==
0
){
return;
}

if(
event.target.closest(
".trade-book-close"
)
){
return;
}

if(
!isAlertsMode()
){
return;
}

requestOpenSymbol(
symbol
);

}
);

}

function renderAlertsTable(
alerts,
options
){

const {
emptyMessage,
dateField,
onDelete
} =
options;

hidePositionsTotal();
purgePositionRows();
purgeOrderRows();
purgeAlertRows();

if(
!alerts.length
){
renderEmpty(
emptyMessage
);
return;
}

const emptyEl =
rowsEl.querySelector(
".trade-book-empty"
);

if(
emptyEl
){
emptyEl.remove();
}

rowsEl.innerHTML =
alerts.map(
alert=>{

const shapeId =
String(
alert.shapeId ||
""
);
const symbol =
String(
alert.symbol ||
""
);
const triggeredAt =
Number(
alert.triggeredAt
) ||
0;
const active =
normalizeBookSymbol(
symbol
) ===
normalizeBookSymbol(
activeChartSymbol
);

return `
<div class="trade-book-row trade-book-row--alert${active ? " is-active" : ""}" data-symbol="${symbol}" data-shape-id="${shapeId}" data-triggered-at="${triggeredAt}">
<span class="col-date">${formatAlertDate(alert[dateField])}</span>
<span class="col-ticker" title="${formatAlertTicker(symbol)}">
<span class="trade-book-ticker-text">${formatAlertTicker(symbol)}</span>
</span>
<span class="col-action">
<button type="button" class="trade-book-close" title="Удалить алерт" aria-label="Удалить алерт">×</button>
</span>
</div>
`;

}
).join(
""
);

rowsEl.querySelectorAll(
".trade-book-row--alert"
).forEach(
row=>{

const symbol =
row.dataset.symbol;
const shapeId =
row.dataset.shapeId;
const triggeredAt =
Number(
row.dataset.triggeredAt
) ||
0;

wireAlertRowOpen(
row,
symbol
);

const deleteBtn =
row.querySelector(
".trade-book-close"
);

deleteBtn?.addEventListener(
"click",
event=>{

event.stopPropagation();
onDelete(
symbol,
shapeId,
triggeredAt
);

}
);

}
);

updateCloseAllBtnState();

}

function renderAlertsActive(){

renderAlertsTable(
getAlertsSorted(),
{
emptyMessage:
"Нет активных алертов",
dateField:
"createdAt",
onDelete(
symbol,
shapeId
){
removeAlert(
symbol,
shapeId
);
renderAlertsActive();
}
}
);

}

function renderAlertsHistory(){

renderAlertsTable(
getAlertsHistorySorted(),
{
emptyMessage:
"Нет исполненных алертов",
dateField:
"triggeredAt",
onDelete(
symbol,
shapeId,
triggeredAt
){
removeAlertHistoryEntry(
symbol,
shapeId,
triggeredAt
);
renderAlertsHistory();
}
}
);

}

function renderTableHead(){

tableHead.classList.remove(
"trade-book-table-head--positions",
"trade-book-table-head--orders",
"trade-book-table-head--alerts"
);

if(
isAlertsMode()
){
panel.classList.add(
"trade-book-panel--alerts"
);
positionsTableEl?.classList.remove(
"trade-book-positions-table--grid",
"trade-book-orders-table--grid"
);
positionsTableEl?.classList.add(
"trade-book-alerts-table--grid"
);
tableHead.classList.add(
"trade-book-table-head--alerts"
);
tableHead.innerHTML =
`
<span class="col-date">Дата${columnResizeHandle("date")}</span>
<span class="col-ticker">Тикер${columnResizeHandle("ticker")}</span>
<span class="col-action" aria-hidden="true"></span>
`;

applyAlertColumnLayout(
panel
);
wireAlertColumnResize(
panel,
tableHead
);
return;
}

if(
mode ===
"orders"
){
panel.classList.remove(
"trade-book-panel--alerts"
);
positionsTableEl?.classList.remove(
"trade-book-positions-table--grid",
"trade-book-alerts-table--grid"
);
positionsTableEl?.classList.add(
"trade-book-orders-table--grid"
);
tableHead.classList.add(
"trade-book-table-head--orders"
);
tableHead.innerHTML =
`
<span class="col-ticker ${sortableHeadClass("ticker")}" data-sort="ticker">Тикер${columnResizeHandle("ticker")}</span>
<span class="col-order-type ${sortableHeadClass("type")}" data-sort="type">Тип${columnResizeHandle("type")}</span>
<span class="col-price ${sortableHeadClass("price")}" data-sort="price">Цена${columnResizeHandle("price")}</span>
<span class="col-time ${sortableHeadClass("time")}" data-sort="time">Время</span>
`;

applyOrderColumnLayout(
panel
);
wireOrderColumnResize(
panel,
tableHead
);
return;
}

tableHead.classList.add(
"trade-book-table-head--positions"
);
panel.classList.remove(
"trade-book-panel--alerts"
);
positionsTableEl?.classList.remove(
"trade-book-orders-table--grid",
"trade-book-alerts-table--grid"
);
positionsTableEl?.classList.add(
"trade-book-positions-table--grid"
);
tableHead.innerHTML =
`
<span class="col-ticker ${sortableHeadClass("ticker")}" data-sort="ticker">Тикер${columnResizeHandle("ticker")}</span>
<span class="col-pnl-head ${sortableHeadClass("pnl")}" data-sort="pnl">PnL${columnResizeHandle("pnl")}</span>
<span class="col-volume ${sortableHeadClass("volume")}" data-sort="volume">Объём${columnResizeHandle("volume")}</span>
<span class="col-entry">Цена входа${columnResizeHandle("entry")}</span>
<span class="col-liq">Ликвидация</span>
`;

applyPositionColumnLayout(
panel
);
wirePositionColumnResize(
panel,
tableHead
);

}

function setStatus(
text,
isError =
false
){

if(
!statusEl
){
return;
}

statusEl.textContent =
text ||
"";
statusEl.classList.toggle(
"is-error",
!!isError
);

}

function renderEmpty(
message
){

positionRowNodes.clear();
orderRowNodes.clear();
hidePositionsTotal();
rowsEl.innerHTML =
`<p class="trade-book-empty">${message}</p>`;
updateCloseAllBtnState();

}

function sumPositionsPnl(
rows
){

let total =
0;
let has =
false;

for(
const row of rows ||
[]
){

const num =
Number(
row?.pnl
);

if(
!Number.isFinite(
num
)
){
continue;
}

total +=
num;
has =
true;

}

return has
? total
: null;

}

function hidePositionsTotal(){

if(
positionsTotalEl
){
positionsTotalEl.hidden =
true;
}

lastTotalPnl =
null;

}

function applyTotalPnlVisibility(){

if(
!positionsTotalPnlEl ||
lastTotalPnl ==
null
){
return;
}

if(
totalPnlHidden
){
positionsTotalPnlEl.textContent =
"***";
positionsTotalPnlEl.className =
"col-pnl is-masked";
}else{
positionsTotalPnlEl.textContent =
formatTradePnl(
lastTotalPnl
);
positionsTotalPnlEl.className =
`col-pnl ${pnlClass(lastTotalPnl)}`.trim();
}

if(
positionsTotalEyeBtn
){
positionsTotalEyeBtn.setAttribute(
"aria-pressed",
totalPnlHidden
? "true"
: "false"
);
positionsTotalEyeBtn.title =
totalPnlHidden
? "Показать суммарный PnL"
: "Скрыть суммарный PnL";
positionsTotalEyeBtn.setAttribute(
"aria-label",
positionsTotalEyeBtn.title
);
}

}

function refreshPositionRowsVisibility(){

for(
const [key, rowEl] of positionRowNodes
){
const row =
lastPositionRows.find(
item=>
normalizeBookSymbol(
item.symbol
) ===
key
);

if(
!row ||
!rowEl
){
continue;
}

updatePositionRow(
rowEl,
row
);
}

}

function updatePositionsTotal(
rows
){

if(
!positionsTotalEl ||
!positionsTotalPnlEl ||
mode !==
"positions"
){
hidePositionsTotal();
return;
}

const total =
sumPositionsPnl(
rows
);

if(
total ==
null
){
hidePositionsTotal();
return;
}

positionsTotalEl.hidden =
false;
lastTotalPnl =
total;
applyTotalPnlVisibility();

}

if(
positionsTotalEyeBtn
){

positionsTotalEyeBtn.addEventListener(
"mousedown",
event=>{
if(
event.button ===
0
){
event.preventDefault();
}
},
true
);

positionsTotalEyeBtn.addEventListener(
"keydown",
event=>{
if(
event.code === "Space" ||
event.code === "Enter"
){
event.preventDefault();
}
},
true
);

positionsTotalEyeBtn.addEventListener(
"click",
event=>{
event.stopPropagation();
totalPnlHidden =
!totalPnlHidden;
writeTotalPnlHidden(
totalPnlHidden
);
applyTotalPnlVisibility();
refreshPositionRowsVisibility();
queueMicrotask(
()=>{
positionsTotalEyeBtn.blur();
}
);
}
);

window.addEventListener(
"trade-total-pnl-visibility-changed",
()=>{
totalPnlHidden =
readTotalPnlHidden();
applyTotalPnlVisibility();
refreshPositionRowsVisibility();
}
);

}

function renderPositions(
rows
){

lastPositionRows =
Array.isArray(
rows
)
? rows
: [];

const sorted =
sortPositionRows(
lastPositionRows,
sortState.positions.key,
sortState.positions.asc
);

purgeOrderRows();
purgeAlertRows();

if(
!sorted.length
){
renderEmpty(
"Нет открытых позиций"
);
return;
}

updatePositionsTotal(
lastPositionRows
);

const emptyEl =
rowsEl.querySelector(
".trade-book-empty"
);

if(
emptyEl
){
emptyEl.remove();
}

const nextKeys =
new Set();

for(
const row of sorted
){

const rowKey =
bookPositionRowKey(
row
);

if(
!rowKey
){
continue;
}

nextKeys.add(
rowKey
);

let el =
positionRowNodes.get(
rowKey
);

if(
!el
){
el =
createPositionRow(
row
);
positionRowNodes.set(
rowKey,
el
);
rowsEl.appendChild(
el
);
}else{
updatePositionRow(
el,
row
);
}

}

for(
const [
rowKey,
el
] of positionRowNodes
){

if(
!nextKeys.has(
rowKey
)
){
el.remove();
positionRowNodes.delete(
rowKey
);
}

}

reorderBookRows(
rowsEl,
sorted.map(
row=>
positionRowNodes.get(
bookPositionRowKey(
row
)
)
)
);

updateCloseAllBtnState();

}

function purgeOrderRows(){

for(
const el of orderRowNodes.values()
){
el.remove();
}

orderRowNodes.clear();

}

function purgeAlertRows(){

if(
!rowsEl
){
return;
}

rowsEl.querySelectorAll(
".trade-book-row--alert"
).forEach(
el=>{
el.remove();
}
);

}

function purgePositionRows(){

for(
const el of positionRowNodes.values()
){
el.remove();
}

positionRowNodes.clear();

}

function renderOrders(
rows
){

hidePositionsTotal();

lastOrderRows =
Array.isArray(
rows
)
? rows
: [];

const sorted =
sortOrderRows(
lastOrderRows,
sortState.orders.key,
sortState.orders.asc
);

purgePositionRows();
purgeAlertRows();

if(
!sorted.length
){
renderEmpty(
"Нет отложенных ордеров"
);
return;
}

const emptyEl =
rowsEl.querySelector(
".trade-book-empty"
);

if(
emptyEl
){
emptyEl.remove();
}

const nextKeys =
new Set();

for(
const row of sorted
){

const orderId =
String(
row.orderId ||
""
).trim();

if(
!orderId
){
continue;
}

nextKeys.add(
orderId
);

let el =
orderRowNodes.get(
orderId
);

if(
!el
){
el =
createOrderRow(
row
);
orderRowNodes.set(
orderId,
el
);
rowsEl.appendChild(
el
);
}else{
updateOrderRow(
el,
row
);
}

}

for(
const [
orderId,
el
] of orderRowNodes
){

if(
!nextKeys.has(
orderId
)
){
el.remove();
orderRowNodes.delete(
orderId
);
}

}

reorderBookRows(
rowsEl,
sorted.map(
row=>
orderRowNodes.get(
String(
row.orderId ||
""
).trim()
)
)
);

}

async function closePosition(
symbol,
options =
{}
){

if(
!api?.closePosition
){
return;
}

setStatus(
"Закрываем…"
);
closingPosition =
true;
updateCloseAllBtnState();

try{
const result =
await api.closePosition(
symbol,
options
);

if(
result?.ok ===
false
){
setStatus(
result.message ||
"Не удалось закрыть",
true
);
return;
}

removeTradePositionFromCache(
symbol,
options
);

setStatus(
"Позиция закрыта"
);
await refresh(
true
);
window.dispatchEvent(
new CustomEvent(
"trade-book-refresh"
)
);
}catch(
err
){
setStatus(
err?.message ||
"Ошибка закрытия",
true
);
}finally{
closingPosition =
false;
updateCloseAllBtnState();
}

}

async function closeAllPositions(
rows
){

if(
!api?.closePosition
){
return;
}

const list =
Array.isArray(
rows
)
? rows
: [];

closingAll =
true;
updateCloseAllBtnState();
setStatus(
"Закрываем…"
);

let failed =
0;
const errors =
[];

for(
const row of list
){

const symbol =
typeof row ===
"string"
? row
: String(
row?.symbol ||
""
).trim();
const options =
typeof row ===
"object" &&
row
? tradeCloseOptionsFromRow(
row
)
: {};

if(
!symbol
){
continue;
}

try{
const result =
await api.closePosition(
symbol,
options
);

if(
result?.ok ===
false
){
failed++;
if(
result.message
){
errors.push(
result.message
);
}
}else{
removeTradePositionFromCache(
symbol,
options
);
}
}catch(
err
){
failed++;
if(
err?.message
){
errors.push(
err.message
);
}

}

}

if(
failed >
0
){
const msg =
failed ===
list.length
? (
errors[
0
] ||
"Не удалось закрыть позиции"
)
: `Закрыто ${list.length - failed} из ${list.length}`;
setStatus(
msg,
true
);
}else{
setStatus(
"Все позиции закрыты"
);
}

try{
await refresh(
true
);
window.dispatchEvent(
new CustomEvent(
"trade-book-refresh"
)
);
}catch{
/* refresh status already set */
}finally{
closingAll =
false;
updateCloseAllBtnState();
}

}

async function refresh(
silent =
false
){

if(
isAlertsMode()
){
renderTableHead();

if(
mode ===
"alerts-active"
){
renderAlertsActive();
}else{
renderAlertsHistory();
}

setStatus(
""
);
updateCloseAllBtnState();
return;
}

if(
!api
){
renderTableHead();
renderEmpty(
"Только в desktop .app"
);
return;
}

const status =
await api.getStatus?.();

if(
!status?.configured
){
renderTableHead();
renderEmpty(
getTradeConfig().emptyCredentialsHint
);
setStatus(
""
);
return;
}

if(
loading
){
return;
}

loading =
true;

if(
!silent
){
updateCloseAllBtnState();
}

try{
if(
mode ===
"orders"
){
const result =
await api.getOpenOrders();

if(
!result?.ok
){

if(
!lastOrderRows.length
){
renderOrders(
[]
);
}

setStatus(
result.message ||
"Ошибка загрузки ордеров",
true
);
return;
}

renderOrders(
result.orders ||
[]
);
setStatus(
""
);
return;
}

const result =
await api.getPositions();

if(
!result?.ok
){

const cachedPositions =
getAllCachedPositions();

if(
cachedPositions.length
){
renderPositions(
cachedPositions
);

if(
result?.rateLimited
){
setStatus(
""
);
return;
}
}else if(
!lastPositionRows.length
){
renderPositions(
[]
);
}

setStatus(
result.message ||
"Ошибка загрузки позиций",
true
);
return;
}

let positions =
result.positions ||
[];

if(
getTradeConfig().filterRecentlyClosedInBookRefresh
){
const policy =
getTradeConfig();
positions =
positions.filter(
row=>{
const key =
typeof policy.positionMapKey ===
"function"
? policy.positionMapKey(
row
)
: row?.symbol;

return !isTradePositionRecentlyClosed(
key,
row
);
}
);
}

renderPositions(
positions
);
setStatus(
""
);
}catch(
err
){
setStatus(
err?.message ||
"Ошибка",
true
);
}finally{
loading =
false;
updateCloseAllBtnState();
}

}

function setMode(
next
){

const allowed =
new Set(
[
"positions",
"orders",
"alerts-active",
"alerts-history"
]
);

mode =
allowed.has(
next
)
? next
: "positions";

if(
mode ===
"positions"
){
purgeOrderRows();
purgeAlertRows();
}else if(
mode ===
"orders"
){
purgePositionRows();
purgeAlertRows();
hidePositionsTotal();
}else{
purgePositionRows();
purgeOrderRows();
hidePositionsTotal();
}

renderTableHead();
updateCloseAllBtnState();
void refresh(
true
);

}

modeSelect.addEventListener(
"change",
()=>{
setMode(
modeSelect.value
);
modeSelect.blur();
}
);

closeAllBtn.addEventListener(
"click",
()=>{
void requestCloseAllPositions();
}
);

tableHead.addEventListener(
"click",
event=>{

if(
event.target.closest(
".trade-book-col-resize"
)
){
return;
}

const el =
event.target.closest(
".sortable"
);

if(
!el
){
return;
}

const key =
el.dataset.sort;

if(
!key
){
return;
}

const state =
sortState[
mode
];

if(
!state
){
return;
}

if(
state.key ===
key
){
state.asc =
!state.asc;
}else{
state.key =
key;
state.asc =
defaultSortAsc(
mode,
key
);
}

writeSortState(
sortState
);
renderTableHead();

if(
mode ===
"positions"
){
renderPositions(
lastPositionRows
);
return;
}

if(
mode ===
"orders"
){
renderOrders(
lastOrderRows
);
}

}
);

window.addEventListener(
"alerts-changed",
()=>{

if(
mode ===
"alerts-active"
){
renderAlertsActive();
}

}
);

window.addEventListener(
"alerts-history-changed",
()=>{

if(
mode ===
"alerts-history"
){
renderAlertsHistory();
}

}
);

renderTableHead();

void (
async()=>{

if(
mode ===
"orders"
){
void refresh(
false
);
return;
}

let positions =
getAllCachedPositions();

if(
!positions.length
){
await syncTradePositionsCache();
positions =
getAllCachedPositions();
}

if(
positions.length
){
renderPositions(
positions
);
setStatus(
""
);
}else{
void refresh(
false
);
}

}
)();

window.addEventListener(
"trade-stream-positions",
event=>{

const positions =
event.detail?.positions ||
[];

lastPositionRows =
positions;

if(
mode !==
"positions"
){
return;
}

renderPositions(
positions
);
setStatus(
""
);

}
);

window.addEventListener(
"trade-open-positions-changed",
()=>{

if(
mode !==
"positions"
){
return;
}

const positions =
getAllCachedPositions();

lastPositionRows =
positions;
renderPositions(
positions
);
setStatus(
""
);

}
);

window.addEventListener(
"trade-position-updated",
event=>{

if(
mode !==
"positions"
){
return;
}

const pos =
event.detail?.position;
const sym =
normalizeBookSymbol(
event.detail?.symbol ||
pos?.symbol
);
const detailSide =
event.detail?.positionSide ||
event.detail?.side ||
pos?.positionSide ||
pos?.side;
const eventKey =
bookPositionRowKey({
symbol:
sym,
positionSide:
detailSide,
side:
detailSide
});

if(
!sym
){
return;
}

if(
!pos
){
lastPositionRows =
lastPositionRows.filter(
row=>{
if(
normalizeBookSymbol(
row.symbol
) !==
sym
){
return true;
}

if(
!detailSide
){
return false;
}

return bookPositionRowKey(
row
) !==
eventKey;
}
);
renderPositions(
lastPositionRows
);
return;
}

const posKey =
bookPositionRowKey(
pos
);
let index =
lastPositionRows.findIndex(
row=>
bookPositionRowKey(
row
) ===
posKey
);

if(
index <
0
){
index =
lastPositionRows.findIndex(
row=>
normalizeBookSymbol(
row.symbol
) ===
sym
);
}

if(
index <
0
){
return;
}

lastPositionRows[
index
] =
pos;

const el =
positionRowNodes.get(
posKey
) ||
positionRowNodes.get(
sym
);

if(
el
){
updatePositionRow(
el,
pos
);
updatePositionsTotal(
lastPositionRows
);
reorderBookRows(
rowsEl,
sortPositionRows(
lastPositionRows,
sortState.positions.key,
sortState.positions.asc
).map(
row=>
positionRowNodes.get(
bookPositionRowKey(
row
)
)
)
);
}

}
);

window.addEventListener(
"trade-stream-orders",
event=>{

const orders =
event.detail?.orders ||
[];

lastOrderRows =
orders;

if(
mode !==
"orders"
){
return;
}

renderOrders(
orders
);
setStatus(
""
);

}
);

window.addEventListener(
"trade-book-refresh",
()=>{
void refresh(
true
);
}
);

window.addEventListener(
"trade-orders-refresh",
event=>{

if(
mode !==
"orders"
){
return;
}

if(
Array.isArray(
event.detail?.orders
)
){
renderOrders(
event.detail.orders
);
setStatus(
""
);
return;
}

void refresh(
true
);

}
);

document.addEventListener(
"visibilitychange",
()=>{

if(
document.hidden
){
return;
}

void refresh(
true
);

}
);

window.addEventListener(
"coins-chart-symbol-changed",
e=>{

const sym =
e.detail?.symbol;

if(
!sym
){
return;
}

activeChartSymbol =
sym;

const nextActive =
normalizeBookSymbol(
sym
);

rowsEl.querySelectorAll(
".trade-book-row--position, .trade-book-row--order, .trade-book-row--alert"
).forEach(
row=>{
const rowSym =
normalizeBookSymbol(
row.dataset.symbol
);
row.classList.toggle(
"is-active",
rowSym ===
nextActive
);
}
);

}
);

return {
refresh
};

}
