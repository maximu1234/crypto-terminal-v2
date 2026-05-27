import {
ALERT_LINE_COLOR,
ALERT_LINE_DASH,
alertPriceFromShape,
getActiveAlerts,
finalizeAlertPriceDrag,
removeAlert,
upsertAlert
} from "./alerts.js?v=64";

import {
setAlertDragPaused,
resetAlertWatchBaseline
} from "./alert-monitor.js?v=64";

import {
mountTvColorGrid
} from "./draw-color-palette.js";

import {
ALARM_ICON_SVG,
TRASH_ICON_SVG,
DRAW_TOOLS_GUEST_MSG
} from "./draw-ui-shared.js?v=3";

import {
closeAllWidgetDrawToolsMenus
} from "./dashboard-draw-ui.js?v=12";

import {
calcPositionSizing,
formatMoneyUsd,
formatVolumeUsd,
parseMoneyInput
} from "./position-sizing.js?v=1";

import {
bumpDrawingsLocalRevision,
isCloudLoggedIn,
isCloudLoggedInEffective,
isCloudSyncEnabled,
ensureCloudLoginResolved,
onCloudSyncChange
} from "./cloud-sync.js?v=17";

import {
ensureDrawToolsVisible
} from "./draw-tools-visible.js?v=1";

import {
deleteDrawingFromCloud,
flushDrawingsCloudPush,
onDrawingsRemoteUpdate,
scheduleDrawingsCloudPush
} from "./drawings-cloud-sync.js?v=4";

import {
touchShapeRevision,
recordDrawingTombstone
} from "./drawings-storage.js?v=4";

import {
formatPrice,
chartScaleFont,
CHART_SCALE_LABEL_PAD_LEFT,
CHART_SCALE_LABEL_LINE_HEIGHT,
scaleLabelTextColorForBackground,
isCoarseTouchViewport,
isTabletChartViewport,
TABLET_USE_CUSTOM_TOUCH_PAN,
ensureDomChartCrosshair,
positionDomChartCrosshair,
hideDomChartCrosshair,
fullCrosshairOptions
} from "./chart.js?v=61";

/* Сетка 2×9: чётный индекс — левый столбец, нечётный — правый */
const DEFAULT_FIB_SPEC = Object.freeze([
{ v:0, enabled:true, color:"#facc15" },
{ v:0.25, enabled:true, color:"#ef4444" },
{ v:0.382, enabled:true, color:"#ffa726" },
{ v:0.5, enabled:true, color:"#ffffff" },
{ v:0.618, enabled:true, color:"#ffa726" },
{ v:0.75, enabled:true, color:"#ef4444" },
{ v:1, enabled:true, color:"#facc15" },
{ v:1.25, enabled:true, color:"#ef4444" },
{ v:2, enabled:true, color:"#facc15" },
{ v:1.5, enabled:true, color:"#9ca3af" },
{ v:2.44, enabled:true, color:"#66bb6a" },
{ v:0.75, enabled:false, color:"#ffffff" },
{ v:2.5, enabled:true, color:"#66bb6a" },
{ v:-0.5, enabled:false, color:"#ffffff" },
{ v:3, enabled:true, color:"#facc15" },
{ v:-1.44, enabled:false, color:"#ffffff" },
{ v:-1.44, enabled:false, color:"#ffffff" },
{ v:-2.618, enabled:false, color:"#ffffff" }
]);

const STROKE = "#3b82f6";
const HANDLE_FILL = "#2563eb";
const HANDLE_STROKE = "#ffffff";
const WIDTH_OPTIONS = [1, 2, 3, 4];
const USER_PREFS_KEY = "draw_user_prefs";
const GLOBAL_STYLE_KEY = "draw_style_global_v1";
/** Смена — полный сброс draw_defaults_fib на DEFAULT_FIB_SPEC */
const FIB_TOOL_DEFAULTS_VERSION = 4;

