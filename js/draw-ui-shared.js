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
