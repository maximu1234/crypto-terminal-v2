import {
CHART_PRICE_SCALE_MODE_LOGARITHMIC,
CHART_PRICE_SCALE_MODE_REGULAR
} from "../chart/price-scale-mode.js?v=7deaefee";

import {
isTerminalPage
} from "./terminal-state.js?v=4747a92f";

export function mountCoinsScaleInvertMenu(
deps
){

const {
setCoinsChartPriceScaleMode,
toggleCoinsChartInversion,
toggleCoinsRsiInversion
} = deps;


if(
!isTerminalPage ||
!deps.chartWrapEl ||
!deps.chartEl
){
return ()=>{};
}

const rsiWrapEl =
document.getElementById(
"rsi-wrap"
);

const rsiChartEl =
document.getElementById(
"rsi-chart"
);

const scaleStripEl =
document.getElementById(
"price-scale-touch-strip"
);

const rsiScaleStripEl =
document.getElementById(
"rsi-scale-touch-strip"
);

/** Длиннее окна double-tap по шкале (~320–500 ms), короче случайного long-press при pan */
const HOLD_MS =
520;

const menu =
document.createElement("div");
menu.className =
"chart-scale-context-menu hidden";
menu.setAttribute(
"role",
"menu"
);

const priceModeBox =
document.createElement("div");
priceModeBox.className =
"chart-scale-context-menu-price-modes";

function makeModeItem(
mode,
label
){

const btn =
document.createElement("button");
btn.type = "button";
btn.className =
"chart-scale-context-menu-item";
btn.textContent =
label;
btn.dataset.priceScaleMode =
mode;
btn.setAttribute(
"role",
"menuitemradio"
);
return btn;

}

const regularItem =
makeModeItem(
CHART_PRICE_SCALE_MODE_REGULAR,
"Regular"
);

const logItem =
makeModeItem(
CHART_PRICE_SCALE_MODE_LOGARITHMIC,
"Logarithmic"
);

const sep =
document.createElement("div");
sep.className =
"chart-scale-context-menu-sep";
sep.setAttribute(
"role",
"separator"
);

priceModeBox.appendChild(regularItem);
priceModeBox.appendChild(logItem);
priceModeBox.appendChild(sep);

const item =
document.createElement("button");
item.type = "button";
item.className =
"chart-scale-context-menu-item";
item.setAttribute(
"role",
"menuitem"
);

menu.appendChild(priceModeBox);
menu.appendChild(item);
document.body.appendChild(menu);

let menuTarget =
"price";

function syncMenuState(){

const inverted =
menuTarget ===
"rsi"
? deps.isCoinsRsiInverted
: deps.isCoinsChartInverted;

item.textContent =
inverted
? "Вернуть обычную шкалу"
: "Перевернуть график";

item.title =
menuTarget ===
"rsi"
? ""
: inverted
? "Вернуть обычную шкалу (Alt+I)"
: "Перевернуть график (Alt+I)";

item.setAttribute(
"aria-pressed",
inverted
? "true"
: "false"
);

const isRegular =
deps.coinsPriceScaleMode ===
CHART_PRICE_SCALE_MODE_REGULAR;

regularItem.classList.toggle(
"is-checked",
isRegular
);
logItem.classList.toggle(
"is-checked",
!isRegular
);
regularItem.setAttribute(
"aria-checked",
isRegular
? "true"
: "false"
);
logItem.setAttribute(
"aria-checked",
isRegular
? "false"
: "true"
);

const showModes =
menuTarget ===
"price";

priceModeBox.hidden =
!showModes;

}

syncMenuState();

let touchHoldTimer =
null;
let touchStartX = 0;
let touchStartY = 0;

function hideMenu(){
menu.classList.add("hidden");
}

function showMenuAt(
clientX,
clientY,
target =
menuTarget
){

menuTarget =
target ===
"rsi"
? "rsi"
: "price";

syncMenuState();

const margin = 8;
menu.classList.remove("hidden");
menu.style.left = "0px";
menu.style.top = "0px";

const menuRect =
menu.getBoundingClientRect();
const anchorEl =
menuTarget ===
"rsi"
? rsiChartEl
: deps.chartEl;

if(
!anchorEl
){
hideMenu();
return;
}

const chartRect =
anchorEl.getBoundingClientRect();
const scaleChart =
menuTarget ===
"rsi"
? deps.rsiChart
: deps.chart;

const scaleW =
scaleChart?.priceScale?.(
"right"
)?.width?.() ||
56;

const scaleLeft =
chartRect.right - scaleW;

let left =
Math.round(
scaleLeft - menuRect.width
);
let top =
Math.round(
clientY - menuRect.height / 2
);

const chartLeft =
chartRect.left + margin;

if(
left <
chartLeft
){
left =
Math.round(
chartLeft
);
}

left = Math.max(
margin,
left
);

if(
top + menuRect.height >
window.innerHeight - margin
){
top =
window.innerHeight - margin - menuRect.height;
}

if(
top <
margin
){
top =
margin;
}

menu.style.left =
`${left}px`;
menu.style.top =
`${top}px`;

}

function isInPriceScale(
clientX,
clientY
){

const rect =
deps.chartEl.getBoundingClientRect();
const localX =
clientX - rect.left;
const localY =
clientY - rect.top;
const scaleW =
deps.chart.priceScale(
"right"
)?.width?.() || 56;

return (
localY >= 0 &&
localY <= rect.height &&
localX >= rect.width - scaleW &&
localX <= rect.width
);

}

function isInRsiScale(
clientX,
clientY
){

if(
!rsiChartEl
){
return false;
}

const rect =
rsiChartEl.getBoundingClientRect();
const localX =
clientX - rect.left;
const localY =
clientY - rect.top;
const scaleW =
deps.rsiChart?.priceScale?.(
"right"
)?.width?.() || 56;

return (
localY >= 0 &&
localY <= rect.height &&
localX >= rect.width - scaleW &&
localX <= rect.width
);

}

function resolveTouchTarget(
stripEl,
wrapEl
){

if(
stripEl &&
getComputedStyle(
stripEl
).display !==
"none"
){
return stripEl;
}

return wrapEl;

}

const touchTargetEl =
resolveTouchTarget(
scaleStripEl,
deps.chartWrapEl
);

const rsiTouchTargetEl =
rsiWrapEl
? resolveTouchTarget(
rsiScaleStripEl,
rsiWrapEl
)
: null;

const onDesktopContextMenu =
e=>{

if(
!isInPriceScale(
e.clientX,
e.clientY
)
){
hideMenu();
return;
}

e.preventDefault();
e.stopPropagation();
showMenuAt(
e.clientX,
e.clientY,
"price"
);

};

const onRsiDesktopContextMenu =
e=>{

if(
!isInRsiScale(
e.clientX,
e.clientY
)
){
hideMenu();
return;
}

e.preventDefault();
e.stopPropagation();
showMenuAt(
e.clientX,
e.clientY,
"rsi"
);

};

const onTouchMove =
e=>{

if(
!touchHoldTimer ||
!e.touches ||
e.touches.length !== 1
){
return;
}

const t = e.touches[0];
const dx =
t.clientX - touchStartX;
const dy =
t.clientY - touchStartY;

if(
dx * dx + dy * dy >
64
){
clearTimeout(
touchHoldTimer
);
touchHoldTimer =
null;
}

};

const onTouchEnd = ()=>{
clearTimeout(
touchHoldTimer
);
touchHoldTimer =
null;
};

function bindTouchHold(
targetEl,
hitScale,
scaleTarget
){

if(
!targetEl
){
return ()=>{};
}

const onTouchStart =
e=>{

if(
!e.touches ||
e.touches.length !== 1
){
return;
}

const t = e.touches[0];

if(
targetEl === deps.chartWrapEl &&
!hitScale(
t.clientX,
t.clientY
)
){
return;
}

if(
targetEl === rsiWrapEl &&
!hitScale(
t.clientX,
t.clientY
)
){
return;
}

touchStartX = t.clientX;
touchStartY = t.clientY;

clearTimeout(
touchHoldTimer
);

touchHoldTimer =
setTimeout(
()=>{
showMenuAt(
touchStartX,
touchStartY,
scaleTarget
);
},
HOLD_MS
);

};

const cap =
{ capture:true, passive:true };

targetEl.addEventListener(
"touchstart",
onTouchStart,
cap
);
targetEl.addEventListener(
"touchmove",
onTouchMove,
cap
);
targetEl.addEventListener(
"touchend",
onTouchEnd,
cap
);
targetEl.addEventListener(
"touchcancel",
onTouchEnd,
cap
);

return ()=>{
targetEl.removeEventListener(
"touchstart",
onTouchStart,
true
);
targetEl.removeEventListener(
"touchmove",
onTouchMove,
true
);
targetEl.removeEventListener(
"touchend",
onTouchEnd,
true
);
targetEl.removeEventListener(
"touchcancel",
onTouchEnd,
true
);
};

}

const onDocPointerDown =
e=>{

if(
menu.contains(e.target)
){
return;
}

hideMenu();

};

item.addEventListener(
"click",
e=>{
e.preventDefault();
e.stopPropagation();

if(
menuTarget ===
"rsi"
){
toggleCoinsRsiInversion();
}else{
toggleCoinsChartInversion();
}

syncMenuState();
hideMenu();
}
);

function onPriceScaleModeClick(
mode
){

return e=>{
e.preventDefault();
e.stopPropagation();
setCoinsChartPriceScaleMode(
mode
);
syncMenuState();
hideMenu();
};

}

regularItem.addEventListener(
"click",
onPriceScaleModeClick(
CHART_PRICE_SCALE_MODE_REGULAR
)
);

logItem.addEventListener(
"click",
onPriceScaleModeClick(
CHART_PRICE_SCALE_MODE_LOGARITHMIC
)
);

deps.chartWrapEl.addEventListener(
"contextmenu",
onDesktopContextMenu,
true
);

if(
rsiWrapEl
){
rsiWrapEl.addEventListener(
"contextmenu",
onRsiDesktopContextMenu,
true
);
}

const unbindPriceTouch =
bindTouchHold(
touchTargetEl,
isInPriceScale,
"price"
);

const unbindRsiTouch =
bindTouchHold(
rsiTouchTargetEl,
isInRsiScale,
"rsi"
);

document.addEventListener(
"pointerdown",
onDocPointerDown,
true
);
window.addEventListener(
"blur",
hideMenu
);
window.addEventListener(
"resize",
hideMenu
);
window.addEventListener(
"scroll",
hideMenu,
true
);

function onInvertChartHotkey(
e
){

if(
!isTerminalPage
){
return;
}

if(
shouldIgnoreListKeyNav(
e
)
){
return;
}

/*
  Option+I (Mac) и Alt+I (Windows/Linux) — в браузере оба дают altKey.
*/
if(
!e.altKey ||
e.ctrlKey ||
e.metaKey ||
e.code !==
"KeyI"
){
return;
}

e.preventDefault();
hideMenu();
toggleCoinsChartInversion();
syncMenuState();

}

document.addEventListener(
"keydown",
onInvertChartHotkey
);

return ()=>{
hideMenu();
clearTimeout(touchHoldTimer);
deps.chartWrapEl.removeEventListener(
"contextmenu",
onDesktopContextMenu,
true
);
if(
rsiWrapEl
){
rsiWrapEl.removeEventListener(
"contextmenu",
onRsiDesktopContextMenu,
true
);
}
unbindPriceTouch();
unbindRsiTouch();
document.removeEventListener(
"pointerdown",
onDocPointerDown,
true
);
document.removeEventListener(
"keydown",
onInvertChartHotkey
);
window.removeEventListener(
"blur",
hideMenu
);
window.removeEventListener(
"resize",
hideMenu
);
window.removeEventListener(
"scroll",
hideMenu,
true
);
menu.remove();
};

}
