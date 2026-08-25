/**
 * Хоткеи ТФ и инструментов рисования на АлгоТрейдинг.
 * Split from js/algo-trading.js — поведение 1:1.
 */
import {
COINS_TF_HOTKEYS,
COINS_TF_VALUES
} from "../terminal/terminal-state.js?v=12";

export const ALGO_POSITION_DRAW_HOTKEYS =
new Map(
[
[
"KeyL",
"long"
],
[
"KeyS",
"short"
],
[
"KeyF",
"fib"
],
[
"KeyR",
"rectangle"
],
[
"KeyH",
"hline"
],
[
"KeyJ",
"hray"
],
[
"KeyA",
"trendline"
],
[
"KeyB",
"brush"
],
[
"KeyC",
"channel"
]
]
);

export function shouldIgnoreAlgoHotkey(
event
){

if(
event.defaultPrevented
){
return true;
}

if(
event.metaKey ||
event.ctrlKey ||
event.altKey ||
event.shiftKey
){
return true;
}

const target =
event.target;
const tag =
target?.tagName?.toLowerCase?.();

if(
tag ===
"input" ||
tag ===
"textarea" ||
tag ===
"select" ||
target?.isContentEditable
){
return true;
}

return false;

}

export function bindAlgoPageHotkeys(
{
getDisposed,
getSymbol,
loadSymbol,
getDrawingTools
}
){

function onAlgoTfHotkey(
event
){

if(
getDisposed() ||
shouldIgnoreAlgoHotkey(
event
)
){
return;
}

const nextTf =
COINS_TF_HOTKEYS[
event.key
];

if(
!nextTf ||
!COINS_TF_VALUES.has(
nextTf
)
){
return;
}

event.preventDefault();
void loadSymbol(
getSymbol(),
nextTf
);

}

function onAlgoDrawHotkey(
event
){

if(
getDisposed() ||
shouldIgnoreAlgoHotkey(
event
)
){
return;
}

const tool =
ALGO_POSITION_DRAW_HOTKEYS.get(
event.code
);
const drawingTools =
getDrawingTools();

if(
!tool ||
!drawingTools?.pickDrawTool
){
return;
}

event.preventDefault();
drawingTools.pickDrawTool(
tool
);

}

window.addEventListener(
"keydown",
onAlgoTfHotkey
);
window.addEventListener(
"keydown",
onAlgoDrawHotkey
);

return function unbindAlgoPageHotkeys(){

window.removeEventListener(
"keydown",
onAlgoTfHotkey
);
window.removeEventListener(
"keydown",
onAlgoDrawHotkey
);

};

}
