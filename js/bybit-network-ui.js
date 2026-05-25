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

resetBybitEndpoints();

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

messageEl.textContent =
detail &&
!detail.includes("Bybit API")
? `Данные Bybit не загрузились (${detail}). Проверьте сеть или нажмите «Повторить».`
: "Данные Bybit не загрузились (сеть, Wi‑Fi или блокировка). Нажмите «Повторить» или обновите страницу.";

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
