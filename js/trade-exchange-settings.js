/**
 * /trade — dropdown «Bybit»: API key / secret → desktop Keychain.
 */
import {
jsUrl
} from "./asset-manifest.js?v=2";

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
<p class="trade-exchange-hint">Ключи сохраняются в Keychain на Mac. Secret не показываем после сохранения.</p>
<label class="trade-exchange-field">
<span>API Key</span>
<input type="text" name="apiKey" autocomplete="off" spellcheck="false" inputmode="verbatim"/>
</label>
<label class="trade-exchange-field">
<span>API Secret</span>
<input type="password" name="apiSecret" autocomplete="new-password" spellcheck="false"/>
</label>
<label class="trade-exchange-check">
<input type="checkbox" name="testnet" checked/>
<span>Testnet (testnet.bybit.com)</span>
</label>
<p class="trade-exchange-status-text" data-role="status" aria-live="polite"></p>
<div class="trade-exchange-actions">
<button type="submit" class="trade-exchange-save">Сохранить</button>
<button type="button" class="trade-exchange-clear" data-role="clear">Удалить ключи</button>
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
dropdown
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
const result =
await api.saveKeys({
apiKey:
keyInput.value.trim(),
apiSecret:
secretInput.value.trim(),
testnet:
testnetInput.checked
});

secretInput.value =
"";

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
secretInput.value =
"";

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

void refreshStatus();

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

bindDropdown(
wrap,
btn,
dropdown
);

wireForm(
form,
{
onSaved
}
);

return {
btn
};

}

function mountMobile(
onSaved
){

const panel =
document.getElementById(
"coins-nav-panel"
);

if(
!panel ||
document.getElementById(
"trade-exchange-mobile-block"
)
){
return;
}

const settingsBlock =
panel.querySelector(
".coins-nav-settings"
);

const block =
document.createElement(
"div"
);
block.id =
"trade-exchange-mobile-block";
block.className =
"trade-exchange-mobile-block";

block.innerHTML =
`
<p class="header-settings-section-title">Bybit</p>
<div class="header-settings-dropdown header-settings-dropdown--inline trade-exchange-dropdown" id="trade-exchange-mobile-panel"></div>
`;

if(
settingsBlock
){
panel.insertBefore(
block,
settingsBlock
);
}else{
panel.appendChild(
block
);
}

const panelInner =
block.querySelector(
"#trade-exchange-mobile-panel"
);
wireForm(
buildForm(
panelInner
),
{
onSaved
}
);

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
mountMobile(
onSaved
);

void tradingApi().getStatus().then(
updateConnectionChrome
).catch(
()=>{}
);

}
