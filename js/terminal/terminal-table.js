import {
coinsState,
marketMap,
coinElements
} from "./terminal-state.js?v=11";

import {
isActiveRealtimeMarketDataset,
isExchangeTradingEnabled
} from "../market-api.js?v=2";

import {
connectKlineStream
} from "../market-ws.js?v=1";

import {
connectTickerStream,
fetchTickersInto
} from "../tickers.js?v=23";

import {
createTickerUiBatcher
} from "../ticker-update-batch.js?v=1";

import {
processAlertCandle
} from "../alert-monitor.js?v=70";

import {
getFavoriteGroup,
flagSortRank,
emptyFavorites
} from "../favorites.js?v=5";

import {
isTradePage
} from "./terminal-state.js?v=11";

/** Desktop /trade only — не тянем trade-open-positions в открытый web /coins. */
let hasOpenPosition =
()=>
false;
let positionPinEnabled =
isTradePage;

if(
isTradePage
){
const tradePositions =
await import(
"../trade-open-positions.js?v=3"
);
hasOpenPosition =
tradePositions.hasOpenPosition;
}

/**
 * AlgoTrading (и др.) могут подключить свой checker без импорта Terminal trade.
 * @param {(symbol: string) => boolean} fn
 * @param {boolean} [enabled]
 */
export function setCoinOpenPositionChecker(
fn,
enabled =
true
){

hasOpenPosition =
typeof fn ===
"function"
? fn
: ()=>
false;
positionPinEnabled =
!!enabled;

}

const hooks = {};

export function setCoinsTableHooks(next){

Object.assign(
hooks,
next
);

}

export function getCurrentSymbols(){

if(
typeof hooks.getCurrentSymbols ===
"function"
){
const custom =
hooks.getCurrentSymbols(
coinsState().currentDataset
);

if(
Array.isArray(
custom
)
){
return custom;
}

}

const dataset =
coinsState().currentDataset;

if(
dataset ===
"all"
){
return coinsState().allListings;
}

if(
dataset === "crypto"
){
return coinsState().allBybitSymbols;
}

if(
dataset === "new"
){
return coinsState().newListings;
}

if(
dataset ===
"usdc"
){
return coinsState().usdcListings;
}

if(
dataset ===
"indices"
){
return coinsState().indicesListings;
}

if(
dataset ===
"innovation"
){
return coinsState().innovationListings;
}

if(
dataset ===
"stocks"
){
return coinsState().stockListings;
}

if(
dataset ===
"commodities"
){
return coinsState().commodityListings;
}

if(
dataset ===
"forex"
){
return coinsState().forexListings;
}

console.warn(
"[coins] неизвестный рынок:",
dataset
);

return [];

}

export function generateMarketData(){

marketMap.clear();

const symbols =
getCurrentSymbols();

const dataset =
coinsState().currentDataset;

const next =
symbols.map(
symbol=>{
return {
symbol,
price:
0,
change24:
0,
change1h:
0
};
}
);

coinsState().marketData =
next;

next.forEach(
item=>{
marketMap.set(
item.symbol,
item
);
}
);

}

/*
  После обновления % рынка список должен перестраиваться, иначе
  при сохранённой сортировке по 24h/1h все строки с нулём % после
  перезагрузки выглядят «несохранённой» сортировкой.
*/
let resortPriceColsTimer =
null;

let coinListRenderFrozen =
false;

let coinListRenderPending =
false;

export function syncCoinListFreezeFromFlagMenus(){

const anyOpen =
!!document.querySelector(
".coin-flag-menu:not(.hidden)"
);

if(
anyOpen
){
coinListRenderFrozen =
true;
return;
}

coinListRenderFrozen =
false;

if(
coinListRenderPending
){
coinListRenderPending =
false;
renderListImpl();
}

}

export function scheduleResortPriceColumns(){

if(
coinsState().innerSortMode !== "24h" &&
coinsState().innerSortMode !== "1h"
){
return;
}

if(resortPriceColsTimer){
return;
}

resortPriceColsTimer =
setTimeout(()=>{

resortPriceColsTimer = null;

renderList();

},200);

}

export async function primeTickerSnapshots(){

if(
!isActiveRealtimeMarketDataset(
coinsState().currentDataset
)
){
return;
}

try{

const snap =
new Map();

await fetchTickersInto(snap);

snap.forEach((payload,symbol)=>{

const item =
marketMap.get(symbol);

if(!item){
return;
}

item.price =
payload.price;

item.change24 =
payload.change24;

item.change1h =
payload.change1h;

});

}catch(err){

console.warn(
"prime tickers:",
err
);

}

}

/* =========================================================
   REALTIME TICKERS
========================================================= */

