import {
clearAllDrawings,
clearAlertsHistory,
countAllDrawings,
formatAlertDate,
formatAlertTicker,
formatTfLabel,
getAlertsHistorySorted,
getAlertsSorted,
loadAllAlerts,
loadAlertsHistory,
removeAlert,
stripAlertFlagsNotInRegistry,
removeAllAlerts,
alertExchangeId
} from "./alerts.js?v=106";

import {
buildAlertChartUrl
} from "./alert-deep-link-exchange.js?v=1";

import {
getTelegramChatId,
initAlertsCloudSync,
pullAlertHistoryFromCloud
} from "./alerts-cloud-sync.js?v=113";

import {
readAlertTokenSync
} from "./alert-auth-cache.js?v=7";

import {
isCloudLoggedIn,
isCloudLoggedInEffective,
onCloudSyncChange,
getCloudUserEmail,
pullDeviceStateFromCloud,
ensureCloudLoginResolved
} from "./cloud-sync.js?v=54";

import {
ensureCloudReady
} from "./auth-ui.js?v=55";

import {
TELEGRAM_BOT_USERNAME,
getTelegramBotUrl
} from "./telegram-bot-public.js?v=1";

import { formatPrice } from "./chart-import.js?v=44";

import {
EXCHANGE_CHANGED_EVENT,
getActiveExchangeDefinition,
getActiveExchangeId
} from "./market-api.js?v=2";

const tbody =
document.getElementById("alerts-tbody");

const emptyEl =
document.getElementById("alerts-empty");

const tableWrap =
document.getElementById("alerts-table-wrap");

const deleteAllBtn =
document.getElementById("alerts-delete-all");
const activeHeadingEl =
document.getElementById("alerts-active-heading");

const historyTbody =
document.getElementById("alerts-history-tbody");

const historyEmptyEl =
document.getElementById("alerts-history-empty");

const historyWrap =
document.getElementById("alerts-history-wrap");

const clearHistoryBtn =
document.getElementById("alerts-clear-history");

const clearDrawingsAction =
document.getElementById("alerts-clear-drawings-action");

const clearDrawingsStatus =
document.getElementById("alerts-clear-drawings-status");

const clearDrawingsWrap =
document.getElementById("alerts-clear-drawings");

const telegramNoteGuest =
document.getElementById("alerts-telegram-note-guest");

const telegramNoteLogged =
document.getElementById("alerts-telegram-note-logged");

const telegramUserEmail =
document.getElementById("alerts-telegram-user-email");

const telegramConnected =
document.getElementById("alerts-telegram-connected");

const telegramConnectedText =
document.getElementById("alerts-telegram-connected-text");

const telegramPending =
document.getElementById("alerts-telegram-pending");

const telegramPendingText =
document.getElementById("alerts-telegram-pending-text");

let telegramUiFetchSeq =
0;

let telegramChatCache =
null;

let telegramChatCacheAt =
0;

function mountTelegramBotLink(){

const link =
document.getElementById(
"alerts-telegram-bot-link"
);

if(
!link
){
return;
}

link.href =
getTelegramBotUrl();
link.textContent =
`@${TELEGRAM_BOT_USERNAME}`;

}

const TELEGRAM_CACHE_MS =
30000;

let cloudPullDebounceTimer =
null;

let alertsPageSyncInflight =
null;

let clearDrawingsSuccessTimer = null;

async function syncAlertsPageOnce(){

if(
!isCloudLoggedInEffective()
){
refreshTelegramUi();
render();
return;
}

if(
alertsPageSyncInflight
){
await alertsPageSyncInflight;
refreshTelegramUi();
render();
return;
}

alertsPageSyncInflight =
(
async()=>{

await ensureCloudLoginResolved(
8000
);
await pullDeviceStateFromCloud();
await pullAlertHistoryFromCloud();

}
)().finally(
()=>{

alertsPageSyncInflight =
null;

}
);

await alertsPageSyncInflight;
refreshTelegramUi();
render();

}

let clearDrawingsBusy =
false;

function shouldOfferGlobalClear(){

return countAllDrawings() > 0;

}

if(
clearDrawingsWrap
){

clearDrawingsWrap.addEventListener(
"click",
async e=>{

const btn =
e.target.closest(
".alerts-clear-drawings-link"
);

if(
!btn ||
clearDrawingsBusy
){
return;
}

e.preventDefault();
e.stopPropagation();

if(
!shouldOfferGlobalClear()
){
window.alert(
"Нет локальных рисунков на активной бирже."
);
return;
}

const exchangeLabel =
getActiveExchangeDefinition()?.name ||
"бирже";

if(
!window.confirm(
`Удалить все объекты рисования на ${exchangeLabel}? Это нельзя отменить.`
)
){
return;
}

clearDrawingsBusy =
true;
btn.disabled = true;

if(
clearDrawingsStatus
){
clearDrawingsStatus.textContent =
"Удаление…";
clearDrawingsStatus.classList.remove(
"hidden"
);
clearDrawingsStatus.style.color =
"";
}

try{
await clearAllDrawings();
render();
showClearDrawingsSuccess();
}catch(err){
console.warn(
"clear all drawings:",
err
);

if(
clearDrawingsStatus
){
clearDrawingsStatus.textContent =
err?.message ||
"Не удалось удалить. Проверьте вход в аккаунт.";
clearDrawingsStatus.style.color =
"#fca5a5";
clearDrawingsStatus.classList.remove(
"hidden"
);
}else{
window.alert(
err?.message ||
"Не удалось удалить."
);
}

}finally{
clearDrawingsBusy =
false;
updateClearDrawingsUi();
}

}
);

}

