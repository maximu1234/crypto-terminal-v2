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
readPattern12Settings,
writePattern12Settings,
getWatchlistForSide,
getWatchlistPlan,
enabledSides,
normalizeSt1,
normalizeSt2,
normalizeSt3,
listManualRefreshStrategyIds,
sideToFlagId
} =
require(
"./algo-bot-store.cjs"
);
const patternEngine =
require(
"./algo-bot-pattern-engine.cjs"
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
prefs
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

patternEngine.syncWatchlist(
plan.symbols,
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

return plan;

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
prefs
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
prefs.tf,
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

/** @type {"st1"|"st2"|"st3"|null} */
let runningStrategyId =
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
active.tf,
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
await patternEngine.stopPatternEngine();

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
const next =
{
st1:
normalizeSt1(
{
...cur.st1,
...(
payload?.st1 ||
{}
)
}
),
st2:
normalizeSt2(
{
...cur.st2,
...(
payload?.st2 ||
{}
)
}
),
st3:
normalizeSt3(
{
...cur.st3,
...(
payload?.st3 ||
{}
)
}
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
prev.algoFavorites
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
shellPrefs.tf,
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
result.flagId ||
sideToFlagId(
side
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
const prefs =
getStrategyPrefs(
strategyId
);

const watchlist =
getStrategyWatchlist(
"bybit",
strategyId
);

if(
!watchlist.length
){
return {
ok:
false,
message:
prefs.useFavorites
? "Список Избранные пуст — отметьте монеты оранжевым флагом"
: "Список тикеров пуст — добавьте монеты в Алго-список"
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
`Запуск ${strategyId} (mode=${tradingMode}, watchlist=${watchlist.length})`
);

await patternEngine.startPatternEngine(
{
...getEnginePrefs(
prefs,
strategyId
),
tradingMode,
patternSettings:
readPattern12Settings(),
symbols:
watchlist,
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
await patternEngine.stopPatternEngine();

}

/**
 * Resume active strategy after app/agent boot if it was left running.
 * Bot lives in main — window is not required (tray/agent mode).
 */
async function bootAlgoBotIfWasRunning(){

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
"algo bot ticker-flags UI notify:",
err?.message ||
err
);
}

}
}catch(
err
){
log.warn(
"algo bot ticker-flags UI broadcast:",
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

module.exports =
{
setBotStatusTarget,
syncBotStrategies,
syncTickerFlags,
getTickerFlagsRoot,
notifyTickerFlagsToUi,
startBot,
stopBot,
getBotStatus,
disarmArmedSetup,
getWalletBalance,
shutdownBot,
bootAlgoBotIfWasRunning,
runWatchlistRefresh
};
