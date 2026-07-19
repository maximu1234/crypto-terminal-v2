/**
 * Read-only ladder DOM for scalping order book.
 */
import {
getScalpingDomAutocenterPct,
getScalpingDomPriceScale,
getScalpingDomVolumeInput,
SCALPING_DOM_PRICE_SCALE_OPTIONS,
setScalpingDomPriceScale,
setScalpingDomVolumeInput
} from "./prefs.js?v=4";

/* Автоцентровка: только если спред ушёл за порог окна. */
const AUTOCENTER_ENABLED =
true;

function decimalsForTick(
tick
){

if(
!(
tick >
0
)
){
return 6;
}

const s =
tick.toFixed(
12
).replace(
/\.?0+$/,
""
);
const i =
s.indexOf(
"."
);

return i <
0
? 0
: s.length -
i -
1;

}

function formatPrice(
price,
tick
){

if(
!Number.isFinite(
price
)
){
return "—";
}

const decimals =
decimalsForTick(
tick
);

let snapped =
price;

if(
tick >
0
){
snapped =
Math.round(
price /
tick
) *
tick;
}

const fixed =
snapped.toFixed(
decimals
);
const parts =
fixed.split(
"."
);
const intPart =
parts[
0
].replace(
/\B(?=(\d{3})+(?!\d))/g,
" "
);

return decimals >
0
? `${intPart}.${parts[1]}`
: intPart;

}

function formatSize(
size
){

if(
!Number.isFinite(
size
) ||
size <=
0
){
return "";
}

/* Display size is USDT notional. */
if(
size >=
1_000_000
){
const m =
size /
1_000_000;
return `${m >= 10 ? m.toFixed(0) : m.toFixed(1).replace(/\.0$/, "")}M`;
}

if(
size >=
1000
){
const k =
size /
1000;
return `${k >= 10 ? k.toFixed(0) : k.toFixed(1).replace(/\.0$/, "")}K`;
}

if(
size >=
100
){
return String(
Math.round(
size
)
);
}

if(
size >=
10
){
return size.toFixed(
1
).replace(
/\.0$/,
""
);
}

return size.toFixed(
2
).replace(
/\.?0+$/,
""
);

}

function formatVolumeInput(
value
){

const n =
Number(
value
);

if(
!Number.isFinite(
n
) ||
n <=
0
){
return "";
}

return n.toLocaleString(
"en-US",
{
maximumFractionDigits:
0
}
);

}

function buildScaleSelectOptionsHtml(
selected
){

const current =
getScalpingDomPriceScale();
const value =
Number.isFinite(
Number(
selected
)
)
? Number(
selected
)
: current;

return SCALPING_DOM_PRICE_SCALE_OPTIONS.map(
opt=>
`<option value="${opt}"${opt === value ? " selected" : ""}>x${opt}</option>`
).join(
""
);

}

function volumeBarPct(
size,
refMax
){

if(
!(
size >
0
) ||
!(
refMax >
0
)
){
return 0;
}

return Math.min(
100,
(
size /
refMax
) *
100
);

}

/** Mix hex color toward white (0..1). */
function lightenHex(
hex,
amount =
0.2
){

const raw =
String(
hex ||
""
).replace(
"#",
""
);

if(
raw.length !==
6
){
return hex;
}

const n =
parseInt(
raw,
16
);

if(
!Number.isFinite(
n
)
){
return hex;
}

const mix =
(
c
)=>
Math.round(
c +
(
255 -
c
) *
amount
);
const r =
mix(
(
n >>
16
) &
255
);
const g =
mix(
(
n >>
8
) &
255
);
const b =
mix(
n &
255
);

return (
"#" +
[
r,
g,
b
].map(
x=>
x.toString(
16
).padStart(
2,
"0"
)
).join(
""
)
);

}

function slTpEdgeHtml(
mark
){

if(
mark ===
"sl-short"
){
return `<span class="scalping-dom-sl-tp-edge scalping-dom-sl-tp-edge--top scalping-dom-sl-tp-edge--red" aria-hidden="true"></span>`;
}

if(
mark ===
"sl-long"
){
return `<span class="scalping-dom-sl-tp-edge scalping-dom-sl-tp-edge--bottom scalping-dom-sl-tp-edge--red" aria-hidden="true"></span>`;
}

if(
mark ===
"tp-short"
){
return `<span class="scalping-dom-sl-tp-edge scalping-dom-sl-tp-edge--bottom scalping-dom-sl-tp-edge--green" aria-hidden="true"></span>`;
}

if(
mark ===
"tp-long"
){
return `<span class="scalping-dom-sl-tp-edge scalping-dom-sl-tp-edge--top scalping-dom-sl-tp-edge--red" aria-hidden="true"></span>`;
}

return "";

}

