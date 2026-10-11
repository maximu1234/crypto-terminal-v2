/**
 * Style bar, fib/rect settings panels, color/width popovers.
 * Phase 4 split from drawings/init.js.
 */
import {
mountTvColorPicker,
parseDrawColor
} from "../draw-color-palette.js?v=e2a8aa69";

import {
isCoarseTouchViewport
} from "../chart-import.js?v=544220a0";

import {
STROKE,
FIB_TOOL_DEFAULTS_VERSION,
RECT_DEFAULT_FILL_OPACITY,
RECT_TOOL_DEFAULTS_VERSION
} from "./constants.js?v=c47ce407";

import {
migrateFibToolDefaults,
migrateFibExtToolDefaults,
ensureFibLevelsVisible,
getFibRows,
isFibType,
isFibExtType,
FIB_EXT_TOOL_DEFAULTS_VERSION,
resolveFibTrendLineColor
} from "./fib-spec.js?v=5f577f26";

import {
setFibPanelCommitHook,
closeAllFibLineStyleMenus,
closeAllFibLineWidthMenus
} from "./fib-portals.js?v=2d6d15fb";

import {
openChromeSurface,
closeChromeSurface
} from "../chrome-motion.js?v=bb1d8933";

import {
isPositionType,
positionEntryPrice
} from "./position.js?v=152e419c";

import {
isTextTool,
TEXT_SIZE_OPTIONS,
clampTextFontSize,
TEXT_DEFAULT_SIZE
} from "./text.js?v=441520b6";

import {
parseMoneyInput,
calcPositionVolumeUsd
} from "../position-sizing.js?v=81c492bf";

import {
applyPositionVolumeFromDrawing
} from "../trade-volume-presets.js?v=10eba9f8";

import {
stashDrawingStopsFromDrawing,
clearDrawingStopsPending,
hasDrawingStopsPending
} from "../trade-auto-stops.js?v=87d8bd69";

import {
touchShapeRevision
} from "../drawings-storage.js?v=c2e9af64";

import {
applyStyleSnapshotToShape,
buildFactoryDefaultSnapshot,
collectTemplateApplyTargets,
extractStyleSnapshot,
isTemplateEligibleType,
listTemplatesForType,
mergeStyleSnapshot,
saveNamedTemplate,
deleteTemplateAtIndex
} from "./draw-templates.js?v=de73f6f3";

import {
isFvpType,
copyFvpStyleToShape,
createFvpToolDefaults,
FVP_TOOL_DEFAULTS_VERSION
} from "./fixed-volume-profile.js?v=bb03b4a7";

import {
fvpSettingsHtml,
fillFvpSettingsPanel,
readFvpSettingsPanel,
bindFvpSettingsPanel,
closeFvpColorMenu
} from "./fixed-volume-profile-settings.js?v=22d0f288";

import {
rectSettingsHtml,
fillRectSettingsPanel as fillRectSettingsPanelDom,
readRectSettingsPanel,
bindRectSettingsPanel
} from "./draw-rect-settings.js?v=4c8ccbaf";

import {
fibSettingsHtml,
mountFibLevelRows,
fillFibSettingsPanel as fillFibSettingsPanelDom,
readFibSettingsPanel,
bindFibSettingsPanel,
setFibLevelColorButton,
mergeFibLevelsAfterGlobalChange
} from "./draw-fib-settings.js?v=fba82cc1";

import {
CHANNEL_DEFAULT_COLOR,
CHANNEL_TOOL_DEFAULTS_VERSION,
ensureChannelLevelsVisible
} from "./channel-spec.js?v=a8bcf3c9";

import {
channelSettingsHtml,
mountChannelLevelRows,
fillChannelSettingsPanel as fillChannelSettingsPanelDom,
readChannelSettingsPanel,
bindChannelSettingsPanel
} from "./draw-channel-settings.js?v=c760d270";

