import {
ALERT_LINE_COLOR,
ALERT_LINE_DASH,
alertPriceFromShape,
alertPriceForDisplay,
getActiveAlerts,
finalizeAlertPriceDrag,
setAlertDragLivePrice,
clearAlertDragLivePrice,
removeAlert,
upsertAlert
} from "../alerts.js?v=97";

import {
setAlertDragPaused,
resetAlertWatchBaseline
} from "../alert-monitor.js?v=64";

import {
mountTvColorPicker,
parseDrawColor,
formatDrawColor
} from "../draw-color-palette.js?v=6";

import {
ALARM_ICON_SVG,
TRASH_ICON_SVG,
DRAW_TOOLS_GUEST_MSG
} from "../draw-ui-shared.js?v=21";

import {
closeAllWidgetDrawToolsMenus
} from "../dashboard-draw-ui.js?v=14";

import {
calcPositionSizing,
formatMoneyUsd,
formatVolumeUsd,
parseMoneyInput
} from "../position-sizing.js?v=1";

import {
bumpDrawingsLocalRevision,
isCloudLoggedIn,
isCloudLoggedInEffective,
isCloudSyncEnabled,
ensureCloudLoginResolved,
onCloudSyncChange
} from "../cloud-sync.js?v=34";

import {
ensureDrawToolsVisible
} from "../draw-tools-visible.js?v=1";

import {
deleteDrawingFromCloud,
flushDrawingsCloudPush,
registerDrawingsChartRefresh,
scheduleDrawingsCloudPush
} from "../drawings-cloud-sync.js?v=42";

import {
touchShapeRevision,
recordDrawingTombstone
} from "../drawings-storage.js?v=7";

import {
registerDrawingsStoragePoller,
touchDrawingsStorageSnap
} from "../drawings-storage-poller.js?v=1";

import {
layoutScaleLabelYs,
CHART_PRICE_HUD_FALLBACK_HEIGHT
} from "./scale-label-layout.js?v=2";

import {
formatPrice,
chartScaleFont,
CHART_SCALE_LABEL_PAD_LEFT,
CHART_SCALE_LABEL_LINE_HEIGHT,
scaleLabelTextColorForBackground,
isCoarseTouchViewport,
isTabletChartViewport,
hasAnyFinePointer,
TABLET_USE_CUSTOM_TOUCH_PAN,
ensureDomChartCrosshair,
hideDomChartCrosshair,
positionTabletProbeHorizInStack,
fullCrosshairOptions
} from "../chart-import.js?v=27";

import {
DEFAULT_FIB_SPEC,
STROKE,
HANDLE_FILL,
HANDLE_STROKE,
WIDTH_OPTIONS,
USER_PREFS_KEY,
GLOBAL_STYLE_KEY,
FIB_TOOL_DEFAULTS_VERSION,
POSITION_ENTRY_COLOR,
POSITION_TP_FILL,
POSITION_SL_FILL,
POSITION_DEFAULT_TP_PCT,
POSITION_DEFAULT_SL_PCT,
POSITION_DEFAULT_ZONE_HEIGHT_MULT,
POSITION_DEFAULT_TP_ZONE_PX,
POSITION_DEFAULT_SL_ZONE_PX,
POSITION_DEFAULT_WIDTH_BARS,
POSITION_RR_LABEL_SAMPLE,
RECT_DEFAULT_FILL_COLOR,
RECT_DEFAULT_FILL_OPACITY
} from "./constants.js?v=6";

import {
getRectangleHandleScreens,
moveRectangleHandle,
normalizeRectangleShape
} from "./arrow-rect.js?v=2";

import {
uid,
distToSegment,
distToRect
} from "./math.js?v=1";

import {
normalizeFibLineStyle,
normalizeFibLevelColor,
normalizeFibLevelWidth,
cloneDefaultFibRows,
buildDefaultFibToolStorage,
migrateFibToolDefaults,
finalizeFibLevels,
ensureFibLevelsVisible,
normalizeFibLevelsShape,
formatFibInputValue,
parseFibRatioField,
getFibRows,
isSeriesLogarithmic,
setFibLineStyleButton,
setFibLevelWidthButton
} from "./fib-spec.js?v=9";

import {
setFibPanelCommitHook,
runFibPanelCommitHook,
ensureFibLineStyleMenuPortal,
closeAllFibLineStyleMenus,
openFibLineStyleMenu,
ensureFibLineWidthMenuPortal,
closeAllFibLineWidthMenus,
openFibLineWidthMenu,
isFibLineStyleMenuOpenForAnchor,
isFibLineWidthMenuOpenForAnchor,
fibPortalHitTest,
retainFibPortals,
releaseFibPortals
} from "./fib-portals.js?v=3";

import {
isPositionType,
positionEntryPrice
} from "./position.js?v=1";

import {
pickUi
} from "./utils.js?v=1";

import {
createDrawHitTester
} from "./draw-hit.js?v=6";

import {
createDrawRenderer
} from "./draw-render.js?v=6";

import {
snapPlotToCandleWick
} from "./draw-magnet.js?v=1";

import {
computeChartRulerMetrics,
drawChartRuler,
ensureChartRulerLabelEl,
hideChartRulerLabelEl,
isChartRulerGoingDown,
updateChartRulerLabelEl
} from "./chart-ruler.js?v=8";

import {
mountTabletDrawInput
} from "../drawings-tablet-input.js?v=3";

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

retainFibPortals();

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
/** Десктоп: сырой pointer внутри wrap (LW режет crosshair до последней свечи). */
let placementPointerXY = null;
/** Cmd/Meta зажат — перекрестье к хаю/лою свечи под вертикалью. */
let drawMagnetKeyDown = false;
/** Последняя позиция crosshair в plot (fallback для Cmd без pointermove). */
let lastCrosshairPlotXY = null;
/** Shift-линейка: начало { time, price } и текущий конец в plot px. */
let chartRulerStart = null;
let chartRulerEndPlot = null;
let chartRulerShiftDown = false;
let chartRulerLabelEl =
ensureChartRulerLabelEl(
wrapEl
);
let previewPoint = null;
let previewXY = null;
let tabletDrawInput = null;
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
let fibPanelSyncing = false;
let fibApplyTimer = null;
let fibSettingsShapeId = null;
let fibColorMenuPortal = null;
let fibColorMenuAnchor = null;
let fibSettingsSyncDeferred = false;
let rectPanelBuilt = false;
let rectPanelSyncing = false;
let rectSettingsShapeId = null;

function shouldDeferExternalDrawingsSync(){

return (
isFibSettingsOpen() ||
isRectSettingsOpen() ||
isPositionRiskInputFocused()
);

}

function flushDeferredFibSettingsSync(){

if(
!fibSettingsSyncDeferred
){
return;
}

fibSettingsSyncDeferred = false;

applyRemoteDrawingsToChart(
[
getSymbol()
]
);

}

let chartApplyPatchRestore = null;

let redrawRaf1 = 0;
let redrawRaf2 = 0;
/** Один rAF на кадр при рисовании (не scheduleRedraw с двойным rAF). */
let placementPreviewRaf = 0;
/** Линейка — один redraw на кадр без двойного rAF. */
let chartRulerRedrawRaf = 0;
/** Перетаскивание объектов / алертов — один redraw на кадр. */
let dragRedrawRaf = 0;
let placementPreviewPending = null;
let placementCrosshairVert = null;
let placementCrosshairHorz = null;
let cachedLastCandleRightX = NaN;
let coordRetryCount = 0;
let chartPanRedrawRaf = 0;
let chartPanActive = false;
let chartPanWheelTimer = null;
let priceScaleDragActive = false;
let priceScalePaintRaf = 0;
let manualPriceScaleDrag = null;
let seriesPriceToCoordinateOrig = null;
let priceScaleSyncPending = false;
let priceScaleApplyPatchRestore = null;

function defaultsStorageKey(name){

return `draw_defaults_${name}`;

}

