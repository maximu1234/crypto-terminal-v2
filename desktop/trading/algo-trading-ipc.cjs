/**
 * IPC for algo trading profile + runtime + positions/orders stream.
 * Isolated from trading:* Terminal IPC.
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
normalizeExchangeId,
saveAlgoCredentials,
clearAlgoCredentials,
getAlgoCredentialsStatus
} =
require(
"./algo-exchange-credentials.cjs"
);
const {
getAlgoRuntimeStatus,
setAlgoTradingRuntimeEnabled,
bootAlgoTradingRuntimeIfEnabled,
readPrefs,
setAlgoTradingMode,
getAlgoTradingMode
} =
require(
"./algo-trading-runtime.cjs"
);
const algoRest =
require(
"./algo-bybit-rest.cjs"
);
const {
setAlgoTradingStreamTarget,
startAlgoTradingStream,
stopAlgoTradingStream,
seedAlgoTradingStream,
replayAlgoTradingStream,
getAlgoTradingSnapshot,
removeStreamOrder,
removeStreamPosition,
upsertStreamPosition
} =
require(
"./algo-bybit-trading-stream.cjs"
);
const algoBot =
require(
"./algo-trading-bot.cjs"
);

let registered =
false;

/** @type {(() => import('electron').WebContents | null) | null} */
let getMainWebContents =
null;

function ensureAlgoStream(){

const status =
getAlgoCredentialsStatus(
"bybit"
);

if(
!status?.configured
){
return {
ok:
false,
message:
"API keys not configured"
};
}

const wc =
typeof getMainWebContents ===
"function"
? getMainWebContents()
: null;

if(
wc &&
!wc.isDestroyed?.()
){
setAlgoTradingStreamTarget(
wc
);
algoBot.setBotStatusTarget(
wc
);
}

startAlgoTradingStream();

return {
ok:
true
};

}

/**
 * @param {{ getMainWebContents?: () => import('electron').WebContents | null }} [opts]
 */
