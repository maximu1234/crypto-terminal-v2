import {
saveWidgetStateBySymbol,
loadWidgetStateBySymbol
} from "./storage.js?v=13";

import {
getTerminalBlueSymbols
} from "./favorites.js?v=2";

import {
loadBybitHistory
} from "./api.js?v=27";

import {
isLocalDevHost
} from "./bybit-fetch.js?v=17";

import {
applyChartPriceFormat,
applyDashboardZoom,
markTabletChartBody,
createRSIChart,
updateRsiBandLayout,
updateRsiLevelLinesLayout,
linkPairedChartTimeScales
} from "./chart-import.js?v=41";

import {
calculateRSI,
alignRsiWithCandleTimes
} from "./indicators.js?v=3";

import {
createDashboardChartWidget,
mountDashboardChartInteractions
} from "./chart-widget-host.js?v=12";

import {
mountWidgetTabletChart
} from "./tablet-widget-chart.js?v=1";

import {
subscribeKline
} from "./ws.js?v=15";

import {
getWidgetToolbarHtml,
getWidgetChartUiHtml,
initWidgetDrawToolsDropdown,
wireWidgetDrawToolMenu,
closeAllWidgetDrawToolsMenus,
resetWidgetDrawToolsMenus
} from "./dashboard-draw-ui.js?v=15";

import {
ensureDrawToolsVisible
} from "./draw-tools-visible.js?v=1";

import {
preloadTradingSymbols
} from "./symbol-autocomplete.js?v=1";

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
} from "./widget-favorite-flag.js?v=3";

const dashboard =
document.getElementById("dashboard");

let activeWidgetIndex = 0;

const widgets = [];

/** Как на Главной: 2×1000 свечей — хватает для zoom; меньше запросов к proxy. */
const DASHBOARD_HISTORY_BATCHES =
2;

/** @type {((opts: object)=>{ destroy: ()=>void, plusHandler?: Function }) | null} */
let mountTradeOnDashboardWidget =
null;

function isDashboardTradeEnabled(){

return !!(
window.cryptoTerminalDesktop?.isDesktop &&
/\/terminal(\.html)?\/?$/i.test(
location.pathname ||
""
)
);

}

async function ensureDashboardTradeMount(){

if(
!isDashboardTradeEnabled()
){
mountTradeOnDashboardWidget =
null;
return;
}

if(
mountTradeOnDashboardWidget
){
return;
}

const mod =
await import(
"./trade-widget-mount.js?v=4"
);

mountTradeOnDashboardWidget =
mod.mountTradeOnDashboardWidget;

}

/** Локально — смещение и слоты; на проде — все виджеты параллельно, как screener. */
const DASHBOARD_STAGGER_MS =
isLocalDevHost()
? 280
: 0;

const DASHBOARD_MAX_CONCURRENT_LOADS =
isLocalDevHost()
? 2
: 9;

const DASHBOARD_BATCH_GAP_MS =
0;

/** Фаза 2: initDrawings по одному виджету — не блокируем появление свечей. */
let dashboardDrawingsQueue =
Promise.resolve();

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

function idleYield(){

if(
typeof requestIdleCallback ===
"function"
){
return new Promise(
resolve=>{
requestIdleCallback(
resolve,
{ timeout: 2500 }
);
}
);
}

return sleep(
0
);

}

function mountWidgetTabletGestures(
entry,
chartContainer,
chartWrap,
chart,
series
){

if(
entry.tabletMountStarted
){
return;
}

entry.tabletMountStarted =
true;

void mountWidgetTabletChart({

chart,
series,
chartEl: chartContainer,
chartWrap,
getDrawingTools: ()=>
entry.drawingTools,
isWidgetActive: ()=>
activeWidgetIndex ===
entry.index

}).then(
ctrl=>{

entry.tabletGestures =
ctrl;

entry.cancelTabletPanGesture =
ctrl.cancelCurrentGesture;

}
).catch(
err=>{

console.warn(
"Widget tablet gestures:",
err
);

}
);

}

function queueWidgetDrawingsAttach(
entry
){

if(
entry.drawingsAttachPromise
){
return entry.drawingsAttachPromise;
}

entry.drawingsAttachPromise =
dashboardDrawingsQueue =
dashboardDrawingsQueue.then(
async ()=>{

await idleYield();

const tools =
await entry.ensureDrawings();

entry.drawingTools =
tools;

if(
!tools
){
return;
}

mountWidgetTabletGestures(
entry,
entry.chartContainer,
entry.chartWrap,
entry.chart,
entry.series
);

tools.onSymbolChange();
tools.resize();
tools.scheduleRedraw?.();

}
).catch(
err=>{

console.error(
"Dashboard drawings attach:",
err
);

}
);

return entry.drawingsAttachPromise;

}

