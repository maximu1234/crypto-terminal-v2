/**
 * Пункт «Торговля» — только desktop .app, только широкая шапка (.coins-header-desktop).
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

if(
document.querySelector(
'[data-desktop-trade-nav]'
)
){
return;
}

const coinsDesktop =
document.querySelector(
".coins-header-desktop"
);

if(
!coinsDesktop
){
return;
}

const gear =
coinsDesktop.querySelector(
"#header-settings-wrap"
);

const link =
document.createElement(
"a"
);
link.href =
"/trade.html";
link.dataset.desktopTradeNav =
"desktop";
link.textContent =
"Торговля";

if(
isTradeActive
){
link.classList.add(
"active"
);
}

if(
gear
){
gear.insertAdjacentElement(
"afterend",
link
);
}else{
coinsDesktop.appendChild(
link
);
}

}
