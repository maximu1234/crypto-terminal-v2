/**
 * Загрузка /trade — только Multichart.app; на сайте редирект на /coins.
 */
import {
waitForSiteCssReady
} from "./site-css-gate.js?v=1";

import {
loadLightweightCharts
} from "./charts-lib-boot.js?v=3";

import {
CHART_BUILD_ID,
CHART_PAGE_ENTRY,
TERMINAL_ENTRY,
jsUrl
} from "./asset-manifest.js?v=2";

import {
initTradeExchangeSettings
} from "./trade-exchange-settings.js?v=6";

import {
initTradeVolumePresets
} from "./trade-volume-presets.js?v=2";

import {
initTradeMarketEntry
} from "./trade-market-entry.js?v=2";

import {
initTradeBookPanel
} from "./trade-book-panel.js?v=4";

const IS_YANDEX =
/YaBrowser|Yandex/i.test(
navigator.userAgent ||
""
);

export const TRADE_CHART_BUILD =
CHART_BUILD_ID;

const CHART_ENTRY =
IS_YANDEX
? CHART_PAGE_ENTRY
: TERMINAL_ENTRY;

function loadModuleScript(
url,
timeoutMs = 25000
){

return new Promise(
(
resolve,
reject
)=>{

const el =
document.createElement(
"script"
);

el.type =
"module";
el.src =
url;

const timer =
setTimeout(
()=>{
reject(
new Error(
`timeout ${url}`
)
);
},
timeoutMs
);

el.onload =
()=>{
clearTimeout(
timer
);
resolve();
};

el.onerror =
()=>{
clearTimeout(
timer
);
reject(
new Error(
`Failed to load ${url}`
)
);
};

document.head.appendChild(
el
);

}
);

}

function showBootError(
err
){

console.error(
err
);

const box =
document.createElement(
"div"
);

box.style.cssText =
"position:fixed;inset:0;z-index:9999;background:#16181f;color:#fff;padding:32px;font-family:system-ui,sans-serif;overflow:auto";

let detail =
err?.message ||
String(
err
);

const yandexHint =
IS_YANDEX
? `<p><strong>Яндекс.Браузер</strong> часто блокирует скрипты при первом заходе. «⋯» → <strong>Защита</strong> → исключение для <code>crypto-terminal-v2.vercel.app</code>, или используйте Chrome/Safari для работы.</p>`
: "";

box.innerHTML =
`
<h2>Не удалось загрузить терминал</h2>
<p style="color:#fca5a5">${detail}</p>
${yandexHint}
<p><a href="${location.pathname}" style="color:#60a5fa">Обновить страницу</a></p>`;

document.body.prepend(
box
);

}

async function loadChartEntryWithRetry(
tries = 8
){

let lastErr;

for(
let i = 0;
i <
tries;
i++
){

const url =
i ===
0
? CHART_ENTRY
: `${CHART_ENTRY}${CHART_ENTRY.includes("?") ? "&" : "?"}n=${i}&t=${Date.now()}`;

try{
if(
IS_YANDEX ||
i >
0
){
await loadModuleScript(
url
);
}else{
await import(
CHART_ENTRY
);
}
return;
}catch(
err
){
lastErr =
err;
await new Promise(
r=>
setTimeout(
r,
600 *
(
i +
1
)
)
);
}

}

throw lastErr;

}

async function boot(){

if(
!window.cryptoTerminalDesktop?.isDesktop
){
location.replace(
"/coins.html"
);
return;
}

console.info(
"[trade boot]",
TRADE_CHART_BUILD,
CHART_ENTRY
);

if(
location.protocol ===
"file:"
){
document.body.innerHTML =
`
<div style="padding:40px;background:#16181f;color:#fff;max-width:520px">
<h2>Нужен локальный сервер</h2>
<p><a href="http://127.0.0.1:8080/trade.html">http://127.0.0.1:8080/trade.html</a></p>
</div>`;
return;
}

await waitForSiteCssReady();
initTradeExchangeSettings();
initTradeVolumePresets();
initTradeMarketEntry();
initTradeBookPanel();

const {
initTradeOpenPositions
} =
await import(
"./trade-open-positions.js?v=1"
);

initTradeOpenPositions();

await loadLightweightCharts();
await loadChartEntryWithRetry();

const {
initTradeChartOverlay
} =
await import(
"./trade-chart-overlay.js?v=13"
);

initTradeChartOverlay();

const {
initTradeChartOrders
} =
await import(
"./trade-chart-orders.js?v=2"
);

initTradeChartOrders();

try{
sessionStorage.removeItem(
"trade_boot_retry_v1"
);
sessionStorage.removeItem(
"trade_boot_retry_v2"
);
}catch{
/* ignore */
}

window.__tradeAppReady =
true;

window.dispatchEvent(
new CustomEvent(
"trade-app-ready"
)
);

await import(
jsUrl(
"site-boot.js"
)
);

}

boot().catch(
err=>{

const retryV1 =
sessionStorage.getItem(
"trade_boot_retry_v1"
);
const retryV2 =
sessionStorage.getItem(
"trade_boot_retry_v2"
);

if(
IS_YANDEX &&
!retryV1
){
console.warn(
"[trade boot] Yandex: первая ошибка загрузки, reload (1/2):",
err?.message ||
err
);
sessionStorage.setItem(
"trade_boot_retry_v1",
"1"
);
location.reload();
return;
}

if(
IS_YANDEX &&
retryV1 &&
!retryV2
){
console.warn(
"[trade boot] Yandex: вторая ошибка загрузки, reload (2/2):",
err?.message ||
err
);
sessionStorage.setItem(
"trade_boot_retry_v2",
"1"
);
location.reload();
return;
}

if(
IS_YANDEX &&
retryV2
){
console.error(
"[trade boot] Yandex: загрузка не удалась после 2 reload:",
err
);
}

showBootError(
err
);

}
);
