/**
 * Торговый слой на виджетах Терминала (desktop, multichart).
 */
import {
createTradeChartOverlay
} from "./trade-chart-overlay.js?v=63";

import {
createTradeChartOrders
} from "./trade-chart-orders.js?v=32";

import {
createTradePlusMenuHandler
} from "./trade-order-plus-ui.js?v=7";

import {
TRADE_VOLUME_SLOT_COUNT,
TRADE_VOLUME_POSITION_APPLY_SLOT_INDEX,
focusActiveVolumePresetInput,
getVolumeStateForSymbol,
saveVolumeStateForSymbol,
getActiveTradeVolumeUsdt
} from "./trade-volume-presets.js?v=11";

import {
marketMap
} from "./terminal/terminal-state.js?v=12";

import {
getLoadedTradeExchangeModules
} from "./trade/module-router.js?v=16";

import {
mountTradeLeverageControl
} from "./trade-leverage-settings.js?v=4";

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

function formatEntryPrice(
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
num <=
0
){
return "—";
}

if(
num >=
1000
){
return num.toLocaleString(
"en-US",
{
minimumFractionDigits:
2,
maximumFractionDigits:
2
}
);
}

if(
num >=
1
){
return num.toLocaleString(
"en-US",
{
minimumFractionDigits:
2,
maximumFractionDigits:
4
}
);
}

return num.toLocaleString(
"en-US",
{
maximumFractionDigits:
6
}
);

}

function normalizeSlotValue(
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
num <
0
){
return 0;
}

return Math.round(
num *
100
) /
100;

}

function formatVolumeLabel(
value
){

const num =
normalizeSlotValue(
value
);

if(
Number.isInteger(
num
)
){
return String(
num
);
}

return String(
num
);

}

function buildVolumeRowsHtml(
namePrefix
){

return Array.from(
{
length:
TRADE_VOLUME_SLOT_COUNT
},
(
_unused,
index
)=>
`
<label class="trade-volume-presets-row" data-volume-slot="${index}">
<input type="radio" name="${namePrefix}-active" value="${index}" aria-label="Пресет ${index + 1}"/>
<span class="trade-volume-presets-field">
<input type="number" min="0" step="any" inputmode="decimal" aria-label="Объём USDT ${index + 1}"/>
<span class="trade-volume-presets-suffix">$</span>
</span>
</label>
`
).join(
""
);

}

