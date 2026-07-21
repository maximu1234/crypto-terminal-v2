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
updateRsiBandLayout,
updateRsiLevelLinesLayout,
applyRsiFixedPriceScale,
appendFutureWhitespaceBars,
computeChartFutureMarginBars,
coinsTfVisibleBars
} from "./chart-import.js?v=43";

import {
calculateRSI,
alignRsiWithCandleTimes
} from "./indicators.js?v=3";

import {
loadMarketHistory,
getActiveExchangeId
} from "./market-api.js?v=2";

import {
subscribeKline
} from "./market-ws.js?v=1";

import {
mountAlgoTradingCoinList,
refreshAlgoMarketListFromFlags
} from "./algo-trading-list.js?v=9";

import {
mountAlgoTickerScanUi
} from "./algo-trading/ticker-scan-ui.js?v=9";

import {
mountAlgoRuntimeUi
} from "./algo-trading/runtime-ui.js?v=10";

import {
mountAlgoBotStrategyUi
} from "./algo-trading/bot-strategy-ui.js?v=24";

import {
syncBotStrategiesToMain
} from "./algo-trading/bot-bridge.js?v=6";

import {
mountAlgoTradeUi
} from "./algo-trading/trade/boot.js?v=3";

import {
coinsState
} from "./terminal/terminal-state.js?v=11";

import {
mountAlgoTradingDrawings
} from "./algo-trading/drawings.js?v=2";

import {
mountAlgoTradingIndicators
} from "./algo-trading/indicators.js?v=4";

import {
mountAlgoPatternEntryOverlay
} from "./algo-trading/pattern-entry-overlay.js?v=10";

import {
refreshAlgoPatternAnalysis
} from "./algo-trading/pattern-analysis.js?v=14";

import {
clampSlPctOfX,
clampTpRr,
clampRiskUsd,
DEFAULT_SL_PCT_OF_X,
DEFAULT_TP_RR,
DEFAULT_RISK_USD
} from "./algo-trading/pattern-entry-positions.js?v=7";

import {
clampPartialTpX,
clampTrailSlPct,
normalizeTrailSlEnabled,
DEFAULT_PARTIAL_TP1_X,
DEFAULT_PARTIAL_TP2_X,
DEFAULT_PARTIAL_TP3_X,
DEFAULT_TRAIL_SL_PCT
} from "./algo-trading/pattern-trade-stats-partial.js?v=8";

import {
clampEntryTimeoutBars,
ENTRY_TIMEOUT_BARS
} from "./algo-trading/pattern-entry-logic.js?v=5";

import {
normalizeAlgoStatsMode
} from "./algo-trading/pattern-trade-stats.js?v=8";

import {
readAlgoPattern12Settings
} from "./algo-trading/pattern-12-settings.js?v=2";

import {
setChartLayoutReady,
isChartLayoutReady
} from "./chart-layout-gate.js?v=2";

const DEFAULT_SYMBOL =
"BTCUSDT";
const DEFAULT_TF =
"60";
/** 10×1000 свечей Bybit — глубже история для статистики паттернов (только АлгоТрейдинг). */
const HISTORY_REQUESTS =
10;

const ALGO_PREFS_KEY =
"algo_trading_page_prefs_v1";

function normalizeSymbol(
raw
){

let symbol =
String(
raw ||
""
).trim().toUpperCase().replace(
/\.P$/i,
""
);

if(
!symbol
){
return DEFAULT_SYMBOL;
}

return symbol;

}

function displaySymbol(
symbol
){

return `${normalizeSymbol(
symbol
)}.P`;

}

