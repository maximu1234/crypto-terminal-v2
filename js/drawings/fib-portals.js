/** Global fib line-style / line-width dropdown portals (shared across chart instances). */
import {
normalizeFibLineStyle,
fibLineStyleMenuMarkup,
fibLineWidthMenuMarkup,
normalizeFibLevelWidth,
setFibLineStyleButton,
setFibLevelWidthButton
} from "./fib-spec.js?v=3";

let fibLineStyleMenuPortal = null;
let fibLineStyleMenuAnchor = null;
let fibLineWidthMenuPortal = null;
let fibLineWidthMenuAnchor = null;

let fibPanelCommitHook = null;

export function setFibPanelCommitHook(
fn
){
fibPanelCommitHook = fn;
}

export function runFibPanelCommitHook(){

if(
typeof fibPanelCommitHook ===
"function"
){
fibPanelCommitHook();
}

}

export function ensureFibLineStyleMenuPortal(){

if(fibLineStyleMenuPortal){
return fibLineStyleMenuPortal;
}

const el =
document.createElement("div");

el.className =
"fib-line-style-menu fib-line-style-menu--portal hidden";

el.innerHTML = fibLineStyleMenuMarkup();

document.body.appendChild(el);

el.addEventListener("mousedown", e=>{
e.stopPropagation();
});

el.addEventListener(
"click",
e=>{

const option =
e.target.closest(".fib-line-style-option");

if(
!option ||
!fibLineStyleMenuAnchor
){
return;
}

e.preventDefault();
e.stopPropagation();

setFibLineStyleButton(
fibLineStyleMenuAnchor,
option.dataset.lineStyle
);

closeAllFibLineStyleMenus();
runFibPanelCommitHook();

}
);

fibLineStyleMenuPortal = el;
return el;

}

export function closeAllFibLineStyleMenus(){

if(fibLineStyleMenuPortal){

fibLineStyleMenuPortal.classList.add("hidden");
fibLineStyleMenuPortal.style.left = "";
fibLineStyleMenuPortal.style.top = "";
fibLineStyleMenuPortal.style.position = "";
fibLineStyleMenuPortal.style.zIndex = "";

}

fibLineStyleMenuAnchor = null;

}

export function openFibLineStyleMenu(
btn
){

const menu =
ensureFibLineStyleMenuPortal();

fibLineStyleMenuAnchor = btn;

const current =
normalizeFibLineStyle(
btn.dataset.lineStyle
);

menu.querySelectorAll(".fib-line-style-option").forEach(opt=>{
opt.classList.toggle(
"active",
opt.dataset.lineStyle === current
);
});

menu.classList.remove("hidden");

const rect =
btn.getBoundingClientRect();

menu.style.position = "fixed";
menu.style.left = `${Math.round(rect.left)}px`;
menu.style.top = `${Math.round(rect.bottom + 4)}px`;
menu.style.zIndex = "20000";

}

export function closeAllFibLineWidthMenus(){

if(fibLineWidthMenuPortal){

fibLineWidthMenuPortal.classList.add("hidden");
fibLineWidthMenuPortal.style.left = "";
fibLineWidthMenuPortal.style.top = "";
fibLineWidthMenuPortal.style.position = "";
fibLineWidthMenuPortal.style.zIndex = "";

}

fibLineWidthMenuAnchor = null;

}

export function openFibLineWidthMenu(
btn,
fallbackWidth
){

const menu =
ensureFibLineWidthMenuPortal();

fibLineWidthMenuAnchor = btn;

const current =
normalizeFibLevelWidth(
btn.dataset.customWidth
) ||
normalizeFibLevelWidth(fallbackWidth) ||
1;

menu.querySelectorAll(".fib-line-width-option").forEach(opt=>{
opt.classList.toggle(
"active",
Number(opt.dataset.width) === current
);
});

menu.classList.remove("hidden");

const rect =
btn.getBoundingClientRect();

menu.style.position = "fixed";
menu.style.left = `${Math.round(rect.left)}px`;
menu.style.top = `${Math.round(rect.bottom + 4)}px`;
menu.style.zIndex = "10053";

}

export function ensureFibLineWidthMenuPortal(){

if(fibLineWidthMenuPortal){
return fibLineWidthMenuPortal;
}

const el =
document.createElement("div");

el.className =
"fib-line-width-menu fib-line-width-menu--portal hidden";

el.innerHTML = fibLineWidthMenuMarkup();

document.body.appendChild(el);

el.addEventListener("mousedown", e=>{
e.stopPropagation();
});

el.addEventListener(
"click",
e=>{

const option =
e.target.closest(".fib-line-width-option");

if(
!option ||
!fibLineWidthMenuAnchor
){
return;
}

e.preventDefault();
e.stopPropagation();

setFibLevelWidthButton(
fibLineWidthMenuAnchor,
Number(option.dataset.width),
1
);

closeAllFibLineWidthMenus();
runFibPanelCommitHook();

}
);

fibLineWidthMenuPortal = el;
return el;

}

export function isFibLineStyleMenuOpenForAnchor(
btn
){

return (
fibLineStyleMenuAnchor === btn &&
fibLineStyleMenuPortal &&
!fibLineStyleMenuPortal.classList.contains("hidden")
);

}

export function isFibLineWidthMenuOpenForAnchor(
btn
){

return (
fibLineWidthMenuAnchor === btn &&
fibLineWidthMenuPortal &&
!fibLineWidthMenuPortal.classList.contains("hidden")
);

}

export function fibPortalHitTest(
clientX,
clientY
){

for(
const el of
[
fibLineStyleMenuPortal,
fibLineWidthMenuPortal
]
){

if(
!el ||
el.classList.contains("hidden")
){
continue;
}

const r =
el.getBoundingClientRect();

if(
clientX >= r.left &&
clientX <= r.right &&
clientY >= r.top &&
clientY <= r.bottom
){
return true;
}

}

return false;

}

export function removeFibPortals(){

if(fibLineStyleMenuPortal){
fibLineStyleMenuPortal.remove();
fibLineStyleMenuPortal = null;
}

if(fibLineWidthMenuPortal){
fibLineWidthMenuPortal.remove();
fibLineWidthMenuPortal = null;
}

fibLineStyleMenuAnchor = null;
fibLineWidthMenuAnchor = null;
fibPanelCommitHook = null;

}

let fibPortalRetainCount =
0;

export function retainFibPortals(){

fibPortalRetainCount += 1;

}

export function releaseFibPortals(){

fibPortalRetainCount =
Math.max(
0,
fibPortalRetainCount - 1
);

if(
fibPortalRetainCount ===
0
){
removeFibPortals();
}

}
