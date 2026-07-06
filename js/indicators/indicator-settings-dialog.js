import {
closeIndicatorColorPicker
} from "./indicator-color-picker-ui.js?v=1";

const DRAG_MARGIN_PX =
4;

/**
 * Модальное окно настроек индикатора (двойной клик по легенде).
 */
export function createIndicatorSettingsDialog(
{
getDragBoundsEl
} = {}
){

const backdrop =
document.createElement(
"div"
);

backdrop.className =
"chart-indicator-settings-backdrop hidden";
backdrop.innerHTML =
`
<div class="chart-indicator-settings-dialog" role="dialog" aria-modal="true" aria-labelledby="chart-indicator-settings-title">
<header class="chart-indicator-settings-header">
<h2 id="chart-indicator-settings-title" class="chart-indicator-settings-title"></h2>
<button type="button" class="chart-indicator-settings-close" aria-label="Закрыть">×</button>
</header>
<div class="chart-indicator-settings-body"></div>
<footer class="chart-indicator-settings-footer">
<button type="button" class="chart-indicator-settings-done">Готово</button>
</footer>
</div>
`;

(
document.body
).appendChild(
backdrop
);

const titleEl =
backdrop.querySelector(
".chart-indicator-settings-title"
);
const bodyEl =
backdrop.querySelector(
".chart-indicator-settings-body"
);
const dialogEl =
backdrop.querySelector(
".chart-indicator-settings-dialog"
);
const headerEl =
backdrop.querySelector(
".chart-indicator-settings-header"
);
const closeBtn =
backdrop.querySelector(
".chart-indicator-settings-close"
);
const doneBtn =
backdrop.querySelector(
".chart-indicator-settings-done"
);

let activeIndicator =
null;
let onCloseCallback =
null;
let dragState =
null;

function getBoundsRect(){

const el =
getDragBoundsEl?.();

if(
!el
){
return null;
}

return el.getBoundingClientRect();

}

function clampDialogPosition(
left,
top
){

const bounds =
getBoundsRect();

if(
!bounds
){
return {
left,
top
};
}

const rect =
dialogEl.getBoundingClientRect();
const w =
rect.width;
const h =
rect.height;
const minLeft =
bounds.left +
DRAG_MARGIN_PX;
const minTop =
bounds.top +
DRAG_MARGIN_PX;
const maxLeft =
Math.max(
minLeft,
bounds.right -
w -
DRAG_MARGIN_PX
);
const maxTop =
Math.max(
minTop,
bounds.bottom -
h -
DRAG_MARGIN_PX
);

return {
left:
Math.min(
Math.max(
left,
minLeft
),
maxLeft
),
top:
Math.min(
Math.max(
top,
minTop
),
maxTop
)
};

}

function applyDialogPosition(
left,
top
){

const next =
clampDialogPosition(
left,
top
);

dialogEl.style.left =
`${next.left}px`;
dialogEl.style.top =
`${next.top}px`;
dialogEl.classList.add(
"chart-indicator-settings-dialog--positioned"
);

}

function resetDialogPosition(){

dialogEl.style.left =
"";
dialogEl.style.top =
"";
dialogEl.classList.remove(
"chart-indicator-settings-dialog--positioned"
);

}

function centerDialogInBounds(){

const bounds =
getBoundsRect();

if(
!bounds
){
return;
}

const w =
dialogEl.offsetWidth;
const h =
dialogEl.offsetHeight;

applyDialogPosition(
bounds.left +
(
bounds.width -
w
) /
2,
bounds.top +
(
bounds.height -
h
) /
2
);

}

function relayoutDialog(){

if(
backdrop.classList.contains(
"hidden"
)
){
return;
}

if(
dialogEl.classList.contains(
"chart-indicator-settings-dialog--positioned"
)
){
const rect =
dialogEl.getBoundingClientRect();
applyDialogPosition(
rect.left,
rect.top
);
return;
}

centerDialogInBounds();

}

function onWindowResize(){

relayoutDialog();

}

function onHeaderPointerDown(
event
){

if(
event.button !==
0 ||
event.target.closest(
".chart-indicator-settings-close"
)
){
return;
}

const rect =
dialogEl.getBoundingClientRect();

dragState =
{
pointerId:
event.pointerId,
offsetX:
event.clientX -
rect.left,
offsetY:
event.clientY -
rect.top
};

headerEl?.setPointerCapture(
event.pointerId
);
headerEl?.classList.add(
"chart-indicator-settings-header--dragging"
);
event.preventDefault();

}

function onHeaderPointerMove(
event
){

if(
!dragState ||
dragState.pointerId !==
event.pointerId
){
return;
}

applyDialogPosition(
event.clientX -
dragState.offsetX,
event.clientY -
dragState.offsetY
);

}

function onHeaderPointerEnd(
event
){

if(
!dragState ||
dragState.pointerId !==
event.pointerId
){
return;
}

dragState =
null;
headerEl?.classList.remove(
"chart-indicator-settings-header--dragging"
);

try{
headerEl?.releasePointerCapture(
event.pointerId
);
}catch{
/* ignore */
}

}

function hide(){

backdrop.classList.add(
"hidden"
);
document.body.classList.remove(
"chart-indicator-modal-open"
);
closeIndicatorColorPicker();
activeIndicator?.onSettingsDialogClose?.();
activeIndicator =
null;
onCloseCallback =
null;
bodyEl.innerHTML =
"";
dialogEl.className =
"chart-indicator-settings-dialog";
resetDialogPosition();
dragState =
null;
headerEl?.classList.remove(
"chart-indicator-settings-header--dragging"
);

}

function show(
indicator,
{
onClose
} = {}
){

if(
!indicator?.populateSettingsDialog
){
return;
}

activeIndicator =
indicator;
onCloseCallback =
onClose ||
null;

titleEl.textContent =
indicator.settingsDialogTitle ||
indicator.label ||
"Настройки";

bodyEl.innerHTML =
"";

indicator.populateSettingsDialog(
bodyEl,
{
close:
hide
}
);

dialogEl.className =
"chart-indicator-settings-dialog";

if(
indicator.settingsDialogClass
){
dialogEl.classList.add(
indicator.settingsDialogClass
);
}

resetDialogPosition();
backdrop.classList.remove(
"hidden"
);
document.body.classList.add(
"chart-indicator-modal-open"
);

requestAnimationFrame(
()=>{
requestAnimationFrame(
centerDialogInBounds
);
}
);

}

function onBackdropPointerDown(
event
){

event.stopPropagation();

if(
event.target ===
backdrop
){
hide();

if(
onCloseCallback
){
onCloseCallback();
}

}

}

backdrop.addEventListener(
"click",
onBackdropPointerDown
);

backdrop.querySelector(
".chart-indicator-settings-dialog"
)?.addEventListener(
"click",
event=>{
event.stopPropagation();
}
);

headerEl?.addEventListener(
"pointerdown",
onHeaderPointerDown
);
headerEl?.addEventListener(
"pointermove",
onHeaderPointerMove
);
headerEl?.addEventListener(
"pointerup",
onHeaderPointerEnd
);
headerEl?.addEventListener(
"pointercancel",
onHeaderPointerEnd
);

closeBtn?.addEventListener(
"click",
event=>{
event.stopPropagation();
hide();

if(
onCloseCallback
){
onCloseCallback();
}

}
);

doneBtn?.addEventListener(
"click",
event=>{
event.stopPropagation();
hide();

if(
onCloseCallback
){
onCloseCallback();
}

}
);

document.addEventListener(
"keydown",
event=>{

if(
event.key !==
"Escape" ||
backdrop.classList.contains(
"hidden"
)
){
return;
}

hide();

if(
onCloseCallback
){
onCloseCallback();
}

}
);

window.addEventListener(
"resize",
onWindowResize
);

return {
show,
hide,
destroy:()=>{
hide();
window.removeEventListener(
"resize",
onWindowResize
);
document.body.classList.remove(
"chart-indicator-modal-open"
);
backdrop.remove();
}
};

}
