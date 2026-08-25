/**
 * Локальный HTTP для site-bundle — надёжнее custom protocol для /css, /js (type=module).
 * Порт фиксированный / сохранённый: localStorage (сессия) привязан к origin.
 */
const http =
require(
"http"
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
const {
net
} =
require(
"electron"
);
const https =
require(
"https"
);
const {
resolveBundleFile,
getMime
} =
require(
"./site-protocol.cjs"
);

const DEFAULT_LOCAL_SITE_PORT =
47393;
const BINGX_API_BASE =
"https://open-api.bingx.com";
const BYBIT_API_BASES =
[
"https://api.bybit.com",
"https://api.bytick.com"
];
const PORT_FILE =
"local-site-port.json";

function portConfigPath(){

return path.join(
app.getPath(
"userData"
),
PORT_FILE
);

}

function readSavedPort(){

try{
const port =
Number(
JSON.parse(
fs.readFileSync(
portConfigPath(),
"utf8"
)
)?.port
);

if(
Number.isInteger(
port
) &&
port >
0 &&
port <
65536
){
return port;
}
}catch{
/* ignore */
}

return null;

}

function writeSavedPort(
port
){

try{
fs.mkdirSync(
path.dirname(
portConfigPath()
),
{
recursive:
true
}
);
fs.writeFileSync(
portConfigPath(),
JSON.stringify(
{
port
}
)
);
}catch{
/* ignore */
}

}

function readRequestBody(
req
){

return new Promise(
(
resolve,
reject
)=>{

const chunks =
[];

req.on(
"data",
chunk=>{
chunks.push(
chunk
);
}
);

req.on(
"end",
()=>{
resolve(
Buffer.concat(
chunks
)
);
}
);

req.on(
"error",
reject
);

}
);

}

async function serveBingxProxy(
reqUrl,
res
){

const apiPath =
reqUrl.searchParams.get(
"path"
) ||
"";

if(
!apiPath.startsWith(
"/openApi/"
)
){
res.writeHead(
400,
{
"Content-Type":
"application/json; charset=utf-8",
"Access-Control-Allow-Origin":
"*"
}
);
res.end(
JSON.stringify({
code:
-1,
msg:
"invalid path"
})
);
return;
}

const upstream =
await net.fetch(
`${BINGX_API_BASE}${apiPath}`,
{
headers:{
Accept:
"application/json",
"User-Agent":
"Multichart-Desktop/1.0"
}
}
);

const buf =
Buffer.from(
await upstream.arrayBuffer()
);

res.writeHead(
upstream.status,
{
"Content-Type":
upstream.headers.get(
"content-type"
) ||
"application/json",
"Access-Control-Allow-Origin":
"*",
"Cache-Control":
"no-cache"
}
);
res.end(
buf
);

}

function isPublicBybitMarketPath(
raw
){

if(
typeof raw !==
"string" ||
raw.includes(
".."
) ||
raw.includes(
"\\"
)
){
return false;
}

const pathname =
raw.split(
"?"
)[
0
];

return pathname ===
"/v5/market" ||
pathname.startsWith(
"/v5/market/"
);

}

function httpsGetBuffer(
url,
timeoutMs =
12000
){

return new Promise(
(
resolve,
reject
)=>{

const req =
https.get(
url,
{
headers:{
Accept:
"application/json",
"User-Agent":
"Multichart-AlgoBot/1.0"
}
},
res=>{

const chunks =
[];

res.on(
"data",
chunk=>
chunks.push(
chunk
)
);
res.on(
"end",
()=>{
resolve(
{
status:
res.statusCode ||
0,
headers:
res.headers,
body:
Buffer.concat(
chunks
)
}
);
}
);
res.on(
"error",
reject
);

}
);

req.setTimeout(
timeoutMs,
()=>{
req.destroy();
reject(
new Error(
"timeout"
)
);
}
);
req.on(
"error",
reject
);

}
);

}

async function serveBybitProxy(
reqUrl,
res
){

const apiPath =
reqUrl.searchParams.get(
"path"
) ||
"";

if(
!isPublicBybitMarketPath(
apiPath
)
){
res.writeHead(
400,
{
"Content-Type":
"application/json; charset=utf-8",
"Access-Control-Allow-Origin":
"*"
}
);
res.end(
JSON.stringify({
retCode:
-1,
retMsg:
"invalid path"
})
);
return;
}

const pathQuery =
apiPath.startsWith(
"/"
)
? apiPath
: `/${apiPath}`;
let lastErr =
"Bybit proxy failed";

for(
const base of BYBIT_API_BASES
){

try{
const upstream =
await httpsGetBuffer(
`${base}${pathQuery}`
);

res.writeHead(
upstream.status ||
200,
{
"Content-Type":
upstream.headers[
"content-type"
] ||
"application/json",
"Access-Control-Allow-Origin":
"*",
"Cache-Control":
"no-cache"
}
);
res.end(
upstream.body
);
return;
}catch(
err
){
lastErr =
err?.message ||
String(
err
);
}

}

res.writeHead(
502,
{
"Content-Type":
"application/json; charset=utf-8",
"Access-Control-Allow-Origin":
"*"
}
);
res.end(
JSON.stringify({
retCode:
-1,
retMsg:
lastErr
})
);

}

function createRequestHandler({
bundleRoot,
remoteApiOrigin
}){

return (
req,
res
)=>{

void (
async()=>{

try{
const reqUrl =
new URL(
req.url ||
"/",
"http://127.0.0.1"
);

if(
reqUrl.pathname ===
"/api/bingx"
){
await serveBingxProxy(
reqUrl,
res
);
return;
}

if(
reqUrl.pathname ===
"/api/bybit"
){
await serveBybitProxy(
reqUrl,
res
);
return;
}

if(
reqUrl.pathname.startsWith(
"/api/"
)
){

const remote =
`${String(
remoteApiOrigin
).replace(
/\/$/,
""
)}${reqUrl.pathname}${reqUrl.search}`;
const body =
req.method !==
"GET" &&
req.method !==
"HEAD"
? await readRequestBody(
req
)
: undefined;
const headers =
{
...req.headers
};
delete headers.host;
delete headers.connection;
const upstream =
await net.fetch(
remote,
{
method:
req.method,
headers,
body
}
);
const outHeaders =
Object.fromEntries(
upstream.headers.entries()
);
outHeaders[
"Access-Control-Allow-Origin"
] =
"*";
res.writeHead(
upstream.status,
outHeaders
);
const buf =
Buffer.from(
await upstream.arrayBuffer()
);
res.end(
buf
);
return;
}

const filePath =
resolveBundleFile(
bundleRoot,
reqUrl.pathname
);

if(
!filePath
){
res.writeHead(
404,
{
"Content-Type":
"text/plain; charset=utf-8"
}
);
res.end(
`Not Found: ${reqUrl.pathname}`
);
return;
}

res.writeHead(
200,
{
"Content-Type":
getMime(
filePath
),
"Access-Control-Allow-Origin":
"*",
"Cross-Origin-Resource-Policy":
"cross-origin",
"Cache-Control":
"no-cache"
}
);
fs.createReadStream(
filePath
).pipe(
res
);

}catch(
err
){
if(
!res.headersSent
){
res.writeHead(
500,
{
"Content-Type":
"text/plain; charset=utf-8"
}
);
}
res.end(
String(
err?.message ||
err
)
);
}

}
)();

};

}

function listenServer(
server,
port
){

return new Promise(
(
resolve,
reject
)=>{

const onError =
err=>{
server.off(
"listening",
onListening
);
reject(
err
);
};

const onListening =
()=>{
server.off(
"error",
onError
);
resolve(
server.address()
);
};

server.once(
"error",
onError
);
server.once(
"listening",
onListening
);
server.listen(
port,
"127.0.0.1"
);

}
);

}

function startLocalSiteServer({
bundleRoot,
remoteApiOrigin
}){

const savedPort =
readSavedPort();
const portCandidates =
[];

if(
savedPort !=
null
){
portCandidates.push(
savedPort
);
}

if(
!portCandidates.includes(
DEFAULT_LOCAL_SITE_PORT
)
){
portCandidates.push(
DEFAULT_LOCAL_SITE_PORT
);
}

portCandidates.push(
0
);

return (
async()=>{

for(
const port of portCandidates
){

const server =
http.createServer(
createRequestHandler(
{
bundleRoot,
remoteApiOrigin
}
)
);

try{
const addr =
await listenServer(
server,
port
);
const actualPort =
typeof addr ===
"object" &&
addr?.port
? addr.port
: port;

writeSavedPort(
actualPort
);

const origin =
`http://127.0.0.1:${actualPort}`;

return {
origin,
close:()=>
new Promise(
resolveClose=>{
server.close(
()=>{
resolveClose();
}
);
}
)
};
}catch(
err
){

if(
err?.code ===
"EADDRINUSE"
){
try{
server.close();
}catch{
/* ignore */
}
continue;
}

throw err;

}

}

throw new Error(
"local site server: could not bind"
);

}
)();

}

module.exports =
{
startLocalSiteServer,
DEFAULT_LOCAL_SITE_PORT
};
