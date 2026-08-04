import {
initCloudSync,
isCloudSyncEnabled,
isCloudLoggedIn,
isCloudLoggedInEffective,
getCloudUserEmail,
onCloudSyncChange,
getCloudAuthProblem,
signInWithEmailOtp,
signOutCloud,
recoverAuthSessionFromUrl,
completeAuthFromCallbackUrl,
hasAuthCallbackInUrl,
exportAuthSessionTransferString,
importAuthSessionTransferString
} from "./cloud-sync.js?v=64";

import {
isSupabaseConfigured
} from "./supabase-client.js?v=9";

import {
readAlertTokenSync
} from "./alert-auth-cache.js?v=7";

import {
isAlertsPage
} from "./cloud-sync-throttle.js?v=3";

import {
initAppSettingsWindow,
refreshAppSettingsAdminNav,
openAppSettingsWindow
} from "./app-settings-window.js?v=16";

import {
ensureHeaderSettingsShell
} from "./header-settings-shell.js?v=4";

let cloudEnvConfigured = false;
let cloudSdkError = "";

function isDesktopShell(){

return !!window.cryptoTerminalDesktop?.isDesktop;

}

/** Standalone Algo Bot (lite) — paste session; Multichart — copy session. */
function isAlgoBotShell(){

if(
document.body?.classList?.contains(
"algo-bot-lite-layout"
)
){
return true;
}

if(
/\bbotLite=1\b/i.test(
location.search ||
""
)
){
return true;
}

const desktop =
window.cryptoTerminalDesktop;

if(
/algo-bot/i.test(
String(
desktop?.appId ||
desktop?.productName ||
""
)
)
){
return true;
}

return false;

}

const ALGO_BOT_SYNC_OK_KEY =
"algo_bot_multichart_sync_ok_v1";

/** Only for this page session — never sticky across relaunch. */
let algoBotSyncOkUntil =
0;

function readAlgoBotSyncOk(){

return Date.now() <
algoBotSyncOkUntil;

}

function writeAlgoBotSyncOk(
ok
){

try{
localStorage.removeItem(
ALGO_BOT_SYNC_OK_KEY
);
}catch{
/* ignore */
}

algoBotSyncOkUntil =
ok
? Date.now() +
12 *
1000
: 0;

}

let desktopAuthBound =
false;

/** Подсказка во время обработки magic-link (не затирать refreshOne). */
let authLinkProgress =
null;

function setAuthLinkProgress(
text,
isError =
false
){

authLinkProgress =
text
? {
text,
isError:
!!isError
}
: null;

for(
const el of document.querySelectorAll(
".cloud-auth-hint"
)
){
el.textContent =
text ||
"";
el.classList.toggle(
"cloud-auth-hint--error",
!!isError
);
el.classList.toggle(
"cloud-auth-hint--progress",
!!text &&
!isError
);
el.classList.toggle(
"hidden",
!text
);
}

}

function paintAuthLinkProgress(
text
){

setAuthLinkProgress(
text,
false
);

return new Promise(
resolve=>{
requestAnimationFrame(
()=>{
requestAnimationFrame(
()=>
resolve()
);
}
);
}
);

}

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
await openAppSettingsWindow(
"sync"
);
}catch{
/* ignore */
}

await paintAuthLinkProgress(
"Ссылка получена"
);

try{
const result =
await completeAuthFromCallbackUrl(
url,
{
onProgress:
msg=>{
setAuthLinkProgress(
msg,
false
);
}
}
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
setAuthLinkProgress(
cloudSdkError,
true
);
}

}catch(
err
){
cloudSdkError =
err?.message ||
"Не удалось войти по ссылке.";
setAuthLinkProgress(
cloudSdkError,
true
);
}

if(
!cloudSdkError
){
authLinkProgress =
null;
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
path.includes("listings.html") ||
path.endsWith("/listings") ||
path.includes("trade-calculator.html") ||
path.endsWith("/trade-calculator") ||
path.includes("statistics.html") ||
path.endsWith("/statistics") ||
path === "/system" ||
path.endsWith("/system") ||
path.includes("/system/")
);

}

let settingsDropdownReady = false;
let settingsToggleDelegatedBound =
false;
let refreshSettingsAuthUi = ()=>{};
let settingsCloudPanel = null;

const AUTH_UI_LAST_EMAIL_KEY =
"cloud_auth_last_email_v1";

function isSettingsInlineMode(
wrap
){

return false;

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
isSettingsInlineMode(wrap)
){
return false;
}

