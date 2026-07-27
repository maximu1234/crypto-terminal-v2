/**
 * Algo book panel — positions / orders / bot alerts (isolated from Terminal).
 */
import {
formatTradePnl,
formatTradeUsdt
} from "./format.js?v=2";

import {
getAllCachedPositions,
syncTradePositionsCache,
removeTradePositionFromCache
} from "./positions-cache.js?v=3";

import {
loadAllAlerts,
removeAlert,
formatAlertDate,
formatAlertTicker
} from "../../alerts.js?v=105";

import {
isAlgoBotAlertRow,
rememberBotAlertShapeId,
retagKnownAlgoBotAlerts
} from "../bot-alert-bridge.js?v=6";

import {
fetchAlgoBotStatus,
subscribeAlgoBotStatus
} from "../bot-bridge.js?v=9";

const PANEL_HEIGHT_KEY =
"algo_trade_book_panel_height_v1";
const TOTAL_PNL_HIDDEN_KEY =
"algo_trade_total_pnl_hidden_v1";
const DEFAULT_PANEL_H =
160;
const MIN_PANEL_H =
96;
const MIN_COINS_H =
120;

const EYE_OPEN_SVG =
`<svg class="trade-book-eye-svg trade-book-eye-svg--open" viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path fill="currentColor" d="M12 5c-5 0-9.3 3.1-11 7 1.7 3.9 6 7 11 7s9.3-3.1 11-7c-1.7-3.9-6-7-11-7zm0 12a5 5 0 1 1 0-10 5 5 0 0 1 0 10zm0-2.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z"/></svg>`;
const EYE_CLOSED_SVG =
`<svg class="trade-book-eye-svg trade-book-eye-svg--closed" viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path fill="currentColor" d="M2.1 3.5 3.5 2.1l18.4 18.4-1.4 1.4-3.1-3.1A12.6 12.6 0 0 1 12 19c-5 0-9.3-3.1-11-7a13.6 13.6 0 0 1 4.7-5.3L2.1 3.5zM12 7a5 5 0 0 1 4.9 6.1l-1.6-1.6A2.5 2.5 0 0 0 12 9.5V7zm0 10a5 5 0 0 1-4.9-6.1l1.6 1.6A2.5 2.5 0 0 0 12 14.5V17z"/></svg>`;

function algoApi(){

return window.cryptoTerminalDesktop?.algoTrading ||
null;

}

