/**
 * EMA Shift Ribbon — до 4 EMA с вертикальным сдвигом (%) и HTF.
 */
import {
clearAllHtfCache,
fetchHtfCandles
} from "./htf-loader.js?v=1";
import {
calculateShiftedEmaSeries
} from "./htf-ema.js?v=1";
import {
closeIndicatorColorPicker,
openIndicatorColorPicker,
previewColorHex,
isValidDrawColor
} from "./indicator-color-picker-ui.js?v=1";

export const EMA_SHIFT_RIBBON_ID =
"ema-shift-ribbon";

export const TF_OPTIONS =
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

const DEFAULT_COLORS =
[
"#22c55e",
"#facc15",
"#22d3ee",
"#ef4444"
];

function defaultSettings(){

return {
lineWidth:
1,
bands:
[
{
show:
true,
length:
21,
shift:
-12,
tf:
"D",
color:
DEFAULT_COLORS[
0
]
},
{
show:
true,
length:
100,
shift:
-22,
tf:
"D",
color:
DEFAULT_COLORS[
1
]
},
{
show:
false,
length:
50,
shift:
-32.5,
tf:
"D",
color:
DEFAULT_COLORS[
2
]
},
{
show:
false,
length:
21,
shift:
8,
tf:
"D",
color:
DEFAULT_COLORS[
3
]
}
]
};

}

