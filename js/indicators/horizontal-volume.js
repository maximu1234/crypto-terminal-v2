/**
 * Горизонтальный объём — крупные лимитные заявки у ценовой шкалы.
 */
import {
EXCHANGE_CHANGED_EVENT,
loadMarketOrderbook
} from "../market-api.js?v=5";

const POLL_MS =
2500;

const BOOK_LIMIT =
1000;

const BAR_HEIGHT =
3;

/** Макс. ширина крупнейшей заявки — доля ширины графика (было 1/6, ~1/10 по макету). */
const MAX_BAR_WIDTH_FRAC =
1 /
10;

const ASK_COLOR =
"rgba(235, 120, 120, 0.88)";

const BID_COLOR =
"rgba(72, 199, 192, 0.88)";

export const HORIZONTAL_VOLUME_ID =
"horizontal-volume";

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

function notional(
price,
size
){

const p =
Number(
price
);
const s =
Number(
size
);

if(
!Number.isFinite(
p
) ||
!Number.isFinite(
s
) ||
p <=
0 ||
s <=
0
){
return 0;
}

return p *
s;

}

export function createHorizontalVolumeIndicator(
getHost
){

let enabled =
false;
let pollTimer =
0;
let inflight =
false;
let book =
null;
let afterRedraw =
null;
let unbindViewport =
null;

function getVisiblePriceRange(
series,
plotH
){

if(
!series ||
plotH <=
0
){
return null;
}

const top =
series.coordinateToPrice(
0
);
const bottom =
series.coordinateToPrice(
plotH
);

if(
top ==
null ||
bottom ==
null ||
!Number.isFinite(
top
) ||
!Number.isFinite(
bottom
)
){
return null;
}

return {
min:
Math.min(
top,
bottom
),
max:
Math.max(
top,
bottom
)
};

}

function bindViewportListeners(){

const host =
getHost?.();

if(
!host?.chart ||
unbindViewport
){
return;
}

const redraw =
()=>{
host?.getDrawingTools?.()?.scheduleRedraw?.();
};

try{
host.chart.timeScale().subscribeVisibleLogicalRangeChange(
redraw
);
host.chart.priceScale(
"right"
)?.subscribeVisibleLogicalRangeChange?.(
redraw
);
}catch{
/* ignore */
}

unbindViewport =
()=>{

try{
host.chart.timeScale().unsubscribeVisibleLogicalRangeChange(
redraw
);
host.chart.priceScale(
"right"
)?.unsubscribeVisibleLogicalRangeChange?.(
redraw
);
}catch{
/* ignore */
}

unbindViewport =
null;

};

}

function unbindViewportListeners(){

unbindViewport?.();
unbindViewport =
null;

}

async function refreshBook(){

const symbol =
normalizeSymbol(
getHost?.()?.getSymbol?.()
);

if(
!symbol ||
!enabled
){
return;
}

if(
inflight
){
return;
}

inflight =
true;

try{
book =
await loadMarketOrderbook(
symbol,
BOOK_LIMIT
);
getHost?.()?.getDrawingTools?.()?.scheduleRedraw?.();
}catch{
/* ignore */
}finally{
inflight =
false;
}

}

function startPoll(){

stopPoll();
void refreshBook();
pollTimer =
window.setInterval(
()=>{
void refreshBook();
},
POLL_MS
);

}

function stopPoll(){

if(
pollTimer
){
clearInterval(
pollTimer
);
pollTimer =
0;
}

}

function bindRedraw(){

const dt =
getHost?.()?.getDrawingTools?.();

if(
!dt?.addAfterRedrawListener
){
return false;
}

if(
afterRedraw
){
dt.removeAfterRedrawListener?.(
afterRedraw
);
}

afterRedraw =
paint;
dt.addAfterRedrawListener(
afterRedraw
);
return true;

}

function unbindRedraw(){

const dt =
getHost?.()?.getDrawingTools?.();

if(
afterRedraw &&
dt?.removeAfterRedrawListener
){
dt.removeAfterRedrawListener(
afterRedraw
);
}

afterRedraw =
null;

}

function paint(
ctx,
plotW,
h
){

if(
!enabled ||
!book ||
!ctx ||
!plotW ||
!h
){
return;
}

const host =
getHost?.();
const series =
host?.series;

if(
!series
){
return;
}

const priceRange =
getVisiblePriceRange(
series,
h
);

if(
!priceRange
){
return;
}

const {
min:
priceMin,
max:
priceMax
} =
priceRange;

const maxBarW =
plotW *
MAX_BAR_WIDTH_FRAC;
const visible =
[];

function inVisibleRange(
price
){

return (
price >=
priceMin &&
price <=
priceMax
);

}

function pushLevel(
row,
side
){

if(
!inVisibleRange(
row.price
)
){
return;
}

const y =
series.priceToCoordinate(
row.price
);

if(
y ==
null ||
!Number.isFinite(
y
) ||
y <
-BAR_HEIGHT ||
y >
h +
BAR_HEIGHT
){
return;
}

visible.push(
{
...row,
side,
y
}
);

}

for(
const row of book.asks
){
pushLevel(
row,
"ask"
);
}

for(
const row of book.bids
){
pushLevel(
row,
"bid"
);
}

if(
!visible.length
){
return;
}

const maxNotional =
Math.max(
...visible.map(
row=>
row.notional
),
1
);

ctx.save();

for(
const row of visible
){

const barW =
Math.max(
1,
(
row.notional /
maxNotional
) *
maxBarW
);
const top =
row.y -
BAR_HEIGHT /
2;

ctx.fillStyle =
row.side ===
"ask"
? ASK_COLOR
: BID_COLOR;
ctx.fillRect(
plotW -
barW,
top,
barW,
BAR_HEIGHT
);

}

ctx.restore();

}

function enable(){

if(
enabled
){
return;
}

enabled =
true;

if(
!bindRedraw()
){
window.setTimeout(
()=>{
if(
enabled
){
bindRedraw();
}
},
100
);
}

startPoll();
bindViewportListeners();
getHost?.()?.getDrawingTools?.()?.scheduleRedraw?.();

}

function disable(){

if(
!enabled
){
return;
}

enabled =
false;
stopPoll();
book =
null;
unbindViewportListeners();
unbindRedraw();
getHost?.()?.getDrawingTools?.()?.scheduleRedraw?.();

}

function onSymbolChange(){

if(
!enabled
){
return;
}

book =
null;
void refreshBook();

}

function onExchangeChanged(){

if(
!enabled
){
return;
}

book =
null;
void refreshBook();

}

window.addEventListener(
EXCHANGE_CHANGED_EVENT,
onExchangeChanged
);

return {
id:
HORIZONTAL_VOLUME_ID,
label:
"Плотности",
enable,
disable,
isEnabled:()=>
enabled,
onSymbolChange,
destroy:()=>{
window.removeEventListener(
EXCHANGE_CHANGED_EVENT,
onExchangeChanged
);
disable();
}
};

}