function mountWidgetVolumeControl(
mountEl,
symbol
){

const sym =
normalizeSymbol(
symbol
);
let volumeState =
getVolumeStateForSymbol(
sym
);
const uid =
`tw-${sym}-${Math.random().toString(36).slice(2, 8)}`;

const wrap =
document.createElement(
"div"
);
wrap.className =
"trade-volume-presets-wrap trade-widget-volume-wrap";

wrap.innerHTML =
`
<div class="trade-volume-presets-control">
<button type="button" class="trade-volume-presets-btn" aria-expanded="false" aria-haspopup="true" title="Пресеты объёма USDT">
<span class="trade-volume-presets-grid" aria-hidden="true"></span>
</button>
<input type="text" inputmode="decimal" class="trade-volume-presets-value" data-role="volume-label" autocomplete="off" spellcheck="false" aria-label="Активный объём USDT" title="Активный объём USDT" value="${formatVolumeLabel(volumeState.slots[volumeState.activeIndex] ?? 0)}"/>
</div>
<div class="trade-volume-presets-dropdown hidden">
<div class="trade-volume-presets-panel" role="dialog" aria-label="Объём сделки USDT">
${buildVolumeRowsHtml(uid)}
</div>
</div>
`;

mountEl.appendChild(
wrap
);

const btn =
wrap.querySelector(
".trade-volume-presets-btn"
);
const dropdown =
wrap.querySelector(
".trade-volume-presets-dropdown"
);
const labelEl =
wrap.querySelector(
'[data-role="volume-label"]'
);

function persist(){

saveVolumeStateForSymbol(
sym,
volumeState
);

}

function refreshLabel(){

const display =
formatVolumeLabel(
volumeState.slots[
volumeState.activeIndex
] ??
0
);

if(
labelEl instanceof HTMLInputElement
){
labelEl.value =
display;
return;
}

labelEl.textContent =
display;

}

function syncInputs(){

dropdown.querySelectorAll(
"[data-volume-slot]"
).forEach(
row=>{

const index =
Number(
row.dataset.volumeSlot
);
const radio =
row.querySelector(
'input[type="radio"]'
);
const input =
row.querySelector(
'input[type="number"]'
);

if(
!radio ||
!input
){
return;
}

radio.checked =
index ===
volumeState.activeIndex;
input.value =
String(
volumeState.slots[
index
] ??
0
);

}
);

refreshLabel();

}

syncInputs();

if(
labelEl instanceof HTMLInputElement
){
labelEl.addEventListener(
"click",
event=>{
event.stopPropagation();
}
);

labelEl.addEventListener(
"mousedown",
event=>{
event.stopPropagation();
}
);

labelEl.addEventListener(
"change",
()=>{
volumeState.slots[
volumeState.activeIndex
] =
normalizeSlotValue(
labelEl.value
);
persist();
refreshLabel();
syncInputs();
}
);

labelEl.addEventListener(
"keydown",
event=>{
if(
event.key ===
"Enter"
){
event.preventDefault();
labelEl.blur();
}
}
);
}

dropdown.querySelectorAll(
"[data-volume-slot]"
).forEach(
row=>{

const index =
Number(
row.dataset.volumeSlot
);
const radio =
row.querySelector(
'input[type="radio"]'
);
const input =
row.querySelector(
'input[type="number"]'
);

if(
!Number.isInteger(
index
) ||
!radio ||
!input
){
return;
}

radio.addEventListener(
"change",
()=>{

if(
!radio.checked
){
return;
}

volumeState.activeIndex =
index;
persist();
refreshLabel();
focusActiveVolumePresetInput(
dropdown,
index
);

}
);

input.addEventListener(
"focus",
()=>{

if(
volumeState.activeIndex !==
index
){
volumeState.activeIndex =
index;
radio.checked =
true;
persist();
refreshLabel();
}

}
);

input.addEventListener(
"change",
()=>{

volumeState.slots[
index
] =
normalizeSlotValue(
input.value
);
persist();
refreshLabel();

}
);

}
);

let open =
false;

function setOpen(
next
){

open =
next;
dropdown.classList.toggle(
"hidden",
!open
);
btn.setAttribute(
"aria-expanded",
open
? "true"
: "false"
);

if(
open
){
syncInputs();
focusActiveVolumePresetInput(
dropdown,
volumeState.activeIndex
);
}

}

btn.addEventListener(
"click",
event=>{
event.stopPropagation();
setOpen(
!open
);
}
);

const onDoc =
event=>{

if(
!wrap.contains(
event.target
)
){
setOpen(
false
);
}

};

document.addEventListener(
"pointerdown",
onDoc,
true
);

const onApplyPositionVolume =
event=>{

const volumeUsdt =
Number(
event?.detail?.volumeUsdt
);

if(
!Number.isFinite(
volumeUsdt
) ||
volumeUsdt <=
0
){
return;
}

const eventSym =
normalizeSymbol(
event?.detail?.symbol
);

if(
eventSym &&
eventSym !==
sym
){
return;
}

volumeState.slots[
TRADE_VOLUME_POSITION_APPLY_SLOT_INDEX
] =
normalizeSlotValue(
volumeUsdt
);
volumeState.activeIndex =
TRADE_VOLUME_POSITION_APPLY_SLOT_INDEX;
syncInputs();
persist();

};

window.addEventListener(
"trade-apply-position-volume",
onApplyPositionVolume
);

const onTradeVolumeChange =
event=>{

const eventSym =
normalizeSymbol(
event?.detail?.symbol
);

if(
eventSym &&
eventSym !==
sym
){
return;
}

volumeState =
getVolumeStateForSymbol(
sym
);
syncInputs();

};

window.addEventListener(
"trade-volume-change",
onTradeVolumeChange
);

return {
getVolumeUsdt:()=>
getActiveTradeVolumeUsdt(
sym
),
destroy:()=>{
window.removeEventListener(
"trade-apply-position-volume",
onApplyPositionVolume
);
window.removeEventListener(
"trade-volume-change",
onTradeVolumeChange
);
document.removeEventListener(
"pointerdown",
onDoc,
true
);
wrap.remove();
}
};

}

