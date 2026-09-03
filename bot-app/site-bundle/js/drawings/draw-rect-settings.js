/**
 * Панель настроек прямоугольника (border / median / fill).
 * Split from drawings/draw-style-bar.js — поведение 1:1.
 */
import {
parseDrawColor,
formatDrawColor
} from "../draw-color-palette.js?v=6";

import {
STROKE,
RECT_DEFAULT_FILL_COLOR,
RECT_DEFAULT_FILL_OPACITY
} from "./constants.js?v=11";

import {
normalizeFibLineStyle,
normalizeFibLevelWidth,
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

export function rectSettingsHtml(){

return `
<div class="rect-settings">
<label class="rect-settings-row">
<span class="rect-settings-label">Border</span>
<button type="button" class="rect-border-color-btn" title="Цвет линии" aria-label="Цвет линии"></button>
<button type="button" class="rect-border-style-btn" title="Тип линии" aria-label="Тип линии"></button>
</label>
<label class="rect-settings-row rect-settings-row--check">
<input type="checkbox" class="rect-show-median" />
<span class="rect-settings-label">Middle line</span>
<button type="button" class="rect-median-style-btn" title="Тип срединной линии" aria-label="Тип срединной линии"></button>
<button type="button" class="rect-median-width-btn" title="Толщина срединной линии" aria-label="Толщина">1px</button>
<button type="button" class="rect-median-color-btn" title="Цвет срединной линии" aria-label="Цвет срединной линии"></button>
</label>
<label class="rect-settings-row rect-settings-row--check">
<input type="checkbox" class="rect-show-fill" checked />
<span class="rect-settings-label">Background</span>
<button type="button" class="rect-fill-color-btn" title="Цвет заливки" aria-label="Цвет заливки"></button>
</label>
</div>
`;

}

export function parseRectFillSwatch(
raw
){

const parsed =
parseDrawColor(
raw
);

if(
!parsed
){
return {
fillColor:
raw ||
RECT_DEFAULT_FILL_COLOR,
fillOpacity:
RECT_DEFAULT_FILL_OPACITY
};
}

return {
fillColor:
parsed.hex,
fillOpacity:
Math.max(
0,
Math.min(
1,
parsed.opacity /
100
)
)
};

}

export function fillRectSettingsPanel(
root,
shape
){

if(
!root
){
return;
}

const borderStyleBtn =
root.querySelector(
".rect-border-style-btn"
);
const borderColorBtn =
root.querySelector(
".rect-border-color-btn"
);
const medianStyleBtn =
root.querySelector(
".rect-median-style-btn"
);
const medianWidthBtn =
root.querySelector(
".rect-median-width-btn"
);
const medianColorBtn =
root.querySelector(
".rect-median-color-btn"
);
const fillColorBtn =
root.querySelector(
".rect-fill-color-btn"
);
const showMedian =
root.querySelector(
".rect-show-median"
);
const showFill =
root.querySelector(
".rect-show-fill"
);

if(
borderStyleBtn
){
setFibLineStyleButton(
borderStyleBtn,
shape?.lineStyle ||
"solid"
);
}

if(
borderColorBtn
){
borderColorBtn.style.setProperty(
"--rect-swatch",
shape?.color ||
STROKE
);
}

if(
medianStyleBtn
){
setFibLineStyleButton(
medianStyleBtn,
shape?.medianLineStyle ||
"dashed"
);
}

if(
medianWidthBtn
){
setFibLevelWidthButton(
medianWidthBtn,
null,
shape?.medianLineWidth ||
1
);
}

const medianColor =
shape?.medianColor ||
shape?.color ||
STROKE;
const fillColor =
shape?.fillColor ||
shape?.color ||
RECT_DEFAULT_FILL_COLOR;
const fillOpacity =
Number.isFinite(
Number(
shape?.fillOpacity
)
)
? Number(
shape.fillOpacity
)
: RECT_DEFAULT_FILL_OPACITY;

if(
medianColorBtn
){
medianColorBtn.style.setProperty(
"--rect-swatch",
medianColor
);
}

if(
fillColorBtn
){
fillColorBtn.style.setProperty(
"--rect-swatch",
formatDrawColor(
fillColor,
Math.round(
fillOpacity *
100
)
)
);
}

if(
showMedian
){
showMedian.checked =
!!shape?.showMedian;
}

if(
showFill
){
showFill.checked =
shape?.showFill !==
false;
}

}

export function readRectSettingsPanel(
root
){

if(
!root
){
return {};
}

const borderStyleBtn =
root.querySelector(
".rect-border-style-btn"
);
const borderColorBtn =
root.querySelector(
".rect-border-color-btn"
);
const medianStyleBtn =
root.querySelector(
".rect-median-style-btn"
);
const medianWidthBtn =
root.querySelector(
".rect-median-width-btn"
);
const medianColorBtn =
root.querySelector(
".rect-median-color-btn"
);
const fillColorBtn =
root.querySelector(
".rect-fill-color-btn"
);

const fillSwatch =
fillColorBtn?.style.getPropertyValue(
"--rect-swatch"
)?.trim() ||
RECT_DEFAULT_FILL_COLOR;
const fill =
parseRectFillSwatch(
fillSwatch
);

return {
color:
borderColorBtn?.style.getPropertyValue(
"--rect-swatch"
)?.trim() ||
STROKE,
lineStyle:
normalizeFibLineStyle(
borderStyleBtn?.dataset.lineStyle
) ||
"solid",
showMedian:
!!root.querySelector(
".rect-show-median"
)?.checked,
showFill:
!!root.querySelector(
".rect-show-fill"
)?.checked,
medianLineStyle:
normalizeFibLineStyle(
medianStyleBtn?.dataset.lineStyle
) ||
"dashed",
medianLineWidth:
normalizeFibLevelWidth(
Number(
medianWidthBtn?.dataset.lineWidth
)
) ||
1,
medianColor:
medianColorBtn?.style.getPropertyValue(
"--rect-swatch"
)?.trim() ||
STROKE,
fillColor:
fill.fillColor,
fillOpacity:
fill.fillOpacity
};

}

export function bindRectSettingsPanel(
root,
{
getAlive,
canApply,
onApply,
getRectEditShape,
openColorMenu,
signal
}
){

if(
!root
){
return;
}

const borderStyleBtn =
root.querySelector(
".rect-border-style-btn"
);
const borderColorBtn =
root.querySelector(
".rect-border-color-btn"
);
const medianStyleBtn =
root.querySelector(
".rect-median-style-btn"
);
const medianWidthBtn =
root.querySelector(
".rect-median-width-btn"
);
const medianColorBtn =
root.querySelector(
".rect-median-color-btn"
);
const fillColorBtn =
root.querySelector(
".rect-fill-color-btn"
);

if(
borderStyleBtn
){
setFibLineStyleButton(
borderStyleBtn,
"solid"
);
}

if(
medianStyleBtn
){
setFibLineStyleButton(
medianStyleBtn,
"dashed"
);
}

if(
medianWidthBtn
){
setFibLevelWidthButton(
medianWidthBtn,
null,
1
);
}

root.addEventListener(
"mousedown",
e=>{

if(
!getAlive?.()
){
return;
}

const styleBtn =
e.target.closest(
".rect-border-style-btn, .rect-median-style-btn"
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
".rect-median-width-btn"
);

if(
widthBtn
){

e.preventDefault();
e.stopPropagation();

const shape =
getRectEditShape?.();
const fallback =
shape?.medianLineWidth ||
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

return;

}

const colorBtn =
e.target.closest(
".rect-border-color-btn, .rect-median-color-btn, .rect-fill-color-btn"
);

if(
colorBtn
){

e.preventDefault();
e.stopPropagation();

const shape =
getRectEditShape?.();
const isFill =
colorBtn.classList.contains(
"rect-fill-color-btn"
);
const isBorder =
colorBtn.classList.contains(
"rect-border-color-btn"
);
const fallback =
isFill
? (
shape?.fillColor ||
shape?.color ||
STROKE
)
: isBorder
? (
shape?.color ||
STROKE
)
: (
shape?.medianColor ||
shape?.color ||
STROKE
);

openColorMenu?.(
colorBtn,
fallback
);

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
e.target.matches(
".rect-show-median, .rect-show-fill"
)
){
onApply?.();
}

},
{
signal
}
);

[
borderStyleBtn,
borderColorBtn,
medianStyleBtn,
medianWidthBtn,
medianColorBtn,
fillColorBtn
].forEach(
btn=>{

if(
!btn
){
return;
}

btn.addEventListener(
"click",
e=>{
e.stopPropagation();
},
{
signal
}
);

}
);

}
