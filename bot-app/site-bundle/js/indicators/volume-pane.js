/**
 * Volume — гистограмма внизу панели цены (как на TradingView).
 */
import {
appendFutureWhitespaceBars,
computeChartFutureMarginBars,
coinsTfVisibleBars
} from "../chart-import.js?v=21aeb8d5";

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
candles,
tf,
visibleBarsCap
){

if(
!candles?.length
){
return [];
}

const cap =
typeof visibleBarsCap ===
"number"
? visibleBarsCap
: null;
const visibleBars =
typeof cap ===
"number" &&
cap >
0
? Math.min(
cap,
candles.length
)
: coinsTfVisibleBars(
tf,
candles.length
);

const futureMargin =
computeChartFutureMarginBars(
visibleBars
);

return appendFutureWhitespaceBars(
candles.map(
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
),
futureMargin,
tf
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

if(
boundChart &&
series
){
try{
boundChart.removeSeries(
series
);
}catch{
/* ignore */
}
}

series =
null;
boundChart =
null;

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

const tf =
host?.getTf?.() ||
"D";

const points =
buildVolumeDisplayPoints(
raw,
tf,
host?.getVisibleBarsCap?.()
);

try{
series.setData(
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
)
);
pinVolumeScale();
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
