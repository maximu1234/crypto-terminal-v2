/**
 * Algo trading bot (main process).
 * Phase A: start/stop, session stats, status UI.
 * Phase B: kline WS, armed setups.
 * Phase C: trigger entry + SL/TP from pt3/pt4.
 * Phase D: auto-refresh watchlist by winrate.
 */
const log =
require(
"electron-log"
);
const {
getAlgoCredentialsStatus
} =
require(
"./algo-exchange-credentials.cjs"
);
const algoRest =
require(
"./algo-bybit-rest.cjs"
);
const {
readBotStrategies,
writeBotStrategies,
readTickerFlagsRoot,
writeTickerFlagsRoot,
mutateTickerFlagSymbol,
clearTickerFlagList,
FLAG_EARLY_T3,
readTickerBook,
writeTickerBook,
readPattern12Settings,
writePattern12Settings,
getWatchlistForSide,
getWatchlistPlan,
enabledSides,
normalizeSt1,
normalizeSt2,
normalizeSt3,
listManualRefreshStrategyIds,
strategyIdToFlagId
} =
require(
"./algo-bot-store.cjs"
);
const patternEngine =
require(
"./algo-bot-pattern-engine.cjs"
);
const earlyT3Engine =
require(
"./algo-bot-early-t3-engine.cjs"
);
const rsiTouchFlipEngine =
require(
"./algo-bot-rsi-touch-flip-engine.cjs"
);
const {
getAlgoTradingMode
} =
require(
"./algo-trading-runtime.cjs"
);
const {
isAlgoLiveTradingEnabled
} =
require(
"./algo-trading-edition.cjs"
);
const orderExecutor =
require(
"./algo-bot-order-executor.cjs"
);
const sessionLog =
require(
"./algo-bot-session-log.cjs"
);
const watchlistRefresh =
require(
"./algo-bot-watchlist-refresh.cjs"
);

function getStrategyPrefs(
strategyId
){

const strategies =
readBotStrategies();

return strategies[
strategyId
] ||
strategies.st1;

}

function getStrategyWatchlistPlan(
exchangeId =
"bybit",
strategyId =
"st1"
){

const prefs =
getStrategyPrefs(
strategyId
);

return getWatchlistPlan(
exchangeId,
{
...prefs,
strategyId
}
);

}

function getStrategyWatchlist(
exchangeId =
"bybit",
strategyId =
"st1"
){

return getStrategyWatchlistPlan(
exchangeId,
strategyId
).symbols;

}

