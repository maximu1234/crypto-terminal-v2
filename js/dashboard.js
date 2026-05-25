import {
saveWidgetState,
loadWidgetState,
saveLayout,
loadLayout
} from "./storage.js";

import {
loadBybitHistory
} from "./api.js";

import {
createCandlestickChart,
applyChartPriceFormat,
applyDashboardZoom
} from "./chart.js";

import {
initDrawings
} from "./drawings.js?v=111";

import {
subscribeKline
} from "./ws.js";

import {
getWidgetToolbarHtml,
getWidgetChartUiHtml,
initWidgetDrawToolsDropdown,
wireWidgetDrawToolMenu,
closeAllWidgetDrawToolsMenus,
resetWidgetDrawToolsMenus
} from "./dashboard-draw-ui.js?v=5";

import {
preloadTradingSymbols,
attachSymbolAutocomplete
} from "./symbol-autocomplete.js";

import {
loadLightweightCharts
} from "./charts-lib-boot.js";

const dashboard =
document.getElementById("dashboard");

let currentLayout =
loadLayout();

let activeWidgetIndex = 0;

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

function destroyAllWidgets(){

widgets.forEach(w=>{

w.unsubKline?.();
w.drawingTools?.destroy();
w.chart?.remove();
w.resizeObserver?.disconnect();

});

widgets.length = 0;
resetWidgetDrawToolsMenus();
dashboard.innerHTML = "";

}

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
widget.dataset.index = String(index);

widget.innerHTML = `

<div class="widget-header">

<div class="widget-header-row">

<div class="widget-header-left">

<div class="left-controls">

<input class="symbol-input" value="${startSymbol}" spellcheck="false" autocomplete="off"/>

<select class="tf-select">
<option value="1" ${startTf==="1"?"selected":""}>1m</option>
<option value="5" ${startTf==="5"?"selected":""}>5m</option>
<option value="15" ${startTf==="15"?"selected":""}>15m</option>
<option value="60" ${startTf==="60"?"selected":""}>1h</option>
<option value="240" ${startTf==="240"?"selected":""}>4h</option>
<option value="D" ${startTf==="D"?"selected":""}>1D</option>
</select>

</div>

${getWidgetToolbarHtml()}

</div>

<div class="widget-header-right">

<div class="price-info">
<div class="price">—</div>
<div class="change">—</div>
</div>

<button type="button" class="open-chart-btn" title="Открыть в Монетах">↗</button>

</div>

</div>

</div>

<div class="widget-chart-wrap chart-wrap">
<div class="chart"></div>
${getWidgetChartUiHtml()}
</div>

`;

dashboard.appendChild(widget);

const chartWrap =
widget.querySelector(".widget-chart-wrap");

const chartContainer =
widget.querySelector(".chart");

const toolsRoot =
widget.querySelector(
".widget-draw-tools"
);

const {
chart,
series
} =
createCandlestickChart(chartContainer);

let candles = [];

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

const loadSeq = { id: 0 };

function getSymbol(){
return symbolInput.value.trim().toUpperCase();
}

function getTf(){
return tfSelect.value;
}

let drawingTools = null;

try{

drawingTools = initDrawings({

chart,
series,
wrapEl: chartWrap,
uiRoot: chartWrap,
toolsRoot,
getSymbol,
getTf,
getCandles: ()=> candles,
isActive: ()=> activeWidgetIndex === index,
barPosKey: `draw_bar_dashboard_${index}`

});

}catch(err){

console.error("Widget drawings init:", err);

}

initWidgetDrawToolsDropdown(
toolsRoot
);

wireWidgetDrawToolMenu(
toolsRoot,
{
pickTool:(
name
)=>{
drawingTools?.pickDrawTool?.(
name
);
},
onClearAll:()=>{
drawingTools?.clearAllDrawings?.();
},
onActivate:setActive
}
);

const entry = {
index,
widget,
chart,
series,
chartWrap,
drawingTools,
loadData,
candlesRef: ()=> candles,
setCandles: data=>{ candles = data; },
unsubKline: null
};