function normalizeSymbol(
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

function displayTicker(
symbol
){

const sym =
normalizeSymbol(
symbol
);

return sym
? `${sym}.P`
: "—";

}

function getActiveChartSymbol(){

const label =
document.getElementById(
"current-symbol"
)?.textContent ||
"";

return normalizeSymbol(
label
);

}

function pnlToneClass(
pnl
){

const n =
Number(
pnl
);

if(
!Number.isFinite(
n
) ||
n ===
0
){
return "";
}

return n >
0
? "is-pos"
: "is-neg";

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

function readPanelHeight(){

const n =
Number(
localStorage.getItem(
PANEL_HEIGHT_KEY
)
);

return Number.isFinite(
n
) &&
n >=
MIN_PANEL_H
? n
: DEFAULT_PANEL_H;

}

function writePanelHeight(
h
){

try{
localStorage.setItem(
PANEL_HEIGHT_KEY,
String(
Math.round(
h
)
)
);
}catch{
/* ignore */
}

}

function readTotalPnlHidden(){

return localStorage.getItem(
TOTAL_PNL_HIDDEN_KEY
) ===
"1";

}

function writeTotalPnlHidden(
hidden
){

try{
localStorage.setItem(
TOTAL_PNL_HIDDEN_KEY,
hidden
? "1"
: "0"
);
}catch{
/* ignore */
}

}

function sideClass(
side
){

const s =
String(
side ||
""
).toLowerCase();

if(
s ===
"buy" ||
s ===
"long"
){
return "trade-book-side--long";
}

if(
s ===
"sell" ||
s ===
"short"
){
return "trade-book-side--short";
}

return "";

}

/**
 * @returns {{ destroy: () => void } | null}
 */
export function initAlgoTradeBookPanel(){

if(
!document.body.classList.contains(
"algo-trading-page"
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
"algo-trade-book-panel"
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
"algo-trade-book-panel";
panel.className =
"trade-book-panel";

panel.innerHTML =
`
<div class="trade-book-head">
<select class="trade-book-mode" aria-label="Позиции, ордера или алерты">
<option value="positions">Позиции</option>
<option value="orders">Ордера</option>
<option value="alerts">Алерты</option>
</select>
<button type="button" class="trade-book-close-all" title="Закрыть все позиции по рынку" aria-label="Закрыть все позиции по рынку" hidden>×</button>
</div>
<div class="trade-book-table-scroll" data-role="table-scroll">
<div class="trade-book-positions-table trade-book-positions-table--grid" data-role="positions-table">
<div class="trade-book-table-head trade-book-table-head--positions" data-role="table-head">
<span class="col-ticker">Тикер</span>
<span class="col-pnl-head">PnL</span>
<span class="col-volume">Объём</span>
<span class="col-entry">Вход</span>
<span class="col-liq">Liq</span>
</div>
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
<span class="col-volume" aria-hidden="true"></span>
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

/** @type {Map<string, HTMLElement>} */
const rowNodes =
new Map();
/** @type {Map<string, HTMLElement>} */
const orderRowNodes =
new Map();
let totalPnlHidden =
readTotalPnlHidden();
let closing =
false;
let disposed =
false;
/** @type {"positions"|"orders"|"alerts"} */
let mode =
"positions";
/** @type {object[]} */
let lastOrderRows =
[];
/** @type {object[]} */
let lastAlertRows =
[];

function setStatus(
text
){

if(
statusEl
){
statusEl.textContent =
text ||
"";
}

}

function openSymbol(
symbol
){

const sym =
normalizeSymbol(
symbol
);

if(
!sym
){
return;
}

window.dispatchEvent(
new CustomEvent(
"algo-book-open-symbol",
{
detail:{
symbol:
sym
}
}
)
);

}

function formatOrderPrice(
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

function formatOrderTime(
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

const d =
new Date(
ts
);

if(
Number.isNaN(
d.getTime()
)
){
return "—";
}

const dd =
String(
d.getDate()
).padStart(
2,
"0"
);
const mm =
String(
d.getMonth() +
1
).padStart(
2,
"0"
);
const hh =
String(
d.getHours()
).padStart(
2,
"0"
);
const mi =
String(
d.getMinutes()
).padStart(
2,
"0"
);

return `${dd}.${mm} ${hh}:${mi}`;

}

function orderTypeLabel(
row
){

return String(
row?.shortLabel ||
row?.label ||
""
).trim() ||
"—";

}

function hidePositionsTotal(){

if(
positionsTotalEl
){
positionsTotalEl.hidden =
true;
}

closeAllBtn.hidden =
true;

}

function clearAllRows(){

rowsEl.innerHTML =
"";
rowNodes.clear();
orderRowNodes.clear();

}

function applyModeChrome(){

tableHead.classList.remove(
"trade-book-table-head--positions",
"trade-book-table-head--orders",
"trade-book-table-head--alerts"
);
positionsTableEl?.classList.remove(
"trade-book-positions-table--grid",
"trade-book-orders-table--grid",
"trade-book-alerts-table--grid"
);
panel.classList.remove(
"trade-book-panel--alerts"
);

if(
modeSelect
){
modeSelect.value =
mode;
}

if(
mode ===
"orders"
){
positionsTableEl?.classList.add(
"trade-book-orders-table--grid"
);
tableHead.classList.add(
"trade-book-table-head--orders"
);
tableHead.innerHTML =
`
<span class="col-ticker">Тикер</span>
<span class="col-order-type">Тип</span>
<span class="col-price">Цена</span>
<span class="col-time">Время</span>
`;
hidePositionsTotal();
return;
}

if(
mode ===
"alerts"
){
panel.classList.add(
"trade-book-panel--alerts"
);
positionsTableEl?.classList.add(
"trade-book-alerts-table--grid"
);
tableHead.classList.add(
"trade-book-table-head--alerts"
);
tableHead.innerHTML =
`
<span class="col-date">Дата</span>
<span class="col-ticker">Тикер</span>
<span class="col-action" aria-hidden="true"></span>
`;
hidePositionsTotal();
return;
}

positionsTableEl?.classList.add(
"trade-book-positions-table--grid"
);
tableHead.classList.add(
"trade-book-table-head--positions"
);
tableHead.innerHTML =
`
<span class="col-ticker">Тикер</span>
<span class="col-pnl-head">PnL</span>
<span class="col-volume">Объём</span>
<span class="col-entry">Вход</span>
<span class="col-liq">Liq</span>
`;

}

function applyPanelHeight(
h
){

const maxH =
Math.max(
MIN_PANEL_H,
(
list.clientHeight ||
400
) -
MIN_COINS_H
);
const next =
Math.min(
maxH,
Math.max(
MIN_PANEL_H,
h
)
);

panel.style.height =
`${next}px`;
panel.style.flex =
`0 0 ${next}px`;
list.style.setProperty(
"--trade-book-panel-h",
`${next}px`
);
writePanelHeight(
next
);

}

applyPanelHeight(
readPanelHeight()
);

let dragStartY =
0;
let dragStartH =
0;

function onPointerMove(
event
){

applyPanelHeight(
dragStartH +
(
dragStartY -
event.clientY
)
);

}

function onPointerUp(){

window.removeEventListener(
"pointermove",
onPointerMove
);
window.removeEventListener(
"pointerup",
onPointerUp
);

}

splitResize.addEventListener(
"pointerdown",
event=>{
event.preventDefault();
dragStartY =
event.clientY;
dragStartH =
panel.getBoundingClientRect().height;
window.addEventListener(
"pointermove",
onPointerMove
);
window.addEventListener(
"pointerup",
onPointerUp
);
}
);

function updateEyeUi(){

positionsTotalEyeBtn?.classList.toggle(
"is-hidden",
totalPnlHidden
);
positionsTotalEyeBtn?.setAttribute(
"aria-pressed",
totalPnlHidden
? "true"
: "false"
);

if(
positionsTotalPnlEl
){
positionsTotalPnlEl.textContent =
totalPnlHidden
? "••••"
: (
positionsTotalPnlEl.dataset.raw ||
"—"
);
positionsTotalPnlEl.classList.toggle(
"is-masked",
totalPnlHidden
);
}

for(
const el of rowNodes.values()
){

const pnlEl =
el.querySelector(
".col-pnl-wrap .col-pnl"
);

if(
!pnlEl
){
continue;
}

const raw =
pnlEl.dataset.raw ||
pnlEl.textContent ||
"—";
pnlEl.textContent =
totalPnlHidden
? "••••"
: raw;
pnlEl.classList.toggle(
"is-masked",
totalPnlHidden
);

if(
!totalPnlHidden
){
const n =
Number(
String(
raw
).replace(
",",
"."
).replace(
/[^\d.-]/g,
""
)
);
pnlEl.classList.toggle(
"is-pos",
n >
0
);
pnlEl.classList.toggle(
"is-neg",
n <
0
);
}else{
pnlEl.classList.remove(
"is-pos",
"is-neg"
);
}

}

}

positionsTotalEyeBtn?.addEventListener(
"click",
()=>{
totalPnlHidden =
!totalPnlHidden;
writeTotalPnlHidden(
totalPnlHidden
);
updateEyeUi();
}
);

updateEyeUi();

function updateTotal(
rows
){

const sum =
rows.reduce(
(
acc,
row
)=>
acc +
(
Number.isFinite(
Number(
row.pnl
)
)
? Number(
row.pnl
)
: 0
),
0
);

if(
positionsTotalEl
){
positionsTotalEl.hidden =
rows.length ===
0;
}

if(
positionsTotalPnlEl
){
const text =
formatTradePnl(
sum
);
positionsTotalPnlEl.dataset.raw =
text;
positionsTotalPnlEl.textContent =
totalPnlHidden
? "••••"
: text;
positionsTotalPnlEl.classList.toggle(
"is-pos",
!totalPnlHidden &&
sum >
0
);
positionsTotalPnlEl.classList.toggle(
"is-neg",
!totalPnlHidden &&
sum <
0
);
positionsTotalPnlEl.classList.toggle(
"is-masked",
totalPnlHidden
);
}

}

function createRow(
row
){

const el =
document.createElement(
"div"
);
const sym =
normalizeSymbol(
row.symbol
);
const ticker =
displayTicker(
row.symbol
);
const active =
sym ===
getActiveChartSymbol();

el.className =
`trade-book-row trade-book-row--position${active ? " is-active" : ""}`;
el.dataset.symbol =
sym;

el.innerHTML =
`
<span class="col-ticker" title="${ticker}">
<span class="trade-book-side ${sideClass(row.side)}" aria-hidden="true"></span>
<span class="trade-book-ticker-text">${ticker}</span>
</span>
<span class="col-pnl-wrap">
<span class="col-pnl"></span>
<button type="button" class="trade-book-close" title="Закрыть по рынку" aria-label="Закрыть ${ticker}">×</button>
</span>
<span class="col-volume"></span>
<span class="col-entry"></span>
<span class="col-liq"></span>
`;

el.querySelector(
".col-ticker"
)?.addEventListener(
"click",
()=>{
for(
const node of rowNodes.values()
){
node.classList.toggle(
"is-active",
node.dataset.symbol ===
sym
);
}

window.dispatchEvent(
new CustomEvent(
"algo-book-open-symbol",
{
detail:{
symbol:
sym
}
}
)
);
}
);

el.querySelector(
".trade-book-close"
)?.addEventListener(
"click",
event=>{
event.stopPropagation();
void closeOne(
sym
);
}
);

updateRow(
el,
row
);

return el;

}

function updateRow(
el,
row
){

const sym =
normalizeSymbol(
row.symbol
);
const ticker =
displayTicker(
row.symbol
);
const active =
sym ===
getActiveChartSymbol();

el.classList.toggle(
"is-active",
active
);

const sideEl =
el.querySelector(
".trade-book-side"
);
const textEl =
el.querySelector(
".trade-book-ticker-text"
);
const pnlEl =
el.querySelector(
".col-pnl-wrap .col-pnl"
);
const volEl =
el.querySelector(
".col-volume"
);
const entryEl =
el.querySelector(
".col-entry"
);
const liqEl =
el.querySelector(
".col-liq"
);

if(
sideEl
){
sideEl.className =
`trade-book-side ${sideClass(row.side)}`.trim();
}

if(
textEl
){
textEl.textContent =
ticker;
}

const pnl =
Number(
row.pnl
);
const pnlText =
formatTradePnl(
pnl
);

if(
pnlEl
){
pnlEl.dataset.raw =
pnlText;
pnlEl.textContent =
totalPnlHidden
? "••••"
: pnlText;
pnlEl.className =
totalPnlHidden
? "col-pnl is-masked"
: `col-pnl ${pnlToneClass(pnl)}`.trim();
}

if(
volEl
){
volEl.textContent =
formatTradeUsdt(
row.volumeUsdt
);
}

if(
entryEl
){
entryEl.textContent =
formatTradeUsdt(
row.avgPrice
);
}

if(
liqEl
){
liqEl.textContent =
formatTradeUsdt(
row.liqPrice
);
}

}

function renderEmpty(
message
){

clearAllRows();
rowsEl.innerHTML =
`<div class="trade-book-empty">${message ||
"Нет открытых позиций"}</div>`;

if(
mode ===
"positions"
){
updateTotal(
[]
);
closeAllBtn.hidden =
true;
}else{
hidePositionsTotal();
}

}

function createOrderRow(
row
){

const el =
document.createElement(
"div"
);
const sym =
normalizeSymbol(
row.symbol
);
const ticker =
displayTicker(
row.symbol
);
const active =
sym ===
getActiveChartSymbol();
const orderId =
String(
row.orderId ||
""
);

el.className =
`trade-book-row trade-book-row--order${active ? " is-active" : ""}`;
el.dataset.symbol =
sym;
el.dataset.orderId =
orderId;

el.innerHTML =
`
<span class="col-ticker" title="${ticker}">
<span class="trade-book-ticker-text">${ticker}</span>
</span>
<span class="col-order-type">${orderTypeLabel(
row
)}</span>
<span class="col-price">${formatOrderPrice(
row.price
)}</span>
<span class="col-time">${formatOrderTime(
row.createdAt
)}</span>
`;

el.querySelector(
".col-ticker"
)?.addEventListener(
"click",
()=>{
openSymbol(
sym
);
for(
const node of orderRowNodes.values()
){
node.classList.toggle(
"is-active",
node.dataset.symbol ===
sym
);
}
}
);

return el;

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

const listRows =
lastOrderRows.filter(
row=>
String(
row?.orderId ||
""
).trim()
);

clearAllRows();

if(
!listRows.length
){
renderEmpty(
"Нет ордеров бота"
);
return;
}

for(
const row of listRows
){

const orderId =
String(
row.orderId
);
const el =
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

}

}

function loadBotAlerts(){

return loadAllAlerts().filter(
alert=>
isAlgoBotAlertRow(
alert
)
).slice().sort(
(
a,
b
)=>
(
Number(
b.createdAt
) ||
0
) -
(
Number(
a.createdAt
) ||
0
)
);

}

function renderAlerts(
alerts
){

hidePositionsTotal();
lastAlertRows =
Array.isArray(
alerts
)
? alerts
: [];

clearAllRows();

if(
!lastAlertRows.length
){
renderEmpty(
"Нет алертов бота"
);
return;
}

rowsEl.innerHTML =
lastAlertRows.map(
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
const sym =
normalizeSymbol(
symbol
);
const ticker =
formatAlertTicker(
symbol
);
const active =
sym ===
getActiveChartSymbol();

return `
<div class="trade-book-row trade-book-row--alert${active ? " is-active" : ""}" data-symbol="${sym}" data-shape-id="${shapeId}">
<span class="col-date">${formatAlertDate(
alert.createdAt
)}</span>
<span class="col-ticker" title="${ticker}">
<span class="trade-book-ticker-text">${ticker}</span>
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

const sym =
row.dataset.symbol;
const shapeId =
row.dataset.shapeId;

row.querySelector(
".col-ticker"
)?.addEventListener(
"click",
()=>{
openSymbol(
sym
);
}
);

row.querySelector(
".trade-book-close"
)?.addEventListener(
"click",
event=>{
event.stopPropagation();
removeAlert(
sym,
shapeId
);
window.dispatchEvent(
new CustomEvent(
"price-alerts-changed"
)
);
renderAlerts(
loadBotAlerts()
);
}
);

}
);

}

function renderPositions(
rows
){

const listRows =
Array.isArray(
rows
)
? rows
: [];

orderRowNodes.clear();

for(
const el of [
...rowsEl.querySelectorAll(
".trade-book-row--order, .trade-book-row--alert, .trade-book-empty"
)
]
){
el.remove();
}

if(
!listRows.length
){
renderEmpty(
"Нет открытых позиций"
);
return;
}

const empty =
rowsEl.querySelector(
".trade-book-empty"
);

if(
empty
){
empty.remove();
}

updateTotal(
listRows
);
closeAllBtn.hidden =
false;

const nextKeys =
new Set();

for(
const row of listRows
){

const key =
normalizeSymbol(
row.symbol
);

if(
!key
){
continue;
}

nextKeys.add(
key
);

let el =
rowNodes.get(
key
);

if(
!el
){
el =
createRow(
row
);
rowNodes.set(
key,
el
);
rowsEl.appendChild(
el
);
}else{
updateRow(
el,
row
);
}

}

for(
const [
key,
el
] of rowNodes
){

if(
!nextKeys.has(
key
)
){
el.remove();
rowNodes.delete(
key
);
}

}

}

async function refreshOrders(){

const api =
algoApi();

if(
!api?.getOpenOrders
){
renderOrders(
[]
);
setStatus(
"нет API ордеров"
);
return;
}

try{
const result =
await api.getOpenOrders();
const orders =
Array.isArray(
result?.orders
)
? result.orders
: [];
/* Bot places stop triggers; exclude leftovers if any non-stop slip in. */
const botOrders =
orders.filter(
order=>
order?.orderKind ===
"stop" ||
String(
order?.label ||
""
).toLowerCase().includes(
"stop"
)
);

renderOrders(
botOrders.length
? botOrders
: orders
);
setStatus(
""
);
}catch(
err
){
renderOrders(
[]
);
setStatus(
err?.message ||
"ошибка ордеров"
);
}

}

function rememberArmedAlertShapeIds(
status
){

const setups =
Array.isArray(
status?.armedSetups
)
? status.armedSetups
: [];

for(
const row of setups
){

rememberBotAlertShapeId(
row?.alertShapeId
);

}

if(
setups.length
){
retagKnownAlgoBotAlerts();
}

}

function refreshAlerts(){

retagKnownAlgoBotAlerts();
renderAlerts(
loadBotAlerts()
);
setStatus(
""
);

}

async function refresh(){

if(
disposed
){
return;
}

applyModeChrome();
/* Wipe previous mode rows immediately — avoid positions under Orders headers while fetch runs. */
clearAllRows();

if(
mode ===
"orders"
){
await refreshOrders();
return;
}

if(
mode ===
"alerts"
){
refreshAlerts();
return;
}

const result =
await syncTradePositionsCache();
const rows =
result?.ok
? (
result.positions ||
getAllCachedPositions()
)
: getAllCachedPositions();

renderPositions(
rows
);
setStatus(
rows.length
? ""
: (
result?.ok ===
false
? (
result.message ||
"нет ключей / ошибка"
)
: ""
)
);

}

async function closeOne(
symbol
){

const api =
algoApi();

if(
!api?.closePosition ||
closing
){
return;
}

closing =
true;
setStatus(
`закрытие ${symbol}…`
);

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
"ошибка закрытия"
);
}else{
removeTradePositionFromCache(
symbol
);
await refresh();
window.dispatchEvent(
new CustomEvent(
"algo-book-refresh"
)
);
}
}catch(
err
){
setStatus(
err?.message ||
"ошибка закрытия"
);
}finally{
closing =
false;
}

}

