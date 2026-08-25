/**
 * Список монет справа на странице АлгоТрейдинг (как на Терминале).
 */
import {
loadMarketSymbols,
buildMarketLists,
getActiveExchangeId,
EXCHANGE_CHANGED_EVENT,
isActiveRealtimeMarketDataset
} from "./market-api.js?v=6";

import {
coinsState,
coinElements,
applyCoinsPrefs,
persistCoinsPrefs,
applySortForCurrentMarket,
readCoinsPrefs,
generateMarketData,
primeTickerSnapshots,
startTickerStream,
startRealtime,
renderList as renderListCore,
highlightActiveSymbol,
setCoinsTableHooks,
syncCoinListFreezeFromFlagMenus,
getCurrentSymbols,
getVisibleSymbolList,
setCoinOpenPositionChecker
} from "./algo-trading/coin-list-host.js?v=2";

import {
hasOpenPosition,
initAlgoOpenPositions
} from "./algo-trading/trade/open-positions.js?v=2";

import {
mountCoinsListRefreshControls
} from "./terminal-list-refresh.js?v=1";

import {
ALGO_MARKET_LONG_5M,
ALGO_MARKET_SHORT_5M,
ALGO_MARKET_BOTH_5M,
ALGO_MARKET_EARLY_T3,
ALGO_LIST_FLAG_UI,
algoMarketDatasetToFlagId,
algoListUiToFlagId,
resolveAlgoListFlagUi,
getAlgoTickerFlagList,
isAlgoMarketDataset,
toggleAlgoTickerInFlagList,
removeAlgoTickerFromFlagList
} from "./algo-trading/ticker-flags.js?v=9";

import {
ALGO_ANALYSIS_BOT_CHANGE_EVENT,
ALGO_ANALYSIS_BOT_PATTERN_12,
ALGO_ANALYSIS_BOT_EARLY_T3,
ALGO_ANALYSIS_BOT_RSI_TOUCH_FLIP,
isActiveAnalysisBot
} from "./algo-trading/active-analysis-bot.js?v=4";

import {
RSI_TOUCH_FLIP_LIST_MARKET,
RSI_TOUCH_FLIP_BOOK_CHANGE_EVENT,
RSI_TOUCH_FLIP_BOOK_OPEN_EVENT,
listRsiTouchFlipBookSymbols,
getRsiTouchFlipBookRow
} from "./algo-trading/rsi-touch-flip-book.js?v=2";

import {
mountQwertyKeyInput
} from "./qwerty-key-input.js?v=1";

import {
isAlgoBotLiteMode
} from "./algo-trading/lite-layout.js?v=4";

function renderList(){

renderListCore();
ensureAlgoListFlagMenus();

}

function applyInstrumentLists(
list
){

const lists =
buildMarketLists(
list
);

coinsState().allListings =
lists.all;
coinsState().allBybitSymbols =
lists.crypto;
coinsState().usdcListings =
lists.usdc ||
[];
coinsState().indicesListings =
lists.indices ||
[];
coinsState().newListings =
lists.new;
coinsState().innovationListings =
lists.innovation;
coinsState().stockListings =
lists.stocks;
coinsState().commodityListings =
lists.commodities;
coinsState().forexListings =
lists.forex;

}

function isRsiTouchFlipMarket(
dataset
){

return dataset ===
RSI_TOUCH_FLIP_LIST_MARKET;

}

function resolveRsiTouchFlipListSymbols(){

return listRsiTouchFlipBookSymbols();

}

async function openListSymbol(
api,
symbol
){

const row =
isRsiTouchFlipMarket(
coinsState().currentDataset
)
? getRsiTouchFlipBookRow(
symbol
)
: null;

if(
row
){

try{
window.dispatchEvent(
new CustomEvent(
RSI_TOUCH_FLIP_BOOK_OPEN_EVENT,
{
detail:
row
}
)
);
}catch{
/* ignore */
}

await api.loadSymbol?.(
symbol,
row.tf
);
return;

}

await api.loadSymbol?.(
symbol
);

}

