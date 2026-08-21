/**
 * Настройки → Прокси (только desktop .app).
 */

function isDesktopShell(){

return !!window.cryptoTerminalDesktop?.isDesktop;

}

function readForm(
host
){

const enabledInput =
host.querySelector(
"#app-settings-proxy-enabled"
);
const typeSelect =
host.querySelector(
"#app-settings-proxy-type"
);
const hostInput =
host.querySelector(
"#app-settings-proxy-host"
);
const portInput =
host.querySelector(
"#app-settings-proxy-port"
);
const userInput =
host.querySelector(
"#app-settings-proxy-username"
);
const passInput =
host.querySelector(
"#app-settings-proxy-password"
);

return {
enabled:
!!enabledInput?.checked,
type:
typeSelect?.value ||
"socks5",
host:
hostInput?.value ||
"",
port:
portInput?.value ||
"",
username:
userInput?.value ||
"",
password:
passInput?.value ||
""
};

}

function fillForm(
host,
settings
){

const enabledInput =
host.querySelector(
"#app-settings-proxy-enabled"
);
const typeSelect =
host.querySelector(
"#app-settings-proxy-type"
);
const hostInput =
host.querySelector(
"#app-settings-proxy-host"
);
const portInput =
host.querySelector(
"#app-settings-proxy-port"
);
const userInput =
host.querySelector(
"#app-settings-proxy-username"
);
const passInput =
host.querySelector(
"#app-settings-proxy-password"
);

if(
enabledInput
){
enabledInput.checked =
!!settings?.enabled;
}

if(
typeSelect
){
typeSelect.value =
settings?.type ===
"http"
? "http"
: "socks5";
}

if(
hostInput
){
hostInput.value =
settings?.host ||
"";
}

if(
portInput
){
portInput.value =
settings?.port
? String(
settings.port
)
: "";
}

if(
userInput
){
userInput.value =
settings?.username ||
"";
}

if(
passInput
){
passInput.value =
settings?.password ||
"";
}

}

function setStatus(
host,
text,
kind
){

const status =
host.querySelector(
"#app-settings-proxy-status"
);

if(
!status
){
return;
}

status.textContent =
text ||
"";
status.dataset.kind =
kind ||
"";

}

function setBusy(
host,
busy
){

host.querySelectorAll(
"button, input, select"
).forEach(
el=>{
el.disabled =
!!busy;
}
);

}

async function hydrate(
host
){

const desktop =
window.cryptoTerminalDesktop;

if(
typeof desktop?.getAppProxy !==
"function"
){
setStatus(
host,
"Прокси доступен только в приложении Multichart.",
"err"
);
return;
}

try{
const result =
await desktop.getAppProxy();

if(
!result?.ok
){
setStatus(
host,
result?.message ||
"Не удалось загрузить настройки прокси.",
"err"
);
return;
}

fillForm(
host,
result.settings
);
setStatus(
host,
result.settings?.ready
? "Прокси включён. После сохранения окно перезагрузится."
: "Прокси выключен — запросы идут напрямую.",
""
);
}catch(
err
){
setStatus(
host,
err?.message ||
"Не удалось загрузить настройки прокси.",
"err"
);
}

}

async function testBybitThroughProxy(){

const ctrl =
new AbortController();
const timer =
setTimeout(
()=>
ctrl.abort(),
12000
);

try{
const res =
await fetch(
"https://stream.bybit.com/",
{
signal:
ctrl.signal,
cache:
"no-store"
}
);

if(
res
){
return {
ok:
true,
message:
"Прокси до тиков Bybit живой. Свечи идут напрямую."
};
}

return {
ok:
false,
message:
"Bybit не ответил (retCode " +
(
json?.retCode ??
res.status
) +
")."
};
}catch(
err
){
return {
ok:
false,
message:
err?.name ===
"AbortError"
? "Таймаут проверки Bybit."
: (
err?.message ||
"Проверка Bybit не удалась."
)
};
}finally{
clearTimeout(
timer
);
}

}

