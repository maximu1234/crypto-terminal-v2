/**
 * Closure slice. `host` is the surrounding function's bindings.
 */
export function applyElliottSettingsFromPanel(host){

if(
!host.canApplyElliottPanel()
){
return;
}

const type =
host.getElliottEditType();

if(
!type
){
return;
}

const shape =
host.getElliottEditShape();
const panel =
host.readElliottSettingsPanel(
host.settingsPopover,
type
);
const style =
host.readStyleFromUI();
const prev =
host.migrateElliottToolDefaults(
host.getToolDefaults()[
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
shape.showPatternChannel =
panel.showPatternChannel ===
true;
shape.patternChannelLineStyle =
panel.patternChannelLineStyle;
shape.patternChannelLineWidth =
panel.patternChannelLineWidth;
shape.patternChannelColor =
panel.patternChannelColor;
shape.patternDashLineStyle =
panel.patternDashLineStyle;
shape.patternTpLineStyle =
panel.patternTpLineStyle;
shape.patternDashOpacity =
panel.patternDashOpacity;

if(
host.isPattern12Draw(
type
)
){
Object.assign(
shape,
host.normalizePattern12TpFlags(
panel.showTpSenior,
panel.showTpJunior
)
);
shape.tpLevels =
host.normalizePattern12TpLevels(
panel.tpLevels
);
}

host.touchShapeRevisionFn(
shape
);
host.saveDrawings();
host.redraw();

}

host.saveToolDefaults(
type,
{
...host.createElliottToolDefaults({
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
showPatternChannel:
panel.showPatternChannel ===
true,
patternChannelLineStyle:
panel.patternChannelLineStyle,
patternChannelLineWidth:
panel.patternChannelLineWidth,
patternChannelColor:
panel.patternChannelColor,
patternDashLineStyle:
panel.patternDashLineStyle,
patternTpLineStyle:
panel.patternTpLineStyle,
patternDashOpacity:
panel.patternDashOpacity,
...(
host.isPattern12Draw(
type
)
? {
...host.normalizePattern12TpFlags(
panel.showTpSenior,
panel.showTpJunior
),
tpLevels:
host.normalizePattern12TpLevels(
panel.tpLevels
)
}
: {}
),
elliottDefaultsVersion:
host.ELLIOTT_TOOL_DEFAULTS_VERSION
}
);

}

export function commitFibPanelToShape(host){

if(
!host.getAlive() ||
!host.isFibSettingsOpen() ||
host.fibPanelSyncing
){
return false;
}

const shape =
host.resolveFibStyleTarget();

const panel =
host.readFibPanelFromDOM();

if(!shape){

const style =
host.readStyleFromUI();
const type =
host.activeFibType();

host.saveToolDefaults(
type,
{
fibDefaultsVersion: host.fibDefaultsVersionFor(
type
),
color: style.color,
lineWidth: style.lineWidth,
fibLevels: panel.fibLevels,
fibShowTrendLine: panel.fibShowTrendLine,
fibShowLabels:
panel.fibShowLabels !==
false,
fibTrendLineColor: host.resolveFibTrendLineColor(
panel.fibTrendLineColor
)
}
);

host.redraw();
return true;

}

shape.fibLevels =
JSON.parse(
JSON.stringify(panel.fibLevels)
);

shape.fibShowTrendLine =
panel.fibShowTrendLine;
shape.fibShowLabels =
panel.fibShowLabels !==
false;
shape.fibTrendLineColor =
host.resolveFibTrendLineColor(
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

host.touchShapeRevisionFn(
shape
);

host.saveDrawings();
host.redraw();

const style =
host.readStyleFromUI();

host.saveToolDefaults(
shape.type,
{
fibDefaultsVersion: host.fibDefaultsVersionFor(
shape.type
),
color: style.color,
lineWidth: style.lineWidth,
fibLevels: shape.fibLevels,
fibShowTrendLine: shape.fibShowTrendLine,
fibShowLabels:
shape.fibShowLabels !==
false,
fibTrendLineColor: host.resolveFibTrendLineColor(
shape.fibTrendLineColor
)
}
);

return true;

}

export function ensureFibSettingsPanel(host){

if(
!host.settingsPopover
){
return;
}

const type =
host.activeFibType();

if(
host.fibPanelBuilt &&
host.settingsPopoverHasPanel(
"fib"
) &&
host.fibPanelCoordType ===
type
){
return;
}

if(
host.fibPanelBuilt &&
host.isFibSettingsOpen() &&
host.isFibType(
host.fibPanelCoordType
) &&
host.fibPanelCoordType !==
type
){
flushFibPanelForType(host, 
host.fibPanelCoordType
);
}

host.fibPanelBuilt = true;
host.fibPanelCoordType =
type;
host.rectPanelBuilt = false;
host.fvpPanelBuilt = false;
host.channelPanelBuilt = false;
host.elliottPanelBuilt = false;
host.coordsOnlyPanelBuilt = false;

const signal =
host.resetSettingsPanelListeners();

host.settingsPopover.classList.remove(
"draw-settings-popover--fvp",
"draw-settings-popover--coords"
);

host.settingsPopover.innerHTML =
host.composeSettingsHtml(
type,
host.fibSettingsHtml(
type
)
);

host.mountFibLevelRows(
host.settingsPopover,
type
);

host.bindFibSettingsPanel(
host.settingsPopover,
{
getAlive: host.getAlive,
canApply: host.canApplyFibPanel,
getFibEditShape: host.getFibEditShape,
openColorMenu:(
btn,
fallback
)=>{
host.closeFibColorMenu();
host.openFibColorMenu(
btn,
fallback
);
},
scheduleImmediate: host.scheduleFibApplyImmediate,
scheduleDebounced: host.scheduleFibApplyDebounced,
signal
}
);

host.attachCoordUi(
type,
signal
);

}

export function flushFibPanelForType(host, 
type
){

if(
!host.isFibType(
type
) ||
!host.settingsPopoverHasPanel(
"fib"
) ||
host.fibPanelSyncing
){
return;
}

const panel =
host.readFibSettingsPanel(
host.settingsPopover
);
const shape =
host.getDrawings().find(
d=>
d.id ===
host.fibSettingsShapeId &&
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
shape.fibShowLabels =
panel.fibShowLabels !==
false;
shape.fibTrendLineColor =
host.resolveFibTrendLineColor(
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

host.touchShapeRevisionFn(
shape
);
host.saveDrawings();

}

host.saveToolDefaults(
type,
{
fibDefaultsVersion: host.fibDefaultsVersionFor(
type
),
color: host.activeColor ||
host.STROKE,
lineWidth:
Number.isFinite(
panel.lineWidth
)
? panel.lineWidth
: 1,
fibLevels: panel.fibLevels,
fibShowTrendLine: panel.fibShowTrendLine,
fibShowLabels:
panel.fibShowLabels !==
false,
fibTrendLineColor: host.resolveFibTrendLineColor(
panel.fibTrendLineColor
)
}
);

}

export function commitChannelPanelToShape(host){

if(
!host.getAlive() ||
!host.isChannelSettingsOpen() ||
host.channelPanelSyncing
){
return false;
}

const shape =
host.getChannelEditShape();
const panel =
host.readChannelPanelFromDOM();

if(
!shape
){

const style =
host.readStyleFromUI();

host.saveToolDefaults(
"channel",
{
channelDefaultsVersion:
host.CHANNEL_TOOL_DEFAULTS_VERSION,
color:
style.color ||
host.CHANNEL_DEFAULT_COLOR,
lineWidth:
style.lineWidth,
channelLevels:
panel.channelLevels
}
);

host.redraw();
return true;

}

shape.channelLevels =
JSON.parse(
JSON.stringify(
host.ensureChannelLevelsVisible(
panel.channelLevels
)
)
);

host.touchShapeRevisionFn(
shape
);

host.saveDrawings();
host.redraw();

const style =
host.readStyleFromUI();

host.saveToolDefaults(
"channel",
{
channelDefaultsVersion:
host.CHANNEL_TOOL_DEFAULTS_VERSION,
color:
style.color ||
shape.color ||
host.CHANNEL_DEFAULT_COLOR,
lineWidth:
style.lineWidth ??
shape.lineWidth,
channelLevels:
shape.channelLevels
}
);

return true;

}

export function applyRectSettingsFromPanel(host){

if(
!host.canApplyRectPanel()
){
return;
}

const shape =
host.getRectEditShape();
const panel =
host.readRectPanelFromDOM();

if(
shape
){

shape.lineStyle =
panel.lineStyle;
shape.color =
panel.color;
shape.showHorizLines =
panel.showHorizLines;
shape.showVertLines =
panel.showVertLines;
shape.horizLineStyle =
panel.horizLineStyle;
shape.horizColor =
panel.horizColor;
shape.vertLineStyle =
panel.vertLineStyle;
shape.vertColor =
panel.vertColor;
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

host.touchShapeRevisionFn(
shape
);
host.saveDrawings();
host.redraw();

}

host.saveToolDefaults(
"rectangle",
{
...host.getToolDefaults().rectangle,
...panel,
rectDefaultsVersion:
host.RECT_TOOL_DEFAULTS_VERSION,
lineWidth:
shape?.lineWidth ||
1
}
);

}

export function ensureChannelSettingsPanel(host){

if(
!host.settingsPopover
){
return;
}

if(
host.channelPanelBuilt &&
host.settingsPopoverHasPanel(
"channel"
)
){
return;
}

host.channelPanelBuilt = true;
host.fibPanelBuilt = false;
host.rectPanelBuilt = false;
host.fvpPanelBuilt = false;
host.elliottPanelBuilt = false;
host.coordsOnlyPanelBuilt = false;

const signal =
host.resetSettingsPanelListeners();

host.settingsPopover.classList.remove(
"draw-settings-popover--fvp",
"draw-settings-popover--coords"
);

host.settingsPopover.innerHTML =
host.composeSettingsHtml(
"channel",
host.channelSettingsHtml()
);

host.mountChannelLevelRows(
host.settingsPopover
);

host.bindChannelSettingsPanel(
host.settingsPopover,
{
getAlive: host.getAlive,
canApply: host.canApplyChannelPanel,
getChannelEditShape: host.getChannelEditShape,
openColorMenu:(
btn,
fallback
)=>{
host.closeFibColorMenu();
openChannelColorMenu(host, 
btn,
fallback
);
},
scheduleImmediate: host.scheduleChannelApplyImmediate,
scheduleDebounced: host.scheduleChannelApplyDebounced,
signal
}
);

host.attachCoordUi(
"channel",
signal
);

}

export function ensureRectSettingsPanel(host){

if(
!host.settingsPopover
){
return;
}

if(
host.rectPanelBuilt &&
host.settingsPopoverHasPanel(
"rect"
)
){
return;
}

host.rectPanelBuilt = true;
host.fibPanelBuilt = false;
host.fvpPanelBuilt = false;
host.channelPanelBuilt = false;
host.elliottPanelBuilt = false;
host.coordsOnlyPanelBuilt = false;

const signal =
host.resetSettingsPanelListeners();

host.settingsPopover.classList.remove(
"draw-settings-popover--fvp",
"draw-settings-popover--coords"
);

host.settingsPopover.innerHTML =
host.composeSettingsHtml(
"rectangle",
host.rectSettingsHtml()
);

host.bindRectSettingsPanel(
host.settingsPopover,
{
getAlive: host.getAlive,
canApply: host.canApplyRectPanel,
onApply: (...a)=>applyRectSettingsFromPanel(host, ...a),
getRectEditShape: host.getRectEditShape,
openColorMenu:(
btn,
fallback
)=>{
host.closeFibColorMenu();
openRectColorMenu(host, 
btn,
fallback
);
},
signal
}
);

host.attachCoordUi(
"rectangle",
signal
);

}

export function ensureElliottSettingsPanel(host){

if(
!host.settingsPopover
){
return;
}

if(
host.elliottPanelBuilt &&
host.settingsPopoverHasPanel(
"elliott"
)
){
return;
}

host.elliottPanelBuilt = true;
host.fibPanelBuilt = false;
host.rectPanelBuilt = false;
host.fvpPanelBuilt = false;
host.channelPanelBuilt = false;
host.coordsOnlyPanelBuilt = false;

const signal =
host.resetSettingsPanelListeners();

host.settingsPopover.classList.remove(
"draw-settings-popover--fvp",
"draw-settings-popover--coords"
);

host.settingsPopover.innerHTML =
host.elliottSettingsHtml();

host.bindElliottSettingsPanel(
host.settingsPopover,
{
canApply: host.canApplyElliottPanel,
onApply: (...a)=>applyElliottSettingsFromPanel(host, ...a),
openColorMenu:(
btn,
fallback
)=>{
host.closeFibColorMenu();
openElliottChannelColorMenu(host, 
btn,
fallback
);
},
signal
}
);

}

export function openRectColorMenu(host, 
anchorBtn,
fallbackColor
){

const portal =
host.ensureFibColorMenuPortal();

host.fibColorMenuAnchor =
anchorBtn;

const shape =
host.getRectEditShape();

const isFill =
anchorBtn.classList.contains(
"rect-fill-color-btn"
);

const active =
anchorBtn.style.getPropertyValue(
"--rect-swatch"
)?.trim() ||
fallbackColor ||
host.STROKE;

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
host.RECT_DEFAULT_FILL_OPACITY *
100
)
: 100;

host.mountTvColorPicker(
portal,
{
activeColor: active,
activeOpacity,
onChange: color=>{

anchorBtn.style.setProperty(
"--rect-swatch",
color
);

applyRectSettingsFromPanel(host);

},
onSelect: color=>{

anchorBtn.style.setProperty(
"--rect-swatch",
color
);

host.closeFibColorMenu();
applyRectSettingsFromPanel(host);

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

export function openElliottChannelColorMenu(host, 
anchorBtn,
fallbackColor
){

const portal =
host.ensureFibColorMenuPortal();

host.fibColorMenuAnchor =
anchorBtn;

const active =
anchorBtn.dataset.customColor ||
fallbackColor ||
host.CHANNEL_DEFAULT_COLOR;

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

applyElliottSettingsFromPanel(host);

},
onSelect: color=>{

host.setFibLevelColorButton(
anchorBtn,
color,
fallbackColor
);

host.closeFibColorMenu();
applyElliottSettingsFromPanel(host);

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

export function openChannelColorMenu(host, 
anchorBtn,
fallbackColor
){

const portal =
host.ensureFibColorMenuPortal();

host.fibColorMenuAnchor =
anchorBtn;

const active =
anchorBtn.dataset.customColor ||
fallbackColor ||
host.CHANNEL_DEFAULT_COLOR;

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

commitChannelPanelToShape(host);

},
onSelect: color=>{

host.setFibLevelColorButton(
anchorBtn,
color,
fallbackColor
);

host.closeFibColorMenu();
commitChannelPanelToShape(host);

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
