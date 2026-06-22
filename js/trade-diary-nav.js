import {
isDesktopTradeDiaryContext,
isTradeDiaryOwner
} from "./trade-diary-access.js?v=1";

function isDiaryPage(){

return location.pathname.startsWith(
"/diary"
);

}

export async function initTradeDiaryNav(){

if(
!isDesktopTradeDiaryContext()
){
return;
}

if(
!await isTradeDiaryOwner()
){
return;
}

if(
document.getElementById(
"trade-diary-nav-link"
)
){
return;
}

const link =
document.createElement(
"a"
);

link.id =
"trade-diary-nav-link";
link.href =
"/diary/";
link.className =
"coins-diary-link trade-diary-nav-link";
link.textContent =
"Дневник";

if(
isDiaryPage()
){
link.classList.add(
"active"
);
}

if(
isDiaryPage()
){

const aside =
document.getElementById(
"trade-diary-header-aside"
);

if(
aside
){
aside.appendChild(
link
);
}

return;

}

const menu =
document.querySelector(
".coins-header-desktop"
);

if(
!menu
){
return;
}

const bybitWrap =
document.getElementById(
"trade-exchange-wrap"
);

if(
bybitWrap
){
bybitWrap.insertAdjacentElement(
"beforebegin",
link
);
return;
}

const btcLink =
menu.querySelector(
".coins-btc-d-link"
);

if(
btcLink
){
btcLink.insertAdjacentElement(
"afterend",
link
);
return;
}

menu.appendChild(
link
);

}
