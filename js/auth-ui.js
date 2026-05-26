import {
initCloudSync,
isCloudSyncEnabled,
isCloudLoggedIn,
getCloudUserEmail,
onCloudSyncChange,
signInWithEmailOtp,
signOutCloud,
recoverAuthSessionFromUrl,
hasAuthCallbackInUrl
} from "./cloud-sync.js?v=13";

import {
isSupabaseConfigured
} from "./supabase-client.js?v=5";

import {
readAlertTokenSync
} from "./alert-auth-cache.js?v=4";

let cloudEnvConfigured = false;
let cloudSdkError = "";

function isAlertsPage(){

return window.location.pathname.includes("/alerts");

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
path.endsWith("/index.html") ||
path.endsWith("/index")
){
return true;
}

return (
path === "/alerts" ||
path === "/alerts/" ||
path.endsWith("/alerts") ||
path.endsWith("/alerts/") ||
path.includes("coins.html") ||
path.endsWith("/coins") ||
path.includes("terminal.html") ||
path.endsWith("/terminal")
);

}

let settingsDropdownReady = false;
let refreshSettingsAuthUi = ()=>{};

function isSettingsInlineMode(
wrap
){

return !!(
wrap?.closest(
".screener-nav-panel"
) &&
window.matchMedia(
"(max-width: 640px)"
).matches
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
document.createComment(
"settings-dropdown-anchor"
);

anchor.setAttribute(
"data-settings-dropdown-anchor",
""
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
!wrap ||
dropdown.classList.contains("hidden")
){
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

function closeSettingsDropdown(){

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

if(isCloudLoggedIn()){
return true;
}

return !!readAlertTokenSync()?.user;

}

function getAuthUiEmail(){

return (
getCloudUserEmail() ||
readAlertTokenSync()?.user?.email ||
""
);

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

window.addEventListener(
"resize",
()=>{
const drop =
document.getElementById("header-settings-dropdown");
const gear =
document.getElementById("header-settings-btn");
const shell =
document.getElementById("header-settings-wrap");

if(
drop &&
gear &&
shell &&
!drop.classList.contains("hidden")
){
syncSettingsDropdownPlacement();
}
},
{ passive: true }
);

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
<div class="cloud-auth-logged-in hidden">
<span class="cloud-auth-email-label"></span>
<button type="button" class="cloud-auth-out">Выйти</button>
</div>
<p class="cloud-auth-hint hidden"></p>
`;

host.appendChild(wrap);

const emailInput =
wrap.querySelector(".cloud-auth-email");
const sendBtn =
wrap.querySelector(".cloud-auth-send");
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
emailLabel.textContent =
getAuthUiEmail() || "Аккаунт";

setHint(
variant === "inline" && isAlertsPage()
? "Откройте ссылку из письма на этом устройстве, затем укажите Chat ID ниже."
: isAlertsPage()
? "После входа сохраните Chat ID ниже."
: "Избранное и рисунки синхронизируются между устройствами.",
false
);

}else{

loggedIn.classList.add("hidden");
loggedOut.classList.remove("hidden");

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

}

}

sendBtn?.addEventListener("click", async()=>{

const email =
emailInput?.value?.trim();

if(!email){
setHint(
"Введите email.",
true
);
return;
}

sendBtn.disabled = true;
setHint(
"Отправляем ссылку…",
false
);

try{

const redirectTo =
await signInWithEmailOtp(email);

setHint(
`Ссылка отправлена. Откройте письмо на этом устройстве. После входа откроется: ${redirectTo}`,
false
);

}catch(err){

setHint(
err?.message || "Не удалось отправить ссылку.",
true
);

}

sendBtn.disabled = false;

});

outBtn?.addEventListener("click", async()=>{

await signOutCloud();
closeSettingsDropdown();

});

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

if(isAlertsPage()){

const inlinePanel =
createAuthPanel(
document.getElementById("alerts-inline-auth-mount"),
"inline"
);

if(inlinePanel){
panels.push(inlinePanel);
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

}

onCloudSyncChange(refreshAll);
refreshAll();

return refreshAll;

}

let refreshAuthUi = ()=>{};
let initPromise = null;
let authUiMounted = false;

async function initAuthUiInternal(){

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

}

export function ensureCloudReady(){

if(!initPromise){
initPromise = Promise.race([
initAuthUiInternal(),
new Promise(resolve=>{
setTimeout(
()=>{
console.warn(
"[Multichart] cloud init timeout — страница продолжит без ожидания"
);
resolve();
},
10000
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

const loginBlock =
document.getElementById("alerts-telegram-login");

loginBlock?.classList.remove("hidden");

await ensureCloudReady();

loginBlock?.scrollIntoView({
behavior: "smooth",
block: "nearest"
});

const email =
document.getElementById(
"cloud-auth-email-inline"
) ||
document.querySelector(
"#alerts-inline-auth-mount .cloud-auth-email"
);

if(email){
email.focus();
return true;
}

return openCloudSettingsPanel();

}
