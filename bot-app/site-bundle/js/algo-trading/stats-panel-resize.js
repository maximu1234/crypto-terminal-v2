/**
 * Ресайз панели «Данные» на АлгоТрейдинг.
 * Split from js/algo-trading.js — поведение 1:1.
 */
const ALGO_STATS_PANEL_CSS_MAX_H =
420;
const ALGO_STATS_PANEL_H_KEY =
"algo_stats_panel_height_v1";

function readAlgoStatsPanelHeight(){

try{
const n =
Number(
localStorage.getItem(
ALGO_STATS_PANEL_H_KEY
)
);

if(
Number.isFinite(
n
) &&
n >=
0
){
return Math.round(
n
);
}
}catch{
/* ignore */
}

return null;

}

function writeAlgoStatsPanelHeight(
h
){

try{
localStorage.setItem(
ALGO_STATS_PANEL_H_KEY,
String(
Math.max(
0,
Math.round(
h
)
)
)
);
}catch{
/* ignore */
}

}

/**
 * Панель «Данные»: текущая высота = максимум; вниз можно сжать до 0.
 * Высота запоминается в localStorage между заходами на страницу.
 * @param {() => void} [onLayout]
 * @param {(collapsed: boolean, wasCollapsed: boolean) => void} [onCollapsedChange]
 * @returns {() => void}
 */
export function bindAlgoStatsPanelResize(
onLayout,
onCollapsedChange
){

const panel =
document.getElementById(
"algo-stats-panel"
);
const handle =
document.getElementById(
"algo-stats-resize"
);

if(
!panel ||
!handle
){
return ()=>{};
}

let maxH =
0;
let currentH =
0;
let dragStartY =
0;
let dragStartH =
0;
let dragging =
false;

function notifyLayout(){

onLayout?.();

}

function applyHeight(
h
){

const next =
Math.max(
0,
Math.min(
maxH ||
ALGO_STATS_PANEL_CSS_MAX_H,
Math.round(
h
)
)
);

currentH =
next;
panel.style.setProperty(
"--algo-stats-panel-h",
`${next}px`
);
panel.style.setProperty(
"--algo-stats-panel-max-h",
`${maxH || ALGO_STATS_PANEL_CSS_MAX_H}px`
);
panel.style.flex =
`0 0 ${next}px`;
panel.style.height =
`${next}px`;

const wasCollapsed =
panel.classList.contains(
"is-collapsed"
);
const collapsed =
next <=
0;

panel.classList.toggle(
"is-collapsed",
collapsed
);
onCollapsedChange?.(
collapsed,
wasCollapsed
);

handle.setAttribute(
"aria-valuenow",
String(
next
)
);
handle.setAttribute(
"aria-valuemax",
String(
maxH ||
ALGO_STATS_PANEL_CSS_MAX_H
)
);

}

function measureNaturalHeight(){

panel.style.setProperty(
"--algo-stats-panel-max-h",
`${ALGO_STATS_PANEL_CSS_MAX_H}px`
);
panel.style.removeProperty(
"--algo-stats-panel-h"
);
panel.style.removeProperty(
"flex"
);
panel.style.removeProperty(
"height"
);
panel.classList.remove(
"is-collapsed"
);

const natural =
Math.round(
panel.getBoundingClientRect().height
);

return Math.max(
0,
Math.min(
ALGO_STATS_PANEL_CSS_MAX_H,
natural ||
ALGO_STATS_PANEL_CSS_MAX_H
)
);

}

function captureMaxFromNatural(){

maxH =
measureNaturalHeight();

const saved =
readAlgoStatsPanelHeight();

applyHeight(
saved ==
null
? maxH
: Math.min(
maxH,
saved
)
);

}

/**
 * После смены бота в «Данные» другой блок: пересчитать max и дать вытянуть панель.
 */
function recaptureMaxFromNatural(){

const prevH =
currentH;
const prevMax =
maxH;
maxH =
measureNaturalHeight();

let next =
prevH;

if(
prevH <=
0 ||
prevMax <=
24
){
next =
maxH;
}else if(
prevH >=
prevMax -
1
){
next =
maxH;
}else{
next =
Math.min(
maxH,
prevH
);
}

applyHeight(
next
);
notifyLayout();

}

function onPointerMove(
event
){

if(
!dragging
){
return;
}

applyHeight(
dragStartH +
(
dragStartY -
event.clientY
)
);
notifyLayout();

}

function onPointerUp(){

if(
!dragging
){
return;
}

dragging =
false;
document.body.classList.remove(
"algo-stats-panel-dragging"
);
window.removeEventListener(
"pointermove",
onPointerMove
);
window.removeEventListener(
"pointerup",
onPointerUp
);
writeAlgoStatsPanelHeight(
currentH
);
notifyLayout();

}

function onPointerDown(
event
){

if(
event.button !=
null &&
event.button !==
0
){
return;
}

event.preventDefault();
dragging =
true;
dragStartY =
event.clientY;
dragStartH =
currentH;
document.body.classList.add(
"algo-stats-panel-dragging"
);
window.addEventListener(
"pointermove",
onPointerMove
);
window.addEventListener(
"pointerup",
onPointerUp
);

}

handle.setAttribute(
"aria-valuemin",
"0"
);
handle.addEventListener(
"pointerdown",
onPointerDown
);

requestAnimationFrame(
()=>{
requestAnimationFrame(
()=>{
captureMaxFromNatural();
notifyLayout();
}
);
}
);

function destroy(){

handle.removeEventListener(
"pointerdown",
onPointerDown
);
onPointerUp();

}

destroy.recapture =
recaptureMaxFromNatural;
return destroy;

}
