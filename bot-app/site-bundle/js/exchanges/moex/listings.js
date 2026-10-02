import {
toMoexSymbol
} from "../symbol.js?v=2";

/** @typedef {'shares'|'etf'|'indices'|'currency'} MoexMarketCategory */

/** @typedef {{ engine: string, market: string, board: string, category: MoexMarketCategory, label: string, maxPages?: number, secidAllow?: RegExp }} MoexBoardSpec */

/**
 * v1: акции TQBR + индексы + ликвидная валюта с котировкой.
 * ETF-борды ISS сейчас отдают 0 строк — вкладка etf пока пустая.
 */
/** @type {MoexBoardSpec[]} */
export const MOEX_BOARD_SPECS =
Object.freeze([
{
engine:
"stock",
market:
"shares",
board:
"TQBR",
category:
"shares",
label:
"Акции TQBR",
maxPages:
8
},
{
engine:
"stock",
market:
"index",
board:
"SNDX",
category:
"indices",
label:
"Индексы",
maxPages:
3
},
{
engine:
"currency",
market:
"selt",
board:
"CETS",
category:
"currency",
label:
"Валюта CETS",
maxPages:
3,
/* Основные пары / металлы — без всего CETS. */
secidAllow:
/^(USD|EUR|CNY|GBP|CHF|JPY|TRY|HKD|GLD|SLV|PLD|PLT)/i
}
]);

/**
 * @param {string} engine
 * @param {string} market
 * @param {string} board
 */
export function moexBoardSecuritiesPath(
engine,
market,
board
){

return `/iss/engines/${engine}/markets/${market}/boards/${board}/securities.json`;

}

/**
 * @param {{ engine: string, market: string, board: string, symbol: string }} loc
 * @param {number} interval
 * @param {{ from?: string, till?: string, start?: number }} [opts]
 */
export function moexCandlesPath(
loc,
interval,
opts = {}
){

const params =
new URLSearchParams();

params.set(
"interval",
String(
interval
)
);

if(
opts.from
){
params.set(
"from",
opts.from
);
}

if(
opts.till
){
params.set(
"till",
opts.till
);
}

if(
Number.isFinite(
opts.start
) &&
opts.start >
0
){
params.set(
"start",
String(
opts.start
)
);
}

return `/iss/engines/${loc.engine}/markets/${loc.market}/boards/${loc.board}/securities/${encodeURIComponent(
loc.symbol
)}/candles.json?iss.meta=off&${params}`;

}

/**
 * @param {Record<string, unknown>} sec
 * @param {Record<string, unknown>|null} md
 * @param {MoexBoardSpec} spec
 */
export function normalizeMoexInstrument(
sec,
md,
spec
){

const symbol =
toMoexSymbol(
sec?.SECID ||
sec?.secid ||
""
);

if(
!symbol
){
return null;
}

if(
spec.secidAllow &&
!spec.secidAllow.test(
symbol
)
){
return null;
}

const statusRaw =
sec?.STATUS;

if(
statusRaw ===
0 ||
statusRaw ===
"0"
){
return null;
}

if(
(
spec.category ===
"shares" ||
spec.category ===
"etf" ||
spec.category ===
"currency"
) &&
statusRaw !=
null &&
statusRaw !==
"" &&
statusRaw !==
"A" &&
statusRaw !==
1 &&
statusRaw !==
"1"
){
return null;
}

const last =
Number(
md?.LAST ??
md?.CURRENTVALUE ??
0
) ||
0;
const prev =
Number(
sec?.PREVPRICE ??
0
) ||
0;

/*
  Без рыночной цены ISS почти никогда не отдаёт свечи —
  такие тикеры не показываем в списке.
*/
if(
spec.category ===
"indices"
){

if(
!(
last >
0
) &&
!(
prev >
0
)
){
return null;
}

}else if(
!(
last >
0
)
){
return null;
}

return {
symbol,
status:
"Trading",
launchTime:
null,
shortname:
String(
sec?.SHORTNAME ||
sec?.NAME ||
symbol
),
moexCategory:
spec.category,
engine:
spec.engine,
market:
spec.market,
board:
spec.board,
last:
last ||
prev,
changePct:
Number(
md?.LASTCHANGEPRCNT ??
md?.LASTTOPREVPRICE ??
md?.CHANGE ??
0
) ||
0,
volume24:
Number(
md?.VALTODAY_RUR ??
md?.VALTODAY ??
md?.VALUE ??
md?.VOLTODAY ??
0
) ||
0,
raw:{
securities:
sec,
marketdata:
md ||
null
}
};

}

/**
 * @param {Array<Record<string, unknown>>} instruments
 */
export function buildMoexMarketLists(
instruments
){

const empty =
{
all:[],
shares:[],
etf:[],
indices:[],
currency:[]
};

if(
!Array.isArray(
instruments
) ||
!instruments.length
){
return empty;
}

const buckets =
{
shares:[],
etf:[],
indices:[],
currency:[]
};

for(
const item of
instruments
){

const cat =
item?.moexCategory;
const sym =
toMoexSymbol(
item?.symbol ||
""
);

if(
!sym ||
!buckets[
cat
]
){
continue;
}

buckets[
cat
].push(
sym
);

}

function uniqueSorted(
list
){

return [
...new Set(
list
)
].sort();

}

const shares =
uniqueSorted(
buckets.shares
);
const etf =
uniqueSorted(
buckets.etf
);
const indices =
uniqueSorted(
buckets.indices
);
const currency =
uniqueSorted(
buckets.currency
);

return {
all:
uniqueSorted(
[
...shares,
...etf,
...indices,
...currency
]
),
shares,
etf,
indices,
currency
};

}

export const MOEX_DEFAULT_SYMBOL =
"SBER";
