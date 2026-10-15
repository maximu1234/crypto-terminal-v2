/**
 * Индикаторы на странице Монеты — меню, лимит, легенда на графике.
 * Indicator factories load via dynamic import() inside initChartIndicators.
 */
import {
MAX_ACTIVE_INDICATORS,
canEnableIndicator,
countLimitedActive
} from "./indicators/registry.js?v=760a1a23";

import {
beginChromeOverlay,
endChromeOverlay,
isChartLayoutReady
} from "./chart-layout-gate.js?v=4a8798af";

const DEFAULT_STORAGE_KEY =
"chart_indicators_v1";

function readPrefs(
storageKey =
DEFAULT_STORAGE_KEY
){

try{
const raw =
localStorage.getItem(
storageKey
);

if(
!raw
){
return {};
}

const parsed =
JSON.parse(
raw
);

return parsed &&
typeof parsed ===
"object"
? parsed
: {};
}catch{
return {};
}

}

function writePrefs(
prefs,
storageKey =
DEFAULT_STORAGE_KEY
){

localStorage.setItem(
storageKey,
JSON.stringify(
prefs
)
);

}

function createIndicatorSettingsStore(
prefsRef,
storageKey =
DEFAULT_STORAGE_KEY
){

return {
read(
id,
defaults =
{}
){

const stored =
prefsRef[
`settings_${id}`
];

return stored &&
typeof stored ===
"object"
? {
...defaults,
...stored
}
: {
...defaults
};

},
write(
id,
patch
){

const next =
{
...this.read(
id
),
...patch
};

prefsRef[
`settings_${id}`
] =
next;
writePrefs(
prefsRef,
storageKey
);
return next;

}
};

}

function closeIndicatorMenus(
exceptMenu
){

document.querySelectorAll(
".chart-indicators-menu"
).forEach(
menu=>{
if(
menu !==
exceptMenu
){
menu.classList.add(
"hidden"
);
}
}
);

document.querySelectorAll(
".chart-indicators-btn"
).forEach(
btn=>{
if(
!exceptMenu?.contains?.(
btn
) &&
btn !==
exceptMenu?.previousElementSibling
){
btn.setAttribute(
"aria-expanded",
"false"
);
}
}
);

}

