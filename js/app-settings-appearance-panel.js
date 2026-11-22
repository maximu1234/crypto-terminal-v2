/**
 * Настройки → Внешний вид.
 */
import {
mountTvColorPicker,
parseDrawColor
} from "./draw-color-palette.js?v=e2a8aa69";

import {
APPEARANCE_FIELDS,
appearanceHasOverrides,
appearanceTheme,
normalizeAppearanceHex,
resetAppearanceTheme,
setAppearanceColor
} from "./appearance-theme.js?v=a12dec97";

let portal = null;
let outsideListener = null;

function closePalette(){

if(outsideListener){
document.removeEventListener(
"pointerdown",
outsideListener,
true
);
outsideListener = null;
}

if(!portal){
return;
}

portal.classList.add("hidden");
portal.innerHTML = "";

}

function placePalette(
anchor
){

const rect =
anchor.getBoundingClientRect();
const box =
portal.getBoundingClientRect();
const width =
box.width || 248;
const height =
box.height || 220;
let left =
rect.right - width;
let top =
rect.bottom + 6;

if(left < 8){
left = rect.left;
}

if(left + width > window.innerWidth - 8){
left = window.innerWidth - width - 8;
}

if(top + height > window.innerHeight - 8){
top = rect.top - height - 6;
}

if(top < 8){
top = 8;
}

if(left < 8){
left = 8;
}

portal.style.left = `${Math.round(left)}px`;
portal.style.top = `${Math.round(top)}px`;
portal.style.visibility = "";

}

function openPalette(
anchor,
color,
onPick
){

closePalette();

if(!portal){
portal = document.createElement("div");
portal.className =
"draw-popover tv-color-popover app-appearance-palette hidden";
document.body.appendChild(portal);
}

portal.style.position = "fixed";
portal.style.zIndex = "16000";
portal.style.visibility = "hidden";
portal.classList.remove("hidden");

mountTvColorPicker(
portal,
{
activeColor: color,
activeOpacity: 100,
onSelect(next){
const parsed = parseDrawColor(next);
const hex = parsed?.hex || normalizeAppearanceHex(next);

if(hex){
onPick(hex);
}

closePalette();
}
}
);

portal.querySelector(".tv-color-opacity")?.remove();

const hexRow = document.createElement("input");
hexRow.type = "text";
hexRow.className = "app-appearance-hex";
hexRow.maxLength = 7;
hexRow.spellcheck = false;
hexRow.autocomplete = "off";
hexRow.value = color;
hexRow.setAttribute("aria-label", "Цвет, hex");
hexRow.addEventListener("keydown", event=>{
event.stopPropagation();

if(event.key !== "Enter"){
return;
}

const hex = normalizeAppearanceHex(hexRow.value);

if(!hex){
return;
}

onPick(hex);
closePalette();
});
hexRow.addEventListener("pointerdown", event=>{
event.stopPropagation();
});
portal.appendChild(hexRow);
placePalette(anchor);

outsideListener = event=>{

if(
portal.contains(event.target) ||
anchor.contains(event.target)
){
return;
}

closePalette();

};

window.setTimeout(()=>{
document.addEventListener(
"pointerdown",
outsideListener,
true
);
}, 0);

}

function paintSwatches(
root,
theme
){

root.querySelectorAll("[data-appearance-id]").forEach(button=>{
const id = button.dataset.appearanceId;
button.style.background = theme[id] || "";
});

const reset =
root.querySelector(".app-appearance-reset");

if(reset){
reset.disabled = !appearanceHasOverrides();
}

}

export function mountAppearanceSettingsPanel(
host
){

if(
!host ||
host.dataset.appearanceMounted === "1"
){
return;
}

host.dataset.appearanceMounted = "1";

const groups = [];

for(const field of APPEARANCE_FIELDS){
let group = groups.find(item=>item.title === field.group);

if(!group){
group = {
title: field.group,
fields: []
};
groups.push(group);
}

group.fields.push(field);
}

host.innerHTML = `
<p class="app-settings-panel-lead">Цвета интерфейса. Белые свечи в настройках графика эти цвета не красят.</p>
<button type="button" class="app-appearance-reset">Вернуть по умолчанию</button>
${groups.map(group=>`
<section class="app-appearance-group">
<h3 class="app-appearance-title">${group.title}</h3>
${group.fields.map(field=>`
<div class="app-appearance-row">
<span class="app-appearance-label">${field.label}</span>
<button type="button" class="app-appearance-swatch" data-appearance-id="${field.id}" title="${field.fallback}" aria-label="${field.label}"></button>
</div>
`).join("")}
</section>
`).join("")}
`;

function refresh(){
paintSwatches(
host,
appearanceTheme()
);
}

host.addEventListener("click", event=>{
const swatch = event.target.closest?.(".app-appearance-swatch");

if(swatch){
const id = swatch.dataset.appearanceId;
openPalette(
swatch,
appearanceTheme()[id],
hex=>{
setAppearanceColor(id, hex);
refresh();
}
);
return;
}

if(event.target.closest?.(".app-appearance-reset")){
resetAppearanceTheme();
refresh();
}
});

refresh();

}