function readPrefs(){

try{
const raw =
JSON.parse(
localStorage.getItem(
ALGO_PREFS_KEY
) ||
"{}"
);

return {
symbol:
normalizeSymbol(
raw.symbol
),
tf:
String(
raw.tf ||
DEFAULT_TF
),
slPctOfX:
clampSlPctOfX(
raw.slPctOfX
),
tpRr:
clampTpRr(
raw.tpRr
),
riskUsd:
clampRiskUsd(
raw.riskUsd
),
tp1X:
clampPartialTpX(
raw.tp1X,
DEFAULT_PARTIAL_TP1_X
),
tp2X:
clampPartialTpX(
raw.tp2X,
DEFAULT_PARTIAL_TP2_X
),
tp3X:
clampPartialTpX(
raw.tp3X,
DEFAULT_PARTIAL_TP3_X
),
tp1Y:
clampPartialTpX(
raw.tp1Y,
DEFAULT_PARTIAL_TP1_X
),
tp2Y:
clampPartialTpX(
raw.tp2Y,
DEFAULT_PARTIAL_TP2_X
),
tp3Y:
clampPartialTpX(
raw.tp3Y,
DEFAULT_PARTIAL_TP3_X
),
trailSlSt2:
normalizeTrailSlEnabled(
raw.trailSlSt2
),
trailSlPctSt2:
clampTrailSlPct(
raw.trailSlPctSt2
),
trailSlSt3:
normalizeTrailSlEnabled(
raw.trailSlSt3
),
trailSlPctSt3:
clampTrailSlPct(
raw.trailSlPctSt3
),
timeoutBars:
clampEntryTimeoutBars(
raw.timeoutBars
),
scanStrategy:
raw.scanStrategy === "st2" || raw.scanStrategy === "st3"
? raw.scanStrategy
: "st1",
scanTf:
normalizeAlgoScanTfPref(
raw.scanTf
),
scanLongMinWinRate:
clampScanMinWinRate(
raw.scanLongMinWinRate
),
scanShortMinWinRate:
clampScanMinWinRate(
raw.scanShortMinWinRate
),
scanBothMinWinRate:
clampScanMinWinRate(
raw.scanBothMinWinRate
),
statsMode:
normalizeAlgoStatsMode(
raw.statsMode
),
statsModeSt2:
normalizeAlgoStatsMode(
raw.statsModeSt2
),
statsModeSt3:
normalizeAlgoStatsMode(
raw.statsModeSt3
),
chartPositionsStrategy:
raw.chartPositionsStrategy ===
"partial-tp" ||
raw.chartPositionsStrategy ===
"partial-tp-y"
? raw.chartPositionsStrategy
: "fixed-tp"
};
}catch{
return {
symbol:
DEFAULT_SYMBOL,
tf:
DEFAULT_TF,
slPctOfX:
DEFAULT_SL_PCT_OF_X,
tpRr:
DEFAULT_TP_RR,
riskUsd:
DEFAULT_RISK_USD,
tp1X:
DEFAULT_PARTIAL_TP1_X,
tp2X:
DEFAULT_PARTIAL_TP2_X,
tp3X:
DEFAULT_PARTIAL_TP3_X,
tp1Y:
DEFAULT_PARTIAL_TP1_X,
tp2Y:
DEFAULT_PARTIAL_TP2_X,
tp3Y:
DEFAULT_PARTIAL_TP3_X,
trailSlSt2:
true,
trailSlPctSt2:
DEFAULT_TRAIL_SL_PCT,
trailSlSt3:
true,
trailSlPctSt3:
DEFAULT_TRAIL_SL_PCT,
timeoutBars:
ENTRY_TIMEOUT_BARS,
scanStrategy:
"st1",
scanTf:
"1",
scanLongMinWinRate:
50,
scanShortMinWinRate:
50,
scanBothMinWinRate:
50,
statsMode:
"direct",
statsModeSt2:
"direct",
statsModeSt3:
"direct",
chartPositionsStrategy:
"fixed-tp"
};
}

}

