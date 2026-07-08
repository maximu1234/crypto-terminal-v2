import {
isDesktopTradeDiaryContext,
isTradeDiaryOwner
} from "./trade-diary-access.js?v=1";

function isDiaryPage(){

return location.pathname.startsWith(
"/diary"
);

}

function findDiaryNavHost(){

return null;

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
"header-settings-nav-item trade-diary-nav-link";
link.textContent =
"Дневник";

if(
isDiaryPage()
){
return;

}

const host = findDiaryNavHost();
if(host){
host.appendChild(link);
}

}
