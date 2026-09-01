/**
 * Coins page — chart dimensions, resize, viewport settle.
 */
import {
appendFutureWhitespaceBars,
computeChartFutureMarginBars,
computeCoinsChartViewportPlan,
syncLinkedChartTimescales
} from "../chart-import.js?v=49";

import {
terminalVisibleBars,
TERMINAL_VISIBLE_BARS
} from "../terminal-chart-history-prefs.js?v=1";

import {
isChartLayoutReady
} from "../chart-layout-gate.js?v=2";

import {
invalidatePreservedVisibleLogicalRange
} from "../chart-visible-range.js?v=3";

let layoutCtx =
null;

export function registerCoinsChartLayoutContext(
ctx
){

layoutCtx =
ctx;

}

function ctx(){

if(
!layoutCtx
){
throw new Error(
"coins chart layout context not registered"
);
}

return layoutCtx;

}

function forEachDrawingTool(
fn
){

const primary =
ctx().getDrawingTools?.();

const linked =
ctx().getLinkedDrawingTools?.() ||
[];

const tools =
[];

if(
primary
){
tools.push(
primary
);
}

for(
const tool of
linked
){

if(
tool &&
!tools.includes(
tool
)
){
tools.push(
tool
);
}

}

for(
const tool of
tools
){
fn(
tool
);
}

}

function syncDrawingToolsLayout(){

forEachDrawingTool(
tool=>{
tool.resize?.();
tool.scheduleRedraw?.();
}
);

}

export {
syncDrawingToolsLayout
};

export function buildChartDisplayCandles(){

const {
getCandles,
getTf
} =
ctx();

const candles =
getCandles?.() ||
[];

const currentTF =
getTf?.() ||
"60";

if(
!candles.length
){
return [];
}

return appendFutureWhitespaceBars(
candles,
computeChartFutureMarginBars(
terminalVisibleBars(
candles.length
)
),
currentTF
);

}

export function getCoinsPaneHeightPx(){

const candidates =
[
document.getElementById(
"rsi-wrap"
),
document.getElementById(
"volume-wrap"
),
document.getElementById(
"ao-wrap"
),
document.getElementById(
"macd-wrap"
)
];

for(
const wrap of candidates
){

if(
!wrap ||
wrap.classList.contains(
"indicator-pane-hidden"
)
){
continue;
}

const h =
wrap.getBoundingClientRect().height;

if(
h >=
2
){
return h;
}

}

return Math.max(
document.getElementById(
"rsi-wrap"
)?.getBoundingClientRect().height ||
0,
102
);

}

export function applyChartDimensions(){

const {
chart,
getChartIndicators,
getRsiChart,
rsiPaneActive,
layoutRsiBand
} =
ctx();

const chartWrap =
document.getElementById(
"chart-wrap"
);

if(
!chartWrap ||
!chart
){
return false;
}

const w =
Math.max(
chartWrap.clientWidth,
1
);

const chartH =
Math.max(
chartWrap.clientHeight,
1
);

const paneH =
getCoinsPaneHeightPx();

if(
w <
2 ||
chartH <
2
){
return false;
}

chart.applyOptions({
width:
w,
height:
chartH
});

const chartIndicators =
getChartIndicators?.();

chartIndicators?.resizePanes?.(
w
);

const rsiChart =
getRsiChart?.();

if(
!chartIndicators &&
rsiChart &&
rsiPaneActive?.()
){

const rsiPaneH =
document.getElementById(
"rsi-wrap"
)?.getBoundingClientRect().height ||
paneH;

if(
rsiPaneH >=
2
){

rsiChart.applyOptions({
width:
w,
height:
rsiPaneH
});

layoutRsiBand?.();

}

}

return true;

}

function coinsChartWidthPx(){

const {
chartEl
} =
ctx();

const chartWrap =
document.getElementById(
"chart-wrap"
);

return Math.max(
chartWrap?.clientWidth ||
0,
chartEl?.clientWidth ||
0,
1
);

}

function computeLayoutViewportPlan(
displayCandles
){

const {
chart,
getCandles,
getTf
} =
ctx();

const candles =
getCandles?.() ||
[];

const seriesCandles =
Array.isArray(
displayCandles
) &&
displayCandles.length
? displayCandles
: buildChartDisplayCandles();

if(
!seriesCandles.length
){
return null;
}

const plotWidth =
chart?.timeScale?.().width?.() ||
0;

return computeCoinsChartViewportPlan(
seriesCandles,
getTf?.() ||
"60",
coinsChartWidthPx(),
candles.length,
TERMINAL_VISIBLE_BARS,
plotWidth
);

}

