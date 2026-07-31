/**
 * Algo Bybit REST v5 — uses algo-exchange-credentials (isolated from Terminal).
 */
const crypto =
require(
"crypto"
);
const {
net
} =
require(
"electron"
);
const {
getAlgoCredentials
} =
require(
"./algo-exchange-credentials.cjs"
);

function getCredentials(){
return getAlgoCredentials("bybit");
}

/*
 * 20s window: poor networks often exceed Bybit's default 5s between
 * local sign timestamp and server receive (orders / poll otherwise fail).
 */
const RECV_WINDOW =
"20000";

const TIME_SYNC_MAX_AGE_MS =
5 *
60 *
1000;

/** @type {number} serverNow - localNow; applied to signed timestamps */
let timeOffsetMs =
0;
let timeSyncedAt =
0;
/** @type {Promise<void>|null} */
let timeSyncInflight =
null;

const REQUEST_TIMEOUT_MS =
12000;

function signedNowMs(){

return Date.now() +
timeOffsetMs;

}

function isTimestampRecvWindowError(
data
){

if(
!data
){
return false;
}

if(
data.retCode ===
10002
){
return true;
}

const msg =
String(
data.retMsg ||
""
).toLowerCase();

return (
msg.includes(
"timestamp"
) ||
msg.includes(
"recv_window"
)
);

}

async function syncBybitServerTime(
testnet
){

const localBefore =
Date.now();

for(
const base of apiBases(
testnet
)
){

try{
const response =
await fetchWithTimeout(
`${base}/v5/market/time`,
{
method:
"GET"
}
);
const localAfter =
Date.now();
const data =
parseBybitBody(
await response.text()
);
const serverTime =
Number(
data?.result?.timeSecond
) *
1000 ||
Number(
data?.result?.timeNano
) /
1e6 ||
Number(
data?.time
);

if(
data?.retCode ===
0 &&
Number.isFinite(
serverTime
) &&
serverTime >
0
){
const localMid =
localBefore +
Math.floor(
(
localAfter -
localBefore
) /
2
);

timeOffsetMs =
Math.round(
serverTime -
localMid
);
timeSyncedAt =
Date.now();
return;
}

}catch{
/* try next base */
}

}

}

async function ensureBybitTimeSync(
testnet,
force =
false
){

if(
!force &&
timeSyncedAt > 0 &&
Date.now() -
timeSyncedAt <
TIME_SYNC_MAX_AGE_MS
){
return;
}

if(
timeSyncInflight
){
return timeSyncInflight;
}

timeSyncInflight =
syncBybitServerTime(
testnet
).finally(
()=>{
timeSyncInflight =
null;
}
);

return timeSyncInflight;

}

/** Max age of open fills relative to close for diary open/duration matching. */
const EXEC_HISTORY_MAX_LOOKBACK_MS =
180 *
24 *
60 *
60 *
1000;

function apiBases(
testnet
){

if(
testnet
){
return [
"https://api-testnet.bybit.com"
];
}

return [
"https://api.bybit.com",
"https://api.bytick.com"
];

}

function signPayload(
secret,
payload
){

return crypto
.createHmac(
"sha256",
secret
)
.update(
payload
)
.digest(
"hex"
);

}

function formatFetchError(
err,
testnet =
false
){

const raw =
[
err?.message,
err?.cause?.message,
err?.cause?.code
].filter(
Boolean
).join(
" "
);

if(
err?.code ===
"timeout" ||
/AbortError|TIMED_OUT|timeout/i.test(
raw
)
){
return testnet
? "Testnet API не отвечает (таймаут). api-testnet.bybit.com часто недоступен — VPN или Mainnet-ключи."
: "Bybit API не отвечает (таймаут). Проверьте сеть или VPN.";
}

if(
/ERR_NAME_NOT_RESOLVED|ENOTFOUND|ERR_CONNECTION_REFUSED/i.test(
raw
)
){
return testnet
? "Testnet API недоступен (сеть/DNS). Попробуйте VPN или ключи Mainnet."
: "Bybit API недоступен (сеть/DNS).";
}

const parts =
[
err?.message ||
"fetch failed"
];

const cause =
err?.cause?.message ||
err?.cause?.code;

if(
cause &&
!parts[
0
].includes(
cause
)
){
parts.push(
cause
);
}

return parts.join(
" · "
);

}

async function fetchWithTimeout(
url,
options
){

const controller =
new AbortController();
const timer =
setTimeout(
()=>{
controller.abort();
},
REQUEST_TIMEOUT_MS
);

try{
return await net.fetch(
url,
{
...options,
signal:
controller.signal
}
);
}catch(
err
){

if(
err?.name ===
"AbortError"
){
const timeoutErr =
new Error(
"timeout"
);
timeoutErr.code =
"timeout";
throw timeoutErr;
}

throw err;

}finally{
clearTimeout(
timer
);
}

}

function authHint(
testnet
){

return testnet
? "Ключ не принят (Testnet). Проверьте key/secret на testnet.bybit.com и права «Read»."
: "Ключ не принят (Mainnet). Если ключи с testnet.bybit.com — включите Testnet и сохраните снова.";

}

function parseBybitBody(
text
){

if(
!text?.trim()
){
return null;
}

try{
return JSON.parse(
text
);
}catch{
return null;
}

}

function formatApiError(
data,
{
testnet,
httpStatus
} = {}
){

const msg =
data?.retMsg ||
(
data?.retCode != null
? `Bybit error ${data.retCode}`
: null
);

if(
data?.retCode ===
10003 ||
httpStatus ===
401
){
return authHint(
testnet
);
}

return msg ||
(
httpStatus
? `Bybit HTTP ${httpStatus}`
: "Bybit API error"
);

}

async function privateGet(
path,
query,
isRetry =
false
){

const creds =
getCredentials();

if(
!creds
){
return {
ok:
false,
message:
"API keys not configured"
};
}

await ensureBybitTimeSync(
creds.testnet,
isRetry
);

const params =
new URLSearchParams(
query
);
const queryString =
params.toString();
const timestamp =
String(
signedNowMs()
);
const signBase =
`${timestamp}${creds.apiKey}${RECV_WINDOW}${queryString}`;
const sign =
signPayload(
creds.apiSecret,
signBase
);
const headers =
{
"X-BAPI-API-KEY":
creds.apiKey,
"X-BAPI-SIGN":
sign,
"X-BAPI-TIMESTAMP":
timestamp,
"X-BAPI-RECV-WINDOW":
RECV_WINDOW
};

let lastNetworkError =
null;
let lastAuthError =
null;

for(
const base of apiBases(
creds.testnet
)
){
const url =
`${base}${path}?${queryString}`;

try{
const response =
await fetchWithTimeout(
url,
{
method:
"GET",
headers
}
);

const rawText =
await response.text();
const data =
parseBybitBody(
rawText
);

if(
!data
){
const authLike =
response.status ===
401 ||
response.status ===
403;

if(
authLike
){
lastAuthError =
authHint(
creds.testnet
);
continue;
}

return {
ok:
false,
message:
formatApiError(
null,
{
testnet:
creds.testnet,
httpStatus:
response.status
}
)
};
}

if(
data.retCode !==
0
){

if(
data.retCode ===
10003
){
lastAuthError =
authHint(
creds.testnet
);
continue;
}

if(
!isRetry &&
isTimestampRecvWindowError(
data
)
){
return privateGet(
path,
query,
true
);
}

return {
ok:
false,
message:
formatApiError(
data,
{
testnet:
creds.testnet,
httpStatus:
response.status
}
),
retCode:
data.retCode
};
}

return {
ok:
true,
data
};
}catch(
err
){
lastNetworkError =
err;
}

}

if(
lastAuthError
){
return {
ok:
false,
message:
lastAuthError
};
}

return {
ok:
false,
message:
formatFetchError(
lastNetworkError,
creds.testnet
)
};

}

function pickUsdtBalance(
payload
){

const list =
payload?.result?.list;

if(
!Array.isArray(
list
) ||
!list.length
){
return null;
}

const coins =
list[
0
]?.coin;

if(
!Array.isArray(
coins
)
){
return null;
}

const usdt =
coins.find(
row=>
row.coin ===
"USDT"
);

if(
!usdt
){
return null;
}

const value =
usdt.equity ??
usdt.walletBalance ??
usdt.availableToWithdraw ??
"0";

return String(
value
);

}

async function getWalletBalance(){

const result =
await privateGet(
"/v5/account/wallet-balance",
{
accountType:
"UNIFIED"
}
);

if(
!result.ok
){
return result;
}

const usdt =
pickUsdtBalance(
result.data
);

return {
ok:
true,
usdt:
usdt ??
"0"
};

}

function stripSymbolSuffix(
symbol
){

return String(
symbol ||
""
).replace(
/\.P$/i,
""
).trim().toUpperCase();

}

