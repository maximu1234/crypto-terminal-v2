/**
 * Настройки → Системные.
 */
import {
isLaunchAgentAtLoginEnabled,
isMenuBarTrayEnabled,
isMenuBarTrayPlatform,
setLaunchAgentAtLoginLocal,
setMenuBarTrayEnabled
} from "./desktop-menu-bar-tray-prefs.js?v=3";

import {
applyDesktopMenuBarTrayPreference
} from "./desktop-menu-bar-tray.js?v=10";

import {
ALERT_NOTIFY_MODE_LABELS,
ALERT_NOTIFY_MODES,
ALERT_TOAST_DURATION_OPTIONS_SEC,
getAlertNotifyMode,
getAlertToastDurationSec,
setAlertNotifyMode,
setAlertToastDurationSec
} from "./alert-ui-prefs.js?v=1";

import {
isScriptNavEnabled,
isAlgoTradingNavEnabled,
setScriptNavEnabled,
setAlgoTradingNavEnabled
} from "./desktop-feature-nav-prefs.js?v=2";

import {
TERMINAL_HISTORY_DEPTH_MAX,
TERMINAL_HISTORY_DEPTH_MIN,
getTerminalHistoryDepth,
setTerminalHistoryDepth
} from "./terminal-chart-history-prefs.js?v=1";

import {
renderHeaderNav
} from "./site-header-nav.js?v=7";

const APP_HEADER_NAV_ID =
"app-header-nav";

function isDesktopShell(){

return !!window.cryptoTerminalDesktop?.isDesktop ||
/Electron\//i.test(
navigator.userAgent ||
""
);

}

function refreshAppHeaderNav(){

document.querySelectorAll(
`#${APP_HEADER_NAV_ID}, .app-header-nav`
).forEach(
nav=>
renderHeaderNav(
nav
)
);

}
function syncTrayToggle(
input
){

if(
!input
){
return;
}

input.checked =
isMenuBarTrayEnabled();

}

function syncLaunchAgentToggle(
input
){

if(
!input
){
return;
}

input.checked =
isLaunchAgentAtLoginEnabled();
input.disabled =
!isMenuBarTrayEnabled();

}

async function hydrateLaunchAgentFromMain(
input
){

const desktop =
window.cryptoTerminalDesktop;

if(
!input ||
typeof desktop?.getMenuBarAgentPrefs !==
"function"
){
return;
}

try{
const result =
await desktop.getMenuBarAgentPrefs();
const enabled =
!!result?.prefs?.launchAgentAtLogin;

setLaunchAgentAtLoginLocal(
enabled
);
syncLaunchAgentToggle(
input
);
}catch{
/* ignore */
}

}

function buildAlertToastDurationOptions(
selectedSec
){

return ALERT_TOAST_DURATION_OPTIONS_SEC.map(
sec=>`
<option value="${sec}"${sec === selectedSec ? " selected" : ""}>${sec} сек</option>`
).join(
""
);

}

function syncAlertToastDuration(
select
){

if(
!select
){
return;
}

const current =
getAlertToastDurationSec();

select.innerHTML =
buildAlertToastDurationOptions(
current
);
select.value =
String(
current
);

}

function buildAlertNotifyModeOptions(
selectedMode
){

return ALERT_NOTIFY_MODES.map(
mode=>`
<option value="${mode}"${mode === selectedMode ? " selected" : ""}>${ALERT_NOTIFY_MODE_LABELS[mode]}</option>`
).join(
""
);

}

function syncAlertNotifyMode(
select
){

if(
!select
){
return;
}

const current =
getAlertNotifyMode();

select.innerHTML =
buildAlertNotifyModeOptions(
current
);
select.value =
current;

}

function requestSystemNotificationPermission(){

if(
typeof Notification ===
"undefined" ||
Notification.permission !==
"default"
){
return;
}

Notification.requestPermission().catch(
()=>{
/* ignore */
}
);

}

