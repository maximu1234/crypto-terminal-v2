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
applyRsiSeriesColorMode,
appendFutureWhitespaceBars,
computeChartFutureMarginBars,
syncLinkedChartTimescales
} from "./chart-import.js?v=613e412b";

import {
applyLiveSeriesUpdate,
ensureOhlcRollover,
liveBarPeriodSec,
paintCatchupLiveSeries
} from "./chart/live-bar-roll.js?v=6ff2b718";

import {
terminalVisibleBars,
terminalHistoryInitialRequests,
TERMINAL_VISIBLE_BARS,
TERMINAL_HISTORY_LAZY_BATCH_BARS
} from "./terminal-chart-history-prefs.js?v=948df10f";

import {
peekHistoryCache,
putHistoryCache,
mergeCandleRows,
logicalIndexShift
} from "./market-history-cache.js?v=dedca4e1";

import {
ALGO_TICKER_SCAN_HISTORY_REQUESTS
} from "./algo-trading/ticker-scanner.js?v=ee2eb575";

import {
defaultRsiPaneSettings,
normalizeRsiPaneSettings
} from "./indicators/rsi-pane.js?v=482968f4";

import {
buildChartRsiPoints
} from "./indicators/htf-project.js?v=2d6ecf34";

import {
loadMarketHistory,
getActiveExchangeId
} from "./market-api.js?v=00f19708";

import {
subscribeKline,
bindLiveCandleCatchup
} from "./market-ws.js?v=717ade46";

import {
mountAlgoTradingCoinList,
refreshAlgoMarketListFromFlags
} from "./algo-trading-list.js?v=855348fc";

import {
mountAlgoTickerScanUi
} from "./algo-trading/ticker-scan-ui.js?v=c264483b";

import {
getTickerStrategyOverlay,
hasTickerStrategyOverlay,
setTickerStrategyOverlay,
writeTickerStrategyOverlays
} from "./algo-trading/ticker-strategy-overlays.js?v=12676ce2";

import {
mountAlgoStrategyParamOptimizeUi
} from "./algo-trading/strategy-param-optimize-ui.js?v=e4b23135";

import {
mountAlgoRuntimeUi
} from "./algo-trading/runtime-ui.js?v=88effc76";

import {
mountAlgoBotStrategyUi
} from "./algo-trading/bot-strategy-ui.js?v=a9e1d556";

import {
ALGO_ANALYSIS_BOT_CHANGE_EVENT,
ALGO_ANALYSIS_BOT_NONE,
ALGO_ANALYSIS_BOT_PATTERN_12,
ALGO_ANALYSIS_BOT_RSI_TOUCH_FLIP,
ALGO_ANALYSIS_BOT_MACD_FLIP_TOUCH,
getActiveAnalysisBotId,
isActiveAnalysisBot,
isAnyAnalysisBotActive,
setActiveAnalysisBotId
} from "./algo-trading/active-analysis-bot.js?v=c1b8293b";

import {
mountSessionLogServerSettings
} from "./algo-trading/bot-session-log-server-ui.js?v=ac192567";

import {
syncBotStrategiesToMain
} from "./algo-trading/bot-bridge.js?v=17baeaa9";

import {
mountAlgoTradeUi
} from "./algo-trading/trade/boot.js?v=43146b7e";

import {
mountAlgoTradingDrawings
} from "./algo-trading/drawings.js?v=7e74fbaa";

import {
mountAlgoTradingIndicators
} from "./algo-trading/indicators.js?v=4d56d0ba";

import {
mountAlgoPatternEntryOverlay
} from "./algo-trading/pattern-entry-overlay.js?v=ceecf4be";

import {
mountRsiTouchFlipHost
} from "./algo-trading/rsi-touch-flip-panel.js?v=d5f18885";

import {
mountMacdFlipTouchHost
} from "./algo-trading/macd-flip-touch-panel.js?v=b5e0c7a7";

import {
loadRsiTouchFlipPrefs,
saveRsiTouchFlipPrefs
} from "./algo-trading/rsi-touch-flip-prefs.js?v=8d462a58";
import {
loadMacdFlipTouchPrefs
} from "./algo-trading/macd-flip-touch-prefs.js?v=e8cc13ba";

import {
clearAlgoPatternAnalysisUi,
refreshAlgoPatternAnalysis
} from "./algo-trading/pattern-analysis.js?v=1e002b9c";

import {
invalidateAlgoPattern12SceneCache,
clearAlgoPattern12PaintEntryFilter
} from "./algo-trading/pattern-12-scene-cache.js?v=ab20cc1a";

import {
clampSlPctOfX,
clampTpRr,
clampRiskUsd
} from "./algo-trading/pattern-entry-positions.js?v=492702eb";

import {
clampPartialTpX,
clampTrailSlX1,
clampTrailSlX2,
normalizeTpShares,
rebalanceTpShares,
DEFAULT_PARTIAL_TP1_X,
DEFAULT_PARTIAL_TP2_X,
DEFAULT_PARTIAL_TP3_X
} from "./algo-trading/pattern-trade-stats-partial.js?v=a92ca5c3";

