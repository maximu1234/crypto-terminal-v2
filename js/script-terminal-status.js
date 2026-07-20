/**
 * Терминал (desktop): компактный статус авто-скана паттерна в шапке.
 */
import {
getScriptScanNextRunAt,
SCRIPT_SCAN_BG_EVENT
} from "./script-scan-background.js?v=13";

import {
loadScriptPageState
} from "./script-page-storage.js?v=13";

function formatCountdown(
ms
){

const totalSec =
Math.max(
0,
Math.ceil(
ms /
1000
)
);
const h =
Math.floor(
totalSec /
3600
);
const m =
Math.floor(
totalSec %
3600 /
60
);
const s =
totalSec %
60;

if(
h >
0
){
return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

if(
m >
0
){
return `${m}:${String(s).padStart(2, "0")}`;
}

return `${s} сек`;

}

export function mountScriptTerminalStatus(){

if(
!window.cryptoTerminalDesktop?.isDesktop
){
return null;
}

const nav =
document.querySelector(
".coins-header-desktop"
);

if(
!nav
){
return null;
}

const existing =
document.getElementById(
"script-terminal-status"
);

if(
existing
){
return existing;
}

const anchor =
nav.querySelector(
".coins-layout-picker-wrap"
) ||
nav.querySelector(
"#header-settings-wrap"
);

const el =
document.createElement(
"span"
);

el.id =
"script-terminal-status";
el.className =
"script-terminal-status";
el.setAttribute(
"aria-live",
"polite"
);

if(
anchor
){
nav.insertBefore(
el,
anchor
);
}else{
nav.appendChild(
el
);
}

function render(){

const state =
loadScriptPageState();

if(
!state.auto.active
){
el.textContent =
"Скрипт: выключен";
el.classList.remove(
"is-active"
);
return;
}

const left =
getScriptScanNextRunAt() -
Date.now();

el.classList.add(
"is-active"
);
el.textContent =
`Скрипт: активен · след. запуск через ${formatCountdown(left)}`;

}

render();

const timerId =
setInterval(
render,
1000
);

window.addEventListener(
SCRIPT_SCAN_BG_EVENT,
render
);

el.__scriptStatusTimerId =
timerId;

return el;

}
