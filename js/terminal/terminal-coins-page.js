import {
replayVisibleCandles,
isTerminalReplayActive
} from "./terminal-replay.js?v=1b9e6de6";

/**
 * Closure slice. `host` is the surrounding function's bindings.
 */
export function allCoinsDrawTools(host){

return [
host.drawingTools,
host.rsiDrawingTools,
host.macdDrawingTools,
host.aoDrawingTools
].filter(
Boolean
);

}

export function scheduleCoinsDrawRedraw(host){

for(
const tools of
allCoinsDrawTools(host)
){
tools.scheduleRedraw?.();
}

}

export function coinsDrawOnSymbolChange(host, 
opts
){

for(
const tools of
allCoinsDrawTools(host)
){
tools.onSymbolChange?.(
opts
);
}

}

export function coinsDrawHasActiveInteraction(host){

return allCoinsDrawTools(host).some(
tools=>
tools.hasActiveDrawInteraction?.()
);

}

export function unbindTerminalHistoryLazyLoad(host){

host.historyRangeUnsub?.();
host.historyRangeUnsub =
null;

}

export function applyCoinsChartInversion(host, 
inverted
){

host.isCoinsChartInverted =
!!inverted;

try{
host.chart.priceScale(
"right"
).applyOptions({
invertScale:
host.isCoinsChartInverted
});
}catch{
/* ignore */
}

host.drawingTools?.scheduleRedraw?.();

}

export function persistCoinsChartInversion(host){

if(
!host.isTerminalPage
){
return;
}

const prefs =
host.readCoinsPrefs();

prefs.invertChart =
host.isCoinsChartInverted;

host.writeCoinsPrefs(prefs);

}

export function toggleCoinsChartInversion(host){

if(
!host.isTerminalPage
){
return;
}

applyCoinsChartInversion(host, 
!host.isCoinsChartInverted
);
persistCoinsChartInversion(host);

}

export function applyCoinsRsiInversion(host, 
inverted
){

host.isCoinsRsiInverted =
!!inverted;

try{
host.rsiChart?.priceScale?.(
"right"
)?.applyOptions?.({
invertScale:
host.isCoinsRsiInverted
});
}catch{
/* ignore */
}

}

export function persistCoinsRsiInversion(host){

if(
!host.isTerminalPage
){
return;
}

const prefs =
host.readCoinsPrefs();

prefs.invertRsiChart =
host.isCoinsRsiInverted;

host.writeCoinsPrefs(prefs);

}

export function toggleCoinsRsiInversion(host){

if(
!host.isTerminalPage
){
return;
}

applyCoinsRsiInversion(host, 
!host.isCoinsRsiInverted
);
persistCoinsRsiInversion(host);

}

export function applyCoinsChartPriceScaleMode(host, 
mode,
opts =
{}
){

const next =
host.normalizeChartPriceScaleMode(
mode
);

const changed =
next !==
host.coinsPriceScaleMode;

host.coinsPriceScaleMode =
next;

try{
host.applyChartPriceScaleMode(
host.chart,
next
);
host.candleSeries?.priceScale?.()?.applyOptions?.({
mode:
host.lwPriceScaleModeId(
next
)
});
}catch{
/* ignore */
}

if(
opts.recalc ===
false ||
!changed
){
return;
}

host.drawingTools?.endPriceScaleDragRedraw?.();
host.rsiDrawingTools?.endPriceScaleDragRedraw?.();
host.macdDrawingTools?.endPriceScaleDragRedraw?.();
host.aoDrawingTools?.endPriceScaleDragRedraw?.();
window.__tradeChartOverlay?.onPriceScaleDragEnd?.();
scheduleCoinsDrawRedraw(host);
host.priceHudCtrl?.refresh?.();

}

export function persistCoinsChartPriceScaleMode(host){

if(
!host.isTerminalPage
){
return;
}

const prefs =
host.readCoinsPrefs();

prefs.priceScaleMode =
host.coinsPriceScaleMode;

host.writeCoinsPrefs(prefs);

}

export function setCoinsChartPriceScaleMode(host, 
mode
){

if(
!host.isTerminalPage
){
return;
}

applyCoinsChartPriceScaleMode(host, 
mode
);
persistCoinsChartPriceScaleMode(host);

}

export function isTabletCrosshairProbeLocked(host){

return !!host.coinsTabletCtrl?.getProbeActive?.();

}

export function resetCoinsChartPriceScale(host){

if(
host.tabletPriceScaleCtrl?.resetPriceAutoScale
){
host.tabletPriceScaleCtrl.resetPriceAutoScale(
{
force:true
}
);
}else{
host.pulsePriceScaleAutoscale(
host.chart,
host.candleSeries
);
}

host.priceScaleTouchHooks.onReset?.();
host.drawingTools?.endPriceScaleDragRedraw?.();
host.rsiDrawingTools?.endPriceScaleDragRedraw?.();
host.macdDrawingTools?.endPriceScaleDragRedraw?.();
host.aoDrawingTools?.endPriceScaleDragRedraw?.();
window.__tradeChartOverlay?.onPriceScaleDragEnd?.();

}

export function syncRsiHudPeriod(host){

if(
host.rsiHudPeriodEl
){
host.rsiHudPeriodEl.textContent =
String(
host.rsiPaneSettings.period
);
}

}

export function syncRsiLevelDom(host){

const wrap =
document.getElementById(
"rsi-wrap"
);

if(
!wrap
){
return;
}

const ob =
wrap.querySelector(
'[data-rsi-role="ob"]'
);
const os =
wrap.querySelector(
'[data-rsi-role="os"]'
);

if(
ob
){
ob.setAttribute(
"data-rsi-level",
String(
host.rsiPaneSettings.overbought
)
);
}

if(
os
){
os.setAttribute(
"data-rsi-level",
String(
host.rsiPaneSettings.oversold
)
);
}

}

export function onRsiSettingsChange(host, 
next
){

host.rsiPaneSettings =
host.normalizeRsiPaneSettings(
next ||
host.rsiPaneSettings
);
host.applyRsiSeriesColorMode?.(
host.rsiSeries,
host.rsiPaneSettings.colorLines ===
true
);
syncRsiHudPeriod(host);
syncRsiLevelDom(host);
rebuildRsiFromCandles(host);

}

export function rsiCrosshairUnix(host, t){

if(
t === null ||
t === undefined
){
return null;
}

if(
typeof t === "number"
){
return t;

}

if(
typeof t === "object" &&
t !== null
){

if(
typeof t.timestamp ===
"number"
){
return t.timestamp;

}

}

return null;

}

export function formatRsiHud(host, v){

if(
v === null ||
v === undefined ||
Number.isNaN(v)
){

return "—";

}

return v.toFixed(2);

}

