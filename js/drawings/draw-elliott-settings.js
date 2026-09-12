/**
 * Elliott Waves + pattern drawings in the same flyout: Degree + Wave + Pattern 1-2-1-2-3 extras.
 */
import {
ELLIOTT_DEGREES,
ELLIOTT_DEFAULT_COLOR,
ELLIOTT_DEFAULT_DEGREE,
PATTERN_DASH_DEFAULT_OPACITY,
PATTERN_12_TP_LEVEL_COUNT,
createElliottToolDefaults,
formatPattern12TpLabel,
isPattern12Draw,
isPatternHsFamily,
normalizeElliottDegree,
normalizePattern12TpFlags,
normalizePattern12TpLevels,
normalizePatternDashOpacity,
parsePattern12TpLevel
} from "./elliott-spec.js?v=12";

export function elliottSettingsHtml(){

const options =
ELLIOTT_DEGREES.map(
row=>
`<option value="${row.id}">${row.title}</option>`
).join(
""
);

return `
<div class="elliott-settings">
<label class="elliott-wave-row">
<input type="checkbox" class="elliott-wave-on"/>
<span>Wave</span>
</label>
<div class="elliott-degree-row">
<div class="elliott-degree-wrap">
<label class="popover-label elliott-degree-label">Degree</label>
<select class="elliott-degree" autocomplete="off">
${options}
</select>
</div>
<div class="elliott-degree-junior-wrap hidden">
<label class="popover-label elliott-degree-junior-label">Degree (1·2·3)</label>
<select class="elliott-degree-junior" autocomplete="off">
${options}
</select>
</div>
</div>
<label class="elliott-pattern-dash-row hidden">
<input type="checkbox" class="elliott-pattern-dash-on"/>
<span>1 → (1) dashed</span>
</label>
<div class="elliott-pattern-dash-opacity hidden">
<div class="tv-color-opacity-label">1 → (1) / TP opacity</div>
<div class="tv-color-opacity-row">
<div class="tv-color-opacity-track elliott-pattern-dash-opacity-track">
<input type="range" class="tv-color-opacity-slider elliott-pattern-dash-opacity-slider" min="0" max="100" step="1" value="${PATTERN_DASH_DEFAULT_OPACITY}" aria-label="1 to 1 and take profit line opacity"/>
</div>
<input type="text" class="tv-color-opacity-pct elliott-pattern-dash-opacity-pct" inputmode="numeric" maxlength="4" autocomplete="off" spellcheck="false" aria-label="1 to 1 and take profit line opacity percent" value="${PATTERN_DASH_DEFAULT_OPACITY}%"/>
</div>
</div>
<div class="elliott-tp-wrap hidden">
<div class="elliott-tp-flags">
<label class="elliott-tp-row">
<input type="checkbox" class="elliott-tp-senior-on"/>
<span>TP (1·2)</span>
</label>
<label class="elliott-tp-row">
<input type="checkbox" class="elliott-tp-junior-on"/>
<span>TP (1·2·3)</span>
</label>
</div>
<div class="popover-label elliott-tp-levels-label">Take profit</div>
<div class="elliott-tp-levels">
${Array.from(
{
length: PATTERN_12_TP_LEVEL_COUNT
},
(_, i)=>
`<input type="text" class="elliott-tp-level" data-tp-index="${i}" inputmode="decimal" maxlength="8" autocomplete="off" spellcheck="false" aria-label="Take profit level ${i + 1}"/>`
).join(
""
)}
</div>
</div>
</div>
`;

}

function syncElliottSettingsVisibility(
root,
type
){

if(
!root
){
return;
}

const seniorWrap =
root.querySelector(
".elliott-degree-wrap"
);
const seniorLabel =
root.querySelector(
".elliott-degree-label"
);
const juniorWrap =
root.querySelector(
".elliott-degree-junior-wrap"
);
const dashRow =
root.querySelector(
".elliott-pattern-dash-row"
);
const dashOpacity =
root.querySelector(
".elliott-pattern-dash-opacity"
);
const tpWrap =
root.querySelector(
".elliott-tp-wrap"
);
const hs =
isPatternHsFamily(
type
);
const p12 =
isPattern12Draw(
type
);

if(
seniorWrap
){
seniorWrap.classList.toggle(
"hidden",
hs
);
}

if(
seniorLabel
){
seniorLabel.textContent =
p12
? "Degree (1·2)"
: "Degree";
}

if(
juniorWrap
){
juniorWrap.classList.toggle(
"hidden",
!p12
);
}

if(
dashRow
){
dashRow.classList.toggle(
"hidden",
!p12
);
}

if(
dashOpacity
){
dashOpacity.classList.toggle(
"hidden",
!p12
);
}

if(
tpWrap
){
tpWrap.classList.toggle(
"hidden",
!p12
);
}

}

