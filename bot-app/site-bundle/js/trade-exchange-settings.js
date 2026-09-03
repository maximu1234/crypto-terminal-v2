/**
 * Подключения к биржам — desktop .app.
 */
import {
EXCHANGE_IDS,
EXCHANGE_DEFINITIONS,
getActiveExchangeId,
setActiveExchangeId,
pingActiveExchangePublic
} from "./market-api.js?v=6";

import {
readExchangeCredentials,
writeExchangeCredentials,
clearExchangeCredentials,
getExchangeSecretForSave
} from "./exchange-credentials.js?v=2";

import {
getLoadedTradeExchangeModules
} from "./trade/module-router.js?v=23";

import {
maskTradeDisplay
} from "./trade-pnl-privacy.js?v=1";

function tradingApi(){

return window.cryptoTerminalDesktop?.trading;

}

function formatTradingUserError(
message,
context =
"save",
exchangeId =
"bybit"
){

const exchangeName =
EXCHANGE_DEFINITIONS[
exchangeId
]?.name ||
"биржи";

const raw =
String(
message ||
""
).trim();

if(
!raw
){
return context ===
"clear"
? "Не удалось удалить ключи."
: "Не удалось сохранить ключи.";
}

const lower =
raw.toLowerCase();

if(
lower.includes(
"websocket is not defined"
) ||
lower.includes(
"websocket module unavailable"
)
){
return "Ключи сохранены, но поток сделок не запустился. Закройте и откройте приложение заново.";
}

if(
raw ===
"API key is required"
){
return "Укажите API Key.";
}

if(
raw ===
"API secret is required"
){
return "Укажите API Secret.";
}

if(
lower.includes(
"frequency limit"
) ||
lower.includes(
"trigger frequency"
) ||
/code:100410/i.test(
raw
) ||
/\b100410\b/.test(
raw
)
){
const rateMsg =
getLoadedTradeExchangeModules()?.getTradeConfig?.()?.rateLimitedMessage;

if(
rateMsg
){
return rateMsg;
}

return `Превышен лимит запросов ${exchangeName}. Подождите немного — данные обновятся автоматически.`;
}

if(
lower.includes(
"failed to clear credentials"
)
){
return "Не удалось удалить ключи с компьютера.";
}

if(
!/[\u0400-\u04FF]/.test(
raw
)
){
return context ===
"clear"
? "Не удалось удалить ключи. Попробуйте ещё раз или перезапустите приложение."
: `Не удалось сохранить ключи. Проверьте API Key и Secret в личном кабинете ${exchangeName}.`;
}

return raw;

}

function showClearKeysConfirm(
exchangeName
){

return new Promise(
resolve=>{

const overlay =
document.createElement(
"div"
);
overlay.className =
"trade-exchange-confirm-overlay";
overlay.innerHTML =
`
<div class="trade-exchange-confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="trade-exchange-clear-title">
<p id="trade-exchange-clear-title" class="trade-exchange-confirm-message">Удалить сохранённые API-ключи ${exchangeName} с этого компьютера?</p>
<div class="trade-exchange-confirm-actions">
<button type="button" class="trade-exchange-confirm-cancel" data-action="cancel">Отмена</button>
<button type="button" class="trade-exchange-confirm-yes" data-action="yes">Удалить</button>
</div>
</div>`;

document.body.appendChild(
overlay
);

const finish =
confirmed=>{

overlay.remove();
document.removeEventListener(
"keydown",
onKey
);
resolve(
confirmed
);

};

const onKey =
event=>{

if(
event.key ===
"Escape"
){
finish(
false
);
}

};

document.addEventListener(
"keydown",
onKey
);

overlay.addEventListener(
"click",
event=>{

const action =
event.target.closest(
"[data-action]"
)?.dataset.action;

if(
action ===
"yes"
){
finish(
true
);
return;
}

if(
action ===
"cancel" ||
event.target ===
overlay
){
finish(
false
);
}

}
);

overlay.querySelector(
".trade-exchange-confirm-cancel"
)?.focus();

}
);

}

