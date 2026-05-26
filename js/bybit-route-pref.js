/** localStorage: маршрут REST Bybit (страница /system). */

export const BYBIT_ROUTE_PREF_KEY =
"multichart_bybit_route_v1";

export const BYBIT_ROUTE_AUTO = "auto";
export const BYBIT_ROUTE_DIRECT = "direct";
export const BYBIT_ROUTE_PROXY = "proxy";

export function getBybitRouteMode(){

try{

const v =
localStorage.getItem(BYBIT_ROUTE_PREF_KEY);

if(
v === BYBIT_ROUTE_DIRECT ||
v === BYBIT_ROUTE_PROXY ||
v === BYBIT_ROUTE_AUTO
){
return v;
}

}catch{
/* ignore */
}

return BYBIT_ROUTE_AUTO;

}

export function setBybitRouteMode(mode){

const next =
mode === BYBIT_ROUTE_DIRECT ||
mode === BYBIT_ROUTE_PROXY ||
mode === BYBIT_ROUTE_AUTO
? mode
: BYBIT_ROUTE_AUTO;

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
mode === BYBIT_ROUTE_DIRECT
){
return "Прямой → api.bybit.com";
}

if(
mode === BYBIT_ROUTE_PROXY
){
return "Прокси → railway.app/bybit → Bybit";
}

return "Авто (Safari прямой, Chrome/Яндекс прокси)";

}