/* Algo Bot lite: gear lives in #topbar (fixed height + overflow) — always portal. */
if(
isAlgoBotShell()
){
return true;
}

let node =
wrap.parentElement;

while(
node &&
node !== document.body
){

const style =
getComputedStyle(node);

const ox =
style.overflowX;
const oy =
style.overflowY;
const o =
style.overflow;

if(
o === "hidden" ||
o === "clip" ||
o === "auto" ||
o === "scroll" ||
ox === "hidden" ||
ox === "clip" ||
ox === "auto" ||
ox === "scroll" ||
oy === "hidden" ||
oy === "clip" ||
oy === "auto" ||
oy === "scroll"
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

const authHost =
document.getElementById(
"cloud-settings-mount"
);

/*
  On slow boots (servers) gear can open before initAuthUi finishes —
  mount/show the account panel on demand so we don't show only «Аккаунт».
*/
if(
authHost &&
!authHost.querySelector(
".cloud-auth-wrap"
)
){
const created =
createAuthPanel(
authHost,
"panel"
);

if(
created
){
created.refreshOne?.();
}
}

authHost?.querySelector(
".cloud-auth-wrap"
)?.classList.remove(
"hidden"
);

refreshSettingsAuthUi();

if(
isAlgoBotShell()
){
void import(
"./algo-trading/bot-session-log-server-ui.js?v=8"
).then(
mod=>{
mod.mountSessionLogServerSettings(
document.getElementById(
"algo-session-log-server-mount"
)
);
}
).catch(
()=>{}
);

portalDropdownToBody(
dropdown,
wrap
);
dropdown.classList.add(
"header-settings-dropdown--portaled"
);
dropdown.classList.remove(
"header-settings-dropdown--inline"
);

const place =
()=>{
positionPortaledDropdown(
btn,
dropdown
);
};

place();
requestAnimationFrame(
()=>{
place();
requestAnimationFrame(
place
);
}
);
}else{
scheduleSettingsDropdownPlacement();
}

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
typeof e.stopImmediatePropagation ===
"function"
){
e.stopImmediatePropagation();
}

/* Standalone Algo Bot: inline account / session paste (no Multichart settings window). */
if(
isAlgoBotShell()
){
const dropdown =
document.getElementById(
"header-settings-dropdown"
);
const open =
dropdown &&
!dropdown.classList.contains(
"hidden"
);

if(
open
){
closeSettingsDropdown();
}else{
openSettingsDropdown();
}

return;
}

closeSettingsDropdown();
void openAppSettingsWindow(
"sync"
);

}

if(
!settingsToggleDelegatedBound
){
document.addEventListener(
"click",
e=>{
const gearBtn =
e.target?.closest?.(
"#header-settings-btn"
);
if(
!gearBtn
){
return;
}
onSettingsToggle(e);
},
true
);
settingsToggleDelegatedBound =
true;
}

if(
!btn.dataset.settingsToggleBound
){
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
btn.dataset.settingsToggleBound =
"1";
}

if(settingsDropdownReady){
return;
}

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
<p class="cloud-auth-desktop-link-help">Вставьте ссылку из письма (Copy link) или адрес после перехода в браузере:</p>
<input type="text" class="cloud-auth-paste-link" placeholder="https://…supabase…/verify?token=… или multichart://" autocomplete="off" spellcheck="false"/>
<button type="button" class="cloud-auth-paste-submit">Войти по ссылке</button>
</div>
<div class="cloud-auth-logged-in hidden">
<span class="cloud-auth-email-label"></span>
<button type="button" class="cloud-auth-out">Выйти</button>
<button type="button" class="cloud-auth-copy-session hidden">Скопировать сессию для Algo Bot</button>
</div>
<div class="cloud-auth-session-import hidden">
<p class="cloud-auth-session-import-help">Один шаг: в Multichart → Настройки → Аккаунт → «Скопировать сессию для Algo Bot», затем вставьте код сюда. Это полный вход (алерты, Telegram, удалённое управление). Не отправляйте строку в чаты.</p>
<textarea class="cloud-auth-session-paste" rows="3" placeholder="mcauth1.…" autocomplete="off" spellcheck="false"></textarea>
<button type="button" class="cloud-auth-session-apply">Применить сессию</button>
<p class="cloud-auth-session-sync-ok hidden">Синхронизация с приложением успешна</p>
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
const copySessionBtn =
wrap.querySelector(".cloud-auth-copy-session");
const sessionImportWrap =
wrap.querySelector(".cloud-auth-session-import");
const sessionPasteInput =
wrap.querySelector(".cloud-auth-session-paste");
const sessionApplyBtn =
wrap.querySelector(".cloud-auth-session-apply");
const sessionSyncOkEl =
wrap.querySelector(".cloud-auth-session-sync-ok");
const hintEl =
wrap.querySelector(".cloud-auth-hint");
const loggedOut =
wrap.querySelector(".cloud-auth-logged-out");
const loggedIn =
wrap.querySelector(".cloud-auth-logged-in");
const emailLabel =
wrap.querySelector(".cloud-auth-email-label");