function loadToolDefaults(){

["trendline", "hray", "fib", "channel", "arrow", "rectangle", "long", "short"].forEach(name=>{

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
JSON.stringify(
ensureFibLevelsVisible(
fibStore.fibLevels
)
)
);

out.fibShowTrendLine =
typeof fibStore.fibShowTrendLine ===
"boolean"
? fibStore.fibShowTrendLine
: false;

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

if(
type ===
"rectangle"
){

const rectSaved =
toolDefaults.rectangle ||
saved;

normalizeRectangleShape(
out,
{
showFill:
rectSaved?.showFill !==
false,
fillColor:
rectSaved?.fillColor ||
RECT_DEFAULT_FILL_COLOR,
fillOpacity:
rectSaved?.fillOpacity ??
RECT_DEFAULT_FILL_OPACITY,
medianColor:
rectSaved?.medianColor ||
out.color,
medianLineWidth:
rectSaved?.medianLineWidth ||
1,
medianLineStyle:
rectSaved?.medianLineStyle ||
"dashed",
lineStyle:
rectSaved?.lineStyle ||
"solid",
showMedian:
!!rectSaved?.showMedian
}
);

if(
rectSaved?.color
){
out.color = rectSaved.color;
}

if(
rectSaved?.lineWidth != null
){
out.lineWidth = rectSaved.lineWidth;
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

const ts =
chart.timeScale();
const candles =
candleSeries();

if(
candles.length >=
2
){

const first =
candles[
0
];
const second =
candles[
1
];
const prev =
candles[
candles.length - 2
];
const last =
candles[
candles.length - 1
];

const head =
segmentX(
ts,
first.time,
second.time
);

if(
head &&
head.dt >
0 &&
x <
Math.min(
head.x0,
head.x1
) -
0.5
){

const ratio =
(x - head.x0) /
(head.x1 - head.x0);

return (
first.time +
ratio *
head.dt
);

}

const tail =
segmentX(
ts,
prev.time,
last.time
);

if(
tail &&
tail.dt >
0 &&
x >
Math.max(
tail.x0,
tail.x1
) +
0.5
){

const ratio =
(x - tail.x1) /
(tail.x1 - tail.x0);

return (
last.time +
ratio *
tail.dt
);

}

}

let time =
normalizeTime(
ts.coordinateToTime(
x
)
);

if(
time !=
null
){

return time;

}

if(
candles.length <
2
){
return null;
}

for(
let i =
0;
i <
candles.length - 1;
i++
){

const seg =
segmentX(
ts,
candles[
i
].time,
candles[
i + 1
].time
);

if(
!seg ||
seg.dt <=
0
){
continue;
}

const minX =
Math.min(
seg.x0,
seg.x1
);
const maxX =
Math.max(
seg.x0,
seg.x1
);

if(
x >=
minX &&
x <=
maxX
){
const ratio =
(x - seg.x0) /
(seg.x1 - seg.x0);
return (
candles[
i
].time +
ratio *
seg.dt
);
}

}

return null;

}

function normalizeShape(shape){

shape.color = shape.color || STROKE;
shape.lineWidth = shape.lineWidth || 1;

if(shape.type === "fib"){

shape.fibLevels =
ensureFibLevelsVisible(
finalizeFibLevels(
shape.fibLevels ??
shape.levels
)
);

shape.fibShowTrendLine =
typeof shape.fibShowTrendLine ===
"boolean"
? shape.fibShowTrendLine
:
typeof shape.showFibTrend ===
"boolean"
? !!shape.showFibTrend
:false;

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

if(
shape.type ===
"rectangle"
){

normalizeRectangleShape(
shape,
{
showFill: true,
fillColor: RECT_DEFAULT_FILL_COLOR,
fillOpacity: RECT_DEFAULT_FILL_OPACITY,
medianColor: shape.color || STROKE,
medianLineWidth: 1,
medianLineStyle: "dashed"
}
);

}

return shape;

}

const LEGACY_TF_KEYS = ["1", "5", "15", "60", "240", "D"];

function storageKey(){
return `drawings_${getSymbol()}`;
}

function normalizeDrawingShape(shape){

try{
return stripAlertFromShape(
normalizeShape(shape)
);
}catch(err){
console.warn(
"normalize drawing shape",
err,
shape?.type,
shape?.id
);
return shape;
}

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

drawings = merged.map(shape=>normalizeDrawingShape(shape));

sanitizeDrawingsForCurrentSymbol();

if(drawings.length){
localStorage.setItem(
storageKey(),
JSON.stringify(drawings)
);
}

return;

}

drawings = JSON.parse(raw).map(shape=>normalizeDrawingShape(shape));

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

touchStorageSnap();

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
symbol: getSymbol(),
local: true
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

const sel =
getSelected();

if(
sel?.type ===
"fib"
){
return true;
}

return tool ===
"fib";

}

function isRectContext(){

const sel =
getSelected();

if(
sel?.type ===
"rectangle"
){
return true;
}

return tool ===
"rectangle";

}

function isFibSettingsOpen(){

return !!(
settingsPopover &&
!settingsPopover.classList.contains("hidden") &&
fibPanelBuilt &&
settingsPopover.querySelector(
".fib-settings"
)
);

}

function isRectSettingsOpen(){

return !!(
settingsPopover &&
!settingsPopover.classList.contains("hidden") &&
rectPanelBuilt &&
settingsPopover.querySelector(
".rect-settings"
)
);

}

function getRectEditShape(){

if(
rectSettingsShapeId
){

const pinned =
drawings.find(
d=>
d.id === rectSettingsShapeId &&
d.type ===
"rectangle"
);

if(
pinned
){
return pinned;
}

}

const sel =
getSelected();

return sel?.type ===
"rectangle"
? sel
: null;

}

function ensureRectSettingsPanel(){

if(
!settingsPopover ||
rectPanelBuilt
){
return;
}

rectPanelBuilt = true;

settingsPopover.innerHTML =
`
<div class="rect-settings">
<label class="rect-settings-row">
<span class="rect-settings-label">Border</span>
<button type="button" class="rect-border-style-btn" title="Тип линии" aria-label="Тип линии"></button>
</label>
<label class="rect-settings-row rect-settings-row--check">
<input type="checkbox" class="rect-show-median" />
<span class="rect-settings-label">Middle line</span>
<button type="button" class="rect-median-style-btn" title="Тип срединной линии" aria-label="Тип срединной линии"></button>
<button type="button" class="rect-median-width-btn" title="Толщина срединной линии" aria-label="Толщина">1px</button>
<button type="button" class="rect-median-color-btn" title="Цвет срединной линии" aria-label="Цвет срединной линии"></button>
</label>
<label class="rect-settings-row rect-settings-row--check">
<input type="checkbox" class="rect-show-fill" checked />
<span class="rect-settings-label">Background</span>
<button type="button" class="rect-fill-color-btn" title="Цвет заливки" aria-label="Цвет заливки"></button>
</label>
</div>
`;

const borderStyleBtn =
settingsPopover.querySelector(
".rect-border-style-btn"
);
const medianStyleBtn =
settingsPopover.querySelector(
".rect-median-style-btn"
);
const medianWidthBtn =
settingsPopover.querySelector(
".rect-median-width-btn"
);
const medianColorBtn =
settingsPopover.querySelector(
".rect-median-color-btn"
);
const fillColorBtn =
settingsPopover.querySelector(
".rect-fill-color-btn"
);

if(
borderStyleBtn
){
setFibLineStyleButton(
borderStyleBtn,
"solid"
);
}

if(
medianStyleBtn
){
setFibLineStyleButton(
medianStyleBtn,
"dashed"
);
}

if(
medianWidthBtn
){
setFibLevelWidthButton(
medianWidthBtn,
null,
1
);
}

settingsPopover.addEventListener(
"mousedown",
e=>{

if(
!alive
){
return;
}

const styleBtn =
e.target.closest(
".rect-border-style-btn, .rect-median-style-btn"
);

if(
styleBtn
){

e.preventDefault();
e.stopPropagation();

const wasOpen =
isFibLineStyleMenuOpenForAnchor(
styleBtn
);

closeAllFibLineStyleMenus();

if(
!wasOpen
){
openFibLineStyleMenu(
styleBtn
);
}

return;

}

const widthBtn =
e.target.closest(
".rect-median-width-btn"
);

if(
widthBtn
){

e.preventDefault();
e.stopPropagation();

const shape =
getRectEditShape();
const fallback =
shape?.medianLineWidth ||
1;
const wasWidthOpen =
isFibLineWidthMenuOpenForAnchor(
widthBtn
);

closeAllFibLineWidthMenus();
closeAllFibLineStyleMenus();

if(
!wasWidthOpen
){
openFibLineWidthMenu(
widthBtn,
fallback
);
}

return;

}

const colorBtn =
e.target.closest(
".rect-median-color-btn, .rect-fill-color-btn"
);

if(
colorBtn
){

e.preventDefault();
e.stopPropagation();

const shape =
getRectEditShape();
const isFill =
colorBtn.classList.contains(
"rect-fill-color-btn"
);
const fallback =
isFill
? (
shape?.fillColor ||
shape?.color ||
STROKE
)
: (
shape?.medianColor ||
shape?.color ||
STROKE
);

closeFibColorMenu();
openRectColorMenu(
colorBtn,
fallback
);

}

},
true
);

settingsPopover.addEventListener(
"change",
e=>{

if(
!canApplyRectPanel()
){
return;
}

if(
e.target.matches(
".rect-show-median, .rect-show-fill"
)
){
applyRectSettingsFromPanel();
}

}
);

[
borderStyleBtn,
medianStyleBtn,
medianWidthBtn,
medianColorBtn,
fillColorBtn
].forEach(
btn=>{

if(
!btn
){
return;
}

btn.addEventListener(
"click",
e=>{
e.stopPropagation();
}
);

}
);

}

function fillRectSettingsPanel(
shape
){

ensureRectSettingsPanel();

if(
!settingsPopover
){
return;
}

rectPanelSyncing = true;

try{

const borderStyleBtn =
settingsPopover.querySelector(
".rect-border-style-btn"
);
const medianStyleBtn =
settingsPopover.querySelector(
".rect-median-style-btn"
);
const medianWidthBtn =
settingsPopover.querySelector(
".rect-median-width-btn"
);
const medianColorBtn =
settingsPopover.querySelector(
".rect-median-color-btn"
);
const fillColorBtn =
settingsPopover.querySelector(
".rect-fill-color-btn"
);
const showMedian =
settingsPopover.querySelector(
".rect-show-median"
);
const showFill =
settingsPopover.querySelector(
".rect-show-fill"
);

if(
borderStyleBtn
){
setFibLineStyleButton(
borderStyleBtn,
shape?.lineStyle ||
"solid"
);
}

if(
medianStyleBtn
){
setFibLineStyleButton(
medianStyleBtn,
shape?.medianLineStyle ||
"dashed"
);
}

if(
medianWidthBtn
){
setFibLevelWidthButton(
medianWidthBtn,
null,
shape?.medianLineWidth ||
1
);
}

const medianColor =
shape?.medianColor ||
shape?.color ||
STROKE;
const fillColor =
shape?.fillColor ||
shape?.color ||
RECT_DEFAULT_FILL_COLOR;
const fillOpacity =
Number.isFinite(
Number(
shape?.fillOpacity
)
)
? Number(
shape.fillOpacity
)
: RECT_DEFAULT_FILL_OPACITY;

if(
medianColorBtn
){
medianColorBtn.style.setProperty(
"--rect-swatch",
medianColor
);
}

if(
fillColorBtn
){
fillColorBtn.style.setProperty(
"--rect-swatch",
formatDrawColor(
fillColor,
Math.round(
fillOpacity *
100
)
)
);
}

if(
showMedian
){
showMedian.checked =
!!shape?.showMedian;
}

if(
showFill
){
showFill.checked =
shape?.showFill !==
false;
}

}finally{
rectPanelSyncing = false;
}

}

function parseRectFillSwatch(
raw
){

const parsed =
parseDrawColor(
raw
);

if(
!parsed
){
return {
fillColor:
raw ||
RECT_DEFAULT_FILL_COLOR,
fillOpacity:
RECT_DEFAULT_FILL_OPACITY
};
}

return {
fillColor:
parsed.hex,
fillOpacity:
Math.max(
0,
Math.min(
1,
parsed.opacity /
100
)
)
};

}

function readRectPanelFromDOM(){

if(
!settingsPopover
){
return {};
}

const borderStyleBtn =
settingsPopover.querySelector(
".rect-border-style-btn"
);
const medianStyleBtn =
settingsPopover.querySelector(
".rect-median-style-btn"
);
const medianWidthBtn =
settingsPopover.querySelector(
".rect-median-width-btn"
);
const medianColorBtn =
settingsPopover.querySelector(
".rect-median-color-btn"
);
const fillColorBtn =
settingsPopover.querySelector(
".rect-fill-color-btn"
);

const fillSwatch =
fillColorBtn?.style.getPropertyValue(
"--rect-swatch"
)?.trim() ||
RECT_DEFAULT_FILL_COLOR;
const fill =
parseRectFillSwatch(
fillSwatch
);

return {
lineStyle:
normalizeFibLineStyle(
borderStyleBtn?.dataset.lineStyle
) ||
"solid",
showMedian:
!!settingsPopover.querySelector(
".rect-show-median"
)?.checked,
showFill:
!!settingsPopover.querySelector(
".rect-show-fill"
)?.checked,
medianLineStyle:
normalizeFibLineStyle(
medianStyleBtn?.dataset.lineStyle
) ||
"dashed",
medianLineWidth:
normalizeFibLevelWidth(
Number(
medianWidthBtn?.dataset.lineWidth
)
) ||
1,
medianColor:
medianColorBtn?.style.getPropertyValue(
"--rect-swatch"
)?.trim() ||
STROKE,
fillColor:
fill.fillColor,
fillOpacity:
fill.fillOpacity
};

}

function canApplyRectPanel(){

return (
alive &&
isRectSettingsOpen() &&
!rectPanelSyncing
);

}

function applyRectSettingsFromPanel(){

if(
!canApplyRectPanel()
){
return;
}

const shape =
getRectEditShape();
const panel =
readRectPanelFromDOM();

if(
shape
){

shape.lineStyle =
panel.lineStyle;
shape.showMedian =
panel.showMedian;
shape.showFill =
panel.showFill;
shape.medianLineStyle =
panel.medianLineStyle;
shape.medianLineWidth =
panel.medianLineWidth;
shape.medianColor =
panel.medianColor;
shape.fillColor =
panel.fillColor;
shape.fillOpacity =
panel.fillOpacity;

touchShapeRevision(
shape
);
saveDrawings();
redraw();

}

saveToolDefaults(
"rectangle",
{
...toolDefaults.rectangle,
...panel,
color:
shape?.color ||
activeColor ||
STROKE,
lineWidth:
shape?.lineWidth ||
1
}
);

}

function canApplyFibPanel(){

return (
alive &&
isFibSettingsOpen() &&
!fibPanelSyncing
);

}

function readFibDefaultsForStyle(){

const fibStore =
migrateFibToolDefaults(
toolDefaults.fib
);

return {
fibLevels: JSON.parse(
JSON.stringify(
ensureFibLevelsVisible(
fibStore.fibLevels
)
)
),
fibShowTrendLine:
typeof fibStore.fibShowTrendLine ===
"boolean"
? fibStore.fibShowTrendLine
: false
};

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
<div class="fib-levels-global">
<span class="fib-levels-global-label">Levels line</span>
<button type="button" class="fib-global-line-style-btn" data-line-style="solid" title="Тип линии" aria-label="Тип линии"></button>
<button type="button" class="fib-global-line-width-btn" title="Толщина линии" aria-label="Толщина линии">1px</button>
</div>
<div class="fib-levels-grid" id="fib-level-rows-root"></div>
</div>
`;

const globalStyleBtn =
settingsPopover.querySelector(
".fib-global-line-style-btn"
);

const globalWidthBtn =
settingsPopover.querySelector(
".fib-global-line-width-btn"
);

if(
globalStyleBtn
){
setFibLineStyleButton(
globalStyleBtn,
"solid"
);
}

if(
globalWidthBtn
){
setFibLevelWidthButton(
globalWidthBtn,
null,
1
);
}

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
`;

const on =
row.querySelector(".fib-level-on");
const val =
row.querySelector(".fib-level-val");
const colorBtn =
row.querySelector(".fib-level-color-btn");

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
e.target.closest(
".fib-global-line-style-btn"
);

if(styleBtn){

e.preventDefault();
e.stopPropagation();

const wasOpen =
isFibLineStyleMenuOpenForAnchor(
styleBtn
);

closeAllFibLineStyleMenus();

if(!wasOpen){
openFibLineStyleMenu(
styleBtn
);
}

return;

}

const widthBtn =
e.target.closest(
".fib-global-line-width-btn"
);

if(widthBtn){

e.preventDefault();
e.stopPropagation();

const shape =
getFibEditShape();

const fallback =
shape?.lineWidth || 1;

const wasWidthOpen =
isFibLineWidthMenuOpenForAnchor(
widthBtn
);

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
".fib-global-line-style-btn, .fib-line-style-menu--portal, .fib-global-line-width-btn, .fib-line-width-menu--portal"
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

if(
!alive ||
!isFibSettingsOpen() ||
fibPanelSyncing
){
return false;
}

const shape =
resolveFibStyleTarget();

const panel =
readFibPanelFromDOM();

if(!shape){

const style =
readStyleFromUI();

saveToolDefaults(
"fib",
{
fibDefaultsVersion: FIB_TOOL_DEFAULTS_VERSION,
color: style.color,
lineWidth: style.lineWidth,
fibLevels: panel.fibLevels,
fibShowTrendLine: panel.fibShowTrendLine
}
);

redraw();
return true;

}

shape.fibLevels =
JSON.parse(
JSON.stringify(panel.fibLevels)
);

shape.fibShowTrendLine =
panel.fibShowTrendLine;

if(
Number.isFinite(
panel.lineWidth
)
){
shape.lineWidth =
panel.lineWidth;
}

touchShapeRevision(
shape
);

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
fibShowTrendLine: shape.fibShowTrendLine
}
);

return true;

}

setFibPanelCommitHook(()=>{

if(
isRectSettingsOpen()
){
applyRectSettingsFromPanel();
return;
}

rememberFibSettingsTarget();
commitFibPanelToShape();

});

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

function openRectColorMenu(
anchorBtn,
fallbackColor
){

const portal =
ensureFibColorMenuPortal();

fibColorMenuAnchor =
anchorBtn;

const shape =
getRectEditShape();

const active =
anchorBtn.style.getPropertyValue(
"--rect-swatch"
)?.trim() ||
fallbackColor ||
STROKE;

const activeOpacity =
Number.isFinite(
Number(
shape?.fillOpacity
)
)
? Math.round(
Number(
shape.fillOpacity
) *
100
)
: Math.round(
RECT_DEFAULT_FILL_OPACITY *
100
);

mountTvColorPicker(
portal,
{
activeColor: active,
activeOpacity,
onChange: color=>{

anchorBtn.style.setProperty(
"--rect-swatch",
color
);

applyRectSettingsFromPanel();

},
onSelect: color=>{

anchorBtn.style.setProperty(
"--rect-swatch",
color
);

closeFibColorMenu();
applyRectSettingsFromPanel();

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

function openFibColorMenu(anchorBtn, fallbackColor){

const portal =
ensureFibColorMenuPortal();

fibColorMenuAnchor = anchorBtn;

const active =
anchorBtn.dataset.customColor ||
fallbackColor ||
STROKE;

mountTvColorPicker(
portal,
{
activeColor: active,
onChange: color=>{

setFibLevelColorButton(
anchorBtn,
color,
fallbackColor
);

rememberFibSettingsTarget();
commitFibPanelToShape();

},
onSelect: color=>{

setFibLevelColorButton(
anchorBtn,
color,
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
".fib-level-color-btn, .fib-level-color-menu, .rect-fill-color-btn, .rect-median-color-btn, .tv-color-picker"
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

if(
!isFibSettingsOpen() ||
fibPanelSyncing
){
return;
}

if(fibApplyTimer){
clearTimeout(fibApplyTimer);
fibApplyTimer = null;
}

applyFibSettingsFromPanel();

}

function scheduleFibApplyDebounced(){

if(
!isFibSettingsOpen() ||
fibPanelSyncing
){
return;
}

if(fibApplyTimer){
clearTimeout(fibApplyTimer);
}

fibApplyTimer =
setTimeout(()=>{

fibApplyTimer = null;

if(
!isFibSettingsOpen() ||
fibPanelSyncing
){
return;
}

applyFibSettingsFromPanel();

},320);

}

function readFibPanelFromDOM(){

ensureFibSettingsPanel();

const template =
cloneDefaultFibRows();

const trendEl =
settingsPopover.querySelector("#fib-show-trend-line");

const fibShowTrendLine =
trendEl
? !!trendEl.checked
: false;

const globalStyleBtn =
settingsPopover.querySelector(
".fib-global-line-style-btn"
);

const globalWidthBtn =
settingsPopover.querySelector(
".fib-global-line-width-btn"
);

const globalLineStyle =
normalizeFibLineStyle(
globalStyleBtn?.dataset.lineStyle
);

const globalLineWidth =
normalizeFibLevelWidth(
globalWidthBtn?.dataset.customWidth
) ||
normalizeFibLevelWidth(
globalWidthBtn?.textContent
) ||
1;

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
globalLineStyle;

template[i].lineWidth =
globalLineWidth;

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

});

return {
fibLevels:template,
fibShowTrendLine,
lineWidth: globalLineWidth,
lineStyle: globalLineStyle
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
panel.fibShowTrendLine;

}

shape.fibLevels = levels;

}

function applyFibGlobalColorFromToolbar(shape, color){

shape.color = color;

const panel =
isFibSettingsOpen()
? readFibPanelFromDOM()
: null;

mergeFibLevelsAfterGlobalChange(
shape,
panel,
{ clearColors: true, clearWidths: false }
);

if(
fibPanelBuilt &&
isFibSettingsOpen()
){
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
isFibSettingsOpen()
? readFibPanelFromDOM()
: null;

mergeFibLevelsAfterGlobalChange(
shape,
panel,
{ clearColors: false, clearWidths: true }
);

if(
fibPanelBuilt &&
isFibSettingsOpen()
){
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

fibPanelSyncing = true;

try{

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

const baseLineStyle =
rows.find(
row=>row.enabled
)?.lineStyle ||
rows[
0
]?.lineStyle ||
"solid";

const trendEl =
settingsPopover.querySelector("#fib-show-trend-line");

if(trendEl){

trendEl.checked =
!!fibShowTrendLine;

}

const globalStyleBtn =
settingsPopover.querySelector(
".fib-global-line-style-btn"
);

const globalWidthBtn =
settingsPopover.querySelector(
".fib-global-line-width-btn"
);

setFibLineStyleButton(
globalStyleBtn,
baseLineStyle
);

setFibLevelWidthButton(
globalWidthBtn,
baseWidth,
baseWidth
);

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

});

}finally{
fibPanelSyncing = false;
}

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
isFibSettingsOpen()
){

Object.assign(
base,
readFibPanelFromDOM()
);

}else if(
isRectSettingsOpen()
){

Object.assign(
base,
readRectPanelFromDOM()
);

}else if(
tgt === "fib" ||
tool === "fib"
){

Object.assign(
base,
readFibDefaultsForStyle()
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

const activeParsed =
parseDrawColor(
color
);

const swatchParsed =
parseDrawColor(
btn.dataset.color
);

btn.classList.toggle(
"active",
!!activeParsed &&
!!swatchParsed &&
activeParsed.hex.toLowerCase() ===
swatchParsed.hex.toLowerCase()
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

touchShapeRevision(
sel
);
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

function isPositionRiskInputFocused(){

return (
document.activeElement ===
positionRiskInput ||
positionRiskInput?.contains?.(
document.activeElement
)
);

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
type !== "fib" &&
type !== "rectangle"
);

const isPosToolbar =
isPositionType(type);

const isArrowTool =
type ===
"arrow";

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
isPosToolbar ||
!!style.isAlert ||
isArrowTool
);

positionRiskWrap?.classList.toggle(
"hidden",
!isPosToolbar
);

if(
isPositionType(type) &&
positionRiskInput &&
!isPositionRiskInputFocused()
){

const sel =
getSelected();

const shapeRisk =
sel &&
isPositionType(sel.type) &&
Number.isFinite(
Number(
sel.riskUsd
)
) &&
Number(
sel.riskUsd
) >
0
? Number(
sel.riskUsd
)
: null;

const riskVal =
shapeRisk ??
style.riskUsd ??
toolDefaults[type]?.riskUsd;

positionRiskInput.value =
riskVal > 0
? String(riskVal)
: "";

}

if(type === "fib"){

if(
!isFibSettingsOpen()
){

const fibShape =
getSelected()?.type === "fib"
? getSelected()
: getFibEditShape();

fillFibSettingsPanel(
getFibRows(
fibShape ||
{ fibLevels: style.fibLevels }
),
style.fibShowTrendLine,
style.color,
style.lineWidth
);

}

}else if(
type ===
"rectangle"
){

if(
!isRectSettingsOpen()
){

const rectShape =
getSelected()?.type ===
"rectangle"
? getSelected()
: getRectEditShape();

fillRectSettingsPanel(
rectShape ||
baseDefaultStyle(
"rectangle"
)
);

}

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
TABLET_USE_CUSTOM_TOUCH_PAN &&
!hasAnyFinePointer()
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
type === "fib" &&
!placement
? resolveFibStyleTarget()
: null;

const target =
fibTarget || (
!placement
? sel
: null
);

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

}else if(
target.type ===
"arrow"
){

target.color = style.color;

}else if(
target.type ===
"rectangle"
){

target.color = style.color;
target.lineWidth = style.lineWidth;

if(
isRectSettingsOpen()
){

const panel =
readRectPanelFromDOM();

target.lineStyle =
panel.lineStyle;
target.showMedian =
panel.showMedian;
target.showFill =
panel.showFill;
target.medianLineStyle =
panel.medianLineStyle;
target.medianLineWidth =
panel.medianLineWidth;
target.medianColor =
panel.medianColor;
target.fillColor =
panel.fillColor;
target.fillOpacity =
panel.fillOpacity;

}

}else{

target.color = style.color;
target.lineWidth = style.lineWidth;

}

touchShapeRevision(
target
);

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
typeof style.fibShowTrendLine ===
"boolean"
? style.fibShowTrendLine
: false;

}

if(
type ===
"rectangle"
){

Object.assign(
defaultsPayload,
readRectPanelFromDOM()
);

}

if(
type ===
"arrow"
){

delete defaultsPayload.lineWidth;

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

if(
fibSettingsWasOpen
){
commitFibPanelToShape();
}

colorPopover?.classList.add("hidden");
widthPopover?.classList.add("hidden");
settingsPopover?.classList.add("hidden");
closeAllFibLineStyleMenus();
closeAllFibLineWidthMenus();
closeFibColorMenu();

if(fibSettingsWasOpen){
fibSettingsShapeId = null;
flushDeferredFibSettingsSync();
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

return tabletDrawInput?.isTouchDrawTablet() ??
false;

}

function isTouchDrawPlacement(){

return tabletDrawInput?.isTouchDrawPlacement() ??
false;

}

function useChartProbeCrosshair(){

return tabletDrawInput?.useChartProbeCrosshair() ??
false;

}

function initTouchDrawCrosshair(){

tabletDrawInput?.initTouchDrawCrosshair();

}

function syncTouchDrawCrosshairPreview(){

tabletDrawInput?.syncTouchDrawCrosshairPreview();

}

function showStandardChartCrosshair(
e,
localX,
localY
){

tabletDrawInput?.showStandardChartCrosshair(
e,
localX,
localY
);

}

function hideStandardChartCrosshair(){

tabletDrawInput?.hideStandardChartCrosshair();

}

function suppressChartCrosshairForDrag(){

tabletDrawInput?.suppressChartCrosshairForDrag();

}

function syncEditDragCrosshair(
e,
localX,
localY
){

tabletDrawInput?.syncEditDragCrosshair(
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

tabletDrawInput?.beginEditDragCrosshair(
e,
localX,
localY
);

}

function clearEditDragCrosshair(){

tabletDrawInput?.clearEditDragCrosshair();

}

function placementPointsNeeded(
type
){

return tabletDrawInput?.placementPointsNeeded(
type
) ??
2;

}

function clearTouchDrawState(){

tabletDrawInput?.clearTouchDrawState();

}

function getTouchDrawCrosshair(){

return tabletDrawInput?.getTouchDrawCrosshair() ??
null;

}

function getTouchPlaceTrack(){

return tabletDrawInput?.getTouchPlaceTrack() ??
null;

}

function invalidateLastCandleRightXCache(){

cachedLastCandleRightX = NaN;

}

function getLastCandleRightX(){

if(
Number.isFinite(
cachedLastCandleRightX
)
){
return cachedLastCandleRightX;
}

const candles =
candleSeries();

if(
!candles.length
){
return null;
}

const x =
xFromTime(
candles[
candles.length -
1
].time
);

if(
x == null ||
!Number.isFinite(
x
)
){
return null;
}

cachedLastCandleRightX = x;
return x;

}

function isPlotXBeyondLastCandle(
plotX
){

const right =
getLastCandleRightX();

if(
right == null
){
return false;
}

return plotX > right + 0.5;

}

function resetPlacementCrosshairCache(){

placementCrosshairVert = null;
placementCrosshairHorz = null;

}

function cancelPlacementPreviewRaf(){

if(
placementPreviewRaf
){
cancelAnimationFrame(
placementPreviewRaf
);
placementPreviewRaf = 0;
}

placementPreviewPending = null;

}

function ensurePlacementCrosshairEls(){

if(
!placementCrosshairVert
){
placementCrosshairVert =
wrapEl.querySelector(
".chart-dom-crosshair-vert"
);
}

if(
!placementCrosshairHorz
){
placementCrosshairHorz =
wrapEl.querySelector(
".chart-dom-crosshair-horz"
);

}

}

/** Только DOM-линии по локальным координатам (без getBoundingClientRect). */
function updatePlacementCrosshairFast(
localX,
localY
){

ensurePlacementCrosshairEls();

const { w, h } =
chartSize();
const plotW =
getPlotWidth();

const x =
Math.max(
0,
Math.min(
plotW,
localX
)
);

const y =
Math.max(
0,
Math.min(
h,
localY
)
);

if(
placementCrosshairVert
){

placementCrosshairVert.style.left =
`${Math.round(x)}px`;

placementCrosshairVert.classList.remove(
"hidden"
);

}

if(
placementCrosshairHorz
){

if(
useChartProbeCrosshair()
){

const stackEl =
document.getElementById(
"charts-stack"
);

const probeHorizEl =
document.getElementById(
"tablet-probe-crosshair-h"
);

const wrapR =
wrapEl.getBoundingClientRect();

positionTabletProbeHorizInStack({
horizLineEl: probeHorizEl,
chartsStackEl: stackEl,
chartEl: chartCanvasEl(),
chart,
clientY: wrapR.top + y
});

}else{

placementCrosshairHorz.style.top =
`${Math.round(y)}px`;

placementCrosshairHorz.style.width =
`${Math.round(plotW)}px`;

placementCrosshairHorz.classList.remove(
"hidden"
);

}

}

}

function flushPlacementPreviewRedraw(){

const pending =
placementPreviewPending;

if(
!placement ||
!pending
){
return;
}

previewXY = {
x: pending.x,
y: pending.y
};

previewPoint =
pointFromXY(
pending.x,
pending.y
);

if(
isPositionType(placement.type) &&
placement.points.length >= 1 &&
previewPoint
){
previewPoint.price = placement.points[0].price;
}

redraw();

}

function schedulePlacementPreviewRedraw(){

if(
placementPreviewRaf
){
return;
}

placementPreviewRaf =
requestAnimationFrame(()=>{

placementPreviewRaf = 0;
flushPlacementPreviewRedraw();

});

}

function setupPlacementPointerPreview(){

const onPlacementPointerMove = e=>{

if(
!alive ||
!isActive()
){
return;
}

syncChartRulerShiftFromEvent(
e
);

if(
tool ===
"cursor" &&
chartRulerStart
){

if(
!e.isPrimary
){
return;
}

const { x, y } =
pointerFromEvent(
e
);

syncChartRulerEndFromPlot(
x,
y
);

return;

}

if(
!placement ||
isTouchDrawPlacement()
){
return;
}

if(!e.isPrimary){
return;
}

const { x, y } =
pointerFromEvent(e);

syncDesktopDrawPlacementPreview(
x,
y,
e
);

};

wrapEl.addEventListener(
"pointermove",
onPlacementPointerMove,
true
);

const onRulerPointerDown = e=>{
syncChartRulerShiftFromEvent(
e
);
};

wrapEl.addEventListener(
"pointerdown",
onRulerPointerDown,
true
);

return ()=>{
wrapEl.removeEventListener(
"pointermove",
onPlacementPointerMove,
true
);
wrapEl.removeEventListener(
"pointerdown",
onRulerPointerDown,
true
);
};

}

function setupFinePointerChartClicks(){

if(
!tabletCustomPanHooked
){
return ()=>{};
}

const onFinePointerDown = e=>{

if(
!alive ||
!isActive()
){
return;
}

if(
e.pointerType !==
"mouse"
){
return;
}

if(
!isTabletChartViewport() ||
!hasAnyFinePointer()
){
return;
}

if(
tool ===
"cursor" ||
isDrawChromePointerEvent(
e
)
){
return;
}

if(
e.button !==
0 ||
!e.isPrimary
){
return;
}

const { x, y } =
pointerFromEvent(
e
);

const placed =
handleToolClick(
{
point:{
x,
y
},
metaKey: e.metaKey
}
);

if(
!placed
){
return;
}

blockChartClick =
true;

e.preventDefault();

};

wrapEl.addEventListener(
"pointerdown",
onFinePointerDown,
true
);

return ()=>{
wrapEl.removeEventListener(
"pointerdown",
onFinePointerDown,
true
);
};

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

if(
placement
){
time = timeFromX(param.point.x);
}

if(
time == null &&
param.time != null
){
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

function clearChartRuler(){

chartRulerStart = null;
chartRulerEndPlot = null;

hideChartRulerLabelEl(
chartRulerLabelEl
);

syncChartRulerLayerClass();

if(
chartRulerRedrawRaf
){
cancelAnimationFrame(
chartRulerRedrawRaf
);
chartRulerRedrawRaf = 0;
}

}

function syncChartRulerLayerClass(){

wrapEl?.classList.toggle(
"chart-ruler-active",
!!chartRulerStart
);

}

function scheduleChartRulerRedraw(){

if(
chartPanActive
){
return;
}

if(
chartRulerRedrawRaf
){
return;
}

chartRulerRedrawRaf =
requestAnimationFrame(()=>{

chartRulerRedrawRaf = 0;
redraw();

});

}

function isChartRulerShiftActive(
optEvent
){

return !!(
chartRulerShiftDown ||
optEvent?.shiftKey ===
true
);

}

function syncChartRulerShiftFromEvent(
optEvent
){

if(
optEvent?.shiftKey ===
true
){
chartRulerShiftDown = true;
}

}

function drawChartRulerOverlay(
ctx,
plotW,
plotH
){

if(
!chartRulerStart ||
!chartRulerEndPlot
){
return;
}

const startXY =
toXY(
chartRulerStart
);

if(
!startXY
){
return;
}

const endPoint =
pointFromXY(
chartRulerEndPlot.x,
chartRulerEndPlot.y
);

if(
!endPoint
){
return;
}

const metrics =
computeChartRulerMetrics(
chartRulerStart,
endPoint,
candleSeries()
);

const goesDown =
isChartRulerGoingDown(
startXY,
chartRulerEndPlot
);

drawChartRuler(
ctx,
startXY,
chartRulerEndPlot,
goesDown
);

try{

updateChartRulerLabelEl(
chartRulerLabelEl,
{
bx: chartRulerEndPlot.x,
by: chartRulerEndPlot.y,
goesDown,
metrics,
plotW,
plotH
}
);

}catch(
labelErr
){
console.warn(
"chart ruler label",
labelErr
);
}

}

function syncChartRulerEndFromPlot(
rawX,
rawY
){

if(
tool !==
"cursor" ||
!chartRulerStart
){
return false;
}

if(
!Number.isFinite(
rawX
) ||
!Number.isFinite(
rawY
)
){
return false;
}

chartRulerEndPlot = {
x: rawX,
y: rawY
};

scheduleChartRulerRedraw();

return true;

}

function handleChartRulerClick(
point,
param
){

if(
tool !==
"cursor" ||
!isChartRulerShiftActive(
param
) ||
!point
){
return false;
}

if(
chartRulerStart
){
clearChartRuler();
redraw();
return true;
}

chartRulerStart = {
time: point.time,
price: point.price
};

const startPlot =
toXY(
chartRulerStart
);

chartRulerEndPlot = {
x: param.point?.x ??
startPlot?.x ??
0,
y: param.point?.y ??
startPlot?.y ??
0
};

syncChartRulerLayerClass();
redraw();

return true;

}

function isDrawMagnetActive(
optEvent
){

if(
tool ===
"cursor" ||
isTouchDrawPlacement() ||
!placement
){
return false;
}

return !!(
drawMagnetKeyDown ||
optEvent?.metaKey ===
true
);

}

function syncDrawMagnetModifierFromEvent(
optEvent
){

if(
optEvent?.metaKey ===
true
){
drawMagnetKeyDown = true;
}

}

function syncDesktopDrawPlacementPreview(
rawX,
rawY,
optEvent
){

if(
!placement ||
isTouchDrawPlacement()
){
return null;
}

if(
!Number.isFinite(
rawX
) ||
!Number.isFinite(
rawY
)
){
return null;
}

syncDrawMagnetModifierFromEvent(
optEvent
);

placementPointerXY = {
x: rawX,
y: rawY
};

lastCrosshairPlotXY = {
x: rawX,
y: rawY
};

const resolved =
resolvePlacementPlotXY(
rawX,
rawY,
optEvent
);

applyPlacementPreviewPoint(
resolved
);

const lx =
resolved.x;
const ly =
resolved.y;

if(
isPlotXBeyondLastCandle(
rawX
)
){

updatePlacementCrosshairFast(
lx,
ly
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

}else{

hideDomChartCrosshair(
wrapEl
);

showStandardChartCrosshair(
null,
lx,
ly
);

}

redraw();

return resolved;

}

function resolvePlacementPlotXY(
rawX,
rawY,
optEvent
){

if(
!Number.isFinite(
rawX
) ||
!Number.isFinite(
rawY
)
){
return {
x: rawX,
y: rawY,
snapped: false
};
}

if(
!isDrawMagnetActive(
optEvent
)
){
return {
x: rawX,
y: rawY,
snapped: false
};
}

const snap =
snapPlotToCandleWick({
plotX: rawX,
plotY: rawY,
candles: candleSeries(),
timeFromX,
xFromTime,
priceToPlotY: plotPriceToCoordinate
});

if(
!snap
){
return {
x: rawX,
y: rawY,
snapped: false
};
}

return {
x: snap.x,
y: snap.y,
snapped: true,
point: {
time: snap.time,
price: snap.price
}
};

}

function pointFromResolvedPlacementPlot(
resolved
){

if(
resolved?.point
){
return {
time: resolved.point.time,
price: resolved.point.price
};
}

return pointFromXY(
resolved.x,
resolved.y
);

}

function applyPlacementPreviewPoint(
resolved
){

previewXY = {
x: resolved.x,
y: resolved.y
};

previewPoint =
pointFromResolvedPlacementPlot(
resolved
);

if(
isPositionType(
placement.type
) &&
placement.points.length >=
1 &&
previewPoint
){
previewPoint.price =
placement.points[
0
].price;
}

}

function refreshPlacementPreviewFromPointer(
optEvent
){

if(
!placement ||
isTouchDrawPlacement()
){
return null;
}

const raw =
placementPointerXY ||
lastCrosshairPlotXY;

if(
!raw
){
return null;
}

return syncDesktopDrawPlacementPreview(
raw.x,
raw.y,
optEvent
);

}


function readChartScaleMargins(){

try{

const o =
chart.priceScale(
"right"
).options();

return {
top:
o.scaleMargins?.top ??
0.12,
bottom:
o.scaleMargins?.bottom ??
0.12
};

}catch{

return {
top:0.12,
bottom:0.12
};

}

}

function isPriceScaleInverted(){

try{
return chart.priceScale(
"right"
).options().invertScale ===
true;
}catch{
return false;
}

}

function manualPriceToCoordinate(
price
){

const s =
manualPriceScaleDrag;

if(
!s ||
!Number.isFinite(
price
)
){
return null;
}

const {
minPrice,
maxPrice,
top,
bottom,
h
} =
s;

const plotTop =
h * top;

const plotHeight =
h * (
1 - top - bottom
);

if(
plotHeight <=
0
){
return null;
}

const inverted =
s.inverted;

if(
s.logarithmic &&
minPrice >
0 &&
maxPrice >
0 &&
price >
0
){

const logMin =
Math.log(
minPrice
);

const logMax =
Math.log(
maxPrice
);

const logSpan =
logMax - logMin;

if(
!Number.isFinite(logSpan) ||
logSpan ===
0
){
return null;
}

const logP =
Math.log(
price
);

const ratio =
inverted
? (
logP - logMin
) / logSpan
: (
logMax - logP
) / logSpan;

return plotTop + ratio * plotHeight;

}

const span =
maxPrice - minPrice;

if(
!Number.isFinite(span) ||
span ===
0
){
return null;
}

const ratio =
inverted
? (
price - minPrice
) / span
: (
maxPrice - price
) / span;

return plotTop + ratio * plotHeight;

}

function plotPriceToCoordinate(
price
){

if(
priceScaleDragActive
){

if(
manualPriceScaleDrag
){
const y =
manualPriceToCoordinate(
price
);

if(
y !=
null
){
return y;
}
}

return null;

}

return series.priceToCoordinate(
price
);

}

function toXY(point){

if(
!point ||
point.time ==
null ||
!Number.isFinite(
point.price
)
){
return null;
}

const x = xFromTime(point.time);
const y = plotPriceToCoordinate(point.price);

if(x == null || y == null){
return null;
}

return { x, y };

}

function positionBadgeFont(){

return '600 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif';

}

function toXY(point){

if(
!point ||
point.time ==
null ||
!Number.isFinite(
point.price
)
){
return null;
}

const x = xFromTime(point.time);
const y = plotPriceToCoordinate(point.price);

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

if(
kind === "tp" ||
kind === "sl" ||
kind === "long-center" ||
kind === "short-center"
){
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

function candleBarStepSec(){

const candles =
candleSeries();

if(
candles.length <
2
){
return 3600;
}

const last =
candles[
candles.length - 1
];
const prev =
candles[
candles.length - 2
];

return Math.max(
60,
last.time - prev.time
);

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

if(
candles.length >=
2
){

const last =
candles[
candles.length - 1
];
const dt =
candleBarStepSec();

if(
t1 >=
last.time
){

let b =
toXY({
time: t2,
price: entry
});

for(
let step =
0;
step <
320;
step++
){

if(
b &&
Math.abs(
b.x - a.x
) >=
minW
){
break;
}

t2 =
t1 +
dt *
Math.max(
step + 1,
POSITION_DEFAULT_WIDTH_BARS
);

b =
toXY({
time: t2,
price: entry
});

}

return {
time: t2,
price: entry
};

}

}

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

if(
idx <
0
){

const last =
candles[
candles.length - 1
];
const dt =
candleBarStepSec();
const barsFromLast =
Math.max(
1,
Math.ceil(
(t0 - last.time) /
dt
)
);

return ensurePositionP2MinWidth(
p1,
{
time:
last.time +
dt *
(
barsFromLast +
POSITION_DEFAULT_WIDTH_BARS
),
price: p1.price
}
);

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

const handleId =
opts.handleId ||
null;

const preserveTpSl =
!!opts.preserveTpSl ||
handleId ===
"entryL" ||
handleId ===
"entryR";

const entry =
positionEntryPrice(
shape
);

if(
!Number.isFinite(
entry
)
){
return;
}

shape.p1.price = entry;
shape.p2.price = entry;

if(
preserveTpSl
){
return;
}

const tp =
Number(
shape.tpPrice
);
const sl =
Number(
shape.slPrice
);
const eps =
Math.max(
Math.abs(
entry
) *
1e-9,
1e-12
);

if(
shape.type ===
"long"
){

if(
handleId ===
"tp"
){

shape.tpPrice =
Number.isFinite(
tp
)
? (
tp >
entry +
eps
? tp
: entry +
eps
)
: entry *
(
1 +
POSITION_DEFAULT_TP_PCT
);

}else if(
handleId ===
"sl"
){

shape.slPrice =
Number.isFinite(
sl
)
? (
sl <
entry -
eps
? sl
: entry -
eps
)
: entry *
(
1 -
POSITION_DEFAULT_SL_PCT
);

}else{

shape.tpPrice =
Number.isFinite(
tp
) &&
tp >
entry
? tp
: entry *
(
1 +
POSITION_DEFAULT_TP_PCT
);

shape.slPrice =
Number.isFinite(
sl
) &&
sl <
entry
? sl
: entry *
(
1 -
POSITION_DEFAULT_SL_PCT
);

}

return;

}

if(
handleId ===
"tp"
){

shape.tpPrice =
Number.isFinite(
tp
)
? (
tp <
entry -
eps
? tp
: entry -
eps
)
: entry *
(
1 -
POSITION_DEFAULT_TP_PCT
);

}else if(
handleId ===
"sl"
){

shape.slPrice =
Number.isFinite(
sl
)
? (
sl >
entry +
eps
? sl
: entry +
eps
)
: entry *
(
1 +
POSITION_DEFAULT_SL_PCT
);

}else{

shape.tpPrice =
Number.isFinite(
tp
) &&
tp <
entry
? tp
: entry *
(
1 -
POSITION_DEFAULT_TP_PCT
);

shape.slPrice =
Number.isFinite(
sl
) &&
sl >
entry
? sl
: entry *
(
1 +
POSITION_DEFAULT_SL_PCT
);

}

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

/** TP/SL/центр — прямоугольные плашки (не pill). */
const POSITION_EDGE_BADGE_GAP =
4;

const POSITION_EDGE_BADGE_H =
18;

function fillPositionBadgeRect(
ctx,
left,
top,
bw,
bh,
fill,
stroke
){

ctx.fillStyle = fill;
ctx.fillRect(
left,
top,
bw,
bh
);

if(
stroke
){
ctx.strokeStyle = stroke;
ctx.lineWidth = 1;
ctx.strokeRect(
left + 0.5,
top + 0.5,
bw - 1,
bh - 1
);
}

}

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
const padY = 6;
const lineGap = 2;
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

function measureSegments(
segments
){

return segments.map(seg=>{

const font =
resolvePositionBadgeFont(
seg.font,
variant
);

ctx.font = font;

return {
text: seg.text,
font,
color: seg.color,
highlight: seg.highlight === true,
width: ctx.measureText(
seg.text
).width
};

});

}

function lineTextWidth(
measured
){

return measured.reduce(
(sum, seg)=>sum + seg.width,
0
);

}

function drawMeasuredLine(
measured,
lineCy
){

const textWidth =
lineTextWidth(
measured
);

let x =
cx - textWidth / 2;

measured.forEach(
seg=>{

ctx.font = seg.font;

if(
seg.highlight
){

const pad = 4;
const pillH = 18;
const pillTop =
lineCy - pillH / 2;

ctx.fillStyle = "rgba(0, 0, 0, 0.55)";
ctx.fillRect(
x - pad,
pillTop,
seg.width + pad * 2,
pillH
);

}

ctx.fillStyle =
seg.color ||
(
variant === "long-center" ||
variant === "short-center"
? "#ffffff"
: "#f8fafc"
);
ctx.fillText(
seg.text,
x,
lineCy
);
x += seg.width;

}
);

}

const multiline =
text &&
typeof text ===
"object" &&
!Array.isArray(
text
) &&
Array.isArray(
text.lines
);

if(
multiline
){

const measuredLines =
text.lines.map(
line=>
measureSegments(
line
)
);

const lineHeights =
text.lines.map(
line=>{

if(
line.some(
seg=>seg.font ===
"volume"
)
){
return 20;
}

if(
line.some(
seg=>seg.font ===
"badge" ||
seg.font ===
"tp" ||
seg.font ===
"sl"
)
){
return 18;
}

return 14;

}
);

const textWidth =
Math.max(
...measuredLines.map(
lineTextWidth
)
);

const bw =
textWidth + padX * 2;
const bh =
lineHeights.reduce(
(sum, h)=>sum + h,
0
) +
lineGap *
(
measuredLines.length -
1
) +
padY * 2;

const left =
cx - bw / 2;
const top =
cy - bh / 2;

fillPositionBadgeRect(
ctx,
left,
top,
bw,
bh,
fill,
stroke
);

ctx.textAlign = "left";

let y =
top + padY;

measuredLines.forEach(
(measured, idx)=>{

const lineH =
lineHeights[
idx
];
const lineCy =
y + lineH / 2;

drawMeasuredLine(
measured,
lineCy
);

y +=
lineH + lineGap;

}
);

ctx.restore();

return;

}

const segments =
Array.isArray(
text
)
? text
:[
{
text,
font: variant
}
];

const hasVolumeHighlight =
segments.some(
seg=>seg.font ===
"volume"
);

const measured =
measureSegments(
segments
);

const textWidth =
lineTextWidth(
measured
);
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

fillPositionBadgeRect(
ctx,
left,
top,
bw,
bh,
fill,
stroke
);

ctx.textAlign = "left";

drawMeasuredLine(
measured,
cy
);

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

fillPositionBadgeRect(
ctx,
left,
top,
tw,
th,
fill,
null
);
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
{
lines: [
[
{ text:"Объем ", font:"entry" },
{
text: formatVolumeUsd(
sizing.volume
),
font: "volume",
color: POSITION_VOLUME_COLOR
},
{ text:" $", font:"entry" }
],
[
{
text:`RR: ${sizing.rrNum.toFixed(2)}`,
font:"tp"
}
]
]
},
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

function isPointerInPriceGutter(
px
){

return (
px >=
getPlotWidth() - 4
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

function getCurrentPriceHudBand(){

const hud =
wrapEl.querySelector(
".chart-price-hud"
);

if(
!hud ||
hud.classList.contains(
"hidden"
)
){
return null;
}

let centerY =
parseFloat(
String(
hud.style.top ||
""
)
);

if(
!Number.isFinite(
centerY
)
){

const data =
series.data();
const last =
data?.[data.length - 1];

if(
!last ||
last.close == null
){
return null;
}

centerY =
series.priceToCoordinate(
last.close
);

if(
centerY == null ||
!Number.isFinite(
centerY
)
){
return null;
}

}

const height =
hud.offsetHeight ||
CHART_PRICE_HUD_FALLBACK_HEIGHT;

return {
centerY,
height
};

}

function drawPriceScaleLabels(ctx){

const entries = [];

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

entries.push({
yIdeal: y,
price: shape.price,
color
});

});

if(selectedId){

const sel =
drawings.find(d=>d.id === selectedId);

if(
sel &&
sel.type !== "hray"
){

listHandles(sel).forEach(handle=>{

const xy =
toXY(handle.point);

if(!xy){
return;
}

const { color } =
shapeStyle(sel);

entries.push({
yIdeal: xy.y,
price: handle.point.price,
color
});

});

}

}

if(!entries.length){
return;
}

const hudBand =
getCurrentPriceHudBand();

const yDraws =
layoutScaleLabelYs(
entries.map(e=>e.yIdeal),
CHART_SCALE_LABEL_LINE_HEIGHT,
chartSize().h,
{
fixedBands:
hudBand
? [hudBand]
: []
}
);

entries.forEach((entry, i)=>{

const yDraw =
yDraws[i];

if(
!Number.isFinite(yDraw)
){
return;
}

drawScalePriceBadge(
ctx,
yDraw,
entry.price,
entry.color
);

});

}

function resizeCanvas(){

const dpr =
window.devicePixelRatio ||
1;
const {
w,
h
} =
chartSize();

const nextW =
Math.max(
1,
Math.floor(
w *
dpr
)
);
const nextH =
Math.max(
1,
Math.floor(
h *
dpr
)
);
const cssW =
`${w}px`;
const cssH =
`${h}px`;

if(
canvas.width ===
nextW &&
canvas.height ===
nextH &&
canvas.style.width ===
cssW &&
canvas.style.height ===
cssH
){
return;
}

canvas.width =
nextW;
canvas.height =
nextH;
canvas.style.width =
cssW;
canvas.style.height =
cssH;

removePriceGutterOverlay();

/* bitmap clear — сразу redraw (resizeCharts уже обновил LW chart). */
redraw();

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

const sel =
getSelected();

const showAlertToggle =
!!sel &&
sel.type ===
"hray" &&
!sel.isAlert;

alertToggleBtn?.classList.toggle(
"hidden",
!showAlertToggle
);

}

function registryAlertDrawPrice(
alert
){

const sid =
String(
alert.shapeId ||
alert.id ||
""
).trim();

if(
dragState &&
sid
){

const dragged =
drawings.find(
d=>
d.id ===
dragState.shapeId
);

if(
dragged &&
dragged.id ===
sid
){

const live =
alertPriceFromShape(
dragged
);

if(
Number.isFinite(
live
)
){
return live;
}

}

}

return alertPriceForDisplay(
alert
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

const level =
registryAlertDrawPrice(
alert
);

if(
!Number.isFinite(
level
)
){
continue;
}

const y =
series.priceToCoordinate(
level
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

function anchorCircleRadius(){

return isCoarseTouchViewport()
? 10
: 5;

}

function anchorSquareHalfSize(){

return isCoarseTouchViewport()
? 8
: 4;

}

function handleHitThreshold(
shape
){

if(
!isCoarseTouchViewport()
){
return isPositionType(
shape.type
)
? 16
: 10;
}

const touchHit =
Math.max(
anchorCircleRadius() *
2,
anchorSquareHalfSize() *
Math.SQRT2
);

return isPositionType(
shape.type
)
? Math.max(
touchHit,
16
)
: touchHit;

}

function drawAnchorCircle(ctx, x, y){

const r =
anchorCircleRadius();

ctx.beginPath();
ctx.arc(x, y, r, 0, Math.PI * 2);
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

const h =
anchorSquareHalfSize();

ctx.fillStyle = HANDLE_FILL;
ctx.fillRect(x - h, y - h, h * 2, h * 2);
ctx.strokeStyle = HANDLE_STROKE;
ctx.lineWidth = 1.5;
ctx.strokeRect(x - h - 0.5, y - h - 0.5, h * 2 + 1, h * 2 + 1);

}

function listHandles(shape){

if(shape.type === "trendline" || shape.type === "fib" || shape.type === "arrow"){

return [
{ id: "p1", point: shape.p1 },
{ id: "p2", point: shape.p2 }
];

}

if(
shape.type ===
"rectangle"
){

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

const p4 =
channelP4Point(
shape
);

if(
!p4
){
return [
{ id: "p1", point: shape.p1 },
{ id: "p2", point: shape.p2 },
{ id: "p3", point: shape.p3 }
];
}

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

const handleThreshold =
handleHitThreshold(
shape
);

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

if(
shape.type ===
"rectangle"
){

for(
const handle of
getRectangleHandleScreens(
shape,
toXY
)
){

const threshold =
handle.square
? handleHitThreshold(
shape
) *
0.95
: handleHitThreshold(
shape
);

if(
Math.hypot(
px - handle.x,
py - handle.y
) <=
threshold
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

if(shape.type === "trendline" || shape.type === "fib" || shape.type === "arrow"){

if(handleId === "p1"){
shape.p1 = { ...point };
}

if(handleId === "p2"){
shape.p2 = { ...point };
}

}

if(
shape.type ===
"rectangle"
){

const xy =
toXY(
point
);

if(
xy
){
moveRectangleHandle(
shape,
handleId,
xy.x,
xy.y,
pointFromXY,
toXY
);
}

return;

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
{ handleId }
);

return;

}

if(handleId === "entryR"){

shape.p2 = {
time: point.time,
price: entry
};

clampPositionPrices(
shape,
{ handleId }
);

return;

}

if(handleId === "tp"){

const entryNow =
positionEntryPrice(
shape
);

shape.tpPrice =
shape.type ===
"long"
? Math.max(
point.price,
entryNow *
1.0000001
)
: Math.min(
point.price,
entryNow *
0.9999999
);

clampPositionPrices(
shape,
{ handleId }
);

return;

}

if(handleId === "sl"){

const entryNow =
positionEntryPrice(
shape
);

shape.slPrice =
shape.type ===
"long"
? Math.min(
point.price,
entryNow *
0.9999999
)
: Math.max(
point.price,
entryNow *
1.0000001
);

clampPositionPrices(
shape,
{ handleId }
);

return;

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


const {
hrayLineDist,
hitTestHrayLine,
trendlineBodyDist,
hitTestTrendlineBody,
fibBodyDist,
hitTestFibBody,
channelP4Point,
channelScreenGeometry,
channelBodyDist,
hitTestChannelBody,
rectangleBodyDist,
hitTestRectangleBody
} =
createDrawHitTester({
toXY,
getPlotWidth,
series,
pointFromXY
});

const {
drawLine,
drawShape,
drawPlacementPreview
} =
createDrawRenderer({
toXY,
plotPriceToCoordinate,
series,
shapeStyle,
drawPosition,
baseDefaultStyle,
defaultPositionP2,
initialPositionTpSl,
pointFromXY,
drawAnchorCircle,
getPlacement:()=>placement,
getPreviewPoint:()=>previewPoint,
getPreviewXY:()=>previewXY,
getSelectedId:()=>selectedId,
parseDrawColor,
formatDrawColor
});

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
shape.type === "fib" ||
shape.type === "arrow"
){
return [shape.p1, shape.p2];
}

if(
shape.type ===
"rectangle"
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

/**
 * Shift во время drag тела объекта — движение только по времени (X) или цене (Y),
 * как в TradingView. Ось фиксируется в момент первого Shift от начала drag.
 */
function constrainBodyDragPointer(
dragState,
x,
y,
shiftKey
){

const startX =
dragState.startX;
const startY =
dragState.startY;

if(
startX == null ||
startY == null ||
!shiftKey
){
dragState.shiftAxisLock = null;
return {
x,
y
};
}

if(
!dragState.shiftAxisLock
){

const adx =
Math.abs(
x - startX
);
const ady =
Math.abs(
y - startY
);

dragState.shiftAxisLock =
adx >=
ady
? "x"
: "y";

}

if(
dragState.shiftAxisLock ===
"x"
){
return {
x,
y: startY
};
}

return {
x: startX,
y
};

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
{ preserveTpSl: true }
);

return true;

}

function hitTestShapeBody(px, py, shape, threshold = 8){

if(
shape.type === "trendline" ||
shape.type === "arrow"
){
return hitTestTrendlineBody(px, py, shape, threshold);
}

if(shape.type === "fib"){
return hitTestFibBody(px, py, shape, threshold);
}

if(shape.type === "channel"){
return hitTestChannelBody(px, py, shape, threshold);
}

if(shape.type === "rectangle"){
return hitTestRectangleBody(px, py, shape, threshold);
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
shape.type === "fib" ||
shape.type === "arrow"
){

shape.p1 = pts[0];
shape.p2 = pts[1];
return true;

}

if(
shape.type ===
"rectangle"
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
clampPositionPrices(
shape,
{ preserveTpSl: true }
);
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
target.closest(".tv-color-picker") ||
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
fibPortalHitTest(
e.clientX,
e.clientY
)
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

if(
e.pointerType === "mouse" &&
isPointerInPriceGutter(
x
)
){
return;
}

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
setAlertDragLivePrice(
sel.id,
alertPriceFromShape(
sel
)
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
startX: x,
startY: y,
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
setAlertDragLivePrice(
sel.id,
alertPriceFromShape(
sel
)
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

if(
sel.type ===
"hray" &&
sel.isAlert
){
suppressChartCrosshairForDrag();
}else{
beginEditDragCrosshair(
e,
x,
y
);
}

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
startX: x,
startY: y,
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

if(
sel.type ===
"hray" &&
sel.isAlert
){
suppressChartCrosshairForDrag();
}else{
beginEditDragCrosshair(
e,
x,
y
);
}

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

const shape =
drawings.find(d=>d.id === dragState.shapeId);

if(!shape){
return;
}

const isAlertHrayDrag =
shape.type ===
"hray" &&
shape.isAlert;

if(
isAlertHrayDrag
){

suppressChartCrosshairForDrag();

}else{
syncEditDragCrosshair(
e,
x,
y
);
}

if(dragState.mode === "position-move"){

const locked =
constrainBodyDragPointer(
dragState,
x,
y,
e.shiftKey
);

if(
!applyPositionBodyMove(
shape,
dragState.startX,
dragState.startY,
locked.x,
locked.y,
dragState.snapshot
)
){
return;
}

}else if(dragState.mode === "screen-move"){

const locked =
constrainBodyDragPointer(
dragState,
x,
y,
e.shiftKey
);

if(
!applyScreenMoveToShape(
shape,
dragState.pointOffsets,
locked.x,
locked.y
)
){
return;
}

if(
shape.type ===
"hray" &&
shape.isAlert
){

const live =
alertPriceFromShape(
shape
);

if(
Number.isFinite(
live
)
){
setAlertDragLivePrice(
shape.id,
live
);
}

}

}else{

const point = pointFromXY(x, y);

if(!point){
return;
}

moveHandle(shape, dragState.handleId, point);

if(
shape.type ===
"hray" &&
shape.isAlert
){

const live =
alertPriceFromShape(
shape
);

if(
Number.isFinite(
live
)
){
setAlertDragLivePrice(
shape.id,
live
);
}

}

}

scheduleDragRedraw();

};

const onEditUp = ()=>{

if(!alive || !dragState){
return;
}

if(
dragRedrawRaf
){
cancelAnimationFrame(
dragRedrawRaf
);
dragRedrawRaf = 0;
}

const draggedShape =
drawings.find(d=>d.id === dragState.shapeId);

if(
draggedShape
){

if(
isPositionType(
draggedShape.type
)
){

const preserveTpSl =
dragState.mode ===
"position-move" ||
dragState.mode ===
"screen-move";

clampPositionPrices(
draggedShape,
{
handleId:
dragState.mode ===
"handle"
? dragState.handleId
: null,
preserveTpSl
}
);

touchShapeRevision(
draggedShape
);

}

if(
draggedShape.type ===
"hray" &&
draggedShape.isAlert
){

const sym =
String(
getSymbol() ||
""
).trim().toUpperCase();

const level =
alertPriceFromShape(
draggedShape
);

if(
sym &&
Number.isFinite(
level
)
){

finalizeAlertPriceDrag(
sym,
draggedShape.id,
level,
draggedShape.alertTf ||
getTf()
);

}

setAlertDragPaused(
sym,
draggedShape.id,
false
);

clearAlertDragLivePrice(
draggedShape.id
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

return ()=>{
wrapEl.removeEventListener(
"pointerdown",
onEditDown,
true
);
window.removeEventListener("pointermove", onEditMove);
window.removeEventListener("pointerup", onEditUp);
window.removeEventListener("pointercancel", onEditUp);
};

}

/**
 * Смартфон: touchstart до LW — иначе pan начинается до pointerdown.
 */
function setupCoarseTouchChartGuard(){

if(
!isCoarseTouchViewport()
){
return ()=>{};
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

return ()=>{
wrapEl.removeEventListener(
"touchstart",
onTouchStart,
cap
);
wrapEl.removeEventListener(
"touchmove",
onTouchMove,
cap
);
};

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

if(
placement ||
tool !==
"cursor"
){

e.preventDefault();
e.stopPropagation();
setTool(
"cursor"
);
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

const onContextDocClick = e=>{

if(
!contextMenuEl.contains(e.target)
){
hideContextMenu();
}

};

const onContextDocKeydown = e=>{

if(e.key === "Escape"){
hideContextMenu();
}

};

document.addEventListener("click", onContextDocClick);
document.addEventListener("keydown", onContextDocKeydown);

const dispose = ()=>{
hideContextMenu();
document.removeEventListener("click", onContextDocClick);
document.removeEventListener("keydown", onContextDocKeydown);
};

return {
hide: hideContextMenu,
dispose
};

}

function drawSelectionHandles(ctx, shape){

if(shape.type === "trendline" || shape.type === "fib" || shape.type === "arrow"){

const a = toXY(shape.p1);
const b = toXY(shape.p2);

if(a){
drawAnchorCircle(ctx, a.x, a.y);
}

if(b){
drawAnchorCircle(ctx, b.x, b.y);
}

}

if(
shape.type ===
"rectangle"
){

getRectangleHandleScreens(
shape,
toXY
).forEach(
handle=>{

if(
handle.square
){
drawAnchorSquare(
ctx,
handle.x,
handle.y
);
}else{
drawAnchorCircle(
ctx,
handle.x,
handle.y
);
}

}
);

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

const geom =
channelScreenGeometry(
shape
);

if(
!geom
){
return;
}

drawAnchorCircle(
ctx,
geom.p1.x,
geom.p1.y
);

drawAnchorCircle(
ctx,
geom.p2.x,
geom.p2.y
);

drawAnchorCircle(
ctx,
geom.p3.x,
geom.p3.y
);

drawAnchorCircle(
ctx,
geom.p4.x,
geom.p4.y
);

drawAnchorSquare(
ctx,
geom.edgeMidA.x,
geom.edgeMidA.y
);

drawAnchorSquare(
ctx,
geom.edgeMidB.x,
geom.edgeMidB.y
);

}

if(isPositionType(shape.type)){

getPositionHandleScreens(shape).forEach(handle=>{
drawPositionAnchor(ctx, handle.x, handle.y);
});

}

}

function shapeCoordsReady(shape){

if(shape.type === "trendline" || shape.type === "fib" || shape.type === "arrow"){

return !!(
toXY(shape.p1) &&
toXY(shape.p2)
);

}

if(
shape.type ===
"rectangle"
){

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

function schedulePriceScaleSyncedRedraw(){

if(
!alive
){
return;
}

if(
priceScaleSyncPending
){
return;
}

priceScaleSyncPending =
true;

requestAnimationFrame(
()=>{
requestAnimationFrame(
()=>{
priceScaleSyncPending =
false;

if(
!alive
){
return;
}

redraw();

}
);
}
);

}

function ensureSeriesPriceToCoordinatePatch(){

if(
seriesPriceToCoordinateOrig
){
return;
}

seriesPriceToCoordinateOrig =
series.priceToCoordinate.bind(
series
);

series.priceToCoordinate =
function(
price
){

if(
priceScaleDragActive
){

if(
manualPriceScaleDrag
){
const y =
manualPriceToCoordinate(
price
);

if(
y !=
null
){
return y;
}
}

return null;

}

return seriesPriceToCoordinateOrig(
price
);

};

}

function restoreSeriesPriceToCoordinate(){

if(
!seriesPriceToCoordinateOrig
){
return;
}

series.priceToCoordinate =
seriesPriceToCoordinateOrig;
seriesPriceToCoordinateOrig =
null;

}

function applyLockedPriceRangeFromChart(
range
){

if(
!range ||
!Number.isFinite(
range.min
) ||
!Number.isFinite(
range.max
) ||
range.min ===
range.max
){
manualPriceScaleDrag =
null;

return false;
}

const m =
readChartScaleMargins();

manualPriceScaleDrag =
{
minPrice:range.min,
maxPrice:range.max,
top:m.top,
bottom:m.bottom,
h:chartSize().h,
inverted:
isPriceScaleInverted(),
logarithmic:
isSeriesLogarithmic(
series
)
};

return true;

}

function priceScaleDragPaintLoop(){

if(
!alive ||
!priceScaleDragActive
){
priceScalePaintRaf = 0;
return;
}

redraw();
priceScalePaintRaf =
requestAnimationFrame(
priceScaleDragPaintLoop
);

}

function startPriceScalePaintLoop(){

if(
priceScalePaintRaf
){
return;
}

priceScalePaintRaf =
requestAnimationFrame(
priceScaleDragPaintLoop
);

}

function stopPriceScalePaintLoop(){

if(
priceScalePaintRaf
){
cancelAnimationFrame(
priceScalePaintRaf
);
priceScalePaintRaf = 0;
}

}

function beginPriceScaleDragRedraw(
range
){

priceScaleDragActive = true;
ensureSeriesPriceToCoordinatePatch();
applyLockedPriceRangeFromChart(
range
);
redraw();
startPriceScalePaintLoop();

}

function applyPriceScaleFrame(
range
){

if(
!priceScaleDragActive
){
return;
}

applyLockedPriceRangeFromChart(
range
);
redraw();

}

function redrawDuringPriceScaleDrag(
range
){

applyPriceScaleFrame(
range
);

}

function endPriceScaleDragRedraw(){

manualPriceScaleDrag =
null;
priceScaleDragActive = false;
stopPriceScalePaintLoop();
restoreSeriesPriceToCoordinate();
schedulePriceScaleSyncedRedraw();

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

function scheduleDragRedraw(){

if(
chartPanActive
){
return;
}

if(
dragRedrawRaf
){
return;
}

dragRedrawRaf =
requestAnimationFrame(()=>{

dragRedrawRaf = 0;
redraw();

});

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

drawChartRulerOverlay(
ctx,
plotW,
h
);

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

function hitTest(px, py){

const threshold = 8;
let best = null;
let bestDist = threshold;

drawings.forEach(d=>{

let dist = Infinity;

if(
d.type === "trendline" ||
d.type === "arrow"
){

dist = trendlineBodyDist(px, py, d);

}

if(
d.type ===
"rectangle"
){

dist = rectangleBodyDist(
px,
py,
d,
toXY
);

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
getPlotWidth(),
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
ensureFibLevelsVisible(
style.fibLevels ||
cloneDefaultFibRows()
)
)
)
:undefined,
fibShowTrendLine:type === "fib"
? (
typeof style.fibShowTrendLine ===
"boolean"
? style.fibShowTrendLine
: false
)
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

if(placement.type === "arrow" && pts.length >= 2){
created = makeShape("arrow", { p1: pts[0], p2: pts[1] });
}

if(placement.type === "rectangle" && pts.length >= 2){
const rectStyle =
baseDefaultStyle("rectangle");
created = makeShape("rectangle", {
p1: pts[0],
p2: pts[1],
lineStyle: rectStyle.lineStyle,
showFill: rectStyle.showFill,
fillColor: rectStyle.fillColor,
fillOpacity: rectStyle.fillOpacity,
showMedian: rectStyle.showMedian,
medianColor: rectStyle.medianColor,
medianLineWidth: rectStyle.medianLineWidth,
medianLineStyle: rectStyle.medianLineStyle
});
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
placementPointerXY = null;
drawMagnetKeyDown = false;
lastCrosshairPlotXY = null;
cancelPlacementPreviewRaf();
resetPlacementCrosshairCache();
hideStandardChartCrosshair();
saveDrawings();
setTool("cursor");
updateStyleBar();
redraw();

}

function startPlacement(type){

placement = { type, points: [] };
previewPoint = null;
previewXY = null;
placementPointerXY = null;
cancelPlacementPreviewRaf();
resetPlacementCrosshairCache();
invalidateLastCandleRightXCache();

if(isTouchDrawPlacement()){
initTouchDrawCrosshair();
}

}

function cancelPlacement(){

placement = null;
previewPoint = null;
previewXY = null;
placementPointerXY = null;
drawMagnetKeyDown = false;
lastCrosshairPlotXY = null;
clearTouchDrawState();
blockChartClick = false;
cancelPlacementPreviewRaf();
resetPlacementCrosshairCache();
hideStandardChartCrosshair();
redraw();

}

function handleToolClick(param){

if(
tool !== "cursor" &&
isTouchDrawPlacement() &&
placement
){
return false;
}

const rawClickX =
placementPointerXY?.x ??
param.point?.x;
const rawClickY =
placementPointerXY?.y ??
param.point?.y;

const point =
isTouchDrawPlacement() &&
getTouchDrawCrosshair()
? pointFromXY(
getTouchDrawCrosshair().x,
getTouchDrawCrosshair().y
)
: rawClickX !=
null &&
rawClickY !=
null
? pointFromResolvedPlacementPlot(
resolvePlacementPlotXY(
rawClickX,
rawClickY,
param
)
)
: pointFromParam(param);

if(!point){
return false;
}

if(
handleChartRulerClick(
point,
param
)
){
return true;
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
return true;

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
}else{
redraw();
}

return true;

}

function setTool(next){

tool = next;
cancelPlacement();

if(
next !==
"cursor"
){
clearChartRuler();
notifyTabletChartGestureAbort();
startPlacement(
next
);
}else{
notifyTabletChartGestureAbort();
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

tabletDrawInput =
mountTabletDrawInput({
wrapEl,
chart,
series,
chartSize,
pointFromXY,
pointerFromEvent,
isDrawChromePointerEvent,
getPlacement:()=>placement,
getTool:()=>tool,
finishPlacement,
redraw,
setBlockChartClick:v=>{
blockChartClick = v;
},
setPreviewPoint:v=>{
previewPoint = v;
},
setPreviewXY:v=>{
previewXY = v;
},
onChartCrosshairAt,
onChartCrosshairClear,
onChartCrosshairSuppress,
onChartCrosshairRelease,
tabletCustomPanHooked,
getDragState:()=>dragState
});

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

void flushDrawingsCloudPush().catch(err=>{
console.warn(
"delete drawing cloud:",
err?.message || err
);
});

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
tool ===
"cursor" &&
chartRulerStart &&
param?.point
){

syncChartRulerEndFromPlot(
param.point.x,
param.point.y
);

return;

}

if(
placement &&
param?.point
){

if(
!isTouchDrawPlacement()
){

const rawX =
placementPointerXY?.x ??
param.point.x;

const rawY =
placementPointerXY?.y ??
param.point.y;

syncDesktopDrawPlacementPreview(
rawX,
rawY,
param
);

return;

}

if(
getTouchDrawCrosshair()
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
invalidateLastCandleRightXCache();
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

const priceScale =
chart.priceScale(
"right"
);
const origPriceScaleApplyOptions =
priceScale.applyOptions.bind(
priceScale
);

priceScaleApplyPatchRestore =
()=>{
priceScale.applyOptions =
origPriceScaleApplyOptions;
priceScaleApplyPatchRestore = null;
};

priceScale.applyOptions =
function(opts){

origPriceScaleApplyOptions(
opts
);

if(
!alive ||
priceScaleDragActive
){
return;
}

scheduleRedraw();

};

chart.subscribeClick(clickHandler);
chart.subscribeCrosshairMove(crosshairHandler);
chart.timeScale().subscribeVisibleLogicalRangeChange(rangeHandler);

const onKeyDown = e=>{

if(!alive || !isActive()){
return;
}

if(e.key === "Escape"){

if(
chartRulerStart
){
clearChartRuler();
redraw();
return;

}

if(isFibSettingsOpen()){

closeAllFibLineStyleMenus();
closeAllFibLineWidthMenus();
closeFibColorMenu();
closePopovers();
return;

}

if(
placement ||
tool !==
"cursor"
){
setTool(
"cursor"
);
return;

}

}

if(
e.key ===
"Shift"
){

chartRulerShiftDown = true;
return;

}

if(
e.key ===
"Meta"
){

if(
!drawMagnetKeyDown
){
drawMagnetKeyDown = true;
refreshPlacementPreviewFromPointer(
e
);
}

return;

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

window.addEventListener("keydown", onKeyDown, true);

const onKeyUp = e=>{

if(
!alive ||
!isActive()
){
return;
}

if(
e.key ===
"Shift"
){
chartRulerShiftDown = false;

if(
chartRulerStart
){
clearChartRuler();
redraw();
}

return;
}

if(
e.key !==
"Meta"
){
return;
}

if(
!drawMagnetKeyDown
){
return;
}

drawMagnetKeyDown = false;
refreshPlacementPreviewFromPointer(
e
);

};

window.addEventListener("keyup", onKeyUp, true);

const onWindowBlur = ()=>{

if(
drawMagnetKeyDown
){
drawMagnetKeyDown = false;

if(
placement &&
placementPointerXY
){
refreshPlacementPreviewFromPointer();
}

}

chartRulerShiftDown = false;

if(
chartRulerStart
){
clearChartRuler();
redraw();
}

};

window.addEventListener("blur", onWindowBlur);

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

mountTvColorPicker(
colorPopover,
{
activeColor: activeColor || STROKE,
onChange: color=>{

updateColorStripe(color);
applyStyleFromUI("color");

},
onSelect: color=>{

updateColorStripe(color);
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

const fibCtx =
isFibContext();
const rectCtx =
isRectContext();

if(
!fibCtx &&
!rectCtx
){
return;
}

const open =
settingsPopover?.classList.contains("hidden");

closePopovers();

if(open){

if(
rectCtx
){

rectSettingsShapeId =
getSelected()?.id ||
null;

const rectShape =
getRectEditShape();

fillRectSettingsPanel(
rectShape ||
baseDefaultStyle(
"rectangle"
)
);

}else{

rememberFibSettingsTarget();

const fibShape =
getFibEditShape();

if(
fibShape
){
fillFibSettingsPanel(
getFibRows(
fibShape
),
fibShape.fibShowTrendLine,
fibShape.color,
fibShape.lineWidth
);
}else{

const style =
baseDefaultStyle(
"fib"
);

fillFibSettingsPanel(
style.fibLevels,
style.fibShowTrendLine,
style.color,
style.lineWidth
);

}

}

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

positionRiskInput?.addEventListener(
"change",
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
return ()=>{};
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

if(
!isFibSettingsOpen() &&
!isRectSettingsOpen()
){
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
e.target.closest(".fib-level-color-menu") ||
e.target.closest(".tv-color-picker")
){
return;
}

closePopovers();

};

window.addEventListener("pointermove", onBarMove);
window.addEventListener("pointerup", onBarUp);
window.addEventListener("pointercancel", onBarUp);
document.addEventListener("click", onDocClick);

return ()=>{
window.removeEventListener("pointermove", onBarMove);
window.removeEventListener("pointerup", onBarUp);
window.removeEventListener("pointercancel", onBarUp);
document.removeEventListener("click", onDocClick);
};

}

function syncPopoversPosition(){

positionPopover(colorPopover, 40);
positionPopover(widthPopover, 40);
positionPopover(settingsPopover, 40);

}

initStylePopovers();
if(
!useChartProbeCrosshair()
){
ensureDomChartCrosshair(
wrapEl
);
}

const teardownFloatingBar =
initFloatingBar();

const teardownEditInteraction =
setupEditInteraction();

const teardownCoarseTouchGuard =
setupCoarseTouchChartGuard();

const teardownTouchDrawCrosshair =
()=>tabletDrawInput?.dispose?.();

const teardownFinePointerClicks =
setupFinePointerChartClicks();

const teardownPlacementPreview =
setupPlacementPointerPreview();

const teardownChartPanRedraw =
setupChartPanRedraw();

const contextMenuCtrl =
setupContextMenu();

const hideContextMenu =
contextMenuCtrl.hide;

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

if(
e.detail?.local
){
touchStorageSnap();
scheduleRedraw();
return;

}

if(
placement &&
!e.detail?.remote &&
!e.detail?.cleared
){
touchStorageSnap();
scheduleRedraw();
return;

}

if(
!isActive() &&
!e.detail?.remote
){
return;
}

if(
shouldDeferExternalDrawingsSync()
){
fibSettingsSyncDeferred = true;
return;
}

loadDrawings();
reconcileDrawingAlertsFromRegistry();
scheduleRedraw();
updateStyleBar();
touchStorageSnap();

};

function touchStorageSnap(){

touchDrawingsStorageSnap(
storageKey()
);

}

function syncDrawingsFromStorageIfChanged(){

if(
!alive ||
!canUseDrawings()
){
return;
}

if(
shouldDeferExternalDrawingsSync()
){
fibSettingsSyncDeferred = true;
return;
}

applyRemoteDrawingsToChart(
[
getSymbol()
]
);

}

function startCoordRetryBurst(){

let tries =
0;

const tick =
()=>{

if(
!alive ||
tries >
48
){
return;
}

tries += 1;
redraw();

if(
drawings.some(
d=>!shapeCoordsReady(
d
)
)
){
requestAnimationFrame(
tick
);
}

};

requestAnimationFrame(
tick
);

}

function applyRemoteDrawingsToChart(
symbols
){

if(
!alive
){
return;
}

if(
shouldDeferExternalDrawingsSync()
){
fibSettingsSyncDeferred = true;
return;
}

const sym =
String(
getSymbol() ||
""
).trim().toUpperCase();

if(
symbols !=
null &&
Array.isArray(
symbols
)
){

const list =
symbols.map(
s=>
String(
s ||
""
).trim().toUpperCase()
).filter(
Boolean
);

if(
list.length &&
!list.includes(
sym
)
){
return;
}

}

resizeCanvas();
loadDrawings();
reconcileDrawingAlertsFromRegistry();
scheduleRedraw();
updateStyleBar();
touchStorageSnap();
startCoordRetryBurst();

}

function syncDrawingsFromStorageNow(){

applyRemoteDrawingsToChart(
[
getSymbol()
]
);

}

const refreshDrawingsOnTabWake = ()=>{

if(
!alive
){
return;
}

void import(
"../drawings-cloud-sync.js?v=42"
).then(
m=>{
m.bumpDrawingsPullNow?.();
return m.pullDrawingsFromCloudNow();
}
).catch(
()=>{}
).finally(
()=>{
applyRemoteDrawingsToChart(
null
);
}
);

};

const onVisibilityChange = ()=>{

if(
document.visibilityState ===
"visible"
){
refreshDrawingsOnTabWake();
}else{
touchStorageSnap();
}

};

const onDrawingsCloudChanged = e=>{

if(
!alive
){
return;
}

applyRemoteDrawingsToChart(
e.detail?.symbols
);

};

window.addEventListener(
"drawings-cloud-changed",
onDrawingsCloudChanged
);

const onChartCandlesLoaded = e=>{

if(
!alive
){
return;
}

const sym =
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
sym
){
return;
}

applyRemoteDrawingsToChart(
null
);

};

window.addEventListener(
"chart-candles-loaded",
onChartCandlesLoaded
);

document.addEventListener(
"visibilitychange",
onVisibilityChange
);

window.addEventListener(
"focus",
refreshDrawingsOnTabWake
);

const unregisterStoragePoller =
registerDrawingsStoragePoller({
getKey: storageKey,
shouldRun: ()=>
alive &&
canUseDrawings(),
onChanged: syncDrawingsFromStorageIfChanged
});

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

const unregisterDrawingsChartRefresh =
registerDrawingsChartRefresh(
applyRemoteDrawingsToChart
);

touchStorageSnap();

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

const onPageHide = ()=>{

if(!alive){
return;
}

persistDrawingsForSymbol(
getSymbol()
);
void flushDrawingsCloudPush();

};

window.addEventListener(
"pagehide",
onPageHide
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
scheduleDragRedraw,
schedulePriceScaleSyncedRedraw,
beginPriceScaleDragRedraw,
applyPriceScaleFrame,
endPriceScaleDragRedraw,

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
!isActive()
){
return false;
}

if(
dragState ||
getTouchPlaceTrack() ||
placement ||
tool !==
"cursor"
){
return true;
}

if(
!isTouchDrawTablet() &&
!(
hasAnyFinePointer() &&
isTabletChartViewport()
)
){
return false;
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

const sel =
getSelected();

if(
sel &&
(
hitTestHandle(
x,
y,
sel
) ||
hitTestShapeBody(
x,
y,
sel
)
)
){
return true;
}

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
  Не пишем текущий массив drawings в ключ старой монеты: пока грузятся свечи,
  getSymbol() уже новый, а в памяти могут быть фигуры новой монеты — так появлялся
  лишний BTCUSDT в Supabase с тем же shape_id, что и PHAROSUSDT.
  Каждая монета сохраняется через saveDrawings() в свой ключ при редактировании.
*/

lastLoadedSymbol = next;

loadDrawings();
reconcileDrawingAlertsFromRegistry();
selectedId = null;
cancelPlacement();
clearChartRuler();

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
setFibPanelCommitHook(null);

hideContextMenu?.();
contextMenuEl?.remove();

teardownFloatingBar?.();
teardownEditInteraction?.();
teardownCoarseTouchGuard?.();
teardownTouchDrawCrosshair?.();
teardownFinePointerClicks?.();
teardownPlacementPreview?.();
contextMenuCtrl?.dispose?.();

window.removeEventListener("keydown", onKeyDown, true);
window.removeEventListener("keyup", onKeyUp, true);
window.removeEventListener("blur", onWindowBlur);
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
"drawings-cloud-changed",
onDrawingsCloudChanged
);

document.removeEventListener(
"visibilitychange",
onVisibilityChange
);

window.removeEventListener(
"focus",
refreshDrawingsOnTabWake
);

unregisterStoragePoller?.();

window.removeEventListener(
"alerts-changed",
onAlertsChanged
);

window.removeEventListener(
"alerts-registry-pulled",
onAlertsRegistryPulled
);

window.removeEventListener(
"draw-tools-access-changed",
onCloudAuthChange
);

window.removeEventListener(
"pagehide",
onPageHide
);

unsubscribeCloudAuthChange?.();

unregisterDrawingsChartRefresh?.();

window.removeEventListener(
"chart-candles-loaded",
onChartCandlesLoaded
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
endPriceScaleDragRedraw();

if(
priceScaleApplyPatchRestore
){
priceScaleApplyPatchRestore();
}

chart.unsubscribeClick(clickHandler);
chart.unsubscribeCrosshairMove(crosshairHandler);
chart.timeScale().unsubscribeVisibleLogicalRangeChange(rangeHandler);

if(chartApplyPatchRestore){

chartApplyPatchRestore();

}

fibColorMenuPortal?.remove();
fibColorMenuPortal = null;

releaseFibPortals();

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

chartRulerLabelEl?.remove();
chartRulerLabelEl = null;

}

};

}