import {
ELLIOTT_TOOL_DEFAULTS_VERSION,
createElliottToolDefaults,
isElliottType,
isPattern12Draw,
migrateElliottToolDefaults,
normalizePattern12TpFlags,
normalizePattern12TpLevels
} from "./elliott-spec.js?v=3fb92981";

import {
elliottSettingsHtml,
fillElliottSettingsPanel as fillElliottSettingsPanelDom,
readElliottSettingsPanel,
bindElliottSettingsPanel,
syncElliottSettingsColor
} from "./draw-elliott-settings.js?v=f22b6fc7";

import {
hasCoordSettings
} from "./draw-coords.js?v=09587365";

import {
bindCoordSettingsPanel,
bindDrawSettingsTabs,
coordSettingsHtml,
drawSettingsTabsHtml,
fillCoordSettingsPanel,
isCoordInputFocused
} from "./draw-coord-settings.js?v=d6ea92cb";

import {
fillStyleUI as fillStyleUIMoved,
updateStyleBar as updateStyleBarMoved,
applyStyleFromUI as applyStyleFromUIMoved,
persistStyleSnapshotToTarget as persistStyleSnapshotToTargetMoved
} from "./draw-style-fill.js?v=d5843536";
import {
applyElliottSettingsFromPanel as applyElliottSettingsFromPanelMoved,
commitFibPanelToShape as commitFibPanelToShapeMoved,
ensureFibSettingsPanel as ensureFibSettingsPanelMoved,
flushFibPanelForType as flushFibPanelForTypeMoved,
commitChannelPanelToShape as commitChannelPanelToShapeMoved,
applyRectSettingsFromPanel as applyRectSettingsFromPanelMoved,
ensureChannelSettingsPanel as ensureChannelSettingsPanelMoved,
ensureRectSettingsPanel as ensureRectSettingsPanelMoved,
ensureElliottSettingsPanel as ensureElliottSettingsPanelMoved,
openRectColorMenu as openRectColorMenuMoved,
openElliottChannelColorMenu as openElliottChannelColorMenuMoved,
openChannelColorMenu as openChannelColorMenuMoved
} from "./draw-style-panels.js?v=2e6e7cc6";
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
lockBtn,
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
let positionApplyStopsBtn =
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

