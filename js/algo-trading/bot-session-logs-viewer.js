/**
 * Multichart: view remote Algo Bot session logs over direct HTTP (no worker).
 */
import {
isMultichartRemoteControlHost,
pushAuthSessionToRemoteBot,
fetchLanBotStatus,
sendLanBotCommand
} from "./bot-remote-client.js?v=5";
import {
formatBotStrategySettingsRows
} from "./bot-strategy-prefs.js?v=17";

const STORAGE_KEY =
"algo_remote_session_logs_v1";
const CHANNEL_UI_VER =
"7";

function desktopApi(){

return window.cryptoTerminalDesktop?.algoTrading ||
null;

}

function readConn(){

try{
const raw =
JSON.parse(
localStorage.getItem(
STORAGE_KEY
) ||
"{}"
);

return {
host:
String(
raw.host ||
""
).trim(),
port:
String(
raw.port ||
"17865"
).trim(),
token:
String(
raw.token ||
""
).trim()
};
}catch{
return {
host:
"",
port:
"17865",
token:
""
};
}

}

function writeConn(
conn
){

localStorage.setItem(
STORAGE_KEY,
JSON.stringify(
{
host:
String(
conn.host ||
""
).trim(),
port:
String(
conn.port ||
"17865"
).trim(),
token:
String(
conn.token ||
""
).trim()
}
)
);

}

