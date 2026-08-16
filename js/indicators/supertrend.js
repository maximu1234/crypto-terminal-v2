/**
 * Supertrend overlay — ATR Length + Factor + TF (как TradingView / EMA Shift Ribbon).
 * Зелёная (up) и красная (down) — отдельные серии на каждый непрерывный кусок
 * (LWC не рвёт одну LineSeries на whitespace).
 */
import {
buildSupertrendChartLineData,
clampSupertrendAtrLength,
clampSupertrendFactor,
DEFAULT_SUPERTREND_ATR_LENGTH,
DEFAULT_SUPERTREND_FACTOR,
splitSupertrendValuedSegments
} from "./supertrend-math.js?v=3";

import {
fetchHtfCandles
} from "./htf-loader.js?v=3";

import {
runWithPreservedVisibleLogicalRange
} from "../chart-visible-range.js?v=3";

import {
isChartLayoutReady
} from "../chart-layout-gate.js?v=2";

import {
closeIndicatorColorPicker,
openIndicatorColorPicker,
previewColorHex,
isValidDrawColor
} from "./indicator-color-picker-ui.js?v=1";

export const SUPERTREND_ID =
"supertrend";

export const SUPERTREND_TF_OPTIONS =
[
{
value:
"",
label:
"Текущий"
},
{
value:
"1",
label:
"1m"
},
{
value:
"5",
label:
"5m"
},
{
value:
"15",
label:
"15m"
},
{
value:
"60",
label:
"1h"
},
{
value:
"240",
label:
"4h"
},
{
value:
"D",
label:
"1D"
}
];

const TF_VALUES =
new Set(
SUPERTREND_TF_OPTIONS.map(
opt=>
opt.value
)
);

const DEFAULT_UP_COLOR =
"#22c55e";

const DEFAULT_DOWN_COLOR =
"#ef4444";

function defaultSettings(){

return {
atrLength:
DEFAULT_SUPERTREND_ATR_LENGTH,
factor:
DEFAULT_SUPERTREND_FACTOR,
tf:
"",
lineWidth:
2,
upColor:
DEFAULT_UP_COLOR,
downColor:
DEFAULT_DOWN_COLOR
};

}

function normalizeTf(
raw
){

const tf =
String(
raw ??
""
).trim();

return TF_VALUES.has(
tf
)
? tf
: "";

}

function normalizeColor(
raw,
fallback
){

const s =
String(
raw ||
""
).trim();

return isValidDrawColor(
s
)
? s
: fallback;

}

function clampLineWidth(
value,
fallback =
2
){

const n =
Math.round(
Number(
value
)
);

if(
!Number.isFinite(
n
)
){
return fallback;
}

return Math.min(
4,
Math.max(
1,
n
)
);

}

function normalizeSettings(
raw
){

const base =
defaultSettings();
const src =
raw &&
typeof raw ===
"object"
? raw
: {};

return {
atrLength:
clampSupertrendAtrLength(
src.atrLength,
base.atrLength
),
factor:
clampSupertrendFactor(
src.factor,
base.factor
),
tf:
normalizeTf(
src.tf
),
lineWidth:
clampLineWidth(
src.lineWidth,
base.lineWidth
),
upColor:
normalizeColor(
src.upColor,
base.upColor
),
downColor:
normalizeColor(
src.downColor,
base.downColor
)
};

}

function resolveTf(
bandTf,
chartTf
){

const tf =
String(
bandTf ||
""
).trim();

return tf ||
String(
chartTf ||
"60"
).trim();

}

/**
 * @param {() => object} getHost
 * @param {{ read: Function, write: Function }} settingsStore
 */
