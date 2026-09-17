/**
 * Boot страницы /algo-trading.html.
 */
import {
waitForSiteCssReady
} from "./site-css-gate.js?v=1";

import {
jsImport
} from "./asset-manifest.js?v=30";

import {
isAlgoBotLiteShell
} from "./page-routes.js?v=6";

import {
isAlgoTradingNavEnabled
} from "./desktop-feature-nav-prefs.js?v=5";

async function boot(){

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
const {
loadLightweightCharts
} =
await import(
jsImport(
"charts-lib-boot.js"
)
);
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
