/**
 * Bot lite: session-log HTTP server prefs under header gear.
 * Direct LAN access for Multichart — logs, watchlists, auth, start/stop.
 */
import {
isAlgoBotLiteShell
} from "../page-routes.js?v=5";
import {
applyPersistedAuthSessionNow,
clearCloudAuthProblem,
importAuthSessionTransferString
} from "../cloud-sync.js?v=65";
import {
forceRestoreDesktopAuthSession
} from "../auth-storage.js?v=10";

if(
typeof window !==
"undefined" &&
isAlgoBotLiteShell()
){
window.__importAuthSessionTransferString =
importAuthSessionTransferString;

window.__reloadAuthFromDesktopFile =
async ()=>{

const ok =
await forceRestoreDesktopAuthSession();

if(
!ok
){
return {
ok:
false,
message:
"Файл сессии пуст или повреждён"
};
}

try{
const applied =
await applyPersistedAuthSessionNow();

if(
applied
){
clearCloudAuthProblem();
}

return {
ok:
!!applied,
message:
applied
? "Сессия подтянута из файла приложения"
: "Сессия в файле истекла — снова «Отдать сессию»"
};
}catch(
err
){
return {
ok:
true,
message:
err?.message ||
"Сессия в localStorage — обновите окно бота"
};
}

};

}

function desktopApi(){

return window.cryptoTerminalDesktop?.algoTrading ||
null;

}

function setStatus(
el,
text,
isError =
false
){

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

/**
 * @param {HTMLElement | null} [mount]
 */
export function mountSessionLogServerSettings(
mount
){

if(
!isAlgoBotLiteShell()
){
const el =
mount ||
document.getElementById(
"algo-session-log-server-mount"
);

if(
el
){
el.hidden =
true;
}

return;
}

let host =
mount ||
document.getElementById(
"algo-session-log-server-mount"
);

if(
!host
){
const dropdown =
document.getElementById(
"header-settings-dropdown"
);

if(
!dropdown
){
return;
}

host =
document.createElement(
"div"
);
host.id =
"algo-session-log-server-mount";
host.className =
"algo-session-log-server-mount";
dropdown.appendChild(
host
);
}

const api =
desktopApi();

if(
!api?.sessionLogServerGet ||
!api?.sessionLogServerSet
){
host.hidden =
true;
return;
}

/* Already wired — keep form (header re-render / gear re-open). */
if(
host.querySelector(
"#algo-session-log-server-enabled"
)
){
host.hidden =
false;
void api.sessionLogServerGet().then(
st=>{
const enabledEl =
host.querySelector(
"#algo-session-log-server-enabled"
);
const portEl =
host.querySelector(
"#algo-session-log-server-port"
);
const tokenEl =
host.querySelector(
"#algo-session-log-server-token"
);
const statusEl =
host.querySelector(
"#algo-session-log-server-status"
);

if(
enabledEl
){
enabledEl.checked =
!!st?.enabled;
}

if(
portEl
){
portEl.value =
String(
st?.port ||
17865
);
}

if(
tokenEl
){
tokenEl.value =
String(
st?.token ||
""
);
}

const listen =
st?.listening
? `слушает ${st.bindHost || "0.0.0.0"}:${st.port}`
: st?.enabled
? "включён, но не слушает"
: "выключен";

setStatus(
statusEl,
`${listen}. Папка: ${st?.dir || "—"}`
);
}
);
return;
}

host.hidden =
false;
host.innerHTML =
`
<p class="header-settings-section-title">Логи → Терминал</p>
<p class="algo-session-log-server-lead">Прямой канал для окна <strong>LAN</strong> в Multichart: Старт/Стоп, списки, сессия, логи (без worker). IP и токен — в Multichart → LAN.</p>
<label class="algo-session-log-server-check">
<input type="checkbox" id="algo-session-log-server-enabled" />
<span>Включить HTTP-доступ к логам</span>
</label>
<div class="algo-session-log-server-row">
<label for="algo-session-log-server-port">Порт</label>
<input type="number" id="algo-session-log-server-port" min="1024" max="65535" step="1" value="17865" />
</div>
<div class="algo-session-log-server-row">
<label for="algo-session-log-server-token">Токен</label>
<input type="text" id="algo-session-log-server-token" autocomplete="off" spellcheck="false" />
</div>
<div class="algo-session-log-server-actions">
<button type="button" class="algo-scan-btn" id="algo-session-log-server-save">Сохранить</button>
<button type="button" class="algo-scan-btn" id="algo-session-log-server-regen">Новый токен</button>
</div>
<p class="algo-session-log-server-status" id="algo-session-log-server-status" hidden></p>
`;

const enabledEl =
host.querySelector(
"#algo-session-log-server-enabled"
);
const portEl =
host.querySelector(
"#algo-session-log-server-port"
);
const tokenEl =
host.querySelector(
"#algo-session-log-server-token"
);
const statusEl =
host.querySelector(
"#algo-session-log-server-status"
);
const saveBtn =
host.querySelector(
"#algo-session-log-server-save"
);
const regenBtn =
host.querySelector(
"#algo-session-log-server-regen"
);

async function refresh(){

const st =
await api.sessionLogServerGet();

if(
!st?.ok &&
st?.message
){
setStatus(
statusEl,
st.message,
true
);
return;
}

if(
enabledEl
){
enabledEl.checked =
!!st.enabled;
}

if(
portEl
){
portEl.value =
String(
st.port ||
17865
);
}

if(
tokenEl
){
tokenEl.value =
String(
st.token ||
""
);
}

const listen =
st.listening
? `слушает ${st.bindHost || "0.0.0.0"}:${st.port}`
: st.enabled
? "включён, но не слушает"
: "выключен";

setStatus(
statusEl,
`${listen}. Папка: ${st.dir || "—"}`
);

}

saveBtn?.addEventListener(
"click",
async event=>{
event.preventDefault();
event.stopPropagation();
setStatus(
statusEl,
"Сохранение…"
);
const res =
await api.sessionLogServerSet(
{
enabled:
!!enabledEl?.checked,
port:
Number(
portEl?.value
) ||
17865,
token:
String(
tokenEl?.value ||
""
).trim()
}
);

if(
res?.ok ===
false
){
setStatus(
statusEl,
res.message ||
"Ошибка",
true
);
return;
}

await refresh();
setStatus(
statusEl,
res?.listening
? `OK: слушает порт ${res.port}`
: res?.enabled
? (
res.message ||
"Не удалось слушать порт"
)
: "Выключено",
!!(
res?.enabled &&
!res?.listening
)
);
}
);

regenBtn?.addEventListener(
"click",
async event=>{
event.preventDefault();
event.stopPropagation();
const token =
Array.from(
crypto.getRandomValues(
new Uint8Array(
18
)
)
).map(
b=>
b.toString(
16
).padStart(
2,
"0"
)
).join(
""
);

if(
tokenEl
){
tokenEl.value =
token;
}

setStatus(
statusEl,
"Токен обновлён — нажмите «Сохранить»"
);
}
);

void refresh();

}
