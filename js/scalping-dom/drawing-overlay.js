/**
 * Horizontal line / ray underlines on scalping DOM.
 * Same between-row slot as alerts and trigger orders; color = drawing stroke.
 */
import {
drawingsStorageKey
} from "../drawings-exchange-key.js?v=1";

const LEGACY_TF_KEYS =
Object.freeze([
"1",
"5",
"15",
"60",
"240",
"D"
]);

const DEFAULT_COLOR =
"#3b82f6";

function normalizeSymbol(
raw
){

return String(
raw ||
""
).trim().toUpperCase().replace(
/\.P$/i,
""
).replace(
/[^A-Z0-9]/g,
""
);

}

function isHorizPriceTool(
type
){

return type ===
"hline" ||
type ===
"hray";

}

function readShapesFromKey(
key
){

try{
const raw =
localStorage.getItem(
key
);

if(
!raw
){
return [];
}

const parsed =
JSON.parse(
raw
);

return Array.isArray(
parsed
)
? parsed
: [];
}catch{
return [];
}

}

function drawingsStorageKeysForSymbol(
symbol
){

const keys =
[];
const seen =
new Set();

function add(
sym,
tfSuffix
){

if(
!sym
){
return;
}

const key =
drawingsStorageKey(
sym,
tfSuffix
? {
tfSuffix
}
: {}
);

if(
seen.has(
key
)
){
return;
}

seen.add(
key
);
keys.push(
key
);

}

const stripped =
normalizeSymbol(
symbol
);
const raw =
String(
symbol ||
""
).trim().toUpperCase();

for(
const sym of [
stripped,
raw
]
){
add(
sym,
""
);

for(
const tf of LEGACY_TF_KEYS
){
add(
sym,
`_${tf}`
);
}

}

return keys;

}

function clampWidth(
raw
){

const n =
Number(
raw
);

if(
!Number.isFinite(
n
)
){
return 2;
}

return Math.max(
1,
Math.min(
4,
Math.round(
n
)
)
);

}

function collectShapes(
symbol
){

const byId =
new Map();

for(
const key of drawingsStorageKeysForSymbol(
symbol
)
){

for(
const shape of readShapesFromKey(
key
)
){

const id =
String(
shape?.id ||
""
);

if(
id &&
byId.has(
id
)
){
continue;
}

if(
id
){
byId.set(
id,
shape
);
}

}

}

return [
...byId.values()
];

}

/**
 * @param {string} symbol
 * @returns {{ price: number, color: string, width: number, kind: "hline" | "hray" }[]}
 */
export function resolveHorizDrawingLevels(
symbol
){

const sym =
normalizeSymbol(
symbol
);

if(
!sym
){
return [];
}

const levels =
[];
const seen =
new Set();

for(
const shape of collectShapes(
symbol
)
){

if(
!isHorizPriceTool(
shape?.type
)
){
continue;
}

if(
shape.isAlert
){
continue;
}

const price =
Number(
shape.price ??
shape.p1?.price
);

if(
!Number.isFinite(
price
) ||
!(
price >
0
)
){
continue;
}

const color =
String(
shape.color ||
DEFAULT_COLOR
).trim() ||
DEFAULT_COLOR;
const width =
clampWidth(
shape.lineWidth
);
const kind =
shape.type ===
"hline"
? "hline"
: "hray";
const key =
`${kind}:${price}:${color}:${width}`;

if(
seen.has(
key
)
){
continue;
}

seen.add(
key
);
levels.push(
{
price,
color,
width,
kind
}
);

}

return levels;

}

/**
 * Mark the row just above each drawing price (ladder high → low).
 * Several drawings on one row stack via `drawingLines`.
 */
export function applyHorizDrawingUnderlines(
ladder,
levels
){

if(
!ladder?.rows?.length ||
!levels?.length
){
return ladder;
}

const byRow =
new Map();
const rows =
ladder.rows;

for(
const level of levels
){

for(
let i =
0;
i <
rows.length;
i++
){
const price =
rows[
i
].price;
const next =
rows[
i +
1
];
const nextPrice =
next
? next.price
: -
Infinity;

if(
price >=
level.price &&
nextPrice <
level.price
){
const list =
byRow.get(
i
) ||
[];
list.push(
{
color:
level.color,
width:
level.width,
kind:
level.kind
}
);
byRow.set(
i,
list
);
break;
}

}

}

for(
let i =
0;
i <
rows.length;
i++
){
const list =
byRow.get(
i
);

if(
list?.length
){
rows[
i
].drawingLines =
list;
}

}

return ladder;

}
