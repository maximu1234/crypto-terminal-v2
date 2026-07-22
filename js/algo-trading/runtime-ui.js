/**
 * UI: алго-профиль ключей + фон runtime (dropdown в topbar).
 */
import {
getAlgoTradingStatus,
setAlgoTradingEnabled,
getAlgoTradingKeysStatus,
saveAlgoTradingKeys,
clearAlgoTradingKeys,
getAlgoTradingWalletBalance,
setAlgoTradingMode
} from "./runtime-bridge.js?v=6";
import {
fetchAlgoBotStatus,
isAlgoBotDesktop
} from "./bot-bridge.js?v=8";

const SECRET_SAVED_PLACEHOLDER =
"••••••••••••••••";

function isLiveTradingEditionEnabled(){

try{
const desktop =
window.cryptoTerminalDesktop;

if(
!desktop?.isDesktop
){
return true;
}

if(
desktop.algoLiveTradingEnabled ===
false
){
return false;
}

if(
desktop.algoTrading?.liveTradingEnabled ===
false
){
return false;
}

const edition =
String(
desktop.algoDesktopEdition ||
desktop.algoTrading?.edition ||
"f"
).toLowerCase();

return edition !==
"m";
}catch{
return true;
}

}

/**
 * @param {{ getExchangeId?: () => string }} [host]
 */
