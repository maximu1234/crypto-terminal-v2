/**
 * АлгоТрейдинг — график + pattern stats + изолированный trade UI на алго-ключах.
 */
import {
createCandlestickChart,
createRSIChart,
linkPairedChartTimeScales,
linkChartsCrosshair,
applyCoinsChartViewport,
applyChartPriceFormat,
applyRsiFixedPriceScale,
appendFutureWhitespaceBars,
computeChartFutureMarginBars,
syncLinkedChartTimescales
} from "./chart-import.js?v=48";

import {
terminalVisibleBars,
terminalHistoryInitialRequests,
TERMINAL_VISIBLE_BARS,
TERMINAL_HISTORY_LAZY_BATCH_BARS
} from "./terminal-chart-history-prefs.js?v=1";

import {
ALGO_TICKER_SCAN_HISTORY_REQUESTS
} from "./algo-trading/ticker-scanner.js?v=10";

import {
defaultRsiPaneSettings,
normalizeRsiPaneSettings
} from "./indicators/rsi-pane.js?v=8";

import {
buildChartRsiPoints
} from "./indicators/htf-project.js?v=5";

import {
loadMarketHistory,
getActiveExchangeId
} from "./market-api.js?v=6";

import {
subscribeKline
} from "./market-ws.js?v=1";

import {
mountAlgoTradingCoinList,
refreshAlgoMarketListFromFlags
} from "./algo-trading-list.js?v=25";

import {
mountAlgoTickerScanUi
} from "./algo-trading/ticker-scan-ui.js?v=33";

import {
getTickerStrategyOverlay,
hasTickerStrategyOverlay,
setTickerStrategyOverlay,
writeTickerStrategyOverlays
} from "./algo-trading/ticker-strategy-overlays.js?v=1";

import {
mountAlgoStrategyParamOptimizeUi
} from "./algo-trading/strategy-param-optimize-ui.js?v=6";

import {
mountAlgoRuntimeUi
} from "./algo-trading/runtime-ui.js?v=13";

import {
mountAlgoBotStrategyUi
} from "./algo-trading/bot-strategy-ui.js?v=89";

import {
ALGO_ANALYSIS_BOT_CHANGE_EVENT,
ALGO_ANALYSIS_BOT_NONE,
ALGO_ANALYSIS_BOT_PATTERN_12,
getActiveAnalysisBotId,
isActiveAnalysisBot,
isAnyAnalysisBotActive,
setActiveAnalysisBotId
} from "./algo-trading/active-analysis-bot.js?v=4";

import {
mountSessionLogServerSettings
} from "./algo-trading/bot-session-log-server-ui.js?v=11";

import {
syncBotStrategiesToMain
} from "./algo-trading/bot-bridge.js?v=25";

import {
mountAlgoTradeUi
} from "./algo-trading/trade/boot.js?v=5";

import {
mountAlgoTradingDrawings
} from "./algo-trading/drawings.js?v=2";

import {
mountAlgoTradingIndicators
} from "./algo-trading/indicators.js?v=15";

import {
mountAlgoPatternEntryOverlay
} from "./algo-trading/pattern-entry-overlay.js?v=17";

import {
mountRsiTouchFlipHost
} from "./algo-trading/rsi-touch-flip-panel.js?v=14";

import {
clearAlgoPatternAnalysisUi,
refreshAlgoPatternAnalysis
} from "./algo-trading/pattern-analysis.js?v=38";

import {
invalidateAlgoPattern12SceneCache,
clearAlgoPattern12PaintEntryFilter
} from "./algo-trading/pattern-12-scene-cache.js?v=10";

import {
clampSlPctOfX,
clampTpRr,
clampRiskUsd
} from "./algo-trading/pattern-entry-positions.js?v=16";

import {
clampPartialTpX,
clampTrailSlX1,
clampTrailSlX2,
normalizeTpShares,
rebalanceTpShares,
DEFAULT_PARTIAL_TP1_X,
DEFAULT_PARTIAL_TP2_X,
DEFAULT_PARTIAL_TP3_X
} from "./algo-trading/pattern-trade-stats-partial.js?v=22";

import {
clampEntryTimeoutBars,
clampMaxPt1Pt4Bars
} from "./algo-trading/pattern-entry-logic.js?v=14";

/* TEMP_PULLBACK_BEFORE_ARM — remove with temp-pullback-before-arm.js */
import {
clampPullbackBeforeArmPct,
normalizePullbackBeforeArmEnabled
} from "./algo-trading/temp-pullback-before-arm.js?v=4";

import {
normalizeAlgoSupertrendTf,
clampAlgoSupertrendAtr,
clampAlgoSupertrendFactor
} from "./algo-trading/pattern-supertrend-filter.js?v=5";

import {
createAlgoSupertrendFilterOverlay
} from "./algo-trading/supertrend-filter-overlay.js?v=2";

import {
normalizeAlgoStatsMode
} from "./algo-trading/pattern-trade-stats.js?v=15";

import {
readAlgoPattern12Settings
} from "./algo-trading/pattern-12-settings.js?v=5";

import {
setChartLayoutReady,
isChartLayoutReady
} from "./chart-layout-gate.js?v=2";

import {
invalidatePreservedVisibleLogicalRange,
runWithPreservedVisibleLogicalRange
} from "./chart-visible-range.js?v=3";

import {
coinsState,
marketMap
} from "./terminal/terminal-state.js?v=12";

import {
DEFAULT_TF,
ALGO_PREFS_KEY,
normalizeSymbol,
displaySymbol,
ALGO_STRATEGY_IDS,
readPrefs,
writePrefs,
clampScanMinWinRate,
normalizeAlgoScanTfPref,
resolveInitialSymbol
} from "./algo-trading/page-prefs.js?v=2";

import {
mergeLiveCandle
} from "./algo-trading/live-candle.js?v=1";

import {
formatTurnover24Label
} from "./algo-trading/page-format.js?v=1";

import {
bindAlgoNumericField
} from "./algo-trading/page-dom.js?v=1";

import {
bindAlgoPageHotkeys
} from "./algo-trading/page-hotkeys.js?v=1";

import {
createAlgoStrategyMemory,
algoGate as algoGateFromMemory,
chartStrategyId as chartStrategyIdFromMemory,
chartGate as chartGateFromMemory,
buildTradeOpts as buildTradeOptsFromMemory,
strategyPrefKeys as strategyPrefKeysFromMemory,
strategyPatchFromState as strategyPatchFromStateFromMemory,
applyStrategyPatchToMemory as applyStrategyPatchToMemoryFromMemory,
syncStrategyDomFromMemory as syncStrategyDomFromMemoryFromMemory,
restoreStrategyMemoryFromPrefs as restoreStrategyMemoryFromPrefsFromMemory,
buildAlgoPrefsSnapshot
} from "./algo-trading/page-strategy-state.js?v=1";

import {
syncRsiHudPeriod as syncRsiHudPeriodEl,
syncRsiLevelDom as syncRsiLevelDomEl,
setRsiHud as setRsiHudEl,
lastRsiValue as lastRsiValueFromCandles,
layoutRsiPane
} from "./algo-trading/page-rsi.js?v=1";

import {
bindAlgoStatsPanelResize
} from "./algo-trading/stats-panel-resize.js?v=2";

import {
isAlgoBotLiteMode,
mountAlgoBotLiteLayout
} from "./algo-trading/lite-layout.js?v=5";

import {
loadAlgoBotLiteHistory
} from "./algo-trading/lite-history.js?v=1";

/** Глубина ботов / сканов / «Подобрать»: ~10 000. График сначала ~5000, затем догрузка. */
const HISTORY_REQUESTS =
ALGO_TICKER_SCAN_HISTORY_REQUESTS;
/** Throttle pattern analysis when force:false (редко). */
const PATTERN_ANALYSIS_LIVE_MS =
1500;

/**
 * DEBUG CPU: только свечи. Включай по одному → true и смотри CPU.
 * После отлова вернуть лишнее в false.
 */
const ALGO_CHART_DEBUG = {
  /** Live kline → движение текущей свечи / цены */
  livePrice: true,
  drawings: true,
  indicators: true,
  entryOverlay: true,
  tradeUi: true,
  analysis: true,
  filterLines: true,
  rsi: true
};

function algoChartDbg(
key
){

return !!ALGO_CHART_DEBUG[
key
];

}

