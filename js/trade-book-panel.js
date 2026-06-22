/**
 * /trade — панель позиций и ордеров (низ списка монет).
 */
import {
formatTradePnl,
formatTradeUsdt
} from "./trade-format.js?v=1";

import {
getAllCachedPositions,
syncTradePositionsCache
} from "./trade-positions-cache.js?v=5";

const PANEL_HEIGHT_KEY =
"trade_book_panel_height_v1";

const PANEL_DEFAULT_H =
168;

const PANEL_MIN_H =
120;

const PANEL_MIN_COINS_BODY =
72;

const SORT_STORAGE_KEY =
"trade_book_sort_v1";

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

function measurePanelMaxHeight(
listEl
){

const filter =
document.getElementById(
"filter-wrap"
);
const header =
document.getElementById(
"table-header"
);
const reserved =
(
filter?.offsetHeight ||
0
) +
(
header?.offsetHeight ||
0
) +
PANEL_MIN_COINS_BODY;

return Math.max(
PANEL_MIN_H,
listEl.clientHeight -
reserved
);

}

function applyPanelHeight(
panel,
listEl,
height
){

const maxH =
measurePanelMaxHeight(
listEl
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

function wirePanelResize(
panel,
listEl
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
document.createElement(
"div"
);

handle.className =
"trade-book-resize";
handle.setAttribute(
"role",
"separator"
);
handle.setAttribute(
"aria-orientation",
"horizontal"
);
handle.setAttribute(
"aria-label",
"Высота панели позиций"
);
handle.tabIndex =
0;

panel.prepend(
handle
);

function syncHeight(
persist =
false
){

panelHeight =
applyPanelHeight(
panel,
listEl,
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
<select class="trade-book-mode" aria-label="Позиции или ордера">
<option value="positions">Позиции</option>
<option value="orders">Ордера</option>
</select>
<button type="button" class="trade-book-refresh" title="Обновить">↻</button>
</div>
<div class="trade-book-table-head" data-role="table-head"></div>
<div class="trade-book-rows" data-role="rows"></div>
<p class="trade-book-status" data-role="status" aria-live="polite"></p>
`;

list.appendChild(
panel
);

wirePanelResize(
panel,
list
);

const api =
tradingApi();
const modeSelect =
panel.querySelector(
".trade-book-mode"
);
const refreshBtn =
panel.querySelector(
".trade-book-refresh"
);
const tableHead =
panel.querySelector(
'[data-role="table-head"]'
);
const rowsEl =
panel.querySelector(
'[data-role="rows"]'
);
const statusEl =
panel.querySelector(
'[data-role="status"]'
);

let mode =
"positions";
let loading =
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

function requestClosePosition(
symbol,
ticker
){

if(
!symbol
){
return;
}

if(
!confirm(
`Закрыть ${ticker} по рынку?`
)
){
return;
}

void closePosition(
symbol
);

}

function wirePositionRowOpen(
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

el.className =
`trade-book-row trade-book-row--position${active ? " is-active" : ""}`;
el.dataset.symbol =
row.symbol;

el.innerHTML =
`
<div class="trade-book-ticker" title="${row.ticker}">
<span class="trade-book-fut" title="Futures">F</span>
<span class="trade-book-ticker-text">${row.ticker}</span>
</div>
<span class="col-pnl ${pnlClass(row.pnl)}">${formatTradePnl(row.pnl)}</span>
<span class="col-volume">${formatTradeUsdt(row.volumeUsdt)}</span>
<button type="button" class="trade-book-close" title="Закрыть по рынку" aria-label="Закрыть ${row.ticker}">×</button>
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
row.symbol,
row.ticker ||
row.symbol
);
}
);

wirePositionRowOpen(
el,
row.symbol
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
<div class="trade-book-ticker" title="${row.ticker}">
<span class="trade-book-fut" title="Futures">F</span>
<span class="trade-book-ticker-text">${row.ticker}</span>
</div>
<span class="col-price">${row.label || "—"} · ${formatPrice(row.price)}</span>
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

const priceEl =
el.querySelector(
".col-price"
);

if(
priceEl
){
const nextPrice =
`${row.label || "—"} · ${formatPrice(row.price)}`;

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

const pnlEl =
el.querySelector(
".col-pnl"
);

if(
pnlEl
){
const nextPnl =
formatTradePnl(
row.pnl
);
const nextClass =
`col-pnl ${pnlClass(row.pnl)}`.trim();

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
const nextVol =
formatTradeUsdt(
row.volumeUsdt
);

if(
volEl.textContent !==
nextVol
){
volEl.textContent =
nextVol;
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

function renderTableHead(){

tableHead.classList.remove(
"trade-book-table-head--positions",
"trade-book-table-head--orders"
);

if(
mode ===
"orders"
){
tableHead.classList.add(
"trade-book-table-head--orders"
);
tableHead.innerHTML =
`
<span class="col-ticker ${sortableHeadClass("ticker")}" data-sort="ticker">Тикер</span>
<span class="col-price ${sortableHeadClass("price")}" data-sort="price">Цена</span>
<span class="col-time ${sortableHeadClass("time")}" data-sort="time">Время</span>
`;
return;
}

tableHead.classList.add(
"trade-book-table-head--positions"
);
tableHead.innerHTML =
`
<span class="col-ticker ${sortableHeadClass("ticker")}" data-sort="ticker">Тикер</span>
<span class="col-pnl ${sortableHeadClass("pnl")}" data-sort="pnl">PnL</span>
<span class="col-volume ${sortableHeadClass("volume")}" data-sort="volume">Объём</span>
<span class="col-action" aria-hidden="true"></span>
`;

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
rowsEl.innerHTML =
`<p class="trade-book-empty">${message}</p>`;

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

if(
!sorted.length
){
renderEmpty(
"Нет открытых позиций"
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

const sym =
normalizeBookSymbol(
row.symbol
);

if(
!sym
){
continue;
}

nextKeys.add(
sym
);

let el =
positionRowNodes.get(
sym
);

if(
!el
){
el =
createPositionRow(
row
);
positionRowNodes.set(
sym,
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
sym,
el
] of positionRowNodes
){

if(
!nextKeys.has(
sym
)
){
el.remove();
positionRowNodes.delete(
sym
);
}

}

reorderBookRows(
rowsEl,
sorted.map(
row=>
positionRowNodes.get(
normalizeBookSymbol(
row.symbol
)
)
)
);

}

function purgeOrderRows(){

for(
const el of orderRowNodes.values()
){
el.remove();
}

orderRowNodes.clear();

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
symbol
){

if(
!api?.closePosition
){
return;
}

setStatus(
"Закрываем…"
);
refreshBtn.disabled =
true;

try{
const result =
await api.closePosition(
symbol
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
refreshBtn.disabled =
false;
}

}

async function refresh(
silent =
false
){

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
"Подключите Bybit в шапке"
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
refreshBtn.disabled =
true;
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
renderOrders(
[]
);
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
renderPositions(
[]
);
setStatus(
result.message ||
"Ошибка загрузки позиций",
true
);
return;
}

renderPositions(
result.positions ||
[]
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
refreshBtn.disabled =
false;
}

}

function setMode(
next
){

mode =
next ===
"orders"
? "orders"
: "positions";

if(
mode ===
"orders"
){
purgePositionRows();
}else{
purgeOrderRows();
}

renderTableHead();
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

refreshBtn.addEventListener(
"click",
()=>{
void refresh(
false
);
}
);

tableHead.addEventListener(
"click",
event=>{

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

renderOrders(
lastOrderRows
);

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
".trade-book-row--position, .trade-book-row--order"
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