function setHint(text, isError, isProgress = false){

hintEl.textContent = text || "";
hintEl.classList.toggle(
"cloud-auth-hint--error",
!!isError
);
hintEl.classList.toggle(
"cloud-auth-hint--progress",
!!isProgress &&
!isError
);
hintEl.classList.toggle(
"hidden",
!text
);

}

function paintSessionSyncOk(
show
){

sessionSyncOkEl?.classList.toggle(
"hidden",
!show
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

const algoBot =
isAlgoBotShell();

if(isAuthUiLoggedIn()){

loggedOut.classList.add("hidden");
loggedIn.classList.remove("hidden");
desktopLinkWrap?.classList.add(
"hidden"
);
emailLabel.textContent =
getAuthUiEmail() || "Аккаунт";

copySessionBtn?.classList.toggle(
"hidden",
!(
isDesktopShell() &&
!algoBot
)
);

/* Algo Bot: session paste is the login; keep for refresh/re-link. */
sessionImportWrap?.classList.toggle(
"hidden",
!(
isDesktopShell() &&
algoBot
)
);

paintSessionSyncOk(
algoBot &&
isDesktopShell() &&
readAlgoBotSyncOk()
);

if(
authLinkProgress
){
setHint(
authLinkProgress.text,
authLinkProgress.isError,
!authLinkProgress.isError
);
}else{
const authProblem =
getCloudAuthProblem();

if(
authProblem?.message
){
setHint(
authProblem.message,
true
);
}else{
setHint(
"",
false
);
}
}

}else{

loggedIn.classList.add("hidden");
copySessionBtn?.classList.add(
"hidden"
);

if(
algoBot
){
/* Session-only: no email OTP / magic-link in Algo Bot. */
loggedOut.classList.add(
"hidden"
);
desktopLinkWrap?.classList.add(
"hidden"
);
sessionImportWrap?.classList.toggle(
"hidden",
!isDesktopShell()
);
paintSessionSyncOk(
false
);
}else{
loggedOut.classList.remove(
"hidden"
);
desktopLinkWrap?.classList.toggle(
"hidden",
!isDesktopShell()
);
sessionImportWrap?.classList.add(
"hidden"
);
paintSessionSyncOk(
false
);
if(emailInput){
emailInput.value =
getAuthUiEmail() || "";
}
}

if(
authLinkProgress
){
setHint(
authLinkProgress.text,
authLinkProgress.isError,
!authLinkProgress.isError
);
}else if(cloudSdkError){
setHint(cloudSdkError, true);
}else if(
!algoBot &&
hasAuthCallbackInUrl()
){
setHint(
"Завершаем вход по ссылке…",
false,
true
);
}else if(
algoBot &&
isDesktopShell()
){
const authProblem =
getCloudAuthProblem();

if(
authProblem?.message
){
setHint(
authProblem.message,
true
);
}else{
setHint(
"Вставьте код сессии из Multichart — этого достаточно.",
false
);
}
}else{
const authProblem =
getCloudAuthProblem();

if(
authProblem?.message
){
setHint(
authProblem.message,
true
);
}else{
setHint("", false);
}
}

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
await paintAuthLinkProgress(
"Ссылка получена"
);

try{
const result =
await completeAuthFromCallbackUrl(
raw,
{
onProgress:
msg=>{
setAuthLinkProgress(
msg,
false
);
}
}
);

if(
result.ok
){
cloudSdkError =
"";
authLinkProgress =
null;
pasteLinkInput.value =
"";
}else{
cloudSdkError =
result.message ||
"Не удалось войти по ссылке.";
setAuthLinkProgress(
cloudSdkError,
true
);
}

}catch(
err
){
cloudSdkError =
err?.message ||
"Не удалось войти по ссылке.";
setAuthLinkProgress(
cloudSdkError,
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

copySessionBtn?.addEventListener(
"click",
async e=>{

e.preventDefault();
e.stopPropagation();

copySessionBtn.disabled =
true;
setHint(
"Копируем сессию…",
false,
true
);

try{

const token =
await exportAuthSessionTransferString();

await navigator.clipboard.writeText(
token
);
setHint(
"Сессия скопирована. Вставьте её в Algo Bot (Настройки → Применить сессию). Не отправляйте строку в чаты.",
false
);

}catch(
err
){
setHint(
err?.message ||
"Не удалось скопировать сессию.",
true
);
}

copySessionBtn.disabled =
false;

}
);

sessionApplyBtn?.addEventListener(
"click",
async e=>{

e.preventDefault();
e.stopPropagation();

const raw =
sessionPasteInput?.value?.trim() ||
"";

if(
!raw
){
setHint(
"Вставьте строку сессии из Multichart.",
true
);
return;
}

sessionApplyBtn.disabled =
true;
setHint(
"Применяем сессию…",
false,
true
);

try{

const result =
await importAuthSessionTransferString(
raw
);

if(
!result.ok
){
setHint(
result.message ||
"Не удалось применить сессию.",
true
);
return;
}

cloudSdkError =
"";
authLinkProgress =
null;

if(
sessionPasteInput
){
sessionPasteInput.value =
"";
}

writeAlgoBotSyncOk(
true
);
refreshAuthUi();
setHint(
result.message ||
"Синхронизация с приложением успешна",
false
);
window.setTimeout(
()=>{
writeAlgoBotSyncOk(
false
);
paintSessionSyncOk(
false
);
},
12 *
1000
);

/* Telegram probe — never block success UI (VPS can hang on REST). */
void (async()=>{
try{
const {
getTelegramChatId
} =
await import(
"./alerts-cloud/telegram-id.js?v=2"
);
const chatId =
await getTelegramChatId();

if(
!chatId
){
setHint(
"Сессия применена. Telegram Chat ID не найден — сначала привяжите Telegram в Multichart.",
true
);
}
}catch{
/* ignore */
}
})();

}catch(
err
){
setHint(
err?.message ||
"Не удалось применить сессию.",
true
);
}finally{
sessionApplyBtn.disabled =
false;
}

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

outBtn?.addEventListener(
"click",
async e=>{

e.preventDefault();
e.stopPropagation();

outBtn.disabled = true;

try{

await signOutCloud();
writeAlgoBotSyncOk(
false
);
paintSessionSyncOk(
false
);

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

export function mountCloudAuthPanelInSettings(
host
){

if(
!host
){
return null;
}

if(
settingsCloudPanel?.wrap?.isConnected
){
settingsCloudPanel.refreshOne?.();
return settingsCloudPanel;
}

settingsCloudPanel =
createAuthPanel(
host,
"panel"
);

if(
settingsCloudPanel
){
settingsCloudPanel.refreshOne?.();
}

return settingsCloudPanel;

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

const settingsPanel =
mountCloudAuthPanelInSettings(
document.getElementById(
"app-settings-cloud-auth-host"
)
);

if(settingsPanel){
panels.push(settingsPanel);
}

if(!panels.length){
return ()=>{};
}

setupSettingsDropdown();
initAppSettingsWindow();

function refreshAll(){

panels.forEach(p=>{
p.refreshOne();
});

/* Settings → Синхронизация монтируется лениво и не всегда в panels. */
settingsCloudPanel?.refreshOne?.();

window.dispatchEvent(
new CustomEvent(
"draw-tools-access-changed"
)
);

}

onCloudSyncChange(()=>{
refreshAll();
void refreshAppSettingsAdminNav();
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
ensureHeaderSettingsShell();
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

void refreshAppSettingsAdminNav();

}

function removeSystemAdminNavLinks(){

document.querySelectorAll(
"[data-system-admin-link]"
).forEach(node=>{
node.remove();
});

}

export async function syncSystemAdminNavLinks(){

removeSystemAdminNavLinks();
await refreshAppSettingsAdminNav();

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
/* cloud sync continues in background */
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

await openAppSettingsWindow(
"sync"
);

const emailInput =
document.querySelector(
"#app-settings-cloud-auth-host .cloud-auth-email"
);

if(
emailInput
){
emailInput.focus();
return true;
}

return false;

}

export async function focusAlertsLogin(){

return openCloudSettingsPanel();

}