export async function mountAlgoTradingPage(){

setActiveAnalysisBotId(
isAlgoBotLiteMode() &&
getActiveAnalysisBotId() ===
ALGO_ANALYSIS_BOT_NONE
? ALGO_ANALYSIS_BOT_PATTERN_12
: getActiveAnalysisBotId(),
{
silent:
true
}
);

const chartEl =
document.getElementById(
"chart"
);
const rsiChartEl =
document.getElementById(
"rsi-chart"
);
const rsiWrapEl =
document.getElementById(
"rsi-wrap"
);
const chartWrapEl =
document.getElementById(
"chart-wrap"
);
const symbolEl =
document.getElementById(
"current-symbol"
);
const tfBar =
document.getElementById(
"algo-tf-bar"
);
const rsiHudValueEl =
document.getElementById(
"rsi-hud-value"
);
const rsiHudPeriodEl =
document.getElementById(
"rsi-hud-period"
);
const linkedCrosshairVertEl =
document.getElementById(
"linked-crosshair-vert"
);

if(
!algoChartDbg(
"rsi"
) &&
rsiWrapEl
){
rsiWrapEl.hidden =
true;
rsiWrapEl.style.display =
"none";
}

if(
!algoChartDbg(
"indicators"
)
){
const indRoot =
document.getElementById(
"chart-indicators-wrap"
);

if(
indRoot
){
indRoot.hidden =
true;
indRoot.style.display =
"none";
}
}


let rsiPaneSettings =
normalizeRsiPaneSettings(
defaultRsiPaneSettings()
);
let lastRsiHudValue =
null;
let rsiRebuildSeq =
0;

function syncRsiHudPeriod(){

syncRsiHudPeriodEl(
rsiHudPeriodEl,
rsiPaneSettings.period
);

}

function syncRsiLevelDom(){

syncRsiLevelDomEl(
rsiWrapEl,
rsiPaneSettings
);

}

function onRsiSettingsChange(
next
){

rsiPaneSettings =
normalizeRsiPaneSettings(
next ||
rsiPaneSettings
);
syncRsiHudPeriod();
syncRsiLevelDom();
applyRsiData();

}

syncRsiHudPeriod();
syncRsiLevelDom();

if(
!chartEl ||
!rsiChartEl
){
console.error(
"[algo-trading] chart mounts missing"
);
return;
}

mountAlgoBotLiteLayout();

let symbol =
resolveInitialSymbol();
let tf =
readPrefs().tf ||
DEFAULT_TF;
let listApi =
null;

if(
isAlgoBotLiteMode()
){
try{
listApi =
await mountAlgoTradingCoinList(
{
getSymbol:()=>
symbol,
setSymbolLabel(
next
){
setSymbolLabel(
next
);
},
async loadSymbol(
next,
nextTf
){
await loadSymbol(
next,
nextTf ||
tf
);
listApi?.highlight?.();
}
}
);
listApi?.highlight?.();
}catch(
err
){
console.warn(
"[algo-trading] coin list:",
err?.message ||
err
);
}
}

let chart =
null;
let candleSeries =
null;
let rsiChart =
null;
let rsiSeries =
null;

if(
!isAlgoBotLiteMode()
){
const main =
createCandlestickChart(
chartEl
);
chart =
main.chart;
candleSeries =
main.series;

candleSeries.applyOptions(
{
lastValueVisible:
true
}
);

const rsi =
createRSIChart(
rsiChartEl
);
rsiChart =
rsi.chart;
rsiSeries =
rsi.series;
}

const mem =
createAlgoStrategyMemory();

function algoGate(
id
){

return algoGateFromMemory(
mem,
id
);

}

function chartStrategyId(){

return chartStrategyIdFromMemory(
mem
);

}

function chartGate(){

return chartGateFromMemory(
mem
);

}

function buildTradeOpts(
strategyId
){

return buildTradeOptsFromMemory(
mem,
strategyId,
{
chartTf:
tf,
patternSettings:
readAlgoPattern12Settings()
}
);

}

let tickerScanUi =
null;
let strategyParamOptimizeUi =
null;
let candles =
[];
let loadSeq =
0;
let unsubKline =
null;
let disposed =
false;
let disposeCrosshair =
null;
let drawingTools =
null;
let destroyDrawings =
()=>{};
let chartIndicators =
null;
let supertrendFilterOverlay =
null;
let rsiPaneActive =
algoChartDbg(
"rsi"
);
let entryOverlay =
null;
let rsiTouchFlipHost =
null;
let tradeUi =
null;
let botStrategyUi =
null;
let patternAnalysisTimer =
0;
let patternAnalysisSeq =
0;
let lastPatternAnalysisAt =
0;
let algoStatsPanelCollapsed =
false;
let recaptureAlgoStatsPanelHeight =
()=>{};
let algoPattern12EnabledOnce =
false;
/** Bottom «Данные» after chart load + settle (как candles-loaded на Терминале). */
let historyStatsReady =
false;

function isAlgoStatsAnalysisPaused(){

return algoStatsPanelCollapsed;

}

function markAlgoHistoryStatsPending(){

historyStatsReady =
false;
patternAnalysisSeq++;

if(
patternAnalysisTimer
){
clearTimeout(
patternAnalysisTimer
);
patternAnalysisTimer =
0;
}

clearAlgoPatternAnalysisUi(
entryOverlay
);

}

function markAlgoHistoryStatsReadyAndAnalyze(){

historyStatsReady =
true;

if(
!algoChartDbg(
"analysis"
)
){
return;
}

ensureAlgoPattern12Enabled();
schedulePatternAnalysis(
{
force:
true
}
);
drawingTools?.scheduleRedraw?.();
rsiTouchFlipHost?.refresh?.();

}

function dispatchAlgoChartCandlesLoaded(
loadId
){

try{
window.dispatchEvent(
new CustomEvent(
"chart-candles-loaded",
{
detail:{
symbol:
String(
symbol ||
""
).replace(
/\.P$/i,
""
).trim().toUpperCase(),
loadSeq:
Number(
loadId
) ||
0
}
}
)
);
}catch{
/* ignore */
}

}

function ensureAlgoPattern12Enabled(){

if(
!algoChartDbg(
"indicators"
) ||
!algoChartDbg(
"analysis"
)
){
return;
}

if(
algoPattern12EnabledOnce ||
disposed
){
return;
}

if(
!isActiveAnalysisBot(
ALGO_ANALYSIS_BOT_PATTERN_12
)
){
return;
}

algoPattern12EnabledOnce =
true;

if(
isAlgoBotLiteMode()
){
return;
}

const root =
document.getElementById(
"chart-indicators-wrap"
);
const input =
root?.querySelector?.(
'input[data-indicator-id="pattern-12"]'
);

if(
!input ||
input.checked
){
return;
}

input.checked =
true;
input.dispatchEvent(
new Event(
"change",
{
bubbles:
true
}
)
);

}

/**
 * Аналитика/рисунки на графике — только для активного бота (меню «Боты»).
 * pattern-12 / rsi-touch-flip — свой блок data-algo-analysis-bot + оверлей.
 */
function applyActiveAnalysisBotChartUi(){

const botId =
getActiveAnalysisBotId();

document.body?.setAttribute(
"data-algo-analysis-bot",
botId
);

const pattern12 =
botId ===
ALGO_ANALYSIS_BOT_PATTERN_12;

if(
!pattern12
){
patternAnalysisSeq++;
if(
patternAnalysisTimer
){
clearTimeout(
patternAnalysisTimer
);
patternAnalysisTimer =
0;
}
tickerScanUi?.stopAll?.();
entryOverlay?.setEvents?.(
[]
);
entryOverlay?.refreshPositions?.();
algoPattern12EnabledOnce =
false;
refreshSupertrendFilterLines();
rsiTouchFlipHost?.refresh?.();
requestAnimationFrame(
()=>{
recaptureAlgoStatsPanelHeight();
}
);
return;
}

if(
historyStatsReady &&
!disposed
){
algoPattern12EnabledOnce =
false;
requestAnimationFrame(
()=>{

if(
disposed ||
!isActiveAnalysisBot(
ALGO_ANALYSIS_BOT_PATTERN_12
)
){
return;
}

ensureAlgoPattern12Enabled();
refreshSupertrendFilterLines();
schedulePatternAnalysis(
{
force:
true
}
);

}
);
}

requestAnimationFrame(
()=>{
recaptureAlgoStatsPanelHeight();
}
);

}

function setRsiPaneActive(
active
){

rsiPaneActive =
!!active;

if(
rsiPaneActive
){
applyRsiData();
return;
}

rsiSeries?.setData(
[]
);
layoutRsi();
setRsiHud(
null
);

}

function setSymbolLabel(
previewSymbol
){

const labelSymbol =
previewSymbol !=
null &&
String(
previewSymbol
).trim()
? normalizeSymbol(
previewSymbol
)
: symbol;

if(
symbolEl
){
symbolEl.textContent =
displaySymbol(
labelSymbol
);
}

document.title =
`${displaySymbol(
labelSymbol
)} — АлгоТрейдинг`;

coinsState().currentSymbol =
normalizeSymbol(
labelSymbol
);

syncAlgoChartTurnover24(
labelSymbol
);

}

function syncAlgoChartTurnover24(
nextSymbol =
symbol
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
marketMap.get(
normalizeSymbol(
nextSymbol
)
);

el.textContent =
formatTurnover24Label(
item?.volume24
);

}

function setActiveTfButton(){

tfBar?.querySelectorAll(
".tf-btn"
).forEach(
btn=>{
btn.classList.toggle(
"active",
btn.dataset.tf ===
tf
);
}
);

const chartTfSel =
document.getElementById(
"algo-rsi-flip-chart-tf"
);

if(
chartTfSel &&
document.activeElement !==
chartTfSel &&
[
...chartTfSel.options
].some(
opt=>
opt.value ===
tf
)
){
chartTfSel.value =
tf;
}

}

function setRsiHud(
value
){

setRsiHudEl(
rsiHudValueEl,
value
);

}

function layoutRsi(){

if(
!rsiSeries
){
return;
}

layoutRsiPane(
rsiSeries,
rsiWrapEl,
rsiPaneSettings
);

}

function resizeAlgoCharts(){

if(
!chart ||
!chartWrapEl
){
return;
}

const w =
Math.max(
chartWrapEl.clientWidth,
1
);
const chartH =
Math.max(
chartWrapEl.clientHeight,
1
);

if(
w <
2 ||
chartH <
2
){
/* Cold-open: wrap ещё без layout — fit отложим до первого валидного resize. */
if(
candles.length
){
pendingFitViewport =
true;
}
return;
}

chart.applyOptions(
{
width:
w,
height:
chartH
}
);

chartIndicators?.resizePanes?.(
w
);

if(
rsiChart &&
rsiPaneActive &&
rsiWrapEl
){

const rsiH =
Math.max(
rsiWrapEl.clientHeight,
1
);

if(
rsiH >=
2
){
rsiChart.applyOptions(
{
width:
w,
height:
rsiH
}
);
}

}

layoutRsi();
chartIndicators?.notifyLayoutChange?.();
drawingTools?.resize?.();
drawingTools?.scheduleRedraw?.();
runWithPreservedVisibleLogicalRange(
chart,
()=>{
chartIndicators?.notifyMainChartOverlaysSync?.();
entryOverlay?.refreshPositions?.();
}
);

if(
pendingFitViewport &&
candles.length
){
fitViewport();
}

}

let algoResizeRaf =
0;
/** Первый fit часто до layout (#chart absolute → clientWidth=0). */
let pendingFitViewport =
false;

function scheduleResizeAlgoCharts(){

if(
algoResizeRaf
){
cancelAnimationFrame(
algoResizeRaf
);
}

algoResizeRaf =
requestAnimationFrame(
()=>{
algoResizeRaf =
0;
resizeAlgoCharts();
}
);

}

function lastRsiValue(){

if(
lastRsiHudValue !=
null &&
Number.isFinite(
lastRsiHudValue
)
){
return lastRsiHudValue;
}

return lastRsiValueFromCandles(
candles,
rsiPaneSettings.period
);

}

function applyRsiData(
{
notifyIndicators =
true
} =
{}
){

if(
!rsiSeries
){
return;
}

if(
!algoChartDbg(
"rsi"
) ||
!rsiPaneActive
){
if(
notifyIndicators &&
algoChartDbg(
"indicators"
)
){
chartIndicators?.notifyCandlesUpdate?.();
}
return;
}

if(
!candles.length
){
rsiSeries.setData(
[]
);
lastRsiHudValue =
null;
setRsiHud(
null
);
if(
notifyIndicators
){
chartIndicators?.notifyCandlesUpdate?.();
}
return;
}

const seq =
++rsiRebuildSeq;
const chartCandles =
candles;

void (
async()=>{

const points =
await buildChartRsiPoints(
{
chartCandles,
period:
rsiPaneSettings.period,
tf:
rsiPaneSettings.tf,
chartTf:
tf,
symbol,
loadHistory:(
histSymbol,
histTf,
requests
)=>
loadMarketHistory(
histSymbol,
histTf,
requests ||
HISTORY_REQUESTS,
{
parallel:
true,
batchGapMs:
0
}
)
}
);

if(
seq !==
rsiRebuildSeq ||
!rsiPaneActive
){
return;
}

rsiSeries.setData(
appendFutureWhitespaceBars(
points,
computeChartFutureMarginBars(
terminalVisibleBars(
candles.length
)
),
tf
)
);
applyRsiFixedPriceScale(
rsiChart,
rsiSeries
);
syncLinkedChartTimescales(
chart,
rsiChart
);
layoutRsi();

let last =
null;

for(
let i =
points.length -
1;
i >=
0;
i--
){

if(
Number.isFinite(
points[i]?.value
)
){
last =
points[i];
break;
}

}

lastRsiHudValue =
last?.value ??
null;
setRsiHud(
lastRsiHudValue
);

if(
notifyIndicators
){
chartIndicators?.notifyCandlesUpdate?.();
}

}
)();

}

function buildDisplayCandles(){

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
tf
);

}