function displayTicker(
symbol
){

const base =
stripSymbolSuffix(
symbol
);

if(
/USDT$/i.test(
base
)
){
return `${base}.P`;
}

return base;

}

function mapPositionRow(
row
){

const size =
Number(
row?.size
);

if(
!Number.isFinite(
size
) ||
size ===
0
){
return null;
}

const pnl =
Number(
row?.unrealisedPnl
);
const volume =
Number(
row?.positionValue
);

const volumeUsdt =
Number.isFinite(
volume
) &&
volume >
0
? volume
: Math.abs(
size *
Number(
row?.markPrice ||
row?.avgPrice ||
0
)
);

return {
symbol:
row.symbol,
ticker:
displayTicker(
row.symbol
),
pnl:
Number.isFinite(
pnl
)
? pnl
: 0,
volumeUsdt:
Number.isFinite(
volumeUsdt
)
? volumeUsdt
: 0,
side:
row.side ||
"",
size:
String(
row.size
),
avgPrice:
Number(
row?.avgPrice ||
row?.entryPrice
) ||
0,
markPrice:
Number(
row?.markPrice
) ||
0,
liqPrice:
Number(
row?.liqPrice
) ||
0,
leverage:
String(
row?.leverage ||
""
).trim(),
tradeMode:
Number(
row?.tradeMode ??
0
),
marginMode:
Number(
row?.tradeMode ??
0
) ===
1
? "isolated"
: "cross",
stopLoss:
Number(
row?.stopLoss
) ||
0,
takeProfit:
Number(
row?.takeProfit
) ||
0,
positionIdx:
row.positionIdx ??
0
};

}

function parseBybitTimeMs(
raw
){

const n =
Number(
raw
);

if(
!Number.isFinite(
n
) ||
n <=
0
){
return null;
}

if(
n <
1e12
){
return Math.round(
n *
1000
);
}

return Math.round(
n
);

}

function closedPnlPositionSide(
closeSide
){

return String(
closeSide ||
""
).toLowerCase() ===
"sell"
? "long"
: "short";

}

function mapExecutionRow(
row
){

if(
!row
){
return null;
}

const execTimeMs =
parseBybitTimeMs(
row.execTime
);

if(
!execTimeMs
){
return null;
}

return {
symbol:
stripSymbolSuffix(
row.symbol
).toUpperCase(),
execTimeMs,
side:
String(
row.side ||
""
),
execQty:
Number(
row.execQty
) ||
0,
execPrice:
Number(
row.execPrice
) ||
0,
execFee:
Number(
row.execFee
) ||
0,
execValue:
Number(
row.execValue
) ||
0,
orderId:
String(
row.orderId ||
""
),
feeRate:
Number(
row.feeRate
) ||
0,
execId:
String(
row.execId ||
""
)
};

}

function executionKey(
ex
){

return ex.execId ||
[
ex.execTimeMs,
ex.side,
ex.execQty,
ex.execPrice,
ex.orderId
].join(
"|"
);

}

function sumExecQty(
fills
){

return fills.reduce(
(
sum,
fill
)=>
sum +
(
Number(
fill.execQty
) ||
0
),
0
);

}

function entryPriceMatchesAvg(
vwap,
avgEntry
){

if(
!(
avgEntry >
0
) ||
!(
vwap >
0
)
){
return true;
}

return Math.abs(
vwap -
avgEntry
) /
avgEntry <=
0.002;

}

function pickOpenFillsByQtyAndEntry(
candidatesNewestFirst,
targetQty,
avgEntryPrice
){

let fallback =
null;

for(
let i =
0;
i <
candidatesNewestFirst.length;
i++
){

const first =
candidatesNewestFirst[
i
];

if(
!(
first.execQty >
0
)
){
continue;
}

let need =
targetQty;
const selected =
[];

for(
let j =
i;
j <
candidatesNewestFirst.length;
j++
){

const ex =
candidatesNewestFirst[
j
];

if(
!(
ex.execQty >
0
)
){
continue;
}

selected.push(
ex
);
need -=
ex.execQty;

if(
need <=
1e-8
){

const vwap =
weightedAvgPrice(
selected
);
const oldestFirst =
[
...selected
].reverse();

if(
!fallback
){
fallback =
oldestFirst;
}

if(
entryPriceMatchesAvg(
vwap,
avgEntryPrice
)
){
return oldestFirst;
}

break;

}

}

}

return fallback ||
[];

}

function collectOpenFills(
trade,
pool,
exits,
targetQty,
{
wide = false
} = {}
){

const openSide =
trade.side ===
"long"
? "Buy"
: "Sell";
const closeMs =
Number(
trade.closeTimeMs
);
const openMs =
Number(
trade.openTimeMs
);
const avgEntryPrice =
Number(
trade.avgEntryPrice
) ||
0;
const exitKeys =
new Set(
exits.map(
executionKey
)
);
const durationLookback =
Math.max(
closeMs -
openMs +
60000,
5 *
60 *
1000
);
const lookbackMs =
Math.max(
wide
? EXEC_HISTORY_MAX_LOOKBACK_MS
: durationLookback,
avgEntryPrice >
0
? EXEC_HISTORY_MAX_LOOKBACK_MS
: durationLookback
);
const minTime =
closeMs -
lookbackMs;

const candidates =
pool
.filter(
ex=>
ex.side ===
openSide &&
!exitKeys.has(
executionKey(
ex
)
) &&
ex.execTimeMs <=
closeMs +
2000 &&
ex.execTimeMs >=
minTime
)
.sort(
(
a,
b
)=>
b.execTimeMs -
a.execTimeMs
);

return pickOpenFillsByQtyAndEntry(
candidates,
targetQty,
avgEntryPrice
);

}

async function getExecutionHistory(
options =
{}
){

const startTime =
options.startTime;
const endTime =
options.endTime;
const executions =
[];
let cursor =
"";

for(
let page =
0;
page <
40;
page++
){

const query =
{
category:
"linear",
limit:
"100"
};

if(
startTime !=
null
){
query.startTime =
String(
startTime
);
}

if(
endTime !=
null
){
query.endTime =
String(
endTime
);
}

const symbol =
stripSymbolSuffix(
options.symbol
);

if(
symbol
){
query.symbol =
symbol;
}

if(
cursor
){
query.cursor =
cursor;
}

const result =
await privateGet(
"/v5/execution/list",
query
);

if(
!result.ok
){

if(
executions.length
){
return {
ok:
true,
executions
};
}

return result;

}

const list =
result.data?.result?.list;

if(
Array.isArray(
list
)
){

for(
const row of
list
){

const mapped =
mapExecutionRow(
row
);

if(
mapped
){
executions.push(
mapped
);
}

}

}

const next =
result.data?.result?.nextPageCursor;

if(
!next ||
next ===
cursor
){
break;
}

cursor =
next;

}

return {
ok:
true,
executions
};

}

function inferOpenTimeMs(
closedRow,
executions
){

const closeMs =
parseBybitTimeMs(
closedRow.updatedTime
);

const symbol =
stripSymbolSuffix(
closedRow.symbol
).toUpperCase();

const qty =
Number(
closedRow.closedSize
) ||
Number(
closedRow.qty
) ||
0;

const avgEntryPrice =
Number(
closedRow.avgEntryPrice
) ||
0;

if(
!closeMs ||
!symbol ||
qty <=
0
){
return null;
}

const closeSide =
String(
closedRow.side ||
""
);
const openSide =
closeSide ===
"Buy"
? "Sell"
: "Buy";

const candidates =
executions
.filter(
ex=>
ex.symbol ===
symbol &&
ex.side ===
openSide &&
ex.execQty >
0 &&
ex.execTimeMs <=
closeMs &&
ex.execTimeMs >=
closeMs -
EXEC_HISTORY_MAX_LOOKBACK_MS
)
.sort(
(
a,
b
)=>
b.execTimeMs -
a.execTimeMs
);

const picked =
pickOpenFillsByQtyAndEntry(
candidates,
qty,
avgEntryPrice
);

if(
!picked.length
){
return null;
}

return picked[
0
].execTimeMs;

}

function weightedAvgPrice(
fills
){

let sumQty =
0;
let sumVal =
0;

for(
const fill of
fills
){

const qty =
Number(
fill.execQty
) ||
0;
const price =
Number(
fill.execPrice
) ||
0;

if(
qty <=
0 ||
price <=
0
){
continue;
}

sumQty +=
qty;
sumVal +=
qty *
price;

}

return sumQty >
0
? sumVal /
sumQty
: 0;

}

