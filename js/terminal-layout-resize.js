/**
 * Десктоп /coins и /trade: перетаскивание границ списка монет и RSI.
 * Дефолты = текущая статичная вёрстка; минимумы = те же размеры.
 */
import {
COINS_LIST_DEFAULT_PX,
COINS_LIST_MIN_PX,
COINS_RSI_MIN_DESKTOP_PX,
COINS_PANEL_MIN_RATIO,
defaultRsiHeightPx,
defaultVolumeHeightPx,
defaultAoHeightPx,
computeCoinsLayoutLimits,
computeVolumeHeightLimits,
computeAoHeightLimits,
clampCoinsListWidth,
clampCoinsRsiHeight,
clampCoinsVolumeHeight,
clampCoinsAoHeight
} from "./terminal-layout-math.js?v=5";

import {
isTerminalPage
} from "./terminal/terminal-state.js?v=7";

export {
COINS_LIST_DEFAULT_PX,
COINS_LIST_MIN_PX,
COINS_RSI_MIN_DESKTOP_PX,
COINS_PANEL_MIN_RATIO,
defaultRsiHeightPx,
defaultVolumeHeightPx,
defaultAoHeightPx,
computeCoinsLayoutLimits,
computeVolumeHeightLimits,
computeAoHeightLimits,
clampCoinsListWidth,
clampCoinsRsiHeight,
clampCoinsVolumeHeight,
clampCoinsAoHeight
};

export const COINS_LAYOUT_KEY =
"coins_layout_v1";

const DESKTOP_MQ =
"(min-width:641px)";

export function readCoinsLayoutPrefs(){

try{

const raw =
localStorage.getItem(
COINS_LAYOUT_KEY
);

if(
!raw
){
return {
listWidth:null,
rsiHeight:null,
volumeHeight:null,
aoHeight:null
};
}

const parsed =
JSON.parse(
raw
);

const listWidth =
Number.isFinite(
parsed?.listWidth
)
? parsed.listWidth
: null;

const rsiHeight =
Number.isFinite(
parsed?.rsiHeight
)
? parsed.rsiHeight
: null;

const volumeHeight =
Number.isFinite(
parsed?.volumeHeight
)
? parsed.volumeHeight
: null;

const aoHeight =
Number.isFinite(
parsed?.aoHeight
)
? parsed.aoHeight
: null;

return {
listWidth,
rsiHeight,
volumeHeight,
aoHeight
};

}catch{

return {
listWidth:null,
rsiHeight:null,
volumeHeight:null,
aoHeight:null
};

}

}

export function writeCoinsLayoutPrefs(
prefs
){

try{

const out = {
listWidth:
Number.isFinite(
prefs?.listWidth
)
? prefs.listWidth
: null,
rsiHeight:
Number.isFinite(
prefs?.rsiHeight
)
? prefs.rsiHeight
: null,
volumeHeight:
Number.isFinite(
prefs?.volumeHeight
)
? prefs.volumeHeight
: null,
aoHeight:
Number.isFinite(
prefs?.aoHeight
)
? prefs.aoHeight
: null
};

if(
out.listWidth ===
null &&
out.rsiHeight ===
null &&
out.volumeHeight ===
null &&
out.aoHeight ===
null
){

localStorage.removeItem(
COINS_LAYOUT_KEY
);
return;

}

localStorage.setItem(
COINS_LAYOUT_KEY,
JSON.stringify(
out
)
);

}catch{
/* ignore */
}

}

function isDesktopCoinsLayout(){

return (
typeof window !==
"undefined" &&
isTerminalPage &&
window.matchMedia(
DESKTOP_MQ
).matches
);

}

