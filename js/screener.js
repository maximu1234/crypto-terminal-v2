import {
loadBybitHistory,
loadBybitSymbols,
peekBybitSymbolsCache,
symbolListSignature
} from "./api.js?v=25";

import {
createScreenerChart,
applyChartPriceFormat,
applyScreenerZoom,
restoreScreenerViewport,
SCREENER_VISIBLE_BARS,
SCREENER_MAX_BARS
} from "./chart-import.js?v=13";

import {
subscribeKline
} from "./ws.js?v=15";

import {
connectTickerStream,
fetchTickersInto
} from "./tickers.js?v=21";

import {
createTickerUiBatcher
} from "./ticker-update-batch.js?v=1";

import {
saveScreenerState,
loadScreenerState
} from "./storage.js?v=12";

import {
loadFavoritesGroups,
saveFavoritesGroups,
getFavoriteGroup,
setFavoriteGroup,
migrateFavorites
} from "./favorites.js?v=1";

import {
ensureCloudReady
} from "./auth-ui.js?v=26";

import {
ensureSettled,
withTimeout
} from "./async-timeout.js?v=1";

import {
syncMobileNavDrawerMount,
bindMobileNavDrawerLinks
} from "./mobile-nav-drawer.js?v=1";

import {
persistFavoritesToCloud,
onFavoritesRemoteUpdate
} from "./cloud-sync.js?v=32";

const gridEl =
document.getElementById("screener-grid");

const paginationEl =
document.getElementById("pagination");

const statusEl =
document.getElementById("screener-status");

const SCREENER_MOBILE_MQ =
window.matchMedia(
"(max-width: 640px)"
);

const SORT_LABELS = {
change24: "24ч %",
symbol: "А–Я"
};

const TF_LABELS = {
"1": "1m",
"5": "5m",
"15": "15m",
"60": "1h",
"240": "4h",
"D": "1D"
};

let favorites =
loadFavoritesGroups();

function isScreenerMobile(){

return SCREENER_MOBILE_MQ.matches;

}

function screenerGridClass(){

return isScreenerMobile()
? "grid-mobile-2"
: `grid-${layout}`;

}

function isFavoriteSymbol(symbol){

return !!getFavoriteGroup(symbol, favorites);

}

function updateWidgetFavoriteUi(
root,
symbol
){

const group =
getFavoriteGroup(symbol, favorites);

const btn =
root?.querySelector(
"[data-screener-flag-trigger]"
);

if(!btn){
return;
}

btn.className = "flag screener-flag-btn";

if(group){
btn.classList.add(
"favorite",
`flag--${group}`
);
}

const titles = {
red:"Красный флаг",
green:"Зелёный флаг",
gray:"Серый флаг"
};

btn.title =
group
? titles[group]
: "Выбрать флаг";

btn.setAttribute(
"aria-pressed",
group ? "true" : "false"
);

}

function closeAllScreenerFlagMenus(
exceptWrap = null
){

document.querySelectorAll(".screener-flag-wrap").forEach(wrap=>{

if(wrap === exceptWrap){
return;
}

wrap.querySelector(".screener-flag-menu")?.classList.add("hidden");

});

}

function applyFavoriteGroup(
symbol,
group
){

if(!symbol){
return;
}

if(
group === "clear" ||
group === null
){
favorites =
setFavoriteGroup(symbol, null, favorites);
}else{
favorites =
setFavoriteGroup(symbol, group, favorites);
}

saveFavoritesGroups(
favorites
);
persistFavoritesToCloud(
favorites
);
syncFavoriteFlagsForSymbol(symbol);

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
let screenerMarketLoadFailed = false;
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

return isScreenerMobile()
? 2
: layout;

}