function matchTradeExecutions(
trade,
allExecutions
){

const symbol =
String(
trade.symbol ||
""
).toUpperCase();
const qty =
Number(
trade.qty
) ||
0;
const positionSide =
trade.side;
const closeSide =
positionSide ===
"long"
? "Sell"
: "Buy";
const openSide =
positionSide ===
"long"
? "Buy"
: "Sell";

const closeMs =
Number(
trade.closeTimeMs
);
const openMs =
Number(
trade.openTimeMs
);
const closeOrderId =
String(
trade.orderId ||
""
);

const pool =
allExecutions
.filter(
ex=>
ex.symbol ===
symbol &&
ex.execTimeMs <=
closeMs +
120000 &&
ex.execTimeMs >=
closeMs -
EXEC_HISTORY_MAX_LOOKBACK_MS
)
.sort(
(
a,
b
)=>
a.execTimeMs -
b.execTimeMs
);

let exits =
[];

if(
closeOrderId
){
exits =
pool.filter(
ex=>
ex.side ===
closeSide &&
ex.orderId ===
closeOrderId
);
}

if(
!exits.length
){

const candidates =
pool
.filter(
ex=>
ex.side ===
closeSide &&
ex.execTimeMs <=
closeMs +
5000
)
.sort(
(
a,
b
)=>
b.execTimeMs -
a.execTimeMs
);

let need =
qty;

if(
need <=
0
){
exits =
candidates.filter(
ex=>
Math.abs(
ex.execTimeMs -
closeMs
) <
5000
);
}else{

for(
const ex of
candidates
){

if(
need <=
1e-8
){
break;
}

exits.push(
ex
);
need -=
ex.execQty;

}

exits.reverse();

}

}

let entries =
[];

const exitQty =
sumExecQty(
exits
);
const targetQty =
Math.max(
qty,
exitQty
);

if(
targetQty >
0
){

entries =
collectOpenFills(
trade,
pool,
exits,
targetQty
);

if(
!entries.length
){

entries =
collectOpenFills(
trade,
allExecutions.filter(
ex=>
ex.symbol ===
symbol &&
ex.execTimeMs <=
closeMs +
2000 &&
ex.execTimeMs >=
closeMs -
EXEC_HISTORY_MAX_LOOKBACK_MS
),
exits,
targetQty,
{
wide:
true
}
);

}

}

const executions =
[
...entries,
...exits
].sort(
(
a,
b
)=>
a.execTimeMs -
b.execTimeMs
);

const avgEntryPrice =
weightedAvgPrice(
entries
) ||
Number(
trade.avgEntryPrice
) ||
0;
const avgExitPrice =
weightedAvgPrice(
exits
) ||
Number(
trade.avgExitPrice
) ||
0;

return {
entries,
exits,
executions,
avgEntryPrice,
avgExitPrice
};

}

async function getTradeDiaryDetail(
options =
{}
){

const symbol =
String(
options.symbol ||
""
).toUpperCase();
const openTimeMs =
Number(
options.openTimeMs
);
const closeTimeMs =
Number(
options.closeTimeMs
);

if(
!symbol ||
!Number.isFinite(
openTimeMs
) ||
!Number.isFinite(
closeTimeMs
)
){
return {
ok:
false,
message:
"Некорректные параметры сделки"
};
}

const execResult =
await fetchExecutionHistoryRange(
Math.max(
0,
closeTimeMs -
EXEC_HISTORY_MAX_LOOKBACK_MS
),
closeTimeMs +
60 *
1000,
symbol
);

if(
!execResult.ok
){
return execResult;
}

const trade =
{
symbol,
openTimeMs,
closeTimeMs,
side:
options.side,
qty:
options.qty,
orderId:
options.orderId,
avgEntryPrice:
options.avgEntryPrice,
avgExitPrice:
options.avgExitPrice
};

const matched =
matchTradeExecutions(
trade,
execResult.executions ||
[]
);

const entryOpenMs =
matched.entries?.length
? Number(
matched.entries[
0
].execTimeMs
)
: openTimeMs;
const resolvedOpenMs =
Number.isFinite(
entryOpenMs
) &&
entryOpenMs >
0 &&
entryOpenMs <
closeTimeMs
? entryOpenMs
: openTimeMs;

return {
ok:
true,
...matched,
openTimeMs:
resolvedOpenMs,
closeTimeMs,
durationMs:
Math.max(
0,
closeTimeMs -
resolvedOpenMs
),
side:
options.side
};

}

function mapClosedPnlRow(
row,
executions =
[]
){

if(
!row
){
return null;
}

const closedPnl =
Number(
row.closedPnl
);

if(
!Number.isFinite(
closedPnl
)
){
return null;
}

const cumEntryValue =
Number(
row.cumEntryValue
) ||
0;
const openFee =
Number(
row.openFee
) ||
0;
const closeFee =
Number(
row.closeFee
) ||
0;
const closeTimeMs =
parseBybitTimeMs(
row.updatedTime
);

if(
!closeTimeMs
){
return null;
}

const inferredOpen =
inferOpenTimeMs(
row,
executions
);
const recordCreated =
parseBybitTimeMs(
row.createdTime
);

let openTimeMs =
inferredOpen ||
(
recordCreated &&
recordCreated <
closeTimeMs
? recordCreated
: null
);

if(
!openTimeMs
){
openTimeMs =
closeTimeMs;
}

let durationMs =
Math.max(
0,
closeTimeMs -
openTimeMs
);

if(
durationMs <
1000 &&
openTimeMs <
closeTimeMs
){
durationMs =
closeTimeMs -
openTimeMs;
}

return {
symbol:
stripSymbolSuffix(
row.symbol
),
closeTimeMs,
openTimeMs,
durationMs,
pnlUsd:
closedPnl,
pnlPct:
cumEntryValue >
0
? (
closedPnl /
cumEntryValue
) *
100
: 0,
commissionUsd:
openFee +
closeFee,
side:
closedPnlPositionSide(
row.side
),
qty:
Number(
row.closedSize
) ||
Number(
row.qty
) ||
(
Number(
row.avgEntryPrice
) >
0 &&
Number(
row.cumEntryValue
) >
0
? Number(
row.cumEntryValue
) /
Number(
row.avgEntryPrice
)
: 0
),
avgEntryPrice:
Number(
row.avgEntryPrice
) ||
0,
avgExitPrice:
Number(
row.avgExitPrice
) ||
0,
leverage:
Math.max(
1,
Math.min(
200,
Math.round(
Number(
row.leverage
) ||
0
)
) ||
1
),
orderId:
String(
row.orderId ||
""
)
};

}

const BYBIT_QUERY_MAX_MS =
7 *
24 *
60 *
60 *
1000;

function chunkTimeRange(
startMs,
endMs,
maxWindowMs =
BYBIT_QUERY_MAX_MS
){

const chunks =
[];

if(
!Number.isFinite(
startMs
) ||
!Number.isFinite(
endMs
) ||
endMs <
startMs
){
return chunks;
}

let cursor =
startMs;

while(
cursor <=
endMs
){

const chunkEnd =
Math.min(
cursor +
maxWindowMs -
1,
endMs
);
chunks.push({
startMs:
cursor,
endMs:
chunkEnd
});
cursor =
chunkEnd +
1;

}

return chunks;

}

function tradeHistoryKey(
trade
){

return `${trade.symbol}-${trade.closeTimeMs}-${trade.orderId ||
""}`;

}

async function fetchExecutionHistoryRange(
startMs,
endMs,
symbol =
null
){

if(
startMs ==
null ||
endMs ==
null
){
return getExecutionHistory({
startTime:
startMs,
endTime:
endMs,
symbol
});
}

const merged =
[];
const seen =
new Set();

for(
const chunk of
chunkTimeRange(
startMs,
endMs
)
){

const result =
await getExecutionHistory({
startTime:
chunk.startMs,
endTime:
chunk.endMs,
symbol
});

if(
!result.ok
){

if(
merged.length
){
break;
}

return result;

}

for(
const ex of
result.executions ||
[]
){

const key =
executionKey(
ex
);

if(
seen.has(
key
)
){
continue;
}

seen.add(
key
);
merged.push(
ex
);

}

}

return {
ok:
true,
executions:
merged
};

}

async function getSymbolExecutionHistory(
options =
{}
){

const symbol =
stripSymbolSuffix(
options.symbol
);

if(
!symbol
){
return {
ok:
false,
message:
"symbol required"
};
}

const startTime =
options.startTime !=
null
? Number(
options.startTime
)
: null;
const endTime =
options.endTime !=
null
? Number(
options.endTime
)
: Date.now();

if(
startTime !=
null &&
Number.isFinite(
startTime
)
){

const effectiveStart =
Math.max(
startTime,
endTime -
EXEC_HISTORY_MAX_LOOKBACK_MS
);

const result =
await fetchExecutionHistoryRange(
effectiveStart,
endTime,
null
);

if(
!result.ok
){
return result;
}

return {
ok:
true,
executions:
filterExecutionsBySymbol(
result.executions,
symbol
)
};

}

const lookbackStart =
endTime -
EXEC_HISTORY_MAX_LOOKBACK_MS;
const result =
await getExecutionHistory({
startTime:
lookbackStart,
endTime
});

if(
!result.ok
){
return result;
}

return {
ok:
true,
executions:
filterExecutionsBySymbol(
result.executions,
symbol
)
};

}

