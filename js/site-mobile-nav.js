/**
 * Выпадающее меню в шапке для простых страниц (алерты, листинги, калькулятор).
 */

export function bindSiteMobileNav(
config = {}
){

const toggleId =
config.toggleId ||
"site-nav-toggle";

const backdropId =
config.backdropId ||
"site-nav-backdrop";

const panelId =
config.panelId ||
"site-nav-panel";

const openClass =
config.openClass ||
"screener-nav-open";

const toggle =
document.getElementById(
toggleId
);

const backdrop =
document.getElementById(
backdropId
);

const panel =
document.getElementById(
panelId
);

if(
!toggle ||
!backdrop
){
return;
}

function closeNav(){

document.body.classList.remove(
openClass
);

backdrop.classList.add(
"hidden"
);

toggle.setAttribute(
"aria-expanded",
"false"
);

}

function openNav(){

document.body.classList.add(
openClass
);

backdrop.classList.remove(
"hidden"
);

toggle.setAttribute(
"aria-expanded",
"true"
);

}

toggle.addEventListener(
"click",
()=>{

if(
document.body.classList.contains(
openClass
)
){
closeNav();
}else{
openNav();
}

}
);

backdrop.addEventListener(
"click",
closeNav
);

panel?.querySelectorAll(
"a[href]"
).forEach(link=>{

link.addEventListener(
"click",
closeNav
);

});

document.addEventListener(
"keydown",
e=>{

if(
e.key === "Escape" &&
document.body.classList.contains(
openClass
)
){
closeNav();
}

}
);

}
