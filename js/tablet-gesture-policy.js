/**
 * Единые проверки для tablet pan/probe (coins + dashboard widgets).
 * Только вызывается при isTabletChartViewport().
 */

const PLUS_CHROME_SELECTOR =
[
".price-scale-touch-strip",
".rsi-scale-touch-strip",
".price-alert-scale-plus",
".trade-order-plus-menu",
".price-alert-badge"
].join(
","
);

export function isPriceScalePlusChromeTarget(
e
){

return !!e?.target?.closest?.(
PLUS_CHROME_SELECTOR
);

}

export function createTabletGesturePolicy(
{
chartWrap,
getDrawingTools = ()=>null,
getProbeActive = ()=>false,
isInteractionAllowed = ()=>true
} = {}
){

function shouldBeginGesture(
e
){

if(
!isInteractionAllowed()
){
return false;
}

if(
chartWrap?.classList.contains(
"chart-touch-locked"
)
){
return false;
}

if(
isPriceScalePlusChromeTarget(
e
)
){
return false;
}

const clientX =
e.clientX ??
e.touches?.[
0
]?.clientX;

const clientY =
e.clientY ??
e.touches?.[
0
]?.clientY;

if(
clientX ===
undefined ||
clientY ===
undefined
){
return false;
}

const drawingTools =
getDrawingTools();

if(
drawingTools?.blocksTabletChartGestures?.(
clientX,
clientY
)
){
return false;
}

return true;

}

function shouldAllowPan(){

if(
!isInteractionAllowed()
){
return false;
}

if(
chartWrap?.classList.contains(
"chart-touch-locked"
)
){
return false;
}

if(
getProbeActive()
){
return false;
}

const drawingTools =
getDrawingTools();

if(
drawingTools?.blocksTabletChartPan?.()
){
return false;
}

return true;

}

function shouldSuppressNativeSelection(){

if(
!isInteractionAllowed()
){
return false;
}

const drawingTools =
getDrawingTools();

return !!drawingTools?.shouldSuppressNativeSelection?.();

}

function shouldAllowPinch(){

if(
!isInteractionAllowed()
){
return false;
}

if(
getProbeActive()
){
return false;
}

const drawingTools =
getDrawingTools();

if(
drawingTools?.blocksTabletChartPan?.()
){
return false;
}

if(
drawingTools?.isPlacementActive?.()
){
return false;
}

if(
chartWrap?.classList.contains(
"chart-touch-locked"
)
){
return false;
}

return true;

}

return {
shouldBeginGesture,
shouldAllowPan,
shouldAllowPinch,
shouldSuppressNativeSelection
};

}
