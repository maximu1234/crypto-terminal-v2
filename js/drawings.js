const DEFAULT_FIB_LEVELS = [
0,
0.236,
0.382,
0.5,
0.618,
0.786,
1
];

const STROKE = "#3b82f6";
const RULER_STROKE = "#22c55e";
const HANDLE_FILL = "#2563eb";
const HANDLE_STROKE = "#ffffff";
const WIDTH_OPTIONS = [1, 2, 3, 4];
const USER_PREFS_KEY = "draw_user_prefs";

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

function parseFibLevels(text){

const parts =
text
.split(/[,;\s]+/)
.map(s=>s.trim())
.filter(Boolean);

if(!parts.length){
return [...DEFAULT_FIB_LEVELS];
}

return parts.map(v=>{

const n = Number(v.replace("%", ""));

if(!Number.isFinite(n)){
return null;
}

return n > 1 ? n / 100 : n;

}).filter(n=>n != null && n >= 0 && n <= 1);

}

function levelsToText(levels){

return levels
.map(l=>{
const pct = l * 100;
return Number.isInteger(pct) ? String(pct) : pct.toFixed(1);
})
.join(", ");

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

const fibInput =
pickUi(uiRoot, "fib-levels-input", ".draw-fib-input");

const settingsPopover =
pickUi(uiRoot, "draw-settings-popover", ".draw-settings-popover");

const settingsBtn =
pickUi(uiRoot, "draw-settings-btn", ".draw-settings-btn");

const deleteOneBtn =
pickUi(uiRoot, "draw-delete-one", ".draw-delete-one-btn");

const dragHandle =
pickUi(uiRoot, "style-bar-drag", ".draw-style-drag");

let activeColor = STROKE;

let tool = "cursor";
let drawings = [];
let selectedId = null;
let placement = null;
let previewPoint = null;
let previewXY = null;
let ruler = null;
let shiftDown = false;
let dragState = null;
let blockChartClick = false;

let toolDefaults = {};
let clickHandler = null;
let crosshairHandler = null;
let rangeHandler = null;

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

function saveToolDefaults(name, data){

toolDefaults[name] = data;
localStorage.setItem(
defaultsStorageKey(name),
JSON.stringify(data)
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

if(partial.color){
activeColor = partial.color;
}

}

function baseDefaultStyle(type){

const global = loadUserPrefs();
const saved = toolDefaults[type];

return {
color: global.color || saved?.color || STROKE,
lineWidth: global.lineWidth ?? saved?.lineWidth ?? 1,
levels: global.levels?.length
? [...global.levels]
: saved?.levels?.length
? [...saved.levels]
: [...DEFAULT_FIB_LEVELS]
};

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
shape.levels = shape.levels?.length
? [...shape.levels]
: [...DEFAULT_FIB_LEVELS];
}

return shape;

}

function getShapeLevels(shape){

return shape.levels?.length
? shape.levels
: DEFAULT_FIB_LEVELS;

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

if(drawings.length){
saveDrawings();
}

return;

}

drawings = JSON.parse(raw).map(normalizeShape);

}catch{

drawings = [];

}

}

