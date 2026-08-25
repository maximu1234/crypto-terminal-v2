/** @module drawings/text — chart text object */

export const TEXT_FONT_FAMILY =
"Arial";

export const TEXT_DEFAULT_SIZE =
20;

export const TEXT_DEFAULT_CONTENT =
"Текст";

export const TEXT_DEFAULT_COLOR =
"#ffffff";

export const TEXT_MIN_SIZE =
8;

export const TEXT_MAX_SIZE =
96;

export const TEXT_SIZE_OPTIONS =
Object.freeze([
10,
12,
14,
16,
18,
20,
24,
28,
32,
40,
48
]);

export const TEXT_TOOL_DEFAULTS_VERSION =
1;

export const TEXT_SELECTION_STROKE =
"#3b82f6";

const TEXT_PAD_X =
4;

const TEXT_PAD_Y =
3;

const TEXT_LINE_HEIGHT =
1.2;

let measureCtx =
null;

function getMeasureCtx(){

if(
measureCtx
){
return measureCtx;
}

try{

const canvas =
typeof document !==
"undefined"
? document.createElement(
"canvas"
)
: null;

measureCtx =
canvas?.getContext?.(
"2d"
) ||
null;

}catch{
measureCtx =
null;
}

return measureCtx;

}

export function isTextTool(
type
){

return type ===
"text";

}

export function clampTextFontSize(
value,
fallback =
TEXT_DEFAULT_SIZE
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
return fallback;
}

return Math.min(
TEXT_MAX_SIZE,
Math.max(
TEXT_MIN_SIZE,
Math.round(
n
)
)
);

}

export function textContentOf(
shape
){

const raw =
String(
shape?.text ??
""
);

return raw.length
? raw
: TEXT_DEFAULT_CONTENT;

}

export function textFontString(
shape
){

const size =
clampTextFontSize(
shape?.fontSize
);

return `${size}px ${TEXT_FONT_FAMILY}, sans-serif`;

}

export function createTextToolDefaults(
overrides =
{}
){

return {
textDefaultsVersion:
TEXT_TOOL_DEFAULTS_VERSION,
color:
TEXT_DEFAULT_COLOR,
fontSize:
TEXT_DEFAULT_SIZE,
...overrides
};

}

export function migrateTextToolDefaults(
saved
){

const base =
createTextToolDefaults();

if(
!saved ||
typeof saved !==
"object"
){
return base;
}

return {
...base,
...saved,
textDefaultsVersion:
TEXT_TOOL_DEFAULTS_VERSION,
fontSize:
clampTextFontSize(
saved.fontSize,
base.fontSize
),
color:
saved.color ||
base.color
};

}

export function normalizeTextShape(
shape,
defaults =
null
){

if(
!shape ||
shape.type !==
"text"
){
return shape;
}

const base =
defaults ||
createTextToolDefaults();

shape.color =
shape.color ||
base.color ||
TEXT_DEFAULT_COLOR;
shape.fontSize =
clampTextFontSize(
shape.fontSize,
base.fontSize ||
TEXT_DEFAULT_SIZE
);
shape.fontFamily =
TEXT_FONT_FAMILY;
shape.text =
textContentOf(
shape
);

if(
!shape.p1 &&
Number.isFinite(
Number(
shape.time
)
) &&
Number.isFinite(
Number(
shape.price
)
)
){
shape.p1 = {
time:
shape.time,
price:
shape.price
};
}

if(
shape.p1
){
shape.time =
shape.p1.time;
shape.price =
shape.p1.price;
}

return shape;

}

function textLines(
shape
){

return textContentOf(
shape
).split(
"\n"
);

}

function fallbackLineWidth(
line,
fontSize
){

return Math.max(
fontSize *
0.55 *
Math.max(
line.length,
1
),
fontSize
);

}

export function measureTextBox(
ctx,
shape,
anchor
){

if(
!anchor
){
return null;
}

const fontSize =
clampTextFontSize(
shape?.fontSize
);
const lines =
textLines(
shape
);
let maxW =
0;

if(
ctx
){

ctx.save();
ctx.font =
textFontString(
shape
);

for(
const line of lines
){
maxW =
Math.max(
maxW,
ctx.measureText(
line
).width
);
}

ctx.restore();

}else{

for(
const line of lines
){
maxW =
Math.max(
maxW,
fallbackLineWidth(
line,
fontSize
)
);

}

}

const lineH =
fontSize *
TEXT_LINE_HEIGHT;
const w =
maxW +
TEXT_PAD_X *
2;
const h =
lineH *
Math.max(
lines.length,
1
) +
TEXT_PAD_Y *
2;

return {
x:
anchor.x,
y:
anchor.y -
h /
2,
w,
h,
lineH,
fontSize,
lines
};

}

const EDITOR_MIN_W =
48;

const EDITOR_MIN_H =
24;

const EDITOR_CARET_EM =
0.8;

const EDITOR_BOX_CHROME =
2;

