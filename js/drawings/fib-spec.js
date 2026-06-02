/** @module drawings/fib-spec */
import {
DEFAULT_FIB_SPEC,
STROKE,
FIB_TOOL_DEFAULTS_VERSION,
FIB_LINE_DASH,
WIDTH_OPTIONS
} from "./constants.js";

const FIB_LINE_STYLE_OPTIONS = [
{ value: "solid", label: "Line" },
{ value: "dashed", label: "Dashed line" },
{ value: "dotted", label: "Dotted line" }
];

export function normalizeFibLineStyle(raw){

if(raw === "dashed" || raw === "dotted"){
return raw;
}

return "solid";

}

export function fibLevelDash(lineStyle){

return FIB_LINE_DASH[
normalizeFibLineStyle(lineStyle)
] || [];

}

const FIB_LINE_STYLE_OPTIONS = [
{ value: "solid", label: "Line" },
{ value: "dashed", label: "Dashed line" },
{ value: "dotted", label: "Dotted line" }
];

export function fibLineStyleIconMarkup(style){

const kind =
normalizeFibLineStyle(style);

let dashAttr = "";

if(kind === "dashed"){
dashAttr = ` stroke-dasharray="7 4"`;
}

if(kind === "dotted"){
dashAttr = ` stroke-dasharray="2 3"`;
}

return `<svg class="fib-line-style-svg" width="28" height="12" viewBox="0 0 28 12" aria-hidden="true"><line x1="2" y1="6" x2="26" y2="6" stroke="currentColor" stroke-width="2" stroke-linecap="round"${dashAttr}/></svg>`;

}

export function fibLineStyleMenuMarkup(){

return FIB_LINE_STYLE_OPTIONS.map(opt=>`
<button type="button" class="fib-line-style-option" data-line-style="${opt.value}">
${fibLineStyleIconMarkup(opt.value)}
<span>${opt.label}</span>
</button>
`).join("");

}

export function setFibLineStyleButton(btn, style){

if(!btn){
return;
}

const next =
normalizeFibLineStyle(style);

btn.dataset.lineStyle = next;
btn.innerHTML = fibLineStyleIconMarkup(next);

}
export function normalizeFibLevelWidth(raw){

const n =
Number(raw);

if(
!Number.isFinite(n) ||
n < 1 ||
n > 4
){
return null;
}

return Math.round(n);

}

export function fibLineWidthMenuMarkup(){

return WIDTH_OPTIONS.map(w=>`
<button type="button" class="fib-line-width-option" data-width="${w}">
<span class="width-sample" style="height:${w}px"></span>
<span>${w}px</span>
</button>
`).join("");

}

export function setFibLevelWidthButton(btn, width, fallback){

if(!btn){
return;
}

const picked =
normalizeFibLevelWidth(width);

if(picked){

btn.dataset.customWidth = String(picked);
btn.textContent = `${picked}px`;
btn.classList.add("has-custom");
return;

}

delete btn.dataset.customWidth;
btn.textContent = `${normalizeFibLevelWidth(fallback) || 1}px`;
btn.classList.remove("has-custom");

}
export function normalizeFibLevelColor(raw){

if(
typeof raw !==
"string"
){
return null;
}

const s =
raw.trim();

if(
/^#[0-9A-Fa-f]{6}$/i.test(s)
){
return s.toLowerCase();
}

return null;

}

export function cloneDefaultFibRows(){

return DEFAULT_FIB_SPEC.map(x=>{

const row =
{
v:x.v,
enabled:!!x.enabled,
lineStyle: "solid",
lineWidth: 1
};

const levelColor =
normalizeFibLevelColor(x.color);

if(levelColor){
row.color = levelColor;
}

return row;

});

}

export function buildDefaultFibToolStorage(){

return {
fibDefaultsVersion: FIB_TOOL_DEFAULTS_VERSION,
color: STROKE,
lineWidth: 1,
fibLevels: cloneDefaultFibRows(),
fibShowTrendLine: false
};

}

export function migrateFibToolDefaults(
saved
){

if(
saved?.fibDefaultsVersion ===
FIB_TOOL_DEFAULTS_VERSION &&
Array.isArray(saved.fibLevels) &&
saved.fibLevels.length ===
DEFAULT_FIB_SPEC.length
){
return {
...buildDefaultFibToolStorage(),
color: saved.color || STROKE,
lineWidth: saved.lineWidth ?? 1,
fibLevels: JSON.parse(
JSON.stringify(saved.fibLevels)
),
fibShowTrendLine:
saved.fibShowTrendLine === true
};

}

return buildDefaultFibToolStorage();

}

export function migrateFibFromNumberArray(arr){

const next =
cloneDefaultFibRows().map(r=>({
...r,
enabled:false
}));

const wanted =
arr.filter(x=>
typeof x === "number" &&
Number.isFinite(x)
);

if(!wanted.length){
return cloneDefaultFibRows();

}

wanted.forEach(n=>{

next.forEach(r=>{

if(
Math.abs(n - r.v) <
1e-6
){

r.enabled = true;

}

});

});

if(
!next.some(r=>r.enabled)
){

DEFAULT_FIB_SPEC.forEach((d,i)=>{

next[i].enabled = d.enabled;

});

}

return next;

}

