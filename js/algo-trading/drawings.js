/**
 * Рисование на АлгоТрейдинг — обёртка над shared drawings (не трогает Pattern 1-2).
 */
import {
initWidgetDrawings
} from "../chart-widget-host.js?v=18";

import {
mountDrawToolbar,
mountDrawToolIcons
} from "../draw-ui-shared.js?v=37";

/**
 * @param {{
 *   chart: object,
 *   series: object,
 *   getSymbol: () => string,
 *   getTf: () => string,
 *   getCandles: () => Array
 * }} opts
 * @returns {{ tools: object|null, destroy: () => void }}
 */
export function mountAlgoTradingDrawings(
opts
){

const toolbarEl =
document.getElementById(
"draw-toolbar"
);
const chartWrapEl =
document.getElementById(
"chart-wrap"
);
const chartsStackEl =
document.getElementById(
"charts-stack"
);

if(
!toolbarEl ||
!chartWrapEl ||
!opts?.chart ||
!opts?.series
){
return {
tools:
null,
destroy:
()=>{}
};
}

mountDrawToolbar(
toolbarEl
);
mountDrawToolIcons(
document
);

const tools =
initWidgetDrawings(
{
chart:
opts.chart,
series:
opts.series,
wrapEl:
chartWrapEl,
uiRoot:
chartWrapEl,
toolsRoot:
chartsStackEl,
getSymbol:
opts.getSymbol,
getTf:
opts.getTf,
getCandles:
opts.getCandles,
isActive:
()=>
true
}
);

return {
tools,
destroy(){

try{
tools?.destroy?.();
}catch{
/* ignore */
}

try{
tools?.dispose?.();
}catch{
/* ignore */
}

}

};

}
