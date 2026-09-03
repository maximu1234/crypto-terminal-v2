/** @module drawings/draw-templates — named style presets per drawing tool */
import {
STROKE,
RECT_DEFAULT_FILL_COLOR,
RECT_DEFAULT_FILL_OPACITY,
createRectangleToolDefaults,
FIB_TOOL_DEFAULTS_VERSION
} from "./constants.js?v=11";

import {
cloneDefaultFibRows,
ensureFibLevelsVisible,
getFibRows
} from "./fib-spec.js?v=15";

import {
normalizeRectangleShape
} from "./arrow-rect.js?v=2";

import {
isFvpType,
extractFvpStyleSnapshot,
copyFvpStyleToShape,
createFvpToolDefaults
} from "./fixed-volume-profile.js?v=3";

import {
isPositionType
} from "./position.js?v=10";

import {
isTextTool,
TEXT_DEFAULT_COLOR,
TEXT_DEFAULT_SIZE,
clampTextFontSize
} from "./text.js?v=3";

export const DRAW_TEMPLATES_STORAGE_KEY =
"draw_templates_v1";

export const TEMPLATE_ELIGIBLE_TYPES =
Object.freeze([
"trendline",
"brush",
"hray",
"hline",
"fib",
"channel",
"arrow",
"rectangle",
"fvp",
"text"
]);

const STANDARD_FIB_TEMPLATE_NAME =
"Стандартная фиба";

/** Colors from the Standard Fib settings screenshot. */
const STANDARD_FIB_COLORS =
Object.freeze({
mustard:
"#b49b40",
maroon:
"#6b3539",
brown:
"#896739",
white:
"#ffffff",
grey:
"#787c87",
purple:
"#673180",
green:
"#7bb972"
});

function standardFibLevel(
v,
enabled,
color
){

return {
v,
enabled:
!!enabled,
fillBg:
false,
lineStyle:
"solid",
lineWidth:
1,
color
};

}

/**
 * Built-in fib preset — matches «Стандартная фиба» settings panel layout
 * (18 slots, 2-column grid order).
 */
export function buildStandardFibTemplateSnapshot(){

return {
color:
STROKE,
lineWidth:
1,
fibDefaultsVersion:
FIB_TOOL_DEFAULTS_VERSION,
fibShowTrendLine:
false,
fibLevels:[
standardFibLevel(
0,
true,
STANDARD_FIB_COLORS.mustard
),
standardFibLevel(
0.236,
true,
STANDARD_FIB_COLORS.maroon
),
standardFibLevel(
0.382,
true,
STANDARD_FIB_COLORS.brown
),
standardFibLevel(
0.5,
true,
STANDARD_FIB_COLORS.white
),
standardFibLevel(
0.618,
true,
STANDARD_FIB_COLORS.brown
),
standardFibLevel(
0.786,
true,
STANDARD_FIB_COLORS.maroon
),
standardFibLevel(
1,
true,
STANDARD_FIB_COLORS.mustard
),
standardFibLevel(
1.618,
true,
STANDARD_FIB_COLORS.maroon
),
standardFibLevel(
0,
false,
STANDARD_FIB_COLORS.mustard
),
standardFibLevel(
2.618,
true,
STANDARD_FIB_COLORS.grey
),
standardFibLevel(
0,
false,
STANDARD_FIB_COLORS.green
),
standardFibLevel(
3.618,
true,
STANDARD_FIB_COLORS.purple
),
standardFibLevel(
0,
false,
STANDARD_FIB_COLORS.green
),
standardFibLevel(
0,
false,
STANDARD_FIB_COLORS.white
),
standardFibLevel(
0,
false,
STANDARD_FIB_COLORS.mustard
),
standardFibLevel(
0,
false,
STANDARD_FIB_COLORS.white
),
standardFibLevel(
0,
false,
STANDARD_FIB_COLORS.white
),
standardFibLevel(
0,
false,
STANDARD_FIB_COLORS.white
)
]
};

}

function listBuiltInTemplatesForType(
type
){

if(
type !==
"fib"
){
return [];
}

return [
{
name:
STANDARD_FIB_TEMPLATE_NAME,
builtin:
true,
data:
buildStandardFibTemplateSnapshot()
}
];

}

export function isTemplateEligibleType(
type
){

return (
!!type &&
TEMPLATE_ELIGIBLE_TYPES.includes(
type
) &&
!isPositionType(type)
);

}

