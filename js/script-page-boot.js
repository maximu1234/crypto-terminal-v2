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
} from "./asset-manifest.js?v=2";

import {
mountScriptPage
} from "./script-page.js?v=47";

async function boot(){

if(
!window.cryptoTerminalDesktop?.isDesktop
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
