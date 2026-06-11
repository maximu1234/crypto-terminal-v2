/**
 * Десктоп /coins: перетаскивание границ списка монет и RSI.
 * Дефолты = текущая статичная вёрстка; минимумы = те же размеры.
 */
import {
COINS_LIST_DEFAULT_PX,
COINS_LIST_MIN_PX,
COINS_RSI_MIN_DESKTOP_PX,
COINS_PANEL_MIN_RATIO,
defaultRsiHeightPx,
computeCoinsLayoutLimits,
clampCoinsListWidth,
clampCoinsRsiHeight
} from "./coins-layout-math.js?v=2";

export {
COINS_LIST_DEFAULT_PX,
COINS_LIST_MIN_PX,
COINS_RSI_MIN_DESKTOP_PX,
COINS_PANEL_MIN_RATIO,
defaultRsiHeightPx,
computeCoinsLayoutLimits,
clampCoinsListWidth,
clampCoinsRsiHeight
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
rsiHeight:null
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

return {
listWidth,
rsiHeight
};

}catch{

return {
listWidth:null,
rsiHeight:null
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
: null
};

if(
out.listWidth ===
null &&
out.rsiHeight ===
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
window.location.pathname.includes(
"/coins"
) &&
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

if(
!app ||
!list ||
!chartsStack ||
!rsiWrap
){

return ()=>{};
}

const saved =
readCoinsLayoutPrefs();

let listWidth =
saved.listWidth;
let rsiHeight =
saved.rsiHeight;

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

list.appendChild(
hHandle
);
rsiWrap.appendChild(
vHandle
);

function measureLimits(){

return computeCoinsLayoutLimits(
{
appWidth:
app.clientWidth,
chartsStackHeight:
chartsStack.clientHeight,
innerHeight:
window.innerHeight
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
persist
){

writeCoinsLayoutPrefs(
{
listWidth,
rsiHeight
}
);

}

onLayoutChange();

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
"v"
)
);

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

hHandle.remove();
vHandle.remove();
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

};

}
