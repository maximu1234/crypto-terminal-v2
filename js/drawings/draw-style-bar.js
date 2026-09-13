/**
 * Style bar, fib/rect settings panels, color/width popovers.
 * Phase 4 split from drawings/init.js.
 */
import {
mountTvColorPicker,
parseDrawColor
} from "../draw-color-palette.js?v=7";

import {
isCoarseTouchViewport
} from "../chart-import.js?v=55";

import {
STROKE,
FIB_TOOL_DEFAULTS_VERSION,
RECT_DEFAULT_FILL_OPACITY,
RECT_TOOL_DEFAULTS_VERSION
} from "./constants.js?v=13";

import {
migrateFibToolDefaults,
migrateFibExtToolDefaults,
ensureFibLevelsVisible,
getFibRows,
isFibType,
isFibExtType,
FIB_EXT_TOOL_DEFAULTS_VERSION,
resolveFibTrendLineColor
} from "./fib-spec.js?v=17";

import {
setFibPanelCommitHook,
closeAllFibLineStyleMenus,
closeAllFibLineWidthMenus
} from "./fib-portals.js?v=3";

import {
isPositionType,
positionEntryPrice
} from "./position.js?v=11";

import {
isTextTool,
TEXT_SIZE_OPTIONS,
clampTextFontSize,
TEXT_DEFAULT_SIZE
} from "./text.js?v=3";

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
} from "./draw-templates.js?v=20";

import {
isFvpType,
copyFvpStyleToShape,
createFvpToolDefaults,
FVP_TOOL_DEFAULTS_VERSION
} from "./fixed-volume-profile.js?v=3";

import {
fvpSettingsHtml,
fillFvpSettingsPanel,
readFvpSettingsPanel,
bindFvpSettingsPanel,
closeFvpColorMenu
} from "./fixed-volume-profile-settings.js?v=4";

import {
rectSettingsHtml,
fillRectSettingsPanel as fillRectSettingsPanelDom,
readRectSettingsPanel,
bindRectSettingsPanel
} from "./draw-rect-settings.js?v=2";

import {
fibSettingsHtml,
mountFibLevelRows,
fillFibSettingsPanel as fillFibSettingsPanelDom,
readFibSettingsPanel,
bindFibSettingsPanel,
setFibLevelColorButton,
mergeFibLevelsAfterGlobalChange
} from "./draw-fib-settings.js?v=3";

import {
CHANNEL_DEFAULT_COLOR,
CHANNEL_TOOL_DEFAULTS_VERSION,
ensureChannelLevelsVisible
} from "./channel-spec.js?v=1";

import {
channelSettingsHtml,
mountChannelLevelRows,
fillChannelSettingsPanel as fillChannelSettingsPanelDom,
readChannelSettingsPanel,
bindChannelSettingsPanel
} from "./draw-channel-settings.js?v=1";

import {
ELLIOTT_TOOL_DEFAULTS_VERSION,
createElliottToolDefaults,
isElliottType,
isPattern12Draw,
migrateElliottToolDefaults,
normalizePattern12TpFlags,
normalizePattern12TpLevels
} from "./elliott-spec.js?v=12";

import {
elliottSettingsHtml,
fillElliottSettingsPanel as fillElliottSettingsPanelDom,
readElliottSettingsPanel,
bindElliottSettingsPanel,
syncElliottSettingsColor
} from "./draw-elliott-settings.js?v=6";

import {
hasCoordSettings
} from "./draw-coords.js?v=3";

import {
bindCoordSettingsPanel,
bindDrawSettingsTabs,
coordSettingsHtml,
drawSettingsTabsHtml,
fillCoordSettingsPanel,
isCoordInputFocused
} from "./draw-coord-settings.js?v=2";

export function createDrawStyleBar(
deps
){

const {
getAlive,
isActive,
getTool,
getSelectedId,
setSelectedId,
getSelectedIds = ()=>{
const id =
getSelectedId();
return id
? [
id
]
: [];
},
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
textSizeBtn,
textSizeLabel,
textSizePopover,
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
getCandles = ()=>
[],
getTf = ()=>
"",
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
getSelectedIds,
getSelected,
getPlacement,
getDrawings,
saveDrawings,
redraw,
saveToolDefaults,
saveGlobalStyle,
baseDefaultStyle,
getDesktopEdit,
deleteSelected,
getCandles,
getTf
};
}

return {
getTool:
delegate.getTool ||
getTool,
getSelectedId:
delegate.getSelectedId ||
getSelectedId,
getSelectedIds:
delegate.getSelectedIds ||
getSelectedIds,
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
deleteSelected,
getCandles:
delegate.getCandles ||
getCandles,
getTf:
delegate.getTf ||
getTf
};

}

function isStyleBarContextActive(){

return (
isActive() ||
!!getStyleDelegate?.()
);

}

function isTradeVolumeUiActive(){

return (
typeof document !==
"undefined" &&
document.body.classList.contains(
"trade-page"
)
);

}

const touchShapeRevisionFn =
touchShapeRevisionDep ||
touchShapeRevision;

let fibPanelBuilt = false;
let fibPanelCoordType = "fib";
let fibPanelSyncing = false;
let fibApplyTimer = null;
let fibSettingsShapeId = null;
let fibColorMenuPortal = null;
let fibColorMenuAnchor = null;
let rectPanelBuilt = false;
let rectPanelSyncing = false;
let rectSettingsShapeId = null;
let fvpPanelBuilt = false;
let fvpPanelSyncing = false;
let fvpSettingsShapeId = null;
let channelPanelBuilt = false;
let channelPanelSyncing = false;
let channelApplyTimer = null;
let channelSettingsShapeId = null;
let elliottPanelBuilt = false;
let elliottPanelSyncing = false;
let elliottSettingsShapeId = null;
let coordsOnlyPanelBuilt = false;
let coordPanelSyncing = false;
let coordSettingsShapeId = null;
let coordSettingsType = null;
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
function activeFibType(){

const sel =
getSelected();

if(
isFibType(
sel?.type
)
){
return sel.type;
}

const tool =
getTool();

if(
isFibType(
tool
)
){
return tool;
}

return "fib";

}

