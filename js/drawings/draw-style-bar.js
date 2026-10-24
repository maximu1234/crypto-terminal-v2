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
} from "../chart-import.js?v=613e412b";

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
} from "../trade-volume-presets.js?v=6aad4532";

import {
stashDrawingStopsFromDrawing,
clearDrawingStopsPending,
hasDrawingStopsPending
} from "../trade-auto-stops.js?v=0eefb8cd";

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
} from "./draw-templates.js?v=6d130170";

import {
isFvpType,
copyFvpStyleToShape,
createFvpToolDefaults,
FVP_TOOL_DEFAULTS_VERSION
} from "./fixed-volume-profile.js?v=51ef58c3";

import {
fvpSettingsHtml,
fillFvpSettingsPanel,
readFvpSettingsPanel,
bindFvpSettingsPanel,
closeFvpColorMenu
} from "./fixed-volume-profile-settings.js?v=54546c69";

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
import {
styleCtx as styleCtxMoved,
isStyleBarContextActive as isStyleBarContextActiveMoved,
isTradeVolumeUiActive as isTradeVolumeUiActiveMoved,
ensureChromePortal as ensureChromePortalMoved,
portalDrawChrome as portalDrawChromeMoved,
syncDrawChromeLayout as syncDrawChromeLayoutMoved,
activeFibType as activeFibTypeMoved,
fibDefaultsVersionFor as fibDefaultsVersionForMoved,
migrateActiveFibDefaults as migrateActiveFibDefaultsMoved,
getFibEditShape as getFibEditShapeMoved,
resolveFibStyleTarget as resolveFibStyleTargetMoved,
rememberFibSettingsTarget as rememberFibSettingsTargetMoved,
isFibContext as isFibContextMoved,
isRectContext as isRectContextMoved,
isFvpContext as isFvpContextMoved,
isChannelContext as isChannelContextMoved,
isElliottContext as isElliottContextMoved,
candlesForCoords as candlesForCoordsMoved,
tfForCoords as tfForCoordsMoved,
getCoordEditShape as getCoordEditShapeMoved,
isCoordContext as isCoordContextMoved,
isCoordSettingsOpen as isCoordSettingsOpenMoved,
canApplyCoordPanel as canApplyCoordPanelMoved,
persistCoordChange as persistCoordChangeMoved,
syncCoordSettingsIfIdle as syncCoordSettingsIfIdleMoved,
composeSettingsHtml as composeSettingsHtmlMoved,
attachCoordUi as attachCoordUiMoved,
pinCoordSettingsShape as pinCoordSettingsShapeMoved,
typeShowsSettingsBtn as typeShowsSettingsBtnMoved,
settingsOpenMatchesType as settingsOpenMatchesTypeMoved,
ensureCoordSettingsPanel as ensureCoordSettingsPanelMoved,
resetSettingsPanelListeners as resetSettingsPanelListenersMoved,
settingsPopoverHasPanel as settingsPopoverHasPanelMoved,
isFibSettingsOpen as isFibSettingsOpenMoved,
isRectSettingsOpen as isRectSettingsOpenMoved,
isFvpSettingsOpen as isFvpSettingsOpenMoved,
isChannelSettingsOpen as isChannelSettingsOpenMoved,
isElliottSettingsOpen as isElliottSettingsOpenMoved,
getFvpEditShape as getFvpEditShapeMoved,
getRectEditShape as getRectEditShapeMoved,
fillRectSettingsPanel as fillRectSettingsPanelMoved,
readRectPanelFromDOM as readRectPanelFromDOMMoved,
canApplyRectPanel as canApplyRectPanelMoved,
canApplyFvpPanel as canApplyFvpPanelMoved,
ensureFvpSettingsPanel as ensureFvpSettingsPanelMoved,
fillFvpSettingsFromContext as fillFvpSettingsFromContextMoved,
applyFvpSettingsFromPanel as applyFvpSettingsFromPanelMoved,
getChannelEditShape as getChannelEditShapeMoved,
canApplyChannelPanel as canApplyChannelPanelMoved,
fillChannelSettingsPanel as fillChannelSettingsPanelMoved,
readChannelPanelFromDOM as readChannelPanelFromDOMMoved,
scheduleChannelApplyImmediate as scheduleChannelApplyImmediateMoved,
scheduleChannelApplyDebounced as scheduleChannelApplyDebouncedMoved,
getElliottEditType as getElliottEditTypeMoved,
getElliottEditShape as getElliottEditShapeMoved,
canApplyElliottPanel as canApplyElliottPanelMoved,
fillElliottSettingsFromContext as fillElliottSettingsFromContextMoved,
canApplyFibPanel as canApplyFibPanelMoved,
readFibDefaultsForStyle as readFibDefaultsForStyleMoved,
getStyleTargetType as getStyleTargetTypeMoved,
applyFibSettingsFromPanel as applyFibSettingsFromPanelMoved,
closeFibColorMenu as closeFibColorMenuMoved,
openFibColorMenu as openFibColorMenuMoved,
ensureFibColorMenuPortal as ensureFibColorMenuPortalMoved,
scheduleFibApplyImmediate as scheduleFibApplyImmediateMoved,
scheduleFibApplyDebounced as scheduleFibApplyDebouncedMoved,
readFibPanelFromDOM as readFibPanelFromDOMMoved,
applyFibGlobalColorFromToolbar as applyFibGlobalColorFromToolbarMoved,
applyFibGlobalWidthFromToolbar as applyFibGlobalWidthFromToolbarMoved,
fillFibSettingsPanel as fillFibSettingsPanelMoved,
readStyleFromUI as readStyleFromUIMoved,
updateColorStripe as updateColorStripeMoved,
setActiveWidth as setActiveWidthMoved,
setActiveTextSize as setActiveTextSizeMoved,
resolvePositionRiskTarget as resolvePositionRiskTargetMoved,
getPositionEntryVolumeUsd as getPositionEntryVolumeUsdMoved,
applyPositionRiskUsd as applyPositionRiskUsdMoved,
submitPositionVolumeApply as submitPositionVolumeApplyMoved,
validatePositionDrawingStops as validatePositionDrawingStopsMoved,
resolveTradeSymbol as resolveTradeSymbolMoved,
syncPositionApplyStopsArmed as syncPositionApplyStopsArmedMoved,
submitPositionVolumeApplyWithStops as submitPositionVolumeApplyWithStopsMoved,
isUnrelatedFormFieldFocused as isUnrelatedFormFieldFocusedMoved,
isEnterKey as isEnterKeyMoved,
isPositionApplyEnterHotkey as isPositionApplyEnterHotkeyMoved,
onPositionApplyEnterHotkey as onPositionApplyEnterHotkeyMoved,
isPositionRiskInputFocused as isPositionRiskInputFocusedMoved,
captureCurrentStyleSnapshot as captureCurrentStyleSnapshotMoved,
applyDefaultStyleToTarget as applyDefaultStyleToTargetMoved,
applyNamedTemplate as applyNamedTemplateMoved
} from "./draw-style-controls.js?v=b4e5fd0a";
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

