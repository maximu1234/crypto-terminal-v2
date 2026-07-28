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
const {
getAlgoTradingMode
} =
require(
"./algo-trading-runtime.cjs"
);

const HISTORY_TAIL =
120;
const MAX_LOG =
50;
const PATTERN_HISTORY_REQUESTS =
5;
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
const SEED_CONCURRENCY =
6;

/** @type {import('../../js/algo-trading/pattern-entry-logic.js')|null} */
let patternEntry =
null;
/** @type {import('../../js/algo-trading/pattern-12-math.js')|null} */
let patternMath =
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

const armedSetups =
[];

for(
const state of symbolStates.values()
){

if(
!state.armed?.size
){
continue;
}

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
const p4 =
Number(
setup.p4
);

armedSetups.push(
{
symbol:
state.symbol,
side,
b4:
Number.isFinite(
Number(
setup.b4
)
)
? Number(
setup.b4
)
: null,
p4:
Number.isFinite(
p4
)
? p4
: null,
alertShapeId:
entry?.alertShapeId
? String(
entry.alertShapeId
)
: null,
fingerprint:
setupFingerprint(
state.symbol,
{
side,
b4:
setup.b4,
p4:
setup.p4
},
state.candles
)
}
);

}

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
armedSetups.length,
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
patternMath
){
return {
patternEntry,
patternMath
};
}

const loaded =
await loadPatternModules();
patternEntry =
loaded.patternEntry;
patternMath =
loaded.patternMath;

return {
patternEntry,
patternMath
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
 * Mirror parent: prefer parked parent still in box; else active opposite armed.
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

const timeoutBars =
clampEntryTimeoutBars(
engineConfig?.timeoutBars
);

if(
alreadyCrossedAfterB4(
candles,
state.forming,
parent.setup
)
){
return false;
}

const event =
patternEntry.resolvePatternSetupEvent(
candles,
parent.setup,
{
timeoutBars
}
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

if(
inPositionSymbols.has(
sym
)
){
return;
}

if(
engineConfig?.entriesPaused
){
return;
}

if(
!setupSideAllowedForSymbol(
sym,
setup.side
)
){
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
isFingerprintBlocked(
state,
fp
)
){
return;
}

if(
alreadyCrossedAfterB4(
candles,
state.forming,
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
`${sym} ${setup.side}: пропущен вход до arm — сетап отменён`
}
);
state.consumed.add(
fp
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
return;
}

}else if(
orderExecutor.hasEntryInflight?.(
sym
)
){
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
return;
}

if(
orderExecutor.hasEntryInflight?.(
sym
)
){
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
return;
}

}

state.armed.set(
fp,
{
setup,
armedAt:
Date.now(),
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
engineConfig?.slPct,
tpRr:
engineConfig?.tpRr,
exitProfile:
engineConfig?.exitProfile,
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
const pt4 =
Number.isFinite(
Number(
armedAlert?.triggerPrice
)
) &&
Number(
armedAlert.triggerPrice
) >
0
? Number(
armedAlert.triggerPrice
)
: pt4Raw;
const leadPct =
Number(
engineConfig?.alertLeadPct
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
const side =
setup.side ===
"short"
? "short"
: "long";
const alertPrice =
computeManualAlertPrice(
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
const deadline =
b4 +
timeoutBars;

if(
barIndex >
deadline
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
 * Brand-new pt4 on the latest closed bar: arm immediately.
 * Older setups: arm only while still pending (no entry / cancel / timeout).
 * Pattern recognition often finalizes a setup a few bars AFTER b4,
 * so live scan must not require b4 === lastIndex.
 */
if(
b4 <
lastIndex
){
const event =
patternEntry.resolvePatternSetupEvent(
candles,
setup,
{
timeoutBars
}
);

if(
event
){
const recent =
lastIndex -
b4 <=
Math.min(
50,
timeoutBars
);
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

if(
recent &&
!isFingerprintBlocked(
state,
fp
)
){
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
: "сетап уже закрыт";
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
`${state.symbol} ${setup.side}: ${reason} — не вооружаем`
}
);
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
log.warn(
"algo bot seed kline:",
symbol,
result?.message ||
"empty"
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
await algoRest.fetchKlineHistory(
symbol,
engineConfig.tf,
1000
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
config?.tf ||
"5",
timeoutBars:
clampEntryTimeoutBars(
config?.timeoutBars
),
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
queueResyncAllSeeded();
}
);

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

engineConfig =
null;
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
if(
isManualTradingMode()
){
void alertBridge.clearAllAlgoBotAlerts();
}else{
void orderExecutor.cancelAllOpenTriggerOrders();
void orderExecutor.cancelAllBotTriggers();
}
orderExecutor.clearPendingEntries();
}
};
