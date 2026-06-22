/**
 * Auto SL/TP в USDT при открытии позиции (desktop trade).
 */
const STORAGE_KEY =
"trade_auto_stops_v1";

function normalizeUsd(
value
){

const num =
Number(
value
);

if(
!Number.isFinite(
num
) ||
num <
0
){
return 0;
}

return Math.round(
num *
100
) /
100;

}

export function getAutoStopSettings(){

try{
const raw =
localStorage.getItem(
STORAGE_KEY
);

if(
!raw
){
return {
slEnabled:
false,
tpEnabled:
false,
slUsd:
0,
tpUsd:
0
};
}

const parsed =
JSON.parse(
raw
);

return {
slEnabled:
!!parsed.slEnabled,
tpEnabled:
!!parsed.tpEnabled,
slUsd:
normalizeUsd(
parsed.slUsd
),
tpUsd:
normalizeUsd(
parsed.tpUsd
)
};
}catch{
return {
slEnabled:
false,
tpEnabled:
false,
slUsd:
0,
tpUsd:
0
};
}

}

export function saveAutoStopSettings(
settings
){

const next =
{
slEnabled:
!!settings.slEnabled,
tpEnabled:
!!settings.tpEnabled,
slUsd:
normalizeUsd(
settings.slUsd
),
tpUsd:
normalizeUsd(
settings.tpUsd
)
};

localStorage.setItem(
STORAGE_KEY,
JSON.stringify(
next
)
);

return next;

}

export function calcStopPriceFromUsd(
{
side,
entryPrice,
size,
usd,
kind
}
){

const entry =
Number(
entryPrice
);
const qty =
Number(
size
);
const lossUsd =
Number(
usd
);

if(
!Number.isFinite(
entry
) ||
entry <=
0 ||
!Number.isFinite(
qty
) ||
qty <=
0 ||
!Number.isFinite(
lossUsd
) ||
lossUsd <=
0
){
return null;
}

const isLong =
side ===
"Buy";

if(
kind ===
"sl"
){
return isLong
? entry -
lossUsd /
qty
: entry +
lossUsd /
qty;
}

return isLong
? entry +
lossUsd /
qty
: entry -
lossUsd /
qty;

}

export async function applyAutoStopsAfterEntry(
symbol,
position
){

if(
!symbol ||
!position
){
return;
}

const settings =
getAutoStopSettings();
const api =
window.cryptoTerminalDesktop?.trading;

if(
!api?.setPositionStop
){
return;
}

const side =
position.side ===
"Sell"
? "Sell"
: "Buy";
const entry =
Number(
position.avgPrice
);
const size =
Number(
position.size
);

if(
!Number.isFinite(
entry
) ||
entry <=
0 ||
!Number.isFinite(
size
) ||
size <=
0
){
return;
}

const existingSl =
Number(
position.stopLoss
) ||
0;
const existingTp =
Number(
position.takeProfit
) ||
0;

if(
settings.slEnabled &&
settings.slUsd >
0 &&
existingSl <=
0
){

const slPrice =
calcStopPriceFromUsd(
{
side,
entryPrice:
entry,
size,
usd:
settings.slUsd,
kind:
"sl"
}
);

if(
slPrice >
0
){
await api.setPositionStop(
symbol,
"sl",
slPrice
);
}

}

if(
settings.tpEnabled &&
settings.tpUsd >
0 &&
existingTp <=
0
){

const tpPrice =
calcStopPriceFromUsd(
{
side,
entryPrice:
entry,
size,
usd:
settings.tpUsd,
kind:
"tp"
}
);

if(
tpPrice >
0
){
await api.setPositionStop(
symbol,
"tp",
tpPrice
);
}

}

window.dispatchEvent(
new CustomEvent(
"trade-book-refresh"
)
);
window.dispatchEvent(
new CustomEvent(
"trade-position-updated",
{
detail:{
symbol,
position
}
}
)
);

}

const autoStopInflight =
new Set();

function normalizeAutoStopSymbol(
symbol
){

return String(
symbol ||
""
).replace(
/\.P$/i,
""
).trim().toUpperCase();

}

/**
 * Stop/limit fill и другие входы вне market-кнопок — выставить SL/TP из настроек.
 */
export function maybeApplyAutoStopsForNewPosition(
symbol,
position
){

if(
!document.body.classList.contains(
"trade-page"
)
){
return;
}

if(
!symbol ||
!position
){
return;
}

const sym =
normalizeAutoStopSymbol(
symbol
);

const size =
Number(
position.size
);

if(
!sym ||
!Number.isFinite(
size
) ||
size <=
0
){
return;
}

const settings =
getAutoStopSettings();

if(
!settings.slEnabled &&
!settings.tpEnabled
){
return;
}

const existingSl =
Number(
position.stopLoss
) ||
0;
const existingTp =
Number(
position.takeProfit
) ||
0;

const needsSl =
settings.slEnabled &&
settings.slUsd >
0 &&
existingSl <=
0;
const needsTp =
settings.tpEnabled &&
settings.tpUsd >
0 &&
existingTp <=
0;

if(
!needsSl &&
!needsTp
){
return;
}

if(
autoStopInflight.has(
sym
)
){
return;
}

autoStopInflight.add(
sym
);

void (
async()=>{

try{
await new Promise(
resolve=>{
setTimeout(
resolve,
200
);
}
);

await applyAutoStopsAfterEntry(
symbol,
position
);
}finally{
setTimeout(
()=>{
autoStopInflight.delete(
sym
);
},
3000
);
}

}
)();

}

export function wireAutoStopSettings(
form
){

const panel =
form.querySelector(
"[data-role='auto-stops-panel']"
);
const saveBtn =
form.querySelector(
"[data-role='save-auto-stops']"
);
const statusEl =
form.querySelector(
"[data-role='auto-stops-status']"
);

if(
!panel ||
!saveBtn
){
return;
}

const slEnabled =
panel.querySelector(
"[data-role='auto-sl-enabled']"
);
const tpEnabled =
panel.querySelector(
"[data-role='auto-tp-enabled']"
);
const slInput =
panel.querySelector(
"[data-role='auto-sl-usd']"
);
const tpInput =
panel.querySelector(
"[data-role='auto-tp-usd']"
);

function fillInputs(){

const settings =
getAutoStopSettings();

if(
slEnabled
){
slEnabled.checked =
settings.slEnabled;
}

if(
tpEnabled
){
tpEnabled.checked =
settings.tpEnabled;
}

if(
slInput
){
slInput.value =
settings.slUsd >
0
? String(
settings.slUsd
)
: "";
}

if(
tpInput
){
tpInput.value =
settings.tpUsd >
0
? String(
settings.tpUsd
)
: "";
}

}

function setStatus(
text,
kind =
""
){

if(
!statusEl
){
return;
}

statusEl.textContent =
text ||
"";
statusEl.classList.remove(
"is-ok",
"is-error"
);

if(
kind
){
statusEl.classList.add(
kind
);
}

}

fillInputs();

saveBtn.addEventListener(
"click",
()=>{

const next =
saveAutoStopSettings(
{
slEnabled:
!!slEnabled?.checked,
tpEnabled:
!!tpEnabled?.checked,
slUsd:
slInput?.value,
tpUsd:
tpInput?.value
}
);

fillInputs();
setStatus(
"Сохранено",
"is-ok"
);

}
);

}
