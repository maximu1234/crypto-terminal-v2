/**
 * Direct LAN/HTTP access to session status logs (no Supabase / alert-worker).
 * Prefs: userData/algo-bot-session-log-server.json
 * Default port 17865. Auth: Bearer / ?token=
 */
const http =
require(
"http"
);
const crypto =
require(
"crypto"
);
const fs =
require(
"fs"
);
const path =
require(
"path"
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
const sessionLog =
require(
"./algo-bot-session-log.cjs"
);

const PREFS_FILE =
"algo-bot-session-log-server.json";
const DEFAULT_PORT =
17865;
const AUTH_BODY_MAX =
65536;

/** @type {import('http').Server | null} */
let server =
null;

/** @type {{ enabled: boolean, port: number, token: string, bindHost: string }} */
let prefs =
{
enabled:
false,
port:
DEFAULT_PORT,
token:
"",
bindHost:
"0.0.0.0"
};

function prefsPath(){

return path.join(
app.getPath(
"userData"
),
PREFS_FILE
);

}

function normalizePrefs(
raw =
{}
){

const port =
Math.floor(
Number(
raw.port
)
);
const token =
String(
raw.token ||
""
).trim();
const bindHost =
String(
raw.bindHost ||
"0.0.0.0"
).trim() ||
"0.0.0.0";

return {
enabled:
!!raw.enabled,
port:
Number.isFinite(
port
) &&
port >=
1024 &&
port <=
65535
? port
: DEFAULT_PORT,
token,
bindHost:
bindHost ===
"127.0.0.1" ||
bindHost ===
"localhost"
? "127.0.0.1"
: "0.0.0.0"
};

}

function readPrefsFromDisk(){

try{
const raw =
JSON.parse(
fs.readFileSync(
prefsPath(),
"utf8"
)
);

prefs =
normalizePrefs(
raw
);
}catch{
prefs =
normalizePrefs(
{}
);
}

return {
...prefs
};

}

function writePrefsToDisk(
next
){

prefs =
normalizePrefs(
next
);
fs.writeFileSync(
prefsPath(),
JSON.stringify(
prefs,
null,
2
),
"utf8"
);

return {
...prefs
};

}

function ensureToken(
current
){

const token =
String(
current ||
""
).trim();

if(
token.length >=
16
){
return token;
}

return crypto.randomBytes(
18
).toString(
"base64url"
);

}

function corsHeaders(){

return {
"Access-Control-Allow-Origin":
"*",
"Access-Control-Allow-Headers":
"Authorization, Content-Type",
"Access-Control-Allow-Methods":
"GET, POST, OPTIONS"
};

}

function sendJson(
res,
status,
body
){

const text =
JSON.stringify(
body
);

res.writeHead(
status,
{
"Content-Type":
"application/json; charset=utf-8",
"Content-Length":
Buffer.byteLength(
text
),
...corsHeaders()
}
);
res.end(
text
);

}

function sendText(
res,
status,
text,
contentType =
"text/plain; charset=utf-8"
){

const body =
String(
text ??
""
);

res.writeHead(
status,
{
"Content-Type":
contentType,
"Content-Length":
Buffer.byteLength(
body
),
...corsHeaders()
}
);
res.end(
body
);

}

function extractToken(
req,
url
){

const auth =
String(
req.headers.authorization ||
""
);

if(
auth.toLowerCase().startsWith(
"bearer "
)
){
return auth.slice(
7
).trim();
}

return String(
url.searchParams.get(
"token"
) ||
""
).trim();

}

/**
 * @param {import('http').IncomingMessage} req
 * @param {number} [limit]
 * @returns {Promise<object>}
 */
function readJsonBody(
req,
limit =
2_000_000
){

return new Promise(
(
resolve,
reject
)=>{
const chunks =
[];
let size =
0;

req.on(
"data",
(
chunk
)=>{
size +=
chunk.length;

if(
size >
limit
){
reject(
new Error(
"Body too large"
)
);
req.destroy();
return;
}

chunks.push(
chunk
);
}
);

req.on(
"end",
()=>{
try{
const raw =
Buffer.concat(
chunks
).toString(
"utf8"
).trim();

resolve(
raw
? JSON.parse(
raw
)
: {}
);
}catch(
err
){
reject(
err
);
}
}
);

req.on(
"error",
reject
);
}
);

}

function summarizeWatchlistRoot(
root
){

let long =
0;
let short =
0;
let both =
0;
let favorites =
0;

for(
const flags of Object.values(
root &&
typeof root ===
"object"
? root
: {}
)
){

if(
!flags ||
typeof flags !==
"object"
){
continue;
}

long +=
Array.isArray(
flags.algoLong5m
)
? flags.algoLong5m.length
: 0;
short +=
Array.isArray(
flags.algoShort5m
)
? flags.algoShort5m.length
: 0;
both +=
Array.isArray(
flags.algoBoth5m
)
? flags.algoBoth5m.length
: 0;
favorites +=
Array.isArray(
flags.algoFavorites
)
? flags.algoFavorites.length
: 0;

}

return {
long,
short,
both,
favorites
};

}

/**
 * Apply Multichart-pushed algo lists into bot ticker flags.
 * @param {object} body
 */
function applyRemoteWatchlists(
body =
{}
){

const algoBot =
require(
"./algo-trading-bot.cjs"
);

let result;

if(
body.root &&
typeof body.root ===
"object"
){
result =
algoBot.syncTickerFlags(
{
root:
body.root
}
);
}else if(
body.flags &&
typeof body.flags ===
"object"
){
result =
algoBot.syncTickerFlags(
{
exchangeId:
body.exchangeId ||
"bybit",
flags:
body.flags
}
);
}else{
return {
ok:
false,
message:
"Expected JSON body with root or flags"
};
}

if(
result?.ok ===
false
){
return result;
}

const root =
algoBot.getTickerFlagsRoot?.()?.root ||
{};
const counts =
summarizeWatchlistRoot(
root
);

try{
algoBot.notifyTickerFlagsToUi?.(
{
root,
message:
`Списки с Multichart: Long ${counts.long}, Short ${counts.short}, Both ${counts.both}, Избр. ${counts.favorites}`
}
);
}catch{
/* UI notify is best-effort — file/engine already updated */
}

try{
sessionLog.appendNote(
`Remote watchlists applied: long=${counts.long} short=${counts.short} both=${counts.both} favorites=${counts.favorites}`
);
}catch{
/* ignore — session file may be idle */
}

return {
ok:
true,
counts,
message:
`Списки применены: Long ${counts.long}, Short ${counts.short}, Both ${counts.both}, Избр. ${counts.favorites}`
};

}

function isAlgoBotHostApp(){

try{
return /algo\s*bot/i.test(
String(
app.getName?.() ||
""
)
);
}catch{
return false;
}

}

function tryRequireRemoteControl(){

try{
return require(
"./algo-bot-remote-control.cjs"
);
}catch{
return null;
}

}

function buildFallbackLanStatus(){

const algoBot =
require(
"./algo-trading-bot.cjs"
);
const st =
algoBot.getBotStatus?.() ||
{};

return {
ok:
true,
online:
true,
running:
!!st.running,
host:
require(
"os"
).hostname(),
app:
app.getName?.() ||
"Multichart",
instanceId:
null,
lastSeenAt:
new Date().toISOString(),
via:
"lan"
};

}

async function handleLanBotCommand(
action,
opts =
{}
){

const remote =
tryRequireRemoteControl();

if(
remote?.handleCommand
){
return remote.handleCommand(
action,
opts
);
}

const algoBot =
require(
"./algo-trading-bot.cjs"
);
const act =
String(
action ||
""
).trim().toLowerCase();
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

if(
act ===
"start"
){
return algoBot.startBot(
{
strategyId
}
);
}

if(
act ===
"stop"
){
const st =
algoBot.getBotStatus?.() ||
{};

return algoBot.stopBot(
{
strategyId:
st.strategyId ||
"st1"
}
);
}

return {
ok:
false,
error:
"bad_action",
message:
"action must be start or stop"
};

}

function getLanBotStatusPayload(){

const remote =
tryRequireRemoteControl();
const base =
remote?.getLanBotStatus
? remote.getLanBotStatus()
: buildFallbackLanStatus();

try{
const algoBot =
require(
"./algo-trading-bot.cjs"
);
const st =
algoBot.getBotStatus?.() ||
{};
const prefs =
st.strategyPrefs &&
typeof st.strategyPrefs ===
"object"
? st.strategyPrefs
: null;

return {
...base,
running:
base.running ===
true ||
!!st.running,
strategyId:
st.strategyId ||
null,
tradingMode:
st.tradingMode ||
null,
watchlistCount:
Number.isFinite(
Number(
st.watchlistCount
)
)
? Number(
st.watchlistCount
)
: null,
strategyPrefs:
prefs
};
}catch{
return base;
}

}

/**
 * Apply Multichart auth transfer string on Algo Bot only.
 * @param {object} body
 */
async function applyRemoteAuthSession(
body =
{}
){

if(
!isAlgoBotHostApp()
){
return {
ok:
false,
message:
"Приём сессии только на Algo Bot"
};
}

const transfer =
String(
body.transfer ||
body.session ||
""
).trim();

if(
!transfer
){
return {
ok:
false,
message:
"Нужен transfer (mcauth1…)"
};
}

let decoded;

try{
decoded =
require(
"./algo-bot-auth-transfer.cjs"
).decodeAuthSessionTransfer(
transfer
);
}catch(
err
){
return {
ok:
false,
message:
err?.message ||
"Некорректная сессия"
};
}

const exp =
Number(
decoded?.session?.expires_at
) ||
0;

if(
exp >
0 &&
exp *
1000 <
Date.now() -
5000
){
return {
ok:
false,
message:
"Сессия Multichart уже истекла. Войдите снова в Multichart (чтобы обновился access_token), затем снова «Отдать сессию»."
};
}

try{
const {
saveAuthSession
} =
require(
"../auth-session.cjs"
);

saveAuthSession(
decoded.raw
);
}catch(
err
){
return {
ok:
false,
message:
err?.message ||
"Не удалось сохранить сессию"
};
}

try{
const remote =
tryRequireRemoteControl();

remote?.notifyAuthSessionChanged?.();
}catch{
/* ignore */
}

let uiResult =
null;
const {
BrowserWindow
} =
require(
"electron"
);
const win =
BrowserWindow.getAllWindows().find(
(
w
)=>
w &&
!w.isDestroyed()
) ||
null;

if(
win?.webContents
){
try{
uiResult =
await win.webContents.executeJavaScript(
`((transfer) => {
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
return (async () => {
for (let i = 0; i < 40; i++) {
const fn = window.__importAuthSessionTransferString;
if (typeof fn === "function") {
return Promise.resolve(fn(transfer));
}
await sleep(250);
}
return {
ok: false,
message: "UI ещё не готов — перезапустите окно бота"
};
})();
})(${JSON.stringify(
transfer
)})`,
true
);
}catch(
err
){
uiResult =
{
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

/*
  File already has the session. If UI import failed / timed out, force
  localStorage heal from userData so the red banner clears.
*/
if(
(
!uiResult ||
uiResult.ok ===
false
) &&
win?.webContents
){
try{
const healed =
await win.webContents.executeJavaScript(
`(async () => {
const fn = window.__reloadAuthFromDesktopFile;
if (typeof fn !== "function") {
return { ok: false, message: "reload helper missing" };
}
return Promise.resolve(fn());
})()`,
true
);

if(
healed?.ok
){
uiResult =
{
ok:
true,
message:
healed.message ||
"Сессия подтянута из файла"
};
}
}catch{
/* ignore heal errors */
}
}

const email =
String(
decoded.session?.user?.email ||
uiResult?.email ||
""
).trim();

if(
uiResult &&
uiResult.ok ===
false &&
uiResult.message
){
return {
ok:
true,
email:
email ||
undefined,
message:
`Сессия сохранена в файл; UI: ${uiResult.message}`
};
}

return {
ok:
true,
email:
email ||
undefined,
message:
email
? `Сессия применена (${email})`
: "Сессия применена"
};

}

function handleRequest(
req,
res
){

void (
async ()=>{

try{
if(
req.method ===
"OPTIONS"
){
res.writeHead(
204,
corsHeaders()
);
res.end();
return;
}

const url =
new URL(
req.url ||
"/",
"http://127.0.0.1"
);
const token =
extractToken(
req,
url
);

if(
!prefs.token ||
token !==
prefs.token
){
sendJson(
res,
401,
{
ok:
false,
message:
"Unauthorized"
}
);
return;
}

const pathname =
url.pathname.replace(
/\/+$/,
""
) ||
"/";

if(
req.method ===
"POST" &&
pathname ===
"/watchlists"
){
let body;

try{
body =
await readJsonBody(
req
);
}catch(
err
){
sendJson(
res,
400,
{
ok:
false,
message:
err?.message ||
"Invalid JSON body"
}
);
return;
}

const applied =
applyRemoteWatchlists(
body
);

sendJson(
res,
applied.ok
? 200
: 400,
applied
);
return;
}

if(
req.method ===
"POST" &&
pathname ===
"/bot/command"
){
let body;

try{
body =
await readJsonBody(
req,
65536
);
}catch(
err
){
sendJson(
res,
400,
{
ok:
false,
message:
err?.message ||
"Invalid JSON body"
}
);
return;
}

const action =
String(
body.action ||
""
).trim().toLowerCase();

if(
action !==
"start" &&
action !==
"stop"
){
sendJson(
res,
400,
{
ok:
false,
error:
"bad_action",
message:
"action must be start or stop"
}
);
return;
}

const strategyId =
[
"st1",
"st2",
"st3"
].includes(
String(
body.strategyId ||
""
).trim().toLowerCase()
)
? String(
body.strategyId
).trim().toLowerCase()
: "st1";

const result =
await handleLanBotCommand(
action,
{
strategyId
}
);
const ok =
!!(
result?.ok ||
result?.running ||
result?.alreadyRunning ||
(
action ===
"stop" &&
result?.ok !==
false &&
!result?.running
)
);

sendJson(
res,
ok
? 200
: (
result?.code ===
"locked_elsewhere"
? 409
: 400
),
{
ok,
delivered:
true,
via:
"lan",
...(
result &&
typeof result ===
"object"
? result
: {}
)
}
);
return;
}

if(
req.method ===
"POST" &&
pathname ===
"/auth/session"
){
let body;

try{
body =
await readJsonBody(
req,
AUTH_BODY_MAX
);
}catch(
err
){
sendJson(
res,
400,
{
ok:
false,
message:
err?.message ||
"Invalid JSON body"
}
);
return;
}

const applied =
await applyRemoteAuthSession(
body
);

sendJson(
res,
applied.ok
? 200
: 400,
applied
);
return;
}

if(
req.method !==
"GET"
){
sendJson(
res,
405,
{
ok:
false,
message:
"GET /health|/sessions|/bot/status or POST /watchlists|/bot/command|/auth/session"
}
);
return;
}

if(
pathname ===
"/health"
){
const st =
getLanBotStatusPayload();

sendJson(
res,
200,
{
ok:
true,
service:
"algo-bot-session-logs",
dir:
sessionLog.getSessionsDir(),
running:
!!st.running,
host:
st.host ||
null
}
);
return;
}

if(
pathname ===
"/bot/status"
){
sendJson(
res,
200,
getLanBotStatusPayload()
);
return;
}

if(
pathname ===
"/sessions"
){
const listed =
sessionLog.listSessionFiles();

if(
!listed.ok
){
sendJson(
res,
500,
listed
);
return;
}

sendJson(
res,
200,
{
ok:
true,
files:
listed.files ||
[]
}
);
return;
}

const fileMatch =
pathname.match(
/^\/sessions\/([^/]+)$/
);

if(
fileMatch
){
const name =
decodeURIComponent(
fileMatch[1]
);
const file =
sessionLog.readSessionFile(
name
);

if(
!file.ok
){
sendJson(
res,
404,
file
);
return;
}

sendText(
res,
200,
file.text ||
"",
"text/plain; charset=utf-8"
);
return;
}

sendJson(
res,
404,
{
ok:
false,
message:
"Not found"
}
);
}catch(
err
){
sendJson(
res,
500,
{
ok:
false,
message:
String(
err?.message ||
err
)
}
);
}

}
)();

}

function getPublicStatus(){

return {
ok:
true,
enabled:
!!prefs.enabled,
listening:
!!(
server &&
server.listening
),
port:
prefs.port,
bindHost:
prefs.bindHost,
tokenSet:
String(
prefs.token ||
""
).length >=
16,
/* token returned only to local settings UI via getPrefs */
dir:
sessionLog.getSessionsDir()
};

}

function getPrefsForUi(){

readPrefsFromDisk();

return {
ok:
true,
...getPublicStatus(),
token:
prefs.token ||
"",
hint:
`Откройте порт ${prefs.port} на VPS (firewall). В Терминале: IP сервера + порт + токен.`
};

}

function stopServer(){

if(
!server
){
return {
ok:
true,
stopped:
true
};
}

try{
server.close();
}catch{
/* ignore */
}

server =
null;

return {
ok:
true,
stopped:
true
};

}

function startServer(){

stopServer();

if(
!prefs.enabled
){
return {
ok:
true,
enabled:
false,
listening:
false
};
}

prefs.token =
ensureToken(
prefs.token
);
writePrefsToDisk(
prefs
);

const host =
prefs.bindHost;
const port =
prefs.port;

return new Promise(
(
resolve
)=>{
const next =
http.createServer(
handleRequest
);

next.once(
"error",
(
err
)=>{
server =
null;
log.warn(
"session-log-server:",
err?.message ||
err
);
resolve(
{
ok:
false,
message:
String(
err?.message ||
err
)
}
);
}
);

next.listen(
port,
host,
()=>{
server =
next;
log.info(
`session-log-server listening ${host}:${port}`
);
resolve(
{
ok:
true,
...getPublicStatus()
}
);
}
);
}
);

}

async function applyPrefs(
patch =
{}
){

const cur =
readPrefsFromDisk();
const merged =
normalizePrefs(
{
...cur,
...patch,
token:
patch.token !=
null
? patch.token
: cur.token
}
);

if(
merged.enabled
){
merged.token =
ensureToken(
merged.token
);
}

writePrefsToDisk(
merged
);

if(
merged.enabled
){
return startServer();
}

stopServer();

return getPublicStatus();

}

function bootFromPrefs(){

readPrefsFromDisk();

if(
!prefs.enabled
){
return getPublicStatus();
}

return startServer();

}

module.exports =
{
DEFAULT_PORT,
bootFromPrefs,
applyPrefs,
getPrefsForUi,
getPublicStatus,
stopServer,
startServer,
readPrefsFromDisk
};
