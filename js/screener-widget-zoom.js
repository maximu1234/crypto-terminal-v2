/**
 * Главная (/): ПКМ на виджет — увеличенный график ~80% экрана; повторный ПКМ — закрыть.
 */
import {
createScreenerChart,
createRSIChart,
applyChartPriceFormat,
applyScreenerZoom,
updateRsiBandLayout,
updateRsiLevelLinesLayout,
linkPairedChartTimeScales,
linkChartsCrosshair,
mainChartCrosshairOptions,
mountChartPriceHud,
applyTabletMainChartScroll,
applyTabletRsiChartOptions,
SCREENER_MAX_BARS
} from "./chart-import.js?v=49";

import {
isIpadWebViewport
} from "./ipad-web-viewport.js?v=2";

import {
loadMarketHistory
} from "./market-api.js?v=6";

import {
calculateRSI,
alignRsiWithCandleTimes
} from "./indicators.js?v=3";

import {
subscribeKline
} from "./market-ws.js?v=1";

import {
SCREENER_WIDGET_OSCILLATOR_CHANGED,
SCREENER_WIDGET_OSCILLATOR_MACD,
createScreenerMacdChart,
setScreenerMacdData
} from "./screener-widget-oscillator.js?v=1";

let zoomPatternOverlayApi =
null;

async function ensureZoomPatternOverlayApi(){

if(
!zoomPatternOverlayApi
){
zoomPatternOverlayApi =
await import(
"./screener-pattern-overlay.js?v=10"
);
}

return zoomPatternOverlayApi;

}

function zoomOscillatorKind(){

if(
typeof zoomMountOptions?.getOscillatorKind ===
"function"
){
return zoomMountOptions.getOscillatorKind() ===
SCREENER_WIDGET_OSCILLATOR_MACD
? SCREENER_WIDGET_OSCILLATOR_MACD
: "rsi";
}

return "rsi";

}

function zoomPatternOverlayEnabled(){

return (
typeof zoomMountOptions?.isPatternOverlayEnabled ===
"function" &&
!!zoomMountOptions.isPatternOverlayEnabled()
);

}

async function mountZoomPattern(
state
){

if(
!state ||
state.disposed ||
!zoomPatternOverlayEnabled()
){
return;
}

const api =
await ensureZoomPatternOverlayApi();

if(
state.disposed
){
return;
}

api.mountScreenerPatternOverlay(
state
);

}

function destroyZoomPattern(
state
){

state?.patternOverlayDestroy?.();

}

const ZOOM_TF_LABELS =
{
"1":
"1m",
"5":
"5m",
"15":
"15m",
"60":
"1h",
"240":
"4h",
"D":
"1D",
"W":
"W"
};

const ZOOM_TF_VALUES =
[
"1",
"5",
"15",
"60",
"240",
"D",
"W"
];

/** Клавиши 1–7 → ТФ внутри zoom (как на Скринере / Скрипте). */
const ZOOM_TF_HOTKEYS =
Object.freeze({
"1":
"1",
"2":
"5",
"3":
"15",
"4":
"60",
"5":
"240",
"6":
"D",
"7":
"W"
});

let zoomState =
null;

let zoomMountOptions =
null;

let oscillatorChangeBound =
false;

function updateZoomPatternData(
state
){

if(
!state ||
state.disposed ||
!zoomPatternOverlayEnabled()
){
return;
}

try{
state.patternOverlayRecompute?.();
}catch{
/* zoom closed */
}

}

function applyZoomInversion(
state,
inverted
){

const flag =
!!inverted;

for(
const chart of [
state?.chart,
state?.rsiChart
]
){

if(
!chart
){
continue;
}

try{
chart.priceScale(
"right"
).applyOptions({
invertScale:
flag
});
}catch{
/* ignore */
}

}

}

export function refreshZoomFavoriteUi(
symbol
){

if(
!zoomState ||
zoomState.symbol !==
symbol ||
!zoomMountOptions?.updateFlagUi
){
return;
}

zoomMountOptions.updateFlagUi(
zoomState.panel,
symbol
);

}

export function syncWidgetZoomInversion(
inverted
){

if(
!zoomState
){
return;
}

applyZoomInversion(
zoomState,
inverted
);

}

function openZoomInTerminal(
state
){

if(
!state?.symbol ||
state.disposed
){
return;
}

window.location.href =
`terminal.html?symbol=${encodeURIComponent(state.symbol)}&tf=${encodeURIComponent(state.tf)}`;

}

