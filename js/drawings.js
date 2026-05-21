import {
ALERT_LINE_COLOR,
ALERT_LINE_DASH,
patchAlertPrice,
removeAlert,
upsertAlert
} from "./alerts.js";

import {
ALARM_ICON_SVG,
TRASH_ICON_SVG
} from "./draw-ui-shared.js";

const DEFAULT_FIB_SPEC = Object.freeze([
{ v:0, enabled:true },
{ v:0.382, enabled:true },
{ v:0.618, enabled:true },
{ v:1, enabled:true },
{ v:-1, enabled:true },
{ v:-2, enabled:true },
{ v:-2.618, enabled:true },
{ v:2.414, enabled:false },
{ v:-3, enabled:false },
{ v:0.25, enabled:true },
{ v:0.5, enabled:true },
{ v:0.75, enabled:true },
{ v:-0.25, enabled:true },
{ v:-0.5, enabled:true },
{ v:-1.5, enabled:true },
{ v:-1.44, enabled:true },
{ v:-1.44, enabled:false },
{ v:-2.618, enabled:false }
]);

const STROKE = "#3b82f6";
const HANDLE_FILL = "#2563eb";
const HANDLE_STROKE = "#ffffff";
const WIDTH_OPTIONS = [1, 2, 3, 4];
const USER_PREFS_KEY = "draw_user_prefs";
const GLOBAL_STYLE_KEY = "draw_style_global_v1";

function buildColorPalette(){

const palette = [];

for(let i = 0; i < 12; i++){

const v =
Math.round(255 - (i / 11) * 255);

const h =
v.toString(16).padStart(2, "0");

palette.push(`#${h}${h}${h}`);

}

const bases = [
"#ef5350","#f57c00","#fdd835","#66bb6a",
"#26a69a","#29b6f6","#42a5f5","#5c6bc0",
"#ab47bc","#ec407a","#8d6e63","#78909c"
];

palette.push(...bases);

for(let row = 0; row < 6; row++){

bases.forEach(hex=>{

const mix = 0.72 - row * 0.11;

palette.push(mixHex(hex, mix));

});

}

return palette;

}

function mixHex(hex, amount){

const n = parseInt(hex.slice(1), 16);
let r = (n >> 16) & 255;
let g = (n >> 8) & 255;
let b = n & 255;

r = Math.round(r * amount + 255 * (1 - amount));
g = Math.round(g * amount + 255 * (1 - amount));
b = Math.round(b * amount + 255 * (1 - amount));

return `#${[r, g, b].map(v=>v.toString(16).padStart(2, "0")).join("")}`;

}

const COLOR_PALETTE = buildColorPalette();

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

function cloneDefaultFibRows(){

return DEFAULT_FIB_SPEC.map(x=>({
v:x.v,
enabled:!!x.enabled
}));

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

});

return next;

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

