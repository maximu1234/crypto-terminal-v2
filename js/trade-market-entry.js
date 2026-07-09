/**
 * /trade — кнопки входа по рынку (Buy / Sell) в шапке графика.
 */
import {
getActiveTradeVolumeUsdt
} from "./trade-volume-presets.js?v=10";

import {
applyAutoStopsAfterEntry
} from "./trade-auto-stops.js?v=2";

import {
marketMap
} from "./terminal/terminal-state.js?v=9";

const REFRESH_MS =
1500;

function tradingApi(){

return window.cryptoTerminalDesktop?.trading;

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

function getCurrentSymbol(){

const fromHost =
window.__tradeChartHost?.getSymbol?.();

if(
fromHost
){
return normalizeSymbol(
fromHost
);
}

const label =
document.getElementById(
"current-symbol"
)?.textContent ||
"";

return normalizeSymbol(
label.replace(
/\.P$/i,
""
)
);

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

function ensureActionsWrap(
topbar,
volumeWrap
){

let actions =
topbar.querySelector(
".trade-topbar-trade-actions"
);

if(
actions
){
return actions;
}

actions =
document.createElement(
"div"
);
actions.className =
"trade-topbar-trade-actions";
topbar.insertBefore(
actions,
volumeWrap
);
actions.appendChild(
volumeWrap
);
return actions;

}

let entryBusy =
false;
let closeBusy =
false;

async function submitMarketEntry(
side,
btn
){

const api =
tradingApi();

if(
!api?.openPosition
){
window.alert(
"Торговля доступна только в десктоп-приложении."
);
return;
}

if(
entryBusy
){
return;
}

const volumeUsdt =
getActiveTradeVolumeUsdt();

if(
!Number.isFinite(
volumeUsdt
) ||
volumeUsdt <=
0
){
window.alert(
"Укажите объём сделки в USDT в меню над графиком."
);
return;
}

const symbol =
getCurrentSymbol();

if(
!symbol
){
window.alert(
"Символ не выбран."
);
return;
}

if(
btn
){
btn.disabled =
true;
}

entryBusy =
true;

try{
const result =
await api.openPosition(
symbol,
side,
volumeUsdt
);

if(
result?.ok ===
false
){
window.alert(
result.message ||
"Не удалось открыть позицию"
);
return;
}

if(
result?.position
){
window.dispatchEvent(
new CustomEvent(
"trade-position-updated",
{
detail:
{
symbol,
position:
result.position
}
}
)
);

void applyAutoStopsAfterEntry(
symbol,
result.position
);
}

window.dispatchEvent(
new CustomEvent(
"trade-book-refresh"
)
);
window.dispatchEvent(
new CustomEvent(
"trade-open-positions-changed"
)
);
}catch(
err
){
window.alert(
err?.message ||
"Ошибка входа"
);
}finally{
entryBusy =
false;

if(
btn
){
btn.disabled =
false;
}

}

}

function shouldIgnoreTradeHotkey(
event
){

const target =
event.target;

if(
!target
){
return false;
}

const tag =
target.tagName?.toLowerCase();

if(
tag ===
"input" ||
tag ===
"textarea" ||
tag ===
"select"
){
return true;
}

if(
target.isContentEditable
){
return true;
}

return false;

}

async function closeActiveChartPosition(){

const api =
tradingApi();

if(
!api?.closePosition
){
window.alert(
"Торговля доступна только в десктоп-приложении."
);
return;
}

if(
closeBusy ||
entryBusy
){
return;
}

const symbol =
getCurrentSymbol();

if(
!symbol
){
window.alert(
"Символ не выбран."
);
return;
}

closeBusy =
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
window.alert(
result.message ||
"Не удалось закрыть позицию"
);
return;
}

window.dispatchEvent(
new CustomEvent(
"trade-book-refresh"
)
);
window.dispatchEvent(
new CustomEvent(
"trade-open-positions-changed"
)
);
}catch(
err
){
window.alert(
err?.message ||
"Ошибка закрытия"
);
}finally{
closeBusy =
false;
}

}

function onTradeMarketHotkey(
event
){

if(
shouldIgnoreTradeHotkey(
event
)
){
return;
}

if(
event.isComposing
){
return;
}

/*
  Option+D (Mac) и Alt+D (Windows/Linux) — закрыть позицию на активном графике.
*/
if(
event.altKey &&
!event.ctrlKey &&
!event.metaKey &&
event.code ===
"KeyD"
){
event.preventDefault();
void closeActiveChartPosition();
return;
}

if(
event.altKey ||
event.ctrlKey ||
event.metaKey ||
event.shiftKey
){
return;
}

if(
event.code ===
"KeyT"
){
event.preventDefault();
void submitMarketEntry(
"Buy",
null
);
return;
}

if(
event.code ===
"KeyY"
){
event.preventDefault();
void submitMarketEntry(
"Sell",
null
);
}

}

export function initTradeMarketEntry(){

if(
!document.body.classList.contains(
"trade-page"
)
){
return null;
}

const topbar =
document.getElementById(
"topbar"
);
const volumeWrap =
document.getElementById(
"trade-volume-presets-wrap"
);

if(
!topbar ||
!volumeWrap ||
document.getElementById(
"trade-market-entry"
)
){
return null;
}

const actions =
ensureActionsWrap(
topbar,
volumeWrap
);

const entry =
document.createElement(
"div"
);
entry.id =
"trade-market-entry";
entry.className =
"trade-market-entry";

entry.innerHTML =
`
<button type="button" class="trade-market-entry-btn trade-market-entry-btn--buy" data-side="Buy" title="Купить по рынку (T)">
<span class="trade-market-entry-arrow" aria-hidden="true">↑</span>
<span class="trade-market-entry-price" data-role="buy-price">—</span>
</button>
<button type="button" class="trade-market-entry-btn trade-market-entry-btn--sell" data-side="Sell" title="Продать по рынку (Y)">
<span class="trade-market-entry-arrow" aria-hidden="true">↓</span>
<span class="trade-market-entry-price" data-role="sell-price">—</span>
</button>
`;

actions.insertBefore(
entry,
volumeWrap
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

[buyBtn, sellBtn].forEach(
btn=>{
btn?.addEventListener(
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

btn?.addEventListener(
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

btn?.addEventListener(
"click",
()=>{
queueMicrotask(
()=>{
btn.blur();
}
);
},
true
);
}
);

function refreshPrices(){

const tick =
marketMap.get(
getCurrentSymbol()
);
const ask =
Number(
tick?.ask
);
const bid =
Number(
tick?.bid
);
const last =
Number(
tick?.price
);

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

buyBtn.addEventListener(
"click",
()=>{
void submitMarketEntry(
"Buy",
buyBtn
);
}
);

sellBtn.addEventListener(
"click",
()=>{
void submitMarketEntry(
"Sell",
sellBtn
);
}
);

refreshPrices();

const timer =
window.setInterval(
refreshPrices,
REFRESH_MS
);

window.addEventListener(
"chart-candles-loaded",
refreshPrices
);

const symEl =
document.getElementById(
"current-symbol"
);

if(
symEl
){
const observer =
new MutationObserver(
refreshPrices
);
observer.observe(
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
"keydown",
onTradeMarketHotkey
);

return {
destroy:()=>{
window.clearInterval(
timer
);
document.removeEventListener(
"keydown",
onTradeMarketHotkey
);
entry.remove();
}
};

}
