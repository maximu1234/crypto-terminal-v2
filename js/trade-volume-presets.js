/**
 * /trade — пресеты объёма сделки (USDT) в шапке над графиком.
 * Дефолты — в настройках Bybit; для каждой монеты — отдельно.
 */
const DEFAULTS_KEY =
"trade_volume_defaults_v2";

const BY_SYMBOL_KEY =
"trade_volume_by_symbol_v2";

const LEGACY_KEY =
"trade_volume_presets_v1";
const TOTAL_PNL_HIDDEN_KEY =
"trade_book_total_pnl_hidden_v1";

export const TRADE_VOLUME_SLOT_COUNT =
6;
export const TRADE_VOLUME_POSITION_APPLY_SLOT_INDEX =
TRADE_VOLUME_SLOT_COUNT - 1;

const SLOT_COUNT =
TRADE_VOLUME_SLOT_COUNT;

let state =
{
slots:
Array(
SLOT_COUNT
).fill(
0
),
activeIndex:
0
};

let currentSymbolNorm =
"";

/** @type {{ labelEl: Element, dropdown: Element } | null} */
let ui =
null;

function normalizeSymbol(
symbol
){

return String(
symbol ||
""
).replace(
/\.P$/i,
""
).trim().toUpperCase();

}

function normalizeSlotValue(
value
){

const num =
Number(
value
);

if(
!Number.isFinite(
num
) ||
num <
0
){
return 0;
}

return Math.round(
num *
100
) /
100;

}

function normalizeSlots(
slots
){

const arr =
Array.isArray(
slots
)
? slots.slice(
0,
SLOT_COUNT
)
: [];

while(
arr.length <
SLOT_COUNT
){
arr.push(
0
);
}

return arr.map(
normalizeSlotValue
);

}

function clampActiveIndex(
index
){

return Number.isInteger(
index
) &&
index >=
0 &&
index <
SLOT_COUNT
? index
: 0;

}

function readDefaults(){

try{
const raw =
localStorage.getItem(
DEFAULTS_KEY
);

if(
raw
){
const parsed =
JSON.parse(
raw
);
return normalizeSlots(
parsed?.slots
);
}
}catch{
/* ignore */
}

try{
const legacy =
localStorage.getItem(
LEGACY_KEY
);

if(
legacy
){
const parsed =
JSON.parse(
legacy
);
const slots =
normalizeSlots(
parsed?.slots
);
writeDefaults(
slots
);
return slots;
}
}catch{
/* ignore */
}

return normalizeSlots(
[]
);

}

function writeDefaults(
slots
){

localStorage.setItem(
DEFAULTS_KEY,
JSON.stringify(
{
slots:
normalizeSlots(
slots
)
}
)
);

}

function readBySymbolMap(){

try{
const raw =
localStorage.getItem(
BY_SYMBOL_KEY
);

if(
!raw
){
return {};
}

const parsed =
JSON.parse(
raw
);

return parsed &&
typeof parsed ===
"object"
? parsed
: {};
}catch{
return {};
}

}

function writeBySymbolMap(
map
){

localStorage.setItem(
BY_SYMBOL_KEY,
JSON.stringify(
map
)
);

}

function loadStateForSymbol(
symbol
){

const sym =
normalizeSymbol(
symbol
);
const bySymbol =
readBySymbolMap();
const entry =
bySymbol[
sym
];
const defaults =
readDefaults();

if(
entry
){
return {
slots:
normalizeSlots(
entry.slots
),
activeIndex:
clampActiveIndex(
entry.activeIndex
)
};
}

return {
slots:[
...defaults
],
activeIndex:
0
};

}

function persistCurrentSymbolState(){

if(
!currentSymbolNorm
){
return;
}

const bySymbol =
readBySymbolMap();

bySymbol[
currentSymbolNorm
] =
{
slots:[
...state.slots
],
activeIndex:
state.activeIndex
};

writeBySymbolMap(
bySymbol
);

}

export function getDefaultVolumeSlots(){

return [
...readDefaults()
];

}

export function saveDefaultVolumePresets(
slots
){

const normalized =
normalizeSlots(
slots
);
writeDefaults(
normalized
);
writeBySymbolMap(
{}
);

if(
currentSymbolNorm
){
state =
loadStateForSymbol(
currentSymbolNorm
);
}else{
state =
{
slots:[
...normalized
],
activeIndex:
0
};
}

refreshVolumeUi();
dispatchChange();

window.dispatchEvent(
new CustomEvent(
"trade-volume-defaults-saved"
)
);

return {
ok:
true
};

}

