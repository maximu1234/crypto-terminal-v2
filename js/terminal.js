import {
loadBybitHistory,
loadBybitSymbols,
loadTwelveData
} from "./api.js";

import {
calculateRSI
} from "./indicators.js";

import {
saveFavorites,
loadFavorites
} from "./storage.js";

import {
createCandlestickChart,
createRSIChart,
applyChartPriceFormat
} from "./chart.js";

import {
connectKlineStream,
disconnectKlineStream
} from "./ws.js";

import {
connectTickerStream
} from "./tickers.js";

import {
initDrawings
} from "./drawings.js";

let currentDataset = "crypto";
let currentTF = "60";
let currentSymbol = "BTCUSDT";

let candles = [];
let symbolLoadSeq = 0;
let marketData = [];

const marketMap =
new Map();

let sortMode = "symbol";
let sortAsc = true;

let searchQuery = "";

let favorites =
loadFavorites();

let allBybitSymbols = [];
let newListings = [];

const coinElements =
new Map();

/* =========================================================
   SYMBOLS
========================================================= */

const stockSymbols = [
"AAPL","TSLA","NVDA","MSFT","AMZN",
"META","GOOGL","NFLX","AMD","COIN","PLTR"
];

const commoditySymbols = [
"XAU/USD",
"XAG/USD",
"BRENT"
];

const forexSymbols = [
"EUR/USD",
"GBP/USD",
"USD/JPY",
"AUD/USD"
];

/* =========================================================
   CHARTS
========================================================= */

const mainChart =
createCandlestickChart(
document.getElementById("chart")
);

const chart =
mainChart.chart;

const candleSeries =
mainChart.series;

const rsi =
createRSIChart(
document.getElementById("rsi-chart")
);

const rsiChart =
rsi.chart;

const rsiSeries =
rsi.series;

let drawingTools = null;

try{

drawingTools = initDrawings({

chart,
series: candleSeries,
wrapEl: document.getElementById("chart-wrap"),
uiRoot: document.getElementById("chart-wrap"),
toolsRoot: document.getElementById("draw-toolbar"),
getSymbol: ()=> currentSymbol,
getTf: ()=> currentTF,
getCandles: ()=> candles,
isActive: ()=>true

});

}catch(err){

console.error("Drawings init failed:", err);

}

/* =========================================================
   SYMBOLS
========================================================= */

async function initSymbols(){

const list =
await loadBybitSymbols();

allBybitSymbols = list
.filter(x => x.status === "Trading")
.map(x => x.symbol);

const weekAgo =
Date.now() - (7*24*60*60*1000);

newListings = list
.filter(x => {

if(!x.launchTime) return false;

return Number(x.launchTime) > weekAgo;

})
.map(x => x.symbol);

}

function getCurrentSymbols(){

if(currentDataset === "crypto"){
return allBybitSymbols;
}

if(currentDataset === "new"){
return newListings;
}

if(currentDataset === "stocks"){
return stockSymbols;
}

if(currentDataset === "commodities"){
return commoditySymbols;
}

return forexSymbols;

}

/* =========================================================
   MARKET DATA
========================================================= */

function generateMarketData(){

marketData = [];

marketMap.clear();

getCurrentSymbols().forEach(symbol=>{

const item = {

symbol,

price:0,

change24:0,

change1h:0

};

marketData.push(item);

marketMap.set(symbol,item);

});

}

/* =========================================================
   REALTIME TICKERS
========================================================= */

function startTickerStream(){

connectTickerStream(tick=>{

const item =
marketMap.get(tick.symbol);

if(!item){
return;
}

item.price =
tick.price;

item.change24 =
tick.change24;

item.change1h =
tick.change1h;

updateCoinRow(item);

});

}

/* =========================================================
   REALTIME
========================================================= */

function startRealtime(){

if(
currentDataset !== "crypto" &&
currentDataset !== "new"
){
return;
}

connectKlineStream({

symbol:currentSymbol,
tf:currentTF,

onCandle:candle=>{

if(!candles.length){
return;
}

const last =
candles[candles.length - 1];

if(candle.time === last.time){

candles[candles.length - 1] =
candle;

}else if(candle.time > last.time){

candles.push(candle);

if(candles.length > 4000){
candles.shift();
}

}

candleSeries.update(candle);

rsiSeries.setData(
calculateRSI(candles)
);

}

});

}

/* =========================================================
   DEFAULT ZOOM
========================================================= */

