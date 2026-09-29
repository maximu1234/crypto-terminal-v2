import {
getSupabaseUsagePrefs,
setSupabaseUsagePref,
syncAlertsCloudPauseToServer
} from "./supabase-usage-prefs.js?v=7";

const BANDWIDTH_CUT_NOTE =
"Realtime и автозагрузка рисунков при фокусе отключены в коде (экономия лимитов Supabase Free). " +
"Облачные алерты и флаги Терминала (красный / зелёный / синий / серый) — по переключателям ниже: " +
"запрос при изменении и один при входе, без постоянного мониторинга. " +
"Рисунки хранятся только на устройстве.";

const USAGE_FIELDS =
[
{
key: "disableAlertsCloud",
label: "Отключить облачные алерты (Telegram)",
hint:
"Не синхронизирует price_alerts с Supabase и не обращается к alert-worker. " +
"Уведомления в Telegram с сервера не уходят. Снижает Egress и Realtime."
},
{
key: "disableFavoritesCloud",
label: "Отключить облачные флаги (Терминал)",
hint:
"Не синхронизирует красный / зелёный / синий / серый с Supabase. " +
"Флаги АлгоТрейдинга не затрагиваются. Без Realtime: один запрос при клике по флагу и один при входе."
}
];

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

for(
const field of
USAGE_FIELDS
){

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
field.key;
input.dataset.pref =
field.key;

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
field.label;

const hint =
document.createElement(
"span"
);
hint.className =
"system-admin-pref-hint";
hint.textContent =
field.hint;

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

}

rootEl.append(
form
);

function syncFromStorage(){

const prefs =
getSupabaseUsagePrefs();

for(
const field of
USAGE_FIELDS
){

const input =
form.querySelector(
`[data-pref="${field.key}"]`
);

if(
input
){
input.checked =
!!prefs[
field.key
];
}

}

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
"Сохранено. Обновите вкладки с Терминалом / Скринером / Алертами (F5), чтобы применить.";
}

}
);

window.addEventListener(
"supabase-usage-prefs-changed",
syncFromStorage
);

}
