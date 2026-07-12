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
getStatus,
saveCredentials,
clearCredentials
} =
require(
"./credentials.cjs"
);
const {
getWalletBalance,
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
reconcileOrdersOnPositionOpen,
reconcileOrdersOnPositionClose,
pingBybit,
getClosedPnlHistory,
getTradeDiaryDetail,
getSymbolPositionSettings,
applySymbolPositionSettings
} =
require(
"./bybit-rest.cjs"
);
const {
setTradingStreamTarget,
startTradingStream,
stopTradingStream,
replayTradingStream,
removeStreamOrder,
removeStreamPosition
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

function registerTradingIpc(){

ipcMain.handle(
"trading:getStatus",
()=>{
return getStatus();
}
);

ipcMain.handle(
"trading:saveKeys",
(
_event,
payload
)=>{

try{
saveCredentials(
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
...getStatus()
};
}

return {
ok:
true,
...getStatus()
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

ipcMain.handle(
"trading:clearKeys",
()=>{

try{
clearCredentials();
stopTradingStream();
return {
ok:
true,
...getStatus()
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

ipcMain.handle(
"trading:getWalletBalance",
async()=>{

try{
return await getWalletBalance();
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

ipcMain.handle(
"trading:getPositions",
async()=>{

try{
return await getPositions();
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

ipcMain.handle(
"trading:getOpenOrders",
async()=>{

try{
return await getOpenOrders();
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

ipcMain.handle(
"trading:closePosition",
async(
_event,
payload
)=>{

try{
const result =
await closePositionAtMarket(
payload?.symbol
);

if(
result?.ok !==
false &&
payload?.symbol
){
removeStreamPosition(
payload.symbol
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

ipcMain.handle(
"trading:getPosition",
async(
_event,
payload
)=>{

try{
return await getPosition(
payload?.symbol
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

ipcMain.handle(
"trading:cancelPositionStop",
async(
_event,
payload
)=>{

try{
return await cancelPositionStop(
payload?.symbol,
payload?.target
);
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

ipcMain.handle(
"trading:setPositionStop",
async(
_event,
payload
)=>{

try{
return await setPositionStop(
payload?.symbol,
payload?.target,
payload?.price
);
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

ipcMain.handle(
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

ipcMain.handle(
"trading:cancelOrder",
async(
_event,
payload
)=>{

try{
const result =
await cancelTradeOrder(
payload?.symbol,
payload?.orderId
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

ipcMain.handle(
"trading:reconcileOrdersOnPositionOpen",
async(
_event,
payload
)=>{

try{
const result =
await reconcileOrdersOnPositionOpen(
payload?.symbol,
payload?.positionSide
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

ipcMain.handle(
"trading:reconcileOrdersOnPositionClose",
async(
_event,
payload
)=>{

try{
const result =
await reconcileOrdersOnPositionClose(
payload?.symbol
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

ipcMain.handle(
"trading:openPosition",
async(
_event,
payload
)=>{

try{
return await openPositionAtMarket(
payload?.symbol,
payload?.side,
payload?.volumeUsdt
);
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

ipcMain.handle(
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

ipcMain.handle(
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

ipcMain.handle(
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

ipcMain.handle(
"trading:getSymbolPositionSettings",
async(
_event,
payload
)=>{

try{
return await getSymbolPositionSettings(
payload?.symbol
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

ipcMain.handle(
"trading:applySymbolPositionSettings",
async(
_event,
payload
)=>{

try{
return await applySymbolPositionSettings(
payload?.symbol,
{
leverage:
payload?.leverage,
marginMode:
payload?.marginMode
}
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

ipcMain.handle(
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

ipcMain.handle(
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

ipcMain.handle(
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

ipcMain.handle(
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
