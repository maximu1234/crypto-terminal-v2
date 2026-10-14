/**
 * Closure slice. `host` is the surrounding function's bindings.
 */
export function setupTabletNativeSelectionBlock(host){

if(
!host.isCoarseTouchViewport()
){
return ()=>{};
}

const cap = {
capture:true
};

const touchCap = {
capture:true,
passive:false
};

const chartsStack =
document.getElementById(
"charts-stack"
);

const targets =
[
host.wrapEl,
host.styleBar,
host.tools,
chartsStack
].filter(
Boolean
);

const onBlock =
e=>{

if(
!host.shouldSuppressNativeSelection()
){
return;
}

e.preventDefault();

};

const onTouchBlock =
e=>{

if(
!host.shouldSuppressNativeSelection()
){
return;
}

if(
e.touches?.length >
1
){
return;
}

e.preventDefault();

};

for(
const el of
targets
){
el.addEventListener(
"selectstart",
onBlock,
cap
);
el.addEventListener(
"contextmenu",
onBlock,
cap
);
el.addEventListener(
"touchstart",
onTouchBlock,
touchCap
);
el.addEventListener(
"touchmove",
onTouchBlock,
touchCap
);
}

return ()=>{

for(
const el of
targets
){
el.removeEventListener(
"selectstart",
onBlock,
cap
);
el.removeEventListener(
"contextmenu",
onBlock,
cap
);
el.removeEventListener(
"touchstart",
onTouchBlock,
touchCap
);
el.removeEventListener(
"touchmove",
onTouchBlock,
touchCap
);
}

document.body.classList.remove(
"tablet-chart-draw-mode"
);

};

}

export function drawBrushPlacementPreview(host, 
ctx,
plotW,
h
){

const stroke =
host.brushPlacementCtl?.getBrushStroke?.();

if(
!stroke?.points?.length
){
return;
}

const pts =
stroke.points;

if(
pts.length <
1
){
return;
}

const style =
host.baseDefaultStyle(
"brush"
);

if(
pts.length >=
2
){

host.drawShape(
ctx,
{
type: "brush",
path: pts,
p1: pts[
0
],
p2: pts[
pts.length -
1
],
color: style.color,
lineWidth: style.lineWidth
},
plotW,
h
);

}

const start =
host.toXY(
pts[
0
]
);
const end =
host.toXY(
pts[
pts.length -
1
]
);

if(
start
){
host.drawAnchorCircle(
ctx,
start.x,
start.y
);
}

if(
end &&
pts.length >
1
){
host.drawAnchorCircle(
ctx,
end.x,
end.y
);
}

}

export function drawChartRulerOverlay(host, 
ctx,
plotW,
plotH
){

if(
!host.chartRulerStart ||
!host.chartRulerEndPlot
){
return;
}

const startXY =
host.toXY(
host.chartRulerStart
);

if(
!startXY
){
return;
}

const endPoint =
host.pointFromXY(
host.chartRulerEndPlot.x,
host.chartRulerEndPlot.y
);

if(
!endPoint
){
return;
}

const metrics =
host.computeChartRulerMetrics(
host.chartRulerStart,
endPoint,
host.candleSeries()
);

const goesDown =
host.isChartRulerGoingDown(
startXY,
host.chartRulerEndPlot
);

host.drawChartRuler(
ctx,
startXY,
host.chartRulerEndPlot,
goesDown
);

try{

host.updateChartRulerLabelEl(
host.chartRulerLabelEl,
{
bx: host.chartRulerEndPlot.x,
by: host.chartRulerEndPlot.y,
goesDown,
metrics,
plotW,
plotH
}
);

}catch(
labelErr
){
console.warn(
"chart ruler label",
labelErr
);
}

}

export function setTool(host, 
next,
pointerType
){

host.tool = next;
host.cancelPlacement();

host.wrapEl.classList.toggle(
"chart-draw-interaction",
next !==
"cursor"
);

if(
host.isCoarseTouchViewport() ||
host.isTabletChartViewport()
){
document.body.classList.toggle(
"tablet-chart-draw-mode",
next !==
"cursor"
);
}

if(
next !==
"cursor"
){
host.desktopEdit?.clearDrawingSelection?.();
}

if(
next !==
"cursor"
){
host.clearChartRuler();
host.notifyTabletChartGestureAbort();

if(
host.isActive() &&
next !==
"brush"
){
host.startPlacement(
next,
pointerType
);
}

}else{
host.notifyTabletChartGestureAbort();
}

host.tools.querySelectorAll("[data-draw-tool]").forEach(btn=>{
btn.classList.toggle(
"active",
btn.dataset.drawTool === host.tool
);
});

host.syncElliottGroupActive(
host.tools,
host.tool
);
host.syncFibGroupActive(
host.tools,
host.tool
);

host.updateStyleBar();
host.redraw();

}