import {
clampEntryTimeoutBars,
clampMaxPt1Pt4Bars
} from "./algo-trading/pattern-entry-logic.js?v=516b2a3a";

/* TEMP_PULLBACK_BEFORE_ARM — remove with temp-pullback-before-arm.js */
import {
clampPullbackBeforeArmPct,
normalizePullbackBeforeArmEnabled
} from "./algo-trading/temp-pullback-before-arm.js?v=f6ddff7a";

import {
normalizeAlgoSupertrendTf,
clampAlgoSupertrendAtr,
clampAlgoSupertrendFactor
} from "./algo-trading/pattern-supertrend-filter.js?v=7676bfd0";

import {
createAlgoSupertrendFilterOverlay
} from "./algo-trading/supertrend-filter-overlay.js?v=c9dd85fb";

import {
normalizeAlgoStatsMode
} from "./algo-trading/pattern-trade-stats.js?v=2530eb1e";

import {
readAlgoPattern12Settings
} from "./algo-trading/pattern-12-settings.js?v=cd75d3d2";

import {
setChartLayoutReady,
isChartLayoutReady
} from "./chart-layout-gate.js?v=4a8798af";

import {
invalidatePreservedVisibleLogicalRange,
runWithPreservedVisibleLogicalRange
} from "./chart-visible-range.js?v=d523062b";

import {
coinsState,
marketMap
} from "./terminal/terminal-state.js?v=4747a92f";

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
} from "./algo-trading/page-prefs.js?v=0fea35db";

import {
mergeLiveCandle
} from "./algo-trading/live-candle.js?v=537e93bf";

import {
formatTurnover24Label
} from "./algo-trading/page-format.js?v=43c07209";

import {
bindAlgoNumericField
} from "./algo-trading/page-dom.js?v=3cc21775";

import {
bindAlgoPageHotkeys
} from "./algo-trading/page-hotkeys.js?v=b6c24375";

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
} from "./algo-trading/page-strategy-state.js?v=ae7b6845";

import {
syncRsiHudPeriod as syncRsiHudPeriodEl,
syncRsiLevelDom as syncRsiLevelDomEl,
setRsiHud as setRsiHudEl,
lastRsiValue as lastRsiValueFromCandles,
layoutRsiPane
} from "./algo-trading/page-rsi.js?v=c76c91cb";

import {
bindAlgoStatsPanelResize
} from "./algo-trading/stats-panel-resize.js?v=2da2612d";

import {
isAlgoBotLiteMode,
mountAlgoBotLiteLayout
} from "./algo-trading/lite-layout.js?v=7a635cbf";

import {
loadAlgoBotLiteHistory
} from "./algo-trading/lite-history.js?v=ba42667e";

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

