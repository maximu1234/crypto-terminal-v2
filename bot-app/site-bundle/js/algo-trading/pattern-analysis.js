/**
 * Один проход pattern-12 math → счётчики + события входа + статистика сделок.
 */
import {
computePattern12Scene,
defaultPattern12Settings
} from "./pattern-12-math.js?v=5";

import {
detectPatternEntryEventsFromSetups
} from "./pattern-entry-logic.js?v=5";

import {
countPattern12SetupsFromScene,
renderAlgoPatternCounts
} from "./pattern-stats.js?v=3";

import {
computeAlgoTradeStats,
renderAlgoTradeStats,
filterSequentialEntryEvents,
normalizeAlgoStatsMode
} from "./pattern-trade-stats.js?v=10";

import {
computePartialTpTradeStats,
filterSequentialPartialEntryEvents
} from "./pattern-trade-stats-partial.js?v=17";

/**
 * @param {Array} candles
 * @param {object} [opts]
 */
export function analyzeAlgoPatterns(
candles,
opts =
{}
){

if(
!Array.isArray(
candles
) ||
candles.length <
3
){
return emptyAnalysis(
opts
);
}

const scene =
computePattern12Scene(
candles,
opts.patternSettings ||
defaultPattern12Settings()
);
const events =
detectPatternEntryEventsFromSetups(
candles,
scene?.setups,
{
timeoutBars:
opts.timeoutBars
}
);

return {
counts:
countPattern12SetupsFromScene(
scene
),
events,
tradeStats:
computeAlgoTradeStats(
candles,
events,
{
...opts,
statsMode:
opts.statsMode
}
),
partialStats:
computePartialTpTradeStats(
candles,
events,
{
...opts,
span:
"x",
trailSl:
opts.trailSlSt2,
trailSlX1:
opts.trailSlX1St2,
trailSlX2:
opts.trailSlX2St2,
share1:
opts.share1X,
share2:
opts.share2X,
share3:
opts.share3X,
statsMode:
opts.statsModeSt2 ??
opts.statsMode
}
),
partialYStats:
computePartialTpTradeStats(
candles,
events,
{
...opts,
span:
"y",
trailSl:
opts.trailSlSt3,
trailSlX1:
opts.trailSlX1St3,
trailSlX2:
opts.trailSlX2St3,
share1:
opts.share1Y,
share2:
opts.share2Y,
share3:
opts.share3Y,
statsMode:
opts.statsModeSt3 ??
opts.statsMode
}
)
};

}

function emptyAnalysis(
opts
){

return {
counts:{
long:
0,
short:
0,
total:
0
},
events:
[],
tradeStats:
computeAlgoTradeStats(
[],
[],
opts
),
partialStats:
computePartialTpTradeStats(
[],
[],
{
...opts,
span:
"x",
trailSl:
opts.trailSlSt2,
trailSlX1:
opts.trailSlX1St2,
trailSlX2:
opts.trailSlX2St2,
share1:
opts.share1X,
share2:
opts.share2X,
share3:
opts.share3X,
statsMode:
opts.statsModeSt2 ??
opts.statsMode
}
),
partialYStats:
computePartialTpTradeStats(
[],
[],
{
...opts,
span:
"y",
trailSl:
opts.trailSlSt3,
trailSlX1:
opts.trailSlX1St3,
trailSlX2:
opts.trailSlX2St3,
share1:
opts.share1Y,
share2:
opts.share2Y,
share3:
opts.share3Y,
statsMode:
opts.statsModeSt3 ??
opts.statsMode
}
)
};

}

/**
 * @param {Array} candles
 * @param {{ setEvents?: (events: Array) => void }|null} entryOverlay
 * @param {object} [opts]
 */
export function refreshAlgoPatternAnalysis(
candles,
entryOverlay,
opts =
{}
){

try{
const {
counts,
events,
tradeStats,
partialStats,
partialYStats
} =
analyzeAlgoPatterns(
candles,
opts
);

try{
renderAlgoPatternCounts(
counts
);
}catch(
err
){
console.warn(
"[algo-trading] pattern counts render:",
err
);
}

try{
renderAlgoTradeStats(
tradeStats,
document.querySelector(
'[data-algo-strategy="fixed-tp"]'
) ||
document
);
renderAlgoTradeStats(
partialStats,
document.querySelector(
'[data-algo-strategy="partial-tp"]'
) ||
document
);
renderAlgoTradeStats(
partialYStats,
document.querySelector(
'[data-algo-strategy="partial-tp-y"]'
) ||
document
);
}catch(
err
){
console.warn(
"[algo-trading] trade stats render:",
err
);
}

try{
const chartStrategy =
opts.chartPositionsStrategy ===
"partial-tp" ||
opts.chartPositionsStrategy ===
"partial-tp-y"
? opts.chartPositionsStrategy
: "fixed-tp";
const chartStatsMode =
normalizeAlgoStatsMode(
chartStrategy ===
"fixed-tp"
? opts.statsMode
: chartStrategy ===
"partial-tp"
? opts.statsModeSt2
: opts.statsModeSt3
);
let overlayEvents =
events;

if(
chartStatsMode ===
"real"
){
overlayEvents =
chartStrategy ===
"fixed-tp"
? filterSequentialEntryEvents(
candles,
events,
opts
)
: filterSequentialPartialEntryEvents(
candles,
events,
{
...opts,
span:
chartStrategy ===
"partial-tp-y"
? "y"
: "x",
trailSl:
chartStrategy ===
"partial-tp-y"
? opts.trailSlSt3
: opts.trailSlSt2,
trailSlX1:
chartStrategy ===
"partial-tp-y"
? opts.trailSlX1St3
: opts.trailSlX1St2,
trailSlX2:
chartStrategy ===
"partial-tp-y"
? opts.trailSlX2St3
: opts.trailSlX2St2,
share1:
chartStrategy ===
"partial-tp-y"
? opts.share1Y
: opts.share1X,
share2:
chartStrategy ===
"partial-tp-y"
? opts.share2Y
: opts.share2X,
share3:
chartStrategy ===
"partial-tp-y"
? opts.share3Y
: opts.share3X
}
);
}

entryOverlay?.setEvents?.(
overlayEvents
);
}catch(
err
){
console.warn(
"[algo-trading] entry overlay:",
err
);
}
}catch(
err
){
console.warn(
"[algo-trading] pattern analysis:",
err
);
renderAlgoPatternCounts(
null
);
renderAlgoTradeStats(
null,
document.querySelector(
'[data-algo-strategy="fixed-tp"]'
) ||
document
);
renderAlgoTradeStats(
null,
document.querySelector(
'[data-algo-strategy="partial-tp"]'
) ||
document
);
renderAlgoTradeStats(
null,
document.querySelector(
'[data-algo-strategy="partial-tp-y"]'
) ||
document
);
entryOverlay?.setEvents?.(
[]
);
}

}
