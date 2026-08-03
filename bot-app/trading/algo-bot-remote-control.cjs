/**
 * Outbound remote control: Algo Bot → alert-worker WebSocket.
 * Receives start/stop from Multichart via worker; reports online/running.
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
const WebSocket =
require(
"ws"
);
const {
getAuthSession
} =
require(
"../auth-session.cjs"
);
const {
resolveBundleRoot
} =
require(
"../site-protocol.cjs"
);
const algoBot =
require(
"./algo-trading-bot.cjs"
);

const INSTANCE_STORE =
"algo-bot-lock-instance-id.json";
const STATUS_MS =
12000;
const RECONNECT_MIN_MS =
2000;
const RECONNECT_MAX_MS =
60000;

let socket =
null;
let reconnectTimer =
null;
let statusTimer =
null;
let reconnectDelayMs =
RECONNECT_MIN_MS;
let started =
false;
let commandBusy =
false;

function readJsonExport(
filePath,
name
){

try{
const text =
fs.readFileSync(
filePath,
"utf8"
);
const re =
new RegExp(
`export\\s+const\\s+${name}\\s*=\\s*["']([^"']*)["']`
);
const m =
text.match(
re
);

return m
? String(
m[1] ||
""
).trim()
: "";
}catch{
return "";
}

}

function loadBundledEnv(){

const root =
resolveBundleRoot();
const envPath =
path.join(
root,
"js",
"supabase-env.js"
);

return {
supabaseUrl:
readJsonExport(
envPath,
"SUPABASE_URL"
) ||
String(
process.env.SUPABASE_URL ||
""
).trim(),
supabaseAnonKey:
readJsonExport(
envPath,
"SUPABASE_ANON_KEY"
) ||
String(
process.env.SUPABASE_ANON_KEY ||
""
).trim(),
alertWorkerUrl:
readJsonExport(
envPath,
"ALERT_WORKER_URL"
) ||
String(
process.env.ALERT_WORKER_URL ||
""
).trim()
};

}

function normalizeWorkerOrigin(
raw
){

let s =
String(
raw ||
""
).trim().replace(
/\/+$/,
""
);

if(
!s
){
return "";
}

if(
!/^https?:\/\//i.test(
s
)
){
s =
`https://${s.replace(/^\/+/, "")}`;
}

try{
const u =
new URL(
s
);

if(
u.protocol ===
"http:" &&
u.hostname !==
"localhost" &&
u.hostname !==
"127.0.0.1"
){
u.protocol =
"https:";
}

return u.origin;
}catch{
return "";
}

}

function workerWsUrl(
origin,
token
){

const base =
normalizeWorkerOrigin(
origin
);

if(
!base ||
!token
){
return "";
}

const u =
new URL(
"/bot-remote/ws",
base
);

u.protocol =
u.protocol ===
"http:"
? "ws:"
: "wss:";
u.searchParams.set(
"access_token",
token
);

return u.toString();

}

function parseAccessToken(
raw
){

const text =
String(
raw ||
""
).trim();

if(
!text
){
return "";
}

try{
const data =
JSON.parse(
text
);
const token =
data?.access_token ||
data?.session?.access_token ||
"";

return String(
token ||
""
).trim();
}catch{
return "";
}

}

function getCloudSessionContext(){

try{
const data =
JSON.parse(
String(
getAuthSession() ||
""
)
);
const userId =
String(
data?.user?.id ||
data?.session?.user?.id ||
""
).trim();
const accessToken =
String(
data?.access_token ||
data?.session?.access_token ||
""
).trim();

return {
userId,
accessToken
};
}catch{
return {
userId:
"",
accessToken:
""
};
}

}

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

const cloud =
getCloudSessionContext();
const lockKey =
cloud.userId
? `user:${cloud.userId}`
: "";

if(
!lockKey
){
/* Нет сессии — локальный старт без облачной блокировки */
return {
ok:
true,
skipped:
true
};
}

if(
!cloud.accessToken
){
return {
ok:
false,
code:
"no_access_token",
message:
"Нет access token для облачной блокировки"
};
}

const instanceId =
getInstanceId();
const appName =
app.getName?.() ||
"Multichart Algo Bot";
const now =
new Date().toISOString();
const env =
loadBundledEnv();

if(
!env.supabaseUrl ||
!env.supabaseAnonKey
){
return {
ok:
true,
skipped:
true
};
}

/* Read current lock */
const selectUrl =
`${env.supabaseUrl.replace(/\/$/, "")}/rest/v1/algo_bot_lock?select=locked,instance_id,app_name&lock_key=eq.${encodeURIComponent(lockKey)}`;

