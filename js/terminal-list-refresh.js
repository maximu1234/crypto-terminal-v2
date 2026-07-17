/**
 * Авторефresh списка монет на /coins — интервал опроса tickers.
 */
import {
readCoinsPrefs,
writeCoinsPrefs,
normalizeListRefreshMs
} from "./terminal/terminal-prefs.js?v=19";

import {
setTickerPollInterval
} from "./tickers.js?v=23";

export const COINS_LIST_REFRESH_OPTIONS =
[
{
ms:
10000,
label:
"10 сек"
},
{
ms:
60000,
label:
"1 мин"
},
{
ms:
0,
label:
"Никогда"
}
];

export function applyCoinsListRefreshInterval(){

const prefs =
readCoinsPrefs();
const ms =
normalizeListRefreshMs(
prefs.listRefreshMs
);

setTickerPollInterval(
ms
);

return ms;

}

export function mountCoinsListRefreshControls(){

const root =
document.getElementById(
"coins-list-refresh"
);

if(
!root
){
return null;
}

function syncActive(
ms
){

root.querySelectorAll(
"[data-refresh-ms]"
).forEach(
btn=>{
btn.classList.toggle(
"active",
Number(
btn.dataset.refreshMs
) ===
ms
);
}
);

}

const activeMs =
applyCoinsListRefreshInterval();

syncActive(
activeMs
);

root.addEventListener(
"click",
event=>{

const btn =
event.target.closest(
"[data-refresh-ms]"
);

if(
!btn
){
return;
}

event.preventDefault();

const ms =
normalizeListRefreshMs(
Number(
btn.dataset.refreshMs
)
);

const prefs =
readCoinsPrefs();

prefs.listRefreshMs =
ms;
writeCoinsPrefs(
prefs
);
setTickerPollInterval(
ms
);
syncActive(
ms
);

}
);

return {
apply:
applyCoinsListRefreshInterval
};

}
