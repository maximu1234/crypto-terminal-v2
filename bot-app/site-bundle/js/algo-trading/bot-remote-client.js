/**
 * Multichart ↔ Algo Bot remote control — LAN only.
 * Cloud worker (/bot-remote/*, Supabase Auth) removed.
 */
const LAN_CONN_KEY =
"algo_remote_session_logs_v1";

const LAN_BOT_STRATEGY_IDS =
[
"st1",
"st2",
"st3",
"early-t3",
"rsi-touch-flip"
];

/**
 * @param {unknown} raw
 * @returns {string}
 */
export function normalizeLanBotStrategyId(
raw
){

const id =
String(
raw ||
""
).trim().toLowerCase();

return LAN_BOT_STRATEGY_IDS.includes(
id
)
? id
: "st1";

}


/**
 * @returns {{ host: string, port: string, token: string, strategyId: string }|null}
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
const strategyId =
normalizeLanBotStrategyId(
raw.strategyId
);

if(
!host ||
!token
){
return null;
}

return {
host,
port,
token,
strategyId
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
starting:
!!st.starting,
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
message:
st.message ||
null,
via:
"lan"
};

}

/**
 * @param {"start"|"stop"} action
 * @param {{ host: string, port: string, token: string, strategyId?: string, strategyPrefs?: object }|null} [conn]
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

const strategyId =
normalizeLanBotStrategyId(
c.strategyId
);

const res =
await api.sessionLogRemoteBotCommand(
{
...c,
action:
act,
...(
act ===
"start"
? {
strategyId,
...(
c.strategyPrefs &&
typeof c.strategyPrefs ===
"object"
? {
strategyPrefs:
c.strategyPrefs
}
: {}
),
...(
c.earlyT3Prefs &&
typeof c.earlyT3Prefs ===
"object"
? {
earlyT3Prefs:
c.earlyT3Prefs
}
: {}
),
...(
Array.isArray(
c.book
)
? {
book:
c.book
}
: {}
)
}
: {}
)
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
starting:
!!res.starting,
alreadyRunning:
!!res.alreadyRunning,
cancelling:
!!res.cancelling
};

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
const {
exportAuthSessionTransferString
} =
await import(
"../cloud-sync.js?v=68"
);
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

if(
typeof document !==
"undefined" &&
document.body?.classList?.contains(
"algo-bot-lite-layout"
)
){
return false;
}

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
