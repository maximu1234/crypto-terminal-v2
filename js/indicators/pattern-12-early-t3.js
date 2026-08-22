/**
 * Терминал: «Паттерн 1-2, 1-2 — EARLY T3».
 * Копия алго-индикатора. Оригинал js/indicators/pattern-12* не трогаем.
 * Образец Pine: js/algo-trading/pine/1-2-EARLY_T3_RSI5_52-48_PLUS1.pine
 */
import {
isChartLayoutReady
} from "../chart-layout-gate.js?v=2";
import {
PATTERN_12_EARLY_T3_ID,
defaultPattern12Settings,
normalizePattern12Settings
} from "./pattern-12-early-t3-math.js?v=1";

import {
getOrComputePattern12EarlyT3Scene
} from "./pattern-12-early-t3-scene-cache.js?v=1";

import {
paintPattern12Scene
} from "./pattern-12-paint.js?v=8";

function readSettings(
store
){

return normalizePattern12Settings(
store?.read?.(
PATTERN_12_EARLY_T3_ID,
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
PATTERN_12_EARLY_T3_ID,
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
checked,
hint =
""
){

const title =
hint
? ` title="${hint}"`
: "";

return `
<label class="chart-indicator-settings-check"${title}>
<input type="checkbox" data-key="${key}" ${checked ? "checked" : ""}/>
<span>${label}</span>
</label>
`;

}

export function createPattern12EarlyT3Indicator(
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

function getSymbolScope(){

return String(
getHost?.()?.getSymbol?.() ||
""
).trim();

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
getOrComputePattern12EarlyT3Scene(
candles,
settings,
getSymbolScope()
);

}

/**
 * Счётчики завершённых паттернов (pt4) для легенды.
 * @returns {{ long: number, short: number }}
 */
function countPatternSides(){

const paintDots =
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
const dot of paintDots
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

return `1-2 EARLY T3 <span class="chart-indicator-legend-count chart-indicator-legend-count--long">${long}</span> <span class="chart-indicator-legend-count chart-indicator-legend-count--short">${short}</span>`;

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
"Настройки паттерна",
`
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
${fieldNumber(
"Количество нисходящих точек перед точкой 1 (Лонг)",
"decLowsBeforePt1",
settings.decLowsBeforePt1,
0,
5,
"N+1 макро-лоев: строго понижающийся ряд, точка 1 = самый нижний."
)}
${fieldNumber(
"Количество восходящих точек перед точкой 1 (Шорт)",
"ascHighsBeforePt1",
settings.ascHighsBeforePt1,
0,
5,
"N макро-хаев перед pt1: preN < … < pre1 < pt1. 0 = любой макро-хай."
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
${fieldSelect(
"Волна 1 оф С состоит из (Лонг)",
"lngWaveCMode",
settings.lngWaveCMode,
[
{ value: "1", label: "1 микро-свинг" },
{ value: "2", label: "2 микро-свинга" }
]
)}
${fieldSelect(
"Волна 1 оф С состоит из (Шорт)",
"shtWaveCMode",
settings.shtWaveCMode,
[
{ value: "1", label: "1 микро-свинг" },
{ value: "2", label: "2 микро-свинга" }
]
)}
`
)}
${settingsSection(
"Лонг: волна А",
`
${fieldNumber(
"RSI период",
"lngRsiLength",
settings.lngRsiLength,
1,
999,
"Длина RSI макро-свинга (точки 1 и 2)."
)}
${fieldNumber(
"RSI перекупленность",
"lngRsiOverbought",
settings.lngRsiOverbought,
1,
100
)}
${fieldNumber(
"RSI перепроданность",
"lngRsiOversold",
settings.lngRsiOversold,
0,
99
)}
${fieldCheck(
"Показать маркеры макро-свинга",
"lngShowFractals",
settings.lngShowFractals
)}
${fieldCheck(
"Показать линии макро-свинга",
"lngShowRsiSwingLines",
settings.lngShowRsiSwingLines
)}
`
)}
${settingsSection(
"Лонг: волна 1 оф С",
`
${fieldNumber(
"RSI период",
"lngMicRsiLength",
settings.lngMicRsiLength,
1,
999,
"Длина RSI микро-свинга (точка 4)."
)}
${fieldNumber(
"RSI перекупленность",
"lngMicRsiOverbought",
settings.lngMicRsiOverbought,
1,
100
)}
${fieldNumber(
"RSI перепроданность",
"lngMicRsiOversold",
settings.lngMicRsiOversold,
0,
99
)}
${fieldCheck(
"Показать маркеры микро-свинга",
"lngShowMicFractals",
settings.lngShowMicFractals
)}
${fieldCheck(
"Показать линии микро-свинга",
"lngShowMicRsiSwingLines",
settings.lngShowMicRsiSwingLines
)}
`
)}
${settingsSection(
"Шорт: волна А",
`
${fieldNumber(
"RSI период",
"shtRsiLength",
settings.shtRsiLength,
1,
999,
"Длина RSI макро-свинга (точки 1 и 2)."
)}
${fieldNumber(
"RSI перекупленность",
"shtRsiOverbought",
settings.shtRsiOverbought,
1,
100
)}
${fieldNumber(
"RSI перепроданность",
"shtRsiOversold",
settings.shtRsiOversold,
0,
99
)}
${fieldCheck(
"Показать маркеры макро-свинга",
"shtShowFractals",
settings.shtShowFractals
)}
${fieldCheck(
"Показать линии макро-свинга",
"shtShowRsiSwingLines",
settings.shtShowRsiSwingLines
)}
`
)}
${settingsSection(
"Шорт: волна 1 оф С",
`
${fieldNumber(
"RSI период",
"shtMicRsiLength",
settings.shtMicRsiLength,
1,
999,
"Длина RSI микро-свинга (точка 4)."
)}
${fieldNumber(
"RSI перекупленность",
"shtMicRsiOverbought",
settings.shtMicRsiOverbought,
1,
100
)}
${fieldNumber(
"RSI перепроданность",
"shtMicRsiOversold",
settings.shtMicRsiOversold,
0,
99
)}
${fieldCheck(
"Показать маркеры микро-свинга",
"shtShowMicFractals",
settings.shtShowMicFractals
)}
${fieldCheck(
"Показать линии микро-свинга",
"shtShowMicRsiSwingLines",
settings.shtShowMicRsiSwingLines
)}
`
)}
${settingsSection(
"Точка 3: early RSI",
`
${fieldNumber(
"RSI период",
"earlyT3RsiLen",
settings.earlyT3RsiLen,
1,
999,
"Ранний RSI только для точки 3. Точки 1, 2 и 4 не затрагиваются."
)}
${fieldNumber(
"RSI перекупленность",
"earlyT3OB",
settings.earlyT3OB,
1,
100
)}
${fieldNumber(
"RSI перепроданность",
"earlyT3OS",
settings.earlyT3OS,
0,
99
)}
${fieldCheck(
"Одна точка 3 и 4 на пару 1–2",
"onePt34Per12",
settings.onePt34Per12,
"Как в Pine: для каждой 1–2 берётся одна т.3 и одна т.4. Выкл. — после т.4 та же 1–2 может набирать следующие 3–4."
)}
`
)}
${settingsSection(
"Отображение на графике",
`
${fieldCheck(
"Плашки «Точка 1»",
"showPt1Badges",
settings.showPt1Badges
)}
${fieldCheck(
"Плашки «Точка 2»",
"showPt2Badges",
settings.showPt2Badges
)}
${fieldCheck(
"Плашки «Точка 3»",
"showPt3Badges",
settings.showPt3Badges
)}
${fieldCheck(
"Зелёный кружок (точка 4, Лонг)",
"showLngPt4Dot",
settings.showLngPt4Dot
)}
${fieldCheck(
"Линия и текст Long (точка 4)",
"showLngPt4Mark",
settings.showLngPt4Mark,
"Горизонталь от хая pt4 и надпись Long. Выкл. — скрывает и линию, и текст."
)}
${fieldNumber(
"Длина линии pt4 Лонг (бары)",
"lngPt4LineBars",
settings.lngPt4LineBars,
4,
100
)}
${fieldCheck(
"Красный кружок (точка 4, Шорт)",
"showShtPt4Dot",
settings.showShtPt4Dot
)}
${fieldCheck(
"Линия и текст Short (точка 4)",
"showShtPt4Mark",
settings.showShtPt4Mark,
"Горизонталь от лоя pt4 и надпись Short. Выкл. — скрывает и линию, и текст."
)}
${fieldNumber(
"Длина линии pt4 Шорт (бары)",
"shtPt4LineBars",
settings.shtPt4LineBars,
4,
100
)}
${fieldCheck(
"Линии 1-3 и 2-4",
"showPatternLines",
settings.showPatternLines
)}
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
notifySettingsChange();

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
notifySettingsChange();

}
);

}

function notifySettingsChange(){

try{
getHost?.()?.onIndicatorSettingsChange?.(
PATTERN_12_EARLY_T3_ID
);
}catch{
/* ignore */
}

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
PATTERN_12_EARLY_T3_ID,
label:
"1-2 EARLY T3",
legendLabel:
"1-2 EARLY T3",
settingsDialogTitle:
"Паттерн 1-2, 1-2 — EARLY T3",
settingsDialogClass:
"chart-indicator-settings-dialog--pattern12-early-t3",
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