function coinsMarketHasSymbols(
market
){

if(
isRsiTouchFlipMarket(
market
)
){
return listRsiTouchFlipBookSymbols().length >
0;
}

if(
isAlgoMarketDataset(
market
)
){
return getAlgoTickerFlagList(
algoMarketDatasetToFlagId(
market
)
).length >
0;
}

const map =
{
all:
coinsState().allListings,
crypto:
coinsState().allBybitSymbols,
new:
coinsState().newListings,
innovation:
coinsState().innovationListings,
usdc:
coinsState().usdcListings,
stocks:
coinsState().stockListings,
indices:
coinsState().indicesListings,
commodities:
coinsState().commodityListings,
forex:
coinsState().forexListings
};

return !!(
map[
market
]?.length
);

}

function algoMarketFilterOptions(){

const pattern12On =
isActiveAnalysisBot(
ALGO_ANALYSIS_BOT_PATTERN_12
);
const earlyT3On =
isActiveAnalysisBot(
ALGO_ANALYSIS_BOT_EARLY_T3
);
const rsiOn =
isActiveAnalysisBot(
ALGO_ANALYSIS_BOT_RSI_TOUCH_FLIP
);

if(
!pattern12On &&
!earlyT3On &&
!rsiOn
){
return [
{
id:
"all",
label:
"Все"
}
];
}

const options =
[
{
id:
"all",
label:
"Все"
}
];

if(
pattern12On
){
options.push(
{
id:
ALGO_MARKET_LONG_5M,
label:
"Стратегия 1"
},
{
id:
ALGO_MARKET_SHORT_5M,
label:
"Стратегия 2"
},
{
id:
ALGO_MARKET_BOTH_5M,
label:
"Стратегия 3"
}
);
}

if(
earlyT3On
){
options.push(
{
id:
ALGO_MARKET_EARLY_T3,
label:
"1-2 Early T3"
}
);
}

if(
rsiOn
){
options.push(
{
id:
RSI_TOUCH_FLIP_LIST_MARKET,
label:
"RSI Touch Flip"
}
);
}

return options;

}

function syncMarketFilterOptions(){

const marketFilter =
document.getElementById(
"market-filter"
);

if(
!marketFilter
){
return;
}

const markets =
algoMarketFilterOptions();
const prev =
marketFilter.value;
const dataset =
coinsState().currentDataset;

marketFilter.innerHTML =
markets.map(
m=>
`<option value="${m.id}">${m.label}</option>`
).join(
""
);

const allowed =
markets.map(
m=>
m.id
);

if(
allowed.includes(
prev
)
){
marketFilter.value =
prev;
}else if(
allowed.includes(
dataset
)
){
marketFilter.value =
dataset;
}else{
marketFilter.value =
"all";
coinsState().currentDataset =
"all";
}

}

function onAnalysisBotMarketFilter(){

const prevDataset =
coinsState().currentDataset;

if(
isActiveAnalysisBot(
ALGO_ANALYSIS_BOT_RSI_TOUCH_FLIP
)
){
coinsState().currentDataset =
RSI_TOUCH_FLIP_LIST_MARKET;
}

syncMarketFilterOptions();

if(
coinsState().currentDataset !==
prevDataset
){
persistCoinsPrefs();
generateMarketData();
void primeTickerSnapshots().then(
()=>{
renderList();
highlightActiveSymbol();
}
);
return;
}

renderList();

}

function resolveAlgoMarketSymbols(
dataset
){

if(
isRsiTouchFlipMarket(
dataset
)
){
return resolveRsiTouchFlipListSymbols();
}

const flagId =
algoMarketDatasetToFlagId(
dataset
);

if(
!flagId
){
return null;
}

return getAlgoTickerFlagList(
flagId
);

}

export function refreshAlgoMarketListFromFlags(){

const dataset =
coinsState().currentDataset;

if(
!isAlgoMarketDataset(
dataset
) &&
!isRsiTouchFlipMarket(
dataset
)
){
return;
}

generateMarketData();
void primeTickerSnapshots().then(
()=>{
renderList();
highlightActiveSymbol();
}
);

}

