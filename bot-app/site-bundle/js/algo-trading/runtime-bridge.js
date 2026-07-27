/**
 * Renderer bridge → main algo trading profile / runtime.
 */
function desktopAlgoApi(){

return window.cryptoTerminalDesktop?.algoTrading ||
null;

}

export async function getAlgoTradingStatus(){

const api =
desktopAlgoApi();

if(
!api?.getRuntimeStatus &&
!api?.getStatus
){
return {
ok:
false,
message:
"desktop only"
};
}

if(
api.getRuntimeStatus
){
return api.getRuntimeStatus();
}

return api.getStatus();

}

export async function setAlgoTradingEnabled(
enabled,
exchangeId
){

const api =
desktopAlgoApi();

if(
!api?.setEnabled
){
return {
ok:
false,
message:
"desktop only"
};
}

return api.setEnabled(
{
enabled:
!!enabled,
exchangeId
}
);

}

export async function getAlgoTradingKeysStatus(
opts =
{}
){

const api =
desktopAlgoApi();

if(
!api?.getKeysStatus
){
return {
ok:
false,
message:
"desktop only"
};
}

return api.getKeysStatus(
opts
);

}

export async function saveAlgoTradingKeys(
payload
){

const api =
desktopAlgoApi();

if(
!api?.saveKeys
){
return {
ok:
false,
message:
"desktop only"
};
}

return api.saveKeys(
payload
);

}

export async function clearAlgoTradingKeys(
payload
){

const api =
desktopAlgoApi();

if(
!api?.clearKeys
){
return {
ok:
false,
message:
"desktop only"
};
}

return api.clearKeys(
payload
);

}

export async function getAlgoTradingWalletBalance(){

const api =
desktopAlgoApi();

if(
!api?.getWalletBalance
){
return {
ok:
false,
message:
"desktop only"
};
}

return api.getWalletBalance();

}

export async function setAlgoTradingMode(
tradingMode
){

const api =
desktopAlgoApi();

if(
!api?.setTradingMode
){
return {
ok:
false,
message:
"desktop only"
};
}

return api.setTradingMode(
{
tradingMode
}
);

}
