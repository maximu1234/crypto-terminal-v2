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
} from "./chart-import.js?v=48";

import {
terminalVisibleBars,
TERMINAL_VISIBLE_BARS
} from "./terminal-chart-history-prefs.js?v=1";

import {
ALGO_TICKER_SCAN_HISTORY_REQUESTS
} from "./algo-trading/ticker-scanner.js?v=10";

import {
calculateRSI,
alignRsiWithCandleTimes
} from "./indicators.js?v=3";

import {
defaultRsiPaneSettings,
normalizeRsiPaneSettings
} from "./indicators/rsi-pane.js?v=5";

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
} from "./algo-trading-list.js?v=15";

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
} from "./algo-trading/bot-strategy-ui.js?v=74";

import {
ALGO_ANALYSIS_BOT_CHANGE_EVENT,
ALGO_ANALYSIS_BOT_PATTERN_12,
getActiveAnalysisBotId,
isActiveAnalysisBot,
setActiveAnalysisBotId
} from "./algo-trading/active-analysis-bot.js?v=1";

import {
mountSessionLogServerSettings
} from "./algo-trading/bot-session-log-server-ui.js?v=10";

import {
syncBotStrategiesToMain
} from "./algo-trading/bot-bridge.js?v=17";

import {
mountAlgoTradeUi
} from "./algo-trading/trade/boot.js?v=4";

import {
mountAlgoTradingDrawings
} from "./algo-trading/drawings.js?v=2";

import {
mountAlgoTradingIndicators
} from "./algo-trading/indicators.js?v=12";

import {
mountAlgoPatternEntryOverlay
} from "./algo-trading/pattern-entry-overlay.js?v=16";

import {
clearAlgoPatternAnalysisUi,
refreshAlgoPatternAnalysis
} from "./algo-trading/pattern-analysis.js?v=37";

import {
invalidateAlgoPattern12SceneCache,
clearAlgoPattern12PaintEntryFilter
} from "./algo-trading/pattern-12-scene-cache.js?v=9";

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
} from "./algo-trading/pattern-trade-stats-partial.js?v=21";

import {
clampEntryTimeoutBars,
clampMaxPt1Pt4Bars,
resolveMaxPt1Pt4BarsFromPrefs,
ENTRY_TIMEOUT_BARS,
ENTRY_MAX_PT1_PT4_BARS
} from "./algo-trading/pattern-entry-logic.js?v=13";

/* TEMP_PULLBACK_BEFORE_ARM — remove with temp-pullback-before-arm.js */
import {
clampPullbackBeforeArmPct,
normalizePullbackBeforeArmEnabled,
DEFAULT_PULLBACK_BEFORE_ARM_PCT
} from "./algo-trading/temp-pullback-before-arm.js?v=4";

import {
normalizeAlgoSupertrendFilterEnabled,
normalizeAlgoSupertrendTf,
clampAlgoSupertrendAtr,
clampAlgoSupertrendFactor,
DEFAULT_ALGO_SUPERTREND_ATR,
DEFAULT_ALGO_SUPERTREND_FACTOR
} from "./algo-trading/pattern-supertrend-filter.js?v=4";

import {
createAlgoSupertrendFilterOverlay
} from "./algo-trading/supertrend-filter-overlay.js?v=2";

import {
normalizeAlgoStatsMode
} from "./algo-trading/pattern-trade-stats.js?v=14";

import {
readAlgoPattern12Settings
} from "./algo-trading/pattern-12-settings.js?v=3";

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
/** Алго: ~10 000 свечей (10×1000), как сканы и «Подобрать для всех». */
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

const ALGO_STRATEGY_IDS =
[
"st1",
"st2",
"st3"
];

function algoStrategyGateSuffix(
id
){

return id ===
"st2"
? "St2"
: id ===
"st3"
? "St3"
: "St1";

}

function defaultAlgoStrategyGate(){

return {
slPctOfX:
DEFAULT_SL_PCT_OF_X,
pullbackBeforeArm:
false,
pullbackBeforeArmPct:
DEFAULT_PULLBACK_BEFORE_ARM_PCT,
supertrendLongFilter:
false,
supertrendLongAtr:
DEFAULT_ALGO_SUPERTREND_ATR,
supertrendLongFactor:
DEFAULT_ALGO_SUPERTREND_FACTOR,
supertrendLongTf:
"",
supertrendShortFilter:
false,
supertrendShortAtr:
DEFAULT_ALGO_SUPERTREND_ATR,
supertrendShortFactor:
DEFAULT_ALGO_SUPERTREND_FACTOR,
supertrendShortTf:
""
};

}