function setActive(){

activeWidgetIndex = index;

closeAllWidgetDrawToolsMenus();

dashboard.querySelectorAll(".widget").forEach(el=>{
el.classList.toggle(
"widget-active",
Number(el.dataset.index) === index
);
});

}

widget.addEventListener("pointerdown", setActive);

openChartBtn.onclick = e=>{

e.stopPropagation();

window.location.href =
`coins.html?symbol=${encodeURIComponent(getSymbol())}&tf=${encodeURIComponent(getTf())}`;

};

async function loadData(){

const symbol = getSymbol();
const tf = getTf();
const seq = ++loadSeq.id;

saveWidgetState(index, symbol, tf);

try{

const data =
await loadBybitHistory(
symbol,
tf,
6,
{ parallel: true }
);

if(seq !== loadSeq.id){
return;
}

candles = data;
entry.setCandles(data);

entry.unsubKline?.();

if(!candles.length){
return;
}

series.setData(candles);

entry.unsubKline =
subscribeKline(
symbol,
tf,
candle=>{

if(seq !== loadSeq.id){
return;
}

if(!candles.length){
return;
}

const last =
candles[candles.length - 1];

if(candle.time === last.time){

candles[candles.length - 1] = candle;

}else if(candle.time > last.time){

candles.push(candle);

if(candles.length > 6000){
candles.shift();
}

}else{
return;
}

series.update(candle);

applyChartPriceFormat(
series,
candle.close
);

priceEl.innerText =
candle.close.toFixed(2);

}
);

applyChartPriceFormat(
series,
candles[candles.length - 1].close
);

applyDashboardZoom(chart, candles, tf);

resizeChart();

drawingTools?.onSymbolChange();
drawingTools?.resize();
drawingTools?.scheduleRedraw?.();

const last =
candles[candles.length - 1];

const first =
candles[
Math.max(
0,
candles.length -
Math.min(
candles.length,
tf === "1" ? 300 :
tf === "5" ? 500 :
tf === "15" ? 900 :
tf === "60" ? 700 :
tf === "240" ? 500 : 300
)
)
];

priceEl.innerText =
last.close.toFixed(2);

const change =
((last.close - first.close) / first.close) * 100;

changeEl.innerText =
`${change >= 0 ? "+" : ""}${change.toFixed(2)}%`;

changeEl.className =
`change ${change >= 0 ? "green" : "red"}`;

}catch(err){

console.error("Dashboard widget load:", err);

}

}

tfSelect.onchange = loadData;

attachSymbolAutocomplete(
symbolInput,
{
onCommit:()=>{
loadData();
}
}
);

function resizeChart(){

const w =
chartContainer.clientWidth;

const h =
chartContainer.clientHeight;

if(w < 2 || h < 2){
return;
}

chart.applyOptions({ width: w, height: h });
drawingTools?.resize();

}

const resizeObserver =
new ResizeObserver(resizeChart);

resizeObserver.observe(chartWrap);
entry.resizeObserver = resizeObserver;

requestAnimationFrame(resizeChart);

loadData();

widgets.push(entry);

if(index === activeWidgetIndex){
setActive();
}

}

function renderDashboard(){

destroyAllWidgets();

dashboard.className =
`grid-${currentLayout}`;

saveLayout(currentLayout);

for(let i = 0; i < currentLayout; i++){
createWidget(i);
}

document.querySelectorAll(".layout-btn").forEach(btn=>{

btn.classList.toggle(
"active",
Number(btn.dataset.layout) === currentLayout
);

});

}

document.querySelectorAll(".layout-btn").forEach(btn=>{

btn.onclick = ()=>{

currentLayout =
Number(btn.dataset.layout);

renderDashboard();

};

});

loadLightweightCharts().then(()=>{

preloadTradingSymbols();
renderDashboard();

}).catch(err=>{

console.error("Dashboard chart lib:", err);

});