import {
bindAlgoChartPaneSettle
} from "./algo-trading/chart-pane-settle.js?v=3ecfb41d";
import {
loadSymbol as loadSymbolMoved
} from "./algo-trading/chart-load-symbol.js?v=5f6d6126";
import {
applyRsiData as applyRsiDataMoved,
deepenAlgoHistoryIfNeeded as deepenAlgoHistoryIfNeededMoved,
refreshAlgoHistoryTail as refreshAlgoHistoryTailMoved,
applyCandleData as applyCandleDataMoved,
schedulePatternAnalysis as schedulePatternAnalysisMoved,
resizeAlgoCharts as resizeAlgoChartsMoved,
fitViewport as fitViewportMoved,
mergeOlderAlgoCandles as mergeOlderAlgoCandlesMoved,
applyLiveCandleTick as applyLiveCandleTickMoved
} from "./algo-trading/chart-data.js?v=2d942c6c";
import {
rsiPaneSettingsFromFlipPrefs as rsiPaneSettingsFromFlipPrefsMoved,
readFlipPanePatchFromDom as readFlipPanePatchFromDomMoved,
applyEffectiveRsiPaneSettings as applyEffectiveRsiPaneSettingsMoved,
getRsiPaneSettings as getRsiPaneSettingsMoved,
commitRsiPaneSettings as commitRsiPaneSettingsMoved,
syncRsiHudPeriod as syncRsiHudPeriodMoved,
syncRsiLevelDom as syncRsiLevelDomMoved,
onRsiSettingsChange as onRsiSettingsChangeMoved,
algoGate as algoGateMoved,
chartStrategyId as chartStrategyIdMoved,
chartGate as chartGateMoved,
buildTradeOpts as buildTradeOptsMoved,
isAlgoStatsAnalysisPaused as isAlgoStatsAnalysisPausedMoved,
markAlgoHistoryStatsPending as markAlgoHistoryStatsPendingMoved,
markAlgoHistoryStatsReadyAndAnalyze as markAlgoHistoryStatsReadyAndAnalyzeMoved,
dispatchAlgoChartCandlesLoaded as dispatchAlgoChartCandlesLoadedMoved,
ensureAlgoPattern12Enabled as ensureAlgoPattern12EnabledMoved,
applyActiveAnalysisBotChartUi as applyActiveAnalysisBotChartUiMoved,
syncChartMacdPaneFromFlip as syncChartMacdPaneFromFlipMoved,
setRsiPaneActive as setRsiPaneActiveMoved,
setSymbolLabel as setSymbolLabelMoved,
syncAlgoChartTurnover24 as syncAlgoChartTurnover24Moved,
setActiveTfButton as setActiveTfButtonMoved,
setRsiHud as setRsiHudMoved,
layoutRsi as layoutRsiMoved,
scheduleResizeAlgoCharts as scheduleResizeAlgoChartsMoved,
lastRsiValue as lastRsiValueMoved,
buildDisplayCandles as buildDisplayCandlesMoved,
refreshEntryFilterLines as refreshEntryFilterLinesMoved,
refreshSupertrendFilterLines as refreshSupertrendFilterLinesMoved,
destroySupertrendFilterLines as destroySupertrendFilterLinesMoved,
buildPatternAnalysisOpts as buildPatternAnalysisOptsMoved,
stopKline as stopKlineMoved,
bindStrategyGateUi as bindStrategyGateUiMoved,
strategyPrefKeys as strategyPrefKeysMoved,
strategyPatchFromState as strategyPatchFromStateMoved,
applyStrategyPatchToMemory as applyStrategyPatchToMemoryMoved,
syncStrategyDomFromMemory as syncStrategyDomFromMemoryMoved,
restoreStrategyMemoryFromPrefs as restoreStrategyMemoryFromPrefsMoved,
hydrateTickerStrategyUi as hydrateTickerStrategyUiMoved,
applyOptimizedPatchesToTickers as applyOptimizedPatchesToTickersMoved,
persistAlgoSettings as persistAlgoSettingsMoved,
getStatsModeForStrategy as getStatsModeForStrategyMoved,
setStatsModeForStrategy as setStatsModeForStrategyMoved,
applyStatsModeButtons as applyStatsModeButtonsMoved,
applyChartPositionChecks as applyChartPositionChecksMoved,
bindPartialTpInput as bindPartialTpInputMoved,
bindTrailSlXInput as bindTrailSlXInputMoved,
bindTrailSlCheck as bindTrailSlCheckMoved,
reclampTrailSlX2 as reclampTrailSlX2Moved,
bindTpShareInputs as bindTpShareInputsMoved,
bindSide as bindSideMoved,
setNum as setNumMoved,
setCheck as setCheckMoved
} from "./algo-trading/page-controls.js?v=0ab2f5b3";
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


let userRsiPaneSettings =
normalizeRsiPaneSettings(
defaultRsiPaneSettings()
);
let rsiPaneSettings =
userRsiPaneSettings;
let lastRsiHudValue =
null;
let rsiRebuildSeq =
0;

