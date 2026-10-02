/**
 * Volume Bubbles — overlay on Terminal main chart.
 * Based on the common TradingView family (R2D2 / QuantAlgo-style):
 * volume SMA + spike multiplier filter; bubble radius scales with ratio.
 */
import {
buildVolumeBubbles,
clampNumber
} from "./volume-bubbles-math.js?v=1";

import {
isChartLayoutReady
} from "../chart-layout-gate.js?v=4";

import {
closeIndicatorColorPicker,
openIndicatorColorPicker,
previewColorHex,
isValidDrawColor
} from "./indicator-color-picker-ui.js?v=2";

export const VOLUME_BUBBLES_ID =
"volume-bubbles";

const DEFAULT_BUY_COLOR =
"#22c55e";

const DEFAULT_SELL_COLOR =
"#ef4444";

function defaultSettings(){

return {
maLength:
20,
volumeMult:
2,
minVolume:
0,
sizeScale:
1,
minRadius:
4,
maxRadius:
28,
showBuy:
true,
showSell:
true,
showVolumeLabels:
true,
buyColor:
DEFAULT_BUY_COLOR,
sellColor:
DEFAULT_SELL_COLOR,
opacity:
0.45
};

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
maLength:
Math.round(
clampNumber(
src.maLength,
base.maLength,
2,
500
)
),
volumeMult:
clampNumber(
src.volumeMult,
base.volumeMult,
0.5,
50
),
minVolume:
clampNumber(
src.minVolume,
base.minVolume,
0,
1e15
),
sizeScale:
clampNumber(
src.sizeScale,
base.sizeScale,
0.2,
5
),
minRadius:
clampNumber(
src.minRadius,
base.minRadius,
1,
40
),
maxRadius:
clampNumber(
src.maxRadius,
base.maxRadius,
4,
80
),
showBuy:
src.showBuy !==
false,
showSell:
src.showSell !==
false,
showVolumeLabels:
src.showVolumeLabels !==
false,
buyColor:
normalizeColor(
src.buyColor,
base.buyColor
),
sellColor:
normalizeColor(
src.sellColor,
base.sellColor
),
opacity:
clampNumber(
src.opacity,
base.opacity,
0.1,
1
)
};

}

/**
 * @param {() => object} getHost
 * @param {{ read: Function, write: Function }} settingsStore
 */
export function createVolumeBubblesIndicator(
getHost,
settingsStore
){

let enabled =
false;
let settings =
defaultSettings();
let bubbles =
[];
/** @type {Array<{ x: number, y: number, r: number, volume: number, side: string, ratio: number }>} */
let hitList =
[];
let afterRedraw =
null;
let refreshSeq =
0;
/** @type {HTMLElement|null} */
let badgeEl =
null;
/** @type {number|null} */
let pinnedHitIndex =
null;
let pointerBound =
false;

function formatVolumeLabel(
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
return "—";
}

const abs =
Math.abs(
n
);

if(
abs >=
1e9
){
return `${(n / 1e9).toFixed(2)}B`;
}

if(
abs >=
1e6
){
return `${(n / 1e6).toFixed(2)}M`;
}

if(
abs >=
1e3
){
return `${(n / 1e3).toFixed(2)}K`;
}

if(
abs >=
10
){
return String(
Math.round(
n
)
);
}

return n.toFixed(
2
);

}

function getWrapEl(){

return getHost?.()?.wrapEl ||
null;

}

function ensureBadgeEl(){

const wrap =
getWrapEl();

if(
!wrap
){
return null;
}

if(
badgeEl &&
badgeEl.isConnected
){
return badgeEl;
}

badgeEl =
document.createElement(
"div"
);
badgeEl.className =
"volume-bubbles-badge hidden";
badgeEl.setAttribute(
"aria-hidden",
"true"
);
wrap.appendChild(
badgeEl
);
return badgeEl;

}

function hideBadge(){

if(
!badgeEl
){
return;
}

badgeEl.classList.add(
"hidden"
);
badgeEl.setAttribute(
"aria-hidden",
"true"
);
badgeEl.textContent =
"";

}

function showBadgeForHit(
hit,
{
pinned
} =
{}
){

const el =
ensureBadgeEl();

if(
!el ||
!hit
){
return;
}

const sideLabel =
hit.side ===
"sell"
? "Продажа"
: "Покупка";

el.innerHTML =
`<span class="volume-bubbles-badge-side volume-bubbles-badge-side--${hit.side}">${sideLabel}</span>` +
`<span class="volume-bubbles-badge-vol">${formatVolumeLabel(hit.volume)}</span>` +
`<span class="volume-bubbles-badge-ratio">×${hit.ratio.toFixed(1)}</span>`;

el.classList.toggle(
"volume-bubbles-badge--pinned",
!!pinned
);
el.classList.remove(
"hidden"
);
el.setAttribute(
"aria-hidden",
"false"
);

const pad =
8;
const left =
Math.max(
4,
hit.x +
hit.r +
pad
);
const top =
Math.max(
4,
hit.y -
14
);

el.style.left =
`${left}px`;
el.style.top =
`${top}px`;

}

