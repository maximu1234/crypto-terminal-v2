/**
 * Main-process tray feed (macOS menu bar / Windows tray): positions/PnL/balance
 * without renderer.
 *
 * PnL must match Terminal «Позиции»: mark-based unrealised (not stale stream
 * exchange pnl). Prefer REST positions for fresh markPrice; fall back to stream.
 *
 * Popup: main (Terminal) account on top; algo account below when algo keys exist.
 */
const log =
require(
"electron-log"
);
const {
getActiveExchange,
getStatusFor,
getWalletBalance,
getPositions
} =
require(
"./trading/trading-router.cjs"
);
const {
getAlgoCredentialsStatus
} =
require(
"./trading/algo-exchange-credentials.cjs"
);
const algoRest =
require(
"./trading/algo-bybit-rest.cjs"
);
const {
getTradingSnapshot
} =
require(
"./trading/trading-stream.cjs"
);
const {
withResolvedPnl
} =
require(
"./menu-bar-tray-pnl.cjs"
);
const trayPrefsStore =
require(
"./menu-bar-tray-prefs-store.cjs"
);

const POSITIONS_POLL_MS =
1500;
const BALANCE_POLL_MS =
15000;

/** @type {ReturnType<typeof setInterval> | null} */
let positionsTimer =
null;

/** @type {ReturnType<typeof setInterval> | null} */
let balanceTimer =
null;

let cachedBalanceLabel =
"—";

let cachedAlgoBalanceLabel =
"—";

/** @type {((state: Record<string, unknown>) => void) | null} */
let publishTrayState =
null;

let feedBusy =
false;

function formatPnlLabel(
value
){

const num =
Number(
value
);

if(
!Number.isFinite(
num
)
){
return "—";
}

const sign =
num >
0
? "+"
: "";

return `${sign}${num.toLocaleString(
"ru-RU",
{
minimumFractionDigits:
2,
maximumFractionDigits:
2
}
)}`;

}

function formatBalanceLabel(
usdt
){

const num =
Number(
usdt
);

if(
!Number.isFinite(
num
)
){
return "—";
}

return num.toLocaleString(
"ru-RU",
{
maximumFractionDigits:
2
}
);

}

function isAlgoTrayAccount(){

return !!getAlgoCredentialsStatus(
"bybit"
)?.configured;

}

function exchangeDisplayName(
exchangeId
){

return exchangeId ===
"bingx"
? "BingX"
: "Bybit";

}

function isOpenPosition(
row
){

const size =
Math.abs(
Number(
row?.size
) ||
0
);

return size >
0;

}

function sumOpenPnl(
rows
){

let total =
0;
let has =
false;

for(
const row of
rows ||
[]
){
const num =
Number(
row?.pnl
);

if(
!Number.isFinite(
num
)
){
continue;
}

total +=
num;
has =
true;
}

return has
? total
: null;

}

function mapPositions(
rows,
pnlHidden =
false
){

return (
rows ||
[]
).map(
row=>({
symbol:
row?.symbol,
ticker:
row?.ticker ||
row?.symbol,
side:
row?.side,
pnl:
row?.pnl,
pnlLabel:
pnlHidden
? "***"
: formatPnlLabel(
row?.pnl
)
})
);

}

function readPositionsFromStreamOrEmpty(){

const snap =
getTradingSnapshot();

if(
snap?.ok &&
Array.isArray(
snap.positions
)
){
return snap.positions.filter(
isOpenPosition
);
}

return null;

}

async function loadTerminalOpenPositions(
exchangeId
){

try{
const rest =
await getPositions({
exchangeId
});

if(
rest?.ok &&
Array.isArray(
rest.positions
)
){
return rest.positions.filter(
isOpenPosition
).map(
withResolvedPnl
);
}
}catch(
err
){
log.warn(
"tray-feed positions:",
err?.message ||
err
);
}

const fromStream =
readPositionsFromStreamOrEmpty();

if(
fromStream
){
return fromStream.map(
withResolvedPnl
);
}

return [];

}

