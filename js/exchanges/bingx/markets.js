import {
toCanonicalSymbol
} from "../symbol.js?v=1";

export const BINGX_NEW_LISTING_WINDOW_MS =
30 *
24 *
60 *
60 *
1000;

/** @typedef {'crypto'|'stocks'|'indices'|'commodities'|'forex'} BingxMarketCategory */

/**
 * Категория контракта BingX swap (по symbol из /quote/contracts).
 * Принимает и BTC-USDT, и BTCUSDT (канонический ключ терминала).
 * USDC-контракты исключаются (null).
 * @param {{ symbol?: string, status?: number|string }} row
 * @returns {BingxMarketCategory|null}
 */
export function classifyBingxContract(
row
){

const sym =
toCanonicalSymbol(
row?.symbol ||
""
);

if(
!sym
){
return null;
}

const status =
row?.status;

if(
status !=
null &&
status !==
1 &&
status !==
"1" &&
status !==
"Trading"
){
return null;
}

if(
sym.endsWith(
"USDC"
)
){
return null;
}

if(
sym.startsWith(
"NCSK"
)
){
return "stocks";
}

if(
sym.startsWith(
"NCSI"
) ||
sym ===
"SPXUSDT"
){
return "indices";
}

if(
sym.startsWith(
"NCCO"
) ||
sym ===
"XAUTUSDT"
){
return "commodities";
}

if(
sym.startsWith(
"NCFX"
)
){
return "forex";
}

if(
sym.endsWith(
"USDT"
) &&
sym.length >
4
){
return "crypto";
}

return null;

}

function contractLaunchMs(
row
){

const t =
Number(
row?.launchTime ||
row?.onboardDate ||
row?.listingTime ||
0
);

return Number.isFinite(
t
) &&
t >
0
? t
: 0;

}

function isRecentListing(
row,
cutoffMs
){

const t =
contractLaunchMs(
row
);

return t >
0 &&
t >=
cutoffMs;
}

function symbolFromRow(
row
){

const sym =
toCanonicalSymbol(
row?.symbol ||
""
);

return sym ||
null;

}

function uniqueSorted(
symbols
){

return [
...new Set(
symbols.filter(
Boolean
)
)
].sort();

}

/**
 * @param {Array<Record<string, unknown>>} contracts
 */
export function buildBingxMarketLists(
contracts
){

const empty = {
all:[],
crypto:[],
new:[],
innovation:[],
usdc:[],
stocks:[],
indices:[],
commodities:[],
forex:[]
};

if(
!Array.isArray(
contracts
) ||
!contracts.length
){
return empty;
}

const cutoff =
Date.now() -
BINGX_NEW_LISTING_WINDOW_MS;

const buckets = {
crypto:[],
stocks:[],
indices:[],
commodities:[],
forex:[],
new:[]
};

for(
const row of
contracts
){

const category =
classifyBingxContract(
row
);

if(
!category
){
continue;
}

const sym =
symbolFromRow(
row
);

if(
!sym
){
continue;
}

buckets[
category
].push(
sym
);

if(
isRecentListing(
row,
cutoff
)
){
buckets.new.push(
sym
);
}

}

const all =
uniqueSorted(
[
...buckets.crypto,
...buckets.stocks,
...buckets.indices,
...buckets.commodities,
...buckets.forex
]
);

return {
all,
crypto:
uniqueSorted(
buckets.crypto
),
new:
uniqueSorted(
buckets.new
),
innovation:[],
usdc:[],
stocks:
uniqueSorted(
buckets.stocks
),
indices:
uniqueSorted(
buckets.indices
),
commodities:
uniqueSorted(
buckets.commodities
),
forex:
uniqueSorted(
buckets.forex
)
};

}
