/**
 * Normalize orderbook rows into a continuous price ladder (ask / spread / bid).
 * Supports price-scale compression (cScalp-style tick multiplier).
 */

function toLevel(
row
){

const price =
Number(
row?.price
);
const size =
Number(
row?.size
);

if(
!Number.isFinite(
price
) ||
!Number.isFinite(
size
) ||
price <=
0 ||
size <=
0
){
return null;
}

return {
price,
size,
notional:
Number(
row?.notional
) ||
price *
size
};

}

function sortAsc(
levels
){

return levels.slice().sort(
(
a,
b
)=>
a.price -
b.price
);

}

function sortDesc(
levels
){

return levels.slice().sort(
(
a,
b
)=>
b.price -
a.price
);

}

function inferTick(
prices
){

const sorted =
[
...new Set(
prices.filter(
p=>
Number.isFinite(
p
) &&
p >
0
)
)
].sort(
(
a,
b
)=>
a -
b
);

let tick =
0;

for(
let i =
1;
i <
sorted.length;
i++
){

const d =
roundTick(
sorted[
i
] -
sorted[
i -
1
]
);

if(
d >
0 &&
(
!tick ||
d <
tick
)
){
tick =
d;
}

}

return snapNiceTick(
tick
);

}

/**
 * Snap inferred tick to 1/2/5 × 10^n (cScalp-style). Float noise like
 * 0.0999999999 → 0.1 so BTC ladder stays readable.
 */
function snapNiceTick(
raw
){

const cleaned =
roundTick(
raw
);

if(
!(
cleaned >
0
)
){
return 0;
}

const exp =
Math.floor(
Math.log10(
cleaned
)
);
const mag =
10 **
exp;
const norm =
cleaned /
mag;

let nice =
1;

if(
norm <
1.5
){
nice =
1;
}else if(
norm <
3.5
){
nice =
2;
}else if(
norm <
7.5
){
nice =
5;
}else{
nice =
10;
}

return roundTick(
nice *
mag
);

}

function roundTick(
value
){

if(
!Number.isFinite(
value
) ||
value <=
0
){
return 0;
}

const s =
value.toPrecision(
12
);
return Number(
s
);

}

function decimalsForTick(
tick
){

if(
!(
tick >
0
)
){
return 6;
}

const s =
tick.toFixed(
12
).replace(
/\.?0+$/,
""
);
const i =
s.indexOf(
"."
);

return i <
0
? 0
: s.length -
i -
1;

}

function priceKey(
price,
tick
){

if(
tick >
0
){
return String(
Math.round(
price /
tick
)
);
}

return String(
price
);

}

function isMajorPrice(
price,
tick
){

if(
!(
tick >
0
)
){
return false;
}

const steps =
Math.round(
price /
tick
);

return steps %
10 ===
0;

}

function normalizePriceScale(
raw
){

const n =
Number(
raw
);

if(
!Number.isFinite(
n
) ||
n <=
0
){
return 1;
}

return n;

}

function bucketPrice(
price,
displayTick
){

return roundTick(
Math.floor(
price /
displayTick +
1e-12
) *
displayTick
);

}

function levelUsdt(
level
){

if(
!level
){
return 0;
}

const fromNotional =
Number(
level.notional
);

if(
Number.isFinite(
fromNotional
) &&
fromNotional >
0
){
return fromNotional;
}

const price =
Number(
level.price
);
const size =
Number(
level.size
);

if(
Number.isFinite(
price
) &&
Number.isFinite(
size
) &&
price >
0 &&
size >
0
){
return price *
size;
}

return 0;

}

function aggregateByTick(
levels,
displayTick
){

const map =
new Map();

for(
const level of
levels
){
const bucket =
bucketPrice(
level.price,
displayTick
);
const key =
priceKey(
bucket,
displayTick
);
const prev =
map.get(
key
);

if(
prev
){
prev.size +=
level.size;
prev.notional +=
level.notional ||
level.price *
level.size;
}else{
map.set(
key,
{
price:
bucket,
size:
level.size,
notional:
level.notional ||
level.price *
level.size
}
);
}

}

return map;

}

/**
 * @param {{ bids?: unknown[], asks?: unknown[] } | null | undefined} book
 * @param {{
 *   maxLevels?: number,
 *   priceScale?: number,
 *   rangeHigh?: number,
 *   rangeLow?: number
 * }} [options]
 */
