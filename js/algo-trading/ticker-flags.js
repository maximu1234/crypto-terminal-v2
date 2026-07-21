/**
 * Алго-флаги списков тикеров (только страница АлгоТрейдинг).
 * Не смешиваются с green/red/gray/blue на Терминале.
 *
 * ID с суффиксом `5m` — legacy-имена хранилища; списки не привязаны к ТФ
 * (ТФ бота/скана задаётся отдельно в настройках стратегии).
 */
import {
getActiveExchangeId
} from "../exchanges/context.js?v=1";

export const ALGO_TICKER_FLAGS_KEY =
"algo_trading_ticker_flags_v1";

/** @deprecated name: TF-agnostic long list */
export const ALGO_FLAG_LONG_5M =
"algoLong5m";

/** @deprecated name: TF-agnostic short list */
export const ALGO_FLAG_SHORT_5M =
"algoShort5m";

/** @deprecated name: TF-agnostic both list */
export const ALGO_FLAG_BOTH_5M =
"algoBoth5m";

/** Manual personal watchlist (orange flag on algo coin list). */
export const ALGO_FLAG_FAVORITES =
"algoFavorites";

export const ALGO_MARKET_LONG_5M =
"algo-long-5m";

export const ALGO_MARKET_SHORT_5M =
"algo-short-5m";

export const ALGO_MARKET_BOTH_5M =
"algo-both-5m";

export const ALGO_MARKET_FAVORITES =
"algo-favorites";

const ALGO_FLAG_IDS =
[
ALGO_FLAG_LONG_5M,
ALGO_FLAG_SHORT_5M,
ALGO_FLAG_BOTH_5M,
ALGO_FLAG_FAVORITES
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
[],
[
ALGO_FLAG_FAVORITES
]:
[]
};

}

function normalizeSymbol(
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

try{
window.dispatchEvent(
new CustomEvent(
"algo-bot-ticker-flags-changed"
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
normalizeSymbol(
raw
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
 * @param {string} flagId
 * @param {string} symbol
 * @param {string} [exchangeId]
 */
export function isSymbolInAlgoFlagList(
flagId,
symbol,
exchangeId
){

const sym =
normalizeSymbol(
symbol
);

if(
!sym
){
return false;
}

return getAlgoTickerFlagList(
flagId,
exchangeId
).includes(
sym
);

}

/**
 * @param {string} flagId
 * @param {string} symbol
 * @param {string} [exchangeId]
 * @returns {{ flags: object, added: boolean }}
 */
export function toggleAlgoTickerInFlagList(
flagId,
symbol,
exchangeId
){

const sym =
normalizeSymbol(
symbol
);
const list =
getAlgoTickerFlagList(
flagId,
exchangeId
);
const has =
!!sym &&
list.includes(
sym
);
const next =
has
? list.filter(
s=>
s !==
sym
)
: sym
? [
...list,
sym
]
: list;
const flags =
replaceAlgoTickerFlagList(
flagId,
next,
exchangeId
);

return {
flags,
added:
!!sym &&
!has
};

}

/**
 * @param {string} flagId
 * @param {string} symbol
 * @param {string} [exchangeId]
 */
export function removeAlgoTickerFromFlagList(
flagId,
symbol,
exchangeId
){

const sym =
normalizeSymbol(
symbol
);
const list =
getAlgoTickerFlagList(
flagId,
exchangeId
);

if(
!sym ||
!list.includes(
sym
)
){
return loadAlgoTickerFlags(
exchangeId
);
}

return replaceAlgoTickerFlagList(
flagId,
list.filter(
s=>
s !==
sym
),
exchangeId
);

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

if(
dataset ===
ALGO_MARKET_FAVORITES
){
return ALGO_FLAG_FAVORITES;
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
ALGO_MARKET_BOTH_5M ||
dataset ===
ALGO_MARKET_FAVORITES;

}

/**
 * Применить root флагов из main (Phase D) в localStorage.
 * Не пишет и не шлёт event, если содержимое не изменилось.
 * @param {object|null|undefined} root
 */
export function applyAlgoTickerFlagsRoot(
root
){

if(
!root ||
typeof root !==
"object"
){
return false;
}

const next =
{};

for(
const [
exchangeId,
flags
] of Object.entries(
root
)
){

if(
!flags ||
typeof flags !==
"object"
){
continue;
}

const base =
emptyExchangeFlags();

for(
const flag of ALGO_FLAG_IDS
){

base[
flag
] =
normalizeSymbols(
flags[
flag
]
);

}

next[
String(
exchangeId
).trim().toLowerCase() ||
"bybit"
] =
base;

}

try{
const prev =
localStorage.getItem(
ALGO_TICKER_FLAGS_KEY
);
const nextRaw =
JSON.stringify(
next
);

if(
prev ===
nextRaw
){
return false;
}
}catch{
/* compare failed — still write */
}

writeRoot(
next
);
return true;

}
