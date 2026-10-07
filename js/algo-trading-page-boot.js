/**
 * Boot страницы /algo-trading.html.
 */
import {
waitForSiteCssReady
} from "./site-css-gate.js?v=1";

import {
jsImport
} from "./asset-manifest.js?v=54";

import {
isAlgoBotLiteShell
} from "./page-routes.js?v=7";

import {
isAlgoTradingNavEnabled
} from "./desktop-feature-nav-prefs.js?v=5";

import {
mountMoexUnavailableStub
} from "./exchanges/moex-readonly-stub.js?v=1";

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

try{
const {
dismissAppBootSplash
} =
await import(
"./app-boot-splash.js?v=2"
);
dismissAppBootSplash();
}catch{
/* optional */
}

if(
mountMoexUnavailableStub({
title:
"АлгоТрейдинг"
})
){
await import(
jsImport(
"site-boot.js"
)
);
return;
}

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
