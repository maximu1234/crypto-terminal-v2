/**
 * Algo chart stack: hold the shared switch veil until the price scale is
 * stable and the RSI pane has been laid out, then reveal candles and
 * indicator panes together.
 */
import {
createCoinsChartSwitchVeil
} from "../terminal/terminal-chart-switch-veil.js?v=a93ba7fd";

const RSI_SETTLE_MAX_FRAMES = 6;
const RSI_SETTLE_WAIT_MS = 2000;

let veil = null;
let getLoadSeq = () => 0;
let pending = null;

function ensureVeil(){

if(
veil
){
return veil;
}

veil =
createCoinsChartSwitchVeil(
()=>
document.getElementById(
"charts-stack-panes"
),
()=>
getLoadSeq()
);

return veil;

}

function clearWait(){

if(
pending?.timer
){
clearTimeout(
pending.timer
);
pending.timer =
0;
}

}

export function bindAlgoChartPaneSettle(
readLoadSeq
){

getLoadSeq =
typeof readLoadSeq ===
"function"
? readLoadSeq
: ()=>
0;

}

export function beginAlgoChartPaneSettle(
loadSeq,
{
waitForRsi = true
} = {}
){

ensureVeil().startChartSwitchVeil();
clearWait();
pending = {
seq:
loadSeq,
dataReady:
!waitForRsi,
viewportReady:
false,
running:
false,
timer:
0,
chart:
null,
layout:
null
};

}

export function finishAlgoChartPaneSettle(
loadSeq
){

if(
pending &&
pending.seq !==
loadSeq
){
return;
}

clearWait();
pending =
null;
ensureVeil().finishChartSwitchVeil(
loadSeq
);

}

function reveal(
loadSeq
){

if(
!pending ||
pending.seq !==
loadSeq
){
return;
}

const layout =
pending.layout;

try{
layout?.();
}catch{
/* ignore */
}

finishAlgoChartPaneSettle(
loadSeq
);

}

function arm(
loadSeq
){

if(
!pending ||
pending.seq !==
loadSeq ||
!pending.dataReady ||
!pending.viewportReady ||
pending.running
){
return;
}

pending.running =
true;
clearWait();

const chart =
pending.chart;
let tries =
0;
let prev =
0;

const step =
()=>{

if(
!pending ||
pending.seq !==
loadSeq
){
return;
}

let width =
0;

try{
width =
chart?.priceScale?.(
"right"
)?.width?.() ||
0;
}catch{
width =
0;
}

const stable =
prev >
0 &&
Math.abs(
width -
prev
) <=
1;

prev =
width;
tries +=
1;

if(
stable ||
tries >=
RSI_SETTLE_MAX_FRAMES
){
requestAnimationFrame(
()=>
reveal(
loadSeq
)
);
return;
}

requestAnimationFrame(
step
);

};

requestAnimationFrame(
step
);

}

export function noteAlgoRsiPlaced(
loadSeq
){

if(
!pending ||
pending.seq !==
loadSeq
){
return;
}

pending.dataReady =
true;
arm(
loadSeq
);

}

export function noteAlgoChartViewportReady(
loadSeq,
chart,
layout
){

if(
!pending ||
pending.seq !==
loadSeq
){
return;
}

pending.viewportReady =
true;
pending.chart =
chart ||
null;
pending.layout =
typeof layout ===
"function"
? layout
: null;

if(
!pending.dataReady &&
!pending.timer
){
pending.timer =
setTimeout(
()=>{
reveal(
loadSeq
);
},
RSI_SETTLE_WAIT_MS
);
}

arm(
loadSeq
);

}
