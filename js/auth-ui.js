import {
initCloudSync,
isCloudSyncEnabled,
isCloudLoggedIn,
isCloudLoggedInEffective,
getCloudUserEmail,
onCloudSyncChange,
signInWithEmailOtp,
signOutCloud,
recoverAuthSessionFromUrl,
completeAuthFromCallbackUrl,
hasAuthCallbackInUrl
} from "./cloud-sync.js?v=39";

import {
isSupabaseConfigured
} from "./supabase-client.js?v=7";

import {
readAlertTokenSync
} from "./alert-auth-cache.js?v=7";

import {
getTelegramChatId,
saveTelegramChatId,
clearTelegramChatId
} from "./alerts-cloud-sync.js?v=110";

import {
isSystemAdminUser
} from "./system-admin-access.js?v=3";

import {
isAlertsPage
} from "./cloud-sync-throttle.js?v=3";

import {
TELEGRAM_BOT_USERNAME,
getTelegramBotUrl
} from "./telegram-bot-public.js?v=1";

let cloudEnvConfigured = false;
let cloudSdkError = "";

function isDesktopShell(){

return !!window.cryptoTerminalDesktop?.isDesktop;

}

let desktopAuthBound =
false;

function bindDesktopAuthCallback(){

const api =
window.cryptoTerminalDesktop;

if(
!api?.onAuthCallback ||
desktopAuthBound
){
return;
}

desktopAuthBound =
true;

api.onAuthCallback(
url=>{

void (
async()=>{

try{
const result =
await completeAuthFromCallbackUrl(
url
);

if(
result.ok
){
cloudSdkError =
"";
}else{
cloudSdkError =
result.message ||
"Не удалось войти по ссылке.";
}

}catch(
err
){
cloudSdkError =
err?.message ||
"Не удалось войти по ссылке.";
}

refreshAuthUi();

}
)();

}
);

}

function pageHasCloudAuth(){

if(
document.getElementById("cloud-settings-mount") ||
document.getElementById("header-settings-btn")
){
return true;
}

const path =
window.location.pathname;

if(
path === "/" ||
path.endsWith("/screener.html") ||
path.endsWith("/index")
){
return true;
}

return (
path === "/alerts" ||
path === "/alerts/" ||
path.endsWith("/alerts") ||
path.endsWith("/alerts/") ||
path.includes("terminal.html") ||
path.endsWith("/terminal") ||
path.endsWith("/coins") ||
path.includes("trade.html") ||
path.endsWith("/trade") ||
path.includes("watchlist.html") ||
path.endsWith("/watchlist") ||
path === "/system" ||
path.endsWith("/system") ||
path.includes("/system/")
);

}

let settingsDropdownReady = false;
let refreshSettingsAuthUi = ()=>{};

const AUTH_UI_LAST_EMAIL_KEY =
"cloud_auth_last_email_v1";

const MOBILE_NAV_MQ =
window.matchMedia(
"(max-width: 640px)"
);

function isMobileNavViewport(){

return MOBILE_NAV_MQ.matches;

}

function isSettingsInlineMode(
wrap
){

return !!(
isMobileNavViewport() &&
wrap?.closest(
".screener-nav-panel, #coins-nav-panel"
)
);

}

function restoreDropdownHome(
dropdown,
wrap
){

if(
!dropdown ||
!wrap ||
dropdown.parentElement !== document.body
){
return;
}

const anchor =
wrap.querySelector(
"[data-settings-dropdown-anchor]"
);

if(anchor){
wrap.insertBefore(
dropdown,
anchor
);
anchor.remove();
}else{
wrap.appendChild(dropdown);
}

dropdown.classList.remove(
"header-settings-dropdown--portaled"
);

}

function portalDropdownToBody(
dropdown,
wrap
){

if(
!dropdown ||
!wrap ||
dropdown.parentElement === document.body
){
return;
}

const anchor =
document.createElement(
"span"
);

anchor.setAttribute(
"data-settings-dropdown-anchor",
""
);
anchor.hidden =
true;
anchor.setAttribute(
"aria-hidden",
"true"
);
wrap.insertBefore(
anchor,
dropdown
);
document.body.appendChild(dropdown);
dropdown.classList.add(
"header-settings-dropdown--portaled"
);

}

