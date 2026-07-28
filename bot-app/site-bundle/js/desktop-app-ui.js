/**
 * Desktop .app — подпись версии только на Главной (screener).
 */
import {
isScreenerPage
} from "./page-routes.js?v=2";

import {
mountReleaseMarker
} from "./release-marker.js?v=59";

export function initDesktopAppUi(){

if(
!window.cryptoTerminalDesktop?.isDesktop
){
return;
}

if(
!document.getElementById(
"desktop-app-css"
)
){
const link =
document.createElement(
"link"
);
link.id =
"desktop-app-css";
link.rel =
"stylesheet";
link.href =
"/css/desktop-app.css?v=2";
document.head.appendChild(
link
);
}

document.documentElement.classList.add(
"desktop-app-shell"
);

const stray =
document.getElementById(
"header-release-marker"
);

if(
stray
){
stray.remove();
}

if(
!isScreenerPage()
){
return;
}

mountReleaseMarker();

}
