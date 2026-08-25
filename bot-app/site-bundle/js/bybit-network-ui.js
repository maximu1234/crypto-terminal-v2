/**
 * Баннер сетевой ошибки публичного API активной биржи.
 */
import {
getActiveExchangeDefinition,
getActiveExchangeId
} from "./market-api.js?v=6";

let bannerEl = null;
let messageEl = null;
let uiReady = false;

function ensureBanner(){

if(bannerEl){
return bannerEl;
}

bannerEl =
document.createElement("div");

bannerEl.id = "bybit-network-banner";
bannerEl.className = "bybit-network-banner hidden";
bannerEl.setAttribute(
"role",
"alert"
);

messageEl =
document.createElement("p");

messageEl.className = "bybit-network-banner-text";

const retryBtn =
document.createElement("button");

retryBtn.type = "button";
retryBtn.className = "bybit-network-banner-btn";
retryBtn.textContent = "Повторить";

retryBtn.addEventListener(
"click",
()=>{

void import(
"./bybit-fetch.js?v=17"
).then(
m=>{
m.resetBybitEndpoints?.();
}
);

if(
getActiveExchangeId() ===
"bingx"
){

void import(
"./exchanges/bingx/ws.js?v=17"
).then(
m=>{
m.resetBingxWs?.();
}
);

}

window.dispatchEvent(
new CustomEvent(
"bybit-network-retry"
)
);

}
);

bannerEl.append(
messageEl,
retryBtn
);

document.body.appendChild(bannerEl);
return bannerEl;

}

export function showBybitNetworkIssue(err){

const host =
ensureBanner();

const detail =
err?.message ||
(
typeof err === "string"
? err
: ""
);

const lower =
String(detail).toLowerCase();

const desktopHint =
lower.includes("failed to fetch") ||
lower.includes("network") ||
lower.includes("timed_out") ||
lower.includes("timeout") ||
lower.includes("не json")
? " На компьютере часто мешают блокировщик, «Защита» в Яндексе или антивирус; на телефоне при той же Wi‑Fi их обычно нет — попробуйте инкогнито или Safari/Chrome."
: "";

const exchangeName =
getActiveExchangeDefinition().name;

messageEl.textContent =
detail &&
!detail.toLowerCase().includes(
"api"
)
? `Данные ${exchangeName} не загрузились (${detail}). Проверьте сеть или нажмите «Повторить».${desktopHint}`
: `Данные ${exchangeName} не загрузились (сеть, Wi‑Fi или блокировка). Нажмите «Повторить» или обновите страницу.${desktopHint}`;

host.classList.remove("hidden");

}

export function clearBybitNetworkIssue(){

if(
!bannerEl
){
return;
}

bannerEl.classList.add("hidden");

}

export function initBybitNetworkUi(){

if(uiReady){
return;
}

uiReady = true;
ensureBanner();

}
