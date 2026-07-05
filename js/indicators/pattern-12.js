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
} from "./pattern-12-math.js?v=1";

const LINE_PAT_COLOR =
"rgba(250, 204, 21, 0.6)";

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
hint =
""
){

return `
<div class="chart-indicator-settings-field">
<span class="chart-indicator-settings-field-label">${label}</span>
<input type="number" class="chart-indicator-settings-input" data-key="${key}" min="${min}" max="${max}" step="1" value="${value}" inputmode="numeric"/>
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

function barTimeSpanMs(
candles,
barLen
){

if(
candles.length <
2
){
return 60_000;
}

const dt =
candles[
candles.length -
1
].time -
candles[
candles.length -
2
].time;

return Math.max(
1,
barLen
) *
Math.max(
1,
dt
);

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

function barToX(
ts,
bar,
candles
){

const candle =
candles[
bar
];

if(
!candle
){
return null;
}

const x =
ts.timeToCoordinate(
candle.time
);

return x !=
null &&
Number.isFinite(
x
)
? x
: null;

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

const ts =
chart.timeScale();

ctx.save();

for(
const line of scene.swingLines
){

const x1 =
barToX(
ts,
line.barA,
candles
);
const x2 =
barToX(
ts,
line.barB,
candles
);
const y1 =
series.priceToCoordinate(
line.priceA
);
const y2 =
series.priceToCoordinate(
line.priceB
);

if(
x1 ==
null ||
x2 ==
null ||
y1 ==
null ||
y2 ==
null
){
continue;
}

ctx.strokeStyle =
line.color;
ctx.lineWidth =
1;
ctx.beginPath();
ctx.moveTo(
x1,
y1
);
ctx.lineTo(
x2,
y2
);
ctx.stroke();

}

for(
const frac of scene.fractals
){

const x =
barToX(
ts,
frac.bar,
candles
);

if(
x ==
null
){
continue;
}

ctx.fillStyle =
frac.color;
ctx.beginPath();

if(
frac.up
){
ctx.moveTo(
x,
plotH *
0.02
);
ctx.lineTo(
x -
4,
plotH *
0.02 +
8
);
ctx.lineTo(
x +
4,
plotH *
0.02 +
8
);
}else{
ctx.moveTo(
x,
plotH -
plotH *
0.02
);
ctx.lineTo(
x -
4,
plotH -
plotH *
0.02 -
8
);
ctx.lineTo(
x +
4,
plotH -
plotH *
0.02 -
8
);
}

ctx.closePath();
ctx.fill();

}

for(
const line of scene.patternLines
){

const x1 =
barToX(
ts,
line.barA,
candles
);
const x2 =
barToX(
ts,
line.barB,
candles
);
const y1 =
series.priceToCoordinate(
line.priceA
);
const y2 =
series.priceToCoordinate(
line.priceB
);

if(
x1 ==
null ||
x2 ==
null ||
y1 ==
null ||
y2 ==
null
){
continue;
}

ctx.strokeStyle =
LINE_PAT_COLOR;
ctx.lineWidth =
1;
ctx.beginPath();
ctx.moveTo(
x1,
y1
);
ctx.lineTo(
x2,
y2
);
ctx.stroke();

}

for(
const mark of scene.pt4Marks
){

const x0 =
barToX(
ts,
mark.bar,
candles
);
const y =
series.priceToCoordinate(
mark.price
);

if(
x0 ==
null ||
y ==
null
){
continue;
}

const span =
barTimeSpanMs(
candles,
mark.lineBars
);
const t0 =
candles[
mark.bar
]?.time;
const t1 =
t0 +
span;
const x1 =
ts.timeToCoordinate(
t1
);

if(
x1 ==
null
){
continue;
}

ctx.strokeStyle =
mark.color;
ctx.lineWidth =
1;
ctx.beginPath();
ctx.moveTo(
x0,
y
);
ctx.lineTo(
x1,
y
);
ctx.stroke();

const xMid =
(
x0 +
x1
) /
2;
ctx.fillStyle =
mark.color;
ctx.font =
"600 11px system-ui,-apple-system,sans-serif";
ctx.textAlign =
"center";
ctx.textBaseline =
mark.side ===
"long"
? "bottom"
: "top";
ctx.fillText(
mark.label,
xMid,
mark.side ===
"long"
? y -
4
: y +
4
);

}

for(
const dot of scene.pt4Dots
){

const x =
barToX(
ts,
dot.bar,
candles
);
const y =
series.priceToCoordinate(
dot.price
);

if(
x ==
null ||
y ==
null
){
continue;
}

const pad =
dot.price *
0.006;
const cy =
dot.side ===
"long"
? y +
pad
: y -
pad;

ctx.fillStyle =
dot.side ===
"long"
? "#84cc16"
: "#ef4444";
ctx.beginPath();
ctx.arc(
x,
cy,
4,
0,
Math.PI *
2
);
ctx.fill();

}

for(
const badge of scene.badges
){

const x =
barToX(
ts,
badge.bar,
candles
);
const y =
series.priceToCoordinate(
badge.price
);

if(
x ==
null ||
y ==
null
){
continue;
}

const pad =
badge.price *
0.008;
const lines =
String(
badge.text
).split(
"\n"
);
const boxW =
Math.max(
...lines.map(
line=>
line.length *
7
),
48
);
const boxH =
lines.length *
14 +
8;
const top =
badge.above
? y +
pad
: y -
pad -
boxH;
const left =
x -
boxW /
2;

ctx.fillStyle =
badge.color;
ctx.globalAlpha =
0.92;
ctx.fillRect(
left,
top,
boxW,
boxH
);
ctx.globalAlpha =
1;
ctx.fillStyle =
"#fff";
ctx.font =
"600 11px system-ui,-apple-system,sans-serif";
ctx.textAlign =
"center";
ctx.textBaseline =
"middle";

lines.forEach(
(
line,
index
)=>{
ctx.fillText(
line,
x,
top +
8 +
index *
14
);
}
);

}

ctx.restore();

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
`
)}
${settingsSection(
"Лонг: волна А",
`
${fieldNumber(
"Свинг амплитуда",
"lngRsiLength",
settings.lngRsiLength,
1,
999
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
"Свинг амплитуда",
"lngMicRsiLength",
settings.lngMicRsiLength,
1,
999
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
"Свинг амплитуда",
"shtRsiLength",
settings.shtRsiLength,
1,
999
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
"Свинг амплитуда",
"shtMicRsiLength",
settings.shtMicRsiLength,
1,
999
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
settings.showLngPt4Mark
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
settings.showShtPt4Mark
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
