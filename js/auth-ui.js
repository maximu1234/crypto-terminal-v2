import {
initCloudSync,
isCloudSyncEnabled,
isCloudLoggedIn,
getCloudUserEmail,
onCloudSyncChange,
signInWithEmailOtp,
signOutCloud
} from "./cloud-sync.js?v=7";

function isMainPage(){

const path =
window.location.pathname;

return (
path === "/" ||
path.endsWith("/index.html") ||
path.endsWith("/index")
);

}

function pageHasCloudAuth(){

const path =
window.location.pathname;

if(isMainPage()){
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

function mountAuthUi(){

if(!pageHasCloudAuth()){
return ()=>{};
}

const settingsMount =
document.getElementById("cloud-settings-mount");
const settingsWrap =
document.getElementById("header-settings-wrap");

const host =
settingsMount;

if(
!host ||
document.getElementById("cloud-auth-wrap")
){
return;
}

const wrap =
document.createElement("div");

wrap.id = "cloud-auth-wrap";

wrap.className =
"cloud-auth-wrap cloud-auth-wrap--panel hidden";

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

setupSettingsDropdown();

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

function refresh(){

if(!isCloudSyncEnabled()){
wrap.classList.add("hidden");
settingsWrap?.classList.add("hidden");
return;
}

wrap.classList.remove("hidden");
settingsWrap?.classList.remove("hidden");

if(isCloudLoggedIn()){

loggedOut.classList.add("hidden");
loggedIn.classList.remove("hidden");
emailLabel.textContent =
getCloudUserEmail() || "Аккаунт";
const onAlerts =
window.location.pathname.includes("/alerts");

setHint(
onAlerts
? "После входа сохраните Chat ID ниже. Рисунки и избранное тоже синхронизируются."
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
refresh();

});

onCloudSyncChange(refresh);
refresh();

return refresh;

}

let refreshAuthUi = ()=>{};
let initPromise = null;

async function initAuthUiInternal(){

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
