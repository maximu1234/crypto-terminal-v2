/**
 * Boot страницы /algo-trading.html.
 */
import {
waitForSiteCssReady
} from "./site-css-gate.js?v=2f1bf426";

import {
jsImport
} from "./asset-manifest.js?v=f555b953";

import {
isAlgoBotLiteShell
} from "./page-routes.js?v=4dc7f350";

import {
isAlgoTradingNavEnabled
} from "./desktop-feature-nav-prefs.js?v=0fd2425e";

import {
mountMoexUnavailableStub
} from "./exchanges/moex-readonly-stub.js?v=4606d3be";

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
"./app-boot-splash.js?v=6c280d61"
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
