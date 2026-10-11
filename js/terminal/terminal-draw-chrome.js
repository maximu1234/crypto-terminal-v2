import {
loadMarketHistory,
getActiveExchangeId
} from "../market-api.js?v=7b3e6b3c";

import {
positionTabletProbeCrosshair,
hideTabletProbeCrosshair,
isTabletChartViewport
} from "../chart-import.js?v=544220a0";

import {
TERMINAL_VISIBLE_BARS,
terminalHistoryInitialRequests
} from "../terminal-chart-history-prefs.js?v=948df10f";

import {
mountChartSymbolFullName
} from "../symbol-display-name.js?v=c6224330";

import {
perfMark,
perfMeasure
} from "../perf-marks.js?v=6857dee5";

import {
isTradePage
} from "./terminal-state.js?v=4747a92f";

import {
buildChartDisplayCandles,
settleCoinsChartViewport,
scheduleResizeCharts
} from "./terminal-chart-layout.js?v=df9a7a4d";

export async function mountTerminalDrawChrome(
deps
){


perfMark(
"terminal-draw-chrome-start"
);

try{

const {
initWidgetDrawings
} =
await import(
"../chart-widget-host.js?v=ff7bfaaa"
);
const {
initChartIndicators
} =
await import(
"../chart-indicators.js?v=e1502405"
);
const {
createPattern12EarlyT3Indicator
} =
await import(
"../indicators/pattern-12-early-t3.js?v=57587576"
);

function teardownMacdDrawingTools(){

if(
deps.activeDrawPane ===
"macd"
){
deps.activeDrawPane =
"chart";
}

deps.disposeMacdAlertUi?.();
deps.disposeMacdAlertUi =
null;
deps.macdDrawingTools?.destroy?.();
deps.macdDrawingTools =
null;
deps.macdSetDrawTool =
null;

}

function mountMacdDrawingTools(){

if(
deps.macdDrawingTools
){
return;
}

const ind =
deps.chartIndicators?.getIndicator?.(
"macd"
);
const macdChart =
ind?.getChart?.();
const macdSeries =
ind?.getMacdSeries?.();

if(
!ind?.isEnabled?.() ||
!macdChart ||
!macdSeries ||
!deps.macdWrapEl
){
return;
}

deps.macdDrawingTools =
initWidgetDrawings({

chart:
macdChart,

timeChart:
deps.chart,

series:
macdSeries,

wrapEl:
deps.macdWrapEl,

uiRoot:
null,

toolsRoot:
document.getElementById(
"charts-stack"
),

bindToolbar:
false,

styleBar:
false,

mountStyleBar:
false,

sharedStyleBarSync: ()=>{
deps.drawingTools?.syncStyleBar?.();
},

storageKeySuffix:
"_macd",

drawPriceAlerts:
true,

alertSource:
"macd",

enableMagnet:
false,

getSymbol: ()=>
deps.currentSymbol,

getTf: ()=>
deps.currentTF,

getCandles:()=>
ind.getMacdDrawCandles?.() ||
[],

isActive: ()=>
deps.activeDrawPane ===
"macd",

barPosKey:
"draw_bar_pos_macd",

abortTabletChartGesture:()=>{
deps.cancelTabletPanGesture?.();
},

sharedDrawUndo: deps.sharedDrawUndo,
deferKeyboardUndo:
true,
clearPeerSelections: ()=>{
deps.drawingTools?.clearDrawingSelection?.();
deps.rsiDrawingTools?.clearDrawingSelection?.();
deps.drawingTools?.syncStyleBar?.();
}

});

if(
!deps.macdDrawingTools
){
return;
}

deps.macdSetDrawTool =
deps.macdDrawingTools.setTool.bind(
deps.macdDrawingTools
);
deps.macdSetDrawTool(
deps.drawingTools?.getTool?.() ??
"cursor"
);

void import(
"../price-alert-ui.js?v=5a6a69e0"
).then(
({
mountPriceAlertUi
})=>{

if(
!deps.macdDrawingTools
){
return;
}

deps.disposeMacdAlertUi?.();
deps.disposeMacdAlertUi =
mountPriceAlertUi(
{
chart:
macdChart,
series:
macdSeries,
wrapEl:
deps.macdWrapEl,
getSymbol:()=>
deps.currentSymbol,
getTf:()=>
deps.currentTF,
getDrawingTools:()=>
deps.macdDrawingTools,
alertSource:
"macd",
scheduleRedraw:()=>{
return (
deps.macdDrawingTools?.scheduleDragRedraw?.() ||
deps.macdDrawingTools?.scheduleRedraw?.()
);
},
onCrosshairSuppress:()=>{
deps.chartCrosshairLink?.setSuppressed?.(
true
);
},
onCrosshairRelease:()=>{
deps.chartCrosshairLink?.setSuppressed?.(
false
);
}
}
);

}
).catch(
err=>{
console.warn(
"macd price alert ui:",
err
);
}
);

}

function syncMacdDrawingTools(){

const ind =
deps.chartIndicators?.getIndicator?.(
"macd"
);

if(
ind?.isEnabled?.() &&
ind.getChart?.() &&
ind.getMacdSeries?.()
){
mountMacdDrawingTools();
return;
}

teardownMacdDrawingTools();

}

deps.drawingTools =
initWidgetDrawings({

chart: deps.chart,
series: deps.candleSeries,
wrapEl: document.getElementById("chart-wrap"),
uiRoot: document.getElementById("chart-wrap"),
toolsRoot: document.getElementById("charts-stack"),
clearAllPeers:
deps.drawClearAllPeers,
getSymbol: ()=> deps.currentSymbol,
getTf: ()=> deps.currentTF,
getCandles: ()=> deps.candles,
isActive: ()=>
deps.activeDrawPane ===
"chart",
getStyleDelegate: ()=>
deps.overlayStyleBarDelegateIfNeeded(),
abortTabletChartGesture:()=>{
deps.cancelTabletPanGesture?.();
},
onChartCrosshairSuppress:()=>{
deps.chartCrosshairLink?.setSuppressed?.(
true
);
},
onChartCrosshairRelease:()=>{
deps.chartCrosshairLink?.setSuppressed?.(
false
);
},
onChartCrosshairAt(
clientX,
clientY
){

if(
!isTabletChartViewport()
){
return;
}

positionTabletProbeCrosshair({
chart: deps.chart,
series: deps.candleSeries,
chartEl: deps.chartEl,
chartWrapEl: document.getElementById(
"chart-wrap"
),
chartsStackEl: document.getElementById(
"charts-stack"
),
linkedVertEl: document.getElementById(
"linked-crosshair-vert"
),
horizLineEl: document.getElementById(
"tablet-probe-crosshair-h"
),
timeLabelEl: document.getElementById(
"crosshair-time-label"
),
priceLabelEl: document.getElementById(
"crosshair-price-label"
),
clientX,
clientY,
onTime: deps.updateRsiHudFromCrosshairTime
});

},
onChartCrosshairClear(){

if(
!isTabletChartViewport()
){
return;
}

hideTabletProbeCrosshair({
linkedVertEl: document.getElementById(
"linked-crosshair-vert"
),
horizLineEl: document.getElementById(
"tablet-probe-crosshair-h"
),
timeLabelEl: document.getElementById(
"crosshair-time-label"
),
priceLabelEl: document.getElementById(
"crosshair-price-label"
),
chartWrapEl: document.getElementById(
"chart-wrap"
),
onClear(){

const last =
deps.rsiPointsCache[
deps.rsiPointsCache.length -
1
];

deps.setRsiHudValue(
last?.value ??
null
);

}
});

try{
deps.chart.clearCrosshairPosition();
}catch{
/* ignore */
}

}

,
sharedDrawUndo: deps.sharedDrawUndo,
deferKeyboardUndo:
true,
clearPeerSelections: ()=>{
deps.rsiDrawingTools?.clearDrawingSelection?.();
deps.macdDrawingTools?.clearDrawingSelection?.();
deps.drawingTools?.syncStyleBar?.();
}

});


deps.rsiDrawingTools =
initWidgetDrawings({

chart:
deps.rsiChart,

timeChart:
deps.chart,

series:
deps.rsiSeries,

wrapEl:
deps.rsiWrapEl,

uiRoot:
null,

toolsRoot:
document.getElementById(
"charts-stack"
),

bindToolbar:
false,

styleBar:
false,

mountStyleBar:
false,

sharedStyleBarSync: ()=>{
deps.drawingTools?.syncStyleBar?.();
},

storageKeySuffix:
"_rsi",

drawPriceAlerts:
true,

alertSource:
"rsi",

enableMagnet:
false,

getSymbol: ()=>
deps.currentSymbol,

getTf: ()=>
deps.currentTF,

getCandles:
deps.getRsiCandlesForDraw,

isActive: ()=>
deps.activeDrawPane ===
"rsi" &&
deps.rsiPaneActive,

barPosKey:
"draw_bar_pos_rsi",

abortTabletChartGesture:()=>{
deps.cancelTabletPanGesture?.();
},

sharedDrawUndo: deps.sharedDrawUndo,
deferKeyboardUndo:
true,
clearPeerSelections: ()=>{
deps.drawingTools?.clearDrawingSelection?.();
deps.macdDrawingTools?.clearDrawingSelection?.();
deps.drawingTools?.syncStyleBar?.();
}

});

if(
deps.drawingTools &&
deps.rsiDrawingTools
){

deps.mountTerminalSharedDrawUndoKeyboard();

const mainSetTool =
deps.drawingTools.setTool.bind(
deps.drawingTools
);
const rsiSetTool =
deps.rsiDrawingTools.setTool.bind(
deps.rsiDrawingTools
);

deps.mainSetDrawTool =
mainSetTool;
deps.rsiSetDrawTool =
rsiSetTool;

deps.drawingTools.setTool =
next=>{
mainSetTool(
next
);
rsiSetTool(
next
);
deps.macdSetDrawTool?.(
next
);
};

deps.drawClearAllPeers.call =
()=>{
deps.rsiDrawingTools?.clearAllDrawings?.();
deps.macdDrawingTools?.clearAllDrawings?.();
};

deps.mountSharedDrawSelectionDismiss();

}

if(
!deps.drawingTools
){
console.warn(
"Drawings unavailable on coins page"
);
}

deps.chartIndicators =
await initChartIndicators(
{
root:
document.getElementById(
"chart-indicators-wrap"
),
getHost:()=>({
chart: deps.chart,
series:
deps.candleSeries,
wrapEl:
document.getElementById(
"chart-wrap"
),
getDrawingTools:()=>
deps.drawingTools,
getSymbol:()=>
deps.currentSymbol,
getCandles:()=>
deps.candles,
getDisplayCandles:()=>
buildChartDisplayCandles(),
getTf:()=>
deps.currentTF,
loadIndicatorHistory:(
symbol,
tf,
requests
)=>
loadMarketHistory(
symbol,
tf,
requests ||
terminalHistoryInitialRequests(),
{
parallel:
true,
batchGapMs:
0
}
),
onIndicatorDataReady(
id
){

if(
id ===
"macd"
){
deps.macdDrawingTools?.scheduleRedraw?.();
deps.publishMacdAlertValue();
}

},
shouldWatchMacdAlerts:()=>
deps.symbolHasMacdAlerts(),
getVisibleBarsCap:()=>
TERMINAL_VISIBLE_BARS,
getChartWrapWidth:()=>
document.getElementById(
"chart-wrap"
)?.clientWidth ||
0,
getPaneHeight:()=>{

const wrap =
document.getElementById(
"volume-wrap"
);

if(
!wrap ||
wrap.classList.contains(
"indicator-pane-hidden"
)
){
return 0;
}

return wrap.getBoundingClientRect().height ||
0;

},
rsiChart: deps.rsiChart,
setRsiPaneActive: deps.setRsiPaneActive,
isRsiPaneVisible:()=>
deps.rsiPaneActive,
layoutRsiBand: deps.layoutRsiBand,
onRsiSettingsChange: deps.onRsiSettingsChange,
settleChartViewport:
settleCoinsChartViewport,
onIndicatorToggle(
id,
on
){

if(
id ===
"volume" ||
id ===
"ao" ||
id ===
"macd" ||
id ===
"rsi"
){
scheduleResizeCharts();

if(
deps.candles.length
){
settleCoinsChartViewport();
}

deps.chartIndicators?.notifyLayoutChange?.();

}

if(
id ===
"macd"
){
syncMacdDrawingTools();
}

}
})
,
extraIndicators: [
createPattern12EarlyT3Indicator
]
}
);

syncMacdDrawingTools();

mountChartSymbolFullName({
getSymbol(){
return deps.currentSymbol;
},
getExchange(){
return getActiveExchangeId();
}
});

document.getElementById(
"rsi-hud"
)?.addEventListener(
"dblclick",
event=>{
event.preventDefault();
event.stopPropagation();
deps.chartIndicators?.openSettings?.(
"rsi"
);
}
);

document.getElementById(
"macd-hud"
)?.addEventListener(
"dblclick",
event=>{
event.preventDefault();
event.stopPropagation();
deps.chartIndicators?.openSettings?.(
"macd"
);
}
);

if(
isTradePage &&
deps.chart &&
deps.candleSeries
){
window.__tradeChartHost =
{
chart: deps.chart,
series:
deps.candleSeries,
wrapEl:
document.getElementById(
"chart-wrap"
),
chartEl:
document.getElementById(
"chart"
),
getSymbol(){
return String(
deps.currentSymbol ||
""
).replace(
/\.P$/i,
""
).trim().toUpperCase();
},
getDrawingTools:()=>
deps.drawingTools
};

window.dispatchEvent(
new CustomEvent(
"trade-chart-host-ready"
)
);

}



if(
deps.drawingTools ||
isTradePage
){

deps.priceScaleTouchHooks.onScaleFrame =
range=>{
deps.priceHudCtrl.refresh?.();
deps.drawingTools?.applyPriceScaleFrame?.(
range
);
};

deps.priceScaleTouchHooks.onDragStart =
range=>{
deps.drawingTools?.beginPriceScaleDragRedraw?.(
range
);
};

deps.priceScaleTouchHooks.onDragEnd =
()=>{
deps.drawingTools?.endPriceScaleDragRedraw?.();
window.__tradeChartOverlay?.onPriceScaleDragEnd?.();
};

deps.priceScaleTouchHooks.onReset =
()=>{
deps.drawingTools?.endPriceScaleDragRedraw?.();
window.__tradeChartOverlay?.onPriceScaleDragEnd?.();
deps.drawingTools?.scheduleRedraw?.();
};

}

if(
deps.rsiDrawingTools
){

deps.rsiPriceScaleTouchHooks.onScaleFrame =
range=>{
deps.rsiDrawingTools?.applyPriceScaleFrame?.(
range
);
};

deps.rsiPriceScaleTouchHooks.onDragStart =
range=>{
deps.rsiDrawingTools?.beginPriceScaleDragRedraw?.(
range
);
};

deps.rsiPriceScaleTouchHooks.onDragEnd =
()=>{
deps.rsiDrawingTools?.endPriceScaleDragRedraw?.();
};

deps.rsiPriceScaleTouchHooks.onReset =
()=>{
deps.rsiDrawingTools?.endPriceScaleDragRedraw?.();
deps.rsiDrawingTools?.scheduleRedraw?.();
};

}

if(
deps.drawingTools ||
deps.rsiDrawingTools
){

deps.wireCoinsLinkedDrawPanRedraw();

}

if(
deps.drawingTools
){

const mountAlertUi =
async()=>{

let tradePlusHandler =
null;

if(
isTradePage
){
try{
const {
createTradePlusMenuHandler
} =
await import(
"../trade-order-plus-ui.js?v=3163238b"
);

tradePlusHandler =
createTradePlusMenuHandler(
{
getSymbol:()=>
deps.currentSymbol,
getTf:()=>
deps.currentTF,
scheduleRedraw:()=>
(
deps.drawingTools?.scheduleDragRedraw?.() ||
deps.drawingTools?.scheduleRedraw?.()
)
}
);
}catch(
err
){
console.warn(
"trade order plus ui:",
err
);
}
}

const {
mountPriceAlertUi
} =
await import(
"../price-alert-ui.js?v=5a6a69e0"
);

let disposeAlertUi =
mountPriceAlertUi(
{
chart: deps.chart,
series:
deps.candleSeries,
wrapEl:
deps.chartWrapEl,
getSymbol:()=>
deps.currentSymbol,
getTf:()=>
deps.currentTF,
getDrawingTools:()=>
deps.drawingTools,
scheduleRedraw:()=>{
return (
deps.drawingTools?.scheduleDragRedraw?.() ||
deps.drawingTools?.scheduleRedraw?.()
);
},
onCrosshairSuppress:()=>{
deps.chartCrosshairLink?.setSuppressed?.(
true
);
},
onCrosshairRelease:()=>{
deps.chartCrosshairLink?.setSuppressed?.(
false
);
},
onPlusActivate:
tradePlusHandler
}
);

};

void mountAlertUi().catch(
err=>{
console.warn(
"price alert ui:",
err
);
}
);

if(
deps.rsiDrawingTools &&
deps.rsiChart &&
deps.rsiSeries &&
deps.rsiWrapEl
){

const {
mountPriceAlertUi: mountRsiPriceAlertUi
} =
await import(
"../price-alert-ui.js?v=5a6a69e0"
);

mountRsiPriceAlertUi(
{
chart:
deps.rsiChart,
series:
deps.rsiSeries,
wrapEl:
deps.rsiWrapEl,
getSymbol:()=>
deps.currentSymbol,
getTf:()=>
deps.currentTF,
getDrawingTools:()=>
deps.rsiDrawingTools,
alertSource:
"rsi",
scheduleRedraw:()=>{
return (
deps.rsiDrawingTools?.scheduleDragRedraw?.() ||
deps.rsiDrawingTools?.scheduleRedraw?.()
);
},
onCrosshairSuppress:()=>{
deps.chartCrosshairLink?.setSuppressed?.(
true
);
},
onCrosshairRelease:()=>{
deps.chartCrosshairLink?.setSuppressed?.(
false
);
}
}
);

}

}

}catch(err){

console.error("Drawings UI mount failed:", err);

}finally{

perfMark(
"terminal-draw-chrome-end"
);
perfMeasure(
"terminal-draw-chrome",
"terminal-draw-chrome-start",
"terminal-draw-chrome-end"
);

}

}
