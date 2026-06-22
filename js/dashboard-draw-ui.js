import {
DRAW_TOOLS_PALETTE_ICON_SVG,
DRAW_TOOLS_GUEST_MSG,
TRASH_ICON_SVG,
SETTINGS_ICON_SVG,
getDrawToolbarButtonsHtml
} from "./draw-ui-shared.js?v=23";

import {
isCloudLoggedInEffective
} from "./cloud-sync.js?v=38";

const widgetDrawMenuClosers =
new Set();

let drawToolsMenuDocBound =
false;

function bindDrawToolsMenuDocument(){

if(
drawToolsMenuDocBound
){
return;
}

drawToolsMenuDocBound = true;

document.addEventListener(
"click",
e=>{

if(
e.target.closest(
".widget-draw-tools-toggle"
)
){
return;
}

if(
e.target.closest(
".widget-draw-tools [data-draw-tool]"
)
){
closeAllWidgetDrawToolsMenus();
return;
}

if(
e.target.closest(
".draw-tool-clear-all"
)
){
return;
}

if(
e.target.closest(
".widget-draw-tools"
)
){
return;
}

closeAllWidgetDrawToolsMenus();

}
);

document.addEventListener(
"keydown",
e=>{

if(
e.key ===
"Escape"
){
closeAllWidgetDrawToolsMenus();
}

}
);

}

export function closeAllWidgetDrawToolsMenus(){

widgetDrawMenuClosers.forEach(
close=>{
close();
}
);

}

export function resetWidgetDrawToolsMenus(){

closeAllWidgetDrawToolsMenus();
widgetDrawMenuClosers.clear();

}

export function initWidgetDrawToolsDropdown(
container
){

if(
!container
){
return;
}

bindDrawToolsMenuDocument();

const toggle =
container.querySelector(
".widget-draw-tools-toggle"
);

const menu =
container.querySelector(
".widget-draw-tools-menu"
);

const widgetEl =
container.closest(
".widget"
);

if(
!toggle ||
!menu
){
return;
}

function close(){

menu.classList.add(
"hidden"
);

toggle.setAttribute(
"aria-expanded",
"false"
);

container.classList.remove(
"widget-draw-tools--open"
);

widgetEl?.classList.remove(
"widget-draw-tools-open"
);

}

function open(){

closeAllWidgetDrawToolsMenus();

menu.classList.remove(
"hidden"
);

toggle.setAttribute(
"aria-expanded",
"true"
);

container.classList.add(
"widget-draw-tools--open"
);

widgetEl?.classList.add(
"widget-draw-tools-open"
);

}

toggle.addEventListener(
"click",
e=>{

e.stopPropagation();

if(
!isCloudLoggedInEffective()
){
window.alert(
DRAW_TOOLS_GUEST_MSG
);
return;
}

if(
menu.classList.contains(
"hidden"
)
){
open();
}else{
close();
}

}
);

widgetDrawMenuClosers.add(
close
);

}

export function wireWidgetDrawToolMenu(
container,
{
pickTool,
onClearAll,
onActivate
} = {}
){

const menu =
container?.querySelector(
".widget-draw-tools-menu"
);

if(
!menu
){
return;
}

function runClearAllFromMenu(
e
){

const clearBtn =
e.target.closest(
".draw-tool-clear-all"
);

if(
!clearBtn
){
return false;
}

e.preventDefault();
e.stopPropagation();

onActivate?.(e);

const cleared =
onClearAll?.();

if(
cleared === false
){
console.warn(
"[Multichart] Очистка графика недоступна — обновите страницу (Cmd+Shift+R)"
);
}

queueMicrotask(
()=>{
closeAllWidgetDrawToolsMenus();
}
);

return true;

}

menu.addEventListener(
"pointerdown",
e=>{

if(
runClearAllFromMenu(
e
)
){
return;
}

},
true
);

function runPickTool(
e
){

const btn =
e.target.closest(
"[data-draw-tool]"
);

if(
!btn ||
btn.closest(
".draw-tool-clear-all"
)
){
return false;
}

onActivate?.(e);
pickTool(
btn.dataset.drawTool
);
closeAllWidgetDrawToolsMenus();
return true;

}

function onMenuPick(
e
){

if(
!pickTool
){
return;
}

if(
runPickTool(
e
)
){
e.preventDefault();
e.stopPropagation();
}

}

menu.addEventListener(
"pointerdown",
onMenuPick,
true
);

menu.addEventListener(
"click",
onMenuPick,
true
);

}

export function getWidgetToolbarHtml(){

return `

<div class="widget-draw-tools">

<button type="button" class="draw-btn draw-btn-sm widget-draw-tools-toggle" title="Объекты рисования" aria-label="Объекты рисования" aria-haspopup="true" aria-expanded="false">
${DRAW_TOOLS_PALETTE_ICON_SVG}
</button>

<div class="widget-draw-tools-menu hidden" role="menu">
${getDrawToolbarButtonsHtml({ compact: true })}
</div>

</div>

`;

}

export function getWidgetChartUiHtml(){

return `

<div class="draw-style-float hidden">

<button type="button" class="float-drag draw-style-drag" title="Перетащить">
<span class="drag-dots"></span>
</button>

<button type="button" class="float-template draw-template-btn" title="Шаблоны" aria-label="Шаблоны" aria-haspopup="menu" aria-expanded="false">
<img class="draw-tool-icon" src="assets/draw-toolbar-icons/template.png" width="18" height="18" alt="" aria-hidden="true">
</button>

<button type="button" class="float-color-btn draw-color-btn" title="Цвет">
<svg class="pencil-icon" viewBox="0 0 24 24" aria-hidden="true">
<path fill="none" stroke="currentColor" stroke-width="1.5" d="M4 20l4-1 9-9-3-3-9 9-1 4zM14 6l3 3"/>
</svg>
<span class="color-stripe draw-color-stripe"></span>
</button>

<button type="button" class="float-width-btn draw-width-btn" title="Толщина">
<span class="width-line-preview draw-width-preview"></span>
<span class="draw-width-label">1px</span>
</button>

<label class="draw-position-risk hidden" title="Сумма риска при срабатывании стопа">
<span class="draw-position-risk-label">Стоп-лосс ($)</span>
<input type="number" class="draw-position-risk-input" min="0" step="any" placeholder="" inputmode="decimal"/>
</label>

<button type="button" class="float-settings draw-settings-btn" title="Настройки">
${SETTINGS_ICON_SVG}
</button>

<button type="button" class="float-delete draw-delete-one-btn" title="Удалить">
${TRASH_ICON_SVG}
</button>

</div>

<div class="draw-popover draw-color-popover hidden"></div>

<div class="draw-popover draw-width-popover hidden">
<button type="button" class="width-option active" data-width="1"><span class="width-sample" style="height:1px"></span><span>1</span></button>
<button type="button" class="width-option" data-width="2"><span class="width-sample" style="height:2px"></span><span>2</span></button>
<button type="button" class="width-option" data-width="3"><span class="width-sample" style="height:3px"></span><span>3</span></button>
<button type="button" class="width-option" data-width="4"><span class="width-sample" style="height:4px"></span><span>4</span></button>
</div>

<div class="draw-popover draw-settings-popover draw-settings-popover--fib hidden">
</div>

<div class="draw-popover draw-template-menu hidden" role="menu" aria-label="Шаблоны"></div>

`;

}
