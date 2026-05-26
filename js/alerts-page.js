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
} from "./alerts.js?v=60";

import {
clearTelegramChatId,
getTelegramChatId,
initAlertsCloudSync,
readCachedTelegramChatId,
saveTelegramChatId,
syncAlertsWithCloud,
pullRegistryFromCloud
} from "./alerts-cloud-sync.js?v=65";

import {
readAlertTokenSync
} from "./alert-auth-cache.js?v=4";

import {
isCloudLoggedIn,
onCloudSyncChange,
getCloudUserEmail
} from "./cloud-sync.js?v=13";

import {
ensureCloudReady,
focusAlertsLogin
} from "./auth-ui.js?v=16";

import { formatPrice } from "./chart.js";

import {
getTelegramBotUrl,
TELEGRAM_BOT_USERNAME
} from "./telegram-bot-public.js?v=1";

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

const telegramLogin =
document.getElementById("alerts-telegram-login");

const telegramNoteGuest =
document.getElementById("alerts-telegram-note-guest");

const telegramNoteLogged =
document.getElementById("alerts-telegram-note-logged");

const telegramUserEmail =
document.getElementById("alerts-telegram-user-email");

const telegramOpenLogin =
document.getElementById("alerts-open-login");

const telegramForm =
document.getElementById("alerts-telegram-form");

const telegramSetupFields =
document.getElementById("alerts-telegram-setup-fields");

const telegramInput =
document.getElementById("alerts-telegram-chat-id");

const telegramSave =
document.getElementById("alerts-telegram-save");

const telegramStatus =
document.getElementById("alerts-telegram-status");

const telegramConnected =
document.getElementById("alerts-telegram-connected");

const telegramConnectedText =
document.getElementById("alerts-telegram-connected-text");

const telegramEdit =
document.getElementById("alerts-telegram-edit");

const telegramDisconnect =
document.getElementById("alerts-telegram-disconnect");

const telegramOpenBotLink =
document.getElementById("alerts-telegram-open-bot");

const telegramPending =
document.getElementById("alerts-telegram-pending");

const telegramPendingText =
document.getElementById("alerts-telegram-pending-text");

let telegramSetupEdit =
false;

let telegramUiFetchSeq =
0;

function initTelegramBotLink(){

const url =
getTelegramBotUrl();

if(
!telegramOpenBotLink ||
!url
){
return;
}

telegramOpenBotLink.href = url;

const label =
TELEGRAM_BOT_USERNAME
? `@${TELEGRAM_BOT_USERNAME.replace(/^@/, "")}`
: "бота";

telegramOpenBotLink.textContent =
`Откройте бота ${label}`;

}

let clearDrawingsSuccessTimer = null;

function setTelegramStatus(
text,
kind = ""
){

if(!telegramStatus){
return;
}

telegramStatus.textContent = text || "";
telegramStatus.classList.toggle(
"is-error",
kind === "error"
);
telegramStatus.classList.toggle(
"is-success",
kind === "success"
);

}

function clearTelegramInputError(){

telegramInput?.classList.remove("is-invalid");

}