function shouldIgnoreZoomHotkey(
event
){

const target =
event.target;

if(
!target
){
return false;
}

const tag =
String(
target.tagName ||
""
).toLowerCase();

if(
tag ===
"input" ||
tag ===
"textarea" ||
tag ===
"select" ||
target.isContentEditable
){
return true;
}

return false;

}

function onZoomHotkey(
event
){

if(
!zoomState ||
zoomState.disposed
){
return;
}

if(
event.defaultPrevented ||
event.metaKey ||
event.ctrlKey ||
event.altKey ||
shouldIgnoreZoomHotkey(
event
)
){
return;
}

if(
event.code ===
"Escape"
){
event.preventDefault();
event.stopPropagation();
closeWidgetZoom();
return;
}

if(
event.code ===
"Space" ||
event.code ===
"ArrowRight"
){
if(
event.code ===
"ArrowRight" &&
event.shiftKey
){
event.preventDefault();
event.stopPropagation();
openZoomInTerminal(
zoomState
);
return;
}

if(
event.shiftKey &&
event.code ===
"Space"
){
return;
}

event.preventDefault();
event.stopPropagation();
void navigateZoomWidget(
1
);
return;
}

if(
event.code ===
"ArrowLeft"
){
event.preventDefault();
event.stopPropagation();
void navigateZoomWidget(
-1
);
return;
}

if(
event.shiftKey
){
return;
}

const tf =
ZOOM_TF_HOTKEYS[
event.key
];

if(
tf &&
ZOOM_TF_VALUES.includes(
tf
)
){
event.preventDefault();
event.stopPropagation();
void applyZoomTimeframe(
zoomState,
tf
);
}

}

/**
 * Листать увеличенный график на соседний виджет (Пробел / ← →).
 * С override-списком (лог Live) — строго по кругу по индексу.
 * Иначе — соседний виджет грида; на краю — смена страницы.
 * @param {1|-1} dir
 */
async function navigateZoomWidget(
dir
){

if(
!zoomState ||
zoomState.disposed
){
return;
}

const step =
dir <
0
? -1
: 1;
const widgetsOverride =
zoomMountOptions?._zoomWidgetsOverride;
const getWidgets =
zoomMountOptions?.getZoomWidgets;
const getCurrentTF =
zoomMountOptions?.getCurrentTF;
const hasOverride =
Array.isArray(
widgetsOverride
) &&
widgetsOverride.length >
0;
const shiftPage =
hasOverride
? null
: zoomMountOptions?.shiftZoomPage;

const widgets =
hasOverride
? widgetsOverride
: typeof getWidgets ===
"function"
? (
getWidgets() ||
[]
)
: [];

if(
!widgets.length
){
return;
}

const currentSymbol =
normalizeZoomSymbol(
zoomState.symbol ||
zoomState.widget?.symbol
);
const currentTf =
String(
zoomState.tf ||
zoomState.widget?.tf ||
""
);

let idx =
Number.isInteger(
zoomState.navIndex
) &&
zoomState.navIndex >=
0 &&
zoomState.navIndex <
widgets.length
? zoomState.navIndex
: -1;

if(
idx <
0
){
idx =
widgets.findIndex(
w=>
w ===
zoomState.widget ||
(
w?.root &&
w.root ===
zoomState.widget?.root
)
);
}

if(
idx <
0 &&
currentSymbol
){
idx =
widgets.findIndex(
w=>{
const wSym =
normalizeZoomSymbol(
w?.symbol
);

if(
wSym !==
currentSymbol
){
return false;
}

const wTf =
String(
w?.tf ||
""
);

return !currentTf ||
!wTf ||
wTf ===
currentTf;
}
);
}

if(
idx <
0 &&
currentSymbol
){
idx =
widgets.findIndex(
w=>
normalizeZoomSymbol(
w?.symbol
) ===
currentSymbol
);
}

if(
hasOverride
){
if(
idx <
0
){
idx =
0;
}

const nextIdx =
(
idx +
step +
widgets.length
) %
widgets.length;

await openWidgetZoom(
widgets[
nextIdx
],
()=>
widgets[
nextIdx
]?.tf ||
getCurrentTF?.() ||
"15",
{
navIndex:
nextIdx
}
);
return;
}

let nextIdx =
idx +
step;

if(
nextIdx >=
0 &&
nextIdx <
widgets.length
){
await openWidgetZoom(
widgets[
nextIdx
],
getCurrentTF,
{
navIndex:
nextIdx
}
);
return;
}

if(
typeof shiftPage ===
"function"
){
const moved =
await shiftPage(
step
);

if(
moved
){
const pageWidgets =
typeof getWidgets ===
"function"
? (
getWidgets() ||
[]
)
: [];

if(
!pageWidgets.length
){
return;
}

const pickIdx =
step >
0
? 0
: pageWidgets.length -
1;
const pick =
pageWidgets[
pickIdx
];

if(
pick
){
await openWidgetZoom(
pick,
getCurrentTF,
{
navIndex:
pickIdx
}
);
}

return;
}
}

if(
widgets.length <
2 ||
idx <
0
){
return;
}

const wrapIdx =
step >
0
? 0
: widgets.length -
1;

await openWidgetZoom(
widgets[
wrapIdx
],
getCurrentTF,
{
navIndex:
wrapIdx
}
);

}

