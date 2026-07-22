/**
 * Desktop tray: menu bar (macOS) / notification area (Windows).
 * Prefs + синхронизация скрытия PnL. Позиции/PnL кормит main (menu-bar-tray-feed).
 */
import {
isMenuBarTrayEnabled,
MENU_BAR_TRAY_PREF_EVENT
} from "./desktop-menu-bar-tray-prefs.js?v=3";

import {
TOTAL_PNL_HIDDEN_KEY,
isTradePnlHidden
} from "./trade-pnl-privacy.js?v=1";

let traySyncTeardown =
null;
let applyingRemotePrivacy =
false;

function writeLocalPnlHidden(
hidden
){

try{

if(
hidden
){
localStorage.setItem(
TOTAL_PNL_HIDDEN_KEY,
"1"
);
}else{
localStorage.removeItem(
TOTAL_PNL_HIDDEN_KEY
);
}

window.dispatchEvent(
new CustomEvent(
"trade-total-pnl-visibility-changed"
)
);
}catch{
/* ignore */
}

}

async function pushPnlHiddenToMain(
hidden
){

const desktop =
window.cryptoTerminalDesktop;

if(
typeof desktop?.setMenuBarTrayPnlHidden !==
"function"
){
return;
}

try{
await desktop.setMenuBarTrayPnlHidden(
!!hidden
);
}catch{
/* ignore */
}

}

function stopDesktopMenuBarTraySync(){

if(
traySyncTeardown
){
traySyncTeardown();
traySyncTeardown =
null;
}

}

function startDesktopMenuBarTrayPrivacySync(){

const desktop =
window.cryptoTerminalDesktop;

if(
!desktop?.isDesktop ||
(
desktop.platform !==
"darwin" &&
desktop.platform !==
"win32"
)
){
return ()=>{};
}

const onVisibility =
()=>{

if(
applyingRemotePrivacy
){
return;
}

void pushPnlHiddenToMain(
isTradePnlHidden()
);

};

const onStorage =
e=>{

if(
e.key ===
TOTAL_PNL_HIDDEN_KEY
){
onVisibility();
}

};

let unsubRemote =
null;

if(
typeof desktop.onMenuBarTrayPnlPrivacyChanged ===
"function"
){
unsubRemote =
desktop.onMenuBarTrayPnlPrivacyChanged(
payload=>{
applyingRemotePrivacy =
true;

try{
writeLocalPnlHidden(
!!payload?.hidden
);
}finally{
applyingRemotePrivacy =
false;
}

}
);
}

window.addEventListener(
"trade-total-pnl-visibility-changed",
onVisibility
);

window.addEventListener(
"storage",
onStorage
);

void pushPnlHiddenToMain(
isTradePnlHidden()
);

return ()=>{
window.removeEventListener(
"trade-total-pnl-visibility-changed",
onVisibility
);
window.removeEventListener(
"storage",
onStorage
);
unsubRemote?.();
};

}

export async function applyDesktopMenuBarTrayPreference(){

stopDesktopMenuBarTraySync();

const desktop =
window.cryptoTerminalDesktop;

if(
!desktop?.isDesktop ||
(
desktop.platform !==
"darwin" &&
desktop.platform !==
"win32"
) ||
typeof desktop.setMenuBarTrayVisible !==
"function"
){
return;
}

const enabled =
isMenuBarTrayEnabled();

try{
await desktop.setMenuBarTrayVisible(
enabled
);
}catch{
/* ignore */
}

if(
enabled
){
traySyncTeardown =
startDesktopMenuBarTrayPrivacySync();
}

}

export function initDesktopMenuBarTray(){

void applyDesktopMenuBarTrayPreference();

const onPrefChanged =
()=>{
void applyDesktopMenuBarTrayPreference();
};

window.addEventListener(
MENU_BAR_TRAY_PREF_EVENT,
onPrefChanged
);

return ()=>{
window.removeEventListener(
MENU_BAR_TRAY_PREF_EVENT,
onPrefChanged
);
stopDesktopMenuBarTraySync();
};

}