function refreshWidgetDrawings(
entry
){

if(
!entry.drawingTools
){
void queueWidgetDrawingsAttach(
entry
);
return;
}

entry.drawingTools.onSymbolChange();
entry.drawingTools.resize();
entry.drawingTools.scheduleRedraw?.();

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

w.tradeWidget?.destroy?.();
w.unsubKline?.();
w.tabletGestures?.dispose?.();
w.disposeChartInteractions?.();
w.drawingTools?.destroy();
w.chart?.remove();
w.rsiChart?.remove();
w.resizeObserver?.disconnect();

});

widgets.length = 0;
dashboardDrawingsQueue =
Promise.resolve();
resetWidgetDrawToolsMenus();
dashboard.innerHTML = "";

}

function terminalWidgetShowsRsi(
count
){

return !isTerminalMobile() && (
count >=
1 &&
count <=
6
);

}

function layoutTerminalWidgetRsi(
entry
){

if(
!entry?.rsiSeries ||
!entry?.rsiWrapEl
){
return;
}

updateRsiBandLayout(
entry.rsiSeries,
entry.rsiWrapEl.querySelector(
".widget-rsi-band"
)
);

updateRsiLevelLinesLayout(
entry.rsiSeries,
entry.rsiWrapEl
);

}

function updateTerminalWidgetRsiData(
entry
){

const candles =
entry.candlesRef?.() ??
[];

if(
!entry?.rsiSeries ||
!candles.length
){
return;
}

const raw =
calculateRSI(
candles
);

const points =
alignRsiWithCandleTimes(
candles,
raw
);

entry.rsiSeries.setData(
points
);

layoutTerminalWidgetRsi(
entry
);

}

function buildTerminalWidgetChartHtml(
showRsi
){

const chartUi =
getWidgetChartUiHtml();

if(
!showRsi
){
return `
<div class="widget-chart-wrap chart-wrap">
<div class="chart"></div>
${chartUi}
</div>`;
}

return `
<div class="widget-chart-body">
<div class="widget-chart-wrap chart-wrap">
<div class="chart"></div>
${chartUi}
</div>
<div class="widget-rsi-wrap">
<div class="widget-rsi-band"></div>
<div class="rsi-level-line hidden" data-rsi-level="70" aria-hidden="true"></div>
<div class="rsi-level-line hidden" data-rsi-level="50" aria-hidden="true"></div>
<div class="rsi-level-line hidden" data-rsi-level="30" aria-hidden="true"></div>
<div class="widget-rsi-chart"></div>
</div>
</div>`;

}