export function createSupertrendIndicator(
getHost,
settingsStore
){

let enabled =
false;
let settings =
defaultSettings();
/** @type {object[]} */
let upPool =
[];
/** @type {object[]} */
let downPool =
[];
let refreshSeq =
0;

function readSettings(){

settings =
normalizeSettings(
settingsStore?.read?.(
SUPERTREND_ID,
defaultSettings()
)
);

}

function persistSettings(
patch
){

settings =
normalizeSettings(
settingsStore?.write?.(
SUPERTREND_ID,
{
...settings,
...patch
}
)
);

}

function getLegendText(){

const tf =
settings.tf
? ` ${settings.tf === "D" ? "1D" : settings.tf === "240" ? "4h" : settings.tf === "60" ? "1h" : settings.tf + "m"}`
: "";

return `Supertrend ${settings.atrLength}/${settings.factor}${tf}`;

}

function getChart(){

return getHost?.()?.chart ||
null;

}

function lineSeriesOptions(
color
){

return {
color,
lineWidth:
settings.lineWidth,
priceLineVisible:
false,
lastValueVisible:
false,
crosshairMarkerVisible:
false,
visible:
enabled,
autoscaleInfoProvider:
()=>
null
};

}

function ensureSegmentSeries(
pool,
color
){

const chart =
getChart();

if(
!chart
){
return null;
}

try{
const series =
chart.addLineSeries(
lineSeriesOptions(
color
)
);
pool.push(
series
);
return series;
}catch{
return null;
}

}

function paintSegmentPool(
pool,
color,
points
){

const segments =
splitSupertrendValuedSegments(
points
);

while(
pool.length <
segments.length
){

if(
!ensureSegmentSeries(
pool,
color
)
){
break;
}

}

for(
let i =
0;
i <
pool.length;
i++
){

const series =
pool[
i
];

if(
!series
){
continue;
}

try{

if(
i <
segments.length
){
series.setData(
segments[
i
]
);
series.applyOptions(
{
color,
lineWidth:
settings.lineWidth,
visible:
enabled
}
);
}else{
series.setData(
[]
);
series.applyOptions(
{
visible:
false
}
);
}

}catch{
/* ignore */
}

}

}

function removeSeries(){

const chart =
getChart();
const pools =
[
upPool,
downPool
];

for(
const pool of pools
){

for(
const series of pool
){

if(
chart &&
series
){
try{
chart.removeSeries(
series
);
}catch{
/* ignore */
}
}

}

pool.length =
0;

}

}

function applySeriesStyle(){

const upColor =
previewColorHex(
settings.upColor
);
const downColor =
previewColorHex(
settings.downColor
);

for(
const series of upPool
){
try{
series.applyOptions(
{
color:
upColor,
lineWidth:
settings.lineWidth,
visible:
enabled
}
);
}catch{
/* ignore */
}
}

for(
const series of downPool
){
try{
series.applyOptions(
{
color:
downColor,
lineWidth:
settings.lineWidth,
visible:
enabled
}
);
}catch{
/* ignore */
}
}

}

async function refreshData(){

if(
!enabled
){
return;
}

if(
!isChartLayoutReady()
){
return;
}

const host =
getHost?.() ||
{};
const chartCandles =
host.getCandles?.() ||
[];

if(
!chartCandles.length ||
!getChart()
){
return;
}

const seq =
++refreshSeq;
const symbol =
host.getSymbol?.();
const chartTf =
host.getTf?.();
const loadHistory =
host.loadIndicatorHistory;

readSettings();
applySeriesStyle();

let sourceCandles =
chartCandles;
const tf =
resolveTf(
settings.tf,
chartTf
);

if(
tf !==
String(
chartTf ||
""
).trim()
){
sourceCandles =
await fetchHtfCandles(
symbol,
tf,
loadHistory,
chartCandles
);
}

if(
seq !==
refreshSeq ||
!enabled
){
return;
}

const lines =
buildSupertrendChartLineData(
chartCandles,
sourceCandles,
settings.atrLength,
settings.factor
);

runWithPreservedVisibleLogicalRange(
getChart(),
()=>{
paintSegmentPool(
upPool,
previewColorHex(
settings.upColor
),
lines.up
);
paintSegmentPool(
downPool,
previewColorHex(
settings.downColor
),
lines.down
);
}
);

}

function populateSettingsDialog(
root
){

if(
!root
){
return;
}

readSettings();

root.innerHTML =
`
<div class="chart-indicator-settings-field">
<span class="chart-indicator-settings-field-label">ATR Length</span>
<input type="number" class="chart-indicator-settings-input" data-field="atrLength" min="1" max="100" step="1" value="${settings.atrLength}" inputmode="numeric"/>
</div>
<div class="chart-indicator-settings-field">
<span class="chart-indicator-settings-field-label">Factor</span>
<input type="number" class="chart-indicator-settings-input" data-field="factor" min="0.1" max="100" step="0.1" value="${settings.factor}" inputmode="decimal"/>
</div>
<div class="chart-indicator-settings-field">
<span class="chart-indicator-settings-field-label">Таймфрейм</span>
<select class="chart-indicator-settings-select" data-field="tf">
${SUPERTREND_TF_OPTIONS.map(
opt=>
`<option value="${opt.value}" ${opt.value === settings.tf ? "selected" : ""}>${opt.label}</option>`
).join(
""
)}
</select>
</div>
<div class="chart-indicator-settings-field">
<span class="chart-indicator-settings-field-label">Толщина</span>
<input type="number" class="chart-indicator-settings-input" data-field="lineWidth" min="1" max="4" step="1" value="${settings.lineWidth}" inputmode="numeric"/>
</div>
<div class="chart-indicator-settings-field">
<span class="chart-indicator-settings-field-label">Up (зелёная)</span>
<button type="button" class="ind-ribbon-settings-color" data-field="upColor" data-color="${settings.upColor}" style="--line-color:${previewColorHex(settings.upColor)}" title="Цвет up">
<span class="ind-ribbon-settings-color-preview"></span>
</button>
</div>
<div class="chart-indicator-settings-field">
<span class="chart-indicator-settings-field-label">Down (красная)</span>
<button type="button" class="ind-ribbon-settings-color" data-field="downColor" data-color="${settings.downColor}" style="--line-color:${previewColorHex(settings.downColor)}" title="Цвет down">
<span class="ind-ribbon-settings-color-preview"></span>
</button>
</div>
`;

function commit(){

const atrEl =
root.querySelector(
'[data-field="atrLength"]'
);
const factorEl =
root.querySelector(
'[data-field="factor"]'
);
const tfEl =
root.querySelector(
'[data-field="tf"]'
);
const widthEl =
root.querySelector(
'[data-field="lineWidth"]'
);
const upBtn =
root.querySelector(
'[data-field="upColor"]'
);
const downBtn =
root.querySelector(
'[data-field="downColor"]'
);

persistSettings(
{
atrLength:
atrEl?.value,
factor:
factorEl?.value,
tf:
tfEl?.value,
lineWidth:
widthEl?.value,
upColor:
upBtn?.dataset.color,
downColor:
downBtn?.dataset.color
}
);

if(
enabled
){
void refreshData();
}

}

root.querySelectorAll(
"input, select"
).forEach(
el=>{
el.addEventListener(
"change",
commit
);
}
);

root.querySelectorAll(
'button[data-field="upColor"], button[data-field="downColor"]'
).forEach(
btn=>{
btn.addEventListener(
"click",
event=>{
event.preventDefault();
event.stopPropagation();

openIndicatorColorPicker(
{
anchorEl:
btn,
color:
btn.dataset.color,
onChange:(
color
)=>{
btn.dataset.color =
color;
btn.style.setProperty(
"--line-color",
previewColorHex(
color
)
);
commit();
}
}
);
}
);
}
);

}

function applySettings(){

readSettings();

if(
enabled
){
void refreshData();
}

}

function enable(){

if(
enabled
){
return;
}

readSettings();
enabled =
true;

if(
!getChart()
){
enabled =
false;
return;
}

applySeriesStyle();
void refreshData();

}

function disable(){

if(
!enabled
){
return;
}

enabled =
false;
removeSeries();

}

function clearOverlayData(){

for(
const series of upPool
){
try{
series.setData(
[]
);
}catch{
/* ignore */
}
}

for(
const series of downPool
){
try{
series.setData(
[]
);
}catch{
/* ignore */
}
}

}

function onCandlesUpdate(){

if(
!enabled
){
return;
}

void refreshData();

}

function onSymbolChange(){

clearOverlayData();

if(
enabled
){
void refreshData();
}

}

function destroy(){

enabled =
false;
closeIndicatorColorPicker();
removeSeries();

}

return {
id:
SUPERTREND_ID,
label:
"Supertrend",
legendLabel:
"Supertrend",
settingsDialogTitle:
"Supertrend",
settingsDialogClass:
"chart-indicator-settings-dialog--compact",
exemptFromLimit:
false,
defaultEnabled:
false,
supportsSettingsDialog:
true,
getLegendLabel:
getLegendText,
populateSettingsDialog,
applySettings,
enable,
disable,
clearOverlayData,
isEnabled:()=>
enabled,
onSymbolChange,
onCandlesUpdate,
onSettingsDialogClose:()=>{
closeIndicatorColorPicker();
},
destroy
};

}
