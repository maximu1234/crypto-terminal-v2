/** localStorage: маршрут REST Bybit (страница /system). */

export const BYBIT_ROUTE_PREF_KEY =
"multichart_bybit_route_v1";

export const BYBIT_ROUTE_DIRECT = "direct";
export const BYBIT_ROUTE_PROXY = "proxy";

/** @deprecated legacy «auto» — читается как direct */
export const BYBIT_ROUTE_AUTO = "auto";

export function getBybitRouteMode(){

try{

const v =
localStorage.getItem(BYBIT_ROUTE_PREF_KEY);

if(
v === BYBIT_ROUTE_DIRECT ||
v === BYBIT_ROUTE_AUTO
){
return BYBIT_ROUTE_DIRECT;
}

if(
v === BYBIT_ROUTE_PROXY
){
return BYBIT_ROUTE_PROXY;
}

}catch{
/* ignore */
}

return BYBIT_ROUTE_DIRECT;

}

export function setBybitRouteMode(mode){

const next =
mode === BYBIT_ROUTE_PROXY
? BYBIT_ROUTE_PROXY
: BYBIT_ROUTE_DIRECT;

try{
localStorage.setItem(
BYBIT_ROUTE_PREF_KEY,
next
);
}catch{
/* ignore */
}

window.dispatchEvent(
new CustomEvent(
"bybit-route-changed",
{
detail: { mode: next }
}
)
);

}

export function bybitRouteModeLabel(mode){

if(
mode === BYBIT_ROUTE_PROXY
){
return "Прокси → railway.app/bybit → Bybit";
}

return "Прямой → api.bybit.com";

}