function filterExecutionsBySymbol(
executions,
symbol
){

const want =
stripSymbolSuffix(
symbol
).toUpperCase();

if(
!want ||
!Array.isArray(
executions
)
){
return [];
}

return executions.filter(
ex=>
stripSymbolSuffix(
ex?.symbol
).toUpperCase() ===
want
);

}

async function fetchClosedPnlPaged(
startTime,
endTime,
executions,
pagedOptions =
{}
){

const trades =
[];
let cursor =
"";

const symbolFilter =
stripSymbolSuffix(
pagedOptions.symbol
);

for(
let page =
0;
page <
40;
page++
){

const query =
{
category:
"linear",
limit:
"100"
};

if(
startTime !=
null
){
query.startTime =
String(
startTime
);
}

if(
endTime !=
null
){
query.endTime =
String(
endTime
);
}

if(
cursor
){
query.cursor =
cursor;
}

if(
symbolFilter
){
query.symbol =
symbolFilter;
}

const result =
await privateGet(
"/v5/position/closed-pnl",
query
);

if(
!result.ok
){

if(
trades.length
){
return {
ok:
true,
trades
};
}

return result;

}

const list =
result.data?.result?.list;

if(
Array.isArray(
list
)
){

for(
const row of
list
){

const mapped =
mapClosedPnlRow(
row,
executions
);

if(
mapped
){
trades.push(
mapped
);
}

}

}

const next =
result.data?.result?.nextPageCursor;

if(
!next ||
next ===
cursor
){
break;
}

cursor =
next;

}

return {
ok:
true,
trades
};

}

async function fetchClosedPnlChunkedParallel(
startTime,
endTime,
executions,
pagedOpts,
concurrency =
8
){

const chunks =
chunkTimeRange(
startTime,
endTime
);

if(
!chunks.length
){
return {
ok:
true,
trades:
[]
};
}

const merged =
[];
const seen =
new Set();
let hardError =
null;

for(
let i =
0;
i <
chunks.length;
i +=
concurrency
){

const slice =
chunks.slice(
i,
i +
concurrency
);
const results =
await Promise.all(
slice.map(
chunk=>
fetchClosedPnlPaged(
chunk.startMs,
chunk.endMs,
executions,
pagedOpts
)
)
);

for(
const result of
results
){

if(
!result.ok
){

if(
merged.length
){
continue;
}

hardError =
result;
continue;
}

for(
const trade of
result.trades ||
[]
){

const key =
tradeHistoryKey(
trade
);

if(
seen.has(
key
)
){
continue;
}

seen.add(
key
);
merged.push(
trade
);

}

}

}

if(
hardError &&
!merged.length
){
return hardError;
}

merged.sort(
(
a,
b
)=>
b.closeTimeMs -
a.closeTimeMs
);

return {
ok:
true,
trades:
merged
};

}

async function getClosedPnlHistory(
options =
{}
){

const startTime =
options.startTime;
const endTime =
options.endTime;
const skipExecutions =
options.skipExecutions ===
true;
const parallelChunks =
options.parallelChunks ===
true;
const symbolFilter =
stripSymbolSuffix(
options.symbol
);
const pagedOpts =
symbolFilter
? {
symbol:
symbolFilter
}
: {};

const execLookbackMs =
EXEC_HISTORY_MAX_LOOKBACK_MS;
let execResult;

if(
startTime !=
null &&
!skipExecutions
){

execResult =
await fetchExecutionHistoryRange(
Math.max(
0,
startTime -
execLookbackMs
),
endTime !=
null
? endTime
: Date.now(),
symbolFilter ||
null
);

}else{

execResult =
{
ok:
true,
executions:
[]
};

}

const executions =
execResult.ok &&
Array.isArray(
execResult.executions
)
? execResult.executions
: [];

if(
startTime ==
null ||
endTime ==
null ||
endTime -
startTime <=
BYBIT_QUERY_MAX_MS
){
return fetchClosedPnlPaged(
startTime,
endTime,
executions,
pagedOpts
);

}

const merged =
[];
const seen =
new Set();

if(
parallelChunks
){

return fetchClosedPnlChunkedParallel(
startTime,
endTime,
executions,
pagedOpts
);

}

for(
const chunk of
chunkTimeRange(
startTime,
endTime
)
){

const result =
await fetchClosedPnlPaged(
chunk.startMs,
chunk.endMs,
executions,
pagedOpts
);

if(
!result.ok
){

if(
merged.length
){
return {
ok:
true,
trades:
merged.sort(
(
a,
b
)=>
b.closeTimeMs -
a.closeTimeMs
)
};
}

return result;

}

for(
const trade of
result.trades ||
[]
){

const key =
tradeHistoryKey(
trade
);

if(
seen.has(
key
)
){
continue;
}

seen.add(
key
);
merged.push(
trade
);

}

}

merged.sort(
(
a,
b
)=>
b.closeTimeMs -
a.closeTimeMs
);

return {
ok:
true,
trades:
merged
};

}

async function fetchPositionListRaw(){

const result =
await privateGet(
"/v5/position/list",
{
category:
"linear",
settleCoin:
"USDT",
limit:
"200"
}
);

if(
!result.ok
){
return result;
}

const list =
result.data?.result?.list;

return {
ok:
true,
list:
Array.isArray(
list
)
? list
: []
};

}

async function getPositions(){

const result =
await fetchPositionListRaw();

if(
!result.ok
){
return result;
}

const list =
result.list;

const positions =
Array.isArray(
list
)
? list.map(
mapPositionRow
).filter(
Boolean
)
: [];

return {
ok:
true,
positions
};

}

function isPositionTpslOrderRow(
row
){

const orderFilter =
String(
row?.orderFilter ||
""
).trim();
const stopOrderType =
String(
row?.stopOrderType ||
""
).trim();

return orderFilter ===
"tpslOrder" ||
stopOrderType ===
"TakeProfit" ||
stopOrderType ===
"StopLoss" ||
stopOrderType ===
"TrailingStop";

}

function mapOrderRow(
row
){

const status =
String(
row?.orderStatus ||
""
);

if(
![
"New",
"PartiallyFilled",
"Untriggered",
"Triggered"
].includes(
status
)
){
return null;
}

const side =
String(
row?.side ||
""
);

if(
side !==
"Buy" &&
side !==
"Sell"
){
return null;
}

const orderType =
String(
row?.orderType ||
""
);

const triggerRaw =
row?.triggerPrice;
const triggerPrice =
Number(
triggerRaw
);
const hasTrigger =
Number.isFinite(
triggerPrice
) &&
triggerPrice >
0;

const limitPrice =
Number(
row?.price
);

const isReduceOnly =
row?.reduceOnly ===
true ||
row?.reduceOnly ===
"true";

const orderFilter =
String(
row?.orderFilter ||
""
).trim();
const stopOrderType =
String(
row?.stopOrderType ||
""
).trim();

if(
isReduceOnly &&
(
orderFilter ===
"tpslOrder" ||
stopOrderType ===
"TakeProfit" ||
stopOrderType ===
"StopLoss" ||
stopOrderType ===
"TrailingStop"
)
){
return null;
}

let label =
"";
let orderKind =
"";

if(
hasTrigger &&
orderType ===
"Market"
){
label =
side ===
"Buy"
? "Buy Stop"
: "Sell Stop";
orderKind =
"stop";
}else if(
orderType ===
"Limit" &&
Number.isFinite(
limitPrice
) &&
limitPrice >
0
){
label =
side ===
"Buy"
? "Buy Limit"
: "Sell Limit";
orderKind =
"limit";
}else{
return null;
}

const shortLabel =
orderKind ===
"stop"
? (
side ===
"Buy"
? "BST"
: "SST"
)
: (
side ===
"Buy"
? "BLT"
: "SLT"
);

const displayPrice =
orderKind ===
"stop"
? triggerPrice
: limitPrice;

const qty =
Number(
row?.qty
);
const created =
Number(
row?.createdTime
);

const volumeUsdt =
Number.isFinite(
qty
) &&
Number.isFinite(
displayPrice
)
? qty *
displayPrice
: 0;

return {
orderId:
row.orderId,
orderLinkId:
String(
row?.orderLinkId ||
""
),
symbol:
row.symbol,
ticker:
displayTicker(
row.symbol
),
price:
displayPrice,
side,
label,
shortLabel,
orderKind,
badgeSide:
side ===
"Buy"
? "long"
: "short",
reduceOnly:
isReduceOnly,
qty:
Number.isFinite(
qty
)
? qty
: 0,
leavesQty:
Number.isFinite(
Number(
row?.leavesQty
)
)
? Number(
row?.leavesQty
)
: null,
volumeUsdt,
orderType,
createdAt:
Number.isFinite(
created
)
? created
: null
};

}

