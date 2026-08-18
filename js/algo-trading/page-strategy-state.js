/**
 * Память стратегии АлгоТрейдинг + patch/restore/DOM sync.
 * Split from js/algo-trading.js — поведение 1:1.
 */
import {
clampSlPctOfX,
clampTpRr,
DEFAULT_TP_RR,
DEFAULT_RISK_USD
} from "./pattern-entry-positions.js?v=16";

import {
clampPartialTpX,
clampTrailSlX1,
clampTrailSlX2,
normalizeTrailSlEnabled,
normalizeTpShares,
DEFAULT_PARTIAL_TP1_X,
DEFAULT_PARTIAL_TP2_X,
DEFAULT_PARTIAL_TP3_X
} from "./pattern-trade-stats-partial.js?v=22";

import {
clampEntryTimeoutBars,
clampMaxPt1Pt4Bars
} from "./pattern-entry-logic.js?v=14";

import {
clampPullbackBeforeArmPct,
normalizePullbackBeforeArmEnabled
} from "./temp-pullback-before-arm.js?v=4";

import {
normalizeAlgoSupertrendTf,
clampAlgoSupertrendAtr,
clampAlgoSupertrendFactor
} from "./pattern-supertrend-filter.js?v=5";

import {
normalizeAlgoStatsMode
} from "./pattern-trade-stats.js?v=15";

import {
ALGO_STRATEGY_IDS,
algoStrategyGateSuffix,
readAlgoStrategyGate,
flattenAlgoStrategyGates,
chartStrategyIdFromPositions,
readPrefs,
clampScanMinWinRate,
normalizeAlgoScanTfPref
} from "./page-prefs.js?v=2";

export function createAlgoStrategyMemory(){

const mem =
{};

mem.tpRr =
readPrefs().tpRr ||
DEFAULT_TP_RR;
mem.riskUsd =
readPrefs().riskUsd ||
DEFAULT_RISK_USD;
mem.tp1X =
readPrefs().tp1X ||
DEFAULT_PARTIAL_TP1_X;
mem.tp2X =
readPrefs().tp2X ||
DEFAULT_PARTIAL_TP2_X;
mem.tp3X =
readPrefs().tp3X ||
DEFAULT_PARTIAL_TP3_X;
mem.tp1Y =
readPrefs().tp1Y ||
DEFAULT_PARTIAL_TP1_X;
mem.tp2Y =
readPrefs().tp2Y ||
DEFAULT_PARTIAL_TP2_X;
mem.tp3Y =
readPrefs().tp3Y ||
DEFAULT_PARTIAL_TP3_X;
mem.trailSlSt2 =
normalizeTrailSlEnabled(
readPrefs().trailSlSt2
);
mem.trailSlX1St2 =
clampTrailSlX1(
readPrefs().trailSlX1St2
);
mem.trailSlX2St2 =
clampTrailSlX2(
readPrefs().trailSlX2St2,
mem.trailSlX1St2,
[
mem.tp1X,
mem.tp2X,
mem.tp3X
]
);
mem.trailSlSt3 =
normalizeTrailSlEnabled(
readPrefs().trailSlSt3
);
mem.trailSlX1St3 =
clampTrailSlX1(
readPrefs().trailSlX1St3
);
mem.trailSlX2St3 =
clampTrailSlX2(
readPrefs().trailSlX2St3,
mem.trailSlX1St3,
[
mem.tp1Y,
mem.tp2Y,
mem.tp3Y
]
);
const sharesX =
normalizeTpShares(
readPrefs().share1X,
readPrefs().share2X,
readPrefs().share3X
);
mem.share1X =
sharesX[
0
];
mem.share2X =
sharesX[
1
];
mem.share3X =
sharesX[
2
];
const sharesY =
normalizeTpShares(
readPrefs().share1Y,
readPrefs().share2Y,
readPrefs().share3Y
);
mem.share1Y =
sharesY[
0
];
mem.share2Y =
sharesY[
1
];
mem.share3Y =
sharesY[
2
];
mem.timeoutBars =
clampEntryTimeoutBars(
readPrefs().timeoutBars
);
mem.maxPt1Pt4Bars =
clampMaxPt1Pt4Bars(
readPrefs().maxPt1Pt4Bars
);
mem.strategyGates =
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
mem.supertrendLinesVisible =
readPrefs().supertrendLinesVisible !==
false;
mem.scanStrategy =
readPrefs().scanStrategy ||
"st1";
mem.scanTf =
normalizeAlgoScanTfPref(
readPrefs().scanTf
);
mem.scanLongMinWinRate =
clampScanMinWinRate(
readPrefs().scanLongMinWinRate
);
mem.scanShortMinWinRate =
clampScanMinWinRate(
readPrefs().scanShortMinWinRate
);
mem.scanBothMinWinRate =
clampScanMinWinRate(
readPrefs().scanBothMinWinRate
);
mem.scanTop100MinWinRate =
clampScanMinWinRate(
readPrefs().scanTop100MinWinRate
);
mem.statsMode =
normalizeAlgoStatsMode(
readPrefs().statsMode
);
mem.statsModeSt2 =
normalizeAlgoStatsMode(
readPrefs().statsModeSt2
);
mem.statsModeSt3 =
normalizeAlgoStatsMode(
readPrefs().statsModeSt3
);
mem.chartPositionsStrategy =
readPrefs().chartPositionsStrategy ===
"partial-tp" ||
readPrefs().chartPositionsStrategy ===
"partial-tp-y"
? readPrefs().chartPositionsStrategy
: "fixed-tp";

return mem;

}