function fitViewport(){

if(
!chart ||
!chartWrapEl
){
return;
}

const wrapW =
Math.max(
chartWrapEl.clientWidth,
0
);
const wrapH =
Math.max(
chartWrapEl.clientHeight,
0
);

if(
wrapW <
2 ||
wrapH <
2
){
if(
candles.length
){
pendingFitViewport =
true;
}
return;
}

/* #chart position:absolute — clientWidth часто 0; размер берём с wrap. */
chart.applyOptions(
{
width:
wrapW,
height:
wrapH
}
);

if(
rsiChart &&
rsiPaneActive &&
rsiWrapEl
){

const rsiH =
Math.max(
rsiWrapEl.clientHeight,
1
);

if(
rsiH >=
2
){
rsiChart.applyOptions(
{
width:
wrapW,
height:
rsiH
}
);
}

}

const display =
buildDisplayCandles();

if(
!display.length
){
return;
}

pendingFitViewport =
false;
invalidatePreservedVisibleLogicalRange();

applyCoinsChartViewport(
chart,
rsiChart,
display,
tf,
wrapW,
candles.length,
TERMINAL_VISIBLE_BARS
);

}

function refreshEntryFilterLines(){

if(
!algoChartDbg(
"filterLines"
)
){
return;
}

supertrendFilterOverlay?.refresh?.();

}

function refreshSupertrendFilterLines(){

refreshEntryFilterLines();

}

function destroySupertrendFilterLines(){

supertrendFilterOverlay?.destroy?.();
supertrendFilterOverlay =
null;

}

function schedulePatternAnalysis(
{
force =
false
} =
{}
){

if(
!algoChartDbg(
"analysis"
)
){
return;
}

if(
!isActiveAnalysisBot(
ALGO_ANALYSIS_BOT_PATTERN_12
)
){
return;
}

if(
!historyStatsReady
){
return;
}

if(
!force &&
isAlgoStatsAnalysisPaused()
){
return;
}

const seq =
++patternAnalysisSeq;
const runForced =
!!force;

if(
patternAnalysisTimer
){
clearTimeout(
patternAnalysisTimer
);
}

const delay =
runForced
? 0
: Math.max(
0,
PATTERN_ANALYSIS_LIVE_MS -
(
Date.now() -
lastPatternAnalysisAt
)
);

patternAnalysisTimer =
setTimeout(
()=>{
patternAnalysisTimer =
0;

if(
disposed ||
seq !==
patternAnalysisSeq
){
return;
}

if(
!runForced &&
isAlgoStatsAnalysisPaused()
){
return;
}

lastPatternAnalysisAt =
Date.now();

refreshAlgoPatternAnalysis(
candles,
entryOverlay,
buildPatternAnalysisOpts()
);
/* Paint filter applied in pattern-12 paint — достаточно redraw, без полного flush индикаторов. */
drawingTools?.scheduleRedraw?.();
},
delay
);

}

function applyCandleData(
{
fit =
false,
light =
false,
skipAnalysis =
false,
forceAnalysis =
false
} =
{}
){

if(
!candleSeries
){
return;
}

const refPrice =
candles[
candles.length -
1
]?.close ??
1;

applyChartPriceFormat(
candleSeries,
refPrice
);

const display =
buildDisplayCandles();

if(
!light &&
algoChartDbg(
"indicators"
)
){
chartIndicators?.clearMainChartOverlays?.();
}

candleSeries.setData(
display
);

if(
algoChartDbg(
"rsi"
)
){
applyRsiData(
{
notifyIndicators:
!light
}
);
}

if(
!light &&
algoChartDbg(
"filterLines"
)
){
refreshEntryFilterLines();
}

if(
!light &&
algoChartDbg(
"indicators"
) &&
(
fit ||
isChartLayoutReady()
)
){
chartIndicators?.flushIndicatorDataRefreshNow?.();
chartIndicators?.notifyMainChartOverlaysSync?.();
}

/* fit строго после оверлеев: иначе flush/ST перетирают viewport (мигание cold-open). */
if(
fit
){
fitViewport();

if(
!light
){
setChartLayoutReady(
true
);
}

}

if(
!skipAnalysis &&
!light &&
candles.length
){
schedulePatternAnalysis(
{
force:
!!fit ||
!!forceAnalysis
}
);
}

rsiTouchFlipHost?.refresh?.();

drawingTools?.scheduleRedraw?.();

}

function buildPatternAnalysisOpts(){

return {
...buildTradeOpts(
"st1"
),
gates:{
st1:{
...mem.strategyGates.st1
},
st2:{
...mem.strategyGates.st2
},
st3:{
...mem.strategyGates.st3
}
},
statsMode:
mem.statsMode,
statsModeSt2:
mem.statsModeSt2,
statsModeSt3:
mem.statsModeSt3,
chartPositionsStrategy:
mem.chartPositionsStrategy,
symbol
};

}

function applyLiveCandleTick(){

if(
!candleSeries ||
!algoChartDbg(
"livePrice"
) ||
!candles.length
){
return;
}

const last =
candles[
candles.length -
1
];

try{
candleSeries.update(
{
time:
last.time,
open:
last.open,
high:
last.high,
low:
last.low,
close:
last.close
}
);
}catch{
applyCandleData(
{
forceAnalysis:
false,
light:
true,
skipAnalysis:
true
}
);
}

}

function stopKline(){

try{
unsubKline?.();
}catch{
/* ignore */
}

unsubKline =
null;

}

function mergeOlderAlgoCandles(
older
){

const byTime =
new Map();

for(
const row of older ||
[]
){

if(
row?.time !=
null
){
byTime.set(
row.time,
row
);
}

}

for(
const row of candles
){

if(
row?.time !=
null
){
byTime.set(
row.time,
row
);
}

}

return Array.from(
byTime.values()
).sort(
(
a,
b
)=>
a.time -
b.time
);

}

async function deepenAlgoHistoryIfNeeded(
seq
){

if(
!isAnyAnalysisBotActive() ||
!candles.length
){
return;
}

const havePages =
Math.max(
1,
Math.ceil(
candles.length /
TERMINAL_HISTORY_LAZY_BATCH_BARS
)
);
const extra =
HISTORY_REQUESTS -
havePages;

if(
extra <=
0
){
return;
}

try{
const older =
await loadMarketHistory(
symbol,
tf,
extra,
{
parallel:
true,
batchGapMs:
0,
endMs:
candles[0].time *
1000 -
1
}
);

if(
disposed ||
seq !==
loadSeq ||
!older?.length
){
return;
}

const beforeLen =
candles.length;
const range =
chart?.timeScale?.().getVisibleLogicalRange?.();
candles =
mergeOlderAlgoCandles(
older
);
const added =
candles.length -
beforeLen;

if(
added <=
0
){
return;
}

applyCandleData(
{
light:
true,
skipAnalysis:
true
}
);
chartIndicators?.notifyCandlesUpdate?.();
chartIndicators?.notifyMainChartOverlaysSync?.();

if(
range &&
chart?.timeScale?.().setVisibleLogicalRange
){
chart.timeScale().setVisibleLogicalRange(
{
from:
range.from +
added,
to:
range.to +
added
}
);
}

drawingTools?.scheduleRedraw?.();
markAlgoHistoryStatsReadyAndAnalyze();
}catch{
/* first paint already on screen */
}

}

