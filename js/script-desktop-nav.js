/**
 * Пункт «Скрипт» в навигации — только desktop .app (как торговый блок).
 */
export function initScriptDesktopNav(){

const anchors =
document.querySelectorAll(
'a[href="/script.html"]'
);

if(
!window.cryptoTerminalDesktop?.isDesktop
){
anchors.forEach(
link=>{
link.remove();
}
);
return;
}

if(
anchors.length
){
return;
}

const statLinks =
document.querySelectorAll(
'a[href="/statistics.html"]'
);

const onScriptPage =
/^\/script(?:\.html)?\/?$/i.test(
location.pathname ||
""
);

statLinks.forEach(
statLink=>{

const host =
statLink.parentElement;

if(
!host
){
return;
}

const link =
document.createElement(
"a"
);
link.href =
"/script.html";
link.textContent =
"Скрипт";

if(
onScriptPage
){
link.className =
statLink.className;
if(
statLink.classList.contains(
"active"
)
){
statLink.classList.remove(
"active"
);
}
link.classList.add(
"active"
);
}else{
link.className =
statLink.className.replace(
/\bactive\b/g,
""
).trim();
}

statLink.insertAdjacentElement(
"afterend",
link
);

}
);

}
