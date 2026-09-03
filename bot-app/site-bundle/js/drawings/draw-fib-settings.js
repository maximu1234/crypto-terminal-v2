/**
 * Панель настроек Fibonacci (уровни, trend line, global style/width).
 * Split from drawings/draw-style-bar.js — поведение 1:1.
 */
import {
STROKE,
DEFAULT_FIB_SPEC
} from "./constants.js?v=11";

import {
normalizeFibLineStyle,
normalizeFibLevelColor,
normalizeFibLevelWidth,
cloneDefaultFibRows,
normalizeFibLevelsShape,
formatFibInputValue,
parseFibRatioField,
setFibLineStyleButton,
setFibLevelWidthButton
} from "./fib-spec.js?v=15";

import {
closeAllFibLineStyleMenus,
openFibLineStyleMenu,
closeAllFibLineWidthMenus,
openFibLineWidthMenu,
isFibLineStyleMenuOpenForAnchor,
isFibLineWidthMenuOpenForAnchor
} from "./fib-portals.js?v=3";

export function fibSettingsHtml(){

return `
<div class="fib-settings">
<label class="fib-trend-label">
<input type="checkbox" id="fib-show-trend-line" />
<span>Линия тренда</span>
</label>
<div class="fib-levels-global">
<span class="fib-levels-global-label">Levels line</span>
<button type="button" class="fib-global-line-style-btn" data-line-style="solid" title="Тип линии" aria-label="Тип линии"></button>
<button type="button" class="fib-global-line-width-btn" title="Толщина линии" aria-label="Толщина линии">1px</button>
</div>
<div class="fib-levels-grid" id="fib-level-rows-root"></div>
</div>
`;

}

export function setFibLevelColorButton(
btn,
color,
fallback
){

if(
!btn
){
return;
}

const picked =
normalizeFibLevelColor(
color
);

if(
picked
){
btn.dataset.customColor =
picked;
btn.style.background =
picked;
btn.classList.add(
"has-custom"
);
return;
}

delete btn.dataset.customColor;
btn.style.background =
fallback ||
STROKE;
btn.classList.remove(
"has-custom"
);

}

export function mountFibLevelRows(
root
){

const grid =
root?.querySelector(
"#fib-level-rows-root"
);

if(
!grid
){
return;
}

const globalStyleBtn =
root.querySelector(
".fib-global-line-style-btn"
);
const globalWidthBtn =
root.querySelector(
".fib-global-line-width-btn"
);

if(
globalStyleBtn
){
setFibLineStyleButton(
globalStyleBtn,
"solid"
);
}

if(
globalWidthBtn
){
setFibLevelWidthButton(
globalWidthBtn,
null,
1
);
}

DEFAULT_FIB_SPEC.forEach(
(
spec,
i
)=>{

const row =
document.createElement(
"div"
);

row.className =
"fib-level-row";
row.dataset.fibIndex =
String(
i
);

row.innerHTML =
`
<input type="checkbox" class="fib-level-on"/>
<input type="text" class="fib-level-val" autocomplete="off" spellcheck="false"/>
<button type="button" class="fib-level-color-btn" title="Цвет уровня" aria-label="Цвет уровня"></button>
<label class="fib-level-bg-label" title="Включить фон">
<input type="checkbox" class="fib-level-bg" aria-label="Включить фон"/>
</label>
`;

const on =
row.querySelector(
".fib-level-on"
);
const val =
row.querySelector(
".fib-level-val"
);
const colorBtn =
row.querySelector(
".fib-level-color-btn"
);

if(
on
){
on.checked =
!!spec.enabled;
}

if(
val
){
val.value =
formatFibInputValue(
spec.v
);
}

setFibLevelColorButton(
colorBtn,
normalizeFibLevelColor(
spec.color
),
STROKE
);

grid.appendChild(
row
);

}
);

}

