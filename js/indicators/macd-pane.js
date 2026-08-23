/**
 * MACD — гистограмма + линии на отдельной панели (как AO / TV MACD).
 */
import {
createVolumeChart,
syncLinkedChartTimescales,
linkPairedChartTimeScales,
appendFutureWhitespaceBars,
computeChartFutureMarginBars,
coinsTfVisibleBars
} from "../chart-import.js?v=48";

import {
calculateMacd,
defaultMacdSettings,
formatMacdLegendValue,
macdHistColor,
MACD_LINE_COLOR,
MACD_SIGNAL_COLOR,
normalizeMacdSettings
} from "./macd-math.js?v=3";

import {
formatHtfTfLegend,
htfTfSelectHtml,
projectHtfRowsOntoChart,
resolveIndicatorSourceCandles
} from "./htf-project.js?v=2";

import {
isChartLayoutReady
} from "../chart-layout-gate.js?v=2";

import {
isBottomIndicatorPane
} from "./indicator-pane-order.js?v=2";

import {
syncPaneViewportAfterData
} from "./indicator-pane-viewport.js?v=4";

export const MACD_PANE_ID =
"macd";

function buildMacdDisplayPoints(
candles,
tf,
visibleBarsCap,
macdRows
){

if(
!candles?.length
){
return [];
}

const byTime =
new Map(
(
Array.isArray(
macdRows
)
? macdRows
: []
).map(
row=>[
row.time,
row
]
)
);
const cap =
typeof visibleBarsCap ===
"number"
? visibleBarsCap
: null;
const visibleBars =
typeof cap ===
"number" &&
cap >
0
? Math.min(
cap,
candles.length
)
: coinsTfVisibleBars(
tf,
candles.length
);

const futureMargin =
computeChartFutureMarginBars(
visibleBars
);

const merged =
candles.map(
bar=>{

const row =
byTime.get(
bar.time
);

return {
time:
bar.time,
macd:
row?.macd ??
null,
signal:
row?.signal ??
null,
hist:
row?.hist ??
null
};

}
);

return appendFutureWhitespaceBars(
merged,
futureMargin,
tf
);

}

