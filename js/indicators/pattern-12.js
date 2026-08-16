/**
 * Паттерн 1-2, 1-2 — overlay на основном графике.
 */
import {
isChartLayoutReady
} from "../chart-layout-gate.js?v=2";
import {
PATTERN_12_ID,
computePattern12Scene,
defaultPattern12Settings,
normalizePattern12Settings
} from "./pattern-12-math.js?v=13";

import {
paintPattern12Scene
} from "./pattern-12-paint.js?v=8";

function readSettings(
store
){

return normalizePattern12Settings(
store?.read?.(
PATTERN_12_ID,
defaultPattern12Settings()
) ||
defaultPattern12Settings()
);

}

function persistSettings(
store,
next
){

store?.write?.(
PATTERN_12_ID,
next
);

}

function settingsSection(
title,
body,
sectionClass =
""
){

const extra =
sectionClass
? ` ${sectionClass}`
: "";

return `
<section class="chart-indicator-settings-section${extra}">
<h3 class="chart-indicator-settings-section-title">${title}</h3>
${body}
</section>
`;

}

function fieldSelect(
label,
key,
value,
options
){

return `
<div class="chart-indicator-settings-field">
<span class="chart-indicator-settings-field-label">${label}</span>
<select class="chart-indicator-settings-select" data-key="${key}">
${options.map(
opt=>`
<option value="${opt.value}" ${opt.value === value ? "selected" : ""}>${opt.label}</option>
`
).join(
""
)}
</select>
</div>
`;

}

function fieldNumber(
label,
key,
value,
min,
max,
hint =
""
){

return `
<div class="chart-indicator-settings-field-wrap">
<div class="chart-indicator-settings-field">
<span class="chart-indicator-settings-field-label">${label}</span>
<input type="number" class="chart-indicator-settings-input" data-key="${key}" min="${min}" max="${max}" step="1" value="${value}" inputmode="numeric"/>
</div>
${hint ? `<p class="chart-indicator-settings-hint">${hint}</p>` : ""}
</div>
`;

}

function fieldCheck(
label,
key,
checked
){

return `
<label class="chart-indicator-settings-check">
<input type="checkbox" data-key="${key}" ${checked ? "checked" : ""}/>
<span>${label}</span>
</label>
`;

}

function fieldCheckWithNumber(
label,
checkKey,
checked,
numKey,
numValue,
min,
max,
hint =
""
){

const title =
hint
? ` title="${hint}"`
: "";

return `
<div class="ind-pattern12-settings-check-num">
<label class="chart-indicator-settings-check">
<input type="checkbox" data-key="${checkKey}" ${checked ? "checked" : ""}/>
<span>${label}</span>
</label>
<input type="number" class="chart-indicator-settings-input" data-key="${numKey}" min="${min}" max="${max}" step="1" value="${numValue}" inputmode="numeric"${title}/>
</div>
`;

}

