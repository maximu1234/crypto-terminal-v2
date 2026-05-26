const TERMINAL_MOBILE_MQ =
window.matchMedia(
"(max-width: 640px)"
);

function isTerminalMobile(){

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

void import("./auth-ui.js?v=17").then(m=>{
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

if(
!toggle ||
!backdrop
){
return;
}

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

export function initTerminalPageUi(){

bindTerminalMobileNav();

}

export {
isTerminalMobile,
TERMINAL_MOBILE_MQ
};