function normalizeZoomSymbol(
raw
){

return String(
raw ||
""
).trim().toUpperCase().replace(
/\.P$/i,
""
);

}

function bindZoomHotkeys(){

document.addEventListener(
"keydown",
onZoomHotkey,
true
);

}

function unbindZoomHotkeys(){

document.removeEventListener(
"keydown",
onZoomHotkey,
true
);

}

function setScreenerGridFrozen(
frozen
){

document.body.classList.toggle(
"screener-widget-zoom-open",
!!frozen
);

}

function closeWidgetZoom(
opts =
{}
){

if(
opts.keepWidgetsOverride !==
true
){
setScreenerGridFrozen(
false
);
}

if(
!zoomState
){
return;
}

unbindZoomHotkeys();

zoomState.disposed =
true;

/*
 * Keep zoomWidgets override across Space/←/→ navigation.
 * Clearing here broke Live-log zoom: after the first step override
 * fell back to the Script grid widgets.
 */
if(
zoomMountOptions &&
opts.keepWidgetsOverride !==
true
){
zoomMountOptions._zoomWidgetsOverride =
null;
}

destroyZoomPattern(
zoomState
);

try{
zoomState.priceHudCtrl?.stop?.();
}catch{
/* ignore */
}

try{
zoomState.unsubKline?.();
}catch{
/* ignore */
}

try{
zoomState.disposeCrosshair?.();
}catch{
/* ignore */
}

zoomState.resizeObserver?.disconnect?.();

try{
zoomState.unbindUserPan?.();
}catch{
/* ignore */
}

try{
zoomState.disposeTabletPan?.();
}catch{
/* ignore */
}

try{
zoomState.rsiChart?.remove?.();
zoomState.chart?.remove?.();
}catch{
/* ignore */
}

zoomState.backdrop?.remove?.();
zoomState =
null;

}

function startZoomPriceHud(
state
){

state.priceHudCtrl?.stop?.();

if(
!state?.chart ||
!state?.series ||
!state?.chartEl
){
return;
}

state.priceHudCtrl =
mountChartPriceHud({
chart:
state.chart,
series:
state.series,
wrapEl:
state.chartEl,
getTf:
()=>
state.tf,
getLastCandle:
()=>
state.candles[
state.candles.length -
1
]
});

}

function refreshZoomPriceHud(
state
){

state?.priceHudCtrl?.refresh?.();

}

function layoutZoomRsi(
state
){

if(
state?.oscKind ===
SCREENER_WIDGET_OSCILLATOR_MACD ||
!state?.rsiSeries ||
!state?.rsiWrapEl
){
return;
}

updateRsiBandLayout(
state.rsiSeries,
state.rsiWrapEl.querySelector(
".screener-rsi-band"
)
);

updateRsiLevelLinesLayout(
state.rsiSeries,
state.rsiWrapEl
);

}

function updateZoomRsiData(
state
){

if(
!state.candles?.length
){
return;
}

if(
state.oscKind ===
SCREENER_WIDGET_OSCILLATOR_MACD
){

if(
!state.macdHistSeries
){
return;
}

setScreenerMacdData(
{
histSeries:
state.macdHistSeries,
macdSeries:
state.rsiSeries,
signalSeries:
state.macdSignalSeries
},
state.candles
);
return;

}

if(
!state?.rsiSeries
){
return;
}

const raw =
calculateRSI(
state.candles
);

const points =
alignRsiWithCandleTimes(
state.candles,
raw
);

state.rsiSeries.setData(
points
);

layoutZoomRsi(
state
);

}

