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
createRSIChart
} from "./chart.js";

import {
connectKlineStream,
disconnectKlineStream
} from "./ws.js";

import {
connectTickerStream
} from "./tickers.js";

let currentDataset = "crypto";
let currentTF = "60";
let currentSymbol = "BTCUSDT";

let candles = [];
let marketData = [];

const marketMap =
new Map();

let sortMode = "symbol";
let sortAsc = true;

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
   LOAD SYMBOL
========================================================= */

async function loadSymbol(symbol){

disconnectKlineStream();

currentSymbol = symbol;

document.getElementById(
"current-symbol"
).innerText =
(currentDataset === "crypto" ||
currentDataset === "new")
? symbol + ".P"
: symbol;

if(
currentDataset === "crypto" ||
currentDataset === "new"
){

candles =
await loadBybitHistory(
symbol,
currentTF,
3
);

}else{

candles =
await loadTwelveData(
symbol,
currentTF
);

}

candleSeries.setData(candles);

rsiSeries.setData(
calculateRSI(candles)
);

chart.timeScale().setVisibleLogicalRange({

from:
candles.length - 140,

to:
candles.length + 28

});

highlightActiveSymbol();

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

generateMarketData();

renderList();

currentSymbol =
getCurrentSymbols()[0];

await loadSymbol(currentSymbol);

});

/* =========================================================
   TABLE
========================================================= */

function renderList(){

const list =
document.getElementById(
"coins-body"
);

list.innerHTML = "";

coinElements.clear();

let data = [...marketData];

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

/* =========================================================
   COLORS
========================================================= */

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

/* =========================================================
   VALUES
========================================================= */

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

document.addEventListener(
"keydown",
async e=>{

const symbols =
marketData.map(x=>x.symbol);

let index =
symbols.indexOf(currentSymbol);

if(
e.code === "ArrowDown" ||
e.code === "Space"
){

e.preventDefault();

index++;

if(index >= symbols.length){
index = 0;
}

await loadSymbol(symbols[index]);

}

if(e.code === "ArrowUp"){

e.preventDefault();

index--;

if(index < 0){
index = symbols.length - 1;
}

await loadSymbol(symbols[index]);

}

});

/* =========================================================
   START
========================================================= */

async function init(){

await initSymbols();

generateMarketData();

resizeCharts();

renderList();

startTickerStream();

await loadSymbol("BTCUSDT");

}

init();
