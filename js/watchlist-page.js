const TERMINAL_MOBILE_MQ =
window.matchMedia(
"(max-width: 640px)"
);

function isWatchlistMobile(){

return TERMINAL_MOBILE_MQ.matches;

}

function closeTerminalNav(){

document.body.classList.remove(
"screener-nav-open"
);

document.getElementById(
"screener-nav-backdrop"
)?.classList.add(
"hidden"
);

document.getElementById(
"screener-nav-toggle"
)?.setAttribute(
"aria-expanded",
"false"
);

}

function openTerminalNav(){

void import("./auth-ui.js?v=35").then(m=>{
m.closeCloudSettingsDropdown?.();
}).catch(()=>{});

document.body.classList.add(
"screener-nav-open"
);

document.getElementById(
"screener-nav-backdrop"
)?.classList.remove(
"hidden"
);

document.getElementById(
"screener-nav-toggle"
)?.setAttribute(
"aria-expanded",
"true"
);

}

function bindTerminalMobileNav(){

const toggle =
document.getElementById(
"screener-nav-toggle"
);
const backdrop =
document.getElementById(
"screener-nav-backdrop"
);
const panel =
document.getElementById(
"screener-nav-panel"
);
const header =
document.getElementById(
"header"
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
insertAfter: document.getElementById(
"screener-mobile-bar"
)
});

m.bindMobileNavDrawerLinks(
panel,
closeTerminalNav
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
insertAfter: document.getElementById(
"screener-mobile-bar"
)
});
}
);

}).catch(()=>{});

toggle.addEventListener(
"click",
()=>{

if(
document.body.classList.contains(
"screener-nav-open"
)
){
closeTerminalNav();
}else{
openTerminalNav();
}

}
);

backdrop.addEventListener(
"click",
closeTerminalNav
);

}

export function initWatchlistPageUi(){

bindTerminalMobileNav();

}

export {
isWatchlistMobile,
TERMINAL_MOBILE_MQ
};