function buildConnectionFormHtml(
exchangeId
){

const def =
EXCHANGE_DEFINITIONS[
exchangeId
] ||
EXCHANGE_DEFINITIONS.bybit;

return `
<form class="trade-exchange-form" data-exchange="${exchangeId}" autocomplete="off">
<p class="header-settings-section-title">${def.name}</p>
<div class="trade-exchange-connection-status" data-role="connection-status" hidden>
<span class="trade-exchange-connection-dot" aria-hidden="true"></span>
<span>Активно</span>
</div>
<p class="trade-exchange-hint">Ключи хранятся локально. Secret после сохранения не показываем.</p>
<label class="trade-exchange-field">
<span>API Key</span>
<input type="text" name="apiKey" autocomplete="off" spellcheck="false" inputmode="verbatim"/>
</label>
<label class="trade-exchange-field">
<span>API Secret</span>
<input type="password" name="apiSecret" autocomplete="new-password" spellcheck="false" placeholder=""/>
</label>
<p class="trade-exchange-balance" data-role="balance" hidden></p>
<p class="trade-exchange-status-text" data-role="status" aria-live="polite"></p>
<div class="trade-exchange-actions">
<button type="submit" class="trade-exchange-save">Сохранить</button>
<button type="button" class="trade-exchange-clear" data-role="clear">Удалить ключи</button>
<button type="button" class="trade-exchange-refresh" data-role="refresh-balance" hidden title="Обновить баланс USDT">Обновить</button>
</div>
<hr class="trade-exchange-divider"/>
<p class="header-settings-section-title">Пинг до ${def.name}</p>
<p class="trade-exchange-hint">Задержка публичного API и signed-запросов. Для торговли лучше &lt;100&nbsp;ms.</p>
<div class="trade-exchange-ping-row">
<p class="trade-exchange-ping" data-role="ping" aria-live="polite"><span data-role="ping-main">—</span></p>
<button type="button" class="trade-exchange-refresh" data-role="refresh-ping">Измерить</button>
</div>
<p class="trade-exchange-ping-detail" data-role="ping-detail" hidden></p>
</form>
`;

}

function buildExchangeSwitcherHtml(){

return EXCHANGE_IDS.map(
id=>{
const def =
EXCHANGE_DEFINITIONS[
id
];
return `
<div class="exchange-switcher-badge" data-exchange="${id}">
<span class="exchange-switcher-name">${def.name}</span>
<label class="exchange-switcher-toggle" aria-label="${def.name}">
<input type="checkbox" data-role="exchange-toggle" data-exchange="${id}"/>
<span class="exchange-switcher-slider" aria-hidden="true"></span>
</label>
</div>
`;
}
).join(
""
);

}

function buildPanelShell(
root
){

root.innerHTML =
`
<div class="exchange-connections-panel">
<p class="header-settings-section-title exchange-connections-heading">Биржи</p>
<div class="exchange-switcher-row" data-role="exchange-switcher">
${buildExchangeSwitcherHtml()}
</div>
<div class="exchange-connection-form-host" data-role="connection-form-host"></div>
</div>
`;

return root.querySelector(
".exchange-connections-panel"
);

}

function bindDropdown(
wrap,
btn,
dropdown,
{
onOpen,
onClose,
positionPanel
} = {}
){

function setOpen(
open
){

dropdown.classList.toggle(
"hidden",
!open
);
btn.setAttribute(
"aria-expanded",
open
? "true"
: "false"
);

if(
open
){
positionPanel?.();
onOpen?.();
}else{
onClose?.();
dropdown.classList.remove(
"trade-exchange-dropdown--portaled"
);
dropdown.style.left =
"";
dropdown.style.top =
"";
dropdown.style.right =
"";
dropdown.style.bottom =
"";
}

}

btn.addEventListener(
"click",
event=>{
event.stopPropagation();
setOpen(
dropdown.classList.contains(
"hidden"
)
);
}
);

dropdown.addEventListener(
"click",
event=>{
event.stopPropagation();
}
);

document.addEventListener(
"click",
event=>{

if(
wrap.contains(
event.target
) ||
dropdown.contains(
event.target
)
){
return;
}

setOpen(
false
);

}
);

return {
close:()=>
setOpen(
false
)
};

}

function pingQuality(
ms
){

if(
!Number.isFinite(
ms
)
){
return {
label:
"—",
kind:
""
};
}

if(
ms <
80
){
return {
label:
"отлично",
kind:
"is-good"
};
}

if(
ms <
150
){
return {
label:
"нормально",
kind:
"is-good"
};
}

if(
ms <
400
){
return {
label:
"заметная задержка",
kind:
"is-warn"
};
}

return {
label:
"высокая задержка",
kind:
"is-bad"
};

}