function ensureAlgoListFlagMenus(){

const pattern12On =
isActiveAnalysisBot(
ALGO_ANALYSIS_BOT_PATTERN_12
);
const earlyT3On =
isActiveAnalysisBot(
ALGO_ANALYSIS_BOT_EARLY_T3
);
const rows =
ALGO_LIST_FLAG_UI.filter(
row=>
(
pattern12On &&
row.ui !==
"algo-early-t3"
) ||
(
earlyT3On &&
row.ui ===
"algo-early-t3"
)
);
const signature =
rows.map(
row=>
row.ui
).join(
","
);

document.querySelectorAll(
".coin-flag-menu"
).forEach(
menu=>{

const wrap =
menu.closest(
".coin-flag-wrap"
);

if(
!signature
){

if(
menu.dataset.algoListFlags !==
"none"
){
menu.innerHTML =
"";
menu.dataset.algoListFlags =
"none";
}

wrap?.classList.add(
"is-algo-flag-off"
);
return;

}

wrap?.classList.remove(
"is-algo-flag-off"
);

if(
menu.dataset.algoListFlags ===
signature
){
return;
}

menu.dataset.algoListFlags =
signature;
menu.innerHTML =
"";

for(
const row of rows
){

const btn =
document.createElement(
"button"
);

btn.type =
"button";
btn.className =
`flag coin-flag-pick flag--${row.ui}`;
btn.dataset.flagGroup =
row.ui;
btn.title =
row.title;
btn.setAttribute(
"role",
"menuitem"
);

btn.addEventListener(
"click",
e=>{

e.stopPropagation();

const wrap =
menu.closest(
".coin-flag-wrap"
);
const symbol =
wrap?.querySelector(
"[data-coin-flag-trigger]"
)?.dataset?.symbol;
const trigger =
wrap?.querySelector(
"[data-coin-flag-trigger]"
);

menu.classList.add(
"hidden"
);
trigger?.setAttribute(
"aria-expanded",
"false"
);
syncCoinListFreezeFromFlagMenus();

if(
symbol
){
applyCoinFavoriteGroupRef?.(
symbol,
row.ui
);
}

}
);

menu.appendChild(
btn
);

}

}
);

}

/** @type {((symbol: string, group: string|null) => void)|null} */
let applyCoinFavoriteGroupRef =
null;

/**
 * @param {{
 *   getSymbol: () => string,
 *   loadSymbol: (symbol: string) => Promise<void>|void,
 *   setSymbolLabel: (symbol: string) => void
 * }} api
 */
