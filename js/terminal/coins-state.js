/** Shared coins page state — wired from terminal.js via registerCoinsState(). */
const state = {
currentDataset:"crypto",
currentTF:"60",
currentSymbol:"BTCUSDT",
isCoinsChartInverted:false,
displaySymbol:"",
candles:[],
symbolLoadSeq:0,
marketData:[],
innerSortMode:"symbol",
sortAsc:true,
flagSortActive:false,
flagSortAsc:false,
searchQuery:"",
hasUrlSymbol:false,
favorites:null,
allBybitSymbols:[],
newListings:[],
candleSeries:null,
chart:null,
rsiChart:null,
drawingTools:null
};

export const isCoinsPage =
window.location.pathname.includes("/coins");

export const marketMap =
new Map();

export const coinElements =
new Map();

export const COINS_PREFS_KEY =
"coins_page_prefs_v1";

export const COINS_MARKETS = [
"crypto",
"new",
"stocks",
"commodities",
"forex"
];

export const COINS_SORT_MODES =
new Set([
"favorites",
"symbol",
"24h",
"1h"
]);

export const COINS_TF_VALUES =
new Set([
"1",
"5",
"15",
"60",
"240",
"D"
]);

export const stockSymbols = [
"AAPL","TSLA","NVDA","MSFT","AMZN",
"META","GOOGL","NFLX","AMD","COIN","PLTR"
];

export const commoditySymbols = [
"XAU/USD",
"XAG/USD",
"BRENT"
];

export const forexSymbols = [
"EUR/USD",
"GBP/USD",
"USD/JPY",
"AUD/USD"
];

export function registerCoinsState(
bindings
){

for(
const key of
Object.keys(
bindings
)
){

const desc =
bindings[
key
];

if(
desc &&
typeof desc === "object" &&
(
"get" in
desc ||
"set" in
desc
)
){

Object.defineProperty(
state,
key,
desc
);

}else{

state[
key
] =
desc;

}

}

}

export function coinsState(){

return state;

}
