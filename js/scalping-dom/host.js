/**
 * Runtime host for scalping DOM — created/removed without terminal.html changes.
 */
const ROOT_ID =
"scalping-dom-root";

const BODY_CLASS =
"scalping-dom-on";

const CSS_HREF_PREFIX =
"/css/scalping-dom.css";

export function ensureScalpingDomStylesheet(
href
){

if(
!href
){
return;
}

const existing =
document.querySelector(
`link[rel="stylesheet"][href^="${CSS_HREF_PREFIX}"]`
);

if(
existing
){
existing.remove();
}

const link =
document.createElement(
"link"
);
link.rel =
"stylesheet";
link.href =
href;
document.head.appendChild(
link
);

}

export function removeScalpingDomStylesheet(){

document.querySelectorAll(
`link[rel="stylesheet"][href^="${CSS_HREF_PREFIX}"]`
).forEach(
el=>
el.remove()
);

}

export function getScalpingDomRoot(){

return document.getElementById(
ROOT_ID
);

}

export function mountScalpingDomHost(){

const existing =
getScalpingDomRoot();

if(
existing
){
document.body.classList.add(
BODY_CLASS
);
return existing;
}

const pane =
document.querySelector(
".coins-chart-pane"
);
const panes =
document.getElementById(
"charts-stack-panes"
);

if(
!pane
){
return null;
}

const root =
document.createElement(
"aside"
);
root.id =
ROOT_ID;
root.className =
"scalping-dom-root";
root.setAttribute(
"aria-label",
"Стакан для скальпинга"
);

if(
panes &&
panes.parentElement ===
pane
){
panes.insertAdjacentElement(
"afterend",
root
);
}else{
pane.appendChild(
root
);
}

document.body.classList.add(
BODY_CLASS
);
return root;

}

export function unmountScalpingDomHost(){

const root =
getScalpingDomRoot();

if(
root
){
root.remove();
}

document.body.classList.remove(
BODY_CLASS
);

}
