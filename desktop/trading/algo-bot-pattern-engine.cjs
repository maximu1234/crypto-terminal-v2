/**
 * Algo bot pattern engine — Phase B/C.
 * Kline cache, armed setups, live entries + SL/TP.
 */
const log =
require(
"electron-log"
);
const {
loadPatternModules
} =
require(
"./algo-bot-pattern-loader.cjs"
);
const algoRest =
require(
"./algo-bybit-rest.cjs"
);
const {
createAlgoBybitKlineHub,
normalizeSymbol,
normalizeTf
} =
require(
"./algo-bybit-kline-ws.cjs"
);
const orderExecutor =
require(
"./algo-bot-order-executor.cjs"
);
const alertBridge =
require(
"./algo-bot-alert-bridge.cjs"
);
const sessionLog =
require(
"./algo-bot-session-log.cjs"
);
const {
createBarCloseSweep
} =
require(
"./algo-bot-bar-close-sweep.cjs"
);
const {
getAlgoTradingMode
} =
require(
"./algo-trading-runtime.cjs"
);

const HISTORY_TAIL =
120;
const MAX_LOG =
500;
/* Same depth as the Algo chart / scans: ALGO_TICKER_SCAN_HISTORY_REQUESTS = 10. */
const PATTERN_HISTORY_REQUESTS =
10;
const PATTERN_SCAN_MIN_BARS =
PATTERN_HISTORY_REQUESTS *
1000;
const TURNOVER_CACHE_TTL_MS =
60_000;
const ILLIQUID_SIGNAL_COOLDOWN_MS =
5 *
60 *
1000;

/**
 * Session denylist: manually disarmed setups (and time-stable keys).
 * Survives candle-index shifts after history trim.
 * @type {Set<string>}
 */
const sessionIgnoredFingerprints =
new Set();
/**
 * One session-log line per setup decision (fp + code), so «wait» / skips
 * are visible without flooding every 5m scan.
 * @type {Set<string>}
 */
const sessionDecisionLogs =
new Set();
const SEED_CONCURRENCY =
6;

/** @type {import('../../js/algo-trading/pattern-entry-logic.js')|null} */
let patternEntry =
null;
/** @type {import('../../js/algo-trading/pattern-12-math.js')|null} */
let patternMath =
null;
/** @type {import('../../js/algo-trading/pattern-supertrend-filter.js')|null} */
let supertrendFilter =
null;

/** @type {ReturnType<createAlgoBybitKlineHub>|null} */
let klineHub =
null;
/** @type {(() => void)|null} */
let unsubKline =
null;

/** @type {Map<string, object>} */
const symbolStates =
new Map();

/** @type {Map<string, { value: number, at: number }>} */
const turnoverCache =
new Map();

/** @type {Map<string, number>} */
const illiquidSignalAt =
new Map();

let engineConfig =
null;
let entriesCount =
0;
/** @type {Array<{ ts: number, symbol: string, side: string, price: number, text: string }>} */
const signalLog =
[];

/** @type {Set<string>} */
let inPositionSymbols =
new Set();

/** @type {string[]} */
let seedQueue =
[];

let seedInflight =
0;

/** @type {string[]} */
let resyncQueue =
[];

let resyncInflight =
0;

/** @type {ReturnType<createBarCloseSweep>|null} */
let barCloseSweep =
null;

function emptyEngineStatus(){

return {
armedCount:
0,
armedSetups:
[],
entriesCount:
0,
lastSignal:
"",
signals:
[]
};

}

function getEngineStatus(){

const waiting =
typeof orderExecutor.listWaitingEntryTriggers ===
"function"
? orderExecutor.listWaitingEntryTriggers()
: [];

const armedSetups =
[];
const seenSymbols =
new Set();

for(
const row of waiting
){

const sym =
String(
row?.symbol ||
""
).toUpperCase();

if(
!sym
){
continue;
}

seenSymbols.add(
sym
);

const state =
symbolStates.get(
sym
);
let alertShapeId =
row.alertShapeId
? String(
row.alertShapeId
)
: null;
let b4 =
row.b4;

if(
state?.armed?.size
){

for(
const entry of state.armed.values()
){

const setup =
entry?.setup ||
{};
const side =
setup.side ===
"short"
? "short"
: "long";

if(
side !==
row.side
){
continue;
}

if(
!alertShapeId &&
entry?.alertShapeId
){
alertShapeId =
String(
entry.alertShapeId
);
}

if(
b4 ==
null &&
Number.isFinite(
Number(
setup.b4
)
)
){
b4 =
Number(
setup.b4
);
}

break;

}

}

armedSetups.push(
{
symbol:
sym,
side:
row.side,
b4:
b4 ==
null
? null
: b4,
p4:
row.p4,
alertShapeId,
fingerprint:
row.fingerprint ||
"",
oppositeMirror:
!!row.oppositeMirror
}
);

}

armedSetups.sort(
(
a,
b
)=>
String(
a.symbol
).localeCompare(
String(
b.symbol
)
) ||
String(
a.side
).localeCompare(
String(
b.side
)
)
);

const last =
signalLog[
signalLog.length -
1
];

return {
armedCount:
seenSymbols.size,
armedSetups,
entriesCount,
lastSignal:
last?.text ||
"",
signals:
signalLog.slice()
};

}

async function ensurePatternModules(){

if(
patternEntry &&
patternMath &&
supertrendFilter
){
return {
patternEntry,
patternMath,
supertrendFilter
};
}

const loaded =
await loadPatternModules();
patternEntry =
loaded.patternEntry;
patternMath =
loaded.patternMath;
supertrendFilter =
loaded.supertrendFilter;

return {
patternEntry,
patternMath,
supertrendFilter
};

}

function isEntryCross(
side,
prev,
cur,
level
){

if(
side ===
"long"
){
return (
Number.isFinite(
prev?.close
) &&
Number.isFinite(
cur?.high
) &&
prev.close <
level &&
cur.high >=
level
);
}

return (
Number.isFinite(
prev?.close
) &&
Number.isFinite(
cur?.low
) &&
prev.close >
level &&
cur.low <=
level
);

}

function setupFingerprint(
symbol,
setup,
candles
){

const sym =
normalizeSymbol(
symbol
);
const side =
setup?.side ===
"short"
? "short"
: "long";
const b4 =
Number(
setup?.b4
);
const p4 =
Number(
setup?.p4
);
const p4Key =
Number.isFinite(
p4
)
? p4.toFixed(
8
)
: String(
setup?.p4 ??
""
);

/*
 * Prefer candle time at b4: bar indices shift when history is trimmed,
 * so index-based keys would allow the same setup to re-arm.
 */
if(
Array.isArray(
candles
) &&
Number.isFinite(
b4
) &&
b4 >=
0 &&
candles[
b4
]
){
const t4 =
Number(
candles[
b4
].time
);

if(
Number.isFinite(
t4
)
){
return `${sym}:${side}:t${t4}:${p4Key}`;
}

}

return `${sym}:${side}:b${Number.isFinite(
b4
)
? b4
: ""}:${p4Key}`;

}

function ignoreSetupForSession(
fp
){

const key =
String(
fp ||
""
).trim();

if(
key
){
sessionIgnoredFingerprints.add(
key
);
}

}

function isFingerprintBlocked(
state,
fp
){

const key =
String(
fp ||
""
).trim();

if(
!key
){
return false;
}

return sessionIgnoredFingerprints.has(
key
) ||
state.consumed.has(
key
) ||
state.armed.has(
key
);

}

function normalizeSetupSide(
side
){

return side ===
"short"
? "short"
: "long";

}

function findArmedSameSide(
state,
side
){

const want =
normalizeSetupSide(
side
);

for(
const [
fp,
row
] of state.armed
){

if(
normalizeSetupSide(
row?.setup?.side
) ===
want
){
return {
fp,
row
};
}

}

return null;

}

function findArmedOppositeSide(
state,
side
){

const want =
normalizeSetupSide(
side
);
const opposite =
want ===
"short"
? "long"
: "short";

for(
const [
fp,
row
] of state.armed
){

if(
normalizeSetupSide(
row?.setup?.side
) ===
opposite
){
return {
fp,
row
};
}

}

return null;

}

/**
 * Same chart pivot: identical price and candle time (pt3 parent == pt4 opposite).
 */
function isSamePatternPivot(
candles,
barA,
priceA,
barB,
priceB
){

const pa =
Number(
priceA
);
const pb =
Number(
priceB
);

if(
!(
Number.isFinite(
pa
) &&
Number.isFinite(
pb
)
) ||
pa !==
pb
){
return false;
}

const ia =
Number(
barA
);
const ib =
Number(
barB
);

if(
Array.isArray(
candles
) &&
Number.isFinite(
ia
) &&
Number.isFinite(
ib
) &&
candles[
ia
] &&
candles[
ib
]
){
const ta =
Number(
candles[
ia
].time
);
const tb =
Number(
candles[
ib
].time
);

if(
Number.isFinite(
ta
) &&
Number.isFinite(
tb
)
){
return ta ===
tb;
}

}

return (
Number.isFinite(
ia
) &&
ia ===
ib
);

}

/**
 * Opposite parent still alive in box (parked preferred, else armed opposite).
 * Opposite mirror allowed only when new pt4 shares parent pt3 pivot.
 */
function resolveOppositeMirrorParent(
state,
setupSide
){

const want =
normalizeSetupSide(
setupSide
);
const parentSide =
want ===
"short"
? "long"
: "short";

if(
state.parkedParent &&
normalizeSetupSide(
state.parkedParent.side ||
state.parkedParent.setup?.side
) ===
parentSide &&
isParkedParentStillValid(
state,
state.parkedParent
)
){
return {
setup:
state.parkedParent.setup,
fingerprint:
state.parkedParent.fingerprint,
side:
parentSide,
source:
"parked"
};
}

const armed =
findArmedOppositeSide(
state,
want
);

if(
armed &&
isParkedParentStillValid(
state,
{
setup:
armed.row.setup,
fingerprint:
armed.fp,
side:
armed.row.setup?.side
}
)
){
return {
setup:
armed.row.setup,
fingerprint:
armed.fp,
side:
parentSide,
source:
"armed"
};
}

return null;

}

