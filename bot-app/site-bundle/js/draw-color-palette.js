/**
 * TradingView drawing color picker: 10×8 grid + opacity slider (0–100%).
 */

/** @type {readonly (readonly string[])[]} */
export const TV_COLOR_GRID = Object.freeze([
[
"#ffffff",
"#dbdbdb",
"#b8b8b8",
"#9c9c9c",
"#808080",
"#636363",
"#4a4a4a",
"#2e2e2e",
"#0f0f0f",
"#000000"
],
[
"#df484c",
"#f19d38",
"#fcec60",
"#67ad5c",
"#459782",
"#55b9d1",
"#3861f6",
"#613cb1",
"#9031aa",
"#d63865"
],
[
"#f4cdce",
"#fae1b8",
"#fef9ca",
"#cee5cb",
"#b8e4dc",
"#beeaf1",
"#c1d8f8",
"#cfc5e6",
"#dcc0e4",
"#efbed0"
],
[
"#eea5a6",
"#f7ce8b",
"#fef6a8",
"#afd5ab",
"#87cabd",
"#97dce8",
"#9abef4",
"#b09ed7",
"#c596d4",
"#e694b0"
],
[
"#e78383",
"#f4ba61",
"#fdf288",
"#91c58a",
"#67bba9",
"#74cdde",
"#6b9bef",
"#9076c8",
"#df6b92",
"#df6b92"
],
[
"#e55e64",
"#f3ab47",
"#fcef72",
"#7bb973",
"#53a995",
"#60c3d7",
"#4578ed",
"#7859bc",
"#9f4db7",
"#da4f7a"
],
[
"#a43538",
"#e68331",
"#f2c34f",
"#508c46",
"#2c6557",
"#4395a5",
"#2647c5",
"#4c2fa2",
"#71279c",
"#b22e5b"
],
[
"#762326",
"#d55c26",
"#e68538",
"#305d28",
"#11322a",
"#285f63",
"#173193",
"#2e1c8c",
"#441887",
"#7d1d4e"
]
]);

export const TV_COLOR_PALETTE =
TV_COLOR_GRID.flat();

function hexToRgb(
hex
){

const n =
parseInt(
hex.slice(
1
),
16
);

return {
r: (
n >>
16
) &
255,
g: (
n >>
8
) &
255,
b: n &
255
};

}

/** @returns {{ hex: string, opacity: number } | null} */
export function parseDrawColor(
raw
){

if(
typeof raw !==
"string"
){
return null;
}

const s =
raw.trim();

const hexMatch =
/^#([0-9A-Fa-f]{6})$/.exec(
s
);

if(
hexMatch
){
return {
hex: `#${hexMatch[1].toLowerCase()}`,
opacity: 100
};
}

const rgbaMatch =
/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([0-9.]+))?\s*\)$/i.exec(
s
);

if(
rgbaMatch
){

const r =
Number(
rgbaMatch[
1
]
);
const g =
Number(
rgbaMatch[
2
]
);
const b =
Number(
rgbaMatch[
3
]
);
const a =
rgbaMatch[
4
] ==
null
? 1
: Number(
rgbaMatch[
4
]
);

if(
![
r,
g,
b,
a
].every(
Number.isFinite
)
){
return null;
}

const hex =
`#${[
r,
g,
b
].map(
v=>{
const h =
Math.max(
0,
Math.min(
255,
Math.round(
v
)
)
).toString(
16
).padStart(
2,
"0"
);
return h;
}).join(
""
)}`;

return {
hex,
opacity: Math.max(
0,
Math.min(
100,
Math.round(
a *
100
)
)
)
};

}

return null;

}

export function formatDrawColor(
hex,
opacity =
100
){

const parsed =
parseDrawColor(
hex
);

const base =
parsed?.hex ||
(
/^#[0-9A-Fa-f]{6}$/.test(
hex
)
? hex.toLowerCase()
: null
);

if(
!base
){
return hex;
}

const op =
Number.isFinite(
opacity
)
? opacity
: parsed?.opacity ??
100;

if(
op >=
100
){
return base;
}

const {
r,
g,
b
} =
hexToRgb(
base
);

return `rgba(${r}, ${g}, ${b}, ${Math.max(0, Math.min(1, op / 100))})`;

}

function syncOpacityUi(
root,
hex,
opacity
){

const track =
root.querySelector(
".tv-color-opacity-track"
);

const pct =
root.querySelector(
".tv-color-opacity-pct"
);

const slider =
root.querySelector(
".tv-color-opacity-slider"
);

const pctVal =
Math.max(
0,
Math.min(
100,
Math.round(
opacity
)
)
);

if(
track
){
track.style.setProperty(
"--tv-opacity-color",
hex
);
}

if(
pct
){
pct.textContent =
`${pctVal}%`;
}

if(
slider &&
Number(
slider.value
) !==
pctVal
){
slider.value =
String(
pctVal
);
}

}