async function loadSymbol(
nextSymbol,
nextTf
){

const seq =
++loadSeq;
const persistFromSymbol =
symbol;

if(
seq >
1
){
persistAlgoSettings(
{
overlaySymbol:
persistFromSymbol
}
);
}

symbol =
normalizeSymbol(
nextSymbol
);
tf =
String(
nextTf ||
tf ||
DEFAULT_TF
);

setChartLayoutReady(
false
);
stopKline();
setSymbolLabel();
setActiveTfButton();
hydrateTickerStrategyUi(
{
refreshFilters:
false
}
);
persistAlgoSettings(
{
writeOverlays:
false
}
);
drawingTools?.onSymbolChange?.({
skipRedraw:
true
});

if(
isAlgoBotLiteMode()
){
markAlgoHistoryStatsPending();

try{
const rows =
await loadAlgoBotLiteHistory(
symbol,
tf,
HISTORY_REQUESTS,
{
parallel:
true,
batchGapMs:
0
}
);

if(
disposed ||
seq !==
loadSeq
){
return;
}

candles =
Array.isArray(
rows
)
? rows.slice()
: [];

markAlgoHistoryStatsReadyAndAnalyze();
listApi?.highlight?.();
}catch(
err
){
console.error(
"[algo-trading] lite history",
getActiveExchangeId(),
symbol,
tf,
err
);

if(
seq ===
loadSeq
){
candles =
[];
markAlgoHistoryStatsReadyAndAnalyze();
}
}

return;
}

/* Индикаторы обновим после полной истории — не flush на пустых/старых свечах. */
try{
chartIndicators?.clearMainChartOverlays?.();
}catch{
/* ignore */
}
invalidateAlgoPattern12SceneCache();
algoPattern12EnabledOnce =
false;

markAlgoHistoryStatsPending();

try{
const rows =
await loadMarketHistory(
symbol,
tf,
terminalHistoryInitialRequests(),
{
parallel:
true,
batchGapMs:
0
}
);

if(
disposed ||
seq !==
loadSeq
){
return;
}

candles =
Array.isArray(
rows
)
? rows.slice()
: [];

/* Как Терминал: сначала свечи + fit, без тяжёлых оверлеев. */
applyCandleData(
{
fit:
true,
light:
true,
skipAnalysis:
true
}
);
void deepenAlgoHistoryIfNeeded(
seq
);

unsubKline =
subscribeKline(
symbol,
tf,
candle=>{

if(
disposed ||
seq !==
loadSeq
){
return;
}

const beforeLen =
candles.length;
const beforeTime =
candles[
candles.length -
1
]?.time;

if(
!mergeLiveCandle(
candles,
candle,
0
)
){
return;
}

const isNewBar =
candles.length !==
beforeLen ||
candles[
candles.length -
1
]?.time !==
beforeTime;

if(
isNewBar
){
applyCandleData(
{
forceAnalysis:
algoChartDbg(
"analysis"
),
light:
!algoChartDbg(
"analysis"
) &&
!algoChartDbg(
"indicators"
) &&
!algoChartDbg(
"filterLines"
),
skipAnalysis:
!algoChartDbg(
"analysis"
)
}
);
}else if(
algoChartDbg(
"livePrice"
)
){
applyLiveCandleTick();
}

}
);

listApi?.highlight?.();

/* Как scheduleChartLayoutSettled на Терминале: индикаторы и позиции поверх стабильного viewport. */
requestAnimationFrame(
()=>{
requestAnimationFrame(
()=>{

if(
disposed ||
seq !==
loadSeq
){
return;
}

setChartLayoutReady(
true
);
fitViewport();
runWithPreservedVisibleLogicalRange(
chart,
()=>{
if(
algoChartDbg(
"analysis"
) ||
algoChartDbg(
"indicators"
)
){
ensureAlgoPattern12Enabled();
}

if(
algoChartDbg(
"filterLines"
)
){
refreshEntryFilterLines();
}

if(
algoChartDbg(
"indicators"
)
){
chartIndicators?.notifyCandlesUpdate?.();
chartIndicators?.flushIndicatorDataRefreshNow?.();
chartIndicators?.notifyMainChartOverlaysSync?.();
}
}
);
fitViewport();
markAlgoHistoryStatsReadyAndAnalyze();
dispatchAlgoChartCandlesLoaded(
seq
);

if(
algoChartDbg(
"drawings"
)
){
drawingTools?.scheduleRedraw?.();
}

}
);
}
);

}catch(
err
){
console.error(
"[algo-trading] load",
getActiveExchangeId(),
symbol,
tf,
err
);

if(
seq ===
loadSeq
){
candles =
[];
applyCandleData(
{
fit:
true
}
);
setChartLayoutReady(
true
);
dispatchAlgoChartCandlesLoaded(
seq
);
markAlgoHistoryStatsReadyAndAnalyze();
}
}

}

const unlinkTime =
chart &&
rsiChart
? linkPairedChartTimeScales(
chart,
rsiChart,
layoutRsi,
{
/* RSI setData не должен двигать main — иначе cold-open/deepen мигает viewport. */
linkedDrivesMain:
false
}
)
: ()=>{};

if(
chart &&
candleSeries &&
linkedCrosshairVertEl &&
algoChartDbg(
"rsi"
)
){
const link =
linkChartsCrosshair(
{
mainChart:
chart,
linkedChart:
rsiChart,
mainSeries:
candleSeries,
linkedSeries:
rsiSeries,
linkedVertOverlayEl:
linkedCrosshairVertEl,
chartWrapEl,
chartEl,
linkedWrapEl:
rsiWrapEl,
linkedChartEl:
rsiChartEl,
crosshairTimeLabelEl:
document.getElementById(
"crosshair-time-label"
),
crosshairPriceLabelEl:
document.getElementById(
"crosshair-price-label"
),
onLinkedCrosshairRsiValue:
setRsiHud,
onLinkedCrosshairClear:
()=>
setRsiHud(
lastRsiValue()
)
}
);

disposeCrosshair =
()=>{
link.detachPointerCrosshair?.();
link.clearLinked?.();
};
}

const drawingsMount =
chart &&
algoChartDbg(
"drawings"
)
? mountAlgoTradingDrawings(
{
chart,
series:
candleSeries,
getSymbol:()=>
symbol,
getTf:()=>
tf,
getCandles:()=>
candles
}
)
: null;

drawingTools =
drawingsMount?.tools ||
null;
destroyDrawings =
drawingsMount?.destroy ||
(()=>{});

if(
chart
){
supertrendFilterOverlay =
createAlgoSupertrendFilterOverlay(
{
getChart:()=>
chart,
getSeries:()=>
candleSeries,
getDrawingTools:()=>
drawingTools,
getCandles:()=>
candles,
getTf:()=>
tf,
getGate:()=>
chartGate(),
getLinesVisible:()=>
!!mem.supertrendLinesVisible &&
isActiveAnalysisBot(
ALGO_ANALYSIS_BOT_PATTERN_12
)
}
);
supertrendFilterOverlay.bind();
}

if(
algoChartDbg(
"indicators"
)
){
chartIndicators =
await mountAlgoTradingIndicators(
{
root:
document.getElementById(
"chart-indicators-wrap"
),
skipApplyPrefs:
isAlgoBotLiteMode(),
getHost:()=>({
chart,
series:
candleSeries,
wrapEl:
document.getElementById(
"chart-wrap"
),
getDrawingTools:()=>
drawingTools,
getSymbol:()=>
symbol,
getCandles:()=>
candles,
getDisplayCandles:()=>
buildDisplayCandles(),
getTf:()=>
tf,
getVisibleBarsCap:()=>
TERMINAL_VISIBLE_BARS,
onIndicatorSettingsChange:(
indicatorId
)=>{

if(
indicatorId !==
"pattern-12" ||
disposed
){
return;
}

void syncBotStrategiesToMain();

if(
!historyStatsReady ||
!candles.length
){
return;
}

refreshAlgoPatternAnalysis(
candles,
entryOverlay,
buildPatternAnalysisOpts()
);
drawingTools?.scheduleRedraw?.();

},
loadIndicatorHistory:(
histSymbol,
histTf,
requests
)=>
loadMarketHistory(
histSymbol,
histTf,
requests ||
HISTORY_REQUESTS,
{
parallel:
true,
batchGapMs:
0
}
),
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
rsiChart,
setRsiPaneActive,
isRsiPaneVisible:()=>
rsiPaneActive,
layoutRsiBand:
layoutRsi,
onRsiSettingsChange,
settleChartViewport:
fitViewport,
onIndicatorToggle(
id
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
fitViewport();
scheduleResizeAlgoCharts();
}

}
})
}
);

}else{
chartIndicators =
null;
}

