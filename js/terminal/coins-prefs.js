import {
coinsState,
COINS_PREFS_KEY,
COINS_MARKETS,
COINS_SORT_MODES,
COINS_TF_VALUES,
isCoinsPage
} from "./coins-state.js?v=5";

import {
getCurrentSymbols,
getFirstVisibleSymbol
} from "./coins-table.js?v=6";

export function defaultSortEntry(){

return {
mode:"symbol",
asc:true,
byFlag:false,
flagAsc:true
};

}

export function defaultLastViewEntry(){

return {
symbol:null,
tf:"60"
};

}

export function normalizeLastViewEntry(entry){

const tf =
typeof entry?.tf === "string" &&
COINS_TF_VALUES.has(entry.tf)
? entry.tf
: "60";

const symbol =
typeof entry?.symbol === "string" &&
entry.symbol.trim()
? entry.symbol.trim().toUpperCase()
: null;

return {
symbol,
tf
};

}

export function defaultCoinsPrefs(){

const sortByMarket =
{};

const lastViewByMarket =
{};

for(const m of COINS_MARKETS){
sortByMarket[m] = defaultSortEntry();
lastViewByMarket[m] = defaultLastViewEntry();
}

return {
market:"all",
sortByMarket,
lastViewByMarket,
invertChart:false,
invertRsiChart:false
};

}

export function normalizeSortEntry(entry){

if(!entry || typeof entry !== "object"){
return defaultSortEntry();
}

let mode =
typeof entry.mode === "string" &&
COINS_SORT_MODES.has(entry.mode)
? entry.mode
: "symbol";

const asc =
typeof entry.asc === "boolean"
? entry.asc
: true;

let byFlag =
typeof entry.byFlag === "boolean"
? entry.byFlag
: false;

let flagAsc =
typeof entry.flagAsc === "boolean"
? entry.flagAsc
: true;

if(mode === "favorites"){
byFlag = true;
flagAsc = asc;
mode = "symbol";
}

return {
mode,
asc,
byFlag,
flagAsc
};

}

export function mergeLegacySortIntoPrefs(
prefs,
legacySort
){

if(!legacySort || typeof legacySort !== "object"){
return false;
}

let changed =
false;

if(
legacySort.sortByMarket &&
typeof legacySort.sortByMarket === "object"
){

for(const m of COINS_MARKETS){

if(legacySort.sortByMarket[m]){

prefs.sortByMarket[m] =
normalizeSortEntry(
legacySort.sortByMarket[m]
);

changed = true;

}

}

}else if(
typeof legacySort.mode === "string"
){

const entry =
normalizeSortEntry(legacySort);

for(const m of COINS_MARKETS){
prefs.sortByMarket[m] = { ...entry };
}

changed = true;

}else{

for(const m of COINS_MARKETS){

if(
legacySort[m] &&
typeof legacySort[m] === "object"
){

prefs.sortByMarket[m] =
normalizeSortEntry(
legacySort[m]
);

changed = true;

}

}

}

return changed;

}

export function mergeLegacyCoinsStorage(prefs){

let changed =
false;

const legacyMarket =
localStorage.getItem("coins_market_dataset");

if(
legacyMarket &&
COINS_MARKETS.includes(legacyMarket)
){

prefs.market = legacyMarket;
changed = true;

}

const legacySortRaw =
localStorage.getItem("coins_sort_state");

if(legacySortRaw){

try{

const legacySort =
JSON.parse(legacySortRaw);

if(
mergeLegacySortIntoPrefs(
prefs,
legacySort
)
){
changed = true;
}

}catch(err){

console.warn("legacy coins sort:", err);

}

}

if(changed){

writeCoinsPrefs(prefs);

try{

localStorage.removeItem("coins_market_dataset");
localStorage.removeItem("coins_sort_state");

}catch{}

}

return prefs;

}

