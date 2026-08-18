/**
 * Boot страницы /script.html
 */
import {
waitForSiteCssReady
} from "./site-css-gate.js?v=1";

import {
loadLightweightCharts
} from "./charts-lib-boot.js?v=3";

import {
jsImport
} from "./asset-manifest.js?v=5";

import {
mountScriptPage
} from "./script-page.js?v=50";

import {
isScriptNavEnabled
} from "./desktop-feature-nav-prefs.js?v=4";

async function boot(){

if(
!window.cryptoTerminalDesktop?.isDesktop
){
location.replace(
"/screener.html"
);
return;
}

if(
!isScriptNavEnabled()
){
location.replace(
"/screener.html"
);
return;
}

await waitForSiteCssReady();
await loadLightweightCharts();

await import(
jsImport(
"site-boot.js"
)
);

mountScriptPage();

}

boot().catch(
err=>{
console.error(
"[script boot] failed:",
err
);
}
);
