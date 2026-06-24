/**
 * Экономия лимитов Supabase (Free): localStorage, страница /system.
 * @see system/index.html
 */

export const SUPABASE_USAGE_PREFS_KEY =
"multichart_supabase_usage_prefs_v1";

export const SUPABASE_USAGE_PREF_KEYS =
Object.freeze([
"disableRealtime",
"disableDrawingsCloud",
"disableFavoritesCloud",
"disableAlertsCloud",
"disableAutoDevicePull",
"slowBackgroundSync"
]);

const DEFAULTS =
Object.freeze({
disableRealtime: false,
disableDrawingsCloud: false,
disableFavoritesCloud: false,
disableAlertsCloud: false,
disableAutoDevicePull: false,
slowBackgroundSync: false
});

function readRaw(){

try{
const raw =
localStorage.getItem(
SUPABASE_USAGE_PREFS_KEY
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

export function getSupabaseUsagePrefs(){

const raw =
readRaw();
const out =
{ ...DEFAULTS };

for(
const key of
SUPABASE_USAGE_PREF_KEYS
){
if(
typeof raw[
key
] ===
"boolean"
){
out[
key
] =
raw[
key
];
}

}

return out;

}

export function setSupabaseUsagePref(
key,
value
){

if(
!SUPABASE_USAGE_PREF_KEYS.includes(
key
)
){
return getSupabaseUsagePrefs();
}

const next = {
...getSupabaseUsagePrefs(),
[ key ]: !!value
};

try{
localStorage.setItem(
SUPABASE_USAGE_PREFS_KEY,
JSON.stringify(
next
)
);
}catch{
/* ignore */
}

window.dispatchEvent(
new CustomEvent(
"supabase-usage-prefs-changed",
{
detail: { prefs: next }
}
)
);

if(
key ===
"disableAlertsCloud"
){
void syncAlertsCloudPauseToServer(
!!value
);
}

return next;

}

/**
 * Синхронизирует флаг «облачные алерты выкл» в user_settings — worker не шлёт Telegram.
 */
export async function syncAlertsCloudPauseToServer(
disabled
){

try{
const {
ensureCloudLoginResolved
} =
await import("./cloud-sync.js?v=39");

const ctx =
await ensureCloudLoginResolved(
8000
).catch(
()=>null
);

const userId =
ctx?.user?.id;

if(
!userId
){
return;
}

const {
getSupabase
} =
await import("./supabase-client.js?v=7");

const sb =
await getSupabase();

if(
!sb
){
return;
}

const {
error
} =
await sb.from(
"user_settings"
).upsert(
{
user_id:
userId,
alerts_cloud_disabled:
!!disabled,
updated_at:
new Date().toISOString()
},
{
onConflict:
"user_id"
}
);

if(
error
){
console.warn(
"[prefs] alerts_cloud_disabled sync:",
error.message
);
}

}catch(
err
){
console.warn(
"[prefs] alerts cloud pause:",
err?.message || err
);
}

}

export function isSupabaseRealtimeDisabled(){

return getSupabaseUsagePrefs().disableRealtime;

}

export function isDrawingsCloudDisabled(){

return getSupabaseUsagePrefs().disableDrawingsCloud;

}

export function isFavoritesCloudDisabled(){

return getSupabaseUsagePrefs().disableFavoritesCloud;

}

export function isAlertsCloudDisabled(){

return getSupabaseUsagePrefs().disableAlertsCloud;

}

export function isAutoDevicePullDisabled(){

return getSupabaseUsagePrefs().disableAutoDevicePull;

}

export function isSlowBackgroundSync(){

return getSupabaseUsagePrefs().slowBackgroundSync;

}

/** Умножает интервалы фонового опроса (Realtime off / экономия egress). */
export function scaleSupabasePollMs(
baseMs
){

const n =
Number(
baseMs
);

if(
!Number.isFinite(
n
) ||
n <
0
){
return baseMs;
}

return isSlowBackgroundSync()
? Math.round(
n *
2
)
: n;

}