export function fillElliottSettingsPanel(
root,
shape
){

if(
!root
){
return;
}

const type =
shape?.type;
const defaults =
createElliottToolDefaults(
{
type
}
);

syncElliottSettingsVisibility(
root,
type
);

const waveOn =
root.querySelector(
".elliott-wave-on"
);
const degree =
root.querySelector(
".elliott-degree"
);
const degreeJunior =
root.querySelector(
".elliott-degree-junior"
);
const dashOn =
root.querySelector(
".elliott-pattern-dash-on"
);

if(
waveOn
){
waveOn.checked =
shape?.showWave !==
false;
}

if(
degree
){
degree.value =
normalizeElliottDegree(
shape?.degree ||
defaults.degree ||
ELLIOTT_DEFAULT_DEGREE
);
}

if(
degreeJunior
){
degreeJunior.value =
normalizeElliottDegree(
shape?.degreeJunior ||
defaults.degreeJunior ||
ELLIOTT_DEFAULT_DEGREE
);
}

if(
dashOn
){
dashOn.checked =
shape?.showPatternDash !==
false;
}

const tpSeniorOn =
root.querySelector(
".elliott-tp-senior-on"
);
const tpJuniorOn =
root.querySelector(
".elliott-tp-junior-on"
);
const tpFlags =
normalizePattern12TpFlags(
shape?.showTpSenior,
shape?.showTpJunior
);

if(
tpSeniorOn
){
tpSeniorOn.checked =
tpFlags.showTpSenior;
}

if(
tpJuniorOn
){
tpJuniorOn.checked =
tpFlags.showTpJunior;
}

fillTpLevelInputs(
root,
normalizePattern12TpLevels(
shape?.tpLevels ??
defaults.tpLevels
)
);

syncDashOpacityUi(
root,
shape?.patternDashOpacity ??
defaults.patternDashOpacity,
shape?.color ||
defaults.color ||
ELLIOTT_DEFAULT_COLOR
);

}

export function readElliottSettingsPanel(
root,
type
){

const defaults =
createElliottToolDefaults(
{
type
}
);

if(
!root
){
return defaults;
}

const waveOn =
root.querySelector(
".elliott-wave-on"
);
const degree =
root.querySelector(
".elliott-degree"
);
const degreeJunior =
root.querySelector(
".elliott-degree-junior"
);
const dashOn =
root.querySelector(
".elliott-pattern-dash-on"
);
const dashOpacitySlider =
root.querySelector(
".elliott-pattern-dash-opacity-slider"
);
const dashOpacityPct =
root.querySelector(
".elliott-pattern-dash-opacity-pct"
);
const tpSeniorOn =
root.querySelector(
".elliott-tp-senior-on"
);
const tpJuniorOn =
root.querySelector(
".elliott-tp-junior-on"
);
const fromSlider =
Number(
dashOpacitySlider?.value
);
const fromPct =
parseDashOpacityInput(
dashOpacityPct?.value
);

return {
degree:
normalizeElliottDegree(
degree?.value ||
defaults.degree
),
degreeJunior:
normalizeElliottDegree(
degreeJunior?.value ||
defaults.degreeJunior
),
showWave:
waveOn
? !!waveOn.checked
: true,
showPatternDash:
dashOn
? !!dashOn.checked
: true,
patternDashOpacity:
Number.isFinite(
fromSlider
)
? normalizePatternDashOpacity(
fromSlider
)
: (
fromPct ??
defaults.patternDashOpacity
),
...(
isPattern12Draw(
type
)
? {
...normalizePattern12TpFlags(
tpSeniorOn
? !!tpSeniorOn.checked
: undefined,
tpJuniorOn
? !!tpJuniorOn.checked
: undefined
),
tpLevels:
readTpLevelInputs(
root,
defaults.tpLevels
)
}
: {}
)
};

}

