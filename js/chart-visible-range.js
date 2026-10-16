/**
 * LW Charts: setData on any series can shift the visible logical range.
 * Capture before overlay updates, restore after.
 *
 * Delayed restores use a generation token so a later intentional zoom
 * (fit / applyDefaultZoom / settle) cancels stale rAF restores — otherwise
 * coin switches reopen mid-history.
 */
let restoreGeneration =
0;

let preserveDepth =
0;

/** Epoch ms — do not lazy-load older history until then (overlay setData shock). */
let historyLazySuppressedUntil =
0;

/**
 * После setData оверлея LW иногда шлёт «битый» range (from≈0) уже
 * после preserve. На длинной истории (BTC) это заметнее, чем на ACE.
 */
let visibleRangeShockGuardUntil =
0;

/** Last stable viewport while from≫0 — restore instead of false history load. */
let lastHealthyVisibleRange =
null;

let lastHealthyVisibleRangeAt =
0;

const HEALTHY_FROM_MIN =
120;

const HEALTHY_RANGE_TTL_MS =
20000;

export function invalidatePreservedVisibleLogicalRange(){

restoreGeneration +=
1;
visibleRangeHoldGen +=
1;
lastHealthyVisibleRange =
null;
lastHealthyVisibleRangeAt =
0;

}

/** True while setData is restoring the previous logical range. */
export function isPreservingVisibleLogicalRange(){

return preserveDepth >
0;

}

/**
 * Volume / overlay setData briefly sets from≈0; resize can re-glitch after
 * preserve ends. Block history lazy-load for a short cool-down.
 */
export function suppressTerminalHistoryLazyLoad(
ms =
1500
){

const hold =
Math.max(
0,
Number(
ms
) ||
0
);

historyLazySuppressedUntil =
Math.max(
historyLazySuppressedUntil,
Date.now() +
hold
);

}

export function isTerminalHistoryLazyLoadSuppressed(){

return Date.now() <
historyLazySuppressedUntil;

}

/** Volume / EMA Shift: глушить запоздалый from≈0 после setData. */
export function guardVisibleRangeShockBriefly(
ms =
1500
){

const hold =
Math.max(
0,
Number(
ms
) ||
0
);

visibleRangeShockGuardUntil =
Math.max(
visibleRangeShockGuardUntil,
Date.now() +
hold
);
suppressTerminalHistoryLazyLoad(
hold
);

}

export function isVisibleRangeShockGuardActive(){

return Date.now() <
visibleRangeShockGuardUntil;

}

let visibleRangeHoldGen =
0;

/**
 * Отключено: подписка на range дралась со сменой тикера
 * (тряска / пустой график). Оставлен no-op + сброс gen.
 */
export function holdVisibleLogicalRange(){

visibleRangeHoldGen +=
1;
return ()=>{};

}

/**
 * Если шкала ушла в from≈0 относительно якоря — вернуть якорь.
 * @returns {boolean} true если был шок (восстановили или нужно игнорить load)
 */
export function healVisibleRangeShockIfNeeded(
chart
){

if(
!chart
){
return false;
}

let range =
null;

try{
range =
chart.timeScale().getVisibleLogicalRange();
}catch{
return false;
}

if(
!range ||
!Number.isFinite(
range.from
)
){
return false;
}

const healthy =
getLastHealthyVisibleLogicalRange();

const shocked =
range.from <
HEALTHY_FROM_MIN ||
(
healthy &&
healthy.from -
range.from >
400
);

if(
!shocked
){
if(
range.from >=
HEALTHY_FROM_MIN
){
noteHealthyVisibleLogicalRange(
range
);
}
return false;
}

if(
healthy
){
restoreLastHealthyVisibleLogicalRange(
chart
);
return true;
}

return true;

}

export function noteHealthyVisibleLogicalRange(
range
){

if(
!range ||
!Number.isFinite(
range.from
) ||
!Number.isFinite(
range.to
) ||
range.from <
HEALTHY_FROM_MIN
){
return;
}

lastHealthyVisibleRange =
{
from:
range.from,
to:
range.to
};
lastHealthyVisibleRangeAt =
Date.now();

}

export function getLastHealthyVisibleLogicalRange(){

if(
!lastHealthyVisibleRange ||
Date.now() -
lastHealthyVisibleRangeAt >
HEALTHY_RANGE_TTL_MS
){
return null;
}

return {
from:
lastHealthyVisibleRange.from,
to:
lastHealthyVisibleRange.to
};

}

/**
 * Снимок шкалы до addSeries/setData оверлея (Volume / SMA / EMA Shift / …).
 * Если сейчас уже from≈0 — вернуть последний здоровый якорь, не пинить глитч.
 */