function formatPingText(
result,
exchangeId
){

const name =
EXCHANGE_DEFINITIONS[
exchangeId
]?.name ||
"биржи";

if(
!result?.ok
){
return {
text:
result?.message ||
`Нет связи с ${name}`,
kind:
"is-bad",
detail:
""
};
}

if(
exchangeId !==
"bybit" &&
exchangeId !==
"bingx"
){
const quality =
pingQuality(
result.publicMs
);
return {
text:
`API ${result.publicMs} ms — ${quality.label}`,
kind:
quality.kind,
detail:
""
};
}

const parts =
[];

if(
Number.isFinite(
result.publicMs
)
){
parts.push(
`API ${result.publicMs} ms`
);
}

if(
Number.isFinite(
result.tradingMs
)
){
parts.push(
`торговля ${result.tradingMs} ms`
);
}

const worst =
Math.max(
Number.isFinite(
result.tradingMs
)
? result.tradingMs
: 0,
Number.isFinite(
result.publicMs
)
? result.publicMs
: 0
);
const quality =
pingQuality(
worst
);
const detail =
result.tradingWarning
? result.tradingWarning
: (
!result.configured
? "Торговый пинг доступен после сохранения ключей."
: ""
);

return {
text:
`${parts.join(
" · "
)} — ${quality.label}`,
kind:
quality.kind,
detail
};

}

