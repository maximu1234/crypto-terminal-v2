/**
 * Volume — гистограмма внизу панели цены (как на TradingView).
 */
import {
runWithPreservedVisibleLogicalRange
} from "../chart-visible-range.js?v=fe893946";

export const VOLUME_PANE_ID =
"volume";

const VOLUME_OPACITY_KEY =
"chart_volume_bar_opacity_v1";

const VOLUME_OPACITY_DEFAULT =
0.72;

const VOLUME_SCALE_ID =
"volume-overlay";

const VOLUME_SCALE_TOP =
0.75;

function clampOpacity(
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
return VOLUME_OPACITY_DEFAULT;
}

return Math.min(
1,
Math.max(
0.05,
Math.round(
n * 100
) / 100
)
);

}

function readOpacity(){

try{
const raw =
localStorage.getItem(
VOLUME_OPACITY_KEY
);

if(
raw ==
null ||
raw ===
""
){
return VOLUME_OPACITY_DEFAULT;
}

return clampOpacity(
raw
);
}catch{
return VOLUME_OPACITY_DEFAULT;
}

}

function writeOpacity(
value
){

const next =
clampOpacity(
value
);

try{
localStorage.setItem(
VOLUME_OPACITY_KEY,
String(
next
)
);
}catch{
/* ignore */
}

return next;

}

function buildVolumeDisplayPoints(
candles
){

if(
!candles?.length
){
return [];
}

/*
 * Только реальные свечи. Пустые точки «в будущее» уже стоят
 * на серии цены. Нули на тех же временах сдвигают шкалу и
 * на несколько секунд оставляют график пустым.
 */
return candles.map(
bar=>({
time:
bar.time,
volume:
Number(
bar.volume
) ||
0,
open:
bar.open,
close:
bar.close
})
);

}

function volumeBarColor(
bar,
opacity
){

if(
bar.volume ==
null ||
bar.volume <=
0
){
return "rgba(120,123,134,0.35)";
}

const rgb =
bar.close >=
bar.open
? "38, 166, 154"
: "239, 68, 68";

return `rgba(${rgb}, ${opacity})`;

}

export function createVolumePaneIndicator(
getHost
){

let enabled =
false;
let series =
null;
let boundChart =
null;
let opacity =
readOpacity();
let paintedKey =
"";

function wrapEl(){

return document.getElementById(
"volume-wrap"
);

}

function hideSeparatePane(){

wrapEl()?.classList.add(
"indicator-pane-hidden"
);

}

function mainChart(){

return getHost?.()?.chart ||
null;

}

function pinVolumeScale(){

if(
!series
){
return;
}

try{
const hostChart =
boundChart ||
mainChart();

hostChart?.priceScale(
VOLUME_SCALE_ID
).applyOptions(
{
scaleMargins:{
top:
VOLUME_SCALE_TOP,
bottom:
0
},
visible:
false,
borderVisible:
false
}
);
}catch{
/* ignore */
}

}

function dropSeries(){

const chart =
boundChart;
const histogram =
series;

series =
null;
boundChart =
null;
paintedKey =
"";

if(
!chart ||
!histogram
){
return;
}

runWithPreservedVisibleLogicalRange(
chart,
()=>{

try{
chart.removeSeries(
histogram
);
}catch{
/* ignore */
}

}
);

}

function ensureSeries(){

const hostChart =
mainChart();

if(
!hostChart
){
return false;
}

if(
series &&
boundChart ===
hostChart
){
return true;
}

dropSeries();

try{
runWithPreservedVisibleLogicalRange(
hostChart,
()=>{

series =
hostChart.addHistogramSeries(
{
priceFormat:{
type:
"volume"
},
priceScaleId:
VOLUME_SCALE_ID,
priceLineVisible:
false,
lastValueVisible:
false,
base:
0
}
);
boundChart =
hostChart;
pinVolumeScale();

}
);
return true;
}catch{
series =
null;
boundChart =
null;
return false;
}

}

function refreshData(){

if(
!enabled
){
return;
}

if(
!ensureSeries()
){
return;
}

const host =
getHost?.();

const raw =
host?.getCandles?.() ||
[];

const points =
buildVolumeDisplayPoints(
raw
);

const hostChart =
boundChart ||
mainChart();

const rows =
points.map(
bar=>({
time:
bar.time,
value:
bar.volume ||
0,
color:
volumeBarColor(
bar,
opacity
)
})
);

const prev =
rows.length >
1
? rows[
rows.length -
2
]
: null;
const key =
rows.length
? `${rows.length}:${rows[0].time}:${prev?.time || 0}`
: "0";
const lastOnly =
key !==
"0" &&
key ===
paintedKey;

try{
runWithPreservedVisibleLogicalRange(
hostChart,
()=>{

if(
lastOnly
){
try{
series.update(
rows[
rows.length -
1
]
);
}catch{
series.setData(
rows
);
}
}else{
series.setData(
rows
);
}

paintedKey =
key;
pinVolumeScale();

}
);
}catch{
dropSeries();
}

}

function enable(){

if(
enabled
){
refreshData();
return;
}

if(
!ensureSeries()
){
return;
}

enabled =
true;
hideSeparatePane();
refreshData();

}

function disable(){

if(
!enabled &&
!series
){
hideSeparatePane();
return;
}

enabled =
false;
dropSeries();
hideSeparatePane();

}

function populateSettingsDialog(
root
){

opacity =
readOpacity();

root.innerHTML =
`
<div class="ind-volume-settings">
<label class="chart-indicator-settings-field">
<span class="chart-indicator-settings-field-label">Прозрачность</span>
<input type="number" class="chart-indicator-settings-input" min="0.05" max="1" step="0.01" data-key="opacity" value="${opacity}" inputmode="decimal"/>
</label>
</div>
<div class="chart-indicator-settings-reset-row">
<button type="button" class="chart-indicator-settings-reset">Сбросить в дефолт</button>
</div>
`;

function commit(){

const input =
root.querySelector(
"[data-key='opacity']"
);

opacity =
writeOpacity(
input?.value
);

if(
input
){
input.value =
String(
opacity
);
}

refreshData();

}

root.querySelector(
"[data-key='opacity']"
)?.addEventListener(
"change",
commit
);

root.querySelector(
".chart-indicator-settings-reset"
)?.addEventListener(
"click",
()=>{

opacity =
writeOpacity(
VOLUME_OPACITY_DEFAULT
);
populateSettingsDialog(
root
);
refreshData();

}
);

}

hideSeparatePane();

return {
id:
VOLUME_PANE_ID,
label:
"Volume",
legendLabel:
"Vol",
settingsDialogTitle:
"Volume",
settingsDialogClass:
"chart-indicator-settings-dialog--compact",
exemptFromLimit:
false,
defaultEnabled:
false,
supportsSettingsDialog:
true,
getSettings:()=>(
{
opacity
}
),
populateSettingsDialog,
enable,
disable,
isEnabled:()=>
enabled,
getChart:()=>
null,
onSymbolChange(){

refreshData();

},
onCandlesUpdate(){

refreshData();

},
syncViewport(){},
onLayoutChange(){

hideSeparatePane();

},
onResize(){

pinVolumeScale();

},
destroy(){

disable();

}
};

}
