/**
 * Main-process tray feed (macOS menu bar / Windows tray): algo positions/PnL/balance
 * without renderer.
 *
 * Algo Bot quarantine: Terminal Bybit/BingX trading stack is not registered —
 * tray shows **algo account only** (no Terminal main-account section).
 */
const log =
require(
"electron-log"
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

return `${sign}${num.toFixed(
2
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

return `${num.toFixed(
2
)} USDT`;

}

function exchangeDisplayName(
exchangeId
){

const id =
String(
exchangeId ||
""
).toLowerCase();

if(
id ===
"bingx"
){
return "BingX";
}

return "Bybit";

}

function isOpenPosition(
pos
){

const size =
Math.abs(
Number(
pos?.size ??
pos?.qty ??
0
)
);

return size >
0;

}

function isAlgoTrayAccount(){

try{
const status =
getAlgoCredentialsStatus();

return !!status?.configured;
}catch{
return false;
}

}

function mapPositions(
positions,
pnlHidden
){

return (
Array.isArray(
positions
)
? positions
: []
).map(
(
pos
)=>{

const symbol =
String(
pos?.symbol ||
""
);
const side =
String(
pos?.side ||
""
).toLowerCase();
const size =
Number(
pos?.size ??
pos?.qty ??
0
);
const unrealised =
Number(
pos?.unrealisedPnl ??
pos?.unrealizedPnl ??
0
);

return {
symbol,
side,
size,
pnlLabel:
pnlHidden
? "•••"
: formatPnlLabel(
unrealised
),
pnl:
pnlHidden
? null
: unrealised
};

}
);

}

function sumOpenPnl(
positions
){

let total =
0;

for(
const pos of Array.isArray(
positions
)
? positions
: []
){
const n =
Number(
pos?.unrealisedPnl ??
pos?.unrealizedPnl ??
0
);

if(
Number.isFinite(
n
)
){
total +=
n;
}

}

return total;

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

await refreshAlgoBalance();

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
const configured =
isAlgoTrayAccount();
const pnlHidden =
!!trayPrefsStore.readPrefs().pnlHidden;
const positions =
configured
? await loadAlgoOpenPositions()
: [];

publishTrayState(
{
totalPnl:
configured
? sumOpenPnl(
positions
)
: null,
pnlHidden,
exchange:
exchangeDisplayName(
"bybit"
),
statusLabel:
configured
? "Активно"
: "Не подключено",
balanceLabel:
configured
? cachedAlgoBalanceLabel
: "—",
positions:
configured
? mapPositions(
positions,
pnlHidden
)
: [],
/* No nested Terminal account — Algo Bot is algo-only. */
algo:
null
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