function algoPageHost(){
if(!algoPageHost.current){
algoPageHost.current = {
get ALGO_ANALYSIS_BOT_MACD_FLIP_TOUCH(){ return ALGO_ANALYSIS_BOT_MACD_FLIP_TOUCH; },
get ALGO_ANALYSIS_BOT_PATTERN_12(){ return ALGO_ANALYSIS_BOT_PATTERN_12; },
get ALGO_ANALYSIS_BOT_RSI_TOUCH_FLIP(){ return ALGO_ANALYSIS_BOT_RSI_TOUCH_FLIP; },
get ALGO_PREFS_KEY(){ return ALGO_PREFS_KEY; },
get ALGO_STRATEGY_IDS(){ return ALGO_STRATEGY_IDS; },
get Event(){ return Event; },
get algoChartDbg(){ return algoChartDbg; },
get algoGateFromMemory(){ return algoGateFromMemory; },
get algoPattern12EnabledOnce(){ return algoPattern12EnabledOnce; },
set algoPattern12EnabledOnce(value){ algoPattern12EnabledOnce = value; },
get algoResizeRaf(){ return algoResizeRaf; },
set algoResizeRaf(value){ algoResizeRaf = value; },
get algoStatsPanelCollapsed(){ return algoStatsPanelCollapsed; },
get appendFutureWhitespaceBars(){ return appendFutureWhitespaceBars; },
get applyRsiData(){ return applyRsiData; },
get applyStrategyPatchToMemoryFromMemory(){ return applyStrategyPatchToMemoryFromMemory; },
get bindAlgoNumericField(){ return bindAlgoNumericField; },
get buildAlgoPrefsSnapshot(){ return buildAlgoPrefsSnapshot; },
get buildTradeOptsFromMemory(){ return buildTradeOptsFromMemory; },
get candles(){ return candles; },
get chartGateFromMemory(){ return chartGateFromMemory; },
get chartIndicators(){ return chartIndicators; },
get chartPositionChecks(){ return chartPositionChecks; },
get chartStrategyIdFromMemory(){ return chartStrategyIdFromMemory; },
get clampAlgoSupertrendAtr(){ return clampAlgoSupertrendAtr; },
get clampAlgoSupertrendFactor(){ return clampAlgoSupertrendFactor; },
get clampPartialTpX(){ return clampPartialTpX; },
get clampPullbackBeforeArmPct(){ return clampPullbackBeforeArmPct; },
get clampSlPctOfX(){ return clampSlPctOfX; },
get clearAlgoPatternAnalysisUi(){ return clearAlgoPatternAnalysisUi; },
get coinsState(){ return coinsState; },
get computeChartFutureMarginBars(){ return computeChartFutureMarginBars; },
get displaySymbol(){ return displaySymbol; },
get disposed(){ return disposed; },
get drawingTools(){ return drawingTools; },
get entryOverlay(){ return entryOverlay; },
get formatTurnover24Label(){ return formatTurnover24Label; },
get getActiveAnalysisBotId(){ return getActiveAnalysisBotId; },
get getTickerStrategyOverlay(){ return getTickerStrategyOverlay; },
get hasTickerStrategyOverlay(){ return hasTickerStrategyOverlay; },
get historyStatsReady(){ return historyStatsReady; },
set historyStatsReady(value){ historyStatsReady = value; },
get ignoreNextRsiSettingsCapture(){ return ignoreNextRsiSettingsCapture; },
set ignoreNextRsiSettingsCapture(value){ ignoreNextRsiSettingsCapture = value; },
get isActiveAnalysisBot(){ return isActiveAnalysisBot; },
get isAlgoBotLiteMode(){ return isAlgoBotLiteMode; },
get lastRsiHudValue(){ return lastRsiHudValue; },
get lastRsiValueFromCandles(){ return lastRsiValueFromCandles; },
get layoutRsiPane(){ return layoutRsiPane; },
get liveBarRollTimer(){ return liveBarRollTimer; },
set liveBarRollTimer(value){ liveBarRollTimer = value; },
get loadMacdFlipTouchPrefs(){ return loadMacdFlipTouchPrefs; },
get loadRsiTouchFlipPrefs(){ return loadRsiTouchFlipPrefs; },
get macdFlipTouchHost(){ return macdFlipTouchHost; },
get marketMap(){ return marketMap; },
get mem(){ return mem; },
get normalizeAlgoStatsMode(){ return normalizeAlgoStatsMode; },
get normalizeAlgoSupertrendTf(){ return normalizeAlgoSupertrendTf; },
get normalizeRsiPaneSettings(){ return normalizeRsiPaneSettings; },
get normalizeSymbol(){ return normalizeSymbol; },
get patternAnalysisSeq(){ return patternAnalysisSeq; },
set patternAnalysisSeq(value){ patternAnalysisSeq = value; },
get patternAnalysisTimer(){ return patternAnalysisTimer; },
set patternAnalysisTimer(value){ patternAnalysisTimer = value; },
get readAlgoPattern12Settings(){ return readAlgoPattern12Settings; },
get readPrefs(){ return readPrefs; },
get rebalanceTpShares(){ return rebalanceTpShares; },
get recaptureAlgoStatsPanelHeight(){ return recaptureAlgoStatsPanelHeight; },
get refreshAlgoPatternAnalysis(){ return refreshAlgoPatternAnalysis; },
get resizeAlgoCharts(){ return resizeAlgoCharts; },
get restoreStrategyMemoryFromPrefsFromMemory(){ return restoreStrategyMemoryFromPrefsFromMemory; },
get rsiHudPeriodEl(){ return rsiHudPeriodEl; },
get rsiHudValueEl(){ return rsiHudValueEl; },
get rsiPaneActive(){ return rsiPaneActive; },
set rsiPaneActive(value){ rsiPaneActive = value; },
get rsiPaneSettings(){ return rsiPaneSettings; },
set rsiPaneSettings(value){ rsiPaneSettings = value; },
get rsiSeries(){ return rsiSeries; },
get rsiTouchFlipHost(){ return rsiTouchFlipHost; },
get rsiWrapEl(){ return rsiWrapEl; },
get saveRsiTouchFlipPrefs(){ return saveRsiTouchFlipPrefs; },
get schedulePatternAnalysis(){ return schedulePatternAnalysis; },
get setRsiHudEl(){ return setRsiHudEl; },
get setTickerStrategyOverlay(){ return setTickerStrategyOverlay; },
get statsModeRoots(){ return statsModeRoots; },
get strategyPatchFromStateFromMemory(){ return strategyPatchFromStateFromMemory; },
get strategyPrefKeysFromMemory(){ return strategyPrefKeysFromMemory; },
get supertrendFilterOverlay(){ return supertrendFilterOverlay; },
set supertrendFilterOverlay(value){ supertrendFilterOverlay = value; },
get symbol(){ return symbol; },
get symbolEl(){ return symbolEl; },
get syncRsiHudPeriodEl(){ return syncRsiHudPeriodEl; },
get syncRsiLevelDomEl(){ return syncRsiLevelDomEl; },
get syncStrategyDomFromMemoryFromMemory(){ return syncStrategyDomFromMemoryFromMemory; },
get terminalVisibleBars(){ return terminalVisibleBars; },
get tf(){ return tf; },
get tfBar(){ return tfBar; },
get tickerScanUi(){ return tickerScanUi; },
get unbindLiveCatchup(){ return unbindLiveCatchup; },
set unbindLiveCatchup(value){ unbindLiveCatchup = value; },
get unsubKline(){ return unsubKline; },
set unsubKline(value){ unsubKline = value; },
get userRsiPaneSettings(){ return userRsiPaneSettings; },
set userRsiPaneSettings(value){ userRsiPaneSettings = value; },
get writePrefs(){ return writePrefs; },
get writeTickerStrategyOverlays(){ return writeTickerStrategyOverlays; }
};
}
return algoPageHost.current;
}

