/**
 * SMA / EMA — три линии на основном графике (настраиваемые периоды).
 */
import {
calculateMaPoints,
alignMaPointsToDisplayCandles
} from "./ma-math.js?v=2";

import {
runWithPreservedVisibleLogicalRange
} from "../chart-visible-range.js?v=3";

import {
isChartLayoutReady
} from "../chart-layout-gate.js?v=2";
import {
openIndicatorColorPicker,
previewColorHex,
isValidDrawColor,
closeIndicatorColorPicker
} from "./indicator-color-picker-ui.js?v=1";

import {
formatHtfTfLegend,
htfTfSelectHtml,
normalizeHtfTf,
projectHtfPointsOntoChart,
resolveIndicatorSourceCandles
} from "./htf-project.js?v=5";

export const MOVING_AVERAGE_ID =
"ma";

const LINE_COUNT =
3;

const DEFAULT_LINES =
[
{
show:
true,
period:
50,
color:
"#2962FF"
},
{
show:
true,
period:
100,
color:
"#FF6D00"
},
{
show:
true,
period:
200,
color:
"#AB47BC"
}
];

function defaultSettings(){

return {
type:
"sma",
lineWidth:
1,
tf:
"",
lines:
DEFAULT_LINES.map(
line=>({
...line
})
)
};

}

function clampLineWidth(
value
){

const n =
Number(
value
);

if(
!Number.isFinite(
n
)
){
return 1;
}

return Math.min(
4,
Math.max(
1,
Math.round(
n
)
)
);

}

function clampPeriod(
value,
fallback
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
) ||
n <
1
){
return fallback;
}

return Math.min(
999,
n
);

}

function normalizeSettings(
raw
){

const base =
defaultSettings();
const source =
Array.isArray(
raw?.lines
)
? raw.lines
: [];

return {
type:
raw?.type ===
"ema"
? "ema"
: "sma",
lineWidth:
clampLineWidth(
raw?.lineWidth ??
base.lineWidth
),
tf:
normalizeHtfTf(
raw?.tf
),
lines:
Array.from(
{
length:
LINE_COUNT
},
(
_,
index
)=>{
const fallback =
base.lines[
index
];
const item =
source[
index
] ||
{};

return {
period:
clampPeriod(
item.period,
fallback.period
),
show:
typeof item.show ===
"boolean"
? item.show
: fallback.show,
color:
isValidDrawColor(
item.color
)
? item.color
: fallback.color
};

}
)
};

}

