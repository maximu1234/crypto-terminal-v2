/**
 * 1-2 Early T3 bot — alerts only, no orders.
 * Isolated from Pattern 1-2 live engine (algo-bot-pattern-engine.cjs).
 */
const log =
require(
"electron-log"
);
const {
loadEarlyT3PatternModules
} =
require(
"./algo-bot-early-t3-loader.cjs"
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
const alertBridge =
require(
"./algo-bot-alert-bridge.cjs"
);
const sessionLog =
require(
"./algo-bot-session-log.cjs"
);
const {
setupBrokenTowardPt3
} =
require(
"./algo-bot-early-t3-rules.cjs"
);

const HISTORY_REQUESTS =
3;
const MAX_CANDLES =
4000;
const SEED_CONCURRENCY =
6;
const FRESH_PT4_BARS_SEED =
2;
const FRESH_PT4_BARS_LIVE =
3;

/** @type {{ patternMath: object } | null} */
let modules =
null;
/** @type {ReturnType<createAlgoBybitKlineHub>|null} */
let klineHub =
null;
/** @type {(() => void)|null} */
let unsubKline =
null;
/** @type {object|null} */
let engineConfig =
null;
/** @type {Map<string, { symbol: string, candles: object[], forming: object|null, seeded: boolean }>} */
const symbolStates =
new Map();
/** @type {Map<string, { symbol: string, side: string, p3: number, p4: number, shapeId: string }>} */
const armedAlerts =
new Map();
/** @type {Set<string>} */
const ignoredFingerprints =
new Set();
/** @type {Array<{ ts: number, symbol: string, side: string, price: number, text: string }>} */
const signalLog =
[];
const MAX_LOG =
200;
/** @type {string[]} */
let seedQueue =
[];
let seedInflight =
0;
let seedTotal =
0;
let seedDone =
0;
let seedFailNotes =
0;

function emptyStatus(){

return {
armedCount:
0,
watchlistCount:
0,
tf:
"",
alertLeadPct:
5,
minTurnover24hUsdt:
100000,
lastSignal:
"",
signals:
[]
};

}

function pushSignal(
row
){

signalLog.unshift(
row
);

if(
signalLog.length >
MAX_LOG
){
signalLog.length =
MAX_LOG;
}

sessionLog.appendNote?.(
row.text
);

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
{
symbol:
sym,
candles:
[],
forming:
null,
seeded:
false
};
symbolStates.set(
sym,
state
);
}

return state;

}

