import {
readAlertTokenSync
} from "./alert-auth-cache.js?v=7";

import {
normalizeAlertWorkerBaseUrl
} from "./alert-worker-url.js?v=2";

import {
fetchWithTimeout
} from "./drawings-cloud/worker-client.js?v=8";

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

function formatLimits(
data
){

const min =
Number(data?.minSec) ||
3;
const max =
Number(data?.maxSec) ||
3600;

return {
min,
max
};

}

/**
 * @param {{
 *   inputId?: string,
 *   saveBtnId?: string,
 *   statusEl?: HTMLElement | null
 * }} opts
 */
export function bindWorkerReloadMsSettings(
opts = {}
){

const input =
document.getElementById(
opts.inputId ||
"system-worker-reload-seconds"
);
const saveBtn =
document.getElementById(
opts.saveBtnId ||
"system-worker-reload-save"
);
const statusEl =
opts.statusEl ||
null;
const healthEl =
document.getElementById(
opts.healthStatusId ||
"system-worker-health-status"
);
const refreshHealthBtn =
document.getElementById(
opts.refreshHealthBtnId ||
"system-worker-health-refresh"
);
const reloadNowBtn =
document.getElementById(
opts.reloadNowBtnId ||
"system-worker-reload-now"
);
const canaryBtn =
document.getElementById(
opts.canaryBtnId ||
"system-worker-canary-send"
);
const UI_DEFAULT_SECONDS = 1800;

if(
!input ||
!saveBtn
){
return;
}

if (!String(input.value || "").trim()) {
input.value = String(UI_DEFAULT_SECONDS);
}

function setStatus(
text,
color = ""
){

if(
!statusEl
){
return;
}

statusEl.textContent =
text;
statusEl.style.color =
color;

}

async function request(
method,
body = null,
path = "worker-reload-ms"
){

const base =
await getWorkerBaseUrl();

if(
!base
){
throw new Error(
"Не задан ALERT_WORKER_URL в supabase-env.js."
);
}

const token =
readAlertTokenSync()?.token;

if(
!token
){
throw new Error(
"Нужен вход через шестерёнку в шапке."
);
}

const res =
await fetchWithTimeout(
`${base}/admin/${path}`,
{
method,
headers: {
Authorization: `Bearer ${token}`,
"Content-Type": "application/json"
},
body:
body == null
? undefined
: JSON.stringify(body)
},
30000
);

let data = {};

try{
data = await res.json();
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

return data;

}

async function requestHealth(){

const base =
await getWorkerBaseUrl();

if(
!base
){
throw new Error(
"Не задан ALERT_WORKER_URL в supabase-env.js."
);
}

const res =
await fetchWithTimeout(
`${base}/health`,
{
method: "GET"
},
30000
);

if(
!res.ok
){
throw new Error(
`HTTP ${res.status}`
);
}

return res.json();

}

async function loadCurrent(){

saveBtn.disabled =
true;
setStatus(
"Загрузка…"
);

try{
const data =
await request(
"GET",
null,
"worker-reload-ms"
);
const limits =
formatLimits(
data
);

input.min =
String(
limits.min
);
input.max =
String(
limits.max
);
input.value =
String(
Number(data.reloadSec) ||
UI_DEFAULT_SECONDS
);

setStatus(
`Подстраховочный reload: ${input.value} сек (диапазон ${limits.min}-${limits.max} сек).`,
"#9ca3af"
);
}catch(err){
if (!String(input.value || "").trim()) {
input.value = String(UI_DEFAULT_SECONDS);
}
setStatus(
err?.message ||
"Ошибка загрузки",
"#fca5a5"
);
}finally{
saveBtn.disabled =
false;
}

}

saveBtn.addEventListener(
"click",
async()=>{

const seconds =
Number(input.value);

if(
!Number.isFinite(seconds)
){
setStatus(
"Введите число секунд.",
"#fca5a5"
);
return;
}

saveBtn.disabled =
true;
setStatus(
"Сохранение…"
);

try{
const data =
await request(
"POST",
{
seconds
},
"worker-reload-ms"
);
input.value =
String(
data.reloadSec
);
setStatus(
`Сохранено: ${data.reloadSec} сек.`,
"#86efac"
);
}catch(err){
setStatus(
err?.message ||
"Ошибка сохранения",
"#fca5a5"
);
}finally{
saveBtn.disabled =
false;
}

}
);

async function refreshHealth(){

if(
!healthEl
){
return;
}

healthEl.textContent =
"Проверка health…";
healthEl.style.color =
"";

try{
const data =
await requestHealth();
const reload =
data?.reload ||
{};
const lastAt =
reload.lastReloadAt
? new Date(reload.lastReloadAt).toLocaleString()
: "—";

healthEl.textContent =
`in-memory: ${data?.alerts ?? "—"} · db: ${data?.diag?.activeInDb ?? "—"} · ` +
`reload: ${reload.intervalMs ?? "—"}ms · last: ${lastAt} · ok: ${reload.lastReloadOk ? "yes" : "no"}`;
healthEl.style.color =
reload.lastReloadOk === false
? "#fca5a5"
: "#9ca3af";
}catch(err){
healthEl.textContent =
err?.message ||
"Ошибка health";
healthEl.style.color =
"#fca5a5";
}

}

refreshHealthBtn?.addEventListener(
"click",
()=>{
void refreshHealth();
}
);

reloadNowBtn?.addEventListener(
"click",
async()=>{
reloadNowBtn.disabled =
true;
try{
await request(
"POST",
{},
"worker-reload-now"
);
await refreshHealth();
setStatus(
"Принудительный reload выполнен.",
"#86efac"
);
}catch(err){
setStatus(
err?.message ||
"Ошибка reload",
"#fca5a5"
);
}finally{
reloadNowBtn.disabled =
false;
}
}
);

canaryBtn?.addEventListener(
"click",
async()=>{
canaryBtn.disabled =
true;
try{
const data =
await request(
"POST",
{},
"worker-canary-alert"
);
setStatus(
`Контрольный алерт отправлен: ${new Date(data.sentAt).toLocaleString()}`,
"#86efac"
);
}catch(err){
const msg =
String(err?.message || "");
setStatus(
msg === "telegram_chat_missing"
? "У админа не задан Telegram Chat ID."
: (msg || "Ошибка отправки canary"),
"#fca5a5"
);
}finally{
canaryBtn.disabled =
false;
}
}
);

void loadCurrent();
void refreshHealth();

}
