/**
 * Активная биржа для публичных данных (графики, списки монет).
 * По умолчанию Bybit; переключение — в Настройки → Подключения.
 */
const STORAGE_KEY =
"multichart_active_exchange_v1";

const DEFAULT_EXCHANGE =
"bybit";

const KNOWN_EXCHANGES =
new Set([
"bybit",
"bingx"
]);

export const EXCHANGE_CHANGED_EVENT =
"exchange-changed";

function readStored(){

try{

const raw =
localStorage.getItem(
STORAGE_KEY
);

if(
raw &&
KNOWN_EXCHANGES.has(
raw
)
){
return raw;
}

}catch{
/* ignore */
}

return DEFAULT_EXCHANGE;

}

let activeExchangeId =
readStored();

export function getActiveExchangeId(){

return activeExchangeId;

}

export function getDefaultExchangeId(){

return DEFAULT_EXCHANGE;

}

export function isKnownExchangeId(
id
){

return KNOWN_EXCHANGES.has(
String(
id ||
""
).trim().toLowerCase()
);

}

/**
 * @param {string} exchangeId
 * @param {{ silent?: boolean }} [opts]
 */
export function setActiveExchangeId(
exchangeId,
opts = {}
){

const next =
String(
exchangeId ||
""
).trim().toLowerCase();

if(
!KNOWN_EXCHANGES.has(
next
)
){
return getActiveExchangeId();
}

const prev =
activeExchangeId;

if(
prev ===
next
){
return prev;
}

activeExchangeId =
next;

try{
localStorage.setItem(
STORAGE_KEY,
next
);
}catch{
/* ignore */
}

if(
!opts.silent &&
typeof window !==
"undefined"
){
window.dispatchEvent(
new CustomEvent(
EXCHANGE_CHANGED_EVENT,
{
detail:{
exchangeId:
next,
previousExchangeId:
prev
}
}
)
);
}

return next;

}

export function ensureActiveExchange(){

if(
!KNOWN_EXCHANGES.has(
activeExchangeId
)
){
return setActiveExchangeId(
DEFAULT_EXCHANGE
);
}

return activeExchangeId;

}

export function initExchangeContext(){

ensureActiveExchange();

}
