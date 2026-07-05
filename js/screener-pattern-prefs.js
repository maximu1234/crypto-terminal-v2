/**
 * Скринер: показ паттерна 1-2 1-2 на виджетах (дефолтные настройки).
 */
export const SCREENER_PATTERN_ENABLED_KEY =
"screener_pattern_12_enabled_v1";

export const SCREENER_PATTERN_PREF_EVENT =
"screener-pattern-pref-changed";

export function isScreenerPatternEnabled(){

try{
return (
localStorage.getItem(
SCREENER_PATTERN_ENABLED_KEY
) ===
"1"
);
}catch{
return false;
}

}

export function setScreenerPatternEnabled(
enabled
){

try{
localStorage.setItem(
SCREENER_PATTERN_ENABLED_KEY,
enabled
? "1"
: "0"
);
}catch{
/* ignore */
}

window.dispatchEvent(
new CustomEvent(
SCREENER_PATTERN_PREF_EVENT,
{
detail:{
enabled:
!!enabled
}
}
)
);

}