export function startTickerStream(){

const scheduleTickerUiFlush =
createTickerUiBatcher(
()=>{

scheduleResortPriceColumns();

}
);

connectTickerStream(
tick=>{

const item =
marketMap.get(
tick.symbol
);

if(
!item
){
return;
}

item.price =
tick.price;

item.change24 =
tick.change24;

item.change1h =
tick.change1h;

updateCoinRow(
item
);
scheduleTickerUiFlush();

}
);

}

/* =========================================================
   REALTIME
========================================================= */

export function startRealtime(){

if(
!isActiveRealtimeMarketDataset(
coinsState().currentDataset
)
){
return;
}

const streamSymbol =
coinsState().currentSymbol;

connectKlineStream({

symbol:coinsState().currentSymbol,
tf:coinsState().currentTF,

onCandle:candle=>{

if(
streamSymbol !== coinsState().currentSymbol
){
return;
}

if(!coinsState().candles.length){
return;
}

const time =
Number(
candle?.time
);

if(
!Number.isFinite(
time
)
){
return;
}

const bar = {
...candle,
time
};

const last =
coinsState().candles[coinsState().candles.length - 1];

if(
time === last.time
){

coinsState().candles[coinsState().candles.length - 1] =
bar;

}else if(
time > last.time
){

coinsState().candles.push(
bar
);

if(
coinsState().candles.length > 4000
){
coinsState().candles.shift();
}

}else{
return;
}

if(
hooks.applyChartLiveCandle
){
hooks.applyChartLiveCandle(
bar
);
}else{
coinsState().candleSeries.update(
bar
);
}

hooks.rebuildRsiFromCandles();

processAlertCandle(
streamSymbol,
bar,
coinsState().currentTF
);

}

});

}

export function getFilteredMarketData(){

let data = [...coinsState().marketData];

const query =
coinsState().searchQuery.trim().toUpperCase();

if(query){

data = data.filter(item=>
item.symbol.includes(query)
);

}

return data;

}

export function getVisibleSymbolList(){

const data =
getFilteredMarketData();

data.sort(sortData);

return data.map(item=>item.symbol);

}

export function getFirstVisibleSymbol(){

const symbols =
getVisibleSymbolList();

return symbols[0] || null;

}

export function renderList(){

if(
coinListRenderFrozen
){
coinListRenderPending =
true;
return;
}

coinListRenderPending =
false;
renderListImpl();

}

function updateCoinsSymbolHeaderCount(
count
){

const header =
document.querySelector(
"#table-header .col-symbol"
);

if(
!header
){
return;
}

const n =
Number(
count
);

header.textContent =
Number.isFinite(
n
) &&
n >=
0
? `Symbol (${n})`
: "Symbol";

}

function renderListImpl(){

const list =
document.getElementById(
"coins-body"
);

if(
!list
){
return;
}

list.innerHTML = "";

coinElements.clear();

const data =
getFilteredMarketData();

data.sort(sortData);

updateCoinsSymbolHeaderCount(
data.length
);

data.forEach(item=>{

const div =
createCoinRow(item);

coinElements.set(
item.symbol,
div
);

list.appendChild(div);

});

highlightActiveSymbol();

}

