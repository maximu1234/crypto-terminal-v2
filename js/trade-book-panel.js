/**
 * /trade — панель позиций и ордеров (низ списка монет).
 */
const REFRESH_MS =
10000;

const PANEL_HEIGHT_KEY =
"trade_book_panel_height_v1";

const PANEL_DEFAULT_H =
168;

const PANEL_MIN_H =
120;

const PANEL_MIN_COINS_BODY =
72;

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
let pollTimer =
null;
let loading =
false;
let activeChartSymbol =
"";

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
<span class="col-ticker">Тикер</span>
<span class="col-price">Цена</span>
<span class="col-time">Время</span>
`;
return;
}

tableHead.classList.add(
"trade-book-table-head--positions"
);
tableHead.innerHTML =
`
<span class="col-ticker">Тикер</span>
<span class="col-pnl">PnL</span>
<span class="col-volume">Объём</span>
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

rowsEl.innerHTML =
`<p class="trade-book-empty">${message}</p>`;

}

function renderPositions(
rows
){

if(
!rows.length
){
renderEmpty(
"Нет открытых позиций"
);
return;
}

rowsEl.innerHTML =
rows.map(
row=>{
const active =
normalizeBookSymbol(
row.symbol
) ===
normalizeBookSymbol(
activeChartSymbol
);

return `
<div class="trade-book-row trade-book-row--position${active ? " is-active" : ""}" data-symbol="${row.symbol}">
<button type="button" class="trade-book-ticker-btn" title="Открыть график ${row.ticker}">
<span class="trade-book-fut" title="Futures">F</span>
<span class="trade-book-ticker-text">${row.ticker}</span>
</button>
<span class="col-pnl ${pnlClass(row.pnl)}">${formatPnl(row.pnl)}</span>
<span class="col-volume">${formatUsdt(row.volumeUsdt)}</span>
<button type="button" class="trade-book-close" title="Закрыть по рынку" aria-label="Закрыть ${row.ticker}">×</button>
</div>
`;
}
).join(
""
);

rowsEl.querySelectorAll(
".trade-book-ticker-btn"
).forEach(
btn=>{
btn.addEventListener(
"click",
event=>{
event.stopPropagation();
const row =
btn.closest(
".trade-book-row--position"
);
const symbol =
row?.dataset?.symbol;

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
);
}
);

rowsEl.querySelectorAll(
".trade-book-close"
).forEach(
btn=>{
btn.addEventListener(
"click",
event=>{
event.stopPropagation();
const row =
btn.closest(
".trade-book-row--position"
);
const symbol =
row?.dataset?.symbol;

if(
!symbol
){
return;
}

const ticker =
row.querySelector(
".trade-book-ticker-text"
)?.textContent ||
symbol;

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
);
}
);

}

function renderOrders(
rows
){

if(
!rows.length
){
renderEmpty(
"Нет отложенных ордеров"
);
return;
}

rowsEl.innerHTML =
rows.map(
row=>
`
<div class="trade-book-row trade-book-row--order">
<span class="col-ticker"><span class="trade-book-fut" title="Futures">F</span>${row.ticker}</span>
<span class="col-price">${row.label || "—"} · ${formatPrice(row.price)}</span>
<span class="col-time">${formatDateTime(row.createdAt)}</span>
</div>
`
).join(
""
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
renderTableHead();
void refresh(
true
);

}

function startPoll(){

stopPoll();
pollTimer =
window.setInterval(
()=>{
void refresh(
true
);
},
REFRESH_MS
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

modeSelect.addEventListener(
"change",
()=>{
setMode(
modeSelect.value
);
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

renderTableHead();
void refresh(
false
);
startPoll();

document.addEventListener(
"visibilitychange",
()=>{

if(
document.hidden
){
stopPoll();
}else{
void refresh(
true
);
startPoll();
}

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

if(
mode !==
"positions" ||
!rowsEl.querySelector(
".trade-book-row--position"
)
){
return;
}

const nextActive =
normalizeBookSymbol(
sym
);

rowsEl.querySelectorAll(
".trade-book-row--position"
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
refresh,
stopPoll
};

}