function wireForm(
form,
{
exchangeId,
onSaved
} = {}
){

const api =
tradingApi();
const usesDesktopKeys =
exchangeId ===
"bybit" ||
exchangeId ===
"bingx";

if(
!form
){
return {
refreshPing:()=>{}
};
}

if(
usesDesktopKeys &&
!api
){
return {
refreshPing:()=>{}
};
}

const keyInput =
form.querySelector(
'input[name="apiKey"]'
);
const secretInput =
form.querySelector(
'input[name="apiSecret"]'
);
const statusEl =
form.querySelector(
'[data-role="status"]'
);
const clearBtn =
form.querySelector(
'[data-role="clear"]'
);
const saveBtn =
form.querySelector(
".trade-exchange-save"
);
const refreshBtn =
form.querySelector(
'[data-role="refresh-balance"]'
);
const balanceEl =
form.querySelector(
'[data-role="balance"]'
);
let lastOkUsdtFormatted =
null;
const pingEl =
form.querySelector(
'[data-role="ping"]'
);
const pingMainEl =
form.querySelector(
'[data-role="ping-main"]'
);
const pingDetailEl =
form.querySelector(
'[data-role="ping-detail"]'
);
const refreshPingBtn =
form.querySelector(
'[data-role="refresh-ping"]'
);

function setPing(
text,
kind =
"",
detail =
""
){

if(
pingMainEl
){
pingMainEl.textContent =
text ||
"—";
}

if(
pingEl
){
pingEl.classList.remove(
"is-good",
"is-warn",
"is-bad"
);

if(
kind
){
pingEl.classList.add(
kind
);
}

}

if(
pingDetailEl
){

if(
detail
){
pingDetailEl.hidden =
false;
pingDetailEl.textContent =
detail;
}else{
pingDetailEl.hidden =
true;
pingDetailEl.textContent =
"";
}

}

}

async function refreshPing(){

if(
refreshPingBtn
){
refreshPingBtn.disabled =
true;
}

setPing(
"Измеряем…"
);

try{

let result;

if(
usesDesktopKeys
){

if(
!api?.pingBybit
){
setPing(
"Пинг доступен только в desktop-приложении"
);
return;
}

result =
await api.pingBybit({
exchangeId,
testnet:
false
});

}else{

result =
await pingActiveExchangePublic();

}

const formatted =
formatPingText(
result,
exchangeId
);
setPing(
formatted.text,
formatted.kind,
formatted.detail
);
}catch(
err
){
setPing(
err?.message ||
"Ошибка измерения",
"is-bad"
);
}finally{

if(
refreshPingBtn
){
refreshPingBtn.disabled =
false;
}

}

}

const SECRET_SAVED_PLACEHOLDER =
"••••••••••••••••";

function applySecretSavedUi(
saved
){

if(
!secretInput
){
return;
}

if(
saved
){
secretInput.value =
SECRET_SAVED_PLACEHOLDER;
secretInput.readOnly =
true;
secretInput.dataset.secretSaved =
"1";
}else{
secretInput.value =
"";
secretInput.readOnly =
false;
secretInput.placeholder =
"";
delete secretInput.dataset.secretSaved;
}

}

secretInput?.addEventListener(
"focus",
()=>{

if(
secretInput.dataset.secretSaved
){
secretInput.readOnly =
false;
secretInput.value =
"";
secretInput.placeholder =
"Введите secret заново";
delete secretInput.dataset.secretSaved;
}

}
);

function setBalance(
text,
visible =
true
){

if(
!balanceEl
){
return;
}

if(
!visible ||
!text
){
lastOkUsdtFormatted =
null;
balanceEl.hidden =
true;
balanceEl.textContent =
"";
return;
}

balanceEl.hidden =
false;
balanceEl.textContent =
text;

}

function setOkBalance(
formatted
){

lastOkUsdtFormatted =
formatted;
balanceEl?.classList.remove(
"is-error"
);
setBalance(
`Баланс USDT: ${maskTradeDisplay(formatted)}`
);

}

function refreshBalancePrivacy(){

if(
lastOkUsdtFormatted ==
null ||
!balanceEl ||
balanceEl.hidden ||
balanceEl.classList.contains(
"is-error"
)
){
return;
}

setBalance(
`Баланс USDT: ${maskTradeDisplay(lastOkUsdtFormatted)}`
);

}

function setRefreshVisible(
visible
){

if(
!refreshBtn
){
return;
}

refreshBtn.hidden =
!visible;

}

async function refreshBalance(){

if(
!usesDesktopKeys
){
setBalance(
null,
false
);
return;
}

if(
!api?.getWalletBalance
){
setBalance(
null,
false
);
return;
}

if(
refreshBtn
){
refreshBtn.disabled =
true;
}

setBalance(
"Баланс: …"
);

try{
const bal =
await api.getWalletBalance({
exchangeId
});

if(
!bal?.ok
){
lastOkUsdtFormatted =
null;
setBalance(
bal?.message
? `Баланс: ${formatTradingUserError(
bal.message,
"balance",
exchangeId
)}`
: "Баланс: ошибка",
true
);
balanceEl?.classList.add(
"is-error"
);
return;
}

const num =
Number(
bal.usdt
);

const formatted =
Number.isFinite(
num
)
? num.toLocaleString(
"ru-RU",
{
maximumFractionDigits:
2
}
)
: String(
bal.usdt
);
setOkBalance(
formatted
);
}catch(
err
){
lastOkUsdtFormatted =
null;
setBalance(
`Баланс: ${err?.message || "ошибка"}`
);
balanceEl?.classList.add(
"is-error"
);
}finally{

if(
refreshBtn
){
refreshBtn.disabled =
false;
}

}

}

function setStatus(
text,
kind =
""
){

if(
!statusEl
){
return;
}

statusEl.textContent =
text ||
"";
statusEl.classList.remove(
"is-ok",
"is-error"
);

if(
kind
){
statusEl.classList.add(
kind
);
}

}

async function refreshStatus(){

try{

if(
usesDesktopKeys
){

const info =
await api.getStatus({
exchangeId,
revealApiKey:
true
});

if(
info?.apiKey
){
keyInput.value =
info.apiKey;
}

if(
info?.configured &&
info?.hasSecret
){
applySecretSavedUi(
true
);
setRefreshVisible(
true
);
await refreshBalance();
}else{
applySecretSavedUi(
false
);
setRefreshVisible(
false
);
setBalance(
null,
false
);
}

if(
info?.configured
){
setStatus(
"Ключи сохранены",
"is-ok"
);
}else{
setStatus(
"Ключи не заданы"
);
}

onSaved?.(
info
);
return;

}

const info =
readExchangeCredentials(
exchangeId
);

if(
info?.apiKey
){
keyInput.value =
info.apiKey;
}

if(
info?.configured &&
info?.hasSecret
){
applySecretSavedUi(
true
);
}else{
applySecretSavedUi(
false
);
}

setRefreshVisible(
false
);
setBalance(
null,
false
);

setStatus(
info?.configured
? "Ключи сохранены"
: "Ключи не заданы",
info?.configured
? "is-ok"
: ""
);

onSaved?.(
info
);

}catch(
err
){
setStatus(
err?.message ||
"Не удалось прочитать статус подключения",
"is-error"
);
}

}

form.addEventListener(
"submit",
event=>{
event.preventDefault();
void (
async()=>{

saveBtn.disabled =
true;
clearBtn.disabled =
true;

try{

const keyTrim =
keyInput.value.trim();
const secretValue =
secretInput.value.trim();
const secretSaved =
secretInput.dataset.secretSaved ===
"1";

if(
usesDesktopKeys
){

const info =
await api.getStatus({
exchangeId,
revealApiKey:
true
});
const keyUnchanged =
!!info?.configured &&
keyTrim ===
String(
info?.apiKey ||
""
).trim();
const secretUnchanged =
secretSaved &&
(
!secretValue ||
secretValue ===
SECRET_SAVED_PLACEHOLDER
);

if(
keyUnchanged &&
secretUnchanged
){
setStatus(
"Ключи уже сохранены — менять нечего",
"is-ok"
);
return;
}

const payload =
{
exchangeId,
apiKey:
keyTrim,
testnet:
false
};

if(
!secretSaved ||
(
secretValue &&
secretValue !==
SECRET_SAVED_PLACEHOLDER
)
){
payload.apiSecret =
secretValue;
}

const result =
await api.saveKeys(
payload
);

applySecretSavedUi(
true
);

if(
result?.ok ===
false
){
setStatus(
formatTradingUserError(
result.message,
"save",
exchangeId
),
"is-error"
);
return;
}

if(
result?.streamWarning
){
setStatus(
result.message ||
"Ключи сохранены. Перезапустите приложение, если позиции не обновляются.",
"is-ok"
);
}else{
setStatus(
"Сохранено",
"is-ok"
);
}
await refreshBalance();
onSaved?.(
result
);
return;

}

const prev =
readExchangeCredentials(
exchangeId
);
const keyUnchanged =
!!prev?.configured &&
keyTrim ===
String(
prev?.apiKey ||
""
).trim();
const secretUnchanged =
secretSaved &&
!getExchangeSecretForSave(
exchangeId,
secretValue,
secretSaved
);

if(
keyUnchanged &&
secretUnchanged
){
setStatus(
"Ключи уже сохранены — менять нечего",
"is-ok"
);
return;
}

const secretToSave =
getExchangeSecretForSave(
exchangeId,
secretValue,
secretSaved
);

if(
!secretSaved &&
!secretToSave
){
setStatus(
"Укажите API Secret.",
"is-error"
);
return;
}

writeExchangeCredentials(
exchangeId,
{
apiKey:
keyTrim,
apiSecret:
secretToSave ||
undefined
}
);

applySecretSavedUi(
true
);
setStatus(
"Сохранено",
"is-ok"
);
onSaved?.({
configured:
true,
apiKey:
keyTrim,
hasSecret:
true
});

}catch(
err
){
setStatus(
formatTradingUserError(
err?.message,
"save"
),
"is-error"
);
}finally{
saveBtn.disabled =
false;
clearBtn.disabled =
false;
}

}
)();
}
);

clearBtn.addEventListener(
"click",
()=>{
void (
async()=>{

const exchangeName =
EXCHANGE_DEFINITIONS[
exchangeId
]?.name ||
exchangeId;

const confirmed =
await showClearKeysConfirm(
exchangeName
);

if(
!confirmed
){
return;
}

saveBtn.disabled =
true;
clearBtn.disabled =
true;

try{

if(
usesDesktopKeys
){

const result =
await api.clearKeys({
exchangeId
});
keyInput.value =
"";
applySecretSavedUi(
false
);
setRefreshVisible(
false
);
setBalance(
null,
false
);

if(
result?.ok ===
false
){
setStatus(
formatTradingUserError(
result.message,
"clear",
exchangeId
),
"is-error"
);
return;
}

setStatus(
"Ключи удалены"
);
onSaved?.(
result
);
return;

}

clearExchangeCredentials(
exchangeId
);
keyInput.value =
"";
applySecretSavedUi(
false
);
setRefreshVisible(
false
);
setBalance(
null,
false
);
setStatus(
"Ключи удалены"
);
onSaved?.({
configured:
false
});

}catch(
err
){
setStatus(
formatTradingUserError(
err?.message,
"clear"
),
"is-error"
);
}finally{
saveBtn.disabled =
false;
clearBtn.disabled =
false;
}

}
)();
}
);

refreshBtn?.addEventListener(
"click",
()=>{
void refreshBalance();
}
);

window.addEventListener(
"trade-total-pnl-visibility-changed",
refreshBalancePrivacy
);

refreshPingBtn?.addEventListener(
"click",
()=>{
void refreshPing();
}
);

setPing(
"—"
);

void refreshStatus();

return {
refreshPing:()=>{
void refreshPing();
}
};

}

