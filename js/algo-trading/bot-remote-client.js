/**
 * Multichart → alert-worker HTTP for remote Algo Bot start/stop/status.
 */
import {
normalizeAlertWorkerBaseUrl
} from "../alert-worker-url.js?v=2";
import {
resolveAlertAuthFast,
readAlertTokenSync,
readPersistedAuthSession
} from "../alert-auth-cache.js?v=7";

async function getWorkerBaseUrl(){

const env =
await import(
"../supabase-env.js?v=5"
);
const raw =
env.ALERT_WORKER_URL ||
"";

return normalizeAlertWorkerBaseUrl(
raw
);

}

async function resolveAccessToken(){

const fast =
await resolveAlertAuthFast();

if(
fast?.token
){
return String(
fast.token
);
}

const sync =
readAlertTokenSync();

if(
sync?.token
){
return String(
sync.token
);
}

const persisted =
readPersistedAuthSession();

if(
persisted?.access_token
){
return String(
persisted.access_token
);
}

return "";

}

/**
 * @returns {Promise<{
 *   ok: boolean,
 *   online?: boolean,
 *   running?: boolean,
 *   host?: string|null,
 *   app?: string|null,
 *   lastSeenAt?: string|null,
 *   error?: string,
 *   message?: string
 * }>}
 */
export async function fetchRemoteBotStatus(){

const base =
await getWorkerBaseUrl();
const token =
await resolveAccessToken();

if(
!base
){
return {
ok:
false,
error:
"no_worker_url",
message:
"Не задан ALERT_WORKER_URL"
};
}

if(
!token
){
return {
ok:
false,
error:
"no_auth",
message:
"Нужен вход в аккаунт"
};
}

try{
const res =
await fetch(
`${base}/bot-remote/status`,
{
method:
"GET",
headers: {
Authorization:
`Bearer ${token}`,
Accept:
"application/json"
}
}
);
const data =
await res.json().catch(
()=>
({})
);

if(
!res.ok
){
return {
ok:
false,
error:
data?.error ||
`http_${res.status}`,
message:
data?.error ||
`HTTP ${res.status}`
};
}

return {
ok:
true,
online:
!!data.online,
running:
!!data.running,
host:
data.host ||
null,
app:
data.app ||
null,
lastSeenAt:
data.lastSeenAt ||
null
};
}catch(
err
){
return {
ok:
false,
error:
"network",
message:
err?.message ||
String(
err
)
};
}

}

/**
 * @param {"start"|"stop"} action
 */
export async function sendRemoteBotCommand(
action
){

const act =
String(
action ||
""
).trim().toLowerCase();

if(
act !==
"start" &&
act !==
"stop"
){
return {
ok:
false,
error:
"bad_action"
};
}

const base =
await getWorkerBaseUrl();
const token =
await resolveAccessToken();

if(
!base
){
return {
ok:
false,
error:
"no_worker_url",
message:
"Не задан ALERT_WORKER_URL"
};
}

if(
!token
){
return {
ok:
false,
error:
"no_auth",
message:
"Нужен вход в аккаунт"
};
}

try{
const res =
await fetch(
`${base}/bot-remote/command`,
{
method:
"POST",
headers: {
Authorization:
`Bearer ${token}`,
"Content-Type":
"application/json",
Accept:
"application/json"
},
body:
JSON.stringify(
{
action:
act
}
)
}
);
const data =
await res.json().catch(
()=>
({})
);

if(
!res.ok
){
const err =
data?.error ||
`http_${res.status}`;
const message =
err ===
"bot_offline"
? "Удалённый бот офлайн (запустите Algo Bot на сервере)"
: (
data?.message ||
err
);

return {
ok:
false,
error:
err,
message
};
}

return {
ok:
true,
delivered:
data.delivered ===
true
};
}catch(
err
){
return {
ok:
false,
error:
"network",
message:
err?.message ||
String(
err
)
};
}

}

export function isMultichartRemoteControlHost(){

const desktop =
window.cryptoTerminalDesktop;

if(
/algo-bot/i.test(
String(
desktop?.appId ||
""
)
)
){
return false;
}

if(
/\bbotLite=1\b/i.test(
location.search ||
""
)
){
return false;
}

return true;

}
