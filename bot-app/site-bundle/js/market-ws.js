/**
 * Фасад публичного WebSocket — маршрутизация по активной бирже.
 */
import {
getActiveExchangeId,
EXCHANGE_CHANGED_EVENT
} from "./exchanges/context.js?v=1";

import {
subscribeKline as subscribeBybitKline,
subscribeTicker as subscribeBybitTicker,
connectKlineStream as connectBybitKlineStream,
disconnectKlineStream as disconnectBybitKlineStream
} from "./ws.js?v=20";

import {
subscribeBingxKline,
subscribeBingxTicker,
connectBingxKlineStream,
disconnectBingxKlineStream,
shutdownBingxWs
} from "./exchanges/bingx/ws.js?v=18";

let boundExchangeListener =
false;

function ensureExchangeListener(){

if(
boundExchangeListener ||
typeof window ===
"undefined"
){
return;
}

boundExchangeListener =
true;

window.addEventListener(
EXCHANGE_CHANGED_EVENT,
()=>{
disconnectMarketKlineStream();
window.dispatchEvent(
new Event(
"bybit-ws-reset"
)
);
}
);

}

function isBingx(){

return getActiveExchangeId() ===
"bingx";

}

export function subscribeMarketKline(
symbol,
tf,
onCandle
){

ensureExchangeListener();

if(
isBingx()
){
return subscribeBingxKline(
symbol,
tf,
onCandle
);
}

return subscribeBybitKline(
symbol,
tf,
onCandle
);

}

export function subscribeMarketTicker(
symbol,
onTick
){

ensureExchangeListener();

if(
isBingx()
){
return subscribeBingxTicker(
symbol,
onTick
);
}

return subscribeBybitTicker(
symbol,
onTick
);

}

export function connectMarketKlineStream(
opts
){

ensureExchangeListener();

if(
isBingx()
){
return connectBingxKlineStream(
opts
);
}

return connectBybitKlineStream(
opts
);

}

export function disconnectMarketKlineStream(){

disconnectBybitKlineStream();

disconnectBingxKlineStream();

shutdownBingxWs();

}

export {
subscribeMarketKline as subscribeKline,
subscribeMarketTicker as subscribeTicker,
connectMarketKlineStream as connectKlineStream,
disconnectMarketKlineStream as disconnectKlineStream
};
