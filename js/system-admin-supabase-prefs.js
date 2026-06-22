import {
getSupabaseUsagePrefs,
setSupabaseUsagePref,
syncAlertsCloudPauseToServer,
SUPABASE_USAGE_PREF_KEYS
} from "./supabase-usage-prefs.js?v=2";

const FIELDS =
[
{
key: "disableRealtime",
label: "Отключить Supabase Realtime",
hint:
"Не держать WebSocket-каналы к БД (user_settings, user_drawings, price_alerts). " +
"Между вкладками и устройствами изменения не прилетают мгновенно — только после открытия вкладки, фокуса или фонового опроса. " +
"Сильно снижает расход лимита Realtime Messages."
},
{
key: "disableDrawingsCloud",
label: "Отключить облако рисунков",
hint:
"Не отправляет и не скачивает линии, Fib и прочие рисунки в таблицу user_drawings. " +
"Рисунки остаются только в этом браузере (localStorage). " +
"Снижает Egress и запросы к API Supabase."
},
{
key: "disableFavoritesCloud",
label: "Отключить облако флагов (избранное)",
hint:
"Не синхронизирует цветные флаги на монетах в user_settings. " +
"Флаги только локально на этом устройстве. " +
"Снижает Egress и нагрузку на Realtime (если он включён)."
},
{
key: "disableAlertsCloud",
label: "Отключить облачные алерты (Telegram)",
hint:
"Не синхронизирует price_alerts с Supabase и не обращается к alert-worker на Railway. " +
"Уведомления в Telegram с сервера не уходят; локальная работа страницы алертов может остаться ограниченной. " +
"Снижает Egress и Realtime."
},
{
key: "disableAutoDevicePull",
label: "Отключить автозагрузку из облака при фокусе",
hint:
"При возврате на вкладку сайта не запускает пакетный pull (рисунки + флаги + алерты разом). " +
"Полезно, если открыто много вкладок Multichart — меньше повторных скачиваний. " +
"После входа на новом устройстве данные можно подтянуть вручную (обновить страницу)."
},
{
key: "slowBackgroundSync",
label: "Медленный фоновый опрос (×2 интервал)",
hint:
"Реже повторяет фоновые проверки облака (опрос настроек ~5 с, быстрый poll рисунков/алертов), " +
"если Realtime выключен или событие не пришло. Синхронизация чуть запаздывает, меньше мелких REST-запросов."
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

for(
const field of
FIELDS
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

const note =
document.createElement(
"p"
);
note.className =
"system-admin-pref-note";
note.textContent =
"Настройки сохраняются в этом браузере (localStorage). Чтобы каналы Realtime закрылись, обновите открытые вкладки Multichart (F5).";

form.append(
note
);

rootEl.append(
form
);

function syncFromStorage(){

const prefs =
getSupabaseUsagePrefs();

form.querySelectorAll(
"input[data-pref]"
).forEach(input=>{

input.checked =
!!prefs[
input.dataset.pref
];

});

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

const input =
e.target;

if(
!input?.dataset?.pref
){
return;
}

setSupabaseUsagePref(
input.dataset.pref,
input.checked
);

if(
statusEl
){
statusEl.textContent =
"Сохранено. Обновите вкладки с Монетами / Терминалом / Алертами (F5), чтобы применить Realtime и облако.";
}

}
);

window.addEventListener(
"supabase-usage-prefs-changed",
syncFromStorage
);

}
