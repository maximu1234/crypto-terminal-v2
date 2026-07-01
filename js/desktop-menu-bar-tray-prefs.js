/**
 * Настройка видимости иконки tray (macOS menu bar).
 */
export const MENU_BAR_TRAY_ENABLED_KEY =
"desktop_menu_bar_tray_enabled_v1";

export const MENU_BAR_TRAY_PREF_EVENT =
"desktop-menu-bar-tray-pref-changed";

export function isMenuBarTrayPlatform(){

return (
!!window.cryptoTerminalDesktop?.isDesktop &&
window.cryptoTerminalDesktop.platform ===
"darwin"
);

}

export function isMenuBarTrayEnabled(){

if(
!isMenuBarTrayPlatform()
){
return false;
}

try{
const raw =
localStorage.getItem(
MENU_BAR_TRAY_ENABLED_KEY
);

if(
raw ==
null
){
return true;
}

return raw ===
"1";
}catch{
return true;
}

}

export function setMenuBarTrayEnabled(
enabled
){

try{
localStorage.setItem(
MENU_BAR_TRAY_ENABLED_KEY,
enabled
? "1"
: "0"
);
}catch{
/* ignore */
}

window.dispatchEvent(
new CustomEvent(
MENU_BAR_TRAY_PREF_EVENT,
{
detail:{
enabled:
!!enabled
}
}
)
);

}
