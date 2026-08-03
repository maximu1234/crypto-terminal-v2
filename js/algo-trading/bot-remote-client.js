/**
 * Multichart → remote Algo Bot start/stop/status.
 * Status UI uses alert-worker (Supabase auth).
 * Log / channel UI uses direct LAN (session-log server) only.
 */
import {
normalizeAlertWorkerBaseUrl
} from "../alert-worker-url.js?v=2";
import {
resolveAlertAuthFast,
readAlertTokenSync,
readPersistedAuthSession
} from "../alert-auth-cache.js?v=7";
import {
exportAuthSessionTransferString
} from "../cloud-sync.js?v=56";

const LAN_CONN_KEY =
"algo_remote_session_logs_v1";

/**
 * @returns {{ host: string, port: string, token: string }|null}
 */
export function readLanRemoteConn(){

try{
const raw =
JSON.parse(
localStorage.getItem(
LAN_CONN_KEY
) ||
"{}"
);
const host =
String(
raw.host ||
""
).trim();
const token =
String(
raw.token ||
""
).trim();
const port =
String(
raw.port ||
"17865"
).trim();

if(
!host ||
!token
){
return null;
}

return {
host,
port,
token
};
}catch{
return null;
}

}

export function hasLanRemoteConn(){

return !!readLanRemoteConn();

}

function desktopAlgoApi(){

return window.cryptoTerminalDesktop?.algoTrading ||
null;

}

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
 * @param {{ host: string, port: string, token: string }|null} [conn]
 */
export async function fetchLanBotStatus(
conn
){

const api =
desktopAlgoApi();
const c =
conn ||
readLanRemoteConn();

if(
!c?.host ||
!c?.token
){
return {
ok:
false,
error:
"no_lan_conn",
message:
"Укажите IP и токен канала",
via:
"lan"
};
}

if(
!api?.sessionLogRemoteBotStatus
){
return {
ok:
false,
error:
"no_lan_ipc",
message:
"Нужен desktop Multichart с LAN remote",
via:
"lan"
};
}

const st =
await api.sessionLogRemoteBotStatus(
c
);

if(
!st?.ok
){
return {
ok:
false,
error:
st?.error ||
"network",
message:
st?.message ||
"LAN: бот недоступен",
via:
"lan"
};
}

return {
ok:
true,
online:
st.online !==
false,
running:
!!st.running,
host:
st.host ||
null,
app:
st.app ||
null,
lastSeenAt:
st.lastSeenAt ||
null,
strategyId:
st.strategyId ||
null,
tradingMode:
st.tradingMode ||
null,
watchlistCount:
st.watchlistCount ??
null,
strategyPrefs:
st.strategyPrefs &&
typeof st.strategyPrefs ===
"object"
? st.strategyPrefs
: null,
via:
"lan"
};

}

/**
 * @param {"start"|"stop"} action
 * @param {{ host: string, port: string, token: string }|null} [conn]
 */
export async function sendLanBotCommand(
action,
conn
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

const api =
desktopAlgoApi();
const c =
conn ||
readLanRemoteConn();

if(
!c?.host ||
!c?.token
){
return {
ok:
false,
error:
"no_lan_conn",
message:
"Укажите IP и токен канала",
via:
"lan"
};
}

if(
!api?.sessionLogRemoteBotCommand
){
return {
ok:
false,
error:
"no_lan_ipc",
message:
"Нужен desktop Multichart с LAN remote",
via:
"lan"
};
}

const res =
await api.sessionLogRemoteBotCommand(
{
...c,
action:
act
}
);

if(
!res?.ok
){
return {
ok:
false,
error:
res?.error ||
"command_failed",
message:
res?.message ||
"LAN: команда не выполнена",
via:
"lan"
};
}

return {
ok:
true,
delivered:
true,
via:
"lan",
running:
!!res.running,
alreadyRunning:
!!res.alreadyRunning
};

}

/**
 * Status dropdown: always alert-worker (Supabase JWT). Never LAN.
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
"Не задан ALERT_WORKER_URL",
via:
"worker"
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
"Нужен вход в аккаунт",
via:
"worker"
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
`HTTP ${res.status}`,
via:
"worker"
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
null,
via:
"worker"
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
),
via:
"worker"
};
}

}

/**
 * Status dropdown: always alert-worker. Never LAN.
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
"Не задан ALERT_WORKER_URL",
via:
"worker"
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
"Нужен вход в аккаунт",
via:
"worker"
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
message,
via:
"worker"
};
}

return {
ok:
true,
delivered:
data.delivered ===
true,
via:
"worker"
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
),
via:
"worker"
};
}

}

/**
 * Push Multichart auth session to Algo Bot over LAN.
 * @param {{ host: string, port: string, token: string }|null} [conn]
 * @returns {Promise<{ ok: boolean, email?: string|null, message?: string }>}
 */
export async function pushAuthSessionToRemoteBot(
conn
){

const lan =
conn ||
readLanRemoteConn();

if(
!lan
){
return {
ok:
false,
message:
"Сначала укажите IP и токен канала (окно LAN)"
};
}

const api =
desktopAlgoApi();

if(
!api?.sessionLogRemoteAuthPush
){
return {
ok:
false,
message:
"Нужен desktop Multichart с LAN auth push"
};
}

let transfer =
"";

try{
transfer =
await exportAuthSessionTransferString();
}catch(
err
){
return {
ok:
false,
message:
err?.message ||
"Не удалось сформировать сессию"
};
}

if(
!transfer
){
return {
ok:
false,
message:
"Нет локальной сессии — войдите в Multichart"
};
}

return api.sessionLogRemoteAuthPush(
{
...lan,
transfer
}
);

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
