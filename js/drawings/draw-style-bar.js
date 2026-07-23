/**
 * Style bar, fib/rect settings panels, color/width popovers.
 * Phase 4 split from drawings/init.js.
 */
import {
mountTvColorPicker,
parseDrawColor,
formatDrawColor
} from "../draw-color-palette.js?v=6";

import {
isCoarseTouchViewport
} from "../chart-import.js?v=43";

import {
STROKE,
DEFAULT_FIB_SPEC,
FIB_TOOL_DEFAULTS_VERSION,
RECT_DEFAULT_FILL_COLOR,
RECT_DEFAULT_FILL_OPACITY,
RECT_TOOL_DEFAULTS_VERSION
} from "./constants.js?v=10";

import {
normalizeFibLineStyle,
normalizeFibLevelColor,
normalizeFibLevelWidth,
cloneDefaultFibRows,
migrateFibToolDefaults,
ensureFibLevelsVisible,
normalizeFibLevelsShape,
formatFibInputValue,
parseFibRatioField,
getFibRows,
setFibLineStyleButton,
setFibLevelWidthButton
} from "./fib-spec.js?v=13";

import {
setFibPanelCommitHook,
closeAllFibLineStyleMenus,
openFibLineStyleMenu,
closeAllFibLineWidthMenus,
openFibLineWidthMenu,
isFibLineStyleMenuOpenForAnchor,
isFibLineWidthMenuOpenForAnchor
} from "./fib-portals.js?v=3";

import {
isPositionType,
positionEntryPrice
} from "./position.js?v=6";

import {
parseMoneyInput,
calcPositionVolumeUsd
} from "../position-sizing.js?v=3";

import {
applyPositionVolumeFromDrawing
} from "../trade-volume-presets.js?v=11";

import {
touchShapeRevision
} from "../drawings-storage.js?v=7";

import {
applyStyleSnapshotToShape,
buildFactoryDefaultSnapshot,
extractStyleSnapshot,
isTemplateEligibleType,
listTemplatesForType,
mergeStyleSnapshot,
saveNamedTemplate,
deleteTemplateAtIndex
} from "./draw-templates.js?v=8";

