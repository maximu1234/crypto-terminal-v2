export const DRAW_TOOLS_GUEST_MSG =
"Рисование доступно только для залогиненных пользователей.";

/** Все иконки тулбара: viewBox 24×24, «чернила» в квадрате 5…19 (14×14). */
export const CURSOR_TOOL_ICON_SVG = `
<svg viewBox="0 0 24 24" aria-hidden="true">
<line x1="12" y1="5" x2="12" y2="10" stroke="currentColor" stroke-width="1.5" stroke-linecap="square"/>
<line x1="12" y1="14" x2="12" y2="19" stroke="currentColor" stroke-width="1.5" stroke-linecap="square"/>
<line x1="5" y1="12" x2="10" y2="12" stroke="currentColor" stroke-width="1.5" stroke-linecap="square"/>
<line x1="14" y1="12" x2="19" y2="12" stroke="currentColor" stroke-width="1.5" stroke-linecap="square"/>
</svg>`;

export const TRENDLINE_ICON_SVG = `
<svg viewBox="0 0 24 24" aria-hidden="true">
<line x1="5.5" y1="18.5" x2="18.5" y2="5.5" stroke="currentColor" stroke-width="1.5"/>
<circle cx="5.5" cy="18.5" r="1.75" fill="none" stroke="currentColor" stroke-width="1.5"/>
<circle cx="18.5" cy="5.5" r="1.75" fill="none" stroke="currentColor" stroke-width="1.5"/>
</svg>`;

export const HRAY_ICON_SVG = `
<svg viewBox="0 0 24 24" aria-hidden="true">
<line x1="5" y1="12" x2="19" y2="12" stroke="currentColor" stroke-width="1.5"/>
<circle cx="5" cy="12" r="1.75" fill="none" stroke="currentColor" stroke-width="1.5"/>
</svg>`;

export const FIB_ICON_SVG = `
<svg viewBox="0 0 24 24" aria-hidden="true">
<line x1="5" y1="19" x2="19" y2="19" stroke="currentColor" stroke-width="1.5"/>
<line x1="5" y1="15.5" x2="19" y2="15.5" stroke="currentColor" stroke-width="1.5"/>
<line x1="5" y1="12" x2="19" y2="12" stroke="currentColor" stroke-width="1.5"/>
<line x1="5" y1="8.5" x2="19" y2="8.5" stroke="currentColor" stroke-width="1.5"/>
<line x1="5" y1="5" x2="19" y2="5" stroke="currentColor" stroke-width="1.5"/>
</svg>`;

export const CHANNEL_ICON_SVG = `
<svg viewBox="0 0 24 24" aria-hidden="true">
<line x1="5" y1="17" x2="19" y2="7" stroke="currentColor" stroke-width="1.5"/>
<line x1="5" y1="19" x2="19" y2="9" stroke="currentColor" stroke-width="1.5"/>
</svg>`;

/** Корзина — outline как в TradingView: ручка, крышка, трапеция со скруглённым дном. */
export const TRASH_ICON_SVG = `
<svg viewBox="0 0 24 24" aria-hidden="true">
<path fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" d="M10.5 8.5V6a1.5 1.5 0 0 1 3 0v2.5"/>
<line x1="5" y1="8.5" x2="19" y2="8.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
<path fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" d="M7.75 8.5 6.35 18.65a1.35 1.35 0 0 0 1.35 1.35h8.6a1.35 1.35 0 0 0 1.35-1.35L16.25 8.5"/>
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

export function getAlertToggleButtonHtml(){

return `
<button type="button" class="float-alert draw-alert-toggle hidden" title="Сделать алертом" aria-label="Сделать алертом">
${ALARM_ICON_SVG}
</button>
`;

}

/** Long / Short: те же зоны, что на графике (POSITION_* в drawings.js) */
export const LONG_POSITION_ICON_SVG = `
<svg class="draw-pos-icon draw-pos-icon--long" viewBox="0 0 24 24" aria-hidden="true">
<rect x="5" y="5" width="14" height="6.5" fill="rgba(20,83,45,0.92)"/>
<line x1="5" y1="12" x2="19" y2="12" stroke="#FACC15" stroke-width="1.5" stroke-linecap="square"/>
<rect x="5" y="12.5" width="14" height="6.5" fill="rgba(127,29,29,0.92)"/>
</svg>`;

export const SHORT_POSITION_ICON_SVG = `
<svg class="draw-pos-icon draw-pos-icon--short" viewBox="0 0 24 24" aria-hidden="true">
<rect x="5" y="5" width="14" height="5.5" fill="rgba(127,29,29,0.92)"/>
<line x1="5" y1="11" x2="19" y2="11" stroke="#FACC15" stroke-width="1.5" stroke-linecap="square"/>
<rect x="5" y="11.5" width="14" height="7.5" fill="rgba(20,83,45,0.92)"/>
</svg>`;

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

<button type="button" class="${btnClass}" data-draw-tool="trendline" title="Trendline — 2 клика">
${TRENDLINE_ICON_SVG}
</button>

<button type="button" class="${btnClass}" data-draw-tool="hray" title="Horizontal Ray — 1 клик">
${HRAY_ICON_SVG}
</button>

<button type="button" class="${btnClass}" data-draw-tool="fib" title="Fib Retracement — 2 клика">
${FIB_ICON_SVG}
</button>

<button type="button" class="${btnClass}" data-draw-tool="channel" title="Parallel Channel — 3 клика">
${CHANNEL_ICON_SVG}
</button>

${getPositionDrawToolbarButtonsHtml(opts)}

<button type="button" class="${btnClass} draw-tool-clear-all" title="Удалить все объекты на графике">
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
<button type="button" class="${btnClass}" data-draw-tool="long" title="Позиция Long — клик на вход, затем тяните тейк/стоп">
${LONG_POSITION_ICON_SVG}
</button>
<button type="button" class="${btnClass}" data-draw-tool="short" title="Позиция Short — клик на вход, затем тяните тейк/стоп">
${SHORT_POSITION_ICON_SVG}
</button>`;

}
