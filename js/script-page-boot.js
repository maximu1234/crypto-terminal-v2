/**
 * Boot страницы /script.html
 */
import {
waitForSiteCssReady
} from "./site-css-gate.js?v=2f1bf426";

import {
loadLightweightCharts
} from "./charts-lib-boot.js?v=04885614";

import {
jsImport
} from "./asset-manifest.js?v=e2998454";

import {
isScriptNavEnabled
} from "./desktop-feature-nav-prefs.js?v=0fd2425e";

import {
mountMoexUnavailableStub
} from "./exchanges/moex-readonly-stub.js?v=4606d3be";

async function boot(){

if(
!isScriptNavEnabled()
){
location.replace(
"/screener.html"
);
return;
}

await waitForSiteCssReady();

if(
mountMoexUnavailableStub({
title:
"Скрипт"
})
){
await import(
jsImport(
"site-boot.js"
)
);
return;
}

await loadLightweightCharts();

await import(
jsImport(
"site-boot.js"
)
);

const {
mountScriptPage
} =
await import(
jsImport(
"script-page.js"
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
