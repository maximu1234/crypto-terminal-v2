/**
 * Общий bootstrap: LW chart + initDrawings для dashboard и coins.
 */
import {
createCandlestickChart
} from "./chart-import.js?v=13";

import {
initDrawings
} from "./drawings.js?v=184";

/**
 * @param {Parameters<typeof initDrawings>[0]} options
 * @returns {ReturnType<typeof initDrawings> | null}
 */
export function initWidgetDrawings(
options
){

try{
return initDrawings(
options
);
}catch(
err
){
console.error(
"Drawings init failed:",
err
);
return null;
}

}

/**
 * Dashboard widget: candlestick chart + drawings layer.
 *
 * @param {{
 *   chartContainer: Element,
 *   chartWrap: Element,
 *   toolsRoot: Element,
 *   getSymbol: ()=>string,
 *   getTf: ()=>string,
 *   getCandles: ()=>Array,
 *   isActive: ()=>boolean,
 *   barPosKey: string,
 *   abortTabletChartGesture?: ()=>void
 * }} opts
 */
export function createDashboardChartWidget(
opts
){

const {
chart,
series
} =
createCandlestickChart(
opts.chartContainer
);

const drawingTools =
initWidgetDrawings({

chart,
series,
wrapEl: opts.chartWrap,
uiRoot: opts.chartWrap,
toolsRoot: opts.toolsRoot,
getSymbol: opts.getSymbol,
getTf: opts.getTf,
getCandles: opts.getCandles,
isActive: opts.isActive,
barPosKey: opts.barPosKey,
abortTabletChartGesture:opts.abortTabletChartGesture

});

return {
chart,
series,
drawingTools
};

}