function resolveVolumeRefMax(
rows,
userMax
){

if(
Number.isFinite(
userMax
) &&
userMax >
0
){
return userMax;
}

let max =
0;

for(
const row of
rows
){
if(
row.size >
max
){
max =
row.size;
}

}

return max;

}

function rowClassName(
row
){

const classes =
[
"scalping-dom-row",
`scalping-dom-row--${row.side}`
];

if(
row.touch
){
classes.push(
"scalping-dom-row--touch"
);
}

if(
row.major
){
classes.push(
"scalping-dom-row--major"
);
}

if(
row.positionFill ===
"profit"
){
classes.push(
"scalping-dom-row--pos-profit"
);
}else if(
row.positionFill ===
"loss"
){
classes.push(
"scalping-dom-row--pos-loss"
);
}

if(
row.alertUnderline
){
classes.push(
"scalping-dom-row--alert"
);
}

if(
row.triggerUnderline ===
"long"
){
classes.push(
"scalping-dom-row--trigger-long"
);
}else if(
row.triggerUnderline ===
"short"
){
classes.push(
"scalping-dom-row--trigger-short"
);
}

if(
row.slTpHighlight
){
classes.push(
"scalping-dom-row--sl-tp"
);
}

if(
row.slTpMark
){
classes.push(
`scalping-dom-row--${row.slTpMark}`
);
}

return classes.join(
" "
);

}

function rowSideBg(
row
){

let sideBg =
row.side ===
"ask"
? (
row.touch
? "#5d0e07"
: "#5c1d1a"
)
: row.side ===
"bid"
? (
row.touch
? "#102f1e"
: "#0d3d31"
)
: "";

if(
sideBg &&
row.slTpHighlight
){
sideBg =
lightenHex(
sideBg,
0.22
);
}

return sideBg;

}

function rowPriceBg(
row,
sideBg
){

return row.positionFill ===
"profit"
? (
row.slTpHighlight
? lightenHex(
"#357a20",
0.18
)
: "#357a20"
)
: row.positionFill ===
"loss"
? (
row.slTpHighlight
? lightenHex(
"#b61e0c",
0.18
)
: "#b61e0c"
)
: sideBg;

}

function paintRowContent(
el,
row,
tick,
refMax
){

const barPct =
volumeBarPct(
row.size,
refMax
);
const sideBg =
rowSideBg(
row
);
const priceBg =
rowPriceBg(
row,
sideBg
);
const mark =
row.slTpMark ||
"";

el.className =
rowClassName(
row
);
el.dataset.price =
String(
row.price
);
el.dataset.slTpMark =
mark;

if(
sideBg
){
el.style.background =
sideBg;
}else{
el.style.background =
"";
}

let sizeEl =
el.querySelector(
".scalping-dom-size"
);
let priceEl =
el.querySelector(
".scalping-dom-price"
);
let edgeEl =
el.querySelector(
".scalping-dom-sl-tp-edge"
);

if(
!sizeEl ||
!priceEl ||
(
mark &&
!edgeEl
) ||
(
!mark &&
edgeEl
)
){
el.innerHTML =
slTpEdgeHtml(
mark
) +
`<span class="scalping-dom-size"${sideBg ? ` style="background:${sideBg}"` : ""}>` +
(
barPct >
0
? `<span class="scalping-dom-vol-bar" style="width:${barPct.toFixed(1)}%"></span>`
: ""
) +
`<span class="scalping-dom-vol-text">${formatSize(row.size)}</span>` +
`</span>` +
`<span class="scalping-dom-price"${priceBg ? ` style="background:${priceBg}"` : ""}>${formatPrice(row.price, tick)}</span>`;
return;
}

if(
sideBg
){
sizeEl.style.background =
sideBg;
}else{
sizeEl.style.background =
"";
}

if(
priceBg
){
priceEl.style.background =
priceBg;
}else{
priceEl.style.background =
"";
}

let barEl =
sizeEl.querySelector(
".scalping-dom-vol-bar"
);
const textEl =
sizeEl.querySelector(
".scalping-dom-vol-text"
);

if(
barPct >
0
){
if(
!barEl
){
barEl =
document.createElement(
"span"
);
barEl.className =
"scalping-dom-vol-bar";
sizeEl.insertBefore(
barEl,
textEl
);
}
barEl.style.width =
`${barPct.toFixed(1)}%`;
}else if(
barEl
){
barEl.remove();
}

if(
textEl
){
textEl.textContent =
formatSize(
row.size
);
}

priceEl.textContent =
formatPrice(
row.price,
tick
);

}