export function readCoinsPrefs(){

try{

let prefs =
defaultCoinsPrefs();

const raw =
localStorage.getItem(COINS_PREFS_KEY);

if(raw){

const parsed =
JSON.parse(raw);

prefs.market =
COINS_MARKETS.includes(parsed?.market)
? parsed.market
: "all";

for(const m of COINS_MARKETS){
prefs.sortByMarket[m] =
normalizeSortEntry(
parsed?.sortByMarket?.[m]
);

prefs.lastViewByMarket[m] =
normalizeLastViewEntry(
parsed?.lastViewByMarket?.[m]
);

}

prefs.invertChart =
!!parsed?.invertChart;

prefs.invertRsiChart =
!!parsed?.invertRsiChart;

try{

localStorage.removeItem(
"coins_market_dataset"
);
localStorage.removeItem(
"coins_sort_state"
);

}catch(_){
}

return prefs;

}

writeCoinsPrefs(prefs);

if(
localStorage.getItem("coins_market_dataset") ||
localStorage.getItem("coins_sort_state")
){

prefs =
mergeLegacyCoinsStorage(prefs);

}

return prefs;

}catch(err){

console.warn("coins prefs read:", err);
return defaultCoinsPrefs();

}

}

export function writeCoinsPrefs(prefs){

try{

const out =
defaultCoinsPrefs();

out.market =
COINS_MARKETS.includes(prefs?.market)
? prefs.market
: "all";

for(const m of COINS_MARKETS){
out.sortByMarket[m] =
normalizeSortEntry(
prefs?.sortByMarket?.[m]
);

out.lastViewByMarket[m] =
normalizeLastViewEntry(
prefs?.lastViewByMarket?.[m]
);
}

out.invertChart =
!!prefs?.invertChart;

out.invertRsiChart =
!!prefs?.invertRsiChart;

localStorage.setItem(
COINS_PREFS_KEY,
JSON.stringify(out)
);

}catch(err){

console.warn("coins prefs write:", err);

}

}

export function persistCoinsPrefs(){

const prefs =
readCoinsPrefs();

prefs.market = coinsState().currentDataset;
prefs.sortByMarket[coinsState().currentDataset] = {
mode:coinsState().innerSortMode,
asc:coinsState().sortAsc,
byFlag:coinsState().flagSortActive,
flagAsc:coinsState().flagSortAsc
};

if(!prefs.lastViewByMarket){
prefs.lastViewByMarket = {};
}

prefs.lastViewByMarket[coinsState().currentDataset] = {
symbol:coinsState().currentSymbol,
tf:coinsState().currentTF
};

if(
isCoinsPage
){
prefs.invertChart =
coinsState().isCoinsChartInverted;

prefs.invertRsiChart =
coinsState().isCoinsRsiInverted;
}

writeCoinsPrefs(prefs);

}

export function readLastViewFromPrefs(){

const prefs =
readCoinsPrefs();

return normalizeLastViewEntry(
prefs.lastViewByMarket?.[coinsState().currentDataset]
);

}

export function bootstrapCoinsPageState(){

readUrlParams();
applyCoinsPrefs();

if(coinsState().hasUrlSymbol){
return;
}

const last =
readLastViewFromPrefs();

if(
last.tf &&
COINS_TF_VALUES.has(last.tf)
){
coinsState().currentTF = last.tf;
}

if(last.symbol){
coinsState().currentSymbol = last.symbol;
}

}

export function resolveInitialSymbolAndTf(){

const last =
readLastViewFromPrefs();

if(
last.tf &&
COINS_TF_VALUES.has(last.tf)
){
coinsState().currentTF = last.tf;
}

const symbols =
getCurrentSymbols();

if(last.symbol){

if(
symbols.length === 0 ||
symbols.includes(last.symbol)
){
coinsState().currentSymbol = last.symbol;
return;
}

}

coinsState().currentSymbol =
getFirstVisibleSymbol() ||
symbols[0] ||
"BTCUSDT";

}

export function applySortForCurrentMarket(){

const prefs =
readCoinsPrefs();

const sort =
prefs.sortByMarket[coinsState().currentDataset] ||
defaultSortEntry();

coinsState().innerSortMode = sort.mode;
coinsState().sortAsc = sort.asc;
coinsState().flagSortActive = sort.byFlag;
coinsState().flagSortAsc = sort.flagAsc;

}

export function applyCoinsPrefs(){

const prefs =
readCoinsPrefs();

if(!coinsState().hasUrlSymbol){

coinsState().currentDataset = prefs.market;

}

applySortForCurrentMarket();

}


export function readUrlParams(){

const params =
new URLSearchParams(window.location.search);

const symbol =
params.get("symbol");

const tf =
params.get("tf");

if(symbol){
coinsState().currentSymbol = symbol.trim().toUpperCase();
coinsState().currentDataset = "all";
coinsState().hasUrlSymbol = true;
}

if(tf){
coinsState().currentTF = tf;
}

}