export function createMovingAverageIndicator(
getHost,
settingsStore
){

let enabled =
false;
let settings =
defaultSettings();
const seriesByIndex =
new Map();
let refreshSeq =
0;

function readSettings(){

settings =
normalizeSettings(
settingsStore?.read?.(
MOVING_AVERAGE_ID,
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
MOVING_AVERAGE_ID,
patch
)
);

}

function getLegendText(){

const label =
settings.type ===
"ema"
? "EMA"
: "SMA";

const periods =
settings.lines
.filter(
line=>
line.show
)
.map(
line=>
line.period
);

if(
!periods.length
){
return `${label}${formatHtfTfLegend(
settings.tf
)}`;
}

return `${label} ${periods.join(
" "
)}${formatHtfTfLegend(
settings.tf
)}`;

}

function hideSeries(){

for(
const series of seriesByIndex.values()
){

if(
!series
){
continue;
}

series.setData(
[]
);

try{
series.applyOptions(
{
visible:
false
}
);
}catch{
/* ignore */
}

}

}

function removeSeries(){

const chart =
getHost?.()?.chart;

for(
const series of seriesByIndex.values()
){

if(
!chart ||
!series
){
continue;
}

try{
chart.removeSeries(
series
);
}catch{
/* ignore */
}

}

seriesByIndex.clear();

}

function applySeriesStyle(){

for(
let index =
0;
index <
LINE_COUNT;
index++
){

const series =
seriesByIndex.get(
index
);

const line =
settings.lines[
index
];

if(
!series ||
!line
){
continue;
}

series.applyOptions(
{
color:
previewColorHex(
line.color
),
lineWidth:
settings.lineWidth,
visible:
enabled &&
!!line.show
}
);

}

}

function ensureSeries(){

const chart =
getHost?.()?.chart;

if(
!chart
){
return false;
}

for(
let index =
0;
index <
LINE_COUNT;
index++
){

if(
seriesByIndex.has(
index
)
){
continue;
}

const line =
settings.lines[
index
];

const series =
chart.addLineSeries(
{
color:
previewColorHex(
line?.color
),
lineWidth:
settings.lineWidth,
priceLineVisible:
false,
lastValueVisible:
false,
crosshairMarkerVisible:
false,
visible:
enabled &&
!!line?.show,
autoscaleInfoProvider:
()=>null
}
);

seriesByIndex.set(
index,
series
);

}

applySeriesStyle();
return true;

}

function warmupChartSeries(){

if(
seriesByIndex.size >=
LINE_COUNT
){
return;
}

readSettings();

if(
!ensureSeries()
){
return;
}

hideSeries();

}

function refreshData(){

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
getHost?.();
const chart =
host?.chart;
const candles =
host?.getCandles?.() ||
[];
const displayCandles =
host?.getDisplayCandles?.() ||
candles;

if(
!candles.length ||
!ensureSeries()
){
return;
}

const seq =
++refreshSeq;
const chartTf =
host?.getTf?.() ||
"";

void (
async()=>{

const resolved =
await resolveIndicatorSourceCandles(
{
tf:
settings.tf,
chartTf,
chartCandles:
candles,
symbol:
host?.getSymbol?.(),
loadHistory:
host?.loadIndicatorHistory
}
);

if(
seq !==
refreshSeq ||
!enabled
){
return;
}

runWithPreservedVisibleLogicalRange(
chart,
()=>{

for(
let index =
0;
index <
LINE_COUNT;
index++
){

const series =
seriesByIndex.get(
index
);

const line =
settings.lines[
index
];

if(
!series ||
!line
){
continue;
}

if(
!line.show
){
series.setData(
[]
);

try{
series.applyOptions(
{
visible:
false
}
);
}catch{
/* ignore */
}

continue;
}

try{
series.applyOptions(
{
visible:
true
}
);
}catch{
/* ignore */
}

const sourcePoints =
calculateMaPoints(
resolved.candles,
line.period,
settings.type
);
const chartPoints =
resolved.projected
? projectHtfPointsOntoChart(
candles,
sourcePoints
)
: sourcePoints;
const points =
alignMaPointsToDisplayCandles(
chartPoints,
displayCandles
);

series.setData(
points
);

}

}
);

}
)();

}

function applySettings(
stored
){

settings =
normalizeSettings(
stored ??
settingsStore?.read?.(
MOVING_AVERAGE_ID,
defaultSettings()
)
);

if(
enabled
){
applySeriesStyle();
refreshData();
}

}

function populateSettingsDialog(
root
){

readSettings();

root.innerHTML =
`
<div class="chart-indicator-settings-field">
<span class="chart-indicator-settings-field-label">Тип</span>
<div class="chart-indicators-type-toggle" role="group" aria-label="Тип скользящей средней">
<button type="button" class="chart-indicators-type-btn ${settings.type === "sma" ? "active" : ""}" data-ma-type="sma">SMA</button>
<button type="button" class="chart-indicators-type-btn ${settings.type === "ema" ? "active" : ""}" data-ma-type="ema">EMA</button>
</div>
</div>
${htfTfSelectHtml(
settings.tf
)}
<div class="ind-ma-settings">
<div class="ind-ma-settings-head">
<span></span>
<span class="ind-ma-settings-head-label">Линия</span>
<span class="ind-ma-settings-head-label">Цвет</span>
<span class="ind-ma-settings-head-label">Период</span>
</div>
${settings.lines.map(
(
line,
index
)=>`
<div class="ind-ma-settings-row">
<label class="ind-ribbon-settings-show" title="Показать линию ${index + 1}">
<input type="checkbox" data-line="${index}" data-field="show" ${line.show ? "checked" : ""}/>
</label>
<span class="ind-ma-settings-name">${index + 1}</span>
<button type="button" class="ind-ribbon-settings-color" data-line="${index}" data-field="color" data-color="${line.color}" style="--line-color:${previewColorHex(line.color)}" title="Цвет линии">
<span class="ind-ribbon-settings-color-preview"></span>
</button>
<input type="number" class="chart-indicator-settings-input ind-ribbon-settings-num" data-line="${index}" data-field="period" min="1" max="999" step="1" value="${line.period}" inputmode="numeric"/>
</div>
`
).join(
""
)}
<div class="ind-ribbon-settings-width">
<span class="ind-ribbon-settings-width-label">Толщина линий</span>
<input type="number" class="chart-indicator-settings-input ind-ribbon-settings-num" data-field="lineWidth" min="1" max="4" step="1" value="${settings.lineWidth}" inputmode="numeric"/>
</div>
</div>
`;

function commitTypeToggle(){

root.querySelectorAll(
"[data-ma-type]"
).forEach(
node=>{
node.classList.toggle(
"active",
node.dataset.maType ===
settings.type
);
}
);

}

function commit(){

const next =
defaultSettings();

next.type =
settings.type;
next.tf =
normalizeHtfTf(
root.querySelector(
'[data-field="tf"]'
)?.value
);
next.lineWidth =
clampLineWidth(
root.querySelector(
'[data-field="lineWidth"]'
)?.value
);

next.lines =
settings.lines.map(
(
line,
index
)=>({
show:
root.querySelector(
`[data-line="${index}"][data-field="show"]`
)?.checked ===
true,
period:
clampPeriod(
root.querySelector(
`[data-line="${index}"][data-field="period"]`
)?.value,
line.period
),
color:
root.querySelector(
`button[data-line="${index}"][data-field="color"]`
)?.dataset.color ||
line.color
})
);

persistSettings(
next
);
applySettings(
next
);

root.querySelectorAll(
".ind-ma-settings-row"
).forEach(
(
row,
index
)=>{

const color =
next.lines[
index
]?.color;
const btn =
row.querySelector(
'button[data-field="color"]'
);
const preview =
row.querySelector(
".ind-ribbon-settings-color-preview"
);

if(
btn &&
color
){
btn.dataset.color =
color;
btn.style.setProperty(
"--line-color",
previewColorHex(
color
)
);
}

if(
preview &&
color
){
preview.style.setProperty(
"--line-color",
previewColorHex(
color
)
);
}

}
);

commitTypeToggle();

}

root.querySelectorAll(
"[data-ma-type]"
).forEach(
btn=>{
btn.addEventListener(
"click",
()=>{

settings.type =
btn.dataset.maType ===
"ema"
? "ema"
: "sma";
commitTypeToggle();
commit();

}
);
}
);

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
'button[data-field="color"]'
).forEach(
btn=>{
btn.addEventListener(
"click",
event=>{
event.preventDefault();
event.stopPropagation();

const index =
Number(
btn.dataset.line
);

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
settings.lines[
index
].color =
color;
},
onSelect:()=>{
commit();
}
}
);

}
);
}
);

}

