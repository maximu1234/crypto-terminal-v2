/**
 * Desktop edit: hover-select, pin-on-click, draw chrome hit-test.
 * Phase 2 split from drawings/init.js.
 */

import {
isCoarseTouchViewport
} from "../chart-import.js?v=53";

export function createDrawDesktopSelection(
deps
){

const {
isTabletChartViewport,
getAlive,
isActive,
getTool,
getPlacement,
getDragState,
getSelectedId,
setSelectedId,
getSelected,
setFibSettingsShapeId,
hitTest,
pointerFromEvent,
updateStyleBar,
redraw,
getChromePortal,
styleBar,
colorPopover,
widthPopover,
textSizePopover,
settingsPopover,
positionRiskWrap,
fibPortalHitTest,
setBlockChartClick,
clearPeerSelections = null
} =
deps;

let desktopSelectionPinned =
false;
let desktopClickSelectId =
null;

function isDesktopDrawHoverSelect(){

return !isTabletChartViewport();

}

function clearDrawingSelection(){

setSelectedId(
null
);
desktopSelectionPinned =
false;
desktopClickSelectId =
null;

}

function releaseDrawingSelectionPin(){

desktopSelectionPinned =
false;
desktopClickSelectId =
null;

}

function pinDrawingSelection(
hitId
){

setSelectedId(
hitId
);
desktopSelectionPinned =
!!hitId;

if(
hitId
){

const picked =
getSelected();

if(
picked?.type ===
"fib"
){
setFibSettingsShapeId(
picked.id
);
}

}

}

function isDrawChromeTarget(
target
){

if(
!target?.closest
){
return false;
}

const chromePortal =
getChromePortal();

return !!(
chromePortal?.contains(
target
) ||
styleBar?.contains(
target
) ||
colorPopover?.contains(
target
) ||
widthPopover?.contains(
target
) ||
settingsPopover?.contains(
target
) ||
target.closest(
".draw-popover"
) ||
target.closest(
".draw-chrome-portal"
) ||
target.closest(
".fib-line-style-menu--portal"
) ||
target.closest(
".fib-line-width-menu--portal"
) ||
target.closest(
".fib-level-color-menu"
) ||
target.closest(
".tv-color-picker"
) ||
target.closest(
".draw-context-menu"
) ||
target.closest(
".draw-position-risk"
) ||
target.closest(
".draw-text-editor"
) ||
target.closest(
".draw-text-size-popover"
) ||
target.closest(
".price-alert-scale-plus"
) ||
target.closest(
".price-alert-scale-price-hint"
) ||
target.closest(
".trade-order-plus-menu"
) ||
target.closest(
".price-alert-badge"
) ||
target.closest(
".trade-pos-entry-zone"
) ||
target.closest(
".trade-pos-handles"
) ||
target.closest(
".trade-pos-badge"
) ||
target.closest(
".trade-order-badge"
) ||
target.closest(
".chart-indicators-wrap"
) ||
target.closest(
".chart-indicators-menu"
)
);

}

function rectHitsClient(
el,
clientX,
clientY
){

if(
!el ||
el.classList.contains(
"hidden"
)
){
return false;
}

const r =
el.getBoundingClientRect();

if(
r.width <
1 ||
r.height <
1
){
return false;
}

return (
clientX >=
r.left &&
clientX <=
r.right &&
clientY >=
r.top &&
clientY <=
r.bottom
);

}

function isDrawChromePointerEvent(
e
){

if(
isDrawChromeTarget(
e.target
)
){
return true;
}

return (
rectHitsClient(
styleBar,
e.clientX,
e.clientY
) ||
rectHitsClient(
positionRiskWrap,
e.clientX,
e.clientY
) ||
rectHitsClient(
colorPopover,
e.clientX,
e.clientY
) ||
rectHitsClient(
widthPopover,
e.clientX,
e.clientY
) ||
rectHitsClient(
textSizePopover,
e.clientX,
e.clientY
) ||
rectHitsClient(
settingsPopover,
e.clientX,
e.clientY
) ||
fibPortalHitTest(
e.clientX,
e.clientY
)
);

}

function finishDesktopPointerSelect(
e
){

if(
!getAlive() ||
!isActive()
){
return;
}

if(
!isDesktopDrawHoverSelect() ||
getTool() !==
"cursor" ||
getPlacement()
){
return;
}

if(
!e ||
e.button !==
0 ||
!e.isPrimary
){
return;
}

if(
e.pointerType &&
e.pointerType !==
"mouse"
){
return;
}

if(
isDrawChromePointerEvent(
e
)
){
return;
}

const dragState =
getDragState();

if(
dragState
){

pinDrawingSelection(
dragState.shapeId
);
desktopClickSelectId =
null;
updateStyleBar();
redraw();
return;

}

if(
desktopClickSelectId
){

pinDrawingSelection(
desktopClickSelectId
);
desktopClickSelectId =
null;
updateStyleBar();
redraw();

}

}

function applyDesktopHoverSelection(
x,
y,
e
){

if(
!isDesktopDrawHoverSelect() ||
getTool() !==
"cursor" ||
getPlacement() ||
getDragState()
){
return;
}

if(
e?.pointerType &&
e.pointerType !==
"mouse"
){
return;
}

if(
desktopSelectionPinned
){
return;
}

if(
isDrawChromePointerEvent(
e
)
){
return;
}

const hitId =
hitTest(
x,
y
);

if(
hitId ===
getSelectedId()
){
return;
}

if(
!hitId
){

if(
!desktopSelectionPinned
){
setSelectedId(
null
);
updateStyleBar();
redraw();
}

return;

}

setSelectedId(
hitId
);

if(
hitId
){

const picked =
getSelected();

if(
picked?.type ===
"fib"
){
setFibSettingsShapeId(
picked.id
);
}

}

updateStyleBar();
redraw();

}

function createEditHoverHandlers(
wrapEl
){

const onEditHover =
e=>{

if(
!getAlive() ||
!isActive()
){
return;
}

const { x, y } =
pointerFromEvent(
e
);

applyDesktopHoverSelection(
x,
y,
e
);

};

const onEditLeave =
e=>{

if(
isCoarseTouchViewport()
){
return;
}

if(
!isDesktopDrawHoverSelect() ||
getTool() !==
"cursor" ||
getPlacement() ||
getDragState()
){
return;
}

const related =
e.relatedTarget;

if(
related &&
(
wrapEl.contains(
related
) ||
isDrawChromeTarget(
related
)
)
){
return;
}

if(
!related
){
const ae =
document.activeElement;

if(
ae &&
isDrawChromeTarget(
ae
)
){
return;
}

}

if(
!getSelectedId() ||
desktopSelectionPinned
){
return;
}

clearDrawingSelection();
updateStyleBar();
redraw();

};

const onDesktopSelectClick =
e=>{

if(
!getAlive() ||
!isActive()
){
return;
}

if(
!isDesktopDrawHoverSelect() ||
getTool() !==
"cursor" ||
getPlacement() ||
getDragState()
){
return;
}

if(
isDrawChromePointerEvent(
e
)
){
return;
}

const { x, y } =
pointerFromEvent(
e
);

const hitId =
hitTest(
x,
y
);

if(
hitId
){

try{
clearPeerSelections?.();
}catch{
/* ignore */
}

pinDrawingSelection(
hitId
);
desktopClickSelectId =
null;
setBlockChartClick(
true
);
updateStyleBar();
redraw();
e.preventDefault();
e.stopPropagation();

}else{

try{
clearPeerSelections?.();
}catch{
/* ignore */
}

if(
!desktopSelectionPinned
){

clearDrawingSelection();
updateStyleBar();
redraw();

}

}

};

return {
onEditHover,
onEditLeave,
onDesktopSelectClick
};

}

function onPointerDownHoverHit(
hitId
){

desktopClickSelectId =
hitId;

}

function handleChartClickCursorSelection(
hitId
){

if(
!isDesktopDrawHoverSelect()
){

setSelectedId(
hitId
);

const picked =
getSelected();

if(
picked?.type ===
"fib"
){
setFibSettingsShapeId(
picked.id
);
}

updateStyleBar();
redraw();
return;

}

if(
hitId
){

try{
clearPeerSelections?.();
}catch{
/* ignore */
}

pinDrawingSelection(
hitId
);
desktopClickSelectId =
null;

}else{

try{
clearPeerSelections?.();
}catch{
/* ignore */
}

if(
!desktopSelectionPinned
){
clearDrawingSelection();
}

}

updateStyleBar();
redraw();

}

return {
isDesktopDrawHoverSelect,
clearDrawingSelection,
pinDrawingSelection,
releaseDrawingSelectionPin,
isDrawingSelectionPinned:()=>desktopSelectionPinned,
isDrawChromePointerEvent,
finishDesktopPointerSelect,
applyDesktopHoverSelection,
createEditHoverHandlers,
onPointerDownHoverHit,
handleChartClickCursorSelection
};

}
