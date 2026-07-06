/**
 * RSI — панель под графиком; не учитывается в лимите индикаторов.
 */
export const RSI_PANE_ID =
"rsi";

export function createRsiPaneIndicator(
getHost
){

let enabled =
false;

function wrapEl(){

return document.getElementById(
"rsi-wrap"
);

}

function applyVisibility(){

const wrap =
wrapEl();

wrap?.classList.toggle(
"indicator-pane-hidden",
!enabled
);

getHost?.()?.setRsiPaneActive?.(
enabled
);

}

function enable(){

if(
enabled
){
return;
}

enabled =
true;
applyVisibility();

}

function disable(){

if(
!enabled
){
return;
}

enabled =
false;
applyVisibility();

}

function syncViewport(
ctx
){

if(
!enabled
){
return;
}

const chart =
getHost?.()?.rsiChart;

if(
!chart ||
!ctx?.mainChart
){
return;
}

const {
applyCoinsChartViewport
} =
ctx;

applyCoinsChartViewport?.(
ctx.mainChart,
chart,
ctx.candles,
ctx.tf,
ctx.chartWidth,
ctx.realCandleCount
);

getHost?.()?.layoutRsiBand?.();

}

function onResize(
width
){

if(
!enabled
){
return;
}

const chart =
getHost?.()?.rsiChart;

const paneHeight =
wrapEl()?.getBoundingClientRect().height ||
0;

if(
!chart ||
paneHeight <
2
){
return;
}

chart.applyOptions(
{
width,
height:
paneHeight
}
);

getHost?.()?.layoutRsiBand?.();

}

return {
id:
RSI_PANE_ID,
label:
"RSI",
legendLabel:
"RSI 14 close",
exemptFromLimit:
true,
defaultEnabled:
true,
enable,
disable,
isEnabled:()=>
enabled,
getChart:()=>
enabled
? getHost?.()?.rsiChart
: null,
syncViewport,
onResize,
destroy:()=>{
disable();
}
};

}
