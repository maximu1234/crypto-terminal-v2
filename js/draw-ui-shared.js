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

/** Long / Short: цветные зоны как на графике + стрелка + буква */
export const LONG_POSITION_ICON_SVG = `
<svg class="draw-pos-icon draw-pos-icon--long" viewBox="0 0 24 24" aria-hidden="true">
<rect x="2" y="2" width="12" height="7" rx="1.5" fill="rgba(34,197,94,0.4)" stroke="#4ade80" stroke-width="1.2"/>
<rect x="2" y="14" width="12" height="8" rx="1.5" fill="rgba(127,29,29,0.45)" stroke="#f87171" stroke-width="1.2"/>
<line x1="2" y1="12" x2="14" y2="12" stroke="#facc15" stroke-width="2.2" stroke-linecap="round"/>
<circle cx="3.5" cy="12" r="2" fill="#0f172a" stroke="#facc15" stroke-width="1.2"/>
<text x="8" y="10.5" fill="#bbf7d0" font-size="8.5" font-weight="800" font-family="Arial,sans-serif">L</text>
<path d="M19 15V8.5M19 8.5L16.5 11M19 8.5L21.5 11" stroke="#4ade80" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

export const SHORT_POSITION_ICON_SVG = `
<svg class="draw-pos-icon draw-pos-icon--short" viewBox="0 0 24 24" aria-hidden="true">
<rect x="2" y="2" width="12" height="7" rx="1.5" fill="rgba(127,29,29,0.5)" stroke="#f87171" stroke-width="1.2"/>
<rect x="2" y="14" width="12" height="8" rx="1.5" fill="rgba(34,197,94,0.4)" stroke="#4ade80" stroke-width="1.2"/>
<line x1="2" y1="12" x2="14" y2="12" stroke="#facc15" stroke-width="2.2" stroke-linecap="round"/>
<circle cx="3.5" cy="12" r="2" fill="#0f172a" stroke="#facc15" stroke-width="1.2"/>
<text x="8" y="17" fill="#fecaca" font-size="8.5" font-weight="800" font-family="Arial,sans-serif">S</text>
<path d="M19 9v6.5M19 15.5L16.5 13M19 15.5L21.5 13" stroke="#f87171" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
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
