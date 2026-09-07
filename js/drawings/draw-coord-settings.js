/**
 * Coordinates tab UI for drawing settings (price + bar steppers).
 */
import {
applyCoordFieldToShape,
coordFieldsForType,
formatCoordPrice,
barIndexFromTime,
hasCoordSettings,
parseCoordBar,
parseCoordNumber,
priceStepFor,
readShapeCoordPoint
} from "./draw-coords.js?v=1";

function spinButtonsHtml(
kind
){

return `
<span class="draw-coord-spin" aria-hidden="true">
<button type="button" class="draw-coord-spin-btn draw-coord-spin-up" data-coord-spin="${kind}" data-coord-dir="1" tabindex="-1"></button>
<button type="button" class="draw-coord-spin-btn draw-coord-spin-down" data-coord-spin="${kind}" data-coord-dir="-1" tabindex="-1"></button>
</span>
`;

}

function coordInputHtml(
field,
kind
){

const step =
kind ===
"bar"
? "1"
: "any";
const inputMode =
kind ===
"bar"
? "numeric"
: "decimal";

return `
<span class="draw-coord-input-wrap">
<input type="text" class="draw-coord-input draw-coord-${kind}" data-coord-id="${field.id}" data-coord-kind="${kind}" inputmode="${inputMode}" autocomplete="off" spellcheck="false" step="${step}"/>
${spinButtonsHtml(kind)}
</span>
`;

}

export function coordSettingsHtml(
type
){

const fields =
coordFieldsForType(
type
);

if(
!fields.length
){
return "";
}

const rows =
fields.map(
field=>{

const inputs =
[
field.price
? coordInputHtml(
field,
"price"
)
: "",
field.bar
? coordInputHtml(
field,
"bar"
)
: ""
].join(
""
);

return `
<label class="draw-coord-row">
<span class="draw-coord-label">${field.label}</span>
<span class="draw-coord-fields">${inputs}</span>
</label>
`;

}
).join(
""
);

return `
<div class="draw-coord-settings">
${rows}
</div>
`;

}

export function drawSettingsTabsHtml(
{
styleHtml,
coordsHtml,
activeTab = "style"
}
){

if(
!coordsHtml
){
return styleHtml ||
"";
}

if(
!styleHtml
){
return coordsHtml;
}

const styleActive =
activeTab !==
"coords";

return `
<div class="draw-settings-shell">
<div class="draw-settings-tabs" role="tablist">
<button type="button" class="draw-settings-tab${styleActive ? " is-active" : ""}" data-draw-settings-tab="style" role="tab">Style</button>
<button type="button" class="draw-settings-tab${styleActive ? "" : " is-active"}" data-draw-settings-tab="coords" role="tab">Coordinates</button>
</div>
<div class="draw-settings-tab-panel${styleActive ? "" : " hidden"}" data-draw-settings-panel="style">${styleHtml}</div>
<div class="draw-settings-tab-panel${styleActive ? " hidden" : ""}" data-draw-settings-panel="coords">${coordsHtml}</div>
</div>
`;

}

export function bindDrawSettingsTabs(
root,
signal
){

root?.querySelectorAll(
"[data-draw-settings-tab]"
).forEach(
btn=>{

btn.addEventListener(
"click",
e=>{

e.preventDefault();
e.stopPropagation();

const tab =
btn.dataset.drawSettingsTab;

root.querySelectorAll(
"[data-draw-settings-tab]"
).forEach(
other=>{
other.classList.toggle(
"is-active",
other ===
btn
);
}
);

root.querySelectorAll(
"[data-draw-settings-panel]"
).forEach(
panel=>{
panel.classList.toggle(
"hidden",
panel.dataset.drawSettingsPanel !==
tab
);
}
);

},
{
signal
}
);

}
);

}

export function fillCoordSettingsPanel(
root,
shape,
candles,
tf
){

if(
!root ||
!hasCoordSettings(
shape?.type
)
){
return;
}

const active =
typeof document !==
"undefined"
? document.activeElement
: null;
const fields =
coordFieldsForType(
shape.type
);

fields.forEach(
field=>{

const point =
readShapeCoordPoint(
shape,
field.id
);

if(
field.price
){

const input =
root.querySelector(
`[data-coord-id="${field.id}"][data-coord-kind="price"]`
);

if(
input &&
input !==
active
){
input.value =
formatCoordPrice(
point?.price
);
}

}

if(
field.bar
){

const input =
root.querySelector(
`[data-coord-id="${field.id}"][data-coord-kind="bar"]`
);

if(
input &&
input !==
active
){
input.value =
String(
barIndexFromTime(
candles,
point?.time,
tf
)
);
}

}

}
);

}