export function rsiLookupAtOrBefore(host, ts){

for(
let i =
host.rsiPointsCache.length -
1;
i >=
0;
i--
){

if(
host.rsiPointsCache[i].time <=
ts
){

const v =
host.rsiPointsCache[i].value;

if(
v !== undefined &&
Number.isFinite(v)
){

return v;

}

}

}

return null;

}

export function setRsiHudValue(host, v){

if(
host.rsiHudValue
){

host.rsiHudValue.textContent =
formatRsiHud(host, v);

}

}

export function syncCoinsFutureTimeAnchorSeries(host){

if(
!host.coinsFutureTimeAnchorSeries ||
!host.candles.length
){
return;
}

const visibleBars =
host.terminalVisibleBars(
host.candles.length
);

const futureMargin =
host.computeChartFutureMarginBars(
visibleBars
);

if(
futureMargin <
1
){

host.coinsFutureTimeAnchorSeries.setData(
[]
);

return;

}

const period =
host.tfPeriodSec(
host.currentTF
);

const lastTime =
host.candles[
host.candles.length -
1
].time;

const anchor =
[];

for(
let i =
1;
i <=
futureMargin;
i++
){

anchor.push({
time:
lastTime +
period *
i
});

}

host.coinsFutureTimeAnchorSeries.setData(
anchor
);

}

export function buildRsiDisplayPoints(host){

if(
!host.rsiPointsCache?.length
){
return [];
}

const visibleBars =
host.terminalVisibleBars(
host.candles.length
);

const futureMargin =
host.computeChartFutureMarginBars(
visibleBars
);

return host.appendFutureWhitespaceBars(
host.rsiPointsCache,
futureMargin,
host.currentTF
);

}

export function setRsiPaneActive(host, 
active
){

host.rsiPaneActive =
!!active;

if(
host.rsiPaneActive
){
rebuildRsiFromCandles(host);
return;
}

host.rsiSeries?.setData(
[]
);
syncCoinsFutureTimeAnchorSeries(host);
layoutRsiBand(host);
setRsiHudValue(host, 
null
);

}

export function loadRsiHtfHistory(host, 
symbol,
tf,
requests
){

return host.loadMarketHistory(
symbol,
tf,
requests ||
host.terminalHistoryInitialRequests(),
{
parallel:
true,
batchGapMs:
0
}
);

}

export function symbolHasMacdAlerts(host){

const sym =
String(
host.currentSymbol ||
""
).toUpperCase();

return host.getActiveAlerts().some(
alert=>
host.isMacdAlert(
alert
) &&
String(
alert.symbol ||
""
).toUpperCase() ===
sym
);

}

export function publishMacdAlertValue(host){

const rows =
host.chartIndicators?.getIndicator?.(
"macd"
)?.getMacdDrawCandles?.() ||
[];

let last =
null;

for(
const row of
Array.isArray(
rows
)
? rows
: []
){

if(
Number.isFinite(
row?.close
)
){
last =
row.close;
}

}

if(
!Number.isFinite(
last
)
){
return;
}

host.onMacdSeriesUpdate(
{
symbol:
host.currentSymbol,
value:
last
}
);

}

export function symbolHasRsiAlerts(host){

const sym =
String(
host.currentSymbol ||
""
).toUpperCase();

return host.getActiveAlerts().some(
alert=>
host.isRsiAlert(
alert
) &&
String(
alert.symbol ||
""
).toUpperCase() ===
sym
);

}

export function publishRsiAlertValue(host, 
points
){

let last =
null;

for(
const point of
Array.isArray(
points
)
? points
: []
){

if(
Number.isFinite(
point?.value
)
){
last =
point.value;
}

}

if(
!Number.isFinite(
last
)
){
return;
}

host.onRsiSeriesUpdate(
{
symbol:
host.currentSymbol,
value:
last
}
);

}

export async function rebuildRsiFromCandles(host, 
opts =
{}
){

const liveLastOnly =
opts.liveLastOnly ===
true;

const watchRsiAlerts =
symbolHasRsiAlerts(host);

if(
!host.rsiPaneActive &&
!watchRsiAlerts
){
host.chartIndicators?.notifyCandlesUpdate?.();

if(
terminalRsiPending &&
host.symbolLoadSeq ===
terminalRsiPending.seq
){
revealTerminalRsiPane();
}

return;
}

const rsiTf =
String(
host.rsiPaneSettings.tf ||
""
).trim();
const chartTf =
String(
host.currentTF ||
""
).trim();

if(
liveLastOnly &&
rsiTf &&
rsiTf !==
chartTf
){
host.chartIndicators?.notifyCandlesUpdate?.();
return;
}

const seq =
++host.rsiRebuildSeq;
const chartCandles =
replayVisibleCandles(
host.candles
);
const points =
await host.buildChartRsiPoints(
{
chartCandles,
period:
host.rsiPaneSettings.period,
tf:
host.rsiPaneSettings.tf,
chartTf:
host.currentTF,
symbol:
host.currentSymbol,
loadHistory:
(...a)=>loadRsiHtfHistory(host, ...a)
}
);

if(
seq !==
host.rsiRebuildSeq
){
return;
}

if(
host.rsiPaneActive
){

host.rsiPointsCache =
points;

host.applyRsiSeriesColorMode?.(
host.rsiSeries,
host.rsiPaneSettings.colorLines ===
true
);

host.rsiSeries.setData(
buildRsiDisplayPoints(host)
);

syncCoinsFutureTimeAnchorSeries(host);

host.applyRsiFixedPriceScale(
host.rsiChart,
host.rsiSeries
);

host.syncLinkedChartTimescales(
host.chart,
host.rsiChart
);

layoutRsiBand(host);
noteTerminalRsiDataPlaced(host);

let last =
null;

for(
let i =
host.rsiPointsCache.length -
1;
i >=
0;
i--
){

if(
Number.isFinite(
host.rsiPointsCache[i]?.value
)
){
last =
host.rsiPointsCache[i];
break;
}

}

setRsiHudValue(host, 
last?.value ??
null
);

host.rsiDrawingTools?.scheduleRedraw?.();

}

host.chartIndicators?.notifyCandlesUpdate?.();
if(!isTerminalReplayActive()){
publishRsiAlertValue(host, 
points
);
}

}

const RSI_PANE_PENDING_CLASS =
"rsi-pane-pending";

let terminalRsiPending =
null;

export function markTerminalRsiPending(
loadSeq,
onReveal
){

terminalRsiPending =
{
seq:
loadSeq,
dataReady:
false,
viewportReady:
false,
host:
null,
running:
false,
onReveal
};

document.getElementById(
"rsi-wrap"
)?.classList.add(
RSI_PANE_PENDING_CLASS
);

}