async function loadAlgoOpenPositions(){

if(
!isAlgoTrayAccount()
){
return [];
}

try{
const rest =
await algoRest.getPositions();

if(
rest?.ok &&
Array.isArray(
rest.positions
)
){
return rest.positions.filter(
isOpenPosition
).map(
withResolvedPnl
);
}
}catch(
err
){
log.warn(
"tray-feed algo positions:",
err?.message ||
err
);
}

return [];

}

async function refreshTerminalBalance(){

try{
const status =
getStatusFor();

if(
!status?.configured
){
cachedBalanceLabel =
"—";
return;
}

const bal =
await getWalletBalance();

if(
bal?.ok
){
cachedBalanceLabel =
formatBalanceLabel(
bal.usdt
);
}else{
cachedBalanceLabel =
"ошибка";
}
}catch(
err
){
log.warn(
"tray-feed balance:",
err?.message ||
err
);
cachedBalanceLabel =
"ошибка";
}

}

async function refreshAlgoBalance(){

if(
!isAlgoTrayAccount()
){
cachedAlgoBalanceLabel =
"—";
return;
}

try{
const bal =
await algoRest.getWalletBalance();

if(
bal?.ok
){
cachedAlgoBalanceLabel =
formatBalanceLabel(
bal.usdt
);
}else{
cachedAlgoBalanceLabel =
"ошибка";
}
}catch(
err
){
log.warn(
"tray-feed algo balance:",
err?.message ||
err
);
cachedAlgoBalanceLabel =
"ошибка";
}

}

async function refreshBalances(){

await Promise.all(
[
refreshTerminalBalance(),
refreshAlgoBalance()
]
);

}

async function pushTrayState(){

if(
!publishTrayState ||
feedBusy
){
return;
}

feedBusy =
true;

try{
const exchangeId =
getActiveExchange();
const status =
getStatusFor({
exchangeId
});
const configured =
!!status?.configured;
const exchange =
exchangeDisplayName(
exchangeId
);

const positions =
configured
? await loadTerminalOpenPositions(
exchangeId
)
: [];

const statusLabel =
configured
? "Активно"
: "Не подключено";

const pnlHidden =
!!trayPrefsStore.readPrefs().pnlHidden;

let algo =
null;

if(
isAlgoTrayAccount()
){
const algoPositions =
await loadAlgoOpenPositions();

algo =
{
exchange:
exchangeDisplayName(
"bybit"
),
statusLabel:
"Активно",
balanceLabel:
cachedAlgoBalanceLabel,
totalPnl:
sumOpenPnl(
algoPositions
),
positions:
mapPositions(
algoPositions,
pnlHidden
)
};
}

publishTrayState(
{
totalPnl:
configured
? sumOpenPnl(
positions
)
: null,
pnlHidden,
exchange,
statusLabel,
balanceLabel:
configured
? cachedBalanceLabel
: "—",
positions:
configured
? mapPositions(
positions,
pnlHidden
)
: [],
algo
}
);
}finally{
feedBusy =
false;
}

}

function stopTrayFeed(){

if(
positionsTimer
){
clearInterval(
positionsTimer
);
positionsTimer =
null;
}

if(
balanceTimer
){
clearInterval(
balanceTimer
);
balanceTimer =
null;
}

publishTrayState =
null;

}

function startTrayFeed(
publish
){

if(
process.platform !==
"darwin" &&
process.platform !==
"win32"
){
return;
}

stopTrayFeed();

if(
typeof publish !==
"function"
){
return;
}

publishTrayState =
publish;

void refreshBalances().then(
()=>
pushTrayState()
);

positionsTimer =
setInterval(
()=>{
void pushTrayState();
},
POSITIONS_POLL_MS
);

balanceTimer =
setInterval(
()=>{
void refreshBalances().then(
()=>
pushTrayState()
);
},
BALANCE_POLL_MS
);

}

module.exports =
{
startTrayFeed,
stopTrayFeed,
refreshTrayFeedNow:
()=>{
void pushTrayState();
}
};
