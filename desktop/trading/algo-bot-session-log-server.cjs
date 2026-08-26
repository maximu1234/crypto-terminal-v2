/**
 * Direct LAN/HTTP access to session status logs (no Supabase / alert-worker).
 * Prefs: userData/algo-bot-session-log-server.json
 * Default port 17865. Auth: Bearer token (header only).
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
const LAN_BOT_STRATEGY_IDS =
[
"st1",
"st2",
"st3",
"early-t3",
"rsi-touch-flip"
];

function normalizeLanBotStrategyId(
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
"127.0.0.1"
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
"127.0.0.1"
).trim() ||
"127.0.0.1";

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

/** @type {string} */
let requestOrigin =
"";

function corsHeaders(){

const origin =
String(
requestOrigin ||
""
).trim();
const loopback =
prefs.bindHost ===
"127.0.0.1" ||
prefs.bindHost ===
"localhost";

if(
loopback
){
if(
origin &&
/^https?:\/\/(127\.0\.0\.1|localhost|\[::1\])(:\d+)?$/i.test(
origin
)
){
return {
"Access-Control-Allow-Origin":
origin,
"Access-Control-Allow-Headers":
"Authorization, Content-Type",
"Access-Control-Allow-Methods":
"GET, POST, OPTIONS",
Vary:
"Origin"
};
}

return {
"Access-Control-Allow-Headers":
"Authorization, Content-Type",
"Access-Control-Allow-Methods":
"GET, POST, OPTIONS"
};
}

if(
origin
){
return {
"Access-Control-Allow-Origin":
origin,
"Access-Control-Allow-Headers":
"Authorization, Content-Type",
"Access-Control-Allow-Methods":
"GET, POST, OPTIONS",
Vary:
"Origin"
};
}

return {
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

return "";

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

async function applyRemoteTickerBook(
body
){

const {
parseRsiTouchFlipBookPayload
} =
require(
"./algo-bot-rsi-touch-flip-book-payload.cjs"
);
const parsed =
parseRsiTouchFlipBookPayload(
body
);

if(
parsed.isRsiTouchFlip
){
const algoBot =
require(
"./algo-trading-bot.cjs"
);
const result =
await algoBot.syncRsiTouchFlipBook(
{
rows:
parsed.rows,
book:
parsed.rows,
source:
"lan",
balancePct:
parsed.balancePct
}
);

if(
result?.ok ===
false
){
return result;
}

const count =
Number(
result?.tickerCount
) ||
(
Array.isArray(
result?.rows
)
? result.rows.length
: parsed.rows.length
);

try{
sessionLog.appendNote(
`Remote RSI Flip book applied: tickers=${count}${
result?.running
? " live-synced"
: ""
}`
);
}catch{
/* ignore */
}

return {
ok:
true,
strategyId:
"rsi-touch-flip",
tickerCount:
count,
added:
result?.added ||
[],
removed:
result?.removed ||
[],
updated:
result?.updated ||
[],
skipped:
result?.skipped ||
[],
running:
!!result?.running,
message:
result?.message ||
`Книга RSI Flip записана (${count} тикеров).`
};
}

const algoBot =
require(
"./algo-trading-bot.cjs"
);
const strategyId =
String(
body?.strategyId ||
body?.book?.strategyId ||
"st1"
).trim().toLowerCase();
const result =
algoBot.syncTickerBook(
{
strategyId,
book:
body?.book,
exchangeId:
body?.exchangeId ||
body?.book?.exchange
}
);

if(
result?.ok ===
false
){
return result;
}

const count =
Number(
result?.tickerCount
) ||
Object.keys(
result?.book?.tickers ||
{}
).length;
const label =
strategyId ===
"st2"
? "Ст2"
: strategyId ===
"st3"
? "Ст3"
: "Ст1";

try{
sessionLog.appendNote(
`Remote ticker book applied: ${label} tickers=${count} tf=${result?.book?.tf || ""}`
);
}catch{
/* ignore */
}

return {
ok:
true,
strategyId:
result?.book?.strategyId ||
strategyId,
tickerCount:
count,
tf:
result?.book?.tf ||
"",
message:
`Книга ${label} записана (${count} тикеров). Запустите стратегию, чтобы торговать по ней.`
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
normalizeLanBotStrategyId(
opts.strategyId
);

if(
act ===
"start"
){
return algoBot.startBot(
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
),
...(
opts.earlyT3Prefs &&
typeof opts.earlyT3Prefs ===
"object"
? {
earlyT3Prefs:
opts.earlyT3Prefs
}
: {}
),
...(
Array.isArray(
opts.book
)
? {
book:
opts.book
}
: {}
),
...(
opts.balancePct !=
null &&
opts.balancePct !==
""
? {
balancePct:
opts.balancePct
}
: {}
)
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
const wins =
BrowserWindow.getAllWindows().filter(
(
w
)=>
w &&
!w.isDestroyed() &&
w.webContents &&
!w.webContents.isDestroyed()
);
const win =
wins.find(
(
w
)=>
w.isVisible()
) ||
wins[
0
] ||
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
const tryApply = async () => {
if (typeof window.__importAuthSessionTransferString === "function") {
return window.__importAuthSessionTransferString(transfer);
}
try {
const mod = await import("/js/cloud-sync.js?v=68");
if (typeof mod.importAuthSessionTransferString === "function") {
window.__importAuthSessionTransferString = mod.importAuthSessionTransferString;
return mod.importAuthSessionTransferString(transfer);
}
} catch (_) {}
return null;
};
for (let i = 0; i < 40; i++) {
const res = await tryApply();
if (res) {
return res;
}
await sleep(250);
}
return {
ok: false,
message: "UI ещё не готов — перезагрузите окно бота"
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
false,
saved:
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

requestOrigin =
String(
req?.headers?.origin ||
""
).trim();

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
!prefs.token
? "На боте нет токена канала — шестерёнка → «Логи → Терминал» → Новый токен / Сохранить"
: !token
? "Запрос без токена канала (не JWT). В Multichart окно LAN: тот же токен, что на боте"
: "Неверный токен канала. Скопируйте токен из шестерёнки бота → «Логи → Терминал», не строку mcauth1"
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
"/ticker-book"
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

const appliedBook =
await applyRemoteTickerBook(
body
);

sendJson(
res,
appliedBook.ok
? 200
: 400,
appliedBook
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
normalizeLanBotStrategyId(
body.strategyId
);

const result =
await handleLanBotCommand(
action,
{
strategyId,
...(
action ===
"start" &&
body.strategyPrefs &&
typeof body.strategyPrefs ===
"object"
? {
strategyPrefs:
body.strategyPrefs
}
: {}
),
...(
action ===
"start" &&
body.earlyT3Prefs &&
typeof body.earlyT3Prefs ===
"object"
? {
earlyT3Prefs:
body.earlyT3Prefs
}
: {}
),
...(
action ===
"start" &&
Array.isArray(
body.book
)
? {
book:
body.book
}
: {}
)
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
"GET /health|/sessions|/bot/status or POST /watchlists|/ticker-book|/bot/command|/auth/session"
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

if(
host ===
"0.0.0.0"
){
log.warn(
"session-log-server bound to 0.0.0.0 — LAN start/stop and auth inject are reachable on the network"
);
}
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