closeAllBtn?.addEventListener(
"click",
()=>{
void (
async()=>{

const rows =
getAllCachedPositions();

for(
const row of rows
){
await closeOne(
normalizeSymbol(
row.symbol
)
);
}

}
)();
}
);

modeSelect?.addEventListener(
"change",
()=>{
const next =
modeSelect.value;

mode =
next ===
"orders" ||
next ===
"alerts"
? next
: "positions";
void refresh();
}
);

function onStreamPositions(){

if(
mode !==
"positions"
){
return;
}

renderPositions(
getAllCachedPositions()
);

}

function onStreamOrders(){

if(
mode !==
"orders"
){
return;
}

void refreshOrders();

}

function onAlertsChanged(){

if(
mode !==
"alerts"
){
return;
}

refreshAlerts();

}

window.addEventListener(
"algo-trade-stream-positions",
onStreamPositions
);
window.addEventListener(
"algo-trade-stream-orders",
onStreamOrders
);
window.addEventListener(
"algo-trade-orders-refresh",
onStreamOrders
);
window.addEventListener(
"price-alerts-changed",
onAlertsChanged
);
window.addEventListener(
"alerts-changed",
onAlertsChanged
);
window.addEventListener(
"alerts-registry-pulled",
onAlertsChanged
);
window.addEventListener(
"algo-book-refresh",
()=>{
void refresh();
}
);

const unsubBotStatus =
subscribeAlgoBotStatus(
status=>{

if(
disposed
){
return;
}

rememberArmedAlertShapeIds(
status
);

if(
mode ===
"alerts"
){
refreshAlerts();
}

}
);

void fetchAlgoBotStatus().then(
status=>{

if(
disposed
){
return;
}

rememberArmedAlertShapeIds(
status
);

if(
mode ===
"alerts"
){
refreshAlerts();
}

}
).catch(
()=>{}
);

void refresh();

return {
destroy(){
disposed =
true;
unsubBotStatus?.();
window.removeEventListener(
"algo-trade-stream-positions",
onStreamPositions
);
window.removeEventListener(
"algo-trade-stream-orders",
onStreamOrders
);
window.removeEventListener(
"algo-trade-orders-refresh",
onStreamOrders
);
window.removeEventListener(
"price-alerts-changed",
onAlertsChanged
);
window.removeEventListener(
"alerts-changed",
onAlertsChanged
);
window.removeEventListener(
"alerts-registry-pulled",
onAlertsChanged
);
panel.remove();
splitResize.remove();
}
};

}