function writePrefs(
prefs
){

try{
localStorage.setItem(
ALGO_PREFS_KEY,
JSON.stringify(
{
symbol:
normalizeSymbol(
prefs.symbol
),
tf:
String(
prefs.tf ||
DEFAULT_TF
),
slPctOfX:
clampSlPctOfX(
prefs.slPctOfX
),
tpRr:
clampTpRr(
prefs.tpRr
),
riskUsd:
clampRiskUsd(
prefs.riskUsd
),
tp1X:
clampPartialTpX(
prefs.tp1X,
DEFAULT_PARTIAL_TP1_X
),
tp2X:
clampPartialTpX(
prefs.tp2X,
DEFAULT_PARTIAL_TP2_X
),
tp3X:
clampPartialTpX(
prefs.tp3X,
DEFAULT_PARTIAL_TP3_X
),
tp1Y:
clampPartialTpX(
prefs.tp1Y,
DEFAULT_PARTIAL_TP1_X
),
tp2Y:
clampPartialTpX(
prefs.tp2Y,
DEFAULT_PARTIAL_TP2_X
),
tp3Y:
clampPartialTpX(
prefs.tp3Y,
DEFAULT_PARTIAL_TP3_X
),
trailSlSt2:
normalizeTrailSlEnabled(
prefs.trailSlSt2
),
trailSlPctSt2:
clampTrailSlPct(
prefs.trailSlPctSt2
),
trailSlSt3:
normalizeTrailSlEnabled(
prefs.trailSlSt3
),
trailSlPctSt3:
clampTrailSlPct(
prefs.trailSlPctSt3
),
timeoutBars:
clampEntryTimeoutBars(
prefs.timeoutBars
),
scanStrategy:
prefs.scanStrategy === "st2" || prefs.scanStrategy === "st3"
? prefs.scanStrategy
: "st1",
scanTf:
normalizeAlgoScanTfPref(
prefs.scanTf
),
scanLongMinWinRate:
clampScanMinWinRate(
prefs.scanLongMinWinRate
),
scanShortMinWinRate:
clampScanMinWinRate(
prefs.scanShortMinWinRate
),
scanBothMinWinRate:
clampScanMinWinRate(
prefs.scanBothMinWinRate
),
statsMode:
normalizeAlgoStatsMode(
prefs.statsMode
),
statsModeSt2:
normalizeAlgoStatsMode(
prefs.statsModeSt2
),
statsModeSt3:
normalizeAlgoStatsMode(
prefs.statsModeSt3
),
chartPositionsStrategy:
prefs.chartPositionsStrategy ===
"partial-tp" ||
prefs.chartPositionsStrategy ===
"partial-tp-y"
? prefs.chartPositionsStrategy
: "fixed-tp"
}
)
);
}catch{
/* ignore */
}

}

function clampScanMinWinRate(
raw
){

const n =
Number(
raw
);

if(
!Number.isFinite(
n
)
){
return 50;
}

return Math.min(
100,
Math.max(
10,
Math.round(
n
)
)
);

}

const SCAN_TF_OPTIONS =
[
"1",
"5",
"15",
"60",
"240",
"D",
"W"
];

function normalizeAlgoScanTfPref(
raw
){

const tf =
String(
raw ||
""
).trim();

return SCAN_TF_OPTIONS.includes(
tf
)
? tf
: "1";

}

function mergeLiveCandle(
candles,
candle,
maxLen
){

if(
!candles.length
){
candles.push(
candle
);
return true;
}

const last =
candles[
candles.length -
1
];

if(
candle.time ===
last.time
){
candles[
candles.length -
1
] =
candle;
return true;
}

if(
candle.time >
last.time
){
candles.push(
candle
);

if(
maxLen &&
candles.length >
maxLen
){
candles.shift();
}

return true;
}

return false;

}

function resolveInitialSymbol(){

const params =
new URLSearchParams(
location.search
);
const fromUrl =
params.get(
"symbol"
);

if(
fromUrl
){
return normalizeSymbol(
fromUrl
);
}

return readPrefs().symbol;

}

