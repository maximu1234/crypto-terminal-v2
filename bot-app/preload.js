const {
contextBridge,
ipcRenderer
} =
require(
"electron"
);

/**
 * Must match main `bot-app/trading/algo-trading-edition.cjs` (passed via additionalArguments).
 * Sandboxed preload cannot require local modules.
 * f = full (live + manual), m = manual-only
 */
function getAlgoDesktopEdition(){

const fromArg =
(
process.argv.find(
a=>
typeof a ===
"string" &&
a.startsWith(
"--algo-desktop-edition="
)
) ||
""
).slice(
"--algo-desktop-edition=".length
);

return fromArg ===
"m"
? "m"
: "f";

}

function isAlgoLiveTradingEnabled(){

return getAlgoDesktopEdition() ===
"f";

}

/**
 * Algo Bot: Terminal Bybit/BingX trading IPC is not registered in main.
 * Expose a soft-fail stub so renderer never invokes dead trading:* channels.
 */
function terminalTradingDisabled(
method
){

return ()=>
Promise.resolve(
{
ok:
false,
message:
`Algo Bot: terminal trading IPC disabled (${method})`
}
);

}

const terminalTradingStub =
{
getStatus:
terminalTradingDisabled(
"getStatus"
),
getRateLimitBackoffMs:
terminalTradingDisabled(
"getRateLimitBackoffMs"
),
setActiveExchange:
terminalTradingDisabled(
"setActiveExchange"
),
saveKeys:
terminalTradingDisabled(
"saveKeys"
),
clearKeys:
terminalTradingDisabled(
"clearKeys"
),
getWalletBalance:
terminalTradingDisabled(
"getWalletBalance"
),
getPositions:
terminalTradingDisabled(
"getPositions"
),
getOpenOrders:
terminalTradingDisabled(
"getOpenOrders"
),
getPosition:
terminalTradingDisabled(
"getPosition"
),
closePosition:
terminalTradingDisabled(
"closePosition"
),
cancelPositionStop:
terminalTradingDisabled(
"cancelPositionStop"
),
setPositionStop:
terminalTradingDisabled(
"setPositionStop"
),
placeOrder:
terminalTradingDisabled(
"placeOrder"
),
cancelOrder:
terminalTradingDisabled(
"cancelOrder"
),
amendOrder:
terminalTradingDisabled(
"amendOrder"
),
reconcileOrdersOnPositionOpen:
terminalTradingDisabled(
"reconcileOrdersOnPositionOpen"
),
reconcileOrdersOnPositionClose:
terminalTradingDisabled(
"reconcileOrdersOnPositionClose"
),
openPosition:
terminalTradingDisabled(
"openPosition"
),
getSymbolPositionSettings:
terminalTradingDisabled(
"getSymbolPositionSettings"
),
applySymbolPositionSettings:
terminalTradingDisabled(
"applySymbolPositionSettings"
),
pingBybit:
terminalTradingDisabled(
"pingBybit"
),
getClosedPnl:
terminalTradingDisabled(
"getClosedPnl"
),
enrichClosedPnlTrades:
terminalTradingDisabled(
"enrichClosedPnlTrades"
),
getTradeDiaryDetail:
terminalTradingDisabled(
"getTradeDiaryDetail"
),
replayStream:
terminalTradingDisabled(
"replayStream"
),
getStreamSnapshot:
terminalTradingDisabled(
"getStreamSnapshot"
),
requestStreamSeed:
terminalTradingDisabled(
"requestStreamSeed"
),
generatePnlShareCard:
terminalTradingDisabled(
"generatePnlShareCard"
),
savePnlShareCard:
terminalTradingDisabled(
"savePnlShareCard"
),
discardPnlShareCard:
terminalTradingDisabled(
"discardPnlShareCard"
),
onStream:()=>
()=>{}
};

/**
 * Auth callback may arrive before renderer binds onAuthCallback (terminal boot).
 * Queue here so the URL is not dropped.
 */
let queuedAuthCallbackUrl =
null;
let authCallbackListener =
null;