try{
const res =
await fetch(
selectUrl,
{
headers: {
apikey:
env.supabaseAnonKey,
Authorization:
`Bearer ${cloud.accessToken}`
}
}
);
const rows =
res.ok
? await res.json()
: [];
const row =
Array.isArray(
rows
)
? rows[0]
: null;

if(
row?.locked &&
String(
row.instance_id ||
""
) !==
instanceId
){
const where =
row.app_name
? ` (${row.app_name})`
: "";

return {
ok:
false,
code:
"locked_elsewhere",
message:
`Бот уже работает в другом приложении${where}`
};
}
}catch(
err
){
return {
ok:
false,
code:
"query_error",
message:
err?.message ||
String(
err
)
};
}

const url =
`${env.supabaseUrl.replace(/\/$/, "")}/rest/v1/algo_bot_lock?on_conflict=lock_key`;

try{
const res =
await fetch(
url,
{
method:
"POST",
headers: {
apikey:
env.supabaseAnonKey,
Authorization:
`Bearer ${cloud.accessToken}`,
"Content-Type":
"application/json",
Prefer:
"resolution=merge-duplicates,return=minimal"
},
body:
JSON.stringify(
{
lock_key:
lockKey,
locked:
true,
instance_id:
instanceId,
app_name:
appName,
locked_at:
now
}
)
}
);

if(
!res.ok
){
const text =
await res.text().catch(
()=>
""
);

return {
ok:
false,
code:
"upsert_error",
message:
text ||
`HTTP ${res.status}`
};
}
}catch(
err
){
return {
ok:
false,
code:
"upsert_error",
message:
err?.message ||
String(
err
)
};
}

return {
ok:
true
};

}

async function releaseCloudLock(){

const cloud =
getCloudSessionContext();
const lockKey =
cloud.userId
? `user:${cloud.userId}`
: "";

if(
!lockKey
){
return {
ok:
true,
skipped:
true
};
}

if(
!cloud.accessToken
){
return {
ok:
false,
code:
"no_access_token",
message:
"Нет access token для облачной блокировки"
};
}

const instanceId =
getInstanceId();
const env =
loadBundledEnv();

if(
!env.supabaseUrl ||
!env.supabaseAnonKey
){
return {
ok:
true,
skipped:
true
};
}

try{
const selectUrl =
`${env.supabaseUrl.replace(/\/$/, "")}/rest/v1/algo_bot_lock?select=locked,instance_id&lock_key=eq.${encodeURIComponent(lockKey)}`;
const res =
await fetch(
selectUrl,
{
headers: {
apikey:
env.supabaseAnonKey,
Authorization:
`Bearer ${cloud.accessToken}`
}
}
);
const rows =
res.ok
? await res.json()
: [];
const row =
Array.isArray(
rows
)
? rows[0]
: null;

if(
!row?.locked
){
return {
ok:
true
};
}

if(
String(
row.instance_id ||
""
) !==
instanceId
){
return {
ok:
true,
skipped:
true
};
}

const patchUrl =
`${env.supabaseUrl.replace(/\/$/, "")}/rest/v1/algo_bot_lock?lock_key=eq.${encodeURIComponent(lockKey)}&instance_id=eq.${encodeURIComponent(instanceId)}`;
const patchRes =
await fetch(
patchUrl,
{
method:
"PATCH",
headers: {
apikey:
env.supabaseAnonKey,
Authorization:
`Bearer ${cloud.accessToken}`,
"Content-Type":
"application/json",
Prefer:
"return=minimal"
},
body:
JSON.stringify(
{
locked:
false,
instance_id:
null,
app_name:
null,
locked_at:
null
}
)
}
);

if(
!patchRes.ok
){
const text =
await patchRes.text().catch(
()=>
""
);

return {
ok:
false,
message:
text ||
`HTTP ${patchRes.status}`
};
}

return {
ok:
true
};
}catch(
err
){
return {
ok:
false,
message:
err?.message ||
String(
err
)
};
}

}

/**
 * Cloud JWT on disk (no Auth refresh from main). Surfaces expiry so Multichart
 * can show a banner without watching the bot DevTools.
 */