export function buildLadderFromBook(
book,
options =
{}
){

const maxLevels =
Math.max(
1,
Number(
options.maxLevels
) ||
40
);

const priceScale =
normalizePriceScale(
options.priceScale
);

const rawAsks =
sortAsc(
(Array.isArray(
book?.asks
)
? book.asks
: []
).map(
toLevel
).filter(
Boolean
)
);

const rawBids =
sortDesc(
(Array.isArray(
book?.bids
)
? book.bids
: []
).map(
toLevel
).filter(
Boolean
)
);

const nativeTick =
inferTick(
[
...rawAsks.map(
l=>
l.price
),
...rawBids.map(
l=>
l.price
)
]
);

const tick =
nativeTick >
0
? roundTick(
nativeTick *
priceScale
)
: 0;

const askMap =
tick >
0
? aggregateByTick(
rawAsks,
tick
)
: new Map(
rawAsks.slice(
0,
maxLevels
).map(
l=>[
priceKey(
l.price,
0
),
l
]
)
);

const bidMap =
tick >
0
? aggregateByTick(
rawBids,
tick
)
: new Map(
rawBids.slice(
0,
maxLevels
).map(
l=>[
priceKey(
l.price,
0
),
l
]
)
);

const asks =
sortAsc(
[
...askMap.values()
]
);

const bids =
sortDesc(
[
...bidMap.values()
]
);

const bestAsk =
asks[
0
]?.price ||
0;
const bestBid =
bids[
0
]?.price ||
0;
const mid =
bestAsk >
0 &&
bestBid >
0
? (
bestAsk +
bestBid
) /
2
: bestAsk ||
bestBid ||
0;

const rangeHighOpt =
Number(
options.rangeHigh
);
const rangeLowOpt =
Number(
options.rangeLow
);
const useStickyRange =
tick >
0 &&
Number.isFinite(
rangeHighOpt
) &&
Number.isFinite(
rangeLowOpt
) &&
rangeHighOpt >
rangeLowOpt;

const topAsk =
useStickyRange
? rangeHighOpt
: asks[
Math.min(
asks.length,
maxLevels
) -
1
]?.price ||
bestAsk;
const bottomBid =
useStickyRange
? rangeLowOpt
: bids[
Math.min(
bids.length,
maxLevels
) -
1
]?.price ||
bestBid;

const rows =
[];

if(
tick >
0 &&
topAsk >
0 &&
bottomBid >
0 &&
topAsk >=
bottomBid
){

const HARD_MAX_ROWS =
3200;

const startSteps =
Math.round(
topAsk /
tick
);
const endSteps =
Math.round(
bottomBid /
tick
);
const spanRows =
Math.max(
0,
startSteps -
endSteps +
1
);
const maxRows =
Math.min(
HARD_MAX_ROWS,
useStickyRange
? spanRows
: maxLevels *
2 +
80
);

for(
let step =
startSteps;
step >=
endSteps &&
rows.length <
maxRows;
step--
){

const price =
Number(
(
step *
tick
).toFixed(
decimalsForTick(
tick
)
)
);
const key =
String(
step
);
const askLevel =
askMap.get(
key
);
const bidLevel =
bidMap.get(
key
);

let side =
"hole";
let size =
0;

if(
askLevel?.size >
0
){
side =
"ask";
size =
levelUsdt(
askLevel
);
}else if(
bidLevel?.size >
0
){
side =
"bid";
size =
levelUsdt(
bidLevel
);
}

const touch =
size >
0 &&
(
(
bestAsk >
0 &&
Math.abs(
price -
bestAsk
) <
tick *
0.5
) ||
(
bestBid >
0 &&
Math.abs(
price -
bestBid
) <
tick *
0.5
)
);

rows.push(
{
price,
size,
side,
touch,
major:
isMajorPrice(
price,
tick
)
}
);

}

}else{

for(
const level of
asks.slice(
0,
maxLevels
).reverse()
){
rows.push(
{
price:
level.price,
size:
levelUsdt(
level
),
side:
"ask",
touch:
level.price ===
bestAsk,
major:
false
}
);
}

for(
const level of
bids.slice(
0,
maxLevels
)
){
rows.push(
{
price:
level.price,
size:
levelUsdt(
level
),
side:
"bid",
touch:
level.price ===
bestBid,
major:
false
}
);
}

}

const maxSize =
rows.reduce(
(
max,
row
)=>
row.size >
max
? row.size
: max,
0
);

return {
rows,
askRows:
rows.filter(
r=>
r.side ===
"ask"
),
bidRows:
rows.filter(
r=>
r.side ===
"bid"
),
bestAsk,
bestBid,
mid,
tick,
nativeTick,
priceScale,
maxSize,
updatedAt:
Date.now()
};

}

/**
 * How many display-ticks above/below mid for the sticky window.
 * Grows with price scale so a compressed book shows farther in price.
 */
export function stickyHalfSpanForScale(
priceScale
){

const scale =
Math.max(
1,
Number(
priceScale
) ||
1
);

/* ~200 display-ticks at scale 1; grows with scale (cap 1500) — closer to densities/1000-depth. */
return Math.min(
1500,
Math.max(
200,
Math.round(
200 *
scale
)
)
);

}

/**
 * Fixed price window so the ladder does not slide with every book update.
 * @param {number} mid
 * @param {number} tick
 * @param {number} halfSpanTicks
 */
export function makeStickyPriceRange(
mid,
tick,
halfSpanTicks =
50
){

if(
!(
mid >
0
) ||
!(
tick >
0
) ||
!Number.isFinite(
mid
) ||
!Number.isFinite(
tick
)
){
return null;
}

const half =
Math.min(
1500,
Math.max(
10,
Math.round(
halfSpanTicks
)
)
);

return {
tick,
high:
roundTick(
mid +
half *
tick
),
low:
roundTick(
Math.max(
tick,
mid -
half *
tick
)
)
};

}

/**
 * @param {{ high: number, low: number, tick: number } | null} sticky
 * @param {number} mid
 * @param {number} thresholdPct 50–100
 */
export function stickyRangeNeedsRecenter(
sticky,
mid,
thresholdPct =
85
){

if(
!sticky ||
!(
mid >
0
) ||
!(
sticky.tick >
0
)
){
return true;
}

const span =
sticky.high -
sticky.low;

if(
!(
span >
0
)
){
return true;
}

const rangeMid =
(
sticky.high +
sticky.low
) /
2;
const half =
span /
2;
const offsetPct =
(
Math.abs(
mid -
rangeMid
) /
half
) *
100;

return offsetPct >
thresholdPct;

}