export function isCoordInputFocused(
root
){

if(
!root ||
typeof document ===
"undefined"
){
return false;
}

const active =
document.activeElement;

return !!(
active &&
root.contains(
active
) &&
active.classList?.contains(
"draw-coord-input"
)
);

}

function restoreInputFromShape(
input,
shape,
candles,
tf
){

const fieldId =
input.dataset.coordId;
const kind =
input.dataset.coordKind;
const point =
readShapeCoordPoint(
shape,
fieldId
);

if(
kind ===
"price"
){
input.value =
formatCoordPrice(
point?.price
);
return;
}

input.value =
String(
barIndexFromTime(
candles,
point?.time,
tf
)
);

}

function stepCoordValue(
input,
dir,
shape,
candles,
tf
){

const kind =
input.dataset.coordKind;
const fieldId =
input.dataset.coordId;
const point =
readShapeCoordPoint(
shape,
fieldId
);

if(
kind ===
"bar"
){

const current =
parseCoordBar(
input.value
);
const base =
Number.isFinite(
current
)
? current
: barIndexFromTime(
candles,
point?.time,
tf
);

return String(
base +
dir
);

}

const current =
parseCoordNumber(
input.value
);
const base =
Number.isFinite(
current
)
? current
: Number(
point?.price
);
const step =
priceStepFor(
base
);
const next =
base +
dir *
step;
const decimals =
Math.max(
0,
Math.round(
-Math.log10(
step
)
)
);

return next.toFixed(
decimals
).replace(
(/(\.\d*?)0+$/),
"$1"
).replace(
/\.$/,
""
);

}

export function bindCoordSettingsPanel(
root,
{
getAlive,
getShape,
getCandles,
getTf,
canApply,
onApply,
signal
}
){

if(
!root
){
return;
}

const coordRoot =
root.querySelector(
".draw-coord-settings"
) ||
(
root.classList?.contains(
"draw-coord-settings"
)
? root
: null
);

if(
!coordRoot
){
return;
}

function commitInput(
input
){

if(
!getAlive?.() ||
!canApply?.()
){
return;
}

const shape =
getShape?.();

if(
!shape
){
return;
}

const ok =
applyCoordFieldToShape(
shape,
input.dataset.coordId,
input.dataset.coordKind,
input.value,
getCandles?.() ||
[],
getTf?.()
);

if(
!ok
){

restoreInputFromShape(
input,
shape,
getCandles?.() ||
[],
getTf?.()
);
return;

}

onApply?.(
input.dataset.coordId,
input.dataset.coordKind
);

}

coordRoot.querySelectorAll(
".draw-coord-input"
).forEach(
input=>{

input.addEventListener(
"keydown",
e=>{

e.stopPropagation();

if(
e.key ===
"Enter"
){
e.preventDefault();
commitInput(
input
);
input.blur();
}

},
{
signal
}
);

input.addEventListener(
"change",
()=>{
commitInput(
input
);
},
{
signal
}
);

}
);

coordRoot.querySelectorAll(
".draw-coord-spin-btn"
).forEach(
btn=>{

btn.addEventListener(
"mousedown",
e=>{
e.preventDefault();
e.stopPropagation();
},
{
signal
}
);

btn.addEventListener(
"click",
e=>{

e.preventDefault();
e.stopPropagation();

if(
!getAlive?.() ||
!canApply?.()
){
return;
}

const wrap =
btn.closest(
".draw-coord-input-wrap"
);
const input =
wrap?.querySelector(
".draw-coord-input"
);
const shape =
getShape?.();

if(
!input ||
!shape
){
return;
}

const dir =
Number(
btn.dataset.coordDir
) ||
1;

input.value =
stepCoordValue(
input,
dir,
shape,
getCandles?.() ||
[],
getTf?.()
);
commitInput(
input
);

},
{
signal
}
);

}
);

}
