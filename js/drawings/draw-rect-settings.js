/**
 * Панель настроек прямоугольника (border / median / fill).
 * Split from drawings/draw-style-bar.js — поведение 1:1.
 */
import {
parseDrawColor,
formatDrawColor
} from "../draw-color-palette.js?v=7";

import {
STROKE,
RECT_DEFAULT_FILL_COLOR,
RECT_DEFAULT_FILL_OPACITY
} from "./constants.js?v=14";

import {
normalizeFibLineStyle,
normalizeFibLevelWidth,
setFibLineStyleButton,
setFibLevelWidthButton
} from "./fib-spec.js?v=18";

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
<label class="rect-settings-row rect-settings-row--check">
<input type="checkbox" class="rect-show-horiz" checked />
<span class="rect-settings-label">Horizontal</span>
<button type="button" class="rect-horiz-style-btn" title="Тип горизонтальных линий" aria-label="Тип горизонтальных линий"></button>
<button type="button" class="rect-horiz-color-btn" title="Цвет горизонтальных линий" aria-label="Цвет горизонтальных линий"></button>
</label>
<label class="rect-settings-row rect-settings-row--check">
<input type="checkbox" class="rect-show-vert" checked />
<span class="rect-settings-label">Vertical</span>
<button type="button" class="rect-vert-style-btn" title="Тип вертикальных линий" aria-label="Тип вертикальных линий"></button>
<button type="button" class="rect-vert-color-btn" title="Цвет вертикальных линий" aria-label="Цвет вертикальных линий"></button>
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

const horizStyleBtn =
root.querySelector(
".rect-horiz-style-btn"
);
const horizColorBtn =
root.querySelector(
".rect-horiz-color-btn"
);
const vertStyleBtn =
root.querySelector(
".rect-vert-style-btn"
);
const vertColorBtn =
root.querySelector(
".rect-vert-color-btn"
);
const showHoriz =
root.querySelector(
".rect-show-horiz"
);
const showVert =
root.querySelector(
".rect-show-vert"
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

const horizColor =
shape?.horizColor ||
shape?.color ||
STROKE;
const vertColor =
shape?.vertColor ||
shape?.color ||
STROKE;

if(
horizStyleBtn
){
setFibLineStyleButton(
horizStyleBtn,
shape?.horizLineStyle ||
shape?.lineStyle ||
"solid"
);
}

if(
vertStyleBtn
){
setFibLineStyleButton(
vertStyleBtn,
shape?.vertLineStyle ||
shape?.lineStyle ||
"solid"
);
}

if(
horizColorBtn
){
horizColorBtn.style.setProperty(
"--rect-swatch",
horizColor
);
}

if(
vertColorBtn
){
vertColorBtn.style.setProperty(
"--rect-swatch",
vertColor
);
}

if(
showHoriz
){
showHoriz.checked =
shape?.showHorizLines !==
false;
}

if(
showVert
){
showVert.checked =
shape?.showVertLines !==
false;
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

const horizStyleBtn =
root.querySelector(
".rect-horiz-style-btn"
);
const horizColorBtn =
root.querySelector(
".rect-horiz-color-btn"
);
const vertStyleBtn =
root.querySelector(
".rect-vert-style-btn"
);
const vertColorBtn =
root.querySelector(
".rect-vert-color-btn"
);
const showHoriz =
root.querySelector(
".rect-show-horiz"
);
const showVert =
root.querySelector(
".rect-show-vert"
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

const horizColor =
horizColorBtn?.style.getPropertyValue(
"--rect-swatch"
)?.trim() ||
STROKE;
const vertColor =
vertColorBtn?.style.getPropertyValue(
"--rect-swatch"
)?.trim() ||
STROKE;
const horizLineStyle =
normalizeFibLineStyle(
horizStyleBtn?.dataset.lineStyle
) ||
"solid";
const vertLineStyle =
normalizeFibLineStyle(
vertStyleBtn?.dataset.lineStyle
) ||
"solid";

return {
color:
horizColor,
lineStyle:
horizLineStyle,
showHorizLines:
showHoriz
? showHoriz.checked
: true,
showVertLines:
showVert
? showVert.checked
: true,
horizColor,
horizLineStyle,
vertColor,
vertLineStyle,
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

const horizStyleBtn =
root.querySelector(
".rect-horiz-style-btn"
);
const horizColorBtn =
root.querySelector(
".rect-horiz-color-btn"
);
const vertStyleBtn =
root.querySelector(
".rect-vert-style-btn"
);
const vertColorBtn =
root.querySelector(
".rect-vert-color-btn"
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
horizStyleBtn
){
setFibLineStyleButton(
horizStyleBtn,
"solid"
);
}

if(
vertStyleBtn
){
setFibLineStyleButton(
vertStyleBtn,
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
".rect-horiz-style-btn, .rect-vert-style-btn, .rect-median-style-btn"
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
".rect-horiz-color-btn, .rect-vert-color-btn, .rect-median-color-btn, .rect-fill-color-btn"
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
const isHoriz =
colorBtn.classList.contains(
"rect-horiz-color-btn"
);
const isVert =
colorBtn.classList.contains(
"rect-vert-color-btn"
);
const fallback =
isFill
? (
shape?.fillColor ||
shape?.color ||
STROKE
)
: isHoriz
? (
shape?.horizColor ||
shape?.color ||
STROKE
)
: isVert
? (
shape?.vertColor ||
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
".rect-show-horiz, .rect-show-vert, .rect-show-median, .rect-show-fill"
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
horizStyleBtn,
horizColorBtn,
vertStyleBtn,
vertColorBtn,
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
