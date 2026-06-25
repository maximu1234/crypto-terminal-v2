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

const dropdown =
document.getElementById(
"header-settings-dropdown"
);

if(dropdown){
return dropdown;
}

return document.querySelector(
"#coins-nav-panel .coins-nav-settings"
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
"header-settings-system-link trade-diary-nav-link";
link.textContent =
"Дневник";

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
const asideLink =
link.cloneNode(
true
);
asideLink.className =
"coins-diary-link trade-diary-nav-link active";
aside.appendChild(
asideLink
);
}

return;

}

const host =
findDiaryNavHost();

if(
!host
){
return;
}

const bybitEntry =
host.querySelector(
"#trade-exchange-wrap"
);
const systemLink =
host.querySelector(
"[data-system-admin-link]"
);

if(
bybitEntry
){
bybitEntry.insertAdjacentElement(
"afterend",
link
);
return;
}

if(
systemLink
){
systemLink.insertAdjacentElement(
"beforebegin",
link
);
return;
}

host.appendChild(
link
);

}