function isSettingsUiTarget(
target
){

if(!target?.closest){
return false;
}

return !!(
target.closest(
"#header-settings-wrap"
) ||
target.closest(
"#header-settings-dropdown"
) ||
target.closest(
"#trade-exchange-dropdown"
) ||
target.closest(
"#trade-exchange-wrap"
)
);

}

function needsSettingsPortal(
wrap
){

if(
!wrap ||
isMobileNavViewport() ||
isSettingsInlineMode(wrap)
){
return false;
}

let node =
wrap.parentElement;

while(
node &&
node !== document.body
){

const style =
getComputedStyle(node);

if(
style.overflow === "hidden" ||
style.overflowX === "hidden" ||
style.overflowY === "hidden" ||
style.overflow === "clip" ||
style.overflowX === "clip" ||
style.overflowY === "clip"
){
return true;
}

node =
node.parentElement;

}

return false;

}

function clearPortaledPosition(
dropdown
){

if(!dropdown){
return;
}

dropdown.style.top = "";
dropdown.style.left = "";
dropdown.style.right = "";
dropdown.style.bottom = "";

}

function positionPortaledDropdown(
btn,
dropdown
){

if(
!btn ||
!dropdown
){
return false;
}

const rect =
btn.getBoundingClientRect();

if(
rect.width < 1 ||
rect.height < 1
){
return false;
}

const margin =
12;

const dropW =
Math.min(
dropdown.offsetWidth || 280,
window.innerWidth - margin * 2
);

let left =
rect.left;

if(
left + dropW >
window.innerWidth - margin
){
left =
Math.max(
margin,
rect.right - dropW
);
}

dropdown.style.top =
`${Math.round(rect.bottom + 8)}px`;

dropdown.style.left =
`${Math.round(left)}px`;

dropdown.style.right = "auto";
dropdown.style.bottom = "auto";

return true;

}

function syncSettingsDropdownPlacement(){

const btn =
document.getElementById("header-settings-btn");
const dropdown =
document.getElementById("header-settings-dropdown");
const wrap =
document.getElementById("header-settings-wrap");

if(
!btn ||
!dropdown ||
!wrap
){
return;
}

if(isMobileNavViewport()){

restoreDropdownHome(
dropdown,
wrap
);
clearPortaledPosition(dropdown);
dropdown.classList.remove(
"header-settings-dropdown--portaled"
);

if(
dropdown.classList.contains("hidden")
){
return;
}

dropdown.classList.add(
"header-settings-dropdown--inline"
);
return;

}

if(
dropdown.classList.contains("hidden")
){
if(
dropdown.parentElement === document.body
){
restoreDropdownHome(
dropdown,
wrap
);
clearPortaledPosition(dropdown);
}

return;
}

dropdown.classList.remove(
"header-settings-dropdown--inline",
"header-settings-dropdown--portaled"
);
clearPortaledPosition(dropdown);

if(
isSettingsInlineMode(wrap)
){

restoreDropdownHome(
dropdown,
wrap
);

dropdown.classList.add(
"header-settings-dropdown--inline"
);
return;

}

if(
needsSettingsPortal(wrap)
){

portalDropdownToBody(
dropdown,
wrap
);

dropdown.classList.add(
"header-settings-dropdown--portaled"
);

if(
!positionPortaledDropdown(
btn,
dropdown
)
){
requestAnimationFrame(()=>{
positionPortaledDropdown(
btn,
dropdown
);
});
}

return;

}

restoreDropdownHome(
dropdown,
wrap
);

}

function scheduleSettingsDropdownPlacement(){

syncSettingsDropdownPlacement();

requestAnimationFrame(()=>{
syncSettingsDropdownPlacement();
});

}