const instrumentRulesCache =
new Map();

const INSTRUMENT_CACHE_MS =
3600000;

function decimalsFromStep(
stepStr
){

const s =
String(
stepStr ||
""
);

const dot =
s.indexOf(
"."
);

return dot ===
-1
? 0
: s.length -
dot -
1;

}

function formatQtyValue(
qty,
decimals
){

return Number(
qty
).toFixed(
Math.max(
0,
decimals
)
);

}

function qtyFromVolumeUsdt(
volumeUsdt,
price,
rules =
null
){

const vol =
Number(
volumeUsdt
);
const p =
Number(
price
);

if(
!Number.isFinite(
vol
) ||
vol <=
0 ||
!Number.isFinite(
p
) ||
p <=
0
){
return null;
}

const raw =
vol /
p;
const step =
Number(
rules?.qtyStep
);
const minQty =
Number(
rules?.minOrderQty
);

if(
Number.isFinite(
step
) &&
step >
0
){
const min =
Number.isFinite(
minQty
) &&
minQty >
0
? minQty
: step;
const decimals =
decimalsFromStep(
rules.qtyStep
);
const stepsFloor =
Math.floor(
raw /
step
);
const stepsCeil =
Math.ceil(
raw /
step
);
const candidates =
[];

if(
stepsFloor >
0
){
candidates.push(
stepsFloor *
step
);
}

if(
stepsCeil >
0
){
candidates.push(
stepsCeil *
step
);
}

if(
min >
0
){
candidates.push(
min
);
}

let bestQty =
0;
let bestDiff =
Infinity;

for(
const qty of candidates
){
if(
qty <
min
){
continue;
}

const maxQty =
Number(
rules?.maxOrderQty
);

if(
Number.isFinite(
maxQty
) &&
maxQty >
0 &&
qty >
maxQty
){
continue;
}

const notional =
qty *
p;
const diff =
Math.abs(
notional -
vol
);

if(
diff <
bestDiff
){
bestDiff =
diff;
bestQty =
qty;
}

}

if(
bestQty <=
0
){
return null;
}

return formatQtyValue(
bestQty,
decimals
);
}

if(
raw >=
1000
){
return raw.toFixed(
0
);
}

if(
raw >=
100
){
return raw.toFixed(
1
);
}

if(
raw >=
10
){
return raw.toFixed(
2
);
}

if(
raw >=
1
){
return raw.toFixed(
3
);
}

return raw.toFixed(
6
);

}

async function publicMarketGet(
path,
query
){

const creds =
getCredentials();
const testnet =
creds?.testnet ??
false;
const params =
new URLSearchParams(
query
);
const queryString =
params.toString();
const urlPath =
queryString
? `${path}?${queryString}`
: path;

for(
const base of apiBases(
testnet
)
){

try{
const response =
await fetchWithTimeout(
`${base}${urlPath}`,
{
method:
"GET"
}
);

const rawText =
await response.text();
const data =
parseBybitBody(
rawText
);

if(
data?.retCode ===
0
){
return {
ok:
true,
data
};
}
}catch{
/* try next base */
}

}

return {
ok:
false,
message:
"Instrument info unavailable"
};

}

async function getInstrumentRules(
symbol
){

const sym =
stripSymbolSuffix(
symbol
);
const cached =
instrumentRulesCache.get(
sym
);

if(
cached &&
Date.now() -
cached.at <
INSTRUMENT_CACHE_MS
){
return cached.rules;
}

const result =
await publicMarketGet(
"/v5/market/instruments-info",
{
category:
"linear",
symbol:
sym
}
);

let rules =
{
qtyStep:
"0.001",
minOrderQty:
"0.001",
tickSize:
"0.0001",
maxLeverage:
"100",
minLeverage:
"1"
};

if(
result.ok
){
const row =
result.data?.result?.list?.[
0
];
const lot =
row?.lotSizeFilter;
const priceFilter =
row?.priceFilter;

if(
lot
){
rules =
{
qtyStep:
lot.qtyStep ||
"0.001",
minOrderQty:
lot.minOrderQty ||
lot.qtyStep ||
"0.001",
maxOrderQty:
lot.maxOrderQty,
tickSize:
priceFilter?.tickSize ||
rules.tickSize,
maxLeverage:
rules.maxLeverage,
minLeverage:
rules.minLeverage
};
}else if(
priceFilter?.tickSize
){
rules.tickSize =
priceFilter.tickSize;
}

const lev =
row?.leverageFilter;

if(
lev
){
rules.maxLeverage =
lev.maxLeverage ||
rules.maxLeverage;
rules.minLeverage =
lev.minLeverage ||
rules.minLeverage;
}
}

instrumentRulesCache.set(
sym,
{
rules,
at:
Date.now()
}
);

return rules;

}

async function placeTradeOrder(
payload
){

const sym =
stripSymbolSuffix(
payload?.symbol
);
const kind =
String(
payload?.kind ||
""
).toLowerCase();
const price =
Number(
payload?.price
);
const volumeUsdt =
Number(
payload?.volumeUsdt
);
const providedQty =
payload?.qty;
const markPrice =
Number(
payload?.markPrice
);

if(
!sym
){
return {
ok:
false,
message:
"Symbol required"
};
}

if(
!Number.isFinite(
price
) ||
price <=
0
){
return {
ok:
false,
message:
"Invalid price"
};
}

if(
providedQty ==
null &&
(
!Number.isFinite(
volumeUsdt
) ||
volumeUsdt <=
0
)
){
return {
ok:
false,
message:
"Invalid volume"
};
}

const qtyStr =
providedQty !=
null
? String(
providedQty
).trim()
: qtyFromVolumeUsdt(
volumeUsdt,
price,
await getInstrumentRules(
sym
)
);

if(
!qtyStr ||
Number(
qtyStr
) <=
0
){
return {
ok:
false,
message:
"Volume too small"
};
}

const priceStr =
formatTradingStopPrice(
price,
markPrice ||
price
);

const refMark =
Number.isFinite(
markPrice
) &&
markPrice >
0
? markPrice
: price;
const aboveMark =
price >
refMark;
const triggerDirection =
aboveMark
? 1
: 2;

const body =
{
category:
"linear",
symbol:
sym,
qty:
qtyStr,
timeInForce:
"GTC"
};

const orderLinkId =
String(
payload?.orderLinkId ||
""
).trim().slice(
0,
36
);

if(
orderLinkId
){
body.orderLinkId =
orderLinkId;
}

switch(
kind
){

case "sell-limit":
body.side =
"Sell";
body.orderType =
"Limit";
body.price =
priceStr;
break;

case "buy-limit":
body.side =
"Buy";
body.orderType =
"Limit";
body.price =
priceStr;
break;

case "buy-stop":
body.side =
"Buy";
body.orderType =
"Market";
body.triggerPrice =
priceStr;
body.triggerDirection =
triggerDirection;
body.triggerBy =
"MarkPrice";
break;

case "sell-stop":
body.side =
"Sell";
body.orderType =
"Market";
body.triggerPrice =
priceStr;
body.triggerDirection =
triggerDirection;
body.triggerBy =
"MarkPrice";
break;

default:
return {
ok:
false,
message:
"Unknown order kind"
};

}

const posResult =
await getPosition(
sym
);
const openPos =
posResult?.ok
? posResult.position
: null;
const openSize =
Number(
openPos?.size
);
const posSide =
String(
openPos?.side ||
""
);

if(
Number.isFinite(
openSize
) &&
openSize >
0 &&
posSide
){
const orderSide =
kind.startsWith(
"sell"
)
? "Sell"
: "Buy";
const closesPosition =
(
posSide ===
"Buy" &&
orderSide ===
"Sell"
) ||
(
posSide ===
"Sell" &&
orderSide ===
"Buy"
);

if(
closesPosition
){
body.reduceOnly =
true;
}
}

if(
payload?.forceReduceOnly ===
true
){
body.reduceOnly =
true;
}

if(
body.reduceOnly ===
true &&
body.triggerPrice
){
body.closeOnTrigger =
true;
}

return privatePost(
"/v5/order/create",
body
);

}

async function cancelTradeOrder(
symbol,
orderId
){

const sym =
stripSymbolSuffix(
symbol
);
const id =
String(
orderId ||
""
).trim();

if(
!sym ||
!id
){
return {
ok:
false,
message:
"Symbol and orderId required"
};
}

return privatePost(
"/v5/order/cancel",
{
category:
"linear",
symbol:
sym,
orderId:
id
}
);

}

