/**
 * Fixed-port localhost bridge: web open.html asks if Multichart.app is running.
 * Only answers when the desktop process is up — does not launch a closed app.
 */
const http =
require(
"http"
);

/** Must match open.html */
const DESKTOP_HANDOFF_PORT =
47392;

const DESKTOP_HANDOFF_HOST =
"127.0.0.1";

function corsHeaders(){

return {
"Access-Control-Allow-Origin":
"*",
"Access-Control-Allow-Methods":
"GET, OPTIONS",
"Access-Control-Allow-Headers":
"Content-Type",
"Access-Control-Allow-Private-Network":
"true",
"Access-Control-Max-Age":
"86400",
"Cache-Control":
"no-store",
"Content-Type":
"application/json; charset=utf-8"
};

}

function sendJson(
res,
status,
body
){

res.writeHead(
status,
corsHeaders()
);
res.end(
JSON.stringify(
body
)
);

}

function parseOpenQuery(
reqUrl
){

const symbol =
String(
reqUrl.searchParams.get(
"symbol"
) ||
""
).trim().toUpperCase().replace(
/\.P$/i,
""
);
const tf =
String(
reqUrl.searchParams.get(
"tf"
) ||
"60"
).trim() ||
"60";
const exchange =
String(
reqUrl.searchParams.get(
"exchange"
) ||
""
).trim().toLowerCase();

if(
!symbol ||
!/^[A-Z0-9_-]{2,32}$/.test(
symbol
)
){
return null;
}

if(
!/^[0-9A-Za-z]{1,8}$/.test(
tf
)
){
return null;
}

const out =
{
symbol,
tf
};

if(
exchange ===
"bybit" ||
exchange ===
"bingx"
){
out.exchange =
exchange;
}

return out;

}

/**
 * @param {{ onOpen: (payload: { symbol: string, tf: string, exchange?: string }) => void, log?: { info?: Function, warn?: Function } }} opts
 */
function startDesktopHandoffServer(
opts
){

const onOpen =
opts?.onOpen;
const log =
opts?.log ||
console;

if(
typeof onOpen !==
"function"
){
throw new Error(
"desktop-handoff: onOpen required"
);
}

const server =
http.createServer(
(
req,
res
)=>{

try{
const reqUrl =
new URL(
req.url ||
"/",
`http://${DESKTOP_HANDOFF_HOST}`
);

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
error:
"method"
}
);
return;
}

if(
reqUrl.pathname ===
"/ping"
){
sendJson(
res,
200,
{
ok:
true,
service:
"multichart-desktop"
}
);
return;
}

if(
reqUrl.pathname !==
"/open"
){
sendJson(
res,
404,
{
ok:
false,
error:
"not_found"
}
);
return;
}

const payload =
parseOpenQuery(
reqUrl
);

if(
!payload
){
sendJson(
res,
400,
{
ok:
false,
error:
"bad_query"
}
);
return;
}

try{
onOpen(
payload
);
}catch(
err
){
log.warn?.(
"desktop-handoff onOpen:",
err?.message ||
err
);
sendJson(
res,
500,
{
ok:
false,
error:
"handler"
}
);
return;
}

sendJson(
res,
200,
{
ok:
true,
opened:
true
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
error:
String(
err?.message ||
err
)
}
);
}

}
);

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

if(
err?.code ===
"EADDRINUSE"
){
log.warn?.(
`desktop-handoff: port ${DESKTOP_HANDOFF_PORT} in use — Telegram→app bridge disabled`
);
resolve({
port:
null,
close:
async()=>{}
});
return;
}

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
log.info?.(
`desktop-handoff: http://${DESKTOP_HANDOFF_HOST}:${DESKTOP_HANDOFF_PORT}`
);
resolve({
port:
DESKTOP_HANDOFF_PORT,
close:()=>
new Promise(
resolveClose=>{
server.close(
()=>
resolveClose()
);
}
)
});

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
DESKTOP_HANDOFF_PORT,
DESKTOP_HANDOFF_HOST
);

}
);

}

module.exports =
{
startDesktopHandoffServer,
DESKTOP_HANDOFF_PORT,
DESKTOP_HANDOFF_HOST
};