function shiftMirrorTriggerPrice(
side,
price,
tickSize
){

const p =
Number(
price
);
const tick =
Number(
tickSize
);

if(
!(
Number.isFinite(
p
) &&
p >
0
) ||
!(
Number.isFinite(
tick
) &&
tick >
0
)
){
return null;
}

const want =
normalizeSetupSide(
side
);

/*
 * short: one tick below shared pivot; long: one tick above.
 * Entry trigger only — SL/TP stay on original pattern pt3/pt4.
 */
const shifted =
want ===
"short"
? p -
tick
: p +
tick;

if(
!(
shifted >
0
)
){
return null;
}

return shifted;

}

/**
 * Parent still in box: pt4 not pierced, pt3 not pierced, within N bars after pt4.
 */
function isParkedParentStillValid(
state,
parent
){

if(
!parent?.setup ||
!patternEntry
){
return false;
}

const candles =
state.candles;

if(
!Array.isArray(
candles
) ||
candles.length <
3
){
return false;
}

if(
alreadyCrossedAfterB4(
candles,
state.forming,
parent.setup
)
){
return false;
}

const resolveOpts =
getResolveOpts(
state.symbol
);

if(
!resolveOpts
){
return false;
}

const event =
patternEntry.resolvePatternSetupEvent(
candles,
parent.setup,
resolveOpts
);

return event ==
null;

}

async function tryRearmParkedParent(
sym,
reason =
"rearm-parent"
){

const state =
getState(
sym
);
const parent =
state.parkedParent;

if(
!parent?.setup
){
return false;
}

if(
inPositionSymbols.has(
sym
)
){
return false;
}

if(
!isParkedParentStillValid(
state,
parent
)
){
state.parkedParent =
null;

if(
parent.fingerprint
){
state.consumed.add(
parent.fingerprint
);
}

pushSignal(
{
ts:
Date.now(),
symbol:
sym,
side:
normalizeSetupSide(
parent.side ||
parent.setup?.side
),
price:
Number(
parent.setup?.p4
),
text:
`${sym}: родительский сетап больше не валиден — не вооружаем`
}
);
engineConfig?.onActivity?.();
return false;
}

if(
parent.fingerprint
){
state.consumed.delete(
parent.fingerprint
);
}

state.parkedParent =
null;

pushSignal(
{
ts:
Date.now(),
symbol:
sym,
side:
normalizeSetupSide(
parent.setup.side
),
price:
Number(
parent.setup.p4
),
text:
`${sym}: возврат родительского сетапа (${reason})`
}
);

await tryArmSetup(
sym,
parent.setup,
reason
);

const parentFp =
setupFingerprint(
sym,
parent.setup,
state.candles
);

if(
!state.armed.has(
parentFp
)
){

if(
isParkedParentStillValid(
state,
parent
)
){
state.parkedParent =
parent;
}else if(
parent.fingerprint
){
state.consumed.add(
parent.fingerprint
);
}

return false;
}

return true;

}

function sideAllowed(
botSide,
setupSide
){

if(
botSide ===
"both"
){
return true;
}

return botSide ===
setupSide;

}

/**
 * @param {string} symbol
 * @param {"long"|"short"} setupSide
 */
function setupSideAllowedForSymbol(
symbol,
setupSide
){

const side =
setupSide ===
"short"
? "short"
: "long";
const map =
engineConfig?.symbolAllowedSides;
const sym =
normalizeSymbol(
symbol
);

if(
map &&
typeof map ===
"object"
){
const allowed =
map[
sym
] ||
map[
symbol
];

if(
Array.isArray(
allowed
)
){
return allowed.includes(
side
);
}
}

return sideAllowed(
engineConfig?.side ||
"long",
side
);

}

function pushSignal(
entry
){

signalLog.push(
entry
);

if(
signalLog.length >
MAX_LOG
){
signalLog.shift();
}

try{
sessionLog.appendSignal(
entry
);
}catch{
/* session file is best-effort */
}

}

/**
 * @param {string} fp
 * @param {string} code
 * @param {{ ts?: number, symbol: string, side: string, price: number, text: string }} entry
 * @returns {boolean} true if a new line was written
 */
function pushSetupDecisionOnce(
fp,
code,
entry
){

const key =
`${String(
fp ||
""
).trim()}::${String(
code ||
""
).trim()}`;

if(
!String(
fp ||
""
).trim()
){
pushSignal(
entry
);
return true;
}

if(
sessionDecisionLogs.has(
key
)
){
return false;
}

sessionDecisionLogs.add(
key
);
pushSignal(
entry
);
return true;

}

/**
 * @param {object[]} candles
 * @param {object} setup
 * @param {string} fp
 * @param {string} code
 * @param {{ ts?: number, symbol: string, side: string, price: number, text: string }} entry
 * @returns {boolean}
 */
function pushAliveSetupDecisionOnce(
candles,
setup,
fp,
code,
entry
){

if(
!isSetupWithinEntryTimeout(
candles,
setup
)
){
return false;
}

return pushSetupDecisionOnce(
fp,
code,
entry
);

}

function pullbackPctLabel(){

const n =
Number(
engineConfig?.pullbackBeforeArmPct
);

if(
Number.isFinite(
n
)
){
return String(
n
);
}

return "38.2";

}

function trimCandles(
candles,
maxLen
){

if(
candles.length <=
maxLen
){
return candles;
}

return candles.slice(
-maxLen
);

}

function getMaxHistory(
timeoutBars
){

return Math.max(
clampEntryTimeoutBars(
timeoutBars
) +
HISTORY_TAIL,
PATTERN_SCAN_MIN_BARS
);

}

function getPatternSettings(){

const raw =
engineConfig?.patternSettings;

if(
raw &&
patternMath?.normalizePattern12Settings
){
return patternMath.normalizePattern12Settings(
raw
);
}

if(
patternMath?.defaultPattern12Settings
){
return patternMath.defaultPattern12Settings();
}

return {};

}

function normalizeBookSymbol(
symbol
){

return String(
symbol ||
""
).replace(
/\.P$/i,
""
).trim().toUpperCase();

}

function getTickerBookOverlay(
symbol
){

const book =
engineConfig?.tickerBook;

if(
!book ||
typeof book !==
"object"
){
return null;
}

const sym =
normalizeBookSymbol(
symbol
);

if(
!sym
){
return null;
}

const row =
book[
sym
];

return row &&
typeof row ===
"object"
? row
: null;

}

function buildExitProfileForOverlay(
overlay
){

const base =
engineConfig?.exitProfile;
const strategyId =
String(
engineConfig?.strategyId ||
"st1"
);

if(
!overlay
){
return base;
}

if(
strategyId ===
"st1" ||
base?.kind ===
"rr"
){
const tpRr =
Number(
overlay.tpRr
);

return {
kind:
"rr",
tpRr:
Number.isFinite(
tpRr
)
? tpRr
: base?.tpRr
};
}

return {
kind:
base?.kind ||
(
strategyId ===
"st2"
? "partial-x"
: "partial-y"
),
tp1:
Number.isFinite(
Number(
overlay.tp1
)
)
? Number(
overlay.tp1
)
: base?.tp1,
tp2:
Number.isFinite(
Number(
overlay.tp2
)
)
? Number(
overlay.tp2
)
: base?.tp2,
tp3:
Number.isFinite(
Number(
overlay.tp3
)
)
? Number(
overlay.tp3
)
: base?.tp3,
trailSl:
overlay.trailSl !=
null
? !!overlay.trailSl
: !!base?.trailSl,
trailSlX1:
Number.isFinite(
Number(
overlay.trailSlX1
)
)
? Number(
overlay.trailSlX1
)
: base?.trailSlX1,
trailSlX2:
Number.isFinite(
Number(
overlay.trailSlX2
)
)
? Number(
overlay.trailSlX2
)
: base?.trailSlX2,
share1:
Number.isFinite(
Number(
overlay.share1
)
)
? Number(
overlay.share1
)
: base?.share1,
share2:
Number.isFinite(
Number(
overlay.share2
)
)
? Number(
overlay.share2
)
: base?.share2,
share3:
Number.isFinite(
Number(
overlay.share3
)
)
? Number(
overlay.share3
)
: base?.share3
};

}

/**
 * Только overlay из книги. Без записи в книге — null (базовые prefs запрещены).
 * @param {string} [symbol]
 * @returns {object|null}
 */
function getTradePrefsForSymbol(
symbol
){

const overlay =
symbol
? getTickerBookOverlay(
symbol
)
: null;

if(
!overlay
){
return null;
}

const pullbackBeforeArm =
overlay.pullbackBeforeArm !=
null
? !!overlay.pullbackBeforeArm
: false;

const pullbackBeforeArmPct =
Number.isFinite(
Number(
overlay.pullbackBeforeArmPct
)
)
? Number(
overlay.pullbackBeforeArmPct
)
: 38.2;

const slPct =
Number.isFinite(
Number(
overlay.slPct
)
)
? Number(
overlay.slPct
)
: null;

const tpRr =
Number.isFinite(
Number(
overlay.tpRr
)
)
? Number(
overlay.tpRr
)
: null;

if(
!Number.isFinite(
slPct
)
){
return null;
}

const strategyId =
String(
engineConfig?.strategyId ||
"st1"
);

if(
strategyId ===
"st1" &&
!Number.isFinite(
tpRr
)
){
return null;
}

return {
slPct,
tpRr,
tf:
String(
overlay.tf ||
""
).trim(),
supertrendLongFilter:
!!overlay.supertrendLongFilter,
supertrendLongAtr:
Number(
overlay.supertrendLongAtr
),
supertrendLongFactor:
Number(
overlay.supertrendLongFactor
),
supertrendLongTf:
String(
overlay.supertrendLongTf ||
""
).trim(),
supertrendShortFilter:
!!overlay.supertrendShortFilter,
supertrendShortAtr:
Number(
overlay.supertrendShortAtr
),
supertrendShortFactor:
Number(
overlay.supertrendShortFactor
),
supertrendShortTf:
String(
overlay.supertrendShortTf ||
""
).trim(),
exitProfile:
buildExitProfileForOverlay(
overlay
),
pullbackBeforeArm,
pullbackBeforeArmPct,
riskUsd:
engineConfig?.riskUsd,
strategyId:
engineConfig?.strategyId
};

}

function getResolveOpts(
symbol
){

const trade =
getTradePrefsForSymbol(
symbol
);

if(
!trade
){
return null;
}

return {
timeoutBars:
clampEntryTimeoutBars(
engineConfig?.timeoutBars
),
maxPt1Pt4Bars:
clampMaxPt1Pt4Bars(
engineConfig?.maxPt1Pt4Bars
),
/* TEMP_PULLBACK_BEFORE_ARM */
pullbackBeforeArm:
!!trade.pullbackBeforeArm,
pullbackBeforeArmPct:
trade.pullbackBeforeArmPct
};

}

