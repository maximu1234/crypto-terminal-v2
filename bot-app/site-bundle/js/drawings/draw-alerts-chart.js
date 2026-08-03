/**
 * Registry price-alert overlay on chart (кнопка «+» у шкалы).
 * Горизонтальный луч (hray) с алертами не связан.
 */
import {
ALERT_LINE_COLOR,
ALERT_LINE_DASH,
alertPriceForDisplay,
getActiveAlerts
} from "../alerts.js?v=106";

import {
isChartLayoutReady
} from "../chart-layout-gate.js?v=2";

import {
registerChartScaleLabelProvider
} from "../chart/scale-label-providers.js?v=3";

export function createDrawAlertsChart(
deps
){

const {
chart,
getSymbol,
getDrawings,
setDrawings,
series,
drawLine,
saveDrawings,
scheduleRedraw
} =
deps;

const unregisterAlertScaleLabels =
registerChartScaleLabelProvider(
()=>{

if(
!isChartLayoutReady()
){
return [];
}

const sym =
String(
getSymbol() ||
""
).trim().toUpperCase();

if(
!sym
){
return [];
}

const out =
[];

for(
const alert of
getActiveAlerts()
){
if(
String(
alert.symbol
).toUpperCase() !==
sym
){
continue;
}

const level =
alertPriceForDisplay(
alert
);

if(
!Number.isFinite(
level
)
){
continue;
}

const y =
series.priceToCoordinate(
level
);

if(
y ==
null ||
!Number.isFinite(
y
)
){
continue;
}

out.push(
{
yIdeal:
y,
price:
level,
color:
ALERT_LINE_COLOR
}
);
}

return out;

},
chart
);

function drawRegistryPriceAlerts(
ctx,
plotW,
h
){

if(
!isChartLayoutReady()
){
return;
}

const sym =
String(
getSymbol() ||
""
).trim().toUpperCase();

if(
!sym
){
return;
}

for(
const alert of getActiveAlerts()
){

if(
String(
alert.symbol
).toUpperCase() !==
sym
){
continue;
}

const level =
alertPriceForDisplay(
alert
);

if(
!Number.isFinite(
level
)
){
continue;
}

const y =
series.priceToCoordinate(
level
);

if(
y ==
null
){
continue;
}

drawLine(
ctx,
0,
y,
plotW,
y,
ALERT_LINE_COLOR,
1,
ALERT_LINE_DASH
);

}

}

/** Удалить из drawings ошибочно сохранённые pa_* (алерты живут только в registry). */
function stripOrphanAlertDrawings(){

const drawings =
getDrawings();
const next =
drawings.filter(
shape=>
!String(
shape?.id ||
""
).startsWith(
"pa_"
)
);

if(
next.length ===
drawings.length
){
return;
}

setDrawings(
next
);
saveDrawings();
scheduleRedraw();

}

return {
drawRegistryPriceAlerts,
stripOrphanAlertDrawings,
destroy(){
unregisterAlertScaleLabels?.();
}
};

}
