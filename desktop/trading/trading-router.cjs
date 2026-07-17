/**
 * Route trading IPC to active exchange adapter (Bybit / BingX).
 */
const {
normalizeExchangeId,
getStatus,
saveCredentials,
clearCredentials
} =
require(
"./exchange-credentials.cjs"
);

const bybit =
require(
"./bybit-rest.cjs"
);
const bingx =
require(
"./bingx-rest.cjs"
);

let activeExchangeId =
"bybit";

function setActiveExchange(
exchangeId
){

activeExchangeId =
normalizeExchangeId(
exchangeId
);
return activeExchangeId;

}

function getActiveExchange(){

return activeExchangeId;

}

function getAdapter(
exchangeId
){

const id =
normalizeExchangeId(
exchangeId ||
activeExchangeId
);

return id ===
"bingx"
? bingx
: bybit;

}

function resolveExchangeId(
payload
){

if(
payload?.exchangeId
){
return normalizeExchangeId(
payload.exchangeId
);
}

return activeExchangeId;

}

function getStatusFor(
payload
){

return getStatus(
resolveExchangeId(
payload
)
);

}

function saveCredentialsFor(
payload
){

const exchangeId =
resolveExchangeId(
payload
);
saveCredentials(
exchangeId,
payload ||
{}
);
return getStatus(
exchangeId
);

}

function clearCredentialsFor(
payload
){

const exchangeId =
resolveExchangeId(
payload
);
clearCredentials(
exchangeId
);
return getStatus(
exchangeId
);

}

async function getWalletBalance(
payload
){

return getAdapter(
payload?.exchangeId
).getWalletBalance();
}

async function getPositions(
payload
){

return getAdapter(
payload?.exchangeId
).getPositions();
}

async function getOpenOrders(
payload
){

return getAdapter(
payload?.exchangeId
).getOpenOrders(
payload
);
}

async function getPosition(
payload
){

return getAdapter(
payload?.exchangeId
).getPosition(
payload?.symbol,
payload ||
{}
);
}

async function closePositionAtMarket(
payload
){

return getAdapter(
payload?.exchangeId
).closePositionAtMarket(
payload?.symbol,
payload ||
{}
);
}

async function openPositionAtMarket(
payload
){

return getAdapter(
payload?.exchangeId
).openPositionAtMarket(
payload?.symbol,
payload?.side,
payload?.volumeUsdt,
payload
);
}

async function attachAutoStopsAfterOpen(
payload
){

const adapter =
getAdapter(
payload?.exchangeId
);

if(
typeof adapter.attachAutoStopsAfterOpen !==
"function"
){
return {
position:
payload?.position ||
null,
stopsAttached:{
sl:
false,
tp:
false
}
};
}

return adapter.attachAutoStopsAfterOpen(
payload?.position,
payload ||
{}
);
}

async function cancelPositionStop(
payload
){

return getAdapter(
payload?.exchangeId
).cancelPositionStop(
payload?.symbol,
payload?.target,
payload ||
{}
);
}

async function setPositionStop(
payload
){

return getAdapter(
payload?.exchangeId
).setPositionStop(
payload?.symbol,
payload?.target,
payload?.price,
payload ||
{}
);
}

async function placeTradeOrder(
payload
){

return getAdapter(
payload?.exchangeId
).placeTradeOrder(
payload ||
{}
);
}

async function cancelTradeOrder(
payload
){

return getAdapter(
payload?.exchangeId
).cancelTradeOrder(
payload?.symbol,
payload?.orderId
);
}

async function amendTradeOrder(
payload
){

return getAdapter(
payload?.exchangeId
).amendTradeOrder(
payload ||
{}
);
}

async function reconcileOrdersOnPositionOpen(
payload
){

return getAdapter(
payload?.exchangeId
).reconcileOrdersOnPositionOpen(
payload?.symbol,
payload?.positionSide
);
}

async function reconcileOrdersOnPositionClose(
payload
){

return getAdapter(
payload?.exchangeId
).reconcileOrdersOnPositionClose(
payload?.symbol
);
}

async function pingBybit(
payload
){

return getAdapter(
payload?.exchangeId
).pingBybit(
payload ||
{}
);
}

