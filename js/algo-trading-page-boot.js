/**
 * Boot страницы /algo-trading.html — desktop only.
 */
import {
waitForSiteCssReady
} from "./site-css-gate.js?v=1";

import {
loadLightweightCharts
} from "./charts-lib-boot.js?v=3";

import {
jsImport
} from "./asset-manifest.js?v=6";

import {
isAlgoBotLiteShell
} from "./page-routes.js?v=5";

import {
isAlgoTradingNavEnabled
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
!isAlgoBotLiteShell() &&
!isAlgoTradingNavEnabled()
){
location.replace(
"/screener.html"
);
return;
}

await waitForSiteCssReady();

if(
!isAlgoBotLiteShell()
){
await loadLightweightCharts();
}

await import(
jsImport(
"site-boot.js"
)
);

const {
mountAlgoTradingPage
} =
await import(
jsImport(
"algo-trading.js"
)
);

await mountAlgoTradingPage();

}

boot().catch(
err=>{
console.error(
"[algo-trading boot] failed:",
err
);
}
);
