/* =========================================================
   Bybit: листинги и категории linear USDT
========================================================= */

/** Монеты → Новые (как вкладка New на Bybit, ~30 дней). */
export const BYBIT_NEW_LISTING_WINDOW_MS =
30 *
24 *
60 *
60 *
1000;

/** Страница Листинги: показываем не старше года, старше отбрасываем. */
export const BYBIT_LISTINGS_PAGE_WINDOW_MS =
365 *
24 *
60 *
60 *
1000;

export const BYBIT_COINS_DATASETS =
new Set([
"all",
"crypto",
"new",
"innovation",
"stocks",
"commodities",
"forex"
]);

export function isBybitCoinsDataset(
dataset
){

return BYBIT_COINS_DATASETS.has(
dataset
);

}

function instrumentLaunchTime(
item
){

if(
!item ||
typeof item !==
"object"
){
return null;
}

const raw =
item.raw &&
typeof item.raw ===
"object"
? item.raw
: null;

const launchTime =
item.launchTime ??
raw?.launchTime ??
raw?.onboardDate ??
raw?.listingTime ??
null;

if(
launchTime ==
null
){
return null;
}

const ts =
Number(
launchTime
);

return Number.isFinite(
ts
) &&
ts >
0
? ts
: null;

}

function isTradingInstrument(
item
){

if(
!item ||
typeof item !==
"object" ||
!item.symbol
){
return false;
}

const status =
item.status;
const rawStatus =
item.raw &&
typeof item.raw ===
"object"
? item.raw.status
: null;

if(
status ===
"Trading"
){
return true;
}

if(
status ===
1 ||
status ===
"1"
){
return true;
}

if(
String(
status ||
""
).toLowerCase() ===
"online"
){
return true;
}

if(
rawStatus ===
1 ||
rawStatus ===
"1"
){
return true;
}

return false;

}

function tradingInstruments(
instruments
){

if(
!Array.isArray(
instruments
)
){
return [];
}

return instruments.filter(
isTradingInstrument
);

}

/**
 * @param {Array<{ symbol: string, launchTime?: string|number, baseCoin?: string }>} instruments
 * @param {number} [windowMs]
 */
export function filterRecentListings(
instruments,
windowMs = BYBIT_NEW_LISTING_WINDOW_MS
){

const cutoff =
Date.now() - windowMs;

return tradingInstruments(
instruments
)
.filter(
item=>{

const launchTime =
instrumentLaunchTime(
item
);

if(
launchTime ==
null
){
return false;
}

return launchTime >
cutoff;

}
)
.map(
item=>({

symbol: item.symbol,
launchTime:
instrumentLaunchTime(
item
),
baseCoin: item.baseCoin ||
""

})
)
.sort(
(
a,
b
)=>
b.launchTime -
a.launchTime
);

}

export function filterInnovationListings(
instruments
){

return tradingInstruments(
instruments
)
.filter(
item=>
item.symbolType ===
"innovation"
)
.sort(
(
a,
b
)=>
Number(
b.launchTime ||
0
) -
Number(
a.launchTime ||
0
)
);

}

export function filterStockListings(
instruments
){

return tradingInstruments(
instruments
)
.filter(
item=>
item.symbolType ===
"stock"
)
.sort(
(
a,
b
)=>
Number(
b.launchTime ||
0
) -
Number(
a.launchTime ||
0
)
);

}

export function filterCommodityListings(
instruments
){

return tradingInstruments(
instruments
)
.filter(
item=>
item.symbolType ===
"commodity"
)
.sort(
(
a,
b
)=>
Number(
b.launchTime ||
0
) -
Number(
a.launchTime ||
0
)
);

}

export function filterForexListings(
instruments
){

return tradingInstruments(
instruments
)
.filter(
item=>
item.symbolType ===
"forex"
)
.sort(
(
a,
b
)=>
a.symbol.localeCompare(
b.symbol
)
);

}

export function filterAllListings(
instruments
){

return tradingInstruments(
instruments
)
.filter(
item=>
String(
item.symbol ||
""
).endsWith(
"USDT"
)
)
.sort(
(
a,
b
)=>
a.symbol.localeCompare(
b.symbol
)
);

}

export function filterMainCryptoListings(
instruments
){

return tradingInstruments(
instruments
)
.filter(
item=>{

const type =
item.symbolType ||
"";

return (
!type &&
item.symbol
);

}
)
.sort(
(
a,
b
)=>
a.symbol.localeCompare(
b.symbol
)
);

}

function symbolNames(
rows
){

return rows
.map(
row=>
row?.symbol ||
row
)
.filter(
Boolean
)
.map(
s=>
String(
s
).toUpperCase()
);

}

/**
 * Разбивка instruments-info по вкладкам /coins (как на Bybit).
 * @returns {{ all: string[], crypto: string[], new: string[], innovation: string[], stocks: string[], commodities: string[], forex: string[] }}
 */
export function buildCoinsMarketLists(
instruments
){

if(
!Array.isArray(
instruments
) ||
!instruments.length
){
return {
all:[],
crypto:[],
new:[],
innovation:[],
stocks:[],
commodities:[],
forex:[]
};
}

const hasMeta =
instruments.some(
item=>
item &&
typeof item ===
"object" &&
(
item.launchTime !=
null ||
item.symbolType !=
null
)
);

if(
!hasMeta
){

const names =
instruments
.map(
item=>
typeof item ===
"string"
? item
: item?.symbol
)
.filter(
Boolean
)
.map(
s=>
String(
s
).toUpperCase()
);

return {
all:names,
crypto:names,
new:[],
innovation:[],
stocks:[],
commodities:[],
forex:[]
};

}

return {
all:symbolNames(
filterAllListings(
instruments
)
),
crypto:symbolNames(
filterMainCryptoListings(
instruments
)
),
new:symbolNames(
filterRecentListings(
instruments
)
),
innovation:symbolNames(
filterInnovationListings(
instruments
)
),
stocks:symbolNames(
filterStockListings(
instruments
)
),
commodities:symbolNames(
filterCommodityListings(
instruments
)
),
forex:symbolNames(
filterForexListings(
instruments
)
)
};

}

export function formatListingDateTime(
ts
){

return new Date(
ts
).toLocaleString(
"ru-RU",
{

year:"numeric",
month:"2-digit",
day:"2-digit",
hour:"2-digit",
minute:"2-digit"

}
);

}
