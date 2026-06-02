/**
 * BTC dominance — клиент для /api/coingecko.
 * @see docs/BTC_DOMINANCE.md
 */

const RANGE_DAYS =
Object.freeze({
"1D": "1",
"1W": "7",
"1M": "30",
"3M": "90",
"1Y": "365",
ALL: "max"
});

export {
RANGE_DAYS
};

export function rangeLabelToDays(
label
){

return RANGE_DAYS[
label
] ||
RANGE_DAYS[
"3M"
];

}

async function readJson(
res
){

const text =
await res.text();

try{
return text
? JSON.parse(
text
)
: {};
}catch{
return {
raw: text
};
}

}

/**
 * @param {{ days?: string, signal?: AbortSignal }} [opts]
 * @returns {Promise<{ ok: boolean, current: number|null, points: {time:number,value:number}[], days: string, pointCount: number }>}
 */
export async function fetchBtcDominanceHistory(
opts = {}
){

const days =
String(
opts.days ||
"90"
).trim();

const params =
new URLSearchParams({
mode: "dominance",
days
});

const res =
await fetch(
`/api/coingecko?${params.toString()}`,
{
signal: opts.signal,
cache: "no-store"
}
);

const body =
await readJson(
res
);

if(
!res.ok ||
!body.ok
){
throw new Error(
body.error ||
`BTC dominance HTTP ${res.status}`
);
}

return body;

}

/**
 * @param {{ signal?: AbortSignal }} [opts]
 */
export async function fetchBtcDominanceNow(
opts = {}
){

const params =
new URLSearchParams({
mode: "global"
});

const res =
await fetch(
`/api/coingecko?${params.toString()}`,
{
signal: opts.signal,
cache: "no-store"
}
);

const body =
await readJson(
res
);

if(
!res.ok ||
!body.ok
){
throw new Error(
body.error ||
`BTC dominance HTTP ${res.status}`
);
}

return {
current: body.btcDominance,
updatedAt: body.updatedAt
};

}
