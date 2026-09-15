/**
 * /trade — меню «+» у шкалы: лимитные / стоп-ордера и алерт.
 */
import {
getActiveTradeVolumeUsdt
} from "./trade-volume-presets.js?v=11";

import {
formatPrice
} from "./chart-import.js?v=56";

import {
createPriceAlert
} from "./alerts.js?v=111";

import {
isCloudLoggedInEffective
} from "./cloud-sync.js?v=70";

import {
getTelegramChatId
} from "./alerts-cloud-sync.js?v=115";

import {
getActiveTradeConfig
} from "./trade/module-router.js?v=23";

import {
computePlusMenuPosition
} from "./trade-order-plus-menu-pos.js?v=1";

function tradingApi(){

return window.cryptoTerminalDesktop?.trading;

}

function formatMenuPrice(
price
){

const text =
formatPrice(
price
);

return text ||
"—";

}

function getMarkPrice(){

const host =
window.__tradeChartHost;
const data =
host?.series?.data?.();
const last =
data?.[
data.length -
1
];

const close =
Number(
last?.close
);

if(
Number.isFinite(
close
) &&
close >
0
){
return close;
}

return 0;

}

const MENU_ABOVE =
[
{
kind:
"sell-limit",
label:
"Sell limit",
dot:
"red"
},
{
kind:
"buy-stop",
label:
"Buy Stop",
dot:
"green"
},
{
kind:
"sell-stop",
label:
"Sell Stop",
dot:
"red"
}
];

const MENU_BELOW =
[
{
kind:
"buy-limit",
label:
"Buy limit",
dot:
"green"
},
{
kind:
"sell-stop",
label:
"Sell Stop",
dot:
"red"
},
{
kind:
"buy-stop",
label:
"Buy Stop",
dot:
"green"
}
];

let menuEl =
null;
let menuOpen =
false;
let outsideHandler =
null;

function closeMenu(){

if(
menuEl
){
menuEl.remove();
menuEl =
null;
}

menuOpen =
false;

if(
outsideHandler
){
document.removeEventListener(
"pointerdown",
outsideHandler,
true
);
document.removeEventListener(
"keydown",
outsideHandler,
true
);
outsideHandler =
null;
}

}

function buildMenuHtml(
items,
price
){

const ordersHtml =
items.map(
item=>
`
<button type="button" class="trade-order-plus-item" data-kind="${item.kind}">
<span class="trade-order-plus-item-label">${item.label}</span>
<span class="trade-order-plus-dot trade-order-plus-dot--${item.dot}" aria-hidden="true"></span>
</button>
`
).join(
""
);

return `
<div class="trade-order-plus-menu-orders">
${ordersHtml}
</div>
<div class="trade-order-plus-menu-alert">
<button type="button" class="trade-order-plus-alert-item" data-kind="alert">
<span class="trade-order-plus-alert-icon" aria-hidden="true">🔔</span>
<span class="trade-order-plus-alert-text">@ ${formatMenuPrice(price)}</span>
</button>
</div>
`;

}

async function submitAlert(
price,
sym,
tf,
scheduleRedraw
){

if(
!isCloudLoggedInEffective()
){
window.alert(
"Войдите в аккаунт, чтобы ставить алерты."
);
return;
}

const chatId =
await getTelegramChatId();

if(
chatId ==
null
){
window.alert(
"Для алертов сначала подключите Telegram Chat ID в настройках (шестерёнка)."
);
return;
}

const row =
await createPriceAlert(
sym,
price,
tf
);

if(
row
){
scheduleRedraw?.();
window.dispatchEvent(
new CustomEvent(
"price-alerts-changed"
)
);
window.dispatchEvent(
new CustomEvent(
"chart-probe-crosshair-clear-request"
)
);
}

}

