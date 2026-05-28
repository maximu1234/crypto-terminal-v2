import {
clearAllDrawings,
clearAlertsHistory,
countAllDrawings,
formatAlertDate,
formatAlertTicker,
formatTfLabel,
getAlertsHistorySorted,
getAlertsSorted,
removeAlert,
stripAlertFlagsNotInRegistry,
removeAllAlerts
} from "./alerts.js?v=81";

import {
getTelegramChatId,
initAlertsCloudSync
} from "./alerts-cloud-sync.js?v=82";

import {
readAlertTokenSync
} from "./alert-auth-cache.js?v=6";

import {
isCloudLoggedIn,
isCloudLoggedInEffective,
onCloudSyncChange,
getCloudUserEmail,
pullDeviceStateFromCloud,
ensureCloudLoginResolved
} from "./cloud-sync.js?v=23";

import {
ensureCloudReady
} from "./auth-ui.js?v=24";

import { formatPrice } from "./chart.js";

const tbody =
document.getElementById("alerts-tbody");

const emptyEl =
document.getElementById("alerts-empty");

const tableWrap =
document.getElementById("alerts-table-wrap");

const deleteAllCb =
document.getElementById("alerts-delete-all");

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

if(
getAlertsSorted().length >
0
){
return true;
}

return (
countAllDrawings() >
0
);

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
"Нет локальных рисунков. Войдите в аккаунт, чтобы очистить облако."
);
return;
}

if(
!window.confirm(
"Удалить все объекты рисования и все алерты на всех монетах? Это нельзя отменить."
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
stripAlertFlagsNotInRegistry();
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
btn.disabled = false;
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

function renderActive(){

const alerts =
getAlertsSorted();

if(deleteAllCb){
deleteAllCb.checked = false;
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
<a class="alerts-symbol-link" href="/coins.html?symbol=${encodeURIComponent(alert.symbol)}&tf=${encodeURIComponent(alert.tf || "60")}">
${formatAlertTicker(alert.symbol)}
</a>
</td>

<td class="alerts-tf">${formatTfLabel(alert.tf)}</td>

<td class="alerts-price">${formatPrice(alert.price)}</td>

<td class="alerts-col-delete">
<label class="alerts-row-delete">
<input type="checkbox" class="alerts-delete-one" data-shape-id="${alert.shapeId}" data-symbol="${alert.symbol}" title="Удалить алерт"/>
</label>
</td>

</tr>

`).join("");

tbody.querySelectorAll(".alerts-delete-one").forEach(cb=>{

cb.addEventListener("change", ()=>{

if(!cb.checked){
return;
}

removeOne(
cb.dataset.symbol,
cb.dataset.shapeId
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
<a class="alerts-symbol-link" href="/coins.html?symbol=${encodeURIComponent(alert.symbol)}&tf=${encodeURIComponent(alert.tf || "60")}">
${formatAlertTicker(alert.symbol)}
</a>
</td>

<td class="alerts-tf">${formatTfLabel(alert.tf)}</td>

<td class="alerts-price">${formatPrice(alert.price)}</td>

</tr>

`).join("");

}

function render(){

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

}else if(
isCloudLoggedIn()
){

clearDrawingsAction.innerHTML =
`<span class="alerts-clear-drawings-text" title="В браузере и в списке алертов ничего нет">Нечего удалять</span>`;

}else{

clearDrawingsAction.innerHTML =
`<span class="alerts-clear-drawings-text" title="Войдите в аккаунт">Удалить</span>`;

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

deleteAllCb?.addEventListener("change", ()=>{

if(!deleteAllCb.checked){
return;
}

const alerts =
getAlertsSorted();

removeAllAlerts();
deleteAllCb.checked = false;
render();

});

clearHistoryBtn?.addEventListener("click", ()=>{

clearAlertsHistory();
render();

});

window.addEventListener("alerts-changed", render);
window.addEventListener("alerts-registry-pulled", render);
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
