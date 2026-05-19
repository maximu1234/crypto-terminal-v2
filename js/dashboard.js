const dashboard =
document.getElementById("dashboard");

let currentLayout =
Number(localStorage.getItem("dashboard_layout")) || 9;

const defaultSymbols = [

"BTCUSDT",
"ETHUSDT",
"SOLUSDT",

"XRPUSDT",
"BNBUSDT",
"ADAUSDT",

"DOGEUSDT",
"LINKUSDT",
"AVAXUSDT"

];

const widgets = [];

/* =========================================================
   STORAGE
========================================================= */

function saveWidgetState(index, symbol, tf){

const state = {

symbol,
tf

};

localStorage.setItem(
`widget_${index}`,
JSON.stringify(state)
);

}

function loadWidgetState(index){

const raw =
localStorage.getItem(
`widget_${index}`
);

if(!raw){
return null;
}

try{

return JSON.parse(raw);

}catch{

return null;

}

}

/* =========================================================
   CREATE WIDGET
========================================================= */

function createWidget(index){

const saved =
loadWidgetState(index);

const startSymbol =
saved?.symbol ||
defaultSymbols[index] ||
"BTCUSDT";

const startTf =
saved?.tf ||
"15";

const widget =
document.createElement("div");

widget.className = "widget";

widget.innerHTML = `

<div class="widget-header">

<div class="left-controls">

<input
class="symbol-input"
value="${startSymbol}"
/>

<select class="tf-select">

<option value="1" ${startTf==="1"?"selected":""}>1m</option>
<option value="5" ${startTf==="5"?"selected":""}>5m</option>
<option value="15" ${startTf==="15"?"selected":""}>15m</option>
<option value="60" ${startTf==="60"?"selected":""}>1h</option>
<option value="240" ${startTf==="240"?"selected":""}>4h</option>
<option value="D" ${startTf==="D"?"selected":""}>1D</option>

</select>

<button class="open-chart-btn">
↗
</button>

</div>

<div class="price-info">

<div class="price">
...
</div>

<div class="change">
...
</div>

</div>

</div>

<div class="chart"></div>

`;

dashboard.appendChild(widget);

const chartContainer =
widget.querySelector(".chart");

/* =========================================================
   CHART
========================================================= */

const chart =
LightweightCharts.createChart(
chartContainer,
{

layout:{
background:{ color:"#111827" },
textColor:"#9ca3af"
},

grid:{
vertLines:{ color:"#1f2937" },
horzLines:{ color:"#1f2937" }
},

rightPriceScale:{
visible:false
},

timeScale:{
visible:true,
secondsVisible:false,
rightOffset:25
},

crosshair:{
mode:0
},

handleScroll:{
mouseWheel:true,
pressedMouseMove:true,
horzTouchDrag:true,
vertTouchDrag:false
},

handleScale:{
axisPressedMouseMove:true,
mouseWheel:true,
pinch:true
}

});

const series =
chart.addCandlestickSeries({

upColor:"#22c55e",
downColor:"#ef4444",
borderVisible:false,
wickUpColor:"#22c55e",
wickDownColor:"#ef4444"

});

const symbolInput =
widget.querySelector(".symbol-input");

const tfSelect =
widget.querySelector(".tf-select");

const openChartBtn =
widget.querySelector(".open-chart-btn");

const priceEl =
widget.querySelector(".price");

const changeEl =
widget.querySelector(".change");

/* =========================================================
   OPEN BIG CHART
========================================================= */

openChartBtn.onclick = ()=>{

const symbol =
symbolInput.value
.trim()
.toUpperCase();

const tf =
tfSelect.value;

window.location.href =
`coins.html?symbol=${symbol}&tf=${tf}`;

};

/* =========================================================
   LOAD HISTORY
========================================================= */

async function loadHistory(symbol, tf){

let all = [];

let end = Date.now();

for(let i=0;i<6;i++){

const url =
`https://api.bybit.com/v5/market/kline?category=linear&symbol=${symbol}&interval=${tf}&limit=1000&end=${end}`;

const res =
await fetch(url);

const json =
await res.json();

if(
!json.result ||
!json.result.list
){
break;
}

const batch =
json.result.list;

if(!batch.length){
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
   LOAD DATA
========================================================= */

async function loadData(){

const symbol =
symbolInput.value
.trim()
.toUpperCase();

const tf =
tfSelect.value;

/* SAVE STATE */

saveWidgetState(
index,
symbol,
tf
);

try{

const candles =
await loadHistory(symbol, tf);

if(!candles.length){
return;
}

series.setData(candles);

/* =========================================================
   SMART DEFAULT ZOOM
========================================================= */

let visibleBars = 900;

if(tf === "1"){
    visibleBars = 300;
}

if(tf === "5"){
    visibleBars = 500;
}

if(tf === "15"){
    visibleBars = 900;
}

if(tf === "60"){
    visibleBars = 700;
}

if(tf === "240"){
    visibleBars = 500;
}

if(tf === "D"){
    visibleBars = 300;
}

visibleBars = Math.min(
visibleBars,
candles.length
);

chart.timeScale().setVisibleLogicalRange({

from:
candles.length - visibleBars,

to:
candles.length + 25

});

/* =========================================================
   PRICE
========================================================= */

const last =
candles[candles.length - 1];

const first =
candles[
Math.max(
0,
candles.length - visibleBars
)
];

priceEl.innerText =
last.close.toFixed(2);

const change =
(
(last.close - first.close)
/
first.close
)*100;

changeEl.innerText =
change.toFixed(2) + "%";

changeEl.className =
change >= 0
? "change green"
: "change red";

}catch(err){

console.log(err);

}

}

/* =========================================================
   EVENTS
========================================================= */

tfSelect.onchange = loadData;

symbolInput.addEventListener(
"keydown",
e=>{

if(e.key === "Enter"){
loadData();
}

});

/* =========================================================
   RESIZE
========================================================= */

function resize(){

chart.applyOptions({

width:
chartContainer.clientWidth,

height:
chartContainer.clientHeight

});

}

window.addEventListener(
"resize",
resize
);

resize();

loadData();

widgets.push({

widget,
chart,
series,
loadData

});

}

/* =========================================================
   RENDER DASHBOARD
========================================================= */

function renderDashboard(){

dashboard.innerHTML = "";

dashboard.className =
`grid-${currentLayout}`;

/* SAVE LAYOUT */

localStorage.setItem(
"dashboard_layout",
currentLayout
);

widgets.length = 0;

for(let i=0;i<currentLayout;i++){

createWidget(i);

}

/* ACTIVE BUTTON */

document
.querySelectorAll(".layout-btn")
.forEach(btn=>{

btn.classList.remove("active");

if(
Number(btn.dataset.layout)
=== currentLayout
){
btn.classList.add("active");
}

});

}

/* =========================================================
   LAYOUT
========================================================= */

document
.querySelectorAll(".layout-btn")
.forEach(btn=>{

btn.onclick = ()=>{

currentLayout =
Number(btn.dataset.layout);

renderDashboard();

};

});

/* =========================================================
   START
========================================================= */

renderDashboard();