export function switchTradeVolumeSymbol(
symbol
){

const sym =
normalizeSymbol(
symbol
);

if(
!sym
){
return;
}

if(
sym ===
currentSymbolNorm
){
refreshVolumeUi();
return;
}

currentSymbolNorm =
sym;
state =
loadStateForSymbol(
sym
);
refreshVolumeUi();
dispatchChange();

}

function formatVolumeLabel(
value
){

const num =
normalizeSlotValue(
value
);

if(
Number.isInteger(
num
)
){
return String(
num
);
}

return String(
num
);

}

export function getTradeVolumePresetsState(){

return {
slots:[
...state.slots
],
activeIndex:
state.activeIndex,
activeUsdt:
state.slots[
state.activeIndex
] ??
0,
symbol:
currentSymbolNorm
};

}

export function getActiveTradeVolumeUsdt(
symbol
){

if(
symbol
){
const entry =
loadStateForSymbol(
symbol
);

return entry.slots[
entry.activeIndex
] ??
0;
}

return state.slots[
state.activeIndex
] ??
0;

}

export function getVolumeStateForSymbol(
symbol
){

return loadStateForSymbol(
symbol
);

}

export function saveVolumeStateForSymbol(
symbol,
volumeState
){

const sym =
normalizeSymbol(
symbol
);

if(
!sym ||
!volumeState
){
return;
}

const bySymbol =
readBySymbolMap();

bySymbol[
sym
] =
{
slots:
normalizeSlots(
volumeState.slots
),
activeIndex:
clampActiveIndex(
volumeState.activeIndex
)
};

writeBySymbolMap(
bySymbol
);

if(
sym ===
currentSymbolNorm
){
state =
loadStateForSymbol(
sym
);
refreshVolumeUi();
}

}

function dispatchChange(){

window.dispatchEvent(
new CustomEvent(
"trade-volume-change",
{
detail:
getTradeVolumePresetsState()
}
)
);

}

function setTradeVolumeSlotValue(
index,
value,
{
activate = false
} = {}
){

if(
!Number.isInteger(index) ||
index < 0 ||
index >= SLOT_COUNT
){
return false;
}

state.slots[index] =
normalizeSlotValue(value);

if(activate){
state.activeIndex =
index;
}

persistCurrentSymbolState();
refreshVolumeUi();
dispatchChange();
return true;

}

export function applyPositionVolumeFromDrawing(
{
symbol,
volumeUsdt
} = {}
){

const normalized =
normalizeSlotValue(
volumeUsdt
);

if(
!Number.isFinite(
normalized
) ||
normalized <=
0
){
return false;
}

const sym =
normalizeSymbol(
symbol ||
currentSymbolNorm
);
const slotIndex =
TRADE_VOLUME_POSITION_APPLY_SLOT_INDEX;

if(
sym
){

const entry =
loadStateForSymbol(
sym
);

entry.slots[
slotIndex
] =
normalized;
entry.activeIndex =
slotIndex;

saveVolumeStateForSymbol(
sym,
entry
);

if(
sym ===
currentSymbolNorm
){
state.slots[
slotIndex
] =
normalized;
state.activeIndex =
slotIndex;
refreshVolumeUi();
}

dispatchChange();

return true;

}

return setTradeVolumeSlotValue(
slotIndex,
normalized,
{
activate: true
}
);

}

export function applyPositionVolumeToTradePreset(
volumeUsdt
){

return applyPositionVolumeFromDrawing(
{
volumeUsdt
}
);

}

function installPositionVolumeApplyListener(){

if(
installPositionVolumeApplyListener.installed
){
return;
}

installPositionVolumeApplyListener.installed =
true;

window.addEventListener(
"trade-apply-position-volume",
event=>{

if(
!document.body.classList.contains(
"trade-page"
)
){
return;
}

const volumeUsdt =
Number(
event?.detail?.volumeUsdt
);

if(
!Number.isFinite(
volumeUsdt
) ||
volumeUsdt <=
0
){
return;
}

applyPositionVolumeFromDrawing(
{
symbol:
event?.detail?.symbol,
volumeUsdt
}
);

}
);

}

