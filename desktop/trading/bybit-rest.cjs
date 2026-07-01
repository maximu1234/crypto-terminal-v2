/**
 * Bybit REST v5 — signed requests from main process only.
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
getCredentials
} =
require(
"./credentials.cjs"
);

const RECV_WINDOW =
"5000";

const REQUEST_TIMEOUT_MS =
12000;

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
query
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

const params =
new URLSearchParams(
query
);
const queryString =
params.toString();
const timestamp =
String(
Date.now()
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
const exitKeys =
new Set(
exits.map(
executionKey
)
);
const lookbackMs =
wide
? 24 *
60 *
60 *
1000
: Math.max(
closeMs -
openMs +
60000,
5 *
60 *
1000
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

let need =
targetQty;
const entries =
[];

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

entries.push(
ex
);
need -=
ex.execQty;

}

entries.reverse();

return entries;

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

const lookbackMs =
90 *
24 *
60 *
60 *
1000;

const symExecs =
executions
.filter(
ex=>
ex.symbol ===
symbol &&
ex.execTimeMs <=
closeMs &&
ex.execTimeMs >=
closeMs -
lookbackMs
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
let openMs =
null;

for(
const ex of
symExecs
){

if(
ex.side !==
openSide
){
continue;
}

if(
ex.execQty <=
0
){
continue;
}

openMs =
ex.execTimeMs;
need -=
ex.execQty;

if(
need <=
1e-8
){
break;
}

}

return openMs;

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
Math.min(
openMs,
closeMs
) -
24 *
60 *
60 *
1000
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
24 *
60 *
60 *
1000
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
await getExecutionHistory({
startTime:
Math.max(
0,
openTimeMs -
24 *
60 *
60 *
1000
),
endTime:
closeTimeMs +
60 *
1000
});

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

return {
ok:
true,
...matched
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
endMs
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
endMs
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
chunk.endMs
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

async function fetchClosedPnlPaged(
startTime,
endTime,
executions
){

const trades =
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

if(
cursor
){
query.cursor =
cursor;
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

async function getClosedPnlHistory(
options =
{}
){

const startTime =
options.startTime;
const endTime =
options.endTime;

const execLookbackMs =
30 *
24 *
60 *
60 *
1000;
let execResult;

if(
startTime !=
null
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
: Date.now()
);

}else{

execResult =
await getExecutionHistory({
endTime
});

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
executions
);

}

const merged =
[];
const seen =
new Set();

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
executions
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

if(
isReduceOnly
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
? "BST"
: "SST";
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
? "BLT"
: "SLT";
orderKind =
"limit";
}else{
return null;
}

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
orderKind,
badgeSide:
side ===
"Buy"
? "long"
: "short",
qty:
Number.isFinite(
qty
)
? qty
: 0,
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
maxLeverage:
rules.maxLeverage,
minLeverage:
rules.minLeverage
};
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
!Number.isFinite(
volumeUsdt
) ||
volumeUsdt <=
0
){
return {
ok:
false,
message:
"Invalid volume"
};
}

const qtyStr =
qtyFromVolumeUsdt(
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
body
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

const bodyStr =
JSON.stringify(
body ||
{}
);
const timestamp =
String(
Date.now()
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
)
};

}

async function openPositionAtMarket(
symbol,
side,
volumeUsdt
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

module.exports =
{
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
pingBybit,
getClosedPnlHistory,
getTradeDiaryDetail,
mapPositionRow,
mapOrderRow,
getSymbolPositionSettings,
applySymbolPositionSettings
};
