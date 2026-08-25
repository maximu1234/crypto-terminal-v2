import {
headerSettingsShellHtml
} from "./header-settings-shell.js?v=4";

import {
WEB_HEADER_NAV_ITEMS
} from "./site-header-nav-web.js?v=1";

import {
DESKTOP_HEADER_NAV_ITEMS
} from "./site-header-nav-desktop.js?v=2";

import {
isScriptNavEnabled,
isAlgoTradingNavEnabled
} from "./desktop-feature-nav-prefs.js?v=4";

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
!isDesktopRuntime()
){
return WEB_HEADER_NAV_ITEMS;
}

return DESKTOP_HEADER_NAV_ITEMS.filter(
item=>{

if(
item.href ===
"/script.html"
){
return isScriptNavEnabled();
}

if(
item.href ===
"/algo-trading.html"
){
return isAlgoTradingNavEnabled();
}

return true;

}
);

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

export function buildHeaderNavLinksHtml(){

return getNavItems()
.map(
item=>{
const activeClass =
isActiveItem(item)
? ' class="active"'
: "";
return `<a href="${item.href}"${activeClass}>${item.label}</a>`;
}
)
.join(
""
);

}

export function buildHeaderNavHtml(){

return (
buildHeaderNavLinksHtml() +
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

const linksHtml =
buildHeaderNavLinksHtml();
const wrapInNav =
nav.querySelector(
"#header-settings-wrap"
);
const wrapAnywhere =
document.getElementById(
"header-settings-wrap"
);

function refreshNavLinks(
beforeNode
){

const currentLinks =
[
...nav.querySelectorAll(
":scope > a"
)
].map(
a=>
a.outerHTML
).join(
""
);

if(
currentLinks ===
linksHtml
){
return;
}

for(
const a of
[
...nav.querySelectorAll(
":scope > a"
)
]
){
a.remove();
}

if(
beforeNode
){
beforeNode.insertAdjacentHTML(
"beforebegin",
linksHtml
);
return;
}

nav.insertAdjacentHTML(
"afterbegin",
linksHtml
);

}

/*
  Preserve the existing account shell. Algo Bot lite moves it to #topbar;
  replacing nav.innerHTML would clone a second #header-settings-wrap into
  the hidden #header — getElementById then toggles the invisible copy.
*/
if(
wrapInNav
){
refreshNavLinks(
wrapInNav
);
}else if(
wrapAnywhere
){
refreshNavLinks(
null
);
}else{
nav.innerHTML =
linksHtml +
headerSettingsShellHtml();
}

nav.dataset.navReady =
"1";
return true;

}