function candlesWithCurrentBar(
candles,
current
){

const list =
Array.isArray(
candles
)
? candles.slice()
: [];

if(
!current
){
return list;
}

const currentTime =
Number(
current.time
);
const lastTime =
Number(
list[
list.length -
1
]?.time
);

if(
Number.isFinite(
currentTime
) &&
currentTime ===
lastTime
){
list[
list.length -
1
] =
current;
}else{
list.push(
current
);
}

return list;

}

/**
 * Supertrend execution policy comes only from the per-ticker book row.
 * @param {string} symbol
 * @param {object} setup
 * @param {Array} candles
 * @param {object|null} [current]
 * @returns {boolean}
 */
function passesSupertrendEntryGate(
symbol,
setup,
candles,
current =
null
){

const trade =
getTradePrefsForSymbol(
symbol
);
const side =
setup?.side ===
"short"
? "short"
: "long";
const enabled =
side ===
"short"
? trade?.supertrendShortFilter
: trade?.supertrendLongFilter;

if(
!trade ||
!enabled
){
return !!trade;
}

if(
!supertrendFilter?.filterEntryEventsBySupertrend
){
return false;
}

const list =
candlesWithCurrentBar(
candles,
current
);
const bar =
list.length -
1;

if(
bar <
0
){
return false;
}

const filtered =
supertrendFilter.filterEntryEventsBySupertrend(
list,
[
{
type:
"entry",
side,
bar,
price:
Number(
setup?.p4
)
}
],
{
chartTf:
trade.tf,
supertrendLongFilter:
trade.supertrendLongFilter,
supertrendLongAtr:
trade.supertrendLongAtr,
supertrendLongFactor:
trade.supertrendLongFactor,
supertrendLongTf:
trade.supertrendLongTf,
supertrendShortFilter:
trade.supertrendShortFilter,
supertrendShortAtr:
trade.supertrendShortAtr,
supertrendShortFactor:
trade.supertrendShortFactor,
supertrendShortTf:
trade.supertrendShortTf
}
);

return filtered.length ===
1;

}

function clampEntryTimeoutBars(
raw
){

const n =
Math.round(
Number(
raw
)
);

if(
!Number.isFinite(
n
) ||
n <
1
){
return 200;
}

return Math.min(
10000,
n
);

}

/**
 * Live entry window from pt4: within strategy «баров до отмены».
 * Older setups are consumed/skipped without session-log noise.
 * @param {object[]} candles
 * @param {{ b4?: unknown }} setup
 * @param {unknown} [timeoutBars]
 * @returns {boolean}
 */
function isSetupWithinEntryTimeout(
candles,
setup,
timeoutBars
){

const b4 =
Number(
setup?.b4
);
const lastIndex =
Array.isArray(
candles
)
? candles.length -
1
: -1;

if(
!Number.isFinite(
b4
) ||
b4 <
0 ||
lastIndex <
b4
){
return false;
}

return lastIndex -
b4 <=
clampEntryTimeoutBars(
timeoutBars ??
engineConfig?.timeoutBars
);

}

function clampMaxPt1Pt4Bars(
raw
){

if(
raw ==
null
){
return null;
}

if(
typeof raw ===
"string" &&
!String(
raw
).trim()
){
return null;
}

const n =
Math.round(
Number(
raw
)
);

if(
!Number.isFinite(
n
) ||
n <
1
){
return null;
}

return Math.min(
10000,
n
);

}

function createSymbolState(
symbol
){

return {
symbol:
normalizeSymbol(
symbol
),
candles:
[],
forming:
null,
armed:
new Map(),
consumed:
new Set(),
/*
  Nested setups: outer armed setup parked while a newer same-side
  setup is armed inside its pt3–pt4 box. Re-armed after nested trade
  closes / nested cancel, if still valid.
*/
parkedParent:
null,
seeded:
false,
needsResync:
false
};

}

function getState(
symbol
){

const sym =
normalizeSymbol(
symbol
);

let state =
symbolStates.get(
sym
);

if(
!state
){
state =
createSymbolState(
sym
);
symbolStates.set(
sym,
state
);
}

return state;

}

function candlesWithForming(
state
){

if(
!state.forming
){
return state.candles;
}

return [
...state.candles,
state.forming
];

}

function tfStepSeconds(
tf
){

const n =
normalizeTf(
tf
);
const map =
{
"1":
60,
"3":
180,
"5":
300,
"15":
900,
"30":
1800,
"60":
3600,
"120":
7200,
"240":
14400,
"360":
21600,
"720":
43200,
D:
86400,
W:
604800
};

return map[
n
] ||
60;

}

function appendClosedBar(
state,
bar
){

const last =
state.candles[
state.candles.length -
1
];

if(
last &&
last.time ===
bar.time
){
state.candles[
state.candles.length -
1
] =
bar;
}else if(
!last ||
last.time <
bar.time
){
state.candles.push(
bar
);
}

const maxLen =
getMaxHistory(
engineConfig?.timeoutBars
);
state.candles =
trimCandles(
state.candles,
maxLen
);

}

function mergeKline(
state,
candle
){

const bar =
{
time:
candle.time,
open:
candle.open,
high:
candle.high,
low:
candle.low,
close:
candle.close
};

/*
 * If WS missed confirm=true, the next bar's first tick still advances time.
 * Promote the previous forming candle to closed so history stays continuous.
 */
let promotedClosed =
false;

if(
state.forming &&
Number(
state.forming.time
) <
Number(
bar.time
)
){
appendClosedBar(
state,
state.forming
);
state.forming =
null;
promotedClosed =
true;
}

const last =
state.candles[
state.candles.length -
1
];
const step =
tfStepSeconds(
engineConfig?.tf
);

if(
last &&
Number.isFinite(
step
) &&
Number(
bar.time
) >
Number(
last.time
) +
step +
1
){
state.needsResync =
true;
}

if(
candle.confirm
){
appendClosedBar(
state,
bar
);
state.forming =
null;
return "closed";
}

state.forming =
bar;
return promotedClosed
? "closed"
: "forming";

}

function alreadyCrossedAfterB4(
candles,
forming,
setup
){

const b4 =
Number(
setup.b4
);
const p4 =
Number(
setup.p4
);
const side =
setup.side ===
"short"
? "short"
: "long";
const end =
candles.length;

/*
 * Entry is only AFTER the pt4 formation bar.
 * Checking b4 itself is wrong: for short, p4 is typically the bar's
 * micro low (long: high), so isEntryCross(b4-1, b4, p4) is almost
 * always true and cancels every clean setup ("pt4 уже заколот").
 */
for(
let i =
b4 +
1;
i <
end;
i++
){

const prev =
candles[
i -
1
];
const cur =
candles[
i
];

if(
isEntryCross(
side,
prev,
cur,
p4
)
){
return true;
}

}

if(
forming &&
end >
0
){
const prev =
candles[
end -
1
];

if(
isEntryCross(
side,
prev,
forming,
p4
)
){
return true;
}

}

return false;

}

/**
 * Resolve pt4 bar time for timeout. Indices shift after history trim /
 * 5000-bar cap, so b4+timeoutBars vs barIndex never fires near the tip.
 * @param {object} row
 * @param {object} setup
 * @param {Array} candles
 * @param {string} [fp]
 * @returns {number|null}
 */
function resolveArmedB4Time(
row,
setup,
candles,
fp
){

const stored =
Number(
row?.b4Time
);

if(
Number.isFinite(
stored
) &&
stored >
0
){
return stored;
}

const fromFp =
String(
fp ||
""
).match(
/:t(\d+(?:\.\d+)?):/
);
const fpTime =
fromFp
? Number(
fromFp[
1
]
)
: NaN;

if(
Number.isFinite(
fpTime
) &&
fpTime >
0
){
return fpTime;
}

const b4 =
Number(
setup?.b4
);

if(
Array.isArray(
candles
) &&
Number.isFinite(
b4
) &&
b4 >=
0 &&
candles[
b4
]
){
const t =
Number(
candles[
b4
].time
);

if(
Number.isFinite(
t
) &&
t >
0
){
return t;
}

}

return null;

}

/**
 * Closed (+ optional forming) bars strictly after pt4 time.
 * @param {Array} candles
 * @param {{ time?: number }|null|undefined} forming
 * @param {number} b4Time
 * @returns {number}
 */
function countBarsAfterB4Time(
candles,
forming,
b4Time
){

const t4 =
Number(
b4Time
);

if(
!(
Number.isFinite(
t4
) &&
t4 >
0
)
){
return 0;
}

let n =
0;

if(
Array.isArray(
candles
)
){
for(
const bar of candles
){
const t =
Number(
bar?.time
);

if(
Number.isFinite(
t
) &&
t >
t4
){
n++;
}

}

}

const ft =
Number(
forming?.time
);

if(
Number.isFinite(
ft
) &&
ft >
t4
){
n++;
}

return n;

}

/**
 * @param {string} symbol
 * @returns {Promise<number|null>}
 */
async function fetchTurnover24hUsdt(
symbol
){

const sym =
normalizeSymbol(
symbol
);
const cached =
turnoverCache.get(
sym
);
const now =
Date.now();

if(
cached &&
now -
cached.at <
TURNOVER_CACHE_TTL_MS
){
return cached.value;
}

try{
const prices =
await algoRest.getTickerPrices(
sym
);
const raw =
prices?.turnover24h;
const n =
Number(
raw
);

if(
raw ==
null ||
!Number.isFinite(
n
)
){
return null;
}

turnoverCache.set(
sym,
{
value:
n,
at:
now
}
);

return n;
}catch(
_err
){
return null;
}

}

/**
 * @param {number|null|undefined} value
 * @returns {string}
 */
function formatTurnoverUsdt(
value
){

const n =
Number(
value
);

if(
!Number.isFinite(
n
)
){
return "н/д";
}

return String(
Math.round(
n
)
).replace(
/\B(?=(\d{3})+(?!\d))/g,
"."
);

}

/**
 * @param {string} symbol
 * @returns {Promise<boolean>} true = ok to arm
 */
