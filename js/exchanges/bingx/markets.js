import {
toCanonicalSymbol,
isUsdtMarginedSymbol
} from "../symbol.js?v=1";

const NEW_LISTING_WINDOW_MS =
30 *
24 *
60 *
60 *
1000;

function isBingxContractTrading(
row
){

const status =
row?.status;

return (
status ===
1 ||
status ===
"1"
);

}

function tradingContracts(
rows
){

if(
!Array.isArray(
rows
)
){
return [];
}

return rows.filter(
row=>{

if(
!row ||
!row.symbol
){
return false;
}

if(
!isBingxContractTrading(
row
)
){
return false;
}

const quote =
String(
row.currency ||
""
).toUpperCase();

if(
quote &&
quote !==
"USDT"
){
return false;
}

const canonical =
toCanonicalSymbol(
row.symbol
);

return isUsdtMarginedSymbol(
canonical
);

}
);

}

/**
 * @param {Array<Record<string, unknown>>} contracts
 */
export function buildBingxMarketLists(
contracts
){

const items =
tradingContracts(
contracts
);

const all =
items
.map(
row=>
toCanonicalSymbol(
row.symbol
)
)
.filter(
sym=>
sym &&
isUsdtMarginedSymbol(
sym
)
);

const cutoff =
Date.now() -
NEW_LISTING_WINDOW_MS;

const crypto =
all.slice();

const newer =
items
.filter(
row=>{

const t =
Number(
row.launchTime ||
row.onboardDate ||
row.listingTime ||
0
);

return t >
cutoff;

}
)
.map(
row=>
toCanonicalSymbol(
row.symbol
)
)
.filter(
sym=>
sym &&
isUsdtMarginedSymbol(
sym
)
);

return {
all,
crypto,
new:
newer.length
? newer
: [],
innovation:[],
stocks:[],
commodities:[],
forex:[]
};

}