function styleControlsHost(){
if(!styleControlsHost.current){
styleControlsHost.current = {
get CHANNEL_DEFAULT_COLOR(){ return CHANNEL_DEFAULT_COLOR; },
get ELLIOTT_TOOL_DEFAULTS_VERSION(){ return ELLIOTT_TOOL_DEFAULTS_VERSION; },
get FIB_EXT_TOOL_DEFAULTS_VERSION(){ return FIB_EXT_TOOL_DEFAULTS_VERSION; },
get FIB_TOOL_DEFAULTS_VERSION(){ return FIB_TOOL_DEFAULTS_VERSION; },
get FVP_TOOL_DEFAULTS_VERSION(){ return FVP_TOOL_DEFAULTS_VERSION; },
get STROKE(){ return STROKE; },
get TEXT_DEFAULT_SIZE(){ return TEXT_DEFAULT_SIZE; },
get activeColor(){ return activeColor; },
set activeColor(value){ activeColor = value; },
get applyPositionVolumeFromDrawing(){ return applyPositionVolumeFromDrawing; },
get barOffset(){ return barOffset; },
get baseDefaultStyle(){ return baseDefaultStyle; },
get bindCoordSettingsPanel(){ return bindCoordSettingsPanel; },
get bindDrawSettingsTabs(){ return bindDrawSettingsTabs; },
get bindFvpSettingsPanel(){ return bindFvpSettingsPanel; },
get buildFactoryDefaultSnapshot(){ return buildFactoryDefaultSnapshot; },
get calcPositionVolumeUsd(){ return calcPositionVolumeUsd; },
get channelApplyTimer(){ return channelApplyTimer; },
set channelApplyTimer(value){ channelApplyTimer = value; },
get channelPanelBuilt(){ return channelPanelBuilt; },
set channelPanelBuilt(value){ channelPanelBuilt = value; },
get channelPanelSyncing(){ return channelPanelSyncing; },
set channelPanelSyncing(value){ channelPanelSyncing = value; },
get channelSettingsShapeId(){ return channelSettingsShapeId; },
get chromePortal(){ return chromePortal; },
set chromePortal(value){ chromePortal = value; },
get clampTextFontSize(){ return clampTextFontSize; },
get clearDrawingStopsPending(){ return clearDrawingStopsPending; },
get colorPopover(){ return colorPopover; },
get colorStripe(){ return colorStripe; },
get commitChannelPanelToShape(){ return commitChannelPanelToShape; },
get commitFibPanelToShape(){ return commitFibPanelToShape; },
get coordPanelSyncing(){ return coordPanelSyncing; },
set coordPanelSyncing(value){ coordPanelSyncing = value; },
get coordSettingsHtml(){ return coordSettingsHtml; },
get coordSettingsShapeId(){ return coordSettingsShapeId; },
set coordSettingsShapeId(value){ coordSettingsShapeId = value; },
get coordSettingsType(){ return coordSettingsType; },
set coordSettingsType(value){ coordSettingsType = value; },
get coordsOnlyPanelBuilt(){ return coordsOnlyPanelBuilt; },
set coordsOnlyPanelBuilt(value){ coordsOnlyPanelBuilt = value; },
get copyFvpStyleToShape(){ return copyFvpStyleToShape; },
get createFvpToolDefaults(){ return createFvpToolDefaults; },
get deleteSelected(){ return deleteSelected; },
get drawSettingsTabsHtml(){ return drawSettingsTabsHtml; },
get elliottPanelBuilt(){ return elliottPanelBuilt; },
set elliottPanelBuilt(value){ elliottPanelBuilt = value; },
get elliottPanelSyncing(){ return elliottPanelSyncing; },
set elliottPanelSyncing(value){ elliottPanelSyncing = value; },
get elliottSettingsShapeId(){ return elliottSettingsShapeId; },
get ensureChannelSettingsPanel(){ return ensureChannelSettingsPanel; },
get ensureElliottSettingsPanel(){ return ensureElliottSettingsPanel; },
get ensureFibLevelsVisible(){ return ensureFibLevelsVisible; },
get ensureFibSettingsPanel(){ return ensureFibSettingsPanel; },
get ensureRectSettingsPanel(){ return ensureRectSettingsPanel; },
get extractStyleSnapshot(){ return extractStyleSnapshot; },
get fibApplyTimer(){ return fibApplyTimer; },
set fibApplyTimer(value){ fibApplyTimer = value; },
get fibColorMenuAnchor(){ return fibColorMenuAnchor; },
set fibColorMenuAnchor(value){ fibColorMenuAnchor = value; },
get fibColorMenuPortal(){ return fibColorMenuPortal; },
set fibColorMenuPortal(value){ fibColorMenuPortal = value; },
get fibPanelBuilt(){ return fibPanelBuilt; },
set fibPanelBuilt(value){ fibPanelBuilt = value; },
get fibPanelSyncing(){ return fibPanelSyncing; },
set fibPanelSyncing(value){ fibPanelSyncing = value; },
get fibSettingsShapeId(){ return fibSettingsShapeId; },
set fibSettingsShapeId(value){ fibSettingsShapeId = value; },
get fillChannelSettingsPanelDom(){ return fillChannelSettingsPanelDom; },
get fillCoordSettingsPanel(){ return fillCoordSettingsPanel; },
get fillElliottSettingsPanelDom(){ return fillElliottSettingsPanelDom; },
get fillFibSettingsPanelDom(){ return fillFibSettingsPanelDom; },
get fillFvpSettingsPanel(){ return fillFvpSettingsPanel; },
get fillRectSettingsPanelDom(){ return fillRectSettingsPanelDom; },
get fvpPanelBuilt(){ return fvpPanelBuilt; },
set fvpPanelBuilt(value){ fvpPanelBuilt = value; },
get fvpPanelSyncing(){ return fvpPanelSyncing; },
set fvpPanelSyncing(value){ fvpPanelSyncing = value; },
get fvpSettingsHtml(){ return fvpSettingsHtml; },
get fvpSettingsShapeId(){ return fvpSettingsShapeId; },
get getAlive(){ return getAlive; },
get getCandles(){ return getCandles; },
get getDesktopEdit(){ return getDesktopEdit; },
get getDrawings(){ return getDrawings; },
get getPlacement(){ return getPlacement; },
get getSelected(){ return getSelected; },
get getSelectedId(){ return getSelectedId; },
get getSelectedIds(){ return getSelectedIds; },
get getStyleDelegate(){ return getStyleDelegate; },
get getSymbol(){ return getSymbol; },
get getTf(){ return getTf; },
get getTool(){ return getTool; },
get getToolDefaults(){ return getToolDefaults; },
get hasCoordSettings(){ return hasCoordSettings; },
get hasDrawingStopsPending(){ return hasDrawingStopsPending; },
get isActive(){ return isActive; },
get isCoordInputFocused(){ return isCoordInputFocused; },
get isElliottType(){ return isElliottType; },
get isFibExtType(){ return isFibExtType; },
get isFibType(){ return isFibType; },
get isFvpType(){ return isFvpType; },
get isPositionType(){ return isPositionType; },
get isTemplateEligibleType(){ return isTemplateEligibleType; },
get listTemplatesForType(){ return listTemplatesForType; },
get loadUserPrefs(){ return loadUserPrefs; },
get mergeFibLevelsAfterGlobalChange(){ return mergeFibLevelsAfterGlobalChange; },
get mergeStyleSnapshot(){ return mergeStyleSnapshot; },
get migrateFibExtToolDefaults(){ return migrateFibExtToolDefaults; },
get migrateFibToolDefaults(){ return migrateFibToolDefaults; },
get mountTvColorPicker(){ return mountTvColorPicker; },
get parseDrawColor(){ return parseDrawColor; },
get parseMoneyInput(){ return parseMoneyInput; },
get persistStyleSnapshotToTarget(){ return persistStyleSnapshotToTarget; },
get positionApplyBtn(){ return positionApplyBtn; },
get positionApplyStopsBtn(){ return positionApplyStopsBtn; },
get positionEntryPrice(){ return positionEntryPrice; },
get positionPopover(){ return positionPopover; },
get positionRiskEditing(){ return positionRiskEditing; },
get positionRiskInput(){ return positionRiskInput; },
get positionRiskShapeId(){ return positionRiskShapeId; },
get positionRiskWrap(){ return positionRiskWrap; },
get readChannelSettingsPanel(){ return readChannelSettingsPanel; },
get readElliottSettingsPanel(){ return readElliottSettingsPanel; },
get readFibSettingsPanel(){ return readFibSettingsPanel; },
get readFvpSettingsPanel(){ return readFvpSettingsPanel; },
get readRectSettingsPanel(){ return readRectSettingsPanel; },
get rectPanelBuilt(){ return rectPanelBuilt; },
set rectPanelBuilt(value){ rectPanelBuilt = value; },
get rectPanelSyncing(){ return rectPanelSyncing; },
set rectPanelSyncing(value){ rectPanelSyncing = value; },
get rectSettingsShapeId(){ return rectSettingsShapeId; },
get redraw(){ return redraw; },
get resolveFibTrendLineColor(){ return resolveFibTrendLineColor; },
get saveDrawings(){ return saveDrawings; },
get saveGlobalStyle(){ return saveGlobalStyle; },
get saveToolDefaults(){ return saveToolDefaults; },
get saveUserPrefs(){ return saveUserPrefs; },
get setFibLevelColorButton(){ return setFibLevelColorButton; },
get settingsPanelAbort(){ return settingsPanelAbort; },
set settingsPanelAbort(value){ settingsPanelAbort = value; },
get settingsPopover(){ return settingsPopover; },
get stashDrawingStopsFromDrawing(){ return stashDrawingStopsFromDrawing; },
get styleBar(){ return styleBar; },
get templateMenu(){ return templateMenu; },
get templateSaveModal(){ return templateSaveModal; },
get textSizeLabel(){ return textSizeLabel; },
get textSizePopover(){ return textSizePopover; },
get touchShapeRevisionFn(){ return touchShapeRevisionFn; },
get widthLabel(){ return widthLabel; },
get widthPopover(){ return widthPopover; },
get widthPreview(){ return widthPreview; },
get wrapEl(){ return wrapEl; }
};
}
return styleControlsHost.current;
}

