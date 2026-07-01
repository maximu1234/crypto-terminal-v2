/**
 * Модальное окно бейджа «Поделиться PnL».
 */
function tradingApi(){

return window.cryptoTerminalDesktop?.trading ||
null;

}

function inferPriceDecimals(
price
){

const num =
Number(
price
);

if(
!Number.isFinite(
num
)
){
return 2;
}

if(
num >=
100
){
return 2;
}

if(
num >=
1
){
return 4;
}

return 5;

}

function normalizeSide(
side
){

const raw =
String(
side ||
""
).toLowerCase();

if(
raw ===
"sell" ||
raw ===
"short"
){
return "short";
}

return "long";

}

function computeRoiPct(
row
){

const entry =
Number(
row?.avgPrice
);
const mark =
Number(
row?.markPrice
);
const leverage =
Number(
row?.leverage
) ||
1;

if(
!Number.isFinite(
entry
) ||
!Number.isFinite(
mark
) ||
entry ===
0
){
return 0;
}

const isLong =
normalizeSide(
row?.side
) ===
"long";
const change =
isLong
? (
mark -
entry
) /
entry
: (
entry -
mark
) /
entry;

return change *
leverage *
100;

}

function buildPayload(
row
){

const entry =
Number(
row?.avgPrice
);
const market =
Number(
row?.markPrice
);

return {
ticker:
String(
row?.ticker ||
row?.symbol ||
""
).toUpperCase(),
side:
normalizeSide(
row?.side
),
leverage:
Math.max(
1,
Number(
row?.leverage
) ||
1
),
roiPct:
computeRoiPct(
row
),
entryPrice:
entry,
marketPrice:
market,
priceDecimals:
inferPriceDecimals(
entry
)
};

}

function sideLabelRu(
side
){

return normalizeSide(
side
) ===
"short"
? "Шорт"
: "Лонг";

}

function formatShareFileStamp(
date =
new Date()
){

const day =
date.toLocaleDateString(
"ru-RU",
{
day:
"2-digit",
month:
"2-digit",
year:
"numeric"
}
);
const time =
date
.toLocaleTimeString(
"ru-RU",
{
hour:
"2-digit",
minute:
"2-digit",
second:
"2-digit",
hour12:
false
}
)
.replace(
/:/g,
"-"
);

return `${day} ${time}`;

}

function defaultFileName(
row
){

const ticker =
String(
row?.ticker ||
row?.symbol ||
"POSITION"
).toUpperCase();
const side =
sideLabelRu(
row?.side
);
const stamp =
formatShareFileStamp();

return `Share ${ticker} ${side} ${stamp}.png`;

}

function waitForImage(
dataUrl
){

return new Promise(
(
resolve,
reject
)=>{

const img =
new Image();
img.onload =
()=>{
resolve(
img
);
};
img.onerror =
()=>{
reject(
new Error(
"Не удалось загрузить превью бейджа"
)
);
};
img.src =
dataUrl;

}
);

}

function mountOverlay(
el
){

if(
!el.isConnected
){
document.body.appendChild(
el
);
}

el.hidden =
false;

}

function hideOverlay(
el
){

if(
!el
){
return;
}

el.hidden =
true;

}

let overlayEl =
null;
let tempPath =
null;
let busy =
false;

function removeOverlay(){

if(
overlayEl
){
overlayEl.remove();
overlayEl =
null;
}

}

async function cleanupTemp(){

const pathToDrop =
tempPath;
tempPath =
null;

if(
!pathToDrop
){
return;
}

const api =
tradingApi();

if(
!api?.discardPnlShareCard
){
return;
}

try{
await api.discardPnlShareCard(
pathToDrop
);
}catch{
/* ignore */
}

}

async function closeModal(){

hideOverlay(
overlayEl
);
await cleanupTemp();
busy =
false;

}

function onPageHide(){

void cleanupTemp();

}

if(
typeof window !==
"undefined"
){
window.addEventListener(
"pagehide",
onPageHide
);
}

