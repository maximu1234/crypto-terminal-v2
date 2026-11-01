import {
CHART_PRICE_SCALE_MODE_LOGARITHMIC,
CHART_PRICE_SCALE_MODE_REGULAR
} from "../chart/price-scale-mode.js?v=7deaefee";

import {
isTerminalPage
} from "./terminal-state.js?v=4747a92f";

const PANE_TARGETS =
[
"rsi",
"ao",
"macd"
];

export function mountCoinsScaleInvertMenu(
deps
){

const {
setCoinsChartPriceScaleMode,
toggleCoinsChartInversion,
toggleCoinsRsiInversion,
toggleCoinsAoInversion,
toggleCoinsMacdInversion
} = deps;


if(
!isTerminalPage ||
!deps.chartWrapEl ||
!deps.chartEl
){
return ()=>{};
}

const paneSpecs =
{
rsi: {
wrapId: "rsi-wrap",
chartId: "rsi-chart",
stripId: "rsi-scale-touch-strip",
getInverted: ()=>
deps.isCoinsRsiInverted,
toggle: ()=>
toggleCoinsRsiInversion?.(),
getChart: ()=>
deps.rsiChart
},
ao: {
wrapId: "ao-wrap",
chartId: "ao-chart",
stripId: "ao-scale-touch-strip",
getInverted: ()=>
deps.isCoinsAoInverted,
toggle: ()=>
toggleCoinsAoInversion?.(),
getChart: ()=>
deps.getPaneChart?.(
"ao"
)
},
macd: {
wrapId: "macd-wrap",
chartId: "macd-chart",
stripId: "macd-scale-touch-strip",
getInverted: ()=>
deps.isCoinsMacdInverted,
toggle: ()=>
toggleCoinsMacdInversion?.(),
getChart: ()=>
deps.getPaneChart?.(
"macd"
)
}
};

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

const pane =
paneSpecs[
menuTarget
];
const inverted =
pane
? !!pane.getInverted()
: deps.isCoinsChartInverted;

item.textContent =
inverted
? "Вернуть обычную шкалу"
: "Перевернуть график";

item.title =
menuTarget ===
"price"
? inverted
? "Вернуть обычную шкалу (Alt+I)"
: "Перевернуть график (Alt+I)"
: "";

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

priceModeBox.hidden =
menuTarget !==
"price";

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
"price" ||
PANE_TARGETS.includes(
target
)
? target
: "price";

syncMenuState();

const margin = 8;
menu.classList.remove("hidden");
menu.style.left = "0px";
menu.style.top = "0px";

const menuRect =
menu.getBoundingClientRect();
const pane =
paneSpecs[
menuTarget
];
const anchorEl =
pane
? document.getElementById(
pane.chartId
)
: deps.chartEl;

if(
!anchorEl ||
(
pane &&
getComputedStyle(
document.getElementById(
pane.wrapId
) ||
anchorEl
).display ===
"none"
)
){
hideMenu();
return;
}

const chartRect =
anchorEl.getBoundingClientRect();
const scaleChart =
pane
? pane.getChart()
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

function isInChartScale(
chartDomEl,
lwChart,
clientX,
clientY
){

if(
!chartDomEl
){
return false;
}

const wrap =
chartDomEl.closest?.(
"#ao-wrap, #macd-wrap, #rsi-wrap"
);

if(
wrap &&
(
wrap.classList.contains(
"indicator-pane-hidden"
) ||
getComputedStyle(
wrap
).display ===
"none"
)
){
return false;
}

const rect =
chartDomEl.getBoundingClientRect();
const localX =
clientX - rect.left;
const localY =
clientY - rect.top;
const scaleW =
lwChart?.priceScale?.(
"right"
)?.width?.() ||
56;

return (
localY >= 0 &&
localY <= rect.height &&
localX >= rect.width - scaleW &&
localX <= rect.width
);

}

function isInPriceScale(
clientX,
clientY
){

return isInChartScale(
deps.chartEl,
deps.chart,
clientX,
clientY
);

}

function isInPaneScale(
paneId,
clientX,
clientY
){

const pane =
paneSpecs[
paneId
];

if(
!pane
){
return false;
}

return isInChartScale(
document.getElementById(
pane.chartId
),
pane.getChart(),
clientX,
clientY
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

const scaleStripEl =
document.getElementById(
"price-scale-touch-strip"
);

const touchTargetEl =
resolveTouchTarget(
scaleStripEl,
deps.chartWrapEl
);

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
520
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

const pane =
paneSpecs[
menuTarget
];

if(
pane
){
pane.toggle();
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

const unbindFns =
[
bindTouchHold(
touchTargetEl,
isInPriceScale,
"price"
)
];

for(
const paneId of PANE_TARGETS
){

const pane =
paneSpecs[
paneId
];
const wrapEl =
document.getElementById(
pane.wrapId
);
const stripEl =
document.getElementById(
pane.stripId
);

if(
!wrapEl
){
continue;
}

const onPaneContextMenu =
e=>{

if(
!isInPaneScale(
paneId,
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
paneId
);

};

wrapEl.addEventListener(
"contextmenu",
onPaneContextMenu,
true
);

unbindFns.push(
()=>{
wrapEl.removeEventListener(
"contextmenu",
onPaneContextMenu,
true
);
}
);

unbindFns.push(
bindTouchHold(
resolveTouchTarget(
stripEl,
wrapEl
),
(x, y)=>
isInPaneScale(
paneId,
x,
y
),
paneId
)
);

}

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
deps.shouldIgnoreListKeyNav(
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
for(
const unbind of unbindFns
){
unbind?.();
}
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