function stylePanelHost(){
if(!stylePanelHost.current){
stylePanelHost.current = {
get CHANNEL_DEFAULT_COLOR(){ return CHANNEL_DEFAULT_COLOR; },
get CHANNEL_TOOL_DEFAULTS_VERSION(){ return CHANNEL_TOOL_DEFAULTS_VERSION; },
get ELLIOTT_TOOL_DEFAULTS_VERSION(){ return ELLIOTT_TOOL_DEFAULTS_VERSION; },
get RECT_DEFAULT_FILL_OPACITY(){ return RECT_DEFAULT_FILL_OPACITY; },
get RECT_TOOL_DEFAULTS_VERSION(){ return RECT_TOOL_DEFAULTS_VERSION; },
get STROKE(){ return STROKE; },
get activeColor(){ return activeColor; },
get activeFibType(){ return activeFibType; },
get attachCoordUi(){ return attachCoordUi; },
get bindChannelSettingsPanel(){ return bindChannelSettingsPanel; },
get bindElliottSettingsPanel(){ return bindElliottSettingsPanel; },
get bindFibSettingsPanel(){ return bindFibSettingsPanel; },
get bindRectSettingsPanel(){ return bindRectSettingsPanel; },
get canApplyChannelPanel(){ return canApplyChannelPanel; },
get canApplyElliottPanel(){ return canApplyElliottPanel; },
get canApplyFibPanel(){ return canApplyFibPanel; },
get canApplyRectPanel(){ return canApplyRectPanel; },
get channelPanelBuilt(){ return channelPanelBuilt; },
set channelPanelBuilt(value){ channelPanelBuilt = value; },
get channelPanelSyncing(){ return channelPanelSyncing; },
get channelSettingsHtml(){ return channelSettingsHtml; },
get closeFibColorMenu(){ return closeFibColorMenu; },
get composeSettingsHtml(){ return composeSettingsHtml; },
get coordsOnlyPanelBuilt(){ return coordsOnlyPanelBuilt; },
set coordsOnlyPanelBuilt(value){ coordsOnlyPanelBuilt = value; },
get createElliottToolDefaults(){ return createElliottToolDefaults; },
get elliottPanelBuilt(){ return elliottPanelBuilt; },
set elliottPanelBuilt(value){ elliottPanelBuilt = value; },
get elliottSettingsHtml(){ return elliottSettingsHtml; },
get ensureChannelLevelsVisible(){ return ensureChannelLevelsVisible; },
get ensureFibColorMenuPortal(){ return ensureFibColorMenuPortal; },
get fibColorMenuAnchor(){ return fibColorMenuAnchor; },
set fibColorMenuAnchor(value){ fibColorMenuAnchor = value; },
get fibDefaultsVersionFor(){ return fibDefaultsVersionFor; },
get fibPanelBuilt(){ return fibPanelBuilt; },
set fibPanelBuilt(value){ fibPanelBuilt = value; },
get fibPanelCoordType(){ return fibPanelCoordType; },
set fibPanelCoordType(value){ fibPanelCoordType = value; },
get fibPanelSyncing(){ return fibPanelSyncing; },
get fibSettingsHtml(){ return fibSettingsHtml; },
get fibSettingsShapeId(){ return fibSettingsShapeId; },
get fvpPanelBuilt(){ return fvpPanelBuilt; },
set fvpPanelBuilt(value){ fvpPanelBuilt = value; },
get getAlive(){ return getAlive; },
get getChannelEditShape(){ return getChannelEditShape; },
get getDrawings(){ return getDrawings; },
get getElliottEditShape(){ return getElliottEditShape; },
get getElliottEditType(){ return getElliottEditType; },
get getFibEditShape(){ return getFibEditShape; },
get getRectEditShape(){ return getRectEditShape; },
get getToolDefaults(){ return getToolDefaults; },
get isChannelSettingsOpen(){ return isChannelSettingsOpen; },
get isFibSettingsOpen(){ return isFibSettingsOpen; },
get isFibType(){ return isFibType; },
get isPattern12Draw(){ return isPattern12Draw; },
get migrateElliottToolDefaults(){ return migrateElliottToolDefaults; },
get mountChannelLevelRows(){ return mountChannelLevelRows; },
get mountFibLevelRows(){ return mountFibLevelRows; },
get mountTvColorPicker(){ return mountTvColorPicker; },
get normalizePattern12TpFlags(){ return normalizePattern12TpFlags; },
get normalizePattern12TpLevels(){ return normalizePattern12TpLevels; },
get openFibColorMenu(){ return openFibColorMenu; },
get readChannelPanelFromDOM(){ return readChannelPanelFromDOM; },
get readElliottSettingsPanel(){ return readElliottSettingsPanel; },
get readFibPanelFromDOM(){ return readFibPanelFromDOM; },
get readFibSettingsPanel(){ return readFibSettingsPanel; },
get readRectPanelFromDOM(){ return readRectPanelFromDOM; },
get readStyleFromUI(){ return readStyleFromUI; },
get rectPanelBuilt(){ return rectPanelBuilt; },
set rectPanelBuilt(value){ rectPanelBuilt = value; },
get rectSettingsHtml(){ return rectSettingsHtml; },
get redraw(){ return redraw; },
get resetSettingsPanelListeners(){ return resetSettingsPanelListeners; },
get resolveFibStyleTarget(){ return resolveFibStyleTarget; },
get resolveFibTrendLineColor(){ return resolveFibTrendLineColor; },
get saveDrawings(){ return saveDrawings; },
get saveToolDefaults(){ return saveToolDefaults; },
get scheduleChannelApplyDebounced(){ return scheduleChannelApplyDebounced; },
get scheduleChannelApplyImmediate(){ return scheduleChannelApplyImmediate; },
get scheduleFibApplyDebounced(){ return scheduleFibApplyDebounced; },
get scheduleFibApplyImmediate(){ return scheduleFibApplyImmediate; },
get setFibLevelColorButton(){ return setFibLevelColorButton; },
get settingsPopover(){ return settingsPopover; },
get settingsPopoverHasPanel(){ return settingsPopoverHasPanel; },
get touchShapeRevisionFn(){ return touchShapeRevisionFn; }
};
}
return stylePanelHost.current;
}

