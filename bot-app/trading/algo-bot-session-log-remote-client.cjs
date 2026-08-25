/**
 * Multichart → remote Algo Bot session-log HTTP (direct, no worker/Supabase).
 */

function normalizeHost(
host
){

let h =
String(
host ||
""
).trim().replace(
/^https?:\/\//i,
""
).replace(
/\/.*$/,
""
);

/* "1.2.3.4:17865" pasted into host → strip port (port field is separate). */
if(
h.includes(
":"
) &&
!h.startsWith(
"["
)
){
const m =
h.match(
/^([^:]+):(\d{2,5})$/
);

if(
m
){
h =
m[1];
}
}

return h;

}

/**
 * @returns {{ host: string, port: number }|null}
 */
function resolveHostPort(
host,
port
){

let h =
String(
host ||
""
).trim().replace(
/^https?:\/\//i,
""
).replace(
/\/.*$/,
""
);
let p =
Math.floor(
Number(
port
)
) ||
0;

if(
h.includes(
":"
) &&
!h.startsWith(
"["
)
){
const m =
h.match(
/^([^:]+):(\d{2,5})$/
);

if(
m
){
h =
m[1];

if(
!p
){
p =
Math.floor(
Number(
m[2]
)
);
}
}
}

h =
normalizeHost(
h
);
p =
p ||
17865;

if(
!h ||
p <
1 ||
p >
65535
){
return null;
}

return {
host:
h,
port:
p
};

}

function buildUrl(
{
host,
port,
token,
path: pathname
}
){

const resolved =
resolveHostPort(
host,
port
);

if(
!resolved
){
return "";
}

const pathPart =
String(
pathname ||
"/"
).startsWith(
"/"
)
? String(
pathname
)
: `/${pathname}`;

return `http://${resolved.host}:${resolved.port}${pathPart}`;

}

function getNet(){

return require(
"electron"
).net;

}

/**
 * @param {string} url
 * @param {number} [timeoutMs]
 * @returns {Promise<{ ok: boolean, status?: number, text?: string, json?: any, message?: string }>}
 */