function pickPrefKey(
raw,
key,
suffix
){

if(
raw &&
Object.prototype.hasOwnProperty.call(
raw,
key +
suffix
) &&
raw[
key +
suffix
] !=
null
){
return raw[
key +
suffix
];
}

if(
raw &&
Object.prototype.hasOwnProperty.call(
raw,
key
) &&
raw[
key
] !=
null
){
return raw[
key
];
}

return undefined;

}

function readAlgoStrategyGate(
raw,
id
){

const src =
raw &&
typeof raw ===
"object"
? raw
: {};
const suf =
algoStrategyGateSuffix(
id
);
const d =
defaultAlgoStrategyGate();

return {
slPctOfX:
clampSlPctOfX(
pickPrefKey(
src,
"slPctOfX",
suf
) ??
d.slPctOfX
),
pullbackBeforeArm:
normalizePullbackBeforeArmEnabled(
pickPrefKey(
src,
"pullbackBeforeArm",
suf
) ??
d.pullbackBeforeArm
),
pullbackBeforeArmPct:
clampPullbackBeforeArmPct(
pickPrefKey(
src,
"pullbackBeforeArmPct",
suf
) ??
d.pullbackBeforeArmPct
),
supertrendLongFilter:
normalizeAlgoSupertrendFilterEnabled(
pickPrefKey(
src,
"supertrendLongFilter",
suf
) ??
d.supertrendLongFilter
),
supertrendLongAtr:
clampAlgoSupertrendAtr(
pickPrefKey(
src,
"supertrendLongAtr",
suf
) ??
d.supertrendLongAtr
),
supertrendLongFactor:
clampAlgoSupertrendFactor(
pickPrefKey(
src,
"supertrendLongFactor",
suf
) ??
d.supertrendLongFactor
),
supertrendLongTf:
normalizeAlgoSupertrendTf(
pickPrefKey(
src,
"supertrendLongTf",
suf
) ??
d.supertrendLongTf
),
supertrendShortFilter:
normalizeAlgoSupertrendFilterEnabled(
pickPrefKey(
src,
"supertrendShortFilter",
suf
) ??
d.supertrendShortFilter
),
supertrendShortAtr:
clampAlgoSupertrendAtr(
pickPrefKey(
src,
"supertrendShortAtr",
suf
) ??
d.supertrendShortAtr
),
supertrendShortFactor:
clampAlgoSupertrendFactor(
pickPrefKey(
src,
"supertrendShortFactor",
suf
) ??
d.supertrendShortFactor
),
supertrendShortTf:
normalizeAlgoSupertrendTf(
pickPrefKey(
src,
"supertrendShortTf",
suf
) ??
d.supertrendShortTf
)
};

}

function flattenAlgoStrategyGates(
gates
){

const out =
{};

for(
const id of ALGO_STRATEGY_IDS
){
const suf =
algoStrategyGateSuffix(
id
);
const g =
gates?.[
id
] ||
defaultAlgoStrategyGate();
out[
"slPctOfX" +
suf
] =
g.slPctOfX;
out[
"pullbackBeforeArm" +
suf
] =
g.pullbackBeforeArm;
out[
"pullbackBeforeArmPct" +
suf
] =
g.pullbackBeforeArmPct;
out[
"supertrendLongFilter" +
suf
] =
g.supertrendLongFilter;
out[
"supertrendLongAtr" +
suf
] =
g.supertrendLongAtr;
out[
"supertrendLongFactor" +
suf
] =
g.supertrendLongFactor;
out[
"supertrendLongTf" +
suf
] =
g.supertrendLongTf;
out[
"supertrendShortFilter" +
suf
] =
g.supertrendShortFilter;
out[
"supertrendShortAtr" +
suf
] =
g.supertrendShortAtr;
out[
"supertrendShortFactor" +
suf
] =
g.supertrendShortFactor;
out[
"supertrendShortTf" +
suf
] =
g.supertrendShortTf;
}

const st1 =
gates?.st1 ||
defaultAlgoStrategyGate();
out.slPctOfX =
st1.slPctOfX;
out.pullbackBeforeArm =
st1.pullbackBeforeArm;
out.pullbackBeforeArmPct =
st1.pullbackBeforeArmPct;
out.supertrendLongFilter =
st1.supertrendLongFilter;
out.supertrendLongAtr =
st1.supertrendLongAtr;
out.supertrendLongFactor =
st1.supertrendLongFactor;
out.supertrendLongTf =
st1.supertrendLongTf;
out.supertrendShortFilter =
st1.supertrendShortFilter;
out.supertrendShortAtr =
st1.supertrendShortAtr;
out.supertrendShortFactor =
st1.supertrendShortFactor;
out.supertrendShortTf =
st1.supertrendShortTf;
return out;

}