async function passesMinTurnoverGate(
symbol
){

const min =
Number(
engineConfig?.minTurnover24hUsdt
);

if(
!Number.isFinite(
min
) ||
min <=
0
){
return true;
}

const turnover =
await fetchTurnover24hUsdt(
symbol
);

if(
turnover ==
null
){
return true;
}

if(
turnover >=
min
){
return true;
}

const sym =
normalizeSymbol(
symbol
);
const now =
Date.now();
const last =
illiquidSignalAt.get(
sym
) ||
0;

if(
now -
last >=
ILLIQUID_SIGNAL_COOLDOWN_MS
){
illiquidSignalAt.set(
sym,
now
);
pushSignal(
{
ts:
now,
symbol:
sym,
side:
"—",
price:
0,
text:
`${sym}: Объем не ликвидный (${formatTurnoverUsdt(
turnover
)})`
}
);
}

return false;

}

async function tryArmSetup(
symbol,
setup,
reason
){

const state =
getState(
symbol
);
const sym =
state.symbol;
const src =
reason
? ` (${reason})`
: "";

if(
inPositionSymbols.has(
sym
)
){
const fp =
setupFingerprint(
sym,
setup,
state.candles
);
pushAliveSetupDecisionOnce(
state.candles,
setup,
fp,
"in_position",
{
ts:
Date.now(),
symbol:
sym,
side:
setup.side,
price:
Number(
setup.p4
),
text:
`${sym} ${setup.side}: пропуск — уже в позиции${src}`
}
);
return;
}

if(
engineConfig?.entriesPaused
){
const fp =
setupFingerprint(
sym,
setup,
state.candles
);
pushAliveSetupDecisionOnce(
state.candles,
setup,
fp,
"entries_paused",
{
ts:
Date.now(),
symbol:
sym,
side:
setup.side,
price:
Number(
setup.p4
),
text:
`${sym} ${setup.side}: пропуск — входы на паузе${src}`
}
);
return;
}

if(
!setupSideAllowedForSymbol(
sym,
setup.side
)
){
const fp =
setupFingerprint(
sym,
setup,
state.candles
);
pushAliveSetupDecisionOnce(
state.candles,
setup,
fp,
"side_blocked",
{
ts:
Date.now(),
symbol:
sym,
side:
setup.side,
price:
Number(
setup.p4
),
text:
`${sym} ${setup.side}: пропуск — сторона не разрешена${src}`
}
);
return;
}

const candles =
state.candles;
const fp =
setupFingerprint(
sym,
setup,
candles
);

if(
state.armed.has(
fp
)
){
return;
}

if(
sessionIgnoredFingerprints.has(
fp
) ||
state.consumed.has(
fp
)
){
pushAliveSetupDecisionOnce(
candles,
setup,
fp,
"already_done",
{
ts:
Date.now(),
symbol:
sym,
side:
setup.side,
price:
Number(
setup.p4
),
text:
`${sym} ${setup.side}: пропуск — сетап уже обработан ранее${src}`
}
);
return;
}

if(
!isSetupWithinEntryTimeout(
candles,
setup
)
){
state.consumed.add(
fp
);
return;
}

/*
 * With pullback-before-arm, "missed entry" is owned by the pullback gate /
 * pattern resolve (pt4 до отката / вход уже был). alreadyCrossed
 * here falsely cancels setups that resolve skipped (e.g. maxPt1Pt4Bars
 * early-null) and disagrees with pullback semantics.
 */
const resolveOptsArm =
getResolveOpts(
sym
);

if(
!resolveOptsArm
){
return;
}

const pullbackArmOn =
!!resolveOptsArm.pullbackBeforeArm;

if(
!pullbackArmOn &&
alreadyCrossedAfterB4(
candles,
state.forming,
setup
)
){
if(
isSetupWithinEntryTimeout(
candles,
setup
)
){
pushSignal(
{
ts:
Date.now(),
symbol:
sym,
side:
setup.side,
price:
Number(
setup.p4
),
text:
`${sym} ${setup.side}: пропущен вход до arm — сетап отменён${src}`
}
);
}
state.consumed.add(
fp
);
return;
}

/* TEMP_PULLBACK_BEFORE_ARM — wait pullback / cancel if pt4 pierced first */
if(
patternEntry?.evaluatePullbackArmGate
){
const gate =
patternEntry.evaluatePullbackArmGate(
candles,
setup,
resolveOptsArm
);

if(
gate ===
"wait"
){
pushAliveSetupDecisionOnce(
candles,
setup,
fp,
"pullback_wait",
{
ts:
Date.now(),
symbol:
sym,
side:
setup.side,
price:
Number(
setup.p4
),
text:
`${sym} ${setup.side}: ждём откат ${pullbackPctLabel()}% — не вооружаем${src}`
}
);
return;
}

if(
gate ===
"cancel"
){
if(
isSetupWithinEntryTimeout(
candles,
setup
)
){
pushSignal(
{
ts:
Date.now(),
symbol:
sym,
side:
setup.side,
price:
Number(
setup.p4
),
text:
`${sym} ${setup.side}: pt4 до отката — не вооружаем${src}`
}
);
}
state.consumed.add(
fp
);
return;
}
}

if(
!passesSupertrendEntryGate(
sym,
setup,
candles
)
){
pushAliveSetupDecisionOnce(
candles,
setup,
fp,
"supertrend_wait",
{
ts:
Date.now(),
symbol:
sym,
side:
setup.side,
price:
Number(
setup.p4
),
text:
`${sym} ${setup.side}: Supertrend не подтверждает вход — ждём${src}`
}
);
return;
}

if(
!(
await passesMinTurnoverGate(
sym
)
)
){
return;
}

const existing =
findArmedSameSide(
state,
setup.side
);

if(
existing &&
existing.fp ===
fp
){
return;
}

/*
  Opposite side: blocked while opposite parent is alive in box,
  unless pt4 coincides with parent pt3 (same pivot) → opposite mirror.
  Parent = parked (preferred) or active opposite armed.
  Symmetry: long↔short. SL/TP from original pattern pt3/pt4; trigger ±1 tick.
*/
const mirrorParent =
resolveOppositeMirrorParent(
state,
setup.side
);
const isOppositeMirror =
!!(
mirrorParent &&
isSamePatternPivot(
candles,
mirrorParent.setup?.b3,
mirrorParent.setup?.p3,
setup.b4,
setup.p4
)
);

if(
mirrorParent &&
!isOppositeMirror
){
pushAliveSetupDecisionOnce(
candles,
setup,
fp,
"opposite_block",
{
ts:
Date.now(),
symbol:
sym,
side:
setup.side,
price:
Number(
setup.p4
),
text:
`${sym} ${setup.side}: пропуск — активен противоположный сетап${src}`
}
);
return;
}

/*
  Live only — Rule 1: nested same-side replace while parent still in pt3–pt4 box.
  Manual: no nesting — keep existing alert(s) and arm another independently.
*/
if(
!isManualTradingMode()
){

if(
existing &&
existing.fp !==
fp
){

const existingStillValid =
isParkedParentStillValid(
state,
{
setup:
existing.row.setup,
fingerprint:
existing.fp,
side:
existing.row.setup?.side
}
);

let replaced =
false;

if(
!existingStillValid
){
replaced =
await cancelArmedSetup(
sym,
existing.fp,
normalizeSetupSide(
existing.row.setup?.side
),
Number(
existing.row.setup?.p4
),
`${sym} ${normalizeSetupSide(
existing.row.setup?.side
)}: снят (невалиден) перед новым сетапом`,
{
skipRearm:
true
}
);
}else if(
!state.parkedParent
){
state.parkedParent =
{
setup:
existing.row.setup,
fingerprint:
existing.fp,
side:
normalizeSetupSide(
existing.row.setup?.side
)
};
replaced =
await cancelArmedSetup(
sym,
existing.fp,
normalizeSetupSide(
existing.row.setup?.side
),
Number(
existing.row.setup?.p4
),
`${sym} ${normalizeSetupSide(
existing.row.setup?.side
)}: nested — снят ради нового сетапа`,
{
soft:
true,
skipRearm:
true
}
);

if(
!replaced
){
state.parkedParent =
null;
}
}else{
replaced =
await cancelArmedSetup(
sym,
existing.fp,
normalizeSetupSide(
existing.row.setup?.side
),
Number(
existing.row.setup?.p4
),
`${sym} ${normalizeSetupSide(
existing.row.setup?.side
)}: nested — промежуточный снят ради нового`,
{
skipRearm:
true
}
);
}

if(
!replaced
){
pushAliveSetupDecisionOnce(
candles,
setup,
fp,
"replace_fail",
{
ts:
Date.now(),
symbol:
sym,
side:
setup.side,
price:
Number(
setup.p4
),
text:
`${sym} ${setup.side}: пропуск — не удалось снять текущий armed${src}`
}
);
return;
}

}else if(
orderExecutor.hasEntryInflight?.(
sym
)
){
pushAliveSetupDecisionOnce(
candles,
setup,
fp,
"entry_inflight",
{
ts:
Date.now(),
symbol:
sym,
side:
setup.side,
price:
Number(
setup.p4
),
text:
`${sym} ${setup.side}: пропуск — вход уже в процессе${src}`
}
);
return;
}else if(
orderExecutor.hasPendingTrigger(
sym
) &&
!(
isOppositeMirror &&
orderExecutor.canPlaceOppositeMirrorTrigger?.(
sym,
normalizeSetupSide(
setup.side
)
)
)
){
pushAliveSetupDecisionOnce(
candles,
setup,
fp,
"pending_trigger",
{
ts:
Date.now(),
symbol:
sym,
side:
setup.side,
price:
Number(
setup.p4
),
text:
`${sym} ${setup.side}: пропуск — на символе уже есть триггер${src}`
}
);
return;
}

if(
orderExecutor.hasEntryInflight?.(
sym
)
){
pushAliveSetupDecisionOnce(
candles,
setup,
fp,
"entry_inflight",
{
ts:
Date.now(),
symbol:
sym,
side:
setup.side,
price:
Number(
setup.p4
),
text:
`${sym} ${setup.side}: пропуск — вход уже в процессе${src}`
}
);
return;
}

if(
orderExecutor.hasPendingTrigger(
sym
) &&
!(
isOppositeMirror &&
orderExecutor.canPlaceOppositeMirrorTrigger?.(
sym,
normalizeSetupSide(
setup.side
)
)
)
){
pushAliveSetupDecisionOnce(
candles,
setup,
fp,
"pending_trigger",
{
ts:
Date.now(),
symbol:
sym,
side:
setup.side,
price:
Number(
setup.p4
),
text:
`${sym} ${setup.side}: пропуск — на символе уже есть триггер${src}`
}
);
return;
}

}

let mirrorTriggerPrice =
null;

if(
isOppositeMirror
){
const rules =
await algoRest.getInstrumentRules?.(
sym
);
const tick =
Number(
rules?.tickSize
);
mirrorTriggerPrice =
shiftMirrorTriggerPrice(
setup.side,
setup.p4,
tick
);

if(
!Number.isFinite(
mirrorTriggerPrice
)
){
pushAliveSetupDecisionOnce(
candles,
setup,
fp,
"mirror_price",
{
ts:
Date.now(),
symbol:
sym,
side:
setup.side,
price:
Number(
setup.p4
),
text:
`${sym} ${setup.side}: пропуск — нет tickSize для mirror-триггера${src}`
}
);
return;
}

}

const b4Idx =
Number(
setup.b4
);
const b4Time =
Array.isArray(
candles
) &&
Number.isFinite(
b4Idx
) &&
candles[
b4Idx
]
? Number(
candles[
b4Idx
].time
)
: null;

state.armed.set(
fp,
{
setup,
armedAt:
Date.now(),
b4Time:
Number.isFinite(
b4Time
) &&
b4Time >
0
? b4Time
: null,
reason,
orderId:
null,
oppositeMirror:
!!isOppositeMirror,
mirrorParentFingerprint:
isOppositeMirror
? mirrorParent.fingerprint
: null,
triggerPrice:
mirrorTriggerPrice
}
);

const armPrice =
Number.isFinite(
mirrorTriggerPrice
)
? mirrorTriggerPrice
: Number(
setup.p4
);

pushSignal(
{
ts:
Date.now(),
symbol:
sym,
side:
setup.side,
price:
armPrice,
text:
isOppositeMirror
? `${sym} ${setup.side}: armed MIRROR pt4=${Number(
setup.p4
).toFixed(
4
)} → trigger ${armPrice.toFixed(
4
)} (parent pt3)`
: `${sym} ${setup.side}: armed pt4=${Number(
setup.p4
).toFixed(
4
)} (${reason})`
}
);

void placeTriggerForArmed(
sym,
setup,
fp
);

}