export function pickDrawTool(host, 
next,
pointerType
){

if(
!next
){
return;
}

host.closeElliottFlyout();
host.closeFibFlyout();

const now =
performance.now();

if(
host.lastToolPickStamp.name ===
next &&
now - host.lastToolPickStamp.at <
400
){
return;
}

host.lastToolPickStamp = {
name: next,
at: now
};

if(
next ===
"cursor"
){
setTool(host, 
"cursor"
);
host.closeAllWidgetDrawToolsMenus();
return;
}

if(
host.tool ===
next
){
setTool(host, 
"cursor"
);
host.closeAllWidgetDrawToolsMenus();
return;
}

if(
host.drawingsHidden
){
setDrawingsHidden(host, 
false
);
}

setTool(host, 
next,
pointerType
);

host.closeAllWidgetDrawToolsMenus();

}

export function deleteSelected(host){

const ids =
host.selectedIds.size
? host.selectedIdsList()
: host.selectedId
? [
host.selectedId
]
: [];

if(
!ids.length
){
return;
}

host.textEditor?.close?.(
false
);

const idSet =
new Set(
ids
);

const symDel =
String(
host.getSymbol() ||
""
).trim().toUpperCase();

for(
const removed of host.drawings.filter(
d=>
idSet.has(
d.id
)
)
){

if(
removed?.id &&
symDel
){
host.recordDrawingTombstone(
symDel,
removed.id
);
}

}

host.drawings =
host.drawings.filter(
d=>
!idSet.has(
d.id
)
);
host.desktopEdit.clearDrawingSelection();
host.saveDrawings();
host.updateStyleBar();
host.redraw();

}

export function handleChartRulerClick(host, 
point,
param
){

if(
host.tool !==
"cursor" ||
!host.isChartRulerShiftActive(
param
) ||
!point
){
return false;
}

if(
host.chartRulerStart
){
host.clearChartRuler();
host.redraw();
return true;
}

host.chartRulerStart = {
time: point.time,
price: point.price
};

const startPlot =
host.toXY(
host.chartRulerStart
);

host.chartRulerEndPlot = {
x: param.point?.x ??
startPlot?.x ??
0,
y: param.point?.y ??
startPlot?.y ??
0
};

host.syncChartRulerLayerClass();
host.redraw();

return true;

}

export function clearAllDrawingsOnChart(host){

if(!host.alive){
return false;
}

const sym =
String(host.getSymbol() || "").trim().toUpperCase();

for(
const d of host.drawings
){
host.recordDrawingTombstone(
sym,
d.id
);
}

host.drawings = [];
host.applyPrimarySelectedId(
null
);
host.cancelPlacement();
host.saveDrawings();

window.dispatchEvent(
new CustomEvent(
"drawings-updated",
{
detail:{
symbol: sym,
cleared: true
}
}
)
);

host.updateStyleBar();
host.scheduleRedraw();

if(
host.clearAllPeers?.call
){
try{
host.clearAllPeers.call();
}catch{
/* ignore */
}
}

return true;

}

export function bindClearAllToolbarButtons(host){

const buttons =
host.tools.querySelectorAll(
".draw-tool-clear-all"
);

buttons.forEach(btn=>{

if(
btn.dataset.clearAllBound ===
"1"
){
return;
}

btn.dataset.clearAllBound = "1";

const runClear = e=>{

e.preventDefault();
e.stopPropagation();
clearAllDrawingsOnChart(host);

};

btn.addEventListener(
"pointerdown",
runClear,
true
);

btn.addEventListener(
"click",
runClear
);

});

}

export function setDrawingsHidden(host, 
next
){

const hidden =
!!next;

if(
hidden ===
host.drawingsHidden
){
host.syncDrawingsHiddenButton();
return;
}

host.drawingsHidden =
hidden;

if(
hidden
){
host.textEditor?.close?.(
false
);
host.applyPrimarySelectedId(
null
);
try{
host.cancelPlacement?.();
}catch{
/* ignore */
}
host.updateStyleBar?.();
}

host.syncDrawingsHiddenButton();
host.scheduleRedraw?.();

}

export function handleToolbarToolPick(host, 
e
){

const btn =
e.target.closest?.(
"[data-draw-tool]"
);

if(
!btn ||
!host.tools.contains(
btn
)
){
return false;
}

if(
btn.closest(
".widget-draw-tools-menu"
) ||
btn.closest(
".widget-draw-tools-toggle"
)
){
return false;
}

e.preventDefault();
e.stopPropagation();
pickDrawTool(host, 
btn.dataset.drawTool,
e.pointerType
);
return true;

}
