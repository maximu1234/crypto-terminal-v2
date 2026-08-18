/** @module drawings/fixed-volume-profile-settings */

import {
mountTvColorPicker,
parseDrawColor
} from "../draw-color-palette.js?v=6";

import {
normalizeFibLineStyle,
normalizeFibLevelWidth,
setFibLineStyleButton,
setFibLevelWidthButton
} from "./fib-spec.js?v=13";

import {
closeAllFibLineStyleMenus,
openFibLineStyleMenu,
closeAllFibLineWidthMenus,
openFibLineWidthMenu,
isFibLineStyleMenuOpenForAnchor,
isFibLineWidthMenuOpenForAnchor
} from "./fib-portals.js?v=3";

import {
createFvpToolDefaults,
migrateFvpToolDefaults
} from "./fixed-volume-profile.js?v=3";

function swatchVar(
color
){

const parsed =
parseDrawColor(
color
);

return parsed?.hex ||
color ||
"#787b86";
}

function lineRow(
label,
enableClass,
colorClass,
widthClass,
styleClass
){

return `
<label class="fvp-settings-row fvp-settings-row--check">
<input type="checkbox" class="${enableClass}" />
<span class="fvp-settings-label">${label}</span>
<button type="button" class="fvp-color-btn ${colorClass}" title="${label} color" aria-label="${label} color"></button>
<button type="button" class="fvp-width-btn ${widthClass}" title="Width">1px</button>
<button type="button" class="fvp-style-btn ${styleClass}" title="Style" aria-label="${label} style"></button>
</label>`;

}

function colorRow(
label,
colorClass
){

return `
<label class="fvp-settings-row">
<span class="fvp-settings-label">${label}</span>
<button type="button" class="fvp-color-btn ${colorClass}" title="${label}" aria-label="${label}"></button>
</label>`;

}

export function fvpSettingsHtml(){

return `
<div class="fvp-settings">
<div class="fvp-settings-tabs" role="tablist">
<button type="button" class="fvp-tab is-active" data-fvp-tab="inputs">Inputs</button>
<button type="button" class="fvp-tab" data-fvp-tab="style">Style</button>
</div>
<div class="fvp-tab-panel" data-fvp-panel="inputs">
<label class="fvp-settings-row">
<span class="fvp-settings-label">Rows Layout</span>
<select class="fvp-rows-layout">
<option value="numberOfRows">Number of Rows</option>
<option value="ticksPerRow">Ticks Per Row</option>
</select>
</label>
<label class="fvp-settings-row">
<span class="fvp-settings-label">Row Size</span>
<input type="number" class="fvp-row-size" min="1" max="10000" step="1" />
</label>
<label class="fvp-settings-row">
<span class="fvp-settings-label">Volume</span>
<select class="fvp-volume-mode">
<option value="upDown">Up/Down</option>
<option value="total">Total</option>
<option value="delta">Delta</option>
</select>
</label>
<label class="fvp-settings-row">
<span class="fvp-settings-label">Value Area Volume</span>
<input type="number" class="fvp-va-percent" min="1" max="100" step="1" />
</label>
<label class="fvp-settings-row fvp-settings-row--check">
<input type="checkbox" class="fvp-extend-right" />
<span class="fvp-settings-label">Extend Right</span>
</label>
</div>
<div class="fvp-tab-panel hidden" data-fvp-panel="style">
<label class="fvp-settings-row fvp-settings-row--check">
<input type="checkbox" class="fvp-show-profile" />
<span class="fvp-settings-label">Volume Profile</span>
<input type="checkbox" class="fvp-show-values" title="Values" />
<span class="fvp-settings-mini">Values</span>
<button type="button" class="fvp-color-btn fvp-values-color" title="Values color" aria-label="Values color"></button>
<input type="number" class="fvp-width-percent" min="1" max="100" step="1" title="Width (% of the box)" />
<span class="fvp-settings-mini">%</span>
</label>
${colorRow("Up volume", "fvp-up-color")}
${colorRow("Down volume", "fvp-down-color")}
${colorRow("Value Area Up", "fvp-va-up-color")}
${colorRow("Value Area Down", "fvp-va-down-color")}
${lineRow("POC", "fvp-show-poc", "fvp-poc-color", "fvp-poc-width", "fvp-poc-style")}
${lineRow("Developing POC", "fvp-show-developing-poc", "fvp-dev-poc-color", "fvp-dev-poc-width", "fvp-dev-poc-style")}
${lineRow("VAH", "fvp-show-vah", "fvp-vah-color", "fvp-vah-width", "fvp-vah-style")}
${lineRow("VAL", "fvp-show-val", "fvp-val-color", "fvp-val-width", "fvp-val-style")}
${lineRow("Developing VA", "fvp-show-developing-va", "fvp-dev-va-color", "fvp-dev-va-width", "fvp-dev-va-style")}
<label class="fvp-settings-row fvp-settings-row--check">
<input type="checkbox" class="fvp-show-box" />
<span class="fvp-settings-label">Histogram Box</span>
<button type="button" class="fvp-color-btn fvp-box-color" title="Histogram Box color" aria-label="Histogram Box color"></button>
</label>
</div>
</div>`;

}