function canPatchRows(
container,
rows
){

const kids =
container.children;

if(
kids.length !==
rows.length
){
return false;
}

for(
let i =
0;
i <
rows.length;
i++
){
if(
kids[
i
].dataset.price !==
String(
rows[
i
].price
)
){
return false;
}
}

return true;

}

function renderRows(
container,
rows,
tick,
volumeRefMax
){

const refMax =
resolveVolumeRefMax(
rows,
volumeRefMax
);

if(
canPatchRows(
container,
rows
)
){
const kids =
container.children;

for(
let i =
0;
i <
rows.length;
i++
){
paintRowContent(
kids[
i
],
rows[
i
],
tick,
refMax
);
}

return;
}

const frag =
document.createDocumentFragment();

for(
const row of
rows
){
const el =
document.createElement(
"div"
);
paintRowContent(
el,
row,
tick,
refMax
);
frag.appendChild(
el
);
}

container.replaceChildren(
frag
);

}

function getSpreadAnchorY(
ladderEl
){

const askTouch =
ladderEl.querySelector(
".scalping-dom-row--touch.scalping-dom-row--ask"
);
const bidTouch =
ladderEl.querySelector(
".scalping-dom-row--touch.scalping-dom-row--bid"
);

if(
askTouch &&
bidTouch
){
return (
askTouch.offsetTop +
askTouch.offsetHeight /
2 +
bidTouch.offsetTop +
bidTouch.offsetHeight /
2
) /
2;
}

if(
askTouch
){
return askTouch.offsetTop +
askTouch.offsetHeight /
2;
}

if(
bidTouch
){
return bidTouch.offsetTop +
bidTouch.offsetHeight /
2;
}

return null;

}

/**
 * Anchor scroll to a visible price row — NOT to the spread.
 * Keeps the ladder still while the spread walks through levels.
 */
function captureScrollAnchor(
ladderEl
){

if(
!ladderEl ||
ladderEl.clientHeight <=
0
){
return null;
}

const scrollTop =
ladderEl.scrollTop;
const viewMid =
scrollTop +
ladderEl.clientHeight /
2;
const rows =
ladderEl.querySelectorAll(
".scalping-dom-row"
);

let best =
null;
let bestDist =
Infinity;

for(
const row of
rows
){
const y =
row.offsetTop +
row.offsetHeight /
2;
const dist =
Math.abs(
y -
viewMid
);

if(
dist <
bestDist
){
bestDist =
dist;
best =
row;
}

}

if(
!best
){
return {
scrollTop,
price:
null,
offsetInView:
0,
viewH:
ladderEl.clientHeight
};
}

return {
scrollTop,
price:
best.dataset.price ||
null,
offsetInView:
best.offsetTop -
scrollTop,
viewH:
ladderEl.clientHeight
};

}

function restoreScrollAnchor(
ladderEl,
anchor
){

if(
!ladderEl ||
!anchor
){
return;
}

if(
anchor.price
){
const row =
[
...ladderEl.querySelectorAll(
".scalping-dom-row"
)
].find(
el=>
el.dataset.price ===
anchor.price
);

if(
row
){
ladderEl.scrollTop =
Math.max(
0,
row.offsetTop -
anchor.offsetInView
);
return;
}

}

ladderEl.scrollTop =
Math.max(
0,
anchor.scrollTop
);

}

function centerOnSpread(
ladderEl,
spreadY
){

const half =
ladderEl.clientHeight /
2;

ladderEl.scrollTop =
Math.max(
0,
spreadY -
half
);

}

function applyAutocenter(
ladderEl,
forceCenter
){

if(
!AUTOCENTER_ENABLED
){
return;
}

if(
!ladderEl ||
ladderEl.clientHeight <=
0
){
return;
}

/* Весь стакан на экране — скролл не двигаем; окно цен фиксирует sticky range. */
if(
ladderEl.scrollHeight <=
ladderEl.clientHeight +
1
){
return;
}

const spreadY =
getSpreadAnchorY(
ladderEl
);

if(
spreadY ==
null
){
return;
}

const half =
ladderEl.clientHeight /
2;

if(
half <=
0
){
return;
}

const viewCenter =
ladderEl.scrollTop +
half;
const offsetPct =
(
Math.abs(
spreadY -
viewCenter
) /
half
) *
100;
const threshold =
getScalpingDomAutocenterPct();

if(
forceCenter ||
offsetPct >
threshold
){
centerOnSpread(
ladderEl,
spreadY
);
}

}

/**
 * @param {HTMLElement} root
 * @param {{ onSettingsChange?: () => void }} [options]
 */
