import {
closeIndicatorColorPicker
} from "./indicator-color-picker-ui.js?v=1";

/**
 * Модальное окно настроек индикатора (двойной клик по легенде).
 */
export function createIndicatorSettingsDialog(
mountEl
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

backdrop.classList.remove(
"hidden"
);
document.body.classList.add(
"chart-indicator-modal-open"
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

return {
show,
hide,
destroy:()=>{
hide();
document.body.classList.remove(
"chart-indicator-modal-open"
);
backdrop.remove();
}
};

}
