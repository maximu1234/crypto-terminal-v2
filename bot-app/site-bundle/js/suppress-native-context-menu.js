/**
 * Блокирует стандартное браузерное меню (Save Image, Inspect…).
 * Кастомные меню (шкала, рисунки) сами вызывают preventDefault в своих обработчиках.
 * В верхней навигации ссылки оставляем нативное меню («Открыть в новой вкладке» и т.д.).
 */
const SITE_NAV_MENU_SELECTOR =
[
"nav.menu",
"nav.app-header-nav",
"#app-header-nav"
].join(
", "
);

function allowSiteNavContextMenu(
target
){

if(
!(
target instanceof Element
)
){
return false;
}

const navRoot =
target.closest(
SITE_NAV_MENU_SELECTOR
);

if(
navRoot &&
target.closest(
"a[href]"
)
){
return true;
}

return !!target.closest(
"header #logo, .app-page-header #logo"
);

}

export function initSuppressNativeContextMenu(){

document.addEventListener(
"contextmenu",
e=>{

const t =
e.target;

if(
t instanceof HTMLInputElement ||
t instanceof HTMLTextAreaElement ||
t instanceof HTMLSelectElement
){
return;
}

if(
t?.closest?.(
'input, textarea, select, [contenteditable="true"]'
)
){
return;
}

if(
allowSiteNavContextMenu(
t
)
){
return;
}

e.preventDefault();

},
{ capture:true }
);

}
