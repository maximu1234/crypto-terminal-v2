import {
isTabletChartViewport
} from "./chart-options.js?v=f4be0094";

import {
ensureDomChartCrosshair,
resolveCrosshairPlotTime,
updateCrosshairAxisLabels,
clearCrosshairAxisLabels,
hideDomChartCrosshair,
hideDomChartCrosshairHorz,
hideDomChartCrosshairVert,
positionDomChartCrosshairHorz,
positionTabletProbeHorizInStack,
hideTabletProbeHorizInStack
} from "./chart-dom-crosshair.js?v=0730674e";

import {
chartPlotMetrics,
isClientOnChartPriceScale
} from "./chart-factory.js?v=c0ecce8b";

export function linkChartsCrosshair({
mainChart,
linkedChart,
mainSeries,
linkedSeries,
linkedVertOverlayEl,
chartWrapEl = null,
chartEl = null,
linkedWrapEl = null,
linkedChartEl = null,
crosshairTimeLabelEl,
crosshairPriceLabelEl = null,
onLinkedCrosshairTime,
onLinkedCrosshairRsiValue = null,
onLinkedCrosshairClear,
getLinkedValueAtTime,
getMainValueAtTime,
getExtraPanes = ()=>
[]
}){

let lock =
false;

let lastPointerClientX =
null;

let lastPointerClientY =
null;

let livePointerClientX =
null;

let livePointerClientY =
null;

const chartsStackEl =
linkedVertOverlayEl?.parentElement ||
chartWrapEl?.parentElement ||
linkedWrapEl?.parentElement ||
null;

if(
chartWrapEl
){
ensureDomChartCrosshair(
chartWrapEl
);
}

if(
linkedWrapEl
){
ensureDomChartCrosshair(
linkedWrapEl
);
}

function extraPanes(){

try{

const list =
getExtraPanes?.();

if(
!Array.isArray(
list
)
){
return [];
}

return list.filter(
pane=>
pane?.wrapEl &&
pane?.chartEl &&
pane?.chart
);

}catch{
return [];
}

}

function ensureExtraPaneDomCrosshairs(){

extraPanes().forEach(
pane=>
ensureDomChartCrosshair(
pane.wrapEl
)
);

}

function hideExtraPaneCrosshairHorz(){

extraPanes().forEach(
pane=>{
hideDomChartCrosshairHorz(
pane.wrapEl
);
hideDomChartCrosshairVert(
pane.wrapEl
);
}
);

}

function trackPointerClient(
clientX,
clientY
){

if(
clientX ==
null ||
clientY ==
null
){
return;
}

lastPointerClientX =
clientX;
lastPointerClientY =
clientY;

}

function plotYFromLastPointer(){

const clientX =
livePointerClientX ??
lastPointerClientX;

const clientY =
livePointerClientY ??
lastPointerClientY;

if(
clientX ==
null ||
clientY ==
null
){
return null;
}

const plot =
plotCoordsFromClient(
clientX,
clientY
);

return Number.isFinite(
plot?.y
)
? plot.y
: null;

}

function crosshairClientFromParam(
param
){

const src =
param?.sourceEvent;

const cx =
src?.clientX ??
livePointerClientX ??
lastPointerClientX;

const cy =
src?.clientY ??
livePointerClientY ??
lastPointerClientY;

return {
cx,
cy
};

}

function isCrosshairPointerOnPriceScale(
param
){

const {
cx,
cy
} =
crosshairClientFromParam(
param
);

if(
cx ==
null ||
cy ==
null
){
return false;
}

return isClientOnChartPriceScale(
chartEl,
mainChart,
cx,
cy
) ||
(
linkedChartEl &&
linkedChart &&
isClientOnChartPriceScale(
linkedChartEl,
linkedChart,
cx,
cy
)
) ||
extraPanes().some(
pane=>
isClientOnChartPriceScale(
pane.chartEl,
pane.chart,
cx,
cy
)
);

}

function clearLinkedVert(){

if(
document.body.classList.contains(
"chart-probe-active"
)
){
return;
}

if(
linkedVertOverlayEl
){

linkedVertOverlayEl.classList.add(
"hidden"
);

linkedVertOverlayEl.style.removeProperty(
"left"
);

}

if(
chartWrapEl
){
hideDomChartCrosshairVert(
chartWrapEl
);
}

}

function clearLinkedHorz(){

if(
chartWrapEl
){
hideDomChartCrosshairHorz(
chartWrapEl
);
hideDomChartCrosshair(
chartWrapEl
);
}

if(
linkedWrapEl
){
hideDomChartCrosshairHorz(
linkedWrapEl
);
}

hideExtraPaneCrosshairHorz();

if(
isTabletChartViewport() &&
!document.body.classList.contains(
"chart-probe-active"
)
){
hideTabletProbeHorizInStack();
}

}

function clearLinked(){

clearLinkedVert();
clearLinkedHorz();

clearCrosshairAxisLabels(
crosshairTimeLabelEl,
crosshairPriceLabelEl
);

onLinkedCrosshairClear?.();

try{
linkedChart.clearCrosshairPosition();
}catch{
/* ignore */
}

}

function crosshairVertX(
param
){

if(
param?.time != null &&
mainChart?.timeScale
){

const snapped =
mainChart.timeScale().timeToCoordinate(
param.time
);

if(
Number.isFinite(snapped)
){
return snapped;
}

}

return param.point?.x;

}

/** DOM-линии следуют за курсором; привязка к свече — только для подписи времени / RSI. */
function crosshairOverlayPlotX(
param
){

const px =
param?.point?.x;

if(
Number.isFinite(
px
)
){
return px;
}

return crosshairVertX(
param
);

}

function linkedVertStackLeft(
plotX,
anchorEl
){

if(
!linkedVertOverlayEl ||
!Number.isFinite(
plotX
)
){
return;
}

const anchor =
anchorEl ||
chartEl;

const stackEl =
linkedVertOverlayEl.parentElement;

if(
!anchor ||
!stackEl
){

linkedVertOverlayEl.style.left =
`${Math.round(plotX)}px`;

}else{

const anchorR =
anchor.getBoundingClientRect();

const stackR =
stackEl.getBoundingClientRect();

linkedVertOverlayEl.style.left =
`${Math.round(
anchorR.left - stackR.left + plotX
)}px`;

}

linkedVertOverlayEl.classList.remove(
"hidden"
);

}

function syncMainPlotAxisLabels(
x,
plotY
){

if(
!isTabletChartViewport() ||
document.body.classList.contains(
"chart-probe-active"
) ||
!Number.isFinite(
x
)
){
return;
}

const probeTime =
resolveCrosshairPlotTime(
x,
[
mainChart,
linkedChart
]
);

updateCrosshairAxisLabels({
param:{
time: probeTime,
point:{
x,
y: plotY
}
},
timeLabelEl:crosshairTimeLabelEl,
priceLabelEl:crosshairPriceLabelEl,
snappedX:x,
plotY,
mainSeries,
mainChart,
labelWrapEl:chartWrapEl
});

if(
probeTime !=
null
){
onLinkedCrosshairTime?.(
probeTime
);
}

}

function applyMainCrosshairPlot(
x,
y
){

let plotY =
y;

if(
!Number.isFinite(
plotY
)
){
plotY =
plotYFromLastPointer();
}

if(
chartWrapEl
){
hideDomChartCrosshairVert(
chartWrapEl
);
}

if(
linkedWrapEl
){
hideDomChartCrosshairHorz(
linkedWrapEl
);
}

hideExtraPaneCrosshairHorz();

linkedVertStackLeft(
x,
chartEl
);

if(
chartWrapEl &&
chartEl &&
Number.isFinite(
plotY
)
){

positionDomChartCrosshairHorz({
wrapEl:chartWrapEl,
chartEl,
chart:mainChart,
plotY
});

if(
isTabletChartViewport() &&
!document.body.classList.contains(
"chart-probe-active"
)
){

const chartR =
chartEl.getBoundingClientRect();

positionTabletProbeHorizInStack({
chartsStackEl,
chartEl,
chart:mainChart,
clientY: chartR.top +
plotY
});

}

}

syncMainPlotAxisLabels(
x,
plotY
);

}

function applyRsiCrosshairPlot(
x,
y
){

if(
chartWrapEl
){
hideDomChartCrosshairVert(
chartWrapEl
);
hideDomChartCrosshairHorz(
chartWrapEl
);
}

hideExtraPaneCrosshairHorz();

linkedVertStackLeft(
x,
linkedChartEl ||
chartEl
);

if(
linkedWrapEl &&
linkedChartEl &&
linkedChart &&
Number.isFinite(
y
)
){

positionDomChartCrosshairHorz({
wrapEl:linkedWrapEl,
chartEl:linkedChartEl,
chart:linkedChart,
plotY:y
});

}

}

function applyLinkedCrosshairPlot(
x,
y
){

applyMainCrosshairPlot(
x,
y
);

}

function plotCoordsFromRsiClient(
clientX,
clientY
){

if(
!linkedChartEl ||
!linkedChart
){
return null;
}

if(
isClientOnChartPriceScale(
linkedChartEl,
linkedChart,
clientX,
clientY
)
){
return null;
}

const {
chartR,
plotW
} =
chartPlotMetrics(
linkedChartEl,
linkedChart
);

let x =
clientX - chartR.left;
let y =
clientY - chartR.top;

if(
x < 0 ||
x > plotW ||
y < 0 ||
y > chartR.height
){
return null;
}

return {
x,
y
};

}

function isClientOnRsiPlot(
clientX,
clientY
){

return plotCoordsFromRsiClient(
clientX,
clientY
) !=
null;

}

function plotCoordsFromExtraPaneClient(
pane,
clientX,
clientY
){

if(
!pane?.chartEl ||
!pane?.chart
){
return null;
}

if(
isClientOnChartPriceScale(
pane.chartEl,
pane.chart,
clientX,
clientY
)
){
return null;
}

const {
chartR,
plotW
} =
chartPlotMetrics(
pane.chartEl,
pane.chart
);

const x =
clientX - chartR.left;
const y =
clientY - chartR.top;

if(
x < 0 ||
x > plotW ||
y < 0 ||
y > chartR.height
){
return null;
}

return {
x,
y
};

}

function extraPaneAtPointer(
clientX,
clientY
){

if(
clientX ==
null ||
clientY ==
null
){
return null;
}

for(
const pane of
extraPanes()
){

const plot =
plotCoordsFromExtraPaneClient(
pane,
clientX,
clientY
);

if(
plot
){
return {
pane,
plot
};
}

}

return null;

}

function applyExtraPaneCrosshairPlot(
pane,
x,
y
){

ensureExtraPaneDomCrosshairs();

if(
chartWrapEl
){
hideDomChartCrosshairVert(
chartWrapEl
);
hideDomChartCrosshairHorz(
chartWrapEl
);
}

if(
linkedWrapEl
){
hideDomChartCrosshairHorz(
linkedWrapEl
);
}

extraPanes().forEach(
other=>{
hideDomChartCrosshairVert(
other.wrapEl
);

if(
other.wrapEl !==
pane.wrapEl
){
hideDomChartCrosshairHorz(
other.wrapEl
);
}

}
);

linkedVertStackLeft(
x,
pane.chartEl ||
chartEl
);

if(
Number.isFinite(
y
)
){

positionDomChartCrosshairHorz({
wrapEl:pane.wrapEl,
chartEl:pane.chartEl,
chart:pane.chart,
plotY:y
});

}

}

function showExtraPaneCrosshairFromClient(
clientX,
clientY
){

const hit =
extraPaneAtPointer(
clientX,
clientY
);

if(
!hit
){
return false;
}

if(
hideCrosshairOnAnyPriceScale(
clientX,
clientY
)
){
return true;
}

applyExtraPaneCrosshairPlot(
hit.pane,
hit.plot.x,
hit.plot.y
);

try{
mainChart.clearCrosshairPosition();
}catch{
/* ignore */
}

try{
linkedChart?.clearCrosshairPosition?.();
}catch{
/* ignore */
}

try{
hit.pane.chart.clearCrosshairPosition();
}catch{
/* ignore */
}

let probeTime =
hit.pane.chart.timeScale()?.coordinateToTime?.(
hit.plot.x
);

if(
probeTime ==
null &&
mainChart?.timeScale
){

probeTime =
mainChart.timeScale().coordinateToTime?.(
hit.plot.x
);

}

updateCrosshairAxisLabels({
param:{
time: probeTime,
point:{
x: hit.plot.x,
y: hit.plot.y
}
},
timeLabelEl:crosshairTimeLabelEl,
priceLabelEl:crosshairPriceLabelEl,
snappedX:hit.plot.x,
plotY:hit.pane.series
? hit.plot.y
: null,
mainSeries:hit.pane.series ||
null,
mainChart:hit.pane.series
? hit.pane.chart
: null,
labelWrapEl:hit.pane.series
? hit.pane.wrapEl
: null
});

return true;

}

function isClientOverChartPlots(
clientX,
clientY
){

if(
clientX ==
null ||
clientY ==
null
){
return false;
}

return (
plotCoordsFromClient(
clientX,
clientY
) !=
null ||
isClientOnRsiPlot(
clientX,
clientY
) ||
extraPaneAtPointer(
clientX,
clientY
) !=
null
);

}

function isLivePointerOverChartPlots(){

return isClientOverChartPlots(
livePointerClientX,
livePointerClientY
);

}

function hideCrosshairOnAnyPriceScale(
clientX,
clientY
){

/* На шкале оставляем только горизонталь (как TV); вертикаль/время гасим. */
return showPriceScaleHorzFromClient(
clientX,
clientY
);

}

function showRsiCrosshairFromClient(
clientX,
clientY
){

if(
!linkedWrapEl ||
!linkedChartEl ||
!linkedChart
){
return;
}

if(
hideCrosshairOnAnyPriceScale(
clientX,
clientY
)
){
return;
}

const plot =
plotCoordsFromRsiClient(
clientX,
clientY
);

if(
!plot
){
return;
}

applyRsiCrosshairPlot(
plot.x,
plot.y
);

try{
mainChart.clearCrosshairPosition();
}catch{
/* ignore */
}

try{
linkedChart.clearCrosshairPosition();
}catch{
/* ignore */
}

let probeTime =
linkedChart.timeScale().coordinateToTime?.(
plot.x
);

if(
probeTime ==
null &&
mainChart?.timeScale
){

probeTime =
mainChart.timeScale().coordinateToTime?.(
plot.x
);

}

updateCrosshairAxisLabels({
param:{
time: probeTime,
point:{
x: plot.x,
y: plot.y
}
},
timeLabelEl:crosshairTimeLabelEl,
priceLabelEl:crosshairPriceLabelEl,
snappedX:plot.x,
plotY:null,
mainSeries:null,
mainChart:null
});

const rsiVal =
linkedSeries?.coordinateToPrice?.(
plot.y
);

if(
rsiVal !=
null &&
Number.isFinite(
rsiVal
)
){
onLinkedCrosshairRsiValue?.(
rsiVal
);
}else if(
probeTime !=
null
){
onLinkedCrosshairTime?.(
probeTime
);
}

}

function plotCoordsFromClient(
clientX,
clientY
){

if(
!chartEl
){
return null;
}

if(
isClientOnChartPriceScale(
chartEl,
mainChart,
clientX,
clientY
)
){
return null;
}

const {
chartR,
plotW
} =
chartPlotMetrics(
chartEl,
mainChart
);

let x =
clientX - chartR.left;
let y =
clientY - chartR.top;

if(
x < 0 ||
x > plotW ||
y < 0 ||
y > chartR.height
){
return null;
}

return {
x,
y
};

}

function isPlotCrosshairX(
x
){

if(
!chartEl ||
!Number.isFinite(
x
)
){
return false;
}

const {
plotW
} =
chartPlotMetrics(
chartEl,
mainChart
);

return x >= -0.5 && x <= plotW + 0.5;

}

function clearMainCrosshair(){

try{
mainChart.clearCrosshairPosition();
}catch{
/* ignore */
}

}

function hideCrosshairOnPriceScale(
clientX,
clientY
){

return showPriceScaleHorzFromClient(
clientX,
clientY
);

}

/**
 * Курсор на ценовой шкале: горизонталь + цена, без вертикали.
 * Не конфликтует с «+» / зумом шкалы (линия pointer-events: none).
 */
function showPriceScaleHorzFromClient(
clientX,
clientY
){

if(
clientX ==
null ||
clientY ==
null
){
return false;
}

function paintScaleHorz(
wrapEl,
targetChartEl,
targetChart,
{
showMainPriceLabel = false,
series = null
} = {}
){

clearLinkedVert();
clearMainCrosshair();

if(
chartWrapEl &&
chartWrapEl !==
wrapEl
){
hideDomChartCrosshairHorz(
chartWrapEl
);
}

if(
linkedWrapEl &&
linkedWrapEl !==
wrapEl
){
hideDomChartCrosshairHorz(
linkedWrapEl
);
}

hideExtraPaneCrosshairHorz();

const chartR =
targetChartEl.getBoundingClientRect();
const plotY =
clientY -
chartR.top;

if(
!Number.isFinite(
plotY
) ||
!wrapEl
){
return;
}

positionDomChartCrosshairHorz({
wrapEl,
chartEl:targetChartEl,
chart:targetChart,
plotY
});

if(
crosshairTimeLabelEl
){
crosshairTimeLabelEl.classList.add(
"hidden"
);
crosshairTimeLabelEl.style.removeProperty(
"left"
);
}

if(
showMainPriceLabel
){
updateCrosshairAxisLabels({
param:{
time:null,
point:{
x:0,
y:plotY
}
},
timeLabelEl:crosshairTimeLabelEl,
priceLabelEl:crosshairPriceLabelEl,
plotY,
mainSeries,
mainChart,
labelWrapEl:chartWrapEl
});
}else if(
series
){
updateCrosshairAxisLabels({
param:{
time:null,
point:{
x:0,
y:plotY
}
},
timeLabelEl:crosshairTimeLabelEl,
priceLabelEl:crosshairPriceLabelEl,
plotY,
mainSeries:series,
mainChart:targetChart,
labelWrapEl:wrapEl
});
}else if(
crosshairPriceLabelEl
){
crosshairPriceLabelEl.classList.add(
"hidden"
);
crosshairPriceLabelEl.style.removeProperty(
"top"
);
}

}

if(
isClientOnChartPriceScale(
chartEl,
mainChart,
clientX,
clientY
)
){
paintScaleHorz(
chartWrapEl,
chartEl,
mainChart,
{
showMainPriceLabel:true
}
);
return true;
}

if(
linkedChartEl &&
linkedChart &&
linkedWrapEl &&
isClientOnChartPriceScale(
linkedChartEl,
linkedChart,
clientX,
clientY
)
){
paintScaleHorz(
linkedWrapEl,
linkedChartEl,
linkedChart
);
return true;
}

const extraHit =
extraPanes().find(
pane=>
pane?.wrapEl &&
pane?.chartEl &&
pane?.chart &&
isClientOnChartPriceScale(
pane.chartEl,
pane.chart,
clientX,
clientY
)
);

if(
extraHit
){
paintScaleHorz(
extraHit.wrapEl,
extraHit.chartEl,
extraHit.chart,
{
series:
extraHit.series ||
null
}
);
return true;
}

return false;

}

function showLinkedVert(
param
){

if(
!linkedVertOverlayEl
){
return false;
}

if(
isCrosshairPointerOnPriceScale(
param
)
){
const {
cx,
cy
} =
crosshairClientFromParam(
param
);

if(
!showPriceScaleHorzFromClient(
cx ??
livePointerClientX,
cy ??
livePointerClientY
)
){
clearLinked();
clearMainCrosshair();
}

return true;
}

const x =
crosshairOverlayPlotX(
param
);

let py =
param?.point?.y;

if(
!Number.isFinite(
py
)
){
py =
plotYFromLastPointer();
}

if(
!Number.isFinite(
x
) ||
!isPlotCrosshairX(
x
)
){
clearLinked();
clearMainCrosshair();
return true;
}

applyMainCrosshairPlot(
x,
py
);

try{
linkedChart.clearCrosshairPosition();
}catch{
/* ignore */
}

const labelParam = {
...param,
point: param.point ?? { x }
};

const labelX =
crosshairVertX(
param
);

const snappedLabelX =
Number.isFinite(
labelX
)
? labelX
: x;

if(
labelParam.time ==
null &&
mainChart?.timeScale
){

const t =
mainChart.timeScale().coordinateToTime?.(
snappedLabelX
);

if(
t != null
){
labelParam.time = t;
}

}

updateCrosshairAxisLabels({
param: labelParam,
timeLabelEl:crosshairTimeLabelEl,
priceLabelEl:crosshairPriceLabelEl,
snappedX:snappedLabelX,
plotY:py,
mainSeries,
mainChart,
labelWrapEl:chartWrapEl
});

if(
onLinkedCrosshairTime
){

onLinkedCrosshairTime(
param.time
);

}

return true;

}

function onChartWrapPointerMove(
e
){

if(
e.pointerType !==
"touch"
){
trackPointerClient(
e.clientX,
e.clientY
);
}

if(
lock
){
return;
}

if(
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
hideCrosshairOnAnyPriceScale(
e.clientX,
e.clientY
)
){
return;
}

const plot =
plotCoordsFromClient(
e.clientX,
e.clientY
);

if(
!plot
){

if(
isClientOnRsiPlot(
e.clientX,
e.clientY
)
){
showRsiCrosshairFromClient(
e.clientX,
e.clientY
);
return;
}

if(
showExtraPaneCrosshairFromClient(
e.clientX,
e.clientY
)
){
return;
}

clearLinked();
clearMainCrosshair();
return;
}

applyMainCrosshairPlot(
plot.x,
plot.y
);

}

function onRsiWrapPointerMove(
e
){

if(
e.pointerType !==
"touch"
){
trackPointerClient(
e.clientX,
e.clientY
);
}

if(
lock
){
return;
}

if(
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
!linkedWrapEl
){
return;
}

if(
hideCrosshairOnAnyPriceScale(
e.clientX,
e.clientY
)
){
return;
}

const plot =
plotCoordsFromRsiClient(
e.clientX,
e.clientY
);

if(
!plot
){

if(
plotCoordsFromClient(
e.clientX,
e.clientY
)
){
return;
}

if(
showExtraPaneCrosshairFromClient(
e.clientX,
e.clientY
)
){
return;
}

clearLinked();
clearMainCrosshair();
return;
}

showRsiCrosshairFromClient(
e.clientX,
e.clientY
);

}

function onStackPointerTrack(
e
){

if(
e.pointerType !==
"touch"
){
trackPointerClient(
e.clientX,
e.clientY
);
}

if(
lock ||
e.pointerType ===
"touch" ||
document.body.classList.contains(
"chart-probe-active"
)
){
return;
}

if(
hideCrosshairOnAnyPriceScale(
e.clientX,
e.clientY
)
){
return;
}

if(
plotCoordsFromClient(
e.clientX,
e.clientY
) ||
isClientOnRsiPlot(
e.clientX,
e.clientY
)
){
return;
}

showExtraPaneCrosshairFromClient(
e.clientX,
e.clientY
);

}

function bindLatestPointerMove(
target,
handler,
listenerOpts,
sync
){

let frame =
0;
let sample =
null;

const listener =
event=>{

if(
typeof sync ===
"function"
){
sync(
event
);
}else if(
event.pointerType !==
"touch"
){
trackPointerClient(
event.clientX,
event.clientY
);
}

sample = {
clientX:
event.clientX,
clientY:
event.clientY,
pointerType:
event.pointerType
};

if(
frame
){
return;
}

frame =
requestAnimationFrame(
()=>{

frame =
0;
const current =
sample;
sample =
null;

if(
current
){
handler(
current
);
}

}
);

};

const capture =
listenerOpts?.capture ===
true;

target.addEventListener(
"pointermove",
listener,
listenerOpts
);

return ()=>{

target.removeEventListener(
"pointermove",
listener,
capture
);

if(
frame
){
cancelAnimationFrame(
frame
);
}

frame =
0;
sample =
null;

};

}

const unbindStackPointer =
chartsStackEl
? bindLatestPointerMove(
chartsStackEl,
onStackPointerTrack,
{
passive:true,
capture:true
}
)
: ()=>{};

const unbindChartWrapPointer =
chartWrapEl
? bindLatestPointerMove(
chartWrapEl,
onChartWrapPointerMove,
{
passive:true
}
)
: ()=>{};

const unbindRsiWrapPointer =
linkedWrapEl
? bindLatestPointerMove(
linkedWrapEl,
onRsiWrapPointerMove,
{
passive:true
}
)
: ()=>{};

function onDocumentPointerMove(
e
){

if(
e.pointerType ===
"touch"
){
return;
}

livePointerClientX =
e.clientX;
livePointerClientY =
e.clientY;

if(
lock
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
!isLivePointerOverChartPlots()
){

if(
!showPriceScaleHorzFromClient(
e.clientX,
e.clientY
)
){
clearLinked();
clearMainCrosshair();
}

}

}

const unbindDocumentPointer =
bindLatestPointerMove(
document,
onDocumentPointerMove,
{
passive:true,
capture:true
},
event=>{

if(
event.pointerType ===
"touch"
){
return;
}

livePointerClientX =
event.clientX;
livePointerClientY =
event.clientY;
trackPointerClient(
event.clientX,
event.clientY
);

}
);

let crosshairMoveFrame =
0;
let crosshairMovePending =
false;
let pendingCrosshairParam =
null;

function runLinkedCrosshairMove(
param
){

if(lock){
return;
}

const liveX =
livePointerClientX ??
lastPointerClientX;
const liveY =
livePointerClientY ??
lastPointerClientY;

if(
showPriceScaleHorzFromClient(
liveX,
liveY
)
){
return;
}

if(
param.point ===
undefined
){

if(
!isLivePointerOverChartPlots()
){
clearLinked();
}

return;
}

if(
!isLivePointerOverChartPlots()
){
clearLinked();
clearMainCrosshair();
return;
}

{
const clientX =
liveX;
const clientY =
liveY;

if(
isClientOnRsiPlot(
clientX,
clientY
)
){
showRsiCrosshairFromClient(
clientX,
clientY
);
return;
}

if(
showExtraPaneCrosshairFromClient(
clientX,
clientY
)
){
return;
}

}

const overlayX =
crosshairOverlayPlotX(
param
);

if(
!isPlotCrosshairX(
overlayX
)
){
clearLinked();
clearMainCrosshair();
return;
}

if(
linkedVertOverlayEl
){

showLinkedVert(
param
);

}

}

mainChart.subscribeCrosshairMove(
param=>{

pendingCrosshairParam =
param;
crosshairMovePending =
true;

if(
crosshairMoveFrame
){
return;
}

crosshairMoveFrame =
requestAnimationFrame(
()=>{

crosshairMoveFrame =
0;

if(
!crosshairMovePending
){
return;
}

crosshairMovePending =
false;
runLinkedCrosshairMove(
pendingCrosshairParam
);

}
);

}
);

function refreshPointerCrosshair(){

if(
lock
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

const clientX =
livePointerClientX ??
lastPointerClientX;

const clientY =
livePointerClientY ??
lastPointerClientY;

if(
showPriceScaleHorzFromClient(
clientX,
clientY
)
){
return;
}

if(
!isLivePointerOverChartPlots()
){
clearLinked();
clearMainCrosshair();
return;
}

const plot =
plotCoordsFromClient(
clientX,
clientY
);

if(
plot
){

applyMainCrosshairPlot(
plot.x,
plot.y
);

return;

}

if(
isClientOnRsiPlot(
clientX,
clientY
)
){

showRsiCrosshairFromClient(
clientX,
clientY
);

return;

}

if(
showExtraPaneCrosshairFromClient(
clientX,
clientY
)
){
return;
}

clearLinked();
clearMainCrosshair();

}

return {
clearLinked,
refreshPointerCrosshair,
detachPointerCrosshair(){

unbindStackPointer();
unbindChartWrapPointer();
unbindRsiWrapPointer();
unbindDocumentPointer();

if(
crosshairMoveFrame
){
cancelAnimationFrame(
crosshairMoveFrame
);
crosshairMoveFrame =
0;
}

crosshairMovePending =
false;

},
setSuppressed(
suppressed
){

lock = !!suppressed;

if(
lock
){
clearLinked();
}

}
};

}
