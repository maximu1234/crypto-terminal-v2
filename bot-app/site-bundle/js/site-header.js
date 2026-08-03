/**
 * Единая шапка сайта: одна разметка, одни селекторы, одна логика на всех страницах.
 */
import {
ensureHeaderSettingsShell
} from "./header-settings-shell.js?v=4";

import {
mountScriptTerminalStatus
} from "./script-terminal-status.js?v=7";

import {
renderHeaderNav
} from "./site-header-nav.js?v=7";

export const APP_HEADER_NAV_ID =
"app-header-nav";

const LEGACY_NAV_SELECTOR =
[
"#screener-nav-panel",
"#site-nav-panel",
"#script-nav-panel",
".screener-nav-panel",
".coins-header-desktop",
"nav.menu"
].join(
", "
);

export function findAppHeaderNav(
header =
document.getElementById(
"header"
)
){

if(
!header
){
return null;
}

return (
header.querySelector(
`#${APP_HEADER_NAV_ID}`
) ||
header.querySelector(
".app-header-nav"
)
);

}

export function normalizeAppHeaderMarkup(){

document.querySelectorAll(
"#header"
).forEach(
header=>{

header.classList.remove(
"screener-page-header",
"coins-page-header"
);

header.classList.add(
"app-page-header"
);

const nav =
header.querySelector(
LEGACY_NAV_SELECTOR
);

if(
!nav
){
return;
}

nav.classList.remove(
"screener-nav-panel",
"coins-header-desktop"
);
nav.classList.add(
"menu",
"app-header-nav"
);
nav.id =
APP_HEADER_NAV_ID;
renderHeaderNav(
nav
);

}
);

}

function initDesktopHeaderLayout(){

if(
!window.cryptoTerminalDesktop?.isDesktop
){
return;
}

document.querySelectorAll(
"#header"
).forEach(
header=>{

if(
header.dataset.threeCellsReady ===
"1"
){
return;
}

const nav =
findAppHeaderNav(
header
);

if(
!nav
){
return;
}

let rightCell =
header.querySelector(
"#header-controls"
);

if(
!rightCell
){
rightCell =
document.createElement(
"div"
);
rightCell.id =
"header-controls";
rightCell.className =
"header-right-controls";
header.appendChild(
rightCell
);
}

let mainCell =
header.querySelector(
".header-main-cell"
);

if(
!mainCell
){
mainCell =
document.createElement(
"div"
);
mainCell.className =
"header-main-cell";
header.insertBefore(
mainCell,
header.firstChild
);
}

const logo =
header.querySelector(
"#logo"
);

if(
logo &&
logo.parentElement !==
mainCell
){
mainCell.appendChild(
logo
);
}

if(
nav.parentElement !==
mainCell
){
mainCell.appendChild(
nav
);
}

let statusCell =
header.querySelector(
".header-status-cell"
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
}

if(
rightCell.parentElement ===
header
){
header.insertBefore(
statusCell,
rightCell
);
}else if(
statusCell.parentElement !==
header
){
header.appendChild(
statusCell
);
}

const scriptStatus =
header.querySelector(
"#script-terminal-status"
);

if(
scriptStatus &&
scriptStatus.parentElement !==
statusCell
){
statusCell.appendChild(
scriptStatus
);
}

const layoutPicker =
mainCell.querySelector(
".coins-layout-picker-wrap"
);

if(
layoutPicker &&
layoutPicker.parentElement !==
rightCell
){
rightCell.appendChild(
layoutPicker
);
}

header.classList.add(
"header-three-cells"
);
header.dataset.threeCellsReady =
"1";

}
);

}

export function initSiteHeader(){

normalizeAppHeaderMarkup();
ensureHeaderSettingsShell();
initDesktopHeaderLayout();

if(
window.cryptoTerminalDesktop?.isDesktop
){
mountScriptTerminalStatus();
}

}

export function enforceSiteHeaderAfterBoot(){

if(
!window.cryptoTerminalDesktop?.isDesktop
){
normalizeAppHeaderMarkup();
ensureHeaderSettingsShell();
return;
}

const run = ()=>{
initSiteHeader();
};

requestAnimationFrame(
run
);
setTimeout(
run,
0
);
setTimeout(
run,
100
);
setTimeout(
run,
300
);

}
