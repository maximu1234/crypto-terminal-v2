/**
 * Left-toolbar flyout for Elliott Waves subtypes.
 */
import {
openChromeSurface,
closeChromeSurface
} from "../chrome-motion.js?v=5";

import {
ELLIOTT_WAVE_TYPES,
ELLIOTT_PATTERN_TYPES,
ELLIOTT_TOOL_META,
isElliottType
} from "./elliott-spec.js?v=23";

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
tool,
pointerType: e.pointerType
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
openChromeSurface(
el
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

const btn =
anchorBtn;

anchorBtn =
null;

if(
btn
){
btn.classList.remove(
"draw-tool-group-btn--open"
);
btn.setAttribute(
"aria-expanded",
"false"
);
}

if(
!flyoutEl
){
return;
}

closeChromeSurface(
flyoutEl
);

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

const ELLIOTT_DEFAULT_TOOL =
ELLIOTT_WAVE_TYPES[
0
];

function openFlyout(
btn
){

if(
!btn
){
return;
}

if(
anchorBtn ===
btn &&
isElliottFlyoutOpen()
){
positionFlyout(
btn
);
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

openFlyout(
btn
);

}

function pickDefaultTool(
btn,
pointerType
){

closeElliottFlyout();

const host =
resolvePickHost(
btn
);

if(
!host ||
!ELLIOTT_DEFAULT_TOOL
){
return;
}

host.dispatchEvent(
new CustomEvent(
"draw-pick-tool",
{
bubbles: true,
detail: {
tool: ELLIOTT_DEFAULT_TOOL,
pointerType: pointerType ||
"mouse"
}
}
)
);

}

function wantsToolMenu(
e
){

return e?.button ===
2 ||
e?.ctrlKey ===
true;

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

if(
e.pointerType ===
"touch"
){
toggleFlyout(
groupBtn
);
return;
}

if(
wantsToolMenu(
e
)
){
openFlyout(
groupBtn
);
return;
}

pickDefaultTool(
groupBtn,
e.pointerType
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

function onDocContextMenu(
e
){

const groupBtn =
e.target.closest?.(
"[data-draw-tool-group=\"elliott\"]"
);

if(
!groupBtn ||
e.pointerType ===
"touch"
){
return;
}

e.preventDefault();
e.stopPropagation();
openFlyout(
groupBtn
);

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
"contextmenu",
onDocContextMenu,
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
