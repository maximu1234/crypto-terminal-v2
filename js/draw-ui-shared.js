import {
getDrawToolIconSrc
} from "./draw-toolbar-icon-data.js?v=29";

export function drawToolIconImg(
name,
className = "draw-tool-icon"
){

const src =
getDrawToolIconSrc(name);

return `<img class="${className}" src="${src}" alt="" aria-hidden="true" decoding="async">`;

}

export function mountDrawToolIcons(
root = document
){

root.querySelectorAll(
"img.draw-tool-icon[data-icon]"
).forEach(img=>{

const name =
img.dataset.icon;

if(!name){
return;
}

img.src =
getDrawToolIconSrc(name);

});

}

export function mountDrawToolbar(
container
){

if(
!container
){
return;
}

container.innerHTML =
getDrawToolbarButtonsHtml();

}

export const CURSOR_TOOL_ICON_SVG = drawToolIconImg("cursor");
export const ARROW_ICON_SVG = drawToolIconImg("arrow");
export const RECTANGLE_ICON_SVG = drawToolIconImg("rectangle");
export const TRENDLINE_ICON_SVG = drawToolIconImg("trendline");
export const BRUSH_ICON_SVG = drawToolIconImg("brush");
export const HRAY_ICON_SVG = drawToolIconImg("hray");
export const FIB_ICON_SVG = drawToolIconImg("fib");
export const CHANNEL_ICON_SVG = drawToolIconImg("channel");
export const LONG_POSITION_ICON_SVG = drawToolIconImg("long", "draw-tool-icon draw-pos-icon draw-pos-icon--long");
export const SHORT_POSITION_ICON_SVG = drawToolIconImg("short", "draw-tool-icon draw-pos-icon draw-pos-icon--short");
export const TRASH_ICON_SVG = drawToolIconImg("trash");
export const SETTINGS_ICON_SVG = `
<svg class="draw-settings-icon" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
<path fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" d="M12 3.75 19.25 7.875v8.25L12 20.25 4.75 16.125v-8.25L12 3.75z"/>
<circle cx="12" cy="12" r="2.35" fill="none" stroke="currentColor" stroke-width="1.5"/>
</svg>`;
export const TOOLBAR_CLEAR_TRASH_ICON_SVG = TRASH_ICON_SVG;

export const ALARM_ICON_SVG = `
<svg class="alert-icon" viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
<circle cx="12" cy="13" r="6.5" fill="none" stroke="currentColor" stroke-width="1.4"/>
<path d="M8.5 5.5 7 4M15.5 5.5 17 4" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
<path d="M12 13V10" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
<path d="M12 13l2 1.2" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
<path d="M17.5 17.5 20 20" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
<path d="M18.5 18.5h2.2v2.2" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
</svg>
`;

/** Иконка «Объекты рисования» — палитра и кисть */
export const DRAW_TOOLS_PALETTE_ICON_SVG = `
<svg viewBox="0 0 24 24" aria-hidden="true">
<path fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" d="M11.2 4C6.8 4.4 4.2 7.8 4.2 11.4c0 2.3 1.2 4.3 3 5.4.7.4 1.4.6 2.2.6 2 0 3.4-1 4.1-2.5.8-1.7 2.9-3 6.1-3 3.5 0 6.3-2.5 6.3-6.1S17 4 13 4c-.6 0-1.2.05-1.8.15"/>
<circle cx="7.3" cy="9.2" r="1" fill="currentColor" stroke="none"/>
<circle cx="8.7" cy="11.6" r="1" fill="currentColor" stroke="none"/>
<circle cx="7" cy="13.4" r="1" fill="currentColor" stroke="none"/>
<circle cx="9.4" cy="8.2" r="1" fill="currentColor" stroke="none"/>
<circle cx="9.8" cy="12.2" r="1" fill="currentColor" stroke="none"/>
<path fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" d="M14.2 6.8l4.8 9"/>
<path fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" d="M18.2 14.2l2.3 2.3-1.3 1.3-2.3-2.3"/>
</svg>`;

export function getDrawToolbarButtonsHtml(
opts = {}
){

const btnClass =
opts.compact
? "draw-btn draw-btn-sm"
: "draw-btn";

return `
<button type="button" class="${btnClass}" data-draw-tool="cursor" title="Курсор">
${CURSOR_TOOL_ICON_SVG}
</button>

<button type="button" class="${btnClass}" data-draw-tool="trendline" title="Trendline (R)">
${TRENDLINE_ICON_SVG}
</button>

<button type="button" class="${btnClass}" data-draw-tool="arrow" title="Arrow">
${ARROW_ICON_SVG}
</button>

<button type="button" class="${btnClass}" data-draw-tool="hray" title="Horizontal Ray">
${HRAY_ICON_SVG}
</button>

<button type="button" class="${btnClass}" data-draw-tool="channel" title="Parallel Channel (C)">
${CHANNEL_ICON_SVG}
</button>

<button type="button" class="${btnClass}" data-draw-tool="brush" title="Кисть">
${BRUSH_ICON_SVG}
</button>

<button type="button" class="${btnClass}" data-draw-tool="fib" title="Fib Retracement (F)">
${FIB_ICON_SVG}
</button>

<button type="button" class="${btnClass}" data-draw-tool="rectangle" title="Rectangle">
${RECTANGLE_ICON_SVG}
</button>

${getPositionDrawToolbarButtonsHtml(opts)}

<button type="button" class="${btnClass} draw-tool-clear-all" title="Удалить все объекты на графике (Shift+Backspace)">
${TOOLBAR_CLEAR_TRASH_ICON_SVG}
</button>`;

}

export function getPositionDrawToolbarButtonsHtml(
opts = {}
){

const btnClass =
opts.compact
? "draw-btn draw-btn-sm"
: "draw-btn";

return `
<button type="button" class="${btnClass}" data-draw-tool="long" title="Позиция Long (L)">
${LONG_POSITION_ICON_SVG}
</button>
<button type="button" class="${btnClass}" data-draw-tool="short" title="Позиция Short (S)">
${SHORT_POSITION_ICON_SVG}
</button>`;

}
