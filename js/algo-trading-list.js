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
coinElements
} from "./terminal/terminal-state.js?v=11";

import {
applyCoinsPrefs,
persistCoinsPrefs,
applySortForCurrentMarket,
readCoinsPrefs
} from "./terminal/terminal-prefs.js?v=19";

import {
generateMarketData,
primeTickerSnapshots,
startTickerStream,
startRealtime,
renderList,
highlightActiveSymbol,
setCoinsTableHooks,
syncCoinListFreezeFromFlagMenus,
getCurrentSymbols,
getVisibleSymbolList
} from "./terminal/terminal-table.js?v=21";

import {
mountCoinsListRefreshControls
} from "./terminal-list-refresh.js?v=1";

import {
loadFavoritesGroups,
saveFavoritesGroups,
setFavoriteGroup,
getFavoriteGroup
} from "./favorites.js?v=5";

import {
ALGO_MARKET_LONG_5M,
ALGO_MARKET_SHORT_5M,
ALGO_MARKET_BOTH_5M,
algoMarketDatasetToFlagId,
getAlgoTickerFlagList,
isAlgoMarketDataset
} from "./algo-trading/ticker-flags.js?v=2";

import {
persistFavoritesToCloud
} from "./cloud-sync.js?v=45";

import {
mountQwertyKeyInput
} from "./qwerty-key-input.js?v=1";

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
"Алго Лонг 5мин"
},
{
id:
ALGO_MARKET_SHORT_5M,
label:
"Алго Шорт 5мин"
},
{
id:
ALGO_MARKET_BOTH_5M,
label:
"Алго Лонг/Шорт 5мин"
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

let favorites =
loadFavoritesGroups();

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

const group =
getFavoriteGroup(
symbol,
favorites
);

btn.className =
"flag coin-flag-btn screener-flag-btn";

if(
group
){
btn.classList.add(
"favorite",
`flag--${group}`
);
}

btn.title =
group
? "Снять флаг"
: "Выбрать флаг";
btn.setAttribute(
"aria-pressed",
group
? "true"
: "false"
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

const before =
JSON.stringify(
favorites
);

favorites =
setFavoriteGroup(
symbol,
group ===
"clear" ||
group ===
null
? null
: group,
favorites
);

if(
JSON.stringify(
favorites
) ===
before
){
return;
}

saveFavoritesGroups(
favorites
);
void persistFavoritesToCloud(
favorites
);

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

if(
coinsState().flagSortActive
){
renderList();
}

}

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
updateCoinFlagButton
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