function buildTfButtonsHtml(
activeTf
){

return ZOOM_TF_VALUES.map(
tf=>
`<button type="button" class="screener-widget-zoom-tf-btn${tf === activeTf ? " active" : ""}" data-tf="${tf}">${ZOOM_TF_LABELS[tf] || tf}</button>`
).join(
""
);

}

function syncZoomTfUi(
panel,
tf
){

panel.querySelectorAll(
".screener-widget-zoom-tf-btn"
).forEach(
btn=>{
btn.classList.toggle(
"active",
btn.dataset.tf ===
tf
);
}
);

}

async function loadZoomCandles(
symbol,
tf
){

const loaded =
await loadMarketHistory(
symbol,
tf,
2,
{
parallel:
true
}
);

return loaded.length >
SCREENER_MAX_BARS
? loaded.slice(
-SCREENER_MAX_BARS
)
: loaded;

}

function bindZoomUserPan(
state
){

const el =
state?.chartEl;

if(
!el
){
return;
}

const mark =
()=>{
state.userAdjustedZoom =
true;
};

el.addEventListener(
"wheel",
mark,
{
passive:
true
}
);
el.addEventListener(
"mousedown",
mark
);
el.addEventListener(
"touchstart",
mark,
{
passive:
true
}
);

state.unbindUserPan =
()=>{
el.removeEventListener(
"wheel",
mark
);
el.removeEventListener(
"mousedown",
mark
);
el.removeEventListener(
"touchstart",
mark
);
state.unbindUserPan =
null;
};

}

async function bindZoomTabletPan(
state
){

if(
!isIpadWebViewport() ||
!state?.chart ||
!state?.chartEl
){
return;
}

applyTabletMainChartScroll(
state.chart
);

if(
state.rsiChart
){
applyTabletRsiChartOptions(
state.rsiChart
);
}

try{

const {
mountWidgetTabletChart
} =
await import(
"./tablet-widget-chart.js?v=3"
);

if(
state.disposed
){
return;
}

const ctrl =
await mountWidgetTabletChart(
{
chart:
state.chart,
series:
state.series,
chartEl:
state.chartEl,
chartWrap:
state.chartEl,
getDrawingTools:
()=>null
}
);

state.disposeTabletPan =
()=>{
ctrl?.dispose?.();
state.disposeTabletPan =
null;
};

}catch{
/* ignore */
}

}

function syncZoomChartSize(
state
){

const chartEl =
state.chartEl;

if(
!chartEl ||
!state.chart ||
!state.series
){
return;
}

const w =
chartEl.clientWidth;
const h =
chartEl.clientHeight;

if(
w <
2 ||
h <
2
){
return;
}

const sizeChanged =
state.layoutW !==
w ||
state.layoutH !==
h;
state.layoutW =
w;
state.layoutH =
h;

if(
sizeChanged
){
state.chart.applyOptions(
{
width:
w,
height:
h
}
);
}

let scaleW =
56;

try{
scaleW =
state.chart.priceScale(
"right"
).width() ||
scaleW;
}catch{
/* ignore */
}

state.rsiWrapEl?.style.setProperty(
"--chart-scale-width",
`${scaleW}px`
);

if(
state.rsiChart &&
state.rsiChartEl
){

const rw =
state.rsiChartEl.clientWidth;
const rh =
state.rsiChartEl.clientHeight;

if(
rw >=
2 &&
rh >=
2
){
state.rsiChart.applyOptions(
{
width:
rw,
height:
rh
}
);
layoutZoomRsi(
state
);
}

}

if(
!state.candles.length
){
return;
}

if(
state.userAdjustedZoom
){
state.patternOverlayRedraw?.();
return;
}

if(
!sizeChanged &&
state.fittedOnce
){
return;
}

applyScreenerZoom(
state.chart,
state.series,
state.candles,
w,
h
);
state.fittedOnce =
true;

applyZoomInversion(
state,
zoomMountOptions?.getInvertCharts?.() === true
);

state.patternOverlayRedraw?.();

}