const COLOR_MAP =
[
[
".fvp-values-color",
"valuesColor"
],
[
".fvp-up-color",
"upColor"
],
[
".fvp-down-color",
"downColor"
],
[
".fvp-va-up-color",
"vaUpColor"
],
[
".fvp-va-down-color",
"vaDownColor"
],
[
".fvp-poc-color",
"pocColor"
],
[
".fvp-dev-poc-color",
"developingPocColor"
],
[
".fvp-vah-color",
"vahColor"
],
[
".fvp-val-color",
"valColor"
],
[
".fvp-dev-va-color",
"developingVaColor"
],
[
".fvp-box-color",
"histogramBoxColor"
]
];

const WIDTH_MAP =
[
[
".fvp-poc-width",
"pocLineWidth"
],
[
".fvp-dev-poc-width",
"developingPocLineWidth"
],
[
".fvp-vah-width",
"vahLineWidth"
],
[
".fvp-val-width",
"valLineWidth"
],
[
".fvp-dev-va-width",
"developingVaLineWidth"
]
];

const STYLE_MAP =
[
[
".fvp-poc-style",
"pocLineStyle"
],
[
".fvp-dev-poc-style",
"developingPocLineStyle"
],
[
".fvp-vah-style",
"vahLineStyle"
],
[
".fvp-val-style",
"valLineStyle"
],
[
".fvp-dev-va-style",
"developingVaLineStyle"
]
];

function q(
root,
sel
){

return root.querySelector(
sel
);

}

export function fillFvpSettingsPanel(
root,
shape
){

if(
!root
){
return;
}

const s =
migrateFvpToolDefaults(
shape ||
createFvpToolDefaults()
);

const rowsLayout =
q(
root,
".fvp-rows-layout"
);
const rowSize =
q(
root,
".fvp-row-size"
);
const volumeMode =
q(
root,
".fvp-volume-mode"
);
const vaPercent =
q(
root,
".fvp-va-percent"
);
const extendRight =
q(
root,
".fvp-extend-right"
);

if(
rowsLayout
){
rowsLayout.value =
s.rowsLayout;
}

if(
rowSize
){
rowSize.value =
String(
s.rowSize
);
}

if(
volumeMode
){
volumeMode.value =
s.volumeMode;
}

if(
vaPercent
){
vaPercent.value =
String(
s.vaPercent
);
}

if(
extendRight
){
extendRight.checked =
!!s.extendRight;
}

const showProfile =
q(
root,
".fvp-show-profile"
);
const showValues =
q(
root,
".fvp-show-values"
);
const widthPercent =
q(
root,
".fvp-width-percent"
);

if(
showProfile
){
showProfile.checked =
s.showProfile !==
false;
}

if(
showValues
){
showValues.checked =
s.showValues !==
false;
}

if(
widthPercent
){
widthPercent.value =
String(
s.widthPercent
);
}

const checks =
[
[
".fvp-show-poc",
s.showPoc !==
false
],
[
".fvp-show-developing-poc",
!!s.showDevelopingPoc
],
[
".fvp-show-vah",
!!s.showVah
],
[
".fvp-show-val",
!!s.showVal
],
[
".fvp-show-developing-va",
!!s.showDevelopingVa
],
[
".fvp-show-box",
s.showHistogramBox !==
false
]
];

for(
const [
sel,
on
] of
checks
){

const el =
q(
root,
sel
);

if(
el
){
el.checked =
on;
}

}

for(
const [
sel,
key
] of
COLOR_MAP
){

const btn =
q(
root,
sel
);

if(
btn
){
btn.style.setProperty(
"--fvp-swatch",
swatchVar(
s[key]
)
);
btn.dataset.fvpColor =
s[key];
}

}

for(
const [
sel,
key
] of
WIDTH_MAP
){

const btn =
q(
root,
sel
);

if(
btn
){
setFibLevelWidthButton(
btn,
null,
s[key] ||
1
);
}

}

for(
const [
sel,
key
] of
STYLE_MAP
){

const btn =
q(
root,
sel
);

if(
btn
){
setFibLineStyleButton(
btn,
s[key] ||
"solid"
);
}

}

}