export function closeCloudSettingsDropdown(){

const btn =
document.getElementById("header-settings-btn");
const dropdown =
document.getElementById("header-settings-dropdown");
const wrap =
document.getElementById("header-settings-wrap");

if(
!btn ||
!dropdown
){
return;
}

dropdown.classList.add("hidden");
clearPortaledPosition(dropdown);

if(wrap){
restoreDropdownHome(
dropdown,
wrap
);
}

btn.setAttribute(
"aria-expanded",
"false"
);

}

function closeSettingsDropdown(){

closeCloudSettingsDropdown();

}

function openSettingsDropdown(){

const btn =
document.getElementById("header-settings-btn");
const dropdown =
document.getElementById("header-settings-dropdown");
const wrap =
document.getElementById("header-settings-wrap");

if(
!btn ||
!dropdown ||
!wrap
){
return;
}

dropdown.classList.remove("hidden");
btn.setAttribute(
"aria-expanded",
"true"
);

refreshSettingsAuthUi();
scheduleSettingsDropdownPlacement();

}

function isAuthUiLoggedIn(){

return isCloudLoggedInEffective();

}

function getAuthUiEmail(){

const knownEmail =
getCloudUserEmail() ||
readAlertTokenSync()?.user?.email ||
readRememberedAuthEmail();

if(knownEmail){
rememberAuthEmail(knownEmail);
}

return knownEmail || "";

}

function rememberAuthEmail(
email
){

const value =
String(email || "").trim();

if(!value){
return;
}

try{
localStorage.setItem(
AUTH_UI_LAST_EMAIL_KEY,
value
);
}catch{
/* ignore */
}

}

function readRememberedAuthEmail(){

try{
return String(
localStorage.getItem(
AUTH_UI_LAST_EMAIL_KEY
) || ""
).trim();
}catch{
return "";
}

}

function setupSettingsDropdown(){

if(settingsDropdownReady){
return;
}

const btn =
document.getElementById("header-settings-btn");
const dropdown =
document.getElementById("header-settings-dropdown");
const wrap =
document.getElementById("header-settings-wrap");

if(
!btn ||
!dropdown ||
!wrap
){
return;
}

function onSettingsToggle(
e
){

e.preventDefault();
e.stopPropagation();

if(
typeof e.stopImmediatePropagation === "function"
){
e.stopImmediatePropagation();
}

if(
dropdown.classList.contains("hidden")
){
openSettingsDropdown();
}else{
closeSettingsDropdown();
}

}

btn.addEventListener(
"click",
onSettingsToggle
);

btn.addEventListener(
"pointerdown",
e=>{
e.stopPropagation();
},
true
);

document.addEventListener(
"pointerdown",
e=>{

const panel =
document.getElementById(
"header-settings-dropdown"
);

if(
!panel ||
panel.classList.contains("hidden")
){
return;
}

if(
isSettingsUiTarget(
e.target
)
){
return;
}

closeSettingsDropdown();

},
true
);

document.addEventListener("keydown", e=>{

if(e.key === "Escape"){
closeSettingsDropdown();
}

});

settingsDropdownReady = true;

if(isMobileNavViewport()){

const drop =
document.getElementById("header-settings-dropdown");
const shell =
document.getElementById("header-settings-wrap");

if(
drop &&
shell
){
restoreDropdownHome(
drop,
shell
);
clearPortaledPosition(drop);
drop.classList.remove(
"header-settings-dropdown--portaled"
);
}

}

function onSettingsViewportChange(){

const drop =
document.getElementById("header-settings-dropdown");
const shell =
document.getElementById("header-settings-wrap");

if(
!drop ||
!shell
){
return;
}

if(
isMobileNavViewport()
){
if(
drop.parentElement === document.body
){
restoreDropdownHome(
drop,
shell
);
clearPortaledPosition(drop);
}

if(
drop.classList.contains("hidden")
){
return;
}

drop.classList.remove(
"header-settings-dropdown--portaled"
);
drop.classList.add(
"header-settings-dropdown--inline"
);
clearPortaledPosition(drop);
return;
}

if(
!drop.classList.contains("hidden")
){
syncSettingsDropdownPlacement();
}

}

window.addEventListener(
"resize",
onSettingsViewportChange,
{ passive: true }
);

if(
typeof MOBILE_NAV_MQ.addEventListener === "function"
){
MOBILE_NAV_MQ.addEventListener(
"change",
onSettingsViewportChange
);
}else if(
typeof MOBILE_NAV_MQ.addListener === "function"
){
MOBILE_NAV_MQ.addListener(
onSettingsViewportChange
);
}

}

