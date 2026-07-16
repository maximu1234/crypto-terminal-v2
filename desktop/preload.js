const {
contextBridge,
ipcRenderer
} =
require(
"electron"
);

contextBridge.exposeInMainWorld(
"cryptoTerminalDesktop",
{
isDesktop:
true,
platform:
process.platform,
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
