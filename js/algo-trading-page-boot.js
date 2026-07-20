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
} from "./asset-manifest.js?v=2";

import {
mountAlgoTradingPage
} from "./algo-trading.js?v=33";

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

mountAlgoTradingPage();

}

boot().catch(
err=>{
console.error(
"[algo-trading boot] failed:",
err
);
}
);
