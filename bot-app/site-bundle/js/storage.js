import {
loadFavoritesGroups,
saveFavoritesGroups,
favoritesToCloudList,
favoritesFromCloudList
} from "./favorites.js?v=5";

export function saveWidgetState(index, symbol, tf){

const state = {

symbol,
tf

};

localStorage.setItem(
`widget_${index}`,
JSON.stringify(state)
);

saveWidgetStateBySymbol(
symbol,
tf
);

}

export function saveWidgetStateBySymbol(symbol, tf){

const sym =
String(
symbol || ""
).trim().toUpperCase();

if(
!sym
){
return;
}

localStorage.setItem(
`widget_sym_${sym}`,
JSON.stringify({
symbol: sym,
tf
})
);

}

export function loadWidgetStateBySymbol(symbol){

const sym =
String(
symbol || ""
).trim().toUpperCase();

if(
!sym
){
return null;
}

const raw =
localStorage.getItem(
`widget_sym_${sym}`
);

if(
!raw
){
return null;
}

try{

return JSON.parse(raw);

}catch{

return null;

}

}

export function loadWidgetState(index){

const raw =
localStorage.getItem(
`widget_${index}`
);

if(!raw){
return null;
}

try{

return JSON.parse(raw);

}catch{

return null;

}

}

export function saveFavoritesGroupsState(groups){

saveFavoritesGroups(groups);

}

export function loadFavoritesGroupsState(){

return loadFavoritesGroups();

}

export function saveFavorites(favorites){

saveFavoritesGroups(
favoritesFromCloudList(favorites)
);

}

export function loadFavorites(){

return favoritesToCloudList(
loadFavoritesGroups()
);

}

export function saveLayout(layout){

localStorage.setItem(
"dashboard_layout",
layout
);

}

export function loadLayout(){

const raw =
Number(
localStorage.getItem(
"dashboard_layout"
)
);

return (
raw === 4 ||
raw === 6 ||
raw === 9
)
? raw
: 9;

}

export function saveScreenerState(state){

localStorage.setItem(
"screener_state",
JSON.stringify(state)
);

}

export function loadScreenerState(){

try{

return JSON.parse(
localStorage.getItem("screener_state") || "{}"
);

}catch{

return {};

}

}

const COINS_SORT_STORAGE_KEY =
"coins_sort_state";

const COINS_MARKET_STORAGE_KEY =
"coins_market_dataset";

const COINS_SORT_MARKETS = [
"crypto",
"new",
"stocks",
"commodities",
"forex"
];

const COINS_SORT_MARKET_SET =
new Set(COINS_SORT_MARKETS);

const COINS_SORT_MODES =
new Set([
"favorites",
"symbol",
"24h",
"1h"
]);

function normalizeCoinsSortEntry(entry){

let mode =
entry &&
typeof entry.mode === "string" &&
COINS_SORT_MODES.has(entry.mode)
? entry.mode
: "symbol";

let asc =
entry &&
typeof entry.asc === "boolean"
? entry.asc
: true;

/* legacy без asc считался по имени ascending */
return { mode, asc };

}

function migrateLegacyCoinsSort(parsed){

/* v2 — объект вида { crypto:{…}, forex:{…} } */
let hasNested = false;

for(const m of COINS_SORT_MARKETS){

if(parsed?.[m] && typeof parsed[m] === "object"){
hasNested = true;
break;
}

}

if(hasNested){
return parsed;
}

/*
  v1 — плоско { mode, asc } для одного набора фильтров
*/
if(parsed && typeof parsed === "object"){

const first =
normalizeCoinsSortEntry(parsed);

const out =
{};

for(const m of COINS_SORT_MARKETS){
out[m] = { ...first };
}

return out;

}

return null;

}

export function loadCoinsSortMap(){

const blank = ()=>{

const out =
{};

for(const m of COINS_SORT_MARKETS){
out[m] = normalizeCoinsSortEntry(null);
}

return out;

};

try{

let parsed =
JSON.parse(
localStorage.getItem(
COINS_SORT_STORAGE_KEY
) || "null"
);

if(parsed == null){

return blank();

}

parsed =
migrateLegacyCoinsSort(parsed) || {};

const out =
{};

for(const m of COINS_SORT_MARKETS){
out[m] =
normalizeCoinsSortEntry(
parsed[m]
);
}

return out;

}catch{

return blank();

}

}

function saveCoinsSortMap(map){

try{

const out =
{};

for(const m of COINS_SORT_MARKETS){
out[m] = normalizeCoinsSortEntry(
map[m]
);
}

localStorage.setItem(
COINS_SORT_STORAGE_KEY,
JSON.stringify(out)
);

}catch(err){

console.warn(
"coins sort map write:",
err
);

}

}

export function loadCoinsSortForMarket(market){

const map =
loadCoinsSortMap();

if(!COINS_SORT_MARKET_SET.has(market)){
return normalizeCoinsSortEntry(null);
}

return { ...map[market] };

}

export function saveCoinsSortForMarket(market, entry){

if(!COINS_SORT_MARKET_SET.has(market)){
return;
}

try{

const map =
loadCoinsSortMap();

map[market] =
normalizeCoinsSortEntry(
entry || map[market]
);

saveCoinsSortMap(map);

}catch(err){

console.warn(
"coins sort save:",
err
);

}

}

export function loadCoinsMarketDataset(){

try{

const v =
localStorage.getItem(
COINS_MARKET_STORAGE_KEY
)?.trim();

if(
v &&
COINS_SORT_MARKET_SET.has(v)
){

return v;

}

}catch(err){

console.warn(
"coins market load:",
err
);

}

return "crypto";

}

export function saveCoinsMarketDataset(market){

if(!COINS_SORT_MARKET_SET.has(market)){
return;
}

try{

localStorage.setItem(
COINS_MARKET_STORAGE_KEY,
market
);

}catch(err){

console.warn(
"coins market save:",
err
);

}

}
