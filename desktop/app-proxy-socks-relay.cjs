/**
 * Chromium cannot send SOCKS5 username/password.
 * Local no-auth SOCKS on 127.0.0.1 forwards to the remote SOCKS with RFC1929 auth.
 */
"use strict";

const net =
require(
"net"
);
const tls =
require(
"tls"
);
const https =
require(
"https"
);

const CONNECT_TIMEOUT_MS =
12000;

let relayServer =
null;
let relayHttpsAgent =
null;

function closeSocket(
socket
){

if(
!socket
){
return;
}

try{
socket.destroy();
}catch{
/* ignore */
}

}

function createReader(
socket
){

let buf =
Buffer.alloc(
0
);
let waiter =
null;

function fail(
err
){

if(
!waiter
){
return;
}

const {
reject
} =
waiter;
waiter =
null;
reject(
err
);

}

function onData(
chunk
){

buf =
Buffer.concat(
[
buf,
chunk
]
);

if(
waiter &&
buf.length >=
waiter.n
){
const n =
waiter.n;
const out =
buf.subarray(
0,
n
);
buf =
buf.subarray(
n
);
const {
resolve
} =
waiter;
waiter =
null;
resolve(
out
);
}

}

function onError(
err
){

fail(
err ||
new Error(
"socket error"
)
);

}

function onClose(){

fail(
new Error(
"socket closed"
)
);

}

socket.on(
"data",
onData
);
socket.on(
"error",
onError
);
socket.on(
"close",
onClose
);

return {
read(
n
){

return new Promise(
(
resolve,
reject
)=>{

if(
buf.length >=
n
){
const out =
buf.subarray(
0,
n
);
buf =
buf.subarray(
n
);
resolve(
out
);
return;
}

waiter =
{
n,
resolve,
reject
};

}
);

},
takeLeftover(){

const out =
buf;
buf =
Buffer.alloc(
0
);
return out;

},
detach(){

waiter =
null;
socket.off(
"data",
onData
);
socket.off(
"error",
onError
);
socket.off(
"close",
onClose
);

}
};

}

function socksFailReply(){

return Buffer.from(
[
0x05,
0x01,
0x00,
0x01,
0,
0,
0,
0,
0,
0
]
);

}

function socksOkReply(){

return Buffer.from(
[
0x05,
0x00,
0x00,
0x01,
0,
0,
0,
0,
0,
0
]
);

}

function encodeUserPass(
username,
password
){

const user =
Buffer.from(
String(
username ||
""
),
"utf8"
);
const pass =
Buffer.from(
String(
password ||
""
),
"utf8"
);

if(
user.length >
255 ||
pass.length >
255
){
throw new Error(
"логин или пароль прокси длиннее 255 символов"
);
}

return Buffer.concat(
[
Buffer.from(
[
0x01,
user.length
]
),
user,
Buffer.from(
[
pass.length
]
),
pass
]
);

}

async function readSocksAddress(
reader,
atyp
){

if(
atyp ===
0x01
){
const ip =
await reader.read(
4
);
const portBuf =
await reader.read(
2
);
return {
addrBuf:
Buffer.concat(
[
Buffer.from(
[
atyp
]
),
ip,
portBuf
]
)
};
}

if(
atyp ===
0x03
){
const lenBuf =
await reader.read(
1
);
const host =
await reader.read(
lenBuf[0]
);
const portBuf =
await reader.read(
2
);
return {
addrBuf:
Buffer.concat(
[
Buffer.from(
[
atyp
]
),
lenBuf,
host,
portBuf
]
)
};
}

if(
atyp ===
0x04
){
const ip =
await reader.read(
16
);
const portBuf =
await reader.read(
2
);
return {
addrBuf:
Buffer.concat(
[
Buffer.from(
[
atyp
]
),
ip,
portBuf
]
)
};
}

throw new Error(
"unknown SOCKS address type"
);

}

function connectTcp(
host,
port
){

return new Promise(
(
resolve,
reject
)=>{

const socket =
net.connect(
{
host,
port,
timeout:
CONNECT_TIMEOUT_MS
},
()=>{
socket.setTimeout(
0
);
resolve(
socket
);
}
);

socket.once(
"error",
reject
);
socket.once(
"timeout",
()=>{
closeSocket(
socket
);
reject(
new Error(
"таймаут SOCKS"
)
);
}
);

}
);

}