function setupZoomCrosshair(
state
){

if(
!state ||
state.disposed ||
!state.chart ||
!state.series ||
!state.chartEl ||
!state.rsiChart ||
!state.rsiSeries ||
!state.linkedCrosshairVertEl
){
return;
}

state.chart.applyOptions(
{
crosshair:
mainChartCrosshairOptions()
}
);

const link =
linkChartsCrosshair(
{
mainChart:
state.chart,
linkedChart:
state.rsiChart,
mainSeries:
state.series,
linkedSeries:
state.rsiSeries,
linkedVertOverlayEl:
state.linkedCrosshairVertEl,
chartWrapEl:
state.chartEl,
chartEl:
state.chartEl,
linkedWrapEl:
state.rsiWrapEl,
linkedChartEl:
state.rsiChartEl
}
);

state.disposeCrosshair =
()=>{
link.detachPointerCrosshair?.();
link.clearLinked?.();
state.disposeCrosshair =
null;
};

}

async function applyZoomTimeframe(
state,
tf
){

if(
!state ||
state.tf ===
tf
){
return;
}

state.tf =
tf;
state.userAdjustedZoom =
false;
state.fittedOnce =
false;
syncZoomTfUi(
state.panel,
tf
);

state.chartEl.classList.add(
"loading"
);

try{
const candles =
await loadZoomCandles(
state.symbol,
tf
);

state.candles =
candles;

if(
candles.length
){
state.series.setData(
candles
);
applyChartPriceFormat(
state.series,
candles[
candles.length -
1
].close
);
updateZoomRsiData(
state
);
updateZoomPatternData(
state
);
syncZoomChartSize(
state
);
refreshZoomPriceHud(
state
);
}

state.unsubKline?.();
state.unsubKline =
subscribeKline(
state.symbol,
tf,
candle=>{

if(
!state.candles.length
){
return;
}

const prevLast =
state.candles[
state.candles.length -
1
];

if(
prevLast &&
candle.time <
prevLast.time
){
return;
}

if(
prevLast &&
candle.time ===
prevLast.time
){
state.candles[
state.candles.length -
1
] =
candle;
state.series.update(
candle
);
if(
state.oscKind ===
SCREENER_WIDGET_OSCILLATOR_MACD
){
updateZoomRsiData(
state
);
}
}else{
state.candles.push(
candle
);

if(
state.candles.length >
SCREENER_MAX_BARS
){
state.candles =
state.candles.slice(
-SCREENER_MAX_BARS
);
state.series.setData(
state.candles
);
updateZoomRsiData(
state
);
updateZoomPatternData(
state
);
}else{
state.series.update(
candle
);
updateZoomRsiData(
state
);
updateZoomPatternData(
state
);
}
}

applyChartPriceFormat(
state.series,
state.candles[
state.candles.length -
1
]?.close
);
refreshZoomPriceHud(
state
);

}
);

}catch{
/* ignore */
}finally{
state.chartEl.classList.remove(
"loading"
);
}

}

