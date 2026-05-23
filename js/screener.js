import {
loadBybitHistory,
loadBybitSymbols
} from "./api.js?v=14";

import {
createScreenerChart,
applyChartPriceFormat,
applyScreenerZoom,
restoreScreenerViewport,
SCREENER_VISIBLE_BARS,
SCREENER_MAX_BARS
} from "./chart.js?v=19";

import {
subscribeKline
} from "./ws.js?v=13";

import {
connectTickerStream,
fetchTickersInto
} from "./tickers.js?v=20";

import {
saveScreenerState,
loadScreenerState,
loadFavorites,
saveFavorites
} from "./storage.js?v=11";

import {
ensureCloudReady
} from "./auth-ui.js?v=1";

import {
persistFavoritesToCloud,
onFavoritesRemoteUpdate
} from "./cloud-sync.js?v=5";

const gridEl =
document.getElementById("screener-grid");

const paginationEl =
document.getElementById("pagination");

const statusEl =
document.getElementById("screener-status");

let favorites =
loadFavorites();

function isFavoriteSymbol(symbol){

return favorites.includes(symbol);

}

function updateWidgetFavoriteUi(
root,
symbol
){

const flagEl =
root?.querySelector(
".screener-flag"
);

if(!flagEl){
return;
}

const on =
isFavoriteSymbol(symbol);

flagEl.classList.toggle(
"favorite",
on
);

flagEl.setAttribute(
"aria-pressed",
on
? "true"
: "false"
);

flagEl.title =
on
? "Убрать из избранного"
: "В избранное";

}

function syncFavoriteFlagsForSymbol(symbol){

activeWidgets.forEach(widget=>{

if(widget.symbol === symbol){
updateWidgetFavoriteUi(
widget.root,
symbol
);
}

});

}

function toggleFavoriteSymbol(
symbol,
e
){

if(e){
e.stopPropagation();
e.preventDefault();
}

if(!symbol){
return;
}

if(
favorites.includes(symbol)
){

favorites =
favorites.filter(
s=>s !== symbol
);

}else{

favorites.push(symbol);

}

saveFavorites(favorites);
persistFavoritesToCloud(favorites);
syncFavoriteFlagsForSymbol(symbol);

}

const saved =
loadScreenerState();

let layout =
Number(saved.layout) || 9;

let sortMode =
saved.sort === "symbol" ? "symbol" : "change24";

let currentTF =
saved.tf || "15";

let currentPage =
Number(saved.page) || 1;

let allSymbols = [];
const tickerMap = new Map();
let activeWidgets = [];
let renderToken = 0;

function persistState(){

saveScreenerState({
layout,
sort:sortMode,
tf:currentTF,
page:currentPage
});

}

function pageSize(){
return layout;
}

function getSortedSymbols(){

const list = [...allSymbols];

if(sortMode === "symbol"){

list.sort((a, b)=>a.localeCompare(b));

}else{

list.sort((a, b)=>{

const ca =
tickerMap.get(a)?.change24 ?? 0;

const cb =
tickerMap.get(b)?.change24 ?? 0;

return cb - ca;

});

}

return list;

}

function totalPages(){

const size =
pageSize();

if(!allSymbols.length || !size){
return 1;
}

return Math.max(
1,
Math.ceil(allSymbols.length / size)
);

}

function clampPage(){

const max =
totalPages();

if(currentPage > max){
currentPage = max;
}

if(currentPage < 1){
currentPage = 1;
}

}

function symbolsForPage(){

clampPage();

const sorted =
getSortedSymbols();

const start =
(currentPage - 1) * pageSize();

return sorted.slice(
start,
start + pageSize()
);

}

function updateBarsHint(widget, loadedCount, visibleSpan){

const barsEl =
widget.root?.querySelector(".screener-bars-hint");

if(!barsEl){
return;
}

const inFrame =
Math.min(SCREENER_VISIBLE_BARS, loadedCount);

const shown =
visibleSpan > 0
? visibleSpan
: inFrame;

const scrollable =
Math.max(0, loadedCount - inFrame);

barsEl.textContent =
`${loadedCount} · кадр ${shown}`;

barsEl.title =
scrollable > 0
? `В серии ${loadedCount} свечей, в кадре ~${shown}. Прокрутите влево — ещё ~${scrollable} старых.`
: `В серии ${loadedCount} свечей, в кадре ~${shown}.`;

}