export function createCoinRow(item){

const div =
document.createElement("div");

const isIndexLink =
!!item.href;

div.className =
isIndexLink
? "coin coin-index-link"
: "coin";

const showFlags =
!isIndexLink;

const flagCol =
showFlags
? `
<div class="col-flag">

<div class="coin-flag-wrap">
<button type="button" class="flag coin-flag-btn" data-coin-flag-trigger data-symbol="${item.symbol}" title="Выбрать флаг" aria-haspopup="true" aria-expanded="false" aria-pressed="false"></button>
<div class="coin-flag-menu hidden" role="menu">
<button type="button" class="flag coin-flag-pick flag--red" data-flag-group="red" title="Красный" role="menuitem"></button>
<button type="button" class="flag coin-flag-pick flag--green" data-flag-group="green" title="Зелёный" role="menuitem"></button>
<button type="button" class="flag coin-flag-pick flag--gray" data-flag-group="gray" title="Серый" role="menuitem"></button>
<button type="button" class="flag coin-flag-pick flag--blue" data-flag-group="blue" title="Синий (Терминал)" role="menuitem"></button>
</div>
</div>

</div>`
: `<div class="col-flag" aria-hidden="true"></div>`;

div.innerHTML = `
${flagCol}
<div class="coin-symbol" title="${item.indexTitle || item.symbol}">
${item.symbol}
</div>
<div class="coin-change24 col-change">
0.00%
</div>

<div class="coin-change1h col-change">
0.00%
</div>
`;

if(
isIndexLink
){

div.onclick = ()=>{
window.location.href =
item.href;
};

updateCoinRow(
item,
div
);

return div;

}

div.onclick = async e=>{

if(
e.target.closest(".coin-flag-wrap")
){
return;
}

hooks.setCoinsChartSymbol(item.symbol);
await hooks.loadSymbol(item.symbol);

};

const flagWrap =
div.querySelector(".coin-flag-wrap");

const flagTrigger =
flagWrap?.querySelector("[data-coin-flag-trigger]");

const flagMenu =
flagWrap?.querySelector(".coin-flag-menu");

if(flagTrigger){
hooks.updateCoinFlagButton(flagTrigger, item.symbol);
}

flagTrigger?.addEventListener("click", e=>{

e.stopPropagation();

if(
flagTrigger.classList.contains(
"favorite"
)
){
hooks.closeAllCoinFlagMenus(
flagWrap
);
flagMenu?.classList.add(
"hidden"
);
flagTrigger.setAttribute(
"aria-expanded",
"false"
);
hooks.applyCoinFavoriteGroup(
item.symbol,
"clear"
);
syncCoinListFreezeFromFlagMenus();
return;
}

const open =
!flagMenu?.classList.contains("hidden");

hooks.closeAllCoinFlagMenus(flagWrap);

if(open){
flagMenu?.classList.add("hidden");
flagTrigger.setAttribute("aria-expanded", "false");
}else{
flagMenu?.classList.remove("hidden");
flagTrigger.setAttribute("aria-expanded", "true");
}

syncCoinListFreezeFromFlagMenus();

});

flagMenu?.querySelectorAll("[data-flag-group]").forEach(btn=>{

btn.addEventListener("click", e=>{

e.stopPropagation();

flagMenu?.classList.add("hidden");
flagTrigger?.setAttribute("aria-expanded", "false");
syncCoinListFreezeFromFlagMenus();

hooks.applyCoinFavoriteGroup(
item.symbol,
btn.dataset.flagGroup
);

});

});

updateCoinRow(item, div);

return div;

}

export function updateCoinRow(item, element=null){

const div =
element ||
coinElements.get(item.symbol);

if(!div){
return;
}

const change24El =
div.querySelector(".coin-change24");

const change1hEl =
div.querySelector(".coin-change1h");

if(!change24El || !change1hEl){
return;
}

if(item.change24 >= 0){

change24El.classList.add("coin-change-pos");
change24El.classList.remove("coin-change-neg");

}else{

change24El.classList.add("coin-change-neg");
change24El.classList.remove("coin-change-pos");

}

if(item.change1h >= 0){

change1hEl.classList.add("coin-change-pos");
change1hEl.classList.remove("coin-change-neg");

}else{

change1hEl.classList.add("coin-change-neg");
change1hEl.classList.remove("coin-change-pos");

}

change24El.innerText =
`${item.change24.toFixed(2)}%`;

change1hEl.innerText =
`${item.change1h.toFixed(2)}%`;

}

export function applyCoinRowStates(){

coinElements.forEach(
(
el,
symbol
)=>{

el.classList.toggle(
"active",
symbol ===
coinsState().currentSymbol
);

el.classList.toggle(
"has-position",
positionPinEnabled &&
(
!isTradePage ||
isExchangeTradingEnabled()
) &&
hasOpenPosition(
symbol
)
);

}
);

}

export function highlightActiveSymbol(){

applyCoinRowStates();

}

export function compareInnerSort(a, b){

let result = 0;

if(coinsState().innerSortMode === "symbol"){

result =
a.symbol.localeCompare(
b.symbol
);

}else if(coinsState().innerSortMode === "24h"){

result =
a.change24 - b.change24;

}else if(coinsState().innerSortMode === "1h"){

result =
a.change1h - b.change1h;

}

return coinsState().sortAsc
? result
: -result;

}

export function sortData(a,b){

if(
positionPinEnabled
){
const aPos =
hasOpenPosition(
a.symbol
);
const bPos =
hasOpenPosition(
b.symbol
);

if(
aPos &&
!bPos
){
return -1;
}

if(
!aPos &&
bPos
){
return 1;
}

}

const favorites =
coinsState().favorites ||
emptyFavorites();

if(coinsState().flagSortActive){

const ar =
flagSortRank(
getFavoriteGroup(a.symbol, favorites),
coinsState().flagSortAsc
);

const br =
flagSortRank(
getFavoriteGroup(b.symbol, favorites),
coinsState().flagSortAsc
);

if(ar !== br){
return ar - br;
}

}

return compareInnerSort(a, b);

}