ipcRenderer.on(
"desktop:auth-callback",
(
_event,
url
)=>{

if(
typeof url !==
"string" ||
!url.trim()
){
return;
}

queuedAuthCallbackUrl =
url.trim();

if(
typeof authCallbackListener ===
"function"
){

const pending =
queuedAuthCallbackUrl;
queuedAuthCallbackUrl =
null;

try{
authCallbackListener(
pending
);
}catch(
err
){
console.warn(
"desktop auth listener:",
err
);
}

}

}
);

contextBridge.exposeInMainWorld(
"cryptoTerminalDesktop",
{
isDesktop:
true,
platform:
process.platform,
algoDesktopEdition:
getAlgoDesktopEdition(),
algoLiveTradingEnabled:
isAlgoLiveTradingEnabled(),
getVersion:()=>
ipcRenderer.invoke(
"app:getVersion"
),
onAuthCallback:(
callback
)=>{

if(
typeof callback !==
"function"
){
return ()=>{};
}

authCallbackListener =
callback;

if(
queuedAuthCallbackUrl
){
const pending =
queuedAuthCallbackUrl;
queuedAuthCallbackUrl =
null;

try{
callback(
pending
);
}catch(
err
){
console.warn(
"desktop auth listener:",
err
);
}

}

return ()=>{

if(
authCallbackListener ===
callback
){
authCallbackListener =
null;
}

};

},
onOpenChart:(
callback
)=>{
if(
typeof callback !==
"function"
){
return ()=>{};
}
const fn =
(
_event,
payload
)=>{
try{
callback(
payload
);
}catch(
err
){
console.warn(
"desktop open-chart listener:",
err
);
}
};
ipcRenderer.on(
"desktop:open-chart",
fn
);
return ()=>{
ipcRenderer.removeListener(
"desktop:open-chart",
fn
);
};
},
loadAuthSession:()=>
ipcRenderer.invoke(
"desktop:loadAuthSession"
),
saveAuthSession:(
raw
)=>
ipcRenderer.invoke(
"desktop:saveAuthSession",
raw
),
clearAuthSession:()=>
ipcRenderer.invoke(
"desktop:clearAuthSession"
),
chartSnapshotCopy:(
payload
)=>
ipcRenderer.invoke(
"desktop:chartSnapshotCopy",
payload ||
{}
),
chartSnapshotSave:(
payload
)=>
ipcRenderer.invoke(
"desktop:chartSnapshotSave",
payload ||
{}
),
chartSnapshotLogoGet:()=>
ipcRenderer.invoke(
"desktop:chartSnapshotLogoGet"
),
chartSnapshotLogoSetEnabled:(
payload
)=>
ipcRenderer.invoke(
"desktop:chartSnapshotLogoSetEnabled",
payload ||
{}
),
chartSnapshotLogoPick:()=>
ipcRenderer.invoke(
"desktop:chartSnapshotLogoPick"
),
chartSnapshotLogoDataUrl:()=>
ipcRenderer.invoke(
"desktop:chartSnapshotLogoDataUrl"
),
updateMenuBarTray:(
state
)=>
ipcRenderer.invoke(
"desktop:updateMenuBarTray",
state
),
setMenuBarTrayVisible:(
visible
)=>
ipcRenderer.invoke(
"desktop:setMenuBarTrayVisible",
visible
),
algoTrading:{
edition:
getAlgoDesktopEdition(),
liveTradingEnabled:
isAlgoLiveTradingEnabled(),
getStatus:(
payload
)=>
ipcRenderer.invoke(
"desktop:algoTradingGetKeysStatus",
payload ||
{}
),
getRuntimeStatus:()=>
ipcRenderer.invoke(
"desktop:algoTradingGetStatus"
),
setEnabled:(
payload
)=>
ipcRenderer.invoke(
"desktop:algoTradingSetEnabled",
payload
),
getKeysStatus:(
payload
)=>
ipcRenderer.invoke(
"desktop:algoTradingGetKeysStatus",
payload
),
getBotLockKey:(
payload
)=>
ipcRenderer.invoke(
"desktop:algoTradingGetBotLockKey",
payload ||
{}
),
saveKeys:(
payload
)=>
ipcRenderer.invoke(
"desktop:algoTradingSaveKeys",
payload
),
clearKeys:(
payload
)=>
ipcRenderer.invoke(
"desktop:algoTradingClearKeys",
payload
),
getPositions:()=>
ipcRenderer.invoke(
"desktop:algoTradingGetPositions"
),
getOpenOrders:(
payload
)=>
ipcRenderer.invoke(
"desktop:algoTradingGetOpenOrders",
payload ||
{}
),
getPosition:(
symbol
)=>
ipcRenderer.invoke(
"desktop:algoTradingGetPosition",
{
symbol
}
),
closePosition:(
symbol
)=>
ipcRenderer.invoke(
"desktop:algoTradingClosePosition",
{
symbol
}
),
setPositionStop:(
symbol,
target,
price
)=>
ipcRenderer.invoke(
"desktop:algoTradingSetPositionStop",
{
symbol,
target,
price
}
),
cancelPositionStop:(
symbol,
target
)=>
ipcRenderer.invoke(
"desktop:algoTradingCancelPositionStop",
{
symbol,
target
}
),
amendOrder:(
payload
)=>
ipcRenderer.invoke(
"desktop:algoTradingAmendOrder",
payload ||
{}
),
cancelOrder:(
symbol,
orderId
)=>
ipcRenderer.invoke(
"desktop:algoTradingCancelOrder",
{
symbol,
orderId
}
),
getStreamSnapshot:()=>
ipcRenderer.invoke(
"desktop:algoTradingGetStreamSnapshot"
),
replayStream:()=>
ipcRenderer.invoke(
"desktop:algoTradingReplayStream"
),
requestStreamSeed:()=>
ipcRenderer.invoke(
"desktop:algoTradingRequestStreamSeed"
),
ensureStream:()=>
ipcRenderer.invoke(
"desktop:algoTradingEnsureStream"
),
syncBotStrategies:(
payload
)=>
ipcRenderer.invoke(
"desktop:algoTradingSyncBotStrategies",
payload ||
{}
),
syncTickerFlags:(
payload
)=>
ipcRenderer.invoke(
"desktop:algoTradingSyncTickerFlags",
payload ||
{}
),
setTickerBook:(
payload
)=>
ipcRenderer.invoke(
"desktop:algoTradingSyncTickerBook",
payload ||
{}
),
getTickerBook:(
payload
)=>
ipcRenderer.invoke(
"desktop:algoTradingGetTickerBook",
payload ||
{}
),
getRsiTouchFlipBook:()=>
ipcRenderer.invoke(
"desktop:algoTradingGetRsiTouchFlipBook"
),
syncRsiTouchFlipBook:(
payload
)=>
ipcRenderer.invoke(
"desktop:algoTradingSyncRsiTouchFlipBook",
payload ||
{}
),
getMacdFlipTouchBook:()=>
ipcRenderer.invoke(
"desktop:algoTradingGetMacdFlipTouchBook"
),
syncMacdFlipTouchBook:(
payload
)=>
ipcRenderer.invoke(
"desktop:algoTradingSyncMacdFlipTouchBook",
payload ||
{}
),
getTickerFlagsRoot:()=>
ipcRenderer.invoke(
"desktop:algoTradingGetTickerFlagsRoot"
),
listLinearUsdtSymbols:()=>
ipcRenderer.invoke(
"desktop:algoTradingListLinearSymbols"
),
fetchKlineHistoryDeep:(
payload
)=>
ipcRenderer.invoke(
"desktop:algoTradingFetchKlineHistory",
payload ||
{}
),
fetchKlinePage:(
payload
)=>
ipcRenderer.invoke(
"desktop:algoTradingFetchKlinePage",
payload ||
{}
),
startBot:(
payload
)=>
ipcRenderer.invoke(
"desktop:algoTradingStartBot",
payload ||
{}
),
stopBot:(
payload
)=>
ipcRenderer.invoke(
"desktop:algoTradingStopBot",
payload ||
{}
),
getBotStatus:()=>
ipcRenderer.invoke(
"desktop:algoTradingGetBotStatus"
),
disarmArmedSetup:(
payload
)=>
ipcRenderer.invoke(
"desktop:algoTradingDisarmArmedSetup",
payload ||
{}
),
getWalletBalance:()=>
ipcRenderer.invoke(
"desktop:algoTradingGetWalletBalance"
),
getClosedPnl:(
payload
)=>
ipcRenderer.invoke(
"desktop:algoTradingGetClosedPnl",
payload ||
{}
),
getTradeDiaryDetail:(
payload
)=>
ipcRenderer.invoke(
"desktop:algoTradingGetTradeDiaryDetail",
payload ||
{}
),
generatePnlShareCard:(
payload
)=>
ipcRenderer.invoke(
"desktop:algoTradingGeneratePnlShareCard",
payload ||
{}
),
savePnlShareCard:(
payload
)=>
ipcRenderer.invoke(
"desktop:algoTradingSavePnlShareCard",
payload ||
{}
),
discardPnlShareCard:(
tempPath
)=>
ipcRenderer.invoke(
"desktop:algoTradingDiscardPnlShareCard",
{
tempPath
}
),
setTradingMode:(
payload
)=>
ipcRenderer.invoke(
"desktop:algoTradingSetTradingMode",
payload ||
{}
),
sessionLogServerGet:()=>
ipcRenderer.invoke(
"desktop:algoTradingSessionLogServerGet"
),
sessionLogServerSet:(
payload
)=>
ipcRenderer.invoke(
"desktop:algoTradingSessionLogServerSet",
payload ||
{}
),
sessionLogRemoteList:(
payload
)=>
ipcRenderer.invoke(
"desktop:algoTradingSessionLogRemoteList",
payload ||
{}
),
sessionLogRemoteGet:(
payload
)=>
ipcRenderer.invoke(
"desktop:algoTradingSessionLogRemoteGet",
payload ||
{}
),
sessionLogRemotePushWatchlists:(
payload
)=>
ipcRenderer.invoke(
"desktop:algoTradingSessionLogRemotePushWatchlists",
payload ||
{}
),
sessionLogRemotePushTickerBook:(
payload
)=>
ipcRenderer.invoke(
"desktop:algoTradingSessionLogRemotePushTickerBook",
payload ||
{}
),
sessionLogRemoteBotStatus:(
payload
)=>
ipcRenderer.invoke(
"desktop:algoTradingSessionLogRemoteBotStatus",
payload ||
{}
),
sessionLogRemoteBotCommand:(
payload
)=>
ipcRenderer.invoke(
"desktop:algoTradingSessionLogRemoteBotCommand",
payload ||
{}
),
sessionLogRemoteAuthPush:(
payload
)=>
ipcRenderer.invoke(
"desktop:algoTradingSessionLogRemoteAuthPush",
payload ||
{}
),
sessionLogLocalList:()=>
ipcRenderer.invoke(
"desktop:algoTradingSessionLogLocalList"
),
sessionLogLocalGet:(
payload
)=>
ipcRenderer.invoke(
"desktop:algoTradingSessionLogLocalGet",
payload ||
{}
),
sessionLogLocalOpenDir:()=>
ipcRenderer.invoke(
"desktop:algoTradingSessionLogLocalOpenDir"
),
onBotAlertRequest:(
callback
)=>{

if(
typeof callback !==
"function"
){
return ()=>{};
}

const fn =
(
_event,
payload
)=>{
try{
callback(
payload
);
}catch(
err
){
console.warn(
"algoTrading botAlertRequest listener:",
err
);
}
};

ipcRenderer.on(
"algoTrading:botAlertRequest",
fn
);

return ()=>
ipcRenderer.removeListener(
"algoTrading:botAlertRequest",
fn
);

},
respondBotAlert:(
payload
)=>
ipcRenderer.send(
"desktop:algoTradingBotAlertResponse",
payload ||
{}
),
onBotStatus:(
callback
)=>{

if(
typeof callback !==
"function"
){
return ()=>{};
}

const fn =
(
_event,
payload
)=>{
try{
callback(
payload
);
}catch(
err
){
console.warn(
"algoTrading botStatus listener:",
err
);
}
};

ipcRenderer.on(
"algoTrading:botStatus",
fn
);

return ()=>{
ipcRenderer.removeListener(
"algoTrading:botStatus",
fn
);
};

},
onStream:(
callback
)=>{

if(
typeof callback !==
"function"
){
return ()=>{};
}

const fn =
(
_event,
payload
)=>{
try{
callback(
payload
);
}catch(
err
){
console.warn(
"algoTrading stream listener:",
err
);
}
};

ipcRenderer.on(
"algoTrading:stream",
fn
);

return ()=>{
ipcRenderer.removeListener(
"algoTrading:stream",
fn
);
};

}
},
setMenuBarTrayPnlHidden:(
hidden
)=>
ipcRenderer.invoke(
"desktop:setMenuBarTrayPnlHidden",
hidden
),
setFeatureNavPrefs:(
patch
)=>
ipcRenderer.invoke(
"desktop:setFeatureNavPrefs",
patch
),
onMenuBarTrayPnlPrivacyChanged:(
callback
)=>{

if(
typeof callback !==
"function"
){
return ()=>{};
}

const handler =
(
_event,
payload
)=>{
callback(
payload ||
{}
);
};

ipcRenderer.on(
"desktop:pnl-privacy-changed",
handler
);

return ()=>{
ipcRenderer.removeListener(
"desktop:pnl-privacy-changed",
handler
);
};

},
getMenuBarAgentPrefs:()=>
ipcRenderer.invoke(
"desktop:getMenuBarAgentPrefs"
),
getAppProxy:()=>
ipcRenderer.invoke(
"desktop:getAppProxy"
),
saveAppProxy:(
payload
)=>
ipcRenderer.invoke(
"desktop:saveAppProxy",
payload ||
{}
),
setLaunchAgentAtLogin:(
enabled
)=>
ipcRenderer.invoke(
"desktop:setLaunchAgentAtLogin",
enabled
),
importScriptFavorites:(
exchangeId,
side
)=>
ipcRenderer.invoke(
"desktop:importScriptFavorites",
{
exchangeId,
side
}
),
loadScriptFavorites:(
exchangeId,
side
)=>
ipcRenderer.invoke(
"desktop:loadScriptFavorites",
{
exchangeId,
side
}
),
clearScriptFavorites:(
exchangeId,
side
)=>
ipcRenderer.invoke(
"desktop:clearScriptFavorites",
{
exchangeId,
side
}
),
diaryJournal:{
read:(
exchangeId
)=>
ipcRenderer.invoke(
"desktop:diaryJournalRead",
{
exchangeId
}
),
write:(
exchangeId,
text
)=>
ipcRenderer.invoke(
"desktop:diaryJournalWrite",
{
exchangeId,
text
}
)
},
trading:
terminalTradingStub,
bybitPublicWs:{
setTopics:(
topics,
opts
)=>
ipcRenderer.invoke(
"bybitPublic:setTopics",
{
topics,
reset:
!!opts?.reset
}
),
probe:()=>
ipcRenderer.invoke(
"bybitPublic:probe"
),
getTickers:()=>
ipcRenderer.invoke(
"bybitPublic:getTickers"
),
onPush:(
callback
)=>{

if(
typeof callback !==
"function"
){
return ()=>{};
}

const fn =
(
_event,
payload
)=>{
try{
callback(
payload
);
}catch(
err
){
console.warn(
"bybit public ws listener:",
err
);
}
};

ipcRenderer.on(
"bybitPublic:push",
fn
);

return ()=>{
ipcRenderer.removeListener(
"bybitPublic:push",
fn
);
};

}
}
}
);
