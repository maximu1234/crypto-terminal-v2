/**
 * BingX — маркеры истории сделок на графике.
 */
import {
coinsState
} from "../../terminal/terminal-state.js?v=11";

import {
EXCHANGE_CHANGED_EVENT,
getActiveExchangeId
} from "../../market-api.js?v=2";

import {
buildMarkersForCandles,
normalizeSymbol
} from "../../trade-markers-sandbox/marker-math.js?v=10";

import {
fetchTradesForSymbol
} from "../../trade-markers-sandbox/trade-fetch.js?v=19";

let showMarkers =
false;
let cachedMarkers =
[];
let cachedTradeKey =
"";
let cachedTradeData =
null;
let tradesFetchPromise =
null;
let tradesFetchGen =
0;
let markersSeq =
0;
let checkboxEl =
null;
let wired =
false;

function chartHost(){

return window.__tradeChartHost;

}

function chartContext(){

const state =
coinsState();
const symbol =
normalizeSymbol(
state.currentSymbol ||
chartHost()?.getSymbol?.() ||
""
);
const tf =
String(
state.currentTF ||
"60"
);
const candles =
Array.isArray(
state.candles
)
? state.candles
: [];

return {
symbol,
tf,
candles
};

}

function applyMarkers(){

const box =
ensureCheckbox();

if(
box
){
showMarkers =
!!box.checked;
}

const series =
chartHost()?.series;

if(
!series
){
return;
}

const markers =
showMarkers
? cachedMarkers
: [];

try{
if(
typeof series.setMarkers ===
"function"
){
series.setMarkers(
markers
);
}else if(
typeof LightweightCharts !==
"undefined" &&
typeof LightweightCharts.createSeriesMarkers ===
"function"
){
if(
series.__tradeMarkersPlugin?.detach
){
series.__tradeMarkersPlugin.detach();
}
series.__tradeMarkersPlugin =
LightweightCharts.createSeriesMarkers(
series,
markers
);
}
}catch(
err
){
console.warn(
"[trade-chart-markers]",
err?.message ||
err
);
}

}

function setSearchingVisible(
on
){

const el =
document.getElementById(
"trade-chart-markers-searching"
);

if(
!el
){
return;
}

el.hidden =
!on;

}

function clearTradeCache(){

tradesFetchGen++;
cachedTradeData =
null;
tradesFetchPromise =
null;
cachedTradeKey =
"";

}

async function ensureTrades(
symbol,
chartStartSec,
force =
false
){

const exchangeId =
getActiveExchangeId() ||
"bingx";
const key =
`${exchangeId}:${symbol}:${chartStartSec}`;

if(
cachedTradeData?.ok &&
cachedTradeKey ===
key &&
!force
){
return cachedTradeData;
}

if(
tradesFetchPromise &&
!force
){
return tradesFetchPromise;
}

const gen =
++tradesFetchGen;
const keyNow =
key;

tradesFetchPromise =
fetchTradesForSymbol(
symbol,
chartStartSec
).then(
result=>{

if(
gen !==
tradesFetchGen
){
return result;
}

cachedTradeData =
result;
cachedTradeKey =
keyNow;
tradesFetchPromise =
null;
return result;

}
);

return tradesFetchPromise;

}

async function rebuildMarkers(
opts =
{}
){

const seq =
++markersSeq;
const {
symbol,
tf,
candles
} =
chartContext();

if(
showMarkers
){
setSearchingVisible(
true
);
}

try{

if(
!symbol ||
!candles.length
){
cachedMarkers =
[];
applyMarkers();
return {
markerCount:
0,
tradeCount:
0,
message:
symbol
? "нет свечей"
: "символ не выбран"
};
}

const chartStartSec =
Number(
candles[
0
]?.time
);

const tradeData =
cachedTradeData?.ok &&
!opts.forceTrades
? cachedTradeData
: await ensureTrades(
symbol,
chartStartSec,
!!opts.forceTrades
);

if(
seq !==
markersSeq
){
return null;
}

const boxLive =
ensureCheckbox();

if(
boxLive &&
!boxLive.checked
){
showMarkers =
false;
cachedMarkers =
[];
applyMarkers();
return {
markerCount:
0,
tradeCount:
0,
message:
"выключено"
};
}

if(
!tradeData?.ok
){
cachedMarkers =
[];
applyMarkers();
const box =
ensureCheckbox();
const label =
box?.closest(
"label"
);
if(
label
){
label.title =
`История сделок — ${tradeData?.message || "ошибка"}`;
}
return {
markerCount:
0,
tradeCount:
0,
message:
tradeData?.message ||
"ошибка сделок"
};
}

cachedMarkers =
buildMarkersForCandles(
tradeData.executions ||
[],
tf,
candles
);

applyMarkers();

const box =
ensureCheckbox();
const label =
box?.closest(
"label"
);

if(
label
){
label.title =
tradeData.message
? `История сделок — ${tradeData.message}; сделок ${tradeData.trades?.length || 0}, маркеров ${cachedMarkers.length}`
: `История сделок — сделок ${tradeData.trades?.length || 0}, маркеров ${cachedMarkers.length}`;
}

return {
markerCount:
cachedMarkers.length,
tradeCount:
tradeData.trades?.length ||
0,
message:
`сделок ${tradeData.trades?.length || 0}, маркеров ${cachedMarkers.length}`
};

}finally{

if(
seq ===
markersSeq
){
setSearchingVisible(
false
);
}

}

}

