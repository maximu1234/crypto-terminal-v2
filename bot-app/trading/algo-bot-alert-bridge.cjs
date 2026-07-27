/**
 * Main → renderer bridge: place/remove Terminal price alerts for manual bot mode.
 */
const {
BrowserWindow,
ipcMain
} =
require(
"electron"
);
const log =
require(
"electron-log"
);

const PLACE_TIMEOUT_MS =
12000;
const REMOVE_TIMEOUT_MS =
8000;

/** @type {Map<string, { symbol: string, shapeId: string }>} */
const pendingAlerts =
new Map();

/** @type {Map<string, { resolve: Function, timer: NodeJS.Timeout }>} */
const waiters =
new Map();

let responseHandlerRegistered =
false;

function makeRequestId(){

return `algo_alert_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

}

function ensureResponseHandler(){

if(
responseHandlerRegistered
){
return;
}

responseHandlerRegistered =
true;

ipcMain.on(
"desktop:algoTradingBotAlertResponse",
(
_event,
payload
)=>{

const requestId =
String(
payload?.requestId ||
""
).trim();

if(
!requestId
){
return;
}

const waiter =
waiters.get(
requestId
);

if(
!waiter
){
return;
}

clearTimeout(
waiter.timer
);
waiters.delete(
requestId
);
waiter.resolve(
payload ||
{}
);

}
);

}

function broadcastRequest(
payload
){

const windows =
BrowserWindow.getAllWindows();
let sent =
0;

for(
const win of windows
){

try{
if(
win.isDestroyed?.() ||
win.webContents?.isDestroyed?.()
){
continue;
}

win.webContents.send(
"algoTrading:botAlertRequest",
payload
);
sent +=
1;
}catch(
err
){
log.warn(
"algo-bot-alert send:",
err?.message ||
err
);
}

}

return sent;

}

/**
 * @param {object} payload
 * @returns {Promise<{ ok: boolean, shapeId?: string, message?: string }>}
 */
function placeBotAlert(
payload =
{}
){

ensureResponseHandler();

const symbol =
String(
payload?.symbol ||
""
).trim().toUpperCase();
const price =
Number(
payload?.price
);
const tf =
String(
payload?.tf ||
"5"
).trim();
const fingerprint =
String(
payload?.fingerprint ||
""
).trim();
const side =
payload?.side ===
"short"
? "short"
: "long";

if(
!symbol ||
!Number.isFinite(
price
)
){
return Promise.resolve(
{
ok:
false,
message:
"symbol/price required"
}
);
}

if(
fingerprint &&
pendingAlerts.has(
fingerprint
)
){
return Promise.resolve(
{
ok:
true,
alreadyPending:
true,
shapeId:
pendingAlerts.get(
fingerprint
)?.shapeId,
message:
"already pending"
}
);
}

const requestId =
makeRequestId();

return new Promise(
resolve=>{

const timer =
setTimeout(
()=>{
waiters.delete(
requestId
);
resolve(
{
ok:
false,
message:
"Таймаут: нет окна для алерта (откройте Multichart)"
}
);
},
PLACE_TIMEOUT_MS
);

waiters.set(
requestId,
{
resolve:(
result
)=>{

if(
result?.ok &&
result?.shapeId
){
if(
fingerprint
){
pendingAlerts.set(
fingerprint,
{
symbol,
shapeId:
String(
result.shapeId
)
}
);
}
}

resolve(
result ||
{
ok:
false,
message:
"empty alert response"
}
);

},
timer
}
);

const sent =
broadcastRequest(
{
action:
"place",
requestId,
symbol,
price,
tf,
side,
fingerprint
}
);

if(
!sent
){
clearTimeout(
timer
);
waiters.delete(
requestId
);
resolve(
{
ok:
false,
message:
"Нет окна renderer для алерта"
}
);
}

}
);

}

/**
 * @param {{ symbol?: string, shapeId?: string, fingerprint?: string }} payload
 */
function removeBotAlert(
payload =
{}
){

ensureResponseHandler();

let symbol =
String(
payload?.symbol ||
""
).trim().toUpperCase();
let shapeId =
String(
payload?.shapeId ||
""
).trim();
const fingerprint =
String(
payload?.fingerprint ||
""
).trim();

if(
fingerprint &&
pendingAlerts.has(
fingerprint
)
){
const row =
pendingAlerts.get(
fingerprint
);
symbol =
row?.symbol ||
symbol;
shapeId =
row?.shapeId ||
shapeId;
}

if(
!symbol ||
!shapeId
){
if(
fingerprint
){
pendingAlerts.delete(
fingerprint
);
}

return Promise.resolve(
{
ok:
true,
skipped:
true
}
);
}

const requestId =
makeRequestId();

return new Promise(
resolve=>{

const timer =
setTimeout(
()=>{
waiters.delete(
requestId
);
if(
fingerprint
){
pendingAlerts.delete(
fingerprint
);
}
resolve(
{
ok:
true,
message:
"remove timeout — cleared locally"
}
);
},
REMOVE_TIMEOUT_MS
);

waiters.set(
requestId,
{
resolve:(
result
)=>{

if(
fingerprint
){
pendingAlerts.delete(
fingerprint
);
}

resolve(
result ||
{
ok:
true
}
);

},
timer
}
);

const sent =
broadcastRequest(
{
action:
"remove",
requestId,
symbol,
shapeId,
fingerprint
}
);

if(
!sent
){
clearTimeout(
timer
);
waiters.delete(
requestId
);
if(
fingerprint
){
pendingAlerts.delete(
fingerprint
);
}
resolve(
{
ok:
true,
skipped:
true,
message:
"no window"
}
);
}

}
);

}

function forgetPendingAlert(
fingerprint
){

const fp =
String(
fingerprint ||
""
).trim();

if(
fp
){
pendingAlerts.delete(
fp
);
}

}

async function cancelAllBotAlerts(){

const entries =
[
...pendingAlerts.entries()
];

for(
const [
fingerprint,
row
] of entries
){

await removeBotAlert(
{
fingerprint,
symbol:
row.symbol,
shapeId:
row.shapeId
}
);

}

pendingAlerts.clear();

return {
ok:
true,
count:
entries.length
};

}

/**
 * Remove every alert tagged source=algo-bot (including orphans after Quit).
 */
function clearAllAlgoBotAlerts(){

ensureResponseHandler();
pendingAlerts.clear();

const requestId =
makeRequestId();

return new Promise(
resolve=>{

const timer =
setTimeout(
()=>{
waiters.delete(
requestId
);
resolve(
{
ok:
false,
message:
"Таймаут очистки алертов бота",
removed:
0
}
);
},
PLACE_TIMEOUT_MS
);

waiters.set(
requestId,
{
resolve:(
result
)=>{
resolve(
result ||
{
ok:
false,
message:
"empty clear response"
}
);
},
timer
}
);

const sent =
broadcastRequest(
{
action:
"clearAlgoBot",
requestId
}
);

if(
!sent
){
clearTimeout(
timer
);
waiters.delete(
requestId
);
resolve(
{
ok:
true,
skipped:
true,
removed:
0,
message:
"no window"
}
);
}

}
);

}

function getPendingAlert(
fingerprint
){

return pendingAlerts.get(
String(
fingerprint ||
""
).trim()
) ||
null;

}

module.exports =
{
placeBotAlert,
removeBotAlert,
forgetPendingAlert,
cancelAllBotAlerts,
clearAllAlgoBotAlerts,
getPendingAlert
};
