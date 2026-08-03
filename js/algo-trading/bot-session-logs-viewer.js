/**
 * Multichart: view remote Algo Bot session logs over direct HTTP (no worker).
 */
import {
isMultichartRemoteControlHost
} from "./bot-remote-client.js?v=1";

const STORAGE_KEY =
"algo_remote_session_logs_v1";

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
"role",
"dialog"
);
root.setAttribute(
"aria-modal",
"true"
);
root.setAttribute(
"aria-label",
"Логи удалённого бота"
);
root.innerHTML =
`
<div class="algo-remote-session-logs-panel">
<header class="algo-remote-session-logs-header">
<h2 class="algo-remote-session-logs-title">Логи удалённого бота</h2>
<button type="button" class="algo-remote-session-logs-close" id="algo-remote-session-logs-close" aria-label="Закрыть">×</button>
</header>
<section class="algo-remote-session-logs-conn">
<label>IP / хост<input type="text" id="algo-remote-logs-host" placeholder="203.0.113.10" autocomplete="off" spellcheck="false" /></label>
<label>Порт<input type="number" id="algo-remote-logs-port" min="1024" max="65535" value="17865" /></label>
<label class="algo-remote-session-logs-token">Токен<input type="password" id="algo-remote-logs-token" autocomplete="off" spellcheck="false" /></label>
<button type="button" class="algo-bot-remote-btn" id="algo-remote-logs-refresh">Обновить список</button>
</section>
<p class="algo-remote-session-logs-hint">Прямое соединение с ботом (без Supabase и worker). На боте: шестерёнка → «Логи → Терминал».</p>
<p class="algo-remote-session-logs-message" id="algo-remote-logs-message" hidden></p>
<div class="algo-remote-session-logs-body">
<aside class="algo-remote-session-logs-list-wrap">
<div class="algo-remote-session-logs-list" id="algo-remote-logs-list"></div>
</aside>
<pre class="algo-remote-session-logs-view" id="algo-remote-logs-view"></pre>
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

async function refreshList(){

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
""
};

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
viewEl.textContent =
res.text ||
"";
}

setMessage(
name
);

}

function close(){

root.classList.add(
"hidden"
);

}

root.querySelector(
"#algo-remote-session-logs-close"
)?.addEventListener(
"click",
close,
{
once:
false
}
);

root.querySelector(
"#algo-remote-logs-refresh"
)?.addEventListener(
"click",
event=>{
event.preventDefault();
void refreshList();
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
