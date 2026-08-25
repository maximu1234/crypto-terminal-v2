/**
 * Тонкий мост: статус бота + флаги тикеров.
 * Без strategy prefs / pattern settings — его можно грузить с Терминала.
 */
import {
applyAlgoTickerFlagsRoot
} from "./ticker-flags.js?v=10";

export function desktopAlgoApi(){

return window.cryptoTerminalDesktop?.algoTrading ||
null;

}

export async function fetchAlgoBotStatus(){

const api =
desktopAlgoApi();

if(
!api?.getBotStatus
){
return {
ok:
false,
message:
"desktop only"
};
}

return api.getBotStatus();

}

/**
 * Подтянуть флаги из main только после Phase D (или явного apply).
 * Обычный status poll НЕ должен затирать localStorage.
 */
export function maybeApplyTickerFlagsFromBotStatus(
status
){

if(
!status
){
return false;
}

const shouldApply =
status.applyTickerFlags ===
true ||
status.watchlistRefresh?.ok ===
true;

if(
!shouldApply ||
!status.tickerFlagsRoot
){
return false;
}

return applyAlgoTickerFlagsRoot(
status.tickerFlagsRoot
);

}

export function subscribeAlgoBotStatusFlags(
callback
){

const api =
desktopAlgoApi();

if(
!api?.onBotStatus ||
typeof callback !==
"function"
){
return ()=>{};
}

return api.onBotStatus(
payload=>{

maybeApplyTickerFlagsFromBotStatus(
payload
);

callback(
payload
);

}
);

}
