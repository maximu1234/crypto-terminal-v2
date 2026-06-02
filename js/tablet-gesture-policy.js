/**
 * Единые проверки для tablet pan/probe (coins + dashboard widgets).
 * Только вызывается при isTabletChartViewport().
 */
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
e.target?.closest?.(
".price-scale-touch-strip"
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
shouldAllowPinch
};

}