async function handshakeRemote(
remote,
reader,
settings,
addrBuf
){

const useAuth =
!!(
settings.username ||
settings.password
);

remote.write(
Buffer.from(
[
0x05,
1,
useAuth
? 0x02
: 0x00
]
)
);

const greet =
await reader.read(
2
);

if(
greet[0] !==
0x05
){
throw new Error(
"удалённый прокси не SOCKS5"
);
}

if(
greet[1] ===
0xff
){
throw new Error(
"удалённый прокси отклонил авторизацию"
);
}

if(
greet[1] ===
0x02
){
remote.write(
encodeUserPass(
settings.username,
settings.password
)
);
const auth =
await reader.read(
2
);

if(
auth[1] !==
0x00
){
throw new Error(
"логин или пароль SOCKS не принят"
);
}

}

remote.write(
Buffer.concat(
[
Buffer.from(
[
0x05,
0x01,
0x00
]
),
addrBuf
]
)
);

const replyHead =
await reader.read(
4
);

if(
replyHead[0] !==
0x05 ||
replyHead[1] !==
0x00
){
throw new Error(
"удалённый прокси не открыл туннель"
);
}

await readSocksAddress(
reader,
replyHead[3]
);

}

function pipeSockets(
left,
right,
leftExtra,
rightExtra
){

if(
leftExtra?.length
){
right.write(
leftExtra
);
}

if(
rightExtra?.length
){
left.write(
rightExtra
);
}

left.pipe(
right
);
right.pipe(
left
);

}

async function handleClient(
client,
settings
){

const localReader =
createReader(
client
);
let remote =
null;

try{
const hello =
await localReader.read(
2
);

if(
hello[0] !==
0x05
){
throw new Error(
"клиент не SOCKS5"
);
}

await localReader.read(
hello[1]
);
client.write(
Buffer.from(
[
0x05,
0x00
]
)
);

const req =
await localReader.read(
4
);

if(
req[1] !==
0x01
){
client.write(
socksFailReply()
);
closeSocket(
client
);
return;
}

const {
addrBuf
} =
await readSocksAddress(
localReader,
req[3]
);

remote =
await connectTcp(
settings.host,
settings.port
);
const remoteReader =
createReader(
remote
);

await handshakeRemote(
remote,
remoteReader,
settings,
addrBuf
);

client.write(
socksOkReply()
);

const localExtra =
localReader.takeLeftover();
const remoteExtra =
remoteReader.takeLeftover();
localReader.detach();
remoteReader.detach();

pipeSockets(
client,
remote,
localExtra,
remoteExtra
);

client.on(
"error",
()=>
closeSocket(
remote
)
);
remote.on(
"error",
()=>
closeSocket(
client
)
);
}catch{
try{
client.write(
socksFailReply()
);
}catch{
/* ignore */
}

closeSocket(
client
);
closeSocket(
remote
);

}

}

function stopSocksAuthRelay(){

return new Promise(
resolve=>{

if(
!relayServer
){
resolve();
return;
}

const server =
relayServer;
relayServer =
null;
relayHttpsAgent =
null;

try{
server.close(
()=>
resolve()
);
}catch{
resolve();
}

setTimeout(
()=>
resolve(),
500
);

}
);

}

async function startSocksAuthRelay(
settings
){

await stopSocksAuthRelay();

return new Promise(
(
resolve,
reject
)=>{

const server =
net.createServer(
client=>{
void handleClient(
client,
settings
);
}
);

server.once(
"error",
err=>{
reject(
err
);
}
);

server.listen(
0,
"127.0.0.1",
()=>{
relayServer =
server;
const addr =
server.address();
resolve(
addr &&
addr.port
);
}
);

}
);

}

function encodeSocksDomainTarget(
host,
port
){

const name =
Buffer.from(
String(
host ||
""
),
"utf8"
);
const portBuf =
Buffer.alloc(
2
);
portBuf.writeUInt16BE(
Number(
port
) ||
443
);

return Buffer.concat(
[
Buffer.from(
[
0x05,
0x01,
0x00,
0x03,
name.length
]
),
name,
portBuf
]
);

}

