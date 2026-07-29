/**
 * Терминал (desktop): компактный статус авто-скана паттерна в шапке.
 * Скрыт, если в Системных настройках выключен пункт «Скрипт».
 */
import {
getScriptScanNextRunAt,
isScriptScanBackgroundRunning,
SCRIPT_SCAN_BG_EVENT
} from "./script-scan-background.js?v=14";

import {
loadScriptPageState
} from "./script-page-storage.js?v=14";

import {
isTerminalPage
} from "./page-routes.js?v=3";

import {
FEATURE_NAV_PREF_EVENT,
isScriptNavEnabled
} from "./desktop-feature-nav-prefs.js?v=2";

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

function findStatusHost(){

const header =
document.getElementById(
"header"
);

if(
!header
){
return null;
}

let statusCell =
header.querySelector(
".header-status-cell"
) ||
header.querySelector(
"#header-status-cell"
);

if(
!statusCell
){
statusCell =
document.createElement(
"div"
);
statusCell.className =
"header-status-cell";
statusCell.id =
"header-status-cell";

const rightCell =
header.querySelector(
"#header-controls"
);

if(
rightCell?.parentElement ===
header
){
header.insertBefore(
statusCell,
rightCell
);
}else{
header.appendChild(
statusCell
);
}

}

return statusCell;

}

function unmountScriptTerminalStatus(){

const existing =
document.getElementById(
"script-terminal-status"
);

if(
!existing
){
return;
}

if(
existing.__scriptStatusTimerId
){
clearInterval(
existing.__scriptStatusTimerId
);
existing.__scriptStatusTimerId =
null;
}

if(
existing.__scriptStatusOnBg
){
window.removeEventListener(
SCRIPT_SCAN_BG_EVENT,
existing.__scriptStatusOnBg
);
existing.__scriptStatusOnBg =
null;
}

existing.remove();

}

export function mountScriptTerminalStatus(){

if(
!window.cryptoTerminalDesktop?.isDesktop ||
!isTerminalPage()
){
return null;
}

if(
!isScriptNavEnabled()
){
unmountScriptTerminalStatus();
return null;
}

const host =
findStatusHost();

if(
!host
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

if(
existing.parentElement !==
host
){
host.appendChild(
existing
);
}

return existing;
}

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

host.appendChild(
el
);

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

el.classList.add(
"is-active"
);

if(
isScriptScanBackgroundRunning()
){
el.textContent =
"Скрипт: сканирование…";
return;
}

const left =
getScriptScanNextRunAt() -
Date.now();

el.textContent =
`Скрипт: активен · след. запуск через ${formatCountdown(left)}`;

}

render();

if(
!el.__scriptStatusTimerId
){
el.__scriptStatusTimerId =
setInterval(
render,
1000
);

el.__scriptStatusOnBg =
render;

window.addEventListener(
SCRIPT_SCAN_BG_EVENT,
render
);
}

return el;

}

let prefListenerBound =
false;

function ensureFeatureNavPrefListener(){

if(
prefListenerBound
){
return;
}

prefListenerBound =
true;

window.addEventListener(
FEATURE_NAV_PREF_EVENT,
()=>{
mountScriptTerminalStatus();
}
);

}

ensureFeatureNavPrefListener();
