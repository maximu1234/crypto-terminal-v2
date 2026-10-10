/**
 * Volume / AO / MACD / RSI: viewport sync with the main chart.
 * Never recompute main barSpacing from a pane width — that caused
 * Terminal zoom fights when several panes were enabled together.
 */
import {
syncLinkedChartTimescales
} from "../chart-import.js?v=70";

/**
 * After enabling a pane: copy main → pane only.
 * (Formerly applied a full viewport plan onto main — unsafe with multi-pane.)
 */
export function applyIndicatorPaneViewport(
getHost,
linkedChart
){

return syncPaneViewportAfterData(
getHost,
linkedChart
);

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
