/**
 * Renderer: fulfill main-process bot alert place/remove via Terminal price alerts.
 * Mount on desktop pages so background bot can create alerts without algo page.
 */
import {
createPriceAlert,
removeAlert,
loadAllAlerts,
saveAlerts,
dispatchPriceAlertsChanged
} from "../alerts.js?v=102";

export const ALGO_BOT_ALERT_SOURCE =
"algo-bot";

let mounted =
false;

function desktopAlgoApi(){

return window.cryptoTerminalDesktop?.algoTrading ||
null;

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
alert?.source ===
ALGO_BOT_ALERT_SOURCE
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
removed +=
1;

}

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
payload?.tf
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
unsub?.();
};

}
