import {
getWidgetToolbarHtml,
initWidgetDrawToolsDropdown
} from "./dashboard-draw-ui.js?v=2";

const COINS_MOBILE_MQ =
window.matchMedia(
"(max-width: 640px)"
);

const TF_LABELS = {
"1": "1m",
"5": "5m",
"15": "15m",
"60": "1h",
"240": "4h",
"D": "1D"
};

let tfChangeHandler = null;
let getTfFn = ()=> "60";

export function isCoinsMobile(){

return COINS_MOBILE_MQ.matches;

}

export function initCoinsMobileUi(
opts = {}
){

getTfFn =
opts.getTf ||
getTfFn;

tfChangeHandler =
opts.onTfChange ||
tfChangeHandler;

mountMobileDrawTools();
bindCoinsNav();
bindCoinsTfPicker();
syncCoinsTfLabel(
getTfFn()
);

COINS_MOBILE_MQ.addEventListener(
"change",
()=>{
mountMobileDrawTools();
}
);

}

export function syncCoinsTfLabel(
tf
){

const label =
document.getElementById(
"coins-tf-label"
);

if(label){
label.textContent =
TF_LABELS[tf] ||
tf ||
"1h";
}

document.querySelectorAll(
"#coins-tf-menu .screener-mobile-menu-item"
).forEach(btn=>{
btn.classList.toggle(
"active",
btn.dataset.tf === tf
);
});

}

function mountMobileDrawTools(){

const mount =
document.getElementById(
"coins-draw-tools-mount"
);

if(
!mount ||
!isCoinsMobile()
){
if(mount){
mount.innerHTML = "";
}

return;
}

if(
mount.querySelector(
".widget-draw-tools"
)
){
return;
}

mount.innerHTML =
getWidgetToolbarHtml();

initWidgetDrawToolsDropdown(
mount.querySelector(
".widget-draw-tools"
)
);

}

function closeCoinsPickers(){

document.querySelectorAll(
"#coins-tf-menu"
).forEach(menu=>{
menu.classList.add("hidden");
});

document.getElementById(
"coins-tf-trigger"
)?.setAttribute(
"aria-expanded",
"false"
);

}

function closeCoinsNav(){

document.body.classList.remove(
"coins-nav-open"
);

document.getElementById(
"coins-nav-backdrop"
)?.classList.add(
"hidden"
);

document.getElementById(
"coins-nav-toggle"
)?.setAttribute(
"aria-expanded",
"false"
);

}

function openCoinsNav(){

void import("./auth-ui.js?v=18").then(m=>{
m.closeCloudSettingsDropdown?.();
}).catch(()=>{});

document.body.classList.add(
"coins-nav-open"
);

document.getElementById(
"coins-nav-backdrop"
)?.classList.remove(
"hidden"
);

document.getElementById(
"coins-nav-toggle"
)?.setAttribute(
"aria-expanded",
"true"
);

closeCoinsPickers();

}

function bindCoinsNav(){

const toggle =
document.getElementById(
"coins-nav-toggle"
);
const backdrop =
document.getElementById(
"coins-nav-backdrop"
);
const panel =
document.getElementById(
"coins-nav-panel"
);
const header =
document.querySelector(
".coins-page-header"
);

if(
!toggle ||
!backdrop
){
return;
}

void import("./mobile-nav-drawer.js?v=1").then(m=>{

m.syncMobileNavDrawerMount({
header,
panel,
backdrop,
insertAfter: document.querySelector(
".coins-mobile-bar"
)
});

m.bindMobileNavDrawerLinks(
panel,
closeCoinsNav
);

window.matchMedia(
"(max-width: 640px)"
).addEventListener(
"change",
()=>{
m.syncMobileNavDrawerMount({
header,
panel,
backdrop,
insertAfter: document.querySelector(
".coins-mobile-bar"
)
});
}
);

}).catch(()=>{});

toggle.addEventListener(
"click",
e=>{
e.stopPropagation();

if(
document.body.classList.contains(
"coins-nav-open"
)
){
closeCoinsNav();
}else{
openCoinsNav();
}

}
);

backdrop.addEventListener(
"click",
()=>{
closeCoinsNav();
}
);

document.addEventListener(
"click",
e=>{

if(
e.target.closest(
"#coins-nav-panel"
) ||
e.target.closest(
"#coins-nav-toggle"
)
){
return;
}

closeCoinsNav();

if(
!e.target.closest(
".coins-tf-mobile-wrap"
)
){
closeCoinsPickers();
}

}
);

document.addEventListener(
"keydown",
e=>{

if(e.key === "Escape"){
closeCoinsNav();
closeCoinsPickers();
}

}
);

}

function bindCoinsTfPicker(){

const trigger =
document.getElementById(
"coins-tf-trigger"
);
const menu =
document.getElementById(
"coins-tf-menu"
);

if(
!trigger ||
!menu
){
return;
}

trigger.addEventListener(
"click",
e=>{
e.stopPropagation();

const open =
!menu.classList.contains(
"hidden"
);

closeCoinsPickers();
closeCoinsNav();

if(open){
return;
}

menu.classList.remove(
"hidden"
);
trigger.setAttribute(
"aria-expanded",
"true"
);

}
);

menu.querySelectorAll(
".screener-mobile-menu-item"
).forEach(btn=>{

btn.addEventListener(
"click",
async()=>{

const tf =
btn.dataset.tf;

if(
!tf ||
tf === getTfFn()
){
closeCoinsPickers();
return;
}

closeCoinsPickers();

if(tfChangeHandler){
await tfChangeHandler(tf);
}

syncCoinsTfLabel(tf);

}
);

});

}