export function migrateFibFromObjectRows(rows){

const next =
cloneDefaultFibRows();

rows.forEach((cell,i)=>{

if(
i >= next.length ||
!cell ||
typeof cell !== "object"
){
return;

}

if(
typeof cell.v === "number" &&
Number.isFinite(cell.v)
){

next[i].v = cell.v;

}

if(
typeof cell.enabled ===
"boolean"
){

next[i].enabled = cell.enabled;

}

const levelColor =
normalizeFibLevelColor(cell.color);

if(levelColor){
next[i].color = levelColor;
}

if(cell.lineStyle){
next[i].lineStyle =
normalizeFibLineStyle(cell.lineStyle);
}

const levelWidth =
normalizeFibLevelWidth(cell.lineWidth);

if(levelWidth){
next[i].lineWidth = levelWidth;
}

});

return next;

}

export function isClassicFibLevelNumbers(
arr
){

if(
!Array.isArray(arr) ||
!arr.length ||
typeof arr[0] !== "number"
){
return false;
}

if(
arr.length > 12
){
return false;
}

return arr.some(n=>
Math.abs(n - 0.236) <
1e-4 ||
Math.abs(n - 0.786) <
1e-4
);

}

export function repairFibLevels(
rows
){

const base =
cloneDefaultFibRows();

const normalized =
Array.isArray(rows) &&
rows.length === base.length
? rows
: normalizeFibLevelsShape(rows);

return normalized.map((row,i)=>{

const def =
base[i];

if(
!def
){
return row;
}

const levelColor =
normalizeFibLevelColor(row.color) ||
normalizeFibLevelColor(def.color);

const out = {
v: Number.isFinite(row.v)
? row.v
: def.v,
enabled: typeof row.enabled === "boolean"
? row.enabled
: def.enabled,
lineStyle: normalizeFibLineStyle(
row.lineStyle
) ||
def.lineStyle ||
"solid"
};

if(levelColor){
out.color = levelColor;
}

const levelWidth =
normalizeFibLevelWidth(row.lineWidth) ||
normalizeFibLevelWidth(def.lineWidth);

if(levelWidth){
out.lineWidth = levelWidth;
}

return out;

});

}

/** Уровни/цвета по DEFAULT_FIB_SPEC; чинит legacy localStorage. */
export function finalizeFibLevels(
raw
){

if(
!raw
){
return cloneDefaultFibRows();
}

if(
isClassicFibLevelNumbers(raw)
){
return cloneDefaultFibRows();
}

return repairFibLevels(
normalizeFibLevelsShape(raw)
);

}

export function normalizeFibLevelsShape(raw){

if(
!raw ||
!Array.isArray(raw) ||
!raw.length
){

return cloneDefaultFibRows();

}

if(
typeof raw[0] === "number"
){

return migrateFibFromNumberArray(raw);

}

if(
typeof raw[0] === "object"
){

return migrateFibFromObjectRows(raw);

}

return cloneDefaultFibRows();

}

export function formatFibInputValue(v){

if(!Number.isFinite(v)){
return "0";
}

if(
Number.isInteger(v)
){

return String(v);

}

const t =
Number(
v.toFixed(6)
);

if(
Number.isInteger(t)
){

return String(t);

}

return String(t);

}

export function formatFibLabel(v){

if(!Number.isFinite(v)){
return "";
}

if(
Number.isInteger(v)
){

return String(v);

}

const rounded =
Math.round(v * 1e6) / 1e6;

if(
Number.isInteger(rounded)
){

return String(rounded);

}

let s =
rounded.toFixed(6).replace(/0+$/, "");

if(s.endsWith(".")){
s = s.slice(0,-1);

}

return s;

}

export function parseFibRatioField(text){

const s =
String(text ?? "")
.trim()
.replace(
/,/g,
"."
);

if(!s){
return null;
}

const n =
Number(s);

return Number.isFinite(n)
? n
: null;

}

export function fibPriceAtRatio(
anchorA,
anchorB,
ratio,
logarithmic
){

const p1 =
Number(anchorA);
const p2 =
Number(anchorB);

if(
!Number.isFinite(p1) ||
!Number.isFinite(p2) ||
!Number.isFinite(ratio)
){

return NaN;

}

if(
logarithmic &&
p1 > 0 &&
p2 > 0
){

return (
p1 * Math.pow(
p2 / p1,
ratio
)
);

}

return (
p1 + (p2 - p1) * ratio
);

}

export function getFibRows(shape){

const raw =
shape.fibLevels ?? shape.levels;

const rows =
normalizeFibLevelsShape(raw);

if(
!Array.isArray(raw) ||
typeof raw[0] !== "object"
){
return rows;
}

raw.forEach((cell,i)=>{

if(
i >= rows.length ||
!cell ||
typeof cell !== "object"
){
return;
}

const levelColor =
normalizeFibLevelColor(cell.color);

if(levelColor){
rows[i].color = levelColor;
}

if(cell.lineStyle){
rows[i].lineStyle =
normalizeFibLineStyle(cell.lineStyle);
}

const levelWidth =
normalizeFibLevelWidth(cell.lineWidth);

if(levelWidth){
rows[i].lineWidth = levelWidth;
}

if(
typeof cell.v === "number" &&
Number.isFinite(cell.v)
){
rows[i].v = cell.v;
}

if(
typeof cell.enabled ===
"boolean"
){
rows[i].enabled = cell.enabled;
}

});

return rows;

}

export function isSeriesLogarithmic(s){

try{

const ps =
typeof s?.priceScale ===
"function"
? s.priceScale()
: null;

const opts =
typeof ps?.options ===
"function"
? ps.options()
: ps?.options;

const mode =
opts?.mode;

if(mode === 1){
return true;
}

if(mode === 0){
return false;

}

}catch(_){
}

/* в chart.js дефолт — log */
return true;

}