function ensureModal(){

let root =
document.getElementById(
"algo-remote-session-logs-modal"
);

if(
root &&
root.getAttribute(
"data-channel-ui"
) !==
CHANNEL_UI_VER
){
root.remove();
root =
null;
}

if(
root
){
return root;
}

root =
document.createElement(
"div"
);
root.id =
"algo-remote-session-logs-modal";
root.className =
"algo-remote-session-logs-modal hidden";
root.setAttribute(
"data-channel-ui",
CHANNEL_UI_VER
);
root.setAttribute(
"role",
"dialog"
);
root.setAttribute(
"aria-modal",
"true"
);
root.setAttribute(
"aria-label",
"Канал с удалённым ботом"
);
root.innerHTML =
`
<div class="algo-remote-session-logs-panel">
<header class="algo-remote-session-logs-header">
<h2 class="algo-remote-session-logs-title">Канал с ботом</h2>
<div class="algo-remote-session-logs-header-actions">
<button type="button" class="algo-remote-session-logs-help-btn" id="algo-remote-session-logs-help" aria-haspopup="dialog" aria-controls="algo-remote-session-logs-help-panel">Помощь</button>
<button type="button" class="algo-remote-session-logs-close" id="algo-remote-session-logs-close" aria-label="Закрыть">×</button>
</div>
</header>
<section class="algo-remote-session-logs-top">
<div class="algo-remote-session-logs-top-left">
<section class="algo-remote-session-logs-conn">
<label>IP / хост<input type="text" id="algo-remote-logs-host" placeholder="203.0.113.10" autocomplete="off" spellcheck="false" /></label>
<label>Порт<input type="number" id="algo-remote-logs-port" min="1024" max="65535" value="17865" /></label>
<label class="algo-remote-session-logs-token">Токен<input type="password" id="algo-remote-logs-token" autocomplete="off" spellcheck="false" /></label>
</section>
<section class="algo-remote-session-logs-channel" aria-label="Управление по каналу">
<div class="algo-remote-session-logs-channel-status">
<div class="algo-remote-session-logs-channel-row">
<span class="algo-remote-session-logs-channel-label">Связь</span>
<span class="algo-remote-session-logs-channel-value" id="algo-remote-logs-link">—</span>
</div>
<div class="algo-remote-session-logs-channel-row">
<span class="algo-remote-session-logs-channel-label">Хост</span>
<span class="algo-remote-session-logs-channel-value" id="algo-remote-logs-remote-host">—</span>
</div>
<div class="algo-remote-session-logs-channel-row">
<span class="algo-remote-session-logs-channel-label">Сессия</span>
<span class="algo-remote-session-logs-channel-value" id="algo-remote-logs-auth-health">—</span>
</div>
</div>
<div class="algo-remote-session-logs-channel-actions">
<button type="button" class="algo-bot-remote-btn" id="algo-remote-logs-start">Запустить</button>
<button type="button" class="algo-bot-remote-btn" id="algo-remote-logs-stop">Остановить</button>
<button type="button" class="algo-bot-remote-btn algo-bot-remote-btn--push" id="algo-remote-logs-push" title="Отправить текущие Алго Лонг/Шорт/Both/Избранные на бот">Отдать списки</button>
<button type="button" class="algo-bot-remote-btn algo-bot-remote-btn--push" id="algo-remote-logs-auth" title="Передать вход Multichart на бот (вместо mcauth1…)">Отдать сессию</button>
<button type="button" class="algo-bot-remote-btn" id="algo-remote-logs-refresh">Обновить логи</button>
</div>
</section>
</div>
<aside class="algo-remote-session-logs-strategy" aria-label="Настройки стратегии бота">
<div class="algo-remote-session-logs-strategy-title" id="algo-remote-logs-strategy-title">Стратегия бота</div>
<div class="algo-remote-session-logs-strategy-list" id="algo-remote-logs-strategy-list">
<div class="algo-remote-session-logs-strategy-empty">Нет данных — укажите IP и токен</div>
</div>
</aside>
</section>
<p class="algo-remote-session-logs-hint">Прямой канал Multichart ↔ Algo Bot (без Supabase и worker). На боте: шестерёнка → «Логи → Терминал». В «Статус» остаётся только облачный удалённый бот и блокировка.</p>
<p class="algo-remote-session-logs-message" id="algo-remote-logs-message" hidden></p>
<div class="algo-remote-session-logs-body">
<aside class="algo-remote-session-logs-list-wrap">
<div class="algo-remote-session-logs-list" id="algo-remote-logs-list"></div>
</aside>
<div class="algo-remote-session-logs-view" id="algo-remote-logs-view" aria-live="polite"></div>
</div>
<div class="algo-remote-session-logs-help-panel hidden" id="algo-remote-session-logs-help-panel" role="dialog" aria-label="Помощь: канал с ботом">
<header class="algo-remote-session-logs-help-header">
<h3 class="algo-remote-session-logs-help-title">Помощь / Help</h3>
<button type="button" class="algo-remote-session-logs-close" id="algo-remote-session-logs-help-close" aria-label="Закрыть помощь">×</button>
</header>
<div class="algo-remote-session-logs-help-body">
<section class="algo-remote-session-logs-help-lang" lang="ru">
<h4>Русский</h4>
<p>Окно <strong>LAN</strong> — весь прямой канал: Старт/Стоп, списки, сессия, логи. Без worker и без лишнего трафика в Supabase (кроме cloud lock при старте на самом боте).</p>
<p><strong>Таймаут</strong> почти всегда значит: до порта на сервере пакеты не доходят (firewall / Security Group / бот не слушает). Неверный токен обычно даёт ошибку сразу, а не таймаут.</p>
<p><strong>Токен доступа к порту</strong> — не сессия <code>mcauth1…</code>. На боте: шестерёнка → «Логи → Терминал» → «Новый токен» или включить доступ и «Сохранить».</p>
<ol>
<li>На боте статус должен быть вроде <code>слушает 0.0.0.0:17865</code>.</li>
<li>Откройте TCP-порт (по умолчанию <strong>17865</strong>) в брандмауэре Windows.</li>
<li>Если сервер в облаке — откройте тот же порт ещё и в панели провайдера (Security Group / Firewall).</li>
</ol>
<p><strong>Windows (русская):</strong> Панель управления → Брандмауэр Защитника Windows → Дополнительные параметры → Правила для входящих → Создать правило → Порт → TCP → 17865 → Разрешить подключение.</p>
<p><strong>PowerShell от администратора:</strong></p>
<pre class="algo-remote-session-logs-help-code">New-NetFirewallRule -DisplayName "Multichart Algo Bot session logs" -Direction Inbound -Protocol TCP -LocalPort 17865 -Action Allow</pre>
<p><strong>Проверка с Mac:</strong> <code>nc -vz IP_СЕРВЕРА 17865</code> — если succeeded, снова «Обновить логи».</p>
</section>
<section class="algo-remote-session-logs-help-lang" lang="en">
<h4>English</h4>
<p>The <strong>LAN</strong> window is the full direct channel: Start/Stop, lists, auth session, logs — no alert-worker. Supabase is only used for the bot’s own cloud lock on start.</p>
<p>A <strong>timeout</strong> almost always means packets never reach the port (Windows firewall / cloud Security Group / bot not listening).</p>
<p>The <strong>port token</strong> is not the Multichart session string <code>mcauth1…</code>. On the bot: gear → “Logs → Terminal” → “New token”.</p>
<ol>
<li>Bot status should look like <code>listening 0.0.0.0:17865</code>.</li>
<li>Allow TCP port <strong>17865</strong> in Windows Firewall.</li>
<li>If the host is in the cloud, open the same port in the provider Security Group too.</li>
</ol>
<p><strong>PowerShell (Admin):</strong></p>
<pre class="algo-remote-session-logs-help-code">New-NetFirewallRule -DisplayName "Multichart Algo Bot session logs" -Direction Inbound -Protocol TCP -LocalPort 17865 -Action Allow</pre>
<p><strong>Check from Mac:</strong> <code>nc -vz SERVER_IP 17865</code>.</p>
</section>
</div>
</div>
</div>
`;
document.body.appendChild(
root
);

return root;

}