function rsiPaneSettingsFromFlipPrefs(raw){
return rsiPaneSettingsFromFlipPrefsMoved(
algoPageHost(),
...arguments
);
}

function readFlipPanePatchFromDom(){
return readFlipPanePatchFromDomMoved(
algoPageHost(),
...arguments
);
}

let ignoreNextRsiSettingsCapture =
false;

function applyEffectiveRsiPaneSettings(flipPatch){
return applyEffectiveRsiPaneSettingsMoved(
algoPageHost(),
...arguments
);
}

function getRsiPaneSettings(){
return getRsiPaneSettingsMoved(
algoPageHost(),
...arguments
);
}

function commitRsiPaneSettings(next){
return commitRsiPaneSettingsMoved(
algoPageHost(),
...arguments
);
}

function syncRsiHudPeriod(){
return syncRsiHudPeriodMoved(
algoPageHost(),
...arguments
);
}

function syncRsiLevelDom(){
return syncRsiLevelDomMoved(
algoPageHost(),
...arguments
);
}

function onRsiSettingsChange(next){
return onRsiSettingsChangeMoved(
algoPageHost(),
...arguments
);
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

function algoGate(id){
return algoGateMoved(
algoPageHost(),
...arguments
);
}

function chartStrategyId(){
return chartStrategyIdMoved(
algoPageHost(),
...arguments
);
}

function chartGate(){
return chartGateMoved(
algoPageHost(),
...arguments
);
}

function buildTradeOpts(strategyId){
return buildTradeOptsMoved(
algoPageHost(),
...arguments
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

bindAlgoChartPaneSettle(
()=>
loadSeq
);
let unsubKline =
null;
let unbindLiveCatchup =
null;
let liveBarRollTimer =
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
let macdFlipTouchHost =
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
return isAlgoStatsAnalysisPausedMoved(
algoPageHost(),
...arguments
);
}

function markAlgoHistoryStatsPending(){
return markAlgoHistoryStatsPendingMoved(
algoPageHost(),
...arguments
);
}

function markAlgoHistoryStatsReadyAndAnalyze(){
return markAlgoHistoryStatsReadyAndAnalyzeMoved(
algoPageHost(),
...arguments
);
}

function dispatchAlgoChartCandlesLoaded(loadId){
return dispatchAlgoChartCandlesLoadedMoved(
algoPageHost(),
...arguments
);
}

function ensureAlgoPattern12Enabled(){
return ensureAlgoPattern12EnabledMoved(
algoPageHost(),
...arguments
);
}

/**
 * Аналитика/рисунки на графике — только для активного бота (меню «Боты»).
 * pattern-12 / rsi-touch-flip — свой блок data-algo-analysis-bot + оверлей.
 */
function applyActiveAnalysisBotChartUi(){
return applyActiveAnalysisBotChartUiMoved(
algoPageHost(),
...arguments
);
}

function syncChartMacdPaneFromFlip(flipPatch){
return syncChartMacdPaneFromFlipMoved(
algoPageHost(),
...arguments
);
}

function setRsiPaneActive(active){
return setRsiPaneActiveMoved(
algoPageHost(),
...arguments
);
}

function setSymbolLabel(previewSymbol){
return setSymbolLabelMoved(
algoPageHost(),
...arguments
);
}

function syncAlgoChartTurnover24(nextSymbol =
symbol){
return syncAlgoChartTurnover24Moved(
algoPageHost(),
...arguments
);
}

function setActiveTfButton(){
return setActiveTfButtonMoved(
algoPageHost(),
...arguments
);
}

function setRsiHud(value){
return setRsiHudMoved(
algoPageHost(),
...arguments
);
}

function layoutRsi(){
return layoutRsiMoved(
algoPageHost(),
...arguments
);
}

function algoChartHost(){
if(!algoChartHost.current){
algoChartHost.current = {
get ALGO_ANALYSIS_BOT_PATTERN_12(){ return ALGO_ANALYSIS_BOT_PATTERN_12; },
get HISTORY_REQUESTS(){ return HISTORY_REQUESTS; },
get PATTERN_ANALYSIS_LIVE_MS(){ return PATTERN_ANALYSIS_LIVE_MS; },
get TERMINAL_HISTORY_LAZY_BATCH_BARS(){ return TERMINAL_HISTORY_LAZY_BATCH_BARS; },
get TERMINAL_VISIBLE_BARS(){ return TERMINAL_VISIBLE_BARS; },
get algoChartDbg(){ return algoChartDbg; },
get appendFutureWhitespaceBars(){ return appendFutureWhitespaceBars; },
get applyChartPriceFormat(){ return applyChartPriceFormat; },
get applyCoinsChartViewport(){ return applyCoinsChartViewport; },
get applyLiveSeriesUpdate(){ return applyLiveSeriesUpdate; },
get applyRsiFixedPriceScale(){ return applyRsiFixedPriceScale; },
get applyRsiSeriesColorMode(){ return applyRsiSeriesColorMode; },
get buildChartRsiPoints(){ return buildChartRsiPoints; },
get buildDisplayCandles(){ return buildDisplayCandles; },
get buildPatternAnalysisOpts(){ return buildPatternAnalysisOpts; },
get candleSeries(){ return candleSeries; },
get candles(){ return candles; },
set candles(value){ candles = value; },
get chart(){ return chart; },
get chartIndicators(){ return chartIndicators; },
get chartWrapEl(){ return chartWrapEl; },
get computeChartFutureMarginBars(){ return computeChartFutureMarginBars; },
get disposed(){ return disposed; },
get drawingTools(){ return drawingTools; },
get ensureOhlcRollover(){ return ensureOhlcRollover; },
get entryOverlay(){ return entryOverlay; },
get getActiveExchangeId(){ return getActiveExchangeId; },
get historyStatsReady(){ return historyStatsReady; },
get invalidatePreservedVisibleLogicalRange(){ return invalidatePreservedVisibleLogicalRange; },
get isActiveAnalysisBot(){ return isActiveAnalysisBot; },
get isAlgoStatsAnalysisPaused(){ return isAlgoStatsAnalysisPaused; },
get isAnyAnalysisBotActive(){ return isAnyAnalysisBotActive; },
get isChartLayoutReady(){ return isChartLayoutReady; },
get lastPatternAnalysisAt(){ return lastPatternAnalysisAt; },
set lastPatternAnalysisAt(value){ lastPatternAnalysisAt = value; },
get lastRsiHudValue(){ return lastRsiHudValue; },
set lastRsiHudValue(value){ lastRsiHudValue = value; },
get layoutRsi(){ return layoutRsi; },
get liveBarPeriodSec(){ return liveBarPeriodSec; },
get loadMarketHistory(){ return loadMarketHistory; },
get loadSeq(){ return loadSeq; },
get logicalIndexShift(){ return logicalIndexShift; },
get macdFlipTouchHost(){ return macdFlipTouchHost; },
get markAlgoHistoryStatsReadyAndAnalyze(){ return markAlgoHistoryStatsReadyAndAnalyze; },
get mergeCandleRows(){ return mergeCandleRows; },
get patternAnalysisSeq(){ return patternAnalysisSeq; },
set patternAnalysisSeq(value){ patternAnalysisSeq = value; },
get patternAnalysisTimer(){ return patternAnalysisTimer; },
set patternAnalysisTimer(value){ patternAnalysisTimer = value; },
get pendingFitViewport(){ return pendingFitViewport; },
set pendingFitViewport(value){ pendingFitViewport = value; },
get putHistoryCache(){ return putHistoryCache; },
get refreshAlgoPatternAnalysis(){ return refreshAlgoPatternAnalysis; },
get refreshEntryFilterLines(){ return refreshEntryFilterLines; },
get rsiChart(){ return rsiChart; },
get rsiPaneActive(){ return rsiPaneActive; },
get rsiPaneSettings(){ return rsiPaneSettings; },
get rsiRebuildSeq(){ return rsiRebuildSeq; },
set rsiRebuildSeq(value){ rsiRebuildSeq = value; },
get rsiSeries(){ return rsiSeries; },
get rsiTouchFlipHost(){ return rsiTouchFlipHost; },
get rsiWrapEl(){ return rsiWrapEl; },
get runWithPreservedVisibleLogicalRange(){ return runWithPreservedVisibleLogicalRange; },
get setChartLayoutReady(){ return setChartLayoutReady; },
get setRsiHud(){ return setRsiHud; },
get symbol(){ return symbol; },
get syncLinkedChartTimescales(){ return syncLinkedChartTimescales; },
get terminalVisibleBars(){ return terminalVisibleBars; },
get tf(){ return tf; }
};
}
return algoChartHost.current;
}

function resizeAlgoCharts(){
return resizeAlgoChartsMoved(
algoChartHost(),
...arguments
);
}

let algoResizeRaf =
0;
/** Первый fit часто до layout (#chart absolute → clientWidth=0). */
let pendingFitViewport =
false;

function scheduleResizeAlgoCharts(){
return scheduleResizeAlgoChartsMoved(
algoPageHost(),
...arguments
);
}

function lastRsiValue(){
return lastRsiValueMoved(
algoPageHost(),
...arguments
);
}

function applyRsiData({
notifyIndicators =
true,
liveLastOnly =
false
} =
{}){
return applyRsiDataMoved(
algoChartHost(),
...arguments
);
}

function buildDisplayCandles(){
return buildDisplayCandlesMoved(
algoPageHost(),
...arguments
);
}

function fitViewport(){
return fitViewportMoved(
algoChartHost(),
...arguments
);
}

function refreshEntryFilterLines(){
return refreshEntryFilterLinesMoved(
algoPageHost(),
...arguments
);
}

function refreshSupertrendFilterLines(){
return refreshSupertrendFilterLinesMoved(
algoPageHost(),
...arguments
);
}

function destroySupertrendFilterLines(){
return destroySupertrendFilterLinesMoved(
algoPageHost(),
...arguments
);
}

function schedulePatternAnalysis({
force =
false
} =
{}){
return schedulePatternAnalysisMoved(
algoChartHost(),
...arguments
);
}

function applyCandleData({
fit =
false,
light =
false,
skipAnalysis =
false,
forceAnalysis =
false
} =
{}){
return applyCandleDataMoved(
algoChartHost(),
...arguments
);
}

function buildPatternAnalysisOpts(){
return buildPatternAnalysisOptsMoved(
algoPageHost(),
...arguments
);
}

function applyLiveCandleTick(){
return applyLiveCandleTickMoved(
algoChartHost(),
...arguments
);
}

function stopKline(){
return stopKlineMoved(
algoPageHost(),
...arguments
);
}

function mergeOlderAlgoCandles(older){
return mergeOlderAlgoCandlesMoved(
algoChartHost(),
...arguments
);
}

async function deepenAlgoHistoryIfNeeded(seq){
return deepenAlgoHistoryIfNeededMoved(
algoChartHost(),
...arguments
);
}

async function refreshAlgoHistoryTail(seq){
return refreshAlgoHistoryTailMoved(
algoChartHost(),
...arguments
);
}

function algoSymbolHost(){
if(!algoSymbolHost.current){
algoSymbolHost.current = {
get DEFAULT_TF(){ return DEFAULT_TF; },
get HISTORY_REQUESTS(){ return HISTORY_REQUESTS; },
get TERMINAL_HISTORY_LAZY_BATCH_BARS(){ return TERMINAL_HISTORY_LAZY_BATCH_BARS; },
get TERMINAL_VISIBLE_BARS(){ return TERMINAL_VISIBLE_BARS; },
get algoChartDbg(){ return algoChartDbg; },
get algoPattern12EnabledOnce(){ return algoPattern12EnabledOnce; },
set algoPattern12EnabledOnce(value){ algoPattern12EnabledOnce = value; },
get applyCandleData(){ return applyCandleData; },
get applyLiveCandleTick(){ return applyLiveCandleTick; },
get applyRsiData(){ return applyRsiData; },
get bindLiveCandleCatchup(){ return bindLiveCandleCatchup; },
get buildDisplayCandles(){ return buildDisplayCandles; },
get candles(){ return candles; },
set candles(value){ candles = value; },
get chart(){ return chart; },
get chartIndicators(){ return chartIndicators; },
get deepenAlgoHistoryIfNeeded(){ return deepenAlgoHistoryIfNeeded; },
get dispatchAlgoChartCandlesLoaded(){ return dispatchAlgoChartCandlesLoaded; },
get disposed(){ return disposed; },
get drawingTools(){ return drawingTools; },
get ensureAlgoPattern12Enabled(){ return ensureAlgoPattern12Enabled; },
get ensureOhlcRollover(){ return ensureOhlcRollover; },
get fitViewport(){ return fitViewport; },
get getActiveExchangeId(){ return getActiveExchangeId; },
get hydrateTickerStrategyUi(){ return hydrateTickerStrategyUi; },
get invalidateAlgoPattern12SceneCache(){ return invalidateAlgoPattern12SceneCache; },
get isAlgoBotLiteMode(){ return isAlgoBotLiteMode; },
get layoutRsi(){ return layoutRsi; },
get listApi(){ return listApi; },
get liveBarPeriodSec(){ return liveBarPeriodSec; },
get liveBarRollTimer(){ return liveBarRollTimer; },
set liveBarRollTimer(value){ liveBarRollTimer = value; },
get loadAlgoBotLiteHistory(){ return loadAlgoBotLiteHistory; },
get loadMarketHistory(){ return loadMarketHistory; },
get loadSeq(){ return loadSeq; },
set loadSeq(value){ loadSeq = value; },
get markAlgoHistoryStatsPending(){ return markAlgoHistoryStatsPending; },
get markAlgoHistoryStatsReadyAndAnalyze(){ return markAlgoHistoryStatsReadyAndAnalyze; },
get mergeLiveCandle(){ return mergeLiveCandle; },
get normalizeSymbol(){ return normalizeSymbol; },
get paintCatchupLiveSeries(){ return paintCatchupLiveSeries; },
get peekHistoryCache(){ return peekHistoryCache; },
get persistAlgoSettings(){ return persistAlgoSettings; },
get putHistoryCache(){ return putHistoryCache; },
get refreshAlgoHistoryTail(){ return refreshAlgoHistoryTail; },
get refreshEntryFilterLines(){ return refreshEntryFilterLines; },
get rsiPaneActive(){ return rsiPaneActive; },
get rsiTouchFlipHost(){ return rsiTouchFlipHost; },
get runWithPreservedVisibleLogicalRange(){ return runWithPreservedVisibleLogicalRange; },
get series(){ return series; },
get setActiveTfButton(){ return setActiveTfButton; },
get setChartLayoutReady(){ return setChartLayoutReady; },
get setSymbolLabel(){ return setSymbolLabel; },
get stopKline(){ return stopKline; },
get subscribeKline(){ return subscribeKline; },
get symbol(){ return symbol; },
set symbol(value){ symbol = value; },
get terminalHistoryInitialRequests(){ return terminalHistoryInitialRequests; },
get tf(){ return tf; },
set tf(value){ tf = value; },
get unbindLiveCatchup(){ return unbindLiveCatchup; },
set unbindLiveCatchup(value){ unbindLiveCatchup = value; },
get unsubKline(){ return unsubKline; },
set unsubKline(value){ unsubKline = value; }
};
}
return algoSymbolHost.current;
}

async function loadSymbol(nextSymbol,
nextTf){
return loadSymbolMoved(
algoSymbolHost(),
...arguments
);
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
getRsiPaneSettings,
commitRsiPaneSettings,
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
syncChartRsiPaneFromFlip(
patch
){
applyEffectiveRsiPaneSettings(
patch
);
},
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

macdFlipTouchHost?.destroy?.();
macdFlipTouchHost =
mountMacdFlipTouchHost(
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
),
syncChartMacdPaneFromFlip(
patch
){
syncChartMacdPaneFromFlip(
patch
);
}
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



function bindStrategyGateUi(id){
return bindStrategyGateUiMoved(
algoPageHost(),
...arguments
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


function strategyPrefKeys(id){
return strategyPrefKeysMoved(
algoPageHost(),
...arguments
);
}

function strategyPatchFromState(strategyId){
return strategyPatchFromStateMoved(
algoPageHost(),
...arguments
);
}

function applyStrategyPatchToMemory(strategyId,
patch){
return applyStrategyPatchToMemoryMoved(
algoPageHost(),
...arguments
);
}

function syncStrategyDomFromMemory(){
return syncStrategyDomFromMemoryMoved(
algoPageHost(),
...arguments
);
}

function restoreStrategyMemoryFromPrefs(){
return restoreStrategyMemoryFromPrefsMoved(
algoPageHost(),
...arguments
);
}

function hydrateTickerStrategyUi(opts =
{}){
return hydrateTickerStrategyUiMoved(
algoPageHost(),
...arguments
);
}

function applyOptimizedPatchesToTickers(strategyId,
entries){
return applyOptimizedPatchesToTickersMoved(
algoPageHost(),
...arguments
);
}

function persistAlgoSettings(opts){
return persistAlgoSettingsMoved(
algoPageHost(),
...arguments
);
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

function getStatsModeForStrategy(strategy){
return getStatsModeForStrategyMoved(
algoPageHost(),
...arguments
);
}

function setStatsModeForStrategy(strategy,
mode){
return setStatsModeForStrategyMoved(
algoPageHost(),
...arguments
);
}

function applyStatsModeButtons(){
return applyStatsModeButtonsMoved(
algoPageHost(),
...arguments
);
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
return applyChartPositionChecksMoved(
algoPageHost(),
...arguments
);
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

function bindPartialTpInput(input,
getValue,
setValue,
fallback){
return bindPartialTpInputMoved(
algoPageHost(),
...arguments
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

function bindTrailSlXInput(input,
getValue,
setValue,
clamp){
return bindTrailSlXInputMoved(
algoPageHost(),
...arguments
);
}

function bindTrailSlCheck(input,
getValue,
setValue){
return bindTrailSlCheckMoved(
algoPageHost(),
...arguments
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
function reclampTrailSlX2(input,
clamp,
getValue,
setValue){
return reclampTrailSlX2Moved(
algoPageHost(),
...arguments
);
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
function bindTpShareInputs(span,
getShares,
setShares){
return bindTpShareInputsMoved(
algoPageHost(),
...arguments
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

function bindSide(prefix,
getState,
setState){
return bindSideMoved(
algoPageHost(),
...arguments
);
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
macdFlipTouchHost?.destroy?.();
macdFlipTouchHost =
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

function setNum(id,
value){
return setNumMoved(
algoPageHost(),
...arguments
);
}

function setCheck(id,
value){
return setCheckMoved(
algoPageHost(),
...arguments
);
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
