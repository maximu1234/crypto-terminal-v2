/**
 * /trade — dropdown «Bybit» (только desktop .app, широкая шапка).
 */
import {
wireTradeVolumeDefaultsSettings,
TRADE_VOLUME_SLOT_COUNT
} from "./trade-volume-presets.js?v=7";

import {
wireAutoStopSettings
} from "./trade-auto-stops.js?v=1";

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
<span class="trade-volume-presets-suffix">USDT</span>
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

function buildForm(
root
){

root.innerHTML =
`
<form class="trade-exchange-form" autocomplete="off">
<p class="header-settings-section-title">Bybit</p>
<p class="trade-exchange-hint">Ключи сохраняются в Keychain. Secret после сохранения не показываем — только метку в поле.</p>
<label class="trade-exchange-field">
<span>API Key</span>
<input type="text" name="apiKey" autocomplete="off" spellcheck="false" inputmode="verbatim"/>
</label>
<label class="trade-exchange-field">
<span>API Secret</span>
<input type="password" name="apiSecret" autocomplete="new-password" spellcheck="false" placeholder=""/>
</label>
<label class="trade-exchange-check">
<input type="checkbox" name="testnet" checked/>
<span>Testnet (testnet.bybit.com)</span>
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
<p class="trade-exchange-hint">Эти значения показываются на всех монетах, пока вы не измените объём на конкретной монете. Повторное «Сохранить» ниже сбрасывает индивидуальные объёмы у всех монет.</p>
<div class="trade-volume-defaults-panel trade-volume-presets-panel" data-role="volume-defaults-panel">
${buildDefaultVolumeFieldsHtml()}
</div>
<div class="trade-exchange-actions">
<button type="button" class="trade-exchange-save" data-role="save-volume-defaults">Сохранить</button>
</div>
<p class="trade-exchange-status-text" data-role="volume-defaults-status" aria-live="polite"></p>
<hr class="trade-exchange-divider"/>
<p class="header-settings-section-title">Auto SL/TP (USDT)</p>
<p class="trade-exchange-hint">После исполнения рыночного входа автоматически выставляются стоп-лосс и тейк-профит. Значения — убыток/прибыль в USDT от позиции.</p>
<div class="trade-auto-stops-panel" data-role="auto-stops-panel">
<label class="trade-auto-stops-row">
<input type="checkbox" data-role="auto-sl-enabled"/>
<span class="trade-auto-stops-label">Stop Loss</span>
<span class="trade-volume-presets-field">
<input type="number" min="0" step="any" inputmode="decimal" data-role="auto-sl-usd" aria-label="Stop Loss USDT"/>
<span class="trade-volume-presets-suffix">USDT</span>
</span>
</label>
<label class="trade-auto-stops-row">
<input type="checkbox" data-role="auto-tp-enabled"/>
<span class="trade-auto-stops-label">Take Profit</span>
<span class="trade-volume-presets-field">
<input type="number" min="0" step="any" inputmode="decimal" data-role="auto-tp-usd" aria-label="Take Profit USDT"/>
<span class="trade-volume-presets-suffix">USDT</span>
</span>
</label>
</div>
<div class="trade-exchange-actions">
<button type="button" class="trade-exchange-save" data-role="save-auto-stops">Сохранить</button>
</div>
<p class="trade-exchange-status-text" data-role="auto-stops-status" aria-live="polite"></p>
<hr class="trade-exchange-divider"/>
<p class="header-settings-section-title">Пинг до Bybit</p>
<p class="trade-exchange-hint">Задержка до API и signed-запросов (как при выставлении ордеров). Для быстрой торговли лучше &lt;100&nbsp;ms.</p>
<p class="trade-exchange-ping" data-role="ping" aria-live="polite"><span data-role="ping-main">—</span></p>
<p class="trade-exchange-ping-detail" data-role="ping-detail" hidden></p>
<div class="trade-exchange-actions">
<button type="button" class="trade-exchange-refresh" data-role="refresh-ping">Измерить</button>
</div>
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
onClose
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
onOpen?.();
}else{
onClose?.();
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
()=>{
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
onSaved,
onOpen
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
const testnetInput =
form.querySelector(
'input[name="testnet"]'
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

let pingTimer =
null;

function stopPingTimer(){

if(
pingTimer !=
null
){
window.clearInterval(
pingTimer
);
pingTimer =
null;
}

}

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
testnetInput.checked
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

function startPingLoop(){

stopPingTimer();
void refreshPing();
pingTimer =
window.setInterval(
refreshPing,
10000
);
}

onOpen?.(
{
startPingLoop,
stopPingTimer
}
);

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
testnetInput.checked =
!!info?.testnet;

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
info.testnet
? "Ключи сохранены · Testnet"
: "Ключи сохранены · Mainnet",
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
"Не удалось прочитать статус",
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
const secretValue =
secretInput.value.trim();
const secretSaved =
secretInput.dataset.secretSaved ===
"1";
const payload =
{
apiKey:
keyInput.value.trim(),
testnet:
testnetInput.checked
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
result.message ||
"Не удалось сохранить",
"is-error"
);
return;
}

setStatus(
testnetInput.checked
? "Сохранено · Testnet"
: "Сохранено · Mainnet",
"is-ok"
);
await refreshBalance();
onSaved?.(
result
);
}catch(
err
){
setStatus(
err?.message ||
"Ошибка сохранения",
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
result.message ||
"Не удалось удалить",
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
err?.message ||
"Ошибка удаления",
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

void refreshStatus();

return {
startPingLoop,
stopPingTimer
};

}

function mountDesktop(
onSaved
){

const menu =
document.querySelector(
".coins-header-desktop"
);

if(
!menu ||
document.getElementById(
"trade-exchange-wrap"
)
){
return null;
}

const settingsWrap =
menu.querySelector(
"#header-settings-wrap"
);
const btcLink =
menu.querySelector(
".coins-btc-d-link"
);

const wrap =
document.createElement(
"div"
);
wrap.id =
"trade-exchange-wrap";
wrap.className =
"header-settings-wrap trade-exchange-wrap";

wrap.innerHTML =
`
<button type="button" class="header-settings-btn trade-exchange-btn" id="trade-exchange-btn" title="Подключение к Bybit" aria-label="Подключение к Bybit" aria-expanded="false" aria-haspopup="true">
<span class="trade-exchange-status-dot" aria-hidden="true"></span>
<span>Bybit</span>
</button>
<div class="header-settings-dropdown trade-exchange-dropdown hidden" id="trade-exchange-dropdown" role="dialog" aria-label="Настройки Bybit"></div>
`;

if(
btcLink
){
btcLink.insertAdjacentElement(
"afterend",
wrap
);
}else if(
settingsWrap
){
menu.insertBefore(
wrap,
settingsWrap
);
}else{
menu.appendChild(
wrap
);
}

const btn =
wrap.querySelector(
"#trade-exchange-btn"
);
const dropdown =
wrap.querySelector(
"#trade-exchange-dropdown"
);
const form =
buildForm(
dropdown
);

let pingControls =
null;

wireForm(
form,
{
onSaved,
onOpen:(
controls
)=>{
pingControls =
controls;
}
}
);

wireTradeVolumeDefaultsSettings(
form
);

wireAutoStopSettings(
form
);

bindDropdown(
wrap,
btn,
dropdown,
{
onOpen:()=>
pingControls?.startPingLoop?.(),
onClose:()=>
pingControls?.stopPingTimer?.()
}
);

return {
btn
};

}

function updateConnectionChrome(
info
){

const btn =
document.getElementById(
"trade-exchange-btn"
);

if(
btn
){
btn.classList.toggle(
"is-connected",
!!info?.configured
);
}

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

mountDesktop(
onSaved
);

void tradingApi().getStatus().then(
updateConnectionChrome
).catch(
()=>{}
);

}
