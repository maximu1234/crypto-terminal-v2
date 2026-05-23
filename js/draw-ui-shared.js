/** Иконка инструмента «Курсор» — перекрестие с зазором в центре */
export const CURSOR_TOOL_ICON_SVG = `
<svg viewBox="0 0 24 24" aria-hidden="true">
<line x1="12" y1="3" x2="12" y2="9" stroke="currentColor" stroke-width="2" stroke-linecap="square"/>
<line x1="12" y1="15" x2="12" y2="21" stroke="currentColor" stroke-width="2" stroke-linecap="square"/>
<line x1="3" y1="12" x2="9" y2="12" stroke="currentColor" stroke-width="2" stroke-linecap="square"/>
<line x1="15" y1="12" x2="21" y2="12" stroke="currentColor" stroke-width="2" stroke-linecap="square"/>
</svg>`;

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

export const TRASH_ICON_SVG = `
<svg class="alert-icon" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
<path fill="none" stroke="currentColor" stroke-width="1.5" d="M9 3h6l1 2h4v2H4V5h4l1-2zM7 9v11h10V9"/>
</svg>
`;

export function getAlertToggleButtonHtml(){

return `
<button type="button" class="float-alert draw-alert-toggle hidden" title="Сделать алертом" aria-label="Сделать алертом">
${ALARM_ICON_SVG}
</button>
`;

}

/** Long / Short: те же зоны, что на графике (POSITION_* в drawings.js) */
export const LONG_POSITION_ICON_SVG = `
<svg class="draw-pos-icon draw-pos-icon--long" viewBox="0 0 12 18" aria-hidden="true">
<rect x="2" y="1" width="8" height="9.5" fill="rgba(20,83,45,0.92)"/>
<line x1="2" y1="10.75" x2="10" y2="10.75" stroke="#FACC15" stroke-width="1.5" stroke-linecap="square"/>
<rect x="2" y="11.25" width="8" height="5.75" fill="rgba(127,29,29,0.92)"/>
</svg>`;

export const SHORT_POSITION_ICON_SVG = `
<svg class="draw-pos-icon draw-pos-icon--short" viewBox="0 0 12 18" aria-hidden="true">
<rect x="2" y="1" width="8" height="5.75" fill="rgba(127,29,29,0.92)"/>
<line x1="2" y1="7.25" x2="10" y2="7.25" stroke="#FACC15" stroke-width="1.5" stroke-linecap="square"/>
<rect x="2" y="7.75" width="8" height="9.5" fill="rgba(20,83,45,0.92)"/>
</svg>`;

export function getPositionDrawToolbarButtonsHtml(
opts = {}
){

const btnClass =
opts.compact
? "draw-btn draw-btn-sm"
: "draw-btn";

return `
<button type="button" class="${btnClass}" data-draw-tool="long" title="Позиция Long — клик на вход, затем тяните тейк/стоп">
${LONG_POSITION_ICON_SVG}
</button>
<button type="button" class="${btnClass}" data-draw-tool="short" title="Позиция Short — клик на вход, затем тяните тейк/стоп">
${SHORT_POSITION_ICON_SVG}
</button>`;

}
