/**
 * Алго-флаги списков тикеров (только страница АлгоТрейдинг).
 * Не смешиваются с green/red/gray/blue на Терминале.
 */
import {
getActiveExchangeId
} from "../exchanges/context.js?v=1";

export const ALGO_TICKER_FLAGS_KEY =
"algo_trading_ticker_flags_v1";

export const ALGO_FLAG_LONG_5M =
"algoLong5m";

export const ALGO_FLAG_SHORT_5M =
"algoShort5m";

export const ALGO_FLAG_BOTH_5M =
"algoBoth5m";

export const ALGO_MARKET_LONG_5M =
"algo-long-5m";

export const ALGO_MARKET_SHORT_5M =
"algo-short-5m";

export const ALGO_MARKET_BOTH_5M =
"algo-both-5m";

const ALGO_FLAG_IDS =
[
ALGO_FLAG_LONG_5M,
ALGO_FLAG_SHORT_5M,
ALGO_FLAG_BOTH_5M
];

function emptyExchangeFlags(){

return {
[
ALGO_FLAG_LONG_5M
]:
[],
[
ALGO_FLAG_SHORT_5M
]:
[],
[
ALGO_FLAG_BOTH_5M
]:
[]
};

}

function readRoot(){

try{
const raw =
localStorage.getItem(
ALGO_TICKER_FLAGS_KEY
);

if(
!raw
){
return {};
}

const parsed =
JSON.parse(
raw
);

return parsed &&
typeof parsed ===
"object"
? parsed
: {};
}catch{
return {};
}

}

function writeRoot(
root
){

try{
localStorage.setItem(
ALGO_TICKER_FLAGS_KEY,
JSON.stringify(
root
)
);
}catch{
/* ignore */
}

}

function normalizeSymbols(
list
){

const out =
[];
const seen =
new Set();

for(
const raw of Array.isArray(
list
)
? list
: []
){

const symbol =
String(
raw ||
""
).trim().toUpperCase().replace(
/\.P$/i,
""
);

if(
!symbol ||
seen.has(
symbol
)
){
continue;
}

seen.add(
symbol
);
out.push(
symbol
);

}

return out;

}

/**
 * @param {string} [exchangeId]
 */
export function loadAlgoTickerFlags(
exchangeId
){

const id =
String(
exchangeId ||
getActiveExchangeId()
).trim().toLowerCase() ||
"bybit";
const root =
readRoot();
const raw =
root[
id
];
const base =
emptyExchangeFlags();

if(
!raw ||
typeof raw !==
"object"
){
return base;
}

for(
const flag of ALGO_FLAG_IDS
){

base[
flag
] =
normalizeSymbols(
raw[
flag
]
);

}

return base;

}

/**
 * @param {string} flagId
 * @param {string[]} symbols
 * @param {string} [exchangeId]
 */
export function replaceAlgoTickerFlagList(
flagId,
symbols,
exchangeId
){

if(
!ALGO_FLAG_IDS.includes(
flagId
)
){
return loadAlgoTickerFlags(
exchangeId
);
}

const id =
String(
exchangeId ||
getActiveExchangeId()
).trim().toLowerCase() ||
"bybit";
const root =
readRoot();
const next =
{
...emptyExchangeFlags(),
...((
root[
id
] &&
typeof root[
id
] ===
"object"
)
? root[
id
]
: {})
};

next[
flagId
] =
normalizeSymbols(
symbols
);
root[
id
] =
next;
writeRoot(
root
);

return next;

}

/**
 * @param {string} flagId
 * @param {string} [exchangeId]
 */
export function getAlgoTickerFlagList(
flagId,
exchangeId
){

const flags =
loadAlgoTickerFlags(
exchangeId
);

return flags[
flagId
] ||
[];

}

/**
 * @param {string} dataset
 */
export function algoMarketDatasetToFlagId(
dataset
){

if(
dataset ===
ALGO_MARKET_LONG_5M
){
return ALGO_FLAG_LONG_5M;
}

if(
dataset ===
ALGO_MARKET_SHORT_5M
){
return ALGO_FLAG_SHORT_5M;
}

if(
dataset ===
ALGO_MARKET_BOTH_5M
){
return ALGO_FLAG_BOTH_5M;
}

return null;

}

export function isAlgoMarketDataset(
dataset
){

return dataset ===
ALGO_MARKET_LONG_5M ||
dataset ===
ALGO_MARKET_SHORT_5M ||
dataset ===
ALGO_MARKET_BOTH_5M;

}