function setTelegramInputError(message){

telegramInput?.classList.add("is-invalid");
setTelegramStatus(
message,
"error"
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

function showTelegramConnectedUi(email){

telegramSetupEdit = false;
clearTelegramInputError();
setTelegramStatus("");

telegramNoteLogged?.classList.add("hidden");
telegramSetupFields?.classList.add("hidden");
telegramForm?.classList.add("hidden");
telegramConnected?.classList.remove("hidden");

if(telegramConnectedText){
telegramConnectedText.textContent =
telegramConnectedMessage(email);
}

}

function showTelegramSetupUi(){

telegramSetupFields?.classList.remove("hidden");
telegramForm?.classList.remove("hidden");
telegramConnected?.classList.add("hidden");

}

function hideTelegramGuestUi(){

telegramNoteGuest?.classList.add("hidden");
telegramLogin?.classList.add("hidden");

}

function showTelegramPendingUi(
message
){

hideTelegramGuestUi();
telegramPending?.classList.remove("hidden");
telegramConnected?.classList.add("hidden");
telegramForm?.classList.add("hidden");
telegramNoteLogged?.classList.add("hidden");
setTelegramStatus("");

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

function applyTelegramUiFromServer(
email,
id
){

const hasChatId =
id != null;

if(!hasChatId){
telegramSetupEdit = true;
}

const showSetup =
telegramSetupEdit || !hasChatId;

if(
hasChatId &&
!showSetup
){
showTelegramConnectedUi(email);
return;
}

showTelegramSetupUi();

telegramNoteLogged?.classList.toggle(
"hidden",
!showSetup
);

telegramForm?.classList.toggle(
"hidden",
!showSetup
);

if(
telegramInput &&
id != null
){
telegramInput.value = String(id);
}

if(showSetup){
clearTelegramInputError();

if(!hasChatId){
setTelegramStatus(
"Укажите chat id и нажмите «Сохранить».",
""
);
}else{
setTelegramStatus("");
}

}

}

async function refreshTelegramUi(){

const fetchSeq = ++telegramUiFetchSeq;

const auth =
getAlertsAuthView();

hideTelegramPendingUi();

telegramNoteGuest?.classList.toggle(
"hidden",
auth.state !== "guest"
);

telegramLogin?.classList.toggle(
"hidden",
auth.state !== "guest"
);

if(
auth.state !== "guest" &&
telegramUserEmail
){
telegramUserEmail.textContent = auth.email;
}

if(auth.state === "guest"){
telegramSetupEdit = false;
telegramNoteLogged?.classList.add("hidden");
telegramConnected?.classList.add("hidden");
telegramForm?.classList.add("hidden");
setTelegramStatus("");
return;
}

const userId =
auth.userId ||
readAlertTokenSync()?.user?.id ||
"";

const cached =
userId
? readCachedTelegramChatId(userId)
: undefined;

if(
cached != null &&
!telegramSetupEdit
){
hideTelegramGuestUi();
showTelegramConnectedUi(auth.email);
}else if(!telegramSetupEdit){
showTelegramPendingUi(
auth.state === "pending"
? "Проверяем вход и Telegram…"
: "Проверяем настройки Telegram…"
);
}

try{
const id =
await getTelegramChatId();

if(fetchSeq !== telegramUiFetchSeq){
return;
}

hideTelegramPendingUi();
applyTelegramUiFromServer(
auth.email,
id
);

}catch{

if(fetchSeq !== telegramUiFetchSeq){
return;
}

hideTelegramPendingUi();

if(
cached != null &&
!telegramSetupEdit
){
return;
}

telegramSetupEdit = true;
telegramConnected?.classList.add("hidden");
telegramForm?.classList.remove("hidden");
telegramNoteLogged?.classList.remove("hidden");
setTelegramStatus(
"Не удалось загрузить настройки",
"error"
);

}

}

telegramEdit?.addEventListener("click", ()=>{
telegramSetupEdit = true;
clearTelegramInputError();
setTelegramStatus("");
void refreshTelegramUi();
});

telegramSave?.addEventListener("click", async ()=>{

const saveLabel =
telegramSave?.textContent || "Сохранить";

clearTelegramInputError();
setTelegramStatus("");

try{
const raw =
telegramInput?.value?.trim() ?? "";

if(!raw){
setTelegramInputError(
"Введите chat id из сообщения бота."
);
return;
}

if(telegramSave){
telegramSave.disabled = true;
telegramSave.textContent = "Сохранение…";
}

await saveTelegramChatId(raw);

const savedId =
await getTelegramChatId();

if(savedId == null){
throw new Error(
"Не удалось проверить сохранение. Обновите страницу и попробуйте снова."
);

}

try{
await syncAlertsWithCloud();
}catch(syncErr){
console.warn(
"alerts sync after telegram:",
syncErr?.message || syncErr
);

}

showTelegramConnectedUi();

}catch(err){
setTelegramInputError(
err?.message || "Ошибка сохранения"
);

}finally{

if(telegramSave){
telegramSave.disabled = false;
telegramSave.textContent = saveLabel;
}

}

});

telegramDisconnect?.addEventListener("click", async ()=>{

if(
!window.confirm(
"Отключить Telegram? Алерты в боте приходить не будут (в браузере останутся, если вкладка открыта)."
)
){
return;
}

try{
await clearTelegramChatId();

if(telegramInput){
telegramInput.value = "";
}

telegramSetupEdit = true;
await refreshTelegramUi();
setTelegramStatus(
"Telegram отключён. Chat id удалён из аккаунта.",
"success"
);

}catch(err){
setTelegramInputError(
err?.message || "Не удалось отключить"
);

}

});

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

const count =
countAllDrawings();

if(!clearDrawingsAction){
return;
}

if(count > 0){

clearDrawingsAction.innerHTML =
`<button type="button" class="alerts-clear-drawings-link">Удалить</button>`;

const btn =
clearDrawingsAction.querySelector("button");

btn.onclick = e=>{
e.preventDefault();
clearAllDrawings();
stripAlertFlagsNotInRegistry();
render();
showClearDrawingsSuccess();
};

}else{

clearDrawingsAction.innerHTML =
`<span class="alerts-clear-drawings-text">Удалить</span>`;

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

telegramOpenLogin?.addEventListener("click", async e=>{

e.preventDefault();
await focusAlertsLogin();

});

onCloudSyncChange(()=>{
refreshTelegramUi();
render();
});

initAlertsCloudSync();
stripAlertFlagsNotInRegistry();
render();

initTelegramBotLink();

void refreshTelegramUi();

void ensureCloudReady()
.then(async()=>{

if(isCloudLoggedIn()){
await pullRegistryFromCloud();
}

render();
refreshTelegramUi();

})
.catch(err=>{
console.warn("alerts cloud init:", err);
refreshTelegramUi();
});