function applyDefaultZoom(){

if(!candles.length){
return;
}

chart.timeScale().resetTimeScale();

let visibleBars = candles.length;

/* =========================================================
   TF LIMITS
========================================================= */

if(currentTF === "1"){
visibleBars = Math.min(candles.length, 1500);
}

if(currentTF === "5"){
visibleBars = Math.min(candles.length, 2000);
}

if(currentTF === "15"){
visibleBars = Math.min(candles.length, 2500);
}

if(currentTF === "60"){
visibleBars = Math.min(candles.length, 3000);
}

if(currentTF === "240"){
visibleBars = Math.min(candles.length, 2000);
}

if(currentTF === "D"){
visibleBars = Math.min(candles.length, 1000);
}

const lastIndex =
candles.length - 1;

const rightMargin =
Math.max(
48,
Math.round(visibleBars * 0.1)
);

chart.timeScale().applyOptions({
rightOffset:12,
fixRightEdge:false
});

chart.timeScale().setVisibleLogicalRange({

from: Math.max(0, lastIndex - visibleBars + 1),

to: lastIndex + rightMargin

});

}

/* =========================================================
   LOAD SYMBOL
========================================================= */

async function loadSymbol(symbol){

const loadSeq = ++symbolLoadSeq;

disconnectKlineStream();

currentSymbol = symbol;

document.getElementById(
"current-symbol"
).innerText =
(currentDataset === "crypto" ||
currentDataset === "new")
? symbol + ".P"
: symbol;

let nextCandles = [];

if(
currentDataset === "crypto" ||
currentDataset === "new"
){

nextCandles =
await loadBybitHistory(
symbol,
currentTF
);

}else{

nextCandles =
await loadTwelveData(
symbol,
currentTF
);

}

if(loadSeq !== symbolLoadSeq){
return;
}

candles = nextCandles;

candleSeries.setData(candles);

const refPrice =
candles[candles.length - 1]?.close ?? 1;

applyChartPriceFormat(
candleSeries,
refPrice
);

rsiSeries.setData(
calculateRSI(candles)
);

/* =========================================================
   APPLY ZOOM
========================================================= */

applyDefaultZoom();

drawingTools?.onSymbolChange();

highlightActiveSymbol();

scrollActiveCoinIntoView();

startRealtime();

}

/* =========================================================
   RESIZE
========================================================= */

function resizeCharts(){

chart.applyOptions({

width:
document.getElementById(
"chart-wrap"
).clientWidth,

height:
document.getElementById(
"chart-wrap"
).clientHeight

});

drawingTools?.resize();

rsiChart.applyOptions({

width:
document.getElementById(
"rsi-chart"
).clientWidth,

height:
document.getElementById(
"rsi-chart"
).clientHeight

});

}

window.addEventListener(
"resize",
resizeCharts
);

/* =========================================================
   SYNC
========================================================= */

chart.timeScale()
.subscribeVisibleLogicalRangeChange(range=>{

if(range){

rsiChart.timeScale()
.setVisibleLogicalRange(range);

}

});

/* =========================================================
   TF
========================================================= */

document
.querySelectorAll(".tf-btn")
.forEach(btn=>{

btn.onclick = async ()=>{

document
.querySelectorAll(".tf-btn")
.forEach(b=>
b.classList.remove("active")
);

btn.classList.add("active");

currentTF = btn.dataset.tf;

await loadSymbol(currentSymbol);

};

});

/* =========================================================
   FILTER
========================================================= */

document
.getElementById("market-filter")
.addEventListener("change", async e=>{

disconnectKlineStream();

currentDataset = e.target.value;

searchQuery = "";

const searchInput =
document.getElementById("coin-search");

if(searchInput){
searchInput.value = "";
}

generateMarketData();

renderList();

currentSymbol =
getCurrentSymbols()[0];

await loadSymbol(currentSymbol);

});

/* =========================================================
   TABLE
========================================================= */

function getFilteredMarketData(){

let data = [...marketData];

const query =
searchQuery.trim().toUpperCase();

if(query){

data = data.filter(item=>
item.symbol.includes(query)
);

}

return data;

}

function getVisibleSymbolList(){

const data =
getFilteredMarketData();

data.sort(sortData);

return data.map(item=>item.symbol);

}

