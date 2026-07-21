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
normalizeSt1,
normalizeSt2,
normalizeSt3
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

function getStrategyWatchlist(
exchangeId =
"bybit",
strategyId =
"st1"
){

const prefs =
getStrategyPrefs(
strategyId
);

return getWatchlistForSide(
exchangeId,
prefs.side,
{
useFavorites:
!!prefs.useFavorites
}
);

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

return {
strategyId,
side:
prefs.side,
tf:
prefs.tf,
timeoutBars:
prefs.timeoutBars,
slPct:
prefs.slPct,
riskUsd:
prefs.riskUsd,
tpRr:
prefs.tpRr,
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
trailSlPct:
prefs.trailSlPct
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

/** @type {{ closedWin: number, closedLoss: number, closedTotalUsd: number }} */
let sessionStats =
{
closedWin:
0,
closedLoss:
0,
closedTotalUsd:
0
};

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
closedWin:
sessionStats.closedWin,
closedLoss:
sessionStats.closedLoss,
closedTotalUsd:
sessionStats.closedTotalUsd,
message:
statusMessage,
tradingMode:
getAlgoTradingMode(),
entriesPaused,
lastWatchlistRefreshAt,
side:
active.side,
tf:
active.tf,
exchangeId,
riskUsd:
active.riskUsd,
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

let pnl =
NaN;

try{
const hist =
await algoRest.getClosedPnlHistory(
{
symbol:
sym,
startTime:
Math.max(
0,
(
meta.openedAt ||
sessionStartedAt
) -
120000
),
skipExecutions:
true
}
);

if(
hist?.ok &&
Array.isArray(
hist.trades
) &&
hist.trades.length
){
const trade =
hist.trades[
0
];
pnl =
Number(
trade?.closedPnl ??
trade?.realisedPnl ??
trade?.pnl
);
}
}catch(
err
){
log.warn(
"algo bot closed pnl:",
sym,
err?.message ||
err
);
}

if(
!Number.isFinite(
pnl
)
){
pnl =
-meta.riskUsd;
}

if(
pnl >=
0
){
sessionStats.closedWin +=
1;
}else{
sessionStats.closedLoss +=
1;
}

sessionStats.closedTotalUsd +=
pnl;

statusMessage =
`${sym} закрыта ${pnl >=
0
? "+"
: ""}${pnl.toFixed(
2
)} USDT`;

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

const watchlist =
getStrategyWatchlist(
exchangeId,
runningStrategyId
);
patternEngine.syncWatchlist(
watchlist
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
patternEngine.syncWatchlist(
getStrategyWatchlist(
"bybit",
runningStrategyId
)
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
patternEngine.syncWatchlist(
getStrategyWatchlist(
exchangeId,
runningStrategyId
)
);
}

return result;

}

function resetSessionStats(){

sessionStats =
{
closedWin:
0,
closedLoss:
0,
closedTotalUsd:
0
};
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

const prefs =
getStrategyPrefs(
runningStrategyId
);
const result =
await watchlistRefresh.refreshWatchlistByWinRate(
{
strategyId:
runningStrategyId,
exitProfile:
getEnginePrefs(
prefs,
runningStrategyId
).exitProfile,
side:
prefs.side,
tf:
prefs.tf,
minWinRate:
prefs.minWinRate,
timeoutBars:
prefs.timeoutBars,
slPct:
prefs.slPct,
tpRr:
prefs.tpRr ||
2,
patternSettings:
readPattern12Settings()
}
);

lastWatchlistRefreshAt =
Date.now();

if(
result?.ok
){
patternEngine.syncWatchlist(
result.symbols ||
[]
);
statusMessage =
`Список обновлён: ${result.hits ||
0} тикеров (winrate > ${result.minWinRate}%)`;
}else if(
!result?.busy
){
statusMessage =
`Phase D ошибка: ${result?.message ||
"refresh failed"}`;
}

pushStatus(
buildStatusSnapshot(
{
watchlistRefresh:
result,
applyTickerFlags:
!!result?.ok,
tickerFlagsRoot:
result?.ok
? (
result.root ||
readTickerFlagsRoot()
)
: undefined
}
)
);
scheduleWatchlistRefresh(
prefs
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
"API keys not configured"
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

if(
!pendingHydrated
){
orderExecutor.hydratePendingFromDisk();
pendingHydrated =
true;
}

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

module.exports =
{
setBotStatusTarget,
syncBotStrategies,
syncTickerFlags,
getTickerFlagsRoot,
startBot,
stopBot,
getBotStatus,
disarmArmedSetup,
getWalletBalance,
shutdownBot,
bootAlgoBotIfWasRunning,
runWatchlistRefresh
};