export function bindElliottSettingsPanel(
root,
{
canApply,
onApply,
signal
} =
{}
){

if(
!root
){
return;
}

const opts =
{
signal
};

const commit =
()=>{

if(
canApply &&
!canApply()
){
return;
}

onApply?.();

};

root.querySelector(
".elliott-wave-on"
)?.addEventListener(
"change",
commit,
opts
);

root.querySelector(
".elliott-degree"
)?.addEventListener(
"change",
commit,
opts
);

root.querySelector(
".elliott-degree-junior"
)?.addEventListener(
"change",
commit,
opts
);

root.querySelector(
".elliott-pattern-dash-on"
)?.addEventListener(
"change",
commit,
opts
);

const tpSeniorOnEl =
root.querySelector(
".elliott-tp-senior-on"
);
const tpJuniorOnEl =
root.querySelector(
".elliott-tp-junior-on"
);

tpSeniorOnEl?.addEventListener(
"change",
()=>{

if(
tpSeniorOnEl.checked &&
tpJuniorOnEl
){
tpJuniorOnEl.checked =
false;
}

commit();

},
opts
);

tpJuniorOnEl?.addEventListener(
"change",
()=>{

if(
tpJuniorOnEl.checked &&
tpSeniorOnEl
){
tpSeniorOnEl.checked =
false;
}

commit();

},
opts
);

root.querySelectorAll(
".elliott-tp-level"
).forEach(
input=>{

let beforeEdit =
input.value;

input.addEventListener(
"focus",
()=>{

beforeEdit =
input.value;
input.select();

},
opts
);

input.addEventListener(
"keydown",
e=>{

e.stopPropagation();

if(
e.key ===
"Enter"
){
e.preventDefault();
input.blur();
return;
}

if(
e.key ===
"Escape"
){
e.preventDefault();
input.value =
beforeEdit;
input.blur();
}

},
opts
);

input.addEventListener(
"change",
()=>{

const parsed =
parsePattern12TpLevel(
input.value
);

if(
parsed ==
null
){
input.value =
beforeEdit;
}else{
input.value =
formatPattern12TpLabel(
parsed
);
}

commit();

},
opts
);

}
);

const dashOpacitySlider =
root.querySelector(
".elliott-pattern-dash-opacity-slider"
);
const dashOpacityPct =
root.querySelector(
".elliott-pattern-dash-opacity-pct"
);
let opacityBeforeEdit =
normalizePatternDashOpacity(
dashOpacitySlider?.value
);

function applyDashOpacity(
value,
{
commitNow =
true
} =
{}
){

syncDashOpacityUi(
root,
value
);

if(
commitNow
){
commit();
}

}

dashOpacitySlider?.addEventListener(
"input",
()=>{

applyDashOpacity(
dashOpacitySlider.value
);

},
opts
);

[
"mousedown",
"click"
].forEach(
evt=>
dashOpacitySlider?.addEventListener(
evt,
e=>
e.stopPropagation(),
opts
)
);

dashOpacityPct?.addEventListener(
"focus",
()=>{

opacityBeforeEdit =
normalizePatternDashOpacity(
dashOpacitySlider?.value ??
dashOpacityPct.value
);

const n =
parseDashOpacityInput(
dashOpacityPct.value
);

dashOpacityPct.value =
String(
n ??
opacityBeforeEdit
);
dashOpacityPct.select();

},
opts
);

dashOpacityPct?.addEventListener(
"keydown",
e=>{

e.stopPropagation();

if(
e.key ===
"Enter"
){
e.preventDefault();
dashOpacityPct.blur();
return;
}

if(
e.key ===
"Escape"
){
e.preventDefault();
applyDashOpacity(
opacityBeforeEdit
);
dashOpacityPct.blur();
}

},
opts
);

dashOpacityPct?.addEventListener(
"input",
()=>{

const parsed =
parseDashOpacityInput(
dashOpacityPct.value
);

if(
parsed ==
null
){
return;
}

if(
dashOpacitySlider
){
dashOpacitySlider.value =
String(
parsed
);
}

},
opts
);

dashOpacityPct?.addEventListener(
"change",
()=>{

const parsed =
parseDashOpacityInput(
dashOpacityPct.value
);

applyDashOpacity(
parsed ??
opacityBeforeEdit
);

},
opts
);

}

function fillTpLevelInputs(
root,
levels
){

const rows =
normalizePattern12TpLevels(
levels
);

root.querySelectorAll(
".elliott-tp-level"
).forEach(
input=>{

const i =
Number(
input.getAttribute(
"data-tp-index"
)
);
const value =
rows[
i
];

input.value =
value ==
null
? ""
: formatPattern12TpLabel(
value
);

}
);

}

function readTpLevelInputs(
root,
fallback
){

const defaults =
normalizePattern12TpLevels(
fallback
);
const rows =
[];

for(
let i =
0;
i <
PATTERN_12_TP_LEVEL_COUNT;
i++
){

const input =
root.querySelector(
`.elliott-tp-level[data-tp-index="${i}"]`
);
const parsed =
parsePattern12TpLevel(
input?.value
);

rows.push(
parsed ==
null &&
String(
input?.value ??
""
).trim() ===
""
? defaults[
i
]
: parsed
);

}

return normalizePattern12TpLevels(
rows
);

}

function parseDashOpacityInput(
raw
){

const s =
String(
raw ??
""
).replace(
/%/g,
""
).replace(
",",
"."
).trim();

if(
!s ||
s ===
"." ||
s ===
"-"
){
return null;
}

const n =
Number(
s
);

if(
!Number.isFinite(
n
)
){
return null;
}

return normalizePatternDashOpacity(
n
);

}

function syncDashOpacityUi(
root,
value,
color
){

if(
!root
){
return;
}

const n =
normalizePatternDashOpacity(
value
);
const slider =
root.querySelector(
".elliott-pattern-dash-opacity-slider"
);
const pct =
root.querySelector(
".elliott-pattern-dash-opacity-pct"
);
const track =
root.querySelector(
".elliott-pattern-dash-opacity-track"
);

if(
track &&
typeof color ===
"string" &&
color.trim()
){
track.style.setProperty(
"--tv-opacity-color",
color.trim()
);
}

if(
slider &&
Number(
slider.value
) !==
n
){
slider.value =
String(
n
);
}

if(
pct
){

if(
typeof document ===
"undefined" ||
document.activeElement !==
pct
){
pct.value =
`${n}%`;
}

}

}

export function syncElliottSettingsColor(
root,
color
){

syncDashOpacityUi(
root,
root?.querySelector(
".elliott-pattern-dash-opacity-slider"
)?.value,
color
);

}