function renderList(){

const list =
document.getElementById(
"coins-body"
);

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

function scrollActiveCoinIntoView(){

const el =
coinElements.get(currentSymbol);

if(!el){
return;
}

el.scrollIntoView({
block:"nearest",
behavior:"smooth"
});

}

function createCoinRow(item){

const div =
document.createElement("div");

div.className = "coin";

const isFavorite =
favorites.includes(item.symbol);

div.innerHTML = `

<div class="col-flag">

<div
class="flag
${isFavorite ? 'favorite' : ''}"
data-fav="${item.symbol}"
></div>

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

if(e.target.dataset.fav){
return;
}

await loadSymbol(item.symbol);

};

const favBtn =
div.querySelector("[data-fav]");

favBtn.onclick = e=>{

e.stopPropagation();

if(
favorites.includes(item.symbol)
){

favorites =
favorites.filter(
s => s !== item.symbol
);

}else{

favorites.push(item.symbol);
}

saveFavorites(
favorites
);

favBtn.classList.toggle(
"favorite"
);

};

updateCoinRow(item, div);

return div;

}

function updateCoinRow(item, element=null){

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

function highlightActiveSymbol(){

coinElements.forEach((el,symbol)=>{

if(symbol === currentSymbol){

el.classList.add("active");

}else{

el.classList.remove("active");

}

});

}

function sortData(a,b){

let result = 0;

if(sortMode === "favorites"){

const af =
favorites.includes(a.symbol)
? 1 : 0;

const bf =
favorites.includes(b.symbol)
? 1 : 0;

result = af - bf;

}

else if(sortMode === "symbol"){

result =
a.symbol.localeCompare(
b.symbol
);

}

else if(sortMode === "24h"){

result =
a.change24 - b.change24;

}

else if(sortMode === "1h"){

result =
a.change1h - b.change1h;

}

return sortAsc
? result
: -result;

}

/* =========================================================
   SORT
========================================================= */

document
.querySelectorAll(".sortable")
.forEach(el=>{

el.onclick = ()=>{

const mode =
el.dataset.sort;

if(sortMode === mode){

sortAsc = !sortAsc;

}else{

sortMode = mode;
sortAsc = false;
}

renderList();

};

});

/* =========================================================
   KEYBOARD NAVIGATION
========================================================= */

document
.getElementById("coin-search")
?.addEventListener("input", e=>{

searchQuery = e.target.value;

renderList();

});

function shouldIgnoreListKeyNav(e){

const target =
e.target;

if(!target){
return false;
}

const tag =
target.tagName?.toLowerCase();

if(
tag === "input" ||
tag === "textarea" ||
tag === "select"
){
return true;
}

if(target.isContentEditable){
return true;
}

return false;

}

document.addEventListener(
"keydown",
async e=>{

if(shouldIgnoreListKeyNav(e)){
return;
}

const symbols =
getVisibleSymbolList();

if(!symbols.length){
return;
}

const goDown =
e.code === "ArrowDown" ||
e.code === "Space" ||
e.key === " ";

const goUp =
e.code === "ArrowUp";

if(!goDown && !goUp){
return;
}

e.preventDefault();

let index =
symbols.indexOf(currentSymbol);

if(index < 0){
index = goDown ? -1 : 0;
}

if(goDown){
index = (index + 1) % symbols.length;
}else{
index = (index - 1 + symbols.length) % symbols.length;
}

const next =
symbols[index];

if(
!next ||
next === currentSymbol
){
return;
}

await loadSymbol(next);

});

/* =========================================================
   URL PARAMS
========================================================= */

function readUrlParams(){

const params =
new URLSearchParams(window.location.search);

const symbol =
params.get("symbol");

const tf =
params.get("tf");

if(symbol){
currentSymbol = symbol.trim().toUpperCase();
currentDataset = "crypto";
}

if(tf){
currentTF = tf;
}

}

function applyUrlTimeframe(){

document
.querySelectorAll(".tf-btn")
.forEach(btn=>{

btn.classList.toggle(
"active",
btn.dataset.tf === currentTF
);

});

}

/* =========================================================
   START
========================================================= */

async function init(){

readUrlParams();

await initSymbols();

if(
currentSymbol &&
!getCurrentSymbols().includes(currentSymbol)
){
currentSymbol = getCurrentSymbols()[0] || "BTCUSDT";
}

const marketFilter =
document.getElementById("market-filter");

if(marketFilter){
marketFilter.value = currentDataset;
}

applyUrlTimeframe();

generateMarketData();

resizeCharts();

renderList();

startTickerStream();

await loadSymbol(
currentSymbol || "BTCUSDT"
);

}

init();