export function mountAlgoTradingPage(){

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
const linkedCrosshairVertEl =
document.getElementById(
"linked-crosshair-vert"
);

if(
!chartEl ||
!rsiChartEl
){
console.error(
"[algo-trading] chart mounts missing"
);
return;
}

const main =
createCandlestickChart(
chartEl
);
const chart =
main.chart;
const candleSeries =
main.series;

const rsi =
createRSIChart(
rsiChartEl
);
const rsiChart =
rsi.chart;
const rsiSeries =
rsi.series;

let symbol =
resolveInitialSymbol();
let tf =
readPrefs().tf ||
DEFAULT_TF;
let slPctOfX =
readPrefs().slPctOfX ||
DEFAULT_SL_PCT_OF_X;
let tpRr =
readPrefs().tpRr ||
DEFAULT_TP_RR;
let riskUsd =
readPrefs().riskUsd ||
DEFAULT_RISK_USD;
let tp1X =
readPrefs().tp1X ||
DEFAULT_PARTIAL_TP1_X;
let tp2X =
readPrefs().tp2X ||
DEFAULT_PARTIAL_TP2_X;
let tp3X =
readPrefs().tp3X ||
DEFAULT_PARTIAL_TP3_X;
let tp1Y =
readPrefs().tp1Y ||
DEFAULT_PARTIAL_TP1_X;
let tp2Y =
readPrefs().tp2Y ||
DEFAULT_PARTIAL_TP2_X;
let tp3Y =
readPrefs().tp3Y ||
DEFAULT_PARTIAL_TP3_X;
let trailSlSt2 =
normalizeTrailSlEnabled(
readPrefs().trailSlSt2
);
let trailSlPctSt2 =
clampTrailSlPct(
readPrefs().trailSlPctSt2
);
let trailSlSt3 =
normalizeTrailSlEnabled(
readPrefs().trailSlSt3
);
let trailSlPctSt3 =
clampTrailSlPct(
readPrefs().trailSlPctSt3
);
let timeoutBars =
clampEntryTimeoutBars(
readPrefs().timeoutBars
);
let scanStrategy =
readPrefs().scanStrategy ||
"st1";
let scanTf =
normalizeAlgoScanTfPref(
readPrefs().scanTf
);
let scanLongMinWinRate =
clampScanMinWinRate(
readPrefs().scanLongMinWinRate
);
let scanShortMinWinRate =
clampScanMinWinRate(
readPrefs().scanShortMinWinRate
);
let scanBothMinWinRate =
clampScanMinWinRate(
readPrefs().scanBothMinWinRate
);
let statsMode =
normalizeAlgoStatsMode(
readPrefs().statsMode
);
let statsModeSt2 =
normalizeAlgoStatsMode(
readPrefs().statsModeSt2
);
let statsModeSt3 =
normalizeAlgoStatsMode(
readPrefs().statsModeSt3
);
let chartPositionsStrategy =
readPrefs().chartPositionsStrategy ===
"partial-tp" ||
readPrefs().chartPositionsStrategy ===
"partial-tp-y"
? readPrefs().chartPositionsStrategy
: "fixed-tp";
let tickerScanUi =
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
let listApi =
null;
let drawingTools =
null;
let destroyDrawings =
()=>{};
let chartIndicators =
null;
let rsiPaneActive =
true;
let entryOverlay =
null;
let tradeUi =
null;
let botStrategyUi =
null;
let patternAnalysisTimer =
0;
let patternAnalysisSeq =
0;

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

function setSymbolLabel(){

if(
symbolEl
){
symbolEl.textContent =
displaySymbol(
symbol
);
}

document.title =
`${displaySymbol(
symbol
)} — АлгоТрейдинг`;

coinsState().currentSymbol =
normalizeSymbol(
symbol
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

}

function setRsiHud(
value
){

if(
!rsiHudValueEl
){
return;
}

if(
!Number.isFinite(
value
)
){
rsiHudValueEl.textContent =
"—";
return;
}

rsiHudValueEl.textContent =
value.toFixed(
2
);

}

function layoutRsi(){

if(
!rsiSeries ||
!rsiWrapEl
){
return;
}

updateRsiBandLayout(
rsiSeries,
rsiWrapEl.querySelector(
"#rsi-band"
)
);
updateRsiLevelLinesLayout(
rsiSeries,
rsiWrapEl
);

}

function lastRsiValue(){

if(
!candles.length
){
return null;
}

const points =
alignRsiWithCandleTimes(
candles,
calculateRSI(
candles
)
);
const last =
points[
points.length -
1
];

return Number.isFinite(
last?.value
)
? last.value
: null;

}

function applyRsiData(){

if(
!rsiPaneActive
){
chartIndicators?.notifyCandlesUpdate?.();
return;
}

if(
!candles.length
){
rsiSeries.setData(
[]
);
setRsiHud(
null
);
chartIndicators?.notifyCandlesUpdate?.();
return;
}

const points =
alignRsiWithCandleTimes(
candles,
calculateRSI(
candles
)
);

rsiSeries.setData(
points
);
applyRsiFixedPriceScale(
rsiChart,
rsiSeries
);
layoutRsi();

const last =
points[
points.length -
1
];
setRsiHud(
last?.value
);

chartIndicators?.notifyCandlesUpdate?.();

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
coinsTfVisibleBars(
tf,
candles.length
)
),
tf
);

}