export function mountSystemSettingsPanel(
host
){

if(
!host ||
host.dataset.systemMounted ===
"1"
){
return {
refresh:()=>{}
};
}

host.dataset.systemMounted =
"1";

const trayBlock =
isMenuBarTrayPlatform()
? (
window.cryptoTerminalDesktop?.platform ===
"win32"
? `
<p class="app-settings-panel-lead">Поведение иконки Multichart в области уведомлений Windows.</p>
<label class="app-settings-toggle-row">
<input type="checkbox" class="app-settings-toggle-input" id="app-settings-menu-bar-tray" />
<span class="app-settings-toggle-label">Показывать иконку в области уведомлений</span>
</label>
<label class="app-settings-toggle-row">
<input type="checkbox" class="app-settings-toggle-input" id="app-settings-launch-agent-login" />
<span class="app-settings-toggle-label">Запускать агент при входе в систему</span>
</label>
<p class="app-settings-panel-hint">Без окна Multichart — только иконка в трее с PnL. Окно открывается из меню иконки («Открыть Multichart»). Закрытие окна сворачивает в агент.</p>
`
: `
<p class="app-settings-panel-lead">Поведение иконки Multichart в строке меню macOS.</p>
<label class="app-settings-toggle-row">
<input type="checkbox" class="app-settings-toggle-input" id="app-settings-menu-bar-tray" />
<span class="app-settings-toggle-label">Показывать иконку в системном меню</span>
</label>
<label class="app-settings-toggle-row">
<input type="checkbox" class="app-settings-toggle-input" id="app-settings-launch-agent-login" />
<span class="app-settings-toggle-label">Запускать агент при входе в систему</span>
</label>
<p class="app-settings-panel-hint">Без окна Multichart — только иконка в меню с PnL. Окно открывается по клику.</p>
`
)
: "";

const featureNavBlock =
isDesktopShell()
? `
<p class="app-settings-panel-lead${trayBlock ? " app-settings-panel-lead--spaced" : ""}">Модули desktop.</p>
<label class="app-settings-toggle-row">
<input type="checkbox" class="app-settings-toggle-input" id="app-settings-enable-script-nav" />
<span class="app-settings-toggle-label">Включить Скрипт</span>
</label>
<label class="app-settings-toggle-row">
<input type="checkbox" class="app-settings-toggle-input" id="app-settings-enable-algo-nav" />
<span class="app-settings-toggle-label">Включить АлгоТрейдинг</span>
</label>
<p class="app-settings-panel-hint">Пункты появляются в верхнем меню. По умолчанию выключены.</p>
`
: "";

const snapshotLogoBlock =
isDesktopShell()
? `
<p class="app-settings-panel-lead app-settings-panel-lead--spaced">Скриншот графика.</p>
<label class="app-settings-toggle-row">
<input type="checkbox" class="app-settings-toggle-input" id="app-settings-snapshot-logo-enabled" />
<span class="app-settings-toggle-label">Ставить лого на скриншот</span>
</label>
<div class="app-settings-field-row">
<span class="app-settings-field-label" id="app-settings-snapshot-logo-status">Логотип не загружен</span>
<button type="button" class="app-settings-action-btn" id="app-settings-snapshot-logo-upload">Загрузить PNG/JPG</button>
</div>
<p class="app-settings-panel-hint">PNG или JPG — сохраняем локально как PNG (оригинал + ч/б). На скриншоте — полупрозрачный логотип.</p>
`
: "";

host.innerHTML =
`
${trayBlock}
${featureNavBlock}
${snapshotLogoBlock}
<p class="app-settings-panel-lead app-settings-panel-lead--spaced">Терминал.</p>
<label class="app-settings-field-row" for="app-settings-terminal-history-depth">
<span class="app-settings-field-label">Глубина истории (свечей)</span>
<input type="number" id="app-settings-terminal-history-depth" class="app-settings-field-select" min="${TERMINAL_HISTORY_DEPTH_MIN}" max="${TERMINAL_HISTORY_DEPTH_MAX}" step="1000" inputmode="numeric" aria-label="Глубина истории свечей на Терминале"/>
</label>
<p class="app-settings-panel-hint">Сначала грузится ${TERMINAL_HISTORY_DEPTH_MIN}. При сдвиге графика влево — догрузка до этого лимита (${TERMINAL_HISTORY_DEPTH_MIN}–${TERMINAL_HISTORY_DEPTH_MAX}).</p>
<p class="app-settings-panel-lead app-settings-panel-lead--spaced">Алерты.</p>
<label class="app-settings-field-row" for="app-settings-alert-notify-mode">
<span class="app-settings-field-label">Канал уведомлений</span>
<select id="app-settings-alert-notify-mode" class="app-settings-field-select" aria-label="Канал уведомлений об алертах"></select>
</label>
<label class="app-settings-field-row" for="app-settings-alert-toast-duration">
<span class="app-settings-field-label">Продолжительность уведомления об алертах</span>
<select id="app-settings-alert-toast-duration" class="app-settings-field-select" aria-label="Продолжительность уведомления об алертах"></select>
</label>
`;

const trayInput =
host.querySelector(
"#app-settings-menu-bar-tray"
);
const launchAgentInput =
host.querySelector(
"#app-settings-launch-agent-login"
);
const scriptNavInput =
host.querySelector(
"#app-settings-enable-script-nav"
);
const algoNavInput =
host.querySelector(
"#app-settings-enable-algo-nav"
);
const alertNotifyModeSelect =
host.querySelector(
"#app-settings-alert-notify-mode"
);
const alertToastDurationSelect =
host.querySelector(
"#app-settings-alert-toast-duration"
);
const historyDepthInput =
host.querySelector(
"#app-settings-terminal-history-depth"
);
const snapshotLogoEnabledInput =
host.querySelector(
"#app-settings-snapshot-logo-enabled"
);
const snapshotLogoUploadBtn =
host.querySelector(
"#app-settings-snapshot-logo-upload"
);
const snapshotLogoStatus =
host.querySelector(
"#app-settings-snapshot-logo-status"
);

function applySnapshotLogoStatus(
status
){

if(
snapshotLogoEnabledInput
){
snapshotLogoEnabledInput.checked =
!!status?.enabled;
}

if(
snapshotLogoStatus
){
snapshotLogoStatus.textContent =
status?.hasLogo
? "Логотип загружен"
: "Логотип не загружен";
}

}

async function hydrateSnapshotLogo(){

const desktop =
window.cryptoTerminalDesktop;

if(
!snapshotLogoEnabledInput ||
typeof desktop?.chartSnapshotLogoGet !==
"function"
){
return;
}

try{
const status =
await desktop.chartSnapshotLogoGet();
applySnapshotLogoStatus(
status
);
}catch{
/* ignore */
}

}

syncTrayToggle(
trayInput
);
syncLaunchAgentToggle(
launchAgentInput
);
void hydrateLaunchAgentFromMain(
launchAgentInput
);

if(
scriptNavInput
){
scriptNavInput.checked =
isScriptNavEnabled();
}

if(
algoNavInput
){
algoNavInput.checked =
isAlgoTradingNavEnabled();
}

if(
historyDepthInput
){
historyDepthInput.value =
String(
getTerminalHistoryDepth()
);
}

syncAlertNotifyMode(
alertNotifyModeSelect
);
syncAlertToastDuration(
alertToastDurationSelect
);
void hydrateSnapshotLogo();

trayInput?.addEventListener(
"change",
()=>{

const enabled =
!!trayInput?.checked;

setMenuBarTrayEnabled(
enabled
);
syncLaunchAgentToggle(
launchAgentInput
);
void applyDesktopMenuBarTrayPreference();

}
);

scriptNavInput?.addEventListener(
"change",
()=>{

setScriptNavEnabled(
!!scriptNavInput.checked
);
refreshAppHeaderNav();

}
);

algoNavInput?.addEventListener(
"change",
()=>{

setAlgoTradingNavEnabled(
!!algoNavInput.checked
);
refreshAppHeaderNav();

}
);

snapshotLogoEnabledInput?.addEventListener(
"change",
async()=>{

const desktop =
window.cryptoTerminalDesktop;

if(
typeof desktop?.chartSnapshotLogoSetEnabled !==
"function"
){
return;
}

try{
const status =
await desktop.chartSnapshotLogoSetEnabled(
{
enabled:
!!snapshotLogoEnabledInput.checked
}
);
applySnapshotLogoStatus(
status
);
}catch{
/* ignore */
}

}
);

snapshotLogoUploadBtn?.addEventListener(
"click",
async()=>{

const desktop =
window.cryptoTerminalDesktop;

if(
typeof desktop?.chartSnapshotLogoPick !==
"function"
){
return;
}

snapshotLogoUploadBtn.disabled =
true;

try{
const status =
await desktop.chartSnapshotLogoPick();

if(
status?.canceled
){
return;
}

applySnapshotLogoStatus(
status
);
}catch{
/* ignore */
}finally{
snapshotLogoUploadBtn.disabled =
false;
}

}
);

const commitHistoryDepth =
()=>{

if(
!historyDepthInput
){
return;
}

const next =
setTerminalHistoryDepth(
historyDepthInput.value
);
historyDepthInput.value =
String(
next
);

};

historyDepthInput?.addEventListener(
"change",
commitHistoryDepth
);

historyDepthInput?.addEventListener(
"keydown",
e=>{

if(
e.key ===
"Enter"
){
e.preventDefault();
historyDepthInput.blur();
}

}
);

launchAgentInput?.addEventListener(
"change",
async()=>{

const enabled =
!!launchAgentInput?.checked;
const desktop =
window.cryptoTerminalDesktop;

setLaunchAgentAtLoginLocal(
enabled
);

if(
enabled
){
syncTrayToggle(
trayInput
);
void applyDesktopMenuBarTrayPreference();
}

if(
typeof desktop?.setLaunchAgentAtLogin !==
"function"
){
return;
}

try{
const result =
await desktop.setLaunchAgentAtLogin(
enabled
);

if(
result?.ok ===
false
){
setLaunchAgentAtLoginLocal(
false
);
syncLaunchAgentToggle(
launchAgentInput
);
}
}catch{
setLaunchAgentAtLoginLocal(
false
);
syncLaunchAgentToggle(
launchAgentInput
);
}

}
);

alertNotifyModeSelect?.addEventListener(
"change",
()=>{

setAlertNotifyMode(
alertNotifyModeSelect.value
);

if(
getAlertNotifyMode() ===
"system"
){
requestSystemNotificationPermission();
}

}
);

alertToastDurationSelect?.addEventListener(
"change",
()=>{

setAlertToastDurationSec(
alertToastDurationSelect.value
);

}
);

return {
refresh:()=>{
syncTrayToggle(
trayInput
);
syncLaunchAgentToggle(
launchAgentInput
);
void hydrateLaunchAgentFromMain(
launchAgentInput
);

if(
scriptNavInput
){
scriptNavInput.checked =
isScriptNavEnabled();
}

if(
algoNavInput
){
algoNavInput.checked =
isAlgoTradingNavEnabled();
}

syncAlertNotifyMode(
alertNotifyModeSelect
);
syncAlertToastDuration(
alertToastDurationSelect
);
void hydrateSnapshotLogo();
}
};

}
