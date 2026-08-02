/**
 * Паттерн ГиП — overlay на основном графике (Голова и Плечи / Inverse H&S).
 */
import {
isChartLayoutReady
} from "../chart-layout-gate.js?v=2";
import {
PATTERN_GIP_ID,
computePatternGipScene,
defaultPatternGipSettings,
normalizePatternGipSettings
} from "./pattern-gip-math.js?v=3";
import {
paintPatternGipScene
} from "./pattern-gip-paint.js?v=1";
import {
openIndicatorColorPicker,
previewColorHex,
closeIndicatorColorPicker
} from "./indicator-color-picker-ui.js?v=1";

function readSettings(
store
){

return normalizePatternGipSettings(
store?.read?.(
PATTERN_GIP_ID,
defaultPatternGipSettings()
) ||
defaultPatternGipSettings()
);

}

function persistSettings(
store,
next
){

store?.write?.(
PATTERN_GIP_ID,
next
);

}

function settingsSection(
title,
body
){

return `
<section class="chart-indicator-settings-section">
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
step =
"1",
hint =
""
){

return `
<div class="chart-indicator-settings-field">
<span class="chart-indicator-settings-field-label">${label}</span>
<input type="number" class="chart-indicator-settings-input" data-key="${key}" min="${min}" max="${max}" step="${step}" value="${value}" inputmode="decimal"/>
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

function fieldColor(
label,
key,
value
){

const hex =
previewColorHex(
value
);

return `
<div class="chart-indicator-settings-field">
<span class="chart-indicator-settings-field-label">${label}</span>
<button type="button" class="ind-ribbon-settings-color" data-key="${key}" data-color="${hex}" style="--line-color:${hex}" title="${label}">
<span class="ind-ribbon-settings-color-preview"></span>
</button>
</div>
`;

}

export function createPatternGipIndicator(
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
computePatternGipScene(
candles,
settings
);

}

function getLegendLabel(){

return "Паттерн ГиП";

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

paintPatternGipScene(
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

function collectFromRoot(
root
){

const next =
{
...settings
};

for(
const el of root.querySelectorAll(
"[data-key]"
)
){

const key =
el.getAttribute(
"data-key"
);

if(
!key
){
continue;
}

if(
el.tagName ===
"BUTTON" &&
el.dataset.color
){
next[
key
] =
el.dataset.color;
}else if(
el.type ===
"checkbox"
){
next[
key
] =
el.checked;
}else if(
el.type ===
"number"
){
next[
key
] =
el.value;
}else if(
el.tagName !==
"BUTTON"
){
next[
key
] =
el.value;
}

}

return normalizePatternGipSettings(
next
);

}

function populateSettingsDialog(
root
){

settings =
readSettings(
settingsStore
);

const s =
settings;

root.innerHTML =
`
<div class="ind-pattern-gip-settings">
${settingsSection(
"RSI Swing",
`
${fieldNumber(
"Длина RSI",
"rsiLength",
s.rsiLength,
1,
999,
"1"
)}
${fieldNumber(
"Overbought (зона хаёв)",
"obLevel",
s.obLevel,
50,
99,
"1"
)}
${fieldNumber(
"Oversold (зона лоёв)",
"osLevel",
s.osLevel,
1,
50,
"1"
)}
`
)}
${settingsSection(
"Паттерн",
`
${fieldSelect(
"Направление",
"sideMode",
s.sideMode,
[
{ value: "Short", label: "Шорт" },
{ value: "Long", label: "Лонг" },
{ value: "Both", label: "Оба" }
]
)}
${fieldCheck(
"Показывать все свинги H/L (debug)",
"showDebugSwings",
s.showDebugSwings
)}
${fieldCheck(
"Линии паттерна t0→…→t3",
"showPatternLines",
s.showPatternLines
)}
${fieldCheck(
"Линия шеи s1–s2",
"showNeckline",
s.showNeckline
)}
${fieldCheck(
"Показывать только актуальные",
"showOnlyActive",
s.showOnlyActive
)}
${fieldCheck(
"Сдвиг t3 пока паттерн активен",
"allowT3Shift",
s.allowT3Shift
)}
`
)}
${settingsSection(
"Точка t0",
`
${fieldSelect(
"Какой свинг перед t1",
"t0Mode",
s.t0Mode,
[
{ value: "1", label: "1" },
{ value: "2", label: "2" },
{ value: "Both", label: "Оба" }
]
)}
`
)}
${settingsSection(
"Точка s1",
`
${fieldSelect(
"Глубина после t1",
"s1Mode",
s.s1Mode,
[
{ value: "1", label: "1" },
{ value: "2", label: "2" },
{ value: "Both", label: "Оба" }
]
)}
`
)}
${settingsSection(
"Точка s2",
`
${fieldSelect(
"Глубина после t2",
"s2Mode",
s.s2Mode,
[
{ value: "1", label: "1" },
{ value: "2", label: "2" },
{ value: "Both", label: "Оба" }
]
)}
`
)}
${settingsSection(
"Отображение",
`
${fieldCheck(
"Шильды точек (t0, t1, s1…)",
"showBadges",
s.showBadges
)}
${fieldCheck(
"Маркеры точек (*)",
"showMarkers",
s.showMarkers
)}
${fieldNumber(
"Смещение шильда (× ATR)",
"atrOff",
s.atrOff,
0,
3,
"0.05"
)}
${fieldNumber(
"Прозрачность невалидного (%)",
"invalidTransp",
s.invalidTransp,
0,
90,
"5"
)}
`
)}
${settingsSection(
"Шея s1/s2",
`
${fieldNumber(
"s2: макс. за шею (% от X)",
"s2MaxBeyondX",
s.s2MaxBeyondX,
0,
100,
"1"
)}
${fieldNumber(
"s2: макс. к голове (% от X)",
"s2MaxToHeadX",
s.s2MaxToHeadX,
0,
200,
"1"
)}
`
)}
${settingsSection(
"Фильтры качества",
`
${fieldNumber(
"Макс. |t1−t3| (% от X)",
"maxShoulderDiffPct",
s.maxShoulderDiffPct,
0,
100,
"1",
"100 = выкл."
)}
${fieldNumber(
"Мин. высота головы X (× ATR)",
"minHeadXAtr",
s.minHeadXAtr,
0,
10,
"0.1",
"0 = выкл."
)}
`
)}
${settingsSection(
"Цвета",
`
${fieldColor(
"Цвет t0/t1/t2/t3",
"colT",
s.colT
)}
${fieldColor(
"Цвет s1/s2",
"colS",
s.colS
)}
${fieldColor(
"Линии паттерна",
"colPat",
s.colPat
)}
${fieldColor(
"Линия шеи",
"colNeck",
s.colNeck
)}
${fieldColor(
"Отработанный",
"colWorked",
s.colWorked
)}
${fieldColor(
"Debug H",
"colDbgH",
s.colDbgH
)}
${fieldColor(
"Debug L",
"colDbgL",
s.colDbgL
)}
`
)}
<div class="chart-indicator-settings-reset-row">
<button type="button" class="chart-indicator-settings-reset">Сбросить в дефолт</button>
</div>
</div>
`;

const commit =
()=>{

settings =
collectFromRoot(
root
);
persistSettings(
settingsStore,
settings
);
recompute();
getHost?.()?.getDrawingTools?.()?.scheduleRedraw?.();

};

root.querySelectorAll(
"input[data-key], select[data-key]"
).forEach(
el=>{
el.addEventListener(
"change",
commit
);
el.addEventListener(
"input",
commit
);
}
);

root.querySelectorAll(
"button.ind-ribbon-settings-color[data-key]"
).forEach(
btn=>{
btn.addEventListener(
"click",
(event)=>{

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

const hex =
previewColorHex(
color
);

btn.dataset.color =
hex;
btn.style.setProperty(
"--line-color",
hex
);
commit();

},
onSelect:(
color
)=>{

const hex =
previewColorHex(
color
);

btn.dataset.color =
hex;
btn.style.setProperty(
"--line-color",
hex
);
commit();

}
}
);

}
);
}
);

root.querySelector(
".chart-indicator-settings-reset"
)?.addEventListener(
"click",
()=>{

closeIndicatorColorPicker();
settings =
normalizePatternGipSettings(
defaultPatternGipSettings()
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
settings =
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
PATTERN_GIP_ID,
label:
"Паттерн ГиП",
legendLabel:
"Паттерн ГиП",
settingsDialogTitle:
"Паттерн ГиП",
settingsDialogClass:
"chart-indicator-settings-dialog--pattern-gip",
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
onSettingsDialogClose:()=>{
closeIndicatorColorPicker();
},
destroy:()=>{
closeIndicatorColorPicker();
disable();
}
};

}