export function mountTradeChartMarkersToggle(
actionsWrap,
beforeEl =
null
){

if(
!actionsWrap ||
document.getElementById(
"trade-chart-markers-toggle"
)
){
return document.getElementById(
"trade-chart-markers-show"
);
}

const label =
document.createElement(
"label"
);
label.id =
"trade-chart-markers-toggle";
label.className =
"trade-chart-markers-toggle";
label.title =
"История сделок";
label.setAttribute(
"aria-label",
"История сделок"
);
label.innerHTML =
`<span id="trade-chart-markers-searching" class="trade-chart-markers-searching" hidden>Поиск...</span><input type="checkbox" id="trade-chart-markers-show" aria-label="История сделок" />`;

const anchor =
beforeEl ||
document.getElementById(
"trade-market-entry"
) ||
document.getElementById(
"trade-volume-presets-wrap"
);

if(
anchor
){
actionsWrap.insertBefore(
label,
anchor
);
}else{
actionsWrap.appendChild(
label
);
}

checkboxEl =
label.querySelector(
"input"
);
return checkboxEl;

}

function ensureCheckbox(){

if(
checkboxEl
){
return checkboxEl;
}

checkboxEl =
document.getElementById(
"trade-chart-markers-show"
);
return checkboxEl;

}

async function onToggleChanged(){

const box =
ensureCheckbox();

if(
!box
){
return;
}

showMarkers =
!!box.checked;

if(
!showMarkers
){
markersSeq++;
clearTradeCache();
cachedMarkers =
[];
applyMarkers();
setSearchingVisible(
false
);
return;
}

clearTradeCache();
await rebuildMarkers(
{
forceTrades:
true
}
);

}

function onChartSwitchStart(){

markersSeq++;
cachedMarkers =
[];
applyMarkers();

}

function onCandlesLoaded(){

clearTradeCache();

if(
showMarkers
){
void rebuildMarkers();
}else{
applyMarkers();
}

}

function wireEvents(){

if(
wired
){
return;
}

wired =
true;

const box =
ensureCheckbox();

if(
box
){
showMarkers =
!!box.checked;
box.addEventListener(
"change",
()=>{
void onToggleChanged();
}
);
}

window.addEventListener(
"trade-chart-host-ready",
()=>{
if(
showMarkers
){
void rebuildMarkers();
}else{
applyMarkers();
}
}
);

window.addEventListener(
"chart-candles-loaded",
onCandlesLoaded
);

window.addEventListener(
"chart-switch-start",
onChartSwitchStart
);

window.addEventListener(
EXCHANGE_CHANGED_EVENT,
()=>{
clearTradeCache();
if(
showMarkers
){
void rebuildMarkers(
{
forceTrades:
true
}
);
}else{
cachedMarkers =
[];
applyMarkers();
}
}
);

}

export function initTradeChartExecutionMarkers(){

if(
!document.body.classList.contains(
"trade-page"
) ||
!document.body.classList.contains(
"terminal-page"
)
){
return;
}

if(
!ensureCheckbox()
){
const actions =
document.querySelector(
".trade-topbar-trade-actions"
);

if(
actions
){
mountTradeChartMarkersToggle(
actions
);
}
}

wireEvents();

if(
showMarkers
){
void rebuildMarkers();
}else{
applyMarkers();
}

}