document.getElementById(
"rsi-hud"
)?.addEventListener(
"dblclick",
event=>{
event.preventDefault();
event.stopPropagation();
chartIndicators?.openSettings?.(
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
chartIndicators?.openSettings?.(
"macd"
);
}
);

if(
isAlgoBotLiteMode()
){
const indicatorsRoot =
document.getElementById(
"chart-indicators-wrap"
);
const patternSettingsPane =
document.getElementById(
"algo-bot-lite-pattern-settings"
);
indicatorsRoot?.classList.add(
"algo-bot-lite-pattern-only"
);
chartIndicators?.renderIndicatorSettingsInline?.(
"pattern-12",
patternSettingsPane
);
}

entryOverlay =
null;

if(
chart &&
algoChartDbg(
"entryOverlay"
)
){
entryOverlay =
mountAlgoPatternEntryOverlay(
{
chart,
series:
candleSeries,
getCandles:()=>
candles,
getDrawingTools:()=>
drawingTools,
getSlPctOfX:()=>
chartGate().slPctOfX,
getReverseLogic:()=>
!!readAlgoPattern12Settings().reverseLogic,
getTpRr:()=>
mem.tpRr,
getRiskUsd:()=>
mem.riskUsd,
getTimeoutBars:()=>
mem.timeoutBars,
getMaxPt1Pt4Bars:()=>
mem.maxPt1Pt4Bars,
getPullbackBeforeArm:()=>
chartGate().pullbackBeforeArm,
getPullbackBeforeArmPct:()=>
chartGate().pullbackBeforeArmPct,
getChartPositionsStrategy:()=>
mem.chartPositionsStrategy,
getTp1X:()=>
mem.tp1X,
getTp2X:()=>
mem.tp2X,
getTp3X:()=>
mem.tp3X,
getTp1Y:()=>
mem.tp1Y,
getTp2Y:()=>
mem.tp2Y,
getTp3Y:()=>
mem.tp3Y
}
);
entryOverlay.bind();
}

rsiTouchFlipHost?.destroy?.();
rsiTouchFlipHost =
mountRsiTouchFlipHost(
{
getCandles:()=>
candles,
getSeries:()=>
candleSeries,
getChartTf:()=>
tf,
getSymbol:()=>
symbol,
isHistoryReady:()=>
historyStatsReady,
loadHistory:(
histSymbol,
histTf,
requests,
options
)=>
isAlgoBotLiteMode()
? loadAlgoBotLiteHistory(
histSymbol,
histTf,
requests ||
HISTORY_REQUESTS,
options ||
{
parallel:
true,
batchGapMs:
0
}
)
: loadMarketHistory(
histSymbol,
histTf,
requests ||
HISTORY_REQUESTS,
options ||
{
parallel:
true,
batchGapMs:
0
}
)
}
);

applyActiveAnalysisBotChartUi();

window.addEventListener(
ALGO_ANALYSIS_BOT_CHANGE_EVENT,
applyActiveAnalysisBotChartUi
);

if(
algoChartDbg(
"tradeUi"
)
){
void mountAlgoTradeUi(
{
chart,
series:
candleSeries,
wrapEl:
chartWrapEl ||
chartEl,
chartEl,
getSymbol:()=>
symbol,
getDrawingTools:()=>
drawingTools
}
).then(
api=>{
tradeUi =
api;

if(
candles.length
){
setChartLayoutReady(
true
);
/* Не flush и не fit: load/markReady уже выставил viewport.
   Поздний fit/flush здесь давал видимый прыжок на cold-open. */
dispatchAlgoChartCandlesLoaded(
loadSeq
);
drawingTools?.scheduleRedraw?.();
}
}
).catch(
err=>{
console.warn(
"[algo-trading] trade ui",
err
);
}
);
}

window.addEventListener(
"algo-book-open-symbol",
event=>{

const next =
normalizeSymbol(
event.detail?.symbol
);

if(
!next ||
next ===
symbol
){
return;
}

void loadSymbol(
next,
tf
);

}
);

const tpRrInput =
document.getElementById(
"algo-tp-rr"
);
const riskUsdInput =
document.getElementById(
"algo-risk-usd"
);
const timeoutBarsInput =
document.getElementById(
"algo-timeout-bars"
);

if(
timeoutBarsInput
){
timeoutBarsInput.value =
String(
mem.timeoutBars
);

const commitTimeoutBars =
()=>{
const next =
clampEntryTimeoutBars(
timeoutBarsInput.value
);
timeoutBarsInput.value =
String(
next
);

if(
next ===
mem.timeoutBars
){
return;
}

mem.timeoutBars =
next;
persistAlgoSettings();
};

bindAlgoNumericField(
timeoutBarsInput,
commitTimeoutBars
);
}

const maxPt1Pt4BarsInput =
document.getElementById(
"algo-max-pt1-pt4-bars"
);

if(
maxPt1Pt4BarsInput
){
maxPt1Pt4BarsInput.value =
mem.maxPt1Pt4Bars ==
null
? ""
: String(
mem.maxPt1Pt4Bars
);

const commitMaxPt1Pt4Bars =
()=>{
const next =
clampMaxPt1Pt4Bars(
maxPt1Pt4BarsInput.value
);
maxPt1Pt4BarsInput.value =
next ==
null
? ""
: String(
next
);

if(
next ===
mem.maxPt1Pt4Bars
){
return;
}

mem.maxPt1Pt4Bars =
next;
persistAlgoSettings();
};

bindAlgoNumericField(
maxPt1Pt4BarsInput,
commitMaxPt1Pt4Bars
);
}



function bindStrategyGateUi(
id
){

function gate(){

return algoGate(
id
);

}

const g =
gate();
const slEl =
document.getElementById(
`algo-sl-pct-of-x-${id}`
);
const pbEl =
document.getElementById(
`algo-pullback-before-arm-${id}`
);
const pbPctEl =
document.getElementById(
`algo-pullback-before-arm-pct-${id}`
);

if(
slEl
){
slEl.value =
String(
g.slPctOfX
);
const commit =
()=>{
const live =
gate();
const next =
clampSlPctOfX(
slEl.value
);
slEl.value =
String(
next
);
if(
next ===
live.slPctOfX
){
return;
}
live.slPctOfX =
next;
persistAlgoSettings();
};
bindAlgoNumericField(
slEl,
commit
);
}

if(
pbPctEl
){
pbPctEl.value =
String(
g.pullbackBeforeArmPct
);
const commit =
()=>{
const live =
gate();
const next =
clampPullbackBeforeArmPct(
pbPctEl.value
);
pbPctEl.value =
String(
next
);
if(
next ===
live.pullbackBeforeArmPct
){
return;
}
live.pullbackBeforeArmPct =
next;
persistAlgoSettings();
};
bindAlgoNumericField(
pbPctEl,
commit
);
}

if(
pbEl
){
pbEl.checked =
g.pullbackBeforeArm;
pbEl.addEventListener(
"change",
()=>{
gate().pullbackBeforeArm =
!!pbEl.checked;
persistAlgoSettings();
}
);
}

function bindStSide(
side
){

const cap =
side ===
"long"
? "Long"
: "Short";
const filterKey =
side ===
"long"
? "supertrendLongFilter"
: "supertrendShortFilter";
const atrKey =
side ===
"long"
? "supertrendLongAtr"
: "supertrendShortAtr";
const factorKey =
side ===
"long"
? "supertrendLongFactor"
: "supertrendShortFactor";
const tfKey =
side ===
"long"
? "supertrendLongTf"
: "supertrendShortTf";
const filterEl =
document.getElementById(
`algo-st-${id}-${side}-filter`
);
const atrEl =
document.getElementById(
`algo-st-${id}-${side}-atr`
);
const factorEl =
document.getElementById(
`algo-st-${id}-${side}-factor`
);
const tfEl =
document.getElementById(
`algo-st-${id}-${side}-tf`
);

if(
filterEl
){
filterEl.checked =
g[
filterKey
];
filterEl.addEventListener(
"change",
()=>{
gate()[
filterKey
] =
!!filterEl.checked;
persistAlgoSettings();
refreshEntryFilterLines();
}
);
}

if(
atrEl
){
atrEl.value =
String(
g[
atrKey
]
);
atrEl.addEventListener(
"change",
()=>{
const live =
gate();
const next =
clampAlgoSupertrendAtr(
atrEl.value
);
atrEl.value =
String(
next
);
live[
atrKey
] =
next;
persistAlgoSettings();
refreshEntryFilterLines();
}
);
}

if(
factorEl
){
factorEl.value =
String(
g[
factorKey
]
);
factorEl.addEventListener(
"change",
()=>{
const live =
gate();
const next =
clampAlgoSupertrendFactor(
factorEl.value
);
factorEl.value =
String(
next
);
live[
factorKey
] =
next;
persistAlgoSettings();
refreshEntryFilterLines();
}
);
}

if(
tfEl
){
tfEl.value =
g[
tfKey
];
tfEl.addEventListener(
"change",
()=>{
const live =
gate();
const next =
normalizeAlgoSupertrendTf(
tfEl.value
);
tfEl.value =
next;
live[
tfKey
] =
next;
persistAlgoSettings();
refreshEntryFilterLines();
}
);
}

void cap;

}

bindStSide(
"long"
);
bindStSide(
"short"
);

}

for(
const id of ALGO_STRATEGY_IDS
){
bindStrategyGateUi(
id
);
}

const tp1XInput =
document.getElementById(
"algo-tp1-x"
);
const tp2XInput =
document.getElementById(
"algo-tp2-x"
);
const tp3XInput =
document.getElementById(
"algo-tp3-x"
);


function strategyPrefKeys(
id
){

return strategyPrefKeysFromMemory(
id
);

}

function strategyPatchFromState(
strategyId
){

return strategyPatchFromStateFromMemory(
mem,
strategyId
);

}

function applyStrategyPatchToMemory(
strategyId,
patch
){

return applyStrategyPatchToMemoryFromMemory(
mem,
strategyId,
patch
);

}

function syncStrategyDomFromMemory(){

return syncStrategyDomFromMemoryFromMemory(
mem
);

}

function restoreStrategyMemoryFromPrefs(){

return restoreStrategyMemoryFromPrefsFromMemory(
mem
);

}

function hydrateTickerStrategyUi(
opts =
{}
){

restoreStrategyMemoryFromPrefs();

for(
const id of ALGO_STRATEGY_IDS
){
const overlay =
getTickerStrategyOverlay(
id,
symbol
);

if(
overlay
){
applyStrategyPatchToMemory(
id,
overlay
);
}

}

syncStrategyDomFromMemory();

if(
opts.refreshFilters !==
false
){
refreshEntryFilterLines();
}

}

function applyOptimizedPatchesToTickers(
strategyId,
entries
){

const written =
writeTickerStrategyOverlays(
strategyId,
entries
);
const overlay =
getTickerStrategyOverlay(
strategyId,
symbol
);

if(
overlay
){
applyStrategyPatchToMemory(
strategyId,
overlay
);
}

syncStrategyDomFromMemory();
refreshEntryFilterLines();
persistAlgoSettings(
{
writeOverlays:
false
}
);
return written;

}

function persistAlgoSettings(
opts
){

const overlaySymbol =
opts &&
opts.overlaySymbol !=
null
? normalizeSymbol(
opts.overlaySymbol
)
: symbol;
const writeOverlays =
!opts ||
opts.writeOverlays !==
false;
const prev =
readPrefs();
let prevStored =
{};

try{
const raw =
JSON.parse(
localStorage.getItem(
ALGO_PREFS_KEY
) ||
"{}"
);
if(
raw &&
typeof raw ===
"object" &&
!Array.isArray(
raw
)
){
prevStored =
raw;
}
}catch{
prevStored =
{};
}
const snapshot =
buildAlgoPrefsSnapshot(
mem,
{
symbol,
tf
}
);

for(
const id of ALGO_STRATEGY_IDS
){

if(
writeOverlays &&
hasTickerStrategyOverlay(
id,
overlaySymbol
)
){
setTickerStrategyOverlay(
id,
overlaySymbol,
strategyPatchFromState(
id
)
);
}

if(
!hasTickerStrategyOverlay(
id,
symbol
)
){
continue;
}

for(
const key of strategyPrefKeys(
id
)
){
if(
Object.prototype.hasOwnProperty.call(
prevStored,
key
) &&
prevStored[
key
] !=
null
){
snapshot[
key
] =
prevStored[
key
];
continue;
}

if(
Object.prototype.hasOwnProperty.call(
prev,
key
)
){
snapshot[
key
] =
prev[
key
];
}
}

}

writePrefs(
snapshot
);
entryOverlay?.refreshPositions?.();
drawingTools?.scheduleRedraw?.();
refreshAlgoPatternAnalysis(
candles,
entryOverlay,
buildPatternAnalysisOpts()
);
chartIndicators?.flushIndicatorDataRefreshNow?.();
drawingTools?.scheduleRedraw?.();
}

const statsModeRoots =
{
"fixed-tp":
document.querySelector(
'[data-algo-strategy="fixed-tp"] .algo-stats-mode'
),
"partial-tp":
document.querySelector(
'[data-algo-strategy="partial-tp"] .algo-stats-mode'
),
"partial-tp-y":
document.querySelector(
'[data-algo-strategy="partial-tp-y"] .algo-stats-mode'
)
};

function getStatsModeForStrategy(
strategy
){

if(
strategy ===
"partial-tp"
){
return mem.statsModeSt2;
}

if(
strategy ===
"partial-tp-y"
){
return mem.statsModeSt3;
}

return mem.statsMode;

}

function setStatsModeForStrategy(
strategy,
mode
){

const next =
normalizeAlgoStatsMode(
mode
);

if(
strategy ===
"partial-tp"
){
mem.statsModeSt2 =
next;
}else if(
strategy ===
"partial-tp-y"
){
mem.statsModeSt3 =
next;
}else{
mem.statsMode =
next;
}

}

function applyStatsModeButtons(){

for(
const [
strategy,
root
] of Object.entries(
statsModeRoots
)
){

if(
!root
){
continue;
}

const current =
getStatsModeForStrategy(
strategy
);

for(
const btn of root.querySelectorAll(
"[data-algo-stats-mode]"
)
){
const mode =
normalizeAlgoStatsMode(
btn.getAttribute(
"data-algo-stats-mode"
)
);
const active =
mode ===
current;
btn.classList.toggle(
"active",
active
);
btn.setAttribute(
"aria-selected",
active
? "true"
: "false"
);
}

}

}

applyStatsModeButtons();

for(
const [
strategy,
root
] of Object.entries(
statsModeRoots
)
){

root?.addEventListener(
"click",
event=>{
const btn =
event.target?.closest?.(
"[data-algo-stats-mode]"
);

if(
!(
btn instanceof HTMLElement
)
){
return;
}

const next =
normalizeAlgoStatsMode(
btn.getAttribute(
"data-algo-stats-mode"
)
);

if(
next ===
getStatsModeForStrategy(
strategy
)
){
return;
}

setStatsModeForStrategy(
strategy,
next
);
applyStatsModeButtons();
persistAlgoSettings();

}
);

}

const chartPositionChecks =
[
...document.querySelectorAll(
"[data-algo-chart-positions]"
)
];

function applyChartPositionChecks(){

for(
const input of chartPositionChecks
){
const strategy =
input.getAttribute(
"data-algo-chart-positions"
);
input.checked =
strategy ===
mem.chartPositionsStrategy;
}

}

applyChartPositionChecks();

for(
const input of chartPositionChecks
){

input.addEventListener(
"change",
()=>{
const strategy =
input.getAttribute(
"data-algo-chart-positions"
);

if(
!input.checked
){
/* Keep one strategy always selected. */
input.checked =
true;
return;
}

if(
strategy !==
"fixed-tp" &&
strategy !==
"partial-tp" &&
strategy !==
"partial-tp-y"
){
input.checked =
false;
return;
}

mem.chartPositionsStrategy =
strategy;
applyChartPositionChecks();
persistAlgoSettings();
refreshEntryFilterLines();
entryOverlay?.refreshPositions?.();

}
);

}

if(
tpRrInput
){
tpRrInput.value =
String(
mem.tpRr
);

const commitTpRr =
()=>{
const next =
clampTpRr(
tpRrInput.value
);
tpRrInput.value =
String(
next
);

if(
next ===
mem.tpRr
){
return;
}

mem.tpRr =
next;
persistAlgoSettings();
};

bindAlgoNumericField(
tpRrInput,
commitTpRr
);
}

if(
riskUsdInput
){
riskUsdInput.value =
String(
mem.riskUsd
);

const commitRiskUsd =
()=>{
const next =
clampRiskUsd(
riskUsdInput.value
);
riskUsdInput.value =
String(
next
);

if(
next ===
mem.riskUsd
){
return;
}

mem.riskUsd =
next;
persistAlgoSettings();
};

bindAlgoNumericField(
riskUsdInput,
commitRiskUsd
);
}

function bindPartialTpInput(
input,
getValue,
setValue,
fallback
){

if(
!input
){
return;
}

input.value =
String(
getValue()
);

const commit =
()=>{
const next =
clampPartialTpX(
input.value,
fallback
);
input.value =
String(
next
);

if(
next ===
getValue()
){
return;
}

setValue(
next
);
persistAlgoSettings();
};

bindAlgoNumericField(
input,
commit
);
}

bindPartialTpInput(
tp1XInput,
()=>
mem.tp1X,
next=>{
mem.tp1X =
next;
},
DEFAULT_PARTIAL_TP1_X
);
bindPartialTpInput(
tp2XInput,
()=>
mem.tp2X,
next=>{
mem.tp2X =
next;
},
DEFAULT_PARTIAL_TP2_X
);
bindPartialTpInput(
tp3XInput,
()=>
mem.tp3X,
next=>{
mem.tp3X =
next;
},
DEFAULT_PARTIAL_TP3_X
);

const tp1YInput =
document.getElementById(
"algo-tp1-y"
);
const tp2YInput =
document.getElementById(
"algo-tp2-y"
);
const tp3YInput =
document.getElementById(
"algo-tp3-y"
);

bindPartialTpInput(
tp1YInput,
()=>
mem.tp1Y,
next=>{
mem.tp1Y =
next;
},
DEFAULT_PARTIAL_TP1_X
);
bindPartialTpInput(
tp2YInput,
()=>
mem.tp2Y,
next=>{
mem.tp2Y =
next;
},
DEFAULT_PARTIAL_TP2_X
);
bindPartialTpInput(
tp3YInput,
()=>
mem.tp3Y,
next=>{
mem.tp3Y =
next;
},
DEFAULT_PARTIAL_TP3_X
);

function bindTrailSlXInput(
input,
getValue,
setValue,
clamp
){

if(
!input
){
return;
}

input.value =
String(
getValue()
);

const commit =
()=>{
const next =
clamp(
input.value
);
input.value =
String(
next
);

if(
next ===
getValue()
){
return;
}

setValue(
next
);
persistAlgoSettings();
};

bindAlgoNumericField(
input,
commit
);
}

function bindTrailSlCheck(
input,
getValue,
setValue
){

if(
!input
){
return;
}

input.checked =
!!getValue();
input.addEventListener(
"change",
()=>{
const next =
!!input.checked;

if(
next ===
!!getValue()
){
return;
}

setValue(
next
);
persistAlgoSettings();
}
);

}

const trailSlX1St2Input =
document.getElementById(
"algo-trail-sl-x1-st2"
);
const trailSlX2St2Input =
document.getElementById(
"algo-trail-sl-x2-st2"
);
const trailSlSt2Check =
document.getElementById(
"algo-trail-sl-st2"
);
const trailSlX1St3Input =
document.getElementById(
"algo-trail-sl-x1-st3"
);
const trailSlX2St3Input =
document.getElementById(
"algo-trail-sl-x2-st3"
);
const trailSlSt3Check =
document.getElementById(
"algo-trail-sl-st3"
);

const clampTrailSlX2St2 =
raw=>
clampTrailSlX2(
raw,
mem.trailSlX1St2,
[
mem.tp1X,
mem.tp2X,
mem.tp3X
]
);
const clampTrailSlX2St3 =
raw=>
clampTrailSlX2(
raw,
mem.trailSlX1St3,
[
mem.tp1Y,
mem.tp2Y,
mem.tp3Y
]
);

/** Подъём трейлинга после ТП1 может поднять и нижнюю границу для ТП2. */
function reclampTrailSlX2(
input,
clamp,
getValue,
setValue
){

const next =
clamp(
getValue()
);

if(
input
){
input.value =
String(
next
);
}

if(
next !==
getValue()
){
setValue(
next
);
}

}

bindTrailSlXInput(
trailSlX1St2Input,
()=>
mem.trailSlX1St2,
next=>{
mem.trailSlX1St2 =
next;
reclampTrailSlX2(
trailSlX2St2Input,
clampTrailSlX2St2,
()=>
mem.trailSlX2St2,
value=>{
mem.trailSlX2St2 =
value;
}
);
},
clampTrailSlX1
);
bindTrailSlXInput(
trailSlX2St2Input,
()=>
mem.trailSlX2St2,
next=>{
mem.trailSlX2St2 =
next;
},
clampTrailSlX2St2
);
bindTrailSlCheck(
trailSlSt2Check,
()=>
mem.trailSlSt2,
next=>{
mem.trailSlSt2 =
next;
}
);
bindTrailSlXInput(
trailSlX1St3Input,
()=>
mem.trailSlX1St3,
next=>{
mem.trailSlX1St3 =
next;
reclampTrailSlX2(
trailSlX2St3Input,
clampTrailSlX2St3,
()=>
mem.trailSlX2St3,
value=>{
mem.trailSlX2St3 =
value;
}
);
},
clampTrailSlX1
);
bindTrailSlXInput(
trailSlX2St3Input,
()=>
mem.trailSlX2St3,
next=>{
mem.trailSlX2St3 =
next;
},
clampTrailSlX2St3
);
bindTrailSlCheck(
trailSlSt3Check,
()=>
mem.trailSlSt3,
next=>{
mem.trailSlSt3 =
next;
}
);

/**
 * Доли ТП: правим одно поле — два других подгоняются до 100%.
 * @param {"x"|"y"} span
 * @param {()=>number[]} getShares
 * @param {(shares: number[])=>void} setShares
 */
function bindTpShareInputs(
span,
getShares,
setShares
){

const inputs =
[
1,
2,
3
].map(
n=>
document.getElementById(
`algo-share${n}-${span}`
)
);

const render =
()=>{
const shares =
getShares();

inputs.forEach(
(
input,
i
)=>{
if(
input
){
input.value =
String(
shares[
i
]
);
}
}
);
};

render();

inputs.forEach(
(
input,
index
)=>{

if(
!input
){
return;
}

const commit =
()=>{
const cur =
getShares();
const next =
rebalanceTpShares(
index ===
0
? input.value
: cur[
0
],
index ===
1
? input.value
: cur[
1
],
index ===
2
? input.value
: cur[
2
],
index
);

if(
next.every(
(
value,
i
)=>
value ===
cur[
i
]
)
){
render();
return;
}

setShares(
next
);
render();
persistAlgoSettings();
};

bindAlgoNumericField(
input,
commit
);
}
);

}

bindTpShareInputs(
"x",
()=>[
mem.share1X,
mem.share2X,
mem.share3X
],
next=>{
mem.share1X =
next[
0
];
mem.share2X =
next[
1
];
mem.share3X =
next[
2
];
}
);
bindTpShareInputs(
"y",
()=>[
mem.share1Y,
mem.share2Y,
mem.share3Y
],
next=>{
mem.share1Y =
next[
0
];
mem.share2Y =
next[
1
];
mem.share3Y =
next[
2
];
}
);

(function bindSupertrendFilter(){

function bindSide(
prefix,
getState,
setState
){

const filterEl =
document.getElementById(
`algo-st-${prefix}-filter`
);
const atrEl =
document.getElementById(
`algo-st-${prefix}-atr`
);
const factorEl =
document.getElementById(
`algo-st-${prefix}-factor`
);
const tfEl =
document.getElementById(
`algo-st-${prefix}-tf`
);
const state =
getState();

if(
filterEl
){
filterEl.checked =
state.filter;
filterEl.addEventListener(
"change",
()=>{
setState(
{
filter:
!!filterEl.checked
}
);
persistAlgoSettings();
refreshEntryFilterLines();
schedulePatternAnalysis(
{
force:
true
}
);
}
);
}

if(
atrEl
){
atrEl.value =
String(
state.atr
);
atrEl.addEventListener(
"change",
()=>{
const next =
clampAlgoSupertrendAtr(
atrEl.value
);
atrEl.value =
String(
next
);
setState(
{
atr:
next
}
);
persistAlgoSettings();
refreshEntryFilterLines();
schedulePatternAnalysis(
{
force:
true
}
);
}
);
}

if(
factorEl
){
factorEl.value =
String(
state.factor
);
factorEl.addEventListener(
"change",
()=>{
const next =
clampAlgoSupertrendFactor(
factorEl.value
);
factorEl.value =
String(
next
);
setState(
{
factor:
next
}
);
persistAlgoSettings();
refreshEntryFilterLines();
schedulePatternAnalysis(
{
force:
true
}
);
}
);
}

if(
tfEl
){
tfEl.value =
state.tf;
tfEl.addEventListener(
"change",
()=>{
const next =
normalizeAlgoSupertrendTf(
tfEl.value
);
tfEl.value =
next;
setState(
{
tf:
next
}
);
persistAlgoSettings();
refreshEntryFilterLines();
schedulePatternAnalysis(
{
force:
true
}
);
}
);
}

}

(function bindSupertrendLinesVisible(){

const el =
document.getElementById(
"algo-st-lines-visible"
);

if(
!el
){
return;
}

el.checked =
mem.supertrendLinesVisible;
el.addEventListener(
"change",
()=>{
mem.supertrendLinesVisible =
!!el.checked;
persistAlgoSettings();
refreshSupertrendFilterLines();
}
);

})();

})();



tfBar?.addEventListener(
"click",
event=>{

const btn =
event.target?.closest?.(
".tf-btn"
);

if(
!btn?.dataset?.tf
){
return;
}

void loadSymbol(
symbol,
btn.dataset.tf
);

}
);

document.getElementById(
"algo-rsi-flip-chart-tf"
)?.addEventListener(
"change",
event=>{

const next =
String(
event?.target?.value ||
""
).trim();

if(
!next ||
next ===
tf
){
return;
}

void loadSymbol(
symbol,
next
);

}
);


const unbindAlgoPageHotkeys =
bindAlgoPageHotkeys(
{
getDisposed:()=>
disposed,
getSymbol:()=>
symbol,
loadSymbol,
getDrawingTools:()=>
drawingTools
}
);



window.addEventListener(
"resize",
()=>{
scheduleResizeAlgoCharts();
chartIndicators?.syncViewports?.();
}
);

const disposeStatsResize =
isAlgoBotLiteMode()
? ()=>{
const panel =
document.getElementById(
"algo-stats-panel"
);
panel?.classList.remove(
"is-collapsed"
);
if(
panel
){
panel.style.removeProperty(
"--algo-stats-panel-h"
);
panel.style.removeProperty(
"flex"
);
panel.style.removeProperty(
"height"
);
}
}
: bindAlgoStatsPanelResize(
()=>{
scheduleResizeAlgoCharts();
chartIndicators?.syncViewports?.();
},
(
collapsed,
wasCollapsed
)=>{
algoStatsPanelCollapsed =
collapsed;

if(
collapsed &&
!wasCollapsed
){
/* Пауза анализа → полная сцена паттерна (как до первого прогона). */
clearAlgoPattern12PaintEntryFilter();
drawingTools?.scheduleRedraw?.();
}

if(
wasCollapsed &&
!collapsed
){
schedulePatternAnalysis(
{
force:
true
}
);
}
}
);

recaptureAlgoStatsPanelHeight =
typeof disposeStatsResize.recapture ===
"function"
? disposeStatsResize.recapture
: ()=>{};

let chartResizeObserver =
null;

if(
typeof ResizeObserver !==
"undefined" &&
chartWrapEl
){

chartResizeObserver =
new ResizeObserver(
()=>{
scheduleResizeAlgoCharts();
}
);

chartResizeObserver.observe(
chartWrapEl
);

if(
rsiWrapEl
){
chartResizeObserver.observe(
rsiWrapEl
);
}

}

scheduleResizeAlgoCharts();

window.addEventListener(
"pagehide",
()=>{
disposed =
true;
unbindAlgoPageHotkeys();
window.removeEventListener(
ALGO_ANALYSIS_BOT_CHANGE_EVENT,
applyActiveAnalysisBotChartUi
);
disposeStatsResize?.();
chartResizeObserver?.disconnect?.();
chartResizeObserver =
null;
tickerScanUi?.stopAll?.();
tickerScanUi =
null;
strategyParamOptimizeUi?.destroy?.();
strategyParamOptimizeUi =
null;
if(
patternAnalysisTimer
){
clearTimeout(
patternAnalysisTimer
);
patternAnalysisTimer =
0;
}

stopKline();
listApi?.destroy?.();
listApi =
null;
entryOverlay?.destroy?.();
entryOverlay =
null;
rsiTouchFlipHost?.destroy?.();
rsiTouchFlipHost =
null;
destroySupertrendFilterLines();
tradeUi?.destroy?.();
tradeUi =
null;
botStrategyUi?.destroy?.();
botStrategyUi =
null;
destroyDrawings?.();
chartIndicators?.destroy?.();
chartIndicators =
null;
disposeCrosshair?.();
unlinkTime?.();
}
);

setActiveTfButton();
setSymbolLabel();

tickerScanUi =
mountAlgoTickerScanUi(
{
getTradeOpts:(
strategyId
)=>
buildTradeOpts(
strategyId
),
getStrategyStatsMode:(
id
)=>{
if(
id ===
"st2"
){
return mem.statsModeSt2;
}

if(
id ===
"st3"
){
return mem.statsModeSt3;
}

return mem.statsMode;
},
getScanTf:()=>
mem.scanTf,
readPrefs,
persistPrefs(
patch
){
if(
patch.scanStrategy ===
"st1" ||
patch.scanStrategy ===
"st2" ||
patch.scanStrategy ===
"st3"
){
mem.scanStrategy =
patch.scanStrategy;
}

if(
patch.scanTf !=
null
){
mem.scanTf =
normalizeAlgoScanTfPref(
patch.scanTf
);
}

if(
patch.scanLongMinWinRate !=
null
){
mem.scanLongMinWinRate =
clampScanMinWinRate(
patch.scanLongMinWinRate
);
}

if(
patch.scanShortMinWinRate !=
null
){
mem.scanShortMinWinRate =
clampScanMinWinRate(
patch.scanShortMinWinRate
);
}

if(
patch.scanBothMinWinRate !=
null
){
mem.scanBothMinWinRate =
clampScanMinWinRate(
patch.scanBothMinWinRate
);
}

if(
patch.scanTop100MinWinRate !=
null
){
mem.scanTop100MinWinRate =
clampScanMinWinRate(
patch.scanTop100MinWinRate
);
}

persistAlgoSettings();
},
applyOptimizedPatchesToTickers,
hydrateTickerStrategyUi,
onListsChanged(){
refreshAlgoMarketListFromFlags();
}
}
);

strategyParamOptimizeUi =
mountAlgoStrategyParamOptimizeUi(
{
getCandles:()=>
candles,
getSymbol:()=>
symbol,
getTradeOpts:(
strategyId
)=>
buildTradeOpts(
strategyId
),
getStrategyStatsMode:(
id
)=>{
if(
id ===
"st2"
){
return mem.statsModeSt2;
}

if(
id ===
"st3"
){
return mem.statsModeSt3;
}

return mem.statsMode;
},
applyOptimizedParams(
strategyId,
patch
){

const gateId =
strategyId ===
"st2" ||
strategyId ===
"st3"
? strategyId
: "st1";
const g =
algoGate(
gateId
);

function setNum(
id,
value
){
const el =
document.getElementById(
id
);

if(
el
){
el.value =
String(
value
);
}

}

function setCheck(
id,
value
){
const el =
document.getElementById(
id
);

if(
el
){
el.checked =
!!value;
}

}

if(
patch.slPctOfX !=
null
){
g.slPctOfX =
clampSlPctOfX(
patch.slPctOfX
);
setNum(
`algo-sl-pct-of-x-${gateId}`,
g.slPctOfX
);
}

if(
patch.tpRr !=
null
){
mem.tpRr =
clampTpRr(
patch.tpRr
);
setNum(
"algo-tp-rr",
mem.tpRr
);
}

if(
patch.pullbackBeforeArm !=
null
){
g.pullbackBeforeArm =
normalizePullbackBeforeArmEnabled(
patch.pullbackBeforeArm
);
setCheck(
`algo-pullback-before-arm-${gateId}`,
g.pullbackBeforeArm
);
}

if(
patch.pullbackBeforeArmPct !=
null
){
g.pullbackBeforeArmPct =
clampPullbackBeforeArmPct(
patch.pullbackBeforeArmPct
);
setNum(
`algo-pullback-before-arm-pct-${gateId}`,
g.pullbackBeforeArmPct
);
}

if(
patch.supertrendLongFilter !=
null
){
g.supertrendLongFilter =
!!patch.supertrendLongFilter;
setCheck(
`algo-st-${gateId}-long-filter`,
g.supertrendLongFilter
);
}

if(
patch.supertrendLongAtr !=
null
){
g.supertrendLongAtr =
clampAlgoSupertrendAtr(
patch.supertrendLongAtr
);
setNum(
`algo-st-${gateId}-long-atr`,
g.supertrendLongAtr
);
}

if(
patch.supertrendLongFactor !=
null
){
g.supertrendLongFactor =
clampAlgoSupertrendFactor(
patch.supertrendLongFactor
);
setNum(
`algo-st-${gateId}-long-factor`,
g.supertrendLongFactor
);
}

if(
patch.supertrendLongTf !=
null
){
g.supertrendLongTf =
normalizeAlgoSupertrendTf(
patch.supertrendLongTf
);
const tfEl =
document.getElementById(
`algo-st-${gateId}-long-tf`
);

if(
tfEl
){
tfEl.value =
g.supertrendLongTf;
}

}

if(
patch.supertrendShortFilter !=
null
){
g.supertrendShortFilter =
!!patch.supertrendShortFilter;
setCheck(
`algo-st-${gateId}-short-filter`,
g.supertrendShortFilter
);
}

if(
patch.supertrendShortAtr !=
null
){
g.supertrendShortAtr =
clampAlgoSupertrendAtr(
patch.supertrendShortAtr
);
setNum(
`algo-st-${gateId}-short-atr`,
g.supertrendShortAtr
);
}

if(
patch.supertrendShortFactor !=
null
){
g.supertrendShortFactor =
clampAlgoSupertrendFactor(
patch.supertrendShortFactor
);
setNum(
`algo-st-${gateId}-short-factor`,
g.supertrendShortFactor
);
}

if(
patch.supertrendShortTf !=
null
){
g.supertrendShortTf =
normalizeAlgoSupertrendTf(
patch.supertrendShortTf
);
const tfEl =
document.getElementById(
`algo-st-${gateId}-short-tf`
);

if(
tfEl
){
tfEl.value =
g.supertrendShortTf;
}

}

if(
patch.tp1X !=
null
){
mem.tp1X =
clampPartialTpX(
patch.tp1X,
DEFAULT_PARTIAL_TP1_X
);
setNum(
"algo-tp1-x",
mem.tp1X
);
}

if(
patch.tp2X !=
null
){
mem.tp2X =
clampPartialTpX(
patch.tp2X,
DEFAULT_PARTIAL_TP2_X
);
setNum(
"algo-tp2-x",
mem.tp2X
);
}

if(
patch.tp3X !=
null
){
mem.tp3X =
clampPartialTpX(
patch.tp3X,
DEFAULT_PARTIAL_TP3_X
);
setNum(
"algo-tp3-x",
mem.tp3X
);
}

if(
patch.trailSlSt2 !=
null
){
mem.trailSlSt2 =
!!patch.trailSlSt2;
setCheck(
"algo-trail-sl-st2",
mem.trailSlSt2
);
}

if(
patch.trailSlX1St2 !=
null
){
mem.trailSlX1St2 =
clampTrailSlX1(
patch.trailSlX1St2
);
setNum(
"algo-trail-sl-x1-st2",
mem.trailSlX1St2
);
}

if(
patch.trailSlX2St2 !=
null
){
mem.trailSlX2St2 =
clampTrailSlX2(
patch.trailSlX2St2,
mem.trailSlX1St2,
[
mem.tp1X,
mem.tp2X,
mem.tp3X
]
);
setNum(
"algo-trail-sl-x2-st2",
mem.trailSlX2St2
);
}

if(
patch.share1X !=
null ||
patch.share2X !=
null ||
patch.share3X !=
null
){
[
mem.share1X,
mem.share2X,
mem.share3X
] =
normalizeTpShares(
patch.share1X ??
mem.share1X,
patch.share2X ??
mem.share2X,
patch.share3X ??
mem.share3X
);
setNum(
"algo-share1-x",
mem.share1X
);
setNum(
"algo-share2-x",
mem.share2X
);
setNum(
"algo-share3-x",
mem.share3X
);
}

if(
patch.tp1Y !=
null
){
mem.tp1Y =
clampPartialTpX(
patch.tp1Y,
DEFAULT_PARTIAL_TP1_X
);
setNum(
"algo-tp1-y",
mem.tp1Y
);
}

if(
patch.tp2Y !=
null
){
mem.tp2Y =
clampPartialTpX(
patch.tp2Y,
DEFAULT_PARTIAL_TP2_X
);
setNum(
"algo-tp2-y",
mem.tp2Y
);
}

if(
patch.tp3Y !=
null
){
mem.tp3Y =
clampPartialTpX(
patch.tp3Y,
DEFAULT_PARTIAL_TP3_X
);
setNum(
"algo-tp3-y",
mem.tp3Y
);
}

if(
patch.trailSlSt3 !=
null
){
mem.trailSlSt3 =
!!patch.trailSlSt3;
setCheck(
"algo-trail-sl-st3",
mem.trailSlSt3
);
}

if(
patch.trailSlX1St3 !=
null
){
mem.trailSlX1St3 =
clampTrailSlX1(
patch.trailSlX1St3
);
setNum(
"algo-trail-sl-x1-st3",
mem.trailSlX1St3
);
}

if(
patch.trailSlX2St3 !=
null
){
mem.trailSlX2St3 =
clampTrailSlX2(
patch.trailSlX2St3,
mem.trailSlX1St3,
[
mem.tp1Y,
mem.tp2Y,
mem.tp3Y
]
);
setNum(
"algo-trail-sl-x2-st3",
mem.trailSlX2St3
);
}

if(
patch.share1Y !=
null ||
patch.share2Y !=
null ||
patch.share3Y !=
null
){
[
mem.share1Y,
mem.share2Y,
mem.share3Y
] =
normalizeTpShares(
patch.share1Y ??
mem.share1Y,
patch.share2Y ??
mem.share2Y,
patch.share3Y ??
mem.share3Y
);
setNum(
"algo-share1-y",
mem.share1Y
);
setNum(
"algo-share2-y",
mem.share2Y
);
setNum(
"algo-share3-y",
mem.share3Y
);
}

refreshEntryFilterLines();
setTickerStrategyOverlay(
strategyId,
symbol,
patch
);
persistAlgoSettings();

}
}
);

mountAlgoRuntimeUi(
{
getExchangeId:()=>
getActiveExchangeId()
}
);

mountSessionLogServerSettings(
document.getElementById(
"algo-session-log-server-mount"
)
);

botStrategyUi =
mountAlgoBotStrategyUi(
{
getSymbol:()=>
symbol,
getChartTf:()=>
tf
}
);

void (
async ()=>{

await loadSymbol(
symbol,
tf
);

if(
disposed ||
isAlgoBotLiteMode()
){
return;
}

listApi?.destroy?.();
listApi =
null;

try{
listApi =
await mountAlgoTradingCoinList(
{
getSymbol:()=>
symbol,
setSymbolLabel(
next
){
setSymbolLabel(
next
);
},
async loadSymbol(
next,
nextTf
){
await loadSymbol(
next,
nextTf ||
tf
);
listApi?.highlight?.();
},
onTickerTick(
item
){
if(
!item ||
normalizeSymbol(
item.symbol
) !==
normalizeSymbol(
symbol
)
){
return;
}

syncAlgoChartTurnover24(
item.symbol
);
}
}
);
listApi?.highlight?.();
}catch(
err
){
console.warn(
"[algo-trading] coin list:",
err?.message ||
err
);
}

}
)();

}
