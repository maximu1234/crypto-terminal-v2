import {
headerSettingsShellHtml
} from "./header-settings-shell.js?v=3";

import {
WEB_HEADER_NAV_ITEMS
} from "./site-header-nav-web.js?v=1";

import {
DESKTOP_HEADER_NAV_ITEMS
} from "./site-header-nav-desktop.js?v=2";

function isDesktopRuntime(){

if(
window.cryptoTerminalDesktop?.isDesktop
){
return true;
}

/* Electron desktop-shell доступен с первого кадра по UA. */
return /Electron\//i.test(
navigator.userAgent ||
""
);

}

function getNavItems(){

if(
isDesktopRuntime()
){
return DESKTOP_HEADER_NAV_ITEMS;
}

return WEB_HEADER_NAV_ITEMS;

}

function isActiveItem(
item
){

const path =
location.pathname ||
"";

return item.match.test(
path
);

}

export function buildHeaderNavHtml(){

const linksHtml =
getNavItems()
.map(
item=>{
const activeClass =
isActiveItem(item)
? ' class="active"'
: "";
return `<a href="${item.href}"${activeClass}>${item.label}</a>`;
}
)
.join("");

return (
linksHtml +
headerSettingsShellHtml()
);

}

export function renderHeaderNav(
nav
){

if(
!nav
){
return false;
}

const nextHtml =
buildHeaderNavHtml();

if(
nav.innerHTML !==
nextHtml
){
nav.innerHTML =
nextHtml;
}

nav.dataset.navReady =
"1";
return true;

}