function formatVolume(value){

if(!Number.isFinite(value) || value <= 0){
return "—";
}

if(value >= 1e9){
return `$${(value / 1e9).toFixed(1)} млрд`;
}

if(value >= 1e6){
return `$${(value / 1e6).toFixed(1)} млн`;
}

if(value >= 1e3){
return `$${(value / 1e3).toFixed(1)} тыс`;
}

return `$${value.toFixed(0)}`;

}

function setStatus(text, visible){

if(!statusEl){
return;
}

statusEl.textContent = text;

statusEl.classList.toggle(
"hidden",
!visible
);

}

function mergeLiveCandle(candles, candle, maxLen){

if(!candles.length){
return false;
}

const last =
candles[candles.length - 1];

if(candle.time === last.time){

candles[candles.length - 1] = candle;

return true;

}

if(candle.time > last.time){

candles.push(candle);

if(
maxLen &&
candles.length > maxLen
){
candles.shift();
}

return true;

}

return false;

}

function destroyWidgets(){

activeWidgets.forEach(w=>{

w.unsubKline?.();

if(w.resizeObserver){
w.resizeObserver.disconnect();
}

if(w.chart){
w.chart.remove();
}

w.root?.remove();

});

activeWidgets = [];
gridEl.innerHTML = "";

}

function updateWidgetMeta(symbol, root){

const tick =
tickerMap.get(symbol);

const volEl =
root.querySelector(".screener-volume");

const chEl =
root.querySelector(".screener-change");

if(!tick){
return;
}

if(volEl){
volEl.textContent =
`Объём 24ч ${formatVolume(tick.volume24)}`;
}

if(chEl){

const ch =
tick.change24 ?? 0;

chEl.textContent =
`${ch >= 0 ? "+" : ""}${ch.toFixed(2)}%`;

chEl.className =
`screener-change ${ch >= 0 ? "positive" : "negative"}`;

}

}

function openTerminal(symbol, e){

if(e){
e.stopPropagation();
}

window.location.href =
`coins.html?symbol=${encodeURIComponent(symbol)}&tf=${encodeURIComponent(currentTF)}`;

}

async function loadWidgetChart(widget){

const {
symbol,
chart,
series,
chartEl,
loadId
} = widget;

chartEl.classList.add("loading");

try{

const candles =
await loadBybitHistory(
symbol,
currentTF,
2,
{ parallel: true }
);

if(loadId !== renderToken){
return;
}

if(!candles.length){
return;
}

const loaded =
candles.length > SCREENER_MAX_BARS
? candles.slice(-SCREENER_MAX_BARS)
: candles;

widget.candles = loaded;
widget.userAdjustedZoom = false;

applyChartPriceFormat(
series,
loaded[loaded.length - 1].close
);

const runZoom = ()=>{

const span =
widget.syncChartSize?.() ?? 0;

updateBarsHint(widget, loaded.length, span);

};

runZoom();
requestAnimationFrame(runZoom);
setTimeout(runZoom, 50);
setTimeout(runZoom, 200);
setTimeout(runZoom, 500);

widget.unsubKline?.();

widget.unsubKline =
subscribeKline(
symbol,
currentTF,
candle=>{

if(loadId !== renderToken){
return;
}

const prevLast =
widget.candles[widget.candles.length - 1];

const isNewBar =
prevLast &&
candle.time > prevLast.time;

if(
!mergeLiveCandle(
widget.candles,
candle,
SCREENER_MAX_BARS
)
){
return;
}

if(
isNewBar &&
widget.candles.length > SCREENER_MAX_BARS &&
!widget.userAdjustedZoom
){

widget.candles =
widget.candles.slice(-SCREENER_MAX_BARS);

series.setData(widget.candles);

}else{

series.update(candle);

}

applyChartPriceFormat(
series,
candle.close
);

if(
!widget.userAdjustedZoom &&
isNewBar
){

const total =
widget.candles.length;

const visible =
Math.min(SCREENER_VISIBLE_BARS, total);

restoreScreenerViewport(
chart,
chartEl.clientWidth,
visible,
total
);

}

}
);

}catch(err){

console.error("Screener chart:", symbol, err);

}finally{

if(loadId === renderToken){
chartEl.classList.remove("loading");
}

}

}