async function openWidgetZoom(
widget,
getCurrentTF,
opts =
{}
){

closeWidgetZoom(
{
keepWidgetsOverride:
true
}
);

const symbol =
widget?.symbol;

if(
!symbol
){
return;
}

const tf =
widget?.tf ||
getCurrentTF?.() ||
"15";
const oscKind =
zoomOscillatorKind();
const showMacd =
oscKind ===
SCREENER_WIDGET_OSCILLATOR_MACD;

const override =
zoomMountOptions?._zoomWidgetsOverride;
let navIndex =
Number.isInteger(
opts.navIndex
)
? opts.navIndex
: -1;

if(
navIndex <
0 &&
Array.isArray(
override
)
){
navIndex =
override.findIndex(
w=>
w ===
widget
);

if(
navIndex <
0
){
const sym =
normalizeZoomSymbol(
symbol
);
const tfKey =
String(
tf ||
""
);
navIndex =
override.findIndex(
w=>{
if(
normalizeZoomSymbol(
w?.symbol
) !==
sym
){
return false;
}

const wTf =
String(
w?.tf ||
""
);

return !tfKey ||
!wTf ||
wTf ===
tfKey;
}
);
}

}

const backdrop =
document.createElement(
"div"
);
backdrop.className =
"screener-widget-zoom-backdrop";

const panel =
document.createElement(
"div"
);
panel.className =
"screener-widget-zoom-panel";
panel.innerHTML =
`
<div class="screener-widget-zoom-header">
<div class="screener-header-left screener-widget-zoom-title">
${zoomMountOptions?.flagWrapHtml || ""}
<div class="screener-symbol">${symbol}</div>
</div>
<div class="screener-widget-zoom-tf" role="group" aria-label="Таймфрейм">${buildTfButtonsHtml(tf)}</div>
<div class="screener-header-right screener-widget-zoom-header-right">
<span class="screener-widget-zoom-hint">← → / Пробел · Esc / ПКМ — закрыть</span>
<button type="button" class="screener-open screener-widget-zoom-open" title="Открыть в Терминале (Shift+→)">↗</button>
</div>
</div>
<div class="screener-widget-zoom-body screener-widget-body">
<div class="linked-crosshair-vert hidden" aria-hidden="true"></div>
<div class="screener-chart screener-widget-zoom-main-chart"></div>
${showMacd
? `<div class="screener-rsi-wrap">
<div class="screener-rsi-chart"></div>
</div>`
: `<div class="screener-rsi-wrap">
<div class="screener-rsi-band"></div>
<div class="rsi-level-line hidden" data-rsi-level="70" aria-hidden="true"></div>
<div class="rsi-level-line hidden" data-rsi-level="50" aria-hidden="true"></div>
<div class="rsi-level-line hidden" data-rsi-level="30" aria-hidden="true"></div>
<div class="screener-rsi-chart"></div>
</div>`}
</div>
`;

backdrop.appendChild(
panel
);
setScreenerGridFrozen(
true
);
document.body.appendChild(
backdrop
);

const chartEl =
panel.querySelector(
".screener-widget-zoom-main-chart"
);
const rsiWrapEl =
panel.querySelector(
".screener-rsi-wrap"
);
const rsiChartEl =
panel.querySelector(
".screener-rsi-chart"
);
const linkedCrosshairVertEl =
panel.querySelector(
".screener-widget-zoom-body .linked-crosshair-vert"
);

const {
chart,
series
} =
createScreenerChart(
chartEl
);

const macdPair =
showMacd
? createScreenerMacdChart(
rsiChartEl
)
: null;
const rsiPair =
showMacd
? null
: createRSIChart(
rsiChartEl
);
const oscChart =
macdPair?.chart ||
rsiPair.chart;
const oscPrimarySeries =
macdPair?.macdSeries ||
rsiPair.series;

chart.applyOptions(
{
timeScale:{
visible:
false,
borderVisible:
false
},
rightPriceScale:{
visible:
true,
borderVisible:
true
}
}
);

oscChart.applyOptions(
{
timeScale:{
visible:
true,
timeVisible:
true,
ticksVisible:
true,
borderColor:
"#1f2937",
borderVisible:
true,
secondsVisible:
false
},
rightPriceScale:{
borderVisible:
false
}
}
);

const state =
{
widget,
backdrop,
panel,
symbol,
tf,
side:
widget?.side,
scanIndicatorId:
widget?.scanIndicatorId,
oscKind,
chart,
series,
chartEl,
rsiChart:
oscChart,
rsiSeries:
oscPrimarySeries,
rsiWrapEl,
rsiChartEl,
macdHistSeries:
macdPair?.histSeries ||
null,
macdSignalSeries:
macdPair?.signalSeries ||
null,
linkedCrosshairVertEl,
candles:
[],
unsubKline:
null,
resizeObserver:
null,
disposeCrosshair:
null,
priceHudCtrl:
null,
unbindUserPan:
null,
disposeTabletPan:
null,
userAdjustedZoom:
false,
fittedOnce:
false,
layoutW:
0,
layoutH:
0,
disposed:
false,
navIndex:
navIndex >=
0
? navIndex
: null
};

zoomState =
state;

let rsiLayoutRaf =
0;
linkPairedChartTimeScales(
chart,
oscChart,
()=>{
if(
rsiLayoutRaf
){
return;
}
rsiLayoutRaf =
requestAnimationFrame(
()=>{
rsiLayoutRaf =
0;
if(
!state.disposed
){
layoutZoomRsi(
state
);
}
}
);
}
);

bindZoomHotkeys();

setupZoomCrosshair(
state
);

startZoomPriceHud(
state
);

bindZoomUserPan(
state
);

void bindZoomTabletPan(
state
);

applyZoomInversion(
state,
zoomMountOptions?.getInvertCharts?.() === true
);

const titleLeft =
panel.querySelector(
".screener-widget-zoom-title"
);

zoomMountOptions?.wireFlagUi?.(
titleLeft,
symbol
);

panel.querySelector(
".screener-widget-zoom-open"
)?.addEventListener(
"click",
event=>{
event.stopPropagation();
openZoomInTerminal(
state
);
}
);

if(
isIpadWebViewport()
){

const hint =
panel.querySelector(
".screener-widget-zoom-hint"
);

if(
hint
){
hint.hidden =
true;
}

const closeBtn =
document.createElement(
"button"
);

closeBtn.type =
"button";
closeBtn.className =
"screener-widget-zoom-close";
closeBtn.title =
"Закрыть";
closeBtn.setAttribute(
"aria-label",
"Закрыть"
);
closeBtn.textContent =
"×";

panel.querySelector(
".screener-widget-zoom-header-right"
)?.prepend(
closeBtn
);

closeBtn.addEventListener(
"click",
event=>{
event.preventDefault();
event.stopPropagation();
closeWidgetZoom();
}
);

const prevBtn =
document.createElement(
"button"
);

prevBtn.type =
"button";
prevBtn.className =
"screener-widget-zoom-nav screener-widget-zoom-nav--prev";
prevBtn.title =
"Предыдущий график";
prevBtn.setAttribute(
"aria-label",
"Предыдущий график"
);
prevBtn.textContent =
"‹";

const nextBtn =
document.createElement(
"button"
);

nextBtn.type =
"button";
nextBtn.className =
"screener-widget-zoom-nav screener-widget-zoom-nav--next";
nextBtn.title =
"Следующий график";
nextBtn.setAttribute(
"aria-label",
"Следующий график"
);
nextBtn.textContent =
"›";

prevBtn.addEventListener(
"click",
event=>{
event.preventDefault();
event.stopPropagation();
void navigateZoomWidget(
-1
);
}
);

nextBtn.addEventListener(
"click",
event=>{
event.preventDefault();
event.stopPropagation();
void navigateZoomWidget(
1
);
}
);

backdrop.append(
prevBtn,
nextBtn
);

}

panel.querySelectorAll(
".screener-widget-zoom-tf-btn"
).forEach(
btn=>{
btn.addEventListener(
"click",
event=>{
event.stopPropagation();
const nextTf =
btn.dataset.tf;

if(
!nextTf ||
nextTf ===
state.tf
){
return;
}

void applyZoomTimeframe(
state,
nextTf
);
}
);
}
);

const resizeTarget =
panel.querySelector(
".screener-widget-zoom-body"
);

const resizeObserver =
new ResizeObserver(
()=>{
syncZoomChartSize(
state
);
}
);

resizeObserver.observe(
resizeTarget
);
state.resizeObserver =
resizeObserver;

const runSize =
()=>{
syncZoomChartSize(
state
);
};

runSize();
requestAnimationFrame(
runSize
);
setTimeout(
runSize,
50
);
setTimeout(
runSize,
200
);

let candles =
Array.isArray(
widget.candles
) &&
widget.candles.length &&
state.tf ===
tf
? widget.candles.slice()
: [];

if(
!candles.length
){

try{
candles =
await loadZoomCandles(
symbol,
tf
);
}catch{
/* ignore */
}

}

state.candles =
candles;

if(
candles.length
){
series.setData(
candles
);
applyChartPriceFormat(
series,
candles[
candles.length -
1
].close
);
updateZoomRsiData(
state
);
runSize();
void mountZoomPattern(
state
);
refreshZoomPriceHud(
state
);
}

state.unsubKline =
subscribeKline(
symbol,
tf,
candle=>{

if(
!state.candles.length
){
return;
}

const prevLast =
state.candles[
state.candles.length -
1
];

if(
prevLast &&
candle.time <
prevLast.time
){
return;
}

if(
prevLast &&
candle.time ===
prevLast.time
){
state.candles[
state.candles.length -
1
] =
candle;
series.update(
candle
);
if(
state.oscKind ===
SCREENER_WIDGET_OSCILLATOR_MACD
){
updateZoomRsiData(
state
);
}
}else{
state.candles.push(
candle
);

if(
state.candles.length >
SCREENER_MAX_BARS
){
state.candles =
state.candles.slice(
-SCREENER_MAX_BARS
);
series.setData(
state.candles
);
updateZoomRsiData(
state
);
updateZoomPatternData(
state
);
}else{
series.update(
candle
);
updateZoomRsiData(
state
);
updateZoomPatternData(
state
);
}
}

applyChartPriceFormat(
series,
state.candles[
state.candles.length -
1
]?.close
);
refreshZoomPriceHud(
state
);

}
);

backdrop.addEventListener(
"contextmenu",
event=>{
event.preventDefault();
event.stopPropagation();
closeWidgetZoom();
},
true
);

if(
isIpadWebViewport()
){
backdrop.addEventListener(
"click",
event=>{
if(
event.target.closest(
".screener-widget-zoom-panel"
) ||
event.target.closest(
".screener-widget-zoom-nav"
) ||
event.target.closest(
".screener-widget-zoom-close"
)
){
return;
}

closeWidgetZoom();
}
);
}

}

