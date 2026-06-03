import {
saveWidgetState,
loadWidgetState,
saveLayout,
loadLayout
} from "./storage.js";

import {
loadBybitHistory
} from "./api.js?v=27";

import {
isLocalDevHost
} from "./bybit-fetch.js?v=13";

import {
applyChartPriceFormat,
applyDashboardZoom
} from "./chart-import.js?v=13";

import {
createDashboardChartWidget
} from "./chart-widget-host.js?v=2";

import {
mountWidgetTabletChart
} from "./tablet-widget-chart.js?v=1";

import {
markTabletChartBody
} from "./chart-import.js?v=13";

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
} from "./dashboard-draw-ui.js?v=14";

import {
ensureDrawToolsVisible
} from "./draw-tools-visible.js?v=1";

import {
preloadTradingSymbols,
attachSymbolAutocomplete
} from "./symbol-autocomplete.js";

import {
loadLightweightCharts
} from "./charts-lib-boot.js?v=3";

import {
initTerminalPageUi,
isTerminalMobile,
TERMINAL_MOBILE_MQ
} from "./terminal-page.js?v=3";

import {
getWidgetFlagHtml,
wireWidgetFlagUi,
updateWidgetFlagUi,
bindWidgetFlagGlobalListeners
} from "./widget-favorite-flag.js?v=2";

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

/** ~3×1000 свечей — хватает для zoom до 900 баров + прокрутка; меньше нагрузки на proxy. */
const DASHBOARD_HISTORY_BATCHES =
3;

/** Смещение старта загрузки виджетов — не шторм из 9×N запросов сразу. */
const DASHBOARD_STAGGER_MS =
isLocalDevHost()
? 280
: 150;

/** Одновременно не больше N историй Bybit (остальные ждут слот). */
const DASHBOARD_MAX_CONCURRENT_LOADS =
isLocalDevHost()
? 2
: 4;

const DASHBOARD_BATCH_GAP_MS =
50;

let dashboardLoadInflight =
0;

const dashboardLoadWaiters =
[];

function sleep(
ms
){

return new Promise(
resolve=>{
setTimeout(
resolve,
ms
);
}
);

}

function acquireDashboardLoadSlot(){

if(
dashboardLoadInflight <
DASHBOARD_MAX_CONCURRENT_LOADS
){
dashboardLoadInflight++;
return Promise.resolve();
}

return new Promise(
resolve=>{
dashboardLoadWaiters.push(
resolve
);
}
).then(
()=>{
dashboardLoadInflight++;
}
);

}

function releaseDashboardLoadSlot(){

dashboardLoadInflight =
Math.max(
0,
dashboardLoadInflight -
1
);

const next =
dashboardLoadWaiters.shift();

if(
next
){
next();
}

}

function reloadAllDashboardWidgets(){

widgets.forEach(
w=>{
w.loadData?.();
}
);

}

