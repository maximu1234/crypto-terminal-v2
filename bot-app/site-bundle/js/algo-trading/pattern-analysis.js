/**
 * Один проход pattern-12 math → счётчики + события входа + статистика сделок.
 */
import {
defaultPattern12Settings
} from "./pattern-12-math.js?v=21";

import {
getOrComputeAlgoPattern12Scene,
setAlgoPattern12PaintEntryFilter,
clearAlgoPattern12PaintEntryFilter
} from "./pattern-12-scene-cache.js?v=10";

import {
detectPatternEntryEventsFromSetups,
resolvePatternSetupEvent
} from "./pattern-entry-logic.js?v=14";

import {
countPattern12SetupsFromScene,
renderAlgoPatternCounts
} from "./pattern-stats.js?v=3";

import {
computeAlgoTradeStats,
renderAlgoTradeStats,
filterSequentialEntryEvents,
normalizeAlgoStatsMode
} from "./pattern-trade-stats.js?v=15";

import {
computePartialTpTradeStats,
filterSequentialPartialEntryEvents
} from "./pattern-trade-stats-partial.js?v=22";

import {
filterEntryEventsBySupertrend
} from "./pattern-supertrend-filter.js?v=5";

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
getOrComputeAlgoPattern12Scene(
candles,
opts.patternSettings ||
defaultPattern12Settings(),
opts.symbol ||
opts.chartSymbol ||
""
);
const setups =
scene?.setups;
const gateSt1 =
resolveStrategyGate(
opts,
"st1"
);
const gateSt2 =
resolveStrategyGate(
opts,
"st2"
);
const gateSt3 =
resolveStrategyGate(
opts,
"st3"
);
const packSt1 =
entryPackForGate(
candles,
setups,
opts,
gateSt1
);
const packSt2 =
entryPackForGate(
candles,
setups,
opts,
gateSt2
);
const packSt3 =
entryPackForGate(
candles,
setups,
opts,
gateSt3
);