function createWidget(
symbol,
index,
showRsi = false
){

const fixedSymbol =
String(
symbol || ""
).trim().toUpperCase();

const saved =
loadWidgetStateBySymbol(
fixedSymbol
);

const startTf =
saved?.tf ||
"15";

const widget =
document.createElement("div");

widget.className =
showRsi
? "widget has-rsi"
: "widget";
widget.dataset.index = String(index);
widget.dataset.symbol = fixedSymbol;

widget.innerHTML = `

<div class="widget-header">

<div class="widget-header-row">

<div class="widget-header-left">

${getWidgetFlagHtml()}

<div class="left-controls">

<span class="widget-symbol screener-symbol">${fixedSymbol}</span>

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

${buildTerminalWidgetChartHtml(showRsi)}

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
return fixedSymbol;
}

function getTf(){
return tfSelect.value;
}

let cancelTabletPanGesture =
()=>{};

const chartHost =
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
barPosKey: `draw_bar_dashboard_${fixedSymbol}`,
abortTabletChartGesture:()=>{
cancelTabletPanGesture?.();
}

},
{
deferDrawings: true
}
);

const {
chart,
series,
ensureDrawings
} =
chartHost;

initWidgetDrawToolsDropdown(
toolsRoot
);

wireWidgetDrawToolMenu(
toolsRoot,
{
pickTool:(
name
)=>{
void (
async ()=>{

const tools =
chartHost.drawingTools ||
await ensureDrawings();

entry.drawingTools =
tools;

tools?.pickDrawTool?.(
name
);

}
)();
},
onClearAll:()=>{

if(
chartHost.drawingTools
){
return (
chartHost.drawingTools.clearAllDrawings?.() ??
false
);
}

void ensureDrawings();
return false;

},
onActivate:setActive
}
);

wireWidgetFlagUi(
widget,
getSymbol,
renderDashboard
);

const entry = {
index,
widget,
chart,
series,
chartWrap,
chartContainer,
ensureDrawings,
drawingTools: null,
drawingsAttachPromise: null,
tabletMountStarted: false,
cancelTabletPanGesture: ()=>{},
loadData,
getSymbol,
candlesRef: ()=> candles,
setCandles: data=>{ candles = data; },
unsubKline: null,
tabletGestures: null,
resizeObserver: null,
showRsi,
rsiChart: null,
rsiSeries: null,
rsiChartEl: null,
rsiWrapEl: null
};

if(
showRsi
){

const rsiWrapEl =
widget.querySelector(
".widget-rsi-wrap"
);

const rsiChartEl =
widget.querySelector(
".widget-rsi-chart"
);

const rsiPair =
createRSIChart(
rsiChartEl
);

entry.rsiWrapEl =
rsiWrapEl;
entry.rsiChartEl =
rsiChartEl;
entry.rsiChart =
rsiPair.chart;
entry.rsiSeries =
rsiPair.series;

chart.applyOptions({
timeScale:{
visible:false,
borderVisible:false
}
});

entry.rsiChart.applyOptions({
timeScale:{
visible:true,
timeVisible:true,
ticksVisible:true,
borderColor:"#1f2937",
borderVisible:true,
secondsVisible:false
},
rightPriceScale:{
borderVisible:false
}
});

linkPairedChartTimeScales(
chart,
entry.rsiChart,
()=>layoutTerminalWidgetRsi(
entry
)
);

}

if(
mountTradeOnDashboardWidget
){
entry.tradeWidget =
mountTradeOnDashboardWidget(
{
widgetEl:
widget,
chart,
series,
wrapEl:
chartWrap,
chartContainer,
getSymbol,
getTf,
getDrawingTools:()=>
entry.drawingTools ||
chartHost.drawingTools,
getMarkPrice:()=>{
const last =
candles[
candles.length -
1
];
return last?.close;
}
}
);
}

entry.disposeChartInteractions =
mountDashboardChartInteractions({

chart,
series,
wrapEl: chartWrap,
chartContainer,
getSymbol,
getTf,
getDrawingTools:()=>
entry.drawingTools ||
chartHost.drawingTools,
onPlusActivate:
entry.tradeWidget?.plusHandler ||
null

});

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

saveWidgetStateBySymbol(
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

updateTerminalWidgetRsiData(
entry
);

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

if(
entry.rsiSeries
){
updateTerminalWidgetRsiData(
entry
);
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

refreshWidgetDrawings(
entry
);

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

function resizeChart(){

const w =
chartContainer.clientWidth;

const h =
chartContainer.clientHeight;

if(w < 2 || h < 2){
return;
}

chart.applyOptions({ width: w, height: h });

if(
entry.rsiChart &&
entry.rsiChartEl
){

let scaleW =
56;

try{
scaleW =
chart.priceScale(
"right"
).width() ||
scaleW;
}catch{
/* ignore */
}

entry.rsiWrapEl?.style.setProperty(
"--chart-scale-width",
`${scaleW}px`
);

const rw =
entry.rsiChartEl.clientWidth;
const rh =
entry.rsiChartEl.clientHeight;

if(
rw >=
2 &&
rh >=
2
){
entry.rsiChart.applyOptions({
width: rw,
height: rh
});
layoutTerminalWidgetRsi(
entry
);
}

}

entry.drawingTools?.resize();

}

const resizeTarget =
widget.querySelector(
".widget-chart-body"
) ||
chartWrap;

const resizeObserver =
new ResizeObserver(resizeChart);

entry.resizeObserver =
resizeObserver;
resizeObserver.observe(resizeTarget);

requestAnimationFrame(resizeChart);

loadData();

widgets.push(entry);

if(index === activeWidgetIndex){
setActive();
}

}

function dashboardGridClass(
count
){

if(
!count
){
return "terminal-empty-grid";
}

return isTerminalMobile()
? `grid-mobile-scroll grid-n-${count}`
: `grid-n-${count}`;

}

function renderTerminalEmptyState(){

dashboard.className =
"terminal-empty-grid";

dashboard.innerHTML = `
<div class="terminal-empty-state">
<p class="terminal-empty-title">Нет выбранных графиков</p>
<p class="terminal-empty-hint">Отметьте монеты синим флагом на Главной или в Монетах (не более 9).</p>
</div>`;

}

async function renderDashboard(){

destroyAllWidgets();

await ensureDashboardTradeMount();

const symbols =
getTerminalBlueSymbols();

if(
!symbols.length
){
renderTerminalEmptyState();
return;
}

dashboard.innerHTML = "";

dashboard.className =
dashboardGridClass(
symbols.length
);

const showRsi =
terminalWidgetShowsRsi(
symbols.length
);

symbols.forEach(
(symbol, i)=>{
try{
createWidget(
symbol,
i,
showRsi
);
}catch(
err
){
console.error(
"Dashboard widget create:",
err
);
}
}
);

}

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
renderDashboard
);

chartsReady.then(()=>{

markTabletChartBody();
window.addEventListener(
"resize",
markTabletChartBody
);

initTerminalPageUi();
renderDashboard();

const deferSymbolsPreload =
()=>{
preloadTradingSymbols();
};

if(
typeof requestIdleCallback ===
"function"
){
requestIdleCallback(
deferSymbolsPreload,
{ timeout: 4000 }
);
}else{
setTimeout(
deferSymbolsPreload,
2000
);
}
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