export function measureTextEditorCssSize(
shape,
text
){

const raw =
String(
text ??
""
);
const probe = {
...shape,
text:
raw.length
? raw
: " "
};
const box =
measureTextBox(
getMeasureCtx(),
probe,
{
x:
0,
y:
0
}
);
const fontSize =
box?.fontSize ||
clampTextFontSize(
shape?.fontSize
);
const caret =
fontSize *
EDITOR_CARET_EM;

return {
width:
Math.max(
(
box?.w ||
0
) +
caret +
EDITOR_BOX_CHROME,
EDITOR_MIN_W
),
height:
Math.max(
(
box?.h ||
0
) +
EDITOR_BOX_CHROME,
EDITOR_MIN_H
)
};

}

export function drawTextShape(
ctx,
shape,
toXY,
opts =
{}
){

const anchor =
toXY({
time:
shape.time,
price:
shape.price
});
const box =
measureTextBox(
ctx,
shape,
anchor
);

if(
!box
){
return null;
}

const hideGlyph =
opts.hideGlyph ===
true;

if(
!hideGlyph
){

ctx.save();
ctx.fillStyle =
shape.color ||
TEXT_DEFAULT_COLOR;
ctx.font =
textFontString(
shape
);
ctx.textBaseline =
"top";
ctx.textAlign =
"left";

box.lines.forEach(
(
line,
i
)=>{

ctx.fillText(
line,
box.x +
TEXT_PAD_X,
box.y +
TEXT_PAD_Y +
i *
box.lineH
);

}
);

ctx.restore();

}

if(
opts.selected &&
!hideGlyph
){

ctx.save();
ctx.strokeStyle =
TEXT_SELECTION_STROKE;
ctx.lineWidth =
1;
ctx.setLineDash(
[]
);
ctx.strokeRect(
box.x +
0.5,
box.y +
0.5,
box.w,
box.h
);
ctx.restore();

}

return box;

}

export function textBodyContains(
px,
py,
box,
pad =
2
){

if(
!box
){
return false;
}

return (
px >=
box.x -
pad &&
px <=
box.x +
box.w +
pad &&
py >=
box.y -
pad &&
py <=
box.y +
box.h +
pad
);

}

export function hitTestTextBody(
px,
py,
shape,
toXY,
ctx =
null,
pad =
2
){

if(
!isTextTool(
shape?.type
)
){
return false;
}

const box =
measureTextBox(
ctx ||
getMeasureCtx(),
shape,
toXY({
time:
shape.time,
price:
shape.price
})
);

return textBodyContains(
px,
py,
box,
pad
);

}

export function createDrawTextEditor(
deps
){

const {
wrapEl,
toXY,
getDrawings,
saveDrawings,
redraw,
touchShapeRevision,
onEmptyDelete
} =
deps;

let editorEl =
null;
let editingId =
null;

function close(
commit =
true
){

if(
!editorEl
){
editingId =
null;
return;
}

const id =
editingId;
const value =
editorEl.value;
editorEl.remove();
editorEl =
null;
editingId =
null;

if(
!commit ||
!id
){
redraw?.();
return;
}

const shape =
getDrawings?.()?.find(
d=>
d.id ===
id
);

if(
!shape
){
redraw?.();
return;
}

const next =
String(
value ??
""
).replace(
/\r\n/g,
"\n"
).trimEnd();

if(
!next.trim()
){
onEmptyDelete?.(
id
);
redraw?.();
return;
}

shape.text =
next;
touchShapeRevision?.(
shape
);
saveDrawings?.();
redraw?.();

}

function begin(
shape
){

if(
!wrapEl ||
!shape ||
!isTextTool(
shape.type
)
){
return;
}

close(
true
);

const anchor =
toXY({
time:
shape.time,
price:
shape.price
});
const box =
measureTextBox(
null,
shape,
anchor
);

if(
!box
){
return;
}

const ta =
document.createElement(
"textarea"
);

ta.className =
"draw-text-editor";
ta.setAttribute(
"spellcheck",
"false"
);
ta.value =
textContentOf(
shape
);
ta.style.left =
`${box.x}px`;
ta.style.top =
`${box.y}px`;
ta.style.fontSize =
`${clampTextFontSize(shape.fontSize)}px`;
ta.style.color =
shape.color ||
TEXT_DEFAULT_COLOR;

function applySize(){

const size =
measureTextEditorCssSize(
shape,
ta.value
);

ta.style.width =
`${size.width}px`;
ta.style.height =
`${size.height}px`;

if(
!ta.isConnected
){
return;
}

const extraW =
Math.max(
0,
ta.scrollWidth -
ta.clientWidth
);
const extraH =
Math.max(
0,
ta.scrollHeight -
ta.clientHeight
);

if(
extraW ||
extraH
){
ta.style.width =
`${size.width + extraW}px`;
ta.style.height =
`${size.height + extraH}px`;
}

}

applySize();

wrapEl.appendChild(
ta
);
editorEl =
ta;
editingId =
shape.id;
redraw?.();

applySize();
ta.focus();
ta.select();

ta.addEventListener(
"input",
applySize
);

const onKey =
e=>{

e.stopPropagation();

if(
e.key ===
"Escape"
){
e.preventDefault();
close(
false
);
return;
}

if(
e.key ===
"Enter" &&
!e.shiftKey
){
e.preventDefault();
close(
true
);

}

};

ta.addEventListener(
"keydown",
onKey
);
ta.addEventListener(
"blur",
()=>
close(
true
)
);

}

return {
begin,
close,
isEditing(){
return !!editingId;
},
editingId(){
return editingId;
},
destroy(){
close(
false
);
}
};

}
