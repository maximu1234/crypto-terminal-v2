/**
 * Панель позиций / ордеров — ширины колонок и перетаскивание границ.
 */
function createColumnModule(
config
){

const {
storageKey,
columnWidths,
resizableKeys,
resizePairs,
cssVarName
} =
config;

function clampWidth(
key,
value
){

const meta =
columnWidths[
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
storageKey
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

function readColumnWidths(){

const raw =
readRaw();
const out =
{};

for(
const key of
resizableKeys
){

const meta =
columnWidths[
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

function writeColumnWidths(
widths
){

try{
localStorage.setItem(
storageKey,
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

for(
const key of
resizableKeys
){
root.style.setProperty(
cssVarName(
key
),
`${widths[key]}px`
);
}

}

function readColumnWidthsFromPanel(
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
resizableKeys
){
out[
key
] =
clampWidth(
key,
parse(
cssVarName(
key
)
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

return columnWidths[
key
]?.default ??
0;

}

function isResizableColumn(
key
){

return resizableKeys.includes(
key
);

}

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
columnWidths[
leftKey
];
const rightMeta =
columnWidths[
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

function applyColumnLayout(
panel
){

applyVars(
panel,
readColumnWidths()
);

}

function wireColumnResize(
panel,
tableHead
){

if(
!panel ||
!tableHead
){
return;
}

applyColumnLayout(
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
resizePairs.find(
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
readColumnWidthsFromPanel(
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
writeColumnWidths(
readColumnWidthsFromPanel(
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

return {
columnWidths,
readColumnWidths,
applyColumnLayout,
wireColumnResize
};

}

const POSITION_STORAGE_KEY =
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

const positionColumns =
createColumnModule({
storageKey:
POSITION_STORAGE_KEY,
columnWidths:
POSITION_COLUMN_WIDTHS,
resizableKeys:
[
"ticker",
"pnl",
"volume",
"entry",
"liq"
],
resizePairs:
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
],
cssVarName:
key=>
`--tb-col-${key}`
});

const ORDER_STORAGE_KEY =
"trade_book_order_columns_v1";

/** @type {Readonly<Record<string, { default: number, min: number, max?: number }>>} */
export const ORDER_COLUMN_WIDTHS =
Object.freeze({
ticker:{
default:
136,
min:
48,
max:
440
},
type:{
default:
52,
min:
40,
max:
120
},
price:{
default:
96,
min:
56,
max:
220
},
time:{
default:
88,
min:
64,
max:
180
}
});

const orderColumns =
createColumnModule({
storageKey:
ORDER_STORAGE_KEY,
columnWidths:
ORDER_COLUMN_WIDTHS,
resizableKeys:
[
"ticker",
"type",
"price",
"time"
],
resizePairs:
[
[
"ticker",
"type"
],
[
"type",
"price"
],
[
"price",
"time"
]
],
cssVarName:
key=>
`--tb-order-col-${key}`
});

export function readPositionColumnWidths(){

return positionColumns.readColumnWidths();

}

export function applyPositionColumnLayout(
panel
){

positionColumns.applyColumnLayout(
panel
);

}

export function wirePositionColumnResize(
panel,
tableHead
){

positionColumns.wireColumnResize(
panel,
tableHead
);

}

export function applyOrderColumnLayout(
panel
){

orderColumns.applyColumnLayout(
panel
);

}

export function wireOrderColumnResize(
panel,
tableHead
){

orderColumns.wireColumnResize(
panel,
tableHead
);

}

const ALERT_STORAGE_KEY =
"trade_book_alert_columns_v2";

/** @type {Readonly<Record<string, { default: number, min: number, max?: number }>>} */
export const ALERT_COLUMN_WIDTHS =
Object.freeze({
date:{
default:
90,
min:
78,
max:
130
},
ticker:{
default:
80,
min:
48,
max:
440
},
action:{
default:
24,
min:
24,
max:
32
}
});

const alertColumns =
createColumnModule({
storageKey:
ALERT_STORAGE_KEY,
columnWidths:
ALERT_COLUMN_WIDTHS,
resizableKeys:
[
"date",
"ticker",
"action"
],
resizePairs:
[
[
"date",
"ticker"
],
[
"ticker",
"action"
]
],
cssVarName:
key=>
`--tb-alert-col-${key}`
});

export function applyAlertColumnLayout(
panel
){

alertColumns.applyColumnLayout(
panel
);

}

export function wireAlertColumnResize(
panel,
tableHead
){

alertColumns.wireColumnResize(
panel,
tableHead
);

}

export function columnResizeHandle(
colKey
){

return `<span class="trade-book-col-resize" data-resize-col="${colKey}" role="separator" aria-orientation="vertical" title="Изменить ширину колонки"></span>`;

}
