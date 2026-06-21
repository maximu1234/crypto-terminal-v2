/**
 * Блокировка оверлеев (алерты и т.п.) пока viewport / price scale не готов.
 */
let layoutReady =
true;

export function isChartLayoutReady(){

return layoutReady;

}

export function setChartLayoutReady(
ready
){

layoutReady =
!!ready;

}

/** Не трогать DOM бейджей, пока viewport не готов (veil скрывает всё). */
export function shouldDeferAlertBadgeSync(){

return !layoutReady;

}

