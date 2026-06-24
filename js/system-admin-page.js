import {
ensureCloudReady
} from "./auth-ui.js?v=28";

import {
ensureCloudLoginResolved,
getEffectiveCloudUserEmail
} from "./cloud-sync.js?v=39";

import {
isSystemAdminUser,
getSystemAdminEmails,
isLoggedInEffective
} from "./system-admin-access.js?v=3";

import {
getBybitRouteMode,
setBybitRouteMode,
bybitRouteModeLabel,
BYBIT_ROUTE_DIRECT,
BYBIT_ROUTE_PROXY
} from "./bybit-route-pref.js?v=2";

import {
bindSupabaseUsagePrefsForm
} from "./system-admin-supabase-prefs.js?v=1";

import {
bindDrawingsGlobalPurge
} from "./system-admin-drawings-purge.js?v=2";

import {
resetBybitEndpoints
} from "./bybit-fetch.js?v=17";

const rootEl =
document.getElementById("system-admin-root");

const guestEl =
document.getElementById("system-admin-guest");

const deniedEl =
document.getElementById("system-admin-denied");

const panelEl =
document.getElementById("system-admin-panel");

const statusEl =
document.getElementById("system-admin-status");

const emailEl =
document.getElementById("system-admin-email");

function showOnly(el){

[
guestEl,
deniedEl,
panelEl
].forEach(node=>{

if(
!node
){
return;
}

node.classList.toggle(
"hidden",
node !== el
);

});

}

function bindRouteForm(){

const form =
document.getElementById("system-bybit-route-form");

if(
!form
){
return;
}

const syncChecked =
()=>{

const mode =
getBybitRouteMode();

form.querySelectorAll(
'input[name="bybit-route"]'
).forEach(input=>{

input.checked =
input.value === mode;

});

if(
statusEl
){
statusEl.textContent =
`Сейчас: ${bybitRouteModeLabel(mode)}`;
}

};

syncChecked();

form.addEventListener(
"change",
e=>{

const input =
e.target;

if(
!input?.name ||
input.name !== "bybit-route"
){
return;
}

setBybitRouteMode(
input.value
);
resetBybitEndpoints();

syncChecked();

if(
statusEl
){
statusEl.textContent =
"Сохранено. Обновите главную/монеты, если графики уже открыты.";
}

}
);

const reloadBtn =
document.getElementById("system-admin-reload-site");

if(
reloadBtn
){

reloadBtn.addEventListener(
"click",
()=>{
window.location.href = "/screener.html";
}
);

}

}

async function init(){

await ensureCloudReady();

await ensureCloudLoginResolved(
12000
);

if(
!isLoggedInEffective()
){
showOnly(guestEl);
return;
}

const admin =
await isSystemAdminUser();

if(
!admin
){

const deniedEmailEl =
document.getElementById("system-admin-denied-email");

if(
deniedEmailEl
){
deniedEmailEl.textContent =
getEffectiveCloudUserEmail() || "—";
}

const hintEl =
document.getElementById("system-admin-denied-hint");

if(
hintEl
){
const admins =
await getSystemAdminEmails();

hintEl.textContent =
admins.length
? `Разрешены только: ${admins.join(", ")}`
: "В js/supabase-env.js или на Vercel не задан SYSTEM_ADMIN_EMAIL.";
}

showOnly(deniedEl);
return;
}

showOnly(panelEl);

if(
emailEl
){
emailEl.textContent =
getEffectiveCloudUserEmail() || "";
}

const admins =
await getSystemAdminEmails();

const metaEl =
document.getElementById("system-admin-admins-meta");

if(
metaEl
){
metaEl.textContent =
admins.length
? `Доступ: ${admins.join(", ")}`
: "SYSTEM_ADMIN_EMAIL не задан в supabase-env.js";
}

bindRouteForm();

const supabaseMount =
document.getElementById("system-supabase-usage-mount");
const supabaseStatus =
document.getElementById("system-supabase-usage-status");

bindSupabaseUsagePrefsForm(
supabaseMount,
supabaseStatus
);

const supabaseReload =
document.getElementById("system-supabase-reload-hint");

if(
supabaseReload
){
supabaseReload.addEventListener(
"click",
()=>{
window.location.href = "/screener.html";
}
);
}

bindDrawingsGlobalPurge({
statusEl: document.getElementById("system-drawings-purge-status")
});

}

init().catch(err=>{
console.error("system admin:", err);

if(
rootEl
){
rootEl.innerHTML =
`<div class="system-admin-denied"><h1>Ошибка</h1><p>${err?.message || err}</p></div>`;
}

});
