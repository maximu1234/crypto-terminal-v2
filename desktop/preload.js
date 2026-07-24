const {
contextBridge,
ipcRenderer
} =
require(
"electron"
);

/**
 * Must match main `desktop/trading/algo-trading-edition.cjs` (passed via additionalArguments).
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
const fn =
(
_event,
url
)=>{
try{
callback(
url
);
}catch(
err
){
console.warn(
"desktop auth listener:",
err
);
}
};
ipcRenderer.on(
"desktop:auth-callback",
fn
);
return ()=>{
ipcRenderer.removeListener(
"desktop:auth-callback",
fn
);
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
getTickerFlagsRoot:()=>
ipcRenderer.invoke(
"desktop:algoTradingGetTickerFlagsRoot"
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
setTradingMode:(
payload
)=>
ipcRenderer.invoke(
"desktop:algoTradingSetTradingMode",
payload ||
{}
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
trading:{
getStatus:(
payload
)=>
ipcRenderer.invoke(
"trading:getStatus",
payload ||
{}
),
getRateLimitBackoffMs:()=>
ipcRenderer.invoke(
"trading:getRateLimitBackoffMs"
),
setActiveExchange:(
exchangeId
)=>
ipcRenderer.invoke(
"trading:setActiveExchange",
{
exchangeId
}
),
saveKeys:(
payload
)=>
ipcRenderer.invoke(
"trading:saveKeys",
payload
),
clearKeys:(
payload
)=>
ipcRenderer.invoke(
"trading:clearKeys",
payload ||
{}
),
getWalletBalance:(
payload
)=>
ipcRenderer.invoke(
"trading:getWalletBalance",
payload ||
{}
),
getPositions:(
options
)=>
ipcRenderer.invoke(
"trading:getPositions",
options ||
{}
),
getOpenOrders:(
options
)=>
ipcRenderer.invoke(
"trading:getOpenOrders",
options ||
{}
),
getPosition:(
symbol,
options =
{}
)=>
ipcRenderer.invoke(
"trading:getPosition",
{
symbol,
...(
typeof options ===
"object" &&
options
? options
: {}
)
}
),
closePosition:(
symbol,
options =
{}
)=>
ipcRenderer.invoke(
"trading:closePosition",
{
symbol,
...(
typeof options ===
"object" &&
options
? options
: {}
)
}
),
cancelPositionStop:(
symbol,
target,
options =
{}
)=>
ipcRenderer.invoke(
"trading:cancelPositionStop",
{
symbol,
target,
...(
typeof options ===
"object" &&
options
? options
: {}
)
}
),
setPositionStop:(
symbol,
target,
price,
options =
{}
)=>
ipcRenderer.invoke(
"trading:setPositionStop",
{
symbol,
target,
price,
...(
typeof options ===
"object" &&
options
? options
: {}
)
}
),
placeOrder:(
payload
)=>
ipcRenderer.invoke(
"trading:placeOrder",
payload
),
cancelOrder:(
symbol,
orderId
)=>
ipcRenderer.invoke(
"trading:cancelOrder",
{
symbol,
orderId
}
),
amendOrder:(
payload
)=>
ipcRenderer.invoke(
"trading:amendOrder",
payload
),
reconcileOrdersOnPositionOpen:(
symbol,
positionSide
)=>
ipcRenderer.invoke(
"trading:reconcileOrdersOnPositionOpen",
{
symbol,
positionSide
}
),
reconcileOrdersOnPositionClose:(
symbol
)=>
ipcRenderer.invoke(
"trading:reconcileOrdersOnPositionClose",
{
symbol
}
),
openPosition:(
symbol,
side,
volumeUsdt,
options =
{}
)=>
ipcRenderer.invoke(
"trading:openPosition",
{
symbol,
side,
volumeUsdt,
...options
}
),
getSymbolPositionSettings:(
symbol
)=>
ipcRenderer.invoke(
"trading:getSymbolPositionSettings",
{
symbol
}
),
applySymbolPositionSettings:(
symbol,
settings
)=>
ipcRenderer.invoke(
"trading:applySymbolPositionSettings",
{
symbol,
...settings
}
),
pingBybit:(
payload
)=>
ipcRenderer.invoke(
"trading:pingBybit",
payload ||
{}
),
getClosedPnl:(
payload
)=>
ipcRenderer.invoke(
"trading:getClosedPnl",
payload ||
{}
),
enrichClosedPnlTrades:(
payload
)=>
ipcRenderer.invoke(
"trading:enrichClosedPnlTrades",
payload ||
{}
),
getTradeDiaryDetail:(
payload
)=>
ipcRenderer.invoke(
"trading:getTradeDiaryDetail",
payload ||
{}
),
replayStream:()=>
ipcRenderer.invoke(
"trading:replayStream"
),
getStreamSnapshot:()=>
ipcRenderer.invoke(
"trading:getStreamSnapshot"
),
requestStreamSeed:()=>
ipcRenderer.invoke(
"trading:requestStreamSeed"
),
generatePnlShareCard:(
payload
)=>
ipcRenderer.invoke(
"trading:generatePnlShareCard",
payload ||
{}
),
savePnlShareCard:(
payload
)=>
ipcRenderer.invoke(
"trading:savePnlShareCard",
payload ||
{}
),
discardPnlShareCard:(
tempPath
)=>
ipcRenderer.invoke(
"trading:discardPnlShareCard",
{
tempPath
}
),
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
"trading stream listener:",
err
);
}
};

ipcRenderer.on(
"trading:stream",
fn
);

return ()=>{
ipcRenderer.removeListener(
"trading:stream",
fn
);
};

}
}
}
);