function fitViewport(){

const display =
buildDisplayCandles();

applyCoinsChartViewport(
chart,
rsiChart,
display,
tf,
chartEl.clientWidth ||
0,
candles.length
);

}

function schedulePatternAnalysis(){

const seq =
++patternAnalysisSeq;

if(
patternAnalysisTimer
){
clearTimeout(
patternAnalysisTimer
);
}

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

refreshAlgoPatternAnalysis(
candles,
entryOverlay,
{
slPctOfX,
tpRr,
riskUsd,
tp1X,
tp2X,
tp3X,
tp1Y,
tp2Y,
tp3Y,
trailSlSt2,
trailSlPctSt2,
trailSlSt3,
trailSlPctSt3,
timeoutBars,
patternSettings:
readAlgoPattern12Settings(),
statsMode,
statsModeSt2,
statsModeSt3,
chartPositionsStrategy
}
);
},
0
);

}

function applyCandleData(
{
fit =
false
} =
{}
){

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

candleSeries.setData(
display
);
applyRsiData();

if(
fit
){
fitViewport();
setChartLayoutReady(
true
);
}

if(
isChartLayoutReady()
){
chartIndicators?.flushIndicatorDataRefreshNow?.();
chartIndicators?.notifyMainChartOverlaysSync?.();
}

if(
candles.length
){
schedulePatternAnalysis();
}

drawingTools?.scheduleRedraw?.();

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

async function loadSymbol(
nextSymbol,
nextTf
){

const seq =
++loadSeq;
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
writePrefs(
{
symbol,
tf,
slPctOfX,
tpRr,
riskUsd,
tp1X,
tp2X,
tp3X,
tp1Y,
tp2Y,
tp3Y,
trailSlSt2,
trailSlPctSt2,
trailSlSt3,
trailSlPctSt3,
timeoutBars,
scanStrategy,
scanTf,
scanLongMinWinRate,
scanShortMinWinRate,
scanBothMinWinRate,
statsMode,
statsModeSt2,
statsModeSt3,
chartPositionsStrategy
}
);
drawingTools?.onSymbolChange?.({
skipRedraw:
true
});
chartIndicators?.notifySymbolChange?.();

try{
const rows =
await loadMarketHistory(
symbol,
tf,
HISTORY_REQUESTS,
{
parallel:
true
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

applyCandleData(
{
fit:
true
}
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

if(
!mergeLiveCandle(
candles,
candle,
0
)
){
return;
}

applyCandleData();

}
);

listApi?.highlight?.();
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
}
}

}

const unlinkTime =
linkPairedChartTimeScales(
chart,
rsiChart,
layoutRsi
);

if(
linkedCrosshairVertEl
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
mountAlgoTradingDrawings(
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
);

drawingTools =
drawingsMount.tools;
destroyDrawings =
drawingsMount.destroy;

chartIndicators =
mountAlgoTradingIndicators(
{
root:
document.getElementById(
"chart-indicators-wrap"
),
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
schedulePatternAnalysis();

},
loadIndicatorHistory:(
histSymbol,
histTf
)=>
loadMarketHistory(
histSymbol,
histTf,
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
"rsi"
){
fitViewport();
chartIndicators?.notifyLayoutChange?.();
}

}
})
}
);

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
slPctOfX,
getTpRr:()=>
tpRr,
getRiskUsd:()=>
riskUsd,
getTimeoutBars:()=>
timeoutBars,
getChartPositionsStrategy:()=>
chartPositionsStrategy,
getTp3X:()=>
tp3X,
getTp3Y:()=>
tp3Y
}
);
entryOverlay.bind();

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
chartIndicators?.flushIndicatorDataRefreshNow?.();
chartIndicators?.notifyMainChartOverlaysSync?.();
schedulePatternAnalysis();
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

const slPctInput =
document.getElementById(
"algo-sl-pct-of-x"
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
timeoutBars
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
timeoutBars
){
return;
}

timeoutBars =
next;
persistAlgoSettings();
};

