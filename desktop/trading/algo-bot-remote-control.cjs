/**
 * Algo Bot remote control — LAN only (session-log HTTP).
 * Cloud worker WebSocket (/bot-remote/ws + Supabase Auth) removed.
 */
const fs =
require(
"fs"
);
const os =
require(
"os"
);
const path =
require(
"path"
);
const crypto =
require(
"crypto"
);
const {
app
} =
require(
"electron"
);
const log =
require(
"electron-log"
);
const {
getAuthSession
} =
require(
"../auth-session.cjs"
);
const algoBot =
require(
"./algo-trading-bot.cjs"
);

const INSTANCE_STORE =
"algo-bot-lock-instance-id.json";

let commandBusy =
false;

function getInstanceId(){

const file =
path.join(
app.getPath(
"userData"
),
INSTANCE_STORE
);

try{
const raw =
fs.readFileSync(
file,
"utf8"
);
const data =
JSON.parse(
raw
);
const id =
String(
data?.id ||
""
).trim();

if(
id
){
return id;
}
}catch{
/* create */
}

const id =
typeof crypto.randomUUID ===
"function"
? crypto.randomUUID()
: `algo-${Date.now()}-${Math.random().toString(16).slice(2)}`;

try{
fs.writeFileSync(
file,
JSON.stringify(
{
id
}
),
"utf8"
);
}catch(
err
){
log.warn(
"algo bot remote instance id:",
err?.message ||
err
);
}

return id;

}

async function acquireCloudLock(){

return {
ok:
true,
skipped:
true
};

}

async function releaseCloudLock(){

return {
ok:
true,
skipped:
true
};

}

/**
 * Local JWT health for LAN status (no Auth refresh from main).
 */
function resolveAuthHealth(){

let raw =
"";

try{
raw =
String(
getAuthSession() ||
""
);
}catch{
raw =
"";
}

if(
!raw.trim()
){
return {
ok:
false,
code:
"missing",
message:
"Нет облачной сессии на боте"
};
}

try{
const data =
JSON.parse(
raw
);
const exp =
Number(
data?.expires_at ||
data?.session?.expires_at ||
0
);
const now =
Math.floor(
Date.now() /
1000
);

if(
exp >
0 &&
exp <=
now
){
return {
ok:
false,
code:
"expired",
message:
"Сессия на боте истекла"
};
}

if(
exp >
0 &&
exp -
now <
120
){
return {
ok:
false,
code:
"near_expiry",
message:
"Сессия на боте скоро истечёт"
};
}

return {
ok:
true
};
}catch{
return {
ok:
false,
code:
"invalid",
message:
"Сессия на боте повреждена"
};
}

}

function buildStatusPayload(){

const st =
algoBot.getBotStatus?.() ||
{};
const authHealth =
resolveAuthHealth();

return {
type:
"status",
running:
!!st.running,
host:
os.hostname(),
app:
app.getName?.() ||
"Multichart Algo Bot",
instanceId:
getInstanceId(),
at:
new Date().toISOString(),
authHealth
};

}

/** No cloud worker socket — no-op. */
function sendStatus(){

}

async function handleCommand(
action,
opts =
{}
){

if(
commandBusy
){
return {
ok:
false,
busy:
true
};
}

commandBusy =
true;

try{

if(
action ===
"start"
){
const lock =
await acquireCloudLock();

if(
!lock.ok
){
log.warn(
"algo bot remote start lock:",
lock.message ||
lock.code
);
return lock;
}

const strategyId =
[
"st1",
"st2",
"st3"
].includes(
String(
opts.strategyId ||
""
).trim().toLowerCase()
)
? String(
opts.strategyId
).trim().toLowerCase()
: "st1";

const result =
await algoBot.startBot(
{
strategyId,
...(
opts.strategyPrefs &&
typeof opts.strategyPrefs ===
"object"
? {
strategyPrefs:
opts.strategyPrefs
}
: {}
)
}
);

return result;
}

if(
action ===
"stop"
){
const st =
algoBot.getBotStatus?.() ||
{};
const strategyId =
st.strategyId ||
"st1";
const result =
await algoBot.stopBot(
{
strategyId
}
);

if(
result?.ok !==
false &&
!result?.running
){
await releaseCloudLock();
}

return result;
}

return {
ok:
false,
error:
"bad_action"
};
}finally{
commandBusy =
false;
}

}

function startRemoteControl(){

log.info(
"algo bot remote: cloud worker remote control disabled (use LAN)"
);

return {
ok:
true,
skipped:
true
};

}

function stopRemoteControl(){

return {
ok:
true,
skipped:
true
};

}

function notifyAuthSessionChanged(){

}

function getRemoteControlStatus(){

return {
started:
false,
connected:
false,
bot:
buildStatusPayload()
};

}

/**
 * LAN / HTTP status (session-log server).
 */
function getLanBotStatus(){

const payload =
buildStatusPayload();

return {
ok:
true,
online:
true,
running:
!!payload.running,
host:
payload.host ||
null,
app:
payload.app ||
null,
instanceId:
payload.instanceId ||
null,
lastSeenAt:
payload.at ||
null,
authHealth:
payload.authHealth ||
null,
via:
"lan"
};

}

module.exports =
{
startRemoteControl,
stopRemoteControl,
notifyAuthSessionChanged,
getRemoteControlStatus,
sendStatus,
handleCommand,
getLanBotStatus,
buildStatusPayload
};
