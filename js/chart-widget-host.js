/**
 * Общий bootstrap: LW chart + initDrawings для dashboard и coins.
 */
import {
createCandlestickChart
} from "./chart-import.js?v=25";

import {
initDrawings
} from "./drawings.js?v=200";

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
 * @param {{ deferDrawings?: boolean }} [config]
 */
export function createDashboardChartWidget(
opts,
config = {}
){

const {
chart,
series
} =
createCandlestickChart(
opts.chartContainer
);

const drawingOptions = {

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
abortTabletChartGesture: opts.abortTabletChartGesture

};

const host = {
chart,
series,
drawingTools: null,
ensureDrawings: null
};

let ensureInflight = null;

host.ensureDrawings =
async function ensureDrawings(){

if(
host.drawingTools
){
return host.drawingTools;
}

if(
ensureInflight
){
return ensureInflight;
}

ensureInflight =
Promise.resolve().then(
()=>{

const tools =
initWidgetDrawings(
drawingOptions
);

host.drawingTools =
tools;
ensureInflight =
null;

return tools;

}
);

return ensureInflight;

};

if(
config.deferDrawings !==
true
){

host.drawingTools =
initWidgetDrawings(
drawingOptions
);

}

return host;

}