return normalizeFibLevelsShape(raw);

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
barPosKey = "draw_bar_pos"

}){

const tools =
toolsRoot || document;

let alive = true;

wrapEl.style.position = "relative";

const canvas =
document.createElement("canvas");

canvas.className = "drawings-layer";
wrapEl.appendChild(canvas);

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

const alertToggleBtn =
pickUi(uiRoot, "draw-alert-toggle", ".draw-alert-toggle");

const dragHandle =
pickUi(uiRoot, "style-bar-drag", ".draw-style-drag");

let contextMenuEl = null;

let activeColor = STROKE;

let tool = "cursor";
let drawings = [];
let lastLoadedSymbol = null;
let selectedId = null;
let placement = null;
let previewPoint = null;
let previewXY = null;
let dragState = null;
let blockChartClick = false;

let toolDefaults = {};
let clickHandler = null;
let crosshairHandler = null;
let rangeHandler = null;

let fibPanelBuilt = false;
let fibApplyTimer = null;

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

if(type === "fib"){

const legacy =
loadUserPrefs();

out.fibLevels =
normalizeFibLevelsShape(
saved.fibLevels ||
saved.levels ||
legacy.fibLevels ||
legacy.levels ||
null
);

out.fibShowTrendLine =
saved.fibShowTrendLine ??
legacy.fibShowTrendLine ??
true;

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
normalizeFibLevelsShape(
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

return shape;

}

const LEGACY_TF_KEYS = ["1", "5", "15", "60", "240", "D"];

function storageKey(){
return `drawings_${getSymbol()}`;
}

function loadDrawings(){

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

drawings = merged.map(normalizeShape);

sanitizeDrawingsForCurrentSymbol();

if(drawings.length){
localStorage.setItem(
storageKey(),
JSON.stringify(drawings)
);
}

return;

}

drawings = JSON.parse(raw).map(normalizeShape);

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
localStorage.setItem(storageKey(), JSON.stringify(drawings));
}

function persistDrawingsForSymbol(sym){

if(!sym){
return;
}

try{

localStorage.setItem(
`drawings_${sym}`,
JSON.stringify(drawings)
);

}catch{}

}

function getSelected(){

return drawings.find(d=>d.id === selectedId) || null;

}

function isFibContext(){

const sel = getSelected();
if(sel?.type === "fib"){
return true;
}
return tool === "fib";
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
<input type="checkbox" id="fib-show-trend-line" checked />
<span>Линия тренда</span>
</label>
<div class="fib-levels-head">Уровни (один цвет — с панели карандаша)</div>
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
`;

const on =
row.querySelector(".fib-level-on");
const val =
row.querySelector(".fib-level-val");

if(on){
on.checked = !!spec.enabled;
}

if(val){
val.value =
formatFibInputValue(spec.v);
}

root.appendChild(row);

});

settingsPopover.addEventListener("change", e=>{

if(
!alive ||
!isFibContext()
){
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

if(
!alive ||
!isFibContext()
){
return;
}

if(
e.target?.classList.contains("fib-level-val")
){
scheduleFibApplyDebounced();
}

});

}

function scheduleFibApplyImmediate(){

if(fibApplyTimer){
clearTimeout(fibApplyTimer);
fibApplyTimer = null;
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

});

return {
fibLevels:template,
fibShowTrendLine
};

}

function fillFibSettingsPanel(
fibLevels,
fibShowTrendLine
){

ensureFibSettingsPanel();

const rows =
normalizeFibLevelsShape(
fibLevels
);

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

if(on){
on.checked = !!row.enabled;
}

if(val){
val.value =
formatFibInputValue(row.v);
}

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

colorPopover?.querySelectorAll(".color-swatch").forEach(btn=>{
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

if(type === "fib"){
fillFibSettingsPanel(
style.fibLevels,
style.fibShowTrendLine
);
}else{
settingsPopover?.classList.add("hidden");
}

}

function updateStyleBar(){

if(!styleBar){
return;
}

const show =
tool !== "cursor" || !!selectedId;

styleBar.classList.toggle("hidden", !show);

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
updateAlertStyleUI(sel);
return;
}

if(tool !== "cursor"){
fillStyleUI(baseDefaultStyle(tool), tool);
}

updateAlertStyleUI(null);

}

function applyStyleFromUI(){

const style = readStyleFromUI();
const type = getStyleTargetType();

if(!type){
return;
}

const sel =
getSelected();

if(sel){

if(
sel.type === "hray" &&
sel.isAlert
){
sel.lineWidth = style.lineWidth;
}else{
sel.color = style.color;
sel.lineWidth = style.lineWidth;
}

if(sel.type === "fib"){
sel.fibLevels = style.fibLevels;
sel.fibShowTrendLine =
style.fibShowTrendLine !== false;

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

defaultsPayload.fibLevels =
style.fibLevels;

defaultsPayload.fibShowTrendLine =
style.fibShowTrendLine !== false;

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

colorPopover?.classList.add("hidden");
widthPopover?.classList.add("hidden");
settingsPopover?.classList.add("hidden");

}

function positionPopover(popover, offsetY = 40){

if(!popover || !styleBar){
return;
}

popover.style.left = `${styleBar.offsetLeft}px`;
popover.style.top = `${styleBar.offsetTop + offsetY}px`;

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

function chartSize(){
return {
w: wrapEl.clientWidth,
h: wrapEl.clientHeight
};
}

function resizeCanvas(){

const dpr = window.devicePixelRatio || 1;
const { w, h } = chartSize();

canvas.width = Math.max(1, Math.floor(w * dpr));
canvas.height = Math.max(1, Math.floor(h * dpr));
canvas.style.width = `${w}px`;
canvas.style.height = `${h}px`;

scheduleRedraw();

}

function shapeStyle(shape){

if(shape.isAlert){
return {
color: ALERT_LINE_COLOR,
width: 1,
dash: ALERT_LINE_DASH
};
}

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

}else{

shape.savedColor = shape.color;

if(shape.savedLineWidth == null){
shape.savedLineWidth = shape.lineWidth || 1;
}

shape.isAlert = true;
shape.lineWidth = 1;
shape.alertCreatedAt = Date.now();
shape.alertTf = getTf();
shape.alertSymbol = getSymbol();

saveDrawings();

const sym =
getSymbol();

const level =
Number(shape.price);

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

upsertAlert({
id: shape.id,
shapeId: shape.id,
symbol: sym,
price: level,
tf: shape.alertTf,
createdAt: shape.alertCreatedAt
});

}

}
updateStyleBar();
redraw();

}

function updateAlertStyleUI(sel){

const isHray =
sel?.type === "hray";

const isAlert =
!!sel?.isAlert;

alertToggleBtn?.classList.toggle(
"hidden",
!isHray
);

alertToggleBtn?.classList.toggle(
"active",
isAlert
);

if(alertToggleBtn){
alertToggleBtn.title = isAlert
? "Снять алерт"
: "Сделать алертом";

alertToggleBtn.setAttribute(
"aria-label",
alertToggleBtn.title
);

alertToggleBtn.innerHTML = isAlert
? TRASH_ICON_SVG
: ALARM_ICON_SVG;
}

colorBtn?.classList.toggle(
"hidden",
isAlert
);

widthBtn?.classList.toggle(
"hidden",
isAlert
);

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

return [];

}

function hitTestHandle(px, py, shape){

const threshold = 10;

for(const handle of listHandles(shape)){

const xy = toXY(handle.point);

if(!xy){
continue;
}

if(Math.hypot(px - xy.x, py - xy.y) <= threshold){
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

shape.p3 = {
time: point.time - (shape.p2.time - shape.p1.time),
price: point.price - (shape.p2.price - shape.p1.price)
};

}

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

function setupEditInteraction(){

wrapEl.addEventListener("mousedown", e=>{

if(tool !== "cursor" || placement){
return;
}

const { x, y } = pointerFromEvent(e);
const sel = getSelected();

if(!sel){
return;
}

const handleId =
hitTestHandle(x, y, sel);

if(!handleId){
return;
}

dragState = {
shapeId: sel.id,
handleId
};

blockChartClick = true;
e.preventDefault();
e.stopPropagation();

canvas.style.pointerEvents = "auto";

}, true);

const onEditMove = e=>{

if(!alive || !dragState){
return;
}

const { x, y } = pointerFromEvent(e);
const point = pointFromXY(x, y);

if(!point){
return;
}

const shape =
drawings.find(d=>d.id === dragState.shapeId);

if(!shape){
return;
}

moveHandle(shape, dragState.handleId, point);

if(
shape.type === "hray" &&
shape.isAlert
){
patchAlertPrice(
getSymbol(),
shape.id,
Number(shape.price)
);
}

saveDrawings();
redraw();

};

const onEditUp = ()=>{

if(!alive || !dragState){
return;
}

dragState = null;
canvas.style.pointerEvents = "none";
blockChartClick = true;

};

window.addEventListener("mousemove", onEditMove);
window.addEventListener("mouseup", onEditUp);

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

if(
styleBar &&
styleBar.contains(e.target)
){
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

ctx.setTransform(1, 0, 0, 1, 0, 0);
ctx.clearRect(0, 0, canvas.width, canvas.height);
ctx.scale(dpr, dpr);

drawings.forEach(d=>{

try{
drawShape(ctx, d, w, h);

if(d.id === selectedId){
drawSelectionHandles(ctx, d);
}

}catch(err){
console.warn("draw shape", err);
}

});

if(placement){
drawPlacementPreview(ctx, w, h);
}

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

drawLine(
ctx,
x1,
y,
x2,
y,
color,
width
);

ctx.fillStyle = color;
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
width
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

if(!previewPoint){
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

const a = toXY(d.p1);
const b = toXY(d.p2);

if(a && b){
dist = distToSegment(px, py, a.x, a.y, b.x, b.y);
}

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

const a =
toXY(d.p1);
const b =
toXY(d.p2);

if(a && b){

const useLog =
isSeriesLogarithmic(series);

getFibRows(d).forEach(row=>{

if(!row.enabled){
return;
}

const price =
fibPriceAtRatio(
d.p1.price,
d.p2.price,
row.v,
useLog
);

if(!Number.isFinite(price)){
return;
}

const y =
series.priceToCoordinate(price);

if(y != null){
dist = Math.min(
dist,
Math.abs(py - y)
);

}

});

if(d.fibShowTrendLine !== false){

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

}

}
if(d.type === "channel"){

const a = toXY(d.p1);
const b = toXY(d.p2);
const c = toXY(d.p3);
const p4 = toXY(channelP4(d.p1, d.p2, d.p3));
const { midStart, midEnd } =
channelMidPoints(d.p1, d.p2, d.p3);
const m1 = toXY(midStart);
const m2 = toXY(midEnd);

if(a && b && c && p4){

dist = Math.min(
dist,
distToSegment(px, py, a.x, a.y, b.x, b.y),
distToSegment(px, py, c.x, c.y, p4.x, p4.y)
);

if(m1 && m2){
dist = Math.min(
dist,
distToSegment(px, py, m1.x, m1.y, m2.x, m2.y)
);
}

}

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
type,
color: style.color,
lineWidth: style.lineWidth,
fibLevels:type === "fib"
? normalizeFibLevelsShape(style.fibLevels)
:undefined,
fibShowTrendLine:type === "fib"
? style.fibShowTrendLine !== false
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

if(created){
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

}

function cancelPlacement(){

placement = null;
previewPoint = null;
previewXY = null;
redraw();

}

function handleToolClick(param){

const point = pointFromParam(param);

if(!point){
return;
}

if(tool === "cursor"){

selectedId = hitTest(param.point.x, param.point.y);
updateStyleBar();
redraw();
return;

}

if(!placement){
startPlacement(tool);
}

placement.points.push(point);

const needed =
tool === "channel" ? 3 : tool === "hray" ? 1 : 2;

if(placement.points.length >= needed){
finishPlacement();
}

}

function setTool(next){

tool = next;
cancelPlacement();

tools.querySelectorAll("[data-draw-tool]").forEach(btn=>{
btn.classList.toggle(
"active",
btn.dataset.drawTool === tool
);
});

updateStyleBar();

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

drawings = drawings.filter(d=>d.id !== selectedId);
selectedId = null;
saveDrawings();
updateStyleBar();
redraw();

}

function clearAll(){

drawings
.filter(d=>d.isAlert)
.forEach(d=>{
removeAlert(
getSymbol(),
d.id
);
});

drawings = [];
selectedId = null;
saveDrawings();
updateStyleBar();
redraw();

}

clickHandler = param=>{

if(blockChartClick){
blockChartClick = false;
return;
}

handleToolClick(param);

};

crosshairHandler = param=>{

previewPoint = pointFromParam(param);

previewXY = param.point
? { x: param.point.x, y: param.point.y }
: null;

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

tools.querySelectorAll("[data-draw-tool]").forEach(btn=>{
btn.addEventListener("click", ()=>{

const next = btn.dataset.drawTool;

if(next === "cursor"){
setTool("cursor");
return;
}

if(tool === next){
setTool("cursor");
return;
}

setTool(next);

});
});

const clearAllBtn =
tools.querySelector(".draw-tool-clear-all") ||
document.getElementById("draw-tool-delete");

clearAllBtn?.addEventListener("click", e=>{

e.stopPropagation();

if(!drawings.length){
return;
}

clearAll();

});

function initStylePopovers(){

if(colorPopover){

const grid =
document.createElement("div");

grid.className = "color-grid";

COLOR_PALETTE.forEach(hex=>{

const btn =
document.createElement("button");

btn.type = "button";
btn.className = "color-swatch";
btn.dataset.color = hex;
btn.style.background = hex;
btn.title = hex;

btn.addEventListener("click", e=>{

e.stopPropagation();
updateColorStripe(hex);
applyStyleFromUI();
colorPopover.classList.add("hidden");

});

grid.appendChild(btn);

});

colorPopover.innerHTML = "";
colorPopover.appendChild(grid);

}

colorBtn?.addEventListener("click", e=>{

e.stopPropagation();

const open =
colorPopover?.classList.contains("hidden");

closePopovers();

if(open){
positionPopover(colorPopover, 40);
colorPopover?.classList.remove("hidden");
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
applyStyleFromUI();
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
positionPopover(settingsPopover, 40);
settingsPopover?.classList.remove("hidden");
}

});

deleteOneBtn?.addEventListener("click", ()=>{
deleteSelected();
});

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

styleBar.style.left = `${pos.x}px`;
styleBar.style.top = `${pos.y}px`;

if(settingsPopover){
settingsPopover.style.left = `${pos.x}px`;
settingsPopover.style.top = `${pos.y + 44}px`;
}

let dragging = false;
let dragStart = { x: 0, y: 0 };
let barStart = { x: 0, y: 0 };

dragHandle?.addEventListener("mousedown", e=>{

e.preventDefault();
e.stopPropagation();

dragging = true;
dragStart = { x: e.clientX, y: e.clientY };
barStart = {
x: styleBar.offsetLeft,
y: styleBar.offsetTop
};

});

const onBarMove = e=>{

if(!alive || !dragging){
return;
}

const dx = e.clientX - dragStart.x;
const dy = e.clientY - dragStart.y;

const { w, h } = chartSize();

let nx = Math.max(0, Math.min(w - styleBar.offsetWidth, barStart.x + dx));
let ny = Math.max(0, Math.min(h - styleBar.offsetHeight, barStart.y + dy));

styleBar.style.left = `${nx}px`;
styleBar.style.top = `${ny}px`;

syncPopoversPosition();

};

const onBarUp = ()=>{

if(!alive || !dragging){
return;
}

dragging = false;

const saved = {
x: styleBar.offsetLeft,
y: styleBar.offsetTop
};

localStorage.setItem(key, JSON.stringify(saved));

};

const onDocClick = e=>{

if(!alive || !isActive()){
return;
}

if(
styleBar?.contains(e.target) ||
colorPopover?.contains(e.target) ||
widthPopover?.contains(e.target) ||
settingsPopover?.contains(e.target)
){
return;
}

closePopovers();

};

window.addEventListener("mousemove", onBarMove);
window.addEventListener("mouseup", onBarUp);
document.addEventListener("click", onDocClick);

}

function syncPopoversPosition(){

positionPopover(colorPopover, 40);
positionPopover(widthPopover, 40);
positionPopover(settingsPopover, 40);

}

initFloatingBar();
initStylePopovers();
setupEditInteraction();

const teardownChartPanRedraw =
setupChartPanRedraw();

const hideContextMenu =
setupContextMenu();

const onDrawingsUpdated = e=>{

if(!alive || !isActive()){
return;
}

if(e.detail?.symbol === getSymbol()){
loadDrawings();
scheduleRedraw();
updateStyleBar();
}

};

const onAlertsChanged = ()=>{

if(!alive){
return;
}

loadDrawings();
scheduleRedraw();
updateStyleBar();

};

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

}
);

loadToolDefaults();

loadDrawings();
lastLoadedSymbol = getSymbol();
resizeCanvas();
updateStyleBar();
scheduleRedraw();

return {

setTool,

scheduleRedraw,

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
}

lastLoadedSymbol = next;

loadDrawings();
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

hideContextMenu?.();
contextMenuEl?.remove();

window.removeEventListener("keydown", onKeyDown);
window.removeEventListener(
"drawings-updated",
onDrawingsUpdated
);

window.removeEventListener(
"alerts-changed",
onAlertsChanged
);

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

canvas.remove();

}

};

}