export function settleCoinsChartViewport(){

const {
getCandles,
chart,
getTf,
getChartIndicators,
getRsiChart,
rsiPaneActive,
layoutRsiBand,
applyCoinsChartViewport
} =
ctx();

const candles =
getCandles?.() ||
[];

const currentTF =
getTf?.() ||
"60";

if(
!candles.length ||
!chart
){
return;
}

invalidatePreservedVisibleLogicalRange();

const chartWidth =
coinsChartWidthPx();

const viewportCtx =
{
mainChart:
chart,
candles:
buildChartDisplayCandles(),
tf:
currentTF,
chartWidth,
realCandleCount:
candles.length,
visibleBarsCap:
TERMINAL_VISIBLE_BARS,
applyCoinsChartViewport
};

applyCoinsChartViewport(
chart,
null,
viewportCtx.candles,
currentTF,
chartWidth,
candles.length,
TERMINAL_VISIBLE_BARS
);

const chartIndicators =
getChartIndicators?.();

if(
chartIndicators &&
isChartLayoutReady()
){

chartIndicators.syncViewports?.(
viewportCtx
);

}

const rsiChart =
getRsiChart?.();

if(
!chartIndicators &&
rsiChart &&
rsiPaneActive?.()
){

applyCoinsChartViewport(
chart,
rsiChart,
viewportCtx.candles,
currentTF,
chartWidth,
candles.length,
TERMINAL_VISIBLE_BARS
);

layoutRsiBand?.();

}

}

let coinsReplaceViewportGen =
0;

function applyCoinsChartViewportPlan(
plan
){

const {
chart
} =
ctx();

if(
!chart ||
!plan
){
return;
}

invalidatePreservedVisibleLogicalRange();

chart.timeScale().applyOptions(
plan.timeOpts
);

chart.timeScale().setVisibleLogicalRange(
plan.range
);

}

/**
 * Смена тикера/ТФ: barSpacing до setData, целевой range сразу после —
 * один кадр LW, без промежуточного «свечи у правой шкалы».
 * Повтор plan на следующем rAF: setData иногда сбрасывает range до первой отрисовки.
 */
export function replaceCoinsChartCandles(
series,
displayCandles
){

if(
!series
){
return;
}

const {
chart
} =
ctx();

const gen =
++coinsReplaceViewportGen;

const plan =
computeLayoutViewportPlan(
displayCandles
);

if(
chart &&
plan
){

chart.timeScale().applyOptions(
plan.timeOpts
);

}

series.setData(
displayCandles
);

applyCoinsChartViewportPlan(
plan
);

if(
!chart ||
!plan
){
return;
}

requestAnimationFrame(
()=>{

if(
gen !==
coinsReplaceViewportGen
){
return;
}

applyCoinsChartViewportPlan(
plan
);

}
);

}

export function syncCoinsChartLinkedViewports(){

const {
chart,
getChartIndicators,
getRsiChart,
rsiPaneActive,
layoutRsiBand
} =
ctx();

if(
!chart
){
return;
}

const linked =
getChartIndicators?.()?.getLinkedPaneCharts?.() ||
[];

for(
const linkedChart of
linked
){

if(
linkedChart
){
syncLinkedChartTimescales(
chart,
linkedChart
);
}

}

const rsiChart =
getRsiChart?.();

if(
rsiChart &&
rsiPaneActive?.()
){

syncLinkedChartTimescales(
chart,
rsiChart
);

layoutRsiBand?.();

}

}

export function resizeCharts(){

if(
!applyChartDimensions()
){
return;
}

const {
getCandles,
chart,
getChartIndicators,
getRsiChart,
rsiPaneActive,
layoutRsiBand,
refreshCoinsChartBarSpacing
} =
ctx();

const candles =
getCandles?.() ||
[];
if(
candles.length
){

const chartIndicators =
getChartIndicators?.();

const linked =
chartIndicators?.getLinkedPaneCharts?.() ||
[];

if(
linked.length
){

linked.forEach(
linkedChart=>{
refreshCoinsChartBarSpacing(
chart,
linkedChart
);
}
);

}else{

refreshCoinsChartBarSpacing(
chart,
rsiPaneActive?.()
? getRsiChart?.()
: null
);

}

if(
rsiPaneActive?.()
){
layoutRsiBand?.();
}

}

syncDrawingToolsLayout();

}

let coinsResizeRaf =
0;

export function scheduleResizeCharts(){

if(
coinsResizeRaf
){
cancelAnimationFrame(
coinsResizeRaf
);
}

coinsResizeRaf =
requestAnimationFrame(
()=>{
coinsResizeRaf =
0;
resizeCharts();
}
);

}

export function applyDefaultZoom(
options = {}
){

const scheduleDrawingRedraw =
options.scheduleDrawingRedraw !==
false;

const skipViewportSettle =
options.skipViewportSettle ===
true;

const {
getCandles,
viewportSettleRaf
} =
ctx();

const candles =
getCandles?.() ||
[];

if(
!candles.length
){
return;
}

const run =
()=>{

if(
!skipViewportSettle
){
applyChartDimensions();
settleCoinsChartViewport();
}

if(
scheduleDrawingRedraw
){
syncDrawingToolsLayout();
}else{
forEachDrawingTool(
tool=>{
tool.resize?.();
}
);
}

};

run();

if(
skipViewportSettle
){
return;
}

if(
viewportSettleRaf.value
){
cancelAnimationFrame(
viewportSettleRaf.value
);
}

viewportSettleRaf.value =
requestAnimationFrame(
()=>{
viewportSettleRaf.value =
0;
run();
}
);

}