export function createLadderUi(
root,
options =
{}
){

root.innerHTML =
`<div class="scalping-dom-header">` +
`<input type="text" class="scalping-dom-input scalping-dom-input--volume" data-role="volume-input" inputmode="decimal" spellcheck="false" title="Объём" aria-label="Объём" />` +
`<select class="scalping-dom-input scalping-dom-input--scale" data-role="scale-select" title="Сжатие цены (scale)" aria-label="Сжатие цены">` +
buildScaleSelectOptionsHtml() +
`</select>` +
`</div>` +
`<div class="scalping-dom-ladder" data-role="ladder"></div>` +
`<div class="scalping-dom-status" data-role="status"></div>`;

const volumeInput =
root.querySelector(
'[data-role="volume-input"]'
);
const scaleSelect =
root.querySelector(
'[data-role="scale-select"]'
);
const ladderEl =
root.querySelector(
'[data-role="ladder"]'
);
const statusEl =
root.querySelector(
'[data-role="status"]'
);

if(
volumeInput
){
volumeInput.value =
formatVolumeInput(
getScalpingDomVolumeInput()
);
}

if(
scaleSelect
){
scaleSelect.value =
String(
getScalpingDomPriceScale()
);
}

let forceCenterNext =
true;
let raf =
0;
let scrollTimer =
0;
let pointerOver =
false;

function notifySettings(){

options.onSettingsChange?.();

}

function applyAutocenterUnlessHovered(
forceCenter
){

if(
pointerOver
){
return;
}

applyAutocenter(
ladderEl,
forceCenter
);

}

volumeInput?.addEventListener(
"change",
()=>{

const next =
setScalpingDomVolumeInput(
volumeInput.value
);
volumeInput.value =
formatVolumeInput(
next
);
notifySettings();

}
);

volumeInput?.addEventListener(
"keydown",
e=>{

if(
e.key ===
"Enter"
){
volumeInput.blur();
}

}
);

scaleSelect?.addEventListener(
"change",
()=>{

const next =
setScalpingDomPriceScale(
scaleSelect.value
);
scaleSelect.value =
String(
next
);
forceCenterNext =
true;
notifySettings();

}
);

function checkAutocenterAfterScroll(){

if(
pointerOver ||
!AUTOCENTER_ENABLED
){
return;
}

if(
!ladderEl ||
ladderEl.clientHeight <=
0
){
return;
}

const spreadY =
getSpreadAnchorY(
ladderEl
);

if(
spreadY ==
null
){
return;
}

const half =
ladderEl.clientHeight /
2;

if(
half <=
0
){
return;
}

const viewCenter =
ladderEl.scrollTop +
half;
const offsetPct =
(
Math.abs(
spreadY -
viewCenter
) /
half
) *
100;

if(
offsetPct >
getScalpingDomAutocenterPct()
){
centerOnSpread(
ladderEl,
spreadY
);
}

}

ladderEl?.addEventListener(
"scroll",
()=>{

if(
scrollTimer
){
clearTimeout(
scrollTimer
);
}

scrollTimer =
window.setTimeout(
()=>{
scrollTimer =
0;
checkAutocenterAfterScroll();
},
180
);

},
{
passive:
true
}
);

root.addEventListener(
"pointerenter",
()=>{
pointerOver =
true;
}
);

root.addEventListener(
"pointerleave",
()=>{
pointerOver =
false;
applyAutocenterUnlessHovered(
false
);
}
);

function scheduleScrollRestore(
anchor,
recentered
){

if(
raf
){
cancelAnimationFrame(
raf
);
}

const force =
forceCenterNext ||
!!recentered;
forceCenterNext =
false;

raf =
requestAnimationFrame(
()=>{
raf =
0;

if(
!force &&
anchor
){
restoreScrollAnchor(
ladderEl,
anchor
);
}

applyAutocenterUnlessHovered(
force
);
}
);

}

return {
setSymbol(){
/* header shows volume/scale inputs instead of ticker */
forceCenterNext =
true;
},
setStatus(
text
){
if(
statusEl
){
statusEl.textContent =
text ||
"";
}
},
render(
ladder
){
if(
!ladder ||
!ladderEl
){
ladderEl?.replaceChildren();
return;
}

const anchor =
captureScrollAnchor(
ladderEl
);

renderRows(
ladderEl,
ladder.rows ||
[],
ladder.tick ||
0,
getScalpingDomVolumeInput()
);

scheduleScrollRestore(
anchor,
ladder.recentered
);
},
destroy(){
if(
raf
){
cancelAnimationFrame(
raf
);
raf =
0;
}
if(
scrollTimer
){
clearTimeout(
scrollTimer
);
scrollTimer =
0;
}
root.replaceChildren();
}
};

}