export function revealTerminalRsiPane(){

const job =
terminalRsiPending;

terminalRsiPending =
null;

document.getElementById(
"rsi-wrap"
)?.classList.remove(
RSI_PANE_PENDING_CLASS
);

try{
job?.onReveal?.();
}catch{
/* ignore */
}

}

function armTerminalRsiReveal(
loadSeq
){

const job =
terminalRsiPending;

if(
!job ||
job.seq !==
loadSeq ||
job.running ||
!job.dataReady ||
!job.viewportReady ||
!job.host
){
return;
}

job.running =
true;

const host =
job.host;
let tries =
0;
let prevScaleW =
0;

function step(){

if(
terminalRsiPending !==
job
){
return;
}

let scaleW =
0;

try{
scaleW =
host.chart?.priceScale?.(
"right"
)?.width?.() ||
0;
}catch{
scaleW =
0;
}

tries +=
1;

const stable =
prevScaleW >
0 &&
scaleW >
0 &&
Math.abs(
scaleW -
prevScaleW
) <=
1;

prevScaleW =
scaleW;

if(
stable ||
tries >=
6
){
requestAnimationFrame(
()=>{

if(
terminalRsiPending !==
job
){
return;
}

try{
host.syncLinkedChartTimescales?.(
host.chart,
host.rsiChart
);
layoutRsiBand(
host
);
}catch{
/* chart disposed */
}

requestAnimationFrame(
()=>{

if(
terminalRsiPending ===
job
){
revealTerminalRsiPane();
}

}
);

}
);
return;
}

requestAnimationFrame(
step
);

}

step();

}

export function noteTerminalRsiDataPlaced(
host
){

const job =
terminalRsiPending;

if(
!job ||
host?.symbolLoadSeq !==
job.seq
){
return;
}

job.host =
host;
job.dataReady =
true;
armTerminalRsiReveal(
job.seq
);

}

export function noteTerminalRsiViewportReady(
loadSeq
){

const job =
terminalRsiPending;

if(
!job ||
job.seq !==
loadSeq
){
return;
}

const wrap =
document.getElementById(
"rsi-wrap"
);

if(
wrap?.classList.contains(
"indicator-pane-hidden"
)
){
revealTerminalRsiPane();
return;
}

job.viewportReady =
true;
armTerminalRsiReveal(
loadSeq
);

if(
job.dataReady ||
terminalRsiPending !==
job
){
return;
}

const started =
Date.now();

function waitForData(){

if(
terminalRsiPending !==
job
){
return;
}

if(
job.dataReady
){
return;
}

if(
Date.now() -
started >
2000
){
revealTerminalRsiPane();
return;
}

requestAnimationFrame(
waitForData
);

}

requestAnimationFrame(
waitForData
);

}

export function layoutRsiBand(host){

host.updateRsiBandLayout(
host.rsiSeries,
document.getElementById(
"rsi-band"
),
{
overbought:
host.rsiPaneSettings.overbought,
oversold:
host.rsiPaneSettings.oversold
}
);

host.updateRsiLevelLinesLayout(
host.rsiSeries,
document.getElementById(
"rsi-wrap"
)
);

}

export function candleCloseAtOrBefore(host, ts){

for(
let i =
host.candles.length -
1;
i >=
0;
i--
){

if(
host.candles[i].time <=
ts
){

return host.candles[i].close;

}

}

return null;

}

export function updateRsiHudFromCrosshairTime(host, 
time
){

const ts =
rsiCrosshairUnix(host, 
time
);

if(
ts === null
){

const tail =
host.rsiPointsCache[
host.rsiPointsCache.length -
1
];

setRsiHudValue(host, 
tail
? tail.value
: null
);

return;

}

setRsiHudValue(host, 
rsiLookupAtOrBefore(host, ts)
);

}

export function extraIndicatorCrosshairPanes(host){

const specs = [
{
id:
"macd",
wrapId:
"macd-wrap",
chartId:
"macd-chart"
},
{
id:
"volume",
wrapId:
"volume-wrap",
chartId:
"volume-chart"
},
{
id:
"ao",
wrapId:
"ao-wrap",
chartId:
"ao-chart"
}
];

const panes =
[];

for(
const spec of
specs
){

const wrapEl =
document.getElementById(
spec.wrapId
);
const chartEl =
document.getElementById(
spec.chartId
);

if(
!wrapEl ||
wrapEl.classList.contains(
"indicator-pane-hidden"
) ||
!chartEl
){
continue;
}

const paneChart =
host.chartIndicators?.getIndicator?.(
spec.id
)?.getChart?.();

if(
!paneChart
){
continue;
}

const series =
spec.id ===
"ao"
? host.chartIndicators?.getIndicator?.(
spec.id
)?.getAoSeries?.() ||
null
: null;

panes.push({
wrapEl,
chartEl,
chart:
paneChart,
series
});

}

return panes;

}

export function overlayStyleBarDelegateIfNeeded(host){

if(
!host.drawingTools
){
return null;
}

const overlays =
[
{
pane:
"rsi",
tools:
host.rsiDrawingTools
},
{
pane:
"macd",
tools:
host.macdDrawingTools
},
{
pane:
"ao",
tools:
host.aoDrawingTools
}
];
const ordered =
[
...overlays.filter(
item=>
item.pane ===
host.activeDrawPane
),
...overlays.filter(
item=>
item.pane !==
host.activeDrawPane
)
];

for(
const item of
ordered
){

const delegate =
item.tools?.getStyleBarDelegate?.();

if(
!delegate
){
continue;
}

const overlayTool =
delegate.getTool?.() ??
"cursor";
const overlaySelId =
delegate.getSelectedId?.() ??
null;
const overlayNeedsBar =
overlayTool !==
"cursor" ||
!!overlaySelId;

if(
!overlayNeedsBar
){
continue;
}

const mainTool =
host.drawingTools.getTool?.() ??
"cursor";

if(
mainTool !==
"cursor" &&
host.activeDrawPane ===
"chart"
){
return null;
}

return delegate;

}

return null;

}