function loadStore(){

try{

const raw =
localStorage.getItem(
DRAW_TEMPLATES_STORAGE_KEY
);

const parsed =
raw
? JSON.parse(raw)
: {};

if(
!parsed ||
typeof parsed !==
"object"
){
return {};
}

return parsed;

}catch{

return {};

}

}

function saveStore(
store
){

localStorage.setItem(
DRAW_TEMPLATES_STORAGE_KEY,
JSON.stringify(store)
);

}

export function listTemplatesForType(
type
){

if(
!isTemplateEligibleType(
type
)
){
return [];
}

const builtIn =
listBuiltInTemplatesForType(
type
);
const builtInNames =
new Set(
builtIn.map(
item=>
item.name.trim().toLowerCase()
)
);

const store =
loadStore();

const list =
store[type];

const saved =
Array.isArray(
list
)
? list
.filter(
item=>
item &&
typeof item.name ===
"string" &&
item.name.trim() &&
item.data &&
typeof item.data ===
"object" &&
!builtInNames.has(
item.name.trim().toLowerCase()
)
)
.map(
item=>({
name: item.name.trim(),
data: item.data,
builtin:
false
})
)
: [];

return [
...builtIn,
...saved
];

}

export function saveNamedTemplate(
type,
name,
data
){

const trimmed =
String(
name || ""
).trim();

if(
!isTemplateEligibleType(
type
) ||
!trimmed
){
return false;
}

const store =
loadStore();
let list =
Array.isArray(
store[type]
)
? [...store[type]]
: [];

const idx =
list.findIndex(
item=>
String(
item?.name || ""
).trim().toLowerCase() ===
trimmed.toLowerCase()
);

const entry = {
name: trimmed,
data: JSON.parse(
JSON.stringify(
data
)
),
updatedAt: Date.now()
};

if(
idx >= 0
){
list[idx] = entry;
}else{
list.push(entry);
}

const byName =
new Map();

for(
const item of
list
){

const key =
String(
item?.name ||
""
).trim().toLowerCase();

if(
!key
){
continue;
}

byName.set(
key,
item
);

}

list =
[
...byName.values()
];

list.sort(
(a,b)=>
String(
a.name
).localeCompare(
String(
b.name
),
undefined,
{
sensitivity: "base"
}
)
);

store[type] = list;
saveStore(store);
return true;

}

export function deleteTemplateAtIndex(
type,
idx
){

if(
!isTemplateEligibleType(
type
)
){
return false;
}

const visible =
listTemplatesForType(
type
);
const entry =
visible[
Number(
idx
)
];

if(
!entry ||
entry.builtin
){
return false;
}

const targetName =
entry.name.trim().toLowerCase();
const store =
loadStore();
const list =
Array.isArray(
store[type]
)
? store[type]
: [];

const next =
list.filter(
item=>
String(
item?.name || ""
).trim().toLowerCase() !==
targetName
);

if(
next.length ===
list.length
){
return false;
}

if(
next.length
){
store[type] = next;
}else{
delete store[type];
}

saveStore(store);
return true;

}

export function extractStyleSnapshot(
shape,
type
){

if(
!isTemplateEligibleType(
type
)
){
return null;
}

const out = {
color:
shape?.color ||
STROKE
};

if(
type !==
"arrow" &&
type !==
"text"
){
out.lineWidth =
Number(
shape?.lineWidth
) ||
1;
}

if(
isTextTool(
type
)
){
out.fontSize =
clampTextFontSize(
shape?.fontSize
);
}

if(
type ===
"fib"
){

const rows =
getFibRows(
shape ||
{}
);

out.fibLevels =
JSON.parse(
JSON.stringify(
rows
)
);

out.fibShowTrendLine =
typeof shape?.fibShowTrendLine ===
"boolean"
? shape.fibShowTrendLine
: false;

}

if(
type ===
"rectangle"
){

normalizeRectangleShape(
out,
{
showFill:
shape?.showFill !==
false,
fillColor:
shape?.fillColor ||
RECT_DEFAULT_FILL_COLOR,
fillOpacity:
shape?.fillOpacity ??
RECT_DEFAULT_FILL_OPACITY,
medianColor:
shape?.medianColor ||
out.color,
medianLineWidth:
shape?.medianLineWidth ||
1,
medianLineStyle:
shape?.medianLineStyle ||
"dashed",
lineStyle:
shape?.lineStyle ||
"solid",
showMedian:
!!shape?.showMedian
}
);

out.lineStyle =
shape?.lineStyle ||
out.lineStyle;
out.showFill =
shape?.showFill ??
out.showFill;
out.fillColor =
shape?.fillColor ||
out.fillColor;
out.fillOpacity =
shape?.fillOpacity ??
out.fillOpacity;
out.showMedian =
!!shape?.showMedian;
out.medianColor =
shape?.medianColor ||
out.medianColor;
out.medianLineWidth =
shape?.medianLineWidth ||
out.medianLineWidth;
out.medianLineStyle =
shape?.medianLineStyle ||
out.medianLineStyle;

}

if(
isFvpType(
type
)
){

Object.assign(
out,
extractFvpStyleSnapshot(
shape
)
);

}

return out;

}