function telegramConnectedMessage(email){

const account =
email || getCloudUserEmail() || "аккаунт";

return (
"Chat ID сохранён. Алерты будут приходить в Telegram, " +
"когда вкладка с терминалом закрыта " +
`(${account}).`
);

}

function showTelegramPendingUi(
message
){

telegramPending?.classList.remove("hidden");
telegramConnected?.classList.add("hidden");
telegramNoteLogged?.classList.add("hidden");

if(
telegramPendingText &&
message
){
telegramPendingText.textContent = message;
}

}

function hideTelegramPendingUi(){

telegramPending?.classList.add("hidden");

}

function applyTelegramStatus(
auth,
chatId
){

telegramNoteGuest?.classList.toggle(
"hidden",
auth.state !== "guest"
);

if(
auth.state === "guest"
){
telegramNoteLogged?.classList.add("hidden");
telegramConnected?.classList.add("hidden");
return;
}

if(
telegramUserEmail
){
telegramUserEmail.textContent = auth.email;
}

if(
chatId != null
){
telegramNoteLogged?.classList.add("hidden");
telegramConnected?.classList.remove("hidden");

if(telegramConnectedText){
telegramConnectedText.textContent =
telegramConnectedMessage(auth.email);
}

return;
}

telegramNoteLogged?.classList.remove("hidden");
telegramConnected?.classList.add("hidden");

}

function getAlertsAuthView(){

const peek =
readAlertTokenSync();

if(isCloudLoggedIn()){

return {
state:"ready",
email:
getCloudUserEmail() ||
peek?.user?.email ||
"аккаунт",
userId:
peek?.user?.id || ""
};

}

if(peek?.user){

return {
state:"pending",
email:
peek.user.email ||
"аккаунт",
userId:
peek.user.id || ""
};

}

return {
state:"guest",
email:"",
userId:""
};

}

async function refreshTelegramUi(){

const fetchSeq = ++telegramUiFetchSeq;

const auth =
getAlertsAuthView();

hideTelegramPendingUi();

if(
auth.state === "guest"
){
applyTelegramStatus(
auth,
null
);
return;
}

const cacheFresh =
Date.now() -
telegramChatCacheAt <
TELEGRAM_CACHE_MS;

if(
cacheFresh &&
telegramChatCache !==
null
){
hideTelegramPendingUi();
applyTelegramStatus(
auth,
telegramChatCache.chatId
);
return;
}

showTelegramPendingUi(
auth.state === "pending"
? "Проверяем вход…"
: "Проверяем Telegram…"
);

try{
const chatId =
await getTelegramChatId();

telegramChatCache =
{
chatId
};
telegramChatCacheAt =
Date.now();

if(
fetchSeq !== telegramUiFetchSeq
){
return;
}

hideTelegramPendingUi();
applyTelegramStatus(
auth,
chatId
);

}catch{

if(
fetchSeq !== telegramUiFetchSeq
){
return;
}

hideTelegramPendingUi();
applyTelegramStatus(
auth,
null
);

}

}

let lastExcludeDiagKey =
"";

function logAlertsListExcludeDiag(){

try{

const ex =
getActiveExchangeId();
const activeAll =
loadAllAlerts();
const activeShown =
getAlertsSorted();
const histAll =
loadAlertsHistory();
const histShown =
getAlertsHistorySorted();

const key =
`${ex}|${activeAll.length}|${activeShown.length}|${histAll.length}|${histShown.length}`;

if(
key ===
lastExcludeDiagKey
){
return;
}

lastExcludeDiagKey =
key;

if(
activeAll.length !==
activeShown.length
){
const hidden =
activeAll.filter(
a=>
alertExchangeId(
a
) !==
ex
);

console.info(
"[alerts] Active list: shown",
activeShown.length,
"/ all",
activeAll.length,
"| exchange=",
ex,
"| hidden by exchange:",
hidden.map(
a=>
`${a.symbol}@${alertExchangeId(a)}`
)
);
}

if(
histAll.length !==
histShown.length
){
const hidden =
histAll.filter(
a=>
alertExchangeId(
a
) !==
ex
);

console.info(
"[alerts] Executed list: shown",
histShown.length,
"/ all",
histAll.length,
"| exchange=",
ex,
"| hidden by exchange:",
hidden.map(
a=>
`${a.symbol}@${alertExchangeId(a)}`
)
);
}

}catch{
/* ignore */
}

}

