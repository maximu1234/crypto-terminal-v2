/**
 * /trade — кнопки входа по рынку (Buy / Sell) в шапке графика.
 */
import {
getCachedPosition,
listCachedPositionsForSymbol,
removeTradePositionFromCache,
upsertTradePositionInCache
} from "./positions-cache.js?v=5";

import {
getActiveTradeVolumeUsdt
} from "./volume-presets.js?v=2";

import {
applyAutoStopsAfterEntry,
calcStopPriceFromUsd,
getAutoStopSettings,
markAutoStopsHandled
} from "./auto-stops.js?v=8";

import {
marketMap
} from "../../terminal/terminal-state.js?v=11";

import {
getTradeConfig
} from "./config.js?v=10";

import {
mountTradeChartMarkersToggle
} from "./chart-execution-markers.js?v=2";

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

/**
 * Shared open path for coins chart + terminal widget mount (BingX stop policy).
 * @param {{ symbol: string, side: string, volumeUsdt: number, btn?: HTMLElement | null }} opts
 */
async function openMarketPositionCore(
{
symbol,
side,
volumeUsdt,
btn =
null
}
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
const settings =
getAutoStopSettings();
const openOptions =
{
exchangeId:
"bingx"
};

if(
getTradeConfig().passAutoStopUsdOnOpen
){
openOptions.autoSlUsd =
settings.slEnabled &&
settings.slUsd >
0
? settings.slUsd
: 0;
openOptions.autoTpUsd =
settings.tpEnabled &&
settings.tpUsd >
0
? settings.tpUsd
: 0;
}

/* Main attaches SL/TP — block renderer maybeApply/double-place during open. */
if(
getTradeConfig().attachStopsInMainProcess &&
(
openOptions.autoSlUsd >
0 ||
openOptions.autoTpUsd >
0
)
){
markAutoStopsHandled(
symbol,
{
symbol
}
);
}

const result =
await api.openPosition(
symbol,
side,
volumeUsdt,
openOptions
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
/* Upsert one row — do not replace the full cache with a 1-item snapshot. */
upsertTradePositionInCache(
result.position
);

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

const mainOwns =
getTradeConfig().attachStopsInMainProcess ===
true;

if(
mainOwns &&
(
openOptions.autoSlUsd >
0 ||
openOptions.autoTpUsd >
0
)
){
markAutoStopsHandled(
symbol,
result.position
);

/* Paint expected SL/TP immediately — main attaches in background. */
const posSide =
result.position.side ===
"Sell"
? "Sell"
: "Buy";
const entry =
Number(
result.position.avgPrice
) ||
0;
const size =
Math.abs(
Number(
result.position.size
) ||
0
);
const painted =
{
...result.position
};

if(
openOptions.autoSlUsd >
0 &&
entry >
0 &&
size >
0
){
const slPrice =
calcStopPriceFromUsd({
side:
posSide,
entryPrice:
entry,
size,
usd:
openOptions.autoSlUsd,
kind:
"sl"
});

if(
slPrice >
0
){
painted.stopLoss =
slPrice;
}

}

if(
openOptions.autoTpUsd >
0 &&
entry >
0 &&
size >
0
){
const tpPrice =
calcStopPriceFromUsd({
side:
posSide,
entryPrice:
entry,
size,
usd:
openOptions.autoTpUsd,
kind:
"tp"
});

if(
tpPrice >
0
){
painted.takeProfit =
tpPrice;
}

}

upsertTradePositionInCache(
painted
);
window.dispatchEvent(
new CustomEvent(
"trade-position-updated",
{
detail:{
symbol,
position:
painted
}
}
)
);
}else{
const attached =
result?.stopsAttached ||
{};

if(
attached.sl ||
attached.tp
){
markAutoStopsHandled(
symbol,
result.position
);
}

const needsAutoStops =
!attached.sl ||
!attached.tp;

if(
needsAutoStops
){
void applyAutoStopsAfterEntry(
symbol,
result.position
);
}

}
}

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

async function submitMarketEntry(
side,
btn
){

await openMarketPositionCore(
{
symbol:
getCurrentSymbol(),
side,
volumeUsdt:
getActiveTradeVolumeUsdt(),
btn
}
);

}

export async function openWidgetMarketPosition(
{
symbol,
side,
volumeUsdt
}
){

await openMarketPositionCore(
{
symbol,
side,
volumeUsdt,
btn:
null
}
);

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
const matches =
listCachedPositionsForSymbol(
symbol
);
let cached =
null;

if(
matches.length >
1
){
window.alert(
"По символу открыты long и short. Закройте нужную сторону в панели позиций."
);
return;
}

if(
matches.length ===
1
){
cached =
matches[
0
];
}else{
cached =
getCachedPosition(
symbol
);
}

const closeOptions =
cached
? {
positionSide:
cached.positionSide,
side:
cached.side,
position:
cached
}
: {};
const result =
await api.closePosition(
symbol,
closeOptions
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

removeTradePositionFromCache(
symbol,
closeOptions
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

mountTradeChartMarkersToggle(
actions,
entry
);

mountTradeChartMarkersToggle(
actions,
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