export function buildAlgoPrefsSnapshot(
mem,
{
symbol,
tf
}
){

return {
symbol,
tf,
...flattenAlgoStrategyGates(
mem.strategyGates
),
tpRr:
mem.tpRr,
riskUsd:
mem.riskUsd,
tp1X:
mem.tp1X,
tp2X:
mem.tp2X,
tp3X:
mem.tp3X,
tp1Y:
mem.tp1Y,
tp2Y:
mem.tp2Y,
tp3Y:
mem.tp3Y,
trailSlSt2:
mem.trailSlSt2,
trailSlX1St2:
mem.trailSlX1St2,
trailSlX2St2:
mem.trailSlX2St2,
trailSlSt3:
mem.trailSlSt3,
trailSlX1St3:
mem.trailSlX1St3,
trailSlX2St3:
mem.trailSlX2St3,
share1X:
mem.share1X,
share2X:
mem.share2X,
share3X:
mem.share3X,
share1Y:
mem.share1Y,
share2Y:
mem.share2Y,
share3Y:
mem.share3Y,
timeoutBars:
mem.timeoutBars,
maxPt1Pt4Bars:
mem.maxPt1Pt4Bars,
supertrendLinesVisible:
mem.supertrendLinesVisible,
chartTf:
tf,
scanStrategy:
mem.scanStrategy,
scanTf:
mem.scanTf,
scanLongMinWinRate:
mem.scanLongMinWinRate,
scanShortMinWinRate:
mem.scanShortMinWinRate,
scanBothMinWinRate:
mem.scanBothMinWinRate,
scanTop100MinWinRate:
mem.scanTop100MinWinRate,
statsMode:
mem.statsMode,
statsModeSt2:
mem.statsModeSt2,
statsModeSt3:
mem.statsModeSt3,
chartPositionsStrategy:
mem.chartPositionsStrategy
};

}

export function algoGate(
mem,
id
){

return mem.strategyGates[
id ===
"st2" ||
id ===
"st3"
? id
: "st1"
];

}

export function chartStrategyId(
mem
){

return chartStrategyIdFromPositions(
mem.chartPositionsStrategy
);

}

export function chartGate(
mem
){

return algoGate(
mem,
chartStrategyId(
mem
)
);

}