async function amendTradeOrder(
payload
){

const sym =
stripSymbolSuffix(
payload?.symbol
);
const orderId =
String(
payload?.orderId ||
""
).trim();
const price =
Number(
payload?.price
);
const orderKind =
String(
payload?.orderKind ||
""
);
const markPrice =
Number(
payload?.markPrice
);

if(
!sym ||
!orderId
){
return {
ok:
false,
message:
"Symbol and orderId required"
};
}

if(
!Number.isFinite(
price
) ||
price <=
0
){
return {
ok:
false,
message:
"Invalid price"
};
}

const priceStr =
formatTradingStopPrice(
price,
markPrice ||
price
);

const body =
{
category:
"linear",
symbol:
sym,
orderId
};

if(
orderKind ===
"stop"
){
const refMark =
Number.isFinite(
markPrice
) &&
markPrice >
0
? markPrice
: price;
body.triggerPrice =
priceStr;
body.triggerDirection =
price >
refMark
? 1
: 2;
}else{
body.price =
priceStr;
}

return privatePost(
"/v5/order/amend",
body
);

}

function orderKindFromMappedRow(
mapped
){

const side =
String(
mapped?.side ||
""
);
const orderKind =
String(
mapped?.orderKind ||
""
);

if(
orderKind ===
"stop"
){
return side ===
"Buy"
? "buy-stop"
: "sell-stop";
}

if(
orderKind ===
"limit"
){
return side ===
"Buy"
? "buy-limit"
: "sell-limit";
}

return "";

}

async function reconcileOrdersOnPositionOpen(
symbol,
positionSide
){

const sym =
stripSymbolSuffix(
symbol
);
const posSide =
String(
positionSide ||
""
).trim();

if(
!sym ||
(
posSide !==
"Buy" &&
posSide !==
"Sell"
)
){
return {
ok:
false,
message:
"Symbol and position side required"
};
}

const openingSide =
posSide;
const closingSide =
posSide ===
"Buy"
? "Sell"
: "Buy";

const ordersResult =
await privateGet(
"/v5/order/realtime",
{
category:
"linear",
symbol:
sym,
openOnly:
"0",
limit:
"50"
}
);

if(
!ordersResult.ok
){
return ordersResult;
}

const list =
ordersResult.data?.result?.list;
const rows =
Array.isArray(
list
)
? list
: [];

const posResult =
await getPosition(
sym
);
const markPrice =
Number(
posResult?.position?.markPrice
) ||
0;

const canceledOrderIds =
[];
const stats =
{
canceled:
0,
converted:
0,
skipped:
0,
errors:
[]
};

for(
const row of rows
){

if(
isPositionTpslOrderRow(
row
)
){
stats.skipped++;
continue;
}

const mapped =
mapOrderRow(
row
);

if(
!mapped
){
stats.skipped++;
continue;
}

const side =
String(
row?.side ||
""
);
const isReduceOnly =
row?.reduceOnly ===
true ||
row?.reduceOnly ===
"true";
const orderId =
String(
row?.orderId ||
""
).trim();

if(
!orderId
){
stats.skipped++;
continue;
}

/* Same-side triggers stay on the chart — only opposite side → RO. */
if(
side ===
openingSide
){
stats.skipped++;
continue;
}

if(
side !==
closingSide
){
stats.skipped++;
continue;
}

if(
isReduceOnly
){
stats.skipped++;
continue;
}

const cancelResult =
await cancelTradeOrder(
sym,
orderId
);

if(
cancelResult?.ok ===
false
){
stats.errors.push(
{
orderId,
action:
"cancel-for-ro",
message:
cancelResult.message ||
"cancel failed"
}
);
continue;
}

canceledOrderIds.push(
orderId
);

const kind =
orderKindFromMappedRow(
mapped
);

if(
!kind
){
stats.errors.push(
{
orderId,
action:
"replace-ro",
message:
"Unknown order kind"
}
);
continue;
}

const refMark =
markPrice >
0
? markPrice
: mapped.price;
const volumeUsdt =
Number(
mapped.volumeUsdt
) ||
(
Number(
mapped.qty
) *
Number(
mapped.price
)
);

if(
!Number.isFinite(
volumeUsdt
) ||
volumeUsdt <=
0
){
stats.errors.push(
{
orderId,
action:
"replace-ro",
message:
"Invalid order volume"
}
);
continue;
}

const placeResult =
await placeTradeOrder(
{
symbol:
sym,
kind,
price:
mapped.price,
volumeUsdt,
markPrice:
refMark,
forceReduceOnly:
true
}
);

if(
placeResult?.ok ===
false
){
stats.errors.push(
{
orderId,
action:
"replace-ro",
message:
placeResult.message ||
"replace failed"
}
);
continue;
}

stats.converted++;

}

return {
ok:
true,
symbol:
sym,
positionSide:
posSide,
canceledOrderIds,
...stats
};

}

async function reconcileOrdersOnPositionClose(
symbol
){

const sym =
stripSymbolSuffix(
symbol
);

if(
!sym
){
return {
ok:
false,
message:
"Symbol required"
};
}

const ordersResult =
await privateGet(
"/v5/order/realtime",
{
category:
"linear",
symbol:
sym,
openOnly:
"0",
limit:
"50"
}
);

if(
!ordersResult.ok
){
return ordersResult;
}

const list =
ordersResult.data?.result?.list;
const rows =
Array.isArray(
list
)
? list
: [];

const canceledOrderIds =
[];
const stats =
{
canceled:
0,
skipped:
0,
errors:
[]
};

for(
const row of rows
){

if(
isPositionTpslOrderRow(
row
)
){
stats.skipped++;
continue;
}

const isReduceOnly =
row?.reduceOnly ===
true ||
row?.reduceOnly ===
"true";

if(
!isReduceOnly
){
stats.skipped++;
continue;
}

const orderId =
String(
row?.orderId ||
""
).trim();

if(
!orderId
){
stats.skipped++;
continue;
}

const cancelResult =
await cancelTradeOrder(
sym,
orderId
);

if(
cancelResult?.ok ===
false
){
stats.errors.push(
{
orderId,
action:
"cancel-ro",
message:
cancelResult.message ||
"cancel failed"
}
);
continue;
}

canceledOrderIds.push(
orderId
);
stats.canceled++;

}

return {
ok:
true,
symbol:
sym,
canceledOrderIds,
...stats
};

}

async function getOpenOrders(){

const result =
await privateGet(
"/v5/order/realtime",
{
category:
"linear",
settleCoin:
"USDT",
openOnly:
"0",
limit:
"50"
}
);

if(
!result.ok
){
return result;
}

const list =
result.data?.result?.list;

const orders =
Array.isArray(
list
)
? list.map(
mapOrderRow
).filter(
Boolean
)
: [];

orders.sort(
(
a,
b
)=>
(
b.createdAt ||
0
) -
(
a.createdAt ||
0
)
);

return {
ok:
true,
orders
};

}

async function privatePost(
path,
body,
isRetry =
false
){

const creds =
getCredentials();

if(
!creds
){
return {
ok:
false,
message:
"API keys not configured"
};
}

await ensureBybitTimeSync(
creds.testnet,
isRetry
);

const bodyStr =
JSON.stringify(
body ||
{}
);
const timestamp =
String(
signedNowMs()
);
const signBase =
`${timestamp}${creds.apiKey}${RECV_WINDOW}${bodyStr}`;
const sign =
signPayload(
creds.apiSecret,
signBase
);
const headers =
{
"Content-Type":
"application/json",
"X-BAPI-API-KEY":
creds.apiKey,
"X-BAPI-SIGN":
sign,
"X-BAPI-TIMESTAMP":
timestamp,
"X-BAPI-RECV-WINDOW":
RECV_WINDOW
};

let lastNetworkError =
null;
let lastAuthError =
null;

for(
const base of apiBases(
creds.testnet
)
){
const url =
`${base}${path}`;

try{
const response =
await fetchWithTimeout(
url,
{
method:
"POST",
headers,
body:
bodyStr
}
);

const rawText =
await response.text();
const data =
parseBybitBody(
rawText
);

if(
!data
){
const authLike =
response.status ===
401 ||
response.status ===
403;

if(
authLike
){
lastAuthError =
authHint(
creds.testnet
);
continue;
}

return {
ok:
false,
message:
formatApiError(
null,
{
testnet:
creds.testnet,
httpStatus:
response.status
}
)
};
}

if(
data.retCode !==
0
){

if(
data.retCode ===
10003
){
lastAuthError =
authHint(
creds.testnet
);
continue;
}

if(
!isRetry &&
isTimestampRecvWindowError(
data
)
){
return privatePost(
path,
body,
true
);
}

return {
ok:
false,
message:
formatApiError(
data,
{
testnet:
creds.testnet,
httpStatus:
response.status
}
),
retCode:
data.retCode
};
}

return {
ok:
true,
data
};
}catch(
err
){
lastNetworkError =
err;
}

}

if(
lastAuthError
){
return {
ok:
false,
message:
lastAuthError
};
}

return {
ok:
false,
message:
formatFetchError(
lastNetworkError,
creds.testnet
)
};

}

