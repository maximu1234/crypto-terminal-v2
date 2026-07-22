/**
 * IPC: trading:* — credentials (фаза 1).
 */
const {
ipcMain
} =
require(
"electron"
);
const log =
require(
"electron-log"
);
const {
getStatusFor,
saveCredentialsFor,
clearCredentialsFor,
setActiveExchange,
getActiveExchange,
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
getClosedPnlHistory,
enrichClosedPnlTrades,
getTradeDiaryDetail,
getSymbolExecutionHistory,
getSymbolPositionSettings,
applySymbolPositionSettings,
getRateLimitBackoffMs
} =
require(
"./trading-router.cjs"
);
const {
setTradingStreamTarget,
startTradingStream,
stopTradingStream,
replayTradingStream,
seedFromRest,
getTradingSnapshot,
requestStreamSeed,
removeStreamOrder,
removeStreamPosition,
upsertStreamPosition
} =
require(
"./trading-stream.cjs"
);

const {
generatePnlShareCard,
savePnlShareCard,
discardPnlShareCard
} =
require(
"./pnl-share-card.cjs"
);
const {
handleTrustedDesktopUi
} =
require(
"./desktop-ui-gate.cjs"
);

function registerTradingIpc(){

handleTrustedDesktopUi(
ipcMain,
"trading:setActiveExchange",
(
_event,
payload
)=>{

const prevId =
getActiveExchange();
const exchangeId =
setActiveExchange(
payload?.exchangeId
);

try{

if(
prevId !==
exchangeId
){
stopTradingStream();
startTradingStream();
}else{
startTradingStream();
}

}catch(
err
){
log.warn(
"trading:setActiveExchange stream:",
err.message
);
}

return {
ok:
true,
exchangeId,
...getStatusFor({
exchangeId
})
};

}
);

handleTrustedDesktopUi(
ipcMain,

"trading:getStatus",
(
_event,
payload
)=>{
return getStatusFor(
payload ||
{}
);
}
);

handleTrustedDesktopUi(
ipcMain,

"trading:getRateLimitBackoffMs",
()=>{
return getRateLimitBackoffMs();
}
);

handleTrustedDesktopUi(
ipcMain,

"trading:saveKeys",
(
_event,
payload
)=>{

try{
const exchangeId =
payload?.exchangeId;

if(
exchangeId
){
setActiveExchange(
exchangeId
);
}

const status =
saveCredentialsFor(
payload ||
{}
);

try{
startTradingStream();
}catch(
streamErr
){
log.warn(
"trading:saveKeys stream:",
streamErr.message
);
return {
ok:
true,
streamWarning:
true,
message:
"Ключи сохранены. Поток позиций подключится после перезапуска приложения.",
...status
};
}

return {
ok:
true,
...status
};
}catch(
err
){
log.warn(
"trading:saveKeys:",
err.message
);
return {
ok:
false,
message:
err.message
};
}

}
);

handleTrustedDesktopUi(
ipcMain,

"trading:clearKeys",
(
_event,
payload
)=>{

try{
const status =
clearCredentialsFor(
payload ||
{}
);
stopTradingStream();
return {
ok:
true,
...status
};
}catch(
err
){
log.warn(
"trading:clearKeys:",
err.message
);
return {
ok:
false,
message:
err.message
};
}

}
);

handleTrustedDesktopUi(
ipcMain,

"trading:getWalletBalance",
async(
_event,
payload
)=>{

try{
return await getWalletBalance(
payload ||
{}
);
}catch(
err
){
log.warn(
"trading:getWalletBalance:",
err.message
);
return {
ok:
false,
message:
err.message
};
}

}
);

handleTrustedDesktopUi(
ipcMain,

"trading:getPositions",
async(
_event,
payload
)=>{

try{
return await getPositions(
payload ||
{}
);
}catch(
err
){
log.warn(
"trading:getPositions:",
err.message
);
return {
ok:
false,
message:
err.message
};
}

}
);

handleTrustedDesktopUi(
ipcMain,

"trading:getOpenOrders",
async(
_event,
payload
)=>{

try{
return await getOpenOrders(
payload ||
{}
);
}catch(
err
){
log.warn(
"trading:getOpenOrders:",
err.message
);
return {
ok:
false,
message:
err.message
};
}

}
);

handleTrustedDesktopUi(
ipcMain,

"trading:closePosition",
async(
_event,
payload
)=>{

try{
const result =
await closePositionAtMarket(
payload ||
{}
);

if(
result?.ok !==
false &&
payload?.symbol
){
removeStreamPosition(
payload.symbol,
payload
);
}

return result;
}catch(
err
){
log.warn(
"trading:closePosition:",
err.message
);
return {
ok:
false,
message:
err.message
};
}

}
);

handleTrustedDesktopUi(
ipcMain,

"trading:getPosition",
async(
_event,
payload
)=>{

try{
return await getPosition(
payload ||
{}
);
}catch(
err
){
log.warn(
"trading:getPosition:",
err.message
);
return {
ok:
false,
message:
err.message
};
}

}
);

handleTrustedDesktopUi(
ipcMain,

"trading:cancelPositionStop",
async(
_event,
payload
)=>{

try{
const result =
await cancelPositionStop(
payload ||
{}
);

if(
result?.ok !==
false
){
const sym =
payload?.symbol;
const tgt =
String(
payload?.target ||
""
).toLowerCase();
const pos =
payload?.position ||
result?.position;

if(
sym &&
pos
){
const next =
{
...pos
};

if(
tgt ===
"sl" ||
tgt ===
"stopLoss" ||
tgt ===
"all" ||
tgt ===
"both"
){
next.stopLoss =
0;
delete next.slOrderId;
}

if(
tgt ===
"tp" ||
tgt ===
"takeProfit" ||
tgt ===
"all" ||
tgt ===
"both"
){
next.takeProfit =
0;
delete next.tpOrderId;
}

next._stopsAuthoritative =
true;
upsertStreamPosition(
next
);
}

}

return result;
}catch(
err
){
log.warn(
"trading:cancelPositionStop:",
err.message
);
return {
ok:
false,
message:
err.message
};
}

}
);

handleTrustedDesktopUi(
ipcMain,

"trading:setPositionStop",
async(
_event,
payload
)=>{

try{
const result =
await setPositionStop(
payload ||
{}
);

if(
result?.ok !==
false &&
result?.position
){
upsertStreamPosition(
result.position
);
}

return result;
}catch(
err
){
log.warn(
"trading:setPositionStop:",
err.message
);
return {
ok:
false,
message:
err.message
};
}

}
);

handleTrustedDesktopUi(
ipcMain,

"trading:placeOrder",
async(
_event,
payload
)=>{

try{
return await placeTradeOrder(
payload ||
{}
);
}catch(
err
){
log.warn(
"trading:placeOrder:",
err.message
);
return {
ok:
false,
message:
err.message
};
}

}
);

handleTrustedDesktopUi(
ipcMain,

"trading:amendOrder",
async(
_event,
payload
)=>{

try{
return await amendTradeOrder(
payload ||
{}
);
}catch(
err
){
log.warn(
"trading:amendOrder:",
err.message
);
return {
ok:
false,
message:
err.message
};
}

}
);

handleTrustedDesktopUi(
ipcMain,

"trading:cancelOrder",
async(
_event,
payload
)=>{

try{
const result =
await cancelTradeOrder(
payload ||
{}
);

if(
result?.ok !==
false &&
payload?.orderId
){
removeStreamOrder(
payload.orderId
);
}

return result;
}catch(
err
){
log.warn(
"trading:cancelOrder:",
err.message
);
return {
ok:
false,
message:
err.message
};
}

}
);

handleTrustedDesktopUi(
ipcMain,

"trading:reconcileOrdersOnPositionOpen",
async(
_event,
payload
)=>{

try{
const result =
await reconcileOrdersOnPositionOpen(
payload ||
{}
);

if(
result?.ok !==
false &&
Array.isArray(
result.canceledOrderIds
)
){
for(
const orderId of result.canceledOrderIds
){
removeStreamOrder(
orderId
);
}
}

if(
result?.ok !==
false
){
log.info(
"reconcileOrdersOnPositionOpen:",
payload?.symbol,
result.positionSide,
`canceled=${result.canceled}`,
`converted=${result.converted}`,
`skipped=${result.skipped}`,
result.errors?.length
? `errors=${result.errors.length}`
: ""
);
}

return result;
}catch(
err
){
log.warn(
"trading:reconcileOrdersOnPositionOpen:",
err.message
);
return {
ok:
false,
message:
err.message
};
}

}
);

handleTrustedDesktopUi(
ipcMain,

"trading:reconcileOrdersOnPositionClose",
async(
_event,
payload
)=>{

try{
const result =
await reconcileOrdersOnPositionClose(
payload ||
{}
);

if(
result?.ok !==
false &&
Array.isArray(
result.canceledOrderIds
)
){
for(
const orderId of result.canceledOrderIds
){
removeStreamOrder(
orderId
);
}
}

if(
result?.ok !==
false
){
log.info(
"reconcileOrdersOnPositionClose:",
payload?.symbol,
`canceled=${result.canceled}`,
`skipped=${result.skipped}`,
result.errors?.length
? `errors=${result.errors.length}`
: ""
);
}

return result;
}catch(
err
){
log.warn(
"trading:reconcileOrdersOnPositionClose:",
err.message
);
return {
ok:
false,
message:
err.message
};
}

}
);

handleTrustedDesktopUi(
ipcMain,

"trading:openPosition",
async(
_event,
payload
)=>{

try{
const result =
await openPositionAtMarket(
payload ||
{}
);

if(
result?.ok !==
false &&
result?.position
){
/* Push position immediately so chart + open-sound are not blocked by
 * slow exchange auto SL/TP placement (BingX returns attachPromise). */
upsertStreamPosition(
result.position
);

const attached =
await attachAutoStopsAfterOpen({
...(
payload ||
{}
),
position:
result.position
});

if(
attached?.attachPromise
){
result.stopsAttached =
attached.stopsAttached ||
{
sl:
false,
tp:
false,
pending:
true
};
void attached.attachPromise.then(
(
done
)=>{

if(
!done?.position
){
return;
}

if(
done.stopsAttached?.sl ||
done.stopsAttached?.tp
){
upsertStreamPosition(
done.position
);
}

}
).catch(
(
err
)=>{
log.warn(
"trading:openPosition attachAutoStops:",
err?.message ||
err
);
}
);
}else if(
attached?.position &&
(
attached.stopsAttached?.sl ||
attached.stopsAttached?.tp
)
){
result.position =
attached.position;
result.stopsAttached =
attached.stopsAttached;
upsertStreamPosition(
attached.position
);
}else if(
attached?.stopsAttached
){
result.stopsAttached =
attached.stopsAttached;
}

}

return result;
}catch(
err
){
log.warn(
"trading:openPosition:",
err.message
);
return {
ok:
false,
message:
err.message
};
}

}
);

handleTrustedDesktopUi(
ipcMain,

"trading:pingBybit",
async(
_event,
payload
)=>{

try{
return await pingBybit(
payload ||
{}
);
}catch(
err
){
log.warn(
"trading:pingBybit:",
err.message
);
return {
ok:
false,
message:
err.message
};
}

}
);

handleTrustedDesktopUi(
ipcMain,

"trading:getClosedPnl",
async(
_event,
payload
)=>{

try{
return await getClosedPnlHistory(
payload ||
{}
);
}catch(
err
){
log.warn(
"trading:getClosedPnl:",
err.message
);
return {
ok:
false,
message:
err.message
};
}

}
);

handleTrustedDesktopUi(
ipcMain,

"trading:enrichClosedPnlTrades",
async(
_event,
payload
)=>{

try{
return await enrichClosedPnlTrades(
payload ||
{}
);
}catch(
err
){
log.warn(
"trading:enrichClosedPnlTrades:",
err.message
);
return {
ok:
false,
message:
err.message
};
}

}
);

handleTrustedDesktopUi(
ipcMain,

"trading:getSymbolExecutions",
async(
_event,
payload
)=>{

try{
return await getSymbolExecutionHistory(
payload ||
{}
);
}catch(
err
){
log.warn(
"trading:getSymbolExecutions:",
err.message
);
return {
ok:
false,
message:
err.message
};
}

}
);

handleTrustedDesktopUi(
ipcMain,

"trading:getTradeDiaryDetail",
async(
_event,
payload
)=>{

try{
return await getTradeDiaryDetail(
payload ||
{}
);
}catch(
err
){
log.warn(
"trading:getTradeDiaryDetail:",
err.message
);
return {
ok:
false,
message:
err.message
};
}

}
);

handleTrustedDesktopUi(
ipcMain,

"trading:getSymbolPositionSettings",
async(
_event,
payload
)=>{

try{
return await getSymbolPositionSettings(
payload ||
{}
);
}catch(
err
){
log.warn(
"trading:getSymbolPositionSettings:",
err.message
);
return {
ok:
false,
message:
err.message
};
}

}
);

handleTrustedDesktopUi(
ipcMain,

"trading:applySymbolPositionSettings",
async(
_event,
payload
)=>{

try{
return await applySymbolPositionSettings(
payload ||
{}
);
}catch(
err
){
log.warn(
"trading:applySymbolPositionSettings:",
err.message
);
return {
ok:
false,
message:
err.message
};
}

}
);

handleTrustedDesktopUi(
ipcMain,

"trading:replayStream",
()=>{

try{
replayTradingStream();
return {
ok:
true
};
}catch(
err
){
log.warn(
"trading:replayStream:",
err.message
);
return {
ok:
false,
message:
err.message
};
}

}
);

handleTrustedDesktopUi(
ipcMain,

"trading:getStreamSnapshot",
()=>{

try{
return getTradingSnapshot();
}catch(
err
){
log.warn(
"trading:getStreamSnapshot:",
err.message
);
return {
ok:
false,
message:
err.message
};
}

}
);

handleTrustedDesktopUi(
ipcMain,

"trading:requestStreamSeed",
()=>{

try{
return requestStreamSeed();
}catch(
err
){
log.warn(
"trading:requestStreamSeed:",
err.message
);
return {
ok:
false,
message:
err.message
};
}

}
);

handleTrustedDesktopUi(
ipcMain,

"trading:generatePnlShareCard",
async(
_event,
payload
)=>{

try{
return await generatePnlShareCard(
payload ||
{}
);
}catch(
err
){
log.warn(
"trading:generatePnlShareCard:",
err.message
);
return {
ok:
false,
error:
err.message
};
}

}
);

handleTrustedDesktopUi(
ipcMain,

"trading:savePnlShareCard",
async(
_event,
payload
)=>{

try{
return await savePnlShareCard(
payload?.tempPath,
payload?.defaultName
);
}catch(
err
){
log.warn(
"trading:savePnlShareCard:",
err.message
);
return {
ok:
false,
error:
err.message
};
}

}
);

handleTrustedDesktopUi(
ipcMain,

"trading:discardPnlShareCard",
(
_event,
payload
)=>{

try{
return discardPnlShareCard(
payload?.tempPath
);
}catch(
err
){
log.warn(
"trading:discardPnlShareCard:",
err.message
);
return {
ok:
false,
error:
err.message
};
}

}
);

}

module.exports =
{
registerTradingIpc,
setTradingStreamTarget,
startTradingStream,
stopTradingStream
};