function fibDefaultsVersionFor(
type
){

return isFibExtType(
type
)
? FIB_EXT_TOOL_DEFAULTS_VERSION
: FIB_TOOL_DEFAULTS_VERSION;

}

function migrateActiveFibDefaults(
type,
saved
){

return isFibExtType(
type
)
? migrateFibExtToolDefaults(
saved
)
: migrateFibToolDefaults(
saved
);

}

function getFibEditShape(){

const wanted =
activeFibType();

if(fibSettingsShapeId){

const pinned =
getDrawings().find(
d=>
d.id === fibSettingsShapeId &&
isFibType(
d.type
)
);

if(
pinned &&
pinned.type ===
wanted
){
return pinned;
}

}

const sel =
getSelected();

if(
isFibType(
sel?.type
)
){
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

if(
isFibType(
sel?.type
)
){
fibSettingsShapeId = sel.id;
return;
}

const fibs =
getDrawings().filter(d=>isFibType(d.type));

if(fibs.length === 1){
fibSettingsShapeId = fibs[0].id;
}

}

function isFibContext(){

const sel =
getSelected();

if(
isFibType(
sel?.type
)
){
return true;
}

return isFibType(
getTool()
);

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

function isFvpContext(){

const sel =
getSelected();

if(
isFvpType(
sel?.type
)
){
return true;
}

return getTool() ===
"fvp";

}

function isChannelContext(){

const sel =
getSelected();

if(
sel?.type ===
"channel"
){
return true;
}

return getTool() ===
"channel";

}

function isElliottContext(){

const sel =
getSelected();

if(
isElliottType(
sel?.type
)
){
return true;
}

return isElliottType(
getTool()
);

}

function candlesForCoords(){

return styleCtx().getCandles?.() ||
[];

}

function tfForCoords(){

return styleCtx().getTf?.() ||
"";

}

function getCoordEditShape(){

const {
getSelected: selectedForStyle,
getDrawings: drawingsForStyle
} =
styleCtx();

if(
coordSettingsShapeId
){

const pinned =
drawingsForStyle().find(
d=>
d.id ===
coordSettingsShapeId
);

if(
pinned &&
hasCoordSettings(
pinned.type
)
){

const sel =
selectedForStyle();
const tool =
styleCtx().getTool?.();

if(
sel?.id ===
pinned.id
){
return pinned;
}

if(
sel &&
hasCoordSettings(
sel.type
)
){
return sel;
}

if(
!tool ||
tool ===
"cursor" ||
pinned.type ===
tool
){
return pinned;
}

}

}

const sel =
selectedForStyle();

return hasCoordSettings(
sel?.type
)
? sel
: null;

}

function isCoordContext(){

return hasCoordSettings(
styleCtx().getSelected?.()?.type
);

}

function isCoordSettingsOpen(){

return !!(
settingsPopover &&
!settingsPopover.classList.contains(
"hidden"
) &&
settingsPopover.querySelector(
".draw-coord-settings"
)
);

}

function canApplyCoordPanel(){

return (
getAlive() &&
isCoordSettingsOpen() &&
!coordPanelSyncing &&
!!getCoordEditShape()
);

}

function persistCoordChange(){

const {
saveDrawings: saveDrawingsForStyle,
redraw: redrawForStyle
} =
styleCtx();
const shape =
getCoordEditShape();

if(
!shape
){
return;
}

touchShapeRevisionFn(
shape
);
saveDrawingsForStyle();
redrawForStyle();

}

function syncCoordSettingsIfIdle(){

if(
!settingsPopover?.querySelector(
".draw-coord-settings"
)
){
return;
}

if(
coordPanelSyncing ||
isCoordInputFocused(
settingsPopover
)
){
return;
}

const shape =
getCoordEditShape();

if(
!shape
){
return;
}

coordPanelSyncing = true;

try{

fillCoordSettingsPanel(
settingsPopover,
shape,
candlesForCoords(),
tfForCoords()
);

}finally{
coordPanelSyncing = false;
}

}

function composeSettingsHtml(
type,
styleHtml
){

return drawSettingsTabsHtml({
styleHtml,
coordsHtml: coordSettingsHtml(
type
),
activeTab: "style"
});

}

function attachCoordUi(
type,
signal
){

coordSettingsType =
type;
bindDrawSettingsTabs(
settingsPopover,
signal
);
bindCoordSettingsPanel(
settingsPopover,
{
getAlive,
getShape: getCoordEditShape,
getCandles: candlesForCoords,
getTf: tfForCoords,
canApply: canApplyCoordPanel,
onApply: persistCoordChange,
signal
}
);

}

function pinCoordSettingsShape(){

coordSettingsShapeId =
styleCtx().getSelected?.()?.id ||
null;

}

function typeShowsSettingsBtn(
type
){

if(
isFibType(
type
) ||
type ===
"rectangle" ||
type ===
"fvp" ||
type ===
"channel" ||
isElliottType(
type
)
){
return true;
}

const sel =
styleCtx().getSelected?.();

return !!(
hasCoordSettings(
type
) &&
sel &&
sel.type ===
type
);

}

function settingsOpenMatchesType(
type
){

if(
isFibType(
type
)
){
return isFibSettingsOpen();
}

if(
type ===
"rectangle"
){
return isRectSettingsOpen();
}

if(
type ===
"fvp"
){
return isFvpSettingsOpen();
}

if(
type ===
"channel"
){
return isChannelSettingsOpen();
}

if(
isElliottType(
type
)
){
return isElliottSettingsOpen();
}

return !!(
hasCoordSettings(
type
) &&
isCoordSettingsOpen() &&
coordSettingsType ===
type
);

}

function ensureCoordSettingsPanel(
type
){

if(
!settingsPopover ||
!hasCoordSettings(
type
)
){
return;
}

const already =
coordsOnlyPanelBuilt &&
coordSettingsType ===
type &&
!!settingsPopover.querySelector(
".draw-coord-settings"
) &&
!settingsPopover.querySelector(
".draw-settings-tabs"
);

if(
already
){
return;
}

coordsOnlyPanelBuilt = true;
fibPanelBuilt = false;
rectPanelBuilt = false;
fvpPanelBuilt = false;
channelPanelBuilt = false;
elliottPanelBuilt = false;

const signal =
resetSettingsPanelListeners();

settingsPopover.classList.remove(
"draw-settings-popover--fvp"
);
settingsPopover.classList.add(
"draw-settings-popover--coords"
);
settingsPopover.innerHTML =
coordSettingsHtml(
type
);
attachCoordUi(
type,
signal
);

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
: kind ===
"fvp"
? ".fvp-settings"
: kind ===
"channel"
? ".channel-settings"
: kind ===
"elliott"
? ".elliott-settings"
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

function isFvpSettingsOpen(){

return !!(
settingsPopover &&
!settingsPopover.classList.contains("hidden") &&
fvpPanelBuilt &&
settingsPopover.querySelector(
".fvp-settings"
)
);

}

function isChannelSettingsOpen(){

return !!(
settingsPopover &&
!settingsPopover.classList.contains("hidden") &&
channelPanelBuilt &&
settingsPopover.querySelector(
".channel-settings"
)
);

}

function isElliottSettingsOpen(){

return !!(
settingsPopover &&
!settingsPopover.classList.contains("hidden") &&
elliottPanelBuilt &&
settingsPopover.querySelector(
".elliott-settings"
)
);

}

function getFvpEditShape(){

if(
fvpSettingsShapeId
){

const pinned =
getDrawings().find(
item=>
item.id ===
fvpSettingsShapeId
);

if(
isFvpType(
pinned?.type
)
){
return pinned;
}

}

const sel =
getSelected();

return isFvpType(
sel?.type
)
? sel
: null;

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
fvpPanelBuilt = false;
channelPanelBuilt = false;
elliottPanelBuilt = false;
coordsOnlyPanelBuilt = false;

const signal =
resetSettingsPanelListeners();

settingsPopover.classList.remove(
"draw-settings-popover--fvp",
"draw-settings-popover--coords"
);

settingsPopover.innerHTML =
composeSettingsHtml(
"rectangle",
rectSettingsHtml()
);

bindRectSettingsPanel(
settingsPopover,
{
getAlive,
canApply: canApplyRectPanel,
onApply: applyRectSettingsFromPanel,
getRectEditShape,
openColorMenu:(
btn,
fallback
)=>{
closeFibColorMenu();
openRectColorMenu(
btn,
fallback
);
},
signal
}
);

attachCoordUi(
"rectangle",
signal
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

fillRectSettingsPanelDom(
settingsPopover,
shape
);

}finally{
rectPanelSyncing = false;
}

syncCoordSettingsIfIdle();

}

function readRectPanelFromDOM(){

return readRectSettingsPanel(
settingsPopover
);

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

function canApplyFvpPanel(){

return (
getAlive() &&
isFvpSettingsOpen() &&
!fvpPanelSyncing
);

}

function ensureFvpSettingsPanel(){

if(
!settingsPopover
){
return;
}

if(
fvpPanelBuilt &&
settingsPopoverHasPanel(
"fvp"
)
){
return;
}

fvpPanelBuilt = true;
fibPanelBuilt = false;
rectPanelBuilt = false;
channelPanelBuilt = false;
elliottPanelBuilt = false;
coordsOnlyPanelBuilt = false;

resetSettingsPanelListeners();
settingsPopover.classList.remove(
"draw-settings-popover--coords"
);
settingsPopover.classList.add(
"draw-settings-popover--fvp"
);
settingsPopover.innerHTML =
fvpSettingsHtml();

bindFvpSettingsPanel(
settingsPopover,
{
canApply: canApplyFvpPanel,
onApply: applyFvpSettingsFromPanel
}
);

}

function fillFvpSettingsFromContext(){

ensureFvpSettingsPanel();
fvpPanelSyncing = true;

try{

fillFvpSettingsPanel(
settingsPopover,
getFvpEditShape() ||
baseDefaultStyle(
"fvp"
)
);

}finally{
fvpPanelSyncing = false;
}

}

function applyFvpSettingsFromPanel(){

if(
!canApplyFvpPanel()
){
return;
}

const shape =
getFvpEditShape();
const panel =
readFvpSettingsPanel(
settingsPopover
);

if(
shape
){

copyFvpStyleToShape(
shape,
panel
);
touchShapeRevisionFn(
shape
);
saveDrawings();
redraw();

}

saveToolDefaults(
"fvp",
{
...createFvpToolDefaults(),
...getToolDefaults().fvp,
...panel,
fvpDefaultsVersion:
FVP_TOOL_DEFAULTS_VERSION
}
);

}

function getChannelEditShape(){

if(
channelSettingsShapeId
){

const pinned =
getDrawings().find(
d=>
d.id === channelSettingsShapeId &&
d.type ===
"channel"
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
"channel"
? sel
: null;

}

function canApplyChannelPanel(){

return (
getAlive() &&
isChannelSettingsOpen() &&
!channelPanelSyncing
);

}

function ensureChannelSettingsPanel(){

if(
!settingsPopover
){
return;
}

if(
channelPanelBuilt &&
settingsPopoverHasPanel(
"channel"
)
){
return;
}

channelPanelBuilt = true;
fibPanelBuilt = false;
rectPanelBuilt = false;
fvpPanelBuilt = false;
elliottPanelBuilt = false;
coordsOnlyPanelBuilt = false;

const signal =
resetSettingsPanelListeners();

settingsPopover.classList.remove(
"draw-settings-popover--fvp",
"draw-settings-popover--coords"
);

settingsPopover.innerHTML =
composeSettingsHtml(
"channel",
channelSettingsHtml()
);

mountChannelLevelRows(
settingsPopover
);

bindChannelSettingsPanel(
settingsPopover,
{
getAlive,
canApply: canApplyChannelPanel,
getChannelEditShape,
openColorMenu:(
btn,
fallback
)=>{
closeFibColorMenu();
openChannelColorMenu(
btn,
fallback
);
},
scheduleImmediate: scheduleChannelApplyImmediate,
scheduleDebounced: scheduleChannelApplyDebounced,
signal
}
);

attachCoordUi(
"channel",
signal
);

}

function fillChannelSettingsPanel(
shape
){

ensureChannelSettingsPanel();

if(
!settingsPopover
){
return;
}

channelPanelSyncing = true;

try{

fillChannelSettingsPanelDom(
settingsPopover,
shape?.channelLevels,
shape?.color ||
CHANNEL_DEFAULT_COLOR
);

}finally{
channelPanelSyncing = false;
}

syncCoordSettingsIfIdle();

}

function readChannelPanelFromDOM(){

ensureChannelSettingsPanel();

return readChannelSettingsPanel(
settingsPopover
);

}

function commitChannelPanelToShape(){

if(
!getAlive() ||
!isChannelSettingsOpen() ||
channelPanelSyncing
){
return false;
}

const shape =
getChannelEditShape();
const panel =
readChannelPanelFromDOM();

if(
!shape
){

const style =
readStyleFromUI();

saveToolDefaults(
"channel",
{
channelDefaultsVersion:
CHANNEL_TOOL_DEFAULTS_VERSION,
color:
style.color ||
CHANNEL_DEFAULT_COLOR,
lineWidth:
style.lineWidth,
channelLevels:
panel.channelLevels
}
);

redraw();
return true;

}

shape.channelLevels =
JSON.parse(
JSON.stringify(
ensureChannelLevelsVisible(
panel.channelLevels
)
)
);

touchShapeRevisionFn(
shape
);

saveDrawings();
redraw();

const style =
readStyleFromUI();

saveToolDefaults(
"channel",
{
channelDefaultsVersion:
CHANNEL_TOOL_DEFAULTS_VERSION,
color:
style.color ||
shape.color ||
CHANNEL_DEFAULT_COLOR,
lineWidth:
style.lineWidth ??
shape.lineWidth,
channelLevels:
shape.channelLevels
}
);

return true;

}

function scheduleChannelApplyImmediate(){

if(
!isChannelSettingsOpen() ||
channelPanelSyncing
){
return;
}

if(
channelApplyTimer
){
clearTimeout(
channelApplyTimer
);
channelApplyTimer =
null;
}

commitChannelPanelToShape();

}

function scheduleChannelApplyDebounced(){

if(
!isChannelSettingsOpen() ||
channelPanelSyncing
){
return;
}

if(
channelApplyTimer
){
clearTimeout(
channelApplyTimer
);
}

channelApplyTimer =
setTimeout(
()=>{

channelApplyTimer =
null;

if(
!isChannelSettingsOpen() ||
channelPanelSyncing
){
return;
}

commitChannelPanelToShape();

},
320
);

}

function getElliottEditType(){

const sel =
getSelected();

if(
isElliottType(
sel?.type
)
){
return sel.type;
}

const tool =
getTool();

return isElliottType(
tool
)
? tool
: null;

}

function getElliottEditShape(){

const type =
getElliottEditType();

if(
!type
){
return null;
}

if(
elliottSettingsShapeId
){

const pinned =
getDrawings().find(
d=>
d.id === elliottSettingsShapeId &&
isElliottType(
d.type
)
);

if(
pinned
){
return pinned;
}

}

const sel =
getSelected();

return isElliottType(
sel?.type
)
? sel
: null;

}

function canApplyElliottPanel(){

return (
getAlive() &&
isElliottSettingsOpen() &&
!elliottPanelSyncing
);

}

function ensureElliottSettingsPanel(){

if(
!settingsPopover
){
return;
}

if(
elliottPanelBuilt &&
settingsPopoverHasPanel(
"elliott"
)
){
return;
}

elliottPanelBuilt = true;
fibPanelBuilt = false;
rectPanelBuilt = false;
fvpPanelBuilt = false;
channelPanelBuilt = false;
coordsOnlyPanelBuilt = false;

const signal =
resetSettingsPanelListeners();

settingsPopover.classList.remove(
"draw-settings-popover--fvp",
"draw-settings-popover--coords"
);

settingsPopover.innerHTML =
elliottSettingsHtml();

bindElliottSettingsPanel(
settingsPopover,
{
canApply: canApplyElliottPanel,
onApply: applyElliottSettingsFromPanel,
signal
}
);

}

function fillElliottSettingsFromContext(){

ensureElliottSettingsPanel();
elliottPanelSyncing = true;

try{

const type =
getElliottEditType() ||
"elliott-impulse";
const shape =
getElliottEditShape() ||
baseDefaultStyle(
type
);

fillElliottSettingsPanelDom(
settingsPopover,
{
...shape,
type:
shape.type ||
type
}
);

}finally{
elliottPanelSyncing = false;
}

}

function applyElliottSettingsFromPanel(){

if(
!canApplyElliottPanel()
){
return;
}

const type =
getElliottEditType();

if(
!type
){
return;
}

const shape =
getElliottEditShape();
const panel =
readElliottSettingsPanel(
settingsPopover,
type
);
const style =
readStyleFromUI();
const prev =
migrateElliottToolDefaults(
getToolDefaults()[
type
],
type
);

if(
shape
){

shape.degree =
panel.degree;
shape.degreeJunior =
panel.degreeJunior;
shape.showWave =
panel.showWave !==
false;
shape.showPatternDash =
panel.showPatternDash !==
false;
shape.patternDashOpacity =
panel.patternDashOpacity;

if(
isPattern12Draw(
type
)
){
Object.assign(
shape,
normalizePattern12TpFlags(
panel.showTpSenior,
panel.showTpJunior
)
);
shape.tpLevels =
normalizePattern12TpLevels(
panel.tpLevels
);
}

touchShapeRevisionFn(
shape
);
saveDrawings();
redraw();

}

saveToolDefaults(
type,
{
...createElliottToolDefaults({
type
}),
...prev,
color:
shape?.color ||
style.color ||
prev.color,
lineWidth:
shape?.lineWidth ??
style.lineWidth ??
prev.lineWidth,
degree:
panel.degree,
degreeJunior:
panel.degreeJunior,
showWave:
panel.showWave !==
false,
showPatternDash:
panel.showPatternDash !==
false,
patternDashOpacity:
panel.patternDashOpacity,
...(
isPattern12Draw(
type
)
? {
...normalizePattern12TpFlags(
panel.showTpSenior,
panel.showTpJunior
),
tpLevels:
normalizePattern12TpLevels(
panel.tpLevels
)
}
: {}
),
elliottDefaultsVersion:
ELLIOTT_TOOL_DEFAULTS_VERSION
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

const type =
activeFibType();
const fibStore =
migrateActiveFibDefaults(
type,
getToolDefaults()[
type
]
);

return {
fibLevels: JSON.parse(
JSON.stringify(
ensureFibLevelsVisible(
fibStore.fibLevels,
type
)
)
),
fibShowTrendLine:
typeof fibStore.fibShowTrendLine ===
"boolean"
? fibStore.fibShowTrendLine
: isFibExtType(
type
),
fibTrendLineColor: resolveFibTrendLineColor(
fibStore.fibTrendLineColor
)
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

const type =
activeFibType();

if(
fibPanelBuilt &&
settingsPopoverHasPanel(
"fib"
) &&
fibPanelCoordType ===
type
){
return;
}

if(
fibPanelBuilt &&
isFibSettingsOpen() &&
isFibType(
fibPanelCoordType
) &&
fibPanelCoordType !==
type
){
flushFibPanelForType(
fibPanelCoordType
);
}

fibPanelBuilt = true;
fibPanelCoordType =
type;
rectPanelBuilt = false;
fvpPanelBuilt = false;
channelPanelBuilt = false;
elliottPanelBuilt = false;
coordsOnlyPanelBuilt = false;

const signal =
resetSettingsPanelListeners();

settingsPopover.classList.remove(
"draw-settings-popover--fvp",
"draw-settings-popover--coords"
);

settingsPopover.innerHTML =
composeSettingsHtml(
type,
fibSettingsHtml(
type
)
);

mountFibLevelRows(
settingsPopover,
type
);

bindFibSettingsPanel(
settingsPopover,
{
getAlive,
canApply: canApplyFibPanel,
getFibEditShape,
openColorMenu:(
btn,
fallback
)=>{
closeFibColorMenu();
openFibColorMenu(
btn,
fallback
);
},
scheduleImmediate: scheduleFibApplyImmediate,
scheduleDebounced: scheduleFibApplyDebounced,
signal
}
);

attachCoordUi(
type,
signal
);

}

function flushFibPanelForType(
type
){

if(
!isFibType(
type
) ||
!settingsPopoverHasPanel(
"fib"
) ||
fibPanelSyncing
){
return;
}

const panel =
readFibSettingsPanel(
settingsPopover
);
const shape =
getDrawings().find(
d=>
d.id ===
fibSettingsShapeId &&
d.type ===
type
);

if(
shape
){

shape.fibLevels =
JSON.parse(
JSON.stringify(
panel.fibLevels
)
);
shape.fibShowTrendLine =
panel.fibShowTrendLine;
shape.fibTrendLineColor =
resolveFibTrendLineColor(
panel.fibTrendLineColor
);

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

}

saveToolDefaults(
type,
{
fibDefaultsVersion: fibDefaultsVersionFor(
type
),
color: activeColor ||
STROKE,
lineWidth:
Number.isFinite(
panel.lineWidth
)
? panel.lineWidth
: 1,
fibLevels: panel.fibLevels,
fibShowTrendLine: panel.fibShowTrendLine,
fibTrendLineColor: resolveFibTrendLineColor(
panel.fibTrendLineColor
)
}
);

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
const type =
activeFibType();

saveToolDefaults(
type,
{
fibDefaultsVersion: fibDefaultsVersionFor(
type
),
color: style.color,
lineWidth: style.lineWidth,
fibLevels: panel.fibLevels,
fibShowTrendLine: panel.fibShowTrendLine,
fibTrendLineColor: resolveFibTrendLineColor(
panel.fibTrendLineColor
)
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
shape.fibTrendLineColor =
resolveFibTrendLineColor(
panel.fibTrendLineColor
);

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
shape.type,
{
fibDefaultsVersion: fibDefaultsVersionFor(
shape.type
),
color: style.color,
lineWidth: style.lineWidth,
fibLevels: shape.fibLevels,
fibShowTrendLine: shape.fibShowTrendLine,
fibTrendLineColor: resolveFibTrendLineColor(
shape.fibTrendLineColor
)
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

if(
isFvpSettingsOpen()
){
applyFvpSettingsFromPanel();
return;
}

rememberFibSettingsTarget();
commitFibPanelToShape();

});

function applyFibSettingsFromPanel(){

commitFibPanelToShape();

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

function openChannelColorMenu(
anchorBtn,
fallbackColor
){

const portal =
ensureFibColorMenuPortal();

fibColorMenuAnchor =
anchorBtn;

const active =
anchorBtn.dataset.customColor ||
fallbackColor ||
CHANNEL_DEFAULT_COLOR;

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

commitChannelPanelToShape();

},
onSelect: color=>{

setFibLevelColorButton(
anchorBtn,
color,
fallbackColor
);

closeFibColorMenu();
commitChannelPanelToShape();

}
}
);

portal.classList.remove(
"hidden"
);

const rect =
anchorBtn.getBoundingClientRect();

portal.style.position =
"fixed";
portal.style.left =
`${Math.round(rect.left)}px`;
portal.style.top =
`${Math.round(rect.bottom + 4)}px`;
portal.style.zIndex =
"20000";

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

el.addEventListener("keydown", e=>{
e.stopPropagation();
});

document.addEventListener("mousedown", e=>{

if(
e.target.closest(
".fib-level-color-btn, .fib-level-color-menu, .channel-level-color-btn, .rect-fill-color-btn, .rect-median-color-btn, .tv-color-picker"
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

return readFibSettingsPanel(
settingsPopover
);

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
shape.lineWidth,
shape.fibTrendLineColor
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
shape.lineWidth,
shape.fibTrendLineColor
);
}

}

function fillFibSettingsPanel(
fibLevels,
fibShowTrendLine,
fallbackColor,
fallbackWidth,
fibTrendLineColor
){

ensureFibSettingsPanel();

fibPanelSyncing = true;

try{

fillFibSettingsPanelDom(
settingsPopover,
fibLevels,
fibShowTrendLine,
fallbackColor,
fallbackWidth,
fibTrendLineColor
);

}finally{
fibPanelSyncing = false;
}

syncCoordSettingsIfIdle();

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
),
fontSize:
clampTextFontSize(
textSizePopover?.querySelector(".text-size-option.active")?.dataset.size ||
textSizeLabel?.textContent ||
TEXT_DEFAULT_SIZE
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
isChannelSettingsOpen()
){

Object.assign(
base,
readChannelPanelFromDOM()
);

}else if(
isFibType(
tgt
) ||
isFibType(
getTool()
)
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

function setActiveTextSize(
fontSize
){

const size =
clampTextFontSize(
fontSize
);

textSizePopover?.querySelectorAll(".text-size-option").forEach(btn=>{
btn.classList.toggle(
"active",
Number(btn.dataset.size) ===
size
);
});

if(
textSizeLabel
){
textSizeLabel.textContent =
String(
size
);
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
!isTradeVolumeUiActive()
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

function isEnterKey(
event
){

return (
event.key ===
"Enter" ||
event.key ===
"Go" ||
event.code ===
"Enter" ||
event.code ===
"NumpadEnter" ||
event.keyCode ===
13
);

}

function isPositionApplyEnterHotkey(
event
){

if(
!isEnterKey(
event
)
){
return false;
}

if(
!isTradeVolumeUiActive()
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

if(
isElliottType(
type
) &&
isElliottSettingsOpen()
){
syncElliottSettingsColor(
settingsPopover,
stripeColor
);
}
setActiveWidth(style.lineWidth);

settingsBtn?.classList.toggle(
"hidden",
!typeShowsSettingsBtn(
type
)
);

const isTextToolbar =
isTextTool(
type
);

styleBar?.classList.toggle(
"draw-style-float--text",
isTextToolbar
);

colorBtn?.classList.toggle(
"draw-color-btn--text",
isTextToolbar
);

if(
colorBtn
){
colorBtn.title =
isTextToolbar
? "Цвет текста"
: "Цвет";
}

textSizeBtn?.classList.toggle(
"hidden",
!isTextToolbar
);

if(
isTextToolbar
){
setActiveTextSize(
style.fontSize
);
}

const isPosToolbar =
isPositionType(type);

const isArrowTool =
type ===
"arrow";

styleBar?.classList.toggle(
"draw-style-float--position",
isPosToolbar
);

styleBar?.classList.toggle(
"draw-style-float--fvp",
type ===
"fvp"
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
isFibType(
type
) ||
type ===
"fvp"
);

widthBtn?.classList.toggle(
"hidden",
isPosToolbar ||
isArrowTool ||
isTextToolbar ||
type ===
"fvp"
);

positionRiskWrap?.classList.toggle(
"hidden",
!isPosToolbar
);
positionApplyBtn?.classList.toggle(
"hidden",
!isPosToolbar ||
!isTradeVolumeUiActive()
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

if(
isFibType(
type
)
){

if(
!isFibSettingsOpen() ||
fibPanelCoordType !==
type
){

const fibShape =
isFibType(
getSelected()?.type
)
? getSelected()
: getFibEditShape();

fillFibSettingsPanel(
getFibRows(
fibShape ||
{
type,
fibLevels: style.fibLevels
}
),
style.fibShowTrendLine,
style.color,
style.lineWidth,
(
fibShape ||
style
).fibTrendLineColor
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

}else if(
type ===
"channel"
){

if(
!isChannelSettingsOpen()
){

const channelShape =
getSelected()?.type ===
"channel"
? getSelected()
: getChannelEditShape();

fillChannelSettingsPanel(
channelShape ||
baseDefaultStyle(
"channel"
)
);

}

}

if(
settingsPopover &&
!settingsPopover.classList.contains(
"hidden"
)
){

if(
!settingsOpenMatchesType(
type
)
){
settingsPopover.classList.add(
"hidden"
);
}else{
syncCoordSettingsIfIdle();
}

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
isFibType(
type
) &&
!placementForStyle()
? resolveFibStyleTarget()
: null;

const primaryTarget =
fibTarget || (
!placementForStyle()
? sel
: null
);

const {
getSelectedIds: selectedIdsForStyle,
getDrawings: drawingsForStyle
} =
styleCtx();

const selectedIdList =
selectedIdsForStyle?.() ||
[];
const targets =
[];

if(
!placementForStyle() &&
selectedIdList.length >
1 &&
drawingsForStyle
){

for(
const id of selectedIdList
){

const shape =
drawingsForStyle().find(
d=>
d.id ===
id
);

if(
shape
){
targets.push(
shape
);
}

}

}else if(
primaryTarget
){

targets.push(
primaryTarget
);

}

function applyStylePayloadToShape(
target
){

if(
isFibType(
target.type
)
){

if(
scope ===
"width"
){

applyFibGlobalWidthFromToolbar(
target,
style.lineWidth
);

}else if(
scope ===
"color"
){

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

}else if(
isTextTool(
target.type
)
){

target.color = style.color;
target.fontSize =
clampTextFontSize(
style.fontSize
);

}else if(
isElliottType(
target.type
)
){

target.color = style.color;
target.lineWidth = style.lineWidth;

}else{

target.color = style.color;
target.lineWidth = style.lineWidth;

}

touchShapeRevisionFn(
target
);

}

if(
targets.length
){

for(
const target of targets
){
applyStylePayloadToShape(
target
);
}

saveDrawingsForStyle();
redrawForStyle();

}

const defaultsPayload =
{
color: style.color,
lineWidth: style.lineWidth
};

if(
isTextTool(
type
)
){
defaultsPayload.fontSize =
clampTextFontSize(
style.fontSize
);
delete defaultsPayload.lineWidth;
}

if(
isFibType(
type
) &&
style.fibLevels
){

defaultsPayload.fibDefaultsVersion =
fibDefaultsVersionFor(
type
);

defaultsPayload.fibLevels =
style.fibLevels;

defaultsPayload.fibShowTrendLine =
typeof style.fibShowTrendLine ===
"boolean"
? style.fibShowTrendLine
: isFibExtType(
type
);
defaultsPayload.fibTrendLineColor =
resolveFibTrendLineColor(
style.fibTrendLineColor
);

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
"fvp"
){

Object.assign(
defaultsPayload,
isFvpSettingsOpen()
? readFvpSettingsPanel(
settingsPopover
)
: extractStyleSnapshot(
{
type: "fvp",
...style
},
"fvp"
)
);

}

if(
type ===
"channel"
){

Object.assign(
defaultsPayload,
{
channelDefaultsVersion:
CHANNEL_TOOL_DEFAULTS_VERSION,
channelLevels:
ensureChannelLevelsVisible(
isChannelSettingsOpen()
? readChannelPanelFromDOM().channelLevels
: primaryTarget?.channelLevels ||
getToolDefaults().channel?.channelLevels ||
style.channelLevels
)
}
);

}

if(
isElliottType(
type
)
){

const prev =
migrateElliottToolDefaults(
getToolDefaults()[
type
],
type
);
const panel =
isElliottSettingsOpen()
? readElliottSettingsPanel(
settingsPopover,
type
)
: null;

Object.assign(
defaultsPayload,
{
elliottDefaultsVersion:
ELLIOTT_TOOL_DEFAULTS_VERSION,
degree:
primaryTarget?.degree ||
panel?.degree ||
prev.degree,
degreeJunior:
primaryTarget?.degreeJunior ||
panel?.degreeJunior ||
prev.degreeJunior,
showWave:
primaryTarget?.showWave ??
panel?.showWave ??
prev.showWave,
showPatternDash:
primaryTarget?.showPatternDash ??
panel?.showPatternDash ??
prev.showPatternDash,
patternDashOpacity:
primaryTarget?.patternDashOpacity ??
panel?.patternDashOpacity ??
prev.patternDashOpacity,
...(
isPattern12Draw(
type
)
? {
...normalizePattern12TpFlags(
primaryTarget?.showTpSenior ??
panel?.showTpSenior ??
prev.showTpSenior,
primaryTarget?.showTpJunior ??
panel?.showTpJunior ??
prev.showTpJunior
),
tpLevels:
normalizePattern12TpLevels(
primaryTarget?.tpLevels ||
panel?.tpLevels ||
prev.tpLevels
)
}
: {}
)
}
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

if(
isElliottType(
type
) &&
isElliottSettingsOpen()
){
syncElliottSettingsColor(
settingsPopover,
style.color
);
}

if(
!targets.length
){
redrawForStyle();
}

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
"fvp" &&
isFvpSettingsOpen()
){

Object.assign(
snapshot,
readFvpSettingsPanel(
settingsPopover
)
);

snapshot =
mergeStyleSnapshot(
snapshot,
type
);

}

if(
isFibType(
type
) &&
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
isFibType(
type
) &&
snapshot.fibLevels
){
defaultsPayload.fibDefaultsVersion =
fibDefaultsVersionFor(
type
);
}

if(
type ===
"channel" &&
snapshot.channelLevels
){
defaultsPayload.channelDefaultsVersion =
CHANNEL_TOOL_DEFAULTS_VERSION;
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
isFibType(
type
) &&
isFibSettingsOpen()
){

fillFibSettingsPanel(
getFibRows({
type,
fibLevels:
snapshot.fibLevels
}),
snapshot.fibShowTrendLine,
snapshot.color,
snapshot.lineWidth,
snapshot.fibTrendLineColor
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

if(
type ===
"channel" &&
isChannelSettingsOpen()
){

fillChannelSettingsPanel({
color:
snapshot.color,
channelLevels:
snapshot.channelLevels
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
root.addEventListener(
"keydown",
e=>{
e.stopPropagation();
}
);
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
const fvpSettingsWasOpen =
isFvpSettingsOpen();
const channelSettingsWasOpen =
isChannelSettingsOpen();

if(
fibSettingsWasOpen
){
commitFibPanelToShape();
}

if(
fvpSettingsWasOpen
){
applyFvpSettingsFromPanel();
}

if(
channelSettingsWasOpen
){
commitChannelPanelToShape();
}

colorPopover?.classList.add("hidden");
widthPopover?.classList.add("hidden");
textSizePopover?.classList.add("hidden");
settingsPopover?.classList.add("hidden");
closeAllFibLineStyleMenus();
closeAllFibLineWidthMenus();
closeFibColorMenu();
closeFvpColorMenu();

if(
!opts.keepTemplateMenu
){
closeTemplateMenu();
}

if(fibSettingsWasOpen){
fibSettingsShapeId = null;
flushDeferredFibSettingsSync();
}

coordSettingsShapeId =
null;

if(
channelSettingsWasOpen
){
channelSettingsShapeId = null;

if(
channelApplyTimer
){
clearTimeout(
channelApplyTimer
);
channelApplyTimer =
null;
}

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

function stopDrawUiKeydownBubble(
el
){

el?.addEventListener(
"keydown",
e=>{
e.stopPropagation();
}
);

}

stopDrawUiKeydownBubble(
colorPopover
);
stopDrawUiKeydownBubble(
widthPopover
);
stopDrawUiKeydownBubble(
textSizePopover
);
stopDrawUiKeydownBubble(
settingsPopover
);

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

function ensureTextSizeOptions(){

if(
!textSizePopover ||
textSizePopover.querySelector(
".text-size-option"
)
){
return;
}

TEXT_SIZE_OPTIONS.forEach(
size=>{

const btn =
document.createElement(
"button"
);

btn.type =
"button";
btn.className =
"text-size-option";
btn.dataset.size =
String(
size
);
btn.textContent =
String(
size
);
textSizePopover.appendChild(
btn
);

}
);

}

ensureTextSizeOptions();

textSizeBtn?.addEventListener("click", e=>{

e.stopPropagation();

const open =
textSizePopover?.classList.contains("hidden");

closePopovers();

if(
open &&
textSizePopover
){
positionPopover(textSizePopover, 40);
textSizePopover.classList.remove("hidden");
}

});

textSizePopover?.querySelectorAll(".text-size-option").forEach(btn=>{

btn.addEventListener("click", e=>{

e.stopPropagation();
setActiveTextSize(
Number(
btn.dataset.size
)
);
applyStyleFromUI("fontSize");
textSizePopover.classList.add("hidden");

});

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
const fvpCtx =
isFvpContext();
const channelCtx =
isChannelContext();
const elliottCtx =
isElliottContext();
const coordCtx =
isCoordContext();

if(
!fibCtx &&
!rectCtx &&
!fvpCtx &&
!channelCtx &&
!elliottCtx &&
!coordCtx
){
return;
}

const open =
settingsPopover?.classList.contains("hidden");

closePopovers();

if(open){

if(
fvpCtx
){

fvpSettingsShapeId =
getSelected()?.id ||
null;
fillFvpSettingsFromContext();

}else if(
rectCtx
){

rectSettingsShapeId =
getSelected()?.id ||
null;
pinCoordSettingsShape();

const rectShape =
getRectEditShape();

fillRectSettingsPanel(
rectShape ||
baseDefaultStyle(
"rectangle"
)
);

}else if(
channelCtx
){

channelSettingsShapeId =
getSelected()?.id ||
null;
pinCoordSettingsShape();

const channelShape =
getChannelEditShape();

fillChannelSettingsPanel(
channelShape ||
baseDefaultStyle(
"channel"
)
);

}else if(
elliottCtx
){

elliottSettingsShapeId =
getSelected()?.id ||
null;
fillElliottSettingsFromContext();

}else if(
fibCtx
){

rememberFibSettingsTarget();
pinCoordSettingsShape();

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
fibShape.lineWidth,
fibShape.fibTrendLineColor
);
}else{

const style =
baseDefaultStyle(
activeFibType()
);

fillFibSettingsPanel(
style.fibLevels,
style.fibShowTrendLine,
style.color,
style.lineWidth,
style.fibTrendLineColor
);

}

}else if(
coordCtx
){

pinCoordSettingsShape();

const coordShape =
styleCtx().getSelected?.() ||
getSelected();

if(
coordShape &&
hasCoordSettings(
coordShape.type
)
){
ensureCoordSettingsPanel(
coordShape.type
);
syncCoordSettingsIfIdle();
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
!isEnterKey(
e
)
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

positionRiskInput?.setAttribute?.(
"enterkeyhint",
"go"
);

positionRiskWrap?.addEventListener(
"submit",
e=>{

e.preventDefault();
e.stopPropagation();

submitPositionVolumeApply();
positionRiskInput?.blur();

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
!settingsPopover ||
settingsPopover.classList.contains(
"hidden"
)
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
isFvpSettingsOpen() ||
isChannelSettingsOpen() ||
isElliottSettingsOpen() ||
isCoordSettingsOpen() ||
isPositionRiskInputFocused() ||
isCoordInputFocused(
settingsPopover
)
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