function setMessage(
text,
isError =
false
){

const el =
document.getElementById(
"algo-remote-logs-message"
);

if(
!el
){
return;
}

el.textContent =
text ||
"";
el.hidden =
!text;
el.classList.toggle(
"is-error",
!!isError
);

}

function formatSize(
n
){

const v =
Number(
n
) ||
0;

if(
v <
1024
){
return `${v} B`;
}

if(
v <
1024 *
1024
){
return `${(v / 1024).toFixed(1)} KB`;
}

return `${(v / (1024 * 1024)).toFixed(1)} MB`;

}

function formatTime(
ms
){

const d =
new Date(
Number(
ms
) ||
0
);

if(
!Number.isFinite(
d.getTime()
)
){
return "—";
}

return d.toLocaleString();

}

function escapeHtml(
value
){

return String(
value ??
""
).replace(
/&/g,
"&amp;"
).replace(
/</g,
"&lt;"
).replace(
/>/g,
"&gt;"
).replace(
/"/g,
"&quot;"
);

}

/**
 * Split status-log lines on " | " into table columns.
 * @param {string} text
 * @returns {string} HTML
 */
function renderLogTableHtml(
text
){

const lines =
String(
text ||
""
).replace(
/\r\n/g,
"\n"
).split(
"\n"
);
const rows =
[];

for(
const line of
lines
){

const raw =
line.trimEnd();

if(
!raw.trim()
){
continue;
}

if(
raw.startsWith(
"#"
)
){
rows.push(
`<tr class="algo-remote-session-logs-row algo-remote-session-logs-row--meta"><td colspan="4">${escapeHtml(
raw
)}</td></tr>`
);
continue;
}

const parts =
raw.split(
" | "
);

if(
parts.length >=
4
){
const side =
String(
parts[2] ||
""
).trim();
const sideClass =
/\bshort\b/i.test(
side
)
? " is-short"
: /\blong\b/i.test(
side
)
? " is-long"
: "";

rows.push(
`<tr class="algo-remote-session-logs-row"><td class="algo-remote-session-logs-col-time">${escapeHtml(
parts[0]
)}</td><td class="algo-remote-session-logs-col-symbol">${escapeHtml(
parts[1]
)}</td><td class="algo-remote-session-logs-col-side${sideClass}">${escapeHtml(
side
)}</td><td class="algo-remote-session-logs-col-text">${escapeHtml(
parts.slice(
3
).join(
" | "
)
)}</td></tr>`
);
continue;
}

rows.push(
`<tr class="algo-remote-session-logs-row algo-remote-session-logs-row--meta"><td colspan="4">${escapeHtml(
raw
)}</td></tr>`
);

}

if(
!rows.length
){
return `<div class="algo-remote-session-logs-empty">Пустой лог</div>`;
}

return `<table class="algo-remote-session-logs-table"><thead><tr><th class="algo-remote-session-logs-col-time">Время</th><th class="algo-remote-session-logs-col-symbol">Тикер</th><th class="algo-remote-session-logs-col-side">Сторона</th><th class="algo-remote-session-logs-col-text">Сообщение</th></tr></thead><tbody>${rows.join(
""
)}</tbody></table>`;

}

/**
 * @param {{ closeStatusDropdown?: () => void }} [opts]
 */
