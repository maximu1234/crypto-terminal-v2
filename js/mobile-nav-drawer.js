const MOBILE_NAV_MQ =
window.matchMedia(
"(max-width: 640px)"
);

export function isMobileNavViewport(){

return MOBILE_NAV_MQ.matches;

}

/**
 * На iPhone drawer внутри #header с transform даёт артефакты и блокирует тапы.
 * На узком экране переносим backdrop и panel в document.body.
 */
export function syncMobileNavDrawerMount(
opts
){

const header =
opts?.header;
const panel =
opts?.panel;
const backdrop =
opts?.backdrop;
const insertAfter =
opts?.insertAfter;
const mountKey =
opts?.mountKey ||
"data-nav-drawer-mounted";

if(
!header ||
!panel ||
!backdrop
){
return;
}

if(isMobileNavViewport()){

if(
panel.getAttribute(mountKey) ===
"body"
){
return;
}

document.body.appendChild(backdrop);
document.body.appendChild(panel);
panel.setAttribute(
mountKey,
"body"
);
return;

}

if(
panel.getAttribute(mountKey) !==
"body"
){
return;
}

const anchor =
insertAfter ||
header.querySelector(
".screener-mobile-bar, .site-mobile-bar, .coins-mobile-bar"
);

if(
anchor?.parentElement ===
header
){
anchor.insertAdjacentElement(
"afterend",
backdrop
);
backdrop.insertAdjacentElement(
"afterend",
panel
);
}else{
header.appendChild(backdrop);
header.appendChild(panel);
}

panel.removeAttribute(mountKey);

}

export function bindMobileNavDrawerLinks(
panel,
onClose
){

if(
!panel ||
typeof onClose !==
"function"
){
return;
}

panel.querySelectorAll(
"a[href]"
).forEach(link=>{

if(
link.dataset.navCloseBound ===
"1"
){
return;
}

link.dataset.navCloseBound =
"1";

link.addEventListener(
"click",
onClose
);

});

}