function registerAlgoTradingIpc(
opts =
{}
){

if(
registered
){
return;
}

registered =
true;

if(
typeof opts.getMainWebContents ===
"function"
){
getMainWebContents =
opts.getMainWebContents;
}

const {
handleTrustedDesktopUi
} =
require(
"./desktop-ui-gate.cjs"
);

handleTrustedDesktopUi(
ipcMain,
"desktop:algoTradingGetStatus",
()=>{

try{
return getAlgoRuntimeStatus();
}catch(
err
){
log.warn(
"algoTradingGetStatus:",
err?.message ||
err
);
return {
ok:
false,
message:
err?.message ||
String(
err
)
};
}

}
);

handleTrustedDesktopUi(
ipcMain,

"desktop:algoTradingSetEnabled",
(
_event,
payload
)=>{

try{
const enabled =
!!payload?.enabled;
const exchangeId =
normalizeExchangeId(
payload?.exchangeId ||
readPrefs().exchangeId
);

const result =
setAlgoTradingRuntimeEnabled(
enabled,
{
exchangeId
}
);

if(
enabled &&
result?.state ===
"running" &&
result?.tradingMode !==
"manual"
){
ensureAlgoStream();
}

if(
!enabled
){
/* UI stream can stay if page still open; page bridge re-ensures. */
}

return result;
}catch(
err
){
log.warn(
"algoTradingSetEnabled:",
err?.message ||
err
);
return {
ok:
false,
message:
err?.message ||
String(
err
)
};
}

}
);

handleTrustedDesktopUi(
ipcMain,

"desktop:algoTradingSetTradingMode",
(
_event,
payload
)=>{

try{
const botStatus =
algoBot.getBotStatus();

if(
botStatus?.running
){
return {
ok:
false,
message:
"Остановите бота, чтобы сменить режим",
tradingMode:
getAlgoTradingMode()
};
}

const prefs =
setAlgoTradingMode(
payload?.tradingMode
);

return {
ok:
true,
...getAlgoRuntimeStatus(),
tradingMode:
prefs.tradingMode
};
}catch(
err
){
log.warn(
"algoTradingSetTradingMode:",
err?.message ||
err
);
return {
ok:
false,
message:
err?.message ||
String(
err
)
};
}

}
);

handleTrustedDesktopUi(
ipcMain,

"desktop:algoTradingGetKeysStatus",
(
_event,
payload
)=>{

try{
const exchangeId =
normalizeExchangeId(
payload?.exchangeId ||
readPrefs().exchangeId
);

return {
ok:
true,
...getAlgoCredentialsStatus(
exchangeId,
{
revealApiKey:
!!payload?.revealApiKey
}
)
};
}catch(
err
){
return {
ok:
false,
message:
err?.message ||
String(
err
)
};
}

}
);

handleTrustedDesktopUi(
ipcMain,

"desktop:algoTradingSaveKeys",
(
_event,
payload
)=>{

try{
const exchangeId =
normalizeExchangeId(
payload?.exchangeId ||
"bybit"
);

saveAlgoCredentials(
exchangeId,
{
apiKey:
payload?.apiKey,
apiSecret:
payload?.apiSecret,
testnet:
!!payload?.testnet
}
);

const running =
readPrefs().enabled;

if(
running
){
setAlgoTradingRuntimeEnabled(
true,
{
exchangeId
}
);
}

ensureAlgoStream();

return {
ok:
true,
...getAlgoCredentialsStatus(
exchangeId
)
};
}catch(
err
){
log.warn(
"algoTradingSaveKeys:",
err?.message ||
err
);
return {
ok:
false,
message:
err?.message ||
String(
err
)
};
}

}
);

handleTrustedDesktopUi(
ipcMain,

"desktop:algoTradingClearKeys",
(
_event,
payload
)=>{

try{
const exchangeId =
normalizeExchangeId(
payload?.exchangeId ||
readPrefs().exchangeId
);

clearAlgoCredentials(
exchangeId
);
setAlgoTradingRuntimeEnabled(
false,
{
exchangeId
}
);
stopAlgoTradingStream();

return {
ok:
true,
...getAlgoCredentialsStatus(
exchangeId
)
};
}catch(
err
){
return {
ok:
false,
message:
err?.message ||
String(
err
)
};
}

}
);

handleTrustedDesktopUi(
ipcMain,

"desktop:algoTradingGetPositions",
async()=>{

try{
return await algoRest.getPositions();
}catch(
err
){
log.warn(
"algoTradingGetPositions:",
err?.message ||
err
);
return {
ok:
false,
message:
err?.message ||
String(
err
)
};
}

}
);

handleTrustedDesktopUi(
ipcMain,

"desktop:algoTradingGetOpenOrders",
async(
_event,
payload
)=>{

try{
return await algoRest.getOpenOrders(
payload ||
{}
);
}catch(
err
){
log.warn(
"algoTradingGetOpenOrders:",
err?.message ||
err
);
return {
ok:
false,
message:
err?.message ||
String(
err
)
};
}

}
);

handleTrustedDesktopUi(
ipcMain,

"desktop:algoTradingGetPosition",
async(
_event,
payload
)=>{

try{
return await algoRest.getPosition(
payload?.symbol
);
}catch(
err
){
return {
ok:
false,
message:
err?.message ||
String(
err
)
};
}

}
);

handleTrustedDesktopUi(
ipcMain,

"desktop:algoTradingClosePosition",
async(
_event,
payload
)=>{

try{
const result =
await algoRest.closePositionAtMarket(
payload?.symbol
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
"algoTradingClosePosition:",
err?.message ||
err
);
return {
ok:
false,
message:
err?.message ||
String(
err
)
};
}

}
);

handleTrustedDesktopUi(
ipcMain,

"desktop:algoTradingSetPositionStop",
async(
_event,
payload
)=>{

try{
const result =
await algoRest.setPositionStop(
payload?.symbol,
payload?.target,
payload?.price
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
"algoTradingSetPositionStop:",
err?.message ||
err
);
return {
ok:
false,
message:
err?.message ||
String(
err
)
};
}

}
);

handleTrustedDesktopUi(
ipcMain,

"desktop:algoTradingCancelPositionStop",
async(
_event,
payload
)=>{

try{
const result =
await algoRest.cancelPositionStop(
payload?.symbol,
payload?.target
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
return {
ok:
false,
message:
err?.message ||
String(
err
)
};
}

}
);

handleTrustedDesktopUi(
ipcMain,

"desktop:algoTradingAmendOrder",
async(
_event,
payload
)=>{

try{
return await algoRest.amendTradeOrder(
payload ||
{}
);
}catch(
err
){
log.warn(
"algoTradingAmendOrder:",
err?.message ||
err
);
return {
ok:
false,
message:
err?.message ||
String(
err
)
};
}

}
);

handleTrustedDesktopUi(
ipcMain,

"desktop:algoTradingCancelOrder",
async(
_event,
payload
)=>{

try{
const result =
await algoRest.cancelTradeOrder(
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
return {
ok:
false,
message:
err?.message ||
String(
err
)
};
}

}
);

handleTrustedDesktopUi(
ipcMain,

"desktop:algoTradingGetStreamSnapshot",
()=>{

try{
return getAlgoTradingSnapshot();
}catch(
err
){
return {
ok:
false,
message:
err?.message ||
String(
err
)
};
}

}
);

handleTrustedDesktopUi(
ipcMain,

"desktop:algoTradingReplayStream",
()=>{

try{
replayAlgoTradingStream();
return {
ok:
true
};
}catch(
err
){
return {
ok:
false,
message:
err?.message ||
String(
err
)
};
}

}
);

handleTrustedDesktopUi(
ipcMain,

"desktop:algoTradingRequestStreamSeed",
()=>{

try{
ensureAlgoStream();
void seedAlgoTradingStream();
return {
ok:
true
};
}catch(
err
){
return {
ok:
false,
message:
err?.message ||
String(
err
)
};
}

}
);

handleTrustedDesktopUi(
ipcMain,

"desktop:algoTradingEnsureStream",
()=>{

try{
return ensureAlgoStream();
}catch(
err
){
return {
ok:
false,
message:
err?.message ||
String(
err
)
};
}

}
);

handleTrustedDesktopUi(
ipcMain,

"desktop:algoTradingSyncBotStrategies",
(
_event,
payload
)=>{

try{
return algoBot.syncBotStrategies(
payload ||
{}
);
}catch(
err
){
log.warn(
"algoTradingSyncBotStrategies:",
err?.message ||
err
);
return {
ok:
false,
message:
err?.message ||
String(
err
)
};
}

}
);

handleTrustedDesktopUi(
ipcMain,

"desktop:algoTradingSyncTickerFlags",
(
_event,
payload
)=>{

try{
return algoBot.syncTickerFlags(
payload ||
{}
);
}catch(
err
){
log.warn(
"algoTradingSyncTickerFlags:",
err?.message ||
err
);
return {
ok:
false,
message:
err?.message ||
String(
err
)
};
}

}
);

handleTrustedDesktopUi(
ipcMain,

"desktop:algoTradingGetTickerFlagsRoot",
()=>{

try{
return algoBot.getTickerFlagsRoot();
}catch(
err
){
log.warn(
"algoTradingGetTickerFlagsRoot:",
err?.message ||
err
);
return {
ok:
false,
message:
err?.message ||
String(
err
)
};
}

}
);

handleTrustedDesktopUi(
ipcMain,

"desktop:algoTradingStartBot",
async(
_event,
payload
)=>{

try{
const strategyId =
String(
payload?.strategyId ||
"st1"
).trim().toLowerCase() ||
"st1";
const manualSt1 =
getAlgoTradingMode() ===
"manual" &&
strategyId ===
"st1";
const stream =
getAlgoTradingMode() ===
"manual"
? {
ok:
true,
skipped:
manualSt1
}
: ensureAlgoStream();

if(
!stream?.ok
){
return stream;
}

return await algoBot.startBot(
payload ||
{}
);
}catch(
err
){
log.warn(
"algoTradingStartBot:",
err?.message ||
err
);
return {
ok:
false,
message:
err?.message ||
String(
err
)
};
}

}
);

handleTrustedDesktopUi(
ipcMain,

"desktop:algoTradingStopBot",
async(
_event,
payload
)=>{

try{
return await algoBot.stopBot(
payload ||
{}
);
}catch(
err
){
log.warn(
"algoTradingStopBot:",
err?.message ||
err
);
return {
ok:
false,
message:
err?.message ||
String(
err
)
};
}

}
);

handleTrustedDesktopUi(
ipcMain,

"desktop:algoTradingGetBotStatus",
()=>{

try{
return algoBot.getBotStatus();
}catch(
err
){
log.warn(
"algoTradingGetBotStatus:",
err?.message ||
err
);
return {
ok:
false,
message:
err?.message ||
String(
err
)
};
}

}
);

handleTrustedDesktopUi(
ipcMain,

"desktop:algoTradingDisarmArmedSetup",
async(
_event,
payload
)=>{

try{
return await algoBot.disarmArmedSetup(
payload ||
{}
);
}catch(
err
){
log.warn(
"algoTradingDisarmArmedSetup:",
err?.message ||
err
);
return {
ok:
false,
message:
err?.message ||
String(
err
)
};
}

}
);

handleTrustedDesktopUi(
ipcMain,

"desktop:algoTradingGetWalletBalance",
async()=>{

try{
return await algoBot.getWalletBalance();
}catch(
err
){
log.warn(
"algoTradingGetWalletBalance:",
err?.message ||
err
);
return {
ok:
false,
message:
err?.message ||
String(
err
)
};
}

}
);

}

module.exports =
{
registerAlgoTradingIpc,
bootAlgoTradingRuntimeIfEnabled,
bootAlgoBotIfWasRunning:()=>
algoBot.bootAlgoBotIfWasRunning(),
ensureAlgoStream,
setAlgoTradingStreamTarget,
stopAlgoTradingStream
};
