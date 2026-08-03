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
"Access-Control-Allow-Origin":
"*",
"Access-Control-Allow-Headers":
"Authorization, Content-Type",
"Access-Control-Allow-Methods":
"GET, OPTIONS"
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
"Access-Control-Allow-Origin":
"*",
"Access-Control-Allow-Headers":
"Authorization, Content-Type",
"Access-Control-Allow-Methods":
"GET, OPTIONS"
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

function handleRequest(
req,
res
){

try{
if(
req.method ===
"OPTIONS"
){
res.writeHead(
204,
{
"Access-Control-Allow-Origin":
"*",
"Access-Control-Allow-Headers":
"Authorization, Content-Type",
"Access-Control-Allow-Methods":
"GET, OPTIONS"
}
);
res.end();
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
"GET only"
}
);
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
pathname ===
"/health"
){
sendJson(
res,
200,
{
ok:
true,
service:
"algo-bot-session-logs",
dir:
sessionLog.getSessionsDir()
}
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