async function placeTriggerForArmed(
sym,
setup,
fp
){

const state0 =
getState(
sym
);
const armedRow =
state0.armed.get(
fp
);
const triggerPrice =
Number(
armedRow?.triggerPrice
);
const oppositeMirror =
!!armedRow?.oppositeMirror &&
orderExecutor.hasPendingTrigger?.(
sym
) &&
orderExecutor.canPlaceOppositeMirrorTrigger?.(
sym,
normalizeSetupSide(
setup.side
)
);

if(
isManualTradingMode()
){
await placeAlertForArmed(
sym,
setup,
fp
);
return;
}

const tradePrefs =
getTradePrefsForSymbol(
sym
);

if(
!tradePrefs
){
return;
}

const result =
await orderExecutor.placeBotTriggerEntry(
{
symbol:
sym,
side:
setup.side ===
"short"
? "short"
: "long",
setup,
slPct:
tradePrefs.slPct,
tpRr:
tradePrefs.tpRr,
exitProfile:
tradePrefs.exitProfile,
strategyId:
engineConfig?.strategyId,
riskUsd:
engineConfig?.riskUsd,
fingerprint:
fp,
triggerPrice:
Number.isFinite(
triggerPrice
) &&
triggerPrice >
0
? triggerPrice
: undefined,
oppositeMirror,
mirrorParentFingerprint:
armedRow?.mirrorParentFingerprint ||
""
}
);

const state =
getState(
sym
);

if(
result?.ok
){
const row =
state.armed.get(
fp
);

if(
row
){
row.orderId =
result.orderId;
}

const shown =
Number.isFinite(
triggerPrice
) &&
triggerPrice >
0
? triggerPrice
: Number(
setup.p4
);

pushSignal(
{
ts:
Date.now(),
symbol:
sym,
side:
setup.side,
price:
shown,
text:
`${sym} ${setup.side}: TRIGGER @ ${shown.toFixed(
4
)}${oppositeMirror
? " (mirror)"
: ""} vol≈${Number(
result.volumeUsdt
).toFixed(
2
)}`
}
);
engineConfig?.onActivity?.();
return;
}

const busy =
String(
result?.message ||
""
).toLowerCase().includes(
"already pending"
);

state.armed.delete(
fp
);

if(
!busy
){
state.consumed.add(
fp
);
}

pushSignal(
{
ts:
Date.now(),
symbol:
sym,
side:
setup.side,
price:
Number(
setup.p4
),
text:
busy
? `${sym} ${setup.side}: trigger busy — сетап ждёт освобождения символа`
: `${sym} ${setup.side}: TRIGGER FAIL — ${result?.message ||
"error"}`
}
);
engineConfig?.onActivity?.();

}

/**
 * Log interpolate along X (pt4 → pt3), same scale as SL/%.
 * @param {number} from
 * @param {number} to
 * @param {number} t01
 * @returns {number}
 */
function interpolateLogPrice(
from,
to,
t01
){

const a =
Number(
from
);
const b =
Number(
to
);
const t =
Math.min(
1,
Math.max(
0,
Number(
t01
)
)
);

if(
!(
a >
0
) ||
!(
b >
0
) ||
!Number.isFinite(
t
)
){
return NaN;
}

if(
a ===
b
){
return a;
}

return Math.exp(
Math.log(
a
) *
(
1 -
t
) +
Math.log(
b
) *
t
);

}

/**
 * Manual alert lead: N% of X (pt3↔pt4) from pt4 toward pt3.
 * Long → slightly below pt4; short → slightly above. Not % of absolute price.
 * @param {object} setup
 * @param {number} leadPct
 * @returns {number}
 */
function computeManualAlertPrice(
setup,
leadPct
){

const pt4 =
Number(
setup?.p4
);
const pt3 =
Number(
setup?.p3
);
const lead =
Number.isFinite(
leadPct
) &&
leadPct >=
0
? Math.min(
10,
leadPct
)
: 5;

if(
!(
pt4 >
0
)
){
return NaN;
}

if(
!(
lead >
0
) ||
!(
pt3 >
0
)
){
return pt4;
}

const alertPrice =
interpolateLogPrice(
pt4,
pt3,
lead /
100
);

return Number.isFinite(
alertPrice
) &&
alertPrice >
0
? alertPrice
: pt4;

}

async function placeAlertForArmed(
sym,
setup,
fp
){

/*
 * Manual mode: alert slightly before pt4 so the trader has time to react.
 * Offset = alertLeadPct of X (pt3↔pt4), toward pt3 — same units as СЛ %.
 */
const stateAlert =
getState(
sym
);
const armedAlert =
stateAlert.armed.get(
fp
);
const pt4Raw =
Number(
setup.p4
);
const mirrorTrigger =
Number(
armedAlert?.triggerPrice
);
const isMirror =
!!armedAlert?.oppositeMirror &&
Number.isFinite(
mirrorTrigger
) &&
mirrorTrigger >
0;
/*
 * Opposite mirror: alert exactly at ±1 tick trigger (do not apply lead
 * toward pt3 — that would undo the tick gap vs parent cancel).
 */
const pt4 =
isMirror
? mirrorTrigger
: pt4Raw;
const leadPct =
Number(
engineConfig?.alertLeadPct
);
const lead =
isMirror
? 0
: Number.isFinite(
leadPct
) &&
leadPct >=
0
? Math.min(
10,
leadPct
)
: 5;
const side =
setup.side ===
"short"
? "short"
: "long";
const alertPrice =
isMirror
? mirrorTrigger
: computeManualAlertPrice(
{
...setup,
p4:
pt4
},
lead
);

const result =
await alertBridge.placeBotAlert(
{
symbol:
sym,
side,
price:
Number.isFinite(
alertPrice
)
? alertPrice
: pt4,
tf:
engineConfig?.tf ||
"5",
fingerprint:
fp
}
);

const state =
getState(
sym
);

if(
result?.ok &&
result?.shapeId
){
const row =
state.armed.get(
fp
);

if(
row
){
row.alertShapeId =
result.shapeId;
row.alertPrice =
Number.isFinite(
alertPrice
)
? alertPrice
: pt4;
}

const shown =
Number.isFinite(
alertPrice
)
? alertPrice
: pt4;

pushSignal(
{
ts:
Date.now(),
symbol:
sym,
side:
setup.side,
price:
shown,
text:
`${sym} ${setup.side}: ALERT @ ${shown.toFixed(
4
)} (pt4${lead >
0
? `−${lead}%X`
: ""})`
}
);
engineConfig?.onActivity?.();
return;
}

const busy =
!!result?.alreadyPending ||
String(
result?.message ||
""
).toLowerCase().includes(
"already pending"
);

state.armed.delete(
fp
);

if(
!busy
){
state.consumed.add(
fp
);
}

pushSignal(
{
ts:
Date.now(),
symbol:
sym,
side:
setup.side,
price:
Number(
setup.p4
),
text:
busy
? `${sym} ${setup.side}: alert busy — сетап ждёт`
: `${sym} ${setup.side}: ALERT FAIL — ${result?.message ||
"error"}`
}
);
engineConfig?.onActivity?.();

}

function isManualTradingMode(){

return (
engineConfig?.tradingMode ||
getAlgoTradingMode()
) ===
"manual";

}

async function cancelArmedSetup(
sym,
fp,
side,
price,
text,
opts =
{}
){

const soft =
!!opts.soft;
const skipRearm =
!!opts.skipRearm;
const state =
getState(
sym
);
const row =
state.armed.get(
fp
);
let cancelResult;

if(
isManualTradingMode()
){
cancelResult =
await alertBridge.removeBotAlert(
{
symbol:
sym,
shapeId:
row?.alertShapeId,
fingerprint:
fp
}
);
}else{
cancelResult =
await orderExecutor.cancelBotTrigger(
sym,
{
fingerprint:
fp
}
);
}

const cancelOk =
cancelResult?.ok !==
false;
pushSignal(
{
ts:
Date.now(),
symbol:
sym,
side,
price,
text:
cancelOk
? text
: `${text} (cancel fail: ${cancelResult?.message ||
"error"})`
}
);

if(
cancelOk
){
if(
!soft
){
state.consumed.add(
fp
);
}

state.armed.delete(
fp
);

if(
!isManualTradingMode() &&
!skipRearm &&
state.parkedParent &&
state.parkedParent.fingerprint !==
fp
){
void tryRearmParkedParent(
sym,
"rearm-after-nested-cancel"
);
}
}

engineConfig?.onActivity?.();
return cancelOk;

}

