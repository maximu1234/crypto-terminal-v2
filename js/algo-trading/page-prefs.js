/**
 * Prefs страницы АлгоТрейдинг (localStorage) + strategy gates.
 * Split from js/algo-trading.js — поведение 1:1.
 */
import {
clampSlPctOfX,
clampTpRr,
clampRiskUsd,
DEFAULT_SL_PCT_OF_X,
DEFAULT_TP_RR,
DEFAULT_RISK_USD
} from "./pattern-entry-positions.js?v=16";

import {
clampPartialTpX,
clampTrailSlX1,
clampTrailSlX2,
resolveTrailSlX1,
normalizeTrailSlEnabled,
normalizeTpShares,
DEFAULT_PARTIAL_TP1_X,
DEFAULT_PARTIAL_TP2_X,
DEFAULT_PARTIAL_TP3_X,
DEFAULT_TRAIL_SL_X1,
DEFAULT_TRAIL_SL_X2,
DEFAULT_TP_SHARES
} from "./pattern-trade-stats-partial.js?v=22";

import {
clampEntryTimeoutBars,
clampMaxPt1Pt4Bars,
resolveMaxPt1Pt4BarsFromPrefs,
ENTRY_TIMEOUT_BARS,
ENTRY_MAX_PT1_PT4_BARS
} from "./pattern-entry-logic.js?v=14";

import {
clampPullbackBeforeArmPct,
normalizePullbackBeforeArmEnabled,
DEFAULT_PULLBACK_BEFORE_ARM_PCT
} from "./temp-pullback-before-arm.js?v=4";

import {
normalizeAlgoSupertrendFilterEnabled,
normalizeAlgoSupertrendTf,
clampAlgoSupertrendAtr,
clampAlgoSupertrendFactor,
DEFAULT_ALGO_SUPERTREND_ATR,
DEFAULT_ALGO_SUPERTREND_FACTOR
} from "./pattern-supertrend-filter.js?v=5";

import {
normalizeAlgoStatsMode
} from "./pattern-trade-stats.js?v=15";

export const DEFAULT_SYMBOL =
"BTCUSDT";
export const DEFAULT_TF =
"60";
export const ALGO_PREFS_KEY =
"algo_trading_page_prefs_v1";

export function normalizeSymbol(
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

export function displaySymbol(
symbol
){

return `${normalizeSymbol(
symbol
)}.P`;

}

export const ALGO_STRATEGY_IDS =
[
"st1",
"st2",
"st3"
];

export function algoStrategyGateSuffix(
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

export function readAlgoStrategyGate(
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

export function flattenAlgoStrategyGates(
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

export function chartStrategyIdFromPositions(
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

export function readPrefs(){

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

export function writePrefs(
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

export function clampScanMinWinRate(
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

export const SCAN_TF_OPTIONS =
[
"1",
"5",
"15",
"60",
"240",
"D",
"W"
];

export function normalizeAlgoScanTfPref(
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

export function resolveInitialSymbol(){

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