export function createDrawStyleBar(
deps
){

const {
getAlive,
isActive,
getTool,
getSelectedId,
setSelectedId,
getSelected,
getPlacement,
getDrawings,
wrapEl,
barPosKey,
styleBar,
colorBtn,
colorStripe,
colorPopover,
widthBtn,
widthLabel,
widthPreview,
widthPopover,
settingsPopover,
settingsBtn,
deleteOneBtn,
positionRiskWrap,
positionRiskInput,
dragHandle,
templateBtn,
templateMenu,
syncChartTouchPan,
saveDrawings,
redraw,
saveToolDefaults,
saveGlobalStyle,
baseDefaultStyle,
loadUserPrefs,
saveUserPrefs,
getToolDefaults,
touchShapeRevision: touchShapeRevisionDep,
deleteSelected,
flushDeferredFibSettingsSync,
getDesktopEdit,
getSymbol,
getStyleDelegate = null
} =
deps;

function styleCtx(){

const delegate =
getStyleDelegate?.();

if(
!delegate
){
return {
getTool,
getSelectedId,
getSelected,
getPlacement,
getDrawings,
saveDrawings,
redraw,
saveToolDefaults,
saveGlobalStyle,
baseDefaultStyle,
getDesktopEdit,
deleteSelected
};
}

return {
getTool:
delegate.getTool ||
getTool,
getSelectedId:
delegate.getSelectedId ||
getSelectedId,
getSelected:
delegate.getSelected ||
getSelected,
getPlacement:
delegate.getPlacement ||
getPlacement,
getDrawings:
delegate.getDrawings ||
getDrawings,
saveDrawings:
delegate.saveDrawings ||
saveDrawings,
redraw:
delegate.redraw ||
redraw,
saveToolDefaults:
delegate.saveToolDefaults ||
saveToolDefaults,
saveGlobalStyle:
delegate.saveGlobalStyle ||
saveGlobalStyle,
baseDefaultStyle:
delegate.baseDefaultStyle ||
baseDefaultStyle,
getDesktopEdit:
delegate.getDesktopEdit ||
getDesktopEdit,
deleteSelected:
delegate.deleteSelected ||
deleteSelected
};

}

function isStyleBarContextActive(){

return (
isActive() ||
!!getStyleDelegate?.()
);

}

function isTradeDesktopApp(){

return (
typeof document !==
"undefined" &&
document.body.classList.contains(
"trade-page"
) &&
!!globalThis.window?.cryptoTerminalDesktop?.isDesktop
);

}

const touchShapeRevisionFn =
touchShapeRevisionDep ||
touchShapeRevision;

let fibPanelBuilt = false;
let fibPanelSyncing = false;
let fibApplyTimer = null;
let fibSettingsShapeId = null;
let fibColorMenuPortal = null;
let fibColorMenuAnchor = null;
let rectPanelBuilt = false;
let rectPanelSyncing = false;
let rectSettingsShapeId = null;
let settingsPanelAbort = null;
let activeColor = STROKE;
let chromePortal = null;
let barOffset = { x: 8, y: 8 };
let chromeLayoutObserver = null;
let positionRiskEditing =
false;
let positionRiskShapeId =
null;
let positionApplyBtn =
null;
let templateSaveModal =
null;
let templateNameInput =
null;

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
settingsPopover,
templateMenu,
templateSaveModal
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
function getFibEditShape(){

if(fibSettingsShapeId){

const pinned =
getDrawings().find(
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
getDrawings().filter(d=>d.type === "fib");

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

return getTool() ===
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

return getTool() ===
"rectangle";

}

function resetSettingsPanelListeners(){

settingsPanelAbort?.abort();
settingsPanelAbort =
new AbortController();

return settingsPanelAbort.signal;

}

function settingsPopoverHasPanel(
kind
){

if(
!settingsPopover
){
return false;
}

return !!settingsPopover.querySelector(
kind ===
"fib"
? ".fib-settings"
: ".rect-settings"
);

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
getDrawings().find(
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
!settingsPopover
){
return;
}

if(
rectPanelBuilt &&
settingsPopoverHasPanel(
"rect"
)
){
return;
}

rectPanelBuilt = true;
fibPanelBuilt = false;

const signal =
resetSettingsPanelListeners();

settingsPopover.innerHTML =
`
<div class="rect-settings">
<label class="rect-settings-row">
<span class="rect-settings-label">Border</span>
<button type="button" class="rect-border-color-btn" title="Цвет линии" aria-label="Цвет линии"></button>
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
const borderColorBtn =
settingsPopover.querySelector(
".rect-border-color-btn"
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
!getAlive()
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
".rect-border-color-btn, .rect-median-color-btn, .rect-fill-color-btn"
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
const isBorder =
colorBtn.classList.contains(
"rect-border-color-btn"
);
const fallback =
isFill
? (
shape?.fillColor ||
shape?.color ||
STROKE
)
: isBorder
? (
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
{
capture:true,
signal
}
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

},
{
signal
}
);

[
borderStyleBtn,
borderColorBtn,
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
},
{
signal
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
const borderColorBtn =
settingsPopover.querySelector(
".rect-border-color-btn"
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
borderColorBtn
){
borderColorBtn.style.setProperty(
"--rect-swatch",
shape?.color ||
STROKE
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
const borderColorBtn =
settingsPopover.querySelector(
".rect-border-color-btn"
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
color:
borderColorBtn?.style.getPropertyValue(
"--rect-swatch"
)?.trim() ||
STROKE,
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
getAlive() &&
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
shape.color =
panel.color;
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

touchShapeRevisionFn(
shape
);
saveDrawings();
redraw();

}

saveToolDefaults(
"rectangle",
{
...getToolDefaults().rectangle,
...panel,
rectDefaultsVersion:
RECT_TOOL_DEFAULTS_VERSION,
lineWidth:
shape?.lineWidth ||
1
}
);

}

function canApplyFibPanel(){

return (
getAlive() &&
isFibSettingsOpen() &&
!fibPanelSyncing
);

}

function readFibDefaultsForStyle(){

const fibStore =
migrateFibToolDefaults(
getToolDefaults().fib
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

const {
getTool: toolForStyle,
getSelected: selectedForStyle
} =
styleCtx();

const sel =
selectedForStyle();

if(sel){
return sel.type;
}
if(
toolForStyle() !==
"cursor"
){
return toolForStyle();
}
return null;
}

function ensureFibSettingsPanel(){

if(
!settingsPopover
){
return;
}

if(
fibPanelBuilt &&
settingsPopoverHasPanel(
"fib"
)
){
return;
}

fibPanelBuilt = true;
rectPanelBuilt = false;

const signal =
resetSettingsPanelListeners();

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
<label class="fib-level-bg-label" title="Включить фон">
<input type="checkbox" class="fib-level-bg" aria-label="Включить фон"/>
</label>
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

if(!getAlive()){
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

},
{
capture:true,
signal
}
);

settingsPopover.addEventListener("change", e=>{

if(!canApplyFibPanel()){
return;
}

if(
e.target?.id === "fib-show-trend-line" ||
e.target?.classList.contains("fib-level-on") ||
e.target?.classList.contains("fib-level-bg")
){
scheduleFibApplyImmediate();
}

},
{
signal
}
);

settingsPopover.addEventListener("input", e=>{

if(!canApplyFibPanel()){
return;
}

if(
e.target?.classList.contains("fib-level-val")
){
scheduleFibApplyDebounced();
}

},
{
signal
}
);

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
!getAlive() ||
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

touchShapeRevisionFn(
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

const isFill =
anchorBtn.classList.contains(
"rect-fill-color-btn"
);

const active =
anchorBtn.style.getPropertyValue(
"--rect-swatch"
)?.trim() ||
fallbackColor ||
STROKE;

const activeOpacity =
isFill &&
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
: isFill
? Math.round(
RECT_DEFAULT_FILL_OPACITY *
100
)
: 100;

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
const bgChk =
row.querySelector(".fib-level-bg");
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

template[i].fillBg =
!!bgChk?.checked;

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
levels[i].fillBg = !!pr.fillBg;
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
fillBg: !!row.fillBg,
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
const bg =
wrap.querySelector(".fib-level-bg");
const val =
wrap.querySelector(".fib-level-val");
const colorBtn =
wrap.querySelector(".fib-level-color-btn");

if(on){
on.checked = !!row.enabled;
}

if(bg){
bg.checked = !!row.fillBg;
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
getTool() === "fib"
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

function resolvePositionRiskTarget(){

const sel =
getSelected();

if(
sel &&
isPositionType(
sel.type
)
){
return sel;
}

if(
positionRiskShapeId
){

const pinned =
getDrawings().find(
d=>
d.id ===
positionRiskShapeId &&
isPositionType(
d.type
)
);

if(
pinned
){
return pinned;
}

}

return null;

}

function getPositionEntryVolumeUsd(
shape
){

if(
!shape ||
!isPositionType(
shape.type
)
){
return null;
}

const entry =
positionEntryPrice(
shape
);

if(
!Number.isFinite(entry) ||
entry <= 0
){
return null;
}

const slPrice =
Number(shape.slPrice);

if(
!Number.isFinite(slPrice)
){
return null;
}

const slPct =
Math.abs(
slPrice - entry
) / entry * 100;

if(
!Number.isFinite(slPct) ||
slPct <= 0
){
return null;
}

const riskUsd =
parseMoneyInput(
shape.riskUsd
);

if(
riskUsd == null
){
return null;
}

return calcPositionVolumeUsd(
riskUsd,
slPct
);

}

function applyPositionRiskUsd(){

const parsed =
parseMoneyInput(
positionRiskInput?.value ?? ""
);

const sel =
resolvePositionRiskTarget();
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

touchShapeRevisionFn(
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

function submitPositionVolumeApply(){

if(
!isTradeDesktopApp()
){
return;
}

applyPositionRiskUsd();

const shape =
resolvePositionRiskTarget();
const volumeUsdt =
getPositionEntryVolumeUsd(
shape
);

if(
!Number.isFinite(volumeUsdt) ||
volumeUsdt <= 0
){
window.alert(
"Не удалось применить объём: укажите стоп-лосс ($) и проверьте границы позиции."
);
return;
}

const symbol =
String(
getSymbol?.() ||
""
).replace(
/\.P$/i,
""
).trim().toUpperCase();

applyPositionVolumeFromDrawing(
{
symbol,
volumeUsdt
}
);

window.dispatchEvent(
new CustomEvent(
"trade-apply-position-volume",
{
detail:{
volumeUsdt,
symbol
}
}
)
);

}

function isUnrelatedFormFieldFocused(
active
){

if(
!active
){
return false;
}

const tag =
active.tagName?.toLowerCase();

if(
tag ===
"textarea" ||
tag ===
"select"
){
return true;
}

if(
tag ===
"input"
){

const inputEl =
positionRiskInput ||
positionRiskWrap?.querySelector(
".draw-position-risk-input"
);

if(
active ===
inputEl ||
positionRiskWrap?.contains(
active
)
){
return false;
}

return true;
}

if(
active.isContentEditable
){
return true;
}

return false;

}

function isPositionApplyEnterHotkey(
event
){

if(
event.key !==
"Enter" &&
event.code !==
"Enter" &&
event.code !==
"NumpadEnter"
){
return false;
}

if(
!isTradeDesktopApp()
){
return false;
}

if(
positionRiskWrap?.classList.contains(
"hidden"
)
){
return false;
}

if(
positionApplyBtn?.classList.contains(
"hidden"
)
){
return false;
}

const sel =
getSelected();

if(
!sel ||
!isPositionType(
sel.type
)
){
return false;
}

if(
isUnrelatedFormFieldFocused(
document.activeElement
)
){
return false;
}

return true;

}

function onPositionApplyEnterHotkey(
event
){

if(
!isPositionApplyEnterHotkey(
event
)
){
return;
}

event.preventDefault();
event.stopPropagation();

submitPositionVolumeApply();

const inputEl =
positionRiskInput ||
positionRiskWrap?.querySelector(
".draw-position-risk-input"
);
const active =
document.activeElement;

if(
inputEl &&
(
active ===
inputEl ||
positionRiskWrap?.contains(
active
)
)
){
inputEl.blur();
}

}

function isPositionRiskInputFocused(){

return (
positionRiskEditing ||
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
style.color;

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

templateBtn?.classList.toggle(
"hidden",
isPosToolbar ||
!isTemplateEligibleType(
type
)
);

colorBtn?.classList.toggle(
"hidden",
isPosToolbar ||
type ===
"rectangle" ||
type ===
"fib"
);

widthBtn?.classList.toggle(
"hidden",
isPosToolbar ||
isArrowTool
);

positionRiskWrap?.classList.toggle(
"hidden",
!isPosToolbar
);
positionApplyBtn?.classList.toggle(
"hidden",
!isPosToolbar ||
!isTradeDesktopApp()
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
getToolDefaults()[type]?.riskUsd;

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
function updateStyleBar(){

syncChartTouchPan();

if(!styleBar){
return;
}

const {
getTool: toolForStyle,
getSelectedId: selectedIdForStyle,
getSelected: selectedForStyle,
baseDefaultStyle: defaultStyleFor
} =
styleCtx();

const pinnedSelection =
styleCtx().getDesktopEdit?.()?.isDrawingSelectionPinned?.() ??
false;
const touchChartSelect =
isCoarseTouchViewport();
const delegatedStyleBar =
!!getStyleDelegate?.();

const show =
toolForStyle() !==
"cursor" ||
(
!!selectedIdForStyle() &&
(
pinnedSelection ||
touchChartSelect ||
delegatedStyleBar
)
);

styleBar.classList.toggle("hidden", !show);

if(show){
syncDrawChromeLayout();
}

if(deleteOneBtn){
deleteOneBtn.style.display =
selectedIdForStyle() ? "inline-flex" : "none";
}

if(!show){
closePopovers();
return;
}

const sel =
selectedForStyle();
const type =
getStyleTargetType();

if(sel){
fillStyleUI(sel, sel.type);
return;
}

if(
toolForStyle() !==
"cursor"
){
fillStyleUI(
defaultStyleFor(
toolForStyle()
),
toolForStyle()
);
}

}

function applyStyleFromUI(scope){

const {
getSelected: selectedForStyle,
getPlacement: placementForStyle,
saveDrawings: saveDrawingsForStyle,
redraw: redrawForStyle,
saveToolDefaults: saveToolDefaultsForStyle,
saveGlobalStyle: saveGlobalStyleForStyle
} =
styleCtx();

const style = readStyleFromUI();
const type = getStyleTargetType();

if(!type){
return;
}

const sel =
selectedForStyle();

const fibTarget =
type === "fib" &&
!placementForStyle()
? resolveFibStyleTarget()
: null;

const target =
fibTarget || (
!placementForStyle()
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

touchShapeRevisionFn(
target
);

saveDrawingsForStyle();
redrawForStyle();

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

saveToolDefaultsForStyle(
type,
defaultsPayload
);

saveGlobalStyleForStyle({
color: style.color,
lineWidth: style.lineWidth
});

}

function captureCurrentStyleSnapshot(){

const type =
getStyleTargetType();

if(
!isTemplateEligibleType(
type
)
){
return null;
}

const sel =
getSelected();
const widthActive =
widthPopover?.querySelector(
".width-option.active"
);

let snapshot =
extractStyleSnapshot(
sel ||
{
color:
activeColor ||
STROKE,
lineWidth: Number(
widthActive?.dataset.width ||
1
)
},
type
);

const ui =
readStyleFromUI();

snapshot = mergeStyleSnapshot(
{
...snapshot,
...ui
},
type
);

if(
type ===
"rectangle" &&
isRectSettingsOpen()
){

Object.assign(
snapshot,
readRectPanelFromDOM()
);

snapshot =
mergeStyleSnapshot(
snapshot,
type
);

}

if(
type ===
"fib" &&
isFibSettingsOpen()
){

Object.assign(
snapshot,
readFibPanelFromDOM()
);

snapshot =
mergeStyleSnapshot(
snapshot,
type
);

}

return snapshot;

}

function persistStyleSnapshotToTarget(
snapshot,
{
updateToolDefaults = true
} = {}
){

const type =
getStyleTargetType();

if(
!type ||
!snapshot
){
return;
}

const sel =
getSelected();
const target =
!getPlacement()
? sel
: null;

if(
target &&
isTemplateEligibleType(
target.type
)
){

applyStyleSnapshotToShape(
target,
snapshot
);

touchShapeRevisionFn(
target
);
saveDrawings();

}

if(
updateToolDefaults &&
isTemplateEligibleType(
type
)
){

const defaultsPayload =
{
...snapshot
};

if(
type ===
"arrow"
){
delete defaultsPayload.lineWidth;
}

if(
type ===
"fib" &&
snapshot.fibLevels
){
defaultsPayload.fibDefaultsVersion =
FIB_TOOL_DEFAULTS_VERSION;
}

saveToolDefaults(
type,
defaultsPayload
);

if(
snapshot.color
){
saveGlobalStyle({
color: snapshot.color,
lineWidth:
snapshot.lineWidth ??
1
});
}

}

fillStyleUI(
snapshot,
type
);

if(
type ===
"fib" &&
isFibSettingsOpen()
){

fillFibSettingsPanel(
getFibRows({
fibLevels:
snapshot.fibLevels
}),
snapshot.fibShowTrendLine,
snapshot.color,
snapshot.lineWidth
);

}

if(
type ===
"rectangle" &&
isRectSettingsOpen()
){

fillRectSettingsPanel({
...snapshot,
color:
snapshot.color,
lineWidth:
snapshot.lineWidth
});

}

redraw();

}

function applyDefaultStyleToTarget(){

const type =
getStyleTargetType();

if(
!isTemplateEligibleType(
type
)
){
return;
}

const snapshot =
buildFactoryDefaultSnapshot(
type
);

if(
!snapshot
){
return;
}

persistStyleSnapshotToTarget(
snapshot
);

}

function applyNamedTemplate(
idx
){

const type =
getStyleTargetType();
const list =
listTemplatesForType(
type
);
const entry =
list[
Number(
idx
)
];

if(
!entry
){
return;
}

persistStyleSnapshotToTarget(
mergeStyleSnapshot(
entry.data,
type
)
);

}

function refreshTemplateMenu(){

if(
!templateMenu
){
return;
}

const type =
getStyleTargetType();
const saved =
listTemplatesForType(
type
);

templateMenu.innerHTML =
`
<button type="button" class="draw-template-menu-item" data-action="save" role="menuitem">Save Template</button>
<button type="button" class="draw-template-menu-item" data-action="apply-default" role="menuitem">Apply Default</button>
${
saved.length
? `<div class="draw-template-menu-sep" role="separator"></div>${saved.map((item,idx)=>`
<div class="draw-template-menu-row" role="none">
<button type="button" class="draw-template-menu-item draw-template-menu-item--saved" data-action="apply-template" data-template-idx="${idx}" role="menuitem">${escapeTemplateMenuName(item.name)}</button>
${
item.builtin
? ""
: `<button type="button" class="draw-template-menu-delete" data-action="delete-template" data-template-idx="${idx}" title="Удалить" aria-label="Удалить">×</button>`
}
</div>`).join("")}`
: ""
}
`;

}

function escapeTemplateMenuName(
name
){

return String(
name || ""
).replace(
/&/g,
"&amp;"
).replace(
/</g,
"&lt;"
).replace(
/>/g,
"&gt;"
).replace(
/"/g,
"&quot;"
);

}

function closeTemplateMenu(){

templateMenu?.classList.add(
"hidden"
);

templateBtn?.setAttribute(
"aria-expanded",
"false"
);

}

function openTemplateMenu(){

if(
!templateMenu ||
!styleBar
){
return;
}

refreshTemplateMenu();
closePopovers({
keepTemplateMenu: true
});

positionPopover(
templateMenu,
40
);
templateMenu.classList.remove(
"hidden"
);
templateBtn?.setAttribute(
"aria-expanded",
"true"
);

}

function ensureTemplateSaveModal(){

if(
templateSaveModal
){
return templateSaveModal;
}

const root =
document.createElement(
"div"
);

root.className =
"draw-template-save-modal hidden";
root.innerHTML =
`
<div class="draw-template-save-backdrop" data-action="close"></div>
<div class="draw-template-save-dialog" role="dialog" aria-modal="true" aria-labelledby="draw-template-save-title">
<button type="button" class="draw-template-save-close" data-action="close" aria-label="Закрыть">×</button>
<h2 class="draw-template-save-title" id="draw-template-save-title">Save drawing template</h2>
<label class="draw-template-save-label" for="draw-template-save-input">Template name</label>
<div class="draw-template-save-field">
<input type="text" class="draw-template-save-input" id="draw-template-save-input" autocomplete="off" spellcheck="false" placeholder=""/>
<button type="button" class="draw-template-save-toggle" data-action="toggle-list" aria-label="Показать сохранённые шаблоны" aria-expanded="false">▾</button>
</div>
<ul class="draw-template-save-list hidden" role="listbox"></ul>
<button type="button" class="draw-template-save-submit" data-action="save">Save</button>
</div>
`;

document.body.appendChild(
root
);
templateSaveModal = root;
templateNameInput =
root.querySelector(
".draw-template-save-input"
);

root.addEventListener(
"click",
e=>{

const action =
e.target.closest(
"[data-action]"
)?.dataset.action;

if(
action ===
"close"
){
closeTemplateSaveModal();
return;
}

if(
action ===
"toggle-list"
){
toggleTemplateSaveList();
return;
}

if(
action ===
"save"
){
submitTemplateSave();
}

}
);

root.querySelector(
".draw-template-save-list"
)?.addEventListener(
"click",
e=>{

const item =
e.target.closest(
"[data-template-idx]"
);

if(
!item ||
!templateNameInput
){
return;
}

const type =
getStyleTargetType();
const saved =
listTemplatesForType(
type
);
const entry =
saved[
Number(
item.dataset.templateIdx
)
];

templateNameInput.value =
entry?.name ||
"";
closeTemplateSaveList();
submitTemplateSave();

}
);

templateNameInput?.addEventListener(
"keydown",
e=>{

if(
e.key ===
"Enter"
){
e.preventDefault();
submitTemplateSave();
}

if(
e.key ===
"Escape"
){
e.preventDefault();
closeTemplateSaveModal();
}

}
);

root.addEventListener(
"keydown",
e=>{

if(
templateSaveModal?.classList.contains(
"hidden"
)
){
return;
}

if(
e.key !==
"Enter" &&
e.code !==
"Enter" &&
e.code !==
"NumpadEnter"
){
return;
}

if(
e.target.closest(
".draw-template-save-list"
)
){
return;
}

e.preventDefault();
submitTemplateSave();

},
{
capture:true,
signal
}
);

return root;

}

function refreshTemplateSaveList(){

const listEl =
templateSaveModal?.querySelector(
".draw-template-save-list"
);

if(
!listEl
){
return;
}

const type =
getStyleTargetType();
const saved =
listTemplatesForType(
type
);

listEl.innerHTML =
saved.length
? saved.map((item,idx)=>`
<li><button type="button" class="draw-template-save-list-item" data-template-idx="${idx}" role="option">${escapeTemplateMenuName(item.name)}</button></li>`).join("")
: `<li class="draw-template-save-list-empty">Нет сохранённых шаблонов</li>`;

}

function openTemplateSaveList(){

const listEl =
templateSaveModal?.querySelector(
".draw-template-save-list"
);
const toggle =
templateSaveModal?.querySelector(
".draw-template-save-toggle"
);

refreshTemplateSaveList();
listEl?.classList.remove(
"hidden"
);
toggle?.setAttribute(
"aria-expanded",
"true"
);
toggle &&
(toggle.textContent = "▴");

}

function closeTemplateSaveList(){

const listEl =
templateSaveModal?.querySelector(
".draw-template-save-list"
);
const toggle =
templateSaveModal?.querySelector(
".draw-template-save-toggle"
);

listEl?.classList.add(
"hidden"
);
toggle?.setAttribute(
"aria-expanded",
"false"
);
toggle &&
(toggle.textContent = "▾");

}

function toggleTemplateSaveList(){

const listEl =
templateSaveModal?.querySelector(
".draw-template-save-list"
);

if(
listEl?.classList.contains(
"hidden"
)
){
openTemplateSaveList();
}else{
closeTemplateSaveList();
}

}

function openTemplateSaveModal(){

const type =
getStyleTargetType();

if(
!isTemplateEligibleType(
type
)
){
return;
}

closeTemplateMenu();
closePopovers();

const modal =
ensureTemplateSaveModal();
portalDrawChrome();

refreshTemplateSaveList();
closeTemplateSaveList();

if(
templateNameInput
){
templateNameInput.value = "";
}

modal.classList.remove(
"hidden"
);

requestAnimationFrame(()=>{
templateNameInput?.focus();
});

}

function closeTemplateSaveModal(){

templateSaveModal?.classList.add(
"hidden"
);
closeTemplateSaveList();

}

function submitTemplateSave(){

const type =
getStyleTargetType();
const name =
templateNameInput?.value ||
"";

if(
!isTemplateEligibleType(
type
) ||
!String(
name
).trim()
){
templateNameInput?.focus();
return;
}

const snapshot =
captureCurrentStyleSnapshot();

if(
!snapshot
){
return;
}

saveNamedTemplate(
type,
name,
snapshot
);
refreshTemplateMenu();
closeTemplateSaveModal();

}

function initTemplateUi(){

templateBtn?.addEventListener(
"click",
e=>{

e.stopPropagation();

const type =
getStyleTargetType();

if(
!isTemplateEligibleType(
type
)
){
return;
}

const open =
templateMenu?.classList.contains(
"hidden"
);

closePopovers();

if(
open
){
openTemplateMenu();
}else{
closeTemplateMenu();
}

}
);

templateMenu?.addEventListener(
"click",
e=>{

const btn =
e.target.closest(
"[data-action]"
);

if(
!btn
){
return;
}

e.stopPropagation();

const action =
btn.dataset.action;

if(
action ===
"save"
){
closeTemplateMenu();
openTemplateSaveModal();
return;
}

if(
action ===
"apply-default"
){
closeTemplateMenu();
applyDefaultStyleToTarget();
return;
}

if(
action ===
"apply-template"
){
closeTemplateMenu();
applyNamedTemplate(
btn.dataset.templateIdx
);
return;
}

if(
action ===
"delete-template"
){
e.preventDefault();
deleteTemplateAtIndex(
getStyleTargetType(),
btn.dataset.templateIdx
);
refreshTemplateMenu();
}

}
);

templateMenu?.addEventListener(
"mousedown",
e=>{
e.stopPropagation();
}
);

}

function closePopovers(
opts = {}
){

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

if(
!opts.keepTemplateMenu
){
closeTemplateMenu();
}

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

function initStylePopovers(){

initTemplateUi();

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
styleCtx().deleteSelected?.();

});

positionRiskInput?.addEventListener(
"mousedown",
e=>{
e.stopPropagation();
}
);

positionRiskInput?.addEventListener(
"focusin",
()=>{

positionRiskEditing =
true;

const sel =
getSelected();
const selId =
getSelectedId?.() ??
sel?.id;

if(
sel &&
isPositionType(
sel.type
) &&
selId
){
positionRiskShapeId =
selId;
getDesktopEdit?.()?.pinDrawingSelection?.(
selId
);
}

}
);

positionRiskInput?.addEventListener(
"keydown",
e=>{

if(
e.key !==
"Enter"
){
return;
}

e.preventDefault();
e.stopPropagation();

submitPositionVolumeApply();
positionRiskInput?.blur();

}
);

positionRiskInput?.addEventListener(
"keydown",
e=>{

if(
e.key !==
"Enter"
){
return;
}

e.preventDefault();
e.stopPropagation();

submitPositionVolumeApply();
positionRiskInput?.blur();

}
);

positionRiskInput?.addEventListener(
"focusout",
()=>{

applyPositionRiskUsd();
positionRiskEditing =
false;
positionRiskShapeId =
null;
getDesktopEdit?.()?.releaseDrawingSelectionPin?.();

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

if(
positionRiskWrap &&
!positionApplyBtn
){
positionApplyBtn =
document.createElement("button");
positionApplyBtn.type =
"button";
positionApplyBtn.className =
"draw-position-risk-apply hidden";
positionApplyBtn.textContent =
"Применить";
positionRiskWrap.appendChild(
positionApplyBtn
);

positionApplyBtn.addEventListener(
"mousedown",
e=>{
e.stopPropagation();
}
);

positionApplyBtn.addEventListener(
"click",
e=>{

e.preventDefault();
e.stopPropagation();

submitPositionVolumeApply();

}
);
}

document.addEventListener(
"keydown",
onPositionApplyEnterHotkey,
true
);

}

function isFibSettingsChromePointerEvent(e){

if(
!isFibSettingsOpen() &&
!isRectSettingsOpen()
){
return false;
}

return getDesktopEdit()?.isDrawChromePointerEvent?.(
e
) ??
false;

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

if(!getAlive() || !dragging){
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

if(!getAlive() || !dragging){
return;
}

dragging = false;

localStorage.setItem(
key,
JSON.stringify(barOffset)
);

};

const onDocClick = e=>{

if(!getAlive() || !isStyleBarContextActive()){
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
templateMenu?.contains(e.target) ||
templateSaveModal?.contains(e.target) ||
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


function mountStyleBar(){

initStylePopovers();

const teardownPositionRiskEnter =
()=>{
document.removeEventListener(
"keydown",
onPositionApplyEnterHotkey,
true
);
};

const teardownFloatingBar =
initFloatingBar();

return ()=>{

teardownPositionRiskEnter();
teardownFloatingBar?.();

chromeLayoutObserver?.disconnect();
chromeLayoutObserver =
null;

window.removeEventListener(
"resize",
syncDrawChromeLayout
);

window.removeEventListener(
"scroll",
syncDrawChromeLayout,
true
);

fibColorMenuPortal?.remove();
fibColorMenuPortal =
null;

chromePortal?.remove();
chromePortal =
null;

closeTemplateSaveModal();
templateSaveModal?.remove();
templateSaveModal =
null;
templateNameInput =
null;

};

}

return {
mount: mountStyleBar,
portalDrawChrome,
syncDrawChromeLayout,
updateStyleBar,
closePopovers,
isFibSettingsOpen,
isRectSettingsOpen,
isPositionRiskInputFocused,
isFibSettingsChromePointerEvent,
shouldDeferExternalDrawingsSync: ()=>(
isFibSettingsOpen() ||
isRectSettingsOpen() ||
isPositionRiskInputFocused()
),
setFibSettingsShapeId: id=>{
fibSettingsShapeId = id;
},
getFibSettingsShapeId: ()=>fibSettingsShapeId,
getChromePortal: ()=>chromePortal,
getActiveColor: ()=>activeColor,
setActiveColor: color=>{
activeColor = color;
},
positionPopover,
fillStyleUI,
applyStyleFromUI
};

}