return {
counts:
countPattern12SetupsFromScene(
scene
),
events:
packSt1.events,
pendingSetups:
packSt1.pendingSetups,
rawEvents:
packSt1.rawEvents,
eventsByStrategy:{
st1:
packSt1.events,
st2:
packSt2.events,
st3:
packSt3.events
},
rawEventsByStrategy:{
st1:
packSt1.rawEvents,
st2:
packSt2.rawEvents,
st3:
packSt3.rawEvents
},
pendingByStrategy:{
st1:
packSt1.pendingSetups,
st2:
packSt2.pendingSetups,
st3:
packSt3.pendingSetups
},
tradeStats:
computeAlgoTradeStats(
candles,
packSt1.events,
{
...opts,
...gateSt1,
statsMode:
opts.statsMode
}
),
partialStats:
computePartialTpTradeStats(
candles,
packSt2.events,
{
...opts,
...gateSt2,
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
packSt3.events,
{
...opts,
...gateSt3,
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
pendingSetups:
[],
rawEvents:
[],
eventsByStrategy:{
st1:
[],
st2:
[],
st3:
[]
},
rawEventsByStrategy:{
st1:
[],
st2:
[],
st3:
[]
},
pendingByStrategy:{
st1:
[],
st2:
[],
st3:
[]
},
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
 * @param {object} [opts]
 * @param {"st1"|"st2"|"st3"} id
 * @returns {object}
 */
function resolveStrategyGate(
opts =
{},
id =
"st1"
){

const nested =
opts?.gates &&
typeof opts.gates ===
"object"
? opts.gates[
id
]
: null;
const src =
nested &&
typeof nested ===
"object"
? {
...opts,
...nested
}
: opts;

return {
slPctOfX:
src.slPctOfX,
pullbackBeforeArm:
src.pullbackBeforeArm,
pullbackBeforeArmPct:
src.pullbackBeforeArmPct,
supertrendLongFilter:
src.supertrendLongFilter,
supertrendLongAtr:
src.supertrendLongAtr,
supertrendLongFactor:
src.supertrendLongFactor,
supertrendLongTf:
src.supertrendLongTf,
supertrendShortFilter:
src.supertrendShortFilter,
supertrendShortAtr:
src.supertrendShortAtr,
supertrendShortFactor:
src.supertrendShortFactor,
supertrendShortTf:
src.supertrendShortTf
};

}

/**
 * @param {object} [opts]
 * @returns {"st1"|"st2"|"st3"}
 */
function chartStrategyIdFromOpts(
opts =
{}
){

if(
opts.chartPositionsStrategy ===
"partial-tp"
){
return "st2";
}

if(
opts.chartPositionsStrategy ===
"partial-tp-y"
){
return "st3";
}

return "st1";

}

/**
 * @param {Array} candles
 * @param {Array|null|undefined} setups
 * @param {object} opts
 * @param {object} gate
 */
function entryPackForGate(
candles,
setups,
opts,
gate
){

const detectOpts =
{
timeoutBars:
opts.timeoutBars,
maxPt1Pt4Bars:
opts.maxPt1Pt4Bars,
/* TEMP_PULLBACK_BEFORE_ARM */
pullbackBeforeArm:
gate.pullbackBeforeArm,
pullbackBeforeArmPct:
gate.pullbackBeforeArmPct,
reverseLogic:
!!(
opts.patternSettings?.reverseLogic ||
opts.reverseLogic
)
};

const rawEvents =
detectPatternEntryEventsFromSetups(
candles,
setups,
detectOpts
);

return {
events:
filterEntryEventsBySupertrend(
candles,
rawEvents,
{
...opts,
...gate
}
),
rawEvents,
pendingSetups:
listPendingPatternSetups(
candles,
setups,
detectOpts
)
};

}

/**
 * Сетапы без entry/cancel на текущей истории — ещё «в работе» на графике.
 * @param {Array} candles
 * @param {Array|null|undefined} setups
 * @param {object} [detectOpts]
 * @returns {Array}
 */
function listPendingPatternSetups(
candles,
setups,
detectOpts =
{}
){

const list =
Array.isArray(
setups
)
? setups
: [];
const pending =
[];

for(
const setup of list
){

if(
resolvePatternSetupEvent(
candles,
setup,
detectOpts
) ==
null
){
pending.push(
setup
);
}

}

return pending;

}

/** @type {Array|null} */
let lastCachedEntryEvents =
null;
/** @type {{ st1: Array, st2: Array, st3: Array }|null} */
let lastCachedEventsByStrategy =
null;

/**
 * Clear «Данные» panel + entry markers (pending full history / error).
 * @param {{ setEvents?: (events: Array) => void }|null} [entryOverlay]
 */
export function clearAlgoPatternAnalysisUi(
entryOverlay =
null
){

lastCachedEntryEvents =
null;
lastCachedEventsByStrategy =
null;

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
clearAlgoPattern12PaintEntryFilter();

}

/**
 * Apply counts/stats/overlay from already-built analysis parts.
 * @param {Array} candles
 * @param {{ setEvents?: (events: Array) => void }|null} entryOverlay
 * @param {object} opts
 * @param {{
 *   counts?: object,
 *   events: Array,
 *   pendingSetups?: Array,
 *   rawEvents?: Array,
 *   eventsByStrategy?: { st1?: Array, st2?: Array, st3?: Array },
 *   rawEventsByStrategy?: { st1?: Array, st2?: Array, st3?: Array },
 *   pendingByStrategy?: { st1?: Array, st2?: Array, st3?: Array },
 *   tradeStats: object,
 *   partialStats: object,
 *   partialYStats: object
 * }} parts
 */
function applyAlgoPatternAnalysisUi(
candles,
entryOverlay,
opts,
parts
){

const chartId =
chartStrategyIdFromOpts(
opts
);
const events =
Array.isArray(
parts.eventsByStrategy?.[
chartId
]
)
? parts.eventsByStrategy[
chartId
]
: Array.isArray(
parts.events
)
? parts.events
: [];
const pendingSetups =
Array.isArray(
parts.pendingByStrategy?.[
chartId
]
)
? parts.pendingByStrategy[
chartId
]
: Array.isArray(
parts.pendingSetups
)
? parts.pendingSetups
: [];
const rawEvents =
Array.isArray(
parts.rawEventsByStrategy?.[
chartId
]
)
? parts.rawEventsByStrategy[
chartId
]
: Array.isArray(
parts.rawEvents
)
? parts.rawEvents
: events;

lastCachedEntryEvents =
events;
lastCachedEventsByStrategy =
{
st1:
Array.isArray(
parts.eventsByStrategy?.st1
)
? parts.eventsByStrategy.st1
: events,
st2:
Array.isArray(
parts.eventsByStrategy?.st2
)
? parts.eventsByStrategy.st2
: events,
st3:
Array.isArray(
parts.eventsByStrategy?.st3
)
? parts.eventsByStrategy.st3
: events
};

setAlgoPattern12PaintEntryFilter(
events,
{
rawEvents,
pendingSetups
}
);

if(
parts.counts
){
try{
renderAlgoPatternCounts(
parts.counts
);
}catch(
err
){
console.warn(
"[algo-trading] pattern counts render:",
err
);
}
}

try{
renderAlgoTradeStats(
parts.tradeStats,
document.querySelector(
'[data-algo-strategy="fixed-tp"]'
) ||
document
);
renderAlgoTradeStats(
parts.partialStats,
document.querySelector(
'[data-algo-strategy="partial-tp"]'
) ||
document
);
renderAlgoTradeStats(
parts.partialYStats,
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
const overlayOpts =
{
...opts,
...resolveStrategyGate(
opts,
chartId
)
};

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
overlayOpts
)
: filterSequentialPartialEntryEvents(
candles,
events,
{
...overlayOpts,
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
const parts =
analyzeAlgoPatterns(
candles,
opts
);

applyAlgoPatternAnalysisUi(
candles,
entryOverlay,
opts,
parts
);
}catch(
err
){
console.warn(
"[algo-trading] pattern analysis:",
err
);
clearAlgoPatternAnalysisUi(
entryOverlay
);
}

}

/**
 * Live-тик внутри открытой свечи: без scene/detect/фильтров —
 * только пересчёт PnL/«В работе» по кэшированным входам (проколы SL/ТП).
 * Полный анализ — на закрытии бара.
 * @param {Array} candles
 * @param {{ setEvents?: (events: Array) => void, refreshPositions?: () => void }|null} entryOverlay
 * @param {object} [opts]
 * @returns {boolean}
 */
export function refreshAlgoPatternAnalysisLive(
candles,
entryOverlay,
opts =
{}
){

if(
!Array.isArray(
lastCachedEntryEvents
)
){
entryOverlay?.refreshPositions?.();
return false;
}

try{
const by =
lastCachedEventsByStrategy ||
{
st1:
lastCachedEntryEvents,
st2:
lastCachedEntryEvents,
st3:
lastCachedEntryEvents
};
const gateSt1 =
resolveStrategyGate(
opts,
"st1"
);
const gateSt2 =
resolveStrategyGate(
opts,
"st2"
);
const gateSt3 =
resolveStrategyGate(
opts,
"st3"
);

renderAlgoTradeStats(
computeAlgoTradeStats(
candles,
by.st1 ||
lastCachedEntryEvents,
{
...opts,
...gateSt1,
statsMode:
opts.statsMode
}
),
document.querySelector(
'[data-algo-strategy="fixed-tp"]'
) ||
document
);
renderAlgoTradeStats(
computePartialTpTradeStats(
candles,
by.st2 ||
lastCachedEntryEvents,
{
...opts,
...gateSt2,
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
document.querySelector(
'[data-algo-strategy="partial-tp"]'
) ||
document
);
renderAlgoTradeStats(
computePartialTpTradeStats(
candles,
by.st3 ||
lastCachedEntryEvents,
{
...opts,
...gateSt3,
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
),
document.querySelector(
'[data-algo-strategy="partial-tp-y"]'
) ||
document
);

entryOverlay?.refreshPositions?.();
return true;
}catch(
err
){
console.warn(
"[algo-trading] pattern analysis live:",
err
);
entryOverlay?.refreshPositions?.();
return false;
}

}