function resolveAuthHealth(){

let raw =
"";

try{
raw =
String(
getAuthSession() ||
""
).trim();
}catch{
raw =
"";
}

if(
!raw
){
return {
ok:
false,
code:
"missing",
message:
"Нет облачной сессии на боте — «Отдать сессию» с Multichart"
};
}

try{

const data =
JSON.parse(
raw
);
const session =
data?.access_token
? data
: (
data?.currentSession ||
data?.session ||
null
);

if(
!session?.access_token
){
return {
ok:
false,
code:
"invalid",
message:
"Сессия на боте повреждена — «Отдать сессию» с Multichart"
};
}

const exp =
Number(
session.expires_at
) ||
0;
const now =
Date.now();

if(
exp >
0 &&
exp *
1000 <
now -
5000
){
return {
ok:
false,
code:
"expired",
message:
"Сессия на боте истекла — «Отдать сессию» с Multichart (Auth сам не обновляется)"
};
}

if(
exp >
0 &&
exp *
1000 <
now +
15 *
60 *
1000
){
return {
ok:
true,
code:
"expiring",
message:
"Сессия на боте скоро истечёт — обновите через «Отдать сессию»"
};
}

return {
ok:
true,
code:
"ok",
message:
""
};

}catch{
return {
ok:
false,
code:
"invalid",
message:
"Сессия на боте повреждена — «Отдать сессию» с Multichart"
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

function sendStatus(){

if(
!socket ||
socket.readyState !==
WebSocket.OPEN
){
return;
}

try{
socket.send(
JSON.stringify(
buildStatusPayload()
)
);
}catch(
err
){
log.warn(
"algo bot remote status:",
err?.message ||
err
);
}

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
sendStatus();
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
strategyId
}
);

if(
!(
result?.ok ||
result?.running ||
result?.alreadyRunning
)
){
await releaseCloudLock();
}

sendStatus();
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

sendStatus();
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

function clearReconnectTimer(){

if(
reconnectTimer
){
clearTimeout(
reconnectTimer
);
reconnectTimer =
null;
}

}

function scheduleReconnect(){

if(
!started
){
return;
}

clearReconnectTimer();
reconnectTimer =
setTimeout(
()=>{
reconnectTimer =
null;
connect();
},
reconnectDelayMs
);
reconnectDelayMs =
Math.min(
RECONNECT_MAX_MS,
Math.floor(
reconnectDelayMs *
1.6
)
);

}

function disconnectSocket(){

if(
!socket
){
return;
}

const s =
socket;
socket =
null;

try{
/*
  Closing while CONNECTING throws
  "WebSocket was closed before the connection was established"
  if error listeners were removed — swallow via noop + terminate.
*/
s.on(
"error",
()=>{
/* ignore */
}
);
s.removeAllListeners(
"open"
);
s.removeAllListeners(
"message"
);
s.removeAllListeners(
"close"
);

if(
s.readyState ===
WebSocket.CONNECTING ||
s.readyState ===
WebSocket.CLOSING ||
s.readyState ===
WebSocket.CLOSED
){
s.terminate();
}else{
s.close();
}
}catch{
try{
s.terminate();
}catch{
/* ignore */
}
}

}

function connect(){

if(
!started
){
return;
}

clearReconnectTimer();

const env =
loadBundledEnv();
const token =
parseAccessToken(
getAuthSession()
);
const url =
workerWsUrl(
env.alertWorkerUrl,
token
);

if(
!url
){
log.info(
"algo bot remote: skip connect (no session or ALERT_WORKER_URL)"
);
scheduleReconnect();
return;
}

disconnectSocket();

let ws;

try{
ws =
new WebSocket(
url,
{
headers: {
Authorization:
`Bearer ${token}`
}
}
);
}catch(
err
){
log.warn(
"algo bot remote connect:",
err?.message ||
err
);
scheduleReconnect();
return;
}

socket =
ws;

ws.on(
"open",
()=>{
reconnectDelayMs =
RECONNECT_MIN_MS;
log.info(
"algo bot remote: connected to worker"
);
sendStatus();
}
);

ws.on(
"message",
(
raw
)=>{

let msg;

try{
msg =
JSON.parse(
String(
raw ||
""
)
);
}catch{
return;
}

if(
msg?.type ===
"command"
){
const action =
String(
msg.action ||
""
).trim().toLowerCase();

if(
action ===
"start" ||
action ===
"stop"
){
void handleCommand(
action,
{
strategyId:
msg.strategyId
}
).catch(
err=>{
log.warn(
"algo bot remote command:",
err?.message ||
err
);
}
);
}
}

}
);

ws.on(
"close",
()=>{
if(
socket ===
ws
){
socket =
null;
}
scheduleReconnect();
}
);

ws.on(
"error",
(
err
)=>{
log.warn(
"algo bot remote ws:",
err?.message ||
err
);
}
);

}

function startStatusLoop(){

if(
statusTimer
){
return;
}

statusTimer =
setInterval(
()=>{
sendStatus();
},
STATUS_MS
);

if(
typeof statusTimer.unref ===
"function"
){
statusTimer.unref();
}

}

function stopStatusLoop(){

if(
statusTimer
){
clearInterval(
statusTimer
);
statusTimer =
null;
}

}

function startRemoteControl(){

if(
started
){
connect();
return {
ok:
true,
already:
true
};
}

started =
true;
reconnectDelayMs =
RECONNECT_MIN_MS;
startStatusLoop();
connect();

return {
ok:
true
};

}

function stopRemoteControl(){

started =
false;
clearReconnectTimer();
stopStatusLoop();
disconnectSocket();

return {
ok:
true
};

}

function notifyAuthSessionChanged(){

if(
!started
){
return;
}

reconnectDelayMs =
RECONNECT_MIN_MS;
clearReconnectTimer();
connect();

}

function getRemoteControlStatus(){

return {
started,
connected:
!!(
socket &&
socket.readyState ===
WebSocket.OPEN
),
bot:
buildStatusPayload()
};

}

/**
 * LAN / HTTP status (session-log server). Same fields Multichart expects.
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
