/**
 * Left-toolbar flyout for Fib Retracement / Trend-Based Fib Extension.
 */
import {
getDrawToolIconSrc
} from "../draw-toolbar-icon-data.js?v=39";

import {
closeElliottFlyout
} from "./elliott-toolbar.js?v=3";

import {
FIB_EXT_TYPE,
FIB_RETRACEMENT_TYPE,
isFibType
} from "./fib-spec.js?v=17";

const FLYOUT_CLASS =
"fib-flyout";

const FIB_TOOL_ITEMS =
Object.freeze([
{
id: FIB_RETRACEMENT_TYPE,
icon: "fib",
title: "Fib Retracement (F)"
},
{
id: FIB_EXT_TYPE,
icon: "fiba-ext",
title: "Trend-Based Fib Extension"
}
]);

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

el.innerHTML =
FIB_TOOL_ITEMS.map(
item=>{

const src =
getDrawToolIconSrc(
item.icon
);

return `<button type="button" class="fib-flyout-item" role="menuitem" data-fib-tool="${item.id}"><img class="draw-tool-icon" src="${src}" alt="" aria-hidden="true" decoding="async"><span>${item.title}</span></button>`;

}
).join(
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
"[data-fib-tool]"
);

if(
!item
){
return;
}

const tool =
item.dataset.fibTool;
const host =
resolvePickHost(
anchorBtn
);

closeFibFlyout();

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
el.offsetWidth,
280
);
const menuH =
el.offsetHeight;
let left =
rect.right +
pad;
let top =
rect.top;

if(
left +
menuW >
vw -
pad
){
left =
Math.max(
pad,
rect.left -
menuW -
pad
);
}

if(
top +
menuH >
vh -
pad
){
top =
Math.max(
pad,
vh -
menuH -
pad
);
}

el.style.left =
`${Math.round(left)}px`;
el.style.top =
`${Math.round(top)}px`;

}

export function isFibFlyoutOpen(){

return !!(
flyoutEl &&
!flyoutEl.classList.contains(
"hidden"
)
);

}

export function closeFibFlyout(){

if(
!flyoutEl
){
return;
}

flyoutEl.classList.add(
"hidden"
);

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

export function isFibFlyoutEvent(
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
"[data-draw-tool-group=\"fib\"]"
)
);

}

function toggleFlyout(
btn
){

if(
anchorBtn ===
btn &&
isFibFlyoutOpen()
){
closeFibFlyout();
return;
}

closeElliottFlyout();
closeFibFlyout();
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
"[data-draw-tool-group=\"fib\"]"
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

closeFibFlyout();

}

function onDocKeyDown(
e
){

if(
e.key ===
"Escape" &&
isFibFlyoutOpen()
){
closeFibFlyout();
}

}

function onViewportChange(){

if(
isFibFlyoutOpen() &&
anchorBtn
){
positionFlyout(
anchorBtn
);
}

}

export function ensureFibToolbarEvents(){

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

export function syncFibGroupActive(
root,
tool
){

if(
!root
){
return;
}

const on =
isFibType(
tool
);

root.querySelectorAll(
"[data-draw-tool-group=\"fib\"]"
).forEach(
btn=>{
btn.classList.toggle(
"active",
on
);
}
);

}