function destroyAllWidgets(){

widgets.forEach(w=>{

w.unsubKline?.();
w.tabletGestures?.dispose?.();
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

${getWidgetFlagHtml()}

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

let candles = [];

function getSymbol(){
return symbolInput.value.trim().toUpperCase();
}

function getTf(){
return tfSelect.value;
}

let cancelTabletPanGesture =
()=>{};

const {
chart,
series,
drawingTools
} =
createDashboardChartWidget({

chartContainer,
chartWrap,
toolsRoot,
getSymbol,
getTf,
getCandles: ()=> candles,
isActive: ()=>
activeWidgetIndex ===
index,
barPosKey: `draw_bar_dashboard_${index}`,
abortTabletChartGesture:()=>{
cancelTabletPanGesture?.();
}

});

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
onClearAll:()=>
drawingTools?.clearAllDrawings?.() ??
false,
onActivate:setActive
}
);

wireWidgetFlagUi(
widget,
getSymbol
);

const entry = {
index,
widget,
chart,
series,
chartWrap,
drawingTools,
loadData,
getSymbol,
candlesRef: ()=> candles,
setCandles: data=>{ candles = data; },
unsubKline: null,
tabletGestures: null
};

void mountWidgetTabletChart({
chart,
series,
chartEl: chartContainer,
chartWrap,
getDrawingTools: ()=> drawingTools,
isWidgetActive: ()=>
activeWidgetIndex ===
index
}).then(
ctrl=>{
cancelTabletPanGesture =
ctrl.cancelCurrentGesture;
entry.tabletGestures =
ctrl;
}
).catch(
err=>{
console.warn(
"Widget tablet gestures:",
err
);
}
);

function setActive(
e
){

activeWidgetIndex = index;

const keepDrawMenuOpen =
e?.target?.closest?.(
".widget-draw-tools"
);

if(
!keepDrawMenuOpen
){
closeAllWidgetDrawToolsMenus();
}

dashboard.querySelectorAll(".widget").forEach(el=>{
el.classList.toggle(
"widget-active",
Number(el.dataset.index) === index
);
});

}

widget.addEventListener(
"pointerdown",
setActive
);

openChartBtn.onclick = e=>{

e.stopPropagation();

window.location.href =
`coins.html?symbol=${encodeURIComponent(getSymbol())}&tf=${encodeURIComponent(getTf())}`;

};

async function loadData(){

const symbol = getSymbol();
const tf = getTf();
const seq = ++loadSeq.id;

saveWidgetState(
index,
symbol,
tf
);

await sleep(
index *
DASHBOARD_STAGGER_MS
);

if(
seq !== loadSeq.id
){
return;
}

await acquireDashboardLoadSlot();

let loadSlotHeld =
true;

if(
seq !== loadSeq.id
){
releaseDashboardLoadSlot();
loadSlotHeld =
false;
return;
}

try{

const data =
await loadBybitHistory(
symbol,
tf,
DASHBOARD_HISTORY_BATCHES,
{
parallel: true,
batchGapMs: DASHBOARD_BATCH_GAP_MS
}
);

if(
seq !== loadSeq.id
){
return;
}

candles = data;
entry.setCandles(
data
);

entry.unsubKline?.();

if(
!candles.length
){

widget.classList.add(
"widget-chart-empty"
);

void import("./bybit-network-ui.js?v=2").then(
m=>{
m.showBybitNetworkIssue(
new Error(
"История свечей Bybit пуста"
)
);
}
);

return;

}

widget.classList.remove(
"widget-chart-empty"
);

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

updateWidgetFlagUi(
widget,
symbol
);

}catch(
err
){

if(
seq === loadSeq.id
){
widget.classList.add(
"widget-chart-empty"
);
console.error(
"Dashboard widget load:",
err
);
}

}finally{

if(
loadSlotHeld
){
releaseDashboardLoadSlot();
}

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

function dashboardWidgetCount(){

return isTerminalMobile()
? 2
: currentLayout;

}

function dashboardGridClass(){

return isTerminalMobile()
? "grid-mobile-2"
: `grid-${currentLayout}`;

}

function syncLayoutButtons(){

if(isTerminalMobile()){
return;
}

document.querySelectorAll(".layout-btn").forEach(btn=>{

btn.classList.toggle(
"active",
Number(btn.dataset.layout) === currentLayout
);

});

}

function renderDashboard(){

destroyAllWidgets();

dashboard.className =
dashboardGridClass();

const count =
dashboardWidgetCount();

if(!isTerminalMobile()){
saveLayout(currentLayout);
}

for(
let i = 0;
i < count;
i++
){
try{
createWidget(i);
}catch(
err
){
console.error(
"Dashboard widget create:",
err
);
}
}

syncLayoutButtons();

}

document.querySelectorAll(".layout-btn").forEach(btn=>{

btn.onclick = ()=>{

if(isTerminalMobile()){
return;
}

currentLayout =
Number(btn.dataset.layout);

renderDashboard();

};

});

const onTerminalMobileMqChange =
()=>{
renderDashboard();
};

if(
typeof TERMINAL_MOBILE_MQ.addEventListener ===
"function"
){
TERMINAL_MOBILE_MQ.addEventListener(
"change",
onTerminalMobileMqChange
);
}else{
TERMINAL_MOBILE_MQ.addListener(
onTerminalMobileMqChange
);
}

const chartsReady =
typeof LightweightCharts !==
"undefined"
? Promise.resolve()
: loadLightweightCharts();

bindWidgetFlagGlobalListeners(
()=>{

widgets.forEach(
w=>{
updateWidgetFlagUi(
w.widget,
w.getSymbol?.() ||
""
);
}
);

}
);

chartsReady.then(()=>{

markTabletChartBody();
window.addEventListener(
"resize",
markTabletChartBody
);

initTerminalPageUi();
preloadTradingSymbols();
renderDashboard();
ensureDrawToolsVisible();
window.dispatchEvent(
new CustomEvent(
"draw-tools-access-changed"
)
);

}).catch(err=>{

console.error("Dashboard chart lib:", err);

});

window.addEventListener(
"bybit-network-retry",
reloadAllDashboardWidgets
);
