/**
 * TradingView drawing color picker: 10×8 grid + opacity slider (0–100%).
 */

/** @type {readonly (readonly string[])[]} */
export const TV_COLOR_GRID = Object.freeze([
[
"#FFFFFF",
"#D1D4DC",
"#B2B5BE",
"#9598A1",
"#787B86",
"#606060",
"#434651",
"#363A45",
"#2A2E39",
"#000000"
],
[
"#FFEBEE",
"#FFF3E0",
"#FFF8E1",
"#E8F5E9",
"#E0F2F1",
"#E1F5FE",
"#E3F2FD",
"#EDE7F6",
"#F3E5F5",
"#FCE4EC"
],
[
"#FFCDD2",
"#FFE0B2",
"#FFF9C4",
"#C8E6C9",
"#B2DFDB",
"#B3E5FC",
"#BBDEFB",
"#D1C4E9",
"#E1BEE7",
"#F8BBD9"
],
[
"#F23645",
"#FF9800",
"#FDD835",
"#4CAF50",
"#089981",
"#00BCD4",
"#2196F3",
"#673AB7",
"#9C27B0",
"#E040FB"
],
[
"#E53935",
"#FB8C00",
"#FBC02D",
"#43A047",
"#00897B",
"#039BE5",
"#1E88E5",
"#5E35B1",
"#8E24AA",
"#D81B60"
],
[
"#C62828",
"#EF6C00",
"#F9A825",
"#2E7D32",
"#00695C",
"#0277BD",
"#1565C0",
"#4527A0",
"#6A1B9A",
"#AD1457"
],
[
"#B71C1C",
"#E65100",
"#F57F17",
"#1B5E20",
"#004D40",
"#01579B",
"#0D47A1",
"#311B92",
"#4A148C",
"#880E4F"
],
[
"#801313",
"#BF360C",
"#FF6F00",
"#33691E",
"#00332A",
"#004D56",
"#002171",
"#1A237E",
"#311B92",
"#4A0072"
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

const fill =
root.querySelector(
".tv-color-opacity-fill"
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
fill
){
fill.style.width =
`${pctVal}%`;
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

const grid =
document.createElement(
"div"
);

grid.className =
"tv-color-grid";

TV_COLOR_GRID.forEach(
row=>{

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
pickedHex = hex;
syncOpacityUi(
container,
pickedHex,
pickedOpacity
);
markActiveSwatch(
grid,
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
);

grid.appendChild(
btn
);

}
);

}
);

container.appendChild(
grid
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
<div class="tv-color-opacity-fill"></div>
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
grid,
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
"click",
e=>{
e.stopPropagation();
}
);

markActiveSwatch(
grid,
pickedHex
);

syncOpacityUi(
container,
pickedHex,
pickedOpacity
);

}
