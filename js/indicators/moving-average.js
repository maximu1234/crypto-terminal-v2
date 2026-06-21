/**
 * SMA / EMA — три линии на основном графике (настраиваемые периоды).
 */
import {
calculateMaPoints
} from "./ma-math.js?v=1";
import {
openIndicatorColorPicker,
previewColorHex,
isValidDrawColor,
closeIndicatorColorPicker
} from "./indicator-color-picker-ui.js?v=1";

export const MOVING_AVERAGE_ID =
"ma";

const LINE_COUNT =
3;

const DEFAULT_LINES =
[
{
period:
50,
color:
"#2962FF"
},
{
period:
100,
color:
"#FF6D00"
},
{
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
settings.lines.map(
line=>
line.period
);

return `${label} ${periods.join(
" "
)}`;

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
settings.lineWidth
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
false
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

function refreshData(){

if(
!enabled
){
return;
}

const candles =
getHost?.()?.getCandles?.() ||
[];

if(
!candles.length ||
!ensureSeries()
){
return;
}

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

series.setData(
calculateMaPoints(
candles,
line.period,
settings.type
)
);

}

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
<div class="ind-ma-settings">
<div class="ind-ma-settings-head">
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
"input"
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

refreshData();

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

function onSymbolChange(){

if(
enabled
){
refreshData();
}

}

function onCandlesUpdate(){

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
enable,
disable,
isEnabled:()=>
enabled,
onSymbolChange,
onCandlesUpdate,
onSettingsDialogClose:()=>{
closeIndicatorColorPicker();
},
destroy:()=>{
disable();
closeIndicatorColorPicker();
}
};

}