installPositionVolumeApplyListener();

function renderTriggerLabel(
labelEl
){

if(
!labelEl
){
return;
}

const nextLabel =
formatVolumeLabel(
state.slots[
state.activeIndex
] ??
0
);
const pnlHidden =
localStorage.getItem(
TOTAL_PNL_HIDDEN_KEY
) ===
"1";

labelEl.textContent =
pnlHidden
? "***"
: nextLabel;

}

function refreshVolumeUi(){

if(
!ui
){
return;
}

renderTriggerLabel(
ui.labelEl
);

const rows =
ui.dropdown.querySelectorAll(
"[data-volume-slot]"
);

rows.forEach(
row=>{

const index =
Number(
row.dataset.volumeSlot
);
const radio =
row.querySelector(
'input[type="radio"]'
);
const input =
row.querySelector(
'input[type="number"]'
);

if(
!Number.isInteger(
index
) ||
!radio ||
!input
){
return;
}

input.value =
String(
state.slots[
index
] ??
0
);
radio.checked =
state.activeIndex ===
index;

}
);

}

export function focusActiveVolumePresetInput(
dropdown,
activeIndex =
state.activeIndex
){

if(
!dropdown
){
return;
}

const index =
clampActiveIndex(
activeIndex
);
const row =
dropdown.querySelector(
`[data-volume-slot="${index}"]`
);
const input =
row?.querySelector(
'input[type="number"]'
);

if(
!input
){
return;
}

requestAnimationFrame(
()=>{

input.focus(
{
preventScroll:
true
}
);

try{
input.select();
}catch{
/* ignore */
}

}
);

}

function bindDropdown(
wrap,
btn,
dropdown
){

function setOpen(
open
){

dropdown.classList.toggle(
"hidden",
!open
);
btn.setAttribute(
"aria-expanded",
open
? "true"
: "false"
);

if(
open
){
refreshVolumeUi();
focusActiveVolumePresetInput(
dropdown
);
}

}

btn.addEventListener(
"click",
event=>{
event.stopPropagation();
setOpen(
dropdown.classList.contains(
"hidden"
)
);
}
);

dropdown.addEventListener(
"click",
event=>{
event.stopPropagation();
}
);

document.addEventListener(
"click",
()=>{
setOpen(
false
);
}
);

return {
close:()=>
setOpen(
false
)
};

}

function wireChartDropdown(
root,
{
labelEl
}
){

const rows =
root.querySelectorAll(
"[data-volume-slot]"
);

rows.forEach(
row=>{

const index =
Number(
row.dataset.volumeSlot
);
const radio =
row.querySelector(
'input[type="radio"]'
);
const input =
row.querySelector(
'input[type="number"]'
);

if(
!Number.isInteger(
index
) ||
index <
0 ||
index >=
SLOT_COUNT ||
!radio ||
!input
){
return;
}

radio.addEventListener(
"change",
()=>{

if(
!radio.checked
){
return;
}

state.activeIndex =
index;
persistCurrentSymbolState();
renderTriggerLabel(
labelEl
);
dispatchChange();
focusActiveVolumePresetInput(
root,
index
);

}
);

input.addEventListener(
"focus",
()=>{

if(
state.activeIndex !==
index
){
state.activeIndex =
index;
radio.checked =
true;
persistCurrentSymbolState();
renderTriggerLabel(
labelEl
);
dispatchChange();
}

}
);

input.addEventListener(
"change",
()=>{

state.slots[
index
] =
normalizeSlotValue(
input.value
);
input.value =
String(
state.slots[
index
]
);
persistCurrentSymbolState();

if(
state.activeIndex ===
index
){
renderTriggerLabel(
labelEl
);
dispatchChange();
}

}
);

input.addEventListener(
"keydown",
event=>{

if(
event.key ===
"Enter"
){
event.preventDefault();
input.blur();
root.closest(
".trade-volume-presets-dropdown"
)?.classList.add(
"hidden"
);
}

}
);

}
);

}

function buildVolumeRowsHtml(
namePrefix
){

return Array.from(
{
length:
SLOT_COUNT
},
(
_unused,
index
)=>
`
<label class="trade-volume-presets-row" data-volume-slot="${index}">
<input type="radio" name="${namePrefix}-active" value="${index}" aria-label="Пресет ${index + 1}"/>
<span class="trade-volume-presets-field">
<input type="number" min="0" step="any" inputmode="decimal" aria-label="Объём USDT ${index + 1}"/>
<span class="trade-volume-presets-suffix">$</span>
</span>
</label>
`
).join(
""
);

}

