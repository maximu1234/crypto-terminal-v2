/**
 * Прокси CoinGecko — BTC dominance (free tier, без ключа).
 *
 * GET /api/coingecko?mode=global
 * GET /api/coingecko?mode=dominance&days=90
 *
 * dominance = BTC market cap / total crypto market cap × 100
 *
 * Free tier: /global/market_cap_chart — PRO only.
 * Fallback: сумма market cap топ-10 монет × scale к /global total (≈ TV BTC.D).
 */

const BASE =
"https://api.coingecko.com/api/v3";

const CMC_TRIAL =
"https://pro-api.coinmarketcap.com/trial-pro-api";

const COINGECKO_GAP_MS =
150;

const ALLOWED_DAYS =
new Set([
"1",
"7",
"14",
"30",
"90",
"180",
"365",
"max"
]);

/** CoinGecko ids — ~90%+ рынка в сумме. */
const TOP_COIN_IDS =
[
"bitcoin",
"ethereum",
"tether",
"binancecoin",
"solana",
"ripple",
"usd-coin",
"tron",
"dogecoin",
"cardano"
];

function sleep(
ms
){

return new Promise(
resolve=>{
setTimeout(
resolve,
ms
);
}
);

}

function daysToCmcCount(
days
){

if(
days ===
"max"
){
return 365;
}

const n =
parseInt(
days,
10
);

if(
days ===
"1"
){
return 48;
}

return Math.min(
365,
Math.max(
2,
Number.isFinite(
n
)
? n
: 90
)
);

}

async function fetchCmcDominanceSeries(
days
){

const count =
daysToCmcCount(
days
);

const interval =
days ===
"1" ||
days ===
"7"
? "hourly"
: "daily";

const url =
`${CMC_TRIAL}/v1/global-metrics/quotes/historical?interval=${interval}&count=${count}`;

const res =
await fetch(
url,
{
headers: {
Accept: "application/json"
}
}
);

const body =
await res.json().catch(
()=>({})
);

if(
!res.ok ||
body?.status?.error_code
){
throw new Error(
body?.status?.error_message ||
`CMC HTTP ${res.status}`
);
}

const quotes =
body?.data?.quotes ||
[];

const points =
quotes
.map(
q=>{

const ts =
q?.timestamp
? Math.floor(
new Date(
q.timestamp
).getTime() /
1000
)
: null;

const raw =
q?.btc_dominance ??
q?.quote?.USD?.btc_dominance;

const value =
Number(
raw
);

if(
!ts ||
!Number.isFinite(
value
)
){
return null;
}

return {
time: ts,
value: Math.round(
value *
100
) /
100
};

}
)
.filter(
Boolean
)
.sort(
(
a,
b
)=>
a.time -
b.time
);

if(
!points.length
){
throw new Error(
"CMC: пустая история"
);
}

return {
points,
method: "cmc_trial_historical",
current: points[
points.length -
1
].value
};

}

function pickQuery(
query,
key
){

const raw =
query?.[key];

return typeof raw === "string"
? raw.trim()
: "";

}

function coingeckoHeaders(){

const headers =
{
Accept: "application/json",
"User-Agent": "Multichart/1.0 (btc-dominance)"
};

const demoKey =
process.env.COINGECKO_API_KEY ||
process.env.COINGECKO_DEMO_API_KEY ||
"";

if(
demoKey
){
headers[
"x-cg-demo-api-key"
] =
demoKey;
}

return headers;

}

async function fetchCoinGecko(
path
){

const url =
`${BASE}${path}`;

const res =
await fetch(
url,
{
headers: coingeckoHeaders()
}
);

const text =
await res.text();

let body =
{};

try{
body =
text
? JSON.parse(
text
)
: {};
}catch{
body = {
raw: text
};
}

if(
!res.ok
){
const msg =
body?.status?.error_message ||
body?.error ||
`CoinGecko HTTP ${res.status}`;
const err =
new Error(
msg
);
err.status =
res.status;
throw err;
}

return body;

}

function isProOnlyError(
err
){

const msg =
String(
err?.message ||
""
);

return (
/PRO API|exclusive endpoints|paid plan/i.test(
msg
)
);

}