export function mountSharedDrawSelectionDismiss(host){

const stackPanes =
document.getElementById(
"charts-stack-panes"
);
const indicatorsWrap =
document.getElementById(
"chart-indicators-wrap"
);

if(
!stackPanes ||
!host.drawingTools
){
return;
}

function shouldIgnoreDismissClick(
e
){

if(
indicatorsWrap?.contains(
e.target
)
){
return !!e.target.closest(
".chart-indicators-menu"
);
}

return (
host.drawingTools.isDrawChromePointerEvent?.(
e
) ??
false
);

}

function onSharedDismissClick(
e
){

if(
e.button !==
0 ||
!e.isPrimary
){
return;
}

if(
shouldIgnoreDismissClick(
e
)
){
return;
}

const mainTool =
host.drawingTools.getTool?.() ??
"cursor";
const overlayTools =
[
host.rsiDrawingTools,
host.macdDrawingTools,
host.aoDrawingTools
].filter(
Boolean
);

if(
mainTool !==
"cursor" ||
overlayTools.some(
tools=>
(
tools.getTool?.() ??
"cursor"
) !==
"cursor"
)
){
return;
}

if(
host.drawingTools.hasActiveDrawInteraction?.() ||
coinsDrawHasActiveInteraction(host)
){
return;
}

const chartWrap =
document.getElementById(
"chart-wrap"
);
const rsiWrap =
document.getElementById(
"rsi-wrap"
);
const macdWrap =
document.getElementById(
"macd-wrap"
);
const aoWrap =
document.getElementById(
"ao-wrap"
);
const target =
e.target;
const panes =
[
{
el:
chartWrap,
tools:
host.drawingTools
},
{
el:
rsiWrap,
tools:
host.rsiDrawingTools
},
{
el:
macdWrap,
tools:
host.macdDrawingTools
},
{
el:
aoWrap,
tools:
host.aoDrawingTools
}
];
const onPane =
panes.some(
pane=>
pane.el?.contains(
target
)
);
const onIndicators =
indicatorsWrap?.contains(
target
);

if(
!onPane &&
!onIndicators
){
return;
}

const anySelected =
panes.some(
pane=>
pane.tools?.getStyleBarDelegate?.()?.getSelectedId?.()
);

if(
!anySelected
){
return;
}

const hits =
panes.map(
pane=>{

if(
!pane.el?.contains(
target
)
){
return null;
}

return pane.tools?.hitTestAtClient?.(
e.clientX,
e.clientY
) ||
null;

}
);
const hitCount =
hits.filter(
Boolean
).length;

if(
hitCount ===
1
){

panes.forEach(
(
pane,
index
)=>{

if(
!hits[
index
]
){
pane.tools?.clearDrawingSelection?.();
}

}
);
host.drawingTools.syncStyleBar?.();
return;

}

if(
hitCount >
0
){
return;
}

panes.forEach(
pane=>
pane.tools?.clearDrawingSelection?.()
);
host.drawingTools.syncStyleBar?.();

}

stackPanes.addEventListener(
"click",
onSharedDismissClick,
true
);

indicatorsWrap?.addEventListener(
"click",
onSharedDismissClick,
true
);

}

export function isVisibleDrawWrap(host, 
el
){

if(
!el ||
el.classList.contains(
"indicator-pane-hidden"
)
){
return false;
}

const rect =
el.getBoundingClientRect?.();

return !!(
rect &&
rect.height >=
2
);

}

export function resolveCoinsDrawPaneFromPointer(host, 
clientY
){

if(
isVisibleDrawWrap(host, 
host.macdWrapEl
)
){

const macdRect =
host.macdWrapEl.getBoundingClientRect();

if(
clientY >=
macdRect.top &&
clientY <=
macdRect.bottom
){
return "macd";
}

}

if(
isVisibleDrawWrap(host, 
host.aoWrapEl
)
){

const aoRect =
host.aoWrapEl.getBoundingClientRect();

if(
clientY >=
aoRect.top &&
clientY <=
aoRect.bottom
){
return "ao";
}

}

if(
isVisibleDrawWrap(host, 
host.rsiWrapEl
)
){

const rsiRect =
host.rsiWrapEl.getBoundingClientRect();

if(
clientY >=
rsiRect.top &&
clientY <=
rsiRect.bottom
){
return "rsi";
}

}

const chartRect =
host.chartWrapEl?.getBoundingClientRect?.();

if(
chartRect &&
clientY >=
chartRect.top &&
clientY <=
chartRect.bottom
){
return "chart";
}

return null;

}

export function mountTerminalSharedDrawUndoKeyboard(host){

if(
host.terminalSharedDrawUndoMounted
){
return;
}

host.terminalSharedDrawUndoMounted =
true;

window.addEventListener(
"keydown",
e=>{

if(
!(
(
e.metaKey ||
e.ctrlKey
) &&
e.key ===
"z" &&
!e.shiftKey
)
){
return;
}

const ae =
document.activeElement;
const tag =
ae?.tagName;

if(
tag ===
"INPUT" ||
tag ===
"TEXTAREA" ||
ae?.isContentEditable
){
return;
}

if(
host.drawingTools?.hasActiveDrawInteraction?.() ||
coinsDrawHasActiveInteraction(host)
){
return;
}

if(
!host.sharedDrawUndo.canUndo()
){
return;
}

host.sharedDrawUndo.undo();
e.preventDefault();

},
true
);

}

export function drawToolsForPane(host, 
pane
){

if(
pane ===
"rsi"
){
return host.rsiDrawingTools;
}

if(
pane ===
"macd"
){
return host.macdDrawingTools;
}

if(
pane ===
"ao"
){
return host.aoDrawingTools;
}

return host.drawingTools;

}

export function setActiveDrawPane(host, 
pane
){

const next =
pane ===
"rsi" ||
(
pane ===
"macd" &&
host.macdDrawingTools
) ||
(
pane ===
"ao" &&
host.aoDrawingTools
)
? pane
: "chart";

if(
next ===
host.activeDrawPane
){
return;
}

const prevTools =
drawToolsForPane(host, 
host.activeDrawPane
);

const prevTool =
prevTools?.getTool?.() ??
"cursor";

if(
prevTool !==
"cursor" &&
prevTools?.blocksDrawPaneSwitch?.()
){
return;
}

host.activeDrawPane =
next;

if(
prevTool ===
"cursor" ||
!host.mainSetDrawTool ||
!host.rsiSetDrawTool
){
host.drawingTools?.syncStyleBar?.();
return;
}

host.mainSetDrawTool(
"cursor"
);
host.rsiSetDrawTool(
"cursor"
);
host.macdSetDrawTool?.(
"cursor"
);
host.aoSetDrawTool?.(
"cursor"
);

if(
next ===
"rsi"
){
host.rsiSetDrawTool(
prevTool
);
}else if(
next ===
"macd"
){
host.macdSetDrawTool?.(
prevTool
);
}else if(
next ===
"ao"
){
host.aoSetDrawTool?.(
prevTool
);
}else{
host.mainSetDrawTool(
prevTool
);
}

host.drawingTools?.syncStyleBar?.();

}

export function getRsiCandlesForDraw(host){

if(
!Array.isArray(
host.rsiPointsCache
)
){
return [];
}

return host.rsiPointsCache.map(
point=>({

time:
point.time,

open:
point.value,

high:
point.value,

low:
point.value,

close:
point.value

})
);

}

export async function initSymbols(host, 
options = {}
){

const list =
await host.loadMarketSymbols(
options
);

applyInstrumentLists(host, 
list
);

}

