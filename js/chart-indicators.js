/**
 * Индикаторы на странице Монеты — меню, лимит, легенда на графике.
 */
import {
createAoPaneIndicator
} from "./indicators/ao-pane.js?v=8";
import {
createHorizontalVolumeIndicator
} from "./indicators/horizontal-volume.js?v=10";
import {
createRsiPaneIndicator
} from "./indicators/rsi-pane.js?v=2";
import {
createVolumePaneIndicator
} from "./indicators/volume-pane.js?v=11";
import {
createMovingAverageIndicator
} from "./indicators/moving-average.js?v=14";
import {
createEmaShiftRibbonIndicator
} from "./indicators/ema-shift-ribbon.js?v=6";
import {
createPattern12Indicator
} from "./indicators/pattern-12.js?v=6";
import {
createIndicatorSettingsDialog
} from "./indicators/indicator-settings-dialog.js?v=7";
import {
MAX_ACTIVE_INDICATORS,
canEnableIndicator,
countLimitedActive
} from "./indicators/registry.js?v=1";

import {
isChartLayoutReady
} from "./chart-layout-gate.js?v=2";

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

export function initChartIndicators(
{
root,
getHost,
storageKey =
DEFAULT_STORAGE_KEY
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

const indicators =
[
createRsiPaneIndicator(
getHost
),
createVolumePaneIndicator(
getHost
),
createAoPaneIndicator(
getHost
),
createMovingAverageIndicator(
getHost,
settingsStore
),
createEmaShiftRibbonIndicator(
getHost,
settingsStore
),
createPattern12Indicator(
getHost,
settingsStore
),
createHorizontalVolumeIndicator(
getHost
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

function updateLegend(){

const active =
indicators.filter(
ind=>
ind.isEnabled?.()
);

legendEl.innerHTML =
active.map(
ind=>{
const label =
ind.getLegendLabel?.() ||
ind.legendLabel ||
ind.label;
const hasSettings =
!!ind.supportsSettingsDialog;

return `
<button type="button" class="chart-indicator-legend-item${hasSettings ? " chart-indicator-legend-item--settings" : ""}" data-indicator-id="${ind.id}" ${hasSettings ? 'data-has-settings="true" title="Двойной щелчок — настройки"' : ""}>${label}</button>
`;
}
).join(
""
);

legendEl.classList.toggle(
"hidden",
!active.length
);
legendEl.setAttribute(
"aria-hidden",
active.length
? "false"
: "true"
);

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

settingsDialog.show(
ind,
{
onClose:()=>{
updateLegend();
getHost?.()?.getDrawingTools?.()?.scheduleRedraw?.();
}
}
);

}

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

applyPrefs();

return {
notifyLayoutChange,
notifySymbolChange,
notifyCandlesUpdate,
notifyLayoutSettled,
notifyMainChartOverlaysSync,
flushIndicatorDataRefreshNow,
syncViewports,
resizePanes,
getLinkedPaneCharts,
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