function getSortedSymbols(){

const list = [...allSymbols];

if(sortMode === "symbol"){

list.sort((a, b)=>a.localeCompare(b));

}else{

list.sort((a, b)=>{

const ca =
tickerMap.get(a)?.change24;
const cb =
tickerMap.get(b)?.change24;
const ha =
Number.isFinite(ca);
const hb =
Number.isFinite(cb);

if(
!ha &&
!hb
){
return a.localeCompare(b);
}

if(
!ha
){
return 1;
}

if(
!hb
){
return -1;
}

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

if(loadId === renderToken){
setStatus(
"График Bybit не загрузился — «Повторить» внизу экрана",
true
);
}

return;

}

const loaded =
candles.length > SCREENER_MAX_BARS
? candles.slice(-SCREENER_MAX_BARS)
: candles;

widget.candles = loaded;
widget.userAdjustedZoom = false;

/* iPad/Safari: сетка иногда отдаёт 0×0 до первого layout — zoom ждёт размер,
   но свечи должны попасть в series сразу */
series.setData(loaded);

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
setTimeout(runZoom, 1200);

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

<div class="screener-flag-wrap">
<button type="button" class="flag screener-flag-btn" data-screener-flag-trigger title="Выбрать флаг" aria-haspopup="true" aria-expanded="false" aria-pressed="false"></button>
<div class="screener-flag-menu hidden" role="menu">
<button type="button" class="flag screener-flag-pick flag--red" data-flag-group="red" title="Красный" role="menuitem"></button>
<button type="button" class="flag screener-flag-pick flag--green" data-flag-group="green" title="Зелёный" role="menuitem"></button>
<button type="button" class="flag screener-flag-pick flag--gray" data-flag-group="gray" title="Серый" role="menuitem"></button>
<button type="button" class="flag screener-flag-pick screener-flag-clear" data-flag-group="clear" title="Снять флаг" role="menuitem"></button>
</div>
</div>

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

const flagWrap =
root.querySelector(".screener-flag-wrap");

const flagTrigger =
flagWrap?.querySelector(
"[data-screener-flag-trigger]"
);

const flagMenu =
flagWrap?.querySelector(".screener-flag-menu");

flagTrigger?.addEventListener("click", e=>{

e.stopPropagation();

const open =
!flagMenu?.classList.contains("hidden");

closeAllScreenerFlagMenus(flagWrap);

if(open){
flagMenu?.classList.add("hidden");
flagTrigger.setAttribute("aria-expanded", "false");
}else{
flagMenu?.classList.remove("hidden");
flagTrigger.setAttribute("aria-expanded", "true");
}

});

flagMenu?.querySelectorAll("[data-flag-group]").forEach(btn=>{

btn.addEventListener("click", e=>{

e.stopPropagation();

applyFavoriteGroup(
symbol,
btn.dataset.flagGroup
);

flagMenu?.classList.add("hidden");
flagTrigger?.setAttribute("aria-expanded", "false");

});

});

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

prev.className = "page-btn page-nav-prev";
prev.setAttribute(
"aria-label",
"Предыдущая страница"
);
prev.textContent = "‹";
prev.disabled = currentPage <= 1;
prev.onclick = ()=>{
currentPage--;
persistState();
renderPage();
};

paginationEl.appendChild(prev);

const pagesWrap =
document.createElement("div");

pagesWrap.className = "pagination-pages";
pagesWrap.setAttribute(
"aria-label",
"Номера страниц"
);

paginationEl.appendChild(pagesWrap);

const maxButtons =
isScreenerMobile()
? 3
: 11;
const half =
Math.floor(maxButtons / 2);
let start = Math.max(1, currentPage - half);
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

next.className = "page-btn page-nav-next";
next.setAttribute(
"aria-label",
"Следующая страница"
);
next.textContent = "›";
next.disabled = currentPage >= total;
next.onclick = ()=>{
currentPage++;
persistState();
renderPage();
};

paginationEl.appendChild(next);

if(isScreenerMobile()){

const active =
pagesWrap.querySelector(".page-btn.active");

if(active){
requestAnimationFrame(()=>{
active.scrollIntoView({
inline: "center",
block: "nearest"
});
});
}

}

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

pagesWrap.appendChild(btn);

}

function addEllipsis(){

const span =
document.createElement("span");

span.className = "page-ellipsis";
span.textContent = "…";
pagesWrap.appendChild(span);

}

}

async function renderPage(){

const loadId = ++renderToken;

gridEl.className =
screenerGridClass();

const symbols =
symbolsForPage();

renderPagination();

if(!symbols.length){

destroyWidgets();
gridEl.innerHTML = "";

if(
screenerMarketLoadFailed
){
setStatus(
"Список монет Bybit не загрузился — «Повторить» внизу экрана",
true
);
}else{
setStatus(
"Нет монет для отображения",
true
);
}

return;

}

setStatus(
`Загрузка графиков (${symbols.length})…`,
true
);

const nextWidgets =
symbols.map(symbol=>
createWidget(
symbol,
loadId
)
);

destroyWidgets();

const fragment =
document.createDocumentFragment();

nextWidgets.forEach(widget=>{
fragment.appendChild(widget.root);
updateWidgetMeta(
widget.symbol,
widget.root
);
updateWidgetFavoriteUi(
widget.root,
widget.symbol
);
});

gridEl.appendChild(fragment);
activeWidgets = nextWidgets;

const chartLoads =
activeWidgets.map(w=>
ensureSettled(
loadWidgetChart(w),
28000,
`chart ${w.symbol}`
)
);

await Promise.all(chartLoads);

if(loadId === renderToken){
setStatus("", false);
}

}

function setLayout(next){

if(isScreenerMobile()){
return;
}

layout = next;

currentPage = 1;

document.querySelectorAll(".layout-btn").forEach(btn=>{
btn.classList.toggle(
"active",
Number(btn.dataset.layout) === layout
);
});

syncMobileControlLabels();

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

syncMobileControlLabels();

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

syncMobileControlLabels();

persistState();
renderPage();

}

function closeScreenerMobilePickers(){

document.querySelectorAll(
".screener-mobile-menu"
).forEach(menu=>{
menu.classList.add("hidden");
});

document.querySelectorAll(
".screener-mobile-select"
).forEach(btn=>{
btn.setAttribute(
"aria-expanded",
"false"
);
});

}

function closeScreenerNav(){

document.body.classList.remove(
"screener-nav-open"
);

document.getElementById(
"screener-nav-backdrop"
)?.classList.add(
"hidden"
);

const toggle =
document.getElementById(
"screener-nav-toggle"
);

toggle?.setAttribute(
"aria-expanded",
"false"
);

}

function openScreenerNav(){

void import("./auth-ui.js?v=26").then(m=>{
m.closeCloudSettingsDropdown?.();
}).catch(()=>{});

document.body.classList.add(
"screener-nav-open"
);

document.getElementById(
"screener-nav-backdrop"
)?.classList.remove(
"hidden"
);

document.getElementById(
"screener-nav-toggle"
)?.setAttribute(
"aria-expanded",
"true"
);

closeScreenerMobilePickers();

}

function syncMobileControlLabels(){

const sortLabel =
document.getElementById(
"screener-sort-label"
);

if(sortLabel){
sortLabel.textContent =
SORT_LABELS[sortMode] ||
"24ч %";
}

const tfLabel =
document.getElementById(
"screener-tf-label"
);

if(tfLabel){
tfLabel.textContent =
TF_LABELS[currentTF] ||
currentTF;
}

document.querySelectorAll(
"#screener-sort-menu .screener-mobile-menu-item"
).forEach(btn=>{
btn.classList.toggle(
"active",
btn.dataset.sort === sortMode
);
});

document.querySelectorAll(
"#screener-tf-menu .screener-mobile-menu-item"
).forEach(btn=>{
btn.classList.toggle(
"active",
btn.dataset.tf === currentTF
);
});

}

function syncScreenerNavDrawer(){

syncMobileNavDrawerMount({
header: document.getElementById("header"),
panel: document.getElementById("screener-nav-panel"),
backdrop: document.getElementById("screener-nav-backdrop"),
insertAfter: document.getElementById("screener-mobile-bar")
});

bindMobileNavDrawerLinks(
document.getElementById("screener-nav-panel"),
closeScreenerNav
);

}

function bindMobileControls(){

syncScreenerNavDrawer();

const sortTrigger =
document.getElementById(
"screener-sort-trigger"
);
const sortMenu =
document.getElementById(
"screener-sort-menu"
);
const tfTrigger =
document.getElementById(
"screener-tf-trigger"
);
const tfMenu =
document.getElementById(
"screener-tf-menu"
);
const navToggle =
document.getElementById(
"screener-nav-toggle"
);
const navBackdrop =
document.getElementById(
"screener-nav-backdrop"
);

if(
!sortTrigger ||
!tfTrigger
){
return;
}

sortTrigger.addEventListener(
"click",
e=>{
e.stopPropagation();

const open =
!sortMenu?.classList.contains(
"hidden"
);

closeScreenerMobilePickers();
closeScreenerNav();

if(open){
return;
}

sortMenu?.classList.remove(
"hidden"
);
sortTrigger.setAttribute(
"aria-expanded",
"true"
);

}
);

tfTrigger.addEventListener(
"click",
e=>{
e.stopPropagation();

const open =
!tfMenu?.classList.contains(
"hidden"
);

closeScreenerMobilePickers();
closeScreenerNav();

if(open){
return;
}

tfMenu?.classList.remove(
"hidden"
);
tfTrigger.setAttribute(
"aria-expanded",
"true"
);

}
);

sortMenu?.querySelectorAll(
"[data-sort]"
).forEach(btn=>{

btn.addEventListener(
"click",
e=>{
e.stopPropagation();
setSort(btn.dataset.sort);
closeScreenerMobilePickers();
}
);

});

tfMenu?.querySelectorAll(
"[data-tf]"
).forEach(btn=>{

btn.addEventListener(
"click",
e=>{
e.stopPropagation();
setTf(btn.dataset.tf);
closeScreenerMobilePickers();
}
);

});

navToggle?.addEventListener(
"click",
()=>{

if(
document.body.classList.contains(
"screener-nav-open"
)
){
closeScreenerNav();
}else{
openScreenerNav();
}

}
);

navBackdrop?.addEventListener(
"click",
closeScreenerNav
);

document.addEventListener(
"click",
e=>{

if(
e.target.closest(
".screener-mobile-select-wrap"
)
){
return;
}

closeScreenerMobilePickers();

}
);

const onMobileMqChange =
()=>{

syncScreenerNavDrawer();
clampPage();
applySavedUi();
syncMobileControlLabels();
renderPage();

};

if(
typeof SCREENER_MOBILE_MQ.addEventListener ===
"function"
){
SCREENER_MOBILE_MQ.addEventListener(
"change",
onMobileMqChange
);
}else{
SCREENER_MOBILE_MQ.addListener(
onMobileMqChange
);
}

syncMobileControlLabels();

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

bindMobileControls();

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

return;

}

if(
e.code === "Space" &&
!e.shiftKey
){

e.preventDefault();
goToPage(currentPage + 1);

return;

}

if(
e.code === "Space" &&
e.shiftKey
){

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

syncMobileControlLabels();

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
e.newValue || "null"
);

favorites =
migrateFavorites(favorites);

}catch{

favorites =
loadFavoritesGroups();

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
loadFavoritesGroups();

activeWidgets.forEach(widget=>{

updateWidgetFavoriteUi(
widget.root,
widget.symbol
);

});

});