export function applyInstrumentLists(host, 
list
){

const lists =
host.buildMarketLists(
list
);

host.coinsState().allListings =
lists.all ||
[];

host.coinsState().allBybitSymbols =
lists.crypto ||
[];

host.coinsState().usdcListings =
lists.usdc ||
[];

host.coinsState().indicesListings =
lists.indices ||
[];

host.coinsState().newListings =
lists.new ||
[];

host.coinsState().innovationListings =
lists.innovation ||
[];

host.coinsState().stockListings =
lists.stocks ||
[];

host.coinsState().shareListings =
lists.shares ||
[];

host.coinsState().etfListings =
lists.etf ||
[];

host.coinsState().commodityListings =
lists.commodities ||
[];

host.coinsState().forexListings =
lists.forex ||
[];

host.coinsState().currencyListings =
lists.currency ||
[];

}

export function isSelectableCoinsMarket(host, 
id
){

return host.getActiveCoinsMarkets().includes(
id
) ||
host.isExtraCoinMarket(
id
);

}

export function coinsMarketHasSymbols(host, 
market
){

if(
host.isExtraCoinMarket(
market
)
){
return true;
}

const map = {
all:host.coinsState().allListings,
crypto:host.coinsState().allBybitSymbols,
new:host.coinsState().newListings,
innovation:host.coinsState().innovationListings,
usdc:host.coinsState().usdcListings,
stocks:host.coinsState().stockListings,
shares:host.coinsState().shareListings,
etf:host.coinsState().etfListings,
indices:host.coinsState().indicesListings,
commodities:host.coinsState().commodityListings,
forex:host.coinsState().forexListings,
currency:host.coinsState().currencyListings
};

return !!(
map[
market
]?.length
);

}

export async function switchCoinsMarket(host, 
nextMarket
){

if(
!isSelectableCoinsMarket(host, 
nextMarket
)
){
return;
}

host.disconnectKlineStream();

host.coinsState().currentDataset =
nextMarket;

host.applySortForCurrentMarket();
host.persistCoinsPrefs();

host.coinsState().searchQuery =
"";
host.searchQuery =
"";

const searchInput =
document.getElementById(
"coin-search"
);

if(
searchInput
){
searchInput.value =
"";
}

if(
!coinsMarketHasSymbols(host, 
nextMarket
)
){

const cached =
host.peekMarketSymbolsCache();

if(
cached?.length
){
applyInstrumentLists(host, 
cached
);
}

}

host.generateMarketData();
host.renderList();

host.resolveInitialSymbolAndTf();

applyUrlTimeframe(host);
setCoinsChartSymbol(host, 
host.currentSymbol
);
syncCoinsChartTurnover24(host, 
host.currentSymbol
);

if(
host.currentSymbol
){
void host.loadSymbol(
host.currentSymbol
);
}

if(
host.isActiveRealtimeMarketDataset(
nextMarket
) &&
!coinsMarketHasSymbols(host, 
nextMarket
)
){

void initSymbols(host, {
forceNetwork:true
}).then(
()=>{

if(
host.coinsState().currentDataset !==
nextMarket
){
return;
}

host.generateMarketData();
host.renderList();

}
).catch(
err=>{
console.warn(
"Terminal market symbols:",
err?.message ||
err
);
}
);

return;

}

void host.primeTickerSnapshots().then(
()=>{

if(
host.coinsState().currentDataset !==
nextMarket
){
return;
}

host.renderList();

}
);

}

export function restoreSymbolsFromStaleCache(host){

if(
host.allListings.length ||
host.allBybitSymbols.length
){
return true;
}

const stale =
host.peekMarketSymbolsCache();

if(
!stale?.length
){
return false;
}

applyInstrumentLists(host, 
stale
);

return (
host.allListings.length >
0 ||
host.allBybitSymbols.length >
0
);

}

export async function reloadTerminalBybitData(host){

if(
host.terminalBybitReloading
){
return;
}

host.terminalBybitReloading = true;

try{

await initSymbols(host);

await host.primeTickerSnapshots();

host.generateMarketData();

host.renderList();

host.resizeCharts();

await host.loadSymbol(
host.currentSymbol || "BTCUSDT"
);

}catch(err){

console.error(
"Terminal Bybit reload:",
err
);

}

host.terminalBybitReloading = false;

}

export function normalizeChartEventSymbol(host, 
symbol
){

return String(
symbol ||
""
).trim().toUpperCase();

}

export function dispatchChartSwitchStart(host, 
symbol,
loadSeq
){

host.setChartLayoutReady(
false
);

window.dispatchEvent(
new CustomEvent(
"chart-switch-start",
{
detail:{
symbol:
normalizeChartEventSymbol(host, 
symbol
),
loadSeq:
Number(
loadSeq
) ||
0
}
}
)
);

}

export function dispatchChartSwitchCandlesApply(host, 
symbol,
loadSeq
){

window.dispatchEvent(
new CustomEvent(
"chart-switch-candles-apply",
{
detail:{
symbol:
normalizeChartEventSymbol(host, 
symbol
),
loadSeq:
Number(
loadSeq
) ||
0
}
}
)
);

}

export function dispatchChartCandlesLoaded(host, 
symbol,
loadSeq
){

window.dispatchEvent(
new CustomEvent(
"chart-candles-loaded",
{
detail:{
symbol:
normalizeChartEventSymbol(host, 
symbol
),
loadSeq:
Number(
loadSeq
) ||
0
}
}
)
);

}

export function scheduleChartLayoutSettled(host, 
callback
){

requestAnimationFrame(
()=>{
requestAnimationFrame(
callback
);
}
);

}

export function setCoinsChartStatus(host, 
text,
visible
){

const el =
document.getElementById(
"coins-chart-status"
);

if(!el){
return;
}

el.textContent = text;

el.classList.toggle(
"hidden",
!visible
);

}

export function formatTurnover24Label(host, 
value
){

const n =
Number(
value
);

if(
!Number.isFinite(
n
) ||
n <=
0
){
return "";
}

let compact;

if(
n >=
1e6
){
compact =
`${Number((n / 1e6).toFixed(2))}M`;
}else if(
n >=
1e3
){
compact =
`${Number((n / 1e3).toFixed(2))}K`;
}else{
compact =
String(
Math.round(
n
)
);
}

return `Объем 24ч: ${compact}`;

}

export function syncCoinsChartTurnover24(host,
symbol =
host.currentSymbol
){

const el =
document.getElementById(
"coins-chart-turnover24"
);

if(
!el
){
return;
}

const item =
host.marketMap.get(
symbol
);
el.textContent =
formatTurnover24Label(host, 
item?.volume24
);

}

