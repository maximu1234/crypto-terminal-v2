import {
initCloudSync,
isCloudSyncEnabled,
isCloudLoggedIn,
getCloudUserEmail,
onCloudSyncChange,
signInWithEmailOtp,
signOutCloud
} from "./cloud-sync.js?v=5";

function mountAuthUi(){

const host =
document.getElementById("header-controls") ||
document.getElementById("controls");

if(
!host ||
document.getElementById("cloud-auth-wrap")
){
return;
}

const wrap =
document.createElement("div");

wrap.id = "cloud-auth-wrap";
wrap.className = "cloud-auth-wrap hidden";

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

host.prepend(wrap);

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
return;
}

wrap.classList.remove("hidden");

if(isCloudLoggedIn()){

loggedOut.classList.add("hidden");
loggedIn.classList.remove("hidden");
emailLabel.textContent =
getCloudUserEmail() || "Аккаунт";
setHint(
"Избранное синхронизируется между устройствами.",
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
`Ссылка отправлена. Откройте письмо на этом iPad/устройстве. После входа откроется: ${redirectTo}`,
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
