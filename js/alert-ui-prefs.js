/**
 * UI-настройки алертов (длительность toast / системных уведомлений, канал).
 */
export const ALERT_UI_PREFS_KEY =
"multichart_alert_ui_prefs_v1";

export const ALERT_TOAST_MIN_SEC =
3;

export const ALERT_TOAST_MAX_SEC =
10;

export const ALERT_TOAST_DEFAULT_SEC =
5;

export const ALERT_TOAST_DURATION_OPTIONS_SEC =
[
3,
4,
5,
6,
7,
8,
9,
10
];

export const ALERT_NOTIFY_MODES =
[
"internal",
"system"
];

export const ALERT_NOTIFY_MODE_LABELS =
{
internal:
"Только внутренние",
system:
"Только системные (macOS)"
};

export const ALERT_NOTIFY_MODE_DEFAULT =
"internal";

function readRaw(){

try{
const raw =
localStorage.getItem(
ALERT_UI_PREFS_KEY
);

if(
!raw
){
return {};
}

const parsed =
JSON.parse(
raw
);

return parsed &&
typeof parsed ===
"object"
? parsed
: {};

}catch{
return {};
}

}

function writeRaw(
patch
){

try{
const next =
{
...readRaw(),
...patch
};
localStorage.setItem(
ALERT_UI_PREFS_KEY,
JSON.stringify(
next
)
);
}catch{
/* ignore */
}

}

export function clampAlertToastDurationSec(
seconds
){

const n =
Number(
seconds
);

if(
!Number.isFinite(
n
)
){
return ALERT_TOAST_DEFAULT_SEC;
}

return Math.min(
ALERT_TOAST_MAX_SEC,
Math.max(
ALERT_TOAST_MIN_SEC,
Math.round(
n
)
)
);

}

export function getAlertToastDurationSec(){

return clampAlertToastDurationSec(
readRaw().toastDurationSec ??
ALERT_TOAST_DEFAULT_SEC
);

}

export function getAlertToastDurationMs(){

return getAlertToastDurationSec() *
1000;

}

export function setAlertToastDurationSec(
seconds
){

writeRaw({
toastDurationSec:
clampAlertToastDurationSec(
seconds
)
});

}

export function normalizeAlertNotifyMode(
value
){

const mode =
String(
value ||
""
).trim().toLowerCase();

return ALERT_NOTIFY_MODES.includes(
mode
)
? mode
: ALERT_NOTIFY_MODE_DEFAULT;

}

export function getAlertNotifyMode(){

return normalizeAlertNotifyMode(
readRaw().notifyMode
);

}

export function setAlertNotifyMode(
mode
){

writeRaw({
notifyMode:
normalizeAlertNotifyMode(
mode
)
});

}