export function mountScreenerWidgetZoom(
{
resolveWidget,
getCurrentTF,
getZoomWidgets,
shiftZoomPage,
getInvertCharts = ()=>false,
getOscillatorKind,
isEnabled = ()=>true,
isPatternOverlayEnabled,
gridElId = "screener-grid",
wireFlagUi,
updateFlagUi,
flagWrapHtml = ""
}
){

zoomMountOptions =
{
wireFlagUi,
updateFlagUi,
flagWrapHtml,
getInvertCharts,
getOscillatorKind,
getCurrentTF,
getZoomWidgets,
shiftZoomPage,
gridElId,
isPatternOverlayEnabled
};

function onContextMenu(
event
){

if(
!isEnabled()
){
return;
}

const widgetRoot =
event.target?.closest?.(
".screener-widget"
);

if(
!widgetRoot
){
return;
}

const grid =
document.getElementById(
zoomMountOptions?.gridElId ||
"screener-grid"
);

if(
!grid?.contains(
widgetRoot
)
){
return;
}

event.preventDefault();
event.stopPropagation();

const widget =
resolveWidget?.(
widgetRoot
);

if(
!widget
){
return;
}

if(
zoomState &&
zoomState.widget ===
widget
){
closeWidgetZoom();
return;
}

void openWidgetZoom(
widget,
getCurrentTF
);

}

document.addEventListener(
"contextmenu",
onContextMenu,
true
);

if(
!oscillatorChangeBound
){
oscillatorChangeBound =
true;
window.addEventListener(
SCREENER_WIDGET_OSCILLATOR_CHANGED,
()=>{
if(
!zoomState ||
zoomState.oscKind ===
zoomOscillatorKind()
){
return;
}
closeWidgetZoom();
}
);
}

return ()=>{
document.removeEventListener(
"contextmenu",
onContextMenu,
true
);
closeWidgetZoom();
};

}