/**
 * Manual disarm from Status UI — cancel trigger + consume fingerprint.
 * @param {{ symbol?: string, side?: string, b4?: number, p4?: number, fingerprint?: string }} payload
 */
async function disarmArmedSetup(
payload =
{}
){

const sym =
normalizeSymbol(
payload?.symbol
);

if(
!sym
){
return {
ok:
false,
message:
"symbol required"
};
}

const state =
getState(
sym
);
let fp =
String(
payload?.fingerprint ||
""
).trim();

if(
!fp ||
!state.armed.has(
fp
)
){
const wantSide =
payload?.side ===
"short"
? "short"
: payload?.side ===
"long"
? "long"
: "";
const wantB4 =
Number(
payload?.b4
);
const wantP4 =
Number(
payload?.p4
);

fp =
"";

for(
const [
key,
entry
] of state.armed.entries()
){

const setup =
entry?.setup ||
{};
const side =
setup.side ===
"short"
? "short"
: "long";

if(
wantSide &&
side !==
wantSide
){
continue;
}

if(
Number.isFinite(
wantB4
) &&
Number(
setup.b4
) !==
wantB4
){
continue;
}

if(
Number.isFinite(
wantP4
) &&
Number(
setup.p4
) !==
wantP4
){
continue;
}

fp =
key;
break;

}

}

if(
!fp ||
!state.armed.has(
fp
)
){
return {
ok:
false,
message:
"сетап не в armed"
};
}

const entry =
state.armed.get(
fp
);
const setup =
entry?.setup ||
{};
const side =
setup.side ===
"short"
? "short"
: "long";
const price =
Number(
setup.p4
);

/*
 * Cancel exchange trigger / alert, then always session-ignore —
 * even if cancel already-gone, so the same setup cannot re-arm
 * after candle-index trim / rescan in this bot run.
 */
if(
isManualTradingMode()
){
await alertBridge.removeBotAlert(
{
symbol:
sym,
shapeId:
entry?.alertShapeId,
fingerprint:
fp
}
);
}else{
await orderExecutor.cancelBotTrigger(
sym
);
}

state.armed.delete(
fp
);
state.consumed.add(
fp
);
ignoreSetupForSession(
fp
);

const stableFp =
setupFingerprint(
sym,
setup,
state.candles
);

if(
stableFp
){
state.consumed.add(
stableFp
);
ignoreSetupForSession(
stableFp
);
}

pushSignal(
{
ts:
Date.now(),
symbol:
sym,
side,
price:
Number.isFinite(
price
)
? price
: 0,
text:
`${sym} ${side}: снято вооружение вручную — игнор в этой сессии`
}
);
engineConfig?.onActivity?.();

return {
ok:
true,
...getEngineStatus()
};

}

async function cancelOtherArmedOnEntry(
sym,
keepFp
){

const state =
getState(
sym
);

for(
const [
otherFp,
row
] of [
...state.armed
]
){

if(
otherFp ===
keepFp
){
continue;
}

await cancelArmedSetup(
sym,
otherFp,
normalizeSetupSide(
row?.setup?.side
),
Number(
row?.triggerPrice ||
row?.setup?.p4
),
`${sym} ${normalizeSetupSide(
row?.setup?.side
)}: снят — вход в другую сторону`,
{
skipRearm:
true
}
);
}

state.parkedParent =
null;

if(
!isManualTradingMode()
){
await orderExecutor.cancelSiblingTriggers?.(
sym,
keepFp
);
}

}

async function handleTriggerFill(
sym,
side,
setup,
p4,
fp,
state
){

if(
isManualTradingMode()
){
alertBridge.forgetPendingAlert(
fp
);
entriesCount +=
1;
await cancelOtherArmedOnEntry(
sym,
fp
);
state.consumed.add(
fp
);
state.armed.delete(
fp
);
pushSignal(
{
ts:
Date.now(),
symbol:
sym,
side,
price:
p4,
text:
`${sym} ${side}: ALERT ENTRY @ ${Number(
p4
).toFixed(
4
)} — вход вручную`
}
);
engineConfig?.onActivity?.();
return;
}

if(
inPositionSymbols.has(
sym
)
){
const done =
await orderExecutor.finalizeTriggerFill(
sym,
{
avgPrice:
p4
}
);

if(
done?.ok
){
entriesCount +=
1;
pushSignal(
{
ts:
Date.now(),
symbol:
sym,
side,
price:
done.entry,
text:
done.stopsOk ===
false
? `${sym} ${side}: FILL @ ${Number(
done.entry
).toFixed(
4
)} — SL/TP FAIL (${done.stopsMessage ||
"error"})`
: `${sym} ${side}: FILL @ ${Number(
done.entry
).toFixed(
4
)} SL=${Number(
done.slPrice
).toFixed(
4
)} TP=${Number(
done.tpPrice
).toFixed(
4
)}`
}
);
}

await cancelOtherArmedOnEntry(
sym,
fp
);
state.consumed.add(
fp
);
state.armed.delete(
fp
);
engineConfig?.onActivity?.();
return;
}

pushSignal(
{
ts:
Date.now(),
symbol:
sym,
side,
price:
p4,
text:
`${sym} ${side}: уровень pt4 — ждём fill триггера`
}
);

}

async function processArmedOnBar(
symbol,
prev,
cur,
barIndex
){

const state =
getState(
symbol
);
const sym =
state.symbol;

for(
const [
fp,
row
] of [
...state.armed
]
){

const setup =
row.setup;
const side =
setup.side ===
"short"
? "short"
: "long";
const p3 =
Number(
setup.p3
);
const p4 =
Number(
row.triggerPrice
);
const p4Pattern =
Number(
setup.p4
);
const entryLevel =
Number.isFinite(
p4
) &&
p4 >
0
? p4
: p4Pattern;
const b4 =
Number(
setup.b4
);
const timeoutBars =
clampEntryTimeoutBars(
engineConfig?.timeoutBars
);
const stateCandles =
state.candles;
const b4Time =
resolveArmedB4Time(
row,
setup,
stateCandles,
fp
);
const formingForTimeout =
state.forming &&
cur &&
Number(
cur.time
) ===
Number(
state.forming.time
)
? state.forming
: null;
const barsAfterB4 =
Number.isFinite(
b4Time
)
? countBarsAfterB4Time(
stateCandles,
formingForTimeout,
b4Time
)
: Number.isFinite(
b4
)
? barIndex -
b4
: 0;

if(
barsAfterB4 >
timeoutBars
){
await cancelArmedSetup(
sym,
fp,
side,
p4,
`${sym} ${side}: timeout — ${isManualTradingMode()
? "алерт снят"
: "триггер снят"}`
);
continue;
}

if(
side ===
"long" &&
Number.isFinite(
cur.low
) &&
cur.low <
p3
){
await cancelArmedSetup(
sym,
fp,
side,
p3,
`${sym} ${side}: отмена (ниже pt3) — ${isManualTradingMode()
? "алерт снят"
: "триггер снят"}`
);
continue;
}

if(
side ===
"short" &&
Number.isFinite(
cur.high
) &&
cur.high >
p3
){
await cancelArmedSetup(
sym,
fp,
side,
p3,
`${sym} ${side}: отмена (выше pt3) — ${isManualTradingMode()
? "алерт снят"
: "триггер снят"}`
);
continue;
}

if(
!passesSupertrendEntryGate(
sym,
setup,
stateCandles,
cur
)
){
await cancelArmedSetup(
sym,
fp,
side,
entryLevel,
`${sym} ${side}: Supertrend больше не подтверждает вход — ${
isManualTradingMode()
? "алерт снят"
: "триггер снят"
}`,
{
soft:
true
}
);
continue;
}

if(
prev &&
cur &&
isEntryCross(
side,
prev,
cur,
entryLevel
)
){
await handleTriggerFill(
sym,
side,
setup,
entryLevel,
fp,
state
);
}

}

}

/**
 * Called from bot poll when positions update — finalize fills + clear armed.
 * @param {Array} positions
 */
async function onPositionsSynced(
positions
){

const reports =
await orderExecutor.reconcileTriggersAndStops(
positions
);

for(
const report of reports
){

if(
report?.action ===
"finalize-fill" &&
report?.ok
){
entriesCount +=
1;
const sym =
normalizeSymbol(
report.symbol
);
const state =
getState(
sym
);

for(
const fp of [
...state.armed.keys()
]
){
state.armed.delete(
fp
);
state.consumed.add(
fp
);
}

inPositionSymbols.add(
sym
);
pushSignal(
{
ts:
Date.now(),
symbol:
sym,
side:
report.side,
price:
report.entry,
text:
report.stopsOk ===
false
? `${sym} ${report.side}: FILL @ ${Number(
report.entry
).toFixed(
4
)} — SL/TP FAIL (${report.stopsMessage ||
"error"})`
: `${sym} ${report.side}: FILL @ ${Number(
report.entry
).toFixed(
4
)} SL=${Number(
report.slPrice
).toFixed(
4
)} TP=${Number(
report.tpPrice
).toFixed(
4
)}`
}
);
}else if(
report?.action ===
"trail-sl"
){
pushSignal(
{
ts:
Date.now(),
symbol:
report.symbol,
side:
"—",
price:
Number(
report.slPrice
) ||
0,
text:
report.ok
? `${report.symbol}: ${report.message ||
"trail SL"} → ${Number(
report.slPrice
).toFixed(
4
)}`
: `${report.symbol}: trail SL FAIL — ${report.message ||
"error"}`
}
);
}else if(
report?.action ===
"attach-stops" &&
report?.ok
){
pushSignal(
{
ts:
Date.now(),
symbol:
report.symbol,
side:
"—",
price:
report.slPrice,
text:
`${report.symbol}: восстановлены SL/TP`
}
);
}else if(
(
report?.action ===
"attach-stops" ||
report?.action ===
"missing-stops"
) &&
report?.ok ===
false
){
pushSignal(
{
ts:
Date.now(),
symbol:
report.symbol,
side:
"—",
price:
0,
text:
`${report.symbol}: нет SL/TP — ${report.message ||
"ошибка"}`
}
);
}else if(
report?.action ===
"trigger-gone"
){
const sym =
normalizeSymbol(
report.symbol
);
const state =
getState(
sym
);
const fp =
String(
report.fingerprint ||
""
);

if(
fp &&
state.armed.has(
fp
)
){
state.armed.delete(
fp
);
state.consumed.add(
fp
);
}else{
for(
const armedFp of [
...state.armed.keys()
]
){
state.armed.delete(
armedFp
);
state.consumed.add(
armedFp
);
}

}

pushSignal(
{
ts:
Date.now(),
symbol:
sym,
side:
report.side ||
"—",
price:
0,
text:
`${sym}${report.side
? ` ${report.side}`
: ""}: ${report.message ||
"триггер Rejected/снят на Bybit"}`
}
);
}

}

if(
reports.length
){
engineConfig?.onActivity?.();
}

return reports;

}

