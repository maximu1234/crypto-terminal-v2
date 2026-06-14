/**
 * Общий bootstrap: LW chart + initDrawings для dashboard и coins.
 */
import {
createCandlestickChart,
ensureDomChartCrosshair,
positionDomChartCrosshair,
hideDomChartCrosshair
} from "./chart-import.js?v=31";

import {
initDrawings
} from "./drawings.js?v=211";

import {
mountPriceAlertUi
} from "./price-alert-ui.js?v=37";

function widgetPlotWidth(
wrapEl,
chart
){

const rect =
wrapEl.getBoundingClientRect();

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

return Math.max(
0,
rect.width - scaleW
);

}

function isClientOnWidgetPlot(
wrapEl,
chart,
clientX,
clientY
){

const rect =
wrapEl.getBoundingClientRect();
const x =
clientX - rect.left;
const y =
clientY - rect.top;
const pw =
widgetPlotWidth(
wrapEl,
chart
);

return (
x >=
0 &&
x <
pw - 0.5 &&
y >=
0 &&
y <=
rect.height + 0.5
);

}

function isClientOnWidgetPriceScale(
wrapEl,
chart,
clientX,
clientY
){

const rect =
wrapEl.getBoundingClientRect();
const x =
clientX - rect.left;
const y =
clientY - rect.top;

return (
y >=
0 &&
y <=
rect.height &&
x >=
widgetPlotWidth(
wrapEl,
chart
) - 14
);

}

/**
 * DOM-крест + «+» алерта на виджете Терминала (как на /coins).
 */
export function mountDashboardChartInteractions({
chart,
series,
wrapEl,
chartContainer,
getSymbol,
getTf,
getDrawingTools
}){

if(
!chart ||
!series ||
!wrapEl ||
!chartContainer
){
return ()=>{};
}

ensureDomChartCrosshair(
wrapEl
);

let crosshairSuppressed =
false;

function onCrosshairMove(
e
){

if(
crosshairSuppressed ||
e.pointerType ===
"touch"
){
return;
}

if(
document.body.classList.contains(
"chart-probe-active"
)
){
return;
}

if(
isClientOnWidgetPriceScale(
wrapEl,
chart,
e.clientX,
e.clientY
)
){
hideDomChartCrosshair(
wrapEl
);
return;
}

if(
!isClientOnWidgetPlot(
wrapEl,
chart,
e.clientX,
e.clientY
)
){
hideDomChartCrosshair(
wrapEl
);
return;
}

positionDomChartCrosshair({
wrapEl,
chartEl: chartContainer,
chart,
series,
clientX: e.clientX,
clientY: e.clientY
});

}

function onCrosshairLeave(){

if(
crosshairSuppressed
){
return;
}

hideDomChartCrosshair(
wrapEl
);

}

wrapEl.addEventListener(
"pointermove",
onCrosshairMove,
{
passive:true,
capture:true
}
);

wrapEl.addEventListener(
"pointerleave",
onCrosshairLeave
);

const disposeAlertUi =
mountPriceAlertUi({

chart,
series,
wrapEl,
getSymbol,
getTf,
scheduleRedraw:()=>{

const tools =
getDrawingTools?.();

return (
tools?.scheduleDragRedraw?.() ||
tools?.scheduleRedraw?.()
);

},
onCrosshairSuppress:()=>{

crosshairSuppressed =
true;
hideDomChartCrosshair(
wrapEl
);

},
onCrosshairRelease:()=>{

crosshairSuppressed =
false;

}

});

return ()=>{

wrapEl.removeEventListener(
"pointermove",
onCrosshairMove,
{
capture:true
}
);

wrapEl.removeEventListener(
"pointerleave",
onCrosshairLeave
);

hideDomChartCrosshair(
wrapEl
);
disposeAlertUi?.();

};

}

/**
 * @param {Parameters<typeof initDrawings>[0]} options
 * @returns {ReturnType<typeof initDrawings> | null}
 */
export function initWidgetDrawings(
options
){

try{
return initDrawings(
options
);
}catch(
err
){
console.error(
"Drawings init failed:",
err
);
return null;
}

}

/**
 * @param {{
 *   chartContainer: Element,
 *   chartWrap: Element,
 *   toolsRoot: Element,
 *   getSymbol: ()=>string,
 *   getTf: ()=>string,
 *   getCandles: ()=>Array,
 *   isActive: ()=>boolean,
 *   barPosKey: string,
 *   abortTabletChartGesture?: ()=>void
 * }} opts
 * @param {{ deferDrawings?: boolean }} [config]
 */
export function createDashboardChartWidget(
opts,
config = {}
){

const {
chart,
series
} =
createCandlestickChart(
opts.chartContainer
);

const drawingOptions = {

chart,
series,
wrapEl: opts.chartWrap,
uiRoot: opts.chartWrap,
toolsRoot: opts.toolsRoot,
getSymbol: opts.getSymbol,
getTf: opts.getTf,
getCandles: opts.getCandles,
isActive: opts.isActive,
barPosKey: opts.barPosKey,
abortTabletChartGesture: opts.abortTabletChartGesture

};

const host = {
chart,
series,
drawingTools: null,
ensureDrawings: null
};

let ensureInflight = null;

host.ensureDrawings =
async function ensureDrawings(){

if(
host.drawingTools
){
return host.drawingTools;
}

if(
ensureInflight
){
return ensureInflight;
}

ensureInflight =
Promise.resolve().then(
()=>{

const tools =
initWidgetDrawings(
drawingOptions
);

host.drawingTools =
tools;
ensureInflight =
null;

return tools;

}
);

return ensureInflight;

};

if(
config.deferDrawings !==
true
){

host.drawingTools =
initWidgetDrawings(
drawingOptions
);

}

return host;

}
