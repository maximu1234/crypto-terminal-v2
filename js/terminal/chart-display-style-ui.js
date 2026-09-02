/**
 * Terminal topbar: candlesticks vs line, plus line style popover.
 */
import {
CHART_DISPLAY_SOURCES,
CHART_DISPLAY_LINE_STYLES,
CHART_DISPLAY_TYPE_LINE,
normalizeChartDisplayStyle
} from "../chart/chart-display-style.js?v=2";

const SOURCE_LABELS =
{
close: "Close",
open: "Open",
high: "High",
low: "Low",
hl2: "(H+L)/2"
};

const LINE_STYLE_LABELS =
{
solid: "Solid",
dashed: "Dashed",
dotted: "Dotted"
};

function optionHtml(
values,
labels,
selected
){

return values.map(
value =>
`<option value="${value}"${value === selected ? " selected" : ""}>${labels[value]}</option>`
).join("");

}

export function mountChartDisplayStyleUi(
{
root,
getStyle,
onChange
}
){

if(!root){
return () => {};
}

const typeButtons =
[
...root.querySelectorAll("[data-chart-type]")
];
const settingsBtn =
root.querySelector(
"#chart-type-line-settings"
);

const popover =
document.createElement("div");
popover.className =
"chart-type-line-popover hidden";
popover.setAttribute("role", "dialog");
popover.setAttribute("aria-label", "Стиль линии");
root.appendChild(popover);

function current(){

return normalizeChartDisplayStyle(
getStyle?.()
);

}

function renderActive(){

const style =
current();

typeButtons.forEach(
btn => {
const on =
btn.dataset.chartType === style.type;
btn.classList.toggle("active", on);
btn.setAttribute("aria-pressed", on ? "true" : "false");
}
);

if(settingsBtn){
settingsBtn.hidden =
style.type !== CHART_DISPLAY_TYPE_LINE;
}

}

function closePopover(){

popover.classList.add("hidden");
settingsBtn?.setAttribute("aria-expanded", "false");

}

function fillPopover(){

const style =
current();
popover.innerHTML =
`<div class="chart-type-line-row">
<label class="chart-type-line-label" for="chart-type-line-source">Источник цены</label>
<select id="chart-type-line-source" class="chart-type-line-select">${optionHtml(CHART_DISPLAY_SOURCES, SOURCE_LABELS, style.source)}</select>
</div>
<div class="chart-type-line-row">
<label class="chart-type-line-label" for="chart-type-line-style">Линия</label>
<select id="chart-type-line-style" class="chart-type-line-select">${optionHtml(CHART_DISPLAY_LINE_STYLES, LINE_STYLE_LABELS, style.lineStyle)}</select>
<input id="chart-type-line-color" class="chart-type-line-color" type="color" value="${style.lineColor}" title="Цвет линии" />
<select id="chart-type-line-width" class="chart-type-line-select chart-type-line-select--width" title="Толщина" aria-label="Толщина линии">
<option value="1"${style.lineWidth === 1 ? " selected" : ""}>1</option>
<option value="2"${style.lineWidth === 2 ? " selected" : ""}>2</option>
<option value="3"${style.lineWidth === 3 ? " selected" : ""}>3</option>
<option value="4"${style.lineWidth === 4 ? " selected" : ""}>4</option>
</select>
</div>`;

popover.querySelector("#chart-type-line-source")?.addEventListener("change", event => {
emit({
...current(),
source: event.target.value
});
});
popover.querySelector("#chart-type-line-style")?.addEventListener("change", event => {
emit({
...current(),
lineStyle: event.target.value
});
});
popover.querySelector("#chart-type-line-color")?.addEventListener("input", event => {
emit({
...current(),
lineColor: event.target.value
});
});
popover.querySelector("#chart-type-line-width")?.addEventListener("change", event => {
emit({
...current(),
lineWidth: event.target.value
});
});

}

function openPopover(){

if(current().type !== CHART_DISPLAY_TYPE_LINE){
return;
}

fillPopover();
popover.classList.remove("hidden");
settingsBtn?.setAttribute("aria-expanded", "true");

}

function emit(
partial
){

const next =
normalizeChartDisplayStyle({
...current(),
...partial
});
onChange?.(next);
renderActive();

if(
next.type !== CHART_DISPLAY_TYPE_LINE
){
closePopover();
}else if(
!popover.classList.contains("hidden")
){
fillPopover();
}

}

typeButtons.forEach(
btn => {
btn.addEventListener("click", () => {
const type =
btn.dataset.chartType;
const already =
current().type === type;

if(
already &&
type === CHART_DISPLAY_TYPE_LINE
){
if(popover.classList.contains("hidden")){
openPopover();
}else{
closePopover();
}
return;
}

emit({
...current(),
type
});
});
}
);

settingsBtn?.addEventListener("click", event => {
event.stopPropagation();
if(popover.classList.contains("hidden")){
openPopover();
}else{
closePopover();
}
});

function onDocPointerDown(
event
){

if(root.contains(event.target)){
return;
}

closePopover();

}

document.addEventListener("pointerdown", onDocPointerDown);

renderActive();

return () => {
document.removeEventListener("pointerdown", onDocPointerDown);
popover.remove();
};

}