function nearestCap(
sortedCaps,
tMs
){

if(
!sortedCaps.length
){
return null;
}

let lo =
0;
let hi =
sortedCaps.length -
1;

if(
tMs <=
sortedCaps[
0
][
0
]
){
return sortedCaps[
0
][
1
];
}

if(
tMs >=
sortedCaps[
hi
][
0
]
){
return sortedCaps[
hi
][
1
];
}

while(
lo <=
hi
){

const mid =
Math.floor(
(
lo +
hi
) /
2
);
const midT =
sortedCaps[
mid
][
0
];

if(
midT ===
tMs
){
return sortedCaps[
mid
][
1
];
}

if(
midT <
tMs
){
lo =
mid +
1;
}else{
hi =
mid -
1;
}

}

const candidates =
[];

if(
lo <
sortedCaps.length
){
candidates.push(
sortedCaps[
lo
]
);
}

if(
lo >
0
){
candidates.push(
sortedCaps[
lo -
1
]
);
}

let best =
null;
let bestDiff =
Infinity;

for(
const [
t,
cap
] of
candidates
){

const diff =
Math.abs(
t -
tMs
);

if(
diff <
bestDiff
){
bestDiff =
diff;
best =
cap;
}

}

const maxDiff =
sortedCaps.length >
400
? 48 *
3600 *
1000
: 3 *
3600 *
1000;

if(
bestDiff >
maxDiff
){
return null;
}

return best;

}

function buildDominanceSeries(
btcCaps,
totalCaps
){

const sortedTotal =
[
...totalCaps
].sort(
(
a,
b
)=>
a[
0
] -
b[
0
]
);

const byTime =
new Map();

for(
const [
tMs,
btcCap
] of
btcCaps
){

const totalCap =
nearestCap(
sortedTotal,
tMs
);

if(
!totalCap ||
totalCap <=
0 ||
btcCap <=
0
){
continue;
}

const pct =
(
btcCap /
totalCap
) *
100;

if(
!Number.isFinite(
pct
) ||
pct <=
0 ||
pct >
100
){
continue;
}

const timeSec =
Math.floor(
tMs /
1000
);

byTime.set(
timeSec,
Math.round(
pct *
100
) /
100
);

}

return [
...byTime.entries()
]
.map(
([
time,
value
])=>({
time,
value
})
)
.sort(
(
a,
b
)=>
a.time -
b.time
);

}

async function fetchTotalCapSeries(
days
){

try{

const chart =
await fetchCoinGecko(
`/global/market_cap_chart?days=${encodeURIComponent(days)}`
);

if(
chart?.market_caps?.length
){
return {
caps: chart.market_caps,
method: "coingecko_global_chart"
};
}

}catch(
err
){

if(
!isProOnlyError(
err
)
){
throw err;
}

}

return fetchTotalCapSeriesEstimated(
days
);

}

async function fetchTotalCapSeriesEstimated(
days
){

const charts =
[];

for(
const id of
TOP_COIN_IDS
){

try{

const chart =
await fetchCoinGecko(
`/coins/${id}/market_chart?vs_currency=usd&days=${encodeURIComponent(days)}`
);

charts.push({
id,
caps: chart?.market_caps ||
[]
});

}catch{
charts.push({
id,
caps: []
});
}

await sleep(
COINGECKO_GAP_MS
);

}

const btcChart =
charts.find(
c=>
c.id ===
"bitcoin"
);

if(
!btcChart?.caps?.length
){
throw new Error(
"CoinGecko: нет BTC market_chart"
);
}

const sorted =
charts
.filter(
c=>
c.caps.length
)
.map(
c=>({
id: c.id,
caps: [
...c.caps
].sort(
(
a,
b
)=>
a[
0
] -
b[
0
]
)
})
);

const global =
await fetchCoinGecko(
"/global"
);

const totalNow =
Number(
global?.data?.total_market_cap?.usd
);

const lastT =
btcChart.caps[
btcChart.caps.length -
1
][
0
];

let sumNow =
0;

for(
const coin of
sorted
){

const cap =
nearestCap(
coin.caps,
lastT
);

if(
cap
){
sumNow +=
cap;
}

}

const scale =
totalNow >
0 &&
sumNow >
0
? totalNow /
sumNow
: 1;

const totalCaps =
[];

for(
const [
tMs
] of
btcChart.caps
){

let sum =
0;

for(
const coin of
sorted
){

const cap =
nearestCap(
coin.caps,
tMs
);

if(
cap
){
sum +=
cap;
}

}

if(
sum >
0
){
totalCaps.push([
tMs,
sum *
scale
]);
}

}

return {
caps: totalCaps,
method: "coingecko_top10_estimate"
};

}