async function armAllPendingSetups(
symbol,
source =
"live"
){

if(
!patternEntry ||
!patternMath
){
return;
}

const state =
getState(
symbol
);
const candles =
state.candles;

if(
candles.length <
3
){
return;
}

const settings =
getPatternSettings();
const scene =
patternMath.computePattern12Scene(
candles,
settings
);
const setups =
Array.isArray(
scene?.setups
)
? scene.setups
: [];
const timeoutBars =
clampEntryTimeoutBars(
engineConfig?.timeoutBars
);
const resolveOpts =
getResolveOpts(
symbol
);

if(
!resolveOpts
){
return;
}

const pullbackOn =
!!resolveOpts.pullbackBeforeArm;
const lastIndex =
candles.length -
1;

for(
const setup of setups
){

const b4 =
Number(
setup.b4
);

if(
!Number.isFinite(
b4
) ||
b4 <
0 ||
b4 >
lastIndex
){
continue;
}

/*
 * Brand-new pt4 on the latest closed bar: arm immediately (unless
 * pullback-before-arm is on — then wait for pullback via tryArmSetup).
 * Older setups: arm only while still pending (no entry / cancel / timeout).
 * Pattern recognition often finalizes a setup a few bars AFTER b4,
 * so live scan must not require b4 === lastIndex.
 */
if(
b4 <
lastIndex ||
pullbackOn
){
const event =
patternEntry.resolvePatternSetupEvent(
candles,
setup,
resolveOpts
);

if(
event
){
const fp =
setupFingerprint(
symbol,
setup,
candles
);
const state =
getState(
symbol
);
const barsAfterPt4 =
lastIndex -
b4;
const reason =
event.type ===
"entry"
? "вход уже был до arm"
: event.reason ===
"timeout"
? "таймаут окна входа"
: event.reason ===
"below_pt3"
? "отмена ниже pt3"
: event.reason ===
"above_pt3"
? "отмена выше pt3"
: event.reason ===
"pt4_before_pullback"
? "pt4 до отката"
: event.reason ===
"max_pt1_pt4"
? (
()=>{
const limit =
clampMaxPt1Pt4Bars(
engineConfig?.maxPt1Pt4Bars
);
const b1 =
Number(
setup.b1
);
const b4n =
Number(
setup.b4
);
const span =
Number.isFinite(
b1
) &&
Number.isFinite(
b4n
)
? b4n -
b1
: null;

if(
limit !=
null &&
span !=
null
){
return `pt1→pt4 слишком длинный (${span}>${limit})`;
}

return "pt1→pt4 слишком длинный";
}
)()
: "сетап уже закрыт";
const alive =
barsAfterPt4 <=
timeoutBars;

if(
!isFingerprintBlocked(
state,
fp
)
){
if(
alive
){
pushSignal(
{
ts:
Date.now(),
symbol:
state.symbol,
side:
setup.side,
price:
Number(
setup.p4
),
text:
`${state.symbol} ${setup.side}: ${reason} — не вооружаем (${source})`
}
);
}
state.consumed.add(
fp
);
}

continue;
}
}

await tryArmSetup(
symbol,
setup,
source
);

}

}

async function seedSymbol(
symbol
){

const state =
getState(
symbol
);
const limit =
getMaxHistory(
engineConfig?.timeoutBars
);

const result =
await algoRest.fetchKlineHistoryDeep(
symbol,
engineConfig?.tf,
PATTERN_HISTORY_REQUESTS
);

if(
!result?.ok ||
!Array.isArray(
result.candles
)
){
const msg =
result?.message ||
"empty";
log.warn(
"algo bot seed kline:",
symbol,
msg
);
pushSignal(
{
ts:
Date.now(),
symbol:
normalizeSymbol(
symbol
),
side:
"—",
price:
0,
text:
`${normalizeSymbol(
symbol
)}: seed kline FAIL — ${msg}`
}
);
return;
}

state.candles =
trimCandles(
result.candles,
limit
);
state.seeded =
true;
state.needsResync =
false;

await armAllPendingSetups(
symbol,
"seed"
);

if(
klineHub &&
engineConfig
){
klineHub.ensureKline(
state.symbol,
engineConfig.tf
);
}

engineConfig?.onActivity?.();

}

async function resyncSymbolCandles(
symbol
){

const state =
getState(
symbol
);

if(
!engineConfig
){
return;
}

const result =
await algoRest.fetchKlineHistoryDeep(
symbol,
engineConfig.tf,
PATTERN_HISTORY_REQUESTS
);

if(
!result?.ok ||
!Array.isArray(
result.candles
) ||
!result.candles.length
){
log.warn(
"algo bot resync kline:",
symbol,
result?.message ||
"empty"
);
return;
}

const byTime =
new Map(
state.candles.map(
c=>[
c.time,
c
]
)
);

for(
const bar of result.candles
){
byTime.set(
bar.time,
{
time:
bar.time,
open:
bar.open,
high:
bar.high,
low:
bar.low,
close:
bar.close
}
);
}

const limit =
getMaxHistory(
engineConfig.timeoutBars
);
state.candles =
trimCandles(
[
...byTime.values()
].sort(
(
a,
b
)=>
a.time -
b.time
),
limit
);
state.needsResync =
false;
state.seeded =
true;

await armAllPendingSetups(
symbol,
"resync"
);
engineConfig?.onActivity?.();

}

function queueResyncAllSeeded(){

if(
!engineConfig
){
return;
}

for(
const sym of symbolStates.keys()
){

const state =
symbolStates.get(
sym
);

if(
!state?.seeded
){
continue;
}

state.needsResync =
true;

if(
!resyncQueue.includes(
sym
)
){
resyncQueue.push(
sym
);
}

}

void drainResyncQueue();

}

async function drainResyncQueue(){

while(
resyncInflight <
SEED_CONCURRENCY &&
resyncQueue.length
){

const sym =
resyncQueue.shift();

if(
!sym
){
continue;
}

resyncInflight++;

try{
await resyncSymbolCandles(
sym
);
}catch(
err
){
log.warn(
"algo bot resync:",
sym,
err?.message ||
err
);
}finally{
resyncInflight--;
}

}

if(
resyncQueue.length
){
void drainResyncQueue();
}

}

function onKline(
symbol,
tf,
candle
){

if(
!engineConfig
){
return;
}

if(
normalizeTf(
tf
) !==
normalizeTf(
engineConfig.tf
)
){
return;
}

const state =
getState(
symbol
);

if(
state.needsResync
){
const sym =
state.symbol;

if(
!resyncQueue.includes(
sym
)
){
resyncQueue.push(
sym
);
void drainResyncQueue();
}
}

const kind =
mergeKline(
state,
candle
);

if(
kind ===
"closed"
){
void armAllPendingSetups(
symbol,
"live"
).catch(
err=>{
log.warn(
"algo bot scan close:",
symbol,
err?.message ||
err
);
}
);

const closedIndex =
state.candles.length -
1;
const prev =
closedIndex >
0
? state.candles[
closedIndex -
1
]
: null;
const cur =
state.candles[
closedIndex
];

void processArmedOnBar(
symbol,
prev,
cur,
closedIndex
).catch(
err=>{
log.warn(
"algo bot process armed:",
symbol,
err?.message ||
err
);
}
);
return;
}

const candles =
state.candles;

if(
!candles.length ||
!state.forming
){
return;
}

const prev =
candles[
candles.length -
1
];
const cur =
state.forming;
const barIndex =
candles.length;

void processArmedOnBar(
symbol,
prev,
cur,
barIndex
).catch(
err=>{
log.warn(
"algo bot process armed:",
symbol,
err?.message ||
err
);
}
);

}

function queueSeedSymbol(
symbol
){

const sym =
normalizeSymbol(
symbol
);

if(
!sym
){
return;
}

if(
seedQueue.includes(
sym
)
){
return;
}

seedQueue.push(
sym
);
void drainSeedQueue();

}

async function drainSeedQueue(){

while(
seedInflight <
SEED_CONCURRENCY &&
seedQueue.length
){

const sym =
seedQueue.shift();

if(
!sym
){
continue;
}

seedInflight++;

try{
await seedSymbol(
sym
);
}catch(
err
){
log.warn(
"algo bot seed:",
sym,
err?.message ||
err
);
}finally{
seedInflight--;

if(
seedQueue.length
){
void drainSeedQueue();
}

}

}

}

function syncWatchlist(
symbols,
opts =
{}
){

if(
!engineConfig ||
!klineHub
){
return;
}

if(
opts &&
typeof opts ===
"object"
){
if(
opts.symbolAllowedSides &&
typeof opts.symbolAllowedSides ===
"object"
){
engineConfig.symbolAllowedSides =
opts.symbolAllowedSides;
}

if(
opts.sides &&
typeof opts.sides ===
"object"
){
engineConfig.sides =
opts.sides;
}

if(
opts.side !=
null
){
engineConfig.side =
opts.side;
}

if(
opts.useFavorites !=
null
){
engineConfig.useFavorites =
!!opts.useFavorites;
}
}

const list =
[
...new Set(
(
Array.isArray(
symbols
)
? symbols
: []
).map(
normalizeSymbol
).filter(
Boolean
)
)
];

klineHub.syncTopics(
list,
engineConfig.tf
);

for(
const sym of symbolStates.keys()
){

if(
!list.includes(
sym
)
){
symbolStates.delete(
sym
);
}

}

for(
const sym of list
){

const state =
getState(
sym
);

if(
!state.seeded
){
queueSeedSymbol(
sym
);
}else{
klineHub.ensureKline(
sym,
engineConfig.tf
);
}

}

}

function setInPositionSymbols(
symbols
){

const next =
new Set(
(
Array.isArray(
symbols
)
? symbols
: []
).map(
normalizeSymbol
).filter(
Boolean
)
);

const left =
[];

for(
const sym of inPositionSymbols
){

if(
!next.has(
sym
)
){
left.push(
sym
);
}

}

inPositionSymbols =
next;

/*
  Live only — Rule 2: after nested trade closes, re-arm parked parent if still valid.
*/
if(
!isManualTradingMode()
){
for(
const sym of left
){
void tryRearmParkedParent(
sym,
"rearm-after-nested-close"
);
}
}

}

