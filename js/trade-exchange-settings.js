/**
 * /trade — dropdown «Bybit» (только desktop .app, широкая шапка).
 */
import {
wireTradeVolumeDefaultsSettings,
TRADE_VOLUME_SLOT_COUNT
} from "./trade-volume-presets.js?v=9";

import {
wireAutoStopSettings
} from "./trade-auto-stops.js?v=2";

const TRADE_VOLUME_DEFAULT_INPUT_COUNT =
Math.max(
1,
TRADE_VOLUME_SLOT_COUNT - 1
);

function buildDefaultVolumeFieldsHtml(){

return Array.from(
{
length:
TRADE_VOLUME_DEFAULT_INPUT_COUNT
},
(
_unused,
index
)=>
`
<label class="trade-volume-presets-row trade-volume-defaults-row" data-default-volume-slot="${index}">
<span class="trade-volume-defaults-label">${index + 1}</span>
<span class="trade-volume-presets-field">
<input type="number" min="0" step="any" inputmode="decimal" aria-label="Объём USDT ${index + 1}"/>
<span class="trade-volume-presets-suffix">$</span>
</span>
</label>
`
).join(
""
);

}

function tradingApi(){

return window.cryptoTerminalDesktop?.trading;

}

function formatTradingUserError(
message,
context =
"save"
){

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
: "Не удалось сохранить ключи. Проверьте API Key и Secret в личном кабинете Bybit.";
}

return raw;

}

function showClearKeysConfirm(){

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
<p id="trade-exchange-clear-title" class="trade-exchange-confirm-message">Удалить сохранённые API-ключи Bybit с этого компьютера?</p>
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

function buildForm(
root
){

root.innerHTML =
`
<form class="trade-exchange-form" autocomplete="off">
<p class="header-settings-section-title">Bybit</p>
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
<p class="header-settings-section-title">Объёмы по умолчанию (USDT)</p>
<p class="trade-exchange-hint">Для всех монет, пока не задан свой объём. «Сохранить» сбрасывает индивидуальные значения.</p>
<div class="trade-volume-defaults-panel trade-volume-presets-panel" data-role="volume-defaults-panel">
${buildDefaultVolumeFieldsHtml()}
</div>
<div class="trade-exchange-actions">
<button type="button" class="trade-exchange-save" data-role="save-volume-defaults">Сохранить</button>
</div>
<p class="trade-exchange-status-text" data-role="volume-defaults-status" aria-live="polite"></p>
<hr class="trade-exchange-divider"/>
<p class="header-settings-section-title">Auto SL/TP (USDT)</p>
<p class="trade-exchange-hint">После рыночного входа — авто SL/TP в USDT от позиции.</p>
<div class="trade-auto-stops-panel" data-role="auto-stops-panel">
<label class="trade-auto-stops-row">
<input type="checkbox" data-role="auto-sl-enabled"/>
<span class="trade-auto-stops-label">Stop Loss</span>
<span class="trade-volume-presets-field">
<input type="number" min="0" step="any" inputmode="decimal" data-role="auto-sl-usd" aria-label="Stop Loss USDT"/>
<span class="trade-volume-presets-suffix">$</span>
</span>
</label>
<label class="trade-auto-stops-row">
<input type="checkbox" data-role="auto-tp-enabled"/>
<span class="trade-auto-stops-label">Take Profit</span>
<span class="trade-volume-presets-field">
<input type="number" min="0" step="any" inputmode="decimal" data-role="auto-tp-usd" aria-label="Take Profit USDT"/>
<span class="trade-volume-presets-suffix">$</span>
</span>
</label>
</div>
<div class="trade-exchange-actions">
<button type="button" class="trade-exchange-save" data-role="save-auto-stops">Сохранить</button>
</div>
<p class="trade-exchange-status-text" data-role="auto-stops-status" aria-live="polite"></p>
<hr class="trade-exchange-divider"/>
<p class="header-settings-section-title">Пинг до Bybit</p>
<p class="trade-exchange-hint">Задержка API и signed-запросов. Для торговли лучше &lt;100&nbsp;ms.</p>
<div class="trade-exchange-ping-row">
<p class="trade-exchange-ping" data-role="ping" aria-live="polite"><span data-role="ping-main">—</span></p>
<button type="button" class="trade-exchange-refresh" data-role="refresh-ping">Измерить</button>
</div>
<p class="trade-exchange-ping-detail" data-role="ping-detail" hidden></p>
</form>
`;

return root.querySelector(
".trade-exchange-form"
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
result
){

if(
!result?.ok
){
return {
text:
result?.message ||
"Нет связи с Bybit",
kind:
"is-bad",
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
onSaved
} = {}
){

const api =
tradingApi();

if(
!api
){
return;
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
!api?.pingBybit
){
setPing(
"Пинг доступен только в desktop-приложении"
);
return;
}

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
const result =
await api.pingBybit(
{
testnet:
false
}
);
const formatted =
formatPingText(
result
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
!api.getWalletBalance
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
await api.getWalletBalance();

if(
!bal?.ok
){
setBalance(
bal?.message
? `Баланс: ${bal.message}`
: "Баланс: ошибка",
true
);
balanceEl?.classList.add(
"is-error"
);
return;
}

balanceEl?.classList.remove(
"is-error"
);
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
setBalance(
`Баланс USDT: ${formatted}`
);
}catch(
err
){
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
const info =
await api.getStatus();

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
const info =
await api.getStatus();
const keyTrim =
keyInput.value.trim();
const secretValue =
secretInput.value.trim();
const secretSaved =
secretInput.dataset.secretSaved ===
"1";
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
"save"
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

const confirmed =
await showClearKeysConfirm();

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
const result =
await api.clearKeys();
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
"clear"
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

}

export function mountBybitSettingsPanel(
host,
{
onSaved
} = {}
){

if(
!host ||
host.dataset.bybitMounted ===
"1"
){
return {
refreshPing:()=>{}
};
}

host.dataset.bybitMounted =
"1";

const form =
buildForm(
host
);

wireForm(
form,
{
onSaved
}
);

wireTradeVolumeDefaultsSettings(
form
);

wireAutoStopSettings(
form
);

return {
refreshPing:()=>{
void form.querySelector(
'[data-role="refresh-ping"]'
)?.click?.();
}
};

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

const onSaved =
info=>{
updateConnectionChrome(
info
);
};

void tradingApi().getStatus().then(
updateConnectionChrome
).catch(
()=>{}
);

window.__tradeExchangeOnSaved =
onSaved;

}
