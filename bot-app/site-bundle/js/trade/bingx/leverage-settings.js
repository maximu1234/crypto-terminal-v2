/**
 * BingX — плечо и margin mode (Cross / Isolated).
 */
function tradingApi(){

return window.cryptoTerminalDesktop?.trading;

}

function normalizeSymbol(
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

function marginShort(
mode
){

return String(
mode ||
""
).toLowerCase() ===
"isolated"
? "IS"
: "CR";

}

function marginLabel(
mode
){

return String(
mode ||
""
).toLowerCase() ===
"isolated"
? "Isolated"
: "Cross";

}

function formatTriggerLabel(
leverage,
marginMode
){

const lev =
Math.max(
1,
Math.round(
Number(
leverage
) ||
1
)
);

return `${lev}x ${marginShort(
marginMode
)}`;

}

function bindDropdown(
wrap,
btn,
dropdown,
onOpen
){

function setOpen(
open
){

dropdown.classList.toggle(
"hidden",
!open
);
btn.setAttribute(
"aria-expanded",
open
? "true"
: "false"
);

if(
open &&
typeof onOpen ===
"function"
){
void onOpen();
}

}

btn.addEventListener(
"click",
event=>{
event.stopPropagation();
setOpen(
dropdown.classList.contains(
"hidden"
)
);
}
);

dropdown.addEventListener(
"click",
event=>{
event.stopPropagation();
}
);

document.addEventListener(
"click",
()=>{
setOpen(
false
);
}
);

return {
close:()=>
setOpen(
false
)
};

}

export function mountTradeLeverageControl(
mountEl,
{
getSymbol
}
){

const wrap =
document.createElement(
"div"
);
wrap.className =
"trade-leverage-wrap";

wrap.innerHTML =
`
<button type="button" class="trade-leverage-btn" aria-expanded="false" aria-haspopup="dialog" title="Плечо и тип маржи">
<span class="trade-leverage-btn-label" data-role="leverage-label">10x CR</span>
</button>
<div class="trade-leverage-dropdown hidden" role="dialog" aria-label="Плечо и маржа">
<div class="trade-leverage-panel">
<p class="trade-leverage-section-kicker">Margin mode</p>
<p class="trade-leverage-hint">Применяется к выбранной паре</p>
<div class="trade-leverage-mode-row">
<label class="trade-leverage-mode-opt">
<input type="radio" name="trade-margin-mode" value="cross" checked>
<span>Cross</span>
</label>
<label class="trade-leverage-mode-opt">
<input type="radio" name="trade-margin-mode" value="isolated">
<span>Isolated</span>
</label>
</div>
<p class="trade-leverage-section-kicker">Leverage</p>
<label class="trade-leverage-field">
<input type="number" min="1" step="1" inputmode="numeric" data-role="leverage-input" aria-label="Плечо">
<span class="trade-leverage-field-suffix">x</span>
</label>
<p class="trade-leverage-max" data-role="leverage-max" hidden></p>
<p class="trade-leverage-note">Смена плеча затрагивает открытые позиции и ордера по символу.</p>
<button type="button" class="trade-leverage-confirm" data-role="leverage-confirm">Confirm</button>
<p class="trade-leverage-status" data-role="leverage-status" hidden></p>
</div>
</div>
`;

mountEl.appendChild(
wrap
);

const btn =
wrap.querySelector(
".trade-leverage-btn"
);
const dropdown =
wrap.querySelector(
".trade-leverage-dropdown"
);
const labelEl =
wrap.querySelector(
'[data-role="leverage-label"]'
);
const inputEl =
wrap.querySelector(
'[data-role="leverage-input"]'
);
const maxEl =
wrap.querySelector(
'[data-role="leverage-max"]'
);
const statusEl =
wrap.querySelector(
'[data-role="leverage-status"]'
);
const confirmBtn =
wrap.querySelector(
'[data-role="leverage-confirm"]'
);
const modeInputs =
wrap.querySelectorAll(
'input[name="trade-margin-mode"]'
);

btn?.addEventListener(
"mousedown",
event=>{
if(
event.button ===
0
){
event.preventDefault();
}
},
true
);

btn?.addEventListener(
"keydown",
event=>{
if(
event.code === "Space" ||
event.code === "Enter"
){
event.preventDefault();
}
},
true
);

btn?.addEventListener(
"click",
()=>{
queueMicrotask(
()=>{
btn.blur();
}
);
},
true
);

let currentSymbol =
"";
let loaded =
{
leverage:
10,
marginMode:
"cross",
maxLeverage:
100
};
let loadToken =
0;

function setStatus(
text,
isError =
false
){

if(
!text
){
statusEl.hidden =
true;
statusEl.textContent =
"";
statusEl.classList.remove(
"is-error"
);
return;
}

statusEl.hidden =
false;
statusEl.textContent =
text;
statusEl.classList.toggle(
"is-error",
isError
);

}

function syncPanelFromLoaded(){

modeInputs.forEach(
input=>{
input.checked =
input.value ===
loaded.marginMode;
}
);

inputEl.min =
String(
1
);
inputEl.max =
String(
loaded.maxLeverage ||
100
);
inputEl.value =
String(
loaded.leverage ||
10
);

if(
maxEl
){
maxEl.hidden =
false;
maxEl.textContent =
`Макс. плечо: ${loaded.maxLeverage || 100}x`;
}

labelEl.textContent =
formatTriggerLabel(
loaded.leverage,
loaded.marginMode
);
btn.title =
`Leverage: ${loaded.leverage}x\nMargin mode: ${marginLabel(
loaded.marginMode
)}`;

}

async function loadForSymbol(
symbol
){

const sym =
normalizeSymbol(
symbol
);
const token =
++loadToken;

if(
!sym
){
return;
}

currentSymbol =
sym;
setStatus(
""
);

const api =
tradingApi();

if(
!api?.getSymbolPositionSettings
){
setStatus(
"Только desktop",
true
);
return;
}

try{
const result =
await api.getSymbolPositionSettings(
sym
);

if(
token !==
loadToken
){
return;
}

if(
result?.ok ===
false
){
setStatus(
result.message ||
"Не удалось загрузить",
true
);
return;
}

loaded = {
leverage:
result.leverage ||
10,
marginMode:
result.marginMode ||
"cross",
maxLeverage:
result.maxLeverage ||
100
};
syncPanelFromLoaded();
}catch(
err
){
if(
token !==
loadToken
){
return;
}

setStatus(
err?.message ||
"Ошибка загрузки",
true
);

}

}

const dropdownCtl =
bindDropdown(
wrap,
btn,
dropdown,
()=>{
void loadForSymbol(
getSymbol?.() ||
currentSymbol
);
}
);

confirmBtn.addEventListener(
"click",
async()=>{

const api =
tradingApi();

if(
!api?.applySymbolPositionSettings
){
setStatus(
"Только desktop",
true
);
return;
}

const sym =
normalizeSymbol(
getSymbol?.() ||
currentSymbol
);

if(
!sym
){
setStatus(
"Символ не выбран",
true
);
return;
}

const marginMode =
wrap.querySelector(
'input[name="trade-margin-mode"]:checked'
)?.value ||
"cross";
const leverage =
Math.round(
Number(
inputEl.value
)
);

if(
!Number.isFinite(
leverage
) ||
leverage <
1
){
setStatus(
"Некорректное плечо",
true
);
return;
}

confirmBtn.disabled =
true;
setStatus(
""
);

try{
const result =
await api.applySymbolPositionSettings(
sym,
{
leverage,
marginMode
}
);

if(
result?.ok ===
false
){
setStatus(
result.message ||
"BingX отклонил запрос",
true
);
return;
}

loaded = {
...loaded,
leverage:
Math.min(
leverage,
loaded.maxLeverage ||
100
),
marginMode
};
syncPanelFromLoaded();
dropdownCtl.close();
setStatus(
""
);

window.dispatchEvent(
new CustomEvent(
"trade-leverage-changed",
{
detail:{
symbol:
sym,
leverage:
loaded.leverage,
marginMode:
loaded.marginMode
}
}
)
);
}catch(
err
){
setStatus(
err?.message ||
"Ошибка",
true
);
}finally{
confirmBtn.disabled =
false;
}

}
);

inputEl.addEventListener(
"keydown",
event=>{

if(
event.key ===
"Enter"
){
event.preventDefault();
confirmBtn.click();
}

}
);

void loadForSymbol(
getSymbol?.() ||
""
);

const onCandlesLoaded =
event=>{

const sym =
normalizeSymbol(
event.detail?.symbol
);
const active =
normalizeSymbol(
getSymbol?.()
);

if(
!sym ||
!active ||
sym !==
active
){
return;
}

void loadForSymbol(
sym
);

};

window.addEventListener(
"chart-candles-loaded",
onCandlesLoaded
);

return {
wrap,
refresh:(
symbol
)=>
loadForSymbol(
symbol
),
getSettings:()=>({
...loaded
}),
destroy:()=>{
window.removeEventListener(
"chart-candles-loaded",
onCandlesLoaded
);
}
};

}

export function initTradeLeverageSettings(){

if(
!document.body.classList.contains(
"trade-page"
)
){
return null;
}

const topbar =
document.getElementById(
"topbar"
);

if(
!topbar ||
document.getElementById(
"trade-leverage-wrap"
)
){
return null;
}

const volumeWrap =
document.getElementById(
"trade-volume-presets-wrap"
);

const ctl =
mountTradeLeverageControl(
topbar,
{
getSymbol:()=>
normalizeSymbol(
document.getElementById(
"current-symbol"
)?.textContent
)
}
);

ctl.wrap.id =
"trade-leverage-wrap";

if(
volumeWrap?.nextSibling
){
topbar.insertBefore(
ctl.wrap,
volumeWrap.nextSibling
);
}else if(
volumeWrap
){
topbar.appendChild(
ctl.wrap
);
}else{
topbar.appendChild(
ctl.wrap
);
}

const symEl =
document.getElementById(
"current-symbol"
);

if(
symEl?.textContent
){
void ctl.refresh(
symEl.textContent
);
}

window.addEventListener(
"chart-candles-loaded",
event=>{

const sym =
event.detail?.symbol;

if(
sym
){
void ctl.refresh(
sym
);
}

}
);

return ctl;

}
