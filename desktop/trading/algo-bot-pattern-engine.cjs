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

function invalidAtArm(
candles,
setup
){

const b4 =
Number(
setup.b4
);

if(
b4 <
1 ||
b4 >=
candles.length
){
return true;
}

return isEntryCross(
setup.side ===
"short"
? "short"
: "long",
candles[
b4 -
1
],
candles[
b4
],
Number(
setup.p4
)
);

}

function tryArmSetup(
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
orderExecutor.hasPendingTrigger(
sym
) ||
orderExecutor.hasEntryInflight?.(
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
invalidAtArm(
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
`${sym} ${setup.side}: pt4 уже заколот — сетап отменён`
}
);
state.consumed.add(
fp
);
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

state.armed.set(
fp,
{
setup,
armedAt:
Date.now(),
reason,
orderId:
null
}
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
Number(
setup.p4
),
text:
`${sym} ${setup.side}: armed pt4=${Number(
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
fp
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
`${sym} ${setup.side}: TRIGGER @ ${Number(
setup.p4
).toFixed(
4
)} vol≈${Number(
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

async function placeAlertForArmed(
sym,
setup,
fp
){

/*
 * Manual mode only marks the pt4 entry. Partial exits and trailing SL
 * remain a live-order feature; no synthetic trailing alerts are created.
 */
const result =
await alertBridge.placeBotAlert(
{
symbol:
sym,
side:
setup.side ===
"short"
? "short"
: "long",
price:
Number(
setup.p4
),
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
`${sym} ${setup.side}: ALERT @ ${Number(
setup.p4
).toFixed(
4
)}`
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
text
){

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
sym
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
state.consumed.add(
fp
);
state.armed.delete(
fp
);
}

engineConfig?.onActivity?.();

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
setup.p4
);
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
p4
)
){
await handleTriggerFill(
sym,
side,
setup,
p4,
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

tryArmSetup(
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

inPositionSymbols =
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

if(
isManualTradingMode()
){
await alertBridge.cancelAllBotAlerts();
}else{
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
}
if(
isManualTradingMode()
){
void alertBridge.cancelAllBotAlerts();
}else{
void orderExecutor.cancelAllBotTriggers();
}
orderExecutor.clearPendingEntries();
}
};