export function createPattern12Indicator(
getHost,
settingsStore
){

let enabled =
false;
let settings =
readSettings(
settingsStore
);
let scene =
null;
let afterRedraw =
null;
let unbindViewport =
null;

function getCandles(){

return getHost?.()?.getCandles?.() || [];

}

function recompute(){

if(
!enabled
){
scene =
null;
return;
}

const candles =
getCandles();

if(
!candles.length
){
scene =
null;
return;
}

scene =
computePattern12Scene(
candles,
settings
);

}

/**
 * Счётчики завершённых паттернов (pt4) для легенды.
 * @returns {{ long: number, short: number }}
 */
function countPatternSides(){

const dots =
Array.isArray(
scene?.pt4Dots
)
? scene.pt4Dots
: [];
let long =
0;
let short =
0;

for(
const dot of dots
){

if(
dot?.side ===
"long"
){
long +=
1;
}else if(
dot?.side ===
"short"
){
short +=
1;
}

}

return {
long,
short
};

}

function getLegendLabel(){

const {
long,
short
} =
countPatternSides();

return `Паттерн 1-2 <span class="chart-indicator-legend-count chart-indicator-legend-count--long">${long}</span> <span class="chart-indicator-legend-count chart-indicator-legend-count--short">${short}</span>`;

}

function bindViewportListeners(){

const host =
getHost?.();

if(
!host?.chart ||
unbindViewport
){
return;
}

const redraw =
()=>{
host?.getDrawingTools?.()?.scheduleRedraw?.();
};

try{
host.chart.timeScale().subscribeVisibleLogicalRangeChange(
redraw
);
host.chart.priceScale(
"right"
)?.subscribeVisibleLogicalRangeChange?.(
redraw
);
}catch{
/* ignore */
}

unbindViewport =
()=>{

try{
host.chart.timeScale().unsubscribeVisibleLogicalRangeChange(
redraw
);
host.chart.priceScale(
"right"
)?.unsubscribeVisibleLogicalRangeChange?.(
redraw
);
}catch{
/* ignore */
}

unbindViewport =
null;

};

}

function unbindViewportListeners(){

unbindViewport?.();
unbindViewport =
null;

}

function bindRedraw(){

const dt =
getHost?.()?.getDrawingTools?.();

if(
!dt?.addAfterRedrawListener
){
return false;
}

if(
afterRedraw
){
dt.removeAfterRedrawListener?.(
afterRedraw
);
}

afterRedraw =
paint;
dt.addAfterRedrawListener(
afterRedraw
);
return true;

}

function unbindRedraw(){

const dt =
getHost?.()?.getDrawingTools?.();

if(
afterRedraw &&
dt?.removeAfterRedrawListener
){
dt.removeAfterRedrawListener(
afterRedraw
);
}

afterRedraw =
null;

}

function paint(
ctx,
plotW,
plotH
){

if(
!enabled ||
!scene ||
!ctx
){
return;
}

const host =
getHost?.();
const series =
host?.series;
const chart =
host?.chart;
const candles =
getCandles();

if(
!series ||
!chart ||
!candles.length
){
return;
}

paintPattern12Scene(
ctx,
plotW,
plotH,
{
chart,
series,
candles,
scene
}
);

}

function populateSettingsDialog(
root
){

settings =
readSettings(
settingsStore
);

root.innerHTML =
`
<div class="ind-pattern12-settings">
${settingsSection(
"Общие",
`
<div class="ind-pattern12-settings-sides ind-pattern12-settings-sides--display">
<section class="ind-pattern12-settings-side">
${fieldSelect(
"Показать паттерн",
"patternMode",
settings.patternMode,
[
{ value: "both", label: "Лонг и Шорт" },
{ value: "long", label: "Лонг" },
{ value: "short", label: "Шорт" }
]
)}
${fieldSelect(
"Волна A состоит из",
"waveAMode",
settings.waveAMode,
[
{ value: "1", label: "1 свинг" },
{ value: "2", label: "2 свинг" },
{ value: "both", label: "оба" }
]
)}
</section>
<section class="ind-pattern12-settings-side">
<p class="ind-pattern12-settings-subhead">RSI</p>
${fieldNumber(
"Перекупленность",
"rsiOverbought",
settings.rsiOverbought,
1,
99
)}
${fieldNumber(
"Перепроданность",
"rsiOversold",
settings.rsiOversold,
1,
99
)}
</section>
</div>
`
)}
<div class="ind-pattern12-settings-sides">
<section class="ind-pattern12-settings-side">
<h3 class="chart-indicator-settings-section-title">Лонг</h3>
${fieldNumber(
"Точек перед т.1",
"decLowsBeforePt1",
settings.decLowsBeforePt1,
0,
5,
"N+1 макро-лоев: строго понижающийся ряд, т.1 = самый нижний."
)}
${fieldSelect(
"Волна 1 оф С",
"lngWaveCMode",
settings.lngWaveCMode,
[
{ value: "1", label: "1 микро" },
{ value: "2", label: "2 микро" }
]
)}
<p class="ind-pattern12-settings-subhead">Волна А</p>
${fieldNumber(
"Свинг амплитуда",
"lngRsiLength",
settings.lngRsiLength,
1,
999
)}
${fieldCheck(
"Маркеры макро",
"lngShowFractals",
settings.lngShowFractals
)}
${fieldCheck(
"Линии макро",
"lngShowRsiSwingLines",
settings.lngShowRsiSwingLines
)}
<p class="ind-pattern12-settings-subhead">Волна 1 оф С</p>
${fieldNumber(
"Свинг амплитуда",
"lngMicRsiLength",
settings.lngMicRsiLength,
1,
999
)}
${fieldCheck(
"Маркеры микро",
"lngShowMicFractals",
settings.lngShowMicFractals
)}
${fieldCheck(
"Линии микро",
"lngShowMicRsiSwingLines",
settings.lngShowMicRsiSwingLines
)}
</section>
<section class="ind-pattern12-settings-side">
<h3 class="chart-indicator-settings-section-title">Шорт</h3>
${fieldNumber(
"Точек перед т.1",
"ascHighsBeforePt1",
settings.ascHighsBeforePt1,
0,
5,
"N макро-хаев перед pt1. 0 = любой макро-хай."
)}
${fieldSelect(
"Волна 1 оф С",
"shtWaveCMode",
settings.shtWaveCMode,
[
{ value: "1", label: "1 микро" },
{ value: "2", label: "2 микро" }
]
)}
<p class="ind-pattern12-settings-subhead">Волна А</p>
${fieldNumber(
"Свинг амплитуда",
"shtRsiLength",
settings.shtRsiLength,
1,
999
)}
${fieldCheck(
"Маркеры макро",
"shtShowFractals",
settings.shtShowFractals
)}
${fieldCheck(
"Линии макро",
"shtShowRsiSwingLines",
settings.shtShowRsiSwingLines
)}
<p class="ind-pattern12-settings-subhead">Волна 1 оф С</p>
${fieldNumber(
"Свинг амплитуда",
"shtMicRsiLength",
settings.shtMicRsiLength,
1,
999
)}
${fieldCheck(
"Маркеры микро",
"shtShowMicFractals",
settings.shtShowMicFractals
)}
${fieldCheck(
"Линии микро",
"shtShowMicRsiSwingLines",
settings.shtShowMicRsiSwingLines
)}
</section>
</div>
${settingsSection(
"Отображение",
`
<div class="ind-pattern12-settings-checks">
${fieldCheck(
"Плашка т.1",
"showPt1Badges",
settings.showPt1Badges
)}
${fieldCheck(
"Плашка т.2",
"showPt2Badges",
settings.showPt2Badges
)}
${fieldCheck(
"Плашка т.3",
"showPt3Badges",
settings.showPt3Badges
)}
${fieldCheck(
"Линии 1-3 и 2-4",
"showPatternLines",
settings.showPatternLines
)}
${fieldCheckWithNumber(
"pt4 без ожидания RSI (врем.)",
"tempFastPt4",
settings.tempFastPt4,
"tempFastPt4Bars",
settings.tempFastPt4Bars,
1,
5,
"Только при включённой галочке: сколько закрытых баров подряд не обновляют экстремум."
)}
</div>
<div class="ind-pattern12-settings-sides ind-pattern12-settings-sides--display">
<section class="ind-pattern12-settings-side">
<p class="ind-pattern12-settings-subhead">Точка 4 · Лонг</p>
${fieldCheck(
"Зелёный кружок",
"showLngPt4Dot",
settings.showLngPt4Dot
)}
${fieldCheck(
"Линия и текст Long",
"showLngPt4Mark",
settings.showLngPt4Mark
)}
${fieldNumber(
"Длина линии (бары)",
"lngPt4LineBars",
settings.lngPt4LineBars,
4,
100
)}
</section>
<section class="ind-pattern12-settings-side">
<p class="ind-pattern12-settings-subhead">Точка 4 · Шорт</p>
${fieldCheck(
"Красный кружок",
"showShtPt4Dot",
settings.showShtPt4Dot
)}
${fieldCheck(
"Линия и текст Short",
"showShtPt4Mark",
settings.showShtPt4Mark
)}
${fieldNumber(
"Длина линии (бары)",
"shtPt4LineBars",
settings.shtPt4LineBars,
4,
100
)}
</section>
</div>
`
)}
<div class="chart-indicator-settings-reset-row">
<button type="button" class="chart-indicator-settings-reset">Сбросить в дефолт</button>
</div>
</div>
`;

function commit(){

const next =
{
...settings
};

root.querySelectorAll(
"[data-key]"
).forEach(
el=>{

const key =
el.dataset.key;

if(
el.type ===
"checkbox"
){
next[
key
] =
el.checked;
return;
}

if(
el.tagName ===
"SELECT"
){
next[
key
] =
el.value;
return;
}

const n =
Number(
el.value
);

if(
Number.isFinite(
n
)
){
next[
key
] =
n;
}

}
);

settings =
normalizePattern12Settings(
next
);
persistSettings(
settingsStore,
settings
);
recompute();
getHost?.()?.getDrawingTools?.()?.scheduleRedraw?.();

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

root.querySelector(
".chart-indicator-settings-reset"
)?.addEventListener(
"click",
()=>{

settings =
normalizePattern12Settings(
defaultPattern12Settings()
);
persistSettings(
settingsStore,
settings
);
recompute();
getHost?.()?.getDrawingTools?.()?.scheduleRedraw?.();
populateSettingsDialog(
root
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

enabled =
true;
readSettings(
settingsStore
);
bindViewportListeners();
bindRedraw();
recompute();
getHost?.()?.getDrawingTools?.()?.scheduleRedraw?.();

}

function disable(){

if(
!enabled
){
return;
}

enabled =
false;
scene =
null;
unbindRedraw();
unbindViewportListeners();

}

function onCandlesUpdate(){

if(
!enabled ||
!isChartLayoutReady()
){
return;
}

recompute();

}

function onSymbolChange(){

if(
enabled
){
recompute();
}

}

function syncMainChartOverlay(){

if(
enabled
){
recompute();
getHost?.()?.getDrawingTools?.()?.scheduleRedraw?.();
}

}

return {
id:
PATTERN_12_ID,
label:
"Паттерн 1-2, 1-2",
legendLabel:
"Паттерн 1-2",
settingsDialogTitle:
"Паттерн 1-2, 1-2",
settingsDialogClass:
"chart-indicator-settings-dialog--pattern12",
exemptFromLimit:
false,
defaultEnabled:
false,
supportsSettingsDialog:
true,
getLegendLabel,
populateSettingsDialog,
enable,
disable,
isEnabled:()=>
enabled,
onCandlesUpdate,
onSymbolChange,
syncMainChartOverlay,
destroy:()=>{
disable();
}
};

}
