/**
 * Выпадающее меню в шапке для простых страниц (алерты, листинги, калькулятор).
 */

import {
syncMobileNavDrawerMount,
bindMobileNavDrawerLinks
} from "./mobile-nav-drawer.js?v=1";

export function bindSiteMobileNav(
config = {}
){

const toggleId =
config.toggleId ||
"site-nav-toggle";

const backdropId =
config.backdropId ||
"site-nav-backdrop";

const panelId =
config.panelId ||
"site-nav-panel";

const openClass =
config.openClass ||
"screener-nav-open";

const toggle =
document.getElementById(
toggleId
);

const backdrop =
document.getElementById(
backdropId
);

const panel =
document.getElementById(
panelId
);

if(
!toggle ||
!backdrop
){
return;
}

const header =
panel?.closest(
".screener-page-header"
) ||
document.querySelector(
".screener-page-header"
);

function closeNav(){

document.body.classList.remove(
openClass
);

backdrop.classList.add(
"hidden"
);

toggle.setAttribute(
"aria-expanded",
"false"
);

}

function openNav(){

void import("./auth-ui.js?v=22").then(m=>{
m.closeCloudSettingsDropdown?.();
}).catch(()=>{});

document.body.classList.add(
openClass
);

backdrop.classList.remove(
"hidden"
);

toggle.setAttribute(
"aria-expanded",
"true"
);

}

function syncNavDrawer(){

syncMobileNavDrawerMount({
header,
panel,
backdrop,
insertAfter: header?.querySelector(
".site-mobile-bar, .screener-mobile-bar"
)
});

bindMobileNavDrawerLinks(
panel,
closeNav
);

}

syncNavDrawer();

window.matchMedia(
"(max-width: 640px)"
).addEventListener(
"change",
syncNavDrawer
);

toggle.addEventListener(
"click",
()=>{

if(
document.body.classList.contains(
openClass
)
){
closeNav();
}else{
openNav();
}

}
);

backdrop.addEventListener(
"click",
closeNav
);

document.addEventListener(
"keydown",
e=>{

if(
e.key === "Escape" &&
document.body.classList.contains(
openClass
)
){
closeNav();
}

}
);

}