async function placeOrder(
kind,
price,
sym
){

const api =
tradingApi();

if(
!api?.placeOrder
){
window.alert(
"Торговля доступна только в десктоп-приложении."
);
return false;
}

const status =
await api.getStatus?.();

if(
!status?.configured
){
window.alert(
getActiveTradeConfig()?.emptyCredentialsHint ||
"Подключите API-ключи биржи в настройках."
);
return false;
}

const volumeUsdt =
getActiveTradeVolumeUsdt(
sym
);

if(
!Number.isFinite(
volumeUsdt
) ||
volumeUsdt <=
0
){
window.alert(
"Укажите объём сделки в USDT в меню над графиком."
);
return false;
}

const result =
await api.placeOrder(
{
symbol:
sym,
kind,
price,
volumeUsdt,
markPrice:
getMarkPrice()
}
);

if(
result?.ok ===
false
){
window.alert(
result.message ||
"Не удалось выставить ордер"
);
return false;
}

window.dispatchEvent(
new CustomEvent(
"trade-book-refresh"
)
);
window.dispatchEvent(
new CustomEvent(
"trade-orders-refresh"
)
);
return true;

}

function positionMenu(
menu,
plusBtn,
wrapEl
){

const wrapRect =
wrapEl.getBoundingClientRect();
const plusRect =
plusBtn.getBoundingClientRect();
const menuRect =
menu.getBoundingClientRect();

const pos =
computePlusMenuPosition({
wrapWidth: wrapRect.width,
wrapHeight: wrapRect.height,
plusLeft: plusRect.left - wrapRect.left,
plusTop: plusRect.top - wrapRect.top,
plusWidth: plusRect.width,
plusHeight: plusRect.height,
menuWidth: menuRect.width,
menuHeight: menuRect.height
});

menu.style.left =
`${Math.round(pos.left)}px`;
menu.style.top =
`${Math.round(pos.top)}px`;

}

function openMenu(
price,
ctx,
{
getSymbol,
getTf,
scheduleRedraw
}
){

if(
menuOpen
){
closeMenu();
}

const mark =
getMarkPrice();
const above =
mark >
0
? price >
mark
: true;
const items =
above
? MENU_ABOVE
: MENU_BELOW;
const sym =
getSymbol?.() ||
"";

menuEl =
document.createElement(
"div"
);
menuEl.className =
"trade-order-plus-menu";
menuEl.style.position =
"absolute";
menuEl.style.zIndex =
"40";
menuEl.style.pointerEvents =
"auto";
menuEl.style.visibility =
"hidden";
menuEl.innerHTML =
buildMenuHtml(
items,
price
);

ctx.wrapEl.appendChild(
menuEl
);
menuOpen =
true;

requestAnimationFrame(
()=>{
positionMenu(
menuEl,
ctx.plusBtn,
ctx.wrapEl
);
if(
menuEl
){
menuEl.style.visibility =
"visible";
}
}
);

menuEl.addEventListener(
"click",
e=>{

const btn =
e.target.closest(
"[data-kind]"
);

if(
!btn ||
!menuEl.contains(
btn
)
){
return;
}

e.preventDefault();
e.stopPropagation();

const kind =
btn.dataset.kind;

closeMenu();
ctx.hidePlus?.();

if(
kind ===
"alert"
){
void submitAlert(
price,
sym,
getTf?.(),
scheduleRedraw
);
return;
}

void placeOrder(
kind,
price,
sym
);

}
);

outsideHandler =
e=>{

if(
menuEl?.contains(
e.target
) ||
ctx.plusBtn?.contains(
e.target
)
){
return;
}

closeMenu();
ctx.hidePlus?.();

};

document.addEventListener(
"pointerdown",
outsideHandler,
true
);

document.addEventListener(
"keydown",
e=>{

if(
e.key ===
"Escape"
){
closeMenu();
ctx.hidePlus?.();
}

},
true
);

}

export function createTradePlusMenuHandler({
getSymbol,
getTf,
scheduleRedraw
}){

return (
price,
ctx
)=>{

if(
!document.body.classList.contains(
"trade-page"
)
){
return;
}

openMenu(
price,
ctx,
{
getSymbol,
getTf,
scheduleRedraw
}
);

};

}