export function fillFibSettingsPanel(
root,
fibLevels,
fibShowTrendLine,
fallbackColor,
fallbackWidth
){

if(
!root
){
return;
}

const rows =
Array.isArray(
fibLevels
) &&
fibLevels.length ===
DEFAULT_FIB_SPEC.length
? fibLevels.map(
(
row,
i
)=>{
const def =
DEFAULT_FIB_SPEC[
i
];
const levelColor =
normalizeFibLevelColor(
row.color
) ||
normalizeFibLevelColor(
def?.color
);
return {
v:
Number.isFinite(
row.v
)
? row.v
: def?.v ??
0,
enabled:
!!row.enabled,
fillBg:
!!row.fillBg,
lineStyle:
normalizeFibLineStyle(
row.lineStyle
) ||
"solid",
lineWidth:
normalizeFibLevelWidth(
row.lineWidth
) ||
1,
...(
levelColor
? {
color:
levelColor
}
: {}
)
};
}
)
: cloneDefaultFibRows();

const baseColor =
fallbackColor ||
STROKE;
const baseWidth =
normalizeFibLevelWidth(
fallbackWidth
) ||
1;
const baseLineStyle =
rows.find(
row=>
row.enabled
)?.lineStyle ||
rows[
0
]?.lineStyle ||
"solid";

const trendEl =
root.querySelector(
"#fib-show-trend-line"
);

if(
trendEl
){
trendEl.checked =
!!fibShowTrendLine;
}

const globalStyleBtn =
root.querySelector(
".fib-global-line-style-btn"
);
const globalWidthBtn =
root.querySelector(
".fib-global-line-width-btn"
);

setFibLineStyleButton(
globalStyleBtn,
baseLineStyle
);
setFibLevelWidthButton(
globalWidthBtn,
baseWidth,
baseWidth
);

rows.forEach(
(
row,
i
)=>{

const wrap =
root.querySelector(
`.fib-level-row[data-fib-index="${i}"]`
);

if(
!wrap
){
return;
}

const on =
wrap.querySelector(
".fib-level-on"
);
const bg =
wrap.querySelector(
".fib-level-bg"
);
const val =
wrap.querySelector(
".fib-level-val"
);
const colorBtn =
wrap.querySelector(
".fib-level-color-btn"
);

if(
on
){
on.checked =
!!row.enabled;
}

if(
bg
){
bg.checked =
!!row.fillBg;
}

if(
val
){
val.value =
formatFibInputValue(
row.v
);
}

setFibLevelColorButton(
colorBtn,
row.color,
baseColor
);

}
);

}

export function readFibSettingsPanel(
root
){

if(
!root
){
return {};
}

const template =
cloneDefaultFibRows();
const trendEl =
root.querySelector(
"#fib-show-trend-line"
);
const fibShowTrendLine =
trendEl
? !!trendEl.checked
: false;
const globalStyleBtn =
root.querySelector(
".fib-global-line-style-btn"
);
const globalWidthBtn =
root.querySelector(
".fib-global-line-width-btn"
);
const globalLineStyle =
normalizeFibLineStyle(
globalStyleBtn?.dataset.lineStyle
);
const globalLineWidth =
normalizeFibLevelWidth(
globalWidthBtn?.dataset.customWidth
) ||
normalizeFibLevelWidth(
globalWidthBtn?.textContent
) ||
1;

root.querySelectorAll(
".fib-level-row"
).forEach(
(
row,
i
)=>{

if(
i >=
template.length
){
return;
}

const valInp =
row.querySelector(
".fib-level-val"
);
const chk =
row.querySelector(
".fib-level-on"
);
const bgChk =
row.querySelector(
".fib-level-bg"
);
const colorBtn =
row.querySelector(
".fib-level-color-btn"
);
const parsed =
parseFibRatioField(
valInp?.value
);

template[
i
].v =
parsed !=
null
? parsed
: DEFAULT_FIB_SPEC[
i
].v;
template[
i
].enabled =
!!chk?.checked;
template[
i
].fillBg =
!!bgChk?.checked;
template[
i
].lineStyle =
globalLineStyle;
template[
i
].lineWidth =
globalLineWidth;

const levelColor =
normalizeFibLevelColor(
colorBtn?.dataset.customColor
);

if(
levelColor
){
template[
i
].color =
levelColor;
}else{

const defColor =
normalizeFibLevelColor(
DEFAULT_FIB_SPEC[
i
]?.color
);

if(
defColor
){
template[
i
].color =
defColor;
}else{
delete template[
i
].color;
}

}

}
);

return {
fibLevels:
template,
fibShowTrendLine,
lineWidth:
globalLineWidth,
lineStyle:
globalLineStyle
};

}