module.exports = async function handler(
req,
res
){

if(
req.method !==
"GET"
){
res.statusCode = 405;
res.setHeader(
"Content-Type",
"application/json"
);
res.end(
JSON.stringify({
ok: false,
error: "method_not_allowed"
})
);
return;
}

const mode =
pickQuery(
req.query,
"mode"
) ||
"global";

try{

if(
mode ===
"global"
){

const data =
await fetchCoinGecko(
"/global"
);

const pct =
Number(
data?.data?.market_cap_percentage?.btc
);

res.statusCode = 200;
res.setHeader(
"Content-Type",
"application/json"
);
res.setHeader(
"Cache-Control",
"public, s-maxage=120, stale-while-revalidate=300"
);
res.end(
JSON.stringify({
ok: true,
source: "coingecko",
btcDominance:
Number.isFinite(
pct
)
? Math.round(
pct *
100
) /
100
: null,
updatedAt: Date.now()
})
);
return;

}

if(
mode ===
"dominance"
){

const daysRaw =
pickQuery(
req.query,
"days"
) ||
"90";

if(
!ALLOWED_DAYS.has(
daysRaw
)
){
res.statusCode = 400;
res.setHeader(
"Content-Type",
"application/json"
);
res.end(
JSON.stringify({
ok: false,
error: "invalid_days",
allowed: [
...ALLOWED_DAYS
]
})
);
return;
}

try{

const cmc =
await fetchCmcDominanceSeries(
daysRaw
);

res.statusCode = 200;
res.setHeader(
"Content-Type",
"application/json"
);
res.setHeader(
"Cache-Control",
"public, s-maxage=300, stale-while-revalidate=900"
);
res.end(
JSON.stringify({
ok: true,
source: "coinmarketcap",
method: cmc.method,
days: daysRaw,
current: cmc.current,
points: cmc.points,
pointCount: cmc.points.length,
updatedAt: Date.now()
})
);
return;

}catch{
/* CoinGecko fallback */
}

const [
globalSnap,
btcChart,
totalSeries
] =
await Promise.all([
fetchCoinGecko(
"/global"
),
fetchCoinGecko(
`/coins/bitcoin/market_chart?vs_currency=usd&days=${encodeURIComponent(daysRaw)}`
),
fetchTotalCapSeries(
daysRaw
)
]);

const btcCaps =
btcChart?.market_caps ||
[];
const totalCaps =
totalSeries.caps ||
[];

const points =
buildDominanceSeries(
btcCaps,
totalCaps
);

const currentPct =
Number(
globalSnap?.data?.market_cap_percentage?.btc
);

res.statusCode = 200;
res.setHeader(
"Content-Type",
"application/json"
);
res.setHeader(
"Cache-Control",
"public, s-maxage=180, stale-while-revalidate=600"
);
res.end(
JSON.stringify({
ok: true,
source: "coingecko",
method: totalSeries.method,
days: daysRaw,
current:
Number.isFinite(
currentPct
)
? Math.round(
currentPct *
100
) /
100
: (
points.length
? points[
points.length -
1
].value
: null
),
points,
pointCount: points.length,
updatedAt: Date.now()
})
);
return;

}

res.statusCode = 400;
res.setHeader(
"Content-Type",
"application/json"
);
res.end(
JSON.stringify({
ok: false,
error: "invalid_mode",
modes: [
"global",
"dominance"
]
})
);

}catch(
err
){

const status =
err?.status ===
429
? 429
: 502;

res.statusCode = status;
res.setHeader(
"Content-Type",
"application/json"
);
res.end(
JSON.stringify({
ok: false,
error: err?.message || "upstream_failed"
})
);

}

};
