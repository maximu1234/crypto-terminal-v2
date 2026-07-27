/**
 * Настройка видимости иконки tray (macOS menu bar / Windows notification area)
 * и автозапуска агента.
 */
export const MENU_BAR_TRAY_ENABLED_KEY =
"desktop_menu_bar_tray_enabled_v1";

export const MENU_BAR_TRAY_PREF_EVENT =
"desktop-menu-bar-tray-pref-changed";

export const LAUNCH_AGENT_AT_LOGIN_KEY =
"desktop_launch_agent_at_login_v1";

export const LAUNCH_AGENT_PREF_EVENT =
"desktop-launch-agent-pref-changed";

export function isMenuBarTrayPlatform(){

const platform =
window.cryptoTerminalDesktop?.platform;

return (
!!window.cryptoTerminalDesktop?.isDesktop &&
(
platform ===
"darwin" ||
platform ===
"win32"
)
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

if(
!enabled
){
try{
localStorage.setItem(
LAUNCH_AGENT_AT_LOGIN_KEY,
"0"
);
}catch{
/* ignore */
}

window.dispatchEvent(
new CustomEvent(
LAUNCH_AGENT_PREF_EVENT,
{
detail:{
enabled:
false
}
}
)
);
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

export function isLaunchAgentAtLoginEnabled(){

if(
!isMenuBarTrayPlatform()
){
return false;
}

try{
return (
localStorage.getItem(
LAUNCH_AGENT_AT_LOGIN_KEY
) ===
"1"
);
}catch{
return false;
}

}

export function setLaunchAgentAtLoginLocal(
enabled
){

try{
localStorage.setItem(
LAUNCH_AGENT_AT_LOGIN_KEY,
enabled
? "1"
: "0"
);
}catch{
/* ignore */
}

if(
enabled
){
try{
localStorage.setItem(
MENU_BAR_TRAY_ENABLED_KEY,
"1"
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
true
}
}
)
);
}

window.dispatchEvent(
new CustomEvent(
LAUNCH_AGENT_PREF_EVENT,
{
detail:{
enabled:
!!enabled
}
}
)
);

}