async function pingExchange(
payload
){

const adapter =
getAdapter(
payload?.exchangeId
);

if(
typeof adapter.pingExchange ===
"function"
){
return adapter.pingExchange(
payload ||
{}
);
}

return adapter.pingBybit(
payload ||
{}
);
}

async function getClosedPnlHistory(
payload
){

return getAdapter(
payload?.exchangeId
).getClosedPnlHistory(
payload ||
{}
);
}

async function enrichClosedPnlTrades(
payload
){

const adapter =
getAdapter(
payload?.exchangeId
);
const fn =
adapter.enrichClosedPnlTrades;

if(
typeof fn !==
"function"
){
return {
ok:
false,
message:
"Обогащение сделок недоступно для этой биржи"
};
}

return fn(
payload ||
{}
);
}

async function getTradeDiaryDetail(
payload
){

return getAdapter(
payload?.exchangeId
).getTradeDiaryDetail(
payload ||
{}
);
}

async function getSymbolExecutionHistory(
payload
){

const adapter =
getAdapter(
payload?.exchangeId
);
const fn =
adapter.getSymbolExecutionHistory;

if(
typeof fn !==
"function"
){
return {
ok:
false,
message:
"История исполнений недоступна для этой биржи"
};
}

return fn(
payload ||
{}
);
}

async function getSymbolPositionSettings(
payload
){

return getAdapter(
payload?.exchangeId
).getSymbolPositionSettings(
payload?.symbol
);
}

async function applySymbolPositionSettings(
payload
){

return getAdapter(
payload?.exchangeId
).applySymbolPositionSettings(
payload?.symbol,
{
leverage:
payload?.leverage,
marginMode:
payload?.marginMode
}
);
}

function getStreamModules(
exchangeId
){

const id =
normalizeExchangeId(
exchangeId ||
activeExchangeId
);

if(
id ===
"bingx"
){
return {
exchangeId:
"bingx",
getStatus:()=>
getStatus(
"bingx"
),
fetchPositionListRaw:
bingx.fetchPositionListRaw,
getOpenOrders:
bingx.getOpenOrders,
mapPositionRow:
bingx.mapPositionRow,
mapOrderRow:
bingx.mapOrderRow,
getRateLimitBackoffMs:
bingx.getRateLimitBackoffMs,
fetchOpenOrderRows:
bingx.fetchOpenOrderRows,
fetchOpenOrderRowsCached:
bingx.fetchOpenOrderRowsCached,
getCachedOpenOrderRows:
bingx.getCachedOpenOrderRows,
invalidateOpenOrderRowsCache:
bingx.invalidateOpenOrderRowsCache,
invalidatePositionListCache:
bingx.invalidatePositionListCache,
enrichPositionsWithStopOrders:
bingx.enrichPositionsWithStopOrders,
connectPrivateWs:
require(
"./bingx-private-ws.cjs"
).connectBingxPrivateWs
};
}

return {
exchangeId:
"bybit",
getStatus:()=>
getStatus(
"bybit"
),
fetchPositionListRaw:
bybit.fetchPositionListRaw,
getOpenOrders:
bybit.getOpenOrders,
mapPositionRow:
bybit.mapPositionRow,
mapOrderRow:
bybit.mapOrderRow,
getRateLimitBackoffMs:()=>
0,
connectPrivateWs:
require(
"./bybit-private-ws.cjs"
).connectBybitPrivateWs
};

}

function getRateLimitBackoffMs(){

const fn =
getAdapter().getRateLimitBackoffMs;

return typeof fn ===
"function"
? fn()
: 0;

}

module.exports =
{
setActiveExchange,
getActiveExchange,
getAdapter,
getStreamModules,
getStatusFor,
saveCredentialsFor,
clearCredentialsFor,
getWalletBalance,
getPositions,
getOpenOrders,
getPosition,
closePositionAtMarket,
openPositionAtMarket,
attachAutoStopsAfterOpen,
cancelPositionStop,
setPositionStop,
placeTradeOrder,
cancelTradeOrder,
amendTradeOrder,
reconcileOrdersOnPositionOpen,
reconcileOrdersOnPositionClose,
pingBybit,
pingExchange,
getClosedPnlHistory,
enrichClosedPnlTrades,
getSymbolExecutionHistory,
getTradeDiaryDetail,
getSymbolPositionSettings,
applySymbolPositionSettings,
getRateLimitBackoffMs
};
