import {
getSupabaseUsagePrefs,
setSupabaseUsagePref,
syncAlertsCloudPauseToServer
} from "./supabase-usage-prefs.js?v=5";

const BANDWIDTH_CUT_NOTE =
"Realtime, авто-синхронизация флагов и автозагрузка из облака при фокусе отключены в коде (экономия лимитов Supabase Free). " +
"Флаги подтягиваются вручную: Настройки → Синхронизация → «Обновить». " +
"Рисунки хранятся только на устройстве.";

const ALERTS_FIELD =
{
key: "disableAlertsCloud",
label: "Отключить облачные алерты (Telegram)",
hint:
"Не синхронизирует price_alerts с Supabase и не обращается к alert-worker. " +
"Уведомления в Telegram с сервера не уходят. Снижает Egress и Realtime."
};

export function bindSupabaseUsagePrefsForm(
rootEl,
statusEl
){

if(
!rootEl
){
return;
}

const form =
document.createElement(
"form"
);
form.id =
"system-supabase-usage-form";
form.className =
"system-admin-pref-list";
form.setAttribute(
"autocomplete",
"off"
);

const note =
document.createElement(
"p"
);
note.className =
"system-admin-pref-note";
note.textContent =
BANDWIDTH_CUT_NOTE;

form.append(
note
);

const label =
document.createElement(
"label"
);
label.className =
"system-admin-pref-option";

const input =
document.createElement(
"input"
);
input.type =
"checkbox";
input.name =
ALERTS_FIELD.key;
input.dataset.pref =
ALERTS_FIELD.key;

const text =
document.createElement(
"span"
);
text.className =
"system-admin-pref-text";

const strong =
document.createElement(
"strong"
);
strong.textContent =
ALERTS_FIELD.label;

const hint =
document.createElement(
"span"
);
hint.className =
"system-admin-pref-hint";
hint.textContent =
ALERTS_FIELD.hint;

text.append(
strong,
hint
);
label.append(
input,
text
);
form.append(
label
);

rootEl.append(
form
);

function syncFromStorage(){

const prefs =
getSupabaseUsagePrefs();

input.checked =
!!prefs.disableAlertsCloud;

if(
statusEl
){
statusEl.textContent =
"Сохранено в этом браузере.";
}

}

syncFromStorage();

if(
getSupabaseUsagePrefs().disableAlertsCloud
){
void syncAlertsCloudPauseToServer(
true
);
}

form.addEventListener(
"change",
e=>{

const target =
e.target;

if(
!target?.dataset?.pref
){
return;
}

setSupabaseUsagePref(
target.dataset.pref,
target.checked
);

if(
statusEl
){
statusEl.textContent =
"Сохранено. Обновите вкладки с Терминалом / Алертами (F5), чтобы применить.";
}

}
);

window.addEventListener(
"supabase-usage-prefs-changed",
syncFromStorage
);

}
