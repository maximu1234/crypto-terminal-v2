/**
 * Multichart → remote Algo Bot session-log HTTP (direct, no worker/Supabase).
 */

function normalizeHost(
host
){

return String(
host ||
""
).trim().replace(
/^https?:\/\//i,
""
).replace(
/\/.*$/,
""
);

}

function buildUrl(
{
host,
port,
token,
path: pathname
}
){

const h =
normalizeHost(
host
);
const p =
Math.floor(
Number(
port
)
) ||
17865;
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
const q =
token
? `?token=${encodeURIComponent(
String(
token
)
)}`
: "";

return `http://${h}:${p}${pathPart}${q}`;

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
15000
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
url
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
30000
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

module.exports =
{
listRemoteSessionLogs,
fetchRemoteSessionLog,
buildUrl,
normalizeHost
};
