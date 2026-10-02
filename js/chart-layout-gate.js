/**
 * Блокировка оверлеев (алерты и т.п.) пока viewport / price scale не готов.
 * Chrome overlay pause: settings etc. — не гонять scheduleResize, пока layout
 * графика не менялся (docs/PERF_CHROME_CHART.md).
 */
import {
CHART_REDRAW_REASON
} from "./chart-redraw-scheduler.js?v=2";

let layoutReady =
true;

let chromeOverlayDepth =
0;

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

/**
 * Fixed overlay (Настройки) поверх терминала/скринера — chart size обычно
 * не меняется; глубина позволяет вложенные open.
 * Pair with scheduleRedraw(chromeOverlayRedrawReason()) — CHROME_* = no paint.
 */
export function beginChromeOverlay(){

chromeOverlayDepth +=
1;

}

/**
 * Pass to scheduleRedraw / request() when only chrome UI changed.
 * Filtered by chart-redraw-scheduler (no canvas paint).
 */
export function chromeOverlayRedrawReason(){

return CHART_REDRAW_REASON.CHROME_PANEL;

}

export function endChromeOverlay(){

chromeOverlayDepth =
Math.max(
0,
chromeOverlayDepth -
1
);

}

export function isChromeOverlayActive(){

return chromeOverlayDepth >
0;

}

/** @returns {()=>void} end handle */
export function runWithChromeOverlay(
fn
){

beginChromeOverlay();

try{
return fn();
}finally{
endChromeOverlay();
}

}