export function readFvpSettingsPanel(
root
){

const defaults =
createFvpToolDefaults();

if(
!root
){
return defaults;
}

const colorOf =
sel=>
q(
root,
sel
)?.dataset.fvpColor ||
defaults[
COLOR_MAP.find(
item=>
item[0] ===
sel
)?.[1]
];

const widthOf =
sel=>
normalizeFibLevelWidth(
q(
root,
sel
)?.dataset.lineWidth
) ||
1;

const styleOf =
sel=>
normalizeFibLineStyle(
q(
root,
sel
)?.dataset.lineStyle
);

return migrateFvpToolDefaults(
{
rowsLayout:
q(
root,
".fvp-rows-layout"
)?.value ||
"numberOfRows",
rowSize:
Number(
q(
root,
".fvp-row-size"
)?.value
),
volumeMode:
q(
root,
".fvp-volume-mode"
)?.value ||
"upDown",
vaPercent:
Number(
q(
root,
".fvp-va-percent"
)?.value
),
extendRight:
!!q(
root,
".fvp-extend-right"
)?.checked,
showProfile:
!!q(
root,
".fvp-show-profile"
)?.checked,
showValues:
!!q(
root,
".fvp-show-values"
)?.checked,
valuesColor:
colorOf(
".fvp-values-color"
),
widthPercent:
Number(
q(
root,
".fvp-width-percent"
)?.value
),
placement:
"left",
upColor:
colorOf(
".fvp-up-color"
),
downColor:
colorOf(
".fvp-down-color"
),
vaUpColor:
colorOf(
".fvp-va-up-color"
),
vaDownColor:
colorOf(
".fvp-va-down-color"
),
showPoc:
!!q(
root,
".fvp-show-poc"
)?.checked,
pocColor:
colorOf(
".fvp-poc-color"
),
pocLineWidth:
widthOf(
".fvp-poc-width"
),
pocLineStyle:
styleOf(
".fvp-poc-style"
),
showDevelopingPoc:
!!q(
root,
".fvp-show-developing-poc"
)?.checked,
developingPocColor:
colorOf(
".fvp-dev-poc-color"
),
developingPocLineWidth:
widthOf(
".fvp-dev-poc-width"
),
developingPocLineStyle:
styleOf(
".fvp-dev-poc-style"
),
showVah:
!!q(
root,
".fvp-show-vah"
)?.checked,
vahColor:
colorOf(
".fvp-vah-color"
),
vahLineWidth:
widthOf(
".fvp-vah-width"
),
vahLineStyle:
styleOf(
".fvp-vah-style"
),
showVal:
!!q(
root,
".fvp-show-val"
)?.checked,
valColor:
colorOf(
".fvp-val-color"
),
valLineWidth:
widthOf(
".fvp-val-width"
),
valLineStyle:
styleOf(
".fvp-val-style"
),
showDevelopingVa:
!!q(
root,
".fvp-show-developing-va"
)?.checked,
developingVaColor:
colorOf(
".fvp-dev-va-color"
),
developingVaLineWidth:
widthOf(
".fvp-dev-va-width"
),
developingVaLineStyle:
styleOf(
".fvp-dev-va-style"
),
showHistogramBox:
!!q(
root,
".fvp-show-box"
)?.checked,
histogramBoxColor:
colorOf(
".fvp-box-color"
)
}
);

}

let fvpColorPortal =
null;