async function closePositionAtMarket(
symbol
){

const sym =
stripSymbolSuffix(
symbol
);

const posResult =
await privateGet(
"/v5/position/list",
{
category:
"linear",
symbol:
sym
}
);

if(
!posResult.ok
){
return posResult;
}

const list =
posResult.data?.result?.list;
const pos =
Array.isArray(
list
)
? list.find(
row=>
Number(
row?.size
) >
0
)
: null;

if(
!pos
){
return {
ok:
false,
message:
"Нет открытой позиции"
};
}

const side =
pos.side ===
"Buy"
? "Sell"
: "Buy";

return privatePost(
"/v5/order/create",
{
category:
"linear",
symbol:
sym,
side,
orderType:
"Market",
qty:
String(
pos.size
),
reduceOnly:
true,
positionIdx:
pos.positionIdx ??
0
}
);

}

async function getPosition(
symbol
){

const sym =
stripSymbolSuffix(
symbol
);

const result =
await privateGet(
"/v5/position/list",
{
category:
"linear",
symbol:
sym
}
);

if(
!result.ok
){
return result;
}

const list =
result.data?.result?.list;
const row =
Array.isArray(
list
)
? list.find(
item=>
Number(
item?.size
) >
0
)
: null;

return {
ok:
true,
position:
row
? mapPositionRow(
row
)
: null
};

}

async function cancelPositionStop(
symbol,
target
){

const sym =
stripSymbolSuffix(
symbol
);
const posResult =
await getPosition(
sym
);

if(
!posResult.ok
){
return posResult;
}

if(
!posResult.position
){
return {
ok:
false,
message:
"Нет открытой позиции"
};
}

const body =
{
category:
"linear",
symbol:
sym,
positionIdx:
posResult.position.positionIdx ??
0,
tpslMode:
"Full"
};

if(
target ===
"sl" ||
target ===
"both"
){
body.stopLoss =
"0";
}

if(
target ===
"tp" ||
target ===
"both"
){
body.takeProfit =
"0";
}

return privatePost(
"/v5/position/trading-stop",
body
);

}

function formatTradingStopPrice(
price,
refPrice
){

const n =
Number(
price
);

if(
!Number.isFinite(
n
) ||
n <=
0
){
return null;
}

const ref =
Number(
refPrice
);
let decimals =
4;

if(
Number.isFinite(
ref
)
){
const parts =
String(
ref
).split(
"."
);

if(
parts[1]
){
decimals =
Math.min(
Math.max(
parts[1].length,
2
),
8
);
}
}

return n.toFixed(
decimals
);

}

async function setPositionStop(
symbol,
target,
price
){

const sym =
stripSymbolSuffix(
symbol
);
const posResult =
await getPosition(
sym
);

if(
!posResult.ok
){
return posResult;
}

if(
!posResult.position
){
return {
ok:
false,
message:
"Нет открытой позиции"
};
}

const pos =
posResult.position;
const priceStr =
formatTradingStopPrice(
price,
pos.avgPrice
);

if(
!priceStr
){
return {
ok:
false,
message:
"Некорректная цена"
};
}

const body =
{
category:
"linear",
symbol:
sym,
positionIdx:
pos.positionIdx ??
0,
tpslMode:
"Full"
};

const existingSl =
Number(
pos.stopLoss
) ||
0;
const existingTp =
Number(
pos.takeProfit
) ||
0;

if(
target ===
"sl"
){
body.stopLoss =
priceStr;

if(
existingTp >
0
){
body.takeProfit =
formatTradingStopPrice(
existingTp,
pos.avgPrice
);
}
}else if(
target ===
"tp"
){
body.takeProfit =
priceStr;

if(
existingSl >
0
){
body.stopLoss =
formatTradingStopPrice(
existingSl,
pos.avgPrice
);
}
}else{
return {
ok:
false,
message:
"Unknown stop target"
};
}

return privatePost(
"/v5/position/trading-stop",
body
);

}

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

async function measurePublicPing(
testnet
){

const start =
Date.now();

for(
const base of apiBases(
testnet
)
){

try{
const response =
await fetchWithTimeout(
`${base}/v5/market/time`,
{
method:
"GET"
}
);
const data =
parseBybitBody(
await response.text()
);

if(
data?.retCode ===
0
){
return {
ok:
true,
ms:
Date.now() -
start
};
}

}catch{
/* try next base */
}

}

return {
ok:
false,
message:
"Public API недоступен"
};

}

async function measureTradingPing(){

const start =
Date.now();
const result =
await privateGet(
"/v5/account/wallet-balance",
{
accountType:
"UNIFIED",
coin:
"USDT"
}
);

if(
!result.ok
){
return {
ok:
false,
message:
result.message ||
"Signed API недоступен"
};
}

return {
ok:
true,
ms:
Date.now() -
start
};

}

async function pingBybit(
options =
{}
){

const creds =
getCredentials();
const testnet =
options.testnet ??
creds?.testnet ??
false;
const publicPing =
await measurePublicPing(
testnet
);
const out =
{
ok:
publicPing.ok,
testnet,
publicMs:
publicPing.ok
? publicPing.ms
: null,
tradingMs:
null,
configured:
!!creds
};

if(
!publicPing.ok
){
out.message =
publicPing.message;
return out;
}

if(
creds?.apiKey &&
creds?.apiSecret
){
const tradingPing =
await measureTradingPing();

if(
tradingPing.ok
){
out.tradingMs =
tradingPing.ms;
}else{
out.tradingWarning =
tradingPing.message;
}

}

return out;

}

async function pingExchange(
options =
{}
){

return pingBybit(
options
);

}

async function getTickerPrices(
symbol
){

const sym =
stripSymbolSuffix(
symbol
);

const result =
await publicMarketGet(
"/v5/market/tickers",
{
category:
"linear",
symbol:
sym
}
);

if(
!result.ok
){
return null;
}

const row =
result.data?.result?.list?.[
0
];

if(
!row
){
return null;
}

return {
bid:
Number(
row.bid1Price ||
row.lastPrice
),
ask:
Number(
row.ask1Price ||
row.lastPrice
),
last:
Number(
row.lastPrice
),
turnover24h:(
()=>{
const n =
Number(
row.turnover24h
);

return Number.isFinite(
n
)
? n
: null;
}
)()
};

}

async function openPositionAtMarket(
symbol,
side,
volumeUsdt,
_options =
{}
){

const sym =
stripSymbolSuffix(
symbol
);
const sideNorm =
String(
side ||
""
).trim() ===
"Sell"
? "Sell"
: "Buy";
const vol =
Number(
volumeUsdt
);

if(
!sym
){
return {
ok:
false,
message:
"Symbol required"
};
}

if(
!Number.isFinite(
vol
) ||
vol <=
0
){
return {
ok:
false,
message:
"Invalid volume"
};
}

const [
ticker,
rules
] =
await Promise.all(
[
getTickerPrices(
sym
),
getInstrumentRules(
sym
)
]
);
const refPrice =
sideNorm ===
"Buy"
? (
ticker?.ask ||
ticker?.last
)
: (
ticker?.bid ||
ticker?.last
);

if(
!Number.isFinite(
refPrice
) ||
refPrice <=
0
){
return {
ok:
false,
message:
"Price unavailable"
};
}

const qtyStr =
qtyFromVolumeUsdt(
vol,
refPrice,
rules
);

if(
!qtyStr ||
Number(
qtyStr
) <=
0
){
return {
ok:
false,
message:
"Volume too small"
};
}

const orderResult =
await privatePost(
"/v5/order/create",
{
category:
"linear",
symbol:
sym,
side:
sideNorm,
orderType:
"Market",
qty:
qtyStr,
positionIdx:
0
}
);

if(
orderResult?.ok ===
false
){
return orderResult;
}

let position =
null;

for(
let attempt =
0;
attempt <
6;
attempt++
){

if(
attempt >
0
){
await sleep(
attempt ===
1
? 50
: 100
);
}

const posResult =
await getPosition(
sym
);

if(
posResult?.ok &&
posResult.position
){
position =
posResult.position;
break;
}

}

return {
...orderResult,
position
};

}

