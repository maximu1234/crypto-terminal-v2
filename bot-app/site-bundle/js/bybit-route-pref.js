/** REST Bybit — только прямой маршрут к api.bybit.com. */

export const BYBIT_ROUTE_PREF_KEY =
"multichart_bybit_route_v1";

export const BYBIT_ROUTE_DIRECT =
"direct";

/** @deprecated больше не используется */
export const BYBIT_ROUTE_PROXY =
"proxy";

/** @deprecated legacy «auto» */
export const BYBIT_ROUTE_AUTO =
"auto";

export function getBybitRouteMode(){

return BYBIT_ROUTE_DIRECT;

}

export function setBybitRouteMode(
_mode
){

try{
localStorage.setItem(
BYBIT_ROUTE_PREF_KEY,
BYBIT_ROUTE_DIRECT
);
}catch{
/* ignore */
}

}

export function bybitRouteModeLabel(
_mode
){

return "Прямой → api.bybit.com";

}