function chartStrategyIdFromPositions(
strategy
){

if(
strategy ===
"partial-tp"
){
return "st2";
}

if(
strategy ===
"partial-tp-y"
){
return "st3";
}

return "st1";

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
supertrendLongFilter:
normalizeAlgoSupertrendFilterEnabled(
raw.supertrendLongFilter
),
supertrendLongAtr:
clampAlgoSupertrendAtr(
raw.supertrendLongAtr
),
supertrendLongFactor:
clampAlgoSupertrendFactor(
raw.supertrendLongFactor
),
supertrendLongTf:
normalizeAlgoSupertrendTf(
raw.supertrendLongTf
),
supertrendShortFilter:
normalizeAlgoSupertrendFilterEnabled(
raw.supertrendShortFilter
),
supertrendShortAtr:
clampAlgoSupertrendAtr(
raw.supertrendShortAtr
),
supertrendShortFactor:
clampAlgoSupertrendFactor(
raw.supertrendShortFactor
),
supertrendShortTf:
normalizeAlgoSupertrendTf(
raw.supertrendShortTf
),
supertrendLinesVisible:
raw.supertrendLinesVisible !==
false,
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
: "fixed-tp",
...flattenAlgoStrategyGates(
{
st1:
readAlgoStrategyGate(
raw,
"st1"
),
st2:
readAlgoStrategyGate(
raw,
"st2"
),
st3:
readAlgoStrategyGate(
raw,
"st3"
)
}
)
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
supertrendLongFilter:
false,
supertrendLongAtr:
DEFAULT_ALGO_SUPERTREND_ATR,
supertrendLongFactor:
DEFAULT_ALGO_SUPERTREND_FACTOR,
supertrendLongTf:
"",
supertrendShortFilter:
false,
supertrendShortAtr:
DEFAULT_ALGO_SUPERTREND_ATR,
supertrendShortFactor:
DEFAULT_ALGO_SUPERTREND_FACTOR,
supertrendShortTf:
"",
supertrendLinesVisible:
true,
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
...flattenAlgoStrategyGates(
{
st1:
readAlgoStrategyGate(
prefs,
"st1"
),
st2:
readAlgoStrategyGate(
prefs,
"st2"
),
st3:
readAlgoStrategyGate(
prefs,
"st3"
)
}
),
supertrendLinesVisible:
prefs.supertrendLinesVisible !==
false,
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

setActiveAnalysisBotId(
getActiveAnalysisBotId(),
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

function syncRsiHudPeriod(){

if(
rsiHudPeriodEl
){
rsiHudPeriodEl.textContent =
String(
rsiPaneSettings.period
);
}

}

function syncRsiLevelDom(){

if(
!rsiWrapEl
){
return;
}

const ob =
rsiWrapEl.querySelector(
'[data-rsi-role="ob"]'
);
const os =
rsiWrapEl.querySelector(
'[data-rsi-role="os"]'
);

if(
ob
){
ob.setAttribute(
"data-rsi-level",
String(
rsiPaneSettings.overbought
)
);
}

if(
os
){
os.setAttribute(
"data-rsi-level",
String(
rsiPaneSettings.oversold
)
);
}

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
let strategyGates =
{
st1:
readAlgoStrategyGate(
readPrefs(),
"st1"
),
st2:
readAlgoStrategyGate(
readPrefs(),
"st2"
),
st3:
readAlgoStrategyGate(
readPrefs(),
"st3"
)
};
/* Только видимость линий на графике — сам фильтр входов не отключает. */
let supertrendLinesVisible =
readPrefs().supertrendLinesVisible !==
false;
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

function algoGate(
id
){

return strategyGates[
id ===
"st2" ||
id ===
"st3"
? id
: "st1"
];

}

function chartStrategyId(){

return chartStrategyIdFromPositions(
chartPositionsStrategy
);

}

function chartGate(){

return algoGate(
chartStrategyId()
);

}

function buildTradeOpts(
strategyId
){

const g =
algoGate(
strategyId
);

return {
slPctOfX:
g.slPctOfX,
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
pullbackBeforeArm:
g.pullbackBeforeArm,
pullbackBeforeArmPct:
g.pullbackBeforeArmPct,
supertrendLongFilter:
g.supertrendLongFilter,
supertrendLongAtr:
g.supertrendLongAtr,
supertrendLongFactor:
g.supertrendLongFactor,
supertrendLongTf:
g.supertrendLongTf,
supertrendShortFilter:
g.supertrendShortFilter,
supertrendShortAtr:
g.supertrendShortAtr,
supertrendShortFactor:
g.supertrendShortFactor,
supertrendShortTf:
g.supertrendShortTf,
chartTf:
tf,
patternSettings:
readAlgoPattern12Settings()
};

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
let listApi =
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
 * Сейчас: pattern-12. Новый бот — свой блок data-algo-analysis-bot + оверлей.
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
chartIndicators?.setIndicatorEnabled &&
!isAlgoBotLiteMode()
){
chartIndicators.setIndicatorEnabled(
"pattern-12",
pattern12
);
}

if(
!pattern12
){
entryOverlay?.setEvents?.(
[]
);
entryOverlay?.refreshPositions?.();
return;
}

if(
historyStatsReady &&
!disposed
){
algoPattern12EnabledOnce =
false;
ensureAlgoPattern12Enabled();
schedulePatternAnalysis(
{
force:
true
}
);
}

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
),
{
overbought:
rsiPaneSettings.overbought,
oversold:
rsiPaneSettings.oversold
}
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
!candles.length
){
return null;
}

const points =
alignRsiWithCandleTimes(
candles,
calculateRSI(
candles,
rsiPaneSettings.period
),
rsiPaneSettings.period
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

function applyRsiData(
{
notifyIndicators =
true
} =
{}
){

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

const points =
alignRsiWithCandleTimes(
candles,
calculateRSI(
candles,
rsiPaneSettings.period
),
rsiPaneSettings.period
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

if(
notifyIndicators
){
chartIndicators?.notifyCandlesUpdate?.();
}

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

drawingTools?.scheduleRedraw?.();

}

function buildPatternAnalysisOpts(){

return {
...buildTradeOpts(
"st1"
),
gates:{
st1:{
...strategyGates.st1
},
st2:{
...strategyGates.st2
},
st3:{
...strategyGates.st3
}
},
statsMode,
statsModeSt2,
statsModeSt3,
chartPositionsStrategy,
symbol
};

}

function applyLiveCandleTick(){

if(
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
hydrateTickerStrategyUi();
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
linkPairedChartTimeScales(
chart,
rsiChart,
layoutRsi,
{
/* RSI setData не должен двигать main — иначе cold-open/deepen мигает viewport. */
linkedDrivesMain:
false
}
);

if(
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
supertrendLinesVisible
}
);
supertrendFilterOverlay.bind();

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
null;

if(
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
getTpRr:()=>
tpRr,
getRiskUsd:()=>
riskUsd,
getTimeoutBars:()=>
timeoutBars,
getMaxPt1Pt4Bars:()=>
maxPt1Pt4Bars,
getPullbackBeforeArm:()=>
chartGate().pullbackBeforeArm,
getPullbackBeforeArmPct:()=>
chartGate().pullbackBeforeArmPct,
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
}

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



function bindStrategyGateUi(
id
){

const g =
algoGate(
id
);
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
g.slPctOfX
){
return;
}
g.slPctOfX =
next;
persistAlgoSettings();
};
slEl.addEventListener(
"change",
commit
);
slEl.addEventListener(
"keydown",
event=>{
if(
event.key ===
"Enter"
){
event.preventDefault();
slEl.blur();
}
}
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
g.pullbackBeforeArmPct
){
return;
}
g.pullbackBeforeArmPct =
next;
persistAlgoSettings();
};
pbPctEl.addEventListener(
"change",
commit
);
pbPctEl.addEventListener(
"keydown",
event=>{
if(
event.key ===
"Enter"
){
event.preventDefault();
pbPctEl.blur();
}
}
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
g.pullbackBeforeArm =
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
g[
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
const next =
clampAlgoSupertrendAtr(
atrEl.value
);
atrEl.value =
String(
next
);
g[
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
const next =
clampAlgoSupertrendFactor(
factorEl.value
);
factorEl.value =
String(
next
);
g[
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
const next =
normalizeAlgoSupertrendTf(
tfEl.value
);
tfEl.value =
next;
g[
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

const suf =
algoStrategyGateSuffix(
id
);
const keys =
[
"slPctOfX",
"pullbackBeforeArm",
"pullbackBeforeArmPct",
"supertrendLongFilter",
"supertrendLongAtr",
"supertrendLongFactor",
"supertrendLongTf",
"supertrendShortFilter",
"supertrendShortAtr",
"supertrendShortFactor",
"supertrendShortTf"
].map(
key=>
key +
suf
);

if(
id ===
"st1"
){
keys.push(
"tpRr"
);
}

if(
id ===
"st2"
){
keys.push(
"tp1X",
"tp2X",
"tp3X",
"trailSlSt2",
"trailSlX1St2",
"trailSlX2St2",
"share1X",
"share2X",
"share3X"
);
}

if(
id ===
"st3"
){
keys.push(
"tp1Y",
"tp2Y",
"tp3Y",
"trailSlSt3",
"trailSlX1St3",
"trailSlX2St3",
"share1Y",
"share2Y",
"share3Y"
);
}

return keys;

}

function strategyPatchFromState(
strategyId
){

const id =
strategyId ===
"st2" ||
strategyId ===
"st3"
? strategyId
: "st1";
const g =
algoGate(
id
);
const patch =
{
slPctOfX:
g.slPctOfX,
pullbackBeforeArm:
g.pullbackBeforeArm,
pullbackBeforeArmPct:
g.pullbackBeforeArmPct,
supertrendLongFilter:
g.supertrendLongFilter,
supertrendLongAtr:
g.supertrendLongAtr,
supertrendLongFactor:
g.supertrendLongFactor,
supertrendLongTf:
g.supertrendLongTf,
supertrendShortFilter:
g.supertrendShortFilter,
supertrendShortAtr:
g.supertrendShortAtr,
supertrendShortFactor:
g.supertrendShortFactor,
supertrendShortTf:
g.supertrendShortTf
};

if(
id ===
"st1"
){
patch.tpRr =
tpRr;
return patch;
}

if(
id ===
"st3"
){
patch.tp1Y =
tp1Y;
patch.tp2Y =
tp2Y;
patch.tp3Y =
tp3Y;
patch.trailSlSt3 =
trailSlSt3;
patch.trailSlX1St3 =
trailSlX1St3;
patch.trailSlX2St3 =
trailSlX2St3;
patch.share1Y =
share1Y;
patch.share2Y =
share2Y;
patch.share3Y =
share3Y;
return patch;
}

patch.tp1X =
tp1X;
patch.tp2X =
tp2X;
patch.tp3X =
tp3X;
patch.trailSlSt2 =
trailSlSt2;
patch.trailSlX1St2 =
trailSlX1St2;
patch.trailSlX2St2 =
trailSlX2St2;
patch.share1X =
share1X;
patch.share2X =
share2X;
patch.share3X =
share3X;
return patch;

}

function setStrategyInputValue(
id,
value
){

const el =
document.getElementById(
id
);

if(
!el
){
return;
}

if(
el.type ===
"checkbox"
){
el.checked =
!!value;
return;
}

el.value =
String(
value
);

}

function applyStrategyPatchToMemory(
strategyId,
patch
){

if(
!patch ||
typeof patch !==
"object"
){
return;
}

const id =
strategyId ===
"st2" ||
strategyId ===
"st3"
? strategyId
: "st1";
const g =
algoGate(
id
);

if(
patch.slPctOfX !=
null
){
g.slPctOfX =
clampSlPctOfX(
patch.slPctOfX
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
}

if(
patch.pullbackBeforeArmPct !=
null
){
g.pullbackBeforeArmPct =
clampPullbackBeforeArmPct(
patch.pullbackBeforeArmPct
);
}

if(
patch.supertrendLongFilter !=
null
){
g.supertrendLongFilter =
!!patch.supertrendLongFilter;
}

if(
patch.supertrendLongAtr !=
null
){
g.supertrendLongAtr =
clampAlgoSupertrendAtr(
patch.supertrendLongAtr
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
}

if(
patch.supertrendLongTf !=
null
){
g.supertrendLongTf =
normalizeAlgoSupertrendTf(
patch.supertrendLongTf
);
}

if(
patch.supertrendShortFilter !=
null
){
g.supertrendShortFilter =
!!patch.supertrendShortFilter;
}

if(
patch.supertrendShortAtr !=
null
){
g.supertrendShortAtr =
clampAlgoSupertrendAtr(
patch.supertrendShortAtr
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
}

if(
patch.supertrendShortTf !=
null
){
g.supertrendShortTf =
normalizeAlgoSupertrendTf(
patch.supertrendShortTf
);
}

if(
patch.tpRr !=
null
){
tpRr =
clampTpRr(
patch.tpRr
);
}

if(
patch.tp1X !=
null
){
tp1X =
clampPartialTpX(
patch.tp1X,
DEFAULT_PARTIAL_TP1_X
);
}

if(
patch.tp2X !=
null
){
tp2X =
clampPartialTpX(
patch.tp2X,
DEFAULT_PARTIAL_TP2_X
);
}

if(
patch.tp3X !=
null
){
tp3X =
clampPartialTpX(
patch.tp3X,
DEFAULT_PARTIAL_TP3_X
);
}

if(
patch.trailSlSt2 !=
null
){
trailSlSt2 =
!!patch.trailSlSt2;
}

if(
patch.trailSlX1St2 !=
null
){
trailSlX1St2 =
clampTrailSlX1(
patch.trailSlX1St2
);
}

if(
patch.trailSlX2St2 !=
null
){
trailSlX2St2 =
clampTrailSlX2(
patch.trailSlX2St2,
trailSlX1St2,
[
tp1X,
tp2X,
tp3X
]
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
share1X,
share2X,
share3X
] =
normalizeTpShares(
patch.share1X ??
share1X,
patch.share2X ??
share2X,
patch.share3X ??
share3X
);
}

if(
patch.tp1Y !=
null
){
tp1Y =
clampPartialTpX(
patch.tp1Y,
DEFAULT_PARTIAL_TP1_X
);
}

if(
patch.tp2Y !=
null
){
tp2Y =
clampPartialTpX(
patch.tp2Y,
DEFAULT_PARTIAL_TP2_X
);
}

if(
patch.tp3Y !=
null
){
tp3Y =
clampPartialTpX(
patch.tp3Y,
DEFAULT_PARTIAL_TP3_X
);
}

if(
patch.trailSlSt3 !=
null
){
trailSlSt3 =
!!patch.trailSlSt3;
}

if(
patch.trailSlX1St3 !=
null
){
trailSlX1St3 =
clampTrailSlX1(
patch.trailSlX1St3
);
}

if(
patch.trailSlX2St3 !=
null
){
trailSlX2St3 =
clampTrailSlX2(
patch.trailSlX2St3,
trailSlX1St3,
[
tp1Y,
tp2Y,
tp3Y
]
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
share1Y,
share2Y,
share3Y
] =
normalizeTpShares(
patch.share1Y ??
share1Y,
patch.share2Y ??
share2Y,
patch.share3Y ??
share3Y
);
}

}

function syncStrategyDomFromMemory(){

for(
const id of ALGO_STRATEGY_IDS
){
const g =
algoGate(
id
);
setStrategyInputValue(
`algo-sl-pct-of-x-${id}`,
g.slPctOfX
);
setStrategyInputValue(
`algo-pullback-before-arm-${id}`,
g.pullbackBeforeArm
);
setStrategyInputValue(
`algo-pullback-before-arm-pct-${id}`,
g.pullbackBeforeArmPct
);
setStrategyInputValue(
`algo-st-${id}-long-filter`,
g.supertrendLongFilter
);
setStrategyInputValue(
`algo-st-${id}-long-atr`,
g.supertrendLongAtr
);
setStrategyInputValue(
`algo-st-${id}-long-factor`,
g.supertrendLongFactor
);
setStrategyInputValue(
`algo-st-${id}-long-tf`,
g.supertrendLongTf
);
setStrategyInputValue(
`algo-st-${id}-short-filter`,
g.supertrendShortFilter
);
setStrategyInputValue(
`algo-st-${id}-short-atr`,
g.supertrendShortAtr
);
setStrategyInputValue(
`algo-st-${id}-short-factor`,
g.supertrendShortFactor
);
setStrategyInputValue(
`algo-st-${id}-short-tf`,
g.supertrendShortTf
);
}

setStrategyInputValue(
"algo-tp-rr",
tpRr
);
setStrategyInputValue(
"algo-tp1-x",
tp1X
);
setStrategyInputValue(
"algo-tp2-x",
tp2X
);
setStrategyInputValue(
"algo-tp3-x",
tp3X
);
setStrategyInputValue(
"algo-trail-sl-st2",
trailSlSt2
);
setStrategyInputValue(
"algo-trail-sl-x1-st2",
trailSlX1St2
);
setStrategyInputValue(
"algo-trail-sl-x2-st2",
trailSlX2St2
);
setStrategyInputValue(
"algo-share1-x",
share1X
);
setStrategyInputValue(
"algo-share2-x",
share2X
);
setStrategyInputValue(
"algo-share3-x",
share3X
);
setStrategyInputValue(
"algo-tp1-y",
tp1Y
);
setStrategyInputValue(
"algo-tp2-y",
tp2Y
);
setStrategyInputValue(
"algo-tp3-y",
tp3Y
);
setStrategyInputValue(
"algo-trail-sl-st3",
trailSlSt3
);
setStrategyInputValue(
"algo-trail-sl-x1-st3",
trailSlX1St3
);
setStrategyInputValue(
"algo-trail-sl-x2-st3",
trailSlX2St3
);
setStrategyInputValue(
"algo-share1-y",
share1Y
);
setStrategyInputValue(
"algo-share2-y",
share2Y
);
setStrategyInputValue(
"algo-share3-y",
share3Y
);

}

function restoreStrategyMemoryFromPrefs(){

const prefs =
readPrefs();
strategyGates =
{
st1:
readAlgoStrategyGate(
prefs,
"st1"
),
st2:
readAlgoStrategyGate(
prefs,
"st2"
),
st3:
readAlgoStrategyGate(
prefs,
"st3"
)
};
tpRr =
clampTpRr(
prefs.tpRr
);
tp1X =
clampPartialTpX(
prefs.tp1X,
DEFAULT_PARTIAL_TP1_X
);
tp2X =
clampPartialTpX(
prefs.tp2X,
DEFAULT_PARTIAL_TP2_X
);
tp3X =
clampPartialTpX(
prefs.tp3X,
DEFAULT_PARTIAL_TP3_X
);
tp1Y =
clampPartialTpX(
prefs.tp1Y,
DEFAULT_PARTIAL_TP1_X
);
tp2Y =
clampPartialTpX(
prefs.tp2Y,
DEFAULT_PARTIAL_TP2_X
);
tp3Y =
clampPartialTpX(
prefs.tp3Y,
DEFAULT_PARTIAL_TP3_X
);
trailSlSt2 =
normalizeTrailSlEnabled(
prefs.trailSlSt2
);
trailSlX1St2 =
clampTrailSlX1(
prefs.trailSlX1St2
);
trailSlX2St2 =
clampTrailSlX2(
prefs.trailSlX2St2,
trailSlX1St2,
[
tp1X,
tp2X,
tp3X
]
);
trailSlSt3 =
normalizeTrailSlEnabled(
prefs.trailSlSt3
);
trailSlX1St3 =
clampTrailSlX1(
prefs.trailSlX1St3
);
trailSlX2St3 =
clampTrailSlX2(
prefs.trailSlX2St3,
trailSlX1St3,
[
tp1Y,
tp2Y,
tp3Y
]
);
[
share1X,
share2X,
share3X
] =
normalizeTpShares(
prefs.share1X,
prefs.share2X,
prefs.share3X
);
[
share1Y,
share2Y,
share3Y
] =
normalizeTpShares(
prefs.share1Y,
prefs.share2Y,
prefs.share3Y
);

}

function hydrateTickerStrategyUi(){

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
refreshEntryFilterLines();

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
{
symbol,
tf,
...flattenAlgoStrategyGates(
strategyGates
),
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
supertrendLinesVisible,
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
};

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
supertrendLinesVisible;
el.addEventListener(
"change",
()=>{
supertrendLinesVisible =
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
tpRr =
clampTpRr(
patch.tpRr
);
setNum(
"algo-tp-rr",
tpRr
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
tp1X =
clampPartialTpX(
patch.tp1X,
DEFAULT_PARTIAL_TP1_X
);
setNum(
"algo-tp1-x",
tp1X
);
}

if(
patch.tp2X !=
null
){
tp2X =
clampPartialTpX(
patch.tp2X,
DEFAULT_PARTIAL_TP2_X
);
setNum(
"algo-tp2-x",
tp2X
);
}

if(
patch.tp3X !=
null
){
tp3X =
clampPartialTpX(
patch.tp3X,
DEFAULT_PARTIAL_TP3_X
);
setNum(
"algo-tp3-x",
tp3X
);
}

if(
patch.trailSlSt2 !=
null
){
trailSlSt2 =
!!patch.trailSlSt2;
setCheck(
"algo-trail-sl-st2",
trailSlSt2
);
}

if(
patch.trailSlX1St2 !=
null
){
trailSlX1St2 =
clampTrailSlX1(
patch.trailSlX1St2
);
setNum(
"algo-trail-sl-x1-st2",
trailSlX1St2
);
}

if(
patch.trailSlX2St2 !=
null
){
trailSlX2St2 =
clampTrailSlX2(
patch.trailSlX2St2,
trailSlX1St2,
[
tp1X,
tp2X,
tp3X
]
);
setNum(
"algo-trail-sl-x2-st2",
trailSlX2St2
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
share1X,
share2X,
share3X
] =
normalizeTpShares(
patch.share1X ??
share1X,
patch.share2X ??
share2X,
patch.share3X ??
share3X
);
setNum(
"algo-share1-x",
share1X
);
setNum(
"algo-share2-x",
share2X
);
setNum(
"algo-share3-x",
share3X
);
}

if(
patch.tp1Y !=
null
){
tp1Y =
clampPartialTpX(
patch.tp1Y,
DEFAULT_PARTIAL_TP1_X
);
setNum(
"algo-tp1-y",
tp1Y
);
}

if(
patch.tp2Y !=
null
){
tp2Y =
clampPartialTpX(
patch.tp2Y,
DEFAULT_PARTIAL_TP2_X
);
setNum(
"algo-tp2-y",
tp2Y
);
}

if(
patch.tp3Y !=
null
){
tp3Y =
clampPartialTpX(
patch.tp3Y,
DEFAULT_PARTIAL_TP3_X
);
setNum(
"algo-tp3-y",
tp3Y
);
}

if(
patch.trailSlSt3 !=
null
){
trailSlSt3 =
!!patch.trailSlSt3;
setCheck(
"algo-trail-sl-st3",
trailSlSt3
);
}

if(
patch.trailSlX1St3 !=
null
){
trailSlX1St3 =
clampTrailSlX1(
patch.trailSlX1St3
);
setNum(
"algo-trail-sl-x1-st3",
trailSlX1St3
);
}

if(
patch.trailSlX2St3 !=
null
){
trailSlX2St3 =
clampTrailSlX2(
patch.trailSlX2St3,
trailSlX1St3,
[
tp1Y,
tp2Y,
tp3Y
]
);
setNum(
"algo-trail-sl-x2-st3",
trailSlX2St3
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
share1Y,
share2Y,
share3Y
] =
normalizeTpShares(
patch.share1Y ??
share1Y,
patch.share2Y ??
share2Y,
patch.share3Y ??
share3Y
);
setNum(
"algo-share1-y",
share1Y
);
setNum(
"algo-share2-y",
share2Y
);
setNum(
"algo-share3-y",
share3Y
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
setSymbolLabel(
next
);
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
