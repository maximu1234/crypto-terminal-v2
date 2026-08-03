/**
 * Telegram Chat ID — панель в окне «Настройки» → Синхронизация.
 */
import {
getTelegramChatId,
saveTelegramChatId,
clearTelegramChatId
} from "./alerts-cloud-sync.js?v=113";

import {
TELEGRAM_BOT_USERNAME,
getTelegramBotUrl
} from "./telegram-bot-public.js?v=1";

import {
isCloudLoggedIn,
getCloudUserEmail,
onCloudSyncChange
} from "./cloud-sync.js?v=60";

function setStatus(
el,
text,
isError =
false
){

if(
!el
){
return;
}

el.textContent =
text ||
"";
el.classList.toggle(
"is-error",
!!isError
);
el.classList.toggle(
"hidden",
!text
);

}

export function mountTelegramSettingsPanel(
host
){

if(
!host ||
host.dataset.telegramMounted ===
"1"
){
return {
refresh:()=>{}
};
}

host.dataset.telegramMounted =
"1";

host.innerHTML =
`
<p class="app-settings-panel-lead">Chat ID для доставки алертов в Telegram. Без него алерты в боте не приходят.</p>
<div class="cloud-telegram-wrap">
<p class="cloud-telegram-title">Telegram для алертов</p>
<div class="cloud-telegram-guest hidden" role="status">
<p class="cloud-telegram-help">Войдите по email в разделе «Синхронизация», затем вернитесь сюда.</p>
</div>
<div class="cloud-telegram-connected hidden" role="status">
<p class="cloud-telegram-connected-text"></p>
</div>
<div class="cloud-telegram-setup hidden">
<p class="cloud-telegram-help">Введите Chat ID из сообщения бота.</p>
<div class="cloud-telegram-row">
<input type="text" class="cloud-telegram-chat-id" placeholder="Chat ID" inputmode="numeric" autocomplete="off"/>
<button type="button" class="cloud-telegram-save">Сохранить</button>
</div>
<details class="cloud-telegram-howto">
<summary>Как подключить</summary>
<ol>
<li>Откройте бота <a href="${getTelegramBotUrl()}" target="_blank" rel="noopener noreferrer">@${TELEGRAM_BOT_USERNAME}</a> и нажмите Start.</li>
<li>Скопируйте Chat ID из сообщения бота и сохраните его здесь.</li>
</ol>
</details>
</div>
<div class="cloud-telegram-actions hidden">
<button type="button" class="cloud-telegram-edit hidden">Изменить Chat ID</button>
<button type="button" class="cloud-telegram-clear">Отключить Telegram</button>
</div>
</div>
<p class="trade-exchange-status-text cloud-telegram-status" data-role="status" aria-live="polite"></p>
`;

const wrap =
host.querySelector(
".cloud-telegram-wrap"
);
const guestEl =
host.querySelector(
".cloud-telegram-guest"
);
const tgSetup =
host.querySelector(
".cloud-telegram-setup"
);
const tgConnected =
host.querySelector(
".cloud-telegram-connected"
);
const tgConnectedText =
host.querySelector(
".cloud-telegram-connected-text"
);
const tgActions =
host.querySelector(
".cloud-telegram-actions"
);
const tgInput =
host.querySelector(
".cloud-telegram-chat-id"
);
const tgSave =
host.querySelector(
".cloud-telegram-save"
);
const tgEdit =
host.querySelector(
".cloud-telegram-edit"
);
const tgClear =
host.querySelector(
".cloud-telegram-clear"
);
const statusEl =
host.querySelector(
'[data-role="status"]'
);

let tgLoadedForEmail =
"";
let tgEditMode =
false;

function telegramConnectedMessage(){

const account =
getCloudUserEmail() ||
"аккаунт";

return (
"Chat ID сохранён. Алерты будут приходить в Telegram " +
`(${account}).`
);

}

function applyTelegramUiMode(
hasChatId
){

const showConnected =
hasChatId &&
!tgEditMode;

tgSetup?.classList.toggle(
"hidden",
!isCloudLoggedIn() ||
showConnected
);
tgConnected?.classList.toggle(
"hidden",
!isCloudLoggedIn() ||
!showConnected
);
tgActions?.classList.toggle(
"hidden",
!isCloudLoggedIn()
);
tgEdit?.classList.toggle(
"hidden",
!showConnected
);

if(
showConnected &&
tgConnectedText
){
tgConnectedText.textContent =
telegramConnectedMessage();
}

}

function setTelegramUiLocked(
locked
){

if(
tgInput
){
tgInput.disabled =
!!locked;
}

if(
tgSave
){
tgSave.disabled =
!!locked;
}

if(
tgEdit
){
tgEdit.disabled =
!!locked;
}

if(
tgClear
){
tgClear.disabled =
!!locked;
}

}

async function refresh(){

const loggedIn =
isCloudLoggedIn();

guestEl?.classList.toggle(
"hidden",
loggedIn
);
wrap?.classList.toggle(
"hidden",
!loggedIn
);

if(
!loggedIn
){
tgLoadedForEmail =
"";
tgEditMode =
false;
setStatus(
statusEl,
""
);
return;
}

const email =
getCloudUserEmail() ||
"";

if(
tgLoadedForEmail ===
email &&
tgInput?.dataset.loaded ===
"1"
){
applyTelegramUiMode(
!!String(
tgInput.value ||
""
).trim()
);
return;
}

setTelegramUiLocked(
true
);

try{
const chatId =
await getTelegramChatId();
const hasChatId =
chatId !=
null;

if(
tgInput
){
tgInput.value =
hasChatId
? String(
chatId
)
: "";
tgInput.dataset.loaded =
"1";
}

applyTelegramUiMode(
hasChatId
);
tgLoadedForEmail =
email;
setStatus(
statusEl,
""
);
}catch(
err
){
if(
tgInput
){
tgInput.value =
"";
delete tgInput.dataset.loaded;
}

applyTelegramUiMode(
false
);
setStatus(
statusEl,
err?.message ||
"Не удалось загрузить Chat ID",
true
);
}finally{
setTelegramUiLocked(
false
);
}

}

tgSave?.addEventListener(
"click",
async()=>{

if(
!isCloudLoggedIn()
){
setStatus(
statusEl,
"Сначала войдите по email в разделе «Синхронизация».",
true
);
return;
}

const value =
tgInput?.value?.trim() ||
"";

setTelegramUiLocked(
true
);

if(
!value
){
setStatus(
statusEl,
"Введите Chat ID из сообщения бота.",
true
);
setTelegramUiLocked(
false
);
return;
}

try{
await saveTelegramChatId(
value
);
tgEditMode =
false;
tgLoadedForEmail =
"";
setStatus(
statusEl,
"Chat ID сохранён.",
false
);
await refresh();
}catch(
err
){
setStatus(
statusEl,
err?.message ||
"Не удалось сохранить Chat ID.",
true
);
}finally{
setTelegramUiLocked(
false
);
}

}
);

tgEdit?.addEventListener(
"click",
()=>{

tgEditMode =
true;
applyTelegramUiMode(
false
);
setStatus(
statusEl,
""
);

}
);

tgClear?.addEventListener(
"click",
async()=>{

if(
!isCloudLoggedIn()
){
return;
}

if(
!window.confirm(
"Отключить Telegram? Алерты в боте приходить не будут."
)
){
return;
}

setTelegramUiLocked(
true
);

try{
await clearTelegramChatId();
tgEditMode =
false;
tgLoadedForEmail =
"";

if(
tgInput
){
tgInput.value =
"";
}

applyTelegramUiMode(
false
);
setStatus(
statusEl,
"Telegram отключён.",
false
);
}catch(
err
){
setStatus(
statusEl,
err?.message ||
"Не удалось отключить Telegram.",
true
);
}finally{
setTelegramUiLocked(
false
);
}

}
);

void refresh();

onCloudSyncChange(
()=>{
void refresh();
}
);

return {
refresh
};

}