function showSeries(){

for(
let index =
0;
index <
LINE_COUNT;
index++
){

const series =
seriesByIndex.get(
index
);

const line =
settings.lines[
index
];

if(
!series ||
!line
){
continue;
}

try{
series.applyOptions(
{
visible:
!!line.show
}
);
}catch{
/* ignore */
}

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
!ensureSeries()
){
enabled =
false;
return;
}

showSeries();
applySeriesStyle();

requestAnimationFrame(
()=>{
requestAnimationFrame(
()=>{
refreshData();
}
);
}
);

}

function disable(){

if(
!enabled
){
return;
}

enabled =
false;
hideSeries();

}

function clearOverlayData(){

if(
!seriesByIndex.size
){
return;
}

/* No range preserve: caller is about to setData + fit viewport. */
hideSeries();

}

function onSymbolChange(){

if(
!enabled
){
return;
}

clearOverlayData();
void refreshData();

}

function onCandlesUpdate(){

if(
!enabled
){
return;
}

refreshData();

}

function syncMainChartOverlay(){

if(
!enabled
){
return;
}

refreshData();

}

return {
id:
MOVING_AVERAGE_ID,
label:
"SMA / EMA",
legendLabel:
"SMA 50 100 200",
settingsDialogTitle:
"SMA / EMA",
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
warmupChartSeries,
enable,
disable,
clearOverlayData,
isEnabled:()=>
enabled,
syncMainChartOverlay,
onSymbolChange,
onCandlesUpdate,
onSettingsDialogClose:()=>{
closeIndicatorColorPicker();
},
destroy:()=>{
enabled =
false;
removeSeries();
closeIndicatorColorPicker();
}
};

}
