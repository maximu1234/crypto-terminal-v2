import {
normalizeAlertSymbol,
toBingxWireSymbol
} from "./exchange-symbol.js";

import {
tfToBingxInterval
} from "./bingx-intervals.js";

import {
normalizeWorkerTf
} from "./tf-normalize.js";

const BINGX_API_BASE =
"https://open-api.bingx.com";

function parseKlineRow(
row
){

const ts =
Number(
row?.time ||
row?.openTime ||
row?.t ||
0
);

if(
!ts
){
return null;
}

const sec =
ts >
1e12
? Math.floor(
ts /
1000
)
: ts;

const close =
Number(
row?.close ||
row?.c
);

if(
!Number.isFinite(
close
)
){
return null;
}

return {
time:
sec,
open:
Number(
row?.open ||
row?.o
),
high:
Number(
row?.high ||
row?.h
),
low:
Number(
row?.low ||
row?.l
),
close
};

}

export async function fetchRecentKlines(
symbol,
tf,
limit = 2
){

const sym =
toBingxWireSymbol(
symbol
);

if(
!sym
){
return [];
}

const interval =
tfToBingxInterval(
normalizeWorkerTf(
tf
)
);

const path =
`/openApi/swap/v2/quote/klines?symbol=${encodeURIComponent(sym)}` +
`&interval=${encodeURIComponent(interval)}` +
`&limit=${Math.max(
1,
Math.min(
limit,
10
)
)}`;

try{

const res =
await fetch(
`${BINGX_API_BASE}${path}`,
{
headers: {
Accept:
"application/json"
}
}
);

const json =
await res.json();
const rows =
Array.isArray(
json?.data
)
? json.data
: [];

const candles =
rows
.map(
parseKlineRow
)
.filter(
Boolean
);

candles.sort(
(
a,
b
)=>
a.time -
b.time
);

return candles;

}catch(
err
){

console.warn(
"bingx fetchRecentKlines:",
normalizeAlertSymbol(
symbol
),
interval,
err?.message ||
err
);

return [];

}

}

export async function fetchLastPrice(
symbol
){

const sym =
toBingxWireSymbol(
symbol
);

if(
!sym
){
return NaN;
}

const path =
`/openApi/swap/v2/quote/ticker?symbol=${encodeURIComponent(sym)}`;

try{

const res =
await fetch(
`${BINGX_API_BASE}${path}`,
{
headers: {
Accept:
"application/json"
}
}
);

const json =
await res.json();
const row =
json?.data;
const price =
Number(
row?.lastPrice ||
row?.close ||
row?.c
);

return Number.isFinite(
price
)
? price
: NaN;

}catch(
err
){

console.warn(
"bingx fetchLastPrice:",
normalizeAlertSymbol(
symbol
),
err?.message ||
err
);

return NaN;

}

}
