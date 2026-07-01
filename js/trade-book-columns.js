/**
 * Панель позиций — ширины колонок и перетаскивание границ.
 *
 * Колонки — фиксированные px (таблица скроллится горизонтально).
 * Ресайз: граница тянет левую колонку; ширину берём у правой соседней,
 * а если та на min — левая растёт и таблица становится шире.
 */
const STORAGE_KEY =
"trade_book_columns_v5";

/** @type {Readonly<Record<string, { default: number, min: number, max?: number }>>} */
export const POSITION_COLUMN_WIDTHS =
Object.freeze({
ticker:{
default:
136,
min:
48,
max:
440
},
pnl:{
default:
116,
min:
96,
max:
280
},
volume:{
default:
116,
min:
48,
max:
220
},
entry:{
default:
144,
min:
56,
max:
240
},
liq:{
default:
144,
min:
56,
max:
240
}
});

const RESIZABLE_KEYS =
[
"ticker",
"pnl",
"volume",
"entry",
"liq"
];

const RESIZE_PAIRS =
[
[
"ticker",
"pnl"
],
[
"pnl",
"volume"
],
[
"volume",
"entry"
],
[
"entry",
"liq"
]
];

function clampWidth(
key,
value
){

const meta =
POSITION_COLUMN_WIDTHS[
key
];
const max =
meta.max ??
9999;
return Math.max(
meta.min,
Math.min(
max,
Math.round(
value
)
)
);

}

function readRaw(){

try{
const raw =
localStorage.getItem(
STORAGE_KEY
);
if(
!raw
){
return {};
}
const parsed =
JSON.parse(
raw
);
return parsed &&
typeof parsed ===
"object"
? parsed
: {};
}catch{
return {};
}

}

export function readPositionColumnWidths(){

const raw =
readRaw();
const out =
{};

for(
const key of
RESIZABLE_KEYS
){

const meta =
POSITION_COLUMN_WIDTHS[
key
];
const saved =
Number(
raw[
key
]
);

out[
key
] =
Number.isFinite(
saved
)
? clampWidth(
key,
saved
)
: meta.default;

}

return out;

}

function writePositionColumnWidths(
widths
){

try{
localStorage.setItem(
STORAGE_KEY,
JSON.stringify(
widths
)
);
}catch{
/* ignore */
}

}

function applyVars(
root,
widths
){

if(
!root
){
return;
}

root.style.setProperty(
"--tb-col-ticker",
`${widths.ticker}px`
);
root.style.setProperty(
"--tb-col-pnl",
`${widths.pnl}px`
);
root.style.setProperty(
"--tb-col-volume",
`${widths.volume}px`
);
root.style.setProperty(
"--tb-col-entry",
`${widths.entry}px`
);
root.style.setProperty(
"--tb-col-liq",
`${widths.liq}px`
);

}

function readPositionColumnWidthsFromPanel(
panel
){

const styles =
getComputedStyle(
panel
);
const parse =
name=>
Math.round(
parseFloat(
styles.getPropertyValue(
name
)
) ||
0
);

const out =
{};

for(
const key of
RESIZABLE_KEYS
){
out[
key
] =
clampWidth(
key,
parse(
`--tb-col-${key}`
)
);
}

return out;

}

function columnWidth(
widths,
key
){

if(
Object.hasOwn(
widths,
key
)
){
return widths[
key
];
}

return POSITION_COLUMN_WIDTHS[
key
]?.default ??
0;

}

function isResizableColumn(
key
){

return RESIZABLE_KEYS.includes(
key
);

}

/**
 * delta > 0 — разделитель вправо (левая шире).
 * delta < 0 — разделитель влево (левая уже).
 */
function resizePair(
widths,
leftKey,
rightKey,
delta
){

const right =
columnWidth(
widths,
rightKey
);
const leftMeta =
POSITION_COLUMN_WIDTHS[
leftKey
];
const rightMeta =
POSITION_COLUMN_WIDTHS[
rightKey
];
const leftMax =
leftMeta.max ??
9999;
const rightMax =
rightMeta.max ??
9999;
const rightMin =
rightMeta.min ??
0;

const left =
widths[
leftKey
];

if(
delta >
0
){

const growRoom =
leftMax -
left;

if(
growRoom <=
0
){
return widths;
}

const actualGrow =
Math.min(
delta,
growRoom
);
const steal =
Math.min(
actualGrow,
right -
rightMin
);

const next =
{
...widths,
[leftKey]:
clampWidth(
leftKey,
left +
actualGrow
)
};

if(
isResizableColumn(
rightKey
)
){
next[
rightKey
] =
clampWidth(
rightKey,
right -
steal
);
}

return next;

}

if(
delta <
0
){

const shrinkRoom =
left -
leftMeta.min;

if(
shrinkRoom <=
0
){
return widths;
}

const actualShrink =
Math.min(
-delta,
shrinkRoom
);
const give =
Math.min(
actualShrink,
rightMax -
right
);

const next =
{
...widths,
[leftKey]:
clampWidth(
leftKey,
left -
actualShrink
)
};

if(
isResizableColumn(
rightKey
)
){
next[
rightKey
] =
clampWidth(
rightKey,
right +
give
);
}

return next;

}

return widths;

}

export function applyPositionColumnLayout(
panel
){

applyVars(
panel,
readPositionColumnWidths()
);

}

export function wirePositionColumnResize(
panel,
tableHead
){

if(
!panel ||
!tableHead
){
return;
}

applyPositionColumnLayout(
panel
);

for(
const handle of
tableHead.querySelectorAll(
"[data-resize-col]"
)
){

if(
handle.dataset.resizeBound ===
"1"
){
continue;
}

handle.dataset.resizeBound =
"1";

handle.addEventListener(
"pointerdown",
event=>{

if(
event.button !==
0
){
return;
}

event.preventDefault();
event.stopPropagation();

const leftKey =
handle.dataset.resizeCol;
const pair =
RESIZE_PAIRS.find(
(
[
left
]
)=>
left ===
leftKey
);

if(
!pair
){
return;
}

const [
,
rightKey
] =
pair;
const startX =
event.clientX;
const initial =
readPositionColumnWidthsFromPanel(
panel
);

const onMove =
moveEvent=>{

const delta =
moveEvent.clientX -
startX;
const next =
resizePair(
initial,
leftKey,
rightKey,
delta
);
applyVars(
panel,
next
);

};

const onUp =
()=>{

document.body.classList.remove(
"trade-book-cols-dragging"
);
window.removeEventListener(
"pointermove",
onMove
);
window.removeEventListener(
"pointerup",
onUp
);
window.removeEventListener(
"pointercancel",
onUp
);
writePositionColumnWidths(
readPositionColumnWidthsFromPanel(
panel
)
);

};

document.body.classList.add(
"trade-book-cols-dragging"
);
window.addEventListener(
"pointermove",
onMove
);
window.addEventListener(
"pointerup",
onUp
);
window.addEventListener(
"pointercancel",
onUp
);

}
);

}

}

export function columnResizeHandle(
colKey
){

return `<span class="trade-book-col-resize" data-resize-col="${colKey}" role="separator" aria-orientation="vertical" title="Изменить ширину колонки"></span>`;

}
