/**
 * Left-toolbar flyout for Elliott Waves subtypes.
 */
import {
ELLIOTT_WAVE_TYPES,
ELLIOTT_PATTERN_TYPES,
ELLIOTT_TOOL_META,
isElliottType
} from "./elliott-spec.js?v=12";

const FLYOUT_CLASS =
"elliott-flyout";

let flyoutEl =
null;
let anchorBtn =
null;
let docBound =
false;

function ensureFlyout(){

if(
flyoutEl
){
return flyoutEl;
}

const el =
document.createElement(
"div"
);

el.className =
`${FLYOUT_CLASS} hidden`;
el.setAttribute(
"role",
"menu"
);

function flyoutItemHtml(
id
){

const meta =
ELLIOTT_TOOL_META[
id
];

return `<button type="button" class="elliott-flyout-item" role="menuitem" data-elliott-tool="${id}">${meta.title}</button>`;

}

el.innerHTML =
[
...ELLIOTT_WAVE_TYPES.map(
flyoutItemHtml
),
`<div class="elliott-flyout-sep" role="separator"></div>`,
...ELLIOTT_PATTERN_TYPES.map(
flyoutItemHtml
)
].join(
""
);

document.body.appendChild(
el
);
flyoutEl =
el;

el.addEventListener(
"pointerdown",
e=>{

e.preventDefault();
e.stopPropagation();

const item =
e.target.closest(
"[data-elliott-tool]"
);

if(
!item
){
return;
}

const tool =
item.dataset.elliottTool;
const host =
resolvePickHost(
anchorBtn
);

closeElliottFlyout();

if(
!host ||
!tool
){
return;
}

host.dispatchEvent(
new CustomEvent(
"draw-pick-tool",
{
bubbles: true,
detail: {
tool
}
}
)
);

},
true
);

return el;

}

function resolvePickHost(
btn
){

return btn?.closest(
"#draw-toolbar, .draw-tools, .widget-draw-tools-menu, [data-draw-toolbar]"
) ||
btn?.closest(
".widget-draw-tools"
) ||
null;

}

function positionFlyout(
btn
){

const el =
ensureFlyout();
const rect =
btn.getBoundingClientRect();
const pad =
6;
const vw =
window.innerWidth;
const vh =
window.innerHeight;

el.classList.remove(
"hidden"
);

const menuW =
Math.max(
el.offsetWidth ||
280,
260
);
const menuH =
el.offsetHeight ||
180;

let left =
rect.right +
pad;
let top =
rect.top;

if(
left +
menuW >
vw -
8
){
left =
rect.left -
menuW -
pad;
}

if(
left <
8
){
left =
8;
}

if(
top +
menuH >
vh -
8
){
top =
Math.max(
8,
vh -
menuH -
8
);
}

el.style.left =
`${Math.round(left)}px`;
el.style.top =
`${Math.round(top)}px`;

}

export function closeElliottFlyout(){

if(
flyoutEl
){
flyoutEl.classList.add(
"hidden"
);
}

if(
anchorBtn
){
anchorBtn.classList.remove(
"draw-tool-group-btn--open"
);
anchorBtn.setAttribute(
"aria-expanded",
"false"
);
}

anchorBtn =
null;

}

export function isElliottFlyoutOpen(){

return !!(
flyoutEl &&
!flyoutEl.classList.contains(
"hidden"
)
);

}

export function isElliottFlyoutEvent(
e
){

const t =
e?.target;

if(
!t?.closest
){
return false;
}

return !!(
t.closest(
`.${FLYOUT_CLASS}`
) ||
t.closest(
"[data-draw-tool-group=\"elliott\"]"
)
);

}

function toggleFlyout(
btn
){

if(
anchorBtn ===
btn &&
isElliottFlyoutOpen()
){
closeElliottFlyout();
return;
}

closeElliottFlyout();
anchorBtn =
btn;
btn.classList.add(
"draw-tool-group-btn--open"
);
btn.setAttribute(
"aria-expanded",
"true"
);
positionFlyout(
btn
);

}

function onDocPointerDown(
e
){

const groupBtn =
e.target.closest?.(
"[data-draw-tool-group=\"elliott\"]"
);

if(
groupBtn
){
e.preventDefault();
e.stopPropagation();
toggleFlyout(
groupBtn
);
return;
}

if(
e.target.closest?.(
`.${FLYOUT_CLASS}`
)
){
return;
}

closeElliottFlyout();

}

function onDocKeyDown(
e
){

if(
e.key ===
"Escape" &&
isElliottFlyoutOpen()
){
closeElliottFlyout();
}

}

function onViewportChange(){

if(
isElliottFlyoutOpen() &&
anchorBtn
){
positionFlyout(
anchorBtn
);
}

}

export function ensureElliottToolbarEvents(){

if(
docBound ||
typeof document ===
"undefined"
){
return;
}

docBound =
true;
ensureFlyout();

document.addEventListener(
"pointerdown",
onDocPointerDown,
true
);

document.addEventListener(
"keydown",
onDocKeyDown,
true
);

window.addEventListener(
"resize",
onViewportChange
);

window.addEventListener(
"scroll",
onViewportChange,
true
);

}

export function syncElliottGroupActive(
root,
tool
){

if(
!root
){
return;
}

const on =
isElliottType(
tool
);

root.querySelectorAll(
"[data-draw-tool-group=\"elliott\"]"
).forEach(
btn=>{
btn.classList.toggle(
"active",
on
);
}
);

}
