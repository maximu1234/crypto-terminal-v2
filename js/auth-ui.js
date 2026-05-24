import {
initCloudSync,
isCloudSyncEnabled,
isCloudLoggedIn,
getCloudUserEmail,
onCloudSyncChange,
signInWithEmailOtp,
signOutCloud
} from "./cloud-sync.js?v=7";

function isAlertsPage(){

return window.location.pathname.includes("/alerts");

}

function pageHasCloudAuth(){

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
path.endsWith("/alerts/")
);

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

const close = ()=>{

dropdown.classList.add("hidden");
btn.setAttribute(
"aria-expanded",
"false"
);

};

const open = ()=>{

dropdown.classList.remove("hidden");
btn.setAttribute(
"aria-expanded",
"true"
);

};

btn.addEventListener("click", e=>{

e.stopPropagation();
e.preventDefault();

if(
dropdown.classList.contains("hidden")
){
open();
}else{
close();
}

});

document.addEventListener("click", e=>{

if(
wrap.contains(e.target)
){
return;
}

close();

});

document.addEventListener("keydown", e=>{

if(e.key === "Escape"){
close();
}

});

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

wrap.innerHTML = `
<div class="cloud-auth-logged-out">
<input type="email" class="cloud-auth-email" placeholder="email" autocomplete="email" inputmode="email"/>
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

if(!isCloudSyncEnabled()){
wrap.classList.add("hidden");

if(variant === "panel"){
settingsWrap?.classList.add("hidden");
}

return;
}

wrap.classList.remove("hidden");

if(variant === "panel"){
settingsWrap?.classList.remove("hidden");
}

if(isCloudLoggedIn()){

loggedOut.classList.add("hidden");
loggedIn.classList.remove("hidden");
emailLabel.textContent =
getCloudUserEmail() || "Аккаунт";

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
setHint("", false);

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

async function initAuthUiInternal(){

setupSettingsDropdown();
await initCloudSync();
refreshAuthUi = mountAuthUi() || (()=>{});
refreshAuthUi();

}

export function ensureCloudReady(){

if(!initPromise){
initPromise = initAuthUiInternal();
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
!isCloudSyncEnabled()
){
return false;
}

wrap.classList.remove("hidden");
dropdown.classList.remove("hidden");
btn.setAttribute(
"aria-expanded",
"true"
);

wrap.querySelector(".cloud-auth-email")?.focus();
return true;

}

export async function focusAlertsLogin(){

await ensureCloudReady();

const guest =
document.getElementById("alerts-telegram-guest");

guest?.scrollIntoView({
behavior: "smooth",
block: "nearest"
});

const email =
document.querySelector(
"#alerts-inline-auth-mount .cloud-auth-email"
);

if(email){
email.focus();
return true;
}

return openCloudSettingsPanel();

}
