/**
 * Closure slice. `host` is the surrounding function's bindings.
 */
export function styleCtx(host){

const delegate =
host.getStyleDelegate?.();

if(
!delegate
){
return {
getTool: host.getTool,
getSelectedId: host.getSelectedId,
getSelectedIds: host.getSelectedIds,
getSelected: host.getSelected,
getPlacement: host.getPlacement,
getDrawings: host.getDrawings,
saveDrawings: host.saveDrawings,
redraw: host.redraw,
saveToolDefaults: host.saveToolDefaults,
saveGlobalStyle: host.saveGlobalStyle,
baseDefaultStyle: host.baseDefaultStyle,
getDesktopEdit: host.getDesktopEdit,
deleteSelected: host.deleteSelected,
getCandles: host.getCandles,
getTf: host.getTf
};
}

return {
getTool:
delegate.getTool ||
host.getTool,
getSelectedId:
delegate.getSelectedId ||
host.getSelectedId,
getSelectedIds:
delegate.getSelectedIds ||
host.getSelectedIds,
getSelected:
delegate.getSelected ||
host.getSelected,
getPlacement:
delegate.getPlacement ||
host.getPlacement,
getDrawings:
delegate.getDrawings ||
host.getDrawings,
saveDrawings:
delegate.saveDrawings ||
host.saveDrawings,
redraw:
delegate.redraw ||
host.redraw,
saveToolDefaults:
delegate.saveToolDefaults ||
host.saveToolDefaults,
saveGlobalStyle:
delegate.saveGlobalStyle ||
host.saveGlobalStyle,
baseDefaultStyle:
delegate.baseDefaultStyle ||
host.baseDefaultStyle,
getDesktopEdit:
delegate.getDesktopEdit ||
host.getDesktopEdit,
deleteSelected:
delegate.deleteSelected ||
host.deleteSelected,
getCandles:
delegate.getCandles ||
host.getCandles,
getTf:
delegate.getTf ||
host.getTf
};

}

export function isStyleBarContextActive(host){

return (
host.isActive() ||
!!host.getStyleDelegate?.()
);

}

export function isTradeVolumeUiActive(host){

return (
typeof document !==
"undefined" &&
document.body.classList.contains(
"trade-page"
)
);

}

export function ensureChromePortal(host){

if(host.chromePortal){
return host.chromePortal;
}

const el =
document.createElement("div");

el.className = "draw-chrome-portal";
document.body.appendChild(el);
host.chromePortal = el;
return el;

}

export function portalDrawChrome(host){

const portal =
ensureChromePortal(host);

[
host.styleBar,
host.colorPopover,
host.widthPopover,
host.settingsPopover,
host.templateMenu,
host.templateSaveModal
].forEach(node=>{

if(!node){
return;
}

node.style.pointerEvents = "auto";
portal.appendChild(node);

});

}

export function syncDrawChromeLayout(host){

if(
!host.styleBar ||
!host.wrapEl
){
return;
}

const wrap =
host.wrapEl.getBoundingClientRect();

host.styleBar.style.position = "fixed";
host.styleBar.style.left =
`${wrap.left + host.barOffset.x}px`;
host.styleBar.style.top =
`${wrap.top + host.barOffset.y}px`;
host.styleBar.style.zIndex = "10050";

if(
host.settingsPopover &&
!host.settingsPopover.classList.contains("hidden")
){
host.positionPopover(
host.settingsPopover,
44
);
}

}

export function activeFibType(host){

const sel =
host.getSelected();

if(
host.isFibType(
sel?.type
)
){
return sel.type;
}

const tool =
host.getTool();

if(
host.isFibType(
tool
)
){
return tool;
}

return "fib";

}

export function fibDefaultsVersionFor(host, 
type
){

return host.isFibExtType(
type
)
? host.FIB_EXT_TOOL_DEFAULTS_VERSION
: host.FIB_TOOL_DEFAULTS_VERSION;

}

export function migrateActiveFibDefaults(host, 
type,
saved
){

return host.isFibExtType(
type
)
? host.migrateFibExtToolDefaults(
saved
)
: host.migrateFibToolDefaults(
saved
);

}

