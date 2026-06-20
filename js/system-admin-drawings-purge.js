import {
readAlertTokenSync
} from "./alert-auth-cache.js?v=7";

import {
normalizeAlertWorkerBaseUrl
} from "./alert-worker-url.js?v=1";

import {
fetchWithTimeout
} from "./drawings-cloud/worker-client.js?v=7";

const CONFIRM_PHRASE =
"PURGE_ALL_DRAWINGS";

async function getWorkerBaseUrl(){

try{
const env =
await import("./supabase-env.js?v=5");
return normalizeAlertWorkerBaseUrl(
env.ALERT_WORKER_URL || ""
);
}catch{
return "";
}

}

/**
 * @param {{ statusEl?: HTMLElement | null }} opts
 */
export function bindDrawingsGlobalPurge({
statusEl
}){

const btn =
document.getElementById(
"system-purge-all-drawings-btn"
);

if(
!btn
){
return;
}

btn.addEventListener(
"click",
async()=>{

if(
btn.disabled
){
return;
}

const ok =
window.confirm(
"Удалить все рисунки всех пользователей из Supabase?\n\n" +
"Будут очищены таблица user_drawings и legacy JSON в user_settings.\n" +
"Действие необратимо."
);

if(
!ok
){
return;
}

const typed =
window.prompt(
`Введите ${CONFIRM_PHRASE} для подтверждения:`
);

if(
typed !==
CONFIRM_PHRASE
){
if(
statusEl
){
statusEl.textContent =
"Отменено: неверная фраза подтверждения.";
statusEl.style.color =
"#fca5a5";
}
return;
}

const base =
await getWorkerBaseUrl();

if(
!base
){
if(
statusEl
){
statusEl.textContent =
"Не задан ALERT_WORKER_URL в supabase-env.js.";
statusEl.style.color =
"#fca5a5";
}
return;
}

const token =
readAlertTokenSync()?.token;

if(
!token
){
if(
statusEl
){
statusEl.textContent =
"Нужен вход через шестерёнку в шапке.";
statusEl.style.color =
"#fca5a5";
}
return;
}

btn.disabled =
true;

if(
statusEl
){
statusEl.textContent =
"Удаление…";
statusEl.style.color =
"";
}

try{
const res =
await fetchWithTimeout(
`${base}/admin/purge-all-drawings`,
{
method: "POST",
headers: {
Authorization: `Bearer ${token}`,
"Content-Type": "application/json"
},
body: JSON.stringify({
confirm: CONFIRM_PHRASE
})
},
60000
);

let data =
{};

try{
data =
await res.json();
}catch{
data = {};
}

if(
!res.ok ||
!data.ok
){
throw new Error(
data.error ||
`HTTP ${res.status}`
);
}

if(
statusEl
){
statusEl.textContent =
`Готово: удалено ${data.deletedDrawings ?? 0} строк в user_drawings` +
(
Number.isFinite(
data.clearedLegacySettings
)
? `, сброшено ${data.clearedLegacySettings} user_settings.`
: "."
);
statusEl.style.color =
"#86efac";
}

}catch(
err
){
console.warn(
"[system] purge all drawings:",
err
);

if(
statusEl
){
statusEl.textContent =
err?.message === "admin_required"
? "Нет прав: email не в SYSTEM_ADMIN_EMAIL на Railway."
: (
err?.message ||
"Ошибка удаления"
);
statusEl.style.color =
"#fca5a5";
}

}finally{
btn.disabled =
false;

}

}
);

}
