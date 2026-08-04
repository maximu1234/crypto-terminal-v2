/**
 * Universe тикеров для сканов АлгоТрейдинг: все vs Топ-N по обороту 24ч.
 */
import {
loadMarketSymbols,
buildMarketLists,
loadMarketTickers,
getActiveExchangeId
} from "../market-api.js?v=5";

import {
fetchBybit
} from "../bybit-fetch.js?v=17";

export const ALGO_SCAN_UNIVERSE_ALL =
"all";
export const ALGO_SCAN_UNIVERSE_TOP100 =
"top100";
export const ALGO_SCAN_TOP_N =
100;

/**
 * @param {unknown} raw
 * @returns {"all"|"top100"}
 */
export function normalizeAlgoScanUniverse(
raw
){

const s =
String(
raw ||
""
).toLowerCase().replace(
/_/g,
"-"
);

if(
s ===
ALGO_SCAN_UNIVERSE_TOP100 ||
s ===
"top-100"
){
return ALGO_SCAN_UNIVERSE_TOP100;
}

return ALGO_SCAN_UNIVERSE_ALL;

}

/**
 * @param {string} exchangeId
 * @returns {Promise<Map<string, number>>}
 */
async function loadTurnoverBySymbol(
exchangeId
){

const id =
String(
exchangeId ||
""
).toLowerCase();
const map =
new Map();

if(
id ===
"bingx"
){

const tickers =
await loadMarketTickers();

if(
!tickers ||
typeof tickers.forEach !==
"function"
){
return map;
}

tickers.forEach(
(
row,
sym
)=>{

const key =
String(
sym ||
""
).toUpperCase();
const turnover =
Number(
row?.quoteVolume ??
row?.turnover24h ??
0
);

if(
key &&
Number.isFinite(
turnover
)
){
map.set(
key,
turnover
);
}

}
);

return map;

}

const {
json
} =
await fetchBybit(
"/v5/market/tickers?category=linear",
{
timeoutMs:
15000,
retries:
2
}
);

const list =
json?.result?.list;

if(
!Array.isArray(
list
)
){
return map;
}

for(
const row of
list
){

const key =
String(
row?.symbol ||
""
).toUpperCase();
const turnover =
Number(
row?.turnover24h ||
0
);

if(
key &&
Number.isFinite(
turnover
)
){
map.set(
key,
turnover
);
}

}

return map;

}

/**
 * @param {{ universe?: string }} [opts]
 * @returns {Promise<{
 *   universe: "all"|"top100",
 *   items: Array<{ rank: number, symbol: string, turnover24h: number }>,
 *   symbols: string[],
 *   topN: number|null
 * }>}
 */
export async function resolveAlgoScanUniverseItems(
opts =
{}
){

const universe =
normalizeAlgoScanUniverse(
opts.universe
);
const exchangeId =
getActiveExchangeId();
const instruments =
await loadMarketSymbols();
const lists =
buildMarketLists(
instruments,
exchangeId
);
const allowed =
(
lists.all ||
lists.crypto ||
[]
)
.map(
s=>
String(
s ||
""
).toUpperCase()
)
.filter(
Boolean
);

const turnover =
await loadTurnoverBySymbol(
exchangeId
);
const ranked =
allowed
.map(
sym=>({
symbol:
sym,
turnover24h:
turnover.get(
sym
) ||
0
})
)
.sort(
(
a,
b
)=>
b.turnover24h -
a.turnover24h ||
a.symbol.localeCompare(
b.symbol
)
);

const hasTurnover =
ranked.some(
r=>
r.turnover24h >
0
);

if(
universe ===
ALGO_SCAN_UNIVERSE_TOP100
){

if(
!hasTurnover
){
console.warn(
"[algo-trading] top100: нет данных оборота, берём первые 100 из списка"
);
}

const sliced =
ranked.slice(
0,
ALGO_SCAN_TOP_N
);
const items =
sliced.map(
(
row,
idx
)=>({
rank:
idx +
1,
symbol:
row.symbol,
turnover24h:
row.turnover24h
})
);

return {
universe:
ALGO_SCAN_UNIVERSE_TOP100,
items,
symbols:
items.map(
r=>
r.symbol
),
topN:
ALGO_SCAN_TOP_N
};

}

const items =
ranked.map(
(
row,
idx
)=>({
rank:
idx +
1,
symbol:
row.symbol,
turnover24h:
row.turnover24h
})
);

return {
universe:
ALGO_SCAN_UNIVERSE_ALL,
items,
symbols:
items.map(
r=>
r.symbol
),
topN:
null
};

}

/**
 * @param {{ universe?: string }} [opts]
 * @returns {Promise<{
 *   universe: "all"|"top100",
 *   symbols: string[],
 *   topN: number|null
 * }>}
 */
export async function resolveAlgoScanSymbols(
opts =
{}
){

const resolved =
await resolveAlgoScanUniverseItems(
opts
);

return {
universe:
resolved.universe,
symbols:
resolved.symbols,
topN:
resolved.topN
};

}