export function rememberTerminalHistory(host, 
symbol,
tf
){

if(
!symbol ||
!tf ||
!host.candles.length
){
return;
}

host.putHistoryCache(
host.getActiveExchangeId(),
symbol,
tf,
host.candles,
{
coversVisible:
host.candles.length >=
host.TERMINAL_VISIBLE_BARS ||
host.historyExhausted
}
);

}

export async function refreshTerminalHistoryTail(host, 
loadSeq
){

if(
loadSeq !==
host.symbolLoadSeq ||
!host.currentSymbol ||
!host.candles.length
){
return;
}

const latest =
await host.loadMarketHistory(
host.currentSymbol,
host.currentTF,
1,
{
parallel:
true,
batchGapMs:
0
}
);

if(
loadSeq !==
host.symbolLoadSeq ||
!latest?.length
){
return;
}

host.applyMergedTerminalCandles(
host.mergeCandleRows(
host.candles,
latest,
{
preferIncoming:
true,
limit:
host.getTerminalHistoryDepth()
}
),
loadSeq
);

}

export function wireCoinsLinkedDrawPanRedraw(host){

const stackEl =
document.getElementById(
"charts-stack"
);

if(
!stackEl
){
return;
}

const drawToolPeers =
()=>
allCoinsDrawTools(host);

const holdPeers =
()=>{
for(
const tools of
drawToolPeers()
){
tools.holdChartPanRedraw?.();
}
};

const bumpPeers =
()=>{
for(
const tools of
drawToolPeers()
){
tools.bumpChartPanRedraw?.();
}
};

const onLinkedPanDown =
e=>{

if(
e.button !==
0 &&
e.button !==
1
){
return;
}

if(
host.drawingTools?.blocksTabletChartPan?.() ||
host.rsiDrawingTools?.blocksTabletChartPan?.() ||
host.macdDrawingTools?.blocksTabletChartPan?.() ||
host.aoDrawingTools?.blocksTabletChartPan?.()
){
return;
}

holdPeers();

};

const onLinkedPanWheel =
()=>{
bumpPeers();
};

stackEl.addEventListener(
"mousedown",
onLinkedPanDown
);
stackEl.addEventListener(
"wheel",
onLinkedPanWheel,
{
passive:true
}
);
window.addEventListener(
"mouseup",
bumpPeers
);
window.addEventListener(
"blur",
bumpPeers
);

}

export function syncLinkedChartsLayout(host){

layoutRsiBand(host);

}

export function applyCoinsChartDisplayStyle(host, 
style
){

const next =
host.saveChartDisplayStyle(
style
);

host.candleSeries?.applyDisplayStyle?.(
next
);

const refPrice =
host.candles[host.candles.length - 1]?.close ?? 1;

host.applyChartPriceFormat(
host.candleSeries,
refPrice
);

host.drawingTools?.scheduleRedraw?.();
host.chartIndicators?.notifyMainChartOverlaysSync?.();
host.priceHudCtrl.refresh?.();

}

export function startPriceHud(host){

host.priceHudCtrl.stop?.();

host.priceHudCtrl =
host.mountChartPriceHud({
chart: host.chart,
series: host.candleSeries,
wrapEl: host.chartWrapEl,
getTf: ()=> host.currentTF,
getLastCandle: ()=>
host.candles[host.candles.length - 1]
});

}

export async function setCoinsTimeframe(host, 
tf
){

if(
!tf ||
tf === host.currentTF
){
return;
}

rememberTerminalHistory(host, 
host.currentSymbol,
host.currentTF
);

host.currentTF = tf;
host.syncPrimaryTfToLayout(
host.currentTF
);

document
.querySelectorAll(".tf-btn")
.forEach(b=>{
b.classList.toggle(
"active",
b.dataset.tf === host.currentTF
);
});

await host.loadSymbol(host.currentSymbol);

host.persistCoinsPrefs();

}

export function bindCoinsTfHotkeys(host){

window.addEventListener(
"keydown",
e=>{

if(
e.defaultPrevented
){
return;
}

if(
e.metaKey ||
e.ctrlKey ||
e.altKey ||
e.shiftKey
){
return;
}

if(
host.shouldIgnoreTypingHotkey(
e
)
){
return;
}

const tf =
host.COINS_TF_HOTKEYS[
e.key
];

if(
!tf ||
!host.COINS_TF_VALUES.has(
tf
)
){
return;
}

e.preventDefault();
void setCoinsTimeframe(host, 
tf
);

}
);

}

export function bindCoinsPositionDrawHotkeys(host){

window.addEventListener(
"keydown",
e=>{

if(
!host.isTerminalPage
){
return;
}

if(
e.defaultPrevented
){
return;
}

if(
e.metaKey ||
e.ctrlKey ||
e.altKey ||
e.shiftKey
){
return;
}

if(
shouldIgnoreListKeyNav(host, 
e
)
){
return;
}

if(
host.shouldIgnoreTypingHotkey(
e
)
){
return;
}

const tool =
host.COINS_POSITION_DRAW_HOTKEYS.get(
e.code
);

if(
!tool ||
!host.drawingTools?.pickDrawTool
){
return;
}

e.preventDefault();
host.drawingTools.pickDrawTool(
tool
);

}
);

}

export function closeAllCoinFlagMenus(host, 
exceptWrap = null
){

document.querySelectorAll(".coin-flag-wrap").forEach(wrap=>{

if(wrap === exceptWrap){
return;
}

wrap.querySelector(".coin-flag-menu")?.classList.add("hidden");

wrap.querySelector("[data-coin-flag-trigger]")?.setAttribute(
"aria-expanded",
"false"
);

});

host.syncCoinListFreezeFromFlagMenus();

}

export function applyCoinFavoriteGroup(host, 
symbol,
group
){

if(!symbol){
return;
}

const before =
JSON.stringify(
host.favorites
);

if(
group === "clear" ||
group === null
){
host.favorites =
host.setFavoriteGroup(symbol, null, host.favorites);
}else{
host.favorites =
host.setFavoriteGroup(symbol, group, host.favorites);
}

if(
JSON.stringify(
host.favorites
) ===
before
){
return;
}

host.saveFavoritesGroups(host.favorites);
host.persistFavoritesToCloud(host.favorites);

if(
group ===
"blue"
){
host.seedWatchlistTfOnBlueFlag(
symbol,
host.currentTF
);
}

const row =
host.coinElements.get(symbol);
const btn =
row?.querySelector("[data-coin-flag-trigger]");

if(btn){
updateCoinFlagButton(host, btn, symbol);
}

if(
symbol === (
host.currentSymbol ||
host.displaySymbol
)
){
updateCoinsChartHeaderFlag(host, 
symbol
);
}

if(host.flagSortActive){
host.renderList();
}

}

