/**
 * Multichart ↔ Algo Bot remote control — LAN only.
 * Cloud worker (/bot-remote/*, Supabase Auth) removed.
 */
const LAN_CONN_KEY =
"algo_remote_session_logs_v1";


/**
 * @returns {{ host: string, port: string, token: string, strategyId: "st1"|"st2"|"st3" }|null}
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
const strategyRaw =
String(
raw.strategyId ||
""
).trim().toLowerCase();
const strategyId =
[
"st1",
"st2",
"st3"
].includes(
strategyRaw
)
? /** @type {"st1"|"st2"|"st3"} */ (
strategyRaw
)
: "st1";

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
[
"st1",
"st2",
"st3"
].includes(
String(
c.strategyId ||
""
).trim().toLowerCase()
)
? String(
c.strategyId
).trim().toLowerCase()
: "st1";

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
alreadyRunning:
!!res.alreadyRunning
};

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