function renderActive(){

const alerts =
getAlertsSorted();

if(
activeHeadingEl
){
activeHeadingEl.textContent =
`Активные алерты (${alerts.length})`;
}

if(
!emptyEl ||
!tableWrap ||
!tbody
){
return;
}

if(!alerts.length){

emptyEl.classList.remove("hidden");
tableWrap.classList.add("hidden");
tbody.innerHTML = "";
return;

}

emptyEl.classList.add("hidden");
tableWrap.classList.remove("hidden");

tbody.innerHTML =
alerts.map(alert=>`

<tr data-shape-id="${alert.shapeId}">

<td>${formatAlertDate(alert.createdAt)}</td>

<td>
<a class="alerts-symbol-link" href="${buildAlertChartUrl({
symbol: alert.symbol,
tf: alert.tf || "60",
exchangeId: alertExchangeId(alert)
})}">
${formatAlertTicker(alert.symbol)}
</a>
</td>

<td class="alerts-tf">${formatTfLabel(alert.tf)}</td>

<td class="alerts-price">${formatPrice(alert.price)}</td>

<td class="alerts-col-delete">
<button type="button" class="alerts-row-delete-btn" data-shape-id="${alert.shapeId}" data-symbol="${alert.symbol}" title="Удалить алерт" aria-label="Удалить алерт">×</button>
</td>

</tr>

`).join("");

tbody.querySelectorAll(".alerts-row-delete-btn").forEach(btn=>{

btn.addEventListener("click", ()=>{

removeOne(
btn.dataset.symbol,
btn.dataset.shapeId
);

});

});

}

function renderHistory(){

const history =
getAlertsHistorySorted();

if(
!historyEmptyEl ||
!historyWrap ||
!historyTbody
){
return;
}

if(!history.length){

historyEmptyEl.classList.remove("hidden");
historyWrap.classList.add("hidden");
clearHistoryBtn?.classList.add("hidden");
historyTbody.innerHTML = "";
return;

}

historyEmptyEl.classList.add("hidden");
historyWrap.classList.remove("hidden");
clearHistoryBtn?.classList.remove("hidden");

historyTbody.innerHTML =
history.map(alert=>`

<tr>

<td>${formatAlertDate(alert.triggeredAt)}</td>

<td>${formatAlertDate(alert.createdAt)}</td>

<td>
<a class="alerts-symbol-link" href="${buildAlertChartUrl({
symbol: alert.symbol,
tf: alert.tf || "60",
exchangeId: alertExchangeId(alert)
})}">
${formatAlertTicker(alert.symbol)}
</a>
</td>

<td class="alerts-tf">${formatTfLabel(alert.tf)}</td>

<td class="alerts-price">${formatPrice(alert.price)}</td>

</tr>

`).join("");

}

function render(){

logAlertsListExcludeDiag();
renderActive();
renderHistory();
updateClearDrawingsUi();

}

function updateClearDrawingsUi(){

if(
!clearDrawingsAction
){
return;
}

if(
shouldOfferGlobalClear()
){

clearDrawingsAction.innerHTML =
`<button type="button" class="alerts-clear-drawings-link">Удалить</button>`;

}else{

clearDrawingsAction.innerHTML =
`<span class="alerts-clear-drawings-text" title="Локальных рисунков на активной бирже нет">Нечего удалять</span>`;

}

}

function showClearDrawingsSuccess(){

if(!clearDrawingsStatus){
return;
}

clearDrawingsStatus.textContent =
"Успешно удалено";

clearDrawingsStatus.classList.remove("hidden");

if(clearDrawingsSuccessTimer){
clearTimeout(clearDrawingsSuccessTimer);
}

clearDrawingsSuccessTimer =
setTimeout(()=>{

clearDrawingsStatus.classList.add("hidden");
clearDrawingsStatus.textContent = "";
clearDrawingsSuccessTimer = null;

}, 4000);

}

function removeOne(symbol, shapeId){

removeAlert(symbol, shapeId);
render();

}

deleteAllBtn?.addEventListener("click", ()=>{

const alerts =
getAlertsSorted();

if(
!alerts.length
){
return;
}

removeAllAlerts();
render();

});

clearHistoryBtn?.addEventListener("click", ()=>{

clearAlertsHistory();
render();

});

window.addEventListener("alerts-changed", render);
window.addEventListener("alerts-registry-pulled", render);
window.addEventListener(
EXCHANGE_CHANGED_EVENT,
render
);
window.addEventListener(
EXCHANGE_CHANGED_EVENT,
render
);
window.addEventListener(
"drawings-cleared-all",
render
);
window.addEventListener("alerts-history-changed", render);

onCloudSyncChange(()=>{

if(
cloudPullDebounceTimer
){
clearTimeout(
cloudPullDebounceTimer
);
}

cloudPullDebounceTimer =
setTimeout(
()=>{

cloudPullDebounceTimer =
null;
void syncAlertsPageOnce();

},
1200
);

});

initAlertsCloudSync();
mountTelegramBotLink();
stripAlertFlagsNotInRegistry();
render();

void refreshTelegramUi();

void ensureCloudReady()
.then(
()=>syncAlertsPageOnce()
)
.catch(
err=>{
console.warn(
"alerts cloud init:",
err
);
refreshTelegramUi();
}
);