function hitTestBubbles(
px,
py
){

let best =
null;
let bestDist =
Infinity;

for(
let i =
0;
i <
hitList.length;
i++
){

const hit =
hitList[i];
const dx =
px -
hit.x;
const dy =
py -
hit.y;
const dist =
Math.hypot(
dx,
dy
);
const thresh =
hit.r +
4;

if(
dist <=
thresh &&
dist <
bestDist
){
bestDist =
dist;
best =
{
hit,
index:
i
};
}

}

return best;

}

function onPointerMove(
event
){

if(
!enabled ||
!settings.showVolumeLabels
){
return;
}

if(
pinnedHitIndex !=
null
){
return;
}

const wrap =
getWrapEl();

if(
!wrap
){
return;
}

const rect =
wrap.getBoundingClientRect();
const px =
event.clientX -
rect.left;
const py =
event.clientY -
rect.top;
const found =
hitTestBubbles(
px,
py
);

if(
found
){
showBadgeForHit(
found.hit,
{
pinned:
false
}
);
wrap.style.cursor =
"pointer";
}else{
hideBadge();
if(
wrap.style.cursor ===
"pointer"
){
wrap.style.cursor =
"";
}
}

}

function onPointerLeave(){

if(
pinnedHitIndex !=
null
){
return;
}

hideBadge();
const wrap =
getWrapEl();
if(
wrap?.style.cursor ===
"pointer"
){
wrap.style.cursor =
"";
}

}

function onPointerDown(
event
){

if(
!enabled ||
!settings.showVolumeLabels ||
event.button !==
0
){
return;
}

const wrap =
getWrapEl();

if(
!wrap
){
return;
}

const rect =
wrap.getBoundingClientRect();
const px =
event.clientX -
rect.left;
const py =
event.clientY -
rect.top;
const found =
hitTestBubbles(
px,
py
);

if(
found
){
event.preventDefault();
event.stopPropagation();
pinnedHitIndex =
found.index;
showBadgeForHit(
found.hit,
{
pinned:
true
}
);
}else if(
pinnedHitIndex !=
null
){
pinnedHitIndex =
null;
hideBadge();
}

}

function bindPointerHandlers(){

if(
pointerBound
){
return;
}

const wrap =
getWrapEl();

if(
!wrap
){
return;
}

wrap.addEventListener(
"pointermove",
onPointerMove
);
wrap.addEventListener(
"pointerleave",
onPointerLeave
);
wrap.addEventListener(
"pointerdown",
onPointerDown,
true
);
pointerBound =
true;

}

function unbindPointerHandlers(){

if(
!pointerBound
){
return;
}

const wrap =
getWrapEl();

wrap?.removeEventListener(
"pointermove",
onPointerMove
);
wrap?.removeEventListener(
"pointerleave",
onPointerLeave
);
wrap?.removeEventListener(
"pointerdown",
onPointerDown,
true
);
pointerBound =
false;
pinnedHitIndex =
null;
hideBadge();

if(
wrap?.style.cursor ===
"pointer"
){
wrap.style.cursor =
"";
}

}

function getChart(){

return getHost?.()?.chart ||
null;

}

function readSettings(){

settings =
normalizeSettings(
settingsStore?.read?.(
VOLUME_BUBBLES_ID,
defaultSettings()
)
);

return settings;

}

