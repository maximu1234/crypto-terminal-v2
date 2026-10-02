/**
 * Volume / AO / MACD / RSI: viewport с основным графиком (отступ справа от текущей свечи).
 * syncViewport must copy from main — never recompute barSpacing from pane width
 * (pane price-scale labels change per symbol and corrupted Terminal zoom).
 */
import {
applyCoinsChartViewport,
syncLinkedChartTimescales
} from "../chart-import.js?v=63";

export function applyIndicatorPaneViewport(
getHost,
linkedChart
){

const host =
getHost?.();

const mainChart =
host?.chart;

if(
!mainChart ||
!linkedChart
){
return false;
}

const rawCandles =
host?.getCandles?.() ||
[];

if(
!rawCandles.length
){
return false;
}

const candles =
host?.getDisplayCandles?.() ||
rawCandles;

const tf =
host?.getTf?.() ||
"D";

const chartWidth =
Math.max(
host?.getChartWrapWidth?.() ||
0,
1
);

applyCoinsChartViewport(
mainChart,
linkedChart,
candles,
tf,
chartWidth,
rawCandles.length,
host?.getVisibleBarsCap?.()
);

return true;

}

/** После setData — копировать viewport с основного графика, не пересчитывать заново. */
export function syncPaneViewportAfterData(
getHost,
linkedChart,
{
pulseAutoscale,
updateTimeScaleVisibility
} = {}
){

const host =
getHost?.();

const mainChart =
host?.chart;

if(
!mainChart ||
!linkedChart
){
return false;
}

syncLinkedChartTimescales(
mainChart,
linkedChart
);

updateTimeScaleVisibility?.();
pulseAutoscale?.();

return true;

}
