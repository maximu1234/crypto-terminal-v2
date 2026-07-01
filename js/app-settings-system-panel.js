/**
 * Настройки → Системные (desktop macOS).
 */
import {
isMenuBarTrayEnabled,
isMenuBarTrayPlatform,
setMenuBarTrayEnabled
} from "./desktop-menu-bar-tray-prefs.js?v=1";

import {
applyDesktopMenuBarTrayPreference
} from "./desktop-menu-bar-tray.js?v=5";

function syncToggle(
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

if(
!isMenuBarTrayPlatform()
){
host.innerHTML =
`<p class="app-settings-panel-lead">Системные настройки tray доступны в desktop-приложении Multichart на macOS.</p>`;
return {
refresh:()=>{}
};
}

host.innerHTML =
`
<p class="app-settings-panel-lead">Поведение иконки Multichart в строке меню macOS.</p>
<label class="app-settings-toggle-row">
<input type="checkbox" class="app-settings-toggle-input" id="app-settings-menu-bar-tray" />
<span class="app-settings-toggle-label">Показывать иконку в системном меню</span>
</label>
`;

const input =
host.querySelector(
"#app-settings-menu-bar-tray"
);

syncToggle(
input
);

input?.addEventListener(
"change",
()=>{

const enabled =
!!input?.checked;

setMenuBarTrayEnabled(
enabled
);
void applyDesktopMenuBarTrayPreference();

}
);

return {
refresh:()=>{
syncToggle(
input
);
}
};

}