async function fetchText(
url,
timeoutMs =
15000,
token =
""
){

const net =
getNet();

return new Promise(
(
resolve
)=>{
let settled =
false;
const finish =
(
value
)=>{
if(
settled
){
return;
}

settled =
true;
resolve(
value
);
};

try{
const request =
net.request(
{
method:
"GET",
url
}
);
const auth =
String(
token ||
""
).trim();

if(
auth
){
request.setHeader(
"Authorization",
`Bearer ${auth}`
);
}
const chunks =
[];
const timer =
setTimeout(
()=>{
try{
request.abort();
}catch{
/* ignore */
}

finish(
{
ok:
false,
message:
"Timeout"
}
);
},
timeoutMs
);

request.on(
"response",
(
response
)=>{
response.on(
"data",
(
chunk
)=>{
chunks.push(
Buffer.from(
chunk
)
);
}
);
response.on(
"end",
()=>{
clearTimeout(
timer
);
const text =
Buffer.concat(
chunks
).toString(
"utf8"
);
const status =
Number(
response.statusCode
) ||
0;

if(
status <
200 ||
status >=
300
){
let message =
text.slice(
0,
200
);

try{
const j =
JSON.parse(
text
);

message =
j.message ||
message;
}catch{
/* plain */
}

finish(
{
ok:
false,
status,
message:
message ||
`HTTP ${status}`
}
);
return;
}

finish(
{
ok:
true,
status,
text
}
);
}
);
response.on(
"error",
(
err
)=>{
clearTimeout(
timer
);
finish(
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
}
);

request.on(
"error",
(
err
)=>{
clearTimeout(
timer
);
finish(
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

request.end();
}catch(
err
){
finish(
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
);

}

async function listRemoteSessionLogs(
payload =
{}
){

const url =
buildUrl(
{
host:
payload.host,
port:
payload.port,
token:
payload.token,
path:
"/sessions"
}
);
const res =
await fetchText(
url,
15000,
payload.token
);

if(
!res.ok
){
return res;
}

try{
const json =
JSON.parse(
res.text ||
"{}"
);

return {
ok:
!!json.ok,
files:
Array.isArray(
json.files
)
? json.files
: [],
message:
json.message
};
}catch(
err
){
return {
ok:
false,
message:
String(
err?.message ||
err
)
};
}

}

async function fetchRemoteSessionLog(
payload =
{}
){

const name =
String(
payload.name ||
""
).trim();

if(
!/^[A-Za-z0-9._-]+\.log$/.test(
name
)
){
return {
ok:
false,
message:
"Invalid log file name"
};
}

const url =
buildUrl(
{
host:
payload.host,
port:
payload.port,
token:
payload.token,
path:
`/sessions/${encodeURIComponent(
name
)}`
}
);
const res =
await fetchText(
url,
30000,
payload.token
);

if(
!res.ok
){
return res;
}

return {
ok:
true,
name,
text:
res.text ||
""
};

}

/**
 * @param {string} url
 * @param {object} body
 * @param {number} [timeoutMs]
 * @returns {Promise<{ ok: boolean, status?: number, text?: string, json?: any, message?: string }>}
 */
async function fetchJsonPost(
url,
body,
timeoutMs =
30000,
token =
""
){

if(
!String(
url ||
""
).trim()
){
return {
ok:
false,
message:
"Некорректный IP/порт канала"
};
}

const net =
getNet();

return new Promise(
(
resolve
)=>{
let settled =
false;
const finish =
(
value
)=>{
if(
settled
){
return;
}

settled =
true;
resolve(
value
);
};

try{
const request =
net.request(
{
method:
"POST",
url
}
);
const auth =
String(
token ||
""
).trim();

if(
auth
){
request.setHeader(
"Authorization",
`Bearer ${auth}`
);
}
const chunks =
[];
const timer =
setTimeout(
()=>{
try{
request.abort();
}catch{
/* ignore */
}

finish(
{
ok:
false,
message:
"Таймаут соединения с ботом"
}
);
},
timeoutMs
);

request.on(
"response",
(
response
)=>{
response.on(
"data",
(
chunk
)=>{
chunks.push(
chunk
);
}
);
response.on(
"end",
()=>{
clearTimeout(
timer
);
const text =
Buffer.concat(
chunks
).toString(
"utf8"
);
let json =
null;

try{
json =
JSON.parse(
text ||
"{}"
);
}catch{
json =
null;
}

const status =
response.statusCode ||
0;
const ok =
status >=
200 &&
status <
300 &&
!!json?.ok;

finish(
{
ok,
status,
text,
json,
message:
json?.message ||
(
ok
? undefined
: `HTTP ${status}`
)
}
);
}
);
response.on(
"error",
(
err
)=>{
clearTimeout(
timer
);
finish(
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
}
);

request.on(
"error",
(
err
)=>{
clearTimeout(
timer
);
finish(
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

const payload =
JSON.stringify(
body ||
{}
);

request.setHeader(
"Content-Type",
"application/json; charset=utf-8"
);
/*
  Do not set Content-Length manually — Electron net.request often throws
  net::ERR_INVALID_ARGUMENT when the header disagrees with the body.
*/
request.end(
payload,
"utf8"
);
}catch(
err
){
finish(
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
);

}

async function pushRemoteWatchlists(
payload =
{}
){

const url =
buildUrl(
{
host:
payload.host,
port:
payload.port,
token:
payload.token,
path:
"/watchlists"
}
);

const body =
payload.root &&
typeof payload.root ===
"object"
? {
root:
payload.root
}
: {
exchangeId:
payload.exchangeId ||
"bybit",
flags:
payload.flags ||
{}
};

if(
!body.root &&
!(
body.flags &&
typeof body.flags ===
"object"
)
){
return {
ok:
false,
message:
"Нет списков для отправки"
};
}

const res =
await fetchJsonPost(
url,
body,
30000,
payload.token
);

if(
!res.ok
){
return {
ok:
false,
message:
res.message ||
res.json?.message ||
"Не удалось отправить списки"
};
}

return {
ok:
true,
counts:
res.json?.counts ||
null,
message:
res.json?.message ||
"Списки отправлены"
};

}

async function pushRemoteTickerBook(
payload =
{}
){

const url =
buildUrl(
{
host:
payload.host,
port:
payload.port,
token:
payload.token,
path:
"/ticker-book"
}
);

const book =
payload.book &&
typeof payload.book ===
"object"
? payload.book
: null;

if(
!book ||
!book.tickers ||
typeof book.tickers !==
"object"
){
return {
ok:
false,
message:
"Нет книги параметров для отправки. Сначала «Применить к боту»."
};
}

const res =
await fetchJsonPost(
url,
{
strategyId:
payload.strategyId ||
book.strategyId ||
"st1",
exchangeId:
payload.exchangeId ||
book.exchange ||
"bybit",
book
},
120000,
payload.token
);

if(
!res.ok
){
return {
ok:
false,
message:
res.message ||
res.json?.message ||
"Не удалось отправить книгу"
};
}

return {
ok:
true,
tickerCount:
res.json?.tickerCount ||
null,
tf:
res.json?.tf ||
"",
message:
res.json?.message ||
"Книга отправлена"
};

}

/**
 * @param {{ host: string, port?: string|number, token: string }} payload
 */
async function fetchRemoteBotLanStatus(
payload =
{}
){

const url =
buildUrl(
{
host:
payload.host,
port:
payload.port,
token:
payload.token,
path:
"/bot/status"
}
);

const res =
await fetchText(
url,
12000,
payload.token
);

if(
!res.ok
){
return {
ok:
false,
error:
res.status ===
401
? "unauthorized"
: "network",
message:
res.message ||
"Не удалось связаться с ботом по LAN"
};
}

let data =
{};

try{
data =
JSON.parse(
res.text ||
"{}"
);
}catch{
data =
{};
}

return {
ok:
true,
online:
data.online !==
false,
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
strategyId:
data.strategyId ||
null,
tradingMode:
data.tradingMode ||
null,
watchlistCount:
data.watchlistCount ??
null,
strategyPrefs:
data.strategyPrefs &&
typeof data.strategyPrefs ===
"object"
? data.strategyPrefs
: null,
via:
"lan"
};

}

/**
 * @param {{ host: string, port?: string|number, token: string, action: "start"|"stop", strategyId?: string }} payload
 */
async function sendRemoteBotLanCommand(
payload =
{}
){

const action =
String(
payload.action ||
""
).trim().toLowerCase();

if(
action !==
"start" &&
action !==
"stop"
){
return {
ok:
false,
error:
"bad_action",
message:
"action must be start or stop"
};
}

const url =
buildUrl(
{
host:
payload.host,
port:
payload.port,
token:
payload.token,
path:
"/bot/command"
}
);

const strategyId =
[
"st1",
"st2",
"st3",
"early-t3",
"rsi-touch-flip"
].includes(
String(
payload.strategyId ||
""
).trim().toLowerCase()
)
? String(
payload.strategyId
).trim().toLowerCase()
: "st1";

const res =
await fetchJsonPost(
url,
{
action,
...(
action ===
"start"
? {
strategyId,
...(
payload.strategyPrefs &&
typeof payload.strategyPrefs ===
"object"
? {
strategyPrefs:
payload.strategyPrefs
}
: {}
),
...(
payload.earlyT3Prefs &&
typeof payload.earlyT3Prefs ===
"object"
? {
earlyT3Prefs:
payload.earlyT3Prefs
}
: {}
),
...(
Array.isArray(
payload.book
)
? {
book:
payload.book
}
: {}
)
}
: {}
)
},
60000,
payload.token
);

if(
!res.ok
){
return {
ok:
false,
error:
res.json?.code ||
res.json?.error ||
"command_failed",
message:
res.message ||
res.json?.message ||
"Команда не выполнена",
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
!!res.json?.running,
alreadyRunning:
!!res.json?.alreadyRunning
};

}

/**
 * @param {{ host: string, port?: string|number, token: string, transfer: string }} payload
 */
async function pushRemoteAuthSession(
payload =
{}
){

const transfer =
String(
payload.transfer ||
""
).trim();

if(
!transfer
){
return {
ok:
false,
message:
"Нет строки сессии"
};
}

const url =
buildUrl(
{
host:
payload.host,
port:
payload.port,
token:
payload.token,
path:
"/auth/session"
}
);

const res =
await fetchJsonPost(
url,
{
transfer
},
30000,
payload.token
);

if(
!res.ok
){
return {
ok:
false,
message:
res.message ||
res.json?.message ||
"Не удалось отправить сессию"
};
}

return {
ok:
true,
email:
res.json?.email ||
null,
message:
res.json?.message ||
"Сессия отправлена"
};

}

module.exports =
{
listRemoteSessionLogs,
fetchRemoteSessionLog,
pushRemoteWatchlists,
pushRemoteTickerBook,
fetchRemoteBotLanStatus,
sendRemoteBotLanCommand,
pushRemoteAuthSession,
buildUrl,
normalizeHost
};