export function updateCoinFlagButton(host, btn, symbol){

const group =
host.getFavoriteGroup(symbol, host.favorites);

btn.className =
"flag coin-flag-btn screener-flag-btn";

if(group){
btn.classList.add(
"favorite",
`flag--${group}`
);
}

btn.title =
group
? "Снять флаг"
: "Выбрать флаг";

btn.setAttribute(
"aria-pressed",
group ? "true" : "false"
);

}

export function getCoinsChartHeaderFlagBtn(host){

return document.querySelector(
"[data-chart-header-flag]"
);

}

export function updateCoinsChartHeaderFlag(host, 
symbol
){

const sym =
String(
symbol ||
host.currentSymbol ||
host.displaySymbol ||
""
).trim().toUpperCase();

const btn =
getCoinsChartHeaderFlagBtn(host);

if(
!btn ||
!sym
){
return;
}

updateCoinFlagButton(host, 
btn,
sym
);

}

export function mountCoinsChartHeaderFlag(host){

const flagWrap =
document.getElementById(
"coins-chart-flag-wrap"
);

const flagTrigger =
flagWrap?.querySelector(
"[data-coin-flag-trigger]"
);

const flagMenu =
flagWrap?.querySelector(
".coin-flag-menu"
);

if(
!flagWrap ||
!flagTrigger ||
!flagMenu
){
return;
}

flagTrigger.addEventListener(
"click",
e=>{

e.stopPropagation();

const sym =
String(
host.currentSymbol ||
host.displaySymbol ||
""
).trim().toUpperCase();

if(
!sym
){
return;
}

if(
host.getFavoriteGroup(
sym,
host.favorites
)
){
closeAllCoinFlagMenus(host, 
flagWrap
);
flagMenu.classList.add(
"hidden"
);
flagTrigger.setAttribute(
"aria-expanded",
"false"
);
applyCoinFavoriteGroup(host, 
sym,
"clear"
);
host.syncCoinListFreezeFromFlagMenus();
return;
}

const open =
!flagMenu.classList.contains(
"hidden"
);

closeAllCoinFlagMenus(host, 
flagWrap
);

if(
open
){
flagMenu.classList.add(
"hidden"
);
flagTrigger.setAttribute(
"aria-expanded",
"false"
);
}else{
host.openChromeSurface(
flagMenu
);
flagTrigger.setAttribute(
"aria-expanded",
"true"
);
}

host.syncCoinListFreezeFromFlagMenus();

}
);

flagMenu.querySelectorAll(
"[data-flag-group]"
).forEach(
btn=>{

btn.addEventListener(
"click",
e=>{

e.stopPropagation();

const sym =
host.currentSymbol ||
host.displaySymbol;

if(
!sym
){
return;
}

flagMenu.classList.add(
"hidden"
);
flagTrigger.setAttribute(
"aria-expanded",
"false"
);
host.syncCoinListFreezeFromFlagMenus();

applyCoinFavoriteGroup(host, 
sym,
btn.dataset.flagGroup
);

}
);

}
);

updateCoinsChartHeaderFlag(host, 
host.currentSymbol ||
host.displaySymbol
);

}

export function syncFavoriteButtonsFromStorage(host){

host.favorites =
host.loadFavoritesGroups();

host.coinElements.forEach((el, symbol)=>{

const group =
host.getFavoriteGroup(symbol, host.favorites);

const btn =
el.querySelector("[data-coin-flag-trigger]");

if(btn){
updateCoinFlagButton(host, btn, symbol);
}

});

updateCoinsChartHeaderFlag(host, 
host.currentSymbol ||
host.displaySymbol
);

}

export function syncCoinVolumeFilterInput(host){

host.syncMinVolumeFilterInput(
document.getElementById(
"coin-volume-filter"
),
host.coinsState().minVolumeFilter
);

}

export function commitCoinVolumeFilterFromInput(host){

const el =
document.getElementById(
"coin-volume-filter"
);

if(
!el
){
return;
}

const n =
host.normalizeMinVolume(
host.parseMinVolumeFilter(
el.value
)
);

if(
n ===
host.normalizeMinVolume(
host.coinsState().minVolumeFilter
)
){
return;
}

host.coinsState().minVolumeFilter =
n;

}

export function mountCoinVolumeFilter(host){

const coinVolumeFilterEl =
document.getElementById(
"coin-volume-filter"
);

if(
!coinVolumeFilterEl
){
return;
}

syncCoinVolumeFilterInput(host);

if(
host.coinVolumeFilterMounted
){
return;
}

host.coinVolumeFilterMounted =
true;

host.mountMinVolumeFilterInput(
coinVolumeFilterEl,
{
onCommit(
next
){

const n =
host.normalizeMinVolume(
next
);

if(
n ===
host.normalizeMinVolume(
host.coinsState().minVolumeFilter
)
){
return;
}

host.coinsState().minVolumeFilter =
n;
host.persistCoinsPrefs();
host.renderList();

}
}
);

}

export function shouldIgnoreListKeyNav(host, e){

const target =
e.target;

if(!target){
return false;
}

const tag =
target.tagName?.toLowerCase();

if(
tag === "input" ||
tag === "textarea" ||
tag === "select" ||
tag === "button"
){
return true;
}

if(target.isContentEditable){
return true;
}

return false;

}

export async function navigateCoinsList(host, 
direction
){

const symbols =
host.getVisibleSymbolList();

if(
!symbols.length
){
return;
}

const goDown =
direction >
0;

let index =
symbols.indexOf(
host.currentSymbol
);

if(
index <
0
){
index = goDown ? -1 : 0;
}

if(goDown){
index = (index + 1) % symbols.length;
}else{
index = (index - 1 + symbols.length) % symbols.length;
}

const next =
symbols[index];

if(
!next ||
next === host.currentSymbol
){
return;
}

host.currentSymbol =
next;
setCoinsChartSymbol(host, 
next
);
host.highlightActiveSymbol();
host.ensureActiveCoinVisible();
await host.loadSymbol(
next
);

}

export function syncCoinsTabletListNav(host){

const show =
host.isTerminalPage &&
host.isTabletChartViewport();

document.body.classList.toggle(
"coins-tablet-list-nav-on",
show
);

if(
!show
){
return;
}

const list =
document.getElementById(
"list"
);

if(
!list
){
return;
}

let nav =
document.getElementById(
"coins-list-tablet-nav"
);

if(
!nav
){

nav =
document.createElement(
"div"
);

nav.id = "coins-list-tablet-nav";
nav.className = "coins-list-tablet-nav";
nav.setAttribute(
"aria-label",
"Листание списка монет"
);

const up =
document.createElement(
"button"
);

up.type = "button";
up.className = "coins-list-scroll-btn coins-list-scroll-btn--up";
up.id = "coins-list-scroll-up";
up.textContent = "▲ Вверх по списку";

const down =
document.createElement(
"button"
);

down.type = "button";
down.className = "coins-list-scroll-btn coins-list-scroll-btn--down";
down.id = "coins-list-scroll-down";
down.textContent = "▼ Вниз по списку";

up.addEventListener(
"click",
()=>{
void navigateCoinsList(host, 
-1
);
}
);

down.addEventListener(
"click",
()=>{
void navigateCoinsList(host, 
1
);
}
);

nav.append(
up,
down
);

}

host.placeCoinsTabletListNav(
nav,
list
);

}

