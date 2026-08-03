/**
 * Bot lite: session-log HTTP server prefs under header gear.
 * Direct LAN access for Multichart — no Supabase / alert-worker.
 */
import {
isAlgoBotLiteShell
} from "../page-routes.js?v=4";

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
 * @param {HTMLElement} mount
 */
export function mountSessionLogServerSettings(
mount
){

if(
!mount ||
!isAlgoBotLiteShell()
){
if(
mount
){
mount.hidden =
true;
}

return;
}

const api =
desktopApi();

if(
!api?.sessionLogServerGet ||
!api?.sessionLogServerSet
){
mount.hidden =
true;
return;
}

mount.hidden =
false;
mount.innerHTML =
`
<p class="header-settings-section-title">Логи → Терминал</p>
<p class="algo-session-log-server-lead">Прямой доступ к файлам сессий (без Supabase и worker). В Multichart: Статус → «Посмотреть логи удалённого бота».</p>
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
mount.querySelector(
"#algo-session-log-server-enabled"
);
const portEl =
mount.querySelector(
"#algo-session-log-server-port"
);
const tokenEl =
mount.querySelector(
"#algo-session-log-server-token"
);
const statusEl =
mount.querySelector(
"#algo-session-log-server-status"
);
const saveBtn =
mount.querySelector(
"#algo-session-log-server-save"
);
const regenBtn =
mount.querySelector(
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
