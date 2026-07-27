/**
 * Единая разметка шестерёнки (аккаунт + dropdown) для всех страниц.
 */
export const HEADER_SETTINGS_GEAR_SVG =
`<svg class="header-settings-icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" stroke-width="1.75"/><path fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`;

export function headerSettingsShellHtml(){

return `
<div class="header-settings-wrap" id="header-settings-wrap">
<button type="button" class="header-settings-btn" id="header-settings-btn" title="Аккаунт и настройки" aria-label="Настройки" aria-expanded="false" aria-haspopup="true">
${HEADER_SETTINGS_GEAR_SVG}
</button>
<div class="header-settings-dropdown hidden" id="header-settings-dropdown" role="menu">
<p class="header-settings-section-title">Аккаунт</p>
<div id="cloud-settings-mount"></div>
</div>
</div>`;

}

function navNeedsSettingsShell(
nav
){

if(
!nav
){
return false;
}

return !nav.querySelector(
"#header-settings-wrap, .header-settings-btn"
);

}

/**
 * @returns {boolean} shell was inserted or upgraded
 */
export function ensureHeaderSettingsShell(){

if(
document.getElementById(
"header-settings-wrap"
)
){
return false;
}

const navSelectors =
[
"#app-header-nav",
"nav.app-header-nav"
];

for(
const selector of
navSelectors
){

const nav =
document.querySelector(
selector
);

if(
navNeedsSettingsShell(
nav
)
){
nav.insertAdjacentHTML(
"beforeend",
headerSettingsShellHtml()
);
return true;
}

}

return false;

}