function markActiveSwatch(
container,
hex
){

const target =
parseDrawColor(
hex
)?.hex ||
hex?.toLowerCase?.();

container.querySelectorAll(
".tv-color-swatch"
).forEach(
btn=>{
btn.classList.toggle(
"active",
!!target &&
btn.dataset.color?.toLowerCase() ===
target
);
}
);

}

export function mountTvColorGrid(
container,
{
onSelect,
activeColor = null,
activeOpacity = 100
} = {}
){

mountTvColorPicker(
container,
{
onSelect: color=>{
onSelect?.(
color
);
},
activeColor,
activeOpacity
}
);

}

function appendColorRow(
grid,
row,
onPick
){

row.forEach(
hex=>{

const btn =
document.createElement(
"button"
);

btn.type = "button";
btn.className =
"tv-color-swatch";
btn.dataset.color = hex;
btn.style.background = hex;
btn.title = hex;

btn.addEventListener(
"click",
e=>{

e.stopPropagation();
onPick(
hex
);

}
);

grid.appendChild(
btn
);

}
);

}

export function mountTvColorPicker(
container,
{
onSelect,
onChange,
activeColor = null,
activeOpacity = 100
} = {}
){

if(
!container
){
return;
}

const parsed =
parseDrawColor(
activeColor
);

let pickedHex =
parsed?.hex ||
"#2196f3";

let pickedOpacity =
parsed?.opacity ??
(
Number.isFinite(
activeOpacity
)
? activeOpacity
: 100
);

container.innerHTML = "";
container.classList.add(
"tv-color-picker"
);

function pickColor(
hex
){

pickedHex = hex;
syncOpacityUi(
container,
pickedHex,
pickedOpacity
);
markActiveSwatch(
container,
pickedHex
);

const formatted =
formatDrawColor(
pickedHex,
pickedOpacity
);

onChange?.(
formatted
);
onSelect?.(
formatted
);

}

const gridsWrap =
document.createElement(
"div"
);

gridsWrap.className =
"tv-color-grids";

const greyGrid =
document.createElement(
"div"
);

greyGrid.className =
"tv-color-grid tv-color-grid--grey";

const accentGrid =
document.createElement(
"div"
);

accentGrid.className =
"tv-color-grid tv-color-grid--accent";

const shadesGrid =
document.createElement(
"div"
);

shadesGrid.className =
"tv-color-grid tv-color-grid--shades";

appendColorRow(
greyGrid,
TV_COLOR_GRID[
0
],
pickColor
);

appendColorRow(
accentGrid,
TV_COLOR_GRID[
1
],
pickColor
);

TV_COLOR_GRID.slice(
2
).forEach(
row=>{
appendColorRow(
shadesGrid,
row,
pickColor
);
}
);

gridsWrap.appendChild(
greyGrid
);
gridsWrap.appendChild(
accentGrid
);
gridsWrap.appendChild(
shadesGrid
);
container.appendChild(
gridsWrap
);

const opacityWrap =
document.createElement(
"div"
);

opacityWrap.className =
"tv-color-opacity";
opacityWrap.innerHTML =
`<div class="tv-color-opacity-label">Opacity</div>
<div class="tv-color-opacity-row">
<div class="tv-color-opacity-track">
<input type="range" class="tv-color-opacity-slider" min="0" max="100" step="1" value="100" aria-label="Opacity"/>
</div>
<div class="tv-color-opacity-pct">100%</div>
</div>`;

container.appendChild(
opacityWrap
);

const slider =
opacityWrap.querySelector(
".tv-color-opacity-slider"
);

slider?.addEventListener(
"input",
()=>{

pickedOpacity =
Number(
slider.value
);

syncOpacityUi(
container,
pickedHex,
pickedOpacity
);

markActiveSwatch(
container,
pickedHex
);

const formatted =
formatDrawColor(
pickedHex,
pickedOpacity
);

if(
onChange
){
onChange(
formatted
);
}else{
onSelect?.(
formatted
);
}

}
);

slider?.addEventListener(
"mousedown",
e=>{
e.stopPropagation();
}
);

slider?.addEventListener(
"click",
e=>{
e.stopPropagation();
}
);

opacityWrap.addEventListener(
"mousedown",
e=>{
e.stopPropagation();
}
);

markActiveSwatch(
container,
pickedHex
);

syncOpacityUi(
container,
pickedHex,
pickedOpacity
);

}