function mapSymbolList(list){

return list.map(x=>
typeof x === "string"
? x
: x.symbol
).filter(Boolean);

}

function refreshWidgetTickerMeta(){

activeWidgets.forEach(widget=>{
updateWidgetMeta(
widget.symbol,
widget.root
);
});

}

async function loadScreenerMarketData(){

setStatus(
"Загрузка…",
true
);

const instant =
peekBybitSymbolsCache();

if(
instant?.length
){
screenerMarketLoadFailed = false;
allSymbols =
mapSymbolList(instant);
}

const tickersPromise =
fetchTickersInto(tickerMap).then(()=>{
refreshWidgetTickerMeta();
});

const list =
await loadBybitSymbols();

screenerMarketLoadFailed = false;
allSymbols =
mapSymbolList(list);

await tickersPromise;

}

let screenerMarketReloading = false;

async function reloadScreenerMarketData(){

if(screenerMarketReloading){
return;
}

screenerMarketReloading = true;

try{

const list =
await loadBybitSymbols({
forceNetwork: true
});

screenerMarketLoadFailed = false;

allSymbols =
mapSymbolList(list);

await fetchTickersInto(tickerMap);
refreshWidgetTickerMeta();

await renderPage();

setStatus(
"",
false
);

}catch(err){

console.error(
"Screener Bybit reload:",
err
);

screenerMarketLoadFailed = true;

setStatus(
"Список монет Bybit не загрузился — «Повторить» внизу экрана",
true
);

void import("./bybit-network-ui.js?v=2").then(m=>{
m.showBybitNetworkIssue(err);
});

}

screenerMarketReloading = false;

}