export function buildTradeOpts(
mem,
strategyId,
extra
){
extra =
extra ||
{};

const g =
algoGate(
mem,
strategyId
);

return {
slPctOfX:
g.slPctOfX,
tpRr:
mem.tpRr,
riskUsd:
mem.riskUsd,
tp1X:
mem.tp1X,
tp2X:
mem.tp2X,
tp3X:
mem.tp3X,
tp1Y:
mem.tp1Y,
tp2Y:
mem.tp2Y,
tp3Y:
mem.tp3Y,
trailSlSt2:
mem.trailSlSt2,
trailSlX1St2:
mem.trailSlX1St2,
trailSlX2St2:
mem.trailSlX2St2,
trailSlSt3:
mem.trailSlSt3,
trailSlX1St3:
mem.trailSlX1St3,
trailSlX2St3:
mem.trailSlX2St3,
share1X:
mem.share1X,
share2X:
mem.share2X,
share3X:
mem.share3X,
share1Y:
mem.share1Y,
share2Y:
mem.share2Y,
share3Y:
mem.share3Y,
timeoutBars:
mem.timeoutBars,
maxPt1Pt4Bars:
mem.maxPt1Pt4Bars,
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
extra.chartTf,
patternSettings:
extra.patternSettings
};

}

export function strategyPrefKeys(
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

export function strategyPatchFromState(
mem,
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
mem,
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
mem.tpRr;
return patch;
}

if(
id ===
"st3"
){
patch.tp1Y =
mem.tp1Y;
patch.tp2Y =
mem.tp2Y;
patch.tp3Y =
mem.tp3Y;
patch.trailSlSt3 =
mem.trailSlSt3;
patch.trailSlX1St3 =
mem.trailSlX1St3;
patch.trailSlX2St3 =
mem.trailSlX2St3;
patch.share1Y =
mem.share1Y;
patch.share2Y =
mem.share2Y;
patch.share3Y =
mem.share3Y;
return patch;
}

patch.tp1X =
mem.tp1X;
patch.tp2X =
mem.tp2X;
patch.tp3X =
mem.tp3X;
patch.trailSlSt2 =
mem.trailSlSt2;
patch.trailSlX1St2 =
mem.trailSlX1St2;
patch.trailSlX2St2 =
mem.trailSlX2St2;
patch.share1X =
mem.share1X;
patch.share2X =
mem.share2X;
patch.share3X =
mem.share3X;
return patch;

}

