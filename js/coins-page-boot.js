/**
 * Загрузка /coins: для Яндекса — <script type="module">, не import().
 */
import {
waitForSiteCssReady
} from "./site-css-gate.js?v=1";

import {
loadLightweightCharts
} from "./charts-lib-boot.js?v=3";

const IS_YANDEX =
/YaBrowser|Yandex/i.test(
navigator.userAgent ||
""
);

/** Менять при каждом релизе графика — иначе iPad держит старый boot в кэше (v=2). */
export const COINS_CHART_BUILD =
"20260529-autoscale-default";

const CHART_ENTRY =
IS_YANDEX
? "/js/chart-page.js?v=2"
: "/js/terminal.js?v=232";

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
"position:fixed;inset:0;z-index:9999;background:#0b1220;color:#fff;padding:32px;font-family:system-ui,sans-serif;overflow:auto";

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
`${CHART_ENTRY}${CHART_ENTRY.includes("?") ? "&" : "?"}n=${i}&t=${Date.now()}`;

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
url
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

console.info(
"[coins boot]",
COINS_CHART_BUILD,
CHART_ENTRY
);

if(
location.protocol ===
"file:"
){
document.body.innerHTML =
`
<div style="padding:40px;background:#0b1220;color:#fff;max-width:520px">
<h2>Нужен локальный сервер</h2>
<p><a href="http://127.0.0.1:8080/coins.html">http://127.0.0.1:8080/coins.html</a></p>
</div>`;
return;
}

await waitForSiteCssReady();
await loadLightweightCharts();
await loadChartEntryWithRetry();

try{
sessionStorage.removeItem(
"coins_boot_retry_v1"
);
sessionStorage.removeItem(
"coins_boot_retry_v2"
);
}catch{
/* ignore */
}

window.__coinsAppReady =
true;

window.dispatchEvent(
new CustomEvent(
"coins-app-ready"
)
);

}

boot().catch(
err=>{

const key =
sessionStorage.getItem(
"coins_boot_retry_v1"
)
? "coins_boot_retry_v2"
: "coins_boot_retry_v1";

if(
IS_YANDEX &&
!sessionStorage.getItem(
key
)
){
sessionStorage.setItem(
key,
"1"
);
location.reload();
return;
}

showBootError(
err
);

}
);
