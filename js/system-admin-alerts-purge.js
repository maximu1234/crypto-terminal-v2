import {
loadAllAlerts
} from "./alerts.js?v=104";

import {
purgeAlertGarbageFromCloud
} from "./alerts-cloud/garbage-purge.js?v=1";

const CONFIRM_PHRASE =
"PURGE_ALERT_GARBAGE";

function collectKeepActive(){

return loadAllAlerts()
.filter(
alert=>!
alert.triggeredAt
)
.map(
alert=>({
symbol:
String(
alert.symbol ||
""
).trim().toUpperCase(),
shape_id:
String(
alert.shapeId ||
alert.id ||
""
).trim()
})
)
.filter(
row=>
row.symbol &&
row.shape_id
);

}

function formatPurgeResult(
data
){

const parts =
[
`зомби: ${data.deletedZombies ?? 0}`,
`мягко удалённые: ${data.deletedSoft ?? 0}`,
`сироты: ${data.deletedOrphans ?? 0}`,
`события: ${data.deletedEvents ?? 0}`
];

let text =
`Готово (${data.keptActive ?? 0} активных сохранено). ` +
parts.join(
", "
) +
".";

if (
data.eventsPolicyMissing
) {
text +=
" История price_alert_events: нет права DELETE — выполните migration-price-alert-events-delete-own.sql в Supabase.";
}

return text;

}

/**
 * @param {{
 *   btnId?: string,
 *   inputId?: string,
 *   statusEl?: HTMLElement | null
 * }} opts
 */
export function bindAlertsGarbagePurge(
opts = {}
){

const btnId =
opts.btnId ||
"system-purge-alert-garbage-btn";
const inputId =
opts.inputId ||
"system-purge-alert-garbage-confirm";

const btn =
document.getElementById(
btnId
);

const input =
document.getElementById(
inputId
);

const statusEl =
opts.statusEl ||
null;

if(
!btn ||
!input
){
return;
}

function syncBtn(){

btn.disabled =
input.value.trim() !==
CONFIRM_PHRASE;

}

input.addEventListener(
"input",
syncBtn
);

syncBtn();

btn.addEventListener(
"click",
async()=>{

if(
btn.disabled
){
return;
}

if(
input.value.trim() !==
CONFIRM_PHRASE
){
if(
statusEl
){
statusEl.textContent =
`Введите в поле: ${CONFIRM_PHRASE}`;
statusEl.style.color =
"#fca5a5";
}
return;
}

const keepActive =
collectKeepActive();

const ok =
window.confirm(
"Удалить мусор алертов в Supabase для вашего аккаунта?\n\n" +
`Останутся ${keepActive.length} активных алертов из localStorage.\n` +
"Будут удалены: зомби price_alerts, сироты в облаке, история price_alert_events."
);

if(
!ok
){
return;
}

btn.disabled =
true;

if(
statusEl
){
statusEl.textContent =
"Очистка…";
statusEl.style.color =
"";
}

try{
const data =
await purgeAlertGarbageFromCloud(
keepActive
);

if (
!data.ok
) {
throw new Error(
data.error === "no_auth"
? "Нужен вход через шестерёнку в шапке."
: (
data.error ||
"Ошибка очистки"
)
);
}

if(
statusEl
){
statusEl.textContent =
formatPurgeResult(
data
);
statusEl.style.color =
data.eventsPolicyMissing
? "#fcd34d"
: "#86efac";
}

input.value =
"";
syncBtn();

}catch(
err
){
console.warn(
"[system] purge alert garbage:",
err
);

if(
statusEl
){
const msg =
String(
err?.message ||
err ||
""
);

statusEl.textContent =
/abort/i.test(
msg
)
? "Таймаут запроса к Supabase — повторите."
: (
msg ||
"Ошибка очистки"
);
statusEl.style.color =
"#fca5a5";
}

}finally{
syncBtn();

}

}
);

}
