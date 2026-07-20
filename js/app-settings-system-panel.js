/**
 * Настройки → Системные.
 */
import {
isLaunchAgentAtLoginEnabled,
isMenuBarTrayEnabled,
isMenuBarTrayPlatform,
setLaunchAgentAtLoginLocal,
setMenuBarTrayEnabled
} from "./desktop-menu-bar-tray-prefs.js?v=2";

import {
applyDesktopMenuBarTrayPreference
} from "./desktop-menu-bar-tray.js?v=8";

import {
isScreenerPatternEnabled,
setScreenerPatternEnabled
} from "./screener-pattern-prefs.js?v=1";

import {
ALERT_NOTIFY_MODE_LABELS,
ALERT_NOTIFY_MODES,
ALERT_TOAST_DURATION_OPTIONS_SEC,
getAlertNotifyMode,
getAlertToastDurationSec,
setAlertNotifyMode,
setAlertToastDurationSec
} from "./alert-ui-prefs.js?v=1";

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

function syncPatternToggle(
input
){

if(
!input
){
return;
}

input.checked =
isScreenerPatternEnabled();

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
? `
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
: "";

host.innerHTML =
`
${trayBlock}
<p class="app-settings-panel-lead app-settings-panel-lead--spaced">Скринер.</p>
<label class="app-settings-toggle-row">
<input type="checkbox" class="app-settings-toggle-input" id="app-settings-screener-pattern-12" />
<span class="app-settings-toggle-label">Показывать Паттерн 1-2 1-2 в Скринере</span>
</label>
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
const patternInput =
host.querySelector(
"#app-settings-screener-pattern-12"
);
const alertNotifyModeSelect =
host.querySelector(
"#app-settings-alert-notify-mode"
);
const alertToastDurationSelect =
host.querySelector(
"#app-settings-alert-toast-duration"
);

syncTrayToggle(
trayInput
);
syncLaunchAgentToggle(
launchAgentInput
);
void hydrateLaunchAgentFromMain(
launchAgentInput
);
syncPatternToggle(
patternInput
);
syncAlertNotifyMode(
alertNotifyModeSelect
);
syncAlertToastDuration(
alertToastDurationSelect
);

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

patternInput?.addEventListener(
"change",
()=>{

setScreenerPatternEnabled(
!!patternInput?.checked
);

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
syncPatternToggle(
patternInput
);
syncAlertNotifyMode(
alertNotifyModeSelect
);
syncAlertToastDuration(
alertToastDurationSelect
);
}
};

}
