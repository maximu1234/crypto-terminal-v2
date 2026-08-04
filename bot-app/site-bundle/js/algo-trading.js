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
computeChartFutureMarginBars
} from "./chart-import.js?v=44";

import {
terminalVisibleBars,
TERMINAL_VISIBLE_BARS
} from "./terminal-chart-history-prefs.js?v=1";

import {
calculateRSI,
alignRsiWithCandleTimes
} from "./indicators.js?v=3";

import {
loadMarketHistory,
getActiveExchangeId
} from "./market-api.js?v=5";

import {
subscribeKline
} from "./market-ws.js?v=1";

import {
mountAlgoTradingCoinList,
refreshAlgoMarketListFromFlags
} from "./algo-trading-list.js?v=12";

import {
mountAlgoTickerScanUi
} from "./algo-trading/ticker-scan-ui.js?v=16";

import {
mountAlgoRuntimeUi
} from "./algo-trading/runtime-ui.js?v=13";

import {
mountAlgoBotStrategyUi
} from "./algo-trading/bot-strategy-ui.js?v=63";

import {
mountSessionLogServerSettings
} from "./algo-trading/bot-session-log-server-ui.js?v=9";

import {
syncBotStrategiesToMain
} from "./algo-trading/bot-bridge.js?v=12";

import {
mountAlgoTradeUi
} from "./algo-trading/trade/boot.js?v=4";

import {
mountAlgoTradingDrawings
} from "./algo-trading/drawings.js?v=2";

import {
mountAlgoTradingIndicators
} from "./algo-trading/indicators.js?v=7";

import {
mountAlgoPatternEntryOverlay
} from "./algo-trading/pattern-entry-overlay.js?v=16";

import {
clearAlgoPatternAnalysisUi,
refreshAlgoPatternAnalysis
} from "./algo-trading/pattern-analysis.js?v=25";

import {
invalidateAlgoPattern12SceneCache
} from "./algo-trading/pattern-12-scene-cache.js?v=2";

import {
clampSlPctOfX,
clampTpRr,
clampRiskUsd,
DEFAULT_SL_PCT_OF_X,
DEFAULT_TP_RR,
DEFAULT_RISK_USD
} from "./algo-trading/pattern-entry-positions.js?v=14";

import {
clampPartialTpX,
clampTrailSlX1,
clampTrailSlX2,
resolveTrailSlX1,
normalizeTrailSlEnabled,
normalizeTpShares,
rebalanceTpShares,
DEFAULT_PARTIAL_TP1_X,
DEFAULT_PARTIAL_TP2_X,
DEFAULT_PARTIAL_TP3_X,
DEFAULT_TRAIL_SL_X1,
DEFAULT_TRAIL_SL_X2,
DEFAULT_TP_SHARES
} from "./algo-trading/pattern-trade-stats-partial.js?v=19";

import {
clampEntryTimeoutBars,
clampMaxPt1Pt4Bars,
resolveMaxPt1Pt4BarsFromPrefs,
ENTRY_TIMEOUT_BARS,
ENTRY_MAX_PT1_PT4_BARS
} from "./algo-trading/pattern-entry-logic.js?v=11";

/* TEMP_PULLBACK_BEFORE_ARM — remove with temp-pullback-before-arm.js */
import {
clampPullbackBeforeArmPct,
normalizePullbackBeforeArmEnabled,
DEFAULT_PULLBACK_BEFORE_ARM_PCT
} from "./algo-trading/temp-pullback-before-arm.js?v=3";

import {
clampAlgoEmaPeriod,
clampAlgoEmaShift,
normalizeAlgoEmaFilterEnabled,
normalizeAlgoEmaTf,
buildAlgoEmaLinePoints,
DEFAULT_ALGO_EMA_PERIOD,
DEFAULT_ALGO_EMA_PERIOD_2,
DEFAULT_ALGO_EMA_SHIFT
} from "./algo-trading/pattern-ema-filter.js?v=3";

import {
normalizeAlgoTpEmaTrail,
clampAlgoTpEmaLength,
DEFAULT_ALGO_TP_EMA_LENGTH
} from "./algo-trading/pattern-tp-ema.js?v=1";

import {
alignMaPointsToDisplayCandles
} from "./indicators/ma-math.js?v=2";

import {
normalizeAlgoStatsMode
} from "./algo-trading/pattern-trade-stats.js?v=12";

import {
readAlgoPattern12Settings
} from "./algo-trading/pattern-12-settings.js?v=2";

import {
setChartLayoutReady,
isChartLayoutReady
} from "./chart-layout-gate.js?v=2";

import {
invalidatePreservedVisibleLogicalRange,
runWithPreservedVisibleLogicalRange
} from "./chart-visible-range.js?v=3";

import {
COINS_TF_HOTKEYS,
COINS_TF_VALUES,
coinsState,
marketMap
} from "./terminal/terminal-state.js?v=12";

const DEFAULT_SYMBOL =
"BTCUSDT";
const DEFAULT_TF =
"60";
/** Fast first paint: 5×1000 bars. Full depth for stats: 10×1000 (auto-deepen). */
const HISTORY_FAST_REQUESTS =
5;
const HISTORY_REQUESTS =
10;
/** Throttle live-tick pattern stats so overlays can paint. */
const PATTERN_ANALYSIS_LIVE_MS =
1500;

const ALGO_PREFS_KEY =
"algo_trading_page_prefs_v1";