function styleCtx(){
return styleCtxMoved(
styleControlsHost(),
...arguments
);
}

function isStyleBarContextActive(){
return isStyleBarContextActiveMoved(
styleControlsHost(),
...arguments
);
}

function isTradeVolumeUiActive(){
return isTradeVolumeUiActiveMoved(
styleControlsHost(),
...arguments
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
return ensureChromePortalMoved(
styleControlsHost(),
...arguments
);
}

function portalDrawChrome(){
return portalDrawChromeMoved(
styleControlsHost(),
...arguments
);
}

function syncDrawChromeLayout(){
return syncDrawChromeLayoutMoved(
styleControlsHost(),
...arguments
);
}
function activeFibType(){
return activeFibTypeMoved(
styleControlsHost(),
...arguments
);
}

function fibDefaultsVersionFor(type){
return fibDefaultsVersionForMoved(
styleControlsHost(),
...arguments
);
}

function migrateActiveFibDefaults(type,
saved){
return migrateActiveFibDefaultsMoved(
styleControlsHost(),
...arguments
);
}

function getFibEditShape(){
return getFibEditShapeMoved(
styleControlsHost(),
...arguments
);
}

function resolveFibStyleTarget(){
return resolveFibStyleTargetMoved(
styleControlsHost(),
...arguments
);
}

function rememberFibSettingsTarget(){
return rememberFibSettingsTargetMoved(
styleControlsHost(),
...arguments
);
}

function isFibContext(){
return isFibContextMoved(
styleControlsHost(),
...arguments
);
}

function isRectContext(){
return isRectContextMoved(
styleControlsHost(),
...arguments
);
}

function isFvpContext(){
return isFvpContextMoved(
styleControlsHost(),
...arguments
);
}

function isChannelContext(){
return isChannelContextMoved(
styleControlsHost(),
...arguments
);
}

function isElliottContext(){
return isElliottContextMoved(
styleControlsHost(),
...arguments
);
}

function candlesForCoords(){
return candlesForCoordsMoved(
styleControlsHost(),
...arguments
);
}

function tfForCoords(){
return tfForCoordsMoved(
styleControlsHost(),
...arguments
);
}

function getCoordEditShape(){
return getCoordEditShapeMoved(
styleControlsHost(),
...arguments
);
}

function isCoordContext(){
return isCoordContextMoved(
styleControlsHost(),
...arguments
);
}

function isCoordSettingsOpen(){
return isCoordSettingsOpenMoved(
styleControlsHost(),
...arguments
);
}

function canApplyCoordPanel(){
return canApplyCoordPanelMoved(
styleControlsHost(),
...arguments
);
}

function persistCoordChange(){
return persistCoordChangeMoved(
styleControlsHost(),
...arguments
);
}

function syncCoordSettingsIfIdle(){
return syncCoordSettingsIfIdleMoved(
styleControlsHost(),
...arguments
);
}

function composeSettingsHtml(type,
styleHtml){
return composeSettingsHtmlMoved(
styleControlsHost(),
...arguments
);
}

function attachCoordUi(type,
signal){
return attachCoordUiMoved(
styleControlsHost(),
...arguments
);
}

function pinCoordSettingsShape(){
return pinCoordSettingsShapeMoved(
styleControlsHost(),
...arguments
);
}

function typeShowsSettingsBtn(type){
return typeShowsSettingsBtnMoved(
styleControlsHost(),
...arguments
);
}

function settingsOpenMatchesType(type){
return settingsOpenMatchesTypeMoved(
styleControlsHost(),
...arguments
);
}

function ensureCoordSettingsPanel(type){
return ensureCoordSettingsPanelMoved(
styleControlsHost(),
...arguments
);
}

function resetSettingsPanelListeners(){
return resetSettingsPanelListenersMoved(
styleControlsHost(),
...arguments
);
}

function settingsPopoverHasPanel(kind){
return settingsPopoverHasPanelMoved(
styleControlsHost(),
...arguments
);
}

function isFibSettingsOpen(){
return isFibSettingsOpenMoved(
styleControlsHost(),
...arguments
);
}

function isRectSettingsOpen(){
return isRectSettingsOpenMoved(
styleControlsHost(),
...arguments
);
}

function isFvpSettingsOpen(){
return isFvpSettingsOpenMoved(
styleControlsHost(),
...arguments
);
}

function isChannelSettingsOpen(){
return isChannelSettingsOpenMoved(
styleControlsHost(),
...arguments
);
}

function isElliottSettingsOpen(){
return isElliottSettingsOpenMoved(
styleControlsHost(),
...arguments
);
}

function getFvpEditShape(){
return getFvpEditShapeMoved(
styleControlsHost(),
...arguments
);
}

function getRectEditShape(){
return getRectEditShapeMoved(
styleControlsHost(),
...arguments
);
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

function fillRectSettingsPanel(shape){
return fillRectSettingsPanelMoved(
styleControlsHost(),
...arguments
);
}

function readRectPanelFromDOM(){
return readRectPanelFromDOMMoved(
styleControlsHost(),
...arguments
);
}

function canApplyRectPanel(){
return canApplyRectPanelMoved(
styleControlsHost(),
...arguments
);
}

function applyRectSettingsFromPanel(){
return applyRectSettingsFromPanelMoved(
stylePanelHost(),
...arguments
);
}

function canApplyFvpPanel(){
return canApplyFvpPanelMoved(
styleControlsHost(),
...arguments
);
}

function ensureFvpSettingsPanel(){
return ensureFvpSettingsPanelMoved(
styleControlsHost(),
...arguments
);
}

function fillFvpSettingsFromContext(){
return fillFvpSettingsFromContextMoved(
styleControlsHost(),
...arguments
);
}

function applyFvpSettingsFromPanel(){
return applyFvpSettingsFromPanelMoved(
styleControlsHost(),
...arguments
);
}

function getChannelEditShape(){
return getChannelEditShapeMoved(
styleControlsHost(),
...arguments
);
}

function canApplyChannelPanel(){
return canApplyChannelPanelMoved(
styleControlsHost(),
...arguments
);
}

function ensureChannelSettingsPanel(){
return ensureChannelSettingsPanelMoved(
stylePanelHost(),
...arguments
);
}

function fillChannelSettingsPanel(shape){
return fillChannelSettingsPanelMoved(
styleControlsHost(),
...arguments
);
}

function readChannelPanelFromDOM(){
return readChannelPanelFromDOMMoved(
styleControlsHost(),
...arguments
);
}

function commitChannelPanelToShape(){
return commitChannelPanelToShapeMoved(
stylePanelHost(),
...arguments
);
}

function scheduleChannelApplyImmediate(){
return scheduleChannelApplyImmediateMoved(
styleControlsHost(),
...arguments
);
}

function scheduleChannelApplyDebounced(){
return scheduleChannelApplyDebouncedMoved(
styleControlsHost(),
...arguments
);
}

function getElliottEditType(){
return getElliottEditTypeMoved(
styleControlsHost(),
...arguments
);
}

function getElliottEditShape(){
return getElliottEditShapeMoved(
styleControlsHost(),
...arguments
);
}

function canApplyElliottPanel(){
return canApplyElliottPanelMoved(
styleControlsHost(),
...arguments
);
}

function ensureElliottSettingsPanel(){
return ensureElliottSettingsPanelMoved(
stylePanelHost(),
...arguments
);
}

function fillElliottSettingsFromContext(){
return fillElliottSettingsFromContextMoved(
styleControlsHost(),
...arguments
);
}

function applyElliottSettingsFromPanel(){
return applyElliottSettingsFromPanelMoved(
stylePanelHost(),
...arguments
);
}

function canApplyFibPanel(){
return canApplyFibPanelMoved(
styleControlsHost(),
...arguments
);
}

function readFibDefaultsForStyle(){
return readFibDefaultsForStyleMoved(
styleControlsHost(),
...arguments
);
}

function getStyleTargetType(){
return getStyleTargetTypeMoved(
styleControlsHost(),
...arguments
);
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
return applyFibSettingsFromPanelMoved(
styleControlsHost(),
...arguments
);
}


function closeFibColorMenu(){
return closeFibColorMenuMoved(
styleControlsHost(),
...arguments
);
}

function openRectColorMenu(anchorBtn,
fallbackColor){
return openRectColorMenuMoved(
stylePanelHost(),
...arguments
);
}

function openFibColorMenu(anchorBtn, fallbackColor){
return openFibColorMenuMoved(
styleControlsHost(),
...arguments
);
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
return ensureFibColorMenuPortalMoved(
styleControlsHost(),
...arguments
);
}

function scheduleFibApplyImmediate(){
return scheduleFibApplyImmediateMoved(
styleControlsHost(),
...arguments
);
}

function scheduleFibApplyDebounced(){
return scheduleFibApplyDebouncedMoved(
styleControlsHost(),
...arguments
);
}

function readFibPanelFromDOM(){
return readFibPanelFromDOMMoved(
styleControlsHost(),
...arguments
);
}



function applyFibGlobalColorFromToolbar(shape, color){
return applyFibGlobalColorFromToolbarMoved(
styleControlsHost(),
...arguments
);
}

function applyFibGlobalWidthFromToolbar(shape, lineWidth){
return applyFibGlobalWidthFromToolbarMoved(
styleControlsHost(),
...arguments
);
}

function fillFibSettingsPanel(fibLevels,
fibShowTrendLine,
fallbackColor,
fallbackWidth,
fibTrendLineColor,
fibShowLabels = true){
return fillFibSettingsPanelMoved(
styleControlsHost(),
...arguments
);
}

function readStyleFromUI(){
return readStyleFromUIMoved(
styleControlsHost(),
...arguments
);
}

function updateColorStripe(color){
return updateColorStripeMoved(
styleControlsHost(),
...arguments
);
}

function setActiveWidth(lineWidth){
return setActiveWidthMoved(
styleControlsHost(),
...arguments
);
}

function setActiveTextSize(fontSize){
return setActiveTextSizeMoved(
styleControlsHost(),
...arguments
);
}

function resolvePositionRiskTarget(){
return resolvePositionRiskTargetMoved(
styleControlsHost(),
...arguments
);
}

function getPositionEntryVolumeUsd(shape){
return getPositionEntryVolumeUsdMoved(
styleControlsHost(),
...arguments
);
}

function applyPositionRiskUsd(){
return applyPositionRiskUsdMoved(
styleControlsHost(),
...arguments
);
}

function submitPositionVolumeApply(){
return submitPositionVolumeApplyMoved(
styleControlsHost(),
...arguments
);
}

function validatePositionDrawingStops(shape){
return validatePositionDrawingStopsMoved(
styleControlsHost(),
...arguments
);
}

function resolveTradeSymbol(){
return resolveTradeSymbolMoved(
styleControlsHost(),
...arguments
);
}

function syncPositionApplyStopsArmed(){
return syncPositionApplyStopsArmedMoved(
styleControlsHost(),
...arguments
);
}

function submitPositionVolumeApplyWithStops(){
return submitPositionVolumeApplyWithStopsMoved(
styleControlsHost(),
...arguments
);
}

function isUnrelatedFormFieldFocused(active){
return isUnrelatedFormFieldFocusedMoved(
styleControlsHost(),
...arguments
);
}

function isEnterKey(event){
return isEnterKeyMoved(
styleControlsHost(),
...arguments
);
}

function isPositionApplyEnterHotkey(event){
return isPositionApplyEnterHotkeyMoved(
styleControlsHost(),
...arguments
);
}

function onPositionApplyEnterHotkey(event){
return onPositionApplyEnterHotkeyMoved(
styleControlsHost(),
...arguments
);
}

function isPositionRiskInputFocused(){
return isPositionRiskInputFocusedMoved(
styleControlsHost(),
...arguments
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
return captureCurrentStyleSnapshotMoved(
styleControlsHost(),
...arguments
);
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
return applyDefaultStyleToTargetMoved(
styleControlsHost(),
...arguments
);
}

function applyNamedTemplate(idx){
return applyNamedTemplateMoved(
styleControlsHost(),
...arguments
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