timeoutBarsInput.addEventListener(
"change",
commitTimeoutBars
);
timeoutBarsInput.addEventListener(
"keydown",
event=>{

if(
event.key ===
"Enter"
){
event.preventDefault();
timeoutBarsInput.blur();
}

}
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


function persistAlgoSettings(){

writePrefs(
{
symbol,
tf,
slPctOfX,
tpRr,
riskUsd,
tp1X,
tp2X,
tp3X,
tp1Y,
tp2Y,
tp3Y,
trailSlSt2,
trailSlPctSt2,
trailSlSt3,
trailSlPctSt3,
timeoutBars,
scanStrategy,
scanTf,
scanLongMinWinRate,
scanShortMinWinRate,
scanBothMinWinRate,
statsMode,
statsModeSt2,
statsModeSt3,
chartPositionsStrategy
}
);
refreshAlgoPatternAnalysis(
candles,
entryOverlay,
{
slPctOfX,
tpRr,
riskUsd,
tp1X,
tp2X,
tp3X,
tp1Y,
tp2Y,
tp3Y,
trailSlSt2,
trailSlPctSt2,
trailSlSt3,
trailSlPctSt3,
timeoutBars,
patternSettings:
readAlgoPattern12Settings(),
statsMode,
statsModeSt2,
statsModeSt3,
chartPositionsStrategy
}
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

function getStatsModeForStrategy(
strategy
){

if(
strategy ===
"partial-tp"
){
return statsModeSt2;
}

if(
strategy ===
"partial-tp-y"
){
return statsModeSt3;
}

return statsMode;

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
statsModeSt2 =
next;
}else if(
strategy ===
"partial-tp-y"
){
statsModeSt3 =
next;
}else{
statsMode =
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
chartPositionsStrategy;
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

chartPositionsStrategy =
strategy;
applyChartPositionChecks();
persistAlgoSettings();
entryOverlay?.refreshPositions?.();

}
);

}

if(
slPctInput
){
slPctInput.value =
String(
slPctOfX
);

const commitSlPct =
()=>{
const next =
clampSlPctOfX(
slPctInput.value
);
slPctInput.value =
String(
next
);

if(
next ===
slPctOfX
){
return;
}

slPctOfX =
next;
persistAlgoSettings();
};

slPctInput.addEventListener(
"change",
commitSlPct
);
slPctInput.addEventListener(
"keydown",
event=>{

if(
event.key ===
"Enter"
){
event.preventDefault();
slPctInput.blur();
}

}
);
}

if(
tpRrInput
){
tpRrInput.value =
String(
tpRr
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
tpRr
){
return;
}

tpRr =
next;
persistAlgoSettings();
};

tpRrInput.addEventListener(
"change",
commitTpRr
);
tpRrInput.addEventListener(
"keydown",
event=>{

if(
event.key ===
"Enter"
){
event.preventDefault();
tpRrInput.blur();
}

}
);
}

if(
riskUsdInput
){
riskUsdInput.value =
String(
riskUsd
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
riskUsd
){
return;
}

riskUsd =
next;
persistAlgoSettings();
};

riskUsdInput.addEventListener(
"change",
commitRiskUsd
);
riskUsdInput.addEventListener(
"keydown",
event=>{

if(
event.key ===
"Enter"
){
event.preventDefault();
riskUsdInput.blur();
}

}
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

input.addEventListener(
"change",
commit
);
input.addEventListener(
"keydown",
event=>{

if(
event.key ===
"Enter"
){
event.preventDefault();
input.blur();
}

}
);

}