export async function initChartIndicators(
{
root,
getHost,
storageKey =
DEFAULT_STORAGE_KEY,
createPattern12Indicator:
createPattern12IndicatorOverride,
extraIndicators =
[],
skipApplyPrefs =
false
}
){

if(
!root
){
return null;
}

const prefsKey =
storageKey ||
DEFAULT_STORAGE_KEY;

const prefs =
readPrefs(
prefsKey
);

const settingsStore =
createIndicatorSettingsStore(
prefs,
prefsKey
);

const [
{
createRsiPaneIndicator
},
{
createVolumePaneIndicator
},
{
createAoPaneIndicator
},
{
createMacdPaneIndicator
},
{
createMovingAverageIndicator
},
{
createEmaShiftRibbonIndicator
},
{
createSupertrendIndicator
},
pattern12Mod,
{
createHorizontalVolumeIndicator
},
{
createVolumeBubblesIndicator
},
{
createIndicatorSettingsDialog
}
] =
await Promise.all(
[
import(
"./indicators/rsi-pane.js?v=f7536a67"
),
import(
"./indicators/volume-pane.js?v=e48e583a"
),
import(
"./indicators/ao-pane.js?v=312fa92a"
),
import(
"./indicators/macd-pane.js?v=23a67818"
),
import(
"./indicators/moving-average.js?v=7664f7e3"
),
import(
"./indicators/ema-shift-ribbon.js?v=ed6186e1"
),
import(
"./indicators/supertrend.js?v=113e8867"
),
typeof createPattern12IndicatorOverride ===
"function"
? Promise.resolve(
{
createPattern12Indicator:
createPattern12IndicatorOverride
}
)
: import(
"./indicators/pattern-12.js?v=4570161f"
),
import(
"./indicators/horizontal-volume.js?v=cbaa09eb"
),
import(
"./indicators/volume-bubbles.js?v=3cab9f85"
),
import(
"./indicators/indicator-settings-dialog.js?v=33a501fb"
)
]
);

const pattern12Factory =
pattern12Mod.createPattern12Indicator;

const indicators =
[
createRsiPaneIndicator(
getHost,
settingsStore
),
createVolumePaneIndicator(
getHost
),
createAoPaneIndicator(
getHost
),
createMacdPaneIndicator(
getHost,
settingsStore
),
createMovingAverageIndicator(
getHost,
settingsStore
),
createEmaShiftRibbonIndicator(
getHost,
settingsStore
),
createSupertrendIndicator(
getHost,
settingsStore
),
pattern12Factory(
getHost,
settingsStore
),
...((
Array.isArray(
extraIndicators
)
? extraIndicators
: []
).filter(
create=>
typeof create ===
"function"
).map(
create=>
create(
getHost,
settingsStore
)
)),
createHorizontalVolumeIndicator(
getHost
),
createVolumeBubblesIndicator(
getHost,
settingsStore
)
];

const byId =
new Map(
indicators.map(
ind=>[
ind.id,
ind
]
)
);

for(
const ind of indicators
){
ind.warmupChartSeries?.();
}

const chartWrap =
getHost?.()?.wrapEl ||
null;

const legendEl =
document.createElement(
"div"
);

legendEl.className =
"chart-indicator-legend hidden";
legendEl.setAttribute(
"aria-hidden",
"true"
);

/* Какой набор кнопок сейчас в DOM (id + hasSettings).
   На тиках меняется только текст (AO …) — кнопки не трогаем,
   иначе клик по настройкам срывается и легенда мигает. */
let legendStructureKey =
"";

chartWrap?.appendChild(
legendEl
);

const settingsDialog =
createIndicatorSettingsDialog(
{
getDragBoundsEl:()=>{

const wrap =
getHost?.()?.wrapEl;

return wrap?.closest?.(
"#charts-stack-panes"
) ||
wrap ||
document.getElementById(
"charts-stack-panes"
);

}
}
);

root.innerHTML =
`
<button type="button" class="chart-indicators-btn" id="chart-indicators-btn" aria-haspopup="true" aria-expanded="false" title="Индикаторы" aria-label="Индикаторы">
<span class="chart-indicators-btn-icon" aria-hidden="true"></span>
</button>
<div class="chart-indicators-menu hidden" id="chart-indicators-menu" role="menu">
${indicators.map(
ind=>`
<label class="chart-indicators-item" role="menuitemcheckbox" data-indicator-id="${ind.id}">
<input type="checkbox" data-indicator-id="${ind.id}"/>
<span>${ind.label}</span>
</label>
`
).join(
""
)}
<p class="chart-indicators-limit-note">Не более ${MAX_ACTIVE_INDICATORS} индикаторов одновременно (RSI не в счёт)</p>
</div>
`;

const btn =
root.querySelector(
"#chart-indicators-btn"
);
const menu =
root.querySelector(
"#chart-indicators-menu"
);

function legendItemLabel(
ind
){

return ind.getLegendLabel?.() ||
ind.legendLabel ||
ind.label ||
"";

}

function rebuildLegend(
items
){

legendEl.innerHTML =
items.map(
item=>
`<button type="button" class="chart-indicator-legend-item${item.hasSettings ? " chart-indicator-legend-item--settings" : ""}" data-indicator-id="${item.id}"${item.hasSettings ? ' data-has-settings="true" title="Клик — настройки"' : ""}>${item.label}</button>`
).join(
""
);

}

function updateLegend(){

const active =
indicators.filter(
ind=>
ind.isEnabled?.()
);

const items =
active.map(
ind=>({
id:
ind.id,
label:
legendItemLabel(
ind
),
hasSettings:
!!ind.supportsSettingsDialog
})
);

const structureKey =
items.map(
item=>
`${item.id}:${item.hasSettings ? "1" : "0"}`
).join(
"|"
);

legendEl.classList.toggle(
"hidden",
!items.length
);
legendEl.setAttribute(
"aria-hidden",
items.length
? "false"
: "true"
);

if(
!items.length
){
legendStructureKey =
"";
legendEl.innerHTML =
"";
return;
}

if(
structureKey !==
legendStructureKey
){
legendStructureKey =
structureKey;
rebuildLegend(
items
);
return;
}

const buttons =
legendEl.querySelectorAll(
"[data-indicator-id]"
);

if(
buttons.length !==
items.length
){
legendStructureKey =
structureKey;
rebuildLegend(
items
);
return;
}

for(
let i =
0;
i <
items.length;
i++
){

const btn =
buttons[
i
];
const item =
items[
i
];

if(
!btn ||
btn.dataset.indicatorId !==
item.id
){
legendStructureKey =
structureKey;
rebuildLegend(
items
);
return;
}

if(
btn.innerHTML !==
item.label
){
btn.innerHTML =
item.label;
}

}

}

function openIndicatorSettings(
id
){

const ind =
byId.get(
id
);

if(
!ind?.supportsSettingsDialog ||
!ind?.populateSettingsDialog
){
return;
}

let pinnedRange =
null;
let chromeHeld =
false;

function releaseSettingsChartGuard(){

if(
pinnedRange &&
getHost?.()?.chart
){

try{
getHost().chart.timeScale().setVisibleLogicalRange(
pinnedRange
);
}catch{
/* ignore */
}

}

pinnedRange =
null;

if(
chromeHeld
){
endChromeOverlay();
chromeHeld =
false;
}

}

settingsDialog.show(
ind,
{
onOpen:()=>{

beginChromeOverlay();
chromeHeld =
true;

try{
pinnedRange =
getHost?.()?.chart?.timeScale?.().getVisibleLogicalRange?.() ||
null;
}catch{
pinnedRange =
null;
}

},
onClose:()=>{
releaseSettingsChartGuard();
updateLegend();
getHost?.()?.getDrawingTools?.()?.scheduleRedraw?.();
}
}
);

}

function renderIndicatorSettingsInline(
id,
container
){

const ind =
byId.get(
id
);

if(
!container ||
!ind?.populateSettingsDialog
){
return false;
}

container.innerHTML =
"";
ind.populateSettingsDialog(
container,
{
close:()=>{}
}
);

return true;

}

legendEl.addEventListener(
"pointerdown",
event=>{

const item =
event.target.closest(
"[data-indicator-id]"
);

if(
!item?.dataset?.hasSettings
){
return;
}

/* Не отдавать жест графику — иначе pan/from≈0 и ленивая история гасят свечи.
   preventDefault не ставим: на touch иначе пропадёт click. */
event.stopPropagation();

}
);

legendEl.addEventListener(
"click",
event=>{

const item =
event.target.closest(
"[data-indicator-id]"
);

if(
!item?.dataset?.hasSettings
){
return;
}

/* Single click opens settings (dblclick also works). */
event.preventDefault();
event.stopPropagation();
openIndicatorSettings(
item.dataset.indicatorId
);

}
);

legendEl.addEventListener(
"dblclick",
event=>{

const item =
event.target.closest(
"[data-indicator-id]"
);

if(
!item?.dataset?.hasSettings
){
return;
}

event.preventDefault();
event.stopPropagation();
openIndicatorSettings(
item.dataset.indicatorId
);

}
);

function updateMenuAvailability(){

const atLimit =
countLimitedActive(
indicators
) >=
MAX_ACTIVE_INDICATORS;

menu?.querySelectorAll(
".chart-indicators-item"
).forEach(
row=>{
const id =
row.dataset.indicatorId;
const ind =
byId.get(
id
);

if(
!ind
){
return;
}

const input =
row.querySelector(
"input"
);
const blocked =
atLimit &&
!ind.exemptFromLimit &&
!ind.isEnabled?.();

row.classList.toggle(
"is-limit-blocked",
blocked
);

if(
input
){
input.disabled =
blocked;
}
}
);

}

function setIndicatorEnabled(
id,
on,
input
){

const ind =
byId.get(
id
);

if(
!ind
){
return false;
}

if(
on &&
!canEnableIndicator(
indicators,
ind
)
){
if(
input
){
input.checked =
false;
}
updateMenuAvailability();
return false;
}

if(
on
){
ind.enable();
}else{
ind.disable();
}

prefs[
id
] =
!!on;
writePrefs(
prefs,
prefsKey
);

updateLegend();
updateMenuAvailability();

requestAnimationFrame(
()=>{
requestAnimationFrame(
()=>{
getHost?.()?.getDrawingTools?.()?.scheduleRedraw?.();
}
);
}
);

return true;

}

function applyPrefs(){

indicators.forEach(
ind=>{
const pref =
prefs[
ind.id
];
const on =
pref !==
undefined
? !!pref
: !!ind.defaultEnabled;
const input =
menu.querySelector(
`input[data-indicator-id="${ind.id}"]`
);

if(
input
){
input.checked =
on;
}

if(
on
){
if(
!canEnableIndicator(
indicators,
ind
)
){
ind.disable();
if(
input
){
input.checked =
false;
}
return;
}

ind.enable();
}else{
ind.disable();
}

}
);

updateLegend();
updateMenuAvailability();
notifyLayoutChange();

}

function notifyLayoutChange(){

indicators.forEach(
ind=>
ind.onLayoutChange?.()
);

}

let indicatorRefreshRaf =
0;
let pendingSymbolRefresh =
false;
let pendingCandlesRefresh =
false;

function flushIndicatorDataRefresh(){

indicatorRefreshRaf =
0;

if(
!isChartLayoutReady()
){
return;
}

if(
pendingSymbolRefresh
){

pendingSymbolRefresh =
false;
pendingCandlesRefresh =
false;

indicators.forEach(
ind=>
ind.onSymbolChange?.()
);
updateLegend();

return;

}

if(
pendingCandlesRefresh
){

pendingCandlesRefresh =
false;

indicators.forEach(
ind=>
ind.onCandlesUpdate?.()
);
updateLegend();

}

}

function flushIndicatorDataRefreshNow(){

if(
indicatorRefreshRaf
){

cancelAnimationFrame(
indicatorRefreshRaf
);

indicatorRefreshRaf =
0;

}

flushIndicatorDataRefresh();

}

function scheduleIndicatorDataRefresh(){

if(
!isChartLayoutReady()
){
return;
}

if(
indicatorRefreshRaf
){
return;
}

indicatorRefreshRaf =
requestAnimationFrame(
flushIndicatorDataRefresh
);

}

function notifySymbolChange(){

pendingSymbolRefresh =
true;
scheduleIndicatorDataRefresh();

}

function notifyCandlesUpdate(){

pendingCandlesRefresh =
true;
scheduleIndicatorDataRefresh();

}

function clearMainChartOverlays(){

indicators.forEach(
ind=>
ind.clearOverlayData?.()
);

}

function notifyMainChartOverlaysSync(){

if(
!isChartLayoutReady()
){
return;
}

indicators.forEach(
ind=>
ind.syncMainChartOverlay?.()
);
updateLegend();

}

function notifyLayoutSettled(){

scheduleIndicatorDataRefresh();
notifyMainChartOverlaysSync();

}

function syncViewports(
ctx
){

indicators.forEach(
ind=>
ind.syncViewport?.(
ctx
)
);

}

function resizePanes(
width
){

indicators.forEach(
ind=>
ind.onResize?.(
width
)
);

}

function getLinkedPaneCharts(){

return indicators
.filter(
ind=>
ind.isEnabled?.() &&
ind.getChart?.()
)
.map(
ind=>
ind.getChart()
)
.filter(
Boolean
);

}

btn?.addEventListener(
"click",
event=>{
event.stopPropagation();

const open =
menu?.classList.contains(
"hidden"
);

closeIndicatorMenus(
open
? menu
: null
);

if(
open
){
menu?.classList.remove(
"hidden"
);
btn?.setAttribute(
"aria-expanded",
"true"
);
updateMenuAvailability();
}else{
menu?.classList.add(
"hidden"
);
btn?.setAttribute(
"aria-expanded",
"false"
);
}

}
);

menu?.addEventListener(
"click",
event=>{
event.stopPropagation();
}
);

menu?.querySelectorAll(
"input[data-indicator-id]"
).forEach(
input=>{
input.addEventListener(
"change",
()=>{
setIndicatorEnabled(
input.dataset.indicatorId,
input.checked,
input
);
getHost?.()?.onIndicatorToggle?.(
input.dataset.indicatorId,
input.checked
);
}
);
}
);

const onDocPointerDown =
event=>{

if(
root.contains(
event.target
)
){
return;
}

menu?.classList.add(
"hidden"
);
btn?.setAttribute(
"aria-expanded",
"false"
);

};

document.addEventListener(
"pointerdown",
onDocPointerDown,
true
);

if(
!skipApplyPrefs
){
applyPrefs();
}

return {
notifyLayoutChange,
notifySymbolChange,
notifyCandlesUpdate,
notifyLayoutSettled,
notifyMainChartOverlaysSync,
clearMainChartOverlays,
flushIndicatorDataRefreshNow,
syncViewports,
resizePanes,
getLinkedPaneCharts,
getIndicator(
id
){

return byId.get(
id
) ||
null;

},
openSettings:
openIndicatorSettings,
openIndicatorSettings,
setIndicatorEnabled,
renderIndicatorSettingsInline,
destroy:()=>{
settingsDialog.destroy();
document.removeEventListener(
"pointerdown",
onDocPointerDown,
true
);
indicators.forEach(
ind=>
ind.destroy?.()
);
legendEl.remove();
root.innerHTML =
"";
}
};

}