const ALGO_POSITION_DRAW_HOTKEYS =
new Map(
[
[
"KeyL",
"long"
],
[
"KeyS",
"short"
],
[
"KeyF",
"fib"
],
[
"KeyR",
"rectangle"
],
[
"KeyH",
"hline"
],
[
"KeyJ",
"hray"
],
[
"KeyA",
"trendline"
],
[
"KeyB",
"brush"
],
[
"KeyC",
"channel"
]
]
);

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
const sharesX =
normalizeTpShares(
raw.share1X,
raw.share2X,
raw.share3X
);
const sharesY =
normalizeTpShares(
raw.share1Y,
raw.share2Y,
raw.share3Y
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
trailSlX1St2:
resolveTrailSlX1(
raw.trailSlX1St2,
raw.trailSlPctSt2
),
trailSlX2St2:
clampTrailSlX2(
raw.trailSlX2St2,
resolveTrailSlX1(
raw.trailSlX1St2,
raw.trailSlPctSt2
),
[
raw.tp1X,
raw.tp2X,
raw.tp3X
]
),
share1X:
sharesX[
0
],
share2X:
sharesX[
1
],
share3X:
sharesX[
2
],
share1Y:
sharesY[
0
],
share2Y:
sharesY[
1
],
share3Y:
sharesY[
2
],
trailSlSt3:
normalizeTrailSlEnabled(
raw.trailSlSt3
),
trailSlX1St3:
resolveTrailSlX1(
raw.trailSlX1St3,
raw.trailSlPctSt3
),
trailSlX2St3:
clampTrailSlX2(
raw.trailSlX2St3,
resolveTrailSlX1(
raw.trailSlX1St3,
raw.trailSlPctSt3
),
[
raw.tp1Y,
raw.tp2Y,
raw.tp3Y
]
),
timeoutBars:
clampEntryTimeoutBars(
raw.timeoutBars
),
maxPt1Pt4Bars:
resolveMaxPt1Pt4BarsFromPrefs(
raw
),
/* TEMP_PULLBACK_BEFORE_ARM */
pullbackBeforeArm:
normalizePullbackBeforeArmEnabled(
raw.pullbackBeforeArm
),
pullbackBeforeArmPct:
clampPullbackBeforeArmPct(
raw.pullbackBeforeArmPct
),
emaFilter:
normalizeAlgoEmaFilterEnabled(
raw.emaFilter
),
emaPeriod:
clampAlgoEmaPeriod(
raw.emaPeriod
),
emaShift:
clampAlgoEmaShift(
raw.emaShift
),
emaTf:
normalizeAlgoEmaTf(
raw.emaTf
),
emaFilter2:
normalizeAlgoEmaFilterEnabled(
raw.emaFilter2
),
emaPeriod2:
clampAlgoEmaPeriod(
raw.emaPeriod2,
DEFAULT_ALGO_EMA_PERIOD_2
),
emaShift2:
clampAlgoEmaShift(
raw.emaShift2
),
emaTf2:
normalizeAlgoEmaTf(
raw.emaTf2
),
tpEmaTrail:
normalizeAlgoTpEmaTrail(
raw.tpEmaTrail
),
tpEmaLength:
clampAlgoTpEmaLength(
raw.tpEmaLength
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
scanTop100MinWinRate:
clampScanMinWinRate(
raw.scanTop100MinWinRate
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
trailSlX1St2:
DEFAULT_TRAIL_SL_X1,
trailSlX2St2:
DEFAULT_TRAIL_SL_X2,
share1X:
DEFAULT_TP_SHARES[
0
],
share2X:
DEFAULT_TP_SHARES[
1
],
share3X:
DEFAULT_TP_SHARES[
2
],
share1Y:
DEFAULT_TP_SHARES[
0
],
share2Y:
DEFAULT_TP_SHARES[
1
],
share3Y:
DEFAULT_TP_SHARES[
2
],
trailSlSt3:
true,
trailSlX1St3:
DEFAULT_TRAIL_SL_X1,
trailSlX2St3:
DEFAULT_TRAIL_SL_X2,
timeoutBars:
ENTRY_TIMEOUT_BARS,
maxPt1Pt4Bars:
ENTRY_MAX_PT1_PT4_BARS,
/* TEMP_PULLBACK_BEFORE_ARM */
pullbackBeforeArm:
false,
pullbackBeforeArmPct:
DEFAULT_PULLBACK_BEFORE_ARM_PCT,
emaFilter:
false,
emaPeriod:
DEFAULT_ALGO_EMA_PERIOD,
emaShift:
DEFAULT_ALGO_EMA_SHIFT,
emaTf:
"",
emaFilter2:
false,
emaPeriod2:
DEFAULT_ALGO_EMA_PERIOD_2,
emaShift2:
DEFAULT_ALGO_EMA_SHIFT,
emaTf2:
"",
tpEmaTrail:
false,
tpEmaLength:
DEFAULT_ALGO_TP_EMA_LENGTH,
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
scanTop100MinWinRate:
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

const sharesX =
normalizeTpShares(
prefs.share1X,
prefs.share2X,
prefs.share3X
);
const sharesY =
normalizeTpShares(
prefs.share1Y,
prefs.share2Y,
prefs.share3Y
);

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
trailSlX1St2:
clampTrailSlX1(
prefs.trailSlX1St2
),
trailSlX2St2:
clampTrailSlX2(
prefs.trailSlX2St2,
prefs.trailSlX1St2,
[
prefs.tp1X,
prefs.tp2X,
prefs.tp3X
]
),
share1X:
sharesX[
0
],
share2X:
sharesX[
1
],
share3X:
sharesX[
2
],
share1Y:
sharesY[
0
],
share2Y:
sharesY[
1
],
share3Y:
sharesY[
2
],
trailSlSt3:
normalizeTrailSlEnabled(
prefs.trailSlSt3
),
trailSlX1St3:
clampTrailSlX1(
prefs.trailSlX1St3
),
trailSlX2St3:
clampTrailSlX2(
prefs.trailSlX2St3,
prefs.trailSlX1St3,
[
prefs.tp1Y,
prefs.tp2Y,
prefs.tp3Y
]
),
timeoutBars:
clampEntryTimeoutBars(
prefs.timeoutBars
),
maxPt1Pt4Bars:
clampMaxPt1Pt4Bars(
prefs.maxPt1Pt4Bars
),
/* TEMP_PULLBACK_BEFORE_ARM */
pullbackBeforeArm:
normalizePullbackBeforeArmEnabled(
prefs.pullbackBeforeArm
),
pullbackBeforeArmPct:
clampPullbackBeforeArmPct(
prefs.pullbackBeforeArmPct
),
emaFilter:
normalizeAlgoEmaFilterEnabled(
prefs.emaFilter
),
emaPeriod:
clampAlgoEmaPeriod(
prefs.emaPeriod
),
emaShift:
clampAlgoEmaShift(
prefs.emaShift
),
emaTf:
normalizeAlgoEmaTf(
prefs.emaTf
),
emaFilter2:
normalizeAlgoEmaFilterEnabled(
prefs.emaFilter2
),
emaPeriod2:
clampAlgoEmaPeriod(
prefs.emaPeriod2,
DEFAULT_ALGO_EMA_PERIOD_2
),
emaShift2:
clampAlgoEmaShift(
prefs.emaShift2
),
emaTf2:
normalizeAlgoEmaTf(
prefs.emaTf2
),
tpEmaTrail:
normalizeAlgoTpEmaTrail(
prefs.tpEmaTrail
),
tpEmaLength:
clampAlgoTpEmaLength(
prefs.tpEmaLength
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
scanTop100MinWinRate:
clampScanMinWinRate(
prefs.scanTop100MinWinRate
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

const ALGO_STATS_PANEL_CSS_MAX_H =
420;
const ALGO_STATS_PANEL_H_KEY =
"algo_stats_panel_height_v1";

function readAlgoStatsPanelHeight(){

try{
const n =
Number(
localStorage.getItem(
ALGO_STATS_PANEL_H_KEY
)
);

if(
Number.isFinite(
n
) &&
n >=
0
){
return Math.round(
n
);
}
}catch{
/* ignore */
}

return null;

}

function writeAlgoStatsPanelHeight(
h
){

try{
localStorage.setItem(
ALGO_STATS_PANEL_H_KEY,
String(
Math.max(
0,
Math.round(
h
)
)
)
);
}catch{
/* ignore */
}

}

/**
 * Панель «Данные»: текущая высота = максимум; вниз можно сжать до 0.
 * Высота запоминается в localStorage между заходами на страницу.
 * @param {() => void} [onLayout]
 * @param {(collapsed: boolean, wasCollapsed: boolean) => void} [onCollapsedChange]
 * @returns {() => void}
 */
function bindAlgoStatsPanelResize(
onLayout,
onCollapsedChange
){

const panel =
document.getElementById(
"algo-stats-panel"
);
const handle =
document.getElementById(
"algo-stats-resize"
);

if(
!panel ||
!handle
){
return ()=>{};
}

let maxH =
0;
let currentH =
0;
let dragStartY =
0;
let dragStartH =
0;
let dragging =
false;

function notifyLayout(){

onLayout?.();

}

function applyHeight(
h
){

const next =
Math.max(
0,
Math.min(
maxH ||
ALGO_STATS_PANEL_CSS_MAX_H,
Math.round(
h
)
)
);

currentH =
next;
panel.style.setProperty(
"--algo-stats-panel-h",
`${next}px`
);
panel.style.setProperty(
"--algo-stats-panel-max-h",
`${maxH || ALGO_STATS_PANEL_CSS_MAX_H}px`
);
panel.style.flex =
`0 0 ${next}px`;
panel.style.height =
`${next}px`;

const wasCollapsed =
panel.classList.contains(
"is-collapsed"
);
const collapsed =
next <=
0;

panel.classList.toggle(
"is-collapsed",
collapsed
);
onCollapsedChange?.(
collapsed,
wasCollapsed
);

handle.setAttribute(
"aria-valuenow",
String(
next
)
);
handle.setAttribute(
"aria-valuemax",
String(
maxH ||
ALGO_STATS_PANEL_CSS_MAX_H
)
);

}

function captureMaxFromNatural(){

panel.style.removeProperty(
"--algo-stats-panel-h"
);
panel.style.removeProperty(
"flex"
);
panel.style.removeProperty(
"height"
);
panel.classList.remove(
"is-collapsed"
);

const natural =
Math.round(
panel.getBoundingClientRect().height
);

maxH =
Math.max(
0,
Math.min(
ALGO_STATS_PANEL_CSS_MAX_H,
natural ||
ALGO_STATS_PANEL_CSS_MAX_H
)
);

const saved =
readAlgoStatsPanelHeight();

applyHeight(
saved ==
null
? maxH
: Math.min(
maxH,
saved
)
);

}

function onPointerMove(
event
){

if(
!dragging
){
return;
}

applyHeight(
dragStartH +
(
dragStartY -
event.clientY
)
);
notifyLayout();

}

function onPointerUp(){

if(
!dragging
){
return;
}

dragging =
false;
document.body.classList.remove(
"algo-stats-panel-dragging"
);
window.removeEventListener(
"pointermove",
onPointerMove
);
window.removeEventListener(
"pointerup",
onPointerUp
);
writeAlgoStatsPanelHeight(
currentH
);
notifyLayout();

}

function onPointerDown(
event
){

if(
event.button !=
null &&
event.button !==
0
){
return;
}

event.preventDefault();
dragging =
true;
dragStartY =
event.clientY;
dragStartH =
currentH;
document.body.classList.add(
"algo-stats-panel-dragging"
);
window.addEventListener(
"pointermove",
onPointerMove
);
window.addEventListener(
"pointerup",
onPointerUp
);

}

handle.setAttribute(
"aria-valuemin",
"0"
);
handle.addEventListener(
"pointerdown",
onPointerDown
);

requestAnimationFrame(
()=>{
requestAnimationFrame(
()=>{
captureMaxFromNatural();
notifyLayout();
}
);
}
);

return ()=>{
handle.removeEventListener(
"pointerdown",
onPointerDown
);
onPointerUp();
};

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

function isAlgoBotLiteMode(){

if(
typeof document !==
"undefined" &&
document.body?.classList?.contains(
"algo-bot-lite-layout"
)
){
return true;
}

if(
typeof location !==
"undefined" &&
/\bbotLite=1\b/i.test(
location.search ||
""
)
){
return true;
}

const desktop =
typeof window !==
"undefined"
? window.cryptoTerminalDesktop
: null;

if(
desktop &&
/algo-bot/i.test(
String(
desktop.appId ||
desktop.productName ||
""
)
)
){
return true;
}

return false;

}

function mountAlgoBotLiteLayout(){

if(
!isAlgoBotLiteMode()
){
return;
}

const left =
document.getElementById(
"left"
);
const indicatorsRoot =
document.getElementById(
"chart-indicators-wrap"
);
const statsPanel =
document.getElementById(
"algo-stats-panel"
);
const statsResize =
document.getElementById(
"algo-stats-resize"
);
const globalSetupCol =
document.querySelector(
'.algo-stats-col[data-algo-strategy="global-setup"]'
);
const st1Col =
document.querySelector(
'.algo-stats-col[data-algo-strategy="fixed-tp"]'
);
const st2Col =
document.querySelector(
'.algo-stats-col[data-algo-strategy="partial-tp"]'
);
const st3Col =
document.querySelector(
'.algo-stats-col[data-algo-strategy="partial-tp-y"]'
);

if(
!left ||
!indicatorsRoot ||
!statsPanel ||
!globalSetupCol ||
!st1Col ||
!st2Col ||
!st3Col
){
return;
}

document.body.classList.add(
"algo-bot-lite-layout"
);

if(
statsResize
){
statsResize.hidden =
true;
}

statsPanel.hidden =
true;

let grid =
document.getElementById(
"algo-bot-main-grid"
);

if(
!grid
){
grid =
document.createElement(
"div"
);
grid.id =
"algo-bot-main-grid";
grid.className =
"algo-bot-main-grid";
}

let topRow =
grid.querySelector(
".algo-bot-grid-top"
);

if(
!topRow
){
topRow =
document.createElement(
"div"
);
topRow.className =
"algo-bot-grid-top";
}

let bottomRow =
grid.querySelector(
".algo-bot-grid-bottom"
);

if(
!bottomRow
){
bottomRow =
document.createElement(
"div"
);
bottomRow.className =
"algo-bot-grid-bottom";
}

function ensureCell(
row,
selector,
className,
ariaLabel
){

let cell =
row.querySelector(
selector
);

if(
!cell
){
cell =
document.createElement(
"section"
);
cell.className =
className;
cell.setAttribute(
"aria-label",
ariaLabel
);
row.appendChild(
cell
);
}

return cell;

}

const patternCell =
ensureCell(
topRow,
".algo-bot-grid-pattern",
"algo-bot-grid-cell algo-bot-grid-pattern",
"Паттерн 1-2"
);
const globalCell =
ensureCell(
topRow,
".algo-bot-grid-global",
"algo-bot-grid-cell algo-bot-grid-global",
"Глобальные настройки"
);
const st1Cell =
ensureCell(
bottomRow,
".algo-bot-grid-st1",
"algo-bot-grid-cell algo-bot-grid-st1",
"Стратегия 1"
);
const st2Cell =
ensureCell(
bottomRow,
".algo-bot-grid-st2",
"algo-bot-grid-cell algo-bot-grid-st2",
"Стратегия 2"
);
const st3Cell =
ensureCell(
bottomRow,
".algo-bot-grid-st3",
"algo-bot-grid-cell algo-bot-grid-st3",
"Стратегия 3"
);

let patternSettingsPane =
document.getElementById(
"algo-bot-lite-pattern-settings"
);

if(
!patternSettingsPane
){
patternSettingsPane =
document.createElement(
"section"
);
patternSettingsPane.id =
"algo-bot-lite-pattern-settings";
patternSettingsPane.className =
"algo-bot-lite-pattern-settings";
patternSettingsPane.setAttribute(
"aria-label",
"Настройки Паттерн 1-2"
);
}

indicatorsRoot.classList.add(
"algo-bot-lite-indicators",
"algo-bot-lite-pattern-only"
);
patternCell.appendChild(
indicatorsRoot
);
patternCell.appendChild(
patternSettingsPane
);

globalSetupCol.classList.add(
"algo-bot-lite-global-col"
);
globalCell.appendChild(
globalSetupCol
);
st1Cell.appendChild(
st1Col
);
st2Cell.appendChild(
st2Col
);
st3Cell.appendChild(
st3Col
);

grid.append(
topRow,
bottomRow
);

if(
grid.parentElement !==
left
){
left.appendChild(
grid
);
}

const topbar =
document.getElementById(
"topbar"
);
const accountWrap =
document.getElementById(
"header-settings-wrap"
);

if(
topbar &&
accountWrap &&
accountWrap.parentElement !==
topbar
){
topbar.appendChild(
accountWrap
);
}

}

export async function mountAlgoTradingPage(){

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

mountAlgoBotLiteLayout();

const main =
createCandlestickChart(
chartEl
);
const chart =
main.chart;
const candleSeries =
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
let trailSlX1St2 =
clampTrailSlX1(
readPrefs().trailSlX1St2
);
let trailSlX2St2 =
clampTrailSlX2(
readPrefs().trailSlX2St2,
trailSlX1St2,
[
tp1X,
tp2X,
tp3X
]
);
let trailSlSt3 =
normalizeTrailSlEnabled(
readPrefs().trailSlSt3
);
let trailSlX1St3 =
clampTrailSlX1(
readPrefs().trailSlX1St3
);
let trailSlX2St3 =
clampTrailSlX2(
readPrefs().trailSlX2St3,
trailSlX1St3,
[
tp1Y,
tp2Y,
tp3Y
]
);
let [
share1X,
share2X,
share3X
] =
normalizeTpShares(
readPrefs().share1X,
readPrefs().share2X,
readPrefs().share3X
);
let [
share1Y,
share2Y,
share3Y
] =
normalizeTpShares(
readPrefs().share1Y,
readPrefs().share2Y,
readPrefs().share3Y
);
let timeoutBars =
clampEntryTimeoutBars(
readPrefs().timeoutBars
);
let maxPt1Pt4Bars =
clampMaxPt1Pt4Bars(
readPrefs().maxPt1Pt4Bars
);
/* TEMP_PULLBACK_BEFORE_ARM */
let pullbackBeforeArm =
normalizePullbackBeforeArmEnabled(
readPrefs().pullbackBeforeArm
);
let pullbackBeforeArmPct =
clampPullbackBeforeArmPct(
readPrefs().pullbackBeforeArmPct
);
let emaFilter =
normalizeAlgoEmaFilterEnabled(
readPrefs().emaFilter
);
let emaPeriod =
clampAlgoEmaPeriod(
readPrefs().emaPeriod
);
let emaShift =
clampAlgoEmaShift(
readPrefs().emaShift
);
let emaTf =
normalizeAlgoEmaTf(
readPrefs().emaTf
);
let emaFilter2 =
normalizeAlgoEmaFilterEnabled(
readPrefs().emaFilter2
);
let emaPeriod2 =
clampAlgoEmaPeriod(
readPrefs().emaPeriod2,
DEFAULT_ALGO_EMA_PERIOD_2
);
let emaShift2 =
clampAlgoEmaShift(
readPrefs().emaShift2
);
let emaTf2 =
normalizeAlgoEmaTf(
readPrefs().emaTf2
);
let tpEmaTrail =
normalizeAlgoTpEmaTrail(
readPrefs().tpEmaTrail
);
let tpEmaLength =
clampAlgoTpEmaLength(
readPrefs().tpEmaLength
);
/* Entry EMA shift filters UI removed — keep off. */
emaFilter =
false;
emaFilter2 =
false;
const emaFilterLines =
[
{
color:
"#f0a63a",
series:
null,
isEnabled:
()=>
false,
getPeriod:
()=>
emaPeriod,
getShift:
()=>
emaShift,
getTf:
()=>
emaTf
},
{
color:
"#60a5fa",
series:
null,
isEnabled:
()=>
false,
getPeriod:
()=>
emaPeriod2,
getShift:
()=>
emaShift2,
getTf:
()=>
emaTf2
}
];
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
let scanTop100MinWinRate =
clampScanMinWinRate(
readPrefs().scanTop100MinWinRate
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
let lastPatternAnalysisAt =
0;
let algoStatsPanelCollapsed =
false;
let algoPattern12EnabledOnce =
false;
let historyDeepenToken =
0;
/** Bottom «Данные» only after full HISTORY_REQUESTS deepen (or deepen fail). */
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
schedulePatternAnalysis(
{
force:
true
}
);

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
algoPattern12EnabledOnce ||
disposed
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

syncAlgoChartTurnover24(
symbol
);

}

function formatTurnover24Label(
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
chartIndicators?.notifyMainChartOverlaysSync?.();
entryOverlay?.refreshPositions?.();

}

let algoResizeRaf =
0;

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
terminalVisibleBars(
candles.length
)
),
tf
);

}

function fitViewport(){

const display =
buildDisplayCandles();

invalidatePreservedVisibleLogicalRange();

applyCoinsChartViewport(
chart,
rsiChart,
display,
tf,
chartEl.clientWidth ||
0,
candles.length,
TERMINAL_VISIBLE_BARS
);

}

function ensureEmaFilterSeries(
line
){

if(
line.series
){
return line.series;
}

try{
line.series =
chart.addLineSeries(
{
color:
line.color,
lineWidth:
1,
priceLineVisible:
false,
lastValueVisible:
false,
crosshairMarkerVisible:
false,
visible:
false,
autoscaleInfoProvider:
()=>
null
}
);
}catch{
line.series =
null;
}

return line.series;

}

function hideEmaFilterLine(
line
){

if(
!line.series
){
return;
}

try{
line.series.setData(
[]
);
line.series.applyOptions(
{
visible:
false
}
);
}catch{
/* ignore */
}

}

function drawEmaFilterLine(
line,
display
){

if(
!line.isEnabled()
){
hideEmaFilterLine(
line
);
return;
}

const series =
ensureEmaFilterSeries(
line
);

if(
!series
){
return;
}

const points =
buildAlgoEmaLinePoints(
candles,
{
period:
line.getPeriod(),
shift:
line.getShift(),
tf:
line.getTf(),
chartTf:
tf
}
);

if(
!display.length ||
!points.length
){
hideEmaFilterLine(
line
);
return;
}

try{
series.setData(
alignMaPointsToDisplayCandles(
points,
display
)
);
series.applyOptions(
{
visible:
true
}
);
}catch{
/* ignore */
}

}

function refreshEmaFilterLines(){

const display =
buildDisplayCandles();

runWithPreservedVisibleLogicalRange(
chart,
()=>{

for(
const line of emaFilterLines
){
drawEmaFilterLine(
line,
display
);
}

}
);

}

function schedulePatternAnalysis(
{
force =
false
} =
{}
){

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

if(
force &&
isAlgoStatsAnalysisPaused()
){
return;
}

const seq =
++patternAnalysisSeq;

if(
patternAnalysisTimer
){
clearTimeout(
patternAnalysisTimer
);
}

const delay =
force
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
patternAnalysisSeq ||
isAlgoStatsAnalysisPaused()
){
return;
}

lastPatternAnalysisAt =
Date.now();

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
trailSlX1St2,
trailSlX2St2,
trailSlSt3,
trailSlX1St3,
trailSlX2St3,
share1X,
share2X,
share3X,
share1Y,
share2Y,
share3Y,
timeoutBars,
maxPt1Pt4Bars,
/* TEMP_PULLBACK_BEFORE_ARM */
pullbackBeforeArm,
pullbackBeforeArmPct,
emaFilter,
emaPeriod,
emaShift,
emaTf,
emaFilter2:
false,
emaPeriod2,
emaShift2,
emaTf2,
tpEmaTrail,
tpEmaLength,
chartTf:
tf,
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

chartIndicators?.clearMainChartOverlays?.();

candleSeries.setData(
display
);
applyRsiData();
refreshEmaFilterLines();

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
schedulePatternAnalysis(
{
force:
!!fit
}
);
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
trailSlX1St2,
trailSlX2St2,
trailSlSt3,
trailSlX1St3,
trailSlX2St3,
share1X,
share2X,
share3X,
share1Y,
share2Y,
share3Y,
timeoutBars,
maxPt1Pt4Bars,
/* TEMP_PULLBACK_BEFORE_ARM */
pullbackBeforeArm,
pullbackBeforeArmPct,
emaFilter,
emaPeriod,
emaShift,
emaTf,
emaFilter2:
false,
emaPeriod2,
emaShift2,
emaTf2,
tpEmaTrail,
tpEmaLength,
chartTf:
tf,
scanStrategy,
scanTf,
scanLongMinWinRate,
scanShortMinWinRate,
scanBothMinWinRate,
scanTop100MinWinRate,
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
invalidateAlgoPattern12SceneCache();
algoPattern12EnabledOnce =
false;

historyDeepenToken++;
const deepenId =
historyDeepenToken;
markAlgoHistoryStatsPending();

try{
const rowsFast =
await loadMarketHistory(
symbol,
tf,
HISTORY_FAST_REQUESTS,
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
rowsFast
)
? rowsFast.slice()
: [];

applyCandleData(
{
fit:
true
}
);
ensureAlgoPattern12Enabled();
dispatchAlgoChartCandlesLoaded(
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

void deepenAlgoHistory(
seq,
deepenId,
symbol,
tf
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
dispatchAlgoChartCandlesLoaded(
seq
);
markAlgoHistoryStatsReadyAndAnalyze();
}
}

}

/**
 * Background deepen: fetch only older bars beyond HISTORY_FAST_REQUESTS.
 * Does not refit viewport; user zoom stays.
 * Does not re-dispatch chart-candles-loaded (keeps position/order lines stable).
 */
async function deepenAlgoHistory(
seq,
deepenId,
sym,
histTf
){

const stillCurrent =
()=>
!disposed &&
seq ===
loadSeq &&
deepenId ===
historyDeepenToken;

const extraRequests =
Math.max(
0,
HISTORY_REQUESTS -
HISTORY_FAST_REQUESTS
);

try{
if(
extraRequests >
0 &&
candles.length
){
const oldest =
candles[0];
const endMs =
Number(
oldest?.time
) >
0
? Number(
oldest.time
) *
1000 -
1
: 0;

const older =
endMs >
0
? await loadMarketHistory(
sym,
histTf,
extraRequests,
{
parallel:
true,
endMs
}
)
: [];

if(
!stillCurrent()
){
return;
}

if(
Array.isArray(
older
) &&
older.length
){
const byTime =
new Map();

for(
const row of older
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

const liveTail =
candles[
candles.length -
1
] ||
null;

candles =
Array.from(
byTime.values()
).sort(
(
a,
b
)=>
a.time -
b.time
);

if(
liveTail
){
mergeLiveCandle(
candles,
liveTail,
0
);
}

invalidateAlgoPattern12SceneCache();
applyCandleData(
{
fit:
false
}
);
}
}else if(
!stillCurrent()
){
return;
}

markAlgoHistoryStatsReadyAndAnalyze();

}catch(
err
){
console.warn(
"[algo-trading] history deepen:",
err?.message ||
err
);

if(
stillCurrent()
){
markAlgoHistoryStatsReadyAndAnalyze();
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
await mountAlgoTradingIndicators(
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
schedulePatternAnalysis(
{
force:
true
}
);

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
scheduleResizeAlgoCharts();
}

}
})
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
chartIndicators?.setIndicatorEnabled?.(
"pattern-12",
true
);
chartIndicators?.renderIndicatorSettingsInline?.(
"pattern-12",
patternSettingsPane
);
}

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
getMaxPt1Pt4Bars:()=>
maxPt1Pt4Bars,
/* TEMP_PULLBACK_BEFORE_ARM */
getPullbackBeforeArm:()=>
pullbackBeforeArm,
getPullbackBeforeArmPct:()=>
pullbackBeforeArmPct,
getChartPositionsStrategy:()=>
chartPositionsStrategy,
getTp1X:()=>
tp1X,
getTp2X:()=>
tp2X,
getTp3X:()=>
tp3X,
getTp1Y:()=>
tp1Y,
getTp2Y:()=>
tp2Y,
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
schedulePatternAnalysis(
{
force:
true
}
);
drawingTools?.scheduleRedraw?.();
dispatchAlgoChartCandlesLoaded(
loadSeq
);
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

const maxPt1Pt4BarsInput =
document.getElementById(
"algo-max-pt1-pt4-bars"
);

if(
maxPt1Pt4BarsInput
){
maxPt1Pt4BarsInput.value =
maxPt1Pt4Bars ==
null
? ""
: String(
maxPt1Pt4Bars
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
maxPt1Pt4Bars
){
return;
}

maxPt1Pt4Bars =
next;
persistAlgoSettings();
};

maxPt1Pt4BarsInput.addEventListener(
"change",
commitMaxPt1Pt4Bars
);
maxPt1Pt4BarsInput.addEventListener(
"keydown",
event=>{

if(
event.key ===
"Enter"
){
event.preventDefault();
maxPt1Pt4BarsInput.blur();
}

}
);
}



/* TEMP_PULLBACK_BEFORE_ARM — remove with temp-pullback-before-arm.js */
const pullbackBeforeArmInput =
document.getElementById(
"algo-pullback-before-arm"
);
const pullbackBeforeArmPctInput =
document.getElementById(
"algo-pullback-before-arm-pct"
);

if(
pullbackBeforeArmPctInput
){
pullbackBeforeArmPctInput.value =
String(
pullbackBeforeArmPct
);

const commitPullbackPct =
()=>{
const next =
clampPullbackBeforeArmPct(
pullbackBeforeArmPctInput.value
);
pullbackBeforeArmPctInput.value =
String(
next
);

if(
next ===
pullbackBeforeArmPct
){
return;
}

pullbackBeforeArmPct =
next;
persistAlgoSettings();
};

pullbackBeforeArmPctInput.addEventListener(
"change",
commitPullbackPct
);
pullbackBeforeArmPctInput.addEventListener(
"keydown",
event=>{

if(
event.key ===
"Enter"
){
event.preventDefault();
pullbackBeforeArmPctInput.blur();
}

}
);
}

if(
pullbackBeforeArmInput
){
pullbackBeforeArmInput.checked =
pullbackBeforeArm;

pullbackBeforeArmInput.addEventListener(
"change",
()=>{
pullbackBeforeArm =
!!pullbackBeforeArmInput.checked;
persistAlgoSettings();
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
trailSlX1St2,
trailSlX2St2,
trailSlSt3,
trailSlX1St3,
trailSlX2St3,
share1X,
share2X,
share3X,
share1Y,
share2Y,
share3Y,
timeoutBars,
maxPt1Pt4Bars,
/* TEMP_PULLBACK_BEFORE_ARM */
pullbackBeforeArm,
pullbackBeforeArmPct,
emaFilter,
emaPeriod,
emaShift,
emaTf,
emaFilter2:
false,
emaPeriod2,
emaShift2,
emaTf2,
tpEmaTrail,
tpEmaLength,
chartTf:
tf,
scanStrategy,
scanTf,
scanLongMinWinRate,
scanShortMinWinRate,
scanBothMinWinRate,
scanTop100MinWinRate,
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
trailSlX1St2,
trailSlX2St2,
trailSlSt3,
trailSlX1St3,
trailSlX2St3,
share1X,
share2X,
share3X,
share1Y,
share2Y,
share3Y,
timeoutBars,
maxPt1Pt4Bars,
/* TEMP_PULLBACK_BEFORE_ARM */
pullbackBeforeArm,
pullbackBeforeArmPct,
emaFilter,
emaPeriod,
emaShift,
emaTf,
emaFilter2:
false,
emaPeriod2,
emaShift2,
emaTf2,
tpEmaTrail,
tpEmaLength,
chartTf:
tf,
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
trailSlX1St2,
[
tp1X,
tp2X,
tp3X
]
);
const clampTrailSlX2St3 =
raw=>
clampTrailSlX2(
raw,
trailSlX1St3,
[
tp1Y,
tp2Y,
tp3Y
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
trailSlX1St2,
next=>{
trailSlX1St2 =
next;
reclampTrailSlX2(
trailSlX2St2Input,
clampTrailSlX2St2,
()=>
trailSlX2St2,
value=>{
trailSlX2St2 =
value;
}
);
},
clampTrailSlX1
);
bindTrailSlXInput(
trailSlX2St2Input,
()=>
trailSlX2St2,
next=>{
trailSlX2St2 =
next;
},
clampTrailSlX2St2
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
bindTrailSlXInput(
trailSlX1St3Input,
()=>
trailSlX1St3,
next=>{
trailSlX1St3 =
next;
reclampTrailSlX2(
trailSlX2St3Input,
clampTrailSlX2St3,
()=>
trailSlX2St3,
value=>{
trailSlX2St3 =
value;
}
);
},
clampTrailSlX1
);
bindTrailSlXInput(
trailSlX2St3Input,
()=>
trailSlX2St3,
next=>{
trailSlX2St3 =
next;
},
clampTrailSlX2St3
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
);

}

bindTpShareInputs(
"x",
()=>[
share1X,
share2X,
share3X
],
next=>{
share1X =
next[
0
];
share2X =
next[
1
];
share3X =
next[
2
];
}
);
bindTpShareInputs(
"y",
()=>[
share1Y,
share2Y,
share3Y
],
next=>{
share1Y =
next[
0
];
share2Y =
next[
1
];
share3Y =
next[
2
];
}
);

function bindEmaFilterPair(
{
checkId,
periodId,
shiftId,
tfId,
fallbackPeriod,
getEnabled,
setEnabled,
getPeriod,
setPeriod,
getShift,
setShift,
getTf,
setTf
}
){

const check =
document.getElementById(
checkId
);
const periodInput =
document.getElementById(
periodId
);
const shiftInput =
document.getElementById(
shiftId
);
const tfSelect =
document.getElementById(
tfId
);

if(
check
){
check.checked =
!!getEnabled();
check.addEventListener(
"change",
()=>{
const next =
!!check.checked;

if(
next ===
!!getEnabled()
){
return;
}

setEnabled(
next
);
refreshEmaFilterLines();
persistAlgoSettings();
}
);
}

if(
periodInput
){
periodInput.value =
String(
getPeriod()
);

const commitPeriod =
()=>{
const next =
clampAlgoEmaPeriod(
periodInput.value,
fallbackPeriod
);
periodInput.value =
String(
next
);

if(
next ===
getPeriod()
){
return;
}

setPeriod(
next
);
refreshEmaFilterLines();
persistAlgoSettings();
};

periodInput.addEventListener(
"change",
commitPeriod
);
periodInput.addEventListener(
"keydown",
event=>{

if(
event.key ===
"Enter"
){
event.preventDefault();
periodInput.blur();
}

}
);
}

if(
shiftInput
){
shiftInput.value =
String(
getShift()
);

const commitShift =
()=>{
const next =
clampAlgoEmaShift(
shiftInput.value
);
shiftInput.value =
String(
next
);

if(
next ===
getShift()
){
return;
}

setShift(
next
);
refreshEmaFilterLines();
persistAlgoSettings();
};

shiftInput.addEventListener(
"change",
commitShift
);
shiftInput.addEventListener(
"keydown",
event=>{

if(
event.key ===
"Enter"
){
event.preventDefault();
shiftInput.blur();
}

}
);
}

if(
tfSelect
){
tfSelect.value =
normalizeAlgoEmaTf(
getTf()
);
tfSelect.addEventListener(
"change",
()=>{
const next =
normalizeAlgoEmaTf(
tfSelect.value
);
tfSelect.value =
next;

if(
next ===
getTf()
){
return;
}

setTf(
next
);
refreshEmaFilterLines();
persistAlgoSettings();
}
);
}

}

(function bindTpEmaTrail(){

const check =
document.getElementById(
"algo-tp-ema"
);
const lenInput =
document.getElementById(
"algo-tp-ema-len"
);

if(
check
){
check.checked =
tpEmaTrail;
check.addEventListener(
"change",
()=>{
tpEmaTrail =
!!check.checked;
persistAlgoSettings();
}
);
}

if(
lenInput
){
lenInput.value =
String(
tpEmaLength
);
lenInput.addEventListener(
"change",
()=>{
tpEmaLength =
clampAlgoTpEmaLength(
lenInput.value
);
lenInput.value =
String(
tpEmaLength
);
persistAlgoSettings();
}
);
}

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

function shouldIgnoreAlgoHotkey(
event
){

if(
event.defaultPrevented
){
return true;
}

if(
event.metaKey ||
event.ctrlKey ||
event.altKey ||
event.shiftKey
){
return true;
}

const target =
event.target;
const tag =
target?.tagName?.toLowerCase?.();

if(
tag ===
"input" ||
tag ===
"textarea" ||
tag ===
"select" ||
target?.isContentEditable
){
return true;
}

return false;

}

function onAlgoTfHotkey(
event
){

if(
disposed ||
shouldIgnoreAlgoHotkey(
event
)
){
return;
}

const nextTf =
COINS_TF_HOTKEYS[
event.key
];

if(
!nextTf ||
!COINS_TF_VALUES.has(
nextTf
)
){
return;
}

event.preventDefault();
void loadSymbol(
symbol,
nextTf
);

}

function onAlgoDrawHotkey(
event
){

if(
disposed ||
shouldIgnoreAlgoHotkey(
event
)
){
return;
}

const tool =
ALGO_POSITION_DRAW_HOTKEYS.get(
event.code
);

if(
!tool ||
!drawingTools?.pickDrawTool
){
return;
}

event.preventDefault();
drawingTools.pickDrawTool(
tool
);

}

window.addEventListener(
"keydown",
onAlgoTfHotkey
);
window.addEventListener(
"keydown",
onAlgoDrawHotkey
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
window.removeEventListener(
"keydown",
onAlgoTfHotkey
);
window.removeEventListener(
"keydown",
onAlgoDrawHotkey
);
disposeStatsResize?.();
chartResizeObserver?.disconnect?.();
chartResizeObserver =
null;
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
trailSlX1St2,
trailSlX2St2,
trailSlSt3,
trailSlX1St3,
trailSlX2St3,
share1X,
share2X,
share3X,
share1Y,
share2Y,
share3Y,
timeoutBars,
maxPt1Pt4Bars,
/* TEMP_PULLBACK_BEFORE_ARM */
pullbackBeforeArm,
pullbackBeforeArmPct,
emaFilter,
emaPeriod,
emaShift,
emaTf,
emaFilter2:
false,
emaPeriod2,
emaShift2,
emaTf2,
tpEmaTrail,
tpEmaLength,
chartTf:
tf,
patternSettings:
readAlgoPattern12Settings()
}),
getStrategyStatsMode:(
id
)=>{
if(
id ===
"st2"
){
return statsModeSt2;
}

if(
id ===
"st3"
){
return statsModeSt3;
}

return statsMode;
},
getScanTf:()=>
scanTf,
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

if(
patch.scanTop100MinWinRate !=
null
){
scanTop100MinWinRate =
clampScanMinWinRate(
patch.scanTop100MinWinRate
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
trailSlX1St2,
trailSlX2St2,
trailSlSt3,
trailSlX1St3,
trailSlX2St3,
share1X,
share2X,
share3X,
share1Y,
share2Y,
share3Y,
timeoutBars,
maxPt1Pt4Bars,
/* TEMP_PULLBACK_BEFORE_ARM */
pullbackBeforeArm,
pullbackBeforeArmPct,
scanStrategy,
scanTf,
scanLongMinWinRate,
scanShortMinWinRate,
scanBothMinWinRate,
scanTop100MinWinRate,
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

mountSessionLogServerSettings(
document.getElementById(
"algo-session-log-server-mount"
)
);

botStrategyUi =
mountAlgoBotStrategyUi();

void (
async ()=>{

await loadSymbol(
symbol,
tf
);

if(
disposed
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