function syncExchangeToggleUi(
panel,
activeId
){

panel.querySelectorAll(
'[data-role="exchange-toggle"]'
).forEach(
input=>{

const id =
input.dataset.exchange;
const on =
id ===
activeId;
input.checked =
on;
input.closest(
".exchange-switcher-badge"
)?.classList.toggle(
"is-active",
on
);

}
);

}

function mountConnectionForm(
host,
exchangeId,
{
onSaved
}
){

const formHost =
host.querySelector(
'[data-role="connection-form-host"]'
);

if(
!formHost
){
return {
refreshPing:()=>{}
};
}

formHost.innerHTML =
buildConnectionFormHtml(
exchangeId
);

const form =
formHost.querySelector(
".trade-exchange-form"
);

return wireForm(
form,
{
exchangeId,
onSaved
}
);

}

export function mountExchangeConnectionsPanel(
host,
{
onSaved
} = {}
){

if(
!host ||
host.dataset.connectionsMounted ===
"1"
){
return host.__connectionsCtl || {
refreshPing:()=>{}
};
}

host.dataset.connectionsMounted =
"1";

const panel =
buildPanelShell(
host
);

let activeId =
getActiveExchangeId();

let formCtl =
mountConnectionForm(
panel,
activeId,
{
onSaved
}
);

syncExchangeToggleUi(
panel,
activeId
);

panel.querySelectorAll(
'[data-role="exchange-toggle"]'
).forEach(
input=>{
input.addEventListener(
"change",
()=>{

const id =
input.dataset.exchange;

if(
!input.checked
){

if(
id ===
activeId
){
input.checked =
true;

const other =
EXCHANGE_IDS.find(
ex=>
ex !==
id
);

if(
other
){
activeId =
setActiveExchangeId(
other
);
syncExchangeToggleUi(
panel,
activeId
);
formCtl =
mountConnectionForm(
panel,
activeId,
{
onSaved
}
);
void formCtl.refreshPing?.();
}

return;

}

return;

}

activeId =
setActiveExchangeId(
id
);
syncExchangeToggleUi(
panel,
activeId
);
formCtl =
mountConnectionForm(
panel,
activeId,
{
onSaved
}
);
void formCtl.refreshPing?.();

}
);
}
);

const ctl =
{
refreshPing:()=>{
void formCtl.refreshPing?.();
}
};

host.__connectionsCtl =
ctl;

return ctl;

}

export function mountBybitSettingsPanel(
host,
opts
){

return mountExchangeConnectionsPanel(
host,
opts
);

}

export function updateTradeExchangeConnectionChrome(
info
){

const connected =
!!info?.configured;

document.querySelectorAll(
'[data-role="connection-status"]'
).forEach(
el=>{
el.hidden =
!connected;
el.classList.toggle(
"is-active",
connected
);
}
);

}

function updateConnectionChrome(
info
){

updateTradeExchangeConnectionChrome(
info
);

}

export function initTradeExchangeSettings(){

if(
!window.cryptoTerminalDesktop?.isDesktop ||
!tradingApi()
){
return;
}

const activeId =
getActiveExchangeId();

void tradingApi().getStatus().then(
mainStatus=>{

void tradingApi().getStatus({
exchangeId:
activeId
}).then(
status=>{

updateConnectionChrome(
status
);

if(
mainStatus?.exchangeId !==
activeId
){
void tradingApi().setActiveExchange?.(
activeId
).catch(
()=>{}
);
}

}
).catch(
()=>{}
);

}
).catch(
()=>{}
);

const onSaved =
info=>{
updateConnectionChrome(
info
);
};

window.__tradeExchangeOnSaved =
onSaved;

}