async function openNoAuthSocksTunnel(
opts
){

const relayHost =
opts.relayHost ||
"127.0.0.1";
const relayPort =
Number(
opts.relayPort
);
const destHost =
opts.destHost;
const destPort =
Number(
opts.destPort
) ||
443;

if(
!relayPort ||
!destHost
){
throw new Error(
"socks relay не запущен"
);
}

const socket =
await connectTcp(
relayHost,
relayPort
);
const reader =
createReader(
socket
);

try{
socket.write(
Buffer.from(
[
0x05,
1,
0x00
]
)
);
const method =
await reader.read(
2
);

if(
method[0] !==
0x05 ||
method[1] !==
0x00
){
throw new Error(
"локальный SOCKS отклонил соединение"
);
}

socket.write(
encodeSocksDomainTarget(
destHost,
destPort
)
);

const head =
await reader.read(
4
);

if(
head[0] !==
0x05 ||
head[1] !==
0x00
){
throw new Error(
"SOCKS туннель не открылся"
);
}

await readSocksAddress(
reader,
head[3]
);

const extra =
reader.takeLeftover();
reader.detach();

if(
extra.length
){
socket.unshift(
extra
);
}

return socket;
}catch(
err
){
reader.detach();
closeSocket(
socket
);
throw err;
}

}

function getRelayListenPort(){

const addr =
relayServer &&
relayServer.address &&
relayServer.address();

return addr &&
addr.port;

}

function tlsHandshakeThroughRelay(
host,
timeoutMs
){

const relayPort =
getRelayListenPort();

if(
!relayPort
){
return Promise.reject(
new Error(
"socks relay не запущен"
)
);
}

return new Promise(
(
resolve,
reject
)=>{

let plain =
null;
let tlsSocket =
null;
let settled =
false;
const timer =
setTimeout(
()=>{
finish(
new Error(
"таймаут TLS"
)
);
},
timeoutMs
);

function finish(
err,
okHost
){

if(
settled
){
return;
}

settled =
true;
clearTimeout(
timer
);
closeSocket(
tlsSocket
);
closeSocket(
plain
);

if(
err
){
reject(
err
);
return;
}

resolve(
okHost
);

}

void openNoAuthSocksTunnel(
{
relayHost:
"127.0.0.1",
relayPort,
destHost:
host,
destPort:
443
}
).then(
socket=>{
plain =
socket;
tlsSocket =
tls.connect(
{
socket:
plain,
servername:
host
}
);
tlsSocket.once(
"secureConnect",
()=>{
finish(
null,
host
);
}
);
tlsSocket.once(
"error",
finish
);
}
).catch(
finish
);

}
);

}

async function raceRelayTlsHosts(
hosts,
timeoutMs =
4000
){

const list =
(
Array.isArray(
hosts
)
? hosts
: []
).filter(
Boolean
);

if(
!list.length
){
throw new Error(
"no hosts"
);
}

return await new Promise(
(
resolve,
reject
)=>{

let left =
list.length;
let won =
false;

for(
const host of list
){
void tlsHandshakeThroughRelay(
host,
timeoutMs
).then(
okHost=>{

if(
won
){
return;
}

won =
true;
resolve(
okHost
);

}
).catch(
()=>{
left -=
1;

if(
!won &&
left <=
0
){
reject(
new Error(
"TLS через SOCKS недоступен"
)
);
}

}
);
}

}
);

}

function getRelayHttpsAgent(){

const addr =
relayServer &&
relayServer.address &&
relayServer.address();
const port =
addr &&
addr.port;

if(
!port
){
relayHttpsAgent =
null;
return undefined;
}

if(
relayHttpsAgent
){
return relayHttpsAgent;
}

relayHttpsAgent =
new https.Agent({
keepAlive:
true,
keepAliveMsecs:
15000,
maxSockets:
4,
maxFreeSockets:
2,
createConnection(
options,
callback
){

const destHost =
options.servername ||
options.host ||
options.hostname;
const destPort =
Number(
options.port
) ||
443;
let settled =
false;

function done(
err,
socket
){

if(
settled
){
return;
}

settled =
true;
callback(
err,
socket
);

}

void openNoAuthSocksTunnel({
relayHost:
"127.0.0.1",
relayPort:
port,
destHost,
destPort
}).then(
plain=>{

const tlsSocket =
tls.connect({
socket:
plain,
servername:
destHost,
rejectUnauthorized:
options.rejectUnauthorized !==
false
});

tlsSocket.once(
"secureConnect",
()=>{
done(
null,
tlsSocket
);
}
);
tlsSocket.once(
"error",
done
);

}
).catch(
done
);

}
});

return relayHttpsAgent;

}

function needsSocksAuthRelay(
cfg
){

return !!(
cfg &&
cfg.type !==
"http" &&
(
cfg.username ||
cfg.password
)
);

}

module.exports =
{
encodeUserPass,
getRelayHttpsAgent,
needsSocksAuthRelay,
raceRelayTlsHosts,
startSocksAuthRelay,
stopSocksAuthRelay
};