function persistSettings(
patch
){

settings =
normalizeSettings(
{
...settings,
...patch
}
);

settingsStore?.write?.(
VOLUME_BUBBLES_ID,
settings
);

return settings;

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
paintOverlay;
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

function requestOverlayRedraw(){

getHost?.()?.getDrawingTools?.()?.scheduleRedraw?.();

}

function paintOverlay(
ctx
){

hitList =
[];

if(
!enabled ||
!ctx ||
!bubbles.length
){
return;
}

const host =
getHost?.() ||
{};
const chart =
host.chart;
const series =
host.series;

if(
!chart ||
!series
){
return;
}

let ts =
null;

try{
ts =
chart.timeScale();
}catch{
return;
}

if(
!ts?.timeToCoordinate
){
return;
}

const buy =
previewColorHex(
settings.buyColor
);
const sell =
previewColorHex(
settings.sellColor
);
const alpha =
settings.opacity;

ctx.save();

for(
const b of
bubbles
){

const x =
ts.timeToCoordinate(
b.time
);
const y =
series.priceToCoordinate(
b.price
);

if(
x ==
null ||
y ==
null ||
!Number.isFinite(
x
) ||
!Number.isFinite(
y
)
){
continue;
}

const r =
Math.max(
1,
b.radius ||
4
);
const color =
b.side ===
"sell"
? sell
: buy;

hitList.push({
x,
y,
r,
volume:
b.volume,
side:
b.side,
ratio:
b.ratio
});

ctx.beginPath();
ctx.fillStyle =
hexToRgba(
color,
alpha
);
ctx.strokeStyle =
hexToRgba(
color,
Math.min(
1,
alpha +
0.25
)
);
ctx.lineWidth =
1;
ctx.arc(
x,
y,
r,
0,
Math.PI *
2
);
ctx.fill();
ctx.stroke();

}

ctx.restore();

if(
pinnedHitIndex !=
null
){

const pinned =
hitList[
pinnedHitIndex
];

if(
pinned &&
settings.showVolumeLabels
){
showBadgeForHit(
pinned,
{
pinned:
true
}
);
}else{
pinnedHitIndex =
null;
hideBadge();
}

}

}

function hexToRgba(
hex,
alpha
){

const h =
String(
hex ||
""
).replace(
"#",
""
);

if(
h.length !==
6
){
return `rgba(34,197,94,${alpha})`;
}

const r =
parseInt(
h.slice(
0,
2
),
16
);
const g =
parseInt(
h.slice(
2,
4
),
16
);
const b =
parseInt(
h.slice(
4,
6
),
16
);

return `rgba(${r},${g},${b},${alpha})`;

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
getHost?.() ||
{};
const candles =
host.getCandles?.() ||
[];

if(
!candles.length ||
!getChart()
){
bubbles =
[];
requestOverlayRedraw();
return;
}

const seq =
++refreshSeq;

readSettings();

if(
!afterRedraw
){
bindRedraw();
}

bubbles =
buildVolumeBubbles(
candles,
settings
);

if(
seq !==
refreshSeq
){
return;
}

requestOverlayRedraw();

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
<span class="chart-indicator-settings-field-label">Размер шариков</span>
<input type="number" class="chart-indicator-settings-input" data-field="sizeScale" min="0.2" max="5" step="0.1" value="${settings.sizeScale}" inputmode="decimal"/>
</div>
<div class="chart-indicator-settings-field">
<span class="chart-indicator-settings-field-label">Мин. радиус (px)</span>
<input type="number" class="chart-indicator-settings-input" data-field="minRadius" min="1" max="40" step="1" value="${settings.minRadius}" inputmode="numeric"/>
</div>
<div class="chart-indicator-settings-field">
<span class="chart-indicator-settings-field-label">Макс. радиус (px)</span>
<input type="number" class="chart-indicator-settings-input" data-field="maxRadius" min="4" max="80" step="1" value="${settings.maxRadius}" inputmode="numeric"/>
</div>
<div class="chart-indicator-settings-field">
<span class="chart-indicator-settings-field-label">Фильтр: SMA объёма</span>
<input type="number" class="chart-indicator-settings-input" data-field="maLength" min="2" max="500" step="1" value="${settings.maLength}" inputmode="numeric"/>
</div>
<div class="chart-indicator-settings-field">
<span class="chart-indicator-settings-field-label">Фильтр: множитель объёма</span>
<input type="number" class="chart-indicator-settings-input" data-field="volumeMult" min="0.5" max="50" step="0.1" value="${settings.volumeMult}" inputmode="decimal"/>
</div>
<div class="chart-indicator-settings-field">
<span class="chart-indicator-settings-field-label">Фильтр: мин. объём</span>
<input type="number" class="chart-indicator-settings-input" data-field="minVolume" min="0" step="1" value="${settings.minVolume}" inputmode="decimal"/>
</div>
<div class="chart-indicator-settings-field">
<span class="chart-indicator-settings-field-label">Прозрачность</span>
<input type="number" class="chart-indicator-settings-input" data-field="opacity" min="0.1" max="1" step="0.05" value="${settings.opacity}" inputmode="decimal"/>
</div>
<div class="chart-indicator-settings-field">
<span class="chart-indicator-settings-field-label">Покупка (зелёные)</span>
<label class="chart-indicator-settings-check"><input type="checkbox" data-field="showBuy" ${settings.showBuy ? "checked" : ""}/> Показывать</label>
</div>
<div class="chart-indicator-settings-field">
<span class="chart-indicator-settings-field-label">Продажа (красные)</span>
<label class="chart-indicator-settings-check"><input type="checkbox" data-field="showSell" ${settings.showSell ? "checked" : ""}/> Показывать</label>
</div>
<div class="chart-indicator-settings-field">
<span class="chart-indicator-settings-field-label">Подписи объёма</span>
<label class="chart-indicator-settings-check"><input type="checkbox" data-field="showVolumeLabels" ${settings.showVolumeLabels ? "checked" : ""}/> Шильда при наведении / клике</label>
</div>
<div class="chart-indicator-settings-field">
<span class="chart-indicator-settings-field-label">Цвет покупки</span>
<button type="button" class="ind-ribbon-settings-color" data-field="buyColor" data-color="${settings.buyColor}" style="--line-color:${previewColorHex(settings.buyColor)}" title="Цвет покупки">
<span class="ind-ribbon-settings-color-preview"></span>
</button>
</div>
<div class="chart-indicator-settings-field">
<span class="chart-indicator-settings-field-label">Цвет продажи</span>
<button type="button" class="ind-ribbon-settings-color" data-field="sellColor" data-color="${settings.sellColor}" style="--line-color:${previewColorHex(settings.sellColor)}" title="Цвет продажи">
<span class="ind-ribbon-settings-color-preview"></span>
</button>
</div>
<p class="chart-indicator-settings-hint">Шар показывается, если объём свечи ≥ SMA×множитель и ≥ мин. объёма. Размер растёт с отношением объём/SMA.</p>
`;

function commit(){

const sizeEl =
root.querySelector(
'[data-field="sizeScale"]'
);
const minREl =
root.querySelector(
'[data-field="minRadius"]'
);
const maxREl =
root.querySelector(
'[data-field="maxRadius"]'
);
const maEl =
root.querySelector(
'[data-field="maLength"]'
);
const multEl =
root.querySelector(
'[data-field="volumeMult"]'
);
const minVolEl =
root.querySelector(
'[data-field="minVolume"]'
);
const opacityEl =
root.querySelector(
'[data-field="opacity"]'
);
const showBuyEl =
root.querySelector(
'[data-field="showBuy"]'
);
const showSellEl =
root.querySelector(
'[data-field="showSell"]'
);
const showLabelsEl =
root.querySelector(
'[data-field="showVolumeLabels"]'
);
const buyBtn =
root.querySelector(
'[data-field="buyColor"]'
);
const sellBtn =
root.querySelector(
'[data-field="sellColor"]'
);

persistSettings(
{
sizeScale:
sizeEl?.value,
minRadius:
minREl?.value,
maxRadius:
maxREl?.value,
maLength:
maEl?.value,
volumeMult:
multEl?.value,
minVolume:
minVolEl?.value,
opacity:
opacityEl?.value,
showBuy:
!!showBuyEl?.checked,
showSell:
!!showSellEl?.checked,
showVolumeLabels:
!!showLabelsEl?.checked,
buyColor:
buyBtn?.dataset.color,
sellColor:
sellBtn?.dataset.color
}
);

if(
!settings.showVolumeLabels
){
pinnedHitIndex =
null;
hideBadge();
}

refreshData();

}

root.querySelectorAll(
"input, select"
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
".ind-ribbon-settings-color"
).forEach(
btn=>{
btn.addEventListener(
"click",
(
e
)=>{
e.preventDefault();
e.stopPropagation();
openIndicatorColorPicker(
{
anchorEl:
btn,
color:
btn.dataset.color ||
DEFAULT_BUY_COLOR,
onChange:(
hex
)=>{
btn.dataset.color =
hex;
btn.style.setProperty(
"--line-color",
previewColorHex(
hex
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
refreshData();

}

function enable(){

if(
enabled
){
return;
}

enabled =
true;
readSettings();
bindRedraw();
bindPointerHandlers();
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
bubbles =
[];
hitList =
[];
unbindPointerHandlers();
unbindRedraw();
badgeEl?.remove();
badgeEl =
null;
requestOverlayRedraw();

}

function clearOverlayData(){

bubbles =
[];

}

function onSymbolChange(){

if(
!enabled
){
return;
}

bubbles =
[];
refreshData();

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

if(
!afterRedraw
){
bindRedraw();
}

requestOverlayRedraw();

}

function getLegendText(){

readSettings();
return `Bubbles ×${settings.volumeMult}`;

}

return {
id:
VOLUME_BUBBLES_ID,
label:
"Volume Bubbles",
legendLabel:
"Volume Bubbles",
settingsDialogTitle:
"Volume Bubbles",
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
syncMainChartOverlay,
onSettingsDialogClose:()=>{
closeIndicatorColorPicker();
},
destroy:()=>{
closeIndicatorColorPicker();
unbindPointerHandlers();
badgeEl?.remove();
badgeEl =
null;
disable();
}
};

}