/**
 * Open zoom from outside grid contextmenu (e.g. Script Live log).
 * @param {{ symbol: string, tf?: string, root?: Element|null }} widget
 * @param {{ getCurrentTF?: () => string, zoomWidgets?: object[] }} [opts]
 */
export async function openScreenerWidgetZoom(
widget,
opts =
{}
){

if(
!zoomMountOptions
){
console.warn(
"[screener-zoom] mountScreenerWidgetZoom() first"
);
return;
}

if(
Array.isArray(
opts.zoomWidgets
)
){
zoomMountOptions._zoomWidgetsOverride =
opts.zoomWidgets;
}else{
zoomMountOptions._zoomWidgetsOverride =
null;
}

const list =
zoomMountOptions._zoomWidgetsOverride;
const sym =
normalizeZoomSymbol(
widget?.symbol
);
const tfKey =
String(
widget?.tf ||
""
);
let navIndex =
-1;
let resolved =
widget;

if(
Array.isArray(
list
) &&
sym
){
navIndex =
list.findIndex(
w=>{
if(
normalizeZoomSymbol(
w?.symbol
) !==
sym
){
return false;
}

const wTf =
String(
w?.tf ||
""
);

return !tfKey ||
!wTf ||
wTf ===
tfKey;
}
);

if(
navIndex <
0
){
navIndex =
list.findIndex(
w=>
normalizeZoomSymbol(
w?.symbol
) ===
sym
);
}

if(
navIndex >=
0
){
resolved =
list[
navIndex
];
}

}

await openWidgetZoom(
resolved,
opts.getCurrentTF ||
zoomMountOptions.getCurrentTF ||
(()=>
resolved?.tf ||
widget?.tf ||
"15"
),
{
navIndex
}
);

}