function createWidget(symbol, loadId){

const root =
document.createElement("article");

root.className = "screener-widget";

root.innerHTML = `

<div class="screener-widget-header">

<div class="screener-header-left">

<button
type="button"
class="flag screener-flag"
title="В избранное"
aria-pressed="false"
></button>

<div class="screener-symbol">${symbol}</div>

</div>

<div class="screener-meta">

<span class="screener-volume">Объём 24ч —</span>

<span class="screener-change">—</span>

<span class="screener-bars-hint" title="загружено · в кадре"></span>

</div>

<button class="screener-open" type="button" title="Открыть в Монетах">↗</button>

</div>

<div class="screener-chart"></div>

`;

root.querySelector(".screener-flag").onclick = e=>{
toggleFavoriteSymbol(symbol, e);
};

root.querySelector(".screener-open").onclick = e=>{
openTerminal(symbol, e);
};

updateWidgetFavoriteUi(
root,
symbol
);

const chartEl =
root.querySelector(".screener-chart");

const {
chart,
series
} =
createScreenerChart(chartEl);

const widget = {
symbol,
root,
chart,
series,
chartEl,
loadId,
candles: [],
userAdjustedZoom:false
};

function markUserZoom(){

widget.userAdjustedZoom = true;

}

chartEl.addEventListener("wheel", markUserZoom, { passive:true });
chartEl.addEventListener("mousedown", markUserZoom);
chartEl.addEventListener("touchstart", markUserZoom, { passive:true });

function syncChartSize(){

const w =
chartEl.clientWidth;

const h =
chartEl.clientHeight;

if(w < 2 || h < 2){
return 0;
}

chart.applyOptions({ width: w, height: h });

if(!widget.candles.length){
return 0;
}

if(widget.userAdjustedZoom){

const range =
chart.timeScale().getVisibleLogicalRange();

if(!range){
return 0;
}

return Math.max(
0,
Math.round(range.to - range.from)
);

}

return applyScreenerZoom(
chart,
series,
widget.candles,
w,
h
);

}

const resizeObserver =
new ResizeObserver(syncChartSize);

resizeObserver.observe(chartEl);
widget.resizeObserver = resizeObserver;
widget.syncChartSize = syncChartSize;

requestAnimationFrame(syncChartSize);

updateWidgetMeta(symbol, root);

return widget;

}

function renderPagination(){

clampPage();

const total =
totalPages();

paginationEl.innerHTML = "";

const prev =
document.createElement("button");

prev.className = "page-btn";
prev.textContent = "‹";
prev.disabled = currentPage <= 1;
prev.onclick = ()=>{
currentPage--;
persistState();
renderPage();
};

paginationEl.appendChild(prev);

const maxButtons = 11;
let start = Math.max(1, currentPage - 5);
let end = Math.min(total, start + maxButtons - 1);

start = Math.max(1, end - maxButtons + 1);

if(start > 1){

addPageButton(1);

if(start > 2){
addEllipsis();
}

}

for(let p = start; p <= end; p++){
addPageButton(p);
}

if(end < total){

if(end < total - 1){
addEllipsis();
}

addPageButton(total);

}

const next =
document.createElement("button");

next.className = "page-btn";
next.textContent = "›";
next.disabled = currentPage >= total;
next.onclick = ()=>{
currentPage++;
persistState();
renderPage();
};

paginationEl.appendChild(next);

function addPageButton(page){

const btn =
document.createElement("button");

btn.className =
`page-btn${page === currentPage ? " active" : ""}`;

btn.textContent = String(page);

btn.onclick = ()=>{

if(page === currentPage){
return;
}

currentPage = page;
persistState();
renderPage();

};

paginationEl.appendChild(btn);

}

function addEllipsis(){

const span =
document.createElement("span");

span.className = "page-ellipsis";
span.textContent = "…";
paginationEl.appendChild(span);

}

}