export function getFibEditShape(host){

const wanted =
activeFibType(host);

if(host.fibSettingsShapeId){

const pinned =
host.getDrawings().find(
d=>
d.id === host.fibSettingsShapeId &&
host.isFibType(
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
host.getSelected();

if(
host.isFibType(
sel?.type
)
){
return sel;
}

return null;

}

export function resolveFibStyleTarget(host){

if(
isFibSettingsOpen(host) &&
!getFibEditShape(host)
){
rememberFibSettingsTarget(host);
}

return getFibEditShape(host);

}

export function rememberFibSettingsTarget(host){

const sel =
host.getSelected();

if(
host.isFibType(
sel?.type
)
){
host.fibSettingsShapeId = sel.id;
return;
}

const fibs =
host.getDrawings().filter(d=>host.isFibType(d.type));

if(fibs.length === 1){
host.fibSettingsShapeId = fibs[0].id;
}

}

export function isFibContext(host){

const sel =
host.getSelected();

if(
host.isFibType(
sel?.type
)
){
return true;
}

return host.isFibType(
host.getTool()
);

}

export function isRectContext(host){

const sel =
host.getSelected();

if(
sel?.type ===
"rectangle"
){
return true;
}

return host.getTool() ===
"rectangle";

}

export function isFvpContext(host){

const sel =
host.getSelected();

if(
host.isFvpType(
sel?.type
)
){
return true;
}

return host.getTool() ===
"fvp";

}

export function isChannelContext(host){

const sel =
host.getSelected();

if(
sel?.type ===
"channel"
){
return true;
}

return host.getTool() ===
"channel";

}

export function isElliottContext(host){

const sel =
host.getSelected();

if(
host.isElliottType(
sel?.type
)
){
return true;
}

return host.isElliottType(
host.getTool()
);

}

export function candlesForCoords(host){

return styleCtx(host).getCandles?.() ||
[];

}

export function tfForCoords(host){

return styleCtx(host).getTf?.() ||
"";

}

export function getCoordEditShape(host){

const {
getSelected: selectedForStyle,
getDrawings: drawingsForStyle
} =
styleCtx(host);

if(
host.coordSettingsShapeId
){

const pinned =
drawingsForStyle().find(
d=>
d.id ===
host.coordSettingsShapeId
);

if(
pinned &&
host.hasCoordSettings(
pinned.type
)
){

const sel =
selectedForStyle();
const tool =
styleCtx(host).getTool?.();

if(
sel?.id ===
pinned.id
){
return pinned;
}

if(
sel &&
host.hasCoordSettings(
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

return host.hasCoordSettings(
sel?.type
)
? sel
: null;

}

export function isCoordContext(host){

return host.hasCoordSettings(
styleCtx(host).getSelected?.()?.type
);

}

export function isCoordSettingsOpen(host){

return !!(
host.settingsPopover &&
!host.settingsPopover.classList.contains(
"hidden"
) &&
host.settingsPopover.querySelector(
".draw-coord-settings"
)
);

}

export function canApplyCoordPanel(host){

return (
host.getAlive() &&
isCoordSettingsOpen(host) &&
!host.coordPanelSyncing &&
!!getCoordEditShape(host)
);

}

export function persistCoordChange(host){

const {
saveDrawings: saveDrawingsForStyle,
redraw: redrawForStyle
} =
styleCtx(host);
const shape =
getCoordEditShape(host);

if(
!shape
){
return;
}

host.touchShapeRevisionFn(
shape
);
saveDrawingsForStyle();
redrawForStyle();

}

export function syncCoordSettingsIfIdle(host){

if(
!host.settingsPopover?.querySelector(
".draw-coord-settings"
)
){
return;
}

if(
host.coordPanelSyncing ||
host.isCoordInputFocused(
host.settingsPopover
)
){
return;
}

const shape =
getCoordEditShape(host);

if(
!shape
){
return;
}

host.coordPanelSyncing = true;

try{

host.fillCoordSettingsPanel(
host.settingsPopover,
shape,
candlesForCoords(host),
tfForCoords(host)
);

}finally{
host.coordPanelSyncing = false;
}

}

export function composeSettingsHtml(host, 
type,
styleHtml
){

return host.drawSettingsTabsHtml({
styleHtml,
coordsHtml: host.coordSettingsHtml(
type
),
activeTab: "style"
});

}

export function attachCoordUi(host, 
type,
signal
){

host.coordSettingsType =
type;
host.bindDrawSettingsTabs(
host.settingsPopover,
signal
);
host.bindCoordSettingsPanel(
host.settingsPopover,
{
getAlive: host.getAlive,
getShape: (...a)=>getCoordEditShape(host, ...a),
getCandles: (...a)=>candlesForCoords(host, ...a),
getTf: (...a)=>tfForCoords(host, ...a),
canApply: (...a)=>canApplyCoordPanel(host, ...a),
onApply: (...a)=>persistCoordChange(host, ...a),
signal
}
);

}

export function pinCoordSettingsShape(host){

host.coordSettingsShapeId =
styleCtx(host).getSelected?.()?.id ||
null;

}

export function typeShowsSettingsBtn(host, 
type
){

if(
host.isFibType(
type
) ||
type ===
"rectangle" ||
type ===
"fvp" ||
type ===
"channel" ||
host.isElliottType(
type
)
){
return true;
}

const sel =
styleCtx(host).getSelected?.();

return !!(
host.hasCoordSettings(
type
) &&
sel &&
sel.type ===
type
);

}

export function settingsOpenMatchesType(host, 
type
){

if(
host.isFibType(
type
)
){
return isFibSettingsOpen(host);
}

if(
type ===
"rectangle"
){
return isRectSettingsOpen(host);
}

if(
type ===
"fvp"
){
return isFvpSettingsOpen(host);
}

if(
type ===
"channel"
){
return isChannelSettingsOpen(host);
}

if(
host.isElliottType(
type
)
){
return isElliottSettingsOpen(host);
}

return !!(
host.hasCoordSettings(
type
) &&
isCoordSettingsOpen(host) &&
host.coordSettingsType ===
type
);

}

export function ensureCoordSettingsPanel(host, 
type
){

if(
!host.settingsPopover ||
!host.hasCoordSettings(
type
)
){
return;
}

const already =
host.coordsOnlyPanelBuilt &&
host.coordSettingsType ===
type &&
!!host.settingsPopover.querySelector(
".draw-coord-settings"
) &&
!host.settingsPopover.querySelector(
".draw-settings-tabs"
);

if(
already
){
return;
}

host.coordsOnlyPanelBuilt = true;
host.fibPanelBuilt = false;
host.rectPanelBuilt = false;
host.fvpPanelBuilt = false;
host.channelPanelBuilt = false;
host.elliottPanelBuilt = false;

const signal =
resetSettingsPanelListeners(host);

host.settingsPopover.classList.remove(
"draw-settings-popover--fvp"
);
host.settingsPopover.classList.add(
"draw-settings-popover--coords"
);
host.settingsPopover.innerHTML =
host.coordSettingsHtml(
type
);
attachCoordUi(host, 
type,
signal
);

}

export function resetSettingsPanelListeners(host){

host.settingsPanelAbort?.abort();
host.settingsPanelAbort =
new AbortController();

return host.settingsPanelAbort.signal;

}

export function settingsPopoverHasPanel(host, 
kind
){

if(
!host.settingsPopover
){
return false;
}

return !!host.settingsPopover.querySelector(
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

export function isFibSettingsOpen(host){

return !!(
host.settingsPopover &&
!host.settingsPopover.classList.contains("hidden") &&
host.fibPanelBuilt &&
host.settingsPopover.querySelector(
".fib-settings"
)
);

}

export function isRectSettingsOpen(host){

return !!(
host.settingsPopover &&
!host.settingsPopover.classList.contains("hidden") &&
host.rectPanelBuilt &&
host.settingsPopover.querySelector(
".rect-settings"
)
);

}

export function isFvpSettingsOpen(host){

return !!(
host.settingsPopover &&
!host.settingsPopover.classList.contains("hidden") &&
host.fvpPanelBuilt &&
host.settingsPopover.querySelector(
".fvp-settings"
)
);

}

export function isChannelSettingsOpen(host){

return !!(
host.settingsPopover &&
!host.settingsPopover.classList.contains("hidden") &&
host.channelPanelBuilt &&
host.settingsPopover.querySelector(
".channel-settings"
)
);

}

export function isElliottSettingsOpen(host){

return !!(
host.settingsPopover &&
!host.settingsPopover.classList.contains("hidden") &&
host.elliottPanelBuilt &&
host.settingsPopover.querySelector(
".elliott-settings"
)
);

}

export function getFvpEditShape(host){

if(
host.fvpSettingsShapeId
){

const pinned =
host.getDrawings().find(
item=>
item.id ===
host.fvpSettingsShapeId
);

if(
host.isFvpType(
pinned?.type
)
){
return pinned;
}

}

const sel =
host.getSelected();

return host.isFvpType(
sel?.type
)
? sel
: null;

}

export function getRectEditShape(host){

if(
host.rectSettingsShapeId
){

const pinned =
host.getDrawings().find(
d=>
d.id === host.rectSettingsShapeId &&
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
host.getSelected();

return sel?.type ===
"rectangle"
? sel
: null;

}

export function fillRectSettingsPanel(host, 
shape
){

host.ensureRectSettingsPanel();

if(
!host.settingsPopover
){
return;
}

host.rectPanelSyncing = true;

try{

host.fillRectSettingsPanelDom(
host.settingsPopover,
shape
);

}finally{
host.rectPanelSyncing = false;
}

syncCoordSettingsIfIdle(host);

}

export function readRectPanelFromDOM(host){

return host.readRectSettingsPanel(
host.settingsPopover
);

}

export function canApplyRectPanel(host){

return (
host.getAlive() &&
isRectSettingsOpen(host) &&
!host.rectPanelSyncing
);

}

export function canApplyFvpPanel(host){

return (
host.getAlive() &&
isFvpSettingsOpen(host) &&
!host.fvpPanelSyncing
);

}

export function ensureFvpSettingsPanel(host){

if(
!host.settingsPopover
){
return;
}

if(
host.fvpPanelBuilt &&
settingsPopoverHasPanel(host, 
"fvp"
)
){
return;
}

host.fvpPanelBuilt = true;
host.fibPanelBuilt = false;
host.rectPanelBuilt = false;
host.channelPanelBuilt = false;
host.elliottPanelBuilt = false;
host.coordsOnlyPanelBuilt = false;

resetSettingsPanelListeners(host);
host.settingsPopover.classList.remove(
"draw-settings-popover--coords"
);
host.settingsPopover.classList.add(
"draw-settings-popover--fvp"
);
host.settingsPopover.innerHTML =
host.fvpSettingsHtml();

host.bindFvpSettingsPanel(
host.settingsPopover,
{
canApply: (...a)=>canApplyFvpPanel(host, ...a),
onApply: (...a)=>applyFvpSettingsFromPanel(host, ...a)
}
);

}

export function fillFvpSettingsFromContext(host){

ensureFvpSettingsPanel(host);
host.fvpPanelSyncing = true;

try{

host.fillFvpSettingsPanel(
host.settingsPopover,
getFvpEditShape(host) ||
host.baseDefaultStyle(
"fvp"
)
);

}finally{
host.fvpPanelSyncing = false;
}

}

export function applyFvpSettingsFromPanel(host){

if(
!canApplyFvpPanel(host)
){
return;
}

const shape =
getFvpEditShape(host);
const panel =
host.readFvpSettingsPanel(
host.settingsPopover
);

if(
shape
){

host.copyFvpStyleToShape(
shape,
panel
);
host.touchShapeRevisionFn(
shape
);
host.saveDrawings();
host.redraw();

}

host.saveToolDefaults(
"fvp",
{
...host.createFvpToolDefaults(),
...host.getToolDefaults().fvp,
...panel,
fvpDefaultsVersion:
host.FVP_TOOL_DEFAULTS_VERSION
}
);

}

export function getChannelEditShape(host){

if(
host.channelSettingsShapeId
){

const pinned =
host.getDrawings().find(
d=>
d.id === host.channelSettingsShapeId &&
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
host.getSelected();

return sel?.type ===
"channel"
? sel
: null;

}

export function canApplyChannelPanel(host){

return (
host.getAlive() &&
isChannelSettingsOpen(host) &&
!host.channelPanelSyncing
);

}

export function fillChannelSettingsPanel(host, 
shape
){

host.ensureChannelSettingsPanel();

if(
!host.settingsPopover
){
return;
}

host.channelPanelSyncing = true;

try{

host.fillChannelSettingsPanelDom(
host.settingsPopover,
shape?.channelLevels,
shape?.color ||
host.CHANNEL_DEFAULT_COLOR
);

}finally{
host.channelPanelSyncing = false;
}

syncCoordSettingsIfIdle(host);

}

export function readChannelPanelFromDOM(host){

host.ensureChannelSettingsPanel();

return host.readChannelSettingsPanel(
host.settingsPopover
);

}

export function scheduleChannelApplyImmediate(host){

if(
!isChannelSettingsOpen(host) ||
host.channelPanelSyncing
){
return;
}

if(
host.channelApplyTimer
){
clearTimeout(
host.channelApplyTimer
);
host.channelApplyTimer =
null;
}

host.commitChannelPanelToShape();

}

export function scheduleChannelApplyDebounced(host){

if(
!isChannelSettingsOpen(host) ||
host.channelPanelSyncing
){
return;
}

if(
host.channelApplyTimer
){
clearTimeout(
host.channelApplyTimer
);
}

host.channelApplyTimer =
setTimeout(
()=>{

host.channelApplyTimer =
null;

if(
!isChannelSettingsOpen(host) ||
host.channelPanelSyncing
){
return;
}

host.commitChannelPanelToShape();

},
320
);

}

export function getElliottEditType(host){

const sel =
host.getSelected();

if(
host.isElliottType(
sel?.type
)
){
return sel.type;
}

const tool =
host.getTool();

return host.isElliottType(
tool
)
? tool
: null;

}

export function getElliottEditShape(host){

const type =
getElliottEditType(host);

if(
!type
){
return null;
}

if(
host.elliottSettingsShapeId
){

const pinned =
host.getDrawings().find(
d=>
d.id === host.elliottSettingsShapeId &&
host.isElliottType(
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
host.getSelected();

return host.isElliottType(
sel?.type
)
? sel
: null;

}

export function canApplyElliottPanel(host){

return (
host.getAlive() &&
isElliottSettingsOpen(host) &&
!host.elliottPanelSyncing
);

}

export function fillElliottSettingsFromContext(host){

host.ensureElliottSettingsPanel();
host.elliottPanelSyncing = true;

try{

const type =
getElliottEditType(host) ||
"elliott-impulse";
const shape =
getElliottEditShape(host) ||
host.baseDefaultStyle(
type
);

host.fillElliottSettingsPanelDom(
host.settingsPopover,
{
...shape,
type:
shape.type ||
type
}
);

}finally{
host.elliottPanelSyncing = false;
}

}

export function canApplyFibPanel(host){

return (
host.getAlive() &&
isFibSettingsOpen(host) &&
!host.fibPanelSyncing
);

}

export function readFibDefaultsForStyle(host){

const type =
activeFibType(host);
const fibStore =
migrateActiveFibDefaults(host, 
type,
host.getToolDefaults()[
type
]
);

return {
fibLevels: JSON.parse(
JSON.stringify(
host.ensureFibLevelsVisible(
fibStore.fibLevels,
type
)
)
),
fibShowTrendLine:
typeof fibStore.fibShowTrendLine ===
"boolean"
? fibStore.fibShowTrendLine
: host.isFibExtType(
type
),
fibShowLabels:
typeof fibStore.fibShowLabels ===
"boolean"
? fibStore.fibShowLabels
: true,
fibTrendLineColor: host.resolveFibTrendLineColor(
fibStore.fibTrendLineColor
)
};

}

export function getStyleTargetType(host){

const {
getTool: toolForStyle,
getSelected: selectedForStyle
} =
styleCtx(host);

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

export function applyFibSettingsFromPanel(host){

host.commitFibPanelToShape();

}

export function closeFibColorMenu(host){

if(host.fibColorMenuPortal){
host.fibColorMenuPortal.classList.add("hidden");
}

host.fibColorMenuAnchor = null;

}

export function openFibColorMenu(host, anchorBtn, fallbackColor){

const portal =
ensureFibColorMenuPortal(host);

host.fibColorMenuAnchor = anchorBtn;

const active =
anchorBtn.dataset.customColor ||
fallbackColor ||
host.STROKE;

host.mountTvColorPicker(
portal,
{
activeColor: active,
onChange: color=>{

host.setFibLevelColorButton(
anchorBtn,
color,
fallbackColor
);

rememberFibSettingsTarget(host);
host.commitFibPanelToShape();

},
onSelect: color=>{

host.setFibLevelColorButton(
anchorBtn,
color,
fallbackColor
);

rememberFibSettingsTarget(host);
closeFibColorMenu(host);
host.commitFibPanelToShape();

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

export function ensureFibColorMenuPortal(host){

if(host.fibColorMenuPortal){
return host.fibColorMenuPortal;
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

closeFibColorMenu(host);

});

window.addEventListener("scroll", (...a)=>closeFibColorMenu(host, ...a), true);
window.addEventListener("resize", (...a)=>closeFibColorMenu(host, ...a));

host.fibColorMenuPortal = el;
return el;

}

export function scheduleFibApplyImmediate(host){

if(
!isFibSettingsOpen(host) ||
host.fibPanelSyncing
){
return;
}

if(host.fibApplyTimer){
clearTimeout(host.fibApplyTimer);
host.fibApplyTimer = null;
}

applyFibSettingsFromPanel(host);

}

export function scheduleFibApplyDebounced(host){

if(
!isFibSettingsOpen(host) ||
host.fibPanelSyncing
){
return;
}

if(host.fibApplyTimer){
clearTimeout(host.fibApplyTimer);
}

host.fibApplyTimer =
setTimeout(()=>{

host.fibApplyTimer = null;

if(
!isFibSettingsOpen(host) ||
host.fibPanelSyncing
){
return;
}

applyFibSettingsFromPanel(host);

},320);

}

export function readFibPanelFromDOM(host){

host.ensureFibSettingsPanel();

return host.readFibSettingsPanel(
host.settingsPopover
);

}

export function applyFibGlobalColorFromToolbar(host, shape, color){

shape.color = color;

const panel =
isFibSettingsOpen(host)
? readFibPanelFromDOM(host)
: null;

host.mergeFibLevelsAfterGlobalChange(
shape,
panel,
{ clearColors: true, clearWidths: false }
);

if(
host.fibPanelBuilt &&
isFibSettingsOpen(host)
){
fillFibSettingsPanel(host, 
shape.fibLevels,
shape.fibShowTrendLine,
shape.color,
shape.lineWidth,
shape.fibTrendLineColor,
shape.fibShowLabels
);
}

}

export function applyFibGlobalWidthFromToolbar(host, shape, lineWidth){

shape.lineWidth = lineWidth;

const panel =
isFibSettingsOpen(host)
? readFibPanelFromDOM(host)
: null;

host.mergeFibLevelsAfterGlobalChange(
shape,
panel,
{ clearColors: false, clearWidths: true }
);

if(
host.fibPanelBuilt &&
isFibSettingsOpen(host)
){
fillFibSettingsPanel(host, 
shape.fibLevels,
shape.fibShowTrendLine,
shape.color,
shape.lineWidth,
shape.fibTrendLineColor,
shape.fibShowLabels
);
}

}

export function fillFibSettingsPanel(host, 
fibLevels,
fibShowTrendLine,
fallbackColor,
fallbackWidth,
fibTrendLineColor,
fibShowLabels = true
){

host.ensureFibSettingsPanel();

host.fibPanelSyncing = true;

try{

host.fillFibSettingsPanelDom(
host.settingsPopover,
fibLevels,
fibShowTrendLine,
fallbackColor,
fallbackWidth,
fibTrendLineColor,
fibShowLabels
);

}finally{
host.fibPanelSyncing = false;
}

syncCoordSettingsIfIdle(host);

}

export function readStyleFromUI(host){

const widthActive =
host.widthPopover?.querySelector(".width-option.active");

const base =
{
color: host.activeColor ||
host.STROKE,
lineWidth: Number(
widthActive?.dataset.width || 1
),
fontSize:
host.clampTextFontSize(
host.textSizePopover?.querySelector(".text-size-option.active")?.dataset.size ||
host.textSizeLabel?.textContent ||
host.TEXT_DEFAULT_SIZE
)
};

const tgt =
getStyleTargetType(host);

if(
isFibSettingsOpen(host)
){

Object.assign(
base,
readFibPanelFromDOM(host)
);

}else if(
isRectSettingsOpen(host)
){

Object.assign(
base,
readRectPanelFromDOM(host)
);

}else if(
isChannelSettingsOpen(host)
){

Object.assign(
base,
readChannelPanelFromDOM(host)
);

}else if(
host.isFibType(
tgt
) ||
host.isFibType(
host.getTool()
)
){

Object.assign(
base,
readFibDefaultsForStyle(host)
);

}

return base;

}

export function updateColorStripe(host, color){

host.activeColor = color;

if(host.colorStripe){
host.colorStripe.style.setProperty("--active-color", color);
}

host.colorPopover?.querySelectorAll(".tv-color-swatch").forEach(btn=>{

const activeParsed =
host.parseDrawColor(
color
);

const swatchParsed =
host.parseDrawColor(
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

export function setActiveWidth(host, lineWidth){

host.widthPopover?.querySelectorAll(".width-option").forEach(btn=>{
btn.classList.toggle(
"active",
Number(btn.dataset.width) === lineWidth
);
});

if(host.widthLabel){
host.widthLabel.textContent = `${lineWidth}px`;
}

if(host.widthPreview){
host.widthPreview.style.height = `${lineWidth}px`;
}

}

export function setActiveTextSize(host, 
fontSize
){

const size =
host.clampTextFontSize(
fontSize
);

host.textSizePopover?.querySelectorAll(".text-size-option").forEach(btn=>{
btn.classList.toggle(
"active",
Number(btn.dataset.size) ===
size
);
});

if(
host.textSizeLabel
){
host.textSizeLabel.textContent =
String(
size
);
}

}

export function resolvePositionRiskTarget(host){

const sel =
host.getSelected();

if(
sel &&
host.isPositionType(
sel.type
)
){
return sel;
}

if(
host.positionRiskShapeId
){

const pinned =
host.getDrawings().find(
d=>
d.id ===
host.positionRiskShapeId &&
host.isPositionType(
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

export function getPositionEntryVolumeUsd(host, 
shape
){

if(
!shape ||
!host.isPositionType(
shape.type
)
){
return null;
}

const entry =
host.positionEntryPrice(
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
host.parseMoneyInput(
shape.riskUsd
);

if(
riskUsd == null
){
return null;
}

return host.calcPositionVolumeUsd(
riskUsd,
slPct
);

}

export function applyPositionRiskUsd(host){

const parsed =
host.parseMoneyInput(
host.positionRiskInput?.value ?? ""
);

const sel =
resolvePositionRiskTarget(host);
const styleType =
getStyleTargetType(host);

if(
sel &&
host.isPositionType(sel.type)
){

if(parsed){
sel.riskUsd = parsed;
}else{
delete sel.riskUsd;
}

host.touchShapeRevisionFn(
sel
);
host.saveDrawings();

}

if(
host.isPositionType(styleType)
){

host.saveToolDefaults(
styleType,
{
riskUsd: parsed
}
);

const prefs =
host.loadUserPrefs();

if(parsed){
prefs.positionRiskUsd = parsed;
}else{
delete prefs.positionRiskUsd;
}

host.saveUserPrefs(prefs);

}

host.redraw();

}

export function submitPositionVolumeApply(host){

if(
!isTradeVolumeUiActive(host)
){
return;
}

applyPositionRiskUsd(host);

const shape =
resolvePositionRiskTarget(host);
const volumeUsdt =
getPositionEntryVolumeUsd(host, 
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
host.getSymbol?.() ||
""
).replace(
/\.P$/i,
""
).trim().toUpperCase();

host.applyPositionVolumeFromDrawing(
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

export function validatePositionDrawingStops(host, 
shape
){

if(
!shape ||
!host.isPositionType(
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
host.positionEntryPrice(
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

export function resolveTradeSymbol(host){

return String(
host.getSymbol?.() ||
""
).replace(
/\.P$/i,
""
).trim().toUpperCase();

}

export function syncPositionApplyStopsArmed(host){

if(
!host.positionApplyStopsBtn
){
return;
}

const symbol =
resolveTradeSymbol(host);
const armed =
isTradeVolumeUiActive(host) &&
host.hasDrawingStopsPending(
symbol
);

host.positionApplyStopsBtn.classList.toggle(
"is-armed",
armed
);
host.positionApplyStopsBtn.setAttribute(
"aria-pressed",
armed
? "true"
: "false"
);
host.positionApplyStopsBtn.title =
armed
? "Ожидание сделки с СЛ/ТП с объекта — нажмите ещё раз, чтобы отменить"
: "Объём + СЛ/ТП с объекта на следующее открытие (авто-СЛ/ТП пропускаются)";

}

export function submitPositionVolumeApplyWithStops(host){

if(
!isTradeVolumeUiActive(host)
){
return;
}

const symbol =
resolveTradeSymbol(host);

/* Toggle off while armed for this symbol only. */
if(
host.hasDrawingStopsPending(
symbol
)
){
host.clearDrawingStopsPending(
symbol
);
syncPositionApplyStopsArmed(host);
return;
}

applyPositionRiskUsd(host);

const shape =
resolvePositionRiskTarget(host);
const volumeUsdt =
getPositionEntryVolumeUsd(host, 
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
validatePositionDrawingStops(host, 
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

host.applyPositionVolumeFromDrawing(
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
host.stashDrawingStopsFromDrawing(
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

syncPositionApplyStopsArmed(host);

}

export function isUnrelatedFormFieldFocused(host, 
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
host.positionRiskInput ||
host.positionRiskWrap?.querySelector(
".draw-position-risk-input"
);

if(
active ===
inputEl ||
host.positionRiskWrap?.contains(
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

export function isEnterKey(host, 
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

export function isPositionApplyEnterHotkey(host, 
event
){

if(
!isEnterKey(host, 
event
)
){
return false;
}

if(
!isTradeVolumeUiActive(host)
){
return false;
}

if(
host.positionRiskWrap?.classList.contains(
"hidden"
)
){
return false;
}

if(
host.positionApplyBtn?.classList.contains(
"hidden"
)
){
return false;
}

const sel =
host.getSelected();

if(
!sel ||
!host.isPositionType(
sel.type
)
){
return false;
}

if(
isUnrelatedFormFieldFocused(host, 
document.activeElement
)
){
return false;
}

return true;

}

export function onPositionApplyEnterHotkey(host, 
event
){

if(
!isPositionApplyEnterHotkey(host, 
event
)
){
return;
}

event.preventDefault();
event.stopPropagation();

submitPositionVolumeApply(host);

const inputEl =
host.positionRiskInput ||
host.positionRiskWrap?.querySelector(
".draw-position-risk-input"
);
const active =
document.activeElement;

if(
inputEl &&
(
active ===
inputEl ||
host.positionRiskWrap?.contains(
active
)
)
){
inputEl.blur();
}

}

export function isPositionRiskInputFocused(host){

return (
host.positionRiskEditing ||
document.activeElement ===
host.positionRiskInput ||
host.positionRiskInput?.contains?.(
document.activeElement
)
);

}

export function captureCurrentStyleSnapshot(host){

const type =
getStyleTargetType(host);

if(
!host.isTemplateEligibleType(
type
)
){
return null;
}

const sel =
host.getSelected();
const widthActive =
host.widthPopover?.querySelector(
".width-option.active"
);

let snapshot =
host.extractStyleSnapshot(
sel ||
{
color:
host.activeColor ||
host.STROKE,
lineWidth: Number(
widthActive?.dataset.width ||
1
)
},
type
);

const ui =
readStyleFromUI(host);

snapshot = host.mergeStyleSnapshot(
{
...snapshot,
...ui
},
type
);

if(
type ===
"rectangle" &&
isRectSettingsOpen(host)
){

Object.assign(
snapshot,
readRectPanelFromDOM(host)
);

snapshot =
host.mergeStyleSnapshot(
snapshot,
type
);

}

if(
type ===
"fvp" &&
isFvpSettingsOpen(host)
){

Object.assign(
snapshot,
host.readFvpSettingsPanel(
host.settingsPopover
)
);

snapshot =
host.mergeStyleSnapshot(
snapshot,
type
);

}

if(
host.isFibType(
type
) &&
isFibSettingsOpen(host)
){

Object.assign(
snapshot,
readFibPanelFromDOM(host)
);

snapshot =
host.mergeStyleSnapshot(
snapshot,
type
);

}

if(
host.isElliottType(
type
) &&
isElliottSettingsOpen(host)
){

Object.assign(
snapshot,
host.readElliottSettingsPanel(
host.settingsPopover,
type
),
{
elliottDefaultsVersion:
host.ELLIOTT_TOOL_DEFAULTS_VERSION
}
);

snapshot =
host.mergeStyleSnapshot(
snapshot,
type
);

}

return snapshot;

}

export function applyDefaultStyleToTarget(host){

const type =
getStyleTargetType(host);

if(
!host.isTemplateEligibleType(
type
)
){
return;
}

const snapshot =
host.buildFactoryDefaultSnapshot(
type
);

if(
!snapshot
){
return;
}

host.persistStyleSnapshotToTarget(
snapshot
);

}

export function applyNamedTemplate(host, 
idx
){

const type =
getStyleTargetType(host);
const list =
host.listTemplatesForType(
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

host.persistStyleSnapshotToTarget(
host.mergeStyleSnapshot(
entry.data,
type
)
);

}
