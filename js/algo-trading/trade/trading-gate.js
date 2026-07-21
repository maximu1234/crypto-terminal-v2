/**
 * Algo trading gate — keys configured on algo profile.
 */
let cachedConfigured =
null;
let inflight =
null;

export function isAlgoTradingEnabled(){

return cachedConfigured ===
true;

}

export async function refreshAlgoTradingGate(){

if(
inflight
){
return inflight;
}

inflight =
(async()=>{

const api =
window.cryptoTerminalDesktop?.algoTrading;

if(
!api?.getKeysStatus
){
cachedConfigured =
false;
return false;
}

try{
const status =
await api.getKeysStatus();
cachedConfigured =
!!status?.configured;
}catch{
cachedConfigured =
false;
}

return cachedConfigured;

})();

try{
return await inflight;
}finally{
inflight =
null;
}

}

/** Sync helper used like isExchangeTradingEnabled in Terminal overlays. */
export function isExchangeTradingEnabled(){

return isAlgoTradingEnabled();
}