async function renderPage(){

const loadId = ++renderToken;

destroyWidgets();

gridEl.className = `grid-${layout}`;

const symbols =
symbolsForPage();

renderPagination();

if(!symbols.length){

gridEl.innerHTML = "";
setStatus("Нет монет для отображения", true);
return;

}

setStatus(
`Загрузка графиков (${symbols.length})…`,
true
);

symbols.forEach(symbol=>{

const widget =
createWidget(symbol, loadId);

gridEl.appendChild(widget.root);
activeWidgets.push(widget);

});

await Promise.all(
activeWidgets.map(w=>loadWidgetChart(w))
);

if(loadId === renderToken){
setStatus("", false);
}

}

function setLayout(next){

layout = next;

currentPage = 1;

document.querySelectorAll(".layout-btn").forEach(btn=>{
btn.classList.toggle(
"active",
Number(btn.dataset.layout) === layout
);
});

persistState();
renderPage();

}

function setSort(next){

sortMode = next;

currentPage = 1;

document.querySelectorAll(".sort-btn").forEach(btn=>{
btn.classList.toggle(
"active",
btn.dataset.sort === sortMode
);
});

persistState();
renderPage();

}

function setTf(next){

currentTF = next;

document.querySelectorAll(".tf-btn").forEach(btn=>{
btn.classList.toggle(
"active",
btn.dataset.tf === currentTF
);
});

persistState();
renderPage();

}

function bindControls(){

document.querySelectorAll(".layout-btn").forEach(btn=>{

btn.onclick = ()=>{
setLayout(Number(btn.dataset.layout));
};

});

document.querySelectorAll(".sort-btn").forEach(btn=>{

btn.onclick = ()=>{
setSort(btn.dataset.sort);
};

});

document.querySelectorAll(".tf-btn").forEach(btn=>{

btn.onclick = ()=>{
setTf(btn.dataset.tf);
};

});

}

function shouldIgnoreScreenerKeyNav(e){

const target =
e.target;

if(!target){
return false;
}

const tag =
target.tagName?.toLowerCase();

if(
tag === "input" ||
tag === "textarea" ||
tag === "select"
){
return true;
}

if(target.isContentEditable){
return true;
}

return false;

}

function goToPage(page){

const max =
totalPages();

const next =
Math.max(1, Math.min(max, page));

if(next === currentPage){
return;
}

currentPage = next;
persistState();
renderPage();

}

document.addEventListener(
"keydown",
e=>{

if(shouldIgnoreScreenerKeyNav(e)){
return;
}

if(e.code === "ArrowRight"){

e.preventDefault();
goToPage(currentPage + 1);

return;

}

if(e.code === "ArrowLeft"){

e.preventDefault();
goToPage(currentPage - 1);

}

});

function applySavedUi(){

document.querySelectorAll(".layout-btn").forEach(btn=>{
btn.classList.toggle(
"active",
Number(btn.dataset.layout) === layout
);
});

document.querySelectorAll(".sort-btn").forEach(btn=>{
btn.classList.toggle(
"active",
btn.dataset.sort === sortMode
);
});

document.querySelectorAll(".tf-btn").forEach(btn=>{
btn.classList.toggle(
"active",
btn.dataset.tf === currentTF
);
});

}

window.addEventListener(
"storage",
e=>{

if(e.key !== "favorites"){
return;
}

try{

favorites =
JSON.parse(
e.newValue || "[]"
);

}catch{

favorites =
loadFavorites();

}

activeWidgets.forEach(widget=>{
updateWidgetFavoriteUi(
widget.root,
widget.symbol
);
});

}
);

onFavoritesRemoteUpdate(()=>{

favorites =
loadFavorites();

activeWidgets.forEach(widget=>{

updateWidgetFavoriteUi(
widget.root,
widget.symbol
);

});

});

async function init(){

await ensureCloudReady();

bindControls();
applySavedUi();

favorites =
loadFavorites();

setStatus("Загрузка списка монет…", true);

const list =
await loadBybitSymbols();

allSymbols =
list.map(x => x.symbol);

await fetchTickersInto(tickerMap);

connectTickerStream(tick=>{

tickerMap.set(tick.symbol, tick);

activeWidgets.forEach(w=>{
updateWidgetMeta(w.symbol, w.root);
});

});

await renderPage();

}

init();