export function captureHealthyVisibleLogicalRange(
chart
){

if(
!chart
){
return getLastHealthyVisibleLogicalRange();
}

try{
const range =
chart.timeScale().getVisibleLogicalRange();

if(
!range ||
!Number.isFinite(
range.from
) ||
!Number.isFinite(
range.to
)
){
return getLastHealthyVisibleLogicalRange();
}

if(
range.from >=
HEALTHY_FROM_MIN
){
noteHealthyVisibleLogicalRange(
range
);
return {
from:
range.from,
to:
range.to
};
}

return getLastHealthyVisibleLogicalRange() ||
{
from:
range.from,
to:
range.to
};
}catch{
return getLastHealthyVisibleLogicalRange();
}

}

/** If viewport was shocked to from≈0, put back the last healthy window. */
export function restoreLastHealthyVisibleLogicalRange(
chart
){

const healthy =
getLastHealthyVisibleLogicalRange();

if(
!chart ||
!healthy
){
return false;
}

try{
chart.timeScale().setVisibleLogicalRange(
healthy
);
return true;
}catch{
return false;
}

}

/**
 * After Volume / overlay enable: soft restore + history cool-down.
 * Do not hammer setVisibleLogicalRange every frame — that blinked the chart.
 * Sparse delayed restores catch async HTF setData / late history races.
 */
export function pinVisibleLogicalRangeBriefly(
chart,
range,
{
suppressMs =
8000,
afterResizeMs =
120,
watchMs =
0
} = {}
){

suppressTerminalHistoryLazyLoad(
suppressMs
);

const healthyFallback =
getLastHealthyVisibleLogicalRange();

const source =
range &&
Number.isFinite(
range.from
) &&
Number.isFinite(
range.to
) &&
range.from >=
HEALTHY_FROM_MIN
? range
: healthyFallback ||
range;

if(
!chart ||
!source ||
!Number.isFinite(
source.from
) ||
!Number.isFinite(
source.to
)
){
return;
}

noteHealthyVisibleLogicalRange(
source
);

const gen =
++restoreGeneration;
const pinned =
{
from:
source.from,
to:
source.to
};

const apply =
()=>{

if(
gen !==
restoreGeneration
){
return false;
}

try{
chart.timeScale().setVisibleLogicalRange(
pinned
);
}catch{
/* ignore */
}

return true;

};

apply();
requestAnimationFrame(
()=>{

if(
!apply()
){
return;
}

requestAnimationFrame(
()=>{

if(
!apply()
){
return;
}

const delay =
Math.max(
0,
Number(
afterResizeMs
) ||
0
);

if(
delay >
0
){
setTimeout(
apply,
delay
);
}

}
);

}
);

const watch =
Math.max(
0,
Number(
watchMs
) ||
0
);

if(
watch >
0
){
scheduleOverlayViewportWatch(
chart,
pinned,
watch
);
}

}

let overlayViewportWatchGen =
0;

/**
 * Отключено: отложенные setVisibleLogicalRange дрались со сменой
 * тикера (тряска / пустой график).
 */
export function scheduleOverlayViewportWatch(){

overlayViewportWatchGen +=
1;

}

/** True while indicator settings modal is open (body class). */
export function isIndicatorSettingsModalOpen(){

try{
return document.body.classList.contains(
"chart-indicator-modal-open"
);
}catch{
return false;
}

}

export function runWithPreservedVisibleLogicalRange(
chart,
fn
){

if(
!chart ||
typeof fn !==
"function"
){
fn?.();
return;
}

let range =
null;

preserveDepth +=
1;

try{

try{
range =
chart.timeScale().getVisibleLogicalRange();
}catch{
range =
null;
}

fn();

}finally{

if(
range
){
restoreVisibleLogicalRange(
chart,
range
);
}else{
preserveDepth =
Math.max(
0,
preserveDepth -
1
);
}

}

}

export async function runWithPreservedVisibleLogicalRangeAsync(
chart,
fn
){

if(
!chart ||
typeof fn !==
"function"
){
await fn?.();
return;
}

let range =
null;

preserveDepth +=
1;

try{

try{
range =
chart.timeScale().getVisibleLogicalRange();
}catch{
range =
null;
}

await fn();

}finally{

if(
range
){
restoreVisibleLogicalRange(
chart,
range
);
}else{
preserveDepth =
Math.max(
0,
preserveDepth -
1
);
}

}

}

function restoreVisibleLogicalRange(
chart,
range
){

if(
!chart ||
!range
){
return;
}

const gen =
++restoreGeneration;

const release =
()=>{

preserveDepth =
Math.max(
0,
preserveDepth -
1
);

/*
 * После отпускания preserve resize/setData ещё могут дернуть from≈0.
 * Не даём ленивой истории стартовать в этом окне.
 */
suppressTerminalHistoryLazyLoad(
1500
);

};

const apply =
()=>{

if(
gen !==
restoreGeneration
){
return false;
}

try{
chart.timeScale().setVisibleLogicalRange(
range
);
}catch{
/* ignore */
}

return true;

};

apply();
requestAnimationFrame(
()=>{

if(
!apply()
){
release();
return;
}

requestAnimationFrame(
()=>{
apply();
release();
}
);

}
);

}
