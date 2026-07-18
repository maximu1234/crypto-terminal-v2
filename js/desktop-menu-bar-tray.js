/**
 * Desktop macOS: суммарный PnL, баланс и позиции → иконка в menu bar.
 */
import {
getAllCachedPositions
} from "./trade-positions-cache.js?v=35";

import {
formatTradePnl
} from "./trade-format.js?v=1";

import {
isExchangeTradingEnabled,
getActiveExchangeDefinition,
EXCHANGE_CHANGED_EVENT
} from "./market-api.js?v=2";

import {
isMenuBarTrayEnabled,
MENU_BAR_TRAY_PREF_EVENT
} from "./desktop-menu-bar-tray-prefs.js?v=2";

const TOTAL_PNL_HIDDEN_KEY =
"trade_book_total_pnl_hidden_v1";

const BALANCE_REFRESH_MS =
15000;

let cachedBalanceLabel =
"—";
let lastBalanceFetchAt =
0;
let traySyncTeardown =
null;

function sumOpenPositionsPnl(
rows
){

let total =
0;
let has =
false;

for(
const row of rows ||
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

function isTotalPnlHidden(){

try{
return (
localStorage.getItem(
TOTAL_PNL_HIDDEN_KEY
) ===
"1"
);
}catch{
return false;
}

}

function mapPositionsForTray(
rows,
pnlHidden
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
: formatTradePnl(
row?.pnl
)
})
);

}

async function fetchBalanceLabel(
desktop,
force =
false
){

const now =
Date.now();

if(
!force &&
now -
lastBalanceFetchAt <
BALANCE_REFRESH_MS
){
return cachedBalanceLabel;
}

lastBalanceFetchAt =
now;

try{
const status =
await desktop.trading?.getStatus?.();

if(
!status?.configured
){
cachedBalanceLabel =
"—";
return cachedBalanceLabel;
}

const bal =
await desktop.trading?.getWalletBalance?.();

if(
!bal?.ok
){
cachedBalanceLabel =
bal?.message
? String(
bal.message
)
: "ошибка";
return cachedBalanceLabel;
}

const num =
Number(
bal.usdt
);

cachedBalanceLabel =
Number.isFinite(
num
)
? num.toLocaleString(
"ru-RU",
{
maximumFractionDigits:
2
}
)
: String(
bal.usdt ??
"—"
);
}catch{
cachedBalanceLabel =
"ошибка";
}

return cachedBalanceLabel;

}

function stopDesktopMenuBarTraySync(){

if(
traySyncTeardown
){
traySyncTeardown();
traySyncTeardown =
null;
}

}

function startDesktopMenuBarTraySync(){

const desktop =
window.cryptoTerminalDesktop;

if(
!desktop?.isDesktop ||
desktop.platform !==
"darwin" ||
typeof desktop.updateMenuBarTray !==
"function"
){
return ()=>{};
}

let rafId =
0;

async function pushTrayState(
options = {}
){

rafId =
0;

const tradingActive =
isExchangeTradingEnabled();
const exchangeName =
getActiveExchangeDefinition().name;

const positions =
tradingActive
? getAllCachedPositions()
: [];
const pnlHidden =
isTotalPnlHidden();
const totalPnl =
tradingActive
? sumOpenPositionsPnl(
positions
)
: null;

let statusLabel =
tradingActive
? "Не подключено"
: "Рынок";

try{

if(
tradingActive
){

const status =
await desktop.trading?.getStatus?.();

if(
status?.configured
){
statusLabel =
"Активно";
}

}

}catch{
/* ignore */
}

const balanceLabel =
tradingActive
? await fetchBalanceLabel(
desktop,
!!options.forceBalance
)
: "—";

try{
await desktop.updateMenuBarTray({
totalPnl,
pnlHidden,
exchange:
exchangeName,
statusLabel,
balanceLabel,
positions:
tradingActive
? mapPositionsForTray(
positions,
pnlHidden
)
: []
});
}catch{
/* ignore */
}

}

function schedulePush(
options = {}
){

if(
rafId
){
return;
}

rafId =
requestAnimationFrame(
()=>{
void pushTrayState(
options
);
}
);

}

const onStorage =
e=>{

if(
e.key ===
TOTAL_PNL_HIDDEN_KEY
){
schedulePush();
}

};

function onBookRefresh(){

schedulePush({
forceBalance:
true
});

}

window.addEventListener(
"trade-stream-positions",
schedulePush
);

window.addEventListener(
"trade-position-updated",
schedulePush
);

window.addEventListener(
"trade-open-positions-changed",
schedulePush
);

window.addEventListener(
"trade-book-refresh",
onBookRefresh
);

window.addEventListener(
"trade-total-pnl-visibility-changed",
schedulePush
);

window.addEventListener(
"exchange-trading-gate-changed",
schedulePush
);

window.addEventListener(
EXCHANGE_CHANGED_EVENT,
schedulePush
);

window.addEventListener(
"storage",
onStorage
);

void pushTrayState({
forceBalance:
true
});

const balanceTimer =
setInterval(
()=>{
void pushTrayState({
forceBalance:
true
});
},
BALANCE_REFRESH_MS
);

return ()=>{
clearInterval(
balanceTimer
);
window.removeEventListener(
"trade-stream-positions",
schedulePush
);
window.removeEventListener(
"trade-position-updated",
schedulePush
);
window.removeEventListener(
"trade-open-positions-changed",
schedulePush
);
window.removeEventListener(
"trade-book-refresh",
onBookRefresh
);
window.removeEventListener(
"trade-total-pnl-visibility-changed",
schedulePush
);
window.removeEventListener(
"exchange-trading-gate-changed",
schedulePush
);
window.removeEventListener(
EXCHANGE_CHANGED_EVENT,
schedulePush
);
window.removeEventListener(
"storage",
onStorage
);

if(
rafId
){
cancelAnimationFrame(
rafId
);
rafId =
0;
}

};

}

export async function applyDesktopMenuBarTrayPreference(){

stopDesktopMenuBarTraySync();

const desktop =
window.cryptoTerminalDesktop;

if(
!desktop?.isDesktop ||
desktop.platform !==
"darwin" ||
typeof desktop.setMenuBarTrayVisible !==
"function"
){
return;
}

const enabled =
isMenuBarTrayEnabled();

try{
await desktop.setMenuBarTrayVisible(
enabled
);
}catch{
/* ignore */
}

/* Tray state is fed from main (menu-bar-tray-feed) — no renderer push. */

}

export function initDesktopMenuBarTray(){

void applyDesktopMenuBarTrayPreference();

const onPrefChanged =
()=>{
void applyDesktopMenuBarTrayPreference();
};

window.addEventListener(
MENU_BAR_TRAY_PREF_EVENT,
onPrefChanged
);

return ()=>{
window.removeEventListener(
MENU_BAR_TRAY_PREF_EVENT,
onPrefChanged
);
stopDesktopMenuBarTraySync();
};

}
