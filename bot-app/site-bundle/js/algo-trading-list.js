/**
 * Список монет справа на странице АлгоТрейдинг (как на Терминале).
 */
import {
loadMarketSymbols,
buildMarketLists,
getActiveExchangeId,
EXCHANGE_CHANGED_EVENT,
isActiveRealtimeMarketDataset
} from "./market-api.js?v=2";

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
} from "./algo-trading/coin-list-host.js?v=1";

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
ALGO_MARKET_FAVORITES,
ALGO_LIST_FLAG_UI,
algoMarketDatasetToFlagId,
algoListUiToFlagId,
resolveAlgoListFlagUi,
getAlgoTickerFlagList,
isAlgoMarketDataset,
toggleAlgoTickerInFlagList,
removeAlgoTickerFromFlagList
} from "./algo-trading/ticker-flags.js?v=6";

import {
mountQwertyKeyInput
} from "./qwerty-key-input.js?v=1";

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

function coinsMarketHasSymbols(
market
){

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

return [
{
id:
"all",
label:
"Все"
},
{
id:
ALGO_MARKET_LONG_5M,
label:
"Алго Лонг"
},
{
id:
ALGO_MARKET_SHORT_5M,
label:
"Алго Шорт"
},
{
id:
ALGO_MARKET_BOTH_5M,
label:
"Алго Лонг/Шорт"
},
{
id:
ALGO_MARKET_FAVORITES,
label:
"Избранные"
}
];

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

function resolveAlgoMarketSymbols(
dataset
){

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

document.querySelectorAll(
".coin-flag-menu"
).forEach(
menu=>{

if(
menu.dataset.algoListFlags ===
"1"
){
return;
}

menu.dataset.algoListFlags =
"1";
menu.innerHTML =
"";

for(
const row of ALGO_LIST_FLAG_UI
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
await api.loadSymbol(
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
syncMarketFilterOptions();
mountCoinsListRefreshControls();

async function refreshMarketUi(){

try{
const list =
await loadMarketSymbols();
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
await loadMarketSymbols(
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
await primeTickerSnapshots();
renderList();
highlightActiveSymbol();
startRealtime();
startTickerStream();

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
await primeTickerSnapshots();
renderList();

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
await api.loadSymbol?.(
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

}
};

}