export async function mountAlgoTradingCoinList(
api
){

setCoinOpenPositionChecker(
hasOpenPosition,
true
);
initAlgoOpenPositions();

window.addEventListener(
"algo-trade-open-positions-changed",
()=>{
highlightActiveSymbol();
renderList();
}
);

window.addEventListener(
"algo-bot-ticker-flags-changed",
()=>{
refreshAlgoMarketListFromFlags();
}
);

window.addEventListener(
RSI_TOUCH_FLIP_BOOK_CHANGE_EVENT,
refreshAlgoMarketListFromFlags
);

window.addEventListener(
ALGO_ANALYSIS_BOT_CHANGE_EVENT,
onAnalysisBotMarketFilter
);

function closeAllCoinFlagMenus(
exceptWrap =
null
){

document.querySelectorAll(
".coin-flag-wrap"
).forEach(
wrap=>{

if(
wrap ===
exceptWrap
){
return;
}

wrap.querySelector(
".coin-flag-menu"
)?.classList.add(
"hidden"
);
wrap.querySelector(
"[data-coin-flag-trigger]"
)?.setAttribute(
"aria-expanded",
"false"
);

}
);

syncCoinListFreezeFromFlagMenus();

}

function updateCoinFlagButton(
btn,
symbol
){

const painted =
resolveAlgoListFlagUi(
symbol,
coinsState().currentDataset
);

btn.className =
"flag coin-flag-btn screener-flag-btn";

if(
painted
){
btn.classList.add(
"favorite",
`flag--${painted.ui}`
);
btn.title =
`Снять: ${painted.title}`;
btn.setAttribute(
"aria-pressed",
"true"
);
return;
}

btn.title =
"Флаг списка Алго";
btn.setAttribute(
"aria-pressed",
"false"
);

}

function applyCoinFavoriteGroup(
symbol,
group
){

if(
!symbol
){
return;
}

const dataset =
coinsState().currentDataset;
const preferredFlag =
algoMarketDatasetToFlagId(
dataset
);

if(
group ===
"clear" ||
group ===
null
){
const painted =
resolveAlgoListFlagUi(
symbol,
dataset
);
const removeId =
painted?.flagId ||
preferredFlag;

if(
removeId
){
removeAlgoTickerFromFlagList(
removeId,
symbol
);
}

paintAndMaybeRefreshList(
symbol,
removeId
);
return;
}

const flagId =
algoListUiToFlagId(
group
);

if(
!flagId
){
return;
}

toggleAlgoTickerInFlagList(
flagId,
symbol
);

paintAndMaybeRefreshList(
symbol,
flagId
);

}

function paintAndMaybeRefreshList(
symbol,
touchedFlagId
){

const row =
coinElements.get(
symbol
);
const btn =
row?.querySelector(
"[data-coin-flag-trigger]"
);

if(
btn
){
updateCoinFlagButton(
btn,
symbol
);
}

const dataset =
coinsState().currentDataset;
const datasetFlag =
algoMarketDatasetToFlagId(
dataset
);

if(
datasetFlag &&
(
!touchedFlagId ||
touchedFlagId ===
datasetFlag
)
){
refreshAlgoMarketListFromFlags();
}

}

applyCoinFavoriteGroupRef =
applyCoinFavoriteGroup;

setCoinsTableHooks(
{
setCoinsChartSymbol(
symbol
){
coinsState().currentSymbol =
String(
symbol ||
""
).trim().toUpperCase();
api.setSymbolLabel?.(
coinsState().currentSymbol
);
},
async loadSymbol(
symbol
){
await openListSymbol(
api,
symbol
);
},
getCurrentSymbols(
dataset
){
return resolveAlgoMarketSymbols(
dataset
);
},
closeAllCoinFlagMenus,
applyCoinFavoriteGroup,
updateCoinFlagButton,
onTickerTick(
item
){
api.onTickerTick?.(
item
);
}
}
);

applyCoinsPrefs();

if(
isActiveAnalysisBot(
ALGO_ANALYSIS_BOT_RSI_TOUCH_FLIP
)
){
coinsState().currentDataset =
RSI_TOUCH_FLIP_LIST_MARKET;
}

syncMarketFilterOptions();
mountCoinsListRefreshControls();

window.addEventListener(
"algo-trade-book-panel-ready",
()=>{
generateMarketData();
renderList();
highlightActiveSymbol();
}
);

async function loadSymbolsViaIpc(){

const api =
window.cryptoTerminalDesktop?.algoTrading;

if(
typeof api?.listLinearUsdtSymbols !==
"function"
){
return null;
}

try{
const result =
await Promise.race(
[
api.listLinearUsdtSymbols(),
new Promise(
(
_,
reject
)=>
setTimeout(
()=>
reject(
new Error(
"symbols ipc timeout"
)
),
15000
)
)
]
);

if(
result?.ok &&
Array.isArray(
result.symbols
) &&
result.symbols.length
){
return result.symbols;
}

console.warn(
"[algo-trading] symbols ipc:",
result?.message ||
"empty"
);
}catch(
err
){
console.warn(
"[algo-trading] symbols ipc:",
err?.message ||
err
);
}

return null;

}

function isUsdtLinearInstrument(
row
){

const sym =
String(
row?.symbol ||
""
).trim();
const quote =
String(
row?.quoteCoin ||
""
).toUpperCase();
const settle =
String(
row?.settleCoin ||
""
).toUpperCase();
const contractType =
String(
row?.contractType ||
""
);

if(
!sym ||
quote !==
"USDT" ||
(
settle &&
settle !==
"USDT"
)
){
return false;
}

if(
contractType &&
contractType !==
"LinearPerpetual"
){
return false;
}

return true;

}

async function loadSymbolsViaLocalBybitProxy(){

const symbols =
[];
let cursor =
"";

for(
let page =
0;
page <
8;
page++
){

const params =
new URLSearchParams(
{
category:
"linear",
limit:
"1000",
status:
"Trading"
}
);

if(
cursor
){
params.set(
"cursor",
cursor
);
}

const res =
await fetch(
`/api/bybit?path=${encodeURIComponent(
`/v5/market/instruments-info?${params}`
)}`,
{
cache:
"no-store"
}
);
const json =
await res.json();

if(
json?.retCode !==
0 ||
!Array.isArray(
json?.result?.list
)
){
throw new Error(
json?.retMsg ||
json?.message ||
`HTTP ${res.status}`
);
}

for(
const row of json.result.list
){

if(
isUsdtLinearInstrument(
row
)
){
symbols.push(
String(
row.symbol
).trim()
);
}

}

const next =
json.result.nextPageCursor;

if(
!next ||
next ===
cursor
){
break;
}

cursor =
next;

}

return [
...new Set(
symbols
)
].sort();

}

async function loadAlgoInstrumentList(
options
){

if(
isAlgoBotLiteMode()
){

const ipcSymbols =
await loadSymbolsViaIpc();

if(
ipcSymbols?.length
){
return ipcSymbols;
}

try{
const localSymbols =
await loadSymbolsViaLocalBybitProxy();

if(
localSymbols.length
){
return localSymbols;
}
}catch(
err
){
console.warn(
"[algo-trading] symbols local proxy:",
err?.message ||
err
);
}

}

return loadMarketSymbols(
options
);

}

async function refreshMarketUi(){

try{
const list =
await loadAlgoInstrumentList();
applyInstrumentLists(
list
);
}catch(
err
){
console.warn(
"[algo-trading] symbols:",
err?.message ||
err
);
}

const dataset =
coinsState().currentDataset;

if(
isActiveRealtimeMarketDataset(
dataset
) &&
!coinsMarketHasSymbols(
dataset
)
){
try{
const list =
await loadAlgoInstrumentList(
{
forceNetwork:
true
}
);
applyInstrumentLists(
list
);
}catch(
err
){
console.warn(
"[algo-trading] symbols retry:",
err?.message ||
err
);
}
}

generateMarketData();
renderList();
highlightActiveSymbol();

try{
await primeTickerSnapshots();
renderList();
highlightActiveSymbol();
}catch(
err
){
console.warn(
"[algo-trading] ticker snapshots:",
err?.message ||
err
);
}

if(
!isAlgoBotLiteMode()
){
startRealtime();
}

startTickerStream();

if(
!coinsState().marketData.length
){
console.warn(
"[algo-trading] coin list empty after symbol load"
);
}

}

const marketFilter =
document.getElementById(
"market-filter"
);

if(
marketFilter
){
marketFilter.value =
coinsState().currentDataset;
marketFilter.addEventListener(
"change",
async()=>{

coinsState().currentDataset =
marketFilter.value;
applySortForCurrentMarket();
persistCoinsPrefs();
coinsState().searchQuery =
"";

const searchInput =
document.getElementById(
"coin-search"
);

if(
searchInput
){
searchInput.value =
"";
}

generateMarketData();
renderList();

try{
await primeTickerSnapshots();
renderList();
}catch(
err
){
console.warn(
"[algo-trading] ticker snapshots:",
err?.message ||
err
);
}

}
);
}

const coinSearchEl =
document.getElementById(
"coin-search"
);

if(
coinSearchEl
){
mountQwertyKeyInput(
coinSearchEl,
{
onInput(){
coinsState().searchQuery =
coinSearchEl.value;
renderList();
}
}
);
}

document.getElementById(
"table-header"
)?.addEventListener(
"click",
e=>{

const el =
e.target.closest(
".sortable"
);

if(
!el
){
return;
}

const mode =
el.dataset.sort;

if(
mode ===
"favorites"
){
coinsState().flagSortActive =
!coinsState().flagSortActive;

if(
coinsState().flagSortActive
){
coinsState().flagSortAsc =
!coinsState().flagSortAsc;
}

}else{
coinsState().flagSortActive =
false;

if(
coinsState().innerSortMode ===
mode
){
coinsState().sortAsc =
!coinsState().sortAsc;
}else{
coinsState().innerSortMode =
mode;
coinsState().sortAsc =
mode ===
"symbol";
}

}

persistCoinsPrefs();
renderList();

}
);

document.addEventListener(
"click",
e=>{

if(
!e.target.closest(
".coin-flag-wrap"
)
){
closeAllCoinFlagMenus();
}

}
);

window.addEventListener(
EXCHANGE_CHANGED_EVENT,
()=>{
syncMarketFilterOptions();
void refreshMarketUi();
}
);

await refreshMarketUi();

function shouldIgnoreListKeyNav(
event
){

const target =
event?.target;

if(
!target
){
return false;
}

const tag =
target.tagName?.toLowerCase();

if(
tag ===
"input" ||
tag ===
"textarea" ||
tag ===
"select" ||
tag ===
"button"
){
return true;
}

if(
target.isContentEditable
){
return true;
}

return false;

}

async function navigateCoinsList(
direction
){

const symbols =
getVisibleSymbolList();

if(
!symbols.length
){
return;
}

const current =
normalizeListSymbol(
api.getSymbol?.() ||
coinsState().currentSymbol
);
const goDown =
direction >
0;
let index =
symbols.findIndex(
sym=>
normalizeListSymbol(
sym
) ===
current
);

if(
index <
0
){
index =
goDown
? -1
: 0;
}

if(
goDown
){
index =
(
index +
1
) %
symbols.length;
}else{
index =
(
index -
1 +
symbols.length
) %
symbols.length;
}

const next =
symbols[
index
];

if(
!next ||
normalizeListSymbol(
next
) ===
current
){
return;
}

api.setSymbolLabel?.(
next
);
coinsState().currentSymbol =
next;
highlightActiveSymbol();
await openListSymbol(
api,
next
);
highlightActiveSymbol();

}

function normalizeListSymbol(
raw
){

return String(
raw ||
""
).trim().toUpperCase().replace(
/\.P$/i,
""
);

}

const onListKeyDown =
async event=>{

if(
shouldIgnoreListKeyNav(
event
)
){
return;
}

const goDown =
event.code ===
"ArrowDown" ||
event.code ===
"Space" ||
event.key ===
" ";
const goUp =
event.code ===
"ArrowUp";

if(
!goDown &&
!goUp
){
return;
}

event.preventDefault();
await navigateCoinsList(
goDown
? 1
: -1
);

};

document.addEventListener(
"keydown",
onListKeyDown
);

const symbols =
getCurrentSymbols();
const active =
api.getSymbol?.() ||
coinsState().currentSymbol;

if(
isRsiTouchFlipMarket(
coinsState().currentDataset
)
){
const listed =
symbols.find(
row=>
normalizeListSymbol(
row
) ===
normalizeListSymbol(
active
)
);

if(
listed
){
coinsState().currentSymbol =
listed;
highlightActiveSymbol();
}
}else if(
active &&
symbols.includes(
active
)
){
coinsState().currentSymbol =
active;
highlightActiveSymbol();
}

return {
refresh:
refreshMarketUi,
highlight:
highlightActiveSymbol,
destroy(){

document.removeEventListener(
"keydown",
onListKeyDown
);
window.removeEventListener(
ALGO_ANALYSIS_BOT_CHANGE_EVENT,
onAnalysisBotMarketFilter
);
window.removeEventListener(
RSI_TOUCH_FLIP_BOOK_CHANGE_EVENT,
refreshAlgoMarketListFromFlags
);

}
};

}
