/**
 * Видимость пунктов «Скрипт» и «АлгоТрейдинг» в верхнем меню (desktop).
 * По умолчанию оба выключены — первый запуск без этих пунктов.
 */
export const SCRIPT_NAV_ENABLED_KEY =
"desktop_script_nav_enabled_v1";

export const ALGO_TRADING_NAV_ENABLED_KEY =
"desktop_algo_trading_nav_enabled_v1";

export const FEATURE_NAV_PREF_EVENT =
"desktop-feature-nav-pref-changed";

function isDesktopShell(){

return !!window.cryptoTerminalDesktop?.isDesktop ||
/Electron\//i.test(
navigator.userAgent ||
""
);

}

function readFlag(
key
){

if(
!isDesktopShell()
){
return false;
}

try{
const raw =
localStorage.getItem(
key
);

if(
raw ==
null
){
return false;
}

return raw ===
"1";
}catch{
return false;
}

}

function writeFlag(
key,
enabled,
feature
){

try{
localStorage.setItem(
key,
enabled
? "1"
: "0"
);
}catch{
/* ignore */
}

window.dispatchEvent(
new CustomEvent(
FEATURE_NAV_PREF_EVENT,
{
detail:{
feature,
enabled:
!!enabled
}
}
)
);

}

export function isScriptNavEnabled(){

return readFlag(
SCRIPT_NAV_ENABLED_KEY
);

}

export function isAlgoTradingNavEnabled(){

return readFlag(
ALGO_TRADING_NAV_ENABLED_KEY
);

}

export function setScriptNavEnabled(
enabled
){

writeFlag(
SCRIPT_NAV_ENABLED_KEY,
enabled,
"script"
);

}

export function setAlgoTradingNavEnabled(
enabled
){

writeFlag(
ALGO_TRADING_NAV_ENABLED_KEY,
enabled,
"algo-trading"
);

}