function bindHeaderSettingsEarly(){

if(
!document.getElementById("header-settings-btn")
){
return;
}

setupSettingsDropdown();

}

if(
document.readyState === "loading"
){

document.addEventListener(
"DOMContentLoaded",
bindHeaderSettingsEarly
);

}else{

bindHeaderSettingsEarly();

}

function createAuthPanel(host, variant){

if(
!host ||
host.querySelector(".cloud-auth-wrap")
){
return null;
}

const wrap =
document.createElement("div");

wrap.className =
`cloud-auth-wrap cloud-auth-wrap--${variant} hidden`;

const emailInputId =
variant === "inline"
? "cloud-auth-email-inline"
: "cloud-auth-email-header";

wrap.innerHTML = `
<div class="cloud-auth-logged-out">
<input type="email" id="${emailInputId}" name="email" class="cloud-auth-email" placeholder="email" autocomplete="email" inputmode="email"/>
<button type="button" class="cloud-auth-send">Войти</button>
</div>
<div class="cloud-auth-desktop-link hidden">
<p class="cloud-auth-desktop-link-help">Если ссылка открылась в браузере — скопируйте адрес страницы и вставьте:</p>
<input type="text" class="cloud-auth-paste-link" placeholder="https://… или multichart://…" autocomplete="off" spellcheck="false"/>
<button type="button" class="cloud-auth-paste-submit">Войти по ссылке</button>
</div>
<div class="cloud-auth-logged-in hidden">
<span class="cloud-auth-email-label"></span>
<button type="button" class="cloud-auth-out">Выйти</button>
</div>
<div class="cloud-telegram-wrap hidden">
<p class="cloud-telegram-title">Telegram для алертов</p>
<div class="cloud-telegram-connected hidden" role="status">
<p class="cloud-telegram-connected-text"></p>
</div>
<div class="cloud-telegram-setup">
<p class="cloud-telegram-help">Введите Chat ID. Без Chat ID алерты недоступны.</p>
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
<div class="cloud-telegram-actions">
<button type="button" class="cloud-telegram-edit hidden">Изменить Chat ID</button>
<button type="button" class="cloud-telegram-clear">Отключить Telegram</button>
</div>
</div>
<p class="cloud-auth-hint hidden"></p>
`;

host.appendChild(wrap);

const emailInput =
wrap.querySelector(".cloud-auth-email");
const sendBtn =
wrap.querySelector(".cloud-auth-send");
const desktopLinkWrap =
wrap.querySelector(".cloud-auth-desktop-link");
const pasteLinkInput =
wrap.querySelector(".cloud-auth-paste-link");
const pasteLinkBtn =
wrap.querySelector(".cloud-auth-paste-submit");
const outBtn =
wrap.querySelector(".cloud-auth-out");
const hintEl =
wrap.querySelector(".cloud-auth-hint");
const loggedOut =
wrap.querySelector(".cloud-auth-logged-out");
const loggedIn =
wrap.querySelector(".cloud-auth-logged-in");
const emailLabel =
wrap.querySelector(".cloud-auth-email-label");
const tgWrap =
wrap.querySelector(".cloud-telegram-wrap");
const tgSetup =
wrap.querySelector(".cloud-telegram-setup");
const tgConnected =
wrap.querySelector(".cloud-telegram-connected");
const tgConnectedText =
wrap.querySelector(".cloud-telegram-connected-text");
const tgInput =
wrap.querySelector(".cloud-telegram-chat-id");
const tgSave =
wrap.querySelector(".cloud-telegram-save");
const tgEdit =
wrap.querySelector(".cloud-telegram-edit");
const tgClear =
wrap.querySelector(".cloud-telegram-clear");

let tgLoadedForEmail = "";
let tgEditMode =
false;

function telegramConnectedMessage(){

const account =
getAuthUiEmail() || "аккаунт";

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
showConnected
);
tgConnected?.classList.toggle(
"hidden",
!showConnected
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

function setTelegramUiLocked(locked){

tgInput && (tgInput.disabled = !!locked);
tgSave && (tgSave.disabled = !!locked);
tgEdit && (tgEdit.disabled = !!locked);
tgClear && (tgClear.disabled = !!locked);

}

async function refreshTelegramOne(){

if(
variant !== "panel" ||
!isAuthUiLoggedIn()
){
tgWrap?.classList.add("hidden");
tgLoadedForEmail = "";
tgEditMode = false;
return;
}

tgWrap?.classList.remove("hidden");

const email =
getAuthUiEmail() || "";

if(
tgLoadedForEmail === email &&
tgInput?.dataset.loaded === "1"
){
return;
}

setTelegramUiLocked(true);

try{
const chatId =
await getTelegramChatId();
const hasChatId =
chatId != null;

if(tgInput){
tgInput.value =
hasChatId ? String(chatId) : "";
tgInput.dataset.loaded = "1";
}

applyTelegramUiMode(
hasChatId
);
tgLoadedForEmail = email;
}catch{
if(tgInput){
tgInput.dataset.loaded = "0";
}
applyTelegramUiMode(
false
);
}finally{
setTelegramUiLocked(false);
}

}

function setHint(text, isError){

hintEl.textContent = text || "";
hintEl.classList.toggle(
"cloud-auth-hint--error",
!!isError
);
hintEl.classList.toggle(
"hidden",
!text
);

}

function refreshOne(){

const settingsWrap =
document.getElementById("header-settings-wrap");
const showAuthUi =
cloudEnvConfigured ||
isCloudSyncEnabled();

if(variant === "panel"){
settingsWrap?.classList.remove("hidden");
}

if(!showAuthUi){
wrap.classList.remove("hidden");
loggedIn.classList.add("hidden");
loggedOut.classList.remove("hidden");
setHint(
"Синхронизация недоступна: нет ключей Supabase. Локально — заполните js/supabase-env.js.",
true
);
return;
}

wrap.classList.remove("hidden");

if(isAuthUiLoggedIn()){

loggedOut.classList.add("hidden");
loggedIn.classList.remove("hidden");
desktopLinkWrap?.classList.add(
"hidden"
);
emailLabel.textContent =
getAuthUiEmail() || "Аккаунт";

setHint(
"Избранное и рисунки синхронизируются. Ниже — Chat ID для алертов в Telegram.",
false
);
void refreshTelegramOne();

}else{

loggedIn.classList.add("hidden");
loggedOut.classList.remove("hidden");
desktopLinkWrap?.classList.toggle(
"hidden",
!isDesktopShell()
);
if(emailInput){
emailInput.value =
getAuthUiEmail() || "";
}

if(cloudSdkError){
setHint(cloudSdkError, true);
}else if(
hasAuthCallbackInUrl()
){
setHint(
"Завершаем вход по ссылке…",
false
);
}else{
setHint("", false);
}

tgWrap?.classList.add("hidden");
tgLoadedForEmail = "";
tgEditMode = false;

}

}

const submitAuthEmail = async()=>{

const email =
emailInput?.value?.trim();

if(!email){
setHint(
"Введите email.",
true
);
return;
}

rememberAuthEmail(email);
sendBtn.disabled = true;
setHint(
"Отправляем ссылку…",
false
);

try{

const redirectTo =
await signInWithEmailOtp(email);

if(
isDesktopShell()
){
desktopLinkWrap?.classList.remove(
"hidden"
);
setHint(
"Ссылка отправлена. Нажмите на ссылку в письме на этом Mac — откроется Multichart. Если откроется браузер, скопируйте адрес и вставьте ниже.",
false
);
}else{
setHint(
`Ссылка отправлена. Откройте письмо на этом устройстве. После входа откроется: ${redirectTo}`,
false
);
}

}catch(err){

setHint(
err?.message || "Не удалось отправить ссылку.",
true
);

}

sendBtn.disabled = false;

};

sendBtn?.addEventListener("click", submitAuthEmail);

const submitPastedAuthLink = async()=>{

const raw =
pasteLinkInput?.value?.trim();

if(
!raw
){
setHint(
"Вставьте ссылку из письма или из адресной строки браузера.",
true
);
return;
}

pasteLinkBtn.disabled =
true;
setHint(
"Входим по ссылке…",
false
);

try{
const result =
await completeAuthFromCallbackUrl(
raw
);

if(
result.ok
){
cloudSdkError =
"";
setHint(
"Вход выполнен.",
false
);
pasteLinkInput.value =
"";
}else{
setHint(
result.message ||
"Не удалось войти по ссылке.",
true
);
}

}catch(
err
){
setHint(
err?.message ||
"Не удалось войти по ссылке.",
true
);
}

pasteLinkBtn.disabled =
false;
refreshAuthUi();

};

pasteLinkBtn?.addEventListener(
"click",
()=>{
void submitPastedAuthLink();
}
);

pasteLinkInput?.addEventListener(
"keydown",
e=>{

if(
e.key !==
"Enter"
){
return;
}

e.preventDefault();
void submitPastedAuthLink();

}
);

emailInput?.addEventListener(
"keydown",
e=>{

if(
e.key !== "Enter"
){
return;
}

e.preventDefault();
void submitAuthEmail();

}
);

tgSave?.addEventListener("click", async()=>{

if(!isAuthUiLoggedIn()){
setHint("Войдите в аккаунт, затем сохраните Chat ID.", true);
return;
}

const value =
tgInput?.value?.trim() || "";

setTelegramUiLocked(true);

if(
!value
){
setHint(
"Введите Chat ID из сообщения бота.",
true
);
setTelegramUiLocked(false);
return;
}

try{
await saveTelegramChatId(value);
tgEditMode = false;
tgLoadedForEmail = "";
setHint(
"Избранное и рисунки синхронизируются. Ниже — Chat ID для алертов в Telegram.",
false
);
await refreshTelegramOne();
}catch(err){
setHint(
err?.message || "Не удалось сохранить Chat ID.",
true
);
}finally{
setTelegramUiLocked(false);
}

});

tgEdit?.addEventListener("click", ()=>{

tgEditMode = true;
applyTelegramUiMode(
false
);
setHint("", false);

});

tgClear?.addEventListener("click", async()=>{

if(!isAuthUiLoggedIn()){
return;
}

if(
!window.confirm(
"Отключить Telegram? Алерты в боте приходить не будут."
)
){
return;
}

setTelegramUiLocked(true);

try{
await clearTelegramChatId();
tgEditMode = false;
tgLoadedForEmail = "";
if(tgInput){
tgInput.value = "";
}
applyTelegramUiMode(
false
);
setHint(
"Telegram отключён. Без Chat ID алерты недоступны.",
false
);
}catch(err){
setHint(
err?.message || "Не удалось отключить Telegram.",
true
);
}finally{
setTelegramUiLocked(false);
}

});

outBtn?.addEventListener(
"click",
async e=>{

e.preventDefault();
e.stopPropagation();

outBtn.disabled = true;

try{

await signOutCloud();

}catch(err){
console.warn(
"signOut:",
err
);
}

outBtn.disabled = false;
closeSettingsDropdown();

}
);

outBtn?.addEventListener(
"mousedown",
e=>{
e.stopPropagation();
}
);

return {
wrap,
refreshOne,
emailInput
};

}

function mountAuthUi(){

if(!pageHasCloudAuth()){
return ()=>{};
}

const panels = [];

const headerPanel =
createAuthPanel(
document.getElementById("cloud-settings-mount"),
"panel"
);

if(headerPanel){
panels.push(headerPanel);
}

const mobileAuthHost =
document.getElementById(
"cloud-settings-mount-mobile"
);

if(
mobileAuthHost &&
!mobileAuthHost.querySelector(
".cloud-auth-wrap"
)
){

const mobilePanel =
createAuthPanel(
mobileAuthHost,
"panel"
);

if(mobilePanel){
panels.push(mobilePanel);
}

}

if(!panels.length){
return ()=>{};
}

setupSettingsDropdown();

function refreshAll(){

panels.forEach(p=>{
p.refreshOne();
});

window.dispatchEvent(
new CustomEvent(
"draw-tools-access-changed"
)
);

}

onCloudSyncChange(()=>{
refreshAll();
void syncSystemAdminNavLinks();
});
refreshAll();

return refreshAll;

}

let refreshAuthUi = ()=>{};
let initPromise = null;
let authUiMounted = false;

async function initAuthUiInternal(){

bindDesktopAuthCallback();

try{
cloudEnvConfigured =
await isSupabaseConfigured();
}catch{
cloudEnvConfigured = false;
}

if(!authUiMounted){
refreshAuthUi = mountAuthUi() || (()=>{});
refreshSettingsAuthUi = refreshAuthUi;
authUiMounted = true;
}

refreshAuthUi();

try{
await initCloudSync();
cloudSdkError = "";

if(
!isCloudLoggedIn() &&
hasAuthCallbackInUrl()
){
const recovered =
await recoverAuthSessionFromUrl();

if(
!recovered &&
hasAuthCallbackInUrl()
){
cloudSdkError =
"Ссылка из письма не сработала. Запросите новую или откройте в том же браузере, где вводили email.";
}
}

}catch(err){
console.warn("cloud sync init:", err);
cloudSdkError =
cloudEnvConfigured
? "Не удалось подключить облако. Обновите страницу."
: "";
}

refreshAuthUi();

void syncSystemAdminNavLinks();

}

function removeSystemAdminNavLinks(){

document.querySelectorAll(
"[data-system-admin-link]"
).forEach(node=>{
node.remove();
});

}

function createSystemAdminNavLink(){

const link =
document.createElement("a");

link.href = "/system";
link.className = "header-settings-system-link";
link.setAttribute(
"data-system-admin-link",
"1"
);
link.textContent = "Системные настройки";

return link;

}

function getSystemAdminNavLinkHosts(){

const hosts = [];

const dropdown =
document.getElementById(
"header-settings-dropdown"
);

if(dropdown){
hosts.push(dropdown);
}

const coinsNavSettings =
document.querySelector(
"#coins-nav-panel .coins-nav-settings"
);

if(coinsNavSettings){
hosts.push(coinsNavSettings);
}

return hosts;

}

export async function syncSystemAdminNavLinks(){

try{

removeSystemAdminNavLinks();

if(
!await isSystemAdminUser()
){
return;
}

const hosts =
getSystemAdminNavLinkHosts();

if(
!hosts.length
){
return;
}

hosts.forEach(host=>{
host.appendChild(
createSystemAdminNavLink()
);
});

}catch{
/* ignore */
}

}

export function ensureCloudReady(){

if(!initPromise){
initPromise = Promise.race([
initAuthUiInternal(),
new Promise(resolve=>{
setTimeout(
()=>{

if(
!isCloudLoggedIn() &&
!readAlertTokenSync()?.user
){
console.warn(
"[Multichart] cloud init timeout — страница продолжит без ожидания"
);
}else{
console.info(
"[Multichart] синхронизация с облаком продолжается в фоне"
);
}

resolve();
},
8000
);
})
]);
}

return initPromise;

}

export async function initAuthUi(){

return ensureCloudReady();

}

export async function openCloudSettingsPanel(){

await ensureCloudReady();

const wrap =
document.getElementById("header-settings-wrap");
const dropdown =
document.getElementById("header-settings-dropdown");
const btn =
document.getElementById("header-settings-btn");

if(
!wrap ||
!dropdown ||
!btn ||
!(
cloudEnvConfigured ||
isCloudSyncEnabled()
)
){
return false;
}

openSettingsDropdown();

wrap.querySelector(".cloud-auth-email")?.focus();
return true;

}

export async function focusAlertsLogin(){

return openCloudSettingsPanel();

}