function saveDrawings(){
localStorage.setItem(storageKey(), JSON.stringify(drawings));
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

function readStyleFromUI(){

const widthActive =
widthPopover?.querySelector(".width-option.active");

return {
color: activeColor || STROKE,
lineWidth: Number(widthActive?.dataset.width || 1),
levels: parseFibLevels(fibInput?.value || "")
};

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

updateColorStripe(style.color);
setActiveWidth(style.lineWidth);

settingsBtn?.classList.toggle(
"hidden",
type !== "fib"
);

if(type === "fib"){
fibInput.value = levelsToText(style.levels);
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
return;
}

if(tool !== "cursor"){
fillStyleUI(baseDefaultStyle(tool), tool);
}

}

function applyStyleFromUI(){

const style = readStyleFromUI();
const type = getStyleTargetType();

if(!type){
return;
}

saveUserPrefs({
color: style.color,
lineWidth: style.lineWidth,
levels: style.levels
});

const sel = getSelected();

if(sel){
sel.color = style.color;
sel.lineWidth = style.lineWidth;
if(sel.type === "fib"){
sel.levels = style.levels;
}
saveDrawings();
redraw();
}

if(tool !== "cursor"){
saveToolDefaults(type, style);
}

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

redraw();

}

function shapeStyle(shape){

return {
color: shape.color || STROKE,
width: shape.lineWidth || 1
};

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

if(ruler){
drawRulerShape(ctx, ruler, w, h);
}

}catch(err){
console.warn("redraw", err);
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

const { color, width } =
shapeStyle(shape);

if(shape.type === "trendline"){

const a = toXY(shape.p1);
const b = toXY(shape.p2);

if(a && b){
drawLine(ctx, a.x, a.y, b.x, b.y, color, width);
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
width
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

const a = toXY(shape.p1);
const b = toXY(shape.p2);

if(!a || !b){
return;
}

const x1 = Math.min(a.x, b.x);
const x2 = Math.max(a.x, b.x);
const levels = getShapeLevels(shape);

levels.forEach(level=>{

const price =
shape.p1.price +
(shape.p2.price - shape.p1.price) * level;

const y = series.priceToCoordinate(price);

if(y == null){
return;
}

drawLine(ctx, x1, y, x2, y, color, width);

ctx.fillStyle = color;
ctx.font = "11px Arial";
ctx.fillText(
`${(level * 100).toFixed(1)}%`,
x2 + 4,
y + 4
);

});

drawLine(ctx, a.x, a.y, b.x, b.y, color, width);

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

function drawRulerShape(ctx, data, w, h, color = RULER_STROKE){

const p1 = data.p1 ? toXY(data.p1) : null;
const p2Raw = data.p2 || data.preview;
const p2 = p2Raw ? toXY(p2Raw) : null;

if(!p1 || !p2){
return;
}

drawLine(ctx, p1.x, p1.y, p2.x, p2.y, color, 2);

const pct =
((data.p2?.price ?? p2Raw.price) - data.p1.price) /
data.p1.price *
100;

const label =
`${pct >= 0 ? "+" : ""}${pct.toFixed(2)}%`;

const midX = (p1.x + p2.x) / 2;
const midY = (p1.y + p2.y) / 2;

ctx.fillStyle = color;
ctx.font = "bold 13px Arial";
ctx.strokeStyle = "#0b1220";
ctx.lineWidth = 3;
ctx.strokeText(label, midX + 8, midY - 8);
ctx.fillText(label, midX + 8, midY - 8);

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

const previewShape = {
type: placement.type,
color: style.color,
lineWidth: style.lineWidth,
levels: style.levels,
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

const a = toXY(d.p1);
const b = toXY(d.p2);

if(a && b){

getShapeLevels(d).forEach(level=>{

const price =
d.p1.price +
(d.p2.price - d.p1.price) * level;

const y = series.priceToCoordinate(price);

if(y != null){
dist = Math.min(dist, Math.abs(py - y));
}

});

dist = Math.min(
dist,
distToSegment(px, py, a.x, a.y, b.x, b.y)
);

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
levels: style.levels,
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

function clearRuler(){

ruler = null;
redraw();

}

function handleRulerClick(param){

const point = pointFromParam(param);

if(!point){
return;
}

if(!ruler || !ruler.p1){

ruler = { p1: point, p2: null, preview: null };

}else if(!ruler.p2){

ruler.p2 = point;
ruler.preview = null;

setTimeout(()=>{
if(ruler?.p2){
ruler = null;
redraw();
}
}, 8000);

}else{

ruler = { p1: point, p2: null, preview: null };

}

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
clearRuler();

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

drawings = drawings.filter(d=>d.id !== selectedId);
selectedId = null;
saveDrawings();
updateStyleBar();
redraw();

}

function clearAll(){

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

if(shiftDown){
handleRulerClick(param);
return;
}

handleToolClick(param);

};

crosshairHandler = param=>{

const channelPreview =
placement?.type === "channel" &&
placement.points.length > 0 &&
placement.points.length < 3;

const needsPreview =
placement ||
channelPreview ||
(ruler && ruler.p1 && !ruler.p2);

if(!needsPreview){
return;
}

previewPoint = pointFromParam(param);

previewXY = param.point
? { x: param.point.x, y: param.point.y }
: null;

if(ruler && ruler.p1 && !ruler.p2){
ruler.preview = previewPoint;
}

redraw();

};

rangeHandler = ()=> redraw();

chart.subscribeClick(clickHandler);
chart.subscribeCrosshairMove(crosshairHandler);
chart.timeScale().subscribeVisibleLogicalRangeChange(rangeHandler);

const onKeyDown = e=>{

if(!alive || !isActive()){
return;
}

if(e.key === "Shift"){
shiftDown = true;
}

if(e.key === "Escape"){
cancelPlacement();
clearRuler();
setTool("cursor");
}

if(e.key === "Delete" || e.key === "Backspace"){

if(document.activeElement?.tagName !== "INPUT"){
e.preventDefault();
deleteSelected();
}

}

};

const onKeyUp = e=>{

if(!alive || !isActive()){
return;
}

if(e.key === "Shift"){
shiftDown = false;
}

};

window.addEventListener("keydown", onKeyDown);
window.addEventListener("keyup", onKeyUp);

tools.querySelectorAll("[data-draw-tool]").forEach(btn=>{
btn.addEventListener("click", ()=>{

if(
tool === btn.dataset.drawTool &&
tool !== "cursor"
){
setTool("cursor");
return;
}

setTool(btn.dataset.drawTool);

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

if(confirm("Удалить все рисунки на этом графике?")){
clearAll();
}

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

fibInput?.addEventListener("change", ()=>{
applyStyleFromUI();
});

fibInput?.addEventListener("keydown", e=>{

if(e.key === "Enter"){
applyStyleFromUI();
settingsPopover?.classList.add("hidden");
}

});

deleteOneBtn?.addEventListener("click", ()=>{
deleteSelected();
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

loadToolDefaults();

const prefs = loadUserPrefs();

if(prefs.color){
updateColorStripe(prefs.color);
}

if(prefs.lineWidth){
setActiveWidth(prefs.lineWidth);
}

loadDrawings();
resizeCanvas();
updateStyleBar();

return {

setTool,

onSymbolChange(){

saveDrawings();
loadDrawings();
selectedId = null;
cancelPlacement();
clearRuler();
updateStyleBar();
redraw();

},

resize: resizeCanvas,

destroy(){

alive = false;

window.removeEventListener("keydown", onKeyDown);
window.removeEventListener("keyup", onKeyUp);

chart.unsubscribeClick(clickHandler);
chart.unsubscribeCrosshairMove(crosshairHandler);
chart.timeScale().unsubscribeVisibleLogicalRangeChange(rangeHandler);
canvas.remove();

}

};

}
