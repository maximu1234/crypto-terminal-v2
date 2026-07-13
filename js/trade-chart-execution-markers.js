/**
 * Desktop terminal: маркеры истории сделок на основном графике.
 */
import {
coinsState
} from "./terminal/terminal-state.js?v=10";

import {
buildMarkersForCandles,
normalizeSymbol
} from "./trade-markers-sandbox/marker-math.js?v=8";

import {
fetchTradesForSymbol
} from "./trade-markers-sandbox/trade-fetch.js?v=9";

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
let markersSeq =
0;
let toggleBusy =
false;
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

const series =
chartHost()?.series;

if(
!series
){
return;
}

try{
series.setMarkers(
showMarkers
? cachedMarkers
: []
);
}catch{
/* ignore */
}

}

function clearTradeCache(){

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

const key =
`${symbol}:${chartStartSec}`;

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

tradesFetchPromise =
fetchTradesForSymbol(
symbol,
chartStartSec
).then(
result=>{

cachedTradeData =
result;
cachedTradeKey =
key;
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

if(
!tradeData?.ok
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

return {
markerCount:
cachedMarkers.length,
tradeCount:
tradeData.trades?.length ||
0,
message:
`сделок ${tradeData.trades?.length || 0}, маркеров ${cachedMarkers.length}`
};

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
label.innerHTML =
`<input type="checkbox" id="trade-chart-markers-show" aria-label="История сделок" />`;

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
!box ||
toggleBusy
){
return;
}

toggleBusy =
true;
showMarkers =
!!box.checked;

try{

if(
!showMarkers
){
cachedMarkers =
[];
applyMarkers();
return;
}

clearTradeCache();
await rebuildMarkers(
{
forceTrades:
true
}
);

}finally{
toggleBusy =
false;
}

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