export function setStrategyInputValue(
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

export function applyStrategyPatchToMemory(
mem,
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
mem,
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
mem.tpRr =
clampTpRr(
patch.tpRr
);
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
}

if(
patch.trailSlSt2 !=
null
){
mem.trailSlSt2 =
!!patch.trailSlSt2;
}

if(
patch.trailSlX1St2 !=
null
){
mem.trailSlX1St2 =
clampTrailSlX1(
patch.trailSlX1St2
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
}

if(
patch.trailSlSt3 !=
null
){
mem.trailSlSt3 =
!!patch.trailSlSt3;
}

if(
patch.trailSlX1St3 !=
null
){
mem.trailSlX1St3 =
clampTrailSlX1(
patch.trailSlX1St3
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
}

}

export function syncStrategyDomFromMemory(
mem
){

for(
const id of ALGO_STRATEGY_IDS
){
const g =
algoGate(
mem,
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
mem.tpRr
);
setStrategyInputValue(
"algo-tp1-x",
mem.tp1X
);
setStrategyInputValue(
"algo-tp2-x",
mem.tp2X
);
setStrategyInputValue(
"algo-tp3-x",
mem.tp3X
);
setStrategyInputValue(
"algo-trail-sl-st2",
mem.trailSlSt2
);
setStrategyInputValue(
"algo-trail-sl-x1-st2",
mem.trailSlX1St2
);
setStrategyInputValue(
"algo-trail-sl-x2-st2",
mem.trailSlX2St2
);
setStrategyInputValue(
"algo-share1-x",
mem.share1X
);
setStrategyInputValue(
"algo-share2-x",
mem.share2X
);
setStrategyInputValue(
"algo-share3-x",
mem.share3X
);
setStrategyInputValue(
"algo-tp1-y",
mem.tp1Y
);
setStrategyInputValue(
"algo-tp2-y",
mem.tp2Y
);
setStrategyInputValue(
"algo-tp3-y",
mem.tp3Y
);
setStrategyInputValue(
"algo-trail-sl-st3",
mem.trailSlSt3
);
setStrategyInputValue(
"algo-trail-sl-x1-st3",
mem.trailSlX1St3
);
setStrategyInputValue(
"algo-trail-sl-x2-st3",
mem.trailSlX2St3
);
setStrategyInputValue(
"algo-share1-y",
mem.share1Y
);
setStrategyInputValue(
"algo-share2-y",
mem.share2Y
);
setStrategyInputValue(
"algo-share3-y",
mem.share3Y
);

}

export function assignAlgoStrategyGate(
mem,
id,
next
){

const cur =
mem.strategyGates[
id
];

if(
cur &&
typeof cur ===
"object"
){
Object.assign(
cur,
next
);
return;
}

mem.strategyGates[
id
] =
next;

}

export function restoreStrategyMemoryFromPrefs(
mem
){

const prefs =
readPrefs();
assignAlgoStrategyGate(
mem,
"st1",
readAlgoStrategyGate(
prefs,
"st1"
)
);
assignAlgoStrategyGate(
mem,
"st2",
readAlgoStrategyGate(
prefs,
"st2"
)
);
assignAlgoStrategyGate(
mem,
"st3",
readAlgoStrategyGate(
prefs,
"st3"
)
);
mem.tpRr =
clampTpRr(
prefs.tpRr
);
mem.tp1X =
clampPartialTpX(
prefs.tp1X,
DEFAULT_PARTIAL_TP1_X
);
mem.tp2X =
clampPartialTpX(
prefs.tp2X,
DEFAULT_PARTIAL_TP2_X
);
mem.tp3X =
clampPartialTpX(
prefs.tp3X,
DEFAULT_PARTIAL_TP3_X
);
mem.tp1Y =
clampPartialTpX(
prefs.tp1Y,
DEFAULT_PARTIAL_TP1_X
);
mem.tp2Y =
clampPartialTpX(
prefs.tp2Y,
DEFAULT_PARTIAL_TP2_X
);
mem.tp3Y =
clampPartialTpX(
prefs.tp3Y,
DEFAULT_PARTIAL_TP3_X
);
mem.trailSlSt2 =
normalizeTrailSlEnabled(
prefs.trailSlSt2
);
mem.trailSlX1St2 =
clampTrailSlX1(
prefs.trailSlX1St2
);
mem.trailSlX2St2 =
clampTrailSlX2(
prefs.trailSlX2St2,
mem.trailSlX1St2,
[
mem.tp1X,
mem.tp2X,
mem.tp3X
]
);
mem.trailSlSt3 =
normalizeTrailSlEnabled(
prefs.trailSlSt3
);
mem.trailSlX1St3 =
clampTrailSlX1(
prefs.trailSlX1St3
);
mem.trailSlX2St3 =
clampTrailSlX2(
prefs.trailSlX2St3,
mem.trailSlX1St3,
[
mem.tp1Y,
mem.tp2Y,
mem.tp3Y
]
);
[
mem.share1X,
mem.share2X,
mem.share3X
] =
normalizeTpShares(
prefs.share1X,
prefs.share2X,
prefs.share3X
);
[
mem.share1Y,
mem.share2Y,
mem.share3Y
] =
normalizeTpShares(
prefs.share1Y,
prefs.share2Y,
prefs.share3Y
);

}