export function openRemoteSessionLogsViewer(
opts =
{}
){

if(
!isMultichartRemoteControlHost()
){
return;
}

const api =
desktopApi();

if(
!api?.sessionLogRemoteList ||
!api?.sessionLogRemoteGet
){
window.alert(
"Нужен desktop Multichart с поддержкой sessionLogRemote*"
);
return;
}

try{
opts.closeStatusDropdown?.();
}catch{
/* ignore */
}

const root =
ensureModal();
const conn =
readConn();
const hostEl =
root.querySelector(
"#algo-remote-logs-host"
);
const portEl =
root.querySelector(
"#algo-remote-logs-port"
);
const tokenEl =
root.querySelector(
"#algo-remote-logs-token"
);
const listEl =
root.querySelector(
"#algo-remote-logs-list"
);
const viewEl =
root.querySelector(
"#algo-remote-logs-view"
);
const linkEl =
root.querySelector(
"#algo-remote-logs-link"
);
const remoteHostEl =
root.querySelector(
"#algo-remote-logs-remote-host"
);
const authHealthEl =
root.querySelector(
"#algo-remote-logs-auth-health"
);
const startBtn =
root.querySelector(
"#algo-remote-logs-start"
);
const stopBtn =
root.querySelector(
"#algo-remote-logs-stop"
);
const strategyTitleEl =
root.querySelector(
"#algo-remote-logs-strategy-title"
);
const strategyListEl =
root.querySelector(
"#algo-remote-logs-strategy-list"
);

if(
hostEl
){
hostEl.value =
conn.host;
}

if(
portEl
){
portEl.value =
conn.port ||
"17865";
}

if(
tokenEl
){
tokenEl.value =
conn.token;
}

root.classList.remove(
"hidden"
);

requestAnimationFrame(
()=>{
syncStrategyBoxHeight();
}
);

let channelCmdInflight =
false;

function currentConn(){

return {
host:
hostEl?.value ||
"",
port:
portEl?.value ||
"17865",
token:
tokenEl?.value ||
""
};

}

function syncStrategyBoxHeight(){

const left =
root.querySelector(
".algo-remote-session-logs-top-left"
);
const strategy =
root.querySelector(
".algo-remote-session-logs-strategy"
);

if(
!left ||
!strategy
){
return;
}

const h =
Math.round(
left.getBoundingClientRect().height
);

if(
h > 0
){
strategy.style.maxHeight =
`${h}px`;
}

}

function applyLanStatusUi(
st
){

if(
linkEl
){
if(
!st?.ok
){
linkEl.textContent =
"нет связи";
linkEl.classList.remove(
"is-online",
"is-running"
);
}else if(
!st.online
){
linkEl.textContent =
"офлайн";
linkEl.classList.remove(
"is-online",
"is-running"
);
}else if(
st.running
){
linkEl.textContent =
"онлайн · запущен";
linkEl.classList.add(
"is-online",
"is-running"
);
}else{
linkEl.textContent =
"онлайн · стоп";
linkEl.classList.add(
"is-online"
);
linkEl.classList.remove(
"is-running"
);
}
}

if(
remoteHostEl
){
remoteHostEl.textContent =
st?.ok &&
st.online
? (
st.host ||
st.app ||
"—"
)
: "—";
}

if(
authHealthEl
){
const health =
st?.authHealth;
authHealthEl.classList.remove(
"is-online",
"is-error",
"is-warn"
);

if(
!st?.ok ||
!st.online
){
authHealthEl.textContent =
"—";
}else if(
!health
){
authHealthEl.textContent =
"н/д";
}else if(
health.ok &&
health.code ===
"ok"
){
authHealthEl.textContent =
"ок";
authHealthEl.classList.add(
"is-online"
);
setMessage(
"",
false
);
}else if(
health.ok &&
health.code ===
"expiring"
){
authHealthEl.textContent =
"скоро истечёт";
authHealthEl.classList.add(
"is-warn"
);
if(
health.message
){
setMessage(
health.message,
true
);
}
}else{
authHealthEl.textContent =
health.code ===
"expired"
? "истекла"
: health.code ===
"missing"
? "нет"
: "ошибка";
authHealthEl.classList.add(
"is-error"
);
if(
health.message
){
setMessage(
health.message,
true
);
}
}
}

if(
startBtn
){
startBtn.disabled =
channelCmdInflight ||
!(
st?.ok &&
st.online
) ||
!!st?.running;
}

if(
stopBtn
){
stopBtn.disabled =
channelCmdInflight ||
!(
st?.ok &&
st.online
) ||
!st?.running;
}

if(
strategyTitleEl ||
strategyListEl
){
if(
!st?.ok ||
!st.online
){
if(
strategyTitleEl
){
strategyTitleEl.textContent =
"Стратегия бота";
}

if(
strategyListEl
){
strategyListEl.innerHTML =
`<div class="algo-remote-session-logs-strategy-empty">${
st?.ok
? "Бот онлайн, но нет данных стратегии"
: "Нет связи с ботом"
}</div>`;
}
}else{
const strategyId =
st.strategyId ||
"st1";
const prefs =
st.strategyPrefs &&
typeof st.strategyPrefs ===
"object"
? st.strategyPrefs
: null;
const rows =
prefs
? formatBotStrategySettingsRows(
prefs,
strategyId,
{
tradingMode:
st.tradingMode
}
)
: [];
const stratLabel =
strategyId ===
"st2"
? "Стратегия 2"
: strategyId ===
"st3"
? "Стратегия 3"
: "Стратегия 1";

if(
strategyTitleEl
){
strategyTitleEl.textContent =
st.running
? `${stratLabel} · запущена`
: `${stratLabel} · стоп`;
}

if(
strategyListEl
){
strategyListEl.innerHTML =
rows.length
? rows.map(
(
row
)=>
`<div class="algo-remote-session-logs-strategy-item"><span class="algo-remote-session-logs-strategy-item-label">${escapeHtml(
row.label
)}</span><span class="algo-remote-session-logs-strategy-item-value">${escapeHtml(
row.value
)}</span></div>`
).join(
""
)
: `<div class="algo-remote-session-logs-strategy-empty">Нет настроек стратегии</div>`;
}
}
}

syncStrategyBoxHeight();

}

async function refreshLanStatus(){

const next =
currentConn();

writeConn(
next
);

if(
!next.host ||
!next.token
){
applyLanStatusUi(
{
ok:
false
}
);
return;
}

const st =
await fetchLanBotStatus(
next
);

applyLanStatusUi(
st
);

}

async function runLanCommand(
action
){

const next =
currentConn();

writeConn(
next
);

if(
!next.host ||
!next.token
){
setMessage(
"Укажите IP и токен",
true
);
return;
}

channelCmdInflight =
true;

if(
startBtn
){
startBtn.disabled =
true;
}

if(
stopBtn
){
stopBtn.disabled =
true;
}

setMessage(
action ===
"start"
? "Запуск по каналу…"
: "Остановка по каналу…"
);

const result =
await sendLanBotCommand(
action,
next
);

channelCmdInflight =
false;

if(
!result?.ok
){
setMessage(
result?.message ||
"Команда не выполнена",
true
);
}else{
setMessage(
action ===
"start"
? "Команда запуска отправлена"
: "Команда остановки отправлена"
);
}

await refreshLanStatus();

}

async function pushWatchlists(){

const next =
currentConn();

writeConn(
next
);

if(
!next.host ||
!next.token
){
setMessage(
"Укажите IP и токен",
true
);
return;
}

if(
!api?.sessionLogRemotePushWatchlists ||
!api?.getTickerFlagsRoot
){
setMessage(
"Нужен desktop Multichart с push watchlists",
true
);
return;
}

setMessage(
"Отправка списков…"
);

const flagsRes =
await api.getTickerFlagsRoot();

if(
!flagsRes?.ok ||
!flagsRes.root
){
setMessage(
flagsRes?.message ||
"Не удалось прочитать локальные списки",
true
);
return;
}

const res =
await api.sessionLogRemotePushWatchlists(
{
...next,
root:
flagsRes.root
}
);

if(
!res?.ok
){
setMessage(
res?.message ||
"Не удалось отправить списки",
true
);
return;
}

setMessage(
res.message ||
"Списки отправлены на бот"
);

}

async function pushAuthSession(){

const next =
currentConn();

writeConn(
next
);

if(
!next.host ||
!next.token
){
setMessage(
"Укажите IP и токен",
true
);
return;
}

setMessage(
"Отправка сессии…"
);

const res =
await pushAuthSessionToRemoteBot(
next
);

if(
!res?.ok
){
setMessage(
res?.message ||
"Не удалось отправить сессию",
true
);
return;
}

setMessage(
res.message ||
(
res.email
? `Сессия отправлена (${res.email})`
: "Сессия отправлена на бот"
)
);

}

async function refreshList(){

const next =
currentConn();

writeConn(
next
);
setMessage(
"Загрузка списка…"
);

if(
listEl
){
listEl.innerHTML =
"";
}

const res =
await api.sessionLogRemoteList(
next
);

if(
!res?.ok
){
setMessage(
res?.message ||
"Не удалось получить список",
true
);
return;
}

const files =
Array.isArray(
res.files
)
? res.files
: [];

setMessage(
files.length
? `Сессий: ${files.length}`
: "Файлов пока нет"
);

if(
!listEl
){
return;
}

listEl.innerHTML =
files.map(
(
file
)=>
`<button type="button" class="algo-remote-session-logs-item" data-name="${String(
file.name ||
""
).replace(
/"/g,
"&quot;"
)}"><span class="algo-remote-session-logs-item-name">${String(
file.name ||
""
)}</span><span class="algo-remote-session-logs-item-meta">${formatTime(
file.mtimeMs
)} · ${formatSize(
file.size
)}</span></button>`
).join(
""
) ||
`<div class="algo-remote-session-logs-empty">Нет логов</div>`;

}

async function openFile(
name
){

const next =
{
host:
hostEl?.value ||
"",
port:
portEl?.value ||
"17865",
token:
tokenEl?.value ||
"",
name
};

writeConn(
next
);
setMessage(
`Загрузка ${name}…`
);

const res =
await api.sessionLogRemoteGet(
next
);

if(
!res?.ok
){
setMessage(
res?.message ||
"Не удалось скачать лог",
true
);
return;
}

if(
viewEl
){
viewEl.innerHTML =
renderLogTableHtml(
res.text ||
""
);
}

setMessage(
name
);

}

function close(){

root.classList.add(
"hidden"
);
helpPanel?.classList.add(
"hidden"
);

}

const helpPanel =
root.querySelector(
"#algo-remote-session-logs-help-panel"
);

function openHelp(){

helpPanel?.classList.remove(
"hidden"
);

}

function closeHelp(){

helpPanel?.classList.add(
"hidden"
);

}

if(
root.dataset.logsUiBound !==
"1"
){
root.dataset.logsUiBound =
"1";

root.querySelector(
"#algo-remote-session-logs-close"
)?.addEventListener(
"click",
close
);

root.querySelector(
"#algo-remote-session-logs-help"
)?.addEventListener(
"click",
event=>{
event.preventDefault();
event.stopPropagation();
openHelp();
}
);

root.querySelector(
"#algo-remote-session-logs-help-close"
)?.addEventListener(
"click",
event=>{
event.preventDefault();
event.stopPropagation();
closeHelp();
}
);

helpPanel?.addEventListener(
"click",
event=>{
if(
event.target ===
helpPanel
){
closeHelp();
}
}
);

root.querySelector(
"#algo-remote-logs-refresh"
)?.addEventListener(
"click",
event=>{
event.preventDefault();
void refreshLanStatus();
void refreshList();
}
);

root.querySelector(
"#algo-remote-logs-push"
)?.addEventListener(
"click",
event=>{
event.preventDefault();
void pushWatchlists();
}
);

root.querySelector(
"#algo-remote-logs-auth"
)?.addEventListener(
"click",
event=>{
event.preventDefault();
void pushAuthSession();
}
);

root.querySelector(
"#algo-remote-logs-start"
)?.addEventListener(
"click",
event=>{
event.preventDefault();
void runLanCommand(
"start"
);
}
);

root.querySelector(
"#algo-remote-logs-stop"
)?.addEventListener(
"click",
event=>{
event.preventDefault();
void runLanCommand(
"stop"
);
}
);

listEl?.addEventListener(
"click",
event=>{
const btn =
event.target?.closest?.(
"[data-name]"
);

if(
!btn
){
return;
}

void openFile(
btn.getAttribute(
"data-name"
) ||
""
);
}
);

root.addEventListener(
"click",
event=>{
if(
event.target ===
root
){
close();
}
}
);
}

void refreshLanStatus();
void refreshList();

}

/**
 * @param {{ closeStatusDropdown?: () => void }} [opts]
 */
export function mountRemoteSessionLogsEntry(
opts =
{}
){

const btn =
document.getElementById(
"algo-bot-remote-logs"
);

if(
!btn
){
return;
}

if(
!isMultichartRemoteControlHost()
){
btn.hidden =
true;
return;
}

btn.hidden =
false;
btn.title =
"Прямой канал с Algo Bot: старт/стоп, списки, сессия, логи";
btn.addEventListener(
"click",
event=>{
event.preventDefault();
event.stopPropagation();
openRemoteSessionLogsViewer(
opts
);
}
);

}

/**
 * Topbar push button removed — lists live in LAN channel window.
 * Keep mount for older HTML; always hide.
 */
export function mountRemoteWatchlistsPushEntry(){

const btn =
document.getElementById(
"algo-bot-remote-push-lists"
);

if(
btn
){
btn.hidden =
true;
}

}