function trimCandles(
candles
){

if(
candles.length <=
MAX_CANDLES
){
return candles;
}

return candles.slice(
-
MAX_CANDLES
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

function interpolateLogPrice(
a,
b,
t
){

if(
!(
a >
0
) ||
!(
b >
0
)
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

function getPatternSettings(){

const math =
modules?.patternMath;
const raw =
engineConfig?.patternSettings;

if(
raw &&
math?.normalizePattern12Settings
){
return math.normalizePattern12Settings(
raw
);
}

if(
math?.defaultPattern12Settings
){
return math.defaultPattern12Settings();
}

return {};

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
Number(
last.time
) ===
Number(
bar.time
)
){
state.candles[
state.candles.length -
1
] =
bar;
}else if(
!last ||
Number(
bar.time
) >
Number(
last.time
)
){
state.candles.push(
bar
);
}

state.candles =
trimCandles(
state.candles
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

async function cancelArmedAlert(
fp,
text
){

const row =
armedAlerts.get(
fp
);

if(
!row
){
return;
}

const result =
await alertBridge.removeBotAlert(
{
symbol:
row.symbol,
shapeId:
row.shapeId,
fingerprint:
fp
}
);

armedAlerts.delete(
fp
);
ignoredFingerprints.add(
fp
);

if(
result?.ok !==
false
){
pushSignal(
{
ts:
Date.now(),
symbol:
row.symbol,
side:
row.side,
price:
row.p3,
text:
text ||
`${row.symbol} ${row.side}: отмена (коробка t3–t4 → t3) — алерт снят`
}
);
engineConfig?.onActivity?.();
}

}

async function processArmedCancels(
symbol,
candle
){

if(
!candle
){
return;
}

const sym =
normalizeSymbol(
symbol
);

for(
const [
fp,
row
] of [
...armedAlerts
]
){

if(
row.symbol !==
sym
){
continue;
}

if(
!setupBrokenTowardPt3(
row.side,
candle,
row.p3
)
){
continue;
}

const why =
row.side ===
"short"
? "выше pt3"
: "ниже pt3";

await cancelArmedAlert(
fp,
`${row.symbol} ${row.side}: отмена (${why}) — алерт снят`
);

}

}

async function placeAlert(
sym,
setup,
fp
){

if(
ignoredFingerprints.has(
fp
) ||
armedAlerts.has(
fp
)
){
return;
}

const lead =
Number(
engineConfig?.alertLeadPct
);
const side =
setup.side ===
"short"
? "short"
: "long";
const alertPrice =
computeManualAlertPrice(
setup,
lead
);
const pt4 =
Number(
setup.p4
);
const p3 =
Number(
setup.p3
);
const price =
Number.isFinite(
alertPrice
)
? alertPrice
: pt4;

if(
!(
price >
0
) ||
!(
p3 >
0
)
){
return;
}

const result =
await alertBridge.placeBotAlert(
{
symbol:
sym,
side,
price,
tf:
engineConfig?.tf ||
"5",
fingerprint:
fp
}
);

if(
result?.ok
){
armedAlerts.set(
fp,
{
symbol:
sym,
side,
p3,
p4:
pt4,
shapeId:
String(
result.shapeId ||
""
)
}
);
pushSignal(
{
ts:
Date.now(),
symbol:
sym,
side,
price,
text:
`${sym} ${side}: ALERT @ ${price} (до pt4 ${Number.isFinite(
lead
)
? lead
: 5}% X)`
}
);
engineConfig?.onActivity?.();
}

}

async function scanSymbol(
symbol,
freshBars
){

const math =
modules?.patternMath;

if(
!math?.computePattern12Scene ||
!engineConfig
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
20
){
return;
}

const scene =
math.computePattern12Scene(
candles,
getPatternSettings()
);
const setups =
Array.isArray(
scene?.setups
)
? scene.setups
: [];
const lastIndex =
candles.length -
1;
const minBar =
Math.max(
0,
lastIndex -
freshBars
);

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
minBar ||
b4 >
lastIndex
){
continue;
}

const fp =
setupFingerprint(
symbol,
setup,
candles
);

await placeAlert(
state.symbol,
setup,
fp
);

if(
armedAlerts.has(
fp
)
){
for(
let i =
b4 +
1;
i <
candles.length;
i++
){
await processArmedCancels(
state.symbol,
candles[
i
]
);

if(
!armedAlerts.has(
fp
)
){
break;
}

}
}

}

}

async function seedSymbol(
symbol
){

const state =
getState(
symbol
);
const result =
await algoRest.fetchKlineHistoryDeep(
symbol,
engineConfig?.tf,
HISTORY_REQUESTS
);

if(
!result?.ok ||
!Array.isArray(
result.candles
)
){
log.warn(
"early t3 seed kline:",
symbol,
result?.message ||
"empty"
);

if(
seedFailNotes <
3
){
seedFailNotes++;
sessionLog.appendNote(
`Early T3 seed fail ${symbol}: ${result?.message || "empty"}`
);
}

return;
}

state.candles =
trimCandles(
result.candles
);
state.seeded =
true;
state.forming =
null;

await scanSymbol(
symbol,
FRESH_PT4_BARS_SEED
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

}

async function drainSeedQueue(){

while(
seedInflight <
SEED_CONCURRENCY &&
seedQueue.length
){

const symbol =
seedQueue.shift();
seedInflight++;

void seedSymbol(
symbol
).catch(
err=>{
log.warn(
"early t3 seed:",
symbol,
err?.message ||
err
);
}
).finally(
()=>{
seedInflight--;
seedDone++;

if(
seedDone ===
seedTotal ||
seedDone %
50 ===
0
){
sessionLog.appendNote(
`Early T3 seed ${seedDone}/${seedTotal}`
);
engineConfig?.onActivity?.();
}

void drainSeedQueue();
}
);

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
const kind =
mergeKline(
state,
candle
);
const watchCandle =
kind ===
"closed"
? state.candles[
state.candles.length -
1
]
: state.forming;

if(
watchCandle
){
void processArmedCancels(
symbol,
watchCandle
).catch(
err=>{
log.warn(
"early t3 cancel:",
symbol,
err?.message ||
err
);
}
);
}

if(
kind ===
"closed"
){
void scanSymbol(
symbol,
FRESH_PT4_BARS_LIVE
).catch(
err=>{
log.warn(
"early t3 scan close:",
symbol,
err?.message ||
err
);
}
);
}

}

async function startEarlyT3Engine(
config
){

await stopEarlyT3Engine();

modules =
await loadEarlyT3PatternModules();

const tf =
normalizeTf(
config?.tf ||
"5"
);
const minTurnover =
Number(
config?.minTurnover24hUsdt
);
const min =
Number.isFinite(
minTurnover
) &&
minTurnover >=
0
? minTurnover
: 100000;
const lead =
Number(
config?.alertLeadPct
);

engineConfig =
{
tf,
alertLeadPct:
Number.isFinite(
lead
) &&
lead >=
0
? Math.min(
10,
lead
)
: 5,
minTurnover24hUsdt:
min,
patternSettings:
config?.patternSettings ||
null,
onActivity:
typeof config?.onActivity ===
"function"
? config.onActivity
: null
};

const tickersResult =
await algoRest.listLinearTickerTurnovers();

if(
!tickersResult?.ok
){
engineConfig =
null;
throw new Error(
tickersResult?.message ||
"Не удалось загрузить тикеры"
);
}

const symbols =
(
tickersResult.tickers ||
[]
).filter(
row=>
Number(
row.turnover24h
) >=
min
).map(
row=>
normalizeSymbol(
row.symbol
)
).filter(
Boolean
);

if(
!symbols.length
){
engineConfig =
null;
throw new Error(
`Нет тикеров с оборотом от ${min} USDT`
);
}

klineHub =
createAlgoBybitKlineHub();
unsubKline =
klineHub.onKline(
onKline
);

seedQueue =
symbols.slice();
seedTotal =
symbols.length;
seedDone =
0;
seedFailNotes =
0;

sessionLog.appendNote(
`Early T3: ${symbols.length} тикеров, ТФ ${tf}, оборот от ${min}`
);
sessionLog.appendNote(
`Early T3 seed 0/${seedTotal}`
);

klineHub.syncTopics(
symbols,
tf
);
void drainSeedQueue();

log.info(
"early t3 engine started",
{
tf,
symbols:
symbols.length,
minTurnover:
min
}
);

}

async function stopEarlyT3Engine(){

await alertBridge.clearAllAlgoBotAlerts();

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
armedAlerts.clear();
ignoredFingerprints.clear();
seedQueue =
[];
seedInflight =
0;
seedTotal =
0;
seedDone =
0;
seedFailNotes =
0;

}

function getEarlyT3EngineStatus(){

if(
!engineConfig
){
return emptyStatus();
}

return {
armedCount:
armedAlerts.size,
watchlistCount:
symbolStates.size,
tf:
engineConfig.tf,
alertLeadPct:
engineConfig.alertLeadPct,
minTurnover24hUsdt:
engineConfig.minTurnover24hUsdt,
lastSignal:
signalLog[
0
]?.text ||
"",
signals:
signalLog.slice(
0,
40
)
};

}

module.exports =
{
startEarlyT3Engine,
stopEarlyT3Engine,
getEarlyT3EngineStatus
};
