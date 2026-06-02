import {
coinsState,
marketMap,
coinElements,
stockSymbols,
commoditySymbols,
forexSymbols
} from "./coins-state.js";

import {
connectKlineStream
} from "../ws.js?v=15";

import {
connectTickerStream,
fetchTickersInto
} from "../tickers.js?v=21";

import {
createTickerUiBatcher
} from "../ticker-update-batch.js?v=1";

import {
processAlertCandle
} from "../alert-monitor.js?v=64";

import {
getFavoriteGroup,
flagSortRank,
emptyFavorites
} from "../favorites.js?v=1";

const hooks = {};

export function setCoinsTableHooks(next){

Object.assign(
hooks,
next
);

}

export function getCurrentSymbols(){

if(coinsState().currentDataset === "crypto"){
return coinsState().allBybitSymbols;
}

if(coinsState().currentDataset === "new"){
return coinsState().newListings;
}

if(coinsState().currentDataset === "stocks"){
return stockSymbols;
}

if(coinsState().currentDataset === "commodities"){
return commoditySymbols;
}

return forexSymbols;

}

export function generateMarketData(){

coinsState().marketData = [];

marketMap.clear();

getCurrentSymbols().forEach(symbol=>{

const item = {

symbol,

price:0,

change24:0,

change1h:0

};

coinsState().marketData.push(item);

marketMap.set(symbol,item);

});

}

/*
  После обновления % рынка список должен перестраиваться, иначе
  при сохранённой сортировке по 24h/1h все строки с нулём % после
  перезагрузки выглядят «несохранённой» сортировкой.
*/
let resortPriceColsTimer =
null;

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
coinsState().currentDataset !== "crypto" &&
coinsState().currentDataset !== "new"
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
coinsState().currentDataset !== "crypto" &&
coinsState().currentDataset !== "new"
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

const last =
coinsState().candles[coinsState().candles.length - 1];

if(candle.time === last.time){

coinsState().candles[coinsState().candles.length - 1] =
candle;

}else if(candle.time > last.time){

coinsState().candles.push(candle);

if(coinsState().candles.length > 4000){
coinsState().candles.shift();
}

}

coinsState().candleSeries.update(candle);

hooks.rebuildRsiFromCandles();

processAlertCandle(
streamSymbol,
candle,
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

div.className = "coin";

div.innerHTML = `

<div class="col-flag">

<div class="coin-flag-wrap">
<button type="button" class="flag coin-flag-btn" data-coin-flag-trigger data-symbol="${item.symbol}" title="Выбрать флаг" aria-haspopup="true" aria-expanded="false" aria-pressed="false"></button>
<div class="coin-flag-menu hidden" role="menu">
<button type="button" class="flag coin-flag-pick flag--red" data-flag-group="red" title="Красный" role="menuitem"></button>
<button type="button" class="flag coin-flag-pick flag--green" data-flag-group="green" title="Зелёный" role="menuitem"></button>
<button type="button" class="flag coin-flag-pick flag--gray" data-flag-group="gray" title="Серый" role="menuitem"></button>
<button type="button" class="flag coin-flag-pick coin-flag-clear" data-flag-group="clear" title="Снять флаг" role="menuitem"></button>
</div>
</div>

</div>

<div class="coin-symbol">
${item.symbol}
</div>

<div class="coin-change24 col-change">
0.00%
</div>

<div class="coin-change1h col-change">
0.00%
</div>

`;

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

});

flagMenu?.querySelectorAll("[data-flag-group]").forEach(btn=>{

btn.addEventListener("click", e=>{

e.stopPropagation();

hooks.applyCoinFavoriteGroup(
item.symbol,
btn.dataset.flagGroup
);

flagMenu?.classList.add("hidden");
flagTrigger?.setAttribute("aria-expanded", "false");

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

change24El.classList.add("green");
change24El.classList.remove("red");

}else{

change24El.classList.add("red");
change24El.classList.remove("green");

}

if(item.change1h >= 0){

change1hEl.classList.add("green");
change1hEl.classList.remove("red");

}else{

change1hEl.classList.add("red");
change1hEl.classList.remove("green");

}

change24El.innerText =
`${item.change24.toFixed(2)}%`;

change1hEl.innerText =
`${item.change1h.toFixed(2)}%`;

}

export function highlightActiveSymbol(){

coinElements.forEach((el,symbol)=>{

if(symbol === coinsState().currentSymbol){

el.classList.add("active");

}else{

el.classList.remove("active");

}

});

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