bindPartialTpInput(
tp1XInput,
()=>
tp1X,
next=>{
tp1X =
next;
},
DEFAULT_PARTIAL_TP1_X
);
bindPartialTpInput(
tp2XInput,
()=>
tp2X,
next=>{
tp2X =
next;
},
DEFAULT_PARTIAL_TP2_X
);
bindPartialTpInput(
tp3XInput,
()=>
tp3X,
next=>{
tp3X =
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
tp1Y,
next=>{
tp1Y =
next;
},
DEFAULT_PARTIAL_TP1_X
);
bindPartialTpInput(
tp2YInput,
()=>
tp2Y,
next=>{
tp2Y =
next;
},
DEFAULT_PARTIAL_TP2_X
);
bindPartialTpInput(
tp3YInput,
()=>
tp3Y,
next=>{
tp3Y =
next;
},
DEFAULT_PARTIAL_TP3_X
);

function bindTrailSlPctInput(
input,
getValue,
setValue
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
clampTrailSlPct(
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

input.addEventListener(
"change",
commit
);
input.addEventListener(
"keydown",
event=>{

if(
event.key ===
"Enter"
){
event.preventDefault();
input.blur();
}

}
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

const trailSlPctSt2Input =
document.getElementById(
"algo-trail-sl-pct-st2"
);
const trailSlSt2Check =
document.getElementById(
"algo-trail-sl-st2"
);
const trailSlPctSt3Input =
document.getElementById(
"algo-trail-sl-pct-st3"
);
const trailSlSt3Check =
document.getElementById(
"algo-trail-sl-st3"
);

bindTrailSlPctInput(
trailSlPctSt2Input,
()=>
trailSlPctSt2,
next=>{
trailSlPctSt2 =
next;
}
);
bindTrailSlCheck(
trailSlSt2Check,
()=>
trailSlSt2,
next=>{
trailSlSt2 =
next;
}
);
bindTrailSlPctInput(
trailSlPctSt3Input,
()=>
trailSlPctSt3,
next=>{
trailSlPctSt3 =
next;
}
);
bindTrailSlCheck(
trailSlSt3Check,
()=>
trailSlSt3,
next=>{
trailSlSt3 =
next;
}
);



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

window.addEventListener(
"resize",
()=>{
layoutRsi();
chartIndicators?.notifyLayoutChange?.();
chartIndicators?.syncViewports?.();
}
);

window.addEventListener(
"pagehide",
()=>{
disposed =
true;
tickerScanUi?.stopAll?.();
tickerScanUi =
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

void mountAlgoTradingCoinList(
{
getSymbol:()=>
symbol,
setSymbolLabel(
next
){
symbol =
normalizeSymbol(
next
);
setSymbolLabel();
},
async loadSymbol(
next
){
await loadSymbol(
next,
tf
);
listApi?.highlight?.();
}
}
).then(
api=>{
listApi =
api;
listApi?.highlight?.();
}
);

tickerScanUi =
mountAlgoTickerScanUi(
{
getTradeOpts:()=>({
slPctOfX,
tpRr,
riskUsd,
tp1X,
tp2X,
tp3X,
tp1Y,
tp2Y,
tp3Y,
trailSlSt2,
trailSlPctSt2,
trailSlSt3,
trailSlPctSt3,
timeoutBars,
patternSettings:
readAlgoPattern12Settings()
}),
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
scanStrategy =
patch.scanStrategy;
}

if(
patch.scanTf !=
null
){
scanTf =
normalizeAlgoScanTfPref(
patch.scanTf
);
}

if(
patch.scanLongMinWinRate !=
null
){
scanLongMinWinRate =
clampScanMinWinRate(
patch.scanLongMinWinRate
);
}

if(
patch.scanShortMinWinRate !=
null
){
scanShortMinWinRate =
clampScanMinWinRate(
patch.scanShortMinWinRate
);
}

if(
patch.scanBothMinWinRate !=
null
){
scanBothMinWinRate =
clampScanMinWinRate(
patch.scanBothMinWinRate
);
}

writePrefs(
{
symbol,
tf,
slPctOfX,
tpRr,
riskUsd,
tp1X,
tp2X,
tp3X,
tp1Y,
tp2Y,
tp3Y,
trailSlSt2,
trailSlPctSt2,
trailSlSt3,
trailSlPctSt3,
timeoutBars,
scanStrategy,
scanTf,
scanLongMinWinRate,
scanShortMinWinRate,
scanBothMinWinRate,
statsMode,
statsModeSt2,
statsModeSt3,
chartPositionsStrategy
}
);
},
onListsChanged(){
refreshAlgoMarketListFromFlags();
}
}
);

mountAlgoRuntimeUi(
{
getExchangeId:()=>
getActiveExchangeId()
}
);

botStrategyUi =
mountAlgoBotStrategyUi();

void loadSymbol(
symbol,
tf
);

}