async function getSymbolPositionSettings(
symbol
){

const sym =
stripSymbolSuffix(
symbol
);

if(
!sym
){
return {
ok:
false,
message:
"Symbol required"
};
}

const [
posResult,
rules
] =
await Promise.all(
[
privateGet(
"/v5/position/list",
{
category:
"linear",
symbol:
sym
}
),
getInstrumentRules(
sym
)
]
);

if(
!posResult.ok
){
return posResult;
}

const row =
posResult.data?.result?.list?.[
0
];
const leverage =
Math.max(
1,
Math.round(
Number(
row?.leverage
) ||
10
)
);
const marginMode =
Number(
row?.tradeMode ??
0
) ===
1
? "isolated"
: "cross";
const maxLeverage =
Math.max(
1,
Math.round(
Number(
rules?.maxLeverage
) ||
100
)
);

return {
ok:
true,
symbol:
sym,
leverage:
Math.min(
leverage,
maxLeverage
),
marginMode,
maxLeverage,
minLeverage:
Math.max(
1,
Math.round(
Number(
rules?.minLeverage
) ||
1
)
)
};

}

async function applySymbolPositionSettings(
symbol,
settings
){

const sym =
stripSymbolSuffix(
symbol
);

if(
!sym
){
return {
ok:
false,
message:
"Symbol required"
};
}

const marginMode =
String(
settings?.marginMode ||
""
).toLowerCase() ===
"isolated"
? "isolated"
: "cross";
const leverage =
Math.max(
1,
Math.round(
Number(
settings?.leverage
)
)
);

if(
!Number.isFinite(
leverage
)
){
return {
ok:
false,
message:
"Invalid leverage"
};
}

const current =
await getSymbolPositionSettings(
sym
);

if(
!current.ok
){
return current;
}

const levStr =
String(
Math.min(
leverage,
current.maxLeverage
)
);
const marginChanged =
current.marginMode !==
marginMode;
const leverageChanged =
String(
current.leverage
) !==
levStr;

if(
!marginChanged &&
!leverageChanged
){
return {
ok:
true
};
}

if(
marginChanged
){

const switchResult =
await privatePost(
"/v5/position/switch-isolated",
{
category:
"linear",
symbol:
sym,
tradeMode:
marginMode ===
"isolated"
? 1
: 0,
buyLeverage:
levStr,
sellLeverage:
levStr
}
);

if(
switchResult.ok
){
return switchResult;
}

if(
!leverageChanged
){
return switchResult;
}

}

return privatePost(
"/v5/position/set-leverage",
{
category:
"linear",
symbol:
sym,
buyLeverage:
levStr,
sellLeverage:
levStr
}
);

}

async function fetchKlineHistory(
symbol,
tf,
limit =
300
){

const sym =
stripSymbolSuffix(
symbol
);

if(
!sym
){
return {
ok:
false,
message:
"symbol required"
};
}

const tfNorm =
String(
tf ||
"5"
).trim();
const aliases =
{
"1m":
"1",
"5m":
"5",
"15m":
"15",
"1h":
"60",
"4h":
"240",
"1d":
"D",
"1w":
"W"
};
const interval =
aliases[
tfNorm.toLowerCase()
] ||
tfNorm;
const capped =
Math.min(
1000,
Math.max(
1,
Math.round(
Number(
limit
) ||
300
)
)
);

const result =
await publicMarketGet(
"/v5/market/kline",
{
category:
"linear",
symbol:
sym,
interval,
limit:
String(
capped
)
}
);

if(
!result.ok
){
return result;
}

const rows =
result.data?.result?.list;

if(
!Array.isArray(
rows
)
){
return {
ok:
false,
message:
"kline list missing"
};
}

const candles =
rows.map(
raw=>({
time:
Number(
raw[
0
]
) /
1000,
open:
Number(
raw[
1
]
),
high:
Number(
raw[
2
]
),
low:
Number(
raw[
3
]
),
close:
Number(
raw[
4
]
)
})
).filter(
c=>
Number.isFinite(
c.close
)
);

candles.sort(
(
a,
b
)=>
a.time -
b.time
);

return {
ok:
true,
candles
};

}

function sleep(
ms
){

return new Promise(
resolve=>{
setTimeout(
resolve,
Math.max(
0,
Number(
ms
) ||
0
)
);
}
);

}

async function fetchKlineHistoryDeep(
symbol,
tf,
requests =
5,
batchGapMs =
80
){

const sym =
stripSymbolSuffix(
symbol
);

if(
!sym
){
return {
ok:
false,
message:
"symbol required"
};
}

const tfNorm =
String(
tf ||
"5"
).trim();
const aliases =
{
"1m":
"1",
"5m":
"5",
"15m":
"15",
"1h":
"60",
"4h":
"240",
"1d":
"D",
"1w":
"W"
};
const interval =
aliases[
tfNorm.toLowerCase()
] ||
tfNorm;
const batchCount =
Math.min(
10,
Math.max(
1,
Math.round(
Number(
requests
) ||
5
)
)
);

let end =
Date.now();
const rows =
[];
let failedBatches =
0;

for(
let i =
0;
i <
batchCount;
i++
){

const result =
await publicMarketGet(
"/v5/market/kline",
{
category:
"linear",
symbol:
sym,
interval,
limit:
"1000",
end:
String(
end
)
}
);

if(
!result?.ok
){
failedBatches++;

if(
failedBatches >=
2 &&
!rows.length
){
return result;
}

if(
!rows.length
){
return {
ok:
false,
message:
result?.message ||
"kline batch failed"
};
}

break;
}

const batch =
result.data?.result?.list;

if(
!Array.isArray(
batch
) ||
!batch.length
){
break;
}

failedBatches =
0;
rows.push(
...batch
);

const oldest =
Math.min(
...batch.map(
raw=>
Number(
raw[
0
]
)
).filter(
Number.isFinite
)
);

if(
!Number.isFinite(
oldest
)
){
break;
}

end =
oldest -
1;

if(
i <
batchCount -
1 &&
batchGapMs >
0
){
await sleep(
batchGapMs
);
}

}

if(
!rows.length
){
return {
ok:
false,
message:
"kline list empty"
};
}

const unique =
new Map();

for(
const raw of rows
){

const time =
Number(
raw[
0
]
) /
1000;
const close =
Number(
raw[
4
]
);

if(
!Number.isFinite(
time
) ||
!Number.isFinite(
close
)
){
continue;
}

unique.set(
time,
{
time,
open:
Number(
raw[
1
]
),
high:
Number(
raw[
2
]
),
low:
Number(
raw[
3
]
),
close
}
);

}

const candles =
[
...unique.values()
].sort(
(
a,
b
)=>
a.time -
b.time
);

return {
ok:
true,
candles
};

}


async function listLinearUsdtSymbols(){

const symbols =
[];
let cursor =
"";

for(
let page =
0;
page <
40;
page++
){

const query =
{
category:
"linear",
limit:
"1000",
status:
"Trading"
};

if(
cursor
){
query.cursor =
cursor;
}

const result =
await publicMarketGet(
"/v5/market/instruments-info",
query
);

if(
!result.ok
){

if(
symbols.length
){
break;
}

return result;

}

const list =
result.data?.result?.list;

if(
Array.isArray(
list
)
){

for(
const row of list
){

const sym =
String(
row?.symbol ||
""
).trim();
const quote =
String(
row?.quoteCoin ||
""
).toUpperCase();
const settle =
String(
row?.settleCoin ||
""
).toUpperCase();
const contractType =
String(
row?.contractType ||
""
);

if(
!sym ||
quote !==
"USDT" ||
(
settle &&
settle !==
"USDT"
)
){
continue;
}

if(
contractType &&
contractType !==
"LinearPerpetual"
){
continue;
}

symbols.push(
sym
);

}

}

const next =
result.data?.result?.nextPageCursor;

if(
!next ||
next ===
cursor
){
break;
}

cursor =
next;

}

return {
ok:
true,
symbols:
[
...new Set(
symbols
)
].sort()
};

}

module.exports =
{
fetchKlineHistory,
fetchKlineHistoryDeep,
listLinearUsdtSymbols,
getWalletBalance,
fetchPositionListRaw,
getPositions,
getOpenOrders,
getPosition,
closePositionAtMarket,
openPositionAtMarket,
cancelPositionStop,
setPositionStop,
placeTradeOrder,
cancelTradeOrder,
amendTradeOrder,
getTickerPrices,
reconcileOrdersOnPositionOpen,
reconcileOrdersOnPositionClose,
pingBybit,
pingExchange,
getClosedPnlHistory,
getTradeDiaryDetail,
getSymbolExecutionHistory,
inferOpenTimeMs,
matchTradeExecutions,
mapClosedPnlRow,
EXEC_HISTORY_MAX_LOOKBACK_MS,
mapPositionRow,
mapOrderRow,
getInstrumentRules,
formatQtyValue,
getSymbolPositionSettings,
applySymbolPositionSettings
};
