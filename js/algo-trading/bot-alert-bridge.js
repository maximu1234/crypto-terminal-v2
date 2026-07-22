/**
 * Renderer: fulfill main-process bot alert place/remove via Terminal price alerts.
 * Mount on desktop pages so background bot can create alerts without algo page.
 *
 * Cloud reconcile/upsert often rebuilds rows without `source` — keep a local
 * shapeId set and re-tag after registry pulls so the Algo book panel stays filled.
 */
import {
createPriceAlert,
removeAlert,
loadAllAlerts,
saveAlerts,
dispatchPriceAlertsChanged
} from "../alerts.js?v=104";

export const ALGO_BOT_ALERT_SOURCE =
"algo-bot";

const KNOWN_BOT_ALERT_IDS_KEY =
"algo_bot_alert_shape_ids_v1";

let mounted =
false;

function desktopAlgoApi(){

return window.cryptoTerminalDesktop?.algoTrading ||
null;

}

function loadKnownBotAlertShapeIds(){

try{
const raw =
JSON.parse(
localStorage.getItem(
KNOWN_BOT_ALERT_IDS_KEY
) ||
"[]"
);

if(
!Array.isArray(
raw
)
){
return new Set();
}

return new Set(
raw.map(
id=>
String(
id ||
""
).trim()
).filter(
Boolean
)
);
}catch{
return new Set();
}

}

function saveKnownBotAlertShapeIds(
ids
){

try{
localStorage.setItem(
KNOWN_BOT_ALERT_IDS_KEY,
JSON.stringify(
[
...ids
]
)
);
}catch{
/* ignore */
}

}

export function rememberBotAlertShapeId(
shapeId
){

const sid =
String(
shapeId ||
""
).trim();

if(
!sid
){
return;
}

const ids =
loadKnownBotAlertShapeIds();
ids.add(
sid
);
saveKnownBotAlertShapeIds(
ids
);

}

function forgetBotAlertShapeId(
shapeId
){

const sid =
String(
shapeId ||
""
).trim();

if(
!sid
){
return;
}

const ids =
loadKnownBotAlertShapeIds();
ids.delete(
sid
);
saveKnownBotAlertShapeIds(
ids
);

}

function clearKnownBotAlertShapeIds(){

saveKnownBotAlertShapeIds(
new Set()
);

}

export function isAlgoBotAlertRow(
alert
){

if(
!alert
){
return false;
}

if(
alert.source ===
ALGO_BOT_ALERT_SOURCE
){
return true;
}

const sid =
String(
alert.shapeId ||
alert.id ||
""
).trim();

return (
!!sid &&
loadKnownBotAlertShapeIds().has(
sid
)
);

}

/**
 * Re-apply source=algo-bot on known shapeIds (after cloud merge strips it).
 * @returns {number} tagged count
 */
export function retagKnownAlgoBotAlerts(){

const ids =
loadKnownBotAlertShapeIds();

if(
!ids.size
){
return 0;
}

const list =
loadAllAlerts();
let tagged =
0;

const next =
list.map(
alert=>{

const sid =
String(
alert?.shapeId ||
alert?.id ||
""
).trim();

if(
!sid ||
!ids.has(
sid
)
){
return alert;
}

if(
alert.source ===
ALGO_BOT_ALERT_SOURCE
){
return alert;
}

tagged +=
1;

return {
...alert,
source:
ALGO_BOT_ALERT_SOURCE
};

}
);

if(
tagged >
0
){
saveAlerts(
next
);
window.dispatchEvent(
new CustomEvent(
"price-alerts-changed"
)
);
dispatchPriceAlertsChanged();
}

return tagged;

}

function markAlertAsAlgoBot(
shapeId
){

const sid =
String(
shapeId ||
""
).trim();

if(
!sid
){
return;
}

rememberBotAlertShapeId(
sid
);

const list =
loadAllAlerts().map(
alert=>{

if(
String(
alert?.shapeId ||
""
) ===
sid
){
return {
...alert,
source:
ALGO_BOT_ALERT_SOURCE
};
}

return alert;

}
);

saveAlerts(
list
);

}

function clearAlgoBotAlerts(){

const list =
loadAllAlerts();
const botAlerts =
list.filter(
alert=>
isAlgoBotAlertRow(
alert
)
);
let removed =
0;

for(
const alert of botAlerts
){

removeAlert(
alert.symbol,
alert.shapeId
);
forgetBotAlertShapeId(
alert.shapeId
);
removed +=
1;

}

clearKnownBotAlertShapeIds();

if(
removed >
0
){
window.dispatchEvent(
new CustomEvent(
"price-alerts-changed"
)
);
dispatchPriceAlertsChanged();
}

return removed;

}

/**
 * @returns {() => void} unmount
 */
export function mountAlgoBotAlertBridge(){

if(
mounted
){
return ()=>{};
}

const api =
desktopAlgoApi();

if(
!api?.onBotAlertRequest ||
!api?.respondBotAlert
){
return ()=>{};
}

mounted =
true;

const onRegistryPulled =
()=>{
retagKnownAlgoBotAlerts();
};

window.addEventListener(
"alerts-registry-pulled",
onRegistryPulled
);
window.addEventListener(
"alerts-changed",
onRegistryPulled
);

const unsub =
api.onBotAlertRequest(
async payload=>{

const requestId =
String(
payload?.requestId ||
""
).trim();
const action =
String(
payload?.action ||
""
).trim();

if(
!requestId
){
return;
}

try{
if(
action ===
"place"
){
const row =
await createPriceAlert(
payload?.symbol,
payload?.price,
payload?.tf,
{
source:
ALGO_BOT_ALERT_SOURCE
}
);

if(
!row?.shapeId
){
api.respondBotAlert(
{
requestId,
ok:
false,
message:
"Не удалось создать алерт (нужен вход и Telegram Chat ID)"
}
);
return;
}

markAlertAsAlgoBot(
row.shapeId
);
retagKnownAlgoBotAlerts();

window.dispatchEvent(
new CustomEvent(
"price-alerts-changed"
)
);

api.respondBotAlert(
{
requestId,
ok:
true,
shapeId:
row.shapeId,
symbol:
row.symbol,
price:
row.price
}
);
return;
}

if(
action ===
"remove"
){
forgetBotAlertShapeId(
payload?.shapeId
);
removeAlert(
payload?.symbol,
payload?.shapeId
);
window.dispatchEvent(
new CustomEvent(
"price-alerts-changed"
)
);
api.respondBotAlert(
{
requestId,
ok:
true
}
);
return;
}

if(
action ===
"clearAlgoBot"
){
const removed =
clearAlgoBotAlerts();
api.respondBotAlert(
{
requestId,
ok:
true,
removed
}
);
return;
}

api.respondBotAlert(
{
requestId,
ok:
false,
message:
`unknown action: ${action}`
}
);
}catch(
err
){
api.respondBotAlert(
{
requestId,
ok:
false,
message:
err?.message ||
String(
err
)
}
);
}

}
);

return ()=>{
mounted =
false;
window.removeEventListener(
"alerts-registry-pulled",
onRegistryPulled
);
window.removeEventListener(
"alerts-changed",
onRegistryPulled
);
unsub?.();
};

}
