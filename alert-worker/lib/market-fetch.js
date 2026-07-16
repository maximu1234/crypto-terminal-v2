import {
normalizeExchangeId
} from "./exchange-symbol.js";

import {
fetchRecentKlines as fetchBybitRecentKlines,
fetchLastPrice as fetchBybitLastPrice
} from "./bybit-kline-fetch.js";

import {
fetchRecentKlines as fetchBingxRecentKlines,
fetchLastPrice as fetchBingxLastPrice
} from "./bingx-kline-fetch.js";

export function fetchRecentKlines(
symbol,
tf,
limit,
exchangeId
){

const ex =
normalizeExchangeId(
exchangeId
);

if(
ex ===
"bingx"
){
return fetchBingxRecentKlines(
symbol,
tf,
limit
);
}

return fetchBybitRecentKlines(
symbol,
tf,
limit
);

}

export function fetchLastPrice(
symbol,
exchangeId
){

const ex =
normalizeExchangeId(
exchangeId
);

if(
ex ===
"bingx"
){
return fetchBingxLastPrice(
symbol
);
}

return fetchBybitLastPrice(
symbol
);

}
