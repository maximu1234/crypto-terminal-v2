/**
 * Один проход pattern-12 math → счётчики + события входа + статистика сделок.
 */
import {
computePattern12Scene,
defaultPattern12Settings
} from "./pattern-12-math.js?v=3";

import {
detectPatternEntryEventsFromSetups
} from "./pattern-entry-logic.js?v=4";

import {
countPattern12SetupsFromScene,
renderAlgoPatternCounts
} from "./pattern-stats.js?v=3";

import {
computeAlgoTradeStats,
renderAlgoTradeStats
} from "./pattern-trade-stats.js?v=7";

import {
computePartialTpTradeStats
} from "./pattern-trade-stats-partial.js?v=5";

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
opts
),
partialStats:
computePartialTpTradeStats(
candles,
events,
{
...opts,
span:
"x"
}
),
partialYStats:
computePartialTpTradeStats(
candles,
events,
{
...opts,
span:
"y"
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
"x"
}
),
partialYStats:
computePartialTpTradeStats(
[],
[],
{
...opts,
span:
"y"
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

renderAlgoPatternCounts(
counts
);
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
entryOverlay?.setEvents?.(
events
);
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