function normalizeSettings(
raw
){

const base =
defaultSettings();

if(
!raw ||
typeof raw !==
"object"
){
return base;
}

const bands =
Array.isArray(
raw.bands
)
? raw.bands
: base.bands;

return {
lineWidth:
Math.max(
1,
Math.min(
4,
Number(
raw.lineWidth
) ||
base.lineWidth
)
),
bands:
base.bands.map(
(
fallback,
index
)=>{
const row =
bands[
index
] ||
{};

const shiftNum =
Number(
row.shift
);

return {
show:
typeof row.show ===
"boolean"
? row.show
: fallback.show,
length:
Math.max(
1,
Math.round(
Number(
row.length
) ||
fallback.length
)
),
shift:
Number.isFinite(
shiftNum
)
? shiftNum
: fallback.shift,
tf:
String(
row.tf ??
fallback.tf
).trim(),
color:
isValidDrawColor(
row.color
)
? String(
row.color
)
: fallback.color
};
}
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

export function createEmaShiftRibbonIndicator(
getHost,
settingsStore
){

let enabled =
false;
let settings =
defaultSettings();
let refreshSeq =
0;
const seriesByIndex =
new Map();

function readSettings(){

settings =
normalizeSettings(
settingsStore?.read?.(
EMA_SHIFT_RIBBON_ID,
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
EMA_SHIFT_RIBBON_ID,
patch
)
);
}

function getLegendText(){

const visible =
settings.bands.filter(
band=>
band.show
);

if(
!visible.length
){
return "EMA Shift Ribbon";
}

const parts =
visible.map(
band=>{
const tf =
band.tf
? ` ${band.tf}`
: "";
const shift =
band.shift
? ` ${band.shift > 0 ? "+" : ""}${band.shift}%`
: "";
return `${band.length}${shift}${tf}`;
}
);

return `EMA Shift Ribbon ${parts.join(
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

function ensureSeries(){

const chart =
getHost?.()?.chart;

if(
!chart
){
return false;
}

for(
let i =
0;
i <
4;
i++
){

if(
seriesByIndex.has(
i
)
){
continue;
}

const series =
chart.addLineSeries(
{
color:
settings.bands[
i
]?.color ||
DEFAULT_COLORS[
i
],
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
i,
series
);

}

for(
const [
index,
series
] of seriesByIndex
){

const band =
settings.bands[
index
];

series.applyOptions(
{
lineWidth:
settings.lineWidth,
color:
band?.color ||
DEFAULT_COLORS[
index
]
}
);

}

return true;

}

async function refreshData(){

if(
!enabled
){
return;
}

const host =
getHost?.();
const chartCandles =
host?.getCandles?.() ||
[];

if(
!chartCandles.length ||
!ensureSeries()
){
return;
}

const seq =
++refreshSeq;
const symbol =
host?.getSymbol?.();
const chartTf =
host?.getTf?.();
const loadHistory =
host?.loadIndicatorHistory;

readSettings();

for(
let i =
0;
i <
settings.bands.length;
i++
){

const band =
settings.bands[
i
];
const series =
seriesByIndex.get(
i
);

if(
!series
){
continue;
}

if(
!band.show
){
series.setData(
[]
);
continue;
}

const tf =
resolveTf(
band.tf,
chartTf
);

let sourceCandles =
chartCandles;

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
loadHistory
);

}

if(
seq !==
refreshSeq ||
!enabled
){
return;
}

const points =
calculateShiftedEmaSeries(
chartCandles,
sourceCandles,
band.length,
band.shift
);

series.setData(
points
);

}

host?.settleChartViewport?.();

}

function applySettings(
nextSettings
){

settings =
normalizeSettings(
nextSettings
);

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
!ensureSeries()
){
enabled =
false;
return;
}

void refreshData();

}

function disable(){

if(
!enabled
){
return;
}

refreshSeq++;
enabled =
false;
removeSeries();

}

function onSymbolChange(){

clearAllHtfCache();

if(
!enabled
){
return;
}

void refreshData();

}

function onCandlesUpdate(){

if(
!enabled
){
return;
}

void refreshData();

}

function populateSettingsDialog(
root,
{
close
}
){

readSettings();

root.innerHTML =
`
<div class="ind-ribbon-settings">
<div class="ind-ribbon-settings-head">
<span></span>
<span></span>
<span class="ind-ribbon-settings-head-label">Цвет</span>
<span class="ind-ribbon-settings-head-label">Длина</span>
<span class="ind-ribbon-settings-head-label">Сдвиг</span>
<span class="ind-ribbon-settings-head-label">TF</span>
</div>
${settings.bands.map(
(
band,
index
)=>`
<div class="ind-ribbon-settings-row">
<label class="ind-ribbon-settings-show" title="Показать EMA ${index + 1}">
<input type="checkbox" data-band="${index}" data-field="show" ${band.show ? "checked" : ""}/>
</label>
<span class="ind-ribbon-settings-name">EMA ${index + 1}</span>
<button type="button" class="ind-ribbon-settings-color" data-band="${index}" data-field="color" data-color="${band.color}" style="--line-color:${previewColorHex(band.color)}" title="Цвет линии">
<span class="ind-ribbon-settings-color-preview"></span>
</button>
<input type="number" class="chart-indicator-settings-input ind-ribbon-settings-num" data-band="${index}" data-field="length" min="1" step="1" value="${band.length}" inputmode="numeric"/>
<input type="number" class="chart-indicator-settings-input ind-ribbon-settings-num ind-ribbon-settings-shift" data-band="${index}" data-field="shift" step="0.1" value="${band.shift}" inputmode="decimal"/>
<select class="chart-indicator-settings-select ind-ribbon-settings-tf" data-band="${index}" data-field="tf">
${TF_OPTIONS.map(
opt=>`
<option value="${opt.value}" ${opt.value === band.tf ? "selected" : ""}>${opt.label}</option>
`
).join(
""
)}
</select>
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

function commit(){

const next =
defaultSettings();

next.lineWidth =
Number(
root.querySelector(
'[data-field="lineWidth"]'
)?.value
) ||
1;

for(
let i =
0;
i <
4;
i++
){

next.bands[
i
].show =
root.querySelector(
`[data-band="${i}"][data-field="show"]`
)?.checked ===
true;

next.bands[
i
].length =
Number(
root.querySelector(
`[data-band="${i}"][data-field="length"]`
)?.value
) ||
next.bands[
i
].length;

const shiftVal =
Number(
root.querySelector(
`[data-band="${i}"][data-field="shift"]`
)?.value
);

next.bands[
i
].shift =
Number.isFinite(
shiftVal
)
? shiftVal
: next.bands[
i
].shift;

next.bands[
i
].tf =
root.querySelector(
`[data-band="${i}"][data-field="tf"]`
)?.value ??
next.bands[
i
].tf;

next.bands[
i
].color =
root.querySelector(
`button[data-band="${i}"][data-field="color"]`
)?.dataset.color ||
next.bands[
i
].color;

}

persistSettings(
next
);
applySettings(
next
);

root.querySelectorAll(
".ind-ribbon-settings-row"
).forEach(
(
row,
index
)=>{

const color =
next.bands[
index
]?.color;

const preview =
row.querySelector(
".ind-ribbon-settings-color-preview"
);
const btn =
row.querySelector(
"button[data-field=\"color\"]"
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

}

root.querySelectorAll(
"input:not([type=color]), select"
).forEach(
el=>{
el.addEventListener(
"change",
commit
);
}
);

root.querySelectorAll(
"button[data-field=\"color\"]"
).forEach(
btn=>{
btn.addEventListener(
"click",
event=>{
event.preventDefault();
event.stopPropagation();

const index =
Number(
btn.dataset.band
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
settings.bands[
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

return {
id:
EMA_SHIFT_RIBBON_ID,
label:
"EMA Shift Ribbon",
legendLabel:
"EMA Shift Ribbon",
settingsDialogTitle:
"EMA Shift Ribbon",
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
clearAllHtfCache();
closeIndicatorColorPicker();
}
};

}