export function mergeStyleSnapshot(
style,
type
){

if(
!style ||
!isTemplateEligibleType(
type
)
){
return style;
}

const out = {
...style
};

if(
type ===
"fib" &&
style.fibLevels
){
out.fibLevels =
JSON.parse(
JSON.stringify(
ensureFibLevelsVisible(
style.fibLevels
)
)
);
}

if(
type ===
"rectangle"
){

normalizeRectangleShape(
out,
style
);

}

if(
isFvpType(
type
)
){
Object.assign(
out,
createFvpToolDefaults(),
style
);
}

return out;

}

export function applyStyleSnapshotToShape(
shape,
snapshot
){

if(
!shape ||
!snapshot ||
!isTemplateEligibleType(
shape.type
)
){
return false;
}

const type =
shape.type;
const data =
mergeStyleSnapshot(
snapshot,
type
);

stripNonDefaultShapeStyle(
shape,
data
);

return true;

}

export function buildFactoryDefaultSnapshot(
type
){

if(
!isTemplateEligibleType(
type
)
){
return null;
}

const out = {
color: STROKE,
lineWidth: 1
};

if(
type ===
"fib"
){

out.fibDefaultsVersion =
FIB_TOOL_DEFAULTS_VERSION;

out.fibLevels =
JSON.parse(
JSON.stringify(
cloneDefaultFibRows()
)
);

out.fibShowTrendLine =
false;

}

if(
type ===
"rectangle"
){

const rectDefaults =
createRectangleToolDefaults();

out.color =
rectDefaults.color;

normalizeRectangleShape(
out,
rectDefaults
);

}

if(
isFvpType(
type
)
){

Object.assign(
out,
createFvpToolDefaults()
);

}

if(
type ===
"arrow"
){
delete out.lineWidth;
}

if(
isTextTool(
type
)
){
out.color =
TEXT_DEFAULT_COLOR;
out.fontSize =
TEXT_DEFAULT_SIZE;
delete out.lineWidth;
}

return mergeStyleSnapshot(
out,
type
);

}

function stripNonDefaultShapeStyle(
shape,
snapshot
){

if(
!shape ||
!snapshot
){
return;
}

const type =
shape.type;

shape.color =
snapshot.color ||
STROKE;

if(
type !==
"arrow" &&
type !==
"text"
){
shape.lineWidth =
Number(
snapshot.lineWidth
) ||
1;
}

if(
isTextTool(
type
)
){
shape.fontSize =
clampTextFontSize(
snapshot.fontSize
);
shape.color =
snapshot.color ||
TEXT_DEFAULT_COLOR;
}

if(
type ===
"fib"
){

if(
snapshot.fibLevels
){
shape.fibLevels =
JSON.parse(
JSON.stringify(
snapshot.fibLevels
)
);
}

shape.fibShowTrendLine =
typeof snapshot.fibShowTrendLine ===
"boolean"
? snapshot.fibShowTrendLine
: false;

delete shape.levels;
delete shape.showFibTrend;

}

if(
type ===
"rectangle"
){

[
"lineStyle",
"showFill",
"fillColor",
"fillOpacity",
"showMedian",
"medianColor",
"medianLineWidth",
"medianLineStyle"
].forEach(
key=>{

if(
snapshot[key] !==
undefined
){
shape[key] =
snapshot[key];
}

}
);

normalizeRectangleShape(
shape
);

}

if(
isFvpType(
type
)
){
copyFvpStyleToShape(
shape,
snapshot
);
}

}