function ensureFvpColorPortal(){

if(
fvpColorPortal
){
return fvpColorPortal;
}

const el =
document.createElement(
"div"
);

el.className =
"draw-popover tv-color-popover fvp-color-menu hidden";
document.body.appendChild(
el
);
el.addEventListener(
"mousedown",
e=>{
e.stopPropagation();
}
);

document.addEventListener(
"mousedown",
e=>{

if(
e.target.closest(
".fvp-color-btn, .fvp-color-menu, .tv-color-picker"
)
){
return;
}

closeFvpColorMenu();

}
);

window.addEventListener(
"scroll",
closeFvpColorMenu,
true
);
window.addEventListener(
"resize",
closeFvpColorMenu
);

fvpColorPortal =
el;
return el;

}

export function closeFvpColorMenu(){

if(
fvpColorPortal
){
fvpColorPortal.classList.add(
"hidden"
);
}

}

function openFvpColorMenu(
anchorBtn,
onApply
){

const portal =
ensureFvpColorPortal();
const active =
anchorBtn.dataset.fvpColor ||
"#787b86";

mountTvColorPicker(
portal,
{
activeColor: active,
onChange: color=>{

anchorBtn.dataset.fvpColor =
color;
anchorBtn.style.setProperty(
"--fvp-swatch",
swatchVar(
color
)
);
onApply();

},
onSelect: color=>{

anchorBtn.dataset.fvpColor =
color;
anchorBtn.style.setProperty(
"--fvp-swatch",
swatchVar(
color
)
);
closeFvpColorMenu();
onApply();

}
}
);

portal.classList.remove(
"hidden"
);

const rect =
anchorBtn.getBoundingClientRect();

portal.style.position =
"fixed";
portal.style.left =
`${Math.round(rect.left)}px`;
portal.style.top =
`${Math.round(rect.bottom + 4)}px`;
portal.style.zIndex =
"20000";

}

export function bindFvpSettingsPanel(
root,
{
onApply,
canApply
}
){

if(
!root
){
return;
}

root.querySelectorAll(
".fvp-tab"
).forEach(
tab=>{

tab.addEventListener(
"click",
e=>{

e.preventDefault();
e.stopPropagation();

const id =
tab.dataset.fvpTab;

root.querySelectorAll(
".fvp-tab"
).forEach(
item=>
item.classList.toggle(
"is-active",
item ===
tab
)
);

root.querySelectorAll(
".fvp-tab-panel"
).forEach(
panel=>
panel.classList.toggle(
"hidden",
panel.dataset.fvpPanel !==
id
)
);

}
);

}
);

root.addEventListener(
"mousedown",
e=>{

if(
!canApply?.()
){
return;
}

const styleBtn =
e.target.closest(
".fvp-style-btn"
);

if(
styleBtn
){

e.preventDefault();
e.stopPropagation();

const wasOpen =
isFibLineStyleMenuOpenForAnchor(
styleBtn
);

closeAllFibLineStyleMenus();
closeAllFibLineWidthMenus();
closeFvpColorMenu();

if(
!wasOpen
){
openFibLineStyleMenu(
styleBtn
);
}

return;

}

const widthBtn =
e.target.closest(
".fvp-width-btn"
);

if(
widthBtn
){

e.preventDefault();
e.stopPropagation();

const fallback =
normalizeFibLevelWidth(
widthBtn.dataset.lineWidth
) ||
1;
const wasOpen =
isFibLineWidthMenuOpenForAnchor(
widthBtn
);

closeAllFibLineWidthMenus();
closeAllFibLineStyleMenus();
closeFvpColorMenu();

if(
!wasOpen
){
openFibLineWidthMenu(
widthBtn,
fallback
);
}

return;

}

const colorBtn =
e.target.closest(
".fvp-color-btn"
);

if(
colorBtn
){

e.preventDefault();
e.stopPropagation();
closeAllFibLineStyleMenus();
closeAllFibLineWidthMenus();
openFvpColorMenu(
colorBtn,
()=>{

if(
canApply?.()
){
onApply();
}

}
);

}

},
{
capture: true
}
);

root.addEventListener(
"change",
()=>{

if(
canApply?.()
){
onApply();
}

}
);

root.addEventListener(
"input",
e=>{

if(
!canApply?.()
){
return;
}

if(
e.target.matches(
"input[type='number'], select"
)
){
onApply();
}

}
);

}