export function mountAlgoRuntimeUi(
host =
{}
){

const settingsBtn =
document.getElementById(
"algo-settings-btn"
);
const settingsDrop =
document.getElementById(
"algo-settings-dropdown"
);
const bgToggle =
document.getElementById(
"algo-runtime-bg"
);
const statusEl =
document.getElementById(
"algo-runtime-status"
);
const keyInput =
document.getElementById(
"algo-runtime-api-key"
);
const secretInput =
document.getElementById(
"algo-runtime-api-secret"
);
const saveBtn =
document.getElementById(
"algo-runtime-save-keys"
);
const clearBtn =
document.getElementById(
"algo-runtime-clear-keys"
);
const keysHint =
document.getElementById(
"algo-runtime-keys-hint"
);
const keysBlock =
document.getElementById(
"algo-runtime-keys-block"
);
const balanceEl =
document.getElementById(
"algo-runtime-balance"
);
const modeHint =
document.getElementById(
"algo-trading-mode-hint"
);
const modeBtns =
[
...document.querySelectorAll(
"[data-algo-trading-mode]"
)
];

/** @type {"live"|"manual"} */
let tradingMode =
"live";
let botRunning =
false;

function formatUsdtBalance(
raw
){

const n =
Number(
raw
);

if(
!Number.isFinite(
n
)
){
return "—";
}

return `${n.toLocaleString(
"en-US",
{
minimumFractionDigits:
2,
maximumFractionDigits:
2
}
)} USDT`;

}

function exchangeId(){

return host.getExchangeId?.() ||
"bybit";

}

function setOpen(
open
){

if(
!settingsDrop ||
!settingsBtn
){
return;
}

settingsDrop.classList.toggle(
"hidden",
!open
);
settingsBtn.setAttribute(
"aria-expanded",
open
? "true"
: "false"
);

}

function setStatusText(
text
){

if(
statusEl
){
statusEl.textContent =
text ||
"";
}

}

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
secretInput.placeholder =
"";
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

function applyModeUi(){

const liveEnabled =
isLiveTradingEditionEnabled();

if(
!liveEnabled
){
tradingMode =
"manual";
}

for(
const btn of modeBtns
){
const mode =
btn.getAttribute(
"data-algo-trading-mode"
) ===
"manual"
? "manual"
: "live";
const active =
mode ===
tradingMode;
btn.classList.toggle(
"active",
active
);
btn.setAttribute(
"aria-selected",
active
? "true"
: "false"
);

if(
mode ===
"live" &&
!liveEnabled
){
btn.disabled =
true;
btn.title =
"В этой сборке (m) доступна только ручная торговля";
btn.setAttribute(
"aria-disabled",
"true"
);
}else{
btn.disabled =
botRunning;
btn.title =
"";
btn.setAttribute(
"aria-disabled",
botRunning
? "true"
: "false"
);
}
}

if(
keysHint
){
if(
!liveEnabled
){
keysHint.textContent =
"Сборка m: только ручная торговля (алерты). Ключи биржи не нужны.";
}else if(
tradingMode ===
"manual"
){
keysHint.textContent =
"Ручной режим: ключи биржи не нужны. Для алертов — вход Multichart и Telegram Chat ID. Доступна только Стратегия 1.";
}else{
keysHint.textContent =
"Ключи только для Алго — не те, что в Терминале.";
}
}

if(
modeHint
){
if(
!liveEnabled
){
modeHint.textContent =
"Сборка m (manual): Реальная торговля отключена. Только алерты, Стратегия 1.";
}else{
modeHint.textContent =
botRunning
? "Смена режима недоступна, пока бот запущен."
: "Реальная: бот ставит триггеры на бирже (нужны ключи), Стратегии 1–3. Ручная: алерты на вход, только Стратегия 1.";
}
}

const keysDisabled =
tradingMode ===
"manual";

if(
keysBlock
){
keysBlock.classList.toggle(
"is-disabled",
keysDisabled
);
keysBlock.setAttribute(
"aria-disabled",
keysDisabled
? "true"
: "false"
);
}

if(
keyInput
){
keyInput.disabled =
keysDisabled;
}

if(
secretInput
){
secretInput.disabled =
keysDisabled;
}

if(
saveBtn
){
saveBtn.disabled =
keysDisabled;
}

if(
clearBtn
){
clearBtn.disabled =
keysDisabled;
}

}

async function refresh(){

const status =
await getAlgoTradingStatus();
const keys =
await getAlgoTradingKeysStatus(
{
exchangeId:
exchangeId(),
revealApiKey:
true
}
);

if(
isAlgoBotDesktop()
){
const bot =
await fetchAlgoBotStatus();
botRunning =
!!bot?.running;
}else{
botRunning =
false;
}

tradingMode =
status?.tradingMode ===
"manual"
? "manual"
: "live";

if(
!isLiveTradingEditionEnabled() &&
tradingMode !==
"manual"
){
tradingMode =
"manual";
void setAlgoTradingMode(
"manual"
);
}

applyModeUi();
try{
window.dispatchEvent(
new CustomEvent(
"algo-trading-mode-changed",
{
detail:{
tradingMode
}
}
)
);
}catch{
/* ignore */
}

if(
bgToggle
){
bgToggle.checked =
!!status?.enabled;
}

const stateLabel =
{
stopped:
"остановлен",
starting:
"запуск…",
running:
"в фоне",
error:
"ошибка"
}[
status?.state
] ||
status?.state ||
"—";

const keyPart =
keys?.configured
? "ключ сохранён"
: "нет ключей алго-профиля";

setStatusText(
`${stateLabel} · ${keyPart}${status?.message ? ` · ${status.message}` : ""}`
);

if(
keysHint
){
keysHint.textContent =
keys?.configured
? "Ключи алго-профиля сохранены (отдельно от Терминала)."
: "Ключи только для Алго — не те, что в Терминале.";
}

if(
keyInput
){
keyInput.value =
keys?.apiKey ||
"";
}

if(
balanceEl
){

if(
!keys?.configured
){
balanceEl.textContent =
"—";
}else{
const bal =
await getAlgoTradingWalletBalance();

if(
bal?.ok
){
balanceEl.textContent =
formatUsdtBalance(
bal.usdt
);
}else{
balanceEl.textContent =
bal?.message
? `ошибка`
: "—";
balanceEl.title =
bal?.message ||
"";
}

}

}

applySecretSavedUi(
!!(
keys?.configured &&
keys?.hasSecret
)
);

}

settingsBtn?.addEventListener(
"click",
event=>{
event.preventDefault();
event.stopPropagation();
const open =
settingsDrop?.classList.contains(
"hidden"
) !==
false;
setOpen(
open
);

if(
open
){
void refresh();
}

}
);

document.addEventListener(
"click",
event=>{

if(
!settingsDrop ||
settingsDrop.classList.contains(
"hidden"
)
){
return;
}

const target =
event.target;

if(
target instanceof Node &&
(
settingsDrop.contains(
target
) ||
settingsBtn?.contains(
target
)
)
){
return;
}

setOpen(
false
);

}
);

document.addEventListener(
"keydown",
event=>{

if(
event.key ===
"Escape"
){
setOpen(
false
);
}

}
);

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

bgToggle?.addEventListener(
"change",
()=>{
void (
async()=>{
const res =
await setAlgoTradingEnabled(
!!bgToggle.checked,
exchangeId()
);

if(
res &&
res.ok ===
false &&
res.message
){
setStatusText(
res.message
);
}

await refresh();
}
)();
}
);

saveBtn?.addEventListener(
"click",
()=>{
void (
async()=>{
const keyTrim =
String(
keyInput?.value ||
""
).trim();
const secretValue =
String(
secretInput?.value ||
""
).trim();
const secretSaved =
secretInput?.dataset.secretSaved ===
"1";

if(
!keyTrim
){
setStatusText(
"введите API key"
);
return;
}

const payload =
{
exchangeId:
exchangeId(),
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

const res =
await saveAlgoTradingKeys(
payload
);

if(
res?.ok &&
res?.configured
){
applySecretSavedUi(
true
);
await refresh();
return;
}

if(
res?.ok &&
!res?.configured
){
setStatusText(
"сохранено, но ключи не прочитались — перезапустите приложение"
);
return;
}

setStatusText(
res?.message ||
"ошибка сохранения"
);
}
)();
}
);

clearBtn?.addEventListener(
"click",
()=>{
void (
async()=>{
await clearAlgoTradingKeys(
{
exchangeId:
exchangeId()
}
);

if(
keyInput
){
keyInput.value =
"";
}

applySecretSavedUi(
false
);

if(
bgToggle
){
bgToggle.checked =
false;
}

await refresh();
}
)();
}
);

for(
const btn of modeBtns
){
btn.addEventListener(
"click",
()=>{
void (
async()=>{
const next =
btn.getAttribute(
"data-algo-trading-mode"
) ===
"manual"
? "manual"
: "live";

if(
next ===
"live" &&
!isLiveTradingEditionEnabled()
){
setStatusText(
"Сборка m: Реальная торговля отключена"
);
return;
}

if(
next ===
tradingMode
){
return;
}

if(
botRunning
){
setStatusText(
"Остановите бота, чтобы сменить режим"
);
return;
}

const res =
await setAlgoTradingMode(
next
);

if(
res?.ok ===
false
){
setStatusText(
res?.message ||
"не удалось сменить режим"
);
await refresh();
return;
}

tradingMode =
res?.tradingMode ===
"manual"
? "manual"
: "live";
applyModeUi();
try{
window.dispatchEvent(
new CustomEvent(
"algo-trading-mode-changed",
{
detail:{
tradingMode
}
}
)
);
}catch{
/* ignore */
}
setStatusText(
tradingMode ===
"manual"
? "Ручная торговля (алерты) — только Стратегия 1"
: "Реальная торговля"
);
}
)();
}
);
}

void refresh();

return {
refresh,
close(){
setOpen(
false
);
}
};

}