window.addEventListener(
"bybit-network-retry",
()=>{
void reloadScreenerMarketData();
}
);

window.addEventListener(
"bybit-symbols-updated",
e=>{

const symbols =
e.detail?.symbols;

if(
!Array.isArray(symbols) ||
!symbols.length
){
return;
}

const nextSymbols =
mapSymbolList(symbols);

if(
symbolListSignature(nextSymbols) ===
symbolListSignature(allSymbols) &&
activeWidgets.length > 0
){
allSymbols = nextSymbols;
return;
}

allSymbols = nextSymbols;

void renderPage();

}
);

async function init(){

const { waitForSiteCssReady } =
await import(
"./site-css-gate.js?v=1"
);

await waitForSiteCssReady();

void ensureCloudReady();

bindControls();

document.addEventListener("click", e=>{

if(
e.target.closest(".screener-flag-wrap")
){
return;
}

closeAllScreenerFlagMenus();

});

applySavedUi();

favorites =
loadFavoritesGroups();

try{

await withTimeout(
loadScreenerMarketData(),
45000,
"screener market"
);

}catch(err){

console.error(
"Screener init:",
err
);

screenerMarketLoadFailed = true;
allSymbols = [];

void import("./bybit-network-ui.js?v=2").then(m=>{
m.showBybitNetworkIssue(err);
});

setTimeout(
()=>{
if(
screenerMarketLoadFailed
){
void reloadScreenerMarketData();
}
},
2500
);

}

const scheduleTickerUiFlush =
createTickerUiBatcher(
()=>{

activeWidgets.forEach(
w=>{
updateWidgetMeta(
w.symbol,
w.root
);
}
);

}
);

connectTickerStream(
tick=>{

tickerMap.set(
tick.symbol,
tick
);
scheduleTickerUiFlush();

});

try{

await withTimeout(
renderPage(),
60000,
"screener render"
);

}catch(err){

console.error(
"Screener render:",
err
);

setStatus(
"Графики не загрузились — обновите страницу",
true
);

}

}

init();