async function startPatternEngine(
config
){

await stopPatternEngine();

if(
!config?.tickerBook ||
typeof config.tickerBook !==
"object" ||
!Object.keys(
config.tickerBook
).length
){
throw new Error(
"Нет книги параметров тикеров — бот не запущен"
);
}

const sessionTf =
String(
config?.tf ||
""
).trim();

if(
!sessionTf ||
Object.values(
config.tickerBook
).some(
row=>
String(
row?.tf ||
""
).trim() !==
sessionTf
)
){
throw new Error(
"Таймфрейм исполнения должен одинаково храниться в каждой строке книги"
);
}

engineConfig =
{
side:
config?.side ||
"long",
sides:
config?.sides &&
typeof config.sides ===
"object"
? config.sides
: {
long:
(
config?.side ||
"long"
) ===
"long",
short:
(
config?.side ||
"long"
) ===
"short",
both:
(
config?.side ||
"long"
) ===
"both"
},
useFavorites:
!!config?.useFavorites,
symbolAllowedSides:
config?.symbolAllowedSides &&
typeof config.symbolAllowedSides ===
"object"
? config.symbolAllowedSides
: {},
tf:
sessionTf,
timeoutBars:
clampEntryTimeoutBars(
config?.timeoutBars
),
maxPt1Pt4Bars:
clampMaxPt1Pt4Bars(
config?.maxPt1Pt4Bars
),
/* TEMP_PULLBACK_BEFORE_ARM */
pullbackBeforeArm:
!!config?.pullbackBeforeArm,
pullbackBeforeArmPct:
(()=>{
const n =
Number(
config?.pullbackBeforeArmPct
);
if(
!Number.isFinite(
n
)
){
return 38.2;
}
return Math.min(
100,
Math.max(
1,
Math.round(
n *
10
) /
10
)
);
})(),
slPct:
Number(
config?.slPct
),
tpRr:
Number(
config?.tpRr
),
alertLeadPct:
(()=>{
const n =
Number(
config?.alertLeadPct
);

if(
!Number.isFinite(
n
) ||
n <
0
){
return 5;
}

return Math.min(
10,
n
);
})(),
strategyId:
String(
config?.strategyId ||
"st1"
),
exitProfile:
config?.exitProfile ||
{
kind:
"rr",
tpRr:
Number(
config?.tpRr
)
},
riskUsd:
Number(
config?.riskUsd
),
minTurnover24hUsdt:
(()=>{
const n =
Number(
config?.minTurnover24hUsdt
);

if(
!Number.isFinite(
n
) ||
n <
0
){
return 20_000_000;
}

return n;
})(),
patternSettings:
config?.patternSettings ||
null,
tradingMode:
config?.tradingMode ===
"manual"
? "manual"
: "live",
entriesPaused:
false,
tickerBook:
config?.tickerBook &&
typeof config.tickerBook ===
"object"
? config.tickerBook
: null,
onActivity:
config?.onActivity ||
null
};

entriesCount =
0;
signalLog.length =
0;
symbolStates.clear();
turnoverCache.clear();
illiquidSignalAt.clear();
seedQueue =
[];
seedInflight =
0;
resyncQueue =
[];
resyncInflight =
0;

sessionIgnoredFingerprints.clear();

sessionDecisionLogs.clear();

if(
isManualTradingMode()
){
const clearAlerts =
await alertBridge.clearAllAlgoBotAlerts();

pushSignal(
{
ts:
Date.now(),
symbol:
"",
side:
"long",
price:
0,
text:
clearAlerts?.ok ===
false
? `Старт: очистка алертов — ${clearAlerts?.message ||
"ошибка"}`
: `Старт: снято алертов бота — ${Number(
clearAlerts?.removed
) ||
0}`
}
);
}else{
const clearTriggers =
await orderExecutor.cancelAllOpenTriggerOrders();

pushSignal(
{
ts:
Date.now(),
symbol:
"",
side:
"long",
price:
0,
text:
clearTriggers?.ok ===
false
? `Старт: очистка триггеров — ${clearTriggers?.message ||
"ошибка"}`
: `Старт: снято триггеров — ${Number(
clearTriggers?.cancelled
) ||
0}/${Number(
clearTriggers?.total
) ||
0}`
}
);
}

await ensurePatternModules();

klineHub =
createAlgoBybitKlineHub();
unsubKline =
klineHub.onKline(
onKline
);
klineHub.setOnReconnect?.(
()=>{
sessionLog.appendNote(
"kline WS: переподключение → resync свечей"
);
queueResyncAllSeeded();
}
);

barCloseSweep =
createBarCloseSweep(
{
getEngineConfig:
()=>
engineConfig,
getSymbolStates:
()=>
symbolStates,
getState,
tfStepSeconds,
normalizeTf,
getMaxHistory,
trimCandles,
armAllPendingSetups,
processArmedOnBar,
fetchKlineHistory:
(
symbol,
tf,
limit
)=>
algoRest.fetchKlineHistory(
symbol,
tf,
limit
),
appendNote:
(
text
)=>
sessionLog.appendNote(
text
),
concurrency:
SEED_CONCURRENCY
}
);
barCloseSweep.schedule();

syncWatchlist(
config?.symbols ||
[],
{
symbolAllowedSides:
engineConfig.symbolAllowedSides,
sides:
engineConfig.sides,
useFavorites:
engineConfig.useFavorites,
side:
engineConfig.side
}
);

log.info(
"algo bot pattern engine started",
{
tf:
engineConfig.tf,
side:
engineConfig.side,
symbols:
(
config?.symbols ||
[]
).length
}
);

}

async function stopPatternEngine(){

/*
 * Same thorough cleanup as start: in-memory pending maps can miss orphans
 * (timeout place, Quit/agent restart). Manual → all source=algo-bot alerts;
 * live → every open algo trigger on the exchange.
 */
if(
isManualTradingMode()
){
await alertBridge.clearAllAlgoBotAlerts();
}else{
await orderExecutor.cancelAllOpenTriggerOrders();
await orderExecutor.cancelAllBotTriggers();
}

if(
unsubKline
){
unsubKline();
unsubKline =
null;
}

if(
klineHub
){
klineHub.close();
klineHub =
null;
}

if(
barCloseSweep
){
barCloseSweep.clear();
barCloseSweep =
null;
}

engineConfig =
null;
symbolStates.clear();
turnoverCache.clear();
illiquidSignalAt.clear();
sessionIgnoredFingerprints.clear();
sessionDecisionLogs.clear();
seedQueue =
[];
seedInflight =
0;
resyncQueue =
[];
resyncInflight =
0;

}

function updateEngineConfig(
patch
){

if(
!engineConfig ||
!patch ||
typeof patch !==
"object"
){
return;
}

if(
patch.patternSettings !=
null
){
engineConfig.patternSettings =
patch.patternSettings;
}

if(
patch.timeoutBars !=
null
){
engineConfig.timeoutBars =
clampEntryTimeoutBars(
patch.timeoutBars
);
}

if(
Object.prototype.hasOwnProperty.call(
patch,
"maxPt1Pt4Bars"
)
){
engineConfig.maxPt1Pt4Bars =
clampMaxPt1Pt4Bars(
patch.maxPt1Pt4Bars
);
}

/* TEMP_PULLBACK_BEFORE_ARM */
if(
patch.pullbackBeforeArm !=
null
){
engineConfig.pullbackBeforeArm =
!!patch.pullbackBeforeArm;
}

if(
patch.pullbackBeforeArmPct !=
null
){
const n =
Number(
patch.pullbackBeforeArmPct
);
if(
Number.isFinite(
n
)
){
engineConfig.pullbackBeforeArmPct =
Math.min(
100,
Math.max(
1,
Math.round(
n *
10
) /
10
)
);
}
}

if(
patch.slPct !=
null
){
engineConfig.slPct =
Number(
patch.slPct
);
}

if(
patch.tpRr !=
null
){
engineConfig.tpRr =
Number(
patch.tpRr
);
}

if(
patch.exitProfile !=
null
){
engineConfig.exitProfile =
patch.exitProfile;
}

if(
Object.prototype.hasOwnProperty.call(
patch,
"tickerBook"
)
){
engineConfig.tickerBook =
patch.tickerBook &&
typeof patch.tickerBook ===
"object"
? patch.tickerBook
: null;
}

if(
patch.strategyId !=
null
){
engineConfig.strategyId =
String(
patch.strategyId
);
}

if(
patch.riskUsd !=
null
){
engineConfig.riskUsd =
Number(
patch.riskUsd
);
}

if(
patch.minTurnover24hUsdt !=
null
){
const n =
Number(
patch.minTurnover24hUsdt
);

engineConfig.minTurnover24hUsdt =
Number.isFinite(
n
) &&
n >=
0
? n
: 20_000_000;
}

if(
patch.side !=
null
){
engineConfig.side =
patch.side;
}

if(
patch.sides !=
null &&
typeof patch.sides ===
"object"
){
engineConfig.sides =
patch.sides;
}

if(
patch.symbolAllowedSides !=
null &&
typeof patch.symbolAllowedSides ===
"object"
){
engineConfig.symbolAllowedSides =
patch.symbolAllowedSides;
}

if(
patch.useFavorites !=
null
){
engineConfig.useFavorites =
!!patch.useFavorites;
}

if(
patch.entriesPaused !=
null
){
engineConfig.entriesPaused =
!!patch.entriesPaused;
}

}

module.exports =
{
startPatternEngine,
stopPatternEngine,
syncWatchlist,
updateEngineConfig,
setInPositionSymbols,
onPositionsSynced,
getEngineStatus,
disarmArmedSetup,
resetEngineSession(){
entriesCount =
0;
signalLog.length =
0;
sessionIgnoredFingerprints.clear();
for(
const state of symbolStates.values()
){
state.armed.clear();
state.consumed.clear();
state.parkedParent =
null;
}
sessionDecisionLogs.clear();
if(
isManualTradingMode()
){
void alertBridge.clearAllAlgoBotAlerts();
}else{
void orderExecutor.cancelAllOpenTriggerOrders();
void orderExecutor.cancelAllBotTriggers();
}
/*
 * Do NOT clearPendingEntries(): open-position meta (SL/TP prices, TP order
 * ids, trail state) must survive Stop→Start. Wiping it left live positions
 * as «no bot meta for SL/TP» every poll and hammered Bybit rate limits.
 */
}
};