export function mountCoinsLayoutResize(
{
onLayoutChange = ()=>{}
} = {}
){

if(
!isDesktopCoinsLayout()
){
return ()=>{};
}

const app =
document.getElementById(
"app"
);

const list =
document.getElementById(
"list"
);

const chartsStack =
document.getElementById(
"charts-stack"
);

const rsiWrap =
document.getElementById(
"rsi-wrap"
);

const volumeWrap =
document.getElementById(
"volume-wrap"
);

const aoWrap =
document.getElementById(
"ao-wrap"
);

if(
!app ||
!list ||
!chartsStack ||
!rsiWrap ||
!volumeWrap
){

return ()=>{};
}

const saved =
readCoinsLayoutPrefs();

let listWidth =
saved.listWidth;
let rsiHeight =
saved.rsiHeight;
let volumeHeight =
saved.volumeHeight;
let aoHeight =
saved.aoHeight;

let dragMode =
null;
let dragStartX =
0;
let dragStartY =
0;
let dragStartListW =
0;
let dragStartRsiH =
0;
let dragStartVolumeH =
0;
let dragStartAoH =
0;

const hHandle =
document.createElement(
"div"
);

hHandle.className =
"coins-layout-resize coins-layout-resize--h";
hHandle.setAttribute(
"role",
"separator"
);
hHandle.setAttribute(
"aria-orientation",
"vertical"
);
hHandle.setAttribute(
"aria-label",
"Ширина списка монет"
);
hHandle.tabIndex =
0;

const vHandle =
document.createElement(
"div"
);

vHandle.className =
"coins-layout-resize coins-layout-resize--v";
vHandle.setAttribute(
"role",
"separator"
);
vHandle.setAttribute(
"aria-orientation",
"horizontal"
);
vHandle.setAttribute(
"aria-label",
"Высота RSI"
);
vHandle.tabIndex =
0;

const volumeVHandle =
document.createElement(
"div"
);

volumeVHandle.className =
"coins-layout-resize coins-layout-resize--v";
volumeVHandle.setAttribute(
"role",
"separator"
);
volumeVHandle.setAttribute(
"aria-orientation",
"horizontal"
);
volumeVHandle.setAttribute(
"aria-label",
"Высота Volume"
);
volumeVHandle.tabIndex =
0;

const aoVHandle =
document.createElement(
"div"
);

aoVHandle.className =
"coins-layout-resize coins-layout-resize--v";
aoVHandle.setAttribute(
"role",
"separator"
);
aoVHandle.setAttribute(
"aria-orientation",
"horizontal"
);
aoVHandle.setAttribute(
"aria-label",
"Высота AO"
);
aoVHandle.tabIndex =
0;

list.appendChild(
hHandle
);
if(
aoWrap
){
aoWrap.appendChild(
aoVHandle
);
}
volumeWrap.appendChild(
volumeVHandle
);
rsiWrap.appendChild(
vHandle
);

function measureLimits(){

const stackH =
chartsStack.clientHeight;

const rsiVisible =
!rsiWrap.classList.contains(
"indicator-pane-hidden"
);

const volumeVisible =
!volumeWrap.classList.contains(
"indicator-pane-hidden"
);

const aoVisible =
!!aoWrap &&
!aoWrap.classList.contains(
"indicator-pane-hidden"
);

const innerHeight =
window.innerHeight;

const currentRsiH =
rsiVisible
? (
rsiHeight ??
defaultRsiHeightPx(
innerHeight
)
)
: 0;

const currentVolumeH =
volumeVisible
? (
volumeHeight ??
defaultVolumeHeightPx(
innerHeight
)
)
: 0;

const currentAoH =
aoVisible
? (
aoHeight ??
defaultAoHeightPx(
innerHeight
)
)
: 0;

const layoutLimits =
computeCoinsLayoutLimits(
{
appWidth:
app.clientWidth,
chartsStackHeight:
stackH,
innerHeight,
volumeOccupiedHeight:
volumeVisible
? currentVolumeH
: 0,
aoOccupiedHeight:
aoVisible
? currentAoH
: 0
}
);

const volumeLimits =
computeVolumeHeightLimits(
{
innerHeight
}
);

const aoLimits =
computeAoHeightLimits(
{
innerHeight
}
);

return {
...layoutLimits,
...volumeLimits,
...aoLimits
};

}

let layoutChangeRaf =
0;

function notifyLayoutChange(
immediate = false
){

if(
immediate ||
!dragMode
){

if(
layoutChangeRaf
){
cancelAnimationFrame(
layoutChangeRaf
);
layoutChangeRaf =
0;
}

onLayoutChange();
return;

}

if(
layoutChangeRaf
){
return;
}

layoutChangeRaf =
requestAnimationFrame(
()=>{

layoutChangeRaf =
0;
onLayoutChange();

}
);

}

function applyLayout(
{
persist = false
} = {}
){

const limits =
measureLimits();

if(
listWidth ==
null
){

app.style.removeProperty(
"--coins-list-w"
);

}else{

listWidth =
clampCoinsListWidth(
listWidth,
limits
);

app.style.setProperty(
"--coins-list-w",
`${listWidth}px`
);

}

if(
rsiHeight ==
null
){

rsiWrap.style.removeProperty(
"--coins-rsi-h"
);

}else{

rsiHeight =
clampCoinsRsiHeight(
rsiHeight,
limits
);

rsiWrap.style.setProperty(
"--coins-rsi-h",
`${rsiHeight}px`
);

}

if(
volumeHeight ==
null
){

volumeWrap.style.removeProperty(
"--coins-volume-h"
);

}else{

volumeHeight =
clampCoinsVolumeHeight(
volumeHeight,
limits
);

volumeWrap.style.setProperty(
"--coins-volume-h",
`${volumeHeight}px`
);

}

if(
!aoWrap
){
/* AO pane missing */
}else if(
aoHeight ==
null
){

aoWrap.style.removeProperty(
"--coins-ao-h"
);

}else{

aoHeight =
clampCoinsAoHeight(
aoHeight,
limits
);

aoWrap.style.setProperty(
"--coins-ao-h",
`${aoHeight}px`
);

}

if(
persist
){

writeCoinsLayoutPrefs(
{
listWidth,
rsiHeight,
volumeHeight,
aoHeight
}
);

}

notifyLayoutChange(
persist
);

}

function beginDrag(
mode,
clientX,
clientY
){

dragMode =
mode;
dragStartX =
clientX;
dragStartY =
clientY;

const limits =
measureLimits();

dragStartListW =
listWidth ??
limits.defaultListW;

dragStartRsiH =
rsiHeight ??
limits.defaultRsiH;

dragStartVolumeH =
volumeHeight ??
limits.defaultVolumeH;

dragStartAoH =
aoHeight ??
limits.defaultAoH;

document.body.classList.add(
mode ===
"h"
? "coins-layout-dragging-h"
: "coins-layout-dragging-v"
);

}

function onPointerDown(
mode
){

return (
e
)=>{

if(
e.button !==
0
){
return;
}

e.preventDefault();
e.stopPropagation();

beginDrag(
mode,
e.clientX,
e.clientY
);

if(
e.pointerId !=
null
){

try{

(
mode ===
"h"
? hHandle
: mode ===
"volume"
? volumeVHandle
: mode ===
"ao"
? aoVHandle
: vHandle
).setPointerCapture(
e.pointerId
);

}catch{
/* ignore */
}

}

};

}

function onPointerMove(
e
){

if(
!dragMode
){
return;
}

if(
dragMode ===
"h"
){

const delta =
e.clientX -
dragStartX;

listWidth =
dragStartListW -
delta;

}else if(
dragMode ===
"volume"
){

const delta =
dragStartY -
e.clientY;

volumeHeight =
dragStartVolumeH +
delta;

}else if(
dragMode ===
"ao"
){

const delta =
dragStartY -
e.clientY;

aoHeight =
dragStartAoH +
delta;

}else{

const delta =
dragStartY -
e.clientY;

rsiHeight =
dragStartRsiH +
delta;

}

applyLayout();

}

function endDrag(){

if(
!dragMode
){
return;
}

dragMode =
null;

document.body.classList.remove(
"coins-layout-dragging-h",
"coins-layout-dragging-v"
);

applyLayout(
{
persist:true
}
);

}

hHandle.addEventListener(
"pointerdown",
onPointerDown(
"h"
)
);

vHandle.addEventListener(
"pointerdown",
onPointerDown(
"rsi"
)
);

volumeVHandle.addEventListener(
"pointerdown",
onPointerDown(
"volume"
)
);

if(
aoWrap
){

aoVHandle.addEventListener(
"pointerdown",
onPointerDown(
"ao"
)
);

}

window.addEventListener(
"pointermove",
onPointerMove
);

window.addEventListener(
"pointerup",
endDrag
);

window.addEventListener(
"pointercancel",
endDrag
);

const desktopMq =
window.matchMedia(
DESKTOP_MQ
);

function onViewportChange(){

if(
!desktopMq.matches
){

return;
}

applyLayout();

}

window.addEventListener(
"resize",
onViewportChange,
{
passive:true
}
);

desktopMq.addEventListener?.(
"change",
onViewportChange
);

let layoutObserver =
null;

if(
typeof ResizeObserver !==
"undefined"
){

layoutObserver =
new ResizeObserver(
onViewportChange
);

layoutObserver.observe(
app
);

layoutObserver.observe(
chartsStack
);

}

applyLayout();

return ()=>{

if(
layoutChangeRaf
){
cancelAnimationFrame(
layoutChangeRaf
);
layoutChangeRaf =
0;
}

hHandle.remove();
vHandle.remove();
volumeVHandle.remove();
aoVHandle.remove();
window.removeEventListener(
"pointermove",
onPointerMove
);
window.removeEventListener(
"pointerup",
endDrag
);
window.removeEventListener(
"pointercancel",
endDrag
);
window.removeEventListener(
"resize",
onViewportChange
);
desktopMq.removeEventListener?.(
"change",
onViewportChange
);
layoutObserver?.disconnect();
document.body.classList.remove(
"coins-layout-dragging-h",
"coins-layout-dragging-v"
);
app.style.removeProperty(
"--coins-list-w"
);
rsiWrap.style.removeProperty(
"--coins-rsi-h"
);
volumeWrap.style.removeProperty(
"--coins-volume-h"
);
aoWrap?.style.removeProperty(
"--coins-ao-h"
);

};

}