function normalizeSessionBookSymbol(
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

function countSessionTickerBook(
book
){

const tickers =
book?.tickers;

if(
!tickers ||
typeof tickers !==
"object"
){
return 0;
}

return Object.keys(
tickers
).filter(
key=>{
const row =
tickers[
key
];

return row &&
typeof row ===
"object";
}
).length;

}

/**
 * Runtime currently has one kline stream TF per bot session.
 * The source of truth is every ticker row in the frozen book; strategy prefs
 * and book-level metadata are not execution fallbacks.
 * @param {object|null} book
 * @returns {{ ok: boolean, tf?: string, message?: string }}
 */
function resolveSessionTickerBookTf(
book
){

const rows =
Object.values(
book?.tickers ||
{}
).filter(
row=>
row &&
typeof row ===
"object"
);

if(
Number(
book?.version
) <
2 ||
rows.some(
row=>
!Object.prototype.hasOwnProperty.call(
row,
"supertrendLongFilter"
) ||
!Object.prototype.hasOwnProperty.call(
row,
"supertrendLongAtr"
) ||
!Object.prototype.hasOwnProperty.call(
row,
"supertrendLongFactor"
) ||
!Object.prototype.hasOwnProperty.call(
row,
"supertrendLongTf"
) ||
!Object.prototype.hasOwnProperty.call(
row,
"supertrendShortFilter"
) ||
!Object.prototype.hasOwnProperty.call(
row,
"supertrendShortAtr"
) ||
!Object.prototype.hasOwnProperty.call(
row,
"supertrendShortFactor"
) ||
!Object.prototype.hasOwnProperty.call(
row,
"supertrendShortTf"
)
)
){
return {
ok:
false,
message:
"Книга устарела: заново «Применить к боту» и «Загрузить книгу»"
};
}

const tfs =
new Set(
rows.map(
row=>
String(
row.tf ||
""
).trim()
).filter(
Boolean
)
);

if(
!rows.length ||
tfs.size !==
1 ||
rows.some(
row=>
!String(
row.tf ||
""
).trim()
)
){
return {
ok:
false,
message:
"В книге у каждого тикера должен быть один общий таймфрейм"
};
}

return {
ok:
true,
tf:
[
...tfs
][
0
]
};

}

/**
 * Бот торгует только тикеры из книги параметров.
 * @param {string[]} symbols
 * @param {object|null} book
 * @returns {string[]}
 */
function filterSymbolsByTickerBook(
symbols,
book
){

const tickers =
book?.tickers;

if(
!tickers ||
typeof tickers !==
"object"
){
return [];
}

const list =
Array.isArray(
symbols
)
? symbols
: [];

return list.filter(
symbol=>{
const sym =
normalizeSessionBookSymbol(
symbol
);

return !!sym &&
tickers[
sym
] &&
typeof tickers[
sym
] ===
"object";
}
);

}

function syncEngineWatchlist(
strategyId =
runningStrategyId ||
"st1"
){

const plan =
getStrategyWatchlistPlan(
"bybit",
strategyId
);
const symbols =
filterSymbolsByTickerBook(
plan.symbols,
sessionTickerBook
);

patternEngine.syncWatchlist(
symbols,
{
symbolAllowedSides:
plan.symbolAllowedSides,
sides:
plan.sides,
useFavorites:
plan.useFavorites,
side:
plan.side
}
);

return {
...plan,
symbols
};

}

function getEnginePrefs(
prefs,
strategyId
){

const isPartial =
strategyId ===
"st2" ||
strategyId ===
"st3";
const plan =
getWatchlistPlan(
"bybit",
{
...prefs,
strategyId
}
);

return {
strategyId,
side:
plan.side,
sides:
plan.sides,
useFavorites:
plan.useFavorites,
symbolAllowedSides:
plan.symbolAllowedSides,
tf:
null,
timeoutBars:
prefs.timeoutBars,
maxPt1Pt4Bars:
prefs.maxPt1Pt4Bars,
/* TEMP_PULLBACK_BEFORE_ARM */
pullbackBeforeArm:
!!prefs.pullbackBeforeArm,
pullbackBeforeArmPct:
prefs.pullbackBeforeArmPct,
slPct:
prefs.slPct,
riskUsd:
prefs.riskUsd,
tpRr:
prefs.tpRr,
alertLeadPct:
prefs.alertLeadPct,
minTurnover24hUsdt:
prefs.minTurnover24hUsdt,
exitProfile:
isPartial
? {
kind:
strategyId ===
"st2"
? "partial-x"
: "partial-y",
tp1:
prefs.tp1,
tp2:
prefs.tp2,
tp3:
prefs.tp3,
trailSl:
prefs.trailSl,
trailSlX1:
prefs.trailSlX1,
trailSlX2:
prefs.trailSlX2,
share1:
prefs.share1,
share2:
prefs.share2,
share3:
prefs.share3
}
: {
kind:
"rr",
tpRr:
prefs.tpRr
}
};

}

const POLL_MS =
3000;

/** @type {import('electron').WebContents | null} */
let statusTarget =
null;

/** @type {"st1"|"st2"|"st3"|"early-t3"|"rsi-touch-flip"|null} */
let runningStrategyId =
null;

/** Замороженная книга per-ticker params на текущую сессию (не черновик парсинга). */
let sessionTickerBook =
null;
/** @type {{ tf: string, alertLeadPct: number, minTurnover24hUsdt: number } | null} */
let sessionEarlyT3Prefs =
null;
/** @type {object | null} */
let sessionRsiTouchFlipPrefs =
null;

let sessionId =
0;
let sessionStartedAt =
0;

let statusMessage =
"";
/** @type {Record<string, unknown> | null} */
let lastStatusSnapshot =
null;
let pollTimer =
null;
let pollInflight =
false;
let refreshTimer =
null;
let entriesPaused =
false;
let lastWatchlistRefreshAt =
0;
let startInflight =
false;
let stopInflight =
false;
let pendingHydrated =
false;

function normalizeOpenSymbols(
positions
){

if(
!Array.isArray(
positions
)
){
return [];
}

const out =
[];

for(
const row of positions
){

const size =
Math.abs(
Number(
row?.size ??
row?.qty ??
0
)
);

if(
size <=
0
){
continue;
}

const sym =
String(
row?.symbol ||
""
).replace(
/\.P$/i,
""
).trim().toUpperCase();

if(
sym
){
out.push(
sym
);
}

}

return out;

}

function pushStatus(
payload
){

if(
payload &&
typeof payload ===
"object"
){
lastStatusSnapshot =
payload;
}

const wc =
statusTarget;

if(
!wc ||
wc.isDestroyed?.()
){
return;
}

try{
wc.send(
"algoTrading:botStatus",
payload
);
}catch(
err
){
log.warn(
"algo bot status push:",
err?.message ||
err
);
}

}

function countOpenPositions(
positions
){

return normalizeOpenSymbols(
positions
).length;

}

function buildStatusSnapshot(
extra =
{}
){

if(
runningStrategyId ===
"rsi-touch-flip"
){
const engine =
rsiTouchFlipEngine.getRsiTouchFlipEngineStatus();
const prefs =
sessionRsiTouchFlipPrefs ||
{};
const first =
Array.isArray(
engine.tickers
) &&
engine.tickers.length
? engine.tickers[0]
: null;

return {
ok:
true,
running:
true,
strategyId:
"rsi-touch-flip",
sessionId,
sessionStartedAt,
watchlistCount:
engine.watchlistCount ||
0,
openCount:
(
engine.tickers ||
[]
).filter(
row=>
row.position &&
row.position !==
"flat"
).length,
message:
statusMessage,
tradingMode:
"live",
entriesPaused:
false,
tf:
first?.tf ||
"",
symbol:
first?.symbol ||
"",
exchangeId:
"bybit",
side:
"both",
sides:{
long:
true,
short:
true,
both:
true
},
armedCount:
(
engine.tickers ||
[]
).filter(
row=>
row.mode ===
"wait-flat"
).length,
armedSetups:
engine.tickers ||
[],
entriesCount:
engine.entriesCount ||
0,
wouldEnterCount:
engine.entriesCount ||
0,
lastSignal:
engine.lastSignal,
signals:
engine.signals,
strategyPrefs:{
...prefs
},
...extra
};
}

if(
runningStrategyId ===
"early-t3"
){
const engine =
earlyT3Engine.getEarlyT3EngineStatus();
const prefs =
sessionEarlyT3Prefs ||
{};

return {
ok:
true,
running:
true,
strategyId:
"early-t3",
sessionId,
sessionStartedAt,
watchlistCount:
engine.watchlistCount,
openCount:
0,
message:
statusMessage,
tradingMode:
"manual",
entriesPaused:
false,
tf:
engine.tf ||
prefs.tf ||
"",
exchangeId:
"bybit",
alertLeadPct:
engine.alertLeadPct ??
prefs.alertLeadPct,
actionMode:
engine.actionMode ||
prefs.actionMode ||
"alert",
listAllLive:
!!(
engine.listAllLive ??
prefs.listAllLive
),
minTurnover24hUsdt:
engine.minTurnover24hUsdt ??
prefs.minTurnover24hUsdt,
side:
"both",
sides:{
long:
false,
short:
false,
both:
true
},
armedCount:
engine.armedCount,
armedSetups:
[],
entriesCount:
0,
wouldEnterCount:
0,
lastSignal:
engine.lastSignal,
signals:
engine.signals,
...extra
};
}

const strategies =
readBotStrategies();
const st1 =
strategies.st1;
const active =
getStrategyPrefs(
runningStrategyId ||
"st1"
);
const exchangeId =
"bybit";
const watchlist =
getStrategyWatchlist(
exchangeId,
runningStrategyId ||
"st1"
);
const engine =
patternEngine.getEngineStatus();

return {
ok:
true,
running:
!!runningStrategyId,
strategyId:
runningStrategyId,
sessionId,
sessionStartedAt,
watchlistCount:
watchlist.length,
openCount:
0,
message:
statusMessage,
tradingMode:
getAlgoTradingMode(),
entriesPaused,
lastWatchlistRefreshAt,
side:
active.side,
sides:
active.sides,
useFavorites:
!!active.useFavorites,
tf:
String(
sessionTickerBook?.tf ||
""
),
exchangeId,
riskUsd:
active.riskUsd,
slPct:
active.slPct,
tpRr:
active.tpRr,
tp1:
active.tp1,
tp2:
active.tp2,
tp3:
active.tp3,
timeoutBars:
active.timeoutBars,
maxPt1Pt4Bars:
active.maxPt1Pt4Bars,
pullbackBeforeArm:
!!active.pullbackBeforeArm,
pullbackBeforeArmPct:
active.pullbackBeforeArmPct,
alertLeadPct:
active.alertLeadPct,
minTurnover24hUsdt:
active.minTurnover24hUsdt,
trailSl:
!!active.trailSl,
trailSlX1:
active.trailSlX1,
trailSlX2:
active.trailSlX2,
share1:
active.share1,
share2:
active.share2,
share3:
active.share3,
refreshHours:
active.refreshHours,
refreshMinutes:
active.refreshMinutes,
minWinRate:
active.minWinRate,
refreshStatsMode:
active.refreshStatsMode,
manualRefreshStrategies:
active.manualRefreshStrategies,
strategyPrefs:
active,
tickerBook:
sessionTickerBook
? {
strategyId:
sessionTickerBook.strategyId ||
null,
tickerCount:
Number(
sessionTickerBook.tickerCount
) ||
Object.keys(
sessionTickerBook.tickers ||
{}
).length,
publishedAt:
Number(
sessionTickerBook.publishedAt
) ||
0,
tf:
String(
sessionTickerBook.tf ||
""
)
}
: null,
armedCount:
engine.armedCount,
armedSetups:
Array.isArray(
engine.armedSetups
)
? engine.armedSetups
: [],
entriesCount:
engine.entriesCount,
wouldEnterCount:
engine.entriesCount,
lastSignal:
engine.lastSignal,
signals:
engine.signals,
...extra
};

}

async function reconcileClosedEntries(
openSymbols
){

const openSet =
new Set(
openSymbols
);
const pending =
orderExecutor.getPendingEntries();

for(
const [
sym,
meta
] of pending
){

if(
openSet.has(
sym
)
){
continue;
}

orderExecutor.removePendingEntry(
sym
);

/* Position is gone: drop TP legs that never filled (stop-out, manual close). */
try{
const droppedLegs =
await orderExecutor.cancelPartialTpLimits(
sym
);

if(
droppedLegs?.cancelled >
0
){
log.info(
`algo bot: cancelled ${droppedLegs.cancelled} leftover TP order(s) on ${sym}`
);
}
}catch(err){
log.warn(
`algo bot: TP cleanup failed on ${sym}: ${err?.message ||
err}`
);
}

}

}

async function refreshLiveCounts(){

if(
!runningStrategyId
){
return buildStatusSnapshot();
}

const strategies =
readBotStrategies();
const active =
getStrategyPrefs(
runningStrategyId
);
const exchangeId =
"bybit";
let openCount =
0;
let message =
statusMessage;
let positions =
[];

const posResult =
await algoRest.getPositions();

if(
posResult?.ok
){
positions =
posResult.positions ||
[];
openCount =
countOpenPositions(
positions
);
const openSymbols =
normalizeOpenSymbols(
positions
);
patternEngine.setInPositionSymbols(
openSymbols
);
await patternEngine.onPositionsSynced(
positions
);
await reconcileClosedEntries(
openSymbols
);
}else if(
posResult?.message
){
message =
posResult.message;
}

syncEngineWatchlist(
runningStrategyId
);

const balResult =
await algoRest.getWalletBalance();

if(
balResult?.ok
){
const available =
Number(
balResult.usdt
);

if(
Number.isFinite(
available
) &&
available <
active.riskUsd
){
if(
!entriesPaused
){
entriesPaused =
true;
patternEngine.updateEngineConfig(
{
entriesPaused:
true
}
);
statusMessage =
`Пауза входов: баланс ${available.toFixed(
2
)} USDT < risk ${active.riskUsd} USDT (триггеры/позиции сохранены)`;
}
}else if(
entriesPaused &&
Number.isFinite(
available
) &&
available >=
active.riskUsd
){
entriesPaused =
false;
patternEngine.updateEngineConfig(
{
entriesPaused:
false
}
);
statusMessage =
"Запущен";
}
}else if(
!message &&
balResult?.message
){
message =
balResult.message;
}

return buildStatusSnapshot(
{
openCount,
message
}
);

}

async function pollTick(){

if(
pollInflight ||
!runningStrategyId
){
return;
}

pollInflight =
true;

try{
const snapshot =
await refreshLiveCounts();
pushStatus(
snapshot
);
}catch(
err
){
log.warn(
"algo bot poll:",
err?.message ||
err
);
}finally{
pollInflight =
false;
}

}

function startPoll(){

stopPoll();
pollTimer =
setInterval(
()=>{
void pollTick();
},
POLL_MS
);
void pollTick();
}

function stopPoll(){

if(
pollTimer
){
clearInterval(
pollTimer
);
pollTimer =
null;
}

}

async function stopBotInternal(
message =
""
){

const wasEarlyT3 =
runningStrategyId ===
"early-t3";

sessionLog.appendNote(
message
? `Стоп: ${message}`
: "Стоп"
);
sessionLog.endSession(
{
message
}
);

runningStrategyId =
null;
sessionTickerBook =
null;
sessionEarlyT3Prefs =
null;
sessionRsiTouchFlipPrefs =
null;
statusMessage =
message;
entriesPaused =
false;

const strategies =
readBotStrategies();

strategies.st1.running =
false;
strategies.st2.running =
false;
strategies.st3.running =
false;
writeBotStrategies(
strategies
);

stopPoll();
stopWatchlistRefresh();
await earlyT3Engine.stopEarlyT3Engine();
await rsiTouchFlipEngine.stopRsiTouchFlipEngine();
await patternEngine.stopPatternEngine();

if(
wasEarlyT3
){
clearEarlyT3SessionFlags();
}

const snapshot =
buildStatusSnapshot();
pushStatus(
snapshot
);

return snapshot;

}

function setBotStatusTarget(
wc
){

statusTarget =
wc &&
!wc.isDestroyed?.()
? wc
: null;

if(
statusTarget &&
runningStrategyId
){
pushStatus(
buildStatusSnapshot()
);
}

}

function syncBotStrategies(
payload
){

const cur =
readBotStrategies();
/*
 * Renderer prefs are the source of truth. Merging {...disk, ...payload} kept
 * stale disk fields when a key was intentionally set to null (e.g. empty
 * maxPt1Pt4Bars = unlimited) if an older payload omitted the key — and even
 * with a full payload, prefer normalize(payload) so null clears disk 999.
 */
const next =
{
st1:
normalizeSt1(
payload?.st1 !=
null
? payload.st1
: cur.st1
),
st2:
normalizeSt2(
payload?.st2 !=
null
? payload.st2
: cur.st2
),
st3:
normalizeSt3(
payload?.st3 !=
null
? payload.st3
: cur.st3
)
};

for(
const id of [
"st1",
"st2",
"st3"
]
){
next[
id
].running =
id ===
runningStrategyId;
}

const result =
writeBotStrategies(
next
);

if(
payload?.pattern12Settings &&
typeof payload.pattern12Settings ===
"object"
){
writePattern12Settings(
payload.pattern12Settings
);

if(
runningStrategyId
){
patternEngine.updateEngineConfig(
{
patternSettings:
payload.pattern12Settings,
...getEnginePrefs(
getStrategyPrefs(
runningStrategyId
),
runningStrategyId
)
}
);
}
}else if(
runningStrategyId
){
patternEngine.updateEngineConfig(
getEnginePrefs(
getStrategyPrefs(
runningStrategyId
),
runningStrategyId
)
);
}

if(
runningStrategyId
){
scheduleWatchlistRefresh(
getStrategyPrefs(
runningStrategyId
)
);
}

return {
...result,
strategies:
readBotStrategies()
};

}

function syncTickerFlags(
payload
){

if(
payload?.root &&
typeof payload.root ===
"object"
){
const result =
writeTickerFlagsRoot(
payload.root
);

if(
runningStrategyId &&
result?.ok !==
false
){
syncEngineWatchlist(
runningStrategyId
);
}

return result;
}

const exchangeId =
String(
payload?.exchangeId ||
"bybit"
).trim().toLowerCase() ||
"bybit";
const cur =
readTickerFlagsRoot();
const prev =
cur[
exchangeId
] ||
{
algoLong5m:
[],
algoShort5m:
[],
algoBoth5m:
[],
algoFavorites:
[],
algoEarlyT3:
[]
};
const patch =
payload?.flags &&
typeof payload.flags ===
"object"
? payload.flags
: {};

cur[
exchangeId
] =
{
algoLong5m:
patch.algoLong5m ??
prev.algoLong5m,
algoShort5m:
patch.algoShort5m ??
prev.algoShort5m,
algoBoth5m:
patch.algoBoth5m ??
prev.algoBoth5m,
algoFavorites:
patch.algoFavorites ??
prev.algoFavorites,
algoEarlyT3:
patch.algoEarlyT3 ??
prev.algoEarlyT3
};

const result =
writeTickerFlagsRoot(
cur
);

if(
runningStrategyId
){
syncEngineWatchlist(
runningStrategyId
);
}

return result;

}

function resetSessionStats(){

sessionId +=
1;
sessionStartedAt =
Date.now();
statusMessage =
"";
sessionEarlyT3Prefs =
null;
sessionRsiTouchFlipPrefs =
null;
patternEngine.resetEngineSession();

}


function stopWatchlistRefresh(){

if(
refreshTimer
){
clearTimeout(
refreshTimer
);
refreshTimer =
null;
}

}

function scheduleWatchlistRefresh(
prefs
){

stopWatchlistRefresh();

if(
!runningStrategyId
){
return;
}

const delay =
watchlistRefresh.refreshIntervalMs(
prefs ||
getStrategyPrefs(
runningStrategyId ||
"st1"
)
);

if(
!(
delay >
0
)
){
return;
}

refreshTimer =
setTimeout(
()=>{
void runWatchlistRefresh();
},
delay
);

}

async function runWatchlistRefresh(){

if(
!runningStrategyId
){
return;
}

statusMessage =
"Phase D: обновление списка…";
pushStatus(
buildStatusSnapshot()
);

const shellPrefs =
getStrategyPrefs(
tradingMode ===
"manual"
? "st1"
: runningStrategyId
);
const strategyIds =
tradingMode ===
"manual"
? listManualRefreshStrategyIds(
shellPrefs.manualRefreshStrategies
)
: [
runningStrategyId
];
const sidesToRefresh =
shellPrefs.useFavorites
? [
shellPrefs.side ||
"long"
]
: enabledSides(
shellPrefs.sides
);

/** @type {Map<string, Map<string, number>>} */
const mergedByFlag =
new Map();
let result =
null;
let totalHits =
0;
let lastRoot =
null;
let okAny =
false;
let busy =
false;
let failMessage =
"";

for(
const strategyId of strategyIds
){

const stratPrefs =
getStrategyPrefs(
strategyId
);
const engine =
getEnginePrefs(
stratPrefs,
strategyId
);

for(
const side of sidesToRefresh
){
result =
await watchlistRefresh.refreshWatchlistByWinRate(
{
strategyId,
exitProfile:
engine.exitProfile,
side,
tf:
sessionTickerBook?.tf,
minWinRate:
shellPrefs.minWinRate,
timeoutBars:
shellPrefs.timeoutBars,
maxPt1Pt4Bars:
shellPrefs.maxPt1Pt4Bars,
pullbackBeforeArm:
!!shellPrefs.pullbackBeforeArm,
pullbackBeforeArmPct:
shellPrefs.pullbackBeforeArmPct,
slPct:
shellPrefs.slPct,
tpRr:
shellPrefs.tpRr ||
stratPrefs.tpRr ||
2,
refreshStatsMode:
shellPrefs.refreshStatsMode,
patternSettings:
readPattern12Settings(),
skipWrite:
true
}
);

if(
result?.busy
){
busy =
true;
break;
}

if(
!result?.ok
){
failMessage =
result?.message ||
"refresh failed";
break;
}

okAny =
true;
const flagId =
strategyIdToFlagId(
strategyId
);
let bucket =
mergedByFlag.get(
flagId
);

if(
!bucket
){
bucket =
new Map();
mergedByFlag.set(
flagId,
bucket
);
}

const rows =
Array.isArray(
result.hitRows
)
? result.hitRows
: (
result.symbols ||
[]
).map(
symbol=>
({
symbol,
winRate:
0
})
);

for(
const row of rows
){
const symbol =
String(
row?.symbol ||
""
).trim();

if(
!symbol
){
continue;
}

const wr =
Number(
row.winRate
) ||
0;
const prev =
bucket.get(
symbol
);

if(
prev ==
null ||
wr >
prev
){
bucket.set(
symbol,
wr
);
}
}

totalHits +=
Number(
result.hits
) ||
0;
}

if(
busy ||
failMessage
){
break;
}
}

if(
okAny &&
!busy
){
for(
const [
flagId,
bucket
] of mergedByFlag
){
const symbols =
[
...bucket.entries()
].sort(
(
a,
b
)=>
b[1] -
a[1] ||
a[0].localeCompare(
b[0]
)
).map(
([
symbol
])=>
symbol
);

lastRoot =
watchlistRefresh.writeWatchlistFlagSymbols(
flagId,
symbols
);
}
}

lastWatchlistRefreshAt =
Date.now();

if(
okAny &&
!busy &&
!failMessage
){
const plan =
syncEngineWatchlist(
runningStrategyId
);
const stratLabel =
strategyIds.join(
"+"
);
statusMessage =
`Список обновлён (${stratLabel}): ${plan.symbols.length} тикеров (winrate > ${shellPrefs.minWinRate}%, hits ${totalHits})`;
result =
{
ok:
true,
root:
lastRoot ||
readTickerFlagsRoot(),
hits:
totalHits
};
}else if(
busy
){
statusMessage =
"Phase D: обновление уже выполняется";
}else if(
!result?.busy
){
statusMessage =
`Phase D ошибка: ${failMessage ||
result?.message ||
"refresh failed"}`;
}

pushStatus(
buildStatusSnapshot(
{
watchlistRefresh:
result,
applyTickerFlags:
!!(
okAny &&
!busy &&
!failMessage
),
tickerFlagsRoot:
okAny &&
!busy &&
!failMessage
? (
lastRoot ||
readTickerFlagsRoot()
)
: undefined
}
)
);
scheduleWatchlistRefresh(
shellPrefs
);

}

async function startEarlyT3BotImpl(
payload =
{}
){

if(
runningStrategyId
){
return {
ok:
true,
alreadyRunning:
true,
message:
`Уже запущена ${runningStrategyId}; сначала остановите её`,
...buildStatusSnapshot()
};
}

resetSessionStats();

const prefs =
payload?.earlyT3Prefs &&
typeof payload.earlyT3Prefs ===
"object"
? payload.earlyT3Prefs
: {};
const tf =
String(
prefs.tf ||
"5"
).trim() ||
"5";
const alertLeadPct =
Number(
prefs.alertLeadPct
);
const minTurnover24hUsdt =
Number(
prefs.minTurnover24hUsdt
);

sessionEarlyT3Prefs =
{
tf,
alertLeadPct:
Number.isFinite(
alertLeadPct
) &&
alertLeadPct >=
0
? Math.min(
25,
alertLeadPct
)
: 5,
minTurnover24hUsdt:
Number.isFinite(
minTurnover24hUsdt
) &&
minTurnover24hUsdt >=
0
? minTurnover24hUsdt
: 100000,
actionMode:
String(
prefs.actionMode ||
""
).toLowerCase() ===
"list"
? "list"
: "alert",
listAllLive:
String(
prefs.actionMode ||
""
).toLowerCase() ===
"list" &&
!!prefs.listAllLive,
setupLifeBars:
Math.min(
5000,
Math.max(
1,
Math.floor(
Number(
prefs.setupLifeBars
) ||
300
)
)
)
};

try{
statusMessage =
"Запуск Early T3…";

sessionLog.beginSession(
{
sessionId,
strategyId:
"early-t3",
startedAt:
sessionStartedAt,
tradingMode:
"manual",
watchlistCount:
0
}
);
sessionLog.appendNote(
`Запуск early-t3 (${sessionEarlyT3Prefs.actionMode === "list" ? (sessionEarlyT3Prefs.listAllLive ? `list, все живые ≤${sessionEarlyT3Prefs.setupLifeBars}св` : "list, свежий t4") : "alerts"}, tf=${sessionEarlyT3Prefs.tf}, turnover>=${sessionEarlyT3Prefs.minTurnover24hUsdt})`
);

if(
clearEarlyT3SessionFlags().changed
){
sessionLog.appendNote(
"Список Early T3 предыдущей сессии очищен"
);
}

await earlyT3Engine.startEarlyT3Engine(
{
tf:
sessionEarlyT3Prefs.tf,
alertLeadPct:
sessionEarlyT3Prefs.alertLeadPct,
minTurnover24hUsdt:
sessionEarlyT3Prefs.minTurnover24hUsdt,
actionMode:
sessionEarlyT3Prefs.actionMode,
listAllLive:
sessionEarlyT3Prefs.listAllLive,
setupLifeBars:
sessionEarlyT3Prefs.setupLifeBars,
onListAdd:(
symbol
)=>{
mutateEarlyT3ListFlag(
symbol,
true
);
},
onListRemove:(
symbol
)=>{
mutateEarlyT3ListFlag(
symbol,
false
);
},
patternSettings:
payload?.patternSettings &&
typeof payload.patternSettings ===
"object"
? payload.patternSettings
: null,
onActivity:()=>{
pushStatus(
buildStatusSnapshot()
);
}
}
);

runningStrategyId =
"early-t3";
statusMessage =
"Запущен";
sessionLog.appendNote(
"Запущен"
);

const strategies =
readBotStrategies();

for(
const id of [
"st1",
"st2",
"st3"
]
){
strategies[
id
].running =
false;
}
writeBotStrategies(
strategies
);
}catch(
err
){
runningStrategyId =
null;
sessionEarlyT3Prefs =
null;
statusMessage =
String(
err?.message ||
err
);
try{
await earlyT3Engine.stopEarlyT3Engine();
}catch{
/* ignore */
}
clearEarlyT3SessionFlags();
sessionLog.appendNote(
`Ошибка запуска: ${statusMessage}`
);
sessionLog.endSession(
{
message:
statusMessage
}
);

return {
ok:
false,
message:
statusMessage,
...buildStatusSnapshot()
};
}

const snapshot =
buildStatusSnapshot();
pushStatus(
snapshot
);

return snapshot;

}

async function startRsiTouchFlipBotImpl(
payload =
{}
){

if(
runningStrategyId
){
return {
ok:
true,
alreadyRunning:
true,
message:
`Уже запущена ${runningStrategyId}; сначала остановите её`,
...buildStatusSnapshot()
};
}

const creds =
getAlgoCredentialsStatus(
"bybit"
);
const tradingMode =
getAlgoTradingMode();

if(
!isAlgoLiveTradingEnabled()
){
return {
ok:
false,
message:
"Сборка m: только ручная торговля"
};
}

if(
tradingMode !==
"live"
){
return {
ok:
false,
message:
"RSI Touch Flip — только автоматическая торговля (live)"
};
}

if(
!creds?.configured
){
return {
ok:
false,
message:
"Для реальной торговли нужны алго API-ключи"
};
}

resetSessionStats();

const bookRows =
Array.isArray(
payload?.book
)
? payload.book
: Array.isArray(
payload?.rows
)
? payload.rows
: [];

if(
!bookRows.length
){
return {
ok:
false,
message:
"Книга RSI Touch Flip пуста. Добавьте тикеры кнопкой «Добавить в книгу»."
};
}

const wallet =
await getWalletBalance();
const availableNum =
Number(
wallet?.available
);
const equityNum =
Number(
wallet?.usdt
);
const available =
Number.isFinite(
availableNum
) &&
availableNum >
0
? availableNum
: Number.isFinite(
equityNum
) &&
equityNum >
0
? equityNum
: availableNum;
let budgetSum =
0;

for(
const row of bookRows
){
const budget =
Number(
row?.prefs?.budget ??
row?.budget
);

if(
Number.isFinite(
budget
)
){
budgetSum +=
budget;
}

}

if(
!wallet?.ok ||
!Number.isFinite(
available
)
){
return {
ok:
false,
message:
wallet?.message ||
"Не удалось прочитать баланс алго-ключа"
};
}

if(
budgetSum >
available
){
return {
ok:
false,
message:
`Сумма бюджетов ${budgetSum.toFixed(
2
)} USDT > баланс ${available.toFixed(
2
)} USDT`
};
}

sessionRsiTouchFlipPrefs =
{
book:
bookRows,
budgetSum,
available
};

try{
statusMessage =
"Запуск RSI Touch Flip…";

sessionLog.beginSession(
{
sessionId,
strategyId:
"rsi-touch-flip",
startedAt:
sessionStartedAt,
tradingMode:
"live",
watchlistCount:
bookRows.length
}
);
sessionLog.appendNote(
`Запуск rsi-touch-flip live ${bookRows.length} тик. budgetSum=${budgetSum.toFixed(
2
)} available=${available.toFixed(
2
)}`
);

await rsiTouchFlipEngine.startRsiTouchFlipEngine(
{
rows:
bookRows,
onActivity:()=>{
pushStatus(
buildStatusSnapshot()
);
}
}
);

runningStrategyId =
"rsi-touch-flip";
statusMessage =
"Запущен";
sessionLog.appendNote(
"Запущен"
);

const strategies =
readBotStrategies();

for(
const id of [
"st1",
"st2",
"st3"
]
){
strategies[
id
].running =
false;
}
writeBotStrategies(
strategies
);
}catch(
err
){
runningStrategyId =
null;
sessionRsiTouchFlipPrefs =
null;
statusMessage =
String(
err?.message ||
err
);
try{
await rsiTouchFlipEngine.stopRsiTouchFlipEngine();
}catch{
/* ignore */
}
sessionLog.appendNote(
`Ошибка запуска: ${statusMessage}`
);
sessionLog.endSession(
{
message:
statusMessage
}
);

return {
...buildStatusSnapshot(),
ok:
false,
running:
false,
message:
statusMessage
};
}

const snapshot =
buildStatusSnapshot();
pushStatus(
snapshot
);

return snapshot;

}

async function startBotImpl(
payload =
{}
){

const strategyId =
String(
payload?.strategyId ||
"st1"
).trim().toLowerCase();

if(
strategyId ===
"early-t3"
){
return startEarlyT3BotImpl(
payload
);
}

if(
strategyId ===
"rsi-touch-flip"
){
return startRsiTouchFlipBotImpl(
payload
);
}

if(
![
"st1",
"st2",
"st3"
].includes(
strategyId
)
){
return {
ok:
false,
message:
"Unknown strategy"
};
}

if(
runningStrategyId
){
return {
ok:
true,
alreadyRunning:
true,
message:
`Уже запущена ${runningStrategyId}; сначала остановите её`,
...buildStatusSnapshot()
};
}

const creds =
getAlgoCredentialsStatus(
"bybit"
);
const tradingMode =
getAlgoTradingMode();

if(
tradingMode ===
"live" &&
!isAlgoLiveTradingEnabled()
){
return {
ok:
false,
message:
"Сборка m: только ручная торговля"
};
}

if(
tradingMode ===
"live" &&
!creds?.configured
){
return {
ok:
false,
message:
"Для реальной торговли нужны алго API-ключи"
};
}

if(
tradingMode ===
"manual" &&
(
strategyId ===
"st2" ||
strategyId ===
"st3"
)
){
return {
ok:
false,
message:
"В ручном режиме доступна только Стратегия 1 (алерты на вход)"
};
}

/*
 * Always reload from disk on Start: Stop→Start must restore open-position
 * meta. Clearing it (old resetEngineSession) left live trades unmanaged.
 */
orderExecutor.hydratePendingFromDisk();
pendingHydrated =
true;

resetSessionStats();

const strategies =
readBotStrategies();

/*
 * Multichart/LAN may send strategyPrefs so remote bot uses the same
 * pullback / maxPt1Pt4 / risk settings the operator just edited.
 */
if(
payload?.strategyPrefs &&
typeof payload.strategyPrefs ===
"object"
){
const patch =
payload.strategyPrefs;
const cur =
strategies[
strategyId
] ||
{};

strategies[
strategyId
] =
strategyId ===
"st2"
? normalizeSt2(
{
...cur,
...patch
}
)
: strategyId ===
"st3"
? normalizeSt3(
{
...cur,
...patch
}
)
: normalizeSt1(
{
...cur,
...patch
}
);
writeBotStrategies(
strategies
);
}

const prefs =
getStrategyPrefs(
strategyId
);

if(
payload?.tickerBookSnapshot &&
typeof payload.tickerBookSnapshot ===
"object" &&
payload.tickerBookSnapshot.tickers &&
typeof payload.tickerBookSnapshot.tickers ===
"object"
){
sessionTickerBook =
payload.tickerBookSnapshot;
}else{
sessionTickerBook =
readTickerBook(
strategyId
);
}

const bookCount =
countSessionTickerBook(
sessionTickerBook
);

if(
bookCount <
1
){
sessionTickerBook =
null;

return {
ok:
false,
message:
"Нет книги параметров для бота. Сначала «Подобрать для всех» → «Применить к боту», затем запустите бота."
};
}

const bookTfResult =
resolveSessionTickerBookTf(
sessionTickerBook
);

if(
!bookTfResult.ok
){
sessionTickerBook =
null;

return {
ok:
false,
message:
bookTfResult.message
};
}

const sessionTf =
bookTfResult.tf;
sessionTickerBook.tf =
sessionTf;

const watchlistRaw =
getStrategyWatchlist(
"bybit",
strategyId
);
const watchlist =
filterSymbolsByTickerBook(
watchlistRaw,
sessionTickerBook
);

if(
!watchlistRaw.length
){
return {
ok:
false,
message:
"Список тикеров пуст — заполните список Стратегии через «Подобрать для всех» → «Применить к боту»"
};
}

if(
!watchlist.length
){
return {
ok:
false,
message:
`В книге бота ${bookCount} тикеров, но ни одного нет в текущем списке/избранном. Совместите список с книгой или заново «Применить к боту».`
};
}

try{
statusMessage =
"Запуск…";

sessionLog.beginSession(
{
sessionId,
strategyId,
startedAt:
sessionStartedAt,
tradingMode,
watchlistCount:
watchlist.length
}
);
sessionLog.appendNote(
`Запуск ${strategyId} (mode=${tradingMode}, watchlist=${watchlist.length}, tickerBook=${
sessionTickerBook
? Number(
sessionTickerBook.tickerCount
) ||
Object.keys(
sessionTickerBook.tickers ||
{}
).length
: 0
})`
);

await patternEngine.startPatternEngine(
{
...getEnginePrefs(
prefs,
strategyId
),
tf:
sessionTf,
tradingMode,
patternSettings:
readPattern12Settings(),
symbols:
watchlist,
tickerBook:
sessionTickerBook?.tickers ||
null,
onActivity:()=>{
void refreshLiveCounts().then(
snapshot=>{
pushStatus(
snapshot
);
}
);
}
}
);

runningStrategyId =
strategyId;
statusMessage =
"Запущен";
sessionLog.appendNote(
"Запущен"
);
for(
const id of [
"st1",
"st2",
"st3"
]
){
strategies[
id
].running =
id ===
strategyId;
}
writeBotStrategies(
strategies
);
}catch(
err
){
runningStrategyId =
null;
sessionTickerBook =
null;
statusMessage =
String(
err?.message ||
err
);
sessionLog.appendNote(
`Ошибка запуска: ${statusMessage}`
);
sessionLog.endSession(
{
message:
statusMessage
}
);
for(
const id of [
"st1",
"st2",
"st3"
]
){
strategies[
id
].running =
false;
}
writeBotStrategies(
strategies
);
return {
ok:
false,
running:
false,
message:
statusMessage,
...buildStatusSnapshot()
};
}

entriesPaused =
false;
startPoll();
scheduleWatchlistRefresh(
prefs
);

const snapshot =
await refreshLiveCounts();
pushStatus(
snapshot
);

return {
ok:
true,
...snapshot
};

}

async function startBot(
payload =
{}
){

if(
startInflight ||
stopInflight
){
return {
ok:
false,
busy:
true,
message:
"Bot start already in progress"
};
}

startInflight =
true;

try{
return await startBotImpl(
payload
);
}finally{
startInflight =
false;
}

}

async function stopBot(
payload =
{}
){

if(
stopInflight ||
startInflight
){
return {
ok:
false,
busy:
true,
message:
"Bot stop already in progress"
};
}

stopInflight =
true;

try{

const strategyId =
String(
payload?.strategyId ||
"st1"
).trim().toLowerCase();

if(
!runningStrategyId
){
const strategies =
readBotStrategies();
strategies.st1.running =
false;
strategies.st2.running =
false;
strategies.st3.running =
false;
writeBotStrategies(
strategies
);

return {
ok:
true,
message:
"Bot already stopped",
...buildStatusSnapshot()
};
}

if(
strategyId !==
runningStrategyId
){
return {
ok:
false,
message:
`Running strategy is ${runningStrategyId}`
};
}

const snapshot =
await stopBotInternal(
"Остановлен"
);

return {
ok:
true,
...snapshot
};

}finally{
stopInflight =
false;
}

}

function getBotStatus(){

return buildStatusSnapshot(
lastStatusSnapshot &&
typeof lastStatusSnapshot ===
"object"
? {
openCount:
lastStatusSnapshot.openCount
}
: {}
);

}

async function disarmArmedSetup(
payload =
{}
){

const result =
await patternEngine.disarmArmedSetup(
payload
);

const snapshot =
buildStatusSnapshot();

if(
result?.ok
){
pushStatus(
snapshot
);
}

return {
...snapshot,
...result
};

}

async function getWalletBalance(){

try{
return await algoRest.getWalletBalance();
}catch(
err
){
return {
ok:
false,
message:
err?.message ||
String(
err
)
};
}

}

async function shutdownBot(){

stopPoll();
stopWatchlistRefresh();
runningStrategyId =
null;
entriesPaused =
false;
await rsiTouchFlipEngine.stopRsiTouchFlipEngine();
await patternEngine.stopPatternEngine();

}

/**
 * Resume active strategy after app/agent boot if it was left running.
 * Bot lives in main — window is not required (tray/agent mode).
 */
async function bootAlgoBotIfWasRunning(){

const featureNav =
require(
"../feature-nav-prefs-store.cjs"
).readPrefs();

if(
!featureNav.algoTradingNavEnabled
){
return {
ok:
true,
skipped:
true,
message:
"algo nav disabled"
};
}

const strategies =
readBotStrategies();

const resumeId =
[
"st1",
"st2",
"st3"
].find(
id=>strategies?.[
id
]?.running
);

if(
!resumeId
){
return {
ok:
true,
skipped:
true,
message:
"bot was not running"
};
}

if(
runningStrategyId
){
return {
ok:
true,
alreadyRunning:
true,
...buildStatusSnapshot()
};
}

log.info(
"algo bot: resuming strategy after boot/agent"
);

return startBot(
{
strategyId:
resumeId
}
);

}

function getTickerFlagsRoot(){

return {
ok:
true,
root:
readTickerFlagsRoot()
};

}

function getTickerBook(
payload =
{}
){

const book =
readTickerBook(
payload.strategyId,
payload.exchangeId
);

return {
ok:
true,
book:
book ||
null
};

}

function broadcastBotStatus(
snapshot,
logLabel
){

lastStatusSnapshot =
snapshot;

let sent =
0;

try{
const {
BrowserWindow
} =
require(
"electron"
);

for(
const win of BrowserWindow.getAllWindows()
){

const wc =
win?.webContents;

if(
!wc ||
wc.isDestroyed?.()
){
continue;
}

try{
wc.send(
"algoTrading:botStatus",
snapshot
);
sent +=
1;
}catch(
err
){
log.warn(
logLabel,
err?.message ||
err
);
}

}
}catch(
err
){
log.warn(
logLabel,
err?.message ||
err
);
}

if(
!sent
){
pushStatus(
snapshot
);
}

return {
ok:
true,
sent
};

}

function clearEarlyT3SessionFlags(){

const result =
clearTickerFlagList(
FLAG_EARLY_T3
);

notifyTickerFlagsToUi(
{
root:
result.root ||
readTickerFlagsRoot()
}
);

return result;

}

function mutateEarlyT3ListFlag(
symbol,
add
){

const result =
mutateTickerFlagSymbol(
FLAG_EARLY_T3,
symbol,
!!add,
"bybit"
);

if(
result?.changed
){
notifyTickerFlagsToUi(
{
root:
result.root
}
);
}

return result;

}

/**
 * After LAN /watchlists (or any main-only write), push flags into renderer
 * localStorage via applyTickerFlags on the botStatus channel.
 */
function notifyTickerFlagsToUi(
extra =
{}
){

const root =
extra.root &&
typeof extra.root ===
"object"
? extra.root
: readTickerFlagsRoot();
const snapshot =
buildStatusSnapshot(
{
applyTickerFlags:
true,
tickerFlagsRoot:
root,
...(
typeof extra.message ===
"string"
? {
message:
extra.message
}
: {}
)
}
);

return broadcastBotStatus(
snapshot,
"algo bot ticker-flags UI notify:"
);

}

/**
 * After LAN POST /ticker-book, push published book into renderer localStorage.
 */
function notifyTickerBookToUi(
extra =
{}
){

const book =
extra.book &&
typeof extra.book ===
"object"
? extra.book
: readTickerBook(
extra.strategyId,
extra.exchangeId
);

if(
!book
){
return {
ok:
false,
sent:
0
};
}

const snapshot =
buildStatusSnapshot(
{
applyTickerBook:
true,
publishedTickerBook:
book,
...(
typeof extra.message ===
"string"
? {
message:
extra.message
}
: {}
)
}
);

return broadcastBotStatus(
snapshot,
"algo bot ticker-book UI notify:"
);

}

function syncTickerBook(
payload
){

const strategyId =
payload?.strategyId;
const book =
payload?.book;
const exchangeId =
payload?.exchangeId;

const result =
writeTickerBook(
strategyId,
book,
exchangeId
);

if(
result?.ok !==
false &&
result?.book
){
try{
notifyTickerBookToUi(
{
book:
result.book,
strategyId:
result.book.strategyId,
exchangeId:
result.book.exchange
}
);
}catch(
err
){
log.warn(
"algo bot ticker-book UI notify:",
err?.message ||
err
);
}
}

return result;

}

module.exports =
{
setBotStatusTarget,
syncBotStrategies,
syncTickerFlags,
syncTickerBook,
getTickerFlagsRoot,
getTickerBook,
notifyTickerFlagsToUi,
notifyTickerBookToUi,
startBot,
stopBot,
getBotStatus,
disarmArmedSetup,
getWalletBalance,
shutdownBot,
bootAlgoBotIfWasRunning,
runWatchlistRefresh
};
