import {
getActiveExchangeId
} from "./exchanges/context.js?v=1";

import {
getExchangeDefinition,
isRealtimeMarketDataset,
getActiveCoinsMarkets
} from "./exchanges/registry.js?v=1";

import {
formatExchangeDisplayLabel
} from "./exchanges/symbol.js?v=1";

import {
bybitPublicAdapter
} from "./exchanges/bybit/public.js?v=1";

import {
bingxPublicAdapter
} from "./exchanges/bingx/public.js?v=5";

import {
peekBybitSymbolsCache
} from "./api.js?v=29";

const ADAPTERS =
{
bybit:
bybitPublicAdapter,
bingx:
bingxPublicAdapter
};

export function getPublicMarketAdapter(
exchangeId
){

const id =
String(
exchangeId ||
getActiveExchangeId()
).trim().toLowerCase();

return ADAPTERS[
id
] ||
bybitPublicAdapter;

}

export function getActivePublicMarketAdapter(){

return getPublicMarketAdapter(
getActiveExchangeId()
);

}

export {
getActiveExchangeId,
setActiveExchangeId,
EXCHANGE_CHANGED_EVENT,
initExchangeContext
} from "./exchanges/context.js?v=1";

export {
getExchangeDefinition,
getActiveExchangeDefinition,
getActiveCoinsMarkets,
getAllCoinsMarketIds,
isRealtimeMarketDataset,
EXCHANGE_IDS,
EXCHANGE_DEFINITIONS
} from "./exchanges/registry.js?v=1";

export {
formatExchangeDisplayLabel,
toCanonicalSymbol
} from "./exchanges/symbol.js?v=1";

export async function loadMarketHistory(
symbol,
tf,
requests =
6,
options = {}
){

return getActivePublicMarketAdapter().loadHistory(
symbol,
tf,
requests,
options
);

}

export async function loadMarketSymbols(
options = {}
){

return getActivePublicMarketAdapter().loadSymbols(
options
);

}

export function buildMarketLists(
instruments,
exchangeId
){

return getPublicMarketAdapter(
exchangeId
).buildMarketLists(
instruments
);

}

export async function loadMarketOrderbook(
symbol,
depth
){

return getActivePublicMarketAdapter().loadOrderbook(
symbol,
depth
);

}

export async function loadMarketTickers(){

const adapter =
getActivePublicMarketAdapter();

if(
typeof adapter.loadTickers ===
"function"
){
return adapter.loadTickers();
}

return null;

}

export async function pingActiveExchangePublic(){

return getActivePublicMarketAdapter().pingPublic();

}

export function isActiveRealtimeMarketDataset(
dataset
){

return isRealtimeMarketDataset(
getActiveExchangeId(),
dataset
);

}

export function peekMarketSymbolsCache(
exchangeId
){

const id =
String(
exchangeId ||
getActiveExchangeId()
).trim().toLowerCase();

if(
id ===
"bybit"
){

return peekBybitSymbolsCache?.() ||
null;

}

if(
id ===
"bingx"
){

try{

const raw =
localStorage.getItem(
"bingx_swap_symbols_v4"
);

if(
!raw
){
return null;
}

const parsed =
JSON.parse(
raw
);

return parsed?.instruments?.length
? parsed.instruments
: null;

}catch{
return null;
}

}

return null;

}

/** @deprecated use isActiveRealtimeMarketDataset */
export function isMarketCoinsDataset(
dataset
){

return isActiveRealtimeMarketDataset(
dataset
);

}

export function getActiveExchangeMarkets(){

return getExchangeDefinition(
getActiveExchangeId()
).markets;

}

export async function fetchMarketDailyCandles(
symbol,
limit = 375
){

const adapter =
getActivePublicMarketAdapter();

if(
typeof adapter.fetchDailyCandles !==
"function"
){
return null;
}

return adapter.fetchDailyCandles(
symbol,
limit
);

}

/** Торговля desktop IPC: Bybit и BingX. */
export function isExchangeTradingEnabled(){

const id =
getActiveExchangeId();

return id ===
"bybit" ||
id ===
"bingx";

}