export function createMacdPaneIndicator(
getHost,
settingsStore
){

let enabled =
false;
let chart =
null;
let histSeries =
null;
let macdSeries =
null;
let signalSeries =
null;
let unbindTimeSync =
null;
let lastMacd =
null;
let lastSignal =
null;
let lastHist =
null;
let lastMacdDrawCandles =
[];
let settings =
defaultMacdSettings();
let refreshSeq =
0;

function readSettings(){

settings =
normalizeMacdSettings(
settingsStore?.read?.(
MACD_PANE_ID,
defaultMacdSettings()
) ||
defaultMacdSettings()
);

}

function persistSettings(
patch
){

settings =
normalizeMacdSettings(
settingsStore?.write?.(
MACD_PANE_ID,
patch
) ||
patch
);

}

function wrapEl(){

return document.getElementById(
"macd-wrap"
);

}

function chartEl(){

return document.getElementById(
"macd-chart"
);

}

function hudTitleEl(){

return document.getElementById(
"macd-hud-title"
);

}

function hudMacdEl(){

return document.getElementById(
"macd-hud-macd"
);

}

function hudSignalEl(){

return document.getElementById(
"macd-hud-signal"
);

}

function hudHistEl(){

return document.getElementById(
"macd-hud-hist"
);

}

function getLegendText(){

return `MACD ${settings.fastLength} ${settings.slowLength} ${settings.signalLength}${formatHtfTfLegend(
settings.tf
)}`;

}

function updateHud(){

const title =
hudTitleEl();

if(
title
){
title.textContent =
getLegendText();
}

const macdEl =
hudMacdEl();

if(
macdEl
){
macdEl.textContent =
formatMacdLegendValue(
lastMacd
);
}

const signalEl =
hudSignalEl();

if(
signalEl
){
signalEl.textContent =
formatMacdLegendValue(
lastSignal
);
}

const histEl =
hudHistEl();

if(
histEl
){
histEl.textContent =
formatMacdLegendValue(
lastHist
);
}

}

function updateTimeScaleVisibility(){

if(
!chart
){
return;
}

const showTimeScale =
isBottomIndicatorPane(
MACD_PANE_ID
);

chart.timeScale().applyOptions(
{
visible:
showTimeScale,
timeVisible:
showTimeScale,
ticksVisible:
showTimeScale
}
);

}

function bindTimeSync(){

unbindTimeSync?.();
unbindTimeSync =
null;

const mainChart =
getHost?.()?.chart;

if(
!mainChart ||
!chart
){
return;
}

unbindTimeSync =
linkPairedChartTimeScales(
mainChart,
chart,
updateTimeScaleVisibility,
{
linkedDrivesMain:
false,
isLocked:()=>
!isChartLayoutReady()
}
);

syncLinkedChartTimescales(
mainChart,
chart
);
updateTimeScaleVisibility();

}

function ensureChart(){

if(
chart
){
return true;
}

const el =
chartEl();

if(
!el
){
return false;
}

const created =
createVolumeChart(
el
);

chart =
created.chart;
histSeries =
created.series;

histSeries.applyOptions(
{
base:
0,
lastValueVisible:
false,
priceLineVisible:
false,
priceFormat:{
type:
"price",
precision:
5,
minMove:
0.00001
}
}
);

macdSeries =
chart.addLineSeries(
{
color:
MACD_LINE_COLOR,
lineWidth:
1,
priceLineVisible:
false,
lastValueVisible:
false,
crosshairMarkerVisible:
false
}
);

signalSeries =
chart.addLineSeries(
{
color:
MACD_SIGNAL_COLOR,
lineWidth:
1,
priceLineVisible:
false,
lastValueVisible:
false,
crosshairMarkerVisible:
false
}
);

return true;

}

function destroyChart(){

unbindTimeSync?.();
unbindTimeSync =
null;

if(
chart
){
try{
chart.remove();
}catch{
/* ignore */
}
}

chart =
null;
histSeries =
null;
macdSeries =
null;
signalSeries =
null;
lastMacd =
null;
lastSignal =
null;
lastHist =
null;
lastMacdDrawCandles =
[];

}

function applyVisibility(){

wrapEl()?.classList.toggle(
"indicator-pane-hidden",
!enabled
);

}

function ensurePaneChartSized(){

if(
!enabled ||
!chart
){
return;
}

const host =
getHost?.();

const w =
host?.getChartWrapWidth?.() ||
0;

if(
w >
0
){
onResize(
w
);
}

}

function pulseMacdAutoscale(){

if(
!chart
){
return;
}

try{
const ps =
chart.priceScale(
"right"
);

ps.applyOptions({
autoScale:
false
});

ps.applyOptions({
autoScale:
true,
scaleMargins:{
top:
0.1,
bottom:
0.1
}
});
}catch{
/* ignore */
}

}

function syncMacdAfterData(){

syncPaneViewportAfterData(
getHost,
chart,
{
pulseAutoscale:
pulseMacdAutoscale,
updateTimeScaleVisibility
}
);

}

function refreshData(){

const host =
getHost?.();

const paint =
enabled &&
histSeries &&
macdSeries &&
signalSeries;

const watchAlerts =
host?.shouldWatchMacdAlerts?.();

if(
!paint &&
!watchAlerts
){
return;
}

if(
paint
){
ensurePaneChartSized();
}

const raw =
host?.getCandles?.() ||
[];

const chartTf =
host?.getTf?.() ||
"D";

const seq =
++refreshSeq;

void (
async()=>{

const resolved =
await resolveIndicatorSourceCandles(
{
tf:
settings.tf,
chartTf,
chartCandles:
raw,
symbol:
host?.getSymbol?.(),
loadHistory:
host?.loadIndicatorHistory
}
);

if(
seq !==
refreshSeq
){
return;
}

const stillPaint =
enabled &&
histSeries &&
macdSeries &&
signalSeries;

const stillWatch =
getHost?.()?.shouldWatchMacdAlerts?.();

if(
!stillPaint &&
!stillWatch
){
return;
}

const macdRows =
calculateMacd(
resolved.candles,
settings
);
const aligned =
resolved.projected
? projectHtfRowsOntoChart(
raw,
macdRows
)
: macdRows;

lastMacdDrawCandles =
(
Array.isArray(
aligned
)
? aligned
: []
).filter(
row=>
Number.isFinite(
row?.macd
)
).map(
row=>({
time:
row.time,
open:
row.macd,
high:
row.macd,
low:
row.macd,
close:
row.macd
})
);

if(
!stillPaint
){
lastMacd =
null;
lastSignal =
null;
lastHist =
null;
getHost?.()?.onIndicatorDataReady?.(
"macd"
);
return;
}

const points =
buildMacdDisplayPoints(
raw,
chartTf,
host?.getVisibleBarsCap?.(),
aligned
);

let prevHist =
null;
lastMacd =
null;
lastSignal =
null;
lastHist =
null;

const histData =
[];
const macdData =
[];
const signalData =
[];

for(
const bar of points
){

const hist =
bar.hist;
const macd =
bar.macd;
const signal =
bar.signal;

if(
hist ==
null ||
!Number.isFinite(
hist
)
){
histData.push(
{
time:
bar.time,
value:
0,
color:
"rgba(120,123,134,0.2)"
}
);
}else{
histData.push(
{
time:
bar.time,
value:
hist,
color:
macdHistColor(
hist,
prevHist
)
}
);
prevHist =
hist;
lastHist =
hist;
}

if(
macd ==
null ||
!Number.isFinite(
macd
)
){
macdData.push(
{
time:
bar.time
}
);
}else{
macdData.push(
{
time:
bar.time,
value:
macd
}
);
lastMacd =
macd;
}

if(
signal ==
null ||
!Number.isFinite(
signal
)
){
signalData.push(
{
time:
bar.time
}
);
}else{
signalData.push(
{
time:
bar.time,
value:
signal
}
);
lastSignal =
signal;
}

}

histSeries.setData(
histData
);
macdSeries.setData(
macdData
);
signalSeries.setData(
signalData
);
syncMacdAfterData();
updateHud();
getHost?.()?.onIndicatorDataReady?.(
"macd"
);

}
)();

}

function enable(){

if(
enabled
){
return;
}

if(
!ensureChart()
){
return;
}

readSettings();
enabled =
true;
applyVisibility();
ensurePaneChartSized();
refreshData();
bindTimeSync();
updateHud();

}

function disable(){

if(
!enabled
){
return;
}

enabled =
false;
unbindTimeSync?.();
unbindTimeSync =
null;

histSeries?.setData(
[]
);
macdSeries?.setData(
[]
);
signalSeries?.setData(
[]
);

lastMacd =
null;
lastSignal =
null;
lastHist =
null;
lastMacdDrawCandles =
[];
updateHud();
applyVisibility();
refreshData();

}

function applySettings(
stored
){

settings =
normalizeMacdSettings(
stored ||
settings
);
refreshData();
updateHud();

}

function onSymbolChange(){

refreshData();

}

function onCandlesUpdate(){

refreshData();

}

function syncViewport(
ctx
){

if(
!enabled ||
!chart ||
!ctx?.mainChart
){
return;
}

ctx.applyCoinsChartViewport?.(
ctx.mainChart,
chart,
ctx.candles,
ctx.tf,
ctx.chartWidth,
ctx.realCandleCount,
ctx.visibleBarsCap
);
updateTimeScaleVisibility();

}

function onLayoutChange(){

updateTimeScaleVisibility();

if(
enabled &&
chart
){
syncLinkedChartTimescales(
getHost?.()?.chart,
chart
);
}

}

function onResize(
width
){

if(
!enabled ||
!chart
){
return;
}

const paneHeight =
wrapEl()?.getBoundingClientRect().height ||
0;

if(
paneHeight <
2
){
return;
}

chart.applyOptions(
{
width,
height:
paneHeight
}
);

pulseMacdAutoscale();

}

function populateSettingsDialog(
root
){

readSettings();

root.innerHTML =
`
<div class="ind-macd-settings">
<label class="chart-indicator-settings-field">
<span class="chart-indicator-settings-field-label">Быстрая</span>
<input type="number" class="chart-indicator-settings-input" min="2" max="999" step="1" data-key="fastLength" value="${settings.fastLength}" inputmode="numeric"/>
</label>
<label class="chart-indicator-settings-field">
<span class="chart-indicator-settings-field-label">Медленная</span>
<input type="number" class="chart-indicator-settings-input" min="2" max="999" step="1" data-key="slowLength" value="${settings.slowLength}" inputmode="numeric"/>
</label>
<label class="chart-indicator-settings-field">
<span class="chart-indicator-settings-field-label">Сигнал</span>
<input type="number" class="chart-indicator-settings-input" min="1" max="999" step="1" data-key="signalLength" value="${settings.signalLength}" inputmode="numeric"/>
</label>
<label class="chart-indicator-settings-field">
<span class="chart-indicator-settings-field-label">Источник</span>
<select class="chart-indicator-settings-select" data-key="source">
<option value="close"${settings.source === "close" ? " selected" : ""}>close</option>
<option value="open"${settings.source === "open" ? " selected" : ""}>open</option>
<option value="high"${settings.source === "high" ? " selected" : ""}>high</option>
<option value="low"${settings.source === "low" ? " selected" : ""}>low</option>
<option value="hl2"${settings.source === "hl2" ? " selected" : ""}>hl2</option>
<option value="hlc3"${settings.source === "hlc3" ? " selected" : ""}>hlc3</option>
<option value="ohlc4"${settings.source === "ohlc4" ? " selected" : ""}>ohlc4</option>
</select>
</label>
<label class="chart-indicator-settings-field">
<span class="chart-indicator-settings-field-label">MA осциллятора</span>
<select class="chart-indicator-settings-select" data-key="oscillatorMa">
<option value="ema"${settings.oscillatorMa === "ema" ? " selected" : ""}>EMA</option>
<option value="sma"${settings.oscillatorMa === "sma" ? " selected" : ""}>SMA</option>
</select>
</label>
<label class="chart-indicator-settings-field">
<span class="chart-indicator-settings-field-label">MA сигнала</span>
<select class="chart-indicator-settings-select" data-key="signalMa">
<option value="ema"${settings.signalMa === "ema" ? " selected" : ""}>EMA</option>
<option value="sma"${settings.signalMa === "sma" ? " selected" : ""}>SMA</option>
</select>
</label>
${htfTfSelectHtml(
settings.tf
)}
</div>
<div class="chart-indicator-settings-reset-row">
<button type="button" class="chart-indicator-settings-reset">Сбросить в дефолт</button>
</div>
`;

function commit(){

const next =
{
...settings
};

root.querySelectorAll(
"[data-key]"
).forEach(
el=>{

const key =
el.dataset.key;

if(
el.tagName ===
"SELECT"
){
next[
key
] =
el.value;
return;
}

const n =
Number(
el.value
);

if(
Number.isFinite(
n
)
){
next[
key
] =
n;
}

}
);

persistSettings(
next
);
applySettings(
settings
);

}

root.querySelectorAll(
"input, select"
).forEach(
el=>{
el.addEventListener(
"change",
commit
);
}
);

root.querySelector(
".chart-indicator-settings-reset"
)?.addEventListener(
"click",
()=>{

persistSettings(
defaultMacdSettings()
);
applySettings(
settings
);
populateSettingsDialog(
root
);

}
);

}

return {
id:
MACD_PANE_ID,
label:
"MACD",
legendLabel:
"MACD 12 26 9",
settingsDialogTitle:
"MACD",
settingsDialogClass:
"chart-indicator-settings-dialog--compact",
exemptFromLimit:
false,
defaultEnabled:
false,
supportsSettingsDialog:
true,
getLegendLabel:
getLegendText,
getSettings:()=>
({
...settings
}),
populateSettingsDialog,
applySettings,
enable,
disable,
isEnabled:()=>
enabled,
getChart:()=>
enabled
? chart
: null,
getMacdSeries:()=>
enabled
? macdSeries
: null,
getMacdDrawCandles:()=>
lastMacdDrawCandles,
onSymbolChange,
onCandlesUpdate,
syncViewport,
onLayoutChange,
onResize,
destroy:()=>{
disable();
destroyChart();
}
};

}
