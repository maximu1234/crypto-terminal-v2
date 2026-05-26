const MOBILE_RECOVERY_MQ =
window.matchMedia(
"(max-width: 640px)"
);

function isMobileRecoveryViewport(){

return MOBILE_RECOVERY_MQ.matches;

}

/** Safari bfcache: вкладка «оживает» без перезапуска JS — часто ломает WS и графики. */
function bindBfcacheReload(){

window.addEventListener(
"pageshow",
e=>{

if(
!e.persisted ||
!isMobileRecoveryViewport()
){
return;
}

location.reload();

}
);

}

function bindStallGuard(){

const check =
()=>{

if(!isMobileRecoveryViewport()){
return;
}

const path =
window.location.pathname;

const grid =
document.getElementById(
"screener-grid"
) ||
document.getElementById(
"dashboard"
);

if(
!grid
){
return;
}

const hasWidget =
!!grid.querySelector(
".screener-widget, .widget"
);

if(hasWidget){
return;
}

const status =
document.getElementById(
"screener-status"
);

const statusVisible =
status &&
!status.classList.contains(
"hidden"
) &&
status.textContent.trim();

if(statusVisible){
return;
}

let banner =
document.getElementById(
"mobile-stall-banner"
);

if(banner){
return;
}

banner = document.createElement("div");
banner.id = "mobile-stall-banner";
banner.setAttribute(
"role",
"alert"
);

const label =
path.includes(
"terminal"
)
? "терминал"
: "графики";

banner.innerHTML = `
<p>Не удалось загрузить ${label}. Часто помогает обновление страницы.</p>
<button type="button" id="mobile-stall-retry">Обновить</button>
`;

document.body.appendChild(banner);

document.getElementById(
"mobile-stall-retry"
)?.addEventListener(
"click",
()=>{
location.reload();
},
{ once: true }
);

};

window.setTimeout(
check,
22000
);

}

export function initMobileRecovery(){

bindBfcacheReload();
bindStallGuard();

}
