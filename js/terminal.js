const TWELVE_KEY =
"d6b45dcb1abf4b3ebe020038e41864fb";

let currentDataset = "crypto";
let currentTF = "60";
let currentSymbol = "BTCUSDT";

let candles = [];
let marketData = [];

let sortMode = "symbol";
let sortAsc = true;

let favorites =
JSON.parse(localStorage.getItem("favorites") || "[]");

let allBybitSymbols = [];
let newListings = [];

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
   CHART
========================================================= */

const chart =
LightweightCharts.createChart(
document.getElementById("chart"),
{

layout:{
background:{ color:"#0b1220" },
textColor:"#d1d5db"
},

grid:{
vertLines:{ color:"#161b26" },
horzLines:{ color:"#161b26" }
},

rightPriceScale:{
borderColor:"#1f2937",
mode:1
},

timeScale:{
borderColor:"#1f2937",
timeVisible:true,
rightOffset:28
},

crosshair:{
mode:0
}

});

const candleSeries =
chart.addCandlestickSeries({

upColor:"#22c55e",
downColor:"#ef4444",
borderVisible:false,
wickUpColor:"#22c55e",
wickDownColor:"#ef4444"

});

/* =========================================================
   RSI
========================================================= */

const rsiChart =
LightweightCharts.createChart(
document.getElementById("rsi-chart"),
{

layout:{
background:{ color:"transparent" },
textColor:"#797b85"
},

grid:{
vertLines:{ color:"#161b26" },
horzLines:{ color:"#161b26" }
},

rightPriceScale:{
borderColor:"#1f2937"
},

timeScale:{
visible:false
},

crosshair:{
mode:0
}

});

const rsiSeries =
rsiChart.addLineSeries({

color:"#a39cb9",
lineWidth:2

});

[30,50,70].forEach(level=>{

rsiSeries.createPriceLine({

price:level,
color:"#797b85",
lineStyle:
LightweightCharts.LineStyle.Dashed,
lineWidth:1,
axisLabelVisible:true

});

});

/* =========================================================
   RSI
========================================================= */

function calculateRSI(data, period=14){

if(data.length < period+1){
return [];
}

let gains = 0;
let losses = 0;

const result = [];

for(let i=1;i<=period;i++){

const diff =
data[i].close - data[i-1].close;

if(diff >= 0){
gains += diff;
}else{
losses += Math.abs(diff);
}

}

let avgGain = gains / period;
let avgLoss = losses / period;

for(let i=period;i<data.length;i++){

const diff =
data[i].close - data[i-1].close;

const gain =
diff > 0 ? diff : 0;

const loss =
diff < 0 ? Math.abs(diff) : 0;

avgGain =
((avgGain*(period-1))+gain)/period;

avgLoss =
((avgLoss*(period-1))+loss)/period;

const rs =
avgGain / (avgLoss || 1);

const rsi =
100 - (100/(1+rs));

result.push({

time:data[i].time,
value:rsi

});

}

return result;

}

/* =========================================================
   SYMBOLS
========================================================= */

async function loadBybitSymbols(){

const res = await fetch(
"https://api.bybit.com/v5/market/instruments-info?category=linear&limit=1000"
);

const json = await res.json();

const list = json.result.list;

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

marketData = getCurrentSymbols().map(symbol => {

return {

symbol,

change24:
((Math.random()*20)-10),

change1h:
((Math.random()*6)-3)

};

});

}

/* =========================================================
   FAST CRYPTO HISTORY
========================================================= */

async function loadCryptoHistory(symbol){

let all = [];

let end = Date.now();

for(let i=0;i<3;i++){

const url =
`https://api.bybit.com/v5/market/kline?category=linear&symbol=${symbol}&interval=${currentTF}&limit=1000&end=${end}`;

const res = await fetch(url);

const json = await res.json();

const batch =
json.result.list;

if(!batch || !batch.length){
break;
}

all = [...all, ...batch];

end =
Number(batch[batch.length-1][0]) - 1;

}

const unique =
new Map();

all.forEach(k=>{

unique.set(k[0],{

time:Number(k[0])/1000,
open:Number(k[1]),
high:Number(k[2]),
low:Number(k[3]),
close:Number(k[4])

});

});

return Array
.from(unique.values())
.sort((a,b)=>a.time-b.time);

}

/* =========================================================
   TWELVEDATA
========================================================= */

async function loadTwelveData(symbol){

let interval = "1h";

if(currentTF === "1"){
interval = "1min";
}

if(currentTF === "5"){
interval = "5min";
}

if(currentTF === "15"){
interval = "15min";
}

if(currentTF === "60"){
interval = "1h";
}

if(currentTF === "240"){
interval = "4h";
}

if(currentTF === "D"){
interval = "1day";
}

const url =
`https://api.twelvedata.com/time_series?symbol=${encodeURIComponent(symbol)}&interval=${interval}&outputsize=2500&apikey=${TWELVE_KEY}`;

const res = await fetch(url);

const json = await res.json();

if(!json.values){
return [];
}

return json.values.reverse().map(v=>({

time:
Math.floor(new Date(v.datetime).getTime()/1000),

open:Number(v.open),
high:Number(v.high),
low:Number(v.low),
close:Number(v.close)

}));

}

/* =========================================================
   LOAD SYMBOL
========================================================= */

async function loadSymbol(symbol){

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
await loadCryptoHistory(symbol);

}else{

candles =
await loadTwelveData(symbol);

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

renderList();

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

currentDataset = e.target.value;

generateMarketData();

currentSymbol =
getCurrentSymbols()[0];

renderList();

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

let data = [...marketData];

data.sort((a,b)=>{

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

});

data.forEach(item=>{

const div =
document.createElement("div");

div.className = "coin";

if(currentSymbol === item.symbol){
div.classList.add("active");
}

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

<div>
${item.symbol}
</div>

<div class="col-change
${item.change24>=0
? 'green'
: 'red'}">

${item.change24.toFixed(2)}%

</div>

<div class="col-change
${item.change1h>=0
? 'green'
: 'red'}">

${item.change1h.toFixed(2)}%

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

localStorage.setItem(
"favorites",
JSON.stringify(favorites)
);

renderList();

};

list.appendChild(div);

});

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

await loadBybitSymbols();

generateMarketData();

resizeCharts();

renderList();

await loadSymbol("BTCUSDT");

}

init();