export function mountProxySettingsPanel(
host
){

if(
!host ||
host.dataset.proxyMounted ===
"1"
){
return;
}

host.dataset.proxyMounted =
"1";

if(
!isDesktopShell()
){
host.innerHTML =
`<p class="app-settings-bybit-guest">Прокси доступен в desktop-приложении Multichart.</p>`;
return;
}

host.innerHTML =
`
<p class="app-settings-panel-lead">Только это приложение. В кафе — включить, дома — выключить. Другие программы на компьютере не затрагиваются.</p>
<label class="app-settings-toggle-row">
<input type="checkbox" class="app-settings-toggle-input" id="app-settings-proxy-enabled" />
<span class="app-settings-toggle-label">Включить прокси</span>
</label>
<label class="app-settings-stack-field" for="app-settings-proxy-type">
<span class="app-settings-stack-label">Тип</span>
<select id="app-settings-proxy-type" class="app-settings-field-select app-settings-field-select--wide" aria-label="Тип прокси">
<option value="socks5">SOCKS5</option>
<option value="http">HTTP</option>
</select>
</label>
<label class="app-settings-stack-field" for="app-settings-proxy-host">
<span class="app-settings-stack-label">Хост</span>
<input type="text" id="app-settings-proxy-host" class="app-settings-field-select app-settings-field-select--wide" spellcheck="false" autocomplete="off" placeholder="IP или домен" aria-label="Хост прокси"/>
</label>
<label class="app-settings-stack-field" for="app-settings-proxy-port">
<span class="app-settings-stack-label">Порт</span>
<input type="number" id="app-settings-proxy-port" class="app-settings-field-select app-settings-field-select--wide" min="1" max="65535" step="1" inputmode="numeric" placeholder="1080" aria-label="Порт прокси"/>
</label>
<label class="app-settings-stack-field" for="app-settings-proxy-username">
<span class="app-settings-stack-label">Логин</span>
<input type="text" id="app-settings-proxy-username" class="app-settings-field-select app-settings-field-select--wide" spellcheck="false" autocomplete="off" aria-label="Логин прокси"/>
</label>
<label class="app-settings-stack-field" for="app-settings-proxy-password">
<span class="app-settings-stack-label">Пароль</span>
<input type="password" id="app-settings-proxy-password" class="app-settings-field-select app-settings-field-select--wide" spellcheck="false" autocomplete="new-password" aria-label="Пароль прокси"/>
</label>
<div class="app-settings-proxy-actions">
<button type="button" class="app-settings-action-btn" id="app-settings-proxy-save">Сохранить</button>
<button type="button" class="app-settings-action-btn" id="app-settings-proxy-test">Проверить Bybit</button>
</div>
<p class="app-settings-panel-hint" id="app-settings-proxy-status"></p>
<p class="app-settings-panel-hint">Через прокси идут тики (WebSocket) и торговля Bybit. История свечей остаётся напрямую — в кафе она и так открывается. Сохранение с включённым прокси перезагружает окно.</p>
`;

const saveBtn =
host.querySelector(
"#app-settings-proxy-save"
);
const testBtn =
host.querySelector(
"#app-settings-proxy-test"
);

saveBtn?.addEventListener(
"click",
async()=>{

const desktop =
window.cryptoTerminalDesktop;

if(
typeof desktop?.saveAppProxy !==
"function"
){
setStatus(
host,
"Прокси доступен только в приложении Multichart.",
"err"
);
return;
}

setBusy(
host,
true
);
setStatus(
host,
"Сохраняю…",
""
);

try{
const result =
await desktop.saveAppProxy({
...readForm(
host
),
reload:
true
});

if(
!result?.ok
){
setStatus(
host,
result?.message ||
"Не удалось сохранить прокси.",
"err"
);
return;
}

setStatus(
host,
"Сохранено. Перезагружаю окно…",
"ok"
);
}catch(
err
){
setStatus(
host,
err?.message ||
"Не удалось сохранить прокси.",
"err"
);
}finally{
setBusy(
host,
false
);
}

}
);

testBtn?.addEventListener(
"click",
async()=>{

const desktop =
window.cryptoTerminalDesktop;

if(
typeof desktop?.saveAppProxy !==
"function"
){
setStatus(
host,
"Прокси доступен только в приложении Multichart.",
"err"
);
return;
}

setBusy(
host,
true
);
setStatus(
host,
"Применяю и проверяю Bybit…",
""
);

try{
const saved =
await desktop.saveAppProxy({
...readForm(
host
),
reload:
false
});

if(
!saved?.ok
){
setStatus(
host,
saved?.message ||
"Не удалось применить прокси.",
"err"
);
return;
}

const probe =
await testBybitThroughProxy();
setStatus(
host,
probe.message,
probe.ok
? "ok"
: "err"
);
}catch(
err
){
setStatus(
host,
err?.message ||
"Проверка не удалась.",
"err"
);
}finally{
setBusy(
host,
false
);
}

}
);

void hydrate(
host
);

}
