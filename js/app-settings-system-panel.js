/**
 * Настройки → Системные.
 */
import {
isMenuBarTrayEnabled,
isMenuBarTrayPlatform,
setMenuBarTrayEnabled
} from "./desktop-menu-bar-tray-prefs.js?v=1";

import {
applyDesktopMenuBarTrayPreference
} from "./desktop-menu-bar-tray.js?v=5";

import {
isScreenerPatternEnabled,
setScreenerPatternEnabled
} from "./screener-pattern-prefs.js?v=1";

function syncTrayToggle(
input
){

if(
!input
){
return;
}

input.checked =
isMenuBarTrayEnabled();

}

function syncPatternToggle(
input
){

if(
!input
){
return;
}

input.checked =
isScreenerPatternEnabled();

}

export function mountSystemSettingsPanel(
host
){

if(
!host ||
host.dataset.systemMounted ===
"1"
){
return {
refresh:()=>{}
};
}

host.dataset.systemMounted =
"1";

const trayBlock =
isMenuBarTrayPlatform()
? `
<p class="app-settings-panel-lead">Поведение иконки Multichart в строке меню macOS.</p>
<label class="app-settings-toggle-row">
<input type="checkbox" class="app-settings-toggle-input" id="app-settings-menu-bar-tray" />
<span class="app-settings-toggle-label">Показывать иконку в системном меню</span>
</label>
`
: "";

host.innerHTML =
`
${trayBlock}
<p class="app-settings-panel-lead app-settings-panel-lead--spaced">Скринер.</p>
<label class="app-settings-toggle-row">
<input type="checkbox" class="app-settings-toggle-input" id="app-settings-screener-pattern-12" />
<span class="app-settings-toggle-label">Показывать Паттерн 1-2 1-2 в Скринере</span>
</label>
`;

const trayInput =
host.querySelector(
"#app-settings-menu-bar-tray"
);
const patternInput =
host.querySelector(
"#app-settings-screener-pattern-12"
);

syncTrayToggle(
trayInput
);
syncPatternToggle(
patternInput
);

trayInput?.addEventListener(
"change",
()=>{

const enabled =
!!trayInput?.checked;

setMenuBarTrayEnabled(
enabled
);
void applyDesktopMenuBarTrayPreference();

}
);

patternInput?.addEventListener(
"change",
()=>{

setScreenerPatternEnabled(
!!patternInput?.checked
);

}
);

return {
refresh:()=>{
syncTrayToggle(
trayInput
);
syncPatternToggle(
patternInput
);
}
};

}
