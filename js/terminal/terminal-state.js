/** Shared coins page state — wired from terminal.js via registerCoinsState(). */
const state = {
currentDataset:"all",
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
allListings:[],
allBybitSymbols:[],
newListings:[],
innovationListings:[],
stockListings:[],
commodityListings:[],
forexListings:[],
candleSeries:null,
chart:null,
rsiChart:null,
drawingTools:null
};

function pagePathname(){

return (
typeof globalThis !==
"undefined" &&
typeof globalThis.window !==
"undefined"
? globalThis.window.location.pathname
: ""
);

}

function isTradePath(){

const path =
pagePathname();

if(
/\/trade(\.html)?\/?$/i.test(
path
)
){
return true;
}

if(
!/\/terminal(\.html)?\/?$/i.test(
path
)
){
return false;
}

return !!(
typeof globalThis !==
"undefined" &&
globalThis.window?.cryptoTerminalDesktop?.isDesktop
);

}

export const isTradePage =
isTradePath();

export const isTerminalPage =
typeof globalThis !==
"undefined" &&
typeof globalThis.window !==
"undefined" &&
(
pagePathname().includes(
"/terminal"
) ||
pagePathname().includes(
"/coins"
) ||
isTradePage
);

export const marketMap =
new Map();

export const coinElements =
new Map();

export const COINS_PREFS_KEY =
isTradePage
? "trade_page_prefs_v1"
: "coins_page_prefs_v1";

export const COINS_MARKETS = [
"all",
"crypto",
"new",
"innovation",
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
"D",
"W"
]);

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
Object.getOwnPropertyDescriptor(
bindings,
key
);

if(
desc &&
(
desc.get ||
desc.set
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
bindings[
key
];

}

}

}

export function coinsState(){

return state;

}