export function formatCoinsSymbolLabel(host, 
symbol
){

const sym =
symbol ||
host.displaySymbol ||
host.currentSymbol;

if(
!sym
){
return "—";
}

return host.formatExchangeDisplayLabel(
host.getActiveExchangeId(),
sym
);

}

export function syncCoinsPageTitle(host){

if(
!host.isTerminalPage
){
return;
}

const label =
formatCoinsSymbolLabel(host);

document.title =
label &&
label !==
"—"
? `${label} — Multichart`
:"Multichart";

}

export function setCoinsChartSymbol(host, 
symbol
){

const sym =
symbol
? String(symbol).trim().toUpperCase()
: "";

if(!sym){
return;
}

host.displaySymbol = sym;

const el =
document.getElementById(
"current-symbol"
);

if(!el){
return;
}

el.textContent =
formatCoinsSymbolLabel(host, sym);

window.dispatchEvent(
new CustomEvent(
"coins-chart-symbol-changed",
{
detail:{
symbol:
sym
}
}
)
);

updateCoinsChartHeaderFlag(host, 
sym
);

syncCoinsPageTitle(host);

}

export function syncCoinsSymbolLabel(host){

setCoinsChartSymbol(host, 
host.currentSymbol
);

}

export function applyUrlTimeframe(host){

document
.querySelectorAll(".tf-btn")
.forEach(btn=>{

btn.classList.toggle(
"active",
btn.dataset.tf === host.currentTF
);

});

}

export function syncCoinsMarketFilterOptions(host){

const marketFilter =
document.getElementById(
"market-filter"
);

if(
!marketFilter
){
return;
}

const markets =
[
...host.getActiveExchangeMarkets(),
...host.getExtraCoinMarkets()
];
const prev =
marketFilter.value;

marketFilter.innerHTML =
markets.map(
m=>
`<option value="${m.id}">${m.label}</option>`
).join(
""
);

const allowed =
markets.map(
m=>
m.id
);

if(
allowed.includes(
prev
)
){
marketFilter.value =
prev;
}else if(
allowed.includes(
host.currentDataset
)
){
marketFilter.value =
host.currentDataset;
}else{
marketFilter.value =
"all";
host.currentDataset =
"all";
}

}

export async function handleExchangeChanged(host, 
e
){

const prevExchangeId =
String(
e?.detail?.previousExchangeId ||
""
).trim().toLowerCase();

if(
prevExchangeId &&
host.currentSymbol
){
host.saveLastViewForExchange(
prevExchangeId,
host.currentSymbol,
host.currentTF
);
}

host.stopTickerStream();
host.disconnectKlineStream();

host.favorites =
host.loadFavoritesGroups();

syncCoinsMarketFilterOptions(host);

host.coinsState().allListings =
[];
host.coinsState().allBybitSymbols =
[];
host.coinsState().usdcListings =
[];
host.coinsState().indicesListings =
[];
host.coinsState().newListings =
[];
host.coinsState().innovationListings =
[];
host.coinsState().stockListings =
[];
host.coinsState().shareListings =
[];
host.coinsState().etfListings =
[];
host.coinsState().commodityListings =
[];
host.coinsState().forexListings =
[];
host.coinsState().currencyListings =
[];

if(
!isSelectableCoinsMarket(host, 
host.currentDataset
)
){
host.currentDataset =
"all";
}

const cachedSymbols =
host.peekMarketSymbolsCache();

if(
cachedSymbols?.length
){
applyInstrumentLists(host, 
cachedSymbols
);
host.generateMarketData();
host.renderList();
}

await refreshCoinsMarketUi(host).catch(
err=>{
console.warn(
"Terminal exchange switch:",
err
);
}
);

if(
host.hasUrlSymbol &&
host.currentSymbol &&
host.getCurrentSymbols().includes(
host.currentSymbol
)
){
applyUrlTimeframe(host);
await host.loadSymbol(
host.currentSymbol
);
return;
}

host.hasUrlSymbol = false;

host.resolveSymbolForExchange(
host.getActiveExchangeId()
);

applyUrlTimeframe(host);

await host.loadSymbol(
host.currentSymbol
);

}

export async function refreshCoinsMarketUi(host){

try{

await initSymbols(host);

}catch(
err
){

console.warn(
"Terminal symbols:",
err
);

restoreSymbolsFromStaleCache(host);

}

if(
host.isActiveRealtimeMarketDataset(
host.currentDataset
) &&
!coinsMarketHasSymbols(host, 
host.currentDataset
)
){

try{

await initSymbols(host, {
forceNetwork:true
});

}catch(
retryErr
){

console.warn(
"Terminal symbols retry:",
retryErr
);

restoreSymbolsFromStaleCache(host);

}

}

if(
host.hasUrlSymbol &&
host.currentSymbol &&
!host.getCurrentSymbols().includes(host.currentSymbol)
){
host.hasUrlSymbol = false;
}

host.generateMarketData();

host.renderList();

try{

await host.primeTickerSnapshots();

}catch(
err
){

console.warn(
"Terminal tickers:",
err
);

}

syncCoinsChartTurnover24(host, 
host.currentSymbol
);

host.renderList();

host.resizeCharts();

host.stopTickerStream();
host.applyCoinsListRefreshInterval();
host.startTickerStream();

}

export async function syncTerminalAlgoEarlyT3List(host){

if(
!(
window.cryptoTerminalDesktop?.isDesktop ||
window.cryptoTerminalDesktop?.webTrading
) ||
!host.isAlgoTradingNavEnabled()
){
host.terminalAlgoEarlyT3ListMod?.unmountTerminalAlgoEarlyT3List?.();
if(
!isSelectableCoinsMarket(host, 
host.currentDataset
)
){
host.currentDataset =
"all";
}
syncCoinsMarketFilterOptions(host);
return;
}

try{
if(
!host.terminalAlgoEarlyT3ListMod
){
host.terminalAlgoEarlyT3ListMod =
await import(
"../algo-trading/terminal-early-t3-list.js?v=7c9503e9"
);
}
host.terminalAlgoEarlyT3ListMod.mountTerminalAlgoEarlyT3List();
}catch(
err
){
console.warn(
"[terminal] algo early t3 list:",
err
);
}

syncCoinsMarketFilterOptions(host);

}