function ensureRectSettingsPanel(){
return ensureRectSettingsPanelMoved(
stylePanelHost(),
...arguments
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
return applyRectSettingsFromPanelMoved(
stylePanelHost(),
...arguments
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
return ensureChannelSettingsPanelMoved(
stylePanelHost(),
...arguments
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
return commitChannelPanelToShapeMoved(
stylePanelHost(),
...arguments
);
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
return ensureElliottSettingsPanelMoved(
stylePanelHost(),
...arguments
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
return applyElliottSettingsFromPanelMoved(
stylePanelHost(),
...arguments
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
fibShowLabels:
typeof fibStore.fibShowLabels ===
"boolean"
? fibStore.fibShowLabels
: true,
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
return ensureFibSettingsPanelMoved(
stylePanelHost(),
...arguments
);
}

function flushFibPanelForType(type){
return flushFibPanelForTypeMoved(
stylePanelHost(),
...arguments
);
}

function commitFibPanelToShape(){
return commitFibPanelToShapeMoved(
stylePanelHost(),
...arguments
);
}

setFibPanelCommitHook(()=>{

if(
isElliottSettingsOpen()
){
applyElliottSettingsFromPanel();
return;
}

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

function openRectColorMenu(anchorBtn,
fallbackColor){
return openRectColorMenuMoved(
stylePanelHost(),
...arguments
);
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

function openElliottChannelColorMenu(anchorBtn,
fallbackColor){
return openElliottChannelColorMenuMoved(
stylePanelHost(),
...arguments
);
}

function openChannelColorMenu(anchorBtn,
fallbackColor){
return openChannelColorMenuMoved(
stylePanelHost(),
...arguments
);
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
shape.fibTrendLineColor,
shape.fibShowLabels
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
shape.fibTrendLineColor,
shape.fibShowLabels
);
}

}

function fillFibSettingsPanel(
fibLevels,
fibShowTrendLine,
fallbackColor,
fallbackWidth,
fibTrendLineColor,
fibShowLabels = true
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
fibTrendLineColor,
fibShowLabels
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

function validatePositionDrawingStops(
shape
){

if(
!shape ||
!isPositionType(
shape.type
)
){
return {
ok:
false,
message:
"Выберите объект Позиция Long/Short."
};
}

const entry =
positionEntryPrice(
shape
);
const slPrice =
Number(
shape.slPrice
);
const tpPrice =
Number(
shape.tpPrice
);

if(
!Number.isFinite(entry) ||
entry <=
0
){
return {
ok:
false,
message:
"Некорректная цена входа на объекте Позиция."
};
}

if(
!Number.isFinite(slPrice) ||
slPrice <=
0 ||
!Number.isFinite(tpPrice) ||
tpPrice <=
0
){
return {
ok:
false,
message:
"Укажите СЛ и ТП на объекте Позиция."
};
}

const isLong =
shape.type ===
"long";

if(
isLong
){
if(
slPrice >=
entry
){
return {
ok:
false,
message:
"Для Long стоп-лосс должен быть ниже входа."
};
}
if(
tpPrice <=
entry
){
return {
ok:
false,
message:
"Для Long тейк-профит должен быть выше входа."
};
}
}else{
if(
slPrice <=
entry
){
return {
ok:
false,
message:
"Для Short стоп-лосс должен быть выше входа."
};
}
if(
tpPrice >=
entry
){
return {
ok:
false,
message:
"Для Short тейк-профит должен быть ниже входа."
};
}
}

return {
ok:
true,
side:
isLong
? "long"
: "short",
slPrice,
tpPrice
};

}

function resolveTradeSymbol(){

return String(
getSymbol?.() ||
""
).replace(
/\.P$/i,
""
).trim().toUpperCase();

}

function syncPositionApplyStopsArmed(){

if(
!positionApplyStopsBtn
){
return;
}

const symbol =
resolveTradeSymbol();
const armed =
isTradeVolumeUiActive() &&
hasDrawingStopsPending(
symbol
);

positionApplyStopsBtn.classList.toggle(
"is-armed",
armed
);
positionApplyStopsBtn.setAttribute(
"aria-pressed",
armed
? "true"
: "false"
);
positionApplyStopsBtn.title =
armed
? "Ожидание сделки с СЛ/ТП с объекта — нажмите ещё раз, чтобы отменить"
: "Объём + СЛ/ТП с объекта на следующее открытие (авто-СЛ/ТП пропускаются)";

}

function submitPositionVolumeApplyWithStops(){

if(
!isTradeVolumeUiActive()
){
return;
}

const symbol =
resolveTradeSymbol();

/* Toggle off while armed for this symbol only. */
if(
hasDrawingStopsPending(
symbol
)
){
clearDrawingStopsPending(
symbol
);
syncPositionApplyStopsArmed();
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

const stops =
validatePositionDrawingStops(
shape
);

if(
!stops.ok
){
window.alert(
stops.message
);
return;
}

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

const stashed =
stashDrawingStopsFromDrawing(
{
symbol,
side:
stops.side,
slPrice:
stops.slPrice,
tpPrice:
stops.tpPrice
}
);

if(
!stashed
){
window.alert(
"Объём применён, но СЛ/ТП не сохранены для следующего входа."
);
}

syncPositionApplyStopsArmed();

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

function styleFillHost(){
if(!styleFillHost.current){
styleFillHost.current = {
get CHANNEL_TOOL_DEFAULTS_VERSION(){ return CHANNEL_TOOL_DEFAULTS_VERSION; },
get ELLIOTT_TOOL_DEFAULTS_VERSION(){ return ELLIOTT_TOOL_DEFAULTS_VERSION; },
get applyFibGlobalColorFromToolbar(){ return applyFibGlobalColorFromToolbar; },
get applyFibGlobalWidthFromToolbar(){ return applyFibGlobalWidthFromToolbar; },
get applyStyleSnapshotToShape(){ return applyStyleSnapshotToShape; },
get baseDefaultStyle(){ return baseDefaultStyle; },
get clampTextFontSize(){ return clampTextFontSize; },
get closePopovers(){ return closePopovers; },
get collectTemplateApplyTargets(){ return collectTemplateApplyTargets; },
get colorBtn(){ return colorBtn; },
get deleteOneBtn(){ return deleteOneBtn; },
get elliottPanelSyncing(){ return elliottPanelSyncing; },
set elliottPanelSyncing(value){ elliottPanelSyncing = value; },
get ensureChannelLevelsVisible(){ return ensureChannelLevelsVisible; },
get ensureElliottSettingsPanel(){ return ensureElliottSettingsPanel; },
get extractStyleSnapshot(){ return extractStyleSnapshot; },
get fibDefaultsVersionFor(){ return fibDefaultsVersionFor; },
get fibPanelCoordType(){ return fibPanelCoordType; },
get fillChannelSettingsPanel(){ return fillChannelSettingsPanel; },
get fillElliottSettingsPanelDom(){ return fillElliottSettingsPanelDom; },
get fillFibSettingsPanel(){ return fillFibSettingsPanel; },
get fillRectSettingsPanel(){ return fillRectSettingsPanel; },
get getChannelEditShape(){ return getChannelEditShape; },
get getDrawings(){ return getDrawings; },
get getFibEditShape(){ return getFibEditShape; },
get getFibRows(){ return getFibRows; },
get getPlacement(){ return getPlacement; },
get getRectEditShape(){ return getRectEditShape; },
get getSelected(){ return getSelected; },
get getSelectedIds(){ return getSelectedIds; },
get getStyleDelegate(){ return getStyleDelegate; },
get getStyleTargetType(){ return getStyleTargetType; },
get getToolDefaults(){ return getToolDefaults; },
get isChannelSettingsOpen(){ return isChannelSettingsOpen; },
get isCoarseTouchViewport(){ return isCoarseTouchViewport; },
get isElliottSettingsOpen(){ return isElliottSettingsOpen; },
get isElliottType(){ return isElliottType; },
get isFibExtType(){ return isFibExtType; },
get isFibSettingsOpen(){ return isFibSettingsOpen; },
get isFibType(){ return isFibType; },
get isFvpSettingsOpen(){ return isFvpSettingsOpen; },
get isPattern12Draw(){ return isPattern12Draw; },
get isPositionRiskInputFocused(){ return isPositionRiskInputFocused; },
get isPositionType(){ return isPositionType; },
get isRectSettingsOpen(){ return isRectSettingsOpen; },
get isTemplateEligibleType(){ return isTemplateEligibleType; },
get isTextTool(){ return isTextTool; },
get isTradeVolumeUiActive(){ return isTradeVolumeUiActive; },
get lockBtn(){ return lockBtn; },
get migrateElliottToolDefaults(){ return migrateElliottToolDefaults; },
get normalizePattern12TpFlags(){ return normalizePattern12TpFlags; },
get normalizePattern12TpLevels(){ return normalizePattern12TpLevels; },
get positionApplyBtn(){ return positionApplyBtn; },
get positionApplyStopsBtn(){ return positionApplyStopsBtn; },
get positionRiskInput(){ return positionRiskInput; },
get positionRiskWrap(){ return positionRiskWrap; },
get readChannelPanelFromDOM(){ return readChannelPanelFromDOM; },
get readElliottSettingsPanel(){ return readElliottSettingsPanel; },
get readFvpSettingsPanel(){ return readFvpSettingsPanel; },
get readRectPanelFromDOM(){ return readRectPanelFromDOM; },
get readStyleFromUI(){ return readStyleFromUI; },
get redraw(){ return redraw; },
get resolveFibStyleTarget(){ return resolveFibStyleTarget; },
get resolveFibTrendLineColor(){ return resolveFibTrendLineColor; },
get saveDrawings(){ return saveDrawings; },
get saveGlobalStyle(){ return saveGlobalStyle; },
get saveToolDefaults(){ return saveToolDefaults; },
get setActiveTextSize(){ return setActiveTextSize; },
get setActiveWidth(){ return setActiveWidth; },
get settingsBtn(){ return settingsBtn; },
get settingsOpenMatchesType(){ return settingsOpenMatchesType; },
get settingsPopover(){ return settingsPopover; },
get styleBar(){ return styleBar; },
get styleCtx(){ return styleCtx; },
get syncChartTouchPan(){ return syncChartTouchPan; },
get syncCoordSettingsIfIdle(){ return syncCoordSettingsIfIdle; },
get syncDrawChromeLayout(){ return syncDrawChromeLayout; },
get syncElliottSettingsColor(){ return syncElliottSettingsColor; },
get syncPositionApplyStopsArmed(){ return syncPositionApplyStopsArmed; },
get templateBtn(){ return templateBtn; },
get textSizeBtn(){ return textSizeBtn; },
get touchShapeRevisionFn(){ return touchShapeRevisionFn; },
get typeShowsSettingsBtn(){ return typeShowsSettingsBtn; },
get updateColorStripe(){ return updateColorStripe; },
get widthBtn(){ return widthBtn; }
};
}
return styleFillHost.current;
}

function fillStyleUI(style, type){
return fillStyleUIMoved(
styleFillHost(),
...arguments
);
}
function updateStyleBar(){
return updateStyleBarMoved(
styleFillHost(),
...arguments
);
}

function applyStyleFromUI(scope){
return applyStyleFromUIMoved(
styleFillHost(),
...arguments
);
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

if(
isElliottType(
type
) &&
isElliottSettingsOpen()
){

Object.assign(
snapshot,
readElliottSettingsPanel(
settingsPopover,
type
),
{
elliottDefaultsVersion:
ELLIOTT_TOOL_DEFAULTS_VERSION
}
);

snapshot =
mergeStyleSnapshot(
snapshot,
type
);

}

return snapshot;

}

function persistStyleSnapshotToTarget(snapshot,
{
updateToolDefaults = true
} = {}){
return persistStyleSnapshotToTargetMoved(
styleFillHost(),
...arguments
);
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

closeChromeSurface(
templateMenu
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
openChromeSurface(
templateMenu
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
true
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
openChromeSurface(
modal
);

requestAnimationFrame(()=>{
templateNameInput?.focus();
});

}

function closeTemplateSaveModal(){

closeChromeSurface(
templateSaveModal
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
openChromeSurface(
colorPopover
);
}

});

widthBtn?.addEventListener("click", e=>{

e.stopPropagation();

const open =
widthPopover?.classList.contains("hidden");

closePopovers();

if(open){
positionPopover(widthPopover, 40);
openChromeSurface(
widthPopover
);
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
openChromeSurface(
textSizePopover
);
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
fibShape.fibTrendLineColor,
fibShape.fibShowLabels
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
style.fibTrendLineColor,
style.fibShowLabels
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
openChromeSurface(
settingsPopover
);
}

});

deleteOneBtn?.addEventListener("pointerdown", e=>{

if(
e.pointerType === "mouse" &&
e.button !== 0
){
return;
}

if(
!e.isPrimary
){
return;
}

e.preventDefault();
e.stopPropagation();
styleCtx().deleteSelected?.();

});

lockBtn?.addEventListener("mousedown", e=>{
e.stopPropagation();
});

lockBtn?.addEventListener("click", e=>{

e.stopPropagation();
e.preventDefault();

const {
getSelected: selectedForLock,
getSelectedIds: selectedIdsForLock,
getDrawings: drawingsForLock
} =
styleCtx();

const lockIdList =
selectedIdsForLock?.() ||
[];
const targets =
[];

if(
lockIdList.length &&
drawingsForLock
){

for(
const id of lockIdList
){

const shape =
drawingsForLock().find(
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

}

if(
!targets.length
){

const sel =
selectedForLock?.() ||
getSelected();

if(
sel
){
targets.push(
sel
);
}

}

if(
!targets.length
){
return;
}

const nextLocked =
!targets.every(
s=>
!!s.locked
);

for(
const shape of targets
){
shape.locked =
nextLocked;
}

styleCtx().saveDrawings?.();
updateStyleBar();
styleCtx().redraw?.();

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

if(
positionRiskWrap &&
!positionApplyStopsBtn
){
positionApplyStopsBtn =
document.createElement("button");
positionApplyStopsBtn.type =
"button";
positionApplyStopsBtn.className =
"draw-position-risk-apply draw-position-risk-apply--stops hidden";
positionApplyStopsBtn.textContent =
"Применить + СЛ и ТП";
positionApplyStopsBtn.title =
"Объём + СЛ/ТП с объекта на следующее открытие (авто-СЛ/ТП пропускаются)";
positionRiskWrap.appendChild(
positionApplyStopsBtn
);

positionApplyStopsBtn.addEventListener(
"mousedown",
e=>{
e.stopPropagation();
}
);

positionApplyStopsBtn.addEventListener(
"click",
e=>{

e.preventDefault();
e.stopPropagation();

submitPositionVolumeApplyWithStops();

}
);
}

window.addEventListener(
"trade-drawing-stops-pending",
()=>{
syncPositionApplyStopsArmed();
}
);

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