function ensureOverlay(){

if(
overlayEl
){
return overlayEl;
}

const el =
document.createElement(
"div"
);
el.className =
"trade-pnl-share-overlay";
el.innerHTML =
`
<div class="trade-pnl-share-dialog" role="dialog" aria-modal="true" aria-label="Поделиться PnL">
<button type="button" class="trade-pnl-share-close" data-action="close" aria-label="Закрыть">×</button>
<div class="trade-pnl-share-preview-wrap">
<img class="trade-pnl-share-preview" data-role="preview" alt="Бейдж Поделиться PnL">
</div>
<p class="trade-pnl-share-status" data-role="status" hidden></p>
<div class="trade-pnl-share-actions">
<button type="button" class="trade-pnl-share-save" data-action="save">Сохранить</button>
</div>
</div>
`;

el.addEventListener(
"click",
event=>{

if(
event.target ===
el
){
void closeModal();
}

}
);

el.querySelector(
'[data-action="close"]'
)?.addEventListener(
"click",
()=>{
void closeModal();
}
);

el.querySelector(
'[data-action="save"]'
)?.addEventListener(
"click",
async()=>{

if(
busy ||
!tempPath
){
return;
}

const api =
tradingApi();
const saveBtn =
el.querySelector(
'[data-action="save"]'
);
const statusEl =
el.querySelector(
'[data-role="status"]'
);

if(
!api?.savePnlShareCard
){
if(
statusEl
){
statusEl.hidden =
false;
statusEl.textContent =
"Сохранение доступно только в desktop .app";
}
return;
}

busy =
true;

if(
saveBtn
){
saveBtn.disabled =
true;
}

try{

const result =
await api.savePnlShareCard(
{
tempPath,
defaultName:
el.dataset.defaultName ||
"pnl-share.png"
}
);

if(
result?.canceled
){
return;
}

if(
!result?.ok
){
if(
statusEl
){
statusEl.hidden =
false;
statusEl.textContent =
result?.error ||
"Не удалось сохранить";
}
return;
}

await closeModal();

}catch(
err
){

if(
statusEl
){
statusEl.hidden =
false;
statusEl.textContent =
String(
err?.message ||
err
);
}

}finally{

busy =
false;

if(
saveBtn
){
saveBtn.disabled =
false;
}

}

}
);

document.body.appendChild(
el
);
el.hidden =
true;
overlayEl =
el;
return el;

}

export async function openPnlShareModal(
row
){

const api =
tradingApi();

if(
!api?.generatePnlShareCard
){
window.alert(
"Бейдж Поделиться PnL доступен только в desktop .app"
);
return;
}

if(
busy
){
return;
}

busy =
true;

try{

await cleanupTemp();

const payload =
buildPayload(
row
);
const result =
await api.generatePnlShareCard(
payload
);

if(
!result?.ok ||
!result?.dataUrl
){
throw new Error(
result?.error ||
"Не удалось сгенерировать бейдж"
);
}

tempPath =
result.tempPath ||
null;

await waitForImage(
result.dataUrl
);

const overlay =
ensureOverlay();
const preview =
overlay.querySelector(
'[data-role="preview"]'
);
const statusEl =
overlay.querySelector(
'[data-role="status"]'
);
const saveBtn =
overlay.querySelector(
'[data-action="save"]'
);

overlay.dataset.defaultName =
defaultFileName(
row
);

if(
preview
){
preview.src =
result.dataUrl;
}

if(
statusEl
){
statusEl.hidden =
true;
statusEl.textContent =
"";
}

if(
saveBtn
){
saveBtn.disabled =
false;
}

mountOverlay(
overlay
);

}catch(
err
){

const overlay =
overlayEl ||
ensureOverlay();
const statusEl =
overlay.querySelector(
'[data-role="status"]'
);
const preview =
overlay.querySelector(
'[data-role="preview"]'
);
const saveBtn =
overlay.querySelector(
'[data-action="save"]'
);

if(
preview
){
preview.removeAttribute(
"src"
);
}

if(
statusEl
){
statusEl.hidden =
false;
statusEl.textContent =
String(
err?.message ||
err
);
}

if(
saveBtn
){
saveBtn.disabled =
true;
}

mountOverlay(
overlay
);

await cleanupTemp();

}finally{

busy =
false;

}

}