export function mergeFibLevelsAfterGlobalChange(
shape,
panel,
{
clearColors = false,
clearWidths = false
}
){

let levels =
panel
? JSON.parse(
JSON.stringify(
panel.fibLevels
)
)
: JSON.parse(
JSON.stringify(
normalizeFibLevelsShape(
shape.fibLevels
)
)
);

levels =
normalizeFibLevelsShape(
levels
);

levels.forEach(
row=>{

if(
clearColors
){
delete row.color;
}

if(
clearWidths
){
delete row.lineWidth;
}

}
);

if(
panel
){

panel.fibLevels.forEach(
(
pr,
i
)=>{

if(
i >=
levels.length
){
return;
}

levels[
i
].enabled =
!!pr.enabled;
levels[
i
].fillBg =
!!pr.fillBg;
levels[
i
].v =
pr.v;
levels[
i
].lineStyle =
normalizeFibLineStyle(
pr.lineStyle
);

const levelColor =
normalizeFibLevelColor(
pr.color
);

if(
levelColor &&
!clearColors
){
levels[
i
].color =
levelColor;
}

const levelWidth =
normalizeFibLevelWidth(
pr.lineWidth
);

if(
levelWidth &&
!clearWidths
){
levels[
i
].lineWidth =
levelWidth;
}

}
);

shape.fibShowTrendLine =
panel.fibShowTrendLine;

}

shape.fibLevels =
levels;

}

export function bindFibSettingsPanel(
root,
{
getAlive,
canApply,
getFibEditShape,
openColorMenu,
scheduleImmediate,
scheduleDebounced,
signal
}
){

if(
!root
){
return;
}

root.addEventListener(
"mousedown",
e=>{

if(
!getAlive?.()
){
return;
}

const colorBtn =
e.target.closest(
".fib-level-color-btn"
);

if(
colorBtn
){

e.preventDefault();
e.stopPropagation();

const shape =
getFibEditShape?.();
const fallback =
shape?.color ||
STROKE;

openColorMenu?.(
colorBtn,
fallback
);
return;

}

const styleBtn =
e.target.closest(
".fib-global-line-style-btn"
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
".fib-global-line-width-btn"
);

if(
widthBtn
){

e.preventDefault();
e.stopPropagation();

const shape =
getFibEditShape?.();
const fallback =
shape?.lineWidth ||
1;
const wasWidthOpen =
isFibLineWidthMenuOpenForAnchor(
widthBtn
);

closeAllFibLineWidthMenus();
closeAllFibLineStyleMenus();

if(
!wasWidthOpen
){
openFibLineWidthMenu(
widthBtn,
fallback
);
}

}

},
{
capture:true,
signal
}
);

root.addEventListener(
"change",
e=>{

if(
!canApply?.()
){
return;
}

if(
e.target?.id ===
"fib-show-trend-line" ||
e.target?.classList.contains(
"fib-level-on"
) ||
e.target?.classList.contains(
"fib-level-bg"
)
){
scheduleImmediate?.();
}

},
{
signal
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
e.target?.classList.contains(
"fib-level-val"
)
){
scheduleDebounced?.();
}

},
{
signal
}
);

if(
!root.dataset.fibLineMenuBound
){

root.dataset.fibLineMenuBound =
"1";

document.addEventListener(
"mousedown",
e=>{

if(
e.target.closest(
".fib-global-line-style-btn, .fib-line-style-menu--portal, .fib-global-line-width-btn, .fib-line-width-menu--portal"
)
){
return;
}

closeAllFibLineStyleMenus();
closeAllFibLineWidthMenus();

}
);

window.addEventListener(
"scroll",
closeAllFibLineStyleMenus,
true
);
window.addEventListener(
"scroll",
closeAllFibLineWidthMenus,
true
);
window.addEventListener(
"resize",
closeAllFibLineStyleMenus
);
window.addEventListener(
"resize",
closeAllFibLineWidthMenus
);

}

}
