/**
 * Локальный HTTP для site-bundle — надёжнее custom protocol для /css, /js (type=module).
 */
const http =
require(
"http"
);
const fs =
require(
"fs"
);
const {
net
} =
require(
"electron"
);
const {
resolveBundleFile,
getMime
} =
require(
"./site-protocol.cjs"
);

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

function startLocalSiteServer({
bundleRoot,
remoteApiOrigin
}){

return new Promise(
(
resolve,
reject
)=>{

const server =
http.createServer(
(
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

}
);

server.on(
"error",
reject
);

server.listen(
0,
"127.0.0.1",
()=>{

const addr =
server.address();

if(
!addr ||
typeof addr ===
"string"
){
reject(
new Error(
"local site server: no address"
)
);
return;
}

const origin =
`http://127.0.0.1:${addr.port}`;

resolve({
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
});

}
);

}
);

}

module.exports =
{
startLocalSiteServer
};
