/**
 * Пункт меню «Торговля» — только desktop .app (не на сайте Vercel).
 */
export function initDesktopTradeNav(){

if(
!window.cryptoTerminalDesktop?.isDesktop
){
return;
}

const path =
location.pathname ||
"";
const isTradeActive =
/\/trade(\.html)?\/?$/i.test(
path
);

function makeLink(
slot
){

const a =
document.createElement(
"a"
);
a.href =
"/trade.html";
a.dataset.desktopTradeNav =
slot;
a.textContent =
"Торговля";

if(
isTradeActive
){
a.classList.add(
"active"
);

}

return a;

}

const coinsDesktop =
document.querySelector(
".coins-header-desktop"
);

if(
coinsDesktop
){

const gear =
coinsDesktop.querySelector(
"#header-settings-wrap"
);

if(
gear &&
!coinsDesktop.querySelector(
'[data-desktop-trade-nav="desktop"]'
)
){
gear.insertAdjacentElement(
"afterend",
makeLink(
"desktop"
)
);
}

const mobilePanel =
document.getElementById(
"coins-nav-panel"
);

if(
mobilePanel &&
!mobilePanel.querySelector(
'[data-desktop-trade-nav="mobile"]'
)
){

const settings =
mobilePanel.querySelector(
".coins-nav-settings"
);
const link =
makeLink(
"mobile"
);

if(
settings
){
settings.insertAdjacentElement(
"beforebegin",
link
);
}else{
mobilePanel.appendChild(
link
);
}

}

return;

}

if(
document.querySelector(
'[data-desktop-trade-nav="desktop"]'
)
){
return;
}

const nav =
document.querySelector(
"#screener-nav-panel, #site-nav-panel, nav.menu.screener-nav-panel"
);

if(
!nav
){
return;
}

const gear =
nav.querySelector(
"#header-settings-wrap"
);
const link =
makeLink(
"desktop"
);

if(
gear
){
gear.insertAdjacentElement(
"afterend",
link
);
}else{
nav.appendChild(
link
);

}

}
