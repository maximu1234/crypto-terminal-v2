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
getAlgoCredentialsStatus,
getAlgoBotLockKey
} =
require(
"./algo-exchange-credentials.cjs"
);
const {
getAlgoRuntimeStatus,
setAlgoTradingRuntimeEnabled,
bootAlgoTradingRuntimeIfEnabled,
stopAlgoTradingRuntime,
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
"desktop:algoTradingListLinearSymbols",
async()=>{

try{
const rest =
require(
"./algo-bybit-rest.cjs"
);

return await rest.listLinearUsdtSymbols();
}catch(
err
){
log.warn(
"algoTradingListLinearSymbols:",
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
"desktop:algoTradingFetchKlineHistory",
async(
_event,
payload
)=>{

try{
const rest =
require(
"./algo-bybit-rest.cjs"
);
const requests =
Number(
payload?.requests
);
const batchGapMs =
Number(
payload?.batchGapMs
);

return await rest.fetchKlineHistoryDeep(
payload?.symbol,
payload?.tf,
Number.isFinite(
requests
) &&
requests >
0
? requests
: 10,
Number.isFinite(
batchGapMs
)
? batchGapMs
: 0
);
}catch(
err
){
log.warn(
"algoTradingFetchKlineHistory:",
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

"desktop:algoTradingGetBotLockKey",
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

return getAlgoBotLockKey(
exchangeId
);
}catch(
err
){
return {
ok:
false,
code:
"error",
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

"desktop:algoTradingSyncTickerBook",
(
_event,
payload
)=>{

try{
return algoBot.syncTickerBook(
payload ||
{}
);
}catch(
err
){
log.warn(
"algoTradingSyncTickerBook:",
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

"desktop:algoTradingGetTickerBook",
(
_event,
payload
)=>{

try{
return algoBot.getTickerBook(
payload ||
{}
);
}catch(
err
){
log.warn(
"algoTradingGetTickerBook:",
err?.message ||
err
);
return {
ok:
false,
book:
null,
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

handleTrustedDesktopUi(
ipcMain,

"desktop:algoTradingGetClosedPnl",
async(
_event,
payload
)=>{

try{
return await algoRest.getClosedPnlHistory(
payload ||
{}
);
}catch(
err
){
log.warn(
"algoTradingGetClosedPnl:",
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

"desktop:algoTradingGetTradeDiaryDetail",
async(
_event,
payload
)=>{

try{
return await algoRest.getTradeDiaryDetail(
payload ||
{}
);
}catch(
err
){
log.warn(
"algoTradingGetTradeDiaryDetail:",
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
"desktop:algoTradingSessionLogServerGet",
()=>{

try{
const sessionLogServer =
require(
"./algo-bot-session-log-server.cjs"
);

return sessionLogServer.getPrefsForUi();
}catch(
err
){
log.warn(
"algoTradingSessionLogServerGet:",
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
"desktop:algoTradingSessionLogServerSet",
async (
_event,
payload
)=>{

try{
const sessionLogServer =
require(
"./algo-bot-session-log-server.cjs"
);

return await sessionLogServer.applyPrefs(
payload ||
{}
);
}catch(
err
){
log.warn(
"algoTradingSessionLogServerSet:",
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
"desktop:algoTradingSessionLogRemoteList",
async (
_event,
payload
)=>{

try{
const {
listRemoteSessionLogs
} =
require(
"./algo-bot-session-log-remote-client.cjs"
);

return await listRemoteSessionLogs(
payload ||
{}
);
}catch(
err
){
log.warn(
"algoTradingSessionLogRemoteList:",
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
"desktop:algoTradingSessionLogRemoteGet",
async (
_event,
payload
)=>{

try{
const {
fetchRemoteSessionLog
} =
require(
"./algo-bot-session-log-remote-client.cjs"
);

return await fetchRemoteSessionLog(
payload ||
{}
);
}catch(
err
){
log.warn(
"algoTradingSessionLogRemoteGet:",
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
"desktop:algoTradingSessionLogRemotePushWatchlists",
async (
_event,
payload
)=>{

try{
const {
pushRemoteWatchlists
} =
require(
"./algo-bot-session-log-remote-client.cjs"
);

return await pushRemoteWatchlists(
payload ||
{}
);
}catch(
err
){
log.warn(
"algoTradingSessionLogRemotePushWatchlists:",
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
"desktop:algoTradingSessionLogRemotePushTickerBook",
async (
_event,
payload
)=>{

try{
const {
pushRemoteTickerBook
} =
require(
"./algo-bot-session-log-remote-client.cjs"
);

return await pushRemoteTickerBook(
payload ||
{}
);
}catch(
err
){
log.warn(
"algoTradingSessionLogRemotePushTickerBook:",
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

"desktop:algoTradingSessionLogRemoteBotStatus",
async(
_event,
payload
)=>{

try{
const {
fetchRemoteBotLanStatus
} =
require(
"./algo-bot-session-log-remote-client.cjs"
);

return await fetchRemoteBotLanStatus(
payload ||
{}
);
}catch(
err
){
log.warn(
"algoTradingSessionLogRemoteBotStatus:",
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

"desktop:algoTradingSessionLogRemoteBotCommand",
async(
_event,
payload
)=>{

try{
const {
sendRemoteBotLanCommand
} =
require(
"./algo-bot-session-log-remote-client.cjs"
);

return await sendRemoteBotLanCommand(
payload ||
{}
);
}catch(
err
){
log.warn(
"algoTradingSessionLogRemoteBotCommand:",
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

"desktop:algoTradingSessionLogRemoteAuthPush",
async(
_event,
payload
)=>{

try{
const {
pushRemoteAuthSession
} =
require(
"./algo-bot-session-log-remote-client.cjs"
);

return await pushRemoteAuthSession(
payload ||
{}
);
}catch(
err
){
log.warn(
"algoTradingSessionLogRemoteAuthPush:",
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
"desktop:algoTradingSessionLogLocalList",
()=>{

try{
const sessionLog =
require(
"./algo-bot-session-log.cjs"
);

return sessionLog.listSessionFiles();
}catch(
err
){
log.warn(
"algoTradingSessionLogLocalList:",
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
"desktop:algoTradingSessionLogLocalGet",
(
_event,
payload
)=>{

try{
const sessionLog =
require(
"./algo-bot-session-log.cjs"
);
const name =
String(
payload?.name ||
""
).trim();

return sessionLog.readSessionFile(
name
);
}catch(
err
){
log.warn(
"algoTradingSessionLogLocalGet:",
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
"desktop:algoTradingSessionLogLocalOpenDir",
async ()=>{

try{
const {
shell
} =
require(
"electron"
);
const sessionLog =
require(
"./algo-bot-session-log.cjs"
);
const dir =
sessionLog.getSessionsDir();

require(
"fs"
).mkdirSync(
dir,
{
recursive:
true
}
);

const errMsg =
await shell.openPath(
dir
);

if(
errMsg
){
return {
ok:
false,
dir,
message:
errMsg
};
}

return {
ok:
true,
dir
};
}catch(
err
){
log.warn(
"algoTradingSessionLogLocalOpenDir:",
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

function stopAlgoModulesForFeatureNavOff(){

try{
stopAlgoTradingStream();
}catch(
err
){
log.warn(
"stopAlgoModulesForFeatureNavOff stream:",
err?.message ||
err
);
}

try{
stopAlgoTradingRuntime(
"алго выключен в Системе"
);
}catch(
err
){
log.warn(
"stopAlgoModulesForFeatureNavOff runtime:",
err?.message ||
err
);
}

return Promise.resolve(
algoBot.stopBot(
{}
)
).catch(
err=>{
log.warn(
"stopAlgoModulesForFeatureNavOff bot:",
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
stopAlgoTradingStream,
stopAlgoModulesForFeatureNavOff
};