function buildChartDropdown(
root
){

root.innerHTML =
`
<div class="trade-volume-presets-panel" role="dialog" aria-label="Объём сделки USDT">
${buildVolumeRowsHtml(
"trade-volume"
)}
</div>
`;

}

export function wireTradeVolumeDefaultsSettings(
form
){

const panel =
form.querySelector(
"[data-role='volume-defaults-panel']"
);

const saveBtn =
form.querySelector(
"[data-role='save-volume-defaults']"
);
const statusEl =
form.querySelector(
"[data-role='volume-defaults-status']"
);

if(
!panel ||
!saveBtn
){
return;
}

const inputs =
panel.querySelectorAll(
"input[type='number']"
);

function fillDefaultsInputs(){

const defaults =
getDefaultVolumeSlots();

inputs.forEach(
(
input,
index
)=>{
input.value =
String(
defaults[
index
] ??
0
);
}
);

}

function setDefaultsStatus(
text,
kind =
""
){

if(
!statusEl
){
return;
}

statusEl.textContent =
text ||
"";
statusEl.classList.remove(
"is-ok",
"is-error"
);

if(
kind
){
statusEl.classList.add(
kind
);
}

}

fillDefaultsInputs();

window.addEventListener(
"trade-volume-defaults-saved",
fillDefaultsInputs
);

saveBtn.addEventListener(
"click",
()=>{

const slots =
[];

inputs.forEach(
input=>{
slots.push(
normalizeSlotValue(
input.value
)
);
}
);

saveDefaultVolumePresets(
slots
);
fillDefaultsInputs();
setDefaultsStatus(
"Сохранено. Объёмы всех монет сброшены к этим значениям.",
"is-ok"
);

}
);

}

export function initTradeVolumePresets(){

if(
!document.body.classList.contains(
"trade-page"
)
){
return null;
}

const topbar =
document.getElementById(
"topbar"
);

if(
!topbar ||
document.getElementById(
"trade-volume-presets-wrap"
)
){
return null;
}

const wrap =
document.createElement(
"div"
);
wrap.id =
"trade-volume-presets-wrap";
wrap.className =
"trade-volume-presets-wrap";

wrap.innerHTML =
`
<button type="button" class="trade-volume-presets-btn" id="trade-volume-presets-btn" aria-expanded="false" aria-haspopup="true" title="Объём сделки USDT">
<span class="trade-volume-presets-grid" aria-hidden="true"></span>
<span class="trade-volume-presets-value" data-role="volume-label">0</span>
</button>
<div class="trade-volume-presets-dropdown hidden" id="trade-volume-presets-dropdown"></div>
`;

topbar.appendChild(
wrap
);

const btn =
wrap.querySelector(
"#trade-volume-presets-btn"
);
const dropdown =
wrap.querySelector(
"#trade-volume-presets-dropdown"
);
const labelEl =
wrap.querySelector(
'[data-role="volume-label"]'
);

btn?.addEventListener(
"mousedown",
event=>{
if(
event.button ===
0
){
event.preventDefault();
}
},
true
);

btn?.addEventListener(
"keydown",
event=>{
if(
event.code === "Space" ||
event.code === "Enter"
){
event.preventDefault();
}
},
true
);

btn?.addEventListener(
"click",
()=>{
queueMicrotask(
()=>{
btn.blur();
}
);
},
true
);

buildChartDropdown(
dropdown
);

ui =
{
labelEl,
dropdown
};

wireChartDropdown(
dropdown,
{
labelEl
}
);
bindDropdown(
wrap,
btn,
dropdown
);

const symEl =
document.getElementById(
"current-symbol"
);

if(
symEl?.textContent
){
switchTradeVolumeSymbol(
symEl.textContent
);
}else{
refreshVolumeUi();
}

window.addEventListener(
"chart-candles-loaded",
event=>{

const sym =
event.detail?.symbol;

if(
sym
){
switchTradeVolumeSymbol(
sym
);
}

}
);

window.addEventListener(
"trade-total-pnl-visibility-changed",
()=>{
refreshVolumeUi();
}
);

return wrap;

}