function uid(){

return `d_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

}

function distToSegment(px, py, x1, y1, x2, y2){

const dx = x2 - x1;
const dy = y2 - y1;
const lenSq = dx * dx + dy * dy;

if(lenSq === 0){
return Math.hypot(px - x1, py - y1);
}

let t =
((px - x1) * dx + (py - y1) * dy) / lenSq;

t = Math.max(0, Math.min(1, t));

return Math.hypot(
px - (x1 + t * dx),
py - (y1 + t * dy)
);

}

const FIB_LINE_DASH = Object.freeze({
solid: [],
dashed: [8, 6],
dotted: [2, 3]
});

function normalizeFibLineStyle(raw){

if(raw === "dashed" || raw === "dotted"){
return raw;
}

return "solid";

}

function fibLevelDash(lineStyle){

return FIB_LINE_DASH[
normalizeFibLineStyle(lineStyle)
] || [];

}

const FIB_LINE_STYLE_OPTIONS = [
{ value: "solid", label: "Line" },
{ value: "dashed", label: "Dashed line" },
{ value: "dotted", label: "Dotted line" }
];

function fibLineStyleIconMarkup(style){

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

function fibLineStyleMenuMarkup(){

return FIB_LINE_STYLE_OPTIONS.map(opt=>`
<button type="button" class="fib-line-style-option" data-line-style="${opt.value}">
${fibLineStyleIconMarkup(opt.value)}
<span>${opt.label}</span>
</button>
`).join("");

}

function setFibLineStyleButton(btn, style){

if(!btn){
return;
}

const next =
normalizeFibLineStyle(style);

btn.dataset.lineStyle = next;
btn.innerHTML = fibLineStyleIconMarkup(next);

}

let fibLineStyleMenuPortal = null;
let fibLineStyleMenuAnchor = null;
let fibLineWidthMenuPortal = null;
let fibLineWidthMenuAnchor = null;

let fibPanelCommitHook = null;

function runFibPanelCommitHook(){

if(
typeof fibPanelCommitHook ===
"function"
){
fibPanelCommitHook();
}

}

function ensureFibLineStyleMenuPortal(){

if(fibLineStyleMenuPortal){
return fibLineStyleMenuPortal;
}

const el =
document.createElement("div");

el.className =
"fib-line-style-menu fib-line-style-menu--portal hidden";

el.innerHTML = fibLineStyleMenuMarkup();

document.body.appendChild(el);

el.addEventListener("mousedown", e=>{
e.stopPropagation();
});

el.addEventListener(
"click",
e=>{

const option =
e.target.closest(".fib-line-style-option");

if(
!option ||
!fibLineStyleMenuAnchor
){
return;
}

e.preventDefault();
e.stopPropagation();

setFibLineStyleButton(
fibLineStyleMenuAnchor,
option.dataset.lineStyle
);

closeAllFibLineStyleMenus();
runFibPanelCommitHook();

}
);

fibLineStyleMenuPortal = el;
return el;

}

function closeAllFibLineStyleMenus(){

if(fibLineStyleMenuPortal){

fibLineStyleMenuPortal.classList.add("hidden");
fibLineStyleMenuPortal.style.left = "";
fibLineStyleMenuPortal.style.top = "";
fibLineStyleMenuPortal.style.position = "";
fibLineStyleMenuPortal.style.zIndex = "";

}

fibLineStyleMenuAnchor = null;

}

function openFibLineStyleMenu(btn){

const menu =
ensureFibLineStyleMenuPortal();

fibLineStyleMenuAnchor = btn;

const current =
normalizeFibLineStyle(
btn.dataset.lineStyle
);

menu.querySelectorAll(".fib-line-style-option").forEach(opt=>{
opt.classList.toggle(
"active",
opt.dataset.lineStyle === current
);
});

menu.classList.remove("hidden");

const rect =
btn.getBoundingClientRect();

menu.style.position = "fixed";
menu.style.left = `${Math.round(rect.left)}px`;
menu.style.top = `${Math.round(rect.bottom + 4)}px`;
menu.style.zIndex = "20000";

}

function normalizeFibLevelWidth(raw){

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

function fibLineWidthMenuMarkup(){

return WIDTH_OPTIONS.map(w=>`
<button type="button" class="fib-line-width-option" data-width="${w}">
<span class="width-sample" style="height:${w}px"></span>
<span>${w}px</span>
</button>
`).join("");

}

function setFibLevelWidthButton(btn, width, fallback){

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

function closeAllFibLineWidthMenus(){

if(fibLineWidthMenuPortal){

fibLineWidthMenuPortal.classList.add("hidden");
fibLineWidthMenuPortal.style.left = "";
fibLineWidthMenuPortal.style.top = "";
fibLineWidthMenuPortal.style.position = "";
fibLineWidthMenuPortal.style.zIndex = "";

}

fibLineWidthMenuAnchor = null;

}

function openFibLineWidthMenu(btn, fallbackWidth){

const menu =
ensureFibLineWidthMenuPortal();

fibLineWidthMenuAnchor = btn;

const current =
normalizeFibLevelWidth(
btn.dataset.customWidth
) ||
normalizeFibLevelWidth(fallbackWidth) ||
1;

menu.querySelectorAll(".fib-line-width-option").forEach(opt=>{
opt.classList.toggle(
"active",
Number(opt.dataset.width) === current
);
});

menu.classList.remove("hidden");

const rect =
btn.getBoundingClientRect();

menu.style.position = "fixed";
menu.style.left = `${Math.round(rect.left)}px`;
menu.style.top = `${Math.round(rect.bottom + 4)}px`;
menu.style.zIndex = "10053";

}

function ensureFibLineWidthMenuPortal(){

if(fibLineWidthMenuPortal){
return fibLineWidthMenuPortal;
}

const el =
document.createElement("div");

el.className =
"fib-line-width-menu fib-line-width-menu--portal hidden";

el.innerHTML = fibLineWidthMenuMarkup();

document.body.appendChild(el);

el.addEventListener("mousedown", e=>{
e.stopPropagation();
});

el.addEventListener(
"click",
e=>{

const option =
e.target.closest(".fib-line-width-option");

if(
!option ||
!fibLineWidthMenuAnchor
){
return;
}

e.preventDefault();
e.stopPropagation();

setFibLevelWidthButton(
fibLineWidthMenuAnchor,
Number(option.dataset.width),
1
);

closeAllFibLineWidthMenus();
runFibPanelCommitHook();

}
);

fibLineWidthMenuPortal = el;
return el;

}

function normalizeFibLevelColor(raw){

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

function cloneDefaultFibRows(){

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

function buildDefaultFibToolStorage(){

return {
fibDefaultsVersion: FIB_TOOL_DEFAULTS_VERSION,
color: STROKE,
lineWidth: 1,
fibLevels: cloneDefaultFibRows(),
fibShowTrendLine: false
};

}

function migrateFibToolDefaults(
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

function migrateFibFromNumberArray(arr){

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

function migrateFibFromObjectRows(rows){

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

function isClassicFibLevelNumbers(
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

function repairFibLevels(
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
function finalizeFibLevels(
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

function normalizeFibLevelsShape(raw){

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

function formatFibInputValue(v){

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

function formatFibLabel(v){

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

function parseFibRatioField(text){

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

function fibPriceAtRatio(
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

function getFibRows(shape){

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

function isSeriesLogarithmic(s){

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

function channelP4(p1, p2, p3){

return {
time: p3.time + (p2.time - p1.time),
price: p3.price + (p2.price - p1.price)
};

}

function channelMidPoints(p1, p2, p3){

const p4 = channelP4(p1, p2, p3);

return {
midStart: {
time: (p1.time + p3.time) / 2,
price: (p1.price + p3.price) / 2
},
midEnd: {
time: (p2.time + p4.time) / 2,
price: (p2.price + p4.price) / 2
}
};

}

const POSITION_ENTRY_COLOR = "#FACC15";
const POSITION_TP_FILL = "rgba(20, 83, 45, 0.58)";
const POSITION_SL_FILL = "rgba(127, 29, 29, 0.58)";
/** Запасной %, если не удалось перевести пиксели в цену */
const POSITION_DEFAULT_TP_PCT = 0.03;
const POSITION_DEFAULT_SL_PCT = 0.015;
/** Высота зон TP/SL при создании Long/Short (×3 от базы; ширина не меняется) */
const POSITION_DEFAULT_ZONE_HEIGHT_MULT =
3;

const POSITION_DEFAULT_TP_ZONE_PX =
56 *
POSITION_DEFAULT_ZONE_HEIGHT_MULT;

const POSITION_DEFAULT_SL_ZONE_PX =
28 *
POSITION_DEFAULT_ZONE_HEIGHT_MULT;
const POSITION_DEFAULT_WIDTH_BARS = 14;
const POSITION_RR_LABEL_SAMPLE =
"Risk/reward ratio: 9.99";

function isPositionType(type){

return type === "long" || type === "short";

}

function positionEntryPrice(shape){

return Number(shape.p1?.price);

}

function positionMidTime(shape){

const t1 =
normalizeTime(shape.p1?.time);
const t2 =
normalizeTime(shape.p2?.time);

if(
t1 == null ||
t2 == null
){
return null;
}

return (t1 + t2) / 2;

}

function distToRect(px, py, x1, y1, x2, y2){

const left =
Math.min(x1, x2);
const right =
Math.max(x1, x2);
const top =
Math.min(y1, y2);
const bottom =
Math.max(y1, y2);

if(
px >= left &&
px <= right &&
py >= top &&
py <= bottom
){
return 0;
}

const dx =
px < left
? left - px
: px > right
? px - right
: 0;

const dy =
py < top
? top - py
: py > bottom
? py - bottom
: 0;

return Math.hypot(dx, dy);

}

function pickUi(uiRoot, id, className){

if(uiRoot){
return uiRoot.querySelector(className);
}

return document.getElementById(id);

}

export function initDrawings({

chart,
series,
wrapEl,
getSymbol,
getTf,
getCandles,
uiRoot = null,
toolsRoot = null,
isActive = ()=>true,
barPosKey = "draw_bar_pos",
abortTabletChartGesture = null,
tabletCustomPanHooked =
typeof abortTabletChartGesture ===
"function",
onChartCrosshairAt = null,
onChartCrosshairClear = null,
onChartCrosshairSuppress = null,
onChartCrosshairRelease = null

}){

const tools =
toolsRoot || document;

function notifyTabletChartGestureAbort(){

try{
abortTabletChartGesture?.();
}catch{
/* ignore */
}

}

let alive = true;

wrapEl.style.position = "relative";

let priceGutterEl = null;

const canvas =
document.createElement("canvas");

canvas.className = "drawings-layer";
canvas.style.pointerEvents = "none";
wrapEl.insertBefore(
canvas,
wrapEl.firstChild
);

const styleBar =
pickUi(uiRoot, "draw-style-bar", ".draw-style-float");

const colorBtn =
pickUi(uiRoot, "draw-color-btn", ".draw-color-btn");

const colorStripe =
pickUi(uiRoot, "draw-color-stripe", ".draw-color-stripe");

const colorPopover =
pickUi(uiRoot, "draw-color-popover", ".draw-color-popover");

const widthBtn =
pickUi(uiRoot, "draw-width-btn", ".draw-width-btn");

const widthLabel =
pickUi(uiRoot, "draw-width-label", ".draw-width-label");

const widthPreview =
pickUi(uiRoot, "draw-width-preview", ".draw-width-preview");

const widthPopover =
pickUi(uiRoot, "draw-width-popover", ".draw-width-popover");

const settingsPopover =
pickUi(uiRoot, "draw-settings-popover", ".draw-settings-popover");

const settingsBtn =
pickUi(uiRoot, "draw-settings-btn", ".draw-settings-btn");

const deleteOneBtn =
pickUi(uiRoot, "draw-delete-one", ".draw-delete-one-btn");

const positionRiskWrap =
pickUi(uiRoot, "draw-position-risk-wrap", ".draw-position-risk");

const positionRiskInput =
pickUi(uiRoot, "draw-position-risk-usd", ".draw-position-risk-input");

const alertToggleBtn =
pickUi(uiRoot, "draw-alert-toggle", ".draw-alert-toggle");

const dragHandle =
pickUi(uiRoot, "style-bar-drag", ".draw-style-drag");

let chromePortal = null;
let barOffset = { x: 8, y: 8 };
let chromeLayoutObserver = null;

function ensureChromePortal(){

if(chromePortal){
return chromePortal;
}

const el =
document.createElement("div");

el.className = "draw-chrome-portal";
document.body.appendChild(el);
chromePortal = el;
return el;

}

function portalDrawChrome(){

const portal =
ensureChromePortal();

[
styleBar,
colorPopover,
widthPopover,
settingsPopover
].forEach(node=>{

if(!node){
return;
}

node.style.pointerEvents = "auto";
portal.appendChild(node);

});

}

function syncDrawChromeLayout(){

if(
!styleBar ||
!wrapEl
){
return;
}

const wrap =
wrapEl.getBoundingClientRect();

styleBar.style.position = "fixed";
styleBar.style.left =
`${wrap.left + barOffset.x}px`;
styleBar.style.top =
`${wrap.top + barOffset.y}px`;
styleBar.style.zIndex = "10050";

if(
settingsPopover &&
!settingsPopover.classList.contains("hidden")
){
positionPopover(
settingsPopover,
44
);
}

}

portalDrawChrome();

let contextMenuEl = null;

let activeColor = STROKE;

let tool = "cursor";
let drawings = [];
let lastLoadedSymbol = null;
let selectedId = null;
let placement = null;
let previewPoint = null;
let previewXY = null;
let touchDrawCrosshair = null;
let touchPlaceTrack = null;
let dragState = null;
let blockChartClick = false;

let toolDefaults = {};
let clickHandler = null;
let crosshairHandler = null;
let rangeHandler = null;

function canUseDrawings(){
return isCloudLoggedInEffective();
}

function getDrawToolsContainers(){

const found =
new Set();

[
tools,
document
].forEach(root=>{

if(
!root?.querySelectorAll
){
return;
}

root.querySelectorAll(
".widget-draw-tools, #coins-draw-tools-mount, #draw-toolbar"
).forEach(el=>{
found.add(
el
);
});

});

return [
...found
];

}

function refreshDrawToolsAccessUi(){

ensureDrawToolsVisible();

const canUse =
canUseDrawings();

getDrawToolsContainers().forEach(el=>{
el.classList.remove(
"hidden"
);
el.classList.toggle(
"draw-tools--locked",
!canUse
);
el.setAttribute(
"aria-disabled",
canUse ? "false" : "true"
);
});

tools.querySelectorAll(
"[data-draw-tool], .draw-tool-clear-all"
).forEach(btn=>{
btn.classList.remove(
"hidden"
);
btn.disabled = false;
btn.classList.toggle(
"draw-tools-btn--locked",
!canUse
);
});

if(!canUse){
tool = "cursor";
selectedId = null;
cancelPlacement();
styleBar?.classList.add("hidden");
}

}

let fibPanelBuilt = false;
let fibApplyTimer = null;
let fibSettingsShapeId = null;
let fibColorMenuPortal = null;
let fibColorMenuAnchor = null;

let chartApplyPatchRestore = null;

let redrawRaf1 = 0;
let redrawRaf2 = 0;
let coordRetryCount = 0;
let chartPanRedrawRaf = 0;
let chartPanActive = false;
let chartPanWheelTimer = null;

function defaultsStorageKey(name){

return `draw_defaults_${name}`;

}

function loadToolDefaults(){

["trendline", "hray", "fib", "channel"].forEach(name=>{

try{

const raw =
localStorage.getItem(defaultsStorageKey(name));

toolDefaults[name] = raw
? JSON.parse(raw)
: null;

}catch{

toolDefaults[name] = null;

}

if(
name === "fib"
){

const migrated =
migrateFibToolDefaults(
toolDefaults.fib
);

toolDefaults.fib = migrated;

localStorage.setItem(
defaultsStorageKey("fib"),
JSON.stringify(migrated)
);

}

});

}

function loadGlobalStyle(){

try{

return JSON.parse(
localStorage.getItem(GLOBAL_STYLE_KEY) || "{}"
);

}catch{

return {};

}

}

function saveGlobalStyle(partial){

const next = {
...loadGlobalStyle(),
...partial
};

localStorage.setItem(
GLOBAL_STYLE_KEY,
JSON.stringify(next)
);

}

function saveToolDefaults(name, data){

const next = {
...(toolDefaults[name] || {}),
...data
};

toolDefaults[name] = next;
localStorage.setItem(
defaultsStorageKey(name),
JSON.stringify(next)
);

}

function loadUserPrefs(){

try{

return JSON.parse(
localStorage.getItem(USER_PREFS_KEY) || "{}"
);

}catch{

return {};

}

}

function saveUserPrefs(partial){

const next = {
...loadUserPrefs(),
...partial
};

localStorage.setItem(
USER_PREFS_KEY,
JSON.stringify(next)
);

}

function baseDefaultStyle(type){

const global =
loadGlobalStyle();

const saved =
toolDefaults[type] || {};

const out =
{
color: saved.color || global.color || STROKE,
lineWidth: saved.lineWidth ?? global.lineWidth ?? 1
};

if(isPositionType(type)){

const prefs =
loadUserPrefs();

const risk =
saved.riskUsd ??
prefs.positionRiskUsd;

if(
risk != null &&
Number(risk) > 0
){
out.riskUsd = Number(risk);
}

}

if(type === "fib"){

const fibStore =
migrateFibToolDefaults(
toolDefaults.fib ||
saved
);

out.fibLevels =
JSON.parse(
JSON.stringify(fibStore.fibLevels)
);

out.fibShowTrendLine =
fibStore.fibShowTrendLine === true;

if(
saved?.color
){
out.color = saved.color;
}

if(
saved?.lineWidth != null
){
out.lineWidth = saved.lineWidth;
}

}

return out;

}
function normalizeTime(time){

if(typeof time === "number"){
return time;
}

if(typeof time === "string"){
return Math.floor(new Date(time).getTime() / 1000);
}

if(time && typeof time.timestamp === "number"){
return time.timestamp;
}

return null;

}

function candleSeries(){

return getCandles?.() || [];

}

function segmentX(ts, t0, t1){

const x0 = ts.timeToCoordinate(t0);
const x1 = ts.timeToCoordinate(t1);

if(x0 == null || x1 == null){
return null;
}

return { x0, x1, dt: t1 - t0 };

}

function xFromTime(time){

const t = normalizeTime(time);

if(t == null){
return null;
}

const ts = chart.timeScale();
const direct = ts.timeToCoordinate(t);

if(direct != null){
return direct;
}

const candles = candleSeries();

if(candles.length < 2){
return null;
}

const first = candles[0];
const second = candles[1];
const prev = candles[candles.length - 2];
const last = candles[candles.length - 1];

if(t <= first.time){

const seg = segmentX(ts, first.time, second.time);

if(!seg || seg.dt <= 0){
return seg?.x0 ?? null;
}

return seg.x0 + (seg.x1 - seg.x0) * ((t - first.time) / seg.dt);

}

if(t >= last.time){

const seg = segmentX(ts, prev.time, last.time);

if(!seg || seg.dt <= 0){
return seg?.x1 ?? null;
}

return seg.x1 + (seg.x1 - seg.x0) * ((t - last.time) / seg.dt);

}

let lo = 0;
let hi = candles.length - 1;

while(lo + 1 < hi){

const mid = (lo + hi) >> 1;

if(candles[mid].time <= t){
lo = mid;
}else{
hi = mid;
}

}

const seg = segmentX(
ts,
candles[lo].time,
candles[lo + 1].time
);

if(!seg || seg.dt <= 0){
return seg?.x0 ?? null;
}

return seg.x0 + (seg.x1 - seg.x0) * ((t - candles[lo].time) / seg.dt);

}

function timeFromX(x){

const ts = chart.timeScale();
let time = normalizeTime(ts.coordinateToTime(x));

if(time != null){
return time;
}

const candles = candleSeries();

if(candles.length < 2){
return null;
}

for(let i = 0; i < candles.length - 1; i++){

const seg = segmentX(
ts,
candles[i].time,
candles[i + 1].time
);

if(!seg || seg.dt <= 0){
continue;
}

const minX = Math.min(seg.x0, seg.x1);
const maxX = Math.max(seg.x0, seg.x1);

if(x >= minX && x <= maxX){
const ratio = (x - seg.x0) / (seg.x1 - seg.x0);
return candles[i].time + ratio * seg.dt;
}

}

const first = candles[0];
const second = candles[1];
const head = segmentX(ts, first.time, second.time);

if(head && head.dt > 0 && x < Math.min(head.x0, head.x1)){

const ratio = (x - head.x0) / (head.x1 - head.x0);
return first.time + ratio * head.dt;

}

const prev = candles[candles.length - 2];
const last = candles[candles.length - 1];
const tail = segmentX(ts, prev.time, last.time);

if(tail && tail.dt > 0 && x > Math.max(tail.x0, tail.x1)){

const ratio = (x - tail.x1) / (tail.x1 - tail.x0);
return last.time + ratio * tail.dt;

}

return null;

}

function normalizeShape(shape){

shape.color = shape.color || STROKE;
shape.lineWidth = shape.lineWidth || 1;

if(shape.type === "fib"){

shape.fibLevels =
finalizeFibLevels(
shape.fibLevels ??
shape.levels
);

shape.fibShowTrendLine =
typeof shape.fibShowTrendLine ===
"boolean"
? shape.fibShowTrendLine
:
typeof shape.showFibTrend ===
"boolean"
? !!shape.showFibTrend
:true;

delete shape.levels;
delete shape.showFibTrend;

}
if(shape.type === "hray"){

if(
shape.isAlert &&
!shape.alertCreatedAt
){
shape.isAlert = false;
delete shape.alertTf;
delete shape.savedColor;
delete shape.savedLineWidth;
}

if(shape.isAlert){
shape.lineWidth = 1;
}

}

if(isPositionType(shape.type)){

if(
!shape.p1 ||
!shape.p2
){
return shape;
}

const entry =
positionEntryPrice(shape);
const init =
initialPositionTpSl(shape.type, entry);

shape.tpPrice =
Number(shape.tpPrice) || init.tpPrice;
shape.slPrice =
Number(shape.slPrice) || init.slPrice;
shape.p1.price = entry;
shape.p2.price = entry;

const risk =
Number(shape.riskUsd);

if(
Number.isFinite(risk) &&
risk > 0
){
shape.riskUsd = risk;
}else{
delete shape.riskUsd;
}

}

return shape;

}

const LEGACY_TF_KEYS = ["1", "5", "15", "60", "240", "D"];

function storageKey(){
return `drawings_${getSymbol()}`;
}

function loadDrawings(){

if(
!canUseDrawings()
){
drawings = [];
selectedId = null;
return;
}

const key = storageKey();

try{

let raw = localStorage.getItem(key);

if(!raw){

const merged = [];
const seen = new Set();
const sym = getSymbol();

LEGACY_TF_KEYS.forEach(tf=>{

try{

const legacy =
JSON.parse(
localStorage.getItem(`drawings_${sym}_${tf}`) || "[]"
);

legacy.forEach(shape=>{

if(!seen.has(shape.id)){
seen.add(shape.id);
merged.push(shape);
}

});

}catch{}

});

drawings = merged.map(shape=>stripAlertFromShape(normalizeShape(shape)));

sanitizeDrawingsForCurrentSymbol();

if(drawings.length){
localStorage.setItem(
storageKey(),
JSON.stringify(drawings)
);
}

return;

}

drawings = JSON.parse(raw).map(shape=>stripAlertFromShape(normalizeShape(shape)));

}catch{

drawings = [];

}

sanitizeDrawingsForCurrentSymbol();

}

function stripAlertFromShape(shape){

const cleaned = {
...shape,
isAlert: false
};

delete cleaned.alertCreatedAt;
delete cleaned.alertTf;
delete cleaned.alertSymbol;

if(cleaned.savedColor){
cleaned.color = cleaned.savedColor;
delete cleaned.savedColor;
}

if(cleaned.savedLineWidth != null){
cleaned.lineWidth = cleaned.savedLineWidth;
delete cleaned.savedLineWidth;
}

return cleaned;

}

function isAlertOwnedByOtherSymbol(
shapeId,
currentSym
){

for(let i = 0; i < localStorage.length; i++){

const key =
localStorage.key(i);

if(
!key?.startsWith("drawings_")
){
continue;
}

const owner =
key.slice("drawings_".length);

const legacy =
owner.match(
/^(.+)_(1|5|15|60|240|D)$/
);

const fileSym =
legacy
? legacy[1]
: owner;

if(
fileSym === currentSym
){
continue;
}

try{

const list =
JSON.parse(
localStorage.getItem(key) || "[]"
);

if(
!Array.isArray(list)
){
continue;
}

const other =
list.find(
s=>
s.id === shapeId &&
s.type === "hray" &&
s.isAlert === true
);

if(other){
return true;
}

}catch{}

}

return false;

}

function sanitizeDrawingsForCurrentSymbol(){

const sym =
getSymbol();

let dirty =
false;

drawings =
drawings.map(shape=>{

if(
shape.type !== "hray" ||
!shape.isAlert
){
return shape;
}

if(
isAlertOwnedByOtherSymbol(
shape.id,
sym
)
){
dirty = true;
return stripAlertFromShape(shape);
}

if(
shape.alertSymbol &&
shape.alertSymbol !== sym
){
dirty = true;
return stripAlertFromShape(shape);
}

if(!shape.alertSymbol){

dirty = true;
return stripAlertFromShape(shape);

}

return shape;

});

if(dirty){

try{

localStorage.setItem(
storageKey(),
JSON.stringify(drawings)
);

}catch{}

}

}

function saveDrawings(){

drawings =
drawings.map(shape=>{
if(
shape?.isAlert
){
return stripAlertFromShape(
shape
);
}
return shape;
});

localStorage.setItem(
storageKey(),
JSON.stringify(drawings)
);

if(
canUseDrawings()
){
bumpDrawingsLocalRevision();
scheduleDrawingsCloudPush();
}else if(
isCloudSyncEnabled()
){
console.warn(
"[drawings] сохранено только локально — войдите в аккаунт (шестерёнка), чтобы строки попали в Supabase."
);
}

window.dispatchEvent(
new CustomEvent(
"drawings-updated",
{
detail:{
symbol: getSymbol()
}
}
)
);

}

function persistDrawingsForSymbol(sym){

if(
!sym ||
!canUseDrawings()
){
return;
}

try{

localStorage.setItem(
`drawings_${sym}`,
JSON.stringify(drawings)
);

bumpDrawingsLocalRevision();
scheduleDrawingsCloudPush();

}catch{}

}

function getSelected(){

return drawings.find(d=>d.id === selectedId) || null;

}

function getFibEditShape(){

if(fibSettingsShapeId){

const pinned =
drawings.find(
d=>
d.id === fibSettingsShapeId &&
d.type === "fib"
);

if(pinned){
return pinned;
}

}

const sel =
getSelected();

if(sel?.type === "fib"){
return sel;
}

return null;

}

function resolveFibStyleTarget(){

if(
isFibSettingsOpen() &&
!getFibEditShape()
){
rememberFibSettingsTarget();
}

return getFibEditShape();

}

function rememberFibSettingsTarget(){

const sel =
getSelected();

if(sel?.type === "fib"){
fibSettingsShapeId = sel.id;
return;
}

const fibs =
drawings.filter(d=>d.type === "fib");

if(fibs.length === 1){
fibSettingsShapeId = fibs[0].id;
}

}

function isFibContext(){

const sel = getSelected();
if(sel?.type === "fib"){
return true;
}
return tool === "fib";
}

function isFibSettingsOpen(){

return !!(
settingsPopover &&
!settingsPopover.classList.contains("hidden")
);

}

function canApplyFibPanel(){

return (
alive &&
(isFibContext() || isFibSettingsOpen())
);

}

function getStyleTargetType(){

const sel = getSelected();
if(sel){
return sel.type;
}
if(tool !== "cursor"){
return tool;
}
return null;
}

function ensureFibSettingsPanel(){

if(
!settingsPopover ||
fibPanelBuilt
){
return;
}

fibPanelBuilt = true;

settingsPopover.innerHTML =
`
<div class="fib-settings">
<label class="fib-trend-label">
<input type="checkbox" id="fib-show-trend-line" />
<span>Линия тренда</span>
</label>
<div class="fib-levels-head">Уровни: значение, цвет, толщина и тип линии</div>
<div class="fib-levels-grid" id="fib-level-rows-root"></div>
</div>
`;

const root =
settingsPopover.querySelector("#fib-level-rows-root");

DEFAULT_FIB_SPEC.forEach((spec,i)=>{

const row =
document.createElement("div");

row.className = "fib-level-row";
row.dataset.fibIndex =
String(i);

row.innerHTML =
`
<input type="checkbox" class="fib-level-on"/>
<input type="text" class="fib-level-val" autocomplete="off" spellcheck="false"/>
<button type="button" class="fib-level-color-btn" title="Цвет уровня" aria-label="Цвет уровня"></button>
<button type="button" class="fib-line-width-btn" title="Толщина уровня" aria-label="Толщина уровня">1px</button>
<button type="button" class="fib-line-style-btn" data-line-style="solid" title="Тип линии" aria-label="Тип линии"></button>
`;

const on =
row.querySelector(".fib-level-on");
const val =
row.querySelector(".fib-level-val");
const colorBtn =
row.querySelector(".fib-level-color-btn");
const widthBtn =
row.querySelector(".fib-line-width-btn");
const styleBtn =
row.querySelector(".fib-line-style-btn");

if(on){
on.checked = !!spec.enabled;
}

if(val){
val.value =
formatFibInputValue(spec.v);
}

setFibLevelColorButton(
colorBtn,
normalizeFibLevelColor(spec.color),
STROKE
);

setFibLevelWidthButton(
widthBtn,
null,
1
);

setFibLineStyleButton(
styleBtn,
"solid"
);

root.appendChild(row);

});

settingsPopover.addEventListener("mousedown", e=>{

if(!alive){
return;
}

const colorBtn =
e.target.closest(".fib-level-color-btn");

if(colorBtn){

e.preventDefault();
e.stopPropagation();

const shape =
getFibEditShape();

const fallback =
shape?.color || STROKE;

closeFibColorMenu();
openFibColorMenu(
colorBtn,
fallback
);

return;

}

const styleBtn =
e.target.closest(".fib-line-style-btn");

if(styleBtn){

e.preventDefault();
e.stopPropagation();

const wasOpen =
fibLineStyleMenuAnchor === styleBtn &&
fibLineStyleMenuPortal &&
!fibLineStyleMenuPortal.classList.contains("hidden");

closeAllFibLineStyleMenus();

if(!wasOpen){
openFibLineStyleMenu(styleBtn);
}

return;

}

const widthBtn =
e.target.closest(".fib-line-width-btn");

if(widthBtn){

e.preventDefault();
e.stopPropagation();

const shape =
getFibEditShape();

const fallback =
shape?.lineWidth || 1;

const wasWidthOpen =
fibLineWidthMenuAnchor === widthBtn &&
fibLineWidthMenuPortal &&
!fibLineWidthMenuPortal.classList.contains("hidden");

closeAllFibLineWidthMenus();
closeAllFibLineStyleMenus();

if(!wasWidthOpen){
openFibLineWidthMenu(
widthBtn,
fallback
);
}

return;

}

}, true);

settingsPopover.addEventListener("change", e=>{

if(!canApplyFibPanel()){
return;
}

if(
e.target?.id === "fib-show-trend-line" ||
e.target?.classList.contains("fib-level-on")
){
scheduleFibApplyImmediate();
}

});

settingsPopover.addEventListener("input", e=>{

if(!canApplyFibPanel()){
return;
}

if(
e.target?.classList.contains("fib-level-val")
){
scheduleFibApplyDebounced();
}

});

if(!settingsPopover.dataset.fibLineMenuBound){

settingsPopover.dataset.fibLineMenuBound = "1";

document.addEventListener("mousedown", e=>{

if(
e.target.closest(
".fib-line-style-btn, .fib-line-style-menu--portal, .fib-line-width-btn, .fib-line-width-menu--portal"
)
){
return;
}

closeAllFibLineStyleMenus();
closeAllFibLineWidthMenus();

});

window.addEventListener("scroll", closeAllFibLineStyleMenus, true);
window.addEventListener("scroll", closeAllFibLineWidthMenus, true);

window.addEventListener("resize", closeAllFibLineStyleMenus);
window.addEventListener("resize", closeAllFibLineWidthMenus);

}

}

function commitFibPanelToShape(){

if(!canApplyFibPanel()){
return false;
}

const shape =
resolveFibStyleTarget();

if(!shape){
return false;
}

const panel =
readFibPanelFromDOM();

shape.fibLevels =
JSON.parse(
JSON.stringify(panel.fibLevels)
);

shape.fibShowTrendLine =
panel.fibShowTrendLine !== false;

saveDrawings();
redraw();

const style =
readStyleFromUI();

saveToolDefaults(
"fib",
{
fibDefaultsVersion: FIB_TOOL_DEFAULTS_VERSION,
color: style.color,
lineWidth: style.lineWidth,
fibLevels: shape.fibLevels,
fibShowTrendLine:
shape.fibShowTrendLine === true
}
);

return true;

}

fibPanelCommitHook = ()=>{

rememberFibSettingsTarget();
commitFibPanelToShape();

};

function applyFibSettingsFromPanel(){

commitFibPanelToShape();

}

function setFibLevelColorButton(btn, color, fallback){

if(!btn){
return;
}

const picked =
normalizeFibLevelColor(color);

if(picked){
btn.dataset.customColor = picked;
btn.style.background = picked;
btn.classList.add("has-custom");
return;
}

delete btn.dataset.customColor;
btn.style.background = fallback || STROKE;
btn.classList.remove("has-custom");

}

function closeFibColorMenu(){

if(fibColorMenuPortal){
fibColorMenuPortal.classList.add("hidden");
}

fibColorMenuAnchor = null;

}

function openFibColorMenu(anchorBtn, fallbackColor){

const portal =
ensureFibColorMenuPortal();

fibColorMenuAnchor = anchorBtn;

const active =
anchorBtn.dataset.customColor ||
fallbackColor ||
STROKE;

mountTvColorGrid(
portal,
{
activeColor: active,
onSelect: hex=>{

setFibLevelColorButton(
anchorBtn,
hex,
fallbackColor
);

rememberFibSettingsTarget();
closeFibColorMenu();
commitFibPanelToShape();

}
}
);

portal.classList.remove("hidden");

const rect =
anchorBtn.getBoundingClientRect();

portal.style.position = "fixed";
portal.style.left = `${Math.round(rect.left)}px`;
portal.style.top = `${Math.round(rect.bottom + 4)}px`;
portal.style.zIndex = "20000";

}

function ensureFibColorMenuPortal(){

if(fibColorMenuPortal){
return fibColorMenuPortal;
}

const el =
document.createElement("div");

el.className =
"draw-popover tv-color-popover fib-level-color-menu hidden";

document.body.appendChild(el);

el.addEventListener("mousedown", e=>{
e.stopPropagation();
});

document.addEventListener("mousedown", e=>{

if(
e.target.closest(
".fib-level-color-btn, .fib-level-color-menu"
)
){
return;
}

closeFibColorMenu();

});

window.addEventListener("scroll", closeFibColorMenu, true);
window.addEventListener("resize", closeFibColorMenu);

fibColorMenuPortal = el;
return el;

}

function scheduleFibApplyImmediate(){

if(fibApplyTimer){
clearTimeout(fibApplyTimer);
fibApplyTimer = null;
}

if(isFibSettingsOpen()){
applyFibSettingsFromPanel();
return;
}

applyStyleFromUI();

}

function scheduleFibApplyDebounced(){

if(fibApplyTimer){
clearTimeout(fibApplyTimer);
}

fibApplyTimer =
setTimeout(()=>{

fibApplyTimer = null;

if(isFibSettingsOpen()){
applyFibSettingsFromPanel();
return;
}

applyStyleFromUI();

},320);

}

function readFibPanelFromDOM(){

ensureFibSettingsPanel();

const template =
cloneDefaultFibRows();

const trendEl =
settingsPopover.querySelector("#fib-show-trend-line");

const fibShowTrendLine =
!!(trendEl?.checked ?? true);

settingsPopover.querySelectorAll(".fib-level-row").forEach((row,i)=>{

if(
i >= template.length
){
return;
}

const valInp =
row.querySelector(".fib-level-val");
const chk =
row.querySelector(".fib-level-on");
const colorBtn =
row.querySelector(".fib-level-color-btn");
const widthBtn =
row.querySelector(".fib-line-width-btn");
const styleBtn =
row.querySelector(".fib-line-style-btn");

const parsed =
parseFibRatioField(
valInp?.value
);

template[i].v =
parsed != null
? parsed
: DEFAULT_FIB_SPEC[i].v;

template[i].enabled =
!!chk?.checked;

template[i].lineStyle =
normalizeFibLineStyle(
styleBtn?.dataset.lineStyle
);

const levelColor =
normalizeFibLevelColor(
colorBtn?.dataset.customColor
);

if(levelColor){
template[i].color = levelColor;
}else{

const defColor =
normalizeFibLevelColor(
DEFAULT_FIB_SPEC[i]?.color
);

if(defColor){
template[i].color = defColor;
}else{
delete template[i].color;
}

}

const levelWidth =
normalizeFibLevelWidth(
widthBtn?.dataset.customWidth
);

if(levelWidth){
template[i].lineWidth = levelWidth;
}else{
delete template[i].lineWidth;
}

});

return {
fibLevels:template,
fibShowTrendLine
};

}

function mergeFibLevelsAfterGlobalChange(
shape,
panel,
{
clearColors = false,
clearWidths = false
}
){

let levels =
panel
? JSON.parse(
JSON.stringify(panel.fibLevels)
)
: JSON.parse(
JSON.stringify(
normalizeFibLevelsShape(shape.fibLevels)
)
);

levels =
normalizeFibLevelsShape(levels);

levels.forEach(row=>{

if(clearColors){
delete row.color;
}

if(clearWidths){
delete row.lineWidth;
}

});

if(panel){

panel.fibLevels.forEach((pr,i)=>{

if(
i >= levels.length
){
return;
}

levels[i].enabled = !!pr.enabled;
levels[i].v = pr.v;
levels[i].lineStyle =
normalizeFibLineStyle(pr.lineStyle);

const levelColor =
normalizeFibLevelColor(pr.color);

if(
levelColor &&
!clearColors
){
levels[i].color = levelColor;
}

const levelWidth =
normalizeFibLevelWidth(pr.lineWidth);

if(
levelWidth &&
!clearWidths
){
levels[i].lineWidth = levelWidth;
}

});

shape.fibShowTrendLine =
panel.fibShowTrendLine !== false;

}

shape.fibLevels = levels;

}

function applyFibGlobalColorFromToolbar(shape, color){

shape.color = color;

const panel =
isFibSettingsOpen() ||
fibPanelBuilt
? readFibPanelFromDOM()
: null;

mergeFibLevelsAfterGlobalChange(
shape,
panel,
{ clearColors: true, clearWidths: false }
);

if(fibPanelBuilt){
fillFibSettingsPanel(
shape.fibLevels,
shape.fibShowTrendLine,
shape.color,
shape.lineWidth
);
}

}

function applyFibGlobalWidthFromToolbar(shape, lineWidth){

shape.lineWidth = lineWidth;

const panel =
isFibSettingsOpen() ||
fibPanelBuilt
? readFibPanelFromDOM()
: null;

mergeFibLevelsAfterGlobalChange(
shape,
panel,
{ clearColors: false, clearWidths: true }
);

if(fibPanelBuilt){
fillFibSettingsPanel(
shape.fibLevels,
shape.fibShowTrendLine,
shape.color,
shape.lineWidth
);
}

}

function fillFibSettingsPanel(
fibLevels,
fibShowTrendLine,
fallbackColor,
fallbackWidth
){

ensureFibSettingsPanel();

const rows =
Array.isArray(fibLevels) &&
fibLevels.length === DEFAULT_FIB_SPEC.length
? fibLevels.map((row,i)=>{
const def =
DEFAULT_FIB_SPEC[i];
const levelColor =
normalizeFibLevelColor(row.color) ||
normalizeFibLevelColor(def?.color);
return {
v: Number.isFinite(row.v) ? row.v : def?.v ?? 0,
enabled: !!row.enabled,
lineStyle: normalizeFibLineStyle(row.lineStyle) || "solid",
lineWidth: normalizeFibLevelWidth(row.lineWidth) || 1,
...(levelColor ? { color: levelColor } : {})
};
})
: cloneDefaultFibRows();

const baseColor =
fallbackColor || STROKE;

const baseWidth =
normalizeFibLevelWidth(fallbackWidth) || 1;

const trendEl =
settingsPopover.querySelector("#fib-show-trend-line");

if(trendEl){

trendEl.checked =
fibShowTrendLine !== false;

}

rows.forEach((row,i)=>{

const wrap =
settingsPopover.querySelector(
`.fib-level-row[data-fib-index="${i}"]`
);

if(!wrap){
return;
}

const on =
wrap.querySelector(".fib-level-on");
const val =
wrap.querySelector(".fib-level-val");
const colorBtn =
wrap.querySelector(".fib-level-color-btn");
const widthBtn =
wrap.querySelector(".fib-line-width-btn");
const styleBtn =
wrap.querySelector(".fib-line-style-btn");

if(on){
on.checked = !!row.enabled;
}

if(val){
val.value =
formatFibInputValue(row.v);
}

setFibLevelColorButton(
colorBtn,
row.color,
baseColor
);

setFibLevelWidthButton(
widthBtn,
row.lineWidth,
baseWidth
);

setFibLineStyleButton(
styleBtn,
row.lineStyle
);

});

}

function readStyleFromUI(){

const widthActive =
widthPopover?.querySelector(".width-option.active");

const base =
{
color: activeColor ||
STROKE,
lineWidth: Number(
widthActive?.dataset.width || 1
)
};

const tgt =
getStyleTargetType();

if(
tgt === "fib" ||
tool === "fib"
){

Object.assign(
base,
readFibPanelFromDOM()
);
}

return base;

}

function updateColorStripe(color){

activeColor = color;

if(colorStripe){
colorStripe.style.setProperty("--active-color", color);
}

colorPopover?.querySelectorAll(".tv-color-swatch").forEach(btn=>{
btn.classList.toggle(
"active",
btn.dataset.color?.toLowerCase() === color?.toLowerCase()
);
});

}

function setActiveWidth(lineWidth){

widthPopover?.querySelectorAll(".width-option").forEach(btn=>{
btn.classList.toggle(
"active",
Number(btn.dataset.width) === lineWidth
);
});

if(widthLabel){
widthLabel.textContent = `${lineWidth}px`;
}

if(widthPreview){
widthPreview.style.height = `${lineWidth}px`;
}

}

function applyPositionRiskUsd(){

const parsed =
parseMoneyInput(
positionRiskInput?.value ?? ""
);

const sel =
getSelected();
const styleType =
getStyleTargetType();

if(
sel &&
isPositionType(sel.type)
){

if(parsed){
sel.riskUsd = parsed;
}else{
delete sel.riskUsd;
}

saveDrawings();

}

if(
isPositionType(styleType)
){

saveToolDefaults(
styleType,
{
riskUsd: parsed
}
);

const prefs =
loadUserPrefs();

if(parsed){
prefs.positionRiskUsd = parsed;
}else{
delete prefs.positionRiskUsd;
}

saveUserPrefs(prefs);

}

redraw();

}

function fillStyleUI(style, type){

if(!styleBar){
return;
}

const stripeColor =
style.isAlert && style.savedColor
? style.savedColor
: style.color;

updateColorStripe(stripeColor);
setActiveWidth(style.lineWidth);

settingsBtn?.classList.toggle(
"hidden",
type !== "fib"
);

const isPosToolbar =
isPositionType(type);

styleBar?.classList.toggle(
"draw-style-float--position",
isPosToolbar
);

colorBtn?.classList.toggle(
"hidden",
isPosToolbar || !!style.isAlert
);

widthBtn?.classList.toggle(
"hidden",
isPosToolbar || !!style.isAlert
);

positionRiskWrap?.classList.toggle(
"hidden",
!isPosToolbar
);

if(
isPositionType(type) &&
positionRiskInput
){

const sel =
getSelected();
const riskVal =
(
sel &&
isPositionType(sel.type) &&
sel.riskUsd
) ||
style.riskUsd ||
toolDefaults[type]?.riskUsd;

positionRiskInput.value =
riskVal > 0
? String(riskVal)
: "";

}

if(type === "fib"){
fillFibSettingsPanel(
style.fibLevels,
style.fibShowTrendLine,
style.color,
style.lineWidth
);
}else{
settingsPopover?.classList.add("hidden");
}

}

const CHART_SCROLL_DEFAULT = {
mouseWheel:true,
pressedMouseMove:true,
horzTouchDrag:true,
vertTouchDrag:false
};

const CHART_SCROLL_LOCKED = {
mouseWheel:true,
pressedMouseMove:false,
horzTouchDrag:false,
vertTouchDrag:false
};

const CHART_SCROLL_TABLET_CUSTOM_PAN = {
mouseWheel:true,
pressedMouseMove:false,
horzTouchDrag:false,
vertTouchDrag:false
};

/** Смартфон / виджеты: инструмент рисования — тап ставит точку, не pan. */
const CHART_SCROLL_DRAW_TOOL = {
mouseWheel:true,
pressedMouseMove:false,
horzTouchDrag:false,
vertTouchDrag:false
};

function chartScrollWhenUnlocked(){

if(
tabletCustomPanHooked &&
isTabletChartViewport() &&
TABLET_USE_CUSTOM_TOUCH_PAN
){
return CHART_SCROLL_TABLET_CUSTOM_PAN;
}

if(
isCoarseTouchViewport() &&
!tabletCustomPanHooked &&
tool !==
"cursor"
){
return CHART_SCROLL_DRAW_TOOL;
}

return CHART_SCROLL_DEFAULT;

}

function syncChartTouchPan(){

const lock =
alive &&
(
!!dragState ||
(
placement &&
isTouchDrawPlacement()
)
);

try{
chart.applyOptions({
handleScroll: lock
? CHART_SCROLL_LOCKED
: chartScrollWhenUnlocked()
});
}catch{
/* ignore */
}

wrapEl?.classList.toggle(
"chart-touch-locked",
!!lock
);

}

function updateStyleBar(){

syncChartTouchPan();

if(!styleBar){
return;
}

const show =
tool !== "cursor" || !!selectedId;

styleBar.classList.toggle("hidden", !show);

if(show){
syncDrawChromeLayout();
}

if(deleteOneBtn){
deleteOneBtn.style.display =
selectedId ? "inline-flex" : "none";
}

if(!show){
closePopovers();
return;
}

const sel = getSelected();
const type = getStyleTargetType();

if(sel){
fillStyleUI(sel, sel.type);
updateAlertStyleUI();
return;
}

if(tool !== "cursor"){
fillStyleUI(baseDefaultStyle(tool), tool);
}

updateAlertStyleUI();

}

function applyStyleFromUI(scope){

const style = readStyleFromUI();
const type = getStyleTargetType();

if(!type){
return;
}

const sel =
getSelected();

const fibTarget =
type === "fib"
? resolveFibStyleTarget()
: null;

const target =
fibTarget || sel;

if(target){

if(target.type === "fib"){

if(scope === "width"){

applyFibGlobalWidthFromToolbar(
target,
style.lineWidth
);

}else if(scope === "color"){

applyFibGlobalColorFromToolbar(
target,
style.color
);

}else{

applyFibGlobalColorFromToolbar(
target,
style.color
);

applyFibGlobalWidthFromToolbar(
target,
style.lineWidth
);

}

}else if(
target.type === "hray" &&
target.isAlert
){

target.lineWidth = style.lineWidth;

}else{

target.color = style.color;
target.lineWidth = style.lineWidth;

}

saveDrawings();
redraw();

}

const defaultsPayload =
{
color: style.color,
lineWidth: style.lineWidth
};

if(style.fibLevels){

defaultsPayload.fibDefaultsVersion =
FIB_TOOL_DEFAULTS_VERSION;

defaultsPayload.fibLevels =
style.fibLevels;

defaultsPayload.fibShowTrendLine =
style.fibShowTrendLine === true;

}

saveToolDefaults(
type,
defaultsPayload
);

saveGlobalStyle({
color: style.color,
lineWidth: style.lineWidth
});

}

function closePopovers(){

const fibSettingsWasOpen =
isFibSettingsOpen();

colorPopover?.classList.add("hidden");
widthPopover?.classList.add("hidden");
settingsPopover?.classList.add("hidden");
closeAllFibLineStyleMenus();
closeAllFibLineWidthMenus();
closeFibColorMenu();

if(fibSettingsWasOpen){
fibSettingsShapeId = null;
}

}

function positionPopover(popover, offsetY = 40){

if(!popover || !styleBar){
return;
}

const barR =
styleBar.getBoundingClientRect();

popover.style.position = "fixed";
popover.style.left = `${barR.left}px`;
popover.style.top = `${barR.top + offsetY}px`;
popover.style.zIndex = "10051";

}

function isTouchDrawTablet(){

return isCoarseTouchViewport();

}

/** Touch: перекрестье + тап/перетаскивание точек (как iPad на Монетах). */
function isTouchDrawPlacement(){

return isCoarseTouchViewport();

}

function useChartProbeCrosshair(){

return (
typeof onChartCrosshairAt ===
"function" &&
tabletCustomPanHooked &&
isTabletChartViewport()
);

}

function chartCanvasEl(){

return (
wrapEl?.querySelector(
".chart"
) ||
wrapEl?.querySelector(
"#chart"
)
);

}

function clampTouchCrosshairXY(x, y){

const { w, h } =
chartSize();

return {
x: Math.max(0, Math.min(w, x)),
y: Math.max(0, Math.min(h, y))
};

}

function initTouchDrawCrosshair(){

const { w, h } =
chartSize();

touchDrawCrosshair = {
x: w / 2,
y: h / 2
};

syncTouchDrawCrosshairPreview();

}

function crosshairClientFromLocal(
localX,
localY
){

const rect =
wrapEl.getBoundingClientRect();

return {
clientX: rect.left + localX,
clientY: rect.top + localY
};

}

/** Тот же курсор, что на графике: LW на десктопе, probe на iPad. */
function showStandardChartCrosshair(
e,
localX,
localY
){

const xy =
clampTouchCrosshairXY(
localX,
localY
);

const point =
pointFromXY(
xy.x,
xy.y
);

if(
!isTouchDrawTablet()
){

if(
point &&
chart &&
series
){

try{
chart.setCrosshairPosition(
point.price,
point.time,
series
);
}catch{
/* ignore */
}

}

return;

}

const clientX =
e?.clientX;

const clientY =
e?.clientY;

const client =
clientX != null &&
clientY != null
? { clientX, clientY }
: crosshairClientFromLocal(
xy.x,
xy.y
);

if(
useChartProbeCrosshair()
){

try{
onChartCrosshairAt(
client.clientX,
client.clientY
);
}catch{
/* ignore */
}

return;

}

positionDomChartCrosshair({
wrapEl,
chartEl:chartCanvasEl(),
chart,
series,
clientX:client.clientX,
clientY:client.clientY
});

}

function hideStandardChartCrosshair(){

if(
isTouchDrawTablet()
){

if(
useChartProbeCrosshair()
){

try{
onChartCrosshairClear?.();
}catch{
/* ignore */
}

}else{

hideDomChartCrosshair(
wrapEl
);

if(
chart
){

try{
chart.clearCrosshairPosition();
}catch{
/* ignore */
}

}

}

return;

}

hideDomChartCrosshair(
wrapEl
);

if(
chart
){

try{
chart.clearCrosshairPosition();
}catch{
/* ignore */
}

}

}

function syncTouchDrawCrosshairPreview(){

if(
!touchDrawCrosshair
){
previewPoint = null;
previewXY = null;
return;
}

previewXY = {
x: touchDrawCrosshair.x,
y: touchDrawCrosshair.y
};

previewPoint =
pointFromXY(
touchDrawCrosshair.x,
touchDrawCrosshair.y
);

if(
placement &&
isTouchDrawPlacement()
){
showStandardChartCrosshair(
null,
touchDrawCrosshair.x,
touchDrawCrosshair.y
);
}

}

function syncEditDragCrosshair(
e,
localX,
localY
){

if(
!dragState
){
return;
}

showStandardChartCrosshair(
e,
localX,
localY
);

}

function beginEditDragCrosshair(
e,
localX,
localY
){

try{
onChartCrosshairSuppress?.();
}catch{
/* ignore */
}

if(
!isTouchDrawTablet() &&
chart
){

try{
chart.clearCrosshairPosition();
}catch{
/* ignore */
}

}

syncEditDragCrosshair(
e,
localX,
localY
);

}

function clearEditDragCrosshair(){

hideStandardChartCrosshair();

try{
onChartCrosshairRelease?.();
}catch{
/* ignore */
}

}

function placementPointsNeeded(type){

if(type === "channel"){
return 3;
}

if(
type === "hray" ||
isPositionType(type)
){
return 1;
}

return 2;

}

function placeTouchCrosshairPoint(){

if(
!placement ||
!touchDrawCrosshair
){
return;
}

const point =
pointFromXY(
touchDrawCrosshair.x,
touchDrawCrosshair.y
);

if(!point){
return;
}

placement.points.push(point);
blockChartClick = true;

if(
placement.points.length >=
placementPointsNeeded(placement.type)
){
finishPlacement();
return;
}

syncTouchDrawCrosshairPreview();
redraw();

}

function pointFromParam(param){

if(!param.point){
return null;
}

const price =
series.coordinateToPrice(param.point.y);

if(price == null || !Number.isFinite(price)){
return null;
}

let time = null;

if(param.time != null){
time = normalizeTime(param.time);
}

if(time == null){
time = timeFromX(param.point.x);
}

if(time == null){
return null;
}

return { time, price };

}

function toXY(point){

const x = xFromTime(point.time);
const y = series.priceToCoordinate(point.price);

if(x == null || y == null){
return null;
}

return { x, y };

}

function positionBadgeFont(){

return '600 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif';

}

function positionBadgeFontEntry(){

return '600 10px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif';

}

function positionBadgeFontVolume(){

return '800 14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif';

}

const POSITION_VOLUME_COLOR = "#FEF08C";

function resolvePositionBadgeFont(kind, variant){

if(kind === "volume"){
return positionBadgeFontVolume();
}

if(kind === "badge"){
return positionBadgeFont();
}

if(kind === "entry"){
return positionBadgeFontEntry();
}

if(variant === "entry"){
return positionBadgeFontEntry();
}

return positionBadgeFont();

}

function positionMinWidthPx(){

const ctx =
canvas.getContext("2d");

if(!ctx){
return 220;
}

ctx.save();
ctx.font = positionBadgeFont();

const w =
ctx.measureText(POSITION_RR_LABEL_SAMPLE).width + 28;

ctx.restore();
return Math.ceil(w);

}

function ensurePositionP2MinWidth(p1, p2){

const entry =
p1.price;
const minW =
positionMinWidthPx();
const a =
toXY(p1);

if(!a){
return p2;
}

let t1 =
normalizeTime(p1.time);
let t2 =
normalizeTime(p2?.time ?? p1.time);

if(
t1 == null ||
t2 == null
){
return p2;
}

if(t2 < t1){
t2 = t1;
}

const candles =
candleSeries();
let b =
toXY({ time: t2, price: entry });

for(let step = 0; step < 320; step++){

if(
b &&
Math.abs(b.x - a.x) >= minW
){
break;
}

if(candles.length >= 2){

const idx =
candles.findIndex(c=>c.time >= t2);
let nextIdx =
idx < 0
? candles.length - 1
: Math.min(candles.length - 1, idx + 1);

if(
nextIdx <= idx ||
candles[nextIdx].time <= t2
){

const last =
candles[candles.length - 1];
const prev =
candles[candles.length - 2] || last;
const dt =
Math.max(60, last.time - prev.time);

t2 = last.time + dt * (step + 1);

}else{

t2 = candles[nextIdx].time;

}

}else{

t2 = t1 + 3600 * (step + POSITION_DEFAULT_WIDTH_BARS);

}

b = toXY({ time: t2, price: entry });

}

return {
time: t2,
price: entry
};

}

function defaultPositionP2(p1){

const candles =
candleSeries();

if(!candles.length){
return ensurePositionP2MinWidth(
p1,
{
time: p1.time,
price: p1.price
}
);
}

const t0 =
normalizeTime(p1.time);

let idx =
candles.findIndex(c=>c.time >= t0);

if(idx < 0){
idx = candles.length - 1;
}

const targetIdx =
Math.min(
candles.length - 1,
idx + POSITION_DEFAULT_WIDTH_BARS
);

return ensurePositionP2MinWidth(
p1,
{
time: candles[targetIdx].time,
price: p1.price
}
);

}

function initialPositionTpSlPercent(type, entryN){

if(type === "long"){
return {
tpPrice: entryN * (1 + POSITION_DEFAULT_TP_PCT),
slPrice: entryN * (1 - POSITION_DEFAULT_SL_PCT)
};
}

return {
tpPrice: entryN * (1 - POSITION_DEFAULT_TP_PCT),
slPrice: entryN * (1 + POSITION_DEFAULT_SL_PCT)
};

}

function initialPositionTpSl(type, entry){

const entryN =
Number(entry);

if(!Number.isFinite(entryN) || entryN <= 0){
return {
tpPrice: entryN,
slPrice: entryN
};
}

const yEntry =
series.priceToCoordinate(entryN);

if(yEntry == null){
return initialPositionTpSlPercent(
type,
entryN
);
}

const tpPx =
POSITION_DEFAULT_TP_ZONE_PX;
const slPx =
POSITION_DEFAULT_SL_ZONE_PX;

if(type === "long"){

const tpPrice =
series.coordinateToPrice(yEntry - tpPx);
const slPrice =
series.coordinateToPrice(yEntry + slPx);

return {
tpPrice:
Number.isFinite(tpPrice) && tpPrice > entryN
? tpPrice
: entryN * (1 + POSITION_DEFAULT_TP_PCT),
slPrice:
Number.isFinite(slPrice) && slPrice < entryN
? slPrice
: entryN * (1 - POSITION_DEFAULT_SL_PCT)
};

}

const slPrice =
series.coordinateToPrice(yEntry - slPx);
const tpPrice =
series.coordinateToPrice(yEntry + tpPx);

return {
tpPrice:
Number.isFinite(tpPrice) && tpPrice < entryN
? tpPrice
: entryN * (1 - POSITION_DEFAULT_TP_PCT),
slPrice:
Number.isFinite(slPrice) && slPrice > entryN
? slPrice
: entryN * (1 + POSITION_DEFAULT_SL_PCT)
};

}

function clampPositionPrices(
shape,
opts = {}
){

const skipMinWidth =
!!opts.skipMinWidth;

const entry =
positionEntryPrice(shape);

if(!Number.isFinite(entry)){
return;
}

shape.p1.price = entry;

if(!skipMinWidth){
shape.p2 =
ensurePositionP2MinWidth(
shape.p1,
shape.p2 || shape.p1
);
}

shape.p2.price = entry;

const tp =
Number(shape.tpPrice);
const sl =
Number(shape.slPrice);

if(shape.type === "long"){

shape.tpPrice =
Number.isFinite(tp) && tp > entry
? tp
: entry * (1 + POSITION_DEFAULT_TP_PCT);

shape.slPrice =
Number.isFinite(sl) && sl < entry
? sl
: entry * (1 - POSITION_DEFAULT_SL_PCT);

return;

}

shape.tpPrice =
Number.isFinite(tp) && tp < entry
? tp
: entry * (1 - POSITION_DEFAULT_TP_PCT);

shape.slPrice =
Number.isFinite(sl) && sl > entry
? sl
: entry * (1 + POSITION_DEFAULT_SL_PCT);

}

function positionXBounds(shape){

const a =
toXY(shape.p1);
const b =
toXY(shape.p2);

if(!a || !b){
return null;
}

return {
x1: Math.min(a.x, b.x),
x2: Math.max(a.x, b.x),
yEntry: a.y
};

}

function positionBodyDist(px, py, shape){

if(!isPositionType(shape.type)){
return Infinity;
}

const box =
positionXBounds(shape);

if(!box){
return Infinity;
}

const yTp =
series.priceToCoordinate(shape.tpPrice);
const ySl =
series.priceToCoordinate(shape.slPrice);

if(
yTp == null ||
ySl == null
){
return Infinity;
}

const { x1, x2, yEntry } = box;
const isLong =
shape.type === "long";

let dist = Infinity;

if(isLong){

dist = Math.min(
dist,
distToRect(px, py, x1, yTp, x2, yEntry),
distToRect(px, py, x1, yEntry, x2, ySl)
);

}else{

dist = Math.min(
dist,
distToRect(px, py, x1, yEntry, x2, ySl),
distToRect(px, py, x1, yTp, x2, yEntry)
);

}

dist = Math.min(
dist,
distToSegment(px, py, x1, yEntry, x2, yEntry)
);

return dist;

}

function positionMetrics(shape){

const entry =
positionEntryPrice(shape);

if(!Number.isFinite(entry) || entry === 0){
return {
tpPct: 0,
slPct: 0,
rr: "—"
};
}

const tpPct =
Math.abs(shape.tpPrice - entry) / entry * 100;
const slPct =
Math.abs(shape.slPrice - entry) / entry * 100;
const rr =
slPct > 0
? (tpPct / slPct).toFixed(2)
: "—";

return { tpPct, slPct, rr };

}

function positionSizingFromShape(shape){

const metrics =
positionMetrics(shape);

return calcPositionSizing(
shape.riskUsd,
metrics.tpPct,
metrics.slPct
);

}

/** Таблетки TP/SL снаружи объекта (не на цветной зоне) */
const POSITION_EDGE_BADGE_GAP =
4;

const POSITION_EDGE_BADGE_H =
18;

function positionBadgeCyOutside(
edgeY,
side
){

const half =
POSITION_EDGE_BADGE_H /
2;

if(
side ===
"above"
){
return edgeY -
POSITION_EDGE_BADGE_GAP -
half;
}

return edgeY +
POSITION_EDGE_BADGE_GAP +
half;

}

function formatPositionPrice(price){

const n =
Number(price);

if(!Number.isFinite(n)){
return "—";
}

const abs =
Math.abs(n);

if(abs >= 1000){
return n.toFixed(1);
}

if(abs >= 1){
return n.toFixed(4);
}

return n.toFixed(6);

}

function drawPositionBadge(
ctx,
text,
cx,
cy,
variant
){

ctx.save();
ctx.textBaseline = "middle";

const padX = 8;
let fill =
"rgba(15, 23, 42, 0.92)";
let stroke =
"rgba(148, 163, 184, 0.35)";

if(variant === "tp"){
fill = "rgba(22, 101, 52, 0.95)";
stroke = "rgba(74, 222, 128, 0.45)";
}else if(variant === "sl"){
fill = "rgba(127, 29, 29, 0.95)";
stroke = "rgba(248, 113, 113, 0.45)";
}else if(variant === "long-center"){
fill = "rgba(22, 101, 52, 0.95)";
stroke = "rgba(74, 222, 128, 0.55)";
}else if(variant === "short-center"){
fill = "rgba(127, 29, 29, 0.95)";
stroke = "rgba(248, 113, 113, 0.55)";
}else if(variant === "rr"){
fill = "rgba(30, 41, 59, 0.95)";
stroke = "rgba(250, 204, 21, 0.4)";
}else if(variant === "entry"){
fill = "rgba(113, 63, 18, 0.95)";
stroke = "rgba(250, 204, 21, 0.45)";
}

const segments =
Array.isArray(text)
? text
: [{ text, font: variant }];

const hasVolumeHighlight =
segments.some(seg=>seg.font === "volume");

const measured =
segments.map(seg=>{

const font =
resolvePositionBadgeFont(seg.font, variant);

ctx.font = font;

return {
text: seg.text,
font,
color: seg.color,
highlight: seg.highlight === true,
width: ctx.measureText(seg.text).width
};

});

const textWidth =
measured.reduce((sum, seg)=>sum + seg.width, 0);
const bw =
textWidth + padX * 2;
const bh =
hasVolumeHighlight
? 22
: 18;
const left =
cx - bw / 2;
const top =
cy - bh / 2;
const r =
bh / 2;

ctx.beginPath();
ctx.roundRect(left, top, bw, bh, r);
ctx.fillStyle = fill;
ctx.fill();
ctx.strokeStyle = stroke;
ctx.lineWidth = 1;
ctx.stroke();

ctx.textAlign = "left";

let x =
cx - textWidth / 2;

measured.forEach(seg=>{

ctx.font = seg.font;

if(seg.highlight){

const pad = 4;
const pillH =
bh - 6;
const pillTop =
cy - pillH / 2;

ctx.fillStyle = "rgba(0, 0, 0, 0.55)";
ctx.beginPath();
ctx.roundRect(
x - pad,
pillTop,
seg.width + pad * 2,
pillH,
4
);
ctx.fill();

}

ctx.fillStyle =
seg.color ||
(
variant === "long-center" ||
variant === "short-center"
? "#ffffff"
: "#f8fafc"
);
ctx.fillText(seg.text, x, cy);
x += seg.width;

});

ctx.restore();

}

function drawPositionPriceTags(
ctx,
shape,
chartW
){

const entry =
positionEntryPrice(shape);
const yEntry =
series.priceToCoordinate(entry);
const yTp =
series.priceToCoordinate(shape.tpPrice);
const ySl =
series.priceToCoordinate(shape.slPrice);

if(
yEntry == null ||
yTp == null ||
ySl == null
){
return;
}

const tagX =
chartW - 6;
const items = [
{ y: yTp, text: formatPositionPrice(shape.tpPrice), variant: "tp" },
{ y: yEntry, text: formatPositionPrice(entry), variant: "rr" },
{ y: ySl, text: formatPositionPrice(shape.slPrice), variant: "sl" }
];

items.forEach(item=>{

ctx.save();
ctx.font =
'600 10px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif';
ctx.textAlign = "right";
ctx.textBaseline = "middle";

const padX = 6;
const padY = 3;
const tw =
ctx.measureText(item.text).width + padX * 2;
const th = 16;
const left =
tagX - tw;
const top =
item.y - th / 2;

let fill =
"rgba(30, 41, 59, 0.95)";

if(item.variant === "tp"){
fill = "rgba(22, 101, 52, 0.95)";
}else if(item.variant === "sl"){
fill = "rgba(127, 29, 29, 0.95)";
}else{
fill = "rgba(113, 63, 18, 0.95)";
}

ctx.fillStyle = fill;
ctx.beginPath();
ctx.roundRect(left, top, tw, th, 3);
ctx.fill();
ctx.fillStyle = "#f8fafc";
ctx.fillText(item.text, tagX - padX, item.y);
ctx.restore();

});

}

function drawPosition(ctx, shape, showLabels){

const box =
positionXBounds(shape);

if(!box){
return;
}

const yTp =
series.priceToCoordinate(shape.tpPrice);
const ySl =
series.priceToCoordinate(shape.slPrice);

if(
yTp == null ||
ySl == null
){
return;
}

const { x1, x2, yEntry } = box;
const w =
x2 - x1;
const isLong =
shape.type === "long";

ctx.save();

if(isLong){

ctx.fillStyle = POSITION_TP_FILL;
ctx.fillRect(
x1,
Math.min(yEntry, yTp),
w,
Math.abs(yEntry - yTp)
);

ctx.fillStyle = POSITION_SL_FILL;
ctx.fillRect(
x1,
Math.min(yEntry, ySl),
w,
Math.abs(yEntry - ySl)
);

}else{

ctx.fillStyle = POSITION_SL_FILL;
ctx.fillRect(
x1,
Math.min(yEntry, ySl),
w,
Math.abs(yEntry - ySl)
);

ctx.fillStyle = POSITION_TP_FILL;
ctx.fillRect(
x1,
Math.min(yEntry, yTp),
w,
Math.abs(yEntry - yTp)
);

}

ctx.strokeStyle = POSITION_ENTRY_COLOR;
ctx.lineWidth = 2;
ctx.setLineDash([]);
ctx.beginPath();
ctx.moveTo(x1, yEntry);
ctx.lineTo(x2, yEntry);
ctx.stroke();

ctx.restore();

if(!showLabels){
return;
}

const sizing =
positionSizingFromShape(shape);

const metrics =
positionMetrics(shape);
const cx =
(x1 + x2) / 2;
const topY =
Math.min(
yEntry,
yTp,
ySl
);
const botY =
Math.max(
yEntry,
yTp,
ySl
);

let tpText;
let slText;
let entryText;

if(
sizing
){

tpText =
`TP: ${sizing.tpPct.toFixed(2)}% (${formatMoneyUsd(sizing.profitUsd)})`;

slText =
`SL: ${sizing.slPct.toFixed(2)}% (${formatMoneyUsd(sizing.riskUsd)})`;

}else{

if(
isLong
){

tpText = `${metrics.tpPct.toFixed(3)}%`;
slText = `${metrics.slPct.toFixed(3)}%`;

}else{

slText = `${metrics.slPct.toFixed(3)}%`;
tpText = `${metrics.tpPct.toFixed(3)}%`;

}

entryText =
`RR: ${metrics.rr}`;

}

const centerVariant =
isLong
? "long-center"
: "short-center";

if(
isLong
){

drawPositionBadge(
ctx,
tpText,
cx,
positionBadgeCyOutside(
topY,
"above"
),
"tp"
);

drawPositionBadge(
ctx,
slText,
cx,
positionBadgeCyOutside(
botY,
"below"
),
"sl"
);

}else{

drawPositionBadge(
ctx,
slText,
cx,
positionBadgeCyOutside(
topY,
"above"
),
"sl"
);

drawPositionBadge(
ctx,
tpText,
cx,
positionBadgeCyOutside(
botY,
"below"
),
"tp"
);

}

if(
sizing
){

drawPositionBadge(
ctx,
[
{ text:"Объем ", font:"entry" },
{
text: formatVolumeUsd(
sizing.volume
),
font: "volume",
color: POSITION_VOLUME_COLOR
},
{ text:` $ RR: ${sizing.rrNum.toFixed(2)}`, font:"entry" }
],
cx,
yEntry,
centerVariant
);

}else{

drawPositionBadge(
ctx,
entryText,
cx,
yEntry,
centerVariant
);

}

drawPositionPriceTags(
ctx,
shape,
chartSize().w
);

}

function chartSize(){
return {
w: wrapEl.clientWidth,
h: wrapEl.clientHeight
};
}

function getPriceGutterWidth(){

try{
return chart.priceScale("right").width() || 56;
}catch{
return 56;
}

}

function getPlotWidth(){

return Math.max(
0,
chartSize().w - getPriceGutterWidth()
);

}

function removePriceGutterOverlay(){

if(priceGutterEl){
priceGutterEl.remove();
priceGutterEl = null;
}

}

function drawScalePriceBadge(
ctx,
y,
price,
color
){

if(
y == null ||
!Number.isFinite(y) ||
!Number.isFinite(Number(price))
){
return;
}

const text =
formatPrice(Number(price));

const chartW =
chartSize().w;
const scaleW =
getPriceGutterWidth();
const left =
chartW - scaleW;
const th =
CHART_SCALE_LABEL_LINE_HEIGHT;
const top =
y - th / 2;
const textX =
left + CHART_SCALE_LABEL_PAD_LEFT;

ctx.save();
ctx.font =
`normal ${chartScaleFont()}`;
ctx.textAlign = "left";
ctx.textBaseline = "middle";

const bg =
color || "rgba(30, 41, 59, 0.95)";

ctx.fillStyle = bg;
ctx.fillRect(left, top, scaleW, th);
ctx.fillStyle =
scaleLabelTextColorForBackground(bg);
ctx.fillText(text, textX, y);
ctx.restore();

}

function drawPriceScaleLabels(ctx){

drawings.forEach(shape=>{

if(shape.type !== "hray"){
return;
}

const y =
series.priceToCoordinate(shape.price);

if(y == null){
return;
}

const { color } =
shapeStyle(shape);

drawScalePriceBadge(
ctx,
y,
shape.price,
color
);

});

if(!selectedId){
return;
}

const sel =
drawings.find(d=>d.id === selectedId);

if(
!sel ||
sel.type === "hray"
){
return;
}

listHandles(sel).forEach(handle=>{

const xy =
toXY(handle.point);

if(!xy){
return;
}

const { color } =
shapeStyle(sel);

drawScalePriceBadge(
ctx,
xy.y,
handle.point.price,
color
);

});

}

function resizeCanvas(){

const dpr = window.devicePixelRatio || 1;
const { w, h } = chartSize();

canvas.width = Math.max(1, Math.floor(w * dpr));
canvas.height = Math.max(1, Math.floor(h * dpr));
canvas.style.width = `${w}px`;
canvas.style.height = `${h}px`;

removePriceGutterOverlay();
scheduleRedraw();

}

function shapeStyle(shape){

return {
color: shape.color || STROKE,
width: shape.lineWidth || 1,
dash: null
};

}

function toggleAlertOnShape(shape){

if(!shape || shape.type !== "hray"){
return;
}

if(shape.isAlert){
shape.isAlert = false;
delete shape.alertCreatedAt;
delete shape.alertTf;
delete shape.alertSymbol;

if(shape.savedColor){
shape.color = shape.savedColor;
delete shape.savedColor;
}

if(shape.savedLineWidth != null){
shape.lineWidth = shape.savedLineWidth;
delete shape.savedLineWidth;
}

removeAlert(
getSymbol(),
shape.id
);

saveDrawings();

}else{

shape.savedColor = shape.color;

if(shape.savedLineWidth == null){
shape.savedLineWidth = shape.lineWidth || 1;
}

shape.isAlert = true;
shape.lineWidth = 1;
shape.alertCreatedAt = Date.now();
shape.alertTf = getTf();
shape.alertSymbol =
String(getSymbol() || "").trim().toUpperCase();

saveDrawings();

const sym =
String(getSymbol() || "").trim().toUpperCase();

const level =
alertPriceFromShape(shape);

if(
!sym ||
!Number.isFinite(level)
){
console.warn(
"Alert: не удалось сохранить — нет символа или цены линии",
sym,
shape.price
);
}else{

if(!shape.alertSymbol){
shape.alertSymbol = sym;
}

void upsertAlert({
id: shape.id,
shapeId: shape.id,
symbol: sym,
price: level,
tf: shape.alertTf,
createdAt: shape.alertCreatedAt
}).then(pushed=>{

if(pushed === false){
console.warn(
"Alert: не записан в Supabase — пересечение заблокировано до синхронизации. Шестерёнка → вход, затем снова включите алерт",
sym,
shape.id
);
}else if(!pushed){
console.warn(
"Alert: не удалось — нет символа или цены линии",
sym,
shape.price
);
}

}).catch(err=>{
console.warn(
"Alert cloud:",
err?.message || err
);
});

saveDrawings();

}

}

if(shape.isAlert){
saveDrawings();
}

updateStyleBar();
redraw();

}

function updateAlertStyleUI(){

alertToggleBtn?.classList.add(
"hidden"
);

colorBtn?.classList.remove(
"hidden"
);

widthBtn?.classList.remove(
"hidden"
);

}

function drawRegistryPriceAlerts(
ctx,
plotW,
h
){

const sym =
String(
getSymbol() ||
""
).trim().toUpperCase();

if(
!sym
){
return;
}

for(
const alert of getActiveAlerts()
){

if(
String(
alert.symbol
).toUpperCase() !==
sym
){
continue;
}

const y =
series.priceToCoordinate(
alert.price
);

if(
y ==
null
){
continue;
}

drawLine(
ctx,
0,
y,
plotW,
y,
ALERT_LINE_COLOR,
1,
ALERT_LINE_DASH
);

}

}

function drawAnchorCircle(ctx, x, y){

ctx.beginPath();
ctx.arc(x, y, 5, 0, Math.PI * 2);
ctx.fillStyle = HANDLE_FILL;
ctx.fill();
ctx.strokeStyle = HANDLE_STROKE;
ctx.lineWidth = 1.5;
ctx.stroke();

}

function drawPositionAnchor(ctx, x, y){

ctx.save();
ctx.beginPath();
ctx.arc(x, y, 7, 0, Math.PI * 2);
ctx.strokeStyle = "#808080";
ctx.lineWidth = 2;
ctx.stroke();
ctx.restore();

}

function getPositionHandleScreens(shape){

const box =
positionXBounds(shape);

if(!box){
return [];
}

const yTp =
series.priceToCoordinate(shape.tpPrice);
const ySl =
series.priceToCoordinate(shape.slPrice);

if(
yTp == null ||
ySl == null
){
return [];
}

const leftX =
box.x1;

return [
{ id: "entryL", x: leftX, y: box.yEntry },
{ id: "entryR", x: box.x2, y: box.yEntry },
{ id: "tp", x: leftX, y: yTp },
{ id: "sl", x: leftX, y: ySl }
];

}

function drawAnchorSquare(ctx, x, y){

ctx.fillStyle = HANDLE_FILL;
ctx.fillRect(x - 4, y - 4, 8, 8);
ctx.strokeStyle = HANDLE_STROKE;
ctx.lineWidth = 1.5;
ctx.strokeRect(x - 4.5, y - 4.5, 9, 9);

}

function listHandles(shape){

if(shape.type === "trendline" || shape.type === "fib"){

return [
{ id: "p1", point: shape.p1 },
{ id: "p2", point: shape.p2 }
];

}

if(shape.type === "hray"){

return [{
id: "anchor",
point: { time: shape.time, price: shape.price }
}];

}

if(shape.type === "channel"){

const p4 = channelP4(shape.p1, shape.p2, shape.p3);

return [
{ id: "p1", point: shape.p1 },
{ id: "p2", point: shape.p2 },
{ id: "p3", point: shape.p3 },
{ id: "p4", point: p4 }
];

}

if(isPositionType(shape.type)){

const entry =
positionEntryPrice(shape);

return [
{ id: "entryL", point: { time: shape.p1.time, price: entry } },
{ id: "entryR", point: { time: shape.p2.time, price: entry } },
{ id: "tp", point: { time: shape.p1.time, price: shape.tpPrice } },
{ id: "sl", point: { time: shape.p1.time, price: shape.slPrice } }
];

}

return [];

}

function hitTestHandle(px, py, shape){

const threshold = 10;

const handleThreshold =
isPositionType(shape.type)
? 16
: threshold;

if(isPositionType(shape.type)){

for(const handle of getPositionHandleScreens(shape)){

if(
Math.hypot(px - handle.x, py - handle.y) <=
handleThreshold
){
return handle.id;
}

}

return null;

}

for(const handle of listHandles(shape)){

const xy =
toXY(handle.point);

if(!xy){
continue;
}

if(Math.hypot(px - xy.x, py - xy.y) <= handleThreshold){
return handle.id;
}

}

return null;

}

function moveHandle(shape, handleId, point){

if(shape.type === "trendline" || shape.type === "fib"){

if(handleId === "p1"){
shape.p1 = { ...point };
}

if(handleId === "p2"){
shape.p2 = { ...point };
}

}

if(shape.type === "hray" && handleId === "anchor"){

shape.time = point.time;
shape.price = point.price;

}

if(shape.type === "channel"){

if(handleId === "p1"){
shape.p1 = { ...point };
}

if(handleId === "p2"){
shape.p2 = { ...point };
}

if(handleId === "p3"){
shape.p3 = { ...point };
}

if(handleId === "p4"){

const a =
toXY(shape.p1);
const b =
toXY(shape.p2);
const p4xy =
toXY(point);

if(
!a ||
!b ||
!p4xy
){
return;
}

const np3 =
pointFromXY(
p4xy.x - (b.x - a.x),
p4xy.y - (b.y - a.y)
);

if(np3){
shape.p3 = np3;
}

}

}

if(isPositionType(shape.type)){

const entry =
positionEntryPrice(shape);

if(handleId === "entryL"){

shape.p1 = {
time: point.time,
price: point.price
};

shape.p2 = {
time: shape.p2.time,
price: point.price
};

clampPositionPrices(
shape,
{ skipMinWidth: true }
);

return;

}

if(handleId === "entryR"){

shape.p2 = {
time: point.time,
price: entry
};

}

if(handleId === "tp"){

const entryNow =
positionEntryPrice(shape);

shape.tpPrice =
shape.type === "long"
? Math.max(point.price, entryNow * 1.0000001)
: Math.min(point.price, entryNow * 0.9999999);

}

if(handleId === "sl"){

const entryNow =
positionEntryPrice(shape);

shape.slPrice =
shape.type === "long"
? Math.min(point.price, entryNow * 0.9999999)
: Math.max(point.price, entryNow * 1.0000001);

}

clampPositionPrices(
shape,
{ skipMinWidth: true }
);

}

}

function pointerFromEvent(e){

const rect = wrapEl.getBoundingClientRect();

return {
x: e.clientX - rect.left,
y: e.clientY - rect.top
};

}

function pointFromXY(px, py){

const price =
series.coordinateToPrice(py);

if(price == null || !Number.isFinite(price)){
return null;
}

const time = timeFromX(px);

if(time == null){
return null;
}

return { time, price };

}

function hrayLineDist(px, py, shape){

const anchor = toXY({
time: shape.time,
price: shape.price
});

if(!anchor){
return Infinity;
}

return distToSegment(
px,
py,
anchor.x,
anchor.y,
chartSize().w,
anchor.y
);

}

function hitTestHrayLine(px, py, shape, threshold = 8){

if(
shape?.type !== "hray"
){
return false;
}

return hrayLineDist(px, py, shape) <= threshold;

}

function trendlineBodyDist(px, py, shape){

if(
shape?.type !== "trendline"
){
return Infinity;
}

const a =
toXY(shape.p1);
const b =
toXY(shape.p2);

if(!a || !b){
return Infinity;
}

return distToSegment(
px,
py,
a.x,
a.y,
b.x,
b.y
);

}

function hitTestTrendlineBody(px, py, shape, threshold = 8){

return (
shape?.type === "trendline" &&
trendlineBodyDist(px, py, shape) <= threshold
);

}

function fibBodyDist(px, py, shape){

if(
shape?.type !== "fib"
){
return Infinity;
}

const a =
toXY(shape.p1);
const b =
toXY(shape.p2);

if(!a || !b){
return Infinity;
}

let dist = Infinity;

const useLog =
isSeriesLogarithmic(series);

getFibRows(shape).forEach(row=>{

if(!row.enabled){
return;
}

const price =
fibPriceAtRatio(
shape.p1.price,
shape.p2.price,
row.v,
useLog
);

if(!Number.isFinite(price)){
return;
}

const y =
series.priceToCoordinate(price);

if(y != null){

const x1 =
Math.min(a.x, b.x);
const x2 =
Math.max(a.x, b.x);

if(
px >= x1 - 8 &&
px <= x2 + 8
){
dist = Math.min(
dist,
Math.abs(py - y)
);
}

}

});

if(
shape.fibShowTrendLine !== false
){

dist = Math.min(
dist,
distToSegment(
px,
py,
a.x,
a.y,
b.x,
b.y
)
);

}

return dist;

}

function hitTestFibBody(px, py, shape, threshold = 8){

return (
shape?.type === "fib" &&
fibBodyDist(px, py, shape) <= threshold
);

}

function channelBodyDist(px, py, shape){

if(
shape?.type !== "channel"
){
return Infinity;
}

const a =
toXY(shape.p1);
const b =
toXY(shape.p2);
const c =
toXY(shape.p3);
const p4 =
toXY(channelP4(shape.p1, shape.p2, shape.p3));
const { midStart, midEnd } =
channelMidPoints(shape.p1, shape.p2, shape.p3);
const m1 =
toXY(midStart);
const m2 =
toXY(midEnd);

if(!a || !b || !c || !p4){
return Infinity;
}

let dist = Math.min(
distToSegment(px, py, a.x, a.y, b.x, b.y),
distToSegment(px, py, c.x, c.y, p4.x, p4.y)
);

if(m1 && m2){
dist = Math.min(
dist,
distToSegment(px, py, m1.x, m1.y, m2.x, m2.y)
);
}

return dist;

}

function hitTestChannelBody(px, py, shape, threshold = 8){

return (
shape?.type === "channel" &&
channelBodyDist(px, py, shape) <= threshold
);

}

function screenDragOffsetsForPoints(
points,
grabX,
grabY
){

const offsets = [];

for(const pt of points){

const xy =
toXY(pt);

if(!xy){
return null;
}

offsets.push({
x: xy.x - grabX,
y: xy.y - grabY
});

}

return offsets;

}

function pointsFromScreenDrag(
offsets,
grabX,
grabY
){

const out = [];

for(const off of offsets){

const p =
pointFromXY(
grabX + off.x,
grabY + off.y
);

if(!p){
return null;
}

out.push(p);

}

return out;

}

function chartPointsForScreenMove(shape){

if(
shape.type === "trendline" ||
shape.type === "fib"
){
return [shape.p1, shape.p2];
}

if(shape.type === "channel"){
return [shape.p1, shape.p2, shape.p3];
}

if(shape.type === "hray"){
return [{
time: shape.time,
price: shape.price
}];
}

if(isPositionType(shape.type)){

return [
shape.p1,
shape.p2,
{ time: shape.p1.time, price: shape.tpPrice },
{ time: shape.p1.time, price: shape.slPrice }
];

}

return null;

}

function shiftPriceByPixels(
price,
dyPx
){

const y =
series.priceToCoordinate(price);

if(
y == null ||
!Number.isFinite(price)
){
return price;
}

const next =
series.coordinateToPrice(y + dyPx);

if(
next == null ||
!Number.isFinite(next)
){
return price;
}

return next;

}

function applyPositionBodyMove(
shape,
startX,
startY,
x,
y,
snapshot
){

const dy =
y - startY;

const tStart =
timeFromX(startX);
const tNow =
timeFromX(x);

if(
tStart == null ||
tNow == null
){
return false;
}

const dTime =
tNow - tStart;
const entry =
shiftPriceByPixels(
snapshot.entry,
dy
);

shape.p1 = {
time: snapshot.p1.time + dTime,
price: entry
};

shape.p2 = {
time: snapshot.p2.time + dTime,
price: entry
};

shape.tpPrice =
shiftPriceByPixels(
snapshot.tpPrice,
dy
);

shape.slPrice =
shiftPriceByPixels(
snapshot.slPrice,
dy
);

clampPositionPrices(
shape,
{ skipMinWidth: true }
);

return true;

}

function hitTestShapeBody(px, py, shape, threshold = 8){

if(shape.type === "trendline"){
return hitTestTrendlineBody(px, py, shape, threshold);
}

if(shape.type === "fib"){
return hitTestFibBody(px, py, shape, threshold);
}

if(shape.type === "channel"){
return hitTestChannelBody(px, py, shape, threshold);
}

if(shape.type === "hray"){
return hitTestHrayLine(px, py, shape, threshold);
}

if(isPositionType(shape.type)){
return positionBodyDist(px, py, shape) <= threshold;
}

return false;

}

function applyScreenMoveToShape(
shape,
offsets,
grabX,
grabY
){

const pts =
pointsFromScreenDrag(
offsets,
grabX,
grabY
);

if(!pts){
return false;
}

if(
shape.type === "trendline" ||
shape.type === "fib"
){

shape.p1 = pts[0];
shape.p2 = pts[1];
return true;

}

if(shape.type === "channel"){

shape.p1 = pts[0];
shape.p2 = pts[1];
shape.p3 = pts[2];
return true;

}

if(shape.type === "hray"){

shape.time = pts[0].time;
shape.price = pts[0].price;
return true;

}

if(isPositionType(shape.type)){

shape.p1 = pts[0];
shape.p2 = pts[1];
shape.tpPrice = pts[2].price;
shape.slPrice = pts[3].price;
clampPositionPrices(shape);
return true;

}

return false;

}

function isDrawChromeTarget(target){

if(!target?.closest){
return false;
}

return !!(
chromePortal?.contains(target) ||
styleBar?.contains(target) ||
colorPopover?.contains(target) ||
widthPopover?.contains(target) ||
settingsPopover?.contains(target) ||
target.closest(".draw-popover") ||
target.closest(".draw-chrome-portal") ||
target.closest(".fib-line-style-menu--portal") ||
target.closest(".fib-line-width-menu--portal") ||
target.closest(".fib-level-color-menu") ||
target.closest(".draw-context-menu") ||
target.closest(".draw-position-risk")
);

}

function rectHitsClient(el, clientX, clientY){

if(
!el ||
el.classList.contains("hidden")
){
return false;
}

const r =
el.getBoundingClientRect();

if(
r.width < 1 ||
r.height < 1
){
return false;
}

return (
clientX >= r.left &&
clientX <= r.right &&
clientY >= r.top &&
clientY <= r.bottom
);

}

function isDrawChromePointerEvent(e){

if(isDrawChromeTarget(e.target)){
return true;
}

return (
rectHitsClient(styleBar, e.clientX, e.clientY) ||
rectHitsClient(positionRiskWrap, e.clientX, e.clientY) ||
rectHitsClient(colorPopover, e.clientX, e.clientY) ||
rectHitsClient(widthPopover, e.clientX, e.clientY) ||
rectHitsClient(settingsPopover, e.clientX, e.clientY) ||
rectHitsClient(fibLineStyleMenuPortal, e.clientX, e.clientY) ||
rectHitsClient(fibLineWidthMenuPortal, e.clientX, e.clientY)
);

}

function setupEditInteraction(){

const onEditDown = e=>{

if(tool !== "cursor" || placement){
return;
}

/*
  Панель стиля внутри chart-wrap: горизонтальные уровни фибы
  ловят pointerdown по всей ширине (|py-y|), из-за чего клики по кнопкам
  перехватывались как перетаскивание объекта.
*/
if(isDrawChromePointerEvent(e)){
return;
}

if(
e.pointerType === "mouse" &&
e.button !== 0
){
return;
}

if(!e.isPrimary){
return;
}

const { x, y } =
pointerFromEvent(e);

/*
  iPad: тап в пустоту снимает выделение; drag только с выбранного объекта.
*/
if(
isTouchDrawTablet()
){

const hitId =
hitTest(
x,
y
);

if(
!hitId
){

if(
selectedId
){
selectedId = null;
updateStyleBar();
redraw();
}

return;

}

if(
hitId !==
selectedId
){

selectedId = hitId;

const picked =
getSelected();

if(
picked?.type ===
"fib"
){
fibSettingsShapeId = picked.id;
}

updateStyleBar();
redraw();
return;

}

const sel =
getSelected();

if(
!sel
){
return;
}

const handleId =
hitTestHandle(
x,
y,
sel
);

const onBody =
hitTestShapeBody(
x,
y,
sel
);

if(
!handleId &&
!onBody
){

selectedId = null;
updateStyleBar();
redraw();
return;

}

if(
handleId
){

dragState = {
shapeId: sel.id,
mode: "handle",
handleId
};

if(
sel.type === "hray" &&
sel.isAlert
){
setAlertDragPaused(
getSymbol(),
sel.id,
true
);
}

}else if(
onBody
){

if(isPositionType(sel.type)){

dragState = {
shapeId: sel.id,
mode: "position-move",
startX: x,
startY: y,
snapshot: {
p1: { ...sel.p1 },
p2: { ...sel.p2 },
tpPrice: sel.tpPrice,
slPrice: sel.slPrice,
entry: positionEntryPrice(sel)
}
};

}else{

const movePoints =
chartPointsForScreenMove(sel);

const offsets =
movePoints
? screenDragOffsetsForPoints(
movePoints,
x,
y
)
: null;

if(!offsets){
return;
}

dragState = {
shapeId: sel.id,
mode: "screen-move",
pointOffsets: offsets
};

if(
sel.type === "hray" &&
sel.isAlert
){
setAlertDragPaused(
getSymbol(),
sel.id,
true
);
}

}

}else{
return;
}

notifyTabletChartGestureAbort();

blockChartClick = true;
e.preventDefault();
e.stopPropagation();

beginEditDragCrosshair(
e,
x,
y
);
syncChartTouchPan();

try{
wrapEl.setPointerCapture(e.pointerId);
}catch{
/* ignore */
}

return;

}

const hitId =
hitTest(
x,
y
);

if(!hitId){

if(selectedId){
selectedId = null;
updateStyleBar();
}

return;

}

if(hitId !== selectedId){

selectedId = hitId;

const picked =
getSelected();

if(picked?.type === "fib"){
fibSettingsShapeId = picked.id;
}

updateStyleBar();
redraw();
return;

}

const sel =
getSelected();

if(!sel){
return;
}

const handleId =
hitTestHandle(x, y, sel);

if(handleId){

dragState = {
shapeId: sel.id,
mode: "handle",
handleId
};

}else if(
hitTestShapeBody(x, y, sel)
){

if(isPositionType(sel.type)){

dragState = {
shapeId: sel.id,
mode: "position-move",
startX: x,
startY: y,
snapshot: {
p1: { ...sel.p1 },
p2: { ...sel.p2 },
tpPrice: sel.tpPrice,
slPrice: sel.slPrice,
entry: positionEntryPrice(sel)
}
};

}else{

const movePoints =
chartPointsForScreenMove(sel);

const offsets =
movePoints
? screenDragOffsetsForPoints(
movePoints,
x,
y
)
: null;

if(!offsets){
return;
}

dragState = {
shapeId: sel.id,
mode: "screen-move",
pointOffsets: offsets
};

}

notifyTabletChartGestureAbort();

}else{
return;
}

blockChartClick = true;
e.preventDefault();
e.stopPropagation();

beginEditDragCrosshair(
e,
x,
y
);
syncChartTouchPan();

try{
wrapEl.setPointerCapture(e.pointerId);
}catch{
/* ignore */
}

};

wrapEl.addEventListener(
"pointerdown",
onEditDown,
true
);

const onEditMove = e=>{

if(!alive || !dragState){
return;
}

if(!e.isPrimary){
return;
}

e.preventDefault();

const { x, y } = pointerFromEvent(e);

syncEditDragCrosshair(
e,
x,
y
);

const shape =
drawings.find(d=>d.id === dragState.shapeId);

if(!shape){
return;
}

if(dragState.mode === "position-move"){

if(
!applyPositionBodyMove(
shape,
dragState.startX,
dragState.startY,
x,
y,
dragState.snapshot
)
){
return;
}

}else if(dragState.mode === "screen-move"){

if(
!applyScreenMoveToShape(
shape,
dragState.pointOffsets,
x,
y
)
){
return;
}

}else{

const point = pointFromXY(x, y);

if(!point){
return;
}

moveHandle(shape, dragState.handleId, point);

}

saveDrawings();

redraw();

};

const onEditUp = ()=>{

if(!alive || !dragState){
return;
}

const draggedShape =
drawings.find(d=>d.id === dragState.shapeId);

if(
draggedShape
){

if(
dragState.mode ===
"position-move" &&
isPositionType(
draggedShape.type
)
){
clampPositionPrices(
draggedShape
);
}

touchShapeRevision(
draggedShape
);
saveDrawings();

}

dragState = null;
clearEditDragCrosshair();
syncChartTouchPan();
redraw();
blockChartClick = true;

};

window.addEventListener("pointermove", onEditMove);
window.addEventListener("pointerup", onEditUp);
window.addEventListener("pointercancel", onEditUp);

}

/**
 * Смартфон: touchstart до LW — иначе pan начинается до pointerdown.
 */
function setupCoarseTouchChartGuard(){

if(
!isCoarseTouchViewport()
){
return;
}

const cap = {
capture:true,
passive:false
};

function touchLocal(
e
){

const t =
e.touches?.[
0
];

if(
!t
){
return null;
}

const rect =
wrapEl.getBoundingClientRect();

return {
x: t.clientX - rect.left,
y: t.clientY - rect.top
};

}

function shouldBlockChartTouch(
e
){

if(
!alive ||
!isActive()
){
return false;
}

if(
dragState
){
return true;
}

/* placement: точки ставятся pointerdown/up на wrapEl — touchstart не блокируем */

if(
tool !==
"cursor"
){
return false;
}

const p =
touchLocal(
e
);

if(
!p
){
return false;
}

if(
hitTest(
p.x,
p.y
)
){
return true;
}

const sel =
getSelected();

if(
!sel
){
return false;
}

return (
!!hitTestHandle(
p.x,
p.y,
sel
) ||
hitTestShapeBody(
p.x,
p.y,
sel
)
);

}

const onTouchStart = e=>{

if(
e.touches.length >
1
){
return;
}

if(
!shouldBlockChartTouch(
e
)
){
return;
}

e.preventDefault();

syncChartTouchPan();

};

const onTouchMove = e=>{

if(
!dragState
){
return;
}

e.preventDefault();

};

wrapEl.addEventListener(
"touchstart",
onTouchStart,
cap
);

wrapEl.addEventListener(
"touchmove",
onTouchMove,
cap
);

}

function setupTouchDrawCrosshair(){

/** iPad: порог «тап», не «перетаскивание перекрестия» */
const TAP_MOVE_PX =
18;

const onTouchPlaceDown = e=>{

if(
!placement ||
tool === "cursor"
){
return;
}

if(!isTouchDrawPlacement()){
return;
}

if(isDrawChromePointerEvent(e)){
return;
}

if(!e.isPrimary){
return;
}

if(
!touchDrawCrosshair
){
initTouchDrawCrosshair();
}

const { x, y } =
pointerFromEvent(e);

touchPlaceTrack = {
id: e.pointerId,
startX: x,
startY: y,
moved: false,
crosshairX: touchDrawCrosshair.x,
crosshairY: touchDrawCrosshair.y
};

e.preventDefault();

};

const onTouchPlaceMove = e=>{

if(
!placement ||
!touchPlaceTrack ||
e.pointerId !== touchPlaceTrack.id
){
return;
}

const { x, y } =
pointerFromEvent(e);
const dx =
x - touchPlaceTrack.startX;
const dy =
y - touchPlaceTrack.startY;

if(
!touchPlaceTrack.moved &&
dx * dx + dy * dy >
TAP_MOVE_PX * TAP_MOVE_PX
){
touchPlaceTrack.moved = true;
}

if(touchPlaceTrack.moved){

touchDrawCrosshair =
clampTouchCrosshairXY(
touchPlaceTrack.crosshairX + dx,
touchPlaceTrack.crosshairY + dy
);

syncTouchDrawCrosshairPreview();
e.preventDefault();
redraw();

}

};

const onTouchPlaceUp = e=>{

if(
!placement ||
!touchPlaceTrack ||
e.pointerId !== touchPlaceTrack.id
){
return;
}

if(!touchPlaceTrack.moved){
placeTouchCrosshairPoint();
e.preventDefault();
}

touchPlaceTrack = null;

};

wrapEl.addEventListener(
"pointerdown",
onTouchPlaceDown,
true
);

wrapEl.addEventListener(
"pointermove",
onTouchPlaceMove,
true
);

wrapEl.addEventListener(
"pointerup",
onTouchPlaceUp,
true
);

wrapEl.addEventListener(
"pointercancel",
onTouchPlaceUp,
true
);

}

function setupContextMenu(){

contextMenuEl =
document.createElement("div");

contextMenuEl.className =
"draw-context-menu hidden";

contextMenuEl.innerHTML = `
<button type="button" class="draw-context-alert-btn" title="Поставить алерт" aria-label="Поставить алерт">
${ALARM_ICON_SVG}
</button>
`;

wrapEl.appendChild(contextMenuEl);

let contextShapeId = null;

function hideContextMenu(){

contextMenuEl.classList.add("hidden");
contextShapeId = null;

}

const contextBtn =
contextMenuEl.querySelector(
".draw-context-alert-btn"
);

contextBtn?.addEventListener("click", e=>{

e.stopPropagation();

const shape =
drawings.find(d=>d.id === contextShapeId);

if(shape){
toggleAlertOnShape(shape);
}

hideContextMenu();

});

wrapEl.addEventListener("contextmenu", e=>{

if(!isActive()){
return;
}

if(placement){

e.preventDefault();
e.stopPropagation();
cancelPlacement();
return;

}

const { x, y } =
pointerFromEvent(e);

const id =
hitTest(x, y);

if(!id){
return;
}

const shape =
drawings.find(d=>d.id === id);

if(!shape || shape.type !== "hray"){
return;
}

e.preventDefault();
e.stopPropagation();

selectedId = id;
updateStyleBar();
redraw();

contextShapeId = id;

if(contextBtn){
const isAlert = shape.isAlert;

contextBtn.title = isAlert
? "Снять алерт"
: "Поставить алерт";

contextBtn.setAttribute(
"aria-label",
contextBtn.title
);

contextBtn.innerHTML = isAlert
? TRASH_ICON_SVG
: ALARM_ICON_SVG;
}

const rect =
wrapEl.getBoundingClientRect();

contextMenuEl.style.left =
`${e.clientX - rect.left}px`;

contextMenuEl.style.top =
`${e.clientY - rect.top}px`;

contextMenuEl.classList.remove("hidden");

});

document.addEventListener("click", e=>{

if(
!contextMenuEl.contains(e.target)
){
hideContextMenu();
}

});

document.addEventListener("keydown", e=>{

if(e.key === "Escape"){
hideContextMenu();
}

});

return hideContextMenu;

}

function drawSelectionHandles(ctx, shape){

if(shape.type === "trendline" || shape.type === "fib"){

const a = toXY(shape.p1);
const b = toXY(shape.p2);

if(a){
drawAnchorCircle(ctx, a.x, a.y);
}

if(b){
drawAnchorCircle(ctx, b.x, b.y);
}

}

if(shape.type === "hray"){

const anchor = toXY({
time: shape.time,
price: shape.price
});

if(anchor){
drawAnchorCircle(ctx, anchor.x, anchor.y);
}

}

if(shape.type === "channel"){

const p1 = toXY(shape.p1);
const p2 = toXY(shape.p2);
const p3 = toXY(shape.p3);
const p4 = toXY(channelP4(shape.p1, shape.p2, shape.p3));

if(p1){
drawAnchorCircle(ctx, p1.x, p1.y);
}

if(p2){
drawAnchorCircle(ctx, p2.x, p2.y);
}

if(p3){
drawAnchorCircle(ctx, p3.x, p3.y);
}

if(p4){
drawAnchorCircle(ctx, p4.x, p4.y);
}

if(p1 && p2){
drawAnchorSquare(
ctx,
(p1.x + p2.x) / 2,
(p1.y + p2.y) / 2
);
}

if(p3 && p4){
drawAnchorSquare(
ctx,
(p3.x + p4.x) / 2,
(p3.y + p4.y) / 2
);
}

}

if(isPositionType(shape.type)){

getPositionHandleScreens(shape).forEach(handle=>{
drawPositionAnchor(ctx, handle.x, handle.y);
});

}

}

function shapeCoordsReady(shape){

if(shape.type === "trendline" || shape.type === "fib"){

return !!(
toXY(shape.p1) &&
toXY(shape.p2)
);

}

if(shape.type === "hray"){

return !!toXY({
time: shape.time,
price: shape.price
});

}

if(shape.type === "channel"){

return !!(
toXY(shape.p1) &&
toXY(shape.p2) &&
toXY(shape.p3)
);

}

if(isPositionType(shape.type)){

return !!(
toXY(shape.p1) &&
toXY(shape.p2) &&
series.priceToCoordinate(shape.tpPrice) != null &&
series.priceToCoordinate(shape.slPrice) != null
);

}

return true;

}

function stopChartPanRedraw(){

chartPanActive = false;

if(chartPanRedrawRaf){
cancelAnimationFrame(chartPanRedrawRaf);
chartPanRedrawRaf = 0;
}

if(chartPanWheelTimer){
clearTimeout(chartPanWheelTimer);
chartPanWheelTimer = null;
}

redraw();

}

function chartPanRedrawLoop(){

if(
!alive ||
!chartPanActive
){
chartPanRedrawRaf = 0;
return;
}

redraw();
chartPanRedrawRaf =
requestAnimationFrame(chartPanRedrawLoop);

}

function startChartPanRedraw(){

chartPanActive = true;

if(!chartPanRedrawRaf){
chartPanRedrawRaf =
requestAnimationFrame(chartPanRedrawLoop);
}

}

function setupChartPanRedraw(){

const onPanDown = e=>{

if(
!alive ||
!isActive()
){
return;
}

if(
e.button !== 0 &&
e.button !== 1
){
return;
}

if(dragState){
return;
}

if(
dragHandle &&
dragHandle.contains(e.target)
){
return;
}

if(isDrawChromePointerEvent(e)){
return;
}

startChartPanRedraw();

};

const onPanWheel = ()=>{

if(!alive || !isActive()){
return;
}

startChartPanRedraw();

if(chartPanWheelTimer){
clearTimeout(chartPanWheelTimer);
}

chartPanWheelTimer =
setTimeout(
stopChartPanRedraw,
150
);

};

wrapEl.addEventListener(
"mousedown",
onPanDown
);

wrapEl.addEventListener(
"wheel",
onPanWheel,
{ passive: true }
);

window.addEventListener(
"mouseup",
stopChartPanRedraw
);

window.addEventListener(
"blur",
stopChartPanRedraw
);

return ()=>{

wrapEl.removeEventListener(
"mousedown",
onPanDown
);

wrapEl.removeEventListener(
"wheel",
onPanWheel
);

window.removeEventListener(
"mouseup",
stopChartPanRedraw
);

window.removeEventListener(
"blur",
stopChartPanRedraw
);

stopChartPanRedraw();

};

}

function scheduleRedraw(){

if(chartPanActive){
return;
}

if(redrawRaf1){
cancelAnimationFrame(redrawRaf1);
}

if(redrawRaf2){
cancelAnimationFrame(redrawRaf2);
}

redrawRaf1 =
requestAnimationFrame(()=>{

redrawRaf2 =
requestAnimationFrame(()=>{

redrawRaf1 = 0;
redrawRaf2 = 0;
redraw();

});

});

}

function redraw(){

try{

const ctx = canvas.getContext("2d");
const dpr = window.devicePixelRatio || 1;
const { w, h } = chartSize();
const plotW =
getPlotWidth();

ctx.setTransform(1, 0, 0, 1, 0, 0);
ctx.clearRect(0, 0, canvas.width, canvas.height);
ctx.scale(dpr, dpr);

removePriceGutterOverlay();

ctx.save();
ctx.beginPath();
ctx.rect(0, 0, plotW, h);
ctx.clip();

drawings.forEach(d=>{

try{
drawShape(ctx, d, plotW, h);

if(d.id === selectedId){
drawSelectionHandles(ctx, d);
}

}catch(err){
console.warn("draw shape", err);
}

});

if(placement){
drawPlacementPreview(ctx, plotW, h);
}

ctx.restore();

drawRegistryPriceAlerts(
ctx,
plotW,
h
);

drawPriceScaleLabels(ctx);

}catch(err){
console.warn("redraw", err);
}

if(
!chartPanActive &&
coordRetryCount < 8 &&
drawings.some(
d=>!shapeCoordsReady(d)
)
){

coordRetryCount++;
scheduleRedraw();

}else{

coordRetryCount = 0;

}

}

function drawLine(ctx, x1, y1, x2, y2, color, width, dash){

ctx.strokeStyle = color;
ctx.lineWidth = width;
ctx.setLineDash(dash || []);

ctx.beginPath();
ctx.moveTo(x1, y1);
ctx.lineTo(x2, y2);
ctx.stroke();

ctx.setLineDash([]);

}

function drawShape(ctx, shape, w, h){

const { color, width, dash } =
shapeStyle(shape);

if(shape.type === "trendline"){

const a = toXY(shape.p1);
const b = toXY(shape.p2);

if(a && b){
drawLine(ctx, a.x, a.y, b.x, b.y, color, width, dash);
}

}

if(shape.type === "hray"){

const anchor = toXY({
time: shape.time,
price: shape.price
});

if(anchor){
drawLine(
ctx,
anchor.x,
anchor.y,
w,
anchor.y,
color,
width,
dash
);
}

}

if(shape.type === "fib"){
drawFib(ctx, shape, color, width);
}

if(shape.type === "channel"){
drawChannel(ctx, shape, color, width);
}

if(isPositionType(shape.type)){
drawPosition(
ctx,
shape,
shape.id === selectedId
);
}

}

function drawFib(ctx, shape, color, width){

const a =
toXY(shape.p1);
const b =
toXY(shape.p2);

if(!a || !b){
return;
}

const x1 =
Math.min(a.x, b.x);
const x2 =
Math.max(a.x, b.x);

const useLog =
isSeriesLogarithmic(series);

getFibRows(shape).forEach(row=>{

if(!row.enabled){
return;
}

const price =
fibPriceAtRatio(
shape.p1.price,
shape.p2.price,
row.v,
useLog
);

if(
!Number.isFinite(price)
){
return;
}

const y =
series.priceToCoordinate(price);

if(y == null){
return;
}

const lineColor =
row.color || color;

const dash =
fibLevelDash(row.lineStyle);

const lineWidth =
normalizeFibLevelWidth(row.lineWidth) ||
width;

drawLine(
ctx,
x1,
y,
x2,
y,
lineColor,
lineWidth,
dash
);

ctx.fillStyle = lineColor;
ctx.font = "11px Arial";
ctx.fillText(
formatFibLabel(row.v),
x2 + 4,
y + 4
);

});

if(
shape.fibShowTrendLine !== false
){

drawLine(
ctx,
a.x,
a.y,
b.x,
b.y,
color,
width,
[]
);

}

}
function drawChannelAtXY(ctx, p1, p2, p3, color, width){

if(!p1 || !p2 || !p3){
return;
}

const dx = p2.x - p1.x;
const dy = p2.y - p1.y;

const p4 = {
x: p3.x + dx,
y: p3.y + dy
};

drawLine(ctx, p1.x, p1.y, p2.x, p2.y, color, width);
drawLine(ctx, p3.x, p3.y, p4.x, p4.y, color, width);

ctx.globalAlpha = 0.55;
drawLine(
ctx,
(p1.x + p3.x) / 2,
(p1.y + p3.y) / 2,
(p2.x + p4.x) / 2,
(p2.y + p4.y) / 2,
color,
Math.max(1, width),
[5, 4]
);
ctx.globalAlpha = 1;

}

function drawChannel(ctx, shape, color, width){

const p1 = toXY(shape.p1);
const p2 = toXY(shape.p2);
const p3 = toXY(shape.p3);

drawChannelAtXY(ctx, p1, p2, p3, color, width);

}

function previewPointToXY(point){

const xy = toXY(point);

if(xy){
return xy;
}

if(point?._xy){
return point._xy;
}

return null;

}

function drawPlacementPreview(ctx, w, h){

if(!placement){
return;
}

const style = baseDefaultStyle(placement.type);
const pts = placement.points;

if(placement.type === "channel"){

if(pts.length === 1){

const a = toXY(pts[0]);
const b = previewPointToXY(
previewPoint || (previewXY ? { _xy: previewXY } : null)
);

if(a && b){
drawLine(ctx, a.x, a.y, b.x, b.y, style.color, style.lineWidth);
}

return;

}

if(pts.length >= 2){

const a = toXY(pts[0]);
const b = toXY(pts[1]);

if(a && b){
drawLine(ctx, a.x, a.y, b.x, b.y, style.color, style.lineWidth);
}

const c = previewPoint
? previewPointToXY(previewPoint)
: previewXY;

if(c){
drawChannelAtXY(ctx, a, b, c, style.color, style.lineWidth);
}

}

return;

}

if(isPositionType(placement.type)){

if(pts.length >= 1){

const p1 =
pts[0];
let p2 =
defaultPositionP2(p1);

if(previewPoint){
p2 = {
time: previewPoint.time,
price: p1.price
};
}

const levels =
initialPositionTpSl(
placement.type,
p1.price
);

drawPosition(
ctx,
{
type: placement.type,
p1,
p2,
tpPrice: levels.tpPrice,
slPrice: levels.slPrice
},
false
);

}

return;

}

if(!previewPoint){
return;
}

const previewXYPoint =
previewPointToXY(
previewPoint
);

if(
pts.length ===
0 &&
previewXYPoint &&
(
placement.type ===
"trendline" ||
placement.type ===
"fib"
)
){

drawAnchorCircle(
ctx,
previewXYPoint.x,
previewXYPoint.y
);

return;

}

if(
pts.length ===
1 &&
previewXYPoint &&
placement.type ===
"trendline"
){

const a =
toXY(
pts[
0
]
);

if(
a
){
drawLine(
ctx,
a.x,
a.y,
previewXYPoint.x,
previewXYPoint.y,
style.color,
style.lineWidth
);
}

return;

}

if(
pts.length ===
1 &&
previewXYPoint &&
placement.type ===
"fib"
){

const previewPts = [
pts[
0
],
previewPoint
];

const previewShape =
{
type: placement.type,
color: style.color,
lineWidth: style.lineWidth,
fibLevels:
style.fibLevels,
fibShowTrendLine:
style.fibShowTrendLine,
p1: previewPts[
0
],
p2: previewPts[
1
]
};

drawShape(
ctx,
previewShape,
w,
h
);

return;

}

const previewPts = [...pts, previewPoint];

const previewShape =
{
type: placement.type,
color: style.color,
lineWidth: style.lineWidth,
fibLevels:
style.fibLevels,
fibShowTrendLine:
style.fibShowTrendLine,
p1: previewPts[0],
p2: previewPts[1],
p3: previewPts[2],
time: previewPts[0]?.time,
price: previewPts[0]?.price
};

if(placement.type === "trendline" && previewPts.length >= 2){
drawShape(ctx, previewShape, w, h);
}

if(placement.type === "hray" && previewPts.length >= 1){
drawShape(ctx, previewShape, w, h);
}

if(placement.type === "fib" && previewPts.length >= 2){
drawShape(ctx, previewShape, w, h);
}

}

function hitTest(px, py){

const threshold = 8;
let best = null;
let bestDist = threshold;

drawings.forEach(d=>{

let dist = Infinity;

if(d.type === "trendline"){

dist = trendlineBodyDist(px, py, d);

}

if(d.type === "hray"){

const anchor = toXY({
time: d.time,
price: d.price
});

if(anchor){
dist = distToSegment(
px,
py,
anchor.x,
anchor.y,
chartSize().w,
anchor.y
);
}

}

if(d.type === "fib"){

dist = fibBodyDist(px, py, d);

}
if(d.type === "channel"){

dist = channelBodyDist(px, py, d);

}

if(isPositionType(d.type)){

dist = positionBodyDist(px, py, d);

}

if(dist < bestDist){
bestDist = dist;
best = d.id;
}

});

return best;

}

function makeShape(type, data){

const style = baseDefaultStyle(type);

return normalizeShape({
id: uid(),
createdAt: Date.now(),
type,
color: style.color,
lineWidth: style.lineWidth,
fibLevels:type === "fib"
? JSON.parse(
JSON.stringify(
style.fibLevels ||
cloneDefaultFibRows()
)
)
:undefined,
fibShowTrendLine:type === "fib"
? style.fibShowTrendLine === true
:undefined,
...data
});

}

function finishPlacement(){

if(!placement){
return;
}

const pts = placement.points;
let created = null;

if(placement.type === "trendline" && pts.length >= 2){
created = makeShape("trendline", { p1: pts[0], p2: pts[1] });
}

if(placement.type === "hray" && pts.length >= 1){
created = makeShape("hray", {
time: pts[0].time,
price: pts[0].price
});
}

if(placement.type === "fib" && pts.length >= 2){
created = makeShape("fib", { p1: pts[0], p2: pts[1] });
}

if(placement.type === "channel" && pts.length >= 3){
created = makeShape("channel", {
p1: pts[0],
p2: pts[1],
p3: pts[2]
});
}

if(
isPositionType(placement.type) &&
pts.length >= 1
){

const p1 =
pts[0];
const p2 =
defaultPositionP2(p1);
const levels =
initialPositionTpSl(
placement.type,
p1.price
);

const posStyle =
baseDefaultStyle(placement.type);

created = makeShape(placement.type, {
p1,
p2,
tpPrice: levels.tpPrice,
slPrice: levels.slPrice,
riskUsd: posStyle.riskUsd
});

}

if(created){
touchShapeRevision(
created
);
drawings.push(created);
selectedId = created.id;
}

placement = null;
previewPoint = null;
previewXY = null;
saveDrawings();
setTool("cursor");
updateStyleBar();
redraw();

}

function startPlacement(type){

placement = { type, points: [] };
previewPoint = null;
previewXY = null;

if(isTouchDrawPlacement()){
initTouchDrawCrosshair();
}

}

function cancelPlacement(){

placement = null;
previewPoint = null;
previewXY = null;
touchDrawCrosshair = null;
touchPlaceTrack = null;
hideStandardChartCrosshair();
redraw();

}

function handleToolClick(param){

if(
tool !== "cursor" &&
isTouchDrawPlacement() &&
placement
){
return;
}

const point =
isTouchDrawPlacement() &&
touchDrawCrosshair
? pointFromXY(
touchDrawCrosshair.x,
touchDrawCrosshair.y
)
: pointFromParam(param);

if(!point){
return;
}

if(tool === "cursor"){

selectedId = hitTest(param.point.x, param.point.y);

const picked =
getSelected();

if(picked?.type === "fib"){
fibSettingsShapeId = picked.id;
}

updateStyleBar();
redraw();
return;

}

if(!placement){
startPlacement(tool);
}

placement.points.push(point);

if(
placement.points.length >=
placementPointsNeeded(placement.type)
){
finishPlacement();
}

}

function setTool(next){

tool = next;
cancelPlacement();

if(
next !== "cursor" &&
isTouchDrawPlacement()
){
startPlacement(next);
}

tools.querySelectorAll("[data-draw-tool]").forEach(btn=>{
btn.classList.toggle(
"active",
btn.dataset.drawTool === tool
);
});

updateStyleBar();
redraw();

}

let lastToolPickStamp = {
name: "",
at: 0
};

function pickDrawTool(
next
){

if(
!next
){
return;
}

if(
!canUseDrawings()
){
window.alert(
DRAW_TOOLS_GUEST_MSG
);
return;
}

const now =
performance.now();

if(
lastToolPickStamp.name ===
next &&
now - lastToolPickStamp.at <
400
){
return;
}

lastToolPickStamp = {
name: next,
at: now
};

if(
next ===
"cursor"
){
setTool(
"cursor"
);
closeAllWidgetDrawToolsMenus();
return;
}

if(
tool ===
next
){
setTool(
"cursor"
);
closeAllWidgetDrawToolsMenus();
return;
}

setTool(
next
);

closeAllWidgetDrawToolsMenus();

}

function deleteSelected(){

if(!selectedId){
return;
}

const removed =
drawings.find(d=>d.id === selectedId);

if(removed?.isAlert){
removeAlert(
getSymbol(),
removed.id
);
}

const symDel =
String(
getSymbol() ||
""
).trim().toUpperCase();

if(
removed?.id &&
symDel
){
recordDrawingTombstone(
symDel,
removed.id
);

void deleteDrawingFromCloud(
symDel,
removed.id
);
}

drawings = drawings.filter(d=>d.id !== selectedId);
selectedId = null;
saveDrawings();
updateStyleBar();
redraw();

}

function clearAllDrawingsOnChart(){

if(!alive){
return false;
}

const sym =
String(getSymbol() || "").trim().toUpperCase();

const hadAlerts =
drawings.some(d=>d.isAlert);

drawings
.filter(d=>d.isAlert)
.forEach(d=>{
removeAlert(
sym,
d.id
);
});

for(
const d of drawings
){
recordDrawingTombstone(
sym,
d.id
);
void deleteDrawingFromCloud(
sym,
d.id
);
}

drawings = [];
selectedId = null;
cancelPlacement();
saveDrawings();

void flushDrawingsCloudPush().catch(err=>{
console.warn(
"clear drawings cloud:",
err?.message || err
);
});

window.dispatchEvent(
new CustomEvent(
"drawings-updated",
{
detail:{
symbol: sym,
cleared: true
}
}
)
);

updateStyleBar();
scheduleRedraw();

return hadAlerts || true;

}

function bindClearAllToolbarButtons(){

const buttons =
tools.querySelectorAll(
".draw-tool-clear-all"
);

buttons.forEach(btn=>{

if(
btn.dataset.clearAllBound ===
"1"
){
return;
}

btn.dataset.clearAllBound = "1";

const runClear = e=>{

e.preventDefault();
e.stopPropagation();
clearAllDrawingsOnChart();

};

btn.addEventListener(
"pointerdown",
runClear,
true
);

btn.addEventListener(
"click",
runClear
);

});

}

clickHandler = param=>{

if(blockChartClick){
blockChartClick = false;
return;
}

handleToolClick(param);

};

crosshairHandler = param=>{

if(
placement &&
param?.point
){

if(
isTouchDrawPlacement() &&
touchDrawCrosshair
){
syncTouchDrawCrosshairPreview();

if(
isPositionType(placement.type) &&
placement.points.length >= 1 &&
previewPoint
){
previewPoint.price = placement.points[0].price;
}

}else{

showStandardChartCrosshair(
null,
param.point.x,
param.point.y
);

previewPoint = pointFromParam(param);

if(
placement &&
isPositionType(placement.type) &&
placement.points.length >= 1 &&
previewPoint
){
previewPoint.price = placement.points[0].price;
}

previewXY = param.point
? { x: param.point.x, y: param.point.y }
: null;

}

const channelPreview =
placement?.type === "channel" &&
placement.points.length > 0 &&
placement.points.length < 3;

const needsPreview =
placement ||
channelPreview;

if(!needsPreview){
return;
}

redraw();

}

};

rangeHandler =
()=>{
redraw();
};

const origChartApplyOptions =
chart.applyOptions.bind(chart);

chartApplyPatchRestore =
()=>{
chart.applyOptions = origChartApplyOptions;
chartApplyPatchRestore = null;
};

chart.applyOptions =
function(opts){

origChartApplyOptions(opts);

if(
alive &&
opts &&
opts.rightPriceScale !==
undefined
){
redraw();
}

};

chart.subscribeClick(clickHandler);
chart.subscribeCrosshairMove(crosshairHandler);
chart.timeScale().subscribeVisibleLogicalRangeChange(rangeHandler);

const onKeyDown = e=>{

if(!alive || !isActive()){
return;
}

if(e.key === "Escape"){

if(isFibSettingsOpen()){

closeAllFibLineStyleMenus();
closeAllFibLineWidthMenus();
closeFibColorMenu();
closePopovers();
return;

}

if(placement){
cancelPlacement();
return;
}

cancelPlacement();
setTool("cursor");

}

if(e.key === "Delete" || e.key === "Backspace"){

const ae =
document.activeElement;
const tag =
ae?.tagName;

if(
tag !== "INPUT" &&
tag !== "TEXTAREA" &&
!ae?.isContentEditable
){

e.preventDefault();
deleteSelected();
}

}

};

window.addEventListener("keydown", onKeyDown);

function handleToolbarToolPick(
e
){

const btn =
e.target.closest?.(
"[data-draw-tool]"
);

if(
!btn ||
!tools.contains(
btn
)
){
return false;
}

if(
btn.closest(
".widget-draw-tools-menu"
) ||
btn.closest(
".widget-draw-tools-toggle"
)
){
return false;
}

e.preventDefault();
e.stopPropagation();
pickDrawTool(
btn.dataset.drawTool
);
return true;

}

const onToolsPointerDown =
e=>{

if(
e.target.closest?.(
".draw-tool-clear-all"
)
){
return;
}

handleToolbarToolPick(
e
);

};

const onToolsClick =
e=>{

const clearBtn =
e.target.closest?.(
".draw-tool-clear-all"
);

if(
clearBtn &&
tools.contains(
clearBtn
)
){
e.preventDefault();
e.stopPropagation();
clearAllDrawingsOnChart();
return;
}

handleToolbarToolPick(
e
);

};

tools.addEventListener(
"pointerdown",
onToolsPointerDown,
true
);

tools.addEventListener(
"click",
onToolsClick,
true
);

bindClearAllToolbarButtons();

function initStylePopovers(){

if(colorPopover){
colorPopover.classList.add("tv-color-popover");
}

colorBtn?.addEventListener("click", e=>{

e.stopPropagation();

const open =
colorPopover?.classList.contains("hidden");

closePopovers();

if(open && colorPopover){

mountTvColorGrid(
colorPopover,
{
activeColor: activeColor || STROKE,
onSelect: hex=>{

updateColorStripe(hex);
applyStyleFromUI("color");
colorPopover.classList.add("hidden");

}
}
);

positionPopover(colorPopover, 40);
colorPopover.classList.remove("hidden");
}

});

widthBtn?.addEventListener("click", e=>{

e.stopPropagation();

const open =
widthPopover?.classList.contains("hidden");

closePopovers();

if(open){
positionPopover(widthPopover, 40);
widthPopover?.classList.remove("hidden");
}

});

widthPopover?.querySelectorAll(".width-option").forEach(btn=>{

btn.addEventListener("click", e=>{

e.stopPropagation();
setActiveWidth(Number(btn.dataset.width));
applyStyleFromUI("width");
widthPopover?.classList.add("hidden");

});

});

settingsBtn?.addEventListener("click", e=>{

e.stopPropagation();

if(!isFibContext()){
return;
}

const open =
settingsPopover?.classList.contains("hidden");

closePopovers();

if(open){
rememberFibSettingsTarget();
positionPopover(settingsPopover, 40);
settingsPopover?.classList.remove("hidden");
}

});

deleteOneBtn?.addEventListener("mousedown", e=>{
e.stopPropagation();
});

deleteOneBtn?.addEventListener("click", e=>{

e.stopPropagation();
e.preventDefault();
deleteSelected();

});

positionRiskInput?.addEventListener(
"mousedown",
e=>{
e.stopPropagation();
}
);

positionRiskInput?.addEventListener(
"click",
e=>{
e.stopPropagation();
}
);

positionRiskInput?.addEventListener(
"input",
()=>{
applyPositionRiskUsd();
}
);

positionRiskWrap?.addEventListener(
"mousedown",
e=>{
e.stopPropagation();
}
);

alertToggleBtn?.addEventListener("click", e=>{

e.stopPropagation();
closePopovers();

const sel =
getSelected();

if(sel?.type === "hray"){
toggleAlertOnShape(sel);
}

});

}

function initFloatingBar(){

if(!styleBar || !wrapEl){
return;
}

const key = barPosKey;
let pos = { x: 8, y: 8 };

try{
pos = JSON.parse(localStorage.getItem(key) || "") || pos;
}catch{}

barOffset = {
x: Number(pos.x) || 8,
y: Number(pos.y) || 8
};

syncDrawChromeLayout();

if(
typeof ResizeObserver !==
"undefined"
){
chromeLayoutObserver =
new ResizeObserver(()=>{
syncDrawChromeLayout();
});

chromeLayoutObserver.observe(wrapEl);
}

window.addEventListener(
"resize",
syncDrawChromeLayout
);

window.addEventListener(
"scroll",
syncDrawChromeLayout,
true
);

let dragging = false;
let dragStart = { x: 0, y: 0 };
let barStart = { x: 0, y: 0 };

dragHandle?.addEventListener("pointerdown", e=>{

if(
e.pointerType === "mouse" &&
e.button !== 0
){
return;
}

if(!e.isPrimary){
return;
}

e.preventDefault();
e.stopPropagation();

dragging = true;
dragStart = { x: e.clientX, y: e.clientY };

const barR =
styleBar.getBoundingClientRect();

barStart = {
x: barR.left,
y: barR.top
};

try{
dragHandle.setPointerCapture(e.pointerId);
}catch{
/* ignore */
}

});

const onBarMove = e=>{

if(!alive || !dragging){
return;
}

const dx = e.clientX - dragStart.x;
const dy = e.clientY - dragStart.y;

const wrap =
wrapEl.getBoundingClientRect();
const barW =
styleBar.offsetWidth;
const barH =
styleBar.offsetHeight;

let fx =
barStart.x + dx;
let fy =
barStart.y + dy;

fx = Math.max(
wrap.left,
Math.min(
wrap.right - barW,
fx
)
);

fy = Math.max(
wrap.top,
Math.min(
wrap.bottom - barH,
fy
)
);

styleBar.style.left = `${fx}px`;
styleBar.style.top = `${fy}px`;

barOffset = {
x: fx - wrap.left,
y: fy - wrap.top
};

syncPopoversPosition();

};

const onBarUp = ()=>{

if(!alive || !dragging){
return;
}

dragging = false;

localStorage.setItem(
key,
JSON.stringify(barOffset)
);

};

function isFibSettingsChromePointerEvent(e){

if(!isFibSettingsOpen()){
return false;
}

return isDrawChromePointerEvent(e);

}

const onDocClick = e=>{

if(!alive || !isActive()){
return;
}

if(isFibSettingsChromePointerEvent(e)){
return;
}

if(
styleBar?.contains(e.target) ||
positionRiskWrap?.contains(e.target) ||
colorPopover?.contains(e.target) ||
widthPopover?.contains(e.target) ||
settingsPopover?.contains(e.target) ||
e.target.closest(".widget-draw-tools") ||
e.target.closest(".draw-tool-clear-all") ||
e.target.closest(".fib-line-style-menu--portal") ||
e.target.closest(".fib-line-width-menu--portal") ||
e.target.closest(".fib-level-color-menu")
){
return;
}

closePopovers();

};

window.addEventListener("pointermove", onBarMove);
window.addEventListener("pointerup", onBarUp);
window.addEventListener("pointercancel", onBarUp);
document.addEventListener("click", onDocClick);

}

function syncPopoversPosition(){

positionPopover(colorPopover, 40);
positionPopover(widthPopover, 40);
positionPopover(settingsPopover, 40);

}

initFloatingBar();
initStylePopovers();
if(
!useChartProbeCrosshair()
){
ensureDomChartCrosshair(
wrapEl
);
}

setupEditInteraction();
setupCoarseTouchChartGuard();
setupTouchDrawCrosshair();

const teardownChartPanRedraw =
setupChartPanRedraw();

const hideContextMenu =
setupContextMenu();

const onDrawingsUpdated = e=>{

if(!alive){
return;
}

const symNorm =
String(getSymbol() || "").trim().toUpperCase();

const eventSym =
String(e.detail?.symbol || "").trim().toUpperCase();

if(
eventSym !== symNorm
){
return;
}

if(e.detail?.cleared){

drawings = [];
selectedId = null;
cancelPlacement();
loadDrawings();
updateStyleBar();
scheduleRedraw();
return;

}

if(!isActive()){
return;
}

loadDrawings();
reconcileDrawingAlertsFromRegistry();
scheduleRedraw();
updateStyleBar();

};

const onPriceAlertsChanged =
e=>{

if(
!alive
){
return;
}

const symNorm =
String(
getSymbol() ||
""
).trim().toUpperCase();

const eventSym =
String(
e.detail?.symbol ||
""
).trim().toUpperCase();

if(
eventSym &&
eventSym !==
symNorm
){
return;
}

scheduleRedraw();

};

window.addEventListener(
"price-alerts-changed",
onPriceAlertsChanged
);

function defaultHrayAnchorTime(){

const list =
getCandles?.();

if(
Array.isArray(list) &&
list.length
){

const last =
list[list.length - 1];

if(last?.time != null){
return last.time;
}

}

return Math.floor(
Date.now() / 1000
);

}

function isLegacyAlertHray(
shape,
registryIds
){

if(
shape?.type !==
"hray"
){
return false;
}

const id =
String(
shape.id ||
""
);

if(
shape.isAlert ===
true
){
return true;
}

if(
id.startsWith(
"pa_"
)
){
return true;
}

return registryIds.has(
id
);

}

function reconcileDrawingAlertsFromRegistry(){

const symNorm =
String(
getSymbol() ||
""
).trim().toUpperCase();

const alertsForSym =
getActiveAlerts().filter(
a=>
String(
a.symbol
).toUpperCase() ===
symNorm
);

const registryIds =
new Set(
alertsForSym.map(
a=>
a.shapeId
)
);

const before =
drawings.length;

drawings =
drawings.filter(
shape=>!
isLegacyAlertHray(
shape,
registryIds
)
);

if(
drawings.length !==
before
){
saveDrawings();
scheduleRedraw();
updateStyleBar();
}

}

const onAlertsChanged = ()=>{

if(!alive){
return;
}

if(dragState){
return;
}

reconcileDrawingAlertsFromRegistry();
scheduleRedraw();
updateStyleBar();

};

const onAlertsRegistryPulled = ()=>{

if(!alive || !isActive()){
return;
}

reconcileDrawingAlertsFromRegistry();
scheduleRedraw();
updateStyleBar();

};

window.addEventListener(
"alerts-registry-pulled",
onAlertsRegistryPulled
);

const onDrawingsRemoteSync = symbols=>{

if(!alive){
return;
}

const sym =
getSymbol();

if(
!symbols?.length ||
symbols.includes(sym)
){
loadDrawings();
reconcileDrawingAlertsFromRegistry();
scheduleRedraw();
updateStyleBar();
}

};

onDrawingsRemoteUpdate(
onDrawingsRemoteSync
);

const onCloudAuthChange = ()=>{
void refreshDrawToolsAccessUiAsync();
};

async function refreshDrawToolsAccessUiAsync(){

try{
await ensureCloudLoginResolved(
8000
);
}catch{
/* ignore */
}

refreshDrawToolsAccessUi();

if(
canUseDrawings()
){
loadDrawings();
}else{
drawings = [];
selectedId = null;
cancelPlacement();
}

updateStyleBar();
scheduleRedraw();

}

const unsubscribeCloudAuthChange =
onCloudSyncChange(onCloudAuthChange);

window.addEventListener(
"draw-tools-access-changed",
onCloudAuthChange
);

window.addEventListener(
"drawings-updated",
onDrawingsUpdated
);

window.addEventListener(
"alerts-changed",
onAlertsChanged
);

window.addEventListener(
"pagehide",
()=>{

if(!alive){
return;
}

const sym =
lastLoadedSymbol ||
getSymbol();

persistDrawingsForSymbol(sym);
void flushDrawingsCloudPush();

}
);

loadToolDefaults();

try{
const legacyPrefs =
loadUserPrefs();

if(
legacyPrefs.fibLevels ||
legacyPrefs.levels ||
legacyPrefs.fibShowTrendLine != null
){

delete legacyPrefs.fibLevels;
delete legacyPrefs.levels;
delete legacyPrefs.fibShowTrendLine;

saveUserPrefs(legacyPrefs);

}

}catch{
/* ignore */
}

loadDrawings();
reconcileDrawingAlertsFromRegistry();
lastLoadedSymbol = getSymbol();
void refreshDrawToolsAccessUiAsync();
resizeCanvas();
updateStyleBar();
scheduleRedraw();

return {

setTool,
pickDrawTool,
refreshDrawToolsAccessUi,
refreshDrawToolsAccessUiAsync,
canUseDrawings,
clearAllDrawings:
clearAllDrawingsOnChart,

scheduleRedraw,

blocksTabletChartPan(){

if(
!alive ||
!isActive()
){
return false;
}

return !!dragState;

},

blocksTabletChartGestures(
clientX,
clientY
){

if(
!alive ||
!isActive() ||
!isTouchDrawTablet()
){
return false;
}

if(
dragState ||
touchPlaceTrack
){
return true;
}

if(
placement
){
return true;
}

if(
tool !==
"cursor"
){
return true;
}

if(
clientX ===
undefined ||
clientY ===
undefined
){
return false;
}

const rect =
wrapEl.getBoundingClientRect();

const x =
clientX - rect.left;

const y =
clientY - rect.top;

return !!hitTest(
x,
y
);

},

isPlacementActive(){

return !!placement;

},

isOverDrawingAt(
x,
y
){

if(
!alive
){
return false;
}

return !!hitTest(
x,
y
);

},

onSymbolChange(){

const next =
getSymbol();

/*
  При возврате на страницу initDrawings сначала грузит дефолтный символ (BTC),
  затем loadSymbol переключает на выбранную монету. Без сохранения в lastLoadedSymbol
  рисунки дефолтного символа перезаписывали ключ новой монеты.
*/
if(
lastLoadedSymbol &&
lastLoadedSymbol !== next
){
persistDrawingsForSymbol(lastLoadedSymbol);
scheduleDrawingsCloudPush();
}

lastLoadedSymbol = next;

loadDrawings();
reconcileDrawingAlertsFromRegistry();
selectedId = null;
cancelPlacement();

if(tool !== "cursor"){
const style =
baseDefaultStyle(tool);

updateColorStripe(style.color);
setActiveWidth(style.lineWidth);
}

updateStyleBar();
scheduleRedraw();

},

resize: resizeCanvas,

destroy(){

alive = false;
selectedId = null;
hideDomChartCrosshair(
wrapEl
);
syncChartTouchPan();
fibPanelCommitHook = null;

hideContextMenu?.();
contextMenuEl?.remove();

window.removeEventListener("keydown", onKeyDown);
tools.removeEventListener(
"pointerdown",
onToolsPointerDown,
true
);
tools.removeEventListener(
"click",
onToolsClick,
true
);
window.removeEventListener(
"drawings-updated",
onDrawingsUpdated
);

window.removeEventListener(
"alerts-changed",
onAlertsChanged
);

unsubscribeCloudAuthChange?.();

if(redrawRaf1){
cancelAnimationFrame(redrawRaf1);
redrawRaf1 = 0;
}

if(redrawRaf2){
cancelAnimationFrame(redrawRaf2);
redrawRaf2 = 0;
}

teardownChartPanRedraw?.();
stopChartPanRedraw();

chart.unsubscribeClick(clickHandler);
chart.unsubscribeCrosshairMove(crosshairHandler);
chart.timeScale().unsubscribeVisibleLogicalRangeChange(rangeHandler);

if(chartApplyPatchRestore){

chartApplyPatchRestore();

}

fibColorMenuPortal?.remove();
fibColorMenuPortal = null;
fibLineStyleMenuPortal?.remove();
fibLineStyleMenuPortal = null;
fibLineWidthMenuPortal?.remove();
fibLineWidthMenuPortal = null;

chromeLayoutObserver?.disconnect();
chromeLayoutObserver = null;

window.removeEventListener(
"resize",
syncDrawChromeLayout
);

window.removeEventListener(
"scroll",
syncDrawChromeLayout,
true
);

window.removeEventListener(
"price-alerts-changed",
onPriceAlertsChanged
);

chromePortal?.remove();
chromePortal = null;

canvas.remove();

}

};

}