function mountWidgetMarketEntry(
mountEl,
{
getSymbol,
getVolumeUsdt,
getMarkPrice
}
){

const entry =
document.createElement(
"div"
);
entry.className =
"trade-market-entry trade-widget-market-entry";

entry.innerHTML =
`
<button type="button" class="trade-market-entry-btn trade-market-entry-btn--buy" data-side="Buy" title="Купить по рынку">
<span class="trade-market-entry-arrow" aria-hidden="true">↑</span>
<span class="trade-market-entry-price" data-role="buy-price">—</span>
</button>
<button type="button" class="trade-market-entry-btn trade-market-entry-btn--sell" data-side="Sell" title="Продать по рынку">
<span class="trade-market-entry-arrow" aria-hidden="true">↓</span>
<span class="trade-market-entry-price" data-role="sell-price">—</span>
</button>
`;

mountEl.appendChild(
entry
);

const buyBtn =
entry.querySelector(
".trade-market-entry-btn--buy"
);
const sellBtn =
entry.querySelector(
".trade-market-entry-btn--sell"
);
const buyPriceEl =
entry.querySelector(
'[data-role="buy-price"]'
);
const sellPriceEl =
entry.querySelector(
'[data-role="sell-price"]'
);

function refreshPrices(){

const tick =
marketMap.get(
normalizeSymbol(
getSymbol()
)
);
const ask =
Number(
tick?.ask
);
const bid =
Number(
tick?.bid
);
let last =
Number(
tick?.price
);

if(
!Number.isFinite(
last
) ||
last <=
0
){
last =
Number(
getMarkPrice?.()
);
}

buyPriceEl.textContent =
formatEntryPrice(
Number.isFinite(
ask
) &&
ask >
0
? ask
: last
);
sellPriceEl.textContent =
formatEntryPrice(
Number.isFinite(
bid
) &&
bid >
0
? bid
: last
);

}

refreshPrices();

const priceTimer =
setInterval(
refreshPrices,
1500
);

async function submit(
side,
btn
){

const volumeUsdt =
getVolumeUsdt();

if(
!Number.isFinite(
volumeUsdt
) ||
volumeUsdt <=
0
){
window.alert(
"Укажите объём сделки USDT."
);
return;
}

const symbol =
normalizeSymbol(
getSymbol()
);

if(
!symbol
){
return;
}

const openFn =
getLoadedTradeExchangeModules()?.openWidgetMarketPosition;

if(
typeof openFn !==
"function"
){
window.alert(
"Торговля доступна только в десктоп-приложении."
);
return;
}

btn.disabled =
true;

try{
await openFn(
{
symbol,
side,
volumeUsdt
}
);
}catch(
err
){
window.alert(
err?.message ||
"Ошибка входа"
);
}finally{
btn.disabled =
false;
}

}

buyBtn.addEventListener(
"click",
event=>{
event.stopPropagation();
void submit(
"Buy",
buyBtn
);
}
);

sellBtn.addEventListener(
"click",
event=>{
event.stopPropagation();
void submit(
"Sell",
sellBtn
);
}
);

return {
destroy:()=>{
clearInterval(
priceTimer
);
entry.remove();
}
};

}

/**
 * @param {{
 *   widgetEl: Element,
 *   chart: object,
 *   series: object,
 *   wrapEl: Element,
 *   chartContainer: Element,
 *   getSymbol: ()=>string,
 *   getTf: ()=>string,
 *   getDrawingTools: ()=>object|null,
 *   getMarkPrice?: ()=>number
 * }} opts
 */
export function mountTradeOnDashboardWidget(
opts
){

if(
!document.body.classList.contains(
"trade-page"
)
){
return {
destroy:()=>{}
};
}

const {
widgetEl,
chart,
series,
wrapEl,
getSymbol,
getTf,
getDrawingTools
} =
opts;

const toolbar =
document.createElement(
"div"
);
toolbar.className =
"trade-widget-toolbar";

const headerRight =
widgetEl.querySelector(
".widget-header-right"
);

if(
headerRight
){
headerRight.insertBefore(
toolbar,
headerRight.firstChild
);
}

const volume =
mountWidgetVolumeControl(
toolbar,
getSymbol()
);

const leverage =
mountTradeLeverageControl(
toolbar,
{
getSymbol
}
);

const market =
mountWidgetMarketEntry(
toolbar,
{
getSymbol,
getVolumeUsdt:()=>
volume.getVolumeUsdt(),
getMarkPrice:
opts.getMarkPrice
}
);

const host =
{
chart,
series,
wrapEl,
chartEl:
opts.chartContainer,
getSymbol,
getDrawingTools
};

const overlay =
createTradeChartOverlay(
host
);
const orders =
createTradeChartOrders(
host
);

const plusHandler =
createTradePlusMenuHandler(
{
getSymbol,
getTf,
scheduleRedraw:()=>
getDrawingTools?.()?.scheduleRedraw?.()
}
);

return {
plusHandler,
overlay,
orders,
destroy:()=>{
volume.destroy();
market.destroy();
overlay?.destroy?.();
orders?.destroy?.();
toolbar.remove();
}
};

}
